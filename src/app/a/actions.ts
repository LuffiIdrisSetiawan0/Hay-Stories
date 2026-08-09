'use server'

import { redirect } from 'next/navigation'
import { findEventByAccessCode, normalizeAccessCode } from '@/lib/guest/event'

export interface CodeResult {
  error: string
}

/**
 * Tukar kode cadangan dengan tautan albumnya.
 *
 * Jalur ini ada untuk tamu yang kameranya gagal memindai QR — kejadian biasa
 * di ruangan remang, pada ponsel lama, atau saat QR-nya tertutup gelas.
 *
 * Belum ada pembatasan laju di sini. Kode 6 karakter dari alfabet 25 huruf
 * memberi ~244 juta kemungkinan, jadi menebaknya tidak praktis, tapi begitu
 * ada pembatas laju di aplikasi ini, endpoint inilah yang pertama harus
 * memakainya.
 */
export async function enterCode(
  _prevState: CodeResult | null,
  formData: FormData
): Promise<CodeResult | never> {
  const raw = String(formData.get('code') ?? '')
  const code = normalizeAccessCode(raw)

  if (!code) {
    return { error: 'Kode tidak dikenal. Periksa lagi huruf dan angkanya.' }
  }

  const event = await findEventByAccessCode(code)

  if (!event) {
    return { error: 'Kode tidak dikenal. Periksa lagi huruf dan angkanya.' }
  }

  // redirect() bekerja dengan melempar, jadi harus di luar blok try/catch.
  redirect(`/a/${event.slug}`)
}
