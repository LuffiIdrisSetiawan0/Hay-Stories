# Database HAY Stories

## Cara menjalankan migrasi

Buka **SQL Editor** di dashboard Supabase, lalu jalankan berkas di `migrations/`
**berurutan sesuai nomor**:

1. `0001_core_schema.sql` — tabel, batasan, indeks, trigger, RLS
2. `0002_storage.sql` — bucket storage dan kebijakan aksesnya
3. `0003_guest_join.sql` — fungsi `join_event()` untuk pendaftaran tamu
4. `0004_preset_per_photo.sql` — menandai `events.preset` tidak lagi dipakai
5. `0005_photo_frame.sql` — kolom `photos.frame` untuk bingkai pilihan tamu
6. `0006_photo_upload_reliability.sql` — reservasi/finalisasi idempoten,
   processing recipe, dan TTL untuk unggahan pending
7. `0007_dashboard_statistics.sql` — agregasi jumlah foto/tamu host tanpa
   mengambil seluruh baris atau membuat request per album
8. `0008_paid_checkout.sql` — snapshot harga/limit, payment pending idempoten,
   aktivasi atomik dari status Midtrans tepercaya, dan proteksi kolom tier

Seluruh migrasi ditulis **idempoten**, jadi aman dijalankan ulang dan aman pada
database yang sudah terlanjur memakai `schema.sql` versi lama.

## Model akses

| Pihak | Cara akses |
|---|---|
| Host (terautentikasi) | Langsung via `anon key` + RLS. Policy hanya mengizinkan baris miliknya. |
| Tamu (anonim) | **Tidak punya akses database sama sekali.** Semuanya lewat kode sisi server yang memakai `SUPABASE_SERVICE_ROLE_KEY`, setelah memverifikasi JWT tamu di cookie httpOnly: Server Action untuk pendaftaran dan form, route handler `/api/guest/*` untuk unggahan foto. |

Konsekuensinya: `anon key` yang bocor tidak membocorkan satu foto pun, karena
bucket `photos` privat dan tidak punya policy apa pun.

## Catatan penting

- **`handle_new_user()`** membuat baris `profiles` otomatis saat user mendaftar.
  Tanpa ini `events.host_id` (FK ke `profiles`) selalu gagal dan tidak ada user
  baru yang bisa membuat album. Migrasi juga mengisi ulang profil yang hilang
  untuk user yang sudah terlanjur mendaftar.
- **`reserve_photo_upload()`** mengunci baris tamu, menaikkan kuota, dan
  menyisipkan metadata foto dalam satu transaksi. `clientPhotoId` berfungsi
  sebagai idempotency key: retry dengan UUID + recipe yang sama tidak
  menaikkan `shots_used` kedua kali. UUID ini wajib dikirim kamera. Retry juga
  memperbarui `last_reserved_at`, sehingga TTL 30 menit dihitung sebagai lease
  aktivitas, bukan sejak row pertama dibuat.
- **`finalize_photo_upload()`** idempoten dan hanya dipanggil setelah route
  memverifikasi keberadaan, MIME, dan ukuran kedua objek Storage.
  **`cancel_pending_photo()`** menandai tombstone + melepas kuota tepat sekali;
  tombstone tidak langsung dihapus karena signed upload token masih berlaku.
- Reservasi `pending` lebih dari 30 menit dilepas oleh
  **`expire_stale_photo_reservations()`**. Migrasi menjadwalkannya tiap 15 menit
  bila `pg_cron` sudah tersedia; reservasi tamu juga self-heal saat POST baru.
  Cron hanya melepas kuota dan membuat tombstone. Objek baru boleh dihapus
  setelah grace 3 jam (token upload berlaku 2 jam); row tombstone dipertahankan
  agar UUID/path lama tidak dapat dipakai ulang. Route membersihkan batch lama
  saat tamu kembali, sedangkan worker berikut wajib dijadwalkan tiap jam untuk
  tamu yang tidak kembali:

  ```bash
  npm run cleanup:photo-tombstones
  ```

  Worker bukan endpoint publik dan memakai dua env server yang sudah dipakai
  aplikasi: `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`.
  Setelah objek terhapus, recipe/path/dimensi tombstone dikosongkan untuk
  menekan ukuran row, tetapi UUID tetap disimpan. Reservasi baru juga dibatasi
  setelah 30 pembatalan dalam satu jam per guest untuk mencegah churn metadata.
- **`join_event()`** mengunci baris **acara** dengan `FOR UPDATE` dengan alasan
  yang sama, tapi untuk kuota tamu: satu QR dipindai belasan orang sekaligus,
  dan tanpa kunci itu semuanya membaca hitungan yang sama lalu lolos bersama.
  Perangkat yang session id-nya sudah terdaftar dipulihkan tanpa memakan slot
  baru, dan tamu yang dicabut aksesnya tidak lagi dihitung terhadap kuota.
- Yang disimpan di `photos` adalah **path**, bukan URL. Signed URL punya masa
  berlaku, jadi menyimpannya hanya menghasilkan tautan mati.
- **Roll film ada di `photos.preset`, bukan `events.preset`.** Tamu memilih
  sendiri saat memotret dan boleh berganti tiap jepretan. `events.preset` masih
  ada di tabel tapi sudah tidak dibaca maupun ditulis aplikasi — lihat migrasi
  `0004`.
- **`photos.processing_recipe` + `preset_version`** menyimpan snapshot parameter
  grading per foto. Naikkan versi setiap kali LUT atau perilaku renderer berubah.
- **`expires_at`** pada `events` mengatur retensi. Tanpa mekanisme pembersih yang
  menghormati kolom ini, biaya storage naik selamanya tanpa pendapatan berulang.
- **`ensure_pending_event_payment()`** mengunci event dan mengembalikan payment
  pending yang sama pada retry/tab paralel. Harga serta limit disimpan sebagai
  snapshot sebelum order Midtrans dibuat.
- **`apply_midtrans_payment_update()`** mengunci payment + event, menolak
  nominal/tier yang tidak persis sama, mencegah regresi status akibat webhook
  terlambat, dan mengaktifkan draf beserta limitnya dalam satu transaksi. Kedua
  RPC pembayaran hanya dapat dipanggil `service_role`.
- Role `authenticated` tidak lagi dapat melakukan `INSERT` event atau mengubah
  `tier`, `status`, `max_guests`, `shots_per_guest`, dan `expires_at` langsung
  lewat PostgREST. Server Action pembuatan album adalah satu-satunya jalur
  insert, sementara settlement tepercaya adalah satu-satunya jalur aktivasi
  paket berbayar.
