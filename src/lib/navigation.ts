const VALIDATION_ORIGIN = 'https://navigation.hay-stories.invalid'
const DEFAULT_NEXT_PATH = '/dashboard'

/**
 * Mengembalikan tujuan navigasi internal yang aman.
 *
 * Nilai ini berasal dari query string dan ikut melewati tautan OAuth/email,
 * jadi perlakukan sebagai input tidak tepercaya. URL absolut, protocol-relative
 * (`//example.com`), backslash yang dinormalisasi browser menjadi slash, serta
 * karakter kontrol semuanya ditolak untuk mencegah open redirect.
 */
export function safeNextPath(
  value: string | string[] | null | undefined,
  fallback = DEFAULT_NEXT_PATH
): string {
  const raw = Array.isArray(value) ? value[0] : value
  return normalizeInternalPath(raw) ?? normalizeInternalPath(fallback) ?? DEFAULT_NEXT_PATH
}

function normalizeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null

  const candidate = raw.trim()
  if (
    candidate.length === 0 ||
    candidate.length > 2048 ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.startsWith('/\\') ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return null
  }

  try {
    const url = new URL(candidate, VALIDATION_ORIGIN)
    if (url.origin !== VALIDATION_ORIGIN) return null

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}
