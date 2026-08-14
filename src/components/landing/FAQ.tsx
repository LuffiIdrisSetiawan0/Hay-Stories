"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./FAQ.module.css";

const faqs = [
  {
    q: "Apa itu HAY Stories?",
    a: "HAY Stories adalah pengalaman kamera sekali pakai digital untuk acara. Buat acara dan bagikan kode QR-nya. Tamu memotret langsung di browser, memilih sendiri roll film yang dipakai, dan semua foto terungkap bersama setelah acara.",
  },
  {
    q: "Apakah tamu perlu install aplikasi?",
    a: "Tidak. Tamu memindai kode QR atau membuka tautan di browser apa saja. Berfungsi langsung di iPhone, Android, dan desktop. Tidak perlu download atau daftar.",
  },
  {
    q: "Preset film apa yang tersedia?",
    a: "Ada enam roll: Golden Hour 400, Pastel 100, Sunday Chrome, Noir 400, Neon Night 1600, dan Everyday 100. Tabel warnanya diturunkan dari stok film sungguhan, dan tiap roll menjawab satu kondisi acara — kulit di bawah lampu gedung, dekorasi terang di luar ruang, sampai resepsi malam berlampu warna.",
  },
  {
    q: "Kapan foto bisa dilihat?",
    a: "Kamu pilih: selama acara, segera setelahnya, atau atur penundaan kustom. Setelah terungkap, semua tamu melihat setiap foto pada waktu yang sama.",
  },
  {
    q: "Apakah foto bisa diunduh?",
    a: "Ya. Setiap foto bisa diunduh secara individual dari galeri, atau kamu bisa mengunduh semua foto sekaligus dalam satu file ZIP.",
  },
  {
    q: "Berapa biayanya?",
    a: "Hingga 5 tamu selalu gratis. Acara yang lebih besar mulai dari Rp 199.000. Sekali bayar per album, tanpa langganan atau biaya tersembunyi.",
  },
];

/**
 * Akordeon pertanyaan.
 *
 * Jawabannya dibuka lewat `grid-template-rows: 0fr → 1fr`, bukan `max-height`
 * yang ditebak. Nilai tebakan selalu salah di salah satu ujung: terlalu kecil
 * memotong jawaban terpanjang, terlalu besar membuat animasi menutupnya jeda
 * dulu sebelum ada yang bergerak.
 */
export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className={styles.section}>
      <div className="container">
        <div className={styles.head}>
          <p className={styles.eyebrow}>FAQ</p>
          <h2 className={styles.title}>
            <SplitText by="word" delay={80}>
              Pertanyaan yang sering masuk
            </SplitText>
          </h2>
        </div>

        <ul className={styles.list}>
          {faqs.map((faq, i) => {
            const open = openIndex === i;
            return (
              <Reveal key={faq.q} as="li" delay={i * 70} className={styles.item}>
                <h3>
                  <button
                    type="button"
                    className={styles.question}
                    aria-expanded={open}
                    aria-controls={`faq-answer-${i}`}
                    onClick={() => setOpenIndex(open ? null : i)}
                  >
                    <span>{faq.q}</span>
                    <Plus
                      size={18}
                      strokeWidth={1.5}
                      className={`${styles.icon} ${open ? styles.iconOpen : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>

                <div
                  id={`faq-answer-${i}`}
                  className={`${styles.answer} ${open ? styles.answerOpen : ""}`}
                >
                  <div className={styles.answerInner}>
                    <p>{faq.a}</p>
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
