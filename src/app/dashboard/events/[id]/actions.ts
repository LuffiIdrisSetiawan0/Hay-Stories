'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PHOTO_BUCKET } from '@/lib/photos'

export interface RevealResult {
  error?: string
  ok?: boolean
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

/**
 * Hapus satu foto secara permanen oleh host dan kembalikan kuota jepretan tamu (bisa retake).
 */
export async function deleteHostPhoto(photoId: string): Promise<{ ok: boolean; error?: string }> {
  if (!photoId) return { ok: false, error: 'ID foto tidak sah.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sesi berakhir.' }

  const admin = createAdminClient()

  // Ambil data foto untuk memastikan acara ini milik host yang sedang login
  const { data: photo, error: fetchErr } = await admin
    .from('photos')
    .select('id, event_id, guest_id, storage_path, thumb_path, events!inner(host_id)')
    .eq('id', photoId)
    .single()

  if (fetchErr || !photo) {
    return { ok: false, error: 'Foto tidak ditemukan.' }
  }

  const hostId = (photo.events as unknown as { host_id: string })?.host_id
  if (hostId !== user.id) {
    return { ok: false, error: 'Kamu bukan pemilik album ini.' }
  }

  // Hapus berkas dari storage
  const paths = [photo.storage_path, photo.thumb_path].filter(Boolean) as string[]
  if (paths.length > 0) {
    await admin.storage.from(PHOTO_BUCKET).remove(paths)
  }

  // Hapus baris dari database
  const { error: deleteErr } = await admin.from('photos').delete().eq('id', photoId)
  if (deleteErr) {
    console.error('deleteHostPhoto row gagal:', deleteErr)
    return { ok: false, error: 'Gagal menghapus foto dari database.' }
  }

  // Kembalikan kuota jepretan tamu (supaya tamu bisa retake)
  if (photo.guest_id) {
    await admin.rpc('release_shot', { p_guest_id: photo.guest_id })
  }

  revalidatePath(`/dashboard/events/${photo.event_id}`)
  return { ok: true }
}
