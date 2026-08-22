import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  HAS_LEGAL_OPERATOR_IDENTITY,
  LEGAL_OPERATOR_ADDRESS,
  LEGAL_OPERATOR_NAME,
} from '@/lib/site'
import styles from './LegalPage.module.css'

export interface LegalNavItem {
  id: string
  label: string
}

interface LegalPageProps {
  eyebrow: string
  title: string
  intro: string
  updated: string
  updatedDateTime: string
  sections: readonly LegalNavItem[]
  children: ReactNode
}

export default function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  updatedDateTime,
  sections,
  children,
}: LegalPageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="HAY Stories — beranda">
          <span className={styles.brandMark} aria-hidden="true">H</span>
          <span>HAY STORIES</span>
        </Link>

        <nav className={styles.legalNav} aria-label="Dokumen legal">
          <Link href="/privasi">Privasi</Link>
          <Link href="/syarat">Syarat</Link>
        </nav>
      </header>

      <div className={styles.shell}>
        <section className={styles.hero} aria-labelledby="legal-title">
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id="legal-title" className={styles.title}>{title}</h1>
          <p className={styles.intro}>{intro}</p>
          <p className={styles.updated}>
            Berlaku sejak <time dateTime={updatedDateTime}>{updated}</time>
          </p>
        </section>

        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label="Daftar isi">
            <p className={styles.sidebarTitle}>Di halaman ini</p>
            <ol className={styles.toc}>
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>
                    <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <article className={styles.article}>{children}</article>
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerIdentity}>
            <p>HAY Stories · Semua sudut, satu cerita.</p>
            {HAS_LEGAL_OPERATOR_IDENTITY && (
              <address className={styles.operator}>
                <span>Operator layanan: <strong>{LEGAL_OPERATOR_NAME}</strong></span>
                <span>{LEGAL_OPERATOR_ADDRESS}</span>
              </address>
            )}
          </div>
          <div className={styles.footerLinks}>
            <Link href="/">Beranda</Link>
            <Link href="/harga">Harga</Link>
            <Link href="/kredit">Kredit</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

export function LegalSection({
  id,
  number,
  title,
  children,
}: {
  id: string
  number: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className={styles.section}>
      <div className={styles.sectionHeading}>
        <span aria-hidden="true">{number}</span>
        <h2>{title}</h2>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className={styles.list}>{children}</ul>
}

export function LegalNote({ children }: { children: ReactNode }) {
  return <div className={styles.note}>{children}</div>
}
