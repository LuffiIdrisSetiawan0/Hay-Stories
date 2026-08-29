import type { CSSProperties } from "react";
import Image from "next/image";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import Marquee from "@/components/ui/Marquee";
import { SCENES, type Scene } from "@/lib/scenes";
import styles from "./MomentWall.module.css";

interface Moment {
  scene: Scene;
  caption: string;
  ratio: "tall" | "square" | "wide";
}

const ROW_ONE: Moment[] = [
  { scene: SCENES.pernikahanBuket, caption: "Halaman samping · 17.28", ratio: "tall" },
  { scene: SCENES.tamuMemotret, caption: "Dari meja kami · 16.52", ratio: "square" },
  { scene: SCENES.acaraKantor, caption: "Sebelum acara mulai", ratio: "wide" },
  { scene: SCENES.ulangTahunTaman, caption: "Potong kue · 20.14", ratio: "tall" },
  { scene: SCENES.mejaDekorasi, caption: "Meja keluarga · 18.05", ratio: "square" },
];

const ROW_TWO: Moment[] = [
  { scene: SCENES.pestaMalam, caption: "Lagu terakhir · 23.41", ratio: "wide" },
  { scene: SCENES.ulangTahunTaman, caption: "Foto bareng · 19.30", ratio: "tall" },
  { scene: SCENES.acaraKantor, caption: "Meja 3 · 21.02", ratio: "square" },
  { scene: SCENES.pernikahanBuket, caption: "Tepuk tangan · 20.40", ratio: "wide" },
  { scene: SCENES.mejaDekorasi, caption: "Dekorasi · 16.10", ratio: "tall" },
];

function Row({ moments, label }: { moments: Moment[]; label: string }) {
  return (
    <>
      {moments.map((moment, i) => (
        <figure key={`${label}-${moment.scene.src}-${i}`} className={styles.card}>
          <span className={`${styles.media} ${styles[moment.ratio]}`}>
            <Image
              src={moment.scene.src}
              alt=""
              fill
              sizes="18rem"
              /* `wide` memangkas atas-bawah, `tall` dan `square` memangkas
                 kiri-kanan. Titik fokusnya dipilih di sini karena bentuknya
                 sudah diketahui per kartu, bukan lewat media query. */
              style={
                {
                  objectPosition:
                    moment.ratio === "wide" ? moment.scene.focusWide : moment.scene.focusTall,
                } as CSSProperties
              }
              className={styles.photo}
            />
          </span>
          <figcaption className={styles.caption}>{moment.caption}</figcaption>
        </figure>
      ))}
    </>
  );
}

/**
 * Dinding momen.
 *
 * Dua baris berjalan berlawanan arah. Arah yang berlawanan itu penting: dua
 * baris yang bergerak searah terbaca seperti satu blok besar yang menggeser,
 * sedangkan arah berlawanan membuat keduanya terbaca sebagai dua lapisan.
 *
 * Isinya contoh tampilan galeri, bukan testimoni. Tidak ada nama orang dan
 * tidak ada kutipan — keterangan waktunya hanya menunjukkan bentuk keterangan
 * yang muncul di album sungguhan.
 */
export default function MomentWall() {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <Reveal>
          <p className="kicker">Foto dari tamu</p>
        </Reveal>

        <h2 className={styles.title}>
          <SplitText by="word" delay={70}>
            Ratusan foto dari banyak sisi
          </SplitText>
        </h2>

        <Reveal delay={240}>
          <p className={styles.lede}>
            Satu acara bisa menghasilkan ratusan foto dari puluhan orang. Semuanya masuk ke
            album yang sama.
          </p>
        </Reveal>
      </div>

      <div className={styles.rows}>
        <Marquee speed={62} label="Contoh foto tamu, baris pertama">
          <Row moments={ROW_ONE} label="satu" />
        </Marquee>

        <Marquee speed={74} direction="right" label="Contoh foto tamu, baris kedua">
          <Row moments={ROW_TWO} label="dua" />
        </Marquee>
      </div>

      <p className={styles.note}>Contoh tampilan galeri acara.</p>
    </section>
  );
}
