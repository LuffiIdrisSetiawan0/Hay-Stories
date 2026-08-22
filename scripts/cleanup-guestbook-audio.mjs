/**
 * Worker maintenance untuk signed-upload Phone Guestbook.
 *
 * Jalankan terjadwal (disarankan tiap jam) dengan service-role env:
 *   npm run cleanup:guestbook-audio
 *
 * Row `failed` dipertahankan sebagai tombstone. Objek baru dihapus setelah
 * `cleanup_after`, yaitu sesudah seluruh signed upload token lama pasti mati.
 */

import { createClient } from '@supabase/supabase-js'

const AUDIO_BUCKET = 'guestbook-audio'
const BATCH_SIZE = 250
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EXTENSIONS = new Map([
  ['audio/webm', 'webm'],
  ['audio/mp4', 'm4a'],
  ['audio/ogg', 'ogg'],
])

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

function canonicalPath(row) {
  if (!UUID_PATTERN.test(row.id) || !UUID_PATTERN.test(row.event_id)) return null
  const extension = EXTENSIONS.get(row.audio_mime)
  if (!extension) return row.audio_path === null ? '' : null
  return `${row.event_id.toLowerCase()}/${row.id.toLowerCase()}.${extension}`
}

async function main() {
  const { data: expired, error: expiryError } = await supabase.rpc(
    'expire_stale_guestbook_audio_reservations',
    { p_older_than: '30 minutes', p_limit: 500 }
  )
  if (expiryError) throw new Error(`TTL reservasi guestbook gagal: ${expiryError.message}`)

  const now = new Date().toISOString()
  const { data: rows, error: readError } = await supabase
    .from('messages')
    .select('id, event_id, audio_path, audio_mime, cleanup_after')
    .eq('status', 'failed')
    .is('storage_cleaned_at', null)
    .lt('cleanup_after', now)
    .order('cleanup_after', { ascending: true })
    .limit(BATCH_SIZE)

  if (readError) throw new Error(`Membaca tombstone guestbook gagal: ${readError.message}`)

  const safeRows = []
  let unsafe = 0
  for (const row of rows ?? []) {
    const canonical = canonicalPath(row)
    if (canonical === null || (row.audio_path !== null && row.audio_path !== canonical)) {
      unsafe++
      console.error(`Lewati tombstone guestbook dengan metadata tidak kanonis: ${row.id}`)
      continue
    }
    safeRows.push({ ...row, canonical })
  }

  const objectPaths = safeRows
    .map((row) => row.canonical)
    .filter((path) => typeof path === 'string' && path.length > 0)

  if (objectPaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .remove(objectPaths)
    if (storageError) throw new Error(`Menghapus audio guestbook gagal: ${storageError.message}`)
  }

  if (safeRows.length > 0) {
    const ids = safeRows.map((row) => row.id)
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        storage_cleaned_at: new Date().toISOString(),
        audio_path: null,
        audio_mime: null,
        audio_bytes: null,
        duration_ms: null,
        upload_token_expires_at: null,
        upload_completed_at: null,
      })
      .in('id', ids)
      .eq('status', 'failed')
      .is('storage_cleaned_at', null)
      .lt('cleanup_after', now)

    if (updateError) throw new Error(`Menandai cleanup guestbook gagal: ${updateError.message}`)
  }

  console.log(
    JSON.stringify({
      expiredReservations: Array.isArray(expired) ? expired.length : 0,
      cleanedTombstones: safeRows.length,
      removedObjects: objectPaths.length,
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
