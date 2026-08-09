# HAY Stories

Kamera sekali pakai digital untuk acara. Host membuat album, tamu memindai satu
QR code lalu memotret langsung dari browser dengan roll film pilihan mereka
sendiri, dan semua foto tetap tersembunyi sampai acara usai — lalu terungkap
bersamaan.

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

Filter dijalankan **di perangkat tamu** lewat WebGL, bukan lewat API pihak
ketiga. Bukan terutama soal biaya: tidak ada layanan transformasi gambar yang
bisa memberi viewfinder terfilter secara live, dan tanpa itu tamu membidik
dengan pratinjau polos lalu filternya menempel setelah unggah — yang membunuh
inti produknya. Biayanya juga tidak masuk: satu acara tier Pesta berisi 5.400
foto.

Tabel warnanya diturunkan dari stok film sungguhan (RawTherapee Film Simulation
Collection, CC BY-SA 4.0). Atribusinya **wajib** — lihat
[`CREDITS.md`](CREDITS.md) dan halaman `/kredit`.

```bash
node scripts/build-luts.mjs             # bangun ulang tekstur LUT preset
node scripts/generate-test-chart.mjs    # gambar uji untuk menilai grading
node scripts/generate-hero-placeholder.mjs
```

Buka `/dev/film` saat `next dev` untuk melihat keenam preset dirender melalui
pipeline WebGL yang sama dengan kamera tamu. Halaman ini 404 di produksi.

Pemetaan preset ke stok film sumbernya ada di `PRESETS` dalam
`scripts/build-luts.mjs`. Skrip itu mengunduh potongan yang diperlukan dari
arsip resmi lewat HTTP range request (~12 MB dari arsip 402 MB), jadi berkas
sumbernya tidak perlu disimpan di repo.

Kekuatan grain, vignette, dan halation tiap preset disetel terpisah di
`FILM_PRESETS` (`src/lib/catalog.ts`) — itu efek shader, bukan bagian dari LUT.

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
