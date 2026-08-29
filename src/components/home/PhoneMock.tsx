import type { ReactNode } from "react";
import styles from "./PhoneMock.module.css";

interface PhoneMockProps {
  /** Isi layar. Ditandai `aria-hidden` oleh pemanggil bila hanya hiasan. */
  children: ReactNode;
  className?: string;
}

/**
 * Bingkai ponsel untuk memajang antarmuka produk.
 *
 * Digambar sepenuhnya dengan CSS, bukan berkas gambar: bingkainya harus ikut
 * mengecil bersama kolomnya dan tetap tajam di layar beresolusi tinggi, dan
 * gambar PNG bingkai ponsel selalu gagal di salah satu dari keduanya.
 */
export default function PhoneMock({ children, className }: PhoneMockProps) {
  return (
    <div className={[styles.phone, className].filter(Boolean).join(" ")}>
      <div className={styles.screen}>
        <span className={styles.notch} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
