import Link from "next/link";
import { ArrowRight, QrCode, Film, Sparkles } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./WhySection.module.css";

const REASONS = [
  {
    icon: QrCode,
    title: "Nol Hambatan untuk Tamu",
    desc: "Cukup scan QR code di meja. Tamu langsung motret lewat browser tanpa perlu download aplikasi atau registrasi.",
  },
  {
    icon: Film,
    title: "Warna yang Terjaga",
    desc: "6 look terkalibrasi untuk cahaya netral, sore hangat, outdoor, pesta malam, hingga hitam putih.",
  },
  {
    icon: Sparkles,
    title: "Terkumpul & Terverifikasi",
    desc: "Foto baru masuk ke galeri setelah berkas resolusi penuh dan thumbnail berhasil disimpan, sehingga status hasilnya jelas.",
  },
] as const;

export default function WhySection() {
  return (
    <section id="kenapa" className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <Reveal>
            <p className={styles.eyebrow}>Kenapa HAY Stories</p>
          </Reveal>

          <h2 className={styles.title}>
            <SplitText by="word" delay={60}>
              Sudut Pandang Otentik yang Tak Terjangkau Fotografer
            </SplitText>
          </h2>

          <Reveal delay={120}>
            <p className={styles.lede}>
              Fotografer resmi fokus pada panggung utama. HAY Stories memberi tamu kamera analog digital di genggaman mereka untuk mengabadikan tawa, kehangatan, dan momen spontan dari setiap meja.
            </p>
          </Reveal>
        </div>

        <div className={styles.grid}>
          {REASONS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={160 + i * 80} className={styles.card}>
                <div className={styles.iconWrap} aria-hidden="true">
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardDesc}>{item.desc}</p>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={320} className={styles.actionWrap}>
          <Link href="#cara-kerja" className={styles.outlineBtn}>
            Lihat Cara Kerjanya
            <ArrowRight size={16} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
