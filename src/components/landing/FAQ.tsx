"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./FAQ.module.css";

const faqs = [
  {
    q: "Apa itu HAY Stories?",
    a: "HAY Stories adalah kamera analog disposable digital untuk acara. Tuan rumah cukup meletakkan QR code di meja. Tamu memindai QR dan langsung memotret di browser dengan filter roll film otentik. Semua foto terkumpul otomatis di satu galeri.",
  },
  {
    q: "Apakah tamu harus install aplikasi di HP?",
    a: "Sama sekali tidak. Tamu cukup scan QR code lewat kamera HP bawaan (iPhone atau Android). Kamera web HAY Stories langsung terbuka di browser dalam hitungan detik tanpa perlu download atau registrasi akun.",
  },
  {
    q: "Bagaimana cara menampilkan Live Slideshow di proyektor?",
    a: "Buka link Live Slideshow dari laptop di venue dan aktifkan mode Full Screen. Setiap kali tamu menjepret foto baru, fotonya akan otomatis tayang di layar proyektor atau TV venue secara real-time.",
  },
  {
    q: "Preset roll film apa saja yang tersedia?",
    a: "Ada 6 roll film analog: Golden Hour 400 (kulit hangat), Pastel 400 (lembut & dreamy), Sunday Chrome (warna pop cerah), Noir 400 (hitam putih klasik), Neon Night 1600 (flash pesta malam), dan Everyday 100 (warna natural).",
  },
  {
    q: "Berapa lama foto tersimpan dan bagaimana cara mengunduhnya?",
    a: "Foto tersimpan aman di cloud selama 1 tahun penuh. Anda bisa mengunduh foto satuan atau mengunduh seluruh album dalam format file ZIP beresolusi tinggi siap cetak kapan saja.",
  },
  {
    q: "Apakah ada paket gratis?",
    a: "Ada! Anda bisa mencoba gratis hingga 5 tamu untuk merasakan serunya kamera analog digital HAY Stories sebelum memesan paket acara yang lebih besar.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
