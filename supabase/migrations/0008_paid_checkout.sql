-- ============================================================================
-- HAY Stories — Checkout paket berbayar
--
-- Migrasi ini menambahkan snapshot harga/batas paket, membuat pembuatan
-- payment pending idempoten, dan memindahkan aktivasi album ke satu transaksi
-- database. Hanya service_role yang boleh memanggil kedua RPC di bawah.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Metadata checkout dan snapshot paket
-- ---------------------------------------------------------------------------

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS snap_redirect_url TEXT,
  ADD COLUMN IF NOT EXISTS midtrans_status TEXT,
  ADD COLUMN IF NOT EXISTS status_code TEXT,
  ADD COLUMN IF NOT EXISTS fraud_status TEXT,
  ADD COLUMN IF NOT EXISTS limit_max_guests INTEGER,
  ADD COLUMN IF NOT EXISTS limit_shots_per_guest INTEGER,
  ADD COLUMN IF NOT EXISTS limit_retention_days INTEGER,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.payments
   SET updated_at = COALESCE(updated_at, created_at, NOW())
 WHERE updated_at IS NULL;

ALTER TABLE public.payments
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
BEGIN
  ALTER TABLE public.payments ADD CONSTRAINT payments_amount_positive_check
    CHECK (amount >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.payments ADD CONSTRAINT payments_tier_check
    CHECK (tier IN ('starter', 'party', 'pesta', 'unlimited')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
    CHECK (status IN (
      'pending', 'challenge', 'paid', 'failed', 'denied', 'cancelled',
      'expired', 'refunded', 'partial_refund', 'chargeback'
    )) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.payments ADD CONSTRAINT payments_limit_snapshot_check
    CHECK (
      (limit_max_guests IS NULL OR limit_max_guests > 0)
      AND (limit_shots_per_guest IS NULL OR limit_shots_per_guest > 0)
      AND (limit_retention_days IS NULL OR limit_retention_days > 0)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Database lama mungkin sudah mempunyai lebih dari satu baris pending untuk
-- satu album. Pertahankan yang terbaru sebagai checkout aktif; baris lama
-- tetap tersedia untuk audit dan masih dapat menerima settlement terlambat.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY event_id
           ORDER BY created_at DESC NULLS LAST, id DESC
         ) AS row_number
  FROM public.payments
  WHERE status IN ('pending', 'challenge')
)
UPDATE public.payments AS p
   SET status = 'cancelled'
  FROM ranked AS r
 WHERE p.id = r.id
   AND r.row_number > 1;

DROP INDEX IF EXISTS public.idx_payments_one_pending_per_event;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_open_per_event
  ON public.payments(event_id) WHERE status IN ('pending', 'challenge');

CREATE INDEX IF NOT EXISTS idx_payments_user_created
  ON public.payments(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Ambil atau buat payment pending secara idempoten
--
-- Kunci event menyerialkan dua klik/tabs yang berjalan bersamaan. Snapshot
-- limit ditulis bersama harga sebelum request ke Midtrans sehingga perubahan
-- katalog setelah checkout dimulai tidak mengubah hak album yang dibeli.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_pending_event_payment(
  p_event_id UUID,
  p_user_id UUID,
  p_order_id TEXT,
  p_tier TEXT,
  p_amount INTEGER,
  p_max_guests INTEGER,
  p_shots_per_guest INTEGER,
  p_retention_days INTEGER DEFAULT NULL
)
RETURNS TABLE (
  outcome TEXT,
  created BOOLEAN,
  payment_id UUID,
  order_id TEXT,
  payment_status TEXT,
  payment_amount INTEGER,
  payment_tier TEXT,
  redirect_url TEXT,
  snapshot_max_guests INTEGER,
  snapshot_shots_per_guest INTEGER,
  snapshot_retention_days INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_host_id UUID;
  v_event_status TEXT;
  v_event_tier TEXT;
  v_payment public.payments%ROWTYPE;
BEGIN
  SELECT e.host_id, e.status, e.tier
    INTO v_host_id, v_event_status, v_event_tier
  FROM public.events AS e
  WHERE e.id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'not_found'::TEXT, FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT,
      NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::INTEGER,
      NULL::INTEGER;
    RETURN;
  END IF;

  IF v_host_id IS DISTINCT FROM p_user_id THEN
    RETURN QUERY SELECT
      'forbidden'::TEXT, FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT,
      NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::INTEGER,
      NULL::INTEGER;
    RETURN;
  END IF;

  IF v_event_status <> 'draft' THEN
    RETURN QUERY SELECT
      CASE WHEN v_event_status = 'active' THEN 'already_active' ELSE 'event_closed' END::TEXT,
      FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TEXT,
      NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  IF p_tier NOT IN ('party', 'pesta', 'unlimited')
     OR v_event_tier IS DISTINCT FROM p_tier
     OR p_amount IS NULL OR p_amount <= 0
     OR p_max_guests IS NULL OR p_max_guests <= 0
     OR p_shots_per_guest IS NULL OR p_shots_per_guest <= 0
     OR (p_retention_days IS NOT NULL AND p_retention_days <= 0)
     OR p_order_id IS NULL
     OR p_order_id !~ '^[A-Za-z0-9_-]{8,50}$' THEN
    RETURN QUERY SELECT
      'invalid_quote'::TEXT, FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT,
      NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::INTEGER,
      NULL::INTEGER;
    RETURN;
  END IF;

  -- Payment sah yang belum berhasil mengaktifkan event harus ditangani sebagai
  -- insiden aktivasi, bukan ditagih ulang.
  SELECT p.*
    INTO v_payment
  FROM public.payments AS p
  WHERE p.event_id = p_event_id
    AND p.status IN ('paid', 'refunded', 'partial_refund', 'chargeback')
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN QUERY SELECT
      'already_paid'::TEXT,
      FALSE,
      v_payment.id,
      v_payment.midtrans_order_id,
      v_payment.status,
      v_payment.amount,
      v_payment.tier,
      v_payment.snap_redirect_url,
      v_payment.limit_max_guests,
      v_payment.limit_shots_per_guest,
      v_payment.limit_retention_days;
    RETURN;
  END IF;

  SELECT p.*
    INTO v_payment
  FROM public.payments AS p
  WHERE p.event_id = p_event_id
    AND p.status IN ('pending', 'challenge')
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN QUERY SELECT
      'existing'::TEXT,
      FALSE,
      v_payment.id,
      v_payment.midtrans_order_id,
      v_payment.status,
      v_payment.amount,
      v_payment.tier,
      v_payment.snap_redirect_url,
      v_payment.limit_max_guests,
      v_payment.limit_shots_per_guest,
      v_payment.limit_retention_days;
    RETURN;
  END IF;

  INSERT INTO public.payments (
    event_id,
    user_id,
    midtrans_order_id,
    amount,
    tier,
    status,
    limit_max_guests,
    limit_shots_per_guest,
    limit_retention_days
  )
  VALUES (
    p_event_id,
    p_user_id,
    p_order_id,
    p_amount,
    p_tier,
    'pending',
    p_max_guests,
    p_shots_per_guest,
    p_retention_days
  )
  RETURNING * INTO v_payment;

  RETURN QUERY SELECT
    'created'::TEXT,
    TRUE,
    v_payment.id,
    v_payment.midtrans_order_id,
    v_payment.status,
    v_payment.amount,
    v_payment.tier,
    v_payment.snap_redirect_url,
    v_payment.limit_max_guests,
    v_payment.limit_shots_per_guest,
    v_payment.limit_retention_days;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Terapkan status tepercaya dan aktivasi album secara atomik
--
-- RPC tetap memeriksa sendiri syarat settlement: status code 200, nominal
-- persis sama, tier payment = tier event, dan fraud status accept untuk
-- capture. Replay pending yang terlambat tidak boleh menurunkan status paid.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apply_midtrans_payment_update(
  p_order_id TEXT,
  p_transaction_id TEXT,
  p_normalized_status TEXT,
  p_midtrans_status TEXT,
  p_payment_type TEXT,
  p_status_code TEXT,
  p_fraud_status TEXT,
  p_gross_amount BIGINT
)
RETURNS TABLE (
  outcome TEXT,
  payment_id UUID,
  event_id UUID,
  payment_status TEXT,
  event_activated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_effective_status TEXT;
  v_success BOOLEAN;
  v_activated BOOLEAN := FALSE;
BEGIN
  IF p_normalized_status IS NULL OR p_normalized_status NOT IN (
    'pending', 'challenge', 'paid', 'failed', 'denied', 'cancelled',
    'expired', 'refunded', 'partial_refund', 'chargeback'
  ) THEN
    RETURN QUERY SELECT
      'invalid_status'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT, FALSE;
    RETURN;
  END IF;

  SELECT p.*
    INTO v_payment
  FROM public.payments AS p
  WHERE p.midtrans_order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'not_found'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT, FALSE;
    RETURN;
  END IF;

  SELECT e.*
    INTO v_event
  FROM public.events AS e
  WHERE e.id = v_payment.event_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_event.host_id IS DISTINCT FROM v_payment.user_id
     OR v_event.tier IS DISTINCT FROM v_payment.tier THEN
    RETURN QUERY SELECT
      'tier_mismatch'::TEXT, v_payment.id, v_payment.event_id,
      v_payment.status, FALSE;
    RETURN;
  END IF;

  IF p_gross_amount IS NULL
     OR p_gross_amount <> v_payment.amount::BIGINT THEN
    RETURN QUERY SELECT
      'amount_mismatch'::TEXT, v_payment.id, v_payment.event_id,
      v_payment.status, FALSE;
    RETURN;
  END IF;

  v_success :=
    p_status_code = '200'
    AND (
      (LOWER(COALESCE(p_midtrans_status, '')) = 'settlement'
        AND LOWER(COALESCE(p_fraud_status, 'accept')) = 'accept')
      OR
      (LOWER(COALESCE(p_midtrans_status, '')) = 'capture'
        AND LOWER(COALESCE(p_fraud_status, '')) = 'accept')
    );

  IF p_normalized_status = 'paid' AND NOT v_success THEN
    RETURN QUERY SELECT
      'untrusted_settlement'::TEXT, v_payment.id, v_payment.event_id,
      v_payment.status, FALSE;
    RETURN;
  END IF;

  -- Status yang menunjukkan uang sudah berpindah tidak boleh ditimpa callback
  -- pending/expire lama. Refund dan chargeback tetap dicatat untuk rekonsiliasi,
  -- tetapi tidak otomatis menghapus album yang sudah dipakai.
  IF v_payment.status IN ('refunded', 'partial_refund', 'chargeback') THEN
    v_effective_status := v_payment.status;
  ELSIF v_payment.status = 'paid'
        AND p_normalized_status NOT IN ('refunded', 'partial_refund', 'chargeback') THEN
    v_effective_status := 'paid';
  ELSIF v_payment.status IN ('failed', 'denied', 'cancelled', 'expired')
        AND p_normalized_status IN ('pending', 'challenge') THEN
    v_effective_status := v_payment.status;
  ELSE
    v_effective_status := p_normalized_status;
  END IF;

  UPDATE public.payments AS p
     SET status = v_effective_status,
         midtrans_status = LEFT(p_midtrans_status, 40),
         status_code = LEFT(p_status_code, 12),
         fraud_status = NULLIF(LEFT(p_fraud_status, 24), ''),
         payment_type = NULLIF(LEFT(p_payment_type, 64), ''),
         midtrans_transaction_id = COALESCE(
           NULLIF(LEFT(p_transaction_id, 128), ''),
           p.midtrans_transaction_id
         ),
         paid_at = CASE
           WHEN p_normalized_status = 'paid' THEN COALESCE(p.paid_at, NOW())
           ELSE p.paid_at
         END,
         last_synced_at = NOW()
   WHERE p.id = v_payment.id;

  IF p_normalized_status = 'paid' THEN
    IF v_payment.limit_max_guests IS NULL
       OR v_payment.limit_max_guests <= 0
       OR v_payment.limit_shots_per_guest IS NULL
       OR v_payment.limit_shots_per_guest <= 0
       OR (v_payment.limit_retention_days IS NOT NULL
           AND v_payment.limit_retention_days <= 0) THEN
      RETURN QUERY SELECT
        'invalid_snapshot'::TEXT, v_payment.id, v_payment.event_id,
        v_effective_status, FALSE;
      RETURN;
    END IF;

    IF v_event.status = 'draft' THEN
      UPDATE public.events AS e
         SET status = 'active',
             tier = v_payment.tier,
             max_guests = v_payment.limit_max_guests,
             shots_per_guest = v_payment.limit_shots_per_guest,
             expires_at = CASE
               WHEN v_payment.limit_retention_days IS NULL THEN NULL
               ELSE NOW() + make_interval(days => v_payment.limit_retention_days)
             END
       WHERE e.id = v_payment.event_id
         AND e.status = 'draft'
         AND e.tier = v_payment.tier;
      v_activated := FOUND;
    END IF;
  END IF;

  RETURN QUERY SELECT
    CASE
      WHEN v_activated THEN 'activated'
      WHEN p_normalized_status = 'paid' AND v_event.status = 'active' THEN 'already_active'
      WHEN p_normalized_status = 'paid' AND v_event.status <> 'draft' THEN 'event_closed'
      ELSE 'updated'
    END::TEXT,
    v_payment.id,
    v_payment.event_id,
    v_effective_status,
    v_activated;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_pending_event_payment(
  UUID, UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_midtrans_payment_update(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ensure_pending_event_payment(
  UUID, UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER
) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_midtrans_payment_update(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT
) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Kolom komersial event tidak dapat dipalsukan dari browser
--
-- Sebelumnya policy FOR ALL memungkinkan host mengirim UPDATE tier/unlimited
-- langsung ke PostgREST. Pembuatan event kini lewat Server Action + service
-- role; host hanya mendapat UPDATE untuk kolom yang memang dapat diedit.
-- ---------------------------------------------------------------------------

REVOKE INSERT ON TABLE public.events FROM authenticated;
REVOKE UPDATE ON TABLE public.events FROM authenticated;
REVOKE DELETE ON TABLE public.events FROM authenticated;

GRANT UPDATE (
  title,
  description,
  event_date,
  reveal_mode,
  reveal_at,
  is_revealed,
  cover_image_url,
  starts_at,
  ends_at,
  gallery_visibility,
  live_mode
) ON TABLE public.events TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.payments FROM authenticated;
