import { FILM_PRESETS, getTier } from '@/lib/catalog'
import Reveal from '@/components/ui/Reveal'
import SplitText from '@/components/ui/SplitText'
import Counter from '@/components/ui/Counter'
import Marquee from '@/components/ui/Marquee'
import styles from './StatsBand.module.css'

const STARTER = getTier('starter')!

/**
 * Band angka sebagai bukti.
 *
 * Situs agensi memakai slot ini untuk metrik hasil kerja — nilai iklan yang
 * dikelola, angka retensi klien. Kita belum menjalankan satu acara pun, jadi
 * angka semacam itu hanya bisa dikarang, dan angka karangan di halaman harga
 * adalah bohong yang gampang ketahuan.
 *
 * Yang dipakai justru fakta produk yang bisa diperiksa siapa pun langsung dari
 * aplikasinya, dan semuanya dibaca dari katalog supaya tidak pernah berbeda
 * dari yang sebenarnya berlaku.
 *
 * Ganti seksi ini dengan metrik acara sungguhan begitu ada — itu bukti yang
 * jauh lebih kuat.
 */

/** Baris kompatibilitas: menegaskan cakupan tanpa menambah klaim baru. */
const REACH = [
  'iPhone',
  'Android',
  'Desktop',
  'Tanpa aplikasi',
  'Tanpa akun',
  'Browser apa saja',
] as const

export default function StatsBand() {
  const stats = [
    { value: 0, suffix: '', label: 'Aplikasi diunduh tamu' },
    { value: FILM_PRESETS.length, suffix: '', label: 'Roll film untuk dipilih' },
    { value: STARTER.shotsPerGuest, suffix: '', label: 'Jepretan gratis per tamu' },
    { value: STARTER.retentionDays ?? 0, suffix: ' hari', label: 'Foto tersimpan' },
  ] as const

  return (
    <section id="angka" className={`${styles.section} surface-dark`}>
      <div className="container">
        <Reveal>
          <p className={styles.eyebrow}>Yang bisa diperiksa</p>
        </Reveal>

        <h2 className={styles.title}>
          <SplitText by="word" delay={80}>
            Tamu memindai satu QR code, lalu langsung memotret.
          </SplitText>
        </h2>

        <ul className={styles.grid}>
          {stats.map((stat, i) => (
            <Reveal key={stat.label} as="li" delay={i * 110} className={styles.cell}>
              <span className={styles.value}>
                <Counter to={stat.value} suffix={stat.suffix} />
              </span>
              <span className={styles.label}>{stat.label}</span>
            </Reveal>
          ))}
        </ul>
      </div>

      <Marquee className={styles.reachBand} speed={38} direction="right" label="Jangkauan perangkat">
        {REACH.map((item) => (
          <span key={item} className={styles.reachItem}>
            {item}
            <span className={styles.reachDot} aria-hidden="true" />
          </span>
        ))}
      </Marquee>
    </section>
  )
}
