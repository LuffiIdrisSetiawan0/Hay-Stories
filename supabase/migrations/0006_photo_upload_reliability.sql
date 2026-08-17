-- ============================================================================
-- HAY Stories - reservasi unggahan foto yang tahan retry dan crash
--
-- Satu jepretan menyentuh dua sistem: PostgreSQL (kuota + metadata) dan
-- Storage (dua JPEG). Storage tidak bisa ikut dalam transaksi PostgreSQL,
-- karena itu baris `failed` berfungsi sebagai tombstone: kuota dilepas di
-- database lebih dulu, lalu route handler boleh mencoba penghapusan objek
-- berulang kali tanpa pernah melepas kuota dua kali.
--
-- Idempoten dan aman dijalankan ulang.
-- ============================================================================

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS upload_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reservation_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS processing_recipe JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS preset_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upload_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_cleaned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cleanup_after TIMESTAMPTZ;

-- Kolom lease ditambahkan nullable agar baris lama memakai waktu aslinya,
-- bukan waktu migrasi. Retry POST akan memperbarui kedua nilai ini.
UPDATE public.photos
   SET last_reserved_at = COALESCE(last_reserved_at, created_at, taken_at, NOW())
 WHERE last_reserved_at IS NULL;

ALTER TABLE public.photos
  ALTER COLUMN last_reserved_at SET DEFAULT NOW(),
  ALTER COLUMN last_reserved_at SET NOT NULL;

-- Status `failed` dari versi sebelum tombstone tidak memiliki bukti apakah
-- release_shot() sudah dipanggil. Tandai sebagai legacy-released agar migrasi
-- tidak berisiko mengurangi kuota yang sama untuk kedua kali.
UPDATE public.photos
   SET reservation_released_at = COALESCE(created_at, taken_at, NOW()),
       failure_reason = COALESCE(failure_reason, 'legacy_failed')
 WHERE status = 'failed'
   AND reservation_released_at IS NULL;

UPDATE public.photos
   SET cleanup_after = GREATEST(
         reservation_released_at + INTERVAL '3 hours',
         COALESCE(upload_token_expires_at, reservation_released_at) + INTERVAL '1 hour'
       )
 WHERE status = 'failed'
   AND cleanup_after IS NULL;

COMMENT ON COLUMN public.photos.upload_completed_at IS
  'Waktu kedua objek Storage sudah diverifikasi dan foto difinalisasi.';
COMMENT ON COLUMN public.photos.reservation_released_at IS
  'Waktu kuota jepretan dikembalikan. NULL berarti reservasi belum pernah dilepas.';
COMMENT ON COLUMN public.photos.failure_reason IS
  'Alasan tombstone failed, misalnya upload_failed atau upload_timeout.';
COMMENT ON COLUMN public.photos.processing_recipe IS
  'Snapshot parameter pemrosesan agar hasil JPEG dapat diaudit dan direproduksi.';
COMMENT ON COLUMN public.photos.preset_version IS
  'Versi recipe/aset preset; wajib dinaikkan bila tampilan preset aktif berubah.';
COMMENT ON COLUMN public.photos.last_reserved_at IS
  'Lease aktivitas POST terakhir; TTL pending dihitung dari sini, bukan created_at.';
COMMENT ON COLUMN public.photos.upload_token_expires_at IS
  'Batas kedaluwarsa token upload terakhir (Supabase signed upload: 2 jam).';
COMMENT ON COLUMN public.photos.storage_cleaned_at IS
  'Waktu objek tombstone dihapus setelah grace token; row tetap ada agar UUID tidak bisa dipakai ulang.';
COMMENT ON COLUMN public.photos.cleanup_after IS
  'Batas aman cleanup Storage: minimal 3 jam setelah release dan 1 jam setelah token terakhir kedaluwarsa.';

DO $$
BEGIN
  ALTER TABLE public.photos ADD CONSTRAINT photos_processing_recipe_object_check
    CHECK (JSONB_TYPEOF(processing_recipe) = 'object');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.photos ADD CONSTRAINT photos_preset_version_positive_check
    CHECK (preset_version > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_photos_pending_expiry
  ON public.photos(last_reserved_at)
  WHERE status = 'pending' AND reservation_released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_photos_failed_cleanup
  ON public.photos(cleanup_after)
  WHERE status = 'failed' AND storage_cleaned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_photos_guest_failures_recent
  ON public.photos(guest_id, reservation_released_at DESC)
  WHERE status = 'failed';

-- ---------------------------------------------------------------------------
-- Reservasi + insert metadata dalam SATU transaksi.
--
-- Implementasi lama memanggil claim_shot(), lalu melakukan INSERT terpisah.
-- Bila proses mati di antara keduanya, kuota terpakai tanpa ada baris yang bisa
-- ditemukan untuk dibersihkan. Fungsi ini menghilangkan celah tersebut.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reserve_photo_upload(
  p_photo_id UUID,
  p_guest_id UUID,
  p_event_id UUID,
  p_preset TEXT,
  p_preset_version INTEGER,
  p_processing_recipe JSONB,
  p_frame TEXT,
  p_width INTEGER,
  p_height INTEGER,
  p_storage_path TEXT,
  p_thumb_path TEXT
)
RETURNS TABLE (
  ok BOOLEAN,
  shots_used INTEGER,
  shots_limit INTEGER,
  rejection_reason TEXT,
  expired_count INTEGER,
  existing_reservation BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_guest public.guests%ROWTYPE;
  v_limit INTEGER := 0;
  v_event_status TEXT;
  v_event_expires TIMESTAMPTZ;
  v_used INTEGER := 0;
  v_expired INTEGER := 0;
  v_recent_failures INTEGER := 0;
  v_existing RECORD;
BEGIN
  IF p_photo_id IS NULL OR p_guest_id IS NULL OR p_event_id IS NULL THEN
    RAISE EXCEPTION 'invalid reservation identifiers';
  END IF;

  IF p_width IS NULL
     OR p_height IS NULL
     OR p_width < 1
     OR p_height < 1
     OR p_width > 4096
     OR p_height > 4096 THEN
    RAISE EXCEPTION 'invalid photo dimensions';
  END IF;

  IF p_preset IS NULL
     OR BTRIM(p_preset) = ''
     OR p_frame IS NULL
     OR p_preset_version IS NULL
     OR p_preset_version < 1
     OR p_processing_recipe IS NULL
     OR JSONB_TYPEOF(p_processing_recipe) <> 'object'
     OR OCTET_LENGTH(p_processing_recipe::TEXT) > 8192 THEN
    RAISE EXCEPTION 'invalid processing recipe';
  END IF;

  IF p_storage_path IS NULL
     OR p_thumb_path IS NULL
     OR p_storage_path <> p_event_id::TEXT || '/' || p_photo_id::TEXT || '.jpg'
     OR p_thumb_path <> p_event_id::TEXT || '/' || p_photo_id::TEXT || '_thumb.jpg' THEN
    RAISE EXCEPTION 'invalid photo storage path';
  END IF;

  -- Urutan kunci konsisten dengan join_event(): event -> guest -> photo.
  -- SHARE mengizinkan jepretan tamu berbeda tetap paralel, tetapi menahan
  -- perubahan/penutupan event sampai transaksi reservasi singkat ini selesai.
  SELECT COALESCE(e.shots_per_guest, 0), e.status, e.expires_at
    INTO v_limit, v_event_status, v_event_expires
  FROM public.events AS e
  WHERE e.id = p_event_id
  FOR SHARE;

  IF NOT FOUND
     OR v_event_status IS DISTINCT FROM 'active'
     OR (v_event_expires IS NOT NULL AND v_event_expires <= NOW()) THEN
    RETURN QUERY SELECT FALSE, 0, v_limit, 'event_inactive'::TEXT, 0, FALSE;
    RETURN;
  END IF;

  SELECT g.*
    INTO v_guest
  FROM public.guests AS g
  WHERE g.id = p_guest_id
    AND g.event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND OR COALESCE(v_guest.revoked, FALSE) THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'guest_unavailable'::TEXT, 0, FALSE;
    RETURN;
  END IF;

  -- Self-healing untuk tamu yang kembali setelah tab/browser mati. Kunci guest
  -- di atas membuat pengurangan dan klaim baru tidak saling mendahului.
  WITH expired AS (
    UPDATE public.photos AS p
       SET status = 'failed',
           reservation_released_at = NOW(),
           failure_reason = 'upload_timeout',
           cleanup_after = GREATEST(
             NOW() + INTERVAL '3 hours',
             COALESCE(p.upload_token_expires_at, NOW()) + INTERVAL '1 hour'
           )
     WHERE p.guest_id = p_guest_id
       AND p.event_id = p_event_id
       AND p.status = 'pending'
       AND p.reservation_released_at IS NULL
       AND p.last_reserved_at < NOW() - INTERVAL '30 minutes'
    RETURNING p.id
  )
  SELECT COUNT(*)::INTEGER INTO v_expired FROM expired;

  IF v_expired > 0 THEN
    UPDATE public.guests AS g
       SET shots_used = GREATEST(COALESCE(g.shots_used, 0) - v_expired, 0)
     WHERE g.id = p_guest_id
    RETURNING g.shots_used INTO v_used;
  ELSE
    v_used := COALESCE(v_guest.shots_used, 0);
  END IF;

  -- Idempotency key dari kamera. Retry POST dengan UUID + recipe yang sama
  -- mengembalikan reservasi lama tanpa menaikkan shots_used lagi.
  SELECT
    p.guest_id,
    p.event_id,
    p.status,
    p.preset,
    p.preset_version,
    p.processing_recipe,
    p.frame,
    p.width,
    p.height,
    p.storage_path,
    p.thumb_path,
    p.reservation_released_at
  INTO v_existing
  FROM public.photos AS p
  WHERE p.id = p_photo_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.guest_id = p_guest_id
       AND v_existing.event_id = p_event_id
       AND v_existing.status = 'pending'
       AND v_existing.reservation_released_at IS NULL
       AND v_existing.preset = p_preset
       AND v_existing.preset_version = p_preset_version
       AND v_existing.processing_recipe = p_processing_recipe
       AND v_existing.frame = p_frame
       AND v_existing.width = p_width
       AND v_existing.height = p_height
       AND v_existing.storage_path = p_storage_path
       AND v_existing.thumb_path = p_thumb_path THEN
      UPDATE public.photos AS p
         SET last_reserved_at = NOW(),
             upload_token_expires_at = NOW() + INTERVAL '2 hours'
       WHERE p.id = p_photo_id;

      RETURN QUERY SELECT TRUE, v_used, v_limit, NULL::TEXT, v_expired, TRUE;
    ELSE
      RETURN QUERY SELECT
        FALSE,
        v_used,
        v_limit,
        'photo_id_conflict'::TEXT,
        v_expired,
        FALSE;
    END IF;
    RETURN;
  END IF;

  -- Tombstone sengaja persisten untuk mencegah UUID/path lama dipakai ulang.
  -- Batasi churn agar guest yang memanggil POST/DELETE berulang tidak dapat
  -- membengkakkan metadata tanpa batas. Retry UUID yang sama sudah dikembalikan
  -- di cabang idempotensi sebelum hitungan ini.
  SELECT COUNT(*)::INTEGER
    INTO v_recent_failures
  FROM public.photos AS p
  WHERE p.guest_id = p_guest_id
    AND p.event_id = p_event_id
    AND p.status = 'failed'
    AND COALESCE(p.failure_reason, '') NOT IN ('deleted_by_host', 'deleted_by_guest')
    AND p.reservation_released_at >= NOW() - INTERVAL '1 hour';

  IF v_recent_failures >= 30 THEN
    RETURN QUERY SELECT FALSE, v_used, v_limit, 'rate_limited'::TEXT, v_expired, FALSE;
    RETURN;
  END IF;

  IF v_used >= v_limit THEN
    RETURN QUERY SELECT FALSE, v_used, v_limit, 'quota_exhausted'::TEXT, v_expired, FALSE;
    RETURN;
  END IF;

  UPDATE public.guests AS g
     SET shots_used = COALESCE(g.shots_used, 0) + 1,
         last_seen_at = NOW()
   WHERE g.id = p_guest_id
  RETURNING g.shots_used INTO v_used;

  INSERT INTO public.photos (
    id,
    event_id,
    guest_id,
    guest_name,
    guest_session_id,
    preset,
    preset_version,
    processing_recipe,
    last_reserved_at,
    upload_token_expires_at,
    frame,
    width,
    height,
    storage_path,
    thumb_path,
    source,
    status
  ) VALUES (
    p_photo_id,
    p_event_id,
    p_guest_id,
    v_guest.display_name,
    v_guest.session_id,
    p_preset,
    p_preset_version,
    p_processing_recipe,
    NOW(),
    NOW() + INTERVAL '2 hours',
    p_frame,
    p_width,
    p_height,
    p_storage_path,
    p_thumb_path,
    'inapp',
    'pending'
  );

  RETURN QUERY SELECT TRUE, v_used, v_limit, NULL::TEXT, v_expired, FALSE;
END;
$$;

-- ---------------------------------------------------------------------------
-- Finalisasi idempoten.
--
-- Route handler memverifikasi kedua objek di Storage lebih dulu dan memasukkan
-- ukuran objek sebenarnya, bukan angka yang dilaporkan browser.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finalize_photo_upload(
  p_photo_id UUID,
  p_guest_id UUID,
  p_event_id UUID,
  p_bytes INTEGER
)
RETURNS TABLE (outcome TEXT, recorded_bytes INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status TEXT;
  v_bytes INTEGER;
BEGIN
  IF p_photo_id IS NULL
     OR p_guest_id IS NULL
     OR p_event_id IS NULL
     OR p_bytes IS NULL
     OR p_bytes < 1
     OR p_bytes > 26214400 THEN
    RAISE EXCEPTION 'invalid photo byte size';
  END IF;

  SELECT p.status, p.bytes
    INTO v_status, v_bytes
  FROM public.photos AS p
  WHERE p.id = p_photo_id
    AND p.guest_id = p_guest_id
    AND p.event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_status = 'ready' THEN
    RETURN QUERY SELECT 'already_ready'::TEXT, v_bytes;
    RETURN;
  END IF;

  IF v_status = 'failed' THEN
    RETURN QUERY SELECT 'canceled'::TEXT, v_bytes;
    RETURN;
  END IF;

  UPDATE public.photos AS p
     SET status = 'ready',
         bytes = p_bytes,
         storage_path = COALESCE(
           p.storage_path,
           p_event_id::TEXT || '/' || p_photo_id::TEXT || '.jpg'
         ),
         thumb_path = COALESCE(
           p.thumb_path,
           p_event_id::TEXT || '/' || p_photo_id::TEXT || '_thumb.jpg'
         ),
         upload_completed_at = COALESCE(p.upload_completed_at, NOW()),
         failure_reason = NULL
   WHERE p.id = p_photo_id;

  RETURN QUERY SELECT 'finalized'::TEXT, p_bytes;
END;
$$;

-- ---------------------------------------------------------------------------
-- Pembatalan idempoten + pelepasan kuota tepat sekali.
--
-- Baris tidak langsung dihapus. Tombstone `failed` memberi route handler cara
-- untuk mengulang penghapusan Storage bila proses mati setelah commit ini.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_pending_photo(
  p_photo_id UUID,
  p_guest_id UUID,
  p_event_id UUID,
  p_reason TEXT DEFAULT 'upload_failed'
)
RETURNS TABLE (outcome TEXT, full_path TEXT, preview_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status TEXT;
  v_released_at TIMESTAMPTZ;
  v_full_path TEXT;
  v_preview_path TEXT;
BEGIN
  -- Cancel tidak membutuhkan event lock; urutan guest -> photo adalah subset
  -- dari reserve (event -> guest -> photo), sehingga tidak membentuk siklus.
  PERFORM 1
  FROM public.guests AS g
  WHERE g.id = p_guest_id
    AND g.event_id = p_event_id
  FOR UPDATE;

  SELECT
    p.status,
    p.reservation_released_at,
    COALESCE(p.storage_path, p_event_id::TEXT || '/' || p_photo_id::TEXT || '.jpg'),
    COALESCE(p.thumb_path, p_event_id::TEXT || '/' || p_photo_id::TEXT || '_thumb.jpg')
  INTO v_status, v_released_at, v_full_path, v_preview_path
  FROM public.photos AS p
  WHERE p.id = p_photo_id
    AND p.guest_id = p_guest_id
    AND p.event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_status = 'ready' THEN
    RETURN QUERY SELECT 'already_ready'::TEXT, v_full_path, v_preview_path;
    RETURN;
  END IF;

  IF v_status = 'failed' THEN
    -- Menambal tombstone dari versi lama yang belum memiliki penanda release.
    -- Setelah kolom ini terisi, retry berikutnya tidak akan mengurangi lagi.
    UPDATE public.photos AS p
       SET reservation_released_at = COALESCE(p.reservation_released_at, NOW()),
           failure_reason = COALESCE(p.failure_reason, NULLIF(p_reason, ''), 'upload_failed'),
           cleanup_after = COALESCE(
             p.cleanup_after,
             GREATEST(
               NOW() + INTERVAL '3 hours',
               COALESCE(p.upload_token_expires_at, NOW()) + INTERVAL '1 hour'
             )
           )
     WHERE p.id = p_photo_id;

    IF v_released_at IS NULL THEN
      UPDATE public.guests AS g
         SET shots_used = GREATEST(COALESCE(g.shots_used, 0) - 1, 0)
       WHERE g.id = p_guest_id;
    END IF;

    RETURN QUERY SELECT 'already_canceled'::TEXT, v_full_path, v_preview_path;
    RETURN;
  END IF;

  UPDATE public.photos AS p
     SET status = 'failed',
         reservation_released_at = COALESCE(p.reservation_released_at, NOW()),
         failure_reason = COALESCE(NULLIF(p_reason, ''), 'upload_failed'),
         cleanup_after = GREATEST(
           NOW() + INTERVAL '3 hours',
           COALESCE(p.upload_token_expires_at, NOW()) + INTERVAL '1 hour'
         )
   WHERE p.id = p_photo_id;

  IF v_released_at IS NULL THEN
    UPDATE public.guests AS g
       SET shots_used = GREATEST(COALESCE(g.shots_used, 0) - 1, 0)
     WHERE g.id = p_guest_id;
  END IF;

  RETURN QUERY SELECT 'canceled'::TEXT, v_full_path, v_preview_path;
END;
$$;

-- ---------------------------------------------------------------------------
-- Penghapusan galeri idempoten untuk host maupun tamu.
--
-- Baris tidak dihapus: status `failed` langsung mengeluarkannya dari seluruh
-- query galeri, sedangkan tombstone mempertahankan idempotency key dan jadwal
-- cleanup. Kuota dan perubahan status berada dalam transaksi yang sama.
-- Storage baru boleh disentuh action setelah RPC ini commit. Action melakukan
-- best-effort remove segera, lalu worker mengulanginya sesudah semua signed
-- upload token pasti kedaluwarsa sebelum menandai `storage_cleaned_at`.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_photo_for_actor(
  p_photo_id UUID,
  p_actor_kind TEXT,
  p_actor_id UUID,
  p_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
  outcome TEXT,
  photo_event_id UUID,
  full_path TEXT,
  preview_path TEXT,
  storage_cleanup_pending BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_id UUID;
  v_guest_id UUID;
  v_initial_guest_id UUID;
  v_host_id UUID;
  v_guest_revoked BOOLEAN;
  v_status TEXT;
  v_failure_reason TEXT;
  v_released_at TIMESTAMPTZ;
  v_storage_path TEXT;
  v_thumb_path TEXT;
  v_storage_cleaned_at TIMESTAMPTZ;
  v_already_deleted BOOLEAN := FALSE;
  v_delete_reason TEXT;
BEGIN
  IF p_photo_id IS NULL
     OR p_actor_id IS NULL
     OR p_actor_kind IS NULL
     OR p_actor_kind NOT IN ('host', 'guest') THEN
    RAISE EXCEPTION 'invalid photo deletion request';
  END IF;

  -- Baca event/guest tanpa kunci hanya untuk menentukan urutan kunci. Semua
  -- nilai diperiksa kembali setelah event -> guest -> photo terkunci.
  SELECT p.event_id, p.guest_id
    INTO v_event_id, v_initial_guest_id
  FROM public.photos AS p
  WHERE p.id = p_photo_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'not_found'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      FALSE;
    RETURN;
  END IF;

  SELECT e.host_id
    INTO v_host_id
  FROM public.events AS e
  WHERE e.id = v_event_id
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'not_found'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      FALSE;
    RETURN;
  END IF;

  IF p_actor_kind = 'host' THEN
    IF v_host_id IS DISTINCT FROM p_actor_id THEN
      RETURN QUERY SELECT
        'forbidden'::TEXT,
        NULL::UUID,
        NULL::TEXT,
        NULL::TEXT,
        FALSE;
      RETURN;
    END IF;

    IF v_initial_guest_id IS NOT NULL THEN
      PERFORM 1
      FROM public.guests AS g
      WHERE g.id = v_initial_guest_id
        AND g.event_id = v_event_id
      FOR UPDATE;
    END IF;

    v_delete_reason := 'deleted_by_host';
  ELSE
    IF p_event_id IS NULL
       OR p_event_id IS DISTINCT FROM v_event_id
       OR v_initial_guest_id IS DISTINCT FROM p_actor_id THEN
      RETURN QUERY SELECT
        'forbidden'::TEXT,
        NULL::UUID,
        NULL::TEXT,
        NULL::TEXT,
        FALSE;
      RETURN;
    END IF;

    SELECT COALESCE(g.revoked, FALSE)
      INTO v_guest_revoked
    FROM public.guests AS g
    WHERE g.id = p_actor_id
      AND g.event_id = v_event_id
    FOR UPDATE;

    IF NOT FOUND OR v_guest_revoked THEN
      RETURN QUERY SELECT
        'forbidden'::TEXT,
        NULL::UUID,
        NULL::TEXT,
        NULL::TEXT,
        FALSE;
      RETURN;
    END IF;

    v_delete_reason := 'deleted_by_guest';
  END IF;

  SELECT
    p.guest_id,
    p.status,
    p.failure_reason,
    p.reservation_released_at,
    COALESCE(p.storage_path, v_event_id::TEXT || '/' || p_photo_id::TEXT || '.jpg'),
    COALESCE(p.thumb_path, v_event_id::TEXT || '/' || p_photo_id::TEXT || '_thumb.jpg'),
    p.storage_cleaned_at
  INTO
    v_guest_id,
    v_status,
    v_failure_reason,
    v_released_at,
    v_storage_path,
    v_thumb_path,
    v_storage_cleaned_at
  FROM public.photos AS p
  WHERE p.id = p_photo_id
    AND p.event_id = v_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'not_found'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      FALSE;
    RETURN;
  END IF;

  -- Nilai relasi tidak semestinya berubah, tetapi jangan meneruskan dengan
  -- guest yang berbeda bila metadata disentuh transaksi lain/administrasi.
  IF v_guest_id IS DISTINCT FROM v_initial_guest_id
     OR (p_actor_kind = 'guest' AND v_guest_id IS DISTINCT FROM p_actor_id) THEN
    RETURN QUERY SELECT
      'conflict'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      FALSE;
    RETURN;
  END IF;

  v_already_deleted :=
    v_status = 'failed'
    AND v_failure_reason IN ('deleted_by_host', 'deleted_by_guest');

  UPDATE public.photos AS p
     SET status = 'failed',
         reservation_released_at = COALESCE(p.reservation_released_at, NOW()),
         failure_reason = CASE
           WHEN v_already_deleted THEN p.failure_reason
           ELSE v_delete_reason
         END,
         cleanup_after = CASE
           WHEN p.storage_cleaned_at IS NOT NULL THEN p.cleanup_after
           WHEN v_already_deleted AND p.cleanup_after IS NOT NULL THEN p.cleanup_after
           ELSE GREATEST(
             COALESCE(p.cleanup_after, '-infinity'::TIMESTAMPTZ),
             NOW() + INTERVAL '3 hours',
             COALESCE(p.upload_token_expires_at, NOW()) + INTERVAL '1 hour'
           )
         END
   WHERE p.id = p_photo_id;

  -- `reservation_released_at` adalah penanda exactly-once. Karena guest sudah
  -- dikunci sebelum photo, reserve/cancel/delete paralel tidak bisa mengurangi
  -- atau menambah kuota dengan urutan yang berlawanan.
  IF v_guest_id IS NOT NULL AND v_released_at IS NULL THEN
    UPDATE public.guests AS g
       SET shots_used = GREATEST(COALESCE(g.shots_used, 0) - 1, 0)
     WHERE g.id = v_guest_id
       AND g.event_id = v_event_id;
  END IF;

  RETURN QUERY SELECT
    CASE WHEN v_already_deleted THEN 'already_deleted' ELSE 'deleted' END::TEXT,
    v_event_id,
    v_storage_path,
    v_thumb_path,
    (v_storage_cleaned_at IS NULL);
END;
$$;

-- ---------------------------------------------------------------------------
-- TTL batch untuk tab yang tidak pernah mengirim PATCH maupun DELETE.
--
-- UPDATE bersyarat membuat beberapa worker tidak mungkin melepas reservasi yang
-- sama dua kali. Fungsi mengembalikan path agar worker aplikasi dapat menghapus
-- objek Storage setelah grace; row tombstone tetap dipertahankan.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.expire_stale_photo_reservations(
  p_older_than INTERVAL DEFAULT INTERVAL '30 minutes',
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  photo_id UUID,
  guest_id UUID,
  full_path TEXT,
  preview_path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_photo RECORD;
BEGIN
  IF p_older_than IS NULL OR p_older_than <= INTERVAL '0 seconds' THEN
    RAISE EXCEPTION 'p_older_than must be positive';
  END IF;

  FOR v_photo IN
    SELECT
      p.id,
      p.guest_id,
      p.event_id,
      COALESCE(p.storage_path, p.event_id::TEXT || '/' || p.id::TEXT || '.jpg') AS storage_path,
      COALESCE(p.thumb_path, p.event_id::TEXT || '/' || p.id::TEXT || '_thumb.jpg') AS thumb_path
    FROM public.photos AS p
    WHERE p.status = 'pending'
      AND p.reservation_released_at IS NULL
      AND p.last_reserved_at < NOW() - p_older_than
    ORDER BY p.last_reserved_at
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 500), 1), 5000)
  LOOP
    -- Setelah kandidat optimistis dibaca, kunci guest lalu ubah photo. Ini
    -- mengikuti subset urutan reserve: event -> guest -> photo.
    -- SKIP LOCKED membuat worker lain melewati seluruh reservasi tamu yang
    -- sedang diproses tanpa saling menunggu.
    IF v_photo.guest_id IS NOT NULL THEN
      PERFORM 1
      FROM public.guests AS g
      WHERE g.id = v_photo.guest_id
      FOR UPDATE SKIP LOCKED;

      IF NOT FOUND THEN
        CONTINUE;
      END IF;
    END IF;

    UPDATE public.photos AS p
       SET status = 'failed',
           reservation_released_at = NOW(),
           failure_reason = 'upload_timeout',
           cleanup_after = GREATEST(
             NOW() + INTERVAL '3 hours',
             COALESCE(p.upload_token_expires_at, NOW()) + INTERVAL '1 hour'
           )
     WHERE p.id = v_photo.id
       AND p.status = 'pending'
       AND p.reservation_released_at IS NULL
       AND p.last_reserved_at < NOW() - p_older_than;

    IF FOUND THEN
      IF v_photo.guest_id IS NOT NULL THEN
        UPDATE public.guests AS g
           SET shots_used = GREATEST(COALESCE(g.shots_used, 0) - 1, 0)
         WHERE g.id = v_photo.guest_id;
      END IF;

      RETURN QUERY SELECT
        v_photo.id,
        v_photo.guest_id,
        v_photo.storage_path,
        v_photo.thumb_path;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_photo_upload(UUID, UUID, UUID, TEXT, INTEGER, JSONB, TEXT, INTEGER, INTEGER, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_photo_upload(UUID, UUID, UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_pending_photo(UUID, UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_photo_for_actor(UUID, TEXT, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_stale_photo_reservations(INTERVAL, INTEGER)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_photo_upload(UUID, UUID, UUID, TEXT, INTEGER, JSONB, TEXT, INTEGER, INTEGER, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_photo_upload(UUID, UUID, UUID, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_pending_photo(UUID, UUID, UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_photo_for_actor(UUID, TEXT, UUID, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_photo_reservations(INTERVAL, INTEGER)
  TO service_role;

-- Kompatibilitas rolling deploy: versi app lama masih memanggil release_shot()
-- sesudah menghapus row. Action baru tidak lagi memakainya; grant ini dapat
-- dicabut pada migrasi berikutnya setelah seluruh instance lama berhenti.
GRANT EXECUTE ON FUNCTION public.release_shot(UUID) TO service_role;

-- Bersihkan backlog lama saat migrasi dipasang. Objek Storage tetap dibiarkan
-- sebagai tombstone sampai worker aplikasi menghapusnya dengan Storage API.
SELECT COUNT(*)
FROM public.expire_stale_photo_reservations(INTERVAL '30 minutes', 5000);

-- Bila pg_cron sudah diaktifkan di proyek, jalankan batch setiap 15 menit.
-- Migrasi tidak mengaktifkan ekstensi secara paksa karena ketersediaannya
-- bergantung pada paket/region Supabase.
DO $schedule$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND NOT EXISTS (
       SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-photo-reservations'
     ) THEN
    PERFORM cron.schedule(
      'expire-stale-photo-reservations',
      '*/15 * * * *',
      $command$SELECT COUNT(*) FROM public.expire_stale_photo_reservations(INTERVAL '30 minutes', 500);$command$
    );
  END IF;
EXCEPTION
  WHEN insufficient_privilege OR undefined_function OR undefined_table THEN
    RAISE NOTICE 'pg_cron tersedia tetapi job TTL perlu dijadwalkan manual';
END;
$schedule$;
