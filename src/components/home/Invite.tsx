import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./Invite.module.css";

const POINTS = [
  "Gratis untuk lima tamu pertama",
  "Siap dipakai dalam dua menit",
  "Tanpa kartu kredit",
] as const;

/** Pola hias menyerupai kode QR: hanya gambar, tidak memuat data apa pun. */
const PATTERN = [
  "1011010110",
  "0110101101",
  "1101011010",
  "0100110011",
  "1011001101",
  "0110110010",
  "1001011011",
  "1100101100",
  "0101100110",
  "1010011001",
] as const;

/**
 * Ajakan penutup.
 *
 * Satu panel berona peach yang lebar, dengan kartu meja contoh di sisi kanan.
 * Kode QR-nya hias — digambar dari pola tetap dan ditandai `aria-hidden`, jadi
 * tidak ada yang mencoba memindainya lalu kecewa. Kode sungguhan dibuat di
 * dasbor setelah albumnya dibuat.
 */
export default function Invite() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <Reveal direction="scale" className={styles.panelSlot}>
          <div className={styles.panel}>
            <div className={styles.copy}>
              <p className="kicker">Mulai sekarang</p>

              <h2 className={styles.title}>
                <SplitText by="word" delay={70}>
                  Albumnya kamu siapkan. Sisanya tamu yang isi.
                </SplitText>
              </h2>

              <p className={styles.lede}>
                Buat sekarang, simpan QR-nya, cetak menjelang hari-H.
              </p>

              <ul className={styles.points}>
                {POINTS.map((point) => (
                  <li key={point} className={styles.point}>
                    {point}
                  </li>
                ))}
              </ul>

              <Link href="/dashboard/new" className={styles.cta}>
                Buat album gratis
                <ArrowRight size={17} strokeWidth={2} />
              </Link>
            </div>

            <div className={styles.cardSlot}>
              <div className={styles.card}>
                <p className={styles.cardBrand}>HAY Stories</p>
                <p className={styles.cardEvent}>Pernikahan Nara &amp; Bima</p>

                <div className={styles.qr} aria-hidden="true">
                  <div className={styles.qrGrid}>
                    {PATTERN.map((row, y) =>
                      row.split("").map((cell, x) => (
                        <span
                          key={`${y}-${x}`}
                          className={cell === "1" ? styles.qrCellOn : styles.qrCell}
                        />
                      ))
                    )}
                  </div>
                  <span className={`${styles.finder} ${styles.finderTopLeft}`} />
                  <span className={`${styles.finder} ${styles.finderTopRight}`} />
                  <span className={`${styles.finder} ${styles.finderBottomLeft}`} />
                </div>

                <p className={styles.cardHint}>Pindai untuk mulai memotret</p>
              </div>

              <span className={styles.chip} aria-hidden="true">
                <i className={styles.chipDot} />
                Siap dicetak untuk kartu meja
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
