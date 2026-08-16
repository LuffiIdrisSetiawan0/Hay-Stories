"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FILM_PRESETS } from "@/lib/catalog";
import { FilmRenderer, isFilmSupported } from "@/lib/film";
import { Section } from "@/components/ui/Section";
import { useInView } from "@/components/ui/useInView";
import SplitText from "@/components/ui/SplitText";
import styles from "./FilmShowcase.module.css";

const SAMPLE = "/img/scenes/01-pelaminan.jpg";

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
          if (cancelled) return;

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
          <p className={styles.eyebrow}>Preset Roll Film 35mm</p>
          <p className={styles.counter} aria-hidden="true">
            {String(active + 1).padStart(2, "0")}
            <span className={styles.counterTotal}>
              {" / "}
              {String(FILM_PRESETS.length).padStart(2, "0")}
            </span>
          </p>
        </div>

        <h2 className={styles.title}>
          <SplitText by="word" delay={60}>
            Enam Karakter Warna untuk Setiap Suasana Acara
          </SplitText>
        </h2>

        <div className={styles.layout}>
          {/* Film Selection List */}
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
                  <div className={styles.listMeta}>
                    <span className={styles.listName}>{preset.name}</span>
                    <span className={styles.listDesc}>{preset.character}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* Interactive Frame Viewer */}
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
              <div className={styles.metaBadgeRow}>
                <h3 className={styles.featureName}>{current.name}</h3>
                <span className={styles.presetBadge}>35mm Film Roll</span>
              </div>
              <p className={styles.featureCharacter}>{current.character}</p>
              <p className={styles.footnote}>
                Dirender di perangkatmu dengan WebGL shader emulsi film 35mm otentik.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
