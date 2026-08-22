import { Download, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import styles from "./StatsBand.module.css";

const SIGNALS = [
  {
    icon: Smartphone,
    title: "Tanpa aplikasi",
    description: "Berjalan langsung di browser iPhone dan Android.",
  },
  {
    icon: QrCode,
    title: "Satu QR & tautan",
    description: "Mudah dipasang di meja, layar, atau undangan digital.",
  },
  {
    icon: ShieldCheck,
    title: "Album privat",
    description: "Tidak tercantum publik; akses dibagikan oleh pemilik acara.",
  },
  {
    icon: Download,
    title: "Foto kualitas tinggi",
    description: "Hasil tersimpan dapat diunduh kembali dari galeri.",
  },
] as const;

export default function StatsBand() {
  return (
    <section className={styles.section} aria-labelledby="trust-title">
      <div className="container">
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Ringkas untuk tamu, lengkap untuk host</p>
          <h2 id="trust-title" className={styles.title}>
            Tamu cukup membawa HP-nya sendiri.
          </h2>
        </div>

        <ul className={styles.grid}>
          {SIGNALS.map((signal) => {
            const Icon = signal.icon;
            return (
              <li key={signal.title} className={styles.cell}>
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <h3>{signal.title}</h3>
                  <p>{signal.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
