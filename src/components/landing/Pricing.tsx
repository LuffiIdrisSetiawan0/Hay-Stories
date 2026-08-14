import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { TIERS, formatPrice, formatGuestLimit } from "@/lib/catalog";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./Pricing.module.css";

/**
 * Empat paket, dibaca langsung dari katalog.
 *
 * Kartunya masuk dengan gerakan terlempar yang sama dengan tumpukan foto di
 * hero — pengulangan yang disengaja, supaya halaman ini terasa punya satu
 * bahasa gerak dan bukan kumpulan seksi yang masing-masing beranimasi sendiri.
 */
export default function Pricing() {
  return (
    <section id="harga" className={styles.section}>
      <div className="container">
        <div className={styles.head}>
          <p className={styles.eyebrow}>Harga</p>
          <h2 className={styles.title}>
            <SplitText by="word" delay={80}>
              Bayar sekali per album
            </SplitText>
          </h2>
          <p className={styles.lede}>
            <SplitText by="word" direction="up" delay={160}>
              Tanpa langganan dan tanpa biaya berulang. Fotonya milikmu selamanya.
            </SplitText>
          </p>
        </div>

        <ul className={styles.grid}>
          {TIERS.map((plan, i) => (
            <Reveal
              key={plan.id}
              as="li"
              direction="throw"
              delay={i * 110}
              className={`${styles.card} ${plan.recommended ? styles.cardBest : ""}`}
            >
              {plan.recommended && <p className={styles.badge}>Rekomendasi</p>}

              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planTagline}>{plan.tagline}</p>

              <p className={styles.priceBlock}>
                {plan.wasPrice && (
                  <span className={styles.wasPrice}>{formatPrice(plan.wasPrice)}</span>
                )}
                <span className={styles.price}>{formatPrice(plan.price)}</span>
              </p>

              <p className={styles.guests}>
                {formatGuestLimit(plan.maxGuests)} &middot; {plan.shotsPerGuest} jepretan/tamu
              </p>

              <ul className={styles.features}>
                {plan.features.map((feature) => (
                  <li key={feature} className={styles.featureItem}>
                    <Check size={14} strokeWidth={2.5} className={styles.featureCheck} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={`${styles.planBtn} ${plan.recommended ? styles.planBtnBest : ""}`}
              >
                {plan.price === 0 ? "Mulai gratis" : "Pilih paket"}
                <ArrowRight size={15} />
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
