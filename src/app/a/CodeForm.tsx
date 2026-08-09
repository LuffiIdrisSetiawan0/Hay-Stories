'use client'

import { useActionState, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { CODE_ALPHABET } from '@/lib/events'
import { enterCode } from './actions'
import styles from './Guest.module.css'

/** Panjang kode yang diterbitkan `generateAccessCode()`. */
const CODE_LENGTH = 6

export default function CodeForm() {
  const [state, formAction, pending] = useActionState(enterCode, null)
  const [code, setCode] = useState('')

  /*
   * Saring saat mengetik, bukan saat mengirim.
   *
   * Kode tidak pernah memuat 0/O, 1/I/L, 2/Z, 5/S, atau 8/B — huruf-huruf itu
   * memang dibuang dari alfabetnya supaya tidak tertukar saat dibaca. Menolak
   * ketikannya di tempat lebih baik daripada menerima "SO" lalu mengatakan
   * kodenya salah: tamu jadi tahu seketika bahwa yang dilihatnya adalah 5 dan 0.
   */
  const handleChange = (value: string) => {
    const filtered = value
      .toUpperCase()
      .split('')
      .filter((char) => CODE_ALPHABET.includes(char))
      .join('')

    setCode(filtered.slice(0, CODE_LENGTH))
  }

  return (
    <form action={formAction} className={styles.form}>
      <label className={styles.label} htmlFor="code">
        Kode album
      </label>

      <input
        id="code"
        name="code"
        className={`${styles.input} ${styles.codeInput}`}
        value={code}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="XXXXXX"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        autoFocus
      />

      <p className={styles.hint}>Enam karakter, tercetak di kartu meja bersama QR-nya.</p>

      {state?.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%' }}
        disabled={pending || code.length < CODE_LENGTH}
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Mencari album…
          </>
        ) : (
          <>
            Buka album
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  )
}
