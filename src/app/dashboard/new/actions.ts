'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EVENT_TYPES, REVEAL_MODES, type RevealMode } from '@/lib/catalog'
import { generateAccessCode, resolveLimits, slugify } from '@/lib/events'

export interface CreateEventResult {
  error: string
}

const MAX_SLUG_ATTEMPTS = 6

/**
 * Buat album baru untuk host yang sedang masuk.
 *
 * Tier dipaksa `starter` sampai integrasi pembayaran selesai. Wizard memang
 * hanya menawarkan Starter, tapi Server Action tidak boleh memercayai apa pun
 * yang datang dari form — tanpa pemaksaan ini, siapa pun bisa mengirim
 * `tier=unlimited` lewat request buatan sendiri dan mendapat album tanpa batas
 * secara gratis.
 */
export async function createEvent(
  _prevState: CreateEventResult | null,
  formData: FormData
): Promise<CreateEventResult | never> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const title = String(formData.get('title') ?? '').trim()
  const eventType = String(formData.get('eventType') ?? 'other')
  const revealMode = String(formData.get('revealMode') ?? 'manual') as RevealMode
  const eventDateRaw = String(formData.get('eventDate') ?? '').trim()
  const revealAtRaw = String(formData.get('revealAt') ?? '').trim()

  // --- Validasi ---------------------------------------------------------

  if (title.length < 3) return { error: 'Nama acara minimal 3 karakter.' }
  if (title.length > 80) return { error: 'Nama acara maksimal 80 karakter.' }

  if (!EVENT_TYPES.some((t) => t.id === eventType)) {
    return { error: 'Jenis acara tidak dikenal.' }
  }
  if (!REVEAL_MODES.some((m) => m.id === revealMode)) {
    return { error: 'Mode reveal tidak dikenal.' }
  }

  let eventDate: string | null = null
  if (eventDateRaw) {
    const parsed = new Date(eventDateRaw)
    if (Number.isNaN(parsed.getTime())) return { error: 'Tanggal acara tidak valid.' }
    eventDate = parsed.toISOString()
  }

  let revealAt: string | null = null
  if (revealMode === 'scheduled') {
    if (!revealAtRaw) return { error: 'Tentukan kapan foto akan terungkap.' }
    const parsed = new Date(revealAtRaw)
    if (Number.isNaN(parsed.getTime())) return { error: 'Waktu reveal tidak valid.' }
    if (parsed.getTime() <= Date.now()) {
      return { error: 'Waktu reveal harus di masa depan.' }
    }
    revealAt = parsed.toISOString()
  }

  // --- Simpan -----------------------------------------------------------

  const limits = resolveLimits('starter')
  const base = slugify(title)
  let eventId: string | null = null

  /*
   * Coba simpan, tangani bentrok, ulangi.
   *
   * Tidak memeriksa ketersediaan slug lebih dulu karena dua alasan: RLS hanya
   * mengizinkan host melihat barisnya sendiri (jadi slug milik host lain akan
   * terbaca "tersedia" padahal bukan), dan pemeriksaan awal apa pun tetap
   * punya celah balapan. Batasan UNIQUE di database adalah satu-satunya
   * penentu yang benar.
   */
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const suffix = generateAccessCode(4).toLowerCase()
    const slug =
      attempt === 0 && base.length >= 3 ? base : `${(base || 'album').slice(0, 48)}-${suffix}`

    const { data, error } = await supabase
      .from('events')
      .insert({
        host_id: user.id,
        title,
        slug,
        access_code: generateAccessCode(),
        event_type: eventType,
        reveal_mode: revealMode,
        reveal_at: revealAt,
        event_date: eventDate,
        tier: 'starter',
        status: 'active',
        max_guests: limits.maxGuests,
        shots_per_guest: limits.shotsPerGuest,
        expires_at: limits.expiresAt?.toISOString() ?? null,
      })
      .select('id')
      .single()

    if (!error) {
      eventId = data.id
      break
    }

    // 23505 = unique_violation (slug atau access_code bentrok). Coba lagi.
    if (error.code !== '23505') {
      console.error('createEvent gagal:', error)
      return { error: 'Gagal membuat album. Coba lagi sebentar lagi.' }
    }
  }

  if (!eventId) {
    return { error: 'Gagal membuat tautan unik untuk album ini. Coba ganti nama acara.' }
  }

  // redirect() bekerja dengan melempar, jadi harus di luar blok try/catch mana pun.
  redirect(`/dashboard/events/${eventId}`)
}
