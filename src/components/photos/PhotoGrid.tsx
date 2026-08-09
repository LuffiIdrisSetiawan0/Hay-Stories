'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Eye, EyeOff, X } from 'lucide-react'
import { getPreset } from '@/lib/catalog'
import { downloadUrl, photoFilename } from '@/lib/photo-links'
import type { SignedPhoto } from '@/lib/photos'
import styles from './PhotoGrid.module.css'

/**
 * Grid foto dengan penampil layar penuh. Dipakai galeri tamu maupun dashboard
 * host — bedanya hanya `moderation`, yang bila diisi memasang tombol
 * sembunyikan pada tiap ubin.
 */

interface Props {
  photos: SignedPhoto[]
  eventTitle: string
  /** Server Action untuk menyembunyikan/menampilkan. Hanya untuk host. */
  moderation?: (formData: FormData) => void
}

function formatTaken(iso: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('id-ID', { timeStyle: 'short', dateStyle: 'medium' }).format(
    new Date(iso)
  )
}

export default function PhotoGrid({ photos, eventTitle, moderation }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const open = openIndex === null ? null : photos[openIndex]

  const close = useCallback(() => setOpenIndex(null), [])

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((i) => {
        if (i === null) return i
        const next = i + delta
        return next < 0 || next >= photos.length ? i : next
      })
    },
    [photos.length]
  )

  // Keyboard hanya relevan saat penampil terbuka. Listener dipasang bersyarat
  // supaya galeri yang tertutup tidak menahan panah kiri/kanan halaman.
  useEffect(() => {
    if (openIndex === null) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex, close, step])

  // Halaman di belakang penampil tidak boleh ikut tergulir.
  useEffect(() => {
    if (openIndex === null) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [openIndex])

  return (
    <>
      <ul className={styles.grid}>
        {photos.map((photo, i) => (
          <li
            key={photo.id}
            className={`${styles.cell} ${photo.is_hidden ? styles.cellHidden : ''}`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className={styles.tile}
              aria-label={`Lihat foto oleh ${photo.guest_name}`}
            >
              {/* Thumbnail adalah blob bertanda tangan dari bucket privat —
                  tidak ada yang bisa dioptimasi next/image di sini. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumbUrl} alt="" loading="lazy" className={styles.thumb} />
              <span className={styles.credit}>{photo.guest_name}</span>
            </button>

            {moderation && (
              // Sibling tombol ubin, bukan anaknya: tombol di dalam tombol itu
              // HTML tidak sah dan perilaku kliknya jadi tak terduga.
              <form action={moderation} className={styles.moderate}>
                <input type="hidden" name="photoId" value={photo.id} />
                <input type="hidden" name="hidden" value={photo.is_hidden ? '0' : '1'} />
                <button
                  type="submit"
                  className={styles.moderateBtn}
                  aria-label={photo.is_hidden ? 'Tampilkan foto ini' : 'Sembunyikan foto ini'}
                  title={photo.is_hidden ? 'Tampilkan lagi' : 'Sembunyikan dari tamu'}
                >
                  {photo.is_hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {open && (
        <div
          className={styles.viewer}
          role="dialog"
          aria-modal="true"
          aria-label={`Foto oleh ${open.guest_name}`}
          onClick={close}
        >
          <div className={styles.viewerBar} onClick={(e) => e.stopPropagation()}>
            <div className={styles.viewerMeta}>
              <span className={styles.viewerName}>{open.guest_name}</span>
              <span className={styles.viewerSub}>
                {[formatTaken(open.taken_at), getPreset(open.preset ?? '')?.name]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>

            <a
              href={downloadUrl(open.fullUrl, photoFilename(eventTitle, open.id))}
              className={styles.viewerBtn}
              aria-label="Unduh foto ini"
              title="Unduh"
            >
              <Download size={18} />
            </a>

            <button
              type="button"
              onClick={close}
              className={styles.viewerBtn}
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open.fullUrl}
            alt={`Foto oleh ${open.guest_name} di ${eventTitle}`}
            className={styles.viewerImage}
            onClick={(e) => e.stopPropagation()}
          />

          <div className={styles.viewerNav} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={openIndex === 0}
              className="btn btn-secondary"
            >
              Sebelumnya
            </button>
            <span className={styles.viewerCount}>
              {(openIndex ?? 0) + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={openIndex === photos.length - 1}
              className="btn btn-secondary"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </>
  )
}
