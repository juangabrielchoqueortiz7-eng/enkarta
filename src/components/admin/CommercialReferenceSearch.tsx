'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { normalizeCommercialReference, parseCommercialLead, requestCommercialLead, type CommercialLead } from '@/lib/commercial-lookup';
import { useCommercialSearchRecovery } from '@/components/admin/useCommercialSearchRecovery';
import type { CommercialSearchEntry } from '@/lib/commercial-search-recovery';
import type { SalesDraftStorage } from '@/lib/sales-draft';

const control = 'min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39]';
type Result = { reference: string; lead: CommercialLead | null };

/** A saved revision may refresh the current snapshot, but never resurrect a cleared search. */
export function updateCommercialSearchResult(result: Result | null, incoming?: CommercialLead | null): Result | null {
  const lead = parseCommercialLead(incoming);
  if (!result?.lead || !lead || result.lead.id !== lead.id || result.reference !== lead.reference || lead.revision <= result.lead.revision) return result;
  return { reference: result.reference, lead };
}

export default function CommercialReferenceSearch({ transport = fetch, renderLead, latestLead, recoveryScope = null, storage }: { transport?: typeof fetch; renderLead: (lead: CommercialLead) => ReactNode; latestLead?: CommercialLead | null; recoveryScope?: string | null; storage?: SalesDraftStorage }) {
  const binding = typeof recoveryScope === 'string' && recoveryScope.length === 64 && /^[a-f0-9]{64}$/.test(recoveryScope) ? recoveryScope : null;
  const recovery = useCommercialSearchRecovery(binding, storage);
  const id = useId(), input = useRef<HTMLInputElement>(null), active = useRef<AbortController | null>(null), generation = useRef(0);
  const mounted = useRef(true), currentScope = useRef(binding);
  const lifetime = useRef({ binding, storage, epoch: 0 });
  if (lifetime.current.binding !== binding || lifetime.current.storage !== storage) lifetime.current = { binding, storage, epoch: lifetime.current.epoch + 1 };
  const epoch = lifetime.current.epoch;
  currentScope.current = binding;
  const [stateEpoch, setStateEpoch] = useState(epoch), visible = stateEpoch === epoch;
  const [reference, setReference] = useState(''), [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [recoveryNotice, setRecoveryNotice] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current += 1; active.current?.abort(); }; }, []);
  useEffect(() => {
    if (stateEpoch === epoch) return;
    generation.current += 1; active.current?.abort(); active.current = null;
    setReference(''); setResult(null); setError(''); setLoading(false); setRecoveryNotice(''); setStateEpoch(epoch);
  }, [epoch, stateEpoch]);
  const shownResult = visible ? updateCommercialSearchResult(result, latestLead) : null;
  useEffect(() => {
    setResult(previous => updateCommercialSearchResult(previous, latestLead));
  }, [latestLead, result?.lead?.id, result?.lead?.revision]);

  const permitted = () => mounted.current && currentScope.current === binding && lifetime.current.epoch === epoch && visible;
  const search = async (value: string, restored?: CommercialSearchEntry) => {
    if (!permitted()) return;
    const normalized = normalizeCommercialReference(value);
    if (!normalized) { setError('Escribe la referencia completa: EK- y los 8 caracteres del mensaje de WhatsApp.'); input.current?.focus(); return; }
    if (restored && (!recovery.isCurrent(restored) || normalized !== restored.reference)) { setError('La consulta guardada cambió o venció. Vuelve a leer la última referencia antes de retomarla.'); return; }
    const expected = restored ?? recovery.entry ?? recovery.expired ?? null;
    generation.current += 1;
    active.current?.abort();
    const controller = new AbortController(), request = generation.current;
    active.current = controller;
    setReference(normalized); setLoading(true); setError(''); setResult(null); setRecoveryNotice('');
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined, aborted: (() => void) | undefined;
    try {
      const interrupted = new Promise<never>((_, reject) => {
        aborted = () => reject(new Error(timedOut ? 'La búsqueda tardó demasiado. Vuelve a intentarlo.' : 'La búsqueda se interrumpió. Vuelve a intentarlo.'));
        controller.signal.addEventListener('abort', aborted, { once: true });
        timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
      });
      const lead = await Promise.race([requestCommercialLead(normalized, transport, controller.signal), interrupted]);
      if (!permitted() || request !== generation.current || controller.signal.aborted) return;
      if (restored && !recovery.isCurrent(restored)) { setError('La consulta guardada cambió o venció durante la búsqueda. No se recuperó la ficha.'); return; }
      if (restored && (!lead || lead.id !== restored.id)) { setError('El contacto guardado ya no está disponible o su identidad cambió. La referencia local se conserva para revisarla.'); return; }
      setResult({ reference: normalized, lead });
      if (lead && binding && !recovery.persist(lead, expected)) setRecoveryNotice('Contacto consultado. No se pudo conservar esta referencia para retomarla tras recargar. El resultado sigue visible en esta pantalla; revisa el almacenamiento antes de recargar.');
    } catch (cause) {
      if (permitted() && request === generation.current) setError(timedOut ? 'La búsqueda tardó demasiado. Vuelve a intentarlo.' : cause instanceof Error ? cause.message : 'No se pudo comprobar la referencia. Vuelve a buscar.');
    } finally {
      if (timer) clearTimeout(timer);
      if (aborted) controller.signal.removeEventListener('abort', aborted);
      if (permitted() && request === generation.current) { setLoading(false); active.current = null; }
    }
  };
  const clear = () => {
    if (!permitted()) return;
    ++generation.current; active.current?.abort(); active.current = null; setLoading(false);
    const entry = recovery.entry ?? recovery.expired;
    if (entry && !recovery.clear(entry)) { setError('No se pudo retirar la última referencia guardada o cambió otra copia. Vuelve a leerla antes de limpiar.'); return; }
    setReference(''); setResult(null); setRecoveryNotice('');
    setError(binding && !recovery.ready ? 'Se limpió la búsqueda de pantalla. No se pudo comprobar la copia local; vuelve a leer la última referencia.' : ''); input.current?.focus();
  };
  const change = (value: string) => { if (!permitted()) return; ++generation.current; active.current?.abort(); active.current = null; setReference(value); setResult(null); setError(''); setRecoveryNotice(''); setLoading(false); };
  return <section aria-labelledby={`${id}-heading`} className="min-w-0 rounded-2xl border border-[#e4dfd4] bg-white">
    <div className="p-4 sm:p-5">
      <h3 id={`${id}-heading`} className="font-playfair text-2xl text-gray-800">Buscar referencia de WhatsApp</h3>
      <p id={`${id}-help`} className="mt-2 max-w-2xl font-outfit text-sm leading-6 text-gray-600">Pega la referencia completa del mensaje. Busca también contactos anteriores a los últimos 180 días; los filtros del listado no afectan esta búsqueda.</p>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event => { event.preventDefault(); void search(reference); }}>
        <div className="min-w-0 flex-1 sm:max-w-sm"><label htmlFor={`${id}-reference`} className="mb-1.5 block font-outfit text-sm font-medium text-gray-800">Referencia comercial</label><input ref={input} id={`${id}-reference`} name="commercial-reference" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={40} placeholder="Ej. EK-A1B2C3D4…" value={visible ? reference : ''} onChange={event => change(event.target.value)} disabled={!visible} aria-invalid={visible && !!error} aria-describedby={`${id}-help${visible && error ? ` ${id}-error` : ''}`} className={`${control} w-full font-mono uppercase`} /></div>
        <button type="submit" disabled={!visible || loading} className="min-h-11 rounded-xl bg-[#765f39] px-5 text-sm font-semibold text-white hover:bg-[#5d4a2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39] disabled:opacity-60">{visible && loading ? 'Buscando…' : 'Buscar referencia'}</button>
        {((visible && (reference || result || error)) || recovery.entry || recovery.expired) && <button type="button" onClick={clear} disabled={!visible} className={`${control} text-sm hover:bg-gray-50`}>Limpiar búsqueda</button>}
      </form>
      {visible && error && <p id={`${id}-error`} role="alert" className="mt-3 font-outfit text-sm leading-6 text-red-800">{error}</p>}
      <p role="status" className="mt-3 font-outfit text-sm text-gray-600">{visible && loading ? 'Comprobando la referencia…' : visible && result ? result.lead ? `Contacto encontrado: ${result.reference}.` : `No se encontró ${result.reference}. Revisa los 8 caracteres del mensaje o limpia la búsqueda.` : 'La búsqueda no registra mensajes, reservas ni pagos.'}</p>
      {visible && recoveryNotice && <p role="status" className="mt-3 font-outfit text-sm leading-6 text-amber-950">{recoveryNotice}</p>}
      {(recovery.entry || recovery.expired || recovery.error) && <div className="mt-4 min-w-0 space-y-3 border-t border-[#e4dfd4] pt-4 font-outfit text-sm leading-6 text-gray-700">
        {recovery.entry && <><p>Última consulta guardada: <strong translate="no" className="font-mono">{recovery.entry.reference}</strong> · <time dateTime={new Date(recovery.entry.savedAt).toISOString()}>{new Date(recovery.entry.savedAt).toLocaleString('es-BO')}</time></p><p>Disponible durante 24 horas en esta pestaña y sesión. Retomar vuelve a consultar los datos actuales. Después podrás abrir el seguimiento.</p><button type="button" disabled={!visible || !recovery.ready || loading} onClick={() => void search(recovery.entry!.reference, recovery.entry!)} className={`${control} text-sm hover:bg-gray-50 disabled:opacity-50`}>Retomar consulta</button></>}
        {recovery.expired && <p>La última consulta guardada venció. Limpia la búsqueda para retirar su copia; puedes buscar una referencia nueva.</p>}
        {recovery.error && <><p role="alert" className="text-amber-950">{recovery.error}</p><button type="button" disabled={visible && loading} onClick={recovery.retry} className={`${control} text-sm hover:bg-gray-50`}>Volver a leer última referencia</button></>}
        <p>Limpiar la búsqueda retira esta referencia. Los borradores y operaciones del seguimiento se conservan por separado.</p>
      </div>}
    </div>
    {shownResult?.lead && <div className="min-w-0 border-t border-gray-100">{renderLead(shownResult.lead)}</div>}
  </section>;
}
