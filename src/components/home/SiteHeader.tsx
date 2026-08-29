"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./SiteHeader.module.css";

const NAV = [
  { label: "Cara Kerja", href: "/#cara-kerja" },
  { label: "Jenis Acara", href: "/#acara" },
  { label: "Fitur", href: "/#fitur" },
  { label: "Harga", href: "/harga" },
] as const;

const MENU = [
  { label: "Beranda", href: "/" },
  { label: "Cara Kerja", href: "/#cara-kerja" },
  { label: "Jenis Acara", href: "/#acara" },
  { label: "Fitur", href: "/#fitur" },
  { label: "Buku Tamu Suara", href: "/guestbook" },
  { label: "Harga", href: "/harga" },
  { label: "Pertanyaan", href: "/#tanya" },
  { label: "Masuk", href: "/login" },
] as const;

/**
 * Kepala halaman.
 *
 * Mengambang tanpa latar di puncak halaman supaya foto hero terlihat utuh,
 * lalu memakai latar krem begitu halaman digulir — ambang 24px, bukan 0,
 * supaya guliran satu-dua piksel tidak membuatnya berkedip.
 *
 * Menu layar kecil dibuka penuh satu layar. Fokus dikurung di dalamnya selama
 * terbuka: tanpa itu, Tab akan berjalan ke tautan di balik lapisan yang sedang
 * menutupi layar.
 */
export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>("a[href], button");
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.headerSolid : ""}`}>
        <div className={styles.bar}>
          <Link href="/" className={styles.wordmark} onClick={close}>
            <span>Hay</span>
            <span>
              Stories<i className={styles.dot} aria-hidden="true" />
            </span>
          </Link>

          {/* Semuanya selain logo dikelompokkan di kanan, mengikuti susunan pada
              referensi: tautan menu dan tombol berdampingan, bukan menu di
              tengah lalu tombol terpisah jauh di ujung. */}
          <div className={styles.right}>
            <nav className={styles.nav} aria-label="Navigasi utama">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className={styles.navLink}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <Link href="/dashboard/new" className={styles.cta}>
              Buat Album
            </Link>

            <button
              ref={triggerRef}
              type="button"
              className={`${styles.burger} ${open ? styles.burgerOpen : ""}`}
              aria-expanded={open}
              aria-controls="menu-utama"
              aria-label={open ? "Tutup menu" : "Buka menu"}
              onClick={() => setOpen((prev) => !prev)}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div
        id="menu-utama"
        ref={panelRef}
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
        aria-hidden={!open}
        inert={!open}
      >
        <nav className={styles.panelNav} aria-label="Menu">
          {MENU.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.panelLink}
              style={{ transitionDelay: `${open ? 120 + i * 45 : 0}ms` }}
              onClick={close}
            >
              <span className={styles.panelIndex}>{String(i + 1).padStart(2, "0")}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <p className={styles.panelNote} style={{ transitionDelay: open ? "500ms" : "0ms" }}>
          Satu QR untuk seluruh tamu. Tanpa aplikasi, tanpa akun.
        </p>
      </div>
    </>
  );
}
