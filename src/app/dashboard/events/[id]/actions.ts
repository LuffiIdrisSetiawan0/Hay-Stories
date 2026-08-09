'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface RevealResult {
  error?: string
  ok?: boolean
}

/**
 * Buka album sekarang juga.
 *
 * Tidak ada pemeriksaan kepemilikan di sini secara eksplisit karena RLS sudah
 * menanganinya: policy `events: kelola milik sendiri` membuat UPDATE terhadap
 * acara milik host lain tidak menyentuh baris apa pun. Itulah sebabnya hasilnya
 * diminta kembali dengan `.select()` — nol baris berarti bukan miliknya.
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
    .update({ is_revealed: true, status: 'revealed' })
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
 * Sembunyikan atau tampilkan lagi satu foto.
 *
 * Sama seperti `revealNow`, kepemilikannya ditegakkan RLS: policy
 * `photos: host memoderasi` membatasi UPDATE ke foto pada acara milik host ini,
 * jadi id foto orang lain tidak menyentuh baris apa pun. `.select()` yang
 * mengembalikan nol baris adalah cara mengetahuinya.
 *
 * Foto yang disembunyikan tidak dihapus — tamu berhenti melihatnya di galeri,
 * tapi host masih bisa mengembalikannya. Untuk momen canggung yang tidak perlu
 * berakhir di album, ini hampir selalu yang diinginkan, dan tidak ada tombol
 * yang bisa membatalkan penghapusan sungguhan.
 */
export async function togglePhotoHidden(formData: FormData): Promise<void> {
  const photoId = String(formData.get('photoId') ?? '')
  const hidden = String(formData.get('hidden') ?? '') === '1'
  if (!photoId) return

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data, error } = await supabase
    .from('photos')
    .update({ is_hidden: hidden })
    .eq('id', photoId)
    .select('event_id')
    .maybeSingle<{ event_id: string }>()

  if (error) {
    console.error('togglePhotoHidden gagal:', error)
    return
  }

  if (data) revalidatePath(`/dashboard/events/${data.event_id}`)
}
