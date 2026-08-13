/**
 * Membangun tekstur LUT preset dari RawTherapee Film Simulation Collection.
 *
 *   node scripts/build-luts.mjs
 *
 * Sumbernya CC BY-SA 4.0 oleh Pat David, Pavlov Dmitry, dan Michael Ezra —
 * dibuat dari stok film sungguhan. Lihat CREDITS.md; atribusinya wajib, dan
 * berkas hasil di public/luts/ mewarisi lisensi yang sama.
 *
 * Kenapa mengunduh, bukan menyimpan berkas sumbernya di repo: satu Hald CLUT
 * berukuran 1–4 MB, dan enam di antaranya akan menambah belasan MB ke setiap
 * kloning hanya untuk data yang tidak pernah dibaca aplikasi. Yang dibaca
 * aplikasi adalah keluaran skrip ini.
 *
 * Arsipnya 402 MB, jadi yang diunduh hanya potongan berkas yang dipakai lewat
 * HTTP range request — sekitar 12 MB, bukan 402 MB.
 */

import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { inflateRawSync } from 'node:zlib'

const ARCHIVE = 'http://rawtherapee.com/shared/HaldCLUT.zip'
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'luts')

/**
 * Sisi kubus LUT keluaran.
 *
 * 32, dan itu hasil pengukuran, bukan tebakan. Terhadap kubus sumber 144³,
 * galat rata-ratanya 0,36 level dari 255 (maksimum 3,9) — sementara 64³ hanya
 * memperbaikinya jadi 0,25 (maksimum 1,7) dengan harga 639 KB per berkas alih-
 * alih 86 KB. Tujuh kali lipat berat unduhan untuk selisih yang tidak bisa
 * dilihat mata; di 4G dalam gedung resepsi, itu pertukaran yang salah.
 *
 * Grain juga bekerja sebagai dither: sisa banding LUT tersamar oleh butiran.
 */
const TARGET = 32

/**
 * Preset produk → berkas sumber.
 *
 * Nama produk sengaja orisinal. Menamai preset dengan merek film asli adalah
 * penggunaan merek dagang terdaftar dan berisiko secara hukum — arsip sumbernya
 * memakai nama itu untuk keperluan informatif, kami tidak.
 */
/*
 * Yang dipakai adalah film KONSUMER, dan sebagian besar varian PUSH ("+", "++").
 *
 * Pilihan pertama saya keliru: Portra, Provia, dan Reala adalah stok potret
 * profesional untuk kamera bagus, dan karakternya memang lembut. Terukur,
 * ketiganya berjarak sembilan level saja satu sama lain pada nada kulit —
 * praktis kembar. Kamera sekali pakai diisi film konsumer murah yang sering
 * di-push, dan itulah sumber kontras serta saturasi yang dicari.
 *
 * Angka pembandingnya (kemiringan kurva nada / saturasi pada kulit sedang):
 *   Portra 400 normal   1,15 / 92
 *   Superia 400 ++      1,24 / 104
 *   Tri-X 400 +         1,32 / --
 *
 * Superia 200 XPRO adalah cross-process: kulit 198,134,96 keluar jadi
 * 82,127,163. Seratus lima puluh dua level dari stok lain — satu-satunya cara
 * memastikan enam roll benar-benar terbedakan sekali lihat.
 *
 * ID-nya sengaja tidak diubah meski stoknya ditukar: foto yang sudah tersimpan
 * menyimpan id preset, dan mengganti kuncinya akan membuat nama roll pada foto
 * lama tidak lagi bisa dicari.
 */
const PRESETS = {
  'golden-hour-400': 'HaldCLUT/Color/Fuji/Fuji Superia 400 4 ++.png',
  'pastel-400': 'HaldCLUT/Color/Fuji/Fuji 400H 2.png',
  'neon-night-1600': 'HaldCLUT/Color/Fuji/Fuji Superia 1600 3 +.png',
  'everyday-100': 'HaldCLUT/Color/Kodak/Kodak Ektar 100.png',
  'sunday-chrome': 'HaldCLUT/Color/Fuji/Fuji Superia 200 XPRO.png',
  'noir-400': 'HaldCLUT/Black-and-White/Kodak/Kodak TRI-X 400 4 +.png',
}

// ---------------------------------------------------------------------------
// Pembacaan arsip zip lewat HTTP range
// ---------------------------------------------------------------------------

async function range(from, to) {
  const res = await fetch(ARCHIVE, { headers: { Range: `bytes=${from}-${to}` } })
  if (!res.ok && res.status !== 206) throw new Error(`Range gagal: HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function archiveSize() {
  const res = await fetch(ARCHIVE, { method: 'HEAD' })
  const len = Number(res.headers.get('content-length'))
  if (!len) throw new Error('Ukuran arsip tidak diketahui; server tidak mengirim content-length.')
  return len
}

/** Baca central directory zip supaya tiap berkas bisa diambil sendiri-sendiri. */
async function readIndex() {
  const size = await archiveSize()

  // EOCD ada di 22 byte terakhir, plus komentar maksimal 65535 byte.
  const tail = await range(Math.max(0, size - 65558), size - 1)
  const eocd = tail.lastIndexOf(Buffer.from('PK\x05\x06', 'binary'))
  if (eocd < 0) throw new Error('End of central directory tidak ditemukan.')

  const cdSize = tail.readUInt32LE(eocd + 12)
  const cdOffset = tail.readUInt32LE(eocd + 16)
  const cd = await range(cdOffset, cdOffset + cdSize - 1)

  const index = new Map()
  let p = 0
  while (p < cd.length - 4 && cd.readUInt32LE(p) === 0x02014b50) {
    const method = cd.readUInt16LE(p + 10)
    const compressed = cd.readUInt32LE(p + 20)
    const nameLen = cd.readUInt16LE(p + 28)
    const extraLen = cd.readUInt16LE(p + 30)
    const commentLen = cd.readUInt16LE(p + 32)
    const localHeader = cd.readUInt32LE(p + 42)
    const name = cd.subarray(p + 46, p + 46 + nameLen).toString('utf8')

    index.set(name, { method, compressed, localHeader })
    p += 46 + nameLen + extraLen + commentLen
  }
  return index
}

async function extract(entry) {
  // Panjang nama dan extra di local header bisa berbeda dari central directory,
  // jadi harus dibaca dari sana, bukan diasumsikan sama.
  const header = await range(entry.localHeader, entry.localHeader + 29)
  const nameLen = header.readUInt16LE(26)
  const extraLen = header.readUInt16LE(28)
  const start = entry.localHeader + 30 + nameLen + extraLen

  const raw = await range(start, start + entry.compressed - 1)
  return entry.method === 8 ? inflateRawSync(raw) : raw
}

// ---------------------------------------------------------------------------
// Konversi Hald CLUT -> strip
// ---------------------------------------------------------------------------

/**
 * Hald CLUT level N disimpan sebagai gambar N³ x N³ yang memuat kubus warna
 * bersisi N². Koleksi ini mencampur level 12 (1728 px, kubus 144³) dan level 16
 * (4096 px, kubus 256³), jadi levelnya diturunkan dari dimensi gambar — bukan
 * diasumsikan.
 */
function haldCubeSide(imageWidth) {
  const level = Math.round(Math.cbrt(imageWidth))
  if (level ** 3 !== imageWidth) {
    throw new Error(`Lebar ${imageWidth} bukan Hald CLUT yang sah (akar pangkat tiganya bukan bulat).`)
  }
  return level * level
}

/**
 * Sampel kubus Hald secara trilinier.
 *
 * Kubus sumber 144³ atau 256³ tidak habis dibagi 64, jadi mengambil tetangga
 * terdekat akan membuang presisi grading yang justru jadi alasan memakai LUT
 * ini. Interpolasi delapan tetangga menjaga transisi warnanya tetap mulus.
 */
function sampleCube(src, side, imageWidth, r, g, b) {
  const at = (ri, gi, bi) => {
    const i = bi * side * side + gi * side + ri
    const p = ((Math.floor(i / imageWidth) * imageWidth) + (i % imageWidth)) * 3
    return [src[p], src[p + 1], src[p + 2]]
  }

  const f = (v) => {
    const x = v * (side - 1)
    const i0 = Math.floor(x)
    return [i0, Math.min(i0 + 1, side - 1), x - i0]
  }

  const [r0, r1, rt] = f(r)
  const [g0, g1, gt] = f(g)
  const [b0, b1, bt] = f(b)

  const out = [0, 0, 0]
  for (let c = 0; c < 3; c++) {
    const lerp = (a, z, t) => a + (z - a) * t
    const c00 = lerp(at(r0, g0, b0)[c], at(r1, g0, b0)[c], rt)
    const c10 = lerp(at(r0, g1, b0)[c], at(r1, g1, b0)[c], rt)
    const c01 = lerp(at(r0, g0, b1)[c], at(r1, g0, b1)[c], rt)
    const c11 = lerp(at(r0, g1, b1)[c], at(r1, g1, b1)[c], rt)
    out[c] = lerp(lerp(c00, c10, gt), lerp(c01, c11, gt), bt)
  }
  return out
}

/**
 * Susun strip horizontal: lebar = size*size, tinggi = size. Potongan ke-i
 * adalah irisan biru; di dalamnya x = merah dan y = hijau. Tata letak ini yang
 * dibaca `sampleLut()` di src/lib/film/shaders.ts.
 */
function buildStrip(src, side, imageWidth, size) {
  const width = size * size
  const out = Buffer.alloc(width * size * 3)
  const max = size - 1

  for (let bi = 0; bi < size; bi++) {
    for (let gi = 0; gi < size; gi++) {
      for (let ri = 0; ri < size; ri++) {
        const [r, g, b] = sampleCube(src, side, imageWidth, ri / max, gi / max, bi / max)
        const p = (gi * width + bi * size + ri) * 3
        out[p] = Math.round(r)
        out[p + 1] = Math.round(g)
        out[p + 2] = Math.round(b)
      }
    }
  }

  return sharp(out, { raw: { width, height: size, channels: 3 } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer()
}

// ---------------------------------------------------------------------------

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  console.log('Membaca daftar isi arsip…')
  const index = await readIndex()

  for (const [id, source] of Object.entries(PRESETS)) {
    const entry = index.get(source)
    if (!entry) throw new Error(`Tidak ada di arsip: ${source}`)

    const png = await extract(entry)
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const side = haldCubeSide(info.width)

    const strip = await buildStrip(data, side, info.width, TARGET)
    await writeFile(join(OUT_DIR, `${id}.png`), strip)

    console.log(
      `${id.padEnd(18)} kubus ${String(side).padStart(3)}³ -> ${TARGET}³   ` +
        `${String(Math.round(strip.length / 1024)).padStart(4)} KB   (${source.split('/').pop()})`
    )
  }

  console.log(`\n${Object.keys(PRESETS).length} LUT dibuat di public/luts/ (strip ${TARGET * TARGET}x${TARGET}).`)
  console.log('Sumber CC BY-SA 4.0 — jangan hapus atribusi di CREDITS.md.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
