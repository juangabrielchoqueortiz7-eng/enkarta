'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requestCommercialLead, type CommercialLead } from '@/lib/commercial-lookup';
import { clearCommercialPending, putCommercialPending, readCommercialPending, type CommercialPendingEntry } from '@/lib/commercial-pending';
import type { CommercialUpdate } from '@/lib/commercial-update';
import type { SalesDraftStorage } from '@/lib/sales-draft';

export type CommercialPendingManager = {
  ready: boolean; entries: CommercialPendingEntry[]; error: string; loadingId: string | null;
  persist: (reference: string, update: CommercialUpdate) => CommercialPendingEntry | null;
  complete: (entry: CommercialPendingEntry) => boolean;
  forget: (entry: CommercialPendingEntry) => boolean;
  resume: (entry: CommercialPendingEntry) => Promise<void>;
  retry: () => void;
};
type Stored = { scope: string | null; ready: boolean; entries: CommercialPendingEntry[]; error: string };
const empty = (scope: string | null): Stored => ({ scope, ready: false, entries: [], error: '' });
const same = (a: CommercialPendingEntry, b: CommercialPendingEntry) => JSON.stringify(a) === JSON.stringify(b);

/** Local recovery never sends a mutation. Only the editor can explicitly replay a request. */
export function useCommercialPendingRecovery(scope: string | null, transport: typeof fetch, onResume: (lead: CommercialLead, entry: CommercialPendingEntry) => boolean, storageOverride?: SalesDraftStorage): CommercialPendingManager {
  const binding = typeof scope === 'string' && /^[a-f0-9]{64}$/.test(scope) ? scope : null;
  const storage = useMemo<SalesDraftStorage>(() => storageOverride ?? {
    getItem: key => window.sessionStorage.getItem(key), setItem: (key, value) => window.sessionStorage.setItem(key, value), removeItem: key => window.sessionStorage.removeItem(key),
  }, [storageOverride]);
  const [stored, setStored] = useState<Stored>(() => empty(null));
  const [loading, setLoading] = useState<{ scope: string; id: string } | null>(null);
  const currentScope = useRef(binding), currentState = useRef(stored), callback = useRef(onResume);
  const active = useRef<AbortController | null>(null), generation = useRef(0), mounted = useRef(true);
  currentScope.current = binding; currentState.current = stored; callback.current = onResume;
  const cancel = useCallback(() => { generation.current += 1; active.current?.abort(); active.current = null; }, []);
  const report = useCallback((message: string) => {
    if (binding && currentScope.current === binding) setStored(previous => previous.scope === binding ? { ...previous, error: message } : { ...empty(binding), error: message });
  }, [binding]);
  const refresh = useCallback(() => {
    if (!mounted.current || !binding || currentScope.current !== binding) return false;
    const result = readCommercialPending(storage, binding);
    setStored(result.kind === 'ready' ? { scope: binding, ready: true, entries: result.entries, error: '' } : {
      ...empty(binding), error: result.kind === 'invalid' ? 'La copia local de operaciones está incompleta. No se enviará ningún guardado. Revisa el almacenamiento antes de continuar.' : 'No se pudo leer la recuperación de esta pestaña. Habilita el almacenamiento y vuelve a intentarlo.',
    });
    return result.kind === 'ready';
  }, [binding, storage]);
  useEffect(() => {
    mounted.current = true;
    cancel(); setLoading(null);
    if (binding) refresh(); else setStored(empty(null));
    return () => { mounted.current = false; cancel(); };
  }, [binding, storage, refresh, cancel]);
  const permitted = () => mounted.current && !!binding && currentScope.current === binding && currentState.current.scope === binding && currentState.current.ready;
  const persist = (reference: string, update: CommercialUpdate) => {
    if (!permitted() || !binding) return null;
    const result = putCommercialPending(storage, binding, reference, update);
    if (!result.ok) { refresh(); report('No se pudo conservar esta operación. No inicies otro guardado hasta recuperar el almacenamiento.'); return null; }
    refresh(); return result.entry;
  };
  const complete = (entry: CommercialPendingEntry) => {
    if (!permitted() || !binding) return false;
    if (!clearCommercialPending(storage, binding, entry)) { refresh(); report('No se pudo retirar esta copia local o cambió desde la última lectura. Vuelve a comprobarla.'); return false; }
    return refresh();
  };
  const resume = async (entry: CommercialPendingEntry) => {
    if (!permitted() || !binding) return;
    const isCurrent = () => {
      const result = readCommercialPending(storage, binding);
      if (result.kind !== 'ready') { refresh(); return false; }
      return result.entries.some(candidate => same(candidate, entry));
    };
    if (!isCurrent()) { report('La operación local cambió o ya no está disponible. Vuelve a leer las operaciones.'); return; }
    cancel(); const sequence = generation.current, controller = new AbortController(); active.current = controller;
    setLoading({ scope: binding, id: entry.request.requestId }); report('');
    let timer: ReturnType<typeof setTimeout> | undefined, aborted: (() => void) | undefined;
    try {
      const interrupted = new Promise<never>((_, reject) => {
        aborted = () => reject(new Error('La consulta se interrumpió. Vuelve a recuperar la operación.'));
        controller.signal.addEventListener('abort', aborted, { once: true });
        timer = setTimeout(() => controller.abort(), 20_000);
      });
      const lead = await Promise.race([requestCommercialLead(entry.reference, transport, controller.signal), interrupted]);
      if (sequence !== generation.current || controller.signal.aborted || currentScope.current !== binding) return;
      if (!isCurrent()) { report('La operación local cambió durante la consulta. No se abrió ni se envió ningún guardado.'); return; }
      if (!lead || lead.id !== entry.request.id || lead.reference !== entry.reference || lead.revision < entry.request.expectedRevision) {
        report('El contacto no está disponible o no coincide con esta operación. La copia local se conserva para revisarla.'); return;
      }
      if (!callback.current(lead, entry)) report('Esta ficha ya tiene cambios o un guardado pendiente. Revísala antes de recuperar otra operación.');
    } catch (cause) {
      if (sequence === generation.current && currentScope.current === binding) report(cause instanceof Error ? cause.message : 'No se pudo comprobar el contacto. La copia local se conserva.');
    } finally {
      if (timer) clearTimeout(timer);
      if (aborted) controller.signal.removeEventListener('abort', aborted);
      if (sequence === generation.current && currentScope.current === binding) { active.current = null; setLoading(null); }
    }
  };
  const visible = stored.scope === binding && binding !== null;
  return { ready: visible && stored.ready, entries: visible ? stored.entries : [], error: visible ? stored.error : '', loadingId: loading?.scope === binding ? loading.id : null, persist, complete, forget: complete, resume, retry: () => { if (!mounted.current || currentScope.current !== binding) return; cancel(); setLoading(null); refresh(); } };
}

const button = 'min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39] disabled:opacity-50';

export default function CommercialPendingRecovery({ manager }: { manager: CommercialPendingManager }) {
  const [confirm, setConfirm] = useState<CommercialPendingEntry | null>(null);
  if (!manager.entries.length && !manager.error) return null;
  return <section aria-label="Recuperación de guardados comerciales" className="min-w-0 space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-outfit text-sm leading-6 text-amber-950 sm:p-5">
    <h3 className="font-playfair text-2xl">Operaciones por comprobar</h3>
    <p>Estas operaciones se conservaron en esta pestaña. Recuperarlas consulta el contacto; después podrás comprobar el mismo guardado sin crear otra solicitud.</p>
    {manager.error && <div className="space-y-3"><p role="alert">{manager.error}</p><button type="button" className={button} disabled={!!manager.loadingId} onClick={manager.retry}>Volver a leer operaciones</button></div>}
    <ul className="min-w-0 space-y-4">{manager.entries.map(entry => <li key={entry.request.requestId} className="min-w-0 space-y-3 border-t border-amber-200 pt-4">
      <p><strong translate="no" className="font-mono">{entry.reference}</strong> · Operación por comprobar</p>
      <time dateTime={new Date(entry.savedAt).toISOString()}>{new Date(entry.savedAt).toLocaleString('es-BO')}</time>
      {Date.now() - entry.savedAt > 24 * 60 * 60 * 1000 && <p>Esta operación tiene más de 24 horas. Se conserva para una comprobación explícita; no se enviará automáticamente.</p>}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={!manager.ready || !!manager.loadingId} className={button} onClick={() => void manager.resume(entry)}>{manager.loadingId === entry.request.requestId ? 'Comprobando contacto…' : 'Recuperar operación'}</button><button type="button" disabled={!manager.ready || !!manager.loadingId} className={button} onClick={() => setConfirm(entry)}>Retirar copia local…</button></div>
      {confirm?.request.requestId === entry.request.requestId && <div className="space-y-3"><p>Retirar esta copia no revierte una operación guardada ni confirma o cancela pagos. No modifica el contacto ni su historial.</p><div className="flex flex-wrap gap-3"><button type="button" disabled={!!manager.loadingId} className={button} onClick={() => { if (manager.forget(confirm)) setConfirm(null); }}>Sí, retirar copia local</button><button type="button" className={button} onClick={() => setConfirm(null)}>Conservar copia</button></div></div>}
    </li>)}</ul>
    {manager.loadingId && <p role="status">Comprobando el contacto. No se está enviando un guardado.</p>}
  </section>;
}
