import type { ElementType } from 'react'
import styles from './BigWord.module.css'

interface BigWordProps {
  children: string
  /**
   * Beri pantulannya riak seperti permukaan air. Matikan kalau kata itu berdiri
   * di atas latar bergambar, di mana riaknya jadi tidak terbaca.
   */
  liquid?: boolean
  /**
   * Elemen pembungkusnya. Nyaris selalu perlu diisi `h2`: kata ini menggantikan
   * judul seksi, jadi kalau dibiarkan jadi `div` seksinya benar-benar tidak
   * punya heading — daftar isi halaman jadi bolong di mata pembaca layar dan
   * mesin pencari, padahal katanya terlihat sebesar mungkin di layar.
   */
  as?: ElementType
}

/**
 * Satu kata raksasa dengan pantulan memudar di bawahnya.
 *
 * Dipakai sebagai penanda seksi, menggantikan eyebrow mungil plus judul. Bobot
 * seksinya dipikul satu kata, dan sisa ruang dibiarkan kosong.
 *
 * Pantulannya elemen kedua yang dibalik vertikal lalu di-mask gradien, bukan
 * `-webkit-box-reflect` — properti itu tidak pernah distandarkan dan tidak ada
 * di Firefox. Salinannya `aria-hidden`; pembaca layar cukup mendengar katanya
 * satu kali.
 *
 * Riaknya `feTurbulence` + `feDisplacementMap`: derau frekuensi rendah yang
 * menggeser piksel pantulan beberapa piksel ke samping, jadi tepinya berombak
 * alih-alih jadi cermin sempurna. Id filternya diturunkan dari katanya sendiri
 * supaya dua `BigWord` di satu halaman tidak pernah bertabrakan id.
 */
export default function BigWord({ children, liquid = true, as: Tag = 'div' }: BigWordProps) {
  const filterId = `bw-${children.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <Tag className={styles.wrap}>
      <span className={styles.word}>{children}</span>

      {liquid && (
        <svg className={styles.defs} aria-hidden="true" focusable="false">
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.045"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="9"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      )}

      <span
        className={styles.reflection}
        aria-hidden="true"
        style={liquid ? { filter: `url(#${filterId})` } : undefined}
      >
        {children}
      </span>
    </Tag>
  )
}
