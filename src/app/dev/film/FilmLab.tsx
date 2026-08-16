'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Sparkles, RefreshCw, Check } from 'lucide-react'
import { FILM_PRESETS, type FilmPreset } from '@/lib/catalog'
import { FilmRenderer, fitWithin, isFilmSupported } from '@/lib/film'

const TEST_IMAGE = '/dev/test-chart.jpg'

/**
 * Sisi terpanjang untuk render di lab.
 */
const LAB_LONG_EDGE = 1400

type Status = 'loading' | 'ready' | 'unsupported' | 'error'

/** Pengali yang ditumpuk di atas nilai bawaan tiap preset. 1 = apa adanya. */
interface Knobs {
  strength: number
  lumaLock: number
  contrast: number
  grain: number
  vignette: number
  halation: number
  /** Nilai MUTLAK 0-1, bukan pengali: penghalusan tidak ada di preset. */
  smooth: number
  /** Nilai MUTLAK -1.5 hingga +1.5 EV, kompensasi pencahayaan. */
  exposure: number
  /** Nilai MUTLAK 0-1, penajaman optik kamera. */
  sharpen: number
}

const NEUTRAL: Knobs = {
  strength: 1,
  lumaLock: 1,
  contrast: 1,
  grain: 1,
  vignette: 1,
  halation: 1,
  smooth: 0.65,
  exposure: 0.0,
  sharpen: 0.45,
}

/**
 * Terapkan pengali, jaga tetap dalam 0–1.
 */
function tune(preset: FilmPreset, k: Knobs) {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const isMono = preset.id === 'noir-400' || preset.id === 'kodak-tri-x-400'
  return {
    ...preset,
    strength: isMono ? preset.strength : clamp(preset.strength * k.strength),
    lumaLock: clamp(preset.lumaLock * k.lumaLock),
    contrast: clamp(preset.contrast * k.contrast),
    grain: clamp(preset.grain * k.grain),
    vignette: clamp(preset.vignette * k.vignette),
    halation: clamp(preset.halation * k.halation),
  }
}

export default function FilmLab() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [knobs, setKnobs] = useState<Knobs>(NEUTRAL)
  const [sourceName, setSourceName] = useState('gambar uji sintetis')
  const [sourceUrl, setSourceUrl] = useState(TEST_IMAGE)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const glCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<FilmRenderer | null>(null)
  const bitmapRef = useRef<ImageBitmap | null>(null)
  const targetsRef = useRef(new Map<string, HTMLCanvasElement>())

  const registerTarget = useCallback((id: string, el: HTMLCanvasElement | null) => {
    if (el) targetsRef.current.set(id, el)
    else targetsRef.current.delete(id)
  }, [])

  const renderAll = useCallback(async (k: Knobs) => {
    const renderer = rendererRef.current
    const bitmap = bitmapRef.current
    const glCanvas = glCanvasRef.current
    if (!renderer || !bitmap || !glCanvas) return

    const { width, height } = fitWithin(bitmap.width, bitmap.height, LAB_LONG_EDGE)

    for (const preset of FILM_PRESETS) {
      const target = targetsRef.current.get(preset.id)
      if (!target) continue

      const tuned = tune(preset, k)

      await renderer.loadPreset(tuned)
      renderer.render(bitmap, tuned, width, height, {
        intensity: tuned.strength,
        lumaLock: tuned.lumaLock,
        contrast: tuned.contrast,
        smooth: k.smooth,
        exposure: k.exposure,
        sharpen: k.sharpen,
      })

      target.width = width
      target.height = height
      target.getContext('2d')?.drawImage(glCanvas, 0, 0)
    }
  }, [])

  const loadSource = useCallback(
    async (blob: Blob, label: string) => {
      try {
        const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
        bitmapRef.current?.close()
        bitmapRef.current = bitmap
        setSourceName(label)
        setSourceUrl((prev) => {
          if (prev.startsWith('blob:')) URL.revokeObjectURL(prev)
          return URL.createObjectURL(blob)
        })
        await renderAll(knobs)
        setStatus('ready')
        setError(null)
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [knobs, renderAll]
  )

  useEffect(() => {
    const glCanvas = document.createElement('canvas')
    glCanvasRef.current = glCanvas

    let cancelled = false

    ;(async () => {
      try {
        if (!isFilmSupported()) {
          setStatus('unsupported')
          return
        }

        const renderer = new FilmRenderer(glCanvas)
        rendererRef.current = renderer

        const response = await fetch(TEST_IMAGE)
        if (!response.ok) throw new Error(`Gambar uji tidak ditemukan (${response.status})`)
        const bitmap = await createImageBitmap(await response.blob())

        if (cancelled) {
          bitmap.close()
          return
        }
        bitmapRef.current = bitmap

        await renderAll(NEUTRAL)
        if (cancelled) return

        setStatus('ready')
        setError(null)
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    })()

    return () => {
      cancelled = true
      bitmapRef.current?.close()
      bitmapRef.current = null
      rendererRef.current?.dispose()
      rendererRef.current = null
      glCanvasRef.current = null
    }
  }, [renderAll])

  useEffect(() => {
    if (status === 'ready') void renderAll(knobs)
  }, [knobs, status, renderAll])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (file?.type.startsWith('image/')) void loadSource(file, file.name)
    },
    [loadSource]
  )

  const downloadPreset = useCallback(async (preset: FilmPreset) => {
    const target = targetsRef.current.get(preset.id)
    if (!target) return

    setDownloadingId(preset.id)
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        target.toBlob(resolve, 'image/jpeg', 0.95)
      )
      if (!blob) throw new Error('Gagal mengekspor foto')

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `haystories-${preset.id}-${Date.now()}.jpg`
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setDownloadingId(null)
      }, 3000)
    } catch (err) {
      console.error('Download error:', err)
      setDownloadingId(null)
    }
  }, [])

  const knob = (key: keyof Knobs, label: string) => {
    let min = 0
    let max = 2
    let step = 0.05
    let suffix = '×'

    if (key === 'smooth' || key === 'sharpen') {
      min = 0
      max = 1
      suffix = ''
    } else if (key === 'exposure') {
      min = -1.2
      max = 1.2
      step = 0.1
      suffix = ' EV'
    }

    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem' }}>
        <span style={{ minWidth: '7ch' }}>{label}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={knobs[key]}
          onChange={(e) => setKnobs((k) => ({ ...k, [key]: Number(e.target.value) }))}
          style={{ width: '135px' }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', minWidth: '5ch' }}>
          {knobs[key] > 0 && key === 'exposure' ? '+' : ''}
          {knobs[key].toFixed(2)}
          {suffix}
        </span>
      </label>
    )
  }

  return (
    <main style={{ padding: '2rem 1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Sparkles size={24} style={{ color: 'var(--color-accent)' }} />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', margin: 0 }}>
            Film Simulator Lab
          </h1>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', maxWidth: '70ch', margin: 0 }}>
          Pipeline WebGL presisi tinggi dengan penajaman sensor kamera dan kontrol pencahayaan EV. Unggah foto Anda, sesuaikan setelan, dan langsung simpan hasil foto analog favorit Anda.
        </p>
      </header>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          border: '1px dashed var(--color-border-hover)',
          borderRadius: '0.75rem',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        <div style={{ fontSize: '0.85rem' }}>
          <strong>Sumber foto:</strong> {sourceName}
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
            Jatuhkan foto ke area ini, atau klik tombol pilih berkas.
          </p>
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void loadSource(file, file.name)
          }}
          style={{ fontSize: '0.82rem' }}
        />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem 1.25rem',
            marginLeft: 'auto',
          }}
        >
          {knob('sharpen', 'Penajaman')}
          {knob('exposure', 'Pencahayaan')}
          {knob('smooth', 'Kulit')}
          {knob('contrast', 'Kontras')}
          {knob('grain', 'Grain')}
          {knob('vignette', 'Vignette')}
          {knob('halation', 'Halation')}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setKnobs(NEUTRAL)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} />
            Reset
          </button>
        </div>

        <span
          data-testid="film-status"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', width: '100%', color: 'var(--color-text-muted)' }}
        >
          status: {status}
          {error ? ` — ${error}` : ''}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '2rem 1.5rem',
        }}
      >
        {/* Card Foto Asli */}
        <figure style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'relative', borderRadius: '0.6rem', overflow: 'hidden', backgroundColor: 'var(--color-bg-secondary)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sourceUrl}
              alt="Sumber tanpa filter"
              style={{ width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' }}
            />
          </div>
          <figcaption style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: '0.95rem' }}>Foto Asli (Original)</strong>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
                Tanpa pengolahan filter analog
              </p>
            </div>
          </figcaption>
        </figure>

        {/* 12 Preset Cards dengan Tombol Download */}
        {FILM_PRESETS.map((preset) => {
          const t = tune(preset, knobs)
          const isDownloading = downloadingId === preset.id
          return (
            <figure key={preset.id} style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', borderRadius: '0.6rem', overflow: 'hidden', backgroundColor: 'var(--color-bg-secondary)' }}>
                <canvas
                  ref={(el) => registerTarget(preset.id, el)}
                  data-testid={`canvas-${preset.id}`}
                  style={{
                    width: '100%',
                    display: 'block',
                    aspectRatio: '4/3',
                    objectFit: 'cover',
                  }}
                />
              </div>
              <figcaption style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.95rem' }}>{preset.name}</strong>
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      color: 'var(--color-text-muted)',
                      margin: '0.2rem 0 0',
                    }}
                  >
                    tajam {knobs.sharpen.toFixed(2)} · cahaya {knobs.exposure > 0 ? '+' : ''}{knobs.exposure.toFixed(1)} EV · kontras {t.contrast.toFixed(2)} · grain {t.grain.toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadPreset(preset)}
                  disabled={isDownloading}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.4rem 0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isDownloading ? <Check size={14} style={{ color: '#22c55e' }} /> : <Download size={14} />}
                  {isDownloading ? 'Tersimpan!' : 'Simpan Foto'}
                </button>
              </figcaption>
            </figure>
          )
        })}
      </div>

      <details style={{ marginTop: '3rem' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Salin konfigurasi ini ke <code>src/lib/catalog.ts</code>
        </summary>
        <pre
          style={{
            marginTop: '0.75rem',
            padding: '1.25rem',
            borderRadius: '0.5rem',
            background: 'var(--color-bg-secondary)',
            fontSize: '0.75rem',
            overflowX: 'auto',
          }}
        >
          {FILM_PRESETS.map((p) => {
            const t = tune(p, knobs)
            return `// ${p.name}\nstrength: ${t.strength.toFixed(2)}, lumaLock: ${t.lumaLock.toFixed(2)}, contrast: ${t.contrast.toFixed(2)}, grain: ${t.grain.toFixed(2)}, vignette: ${t.vignette.toFixed(2)}, halation: ${t.halation.toFixed(3)},`
          }).join('\n')}
        </pre>
      </details>
    </main>
  )
}
