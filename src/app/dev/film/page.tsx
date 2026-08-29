import { notFound } from 'next/navigation'
import FilmRolls from '@/components/home/FilmRolls'
import FilmLab from './FilmLab'

export const metadata = {
  title: 'Film Lab',
  robots: { index: false, follow: false },
}

/**
 * Halaman uji visual preset film. Hanya tersedia saat `next dev`.
 *
 * Dipakai untuk menilai LUT setelah menjalankan `node scripts/build-luts.mjs`
 * dan untuk memverifikasi shader benar-benar bekerja di browser sungguhan —
 * bukan hanya lolos type-check.
 *
 * Di bawahnya dirender <FilmRolls> yang sesungguhnya, supaya deret roll di
 * halaman utama bisa diperiksa terpisah dari hero setinggi viewport.
 */
export default function FilmLabPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <>
      <FilmLab />
      <FilmRolls />
    </>
  )
}
