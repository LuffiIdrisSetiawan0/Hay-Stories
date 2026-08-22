import type { MetadataRoute } from 'next'
import { appOrigin } from '@/lib/origin'

const ROUTES = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/harga', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/guestbook', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/pernikahan', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/ulang-tahun', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/pesta', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/acara-kantor', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/privasi', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/syarat', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/kredit', priority: 0.3, changeFrequency: 'yearly' },
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = appOrigin()

  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: new URL(path, origin).toString(),
    changeFrequency,
    priority,
  }))
}
