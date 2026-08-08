'use client'

import { useEffect, useRef, useState } from 'react'

interface UseInViewOptions {
  /** Bagian elemen yang harus terlihat sebelum dianggap masuk. */
  threshold?: number
  /** Majukan pemicu agar animasi mulai tepat sebelum elemen terlihat. */
  rootMargin?: string
}

/**
 * Melaporkan apakah elemen sudah pernah masuk viewport.
 *
 * Sekali `true`, selamanya `true` — animasi masuk tidak boleh terputar ulang
 * saat pengguna scroll balik ke atas; itu terasa gelisah, bukan mahal.
 *
 * Menggantikan boilerplate `IntersectionObserver` + `useState` yang sebelumnya
 * disalin di HowItWorks, Pricing, ProblemSection, dan Testimonials.
 *
 * Kasus tanpa JavaScript ditangani di CSS, bukan di sini: lihat blok
 * `<noscript>` di app/layout.tsx.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.1,
  rootMargin = '0px 0px -8% 0px',
}: UseInViewOptions = {}) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, inView }
}
