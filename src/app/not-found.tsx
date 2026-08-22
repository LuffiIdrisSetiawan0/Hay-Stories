import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import styles from "./StatusPage.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="not-found-title">
        <p className={styles.brand}>HAY STORIES</p>
        <span className={styles.code}>404 · Bingkai kosong</span>
        <h1 id="not-found-title" className={styles.title}>
          Cerita ini belum ditemukan.
        </h1>
        <p className={styles.description}>
          Tautannya mungkin sudah berubah atau salah ketik. Kembali ke beranda, atau masukkan
          kode acara jika kamu datang sebagai tamu.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primary}>
            <ArrowLeft size={16} /> Kembali ke beranda
          </Link>
          <Link href="/a" className={styles.secondary}>
            <KeyRound size={16} /> Masukkan kode acara
          </Link>
        </div>
      </section>
    </main>
  );
}
