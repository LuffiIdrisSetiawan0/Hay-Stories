import Link from "next/link";
import { Phone, Mail } from "lucide-react";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      {/* Final CTA */}
      <section className={styles.finalCta}>
        <p className={styles.frameLabel}>HAY Stories 400 · frame 08 · fin → Enam roll · terungkap bersama</p>
        <h2 className={styles.finalTitle}>
          Satu acara. Satu album.
          <br />
          <span className={styles.finalTitleItalic}>Satu cerita.</span>
        </h2>
        <p className={styles.finalSubtitle}>
          Momen ini terlalu berharga untuk satu kamera.
        </p>
        <Link href="/login" className="btn btn-primary btn-lg">
          Mulai gratis
        </Link>
        <p className={styles.finalNote}>Gratis hingga 5 tamu, tanpa kartu kredit</p>
      </section>

      {/* Footer content */}
      <div className={styles.footerContent}>
        <div className={styles.footerGrid}>
          {/* Brand column */}
          <div className={styles.brandCol}>
            <div className={styles.footerLogo}>
              <span className={styles.logoText}>HAY Stories</span>
            </div>
            <p className={styles.tagline}>
              Hari yang terlalu indah untuk satu sudut pandang.
            </p>
            {/* Social */}
            <div className={styles.socials}>
              <a
                href="https://instagram.com/haystories"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialBtn}
                aria-label="Instagram"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://tiktok.com/@haystories"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialBtn}
                aria-label="TikTok"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </a>
            </div>
            {/* Contact */}
            <div className={styles.contact}>
              <p className={styles.contactLabel}>Kontak</p>
              <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                <Phone size={13} />
                +62 812-3456-7890
              </a>
              <a href="mailto:hello@haystories.id" className={styles.contactLink}>
                <Mail size={13} />
                hello@haystories.id
              </a>
            </div>
          </div>

          {/* Product */}
          <div className={styles.linkCol}>
            <p className={styles.colTitle}>Produk</p>
            <ul className={styles.linkList}>
              <li><Link href="#cara-kerja">Cara Kerja</Link></li>
              <li><Link href="#harga">Harga</Link></li>
              <li><Link href="#faq">FAQ</Link></li>
            </ul>
          </div>

          {/* For Events */}
          <div className={styles.linkCol}>
            <p className={styles.colTitle}>Untuk acara</p>
            <ul className={styles.linkList}>
              <li><Link href="/pernikahan">Pernikahan</Link></li>
              <li><Link href="/ulang-tahun">Ulang Tahun</Link></li>
              <li><Link href="/pesta">Pesta</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div className={styles.linkCol}>
            <p className={styles.colTitle}>Sumber</p>
            <ul className={styles.linkList}>
              <li><Link href="/login">Masuk</Link></li>
              <li><Link href="/privacy">Privasi</Link></li>
              <li><Link href="/terms">Syarat</Link></li>
            </ul>
          </div>
        </div>

        {/* Sprocket */}
        <div className="sprocket-row" style={{ marginTop: "2.5rem", opacity: 0.5 }} />

        {/* Bottom bar */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>© 2026 HAY Stories</p>
          <div className={styles.legalLinks}>
            <Link href="/privacy">Privasi</Link>
            <Link href="/terms">Syarat</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
