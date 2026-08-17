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
  /** Hanya tier ini yang bisa dibuat oleh alur produk saat ini. */
  available: boolean
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
    available: true,
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
    tagline: 'Untuk acara kecil · segera hadir',
    available: false,
    price: 199_000,
    wasPrice: 299_000,
    maxGuests: 50,
    shotsPerGuest: 100,
    retentionDays: null,
    features: [
      'Semua fitur Starter',
      'Sistem reveal bersama',
      'QR code siap cetak',
      'Ringkasan tamu di dashboard',
    ],
  },
  {
    id: 'pesta',
    name: 'Pesta',
    tagline: 'Untuk acara menengah · segera hadir',
    available: false,
    price: 499_000,
    wasPrice: 699_000,
    maxGuests: 150,
    shotsPerGuest: 100,
    retentionDays: null,
    features: [
      'Semua fitur Party',
      'Hingga 150 tamu',
      'Penyimpanan tanpa tanggal kedaluwarsa',
      'Prioritas support',
    ],
    recommended: true,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    tagline: 'Untuk acara besar · segera hadir',
    available: false,
    price: 1_099_000,
    wasPrice: 1_490_000,
    maxGuests: null,
    shotsPerGuest: 100,
    retentionDays: null,
    features: [
      'Semua fitur Pesta',
      'Tamu tak terbatas',
      'Penyimpanan tanpa tanggal kedaluwarsa',
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

export type ActivePresetId =
  | 'natural-clean'
  | 'everyday-100'
  | 'golden-hour-400'
  | 'pastel-400'
  | 'neon-night-1600'
  | 'noir-400'

export type LegacyPresetId = 'film-35mm' | 'film-fuji' | 'film-kodak' | 'film-polaroid'

export type PresetId = ActivePresetId | LegacyPresetId

export interface FilmPreset {
  id: PresetId
  name: string
  /** Karakter warnanya, bukan merek yang ditiru. */
  character: string
  /** Kondisi yang paling aman untuk look ini. */
  bestFor?: string
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

/**
 * Enam look aktif yang tampil di kamera.
 *
 * Semua LUT film berasal dari RawTherapee Film Simulation Collection yang
 * sumber dan lisensinya dapat diaudit (lihat CREDITS.md). Nilainya sengaja
 * konservatif: LUT film dibuat untuk input netral, sedangkan JPEG kamera
 * ponsel sudah mendapat tone mapping, sharpening, dan saturasi dari ISP.
 */
export const FILM_PRESETS: readonly FilmPreset[] = [
  {
    id: 'natural-clean',
    name: 'Natural',
    character: 'Warna asli perangkat, bersih, dan paling aman untuk semua cahaya.',
    bestFor: 'Semua kondisi',
    lut: '/luts/natural-clean.png',
    strength: 0.0,
    lumaLock: 1.0,
    contrast: 0.0,
    grain: 0.0,
    vignette: 0.0,
    halation: 0.0,
  },
  {
    id: 'everyday-100',
    name: 'Everyday 160',
    character: 'Netral hangat dengan kontras lembut dan grain paling halus.',
    bestFor: 'Pilihan aman · indoor/outdoor',
    lut: '/luts/everyday-100.png',
    strength: 0.58,
    lumaLock: 0.82,
    contrast: 0.06,
    grain: 0.06,
    vignette: 0.02,
    halation: 0.0,
  },
  {
    id: 'golden-hour-400',
    name: 'Golden Hour 400',
    character: 'Hangat keemasan tanpa mengorbankan detail kulit dan gaun terang.',
    bestFor: 'Sore · cahaya hangat',
    lut: '/luts/golden-hour-400.png',
    strength: 0.62,
    lumaLock: 0.74,
    contrast: 0.08,
    grain: 0.11,
    vignette: 0.03,
    halation: 0.035,
  },
  {
    id: 'pastel-400',
    name: 'Pastel 100',
    character: 'Warna lapang, hijau tenang, dan highlight lembut untuk suasana cerah.',
    bestFor: 'Outdoor · dekorasi terang',
    lut: '/luts/pastel-400.png',
    strength: 0.66,
    lumaLock: 0.72,
    contrast: 0.06,
    grain: 0.08,
    vignette: 0.02,
    halation: 0.015,
  },
  {
    id: 'neon-night-1600',
    name: 'Resepsi 800',
    character: 'Warna malam tetap hidup dengan pendar hangat yang terkontrol.',
    bestFor: 'Indoor malam · lampu pesta',
    lut: '/luts/neon-night-1600.png',
    strength: 0.48,
    lumaLock: 0.78,
    contrast: 0.08,
    grain: 0.15,
    vignette: 0.04,
    halation: 0.09,
  },
  {
    id: 'noir-400',
    name: 'Noir 400',
    character: 'Hitam putih kaya gradasi dengan tekstur dokumenter yang halus.',
    bestFor: 'Momen emosional · cahaya keras',
    lut: '/luts/noir-400.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.08,
    grain: 0.16,
    vignette: 0.035,
    halation: 0.0,
  },
] as const

/*
 * ID lama tetap bisa dibaca oleh galeri agar metadata foto terdahulu tidak
 * berubah nama. Preset ini tidak ditawarkan untuk jepretan baru.
 */
const LEGACY_FILM_PRESETS: readonly FilmPreset[] = [
  {
    id: 'film-35mm',
    name: '35mm Analog (lama)',
    character: 'Preset generasi sebelumnya.',
    lut: '/luts/film-35mm.png',
    strength: 1,
    lumaLock: 0,
    contrast: 0,
    grain: 0.22,
    vignette: 0,
    halation: 0,
  },
  {
    id: 'film-fuji',
    name: 'Cool Film (lama)',
    character: 'Preset generasi sebelumnya.',
    lut: '/luts/film-fuji.png',
    strength: 1,
    lumaLock: 0,
    contrast: 0,
    grain: 0.16,
    vignette: 0,
    halation: 0,
  },
  {
    id: 'film-kodak',
    name: 'Warm Film (lama)',
    character: 'Preset generasi sebelumnya.',
    lut: '/luts/film-kodak.png',
    strength: 1,
    lumaLock: 0,
    contrast: 0,
    grain: 0.2,
    vignette: 0,
    halation: 0,
  },
  {
    id: 'film-polaroid',
    name: 'Instant Film (lama)',
    character: 'Preset generasi sebelumnya.',
    lut: '/luts/film-polaroid.png',
    strength: 1,
    lumaLock: 0,
    contrast: 0,
    grain: 0.18,
    vignette: 0,
    halation: 0,
  },
] as const

// Default tanpa grade menjaga detail dan warna kulit pada perangkat yang belum
// pernah diuji. Tamu dapat memilih look film setelah melihat kondisi cahaya.
export const DEFAULT_PRESET: ActivePresetId = 'natural-clean'

export function getPreset(id: string): FilmPreset | undefined {
  return [...FILM_PRESETS, ...LEGACY_FILM_PRESETS].find((p) => p.id === id)
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
