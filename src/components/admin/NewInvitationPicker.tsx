'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STARTER_COLLECTIONS, type StarterCollectionKey } from '@/lib/enkarta-collections';

const TEMPLATES = STARTER_COLLECTIONS;
type TemplateKey = StarterCollectionKey;

export default function NewInvitationPicker() {
  const router = useRouter();
  const [creating, setCreating] = useState<TemplateKey | null>(null);
  const [error, setError] = useState('');

  const createFrom = async (template: TemplateKey) => {
    if (creating) return;
    setCreating(template);
    setError('');

    try {
      const res = await fetch('/api/admin/invitations/starter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
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
                <button
                  type="button"
                  onClick={() => createFrom(template.key)}
                  disabled={!!creating}
                  className="relative block w-full overflow-hidden text-left disabled:cursor-wait"
                  aria-label={`Usar la invitación ${template.name}`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: `${template.accent}16` }}>
                    {/* Los archivos del catálogo son recursos locales controlados por Enkarta. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={template.image}
                      alt={`Invitación ${template.name}`}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-black/5" />
                    <span className="absolute left-4 top-4 rounded-full border border-white/30 bg-black/25 px-2.5 py-1 font-outfit text-[10px] font-medium uppercase tracking-[0.14em] text-white backdrop-blur-md">
                      {template.tag}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="font-playfair text-2xl leading-none">{template.name}</p>
                      <p className="mt-1 font-outfit text-[9px] font-medium uppercase tracking-[0.18em] text-white/60">Colección {template.series}</p>
                      <p className="mt-1.5 font-outfit text-xs text-white/75">{template.description}</p>
                    </div>
                    {isCreating && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#17120d]/75 text-white backdrop-blur-sm">
                        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span className="font-outfit text-xs font-medium">Preparando el editor…</span>
                      </div>
                    )}
                  </div>
                </button>

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
