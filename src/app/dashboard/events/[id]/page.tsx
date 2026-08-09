import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Users, Image as ImageIcon, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPreset } from '@/lib/catalog'
import { guestUrl, resolveReveal } from '@/lib/events'
import { requestOrigin } from '@/lib/origin'
import { qrSvg } from '@/lib/qr'
import SharePanel from './SharePanel'
import RevealControl from './RevealControl'
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

  const [{ count: photoCount }, { count: guestCount }] = await Promise.all([
    supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('status', 'ready'),
    supabase.from('guests').select('id', { count: 'exact', head: true }).eq('event_id', event.id),
  ])

  const reveal = resolveReveal(event)
  const preset = getPreset(event.preset)
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
          <p className={styles.subtitle}>
            {[formatDate(event.event_date), preset?.name].filter(Boolean).join(' · ') ||
              'Belum ada tanggal'}
          </p>
        </div>
        <span className={`${styles.badge} ${reveal.revealed ? styles.badgeRevealed : ''}`}>
          {reveal.revealed ? 'Foto terbuka' : 'Foto tersembunyi'}
        </span>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <ImageIcon size={15} className={styles.statIcon} />
          <span className={styles.statValue}>{photoCount ?? 0}</span>
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

      <p className={styles.pending}>
        Halaman kamera tamu dan galeri sedang dikerjakan. Tautan di atas sudah final — QR yang kamu
        cetak sekarang tetap berlaku nanti.
      </p>
    </div>
  )
}
