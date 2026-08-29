"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import { SCENES, sceneFocus } from "@/lib/scenes";
import styles from "./Occasions.module.css";

/** Foto dan teks alt-nya datang dari `@/lib/scenes`, bukan ditulis ulang di sini. */
const OCCASIONS = [
  {
    id: "pernikahan",
    label: "Pernikahan",
    href: "/pernikahan",
    scene: SCENES.pernikahanBuket,
    note: "Dari akad sampai pesta, terekam juga dari meja keluarga dan teman.",
  },
  {
    id: "ulang-tahun",
    label: "Ulang Tahun",
    href: "/ulang-tahun",
    scene: SCENES.ulangTahunTaman,
    note: "Tiup lilin, potong kue, dan foto spontan bersama orang terdekat.",
  },
  {
    id: "pesta",
    label: "Pesta & Nightout",
    href: "/pesta",
    scene: SCENES.pestaMalam,
    note: "Semua orang ikut memotret. Suasana malamnya terekam dari banyak sisi.",
  },
  {
    id: "acara-kantor",
    label: "Acara Kantor",
    href: "/acara-kantor",
    scene: SCENES.acaraKantor,
    note: "Dari acara resminya sampai suasana santai setelahnya.",
  },
] as const;

/**
 * Pemilih jenis acara.
 *
 * Keempat gambar dirender sekaligus dan ditukar dengan opacity, bukan
 * dipasang-lepas saat dipilih: menukar `src` membuat gambar berikutnya baru
 * mulai diunduh setelah diklik, sehingga bingkainya berkedip kosong satu-dua
 * ratus milidetik.
 *
 * Pilihan berpindah saat keping disorot maupun diklik, jadi tetikus tidak
 * perlu menekan apa pun untuk melihat isinya — sementara papan ketik tetap
 * bisa berpindah dengan Tab karena setiap kepingnya tombol sungguhan.
 */
export default function Occasions() {
  const [active, setActive] = useState(0);
  const current = OCCASIONS[active];

  return (
    <section id="acara" className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <Reveal>
            <p className="kicker">Jenis acara</p>
          </Reveal>

          <h2 className={styles.title}>
            <SplitText by="word" delay={70}>
              Cocok untuk acara apa pun
            </SplitText>
          </h2>

          <Reveal delay={240}>
            <p className={styles.lede}>
              Fiturnya sama untuk semua acara. Yang berbeda cuma suasananya.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className={styles.tabs} role="group" aria-label="Pilih jenis acara">
              {OCCASIONS.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={i === active}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className={`${styles.tab} ${i === active ? styles.tabOn : ""}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </Reveal>
        </header>

        <Reveal direction="scale" delay={160} className={styles.stageSlot}>
          <div className={styles.stage}>
            {OCCASIONS.map((item, i) => (
              <Image
                key={item.id}
                src={item.scene.src}
                alt={i === active ? item.scene.alt : ""}
                fill
                sizes="(max-width: 900px) 92vw, 70rem"
                quality={88}
                style={sceneFocus(item.scene) as CSSProperties}
                className={`${styles.photo} ${i === active ? styles.photoOn : ""}`}
              />
            ))}

            <div className={styles.caption}>
              <p className={styles.captionLabel}>{current.label}</p>
              <p className={styles.captionNote} aria-live="polite">
                {current.note}
              </p>
              <Link href={current.href} className={styles.captionLink}>
                Lihat halaman {current.label.toLowerCase()}
                <ArrowRight size={15} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
