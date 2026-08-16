import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { CODE_ALPHABET } from '@/lib/events'

/**
 * Pembacaan acara untuk jalur tamu anonim.
 *
 * Semuanya lewat klien service role karena RLS tidak memberi anon key akses ke
 * tabel `events` sama sekali. Konsekuensinya: berkas ini yang bertanggung jawab
 * memilih kolom, bukan memakai `select('*')`. Baris acara memuat hal yang tidak
 * berhak dilihat tamu — `host_id` misalnya — dan sekali ikut terbawa ke props
 * komponen, isinya ikut terkirim ke browser di dalam RSC payload.
 */

/** Kolom yang aman ditunjukkan ke tamu. Sengaja dieja satu per satu. */
const GUEST_FIELDS =
  'id, title, slug, event_date, reveal_mode, reveal_at, is_revealed, status, expires_at, max_guests, shots_per_guest, gallery_visibility'

export interface GuestEvent {
  id: string
  title: string
  slug: string
  event_date: string | null
  reveal_mode: string
  reveal_at: string | null
  is_revealed: boolean | null
  status: string
  expires_at: string | null
  max_guests: number
  shots_per_guest: number
  gallery_visibility: string | null
}

export async function findEventBySlug(slug: string): Promise<GuestEvent | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('events')
    .select(GUEST_FIELDS)
    .eq('slug', slug)
    .maybeSingle<GuestEvent>()

  return data ?? null
}

export async function findEventByAccessCode(code: string): Promise<GuestEvent | null> {
  const normalized = normalizeAccessCode(code)
  if (!normalized) return null

  const supabase = createAdminClient()

  const { data } = await supabase
    .from('events')
    .select(GUEST_FIELDS)
    .eq('access_code', normalized)
    .maybeSingle<GuestEvent>()

  return data ?? null
}

/**
 * Pastikan tamu di cookie masih benar-benar ada dan belum dikeluarkan.
 *
 * Tanda tangan JWT hanya membuktikan token itu pernah kita terbitkan, bukan
 * bahwa aksesnya masih berlaku. Host yang mengeluarkan tamu tidak bisa menarik
 * kembali cookie yang sudah ada di ponsel orang, jadi pencabutan hanya berarti
 * kalau setiap pembacaan sesi diuji ke database.
 */
export interface ActiveGuest {
  id: string
  display_name: string
  shots_used: number
}

export async function findActiveGuest(
  guestId: string,
  eventId: string
): Promise<ActiveGuest | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('guests')
    .select('id, display_name, shots_used, revoked')
    .eq('id', guestId)
    .eq('event_id', eventId)
    .maybeSingle<ActiveGuest & { revoked: boolean | null }>()

  if (!data || data.revoked) return null

  return { id: data.id, display_name: data.display_name, shots_used: data.shots_used ?? 0 }
}

/**
 * Rapikan kode yang diketik tamu.
 *
 * Orang menyalin kode dari kartu meja dalam keadaan gelap dan menambahkan
 * spasi atau tanda hubung sendiri, jadi pemisah apa pun dibuang. Huruf di luar
 * alfabet kode berarti salah baca — kode asli memang tidak pernah memuat
 * 0/O, 1/I/L, 2/Z, 5/S, atau 8/B — dan dikembalikan sebagai string kosong
 * supaya pemanggilnya melaporkan kode tidak dikenal, bukan menebak-nebak.
 */
export function normalizeAccessCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[\s-]+/g, '')

  if (!cleaned) return ''

  for (const char of cleaned) {
    if (!CODE_ALPHABET.includes(char)) return ''
  }

  return cleaned
}

/**
 * Apakah album masih menerima tamu.
 *
 * Ini hanya untuk memilih tampilan. Keputusan yang mengikat diambil fungsi
 * `join_event` di database sambil memegang kunci baris acara.
 */
export function isEventOpen(event: GuestEvent, now = Date.now()): boolean {
  if (event.status !== 'active' && event.status !== 'revealed') return false
  if (event.expires_at && new Date(event.expires_at).getTime() <= now) return false
  return true
}
