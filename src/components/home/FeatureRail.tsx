"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { Check, Play } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import PhoneMock from "./PhoneMock";
import FilmRolls from "./FilmRolls";
import { SCENES, SCENE_LIST, sceneFocus } from "@/lib/scenes";
import { usePinProgress } from "./usePinProgress";
import styles from "./FeatureRail.module.css";

/** Tinggi batang gelombang suara — tetap, supaya server dan klien sama. */
const WAVE = [26, 54, 38, 72, 46, 88, 60, 34, 68, 92, 52, 78, 44, 64, 84, 48] as const;

/* Enam petak foto contoh isi galeri. Petak terakhir sengaja bukan foto
   melainkan hitungan sisa: galeri sungguhan selalu memuat lebih banyak foto
   daripada yang muat di satu kartu, dan hitungannya yang menyampaikan itu. */
const GALLERY = SCENE_LIST.slice(0, 5);

/** Kode contoh. Alfabetnya membuang huruf yang mudah tertukar saat dibaca. */
const CODE = ["H", "4", "Y", "K", "R", "N"] as const;

interface CardProps {
  title: string;
  /** Rona kartu: nama kelas gradien di berkas gaya. */
  tone: "peach" | "butter" | "sage" | "blush" | "sky";
  /** Judul di kepala kartu atau di kakinya. */
  align?: "top" | "bottom";
  /** Peraga produk yang mengisi sisa kartu. */
  children: ReactNode;
  /** Kelas tambahan untuk peraga yang butuh perlakuan sendiri. */
  artClassName?: string;
  /**
   * Kartu ini salinan kedua untuk ticker di ponsel, bukan kartu sungguhan.
   * Disembunyikan dari pembaca layar dan dikeluarkan dari urutan Tab.
   */
  copy?: boolean;
}

/**
 * Satu kartu fitur.
 *
 * Judul saja, tanpa ikon dan tanpa paragraf. Itu bukan penghematan ruang
 * melainkan pembagian tugas: judulnya menyebut fiturnya, peraganya yang
 * menunjukkan wujudnya. Paragraf di antara keduanya hanya mengulang salah satu
 * dari keduanya dengan kata lain, dan ia memakan ruang yang seharusnya jadi
 * milik peraga.
 *
 * Letak judulnya berganti-ganti antara kepala dan kaki kartu. Enam kartu yang
 * judulnya semua di kepala terbaca sebagai tabel; berselang-seling membuatnya
 * terbaca sebagai deret kartu.
 */
function Card({ title, tone, align = "top", children, artClassName, copy }: CardProps) {
  return (
    <li
      className={[
        styles.card,
        styles[tone],
        align === "bottom" ? styles.cardBottom : "",
        copy ? styles.copy : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={copy || undefined}
      // `aria-hidden` saja tidak cukup: kartu salinan memuat tombol roll film
      // yang tetap bisa dijangkau Tab, dan fokus yang mendarat di sesuatu yang
      // disembunyikan dari pembaca layar adalah fokus yang hilang.
      inert={copy || undefined}
    >
      <h3 className={styles.cardTitle}>{title}</h3>
      <div className={[styles.cardArt, artClassName].filter(Boolean).join(" ")}>{children}</div>
    </li>
  );
}

/**
 * Enam kartu fiturnya, dirender sebagai daftar.
 *
 * Dipanggil dua kali. Salinan keduanya yang membuat ticker di ponsel bisa
 * berputar tanpa sambungan: trek digeser tepat selebar satu salinan, sehingga
 * kartu pertama salinan kedua mendarat persis di tempat kartu pertama salinan
 * pertama saat animasinya mengulang. Tanpa salinan itu, relnya akan
 * meninggalkan ruang kosong selebar layar di setiap putaran.
 *
 * Di desktop salinannya disembunyikan CSS, jadi tidak ada satu pun kartu
 * tambahan yang ikut diperhitungkan saat menghitung jarak sapuan.
 */
function FeatureCards({ copy = false }: { copy?: boolean }) {
  return (
    <>
        <Card copy={copy} title="Kamera tanpa aplikasi" tone="peach" artClassName={styles.artCamera}>
          <PhoneMock className={styles.cameraPhone}>
            <div className={styles.cam} aria-hidden="true">
              <div className={styles.camTop}>
                <span>Nara &amp; Bima</span>
                <span>18 tersisa</span>
              </div>
              <div className={styles.camView}>
                <Image
                  src={SCENES.tamuMemotret.src}
                  alt=""
                  fill
                  sizes="12rem"
                  style={sceneFocus(SCENES.tamuMemotret) as CSSProperties}
                  className={styles.photo}
                />
              </div>
              <div className={styles.camBar}>
                <span className={styles.camShutter} />
              </div>
            </div>
          </PhoneMock>
        </Card>

        <Card copy={copy} title="Enam roll film" tone="butter" align="bottom">
          <FilmRolls compact />
        </Card>

        <Card copy={copy} title="Semua foto di satu galeri" tone="sage">
          <div className={styles.galleryGrid} aria-hidden="true">
            {GALLERY.map((scene) => (
              <span key={scene.src} className={styles.galleryCell}>
                <Image
                  src={scene.src}
                  alt=""
                  fill
                  sizes="6rem"
                  style={sceneFocus(scene) as CSSProperties}
                  className={styles.photo}
                />
              </span>
            ))}
            <span className={`${styles.galleryCell} ${styles.galleryMore}`}>+123</span>
          </div>
        </Card>

        <Card copy={copy} title="Pesan suara dari tamu" tone="blush" align="bottom">
          <div className={styles.voice} aria-hidden="true">
            <span className={styles.voicePlay}>
              <Play size={13} strokeWidth={2.5} fill="currentColor" />
            </span>
            <span className={styles.wave}>
              {WAVE.map((height, i) => (
                <i key={i} style={{ height: `${height}%` }} />
              ))}
            </span>
            <span className={styles.voiceTime}>0:17</span>
          </div>
        </Card>

        <Card copy={copy} title="Kamu yang atur kapan dibuka" tone="sky">
          <div className={styles.modes} aria-hidden="true">
            <span className={styles.mode}>Langsung terlihat</span>
            <span className={`${styles.mode} ${styles.modeOn}`}>
              <Check size={13} strokeWidth={3} />
              Dibuka bersama
            </span>
            <span className={styles.mode}>Terjadwal</span>
          </div>
        </Card>

        <Card copy={copy} title="Kode cadangan kalau QR susah dipindai" tone="butter" align="bottom">
          <div className={styles.code} aria-hidden="true">
            {CODE.map((char, i) => (
              <span key={i} className={styles.codeCell}>
                {char}
              </span>
            ))}
          </div>
        </Card>
    </>
  );
}

/**
 * Rel fitur — enam kartu produk yang menyapu mendatar di bawah judul yang diam.
 *
 * Pasangan dari panggung langkah di atasnya, dengan pembagian kerja yang sama:
 * judul dipaku, isi bergerak. Bedanya di sini judulnya duduk di atas relnya,
 * bukan menimpanya, karena kartunya memuat peraga produk yang harus terbaca
 * utuh — bukan foto suasana yang boleh lewat separuh.
 *
 * Jarak sapuannya tidak ditulis sebagai angka melainkan dihitung: selebar
 * relnya sendiri dikurangi selebar layar. Artinya kartu terakhir berhenti tepat
 * di tepi kanan berapa pun lebar layarnya, dan menambah kartu ketujuh tidak
 * menuntut satu angka pun disetel ulang.
 *
 * Di layar sempit pakunya dilepas dan relnya berubah jadi deret yang digulir
 * jempol dengan pengancing per kartu. Referensinya menukar relnya jadi ticker
 * yang jalan sendiri di sana; digulir tangan lebih baik untuk kartu yang isinya
 * memang harus dibaca, dan tidak ada yang perlu menunggu kartu keenam datang.
 */
export default function FeatureRail() {
  const ref = usePinProgress<HTMLElement>();

  return (
    <section id="fitur" ref={ref} className={styles.section}>
      <div data-stage className={styles.stage}>
        <header className={styles.head}>
          <Reveal>
            <p className="kicker">Yang kamu dapat</p>
          </Reveal>

          <h2 className={styles.title}>
            <SplitText by="word" delay={70}>
              Semua dalam satu tautan
            </SplitText>
          </h2>
        </header>

        <div className={styles.viewport}>
          <ol data-rail className={styles.rail} style={{ "--count": 6 } as CSSProperties}>
            <FeatureCards />
            <FeatureCards copy />
          </ol>
        </div>
      </div>

      {/* Jarak gulir yang menahan pakunya. Dua layar cukup: relnya bergerak jauh
          lebih pendek daripada panggung langkah, dan pengganjal ketiga hanya
          akan membuat sapuannya terasa berat. */}
      <div data-spacer className={styles.spacer} aria-hidden="true" />
      <div data-spacer className={styles.spacer} aria-hidden="true" />
    </section>
  );
}
