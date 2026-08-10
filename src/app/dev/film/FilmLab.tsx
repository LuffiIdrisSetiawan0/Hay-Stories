'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FILM_PRESETS, type FilmPreset } from '@/lib/catalog'
import { FilmRenderer, fitWithin, isFilmSupported } from '@/lib/film'

const TEST_IMAGE = '/dev/test-chart.jpg'

/**
 * Sisi terpanjang untuk render di lab.
 *
 * Foto pernikahan yang dijatuhkan ke sini bisa 12 MP, dan enam kanvas sebesar
 * itu akan membekukan tab. Untuk menilai warna, 1400 px lebih dari cukup.
 */
const LAB_LONG_EDGE = 1400

type Status = 'loading' | 'ready' | 'unsupported' | 'error'

/** Pengali yang ditumpuk di atas nilai bawaan tiap preset. 1 = apa adanya. */
interface Knobs {
  strength: number
  grain: number
  vignette: number
  halation: number
}

const NEUTRAL: Knobs = { strength: 1, grain: 1, vignette: 1, halation: 1 }

/**
 * Terapkan pengali, jaga tetap dalam 0–1.
 *
 * Hitam-putih dikecualikan dari pengali kekuatan: dicampur sebagian ia berhenti
 * jadi hitam-putih dan cuma terlihat seperti foto yang pudar warnanya.
 */
function tune(preset: FilmPreset, k: Knobs) {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const isMono = preset.id === 'noir-400'
  return {
    ...preset,
    strength: isMono ? preset.strength : clamp(preset.strength * k.strength),
    grain: clamp(preset.grain * k.grain),
    vignette: clamp(preset.vignette * k.vignette),
    halation: clamp(preset.halation * k.halation),
  }
}

/**
 * Lab penyetelan preset film.
 *
 * Ada karena dua kali saya menyetel grading tanpa bisa melihat hasilnya, dan
 * dua kali meleset. Gambar uji sintetis tidak cukup: grain di atas petak warna
 * datar selalu terbaca sebagai kotoran, dan nada kulit sungguhan berperilaku
 * berbeda dari enam kotak warna.
 *
 * Foto yang dijatuhkan ke sini tidak pernah meninggalkan browser — dibaca
 * lewat createImageBitmap dari berkas lokal, tidak ada unggahan ke mana pun.
 */
export default function FilmLab() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [knobs, setKnobs] = useState<Knobs>(NEUTRAL)
  const [sourceName, setSourceName] = useState('gambar uji sintetis')
  const [sourceUrl, setSourceUrl] = useState(TEST_IMAGE)

  // Satu konteks WebGL untuk semua preset — sama seperti halaman kamera.
  // Membuat satu konteks per preset akan menabrak batas konteks browser (~16)
  // dan tidak mencerminkan cara produksi bekerja.
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

      // Wajib per preset: satu tekstur LUT dipakai bergantian, jadi harus
      // ditukar sebelum tiap render.
      await renderer.loadPreset(tuned)
      renderer.render(bitmap, tuned, width, height, { intensity: tuned.strength })

      target.width = width
      target.height = height
      target.getContext('2d')?.drawImage(glCanvas, 0, 0)
    }
  }, [])

  /** Ganti sumber gambar, lalu render ulang semuanya. */
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

  const knob = (key: keyof Knobs, label: string) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem' }}>
      <span style={{ minWidth: '7ch' }}>{label}</span>
      <input
        type="range"
        min={0}
        max={2}
        step={0.05}
        value={knobs[key]}
        onChange={(e) => setKnobs((k) => ({ ...k, [key]: Number(e.target.value) }))}
        style={{ width: '160px' }}
      />
      <span style={{ fontFamily: 'var(--font-mono)', minWidth: '4ch' }}>
        {knobs[key].toFixed(2)}×
      </span>
    </label>
  )

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '0.25rem' }}>
          Film Lab
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: '60ch' }}>
          Pipeline WebGL yang sama persis dengan kamera tamu. Jatuhkan foto acara sungguhan ke
          bawah, geser sampai terlihat benar, lalu salin angkanya. Fotonya diproses di browser ini
          dan tidak dikirim ke mana pun.
        </p>
      </header>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          border: '1px dashed var(--color-border-hover)',
          borderRadius: '0.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        <div style={{ fontSize: '0.85rem' }}>
          <strong>Sumber:</strong> {sourceName}
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
            Jatuhkan foto ke kotak ini, atau pilih berkas.
          </p>
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void loadSource(file, file.name)
          }}
          style={{ fontSize: '0.8rem' }}
        />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem 1.5rem',
            marginLeft: 'auto',
          }}
        >
          {knob('strength', 'Kekuatan')}
          {knob('grain', 'Grain')}
          {knob('vignette', 'Vignette')}
          {knob('halation', 'Halation')}
          <button type="button" className="btn btn-secondary" onClick={() => setKnobs(NEUTRAL)}>
            Reset
          </button>
        </div>

        <span
          data-testid="film-status"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', width: '100%' }}
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
            src={sourceUrl}
            alt="Sumber tanpa filter"
            style={{ width: '100%', display: 'block', borderRadius: '0.5rem' }}
          />
          <figcaption style={{ marginTop: '0.5rem' }}>
            <strong style={{ fontSize: '0.9rem' }}>Asli (tanpa filter)</strong>
          </figcaption>
        </figure>

        {FILM_PRESETS.map((preset) => {
          const t = tune(preset, knobs)
          return (
            <figure key={preset.id} style={{ margin: 0 }}>
              <canvas
                ref={(el) => registerTarget(preset.id, el)}
                data-testid={`canvas-${preset.id}`}
                style={{
                  width: '100%',
                  display: 'block',
                  borderRadius: '0.5rem',
                  background: 'var(--color-bg-secondary)',
                }}
              />
              <figcaption style={{ marginTop: '0.5rem' }}>
                <strong style={{ fontSize: '0.9rem' }}>{preset.name}</strong>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '0.2rem',
                  }}
                >
                  strength {t.strength.toFixed(2)} · grain {t.grain.toFixed(2)} · vignette{' '}
                  {t.vignette.toFixed(2)} · halation {t.halation.toFixed(3)}
                </p>
              </figcaption>
            </figure>
          )
        })}
      </div>

      {/* Angka final, siap ditempel ke FILM_PRESETS supaya hasil setelan tidak
          hilang begitu tab ditutup. */}
      <details style={{ marginTop: '2.5rem' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
          Salin angka ini ke <code>src/lib/catalog.ts</code>
        </summary>
        <pre
          style={{
            marginTop: '0.75rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            background: 'var(--color-bg-secondary)',
            fontSize: '0.75rem',
            overflowX: 'auto',
          }}
        >
          {FILM_PRESETS.map((p) => {
            const t = tune(p, knobs)
            return `// ${p.name}\nstrength: ${t.strength.toFixed(2)}, grain: ${t.grain.toFixed(2)}, vignette: ${t.vignette.toFixed(2)}, halation: ${t.halation.toFixed(3)},`
          }).join('\n')}
        </pre>
      </details>
    </main>
  )
}
