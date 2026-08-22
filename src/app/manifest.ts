import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HAY Stories — Kamera Acara Digital',
    short_name: 'HAY Stories',
    description:
      'Kamera acara berbasis QR dengan look film dan satu galeri untuk semua cerita tamu.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fdfbf7',
    theme_color: '#0c0b09',
    lang: 'id',
    categories: ['photography', 'lifestyle'],
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
