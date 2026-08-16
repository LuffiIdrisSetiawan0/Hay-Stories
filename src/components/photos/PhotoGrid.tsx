'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Eye, EyeOff, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { getPreset } from '@/lib/catalog'
import { photoFilename } from '@/lib/photo-links'
import { drawFramed, getFrame } from '@/lib/frames'
import type { SignedPhoto } from '@/lib/photos'
import styles from './PhotoGrid.module.css'

type GridPhotoRow = SignedPhoto

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
  const [saving, setSaving] = useState(false)
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

  // Keyboard navigation
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

  // Prevent background scrolling while lightbox is open
  useEffect(() => {
    if (openIndex === null) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [openIndex])

  /**
   * Unduh foto dengan bingkai yang diterapkan di browser.
   */
  const download = useCallback(
    async (photo: GridPhotoRow) => {
      setSaving(true)
      try {
        const frame = getFrame(photo.frame ?? 'none')
        const res = await fetch(photo.fullUrl)
        if (!res.ok) throw new Error(String(res.status))
        const blob = await res.blob()

        let out = blob
        if (frame && frame.id !== 'none') {
          const bitmap = await createImageBitmap(blob)
          try {
            const canvas = drawFramed(bitmap, bitmap.width, bitmap.height, frame, {
              title: eventTitle,
              takenAt: photo.taken_at ? new Date(photo.taken_at) : null,
            })
            out = await new Promise<Blob>((resolve, reject) =>
              canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error('Gagal membuat berkas.'))),
                'image/jpeg',
                0.95
              )
            )
          } finally {
            bitmap.close()
          }
        }

        const href = URL.createObjectURL(out)
        const a = document.createElement('a')
        a.href = href
        a.download = photoFilename(eventTitle, photo.id)
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
          document.body.removeChild(a)
          URL.revokeObjectURL(href)
        }, 4000)
      } catch (err) {
        console.error('Download error:', err)
      } finally {
        setSaving(false)
      }
    },
    [eventTitle]
  )

  const presetInfo = open?.preset ? getPreset(open.preset) : null
  const frameInfo = open?.frame && open.frame !== 'none' ? getFrame(open.frame) : null

  return (
    <>
      <ul className={styles.grid}>
        {photos.map((photo, i) => {
          const photoPreset = photo.preset ? getPreset(photo.preset) : null
          return (
            <li
              key={photo.id}
              className={`${styles.cell} ${photo.is_hidden ? styles.cellHidden : ''}`}
            >
              <button
                type="button"
                className={styles.tile}
                onClick={() => setOpenIndex(i)}
                aria-label={`Buka foto dari ${photo.guest_name || 'Tamu'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbUrl}
                  alt={`Foto dari ${photo.guest_name || 'Tamu'}`}
                  loading="lazy"
                  decoding="async"
                  className={styles.thumb}
                />
                <div className={styles.credit}>
                  <span className={styles.creditName}>{photo.guest_name || 'Tamu'}</span>
                  {photoPreset && (
                    <span className={styles.creditPreset}>{photoPreset.name}</span>
                  )}
                </div>
              </button>

              {moderation && (
                <div className={styles.moderate}>
                  <form action={moderation}>
                    <input type="hidden" name="photoId" value={photo.id} />
                    <input
                      type="hidden"
                      name="hidden"
                      value={photo.is_hidden ? 'false' : 'true'}
                    />
                    <button
                      type="submit"
                      className={styles.moderateBtn}
                      title={photo.is_hidden ? 'Tampilkan kembali di galeri' : 'Sembunyikan dari galeri'}
                      aria-label={photo.is_hidden ? 'Tampilkan' : 'Sembunyikan'}
                    >
                      {photo.is_hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </form>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* Lightbox / Penampil Foto Layar Penuh */}
      {open !== null && openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Penampil foto layar penuh"
          className={styles.lightbox}
          onClick={close}
        >
          {/* Top Bar */}
          <header className={styles.lightboxTopBar} onClick={(e) => e.stopPropagation()}>
            <div className={styles.metaBlock}>
              <span className={styles.metaAuthor}>{open.guest_name || 'Tamu'}</span>
              <div className={styles.metaSub}>
                <span className={styles.badgeRoll}>
                  {presetInfo?.name ?? open.preset ?? 'Analog'}
                </span>
                {frameInfo && <span>· {frameInfo.name}</span>}
                <span>· {formatTaken(open.taken_at)}</span>
              </div>
            </div>

            <div className={styles.topActions}>
              {moderation && (
                <form action={moderation}>
                  <input type="hidden" name="photoId" value={open.id} />
                  <input
                    type="hidden"
                    name="hidden"
                    value={open.is_hidden ? 'false' : 'true'}
                  />
                  <button
                    type="submit"
                    className={styles.iconButton}
                    title={open.is_hidden ? 'Tampilkan foto di galeri' : 'Sembunyikan foto dari galeri'}
                  >
                    {open.is_hidden ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={close}
                className={styles.iconButton}
                aria-label="Tutup penampil foto"
                title="Tutup (ESC)"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {/* Stage Image and Navigation Controls */}
          <div className={styles.stage} onClick={close}>
            {openIndex > 0 && (
              <button
                type="button"
                className={`${styles.navArrow} ${styles.navPrev}`}
                onClick={(e) => {
                  e.stopPropagation()
                  step(-1)
                }}
                aria-label="Foto sebelumnya"
                title="Sebelumnya (←)"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <div className={styles.imageWrapper} onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={open.fullUrl}
                alt={`Foto oleh ${open.guest_name || 'Tamu'}`}
                className={styles.mainImage}
              />
            </div>

            {openIndex < photos.length - 1 && (
              <button
                type="button"
                className={`${styles.navArrow} ${styles.navNext}`}
                onClick={(e) => {
                  e.stopPropagation()
                  step(1)
                }}
                aria-label="Foto berikutnya"
                title="Berikutnya (→)"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Bottom Bar */}
          <footer className={styles.lightboxBottomBar} onClick={(e) => e.stopPropagation()}>
            <span className={styles.counter}>
              {openIndex + 1} / {photos.length}
            </span>

            <button
              type="button"
              onClick={() => download(open)}
              disabled={saving}
              className={styles.downloadBtn}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {saving ? 'Menyiapkan…' : 'Unduh Foto'}
            </button>
          </footer>
        </div>
      )}
    </>
  )
}
