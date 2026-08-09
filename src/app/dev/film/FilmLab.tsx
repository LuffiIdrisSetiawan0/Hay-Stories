'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FILM_PRESETS } from '@/lib/catalog'
import { FilmRenderer, isFilmSupported } from '@/lib/film'

const TEST_IMAGE = '/dev/test-chart.jpg'

type Status = 'loading' | 'ready' | 'unsupported' | 'error'

export default function FilmLab() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [intensity, setIntensity] = useState(1)

  // Satu konteks WebGL untuk semua preset — sama seperti halaman kamera.
  // Membuat satu konteks per preset akan menabrak batas konteks browser
  // (~16) dan tidak mencerminkan cara produksi bekerja.
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<FilmRenderer | null>(null)
  const bitmapRef = useRef<ImageBitmap | null>(null)
  const targetsRef = useRef(new Map<string, HTMLCanvasElement>())

  const registerTarget = useCallback((id: string, el: HTMLCanvasElement | null) => {
    if (el) targetsRef.current.set(id, el)
    else targetsRef.current.delete(id)
  }, [])

  const renderAll = useCallback(async (currentIntensity: number) => {
    const renderer = rendererRef.current
    const bitmap = bitmapRef.current
    const glCanvas = glCanvasRef.current
    if (!renderer || !bitmap || !glCanvas) return

    for (const preset of FILM_PRESETS) {
      const target = targetsRef.current.get(preset.id)
      if (!target) continue

      // Wajib per preset: satu tekstur LUT dipakai bergantian, jadi harus
      // ditukar sebelum tiap render.
      await renderer.loadPreset(preset)

      renderer.render(bitmap, preset, bitmap.width, bitmap.height, {
        intensity: currentIntensity,
      })

      target.width = bitmap.width
      target.height = bitmap.height
      target.getContext('2d')?.drawImage(glCanvas, 0, 0)
    }
  }, [])

  useEffect(() => {
    const glCanvas = document.createElement('canvas')
    glCanvasRef.current = glCanvas

    let cancelled = false

    ;(async () => {
      try {
        // Pemeriksaan dukungan berada di dalam fungsi async, bukan di badan
        // efek, supaya setState tidak dipanggil sinkron saat efek berjalan.
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

        await renderAll(1)
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
    if (status === 'ready') void renderAll(intensity)
  }, [intensity, status, renderAll])

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '0.25rem' }}>
          Film Lab
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Pratinjau semua preset melalui pipeline WebGL yang sama dengan yang dipakai kamera tamu.
          Jalankan <code>node scripts/build-luts.mjs</code> lalu muat ulang untuk melihat
          perubahan grading.
        </p>
      </header>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
          fontSize: '0.85rem',
        }}
      >
        <label htmlFor="intensity">Kekuatan filter</label>
        <input
          id="intensity"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          style={{ width: '240px' }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', minWidth: '3.5ch' }}>
          {Math.round(intensity * 100)}%
        </span>
        <span
          data-testid="film-status"
          style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}
        >
          status: {status}
          {error ? ` — ${error}` : ''}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <figure style={{ margin: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={TEST_IMAGE}
            alt="Gambar uji tanpa filter"
            style={{ width: '100%', display: 'block', borderRadius: '0.5rem' }}
          />
          <figcaption style={{ marginTop: '0.5rem' }}>
            <strong style={{ fontSize: '0.9rem' }}>Asli (tanpa filter)</strong>
          </figcaption>
        </figure>

        {FILM_PRESETS.map((preset) => (
          <figure key={preset.id} style={{ margin: 0 }}>
            <canvas
              ref={(el) => registerTarget(preset.id, el)}
              data-testid={`canvas-${preset.id}`}
              style={{
                width: '100%',
                display: 'block',
                borderRadius: '0.5rem',
                background: 'var(--color-bg-secondary)',
                aspectRatio: '3 / 2',
              }}
            />
            <figcaption style={{ marginTop: '0.5rem' }}>
              <strong style={{ fontSize: '0.9rem' }}>{preset.name}</strong>
              <p
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.15rem',
                }}
              >
                {preset.character}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  )
}
