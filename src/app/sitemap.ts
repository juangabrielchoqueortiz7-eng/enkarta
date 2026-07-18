import type { MetadataRoute } from 'next';
import { SITE_URL, MUESTRA_KEYS } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    ...MUESTRA_KEYS.map(k => ({
      url: `${SITE_URL}/muestra/${k}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
