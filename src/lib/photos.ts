import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Akses foto: tata letak berkas, pembacaan baris, dan penerbitan signed URL.
 *
 * Dipakai jalur host maupun jalur tamu. Keduanya wajib lewat service role —
 * bukan karena hostnya tidak tepercaya, tapi karena bucket `photos` sengaja
 * dibuat tanpa satu pun storage policy. Itu berarti anon key yang bocor tidak
 * bisa membaca sebutir foto pun, dan konsekuensinya SETIAP pembacaan harus
 * ditandatangani server. Pemanggil bertanggung jawab memastikan penanya berhak
 * melihat acara itu sebelum memanggil apa pun di sini.
 */

export const PHOTO_BUCKET = 'photos'

/**
 * Dikelompokkan per acara supaya pembersihan retensi cukup menghapus satu
 * prefiks. `expires_at` tidak ada gunanya kalau menghapusnya mahal.
 *
 * Nama berkas memakai id foto: sudah unik dari database, jadi dua tamu yang
 * menjepret pada milidetik yang sama tetap tidak bisa saling menimpa.
 */
export function photoPaths(eventId: string, photoId: string) {
  return {
    full: `${eventId}/${photoId}.jpg`,
    thumb: `${eventId}/${photoId}_thumb.jpg`,
  }
}

/**
 * Masa berlaku tautan galeri.
 *
 * Satu jam cukup panjang untuk satu sesi menelusuri album, dan cukup pendek
 * sehingga tautan yang tidak sengaja tersalin ke grup WhatsApp mati dengan
 * sendirinya sebelum menyebar jauh.
 */
const SIGNED_TTL_SECONDS = 60 * 60

export interface PhotoRow {
  id: string
  guest_name: string
  taken_at: string | null
  preset: string | null
  width: number | null
  height: number | null
  storage_path: string | null
  thumb_path: string | null
  is_hidden: boolean | null
}

export interface SignedPhoto extends PhotoRow {
  thumbUrl: string
  fullUrl: string
}

export interface PhotoPage {
  photos: SignedPhoto[]
  total: number
  hasMore: boolean
  /**
   * Foto tidak bisa dimuat sama sekali — beda dari album yang memang kosong.
   *
   * Pemanggil WAJIB membedakan keduanya. "Belum ada foto" pada album yang
   * sebenarnya berisi ratusan foto adalah kebohongan yang membuat host
   * menyangka karyanya hilang.
   */
  failed: boolean
}

const EMPTY_PAGE: PhotoPage = { photos: [], total: 0, hasMore: false, failed: true }

/**
 * Ambil satu halaman foto beserta tautan bertanda tangannya.
 *
 * Dipaginasi karena tautan bertanda tangan panjang (~200 karakter) dan dua di
 * antaranya melekat pada tiap foto. Album besar yang dikirim sekaligus akan
 * menambah ratusan kilobyte pada muatan halaman — di jaringan seluler dalam
 * gedung resepsi, itu selisih antara galeri yang terbuka dan yang tidak.
 *
 * TIDAK PERNAH melempar. Fungsi ini dipanggil dari halaman kelola album yang
 * juga memuat QR, panel berbagi, dan kontrol reveal — hal-hal yang tidak ada
 * hubungannya dengan foto. Satu env var yang belum diisi tidak boleh
 * menjatuhkan seluruh halaman; kegagalannya dilaporkan lewat `failed`.
 */
export async function listPhotos(
  eventId: string,
  options: { page?: number; pageSize?: number; includeHidden?: boolean } = {}
): Promise<PhotoPage> {
  const pageSize = options.pageSize ?? 48
  const page = Math.max(1, options.page ?? 1)
  const from = (page - 1) * pageSize

  try {
    // Melempar bila SUPABASE_SERVICE_ROLE_KEY belum diisi. Ditangkap di sini,
    // bukan dibiarkan naik ke React.
    const supabase = createAdminClient()

    let query = supabase
      .from('photos')
      .select(
        'id, guest_name, taken_at, preset, width, height, storage_path, thumb_path, is_hidden',
        { count: 'exact' }
      )
      .eq('event_id', eventId)
      .eq('status', 'ready')

    // Tamu tidak pernah melihat foto yang disembunyikan host. Host melihatnya,
    // ditandai, supaya bisa mengembalikannya.
    if (!options.includeHidden) query = query.eq('is_hidden', false)

    const { data, count, error } = await query
      .order('taken_at', { ascending: false })
      .range(from, from + pageSize - 1)
      .returns<PhotoRow[]>()

    if (error) {
      console.error('listPhotos gagal:', error)
      return EMPTY_PAGE
    }

    const rows = data ?? []
    const total = count ?? 0

    return {
      photos: await signPhotos(supabase, rows),
      total,
      hasMore: from + rows.length < total,
      failed: false,
    }
  } catch (err) {
    console.error('listPhotos gagal:', err)
    return EMPTY_PAGE
  }
}

/**
 * Terbitkan tautan thumbnail dan foto penuh dalam dua panggilan borongan.
 *
 * Sekali per berkas akan berarti dua permintaan jaringan per foto; empat puluh
 * delapan foto jadi sembilan puluh enam perjalanan bolak-balik sebelum satu
 * piksel pun sampai ke layar.
 */
async function signPhotos(
  supabase: ReturnType<typeof createAdminClient>,
  rows: PhotoRow[]
): Promise<SignedPhoto[]> {
  const usable = rows.filter((r) => r.storage_path && r.thumb_path)
  if (usable.length === 0) return []

  const storage = supabase.storage.from(PHOTO_BUCKET)

  const [thumbs, fulls] = await Promise.all([
    storage.createSignedUrls(
      usable.map((r) => r.thumb_path!),
      SIGNED_TTL_SECONDS
    ),
    storage.createSignedUrls(
      usable.map((r) => r.storage_path!),
      SIGNED_TTL_SECONDS
    ),
  ])

  if (thumbs.error || fulls.error) {
    console.error('createSignedUrls gagal:', thumbs.error ?? fulls.error)
    return []
  }

  // Hasilnya dicocokkan lewat path, bukan lewat urutan array. Supabase memang
  // mengembalikannya berurutan, tapi menggantungkan foto pada urutan berarti
  // satu berkas yang hilang akan menggeser semua tautan setelahnya dan
  // memasangkan foto dengan nama tamu yang salah.
  const byPath = new Map<string, string>()
  for (const entry of [...thumbs.data, ...fulls.data]) {
    if (entry.signedUrl && entry.path) byPath.set(entry.path, entry.signedUrl)
  }

  const signed: SignedPhoto[] = []
  for (const row of usable) {
    const thumbUrl = byPath.get(row.thumb_path!)
    const fullUrl = byPath.get(row.storage_path!)
    if (thumbUrl && fullUrl) signed.push({ ...row, thumbUrl, fullUrl })
  }

  return signed
}

// Pembentuk tautan unduh ada di `@/lib/photo-links` — fungsi murni yang juga
// dipakai komponen klien, jadi tidak boleh terkunci di modul `server-only`.
