import styles from './BigWord.module.css'

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
 */
export default function BigWord({ children }: { children: string }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.word}>{children}</span>
      <span className={styles.reflection} aria-hidden="true">
        {children}
      </span>
    </div>
  )
}
