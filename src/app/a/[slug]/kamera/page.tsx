import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { findActiveGuest, findEventBySlug, isEventOpen } from '@/lib/guest/event'
import { readGuestSession } from '@/lib/guest/session'
import Camera from './Camera'

export const metadata: Metadata = {
  title: 'Kamera',
  robots: { index: false, follow: false },
}

export default async function CameraPage(props: PageProps<'/a/[slug]/kamera'>) {
  const { slug } = await props.params
  const event = await findEventBySlug(slug)

  if (!event) notFound()

  /*
   * Semua jalan keluar mengarah balik ke pintu masuk, bukan ke 404.
   *
   * Tamu sampai di sini dengan memindai QR, jadi kegagalan apa pun — cookie
   * kedaluwarsa, akses dicabut, album ditutup — paling masuk akal berakhir di
   * halaman yang bisa menjelaskan keadaannya dan, kalau memungkinkan,
   * mendaftarkan mereka lagi.
   */
  if (!isEventOpen(event)) redirect(`/a/${event.slug}`)

  const session = await readGuestSession(event.id)
  if (!session) redirect(`/a/${event.slug}`)

  const guest = await findActiveGuest(session.guestId, event.id)
  if (!guest) redirect(`/a/${event.slug}`)

  return (
    <Camera
      eventId={event.id}
      slug={event.slug}
      title={event.title}
      guestName={guest.display_name}
      shotsUsed={guest.shots_used}
      shotsLimit={event.shots_per_guest}
    />
  )
}
