"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./FAQ.module.css";

const faqs = [
  {
    q: "Apa itu HAY Stories?",
    a: "Kamera tamu digital untuk acara. Tamu memindai QR, memotret dari browser, dan semua foto candid terkumpul otomatis di satu album.",
  },
  {
    q: "Apakah tamu harus install aplikasi di HP?",
    a: "Tidak perlu. Cukup scan QR code lewat kamera HP, langsung memotret tanpa unduh aplikasi atau bikin akun.",
  },
  {
    q: "Siapa yang bisa melihat foto acara?",
    a: "Album tidak dicantumkan di halaman publik. Tamu masuk lewat QR, tautan, atau kode acara; galeri baru dapat dilihat sesuai aturan reveal yang dipilih host.",
  },
  {
    q: "Apa perbedaan setiap paket?",
    a: "Fitur kamera, enam nuansa film, QR, galeri, dan reveal sama. Perbedaannya ada pada kapasitas tamu dan masa penyimpanan. Paket berbayar dibayar satu kali per album melalui Midtrans.",
  },
  {
    q: "Bisakah nama acara dan waktu reveal diubah?",
    a: "Bisa. Host dapat mengubah detail album dari dashboard. Waktu reveal dapat disesuaikan selama galeri belum dibuka.",
  },
  {
    q: "Nuansa film apa saja yang tersedia?",
    a: "Ada enam pilihan—mulai dari Natural, warna hangat untuk sore, nuansa cerah, pesta malam, sampai hitam putih. Tamu dapat menggantinya pada setiap jepretan.",
  },
  {
    q: "Berapa lama foto tersimpan dan cara mengunduhnya?",
    a: "Starter menyimpan foto selama 90 hari, sedangkan paket berbayar tidak memiliki tanggal kedaluwarsa. Foto dapat dibuka dan diunduh satu per satu dalam resolusi hasilnya; unduhan ZIP belum tersedia.",
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
