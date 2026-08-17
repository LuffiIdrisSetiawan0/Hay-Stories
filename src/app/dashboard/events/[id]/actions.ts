'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
