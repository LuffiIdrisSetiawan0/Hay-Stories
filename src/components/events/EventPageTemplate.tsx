"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import { COMMON_TIER_FEATURES, formatGuestLimit, formatPrice, getTier } from "@/lib/catalog";
import { sceneFocus, type Scene } from "@/lib/scenes";
import {
  ArrowRight,
  Building2,
  Cake,
  Camera,
  Check,
  Download,
  Film,
  Heart,
  Image as ImageIcon,
  LockKeyhole,
  MonitorPlay,
  PartyPopper,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import styles from "./EventPageTemplate.module.css";

const ICON_MAP: Record<string, LucideIcon> = {
  qr: QrCode,
  sparkles: Sparkles,
  monitor: MonitorPlay,
  film: Film,
  camera: Camera,
  users: Users,
  building: Building2,
  shield: ShieldCheck,
  image: ImageIcon,
  zap: Zap,
  cake: Cake,
  party: PartyPopper,
  heart: Heart,
  download: Download,
  lock: LockKeyhole,
};

export interface EventBenefit {
  title: string;
  description: string;
  icon: string;
}

export interface EventPreset {
  name: string;
  desc: string;
  tag: string;
}

export interface EventFaq {
  q: string;
  a: string;
}

export interface EventPageProps {
  slug: string;
  badge: string;
  title: string;
  subtitle: string;
  heroScene: Scene;
  accentColor?: string;
  benefits: EventBenefit[];
  steps: { step: string; title: string; desc: string }[];
  presets: EventPreset[];
  sampleGallery: { scene: Scene; caption: string }[];
  faqs: EventFaq[];
}

/**
 * Kerangka halaman per jenis acara.
 *
 * Memakai bahasa visual yang sama dengan halaman utama — kanvas krem, judul
 * serif besar, foto berbingkai cetak, dan baris bergaris tipis — sehingga
 * berpindah dari beranda ke halaman pernikahan tidak terasa seperti berpindah
 * situs. Isinya seluruhnya datang dari props, jadi satu berkas ini melayani
 * keempat halaman acara.
 */
export default function EventPageTemplate(props: EventPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const starter = getTier("starter")!;

  return (
    <main className={styles.page}>
      <SiteHeader />

      {/* ===== Hero ===== */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <Reveal>
              <p className="kicker">{props.badge}</p>
            </Reveal>

            <h1 className={styles.heroTitle}>
              <SplitText by="word" delay={70}>
                {props.title}
              </SplitText>
            </h1>

            <Reveal delay={280}>
              <p className={styles.heroText}>{props.subtitle}</p>
            </Reveal>

            <Reveal delay={360} className={styles.heroActions}>
              <Link href="/dashboard/new?tier=starter" className={styles.primary}>
                Buat album gratis
                <ArrowRight size={17} strokeWidth={1.8} />
              </Link>
              <Link href="#cara-kerja" className={styles.secondary}>
                Lihat cara kerja
              </Link>
            </Reveal>

            <Reveal delay={440}>
              <p className={styles.heroNote}>
                Gratis untuk lima tamu pertama &middot; tanpa kartu kredit
              </p>
            </Reveal>
          </div>

          <Reveal direction="scale" delay={220} className={styles.heroFigureSlot}>
            <figure className={styles.heroFigure}>
              <span className={styles.heroWindow}>
                <Image
                  src={props.heroScene.src}
                  alt={props.heroScene.alt}
                  fill
                  preload
                  sizes="(max-width: 900px) 88vw, 34vw"
                  quality={88}
                  style={sceneFocus(props.heroScene) as CSSProperties}
                  className={styles.photo}
                />
              </span>
              <figcaption className={styles.heroCaption}>
                <QrCode size={14} strokeWidth={1.8} />
                Pindai, potret, selesai.
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ===== Keunggulan ===== */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <Reveal>
              <p className="kicker">Keunggulan</p>
            </Reveal>
            <h2 className={styles.sectionTitle}>
              <SplitText by="word" delay={60}>
                Kenapa Memilih HAY Stories
              </SplitText>
            </h2>
          </div>

          <ul className={styles.benefits}>
            {props.benefits.map((benefit, i) => {
              const Icon = ICON_MAP[benefit.icon] ?? Sparkles;
              return (
                <Reveal as="li" key={benefit.title} delay={i * 90} className={styles.benefit}>
                  <span className={styles.benefitIcon} aria-hidden="true">
                    <Icon size={18} strokeWidth={1.7} />
                  </span>
                  <div>
                    <h3 className={styles.benefitTitle}>{benefit.title}</h3>
                    <p className={styles.benefitText}>{benefit.description}</p>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ===== Tiga langkah ===== */}
      <section id="cara-kerja" className={`${styles.section} ${styles.sectionWarm}`}>
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <Reveal>
              <p className="kicker">Alur di hari acara</p>
            </Reveal>
            <h2 className={styles.sectionTitle}>
              <SplitText by="word" delay={60}>
                Tiga Langkah Saja
              </SplitText>
            </h2>
          </div>

          <ol className={styles.steps}>
            {props.steps.map((step, i) => (
              <Reveal as="li" key={step.step} delay={i * 110} className={styles.step}>
                <span className={styles.stepNumber}>{step.step}</span>
                <div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== Nuansa & contoh foto ===== */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <Reveal>
              <p className="kicker">Nuansa yang cocok</p>
            </Reveal>
            <h2 className={styles.sectionTitle}>
              <SplitText by="word" delay={60}>
                Pilih Karakter yang Terasa Seperti Acaramu
              </SplitText>
            </h2>
          </div>

          <Reveal delay={160}>
            <ul className={styles.presets}>
              {props.presets.map((preset) => (
                <li key={preset.name} className={styles.preset}>
                  <Film size={14} strokeWidth={1.7} />
                  <strong>{preset.name}</strong>
                  <span>{preset.desc}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <ul className={styles.gallery}>
            {props.sampleGallery.map((sample, i) => (
              <Reveal as="li" key={sample.caption} delay={i * 100} className={styles.galleryItem}>
                <span className={styles.galleryWindow}>
                  <Image
                    src={sample.scene.src}
                    alt={sample.scene.alt}
                    fill
                    sizes="(max-width: 760px) 88vw, 30vw"
                    style={sceneFocus(sample.scene) as CSSProperties}
                    className={styles.photo}
                  />
                </span>
                <p className={styles.galleryCaption}>{sample.caption}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Ajakan ===== */}
      <section className={`${styles.section} ${styles.sectionWarm}`}>
        <div className={styles.inner}>
          <Reveal direction="scale" className={styles.offerSlot}>
            <div className={styles.offer}>
              <div className={styles.offerHead}>
                <div>
                  <p className={styles.offerLabel}>Tersedia sekarang</p>
                  <h2 className={styles.offerTitle}>Paket {starter.name}</h2>
                  <p className={styles.offerMeta}>
                    {formatGuestLimit(starter.maxGuests)} &middot; penyimpanan{" "}
                    {starter.retentionDays} hari
                  </p>
                </div>
                <p className={styles.offerPrice}>
                  <span>{formatPrice(starter.price)}</span>
                  <small>tanpa kartu kredit</small>
                </p>
              </div>

              <ul className={styles.offerList}>
                {[...COMMON_TIER_FEATURES, ...starter.features].map((feature) => (
                  <li key={feature}>
                    <Check size={14} strokeWidth={2.4} />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className={styles.offerActions}>
                <Link href="/dashboard/new?tier=starter" className={styles.offerButton}>
                  Buat album Starter gratis
                  <ArrowRight size={16} strokeWidth={1.8} />
                </Link>
                <Link href="/harga" className={styles.offerLink}>
                  Lihat semua paket
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Pertanyaan ===== */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <Reveal>
              <p className="kicker">Pertanyaan</p>
            </Reveal>
            <h2 className={styles.sectionTitle}>
              <SplitText by="word" delay={60}>
                Hal yang Sering Ditanyakan
              </SplitText>
            </h2>
          </div>

          <ul className={styles.faq}>
            {props.faqs.map((faq, i) => {
              const expanded = openFaq === i;
              return (
                <Reveal
                  as="li"
                  key={faq.q}
                  delay={i * 60}
                  className={`${styles.faqItem} ${expanded ? styles.faqItemOpen : ""}`}
                >
                  <h3 className={styles.faqHead}>
                    <button
                      type="button"
                      className={styles.faqTrigger}
                      aria-expanded={expanded}
                      aria-controls={`${props.slug}-faq-${i}`}
                      onClick={() => setOpenFaq(expanded ? null : i)}
                    >
                      <span>{faq.q}</span>
                      <Plus size={18} strokeWidth={1.5} className={styles.faqIcon} aria-hidden="true" />
                    </button>
                  </h3>
                  <div id={`${props.slug}-faq-${i}`} className={styles.faqAnswer}>
                    <div className={styles.faqAnswerInner}>
                      <p>{faq.a}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
