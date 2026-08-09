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

void main() {
  // Asal koordinat tekstur WebGL ada di kiri-BAWAH, gambar dibaca dari
  // kiri-ATAS. Pembalikan dilakukan di sini, bukan lewat UNPACK_FLIP_Y_WEBGL,
  // karena parameter itu diabaikan untuk sumber ImageBitmap di Chrome —
  // dan ImageBitmap adalah jalur yang dipakai setiap jepretan tamu.
  vec2 uv = vUv;
  if (uFlipY) uv.y = 1.0 - uv.y;
  if (uMirror) uv.x = 1.0 - uv.x;

  vec3 original = texture(uSource, uv).rgb;
  vec3 c = original;

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
  c = sampleLut(clamp(c, 0.0, 1.0), uLutSize);

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

  c = clamp(c, 0.0, 1.0);

  // uIntensity memungkinkan pratinjau sebelum/sesudah tanpa mengganti shader.
  fragColor = vec4(mix(original, c, uIntensity), 1.0);
}
`
