"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowUpRight } from "lucide-react";
import styles from "./GenzHero.module.css";

const STICKERS = [
  {
    id: "support",
    text: "Support 🤝",
    color: "#FF6B6B",
    className: styles.stickerSupport,
  },
  {
    id: "connection",
    text: "Connection ⚡",
    color: "#FFD93D",
    className: styles.stickerConnection,
  },
  {
    id: "love",
    text: "Love 💖",
    color: "#C084FC",
    className: styles.stickerLove,
  },
  {
    id: "happy",
    text: "Happy 😃",
    color: "#60A5FA",
    className: styles.stickerHappy,
  },
];

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

        {/* Floating Colorful Stickers (Positioned Safely) */}
        <div className={styles.stickersLayer}>
          {STICKERS.map((s) => (
            <div
              key={s.id}
              className={`${styles.floatingSticker} ${s.className}`}
              style={{ backgroundColor: s.color }}
            >
              {s.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
