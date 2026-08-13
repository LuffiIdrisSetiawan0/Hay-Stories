import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./Hero.module.css";

/**
 * Hero foto full-bleed setinggi viewport — pola Ludmila Borosova, dengan baris
 * angka bukti di kakinya yang diambil dari OMS dan SNXP.
 *
 * TODO: `hero-placeholder.jpg` dibangkitkan oleh
 * `scripts/generate-hero-placeholder.mjs`. Ganti dengan foto acara asli
 * beresolusi tinggi — tata letak ini sepenuhnya bergantung pada fotonya.
 */

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.media}>
        <Image
          src="/img/hero-placeholder.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.photo}
        />
      </div>
      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.content}>
        <p className={styles.eyebrow}>Kamera sekali pakai digital</p>

        <h1 className={styles.headline}>
          Abadikan Momen
          <span className={styles.headlineItalic}>Tanpa Filter</span>
        </h1>

        <p className={styles.subheadline}>
          Tamu memotret lewat satu QR code, dengan roll film pilihan mereka sendiri. Semua foto
          tersembunyi sampai acaramu usai — lalu terungkap bersamaan.
        </p>

        <div className={styles.actions}>
          <Link href="/login" className="btn btn-accent">
            Buat Album Sekarang
            <ArrowRight size={17} />
          </Link>
          <Link href="#cara-kerja" className={styles.ghostBtn}>
            Lihat cara kerjanya
          </Link>
        </div>
      </div>

      {/* Baris angkanya pindah ke seksi tersendiri di bawah. Hero yang hanya
          berisi foto, satu kalimat, dan satu ajakan gulir terasa jauh lebih
          lapang — dan angka yang sama muncul dua kali justru melemahkannya. */}
      <div className={styles.proof}>
        <span className={styles.scrollHint}>
          <span className={styles.scrollLine} aria-hidden="true" />
          Gulir
        </span>
      </div>
    </section>
  );
}
