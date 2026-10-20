'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { normalizeCommercialReference, parseCommercialLead, requestCommercialLead, type CommercialLead } from '@/lib/commercial-lookup';

const control = 'min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39]';
type Result = { reference: string; lead: CommercialLead | null };

/** A saved revision may refresh the current snapshot, but never resurrect a cleared search. */
export function updateCommercialSearchResult(result: Result | null, incoming?: CommercialLead | null): Result | null {
  const lead = parseCommercialLead(incoming);
  if (!result?.lead || !lead || result.lead.id !== lead.id || result.reference !== lead.reference || lead.revision <= result.lead.revision) return result;
  return { reference: result.reference, lead };
}

export default function CommercialReferenceSearch({ transport = fetch, renderLead, latestLead }: { transport?: typeof fetch; renderLead: (lead: CommercialLead) => ReactNode; latestLead?: CommercialLead | null }) {
  const id = useId(), input = useRef<HTMLInputElement>(null), active = useRef<AbortController | null>(null), generation = useRef(0);
  const [reference, setReference] = useState(''), [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  useEffect(() => () => { generation.current += 1; active.current?.abort(); }, []);
  const shownResult = updateCommercialSearchResult(result, latestLead);
  useEffect(() => {
    setResult(previous => updateCommercialSearchResult(previous, latestLead));
  }, [latestLead, result?.lead?.id, result?.lead?.revision]);

  const search = async (value: string) => {
    const normalized = normalizeCommercialReference(value);
    if (!normalized) { setError('Escribe la referencia completa: EK- y los 8 caracteres del mensaje de WhatsApp.'); input.current?.focus(); return; }
    active.current?.abort();
    const controller = new AbortController(), request = ++generation.current;
    active.current = controller;
    setReference(normalized); setLoading(true); setError(''); setResult(null);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
    try {
      const lead = await requestCommercialLead(normalized, transport, controller.signal);
      if (request === generation.current && !controller.signal.aborted) setResult({ reference: normalized, lead });
    } catch (cause) {
      if (request === generation.current) setError(timedOut ? 'La búsqueda tardó demasiado. Vuelve a intentarlo.' : cause instanceof Error ? cause.message : 'No se pudo comprobar la referencia. Vuelve a buscar.');
    } finally {
      clearTimeout(timer);
      if (request === generation.current) { setLoading(false); active.current = null; }
    }
  };
  const clear = () => { ++generation.current; active.current?.abort(); active.current = null; setReference(''); setResult(null); setError(''); setLoading(false); input.current?.focus(); };
  const change = (value: string) => { ++generation.current; active.current?.abort(); active.current = null; setReference(value); setResult(null); setError(''); setLoading(false); };
  return <section aria-labelledby={`${id}-heading`} className="min-w-0 rounded-2xl border border-[#e4dfd4] bg-white">
    <div className="p-4 sm:p-5">
      <h3 id={`${id}-heading`} className="font-playfair text-2xl text-gray-800">Buscar referencia de WhatsApp</h3>
      <p id={`${id}-help`} className="mt-2 max-w-2xl font-outfit text-sm leading-6 text-gray-600">Pega la referencia completa del mensaje. Busca también contactos anteriores a los últimos 180 días; los filtros del listado no afectan esta búsqueda.</p>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event => { event.preventDefault(); void search(reference); }}>
        <div className="min-w-0 flex-1 sm:max-w-sm"><label htmlFor={`${id}-reference`} className="mb-1.5 block font-outfit text-sm font-medium text-gray-800">Referencia comercial</label><input ref={input} id={`${id}-reference`} name="commercial-reference" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={40} placeholder="Ej. EK-A1B2C3D4…" value={reference} onChange={event => change(event.target.value)} aria-invalid={!!error} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} className={`${control} w-full font-mono uppercase`} /></div>
        <button type="submit" disabled={loading} className="min-h-11 rounded-xl bg-[#765f39] px-5 text-sm font-semibold text-white hover:bg-[#5d4a2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39] disabled:opacity-60">{loading ? 'Buscando…' : 'Buscar referencia'}</button>
        {(reference || result || error) && <button type="button" onClick={clear} className={`${control} text-sm hover:bg-gray-50`}>Limpiar búsqueda</button>}
      </form>
      {error && <p id={`${id}-error`} role="alert" className="mt-3 font-outfit text-sm leading-6 text-red-800">{error}</p>}
      <p role="status" className="mt-3 font-outfit text-sm text-gray-600">{loading ? 'Comprobando la referencia…' : result ? result.lead ? `Contacto encontrado: ${result.reference}.` : `No se encontró ${result.reference}. Revisa los 8 caracteres del mensaje o limpia la búsqueda.` : 'La búsqueda no registra mensajes, reservas ni pagos.'}</p>
    </div>
    {shownResult?.lead && <div className="min-w-0 border-t border-gray-100">{renderLead(shownResult.lead)}</div>}
  </section>;
}
