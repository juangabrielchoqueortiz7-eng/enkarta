import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import GoogleSignIn from '@/components/partners/GoogleSignIn';
import { getPartnerContext } from '@/lib/partner-session';
import {
  BILLING_CYCLES, cyclePrice, formatBs, PARTNER_PLANS, PARTNER_PLAN_ORDER,
} from '@/lib/partner-plans';
import { collectionCatalog } from '@/lib/collection-catalog';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Programa de socios',
  description: 'Vende invitaciones digitales premium con tu propia marca y tu propio precio. Paga una mensualidad y usa el sistema completo de Enkarta.',
};

const ERRORS: Record<string, string> = {
  oauth: 'No pudimos confirmar tu cuenta de Google. Intenta otra vez.',
  cancelado: 'Cancelaste el acceso con Google.',
  cuenta: 'No pudimos preparar tu cuenta. Escríbenos y lo resolvemos.',
  migracion: 'El programa de socios todavía no está habilitado en esta instalación (falta la migración 013).',
  suspendido: 'Tu cuenta está suspendida. Escríbenos para reactivarla.',
};

const STEPS = [
  { title: 'Entras con Google', text: 'Sin formularios ni contraseñas nuevas. Tu cuenta queda lista en un clic.' },
  { title: 'Diseñas gratis', text: 'Arma la invitación completa con el constructor y muéstrasela a tu cliente antes de pagar nada.' },
  { title: 'Pagas tu mes', text: 'Transferencia o QR, subes el comprobante y activamos tu suscripción.' },
  { title: 'Publicas y cobras', text: 'Compartes el enlace con tu cliente al precio que tú definas. La diferencia es tuya.' },
];

export default async function PartnersLandingPage({ searchParams }: {
  searchParams: Promise<{ error?: string; next?: string; estado?: string }>;
}) {
  const { error, next, estado } = await searchParams;
  const context = await getPartnerContext().catch(() => null);
  if (context && context.partner.status === 'active') redirect('/socios/panel');

  const message = ERRORS[estado ?? ''] ?? ERRORS[error ?? ''] ?? '';
  const designs = collectionCatalog().slice(0, 6);
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/socios/panel';

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C2519]">
      <header className="border-b border-[#2C2519]/8">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="font-cinzel text-sm tracking-[0.18em]">ENKARTA</Link>
          <nav className="flex items-center gap-4 sm:gap-6" aria-label="Secciones">
            <Link href="/catalogo" className="font-outfit text-[11px] text-[#2C2519]/55 transition-colors hover:text-[#2C2519]">Catálogo</Link>
            <span className="font-outfit text-[10px] uppercase tracking-[0.3em] text-[#B8975A]">Programa de socios</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        {/* ── Propuesta ── */}
        <section className="grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <p className="font-outfit text-[11px] uppercase tracking-[0.3em] text-[#B8975A]">Revende con tu marca</p>
            <h1 className="mt-4 font-playfair text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.08]">
              Vende invitaciones digitales premium sin diseñarlas desde cero
            </h1>
            <p className="mt-6 max-w-xl font-outfit text-[15px] leading-relaxed text-[#2C2519]/70">
              Pagas una mensualidad por usar el sistema de Enkarta y vendes nuestras invitaciones a
              tus clientes al precio que tú decidas. Nosotros ponemos los diseños, el constructor y
              la infraestructura; tú pones tu marca, tu cartera y tu margen.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <GoogleSignIn next={target} label="Crear mi cuenta con Google" />
              <a href="#planes" className="font-outfit text-[13px] text-[#2C2519]/60 underline-offset-4 hover:underline">
                Ver planes y precios
              </a>
            </div>
            {message && (
              <p className="mt-5 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 font-outfit text-[12.5px] text-amber-900">
                {message}
              </p>
            )}
            <p className="mt-5 font-outfit text-[12px] text-[#2C2519]/50">
              Crear la cuenta y diseñar es gratis. Solo pagas cuando quieras publicar.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {designs.map(design => (
              <div key={design.key} className="aspect-[3/4] overflow-hidden rounded-2xl border border-[#2C2519]/8 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={design.image} alt={design.name} className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </section>

        {/* ── Cómo funciona ── */}
        <section className="border-t border-[#2C2519]/8 py-16">
          <h2 className="font-playfair text-[26px]">Cómo funciona</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-[#2C2519]/8 bg-white p-6">
                <span className="font-cinzel text-[13px] text-[#B8975A]">0{index + 1}</span>
                <p className="mt-3 font-playfair text-[17px]">{step.title}</p>
                <p className="mt-2 font-outfit text-[13px] leading-relaxed text-[#2C2519]/65">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Planes ── */}
        <section id="planes" className="scroll-mt-20 border-t border-[#2C2519]/8 py-16">
          <div className="max-w-2xl">
            <h2 className="font-playfair text-[26px]">Planes mensuales</h2>
            <p className="mt-3 font-outfit text-[14px] leading-relaxed text-[#2C2519]/65">
              Esto es lo que pagas por usar la plataforma. Lo que tú le cobras a tu cliente por cada
              invitación lo decides tú: es tu negocio, tu precio y tu margen.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PARTNER_PLAN_ORDER.map(key => {
              const plan = PARTNER_PLANS[key];
              const featured = key === 'estudio';
              return (
                <div
                  key={key}
                  className={`flex flex-col rounded-3xl border p-7 ${featured ? 'border-[#B8975A]/50 bg-white shadow-[0_24px_60px_-40px_rgba(44,37,25,0.55)]' : 'border-[#2C2519]/8 bg-white/60'}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-playfair text-[22px]">{plan.label}</p>
                    <span className="rounded-full bg-[#B8975A]/10 px-3 py-1 font-outfit text-[10px] uppercase tracking-[0.18em] text-[#8a7040]">{plan.tag}</span>
                  </div>
                  <p className="mt-2 font-outfit text-[13px] text-[#2C2519]/60">{plan.summary}</p>
                  <p className="mt-6 font-playfair text-[34px] leading-none">
                    {formatBs(plan.bs)}
                    <span className="ml-1 font-outfit text-[13px] text-[#2C2519]/50">/ mes</span>
                  </p>
                  <ul className="mt-6 space-y-2.5 border-t border-[#2C2519]/8 pt-6">
                    {plan.highlights.map(item => (
                      <li key={item} className="flex gap-2.5 font-outfit text-[13px] leading-relaxed text-[#2C2519]/75">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#B8975A]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-7 pt-1">
                    <GoogleSignIn next={target} label={`Empezar con ${plan.label}`} />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-8 font-outfit text-[12.5px] text-[#2C2519]/55">
            Pagando por adelantado:{' '}
            {BILLING_CYCLES.filter(cycle => cycle.discount > 0).map(cycle => (
              `${cycle.label} −${Math.round(cycle.discount * 100)}%`
            )).join(' · ')}
            . Ejemplo: {PARTNER_PLANS.estudio.label} por 12 meses queda en {formatBs(cyclePrice('estudio', 12))}.
          </p>
        </section>

        {/* ── Cierre ── */}
        <section className="rounded-3xl border border-[#2C2519]/8 bg-white p-10 text-center">
          <h2 className="font-playfair text-[24px]">Prueba el constructor antes de pagar</h2>
          <p className="mx-auto mt-3 max-w-xl font-outfit text-[14px] leading-relaxed text-[#2C2519]/65">
            Crea tu cuenta, arma una invitación completa y muéstrasela a tu cliente. Solo necesitas
            la suscripción activa cuando quieras publicarla y compartir el enlace.
          </p>
          <div className="mt-7 flex justify-center">
            <GoogleSignIn next={target} label="Continuar con Google" />
          </div>
        </section>
      </main>
    </div>
  );
}
