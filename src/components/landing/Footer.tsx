import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./Footer.module.css";

/**
 * Footer: satu ajakan besar, lalu keterangan, lalu wordmark raksasa.
 *
 * Seluruh blok ajakannya satu tautan — bukan judul dengan tombol kecil di
 * bawahnya. Targetnya jadi sebesar layar, dan panah di sebelah kanannya cukup
 * jadi penanda arah, bukan satu-satunya yang bisa ditekan.
 */
export default function Footer() {
  return (
    <footer className={`${styles.footer} surface-dark`}>
      <div className="container">
        <Link href="/login" className={styles.cta}>
          <h2 className={styles.ctaTitle}>
            Satu acara. Satu album.
            <br />
            <span className={styles.ctaAccent}>Satu cerita.</span>
          </h2>

          {/*
            Dua panah menempati satu tempat: yang pertama meluncur keluar ke
            kanan saat disentuh kursor, yang kedua masuk dari kiri
            menggantikannya. Satu panah yang cuma bergeser terasa seperti
            tersenggol; dua panah yang bergantian terasa seperti maju.
          */}
          <span className={styles.arrowBox} aria-hidden="true">
            <ArrowRight className={styles.arrowOut} strokeWidth={1.25} />
            <ArrowRight className={styles.arrowIn} strokeWidth={1.25} />
          </span>
        </Link>

        <p className={styles.ctaNote}>
          Gratis hingga 5 tamu, tanpa kartu kredit.
        </p>

        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <p className={styles.brandName}>HAY Stories</p>
            <p className={styles.tagline}>
              Hari yang terlalu indah untuk satu sudut pandang.
            </p>
            <p className={styles.contact}>
              <a href="mailto:hello@haystories.id">hello@haystories.id</a>
              <br />
              <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer">
                +62 812-3456-7890
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
            <p className={styles.colTitle}>Produk</p>
            <ul>
              <li><Link href="/#cara-kerja">Cara Kerja</Link></li>
              <li><Link href="/#preset">Preset Film</Link></li>
              <li><Link href="/#harga">Harga</Link></li>
              <li><Link href="/#faq">FAQ</Link></li>
            </ul>
          </div>

          <div className={styles.linkCol}>
            <p className={styles.colTitle}>Untuk acara</p>
            <ul>
              <li><Link href="/pernikahan">Pernikahan</Link></li>
              <li><Link href="/ulang-tahun">Ulang Tahun</Link></li>
              <li><Link href="/pesta">Pesta</Link></li>
              <li><Link href="/acara-kantor">Acara Kantor</Link></li>
            </ul>
          </div>

          <div className={styles.linkCol}>
            <p className={styles.colTitle}>Lainnya</p>
            <ul>
              <li><Link href="/login">Masuk</Link></li>
              <li><Link href="/privacy">Privasi</Link></li>
              <li><Link href="/terms">Syarat</Link></li>
              {/* Wajib, bukan hiasan: LUT film kami turunan karya CC BY-SA yang
                  mensyaratkan atribusi terlihat publik. Jangan dihapus. */}
              <li><Link href="/kredit">Kredit</Link></li>
            </ul>
          </div>
        </div>

        <p className={styles.copyright}>© 2026 HAY Stories</p>
      </div>

      {/* Wordmark raksasa sebagai penutup halaman. Murni tipografi — teksnya
          sudah dibacakan di kolom brand di atas, jadi salinan ini disembunyikan
          dari pembaca layar. */}
      <p className={styles.bigMark} aria-hidden="true">
        HAY Stories
      </p>
    </footer>
  );
}
