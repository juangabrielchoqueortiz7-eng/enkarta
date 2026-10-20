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
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C2519]">
      <header className="sticky top-0 z-30 border-b border-[#2C2519]/8 bg-[#FAF7F2]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a href="/socios/panel" className="font-outfit text-[13px] text-[#2C2519]/60 transition hover:text-[#2C2519]">← Volver al panel</a>
          <div className="text-center">
            <p className="font-cinzel text-[13px] tracking-[0.18em]">ENKARTA</p>
            <p className="font-outfit text-[9px] uppercase tracking-[0.28em] text-[#B8975A]">Nueva invitación</p>
          </div>
          <span className="w-[110px]" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-playfair text-[30px] leading-tight">Elige el diseño de tu cliente</h1>
          <p className="mt-3 font-outfit text-[14px] leading-relaxed text-[#2C2519]/65">
            Todos los diseños están incluidos en tu plan {PARTNER_PLANS[plan].label}. Personalízalo
            con sus datos, sus fotos y sus colores.
          </p>
          {!canPublish && (
            <p className="mt-5 inline-block rounded-full border border-amber-300/70 bg-amber-50 px-5 py-2 font-outfit text-[12.5px] text-amber-900">
              Puedes crear borradores sin pagar. Para publicar necesitas una suscripción activa.
            </p>
          )}
          <p className="mt-4 font-outfit text-sm text-[#625946]">{totalInvitations} de {draftCap(plan)} invitaciones creadas, incluidos borradores.{atCapacity && ' Llegaste al límite de este plan. Revisa tus invitaciones antes de crear otra.'}</p>
          {chosen && <p role="status" className="mt-4 font-outfit text-sm text-[#514735]">Conservamos tu elección: <strong>{chosen.name}</strong>. Aparece primero; revisa la muestra y pulsa «Crear borrador».</p>}
          {error && <div role="alert" className="mt-5 font-outfit text-[13px] text-red-600">
            <p>{error}</p>
            {creation?.phase === 'uncertain' && <a href="/socios/panel" className="mt-3 inline-flex min-h-11 items-center font-outfit text-sm text-[#514735] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Revisar mis invitaciones</a>}
            {creation?.id && <a href={`/socios/constructor/${creation.id}`} className="mt-3 inline-flex min-h-11 items-center font-outfit text-sm text-[#514735] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Abrir el borrador</a>}
          </div>}
          {creation?.phase === 'opening' && !error && <p role="status" className="mt-4 font-outfit text-sm text-[#514735]">Borrador creado. Abriendo el constructor…</p>}
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map(design => (
            <article key={design.key} className="group overflow-hidden rounded-3xl border border-[#2C2519]/8 bg-white transition hover:shadow-[0_28px_60px_-40px_rgba(44,37,25,0.6)]">
              <div className="aspect-[4/5] overflow-hidden bg-[#F3EFE8]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={design.image} alt={design.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" loading="lazy" />
              </div>
              <div className="p-5">
                <p className="font-playfair text-[19px]">{design.name}</p>
                <p className="mt-1.5 line-clamp-2 font-outfit text-[12.5px] leading-relaxed text-[#2C2519]/60">{design.desc}</p>
                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => createFrom(design.key)}
                    disabled={!!creation || atCapacity}
                    aria-busy={creation?.template === design.key && creation.phase === 'pending' ? true : undefined}
                    className="rounded-full bg-[#2C2519] px-5 py-2 font-outfit text-[12.5px] text-[#FAF7F2] transition hover:bg-[#3d342a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C2519] disabled:opacity-50"
                  >
                    {creation?.template === design.key ? { pending: 'Creando…', opening: 'Abriendo…', uncertain: 'Sin confirmar' }[creation.phase] : 'Crear borrador'}
                  </button>
                  <a href={design.demoPath} target="_blank" rel="noreferrer" className="font-outfit text-[12.5px] text-[#2C2519]/55 underline-offset-4 hover:underline">
                    Ver muestra
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
