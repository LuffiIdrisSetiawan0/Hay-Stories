/**
 * Membangkitkan foto placeholder untuk hero.
 *
 *   node scripts/generate-hero-placeholder.mjs
 *
 * PLACEHOLDER — ganti dengan foto acara asli sebelum rilis. Hero bergaya
 * full-bleed sepenuhnya bergantung pada kekuatan fotonya; gambar buatan ini
 * hanya supaya tata letaknya bisa dinilai.
 *
 * Isinya: bokeh lampu pesta hangat di atas latar gelap — cukup gelap agar
 * judul serif putih tetap terbaca tanpa perlu overlay pekat.
 */

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const W = 2400
const H = 1500
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img')

// PRNG bersemai supaya hasilnya sama setiap kali dijalankan.
let seed = 20260808
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

const BOKEH_TINTS = [
  [255, 196, 128],
  [255, 168, 96],
  [255, 224, 176],
  [236, 150, 90],
  [255, 210, 150],
]

function build() {
  const buf = Buffer.alloc(W * H * 3)

  // Latar: gradien diagonal cokelat gelap, lebih terang di kanan atas
  // seolah ada sumber cahaya di luar bingkai.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = (x / W) * 0.6 + (1 - y / H) * 0.4
      const p = (y * W + x) * 3
      buf[p] = 14 + t * 46
      buf[p + 1] = 11 + t * 30
      buf[p + 2] = 9 + t * 20
    }
  }

  // Bokeh: cakram lembut dengan tepi sedikit lebih terang, seperti lensa asli.
  const add = (cx, cy, r, tint, intensity) => {
    const x0 = Math.max(0, Math.floor(cx - r))
    const x1 = Math.min(W - 1, Math.ceil(cx + r))
    const y0 = Math.max(0, Math.floor(cy - r))
    const y1 = Math.min(H - 1, Math.ceil(cy + r))

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy) / r
        if (d > 1) continue

        // Isi rata dengan cincin tepi — ciri khas bokeh, bukan gradien gaussian.
        const edge = 1 + Math.pow(d, 6) * 0.7
        const falloff = Math.pow(1 - d * d, 1.4) * edge * intensity

        const p = (y * W + x) * 3
        buf[p] = Math.min(255, buf[p] + tint[0] * falloff)
        buf[p + 1] = Math.min(255, buf[p + 1] + tint[1] * falloff)
        buf[p + 2] = Math.min(255, buf[p + 2] + tint[2] * falloff)
      }
    }
  }

  // Lapisan jauh: banyak, kecil, redup.
  for (let i = 0; i < 90; i++) {
    add(
      rand() * W,
      rand() * H * 0.85,
      18 + rand() * 45,
      BOKEH_TINTS[Math.floor(rand() * BOKEH_TINTS.length)],
      0.06 + rand() * 0.1
    )
  }

  // Lapisan dekat: sedikit, besar, lebih terang — condong ke atas bingkai
  // agar bagian bawah tetap gelap untuk teks.
  for (let i = 0; i < 16; i++) {
    add(
      rand() * W,
      rand() * H * 0.55,
      70 + rand() * 150,
      BOKEH_TINTS[Math.floor(rand() * BOKEH_TINTS.length)],
      0.1 + rand() * 0.16
    )
  }

  // Vignette + grain halus supaya tidak terlihat seperti render digital.
  const cx = W / 2
  const cy = H / 2
  const maxD = Math.hypot(cx, cy)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 3
      const v = 1 - 0.45 * Math.pow(Math.hypot(x - cx, y - cy) / maxD, 2.2)
      const n = (rand() - 0.5) * 7
      buf[p] = Math.max(0, Math.min(255, buf[p] * v + n))
      buf[p + 1] = Math.max(0, Math.min(255, buf[p + 1] * v + n))
      buf[p + 2] = Math.max(0, Math.min(255, buf[p + 2] * v + n))
    }
  }

  return buf
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const path = join(OUT_DIR, 'hero-placeholder.jpg')

  await sharp(build(), { raw: { width: W, height: H, channels: 3 } })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path)

  console.log(`Placeholder hero ${W}x${H} -> public/img/hero-placeholder.jpg`)
  console.log('GANTI dengan foto acara asli sebelum rilis.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
