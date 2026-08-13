"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FILM_PRESETS } from "@/lib/catalog";
import { FilmRenderer, isFilmSupported } from "@/lib/film";
import { Section, SectionHeading, TitleAccent } from "@/components/ui/Section";
import { useInView } from "@/components/ui/useInView";
import styles from "./FilmShowcase.module.css";

const SAMPLE = "/img/hero-placeholder.jpg";

/**
 * Band gelap yang memamerkan keenam preset film — tata letak foto mepet
 * ala OMS Photo, di atas permukaan `.surface-dark`.
 *
 * Ini bukan gambar hasil ekspor: setiap sel dirender di perangkat pengunjung
 * lewat pipeline WebGL yang sama persis dengan kamera tamu. Apa yang mereka
 * lihat di sini adalah apa yang benar-benar akan mereka dapat.
 *
 * Render baru dimulai saat seksi ini masuk viewport, supaya tidak membebani
 * pemuatan awal halaman.
 */
export default function FilmShowcase() {
  const { ref: sectionRef, inView } = useInView<HTMLDivElement>({ threshold: 0.05 });
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  /*
   * Menggulir track, bukan mengganti elemen yang dirender.
   *
   * Keenam kanvas tetap dirender sekali di awal oleh satu konteks WebGL.
   * Menukar-nukar elemen saat berpindah roll akan membuat React melepas
   * kanvasnya, dan konteks GL yang memegang kanvas lama jadi menggambar ke
   * elemen yang sudah dibuang — persis bug yang pernah mengosongkan viewfinder
   * kamera.
   */
  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(FILM_PRESETS.length - 1, index));
    const cell = track.children[clamped] as HTMLElement | undefined;
    cell?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setActive(clamped);
  }, []);

  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetsRef = useRef(new Map<string, HTMLCanvasElement>());

  const registerTarget = useCallback((id: string, el: HTMLCanvasElement | null) => {
    if (el) targetsRef.current.set(id, el);
    else targetsRef.current.delete(id);
  }, []);

  useEffect(() => {
    if (!inView) return;

    // Satu konteks WebGL untuk keenam sel. Membuat satu konteks per sel akan
    // mendekati batas konteks browser tanpa alasan.
    const glCanvas = document.createElement("canvas");
    glCanvasRef.current = glCanvas;

    let cancelled = false;
    let renderer: FilmRenderer | null = null;
    let bitmap: ImageBitmap | null = null;

    (async () => {
      try {
        // Pemeriksaan dukungan di dalam fungsi async, bukan di badan efek,
        // supaya setState tidak dipanggil sinkron saat efek berjalan.
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

          // Wajib per preset: satu tekstur LUT dipakai bergantian.
          await renderer.loadPreset(preset);
          if (cancelled) return;

          // Kekuatan yang sama dengan kamera tamu — showcase tidak boleh menjanjikan
          // rasa yang tidak akan mereka dapat.
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

  return (
    <Section id="preset" tone="dark">
      <div ref={sectionRef} className={styles.inner}>
        <SectionHeading
          eyebrow="Preset Film"
          marker="rule"
          title={
            <>
              Enam roll, enam <TitleAccent>karakter</TitleAccent>
            </>
          }
          subtitle="Setiap tamu memilih sendiri roll yang dipakainya, dan bebas berganti di tengah acara. Enam karakter film yang berbeda, satu album yang sama."
          centered
        />

        <div className={styles.carousel}>
          <div className={styles.track} ref={trackRef}>
          {FILM_PRESETS.map((preset) => (
            <figure key={preset.id} className={styles.cell}>
              <canvas
                ref={(el) => registerTarget(preset.id, el)}
                className={styles.canvas}
                aria-label={`Contoh preset ${preset.name}`}
                role="img"
              />
              {failed && <p className={styles.fallback}>{preset.character}</p>}
              <figcaption className={styles.caption}>
                <p className={styles.presetName}>{preset.name}</p>
                <p className={styles.presetCharacter}>{preset.character}</p>
              </figcaption>
            </figure>
          ))}
          </div>

          <div className={styles.nav}>
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              className={styles.navBtn}
              aria-label="Roll sebelumnya"
            >
              <ChevronLeft size={18} />
            </button>

            <span className={styles.counter}>
              {String(active + 1).padStart(2, "0")} / {String(FILM_PRESETS.length).padStart(2, "0")}
            </span>

            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active === FILM_PRESETS.length - 1}
              className={styles.navBtn}
              aria-label="Roll berikutnya"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <p className={styles.footnote}>
          Dirender langsung di perangkatmu dengan mesin film yang sama dengan kamera tamu.
        </p>
      </div>
    </Section>
  );
}
