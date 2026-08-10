-- ============================================================================
-- HAY Stories — Bingkai foto
--
-- Bingkai dipilih tamu per jepretan, sejajar dengan `preset`. Yang disimpan
-- hanya PILIHANNYA, bukan hasilnya: berkas di storage tetap foto polos dan
-- bingkainya baru ditempelkan saat diunduh.
--
-- Konsekuensinya disengaja — gaya bingkai bisa diperbaiki, ditambah, atau
-- diganti kapan saja tanpa menyentuh satu berkas pun yang sudah tersimpan.
--
-- Idempoten, aman dijalankan ulang.
-- ============================================================================

ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS frame TEXT DEFAULT 'none';

COMMENT ON COLUMN photos.frame IS
  'Bingkai pilihan tamu untuk foto ini. Tidak pernah ikut tersimpan ke berkas; ditempelkan saat unduh.';

-- Sengaja tanpa CHECK constraint pada daftar nilainya.
--
-- Daftar bingkai hidup di src/lib/frames.ts dan akan bertambah. Menyalinnya ke
-- batasan database berarti setiap gaya baru menuntut migrasi, dan cepat atau
-- lambat keduanya akan berbeda. Nilai yang masuk sudah divalidasi terhadap
-- PHOTO_FRAMES di route handler sebelum menyentuh tabel ini.
