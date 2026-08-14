import { ArrowDown } from 'lucide-react'
import styles from './ScrollCue.module.css'

interface ScrollCueProps {
  /** Anchor tujuan saat ditekan. */
  href: string
  /** Teks yang melingkari panah. Diulang sampai lingkarannya penuh. */
  label?: string
}

/**
 * Penanda "masih ada di bawah": teks melingkar yang berputar pelan mengelilingi
 * panah bawah.
 *
 * Sebuah tautan, bukan tombol — tujuannya memang berpindah ke seksi berikutnya,
 * jadi pengguna keyboard mendapat perilaku yang mereka harapkan dan menekannya
 * dengan tombol tengah membuka tab baru seperti tautan lain.
 *
 * Teksnya diulang di dalam string, bukan dirender berkali-kali, supaya spasinya
 * mengikuti panjang path dan tidak perlu dihitung manual.
 */
export default function ScrollCue({ href, label = 'Gulir ke bawah' }: ScrollCueProps) {
  const ring = `${label} · ${label} · `

  return (
    <a href={href} className={styles.cue} aria-label={label}>
      <svg className={styles.ring} viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          {/* Dimulai di bawah lalu memutar searah jarum jam, jadi teksnya tegak
              di titik paling terbaca. */}
          <path
            id="scroll-cue-path"
            fill="none"
            d="M 50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0"
          />
        </defs>
        <text className={styles.ringText}>
          <textPath href="#scroll-cue-path" startOffset="0">
            {ring}
          </textPath>
        </text>
      </svg>
      <ArrowDown className={styles.arrow} size={18} strokeWidth={1.5} aria-hidden="true" />
    </a>
  )
}
