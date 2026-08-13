import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import BigWord from "@/components/ui/BigWord";
import styles from "./ProblemSection.module.css";

/**
 * Seksi "kenapa", dibangun di sekitar satu kata raksasa.
 *
 * Versi sebelumnya memakai judul rata kiri dengan daftar bernomor. Sekarang
 * bobotnya dipikul kata "KENAPA" dan pantulannya, lalu tiga kalimat rata tengah
 * yang membaca seperti argumen — bukan daftar fitur.
 *
 * Tiga masalah aslinya tidak dibuang, hanya dipadatkan jadi satu alur: foto
 * tercecer, kamera fisik mahal, dan momen yang tidak terlihat siapa pun.
 */
export default function ProblemSection() {
  return (
    <section className={styles.section}>
      <div className="container">
        <Reveal className={styles.head}>
          <BigWord>Kenapa</BigWord>
        </Reveal>

        <Reveal delay={120} className={styles.body}>
          <p className={styles.line}>Foto terbaik acaramu ada di HP orang lain.</p>
          <p className={styles.line}>
            Tersebar di puluhan ponsel, separuh lupa dikirim, sisanya blur.
          </p>
          <p className={styles.line}>
            Itulah kenapa kami mengumpulkannya jadi <mark className={styles.mark}>satu album</mark>.
          </p>
        </Reveal>

        <Reveal delay={220} className={styles.actionWrap}>
          <Link href="#cara-kerja" className={styles.outlineBtn}>
            Lihat cara kerjanya
            <ArrowRight size={17} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
