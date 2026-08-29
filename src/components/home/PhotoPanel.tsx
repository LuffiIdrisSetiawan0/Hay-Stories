import type { CSSProperties } from "react";
import Image from "next/image";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import { SCENES, sceneFocus } from "@/lib/scenes";
import styles from "./PhotoPanel.module.css";

/**
 * Fotonya memperlihatkan tamu yang sedang memotret — persis isi kartunya.
 *
 * Titik fokus tegaknya digeser dari nilai bawaan registry karena kartu putih
 * menumpang di 46% kiri-bawah foto pada layar lebar; ponsel di dalam foto
 * ditarik sedikit ke kanan supaya tidak berakhir di balik kartu itu.
 */
const SCENE = SCENES.tamuMemotret;

/**
 * Panel foto.
 *
 * Menggantikan pita gelap penuh layar di versi sebelumnya. Kontrasnya datang
 * dari fotonya sendiri, bukan dari membalik seluruh seksi jadi gelap: satu
 * gambar besar bersudut membulat, dengan kartu putih yang menumpang di
 * atasnya. Halaman tetap terang dari ujung ke ujung.
 */
export default function PhotoPanel() {
  return (
    <section id="cerita" className={styles.section}>
      <div className={styles.inner}>
        <Reveal direction="scale" className={styles.mediaSlot}>
          <div className={styles.media}>
            <Image
              src={SCENE.src}
              alt={SCENE.alt}
              fill
              /* Kotaknya 1136px, bukan 1248px: `--max-width` 78rem masih
                 dikurangi dua gutter. Meminta 78rem membuat browser memilih
                 varian yang lebih besar daripada yang pernah terpakai. */
              sizes="(max-width: 900px) 92vw, 70rem"
              quality={88}
              style={{ ...sceneFocus(SCENE), "--focus-wide": "62% 45%" } as CSSProperties}
              className={styles.photo}
            />
          </div>
        </Reveal>

        <Reveal delay={220} className={styles.cardSlot}>
          <div className={styles.card}>
            <p className="kicker">Kenapa album tamu</p>

            <h2 className={styles.title}>
              <SplitText by="word" delay={60}>
                Foto terbaik datang dari tamu sendiri
              </SplitText>
            </h2>

            <p className={styles.text}>
              Fotografer memotret dari depan panggung. Tamu memotret dari meja mereka, dari
              halaman, dan dari sudut yang tidak terjangkau kamera utama.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
