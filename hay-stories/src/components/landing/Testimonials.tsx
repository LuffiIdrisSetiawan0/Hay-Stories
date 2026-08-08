import { Quote } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeading, TitleAccent } from "@/components/ui/Section";
import styles from "./Testimonials.module.css";

const testimonials = [
  {
    quote: "Worth it banget. Semua tamu ikut foto tanpa ribet, dan hasil candid-nya justru yang paling sering kita buka ulang.",
    name: "Michelle Tanuwidjaja",
    detail: "186 photos · 74 guests",
    event: "Pernikahan",
    featured: true,
  },
  {
    quote: "Pas ulang tahun, teman-teman langsung ikut foto tiup lilin, games, dan candid. Banyak momen seru yang biasanya kelewat.",
    name: "Stefanie Kho",
    detail: "132 photos · 41 guests",
    event: "Ulang Tahun",
    featured: false,
  },
  {
    quote: "Akhirnya kita lihat momen dari sudut pandang tamu. Banyak foto kecil yang nggak akan kepikiran difoto fotografer.",
    name: "Kevin Ong",
    detail: "214 photos · 96 guests",
    event: "Pernikahan",
    featured: false,
  },
  {
    quote: "Gak perlu install aplikasi, scan QR langsung bisa pakai. Tamu tua pun gampang, ini yang paling bikin lega.",
    name: "Daniel Liem",
    detail: "89 photos · 28 guests",
    event: "Pesta",
    featured: true,
  },
];

export default function Testimonials() {
  return (
    <Section id="cerita">
      <div className="container">
        <SectionHeading
          eyebrow="Apa Kata Mereka"
          title={
            <>
              Cerita dari yang sudah <TitleAccent>merasakannya</TitleAccent>
            </>
          }
        />

        <div className={styles.grid}>
          {testimonials.map((t, i) => (
            <Reveal
              key={t.name}
              delay={i * 110}
              className={`${styles.card} ${t.featured ? styles.cardFeatured : ""}`}
            >
              <Quote size={18} className={styles.quoteIcon} />
              <blockquote className={styles.quote}>&ldquo;{t.quote}&rdquo;</blockquote>
              <div className={styles.cardFooter}>
                <div className={styles.avatar}>{t.name.charAt(0)}</div>
                <div>
                  <p className={styles.name}>{t.name}</p>
                  <p className={styles.detail}>{t.detail}</p>
                </div>
              </div>
              <span className={styles.eventTag}>{t.event}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
