'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { readGuestSession } from '@/lib/guest/session'
import { findActiveGuest, findEventBySlug } from '@/lib/guest/event'
import { PHOTO_BUCKET, photoPaths } from '@/lib/photos'

interface DeletePhotoResult {
  outcome: 'deleted' | 'already_deleted' | 'not_found' | 'forbidden' | 'conflict'
  photo_event_id: string | null
  full_path: string | null
  preview_path: string | null
  storage_cleanup_pending: boolean
}

/**
 * Tamu menghapus fotonya sendiri dari galeri dan mendapatkan kuota jepretannya kembali (retake).
 */
export async function deleteGuestPhoto(
  slug: string,
  photoId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!slug || !photoId) return { ok: false, error: 'Data tidak lengkap.' }

  const event = await findEventBySlug(slug)
  if (!event) return { ok: false, error: 'Acara tidak ditemukan.' }

  const session = await readGuestSession(event.id)
  if (!session) return { ok: false, error: 'Sesi tamu berakhir. Muat ulang halaman.' }

  const guest = await findActiveGuest(session.guestId, event.id)
  if (!guest) return { ok: false, error: 'Akses tamu tidak aktif.' }

  const admin = createAdminClient()

  // Otorisasi kepemilikan tamu diuji lagi di dalam transaksi. RPC mengunci
  // event -> guest -> photo, menombstone baris, dan melepas kuota tepat sekali.
  const { data, error } = await admin
    .rpc('delete_photo_for_actor', {
      p_photo_id: photoId,
      p_actor_kind: 'guest',
      p_actor_id: guest.id,
      p_event_id: event.id,
    })
    .single<DeletePhotoResult>()

  if (error || !data) {
    console.error('deleteGuestPhoto RPC gagal:', error)
    return { ok: false, error: 'Gagal menghapus foto. Coba lagi.' }
  }

  if (data.outcome === 'not_found' || data.outcome === 'forbidden') {
    return { ok: false, error: 'Foto tidak ditemukan atau bukan milikmu.' }
  }
  if (data.outcome === 'conflict' || data.photo_event_id !== event.id) {
    return { ok: false, error: 'Data foto berubah. Muat ulang lalu coba lagi.' }
  }

  // Storage hanya disentuh setelah transaksi DB commit. Tombstone tidak
  // ditandai bersih di sini: worker akan menghapus ulang setelah token upload
  // kedaluwarsa untuk menutup kemungkinan objek muncul kembali terlambat.
  if (data.storage_cleanup_pending) {
    const canonical = photoPaths(event.id, photoId)
    if (data.full_path === canonical.full && data.preview_path === canonical.thumb) {
      const { error: storageError } = await admin.storage
        .from(PHOTO_BUCKET)
        .remove([canonical.full, canonical.thumb])
      if (storageError) {
        console.error('deleteGuestPhoto Storage tertunda:', storageError)
      }
    } else {
      console.error('deleteGuestPhoto melewati path Storage tidak kanonis:', { photoId })
    }
  }

  revalidatePath(`/a/${slug}/galeri`)
  revalidatePath(`/a/${slug}/kamera`)
  revalidatePath(`/dashboard/events/${event.id}`)

  return { ok: true }
}
