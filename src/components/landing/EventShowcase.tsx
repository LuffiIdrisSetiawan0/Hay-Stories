import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./EventShowcase.module.css";

const EVENTS = [
  {
    href: "/pernikahan",
    label: "Pernikahan",
    line: "Bukan hanya foto resmi. Momen hangat di sela-selanya.",
    image: "/img/scenes/06-konfeti-v2.webp",
    alt: "pengantin berjalan di antara keluarga dan kelopak bunga",
  },
  {
    href: "/ulang-tahun",
    label: "Ulang Tahun",
    line: "Dari tiup lilin sampai foto paling random bersama sahabat.",
    image: "/img/scenes/03-kue-v2.webp",
    alt: "perayaan ulang tahun intim bersama sahabat di kafe",
  },
  {
    href: "/pesta",
    label: "Pesta & Nightout",
    line: "Flash menyala. Jaim mati. Energi malam tersimpan dari banyak sudut.",
    image: "/img/scenes/05-lantai-dansa-v2.webp",
    alt: "teman-teman menari dalam pesta malam",
  },
  {
    href: "/acara-kantor",
    label: "Acara Kantor",
    line: "Satu tim, banyak sudut—dari penghargaan sampai tawa setelah acara.",
    image: "/img/scenes/04-potret-v2.webp",
    alt: "tim kantor Indonesia tertawa bersama di acara perusahaan",
  },
] as const;

export default function EventShowcase() {
  return (
    <section id="acara" className={`${styles.section} surface-dark`}>
      <div className="container">
        <div className={styles.header}>
          <p className={styles.eyebrow}>Untuk setiap cara merayakan</p>
          <h2 className={styles.title}>Acaranya berbeda. Ceritanya sama berharganya.</h2>
        </div>

        <div className={styles.grid}>
          {EVENTS.map((event, index) => (
            <article key={event.href} className={styles.card}>
              <Link href={event.href} className={styles.cardLink}>
                <Image
                  src={event.image}
                  alt={event.alt}
                  fill
                  sizes="(max-width: 760px) 100vw, 50vw"
                  className={styles.image}
                />
                <span className={styles.scrim} aria-hidden="true" />
                <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.content}>
                  <span className={styles.name}>{event.label}</span>
                  <span className={styles.line}>{event.line}</span>
                  <span className={styles.cta}>
                    Lihat untuk {event.label.toLowerCase()}
                    <ArrowUpRight size={16} />
                  </span>
                </span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
