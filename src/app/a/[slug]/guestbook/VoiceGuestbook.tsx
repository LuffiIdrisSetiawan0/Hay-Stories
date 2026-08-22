'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Camera,
  Check,
  Headphones,
  Images,
  Loader2,
  LockKeyhole,
  Mic,
  RotateCcw,
  Send,
  Square,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './Guestbook.module.css'

const MAX_DURATION_MS = 20_000
const MAX_NOTE_CHARS = 500
const MAX_AUDIO_BYTES = 2_097_152

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/webm',
  'audio/ogg',
] as const

type Phase =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'ready'
  | 'uploading'
  | 'sent'

interface ReserveResponse {
  error?: string
  ok?: boolean
  messageId?: string
  alreadyReady?: boolean
  upload?: {
    bucket: string
    path: string
    token: string
  }
}

function preferredMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function formatTimer(milliseconds: number) {
  const seconds = Math.min(MAX_DURATION_MS, Math.max(0, milliseconds)) / 1000
  return `0:${seconds.toFixed(1).padStart(4, '0')}`
}

async function responseJson(response: Response): Promise<ReserveResponse> {
  return response.json().catch(() => ({})) as Promise<ReserveResponse>
}

export default function VoiceGuestbook({
  eventId,
  slug,
  title,
  guestName,
  canSubmit,
  hasEntry,
}: {
  eventId: string
  slug: string
  title: string
  guestName: string
  canSubmit: boolean
  hasEntry: boolean
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>(hasEntry ? 'sent' : 'idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [audio, setAudio] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const durationRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => {
    return () => {
      clearTimer()
      const recorder = recorderRef.current
      if (recorder) {
        recorder.ondataavailable = null
        recorder.onstop = null
        if (recorder.state !== 'inactive') recorder.stop()
      }
      stopStream()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const stopRecording = () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    const recordedFor = Math.min(MAX_DURATION_MS, performance.now() - startedAtRef.current)
    durationRef.current = Math.max(250, Math.round(recordedFor))
    setElapsedMs(durationRef.current)
    clearTimer()
    recorder.stop()
  }

  const startRecording = async () => {
    if (!canSubmit || phase === 'requesting' || phase === 'uploading') return

    setError('')
    setPhase('requesting')

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Browser ini belum mendukung perekaman suara. Coba Chrome atau Safari terbaru.')
      setPhase('idle')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const mimeType = preferredMimeType()
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 64_000,
      })
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        clearTimer()
        stopStream()
        const finalMime = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: finalMime })
        chunksRef.current = []
        recorderRef.current = null

        if (blob.size < 1) {
          setError('Rekaman kosong. Pastikan mikrofon aktif lalu coba lagi.')
          setPhase('idle')
          return
        }

        const url = URL.createObjectURL(blob)
        setAudio(blob)
        setPreviewUrl(url)
        setDurationMs(durationRef.current)
        setPhase('ready')
      }

      setAudio(null)
      setPreviewUrl('')
      setElapsedMs(0)
      setDurationMs(0)
      durationRef.current = 0
      recorder.start(250)
      startedAtRef.current = performance.now()
      setPhase('recording')

      timerRef.current = setInterval(() => {
        const next = performance.now() - startedAtRef.current
        setElapsedMs(Math.min(next, MAX_DURATION_MS))
        if (next >= MAX_DURATION_MS) stopRecording()
      }, 100)
    } catch (recordError) {
      stopStream()
      setPhase('idle')
      const denied =
        recordError instanceof DOMException &&
        (recordError.name === 'NotAllowedError' || recordError.name === 'SecurityError')
      setError(
        denied
          ? 'Izin mikrofon belum diberikan. Izinkan mikrofon di browser lalu coba lagi.'
          : 'Mikrofon tidak dapat digunakan. Tutup aplikasi perekam lain lalu coba lagi.'
      )
    }
  }

  const resetRecording = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setAudio(null)
    setElapsedMs(0)
    setDurationMs(0)
    setError('')
    setPhase('idle')
  }

  const submitRecording = async () => {
    if (!audio || phase !== 'ready') return
    if (audio.size > MAX_AUDIO_BYTES) {
      setError('Ukuran rekaman terlalu besar. Rekam ulang pesan yang lebih singkat.')
      return
    }

    setError('')
    setPhase('uploading')
    const clientMessageId = crypto.randomUUID()
    let reserved = false

    try {
      const reserveResponse = await fetch('/api/guest/guestbook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          eventId,
          clientMessageId,
          mimeType: audio.type.split(';', 1)[0],
          durationMs,
          note: note.trim() || undefined,
        }),
      })
      const reservation = await responseJson(reserveResponse)
      if (!reserveResponse.ok || !reservation.ok || !reservation.messageId) {
        throw new Error(reservation.error || 'Rekaman belum dapat disiapkan.')
      }

      reserved = true
      if (!reservation.alreadyReady) {
        if (!reservation.upload) throw new Error('Tautan unggah rekaman tidak tersedia.')

        const supabase = createClient()
        const { error: uploadError } = await supabase.storage
          .from(reservation.upload.bucket)
          .uploadToSignedUrl(reservation.upload.path, reservation.upload.token, audio, {
            contentType: audio.type.split(';', 1)[0],
            upsert: false,
          })
        if (uploadError) throw new Error('Rekaman gagal diunggah. Periksa koneksi lalu coba lagi.')

        const finalizeResponse = await fetch('/api/guest/guestbook', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ eventId, messageId: reservation.messageId, bytes: audio.size }),
        })
        const finalized = await responseJson(finalizeResponse)
        if (!finalizeResponse.ok || !finalized.ok) {
          throw new Error(finalized.error || 'Rekaman belum dapat disimpan.')
        }
      }

      setPhase('sent')
      router.refresh()
    } catch (submitError) {
      if (reserved) {
        await fetch('/api/guest/guestbook', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ eventId, messageId: clientMessageId }),
        }).catch(() => undefined)
      }
      setError(submitError instanceof Error ? submitError.message : 'Rekaman gagal disimpan.')
      setPhase('ready')
    }
  }

  const backPath = canSubmit ? `/a/${slug}/kamera` : `/a/${slug}/galeri`

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href={backPath} className={styles.back} aria-label="Kembali">
          <ArrowLeft size={18} />
        </Link>
        <div className={styles.topbarTitle}>
          <strong>{title}</strong>
          <span>Voice guestbook</span>
        </div>
        <span className={styles.privateMark} aria-label="Hanya untuk host">
          <LockKeyhole size={15} />
        </span>
      </header>

      <div className={styles.shell}>
        {phase === 'sent' ? (
          <section className={`${styles.card} ${styles.successCard}`}>
            <span className={styles.successIcon}>
              <Check size={28} />
            </span>
            <p className={styles.eyebrow}>Sudah tersimpan</p>
            <h1>Terima kasih, {guestName}.</h1>
            <p>Ucapanmu hanya dapat diputar oleh host acara dari dashboard mereka.</p>
            <div className={styles.successActions}>
              {canSubmit && (
                <Link href={`/a/${slug}/kamera`} className="btn btn-primary">
                  <Camera size={16} />
                  Kembali memotret
                </Link>
              )}
              <Link href={`/a/${slug}/galeri`} className="btn btn-secondary">
                <Images size={16} />
                Buka galeri
              </Link>
            </div>
          </section>
        ) : !canSubmit ? (
          <section className={`${styles.card} ${styles.closedCard}`}>
            <span className={styles.closedIcon}>
              <LockKeyhole size={24} />
            </span>
            <p className={styles.eyebrow}>Guestbook ditutup</p>
            <h1>Sesi ucapan sudah berakhir.</h1>
            <p>Host telah menutup album ini, jadi rekaman baru tidak lagi diterima.</p>
            <Link href={`/a/${slug}/galeri`} className="btn btn-secondary">
              <Images size={16} />
              Buka galeri
            </Link>
          </section>
        ) : (
          <>
            <section className={styles.hero}>
              <p className={styles.eyebrow}>Untuk {title}</p>
              <h1>Satu ucapan, langsung dari suaramu.</h1>
              <p>Maksimal 20 detik. Rekaman ini privat dan hanya dapat didengar host.</p>
            </section>

            <section className={styles.recorderCard}>
              <div
                className={`${styles.waveform} ${phase === 'recording' ? styles.waveformLive : ''}`}
                aria-hidden="true"
              >
                {Array.from({ length: 25 }, (_, index) => (
                  <span
                    key={index}
                    style={
                      {
                        '--wave-delay': `${(index % 7) * -70}ms`,
                        '--wave-height': `${22 + ((index * 17) % 62)}%`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>

              <div className={styles.timer} aria-live="polite">
                <span>{formatTimer(elapsedMs)}</span>
                <small>/ 0:20.0</small>
              </div>

              {(phase === 'ready' || phase === 'uploading') && previewUrl ? (
                <div className={styles.preview}>
                  <div className={styles.previewHeading}>
                    <Headphones size={18} />
                    <span>Dengarkan sebelum dikirim</span>
                  </div>
                  <audio controls preload="metadata" src={previewUrl} className={styles.audio} />
                </div>
              ) : (
                <button
                  type="button"
                  className={`${styles.recordButton} ${
                    phase === 'recording' ? styles.recordButtonLive : ''
                  }`}
                  onClick={phase === 'recording' ? stopRecording : () => void startRecording()}
                  disabled={phase === 'requesting' || phase === 'uploading'}
                  aria-label={phase === 'recording' ? 'Hentikan rekaman' : 'Mulai merekam'}
                >
                  {phase === 'requesting' ? (
                    <Loader2 size={28} className="animate-spin" />
                  ) : phase === 'recording' ? (
                    <Square size={25} fill="currentColor" />
                  ) : (
                    <Mic size={31} />
                  )}
                </button>
              )}

              <p className={styles.recordHint}>
                {phase === 'requesting'
                  ? 'Menunggu izin mikrofon…'
                  : phase === 'recording'
                    ? 'Sedang merekam · tekan kotak untuk selesai'
                    : phase === 'uploading'
                      ? 'Sedang menyimpan ucapanmu…'
                      : phase === 'ready'
                      ? 'Sudah cocok? Tambahkan catatan bila perlu.'
                      : 'Tekan tombol untuk mulai merekam'}
              </p>
            </section>

            {(phase === 'ready' || phase === 'uploading') && (
              <section className={styles.noteCard}>
                <div className={styles.noteHeading}>
                  <label htmlFor="guestbook-note">Catatan singkat</label>
                  <span>{note.length}/{MAX_NOTE_CHARS}</span>
                </div>
                <textarea
                  id="guestbook-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={MAX_NOTE_CHARS}
                  rows={3}
                  placeholder="Opsional, misalnya: dari teman kuliah kalian"
                  disabled={phase === 'uploading'}
                />
              </section>
            )}

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            {(phase === 'ready' || phase === 'uploading') && (
              <div className={styles.actions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetRecording}
                  disabled={phase === 'uploading'}
                >
                  <RotateCcw size={16} />
                  Rekam ulang
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void submitRecording()}
                  disabled={phase === 'uploading'}
                >
                  {phase === 'uploading' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  {phase === 'uploading' ? 'Menyimpan…' : 'Kirim ucapan'}
                </button>
              </div>
            )}

            <p className={styles.consent}>
              Dengan mengirim, kamu setuju suara dan nama tampilanmu disimpan untuk host acara ini.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
