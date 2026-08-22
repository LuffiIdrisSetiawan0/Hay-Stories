'use client'

import { useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import styles from './Manage.module.css'

/**
 * Panel berbagi: QR untuk dicetak, tautan untuk dikirim, dan kode cadangan
 * untuk diketik manual saat kamera tamu gagal memindai — yang cukup sering
 * terjadi di ruangan gelap.
 */
export default function SharePanel({
  url,
  accessCode,
  qrSvg,
  title,
}: {
  url: string
  accessCode: string | null
  qrSvg: string
  title: string
}) {
  const [copied, setCopied] = useState<'url' | 'code' | null>(null)

  const copy = async (value: string, which: 'url' | 'code') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(which)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Clipboard diblokir (konteks non-HTTPS atau izin ditolak). Tautannya
      // tetap terlihat di layar, jadi host masih bisa menyalin manual.
    }
  }

  const downloadSvg = () => {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `qr-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.svg`
    a.click()
    URL.revokeObjectURL(href)
  }

  return (
    <section className={`${styles.card} ${styles.shareCard}`}>
      <h2 className={styles.cardTitle}>Bagikan ke tamu</h2>
      <p className={styles.cardHint}>
        Cetak QR-nya untuk meja tamu, atau kirim tautannya lewat WhatsApp.
      </p>

      <div className={styles.shareLayout}>
        <div className={styles.shareQrColumn}>
          <div className={styles.qrBox}>
            {/* SVG dibuat di server oleh pustaka qrcode, bukan input pengguna. */}
            <div className={styles.qr} dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </div>

          <button
            type="button"
            onClick={downloadSvg}
            className={`btn btn-secondary ${styles.shareDownload}`}
          >
            <Download size={15} />
            Unduh QR
          </button>
        </div>

        <div className={styles.shareDetails}>
          <div className={styles.shareField}>
            <span className={styles.shareLabel}>Tautan tamu</span>
            <div className={styles.shareRow}>
              <code className={styles.shareValue}>{url}</code>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => copy(url, 'url')}
                aria-label="Salin tautan"
              >
                {copied === 'url' ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
            <span className={styles.shareHint}>Tautan utama yang dibuka dari QR.</span>
          </div>

          {accessCode && (
            <div className={styles.shareField}>
              <span className={styles.shareLabel}>Kode cadangan</span>
              <div className={styles.shareRow}>
                <code className={`${styles.shareValue} ${styles.code}`}>{accessCode}</code>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => copy(accessCode, 'code')}
                  aria-label="Salin kode"
                >
                  {copied === 'code' ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
              <span className={styles.shareHint}>
                Untuk tamu yang kameranya gagal memindai QR.
              </span>
            </div>
          )}

          <div className={styles.shareTip}>
            <span>Tips cetak</span>
            <p>Gunakan ukuran minimal 3 cm dan beri ruang putih di sekeliling QR.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
