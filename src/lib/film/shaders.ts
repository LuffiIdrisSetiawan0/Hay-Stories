/**
 * Shader emulasi film.
 *
 * Urutan operasi mengikuti bagaimana film sungguhan bekerja:
 *   1. Halation — cahaya memantul di alas film.
 *   2. Vignette — efek tepi lensa.
 *   3. LUT — kurva kimia emulsi warna 3D.
 *   4. Contrast — kurva karakteristik film (toe, shoulder, deep blacks).
 *   5. Grain — butiran kristal perak 35mm.
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
 * lebar = size*size, tinggi = size.
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

/** Hash cepat untuk grain perak. */
float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p + 19.19);
  return fract((p.x + p.y) * p.x);
}

/**
 * Halation pendar merah-oranye di sekitar lampu kilat dan sorotan terang.
 */
vec3 halation(vec2 uv, float amount) {
  if (amount <= 0.0) return vec3(0.0);

  vec2 texel = 1.0 / uResolution;
  float radius = 7.0;
  vec3 sum = vec3(0.0);

  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853981634; // 2pi/8
    vec2 offset = vec2(cos(a), sin(a)) * texel * radius;
    vec3 s = texture(uSource, clamp(uv + offset, 0.0, 1.0)).rgb;
    sum += max(vec3(0.0), s - 0.68); // sorotan terang memancar
  }

  sum /= 8.0;
  return sum * vec3(1.0, 0.38, 0.18) * amount * 2.8;
}

/**
 * Deteksi nada kulit di ruang YCbCr.
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
 * Penghalusan kulit lembut natural.
 */
vec3 smoothSkin(vec2 uv, vec3 base, float amount) {
  if (amount <= 0.0) return base;

  float mask = skinMask(base);
  if (mask <= 0.001) return base;

  vec2 texel = 1.0 / uResolution;
  float radius = min(uResolution.x, uResolution.y) * 0.006;

  vec3 sum = vec3(0.0);
  float weight = 0.0;

  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853981634;
    vec2 dir = vec2(cos(a), sin(a));

    for (int r = 1; r <= 2; r++) {
      vec3 s = texture(uSource, clamp(uv + dir * texel * radius * float(r), 0.0, 1.0)).rgb;
      float diff = length(s - base);
      float w = exp(-diff * diff * 90.0) / float(r);
      sum += s * w;
      weight += w;
    }
  }

  vec3 blurred = sum / max(weight, 0.0001);
  vec3 detail = base - blurred;
  float keep = mix(1.0, 0.30, amount * mask);

  return blurred + detail * keep;
}

void main() {
  vec2 uv = vUv;
  if (uFlipY) uv.y = 1.0 - uv.y;
  if (uMirror) uv.x = 1.0 - uv.x;

  vec3 c = texture(uSource, uv).rgb;

  // 0. Soft Skin
  c = smoothSkin(uv, c, uSmooth);

  // 1. Halation
  c += halation(uv, uHalation);

  // 2. Vignette Lensa Analog
  if (uVignette > 0.0) {
    vec2 d = uv - 0.5;
    float r = length(d) * 1.414213562;
    float v = 1.0 - uVignette * smoothstep(0.32, 1.0, r);
    c *= v;
  }

  // 3. Pengembangan Emulsi Warna LUT 3D
  vec3 base = clamp(c, 0.0, 1.0);
  vec3 graded = sampleLut(base, uLutSize);

  if (uLumaLock > 0.0) {
    float lo = luma(base);
    float lg = luma(graded);
    float ratio = clamp(lo / max(lg, 0.0001), 0.25, 4.0);
    graded *= mix(1.0, ratio, uLumaLock);
  }

  c = mix(base, graded, uIntensity);

  // 3b. Kurva Karakteristik Film & Kontras Punchy (Rich S-Curve)
  if (uContrast > 0.0) {
    vec3 sc = clamp(c, 0.0, 1.0);
    // S-curve dengan bayangan pekat dan highlight roll-off khas film cetak
    vec3 s1 = sc * sc * (3.0 - 2.0 * sc);
    vec3 punch = pow(s1, vec3(1.15)) * (1.0 + 0.15 * (1.0 - s1));
    punch = clamp(punch * punch * (3.0 - 2.0 * punch), 0.0, 1.0);
    c = mix(c, punch, uContrast);
  }

  // 4. Kristal Grain Perak 35mm
  if (uGrain > 0.0) {
    vec2 gp = uv * uResolution * 0.75 + uSeed;
    float n = hash(gp) - 0.5;

    float l = luma(c);
    float weight = 1.0 - abs(l * 2.0 - 1.0);
    weight = weight * weight * 0.75 + 0.25;

    c += n * uGrain * 0.16 * weight;
  }

  fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;
