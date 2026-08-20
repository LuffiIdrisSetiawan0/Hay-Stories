import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FILM_PRESETS } from '@/lib/catalog'
import { getFrame } from '@/lib/frames'
import { findActiveGuest } from '@/lib/guest/event'
import { readGuestSession } from '@/lib/guest/session'
import { PHOTO_BUCKET, photoPaths } from '@/lib/photos'

/**
 * Satu jepretan tamu, dari reservasi kuota sampai konfirmasi.
 *
 *   POST   reservasi satu jepretan + metadata, terbitkan signed upload URL
 *   PATCH  verifikasi dua objek Storage lalu finalisasi secara idempoten
 *   DELETE batalkan secara idempoten dan kembalikan kuota tepat sekali
 *
 * JPEG tidak melewati server aplikasi. Klien mengunggah langsung ke Supabase
 * Storage, sedangkan route ini memverifikasi metadata objek sebelum membuatnya
 * terlihat di galeri.
 */

const MAX_BYTES = 26_214_400 // sama dengan file_size_limit bucket `photos`
const MAX_THUMB_BYTES = 5_242_880
// capture.ts membatasi sisi terpanjang ke 4096. Sampai dimensi JPEG dibaca
// server-side, metadata di luar kontrak tersebut harus ditolak.
const MAX_DIMENSION = 4_096
// Versi 3 = karakter warna antarpreset dikalibrasi agar tetap terbaca pada
// preview adaptif. Baris lama tetap membawa recipe/version saat dibuat.
const PROCESSING_RECIPE_VERSION = 3
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type AdminClient = ReturnType<typeof createAdminClient>

interface Session {
  guestId: string
  eventId: string
}

interface ReservationResult {
  ok: boolean
  shots_used: number
  shots_limit: number
  rejection_reason:
    | 'guest_unavailable'
    | 'event_inactive'
    | 'quota_exhausted'
    | 'photo_id_conflict'
    | 'rate_limited'
    | null
  expired_count: number
  existing_reservation: boolean
}

interface FinalizeResult {
  outcome: 'finalized' | 'already_ready' | 'canceled' | 'not_found'
  recorded_bytes: number | null
}

interface CancelResult {
  outcome: 'canceled' | 'already_canceled' | 'already_ready' | 'not_found'
  full_path: string | null
  preview_path: string | null
}

interface StoredFileInfo {
  size?: number
  contentType?: string
  metadata?: {
    size?: number
    mimetype?: string
  }
}

interface TombstoneRow {
  id: string
  storage_path: string | null
  thumb_path: string | null
}

/** Otentikasi berbasis cookie httpOnly tamu, bukan nilai identitas dari body. */
async function authenticate(
  eventId: unknown
): Promise<{ session: Session } | { error: Response }> {
  if (typeof eventId !== 'string' || !eventId) {
    return { error: Response.json({ error: 'Permintaan tidak lengkap.' }, { status: 400 }) }
  }

  const cookie = await readGuestSession(eventId)
  if (!cookie) {
    return {
      error: Response.json({ error: 'Sesi tamu tidak ditemukan. Muat ulang halaman.' }, { status: 401 }),
    }
  }

  const guest = await findActiveGuest(cookie.guestId, eventId)
  if (!guest) {
    return { error: Response.json({ error: 'Aksesmu ke album ini dicabut.' }, { status: 403 }) }
  }

  return { session: { guestId: guest.id, eventId } }
}

function storedSize(info: StoredFileInfo): number | null {
  const value = info.size ?? info.metadata?.size
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null
}

function storedMime(info: StoredFileInfo): string | null {
  const value = info.contentType ?? info.metadata?.mimetype
  return typeof value === 'string' ? value.split(';', 1)[0].trim().toLowerCase() : null
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

/** Lepas reservasi di DB tanpa pernah mengurangi kuota dua kali. */
async function cancelReservation(
  supabase: AdminClient,
  session: Session,
  photoId: string,
  reason: string
): Promise<CancelResult | null> {
  const { data, error } = await supabase
    .rpc('cancel_pending_photo', {
      p_photo_id: photoId,
      p_guest_id: session.guestId,
      p_event_id: session.eventId,
      p_reason: reason,
    })
    .single<CancelResult>()

  if (error || !data) {
    console.error('cancel_pending_photo gagal:', error)
    return null
  }

  if (data.outcome === 'canceled' || data.outcome === 'already_canceled') {
    const canonical = photoPaths(session.eventId, photoId)
    if (
      (data.full_path && data.full_path !== canonical.full) ||
      (data.preview_path && data.preview_path !== canonical.thumb)
    ) {
      // Jangan pernah menghapus path asing atau tombstone penunjuknya walaupun
      // metadata DB rusak. Biarkan untuk rekonsiliasi manual.
      console.error('path tombstone foto tidak kanonis:', { photoId })
    }
  }

  return data
}

/**
 * Bersihkan objek tombstone hanya setelah seluruh signed upload token pasti mati.
 * Tombstone yang lebih muda sengaja dibiarkan: PATCH akan melihat `failed` dan
 * tidak mungkin memfinalisasi upload terlambat menjadi foto siap tayang. Row
 * tetap disimpan agar UUID/path lama tidak pernah dapat direservasi ulang.
 */
async function cleanupAgedTombstoneObjects(supabase: AdminClient, session: Session) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_path, thumb_path')
    .eq('guest_id', session.guestId)
    .eq('event_id', session.eventId)
    .eq('status', 'failed')
    .is('storage_cleaned_at', null)
    .lt('cleanup_after', now)
    .limit(20)
    .returns<TombstoneRow[]>()

  if (error) {
    console.error('membaca tombstone lama gagal:', error)
    return
  }

  const safeRows = (data ?? []).filter((row) => {
    if (!UUID_PATTERN.test(row.id)) return false
    const canonical = photoPaths(session.eventId, row.id)
    const safe =
      (!row.storage_path || row.storage_path === canonical.full) &&
      (!row.thumb_path || row.thumb_path === canonical.thumb)
    if (!safe) console.error('path tombstone lama tidak kanonis:', { photoId: row.id })
    return safe
  })
  const ids = safeRows.map((row) => row.id)
  if (ids.length === 0) return

  const objectPaths = safeRows.flatMap((row) => {
    const id = row.id
    const paths = photoPaths(session.eventId, id)
    return [paths.full, paths.thumb]
  })

  const { error: storageError } = await supabase.storage.from(PHOTO_BUCKET).remove(objectPaths)
  if (storageError) {
    console.error('cleanup objek tombstone lama gagal:', storageError)
    return
  }

  const { error: updateError } = await supabase
    .from('photos')
    .update({
      storage_cleaned_at: new Date().toISOString(),
      storage_path: null,
      thumb_path: null,
      preset: null,
      frame: null,
      width: null,
      height: null,
      processing_recipe: {},
    })
    .in('id', ids)
    .eq('guest_id', session.guestId)
    .eq('event_id', session.eventId)
    .eq('status', 'failed')
    .is('storage_cleaned_at', null)
    .lt('cleanup_after', now)

  if (updateError) console.error('menandai cleanup tombstone gagal:', updateError)
}

// ---------------------------------------------------------------------------
// POST - reservasi jepretan dan terbitkan signed upload URL
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Body tidak sah.' }, { status: 400 })

  const auth = await authenticate(body.eventId)
  if ('error' in auth) return auth.error
  const { session } = auth

  const preset = String(body.preset ?? '')
  const selectedPreset = FILM_PRESETS.find((candidate) => candidate.id === preset)
  if (!selectedPreset) {
    return Response.json({ error: 'Preset film tidak dikenal.' }, { status: 400 })
  }

  const frame = String(body.frame ?? 'none')
  if (!getFrame(frame)) {
    return Response.json({ error: 'Bingkai tidak dikenal.' }, { status: 400 })
  }

  const width = Math.round(Number(body.width))
  const height = Math.round(Number(body.height))
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION
  ) {
    return Response.json({ error: 'Ukuran foto tidak sah.' }, { status: 400 })
  }

  const clientProcessing = body.processingRecipe
  const clientProcessingJson =
    clientProcessing && typeof clientProcessing === 'object' && !Array.isArray(clientProcessing)
      ? JSON.stringify(clientProcessing)
      : ''
  const processingEngine =
    clientProcessing && typeof clientProcessing === 'object' && !Array.isArray(clientProcessing)
      ? (clientProcessing as Record<string, unknown>).engine
      : null
  if (
    !clientProcessingJson ||
    new TextEncoder().encode(clientProcessingJson).byteLength > 4096 ||
    (processingEngine !== 'canvas2d-natural-v1' &&
      processingEngine !== 'webgl2-film-v2' &&
      processingEngine !== 'webgl2-film-v3') ||
    (processingEngine === 'canvas2d-natural-v1' && selectedPreset.id !== 'natural-clean')
  ) {
    return Response.json({ error: 'Recipe pemrosesan tidak sah.' }, { status: 400 })
  }

  // Parameter server-authoritative selalu disalin ke baris foto. Klien boleh
  // menambahkan input per-jepretan (mis. exposure, mirror, grainSeed) melalui
  // `processingRecipe`, tetapi tidak dapat menimpa identitas/angka preset.
  const processingRecipe = {
    schemaVersion: PROCESSING_RECIPE_VERSION,
    pipeline: processingEngine,
    preset: {
      id: selectedPreset.id,
      lut: selectedPreset.lut,
      strength: selectedPreset.strength,
      lumaLock: selectedPreset.lumaLock,
      contrast: selectedPreset.contrast,
      colorBalance: selectedPreset.colorBalance,
      grain: selectedPreset.grain,
      vignette: selectedPreset.vignette,
      halation: selectedPreset.halation,
    },
    frame,
    output: { width, height, mimeType: 'image/jpeg', colorSpace: 'srgb' },
    capture: clientProcessing,
  }

  const requestedPhotoId = body.clientPhotoId
  if (typeof requestedPhotoId !== 'string' || !UUID_PATTERN.test(requestedPhotoId)) {
    return Response.json({ error: 'ID jepretan tidak sah.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const photoId = requestedPhotoId.toLowerCase()
  const paths = photoPaths(session.eventId, photoId)

  const { data: reservation, error: reservationError } = await supabase
    .rpc('reserve_photo_upload', {
      p_photo_id: photoId,
      p_guest_id: session.guestId,
      p_event_id: session.eventId,
      p_preset: preset,
      p_preset_version: PROCESSING_RECIPE_VERSION,
      p_processing_recipe: processingRecipe,
      p_frame: frame,
      p_width: width,
      p_height: height,
      p_storage_path: paths.full,
      p_thumb_path: paths.thumb,
    })
    .single<ReservationResult>()

  if (reservationError || !reservation) {
    console.error('reserve_photo_upload gagal:', reservationError)
    return Response.json({ error: 'Gagal menyiapkan jepretan.' }, { status: 500 })
  }

  if (!reservation.ok) {
    const idConflict = reservation.rejection_reason === 'photo_id_conflict'
    const rateLimited = reservation.rejection_reason === 'rate_limited'
    return Response.json(
      {
        code: reservation.rejection_reason,
        error:
          idConflict
            ? 'ID jepretan sudah dipakai. Buat ID baru lalu coba lagi.'
            : rateLimited
            ? 'Terlalu banyak jepretan gagal. Tunggu sebentar lalu coba lagi.'
            : reservation.rejection_reason === 'quota_exhausted'
            ? 'Roll filmmu sudah habis.'
            : 'Album ini sedang tidak menerima foto.',
        shotsUsed: reservation.shots_used,
        shotsLimit: reservation.shots_limit,
      },
      { status: rateLimited ? 429 : 409 }
    )
  }

  const storage = supabase.storage.from(PHOTO_BUCKET)

  const [full, thumb] = await Promise.all([
    storage.createSignedUploadUrl(paths.full, { upsert: false }),
    storage.createSignedUploadUrl(paths.thumb, { upsert: false }),
  ])

  if (full.error || thumb.error || !full.data || !thumb.data) {
    console.error('createSignedUploadUrl gagal:', full.error ?? thumb.error)
    // Pertahankan row pending: client me-retry POST dengan UUID yang sama.
    // Bila seluruh retry habis, DELETE client atau TTL akan melepas kuota.
    return Response.json({ error: 'Gagal menyiapkan jepretan.' }, { status: 500 })
  }

  // Tidak memblokir reservasi baru bila cleanup lama gagal; tombstone tetap ada
  // dan akan dicoba lagi pada jepretan berikutnya.
  await cleanupAgedTombstoneObjects(supabase, session)

  return Response.json({
    photoId,
    shotsUsed: reservation.shots_used,
    shotsLimit: reservation.shots_limit,
    reusedReservation: reservation.existing_reservation,
    full: { path: paths.full, token: full.data.token },
    thumb: { path: paths.thumb, token: thumb.data.token },
  })
}

// ---------------------------------------------------------------------------
// PATCH - verifikasi unggahan, lalu finalisasi secara idempoten
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Body tidak sah.' }, { status: 400 })

  const auth = await authenticate(body.eventId)
  if ('error' in auth) return auth.error
  const { session } = auth

  const photoId = String(body.photoId ?? '')
  const reportedBytes = Math.round(Number(body.bytes))
  if (
    !UUID_PATTERN.test(photoId) ||
    !Number.isSafeInteger(reportedBytes) ||
    reportedBytes < 1 ||
    reportedBytes > MAX_BYTES
  ) {
    return Response.json({ error: 'Permintaan tidak sah.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Retry PATCH untuk foto yang sudah ready harus tetap sukses, bahkan bila
  // pemeriksaan Storage sedang terganggu sesaat.
  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .select('status, bytes')
    .eq('id', photoId)
    .eq('guest_id', session.guestId)
    .eq('event_id', session.eventId)
    .maybeSingle()

  if (photoError) {
    console.error('membaca status foto gagal:', photoError)
    return Response.json({ error: 'Gagal menyimpan foto.' }, { status: 500 })
  }

  if (!photo) return Response.json({ error: 'Foto tidak ditemukan.' }, { status: 404 })

  if (photo.status === 'ready') {
    return Response.json({ ok: true, alreadyReady: true, bytes: photo.bytes })
  }

  if (photo.status === 'failed') {
    await cancelReservation(supabase, session, photoId, 'late_confirmation')
    return Response.json({ error: 'Jepretan ini sudah dibatalkan.' }, { status: 409 })
  }

  const paths = photoPaths(session.eventId, photoId)
  const storage = supabase.storage.from(PHOTO_BUCKET)
  const [full, thumb] = await Promise.all([storage.info(paths.full), storage.info(paths.thumb)])

  if (full.error || thumb.error || !full.data || !thumb.data) {
    const errors = [full.error, thumb.error].filter(Boolean)
    const uploadIncomplete = errors.some((error) => storageErrorStatus(error) === 404)

    if (!uploadIncomplete) console.error('verifikasi objek foto gagal:', full.error ?? thumb.error)

    return Response.json(
      {
        error: uploadIncomplete
          ? 'Unggahan belum lengkap. Coba konfirmasi lagi.'
          : 'Penyimpanan foto sedang tidak dapat diverifikasi.',
      },
      { status: uploadIncomplete ? 409 : 503 }
    )
  }

  const fullSize = storedSize(full.data)
  const thumbSize = storedSize(thumb.data)
  const fullMime = storedMime(full.data)
  const thumbMime = storedMime(thumb.data)
  const invalidObjects =
    fullSize === null ||
    thumbSize === null ||
    fullSize < 1 ||
    fullSize > MAX_BYTES ||
    thumbSize < 1 ||
    thumbSize > MAX_THUMB_BYTES ||
    fullMime !== 'image/jpeg' ||
    thumbMime !== 'image/jpeg'

  if (invalidObjects) {
    console.error('objek unggahan foto tidak sah:', {
      photoId,
      fullSize,
      thumbSize,
      fullMime,
      thumbMime,
    })
    await cancelReservation(supabase, session, photoId, 'invalid_storage_object')
    return Response.json({ error: 'Berkas foto tidak sah. Silakan jepret ulang.' }, { status: 422 })
  }

  if (reportedBytes !== fullSize) {
    // Angka browser hanya diagnostik. Ukuran Storage tetap sumber kebenaran.
    console.warn('ukuran foto dari browser berbeda dengan Storage:', {
      photoId,
      reportedBytes,
      storedBytes: fullSize,
    })
  }

  const { data: finalized, error: finalizeError } = await supabase
    .rpc('finalize_photo_upload', {
      p_photo_id: photoId,
      p_guest_id: session.guestId,
      p_event_id: session.eventId,
      p_bytes: fullSize,
    })
    .single<FinalizeResult>()

  if (finalizeError || !finalized) {
    console.error('finalize_photo_upload gagal:', finalizeError)
    return Response.json({ error: 'Gagal menyimpan foto.' }, { status: 500 })
  }

  if (finalized.outcome === 'not_found') {
    return Response.json({ error: 'Foto tidak ditemukan.' }, { status: 404 })
  }

  if (finalized.outcome === 'canceled') {
    await cancelReservation(supabase, session, photoId, 'late_confirmation')
    return Response.json({ error: 'Jepretan ini sudah dibatalkan.' }, { status: 409 })
  }

  return Response.json({
    ok: true,
    alreadyReady: finalized.outcome === 'already_ready',
    bytes: finalized.recorded_bytes,
  })
}

// ---------------------------------------------------------------------------
// DELETE - pembatalan idempoten dan cleanup yang dapat diulang
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Body tidak sah.' }, { status: 400 })

  const auth = await authenticate(body.eventId)
  if ('error' in auth) return auth.error
  const { session } = auth

  const photoId = String(body.photoId ?? '')
  if (!UUID_PATTERN.test(photoId)) {
    return Response.json({ error: 'Permintaan tidak sah.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const canceled = await cancelReservation(supabase, session, photoId, 'upload_failed')

  if (!canceled) {
    return Response.json({ error: 'Gagal membatalkan jepretan.' }, { status: 500 })
  }

  return Response.json({
    ok: true,
    canceled: canceled.outcome !== 'already_ready',
    alreadyReady: canceled.outcome === 'already_ready',
  })
}
