import type { Metadata } from 'next';
import Link from 'next/link';
import BrandByline from '@/components/brand/BrandByline';
import CommercialLink from '@/components/commercial/CommercialLink';
import CommercialTracker from '@/components/commercial/CommercialTracker';
import { COMMERCIAL_PACKAGES, type CommercialPackage } from '@/lib/commercial';
import { PACKAGE_CATALOG } from '@/lib/packages';

export const metadata: Metadata = {
  title: 'Tu consulta está preparada',
  description: 'Siguiente paso para conversar con Enkarta por WhatsApp.',
  robots: { index: false, follow: false },
};

const clean = (value: string | string[] | undefined, max = 80) => String(Array.isArray(value) ? value[0] : value || '').trim().slice(0, max);
const safeReturn = (value: string) => value.startsWith('/') && !value.startsWith('//') ? value : '/';

export default function ContactPreparedPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const packageRaw = clean(searchParams.package, 20).toLowerCase() as CommercialPackage;
  const packageKey = COMMERCIAL_PACKAGES.includes(packageRaw) ? packageRaw : 'general';
  const design = clean(searchParams.design);
  const eventType = clean(searchParams.event_type, 50);
  const from = safeReturn(clean(searchParams.from, 160));
  const packageLabel = packageKey === 'general' ? '' : PACKAGE_CATALOG[packageKey].label;
  return <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] px-5 py-14 text-[#30291f]">
    <CommercialTracker event="process_view" design={design} eventType={eventType} placement="contact_prepared" />
    <section className="w-full max-w-2xl rounded-[2.25rem] border border-[#ded2c1] bg-white px-6 py-10 text-center shadow-[0_30px_90px_rgba(71,53,29,.12)] sm:px-12 sm:py-14">
      <Link href="/" aria-label="Ir a Enkarta" className="inline-block"><span className="font-cinzel text-xl tracking-[.12em] text-[#6e6048]">ENKARTA</span><BrandByline tone="warm" className="mt-1.5" /></Link>
      <div className="mx-auto mt-9 flex h-16 w-16 items-center justify-center rounded-full bg-[#e9f3e9] text-[#557653]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75 9 17.25 19.5 6.75" /></svg></div>
      <p className="mt-7 font-outfit text-[10px] font-semibold uppercase tracking-[.25em] text-[#a48754]">Consulta preparada</p>
      <h1 className="mt-3 font-playfair text-4xl sm:text-5xl">Completa el último paso en WhatsApp</h1>
      <p className="mx-auto mt-5 max-w-xl font-outfit text-sm leading-6 text-[#716657]">Abrimos una conversación con el contexto de tu consulta{packageLabel ? `, el paquete ${packageLabel}` : ''}{design ? ` y el diseño ${design}` : ''}. <strong className="text-[#453b2e]">Todavía debes presionar “Enviar” en WhatsApp</strong>; abrir la ventana no significa que el mensaje haya sido enviado.</p>
      <div className="mx-auto mt-7 max-w-md rounded-2xl bg-[#f5f0e8] p-5 text-left font-outfit text-sm text-[#675d50]"><p className="font-semibold text-[#40372b]">¿Qué ocurre después?</p><ol className="mt-3 space-y-2 text-xs leading-5"><li>1. Revisamos disponibilidad y el alcance que necesitas.</li><li>2. Recibes precio, plazo, rondas y condiciones por escrito.</li><li>3. Si estás de acuerdo, reservas con 200 Bs.</li></ol></div>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><CommercialLink packageKey={packageKey} design={design} eventType={eventType} placement="contact_retry" className="rounded-full bg-[#806b48] px-7 py-3.5 font-outfit text-sm font-semibold text-white">Volver a abrir WhatsApp</CommercialLink><Link href={from} className="rounded-full border border-[#d2c4af] px-7 py-3.5 font-outfit text-sm font-semibold text-[#6e6048]">Volver a la página</Link></div>
      <p className="mt-7 font-outfit text-[10px] leading-4 text-[#9a9083]">Enkarta by Grupo JABA · No registramos el contenido de tus conversaciones.</p>
    </section>
  </main>;
}
