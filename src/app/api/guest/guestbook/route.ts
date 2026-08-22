import type { NextRequest } from 'next/server'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { findActiveGuest } from '@/lib/guest/event'
import { readGuestSession } from '@/lib/guest/session'
import {
  GUESTBOOK_AUDIO_BUCKET,
  GUESTBOOK_MAX_AUDIO_BYTES,
  GUESTBOOK_MAX_DURATION_MS,
  GUESTBOOK_MIN_AUDIO_BYTES,
  GUESTBOOK_MIN_DURATION_MS,
  GUESTBOOK_NOTE_MAX_CHARS,
  guestbookAudioPath,
  isUuid,
  normalizeGuestbookAudioMime,
  normalizeGuestbookNote,
  type GuestbookAudioMime,
} from '@/lib/guestbook-contract'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_JSON_BYTES = 16_384

type AdminClient = ReturnType<typeof createAdminClient>

interface Session {
  eventId: string
  guestId: string
}

interface ReservationResult {
  ok: boolean
  rejection_reason:
    | 'event_inactive'
    | 'guest_unavailable'
    | 'invalid_guest'
    | 'message_id_conflict'
    | 'already_submitted'
    | 'upload_in_progress'
    | 'rate_limited'
    | null
  event_slug: string | null
  existing_reservation: boolean
  already_ready: boolean
}

interface FinalizeResult {
  outcome:
    | 'finalized'
    | 'already_ready'
    | 'canceled'
    | 'not_found'
    | 'metadata_mismatch'
  recorded_bytes: number | null
  recorded_duration_ms: number | null
}

interface CancelResult {
  outcome: 'canceled' | 'already_canceled' | 'already_ready' | 'not_found'
  stored_audio_path: string | null
  stored_audio_mime: string | null
}

interface MessageStatusRow {
  status: 'pending' | 'ready' | 'failed'
  audio_path: string | null
  audio_mime: string | null
  audio_bytes: number | null
  duration_ms: number | null
}

interface StoredFileInfo {
  size?: number
  contentType?: string
  metadata?: {
    size?: number
    mimetype?: string
  }
}

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('cache-control', 'no-store')
  return Response.json(body, { ...init, headers })
}

function acceptsMutation(request: NextRequest): boolean {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false

  const origin = request.headers.get('origin')
  if (!origin) return true

  try {
    return new URL(origin).origin === request.nextUrl.origin
  } catch {
    return false
  }
}

/** Baca JSON dengan batas nyata, termasuk request chunked tanpa Content-Length. */
async function readSmallJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return null
  }

  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) return null
  if (!request.body) return null

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_JSON_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } catch {
    return null
  }

  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

async function authenticate(eventId: unknown): Promise<{ session: Session } | { error: Response }> {
  if (!isUuid(eventId)) {
    return { error: json({ error: 'Album tidak dikenal.' }, { status: 400 }) }
  }

  const normalizedEventId = eventId.toLowerCase()
  const cookie = await readGuestSession(normalizedEventId)
  if (!cookie) {
    return {
      error: json(
        { error: 'Sesi tamu tidak ditemukan. Muat ulang halaman.' },
        { status: 401 }
      ),
    }
  }

  const guest = await findActiveGuest(cookie.guestId, normalizedEventId)
  if (!guest) {
    return { error: json({ error: 'Aksesmu ke album ini dicabut.' }, { status: 403 }) }
  }

  return { session: { eventId: normalizedEventId, guestId: guest.id } }
}

function storedSize(info: StoredFileInfo): number | null {
  const value = info.size ?? info.metadata?.size
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null
}

function storedMime(info: StoredFileInfo): GuestbookAudioMime | null {
  return normalizeGuestbookAudioMime(info.contentType ?? info.metadata?.mimetype)
}

function storageErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  for (const key of ['status', 'statusCode'] as const) {
    if (key in error) {
      const value = Number((error as Record<string, unknown>)[key])
      if (Number.isInteger(value)) return value
    }
  }
  return null
}

function containsAscii(bytes: Uint8Array, needle: string): boolean {
  const target = new TextEncoder().encode(needle)
  if (target.byteLength > bytes.byteLength) return false

  outer: for (let index = 0; index <= bytes.byteLength - target.byteLength; index++) {
    for (let part = 0; part < target.byteLength; part++) {
      if (bytes[index + part] !== target[part]) continue outer
    }
    return true
  }
  return false
}

/**
 * Tolak blob biasa yang hanya diberi Content-Type audio. Pemeriksaan signature
 * dan codec bukan parser durasi penuh, tetapi memastikan container audio yang
 * diharapkan sebelum file privat ini pernah ditandatangani untuk pemutaran.
 */
function matchesAudioContainer(bytes: Uint8Array, mime: GuestbookAudioMime): boolean {
  if (mime === 'audio/webm') {
    return (
      bytes.byteLength >= 4 &&
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3 &&
      (containsAscii(bytes, 'A_OPUS') || containsAscii(bytes, 'A_VORBIS'))
    )
  }

  if (mime === 'audio/ogg') {
    return (
      bytes.byteLength >= 4 &&
      bytes[0] === 0x4f &&
      bytes[1] === 0x67 &&
      bytes[2] === 0x67 &&
      bytes[3] === 0x53 &&
      containsAscii(bytes, 'OpusHead')
    )
  }

  return (
    bytes.byteLength >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    containsAscii(bytes, 'mp4a')
  )
}

async function cancelReservation(
  supabase: AdminClient,
  session: Session,
  messageId: string,
  reason: string
): Promise<CancelResult | null> {
  const { data, error } = await supabase
    .rpc('cancel_pending_guestbook_audio', {
      p_message_id: messageId,
      p_guest_id: session.guestId,
      p_event_id: session.eventId,
      p_reason: reason,
    })
    .single<CancelResult>()

  if (error || !data) {
    console.error('cancel_pending_guestbook_audio gagal:', error)
    return null
  }

  return data
}

async function removeCanonicalAudio(
  supabase: AdminClient,
  session: Session,
  messageId: string,
  path: string | null,
  rawMime: string | null
) {
  const mime = normalizeGuestbookAudioMime(rawMime)
  if (!mime || !path || path !== guestbookAudioPath(session.eventId, messageId, mime)) {
    if (path) console.error('path guestbook tidak kanonis; cleanup dilewati:', { messageId })
    return
  }

  const { error } = await supabase.storage.from(GUESTBOOK_AUDIO_BUCKET).remove([path])
  if (error) console.error('cleanup audio guestbook gagal:', error)
}

function invalidMutationResponse(request: NextRequest): Response | null {
  if (!acceptsMutation(request)) {
    return json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 })
  }
  return null
}

// ---------------------------------------------------------------------------
// POST — reserve satu pesan dan terbitkan signed upload URL
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const rejected = invalidMutationResponse(request)
  if (rejected) return rejected

  const body = await readSmallJson(request)
  if (!body) return json({ error: 'Body tidak sah.' }, { status: 400 })

  const auth = await authenticate(body.eventId)
  if ('error' in auth) return auth.error
  const { session } = auth

  if (!isUuid(body.clientMessageId)) {
    return json({ error: 'ID rekaman tidak sah.' }, { status: 400 })
  }
  const messageId = body.clientMessageId.toLowerCase()

  const mime = normalizeGuestbookAudioMime(body.mimeType)
  const durationMs = Math.round(Number(body.durationMs))
  const note = normalizeGuestbookNote(body.note)
  if (
    !mime ||
    !Number.isSafeInteger(durationMs) ||
    durationMs < GUESTBOOK_MIN_DURATION_MS ||
    durationMs > GUESTBOOK_MAX_DURATION_MS ||
    note === undefined
  ) {
    return json({ error: 'Metadata rekaman tidak sah.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const path = guestbookAudioPath(session.eventId, messageId, mime)
  const { data: reservation, error: reservationError } = await supabase
    .rpc('reserve_guestbook_audio', {
      p_message_id: messageId,
      p_guest_id: session.guestId,
      p_event_id: session.eventId,
      p_body: note,
      p_audio_path: path,
      p_audio_mime: mime,
      p_duration_ms: durationMs,
    })
    .single<ReservationResult>()

  if (reservationError || !reservation) {
    console.error('reserve_guestbook_audio gagal:', reservationError)
    return json({ error: 'Gagal menyiapkan rekaman.' }, { status: 500 })
  }

  if (!reservation.ok) {
    const reason = reservation.rejection_reason
    // Idempotensi pada tingkat guest: bila konfirmasi sebelumnya sebenarnya
    // berhasil tetapi responsnya putus, retry UI memakai UUID baru. Anggap
    // pesan ready yang sudah ada sebagai sukses tanpa menerbitkan token baru.
    if (reason === 'already_submitted') {
      return json({
        ok: true,
        messageId,
        reusedReservation: false,
        alreadyReady: true,
        limits: {
          maxBytes: GUESTBOOK_MAX_AUDIO_BYTES,
          maxDurationMs: GUESTBOOK_MAX_DURATION_MS,
          noteMaxChars: GUESTBOOK_NOTE_MAX_CHARS,
        },
      })
    }

    const error =
      reason === 'upload_in_progress'
        ? 'Unggahan ucapan lain masih berlangsung. Tunggu sebentar lalu coba lagi.'
        : reason === 'message_id_conflict'
          ? 'ID rekaman sudah dipakai. Rekam ulang lalu coba lagi.'
          : reason === 'rate_limited'
            ? 'Terlalu banyak unggahan gagal. Tunggu sebelum mencoba lagi.'
            : reason === 'guest_unavailable'
              ? 'Akses tamu tidak tersedia lagi.'
              : reason === 'invalid_guest'
                ? 'Nama tamu tidak sah. Masuk ulang ke album.'
                : 'Album ini sedang tidak menerima ucapan.'

    return json(
      { code: reason, error },
      { status: reason === 'rate_limited' ? 429 : reason === 'guest_unavailable' ? 403 : 409 }
    )
  }

  if (reservation.already_ready) {
    return json({
      ok: true,
      messageId,
      reusedReservation: false,
      alreadyReady: true,
      limits: {
        maxBytes: GUESTBOOK_MAX_AUDIO_BYTES,
        maxDurationMs: GUESTBOOK_MAX_DURATION_MS,
        noteMaxChars: GUESTBOOK_NOTE_MAX_CHARS,
      },
    })
  }

  const { data: upload, error: uploadError } = await supabase.storage
    .from(GUESTBOOK_AUDIO_BUCKET)
    .createSignedUploadUrl(path, { upsert: false })

  if (uploadError || !upload) {
    console.error('createSignedUploadUrl guestbook gagal:', uploadError)
    // VoiceGuestbook membuat UUID baru pada klik ulang. Jangan meninggalkan
    // lease tanpa token yang akan memblokir retry itu selama 30 menit.
    await cancelReservation(supabase, session, messageId, 'signed_url_failed')
    return json({ error: 'Gagal menyiapkan unggahan rekaman.' }, { status: 500 })
  }

  return json({
    ok: true,
    messageId,
    reusedReservation: reservation.existing_reservation,
    alreadyReady: false,
    upload: { bucket: GUESTBOOK_AUDIO_BUCKET, path, token: upload.token },
    limits: {
      maxBytes: GUESTBOOK_MAX_AUDIO_BYTES,
      maxDurationMs: GUESTBOOK_MAX_DURATION_MS,
      noteMaxChars: GUESTBOOK_NOTE_MAX_CHARS,
    },
  })
}

// ---------------------------------------------------------------------------
// PATCH — verifikasi objek Storage + signature container, lalu finalize
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const rejected = invalidMutationResponse(request)
  if (rejected) return rejected

  const body = await readSmallJson(request)
  if (!body) return json({ error: 'Body tidak sah.' }, { status: 400 })

  const auth = await authenticate(body.eventId)
  if ('error' in auth) return auth.error
  const { session } = auth

  if (!isUuid(body.messageId)) {
    return json({ error: 'ID rekaman tidak sah.' }, { status: 400 })
  }
  const messageId = body.messageId.toLowerCase()
  const reportedBytes = Math.round(Number(body.bytes))
  if (
    !Number.isSafeInteger(reportedBytes) ||
    reportedBytes < GUESTBOOK_MIN_AUDIO_BYTES ||
    reportedBytes > GUESTBOOK_MAX_AUDIO_BYTES
  ) {
    return json({ error: 'Ukuran rekaman tidak sah.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: entry, error: entryError } = await supabase
    .from('messages')
    .select('status, audio_path, audio_mime, audio_bytes, duration_ms')
    .eq('id', messageId)
    .eq('guest_id', session.guestId)
    .eq('event_id', session.eventId)
    .maybeSingle<MessageStatusRow>()

  if (entryError) {
    console.error('membaca reservasi guestbook gagal:', entryError)
    return json({ error: 'Gagal memeriksa rekaman.' }, { status: 500 })
  }
  if (!entry) return json({ error: 'Rekaman tidak ditemukan.' }, { status: 404 })

  if (entry.status === 'ready') {
    return json({
      ok: true,
      alreadyReady: true,
      bytes: entry.audio_bytes,
      durationMs: entry.duration_ms,
    })
  }
  if (entry.status === 'failed') {
    return json({ error: 'Unggahan rekaman ini sudah dibatalkan.' }, { status: 409 })
  }

  const mime = normalizeGuestbookAudioMime(entry.audio_mime)
  if (!mime) {
    await cancelReservation(supabase, session, messageId, 'invalid_reservation_metadata')
    return json({ error: 'Metadata rekaman tidak sah.' }, { status: 409 })
  }

  const path = guestbookAudioPath(session.eventId, messageId, mime)
  if (entry.audio_path !== path) {
    await cancelReservation(supabase, session, messageId, 'invalid_reservation_path')
    console.error('path reservasi guestbook tidak kanonis:', { messageId })
    return json({ error: 'Metadata rekaman tidak sah.' }, { status: 409 })
  }

  const storage = supabase.storage.from(GUESTBOOK_AUDIO_BUCKET)
  const { data: info, error: infoError } = await storage.info(path)
  if (infoError || !info) {
    const missing = storageErrorStatus(infoError) === 404
    if (!missing) console.error('verifikasi objek guestbook gagal:', infoError)
    return json(
      {
        error: missing
          ? 'Unggahan belum lengkap. Coba konfirmasi lagi.'
          : 'Penyimpanan rekaman sedang tidak dapat diverifikasi.',
      },
      { status: missing ? 409 : 503 }
    )
  }

  const actualBytes = storedSize(info)
  const actualMime = storedMime(info)
  if (
    actualBytes === null ||
    actualBytes < GUESTBOOK_MIN_AUDIO_BYTES ||
    actualBytes > GUESTBOOK_MAX_AUDIO_BYTES ||
    actualMime !== mime
  ) {
    const canceled = await cancelReservation(
      supabase,
      session,
      messageId,
      'invalid_storage_object'
    )
    await removeCanonicalAudio(
      supabase,
      session,
      messageId,
      canceled?.stored_audio_path ?? path,
      canceled?.stored_audio_mime ?? mime
    )
    return json({ error: 'Berkas rekaman tidak sah. Silakan rekam ulang.' }, { status: 422 })
  }

  const { data: blob, error: downloadError } = await storage.download(path)
  if (downloadError || !blob) {
    console.error('mengunduh audio untuk verifikasi gagal:', downloadError)
    return json({ error: 'Rekaman belum dapat diverifikasi.' }, { status: 503 })
  }

  const bytes = new Uint8Array(await blob.arrayBuffer())
  if (bytes.byteLength !== actualBytes || !matchesAudioContainer(bytes, mime)) {
    const canceled = await cancelReservation(
      supabase,
      session,
      messageId,
      'invalid_audio_container'
    )
    await removeCanonicalAudio(
      supabase,
      session,
      messageId,
      canceled?.stored_audio_path ?? path,
      canceled?.stored_audio_mime ?? mime
    )
    return json(
      { error: 'Format rekaman tidak dapat dibaca. Silakan rekam ulang.' },
      { status: 422 }
    )
  }

  if (reportedBytes !== actualBytes) {
    console.warn('ukuran audio browser berbeda dengan Storage:', {
      messageId,
      reportedBytes,
      storedBytes: actualBytes,
    })
  }

  const { data: finalized, error: finalizeError } = await supabase
    .rpc('finalize_guestbook_audio', {
      p_message_id: messageId,
      p_guest_id: session.guestId,
      p_event_id: session.eventId,
      p_audio_bytes: actualBytes,
      p_audio_mime: mime,
    })
    .single<FinalizeResult>()

  if (finalizeError || !finalized) {
    console.error('finalize_guestbook_audio gagal:', finalizeError)
    return json({ error: 'Gagal menyimpan rekaman.' }, { status: 500 })
  }
  if (finalized.outcome === 'not_found') {
    return json({ error: 'Rekaman tidak ditemukan.' }, { status: 404 })
  }
  if (finalized.outcome === 'canceled') {
    return json({ error: 'Unggahan rekaman ini sudah kedaluwarsa.' }, { status: 409 })
  }
  if (finalized.outcome === 'metadata_mismatch') {
    return json({ error: 'Metadata rekaman tidak cocok.' }, { status: 409 })
  }

  revalidatePath(`/dashboard/events/${session.eventId}`)
  revalidatePath(`/dashboard/events/${session.eventId}/guestbook`)

  return json({
    ok: true,
    alreadyReady: finalized.outcome === 'already_ready',
    bytes: finalized.recorded_bytes,
    durationMs: finalized.recorded_duration_ms,
  })
}

// ---------------------------------------------------------------------------
// DELETE — batalkan lease; objek langsung dicoba hapus dan worker mengulang
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const rejected = invalidMutationResponse(request)
  if (rejected) return rejected

  const body = await readSmallJson(request)
  if (!body) return json({ error: 'Body tidak sah.' }, { status: 400 })

  const auth = await authenticate(body.eventId)
  if ('error' in auth) return auth.error
  const { session } = auth

  if (!isUuid(body.messageId)) {
    return json({ error: 'ID rekaman tidak sah.' }, { status: 400 })
  }
  const messageId = body.messageId.toLowerCase()
  const supabase = createAdminClient()
  const canceled = await cancelReservation(supabase, session, messageId, 'upload_failed')

  if (!canceled) {
    return json({ error: 'Gagal membatalkan unggahan.' }, { status: 500 })
  }

  if (canceled.outcome === 'canceled' || canceled.outcome === 'already_canceled') {
    after(() =>
      removeCanonicalAudio(
        supabase,
        session,
        messageId,
        canceled.stored_audio_path,
        canceled.stored_audio_mime
      )
    )
  }

  return json({
    ok: true,
    canceled: canceled.outcome !== 'already_ready',
    alreadyReady: canceled.outcome === 'already_ready',
  })
}
