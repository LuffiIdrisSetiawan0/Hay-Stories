"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/landing/Footer";
import { formatGuestLimit, formatPrice, getTier } from "@/lib/catalog";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  QrCode,
  MonitorPlay,
  Film,
  Camera,
  Users,
  Building2,
  ShieldCheck,
  Image as ImageIcon,
  Zap,
  Cake,
  PartyPopper,
  Heart,
  Download,
  LucideIcon,
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
  heroImage: string;
  accentColor?: string;
  benefits: EventBenefit[];
  steps: { step: string; title: string; desc: string }[];
  presets: EventPreset[];
  sampleGallery: { img: string; caption: string }[];
  storyQuote: { quote: string; author: string; role: string };
  faqs: EventFaq[];
}

export default function EventPageTemplate(props: EventPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const starter = getTier("starter")!;

  return (
    <main className={styles.page}>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>
              <Sparkles size={14} />
              <span>{props.badge}</span>
            </div>

            <h1 className={styles.heroTitle}>{props.title}</h1>
            <p className={styles.heroSubtitle}>{props.subtitle}</p>

            <div className={styles.heroActions}>
              <Link href="/login" className={styles.primaryCta}>
                <span>Buat Album Acara Ini</span>
                <ArrowUpRight size={18} />
              </Link>
              <Link href="#cara-kerja" className={styles.secondaryCta}>
                <span>Lihat Cara Kerja</span>
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroImageFrame}>
              <Image
                src={props.heroImage}
                alt={props.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 560px"
                className={styles.heroImg}
              />
              <div className={styles.photoSticker}>
                <QrCode size={16} />
                <span>Scan QR & Jepret Langsung</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className={styles.benefitsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>KEUNGGULAN</p>
            <h2 className={styles.sectionTitle}>Kenapa Menggunakan HAY Stories?</h2>
          </div>

          <div className={styles.benefitsGrid}>
            {props.benefits.map((b, i) => {
              const IconComp = ICON_MAP[b.icon] || Sparkles;
              return (
                <div key={i} className={styles.benefitCard}>
                  <div className={styles.benefitIcon}>
                    <IconComp size={22} />
                  </div>
                  <h3>{b.title}</h3>
                  <p>{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3 Step Timeline */}
      <section id="cara-kerja" className={styles.stepsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>ALUR PENGGUNAAN</p>
            <h2 className={styles.sectionTitle}>3 Langkah Mudah di Hari H</h2>
          </div>

          <div className={styles.stepsGrid}>
            {props.steps.map((s, i) => (
              <div key={i} className={styles.stepCard}>
                <span className={styles.stepNumber}>{s.step}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended Presets & Sample Shots */}
      <section className={styles.gallerySection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>LOOK WARNA FILM</p>
            <h2 className={styles.sectionTitle}>Preset Film Paling Cocok</h2>
          </div>

          <div className={styles.presetsRow}>
            {props.presets.map((p, i) => (
              <div key={i} className={styles.presetChip}>
                <Film size={16} />
                <div>
                  <strong>{p.name}</strong> · <span>{p.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.samplesGrid}>
            {props.sampleGallery.map((sample, i) => (
              <div key={i} className={styles.sampleCard}>
                <div className={styles.sampleFrame}>
                  <Image
                    src={sample.img}
                    alt={sample.caption}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className={styles.sampleImg}
                  />
                </div>
                <p className={styles.sampleCaption}>{sample.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote / Testimonial */}
      <section className={styles.quoteSection}>
        <div className={styles.container}>
          <div className={styles.quoteCard}>
            <p className={styles.quoteText}>&ldquo;{props.storyQuote.quote}&rdquo;</p>
            <div className={styles.quoteAuthor}>
              <strong>{props.storyQuote.author}</strong>
              <span>{props.storyQuote.role}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended Package Callout */}
      <section className={styles.pricingCalloutSection}>
        <div className={styles.container}>
          <div className={styles.pricingCard}>
            <div className={styles.pricingHeader}>
              <div>
                <span className={styles.packagePill}>Tersedia sekarang</span>
                <h3 className={styles.packageName}>Paket {starter.name}</h3>
                <p className={styles.packageGuests}>
                  {formatGuestLimit(starter.maxGuests)} · {starter.retentionDays} hari penyimpanan
                </p>
              </div>
              <div className={styles.priceTag}>
                <span className={styles.priceValue}>{formatPrice(starter.price)}</span>
                <span className={styles.pricePeriod}>tanpa kartu kredit</span>
              </div>
            </div>

            <div className={styles.featuresList}>
              {starter.features.map((feature) => (
                <div key={feature} className={styles.featureRow}>
                  <CheckCircle2 size={18} className={styles.checkIcon} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className={styles.pricingAction}>
              <Link href="/login" className={styles.packageBtn}>
                <span>Buat Album Starter Gratis</span>
                <ArrowUpRight size={18} />
              </Link>
              <Link href="/harga" className={styles.seeAllPricing}>
                Lihat semua paket harga →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className={styles.faqSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>FAQ</p>
            <h2 className={styles.sectionTitle}>Pertanyaan yang Sering Diajukan</h2>
          </div>

          <div className={styles.faqList}>
            {props.faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className={styles.faqItem}>
                  <button
                    type="button"
                    className={styles.faqQuestion}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={20}
                      className={`${styles.faqArrow} ${isOpen ? styles.faqArrowOpen : ""}`}
                    />
                  </button>
                  {isOpen && <p className={styles.faqAnswer}>{faq.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
