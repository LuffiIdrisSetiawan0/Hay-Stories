import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./Compare.module.css";

const ROWS = [
  {
    label: "Sudut foto",
    without: "Hanya dari fotografer",
    with: "Dari setiap meja dan sudut ruangan",
  },
  {
    label: "Mengumpulkan foto",
    without: "Minta satu per satu di grup chat",
    with: "Terkumpul otomatis di satu album",
  },
  {
    label: "Kapan bisa dilihat",
    without: "Berminggu-minggu setelah acara",
    with: "Saat acara masih berlangsung",
  },
  {
    label: "Aplikasi yang dipasang",
    without: "Tergantung aplikasi masing-masing",
    with: "Tidak ada. Cukup pindai QR",
  },
  {
    label: "Warna foto",
    without: "Beda-beda, ikut filter masing-masing",
    with: "Enam roll film yang sama untuk semua",
  },
] as const;

/**
 * Dua kolom yang disandingkan.
 *
 * Bentuknya diambil dari tabel perbandingan di referensi: dua kartu berdampingan,
 * masing-masing dengan satu kalimat besar di kepalanya, lalu deret baris yang
 * sejajar di bawahnya.
 *
 * Yang dibandingkan sengaja bukan produk lain melainkan keadaan sebelum dan
 * sesudah. Membandingkan diri dengan pesaing yang disebut namanya menuntut
 * angka-angka tentang mereka yang tidak kami punya dan tidak bisa kami
 * pertanggungjawabkan; keadaan tanpa album tamu adalah hal yang memang dialami
 * sendiri oleh orang yang sedang membaca halaman ini.
 *
 * Barisnya sejajar karena keduanya memakai daftar yang sama dan urutan yang
 * sama. Begitu ditumpuk di layar sempit, kesejajaran itu hilang — dan di situlah
 * label tiap baris jadi penting, karena label itulah yang menyambungkan kembali
 * jawaban di kartu kedua ke pertanyaan yang sama di kartu pertama.
 */
export default function Compare() {
  return (
    <section id="beda" className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <Reveal>
            <p className="kicker">Bedanya</p>
          </Reveal>

          <h2 className={styles.title}>
            <SplitText by="word" delay={70}>
              Acara yang sama, foto jauh lebih lengkap
            </SplitText>
          </h2>
        </header>

        <div className={styles.board}>
          <Reveal className={styles.column}>
            <article className={styles.card}>
              <header className={styles.cardHead}>
                <p className={styles.cardLabel}>Tanpa album tamu</p>
                <p className={styles.cardLead}>Tercecer</p>
              </header>

              <dl className={styles.rows}>
                {ROWS.map((row, i) => (
                  <div key={row.label} className={styles.row} style={{ "--i": i } as CSSProperties}>
                    <dt className={styles.rowLabel}>{row.label}</dt>
                    <dd className={styles.rowValue}>
                      <span className={styles.markOff} aria-hidden="true">
                        <Minus size={12} strokeWidth={3} />
                      </span>
                      {row.without}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          </Reveal>

          <Reveal delay={160} className={styles.column}>
            <article className={`${styles.card} ${styles.cardOn}`}>
              <header className={styles.cardHead}>
                <p className={styles.cardLabel}>Dengan HAY Stories</p>
                <p className={styles.cardLead}>Satu album</p>
              </header>

              <dl className={styles.rows}>
                {ROWS.map((row, i) => (
                  <div key={row.label} className={styles.row} style={{ "--i": i } as CSSProperties}>
                    <dt className={styles.rowLabel}>{row.label}</dt>
                    <dd className={styles.rowValue}>
                      <span className={styles.markOn} aria-hidden="true">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {row.with}
                    </dd>
                  </div>
                ))}
              </dl>

              <Link href="/dashboard/new" className={styles.cta}>
                Buat album gratis
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
