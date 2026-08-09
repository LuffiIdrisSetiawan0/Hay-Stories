import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FILM_PRESETS } from '@/lib/catalog'
import { findActiveGuest } from '@/lib/guest/event'
import { readGuestSession } from '@/lib/guest/session'
import { PHOTO_BUCKET, photoPaths } from '@/lib/photos'

/**
 * Satu jepretan tamu, dari klaim kuota sampai konfirmasi.
 *
 *   POST   klaim satu jepretan, buat baris foto, terbitkan signed upload URL
 *   PATCH  tandai foto selesai terunggah
 *   DELETE batalkan dan kembalikan jepretannya
 *
 * Berkasnya TIDAK melewati server ini. Klien mengunggah langsung ke Supabase
 * Storage memakai signed URL sekali pakai — dua foto ~1,5 MB per jepretan,
 * dikalikan ratusan tamu, akan membakar waktu eksekusi dan bandwidth fungsi
 * tanpa memberi apa pun yang tidak bisa diberikan token bertanda tangan.
 *
 * Rute ini dikecualikan dari proxy (lihat `src/proxy.ts`): tamu anonim tidak
 * punya sesi Supabase untuk disegarkan, dan otentikasinya adalah JWT tamu di
 * cookie httpOnly yang diperiksa di setiap handler di bawah.
 */

/** Maksimum yang masuk akal untuk satu foto; menolak berkas yang jelas keliru. */
const MAX_BYTES = 26_214_400 // sama dengan file_size_limit bucket `photos`

interface Session {
  guestId: string
  guestName: string
  eventId: string
  sessionId: string
}

/**
 * Otentikasi satu permintaan tamu.
 *
 * `eventId` datang dari klien, tapi itu tidak memberi kuasa apa pun: cookie
 * yang dibaca bernama sesuai acara tersebut, dan verifikasinya menolak token
 * yang klaim `eid`-nya tidak cocok. Menyebut acara orang lain hanya
 * menghasilkan "tidak ada cookie".
 */
async function authenticate(
  eventId: unknown
): Promise<{ session: Session } | { error: Response }> {
  if (typeof eventId !== 'string' || !eventId) {
    return { error: Response.json({ error: 'Permintaan tidak lengkap.' }, { status: 400 }) }
  }

  const cookie = await readGuestSession(eventId)
  if (!cookie) {
    return {
      error: Response.json({ error: 'Sesi tamu tidak ditemukan. Muat ulang halaman.' }, { status: 401 }),
    }
  }

  const guest = await findActiveGuest(cookie.guestId, eventId)
  if (!guest) {
    return { error: Response.json({ error: 'Aksesmu ke album ini dicabut.' }, { status: 403 }) }
  }

  return {
    session: {
      guestId: guest.id,
      guestName: guest.display_name,
      eventId,
      sessionId: cookie.sessionId,
    },
  }
}

// ---------------------------------------------------------------------------
// POST — klaim jepretan dan terbitkan signed upload URL
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Body tidak sah.' }, { status: 400 })

  const auth = await authenticate(body.eventId)
  if ('error' in auth) return auth.error
  const { session } = auth

  const preset = String(body.preset ?? '')
  if (!FILM_PRESETS.some((p) => p.id === preset)) {
    return Response.json({ error: 'Preset film tidak dikenal.' }, { status: 400 })
  }

  const width = Number(body.width)
  const height = Number(body.height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return Response.json({ error: 'Ukuran foto tidak sah.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  /*
   * Klaim DULU, baru siapkan apa pun yang lain.
   *
   * `claim_shot` mengunci baris tamu dengan FOR UPDATE dan menaikkan
   * `shots_used` dalam satu transaksi, jadi dua puluh permintaan bersamaan
   * dari satu perangkat tetap tidak bisa menembus kuota. Melakukannya setelah
   * pekerjaan lain hanya memperlebar jendela balapannya.
   *
   * Fungsi ini juga menolak acara yang statusnya bukan 'active', jadi album
   * yang ditutup host di tengah pesta berhenti menerima foto tanpa perlu
   * kueri terpisah di jalur terpanas aplikasi ini.
   */
  const { data: claim, error: claimError } = await supabase
    .rpc('claim_shot', { p_guest_id: session.guestId })
    .single<{ ok: boolean; shots_used: number; shots_limit: number }>()

  if (claimError) {
    console.error('claim_shot gagal:', claimError)
    return Response.json({ error: 'Gagal menyiapkan jepretan.' }, { status: 500 })
  }

  if (!claim.ok) {
    return Response.json(
      {
        error:
          claim.shots_used >= claim.shots_limit
            ? 'Roll filmmu sudah habis.'
            : 'Album ini sedang tidak menerima foto.',
        shotsUsed: claim.shots_used,
        shotsLimit: claim.shots_limit,
      },
      { status: 409 }
    )
  }

  // Mulai di sini jepretannya sudah terpakai. Setiap kegagalan wajib
  // mengembalikannya, kalau tidak tamu kehilangan satu frame tanpa dapat foto.
  const release = async () => {
    const { error } = await supabase.rpc('release_shot', { p_guest_id: session.guestId })
    if (error) console.error('release_shot gagal:', error)
  }

  const { data: photo, error: insertError } = await supabase
    .from('photos')
    .insert({
      event_id: session.eventId,
      guest_id: session.guestId,
      guest_name: session.guestName,
      guest_session_id: session.sessionId,
      preset,
      width: Math.round(width),
      height: Math.round(height),
      source: 'inapp',
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !photo) {
    console.error('insert photo gagal:', insertError)
    await release()
    return Response.json({ error: 'Gagal menyiapkan jepretan.' }, { status: 500 })
  }

  const paths = photoPaths(session.eventId, photo.id)

  const [full, thumb] = await Promise.all([
    supabase.storage.from(PHOTO_BUCKET).createSignedUploadUrl(paths.full),
    supabase.storage.from(PHOTO_BUCKET).createSignedUploadUrl(paths.thumb),
  ])

  if (full.error || thumb.error || !full.data || !thumb.data) {
    console.error('createSignedUploadUrl gagal:', full.error ?? thumb.error)
    await supabase.from('photos').delete().eq('id', photo.id)
    await release()
    return Response.json({ error: 'Gagal menyiapkan jepretan.' }, { status: 500 })
  }

  // Path disimpan sekarang supaya baris yatim tetap bisa ditelusuri ke
  // berkasnya kalau konfirmasinya tidak pernah datang.
  await supabase
    .from('photos')
    .update({ storage_path: paths.full, thumb_path: paths.thumb })
    .eq('id', photo.id)

  return Response.json({
    photoId: photo.id,
    shotsUsed: claim.shots_used,
    shotsLimit: claim.shots_limit,
    full: { path: paths.full, token: full.data.token },
    thumb: { path: paths.thumb, token: thumb.data.token },
  })
}

// ---------------------------------------------------------------------------
// PATCH — unggahan selesai, foto boleh terlihat
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Body tidak sah.' }, { status: 400 })

  const auth = await authenticate(body.eventId)
  if ('error' in auth) return auth.error
  const { session } = auth

  const photoId = String(body.photoId ?? '')
  const bytes = Number(body.bytes)

  if (!photoId || !Number.isFinite(bytes) || bytes < 1 || bytes > MAX_BYTES) {
    return Response.json({ error: 'Permintaan tidak sah.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  /*
   * Filter kepemilikan ada di WHERE, bukan di pemeriksaan terpisah sebelumnya.
   * Membaca dulu lalu menulis membuka jendela di antaranya; membatasi
   * UPDATE-nya sendiri berarti id foto tamu lain tidak akan cocok dengan apa
   * pun. Syarat `status = pending` sekaligus membuat pemanggilan ganda tidak
   * menimbulkan efek kedua.
   */
  const { data, error } = await supabase
    .from('photos')
    .update({ status: 'ready', bytes: Math.round(bytes) })
    .eq('id', photoId)
    .eq('guest_id', session.guestId)
    .eq('event_id', session.eventId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('konfirmasi foto gagal:', error)
    return Response.json({ error: 'Gagal menyimpan foto.' }, { status: 500 })
  }

  if (!data) {
    return Response.json({ error: 'Foto tidak ditemukan.' }, { status: 404 })
  }

  return Response.json({ ok: true })
}

// ---------------------------------------------------------------------------
// DELETE — unggahan gagal, kembalikan jepretannya
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Body tidak sah.' }, { status: 400 })

  const auth = await authenticate(body.eventId)
  if ('error' in auth) return auth.error
  const { session } = auth

  const photoId = String(body.photoId ?? '')
  if (!photoId) return Response.json({ error: 'Permintaan tidak sah.' }, { status: 400 })

  const supabase = createAdminClient()

  // Hanya baris yang masih `pending` yang boleh dibatalkan. Tanpa syarat itu,
  // permintaan DELETE berulang akan mengembalikan jepretan berkali-kali dan
  // tamu bisa memotret melebihi kuotanya.
  const { data, error } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)
    .eq('guest_id', session.guestId)
    .eq('event_id', session.eventId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('pembatalan foto gagal:', error)
    return Response.json({ error: 'Gagal membatalkan jepretan.' }, { status: 500 })
  }

  if (!data) {
    // Sudah dibatalkan atau sudah selesai — tidak ada yang perlu dikembalikan.
    return Response.json({ ok: true })
  }

  const paths = photoPaths(session.eventId, photoId)
  // Berkas mungkin belum sempat terunggah; menghapus yang tidak ada bukan error.
  await supabase.storage.from(PHOTO_BUCKET).remove([paths.full, paths.thumb])

  const { error: releaseError } = await supabase.rpc('release_shot', {
    p_guest_id: session.guestId,
  })
  if (releaseError) console.error('release_shot gagal:', releaseError)

  return Response.json({ ok: true })
}
