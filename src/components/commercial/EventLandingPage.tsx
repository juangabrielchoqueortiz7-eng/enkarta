import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import BrandByline from '@/components/brand/BrandByline';
import CommercialLink from '@/components/commercial/CommercialLink';
import CommercialTracker from '@/components/commercial/CommercialTracker';
import { collectionCatalog } from '@/lib/collection-catalog';
import { COMMERCIAL_EVENT_PAGES, type CommercialEventSlug } from '@/lib/event-pages';
import { PACKAGE_CATALOG } from '@/lib/packages';
import { SITE_URL } from '@/lib/site';

const steps = [
  ['01', 'Elige el estilo', 'Recorre las muestras reales y cuéntanos qué sensación quieres lograr.'],
  ['02', 'Define el alcance', 'Selecciona paquete, adicionales y condiciones antes de reservar.'],
  ['03', 'Revisa el resultado', 'Recibe un enlace privado y utiliza las rondas incluidas para ajustar.'],
  ['04', 'Comparte tu invitación', 'Después de aprobar y pagar el saldo, activamos la experiencia final.'],
] as const;

export default function EventLandingPage({ slug }: { slug: CommercialEventSlug }) {
  const event = COMMERCIAL_EVENT_PAGES[slug];
  const designs = collectionCatalog().filter(design => event.designKeys.includes(design.key));
  const schema = {
    '@context': 'https://schema.org', '@type': 'Service', name: event.eyebrow,
    provider: { '@type': 'Organization', name: 'Grupo JABA', alternateName: 'Enkarta', url: SITE_URL },
    areaServed: 'Bolivia', serviceType: 'Invitación digital', url: `${SITE_URL}/${event.slug}`,
    offers: Object.values(PACKAGE_CATALOG).map(pkg => ({ '@type': 'Offer', priceCurrency: 'BOB', price: pkg.bs, name: pkg.label })),
  };

  return <main className="min-h-screen bg-[#f8f4ed] text-[#30291f]" style={{ '--event-accent': event.accent, '--event-soft': event.soft } as CSSProperties}>
    <CommercialTracker event="landing_view" eventType={event.eventType} placement={`event_landing_${event.slug}`} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    <header className="border-b border-black/[.06] bg-white/80 px-5 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" aria-label="Volver a Enkarta"><span className="font-cinzel text-xl tracking-[.12em] text-[#665a47]">ENKARTA</span><BrandByline tone="warm" className="mt-1.5" /></Link>
        <nav className="hidden items-center gap-6 font-outfit text-xs text-[#6c6254] sm:flex" aria-label="Categorías">
          {Object.values(COMMERCIAL_EVENT_PAGES).map(item => <Link key={item.slug} href={`/${item.slug}`} className={item.slug === slug ? 'font-semibold text-[var(--event-accent)]' : 'hover:text-[#30291f]'}>{item.navLabel}</Link>)}
          <Link href="/casos" className="hover:text-[#30291f]">Casos</Link>
        </nav>
        <CommercialLink eventType={event.eventType} placement="event_nav" className="rounded-full bg-[var(--event-accent)] px-4 py-2.5 font-outfit text-xs font-semibold text-white">Consultar</CommercialLink>
      </div>
    </header>

    <section className="relative overflow-hidden px-5 py-20 sm:py-28">
      <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-[var(--event-soft)] blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <p className="font-outfit text-[10px] font-semibold uppercase tracking-[.27em] text-[var(--event-accent)]">{event.eyebrow}</p>
          <h1 className="mt-5 max-w-3xl font-playfair text-5xl leading-[1.04] sm:text-7xl">{event.title}</h1>
          <p className="mt-6 max-w-2xl font-outfit text-base leading-7 text-[#716759]">{event.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CommercialLink eventType={event.eventType} placement="event_hero" className="rounded-full bg-[var(--event-accent)] px-7 py-3.5 font-outfit text-sm font-semibold text-white">Cotizar mi invitación</CommercialLink>
            <Link href="#disenos" className="rounded-full border border-[#cfc2ae] bg-white px-7 py-3.5 font-outfit text-sm font-semibold text-[#665a47]">Ver diseños</Link>
          </div>
          <p className="mt-4 font-outfit text-xs text-[#8a8073]">Reserva estándar de 200 Bs · Condiciones escritas antes de comenzar</p>
        </div>
        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-4 rotate-2 rounded-[2.5rem] bg-[var(--event-soft)]" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_80px_rgba(64,49,29,.15)]">
            <Image src={designs[0]?.image || '/catalog/solar-original.png'} alt={`Muestra de invitación para ${event.eventType}`} width={900} height={1050} className="aspect-[5/4] w-full object-cover" priority />
            <div className="flex items-center justify-between gap-4 p-5"><div><p className="font-outfit text-[9px] font-semibold uppercase tracking-[.2em] text-[var(--event-accent)]">Muestra navegable</p><p className="mt-1 font-playfair text-2xl">{designs[0]?.name}</p></div><Link href={designs[0]?.demoPath || '/muestra/marfil-vivo'} className="rounded-full border border-[#d7cab8] px-4 py-2 font-outfit text-xs font-semibold">Abrir</Link></div>
          </div>
        </div>
      </div>
    </section>

    <section className="bg-white px-5 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-5 md:grid-cols-3">{event.features.map((feature, index) => <article key={feature.title} className="rounded-[1.7rem] border border-[#e2d8ca] p-7"><span className="font-playfair text-3xl text-[var(--event-accent)]">0{index + 1}</span><h2 className="mt-5 font-playfair text-2xl">{feature.title}</h2><p className="mt-3 font-outfit text-sm leading-6 text-[#756b5e]">{feature.text}</p></article>)}</div>
        <div className="mt-10 flex flex-wrap justify-center gap-2">{event.moments.map(moment => <span key={moment} className="rounded-full bg-[var(--event-soft)] px-4 py-2 font-outfit text-xs font-medium text-[#5e5549]">{moment}</span>)}</div>
      </div>
    </section>

    <section id="disenos" className="px-5 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.25em] text-[var(--event-accent)]">Punto de partida</p><h2 className="mt-3 font-playfair text-4xl sm:text-5xl">Tres direcciones para explorar</h2></div><Link href="/casos" className="font-outfit text-sm font-semibold text-[var(--event-accent)] underline underline-offset-4">Cómo evaluamos las muestras</Link></div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">{designs.map(design => <article key={design.key} className="overflow-hidden rounded-[1.75rem] border border-[#ded2c1] bg-white shadow-[0_18px_50px_rgba(72,55,32,.08)]"><Image src={design.image} alt={`Diseño ${design.name}`} width={700} height={800} className="aspect-[4/3] w-full object-cover" /><div className="p-6"><p className="font-outfit text-[9px] font-semibold uppercase tracking-[.2em] text-[var(--event-accent)]">{design.tag}</p><h3 className="mt-2 font-playfair text-3xl">{design.name}</h3><p className="mt-2 min-h-10 font-outfit text-sm leading-5 text-[#786e61]">{design.desc}</p><div className="mt-5 flex gap-2"><Link href={design.demoPath} className="flex-1 rounded-full border border-[#d8ccba] px-4 py-2.5 text-center font-outfit text-xs font-semibold">Ver completa</Link><CommercialLink design={design.name} eventType={event.eventType} placement="event_design" className="flex-1 rounded-full bg-[var(--event-accent)] px-4 py-2.5 text-center font-outfit text-xs font-semibold text-white">Elegir</CommercialLink></div></div></article>)}</div>
      </div>
    </section>

    <section className="bg-[#29251f] px-5 py-20 text-white">
      <div className="mx-auto max-w-6xl"><div className="max-w-2xl"><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.25em] text-[#d0b77e]">Proceso claro</p><h2 className="mt-3 font-playfair text-4xl sm:text-5xl">Del estilo elegido al enlace final</h2></div><div className="mt-10 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 md:grid-cols-4">{steps.map(step => <article key={step[0]} className="bg-[#29251f] p-6"><span className="font-playfair text-3xl text-[#d0b77e]">{step[0]}</span><h3 className="mt-5 font-playfair text-xl">{step[1]}</h3><p className="mt-3 font-outfit text-sm leading-6 text-white/55">{step[2]}</p></article>)}</div><div className="mt-10 text-center"><Link href="/proceso" className="font-outfit text-sm font-semibold text-[#d0b77e] underline underline-offset-4">Ver proceso, plazos y cambios incluidos</Link></div></div>
    </section>

    <section className="px-5 py-20 text-center"><div className="mx-auto max-w-3xl rounded-[2rem] bg-[var(--event-soft)] px-6 py-12 sm:px-12"><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.22em] text-[var(--event-accent)]">Desde 750 Bs</p><h2 className="mt-3 font-playfair text-4xl">Hagamos que tu {event.eventType.toLowerCase()} tenga una entrada memorable</h2><p className="mx-auto mt-4 max-w-xl font-outfit text-sm leading-6 text-[#6f6558]">Cuéntanos la fecha y el diseño que te interesa. El mensaje conservará esta categoría para atenderte con una propuesta relevante.</p><CommercialLink eventType={event.eventType} placement="event_final" className="mt-7 inline-flex rounded-full bg-[var(--event-accent)] px-7 py-3.5 font-outfit text-sm font-semibold text-white">Hablar con Enkarta</CommercialLink></div></section>
  </main>;
}
