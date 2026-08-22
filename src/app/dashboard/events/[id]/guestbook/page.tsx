import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { listHostGuestbook } from '@/lib/guestbook'
import { createClient } from '@/lib/supabase/server'
import GuestbookManager from './GuestbookManager'
import styles from './GuestbookHost.module.css'

export const metadata: Metadata = {
  title: 'Voice Guestbook',
}

const PAGE_SIZE = 30

function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const page = Number(raw)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}

export default async function HostGuestbookPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ hal?: string | string[] }>
}) {
  const { id } = await props.params
  const search = await props.searchParams
  const page = parsePage(search.hal)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug')
    .eq('id', id)
    .eq('host_id', user.id)
    .maybeSingle<{ id: string; title: string; slug: string }>()
  if (!event) notFound()

  const guestbook = await listHostGuestbook(event.id, { page, pageSize: PAGE_SIZE })
  if (!guestbook.ok && guestbook.reason === 'unauthenticated') redirect('/login')
  if (!guestbook.ok && guestbook.reason === 'forbidden') notFound()

  if (guestbook.ok) {
    const totalPages = Math.max(1, Math.ceil(guestbook.total / guestbook.pageSize))
    if (page > totalPages) {
      redirect(
        totalPages === 1
          ? `/dashboard/events/${event.id}/guestbook`
          : `/dashboard/events/${event.id}/guestbook?hal=${totalPages}`
      )
    }
  }

  return (
    <div className={styles.page}>
      <Link href={`/dashboard/events/${event.id}`} className={styles.back}>
        <ArrowLeft size={15} />
        Kelola album
      </Link>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Voice guestbook</p>
          <h1>{event.title}</h1>
          <p>Putar dan kelola ucapan suara privat dari tamu.</p>
        </div>
        {guestbook.ok && (
          <div className={styles.total}>
            <strong>{guestbook.total}</strong>
            <span>Ucapan masuk</span>
          </div>
        )}
      </header>

      {guestbook.ok ? (
        <GuestbookManager
          key={`${guestbook.page}:${guestbook.entries
            .map((entry) => `${entry.id}:${entry.isHidden}:${entry.audioUrl ?? ''}`)
            .join('|')}`}
          eventId={event.id}
          entries={guestbook.entries}
          total={guestbook.total}
          page={guestbook.page}
          pageSize={guestbook.pageSize}
          hasMore={guestbook.hasMore}
        />
      ) : (
        <section className={styles.loadError} role="alert">
          <h2>Guestbook belum dapat dimuat</h2>
          <p>Rekaman tetap aman. Muat ulang halaman ini beberapa saat lagi.</p>
        </section>
      )}
    </div>
  )
}
