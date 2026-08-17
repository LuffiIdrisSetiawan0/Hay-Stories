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
    shotsPerGuest: 100,
    retentionDays: 90,
    features: [
      '1 album acara',
      'Preset Film Analog & Natural Clean',
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
    shotsPerGuest: 100,
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
    shotsPerGuest: 100,
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
    shotsPerGuest: 100,
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
  | 'natural-clean'
  | 'film-35mm'
  | 'film-fuji'
  | 'film-kodak'
  | 'film-polaroid'

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
    id: 'natural-clean',
    name: 'Natural Clean',
    character: 'Warna asli jernih, nada kulit natural & realistis tanpa grading film tebal',
    lut: '/luts/natural-clean.png',
    strength: 0.0,
    lumaLock: 1.0,
    contrast: 0.0,
    grain: 0.0,
    vignette: 0.0,
    halation: 0.0,
  },
  {
    id: 'film-35mm',
    name: '35mm Analog',
    character: 'Karakter roll film 35mm klasik, bayangan pudar matte & nada hangat autentik',
    lut: '/luts/film-35mm.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.45,
    grain: 0.30,
    vignette: 0.20,
    halation: 0.18,
  },
  {
    id: 'film-fuji',
    name: 'Fuji Film',
    character: 'Warna hijau & biru sejuk khas Fujifilm, nada kulit lembut & bayangan jernih',
    lut: '/luts/film-fuji.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.40,
    grain: 0.18,
    vignette: 0.16,
    halation: 0.14,
  },
  {
    id: 'film-kodak',
    name: 'Kodak Film',
    character: 'Nuansa hangat keemasan ikonik Kodak, warna merah kaya & kontras analog hidup',
    lut: '/luts/film-kodak.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.50,
    grain: 0.28,
    vignette: 0.22,
    halation: 0.22,
  },
  {
    id: 'film-polaroid',
    name: 'Polaroid Instant',
    character: 'Estetika foto instan polaroid vintage, bayangan pudar & kilau nostalgia lembut',
    lut: '/luts/film-polaroid.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.38,
    grain: 0.22,
    vignette: 0.24,
    halation: 0.16,
  },
] as const

export const DEFAULT_PRESET: PresetId = 'film-35mm'

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
