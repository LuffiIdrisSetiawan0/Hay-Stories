import { FILM_PRESETS, getTier } from "@/lib/catalog";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import Counter from "@/components/ui/Counter";
import styles from "./StatsBand.module.css";

const STARTER = getTier("starter")!;

export default function StatsBand() {
  const stats = [
    { value: 0, suffix: "", label: "Aplikasi yang perlu diinstal tamu" },
    { value: FILM_PRESETS.length, suffix: "", label: "Preset roll film analog siap pakai" },
    { value: STARTER.shotsPerGuest, suffix: "", label: "Jatah jepretan gratis per tamu" },
    { value: STARTER.retentionDays ?? 365, suffix: " hari", label: "Masa aktif galeri tersimpan aman" },
  ] as const;

  return (
    <section id="angka" className={`${styles.section} surface-dark`}>
      <div className="container">
        <Reveal>
          <p className={styles.eyebrow}>Kemudahan Maksimal</p>
        </Reveal>

        <h2 className={styles.title}>
          <SplitText by="word" delay={80}>
            Satu QR code di meja, semua tamu langsung ikut memotret.
          </SplitText>
        </h2>

        <ul className={styles.grid}>
          {stats.map((stat, i) => (
            <Reveal key={stat.label} as="li" delay={i * 110} className={styles.cell}>
              <span className={styles.value}>
                <Counter to={stat.value} duration={1200 + i * 150} />
                {stat.suffix}
              </span>
              <span className={styles.label}>{stat.label}</span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
