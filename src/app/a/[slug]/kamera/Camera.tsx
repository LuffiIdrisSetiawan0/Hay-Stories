'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Images, Loader2, Sparkles, SwitchCamera, Sun, Zap } from 'lucide-react'
import { DEFAULT_PRESET, FILM_PRESETS, getPreset, type FilmPreset } from '@/lib/catalog'
import {
  DEFAULT_FRAME,
  PHOTO_FRAMES,
  cropRect,
  frameTimestamp,
  getFrame,
  type FrameId,
} from '@/lib/frames'
import { FilmRenderer, captureSize, fitWithin, processCapture, videoToBitmap } from '@/lib/film'
import { createClient } from '@/lib/supabase/client'
import styles from './Camera.module.css'

const PREVIEW_LONG_EDGE = 900
const STREAM_WIDTH = 2560
const STREAM_HEIGHT = 1440

const INITIAL_PRESET = getPreset(DEFAULT_PRESET)!
const SKIN_SMOOTH = 0.65

type Phase =
  | { kind: 'starting' }
  | { kind: 'live' }
  | { kind: 'blocked'; title: string; body: string }

interface Props {
  eventId: string
  slug: string
  title: string
  guestName: string
  shotsUsed: number
  shotsLimit: number
}

const EXPOSURE_OPTIONS = [
  { label: 'Redup -0.5 EV', val: -0.5 },
  { label: 'Normal 0 EV', val: 0.0 },
  { label: 'Terang +0.4 EV', val: 0.4 },
  { label: 'Indoor Boost +0.8 EV', val: 0.8 },
] as const

const SHARPNESS_OPTIONS = [
  { label: 'Alami (Lembut)', val: 0.15 },
  { label: 'Tajam (Standar HD)', val: 0.45 },
  { label: 'Ultra Detail', val: 0.80 },
] as const

export default function Camera({
  eventId,
  slug,
  title,
  guestName,
  shotsUsed: initialShotsUsed,
  shotsLimit,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<FilmRenderer | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const loopRef = useRef<{ kind: 'raf' | 'rvfc'; id: number } | null>(null)

  const presetRef = useRef<FilmPreset>(INITIAL_PRESET)
  const [preset, setPreset] = useState<FilmPreset>(INITIAL_PRESET)

  const [phase, setPhase] = useState<Phase>({ kind: 'starting' })
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [frame, setFrame] = useState<FrameId>(DEFAULT_FRAME)
  const [softSkin, setSoftSkin] = useState(true)
  const [exposure, setExposure] = useState<number>(0.0)
  const [sharpness, setSharpness] = useState<number>(0.45)
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'exposure' | 'sharpness'>('none')

  const [shotsUsed, setShotsUsed] = useState(initialShotsUsed)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(false)
  const [lastShot, setLastShot] = useState<string | null>(null)
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(null)

  const [notice, setNotice] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null)

  useEffect(() => {
    if (notice?.kind !== 'ok') return
    const timer = setTimeout(() => setNotice(null), 2200)
    return () => clearTimeout(timer)
  }, [notice])

  const remaining = Math.max(0, shotsLimit - shotsUsed)
  const rollEmpty = remaining === 0
  const mirror = facing === 'user'

  // --- Loop render ---------------------------------------------------------

  const drawFrame = useCallback(() => {
    const video = videoRef.current
    const renderer = rendererRef.current
    if (!video || !renderer || video.readyState < 2) return

    const { width, height } = fitWithin(video.videoWidth, video.videoHeight, PREVIEW_LONG_EDGE)
    renderer.render(video, presetRef.current, width, height, {
      mirror,
      intensity: presetRef.current.strength,
      lumaLock: presetRef.current.lumaLock,
      contrast: presetRef.current.contrast,
      smooth: softSkin ? SKIN_SMOOTH : 0,
      exposure,
      sharpen: sharpness,
    })
  }, [mirror, softSkin, exposure, sharpness])

  const stopLoop = useCallback(() => {
    const loop = loopRef.current
    if (!loop) return
    if (loop.kind === 'raf') cancelAnimationFrame(loop.id)
    else videoRef.current?.cancelVideoFrameCallback(loop.id)
    loopRef.current = null
  }, [])

  const startLoop = useCallback(() => {
    stopLoop()
    const video = videoRef.current
    if (!video) return

    if (typeof video.requestVideoFrameCallback === 'function') {
      const tick = () => {
        drawFrame()
        loopRef.current = { kind: 'rvfc', id: video.requestVideoFrameCallback(tick) }
      }
      loopRef.current = { kind: 'rvfc', id: video.requestVideoFrameCallback(tick) }
    } else {
      const tick = () => {
        drawFrame()
        loopRef.current = { kind: 'raf', id: requestAnimationFrame(tick) }
      }
      loopRef.current = { kind: 'raf', id: requestAnimationFrame(tick) }
    }
  }, [drawFrame, stopLoop])

  // --- Menyalakan kamera ---------------------------------------------------

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setPhase({
          kind: 'blocked',
          title: 'Kamera tidak didukung',
          body: 'Browser ini tidak mengizinkan akses kamera, atau halaman dibuka tanpa HTTPS.',
        })
        return
      }

      setPhase({ kind: 'starting' })

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: STREAM_WIDTH },
            height: { ideal: STREAM_HEIGHT },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = stream

        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        await video.play()

        if (cancelled) return

        const track = stream.getVideoTracks()[0]
        const settings = track?.getSettings()
        const w = settings?.width ?? video.videoWidth
        const h = settings?.height ?? video.videoHeight
        if (w && h) setVideoSize({ w, h })

        const canvas = canvasRef.current
        if (canvas) {
          if (!rendererRef.current) {
            rendererRef.current = new FilmRenderer(canvas)
          }
          await rendererRef.current.loadPreset(presetRef.current)
        }

        setPhase({ kind: 'live' })
        startLoop()
      } catch (err) {
        if (cancelled) return
        const name = (err as { name?: string })?.name ?? ''
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setPhase({
            kind: 'blocked',
            title: 'Izin kamera ditolak',
            body: 'Izinkan akses kamera di pengaturan browsermu untuk mulai menjepret.',
          })
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setPhase({
            kind: 'blocked',
            title: 'Kamera tidak ditemukan',
            body: 'Perangkat ini tidak memiliki kamera yang bisa dipakai.',
          })
        } else {
          setPhase({
            kind: 'blocked',
            title: 'Kamera gagal dinyalakan',
            body: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      stopLoop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [facing, startLoop, stopLoop])

  // --- Mengganti preset ----------------------------------------------------

  const changePreset = useCallback(
    async (next: FilmPreset) => {
      setPreset(next)
      const renderer = rendererRef.current
      if (!renderer) {
        presetRef.current = next
        return
      }
      try {
        await renderer.loadPreset(next)
        presetRef.current = next
      } catch {
        // Gagal memuat LUT
      }
    },
    []
  )

  // --- Suara rana ----------------------------------------------------------

  const playShutterSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const now = ctx.currentTime

      const clickOsc = ctx.createOscillator()
      const clickGain = ctx.createGain()
      clickOsc.type = 'square'
      clickOsc.frequency.setValueAtTime(800, now)
      clickOsc.frequency.exponentialRampToValueAtTime(80, now + 0.04)
      clickGain.gain.setValueAtTime(0.3, now)
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
      clickOsc.connect(clickGain).connect(ctx.destination)
      clickOsc.start(now)
      clickOsc.stop(now + 0.04)

      const bufferSize = ctx.sampleRate * 0.18
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04))
      }
      const whiteNoise = ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 1800
      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(0.2, now + 0.05)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
      whiteNoise.connect(filter).connect(noiseGain).connect(ctx.destination)
      whiteNoise.start(now + 0.05)
    } catch {
      // AudioContext diblokir autoplay policy
    }
  }, [])

  // --- Menjepret -----------------------------------------------------------

  const capture = useCallback(async () => {
    if (busy || rollEmpty || phase.kind !== 'live') return
    const video = videoRef.current
    const renderer = rendererRef.current
    if (!video || !renderer || video.readyState < 2) return

    setBusy(true)
    stopLoop()

    setFlash(true)
    playShutterSound()
    setTimeout(() => setFlash(false), 200)

    let photoId: string | null = null

    try {
      const size = captureSize(video.videoWidth, video.videoHeight)
      const claimPromise = fetch('/api/guest/shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          preset: presetRef.current.id,
          frame,
          width: size.width,
          height: size.height,
        }),
      })

      const bitmap = await videoToBitmap(video)
      let shot
      try {
        shot = await processCapture(renderer, bitmap, presetRef.current, {
          mirror,
          smooth: softSkin ? SKIN_SMOOTH : 0,
          exposure,
          sharpen: sharpness,
        })
      } finally {
        bitmap.close()
      }

      const claim = await claimPromise
      const claimBody = await claim.json()

      if (!claim.ok) {
        if (typeof claimBody.shotsUsed === 'number') setShotsUsed(claimBody.shotsUsed)
        setNotice({ text: claimBody.error ?? 'Gagal menyiapkan jepretan.', kind: 'error' })
        return
      }

      photoId = claimBody.photoId as string
      setShotsUsed(claimBody.shotsUsed)

      const supabase = createClient()
      const uploads = await Promise.all([
        supabase.storage
          .from('photos')
          .uploadToSignedUrl(claimBody.full.path, claimBody.full.token, shot.full, {
            contentType: 'image/jpeg',
          }),
        supabase.storage
          .from('photos')
          .uploadToSignedUrl(claimBody.thumb.path, claimBody.thumb.token, shot.thumb, {
            contentType: 'image/jpeg',
          }),
      ])

      const failed = uploads.find((u) => u.error)
      if (failed) throw new Error(failed.error?.message ?? 'Unggahan gagal.')

      const confirm = await fetch('/api/guest/shot', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, photoId, bytes: shot.full.size }),
      })

      if (!confirm.ok) throw new Error('Foto terunggah tapi gagal dicatat.')

      photoId = null
      setLastShot(URL.createObjectURL(shot.thumb))
      setNotice({ text: 'Tersimpan.', kind: 'ok' })
    } catch (err) {
      setNotice({
        text: err instanceof Error ? err.message : 'Jepretan gagal disimpan.',
        kind: 'error',
      })
    } finally {
      if (photoId) {
        try {
          await fetch('/api/guest/shot', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, photoId }),
          })
          setShotsUsed((n) => Math.max(0, n - 1))
        } catch {
          // Jaringan terputus
        }
      }

      setBusy(false)
      startLoop()
    }
  }, [busy, eventId, exposure, frame, mirror, phase.kind, playShutterSound, rollEmpty, sharpness, softSkin, startLoop, stopLoop])

  const framePreview = (() => {
    const f = getFrame(frame)
    if (!f || f.id === 'none' || !videoSize) return null

    const rect = cropRect(videoSize.w, videoSize.h, f.ratio)
    const ratio = rect.sw / rect.sh
    const minSide = Math.min(rect.sw, rect.sh)
    const bandHeight = (f.sprockets ? 0.09 : 0) * 100

    return {
      frame: f,
      containerStyle: {
        aspectRatio: String(ratio),
        maxWidth: `calc(100dvh * ${ratio})`,
        padding: `${((f.pad.top * minSide) / rect.sh) * 100}% ${((f.pad.right * minSide) / rect.sw) * 100}% ${((f.pad.bottom * minSide) / rect.sh) * 100}% ${((f.pad.left * minSide) / rect.sw) * 100}%`,
        backgroundColor: f.background,
      } as React.CSSProperties,
      bandStyle: {
        height: `${bandHeight}%`,
      } as React.CSSProperties,
    }
  })()

  const controlsLocked = busy || phase.kind !== 'live'

  return (
    <main className={styles.page}>
      <div className={styles.stage}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} playsInline muted className={styles.video} />

        <div
          className={`${styles.framed} ${framePreview ? styles.framedOn : ''}`}
          style={framePreview?.containerStyle}
        >
          <canvas ref={canvasRef} className={styles.canvas} />

          {framePreview?.frame.sprockets && (
            <>
              <div
                className={`${styles.sprockets} ${styles.sprocketsTop}`}
                style={framePreview.bandStyle}
              />
              <div
                className={`${styles.sprockets} ${styles.sprocketsBottom}`}
                style={framePreview.bandStyle}
              />
            </>
          )}

          {framePreview?.frame.caption && (
            <span className={styles.frameCaption}>
              <span className={styles.frameTitle}>{title}</span>
              <span className={styles.frameStamp}>{frameTimestamp()}</span>
            </span>
          )}
        </div>

        {flash && <div className={styles.flash} />}

        {phase.kind === 'starting' && (
          <div className={styles.overlay}>
            <Loader2 size={22} className="animate-spin" />
            <p className={styles.overlayBody}>Menyalakan kamera…</p>
          </div>
        )}

        {phase.kind === 'blocked' && (
          <div className={styles.overlay}>
            <p className={styles.overlayTitle}>{phase.title}</p>
            <p className={styles.overlayBody}>{phase.body}</p>
          </div>
        )}

        {rollEmpty && phase.kind === 'live' && (
          <div className={styles.overlay}>
            <p className={styles.overlayTitle}>Roll filmmu habis</p>
            <p className={styles.overlayBody}>
              Semua {shotsLimit} jepretan sudah terpakai.
            </p>
            <Link href={`/a/${slug}/galeri`} className="btn btn-accent">
              <Images size={16} />
              Lihat galeri
            </Link>
          </div>
        )}
      </div>

      <header className={styles.bar}>
        <Link href={`/a/${slug}`} className={styles.iconBtn} aria-label="Kembali">
          <ArrowLeft size={18} />
        </Link>

        <Link href={`/a/${slug}?ganti=1`} className={styles.barTitle}>
          <span className={styles.eventName}>{title}</span>
          <span className={styles.guestName}>{guestName}</span>
        </Link>

        <span className={styles.counter} aria-label={`${remaining} jepretan tersisa`}>
          <strong>{remaining}</strong>
          <span className={styles.counterMax}>/{shotsLimit}</span>
        </span>
      </header>

      {notice && (
        <p
          className={`${styles.toast} ${notice.kind === 'error' ? styles.toastError : ''}`}
          role="status"
        >
          {notice.text}
        </p>
      )}

      <div className={styles.dock}>
        {/* Floating Adjust Drawer (Exposure or Sharpness) */}
        {activeDrawer === 'exposure' && (
          <div className={styles.adjustDrawer}>
            {EXPOSURE_OPTIONS.map((opt) => (
              <button
                key={opt.val}
                type="button"
                className={`${styles.adjustOption} ${exposure === opt.val ? styles.adjustOptionActive : ''}`}
                onClick={() => setExposure(opt.val)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {activeDrawer === 'sharpness' && (
          <div className={styles.adjustDrawer}>
            {SHARPNESS_OPTIONS.map((opt) => (
              <button
                key={opt.val}
                type="button"
                className={`${styles.adjustOption} ${sharpness === opt.val ? styles.adjustOptionActive : ''}`}
                onClick={() => setSharpness(opt.val)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Quick Tools Row (Pencahayaan, Penajaman, Kulit Halus) */}
        <div className={styles.toolBar}>
          <button
            type="button"
            className={`${styles.toolBtn} ${exposure !== 0.0 || activeDrawer === 'exposure' ? styles.toolBtnActive : ''}`}
            onClick={() => setActiveDrawer((prev) => (prev === 'exposure' ? 'none' : 'exposure'))}
            title="Atur pencahayaan kamera"
          >
            <Sun size={14} />
            <span>{exposure === 0.0 ? 'Cahaya' : `${exposure > 0 ? '+' : ''}${exposure.toFixed(1)} EV`}</span>
          </button>

          <button
            type="button"
            className={`${styles.toolBtn} ${sharpness !== 0.15 || activeDrawer === 'sharpness' ? styles.toolBtnActive : ''}`}
            onClick={() => setActiveDrawer((prev) => (prev === 'sharpness' ? 'none' : 'sharpness'))}
            title="Atur ketajaman kamera"
          >
            <Zap size={14} />
            <span>{sharpness >= 0.7 ? 'Ultra-HD' : sharpness >= 0.4 ? 'Tajam' : 'Alami'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSoftSkin((v) => !v)}
            disabled={controlsLocked}
            className={`${styles.toolBtn} ${softSkin ? styles.toolBtnActive : ''}`}
            title="Penghalusan kulit"
          >
            <Sparkles size={14} />
            <span>{softSkin ? 'Kulit Halus' : 'Kulit Asli'}</span>
          </button>
        </div>

        {/* Pemilih Bingkai */}
        <div className={styles.rolls} role="group" aria-label="Pilih bingkai">
          {PHOTO_FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFrame(f.id)}
              aria-pressed={f.id === frame}
              disabled={busy}
              title={f.hint}
              className={`${styles.roll} ${f.id === frame ? styles.rollActive : ''}`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Pemilih Roll Film */}
        <div className={styles.rolls} role="group" aria-label="Pilih roll film">
          {FILM_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => changePreset(p)}
              aria-pressed={p.id === preset.id}
              disabled={busy}
              className={`${styles.roll} ${p.id === preset.id ? styles.rollActive : ''}`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Tombol Shutter & Balik Kamera */}
        <div className={styles.controls}>
          <Link
            href={`/a/${slug}/galeri`}
            className={styles.thumbSlot}
            aria-label="Buka galeri"
          >
            {lastShot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lastShot} alt="" className={styles.thumb} />
            ) : (
              <Images size={18} />
            )}
          </Link>

          <button
            type="button"
            onClick={capture}
            disabled={controlsLocked || rollEmpty}
            className={styles.shutter}
            aria-label="Jepret"
          >
            {busy ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <span className={styles.shutterDot} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
            disabled={controlsLocked}
            className={styles.iconBtn}
            aria-label="Balik kamera"
            title="Balik kamera depan/belakang"
          >
            <SwitchCamera size={20} />
          </button>
        </div>
      </div>
    </main>
  )
}
