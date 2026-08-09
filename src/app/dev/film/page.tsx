import { notFound } from 'next/navigation'
import FilmShowcase from '@/components/landing/FilmShowcase'
import FilmLab from './FilmLab'

export const metadata = {
  title: 'Film Lab',
  robots: { index: false, follow: false },
}

/**
 * Halaman uji visual preset film. Hanya tersedia saat `next dev`.
 *
 * Dipakai untuk menilai LUT setelah menjalankan `node scripts/generate-luts.mjs`
 * dan untuk memverifikasi shader benar-benar bekerja di browser sungguhan —
 * bukan hanya lolos type-check.
 *
 * Di bawahnya dirender <FilmShowcase> yang sesungguhnya, supaya band gelap
 * landing bisa diperiksa terpisah dari hero setinggi viewport.
 */
export default function FilmLabPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <>
      <FilmLab />
      <FilmShowcase />
    </>
  )
}
