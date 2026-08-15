"use client";

import Image from "next/image";
import { Zap, ShieldCheck, Sparkles, Smile, Flame } from "lucide-react";
import styles from "./GenzVibesSplit.module.css";

export default function GenzVibesSplit() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Left Column: Bold Typography & Benefit Cards */}
        <div className={styles.leftCol}>
          <div className={styles.badge}>
            <Flame size={15} />
            <span>REAL VIBES ONLY</span>
          </div>

          <h2 className={styles.heading}>
            Momen Real, Tanpa Jaim
          </h2>

          <p className={styles.subtext}>
            Fotografer profesional menangkap momen formal. Tamu-tamu dengan HAY Stories menangkap tawa lepas, ekspresi konyol, dan kehangatan yang sebenarnya.
          </p>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <div className={styles.iconSquare}>
                <Zap size={20} />
              </div>
              <div className={styles.featureText}>
                <h3>Tanpa Perlu Download App</h3>
                <p>Cukup browser HP bawaan apa pun. iOS & Android langsung terbuka dalam hitungan detik.</p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.iconSquare}>
                <Sparkles size={20} />
              </div>
              <div className={styles.featureText}>
                <h3>Warna Emulsi Film Asli</h3>
                <p>Gradasi warna analog 90s, grain natural, dan halation hangat. Foto terlihat estetik tanpa edit.</p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.iconSquare}>
                <ShieldCheck size={20} />
              </div>
              <div className={styles.featureText}>
                <h3>Privat & Download Resolusi Penuh</h3>
                <p>Album tersimpan aman. Tuan rumah bisa mengunduh semua roll foto dalam kualitas HD kapan saja.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Framed Photo + Playful Stickers */}
        <div className={styles.rightCol}>
          <div className={styles.photoFrame}>
            <Image
              src="/img/genz/split-friends.jpg"
              alt="Two friends laughing looking at photos together"
              fill
              sizes="(max-width: 768px) 100vw, 540px"
              className={styles.splitPhoto}
            />

            {/* Sticker Pinned Over Photo */}
            <div className={styles.photoSticker}>
              <Smile size={16} />
              <span>Candid Talk & Laughs! 💬</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
