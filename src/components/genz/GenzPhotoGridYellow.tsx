"use client";

import Image from "next/image";
import { MonitorPlay } from "lucide-react";
import styles from "./GenzPhotoGridYellow.module.css";

const CARDS = [
  {
    id: "card-1",
    img: "/img/genz/yellow-card-1.jpg",
    title: "Festival Crowd",
    sticker: "👍 Best Vibe!",
    stickerColor: "#C084FC",
    tilt: "-3deg",
  },
  {
    id: "card-2",
    img: "/img/genz/yellow-card-2.jpg",
    title: "Picnic & Snacks",
    sticker: "💛 Circle Goals",
    stickerColor: "#60A5FA",
    tilt: "2deg",
  },
  {
    id: "card-3",
    img: "/img/genz/yellow-card-3.jpg",
    title: "Patio Talk",
    sticker: "⚡ Electric Laughs",
    stickerColor: "#FF6B6B",
    tilt: "-2deg",
  },
  {
    id: "card-4",
    img: "/img/genz/yellow-card-4.jpg",
    title: "Chill Drinks",
    sticker: "🕶️ So Aesthetic",
    stickerColor: "#4ADE80",
    tilt: "3deg",
  },
];

export default function GenzPhotoGridYellow() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.headerRow}>
          <div className={styles.leftTitle}>
            <div className={styles.badge}>
              <MonitorPlay size={15} />
              <span>LIVE SLIDESHOW STREAM</span>
            </div>
            <h2 className={styles.heading}>
              Foto Langsung Tayang di Proyektor
            </h2>
          </div>

          <div className={styles.rightDesc}>
            <p>
              Setiap foto yang dijepret tamu otomatis tayang di layar proyektor panggung acara secara real-time. Tidak ada jeda, suasana pesta langsung makin seru dan interaktif!
            </p>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className={styles.cardsGrid}>
          {CARDS.map((card) => (
            <div
              key={card.id}
              className={styles.cardItem}
              style={{ "--tilt": card.tilt } as React.CSSProperties}
            >
              <div className={styles.cardFrame}>
                <Image
                  src={card.img}
                  alt={card.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className={styles.cardImg}
                />

                {/* Sticker Pinned Over Card */}
                <div
                  className={styles.cardSticker}
                  style={{ backgroundColor: card.stickerColor }}
                >
                  {card.sticker}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
