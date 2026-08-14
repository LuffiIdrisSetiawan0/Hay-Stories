import { FilmRenderer } from './renderer'
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
 * Ukuran akhir foto tersimpan untuk sumber sebesar ini.
 *
 * Diekspor supaya pemanggil bisa mengklaim jepretan ke server SEBELUM
 * gambarnya selesai dirender — klaim hanya butuh ukurannya, dan menunggu GPU
 * selesai lebih dulu berarti satu perjalanan jaringan penuh yang terbuang.
 */
export function captureSize(sourceWidth: number, sourceHeight: number) {
  return fitWithin(sourceWidth, sourceHeight, MAX_LONG_EDGE)
}

export async function processCapture(
  renderer: FilmRenderer,
  source: ImageBitmap,
  preset: FilmPreset,
  options: { mirror?: boolean; smooth?: number } = {}
): Promise<ProcessedCapture> {
  const { width, height } = captureSize(source.width, source.height)

  await renderer.loadPreset(preset)

  // `intensity` WAJIB sama dengan yang dipakai viewfinder. Kalau berbeda,
  // tamu membingkai satu rasa warna dan menyimpan rasa yang lain.
  const full = await renderer.renderToBlob(source, preset, width, height, {
    mirror: options.mirror,
    intensity: preset.strength,
    lumaLock: preset.lumaLock,
    contrast: preset.contrast,
    smooth: options.smooth,
    quality: FULL_QUALITY,
  })

  /*
   * Thumbnail dirender ULANG dari sumber yang sama, bukan diturunkan dari JPEG
   * penuh yang baru saja dibuat.
   *
   * Versi sebelumnya memanggil createImageBitmap() atas blob 2560x1440 —
   * artinya JPEG yang baru saja di-encode langsung didekode lagi seutuhnya
   * hanya untuk dikecilkan. Merender ulang lewat LUT yang sama pada 480 px
   * nyaris gratis di GPU, dan warnanya identik karena preset dan seluruh
   * parameternya sama persis. Yang berbeda cuma skala grain, dan pada
   * thumbnail selebar 480 px itu tidak terlihat.
   */
  const thumbSize = fitWithin(source.width, source.height, THUMB_LONG_EDGE)
  const thumb = await renderer.renderToBlob(source, preset, thumbSize.width, thumbSize.height, {
    mirror: options.mirror,
    intensity: preset.strength,
    lumaLock: preset.lumaLock,
    contrast: preset.contrast,
    smooth: options.smooth,
    quality: THUMB_QUALITY,
  })

  return { full, thumb, width, height }
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
