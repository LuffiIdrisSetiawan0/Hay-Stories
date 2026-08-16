import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Camera, Clock, Lock } from 'lucide-react'
import { resolveReveal } from '@/lib/events'
import { findActiveGuest, findEventBySlug, isEventOpen } from '@/lib/guest/event'
import { readGuestSession } from '@/lib/guest/session'
import { listPhotos } from '@/lib/photos'
import PhotoGrid from '@/components/photos/PhotoGrid'
import { deleteGuestPhoto } from './actions'
import styles from './Gallery.module.css'

export const metadata: Metadata = {
  title: 'Galeri',
  robots: { index: false, follow: false },
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

  const page = Math.max(1, Number(search.hal ?? 1) || 1)
  const visible = reveal.revealed && !hostOnly
  const { photos, total, hasMore, failed } = visible
    ? await listPhotos(event.id, { page })
    : { photos: [], total: 0, hasMore: false, failed: false }

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

          {hasMore && (
            <div className={styles.more}>
              <Link href={`/a/${event.slug}/galeri?hal=${page + 1}`} className="btn btn-secondary">
                Muat lebih banyak
              </Link>
            </div>
          )}

          {page > 1 && (
            <div className={styles.more}>
              <Link
                href={page === 2 ? `/a/${event.slug}/galeri` : `/a/${event.slug}/galeri?hal=${page - 1}`}
                className={styles.quietLink}
              >
                Halaman sebelumnya
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  )
}
