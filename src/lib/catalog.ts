/**
 * Satu sumber kebenaran untuk tier, preset film, dan jenis acara.
 *
 * Landing page, wizard pembuatan album, dan validasi sisi server semuanya
 * membaca dari sini — supaya harga yang dipajang tidak pernah berbeda dari
 * harga yang ditagih.
 */

// ---------------------------------------------------------------------------
// Tier
// ---------------------------------------------------------------------------

export type TierId = 'starter' | 'party' | 'pesta' | 'unlimited'

export interface Tier {
  id: TierId
  name: string
  tagline: string
  /** Rupiah. 0 = gratis. */
  price: number
  /** Harga coret, untuk menampilkan diskon. */
  wasPrice?: number
  /** null = tanpa batas. */
  maxGuests: number | null
  shotsPerGuest: number
  /** Berapa lama foto disimpan setelah acara. null = permanen. */
  retentionDays: number | null
  features: string[]
  recommended?: boolean
}

export const TIERS: readonly Tier[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Coba dulu, gratis',
    price: 0,
    maxGuests: 5,
    shotsPerGuest: 12,
    retentionDays: 90,
    features: [
      '1 album acara',
      '6 preset analog',
      'Galeri interaktif',
      'Unduhan resolusi penuh',
    ],
  },
  {
    id: 'party',
    name: 'Party',
    tagline: 'Untuk acara kecil',
    price: 199_000,
    wasPrice: 299_000,
    maxGuests: 50,
    shotsPerGuest: 24,
    retentionDays: null,
    features: [
      'Semua fitur Starter',
      'Sistem reveal bersama',
      'QR code siap cetak',
      'Statistik tamu real-time',
    ],
  },
  {
    id: 'pesta',
    name: 'Pesta',
    tagline: 'Paling populer',
    price: 499_000,
    wasPrice: 699_000,
    maxGuests: 150,
    shotsPerGuest: 36,
    retentionDays: null,
    features: [
      'Semua fitur Party',
      'Branding kustom',
      'Unduh ZIP semua foto',
      'Prioritas support',
    ],
    recommended: true,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    tagline: 'Acara besar',
    price: 1_099_000,
    wasPrice: 1_490_000,
    maxGuests: null,
    shotsPerGuest: 36,
    retentionDays: null,
    features: [
      'Semua fitur Pesta',
      'Multi-album per acara',
      'Analitik lanjutan',
      'Dedicated support',
    ],
  },
] as const

export function getTier(id: string): Tier | undefined {
  return TIERS.find((t) => t.id === id)
}

export function formatPrice(price: number): string {
  return price === 0 ? 'Gratis' : `Rp ${price.toLocaleString('id-ID')}`
}

export function formatGuestLimit(maxGuests: number | null): string {
  return maxGuests === null ? 'Tamu tak terbatas' : `Hingga ${maxGuests} tamu`
}

// ---------------------------------------------------------------------------
// Preset film
// ---------------------------------------------------------------------------

export type PresetId =
  | 'golden-hour-400'
  | 'pastel-400'
  | 'sunday-chrome'
  | 'noir-400'
  | 'neon-night-1600'
  | 'everyday-100'

export interface FilmPreset {
  id: PresetId
  name: string
  /** Karakter warnanya, bukan merek yang ditiru. */
  character: string
  /** Berkas tekstur LUT bertile di /public/luts/ */
  lut: string
  /** 0–1, seberapa jauh hasil grade dicampur ke gambar aslinya. */
  strength: number
  /** 0–1, seberapa banyak kecerahan asli dikembalikan setelah LUT. */
  lumaLock: number
  /** 0–1, kekuatan kurva-S kontras setelah grading. */
  contrast: number
  /** 0–1, kekuatan grain prosedural. */
  grain: number
  /** 0–1, kekuatan vignette. */
  vignette: number
  /** 0–1, halation (pendar merah di sekitar sorotan terang). */
  halation: number
}

export const FILM_PRESETS: readonly FilmPreset[] = [
  {
    id: 'golden-hour-400',
    name: 'Golden Hour 400',
    character: 'Momen utama. Nuansa emas hangat, kulit bersinar & bayangan pekat analog',
    lut: '/luts/golden-hour-400.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.62,
    grain: 0.28,
    vignette: 0.22,
    halation: 0.22,
  },
  {
    id: 'pastel-400',
    name: 'Pastel 400',
    character: 'Luar ruang & dekorasi. Warna lembut, dreamy, kontras manis estetik',
    lut: '/luts/pastel-400.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.52,
    grain: 0.18,
    vignette: 0.14,
    halation: 0.14,
  },
  {
    id: 'neon-night-1600',
    name: 'Neon Night 1600',
    character: 'Pesta & gigs malam. Saturasi neon elektrik, flash halation tebal',
    lut: '/luts/neon-night-1600.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.72,
    grain: 0.46,
    vignette: 0.32,
    halation: 0.55,
  },
  {
    id: 'everyday-100',
    name: 'Everyday 100',
    character: 'Kumpul santai & candid. Warna natural hidup, tajam & bersih',
    lut: '/luts/everyday-100.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.48,
    grain: 0.16,
    vignette: 0.16,
    halation: 0.10,
  },
  {
    id: 'sunday-chrome',
    name: 'Sunday Chrome',
    character: 'Detail & bunga. Saturasi tinggi pop ala slide film retro 90s',
    lut: '/luts/sunday-chrome.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.78,
    grain: 0.24,
    vignette: 0.28,
    halation: 0.18,
  },
  {
    id: 'noir-400',
    name: 'Noir 400',
    character: 'Momen emosional & intim. Hitam-putih kontras tinggi, silver grain nyata',
    lut: '/luts/noir-400.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.85,
    grain: 0.56,
    vignette: 0.36,
    halation: 0.0,
  },
] as const

export const DEFAULT_PRESET: PresetId = 'golden-hour-400'

export function getPreset(id: string): FilmPreset | undefined {
  return FILM_PRESETS.find((p) => p.id === id)
}

// ---------------------------------------------------------------------------
// Jenis acara
// ---------------------------------------------------------------------------

export const EVENT_TYPES = [
  { id: 'wedding', label: 'Pernikahan' },
  { id: 'birthday', label: 'Ulang Tahun' },
  { id: 'party', label: 'Pesta' },
  { id: 'corporate', label: 'Acara Kantor' },
  { id: 'graduation', label: 'Wisuda' },
  { id: 'other', label: 'Lainnya' },
] as const

export type EventTypeId = (typeof EVENT_TYPES)[number]['id']

// ---------------------------------------------------------------------------
// Reveal
// ---------------------------------------------------------------------------

export type RevealMode = 'immediate' | 'scheduled' | 'manual'

export const REVEAL_MODES: readonly { id: RevealMode; label: string; description: string }[] = [
  {
    id: 'manual',
    label: 'Saya buka sendiri',
    description: 'Foto tersembunyi sampai kamu menekan tombol buka.',
  },
  {
    id: 'scheduled',
    label: 'Otomatis pada waktu tertentu',
    description: 'Semua foto terungkap bersamaan pada jam yang kamu tentukan.',
  },
  {
    id: 'immediate',
    label: 'Langsung terlihat',
    description: 'Foto langsung muncul di galeri begitu dijepret.',
  },
] as const
