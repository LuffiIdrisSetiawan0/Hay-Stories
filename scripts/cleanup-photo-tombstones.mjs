/**
 * Worker maintenance untuk reservasi foto yang gagal/kedaluwarsa.
 *
 * Jalankan terjadwal (disarankan tiap jam) dengan service-role env:
 *   npm run cleanup:photo-tombstones
 *
 * Token signed upload Supabase berlaku 2 jam. Worker baru menghapus objek
 * setelah grace 3 jam dari pelepasan reservasi, sehingga upload yang
 * datang terlambat tetap bertemu row `failed` dan tidak menjadi orphan. Row
 * tombstone dipertahankan agar UUID/path lama tidak pernah dipakai ulang.
 */

import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 250
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

try {
  process.loadEnvFile?.('.env.local')
} catch (error) {
  if (!error || typeof error !== 'object' || error.code !== 'ENOENT') throw error
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.')
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function canonicalPaths(eventId, photoId) {
  return {
    full: `${eventId}/${photoId}.jpg`,
    thumb: `${eventId}/${photoId}_thumb.jpg`,
  }
}

async function main() {
  const { data: expired, error: expiryError } = await supabase.rpc(
    'expire_stale_photo_reservations',
    { p_older_than: '30 minutes', p_limit: 500 }
  )
  if (expiryError) throw new Error(`TTL reservasi gagal: ${expiryError.message}`)

  const now = new Date().toISOString()
  const { data: rows, error: readError } = await supabase
    .from('photos')
    .select('id, event_id, storage_path, thumb_path, cleanup_after')
    .eq('status', 'failed')
    .is('storage_cleaned_at', null)
    .lt('cleanup_after', now)
    .order('cleanup_after', { ascending: true })
    .limit(BATCH_SIZE)

  if (readError) throw new Error(`Membaca tombstone gagal: ${readError.message}`)

  const safeRows = []
  let unsafe = 0
  for (const row of rows ?? []) {
    if (!UUID_PATTERN.test(row.id) || !UUID_PATTERN.test(row.event_id)) {
      unsafe++
      console.error(`Lewati tombstone dengan UUID tidak sah: ${row.id}`)
      continue
    }

    const canonical = canonicalPaths(row.event_id, row.id)
    if (
      (row.storage_path && row.storage_path !== canonical.full) ||
      (row.thumb_path && row.thumb_path !== canonical.thumb)
    ) {
      unsafe++
      console.error(`Lewati tombstone dengan path tidak kanonis: ${row.id}`)
      continue
    }

    safeRows.push({ ...row, canonical })
  }

  if (safeRows.length > 0) {
    const paths = safeRows.flatMap((row) => [row.canonical.full, row.canonical.thumb])
    const { error: storageError } = await supabase.storage.from('photos').remove(paths)
    if (storageError) throw new Error(`Menghapus objek Storage gagal: ${storageError.message}`)

    const ids = safeRows.map((row) => row.id)
    const { error: updateError } = await supabase
      .from('photos')
      .update({
        storage_cleaned_at: new Date().toISOString(),
        storage_path: null,
        thumb_path: null,
        preset: null,
        frame: null,
        width: null,
        height: null,
        processing_recipe: {},
      })
      .in('id', ids)
      .eq('status', 'failed')
      .is('storage_cleaned_at', null)
      .lt('cleanup_after', now)

    if (updateError) throw new Error(`Menandai cleanup gagal: ${updateError.message}`)
  }

  console.log(
    JSON.stringify({
      expiredReservations: Array.isArray(expired) ? expired.length : 0,
      cleanedTombstoneObjects: safeRows.length,
      skippedUnsafe: unsafe,
      checkedAt: now,
    })
  )

  if (unsafe > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
