'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { readGuestSession } from '@/lib/guest/session'
import { findActiveGuest, findEventBySlug } from '@/lib/guest/event'
import { PHOTO_BUCKET } from '@/lib/photos'

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

  // Ambil data foto dan pastikan milik tamu ini di acara ini
  const { data: photo, error: fetchErr } = await admin
    .from('photos')
    .select('id, event_id, guest_id, storage_path, thumb_path')
    .eq('id', photoId)
    .eq('event_id', event.id)
    .eq('guest_id', guest.id)
    .single()

  if (fetchErr || !photo) {
    return { ok: false, error: 'Foto tidak ditemukan atau bukan milikmu.' }
  }

  // Hapus berkas dari storage
  const paths = [photo.storage_path, photo.thumb_path].filter(Boolean) as string[]
  if (paths.length > 0) {
    await admin.storage.from(PHOTO_BUCKET).remove(paths)
  }

  // Hapus baris foto
  const { error: deleteErr } = await admin.from('photos').delete().eq('id', photoId)
  if (deleteErr) {
    console.error('deleteGuestPhoto row gagal:', deleteErr)
    return { ok: false, error: 'Gagal menghapus foto.' }
  }

  // Kembalikan kuota jepretan tamu (bisa retake foto baru di kamera)
  await admin.rpc('release_shot', { p_guest_id: guest.id })

  revalidatePath(`/a/${slug}/galeri`)
  revalidatePath(`/a/${slug}/kamera`)
  revalidatePath(`/dashboard/events/${event.id}`)

  return { ok: true }
}
