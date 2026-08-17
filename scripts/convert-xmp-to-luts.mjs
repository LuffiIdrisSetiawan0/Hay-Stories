import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const XMP_BASE = path.resolve('Disposable_Presets_LR')
const OUT_DIR = path.resolve('public/luts')
const ALLOW_LEGACY_APPROXIMATION = process.argv.includes('--allow-legacy-approximation')

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

// 1. Monotone Cubic Hermite Spline Interpolation for Tone Curves
function createSpline(points) {
  if (!points || points.length === 0) return (x) => x
  if (points.length === 1) return () => points[0][1] / 255.0

  const sorted = [...points].sort((a, b) => a[0] - b[0])
  const n = sorted.length
  const xs = sorted.map((p) => p[0] / 255.0)
  const ys = sorted.map((p) => p[1] / 255.0)

  // Catmull-Rom / Monotone slopes
  const ms = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      ms[i] = (ys[1] - ys[0]) / Math.max(0.0001, xs[1] - xs[0])
    } else if (i === n - 1) {
      ms[i] = (ys[n - 1] - ys[n - 2]) / Math.max(0.0001, xs[n - 1] - xs[n - 2])
    } else {
      const dx1 = Math.max(0.0001, xs[i] - xs[i - 1])
      const dx2 = Math.max(0.0001, xs[i + 1] - xs[i])
      const dy1 = (ys[i] - ys[i - 1]) / dx1
      const dy2 = (ys[i + 1] - ys[i]) / dx2
      ms[i] = (dy1 + dy2) * 0.5
    }
  }

  return (x) => {
    const clamped = Math.max(0, Math.min(1, x))
    if (clamped <= xs[0]) return Math.max(0, Math.min(1, ys[0]))
    if (clamped >= xs[n - 1]) return Math.max(0, Math.min(1, ys[n - 1]))

    let i = 0
    while (i < n - 1 && xs[i + 1] < clamped) i++

    const h = xs[i + 1] - xs[i]
    const t = (clamped - xs[i]) / Math.max(0.0001, h)
    const t2 = t * t
    const t3 = t2 * t

    const h00 = 2 * t3 - 3 * t2 + 1
    const h10 = t3 - 2 * t2 + t
    const h01 = -2 * t3 + 3 * t2
    const h11 = t3 - t2

    const val = h00 * ys[i] + h10 * h * ms[i] + h01 * ys[i + 1] + h11 * h * ms[i + 1]
    return Math.max(0, Math.min(1, val))
  }
}

// 2. RGB <-> HSL conversions
function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return [h * 360, s, l]
}

function hue2rgb(p, q, t) {
  let tt = t
  if (tt < 0) tt += 1
  if (tt > 1) tt -= 1
  if (tt < 1 / 6) return p + (q - p) * 6 * tt
  if (tt < 1 / 2) return q
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
  return p
}

function hslToRgb(h, s, l) {
  const hh = (((h % 360) + 360) % 360) / 360
  if (s === 0) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = hue2rgb(p, q, hh + 1 / 3)
  const g = hue2rgb(p, q, hh)
  const b = hue2rgb(p, q, hh - 1 / 3)
  return [r, g, b]
}

// 3. Parse XMP file
function parseXmp(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')

  const getAttr = (name, fallback = '0') => {
    const match = content.match(new RegExp(`crs:${name}="([^"]+)"`))
    return match ? match[1] : fallback
  }

  const getSeqPoints = (tag) => {
    const reg = new RegExp(`<crs:${tag}>[\\s\\S]*?<rdf:Seq>([\\s\\S]*?)<\\/rdf:Seq>`, 'i')
    const match = content.match(reg)
    if (!match) return []
    const points = []
    const liMatches = match[1].matchAll(/<rdf:li>([\s\S]*?)<\/rdf:li>/gi)
    for (const m of liMatches) {
      const parts = m[1].split(',').map((s) => parseFloat(s.trim()))
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        points.push(parts)
      }
    }
    return points
  }

  const hslColors = ['Red', 'Orange', 'Yellow', 'Green', 'Aqua', 'Blue', 'Purple', 'Magenta']
  const hslHue = {}
  const hslSat = {}
  const hslLum = {}
  for (const c of hslColors) {
    hslHue[c] = parseFloat(getAttr(`HueAdjustment${c}`, '0'))
    hslSat[c] = parseFloat(getAttr(`SaturationAdjustment${c}`, '0'))
    hslLum[c] = parseFloat(getAttr(`LuminanceAdjustment${c}`, '0'))
  }

  return {
    name: getAttr('Name', path.basename(filePath, '.xmp')),
    temp: parseFloat(getAttr('IncrementalTemperature', '0')),
    tint: parseFloat(getAttr('IncrementalTint', '0')),
    exposure: parseFloat(getAttr('Exposure2012', '0')),
    contrast: parseFloat(getAttr('Contrast2012', '0')),
    highlights: parseFloat(getAttr('Highlights2012', '0')),
    shadows: parseFloat(getAttr('Shadows2012', '0')),
    whites: parseFloat(getAttr('Whites2012', '0')),
    blacks: parseFloat(getAttr('Blacks2012', '0')),
    vibrance: parseFloat(getAttr('Vibrance', '0')),
    saturation: parseFloat(getAttr('Saturation', '0')),
    splitShadowHue: parseFloat(getAttr('SplitToningShadowHue', '0')),
    splitShadowSat: parseFloat(getAttr('SplitToningShadowSaturation', '0')),
    splitHighlightHue: parseFloat(getAttr('SplitToningHighlightHue', '0')),
    splitHighlightSat: parseFloat(getAttr('SplitToningHighlightSaturation', '0')),
    splitBalance: parseFloat(getAttr('SplitToningBalance', '0')),
    redHue: parseFloat(getAttr('RedHue', '0')),
    redSat: parseFloat(getAttr('RedSaturation', '0')),
    greenHue: parseFloat(getAttr('GreenHue', '0')),
    greenSat: parseFloat(getAttr('GreenSaturation', '0')),
    blueHue: parseFloat(getAttr('BlueHue', '0')),
    blueSat: parseFloat(getAttr('BlueSaturation', '0')),
    hslHue,
    hslSat,
    hslLum,
    curveMaster: getSeqPoints('ToneCurvePV2012'),
    curveRed: getSeqPoints('ToneCurvePV2012Red'),
    curveGreen: getSeqPoints('ToneCurvePV2012Green'),
    curveBlue: getSeqPoints('ToneCurvePV2012Blue'),
  }
}

// 4. HSL sector evaluation
const HSL_SECTORS = [
  { name: 'Red', hue: 0 },
  { name: 'Orange', hue: 30 },
  { name: 'Yellow', hue: 60 },
  { name: 'Green', hue: 120 },
  { name: 'Aqua', hue: 180 },
  { name: 'Blue', hue: 240 },
  { name: 'Purple', hue: 285 },
  { name: 'Magenta', hue: 330 },
]

function getHslWeights(h) {
  const normH = ((h % 360) + 360) % 360
  const weights = {}
  let total = 0

  for (let i = 0; i < HSL_SECTORS.length; i++) {
    const sec = HSL_SECTORS[i]
    let diff = Math.abs(normH - sec.hue)
    if (diff > 180) diff = 360 - diff
    // Gaussian-like falloff window around color sector
    const w = Math.max(0, Math.cos((diff / 45) * (Math.PI / 2)))
    const weight = Math.pow(w, 2)
    weights[sec.name] = weight
    total += weight
  }

  if (total > 0) {
    for (const k in weights) {
      weights[k] /= total
    }
  }
  return weights
}

// 5. Process a single RGB color through the parsed XMP profile
function gradePixel(r0, g0, b0, p) {
  let r = r0
  let g = g0
  let b = b0

  // 1. Camera Calibration (Primaries shift)
  if (p.redHue !== 0 || p.greenHue !== 0 || p.blueHue !== 0) {
    // Red primary: +Hue shifts toward yellow/orange
    const rShift = (p.redHue / 100) * 0.2
    g += r * Math.max(0, rShift) * 0.15
    b += r * Math.max(0, -rShift) * 0.15

    // Green primary: +Hue shifts toward cyan/blue (removes yellow-green)
    const gShift = (p.greenHue / 100) * 0.2
    b += g * Math.max(0, gShift) * 0.25
    r += g * Math.max(0, -gShift) * 0.25

    // Blue primary: -Hue shifts toward cyan/teal
    const bShift = (p.blueHue / 100) * 0.2
    g += b * Math.max(0, -bShift) * 0.2
    r += b * Math.max(0, bShift) * 0.2
  }

  // 2. White balance / Temp / Tint (Gentle offset)
  if (p.temp !== 0) {
    r += p.temp * 0.001
    b -= p.temp * 0.001
  }
  if (p.tint !== 0) {
    g -= p.tint * 0.001
    r += p.tint * 0.0005
    b += p.tint * 0.0005
  }

  // 3. Exposure
  if (p.exposure !== 0) {
    const mult = Math.pow(2, p.exposure)
    r *= mult
    g *= mult
    b *= mult
  }

  // 4. Basic Tone Controls (Highlights, Shadows, Whites, Blacks)
  let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (p.highlights !== 0 && lum > 0.5) {
    const hFactor = (lum - 0.5) * 2 * (p.highlights / 100) * 0.2
    r += hFactor * (r / Math.max(0.001, lum))
    g += hFactor * (g / Math.max(0.001, lum))
    b += hFactor * (b / Math.max(0.001, lum))
  }
  if (p.shadows !== 0 && lum < 0.5) {
    const sFactor = (1 - lum * 2) * (p.shadows / 100) * 0.2
    r += sFactor * (r / Math.max(0.001, lum))
    g += sFactor * (g / Math.max(0.001, lum))
    b += sFactor * (b / Math.max(0.001, lum))
  }
  if (p.whites !== 0 && lum > 0.75) {
    const wFactor = (lum - 0.75) * 4 * (p.whites / 100) * 0.15
    r += wFactor
    g += wFactor
    b += wFactor
  }
  if (p.blacks !== 0 && lum < 0.25) {
    const bFactor = (1 - lum * 4) * (p.blacks / 100) * 0.15
    r += bFactor
    g += bFactor
    b += bFactor
  }

  // 5. RGB Curves + Master Curve
  r = p.evalCurveRed(Math.max(0, Math.min(1, r)))
  g = p.evalCurveGreen(Math.max(0, Math.min(1, g)))
  b = p.evalCurveBlue(Math.max(0, Math.min(1, b)))

  r = p.evalCurveMaster(r)
  g = p.evalCurveMaster(g)
  b = p.evalCurveMaster(b)

  // 6. HSL Color Adjustments (Per Color Hue, Saturation, Luminance)
  let [h, s, l] = rgbToHsl(Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, b)))

  if (s > 0.01) {
    const weights = getHslWeights(h)
    let deltaH = 0
    let deltaS = 0
    let deltaL = 0

    for (const sec of HSL_SECTORS) {
      const w = weights[sec.name] || 0
      if (w > 0) {
        deltaH += (p.hslHue[sec.name] || 0) * w
        deltaS += (p.hslSat[sec.name] || 0) * w
        deltaL += (p.hslLum[sec.name] || 0) * w
      }
    }

    // Apply HSL shifts
    h = (h + deltaH * 0.5 + 360) % 360
    s = Math.max(0, Math.min(1, s * (1 + deltaS / 100)))
    l = Math.max(0, Math.min(1, l + deltaL * 0.003 * s))

    const [rNew, gNew, bNew] = hslToRgb(h, s, l)
    r = rNew
    g = gNew
    b = bNew
  }

  // 7. Split Toning with Balance
  const splitBal = (p.splitBalance || 0) / 100 // -1 to +1
  const midSplit = 0.5 + splitBal * 0.25

  if (p.splitShadowSat > 0 && l < midSplit) {
    const shadowWeight = Math.pow(1 - l / midSplit, 1.8) * (p.splitShadowSat / 100) * 0.35
    const [sr, sg, sb] = hslToRgb(p.splitShadowHue, 0.6, l)
    r = r * (1 - shadowWeight) + sr * shadowWeight
    g = g * (1 - shadowWeight) + sg * shadowWeight
    b = b * (1 - shadowWeight) + sb * shadowWeight
  }

  if (p.splitHighlightSat > 0 && l > midSplit) {
    const highlightWeight = Math.pow((l - midSplit) / (1 - midSplit), 1.8) * (p.splitHighlightSat / 100) * 0.35
    const [hr, hg, hb] = hslToRgb(p.splitHighlightHue, 0.6, l)
    r = r * (1 - highlightWeight) + hr * highlightWeight
    g = g * (1 - highlightWeight) + hg * highlightWeight
    b = b * (1 - highlightWeight) + hb * highlightWeight
  }

  // 8. Vibrance & Global Saturation
  if (p.vibrance !== 0 || p.saturation !== 0) {
    const [vh, vs, vl] = rgbToHsl(Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, b)))
    // Vibrance boosts lower saturated colors more than already saturated colors
    const vibBoost = (p.vibrance / 100) * (1 - vs)
    const satBoost = p.saturation / 100
    const newSat = Math.max(0, Math.min(1, vs * (1 + satBoost + vibBoost)))
    const [vr, vg, vb] = hslToRgb(vh, newSat, vl)
    r = vr
    g = vg
    b = vb
  }

  return [
    Math.round(Math.max(0, Math.min(1, r)) * 255),
    Math.round(Math.max(0, Math.min(1, g)) * 255),
    Math.round(Math.max(0, Math.min(1, b)) * 255),
  ]
}

// 6. Generate 1024x32 3D LUT PNG
async function generateLutPng(xmpPath, outFileName) {
  const parsed = parseXmp(xmpPath)
  parsed.evalCurveMaster = createSpline(parsed.curveMaster)
  parsed.evalCurveRed = createSpline(parsed.curveRed)
  parsed.evalCurveGreen = createSpline(parsed.curveGreen)
  parsed.evalCurveBlue = createSpline(parsed.curveBlue)

  const size = 32
  const width = size * size // 1024
  const height = size // 32

  const buffer = Buffer.alloc(width * height * 3)

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const rNorm = r / (size - 1)
        const gNorm = g / (size - 1)
        const bNorm = b / (size - 1)

        const [rOut, gOut, bOut] = gradePixel(rNorm, gNorm, bNorm, parsed)

        const x = b * size + r
        const y = g
        const idx = (y * width + x) * 3

        buffer[idx] = rOut
        buffer[idx + 1] = gOut
        buffer[idx + 2] = bOut
      }
    }
  }

  const outPath = path.join(OUT_DIR, outFileName)
  await sharp(buffer, {
    raw: {
      width,
      height,
      channels: 3,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(outPath)

  console.log(
    `Generated legacy approximation: ${outFileName} from ${path.relative(process.cwd(), xmpPath)}`
  )
}

async function main() {
  if (!ALLOW_LEGACY_APPROXIMATION) {
    throw new Error(
      'Konverter legacy ini bukan Adobe Camera Raw dan mengabaikan sebagian parameter XMP. ' +
        'Gunakan build-luts.mjs untuk preset aktif, atau tambahkan ' +
        '--allow-legacy-approximation bila memang sedang mengaudit kompatibilitas lama.'
    )
  }

  const files = [
    { src: '35mm/35mm.xmp', dest: 'film-35mm.png' },
    { src: 'fuji/Fuji.xmp', dest: 'film-fuji.png' },
    { src: 'kodak/Kodak.xmp', dest: 'film-kodak.png' },
    { src: 'polaroid/Polaroid.xmp', dest: 'film-polaroid.png' },
  ]

  for (const item of files) {
    const xmpPath = path.join(XMP_BASE, item.src)
    if (fs.existsSync(xmpPath)) {
      await generateLutPng(xmpPath, item.dest)
    } else {
      console.warn(`File not found: ${xmpPath}`)
    }
  }
  console.log('All legacy approximate LUT PNGs built successfully.')
}

main()
