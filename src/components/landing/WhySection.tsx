import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import BigWord from "@/components/ui/BigWord";
import styles from "./WhySection.module.css";

/**
 * Seksi "kenapa", dibangun di sekitar satu kata raksasa.
 *
 * Bobot seksinya dipikul kata "KENAPA" dan pantulannya, lalu tiga kalimat rata
 * tengah yang membaca seperti argumen — bukan daftar fitur.
 *
 * Tiga masalah aslinya tidak dibuang, hanya dipadatkan jadi satu alur: foto
 * tercecer, kamera fisik mahal, dan momen yang tidak terlihat siapa pun.
 *
 * Kalimatnya dipecah per karakter, bukan per kata. Per kata terlalu cepat
 * selesai untuk tiga baris sependek ini; per karakter membuat argumennya
 * terbaca dengan kecepatan orang membacanya, yang justru intinya.
 */

const LINES = [
  "Foto terbaik acaramu ada di HP orang lain.",
  "Tersebar di puluhan ponsel, separuh lupa dikirim, sisanya blur.",
  "Itulah kenapa kami mengumpulkannya jadi satu album.",
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
              <SplitText by="char" direction="blur" delay={i * 180}>
                {line}
              </SplitText>
            </p>
          ))}
        </div>

        <Reveal delay={320} className={styles.actionWrap}>
          <Link href="#cara-kerja" className={styles.outlineBtn}>
            Lihat cara kerjanya
            <ArrowRight size={17} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
