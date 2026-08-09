import QRCode from 'qrcode'

/**
 * QR code dibuat saat diminta, bukan disimpan di storage.
 *
 * Isinya sepenuhnya ditentukan oleh slug album, jadi menyimpannya berarti
 * membayar storage untuk sesuatu yang bisa dihitung ulang dalam hitungan
 * milidetik — dan menambah satu berkas yang bisa basi kalau slug-nya berubah.
 * Ini juga menghindari kebutuhan service role, karena bucket `qr` sengaja
 * tidak punya policy tulis.
 */

const OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  color: {
    // Cokelat gelap, bukan hitam murni — menyatu dengan palet cetak HAY Stories.
    dark: '#1a1a1aff',
    light: '#fdfbf7ff',
  },
}

/** SVG untuk ditampilkan di layar dan dicetak. Tajam di ukuran berapa pun. */
export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...OPTIONS, type: 'svg' })
}

/**
 * PNG data URL untuk diunduh host.
 *
 * 1024 px cukup tajam untuk dicetak sebagai kartu meja A6 pada 300 dpi.
 */
export async function qrPngDataUrl(url: string, width = 1024): Promise<string> {
  return QRCode.toDataURL(url, { ...OPTIONS, width })
}
