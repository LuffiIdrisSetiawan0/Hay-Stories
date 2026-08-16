"use client";

import styles from "./ScrollCue.module.css";

interface ScrollCueProps {
  /** Anchor tujuan saat ditekan. */
  href: string;
  /** Label aksesibilitas. */
  label?: string;
}

const LETTERS = ["S", "C", "R", "O", "L", "L"] as const;

/**
 * Y-Vision Style Scroll Indicator:
 * - Circle with continuous downward sliding arrow through overflow-hidden mask
 * - Sequential wave-glowing "S C R O L L" text
 * - Responsive clamp sizing & smooth hover scale/inversion
 */
export default function ScrollCue({ href, label = "Gulir ke bawah" }: ScrollCueProps) {
  return (
    <a href={href} className={styles.scrollButton} aria-label={label}>
      {/* Top Circle with Sliding Arrow */}
      <span className={styles.circle} aria-hidden="true">
        <span className={styles.arrowMask}>
          <svg
            className={styles.arrowSvg}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4.5V19.5M12 19.5L6 13.5M12 19.5L18 13.5" />
          </svg>
        </span>
      </span>

      {/* Sequential Wave Text: S C R O L L */}
      <span className={styles.labelWrapper} aria-hidden="true">
        {LETTERS.map((letter, idx) => (
          <span
            key={idx}
            className={styles.letter}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            {letter}
          </span>
        ))}
      </span>
    </a>
  );
}
