'use client'

import type { ElementType, ReactNode } from 'react'
import { useInView } from './useInView'

type Direction = 'up' | 'left' | 'right' | 'scale' | 'none'

interface RevealProps {
  children: ReactNode
  /** Arah datangnya elemen. Default naik dari bawah. */
  direction?: Direction
  /** Jeda dalam milidetik — untuk memberi ritme berurutan pada sekelompok item. */
  delay?: number
  /** Elemen HTML yang dirender. Default `div`. */
  as?: ElementType
  className?: string
  id?: string
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
 */
export default function Reveal({
  children,
  direction = 'up',
  delay = 0,
  as: Tag = 'div',
  className,
  id,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <Tag
      ref={ref}
      id={id}
      className={['reveal', `reveal-${direction}`, inView ? 'reveal-visible' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
