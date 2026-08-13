import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./Hero.module.css";

/**
 * Hero tipografis di atas krem, bukan foto gelap setinggi layar.
 *
 * Versi sebelumnya menutup seluruh viewport dengan satu foto dan menaruh teks
 * di atasnya. Bagus kalau fotonya kuat — tapi fotonya masih placeholder, dan
 * lebih penting lagi, tata letak itu memaksa pengunjung menggulir satu layar
 * penuh sebelum menemukan satu pun informasi.
 *
 * Sekarang tipografi yang memikul bobotnya dan foto jadi panel pendamping.
 * Judul, kalimat pembuka, ajakan, dan awal seksi berikutnya semuanya masuk di
 * satu layar.
 *
 * TODO: `hero-placeholder.jpg` dibangkitkan `scripts/generate-hero-placeholder.mjs`.
 * Ganti dengan foto acara asli — panel ini satu-satunya bukti visual di layar
 * pertama, dan placeholder buram melemahkannya jauh lebih besar dari dugaan.
 */
export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowRule} aria-hidden="true" />
            Kamera sekali pakai digital
          </p>

          <h1 className={styles.headline}>
            Setiap tamu
            <br />
            jadi <span className={styles.headlineItalic}>fotografer</span>
          </h1>

          <p className={styles.subheadline}>
            Satu QR code di meja. Tamu memotret langsung dari browser dengan roll film
            pilihan mereka sendiri, dan semua foto tetap tersembunyi sampai acaramu usai
            — lalu terungkap bersamaan.
          </p>

          <div className={styles.actions}>
            <Link href="/login" className="btn btn-primary btn-lg">
              Buat album
              <ArrowRight size={17} />
            </Link>
            <Link href="#cara-kerja" className={styles.ghostBtn}>
              Lihat cara kerjanya
            </Link>
          </div>
        </div>

        <div className={styles.panel}>
          <Image
            src="/img/hero-placeholder.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1000px) 44vw, 100vw"
            className={styles.photo}
          />
          <span className={styles.panelTag}>Golden Hour 400</span>
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.scrollHint}>
          <span className={styles.scrollLine} aria-hidden="true" />
          Gulir
        </span>
      </div>
    </section>
  );
}
