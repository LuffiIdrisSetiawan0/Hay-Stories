# HAY Stories

Kamera sekali pakai digital untuk acara. Host membuat album, tamu memindai satu
QR code lalu memotret langsung dari browser dengan preset film pilihan host, dan
semua foto tetap tersembunyi sampai acara usai — lalu terungkap bersamaan.

Produksi: **https://hay-stories.vercel.app**

## Menjalankan secara lokal

```bash
npm install
cp .env.local.example .env.local   # lalu isi nilainya
npm run dev
```

Buka http://localhost:3000.

## Menyiapkan database

Jalankan berkas di `supabase/migrations/` **berurutan** lewat SQL Editor di
dashboard Supabase. Semuanya idempoten, aman dijalankan ulang. Rinciannya ada di
[`supabase/README.md`](supabase/README.md).

## Variabel lingkungan

| Variabel | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ya | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ya | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ya | **Rahasia.** Hanya untuk route handler jalur tamu anonim |
| `GUEST_TOKEN_SECRET` | ya | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | ya | URL publik aplikasi |
| `MIDTRANS_SERVER_KEY` | belum | Pembayaran, dipakai pasca-MVP |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | belum | Pembayaran, dipakai pasca-MVP |

## Mesin film

Estetika film dibangun sendiri, bukan memakai API pihak ketiga — inilah
diferensiasi produknya, dan layanan transformasi gambar akan jauh lebih mahal
daripada harga jual paketnya pada volume foto satu acara.

```bash
node scripts/generate-luts.mjs          # bangkitkan ulang tekstur LUT preset
node scripts/generate-test-chart.mjs    # gambar uji untuk menilai grading
node scripts/generate-hero-placeholder.mjs
```

Buka `/dev/film` saat `next dev` untuk melihat keenam preset dirender melalui
pipeline WebGL yang sama dengan kamera tamu. Halaman ini 404 di produksi.

Grading tiap preset ada di objek `GRADES` dalam `scripts/generate-luts.mjs` dan
sengaja terbuka untuk di-tune: ubah angkanya, jalankan ulang script, muat ulang
halaman.

## Struktur

| Path | Isi |
|---|---|
| `src/lib/film/` | Shader, renderer, pipeline capture |
| `src/lib/catalog.ts` | Sumber tunggal tier harga, preset, jenis acara |
| `src/lib/supabase/` | Klien browser, server, dan service role |
| `src/components/ui/` | Primitif seksi: `Section`, `Reveal`, `SectionHeading` |
| `src/proxy.ts` | Proteksi rute (konvensi Next.js 16, bukan `middleware.ts`) |
| `supabase/migrations/` | Skema, RLS, bucket storage |

## Catatan

- **Preset film memakai nama orisinal.** Menamai preset dengan merek film asli
  (Kodak, Fujifilm, CineStill, Ilford) adalah penggunaan merek dagang terdaftar
  dan berisiko secara hukum.
- **Tamu anonim tidak punya akses database sama sekali.** Semua jalurnya melalui
  route handler sisi server yang memverifikasi JWT tamu di cookie httpOnly.
  Bucket `photos` privat dan sengaja tanpa policy apa pun.
- **Foto hero dan showcase masih placeholder** yang dibangkitkan script. Ganti
  dengan foto acara asli sebelum rilis ke klien.
- **Testimoni di landing masih contoh.** Ganti dengan testimoni asli atau hapus
  seksinya sebelum dipromosikan.
