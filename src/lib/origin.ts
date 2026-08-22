import 'server-only'

import { headers } from 'next/headers'

const FALLBACK_APP_ORIGIN = 'https://hay-stories.vercel.app'

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function parseHttpOrigin(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value.trim())
    if (
      (url.protocol !== 'https:' && url.protocol !== 'http:') ||
      url.username ||
      url.password ||
      (url.protocol === 'http:' && !isLocalHostname(url.hostname))
    ) {
      return null
    }

    return url.origin
  } catch {
    return null
  }
}

/** Origin publik kanonis untuk metadata, callback auth, dan tautan yang dibagikan. */
export function appOrigin(): string {
  return parseHttpOrigin(process.env.NEXT_PUBLIC_APP_URL) ?? FALLBACK_APP_ORIGIN
}

/**
 * Origin absolut permintaan yang sedang berjalan.
 *
 * Dipakai untuk membangun tautan yang keluar dari aplikasi — terutama URL di
 * dalam QR code, yang dicetak di kartu meja dan tidak bisa diperbaiki setelah
 * tinta kering.
 *
 * Origin publik yang dikonfigurasi didahulukan agar Host/X-Forwarded-Host yang
 * dapat dipalsukan tidak masuk ke QR permanen. Header hanya menjadi fallback
 * untuk pengembangan lokal; deployment tanpa konfigurasi memakai origin
 * kanonis, bukan host dari request.
 */
export async function requestOrigin(): Promise<string> {
  const configured = parseHttpOrigin(process.env.NEXT_PUBLIC_APP_URL)
  if (configured) return configured

  const h = await headers()

  // Proxy dapat mengirim daftar nilai. Nilai pertama adalah host yang dilihat
  // pengguna; sisanya adalah hop internal dan tidak boleh ikut ke URL.
  const host = (h.get('x-forwarded-host') ?? h.get('host'))?.split(',')[0]?.trim()
  if (host) {
    const forwardedProto = h.get('x-forwarded-proto')?.split(',')[0]?.trim()
    const proto = forwardedProto === 'http' || forwardedProto === 'https'
      ? forwardedProto
      : host.startsWith('localhost') || host.startsWith('127.0.0.1')
        ? 'http'
        : 'https'
    const requestBased = parseHttpOrigin(`${proto}://${host}`)
    if (requestBased && isLocalHostname(new URL(requestBased).hostname)) return requestBased
  }

  return FALLBACK_APP_ORIGIN
}
