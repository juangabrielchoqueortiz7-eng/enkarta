import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// El escaparate (landing + muestras) se indexa; el admin, el panel del
// anfitrión, las APIs y las invitaciones de clientes (/i/, privadas) no.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/panel', '/api/', '/i/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
