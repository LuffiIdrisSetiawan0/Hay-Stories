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

const HERO_PRESETS = FILM_PRESETS;

const SCENES: Record<string, { src: string; alt: string }> = {
  "natural-clean": {
    src: "/img/scenes/01-pelaminan.jpg",
    alt: "potret natural cerah dengan warna asli dan nada kulit alami",
  },
  "film-35mm": {
    src: "/img/scenes/01-pelaminan.jpg",
    alt: "pasangan pengantin Indonesia tersenyum bahagia dalam busana pernikahan putih",
  },
  "film-fuji": {
    src: "/img/scenes/06-konfeti.jpg",
    alt: "prosesi pengantin luar ruang bertabur kelopak bunga diiringi senyum para tamu",
  },
  "film-kodak": {
    src: "/img/scenes/05-lantai-dansa.jpg",
    alt: "suasana pesta malam penuh energi dengan kilau hangat keemasan",
  },
  "film-polaroid": {
    src: "/img/scenes/04-potret.jpg",
    alt: "momen hangat penuh kenangan dengan estetika polaroid instan",
  },
};

const FAN = [
  { x: -2.0, y: 0.28, r: -12, z: 0 },
  { x: -1.0, y: -0.05, r: -6, z: 1 },
  { x: 0.0, y: 0.08, r: 0, z: 2 },
  { x: 1.0, y: -0.05, r: 6, z: 3 },
  { x: 2.0, y: 0.28, r: 12, z: 4 },
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

        for (const preset of HERO_PRESETS) {
          const scene = SCENES[preset.id];
          if (!scene) continue;
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
          {HERO_PRESETS.map((preset, i) => {
            const scene = SCENES[preset.id];
            if (!scene) return null;
            return (
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
                      src={scene.src}
                      alt={scene.alt}
                      className={styles.cardImg}
                      loading="eager"
                    />
                    <canvas
                      ref={(el) => registerTarget(preset.id, el)}
                      className={styles.canvas}
                      aria-label={`Ilustrasi ${scene.alt}, dirender dengan roll ${preset.name}`}
                      role="img"
                    />
                  </div>
                  <figcaption className={styles.tag}>{preset.name}</figcaption>
                </span>
              </figure>
            );
          })}
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
