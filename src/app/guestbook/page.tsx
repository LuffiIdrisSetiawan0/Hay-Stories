import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Check,
  Headphones,
  LockKeyhole,
  Mic,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import styles from "./Guestbook.module.css";

const WAVEFORM = [
  28, 52, 38, 72, 46, 84, 58, 34, 66, 92, 54, 76, 44, 62, 86, 48, 70, 36,
  56, 30,
] as const;

const BENEFITS = [
  {
    icon: AudioLines,
    title: "Lebih hidup dari teks",
    description:
      "Dengar kembali tawa, jeda, dan intonasi orang-orang terdekat—detail kecil yang membuat sebuah ucapan terasa personal.",
  },
  {
    icon: Smartphone,
    title: "Mudah untuk setiap tamu",
    description:
      "Tamu membuka tautan acara dari ponsel, lalu meninggalkan ucapan suara langsung dari browser tanpa memasang aplikasi.",
  },
  {
    icon: LockKeyhole,
    title: "Privat untuk tuan rumah",
    description:
      "Setiap rekaman tersimpan sebagai kenangan privat. Hanya host album yang dapat mengakses dan mendengarkannya.",
  },
] as const;

const STEPS = [
  {
    number: "01",
    icon: QrCode,
    title: "Bagikan album acara",
    description:
      "Tampilkan QR atau kirim tautan HAY Stories yang sama kepada seluruh tamu.",
  },
  {
    number: "02",
    icon: Mic,
    title: "Tamu merekam ucapan",
    description:
      "Mereka masuk dari ponsel, menyebutkan nama, lalu merekam pesan suara maksimal 20 detik.",
  },
  {
    number: "03",
    icon: Headphones,
    title: "Host mendengar kembali",
    description:
      "Ucapan terkumpul rapi dan hanya dapat diputar dari area privat milik tuan rumah.",
  },
] as const;

export const metadata: Metadata = {
  title: "Voice Guestbook",
  description:
    "Kumpulkan ucapan suara personal dari tamu langsung melalui browser. Voice Guestbook HAY Stories tersimpan privat dan hanya dapat didengar oleh host album.",
  alternates: { canonical: "/guestbook" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "HAY Stories",
    title: "Voice Guestbook • HAY Stories",
    description:
      "Simpan tawa, doa, dan cerita dari tamu dalam rekaman suara privat untuk tuan rumah.",
    url: "/guestbook",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Voice Guestbook • HAY Stories",
    description:
      "Simpan tawa, doa, dan cerita dari tamu dalam rekaman suara privat untuk tuan rumah.",
    images: ["/opengraph-image.png"],
  },
};

export default function GuestbookPage() {
  return (
    <main className={styles.page}>
      <SiteHeader />

      <section className={styles.hero} aria-labelledby="guestbook-title">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={`${styles.container} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              Voice Guestbook
            </p>
            <h1 id="guestbook-title" className={styles.heroTitle}>
              Suara mereka,
              <span> tetap terasa.</span>
            </h1>
            <p className={styles.heroLead}>
              Foto menangkap momennya. Voice Guestbook menyimpan suara di baliknya—
              tawa, doa, dan pesan hangat dari orang-orang yang hadir di hari istimewamu.
            </p>

            <div className={styles.heroActions}>
              <Link href="/dashboard/new" className={styles.primaryCta}>
                Buat album gratis
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="#cara-kerja" className={styles.secondaryCta}>
                Lihat cara kerja
              </Link>
            </div>

            <p className={styles.privacyNote}>
              <ShieldCheck size={18} aria-hidden="true" />
              Rekaman tidak tampil di galeri tamu dan hanya dapat didengar oleh host.
            </p>
          </div>

          <div
            className={styles.heroVisual}
            role="img"
            aria-label="Ilustrasi tamu merekam ucapan suara privat melalui HAY Stories"
          >
            <span className={`${styles.orbit} ${styles.orbitOne}`} aria-hidden="true" />
            <span className={`${styles.orbit} ${styles.orbitTwo}`} aria-hidden="true" />

            <div className={styles.recorderCard}>
              <div className={styles.recorderTopbar}>
                <div className={styles.recorderBrand}>
                  <span className={styles.statusLight} aria-hidden="true" />
                  HAY VOICE
                </div>
                <span className={styles.privatePill}>
                  <LockKeyhole size={12} aria-hidden="true" />
                  Privat
                </span>
              </div>

              <div className={styles.recorderMessage}>
                <span className={styles.toLabel}>UCAPAN UNTUK</span>
                <strong>Raka &amp; Naya</strong>
                <span>dari Dinda</span>
              </div>

              <div className={styles.waveStage} aria-hidden="true">
                <div className={styles.waveform}>
                  {WAVEFORM.map((height, index) => (
                    <span
                      key={`${height}-${index}`}
                      className={styles.waveBar}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
                <span className={styles.waveCursor} />
              </div>

              <div className={styles.recorderMeta}>
                <span>00:12</span>
                <span>Maksimal 20 detik</span>
              </div>

              <div className={styles.recordControl} aria-hidden="true">
                <span className={styles.recordHalo} />
                <span className={styles.recordButton}>
                  <Mic size={25} strokeWidth={1.8} />
                </span>
              </div>

              <div className={styles.recorderFooter}>
                <LockKeyhole size={15} aria-hidden="true" />
                <span>Hanya host album yang dapat mendengar rekaman ini</span>
              </div>
            </div>

            <div className={`${styles.floatingTag} ${styles.scanTag}`}>
              <QrCode size={17} aria-hidden="true" />
              Scan. Rekam. Kirim.
            </div>
            <div className={`${styles.floatingTag} ${styles.memoryTag}`}>
              <AudioLines size={17} aria-hidden="true" />
              Satu suara baru
            </div>
          </div>
        </div>
      </section>

      <section className={styles.benefitsSection} aria-labelledby="benefits-title">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>KENANGAN YANG BISA DIDENGAR</p>
            <h2 id="benefits-title" className={styles.sectionTitle}>
              Hadirkan kembali orang-orangnya, bukan hanya momennya.
            </h2>
            <p className={styles.sectionLead}>
              Satu ruang sederhana untuk mengumpulkan suara yang biasanya hilang ketika
              acara selesai.
            </p>
          </div>

          <div className={styles.benefitsGrid}>
            {BENEFITS.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <article key={benefit.title} className={styles.benefitCard}>
                  <div className={styles.cardTopline}>
                    <span className={styles.benefitIcon} aria-hidden="true">
                      <Icon size={22} strokeWidth={1.7} />
                    </span>
                    <span className={styles.cardIndex}>0{index + 1}</span>
                  </div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="cara-kerja"
        className={styles.stepsSection}
        aria-labelledby="steps-title"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>TIGA LANGKAH RINGAN</p>
            <h2 id="steps-title" className={styles.sectionTitle}>
              Tidak perlu booth. Tidak perlu aplikasi.
            </h2>
            <p className={styles.sectionLead}>
              Tamu cukup memakai ponsel mereka sendiri, sementara semua ucapan terkumpul
              untukmu.
            </p>
          </div>

          <ol className={styles.stepsGrid}>
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <li key={step.number} className={styles.stepCard}>
                  <div className={styles.stepHead}>
                    <span className={styles.stepNumber}>{step.number}</span>
                    <span className={styles.stepIcon} aria-hidden="true">
                      <Icon size={21} strokeWidth={1.7} />
                    </span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className={`${styles.privacySection} surface-dark`} aria-labelledby="privacy-title">
        <div className={`${styles.container} ${styles.privacyGrid}`}>
          <div className={styles.privacyCopy}>
            <p className={styles.sectionEyebrow}>PRIVASI SEJAK AWAL</p>
            <h2 id="privacy-title" className={styles.privacyTitle}>
              Pesan dari tamu,
              <span> khusus untukmu.</span>
            </h2>
            <p className={styles.privacyLead}>
              Voice Guestbook dirancang sebagai ruang personal. Rekaman suara tidak ikut
              muncul di galeri publik acara dan akses dengarnya tetap berada di tangan host.
            </p>

            <ul className={styles.privacyList}>
              <li>
                <Check size={17} aria-hidden="true" />
                Hanya akun host album yang dapat mengakses rekaman
              </li>
              <li>
                <Check size={17} aria-hidden="true" />
                Ucapan suara tidak ditampilkan kepada tamu lain
              </li>
              <li>
                <Check size={17} aria-hidden="true" />
                Semua pesan tersusun rapi di area pengelolaan album
              </li>
            </ul>
          </div>

          <div className={styles.vaultVisual} aria-hidden="true">
            <div className={styles.vaultGlow} />
            <div className={styles.vaultCard}>
              <div className={styles.vaultHeader}>
                <span>VOICE INBOX</span>
                <span className={styles.hostBadge}>
                  <ShieldCheck size={13} /> HOST ONLY
                </span>
              </div>

              <div className={styles.voiceRows}>
                {[
                  ["Dinda", "00:12", "76%"],
                  ["Bimo & Sari", "00:18", "48%"],
                  ["Mama", "00:09", "63%"],
                ].map(([name, duration, width], index) => (
                  <div key={name} className={styles.voiceRow}>
                    <span className={styles.playCircle}>
                      <span />
                    </span>
                    <div className={styles.voiceInfo}>
                      <strong>{name}</strong>
                      <span className={styles.miniTrack}>
                        <span style={{ width }} />
                      </span>
                    </div>
                    <span className={styles.duration}>{duration}</span>
                    {index === 0 && <span className={styles.newDot} />}
                  </div>
                ))}
              </div>

              <div className={styles.vaultLock}>
                <LockKeyhole size={16} />
                Dilindungi untuk host album
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.closingSection} aria-labelledby="closing-title">
        <div className={styles.container}>
          <div className={styles.closingCard}>
            <div>
              <p className={styles.sectionEyebrow}>CERITA DALAM SUARA</p>
              <h2 id="closing-title">Beri tamu ruang untuk mengatakan lebih banyak.</h2>
              <p>
                Buat album HAY Stories dan mulai kumpulkan foto serta ucapan suara dari satu
                momen yang sama.
              </p>
            </div>
            <Link href="/dashboard/new" className={styles.closingCta}>
              Buat album gratis
              <ArrowRight size={19} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
