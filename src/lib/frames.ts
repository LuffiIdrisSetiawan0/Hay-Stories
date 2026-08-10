/**
 * Bingkai foto.
 *
 * Geometrinya data, bukan CSS dan bukan kode canvas. Bingkai muncul di tiga
 * tempat — viewfinder, galeri, dan berkas yang diunduh — dan kalau masing-masing
 * menghitung tepinya sendiri, ketiganya pasti menyimpang cepat atau lambat.
 * Semua membaca angka di bawah ini.
 *
 * Semua ukuran adalah FRAKSI dari sisi terpendek foto, bukan piksel. Foto tamu
 * datang dari perangkat mana saja dengan resolusi apa saja; tepi setebal 40 px
 * yang pas di 720p jadi garis rambut di 4K.
 */

export type FrameId = 'none' | 'print' | 'film'

export interface PhotoFrame {
  id: FrameId
  name: string
  /** Penjelasan singkat untuk tombol di kamera. */
  hint: string
  /** Tepi sebagai fraksi sisi terpendek foto. */
  pad: { top: number; right: number; bottom: number; left: number }
  /** Warna bidang bingkai. */
  background: string
  /** Cetak nama acara di ruang bawah. */
  caption: boolean
  /** Gambar lubang sprocket 35 mm di tepi atas dan bawah. */
  sprockets: boolean
}

export const PHOTO_FRAMES: readonly PhotoFrame[] = [
  {
    id: 'none',
    name: 'Tanpa bingkai',
    hint: 'Foto polos',
    pad: { top: 0, right: 0, bottom: 0, left: 0 },
    background: 'transparent',
    caption: false,
    sprockets: false,
  },
  {
    id: 'print',
    name: 'Cetak',
    hint: 'Border putih, nama acara di bawah',
    // Bawah lebih lebar: itu ruang untuk nama acara, seperti cetakan 4R.
    pad: { top: 0.05, right: 0.05, bottom: 0.16, left: 0.05 },
    background: '#f7f4ee',
    caption: true,
    sprockets: false,
  },
  {
    id: 'film',
    name: 'Film',
    hint: 'Tepi bersprocket 35 mm',
    // Kiri-kanan nol: pada film 35 mm sprocket hanya ada di atas dan bawah.
    pad: { top: 0.09, right: 0, bottom: 0.09, left: 0 },
    background: '#141210',
    caption: false,
    sprockets: true,
  },
] as const

export const DEFAULT_FRAME: FrameId = 'none'

export function getFrame(id: string): PhotoFrame | undefined {
  return PHOTO_FRAMES.find((f) => f.id === id)
}

/** Ukuran kanvas akhir setelah bingkai ditambahkan. */
export function framedSize(frame: PhotoFrame, width: number, height: number) {
  const unit = Math.min(width, height)
  return {
    width: Math.round(width + unit * (frame.pad.left + frame.pad.right)),
    height: Math.round(height + unit * (frame.pad.top + frame.pad.bottom)),
    offsetX: Math.round(unit * frame.pad.left),
    offsetY: Math.round(unit * frame.pad.top),
  }
}

/**
 * Gambar foto berbingkai ke sebuah canvas dan kembalikan canvas-nya.
 *
 * Dipakai saat mengunduh. Arsip di storage tetap polos — bingkai tidak pernah
 * ikut tersimpan, jadi gayanya bisa diganti kapan saja tanpa menyentuh satu
 * berkas pun yang sudah ada.
 */
export function drawFramed(
  source: CanvasImageSource,
  width: number,
  height: number,
  frame: PhotoFrame,
  caption?: string
): HTMLCanvasElement {
  const { width: w, height: h, offsetX, offsetY } = framedSize(frame, width, height)
  const unit = Math.min(width, height)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D tidak tersedia.')

  if (frame.id !== 'none') {
    ctx.fillStyle = frame.background
    ctx.fillRect(0, 0, w, h)
  }

  ctx.drawImage(source, offsetX, offsetY, width, height)

  if (frame.sprockets) drawSprockets(ctx, w, h, unit * frame.pad.top)
  if (frame.caption && caption) drawCaption(ctx, w, h, unit * frame.pad.bottom, caption)

  return canvas
}

/**
 * Deretan lubang sprocket di pita atas dan bawah.
 *
 * Proporsinya mengikuti film 35 mm sungguhan: lubangnya lebih lebar daripada
 * tinggi, dan jaraknya kira-kira dua kali lebarnya.
 */
function drawSprockets(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  band: number
) {
  const holeH = band * 0.42
  const holeW = holeH * 1.35
  const gap = holeW * 1.1
  const radius = holeH * 0.22
  const step = holeW + gap

  // Dimulai dari sisa bagi supaya deretannya simetris kiri-kanan.
  const start = ((w % step) + step / 2) % step - holeW / 2

  ctx.fillStyle = '#f7f4ee'
  for (const cy of [band / 2, h - band / 2]) {
    for (let x = start; x < w; x += step) {
      roundRect(ctx, x, cy - holeH / 2, holeW, holeH, radius)
      ctx.fill()
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  band: number,
  text: string
) {
  const size = band * 0.28
  ctx.fillStyle = 'rgba(26, 26, 26, 0.62)'
  ctx.font = `${size}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Dipotong kalau nama acaranya panjang; bingkai tidak boleh melar.
  let label = text
  const max = w * 0.86
  while (label.length > 4 && ctx.measureText(label).width > max) {
    label = label.slice(0, -2)
  }
  if (label !== text) label += '…'

  ctx.fillText(label, w / 2, h - band * 0.52)
}
