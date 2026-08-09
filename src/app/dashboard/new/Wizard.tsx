'use client'

import { useActionState, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import {
  DEFAULT_PRESET,
  EVENT_TYPES,
  REVEAL_MODES,
  getPreset,
  getTier,
  type EventTypeId,
  type PresetId,
  type RevealMode,
} from '@/lib/catalog'
import { createEvent } from './actions'
import PresetPicker from './PresetPicker'
import styles from './Wizard.module.css'

const STEPS = ['Acara', 'Preset film', 'Reveal', 'Tinjau'] as const

const STARTER = getTier('starter')!

export default function Wizard() {
  const [state, formAction, pending] = useActionState(createEvent, null)

  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<EventTypeId>('wedding')
  const [eventDate, setEventDate] = useState('')
  const [preset, setPreset] = useState<PresetId>(DEFAULT_PRESET)
  const [revealMode, setRevealMode] = useState<RevealMode>('manual')
  const [revealAt, setRevealAt] = useState('')

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
  const stepValid = [
    title.trim().length >= 3 && title.trim().length <= 80,
    true,
    revealMode !== 'scheduled' || revealAtInFuture,
    true,
  ][step]

  const presetMeta = getPreset(preset)
  const revealMeta = REVEAL_MODES.find((m) => m.id === revealMode)
  const typeLabel = EVENT_TYPES.find((t) => t.id === eventType)?.label ?? '—'

  return (
    <div className={styles.wrap}>
      <ol className={styles.steps}>
        {STEPS.map((label, i) => (
          <li key={label} className={styles.stepItem}>
            <span
              className={`${styles.stepDot} ${
                i === step ? styles.stepDotActive : i < step ? styles.stepDotDone : ''
              }`}
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
        <input type="hidden" name="preset" value={preset} />
        <input type="hidden" name="revealMode" value={revealMode} />
        <input type="hidden" name="revealAt" value={revealMode === 'scheduled' ? revealAt : ''} />

        <div className={styles.panel}>
          {step === 0 && (
            <>
              <h2 className={styles.panelTitle}>Acara apa ini?</h2>
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
              <h2 className={styles.panelTitle}>Pilih roll filmnya</h2>
              <p className={styles.panelHint}>
                Semua tamu memotret dengan roll yang sama, jadi albumnya terasa seperti satu cerita
                utuh.
              </p>
              <div className={styles.fields}>
                <PresetPicker value={preset} onChange={setPreset} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className={styles.panelTitle}>Kapan foto boleh dilihat?</h2>
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
              <h2 className={styles.panelTitle}>Tinjau sebelum dibuat</h2>
              <p className={styles.panelHint}>
                Nama dan waktu reveal masih bisa diubah nanti. Preset film tidak.
              </p>

              <div className={styles.fields}>
                <div className={styles.summary}>
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
                        ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
                            new Date(eventDate)
                          )
                        : 'Belum ditentukan'}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Preset film</span>
                    <span className={styles.summaryValue}>{presetMeta?.name ?? '—'}</span>
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
                      {STARTER.maxGuests} tamu &middot; {STARTER.shotsPerGuest} jepretan/tamu
                    </span>
                  </div>
                </div>

                <p className={styles.tierNote}>
                  Album dibuat pada paket <strong>Starter</strong> yang gratis: sampai{' '}
                  {STARTER.maxGuests} tamu, {STARTER.shotsPerGuest} jepretan per tamu, foto disimpan{' '}
                  {STARTER.retentionDays} hari. Paket berbayar untuk acara lebih besar menyusul
                  begitu pembayaran aktif.
                </p>
              </div>
            </>
          )}

          {state?.error && (
            <p className={styles.error} role="alert">
              {state.error}
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
                    Membuat album…
                  </>
                ) : (
                  <>
                    Buat album
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
