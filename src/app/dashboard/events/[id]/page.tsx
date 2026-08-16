import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Users, Image as ImageIcon, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { guestUrl, resolveReveal } from '@/lib/events'
import { listPhotos } from '@/lib/photos'
import { requestOrigin } from '@/lib/origin'
import { qrSvg } from '@/lib/qr'
import PhotoGrid from '@/components/photos/PhotoGrid'
import SharePanel from './SharePanel'
import RevealControl from './RevealControl'
import { deleteHostPhoto } from './actions'
import styles from './Manage.module.css'

export const metadata: Metadata = {
  title: 'Kelola Album — HAY Stories',
}

function formatDate(iso: string | null, withTime = false) {
  if (!iso) return null
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(new Date(iso))
}

export default async function ManageEventPage(props: PageProps<'/dashboard/events/[id]'>) {
  const { id } = await props.params
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
  const [{ count: guestCount }, photoPage] = await Promise.all([
    supabase.from('guests').select('id', { count: 'exact', head: true }).eq('event_id', event.id),
    listPhotos(event.id, { includeHidden: true }),
  ])

  const photoCount = photoPage.total
  const hasMorePhotos = photoPage.hasMore
  const photoTotal = photoPage.total

  const photos = photoPage.photos

  const reveal = resolveReveal(event)
  const url = guestUrl(event.slug, await requestOrigin())
  const svg = await qrSvg(url)

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
        <span className={`${styles.badge} ${reveal.revealed ? styles.badgeRevealed : ''}`}>
          {reveal.revealed ? 'Foto terbuka' : 'Foto tersembunyi'}
        </span>
      </header>

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
            {guestCount ?? 0}
            <span className={styles.statMax}>/{event.max_guests}</span>
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

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Waktu terbuka</h2>
          <p className={styles.cardHint}>
            {event.reveal_mode === 'immediate' &&
              'Foto langsung muncul di galeri begitu tamu menjepret.'}
            {event.reveal_mode === 'scheduled' &&
              (reveal.revealed
                ? `Sudah terbuka sejak ${formatDate(event.reveal_at, true)}.`
                : `Terbuka otomatis pada ${formatDate(event.reveal_at, true)}.`)}
            {event.reveal_mode === 'manual' &&
              (reveal.revealed
                ? 'Kamu sudah membuka album ini.'
                : 'Foto tetap tersembunyi sampai kamu membukanya.')}
          </p>

          {!reveal.revealed && <RevealControl eventId={event.id} />}
        </section>
      </div>

      <section className={`${styles.card} ${styles.photos}`}>
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

        {hasMorePhotos && (
          <p className={styles.cardHint}>
            Menampilkan {photos.length} dari {photoTotal} foto terbaru.
          </p>
        )}
      </section>
    </div>
  )
}
