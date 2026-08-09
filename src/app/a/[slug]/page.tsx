import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
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
    // Tautan album tersebar lewat QR di meja tamu dan pesan WhatsApp. Tidak ada
    // alasan halaman ini muncul di hasil pencarian.
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

  // Cookie yang sah belum tentu berarti masih boleh masuk — host bisa saja
  // sudah mengeluarkan perangkat ini sejak token diterbitkan.
  const session = await readGuestSession(event.id)
  const guest = session ? await findActiveGuest(session.guestId, event.id) : null

  const renaming = 'ganti' in (await props.searchParams)

  /*
   * Tamu yang sudah terdaftar tidak punya urusan di halaman ini.
   *
   * Kartu perkenalan ini hanya berguna sekali seumur acara. Menahannya di sini
   * setiap kali tautan dibuka berarti satu ketukan tambahan menuju kamera,
   * setiap kali. Yang butuh halaman ini cuma orang yang belum punya sesi, atau
   * yang sengaja datang untuk membetulkan namanya.
   *
   * Tidak ada risiko putaran: halaman kamera memantulkan balik ke sini hanya
   * ketika sesinya tidak ada atau albumnya tertutup — syarat yang justru
   * membuat cabang ini tidak jalan.
   */
  if (open && guest && !renaming) redirect(`/a/${event.slug}/kamera`)

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.brand}>HAY Stories</p>

        <h1 className={styles.title}>{event.title}</h1>

        <p className={styles.lede}>Kamera sekali pakai untuk acara ini.</p>

        {!open ? (
          <div className={styles.notice}>
            <p className={styles.noticeTitle}>Album ini sudah ditutup</p>
            <p className={styles.noticeBody}>
              Host sudah mengakhiri sesi memotret. Kalau kamu merasa ini keliru, tanyakan langsung
              ke yang punya acara.
            </p>
          </div>
        ) : (
          <>
            <JoinForm slug={event.slug} defaultName={guest?.display_name ?? ''} />

            {/*
              Satu baris, di bawah tombol, bukan daftar di atasnya. Jatah
              jepretan sudah terpampang di penghitung kamera begitu masuk;
              yang tidak terlihat di mana pun sampai terlambat adalah kapan
              fotonya boleh dilihat — itu saja yang perlu disampaikan di sini.
            */}
            <p className={styles.fine}>
              {reveal.revealed
                ? 'Fotomu langsung muncul di galeri.'
                : reveal.revealAt
                  ? `Semua foto terbuka bersamaan ${formatDateTime(event.reveal_at)}.`
                  : 'Semua foto tersembunyi sampai host membukanya.'}
            </p>
          </>
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
