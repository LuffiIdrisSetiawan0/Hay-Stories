import { FilmRenderer, canvasToBlob } from './renderer'
import type { FilmPreset } from '@/lib/catalog'

/**
 * Sisi terpanjang maksimum untuk foto tersimpan.
 *
 * 4096 dipilih supaya frame 4K (3840 px) lewat tanpa dikecilkan — kamera memang
 * diminta setinggi itu, dan memangkasnya di sini akan membuang resolusi yang
 * sudah terlanjur ditangkap.
 *
 * Batas ini tetap ada sebagai pagar: sebagian perangkat sanggup memberi frame
 * jauh lebih besar, dan foto 12 MP dikali ribuan jepretan per acara berarti
 * puluhan GB storage yang, pada tier berbayar, disimpan permanen.
 *
 * `fitWithin` tidak pernah memperbesar, jadi perangkat yang hanya sanggup
 * 1080p tetap menyimpan 1080p apa adanya.
 */
const MAX_LONG_EDGE = 4096

/** Sisi terpanjang thumbnail galeri. Galeri TIDAK BOLEH memuat foto penuh. */
const THUMB_LONG_EDGE = 480

const FULL_QUALITY = 0.9
const THUMB_QUALITY = 0.72

export interface ProcessedCapture {
  full: Blob
  thumb: Blob
  width: number
  height: number
}

/**
 * Menerapkan preset film ke satu sumber gambar dan menghasilkan foto penuh
 * plus thumbnail-nya.
 *
 * Dipakai bersama oleh ketiga jalur pengambilan gambar (viewfinder in-app,
 * kamera native HD, unggah dari galeri) supaya hasilnya identik.
 */
export async function processCapture(
  renderer: FilmRenderer,
  source: ImageBitmap,
  preset: FilmPreset,
  options: { mirror?: boolean } = {}
): Promise<ProcessedCapture> {
  const { width, height } = fitWithin(source.width, source.height, MAX_LONG_EDGE)

  await renderer.loadPreset(preset)

  // `intensity` WAJIB sama dengan yang dipakai viewfinder. Kalau berbeda,
  // tamu membingkai satu rasa warna dan menyimpan rasa yang lain.
  const full = await renderer.renderToBlob(source, preset, width, height, {
    mirror: options.mirror,
    intensity: preset.strength,
    quality: FULL_QUALITY,
  })

  const thumbSize = fitWithin(source.width, source.height, THUMB_LONG_EDGE)
  const thumb = await renderThumb(full, thumbSize.width, thumbSize.height)

  return { full, thumb, width, height }
}

/**
 * Thumbnail diturunkan dari foto yang SUDAH difilter, bukan dari sumber asli.
 * Kalau diturunkan dari sumber, grid galeri akan terlihat berbeda dari foto
 * yang dibuka — perbedaan halus yang langsung terasa salah.
 */
async function renderThumb(fullPhoto: Blob, width: number, height: number): Promise<Blob> {
  const bitmap = await createImageBitmap(fullPhoto, {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: 'high',
  })

  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D tidak tersedia.')
    ctx.drawImage(bitmap, 0, 0, width, height)

    return await canvasToBlob(canvas, THUMB_QUALITY)
  } finally {
    bitmap.close()
  }
}

/**
 * Mengubah berkas menjadi ImageBitmap dengan orientasi EXIF sudah diterapkan.
 *
 * Tanpa `imageOrientation: 'from-image'`, foto potret dari kamera iPhone akan
 * masuk dalam posisi menyamping — EXIF-nya menyimpan rotasi, dan canvas
 * mengabaikannya.
 */
export async function fileToBitmap(file: File | Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' })
}

/** Ambil satu frame dari elemen video sebagai ImageBitmap. */
export async function videoToBitmap(video: HTMLVideoElement): Promise<ImageBitmap> {
  return createImageBitmap(video)
}

/** Skalakan ke bawah agar muat dalam `maxLongEdge`. Tidak pernah memperbesar. */
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
