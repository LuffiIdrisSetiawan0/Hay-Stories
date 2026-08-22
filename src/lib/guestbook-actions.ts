'use server'

import { revalidatePath } from 'next/cache'
import {
  GUESTBOOK_AUDIO_BUCKET,
  guestbookAudioPath,
  isUuid,
  normalizeGuestbookAudioMime,
} from '@/lib/guestbook-contract'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface GuestbookMutationResult {
  ok: boolean
  message: string
  isHidden?: boolean
  cleanupPending?: boolean
}

interface VisibilityResult {
  outcome: 'updated' | 'unauthenticated' | 'invalid' | 'forbidden' | 'not_found'
  event_slug: string | null
  entry_hidden: boolean | null
}

interface DeleteResult {
  outcome:
    | 'deleted'
    | 'already_deleted'
    | 'unauthenticated'
    | 'invalid'
    | 'forbidden'
    | 'not_found'
  event_slug: string | null
  stored_audio_path: string | null
  stored_audio_mime: string | null
  storage_cleanup_pending: boolean
}

function refreshGuestbook(eventId: string, slug: string | null) {
  revalidatePath(`/dashboard/events/${eventId}`)
  revalidatePath(`/dashboard/events/${eventId}/guestbook`)
  if (slug) revalidatePath(`/a/${slug}/guestbook`)
}

async function authenticatedClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ? supabase : null
}

export async function setGuestbookEntryHidden(
  eventId: string,
  entryId: string,
  hidden: boolean
): Promise<GuestbookMutationResult> {
  if (!isUuid(eventId) || !isUuid(entryId) || typeof hidden !== 'boolean') {
    return { ok: false, message: 'Pesan suara tidak dikenal.' }
  }

  const supabase = await authenticatedClient()
  if (!supabase) return { ok: false, message: 'Sesi berakhir. Masuk lagi untuk melanjutkan.' }

  const normalizedEventId = eventId.toLowerCase()
  const { data, error } = await supabase
    .rpc('set_guestbook_entry_visibility', {
      p_event_id: normalizedEventId,
      p_entry_id: entryId.toLowerCase(),
      p_hidden: hidden,
    })
    .single<VisibilityResult>()

  if (error || !data) {
    console.error('set_guestbook_entry_visibility gagal:', error)
    return { ok: false, message: 'Moderasi pesan gagal. Coba lagi sebentar.' }
  }
  if (data.outcome !== 'updated') {
    return { ok: false, message: 'Pesan tidak ditemukan atau kamu tidak memiliki akses.' }
  }

  refreshGuestbook(normalizedEventId, data.event_slug)
  return {
    ok: true,
    isHidden: Boolean(data.entry_hidden),
    message: data.entry_hidden ? 'Pesan disembunyikan.' : 'Pesan ditampilkan kembali.',
  }
}

export async function deleteGuestbookEntry(
  eventId: string,
  entryId: string
): Promise<GuestbookMutationResult> {
  if (!isUuid(eventId) || !isUuid(entryId)) {
    return { ok: false, message: 'Pesan suara tidak dikenal.' }
  }

  const supabase = await authenticatedClient()
  if (!supabase) return { ok: false, message: 'Sesi berakhir. Masuk lagi untuk melanjutkan.' }

  const normalizedEventId = eventId.toLowerCase()
  const normalizedEntryId = entryId.toLowerCase()
  const { data, error } = await supabase
    .rpc('delete_guestbook_entry', {
      p_event_id: normalizedEventId,
      p_entry_id: normalizedEntryId,
    })
    .single<DeleteResult>()

  if (error || !data) {
    console.error('delete_guestbook_entry gagal:', error)
    return { ok: false, message: 'Pesan gagal dihapus. Coba lagi sebentar.' }
  }
  if (data.outcome !== 'deleted' && data.outcome !== 'already_deleted') {
    return { ok: false, message: 'Pesan tidak ditemukan atau kamu tidak memiliki akses.' }
  }

  let cleanupPending = data.storage_cleanup_pending
  const mime = normalizeGuestbookAudioMime(data.stored_audio_mime)
  if (data.stored_audio_path && mime) {
    const canonical = guestbookAudioPath(normalizedEventId, normalizedEntryId, mime)
    if (data.stored_audio_path === canonical) {
      const admin = createAdminClient()
      const { error: storageError } = await admin.storage
        .from(GUESTBOOK_AUDIO_BUCKET)
        .remove([canonical])
      if (storageError) {
        console.error('hapus objek guestbook gagal; worker akan mengulang:', storageError)
      }
      // Tombstone tetap cleanup-pending sampai seluruh upload token lama mati;
      // worker menghapus ulang dan baru kemudian menandai storage_cleaned_at.
      cleanupPending = true
    } else {
      console.error('path audio delete tidak kanonis; cleanup dilewati:', {
        messageId: normalizedEntryId,
      })
      cleanupPending = true
    }
  }

  refreshGuestbook(normalizedEventId, data.event_slug)
  return {
    ok: true,
    cleanupPending,
    message: 'Pesan suara dihapus.',
  }
}
