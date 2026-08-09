-- ============================================================================
-- HAY Stories — Pendaftaran tamu
--
-- Satu fungsi yang memutuskan boleh-tidaknya sebuah perangkat masuk ke album.
-- Idempoten, aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Masuknya tamu secara atomik
--
-- Sama alasannya dengan `claim_shot`: pemeriksaan kuota yang dilakukan di
-- aplikasi selalu punya celah balapan. Di acara nyata, satu QR dipindai
-- belasan orang dalam hitungan detik — tanpa kunci baris, sepuluh tamu bisa
-- sama-sama membaca "baru 4 dari 5 terisi" lalu semuanya lolos masuk, dan
-- paket Starter yang dijual untuk 5 tamu diam-diam melayani 14.
--
-- `FOR UPDATE` pada baris acara membuat pendaftaran ke album yang sama
-- berbaris satu per satu. Album berbeda tidak saling menunggu karena yang
-- dikunci adalah baris acaranya, bukan tabelnya.
--
-- Nilai `status` yang dikembalikan:
--   ok        — boleh masuk, `guest_id` terisi
--   not_found — acaranya tidak ada
--   closed    — sudah diarsipkan, belum aktif, atau masa simpannya habis
--   full      — kuota tamu penuh
--   revoked   — perangkat ini dikeluarkan host
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.join_event(
  p_event_id UUID,
  p_session_id TEXT,
  p_display_name TEXT
)
RETURNS TABLE (status TEXT, guest_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max        INTEGER;
  v_status     TEXT;
  v_expires    TIMESTAMPTZ;
  v_count      INTEGER;
  v_guest_id   UUID;
  v_revoked    BOOLEAN;
BEGIN
  SELECT e.max_guests, e.status, e.expires_at
    INTO v_max, v_status, v_expires
  FROM events e
  WHERE e.id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_status <> 'active' OR (v_expires IS NOT NULL AND v_expires <= NOW()) THEN
    RETURN QUERY SELECT 'closed'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Perangkat yang sudah terdaftar hanya dipulihkan, bukan didaftarkan ulang.
  -- Tanpa cabang ini, tamu yang menutup lalu membuka lagi tautannya akan
  -- memakan satu slot kuota lagi setiap kali.
  SELECT g.id, COALESCE(g.revoked, FALSE)
    INTO v_guest_id, v_revoked
  FROM guests g
  WHERE g.event_id = p_event_id AND g.session_id = p_session_id;

  IF FOUND THEN
    IF v_revoked THEN
      RETURN QUERY SELECT 'revoked'::TEXT, NULL::UUID;
      RETURN;
    END IF;

    UPDATE guests g
       SET display_name = p_display_name,
           last_seen_at = NOW()
     WHERE g.id = v_guest_id;

    RETURN QUERY SELECT 'ok'::TEXT, v_guest_id;
    RETURN;
  END IF;

  -- Tamu yang dikeluarkan host tidak lagi menghitung terhadap kuota; slotnya
  -- memang dimaksudkan untuk dipakai orang lain.
  SELECT COUNT(*)
    INTO v_count
  FROM guests g
  WHERE g.event_id = p_event_id AND COALESCE(g.revoked, FALSE) = FALSE;

  IF v_count >= COALESCE(v_max, 5) THEN
    RETURN QUERY SELECT 'full'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO guests (event_id, session_id, display_name)
  VALUES (p_event_id, p_session_id, p_display_name)
  RETURNING id INTO v_guest_id;

  RETURN QUERY SELECT 'ok'::TEXT, v_guest_id;
END;
$$;

-- Hanya service role yang boleh memanggil. Tamu anonim memakai anon key dan
-- tidak boleh bisa mendaftarkan dirinya sendiri tanpa melewati Server Action
-- yang memvalidasi nama dan menerbitkan tokennya.
REVOKE ALL ON FUNCTION public.join_event(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Indeks
--
-- Penghitungan kuota di atas berjalan sambil memegang kunci baris acara, jadi
-- setiap milidetiknya menahan tamu lain yang sedang mendaftar. Indeks parsial
-- ini membuat hitungannya tidak perlu menyentuh baris tamu yang dikeluarkan.
--
-- Pencarian acara lewat kode cadangan sudah ditangani `idx_events_access_code`
-- dari migrasi 0001.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_guests_event_active
  ON guests(event_id) WHERE revoked = FALSE;
