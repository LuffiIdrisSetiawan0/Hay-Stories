"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FILM_PRESETS } from "@/lib/catalog";
import { FilmRenderer, isFilmSupported } from "@/lib/film";
import styles from "./Hero.module.css";

const SAMPLE = "/img/hero-placeholder.jpg";

/**
 * Hero: judul rata tengah di atas hitam, dengan kartu foto berhamburan.
 *
 * Kartunya bukan lima salinan gambar yang sama. Satu sumber dirender lewat lima
 * roll film berbeda memakai pipeline WebGL yang sama persis dengan kamera tamu
 * — jadi tumpukan itu sekaligus memamerkan produknya, bukan cuma menghias.
 * Yang dilihat pengunjung di layar pertama adalah apa yang benar-benar akan
 * mereka dapat.
 *
 * TODO: `hero-placeholder.jpg` masih dibangkitkan script. Begitu ada lima foto
 * acara asli, ganti `CARDS[].src` masing-masing dan hapus pemrosesan WebGL-nya
 * — foto berbeda jauh lebih kuat daripada satu foto dalam lima rasa.
 */

/** Lima kartu, diurut dari belakang ke depan. Sudut dan geserannya di CSS. */
const CARDS = FILM_PRESETS.slice(0, 5);

export default function Hero() {
  const [failed, setFailed] = useState(false);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetsRef = useRef(new Map<string, HTMLCanvasElement>());

  const registerTarget = useCallback((id: string, el: HTMLCanvasElement | null) => {
    if (el) targetsRef.current.set(id, el);
    else targetsRef.current.delete(id);
  }, []);

  useEffect(() => {
    // Satu konteks WebGL untuk kelima kartu, sama seperti showcase dan kamera.
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

        for (const preset of CARDS) {
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
        <p className={styles.eyebrow}>Kamera sekali pakai digital</p>

        <h1 className={styles.headline}>
          Ratusan momen yang
          <br />
          <mark className={styles.mark}>tidak terlihat</mark> fotografer
        </h1>

        {/*
          Tumpukan kartu. Sudut dan geseran tiap kartu diberikan lewat custom
          property di CSS, bukan di sini — supaya seluruh komposisinya bisa
          disetel di satu tempat tanpa menyentuh komponen.
        */}
        <div className={styles.stack} aria-hidden={failed ? undefined : "true"}>
          {CARDS.map((preset, i) => (
            <figure key={preset.id} className={styles.card} data-index={i}>
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
          Fotografermu menangkap hari itu dari satu sudut pandang.
          <br />
          Tamumu menangkapnya dari seratus sudut yang lain.
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
      </div>
    </section>
  );
}
