import type { Metadata } from 'next'
import Link from 'next/link'
import CodeForm from './CodeForm'
import styles from './Guest.module.css'

export const metadata: Metadata = {
  title: 'Masukkan kode album',
  robots: { index: false, follow: false },
}

export default function GuestCodePage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.brand}>HAY Stories</p>

        <h1 className={styles.title}>Masukkan kode acara</h1>

        <p className={styles.lede}>
          Jika QR sulit dipindai, ketik enam karakter yang tercetak di kartu acara.
        </p>

        <CodeForm />
      </div>

      <p className={styles.footer}>
        Bukan tamu acara?{' '}
        <Link href="/" className={styles.footerLink}>
          Kembali ke beranda
        </Link>
      </p>
    </main>
  )
}
