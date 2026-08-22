"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import styles from "./StatusPage.module.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="error-title">
        <p className={styles.brand}>HAY STORIES</p>
        <span className={styles.code}>Ada yang terlewat</span>
        <h1 id="error-title" className={styles.title}>
          Halaman ini belum berhasil dimuat.
        </h1>
        <p className={styles.description}>
          Koneksi atau layanan kami mungkin sedang tersendat. Coba sekali lagi, atau kembali ke
          beranda untuk memulai ulang alurnya.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={reset}>
            <RotateCcw size={16} /> Coba lagi
          </button>
          <Link href="/" className={styles.secondary}>
            <ArrowLeft size={16} /> Ke beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
