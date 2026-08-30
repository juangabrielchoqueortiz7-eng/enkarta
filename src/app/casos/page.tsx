import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import BrandByline from '@/components/brand/BrandByline';
import CommercialLink from '@/components/commercial/CommercialLink';
import CommercialTracker from '@/components/commercial/CommercialTracker';
import { COMMERCIAL_PROOFS } from '@/lib/commercial-proof';

export const metadata: Metadata = {
  title: 'Casos y demostraciones',
  description: 'Explora invitaciones Enkarta navegables, qué problema resuelve cada diseño y la garantía comercial aplicable.',
  alternates: { canonical: '/casos' },
};

const guarantees = [
  { title: 'Alcance escrito', text: 'Antes de reservar recibes paquete, precio, adicionales, plazo y rondas. Nada se considera incluido únicamente por una conversación informal.' },
  { title: 'Entrega inicial protegida', text: 'Si Enkarta incumple el plazo de primera propuesta por una causa propia, puedes aceptar un nuevo plazo o cancelar y solicitar la devolución de lo pagado por la invitación.' },
  { title: 'Errores sin consumir rondas', text: 'Corregir un defecto atribuible a Enkarta no descuenta las rondas de cambios incluidas en tu paquete.' },
] as const;

export default function CasesPage() {
  return <main className="min-h-screen bg-[#f7f2ea] text-[#30291f]">
    <CommercialTracker event="landing_view" placement="cases_page" />
    <header className="border-b border-[#ded3c2] bg-[#fbf9f5]/90 px-5 py-4 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/" aria-label="Volver a Enkarta"><span className="font-cinzel text-xl tracking-[.12em] text-[#665a47]">ENKARTA</span><BrandByline tone="warm" className="mt-1.5" /></Link><Link href="/proceso" className="rounded-full border border-[#cbbb9f] px-4 py-2 font-outfit text-xs font-semibold text-[#6e6048]">Cómo funciona</Link></div></header>

    <section className="px-5 pb-16 pt-20 text-center sm:pb-20 sm:pt-24"><div className="mx-auto max-w-4xl"><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.28em] text-[#a48754]">Evidencia antes que promesas</p><h1 className="mt-5 font-playfair text-5xl leading-[1.05] sm:text-7xl">Casos y demostraciones que puedes comprobar</h1><p className="mx-auto mt-6 max-w-2xl font-outfit text-base leading-7 text-[#716657]">Cada ejemplo abre la invitación navegable. No publicamos opiniones ni nombres como clientes reales sin una autorización verificable.</p></div></section>

    <section className="mx-auto max-w-6xl px-5 pb-20"><div className="rounded-3xl border border-[#dacaa9] bg-[#efe4cf] px-6 py-5 font-outfit text-sm leading-6 text-[#675a46]"><strong className="text-[#43392c]">Transparencia:</strong> las piezas que siguen son demostraciones producidas por Enkarta, no testimonios de clientes. Cuando publiquemos un caso real, estará identificado como “Cliente verificado” y contará con autorización registrada.</div><div className="mt-8 grid gap-6 lg:grid-cols-3">{COMMERCIAL_PROOFS.map(proof => <article key={proof.id} className="overflow-hidden rounded-[1.75rem] border border-[#ded2c1] bg-white shadow-[0_18px_50px_rgba(72,55,32,.07)]"><Image src={proof.image} alt={`Demostración ${proof.design}`} width={750} height={850} className="aspect-[4/3] w-full object-cover" /><div className="p-6"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eee4d3] px-3 py-1 font-outfit text-[9px] font-bold uppercase tracking-[.16em] text-[#806c48]">Demostración Enkarta</span><span className="font-outfit text-xs text-[#918574]">{proof.event}</span></div><h2 className="mt-4 font-playfair text-3xl leading-tight">{proof.title}</h2><p className="mt-4 font-outfit text-xs font-semibold uppercase tracking-[.15em] text-[#a48754]">Necesidad</p><p className="mt-2 font-outfit text-sm leading-6 text-[#746a5d]">{proof.summary}</p><p className="mt-4 font-outfit text-xs font-semibold uppercase tracking-[.15em] text-[#a48754]">Qué demuestra</p><p className="mt-2 font-outfit text-sm leading-6 text-[#746a5d]">{proof.result}</p><Link href={proof.path} className="mt-6 block rounded-full bg-[#746243] px-5 py-3 text-center font-outfit text-xs font-semibold text-white">Abrir {proof.design}</Link></div></article>)}</div></section>

    <section className="bg-[#28241e] px-5 py-20 text-white"><div className="mx-auto max-w-6xl"><div className="max-w-3xl"><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.25em] text-[#d5ba7c]">Garantía comercial Enkarta</p><h2 className="mt-3 font-playfair text-4xl sm:text-5xl">Compromisos concretos, con límites claros</h2><p className="mt-5 font-outfit text-sm leading-6 text-white/60">La garantía aplica cuando la reserva y todos los materiales requeridos fueron recibidos, y el retraso no proviene de cambios, respuestas pendientes o servicios externos.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{guarantees.map((guarantee, index) => <article key={guarantee.title} className="rounded-[1.7rem] border border-white/10 bg-white/[.055] p-7"><span className="font-playfair text-3xl text-[#d5ba7c]">0{index + 1}</span><h3 className="mt-5 font-playfair text-2xl">{guarantee.title}</h3><p className="mt-3 font-outfit text-sm leading-6 text-white/60">{guarantee.text}</p></article>)}</div><p className="mt-8 font-outfit text-xs leading-5 text-white/45">Esta garantía complementa los <Link href="/legal/terminos" className="text-[#d5ba7c] underline">términos del servicio</Link> y la <Link href="/legal/pagos" className="text-[#d5ba7c] underline">política de pagos y devoluciones</Link>; no limita los derechos obligatorios del consumidor.</p></div></section>

    <section className="px-5 py-20 text-center"><div className="mx-auto max-w-3xl rounded-[2rem] bg-[#eadfce] px-6 py-12"><h2 className="font-playfair text-4xl">¿Quieres comprobar un diseño antes de reservar?</h2><p className="mx-auto mt-4 max-w-xl font-outfit text-sm leading-6 text-[#6f6354]">Indícanos el tipo de evento y la colección que viste. Te explicaremos qué puede personalizarse en cada paquete.</p><CommercialLink placement="cases_final" className="mt-7 inline-flex rounded-full bg-[#806b48] px-7 py-3.5 font-outfit text-sm font-semibold text-white">Hablar con Enkarta</CommercialLink></div></section>
  </main>;
}
