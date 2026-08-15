"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowUpRight } from "lucide-react";
import styles from "./GenzHero.module.css";

export default function GenzHero() {
  return (
    <section className={styles.heroSection}>
      {/* Hero Visual Container with 360 Circle Group Image */}
      <div className={styles.visualWrapper}>
        <div className={styles.imageBox}>
          <Image
            src="/img/genz/hero-circle.jpg"
            alt="Circle of friends candid group shot"
            fill
            priority
            sizes="100vw"
            className={styles.heroImg}
          />
          <div className={styles.imageOverlay} />
        </div>

        {/* Center Container with Non-Overlapping Structured Stickers */}
        <div className={styles.centerWrapper}>
          {/* Top Stickers Row: Located above the badge with safe clearance */}
          <div className={styles.topStickersRow}>
            <div className={`${styles.floatingSticker} ${styles.stickerSupport}`}>
              Support 🤝
            </div>
            <div className={`${styles.floatingSticker} ${styles.stickerConnection}`}>
              Connection ⚡
            </div>
          </div>

          {/* Centerpiece 3D Bubble Pop Logo & Headline */}
          <div className={styles.centerContent}>
            <div className={styles.badgeRow}>
              <span className={styles.heroPillBadge}>
                <Sparkles size={14} className={styles.sparkleIcon} />
                DIGITAL DISPOSABLE CAMERA FOR GEN-Z
              </span>
            </div>

            <h1 className={styles.popTitle}>
              HAY Stories
            </h1>

            <p className={styles.tagline}>
              Tangkap momen otentik bareng circle kamu. Satu QR code, semua foto candid terkumpul otomatis.
            </p>

            <div className={styles.heroBtns}>
              <Link href="/login" className={styles.primaryBtn}>
                <span>Mulai Bikin Album</span>
                <ArrowUpRight size={18} />
              </Link>
              <Link href="#fitur-qr" className={styles.secondaryBtn}>
                <span>Lihat Cara Kerja</span>
              </Link>
            </div>
          </div>

          {/* Bottom Stickers Row: Located below the buttons with safe clearance */}
          <div className={styles.bottomStickersRow}>
            <div className={`${styles.floatingSticker} ${styles.stickerLove}`}>
              Love 💖
            </div>
            <div className={`${styles.floatingSticker} ${styles.stickerHappy}`}>
              Happy 😃
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
