'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collectionCatalog } from '@/lib/collection-catalog';
import type { StarterDesignKey } from '@/lib/enkarta-collections';
import { PARTNER_PLANS, draftCap, type PartnerPlanKey } from '@/lib/partner-plans';

const DESIGNS = collectionCatalog();

/**
 * Catálogo de arranque para el socio. No pide paquete: el nivel de servicios
 * de lo que publique sale de su plan, así que aquí solo elige el diseño.
 */
export default function PartnerDesignPicker({ plan, canPublish, selectedDesign, totalInvitations }: { plan: PartnerPlanKey; canPublish: boolean; selectedDesign?: StarterDesignKey; totalInvitations: number }) {
  const router = useRouter();
  const [creating, setCreating] = useState<StarterDesignKey | null>(null);
  const [error, setError] = useState('');
  const chosen = DESIGNS.find(design => design.key === selectedDesign);
  const designs = chosen ? [chosen, ...DESIGNS.filter(design => design.key !== chosen.key)] : DESIGNS;
  const atCapacity = totalInvitations >= draftCap(plan);

  const createFrom = async (template: StarterDesignKey) => {
    if (creating || atCapacity) return;
    setCreating(template);
    setError('');
    try {
      const res = await fetch('/api/partner/invitations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'No se pudo crear la invitación');
      router.push(`/socios/constructor/${result.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la invitación');
      setCreating(null);
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
          {error && <p role="alert" className="mt-5 font-outfit text-[13px] text-red-600">{error}</p>}
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
                    onClick={() => createFrom(design.key)}
                    disabled={!!creating || atCapacity}
                    className="rounded-full bg-[#2C2519] px-5 py-2 font-outfit text-[12.5px] text-[#FAF7F2] transition hover:bg-[#3d342a] disabled:opacity-50"
                  >
                    {creating === design.key ? 'Creando…' : 'Crear borrador'}
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
