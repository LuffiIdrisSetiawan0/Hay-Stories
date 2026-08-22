'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import {
  EVENT_TYPES,
  PAID_TIERS_HIDDEN,
  REVEAL_MODES,
  TIERS,
  formatGuestLimit,
  formatPrice,
  getTier,
  isTierSelectable,
  type EventTypeId,
  type RevealMode,
  type TierId,
} from '@/lib/catalog'
import { createEvent } from './actions'
import styles from './Wizard.module.css'

/*
 * Preset film sengaja tidak ada di sini. Roll dipilih tamu saat memotret dan
 * bisa diganti tiap jepretan, jadi tidak ada satu pun keputusan soal film yang
 * perlu diambil host di muka.
 */
const STEPS = ['Acara', 'Paket', 'Reveal', 'Tinjau'] as const

export default function Wizard({ initialTier = 'starter' }: { initialTier?: TierId }) {
  const [state, formAction, pending] = useActionState(createEvent, null)

  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<EventTypeId>('wedding')
  const [eventDate, setEventDate] = useState('')
  const [tierId, setTierId] = useState<TierId>(initialTier)
  const [revealMode, setRevealMode] = useState<RevealMode>('manual')
  const [revealAt, setRevealAt] = useState('')
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const wizardMountedRef = useRef(false)

  useEffect(() => {
    if (!wizardMountedRef.current) {
      wizardMountedRef.current = true
      return
    }
    stepHeadingRef.current?.focus()
  }, [step])

  // Kesegaran waktu reveal dihitung saat input berubah, bukan saat render.
  // `Date.now()` di badan render itu impure: hasilnya berubah tiap kali
  // komponen kebetulan dirender ulang, sehingga tombol bisa berkedip aktif
  // dan nonaktif tanpa ada yang mengubah apa pun.
  const [revealAtInFuture, setRevealAtInFuture] = useState(false)

  const handleRevealAtChange = (value: string) => {
    setRevealAt(value)
    const parsed = new Date(value)
    setRevealAtInFuture(!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now())
  }

  // Validasi per langkah — tombol lanjut tetap mati sampai langkahnya sah.
  // Server Action memvalidasi ulang semuanya; ini hanya demi kenyamanan.
  //
  // Tiap langkah memberi alasan, bukan sekadar `false`. Tombol yang mati tanpa
  // penjelasan tidak bisa dibedakan dari tombol yang rusak: orang mengetik satu
  // huruf, menekan "Lanjut", tidak terjadi apa-apa, dan menyimpulkan aplikasinya
  // error. `null` berarti langkahnya sah.
  const stepBlocker = [
    title.trim().length === 0
      ? null // Belum diisi sama sekali — biarkan bersih, jangan langsung menegur.
      : title.trim().length < 3
        ? 'Nama acara minimal 3 karakter.'
        : null,
    null,
    revealMode === 'scheduled' && !revealAtInFuture
      ? revealAt
        ? 'Waktu reveal harus di masa depan.'
        : 'Tentukan dulu kapan foto boleh dilihat.'
      : null,
    null,
  ][step]

  const stepValid = [
    title.trim().length >= 3 && title.trim().length <= 80,
    isTierSelectable(getTier(tierId)),
    revealMode !== 'scheduled' || revealAtInFuture,
    true,
  ][step]

  const revealMeta = REVEAL_MODES.find((m) => m.id === revealMode)
  const selectedTier = getTier(tierId)!
  const typeLabel = EVENT_TYPES.find((t) => t.id === eventType)?.label ?? '—'
  // datetime-local tidak memuat offset. Konversi di browser agar server tidak
  // menafsirkan jam Jakarta sebagai UTC (atau timezone host deployment).
  const revealAtInstant =
    revealMode === 'scheduled' && revealAtInFuture ? new Date(revealAt).toISOString() : ''

  return (
    <div className={styles.wrap}>
      <ol className={styles.steps}>
        {STEPS.map((label, i) => (
          <li key={label} className={styles.stepItem}>
            <span
              className={`${styles.stepDot} ${
                i === step ? styles.stepDotActive : i < step ? styles.stepDotDone : ''
              }`}
              aria-current={i === step ? 'step' : undefined}
            >
              {i < step ? <Check size={13} strokeWidth={3} /> : i + 1}
            </span>
            <span className={`${styles.stepLabel} ${i === step ? styles.stepLabelActive : ''}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className={styles.stepBar} />}
          </li>
        ))}
      </ol>

      <form action={formAction}>
        {/* Nilai dikirim lewat input tersembunyi supaya langkah yang sedang
            tidak tampil tetap ikut terkirim saat submit. */}
        <input type="hidden" name="title" value={title.trim()} />
        <input type="hidden" name="eventType" value={eventType} />
        <input type="hidden" name="eventDate" value={eventDate} />
        <input type="hidden" name="tier" value={tierId} />
        <input type="hidden" name="revealMode" value={revealMode} />
        <input type="hidden" name="revealAt" value={revealAtInstant} />

        <div className={styles.panel}>
          {step === 0 && (
            <>
              <h2 ref={stepHeadingRef} className={styles.panelTitle} tabIndex={-1}>
                Acara apa ini?
              </h2>
              <p className={styles.panelHint}>
                Nama ini yang dilihat tamu saat memindai QR code-mu.
              </p>

              <div className={styles.fields}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="title">
                    Nama acara
                  </label>
                  <input
                    id="title"
                    className={styles.input}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Pernikahan Andi & Lina"
                    maxLength={80}
                    autoFocus
                  />
                  <span className={styles.counter}>{title.length}/80</span>
                </div>

                <div className={styles.field}>
                  <span className={styles.label}>Jenis acara</span>
                  <div className={styles.chips}>
                    {EVENT_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setEventType(type.id)}
                        aria-pressed={eventType === type.id}
                        className={`${styles.chip} ${eventType === type.id ? styles.chipActive : ''}`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="eventDate">
                    Tanggal acara <span className={styles.sublabel}>(opsional)</span>
                  </label>
                  <input
                    id="eventDate"
                    type="date"
                    className={styles.input}
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 ref={stepHeadingRef} className={styles.panelTitle} tabIndex={-1}>
                Berapa banyak tamu yang akan memotret?
              </h2>
              <p className={styles.panelHint}>
                Semua paket memakai kamera, roll film, QR, galeri, dan mode reveal yang sama.
                Perbedaannya hanya kapasitas dan masa penyimpanan.
              </p>

              {PAID_TIERS_HIDDEN && (
                <p className={styles.blocker} role="status">
                  Paket berbayar sedang ditutup sampai email dukungan dipasang, jadi hanya Starter
                  yang bisa dipilih sekarang. Album yang sudah jadi tidak terpengaruh.
                </p>
              )}

              <div className={styles.tierGrid}>
                {TIERS.filter(isTierSelectable).map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setTierId(tier.id)}
                    aria-pressed={tierId === tier.id}
                    className={`${styles.tierCard} ${tierId === tier.id ? styles.tierCardActive : ''}`}
                  >
                    <span className={styles.tierTopline}>
                      <span>
                        <strong className={styles.tierName}>{tier.name}</strong>
                        <span className={styles.tierTagline}>{tier.tagline}</span>
                      </span>
                      <span className={styles.tierRadio} aria-hidden="true">
                        {tierId === tier.id && <span />}
                      </span>
                    </span>
                    <span className={styles.tierPrice}>
                      {formatPrice(tier.price)}
                      {tier.price > 0 && <small> / album</small>}
                    </span>
                    <span className={styles.tierLimits}>
                      {formatGuestLimit(tier.maxGuests)} · {tier.shotsPerGuest} jepretan/tamu
                    </span>
                    <span className={styles.tierRetention}>{tier.features[0]}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 ref={stepHeadingRef} className={styles.panelTitle} tabIndex={-1}>
                Kapan foto boleh dilihat?
              </h2>
              <p className={styles.panelHint}>
                Menahan foto sampai acara usai adalah bagian yang paling disukai tamu — semua
                melihatnya bersamaan.
              </p>

              <div className={styles.fields}>
                <div className={styles.options}>
                  {REVEAL_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setRevealMode(mode.id)}
                      aria-pressed={revealMode === mode.id}
                      className={`${styles.option} ${revealMode === mode.id ? styles.optionActive : ''}`}
                    >
                      <span className={styles.radio}>
                        {revealMode === mode.id && <span className={styles.radioDot} />}
                      </span>
                      <span>
                        <span className={styles.optionLabel}>{mode.label}</span>
                        <span className={styles.optionDesc}>{mode.description}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {revealMode === 'scheduled' && (
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="revealAt">
                      Waktu terbuka
                    </label>
                    <input
                      id="revealAt"
                      type="datetime-local"
                      className={styles.input}
                      value={revealAt}
                      onChange={(e) => handleRevealAtChange(e.target.value)}
                    />
                    <span className={styles.sublabel}>
                      {revealAt && !revealAtInFuture
                        ? 'Waktu ini sudah lewat — pilih waktu di masa depan.'
                        : 'Memakai zona waktu perangkat ini.'}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 ref={stepHeadingRef} className={styles.panelTitle} tabIndex={-1}>
                Tinjau sebelum dibuat
              </h2>
              <p className={styles.panelHint}>
                Nama acara bisa diubah nanti. Waktu reveal bisa diubah selama album belum terbuka.
              </p>

              <div className={styles.fields}>
                <div className={styles.summary}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Paket</span>
                    <span className={styles.summaryValue}>
                      {selectedTier.name} · {formatPrice(selectedTier.price)}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Nama acara</span>
                    <span className={styles.summaryValue}>{title.trim() || '—'}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Jenis</span>
                    <span className={styles.summaryValue}>{typeLabel}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Tanggal</span>
                    <span className={styles.summaryValue}>
                      {eventDate
                        ? new Intl.DateTimeFormat('id-ID', {
                            dateStyle: 'long',
                            timeZone: 'UTC',
                          }).format(
                            new Date(`${eventDate}T00:00:00.000Z`)
                          )
                        : 'Belum ditentukan'}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Roll film</span>
                    <span className={styles.summaryValue}>Dipilih tamu saat memotret</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Reveal</span>
                    <span className={styles.summaryValue}>
                      {revealMode === 'scheduled' && revealAt
                        ? new Intl.DateTimeFormat('id-ID', {
                            dateStyle: 'long',
                            timeStyle: 'short',
                          }).format(new Date(revealAt))
                        : (revealMeta?.label ?? '—')}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Kapasitas</span>
                    <span className={styles.summaryValue}>
                      {formatGuestLimit(selectedTier.maxGuests)} &middot;{' '}
                      {selectedTier.shotsPerGuest} jepretan/tamu
                    </span>
                  </div>
                </div>

                <p className={styles.tierNote}>
                  {selectedTier.id === 'starter' ? (
                    <>
                      Album <strong>Starter</strong> langsung aktif dan foto disimpan selama{' '}
                      {selectedTier.retentionDays} hari.
                    </>
                  ) : (
                    <>
                      Album dibuat sebagai draf, lalu kamu diarahkan ke halaman pembayaran Midtrans.
                      Album baru aktif setelah pembayaran <strong>{formatPrice(selectedTier.price)}</strong>{' '}
                      dikonfirmasi aman oleh server.
                    </>
                  )}
                </p>
              </div>
            </>
          )}

          {state?.error && (
            <p className={styles.error} role="alert">
              {state.error}
            </p>
          )}

          {stepBlocker && (
            <p className={styles.blocker} role="status">
              {stepBlocker}
            </p>
          )}

          <div className={styles.nav}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || pending}
            >
              <ArrowLeft size={16} />
              Kembali
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep((s) => s + 1)}
                disabled={!stepValid}
              >
                Lanjut
                <ArrowRight size={16} />
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Menyiapkan album…
                  </>
                ) : (
                  <>
                    {selectedTier.id === 'starter' ? 'Buat album gratis' : 'Lanjut ke pembayaran'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
