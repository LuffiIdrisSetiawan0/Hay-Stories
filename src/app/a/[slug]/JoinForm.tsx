'use client'

import { useActionState, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { GUEST_NAME_MAX, GUEST_NAME_MIN } from '@/lib/events'
import { joinEvent } from './actions'
import styles from '../Guest.module.css'

export default function JoinForm({
  slug,
  defaultName = '',
}: {
  slug: string
  /** Terisi saat tamu kembali untuk membetulkan namanya. */
  defaultName?: string
}) {
  const [state, formAction, pending] = useActionState(joinEvent, null)
  const [name, setName] = useState(defaultName)

  const trimmed = name.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < GUEST_NAME_MIN

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="slug" value={slug} />

      <label className={styles.label} htmlFor="displayName">
        Siapa namamu?
      </label>

      <input
        id="displayName"
        name="displayName"
        className={styles.input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nama panggilan saja"
        maxLength={GUEST_NAME_MAX}
        autoComplete="given-name"
        autoFocus
      />

      <p className={styles.hint}>Ditulis di bawah setiap fotomu di galeri nanti.</p>

      {state?.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      {tooShort && !state?.error && (
        <p className={styles.blocker} role="status">
          Nama minimal {GUEST_NAME_MIN} karakter.
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%' }}
        disabled={pending || trimmed.length < GUEST_NAME_MIN}
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Menyiapkan kamera…
          </>
        ) : (
          <>
            Ambil kamera
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  )
}
