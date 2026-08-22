const EMAIL_LOCAL_PART = /^[a-z0-9][a-z0-9._%+-]{0,63}$/i
const EMAIL_DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i
const RESERVED_EMAIL_DOMAINS = new Set(['example.com', 'example.net', 'example.org'])
const PLACEHOLDER_TEXT = /^(?:your|contoh|example|nama|alamat|operator)(?:[\s_-]|$)/i

function normalizePublicText(
  value: string | undefined,
  { minLength, maxLength }: { minLength: number; maxLength: number }
): string | null {
  const text = value?.replace(/\s+/g, ' ').trim()
  if (
    !text ||
    text.length < minLength ||
    text.length > maxLength ||
    /[\u0000-\u001f\u007f]/.test(text) ||
    PLACEHOLDER_TEXT.test(text)
  ) {
    return null
  }

  return text
}

function normalizeSupportEmail(value: string | undefined): string | null {
  const email = value?.trim()
  if (!email || email.length > 254) return null

  const separator = email.lastIndexOf('@')
  if (separator <= 0 || separator !== email.indexOf('@')) return null

  const localPart = email.slice(0, separator)
  const domain = email.slice(separator + 1).toLowerCase()
  const labels = domain.split('.')

  if (
    !EMAIL_LOCAL_PART.test(localPart) ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    labels.length < 2 ||
    [...RESERVED_EMAIL_DOMAINS].some(
      (reserved) => domain === reserved || domain.endsWith(`.${reserved}`)
    ) ||
    ['.invalid', '.localhost', '.test'].some((suffix) => domain.endsWith(suffix)) ||
    labels.some((label) => !EMAIL_DOMAIN_LABEL.test(label))
  ) {
    return null
  }

  return `${localPart}@${domain}`
}

/**
 * Kontak publik opsional. Next.js meng-inline nilai NEXT_PUBLIC_* saat build,
 * jadi deployment harus dibangun ulang setelah alamat ini diubah.
 *
 * Nilai kosong atau tidak valid sengaja menjadi null: UI tidak boleh
 * menerbitkan alamat contoh yang tidak dimonitor.
 */
export const SUPPORT_EMAIL = normalizeSupportEmail(process.env.NEXT_PUBLIC_SUPPORT_EMAIL)

/** Identitas operator hanya dianggap lengkap bila nama dan alamat sama-sama valid. */
export const LEGAL_OPERATOR_NAME = normalizePublicText(
  process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME,
  { minLength: 2, maxLength: 160 }
)
export const LEGAL_OPERATOR_ADDRESS = normalizePublicText(
  process.env.NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS,
  { minLength: 8, maxLength: 300 }
)
export const HAS_LEGAL_OPERATOR_IDENTITY = Boolean(
  LEGAL_OPERATOR_NAME && LEGAL_OPERATOR_ADDRESS
)

export function supportMailto(subject?: string): string | undefined {
  if (!SUPPORT_EMAIL) return undefined
  return `mailto:${SUPPORT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`
}

/**
 * Apakah paket berbayar boleh ditawarkan sama sekali.
 *
 * Checkout berbayar gagal tertutup tanpa kanal bantuan yang valid (lihat
 * `requirePaidCheckoutDisclosure`). Tanpa flag ini wizard tetap menawarkan
 * paket berbayar, album dibuat sebagai draf, lalu halaman pembayaran menolak
 * membuat order — album itu tidak pernah bisa aktif dan tidak bisa dihapus
 * host. Jadi paket berbayar disembunyikan lebih dulu, bukan digagalkan
 * belakangan.
 *
 * Ini hanya bagian gate yang dapat dibaca browser. Sisi server tetap memakai
 * `paidCheckoutDisclosureIssue()` yang juga menuntut identitas operator saat
 * production.
 */
export const PAID_CHECKOUT_ENABLED = Boolean(SUPPORT_EMAIL)
