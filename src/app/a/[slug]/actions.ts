'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { GUEST_NAME_MAX, GUEST_NAME_MIN } from '@/lib/events'
import { findEventBySlug } from '@/lib/guest/event'
import { issueGuestSession, newSessionId, readGuestSession } from '@/lib/guest/session'

export interface JoinResult {
  error: string
}

/** Pesan per alasan penolakan dari `join_event`. */
const REJECTION: Record<string, string> = {
  not_found: 'Album ini tidak ditemukan. Periksa lagi tautannya.',
  closed: 'Album ini sudah ditutup host-nya.',
  full: 'Kuota tamu album ini sudah penuh. Hubungi host acaranya.',
  revoked: 'Aksesmu ke album ini dicabut oleh host.',
}

/**
 * Daftarkan perangkat tamu ke sebuah album.
 *
 * `slug` datang dari input tersembunyi, artinya dari klien — dan itu memang
 * tidak apa-apa: slug adalah tautan publik yang dicetak di QR, bukan rahasia
 * yang membuktikan apa pun. Yang tidak boleh datang dari klien adalah identitas
 * tamunya, dan itu diterbitkan di sini.
 */
export async function joinEvent(
  _prevState: JoinResult | null,
  formData: FormData
): Promise<JoinResult | null> {
  const slug = String(formData.get('slug') ?? '').trim()
  const destination = formData.get('destination') === 'guestbook' ? 'guestbook' : 'camera'
  const displayName = String(formData.get('displayName') ?? '').trim().replace(/\s+/g, ' ')

  if (displayName.length < GUEST_NAME_MIN) {
    return { error: `Nama minimal ${GUEST_NAME_MIN} karakter.` }
  }
  if (displayName.length > GUEST_NAME_MAX) {
    return { error: `Nama maksimal ${GUEST_NAME_MAX} karakter.` }
  }

  const event = await findEventBySlug(slug)
  if (!event) return { error: REJECTION.not_found }

  /*
   * Pakai ulang id perangkat kalau tamu ini sudah pernah masuk.
   *
   * Tanpa ini, tamu yang mengganti namanya akan terdaftar sebagai orang kedua
   * dan memakan satu slot kuota lagi. Cookie lama sudah diverifikasi tanda
   * tangannya, jadi id yang dipulihkan tetap terbitan server, bukan karangan
   * klien.
   */
  const existing = await readGuestSession(event.id)
  const sessionId = existing?.sessionId ?? newSessionId()

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .rpc('join_event', {
      p_event_id: event.id,
      p_session_id: sessionId,
      p_display_name: displayName,
    })
    .single<{ status: string; guest_id: string | null }>()

  if (error) {
    console.error('join_event gagal:', error)
    return { error: 'Gagal masuk ke album. Coba lagi sebentar lagi.' }
  }

  if (data.status !== 'ok' || !data.guest_id) {
    return { error: REJECTION[data.status] ?? 'Gagal masuk ke album.' }
  }

  await issueGuestSession({
    guestId: data.guest_id,
    eventId: event.id,
    sessionId,
    displayName,
  })

  /*
   * Langsung ke kamera.
   *
   * Sebelumnya di sini tidak ada redirect: menulis cookie sudah membuat Next
   * merender ulang rute ini, dan halaman itu menampilkan keadaan "sudah
   * bergabung". Secara mekanis lebih hemat, tapi hasilnya satu layar mati yang
   * tugasnya cuma menampung tombol lain — padahal tombol yang baru saja ditekan
   * tamu sudah berbunyi "Ambil kamera". Tiga layar sebelum bisa menjepret,
   * untuk orang yang sedang berdiri di tengah pesta.
   *
   * redirect() bekerja dengan melempar, jadi harus di luar try/catch mana pun.
   */
  redirect(`/a/${event.slug}/${destination === 'guestbook' ? 'guestbook' : 'kamera'}`)
}
