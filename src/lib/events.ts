import type { RevealMode, TierId } from './catalog'
import { getTier } from './catalog'

/**
 * Aturan seputar acara/album yang dipakai bersama oleh Server Action, halaman
 * host, dan (nanti) route handler tamu.
 */

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------

/**
 * Kata yang tidak boleh jadi slug karena bentrok dengan rute di bawah /a/
 * atau menyesatkan bila muncul di tautan yang dibagikan ke tamu.
 */
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'dashboard',
  'dev',
  'galeri',
  'gallery',
  'hay',
  'kamera',
  'camera',
  'live',
  'login',
  'logout',
  'new',
  'null',
  'undefined',
])

/**
 * Ubah judul acara jadi potongan slug yang aman URL.
 *
 * Hasilnya belum tentu unik — pemanggil wajib melalui `buildUniqueSlug()`.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // buang diakritik yang dipisahkan NFD
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '')
}

/**
 * Alfabet tanpa karakter yang mudah tertukar saat dibaca dari layar atau
 * kertas: tanpa 0/O, 1/I/L, 2/Z, 5/S, 8/B.
 *
 * Tamu mengetik kode ini manual kalau kameranya gagal memindai QR, sering
 * dalam kondisi ruangan gelap.
 */
const CODE_ALPHABET = '34679ACDEFGHJKMNPQRTUVWXY'

export function generateAccessCode(length = 6): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)

  let out = ''
  for (const byte of bytes) {
    out += CODE_ALPHABET[byte % CODE_ALPHABET.length]
  }
  return out
}

/** Akhiran acak pendek untuk memisahkan slug yang judulnya sama. */
function randomSuffix(): string {
  return generateAccessCode(4).toLowerCase()
}

/**
 * Bangun slug unik dari judul.
 *
 * `isTaken` menanyakan ketersediaan ke database. Dicoba beberapa kali karena
 * dua host bisa membuat album berjudul sama pada saat bersamaan; batasan
 * UNIQUE di database tetap jadi penentu akhir.
 */
export async function buildUniqueSlug(
  title: string,
  isTaken: (slug: string) => Promise<boolean>,
  attempts = 5
): Promise<string> {
  const base = slugify(title)

  // Slug wajib 3-60 karakter dan diawali/diakhiri alfanumerik (CHECK constraint
  // events_slug_format_check). Judul seperti "?!" atau "A" tidak menghasilkan
  // slug yang sah, jadi dipakai cadangan.
  const seed = base.length >= 3 && !RESERVED_SLUGS.has(base) ? base : `album-${randomSuffix()}`

  if (!(await isTaken(seed))) return seed

  for (let i = 0; i < attempts; i++) {
    const candidate = `${seed.slice(0, 48)}-${randomSuffix()}`
    if (!(await isTaken(candidate))) return candidate
  }

  throw new Error('Gagal membuat slug unik. Coba ganti judul acara.')
}

// ---------------------------------------------------------------------------
// Status reveal
// ---------------------------------------------------------------------------

export interface RevealState {
  revealed: boolean
  /** Waktu terbuka untuk mode terjadwal yang belum tiba. */
  revealAt: Date | null
}

/**
 * Hitung apakah galeri sudah terbuka, DIHITUNG SAAT DIBACA.
 *
 * Sengaja tidak memakai cron: tidak ada job yang bisa gagal, tidak ada
 * infrastruktur tambahan, dan tidak ada jeda antara waktu terjadwal dengan
 * saat galeri benar-benar terbuka.
 */
export function resolveReveal(event: {
  reveal_mode: RevealMode | string
  reveal_at: string | null
  is_revealed: boolean | null
}): RevealState {
  if (event.is_revealed) return { revealed: true, revealAt: null }

  if (event.reveal_mode === 'immediate') {
    return { revealed: true, revealAt: null }
  }

  if (event.reveal_mode === 'scheduled' && event.reveal_at) {
    const at = new Date(event.reveal_at)
    return { revealed: at.getTime() <= Date.now(), revealAt: at }
  }

  // 'manual' — hanya terbuka lewat is_revealed, yang sudah dicek di atas.
  return { revealed: false, revealAt: null }
}

// ---------------------------------------------------------------------------
// Batasan tier
// ---------------------------------------------------------------------------

/** Nilai tak terbatas disimpan sebagai angka besar, bukan NULL, agar perbandingan di SQL tetap sederhana. */
export const UNLIMITED_GUESTS = 100_000

export interface EventLimits {
  maxGuests: number
  shotsPerGuest: number
  /** null = disimpan permanen */
  expiresAt: Date | null
}

/**
 * Terjemahkan tier jadi batasan konkret yang disimpan di baris acara.
 *
 * Nilainya disalin ke tabel `events`, bukan dibaca ulang dari katalog saat
 * runtime — supaya perubahan harga di kemudian hari tidak diam-diam mengubah
 * batasan acara yang sudah terlanjur dibayar.
 */
export function resolveLimits(tierId: TierId, now = new Date()): EventLimits {
  const tier = getTier(tierId)
  if (!tier) throw new Error(`Tier tidak dikenal: ${tierId}`)

  const expiresAt =
    tier.retentionDays === null
      ? null
      : new Date(now.getTime() + tier.retentionDays * 24 * 60 * 60 * 1000)

  return {
    maxGuests: tier.maxGuests ?? UNLIMITED_GUESTS,
    shotsPerGuest: tier.shotsPerGuest,
    expiresAt,
  }
}

// ---------------------------------------------------------------------------
// Tautan tamu
// ---------------------------------------------------------------------------

/**
 * URL yang dipindai tamu. Selalu absolut — tautan ini dicetak di kartu meja
 * dan dikirim lewat WhatsApp, jadi path relatif tidak berguna.
 */
export function guestUrl(slug: string, origin?: string): string {
  const base = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `${base.replace(/\/$/, '')}/a/${slug}`
}
