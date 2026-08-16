'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Eye, EyeOff, X, Loader2 } from 'lucide-react'
import { getPreset } from '@/lib/catalog'
import { photoFilename } from '@/lib/photo-links'
import { drawFramed, getFrame } from '@/lib/frames'
import type { SignedPhoto } from '@/lib/photos'
import styles from './PhotoGrid.module.css'

/**
 * Grid foto dengan penampil layar penuh. Dipakai galeri tamu maupun dashboard
 * host — bedanya hanya `moderation`, yang bila diisi memasang tombol
 * sembunyikan pada tiap ubin.
 */

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

  /**
   * Unduh dengan bingkai ditempelkan di perangkat ini.
   *
   * Arsip di storage sengaja polos, jadi bingkainya dikomposit saat diunduh —
   * di browser, bukan di server. Gambarnya toh sudah dimuat penampil layar
   * penuh, jadi tidak ada perjalanan jaringan tambahan dan tidak ada waktu
   * eksekusi fungsi yang dibayar per unduhan.
   */
  const download = useCallback(
    async (photo: GridPhotoRow) => {
      setSaving(true)
      try {
        const frame = getFrame(photo.frame ?? 'none')
        const res = await fetch(photo.fullUrl)
        if (!res.ok) throw new Error(String(res.status))
        const blob = await res.blob()

        // Tanpa bingkai, berkas aslinya diteruskan apa adanya — tidak ada
        // alasan mengencode ulang dan kehilangan kualitas.
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
              className={styles.cellBtn}
              onClick={() => setOpenIndex(i)}
              aria-label={`Buka foto dari ${photo.guest_name ?? 'tamu'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className={styles.thumb}
              />
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Penampil foto"
          className={styles.lightbox}
          onClick={close}
        >
          <div className={styles.lightboxPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.lightboxMedia}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={open.fullUrl}
                alt={`Foto oleh ${open.guest_name ?? 'tamu'}`}
                className={styles.lightboxImg}
              />
            </div>

            <footer className={styles.lightboxMeta}>
              <div className={styles.metaText}>
                <strong>{open.guest_name ?? 'Tamu'}</strong>
                <span className={styles.metaRoll}>
                  {open.preset ? (getPreset(open.preset)?.name ?? open.preset) : 'Default'}
                  {open.frame && open.frame !== 'none' && ` · ${getFrame(open.frame)?.name}`}
                </span>
                <span className={styles.metaDate}>{formatTaken(open.taken_at)}</span>
              </div>

              <div className={styles.actions}>
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
                      className="btn btn-secondary"
                      title={open.is_hidden ? 'Tampilkan kembali di galeri' : 'Sembunyikan dari galeri'}
                    >
                      {open.is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                      {open.is_hidden ? 'Tampilkan' : 'Sembunyikan'}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => download(open)}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {saving ? 'Menyiapkan…' : 'Unduh foto'}
                </button>

                <button
                  type="button"
                  onClick={close}
                  className={styles.closeBtn}
                  aria-label="Tutup"
                >
                  <X size={20} />
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
