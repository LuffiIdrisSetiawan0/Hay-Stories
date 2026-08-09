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
//
// Nama sengaja orisinal. Menamai preset dengan merek film asli (Kodak Portra,
// Fujifilm, CineStill, Ilford) adalah penggunaan merek dagang terdaftar dan
// berisiko secara hukum — sekalipun kompetitor melakukannya.
// ---------------------------------------------------------------------------

export type PresetId =
  | 'golden-hour-400'
  | 'sunday-chrome'
  | 'noir-400'
  | 'neon-night-800'
  | 'everyday-200'
  | 'bright-sun-100'

export interface FilmPreset {
  id: PresetId
  name: string
  /** Karakter warnanya, bukan merek yang ditiru. */
  character: string
  /** Berkas tekstur LUT bertile di /public/luts/ */
  lut: string
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
    character: 'Hangat, kontras lembut, kulit kemerahan alami',
    lut: '/luts/golden-hour-400.png',
    grain: 0.35,
    vignette: 0.25,
    halation: 0.2,
  },
  {
    id: 'sunday-chrome',
    name: 'Sunday Chrome',
    character: 'Warna jenuh, kontras tinggi, biru pekat',
    lut: '/luts/sunday-chrome.png',
    grain: 0.2,
    vignette: 0.3,
    halation: 0.1,
  },
  {
    id: 'noir-400',
    name: 'Noir 400',
    character: 'Hitam putih, grain kasar, kontras dramatis',
    lut: '/luts/noir-400.png',
    grain: 0.6,
    vignette: 0.4,
    halation: 0,
  },
  {
    id: 'neon-night-800',
    name: 'Neon Night 800',
    character: 'Untuk cahaya lampu, halation merah, biru dingin',
    lut: '/luts/neon-night-800.png',
    grain: 0.5,
    vignette: 0.35,
    halation: 0.6,
  },
  {
    id: 'everyday-200',
    name: 'Everyday 200',
    character: 'Netral sedikit hangat, aman untuk segala kondisi',
    lut: '/luts/everyday-200.png',
    grain: 0.25,
    vignette: 0.15,
    halation: 0.15,
  },
  {
    id: 'bright-sun-100',
    name: 'Bright Sun 100',
    character: 'Jernih, grain sangat halus, untuk acara luar ruang',
    lut: '/luts/bright-sun-100.png',
    grain: 0.12,
    vignette: 0.2,
    halation: 0.1,
  },
] as const

/**
 * Roll yang sudah terpasang saat kamera tamu pertama kali terbuka.
 *
 * Bukan pilihan host — host tidak menentukan film sama sekali. Ini semata titik
 * awal supaya tamu bisa langsung menjepret tanpa harus memutuskan apa pun
 * lebih dulu; menggantinya cukup satu ketukan, kapan saja, bahkan di tengah
 * roll.
 */
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
