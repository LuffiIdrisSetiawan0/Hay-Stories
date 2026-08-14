'use client'

import { useEffect, useState } from 'react'
import { useInView } from './useInView'

interface CounterProps {
  /** Angka akhir yang dituju. */
  to: number
  /** Lama hitungan dalam milidetik. */
  duration?: number
  /** Ditempel di belakang angka, mis. `+` atau `%`. */
  suffix?: string
  className?: string
}

/**
 * Angka yang menghitung naik sekali saat masuk viewport.
 *
 * Dua hal yang gampang salah dan sengaja ditangani di sini:
 *
 * Pertama, hitungannya harus berhenti tepat di `to`. Interpolasi berbasis waktu
 * bisa berhenti satu langkah lebih awal kalau frame terakhir jatuh sebelum
 * durasinya habis, dan angka bukti yang berhenti di 89 padahal seharusnya 90
 * adalah bug yang terlihat. Karena itu nilai akhirnya dipasang eksplisit begitu
 * progresnya mencapai 1.
 *
 * Kedua, tanpa JavaScript atau dengan animasi dikurangi, yang tampil langsung
 * angka finalnya — bukan nol. Angka nol yang tidak pernah bergerak lebih buruk
 * daripada tidak ada animasi sama sekali.
 */
export default function Counter({ to, duration = 1600, suffix, className }: CounterProps) {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.4 })
  const [value, setValue] = useState(to)

  useEffect(() => {
    if (!inView) return

    // Keadaan awalnya sudah `to`, jadi kedua kasus ini tidak perlu menyentuh
    // state sama sekali — cukup tidak menganimasikan apa pun.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || to === 0) return

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // Pelan di akhir, seirama dengan easing animasi masuk di sekitarnya.
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(progress === 1 ? to : Math.round(to * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    // Frame pertama sendiri yang menurunkan nilainya ke sekitar nol. Menyetel
    // nol di sini akan jadi setState sinkron di dalam effect, dan hasil
    // tampilannya sama saja — selisihnya satu frame.
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, to, duration])

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString('id-ID')}
      {suffix}
    </span>
  )
}
