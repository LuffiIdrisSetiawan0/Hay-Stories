/**
 * Pembentuk tautan foto — fungsi murni, tanpa rahasia, aman di browser.
 *
 * Sengaja terpisah dari `@/lib/photos` yang `server-only`: tautan unduh itu
 * turunan dari tautan tampil, dan mengirim keduanya dari server berarti
 * menggandakan string ~200 karakter untuk setiap foto di dalam payload RSC.
 * Pada album berisi puluhan foto, itu puluhan kilobyte yang dibayar tamu di
 * jaringan seluler dalam gedung — untuk sesuatu yang bisa dihitung ulang di
 * tempat.
 */

/**
 * Ubah tautan tampil jadi tautan unduh.
 *
 * Atribut `download` pada `<a>` diabaikan browser untuk tautan lintas asal, dan
 * Supabase Storage memang asal yang berbeda — tanpa ini, tombol unduh hanya
 * membuka fotonya di tab baru. Parameter `download` membuat Storage mengirim
 * `Content-Disposition: attachment`, yang dihormati di mana pun.
 */
export function downloadUrl(signedUrl: string, filename: string): string {
  const separator = signedUrl.includes('?') ? '&' : '?'
  return `${signedUrl}${separator}download=${encodeURIComponent(filename)}`
}

/** Nama berkas yang masuk akal saat mendarat di folder Unduhan seseorang. */
export function photoFilename(eventTitle: string, photoId: string): string {
  const slug = eventTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  return `${slug || 'album'}-${photoId.slice(0, 8)}.jpg`
}
