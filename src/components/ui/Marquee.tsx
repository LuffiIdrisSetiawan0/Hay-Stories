import type { ReactNode } from "react";
import styles from "./Marquee.module.css";

interface MarqueeProps {
  children: ReactNode;
  /** Lama satu putaran penuh, dalam detik. Makin besar makin pelan. */
  speed?: number;
  direction?: "left" | "right";
  className?: string;
  /** Deskripsi isi baris untuk pembaca layar. */
  label?: string;
}

/**
 * Baris yang bergeser tanpa ujung.
 *
 * Isinya dirender dua kali. Trek bergeser tepat 50% dari lebarnya sendiri,
 * yang artinya salinan kedua mendarat persis di posisi awal salinan pertama
 * saat animasinya mengulang — jadi tidak pernah ada kedipan atau celah di
 * sambungan. Pendekatan lain (menghitung lebar lalu menggeser lewat
 * JavaScript) meleset satu-dua piksel begitu font-nya selesai dimuat dan
 * lebarnya berubah.
 *
 * Murni CSS, jadi ini server component: tidak ada JavaScript yang dikirim ke
 * klien untuk sesuatu yang sifatnya hiasan.
 */
export default function Marquee({
  children,
  speed = 40,
  direction = "left",
  className,
  label,
}: MarqueeProps) {
  return (
    <div
      className={[styles.viewport, className].filter(Boolean).join(" ")}
      role="group"
      aria-label={label}
    >
      <div
        className={`${styles.track} ${direction === "right" ? styles.trackRight : ""}`}
        style={{ animationDuration: `${speed}s` }}
      >
        <div className={styles.group}>{children}</div>
        {/* Salinan kedua murni visual — pembaca layar cukup mendengarnya sekali. */}
        <div className={styles.group} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
