"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowUpRight } from "lucide-react";
import styles from "./GenzHero.module.css";

const STICKERS = [
  { id: "support", text: "Support 🤝", color: "#FF6B6B", top: "12%", left: "14%", rotate: "-12deg" },
  { id: "connection", text: "Connection ⚡", color: "#FFD93D", top: "10%", right: "14%", rotate: "14deg" },
  { id: "love", text: "Love 💖", color: "#C084FC", bottom: "24%", left: "18%", rotate: "-8deg" },
  { id: "happy", text: "Happy 😃", color: "#60A5FA", bottom: "26%", right: "18%", rotate: "10deg" },
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

        {/* Floating Colorful Stickers */}
        <div className={styles.stickersLayer}>
          {STICKERS.map((s) => (
            <div
              key={s.id}
              className={styles.floatingSticker}
              style={{
                top: s.top,
                bottom: s.bottom,
                left: s.left,
                right: s.right,
                backgroundColor: s.color,
                transform: `rotate(${s.rotate})`,
              }}
            >
              {s.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
