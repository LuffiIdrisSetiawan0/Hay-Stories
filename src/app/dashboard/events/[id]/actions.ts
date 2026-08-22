'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveReveal } from '@/lib/events'
import { PHOTO_BUCKET, photoPaths } from '@/lib/photos'

export interface RevealResult {
  error?: string
  ok?: boolean
}

interface DeletePhotoResult {
  outcome: 'deleted' | 'already_deleted' | 'not_found' | 'forbidden' | 'conflict'
  photo_event_id: string | null
  full_path: string | null
  preview_path: string | null
  storage_cleanup_pending: boolean
}

type SettingsField =
  | 'title'
  | 'eventDate'
  | 'revealMode'
  | 'revealAt'
  | 'galleryVisibility'

export interface AlbumSettingsValues {
  title: string
  eventDate: string
  revealMode: 'immediate' | 'scheduled' | 'manual'
  revealAt: string
  galleryVisibility: 'guests' | 'host_only'
}

export interface AlbumSettingsResult {
  ok?: boolean
  message?: string
  fieldErrors?: Partial<Record<SettingsField, string>>
  values?: AlbumSettingsValues
}

export interface AlbumStatusResult {
  ok?: boolean
  error?: string
  message?: string
  status?: 'active' | 'archived'
}

interface EditableEvent {
  id: string
  host_id: string
  slug: string
  title: string
  event_date: string | null
  reveal_mode: string
  reveal_at: string | null
  is_revealed: boolean | null
  gallery_visibility: string | null
  status: string | null
  expires_at: string | null
  updated_at: string | null
}

const EVENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REVEAL_MODES = new Set(['immediate', 'scheduled', 'manual'])
const GALLERY_VISIBILITIES = new Set(['guests', 'host_only'])

function normalizeInstant(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

/**
 * `event_date` adalah tanggal kalender, bukan jam. Database lama menyimpannya
 * sebagai TIMESTAMPTZ, jadi gunakan tengah malam UTC secara konsisten agar
 * tanggal tidak bergeser ketika dashboard dibuka dari zona waktu lain.
 */
function parseCalendarDate(value: string): string | null | undefined {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined

  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return undefined
  }

  return parsed.toISOString()
}

function refreshAlbum(eventId: string, slug: string) {
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/events/${eventId}`)
  revalidatePath(`/a/${slug}`)
  revalidatePath(`/a/${slug}/galeri`)
}

/**
 * Simpan metadata dan privasi album.
 *
 * Action membaca ulang baris lewat sesi host (RLS), mengikatnya lagi ke
 * `host_id`, dan hanya menerima field yang memang didukung UI. Reveal yang
 * sudah terjadi tidak dapat diputar balik dengan request buatan sendiri.
 */
export async function updateAlbumSettings(
  _prevState: AlbumSettingsResult | null,
  formData: FormData
): Promise<AlbumSettingsResult> {
  const eventId = String(formData.get('eventId') ?? '').trim()
  if (!EVENT_ID_PATTERN.test(eventId)) {
    return { ok: false, message: 'Album tidak dikenal. Muat ulang halaman lalu coba lagi.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: 'Sesi kamu berakhir. Masuk lagi untuk melanjutkan.' }
  }

  const { data: event, error: readError } = await supabase
    .from('events')
    .select(
      'id, host_id, slug, title, event_date, reveal_mode, reveal_at, is_revealed, gallery_visibility, status, expires_at, updated_at'
    )
    .eq('id', eventId)
    .eq('host_id', user.id)
    .maybeSingle<EditableEvent>()

  if (readError) {
    console.error('updateAlbumSettings gagal membaca album:', readError)
    return { ok: false, message: 'Pengaturan album gagal dimuat. Coba lagi sebentar.' }
  }

  // Jangan membedakan ID yang tidak ada dari album milik host lain.
  if (!event) {
    return { ok: false, message: 'Album tidak ditemukan atau kamu tidak memiliki akses.' }
  }

  const title = String(formData.get('title') ?? '').trim()
  const eventDateRaw = String(formData.get('eventDate') ?? '').trim()
  const revealModeRaw = String(formData.get('revealMode') ?? '').trim()
  const revealAtRaw = String(formData.get('revealAt') ?? '').trim()
  const galleryVisibilityRaw = String(formData.get('galleryVisibility') ?? '').trim()
  const fieldErrors: Partial<Record<SettingsField, string>> = {}
  const currentRevealAt = normalizeInstant(event.reveal_at)
  const revealHasHappened =
    event.status === 'revealed' || resolveReveal(event, Date.now()).revealed

  if (title.length < 3) fieldErrors.title = 'Nama acara minimal 3 karakter.'
  else if (title.length > 80) fieldErrors.title = 'Nama acara maksimal 80 karakter.'

  const eventDate = parseCalendarDate(eventDateRaw)
  if (eventDate === undefined) fieldErrors.eventDate = 'Tanggal acara tidak valid.'

  if (!REVEAL_MODES.has(revealModeRaw)) {
    fieldErrors.revealMode = 'Pilihan waktu terbuka tidak dikenal.'
  }

  if (!GALLERY_VISIBILITIES.has(galleryVisibilityRaw)) {
    fieldErrors.galleryVisibility = 'Pilihan privasi galeri tidak dikenal.'
  }

  let revealAt: string | null = null
  if (revealModeRaw === 'scheduled') {
    if (!revealAtRaw) {
      // Data legacy dapat berstatus selesai tanpa reveal_at. Nilai kosong itu
      // boleh dipertahankan agar host tetap dapat mengubah judul atau privasi.
      if (!(revealHasHappened && event.reveal_mode === 'scheduled' && !currentRevealAt)) {
        fieldErrors.revealAt = 'Tentukan kapan album akan terbuka.'
      }
    } else if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(revealAtRaw)) {
      fieldErrors.revealAt = 'Zona waktu tidak ditemukan. Pilih ulang tanggal dan jam.'
    } else {
      const parsed = new Date(revealAtRaw)
      if (Number.isNaN(parsed.getTime())) {
        fieldErrors.revealAt = 'Tanggal dan jam reveal tidak valid.'
      } else {
        revealAt = parsed.toISOString()
        const keepingCompletedSchedule =
          revealHasHappened &&
          event.reveal_mode === 'scheduled' &&
          revealAt === currentRevealAt
        if (!keepingCompletedSchedule && parsed.getTime() <= Date.now()) {
          fieldErrors.revealAt = 'Waktu reveal harus berada di masa depan.'
        }
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Periksa kembali pengaturan yang ditandai.', fieldErrors }
  }

  const revealMode = revealModeRaw as AlbumSettingsValues['revealMode']
  const galleryVisibility =
    galleryVisibilityRaw as AlbumSettingsValues['galleryVisibility']
  const revealChanged =
    revealMode !== event.reveal_mode ||
    (revealMode === 'scheduled' && revealAt !== currentRevealAt) ||
    (revealMode !== 'scheduled' && currentRevealAt !== null)

  if (revealHasHappened && revealChanged) {
    return {
      ok: false,
      message: 'Album sudah pernah terbuka, jadi pengaturan reveal tidak dapat disembunyikan ulang.',
      fieldErrors: {
        revealMode: 'Reveal terkunci setelah foto dapat dilihat tamu.',
      },
    }
  }

  const settingsUpdate = supabase
    .from('events')
    .update({
      title,
      event_date: eventDate,
      reveal_mode: revealMode,
      reveal_at: revealMode === 'scheduled' ? revealAt : null,
      gallery_visibility: galleryVisibility,
    })
    .eq('id', event.id)
    .eq('host_id', user.id)
  const guardedSettingsUpdate = event.updated_at
    ? settingsUpdate.eq('updated_at', event.updated_at)
    : settingsUpdate.is('updated_at', null)
  const { data: updated, error: updateError } = await guardedSettingsUpdate
    .select('id')

  if (updateError) {
    console.error('updateAlbumSettings gagal menyimpan:', updateError)
    return { ok: false, message: 'Pengaturan belum tersimpan. Coba lagi sebentar.' }
  }

  if (!updated || updated.length === 0) {
    return {
      ok: false,
      message: 'Album berubah di tab lain. Muat ulang halaman sebelum menyimpan lagi.',
    }
  }

  refreshAlbum(event.id, event.slug)

  return {
    ok: true,
    message: 'Pengaturan album tersimpan.',
    values: {
      title,
      eventDate: eventDateRaw,
      revealMode,
      revealAt: revealMode === 'scheduled' ? (revealAt ?? '') : '',
      galleryVisibility,
    },
  }
}

/** Arsip bersifat non-destruktif: semua foto dan data tamu tetap tersimpan. */
export async function updateAlbumStatus(
  _prevState: AlbumStatusResult | null,
  formData: FormData
): Promise<AlbumStatusResult> {
  const eventId = String(formData.get('eventId') ?? '').trim()
  const intent = String(formData.get('intent') ?? '').trim()

  if (!EVENT_ID_PATTERN.test(eventId) || !['archive', 'reactivate'].includes(intent)) {
    return { ok: false, error: 'Permintaan perubahan status tidak valid.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Sesi kamu berakhir. Masuk lagi untuk melanjutkan.' }

  const { data: event, error: readError } = await supabase
    .from('events')
    .select('id, host_id, slug, status, expires_at, updated_at')
    .eq('id', eventId)
    .eq('host_id', user.id)
    .maybeSingle<
      Pick<EditableEvent, 'id' | 'host_id' | 'slug' | 'status' | 'expires_at' | 'updated_at'>
    >()

  if (readError) {
    console.error('updateAlbumStatus gagal membaca album:', readError)
    return { ok: false, error: 'Status album gagal dimuat. Coba lagi sebentar.' }
  }

  if (!event) return { ok: false, error: 'Album tidak ditemukan atau kamu tidak memiliki akses.' }

  const targetStatus = intent === 'archive' ? 'archived' : 'active'
  if (event.status === targetStatus) {
    // Klien bisa membawa tampilan lama dari tab yang sudah lama terbuka.
    // Sinkronkan seluruh halaman walau mutasinya sendiri sudah tidak perlu.
    refreshAlbum(event.id, event.slug)
    return {
      ok: true,
      status: targetStatus,
      message: targetStatus === 'archived' ? 'Album sudah diarsipkan.' : 'Album sudah aktif.',
    }
  }

  if (intent === 'archive' && event.status !== 'active') {
    return { ok: false, error: 'Hanya album aktif yang dapat diarsipkan.' }
  }

  if (intent === 'reactivate') {
    if (event.status !== 'archived') {
      return { ok: false, error: 'Hanya album yang diarsipkan yang dapat diaktifkan kembali.' }
    }

    const expiresAt = event.expires_at ? new Date(event.expires_at).getTime() : null
    if (expiresAt !== null && Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      return {
        ok: false,
        error: 'Masa aktif album sudah habis, jadi album tidak dapat diaktifkan kembali.',
      }
    }
  }

  /*
   * Migrasi checkout mencabut UPDATE(status) dari role authenticated agar
   * draf berbayar tidak bisa diaktifkan dari browser. Service role hanya
   * dipakai setelah auth, ownership, lifecycle, expiry, dan target status
   * tervalidasi di atas; filter status lama + updated_at menjaga TOCTOU.
   */
  const admin = createAdminClient()
  const statusUpdate = admin
    .from('events')
    .update({ status: targetStatus })
    .eq('id', event.id)
    .eq('host_id', user.id)
    .eq('status', event.status)
  const guardedStatusUpdate = event.updated_at
    ? statusUpdate.eq('updated_at', event.updated_at)
    : statusUpdate.is('updated_at', null)
  const { data: updated, error: updateError } = await guardedStatusUpdate
    .select('id')

  if (updateError) {
    console.error('updateAlbumStatus gagal menyimpan:', updateError)
    return { ok: false, error: 'Status album belum berubah. Coba lagi sebentar.' }
  }

  if (!updated || updated.length === 0) {
    return {
      ok: false,
      error: 'Status album berubah di tab lain. Muat ulang halaman lalu coba lagi.',
    }
  }

  refreshAlbum(event.id, event.slug)

  return {
    ok: true,
    status: targetStatus,
    message:
      targetStatus === 'archived'
        ? 'Album diarsipkan. Semua foto tetap aman.'
        : 'Album aktif kembali dan dapat menerima tamu.',
  }
}

/**
 * Buka album sekarang juga.
 */
export async function revealNow(
  _prevState: RevealResult | null,
  formData: FormData
): Promise<RevealResult> {
  const eventId = String(formData.get('eventId') ?? '')
  if (!eventId) return { error: 'Album tidak dikenal.' }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesi kamu berakhir. Masuk lagi untuk melanjutkan.' }

  const { data, error } = await supabase
    .from('events')
    .update({ is_revealed: true })
    .eq('id', eventId)
    .select('id')

  if (error) {
    console.error('revealNow gagal:', error)
    return { error: 'Gagal membuka album. Coba lagi.' }
  }

  if (!data || data.length === 0) {
    return { error: 'Album tidak ditemukan.' }
  }

  revalidatePath(`/dashboard/events/${eventId}`)
  return { ok: true }
}

/** Hapus foto dari album dan kembalikan satu kuota secara exactly-once. */
export async function deleteHostPhoto(photoId: string): Promise<{ ok: boolean; error?: string }> {
  if (!photoId) return { ok: false, error: 'ID foto tidak sah.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sesi berakhir.' }

  const admin = createAdminClient()

  // RPC memverifikasi kepemilikan host, mengunci event -> guest -> photo,
  // menombstone foto, dan melepas kuota dalam satu transaksi. Retry dengan ID
  // yang sama tidak mungkin mengurangi shots_used untuk kedua kalinya.
  const { data, error } = await admin
    .rpc('delete_photo_for_actor', {
      p_photo_id: photoId,
      p_actor_kind: 'host',
      p_actor_id: user.id,
      p_event_id: null,
    })
    .single<DeletePhotoResult>()

  if (error || !data) {
    console.error('deleteHostPhoto RPC gagal:', error)
    return { ok: false, error: 'Gagal menghapus foto. Coba lagi.' }
  }

  if (data.outcome === 'not_found') return { ok: false, error: 'Foto tidak ditemukan.' }
  if (data.outcome === 'forbidden') {
    return { ok: false, error: 'Kamu bukan pemilik album ini.' }
  }
  if (data.outcome === 'conflict' || !data.photo_event_id) {
    return { ok: false, error: 'Data foto berubah. Muat ulang lalu coba lagi.' }
  }

  // Transaksi DB sudah commit sebelum baris ini. Remove pertama mempercepat
  // privasi pengguna; tombstone tetap dijadwalkan untuk dihapus ulang setelah
  // signed upload token mati, sehingga upload terlambat tidak menjadi orphan.
  if (data.storage_cleanup_pending) {
    const canonical = photoPaths(data.photo_event_id, photoId)
    if (data.full_path === canonical.full && data.preview_path === canonical.thumb) {
      const { error: storageError } = await admin.storage
        .from(PHOTO_BUCKET)
        .remove([canonical.full, canonical.thumb])
      if (storageError) {
        console.error('deleteHostPhoto Storage tertunda:', storageError)
      }
    } else {
      console.error('deleteHostPhoto melewati path Storage tidak kanonis:', { photoId })
    }
  }

  revalidatePath(`/dashboard/events/${data.photo_event_id}`)
  return { ok: true }
}
