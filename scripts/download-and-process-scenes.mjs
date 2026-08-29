import sharp from 'sharp';
import https from 'node:https';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = join(__dirname, '..', 'public', 'img', 'scenes');

/**
 * Ukuran master.
 *
 * Satu berkas harus melayani dua arah pemangkasan sekaligus: 16:9 di panggung
 * jenis acara dan panel foto, lalu 4:5 potret di halaman acara. Rasio 3:2 duduk
 * di antara keduanya, jadi tidak ada slot yang sampai memperbesar gambar —
 * bahkan pada layar DPR 2, tempat panggung selebar 1136px meminta 2272px.
 *
 * Besarnya master cuma membebani repo, bukan jaringan: next/image tetap
 * mengirim varian yang sudah diperkecil sesuai `sizes`.
 */
const MASTER_W = 2400;
const MASTER_H = 1600;

/**
 * Diambil lebih besar daripada master lalu diperkecil. Supersample 1,25× itu
 * yang membuat detail halusnya tetap rapat sesudah dikompres.
 *
 * `fm=jpg` disengaja: Unsplash melayani webp/avif kalau dibiarkan, dan
 * mengubah webp jadi webp lagi menumpuk artefak kompresi dua kali.
 */
const FETCH_W = 3000;
const FETCH_H = 2000;

/**
 * Enam foto contoh.
 *
 * `id` adalah ID Unsplash gratis (images.unsplash.com). Jangan memakai
 * plus.unsplash.com/premium_photo-* — itu Unsplash+ berbayar dan lisensinya
 * tidak sama.
 *
 * Nama berkasnya sengaja menggambarkan ISI, bukan nomor urut. Versi sebelumnya
 * memakai `01-pelaminan` sampai `06-konfeti`, dan penomoran itulah yang membuat
 * isi berkas bisa melenceng dari namanya tanpa ketahuan — `02-meja-dekorasi`
 * ternyata berisi atlet melempar bubuk kapur, dan `06-konfeti` ternyata foto
 * yang sama persis dengan latar hero.
 */
const SCENES = [
  {
    id: 'photo-1518757535402-49f315ea55f6',
    name: 'tamu-memotret',
    isi: 'tangan tamu memotret rombongan pengiring pengantin dengan ponsel',
  },
  {
    id: 'photo-1504993945773-3f38e1b6a626',
    name: 'pernikahan-buket',
    isi: 'pengantin melempar buket ke arah para tamu di halaman, siang hari',
  },
  {
    id: 'photo-1758275557513-241a2a229936',
    name: 'ulang-tahun-taman',
    isi: 'sekelompok teman bertopi pesta mengelilingi kue ulang tahun di taman',
  },
  {
    id: 'photo-1565125175292-f3177f64c794',
    name: 'acara-kantor',
    isi: 'rekan kerja bersulang sambil tertawa di ruang santai kantor',
  },
  {
    id: 'photo-1516450360452-9312f5e86fc7',
    name: 'pesta-malam',
    isi: 'kerumunan mengangkat tangan di bawah lampu panggung dan laser',
  },
  {
    id: 'photo-1763553113332-800519753e40',
    name: 'meja-dekorasi',
    isi: 'meja resepsi berhias rangkaian bunga di ruangan bercahaya hangat',
  },
];

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Terlalu banyak pengalihan'));

    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return fetchBuffer(res.headers.location, redirects + 1).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Gagal mengambil ${url} — status ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function processScene(scene) {
  const url = `https://images.unsplash.com/${scene.id}?fm=jpg&fit=crop&w=${FETCH_W}&h=${FETCH_H}&q=92`;
  process.stdout.write(`  ${scene.name} ... `);

  const raw = await fetchBuffer(url);

  // Berkas kesalahan Unsplash juga berstatus 200 kadang-kadang; ukurannya yang
  // membedakan. Lebih baik gagal keras di sini daripada menulis berkas rusak.
  if (raw.length < 20_000) {
    throw new Error(`balasan terlalu kecil (${raw.length} byte) — ID ${scene.id} mungkin salah`);
  }

  const out = await sharp(raw)
    .resize(MASTER_W, MASTER_H, { fit: 'cover', position: 'center' })
    .webp({ quality: 82, effort: 6 })
    .toBuffer();

  const path = join(SCENES_DIR, `${scene.name}.webp`);
  await writeFile(path, out);

  const meta = await sharp(out).metadata();
  const kb = (out.length / 1024).toFixed(0);
  console.log(`${meta.width}x${meta.height}, ${kb} KB`);

  if (meta.width !== MASTER_W || meta.height !== MASTER_H) {
    throw new Error(`dimensi meleset: ${meta.width}x${meta.height}`);
  }
}

async function main() {
  await mkdir(SCENES_DIR, { recursive: true });

  console.log(`Menulis ${SCENES.length} foto master ${MASTER_W}x${MASTER_H} ke public/img/scenes/\n`);
  for (const scene of SCENES) {
    await processScene(scene);
  }

  console.log('\nSelesai. Buka berkasnya sebelum dipasang — nama berkas bukan bukti isi.');
}

main().catch((err) => {
  console.error('\nGagal memproses gambar:', err.message);
  process.exit(1);
});
