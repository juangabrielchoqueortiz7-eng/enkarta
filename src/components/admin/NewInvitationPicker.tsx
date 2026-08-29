'use client';

import { useState } from 'react';
import CollectionPreview from '@/components/invitations/CollectionPreview';
import { useRouter } from 'next/navigation';
import { type StarterDesignKey } from '@/lib/enkarta-collections';
import { collectionCatalog } from '@/lib/collection-catalog';
import { PACKAGE_CATALOG, PACKAGE_ORDER, RSVP_LABELS } from '@/lib/packages';
import type { InvitationPackage } from '@/lib/types';

const TEMPLATES = collectionCatalog();
type TemplateKey = StarterDesignKey;

export default function NewInvitationPicker() {
  const router = useRouter();
  const [creating, setCreating] = useState<TemplateKey | null>(null);
  const [error, setError] = useState('');
  const [pkg, setPkg] = useState<InvitationPackage | null>(null);

  const createFrom = async (template: TemplateKey) => {
    if (creating) return;
    if (!pkg) { setError('Primero selecciona el paquete contratado.'); return; }
    setCreating(template);
    setError('');

    try {
      const res = await fetch('/api/admin/invitations/starter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, package: pkg }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'No se pudo crear la invitación');
      router.push(`/admin/builder/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la invitación');
      setCreating(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <header className="sticky top-0 z-30 border-b border-[#8b7d5f]/15 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/admin" className="flex items-center gap-3 text-gray-500 transition-colors hover:text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#b8975a]/30 bg-[#b8975a]/5">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </span>
            <span className="hidden font-outfit text-sm sm:inline">Volver a invitaciones</span>
          </a>
          <div className="text-center">
            <p className="font-cinzel text-sm tracking-[0.14em] text-enkarta-dark">ENKARTA</p>
            <p className="font-outfit text-[9px] uppercase tracking-[0.28em] text-[#b8975a]">Nueva invitación</p>
          </div>
          <div className="w-9 sm:w-[172px]" />
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#b8975a]/20 bg-white px-3 py-1 font-outfit text-[11px] font-medium uppercase tracking-[0.16em] text-[#9b7b40] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b8975a]" />
            Selección visual
          </span>
          <h1 className="mt-5 font-playfair text-3xl text-gray-900 sm:text-4xl">Elige la invitación que quieres editar</h1>
          <p className="mx-auto mt-3 max-w-xl font-outfit text-sm leading-relaxed text-gray-500 sm:text-base">
            Selecciona un diseño ya construido. Abriremos el editor visual con la invitación completa y todos los cambios se verán al instante.
          </p>
        </div>

        <fieldset className="mx-auto mb-8 max-w-3xl font-outfit">
          <legend className="mb-3 text-sm font-semibold text-gray-700">1. Selecciona el paquete contratado</legend>
          <div className="grid gap-3 sm:grid-cols-3">{[...PACKAGE_ORDER].reverse().map(key => {
            const plan = PACKAGE_CATALOG[key];
            return <label key={key} className={`cursor-pointer rounded-2xl border p-4 ${pkg === key ? 'border-[#b8975a] bg-[#fffaf0] ring-1 ring-[#b8975a]' : 'border-gray-200 bg-white'}`}>
              <span className="flex items-center justify-between"><span className="font-medium">{plan.label}</span><input type="radio" name="package" value={key} checked={pkg === key} disabled={!!creating} onChange={() => { setPkg(key); setError(''); }} /></span>
              <span className="mt-2 block text-lg text-[#8b6e38]">{plan.bs} Bs <span className="text-xs text-gray-500">/ USD {plan.usd}</span></span>
              <span className="mt-2 block text-xs leading-relaxed text-gray-500">{RSVP_LABELS[plan.features.rsvpMode]}{plan.features.qrAccess ? ' + panel y QR' : ''}</span>
            </label>;
          })}</div>
          <p className="mt-3 text-xs text-gray-500">2. Elige tu diseño abajo. Los adicionales se registran después en Configuración; esta selección no realiza ningún cobro.</p>
        </fieldset>

        {error && (
          <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center font-outfit text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {TEMPLATES.map(template => {
            const isCreating = creating === template.key;
            return (
              <article
                key={template.key}
                className={`group overflow-hidden rounded-[24px] border bg-white transition-all duration-300 ${
                  isCreating
                    ? 'border-[#b8975a] shadow-[0_20px_55px_rgba(105,78,29,0.18)] ring-2 ring-[#b8975a]/15'
                    : 'border-[#8b7d5f]/15 shadow-[0_8px_28px_rgba(62,51,34,0.06)] hover:-translate-y-1 hover:border-[#b8975a]/40 hover:shadow-[0_20px_55px_rgba(105,78,29,0.13)]'
                }`}
              >
                <CollectionPreview name={template.name} image={template.image} demoPath={template.demoPath} bg={template.bg} />
                <div className="border-t border-[#e6e0d5] px-4 pt-4">
                  <p className="font-outfit text-[10px] uppercase tracking-[.14em] text-[#85765f]">{template.tag}</p>
                  <h2 className="mt-1 font-playfair text-2xl text-[#373b31]">{template.name}</h2>
                  <p className="mt-1 min-h-10 font-outfit text-xs leading-relaxed text-[#716d62]">{template.description}</p>
                </div>

                <div className="flex items-center gap-2 p-3">
                  <a
                    href={`/muestra/${template.demoKey ?? template.key}?full=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 font-outfit text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Ver completa
                  </a>
                  <button
                    type="button"
                    onClick={() => createFrom(template.key)}
                    disabled={!!creating}
                    className="flex h-10 flex-[1.25] items-center justify-center gap-1.5 rounded-xl font-outfit text-xs font-semibold text-white transition-all hover:-translate-y-px disabled:cursor-wait disabled:opacity-60"
                    style={{ background: `linear-gradient(90deg, ${template.ink}, ${template.accent})`, boxShadow: `0 6px 16px ${template.accent}35` }}
                  >
                    {isCreating ? 'Abriendo…' : 'Usar y editar'}
                    {!isCreating && <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
