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
// Tabel warnanya diturunkan dari stok film sungguhan lewat RawTherapee Film
// Simulation Collection (CC BY-SA 4.0) — lihat CREDITS.md dan
// scripts/build-luts.mjs. Grade buatan tangan sebelumnya menggeser abu-abu
// tengah hanya 6 level dari 255, di bawah ambang yang bisa dilihat mata; yang
// sekarang bergeser rata-rata 15 dan sampai 67 level.
//
// Nama sengaja orisinal. Menamai preset dengan merek film asli (Kodak Portra,
// Fujifilm, CineStill, Ilford) adalah penggunaan merek dagang terdaftar dan
// berisiko secara hukum — sekalipun arsip sumbernya memakai nama itu untuk
// keperluan informatif, dan sekalipun kompetitor melakukannya.
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
  /**
   * 0–1, seberapa jauh hasil grade dicampur ke gambar aslinya.
   *
   * Jarang 1. Tabel warnanya dibuat untuk konversi RAW yang datar dan netral,
   * sementara yang kita beri adalah keluaran kamera ponsel yang kontras dan
   * saturasinya sudah dinaikkan ISP. Menerapkannya penuh berarti memproses dua
   * kali: pada Golden Hour 400 itu mengangkat nada tengah 30 level dan
   * mendorong kulit sedang 37 level ke merah sambil membuang 18 level biru —
   * semua orang jadi terlihat terbakar matahari.
   *
   * Hitam-putih adalah pengecualian dan harus tetap 1: dicampur sebagian, ia
   * bukan hitam-putih lagi, cuma gambar yang pudar warnanya.
   */
  strength: number
  /** 0–1, kekuatan grain prosedural. */
  grain: number
  /** 0–1, kekuatan vignette. */
  vignette: number
  /** 0–1, halation (pendar merah di sekitar sorotan terang). */
  halation: number
}

/*
 * Urutannya adalah urutan tampil di kamera, dan yang pertama jadi roll bawaan.
 * Tiga teratas menjawab kondisi paling sering di acara pernikahan Indonesia:
 * kulit di bawah lampu gedung, dekorasi terang di luar ruang, dan resepsi
 * malam berlampu warna.
 */
export const FILM_PRESETS: readonly FilmPreset[] = [
  {
    id: 'golden-hour-400',
    name: 'Golden Hour 400',
    character: 'Kulit hangat natural, kontras lembut',
    lut: '/luts/golden-hour-400.png',
    strength: 0.5,
    grain: 0.12,
    vignette: 0.07,
    halation: 0.05,
  },
  {
    id: 'pastel-400',
    name: 'Pastel 400',
    character: 'Terang lapang, hijau lembut, nada pastel',
    lut: '/luts/pastel-400.png',
    strength: 0.55,
    grain: 0.08,
    vignette: 0.04,
    halation: 0.03,
  },
  {
    id: 'neon-night-1600',
    name: 'Neon Night 1600',
    character: 'Untuk resepsi berlampu, grain kasar, pendar merah',
    lut: '/luts/neon-night-1600.png',
    strength: 0.6,
    grain: 0.3,
    vignette: 0.14,
    halation: 0.25,
  },
  {
    id: 'everyday-100',
    name: 'Everyday 100',
    character: 'Netral dan jernih, aman untuk segala kondisi',
    lut: '/luts/everyday-100.png',
    strength: 0.35,
    grain: 0.06,
    vignette: 0.05,
    halation: 0.03,
  },
  {
    id: 'sunday-chrome',
    name: 'Sunday Chrome',
    character: 'Warna jenuh, kontras tinggi, biru pekat',
    lut: '/luts/sunday-chrome.png',
    strength: 0.5,
    grain: 0.04,
    vignette: 0.09,
    halation: 0.025,
  },
  {
    id: 'noir-400',
    name: 'Noir 400',
    character: 'Hitam putih, grain kasar, kontras dramatis',
    lut: '/luts/noir-400.png',
    strength: 1.0,
    grain: 0.35,
    vignette: 0.16,
    halation: 0,
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
