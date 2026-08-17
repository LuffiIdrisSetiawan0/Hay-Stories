import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={`${styles.footer} surface-dark`}>
      <div className="container">
        <Link href="/login" className={styles.cta}>
          <h2 className={styles.ctaTitle}>
            Satu Acara. Satu Album.
            <br />
            <span className={styles.ctaAccent}>Semua Cerita.</span>
          </h2>

          <span className={styles.arrowBox} aria-hidden="true">
            <ArrowRight className={styles.arrowOut} strokeWidth={1.25} />
            <ArrowRight className={styles.arrowIn} strokeWidth={1.25} />
          </span>
        </Link>

        <p className={styles.ctaNote}>
          Mulai gratis hingga 5 tamu, tanpa perlu kartu kredit.
        </p>

        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <p className={styles.brandName}>HAY Stories</p>
            <p className={styles.tagline}>
              Digital Disposable Camera untuk Pernikahan, Pesta & Acara Spesial.
            </p>
            <p className={styles.contact}>
              <a href="mailto:hello@haystories.id">hello@haystories.id</a>
              <br />
              <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer">
                WhatsApp: +62 812-3456-7890
              </a>
            </p>
            <p className={styles.socials}>
              <a
                href="https://instagram.com/haystories"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
              <a href="https://tiktok.com/@haystories" target="_blank" rel="noopener noreferrer">
                TikTok
              </a>
            </p>
          </div>

          <div className={styles.linkCol}>
            <p className={styles.colTitle}>Fitur</p>
            <ul>
              <li><Link href="/#cara-kerja">Cara Kerja</Link></li>
              <li><Link href="/#preset">Preset Film</Link></li>
              <li><Link href="/harga">Paket Harga</Link></li>
            </ul>
          </div>

          <div className={styles.linkCol}>
            <p className={styles.colTitle}>Jenis Acara</p>
            <ul>
              <li><Link href="/pernikahan">Pernikahan</Link></li>
              <li><Link href="/ulang-tahun">Ulang Tahun</Link></li>
              <li><Link href="/pesta">Pesta & Nightout</Link></li>
              <li><Link href="/acara-kantor">Acara Kantor</Link></li>
            </ul>
          </div>

          <div className={styles.linkCol}>
            <p className={styles.colTitle}>Bantuan</p>
            <ul>
              <li><Link href="/#faq">FAQ</Link></li>
              <li><Link href="/login">Dashboard Tuan Rumah</Link></li>
              <li>
                <a href="mailto:hello@haystories.id?subject=Pertanyaan%20privasi%20dan%20data">
                  Privasi &amp; data
                </a>
              </li>
              <li><Link href="/kredit">Kredit & Lisensi</Link></li>
            </ul>
          </div>
        </div>

        <p className={styles.copyright}>© {new Date().getFullYear()} HAY Stories. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
