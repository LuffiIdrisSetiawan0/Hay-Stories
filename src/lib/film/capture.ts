import { FilmRenderer } from './renderer'
import type { FilmPreset } from '@/lib/catalog'

/**
 * Sisi terpanjang maksimum untuk foto tersimpan.
 */
const MAX_LONG_EDGE = 4096

/** Sisi terpanjang thumbnail galeri. Galeri TIDAK BOLEH memuat foto penuh. */
const THUMB_LONG_EDGE = 480

const FULL_QUALITY = 0.92
const THUMB_QUALITY = 0.75

export interface ProcessedCapture {
  full: Blob
  thumb: Blob
  width: number
  height: number
}

/**
 * Ukuran akhir foto tersimpan untuk sumber sebesar ini.
 */
export function captureSize(sourceWidth: number, sourceHeight: number) {
  return fitWithin(sourceWidth, sourceHeight, MAX_LONG_EDGE)
}

export async function processCapture(
  renderer: FilmRenderer,
  source: ImageBitmap,
  preset: FilmPreset,
  options: {
    mirror?: boolean
    smooth?: number
    exposure?: number
    sharpen?: number
  } = {}
): Promise<ProcessedCapture> {
  const { width, height } = captureSize(source.width, source.height)

  await renderer.loadPreset(preset)

  const full = await renderer.renderToBlob(source, preset, width, height, {
    mirror: options.mirror,
    intensity: preset.strength,
    lumaLock: preset.lumaLock,
    contrast: preset.contrast,
    smooth: options.smooth,
    exposure: options.exposure,
    sharpen: options.sharpen,
    quality: FULL_QUALITY,
  })

  const thumbSize = fitWithin(source.width, source.height, THUMB_LONG_EDGE)
  const thumb = await renderer.renderToBlob(source, preset, thumbSize.width, thumbSize.height, {
    mirror: options.mirror,
    intensity: preset.strength,
    lumaLock: preset.lumaLock,
    contrast: preset.contrast,
    smooth: options.smooth,
    exposure: options.exposure,
    sharpen: options.sharpen,
    quality: THUMB_QUALITY,
  })

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
