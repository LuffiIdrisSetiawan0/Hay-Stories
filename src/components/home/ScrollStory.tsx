"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { Check, QrCode } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import FilmRolls from "./FilmRolls";
import { SCENES, SCENE_LIST, sceneFocus } from "@/lib/scenes";
import { usePinProgress } from "./usePinProgress";
import styles from "./ScrollStory.module.css";

/**
 * Sudut dan ketinggian istirahat tiap kartu.
 *
 * Angkanya diukur langsung dari referensi, bukan dikira-kira: sudut istirahat
 * berturut-turut +5°, 0°, −6°, −15°, dan tiap kartu duduk pada ketinggian yang
 * sedikit berbeda. Dua hal itulah — dan hanya dua hal itu — yang membuat
 * tumpukannya terbaca sebagai tumpukan. Kartu yang sudah mendarat tidak pernah
 * mengecil, tidak pernah mundur, dan tidak pernah bergerak lagi; ia cuma
 * tertimpa kartu berikutnya.
 *
 * Ketinggiannya ditulis sebagai persen tinggi kartu, bukan piksel: kartu
 * menyusut dari 440px jadi 360px di ponsel, dan ganjaran piksel tetap akan
 * merenggangkan tumpukannya justru ketika ruangnya paling sempit.
 */
const STEPS = [
  {
    id: "masuk",
    tone: "peach",
    rest: "5deg",
    dy: "0%",
    title: "Pindai, lalu tulis nama",
    text: "Tamu pindai QR di meja. Kamera langsung terbuka di browser, tanpa unduhan apa pun.",
  },
  {
    id: "roll",
    tone: "butter",
    rest: "0deg",
    dy: "7%",
    title: "Pilih roll filmnya",
    text: "Ada enam pilihan warna di dalam kamera. Hasilnya terlihat sebelum foto diambil.",
  },
  {
    id: "jepret",
    tone: "sage",
    rest: "-6deg",
    dy: "-1.5%",
    title: "Mulai memotret",
    text: "Jumlah foto per tamu kamu yang atur. Sisanya selalu terlihat di layar.",
  },
  {
    id: "galeri",
    tone: "blush",
    rest: "-15deg",
    dy: "-12.5%",
    title: "Foto masuk ke satu album",
    text: "Setiap foto tersimpan otomatis. Kamu yang menentukan kapan album dibuka.",
  },
] as const;

/** Judul raksasa dipecah per baris, bukan per kalimat, supaya patahannya tetap. */
const HEADLINE = ["Satu QR.", "Semua tamu.", "Satu album."] as const;

/** Contoh tamu yang bergabung. Namanya jelas contoh, seperti data di panel mana pun. */
const GUESTS = [
  { name: "Dinda", time: "19.42" },
  { name: "Rangga", time: "19.44" },
  { name: "Sasa", time: "19.51" },
  { name: "Bima", time: "20.03" },
] as const;

/** Lima petak terisi, satu petak terakhir menampung angka "+123". */
const GALLERY = SCENE_LIST.slice(0, 5);

/**
 * Panel produk putih di kaki tiap kartu.
 *
 * Sengaja lebar dan datar, bukan maket ponsel. Kartunya sendiri sudah miring di
 * ruang perspektif; maket ponsel di dalam kartu miring terbaca sebagai benda
 * yang jatuh, sementara panel datar terbaca sebagai layar yang ikut miring
 * bersama kartunya.
 */
function Panel({ id }: { id: (typeof STEPS)[number]["id"] }) {
  if (id === "masuk") {
    return (
      <>
        <p className={styles.panelTitle}>Tamu bergabung</p>
        <ul className={styles.guests}>
          {GUESTS.map((guest) => (
            <li key={guest.name} className={styles.guest}>
              <span className={styles.guestAvatar}>{guest.name.charAt(0)}</span>
              <span className={styles.guestName}>{guest.name}</span>
              <span className={styles.guestTime}>{guest.time}</span>
            </li>
          ))}
        </ul>
        <span className={styles.qr} aria-hidden="true">
          <QrCode size={64} strokeWidth={1.2} />
          <i>Pernikahan Nara &amp; Bima</i>
        </span>
      </>
    );
  }

  if (id === "roll") {
    return (
      <>
        <p className={styles.panelTitle}>Pilihan roll film</p>
        <FilmRolls />
      </>
    );
  }

  if (id === "jepret") {
    return (
      <>
        <div className={styles.viewfinder}>
          <Image
            src={SCENES.ulangTahunTaman.src}
            alt=""
            fill
            /* Panelnya selebar ~40rem, bukan 28rem. Nilai yang terlalu kecil
               membuat browser memilih varian yang lantas diregangkan. */
            sizes="44rem"
            style={sceneFocus(SCENES.ulangTahunTaman) as CSSProperties}
            className={styles.photo}
          />
          <span className={styles.left}>18 tersisa</span>
        </div>
        <div className={styles.controls}>
          <span className={styles.saved}>
            <Check size={13} strokeWidth={3} />
            Tersimpan ke album
          </span>
          <span className={styles.shutter} aria-hidden="true" />
        </div>
      </>
    );
  }

  return (
    <>
      <p className={styles.panelTitle}>
        Galeri acara <b>128 foto</b>
      </p>
      <div className={styles.grid} aria-hidden="true">
        {GALLERY.map((scene) => (
          <span key={scene.src} className={styles.cell}>
            <Image
              src={scene.src}
              alt=""
              fill
              sizes="9rem"
              style={sceneFocus(scene) as CSSProperties}
              className={styles.photo}
            />
          </span>
        ))}
        <span className={`${styles.cell} ${styles.more}`}>+123</span>
      </div>
    </>
  );
}

/**
 * Panggung langkah — dek kartu 3D yang bertumpuk sambil halaman dipaku.
 *
 * Seksi ini yang memikul seluruh irama halaman, dan bentuknya diambil dari
 * referensi: satu lembar bersudut atas sangat membulat naik menutupi hero,
 * lalu di dalamnya panggung setinggi layar ditahan di puncak selama lima layar
 * penuh.
 *
 * Yang terjadi selama ditahan itu dibagi jadi lima ketukan. Ketukan pertama
 * milik judul raksasa sendirian; sesudah itu judulnya pergi dan empat kartu
 * langkah berdatangan satu per satu dari bawah panggung, berputar balik ke
 * sudut istirahatnya, lalu berhenti menutupi kartu sebelumnya.
 *
 * Yang beranimasi cuma dua hal, dan keduanya terkunci satu sama lain: jarak
 * tempuh tegak dan sudut putar. Tidak ada kepekatan yang beranimasi, tidak ada
 * skala yang beranimasi. Itu bukan penyederhanaan melainkan hasil pengukuran —
 * matriks transformasi referensi dibaca langsung dari browser di sebelas titik
 * gulir, dan kepekatannya 1 serta skalanya 1 di seluruh sebelas titik itu.
 *
 * Kepekatan yang ikut beranimasi justru merusaknya: kartu yang sedang datang
 * masih setengah tembus pandang tepat ketika ia sudah menutupi kartu
 * sebelumnya, dan yang terlihat adalah dua judul saling menembus. Kartu di sini
 * karena itu selalu pekat penuh; yang menyembunyikannya sebelum giliran datang
 * adalah tepi panggung, bukan kepekatan.
 *
 * Kartu yang sudah mendarat tidak pernah bergerak lagi. Tumpukannya terbaca
 * bukan karena kartu lama mundur, melainkan karena tiap kartu punya sudut dan
 * ketinggian istirahat yang berbeda sedikit.
 */
export default function ScrollStory() {
  const ref = usePinProgress<HTMLElement>((progress, root) => {
    // Ketukannya satu lebih banyak daripada jumlah kartu: yang pertama milik
    // judul. Nilainya ditahan di kartu terakhir supaya kartu penutup tidak ikut
    // bergerak lagi di ruang kosong ujung seksi.
    const head = Math.min(progress * (STEPS.length + 1) - 1, STEPS.length - 1);

    root.querySelectorAll<HTMLElement>("[data-card]").forEach((card, i) => {
      // Satu angka saja untuk tiap kartu: 0 ketika masih di bawah panggung, 1
      // ketika sudah mendarat. Sesudah mendarat ia berhenti di 1 selamanya.
      card.style.setProperty("--arrive", String(Math.min(Math.max(head - i + 1, 0), 1)));
    });
  });

  return (
    <section id="alur" ref={ref} className={styles.section}>
      <div data-stage className={styles.stage}>
        <div className={styles.mesh} aria-hidden="true" />

        {/* Ketukan pertama. Diletakkan sebelum dek di pohon dokumen supaya
            urutan bacanya benar ketika seluruh panggung diratakan. */}
        <div data-overlay className={styles.intro}>
          <Reveal>
            <p className="kicker">Langkah demi langkah</p>
          </Reveal>

          <h2 className={styles.headline}>
            {HEADLINE.map((line, i) => (
              <SplitText key={line} as="span" by="word" delay={140 + i * 160} className={styles.line}>
                {line}
              </SplitText>
            ))}
          </h2>
        </div>

        <ol data-deck className={styles.deck}>
          {STEPS.map((step, i) => (
            <li
              key={step.id}
              data-card
              className={`${styles.card} ${styles[step.tone]}`}
              style={{ "--n": i, "--rest": step.rest, "--dy": step.dy } as CSSProperties}
            >
              <span className={styles.badge}>Langkah {i + 1}</span>
              <h3 className={styles.cardTitle}>{step.title}</h3>
              <p className={styles.cardText}>{step.text}</p>

              <div className={styles.panel}>
                <Panel id={step.id} />
              </div>
            </li>
          ))}
        </ol>

        {/* Tepi lembar berikutnya yang mengintip di kaki panggung — penanda
            bahwa masih ada bidang lain di bawah sini, bukan ujung halaman. */}
        <span className={styles.peek} aria-hidden="true" />
      </div>

      {/* Jarak gulir yang menahan pakunya: satu layar untuk judul, lalu satu
          layar untuk tiap kartu. */}
      {["intro", ...STEPS.map((step) => step.id)].map((key) => (
        <div key={key} data-spacer className={styles.spacer} aria-hidden="true" />
      ))}
    </section>
  );
}
