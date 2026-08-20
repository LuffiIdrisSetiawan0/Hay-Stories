import { FilmRenderer, canvasToBlob } from './renderer'
import type { FilmPreset } from '@/lib/catalog'

/**
 * Sisi terpanjang maksimum untuk foto tersimpan.
 */
const MAX_LONG_EDGE = 4096

/** Sisi terpanjang thumbnail galeri. Galeri TIDAK BOLEH memuat foto penuh. */
const THUMB_LONG_EDGE = 480

const FULL_QUALITY = 0.94
const THUMB_QUALITY = 0.82

export interface ProcessedCapture {
  full: Blob
  thumb: Blob
  width: number
  height: number
}

export interface CapturedFrame {
  bitmap: ImageBitmap
  /** `photo` berarti still sensor; `video` adalah fallback frame stream. */
  source: 'photo' | 'video'
}

export interface CaptureProcessOptions {
  mirror?: boolean
  smooth?: number
  exposure?: number
  sharpen?: number
  grainSeed?: number
}

/**
 * Ukuran akhir foto tersimpan untuk sumber sebesar ini.
 */
export function captureSize(
  sourceWidth: number,
  sourceHeight: number,
  deviceLimit = MAX_LONG_EDGE
) {
  return fitWithin(sourceWidth, sourceHeight, Math.min(MAX_LONG_EDGE, deviceLimit))
}

export async function processCapture(
  renderer: FilmRenderer,
  source: ImageBitmap,
  preset: FilmPreset,
  options: CaptureProcessOptions = {}
): Promise<ProcessedCapture> {
  const deviceLimit = renderer.getMaxRenderSize()
  const { width, height } = captureSize(source.width, source.height, deviceLimit)
  const grainSeed = options.grainSeed ?? Math.random() * 1000
  let renderSource = source

  // Sensor modern dapat menghasilkan still 48 MP, sementara banyak GPU mobile
  // hanya menerima tekstur 4096 px. Kecilkan sebelum upload texture, bukan cuma
  // ukuran renderbuffer akhirnya.
  if (source.width > deviceLimit || source.height > deviceLimit) {
    renderSource = await createImageBitmap(source, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: 'high',
    })
  }

  try {
    await renderer.loadPreset(preset)

    const thumbSize = fitWithin(width, height, THUMB_LONG_EDGE)
    const { full, thumb } = await renderer.renderToJpegs(renderSource, preset, width, height, {
      mirror: options.mirror,
      intensity: preset.strength,
      lumaLock: preset.lumaLock,
      contrast: preset.contrast,
      smooth: options.smooth,
      exposure: options.exposure,
      sharpen: options.sharpen,
      grainSeed,
      quality: FULL_QUALITY,
      thumbnail: {
        width: thumbSize.width,
        height: thumbSize.height,
        quality: THUMB_QUALITY,
      },
    })

    return { full, thumb, width, height }
  } finally {
    if (renderSource !== source) renderSource.close()
  }
}

/**
 * Jalur kompatibilitas bila WebGL2 tidak tersedia. Foto tetap disimpan pada
 * resolusi tinggi, tetapi tanpa LUT; server mencatatnya sebagai Natural.
 */
export async function processNaturalCapture(
  source: ImageBitmap,
  options: CaptureProcessOptions = {}
): Promise<ProcessedCapture> {
  const { width, height } = captureSize(source.width, source.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Pemrosesan foto tidak tersedia di perangkat ini.')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.save()
  if (options.mirror) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }
  if (options.exposure) ctx.filter = `brightness(${2 ** options.exposure})`
  ctx.drawImage(source, 0, 0, width, height)
  ctx.restore()

  const thumbSize = fitWithin(width, height, THUMB_LONG_EDGE)
  const thumbCanvas = document.createElement('canvas')
  thumbCanvas.width = thumbSize.width
  thumbCanvas.height = thumbSize.height
  const thumbContext = thumbCanvas.getContext('2d', { alpha: false })
  if (!thumbContext) throw new Error('Canvas thumbnail tidak tersedia.')
  thumbContext.imageSmoothingEnabled = true
  thumbContext.imageSmoothingQuality = 'high'
  thumbContext.drawImage(canvas, 0, 0, thumbSize.width, thumbSize.height)

  const [full, thumb] = await Promise.all([
    canvasToBlob(canvas, FULL_QUALITY),
    canvasToBlob(thumbCanvas, THUMB_QUALITY),
  ])
  return { full, thumb, width, height }
}

/**
 * Mengubah berkas menjadi ImageBitmap dengan orientasi EXIF sudah diterapkan.
 */
export async function fileToBitmap(file: File | Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' })
}

/** Ambil satu frame dari elemen video sebagai ImageBitmap. */
export async function videoToBitmap(video: HTMLVideoElement): Promise<ImageBitmap> {
  return createImageBitmap(video)
}

/**
 * Ambil still beresolusi sensor bila Image Capture tersedia. Browser yang
 * belum mendukungnya tetap mendapat frame video tanpa mematahkan kamera.
 */
export async function captureBestFrame(
  video: HTMLVideoElement,
  track?: MediaStreamTrack
): Promise<CapturedFrame> {
  if (track && typeof ImageCapture !== 'undefined' && track.readyState === 'live') {
    try {
      const imageCapture = new ImageCapture(track)
      let blob: Blob
      try {
        const capabilities = await imageCapture.getPhotoCapabilities()
        const settings: PhotoSettings = {}
        if (capabilities.imageWidth?.max) settings.imageWidth = capabilities.imageWidth.max
        if (capabilities.imageHeight?.max) settings.imageHeight = capabilities.imageHeight.max
        blob = await imageCapture.takePhoto(settings)
      } catch {
        // Beberapa kamera mengiklankan dimensi maksimum yang kombinasinya
        // tidak valid. Biarkan driver memilih still terbaik sebagai retry.
        blob = await imageCapture.takePhoto()
      }
      if (blob.size > 0) {
        return { bitmap: await fileToBitmap(blob), source: 'photo' }
      }
    } catch {
      // Sebagian perangkat mengekspos ImageCapture tetapi menolak takePhoto.
      // Fallback frame stream di bawah tetap dapat dipakai.
    }
  }

  return { bitmap: await videoToBitmap(video), source: 'video' }
}

/**
 * Tolak keluaran GPU yang benar-benar kosong/putih. Adegan malam yang sah tetap
 * lolos karena sedikit variasi piksel saja sudah membedakannya dari canvas mati.
 */
export async function assertUsableJpeg(blob: Blob): Promise<void> {
  if (blob.type && blob.type !== 'image/jpeg') throw new Error('Format hasil foto tidak sah.')
  const bitmap = await createImageBitmap(blob)
  try {
    if (bitmap.width < 1 || bitmap.height < 1) throw new Error('Foto tidak memiliki ukuran.')
    const canvas = document.createElement('canvas')
    canvas.width = 24
    canvas.height = 24
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(bitmap, 0, 0, 24, 24)
    const pixels = ctx.getImageData(0, 0, 24, 24).data
    let min = 255
    let max = 0
    let total = 0
    for (let index = 0; index < pixels.length; index += 4) {
      const value =
        pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722
      min = Math.min(min, value)
      max = Math.max(max, value)
      total += value
    }
    const mean = total / (pixels.length / 4)
    if (max - min < 1.5 && (mean < 1.5 || mean > 253.5)) {
      throw new Error('Hasil kamera kosong. Silakan jepret ulang.')
    }
  } finally {
    bitmap.close()
  }
}

/** Hitung ukuran baru yang pas di dalam batas panjang maksimum. */
export function fitWithin(
  width: number,
  height: number,
  maxLongEdge: number
): { width: number; height: number } {
  const longEdge = Math.max(width, height)
  if (longEdge <= maxLongEdge) return { width, height }

  const scale = maxLongEdge / longEdge
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}
