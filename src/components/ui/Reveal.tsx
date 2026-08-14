'use client'

import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useInView } from './useInView'

type Direction = 'up' | 'left' | 'right' | 'scale' | 'none' | 'blur' | 'clip' | 'sweep' | 'throw'

interface RevealProps {
  /**
   * Opsional: varian `sweep` sering dipakai sebagai garis dekoratif kosong yang
   * seluruh isinya datang dari CSS.
   */
  children?: ReactNode
  /** Arah datangnya elemen. Default naik dari bawah. */
  direction?: Direction
  /** Jeda dalam milidetik — untuk memberi ritme berurutan pada sekelompok item. */
  delay?: number
  /** Elemen HTML yang dirender. Default `div`. */
  as?: ElementType
  className?: string
  id?: string
  style?: CSSProperties
  'aria-hidden'?: boolean | 'true' | 'false'
}

/**
 * Membungkus konten dengan animasi masuk saat di-scroll.
 *
 * Satu-satunya sumber animasi masuk di seluruh situs. Sebelumnya empat seksi
 * landing menyalin logika `IntersectionObserver` yang sama sementara empat
 * lainnya tidak beranimasi sama sekali.
 *
 * Kelasnya global (didefinisikan di globals.css), bukan CSS module, supaya
 * blok <noscript> di layout bisa memaksanya terlihat.
 *
 * Sembilan arah, semuanya cuma keadaan-awal yang berbeda dari transisi yang
 * sama: `blur` untuk judul yang dipecah per kata, `clip` untuk sapuan kiri ke
 * kanan, `sweep` untuk garis yang memanjang, `throw` untuk kartu yang
 * terlempar naik ke tempatnya.
 *
 * `delay` dan `--i` menumpuk, bukan saling menimpa: `delay` menggeser seluruh
 * kelompok, `--i` memberi ritme di dalamnya. Sekelompok kata bisa mulai 200ms
 * setelah kelompok di atasnya tanpa kehilangan tangga antar katanya sendiri.
 */
export default function Reveal({
  children,
  direction = 'up',
  delay = 0,
  as: Tag = 'div',
  className,
  id,
  style,
  'aria-hidden': ariaHidden,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <Tag
      ref={ref}
      id={id}
      aria-hidden={ariaHidden}
      className={['reveal', `reveal-${direction}`, inView ? 'reveal-visible' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={
        delay
          ? {
              ...style,
              transitionDelay: `calc(${delay}ms + var(--i, 0) * var(--stagger-step))`,
            }
          : style
      }
    >
      {children}
    </Tag>
  )
}
