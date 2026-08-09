'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { FILM_PRESETS, type PresetId } from '@/lib/catalog'
import { FilmRenderer, isFilmSupported } from '@/lib/film'
import styles from './Wizard.module.css'

const SAMPLE = '/img/hero-placeholder.jpg'

/**
 * Pemilih preset film dengan pratinjau yang dirender sungguhan.
 *
 * Keenam kartu melewati pipeline WebGL yang sama dengan kamera tamu, jadi apa
 * yang host lihat saat memilih benar-benar sama dengan yang akan didapat
 * tamunya. Ini juga momen paling meyakinkan di seluruh alur pembuatan album.
 */
export default function PresetPicker({
  value,
  onChange,
}: {
  value: PresetId
  onChange: (id: PresetId) => void
}) {
  const [failed, setFailed] = useState(false)
  const targetsRef = useRef(new Map<string, HTMLCanvasElement>())

  const registerTarget = useCallback((id: string, el: HTMLCanvasElement | null) => {
    if (el) targetsRef.current.set(id, el)
    else targetsRef.current.delete(id)
  }, [])

  useEffect(() => {
    const glCanvas = document.createElement('canvas')
    let cancelled = false
    let renderer: FilmRenderer | null = null
    let bitmap: ImageBitmap | null = null

    ;(async () => {
      try {
        if (!isFilmSupported()) {
          setFailed(true)
          return
        }

        renderer = new FilmRenderer(glCanvas)

        const response = await fetch(SAMPLE)
        if (!response.ok) throw new Error('Gambar contoh gagal dimuat')
        bitmap = await createImageBitmap(await response.blob())
        if (cancelled) return

        for (const preset of FILM_PRESETS) {
          const target = targetsRef.current.get(preset.id)
          if (!target) continue

          await renderer.loadPreset(preset)
          if (cancelled) return

          renderer.render(bitmap, preset, bitmap.width, bitmap.height)
          target.width = bitmap.width
          target.height = bitmap.height
          target.getContext('2d')?.drawImage(glCanvas, 0, 0)
        }
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      bitmap?.close()
      renderer?.dispose()
    }
  }, [])

  return (
    <>
      <div className={styles.presetGrid}>
        {FILM_PRESETS.map((preset) => {
          const active = preset.id === value
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.id)}
              aria-pressed={active}
              className={`${styles.presetCard} ${active ? styles.presetCardActive : ''}`}
            >
              <canvas
                ref={(el) => registerTarget(preset.id, el)}
                className={styles.presetCanvas}
                aria-hidden="true"
              />
              {active && (
                <span className={styles.presetCheck}>
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
              <span className={styles.presetMeta}>
                <span className={styles.presetName}>{preset.name}</span>
                <span className={styles.presetCharacter}>{preset.character}</span>
              </span>
            </button>
          )
        })}
      </div>

      <p className={styles.presetNote}>
        {failed
          ? 'Pratinjau tidak bisa ditampilkan di perangkat ini, tapi presetnya tetap berfungsi untuk tamu.'
          : 'Pratinjau dirender dengan mesin film yang sama dengan kamera tamu. Pilihan ini menyatu ke foto dan tidak bisa diubah setelah acara mulai.'}
      </p>
    </>
  )
}
