import { QrCode, Camera, Sparkles } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    number: "01",
    icon: Camera,
    title: "Buat Album Acara",
    description:
      "Beri nama acara, tentukan kapan galeri dibuka, lalu album langsung siap dipakai.",
  },
  {
    number: "02",
    icon: QrCode,
    title: "Bagikan Satu QR",
    description:
      "Unduh QR untuk kartu meja atau bagikan tautannya. Tamu scan, isi nama, dan langsung memotret.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Buka Ceritanya Bersama",
    description:
      "Setiap candid tersimpan otomatis. Buka galerinya saat kamu siap, lalu unduh foto berkualitas tinggi.",
  },
];

export default function HowItWorks() {
  return (
    <section id="cara-kerja" className={styles.section}>
      <div className="container">
        <div className={styles.head}>
          <Reveal>
            <p className={styles.eyebrow}>Siap dalam hitungan menit</p>
          </Reveal>

          <h2 className={styles.title}>
            <SplitText by="word" delay={60}>
              Tiga Langkah, Selesai Sebelum Acara Dimulai
            </SplitText>
          </h2>

          <Reveal delay={120}>
            <p className={styles.lede}>
              Tidak perlu perangkat sewaan atau kru tambahan. Siapkan album, bagikan aksesnya, dan biarkan tamu mengisi cerita.
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
