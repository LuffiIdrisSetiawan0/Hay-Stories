/**
 * Membangkitkan gambar uji untuk menilai preset film secara visual.
 *
 *   node scripts/generate-test-chart.mjs
 *
 * Isinya dipilih untuk menyorot hal-hal yang paling mudah salah pada emulasi
 * film: nada kulit, netralitas abu-abu, sorotan terang (halation), dan bayangan
 * dalam (hitam terangkat).
 *
 * Keluaran: public/dev/test-chart.jpg — hanya dipakai halaman uji /dev/film.
 */

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const W = 900
const H = 600
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'dev')

const SKIN_TONES = [
  [255, 224, 196],
  [241, 194, 158],
  [224, 172, 130],
  [198, 134, 96],
  [141, 85, 58],
  [92, 56, 38],
]

const PRIMARIES = [
  [200, 40, 40],
  [40, 160, 70],
  [45, 85, 190],
  [225, 190, 50],
  [150, 60, 170],
  [40, 180, 190],
]

function buildChart() {
  const buf = Buffer.alloc(W * H * 3)
  const put = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const p = (y * W + x) * 3
    buf[p] = Math.max(0, Math.min(255, Math.round(r)))
    buf[p + 1] = Math.max(0, Math.min(255, Math.round(g)))
    buf[p + 2] = Math.max(0, Math.min(255, Math.round(b)))
  }

  // Latar: gradien vertikal gelap ke terang, untuk melihat bentuk kurva nada.
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1)
    const v = 12 + t * 200
    for (let x = 0; x < W; x++) put(x, y, [v, v * 0.98, v * 1.02])
  }

  // Baris 1: nada kulit
  SKIN_TONES.forEach((tone, i) => {
    const x0 = 40 + i * 135
    for (let y = 40; y < 150; y++) for (let x = x0; x < x0 + 115; x++) put(x, y, tone)
  })

  // Baris 2: warna jenuh
  PRIMARIES.forEach((tone, i) => {
    const x0 = 40 + i * 135
    for (let y = 175; y < 285; y++) for (let x = x0; x < x0 + 115; x++) put(x, y, tone)
  })

  // Baris 3: tangga abu-abu netral 0 -> 255
  for (let i = 0; i < 12; i++) {
    const v = Math.round((i / 11) * 255)
    const x0 = 40 + i * 68
    for (let y = 310; y < 390; y++) for (let x = x0; x < x0 + 62; x++) put(x, y, [v, v, v])
  }

  // Sorotan sangat terang di area gelap — inilah pemicu halation.
  for (let y = 420; y < 570; y++) {
    for (let x = 40; x < 420; x++) put(x, y, [10, 10, 14])
  }
  const cx = 160
  const cy = 495
  for (let y = 420; y < 570; y++) {
    for (let x = 40; x < 420; x++) {
      const d = Math.hypot(x - cx, y - cy)
      if (d < 42) put(x, y, [255, 252, 244])
      else if (d < 60) {
        const t = 1 - (d - 42) / 18
        const v = 10 + t * 245
        put(x, y, [v, v * 0.99, v * 0.96])
      }
    }
  }

  // Bayangan sangat dalam — untuk memeriksa hitam terangkat, bukan nol pekat.
  for (let y = 420; y < 570; y++) {
    for (let x = 460; x < 860; x++) {
      const t = (x - 460) / 400
      const v = t * 34
      put(x, y, [v, v, v])
    }
  }

  return buf
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const path = join(OUT_DIR, 'test-chart.jpg')

  await sharp(buildChart(), { raw: { width: W, height: H, channels: 3 } })
    .jpeg({ quality: 95 })
    .toFile(path)

  console.log(`Gambar uji ${W}x${H} -> public/dev/test-chart.jpg`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
