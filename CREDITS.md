# Kredit dan lisensi pihak ketiga

## Tabel warna film (`public/luts/`)

Preset film HAY Stories diturunkan dari **RawTherapee Film Simulation
Collection** versi 2015-09-20, dibuat dari stok film sungguhan oleh:

- **Pat David**
- **Pavlov Dmitry**
- **Michael Ezra**

Dilisensikan **[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)**.
Sumber: <http://rawpedia.rawtherapee.com/Film_Simulation>

### Apa artinya untuk proyek ini

Lisensi ini **mengizinkan penggunaan komersial** dan redistribusi, dengan dua
kewajiban yang harus terus dipenuhi:

1. **Atribusi.** Nama ketiga penulis dan lisensinya harus tercantum di tempat
   yang bisa dilihat publik, bukan hanya di berkas ini. Saat ini ditampilkan di
   halaman [`/kredit`](src/app/kredit/page.tsx), yang ditautkan dari footer.
2. **Share-alike.** Berkas hasil di `public/luts/*.png` adalah karya turunan,
   jadi **ikut berlisensi CC BY-SA 4.0**. Siapa pun boleh mengambil dan
   memakainya ulang.

Kewajiban share-alike berhenti di berkas LUT itu. **Kode aplikasi tidak
terpengaruh** — memakai aset berlisensi bukan berarti karya yang memakainya jadi
ikut berlisensi sama, persis seperti memasang foto CC BY-SA di situs komersial.

### Menghasilkan ulang

```bash
node scripts/build-luts.mjs
```

Skrip itu mengunduh potongan yang diperlukan dari arsip resmi lewat HTTP range
request (~12 MB dari arsip 402 MB), mengubah Hald CLUT jadi format strip yang
dibaca shader, lalu menulisnya ke `public/luts/`.

Berkas Hald CLUT sumbernya sengaja **tidak** disimpan di repo: satu berkas 1–4 MB
dan tidak pernah dibaca aplikasi.

### Nama preset

Nama produk kami orisinal dan **tidak** memakai merek film mana pun. Arsip
sumbernya memakai nama merek dagang di nama berkas untuk keperluan informatif;
kami tidak meneruskannya. Pemetaan preset ke berkas sumber ada di
`scripts/build-luts.mjs`, terlihat oleh pengembang, tidak dipajang ke pengguna.
