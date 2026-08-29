# Kredit, lisensi, dan provenance LUT

Dokumen ini membedakan aset yang **aktif di produk** dari berkas historis yang
kebetulan masih berada di `public/luts/`. Keberadaan sebuah PNG di folder publik
tidak membuktikan bahwa asal-usul atau hak distribusinya sama dengan PNG lain.

## LUT aktif

Sumber kebenaran daftar aktif adalah `FILM_PRESETS` di
`src/lib/catalog.ts`. Jalankan `npm run audit:luts` untuk membaca daftar tersebut
langsung dari katalog dan memeriksa file, layout kubus, identity LUT, clipping,
neutral cast, serta monotonicity gray ramp.

| ID produk | Berkas | Provenance | Status lisensi |
|---|---|---|---|
| `natural-clean` | `natural-clean.png` | Identity LUT yang dibuat proyek lewat `scripts/create-natural-lut.mjs` | Karya proyek |
| `everyday-100` | `everyday-100.png` | RawTherapee Film Simulation Collection; pemetaan sumber di `scripts/build-luts.mjs` | CC BY-SA 4.0 |
| `golden-hour-400` | `golden-hour-400.png` | RawTherapee Film Simulation Collection; pemetaan sumber di `scripts/build-luts.mjs` | CC BY-SA 4.0 |
| `pastel-400` | `pastel-400.png` | RawTherapee Film Simulation Collection; pemetaan sumber di `scripts/build-luts.mjs` | CC BY-SA 4.0 |
| `neon-night-1600` | `neon-night-1600.png` | RawTherapee Film Simulation Collection; pemetaan sumber di `scripts/build-luts.mjs` | CC BY-SA 4.0 |
| `noir-400` | `noir-400.png` | RawTherapee Film Simulation Collection; pemetaan sumber di `scripts/build-luts.mjs` | CC BY-SA 4.0 |

### Atribusi RawTherapee Film Simulation Collection

Koleksi versi 2015-09-20 dibuat dari stok film sungguhan oleh:

- Pat David
- Pavlov Dmitry
- Michael Ezra

Koleksi dan LUT turunannya dilisensikan
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Sumber proyek:
<http://rawpedia.rawtherapee.com/Film_Simulation>.

Penggunaan komersial diizinkan dengan atribusi dan share-alike. PNG hasil
turunan RawTherapee di repo ini ikut CC BY-SA 4.0; kode aplikasi tidak otomatis
ikut lisensi aset. Atribusi publik ditampilkan di `/kredit` dan tidak boleh
dihapus selama LUT tersebut dipakai.

Nama preset yang ditampilkan HAY Stories adalah nama produk, bukan pernyataan
afiliasi atau dukungan dari produsen film. Nama sumber asli hanya dicatat di
script build untuk audit provenance.

## Berkas historis dan statusnya

Bagian ini penting: klaim CC BY-SA di atas **tidak berlaku otomatis** untuk
seluruh isi `public/luts/`.

### Turunan RawTherapee yang sedang tidak aktif

`scripts/build-all-luts.mjs` memetakan aset berikut ke koleksi RawTherapee yang
sama: `sunday-chrome`, `agfa-vista-200`, `fuji-superia-400`, `fuji-velvia-50`,
`kodak-ektachrome-100`, `kodachrome-64`, dan `ilford-hp5-400`. Aset tersebut
tidak ditawarkan oleh `FILM_PRESETS` saat dokumen ini diperbarui, tetapi tetap
memerlukan atribusi CC BY-SA bila didistribusikan.

### Legacy XMP dengan bukti lisensi belum ada

`film-35mm.png`, `film-fuji.png`, `film-kodak.png`, dan `film-polaroid.png`
dibuat oleh `scripts/convert-xmp-to-luts.mjs` dari berkas di
`Disposable_Presets_LR/`. Repo ini tidak memuat `LICENSE`, bukti pembelian,
izin redistribusi, URL sumber, atau identitas pembuat yang dapat diverifikasi
untuk paket tersebut.

Keempatnya hanya dipertahankan sebagai kompatibilitas foto lama dan
tidak ditawarkan untuk jepretan baru. Namun karena file masih berada di folder
publik, distribusinya tetap perlu dianggap **belum terselesaikan secara
lisensi**. Sebelum produksi komersial, pilih salah satu:

1. arsipkan bukti lisensi/izin redistribusi beserta asal dan versinya; atau
2. migrasikan foto legacy ke LUT yang provenance-nya jelas, lalu hapus aset dan
   sumber XMP tersebut dari artefak deploy.

Jangan melabeli empat PNG ini sebagai CC BY-SA tanpa bukti terpisah.

### PNG disposable tanpa rantai build

`disposable-90s-compact.png`, `disposable-beach-washed.png`,
`disposable-expired-film.png`, `disposable-party-flash.png`, dan
`disposable-quicksnap.png` tidak memiliki pemetaan sumber atau generator di
repo saat ini. Semuanya tidak aktif. Jangan mengaktifkan atau mengklaim
lisensinya sebelum sumber, pembuat, versi, dan izin penggunaan dicatat.

## Reproduksi dan audit

```bash
# Lima LUT film aktif dari koleksi RawTherapee
node scripts/build-luts.mjs

# Identity LUT milik proyek
node scripts/create-natural-lut.mjs

# Audit semua LUT yang aktif menurut katalog
npm run audit:luts
```

`build-luts.mjs` mengambil bagian arsip upstream lewat HTTP range request. URL
tersebut belum content-addressed dan script belum memverifikasi checksum arsip;
karena itu hasil committed harus ditinjau dengan audit di atas dan perubahan
PNG tidak boleh diterima sebagai update dependency biasa tanpa mencatat hash
sumber.

Setiap perubahan pada file LUT aktif atau parameter grading wajib disertai
kenaikan `PROCESSING_RECIPE_VERSION` di route guest-shot. Versi dan snapshot
parameter itu disimpan per foto supaya hasil lama tidak diam-diam dianggap
dibuat dengan recipe baru.

## Foto

Seluruh foto contoh di `public/img/` berasal dari Unsplash dan memakai lisensi
Unsplash gratis (`images.unsplash.com`), yang mengizinkan pemakaian komersial
tanpa kewajiban atribusi. Foto Unsplash+ berbayar
(`plus.unsplash.com/premium_photo-*`) tidak dipakai dan tidak boleh ditambahkan
lewat script ini — lisensinya berbeda.

Tabel ini tetap dibuat karena satu alasan: **nama berkas bukan bukti isi.**
Versi sebelumnya memakai penomoran `01-pelaminan` sampai `06-konfeti`, dan
penomoran itu menyembunyikan dua kesalahan selama berbulan-bulan —
`02-meja-dekorasi` sebenarnya berisi atlet melempar bubuk kapur, dan
`06-konfeti` ternyata berkas yang sama persis dengan latar hero. Sejak itu nama
berkasnya menggambarkan isi, dan setiap berkas dibuka dulu sebelum dipasang.

Semua master 2400x1600 (3:2), dibuat ulang oleh
`scripts/download-and-process-scenes.mjs`. Rasio 3:2 dipilih supaya satu berkas
bisa melayani kotak 16:9 di landing page maupun 4:5 potret di halaman acara
tanpa diperbesar. Pemetaan berkas ke pemakaian, teks alt, dan titik fokus
pemangkasan ada di `src/lib/scenes.ts`.

| Berkas | ID sumber Unsplash | Isi sebenarnya |
|---|---|---|
| `img/hero/pasangan-bukit.webp` | `photo-1532712938310-34cb3982ef74` | pengantin berjalan di bukit saat matahari terbenam, potongan lanskap 2400x1120 |
| `img/scenes/tamu-memotret.webp` | `photo-1518757535402-49f315ea55f6` | tangan tamu memotret rombongan pengiring pengantin dengan ponsel |
| `img/scenes/pernikahan-buket.webp` | `photo-1504993945773-3f38e1b6a626` | pengantin melempar buket ke arah para tamu di halaman, siang hari |
| `img/scenes/ulang-tahun-taman.webp` | `photo-1758275557513-241a2a229936` | sekelompok teman bertopi pesta mengelilingi kue ulang tahun di taman |
| `img/scenes/acara-kantor.webp` | `photo-1565125175292-f3177f64c794` | rekan kerja bersulang sambil tertawa di ruang santai kantor |
| `img/scenes/pesta-malam.webp` | `photo-1516450360452-9312f5e86fc7` | kerumunan mengangkat tangan di bawah lampu panggung dan laser |
| `img/scenes/meja-dekorasi.webp` | `photo-1763553113332-800519753e40` | meja resepsi berhias rangkaian bunga di ruangan bercahaya hangat |

Berkas yang dibuang pada pembaruan ini: keenam varian `.jpg` (~6 MB, tidak
pernah dirujuk kode mana pun), salinan `${name}.webp` yang ditulis dua kali oleh
script lama, dan seluruh `public/img/theme/` — ketiga berkas di sana isinya
tidak sesuai nama dan tidak pernah dirender.

Sebelum memasang foto dari folder ini, buka dulu berkasnya. Jangan mengandalkan
namanya.
