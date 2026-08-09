import type { Metadata } from 'next'
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

        <h1 className={styles.title}>Masukkan kode</h1>

        <p className={styles.lede}>
          Untuk kamu yang QR-nya susah dipindai. Kodenya tercetak di kartu yang sama.
        </p>

        <CodeForm />
      </div>
    </main>
  )
}
