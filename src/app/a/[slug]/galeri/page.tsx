import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, Camera, Clock, Lock } from 'lucide-react'
import { resolveReveal } from '@/lib/events'
import { findActiveGuest, findEventBySlug, isEventOpen } from '@/lib/guest/event'
import { readGuestSession } from '@/lib/guest/session'
import { countReadyPhotos, listPhotos, type PhotoPage } from '@/lib/photos'
import PhotoGrid from '@/components/photos/PhotoGrid'
import { deleteGuestPhoto } from './actions'
import styles from './Gallery.module.css'

export const metadata: Metadata = {
  title: 'Galeri',
  robots: { index: false, follow: false },
}

const PHOTO_PAGE_SIZE = 48

function parsePage(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw
  const requested = Number(value)

  if (!Number.isSafeInteger(requested) || requested < 1) return 1

  // `.range()` menerima offset, bukan nomor halaman. Keduanya harus tetap
  // safe integer agar nilai ekstrem tidak dibulatkan sebelum sampai ke server.
  const offset = (requested - 1) * PHOTO_PAGE_SIZE
  return Number.isSafeInteger(offset) ? requested : 1
}

function formatDateTime(iso: string | null) {
  if (!iso) return null
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(iso)
  )
}

export default async function GalleryPage(props: PageProps<'/a/[slug]/galeri'>) {
  const { slug } = await props.params
  const search = await props.searchParams

  const event = await findEventBySlug(slug)
  if (!event) notFound()

  const reveal = resolveReveal(event)
  const hostOnly = event.gallery_visibility === 'host_only'
  const open = isEventOpen(event)

  const session = await readGuestSession(event.id)
  const guest = session ? await findActiveGuest(session.guestId, event.id) : null

  // Jika album BELUM terbuka dan pengunjung belum terdaftar:
  // arahkan ke halaman utama acara untuk bergabung
  if (!reveal.revealed && !guest) {
    redirect(`/a/${event.slug}`)
  }

  const page = parsePage(search.hal)
  const visible = reveal.revealed && !hostOnly
  const galleryPath = `/a/${event.slug}/galeri`

  let photoPage: PhotoPage = { photos: [], total: 0, hasMore: false, failed: false }
  if (visible) {
    const count = await countReadyPhotos(event.id)
    if (count.failed) {
      photoPage = { photos: [], total: 0, hasMore: false, failed: true }
    } else {
      const totalPages = Math.max(1, Math.ceil(count.total / PHOTO_PAGE_SIZE))
      if (page > totalPages) {
        redirect(totalPages === 1 ? galleryPath : `${galleryPath}?hal=${totalPages}`)
      }

      photoPage = await listPhotos(event.id, { page, pageSize: PHOTO_PAGE_SIZE })
    }
  }

  const { photos, total, hasMore, failed } = photoPage
  const totalPages = Math.max(1, Math.ceil(total / PHOTO_PAGE_SIZE))

  // Lindungi pula dari penghapusan foto yang terjadi di antara kueri count dan
  // kueri halaman: halaman terakhir bisa bergeser saat permintaan berlangsung.
  if (visible && !failed && page > totalPages) {
    redirect(totalPages === 1 ? galleryPath : `${galleryPath}?hal=${totalPages}`)
  }

  return (
    <main className={styles.page}>
      <header className={styles.bar}>
        <Link href={`/a/${event.slug}`} className={styles.back} aria-label="Kembali">
          <ArrowLeft size={18} />
        </Link>

        <div className={styles.barTitle}>
          <span className={styles.eventName}>{event.title}</span>
          <span className={styles.sub}>
            {!visible ? 'Belum terbuka' : failed ? 'Gagal dimuat' : `${total} foto`}
          </span>
        </div>

        {open && (
          <Link href={`/a/${event.slug}/kamera`} className={styles.cameraLink} aria-label="Kamera">
            <Camera size={18} />
          </Link>
        )}
      </header>

      {!visible ? (
        <section className={styles.locked}>
          <span className={styles.lockIcon}>
            {reveal.revealAt ? <Clock size={26} /> : <Lock size={26} />}
          </span>

          <h1 className={styles.lockedTitle}>
            {hostOnly ? 'Album ini privat' : 'Fotonya masih tersembunyi'}
          </h1>

          <p className={styles.lockedBody}>
            {hostOnly
              ? 'Host memilih menyimpan album ini hanya untuk dirinya. Fotomu tetap tersimpan dan terhitung.'
              : reveal.revealAt
                ? `Semua foto terbuka bersamaan pada ${formatDateTime(event.reveal_at)}.`
                : 'Semua foto terbuka bersamaan begitu host membukanya — biasanya setelah acara selesai.'}
          </p>

          {/*
            Jumlah kontribusi tamu ini boleh ditampilkan sekalipun fotonya belum
            boleh dilihat. Tanpa angka ini, tamu yang menjepret dua belas kali
            hanya melihat layar terkunci dan wajar menyangka jepretannya hilang.
          */}
          {guest && guest.shots_used > 0 && (
            <p className={styles.contribution}>
              Kamu sudah menyumbang <strong>{guest.shots_used}</strong> foto ke album ini.
            </p>
          )}

          {open && (
            <Link href={`/a/${event.slug}/kamera`} className="btn btn-primary">
              <Camera size={16} />
              Lanjut memotret
            </Link>
          )}
        </section>
      ) : failed ? (
        /*
         * Dibedakan dari album kosong dengan sengaja. Mengatakan "belum ada
         * foto" pada tamu yang baru saja menjepret dua belas kali akan membuat
         * mereka yakin jepretannya hilang.
         */
        <section className={styles.locked}>
          <h1 className={styles.lockedTitle}>Foto gagal dimuat</h1>
          <p className={styles.lockedBody}>
            Ini gangguan sementara di sisi kami, bukan tanda fotonya hilang. Coba muat ulang
            sebentar lagi.
          </p>
        </section>
      ) : photos.length === 0 ? (
        <section className={styles.locked}>
          <h1 className={styles.lockedTitle}>Belum ada foto</h1>
          <p className={styles.lockedBody}>
            Album sudah terbuka, tapi belum ada yang menjepret. Jadilah yang pertama.
          </p>
          {open && (
            <Link href={`/a/${event.slug}/kamera`} className="btn btn-primary">
              <Camera size={16} />
              Mulai memotret
            </Link>
          )}
        </section>
      ) : (
        <>
          <div className={styles.gridWrap}>
            <PhotoGrid
              photos={photos}
              eventTitle={event.title}
              currentGuestId={guest?.id}
              onDeletePhoto={deleteGuestPhoto.bind(null, event.slug)}
            />
          </div>

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Halaman galeri">
              {page > 1 ? (
                <Link
                  href={page === 2 ? galleryPath : `${galleryPath}?hal=${page - 1}`}
                  className={styles.pageLink}
                >
                  <ArrowLeft size={15} aria-hidden="true" />
                  Sebelumnya
                </Link>
              ) : (
                <span className={`${styles.pageLink} ${styles.pageLinkDisabled}`} aria-disabled="true">
                  <ArrowLeft size={15} aria-hidden="true" />
                  Sebelumnya
                </span>
              )}

              <span className={styles.pageStatus}>
                Halaman <strong aria-current="page">{page}</strong> dari {totalPages}
              </span>

              {hasMore ? (
                <Link href={`${galleryPath}?hal=${page + 1}`} className={styles.pageLink}>
                  Berikutnya
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ) : (
                <span className={`${styles.pageLink} ${styles.pageLinkDisabled}`} aria-disabled="true">
                  Berikutnya
                  <ArrowRight size={15} aria-hidden="true" />
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  )
}
