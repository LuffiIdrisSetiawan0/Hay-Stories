"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FILM_PRESETS } from "@/lib/catalog";
import { FilmRenderer, isFilmSupported } from "@/lib/film";
import { useInView } from "@/components/ui/useInView";
import { SCENES } from "@/lib/scenes";
import styles from "./FilmRolls.module.css";

/**
 * Diambil lewat `fetch` biasa, bukan lewat `/_next/image`: yang dibutuhkan di
 * sini piksel mentahnya untuk diwarnai WebGL, bukan berkas yang sudah
 * dioptimasi. Konsekuensinya tidak ada cache Next yang menyelamatkan kalau
 * berkasnya hilang — kegagalannya langsung terlihat sebagai enam petak kosong.
 */
const SAMPLE = SCENES.pernikahanBuket.src;

/**
 * Deret contoh roll film.
 *
 * Enam petak memperlihatkan foto yang sama dengan enam nuansa warna berbeda,
 * dirender di perangkat memakai WebGL — persis yang dilihat tamu di kamera.
 *
 * Perenderan baru berjalan saat komponennya masuk viewport dan hanya sekali
 * untuk tiap roll. Berganti pilihan sesudah itu tidak merender ulang apa pun,
 * hanya memindahkan sorotan, jadi tidak ada beban GPU tiap kali kursor
 * bergerak.
 *
 * Sengaja tanpa judul seksi: komponen ini ditanam di dalam kartu yang sudah
 * punya judulnya sendiri.
 *
 * Mode `compact` untuk kartu sempit di rel fitur: enam petak tetap dalam satu
 * baris, sementara nama roll dan baris keterangannya disembunyikan dari mata.
 * Namanya disembunyikan lewat teknik yang tetap menyisakannya untuk pembaca
 * layar — kalau dihapus, keenam tombolnya kehilangan nama yang bisa dibacakan
 * dan hanya tersisa enam petak tanpa keterangan apa pun.
 */
export default function FilmRolls({ compact = false }: { compact?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.05 });
  const [active, setActive] = useState(2);
  const [failed, setFailed] = useState(false);

  const targetsRef = useRef(new Map<string, HTMLCanvasElement>());

  const registerTarget = useCallback((id: string, el: HTMLCanvasElement | null) => {
    if (el) targetsRef.current.set(id, el);
    else targetsRef.current.delete(id);
  }, []);

  useEffect(() => {
    if (!inView) return;

    const glCanvas = document.createElement("canvas");
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

        const response = await fetch(SAMPLE, { cache: "force-cache" });
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
    };
  }, [inView]);

  const current = FILM_PRESETS[active];

  return (
    <div ref={ref} className={`${styles.wrap} ${compact ? styles.compact : ""}`}>
      <div className={styles.rail} role="group" aria-label="Pilihan roll film">
        {FILM_PRESETS.map((preset, i) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            className={`${styles.swatch} ${i === active ? styles.swatchOn : ""}`}
          >
            <span className={styles.media}>
              <canvas
                ref={(el) => registerTarget(preset.id, el)}
                className={styles.canvas}
                aria-hidden="true"
              />
              {failed && <span className={styles.fallback} aria-hidden="true" />}
            </span>
            <span className={styles.name}>{preset.name}</span>
          </button>
        ))}
      </div>

      <p className={styles.readout} aria-live="polite">
        <strong>{current.name}</strong> {current.character}
      </p>
    </div>
  );
}
