import type { Metadata } from 'next'
import { io } from 'next/cache'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Users,
  Image as ImageIcon,
  Clock,
  MessageCircleHeart,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getEventLifecycle, guestUrl, resolveReveal, type EventLifecycle } from '@/lib/events'
import { listPhotos } from '@/lib/photos'
import { requestOrigin } from '@/lib/origin'
import { qrSvg } from '@/lib/qr'
import PhotoGrid from '@/components/photos/PhotoGrid'
import SharePanel from './SharePanel'
import RevealControl from './RevealControl'
import SettingsPanel, { LocalDateTime } from './SettingsPanel'
import { deleteHostPhoto } from './actions'
import styles from './Manage.module.css'

const PHOTO_PAGE_SIZE = 48

export const metadata: Metadata = {
  title: 'Kelola Album — HAY Stories',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(iso))
}

function closedAccessMessage(tone: EventLifecycle['tone']) {
  if (tone === 'draft') {
    return 'Album masih berupa draf. Aktifkan album sebelum mencetak atau membagikan QR.'
  }
  if (tone === 'expired') {
    return 'Masa aktif album telah habis. QR dan kode akses tidak menerima tamu atau foto baru.'
  }
  if (tone === 'archived') {
    return 'Album telah dinonaktifkan atau diarsipkan. QR dan kode akses tidak menerima tamu atau foto baru.'
  }
  return 'Album telah selesai. QR dan kode akses tidak menerima tamu atau foto baru.'
}

async function readRequestTime() {
  await io()
  return Date.now()
}

export default async function ManageEventPage(props: PageProps<'/dashboard/events/[id]'>) {
  const { id } = await props.params
  const search = await props.searchParams
  const rawPage = Array.isArray(search.hal) ? search.hal[0] : search.hal
  const requestedPage = Number(rawPage)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS sudah membatasi ke acara milik host ini, jadi id acara orang lain
  // otomatis mengembalikan baris kosong dan berakhir 404.
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!event) notFound()

  /*
   * Foto dibaca lewat service role, bukan lewat sesi host.
   *
   * RLS memang sudah mengizinkan host membaca baris fotonya sendiri, tapi
   * bucket `photos` sengaja dibuat tanpa satu pun storage policy — jadi tanpa
   * service role, barisnya terbaca sementara gambarnya tetap tidak bisa
   * ditandatangani. Kepemilikannya sudah terbukti di kueri `event` di atas:
   * baris yang bukan miliknya berakhir di `notFound()` sebelum sampai sini.
   */
  const [guestCountResult, guestbookCountResult, photoPage] = await Promise.all([
    supabase.from('guests').select('id', { count: 'exact', head: true }).eq('event_id', event.id),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('status', 'ready'),
    listPhotos(event.id, { page, pageSize: PHOTO_PAGE_SIZE, includeHidden: true }),
  ])

  const guestCount = guestCountResult.error ? null : guestCountResult.count
  if (guestCountResult.error) {
    console.error(`Gagal menghitung tamu acara ${event.id}:`, guestCountResult.error)
  }
  const guestbookCount = guestbookCountResult.error ? null : guestbookCountResult.count
  if (guestbookCountResult.error) {
    console.error(`Gagal menghitung voice guestbook ${event.id}:`, guestbookCountResult.error)
  }

  const photoCount = photoPage.total
  const photoTotal = photoPage.total
  const photos = photoPage.photos
  const totalPages = Math.max(1, Math.ceil(photoTotal / PHOTO_PAGE_SIZE))

  if (!photoPage.failed && page > totalPages) {
    redirect(`/dashboard/events/${event.id}?hal=${totalPages}#foto`)
  }

  const firstPhoto = photos.length > 0 ? (page - 1) * PHOTO_PAGE_SIZE + 1 : 0
  const lastPhoto = photos.length > 0 ? firstPhoto + photos.length - 1 : 0

  const lifecycleNow = await readRequestTime()
  const lifecycle = getEventLifecycle(event, lifecycleNow)
  const reveal = resolveReveal(event, lifecycleNow)
  const url = guestUrl(event.slug, await requestOrigin())
  const svg = await qrSvg(url)
  const revealMode =
    event.reveal_mode === 'immediate' ||
    event.reveal_mode === 'scheduled' ||
    event.reveal_mode === 'manual'
      ? event.reveal_mode
      : 'manual'
  const galleryVisibility = event.gallery_visibility === 'host_only' ? 'host_only' : 'guests'
  const expiresAt = event.expires_at ? new Date(event.expires_at).getTime() : null
  const reactivationAllowed =
    expiresAt === null || !Number.isFinite(expiresAt) || expiresAt > lifecycleNow

  return (
    <div className={styles.page}>
      <Link href="/dashboard" className={styles.back}>
        <ArrowLeft size={15} />
        Semua album
      </Link>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{event.title}</h1>
          <p className={styles.subtitle}>{formatDate(event.event_date) ?? 'Belum ada tanggal'}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/dashboard/events/${event.id}/guestbook`} className={styles.guestbookLink}>
            <MessageCircleHeart size={16} aria-hidden="true" />
            <span>Voice guestbook</span>
            {guestbookCount !== null && <strong>{guestbookCount}</strong>}
          </Link>
          <span
            className={`${styles.badge} ${
              lifecycle.acceptsPhotos ? styles.badgeLive : styles.badgeClosed
            }`}
          >
            {lifecycle.label}
          </span>
        </div>
      </header>

      {!lifecycle.acceptsPhotos && (
        <section className={styles.lifecycleWarning} role="status" aria-label="Akses QR tidak aktif">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <strong>QR tidak lagi menerima jepretan</strong>
            <p>{closedAccessMessage(lifecycle.tone)}</p>
            {lifecycle.tone === 'draft' && event.tier !== 'starter' && (
              <Link href={`/dashboard/checkout/${event.id}`} className={styles.warningAction}>
                Lanjutkan pembayaran
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </section>
      )}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <ImageIcon size={15} className={styles.statIcon} />
          {/* Nol yang keliru lebih buruk dari tanda tanya: host akan mengira
              fotonya hilang, padahal yang gagal cuma pembacaannya. */}
          <span className={styles.statValue}>{photoPage.failed ? '—' : photoCount}</span>
          <span className={styles.statLabel}>Foto masuk</span>
        </div>
        <div className={styles.stat}>
          <Users size={15} className={styles.statIcon} />
          <span className={styles.statValue}>
            {guestCount === null ? (
              '—'
            ) : (
              <>
                {guestCount}
                <span className={styles.statMax}>
                  /{event.max_guests.toLocaleString('id-ID')}
                </span>
              </>
            )}
          </span>
          <span className={styles.statLabel}>Tamu bergabung</span>
        </div>
        <div className={styles.stat}>
          <Clock size={15} className={styles.statIcon} />
          <span className={styles.statValue}>{event.shots_per_guest}</span>
          <span className={styles.statLabel}>Jepretan per tamu</span>
        </div>
      </div>

      <div className={styles.columns}>
        <SharePanel url={url} accessCode={event.access_code} qrSvg={svg} title={event.title} />

        <section className={`${styles.card} ${styles.revealCard}`}>
          <h2 className={styles.cardTitle}>Waktu terbuka</h2>
          <p className={styles.cardHint}>
            {event.reveal_mode === 'immediate' &&
              'Foto langsung muncul di galeri begitu tamu menjepret.'}
            {event.reveal_mode === 'scheduled' &&
              (event.reveal_at ? (
                reveal.revealed ? (
                  <>
                    Sudah terbuka sejak <LocalDateTime value={event.reveal_at} />.
                  </>
                ) : (
                  <>
                    Terbuka otomatis pada <LocalDateTime value={event.reveal_at} />.
                  </>
                )
              ) : (
                'Waktu terbuka otomatis belum ditentukan.'
              ))}
            {event.reveal_mode === 'manual' &&
              (reveal.revealed
                ? 'Kamu sudah membuka album ini.'
                : 'Foto tetap tersembunyi sampai kamu membukanya.')}
          </p>

          {!reveal.revealed && <RevealControl eventId={event.id} />}
        </section>
      </div>

      <SettingsPanel
        eventId={event.id}
        initialTitle={event.title}
        initialEventDate={event.event_date}
        initialRevealMode={revealMode}
        initialRevealAt={event.reveal_at}
        initialGalleryVisibility={galleryVisibility}
        initialStatus={event.status ?? 'draft'}
        revealLocked={reveal.revealed || event.status === 'revealed'}
        reactivationAllowed={reactivationAllowed}
      />

      <section id="foto" className={`${styles.card} ${styles.photos}`}>
        <h2 className={styles.cardTitle}>Foto masuk</h2>
        <p className={styles.cardHint}>
          {photoPage.failed
            ? 'Foto tidak bisa dimuat saat ini. Ini gangguan pada penyimpanan, bukan tanda fotonya hilang — muat ulang sebentar lagi.'
            : photos.length === 0
              ? 'Belum ada foto. Begitu tamu mulai menjepret, fotonya muncul di sini — kamu bisa melihatnya lebih dulu, sebelum album dibuka.'
              : 'Kamu melihat ini lebih dulu. Ketuk ikon tong sampah pada foto untuk menghapus foto yang tidak diinginkan dan mengembalikan jepretan tamu (bisa retake).'}
        </p>

        {photos.length > 0 && (
          <div className={styles.gridWrap}>
            <PhotoGrid
              photos={photos}
              eventTitle={event.title}
              isHost={true}
              onDeletePhoto={deleteHostPhoto}
            />
          </div>
        )}

        {!photoPage.failed && photoTotal > 0 && (
          <div className={styles.paginationSummary} aria-live="polite">
            Menampilkan {firstPhoto}–{lastPhoto} dari {photoTotal} foto
          </div>
        )}

        {!photoPage.failed && totalPages > 1 && (
          <nav className={styles.pagination} aria-label="Halaman foto">
            {page > 1 ? (
              <Link
                href={`/dashboard/events/${event.id}?hal=${page - 1}#foto`}
                className={styles.pageLink}
              >
                <ArrowLeft size={15} />
                Sebelumnya
              </Link>
            ) : (
              <span className={`${styles.pageLink} ${styles.pageLinkDisabled}`} aria-disabled="true">
                <ArrowLeft size={15} />
                Sebelumnya
              </span>
            )}

            <span className={styles.pageStatus}>
              Halaman <strong aria-current="page">{page}</strong> dari {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={`/dashboard/events/${event.id}?hal=${page + 1}#foto`}
                className={styles.pageLink}
              >
                Berikutnya
                <ArrowRight size={15} />
              </Link>
            ) : (
              <span className={`${styles.pageLink} ${styles.pageLinkDisabled}`} aria-disabled="true">
                Berikutnya
                <ArrowRight size={15} />
              </span>
            )}
          </nav>
        )}
      </section>
    </div>
  )
}
