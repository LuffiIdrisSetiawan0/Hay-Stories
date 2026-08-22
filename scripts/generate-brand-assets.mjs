import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appDir = path.join(projectRoot, 'src', 'app')

function iconSvg(size) {
  const ring = Math.round(size * 0.7)
  const ringOffset = Math.round((size - ring) / 2)

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#0c0b09"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${ring / 2}" fill="none" stroke="#765127" stroke-width="${Math.max(2, Math.round(size * 0.006))}"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#f8f1e5" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(size * 0.47)}" font-weight="800">H</text>
      <circle cx="${ringOffset + ring * 0.82}" cy="${ringOffset + ring * 0.18}" r="${Math.round(size * 0.033)}" fill="#ddb57a"/>
    </svg>`
}

function openGraphSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#0c0b09"/>
      <circle cx="1075" cy="-20" r="320" fill="#17130f"/>
      <circle cx="72" cy="66" r="9" fill="#ddb57a"/>
      <text x="98" y="74" fill="#f8f1e5" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="800" letter-spacing="5">HAY STORIES</text>

      <text x="72" y="302" fill="#f8f1e5" font-family="Arial, Helvetica, sans-serif" font-size="80" font-weight="800" letter-spacing="-4">Semua sudut.</text>
      <text x="72" y="392" fill="#ddb57a" font-family="Arial, Helvetica, sans-serif" font-size="80" font-weight="800" letter-spacing="-4">Satu cerita.</text>
      <text x="74" y="447" fill="#cbc3b6" font-family="Arial, Helvetica, sans-serif" font-size="24">Kamera tamu lewat QR · tanpa instalasi aplikasi</text>

      <g transform="translate(850 108) rotate(6 145 205)">
        <rect width="290" height="410" rx="6" fill="#f8f1e5"/>
        <rect x="18" y="18" width="254" height="290" rx="3" fill="#765127"/>
        <circle cx="145" cy="163" r="92" fill="#1c1915"/>
        <circle cx="145" cy="163" r="62" fill="#ddb57a"/>
        <circle cx="145" cy="163" r="27" fill="#f8f1e5"/>
        <text x="22" y="350" fill="#1a1a1a" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="700">CERITA DARI TAMU</text>
        <text x="22" y="381" fill="#765127" font-family="Arial, Helvetica, sans-serif" font-size="15" letter-spacing="2">ROLL 01 · HAY</text>
      </g>
    </svg>`
}

function wrapPngAsIco(png, size) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry.writeUInt8(size === 256 ? 0 : size, 0)
  entry.writeUInt8(size === 256 ? 0 : size, 1)
  entry.writeUInt8(0, 2)
  entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(header.length + entry.length, 12)

  return Buffer.concat([header, entry, png])
}

const faviconSize = 64
const faviconPng = await sharp(Buffer.from(iconSvg(faviconSize))).png().toBuffer()

await Promise.all([
  writeFile(path.join(appDir, 'favicon.ico'), wrapPngAsIco(faviconPng, faviconSize)),
  sharp(Buffer.from(iconSvg(512))).png().toFile(path.join(appDir, 'icon.png')),
  sharp(Buffer.from(iconSvg(180))).png().toFile(path.join(appDir, 'apple-icon.png')),
  sharp(Buffer.from(openGraphSvg())).png().toFile(path.join(appDir, 'opengraph-image.png')),
])

console.log('Generated favicon.ico, icon.png, apple-icon.png, and opengraph-image.png')
