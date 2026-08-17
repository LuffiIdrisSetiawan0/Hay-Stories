"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./EventShowcase.module.css";

const EVENTS = [
  {
    href: "/pernikahan",
    label: "Pernikahan",
    line: "Abadikan momen haru, tawa di meja tamu, dan dansa spontan yang tak tertangkap fotografer.",
  },
  {
    href: "/ulang-tahun",
    label: "Ulang Tahun",
    line: "Rekam tiup lilin bersama sahabat dan keseruan pesta, bebas antre photobooth.",
  },
  {
    href: "/pesta",
    label: "Pesta & Nightout",
    line: "Look warna untuk cahaya pesta dan galeri bersama untuk menangkap energi malam dari banyak sudut.",
  },
  {
    href: "/acara-kantor",
    label: "Acara Kantor",
    line: "Cairkan suasana dan rekam momen bonding tim secara spontan di annual gathering.",
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
                <Link href={event.href} className={styles.cta}>
                  Pelajari paket {event.label.toLowerCase()}
                  <ArrowRight size={16} />
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
