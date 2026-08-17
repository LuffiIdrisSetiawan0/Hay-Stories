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
  | 'golden-hour-400'
  | 'pastel-400'
  | 'everyday-100'
  | 'neon-night-1600'
  | 'sunday-chrome'
  | 'disposable-quicksnap'
  | 'disposable-party-flash'
  | 'disposable-beach-washed'
  | 'disposable-expired-film'
  | 'disposable-90s-compact'
  | 'noir-400'
  | 'fuji-velvia-50'
  | 'kodachrome-64'
  | 'kodak-ektachrome-100'
  | 'fuji-astia-100'
  | 'kodak-ektar-100'
  | 'kodak-tri-x-400'

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
    id: 'golden-hour-400',
    name: 'Kodak Gold 200',
    character: 'Hangat keemasan, kulit peachy-glow, bayangan matte analog & golden highlights',
    lut: '/luts/golden-hour-400.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.48,
    grain: 0.22,
    vignette: 0.20,
    halation: 0.24,
  },
  {
    id: 'pastel-400',
    name: 'Fuji Superia 400',
    character: 'Warna hijau & biru segar, rose-tint kulit bersinar, kontras tajam khas foto Jepang',
    lut: '/luts/fuji-superia-400.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.45,
    grain: 0.20,
    vignette: 0.18,
    halation: 0.16,
  },
  {
    id: 'everyday-100',
    name: 'Portra 400 Romance',
    character: 'Warna kulit paling lembut & flattering, pastel creamy, gaun pengantin tetap bertekstur',
    lut: '/luts/everyday-100.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.38,
    grain: 0.14,
    vignette: 0.12,
    halation: 0.12,
  },
  {
    id: 'neon-night-1600',
    name: 'CineStill 800T',
    character: 'Bayangan teal sinematik, red halation tebal memancar di sekitar lampu & lilin pesta',
    lut: '/luts/neon-night-1600.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.54,
    grain: 0.36,
    vignette: 0.28,
    halation: 0.60,
  },
  {
    id: 'sunday-chrome',
    name: 'Agfa Vista 200',
    character: 'Direct flash pop, warna merah pekat, kontras tegas, nostalgia kamera saku 90-an',
    lut: '/luts/agfa-vista-200.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.52,
    grain: 0.24,
    vignette: 0.24,
    halation: 0.20,
  },
  {
    id: 'disposable-quicksnap',
    name: 'QuickSnap Daylight',
    character: 'Warna biru-hijau sejuk, kontras tajam & bayangan pudar khas disposable camera',
    lut: '/luts/disposable-quicksnap.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.45,
    grain: 0.28,
    vignette: 0.22,
    halation: 0.15,
  },
  {
    id: 'disposable-party-flash',
    name: 'Party Night Flash',
    character: 'Direct flash pekat, highlights terang benderang & bayangan moody ungu/biru',
    lut: '/luts/disposable-party-flash.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.55,
    grain: 0.35,
    vignette: 0.32,
    halation: 0.30,
  },
  {
    id: 'disposable-beach-washed',
    name: 'Beach Washed',
    character: 'Nuansa musim panas lembut, overexposed creamy & hangat keemasan pudar',
    lut: '/luts/disposable-beach-washed.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.30,
    grain: 0.20,
    vignette: 0.15,
    halation: 0.18,
  },
  {
    id: 'disposable-expired-film',
    name: 'Expired Film',
    character: 'Pergeseran warna magenta/merah pudar, bayangan gelap pekat & butiran kasar retro',
    lut: '/luts/disposable-expired-film.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.48,
    grain: 0.40,
    vignette: 0.28,
    halation: 0.25,
  },
  {
    id: 'disposable-90s-compact',
    name: '90s Compact',
    character: 'Warna amber hangat, kulit glowing & nostalgia kamera saku era 90-an',
    lut: '/luts/disposable-90s-compact.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.46,
    grain: 0.26,
    vignette: 0.24,
    halation: 0.20,
  },
  {
    id: 'noir-400',
    name: 'Ilford HP5 Plus',
    character: 'Hitam-putih berkelas, silver grain nyata, bayangan dalam & gradasi abu-abu kaya',
    lut: '/luts/ilford-hp5-400.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.60,
    grain: 0.45,
    vignette: 0.30,
    halation: 0.0,
  },
  {
    id: 'fuji-velvia-50',
    name: 'Fujifilm Velvia 50',
    character: 'Saturasi warna ultra-vibrant, hijau emerald hidup, warna lanskap pop',
    lut: '/luts/fuji-velvia-50.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.58,
    grain: 0.16,
    vignette: 0.22,
    halation: 0.14,
  },
  {
    id: 'kodachrome-64',
    name: 'Kodak Kodachrome 64',
    character: 'Slide film legendaris era 70-80an, warna merah & kuning hangat nostalgia',
    lut: '/luts/kodachrome-64.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.50,
    grain: 0.20,
    vignette: 0.22,
    halation: 0.18,
  },
  {
    id: 'kodak-ektachrome-100',
    name: 'Kodak Ektachrome 100',
    character: 'Kontras tajam dengan cool blues dan saturasi jernih khas slide film modern',
    lut: '/luts/kodak-ektachrome-100.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.54,
    grain: 0.18,
    vignette: 0.20,
    halation: 0.15,
  },
  {
    id: 'fuji-astia-100',
    name: 'Fujifilm Astia 100F',
    character: 'Soft contrast natural, warna kulit halus dan seimbang untuk potret outdoor',
    lut: '/luts/pastel-400.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.40,
    grain: 0.14,
    vignette: 0.14,
    halation: 0.12,
  },
  {
    id: 'kodak-ektar-100',
    name: 'Kodak Ektar 100',
    character: 'Grain paling halus di dunia, warna sangat tajam, kaya dan berdimensi',
    lut: '/luts/sunday-chrome.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.52,
    grain: 0.10,
    vignette: 0.18,
    halation: 0.12,
  },
  {
    id: 'kodak-tri-x-400',
    name: 'Kodak TRI-X 400',
    character: 'Monokrom jurnalistik klasik, kontras tegas berjiwa dengan silver grain khas',
    lut: '/luts/noir-400.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.65,
    grain: 0.48,
    vignette: 0.28,
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
