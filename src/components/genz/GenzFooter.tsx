"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./GenzFooter.module.css";

export default function GenzFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Top Banner Row */}
        <div className={styles.topRow}>
          <div className={styles.logoBox}>
            <span className={styles.popBrandLogo}>HAY Stories</span>
            <p className={styles.brandSub}>Digital Disposable Camera untuk Pernikahan, Pesta & Acara Spesial.</p>
          </div>

          <div className={styles.ctaBox}>
            <p className={styles.ctaHeading}>Siap Abadikan Acaramu?</p>
            <Link href="/login" className={styles.ctaBtn}>
              <span>Buat Album Sekarang</span>
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>

        {/* Links Grid */}
        <div className={styles.linksGrid}>
          <div className={styles.linkCol}>
            <h4>Tentang</h4>
            <ul>
              <li><Link href="/#cara-kerja">Cara Kerja</Link></li>
              <li><Link href="/#preset">Preset Film</Link></li>
              <li><Link href="/harga">Paket Harga</Link></li>
              <li><Link href="/kredit">Credits</Link></li>
            </ul>
          </div>

          <div className={styles.linkCol}>
            <h4>Fitur Unggulan</h4>
            <ul>
              <li><Link href="/#preset">Roll Golden Hour 400</Link></li>
              <li><Link href="/#preset">Roll Neon Night 1600</Link></li>
              <li><Link href="/#preset">Roll Pastel 400</Link></li>
              <li><Link href="/dev/film">Simulasi Roll Film</Link></li>
            </ul>
          </div>

          <div className={styles.linkCol}>
            <h4>Acara</h4>
            <ul>
              <li><Link href="/pernikahan">Pernikahan</Link></li>
              <li><Link href="/pesta">Pesta & Nightout</Link></li>
              <li><Link href="/ulang-tahun">Ulang Tahun</Link></li>
              <li><Link href="/acara-kantor">Acara Kantor</Link></li>
            </ul>
          </div>

          <div className={styles.linkCol}>
            <h4>Bantuan & Kontak</h4>
            <ul>
              <li><Link href="/#faq">FAQ</Link></li>
              <li><a href="mailto:hello@haystories.id">hello@haystories.id</a></li>
              <li><a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer">WhatsApp Support</a></li>
              <li><Link href="/login">Dashboard Tuan Rumah</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal Row */}
        <div className={styles.bottomRow}>
          <p>© {new Date().getFullYear()} HAY Stories. All Rights Reserved.</p>
          <div className={styles.legalLinks}>
            <Link href="/v2">Versi Gen-Z (v2)</Link>
            <span>·</span>
            <Link href="/">Versi Classic (v1)</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
