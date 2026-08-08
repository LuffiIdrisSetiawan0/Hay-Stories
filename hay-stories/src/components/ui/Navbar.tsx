"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import styles from "./Navbar.module.css";

interface NavbarProps {
  /**
   * Setel `true` hanya pada halaman yang diawali hero foto gelap. Nav lalu
   * memakai teks terang sampai pengguna scroll. Tanpa ini, defaultnya teks
   * gelap — yang benar untuk halaman berlatar krem seperti /harga.
   */
  overHero?: boolean;
}

export default function Navbar({ overHero = false }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll(); // muat halaman di posisi sudah ter-scroll
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={[styles.header, overHero ? styles.overHero : "", isScrolled ? styles.scrolled : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.container}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>✧</span>
            <span className={styles.logoText}>HAY Stories</span>
          </Link>

          {/* Desktop Links */}
          <nav className={styles.navLinks}>
            <Link href="#cara-kerja" className={styles.link}>Cara Kerja</Link>
            <Link href="#preset" className={styles.link}>Preset Film</Link>
            <Link href="#harga" className={styles.link}>Harga</Link>
          </nav>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/login" className={styles.loginBtn}>Host Login</Link>
            <button 
              className={styles.mobileMenuBtn}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.mobileMenuOpen : ""}`}>
        <nav className={styles.mobileNavLinks}>
          <Link href="#cara-kerja" className={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>Cara Kerja</Link>
          <Link href="#preset" className={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>Preset Film</Link>
          <Link href="#harga" className={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>Harga</Link>
          <Link href="/login" className={styles.mobileLoginBtn} onClick={() => setIsMobileMenuOpen(false)}>Host Login</Link>
        </nav>
      </div>
    </>
  );
}
