/**
 * Audit statis untuk LUT yang benar-benar aktif di FILM_PRESETS.
 *
 * Script ini tidak mengimpor TypeScript aplikasi dan tidak memiliki daftar
 * preset kedua yang bisa basi. Daftar id/path dibaca langsung dari blok
 * FILM_PRESETS di src/lib/catalog.ts.
 *
 *   npm run audit:luts
 *   npm run audit:luts -- --strict   # warning juga membuat exit code 1
 */

import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CATALOG = join(ROOT, 'src', 'lib', 'catalog.ts')
const RENDERER = join(ROOT, 'src', 'lib', 'film', 'renderer.ts')
const BUILD_LUTS = join(ROOT, 'scripts', 'build-luts.mjs')
const STRICT = process.argv.includes('--strict')
const COLOR_CHUNKS = new Set(['sRGB', 'gAMA', 'cHRM', 'iCCP'])

function parseActivePresets(source) {
  const start = source.indexOf('export const FILM_PRESETS')
  const end = start < 0 ? -1 : source.indexOf('] as const', start)
  if (start < 0 || end < 0) throw new Error('Blok FILM_PRESETS tidak ditemukan di catalog.ts.')

  const block = source.slice(start, end)
  const entries = []
  const pattern = /\{\s*id:\s*'([^']+)'[\s\S]*?lut:\s*'([^']+)'[\s\S]*?\n\s*\}/g

  for (const match of block.matchAll(pattern)) {
    entries.push({ id: match[1], lut: match[2] })
  }

  if (entries.length === 0) throw new Error('Tidak ada preset aktif yang dapat dibaca.')

  const ids = new Set()
  const paths = new Set()
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`Id preset aktif duplikat: ${entry.id}`)
    if (paths.has(entry.lut)) throw new Error(`Path LUT aktif duplikat: ${entry.lut}`)
    if (!entry.lut.startsWith('/luts/') || !entry.lut.endsWith('.png')) {
      throw new Error(`Path LUT tidak sah untuk ${entry.id}: ${entry.lut}`)
    }
    ids.add(entry.id)
    paths.add(entry.lut)
  }

  return entries
}

function parseRawTherapeeMappings(source) {
  const start = source.indexOf('const PRESETS = {')
  const end = start < 0 ? -1 : source.indexOf('\n}', start)
  if (start < 0 || end < 0) throw new Error('Pemetaan PRESETS tidak ditemukan di build-luts.mjs.')

  const mappings = new Map()
  const pattern = /'([^']+)'\s*:\s*'([^']+)'/g
  for (const match of source.slice(start, end).matchAll(pattern)) mappings.set(match[1], match[2])
  return mappings
}

function pngChunks(buffer) {
  const signature = '89504e470d0a1a0a'
  if (buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('Signature PNG tidak sah.')
  }

  const chunks = []
  let offset = 8
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const end = offset + 12 + length
    if (end > buffer.length) throw new Error('Chunk PNG terpotong.')

    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii')
    chunks.push(type)
    offset = end
    if (type === 'IEND') break
  }

  if (chunks.at(-1) !== 'IEND') throw new Error('PNG tidak memiliki chunk IEND.')
  return chunks
}

function cubeSampler(data, width, size, channels) {
  const pixel = (red, green, blue) => {
    const index = (green * width + blue * size + red) * channels
    return [data[index] / 255, data[index + 1] / 255, data[index + 2] / 255]
  }

  return ([red, green, blue]) => {
    const coordinates = [red, green, blue].map((value) =>
      Math.max(0, Math.min(size - 1, value * (size - 1)))
    )
    const lower = coordinates.map(Math.floor)
    const upper = lower.map((value) => Math.min(size - 1, value + 1))
    const mix = coordinates.map((value, index) => value - lower[index])
    const result = [0, 0, 0]

    for (let blueCorner = 0; blueCorner <= 1; blueCorner++) {
      for (let greenCorner = 0; greenCorner <= 1; greenCorner++) {
        for (let redCorner = 0; redCorner <= 1; redCorner++) {
          const weight =
            (redCorner ? mix[0] : 1 - mix[0]) *
            (greenCorner ? mix[1] : 1 - mix[1]) *
            (blueCorner ? mix[2] : 1 - mix[2])
          const value = pixel(
            redCorner ? upper[0] : lower[0],
            greenCorner ? upper[1] : lower[1],
            blueCorner ? upper[2] : lower[2]
          )
          for (let channel = 0; channel < 3; channel++) result[channel] += value[channel] * weight
        }
      }
    }

    return result
  }
}

function luma([red, green, blue]) {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function hex(rgb) {
  return `#${rgb
    .map((value) => Math.round(Math.max(0, Math.min(1, value)) * 255).toString(16).padStart(2, '0'))
    .join('')}`
}

function measureCube(sample) {
  let previousLuma = -Infinity
  let reversals = 0
  let worstReversal = 0
  let neutralCast = 0

  for (let step = 0; step <= 256; step++) {
    const value = step / 256
    const output = sample([value, value, value])
    const outputLuma = luma(output)
    const delta = outputLuma - previousLuma
    if (step > 0 && delta < -0.5 / 255) {
      reversals++
      worstReversal = Math.max(worstReversal, -delta)
    }
    previousLuma = outputLuma
    neutralCast = Math.max(neutralCast, Math.max(...output) - Math.min(...output))
  }

  let clippedChannels = 0
  let sampledChannels = 0
  for (let blue = 0; blue <= 16; blue++) {
    for (let green = 0; green <= 16; green++) {
      for (let red = 0; red <= 16; red++) {
        const output = sample([red / 16, green / 16, blue / 16])
        for (const channel of output) {
          sampledChannels++
          if (channel <= 0.5 / 255 || channel >= 254.5 / 255) clippedChannels++
        }
      }
    }
  }

  return {
    black: sample([0, 0, 0]),
    white: sample([1, 1, 1]),
    lightSkin: sample([0.76, 0.52, 0.38]),
    deepSkin: sample([0.36, 0.22, 0.17]),
    reversals,
    worstReversal,
    neutralCast,
    clippedRatio: clippedChannels / sampledChannels,
  }
}

function identityError(data, width, size, channels) {
  let maximum = 0
  for (let blue = 0; blue < size; blue++) {
    for (let green = 0; green < size; green++) {
      for (let red = 0; red < size; red++) {
        const index = (green * width + blue * size + red) * channels
        const expected = [red, green, blue].map((value) => (value / (size - 1)) * 255)
        for (let channel = 0; channel < 3; channel++) {
          maximum = Math.max(maximum, Math.abs(data[index + channel] - expected[channel]))
        }
      }
    }
  }
  return maximum
}

async function auditPreset(entry, expectedLutSize, warnings) {
  const file = join(ROOT, 'public', entry.lut.replace(/^\/luts\//, 'luts/'))
  const source = await readFile(file).catch((error) => {
    throw new Error(`LUT ${entry.id} tidak dapat dibaca (${file}): ${error.message}`)
  })
  const chunks = pngChunks(source)
  const taggedChunks = chunks.filter((type) => COLOR_CHUNKS.has(type))
  if (taggedChunks.length > 0) {
    warnings.push(
      `${entry.id}: mengandung chunk ${taggedChunks.join(', ')}; LUT adalah data texture dan renderer meminta tanpa konversi warna.`
    )
  }

  const image = sharp(source, { failOn: 'error' }).removeAlpha().toColourspace('srgb')
  const metadata = await image.metadata()
  const decoded = await image.raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = decoded.info

  if (!width || !height || width !== height * height || height < 2) {
    throw new Error(
      `${entry.id}: layout strip tidak sah (${width ?? '?'}x${height ?? '?'}), seharusnya N*N x N.`
    )
  }
  if (height !== expectedLutSize) {
    throw new Error(
      `${entry.id}: kubus ${height}³ tidak cocok dengan renderer (${expectedLutSize}³).`
    )
  }
  if (channels < 3) throw new Error(`${entry.id}: LUT hanya memiliki ${channels} channel.`)

  const sample = cubeSampler(decoded.data, width, height, channels)
  const metrics = measureCube(sample)

  if (metrics.reversals > 0) {
    warnings.push(
      `${entry.id}: gray ramp berbalik ${metrics.reversals} kali (maks ${(metrics.worstReversal * 255).toFixed(2)} level).`
    )
  }
  if (metrics.neutralCast > 48 / 255) {
    warnings.push(
      `${entry.id}: cast maksimum pada gray ramp ${(metrics.neutralCast * 255).toFixed(1)} level.`
    )
  }
  if (metrics.clippedRatio > 0.35) {
    warnings.push(
      `${entry.id}: ${(metrics.clippedRatio * 100).toFixed(1)}% channel sampel terklip di 0/255.`
    )
  }

  if (entry.id === 'natural-clean') {
    const error = identityError(decoded.data, width, height, channels)
    if (error > 1.01) {
      throw new Error(`natural-clean bukan identity LUT (galat maksimum ${error.toFixed(2)} level).`)
    }
  }

  return {
    preset: entry.id,
    strip: `${width}x${height}`,
    depth: metadata.depth ?? '?',
    sha256: createHash('sha256').update(source).digest('hex').slice(0, 12),
    black: hex(metrics.black),
    white: hex(metrics.white),
    lightSkin: hex(metrics.lightSkin),
    deepSkin: hex(metrics.deepSkin),
    reversals: metrics.reversals,
    neutralCast: (metrics.neutralCast * 255).toFixed(1),
    clipped: `${(metrics.clippedRatio * 100).toFixed(1)}%`,
  }
}

async function main() {
  const [catalog, renderer, buildLuts] = await Promise.all([
    readFile(CATALOG, 'utf8'),
    readFile(RENDERER, 'utf8'),
    readFile(BUILD_LUTS, 'utf8'),
  ])
  const entries = parseActivePresets(catalog)
  const rawTherapeeMappings = parseRawTherapeeMappings(buildLuts)
  for (const entry of entries) {
    if (entry.id !== 'natural-clean' && !rawTherapeeMappings.has(entry.id)) {
      throw new Error(`${entry.id}: preset aktif tidak memiliki pemetaan provenance di build-luts.mjs.`)
    }
  }
  const sizeMatch = renderer.match(/const LUT_SIZE\s*=\s*(\d+)/)
  if (!sizeMatch) throw new Error('LUT_SIZE tidak ditemukan di renderer.ts.')
  const expectedLutSize = Number(sizeMatch[1])
  const warnings = []
  const results = []

  for (const entry of entries) {
    results.push(await auditPreset(entry, expectedLutSize, warnings))
  }

  console.table(results)
  if (warnings.length > 0) {
    console.warn(`\n${warnings.length} warning audit LUT:`)
    for (const warning of warnings) console.warn(`- ${warning}`)
  }

  console.log(
    `\nPASS: ${results.length} LUT aktif valid secara struktur${warnings.length ? `, ${warnings.length} warning kualitas` : ''}.`
  )
  if (STRICT && warnings.length > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(`Audit LUT gagal: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
