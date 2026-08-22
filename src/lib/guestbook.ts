import 'server-only'

import {
  GUESTBOOK_AUDIO_BUCKET,
  GUESTBOOK_SIGNED_PLAYBACK_TTL_SECONDS,
  guestbookAudioPath,
  isUuid,
  normalizeGuestbookAudioMime,
  type GuestbookAudioMime,
} from '@/lib/guestbook-contract'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

interface GuestbookRow {
  id: string
  guest_name: string
  body: string | null
  audio_path: string | null
  audio_mime: string | null
  audio_bytes: number | null
  duration_ms: number | null
  is_hidden: boolean
  created_at: string
  moderated_at: string | null
}

export interface HostGuestbookEntry {
  id: string
  guestName: string
  note: string | null
  audioMime: GuestbookAudioMime | null
  audioBytes: number | null
  durationMs: number | null
  isHidden: boolean
  createdAt: string
  moderatedAt: string | null
  /** URL privat berumur 10 menit; null bila objek/metadata tidak dapat diverifikasi. */
  audioUrl: string | null
}

export type HostGuestbookPage =
  | {
      ok: true
      entries: HostGuestbookEntry[]
      total: number
      hasMore: boolean
      page: number
      pageSize: number
    }
  | {
      ok: false
      reason: 'unauthenticated' | 'forbidden' | 'unavailable'
      entries: []
      total: 0
      hasMore: false
      page: number
      pageSize: number
    }

function failedPage(
  reason: 'unauthenticated' | 'forbidden' | 'unavailable',
  page: number,
  pageSize: number
): HostGuestbookPage {
  return { ok: false, reason, entries: [], total: 0, hasMore: false, page, pageSize }
}

/**
 * Ambil pesan suara host dengan RLS sebagai gerbang pertama, lalu tandatangani
 * hanya path kanonis dari row yang lolos gerbang tersebut. Service role tidak
 * pernah dipakai untuk menentukan ownership.
 */
export async function listHostGuestbook(
  eventId: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<HostGuestbookPage> {
  const page = Number.isSafeInteger(options.page) ? Math.max(1, options.page!) : 1
  const requestedSize = Number.isSafeInteger(options.pageSize) ? options.pageSize! : 30
  const pageSize = Math.min(50, Math.max(1, requestedSize))
  const from = (page - 1) * pageSize

  if (!isUuid(eventId)) return failedPage('forbidden', page, pageSize)
  const normalizedEventId = eventId.toLowerCase()

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return failedPage('unauthenticated', page, pageSize)

    // Bedakan album kosong dari album orang lain tanpa membocorkan detailnya.
    const { data: ownedEvent, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', normalizedEventId)
      .eq('host_id', user.id)
      .maybeSingle<{ id: string }>()

    if (eventError) {
      console.error('listHostGuestbook gagal memeriksa album:', eventError)
      return failedPage('unavailable', page, pageSize)
    }
    if (!ownedEvent) return failedPage('forbidden', page, pageSize)

    const { data, count, error } = await supabase
      .from('messages')
      .select(
        'id, guest_name, body, audio_path, audio_mime, audio_bytes, duration_ms, is_hidden, created_at, moderated_at',
        { count: 'exact' }
      )
      .eq('event_id', normalizedEventId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + pageSize - 1)
      .returns<GuestbookRow[]>()

    if (error || count === null) {
      console.error('listHostGuestbook gagal membaca pesan:', error)
      return failedPage('unavailable', page, pageSize)
    }

    const rows = data ?? []
    const canonical = new Map<string, { path: string; mime: GuestbookAudioMime }>()
    for (const row of rows) {
      const mime = normalizeGuestbookAudioMime(row.audio_mime)
      if (!mime || !row.audio_path || !isUuid(row.id)) continue
      const path = guestbookAudioPath(normalizedEventId, row.id, mime)
      if (row.audio_path !== path) {
        console.error('path audio host tidak kanonis; signing dilewati:', { messageId: row.id })
        continue
      }
      canonical.set(row.id, { path, mime })
    }

    const urls = new Map<string, string>()
    if (canonical.size > 0) {
      const admin = createAdminClient()
      const requestedPaths = [...canonical.values()].map(({ path }) => path)
      const { data: signed, error: signingError } = await admin.storage
        .from(GUESTBOOK_AUDIO_BUCKET)
        .createSignedUrls(requestedPaths, GUESTBOOK_SIGNED_PLAYBACK_TTL_SECONDS)

      if (signingError) {
        console.error('signed playback URL guestbook gagal:', signingError)
      } else {
        for (const item of signed ?? []) {
          if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
        }
      }
    }

    const entries = rows.map<HostGuestbookEntry>((row) => {
      const audio = canonical.get(row.id)
      return {
        id: row.id,
        guestName: row.guest_name,
        note: row.body,
        audioMime: audio?.mime ?? null,
        audioBytes: row.audio_bytes,
        durationMs: row.duration_ms,
        isHidden: row.is_hidden,
        createdAt: row.created_at,
        moderatedAt: row.moderated_at,
        audioUrl: audio ? (urls.get(audio.path) ?? null) : null,
      }
    })

    return {
      ok: true,
      entries,
      total: count,
      hasMore: from + rows.length < count,
      page,
      pageSize,
    }
  } catch (error) {
    console.error('listHostGuestbook gagal:', error)
    return failedPage('unavailable', page, pageSize)
  }
}
