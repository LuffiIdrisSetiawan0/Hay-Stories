"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./FAQ.module.css";

const faqs = [
  {
    q: "Apa itu HAY Stories?",
    a: "Kamera analog digital untuk acara. Tamu scan QR di meja, langsung motret di browser, dan semua foto candid terkumpul otomatis di satu album.",
  },
  {
    q: "Apakah tamu harus install aplikasi di HP?",
    a: "Tidak perlu. Cukup scan QR code lewat kamera HP, langsung memotret tanpa unduh aplikasi atau bikin akun.",
  },
  {
    q: "Bagaimana cara menampilkan Live Slideshow di proyektor?",
    a: "Buka tautan slideshow di laptop venue. Setiap foto baru dari tamu akan langsung tayang di layar proyektor secara real-time.",
  },
  {
    q: "Preset roll film apa saja yang tersedia?",
    a: "Tersedia 6 preset film analog 35mm otentik yang cocok untuk segala kondisi cahaya—dari outdoor cerah hingga pesta malam.",
  },
  {
    q: "Berapa lama foto tersimpan dan cara mengunduhnya?",
    a: "Foto tersimpan 1 tahun dan bisa diunduh kapan saja, satuan maupun sekaligus dalam file ZIP resolusi penuh.",
  },
  {
    q: "Apakah ada paket gratis?",
    a: "Ada. Paket Starter gratis untuk 5 tamu tanpa perlu kartu kredit.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className={styles.section}>
      <div className="container">
        <div className={styles.head}>
          <p className={styles.eyebrow}>FAQ</p>
          <h2 className={styles.title}>
            <SplitText by="word" delay={80}>
              Pertanyaan yang Sering Diajukan
            </SplitText>
          </h2>
        </div>

        <ul className={styles.list}>
          {faqs.map((faq, i) => {
            const open = openIndex === i;
            return (
              <Reveal key={faq.q} as="li" delay={i * 60} className={styles.item}>
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
                  <p className={styles.answerText}>{faq.a}</p>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
