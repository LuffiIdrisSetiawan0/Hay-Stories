"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeading, TitleAccent } from "@/components/ui/Section";
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
    a: "Preset film meniru kamera sekali pakai dan film nyata seperti Kodak FunSaver, Fujifilm QuickSnap, Kodak Portra 400, Kodak Ektar 100, Ilford HP5 Plus, dan CineStill 800T.",
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
    a: "Hingga 5 tamu selalu gratis. Acara yang lebih besar mulai dari Rp 49.000. Sekali bayar per album, tanpa langganan atau biaya tersembunyi.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Section id="faq">
      <div className="container">
        <SectionHeading
          eyebrow="Pertanyaan Umum"
          title={
            <>
              Ada pertanyaan? <TitleAccent>Kami bantu.</TitleAccent>
            </>
          }
          centered
        />

        <div className={styles.faqList}>
          {faqs.map((faq, i) => (
            <Reveal
              key={faq.q}
              delay={i * 70}
              className={`${styles.faqItem} ${openIndex === i ? styles.faqOpen : ""}`}
            >
              <button className={styles.faqQuestion} onClick={() => toggle(i)}>
                <span>{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`${styles.faqChevron} ${openIndex === i ? styles.faqChevronOpen : ""}`}
                />
              </button>
              <div className={`${styles.faqAnswer} ${openIndex === i ? styles.faqAnswerOpen : ""}`}>
                <p>{faq.a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
