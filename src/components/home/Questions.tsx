"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/site";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./Questions.module.css";

const QUESTIONS = [
  {
    q: "Apa itu HAY Stories?",
    a: "Kamera untuk tamu acara. Tamu pindai satu QR, memotret dari browser, dan semua fotonya terkumpul otomatis di satu album.",
  },
  {
    q: "Tamu perlu pasang aplikasi?",
    a: "Tidak perlu. Pindai QR pakai kamera bawaan ponsel, kameranya langsung terbuka di browser. Tanpa unduhan, tanpa akun.",
  },
  {
    q: "Siapa saja yang bisa melihat fotonya?",
    a: "Album tidak muncul di halaman publik. Tamu masuk lewat QR, tautan, atau kode acara. Kapan albumnya terbuka, kamu yang atur.",
  },
  {
    q: "Apa beda tiap paket?",
    a: "Fiturnya sama semua: enam roll film, QR, galeri, buku tamu suara, dan pengaturan waktu buka. Yang beda cuma jumlah tamu dan lama penyimpanan foto.",
  },
  {
    q: "Nama acara dan waktu buka bisa diubah?",
    a: "Bisa. Ubah kapan saja dari dasbor. Waktu buka album juga masih bisa diganti selama albumnya belum dibuka.",
  },
  {
    q: "Berapa lama foto tersimpan?",
    a: "Paket Starter menyimpan foto 90 hari. Paket berbayar tanpa batas waktu. Setiap foto bisa diunduh satu per satu dalam kualitas asli.",
  },
  {
    q: "Ada paket gratis?",
    a: "Ada. Paket Starter gratis untuk lima tamu, tanpa kartu kredit.",
  },
] as const;

/**
 * Pertanyaan yang sering diajukan.
 *
 * Jawabannya dibuka dengan `grid-template-rows: 0fr → 1fr`, bukan `max-height`
 * yang ditebak: tinggi tebakan selalu meleset pada jawaban terpanjang, dan
 * baris yang berhenti separuh terbuka lebih buruk daripada tanpa animasi.
 */
export default function Questions() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="tanya" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.aside}>
          <Reveal>
            <p className="kicker">Pertanyaan</p>
          </Reveal>

          <h2 className={styles.title}>
            <SplitText by="word" delay={60}>
              Yang sering ditanyakan
            </SplitText>
          </h2>

          <Reveal delay={220}>
            <p className={styles.note}>
              Belum terjawab? Kirim pertanyaanmu, kami balas langsung.
            </p>
          </Reveal>

          {SUPPORT_EMAIL && (
            <Reveal delay={280}>
              <a href={supportMailto()} className={styles.mail}>
                {SUPPORT_EMAIL}
              </a>
            </Reveal>
          )}
        </div>

        <ul className={styles.list}>
          {QUESTIONS.map((item, i) => {
            const expanded = open === i;
            return (
              <Reveal
                as="li"
                key={item.q}
                delay={i * 60}
                className={`${styles.item} ${expanded ? styles.itemOpen : ""}`}
              >
                <h3 className={styles.head}>
                  <button
                    type="button"
                    className={styles.trigger}
                    aria-expanded={expanded}
                    aria-controls={`tanya-${i}`}
                    onClick={() => setOpen(expanded ? null : i)}
                  >
                    <span>{item.q}</span>
                    <Plus size={18} strokeWidth={1.5} className={styles.icon} aria-hidden="true" />
                  </button>
                </h3>

                <div id={`tanya-${i}`} className={styles.answer}>
                  <div className={styles.answerInner}>
                    <p>{item.a}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
