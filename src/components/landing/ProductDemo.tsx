import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  Clock3,
  Images,
  LockKeyhole,
  QrCode,
} from "lucide-react";
import styles from "./ProductDemo.module.css";

const FLOW = [
  {
    number: "01",
    title: "Host menyiapkan album",
    description: "Beri nama acara, pilih cara reveal, lalu album siap dibagikan.",
  },
  {
    number: "02",
    title: "Tamu scan dan memotret",
    description: "Cukup isi nama panggilan. Tidak perlu akun atau unduh aplikasi.",
  },
  {
    number: "03",
    title: "Semua sudut terbuka",
    description: "Foto terkumpul di satu galeri dan dapat dibuka bersama setelah acara.",
  },
] as const;

export default function ProductDemo() {
  return (
    <section id="pengalaman" className={`${styles.section} surface-dark`}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Lihat produknya bekerja</p>
            <h2 className={styles.title}>Dari satu QR menjadi banyak cerita.</h2>
          </div>
          <p className={styles.lede}>
            Alurnya sengaja singkat untuk tamu, sementara host tetap memegang kendali atas
            akses, waktu reveal, dan galeri.
          </p>
        </div>

        <ol className={styles.flow}>
          <li className={styles.flowItem}>
            <article className={styles.demoCard}>
              <div className={styles.cardCopy}>
                <span className={styles.number}>{FLOW[0].number}</span>
                <h3>{FLOW[0].title}</h3>
                <p>{FLOW[0].description}</p>
              </div>

              <div className={styles.hostUi} aria-label="Contoh formulir pembuatan album">
                <div className={styles.uiTopbar}>
                  <span>Album baru</span>
                  <span className={styles.statusDot}>Draf</span>
                </div>
                <div className={styles.formGroup}>
                  <span className={styles.uiLabel}>Nama acara</span>
                  <strong>Pernikahan Nara &amp; Bima</strong>
                </div>
                <div className={styles.uiChoices}>
                  <span className={styles.choiceActive}>
                    <Clock3 size={13} /> Buka bersama
                  </span>
                  <span>Langsung terlihat</span>
                </div>
                <div className={styles.uiSubmit}>
                  <Check size={14} /> Album siap dibagikan
                </div>
              </div>
            </article>
          </li>

          <li className={styles.flowItem}>
            <article className={`${styles.demoCard} ${styles.guestCard}`}>
              <div className={styles.cardCopy}>
                <span className={styles.number}>{FLOW[1].number}</span>
                <h3>{FLOW[1].title}</h3>
                <p>{FLOW[1].description}</p>
              </div>

              <div className={styles.guestStage}>
                <div className={styles.qrCard} aria-hidden="true">
                  <QrCode size={44} strokeWidth={1.35} />
                  <span>SCAN TO CAPTURE</span>
                </div>
                <div className={styles.phone}>
                  <div className={styles.phoneTop}>
                    <span>HAY STORIES</span>
                    <span>•••</span>
                  </div>
                  <div className={styles.cameraPreview}>
                    <Image
                      src="/img/scenes/03-kue-v2.webp"
                      alt="Contoh pratinjau kamera tamu di acara ulang tahun"
                      fill
                      sizes="220px"
                    />
                    <span className={styles.rollBadge}>Everyday 160</span>
                    <span className={styles.shutter} aria-hidden="true">
                      <Camera size={18} />
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </li>

          <li className={styles.flowItem}>
            <article className={`${styles.demoCard} ${styles.galleryCard}`}>
              <div className={styles.cardCopy}>
                <span className={styles.number}>{FLOW[2].number}</span>
                <h3>{FLOW[2].title}</h3>
                <p>{FLOW[2].description}</p>
              </div>

              <div className={styles.galleryUi} aria-label="Contoh galeri setelah reveal">
                <div className={styles.galleryTopbar}>
                  <span>
                    <Images size={15} /> Galeri acara
                  </span>
                  <span className={styles.galleryCount}>128 foto</span>
                </div>
                <div className={styles.galleryGrid}>
                  {["01-pelaminan-v2.webp", "02-meja-dekorasi-v2.webp", "06-konfeti-v2.webp"].map(
                    (image, index) => (
                      <div key={image} className={styles.galleryImage}>
                        <Image
                          src={`/img/scenes/${image}`}
                          alt=""
                          fill
                          sizes="180px"
                          aria-hidden="true"
                        />
                        {index === 1 && (
                          <span className={styles.revealTag}>
                            <LockKeyhole size={12} /> Sudah dibuka
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            </article>
          </li>
        </ol>

        <div className={styles.actions}>
          <p>Ini simulasi antarmuka—alur produk yang sama dipakai di album sebenarnya.</p>
          <div>
            <Link href="/dashboard/new" className={styles.primaryAction}>
              Buat album gratis <ArrowRight size={15} />
            </Link>
            <Link href="/a" className={styles.secondaryAction}>
              Punya kode acara?
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
