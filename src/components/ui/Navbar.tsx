"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./Navbar.module.css";

const SERVICE_ITEMS = [
  {
    index: "01",
    title: "Roll Film Analog",
    desc: "6 look warna terkalibrasi langsung di kamera browser tanpa aplikasi.",
    href: "/#preset",
  },
  {
    index: "02",
    title: "Kamera Tamu QR",
    desc: "Tamu cukup scan QR di meja/undangan, langsung jepret tanpa download apa pun.",
    href: "/#cara-kerja",
  },
  {
    index: "03",
    title: "Galeri Satu Tautan",
    desc: "Foto yang berhasil disimpan terkumpul di satu galeri acara berbasis tautan.",
    href: "/#kenapa",
  },
  {
    index: "04",
    title: "Bingkai & Unduhan",
    desc: "Pilih bingkai saat memotret lalu unduh tiap foto pada resolusi hasilnya.",
    href: "/harga",
  },
] as const;

const EXPLORE_ITEMS = [
  { label: "Pernikahan 💍", href: "/pernikahan" },
  { label: "Ulang Tahun 🎂", href: "/ulang-tahun" },
  { label: "Pesta & Nightout 🎉", href: "/pesta" },
  { label: "Acara Kantor 🏢", href: "/acara-kantor" },
  { label: "Cara Kerja", href: "/#cara-kerja" },
  { label: "Preset Film", href: "/#preset" },
  { label: "Daftar Harga", href: "/harga" },
  { label: "Simulasi Roll", href: "/dev/film" },
  { label: "Pertanyaan (FAQ)", href: "/#faq" },
  { label: "Masuk / Buat Album", href: "/login" },
] as const;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const capsuleRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on Escape & trap focus when open
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key !== "Tab") return;

      const capsule = capsuleRef.current;
      if (!capsule) return;

      const focusable = capsule.querySelectorAll<HTMLElement>("a[href], button");
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      {/* Dim backdrop when mega-menu is open */}
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      <header className={styles.header}>
        {/* Floating Morphing Capsule Menu (Y-Vision Exact Shape) */}
        <div
          ref={capsuleRef}
          className={`${styles.capsule} ${open ? styles.capsuleOpen : ""}`}
          role="dialog"
          aria-modal={open}
          aria-label="Menu Utama"
        >
          {/* Top Capsule Bar */}
          <div className={styles.bar}>
            {/* Animated Hamburger / Close Button */}
            <button
              ref={triggerRef}
              type="button"
              className={`${styles.menuBtn} ${open ? styles.menuBtnActive : ""}`}
              aria-expanded={open}
              aria-controls="mega-menu-content"
              onClick={() => setOpen((prev) => !prev)}
            >
              <div className={styles.iconWrapper} aria-hidden="true">
                <span className={`${styles.line} ${styles.line1}`} />
                <span className={`${styles.line} ${styles.line2}`} />
                <span className={`${styles.line} ${styles.line3}`} />
              </div>
              <span className={styles.menuLabel}>{open ? "Tutup" : "Menu"}</span>
            </button>

            {/* Centered Brand Logo */}
            <Link href="/" className={styles.wordmark} onClick={close}>
              HAY STORIES
            </Link>

            {/* Pill Action Button */}
            <Link href="/login" className={styles.ctaBtn} onClick={close}>
              Buat album
            </Link>
          </div>

          {/* Collapsible Mega Menu Drawer */}
          <div
            id="mega-menu-content"
            className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}
            aria-hidden={!open}
            inert={!open}
          >
            <div className={styles.drawerInner}>
              <div className={styles.menuContent}>
                {/* Section 1: Fitur & Roll Film */}
                <nav aria-label="Fitur & Layanan">
                  <p className={styles.sectionHeading}>Fitur & Layanan</p>
                  <ul className={styles.serviceGrid}>
                    {SERVICE_ITEMS.map((item, idx) => (
                      <li
                        key={item.index}
                        className={styles.serviceItem}
                        style={{ "--stagger": `${idx * 45 + 80}ms` } as React.CSSProperties}
                      >
                        <Link
                          href={item.href}
                          className={styles.serviceLink}
                          onClick={close}
                        >
                          <span className={styles.serviceIndex}>{item.index}</span>
                          <div className={styles.serviceInfo}>
                            <span className={styles.serviceTitle}>
                              {item.title}
                              <ArrowUpRight size={17} className={styles.arrowIcon} />
                            </span>
                            <span className={styles.serviceDesc}>{item.desc}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                {/* Section 2: Jelajahi */}
                <nav aria-label="Jelajahi" className={styles.exploreNav}>
                  <p className={styles.sectionHeading}>Jelajahi Acara & Menu</p>
                  <ul className={styles.exploreList}>
                    {EXPLORE_ITEMS.map((link, idx) => (
                      <li
                        key={link.label}
                        className={styles.exploreItem}
                        style={{ "--stagger": `${idx * 35 + 240}ms` } as React.CSSProperties}
                      >
                        <Link
                          href={link.href}
                          className={styles.exploreLink}
                          onClick={close}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                {/* Section 3: Footer bar info */}
                <div className={styles.menuFooter}>
                  <p className={styles.footerBrand}>
                    HAY Stories · Digital Disposable Camera untuk Acara Spesial
                  </p>
                  <div className={styles.footerLinks}>
                    <a href="mailto:hello@haystories.id">hello@haystories.id</a>
                    <span aria-hidden="true" className={styles.dot}>·</span>
                    <a
                      href="https://wa.me/6281234567890"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
