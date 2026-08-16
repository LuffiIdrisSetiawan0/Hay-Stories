"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FILM_PRESETS, type PresetId } from "@/lib/catalog";
import { FilmRenderer, isFilmSupported } from "@/lib/film";
import { useInView } from "@/components/ui/useInView";
import SplitText from "@/components/ui/SplitText";
import ScrollCue from "@/components/ui/ScrollCue";
import styles from "./Hero.module.css";

const SCENES: Record<PresetId, { src: string; alt: string }> = {
  "golden-hour-400": {
    src: "/img/scenes/01-pelaminan.jpg",
    alt: "pasangan pengantin Indonesia tersenyum bahagia dalam busana pernikahan putih",
  },
  "pastel-400": {
    src: "/img/scenes/06-konfeti.jpg",
    alt: "prosesi pengantin luar ruang bertabur kelopak bunga diiringi senyum para tamu",
  },
  "neon-night-1600": {
    src: "/img/scenes/05-lantai-dansa.jpg",
    alt: "suasana pesta malam anak muda penuh energi di bawah pendar lampu neon",
  },
  "everyday-100": {
    src: "/img/scenes/03-kue.jpg",
    alt: "tamu undangan muda berkebaya dan udeng berfoto candid sambil tersenyum",
  },
  "sunday-chrome": {
    src: "/img/scenes/02-meja-dekorasi.jpg",
    alt: "keceriaan ibu-ibu berkebaya warna-warni tertawa lepas di acara pesta",
  },
  "noir-400": {
    src: "/img/scenes/04-potret.jpg",
    alt: "momen sungkeman adat pernikahan penuh haru dan kehangatan",
  },
};

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
    const glCanvas = document.createElement("canvas");
    glCanvasRef.current = glCanvas;

    let cancelled = false;
    let renderer: FilmRenderer | null = null;

    (async () => {
      try {
        if (!isFilmSupported()) {
          setFailed(true);
          return;
        }

        renderer = new FilmRenderer(glCanvas);

        for (const preset of FILM_PRESETS) {
          const scene = SCENES[preset.id];
          const target = targetsRef.current.get(preset.id);
          if (!target) continue;

          const response = await fetch(scene.src);
          if (!response.ok) continue;
          const bitmap = await createImageBitmap(await response.blob());
          if (cancelled) return;

          await renderer.loadPreset(preset);
          if (cancelled) return;

          renderer.render(bitmap, preset, bitmap.width, bitmap.height, {
            intensity: preset.strength,
            lumaLock: preset.lumaLock,
            contrast: preset.contrast,
          });
          if (cancelled) return;

          target.width = bitmap.width;
          target.height = bitmap.height;
          const ctx = target.getContext("2d");
          if (!ctx) continue;
          ctx.drawImage(glCanvas, 0, 0);
        }
      } catch (err) {
        console.warn("WebGL film preview failed in Hero:", err);
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (renderer) renderer.dispose();
      glCanvasRef.current = null;
    };
  }, []);

  return (
    <section className={`${styles.hero} surface-dark`}>
      <div className={styles.inner}>
        <h1 className={styles.headline}>
          <SplitText by="word" delay={60}>
            Abadikan Hari Bahagia, Lewat Sudut Pandang Tamu
          </SplitText>
        </h1>

        {/* Fan Deck of 6 Film Scenes */}
        <div
          ref={deckRef}
          className={`${styles.deck} ${dealt ? styles.deckDealt : ""}`}
          aria-label="Contoh roll film analog HAY Stories"
        >
          {FILM_PRESETS.map((preset, i) => (
            <figure
              key={preset.id}
              className={styles.card}
              style={
                {
                  "--i": i,
                  "--x": FAN[i].x,
                  "--y": FAN[i].y,
                  "--r": `${FAN[i].r}deg`,
                  "--z": FAN[i].z,
                } as CSSProperties
              }
            >
              <span className={styles.cardInner}>
                <div className={styles.cardMedia}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={SCENES[preset.id].src}
                    alt={SCENES[preset.id].alt}
                    className={styles.cardImg}
                    loading="eager"
                  />
                  <canvas
                    ref={(el) => registerTarget(preset.id, el)}
                    className={styles.canvas}
                    aria-label={`Ilustrasi ${SCENES[preset.id].alt}, dirender dengan roll ${preset.name}`}
                    role="img"
                  />
                </div>
                <figcaption className={styles.tag}>{preset.name}</figcaption>
              </span>
            </figure>
          ))}
        </div>

        <p className={styles.lede}>
          <SplitText by="word" direction="up" delay={80}>
            Satu QR code di meja. Tamu scan dan langsung jepret dengan warna film analog otentik tanpa perlu download aplikasi. Semua foto candid terkumpul otomatis.
          </SplitText>
        </p>

        <div className={styles.actions}>
          <Link href="/login" className={styles.primaryBtn}>
            Buat Album Acara
            <ArrowRight size={17} />
          </Link>
          <Link href="#cara-kerja" className={styles.ghostBtn}>
            Lihat Cara Kerja
          </Link>
        </div>

        <ScrollCue href="#kenapa" label="Gulir ke bawah" />
      </div>
    </section>
  );
}
