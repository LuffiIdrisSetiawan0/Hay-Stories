import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FILM_PRESETS } from '@/lib/catalog'
import styles from './Credits.module.css'

export const metadata: Metadata = {
  title: 'Kredit',
  description: 'Atribusi karya pihak ketiga yang dipakai HAY Stories.',
}

/**
 * Halaman atribusi.
 *
 * Ini kewajiban lisensi, bukan pelengkap: tabel warna film kami diturunkan dari
 * koleksi CC BY-SA 4.0 yang mensyaratkan atribusi terlihat publik. Menghapus
 * halaman ini atau tautannya di footer membuat pemakaian LUT-nya melanggar
 * lisensi. Rinciannya di CREDITS.md.
 */
export default function CreditsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Link href="/" className={styles.back}>
          <ArrowLeft size={15} />
          Kembali
        </Link>

        <h1 className={styles.title}>Kredit</h1>
        <p className={styles.lede}>
          HAY Stories berdiri di atas karya orang lain. Berikut yang kami pakai dan siapa yang
          membuatnya.
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Tabel warna film</h2>

          <p className={styles.body}>
            Koleksi preset film kami — {FILM_PRESETS.map((p) => p.name).join(', ')} — dirancang
            untuk memberikan estetika warna analog kamera vintage dan disposable camera secara akurat.
          </p>

          <p className={styles.body}>
            Dibuat oleh <strong>Pat David</strong>, <strong>Pavlov Dmitry</strong>, dan{' '}
            <strong>Michael Ezra</strong>, dilisensikan{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              CC BY-SA 4.0
            </a>
            .
          </p>

          <p className={styles.body}>
            Berkas tabel warna hasil turunan di aplikasi ini ikut berlisensi CC BY-SA 4.0, dan boleh
            dipakai ulang siapa pun dengan syarat yang sama. Koleksi aslinya bisa diunduh di{' '}
            <a
              href="http://rawpedia.rawtherapee.com/Film_Simulation"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              RawPedia
            </a>
            .
          </p>

          <p className={styles.note}>
            Nama roll di aplikasi ini orisinal dan tidak merujuk merek film mana pun. Kami tidak
            berafiliasi dengan, dan tidak didukung oleh, produsen film mana pun.
          </p>
        </section>
      </div>
    </main>
  )
}
