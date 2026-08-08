import Link from "next/link";
import { Check, ArrowRight, Star } from "lucide-react";
import { TIERS, formatPrice, formatGuestLimit } from "@/lib/catalog";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeading, TitleAccent } from "@/components/ui/Section";
import styles from "./Pricing.module.css";

export default function Pricing() {
  return (
    <Section id="harga" tone="tinted">
      <div className="container">
        <SectionHeading
          eyebrow="Koleksi & Harga"
          title={
            <>
              Investasi untuk <TitleAccent>Kenangan Otentik</TitleAccent>
            </>
          }
          subtitle="Bayar sekali per album, tanpa biaya tersembunyi. Bebas unduh semua momen selamanya."
          centered
        />

        <div className={styles.grid}>
          {TIERS.map((plan, i) => (
            <Reveal
              key={plan.id}
              delay={i * 90}
              className={`${styles.card} ${plan.recommended ? styles.cardBest : ""}`}
            >
              {plan.recommended && (
                <div className={styles.bestBadge}>
                  <Star size={12} />
                  <span>Rekomendasi</span>
                </div>
              )}

              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planTagline}>{plan.tagline}</p>

              <div className={styles.priceBlock}>
                {plan.wasPrice && (
                  <span className={styles.wasPrice}>{formatPrice(plan.wasPrice)}</span>
                )}
                <span className={styles.price}>{formatPrice(plan.price)}</span>
              </div>

              <p className={styles.guests}>
                {formatGuestLimit(plan.maxGuests)} &middot; {plan.shotsPerGuest} jepretan/tamu
              </p>

              <ul className={styles.features}>
                {plan.features.map((feature, j) => (
                  <li key={j} className={styles.featureItem}>
                    <Check size={14} strokeWidth={2} className={styles.featureCheck} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={`${styles.planBtn} ${plan.recommended ? styles.planBtnBest : ""}`}
              >
                {plan.price === 0 ? "Mulai Gratis" : "Pilih Paket"}
                <ArrowRight size={16} />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
