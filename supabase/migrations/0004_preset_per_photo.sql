-- ============================================================================
-- HAY Stories — Roll film pindah ke tamu
--
-- Sebelumnya host memilih satu preset saat membuat album dan semua tamu
-- terkunci pada roll itu. Sekarang tamu memilih sendiri saat memotret dan bebas
-- berganti tiap jepretan, jadi yang menyimpan kebenarannya adalah
-- `photos.preset`, bukan `events.preset`.
--
-- Idempoten, aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Kolom yang tidak lagi dipakai
--
-- `events.preset` sengaja TIDAK di-DROP.
--
-- Kolomnya NOT NULL dengan DEFAULT, jadi membiarkannya tidak menghalangi satu
-- pun INSERT dari aplikasi yang sudah berhenti mengisinya, sementara DROP
-- bersifat merusak dan tidak bisa dibatalkan. Album yang dibuat sebelum
-- perubahan ini masih menyimpan pilihan host lamanya di sana; itu satu-satunya
-- catatan yang tersisa tentang bagaimana produk ini dulu bekerja.
--
-- Kalau nanti sudah pasti tidak diperlukan:
--   ALTER TABLE events DROP COLUMN preset;
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN events.preset IS
  'TIDAK DIPAKAI sejak 0004. Roll film dipilih tamu per jepretan; lihat photos.preset.';

COMMENT ON COLUMN photos.preset IS
  'Roll film yang dipilih tamu untuk foto ini. Sumber kebenaran sejak 0004.';
