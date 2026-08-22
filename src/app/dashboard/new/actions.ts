'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  EVENT_TYPES,
  REVEAL_MODES,
  getTier,
  isTierSelectable,
  type RevealMode,
  type TierId,
} from '@/lib/catalog'
import { generateAccessCode, resolveLimits, slugify } from '@/lib/events'
import { paidCheckoutDisclosureIssue } from '@/lib/payments'

export interface CreateEventResult {
  error: string
}

const MAX_SLUG_ATTEMPTS = 6

/**
 * Gate berbayar sisi server — lebih ketat daripada `isTierSelectable`, yang
 * hanya melihat nilai NEXT_PUBLIC_. Konfigurasi yang salah eja dianggap
 * memblokir, bukan mengizinkan.
 */
function paidCheckoutBlocked(): boolean {
  try {
    return paidCheckoutDisclosureIssue() !== null
  } catch {
    return true
  }
}

/**
 * Buat album baru untuk host yang sedang masuk.
 *
 * Paket divalidasi ulang dari katalog. Starter langsung aktif; paket berbayar
 * dibuat sebagai draf tanpa kuota dan baru diaktifkan oleh RPC settlement.
 * Insert memakai service role karena migrasi checkout sengaja mencabut INSERT
 * langsung dari role authenticated agar browser tidak dapat memalsukan limit.
 *
 * Kesiapan checkout diperiksa SEBELUM insert. Album draf berbayar tidak dapat
 * dibuka host maupun dihapus dari dashboard, jadi membuatnya lebih dulu lalu
 * menolak pembayarannya meninggalkan album mati yang tidak bisa dibereskan
 * siapa pun.
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
  const tierId = String(formData.get('tier') ?? 'starter') as TierId
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
  const tier = getTier(tierId)
  if (!tier || !tier.available) {
    return { error: 'Paket yang dipilih belum tersedia.' }
  }
  if (!isTierSelectable(tier)) {
    return {
      error: 'Paket berbayar sedang ditutup. Pilih Starter, atau hubungi pengelola situs.',
    }
  }
  if (tier.price > 0 && paidCheckoutBlocked()) {
    return {
      error: 'Checkout berbayar belum siap, jadi album berbayar belum bisa dibuat. Pilih Starter dulu.',
    }
  }

  let eventDate: string | null = null
  if (eventDateRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDateRaw)) {
      return { error: 'Tanggal acara tidak valid.' }
    }
    const parsed = new Date(`${eventDateRaw}T00:00:00.000Z`)
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== eventDateRaw) {
      return { error: 'Tanggal acara tidak valid.' }
    }
    eventDate = parsed.toISOString()
  }

  let revealAt: string | null = null
  if (revealMode === 'scheduled') {
    if (!revealAtRaw) return { error: 'Tentukan kapan foto akan terungkap.' }
    if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(revealAtRaw)) {
      return { error: 'Zona waktu reveal tidak ditemukan. Pilih ulang waktunya.' }
    }
    const parsed = new Date(revealAtRaw)
    if (Number.isNaN(parsed.getTime())) return { error: 'Waktu reveal tidak valid.' }
    if (parsed.getTime() <= Date.now()) {
      return { error: 'Waktu reveal harus di masa depan.' }
    }
    revealAt = parsed.toISOString()
  }

  // --- Simpan -----------------------------------------------------------

  const isStarter = tier.id === 'starter'
  const starterLimits = isStarter ? resolveLimits('starter') : null
  const base = slugify(title)
  let eventId: string | null = null
  const admin = createAdminClient()

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

    const { data, error } = await admin
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
        tier: tier.id,
        status: isStarter ? 'active' : 'draft',
        // Draf berbayar belum memperoleh limit apa pun. Snapshot limit yang
        // dibeli ada di payment dan disalin atomik hanya saat settlement sah.
        max_guests: starterLimits?.maxGuests ?? 0,
        shots_per_guest: starterLimits?.shotsPerGuest ?? 0,
        expires_at: starterLimits?.expiresAt?.toISOString() ?? null,
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
  redirect(
    isStarter ? `/dashboard/events/${eventId}` : `/dashboard/checkout/${eventId}`
  )
}
