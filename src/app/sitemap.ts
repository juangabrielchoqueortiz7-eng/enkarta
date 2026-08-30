import type { MetadataRoute } from 'next';
import { SITE_URL, MUESTRA_KEYS } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/proceso`, changeFrequency: 'monthly', priority: 0.7 },
    ...['/bodas', '/xv-anos', '/cumpleanos'].map(path => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    { url: `${SITE_URL}/casos`, changeFrequency: 'monthly', priority: 0.8 },
    ...['/legal', '/legal/privacidad', '/legal/terminos', '/legal/pagos'].map(path => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
    ...MUESTRA_KEYS.map(k => ({
      url: `${SITE_URL}/muestra/${k}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
