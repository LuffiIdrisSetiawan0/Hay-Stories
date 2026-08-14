"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./EventShowcase.module.css";

/**
 * Empat jenis acara sebagai seksi yang menempel di layar.
 *
 * Pengunjung datang membawa satu acara di kepalanya, bukan rasa ingin tahu
 * umum. Memberi mereka pintu bernama acaranya sendiri lebih cepat daripada
 * menuntut mereka membaca dulu apa produk ini.
 *
 * Cara kerja pinning-nya: pembungkus dibuat setinggi empat layar, anaknya
 * `position: sticky`. Selama pembungkus melewati viewport, anaknya diam di
 * tempat dan yang berubah cuma slide mana yang tampil — jadi menggulir terasa
 * seperti membalik kartu, bukan seperti melewati empat seksi.
 *
 * Tiga hal yang membuat ini tidak berubah jadi jebakan:
 *
 * - Di bawah 768px seluruh mekanisme mati lewat media query dan keempat slide
 *   tampil sebagai daftar biasa. Empat layar tinggi yang "macet" di ponsel
 *   terasa seperti halaman rusak, dan pinning di layar sekecil itu tidak
 *   menyisakan ruang untuk apa pun yang di-pin.
 * - `prefers-reduced-motion` diperlakukan sama persis, lewat media query yang
 *   sama.
 * - Yang menyembunyikan slide tak aktif adalah `visibility`, bukan
 *   `aria-hidden`. Karena keputusannya ada di CSS, mode daftar di ponsel tidak
 *   pernah bisa menyisakan tiga slide yang terlihat mata tapi hilang dari
 *   pembaca layar — kesalahan yang pasti terjadi kalau disembunyikan dari JS.
 */

const EVENTS = [
  {
    href: "/pernikahan",
    label: "Pernikahan",
    line: "Akad, resepsi, dan semua sudut yang tidak sempat dilihat fotografer.",
    detail:
      "Fotografermu berdiri di satu tempat. Tamumu duduk di seratus tempat lain — dan justru dari sanalah foto yang paling kamu ingat nanti diambil.",
  },
  {
    href: "/ulang-tahun",
    label: "Ulang Tahun",
    line: "Dari tiup lilin sampai tawa yang tidak ada di kamera siapa pun.",
    detail:
      "Tidak perlu menyewa siapa-siapa. Tempel QR di meja kue, dan semua yang datang jadi fotografernya.",
  },
  {
    href: "/pesta",
    label: "Pesta",
    line: "Malam panjang, lampu warna, dan tamu yang saling memotret.",
    detail:
      "Roll Neon Night dibuat persis untuk ini: lampu warna yang biasanya bikin foto rusak justru jadi bagian tampilannya.",
  },
  {
    href: "/acara-kantor",
    label: "Acara Kantor",
    line: "Gathering dan perayaan tim, tanpa perlu menyewa siapa pun.",
    detail:
      "Satu tautan untuk seluruh kantor. Tidak ada aplikasi yang harus lolos IT, dan tidak ada akun yang harus dibuat siapa pun.",
  },
] as const;

export default function EventShowcase() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  /** Benar hanya jika mode menempel benar-benar aktif di CSS saat ini. */
  const isPinned = useCallback(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let frame = 0;

    const read = () => {
      frame = 0;

      // Di mode daftar tidak ada yang perlu dihitung, dan slide pertama harus
      // dikembalikan jadi aktif — kalau tidak, mengecilkan jendela bisa
      // meninggalkan indeks slide terakhir yang menempel dari mode sebelumnya.
      if (!isPinned()) {
        setActive(0);
        return;
      }

      const rect = wrap.getBoundingClientRect();
      // Jarak yang benar-benar bisa digulir selama anaknya menempel.
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) return;

      const progress = Math.min(Math.max(-rect.top / travel, 0), 1);
      // `min` menahan progress === 1 supaya tidak jatuh ke indeks ke-5.
      setActive(Math.min(EVENTS.length - 1, Math.floor(progress * EVENTS.length)));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [isPinned]);

  /**
   * Menekan tab menggulir ke posisi slide itu, bukan sekadar menyetel state —
   * kalau cuma state, gulir berikutnya langsung menimpanya kembali dengan nilai
   * yang dihitung dari posisi scroll.
   */
  const goTo = (index: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    if (!isPinned()) {
      setActive(index);
      return;
    }

    const travel = wrap.offsetHeight - window.innerHeight;
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    // Setengah langkah ke dalam pita slide, jadi mendaratnya di tengah rentang
    // dan bukan tepat di batas yang gampang meleset ke slide sebelahnya.
    window.scrollTo({
      top: top + (travel * (index + 0.5)) / EVENTS.length,
      behavior: "smooth",
    });
  };

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <section
        id="acara"
        className={`${styles.pin} surface-dark`}
        aria-label="Jenis acara"
      >
        <div className={`container ${styles.inner}`}>
          <div className={styles.head}>
            <p className={styles.eyebrow}>Untuk acara apa</p>
            <p className={styles.counter} aria-hidden="true">
              <span className={styles.counterNow}>
                {String(active + 1).padStart(2, "0")}
              </span>
              <span className={styles.counterTotal}>
                {" / "}
                {String(EVENTS.length).padStart(2, "0")}
              </span>
            </p>
          </div>

          <div className={styles.stage}>
            {EVENTS.map((event, i) => (
              <article
                key={event.href}
                className={styles.slide}
                data-active={i === active}
              >
                <h2 className={styles.slideTitle}>{event.label}</h2>
                <p className={styles.slideLine}>{event.line}</p>
                <p className={styles.slideDetail}>{event.detail}</p>
                <Link href={event.href} className={styles.slideLink}>
                  Selengkapnya
                  <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>

          <ul className={styles.tabs}>
            {EVENTS.map((event, i) => (
              <li key={event.href}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === active ? "true" : undefined}
                  className={`${styles.tab} ${i === active ? styles.tabActive : ""}`}
                >
                  <span className={styles.tabIndex}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.tabLabel}>{event.label}</span>
                  <ArrowRight size={15} className={styles.tabArrow} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
