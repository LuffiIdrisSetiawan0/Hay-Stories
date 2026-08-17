import { QrCode, Camera, Sparkles } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    number: "01",
    icon: QrCode,
    title: "Pasang QR Code",
    description:
      "Cetak kartu QR di meja tamu atau tampilkan di layar utama. Tamu langsung tahu di mana harus memindai.",
  },
  {
    number: "02",
    icon: Camera,
    title: "Tamu Scan & Motret",
    description:
      "Tamu memindai QR lewat kamera smartphone dan langsung masuk ke kamera web analog tanpa perlu unduh aplikasi.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Terkumpul Otomatis",
    description:
      "Foto yang berhasil disimpan masuk ke satu galeri acara berbasis tautan dan dapat diunduh satu per satu dalam resolusi hasilnya.",
  },
];

export default function HowItWorks() {
  return (
    <section id="cara-kerja" className={styles.section}>
      <div className="container">
        <div className={styles.head}>
          <Reveal>
            <p className={styles.eyebrow}>Cara Kerja</p>
          </Reveal>

          <h2 className={styles.title}>
            <SplitText by="word" delay={60}>
              Tiga Langkah Instan Tanpa Ribet
            </SplitText>
          </h2>

          <Reveal delay={120}>
            <p className={styles.lede}>
              Bebas instruksi rumit. Tamu cukup memindai dan langsung ikut mengabadikan momen dari meja mereka.
            </p>
          </Reveal>
        </div>

        <ol className={styles.steps}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal
                key={step.number}
                as="li"
                delay={index * 100}
                className={styles.stepCard}
              >
                <div className={styles.cardTop}>
                  <span className={styles.number}>{step.number}</span>
                  <div className={styles.iconWrap} aria-hidden="true">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                </div>

                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.desc}>{step.description}</p>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
