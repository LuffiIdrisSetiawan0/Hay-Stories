import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Klien service role — MELEWATI Row Level Security sepenuhnya.
 *
 * Hanya untuk jalur tamu anonim (join, terbitkan signed upload URL, catat foto)
 * dan tugas latar sisi server. Setiap pemanggilnya wajib memverifikasi token
 * tamu lebih dulu; klien ini tidak punya konsep "siapa yang meminta".
 *
 * Impor `server-only` di atas membuat build gagal jika berkas ini pernah
 * tersentuh bundel klien.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi untuk klien admin.'
    )
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
