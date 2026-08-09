'use client'

import { useActionState, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { revealNow } from './actions'
import styles from './Manage.module.css'

/**
 * Membuka album tidak bisa dibatalkan, jadi ada konfirmasi sekali klik lagi.
 * Menekan tombol ini di tengah acara berarti kejutan yang ditunggu semua tamu
 * hilang begitu saja.
 */
export default function RevealControl({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(revealNow, null)
  const [confirming, setConfirming] = useState(false)

  if (state?.ok) {
    return <p className={styles.revealDone}>Album sudah dibuka. Tamu bisa melihat semua foto.</p>
  }

  return (
    <form action={formAction} className={styles.revealForm}>
      <input type="hidden" name="eventId" value={eventId} />

      {confirming ? (
        <>
          <p className={styles.revealWarn}>
            Yakin? Setelah dibuka, foto tidak bisa disembunyikan lagi.
          </p>
          <div className={styles.revealActions}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Membuka…
                </>
              ) : (
                'Ya, buka sekarang'
              )}
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>
          <Sparkles size={15} />
          Buka album sekarang
        </button>
      )}

      {state?.error && (
        <p className={styles.revealError} role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}
