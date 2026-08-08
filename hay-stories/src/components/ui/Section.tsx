import type { ReactNode } from 'react'
import Reveal from './Reveal'
import styles from './Section.module.css'

/**
 * Primitif seksi bersama, diturunkan dari pola yang sama-sama dipakai ketiga
 * situs referensi: eyebrow huruf besar ber-tracking di atas judul, dan baris
 * angka bukti dengan angka besar plus label mungil.
 *
 * Semuanya bekerja lewat token warna, jadi menempatkannya di dalam
 * `.surface-dark` sudah cukup untuk membuatnya beradaptasi ke permukaan gelap.
 */

type SectionTone = 'light' | 'tinted' | 'dark'

interface SectionProps {
  children: ReactNode
  /** `dark` memasang `.surface-dark`, membalik seluruh subtree ke permukaan foto. */
  tone?: SectionTone
  /** Buang padding horizontal agar foto menempel tepi layar (pola OMS). */
  flush?: boolean
  id?: string
  className?: string
}

export function Section({ children, tone = 'light', flush, id, className }: SectionProps) {
  return (
    <section
      id={id}
      className={[
        styles.section,
        tone === 'tinted' ? styles.tinted : '',
        tone === 'dark' ? 'surface-dark' : '',
        flush ? styles.flush : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  )
}

interface EyebrowProps {
  children: ReactNode
  /** `rule` memakai garis pendek alih-alih titik (pola OMS). */
  marker?: 'dot' | 'rule'
}

export function Eyebrow({ children, marker = 'dot' }: EyebrowProps) {
  return (
    <p className={`${styles.eyebrow} ${marker === 'rule' ? styles.eyebrowRule : ''}`}>
      {marker === 'dot' && <span className={styles.eyebrowDot} aria-hidden="true" />}
      {children}
    </p>
  )
}

interface SectionHeadingProps {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  centered?: boolean
  marker?: 'dot' | 'rule'
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  centered,
  marker = 'dot',
}: SectionHeadingProps) {
  return (
    <Reveal className={`${styles.heading} ${centered ? styles.headingCentered : ''}`}>
      {eyebrow && <Eyebrow marker={marker}>{eyebrow}</Eyebrow>}
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </Reveal>
  )
}

/** Teks judul yang dimiringkan dan diberi warna aksen. */
export function TitleAccent({ children }: { children: ReactNode }) {
  return <span className={styles.titleItalic}>{children}</span>
}

export interface Stat {
  value: string
  label: string
}

export function StatRow({ stats }: { stats: readonly Stat[] }) {
  return (
    <Reveal className={styles.statRow} delay={150}>
      {stats.map((stat) => (
        <div key={stat.label} className={styles.stat}>
          <span className={styles.statValue}>{stat.value}</span>
          <span className={styles.statLabel}>{stat.label}</span>
        </div>
      ))}
    </Reveal>
  )
}
