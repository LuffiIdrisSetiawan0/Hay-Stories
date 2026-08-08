# Database HAY Stories

## Cara menjalankan migrasi

Buka **SQL Editor** di dashboard Supabase, lalu jalankan berkas di `migrations/`
**berurutan sesuai nomor**:

1. `0001_core_schema.sql` — tabel, batasan, indeks, trigger, RLS
2. `0002_storage.sql` — bucket storage dan kebijakan aksesnya

Seluruh migrasi ditulis **idempoten**, jadi aman dijalankan ulang dan aman pada
database yang sudah terlanjur memakai `schema.sql` versi lama.

## Model akses

| Pihak | Cara akses |
|---|---|
| Host (terautentikasi) | Langsung via `anon key` + RLS. Policy hanya mengizinkan baris miliknya. |
| Tamu (anonim) | **Tidak punya akses database sama sekali.** Semuanya lewat route handler `/api/guest/*` yang memakai `SUPABASE_SERVICE_ROLE_KEY`, setelah memverifikasi JWT tamu di cookie httpOnly. |

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
- Yang disimpan di `photos` adalah **path**, bukan URL. Signed URL punya masa
  berlaku, jadi menyimpannya hanya menghasilkan tautan mati.
- **`expires_at`** pada `events` mengatur retensi. Tanpa mekanisme pembersih yang
  menghormati kolom ini, biaya storage naik selamanya tanpa pendapatan berulang.
