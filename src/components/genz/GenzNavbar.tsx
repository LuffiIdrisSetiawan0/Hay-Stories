"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles, Camera, Heart, PartyPopper, Cake, Building2, QrCode, Film, HelpCircle, DollarSign, LogIn } from "lucide-react";
import styles from "./GenzNavbar.module.css";

const EVENT_CATEGORIES = [
  {
    href: "/pernikahan",
    label: "Pernikahan",
    desc: "Akad, resepsi & momen tak terduga tamu",
    icon: Heart,
    color: "#FF6B6B",
    tag: "Most Popular 💍",
  },
  {
    href: "/ulang-tahun",
    label: "Ulang Tahun",
    desc: "Tiup lilin, photobooth & pesta seru",
    icon: Cake,
    color: "#C084FC",
    tag: "Sweet 17 🎂",
  },
  {
    href: "/pesta",
    label: "Pesta & Nightout",
    desc: "Rooftop, afterparty & flash candid",
    icon: PartyPopper,
    color: "#FFE600",
    tag: "Flash Party 🎉",
  },
  {
    href: "/acara-kantor",
    label: "Acara Kantor",
    desc: "Gathering tim, gala dinner & outing",
    icon: Building2,
    color: "#60A5FA",
    tag: "Team Gathering 🏢",
  },
] as const;

const QUICK_LINKS = [
  { href: "/#cara-kerja", label: "Cara Kerja", icon: QrCode },
  { href: "/#preset", label: "Preset Film", icon: Film },
  { href: "/harga", label: "Daftar Harga", icon: DollarSign },
  { href: "/dev/film", label: "Simulasi Roll", icon: Sparkles },
  { href: "/#faq", label: "Pertanyaan (FAQ)", icon: HelpCircle },
] as const;

export default function GenzNavbar() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
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

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusable = drawer.querySelectorAll<HTMLElement>("a[href], button");
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
      {/* Backdrop overlay */}
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      <header className={styles.header}>
        {/* Floating Top Pill Bar */}
        <nav aria-label="Navigasi Utama" className={styles.bar}>
          {/* Animated Hamburger Menu Button */}
          <button
            ref={triggerRef}
            type="button"
            className={`${styles.menuBtn} ${open ? styles.menuBtnActive : ""}`}
            aria-expanded={open}
            aria-controls="genz-mega-drawer"
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
          <Link href="/v2" className={styles.brandLogo} onClick={close}>
            <span className={styles.logoDot} />
            HAY STORIES
          </Link>

          {/* Right Action Pills */}
          <div className={styles.rightActions}>
            <Link href="/" className={styles.versionBtn} title="Beralih ke Desain Classic">
              <span>✨ Classic (v1)</span>
            </Link>

            <Link href="/login" className={styles.ctaBtn} onClick={close}>
              <Camera size={14} />
              <span>Buat Album</span>
            </Link>
          </div>
        </nav>

        {/* Mega Pop Drawer (Collapsible) */}
        <div
          ref={drawerRef}
          id="genz-mega-drawer"
          className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}
          role="dialog"
          aria-modal={open}
          aria-label="Menu Lengkap HAY Stories"
        >
          <div className={styles.drawerInner}>
            <div className={styles.drawerContent}>
              {/* Section 1: Event Categories (4 Colorful Cards) */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <p className={styles.sectionTitle}>Pilih Jenis Acara</p>
                  <span className={styles.sectionPill}>Kamera Tamu Otentik</span>
                </div>

                <div className={styles.eventGrid}>
                  {EVENT_CATEGORIES.map((event, idx) => {
                    const IconComponent = event.icon;
                    return (
                      <Link
                        key={event.href}
                        href={event.href}
                        className={styles.eventCard}
                        style={{
                          "--accent": event.color,
                          "--stagger": `${idx * 45 + 50}ms`,
                        } as React.CSSProperties}
                        onClick={close}
                      >
                        <div className={styles.cardHeader}>
                          <div
                            className={styles.iconBox}
                            style={{ backgroundColor: event.color }}
                          >
                            <IconComponent size={20} />
                          </div>
                          <span className={styles.cardTag}>{event.tag}</span>
                        </div>

                        <div className={styles.cardInfo}>
                          <span className={styles.cardTitle}>
                            {event.label}
                            <ArrowUpRight size={16} className={styles.cardArrow} />
                          </span>
                          <span className={styles.cardDesc}>{event.desc}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Quick Links & Host Dashboard */}
              <div className={styles.sectionRow}>
                <div className={styles.quickLinksCol}>
                  <p className={styles.sectionTitle}>Jelajahi Fitur</p>
                  <div className={styles.quickLinksGrid}>
                    {QUICK_LINKS.map((link) => {
                      const IconComponent = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={styles.quickLinkItem}
                          onClick={close}
                        >
                          <IconComponent size={16} className={styles.quickIcon} />
                          <span>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.hostCard}>
                  <p className={styles.hostCardTitle}>Sudah punya acara?</p>
                  <p className={styles.hostCardSub}>Masuk ke dashboard untuk kelola QR code, live slideshow & download foto.</p>
                  <Link href="/login" className={styles.hostLoginBtn} onClick={close}>
                    <LogIn size={16} />
                    <span>Masuk Dashboard</span>
                  </Link>
                </div>
              </div>

              {/* Section 3: Drawer Footer */}
              <div className={styles.drawerFooter}>
                <p className={styles.footerBrand}>
                  HAY Stories · Digital Disposable Camera untuk Acara Spesial
                </p>
                <div className={styles.footerLinks}>
                  <a href="mailto:hello@haystories.id">hello@haystories.id</a>
                  <span>·</span>
                  <a
                    href="https://wa.me/6281234567890"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp Support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
