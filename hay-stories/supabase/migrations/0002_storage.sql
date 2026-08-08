-- ============================================================================
-- HAY Stories — Bucket storage & kebijakan akses
--
-- Tiga bucket:
--   photos  — PRIVAT. Foto tamu. Dibaca hanya lewat signed URL berumur pendek
--             yang diterbitkan sisi server. Tidak ada policy anon/authenticated
--             sama sekali, jadi tidak ada jalan masuk selain service role.
--   covers  — PUBLIK. Gambar sampul acara yang diunggah host dari browser.
--   qr      — PUBLIK. PNG QR code yang dibuat server.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('photos', 'photos', FALSE, 26214400, ARRAY['image/jpeg', 'image/webp', 'image/png']),
  ('covers', 'covers', TRUE,   5242880, ARRAY['image/jpeg', 'image/webp', 'image/png']),
  ('qr',     'qr',     TRUE,    524288, ARRAY['image/png', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- covers — host hanya boleh menulis ke folder ber-UUID dirinya sendiri
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "covers: baca publik" ON storage.objects;
CREATE POLICY "covers: baca publik" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'covers');

DROP POLICY IF EXISTS "covers: host unggah ke foldernya" ON storage.objects;
CREATE POLICY "covers: host unggah ke foldernya" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "covers: host ganti miliknya" ON storage.objects;
CREATE POLICY "covers: host ganti miliknya" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "covers: host hapus miliknya" ON storage.objects;
CREATE POLICY "covers: host hapus miliknya" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'covers'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- qr — baca publik; penulisan hanya lewat service role (tanpa policy tulis)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "qr: baca publik" ON storage.objects;
CREATE POLICY "qr: baca publik" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'qr');

-- ---------------------------------------------------------------------------
-- photos — sengaja TANPA policy apa pun.
--
-- Unggahan tamu memakai signed upload URL sekali pakai, pembacaan memakai
-- signed URL; keduanya diterbitkan server dengan service role dan tidak
-- tunduk pada RLS. Membiarkan bucket ini tanpa policy berarti anon key yang
-- bocor pun tidak bisa membaca atau menulis satu file pun.
-- ---------------------------------------------------------------------------
