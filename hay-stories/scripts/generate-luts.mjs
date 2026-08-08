/**
 * Membangkitkan tekstur LUT 3D untuk setiap preset film ke public/luts/.
 *
 *   node scripts/generate-luts.mjs
 *
 * Format keluaran: strip horizontal 1024x32 px (32 potongan biru, masing-masing
 * 32x32 merah x hijau). Ini tata letak yang dibaca `sampleLut()` di
 * src/lib/film/shaders.ts. Satu berkas ~10-25 KB, jadi murah untuk dimuat di HP.
 *
 * Estetika film ada di objek GRADES di bawah. Semua angkanya sengaja terbuka
 * untuk di-tune — ubah, jalankan ulang script, muat ulang halaman.
 */

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SIZE = 32
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'luts')

// ---------------------------------------------------------------------------
// Blok penyusun grading
// ---------------------------------------------------------------------------

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a, b, t) => a + (b - a) * t
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b

/**
 * Kurva-S terbatas di sekitar pivot. amount 1 = tanpa perubahan.
 *
 * Memakai kurva pangkat di kedua sisi pivot, bukan penskalaan linier, sehingga
 * [0,1] selalu terpetakan ke [0,1]. Versi linier (`pivot + (v-pivot)*amount`)
 * mendorong nilai gelap ke NEGATIF, lalu ter-clamp ke nol — yang mematikan
 * `toe()` dan menghasilkan hitam digital pekat.
 */
function contrast(v, amount, pivot = 0.45) {
  v = clamp01(v)
  if (amount === 1) return v
  if (v < pivot) return pivot * Math.pow(v / pivot, amount)
  return 1 - (1 - pivot) * Math.pow((1 - v) / (1 - pivot), amount)
}

/** Bahu filmik: menahan sorotan agar tidak "terbakar" datar seperti digital. */
function shoulder(v, strength) {
  if (strength <= 0) return v
  return v / (1 + strength * Math.max(0, v - 0.7))
}

/**
 * Kaki film: hitam tidak pernah benar-benar nol pada film negatif.
 *
 * WAJIB dipanggil SESUDAH contrast(). Kalau dipanggil sebelumnya, pivot kontras
 * mendorong nilai terangkat itu kembali ke bawah nol dan hitam ter-clamp ke 0
 * mutlak — persis tampilan digital yang sedang kita hindari.
 */
function toe(v, lift) {
  return lift + v * (1 - lift)
}

/**
 * Split toning: warnai bayangan dan sorotan secara terpisah.
 * shadow/highlight adalah triplet RGB offset kecil.
 */
function splitTone([r, g, b], shadow, highlight) {
  const l = luma(r, g, b)
  const sw = Math.pow(1 - l, 2) // bobot bayangan
  const hw = Math.pow(l, 2) // bobot sorotan
  return [
    r + shadow[0] * sw + highlight[0] * hw,
    g + shadow[1] * sw + highlight[1] * hw,
    b + shadow[2] * sw + highlight[2] * hw,
  ]
}

function saturate([r, g, b], amount) {
  const l = luma(r, g, b)
  return [lerp(l, r, amount), lerp(l, g, amount), lerp(l, b, amount)]
}

/**
 * Crosstalk antar-lapisan emulsi — inilah yang membuat warna film terasa
 * "menyatu" dan bukan tiga kanal yang saling lepas seperti sensor digital.
 */
function crosstalk([r, g, b], amount) {
  if (amount <= 0) return [r, g, b]
  const m = amount
  return [
    r * (1 - m) + (g * 0.6 + b * 0.4) * m,
    g * (1 - m) + (r * 0.5 + b * 0.5) * m,
    b * (1 - m) + (r * 0.35 + g * 0.65) * m,
  ]
}

// ---------------------------------------------------------------------------
// Definisi preset
//
// Setiap fungsi menerima [r,g,b] dalam 0..1 dan mengembalikan [r,g,b] 0..1.
// Kuncinya harus sama persis dengan PresetId di src/lib/catalog.ts.
// ---------------------------------------------------------------------------

const GRADES = {
  // Hangat, kontras lembut, kulit kemerahan alami. Preset serba-guna untuk
  // pernikahan dan potret dalam ruang.
  'golden-hour-400': (r, g, b) => {
    let c = [r * 1.055, g * 1.005, b * 0.945]
    c = c.map((v) => contrast(v, 1.1, 0.46))
    c = c.map((v) => toe(v, 0.028))
    c = splitTone(c, [0.018, 0.008, -0.004], [0.014, 0.006, -0.012])
    c = crosstalk(c, 0.05)
    c = saturate(c, 1.06)
    return c.map((v) => shoulder(v, 0.35))
  },

  // Slide film: warna jenuh, kontras tinggi, hitam pekat. Untuk cahaya
  // matahari langsung dan pemandangan berwarna kuat.
  'sunday-chrome': (r, g, b) => {
    let c = [r * 1.02, g * 1.0, b * 1.03]
    c = c.map((v) => contrast(v, 1.32, 0.47))
    c = splitTone(c, [-0.012, -0.004, 0.026], [0.01, 0.004, -0.008])
    c = saturate(c, 1.34)
    c = crosstalk(c, 0.03)
    return c.map((v) => shoulder(v, 0.55))
  },

  // Hitam putih dengan bobot ala filter merah: langit menggelap, kulit cerah.
  'noir-400': (r, g, b) => {
    const l = 0.34 * r + 0.5 * g + 0.16 * b
    let v = contrast(l, 1.38, 0.44)
    v = toe(v, 0.042)
    v = shoulder(v, 0.4)
    // Jejak toning sepia yang sangat tipis agar tidak terasa monoton digital.
    return [v * 1.012, v, v * 0.988]
  },

  // Tungsten: dibuat untuk lampu buatan. Bayangan biru dingin, sorotan
  // kemerahan, hitam terangkat seperti film sinema.
  'neon-night-800': (r, g, b) => {
    let c = [r * 1.03, g * 0.99, b * 1.06]
    c = c.map((v) => contrast(v, 1.14, 0.42))
    c = c.map((v) => toe(v, 0.06))
    c = splitTone(c, [-0.02, -0.006, 0.05], [0.045, 0.004, -0.018])
    c = crosstalk(c, 0.08)
    c = saturate(c, 1.16)
    return c.map((v) => shoulder(v, 0.28))
  },

  // Netral sedikit hangat. Pilihan aman kalau host tidak yakin.
  'everyday-200': (r, g, b) => {
    let c = [r * 1.022, g * 1.002, b * 0.985]
    c = c.map((v) => contrast(v, 1.07, 0.46))
    c = c.map((v) => toe(v, 0.016))
    c = splitTone(c, [0.008, 0.004, 0.0], [0.006, 0.004, -0.004])
    c = saturate(c, 1.04)
    return c.map((v) => shoulder(v, 0.3))
  },

  // Jernih, kontras sedang, biru dalam. Untuk acara luar ruang siang hari.
  'bright-sun-100': (r, g, b) => {
    let c = [r * 0.995, g * 1.005, b * 1.025]
    c = c.map((v) => contrast(v, 1.16, 0.47))
    c = c.map((v) => toe(v, 0.01))
    c = splitTone(c, [-0.008, 0.0, 0.02], [0.008, 0.006, -0.006])
    c = saturate(c, 1.1)
    return c.map((v) => shoulder(v, 0.45))
  },
}

// ---------------------------------------------------------------------------
// Perakitan strip
// ---------------------------------------------------------------------------

function buildStrip(grade) {
  const width = SIZE * SIZE
  const height = SIZE
  const buf = Buffer.alloc(width * height * 3)
  const max = SIZE - 1

  for (let bi = 0; bi < SIZE; bi++) {
    for (let gi = 0; gi < SIZE; gi++) {
      for (let ri = 0; ri < SIZE; ri++) {
        const [outR, outG, outB] = grade(ri / max, gi / max, bi / max)
        const px = (gi * width + bi * SIZE + ri) * 3
        buf[px] = Math.round(clamp01(outR) * 255)
        buf[px + 1] = Math.round(clamp01(outG) * 255)
        buf[px + 2] = Math.round(clamp01(outB) * 255)
      }
    }
  }

  return sharp(buf, { raw: { width, height, channels: 3 } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer()
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  for (const [id, grade] of Object.entries(GRADES)) {
    const png = await buildStrip(grade)
    const path = join(OUT_DIR, `${id}.png`)
    await sharp(png).toFile(path)
    console.log(`${id.padEnd(18)} ${String(png.length).padStart(6)} bytes  ->  public/luts/${id}.png`)
  }

  console.log(`\n${Object.keys(GRADES).length} LUT dibuat (${SIZE}^3, strip ${SIZE * SIZE}x${SIZE}).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
