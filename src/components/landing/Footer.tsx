import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/site";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={`${styles.footer} surface-dark`}>
      <div className="container">
        <Link href="/dashboard/new" className={styles.cta}>
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
              Kamera tamu digital untuk pernikahan, pesta, dan acara spesial.
            </p>
            {SUPPORT_EMAIL && (
              <p className={styles.contact}>
                <a href={supportMailto()}>{SUPPORT_EMAIL}</a>
              </p>
            )}
          </div>

          <div className={styles.linkCol}>
            <p className={styles.colTitle}>Fitur</p>
            <ul>
              <li><Link href="/#cara-kerja">Cara Kerja</Link></li>
              <li><Link href="/guestbook">Voice Guestbook</Link></li>
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
              <li><Link href="/privasi">Kebijakan Privasi</Link></li>
              <li><Link href="/syarat">Syarat Penggunaan</Link></li>
              <li><Link href="/kredit">Kredit &amp; Lisensi</Link></li>
            </ul>
          </div>
        </div>

        <p className={styles.copyright}>© {new Date().getFullYear()} HAY Stories. Hak cipta dilindungi.</p>
      </div>
    </footer>
  );
}
