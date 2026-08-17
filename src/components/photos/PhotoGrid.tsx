'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, X, ChevronLeft, ChevronRight, Loader2, Trash2, Share2 } from 'lucide-react'
import { getPreset } from '@/lib/catalog'
import { photoFilename, downloadUrl } from '@/lib/photo-links'
import { drawFramed, getFrame } from '@/lib/frames'
import type { SignedPhoto } from '@/lib/photos'
import styles from './PhotoGrid.module.css'

type GridPhotoRow = SignedPhoto

interface Props {
  photos: SignedPhoto[]
  eventTitle: string
  /** ID tamu yang sedang aktif (untuk izin menghapus foto sendiri) */
  currentGuestId?: string
  /** True jika dibuka oleh host (bisa menghapus foto apa saja) */
  isHost?: boolean
  /** Handler untuk menghapus foto secara permanen dan mengembalikan kuota jepretan (retake) */
  onDeletePhoto?: (photoId: string) => Promise<{ ok: boolean; error?: string } | void>
}

function formatTaken(iso: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('id-ID', { timeStyle: 'short', dateStyle: 'medium' }).format(
    new Date(iso)
  )
}

export default function PhotoGrid({
  photos: initialPhotos,
  eventTitle,
  currentGuestId,
  isHost = false,
  onDeletePhoto,
}: Props) {
  const [photos, setPhotos] = useState<SignedPhoto[]>(initialPhotos)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Keep state in sync with incoming props
  useEffect(() => {
    setPhotos(initialPhotos)
  }, [initialPhotos])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

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
   * Hapus foto dan kembalikan jepretan (Retake).
   */
  const handleDelete = useCallback(
    async (photo: GridPhotoRow, e?: React.MouseEvent) => {
      if (e) e.stopPropagation()
      if (!onDeletePhoto || deletingId) return

      const confirmed = window.confirm(
        'Hapus foto ini dari album? Kuota jepretan akan dikembalikan sehingga bisa foto ulang (retake).'
      )
      if (!confirmed) return

      setDeletingId(photo.id)
      try {
        const res = await onDeletePhoto(photo.id)
        if (res && typeof res === 'object' && !res.ok) {
          throw new Error(res.error ?? 'Gagal menghapus foto.')
        }

        // Hapus dari state lokal
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
        setToast('Foto dihapus. Kuota jepretan dikembalikan untuk retake!')

        // Jika lightbox sedang terbuka pada foto yang dihapus
        if (openIndex !== null) {
          close()
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Gagal menghapus foto.')
      } finally {
        setDeletingId(null)
      }
    },
    [onDeletePhoto, deletingId, openIndex, close]
  )

  /**
   * Mengambil dan memproses blob foto beresolusi penuh beserta bingkai (bila ada).
   */
  const getProcessedBlob = useCallback(
    async (photo: GridPhotoRow): Promise<{ blob: Blob; filename: string }> => {
      const filename = photoFilename(eventTitle, photo.id)
      const frame = getFrame(photo.frame ?? 'none')

      const res = await fetch(photo.fullUrl)
      if (!res.ok) throw new Error('Gagal mengambil berkas foto.')
      const rawBlob = await res.blob()

      if (frame && frame.id !== 'none') {
        const objectUrl = URL.createObjectURL(rawBlob)
        try {
          let imgWidth = 0
          let imgHeight = 0
          let imgElem: HTMLImageElement | ImageBitmap

          if (typeof createImageBitmap === 'function') {
            const bmp = await createImageBitmap(rawBlob)
            imgWidth = bmp.width
            imgHeight = bmp.height
            imgElem = bmp
          } else {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.src = objectUrl
            await new Promise((resolve, reject) => {
              img.onload = () => resolve(img)
              img.onerror = reject
            })
            imgWidth = img.naturalWidth
            imgHeight = img.naturalHeight
            imgElem = img
          }

          const canvas = drawFramed(imgElem, imgWidth, imgHeight, frame, {
            title: eventTitle,
            takenAt: photo.taken_at ? new Date(photo.taken_at) : null,
          })

          const outBlob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error('Gagal memproses bingkai gambar.'))),
              'image/jpeg',
              0.96
            )
          )

          if ('close' in imgElem && typeof (imgElem as ImageBitmap).close === 'function') {
            ;(imgElem as ImageBitmap).close()
          }

          return { blob: outBlob, filename }
        } finally {
          URL.revokeObjectURL(objectUrl)
        }
      }

      return { blob: rawBlob, filename }
    },
    [eventTitle]
  )

  /**
   * Unduh foto langsung ke memori/folder unduhan perangkat (100% otomatis).
   */
  const download = useCallback(
    async (photo: GridPhotoRow) => {
      setSaving(true)
      setToast('Menyiapkan & mengunduh foto… 📥')
      try {
        const { blob, filename } = await getProcessedBlob(photo)
        const downloadHref = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = downloadHref
        a.download = filename
        a.rel = 'noopener'
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()

        setToast('Foto berhasil diunduh ke perangkatmu! 📥✨')

        setTimeout(() => {
          if (document.body.contains(a)) {
            document.body.removeChild(a)
          }
          URL.revokeObjectURL(downloadHref)
        }, 6000)
      } catch (err) {
        console.error('Download error:', err)
        // Fallback Supabase Content-Disposition attachment direct URL
        const fallbackFilename = photoFilename(eventTitle, photo.id)
        const directUrl = downloadUrl(photo.fullUrl, fallbackFilename)
        const a = document.createElement('a')
        a.href = directUrl
        a.download = fallbackFilename
        a.rel = 'noopener'
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a)
        }, 6000)
        setToast('Mengunduh foto langsung dari server… 📥')
      } finally {
        setSaving(false)
      }
    },
    [eventTitle, getProcessedBlob]
  )

  /**
   * Bagikan foto (khusus jika pengguna menekan tombol Bagikan).
   */
  const share = useCallback(
    async (photo: GridPhotoRow) => {
      setSaving(true)
      try {
        const { blob, filename } = await getProcessedBlob(photo)
        if (typeof navigator !== 'undefined' && navigator.canShare) {
          const file = new File([blob], filename, { type: 'image/jpeg' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: eventTitle,
              text: `Foto kenangan dari ${eventTitle}`,
            })
            setToast('Foto siap dibagikan! 🎉')
            return
          }
        }
        setToast('Fitur bagikan langsung tidak didukung di browser ini.')
      } catch (shareErr) {
        if (shareErr instanceof Error && shareErr.name === 'AbortError') return
        console.warn('Share error:', shareErr)
      } finally {
        setSaving(false)
      }
    },
    [eventTitle, getProcessedBlob]
  )

  const presetInfo = open?.preset ? getPreset(open.preset) : null
  const frameInfo = open?.frame && open.frame !== 'none' ? getFrame(open.frame) : null

  return (
    <>
      {toast && <div className={styles.toastMsg}>{toast}</div>}

      <ul className={styles.grid}>
        {photos.map((photo, i) => {
          const photoPreset = photo.preset ? getPreset(photo.preset) : null
          const canDelete = isHost || (Boolean(currentGuestId) && photo.guest_id === currentGuestId)
          const isDeleting = deletingId === photo.id

          return (
            <li key={photo.id} className={styles.cell}>
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

              {canDelete && onDeletePhoto && (
                <div className={styles.deleteActionWrapper}>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(photo, e)}
                    disabled={isDeleting}
                    className={styles.deleteBtn}
                    title="Hapus foto & kembalikan jepretan (Retake)"
                    aria-label="Hapus foto"
                  >
                    {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
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
              <button
                type="button"
                onClick={() => share(open)}
                disabled={saving}
                className={styles.iconButton}
                title="Bagikan Foto"
                aria-label="Bagikan foto"
              >
                <Share2 size={18} />
              </button>

              <button
                type="button"
                onClick={() => download(open)}
                disabled={saving}
                className={styles.iconButton}
                title="Unduh / Simpan Foto"
                aria-label="Unduh foto"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              </button>

              {(isHost || (Boolean(currentGuestId) && open.guest_id === currentGuestId)) &&
                onDeletePhoto && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(open, e)}
                    disabled={deletingId === open.id}
                    className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                    title="Hapus foto & kembalikan jepretan (Retake)"
                    aria-label="Hapus foto"
                  >
                    {deletingId === open.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
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

          {/* Bottom Bar with Counter and Download */}
          <footer className={styles.lightboxBottomBar} onClick={(e) => e.stopPropagation()}>
            <span className={styles.photoCounter}>
              {openIndex + 1} / {photos.length}
            </span>

            <button
              type="button"
              onClick={() => download(open)}
              disabled={saving}
              className={styles.downloadBtn}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{saving ? 'Menyiapkan…' : 'Unduh / Simpan Foto'}</span>
            </button>
          </footer>
        </div>
      )}
    </>
  )
}
