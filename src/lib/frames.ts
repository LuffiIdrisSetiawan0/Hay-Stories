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
  /**
   * Rasio lebar:tinggi AREA FOTO saja, tanpa bingkainya. Kosong = ikut rasio
   * asli jepretan.
   *
   * Fotonya dipotong tengah untuk mencapai rasio ini, dan pemotongannya terjadi
   * saat mengunduh — arsip di storage tetap utuh, jadi rasio bisa diubah kapan
   * saja tanpa ada yang hilang permanen.
   */
  ratio?: number
  /** Tepi sebagai fraksi sisi terpendek AREA FOTO. */
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
    hint: 'Border putih 4:5, nama acara di bawah',
    ratio: 4 / 5,
    // Bawah jauh lebih lebar: ada dua baris di sana, nama acara dan waktunya.
    pad: { top: 0.06, right: 0.06, bottom: 0.24, left: 0.06 },
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

/**
 * Bagian sumber yang dipakai setelah dipotong ke rasio bingkai.
 *
 * Potongan diambil dari TENGAH. Untuk bingkai potret di atas jepretan lanskap
 * ini membuang banyak sisi kiri-kanan, jadi viewfinder wajib menampilkan
 * potongannya — kalau tidak, tamu membingkai sesuatu lalu menerima yang lain.
 */
export function cropRect(srcWidth: number, srcHeight: number, ratio?: number) {
  if (!ratio) return { sx: 0, sy: 0, sw: srcWidth, sh: srcHeight }

  const current = srcWidth / srcHeight
  if (current > ratio) {
    const w = Math.round(srcHeight * ratio)
    return { sx: Math.round((srcWidth - w) / 2), sy: 0, sw: w, sh: srcHeight }
  }
  const h = Math.round(srcWidth / ratio)
  return { sx: 0, sy: Math.round((srcHeight - h) / 2), sw: srcWidth, sh: h }
}

/** Ukuran kanvas akhir setelah dipotong dan diberi bingkai. */
export function framedSize(frame: PhotoFrame, width: number, height: number) {
  const { sw, sh } = cropRect(width, height, frame.ratio)
  const unit = Math.min(sw, sh)
  return {
    width: Math.round(sw + unit * (frame.pad.left + frame.pad.right)),
    height: Math.round(sh + unit * (frame.pad.top + frame.pad.bottom)),
    photoWidth: sw,
    photoHeight: sh,
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
  caption?: { title: string; takenAt?: Date | null }
): HTMLCanvasElement {
  const box = framedSize(frame, width, height)
  const crop = cropRect(width, height, frame.ratio)
  const unit = Math.min(box.photoWidth, box.photoHeight)

  const canvas = document.createElement('canvas')
  canvas.width = box.width
  canvas.height = box.height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D tidak tersedia.')

  if (frame.id !== 'none') {
    ctx.fillStyle = frame.background
    ctx.fillRect(0, 0, box.width, box.height)
  }

  // Sembilan argumen: potongan sumber dipetakan ke kotak foto di dalam bingkai.
  ctx.drawImage(
    source,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    box.offsetX,
    box.offsetY,
    box.photoWidth,
    box.photoHeight
  )

  if (frame.sprockets) drawSprockets(ctx, box.width, box.height, unit * frame.pad.top)
  if (frame.caption && caption) {
    drawCaption(ctx, box.width, box.height, unit * frame.pad.bottom, caption)
  }

  return canvas
}

/** Format waktu untuk cap di bingkai. */
export function frameTimestamp(takenAt?: Date | null): string {
  const d = takenAt ?? new Date()
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
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

/**
 * Dua baris di pita bawah: nama acara, lalu waktu jepretan di bawahnya.
 *
 * Ukurannya fraksi dari lebar pita, bukan piksel — bingkai dibuat pada
 * resolusi foto aslinya, yang berbeda-beda per perangkat.
 */
function drawCaption(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  band: number,
  caption: { title: string; takenAt?: Date | null }
) {
  const titleSize = band * 0.34
  const stampSize = band * 0.19

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Dipotong kalau nama acaranya panjang; bingkai tidak boleh melar.
  ctx.font = `600 ${titleSize}px "Courier New", monospace`
  let label = caption.title
  const max = w * 0.86
  while (label.length > 4 && ctx.measureText(label).width > max) {
    label = label.slice(0, -2)
  }
  if (label !== caption.title) label += '…'

  ctx.fillStyle = 'rgba(26, 26, 26, 0.78)'
  ctx.fillText(label, w / 2, h - band * 0.62)

  ctx.font = `${stampSize}px "Courier New", monospace`
  ctx.fillStyle = 'rgba(26, 26, 26, 0.45)'
  ctx.fillText(frameTimestamp(caption.takenAt), w / 2, h - band * 0.28)
}
