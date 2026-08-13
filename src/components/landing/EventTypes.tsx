import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import Reveal from '@/components/ui/Reveal'
import styles from './EventTypes.module.css'

/**
 * Empat pintu masuk berdasarkan jenis acara, tepat di bawah hero.
 *
 * Menaruhnya sedini ini disengaja: pengunjung datang membawa satu acara di
 * kepalanya, bukan rasa ingin tahu umum. Memberi mereka pintu bernama acaranya
 * sendiri lebih cepat daripada menuntut mereka membaca dulu apa produk ini.
 */

const TYPES = [
  {
    href: '/pernikahan',
    label: 'Pernikahan',
    line: 'Akad, resepsi, dan semua sudut yang tidak sempat dilihat fotografer',
  },
  {
    href: '/ulang-tahun',
    label: 'Ulang Tahun',
    line: 'Dari tiup lilin sampai tawa yang tidak ada di kamera siapa pun',
  },
  {
    href: '/pesta',
    label: 'Pesta',
    line: 'Malam panjang, lampu warna, dan tamu yang saling memotret',
  },
  {
    href: '/acara-kantor',
    label: 'Acara Kantor',
    line: 'Gathering dan perayaan tim, tanpa perlu menyewa siapa pun',
  },
] as const

export default function EventTypes() {
  return (
    <section className={styles.wrap} aria-label="Jenis acara">
      <div className="container">
        <ul className={styles.grid}>
          {TYPES.map((type, i) => (
            <Reveal key={type.href} delay={i * 90} as="li" className={styles.cell}>
              <Link href={type.href} className={styles.card}>
                <span className={styles.index}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.label}>
                  {type.label}
                  <ArrowUpRight size={16} className={styles.arrow} />
                </span>
                <span className={styles.line}>{type.line}</span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
