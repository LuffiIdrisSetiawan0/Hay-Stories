import type { MetadataRoute } from 'next'
import { appOrigin } from '@/lib/origin'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/a/', '/api/', '/auth/', '/dashboard/', '/dev/', '/login'],
    },
    sitemap: `${appOrigin()}/sitemap.xml`,
  }
}
