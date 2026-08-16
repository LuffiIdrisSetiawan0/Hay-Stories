import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const ARCHIVE = 'http://rawtherapee.com/shared/HaldCLUT.zip';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'luts');
const TARGET = 32;

const PRESETS = {
  'golden-hour-400': 'HaldCLUT/Color/Kodak/Kodak Portra 400 VC 3 +.png',
  'pastel-400': 'HaldCLUT/Color/Fuji/Fuji Astia 100F.png',
  'neon-night-1600': 'HaldCLUT/Color/Kodak/Kodak Portra 800 3 +.png',
  'everyday-100': 'HaldCLUT/Color/Kodak/Kodak Portra 160 NC 2.png',
  'sunday-chrome': 'HaldCLUT/Color/Kodak/Kodak Ektar 100.png',
  'noir-400': 'HaldCLUT/Black-and-White/Kodak/Kodak TRI-X 400 4 +.png',
  'agfa-vista-200': 'HaldCLUT/Color/Agfa/Agfa Vista 200.png',
  'fuji-superia-400': 'HaldCLUT/Color/Fuji/Fuji Superia 400 4 ++.png',
  'fuji-velvia-50': 'HaldCLUT/Color/Fuji/Fuji Velvia 50.png',
  'kodak-ektachrome-100': 'HaldCLUT/Color/Kodak/Kodak Ektachrome 100 VS.png',
  'kodachrome-64': 'HaldCLUT/Color/Kodak/Kodak Kodachrome 64.png',
  'ilford-hp5-400': 'HaldCLUT/Black-and-White/Ilford/Ilford HP5 Plus 400.png',
};

async function range(from, to) {
  const res = await fetch(ARCHIVE, { headers: { Range: `bytes=${from}-${to}` } });
  if (!res.ok && res.status !== 206) throw new Error(`Range gagal: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function archiveSize() {
  const res = await fetch(ARCHIVE, { method: 'HEAD' });
  const len = Number(res.headers.get('content-length'));
  if (!len) throw new Error('Ukuran arsip tidak diketahui.');
  return len;
}

async function readIndex() {
  const size = await archiveSize();
  const tail = await range(Math.max(0, size - 65558), size - 1);
  const eocd = tail.lastIndexOf(Buffer.from('PK\x05\x06', 'binary'));
  if (eocd < 0) throw new Error('End of central directory tidak ditemukan.');

  const cdSize = tail.readUInt32LE(eocd + 12);
  const cdOffset = tail.readUInt32LE(eocd + 16);
  const cd = await range(cdOffset, cdOffset + cdSize - 1);

  const index = new Map();
  let p = 0;
  while (p < cd.length - 4 && cd.readUInt32LE(p) === 0x02014b50) {
    const method = cd.readUInt16LE(p + 10);
    const compressed = cd.readUInt32LE(p + 20);
    const nameLen = cd.readUInt16LE(p + 28);
    const extraLen = cd.readUInt16LE(p + 30);
    const commentLen = cd.readUInt16LE(p + 32);
    const localHeader = cd.readUInt32LE(p + 42);
    const name = cd.subarray(p + 46, p + 46 + nameLen).toString('utf8');

    index.set(name, { method, compressed, localHeader });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return index;
}

async function extract(entry) {
  const header = await range(entry.localHeader, entry.localHeader + 29);
  const nameLen = header.readUInt16LE(26);
  const extraLen = header.readUInt16LE(28);
  const start = entry.localHeader + 30 + nameLen + extraLen;

  const raw = await range(start, start + entry.compressed - 1);
  return entry.method === 8 ? inflateRawSync(raw) : raw;
}

function haldCubeSide(imageWidth) {
  const level = Math.round(Math.cbrt(imageWidth));
  return level * level;
}

function sampleCube(src, side, imageWidth, r, g, b) {
  const at = (ri, gi, bi) => {
    const i = bi * side * side + gi * side + ri;
    const p = ((Math.floor(i / imageWidth) * imageWidth) + (i % imageWidth)) * 3;
    return [src[p], src[p + 1], src[p + 2]];
  };

  const f = (v) => {
    const x = v * (side - 1);
    const i0 = Math.floor(x);
    return [i0, Math.min(i0 + 1, side - 1), x - i0];
  };

  const [r0, r1, rt] = f(r);
  const [g0, g1, gt] = f(g);
  const [b0, b1, bt] = f(b);

  const out = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const lerp = (a, z, t) => a + (z - a) * t;
    const c00 = lerp(at(r0, g0, b0)[c], at(r1, g0, b0)[c], rt);
    const c10 = lerp(at(r0, g1, b0)[c], at(r1, g1, b0)[c], rt);
    const c01 = lerp(at(r0, g0, b1)[c], at(r1, g0, b1)[c], rt);
    const c11 = lerp(at(r0, g1, b1)[c], at(r1, g1, b1)[c], rt);
    out[c] = lerp(lerp(c00, c10, gt), lerp(c01, c11, gt), bt);
  }
  return out;
}

function buildStrip(src, side, imageWidth, size) {
  const width = size * size;
  const out = Buffer.alloc(width * size * 3);
  const max = size - 1;

  for (let bi = 0; bi < size; bi++) {
    for (let gi = 0; gi < size; gi++) {
      for (let ri = 0; ri < size; ri++) {
        const [r, g, b] = sampleCube(src, side, imageWidth, ri / max, gi / max, bi / max);
        const p = (gi * width + bi * size + ri) * 3;
        out[p] = Math.round(r);
        out[p + 1] = Math.round(g);
        out[p + 2] = Math.round(b);
      }
    }
  }

  return sharp(out, { raw: { width, height: size, channels: 3 } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log('Membaca daftar isi arsip…');
  const index = await readIndex();

  for (const [id, source] of Object.entries(PRESETS)) {
    const entry = index.get(source);
    if (!entry) {
      console.warn(`Peringatan: tidak ada di arsip: ${source}`);
      continue;
    }

    const png = await extract(entry);
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const side = haldCubeSide(info.width);

    const strip = await buildStrip(data, side, info.width, TARGET);
    await writeFile(join(OUT_DIR, `${id}.png`), strip);

    console.log(
      `✓ ${id.padEnd(20)} kubus ${String(side).padStart(3)}³ -> ${TARGET}³   ` +
        `${String(Math.round(strip.length / 1024)).padStart(4)} KB   (${source.split('/').pop()})`
    );
  }

  console.log(`\nSemua ${Object.keys(PRESETS).length} LUT film berhasil dibuat di public/luts/!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
