import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import {
  COMMON_TIER_FEATURES,
  TIERS,
  formatGuestLimit,
  formatPrice,
  isTierSelectable,
} from "@/lib/catalog";
import Reveal from "@/components/ui/Reveal";
import SplitText from "@/components/ui/SplitText";
import styles from "./Plans.module.css";

/**
 * Daftar paket.
 *
 * Satu kartu ditandai sebagai pilihan yang disorot, tetapi penandanya dihitung,
 * tidak ditulis tetap: yang disorot adalah paket berbayar pertama yang benar-
 * benar bisa diselesaikan checkout-nya. Ketika pembayaran sedang ditutup,
 * sorotan jatuh ke Starter — bukan ke kartu yang tombolnya mati.
 */
export default function Plans() {
  const featured = TIERS.find((tier) => tier.price > 0 && isTierSelectable(tier)) ?? TIERS[0];

  return (
    <section id="harga" className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <Reveal>
            <p className="kicker">Harga</p>
          </Reveal>

          <h2 className={styles.title}>
            <SplitText by="word" delay={70}>
              Bayar sekali untuk satu acara
            </SplitText>
          </h2>

          <Reveal delay={240}>
            <p className={styles.lede}>
              Tidak ada langganan bulanan. Pilih sesuai jumlah tamu. Fiturnya sama di semua
              paket.
            </p>
          </Reveal>

          <Reveal delay={320}>
            <ul className={styles.included} aria-label="Fitur di semua paket">
              {COMMON_TIER_FEATURES.map((feature) => (
                <li key={feature}>
                  <Check size={13} strokeWidth={2.6} />
                  {feature}
                </li>
              ))}
            </ul>
          </Reveal>
        </header>

        <ul className={styles.grid}>
          {TIERS.map((plan, i) => {
            const selectable = isTierSelectable(plan);
            const highlight = plan.id === featured.id;

            return (
              <Reveal
                as="li"
                key={plan.id}
                delay={i * 90}
                className={`${styles.card} ${highlight ? styles.cardFeatured : ""}`}
              >
                {highlight && <span className={styles.tag}>Paling sering dipilih</span>}

                <h3 className={styles.name}>{plan.name}</h3>
                <p className={styles.tagline}>{plan.tagline}</p>

                <p className={styles.price}>
                  <span className={styles.priceValue}>{formatPrice(plan.price)}</span>
                  <span className={styles.priceUnit}>/ album</span>
                </p>

                <p className={styles.capacity}>
                  {formatGuestLimit(plan.maxGuests)} &middot; {plan.shotsPerGuest} jepretan tiap
                  tamu
                </p>

                <ul className={styles.features}>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={14} strokeWidth={2.4} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Paket yang checkout-nya belum bisa diselesaikan tidak diberi
                    tautan: mengarahkannya ke wizard hanya menurunkannya diam-diam
                    ke Starter. */}
                {selectable ? (
                  <Link href={`/dashboard/new?tier=${plan.id}`} className={styles.button}>
                    {plan.price === 0 ? "Mulai gratis" : `Pilih ${plan.name}`}
                    <ArrowRight size={15} strokeWidth={1.8} />
                  </Link>
                ) : (
                  <span className={`${styles.button} ${styles.buttonClosed}`}>
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
