-- ============================================================================
-- HAY Stories — Phone Guestbook privat
--
-- `messages` sudah ada sejak skema inti sebagai placeholder. Migrasi ini
-- menjadikannya lifecycle unggahan audio yang idempoten: tamu anonim tidak
-- pernah mendapat akses tabel/bucket, host hanya dapat membaca pesan miliknya
-- lewat RLS, dan semua mutasi sensitif melalui RPC yang sempit.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Lifecycle, metadata audio, dan relasi guest/event
-- ---------------------------------------------------------------------------

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS audio_mime TEXT,
  ADD COLUMN IF NOT EXISTS audio_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS last_reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upload_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upload_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reservation_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS cleanup_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_cleaned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Placeholder/row lama tidak memiliki lease reservasi. Pertahankan pesan lama
-- yang memang berisi teks/audio sebagai `ready`; row kosong menjadi tombstone.
UPDATE public.messages
   SET status = CASE
         WHEN body IS NOT NULL OR audio_path IS NOT NULL THEN 'ready'
         ELSE 'failed'
       END,
       failure_reason = CASE
         WHEN body IS NULL AND audio_path IS NULL
           THEN COALESCE(failure_reason, 'legacy_empty')
         ELSE failure_reason
       END,
       reservation_released_at = CASE
         WHEN body IS NULL AND audio_path IS NULL
           THEN COALESCE(reservation_released_at, NOW())
         ELSE reservation_released_at
       END,
       storage_cleaned_at = CASE
         WHEN body IS NULL AND audio_path IS NULL
           THEN COALESCE(storage_cleaned_at, NOW())
         ELSE storage_cleaned_at
       END
 WHERE status IS NULL
    OR (status = 'pending' AND last_reserved_at IS NULL);

UPDATE public.messages
   SET updated_at = COALESCE(updated_at, created_at, NOW()),
       is_hidden = COALESCE(is_hidden, FALSE)
 WHERE updated_at IS NULL OR is_hidden IS NULL;

ALTER TABLE public.messages
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN is_hidden SET DEFAULT FALSE,
  ALTER COLUMN is_hidden SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.messages ADD CONSTRAINT messages_moderated_by_fkey
    FOREIGN KEY (moderated_by) REFERENCES public.profiles(id) ON DELETE SET NULL
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FK komposit mencegah service-role bug memasangkan guest event A ke message
-- event B. ON DELETE CASCADE juga menghapus pesan bila guest benar-benar
-- dihapus; pencabutan akses normal hanya mengubah `revoked` dan tidak menghapus.
CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_event_id_id
  ON public.guests(event_id, id);

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_guest_id_fkey;

DO $$
BEGIN
  ALTER TABLE public.messages ADD CONSTRAINT messages_guest_event_fkey
    FOREIGN KEY (event_id, guest_id)
    REFERENCES public.guests(event_id, id)
    ON DELETE CASCADE
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Putuskan hanya relasi guest legacy yang memang silang event; isi pesan tetap
-- dipertahankan. Setelah itu invariant ini dapat divalidasi untuk seluruh row,
-- bukan sekadar INSERT/UPDATE baru.
UPDATE public.messages AS m
   SET guest_id = NULL,
       status = CASE WHEN m.status = 'pending' THEN 'failed' ELSE m.status END,
       body = CASE WHEN m.status = 'pending' THEN NULL ELSE m.body END,
       reservation_released_at = CASE
         WHEN m.status = 'pending' THEN COALESCE(m.reservation_released_at, NOW())
         ELSE m.reservation_released_at
       END,
       failure_reason = CASE
         WHEN m.status = 'pending' THEN COALESCE(m.failure_reason, 'invalid_guest_relation')
         ELSE m.failure_reason
       END,
       cleanup_after = CASE
         WHEN m.status = 'pending' THEN GREATEST(
           NOW() + INTERVAL '3 hours',
           COALESCE(m.upload_token_expires_at, NOW()) + INTERVAL '1 hour'
         )
         ELSE m.cleanup_after
       END
 WHERE m.guest_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
     FROM public.guests AS g
     WHERE g.id = m.guest_id
       AND g.event_id = m.event_id
   );

ALTER TABLE public.messages
  VALIDATE CONSTRAINT messages_guest_event_fkey;

-- Ganti constraint eksperimental/text-only bila migrasi ini pernah dicoba di
-- database pengembangan sebelum fitur audio selesai.
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_guest_name_text_check,
  DROP CONSTRAINT IF EXISTS messages_body_text_check,
  DROP CONSTRAINT IF EXISTS messages_status_check,
  DROP CONSTRAINT IF EXISTS messages_audio_mime_check,
  DROP CONSTRAINT IF EXISTS messages_audio_bytes_check,
  DROP CONSTRAINT IF EXISTS messages_duration_check,
  DROP CONSTRAINT IF EXISTS messages_pending_audio_check,
  DROP CONSTRAINT IF EXISTS messages_ready_content_check;

ALTER TABLE public.messages ADD CONSTRAINT messages_guest_name_text_check
  CHECK (
    char_length(guest_name) BETWEEN 2 AND 40
    AND octet_length(guest_name) <= 160
    AND guest_name = BTRIM(guest_name)
    AND guest_name !~ '[[:cntrl:]]'
  ) NOT VALID;

-- Catatan teks bersifat opsional. Audio adalah muatan utama untuk row baru.
ALTER TABLE public.messages ADD CONSTRAINT messages_body_text_check
  CHECK (
    body IS NULL OR (
      char_length(body) BETWEEN 1 AND 500
      AND octet_length(body) <= 2000
      AND body = BTRIM(body)
      AND body !~ '[[:cntrl:]]'
    )
  ) NOT VALID;

ALTER TABLE public.messages ADD CONSTRAINT messages_status_check
  CHECK (status IN ('pending', 'ready', 'failed')) NOT VALID;

ALTER TABLE public.messages ADD CONSTRAINT messages_audio_mime_check
  CHECK (
    audio_mime IS NULL
    OR audio_mime IN ('audio/webm', 'audio/mp4', 'audio/ogg')
  ) NOT VALID;

ALTER TABLE public.messages ADD CONSTRAINT messages_audio_bytes_check
  CHECK (audio_bytes IS NULL OR audio_bytes BETWEEN 512 AND 2097152) NOT VALID;

-- UI berhenti di 20 detik. Dua detik toleransi menghindari penolakan akibat
-- perbedaan waktu stop MediaRecorder; angka ini tetap metadata terlapor dan
-- bukan bukti kriptografis durasi media.
ALTER TABLE public.messages ADD CONSTRAINT messages_duration_check
  CHECK (duration_ms IS NULL OR duration_ms BETWEEN 250 AND 22000) NOT VALID;

ALTER TABLE public.messages ADD CONSTRAINT messages_pending_audio_check
  CHECK (
    status <> 'pending' OR (
      guest_id IS NOT NULL
      AND audio_path IS NOT NULL
      AND audio_mime IS NOT NULL
      AND duration_ms IS NOT NULL
      AND audio_bytes IS NULL
      AND last_reserved_at IS NOT NULL
      AND upload_token_expires_at IS NOT NULL
      AND reservation_released_at IS NULL
    )
  ) NOT VALID;

-- Pesan teks lama tetap terbaca. Semua row baru dari reserve/finalize selalu
-- memiliki audio_path; jalur RPC di bawah tidak menyediakan submit text-only.
ALTER TABLE public.messages ADD CONSTRAINT messages_ready_content_check
  CHECK (status <> 'ready' OR audio_path IS NOT NULL OR body IS NOT NULL) NOT VALID;

DROP TRIGGER IF EXISTS trg_messages_updated_at ON public.messages;
CREATE TRIGGER trg_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP INDEX IF EXISTS public.idx_messages_event;
DROP INDEX IF EXISTS public.idx_messages_event_created;
DROP INDEX IF EXISTS public.idx_messages_guest_activity;

CREATE INDEX IF NOT EXISTS idx_messages_event_ready_created
  ON public.messages(event_id, created_at DESC, id DESC)
  WHERE status = 'ready';

CREATE INDEX IF NOT EXISTS idx_messages_guest_active
  ON public.messages(event_id, guest_id, status, last_reserved_at DESC)
  WHERE guest_id IS NOT NULL AND status IN ('pending', 'ready');

CREATE INDEX IF NOT EXISTS idx_messages_guest_failures
  ON public.messages(event_id, guest_id, reservation_released_at DESC)
  WHERE guest_id IS NOT NULL AND status = 'failed';

CREATE INDEX IF NOT EXISTS idx_messages_cleanup_due
  ON public.messages(cleanup_after)
  WHERE status = 'failed' AND storage_cleaned_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Bucket privat — hanya service role / signed URL yang dapat menyentuhnya
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guestbook-audio',
  'guestbook-audio',
  FALSE,
  2097152,
  ARRAY['audio/webm', 'audio/mp4', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Tidak ada policy storage.objects untuk bucket ini. Tamu mengunggah dengan
-- signed upload token sekali pakai; host menerima signed playback URL pendek
-- hanya setelah ownership diperiksa oleh RLS.

-- ---------------------------------------------------------------------------
-- 3. Reserve audio atomik dan idempoten (service role saja)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reserve_guestbook_audio(
  p_message_id UUID,
  p_guest_id UUID,
  p_event_id UUID,
  p_body TEXT,
  p_audio_path TEXT,
  p_audio_mime TEXT,
  p_duration_ms INTEGER
)
RETURNS TABLE (
  ok BOOLEAN,
  rejection_reason TEXT,
  event_slug TEXT,
  existing_reservation BOOLEAN,
  already_ready BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_slug TEXT;
  v_event_status TEXT;
  v_event_expires TIMESTAMPTZ;
  v_guest public.guests%ROWTYPE;
  v_guest_name TEXT;
  v_body TEXT;
  v_extension TEXT;
  v_existing RECORD;
  v_active_status TEXT;
  v_recent_failures INTEGER := 0;
BEGIN
  IF p_message_id IS NULL OR p_guest_id IS NULL OR p_event_id IS NULL THEN
    RAISE EXCEPTION 'invalid guestbook reservation identifiers';
  END IF;

  v_extension := CASE p_audio_mime
    WHEN 'audio/webm' THEN '.webm'
    WHEN 'audio/mp4' THEN '.m4a'
    WHEN 'audio/ogg' THEN '.ogg'
    ELSE NULL
  END;

  IF v_extension IS NULL
     OR p_duration_ms IS NULL
     OR p_duration_ms NOT BETWEEN 250 AND 22000
     OR p_audio_path IS DISTINCT FROM
        p_event_id::TEXT || '/' || p_message_id::TEXT || v_extension THEN
    RAISE EXCEPTION 'invalid guestbook audio metadata';
  END IF;

  IF p_body IS NULL OR BTRIM(p_body) = '' THEN
    v_body := NULL;
  ELSE
    v_body := REGEXP_REPLACE(BTRIM(p_body), '[[:space:]]+', ' ', 'g');
    IF char_length(v_body) NOT BETWEEN 1 AND 500
       OR octet_length(v_body) > 2000
       OR v_body ~ '[[:cntrl:]]' THEN
      RAISE EXCEPTION 'invalid guestbook note';
    END IF;
  END IF;

  -- Urutan kunci konsisten dengan join/photo: event -> guest -> message.
  SELECT e.slug, e.status, e.expires_at
    INTO v_event_slug, v_event_status, v_event_expires
  FROM public.events AS e
  WHERE e.id = p_event_id
  FOR SHARE;

  IF NOT FOUND
     OR v_event_status IS DISTINCT FROM 'active'
     OR (v_event_expires IS NOT NULL AND v_event_expires <= NOW()) THEN
    RETURN QUERY SELECT
      FALSE, 'event_inactive'::TEXT, v_event_slug, FALSE, FALSE;
    RETURN;
  END IF;

  SELECT g.*
    INTO v_guest
  FROM public.guests AS g
  WHERE g.id = p_guest_id
    AND g.event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND OR COALESCE(v_guest.revoked, FALSE) THEN
    RETURN QUERY SELECT
      FALSE, 'guest_unavailable'::TEXT, v_event_slug, FALSE, FALSE;
    RETURN;
  END IF;

  v_guest_name := REGEXP_REPLACE(BTRIM(v_guest.display_name), '[[:space:]]+', ' ', 'g');
  IF char_length(v_guest_name) NOT BETWEEN 2 AND 40
     OR octet_length(v_guest_name) > 160
     OR v_guest_name ~ '[[:cntrl:]]' THEN
    RETURN QUERY SELECT
      FALSE, 'invalid_guest'::TEXT, v_event_slug, FALSE, FALSE;
    RETURN;
  END IF;

  -- Pulihkan tab yang ditutup. Tombstone tetap ada agar ID/path lama tidak
  -- pernah dapat dipakai ulang setelah signed token terbit.
  UPDATE public.messages AS m
     SET status = 'failed',
         body = NULL,
         reservation_released_at = COALESCE(m.reservation_released_at, NOW()),
         failure_reason = COALESCE(m.failure_reason, 'upload_timeout'),
         cleanup_after = GREATEST(
           NOW() + INTERVAL '3 hours',
           COALESCE(m.upload_token_expires_at, NOW()) + INTERVAL '1 hour'
         )
   WHERE m.event_id = p_event_id
     AND m.guest_id = p_guest_id
     AND m.status = 'pending'
     AND m.last_reserved_at < NOW() - INTERVAL '30 minutes';

  SELECT
    m.event_id,
    m.guest_id,
    m.status,
    m.body,
    m.audio_path,
    m.audio_mime,
    m.duration_ms
  INTO v_existing
  FROM public.messages AS m
  WHERE m.id = p_message_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.event_id = p_event_id
       AND v_existing.guest_id = p_guest_id
       AND v_existing.status = 'ready' THEN
      RETURN QUERY SELECT TRUE, NULL::TEXT, v_event_slug, FALSE, TRUE;
    ELSIF v_existing.event_id = p_event_id
       AND v_existing.guest_id = p_guest_id
       AND v_existing.status = 'pending'
       AND v_existing.body IS NOT DISTINCT FROM v_body
       AND v_existing.audio_path = p_audio_path
       AND v_existing.audio_mime = p_audio_mime
       AND v_existing.duration_ms = p_duration_ms THEN
      UPDATE public.messages AS m
         SET last_reserved_at = NOW(),
             upload_token_expires_at = NOW() + INTERVAL '2 hours'
       WHERE m.id = p_message_id;

      RETURN QUERY SELECT TRUE, NULL::TEXT, v_event_slug, TRUE, FALSE;
    ELSE
      RETURN QUERY SELECT
        FALSE, 'message_id_conflict'::TEXT, v_event_slug, FALSE, FALSE;
    END IF;
    RETURN;
  END IF;

  -- Kunci guest di atas menyerialkan dua tab milik tamu yang sama. Satu row
  -- ready atau lease pending yang masih hidup adalah batas produk/spam.
  SELECT m.status
    INTO v_active_status
  FROM public.messages AS m
  WHERE m.event_id = p_event_id
    AND m.guest_id = p_guest_id
    AND m.status IN ('pending', 'ready')
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      CASE
        WHEN v_active_status = 'ready' THEN 'already_submitted'::TEXT
        ELSE 'upload_in_progress'::TEXT
      END,
      v_event_slug,
      FALSE,
      v_active_status = 'ready';
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER
    INTO v_recent_failures
  FROM public.messages AS m
  WHERE m.event_id = p_event_id
    AND m.guest_id = p_guest_id
    AND m.status = 'failed'
    AND COALESCE(m.failure_reason, '') <> 'deleted_by_host'
    AND m.reservation_released_at >= NOW() - INTERVAL '1 hour';

  IF v_recent_failures >= 10 THEN
    RETURN QUERY SELECT
      FALSE, 'rate_limited'::TEXT, v_event_slug, FALSE, FALSE;
    RETURN;
  END IF;

  INSERT INTO public.messages (
    id,
    event_id,
    guest_id,
    guest_name,
    body,
    audio_path,
    audio_mime,
    duration_ms,
    status,
    is_hidden,
    last_reserved_at,
    upload_token_expires_at,
    created_at,
    updated_at
  ) VALUES (
    p_message_id,
    p_event_id,
    p_guest_id,
    v_guest_name,
    v_body,
    p_audio_path,
    p_audio_mime,
    p_duration_ms,
    'pending',
    FALSE,
    NOW(),
    NOW() + INTERVAL '2 hours',
    NOW(),
    NOW()
  );

  UPDATE public.guests AS g
     SET last_seen_at = NOW()
   WHERE g.id = p_guest_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_event_slug, FALSE, FALSE;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Finalize/cancel idempoten (service role saja)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finalize_guestbook_audio(
  p_message_id UUID,
  p_guest_id UUID,
  p_event_id UUID,
  p_audio_bytes INTEGER,
  p_audio_mime TEXT
)
RETURNS TABLE (
  outcome TEXT,
  recorded_bytes INTEGER,
  recorded_duration_ms INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status TEXT;
  v_reserved_mime TEXT;
  v_bytes INTEGER;
  v_duration INTEGER;
  v_last_reserved_at TIMESTAMPTZ;
  v_token_expires_at TIMESTAMPTZ;
BEGIN
  IF p_message_id IS NULL
     OR p_guest_id IS NULL
     OR p_event_id IS NULL
     OR p_audio_bytes IS NULL
     OR p_audio_bytes NOT BETWEEN 512 AND 2097152
     OR p_audio_mime IS NULL
     OR p_audio_mime NOT IN ('audio/webm', 'audio/mp4', 'audio/ogg') THEN
    RAISE EXCEPTION 'invalid guestbook finalization metadata';
  END IF;

  SELECT
    m.status,
    m.audio_mime,
    m.audio_bytes,
    m.duration_ms,
    m.last_reserved_at,
    m.upload_token_expires_at
  INTO
    v_status,
    v_reserved_mime,
    v_bytes,
    v_duration,
    v_last_reserved_at,
    v_token_expires_at
  FROM public.messages AS m
  WHERE m.id = p_message_id
    AND m.guest_id = p_guest_id
    AND m.event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_status = 'ready' THEN
    RETURN QUERY SELECT 'already_ready'::TEXT, v_bytes, v_duration;
    RETURN;
  END IF;

  IF v_status = 'failed' THEN
    RETURN QUERY SELECT 'canceled'::TEXT, v_bytes, v_duration;
    RETURN;
  END IF;

  IF v_reserved_mime IS DISTINCT FROM p_audio_mime THEN
    RETURN QUERY SELECT 'metadata_mismatch'::TEXT, NULL::INTEGER, v_duration;
    RETURN;
  END IF;

  -- Lease aplikasi lebih pendek dari signed token. Konfirmasi yang sangat
  -- terlambat menjadi tombstone; cleanup menunggu token Storage mati.
  IF v_last_reserved_at < NOW() - INTERVAL '30 minutes' THEN
    UPDATE public.messages AS m
       SET status = 'failed',
           body = NULL,
           reservation_released_at = COALESCE(m.reservation_released_at, NOW()),
           failure_reason = COALESCE(m.failure_reason, 'upload_timeout'),
           cleanup_after = GREATEST(
             NOW() + INTERVAL '3 hours',
             COALESCE(v_token_expires_at, NOW()) + INTERVAL '1 hour'
           )
     WHERE m.id = p_message_id;

    RETURN QUERY SELECT 'canceled'::TEXT, NULL::INTEGER, v_duration;
    RETURN;
  END IF;

  UPDATE public.messages AS m
     SET status = 'ready',
         audio_bytes = p_audio_bytes,
         upload_completed_at = COALESCE(m.upload_completed_at, NOW()),
         failure_reason = NULL
   WHERE m.id = p_message_id;

  RETURN QUERY SELECT 'finalized'::TEXT, p_audio_bytes, v_duration;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_pending_guestbook_audio(
  p_message_id UUID,
  p_guest_id UUID,
  p_event_id UUID,
  p_reason TEXT DEFAULT 'upload_failed'
)
RETURNS TABLE (
  outcome TEXT,
  stored_audio_path TEXT,
  stored_audio_mime TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status TEXT;
  v_path TEXT;
  v_mime TEXT;
  v_token_expires_at TIMESTAMPTZ;
BEGIN
  SELECT m.status, m.audio_path, m.audio_mime, m.upload_token_expires_at
    INTO v_status, v_path, v_mime, v_token_expires_at
  FROM public.messages AS m
  WHERE m.id = p_message_id
    AND m.guest_id = p_guest_id
    AND m.event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_status = 'ready' THEN
    RETURN QUERY SELECT 'already_ready'::TEXT, v_path, v_mime;
    RETURN;
  END IF;

  IF v_status = 'failed' THEN
    UPDATE public.messages AS m
       SET body = NULL,
           reservation_released_at = COALESCE(m.reservation_released_at, NOW()),
           failure_reason = LEFT(
             COALESCE(m.failure_reason, NULLIF(BTRIM(p_reason), ''), 'upload_failed'),
             80
           ),
           cleanup_after = COALESCE(
             m.cleanup_after,
             GREATEST(
               NOW() + INTERVAL '3 hours',
               COALESCE(v_token_expires_at, NOW()) + INTERVAL '1 hour'
             )
           )
     WHERE m.id = p_message_id;

    RETURN QUERY SELECT 'already_canceled'::TEXT, v_path, v_mime;
    RETURN;
  END IF;

  UPDATE public.messages AS m
     SET status = 'failed',
         body = NULL,
         reservation_released_at = COALESCE(m.reservation_released_at, NOW()),
         failure_reason = LEFT(COALESCE(NULLIF(BTRIM(p_reason), ''), 'upload_failed'), 80),
         cleanup_after = GREATEST(
           NOW() + INTERVAL '3 hours',
           COALESCE(v_token_expires_at, NOW()) + INTERVAL '1 hour'
         )
   WHERE m.id = p_message_id;

  RETURN QUERY SELECT 'canceled'::TEXT, v_path, v_mime;
END;
$$;

-- Worker memanggil ini sebelum menghapus objek yang cleanup_after-nya lewat.
CREATE OR REPLACE FUNCTION public.expire_stale_guestbook_audio_reservations(
  p_older_than INTERVAL DEFAULT INTERVAL '30 minutes',
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (message_id UUID, event_id UUID, stored_audio_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_older_than < INTERVAL '5 minutes'
     OR p_older_than > INTERVAL '24 hours'
     OR p_limit < 1
     OR p_limit > 5000 THEN
    RAISE EXCEPTION 'invalid guestbook expiry options';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT m.id
    FROM public.messages AS m
    WHERE m.status = 'pending'
      AND m.last_reserved_at < NOW() - p_older_than
    ORDER BY m.last_reserved_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ), expired AS (
    UPDATE public.messages AS m
       SET status = 'failed',
           body = NULL,
           reservation_released_at = COALESCE(m.reservation_released_at, NOW()),
           failure_reason = COALESCE(m.failure_reason, 'upload_timeout'),
           cleanup_after = GREATEST(
             NOW() + INTERVAL '3 hours',
             COALESCE(m.upload_token_expires_at, NOW()) + INTERVAL '1 hour'
           )
      FROM candidates AS c
     WHERE m.id = c.id
       AND m.status = 'pending'
    RETURNING m.id, m.event_id, m.audio_path
  )
  SELECT e.id, e.event_id, e.audio_path FROM expired AS e;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Moderasi host — auth.uid + ownership diperiksa di database
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_guestbook_entry_visibility(
  p_event_id UUID,
  p_entry_id UUID,
  p_hidden BOOLEAN
)
RETURNS TABLE (outcome TEXT, event_slug TEXT, entry_hidden BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_event_slug TEXT;
  v_hidden BOOLEAN;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN QUERY SELECT 'unauthenticated'::TEXT, NULL::TEXT, NULL::BOOLEAN;
    RETURN;
  END IF;

  IF p_event_id IS NULL OR p_entry_id IS NULL OR p_hidden IS NULL THEN
    RETURN QUERY SELECT 'invalid'::TEXT, NULL::TEXT, NULL::BOOLEAN;
    RETURN;
  END IF;

  SELECT e.slug INTO v_event_slug
  FROM public.events AS e
  WHERE e.id = p_event_id AND e.host_id = v_actor_id
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'forbidden'::TEXT, NULL::TEXT, NULL::BOOLEAN;
    RETURN;
  END IF;

  UPDATE public.messages AS m
     SET is_hidden = p_hidden,
         moderated_at = NOW(),
         moderated_by = v_actor_id
   WHERE m.id = p_entry_id
     AND m.event_id = p_event_id
     AND m.status = 'ready'
  RETURNING m.is_hidden INTO v_hidden;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, v_event_slug, NULL::BOOLEAN;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'updated'::TEXT, v_event_slug, v_hidden;
END;
$$;

-- Versi text-only eksperimental memiliki return type lebih pendek; PostgreSQL
-- tidak dapat mengubah return type lewat CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.delete_guestbook_entry(UUID, UUID);

CREATE OR REPLACE FUNCTION public.delete_guestbook_entry(
  p_event_id UUID,
  p_entry_id UUID
)
RETURNS TABLE (
  outcome TEXT,
  event_slug TEXT,
  stored_audio_path TEXT,
  stored_audio_mime TEXT,
  storage_cleanup_pending BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_event_slug TEXT;
  v_status TEXT;
  v_failure_reason TEXT;
  v_path TEXT;
  v_mime TEXT;
  v_token_expires_at TIMESTAMPTZ;
  v_storage_cleaned_at TIMESTAMPTZ;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN QUERY SELECT
      'unauthenticated'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
    RETURN;
  END IF;

  IF p_event_id IS NULL OR p_entry_id IS NULL THEN
    RETURN QUERY SELECT 'invalid'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
    RETURN;
  END IF;

  SELECT e.slug INTO v_event_slug
  FROM public.events AS e
  WHERE e.id = p_event_id AND e.host_id = v_actor_id
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'forbidden'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
    RETURN;
  END IF;

  SELECT
    m.status,
    m.failure_reason,
    m.audio_path,
    m.audio_mime,
    m.upload_token_expires_at,
    m.storage_cleaned_at
  INTO
    v_status,
    v_failure_reason,
    v_path,
    v_mime,
    v_token_expires_at,
    v_storage_cleaned_at
  FROM public.messages AS m
  WHERE m.id = p_entry_id AND m.event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'not_found'::TEXT, v_event_slug, NULL::TEXT, NULL::TEXT, FALSE;
    RETURN;
  END IF;

  IF v_status = 'failed' AND v_failure_reason = 'deleted_by_host' THEN
    RETURN QUERY SELECT
      'already_deleted'::TEXT,
      v_event_slug,
      v_path,
      v_mime,
      v_path IS NOT NULL AND v_storage_cleaned_at IS NULL;
    RETURN;
  END IF;

  UPDATE public.messages AS m
     SET status = 'failed',
         body = NULL,
         is_hidden = TRUE,
         moderated_at = NOW(),
         moderated_by = v_actor_id,
         deleted_at = COALESCE(m.deleted_at, NOW()),
         reservation_released_at = COALESCE(m.reservation_released_at, NOW()),
         failure_reason = 'deleted_by_host',
         cleanup_after = CASE
           WHEN v_path IS NULL THEN NULL
           ELSE GREATEST(
             NOW() + INTERVAL '3 hours',
             COALESCE(v_token_expires_at, NOW()) + INTERVAL '1 hour'
           )
         END,
         storage_cleaned_at = CASE
           WHEN v_path IS NULL THEN COALESCE(m.storage_cleaned_at, NOW())
           ELSE m.storage_cleaned_at
         END
   WHERE m.id = p_entry_id;

  RETURN QUERY SELECT
    'deleted'::TEXT,
    v_event_slug,
    v_path,
    v_mime,
    v_path IS NOT NULL AND v_storage_cleaned_at IS NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Hak akses: guest/anon tidak pernah menyentuh tabel secara langsung
-- ---------------------------------------------------------------------------

-- Fungsi text-only eksperimental tidak boleh tertinggal bila pernah diterapkan.
DROP FUNCTION IF EXISTS public.submit_guestbook_entry(UUID, UUID, TEXT);

REVOKE ALL ON FUNCTION public.reserve_guestbook_audio(UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_guestbook_audio(UUID, UUID, UUID, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_pending_guestbook_audio(UUID, UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_stale_guestbook_audio_reservations(INTERVAL, INTEGER)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_guestbook_audio(UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_guestbook_audio(UUID, UUID, UUID, INTEGER, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_pending_guestbook_audio(UUID, UUID, UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_guestbook_audio_reservations(INTERVAL, INTEGER)
  TO service_role;

REVOKE ALL ON FUNCTION public.set_guestbook_entry_visibility(UUID, UUID, BOOLEAN)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_guestbook_entry(UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_guestbook_entry_visibility(UUID, UUID, BOOLEAN)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_guestbook_entry(UUID, UUID)
  TO authenticated, service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages: host mengelola" ON public.messages;
DROP POLICY IF EXISTS "messages: host melihat" ON public.messages;

CREATE POLICY "messages: host melihat" ON public.messages
  FOR SELECT TO authenticated
  USING (
    status = 'ready'
    AND EXISTS (
      SELECT 1
      FROM public.events AS e
      WHERE e.id = messages.event_id
        AND e.host_id = (SELECT auth.uid())
    )
  );

REVOKE ALL ON TABLE public.messages FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  event_id,
  guest_name,
  body,
  audio_path,
  audio_mime,
  audio_bytes,
  duration_ms,
  status,
  is_hidden,
  created_at,
  updated_at,
  moderated_at
) ON TABLE public.messages TO authenticated;
