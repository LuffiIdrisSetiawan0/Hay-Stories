import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import BigWord from "@/components/ui/BigWord";
import styles from "./WhySection.module.css";

const LINES = [
  "Foto terbaik acaramu ada di HP tamu.",
  "Tanpa minta satu per satu, tanpa kompresi kualitas.",
  "Semua momen candid terkumpul otomatis di satu album.",
] as const;

export default function WhySection() {
  return (
    <section id="kenapa" className={styles.section}>
      <div className="container">
        <Reveal className={styles.head} direction="blur">
          <BigWord as="h2">Kenapa</BigWord>
        </Reveal>

        <div className={styles.body}>
          {LINES.map((line, i) => (
            <p key={line} className={i === LINES.length - 1 ? styles.lineLast : styles.line}>
              <SplitText by="char" direction="blur" delay={i * 140}>
                {line}
              </SplitText>
            </p>
          ))}
        </div>

        <Reveal delay={280} className={styles.actionWrap}>
          <Link href="#cara-kerja" className={styles.outlineBtn}>
            Lihat Cara Kerjanya
            <ArrowRight size={16} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
