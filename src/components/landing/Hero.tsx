"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FILM_PRESETS } from "@/lib/catalog";
import { FilmRenderer, isFilmSupported } from "@/lib/film";
import { useInView } from "@/components/ui/useInView";
import SplitText from "@/components/ui/SplitText";
import Marquee from "@/components/ui/Marquee";
import ScrollCue from "@/components/ui/ScrollCue";
import styles from "./Hero.module.css";

const SAMPLE = "/img/hero-placeholder.jpg";

/**
 * Hero: judul raksasa rata tengah di atas hitam, dengan setumpuk kartu foto
 * yang terlempar naik lalu mendarat mengipas.
 *
 * Kartunya bukan enam salinan gambar yang sama. Satu sumber dirender lewat enam
 * roll film berbeda memakai pipeline WebGL yang sama persis dengan kamera tamu
 * — jadi tumpukan itu sekaligus memamerkan produknya, bukan cuma menghias.
 * Yang dilihat pengunjung di layar pertama adalah apa yang benar-benar akan
 * mereka dapat.
 *
 * TODO: `hero-placeholder.jpg` masih dibangkitkan script. Begitu ada enam foto
 * acara asli, ganti sumber tiap kartu dan hapus pemrosesan WebGL-nya — foto
 * berbeda jauh lebih kuat daripada satu foto dalam enam rasa.
 */

/**
 * Posisi akhir tiap kartu setelah mendarat, sebagai kelipatan `--spread`.
 *
 * Ditulis sebagai tabel dan bukan rumus supaya kipasnya bisa disetel per kartu.
 * Rumus simetris terlihat seperti grafik, bukan seperti kartu yang dilempar ke
 * meja: yang membuatnya terbaca sebagai benda justru ketidakteraturan kecilnya.
 */
const FAN = [
  { x: -2.35, y: 0.34, r: -14, z: 0 },
  { x: -1.42, y: -0.1, r: -8.5, z: 1 },
  { x: -0.48, y: 0.12, r: -3, z: 2 },
  { x: 0.48, y: 0.05, r: 3.5, z: 3 },
  { x: 1.42, y: -0.12, r: 9, z: 4 },
  { x: 2.35, y: 0.3, r: 14.5, z: 5 },
] as const;

export default function Hero() {
  const [failed, setFailed] = useState(false);
  const { ref: deckRef, inView: dealt } = useInView<HTMLDivElement>({ threshold: 0.15 });

  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetsRef = useRef(new Map<string, HTMLCanvasElement>());

  const registerTarget = useCallback((id: string, el: HTMLCanvasElement | null) => {
    if (el) targetsRef.current.set(id, el);
    else targetsRef.current.delete(id);
  }, []);

  useEffect(() => {
    // Satu konteks WebGL untuk keenam kartu, sama seperti showcase dan kamera.
    const glCanvas = document.createElement("canvas");
    glCanvasRef.current = glCanvas;

    let cancelled = false;
    let renderer: FilmRenderer | null = null;
    let bitmap: ImageBitmap | null = null;

    (async () => {
      try {
        if (!isFilmSupported()) {
          setFailed(true);
          return;
        }

        renderer = new FilmRenderer(glCanvas);

        const response = await fetch(SAMPLE);
        if (!response.ok) throw new Error(`Gambar contoh gagal dimuat (${response.status})`);
        bitmap = await createImageBitmap(await response.blob());
        if (cancelled) return;

        for (const preset of FILM_PRESETS) {
          const target = targetsRef.current.get(preset.id);
          if (!target) continue;

          await renderer.loadPreset(preset);
          if (cancelled) return;

          renderer.render(bitmap, preset, bitmap.width, bitmap.height, {
            intensity: preset.strength,
            lumaLock: preset.lumaLock,
            contrast: preset.contrast,
          });

          target.width = bitmap.width;
          target.height = bitmap.height;
          target.getContext("2d")?.drawImage(glCanvas, 0, 0);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      bitmap?.close();
      renderer?.dispose();
      glCanvasRef.current = null;
    };
  }, []);

  return (
    <section className={`${styles.hero} surface-dark`}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>
          <SplitText direction="up" by="word">
            Kamera sekali pakai digital
          </SplitText>
        </p>

        <h1 className={styles.headline}>
          <SplitText by="word" delay={120}>
            Ratusan momen yang tidak terlihat fotografer
          </SplitText>
        </h1>

        {/*
          Tumpukan kartu. Enam kartu menempati satu sel grid yang sama, jadi
          keadaan awalnya benar-benar setumpuk; yang memisahkannya jadi kipas
          hanya transform pada keadaan mendarat.
        */}
        <div
          ref={deckRef}
          className={`${styles.deck} ${dealt ? styles.deckDealt : ""}`}
          aria-hidden={failed ? undefined : "true"}
        >
          {FILM_PRESETS.map((preset, i) => (
            <figure
              key={preset.id}
              className={styles.card}
              style={
                {
                  "--x": FAN[i].x,
                  "--y": FAN[i].y,
                  "--r": `${FAN[i].r}deg`,
                  "--i": i,
                  zIndex: FAN[i].z,
                } as CSSProperties
              }
            >
              <canvas
                ref={(el) => registerTarget(preset.id, el)}
                className={styles.canvas}
                aria-label={`Contoh roll ${preset.name}`}
                role="img"
              />
              <figcaption className={styles.tag}>{preset.name}</figcaption>
            </figure>
          ))}
        </div>

        <p className={styles.lede}>
          <SplitText by="word" direction="up" delay={80}>
            Fotografermu menangkap hari itu dari satu sudut pandang. Tamumu
            menangkapnya dari seratus sudut yang lain.
          </SplitText>
        </p>

        <div className={styles.actions}>
          <Link href="/login" className={styles.primaryBtn}>
            Buat album
            <ArrowRight size={17} />
          </Link>
          <Link href="#cara-kerja" className={styles.ghostBtn}>
            Lihat cara kerjanya
          </Link>
        </div>

        <ScrollCue href="#kenapa" label="Gulir" />
      </div>

      {/*
        Baris roll di tepi bawah hero. Nama-namanya bergerak terus, memberi satu
        gerakan konstan yang menahan layar pertama tetap hidup setelah animasi
        masuknya selesai.
      */}
      <Marquee className={styles.rollBand} speed={46} label="Roll film yang tersedia">
        {FILM_PRESETS.map((preset) => (
          <span key={preset.id} className={styles.rollItem}>
            <span className={styles.rollAt}>@</span>
            {preset.name}
            <span className={styles.rollDot} aria-hidden="true" />
          </span>
        ))}
      </Marquee>
    </section>
  );
}
