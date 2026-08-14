/**
 * Membangkitkan enam ilustrasi adegan acara untuk kartu di hero.
 *
 *   node scripts/generate-hero-scenes.mjs
 *
 * Kenapa ilustrasi, bukan foto: kartu di hero adalah hal pertama yang dilihat
 * pengunjung, dan sebelum ada foto acara sungguhan satu-satunya alternatif
 * adalah stok foto orang lain — yang justru menjanjikan sesuatu yang bukan
 * milik kita. Ilustrasi datar jujur soal apa dirinya: ia menunjukkan JENIS
 * momen yang ditangkap produk ini tanpa berpura-pura jadi hasil jepretan.
 *
 * Keenamnya sengaja beda adegan, bukan satu gambar dalam enam warna. Satu
 * gambar yang diulang membuat keenam roll terlihat seperti filter belaka;
 * enam momen berbeda menunjukkan bahwa tiap roll memang punya kondisi acara
 * yang jadi tempatnya.
 *
 * Digambar dengan bentuk dasar SVG lalu dirasterisasi sharp. Tidak ada filter
 * SVG yang dipakai — dukungannya berbeda-beda antar perender, dan kabur di
 * sini disimulasikan dengan gradien radial berlapis yang selalu bisa
 * diandalkan.
 *
 * GANTI dengan foto acara asli begitu ada. Lihat CARDS di
 * src/components/landing/Hero.tsx.
 */

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/*
 * Kartu tampil sekitar 192px. Empat kali lipatnya sudah lebih dari cukup untuk
 * layar retina, dan menahan enam berkas ini tetap ringan — hero memuat
 * keenamnya sekaligus sebelum WebGL mulai bekerja.
 */
const W = 720
const H = 960

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img', 'scenes')

/* PRNG bersemai supaya hasilnya sama setiap kali dijalankan. */
let seed = 20260814
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const between = (a, b) => a + rand() * (b - a)

/* ---------------------------------------------------------------------------
 * Palet
 *
 * Sengaja hangat-netral, bukan berwarna kuat. Tiap gambar nanti dilewatkan LUT
 * film yang punya karakter warnanya sendiri; kalau ilustrasinya sudah pekat
 * warna sejak awal, karakter roll-nya tertimbun dan keenam kartu kembali
 * terlihat mirip.
 * ------------------------------------------------------------------------- */
const INK = '#0b0908'
const INK_SOFT = '#171310'

/* ---------------------------------------------------------------------------
 * Bentuk yang dipakai berulang
 * ------------------------------------------------------------------------- */

/**
 * Siluet orang berdiri.
 *
 * Ditulis sebagai satu bentuk padat, bukan kepala + badan + lengan terpisah.
 * Pada 192px lengan yang digambar terpisah cuma jadi bercak yang mengotori
 * siluetnya; yang terbaca di ukuran itu hanya garis luarnya.
 */
function person(x, baseY, h, { dress = false, fill = INK, armsUp = false } = {}) {
  const headR = h * 0.072
  const headY = baseY - h + headR
  const shoulderY = headY + headR * 2.1
  const shoulderW = h * 0.112
  const hipW = dress ? h * 0.2 : h * 0.082

  const arms = armsUp
    ? `<path d="M ${x - shoulderW * 0.8} ${shoulderY + h * 0.02}
                L ${x - shoulderW * 2.1} ${shoulderY - h * 0.19}
                L ${x - shoulderW * 1.5} ${shoulderY - h * 0.23}
                L ${x - shoulderW * 0.3} ${shoulderY + h * 0.05} Z"
             fill="${fill}"/>
       <path d="M ${x + shoulderW * 0.8} ${shoulderY + h * 0.02}
                L ${x + shoulderW * 2.1} ${shoulderY - h * 0.19}
                L ${x + shoulderW * 1.5} ${shoulderY - h * 0.23}
                L ${x + shoulderW * 0.3} ${shoulderY + h * 0.05} Z"
             fill="${fill}"/>`
    : ''

  return `
    ${arms}
    <circle cx="${x}" cy="${headY}" r="${headR}" fill="${fill}"/>
    <path d="M ${x - shoulderW} ${shoulderY}
             Q ${x} ${shoulderY - headR * 0.7} ${x + shoulderW} ${shoulderY}
             L ${x + hipW} ${baseY}
             L ${x - hipW} ${baseY} Z"
          fill="${fill}"/>`
}

/** Kepala-dan-bahu, untuk kerumunan yang dilihat dari belakang. */
function bust(x, baseY, w, fill = INK) {
  const headR = w * 0.3
  return `
    <circle cx="${x}" cy="${baseY - w * 1.05} " r="${headR}" fill="${fill}"/>
    <path d="M ${x - w * 0.62} ${baseY}
             Q ${x - w * 0.58} ${baseY - w * 0.72} ${x} ${baseY - w * 0.72}
             Q ${x + w * 0.58} ${baseY - w * 0.72} ${x + w * 0.62} ${baseY} Z"
          fill="${fill}"/>`
}

/**
 * Cahaya membulat. Dipakai untuk bokeh, nyala lilin, dan pendar lampu.
 * Tiap pemanggilan membuat gradiennya sendiri karena warnanya berbeda-beda.
 */
function glow(id, cx, cy, r, color, opacity = 0.5, core = 0.22) {
  return {
    def: `<radialGradient id="${id}">
            <stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/>
            <stop offset="${core * 100}%" stop-color="${color}" stop-opacity="${opacity * 0.62}"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </radialGradient>`,
    use: `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>`,
  }
}

/** Sekumpulan bokeh hangat. Mengembalikan { defs, body } siap ditempel. */
function bokehField(prefix, count, { yMax = H, rMin = 8, rMax = 46, alpha = 0.4 } = {}) {
  const tints = ['#ffcf9a', '#ffb877', '#ffe2c2', '#f0a464']
  let defs = ''
  let body = ''
  for (let i = 0; i < count; i++) {
    const g = glow(
      `${prefix}${i}`,
      between(0, W),
      between(0, yMax),
      between(rMin, rMax),
      tints[Math.floor(rand() * tints.length)],
      between(alpha * 0.4, alpha)
    )
    defs += g.def
    body += g.use
  }
  return { defs, body }
}

/* ---------------------------------------------------------------------------
 * Enam adegan
 *
 * Tiap fungsi mengembalikan SVG utuh. Komposisinya sengaja dibuat berani dan
 * sederhana: pada 192px yang terbaca cuma bentuk besar dan arah cahaya, jadi
 * detail halus hanya akan jadi bubur.
 * ------------------------------------------------------------------------- */

/** 01 — Pelaminan. Dua orang di bawah gerbang bercahaya. */
function pelaminan() {
  const halo = glow('p-halo', W * 0.5, H * 0.44, W * 0.62, '#ffb974', 0.55, 0.1)
  const floor = glow('p-floor', W * 0.5, H * 0.86, W * 0.5, '#c98c52', 0.3, 0.05)
  const bokeh = bokehField('pb', 26, { yMax: H * 0.62, rMin: 6, rMax: 34, alpha: 0.42 })
  const baseY = H * 0.84

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="p-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#120d0a"/>
      <stop offset="55%" stop-color="#241811"/>
      <stop offset="100%" stop-color="#0d0907"/>
    </linearGradient>
    ${halo.def}${floor.def}${bokeh.defs}
  </defs>

  <rect width="${W}" height="${H}" fill="url(#p-bg)"/>
  ${halo.use}
  ${bokeh.body}

  <!-- Gerbang: dua sisi tegak dengan lengkung di atas, digambar sebagai satu
       jalur tebal supaya tepinya tetap bersih saat diperkecil. -->
  <path d="M ${W * 0.24} ${baseY} L ${W * 0.24} ${H * 0.38}
           Q ${W * 0.5} ${H * 0.16} ${W * 0.76} ${H * 0.38}
           L ${W * 0.76} ${baseY}"
        fill="none" stroke="#3a281b" stroke-width="${W * 0.035}" stroke-linecap="round"/>

  ${floor.use}
  ${person(W * 0.435, baseY, H * 0.32, { fill: INK })}
  ${person(W * 0.565, baseY, H * 0.305, { fill: INK, dress: true })}

  <rect y="${baseY}" width="${W}" height="${H - baseY}" fill="#0a0705"/>
</svg>`
}

/** 02 — Meja dekorasi di dekat jendela. Satu-satunya adegan siang. */
function mejaDekorasi() {
  const win = glow('m-win', W * 0.3, H * 0.28, W * 0.6, '#fff4e2', 0.72, 0.18)
  const tableY = H * 0.66

  const vase = (x, w, h, bloomR) => `
    <path d="M ${x - w / 2} ${tableY}
             Q ${x - w * 0.34} ${tableY - h * 0.72} ${x - w * 0.2} ${tableY - h}
             L ${x + w * 0.2} ${tableY - h}
             Q ${x + w * 0.34} ${tableY - h * 0.72} ${x + w / 2} ${tableY} Z"
          fill="#2c231b" opacity="0.9"/>
    <circle cx="${x - bloomR * 0.8}" cy="${tableY - h - bloomR * 0.9}" r="${bloomR}" fill="#e8d3bd"/>
    <circle cx="${x + bloomR * 0.75}" cy="${tableY - h - bloomR * 1.4}" r="${bloomR * 0.82}" fill="#d9bfa4"/>
    <circle cx="${x}" cy="${tableY - h - bloomR * 2.1}" r="${bloomR * 0.66}" fill="#efdfcc"/>`

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="m-bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#e9dccb"/>
      <stop offset="60%" stop-color="#cdb99f"/>
      <stop offset="100%" stop-color="#8d735c"/>
    </linearGradient>
    <linearGradient id="m-table" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#b59b7c"/>
      <stop offset="100%" stop-color="#6d5940"/>
    </linearGradient>
    ${win.def}
  </defs>

  <rect width="${W}" height="${H}" fill="url(#m-bg)"/>

  <!-- Jendela: bidang terang dengan palang, sumber cahaya seluruh adegan. -->
  <rect x="${W * 0.08}" y="${H * 0.06}" width="${W * 0.46}" height="${H * 0.42}" rx="${W * 0.03}" fill="#fdf6ea" opacity="0.95"/>
  <rect x="${W * 0.305}" y="${H * 0.06}" width="${W * 0.012}" height="${H * 0.42}" fill="#c9b295"/>
  <rect x="${W * 0.08}" y="${H * 0.265}" width="${W * 0.46}" height="${W * 0.012}" fill="#c9b295"/>
  ${win.use}

  <rect y="${tableY}" width="${W}" height="${H - tableY}" fill="url(#m-table)"/>

  ${vase(W * 0.3, W * 0.13, H * 0.13, W * 0.05)}
  ${vase(W * 0.56, W * 0.1, H * 0.19, W * 0.042)}
  ${vase(W * 0.76, W * 0.11, H * 0.1, W * 0.045)}

  <!-- Bayangan panjang ke kanan, searah dengan jendela di kiri. -->
  <ellipse cx="${W * 0.58}" cy="${tableY + H * 0.02}" rx="${W * 0.42}" ry="${H * 0.018}" fill="#5a4832" opacity="0.35"/>
</svg>`
}

/** 03 — Kue dan lilin. */
function kue() {
  const pool = glow('k-pool', W * 0.5, H * 0.55, W * 0.58, '#ffc98a', 0.5, 0.12)
  const tableY = H * 0.78
  const cakeW = W * 0.46
  const tier1 = H * 0.14
  const tier2 = H * 0.1

  let flames = ''
  let flameDefs = ''
  for (let i = 0; i < 5; i++) {
    const x = W * 0.5 + (i - 2) * cakeW * 0.16
    const wickTop = tableY - tier1 - tier2 - H * 0.06
    const g = glow(`k-f${i}`, x, wickTop, W * 0.07, '#ffd79b', 0.75, 0.12)
    flameDefs += g.def
    flames += `
      <rect x="${x - W * 0.008}" y="${wickTop}" width="${W * 0.016}" height="${H * 0.06}" fill="#e6d5be"/>
      ${g.use}
      <ellipse cx="${x}" cy="${wickTop - H * 0.006}" rx="${W * 0.011}" ry="${H * 0.014}" fill="#ffeec9"/>`
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="k-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0e0a07"/>
      <stop offset="100%" stop-color="#1d140d"/>
    </linearGradient>
    <linearGradient id="k-shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.28"/>
    </linearGradient>
    ${pool.def}${flameDefs}
  </defs>

  <rect width="${W}" height="${H}" fill="url(#k-bg)"/>
  ${pool.use}

  <rect y="${tableY}" width="${W}" height="${H - tableY}" fill="#241a12"/>

  <!-- Dua tingkat, yang atas lebih sempit. -->
  <rect x="${W * 0.5 - cakeW / 2}" y="${tableY - tier1}" width="${cakeW}" height="${tier1}" rx="${W * 0.018}" fill="#e2cdb2"/>
  <rect x="${W * 0.5 - cakeW * 0.33}" y="${tableY - tier1 - tier2}" width="${cakeW * 0.66}" height="${tier2}" rx="${W * 0.016}" fill="#eeddc6"/>

  <!-- Sisi kanan meredup bertahap: cahaya datang dari kiri atas. Gradien, bukan
       balok pekat — balok bertepi tajam terbaca sebagai benda kedua. -->
  <rect x="${W * 0.5 - cakeW / 2}" y="${tableY - tier1}" width="${cakeW}" height="${tier1}" rx="${W * 0.018}" fill="url(#k-shade)"/>
  <rect x="${W * 0.5 - cakeW * 0.33}" y="${tableY - tier1 - tier2}" width="${cakeW * 0.66}" height="${tier2}" rx="${W * 0.016}" fill="url(#k-shade)"/>

  ${flames}
  <ellipse cx="${W * 0.5}" cy="${tableY + H * 0.012}" rx="${cakeW * 0.72}" ry="${H * 0.016}" fill="#0a0705" opacity="0.55"/>
</svg>`
}

/** 04 — Potret satu tamu dengan cahaya tepi. */
function potret() {
  const rim = glow('n-rim', W * 0.92, H * 0.24, W * 0.52, '#fff0d8', 0.45, 0.08)

  /*
   * Digambar sebagai kepala-dan-bahu yang memenuhi bingkai, bukan lewat helper
   * `person()`. Helper itu untuk orang berdiri utuh; membesarkannya sampai
   * seukuran potret cuma mendorong kepalanya ke luar bingkai dan menyisakan
   * badan memanjang tanpa bentuk.
   */
  /* Kepala lonjong, bukan bundar sempurna — lingkaran penuh terbaca sebagai
     ikon, bukan kepala. */
  const headRx = W * 0.2
  const headRy = W * 0.235
  const headX = W * 0.47
  const headY = H * 0.36
  const neckTop = headY + headRy * 0.84
  const shoulderY = headY + headRy * 1.64

  const figure = (fill, dx = 0, dy = 0) => `
    <g transform="translate(${dx} ${dy})">
      <path d="M ${headX - headRx * 0.34} ${neckTop}
               L ${headX + headRx * 0.34} ${neckTop}
               L ${headX + headRx * 0.42} ${shoulderY}
               L ${headX - headRx * 0.42} ${shoulderY} Z" fill="${fill}"/>
      <ellipse cx="${headX}" cy="${headY}" rx="${headRx}" ry="${headRy}" fill="${fill}"/>
      <path d="M ${headX - W * 0.66} ${H}
               Q ${headX - W * 0.36} ${shoulderY - H * 0.004} ${headX} ${shoulderY - H * 0.014}
               Q ${headX + W * 0.36} ${shoulderY - H * 0.004} ${headX + W * 0.66} ${H} Z"
            fill="${fill}"/>
    </g>`

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="n-bg" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0%" stop-color="#0a0908"/>
      <stop offset="65%" stop-color="#1b1613"/>
      <stop offset="100%" stop-color="#332a22"/>
    </linearGradient>
    ${rim.def}
  </defs>

  <rect width="${W}" height="${H}" fill="url(#n-bg)"/>
  ${rim.use}

  <!--
    Cahaya tepi dibuat dari dua salinan siluet: satu lebih terang digeser ke
    kanan atas, lalu siluet gelap ditumpuk di atasnya. Selisih posisinya yang
    muncul sebagai garis cahaya di pinggir wajah — jauh lebih bersih daripada
    menstroke bentuknya, yang akan memberi garis di kedua sisi sekaligus.
  -->
  ${figure('#cdae87', W * 0.012, -H * 0.006)}
  ${figure('#080706')}
</svg>`
}

/** 05 — Lantai dansa. Satu-satunya adegan berwarna kuat. */
function lantaiDansa() {
  const LIGHTS = [
    { x: 0.19, spread: 0.24, color: '#ff4f9a', id: 'm' },
    { x: 0.5, spread: 0.28, color: '#3fd0ff', id: 'c' },
    { x: 0.81, spread: 0.24, color: '#ffa83f', id: 'a' },
  ]

  /*
   * Tiap sorot diberi gradien yang memudar ke bawah, bukan warna rata. Baji
   * warna rata terbaca sebagai potongan kertas; yang membuatnya terbaca sebagai
   * CAHAYA adalah pudarnya makin jauh dari sumber. Sorotnya juga sengaja
   * dipanjangkan sampai dasar bingkai supaya kerumunan di bawah berdiri di
   * dalam cahaya, bukan di kegelapan di bawah ujungnya.
   */
  let beamDefs = ''
  let beams = ''
  for (const l of LIGHTS) {
    beamDefs += `
      <linearGradient id="d-b${l.id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${l.color}" stop-opacity="0.5"/>
        <stop offset="45%" stop-color="${l.color}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${l.color}" stop-opacity="0.03"/>
      </linearGradient>`
    beams += `
      <path d="M ${W * (l.x - 0.035)} 0 L ${W * (l.x + 0.035)} 0
               L ${W * (l.x + l.spread)} ${H} L ${W * (l.x - l.spread)} ${H} Z"
            fill="url(#d-b${l.id})"/>`
  }

  let orbDefs = ''
  let orbs = ''
  for (const l of LIGHTS) {
    const g = glow(`d-o${l.id}`, W * l.x, H * 0.07, W * 0.19, l.color, 0.7, 0.1)
    orbDefs += g.def
    orbs += g.use
  }

  /* Genangan cahaya di lantai — ini yang memberi kerumunan sesuatu untuk
     dijadikan latar, jadi kepalanya terbaca sebagai bentuk. */
  const pool = glow('d-pool', W * 0.5, H * 0.93, W * 0.72, '#8f6cff', 0.34, 0.06)

  let crowd = ''
  const baseY = H * 1.03
  for (let i = 0; i < 6; i++) {
    crowd += bust(
      W * (0.1 + i * 0.16) + between(-14, 14),
      baseY - between(0, H * 0.045),
      W * between(0.17, 0.23),
      '#07060a'
    )
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="d-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d0812"/>
      <stop offset="55%" stop-color="#160f1c"/>
      <stop offset="100%" stop-color="#0a0710"/>
    </linearGradient>
    ${beamDefs}${orbDefs}${pool.def}
  </defs>

  <rect width="${W}" height="${H}" fill="url(#d-bg)"/>
  ${beams}
  ${orbs}
  ${pool.use}
  ${crowd}
</svg>`
}

/** 06 — Lempar konfeti. */
function konfeti() {
  const sun = glow('c-sun', W * 0.68, H * 0.2, W * 0.55, '#ffe0b0', 0.55, 0.12)
  const baseY = H * 0.9

  const colors = ['#e9c98f', '#d98f6a', '#f2e3cd', '#b58a5f', '#e5b07c']
  let bits = ''
  for (let i = 0; i < 54; i++) {
    const x = between(0, W)
    const y = between(0, H * 0.82)
    const w = between(W * 0.012, W * 0.03)
    const h = between(W * 0.006, W * 0.014)
    bits += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h * 0.3}"
                   fill="${colors[Math.floor(rand() * colors.length)]}"
                   opacity="${between(0.55, 1)}"
                   transform="rotate(${between(-70, 70)} ${x + w / 2} ${y + h / 2})"/>`
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="c-sky" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#5e4630"/>
      <stop offset="55%" stop-color="#3a2b1e"/>
      <stop offset="100%" stop-color="#1a1310"/>
    </linearGradient>
    ${sun.def}
  </defs>

  <rect width="${W}" height="${H}" fill="url(#c-sky)"/>
  ${sun.use}

  ${person(W * 0.34, baseY, H * 0.42, { fill: INK_SOFT, armsUp: true })}
  ${person(W * 0.6, baseY, H * 0.38, { fill: INK, armsUp: true, dress: true })}

  ${bits}
  <rect y="${baseY}" width="${W}" height="${H - baseY}" fill="#100c09"/>
</svg>`
}

/* ---------------------------------------------------------------------------
 * Pemrosesan akhir
 * ------------------------------------------------------------------------- */

/**
 * Grain halus dan vignette.
 *
 * Bukan hiasan: bidang warna datar hasil rasterisasi SVG punya gradien yang
 * terlalu bersih, dan JPEG mengubahnya jadi pita-pita yang terlihat jelas di
 * area gelap. Derau sedikit memecah pita itu. Vignette-nya menahan mata tetap
 * di tengah bingkai.
 */
function finish(buf, w, h) {
  const cx = w / 2
  const cy = h / 2
  const maxD = Math.hypot(cx, cy)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 3
      const v = 1 - 0.34 * Math.pow(Math.hypot(x - cx, y - cy) / maxD, 2.1)
      const n = (rand() - 0.5) * 8
      buf[p] = Math.max(0, Math.min(255, buf[p] * v + n))
      buf[p + 1] = Math.max(0, Math.min(255, buf[p + 1] * v + n))
      buf[p + 2] = Math.max(0, Math.min(255, buf[p + 2] * v + n))
    }
  }
  return buf
}

const SCENES = [
  { file: '01-pelaminan.jpg', label: 'Pelaminan', build: pelaminan },
  { file: '02-meja-dekorasi.jpg', label: 'Meja dekorasi', build: mejaDekorasi },
  { file: '03-kue.jpg', label: 'Kue dan lilin', build: kue },
  { file: '04-potret.jpg', label: 'Potret tamu', build: potret },
  { file: '05-lantai-dansa.jpg', label: 'Lantai dansa', build: lantaiDansa },
  { file: '06-konfeti.jpg', label: 'Lempar konfeti', build: konfeti },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  for (const scene of SCENES) {
    const svg = scene.build()

    const { data, info } = await sharp(Buffer.from(svg))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const out = join(OUT_DIR, scene.file)
    await sharp(finish(data, info.width, info.height), {
      raw: { width: info.width, height: info.height, channels: 3 },
    })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(out)

    console.log(`  ${scene.file.padEnd(22)} ${scene.label}`)
  }

  console.log(`\n${SCENES.length} adegan ${W}x${H} -> public/img/scenes/`)
  console.log('GANTI dengan foto acara asli begitu ada.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
