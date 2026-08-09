import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeading, TitleAccent } from "@/components/ui/Section";
import styles from "./ProblemSection.module.css";

const problems = [
  {
    number: "01",
    title: "Hilang di Grup Chat",
    description:
      "Foto candid tamu tersebar di puluhan HP. Minta kirim lewat WhatsApp? Separuhnya lupa, sisanya kirim blur.",
  },
  {
    number: "02",
    title: "Kamera Fisik yang Mahal",
    description:
      "Kamera sekali pakai fisik: Rp 150rb per unit, hasilnya 50:50, dan separuhnya hilang sebelum acara selesai.",
  },
  {
    number: "03",
    title: "Momen yang Tak Terulang",
    description:
      "Fotografer profesional menangkap momen formal. Tapi siapa yang merekam tawa lepas di meja tamu saat Anda tidak melihat?",
  },
];

export default function ProblemSection() {
  return (
    <Section>
      <div className="container">
        <SectionHeading
          eyebrow="Masalah yang Sering Terjadi"
          title={
            <>
              Kenangan yang <TitleAccent>Sering Terlewat</TitleAccent>
            </>
          }
        />

        <div className={styles.list}>
          {problems.map((problem, index) => (
            <Reveal key={problem.number} delay={index * 120} className={styles.row}>
              <span className={styles.number}>{problem.number}</span>
              <div className={styles.rowContent}>
                <h3 className={styles.rowTitle}>{problem.title}</h3>
                <p className={styles.rowDesc}>{problem.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
