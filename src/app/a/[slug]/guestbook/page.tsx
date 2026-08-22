import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { findActiveGuest, findEventBySlug, isEventOpen } from '@/lib/guest/event'
import { readGuestSession } from '@/lib/guest/session'
import VoiceGuestbook from './VoiceGuestbook'

export const metadata: Metadata = {
  title: 'Voice Guestbook',
  robots: { index: false, follow: false },
}

export default async function GuestbookPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  const event = await findEventBySlug(slug)
  if (!event) notFound()

  const session = await readGuestSession(event.id)
  if (!session) redirect(`/a/${event.slug}?tujuan=guestbook`)

  const guest = await findActiveGuest(session.guestId, event.id)
  if (!guest) redirect(`/a/${event.slug}?tujuan=guestbook`)

  const admin = createAdminClient()
  const { data: existingEntry, error: entryError } = await admin
    .from('messages')
    .select('id')
    .eq('event_id', event.id)
    .eq('guest_id', guest.id)
    .eq('status', 'ready')
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (entryError) {
    console.error(`Gagal membaca voice guestbook ${event.id}:`, entryError)
  }

  return (
    <VoiceGuestbook
      eventId={event.id}
      slug={event.slug}
      title={event.title}
      guestName={guest.display_name}
      canSubmit={isEventOpen(event)}
      hasEntry={Boolean(existingEntry)}
    />
  )
}
