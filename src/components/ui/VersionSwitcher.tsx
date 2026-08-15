"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sparkles, Flame } from "lucide-react";
import styles from "./VersionSwitcher.module.css";

export default function VersionSwitcher() {
  const pathname = usePathname();
  const isV2 = pathname === "/v2" || pathname === "/gen-z";

  return (
    <aside aria-label="Version Switcher" className={styles.wrapper}>
      {isV2 ? (
        <Link href="/" className={`${styles.badge} ${styles.badgeClassic}`} title="Beralih ke desain Classic">
          <Sparkles size={14} className={styles.iconGold} />
          <span>Lihat Versi <strong>Classic (v1)</strong></span>
        </Link>
      ) : (
        <Link href="/v2" className={`${styles.badge} ${styles.badgeGenz}`} title="Beralih ke desain Gen-Z Colorful">
          <Flame size={15} className={styles.iconRed} />
          <span>Lihat Desain <strong>Gen-Z (v2) 🔥</strong></span>
        </Link>
      )}
    </aside>
  );
}
