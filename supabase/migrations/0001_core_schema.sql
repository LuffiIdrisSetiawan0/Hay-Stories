-- ============================================================================
-- HAY Stories — Skema inti
--
-- Ditulis idempoten (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) sehingga aman
-- dijalankan baik pada database kosong maupun pada database yang sudah terlanjur
-- memakai `supabase/schema.sql` versi lama.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabel
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ,
  preset TEXT NOT NULL DEFAULT 'golden-hour-400',
  reveal_mode TEXT NOT NULL DEFAULT 'manual',
  reveal_at TIMESTAMPTZ,
  is_revealed BOOLEAN DEFAULT FALSE,
  max_guests INTEGER DEFAULT 5,
  status TEXT DEFAULT 'active',
  tier TEXT DEFAULT 'starter',
  cover_image_url TEXT,
  qr_code_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kolom baru (juga menambal database yang sudah memakai skema lama)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS access_code TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS shots_per_guest INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gallery_visibility TEXT DEFAULT 'guests',
  ADD COLUMN IF NOT EXISTS live_mode BOOLEAN DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_access_code ON events(access_code)
  WHERE access_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, session_id)
);

-- Skema lama menamainya `photo_count`; ganti nama bila masih ada.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guests' AND column_name = 'photo_count'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guests' AND column_name = 'shots_used'
  ) THEN
    ALTER TABLE guests RENAME COLUMN photo_count TO shots_used;
  END IF;
END $$;

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS shots_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_session_id TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signed URL punya masa berlaku, jadi yang disimpan adalah PATH, bukan URL.
ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS thumb_path TEXT,
  ADD COLUMN IF NOT EXISTS preset TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'inapp',
  ADD COLUMN IF NOT EXISTS bytes INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

ALTER TABLE photos
  DROP COLUMN IF EXISTS original_url,
  DROP COLUMN IF EXISTS filtered_url,
  DROP COLUMN IF EXISTS thumbnail_url;

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  midtrans_order_id TEXT UNIQUE NOT NULL,
  midtrans_transaction_id TEXT,
  amount INTEGER NOT NULL,
  tier TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_type TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guestbook (dipakai pasca-MVP, dibuat sekarang agar skema stabil)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  body TEXT,
  audio_path TEXT,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. Batasan nilai
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  ALTER TABLE events ADD CONSTRAINT events_reveal_mode_check
    CHECK (reveal_mode IN ('immediate', 'scheduled', 'manual'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE events ADD CONSTRAINT events_status_check
    CHECK (status IN ('draft', 'active', 'revealed', 'archived'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE events ADD CONSTRAINT events_gallery_visibility_check
    CHECK (gallery_visibility IN ('guests', 'host_only'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Slug hanya huruf kecil, angka, dan tanda hubung; 3-60 karakter.
DO $$
BEGIN
  ALTER TABLE events ADD CONSTRAINT events_slug_format_check
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE photos ADD CONSTRAINT photos_status_check
    CHECK (status IN ('pending', 'ready', 'failed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE photos ADD CONSTRAINT photos_source_check
    CHECK (source IN ('inapp', 'hd', 'upload'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Indeks
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_events_host ON events(host_id);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_photos_event ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_event_ready
  ON photos(event_id, taken_at DESC) WHERE status = 'ready' AND is_hidden = FALSE;
CREATE INDEX IF NOT EXISTS idx_guests_event ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_event ON payments(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_event ON messages(event_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PENTING: tanpa trigger ini tidak ada baris `profiles` yang dibuat saat user
-- mendaftar, sehingga `events.host_id` (FK ke profiles) selalu gagal dan user
-- baru tidak akan pernah bisa membuat album.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Isi profil yang hilang untuk user yang sudah terlanjur mendaftar.
INSERT INTO public.profiles (id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Klaim jepretan secara atomik
--
-- Dipanggil sebelum menerbitkan signed upload URL. `FOR UPDATE` mengunci baris
-- tamu sehingga 20 permintaan bersamaan tidak bisa menembus kuota.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_shot(p_guest_id UUID)
RETURNS TABLE (ok BOOLEAN, shots_used INTEGER, shots_limit INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_used INTEGER;
  v_revoked BOOLEAN;
  v_limit INTEGER;
  v_status TEXT;
BEGIN
  SELECT g.event_id, g.shots_used, g.revoked
    INTO v_event_id, v_used, v_revoked
  FROM guests g
  WHERE g.id = p_guest_id
  FOR UPDATE;

  IF NOT FOUND OR v_revoked THEN
    RETURN QUERY SELECT FALSE, COALESCE(v_used, 0), 0;
    RETURN;
  END IF;

  SELECT e.shots_per_guest, e.status
    INTO v_limit, v_status
  FROM events e
  WHERE e.id = v_event_id;

  IF v_status <> 'active' OR v_used >= v_limit THEN
    RETURN QUERY SELECT FALSE, v_used, v_limit;
    RETURN;
  END IF;

  UPDATE guests g
     SET shots_used = g.shots_used + 1,
         last_seen_at = NOW()
   WHERE g.id = p_guest_id
  RETURNING g.shots_used INTO v_used;

  RETURN QUERY SELECT TRUE, v_used, v_limit;
END;
$$;

-- Kembalikan jepretan bila unggahan gagal, agar tamu tidak kehilangan kuota.
CREATE OR REPLACE FUNCTION public.release_shot(p_guest_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE guests
     SET shots_used = GREATEST(shots_used - 1, 0)
   WHERE id = p_guest_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_shot(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_shot(UUID) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
--
-- Prinsip: host terautentikasi hanya menyentuh barisnya sendiri. Tamu anonim
-- TIDAK punya akses langsung sama sekali — seluruh jalur tamu lewat route
-- handler sisi server memakai service role (yang melewati RLS).
-- ---------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: baca milik sendiri" ON profiles;
CREATE POLICY "profiles: baca milik sendiri" ON profiles
  FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles: ubah milik sendiri" ON profiles;
CREATE POLICY "profiles: ubah milik sendiri" ON profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "events: kelola milik sendiri" ON events;
CREATE POLICY "events: kelola milik sendiri" ON events
  FOR ALL TO authenticated
  USING (host_id = (SELECT auth.uid()))
  WITH CHECK (host_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "guests: host melihat tamu acaranya" ON guests;
CREATE POLICY "guests: host melihat tamu acaranya" ON guests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = guests.event_id AND e.host_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "guests: host mencabut akses tamu" ON guests;
CREATE POLICY "guests: host mencabut akses tamu" ON guests
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = guests.event_id AND e.host_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "photos: host melihat foto acaranya" ON photos;
CREATE POLICY "photos: host melihat foto acaranya" ON photos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = photos.event_id AND e.host_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "photos: host memoderasi" ON photos;
CREATE POLICY "photos: host memoderasi" ON photos
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = photos.event_id AND e.host_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "photos: host menghapus" ON photos;
CREATE POLICY "photos: host menghapus" ON photos
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = photos.event_id AND e.host_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "payments: baca milik sendiri" ON payments;
CREATE POLICY "payments: baca milik sendiri" ON payments
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "messages: host mengelola" ON messages;
CREATE POLICY "messages: host mengelola" ON messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = messages.event_id AND e.host_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = messages.event_id AND e.host_id = (SELECT auth.uid())
  ));
