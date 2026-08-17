import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { TIERS, formatPrice, formatGuestLimit } from "@/lib/catalog";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./Pricing.module.css";

export default function Pricing() {
  return (
    <section id="harga" className={styles.section}>
      <div className="container">
        <div className={styles.head}>
          <p className={styles.eyebrow}>Paket Harga</p>
          <h2 className={styles.title}>
            <SplitText by="word" delay={80}>
              Mulai Gratis, Naik Paket Nanti
            </SplitText>
          </h2>
          <p className={styles.lede}>
            <SplitText by="word" direction="up" delay={160}>
              Starter tersedia sekarang dan menyimpan foto selama 90 hari. Paket berbayar masih dalam daftar tunggu dan belum dapat dibeli.
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
              {!plan.available && <p className={styles.badge}>Segera hadir</p>}

              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planTagline}>{plan.tagline}</p>

              <p className={styles.priceBlock}>
                {plan.available && plan.wasPrice && (
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

              {plan.available ? (
                <Link href="/login" className={styles.planBtn}>
                  Mulai Starter Gratis
                  <ArrowRight size={15} />
                </Link>
              ) : (
                <a
                  href={`mailto:hello@haystories.id?subject=${encodeURIComponent(
                    `Daftar tunggu paket ${plan.name}`
                  )}`}
                  className={`${styles.planBtn} ${plan.recommended ? styles.planBtnBest : ""}`}
                >
                  Gabung Daftar Tunggu
                  <ArrowRight size={15} />
                </a>
              )}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
