import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./Hero.module.css";

/**
 * Hero.
 *
 * Satu foto acara setinggi layar, tajam dan kekuatan penuh — bukan foto samar
 * di balik kanvas krem, dan tanpa satu pun potongan gambar yang ditempel di
 * atasnya. Versi sebelumnya menaruh maket ponsel dan dua cetakan foto melayang
 * di sini; ketiganya terbaca sebagai tempelan karena memang tidak ikut berada
 * di dalam adegan fotonya. Maket produk sekarang tinggal di kartu Bento, tempat
 * ia memang punya bingkai sendiri.
 *
 * Fotonya dipilih karena susunannya, bukan hanya karena bagus: langit pucat
 * mengisi separuh atas — tempat teks berdiri — dan pasangannya berada di
 * sepertiga bawah, jadi keduanya tidak pernah saling menutupi. Itu sebabnya
 * sapuan kremnya bisa sangat tipis dan orangnya tetap terlihat jelas.
 *
 * Elemen yang berdiri di bagian foto yang gelap — tombol kedua, keping, dan
 * penanda gulir — memakai latar kaca buram, jadi tidak ada satu pun teks yang
 * bergantung pada keberuntungan luminansi.
 */
export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.backdrop} aria-hidden="true">
        <Image
          src="/img/hero/pasangan-bukit.webp"
          alt=""
          fill
          preload
          sizes="100vw"
          className={styles.bgPhoto}
        />
        <span className={styles.wash} />
      </div>

      <div className={styles.inner}>
        <div className={styles.copy}>
          <Reveal>
            <p className="kicker">Kamera untuk tamu</p>
          </Reveal>

          <h1 className={styles.title}>
            <SplitText by="word" delay={80}>
              Semua foto tamu jadi satu album
            </SplitText>
          </h1>

          <Reveal delay={280}>
            <p className={styles.lede}>
              Tamu cukup pindai QR di meja, lalu memotret dari ponsel sendiri. Tanpa aplikasi,
              tanpa akun.
            </p>
          </Reveal>

          <Reveal delay={360} className={styles.actions}>
            <Link href="/dashboard/new" className={styles.primary}>
              Buat album gratis
              <ArrowRight size={17} strokeWidth={2} />
            </Link>
            <Link href="#cara-kerja" className={styles.secondary}>
              <span className={styles.playIcon} aria-hidden="true">
                <Play size={11} strokeWidth={2.5} fill="currentColor" />
              </span>
              Lihat cara kerjanya
            </Link>
          </Reveal>
        </div>

        {/* Penanda gulir di kaki hero. Hero-nya tepat setinggi layar, jadi ini
            selalu terlihat tanpa perlu digulir lebih dulu. */}
        <Reveal delay={620} className={styles.cueSlot}>
          <a href="#alur" className={styles.cue} aria-label="Gulir ke bawah untuk melihat isinya">
            <span className={styles.cueText}>Gulir ke bawah</span>
            <span className={styles.cueIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path
                  d="M12 4v15M12 19l-5.5-5.5M12 19l5.5-5.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
