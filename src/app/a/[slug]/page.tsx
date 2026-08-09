import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Camera, Check, Clock, Film, Images, Lock } from 'lucide-react'
import { FILM_PRESETS } from '@/lib/catalog'
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

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.brand}>HAY Stories</p>

        <h1 className={styles.title}>{event.title}</h1>

        <p className={styles.lede}>
          Kamera sekali pakai untuk acara ini. Pilih roll filmmu sendiri, ganti kapan saja.
        </p>

        <ul className={styles.facts}>
          <li className={styles.fact}>
            <Camera size={15} className={styles.factIcon} />
            <span>{event.shots_per_guest} jepretan untukmu</span>
          </li>
          <li className={styles.fact}>
            <Film size={15} className={styles.factIcon} />
            <span>{FILM_PRESETS.length} roll film untuk dipilih</span>
          </li>
          <li className={styles.fact}>
            {reveal.revealed ? (
              <>
                <Check size={15} className={styles.factIcon} />
                <span>Foto langsung terlihat di galeri</span>
              </>
            ) : reveal.revealAt ? (
              <>
                <Clock size={15} className={styles.factIcon} />
                <span>Semua foto terbuka {formatDateTime(event.reveal_at)}</span>
              </>
            ) : (
              <>
                <Lock size={15} className={styles.factIcon} />
                <span>Foto tersembunyi sampai host membukanya</span>
              </>
            )}
          </li>
        </ul>

        {!open ? (
          <div className={styles.notice}>
            <p className={styles.noticeTitle}>Album ini sudah ditutup</p>
            <p className={styles.noticeBody}>
              Host sudah mengakhiri sesi memotret. Kalau kamu merasa ini keliru, tanyakan langsung
              ke yang punya acara.
            </p>
          </div>
        ) : guest && !renaming ? (
          <div className={styles.ready}>
            <div className={styles.readyBadge}>
              <Check size={15} strokeWidth={3} />
              Kameramu siap, {guest.display_name}
            </div>

            <div className={styles.readyActions}>
              <Link href={`/a/${event.slug}/kamera`} className="btn btn-primary">
                Mulai memotret
                <ArrowRight size={16} />
              </Link>
              <Link href={`/a/${event.slug}/galeri`} className="btn btn-secondary">
                <Images size={16} />
                Galeri
              </Link>
            </div>

            {/*
              Sengaja tautan, bukan tombol yang menghapus sesi. Membuang cookie
              akan membuat pengiriman berikutnya dianggap perangkat baru dan
              memakan satu slot kuota lagi — mahal untuk sekadar salah ketik
              nama. Dengan sesi yang utuh, `join_event` hanya memperbarui nama
              pada baris tamu yang sudah ada.
            */}
            <Link href={`/a/${event.slug}?ganti=1`} className={styles.quietLink}>
              Salah nama? Betulkan
            </Link>
          </div>
        ) : (
          <JoinForm slug={event.slug} defaultName={guest?.display_name ?? ''} />
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
