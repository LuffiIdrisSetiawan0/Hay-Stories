# Database HAY Stories

## Cara menjalankan migrasi

Buka **SQL Editor** di dashboard Supabase, lalu jalankan berkas di `migrations/`
**berurutan sesuai nomor**:

1. `0001_core_schema.sql` — tabel, batasan, indeks, trigger, RLS
2. `0002_storage.sql` — bucket storage dan kebijakan aksesnya
3. `0003_guest_join.sql` — fungsi `join_event()` untuk pendaftaran tamu
4. `0004_preset_per_photo.sql` — menandai `events.preset` tidak lagi dipakai
5. `0005_photo_frame.sql` — kolom `photos.frame` untuk bingkai pilihan tamu

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
- **`claim_shot()`** mengunci baris tamu dengan `FOR UPDATE`, sehingga permintaan
  unggah bersamaan tidak bisa menembus kuota jepretan. Selalu klaim **sebelum**
  menerbitkan signed upload URL, dan panggil `release_shot()` bila unggahan gagal.
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
- **`expires_at`** pada `events` mengatur retensi. Tanpa mekanisme pembersih yang
  menghormati kolom ini, biaya storage naik selamanya tanpa pendapatan berulang.
