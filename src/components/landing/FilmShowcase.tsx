"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FILM_PRESETS } from "@/lib/catalog";
import { FilmRenderer, isFilmSupported } from "@/lib/film";
import { Section } from "@/components/ui/Section";
import { useInView } from "@/components/ui/useInView";
import styles from "./FilmShowcase.module.css";

/*
 * Satu adegan untuk keenam roll — di sini itu memang yang benar. Seksi ini soal
 * MEMBANDINGKAN roll, dan perbandingan hanya berarti kalau yang dibandingkan
 * sama. Hero yang memakai enam adegan berbeda; tugasnya berbeda.
 */
const SAMPLE = "/img/scenes/01-pelaminan.jpg";

/**
 * Daftar roll bernomor di samping, satu contoh besar di sebelahnya.
 *
 * Keenam kanvas tetap ada di DOM sepanjang waktu; berpindah roll hanya
 * memudarkan yang aktif ke depan. Tidak ada yang dilepas — melepasnya membuat
 * React memasang elemen baru sementara konteks WebGL masih memegang kanvas
 * lama, dan yang tampil jadi kosong. Bug itu sudah pernah terjadi di viewfinder
 * kamera; tidak perlu diulang di sini.
 *
 * Render dimulai saat seksi masuk viewport, supaya tidak membebani muat awal.
 */
export default function FilmShowcase() {
  const { ref: sectionRef, inView } = useInView<HTMLDivElement>({ threshold: 0.05 });
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetsRef = useRef(new Map<string, HTMLCanvasElement>());

  const registerTarget = useCallback((id: string, el: HTMLCanvasElement | null) => {
    if (el) targetsRef.current.set(id, el);
    else targetsRef.current.delete(id);
  }, []);

  useEffect(() => {
    if (!inView) return;

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
  }, [inView]);

  const current = FILM_PRESETS[active];

  return (
    <Section id="preset" tone="dark">
      <div ref={sectionRef} className={styles.inner}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>Roll Film</p>
          <p className={styles.counter} aria-hidden="true">
            {String(active + 1).padStart(2, "0")}
            <span className={styles.counterTotal}>
              {" / "}
              {String(FILM_PRESETS.length).padStart(2, "0")}
            </span>
          </p>
        </div>

        <h2 className={styles.title}>Enam roll, enam kondisi acara</h2>

        <div className={styles.layout}>
          {/* Daftar bernomor; menekan salah satunya mengganti contoh di sebelah. */}
          <ul className={styles.list}>
            {FILM_PRESETS.map((preset, i) => (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-pressed={i === active}
                  className={`${styles.listItem} ${i === active ? styles.listItemActive : ""}`}
                >
                  <span className={styles.listNumber}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.listName}>{preset.name}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className={styles.feature}>
            <div className={styles.frame}>
              {FILM_PRESETS.map((preset, i) => (
                <canvas
                  key={preset.id}
                  ref={(el) => registerTarget(preset.id, el)}
                  className={`${styles.canvas} ${i === active ? styles.canvasActive : ""}`}
                  aria-label={`Contoh roll ${preset.name}`}
                  role="img"
                />
              ))}
              {failed && <p className={styles.fallback}>{current.character}</p>}
            </div>

            <div className={styles.featureMeta}>
              <h3 className={styles.featureName}>{current.name}</h3>
              <p className={styles.featureCharacter}>{current.character}</p>
              <p className={styles.footnote}>
                Dirender di perangkatmu dengan mesin film yang sama dengan kamera tamu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
