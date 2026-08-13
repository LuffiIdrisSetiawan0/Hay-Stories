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
// scripts/build-luts.mjs.
//
// Enam roll memetakan enam momen acara, bukan enam warna acak: momen utama,
// luar ruang, gedung berlampu, warna apa adanya, detail dekorasi, dan hitam
// putih. Stoknya kanon fotografi pernikahan — Portra, Astia, Ektar, Tri-X.
//
// Dua stok dipilih dari hasil ukuran, bukan reputasinya. Fuji 400H push dan
// Portra 800 HC, dua kandidat paling "benar" di atas kertas, ternyata membuang
// 16 dan 29 level biru pada nada kulit gelap — ambang di mana orang mulai
// terlihat terbakar matahari. Pasar acara ini mayoritas berkulit sedang sampai
// gelap, jadi keduanya ditolak.
//
// Pemisahan antar roll diukur lintas palet nyata (kulit, gaun putih, langit,
// dedaunan, bunga, bayangan), bukan pada satu petak kulit saja. Dua film bisa
// identik di kulit tapi jauh berbeda di dedaunan, dan mengukur kulit saja
// membuat lineup yang sehat terlihat gagal.
//
// `lumaLock` sengaja rendah di sini. Ia membereskan angkat nada yang membuat
// gambar cuci, tapi caranya dengan mengembalikan luminansi asli — yang berarti
// ikut memangkas kurva nada film, justru sumber kontras yang dicari. Yang
// menangani wash sekarang `contrast`: kurva-S menekan bayangan turun sekaligus
// memberi punch, dua-duanya searah.
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
  /**
   * 0–1, seberapa banyak kecerahan asli dikembalikan setelah LUT.
   *
   * Inilah yang memungkinkan `strength` tinggi tanpa gambar jadi cuci: warna
   * film diambil penuh, tapi kurva nadanya ditolak karena kamera ponsel sudah
   * menerapkan kurvanya sendiri. Hitam-putih memakai 0 — di sana kurva nada
   * justru inti dari tampilannya.
   */
  lumaLock: number
  /**
   * 0–1, kekuatan kurva-S kontras setelah grading.
   *
   * Terpisah dari LUT dengan sengaja. Kunci nada membuang angkat nada yang
   * membuat gambar cuci, tapi ikut memangkas kurva nada film — dan kurva itulah
   * sumber "punch". Ini mengembalikannya tanpa mengembalikan wash-nya.
   */
  contrast: number
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
    character: 'Momen utama. Kulit hangat natural, warna hidup',
    lut: '/luts/golden-hour-400.png',
    strength: 1.0,
    lumaLock: 0.3,
    contrast: 0.38,
    grain: 0.2,
    vignette: 0.16,
    halation: 0.1,
  },
  {
    id: 'pastel-400',
    name: 'Pastel 100',
    character: 'Luar ruang dan dekorasi. Terang lapang, nada pastel',
    lut: '/luts/pastel-400.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.26,
    grain: 0.1,
    vignette: 0.08,
    halation: 0.06,
  },
  {
    id: 'neon-night-1600',
    name: 'Resepsi 800',
    character: 'Gedung berlampu. Menangani campuran cahaya, pendar hangat',
    lut: '/luts/neon-night-1600.png',
    strength: 1.0,
    lumaLock: 0.3,
    contrast: 0.34,
    grain: 0.32,
    vignette: 0.22,
    halation: 0.38,
  },
  {
    id: 'everyday-100',
    name: 'Everyday 160',
    character: 'Warna apa adanya. Grain paling halus, paling jujur',
    lut: '/luts/everyday-100.png',
    strength: 0.95,
    lumaLock: 0.3,
    contrast: 0.24,
    grain: 0.07,
    vignette: 0.1,
    halation: 0.05,
  },
  {
    id: 'sunday-chrome',
    name: 'Sunday Chrome',
    character: 'Detail, bunga, dan dekorasi. Warna paling jenuh',
    lut: '/luts/sunday-chrome.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.42,
    grain: 0.1,
    vignette: 0.18,
    halation: 0.06,
  },
  {
    id: 'noir-400',
    name: 'Noir 400',
    character: 'Momen emosional. Hitam putih kontras keras',
    lut: '/luts/noir-400.png',
    strength: 1.0,
    lumaLock: 0.0,
    contrast: 0.4,
    grain: 0.42,
    vignette: 0.26,
    halation: 0.0,
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
