'use client'

import type { CSSProperties, ElementType } from 'react'
import { Fragment } from 'react'
import { useInView } from './useInView'
import styles from './SplitText.module.css'

interface SplitTextProps {
  children: string
  /** Satuan pecahan. `word` untuk judul, `char` untuk paragraf argumen. */
  by?: 'word' | 'char'
  /** Keadaan awal tiap potongan. Sama dengan varian `Reveal`. */
  direction?: 'blur' | 'up'
  /** Elemen pembungkus yang dirender. Default `span`. */
  as?: ElementType
  /** Jeda dasar seluruh kelompok, dalam milidetik. */
  delay?: number
  className?: string
}

/**
 * Memecah satu kalimat jadi potongan-potongan yang muncul bertahap.
 *
 * Satu `IntersectionObserver` untuk seluruh kalimat, bukan satu per potongan.
 * Judul hero punya sembilan kata dan paragraf argumen punya puluhan karakter;
 * membungkus tiap potongan dengan `<Reveal>` sendiri berarti puluhan observer
 * untuk satu kalimat yang toh masuk viewport bersamaan.
 *
 * Pemecahannya terjadi saat render, jadi HTML-nya sudah lengkap sebelum
 * JavaScript jalan. Yang dikerjakan klien hanya menyalakan `.reveal-visible`.
 *
 * Aksesibilitas: potongannya `aria-hidden` dan kalimat utuhnya diberikan lewat
 * `aria-label` di pembungkus. Tanpa itu, pembacaan per karakter terdengar
 * seperti mengeja, dan pembacaan per kata kehilangan intonasi kalimat.
 */
export default function SplitText({
  children,
  by = 'word',
  direction = 'blur',
  as: Tag = 'span',
  delay = 0,
  className,
}: SplitTextProps) {
  const { ref, inView } = useInView<HTMLSpanElement>()

  // Dipecah per kata lebih dulu di kedua mode. Dalam mode `char` pun katanya
  // tetap jadi satu kotak inline-block, supaya baris tidak pernah patah di
  // tengah kata.
  const words = children.split(' ').filter((w) => w.length > 0)

  const piece = ['reveal', `reveal-${direction}`, inView ? 'reveal-visible' : '', styles.piece]
    .filter(Boolean)
    .join(' ')

  // Penghitung berjalan lintas kata supaya tangga jedanya menyapu seluruh
  // kalimat, bukan mengulang dari nol di tiap kata.
  let index = 0

  return (
    <Tag
      ref={ref}
      className={[styles.wrap, className].filter(Boolean).join(' ')}
      aria-label={children}
      style={delay ? ({ '--group-delay': `${delay}ms` } as CSSProperties) : undefined}
    >
      <span aria-hidden="true">
        {words.map((word, w) => (
          <Fragment key={`${word}-${w}`}>
            {w > 0 && ' '}
            <span className={styles.word}>
              {by === 'word' ? (
                <span className={piece} style={{ '--i': index++ } as CSSProperties}>
                  {word}
                </span>
              ) : (
                Array.from(word).map((char, c) => (
                  <span
                    key={c}
                    className={piece}
                    style={{ '--i': index++ } as CSSProperties}
                  >
                    {char}
                  </span>
                ))
              )}
            </span>
          </Fragment>
        ))}
      </span>
    </Tag>
  )
}
