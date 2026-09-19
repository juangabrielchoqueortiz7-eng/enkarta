import type { Metadata } from 'next';
import Link from 'next/link';
import BrandByline from '@/components/brand/BrandByline';
import CatalogExplorer from '@/components/catalog/CatalogExplorer';
import CommercialLink from '@/components/commercial/CommercialLink';
import CommercialTracker from '@/components/commercial/CommercialTracker';
import { collectionCatalog } from '@/lib/collection-catalog';
import { COMMERCIAL_EVENT_PAGES } from '@/lib/event-pages';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Catálogo de invitaciones digitales',
  description: 'Explora todas las colecciones Enkarta: piezas de autor y colecciones base con muestra navegable, música, itinerario, RSVP y acceso QR.',
  alternates: { canonical: '/catalogo' },
  openGraph: {
    title: 'Catálogo de invitaciones digitales | Enkarta',
    description: 'Todas las colecciones Enkarta en un solo lugar. Abre cada diseño y recórrelo como lo verán tus invitados.',
    url: '/catalogo',
    images: ['/catalog/dolcevita.jpg'],
  },
  twitter: { card: 'summary_large_image', images: ['/catalog/dolcevita.jpg'] },
};

export default function CatalogPage() {
  const designs = collectionCatalog();
  const atelier = designs.filter(design => design.series === 'Atelier').length;
  const origen = designs.length - atelier;

  const structuredData = [
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: 'Catálogo de invitaciones digitales Enkarta',
      description: 'Colecciones de invitaciones digitales para bodas, XV años, cumpleaños y celebraciones.',
      url: `${SITE_URL}/catalogo`, inLanguage: 'es-BO',
      mainEntity: {
        '@type': 'ItemList', numberOfItems: designs.length,
        itemListElement: designs.map((design, index) => ({
          '@type': 'ListItem', position: index + 1, name: design.name, url: `${SITE_URL}${design.demoPath}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${SITE_URL}/catalogo` },
      ],
    },
  ];

  return <main className="min-h-screen bg-[#FAF7F2] text-[#30291f]">
    <CommercialTracker event="landing_view" placement="catalog_page" />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />

    {/* ── Cabecera ── */}
    <header className="border-b border-[#8b7d5f]/15 bg-[#FAF7F2]/90 px-5 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" aria-label="Volver al inicio de Enkarta" className="leading-none">
          <span className="font-cinzel text-xl tracking-[.12em] text-[#6e6048]">ENKARTA</span>
          <BrandByline tone="warm" className="mt-1.5" />
        </Link>
        <nav className="hidden items-center gap-6 font-outfit text-xs text-[#6c6254] md:flex" aria-label="Secciones">
          <span className="font-semibold text-[#8B7D5F]" aria-current="page">Catálogo</span>
          {Object.values(COMMERCIAL_EVENT_PAGES).map(event => (
            <Link key={event.slug} href={`/${event.slug}`} className="transition-colors hover:text-[#30291f]">{event.navLabel}</Link>
          ))}
          <Link href="/casos" className="transition-colors hover:text-[#30291f]">Casos</Link>
          <Link href="/#precios" className="transition-colors hover:text-[#30291f]">Precios</Link>
          <Link href="/proceso" className="transition-colors hover:text-[#30291f]">Cómo funciona</Link>
        </nav>
        <CommercialLink placement="catalog_nav" className="rounded-full bg-[#8B7D5F] px-4 py-2.5 font-outfit text-xs font-semibold text-white">Contactar</CommercialLink>
      </div>
    </header>

    {/* ── Portada ── */}
    <section className="relative overflow-hidden px-5 pb-14 pt-16 text-center sm:pt-20">
      <div className="pointer-events-none absolute left-1/2 top-[-18%] h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(212,184,120,0.22) 0%, transparent 70%)' }} />
      <div className="relative mx-auto max-w-3xl">
        <nav aria-label="Ruta de navegación" className="font-outfit text-[11px] text-[#8a8073]">
          <Link href="/" className="transition-colors hover:text-[#8B7D5F]">Inicio</Link>
          <span className="px-2 opacity-50">/</span>
          <span className="text-[#8B7D5F]">Catálogo</span>
        </nav>
        <p className="mt-6 font-great text-4xl" style={{ color: '#B8975A' }}>Catálogo</p>
        <h1 className="mt-2 font-cinzel text-3xl tracking-[0.08em] text-[#5a4e34] sm:text-5xl">COLECCIONES CON ALMA</h1>
        <p className="mx-auto mt-5 max-w-2xl font-cormorant text-[21px] font-medium leading-relaxed text-[#30291f]/60">
          Cada colección es un universo visual completo: portada, recorrido, itinerario, música y confirmaciones.
          Ábrelas y recórrelas exactamente como las verán tus invitados.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 font-outfit text-[11px] uppercase tracking-[0.2em] text-[#8a8073]">
          {[`${designs.length} diseños`, `${atelier} piezas de autor`, `${origen} colecciones base`, 'Muestras navegables'].map(chip => (
            <span key={chip} className="rounded-full border border-[#8b7d5f]/22 bg-white/70 px-4 py-2">{chip}</span>
          ))}
        </div>
      </div>
    </section>

    {/* ── Explorador ── */}
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <CatalogExplorer designs={designs} />
    </section>

    {/* ── Cierre comercial ── */}
    <section className="bg-[#1a1512] px-5 py-20 text-center text-white">
      <div className="mx-auto max-w-3xl">
        <p className="font-great text-4xl" style={{ color: '#B8975A' }}>¿Ya tienes una favorita?</p>
        <h2 className="mt-3 font-playfair text-3xl leading-tight sm:text-4xl">
          Cuéntanos tu fecha y la colección que te gustó
        </h2>
        <p className="mx-auto mt-5 max-w-xl font-outfit text-sm leading-6 text-white/55">
          Adaptamos la dirección artística a tu evento: nombres, fotografías, itinerario, pases y confirmaciones.
          Si ninguna encaja del todo, diseñamos una pieza a medida.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <CommercialLink placement="catalog_final" className="rounded-full bg-[#B8975A] px-8 py-3.5 font-outfit text-sm font-semibold text-white">
            Pedir mi invitación
          </CommercialLink>
          <Link href="/proceso" className="rounded-full border border-white/20 px-8 py-3.5 font-outfit text-sm font-semibold text-white/80 transition-colors hover:border-white/40">
            Ver cómo funciona
          </Link>
        </div>
      </div>
    </section>

    <footer className="border-t border-white/5 bg-[#120f0c] px-5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="font-outfit text-xs text-white/30">© 2026 Enkarta · Marca comercial operada por Grupo JABA.</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Enlaces del sitio">
          <Link href="/" className="font-outfit text-xs text-white/30 transition-colors hover:text-white/60">Inicio</Link>
          <Link href="/casos" className="font-outfit text-xs text-white/30 transition-colors hover:text-white/60">Casos</Link>
          <Link href="/#precios" className="font-outfit text-xs text-white/30 transition-colors hover:text-white/60">Precios</Link>
          <Link href="/legal/terminos" className="font-outfit text-xs text-white/30 transition-colors hover:text-white/60">Términos</Link>
        </nav>
      </div>
    </footer>
  </main>;
}
