import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import {
  COMMON_TIER_FEATURES,
  TIERS,
  formatPrice,
  formatGuestLimit,
  isTierSelectable,
} from "@/lib/catalog";
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
              Satu Acara, Kapasitas Sesuai Kebutuhan
            </SplitText>
          </h2>
          <p className={styles.lede}>
            <SplitText by="word" direction="up" delay={160}>
              Harga sekali bayar per album. Pilih Starter untuk mencoba gratis, atau paket berbayar untuk acara yang lebih ramai.
            </SplitText>
          </p>

          <ul className={styles.included} aria-label="Fitur di semua paket">
            {COMMON_TIER_FEATURES.map((feature) => (
              <li key={feature} className={styles.includedItem}>
                <Check size={13} strokeWidth={2.5} />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <ul className={styles.grid}>
          {TIERS.map((plan, i) => {
            const selectable = isTierSelectable(plan);
            return (
            <Reveal
              key={plan.id}
              as="li"
              direction="throw"
              delay={i * 110}
              className={styles.card}
            >
              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planTagline}>{plan.tagline}</p>

              <p className={styles.priceBlock}>
                <span className={styles.price}>{formatPrice(plan.price)}</span>
                <span className={styles.priceSuffix}>/ album</span>
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

              {/* Paket yang tidak dapat diselesaikan checkout-nya tidak
                  diberi tautan: mengarahkan ke wizard hanya menurunkannya
                  diam-diam ke Starter. */}
              {selectable ? (
                <Link
                  href={`/dashboard/new?tier=${plan.id}`}
                  className={styles.planBtn}
                >
                  {plan.price === 0 ? 'Mulai gratis' : `Pilih ${plan.name}`}
                  <ArrowRight size={15} />
                </Link>
              ) : (
                <span className={`${styles.planBtn} ${styles.planBtnClosed}`}>
                  Pembelian belum dibuka
                </span>
              )}
            </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
