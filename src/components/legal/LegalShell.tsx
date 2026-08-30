import Link from 'next/link';
import BrandByline from '@/components/brand/BrandByline';
import { BRAND_NAME, BUSINESS_WHATSAPP_URL, LEGAL_EFFECTIVE_DATE, LEGAL_LINKS, LEGAL_PROVIDER, LEGAL_VERSION } from '@/lib/brand';

export function LegalSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-28 border-t border-[#d8cdbb]/70 pt-8 first:border-0 first:pt-0">
    <h2 className="font-playfair text-2xl text-[#30291f] sm:text-3xl">{title}</h2>
    <div className="mt-4 space-y-4 font-outfit text-[15px] leading-7 text-[#5c5348]">{children}</div>
  </section>;
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2 pl-5 marker:text-[#b8975a]">{children}</ul>;
}

export default function LegalShell({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#f7f3ec] text-[#30291f]">
    <header className="border-b border-[#d8cdbb]/70 bg-[#fbf9f5]/95 px-5 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="leading-none" aria-label="Volver a Enkarta">
          <span className="font-cinzel text-xl tracking-[.12em] text-[#6e6048]">ENKARTA</span>
          <BrandByline tone="warm" className="mt-1.5" />
        </Link>
        <Link href="/" className="rounded-full border border-[#cbbb9f] px-4 py-2 font-outfit text-xs font-semibold text-[#6e6048]">Volver al inicio</Link>
      </div>
    </header>

    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-16">
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <p className="font-outfit text-[10px] font-semibold uppercase tracking-[.22em] text-[#a68a58]">Documentos</p>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:flex-col" aria-label="Documentos legales">
          {LEGAL_LINKS.map(item => <Link key={item.href} href={item.href} className="shrink-0 rounded-xl border border-[#ddd3c3] bg-white px-3 py-2.5 font-outfit text-xs text-[#665c4f] transition hover:border-[#b8975a] hover:text-[#806b43]">{item.label}</Link>)}
        </nav>
        <div className="mt-6 hidden rounded-2xl bg-[#eee6da] p-4 font-outfit text-[11px] leading-5 text-[#746959] lg:block">
          <strong className="block text-[#4f4639]">Identidad del proveedor</strong>
          {BRAND_NAME} es una marca comercial operada por {LEGAL_PROVIDER}, empresa boliviana.
        </div>
      </aside>

      <article className="min-w-0 rounded-[2rem] border border-[#ded4c5] bg-white px-6 py-9 shadow-[0_20px_70px_rgba(87,72,47,.08)] sm:px-10 sm:py-12">
        <p className="font-outfit text-[10px] font-semibold uppercase tracking-[.24em] text-[#a68a58]">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl font-playfair text-4xl leading-tight text-[#272119] sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl font-outfit text-base leading-7 text-[#706658]">{summary}</p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 font-outfit text-[11px] text-[#998b78]"><span>Versión {LEGAL_VERSION}</span><span>Vigente desde {LEGAL_EFFECTIVE_DATE}</span></div>
        <div className="mt-10 space-y-10">{children}</div>
        <div className="mt-12 rounded-2xl border border-[#ddceb5] bg-[#fbf7ef] p-5 font-outfit text-sm leading-6 text-[#685d4e]">
          ¿Necesitas ejercer un derecho, presentar un reclamo o pedir una aclaración? <a href={BUSINESS_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#8b7348] underline underline-offset-4">Contacta a Enkarta</a> e identifica la invitación o pedido relacionado.
        </div>
      </article>
    </div>
  </main>;
}
