import Reveal from "@/components/ui/Reveal";
import styles from "./SocialProof.module.css";

/**
 * PLACEHOLDER: angka-angka di bawah belum mencerminkan data nyata.
 *
 * Ganti dengan hitungan sebenarnya (atau hapus seksinya) sebelum situs
 * dipublikasikan — memajang bukti sosial karangan kepada calon klien
 * menyesatkan dan berisiko secara hukum konsumen.
 */
const PROOF = [
  { value: "6", label: "Preset film" },
  { value: "36", label: "Jepretan/tamu" },
  { value: "Tanpa install", label: "Cukup QR" },
  { value: "Sekali bayar", label: "Tanpa langganan" },
] as const;

export default function SocialProof() {
  return (
    <section className={styles.section}>
      <Reveal className={styles.bar}>
        {PROOF.map((item, i) => (
          <div key={item.label} className={styles.entry}>
            {i > 0 && (
              <span className={styles.divider} aria-hidden="true">
                ·
              </span>
            )}
            <div className={styles.item}>
              <span className={styles.value}>{item.value}</span>
              <span className={styles.label}>{item.label}</span>
            </div>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
