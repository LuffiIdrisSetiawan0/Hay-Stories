"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FILM_PRESETS, type PresetId } from "@/lib/catalog";
import { FilmRenderer, isFilmSupported } from "@/lib/film";
import { useInView } from "@/components/ui/useInView";
import SplitText from "@/components/ui/SplitText";
import Marquee from "@/components/ui/Marquee";
import ScrollCue from "@/components/ui/ScrollCue";
import styles from "./Hero.module.css";

/**
 * Hero: judul raksasa rata tengah di atas hitam, dengan setumpuk kartu foto
 * yang terlempar naik lalu mendarat mengipas.
 *
 * Tiap kartu adegan berbeda, dan tiap adegan dirender lewat roll film yang
 * memang dirancang untuk kondisi itu — pelaminan berlampu gedung lewat Golden
 * Hour, dekorasi luar ruang lewat Pastel, resepsi malam berlampu warna lewat
 * Neon Night. Pasangannya bukan acak: keenam roll di katalog ini dipilih untuk
 * memetakan enam kondisi acara, dan hero inilah tempat pemetaan itu terlihat.
 *
 * Rendernya memakai pipeline WebGL yang sama persis dengan kamera tamu, jadi
 * tumpukan ini memamerkan produknya alih-alih cuma menghias.
 */

/**
 * Adegan untuk tiap roll, dipetakan dari `character` roll itu di katalog.
 *
 * Dikunci lewat id, BUKAN lewat urutan array. Urutan FILM_PRESETS tidak sama
 * dengan urutan deklarasi `PresetId`, dan nama tampilnya sudah pernah berubah
 * tanpa idnya ikut berubah — memasangkan lewat indeks berarti setiap penyisipan
 * roll baru diam-diam menggeser semua adegan ke roll yang salah. Sebagai
 * Record berkunci `PresetId`, roll yang belum punya adegan langsung jadi error
 * saat build.
 */
const SCENES: Record<PresetId, { src: string; alt: string }> = {
  // "Momen utama. Kulit hangat natural, warna hidup"
  "golden-hour-400": {
    src: "/img/scenes/01-pelaminan.jpg",
    alt: "pasangan pengantin Indonesia tersenyum bahagia dalam busana pernikahan putih",
  },
  // "Luar ruang dan dekorasi. Terang lapang, nada pastel"
  "pastel-400": {
    src: "/img/scenes/06-konfeti.jpg",
    alt: "prosesi pengantin luar ruang bertabur kelopak bunga diiringi senyum para tamu",
  },
  // "Gedung berlampu. Menangani campuran cahaya, pendar hangat"
  "neon-night-1600": {
    src: "/img/scenes/05-lantai-dansa.jpg",
    alt: "suasana pesta malam anak muda penuh energi di bawah pendar lampu neon",
  },
  // "Warna apa adanya. Grain paling halus, paling jujur"
  "everyday-100": {
    src: "/img/scenes/03-kue.jpg",
    alt: "tamu undangan muda berkebaya dan udeng berfoto candid sambil tersenyum",
  },
  // "Detail, bunga, dan dekorasi. Warna paling jenuh"
  "sunday-chrome": {
    src: "/img/scenes/02-meja-dekorasi.jpg",
    alt: "keceriaan ibu-ibu berkebaya warna-warni tertawa lepas di acara pesta",
  },
  // "Momen emosional. Hitam putih kontras keras"
  "noir-400": {
    src: "/img/scenes/04-potret.jpg",
    alt: "momen sungkeman adat pernikahan penuh haru dan kehangatan",
  },
};

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

    (async () => {
      try {
        if (!isFilmSupported()) {
          setFailed(true);
          return;
        }

        renderer = new FilmRenderer(glCanvas);

        /*
         * Berurutan, bukan Promise.all. Keenamnya berbagi satu konteks WebGL
         * dan satu kanvas antara; memuatnya paralel berarti dua render bisa
         * menimpa kanvas yang sama sebelum yang pertama sempat disalin keluar.
         */
        for (let i = 0; i < FILM_PRESETS.length; i++) {
          const preset = FILM_PRESETS[i];
          const target = targetsRef.current.get(preset.id);
          if (!target) continue;

          const scene = SCENES[preset.id];
          const response = await fetch(scene.src);
          if (!response.ok) {
            throw new Error(`${scene.src} gagal dimuat (${response.status})`);
          }

          const bitmap = await createImageBitmap(await response.blob());
          if (cancelled) {
            bitmap.close();
            return;
          }

          try {
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
          } finally {
            // Dilepas begitu selesai disalin ke kanvas tujuan. Menahan keenamnya
            // sampai akhir berarti enam bitmap penuh menganggur di memori tanpa
            // ada yang membacanya lagi.
            bitmap.close();
          }
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      renderer?.dispose();
      glCanvasRef.current = null;
    };
  }, []);

  return (
    <section className={`${styles.hero} surface-dark`}>
      <div className={styles.inner}>
        <h1 className={styles.headline}>
          <SplitText by="word" delay={120}>
            Momen yang tak terlihat fotografer
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
                  "--z": FAN[i].z,
                } as CSSProperties
              }
            >
              {/*
                Lapis dalam ada khusus untuk hover. Animasi terlempar memakai
                `transform` di pembungkus luar dan berjalan 1,05 detik; hover
                butuh `transform` juga tapi harus selesai dalam sepersekian
                detik. Satu elemen cuma punya satu `transform`, jadi kalau
                keduanya ditaruh di tempat yang sama, hover akan mewarisi durasi
                animasi masuk dan terasa seperti macet.
              */}
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
