import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Images } from 'lucide-react'
import { resolveReveal } from '@/lib/events'
import { findActiveGuest, findEventBySlug, isEventOpen } from '@/lib/guest/event'
import { readGuestSession } from '@/lib/guest/session'
import JoinForm from './JoinForm'
import styles from '../Guest.module.css'

export async function generateMetadata(
  props: PageProps<'/a/[slug]'>
): Promise<Metadata> {
  const { slug } = await props.params
  const event = await findEventBySlug(slug)

  return {
    title: event ? event.title : 'Album tidak ditemukan',
    robots: { index: false, follow: false },
  }
}

function formatDateTime(iso: string | null) {
  if (!iso) return null
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export default async function GuestEntryPage(props: PageProps<'/a/[slug]'>) {
  const { slug } = await props.params
  const event = await findEventBySlug(slug)

  if (!event) notFound()

  const reveal = resolveReveal(event)
  const open = isEventOpen(event)

  const session = await readGuestSession(event.id)
  const guest = session ? await findActiveGuest(session.guestId, event.id) : null

  const renaming = 'ganti' in (await props.searchParams)

  // Jika tamu sudah terdaftar dan tidak sedang ganti nama:
  // arahkan langsung ke kamera jika acara buka, atau ke galeri jika album sudah terbuka
  if (guest && !renaming) {
    if (open) {
      redirect(`/a/${event.slug}/kamera`)
    } else if (reveal.revealed) {
      redirect(`/a/${event.slug}/galeri`)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.brand}>HAY Stories</p>

        <h1 className={styles.title}>{event.title}</h1>

        <p className={styles.lede}>Kamera sekali pakai untuk acara ini.</p>

        {reveal.revealed ? (
          <div
            className={styles.notice}
            style={{
              background: 'rgba(255, 199, 44, 0.12)',
              borderColor: 'rgba(255, 199, 44, 0.45)',
            }}
          >
            <p className={styles.noticeTitle} style={{ color: '#d97706' }}>
              🎉 Album Foto Sudah Dibuka!
            </p>
            <p className={styles.noticeBody}>
              Semua foto jepretan dari acara ini sudah dibuka dan siap dilihat.
            </p>
            <Link
              href={`/a/${event.slug}/galeri`}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              <Images size={16} />
              Buka Galeri Foto
            </Link>
          </div>
        ) : !open ? (
          <div className={styles.notice}>
            <p className={styles.noticeTitle}>Album ini sudah ditutup</p>
            <p className={styles.noticeBody}>
              Host sudah mengakhiri sesi memotret. Kalau kamu merasa ini keliru, tanyakan langsung
              ke yang punya acara.
            </p>
          </div>
        ) : null}

        {open && (
          <div style={{ marginTop: reveal.revealed ? '1.5rem' : '0' }}>
            {reveal.revealed && (
              <p
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                  color: 'rgba(245, 242, 236, 0.85)',
                }}
              >
                Mau ikut menjepret foto juga?
              </p>
            )}
            <JoinForm slug={event.slug} defaultName={guest?.display_name ?? ''} />

            <p className={styles.fine}>
              {reveal.revealed
                ? 'Fotomu langsung muncul di galeri.'
                : reveal.revealAt
                  ? `Semua foto terbuka bersamaan ${formatDateTime(event.reveal_at)}.`
                  : 'Semua foto tersembunyi sampai host membukanya.'}
            </p>
          </div>
        )}
      </div>

      <p className={styles.footer}>
        Punya kode dari kartu meja?{' '}
        <Link href="/a" className={styles.footerLink}>
          Masukkan kode
        </Link>
      </p>
    </main>
  )
}
