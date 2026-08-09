import 'server-only'

import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

/**
 * Identitas tamu anonim.
 *
 * Tamu tidak punya akun dan tidak punya akses database sama sekali — RLS
 * memblokir anon key dari setiap tabel. Yang membuktikan "saya tamu nomor
 * sekian di acara ini" adalah JWT bertanda tangan di cookie httpOnly, dan
 * setiap jalur tamu di sisi server wajib memverifikasinya sebelum menyentuh
 * klien service role.
 *
 * Kenapa JWT dan bukan sekadar UUID acak di cookie: UUID mentah harus dicari
 * ke database dulu untuk tahu sah atau tidak, sementara tanda tangan bisa
 * diperiksa tanpa satu pun query. Jalur kamera memanggil ini di setiap
 * jepretan.
 */

const ALG = 'HS256'

/**
 * Umur cookie. Sengaja lebih pendek dari masa simpan foto paket termurah
 * (90 hari) tapi jauh lebih panjang dari acaranya sendiri — tamu yang kembali
 * membuka galeri seminggu kemudian tidak perlu memperkenalkan diri lagi.
 */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export interface GuestSession {
  guestId: string
  eventId: string
  sessionId: string
  displayName: string
}

function secret(): Uint8Array {
  const raw = process.env.GUEST_TOKEN_SECRET

  if (!raw) {
    throw new Error(
      'GUEST_TOKEN_SECRET wajib diisi untuk jalur tamu. Bangkitkan dengan: openssl rand -base64 32'
    )
  }

  return new TextEncoder().encode(raw)
}

/**
 * Satu cookie per acara.
 *
 * Cookie tunggal akan saling menimpa saat satu orang menghadiri dua acara —
 * akad dan resepsi kerap dibuat sebagai dua album terpisah, dan tamu yang
 * memindai QR kedua tidak boleh terlempar keluar dari yang pertama.
 */
export function guestCookieName(eventId: string): string {
  return `hay_guest_${eventId}`
}

/** Identitas perangkat, dibuat server dan tidak pernah dipercaya dari klien. */
export function newSessionId(): string {
  return crypto.randomUUID()
}

export async function issueGuestSession(session: GuestSession): Promise<void> {
  const now = Math.floor(Date.now() / 1000)

  const token = await new SignJWT({
    eid: session.eventId,
    sid: session.sessionId,
    nm: session.displayName,
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(session.guestId)
    .setIssuedAt(now)
    .setExpirationTime(now + MAX_AGE_SECONDS)
    .sign(secret())

  const store = await cookies()

  store.set(guestCookieName(session.eventId), token, {
    httpOnly: true,
    // Cookie `secure` tidak pernah terkirim lewat http, jadi mengaktifkannya
    // saat pengembangan lokal akan membuat sesi tamu selalu hilang.
    secure: process.env.NODE_ENV === 'production',
    // Tamu tiba lewat pemindaian QR — navigasi tingkat atas, bukan permintaan
    // lintas situs. 'lax' cukup dan tetap menahan CSRF dari form pihak ketiga.
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

/**
 * Baca dan verifikasi sesi tamu untuk satu acara.
 *
 * Mengembalikan `null` untuk setiap kegagalan — tidak ada, kedaluwarsa, tanda
 * tangan salah — karena pemanggilnya memperlakukan semuanya sama: tampilkan
 * form perkenalan lagi.
 */
export async function readGuestSession(eventId: string): Promise<GuestSession | null> {
  const store = await cookies()
  const token = store.get(guestCookieName(eventId))?.value

  if (!token) return null

  // Dibaca di luar `try` dengan sengaja. Kalau secretnya belum diisi, itu salah
  // konfigurasi dan harus berisik — tertelan di dalam `catch` di bawah, setiap
  // tamu yang kembali akan tampak sebagai orang baru dan tidak ada yang tahu
  // kenapa.
  const key = secret()

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: [ALG] })

    // Nama cookie memuat id acara, tapi nama cookie ditentukan browser dan
    // browser dikendalikan tamu. Token acara lain yang disalin ke nama cookie
    // acara ini akan lolos tanpa pemeriksaan berikut.
    if (payload.eid !== eventId) return null

    const { sub, sid, nm } = payload

    if (typeof sub !== 'string' || typeof sid !== 'string' || typeof nm !== 'string') {
      return null
    }

    return { guestId: sub, eventId, sessionId: sid, displayName: nm }
  } catch {
    return null
  }
}

export async function clearGuestSession(eventId: string): Promise<void> {
  const store = await cookies()
  store.delete(guestCookieName(eventId))
}
