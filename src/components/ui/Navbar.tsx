"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowUpRight } from "lucide-react";
import styles from "./Navbar.module.css";

interface NavbarProps {
  /**
   * Setel `true` hanya pada halaman yang diawali hero gelap. Bilahnya lalu
   * mulai transparan dengan teks terang, dan baru memasang latar sendiri
   * setelah pengguna menggulir. Tanpa ini, defaultnya bilah terang — yang benar
   * untuk halaman berlatar krem seperti /harga.
   */
  overHero?: boolean;
}

/** Pintu masuk per jenis acara — cerminan seksi acara di beranda. */
const EVENT_LINKS = [
  { href: "/pernikahan", label: "Pernikahan", line: "Akad dan resepsi" },
  { href: "/ulang-tahun", label: "Ulang Tahun", line: "Tiup lilin sampai tawa terakhir" },
  { href: "/pesta", label: "Pesta", line: "Malam panjang, lampu warna" },
  { href: "/acara-kantor", label: "Acara Kantor", line: "Gathering dan perayaan tim" },
] as const;

const EXPLORE_LINKS = [
  { href: "/#cara-kerja", label: "Cara Kerja" },
  { href: "/#preset", label: "Preset Film" },
  { href: "/#harga", label: "Harga" },
  { href: "/#faq", label: "FAQ" },
] as const;

export default function Navbar({ overHero = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll(); // halaman bisa dimuat dalam keadaan sudah ter-scroll
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    // Tanpa ini halaman di belakang overlay ikut tergulir saat orang menggulir
    // di dalam menu, dan menutup menu meninggalkan mereka di tempat lain.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      /*
       * Kurung fokus di dalam menu. `aria-modal="true"` menjanjikan ke pembaca
       * layar bahwa sisa halaman tidak ada; tanpa pengurungan ini, menekan Tab
       * beberapa kali tetap membawa fokus ke tautan halaman di belakang overlay
       * — terlihat "hilang" karena yang sedang fokus tertutup panel.
       *
       * Tombol pemicunya ikut masuk lingkaran: saat menu terbuka ia berubah
       * jadi tombol Tutup, dan itu satu-satunya jalan keluar selain Escape.
       */
      const panel = panelRef.current;
      const trigger = triggerRef.current;
      if (!panel || !trigger) return;

      const stops = [trigger, ...panel.querySelectorAll<HTMLElement>("a[href], button")];
      const first = stops[0];
      const last = stops[stops.length - 1];
      const current = document.activeElement;

      // Fokus masih di panel itu sendiri (belum pindah ke tautan mana pun)
      // dihitung sebagai "sebelum yang pertama".
      if (event.shiftKey && (current === first || current === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // Fokus dipindahkan ke dalam panel, kalau tidak pengguna keyboard menekan
    // Tab dan mendarat di tautan halaman yang sedang tertutup overlay.
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    // Kembalikan fokus ke tombol pembukanya — itu tempat pengguna keyboard
    // meninggalkannya, dan tempat mereka harapkan fokus kembali.
    triggerRef.current?.focus();
  };

  return (
    <>
      <header
        className={[
          styles.header,
          overHero ? styles.overHero : "",
          scrolled ? styles.scrolled : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.bar}>
          <button
            ref={triggerRef}
            type="button"
            className={styles.menuBtn}
            aria-expanded={open}
            onClick={() => (open ? close() : setOpen(true))}
          >
            {open ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
            <span>{open ? "Tutup" : "Menu"}</span>
          </button>

          <Link href="/" className={styles.wordmark}>
            HAY Stories
          </Link>

          <Link href="/login" className={styles.cta}>
            Buat album
          </Link>
        </div>
      </header>

      {/*
        Panelnya selalu ada di DOM supaya transisi keluarnya bisa berjalan.
        Yang mencabutnya dari urutan tab dan dari pembaca layar saat tertutup
        adalah `visibility: hidden` di CSS — bukan `aria-hidden` sendirian, yang
        akan menyembunyikannya dari pembaca layar tapi tetap membiarkan
        tautannya bisa di-Tab.
      */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Menu utama"
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
      >
        <nav className={styles.panelInner}>
          <p className={styles.groupLabel}>Untuk acara</p>
          <ul className={styles.eventList}>
            {EVENT_LINKS.map((link, i) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.eventLink} onClick={close}>
                  <span className={styles.eventIndex}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.eventBody}>
                    <span className={styles.eventLabel}>
                      {link.label}
                      <ArrowUpRight size={18} className={styles.eventArrow} />
                    </span>
                    <span className={styles.eventLine}>{link.line}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className={styles.groupLabel}>Jelajahi</p>
          <ul className={styles.exploreList}>
            {EXPLORE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.exploreLink} onClick={close}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className={styles.panelFoot}>
            <a href="mailto:hello@haystories.id">hello@haystories.id</a>
            <span aria-hidden="true"> · </span>
            <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer">
              +62 812-3456-7890
            </a>
          </p>
        </nav>
      </div>
    </>
  );
}
