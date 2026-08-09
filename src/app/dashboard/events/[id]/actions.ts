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
