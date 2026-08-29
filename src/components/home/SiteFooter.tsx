import Link from "next/link";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/site";
import styles from "./SiteFooter.module.css";

const COLUMNS = [
  {
    title: "Produk",
    links: [
      { label: "Cara kerja", href: "/#cara-kerja" },
      { label: "Fitur", href: "/#fitur" },
      { label: "Buku tamu suara", href: "/guestbook" },
      { label: "Harga", href: "/harga" },
    ],
  },
  {
    title: "Jenis acara",
    links: [
      { label: "Pernikahan", href: "/pernikahan" },
      { label: "Ulang tahun", href: "/ulang-tahun" },
      { label: "Pesta & nightout", href: "/pesta" },
      { label: "Acara kantor", href: "/acara-kantor" },
    ],
  },
  {
    title: "Bantuan",
    links: [
      { label: "Pertanyaan umum", href: "/#tanya" },
      { label: "Masuk sebagai tuan rumah", href: "/login" },
      { label: "Masuk sebagai tamu", href: "/a" },
      { label: "Kredit & lisensi", href: "/kredit" },
    ],
  },
] as const;

/**
 * Kaki halaman.
 *
 * Satu-satunya blok gelap kedua di situs, sengaja dipakai sebagai penutup agar
 * halaman punya ujung yang jelas. Nama merek dibuat sangat besar supaya baris
 * terakhir terasa seperti tanda tangan, bukan sekadar daftar tautan.
 */
export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <span className={styles.glow} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link href="/" className={styles.wordmark}>
              <span>Hay</span>
              <span>
                Stories<i className={styles.dot} aria-hidden="true" />
              </span>
            </Link>
            <p className={styles.tagline}>
              Kamera tamu digital untuk pernikahan, ulang tahun, pesta, dan acara kantor.
              Satu QR, satu album, semua sudut pandang.
            </p>
          </div>

          <div className={styles.columns}>
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className={styles.columnTitle}>{column.title}</p>
                <ul className={styles.columnList}>
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={styles.link}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {SUPPORT_EMAIL && (
          <div className={styles.contact}>
            <p className={styles.contactLabel}>Ada pertanyaan?</p>
            <a href={supportMailto()} className={styles.contactMail}>
              {SUPPORT_EMAIL}
            </a>
          </div>
        )}

        <div className={styles.bottom}>
          <p>&copy; {year} HAY Stories. Hak cipta dilindungi.</p>
          <div className={styles.legal}>
            <Link href="/privasi">Kebijakan privasi</Link>
            <span aria-hidden="true">·</span>
            <Link href="/syarat">Syarat penggunaan</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
