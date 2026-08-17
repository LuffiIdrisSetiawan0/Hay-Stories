import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const XMP_BASE = path.resolve('Disposable_Presets_LR')
const OUT_DIR = path.resolve('public/luts')

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

// 1. Helper Spline Interpolation for Tone Curves
function createSpline(points) {
  if (!points || points.length === 0) return (x) => x
  if (points.length === 1) return () => points[0][1]

  const sorted = [...points].sort((a, b) => a[0] - b[0])
  const n = sorted.length
  const xs = sorted.map((p) => p[0] / 255.0)
  const ys = sorted.map((p) => p[1] / 255.0)

  return (x) => {
    const clamped = Math.max(0, Math.min(1, x))
    if (clamped <= xs[0]) return ys[0]
    if (clamped >= xs[n - 1]) return ys[n - 1]

    let i = 0
    while (i < n - 1 && xs[i + 1] < clamped) i++

    const t = (clamped - xs[i]) / (xs[i + 1] - xs[i])
    // Smooth cosine hermite interpolation between points
    const ft = (1 - Math.cos(t * Math.PI)) * 0.5
    return ys[i] * (1 - ft) + ys[i + 1] * ft
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

// 4. Process a single RGB color through the parsed XMP profile
function gradePixel(r0, g0, b0, p) {
  let r = r0
  let g = g0
  let b = b0

  // Calibration shifts
  if (p.redHue || p.greenHue || p.blueHue) {
    r += (p.redHue / 100) * 0.05 * r
    g += (p.greenHue / 100) * 0.05 * g
    b += (p.blueHue / 100) * 0.05 * b
  }

  // White balance / Temp / Tint
  r += p.temp * 0.003
  b -= p.temp * 0.003
  g -= p.tint * 0.003
  r += p.tint * 0.0015
  b += p.tint * 0.0015

  // Exposure
  if (p.exposure !== 0) {
    const mult = Math.pow(2, p.exposure)
    r *= mult
    g *= mult
    b *= mult
  }

  // Highlights, Shadows, Whites, Blacks
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (p.highlights !== 0 && lum > 0.5) {
    const hFactor = (lum - 0.5) * 2 * (p.highlights / 100) * 0.25
    r += hFactor
    g += hFactor
    b += hFactor
  }
  if (p.shadows !== 0 && lum < 0.5) {
    const sFactor = (1 - lum * 2) * (p.shadows / 100) * 0.25
    r += sFactor
    g += sFactor
    b += sFactor
  }
  if (p.whites !== 0 && lum > 0.7) {
    const wFactor = (lum - 0.7) * 3.33 * (p.whites / 100) * 0.2
    r += wFactor
    g += wFactor
    b += wFactor
  }
  if (p.blacks !== 0 && lum < 0.3) {
    const bFactor = (1 - lum * 3.33) * (p.blacks / 100) * 0.2
    r += bFactor
    g += bFactor
    b += bFactor
  }

  // Tone Curves
  r = p.evalCurveRed(r)
  g = p.evalCurveGreen(g)
  b = p.evalCurveBlue(b)

  r = p.evalCurveMaster(r)
  g = p.evalCurveMaster(g)
  b = p.evalCurveMaster(b)

  // HSL Split Toning & Saturation
  let [h, s, l] = rgbToHsl(Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, b)))

  // Split Toning Shadows
  if (p.splitShadowSat > 0) {
    const shadowWeight = Math.pow(1 - l, 2) * (p.splitShadowSat / 100)
    const [sr, sg, sb] = hslToRgb(p.splitShadowHue, 1, l)
    r = r * (1 - shadowWeight) + sr * shadowWeight
    g = g * (1 - shadowWeight) + sg * shadowWeight
    b = b * (1 - shadowWeight) + sb * shadowWeight
  }

  // Split Toning Highlights
  if (p.splitHighlightSat > 0) {
    const highlightWeight = Math.pow(l, 2) * (p.splitHighlightSat / 100)
    const [hr, hg, hb] = hslToRgb(p.splitHighlightHue, 1, l)
    r = r * (1 - highlightWeight) + hr * highlightWeight
    g = g * (1 - highlightWeight) + hg * highlightWeight
    b = b * (1 - highlightWeight) + hb * highlightWeight
  }

  // Global Saturation & Vibrance
  const totalSat = 1 + (p.saturation + p.vibrance * 0.6) / 100
  const avg = (r + g + b) / 3
  r = avg + (r - avg) * totalSat
  g = avg + (g - avg) * totalSat
  b = avg + (b - avg) * totalSat

  return [
    Math.round(Math.max(0, Math.min(1, r)) * 255),
    Math.round(Math.max(0, Math.min(1, g)) * 255),
    Math.round(Math.max(0, Math.min(1, b)) * 255),
  ]
}

// 5. Generate 1024x32 3D LUT PNG
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

  console.log(`Generated: ${outFileName} from ${path.relative(process.cwd(), xmpPath)}`)
}

async function main() {
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
  console.log('All ThePresetsRoom film presets converted to 3D LUT PNGs successfully!')
}

main()
