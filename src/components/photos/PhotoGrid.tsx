'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, X, ChevronLeft, ChevronRight, Loader2, Trash2, Share2 } from 'lucide-react'
import { getPreset } from '@/lib/catalog'
import { photoFilename, downloadUrl } from '@/lib/photo-links'
import { drawFramed, framedSize, frameTimestamp, getFrame } from '@/lib/frames'
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

function validPhotoSize(photo: GridPhotoRow) {
  return {
    width: photo.width && photo.width > 0 ? photo.width : 1600,
    height: photo.height && photo.height > 0 ? photo.height : 1200,
  }
}

/**
 * Pratinjau DOM dari geometri yang sama dengan `drawFramed()`.
 *
 * Foto mentah tetap disimpan tanpa bingkai. Komponen ini membuat crop, padding,
 * sprocket, dan caption terlihat di grid/lightbox tanpa memproses ulang 48
 * bitmap di browser. Saat diunduh, `drawFramed()` membakar geometri yang sama ke
 * JPEG resolusi penuh.
 */
function FramedPhoto({
  photo,
  eventTitle,
  src,
  alt,
  variant,
}: {
  photo: GridPhotoRow
  eventTitle: string
  src: string
  alt: string
  variant: 'grid' | 'lightbox'
}) {
  const frame = getFrame(photo.frame ?? 'none') ?? getFrame('none')!
  const source = validPhotoSize(photo)
  const box = framedSize(frame, source.width, source.height)
  const ratio = box.width / box.height
  const gridWidth = Math.min(1, ratio) * 100
  const gridHeight = Math.min(1, 1 / ratio) * 100
  const photoStyle = {
    left: `${(box.offsetX / box.width) * 100}%`,
    top: `${(box.offsetY / box.height) * 100}%`,
    width: `${(box.photoWidth / box.width) * 100}%`,
    height: `${(box.photoHeight / box.height) * 100}%`,
  }
  const bandHeight = (box.offsetY / box.height) * 100
  const captionHeight = ((box.height - box.offsetY - box.photoHeight) / box.height) * 100
  const parsedTakenAt = photo.taken_at ? new Date(photo.taken_at) : null
  const takenAt = parsedTakenAt && !Number.isNaN(parsedTakenAt.getTime()) ? parsedTakenAt : null

  return (
    <span
      className={`${styles.framedPhoto} ${
        variant === 'grid' ? styles.gridPhoto : styles.lightboxPhoto
      }`}
      style={{
        aspectRatio: `${box.width} / ${box.height}`,
        backgroundColor: frame.background,
        ...(variant === 'grid'
          ? { width: `${gridWidth}%`, height: `${gridHeight}%` }
          : { width: `min(90vw, ${ratio * 75}vh)` }),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={variant === 'grid' ? 'lazy' : 'eager'} decoding="async" className={styles.framedImage} style={photoStyle} />

      {frame.sprockets && (
        <>
          <span
            aria-hidden="true"
            className={`${styles.frameSprockets} ${styles.frameSprocketsTop}`}
            style={{ height: `${bandHeight}%` }}
          />
          <span
            aria-hidden="true"
            className={`${styles.frameSprockets} ${styles.frameSprocketsBottom}`}
            style={{ height: `${bandHeight}%` }}
          />
        </>
      )}

      {frame.caption && (
        <span
          aria-hidden="true"
          className={styles.frameCaption}
          style={{ height: `${captionHeight}%` }}
        >
          <span className={styles.frameTitle}>{eventTitle}</span>
          <span className={styles.frameStamp}>{frameTimestamp(takenAt)}</span>
        </span>
      )}
    </span>
  )
}

export default function PhotoGrid({
  photos: initialPhotos,
  eventTitle,
  currentGuestId,
  isHost = false,
  onDeletePhoto,
}: Props) {
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<Set<string>>(() => new Set())
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Props tetap menjadi sumber kebenaran saat pindah halaman. State lokal hanya
  // menyimpan optimistic deletion, jadi tidak perlu setState sinkron di effect.
  const photos = initialPhotos.filter((photo) => !deletedPhotoIds.has(photo.id))
  const photoCount = photos.length

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const open = openIndex === null ? null : photos[openIndex]
  const lightboxOpen = openIndex !== null

  const close = useCallback(() => setOpenIndex(null), [])

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((i) => {
        if (i === null) return i
        const next = i + delta
        return next < 0 || next >= photoCount ? i : next
      })
    },
    [photoCount]
  )

  // Keyboard navigation + focus trap untuk dialog modal.
  useEffect(() => {
    if (!lightboxOpen) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus())

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'Tab') {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
          ) ?? []
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', onKey)
      previouslyFocused?.focus()
    }
  }, [lightboxOpen, close, step])

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

        // Sembunyikan secara optimistis tanpa menyalin seluruh props ke state.
        setDeletedPhotoIds((prev) => {
          const next = new Set(prev)
          next.add(photo.id)
          return next
        })
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
      {toast && (
        <div
          className={styles.toastMsg}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {toast}
        </div>
      )}

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
                <FramedPhoto
                  photo={photo}
                  eventTitle={eventTitle}
                  src={photo.thumbUrl}
                  alt={`Foto dari ${photo.guest_name || 'Tamu'}`}
                  variant="grid"
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
          ref={dialogRef}
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
                ref={closeButtonRef}
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
              <FramedPhoto
                photo={open}
                eventTitle={eventTitle}
                src={open.fullUrl}
                alt={`Foto oleh ${open.guest_name || 'Tamu'}`}
                variant="lightbox"
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
            <span
              className={styles.photoCounter}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              Foto {openIndex + 1} dari {photos.length}
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
