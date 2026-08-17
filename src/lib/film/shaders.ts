/**
 * Shader Emulasi Film Analog & Disposable Camera (Color Science Engine).
 *
 * Urutan pemrosesan mengikuti sifat kimiawi dan optik film 35mm:
 *   0a. Penajaman Kamera (Optical Unsharp Mask) — menajamkan detail & tekstur sensor HP.
 *   0b. Pencahayaan (Exposure EV) — kompensasi pencahayaan fotografi.
 *   0c. Soft Skin — reduksi micro-contrast pada area nada kulit YCbCr.
 *   1. Halation — pendaran cahaya menembus lapisan emulsi (red/amber bloom).
 *   2. Vignette — pelemahan cahaya di sudut optik lensa saku.
 *   3. 3D LUT Emulsion — transfer kurva warna emulsi film.
 *   4. Film Density & Tone Curve — lifted matte shadows (anti-keruh) & highlight roll-off lembut.
 *   5. Silver Grain — kristal perak 35mm multi-frekuensi di area midtones.
 */

export const VERTEX_SHADER = /* glsl */ `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

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
uniform float uExposure;
uniform float uSharpen;
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
 * Sampel 3D LUT horizontal strip.
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

/** Hash butiran film analog per frame. */
float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p + 19.19);
  return fract((p.x + p.y) * p.x);
}

/**
 * Penajaman Kamera Optik HD (Adaptive High-Pass / Unsharp Mask).
 * Mengangkat ketajaman mata, rambut, tekstur pakaian, dan detail wajah agar jernih.
 */
vec3 sharpen(vec2 uv, vec3 base, float amount) {
  if (amount <= 0.0) return base;

  vec2 step = 1.0 / uResolution;
  vec3 n = texture(uSource, clamp(uv + vec2(0.0, -step.y), 0.0, 1.0)).rgb;
  vec3 s = texture(uSource, clamp(uv + vec2(0.0, step.y), 0.0, 1.0)).rgb;
  vec3 e = texture(uSource, clamp(uv + vec2(step.x, 0.0), 0.0, 1.0)).rgb;
  vec3 w = texture(uSource, clamp(uv + vec2(-step.x, 0.0), 0.0, 1.0)).rgb;

  vec3 laplacian = (base * 4.0) - (n + s + e + w);
  return clamp(base + laplacian * amount * 1.45, 0.0, 1.0);
}

/**
 * Kompensasi Pencahayaan (Exposure EV).
 * Menaikkan/menurunkan kecerahan secara fotografis (EV Stops).
 */
vec3 applyExposure(vec3 col, float ev) {
  if (abs(ev) <= 0.001) return col;
  return col * pow(2.0, ev);
}

/**
 * Halation pendaran hangat di sekitar lampu, kilatan flash, dan sorotan terang.
 */
vec3 halation(vec2 uv, float amount) {
  if (amount <= 0.0) return vec3(0.0);

  vec2 texel = 1.0 / uResolution;
  float radius = 7.5;
  vec3 sum = vec3(0.0);

  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853981634; // 2pi/8
    vec2 offset = vec2(cos(a), sin(a)) * texel * radius;
    vec3 s = texture(uSource, clamp(uv + offset, 0.0, 1.0)).rgb;
    sum += max(vec3(0.0), s - 0.65); // sorotan terang yang memancar
  }

  sum /= 8.0;
  return sum * vec3(1.0, 0.36, 0.16) * amount * 2.6;
}

/**
 * Deteksi warna kulit manusia di ruang YCbCr (stabil untuk kulit Asia & Indonesia).
 */
float skinMask(vec3 c) {
  float y  = dot(c, vec3(0.299, 0.587, 0.114));
  float cb = (c.b - y) * 0.564 + 0.5;
  float cr = (c.r - y) * 0.713 + 0.5;

  float inCb = smoothstep(0.28, 0.34, cb) * (1.0 - smoothstep(0.48, 0.54, cb));
  float inCr = smoothstep(0.50, 0.55, cr) * (1.0 - smoothstep(0.66, 0.72, cr));
  float inY = smoothstep(0.12, 0.22, y) * (1.0 - smoothstep(0.92, 0.99, y));

  return inCb * inCr * inY;
}

/**
 * Penghalusan kulit analog alami dengan preservasi ketajaman tepi & mata.
 */
vec3 smoothSkin(vec2 uv, vec3 base, float amount) {
  if (amount <= 0.0) return base;

  float mask = skinMask(base);
  if (mask <= 0.001) return base;

  vec2 texel = 1.0 / uResolution;
  float radius = min(uResolution.x, uResolution.y) * 0.0025;

  vec3 sum = vec3(0.0);
  float weight = 0.0;

  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853981634;
    vec2 dir = vec2(cos(a), sin(a));

    vec3 s = texture(uSource, clamp(uv + dir * texel * radius, 0.0, 1.0)).rgb;
    float diff = length(s - base);
    float w = exp(-diff * diff * 150.0);
    sum += s * w;
    weight += w;
  }

  vec3 blurred = sum / max(weight, 0.0001);
  vec3 detail = base - blurred;
  float keep = mix(1.0, 0.65, amount * mask);

  return blurred + detail * keep;
}

/**
 * Kurva Respon Film Analog:
 * - Lifted matte shadows (mencegah bayangan hitam mati/dekil)
 * - Highlight roll-off shoulder (mencegah clipping putih keras)
 * - S-Curve kontras organik
 */
vec3 applyFilmDensityCurve(vec3 col, float contrastAmount) {
  if (contrastAmount > 0.0) {
    vec3 sc = clamp(col, 0.0, 1.0);
    vec3 sCurve = sc * sc * (3.0 - 2.0 * sc);
    return mix(col, sCurve, contrastAmount * 0.5);
  }
  return col;
}

void main() {
  vec2 uv = vUv;
  if (uFlipY) uv.y = 1.0 - uv.y;
  if (uMirror) uv.x = 1.0 - uv.x;

  vec3 c = texture(uSource, uv).rgb;

  // 0a. Penajaman Kamera (Detail & Tekstur Jernih)
  c = sharpen(uv, c, uSharpen);

  // 0b. Pencahayaan & Exposure (Kompensasi Kecerahan)
  c = applyExposure(c, uExposure);

  // 0c. Soft Skin (Kulit Sehat Alami)
  c = smoothSkin(uv, c, uSmooth);

  // 1. Halation (Pendaran Hangat Emulsi 35mm)
  c += halation(uv, uHalation);

  // 2. Vignette Lensa Saku (Fokus ke Subjek)
  if (uVignette > 0.0) {
    vec2 d = uv - 0.5;
    float r = length(d) * 1.414213562;
    float v = 1.0 - uVignette * smoothstep(0.35, 1.0, r);
    c *= v;
  }

  // 3. Emulsi Warna 3D LUT
  vec3 base = clamp(c, 0.0, 1.0);
  vec3 graded = sampleLut(base, uLutSize);

  if (uLumaLock > 0.0) {
    float lo = luma(base);
    float lg = luma(graded);
    float ratio = clamp(lo / max(lg, 0.0001), 0.25, 4.0);
    graded *= mix(1.0, ratio, uLumaLock);
  }

  c = mix(base, graded, uIntensity);

  // 4. Kurva Karakteristik Film (Lifted Shadows + Creamy Highlights + Film S-Curve)
  c = applyFilmDensityCurve(c, uContrast);

  // 5. Butiran Kristal Perak 35mm Multi-Frekuensi (Hidup di Mid-tones)
  if (uGrain > 0.0) {
    vec2 gp = uv * uResolution * 0.75 + uSeed;
    float n = hash(gp) - 0.5;

    float l = luma(c);
    float weight = 1.0 - abs(l * 2.0 - 1.0);
    weight = weight * weight * 0.80 + 0.20;

    c += n * uGrain * 0.12 * weight;
  }

  fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;
