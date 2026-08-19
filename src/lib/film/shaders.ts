/**
 * Pipeline warna kamera dan look film.
 *
 * Exposure, detail, dan luminance dihitung di linear light. LUT menerima sRGB
 * sesuai Hald CLUT sumber. Efek artistik sengaja ringan karena JPEG ponsel
 * sudah diproses oleh ISP masing-masing perangkat.
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

vec3 srgbToLinear(vec3 c) {
  vec3 low = c / 12.92;
  vec3 high = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(low, high, step(vec3(0.04045), c));
}

vec3 linearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  vec3 low = c * 12.92;
  vec3 high = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(vec3(0.0031308), c));
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
 * Kernel Laplacian penajaman optik, dihitung dari piksel sumber di linear light.
 * Mengangkat ketajaman mata, rambut, tekstur pakaian, dan detail wajah agar jernih.
 */
vec3 sharpenLaplacian(vec2 uv, vec3 centerLinear) {
  vec2 step = 1.0 / uResolution;
  vec3 n = srgbToLinear(texture(uSource, clamp(uv + vec2(0.0, -step.y), 0.0, 1.0)).rgb);
  vec3 s = srgbToLinear(texture(uSource, clamp(uv + vec2(0.0, step.y), 0.0, 1.0)).rgb);
  vec3 e = srgbToLinear(texture(uSource, clamp(uv + vec2(step.x, 0.0), 0.0, 1.0)).rgb);
  vec3 w = srgbToLinear(texture(uSource, clamp(uv + vec2(-step.x, 0.0), 0.0, 1.0)).rgb);

  return (centerLinear * 4.0) - (n + s + e + w);
}

/**
 * Kompensasi Pencahayaan (Exposure EV) di linear light.
 * Menaikkan/menurunkan kecerahan secara fotografis (EV Stops).
 */
vec3 exposeLinear(vec3 linear, float ev) {
  vec3 exposed = linear * exp2(ev);

  // Shoulder lembut hanya saat menaikkan exposure. Highlight mendapat ruang
  // untuk melandai alih-alih langsung terpotong putih.
  if (ev > 0.0) {
    const float knee = 0.78;
    vec3 over = max(exposed - knee, vec3(0.0));
    vec3 shoulder = knee + (1.0 - knee) * (1.0 - exp(-over / (1.0 - knee)));
    exposed = mix(exposed, shoulder, step(vec3(knee), exposed));
  }

  return exposed;
}

/** Varian sRGB→sRGB untuk sampel tetangga yang belum melewati pipeline utama. */
vec3 applyExposure(vec3 col, float ev) {
  if (abs(ev) <= 0.001) return col;
  return clamp(linearToSrgb(exposeLinear(srgbToLinear(col), ev)), 0.0, 1.0);
}

/**
 * Halation pendaran hangat di sekitar lampu, kilatan flash, dan sorotan terang.
 */
vec3 halation(vec2 uv, float amount) {
  if (amount <= 0.0) return vec3(0.0);

  vec2 texel = 1.0 / uResolution;
  // Skala relatif menjaga karakter yang sama di preview dan hasil penuh.
  float radius = min(uResolution.x, uResolution.y) * 0.0045;
  // Cabang diangkat ke luar loop: pada exposure netral seluruh konversi sRGB
  // per sampel gugur dan halation tinggal delapan texture fetch.
  bool reexpose = abs(uExposure) > 0.001;
  vec3 sum = vec3(0.0);

  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853981634; // 2pi/8
    vec2 offset = vec2(cos(a), sin(a)) * texel * radius;
    vec3 s = texture(uSource, clamp(uv + offset, 0.0, 1.0)).rgb;
    if (reexpose) s = applyExposure(s, uExposure);
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
 * Kurva kontras lembut berbasis luminance. Rasio RGB linear dipertahankan agar
 * hue kulit tidak bergeser seperti pada kurva per kanal.
 */
vec3 applyFilmDensityCurve(vec3 col, float contrastAmount) {
  if (contrastAmount > 0.0) {
    vec3 linear = srgbToLinear(clamp(col, 0.0, 1.0));
    float sourceLuma = luma(linear);
    float sCurve = sourceLuma * sourceLuma * (3.0 - 2.0 * sourceLuma);
    float targetLuma = mix(sourceLuma, sCurve, contrastAmount * 0.5);
    linear *= targetLuma / max(sourceLuma, 0.0001);
    return clamp(linearToSrgb(linear), 0.0, 1.0);
  }
  return col;
}

void main() {
  vec2 uv = vUv;
  if (uFlipY) uv.y = 1.0 - uv.y;
  if (uMirror) uv.x = 1.0 - uv.x;

  vec3 src = texture(uSource, uv).rgb;

  // Tetangga smoothing masih berada pada domain sumber yang sama.
  vec3 c = smoothSkin(uv, src, uSmooth);

  // Detail asli dikembalikan sesudah smoothing; exposure memakai linear light.
  // Keduanya berbagi satu perjalanan ke linear: karena sRGB monoton dan
  // memetakan [0,1] ke [0,1], menjepit di linear identik dengan menjepit
  // setelah konversi — dua round-trip pow() per piksel jadi bisa dihapus.
  bool wantSharpen = uSharpen > 0.0;
  bool wantExposure = abs(uExposure) > 0.001;

  if (wantSharpen || wantExposure) {
    vec3 linear = srgbToLinear(c);

    if (wantSharpen) {
      // Kernel memakai piksel sumber asli, bukan hasil smoothing.
      vec3 centerLinear = linear;
      if (uSmooth > 0.0) centerLinear = srgbToLinear(src);
      // Gain dibatasi agar detail naik tanpa halo putih dan noise digital kasar.
      linear = clamp(linear + sharpenLaplacian(uv, centerLinear) * uSharpen * 0.65, 0.0, 1.0);
    }

    if (wantExposure) linear = exposeLinear(linear, uExposure);

    c = clamp(linearToSrgb(linear), 0.0, 1.0);
  }

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
    vec3 baseLinear = srgbToLinear(base);
    vec3 gradedLinear = srgbToLinear(graded);
    float lo = luma(baseLinear);
    float lg = luma(gradedLinear);
    float ratio = clamp(lo / max(lg, 0.0001), 0.25, 4.0);
    gradedLinear *= mix(1.0, ratio, uLumaLock);
    graded = clamp(linearToSrgb(gradedLinear), 0.0, 1.0);
  }

  c = mix(base, graded, uIntensity);

  // 4. Kurva kontras berbasis luminance
  c = applyFilmDensityCurve(c, uContrast);

  // 5. Butiran Kristal Perak 35mm Multi-Frekuensi (Hidup di Mid-tones)
  if (uGrain > 0.0) {
    float minSide = min(uResolution.x, uResolution.y);
    vec2 canonical = (uResolution / max(minSide, 1.0)) * 1200.0;
    vec2 gp = uv * canonical + uSeed;
    float n = hash(gp) - 0.5;

    float l = luma(c);
    float weight = 1.0 - abs(l * 2.0 - 1.0);
    weight = weight * weight * 0.80 + 0.20;

    c += n * uGrain * 0.12 * weight;
  }

  fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;
