import Link from "next/link";
import { ArrowRight, QrCode, Film, Sparkles } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./WhySection.module.css";

const REASONS = [
  {
    icon: QrCode,
    title: "Masuk tanpa hambatan",
    desc: "Scan QR, isi nama panggilan, lalu langsung memotret. Tidak ada akun tamu atau aplikasi yang harus dipasang.",
  },
  {
    icon: Film,
    title: "Suasana tetap terasa",
    desc: "Enam nuansa film tersedia langsung di kamera untuk cahaya siang, sore hangat, pesta malam, dan hitam putih.",
  },
  {
    icon: Sparkles,
    title: "Kejutannya milik bersama",
    desc: "Biarkan foto tersembunyi selama acara, lalu buka semua candid dari setiap meja pada momen yang kamu pilih.",
  },
] as const;

export default function WhySection() {
  return (
    <section id="kenapa" className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <Reveal>
            <p className={styles.eyebrow}>Yang tidak terlihat dari panggung</p>
          </Reveal>

          <h2 className={styles.title}>
            <SplitText by="word" delay={60}>
              Fotografer Menangkap Panggung. Tamu Menangkap Ceritanya.
            </SplitText>
          </h2>

          <Reveal delay={120}>
            <p className={styles.lede}>
              Foto resmi tetap penting. HAY Stories melengkapinya dengan tawa di meja belakang, reuni kecil, dan momen spontan yang hanya terlihat oleh orang-orang terdekatmu.
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
          <Link href="#pengalaman" className={styles.outlineBtn}>
            Lihat pengalaman lengkap
            <ArrowRight size={16} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
