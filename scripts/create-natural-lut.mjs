import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'luts', 'natural-clean.png');
const SIZE = 32;
const WIDTH = SIZE * SIZE; // 1024
const HEIGHT = SIZE; // 32

const buffer = Buffer.alloc(WIDTH * HEIGHT * 3);

for (let y = 0; y < HEIGHT; y++) {
  const g = y / (SIZE - 1);
  for (let z = 0; z < SIZE; z++) {
    const b = z / (SIZE - 1);
    for (let x = 0; x < SIZE; x++) {
      const r = x / (SIZE - 1);
      const px = z * SIZE + x;
      const offset = (y * WIDTH + px) * 3;
      buffer[offset] = Math.round(r * 255);
      buffer[offset + 1] = Math.round(g * 255);
      buffer[offset + 2] = Math.round(b * 255);
    }
  }
}

await sharp(buffer, {
  raw: {
    width: WIDTH,
    height: HEIGHT,
    channels: 3,
  },
})
  .png({ compressionLevel: 9 })
  .toFile(OUT_FILE);

console.log(`Generated identity LUT at ${OUT_FILE}`);
