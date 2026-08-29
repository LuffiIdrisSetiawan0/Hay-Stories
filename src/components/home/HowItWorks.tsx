import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    number: "01",
    tint: "var(--tint-butter)",
    title: "Buat album acara",
    text: "Isi nama acara dan atur kapan album dibuka. Selesai dalam dua menit.",
  },
  {
    number: "02",
    tint: "var(--tint-peach)",
    title: "Bagikan satu QR",
    text: "Cetak di kartu meja atau kirim tautannya. Tamu tinggal pindai lalu memotret.",
  },
  {
    number: "03",
    tint: "var(--tint-sage)",
    title: "Buka albumnya bersama",
    text: "Semua foto sudah tersimpan. Buka saat kamu siap, lalu unduh kualitas penuh.",
  },
] as const;

/**
 * Tiga langkah penyiapan.
 *
 * Kartunya diberi rona berbeda dan dinaikkan bertingkat di layar lebar, jadi
 * urutannya terbaca dari bentuknya sendiri — bukan hanya dari angkanya.
 */
export default function HowItWorks() {
  return (
    <section id="cara-kerja" className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <Reveal>
            <p className="kicker">Cara kerja</p>
          </Reveal>

          <h2 className={styles.title}>
            <SplitText by="word" delay={70}>
              Siap sebelum tamu pertama datang
            </SplitText>
          </h2>

          <Reveal delay={240}>
            <p className={styles.lede}>
              Tidak perlu sewa alat atau tambah orang. Siapkan album, bagikan QR-nya, sisanya
              tamu yang isi.
            </p>
          </Reveal>
        </header>

        <ol className={styles.list}>
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.number} delay={i * 130} className={styles.slot}>
              <article
                className={styles.card}
                style={{ "--tint": step.tint } as React.CSSProperties}
              >
                <span className={styles.number}>{step.number}</span>
                <h3 className={styles.cardTitle}>{step.title}</h3>
                <p className={styles.cardText}>{step.text}</p>
              </article>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={420} className={styles.footer}>
          <Link href="/dashboard/new" className={styles.cta}>
            Mulai sekarang, gratis
            <ArrowRight size={17} strokeWidth={2} />
          </Link>
          <p className={styles.footNote}>Gratis untuk lima tamu pertama, tanpa kartu kredit.</p>
        </Reveal>
      </div>
    </section>
  );
}
