import type { Metadata } from "next";
import "./globals.css";

import { SITE_URL } from '@/lib/site';
import ConsentAnalytics from '@/components/commercial/ConsentAnalytics';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  title: { default: 'Enkarta — Invitaciones Digitales', template: '%s · Enkarta' },
  description: 'Crea invitaciones digitales elegantes para bodas, XV años, cumpleaños y más. Personalizables y listas para compartir por WhatsApp.',
  openGraph: {
    title: 'Enkarta — Invitaciones Digitales',
    description: 'Invitaciones digitales que enamoran: sobre animado, música, confirmación de asistencia y diseño premium.',
    type: 'website', siteName: 'Enkarta', images: [{ url: '/catalog/dolcevita.jpg' }],
  },
  twitter: { card: 'summary_large_image', title: 'Enkarta — Invitaciones Digitales', description: 'Invitaciones digitales para bodas, XV años y cumpleaños.', images: ['/catalog/dolcevita.jpg'] },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'Grupo JABA', alternateName: 'Enkarta', url: SITE_URL, brand: { '@type': 'Brand', name: 'Enkarta' } },
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: 'Enkarta', publisher: { '@id': `${SITE_URL}/#organization` }, inLanguage: 'es-BO' },
    ],
  };
  return (
    <html lang="es">
      <body className="antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
        {children}
        <ConsentAnalytics gaMeasurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} metaPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID} />
      </body>
    </html>
  );
}
