"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./EventShowcase.module.css";

const EVENTS = [
  {
    href: "/pernikahan",
    label: "Pernikahan",
    line: "Momen haru, tawa di meja, dan dansa spontan yang terlewatkan fotografer.",
    detail:
      "Fotografer resmi berdiri di depan pelaminan. Tamu Anda memotret kehangatan reuni keluarga dan tawa sahabat dari seratus meja resepsi.",
  },
  {
    href: "/ulang-tahun",
    label: "Ulang Tahun",
    line: "Dari tiup lilin hingga canda tawa, tanpa perlu antre di mesin photobooth.",
    detail:
      "Cukup tempel kartu QR di meja kue atau cafe. Setiap teman memegang kamera analog di ponselnya untuk merekam momen otentik pesta Anda.",
  },
  {
    href: "/pesta",
    label: "Pesta & Nightout",
    line: "Lampu neon, direct flash candid, dan energi malam tanpa rasa jaim.",
    detail:
      "Preset Neon Night 1600 menangkap pendar lampu malam dan kegilaan lantai dansa, langsung tayang di layar panggung secara real-time.",
  },
  {
    href: "/acara-kantor",
    label: "Acara Kantor & Gathering",
    line: "Cairkan kebekuan tim, pererat bonding di setiap meja tanpa canggung.",
    detail:
      "Satu link untuk seluruh karyawan. Tanpa perlu download aplikasi atau akun, abadikan keseruan gala dinner dan team building tahunan.",
  },
] as const;

export default function EventShowcase() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const isPinned = useCallback(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (!isPinned()) return;

    const onScroll = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;

      const rect = wrap.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;

      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
      const nextIndex = Math.min(EVENTS.length - 1, Math.floor(progress * EVENTS.length));

      setActive(nextIndex);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isPinned]);

  return (
    <section id="acara" ref={wrapRef} className={`${styles.wrap} surface-dark`}>
      <div className={styles.sticky}>
        <div className="container">
          <div className={styles.head}>
            <p className={styles.eyebrow}>Untuk Setiap Acara</p>
            <p className={styles.counter} aria-hidden="true">
              {String(active + 1).padStart(2, "0")}
              <span className={styles.counterTotal}>
                {" / "}
                {String(EVENTS.length).padStart(2, "0")}
              </span>
            </p>
          </div>

          <div className={styles.body}>
            {EVENTS.map((event, i) => (
              <article
                key={event.href}
                className={`${styles.slide} ${i === active ? styles.slideActive : ""}`}
              >
                <h2 className={styles.name}>{event.label}</h2>
                <p className={styles.line}>{event.line}</p>
                <p className={styles.detail}>{event.detail}</p>
                <Link href={event.href} className={styles.cta}>
                  Pelajari paket {event.label.toLowerCase()}
                  <ArrowRight size={17} />
                </Link>
              </article>
            ))}
          </div>

          {/* Dots Indicator */}
          <div className={styles.dots} aria-hidden="true">
            {EVENTS.map((event, i) => (
              <span
                key={event.href}
                className={`${styles.dot} ${i === active ? styles.dotActive : ""}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
