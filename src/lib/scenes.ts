/**
 * Satu sumber kebenaran untuk foto contoh di `public/img/scenes/`.
 *
 * Sebelumnya nama berkas dan teks alt-nya disalin di tujuh komponen dan empat
 * halaman acara. Salinan itulah yang membuat keterangannya melenceng dari
 * isinya — kue cokelat polos sempat diberi alt "Perayaan ulang tahun kecil
 * bersama sahabat", dan foto empat sahabat di tepi laut dipakai sebagai
 * ilustrasi acara kantor.
 *
 * Semua master 2400x1600 (3:2), dibuat oleh
 * `scripts/download-and-process-scenes.mjs`. Provenance-nya dicatat di
 * `CREDITS.md`.
 */

export interface Scene {
  /** Jalur publik, siap dipakai sebagai `src` next/image. */
  src: string
  /** Apa yang benar-benar terlihat di foto — hasil membukanya, bukan menebak dari nama. */
  alt: string
  /**
   * Titik fokus saat foto dipangkas MELEBAR (16:9, 4:3, strip viewfinder).
   * Pemangkasan arah ini membuang bagian atas dan bawah, jadi yang diatur
   * nilai tegaknya.
   */
  focusWide: string
  /**
   * Titik fokus saat foto dipangkas MENINGGI (4:5, 3:4) atau jadi bujur
   * sangkar. Pemangkasan arah ini membuang bagian kiri dan kanan.
   *
   * Dua nilai, bukan satu: sumber 3:2 kehilangan 16% tingginya di kotak 16:9
   * tetapi 47% lebarnya di kotak 4:5. Satu nilai tidak bisa melayani keduanya.
   */
  focusTall: string
}

export type SceneId =
  | 'tamuMemotret'
  | 'pernikahanBuket'
  | 'ulangTahunTaman'
  | 'acaraKantor'
  | 'pestaMalam'
  | 'mejaDekorasi'

export const SCENES: Record<SceneId, Scene> = {
  tamuMemotret: {
    src: '/img/scenes/tamu-memotret.webp',
    alt: 'Tamu memotret rombongan pengiring pengantin lewat layar ponselnya',
    // Ponselnya duduk tepat di tengah bingkai, tegak maupun mendatar.
    focusWide: 'center 50%',
    focusTall: 'center',
  },
  pernikahanBuket: {
    src: '/img/scenes/pernikahan-buket.webp',
    alt: 'Pengantin melempar buket ke arah para tamu di halaman pada siang hari',
    // Buketnya ada di 10% teratas. Digeser ke atas supaya tidak ikut terpotong.
    focusWide: 'center 40%',
    focusTall: 'center',
  },
  ulangTahunTaman: {
    src: '/img/scenes/ulang-tahun-taman.webp',
    alt: 'Sekelompok teman bertopi pesta mengelilingi kue ulang tahun di taman',
    // Wajah dan kuenya di paruh atas; alas piknik di bawah boleh terpotong.
    focusWide: 'center 42%',
    focusTall: 'center',
  },
  acaraKantor: {
    src: '/img/scenes/acara-kantor.webp',
    alt: 'Rekan kerja bersulang sambil tertawa di ruang santai kantor',
    focusWide: 'center 45%',
    focusTall: 'center',
  },
  pestaMalam: {
    src: '/img/scenes/pesta-malam.webp',
    alt: 'Kerumunan mengangkat tangan di bawah lampu panggung dan sorot laser',
    // Panggung dan lampunya di paruh atas.
    focusWide: 'center 45%',
    focusTall: 'center',
  },
  mejaDekorasi: {
    src: '/img/scenes/meja-dekorasi.webp',
    alt: 'Meja resepsi berhias rangkaian bunga di ruangan bercahaya hangat',
    // Rangkaian bunganya justru di bagian bawah bingkai.
    focusWide: 'center 55%',
    focusTall: 'center',
  },
}

/** Urutan tetap untuk grid dan dinding momen. */
export const SCENE_ORDER: readonly SceneId[] = [
  'pernikahanBuket',
  'ulangTahunTaman',
  'tamuMemotret',
  'pestaMalam',
  'acaraKantor',
  'mejaDekorasi',
]

export const SCENE_LIST: readonly Scene[] = SCENE_ORDER.map((id) => SCENES[id])

/**
 * Variabel CSS titik fokus untuk satu foto.
 *
 * Nilainya dikirim sebagai custom property, bukan langsung sebagai
 * `objectPosition`, supaya pemilihan lebar/tinggi tetap tinggal di media query
 * CSS masing-masing komponen. Kalau dipilih di JavaScript, setiap komponen
 * harus menduplikasi breakpoint-nya sendiri dan keduanya pasti menyimpang.
 */
export function sceneFocus(scene: Scene): Record<string, string> {
  return {
    '--focus-wide': scene.focusWide,
    '--focus-tall': scene.focusTall,
  }
}
