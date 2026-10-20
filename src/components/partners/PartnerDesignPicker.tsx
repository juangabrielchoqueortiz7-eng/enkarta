'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collectionCatalog } from '@/lib/collection-catalog';
import type { StarterDesignKey } from '@/lib/enkarta-collections';
import { PARTNER_PLANS, draftCap, type PartnerPlanKey } from '@/lib/partner-plans';
import { isUuid } from '@/lib/rsvp-contract';
import { PARTNER_REQUEST_TIMEOUT_MS, partnerRequest } from '@/lib/partner-checkout';

const DESIGNS = collectionCatalog();
const REJECTION_MESSAGE = 'No se pudo crear el borrador. Revisa la selección antes de intentarlo de nuevo.';
const UNCERTAIN_MESSAGE = 'No pudimos comprobar si se creó el borrador. Revisa «Mis invitaciones» antes de intentar crear otro.';
interface CreationAttempt {
  template: StarterDesignKey;
  phase: 'pending' | 'opening' | 'uncertain';
  controller: AbortController;
  startedAt: number;
  rejection?: { message: string };
}

/**
 * Catálogo de arranque para el socio. No pide paquete: el nivel de servicios
 * de lo que publique sale de su plan, así que aquí solo elige el diseño.
 */
export default function PartnerDesignPicker({ plan, canPublish, selectedDesign, totalInvitations }: { plan: PartnerPlanKey; canPublish: boolean; selectedDesign?: StarterDesignKey; totalInvitations: number }) {
  const router = useRouter();
  const [creation, setCreation] = useState<{ template: StarterDesignKey; phase: 'pending' | 'opening' | 'uncertain'; id?: string } | null>(null);
  const [error, setError] = useState('');
  const operation = useRef<CreationAttempt | null>(null), mounted = useRef(true);
  const capacity = useRef({ plan, totalInvitations });
  capacity.current = { plan, totalInvitations };
  useEffect(() => {
    mounted.current = true;
    // React 18 may replay effects without rendering again. An interrupted POST
    // cannot resume or be assumed rolled back when that setup runs again.
    const pending = operation.current;
    if (pending?.phase === 'pending' && pending.controller.signal.aborted) {
      if (pending.rejection) {
        operation.current = null; setCreation(null); setError(pending.rejection.message);
      } else {
        pending.phase = 'uncertain'; setCreation({ template: pending.template, phase: 'uncertain' }); setError(UNCERTAIN_MESSAGE);
      }
    }
    return () => { mounted.current = false; operation.current?.controller.abort(); };
  }, []);
  const chosen = DESIGNS.find(design => design.key === selectedDesign);
  const designs = chosen ? [chosen, ...DESIGNS.filter(design => design.key !== chosen.key)] : DESIGNS;
  const atCapacity = totalInvitations >= draftCap(plan);

  const createFrom = async (template: StarterDesignKey) => {
    if (!mounted.current || operation.current || capacity.current.totalInvitations >= draftCap(capacity.current.plan)) return;
    const attempt: CreationAttempt = { template, phase: 'pending', controller: new AbortController(), startedAt: Date.now() };
    operation.current = attempt;
    const current = () => mounted.current && operation.current === attempt && !attempt.controller.signal.aborted;
    setCreation({ template, phase: 'pending' });
    setError('');
    try {
      const result = await partnerRequest<{ id: string }>('/api/partner/invitations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }), signal: attempt.controller.signal,
      }, async (url, options) => {
        const response = await fetch(url, options);
        if (!options?.signal?.aborted && current() && Date.now() - attempt.startedAt < PARTNER_REQUEST_TIMEOUT_MS
          && !response.ok && response.status >= 400 && response.status < 500) {
          // A received 4xx is definitive in this route, even if its explanatory
          // body is unreadable. Its JSON still shares the original deadline.
          attempt.rejection = { message: REJECTION_MESSAGE };
          const body = await response.json().catch(() => null);
          if (!options?.signal?.aborted && current() && Date.now() - attempt.startedAt < PARTNER_REQUEST_TIMEOUT_MS
            && typeof body?.error === 'string') attempt.rejection.message = body.error;
          return Response.json(body ?? null, { status: response.status });
        }
        return response;
      });
      if (!current()) return;
      if (!isUuid(result?.id)) throw new Error('Unverified invitation');
      attempt.phase = 'opening';
      setCreation({ template, phase: 'opening', id: result.id });
      try { router.push(`/socios/constructor/${result.id}`); }
      catch { setError('El borrador se creó, pero no pudimos abrir el constructor. Usa «Abrir el borrador» para continuar.'); }
    } catch (failure) {
      if (!current()) return;
      if (attempt.rejection) {
        operation.current = null; setCreation(null); setError(attempt.rejection.message);
        return;
      }
      attempt.phase = 'uncertain';
      setCreation({ template, phase: 'uncertain' });
      setError(failure instanceof Error && failure.message.includes('25 segundos')
        ? 'No pudimos comprobar si se creó el borrador en 25 segundos. Revisa «Mis invitaciones» antes de intentar crear otro.'
        : UNCERTAIN_MESSAGE);
    } finally {
      attempt.controller.abort();
    }
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#FAF7F2] text-[#2C2519] selection:bg-[#D4C5B9]/50 selection:text-[#2C2519]">
      <a href="#partner-design-main" className="sr-only rounded-lg bg-[#2C2519] font-outfit text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[400] focus:min-h-11 focus:px-4 focus:py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735]">Ir a los diseños</a>
      <header className="sticky top-0 z-30 border-b border-[#2C2519]/10 bg-[#FAF7F2]">
        <div className="mx-auto flex min-h-20 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 sm:px-8">
          <a href="/socios/panel" className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 font-outfit text-sm text-[#514735] underline-offset-4 transition-colors hover:bg-[#F3EFE8] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735]">← Volver al panel</a>
          <div className="min-w-0 text-right">
            <p className="font-cinzel text-sm tracking-[0.18em]">ENKARTA</p>
            <p className="mt-1 font-outfit text-sm text-[#655B4A]">Nueva invitación</p>
          </div>
        </div>
      </header>

      <main id="partner-design-main" tabIndex={-1} className="mx-auto min-w-0 max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-outfit text-2xl font-semibold leading-tight sm:text-[28px]">Elige el diseño de tu cliente</h1>
          <p className="mt-3 font-outfit text-sm leading-relaxed text-[#655B4A]">
            Todos los diseños están incluidos en tu plan {PARTNER_PLANS[plan].label}. Personalízalo
            con sus datos y sus fotos.
          </p>
          {!canPublish && (
            <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-outfit text-sm leading-relaxed text-amber-950">
              Puedes crear borradores sin pagar. Para publicar necesitas una suscripción activa.
            </p>
          )}
          <p className="mt-4 font-outfit text-sm leading-relaxed text-[#625946]">{totalInvitations} de {draftCap(plan)} invitaciones creadas, incluidos borradores.{atCapacity && ' Llegaste al límite de este plan. Revisa tus invitaciones antes de crear otra.'}</p>
          {chosen && <p role="status" className="mt-4 font-outfit text-sm leading-relaxed text-[#514735]">Conservamos tu elección: <strong>{chosen.name}</strong>. Aparece primero; revisa la muestra y pulsa «Crear borrador».</p>}
          {error && <div role="alert" className="mt-5 break-words rounded-xl border border-red-200 bg-red-50 p-4 font-outfit text-sm leading-relaxed text-red-800">
            <p>{error}</p>
            {creation?.phase === 'uncertain' && <a href="/socios/panel" className="mt-3 inline-flex min-h-11 items-center rounded-lg px-2 font-outfit text-sm text-[#514735] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735]">Revisar mis invitaciones</a>}
            {creation?.id && <a href={`/socios/constructor/${creation.id}`} className="mt-3 inline-flex min-h-11 items-center rounded-lg px-2 font-outfit text-sm text-[#514735] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735]">Abrir el borrador</a>}
          </div>}
          <div role="status" aria-live="polite" aria-atomic="true" className="font-outfit text-sm leading-relaxed text-[#514735]">
            {creation?.phase === 'pending' && <p className="mt-4">Creando el borrador… Espera la respuesta antes de intentar crear otro.</p>}
            {creation?.phase === 'opening' && !error && <p className="mt-4">Borrador creado. Abriendo el constructor…</p>}
            {creation?.phase === 'uncertain' && <p className="mt-4 font-medium">Creación sin confirmar.</p>}
          </div>
        </div>

        <section aria-label="Diseños disponibles" aria-busy={creation?.phase === 'pending' || undefined} className="mt-8 grid min-w-0 gap-6 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map(design => (
            <article key={design.key} aria-labelledby={`starter-design-${design.key}`} className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white ${chosen?.key === design.key ? 'border-[#8A7040]' : 'border-[#2C2519]/12'}`}>
              <div className="aspect-[4/5] overflow-hidden bg-[#F3EFE8]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={design.image} alt={design.name} width={400} height={500} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id={`starter-design-${design.key}`} className="break-words font-outfit text-lg font-semibold leading-snug [overflow-wrap:anywhere]">{design.name}</h2>
                  {chosen?.key === design.key && <span className="rounded-full bg-[#F3EFE8] px-2.5 py-1 font-outfit text-sm text-[#514735]">Tu elección</span>}
                </div>
                <p className="mt-2 font-outfit text-sm leading-relaxed text-[#655B4A]">{design.desc}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                  <button
                    type="button"
                    onClick={() => createFrom(design.key)}
                    disabled={!!creation || atCapacity}
                    aria-busy={creation?.template === design.key && creation.phase === 'pending' ? true : undefined}
                    aria-label={`${creation?.template === design.key ? { pending: 'Creando…', opening: 'Abriendo…', uncertain: 'Sin confirmar' }[creation.phase] : 'Crear borrador'}: ${design.name}`}
                    className="min-h-11 rounded-full bg-[#2C2519] px-5 py-2.5 font-outfit text-sm font-medium text-[#FAF7F2] transition-colors hover:bg-[#3d342a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creation?.template === design.key ? { pending: 'Creando…', opening: 'Abriendo…', uncertain: 'Sin confirmar' }[creation.phase] : 'Crear borrador'}
                  </button>
                  <a href={design.demoPath} target="_blank" rel="noreferrer" aria-label={`Ver muestra de ${design.name} en una pestaña nueva`} className="inline-flex min-h-11 items-center rounded-lg px-2 font-outfit text-sm text-[#514735] underline underline-offset-4 transition-colors hover:bg-[#F3EFE8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514735]">
                    Ver muestra
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
