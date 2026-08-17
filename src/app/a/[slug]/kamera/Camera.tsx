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

const PREVIEW_LONG_EDGE = 1440
const STREAM_WIDTH = 3840
const STREAM_HEIGHT = 2160

const INITIAL_PRESET = getPreset(DEFAULT_PRESET)!
const SKIN_SMOOTH = 0.25

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

interface FocusPoint {
  x: number
  y: number
  time: number
}

interface FlyingPhoto {
  src: string
  id: number
}

const SHARPNESS_OPTIONS = [
  { label: 'Alami (Lembut)', val: 0.25 },
  { label: 'Jernih & Tajam (HD)', val: 0.55 },
  { label: 'Ultra Clarity 4K', val: 0.85 },
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
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const captureRendererRef = useRef<FilmRenderer | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const loopRef = useRef<{ kind: 'raf' | 'rvfc'; id: number } | null>(null)

  const presetRef = useRef<FilmPreset>(INITIAL_PRESET)
  const [preset, setPreset] = useState<FilmPreset>(INITIAL_PRESET)

  const [phase, setPhase] = useState<Phase>({ kind: 'starting' })
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [frame, setFrame] = useState<FrameId>(DEFAULT_FRAME)
  const [softSkin, setSoftSkin] = useState(true)
  const [exposure, setExposure] = useState<number>(0.0)
  const [sharpness, setSharpness] = useState<number>(0.55)
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'sharpness'>('none')
  
  // Focus & Gesture Exposure states
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null)
  const [isDraggingExposure, setIsDraggingExposure] = useState(false)
  const dragRef = useRef<{ startY: number; startExp: number; active: boolean; pointerId: number | null }>({
    startY: 0,
    startExp: 0,
    active: false,
    pointerId: null,
  })

  const [shotsUsed, setShotsUsed] = useState(initialShotsUsed)
  const [flash, setFlash] = useState(false)
  const [shutterBounce, setShutterBounce] = useState(false)
  const [lastShot, setLastShot] = useState<string | null>(null)
  const [flyingPhoto, setFlyingPhoto] = useState<FlyingPhoto | null>(null)
  const [thumbPop, setThumbPop] = useState(false)
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(null)

  const [notice, setNotice] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null)

  useEffect(() => {
    if (notice?.kind !== 'ok') return
    const timer = setTimeout(() => setNotice(null), 2500)
    return () => clearTimeout(timer)
  }, [notice])

  // Clear focus reticle after delay when not dragging
  useEffect(() => {
    if (!focusPoint || isDraggingExposure) return
    const timer = setTimeout(() => setFocusPoint(null), 2600)
    return () => clearTimeout(timer)
  }, [focusPoint, isDraggingExposure])

  const remaining = Math.max(0, shotsLimit - shotsUsed)
  const rollEmpty = remaining === 0
  const mirror = facing === 'user'

  const exposureRef = useRef(exposure)
  exposureRef.current = exposure

  const sharpnessRef = useRef(sharpness)
  sharpnessRef.current = sharpness

  const softSkinRef = useRef(softSkin)
  softSkinRef.current = softSkin

  const mirrorRef = useRef(mirror)
  mirrorRef.current = mirror

  // --- Loop render ---------------------------------------------------------

  const drawFrame = useCallback(() => {
    const video = videoRef.current
    const renderer = rendererRef.current
    if (!video || !renderer || video.readyState < 2) return

    const { width, height } = fitWithin(video.videoWidth, video.videoHeight, PREVIEW_LONG_EDGE)
    renderer.render(video, presetRef.current, width, height, {
      mirror: mirrorRef.current,
      intensity: presetRef.current.strength,
      lumaLock: presetRef.current.lumaLock,
      contrast: presetRef.current.contrast,
      smooth: softSkinRef.current ? SKIN_SMOOTH : 0,
      exposure: exposureRef.current,
      sharpen: sharpnessRef.current,
    })
  }, [])

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
            width: { ideal: STREAM_WIDTH, min: 1280 },
            height: { ideal: STREAM_HEIGHT, min: 720 },
            frameRate: { ideal: 30, max: 60 },
          } as MediaTrackConstraints,
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

        // Check if track supports continuous focus capabilities
        if (track && 'getCapabilities' in track) {
          try {
            const capabilities = (track as unknown as { getCapabilities: () => { focusMode?: string[] } }).getCapabilities()
            if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (track as any).applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
            }
          } catch {
            // Ignore focus capability errors
          }
        }

        const canvas = canvasRef.current
        if (canvas) {
          if (!rendererRef.current) {
            rendererRef.current = new FilmRenderer(canvas)
          }
          await rendererRef.current.loadPreset(presetRef.current)
        }

        // Initialize dedicated offscreen capture renderer
        if (!captureCanvasRef.current) {
          captureCanvasRef.current = document.createElement('canvas')
          captureRendererRef.current = new FilmRenderer(captureCanvasRef.current)
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
      captureRendererRef.current?.dispose()
      captureRendererRef.current = null
      captureCanvasRef.current = null
    }
  }, [facing])

  // --- Tap-to-Focus & Drag Exposure Gesture --------------------------------

  const handlePointerDown = useCallback(
    async (e: React.PointerEvent<HTMLDivElement>) => {
      if (phase.kind !== 'live') return

      const target = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - target.left) / target.width) * 100
      const y = ((e.clientY - target.top) / target.height) * 100

      setFocusPoint({ x, y, time: Date.now() })
      dragRef.current = {
        startY: e.clientY,
        startExp: exposure,
        active: true,
        pointerId: e.pointerId,
      }

      // Haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(15)
        } catch {}
      }

      // Hardware focus request if supported
      const track = streamRef.current?.getVideoTracks()[0]
      if (track) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (track as any).applyConstraints({
            advanced: [
              {
                focusMode: 'continuous',
                pointsOfInterest: [{ x: x / 100, y: y / 100 }],
              },
            ],
          })
        } catch {}
      }
    },
    [phase.kind, exposure]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return

      const deltaY = dragRef.current.startY - e.clientY
      if (Math.abs(deltaY) > 5) {
        if (!isDraggingExposure) setIsDraggingExposure(true)
        
        // 90px drag delta = 1.0 EV change
        const rawDeltaExp = deltaY / 90
        const newExp = Math.max(-1.4, Math.min(1.4, dragRef.current.startExp + rawDeltaExp))
        const roundedExp = Math.round(newExp * 10) / 10
        setExposure(roundedExp)
      }
    },
    [isDraggingExposure]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId === e.pointerId) {
      dragRef.current.active = false
      dragRef.current.pointerId = null
      setIsDraggingExposure(false)
    }
  }, [])

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

  // --- Background Upload Worker (Non-blocking) ------------------------------

  const uploadInBackground = useCallback(
    async (
      bitmap: ImageBitmap,
      shotPreset: FilmPreset,
      shotFrame: FrameId,
      shotOptions: { mirror?: boolean; smooth?: number; exposure?: number; sharpen?: number }
    ) => {
      let photoId: string | null = null
      try {
        let renderer = captureRendererRef.current
        if (!renderer) {
          if (!captureCanvasRef.current) captureCanvasRef.current = document.createElement('canvas')
          renderer = new FilmRenderer(captureCanvasRef.current)
          captureRendererRef.current = renderer
        }

        const size = captureSize(bitmap.width, bitmap.height)
        const claimPromise = fetch('/api/guest/shot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            preset: shotPreset.id,
            frame: shotFrame,
            width: size.width,
            height: size.height,
          }),
        })

        const shot = await processCapture(renderer, bitmap, shotPreset, shotOptions)
        const claim = await claimPromise
        const claimBody = await claim.json()

        if (!claim.ok) {
          if (typeof claimBody.shotsUsed === 'number') setShotsUsed(claimBody.shotsUsed)
          throw new Error(claimBody.error ?? 'Gagal memesan slot jepretan.')
        }

        photoId = claimBody.photoId as string

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
      } catch (err) {
        console.error('Background upload error:', err)
        // Rollback optimistic count
        setShotsUsed((n) => Math.max(0, n - 1))
        setNotice({
          text: err instanceof Error ? err.message : 'Jepretan gagal diunggah.',
          kind: 'error',
        })
      } finally {
        bitmap.close()
        if (photoId) {
          try {
            await fetch('/api/guest/shot', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventId, photoId }),
            })
          } catch {}
        }
      }
    },
    [eventId]
  )

  // --- Menjepret Instan (0-Latency Optimistic Capture) ----------------------

  const capture = useCallback(async () => {
    if (shutterBounce || rollEmpty || phase.kind !== 'live') return
    const video = videoRef.current
    if (!video || video.readyState < 2) return

    // 1. Shutter bounce & sensory feedback
    setShutterBounce(true)
    setTimeout(() => setShutterBounce(false), 220)
    setFlash(true)
    playShutterSound()
    setTimeout(() => setFlash(false), 180)

    // 2. Instant visual snapshot from live canvas
    let instantSnapshot = ''
    const liveCanvas = canvasRef.current
    if (liveCanvas) {
      try {
        instantSnapshot = liveCanvas.toDataURL('image/jpeg', 0.85)
      } catch {
        // Ignore canvas export errors
      }
    }

    // 3. Trigger flying photo animation to gallery slot
    if (instantSnapshot) {
      setFlyingPhoto({ src: instantSnapshot, id: Date.now() })
      setTimeout(() => {
        setLastShot(instantSnapshot)
        setThumbPop(true)
        setTimeout(() => setThumbPop(false), 450)
        setFlyingPhoto(null)
      }, 550)
    }

    // 4. Optimistic roll counter increment
    setShotsUsed((prev) => prev + 1)

    // 5. Capture bitmap and delegate to background upload worker
    try {
      const bitmap = await videoToBitmap(video)
      void uploadInBackground(bitmap, presetRef.current, frame, {
        mirror,
        smooth: softSkin ? SKIN_SMOOTH : 0,
        exposure,
        sharpen: sharpness,
      })
    } catch (err) {
      console.error('Bitmap grab error:', err)
    }
  }, [shutterBounce, rollEmpty, phase.kind, playShutterSound, uploadInBackground, frame, mirror, softSkin, exposure, sharpness])

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

  const controlsLocked = phase.kind !== 'live'

  return (
    <main className={styles.page}>
      <div
        className={styles.stage}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} playsInline muted className={styles.video} />

        <div
          className={`${styles.framed} ${framePreview ? styles.framedOn : ''}`}
          style={framePreview?.containerStyle}
        >
          <canvas ref={canvasRef} className={styles.canvas} />

          {/* Tap-to-Focus Reticle with Interactive Sun Exposure Slider */}
          {focusPoint && (
            <div
              key={focusPoint.time}
              className={`${styles.focusReticle} ${isDraggingExposure ? styles.focusReticleActive : ''}`}
              style={{ left: `${focusPoint.x}%`, top: `${focusPoint.y}%` }}
            >
              {/* Focus Box */}
              <div className={styles.focusBox}>
                <div className={styles.focusCenterDot} />
              </div>

              {/* Native Smartphone-like Sun Exposure Slider */}
              <div className={styles.sunSliderTrack}>
                <div className={styles.sunSliderLine} />
                <div
                  className={styles.sunIconWrapper}
                  style={{
                    transform: `translateY(${-exposure * 24}px)`,
                  }}
                >
                  <Sun size={18} className={styles.sunIcon} />
                  {isDraggingExposure && (
                    <span className={styles.sunEvBadge}>
                      {exposure > 0 ? `+${exposure.toFixed(1)}` : exposure.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

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

        {/* Flying Photo to Gallery Animation */}
        {flyingPhoto && (
          <div className={styles.flyingPhotoContainer}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={flyingPhoto.id}
              src={flyingPhoto.src}
              alt="Foto yang baru dijepret"
              className={styles.flyingPhoto}
            />
          </div>
        )}

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
        {/* Floating Adjust Drawer (Sharpness) */}
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

        {/* Quick Tools Row (Penajaman & Kulit Halus) */}
        <div className={styles.toolBar}>
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
            className={`${styles.thumbSlot} ${thumbPop ? styles.thumbSlotPop : ''}`}
            aria-label="Buka galeri"
          >
            {lastShot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lastShot} alt="Galeri foto" className={styles.thumb} />
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
            <span className={styles.shutterDot} />
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
