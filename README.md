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
| `NEXT_PUBLIC_SUPPORT_EMAIL` | untuk checkout berbayar | Alamat dukungan valid dan dimonitor; tidak ditampilkan bila kosong/tidak valid |
| `NEXT_PUBLIC_LEGAL_OPERATOR_NAME` | untuk pembayaran live | Nama operator layanan yang benar-benar bertanggung jawab |
| `NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS` | untuk pembayaran live | Alamat operator yang dapat dicantumkan pada dokumen legal |
| `MIDTRANS_SERVER_KEY` | untuk paket berbayar | **Rahasia.** Server Key Snap sesuai environment Midtrans |
| `MIDTRANS_IS_PRODUCTION` | ya | `false` = sandbox. Transaksi riil hanya aktif bila nilainya persis `true` |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | tidak | Tidak dipakai oleh Snap Redirect hosted; disisakan untuk kompatibilitas |

## Pembayaran Midtrans

Paket Party, Pesta, dan Skala Besar menggunakan **Snap Redirect**: halaman metode
pembayaran sepenuhnya di-host Midtrans. Album berbayar dibuat sebagai `draft`
dan tidak menerima tamu sampai status yang tepercaya mengaktifkannya.

1. Jalankan migrasi `0008_paid_checkout.sql`.
2. Isi `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION`, dan
   `NEXT_PUBLIC_APP_URL`. Production mewajibkan URL HTTPS.
3. Isi `NEXT_PUBLIC_SUPPORT_EMAIL` dengan kanal yang dimonitor sebelum menguji
   checkout. Sebelum menerima pembayaran live, isi juga
   `NEXT_PUBLIC_LEGAL_OPERATOR_NAME` dan `NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS`
   dengan identitas operator yang sebenarnya.
4. Di Dashboard Midtrans untuk environment yang sama, atur **Payment
   Notification URL** ke:

   ```text
   https://domain-anda.example/api/payments/midtrans
   ```

5. Gunakan `MIDTRANS_IS_PRODUCTION=false` dan credential sandbox selama uji.
   Ubah ke `true` hanya setelah Server Key production, URL HTTPS, metode bayar,
   dan webhook production sudah diverifikasi.

Webhook memverifikasi `signature_key` SHA-512 lalu mengambil status otoritatif
melalui GET Status API; nominal, order, dan tier diperiksa lagi. Hanya
`settlement`, atau `capture` dengan `fraud_status=accept`, yang mengaktifkan
album. Redirect browser tidak pernah dianggap bukti pembayaran. Tombol
**Periksa status** memakai API yang sama sebagai pemulihan bila webhook
terlambat. Replay notifikasi aman/idempoten; limit paket disalin dari snapshot
payment dalam transaksi database yang sama dengan aktivasi.

Refund, partial refund, dan chargeback dicatat pada payment tetapi **tidak
otomatis menonaktifkan album** yang sedang dipakai; keputusan akses dan
pengembalian dana tetap perlu direkonsiliasi pengelola.

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
node scripts/generate-hero-scenes.mjs   # bangun ulang aset sumber adegan lama
node scripts/generate-brand-assets.mjs  # bangun favicon, ikon aplikasi, dan OG image
```

Landing memakai enam aset `-v2.webp` teroptimasi di `public/img/scenes/`: tiga
visual fotorealistik orisinal yang dibuat khusus melalui image generation dan
tiga aset adegan WebP teroptimasi. Tidak ada foto stok pihak lain yang diklaim
sebagai dokumentasi pelanggan; pemetaannya dapat dilihat di `SCENES` dalam
`src/components/landing/Hero.tsx`.

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
- **Visual hero dan showcase bukan dokumentasi pelanggan.** Tiga visual
  fotorealistik dibuat khusus melalui image generation dan aset lainnya sudah
  dioptimasi ke WebP; jangan mempresentasikannya sebagai hasil acara pelanggan.
