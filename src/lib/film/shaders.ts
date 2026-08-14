/**
 * Shader emulasi film.
 *
 * Urutan operasi mengikuti bagaimana film sungguhan bekerja, bukan urutan yang
 * paling mudah ditulis:
 *
 *   1. Halation — cahaya menembus emulsi, memantul di alas film, dan kembali
 *      sebagai pendar kemerahan di sekitar sorotan terang. Terjadi pada negatif,
 *      jadi SEBELUM pengembangan warna.
 *   2. Vignette — efek lensa, juga terjadi sebelum pengembangan.
 *   3. LUT — pengembangan warna itu sendiri.
 *   4. Grain — butiran perak ada di emulsi, tapi ditambahkan setelah LUT supaya
 *      tetap netral dan tidak ikut tergeser warnanya.
 */

export const VERTEX_SHADER = /* glsl */ `#version 300 es
in vec2 aPosition;
out vec2 vUv;

/**
 * Seberapa "kulit" sebuah warna, 0..1.
 *
 * Dihitung di ruang YCbCr karena di sanalah nada kulit menempati wilayah sempit
 * yang stabil — dari kulit paling terang sampai paling gelap, Cb dan Cr-nya
 * berdekatan, sementara di RGB ketiganya bergerak bersama sehingga tidak ada
 * batas yang bisa dipakai. Ini alasan yang sama kenapa deteksi wajah klasik
 * memakai ruang ini.
 *
 * Tepinya dilembutkan dengan smoothstep, bukan ambang keras: batas tajam antara
 * "kulit" dan "bukan kulit" akan terlihat sebagai bercak di pipi yang setengah
 * terkena cahaya.
 */
float skinMask(vec3 c) {
  float y  = dot(c, vec3(0.299, 0.587, 0.114));
  float cb = (c.b - y) * 0.564 + 0.5;
  float cr = (c.r - y) * 0.713 + 0.5;

  float inCb = smoothstep(0.28, 0.34, cb) * (1.0 - smoothstep(0.48, 0.54, cb));
  float inCr = smoothstep(0.50, 0.55, cr) * (1.0 - smoothstep(0.66, 0.72, cr));

  // Bayangan pekat dan sorotan gosong tidak punya informasi kulit yang berguna.
  float inY = smoothstep(0.12, 0.22, y) * (1.0 - smoothstep(0.92, 0.99, y));

  return inCb * inCr * inY;
}

/**
 * Menghaluskan kulit tanpa membuat wajah jadi plastik.
 *
 * Prinsipnya bukan blur, melainkan menekan detail BERKONTRAS RENDAH saja.
 * Jerawat, pori, dan bekas noda adalah selisih kecil terhadap kulit di
 * sekitarnya; alis, bulu mata, dan garis bibir adalah selisih besar. Dengan
 * menimbang tiap piksel berdasarkan besar selisihnya, yang pertama meluruh dan
 * yang kedua utuh — itulah beda antara kulit yang bersih dan wajah yang
 * kehilangan bentuk.
 *
 * Radiusnya fraksi dari sisi gambar, bukan hitungan texel tetap. Pelajaran yang
 * sama dengan grain dan halation: radius texel tetap membuat pratinjau 900 px
 * dan simpanan 2560 px menghaluskan pada skala yang berbeda.
 */
vec3 smoothSkin(vec2 uv, vec3 base, float amount) {
  if (amount <= 0.0) return base;

  float mask = skinMask(base);
  if (mask <= 0.001) return base;

  vec2 texel = 1.0 / uResolution;
  float radius = min(uResolution.x, uResolution.y) * 0.006;

  vec3 sum = vec3(0.0);
  float weight = 0.0;

  // Dua cincin: satu rapat untuk pori, satu lebar untuk noda yang lebih besar.
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853981634;
    vec2 dir = vec2(cos(a), sin(a));

    for (int r = 1; r <= 2; r++) {
      vec3 s = texture(uSource, clamp(uv + dir * texel * radius * float(r), 0.0, 1.0)).rgb;

      // Sampel yang jauh berbeda dari piksel ini hampir pasti bukan kulit yang
      // sama — mata, rambut, latar. Bobotnya dijatuhkan supaya tepinya tidak
      // ikut luntur.
      float diff = length(s - base);
      float w = exp(-diff * diff * 90.0) / float(r);

      sum += s * w;
      weight += w;
    }
  }

  vec3 blurred = sum / max(weight, 0.0001);

  // Detail dikembalikan sebagian: nol berarti plastik, satu berarti tidak ada
  // yang berubah. Yang dicari ada di antaranya.
  vec3 detail = base - blurred;
  float keep = mix(1.0, 0.25, amount * mask);

  return blurred + detail * keep;
}

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

export const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uSource;
uniform sampler2D uLut;
uniform vec2  uResolution;
uniform float uLutSize;
uniform float uGrain;
uniform float uVignette;
uniform float uHalation;
uniform float uSeed;
uniform float uIntensity;
uniform float uLumaLock;
uniform float uContrast;
uniform float uSmooth;
uniform bool  uMirror;
uniform bool  uFlipY;

in vec2 vUv;
out vec4 fragColor;

const float LUMA_R = 0.2126;
const float LUMA_G = 0.7152;
const float LUMA_B = 0.0722;

float luma(vec3 c) {
  return dot(c, vec3(LUMA_R, LUMA_G, LUMA_B));
}

/**
 * Sampel LUT 3D yang disimpan sebagai strip horizontal:
 * lebar = size*size, tinggi = size. Potongan ke-i adalah irisan biru,
 * di dalamnya x = merah dan y = hijau.
 *
 * Inset setengah teksel pada x dan y menjaga penyaringan bilinear tetap di
 * dalam satu irisan, sehingga tidak ada rembesan warna antar-irisan.
 */
vec3 sampleLut(vec3 c, float size) {
  c = clamp(c, 0.0, 1.0);

  float sliceSize      = 1.0 / size;
  float slicePixelSize = sliceSize / size;
  float sliceInnerSize = slicePixelSize * (size - 1.0);

  float zPos    = c.b * (size - 1.0);
  float zSlice0 = floor(zPos);
  float zSlice1 = min(zSlice0 + 1.0, size - 1.0);
  float zLerp   = zPos - zSlice0;

  float xOffset = slicePixelSize * 0.5 + c.r * sliceInnerSize;
  float v       = (0.5 + c.g * (size - 1.0)) / size;

  vec3 c0 = texture(uLut, vec2(xOffset + zSlice0 * sliceSize, v)).rgb;
  vec3 c1 = texture(uLut, vec2(xOffset + zSlice1 * sliceSize, v)).rgb;

  return mix(c0, c1, zLerp);
}

/** Hash cepat untuk grain. Deterministik per piksel per frame. */
float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p + 19.19);
  return fract((p.x + p.y) * p.x);
}

/**
 * Halation dengan cincin 8-tap. Blur gaussian sungguhan butuh pass terpisah;
 * pada viewfinder 60fps di HP kelas menengah, cincin ini sudah meyakinkan
 * dengan biaya seperdelapannya.
 */
vec3 halation(vec2 uv, float amount) {
  if (amount <= 0.0) return vec3(0.0);

  vec2 texel = 1.0 / uResolution;
  float radius = 6.0;
  vec3 sum = vec3(0.0);

  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853981634; // 2pi/8
    vec2 offset = vec2(cos(a), sin(a)) * texel * radius;
    vec3 s = texture(uSource, clamp(uv + offset, 0.0, 1.0)).rgb;
    sum += max(vec3(0.0), s - 0.72); // hanya sorotan terang yang memancar
  }

  sum /= 8.0;
  // Pendar condong ke merah-oranye: lapisan merah paling dalam, jadi paling
  // banyak memantul dari alas film.
  return sum * vec3(1.0, 0.42, 0.22) * amount * 2.4;
}

/**
 * Seberapa "kulit" sebuah warna, 0..1.
 *
 * Dihitung di ruang YCbCr karena di sanalah nada kulit menempati wilayah sempit
 * yang stabil — dari kulit paling terang sampai paling gelap, Cb dan Cr-nya
 * berdekatan, sementara di RGB ketiganya bergerak bersama sehingga tidak ada
 * batas yang bisa dipakai. Ini alasan yang sama kenapa deteksi wajah klasik
 * memakai ruang ini.
 *
 * Tepinya dilembutkan dengan smoothstep, bukan ambang keras: batas tajam antara
 * "kulit" dan "bukan kulit" akan terlihat sebagai bercak di pipi yang setengah
 * terkena cahaya.
 */
float skinMask(vec3 c) {
  float y  = dot(c, vec3(0.299, 0.587, 0.114));
  float cb = (c.b - y) * 0.564 + 0.5;
  float cr = (c.r - y) * 0.713 + 0.5;

  float inCb = smoothstep(0.28, 0.34, cb) * (1.0 - smoothstep(0.48, 0.54, cb));
  float inCr = smoothstep(0.50, 0.55, cr) * (1.0 - smoothstep(0.66, 0.72, cr));

  // Bayangan pekat dan sorotan gosong tidak punya informasi kulit yang berguna.
  float inY = smoothstep(0.12, 0.22, y) * (1.0 - smoothstep(0.92, 0.99, y));

  return inCb * inCr * inY;
}

/**
 * Menghaluskan kulit tanpa membuat wajah jadi plastik.
 *
 * Prinsipnya bukan blur, melainkan menekan detail BERKONTRAS RENDAH saja.
 * Jerawat, pori, dan bekas noda adalah selisih kecil terhadap kulit di
 * sekitarnya; alis, bulu mata, dan garis bibir adalah selisih besar. Dengan
 * menimbang tiap piksel berdasarkan besar selisihnya, yang pertama meluruh dan
 * yang kedua utuh — itulah beda antara kulit yang bersih dan wajah yang
 * kehilangan bentuk.
 *
 * Radiusnya fraksi dari sisi gambar, bukan hitungan texel tetap. Pelajaran yang
 * sama dengan grain dan halation: radius texel tetap membuat pratinjau 900 px
 * dan simpanan 2560 px menghaluskan pada skala yang berbeda.
 */
vec3 smoothSkin(vec2 uv, vec3 base, float amount) {
  if (amount <= 0.0) return base;

  float mask = skinMask(base);
  if (mask <= 0.001) return base;

  vec2 texel = 1.0 / uResolution;
  float radius = min(uResolution.x, uResolution.y) * 0.006;

  vec3 sum = vec3(0.0);
  float weight = 0.0;

  // Dua cincin: satu rapat untuk pori, satu lebar untuk noda yang lebih besar.
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853981634;
    vec2 dir = vec2(cos(a), sin(a));

    for (int r = 1; r <= 2; r++) {
      vec3 s = texture(uSource, clamp(uv + dir * texel * radius * float(r), 0.0, 1.0)).rgb;

      // Sampel yang jauh berbeda dari piksel ini hampir pasti bukan kulit yang
      // sama — mata, rambut, latar. Bobotnya dijatuhkan supaya tepinya tidak
      // ikut luntur.
      float diff = length(s - base);
      float w = exp(-diff * diff * 90.0) / float(r);

      sum += s * w;
      weight += w;
    }
  }

  vec3 blurred = sum / max(weight, 0.0001);

  // Detail dikembalikan sebagian: nol berarti plastik, satu berarti tidak ada
  // yang berubah. Yang dicari ada di antaranya.
  vec3 detail = base - blurred;
  float keep = mix(1.0, 0.25, amount * mask);

  return blurred + detail * keep;
}

void main() {
  // Asal koordinat tekstur WebGL ada di kiri-BAWAH, gambar dibaca dari
  // kiri-ATAS. Pembalikan dilakukan di sini, bukan lewat UNPACK_FLIP_Y_WEBGL,
  // karena parameter itu diabaikan untuk sumber ImageBitmap di Chrome —
  // dan ImageBitmap adalah jalur yang dipakai setiap jepretan tamu.
  vec2 uv = vUv;
  if (uFlipY) uv.y = 1.0 - uv.y;
  if (uMirror) uv.x = 1.0 - uv.x;

  vec3 c = texture(uSource, uv).rgb;

  // 0. Kulit dihaluskan sebelum apa pun yang lain.
  //
  // Harus paling awal: LUT dan kontras memperkuat selisih warna, jadi jerawat
  // yang dibiarkan sampai ke sana akan lebih menonjol dan lebih sulit diredam
  // tanpa ikut merusak nada kulit di sekelilingnya.
  c = smoothSkin(uv, c, uSmooth);

  // 1. Halation pada negatif
  c += halation(uv, uHalation);

  // 2. Vignette lensa
  if (uVignette > 0.0) {
    vec2 d = uv - 0.5;
    float r = length(d) * 1.414213562;
    float v = 1.0 - uVignette * smoothstep(0.35, 1.0, r);
    c *= v;
  }

  // 3. Pengembangan warna
  //
  // uIntensity HANYA berlaku di sini, bukan di ujung shader. Sebelumnya ia
  // mencampur seluruh hasil olahan dengan gambar asli, sehingga menurunkan
  // kekuatan warna ikut menipiskan grain, vignette, dan halation — tiga hal
  // yang justru harus tetap utuh.
  vec3 base = clamp(c, 0.0, 1.0);
  vec3 graded = sampleLut(base, uLutSize);

  /*
   * Kunci kecerahan: ambil warnanya, tolak angkat nadanya.
   *
   * LUT ini dibuat untuk konversi RAW yang datar. Diberi keluaran kamera ponsel
   * yang sudah dinaikkan kontras dan saturasinya oleh ISP, kurva nadanya
   * menumpuk dan mengangkat nada tengah sampai 30 level — gambarnya jadi cuci.
   * Mengembalikan luminanci asli membuang tumpukan itu tanpa membuang karakter
   * warnanya, sehingga kekuatan warna bisa didorong tinggi tanpa jadi pudar.
   */
  if (uLumaLock > 0.0) {
    float lo = luma(base);
    float lg = luma(graded);
    // Rasio dibatasi: pada piksel nyaris hitam, lg mendekati nol dan
    // pembagiannya meledak jadi bintik terang.
    float ratio = clamp(lo / max(lg, 0.0001), 0.25, 4.0);
    graded *= mix(1.0, ratio, uLumaLock);
  }

  c = mix(base, graded, uIntensity);

  /*
   * 3b. Kontras.
   *
   * Kendali tersendiri, bukan bagian dari LUT. Kunci nada di atas membuang
   * angkat nada yang membuat gambar cuci, tapi ia ikut memangkas kurva nada
   * film — dan kurva itulah sumber "punch". Kurva-S ini mengembalikannya tanpa
   * mengembalikan wash-nya: bayangan ditekan turun, sorotan didorong naik,
   * nada tengah tetap di tempat.
   */
  if (uContrast > 0.0) {
    vec3 sc = clamp(c, 0.0, 1.0);
    c = mix(c, sc * sc * (3.0 - 2.0 * sc), uContrast);
  }

  // 4. Grain perak
  if (uGrain > 0.0) {
    // Skala tetap terhadap piksel supaya butiran tidak ikut membesar saat
    // kanvas diperbesar — grain film ukurannya konstan, bukan relatif.
    vec2 gp = uv * uResolution * 0.75 + uSeed;
    float n = hash(gp) - 0.5;

    // Grain paling terlihat di nada tengah, hampir hilang di hitam dan putih.
    float l = luma(c);
    float weight = 1.0 - abs(l * 2.0 - 1.0);
    weight = weight * weight * 0.75 + 0.25;

    c += n * uGrain * 0.14 * weight;
  }

  fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`
