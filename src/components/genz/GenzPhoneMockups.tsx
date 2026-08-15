"use client";

import Image from "next/image";
import { Sparkles, QrCode, Zap, Heart, Camera, Film } from "lucide-react";
import styles from "./GenzPhoneMockups.module.css";

const PHONE_MOCKUPS = [
  {
    id: "phone-1",
    img: "/img/genz/phone-1.jpg",
    name: "Aura · Rooftop Sunset",
    preset: "Golden Hour 400",
    tilt: "-6deg",
    shiftY: "24px",
    tag: "💛 Candid Vibes",
  },
  {
    id: "phone-2",
    img: "/img/genz/phone-2.jpg",
    name: "Salsa · Festival Party",
    preset: "Neon Night 1600",
    tilt: "0deg",
    shiftY: "0px",
    tag: "🔥 Live Sync",
    isCenter: true,
  },
  {
    id: "phone-3",
    img: "/img/genz/phone-3.jpg",
    name: "Kania · Flash B-Day",
    preset: "Pastel 400",
    tilt: "6deg",
    shiftY: "24px",
    tag: "✨ Retro Grain",
  },
];

export default function GenzPhoneMockups() {
  return (
    <section id="fitur-qr" className={styles.section}>
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.headingBox}>
          <div className={styles.badge}>
            <QrCode size={16} />
            <span>INSTANT GUEST CAMERA</span>
          </div>

          <h2 className={styles.mainTitle}>
            Satu QR, Rame-Rame Jepret
          </h2>

          <p className={styles.subTitle}>
            Tamu cukup scan QR di meja atau undangan, langsung jepret dengan filter roll film otentik tanpa perlu download aplikasi apa pun.
          </p>

          {/* Quick Perks Badges */}
          <div className={styles.pillBadges}>
            <div className={styles.perkPill}>
              <Zap size={15} className={styles.yellowIcon} />
              <span>100% Web Camera</span>
            </div>
            <div className={styles.perkPill}>
              <Film size={15} className={styles.purpleIcon} />
              <span>6 Filter Analog Asli</span>
            </div>
            <div className={styles.perkPill}>
              <Sparkles size={15} className={styles.pinkIcon} />
              <span>Live Slideshow Layar</span>
            </div>
          </div>
        </div>

        {/* 3D Phone Mockups Fan Display */}
        <div className={styles.mockupStage}>
          {/* Floating Illustration Badges around the phones */}
          <div className={`${styles.doodleSticker} ${styles.doodleLeft}`}>
            <span className={styles.doodleEmoji}>✌️</span>
            <span className={styles.doodleText}>No Filter Needed!</span>
          </div>

          <div className={`${styles.doodleSticker} ${styles.doodleRight}`}>
            <span className={styles.doodleEmoji}>👍</span>
            <span className={styles.doodleText}>Auto Sync Album</span>
          </div>

          {/* Phones Trio */}
          <div className={styles.phonesGrid}>
            {PHONE_MOCKUPS.map((phone) => (
              <div
                key={phone.id}
                className={`${styles.phoneCard} ${phone.isCenter ? styles.phoneCenter : ""}`}
                style={{
                  "--tilt": phone.tilt,
                  "--shiftY": phone.shiftY,
                } as React.CSSProperties}
              >
                {/* Phone Notch & Body */}
                <div className={styles.phoneFrame}>
                  {/* Dynamic Island */}
                  <div className={styles.dynamicIsland} />

                  {/* Photo Canvas */}
                  <div className={styles.screenInner}>
                    <Image
                      src={phone.img}
                      alt={phone.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 380px"
                      className={styles.screenPhoto}
                    />

                    {/* Camera UI Overlay */}
                    <div className={styles.cameraOverlay}>
                      <div className={styles.overlayTop}>
                        <span className={styles.guestTag}>{phone.name}</span>
                        <span className={styles.badgePill}>{phone.tag}</span>
                      </div>

                      <div className={styles.overlayBottom}>
                        <div className={styles.filmInfo}>
                          <span className={styles.presetBadge}>
                            <Film size={12} />
                            {phone.preset}
                          </span>
                          <span className={styles.timestamp}>&apos;99 11 06</span>
                        </div>
                        <div className={styles.shutterRing}>
                          <Camera size={18} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
