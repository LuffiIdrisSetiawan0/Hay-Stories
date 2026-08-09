import { QrCode, Camera, Image as ImageIcon } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeading, TitleAccent } from "@/components/ui/Section";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    icon: QrCode,
    number: "01",
    title: "Pindai QR",
    description:
      "Tamu Anda cukup memindai QR code unik yang dicetak di meja atau layar. Tanpa perlu unduh aplikasi apa pun — langsung terbuka di browser.",
  },
  {
    icon: Camera,
    number: "02",
    title: "Jepret Otentik",
    description:
      "Mereka mendapatkan kamera web khusus dan memilih sendiri roll filmnya — bisa diganti kapan saja. Jatah jepretan tetap terbatas, persis seperti kamera analog sungguhan.",
  },
  {
    icon: ImageIcon,
    number: "03",
    title: "Terungkap Bersama",
    description:
      "Semua foto dikunci hingga akhir acara. Terungkap secara bersamaan layaknya mencetak klise film — kejutan yang ditunggu semua orang.",
  },
];

export default function HowItWorks() {
  return (
    <Section id="cara-kerja">
      <div className="container">
        <SectionHeading
          eyebrow="Cara Kerjanya"
          title={
            <>
              Tiga Langkah <TitleAccent>Sederhana</TitleAccent>
            </>
          }
          subtitle="Dari QR code hingga galeri kenangan — semudah scan, jepret, dan tunggu kejutannya."
          centered
        />

        <div className={styles.timeline}>
          {steps.map((step, index) => (
            <Reveal
              key={step.number}
              delay={index * 140}
              className={`${styles.step} ${index % 2 === 1 ? styles.stepReversed : ""}`}
            >
              <div className={styles.stepVisual}>
                <div className={styles.iconCircle}>
                  <step.icon size={28} strokeWidth={1.2} />
                </div>
                <span className={styles.stepNumber}>{step.number}</span>
              </div>

              <div className={styles.connector}>
                <div className={styles.connectorLine}></div>
                <div className={styles.connectorDot}></div>
              </div>

              <div className={styles.stepText}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
