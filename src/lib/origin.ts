import 'server-only'

import { headers } from 'next/headers'

/**
 * Origin absolut permintaan yang sedang berjalan.
 *
 * Dipakai untuk membangun tautan yang keluar dari aplikasi — terutama URL di
 * dalam QR code, yang dicetak di kartu meja dan tidak bisa diperbaiki setelah
 * tinta kering.
 *
 * Diambil dari header, bukan dari NEXT_PUBLIC_APP_URL, karena env var yang
 * lupa diisi akan menghasilkan tautan relatif yang gagal dipindai tanpa error
 * apa pun. Cara ini juga otomatis benar di deployment preview, yang punya URL
 * berbeda setiap kali.
 *
 * Env var tetap dipakai sebagai cadangan terakhir.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers()

  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (host) {
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
    return `${proto}://${host}`
  }

  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
}
