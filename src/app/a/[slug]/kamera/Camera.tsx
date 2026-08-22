'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Focus,
  Frame,
  Images,
  Loader2,
  Mic,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  SwitchCamera,
  Sun,
} from 'lucide-react'
import { DEFAULT_PRESET, FILM_PRESETS, getPreset, type FilmPreset } from '@/lib/catalog'
import {
  DEFAULT_FRAME,
  PHOTO_FRAMES,
  framedSize,
  frameTimestamp,
  getFrame,
  type FrameId,
} from '@/lib/frames'
import {
  FilmRenderer,
  FilmUnsupportedError,
  assertUsableJpeg,
  captureBestFrame,
  fitWithin,
  processCapture,
  processNaturalCapture,
  type ProcessedCapture,
} from '@/lib/film'
import { createClient } from '@/lib/supabase/client'
import styles from './Camera.module.css'

/**
 * Tangga resolusi viewfinder. Foto tersimpan dirender ulang oleh renderer
 * terpisah pada resolusi sensor penuh, jadi menurunkan tingkat di sini tidak
 * pernah menyentuh kualitas hasil jepretan — hanya kehalusan preview.
 */
const PREVIEW_LADDER = [1080, 864, 720, 600]
/** Turun satu tingkat setelah ~0,7 detik konsisten tersendat. */
const SLOW_FRAMES_BEFORE_DOWNGRADE = 20
/** Naik hanya setelah ~5 detik lancar, supaya tidak berosilasi. */
const FAST_FRAMES_BEFORE_UPGRADE = 150
const STREAM_WIDTH = 4096
const STREAM_HEIGHT = 3072
const MAX_ACTIVE_JOBS = 2
const SKIN_SMOOTH = 0.14

const INITIAL_PRESET = getPreset(DEFAULT_PRESET)!
const NATURAL_PRESET = getPreset('natural-clean')!

type Phase =
  | { kind: 'starting' }
  | { kind: 'live' }
  | { kind: 'blocked'; title: string; body: string }

type Panel = 'none' | 'looks' | 'frames' | 'adjust'

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

interface CameraInfo {
  width: number
  height: number
  source: 'photo' | 'video' | null
  outputWidth?: number
  outputHeight?: number
}

interface ExtendedCapabilities {
  focusMode?: string[]
  whiteBalanceMode?: string[]
  exposureMode?: string[]
  exposureCompensation?: { min: number; max: number; step: number }
  pointsOfInterest?: unknown
}

interface ShotOptions {
  mirror: boolean
  smooth: number
  exposure: number
  sharpen: number
  grainSeed?: number
  sensorExposure?: number | null
}

const SHARPNESS_OPTIONS = [
  { label: 'Lembut', hint: 'Minim halo, cocok untuk low-light', value: 0.1 },
  { label: 'Seimbang', hint: 'Detail alami untuk pemakaian umum', value: 0.18 },
  { label: 'Tajam', hint: 'Untuk cahaya terang dan detail dekorasi', value: 0.32 },
] as const

async function requestCamera(facing: 'environment' | 'user'): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facing },
        width: { ideal: STREAM_WIDTH },
        height: { ideal: STREAM_HEIGHT },
        aspectRatio: { ideal: 4 / 3 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    })
  } catch (error) {
    const name = (error as { name?: string }).name
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'NotFoundError') {
      throw error
    }

    // Constraint kualitas hanyalah preferensi. Kamera lama tetap harus bisa
    // dipakai daripada ditolak hanya karena tidak memenuhi resolusi ideal.
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing } },
      audio: false,
    })
  }
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>
}

async function confirmWithRetry(eventId: string, photoId: string, bytes: number) {
  let lastError = 'Foto terunggah tetapi belum berhasil dikonfirmasi.'

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('/api/guest/shot', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, photoId, bytes }),
      })
      if (response.ok) return
      const body = await responseJson(response)
      lastError = typeof body.error === 'string' ? body.error : lastError
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError
    }

    if (attempt < 2) {
      await new Promise((resolve) => window.setTimeout(resolve, 300 * 2 ** attempt))
    }
  }

  throw new Error(lastError)
}

async function claimWithRetry(payload: Record<string, unknown>) {
  let lastError: Error = new Error('Jaringan terputus saat menyiapkan penyimpanan.')

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('/api/guest/shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await responseJson(response)
      if (response.status < 500 || attempt === 2) return { response, body }
      lastError = new Error(
        typeof body.error === 'string' ? body.error : 'Server belum siap menerima foto.'
      )
    } catch (error) {
      lastError = error instanceof Error ? error : lastError
    }

    await new Promise((resolve) => window.setTimeout(resolve, 350 * 2 ** attempt))
  }

  throw lastError
}

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
  const previewSourceRef = useRef<{
    canvas: HTMLCanvasElement
    context: CanvasRenderingContext2D
  } | null>(null)
  const rendererRef = useRef<FilmRenderer | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const captureRendererRef = useRef<FilmRenderer | null>(null)
  const blockingOverlayRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const loopRef = useRef<{ kind: 'raf' | 'rvfc'; id: number } | null>(null)
  const previewTierRef = useRef(0)
  const frameClockRef = useRef({ last: 0, ema: 0, slow: 0, fast: 0 })
  const frameBudgetRef = useRef(1000 / 30)
  const mountedRef = useRef(true)
  const fallback2dRef = useRef(false)
  const presetRef = useRef<FilmPreset>(INITIAL_PRESET)
  const presetRequestRef = useRef(0)
  const presetLoadingRef = useRef(false)
  const presetQueueRef = useRef<Promise<void>>(Promise.resolve())
  const processingQueueRef = useRef<Promise<void>>(Promise.resolve())
  const activeJobsRef = useRef(0)
  const captureGateRef = useRef(false)
  const shotsUsedRef = useRef(initialShotsUsed)
  const lastShotUrlRef = useRef<string | null>(null)
  const sensorExposureRef = useRef(false)
  const sensorExposureValueRef = useRef(0)
  const exposureUiRef = useRef(0)
  const exposureRangeRef = useRef<{ min: number; max: number; step: number } | null>(null)
  const exposureRequestRef = useRef(0)
  const exposureQueueRef = useRef<Promise<void>>(Promise.resolve())
  const recipeRef = useRef<ShotOptions>({
    mirror: false,
    smooth: 0,
    exposure: 0,
    sharpen: 0.18,
  })

  const [phase, setPhase] = useState<Phase>({ kind: 'starting' })
  const [filmAvailable, setFilmAvailable] = useState(true)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [cameraAttempt, setCameraAttempt] = useState(0)
  const [preset, setPreset] = useState<FilmPreset>(INITIAL_PRESET)
  const [presetLoading, setPresetLoading] = useState<string | null>(null)
  const [frame, setFrame] = useState<FrameId>(DEFAULT_FRAME)
  const [softSkin, setSoftSkin] = useState(false)
  const [exposure, setExposure] = useState(0)
  const [sharpness, setSharpness] = useState(0.18)
  const [activePanel, setActivePanel] = useState<Panel>('none')
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null)
  const [isDraggingExposure, setIsDraggingExposure] = useState(false)
  const [shotsUsed, setShotsUsed] = useState(initialShotsUsed)
  const [pendingJobs, setPendingJobs] = useState(0)
  const [capturing, setCapturing] = useState(false)
  const [flash, setFlash] = useState(false)
  const [lastShot, setLastShot] = useState<string | null>(null)
  const [flyingPhoto, setFlyingPhoto] = useState<FlyingPhoto | null>(null)
  const [thumbPop, setThumbPop] = useState(false)
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(null)
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null)
  const [notice, setNotice] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null)

  const dragRef = useRef<{
    startY: number
    startExp: number
    active: boolean
    pointerId: number | null
  }>({ startY: 0, startExp: 0, active: false, pointerId: null })

  const mirror = facing === 'user'
  const remaining = Math.max(0, shotsLimit - shotsUsed)
  const rollEmpty = remaining === 0

  useEffect(() => {
    exposureUiRef.current = exposure
    recipeRef.current = {
      mirror,
      smooth: softSkin ? SKIN_SMOOTH : 0,
      exposure: sensorExposureRef.current ? 0 : exposure,
      sharpen: sharpness,
    }
  }, [exposure, mirror, sharpness, softSkin])

  useEffect(() => {
    if (!notice || notice.kind !== 'ok') return
    const timer = window.setTimeout(() => setNotice(null), 2600)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!focusPoint || isDraggingExposure) return
    const timer = window.setTimeout(() => setFocusPoint(null), 2400)
    return () => window.clearTimeout(timer)
  }, [focusPoint, isDraggingExposure])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (activeJobsRef.current === 0) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const setAuthoritativeShots = useCallback((next: number | ((current: number) => number)) => {
    setShotsUsed((current) => {
      const value = typeof next === 'function' ? next(current) : next
      shotsUsedRef.current = value
      return value
    })
  }, [])

  const beginJob = useCallback(() => {
    activeJobsRef.current += 1
    setPendingJobs(activeJobsRef.current)
  }, [])

  const finishJob = useCallback(() => {
    activeJobsRef.current = Math.max(0, activeJobsRef.current - 1)
    if (mountedRef.current) setPendingJobs(activeJobsRef.current)
  }, [])

  const activateCompatibilityMode = useCallback((text: string) => {
    fallback2dRef.current = true
    presetRequestRef.current += 1
    presetLoadingRef.current = false
    rendererRef.current?.dispose()
    rendererRef.current = null
    presetRef.current = NATURAL_PRESET
    if (!mountedRef.current) return
    setFilmAvailable(false)
    setPresetLoading(null)
    setPreset(NATURAL_PRESET)
    setNotice({ kind: 'error', text })
  }, [])

  const resetFrameClock = useCallback(() => {
    frameClockRef.current = { last: 0, ema: 0, slow: 0, fast: 0 }
  }, [])

  /**
   * Interval antar frame yang melar berarti GPU tidak sanggup pada resolusi
   * viewfinder saat ini. Turunkan satu tingkat daripada membiarkan preview
   * patah-patah, lalu naikkan lagi begitu perangkat terbukti lancar.
   */
  const trackPreviewPace = useCallback(() => {
    const clock = frameClockRef.current
    const now = performance.now()
    const previous = clock.last
    clock.last = now
    if (previous === 0) return

    const delta = now - previous
    // Lompatan sebesar ini berarti halaman sempat tidak terlihat, bukan GPU lambat.
    if (delta > 500) {
      clock.ema = 0
      clock.slow = 0
      clock.fast = 0
      return
    }

    clock.ema = clock.ema === 0 ? delta : clock.ema * 0.85 + delta * 0.15
    const budget = frameBudgetRef.current

    if (clock.ema > budget * 1.25) {
      clock.fast = 0
      clock.slow += 1
      if (
        clock.slow >= SLOW_FRAMES_BEFORE_DOWNGRADE &&
        previewTierRef.current < PREVIEW_LADDER.length - 1
      ) {
        previewTierRef.current += 1
        resetFrameClock()
      }
      return
    }

    if (clock.ema < budget * 1.1) {
      clock.slow = 0
      clock.fast += 1
      if (clock.fast >= FAST_FRAMES_BEFORE_UPGRADE && previewTierRef.current > 0) {
        previewTierRef.current -= 1
        resetFrameClock()
      }
      return
    }

    clock.slow = 0
    clock.fast = 0
  }, [resetFrameClock])

  const drawFallbackFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return
    const size = fitWithin(video.videoWidth, video.videoHeight, PREVIEW_LADDER[previewTierRef.current])
    if (canvas.width !== size.width || canvas.height !== size.height) {
      canvas.width = size.width
      canvas.height = size.height
    }
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#090807'
    ctx.fillRect(0, 0, size.width, size.height)
    if (recipeRef.current.mirror) {
      ctx.translate(size.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.filter = `brightness(${2 ** recipeRef.current.exposure})`
    ctx.drawImage(video, 0, 0, size.width, size.height)
    ctx.restore()
  }, [])

  const downscalePreviewFrame = useCallback(
    (video: HTMLVideoElement, width: number, height: number): HTMLCanvasElement => {
      let source = previewSourceRef.current
      if (!source) {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { alpha: false, desynchronized: true })
        if (!context) throw new Error('Canvas preview tidak tersedia.')
        source = { canvas, context }
        previewSourceRef.current = source
      }

      if (source.canvas.width !== width || source.canvas.height !== height) {
        source.canvas.width = width
        source.canvas.height = height
        source.context.imageSmoothingEnabled = true
        // Preview bergerak lebih diuntungkan oleh latensi rendah. Renderer foto
        // tersimpan tetap memakai resize high-quality pada bitmap sensor penuh.
        source.context.imageSmoothingQuality = 'low'
      }

      source.context.drawImage(video, 0, 0, width, height)
      return source.canvas
    },
    []
  )

  const drawFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    if (fallback2dRef.current) {
      drawFallbackFrame()
      return
    }

    const renderer = rendererRef.current
    if (!renderer || presetLoadingRef.current) return
    const size = fitWithin(video.videoWidth, video.videoHeight, PREVIEW_LADDER[previewTierRef.current])
    try {
      // Kamera belakang lazim memberi frame 4K. Mengirim video mentah ke WebGL
      // membuat setiap frame tetap menyalin ~50 MB walaupun output hanya 720p.
      // Kecilkan lebih dulu agar texture upload mengikuti tangga preview.
      const previewSource =
        video.videoWidth > size.width || video.videoHeight > size.height
          ? downscalePreviewFrame(video, size.width, size.height)
          : video
      renderer.render(previewSource, presetRef.current, size.width, size.height, {
        ...recipeRef.current,
        // Penajaman memerlukan empat sampel linear-light tambahan per piksel.
        // Terapkan pada hasil foto penuh, bukan loop preview, agar viewfinder
        // tetap mulus tanpa mengubah warna atau karakter preset yang dipilih.
        sharpen: 0,
        intensity: presetRef.current.strength,
        lumaLock: presetRef.current.lumaLock,
        contrast: presetRef.current.contrast,
        grainSeed: 412.73,
      })
    } catch (error) {
      if (presetLoadingRef.current) return
      console.error('Preview kamera gagal:', error)
      activateCompatibilityMode('GPU tidak stabil; kamera beralih ke Natural agar foto tetap aman.')
    }
  }, [activateCompatibilityMode, downscalePreviewFrame, drawFallbackFrame])

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
    resetFrameClock()

    if (typeof video.requestVideoFrameCallback === 'function') {
      const tick = () => {
        trackPreviewPace()
        drawFrame()
        loopRef.current = { kind: 'rvfc', id: video.requestVideoFrameCallback(tick) }
      }
      loopRef.current = { kind: 'rvfc', id: video.requestVideoFrameCallback(tick) }
      return
    }

    const tick = () => {
      trackPreviewPace()
      drawFrame()
      loopRef.current = { kind: 'raf', id: requestAnimationFrame(tick) }
    }
    loopRef.current = { kind: 'raf', id: requestAnimationFrame(tick) }
  }, [drawFrame, resetFrameClock, stopLoop, trackPreviewPace])

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase({
          kind: 'blocked',
          title: 'Kamera tidak didukung',
          body: 'Buka halaman ini lewat browser modern dan koneksi HTTPS.',
        })
        return
      }

      setPhase({ kind: 'starting' })
      stopLoop()
      // Kamera belakang biasanya mengirim stream sensor yang jauh lebih besar.
      // Mulai pada 864 px; tangga adaptif tetap boleh naik ke 1080 setelah
      // perangkat terbukti lancar selama beberapa detik.
      previewTierRef.current = facing === 'environment' ? 1 : 0
      frameBudgetRef.current = 1000 / 30
      resetFrameClock()
      exposureRequestRef.current += 1
      exposureRangeRef.current = null
      sensorExposureRef.current = false
      sensorExposureValueRef.current = 0
      recipeRef.current.exposure = exposureUiRef.current

      try {
        const stream = await requestCamera(facing)
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = stream
        const video = videoRef.current
        if (!video) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        video.srcObject = stream
        await video.play()
        if (cancelled) return

        const track = stream.getVideoTracks()[0]
        if (track) track.contentHint = 'detail'
        const settings = track?.getSettings()
        // Loop preview berjalan sekali per frame kamera, jadi tolok ukur
        // kelancaran harus mengikuti frame rate stream yang benar-benar didapat.
        const streamFps = settings?.frameRate
        if (streamFps) frameBudgetRef.current = 1000 / Math.min(60, Math.max(15, streamFps))
        const width = settings?.width ?? video.videoWidth
        const height = settings?.height ?? video.videoHeight
        if (width && height) {
          setVideoSize({ w: width, h: height })
          setCameraInfo({ width, height, source: null })
        }

        if (track && 'getCapabilities' in track) {
          try {
            const capabilities = track.getCapabilities() as ExtendedCapabilities
            const advanced: Record<string, unknown> = {}
            if (capabilities.focusMode?.includes('continuous')) advanced.focusMode = 'continuous'
            if (capabilities.whiteBalanceMode?.includes('continuous')) {
              advanced.whiteBalanceMode = 'continuous'
            }
            if (capabilities.exposureMode?.includes('continuous')) advanced.exposureMode = 'continuous'
            if (Object.keys(advanced).length > 0) {
              await track.applyConstraints({ advanced: [advanced] } as MediaTrackConstraints)
            }
            exposureRangeRef.current = capabilities.exposureCompensation ?? null
            sensorExposureRef.current = Boolean(capabilities.exposureCompensation)
            sensorExposureValueRef.current = 0
            recipeRef.current.exposure = sensorExposureRef.current ? 0 : exposureUiRef.current
          } catch {
            exposureRangeRef.current = null
            sensorExposureRef.current = false
            sensorExposureValueRef.current = 0
          }
        }

        const canvas = canvasRef.current
        if (canvas && !rendererRef.current && !fallback2dRef.current) {
          try {
            rendererRef.current = new FilmRenderer(canvas, {
              preserveDrawingBuffer: false,
              errorChecking: 'startup',
            })
            await rendererRef.current.loadPreset(presetRef.current)
          } catch (error) {
            activateCompatibilityMode(
              error instanceof FilmUnsupportedError
                ? 'Mode kompatibilitas aktif: foto tetap tersimpan tanpa look film.'
                : 'Look film gagal dimuat; mode Natural dipakai.'
            )
          }
        }

        setPhase({ kind: 'live' })
        startLoop()
      } catch (error) {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        if (cancelled) return
        const name = (error as { name?: string }).name
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setPhase({
            kind: 'blocked',
            title: 'Izin kamera belum aktif',
            body: 'Izinkan akses kamera dari pengaturan situs browser, lalu coba lagi.',
          })
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setPhase({
            kind: 'blocked',
            title: 'Kamera tidak ditemukan',
            body: 'Tidak ada kamera yang dapat dipakai pada perangkat ini.',
          })
        } else {
          setPhase({
            kind: 'blocked',
            title: 'Kamera gagal dinyalakan',
            body: error instanceof Error ? error.message : 'Coba tutup aplikasi kamera lain.',
          })
        }
      }
    }

    void start()
    return () => {
      cancelled = true
      stopLoop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [activateCompatibilityMode, cameraAttempt, facing, resetFrameClock, startLoop, stopLoop])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopLoop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      rendererRef.current?.dispose()
      rendererRef.current = null
      void processingQueueRef.current.finally(() => {
        captureRendererRef.current?.dispose()
        captureRendererRef.current = null
      })
      if (lastShotUrlRef.current) URL.revokeObjectURL(lastShotUrlRef.current)
    }
  }, [stopLoop])

  const applySensorExposure = useCallback(async (value: number) => {
    const requestId = ++exposureRequestRef.current
    exposureQueueRef.current = exposureQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (requestId !== exposureRequestRef.current) return
        const track = streamRef.current?.getVideoTracks()[0]
        const range = exposureRangeRef.current
        if (!track || !range || !sensorExposureRef.current) return
        const increment = Math.max(range.step, 0.01)
        const stepped = Math.round(value / increment) * increment
        const clamped = Math.max(range.min, Math.min(range.max, stepped))
        try {
          await track.applyConstraints({
            advanced: [{ exposureCompensation: clamped } as MediaTrackConstraintSet],
          })
          if (requestId === exposureRequestRef.current) {
            sensorExposureValueRef.current = clamped
          }
        } catch {
          if (requestId !== exposureRequestRef.current) return
          sensorExposureRef.current = false
          sensorExposureValueRef.current = 0
          recipeRef.current.exposure = value
        }
      })

    await exposureQueueRef.current
  }, [])

  const applySensorFocus = useCallback(async (sensorX: number, sensorY: number) => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return

    try {
      await track.applyConstraints({
        advanced: [
          {
            focusMode: 'single-shot',
            pointsOfInterest: [
              {
                x: Math.max(0, Math.min(1, sensorX)),
                y: Math.max(0, Math.min(1, sensorY)),
              },
            ],
          } as MediaTrackConstraintSet,
        ],
      })
    } catch {
      // Reticle tetap memberi konfirmasi visual ketika perangkat tidak
      // mengekspos kontrol fokus hardware.
    }
  }, [])

  const focusCenter = useCallback(() => {
    setFocusPoint({ x: 50, y: 50, time: Date.now() })
    navigator.vibrate?.(12)
    void applySensorFocus(0.5, 0.5)
  }, [applySensorFocus])

  const handlePointerDown = useCallback(
    async (event: React.PointerEvent<HTMLDivElement>) => {
      if (phase.kind !== 'live' || activePanel !== 'none' || rollEmpty) return
      const stageRect = event.currentTarget.getBoundingClientRect()
      const displayX = ((event.clientX - stageRect.left) / stageRect.width) * 100
      const displayY = ((event.clientY - stageRect.top) / stageRect.height) * 100
      setFocusPoint({ x: displayX, y: displayY, time: Date.now() })
      dragRef.current = {
        startY: event.clientY,
        startExp: exposure,
        active: true,
        pointerId: event.pointerId,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      navigator.vibrate?.(12)

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const intrinsicRatio = canvas.width / Math.max(1, canvas.height)
      const elementRatio = rect.width / Math.max(1, rect.height)
      // Tanpa bingkai canvas memakai `contain`; saat bingkai aktif area foto
      // memakai `cover` agar crop viewfinder sama dengan crop unduhan.
      const useCover = frame !== 'none'
      const fillByWidth = useCover
        ? elementRatio < intrinsicRatio
        : elementRatio > intrinsicRatio
      const renderedWidth = fillByWidth ? rect.height * intrinsicRatio : rect.width
      const renderedHeight = fillByWidth ? rect.height : rect.width / intrinsicRatio
      const renderedLeft = rect.left + (rect.width - renderedWidth) / 2
      const renderedTop = rect.top + (rect.height - renderedHeight) / 2
      const uiX = Math.max(0, Math.min(1, (event.clientX - renderedLeft) / renderedWidth))
      const uiY = Math.max(0, Math.min(1, (event.clientY - renderedTop) / renderedHeight))
      const sensorX = mirror ? 1 - uiX : uiX

      await applySensorFocus(sensorX, uiY)
    },
    [activePanel, applySensorFocus, exposure, frame, mirror, phase.kind, rollEmpty]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) return
      const delta = dragRef.current.startY - event.clientY
      if (Math.abs(delta) <= 5) return
      setIsDraggingExposure(true)
      const value = Math.round(Math.max(-1.2, Math.min(1.2, dragRef.current.startExp + delta / 110)) * 10) / 10
      setExposure(value)
      if (sensorExposureRef.current) void applySensorExposure(value)
    },
    [applySensorExposure]
  )

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return
    dragRef.current.active = false
    dragRef.current.pointerId = null
    setIsDraggingExposure(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  const changePreset = useCallback(async (next: FilmPreset) => {
    if (fallback2dRef.current && next.id !== 'natural-clean') {
      setNotice({ kind: 'error', text: 'Look film membutuhkan WebGL2; mode Natural tetap aktif.' })
      return
    }

    const requestId = ++presetRequestRef.current
    presetLoadingRef.current = true
    setPresetLoading(next.id)
    presetQueueRef.current = presetQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (requestId !== presetRequestRef.current) return
        const renderer = rendererRef.current
        if (renderer) await renderer.loadPreset(next)
        if (requestId !== presetRequestRef.current || !mountedRef.current) return
        presetRef.current = next
        setPreset(next)
        setActivePanel('none')
      })
      .catch((error) => {
        if (requestId !== presetRequestRef.current || !mountedRef.current) return
        console.error('Preset gagal dimuat:', error)
        setNotice({ kind: 'error', text: 'Look itu gagal dimuat. Pilihan sebelumnya tetap aktif.' })
      })
      .finally(() => {
        if (requestId === presetRequestRef.current) {
          presetLoadingRef.current = false
          if (mountedRef.current) setPresetLoading(null)
        }
      })

    await presetQueueRef.current
  }, [])

  const playShutterSound = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const context = new AudioContextClass()
      const now = context.currentTime
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(720, now)
      oscillator.frequency.exponentialRampToValueAtTime(90, now + 0.045)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.05)
      window.setTimeout(() => void context.close(), 240)
    } catch {
      // Umpan balik visual tetap tersedia saat AudioContext diblokir browser.
    }
  }, [])

  const enqueueProcessing = useCallback(
    (bitmap: ImageBitmap, shotPreset: FilmPreset, options: ShotOptions): Promise<ProcessedCapture> => {
      const task = processingQueueRef.current.catch(() => undefined).then(async () => {
        if (fallback2dRef.current) return processNaturalCapture(bitmap, options)

        let renderer = captureRendererRef.current
        if (!renderer) {
          captureCanvasRef.current ??= document.createElement('canvas')
          try {
            renderer = new FilmRenderer(captureCanvasRef.current)
            captureRendererRef.current = renderer
          } catch {
            activateCompatibilityMode(
              'Pemroses film tidak tersedia; foto disimpan dengan warna Natural.'
            )
            return processNaturalCapture(bitmap, options)
          }
        }
        try {
          return await processCapture(renderer, bitmap, shotPreset, options)
        } catch (error) {
          console.error('Pemrosesan look film gagal, memakai Natural:', error)
          captureRendererRef.current?.dispose()
          captureRendererRef.current = null
          activateCompatibilityMode(
            'GPU kehilangan konteks; jepretan ini diamankan dengan warna Natural.'
          )
          return processNaturalCapture(bitmap, options)
        }
      })

      processingQueueRef.current = task.then(
        () => undefined,
        () => undefined
      )
      return task
    },
    [activateCompatibilityMode]
  )

  const cancelReservation = useCallback(
    async (photoId: string): Promise<'canceled' | 'ready' | 'failed'> => {
      try {
        const response = await fetch('/api/guest/shot', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, photoId }),
        })
        if (!response.ok) return 'failed'
        const body = await responseJson(response)
        return body.alreadyReady === true ? 'ready' : 'canceled'
      } catch {
        return 'failed'
      }
    },
    [eventId]
  )

  const publishSavedPreview = useCallback((url: string) => {
    if (!mountedRef.current) {
      URL.revokeObjectURL(url)
      return
    }

    const previous = lastShotUrlRef.current
    lastShotUrlRef.current = url
    setLastShot(url)
    setFlyingPhoto({ src: url, id: Date.now() })
    setThumbPop(true)
    if (previous) URL.revokeObjectURL(previous)
    window.setTimeout(() => {
      if (!mountedRef.current) return
      setFlyingPhoto(null)
      setThumbPop(false)
    }, 620)
  }, [])

  const uploadJob = useCallback(
    async (
      bitmap: ImageBitmap,
      shotPreset: FilmPreset,
      shotFrame: FrameId,
      shotOptions: ShotOptions,
      captureSource: 'photo' | 'video'
    ) => {
      let photoId: string | null = null
      let rollbackCount = true
      let processedPreviewUrl: string | null = null
      const clientPhotoId = crypto.randomUUID()

      try {
        // Pemrosesan diselesaikan sebelum kuota diklaim. Bila GPU gagal, tidak
        // ada row pending atau jatah tamu yang tertinggal di server.
        const shot = await enqueueProcessing(bitmap, shotPreset, shotOptions)
        if (shot.full.size < 512 || shot.thumb.size < 128) {
          throw new Error('Hasil foto tidak valid. Silakan jepret ulang.')
        }
        await assertUsableJpeg(shot.thumb)
        processedPreviewUrl = URL.createObjectURL(shot.thumb)
        if (mountedRef.current) {
          setCameraInfo({
            width: bitmap.width,
            height: bitmap.height,
            source: captureSource,
            outputWidth: shot.width,
            outputHeight: shot.height,
          })
        }

        const claimPayload = {
          eventId,
          clientPhotoId,
          preset: fallback2dRef.current ? NATURAL_PRESET.id : shotPreset.id,
          frame: shotFrame,
          width: shot.width,
          height: shot.height,
          processingRecipe: {
            engine: fallback2dRef.current ? 'canvas2d-natural-v1' : 'webgl2-film-v3',
            source: captureSource,
            sourceWidth: bitmap.width,
            sourceHeight: bitmap.height,
            facing,
            mirror: shotOptions.mirror,
            exposure: shotOptions.exposure,
            sensorExposure: shotOptions.sensorExposure ?? null,
            smooth: shotOptions.smooth,
            sharpen: shotOptions.sharpen,
            grainSeed: shotOptions.grainSeed ?? null,
            fullQuality: 0.94,
            thumbLongEdge: 480,
          },
        }
        const supabase = createClient()
        photoId = clientPhotoId
        let saved = false
        let lastUploadError: Error | null = null

        // Percobaan kedua memakai reservasi dan UUID yang sama. Route akan
        // membersihkan objek parsial dan tidak menambah kuota untuk kedua kali.
        for (let uploadAttempt = 0; uploadAttempt < 2 && !saved; uploadAttempt += 1) {
          const { response: claim, body: claimBody } = await claimWithRetry(claimPayload)
          if (!claim.ok) {
            const serverUsed =
              typeof claimBody.shotsUsed === 'number' ? claimBody.shotsUsed : undefined

            if (claimBody.code === 'photo_id_conflict') {
              try {
                await confirmWithRetry(eventId, clientPhotoId, shot.full.size)
                saved = true
                break
              } catch {
                // DELETE di blok catch membedakan foto yang ternyata ready dari
                // reservasi gagal, tanpa pernah mengurangi kuota dua kali.
              }
            } else if (claim.status < 500) {
              // 4xx adalah penolakan definitif: route tidak meninggalkan
              // reservasi baru. Pada 5xx statusnya ambigu, jadi UUID tetap
              // dibawa ke DELETE untuk cleanup idempoten.
              photoId = null
            }

            // Pada conflict, row dengan UUID ini mungkin sudah `ready`. Jangan
            // turunkan counter lokal sebelum DELETE/PATCH idempoten memastikan
            // hasil akhirnya; respons cleanup di bawah yang menjadi otoritas.
            if (serverUsed !== undefined && claimBody.code !== 'photo_id_conflict') {
              setAuthoritativeShots((current) => Math.max(serverUsed, current - 1))
              rollbackCount = false
            }
            throw new Error(
              typeof claimBody.error === 'string' ? claimBody.error : 'Gagal memesan jepretan.'
            )
          }

          if (claimBody.photoId !== clientPhotoId) {
            throw new Error('Respons penyimpanan tidak sah.')
          }
          if (typeof claimBody.shotsUsed === 'number') {
            setAuthoritativeShots((current) => Math.max(current, claimBody.shotsUsed as number))
          }

          const full = claimBody.full as { path?: unknown; token?: unknown } | undefined
          const thumb = claimBody.thumb as { path?: unknown; token?: unknown } | undefined
          if (
            typeof full?.path !== 'string' ||
            typeof full.token !== 'string' ||
            typeof thumb?.path !== 'string' ||
            typeof thumb.token !== 'string'
          ) {
            throw new Error('Token unggahan tidak lengkap.')
          }

          const uploads = await Promise.all([
            supabase.storage.from('photos').uploadToSignedUrl(full.path, full.token, shot.full, {
              contentType: 'image/jpeg',
            }),
            supabase.storage.from('photos').uploadToSignedUrl(thumb.path, thumb.token, shot.thumb, {
              contentType: 'image/jpeg',
            }),
          ])
          const failed = uploads.find((upload) => upload.error)
          lastUploadError = failed?.error
            ? new Error(failed.error.message || 'Unggahan foto gagal.')
            : null

          try {
            // Tetap konfirmasi saat browser melaporkan upload error: koneksi
            // bisa putus setelah Storage menerima seluruh byte.
            await confirmWithRetry(eventId, clientPhotoId, shot.full.size)
            saved = true
          } catch (confirmationError) {
            lastUploadError =
              lastUploadError ??
              (confirmationError instanceof Error
                ? confirmationError
                : new Error('Konfirmasi foto gagal.'))
          }
        }

        if (!saved) throw lastUploadError ?? new Error('Foto belum berhasil diunggah.')
        photoId = null
        rollbackCount = false
        if (mountedRef.current) {
          if (processedPreviewUrl) {
            publishSavedPreview(processedPreviewUrl)
            processedPreviewUrl = null
          }
          setNotice({ kind: 'ok', text: 'Foto tersimpan di album.' })
        }
      } catch (error) {
        console.error('Penyimpanan foto gagal:', error)
        if (photoId) {
          const cancellation = await cancelReservation(photoId)
          if (cancellation === 'ready') {
            rollbackCount = false
            if (processedPreviewUrl) {
              publishSavedPreview(processedPreviewUrl)
              processedPreviewUrl = null
            }
            if (mountedRef.current) setNotice({ kind: 'ok', text: 'Foto tersimpan di album.' })
            return
          }
          if (cancellation === 'canceled') {
            setAuthoritativeShots((current) => Math.max(0, current - 1))
            rollbackCount = false
          } else {
            // Server mungkin sudah menghitung reservasi. Pertahankan counter
            // sampai TTL self-healing mengembalikannya daripada over-quota.
            rollbackCount = false
          }
        }
        if (rollbackCount) setAuthoritativeShots((current) => Math.max(0, current - 1))
        if (mountedRef.current) {
          setNotice({
            kind: 'error',
            text: error instanceof Error ? error.message : 'Foto gagal disimpan. Coba lagi.',
          })
        }
      } finally {
        if (processedPreviewUrl) URL.revokeObjectURL(processedPreviewUrl)
        bitmap.close()
        finishJob()
      }
    },
    [
      cancelReservation,
      enqueueProcessing,
      eventId,
      facing,
      finishJob,
      publishSavedPreview,
      setAuthoritativeShots,
    ]
  )

  const capture = useCallback(async () => {
    if (
      captureGateRef.current ||
      phase.kind !== 'live' ||
      rollEmpty ||
      activeJobsRef.current >= MAX_ACTIVE_JOBS
    ) {
      return
    }

    const video = videoRef.current
    const track = streamRef.current?.getVideoTracks()[0]
    if (!video || video.readyState < 2) return

    captureGateRef.current = true
    setCapturing(true)
    beginJob()

    // Sensor/still frame adalah aksi pertama setelah ketukan. Tidak ada lagi
    // serialisasi base64 sinkron yang menggeser momen jepret.
    const framePromise = captureBestFrame(video, track)
    setFlash(true)
    playShutterSound()
    window.setTimeout(() => mountedRef.current && setFlash(false), 150)

    try {
      const captured = await framePromise
      const shotPreset = presetRef.current
      const shotOptions: ShotOptions = {
        ...recipeRef.current,
        exposure: sensorExposureRef.current ? 0 : exposure,
        grainSeed: crypto.getRandomValues(new Uint32Array(1))[0] / 4_294_967_295 * 1000,
        sensorExposure: sensorExposureRef.current ? sensorExposureValueRef.current : null,
      }
      const shotFrame = frame

      setCameraInfo({
        width: captured.bitmap.width,
        height: captured.bitmap.height,
        source: captured.source,
      })
      setAuthoritativeShots((current) => current + 1)

      void uploadJob(captured.bitmap, shotPreset, shotFrame, shotOptions, captured.source)
    } catch (error) {
      finishJob()
      setNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Kamera gagal mengambil foto.',
      })
    } finally {
      captureGateRef.current = false
      if (mountedRef.current) setCapturing(false)
    }
  }, [beginJob, exposure, finishJob, frame, phase.kind, playShutterSound, rollEmpty, setAuthoritativeShots, uploadJob])

  const guardNavigation = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (activeJobsRef.current === 0) return
      event.preventDefault()
      setNotice({
        kind: 'error',
        text: `${activeJobsRef.current} foto masih disimpan. Tunggu sampai selesai.`,
      })
    },
    []
  )

  const framePreview = useMemo(() => {
    const selected = getFrame(frame)
    if (!selected || selected.id === 'none' || !videoSize) return null
    const expectedSource =
      cameraInfo?.source === 'photo'
        ? { w: cameraInfo.width, h: cameraInfo.height }
        : videoSize
    const box = framedSize(selected, expectedSource.w, expectedSource.h)
    const ratio = box.width / box.height
    const captionHeight = (box.height - box.offsetY - box.photoHeight) / box.height
    return {
      frame: selected,
      containerStyle: {
        aspectRatio: `${box.width} / ${box.height}`,
        maxWidth: `calc(100dvh * ${ratio})`,
        backgroundColor: selected.background,
      } as React.CSSProperties,
      photoStyle: {
        left: `${(box.offsetX / box.width) * 100}%`,
        top: `${(box.offsetY / box.height) * 100}%`,
        width: `${(box.photoWidth / box.width) * 100}%`,
        height: `${(box.photoHeight / box.height) * 100}%`,
      } as React.CSSProperties,
      bandStyle: { height: `${(box.offsetY / box.height) * 100}%` } as React.CSSProperties,
      captionStyle: { height: `${captionHeight * 100}%` } as React.CSSProperties,
    }
  }, [cameraInfo, frame, videoSize])

  const controlsLocked = phase.kind !== 'live' || capturing
  const interactionBlocked = phase.kind !== 'live' || rollEmpty

  useEffect(() => {
    if (!interactionBlocked) return
    blockingOverlayRef.current?.focus()
  }, [interactionBlocked, pendingJobs, phase.kind])

  const qualityLabel = cameraInfo
    ? `${cameraInfo.outputWidth ? 'Hasil' : cameraInfo.source ? 'Sumber' : 'Preview'} ${cameraInfo.outputWidth ?? cameraInfo.width}×${cameraInfo.outputHeight ?? cameraInfo.height}${cameraInfo.source === 'photo' ? ' · still sensor' : cameraInfo.source === 'video' ? ' · frame video' : ''}`
    : 'Mencari resolusi terbaik…'
  const selectedFrame = getFrame(frame)!

  return (
    <main className={styles.page}>
      <div
        className={styles.stage}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <video ref={videoRef} playsInline muted className={styles.video} />

        <div
          className={`${styles.framed} ${framePreview ? styles.framedOn : ''}`}
          style={framePreview?.containerStyle}
        >
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            style={framePreview?.photoStyle}
            aria-hidden="true"
          />

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
            <span className={styles.frameCaption} style={framePreview.captionStyle}>
              <span className={styles.frameTitle}>{title}</span>
              <span className={styles.frameStamp}>{frameTimestamp()}</span>
            </span>
          )}
        </div>

        {focusPoint && (
          <div
            key={focusPoint.time}
            className={`${styles.focusReticle} ${isDraggingExposure ? styles.focusReticleActive : ''}`}
            style={{ left: `${focusPoint.x}%`, top: `${focusPoint.y}%` }}
          >
            <div className={styles.focusBox}>
              <div className={styles.focusCenterDot} />
            </div>
            <div className={styles.sunSliderTrack}>
              <div className={styles.sunSliderLine} />
              <div
                className={styles.sunIconWrapper}
                style={{ transform: `translateY(${-exposure * 22}px)` }}
              >
                <Sun size={18} className={styles.sunIcon} />
                {isDraggingExposure && (
                  <span className={styles.sunEvBadge}>
                    {exposure > 0 ? '+' : ''}
                    {exposure.toFixed(1)} EV
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {flyingPhoto && (
          <div className={styles.flyingPhotoContainer}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={flyingPhoto.id}
              src={flyingPhoto.src}
              alt="Foto sedang diproses"
              className={styles.flyingPhoto}
            />
          </div>
        )}

        {flash && <div className={styles.flash} />}

        {phase.kind === 'starting' && (
          <div
            ref={blockingOverlayRef}
            className={styles.overlay}
            role="status"
            aria-live="polite"
            aria-busy="true"
            tabIndex={-1}
          >
            <Loader2 size={22} className="animate-spin" />
            <p className={styles.overlayBody}>Menyiapkan kamera terbaik perangkatmu…</p>
          </div>
        )}

        {phase.kind === 'blocked' && (
          <div ref={blockingOverlayRef} className={styles.overlay} role="alert" tabIndex={-1}>
            <p className={styles.overlayTitle}>{phase.title}</p>
            <p className={styles.overlayBody}>{phase.body}</p>
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => setCameraAttempt((attempt) => attempt + 1)}
            >
              <RefreshCw size={16} />
              Coba lagi
            </button>
          </div>
        )}

        {rollEmpty && phase.kind === 'live' && (
          <div
            ref={blockingOverlayRef}
            className={styles.overlay}
            role="status"
            aria-live="polite"
            aria-busy={pendingJobs > 0}
            tabIndex={-1}
          >
            {pendingJobs > 0 ? <Loader2 size={22} className="animate-spin" /> : <Check size={24} />}
            <p className={styles.overlayTitle}>
              {pendingJobs > 0 ? 'Menyimpan jepretan terakhir' : 'Roll filmmu habis'}
            </p>
            <p className={styles.overlayBody}>
              {pendingJobs > 0
                ? `Jangan tutup halaman ini. ${pendingJobs} foto masih diproses.`
                : `Semua ${shotsLimit} jepretan sudah terpakai dan tersimpan.`}
            </p>
            {pendingJobs === 0 && (
              <div className={styles.overlayActions}>
                <Link href={`/a/${slug}/guestbook`} className="btn btn-accent">
                  <Mic size={16} />
                  Tinggalkan ucapan
                </Link>
                <Link href={`/a/${slug}/galeri`} className={styles.overlayTextLink}>
                  <Images size={15} />
                  Lihat galeri
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <header
        className={styles.bar}
        inert={interactionBlocked}
        aria-hidden={interactionBlocked || undefined}
      >
        <Link
          href={`/a/${slug}`}
          className={styles.iconBtn}
          aria-label="Kembali"
          onClick={guardNavigation}
        >
          <ArrowLeft size={19} />
        </Link>
        <Link href={`/a/${slug}?ganti=1`} className={styles.barTitle} onClick={guardNavigation}>
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
          className={`${styles.toast} ${notice.kind === 'error' ? styles.toastError : styles.toastOk}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}

      <div
        className={styles.dock}
        inert={interactionBlocked}
        aria-hidden={interactionBlocked || undefined}
      >
        <div className={styles.captureMeta} aria-live="polite">
          <span className={styles.qualityMeta}>{qualityLabel}</span>
          <span className={`${styles.syncMeta} ${pendingJobs === 0 ? styles.syncSaved : ''}`}>
            {pendingJobs > 0 ? (
              <>
                <Loader2 size={12} className="animate-spin" /> {pendingJobs} diproses
              </>
            ) : (
              <>
                <Check size={12} /> Siap
              </>
            )}
          </span>
        </div>

        {activePanel !== 'none' && (
          <section id="camera-settings" className={styles.bottomSheet} aria-label="Pengaturan kamera">
            <div className={styles.sheetHeader}>
              <div>
                <strong>
                  {activePanel === 'looks'
                    ? 'Look film'
                    : activePanel === 'frames'
                      ? 'Bingkai'
                      : 'Detail foto'}
                </strong>
                <span>
                  {activePanel === 'looks'
                    ? 'Pilih menurut kondisi cahaya'
                    : activePanel === 'frames'
                      ? 'Bingkai tetap reversible di arsip'
                      : 'Mulai dari setelan alami'}
                </span>
              </div>
              <button
                type="button"
                className={styles.sheetClose}
                onClick={() => setActivePanel('none')}
                aria-label="Tutup pengaturan"
              >
                <ChevronDown size={20} />
              </button>
            </div>

            {activePanel === 'looks' && (
              <div className={styles.presetCards}>
                {FILM_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.presetCard} ${item.id === preset.id ? styles.presetCardActive : ''}`}
                    onClick={() => void changePreset(item)}
                    disabled={Boolean(presetLoading) || (!filmAvailable && item.id !== 'natural-clean')}
                    aria-pressed={item.id === preset.id}
                  >
                    <span className={styles.presetSwatch} data-look={item.id} />
                    <span className={styles.presetCopy}>
                      <strong>{item.name}</strong>
                      <small>{item.bestFor}</small>
                    </span>
                    {presetLoading === item.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : item.id === preset.id ? (
                      <Check size={16} />
                    ) : null}
                  </button>
                ))}
              </div>
            )}

            {activePanel === 'frames' && (
              <div className={styles.choiceList}>
                {PHOTO_FRAMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.choice} ${item.id === frame ? styles.choiceActive : ''}`}
                    onClick={() => {
                      setFrame(item.id)
                      setActivePanel('none')
                    }}
                    aria-pressed={item.id === frame}
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.hint}</small>
                    </span>
                    {item.id === frame && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}

            {activePanel === 'adjust' && (
              <div className={styles.adjustContent}>
                <div className={styles.settingRow}>
                  <span>
                    <strong>Pencahayaan</strong>
                    <small>Gunakan tombol panah untuk penyesuaian presisi</small>
                  </span>
                  <label className={styles.exposureControl}>
                    <Sun size={17} aria-hidden="true" />
                    <input
                      type="range"
                      min="-1.2"
                      max="1.2"
                      step="0.1"
                      value={exposure}
                      onChange={(event) => {
                        const value = Number(event.currentTarget.value)
                        setExposure(value)
                        if (sensorExposureRef.current) void applySensorExposure(value)
                      }}
                      aria-label="Kompensasi pencahayaan"
                      aria-valuetext={`${exposure > 0 ? '+' : ''}${exposure.toFixed(1)} EV`}
                    />
                    <output aria-live="polite">
                      {exposure > 0 ? '+' : ''}
                      {exposure.toFixed(1)} EV
                    </output>
                  </label>
                </div>
                <button type="button" className={styles.focusCenterButton} onClick={focusCenter}>
                  <Focus size={17} aria-hidden="true" />
                  <span>
                    <strong>Fokus ke tengah</strong>
                    <small>Alternatif keyboard untuk tap-to-focus</small>
                  </span>
                </button>
                <div className={styles.settingRow}>
                  <span>
                    <strong>Ketajaman</strong>
                    <small>Hindari level tinggi saat minim cahaya</small>
                  </span>
                  <div className={styles.segmented}>
                    {SHARPNESS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        title={option.hint}
                        className={sharpness === option.value ? styles.segmentActive : ''}
                        onClick={() => setSharpness(option.value)}
                        aria-pressed={sharpness === option.value}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.skinToggle} ${softSkin ? styles.skinToggleActive : ''}`}
                  onClick={() => setSoftSkin((enabled) => !enabled)}
                  aria-pressed={softSkin}
                >
                  <Sparkles size={17} />
                  <span>
                    <strong>Haluskan kulit ringan</strong>
                    <small>{softSkin ? 'Aktif · intensitas rendah' : 'Nonaktif · detail asli'}</small>
                  </span>
                  <span className={styles.toggleTrack} aria-hidden="true">
                    <span />
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.resetButton}
                  onClick={() => {
                    setExposure(0)
                    setSharpness(0.18)
                    setSoftSkin(false)
                    void applySensorExposure(0)
                  }}
                >
                  Reset setelan
                </button>
              </div>
            )}
          </section>
        )}

        <div className={styles.toolBar}>
          <button
            type="button"
            className={`${styles.toolBtn} ${activePanel === 'looks' ? styles.toolBtnActive : ''}`}
            onClick={() => setActivePanel((current) => (current === 'looks' ? 'none' : 'looks'))}
            aria-controls="camera-settings"
            aria-expanded={activePanel === 'looks'}
          >
            <Focus size={15} />
            <span>{preset.name}</span>
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${activePanel === 'frames' ? styles.toolBtnActive : ''}`}
            onClick={() => setActivePanel((current) => (current === 'frames' ? 'none' : 'frames'))}
            aria-controls="camera-settings"
            aria-expanded={activePanel === 'frames'}
          >
            <Frame size={15} />
            <span>{selectedFrame.name}</span>
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${activePanel === 'adjust' ? styles.toolBtnActive : ''}`}
            onClick={() => setActivePanel((current) => (current === 'adjust' ? 'none' : 'adjust'))}
            aria-label="Atur detail foto"
            aria-controls="camera-settings"
            aria-expanded={activePanel === 'adjust'}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        <div className={styles.controls}>
          <Link
            href={`/a/${slug}/galeri`}
            className={`${styles.thumbSlot} ${thumbPop ? styles.thumbSlotPop : ''}`}
            aria-label={pendingJobs > 0 ? 'Foto masih disimpan' : 'Buka galeri'}
            onClick={guardNavigation}
          >
            {lastShot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lastShot} alt="Jepretan terakhir" className={styles.thumb} />
            ) : (
              <Images size={19} />
            )}
            {pendingJobs > 0 && <span className={styles.thumbBadge}>{pendingJobs}</span>}
          </Link>

          <button
            type="button"
            onClick={() => void capture()}
            disabled={controlsLocked || rollEmpty || pendingJobs >= MAX_ACTIVE_JOBS}
            className={styles.shutter}
            aria-label={capturing ? 'Sedang mengambil foto' : 'Jepret foto'}
          >
            <span className={styles.shutterDot} />
          </button>

          <button
            type="button"
            onClick={() => setFacing((current) => (current === 'user' ? 'environment' : 'user'))}
            disabled={controlsLocked}
            className={styles.iconBtn}
            aria-label="Balik kamera"
          >
            <SwitchCamera size={21} />
          </button>
        </div>
      </div>
    </main>
  )
}
