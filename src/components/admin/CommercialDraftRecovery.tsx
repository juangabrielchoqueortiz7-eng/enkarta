'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requestCommercialLead, type CommercialLead } from '@/lib/commercial-lookup';
import { clearCommercialDraft, createCommercialDraftEntry, putCommercialDraft, readCommercialDrafts, type CommercialDraftEntry } from '@/lib/commercial-drafts';
import type { CommercialDraft } from '@/lib/commercial-update';
import type { SalesDraftStorage } from '@/lib/sales-draft';

export type CommercialDraftManager = {
  ready: boolean; entries: CommercialDraftEntry[]; expired: CommercialDraftEntry[]; error: string; loadingId: string | null;
  persist: (base: CommercialLead, draft: CommercialDraft, expected: CommercialDraftEntry | null) => CommercialDraftEntry | null;
  clear: (entry: CommercialDraftEntry) => boolean; forget: (entry: CommercialDraftEntry) => boolean;
  restore: (entry: CommercialDraftEntry) => Promise<void>; retry: () => void;
};
type Stored = { scope: string | null; ready: boolean; entries: CommercialDraftEntry[]; expired: CommercialDraftEntry[]; error: string };
const empty = (scope: string | null): Stored => ({ scope, ready: false, entries: [], expired: [], error: '' });
const same = (a: CommercialDraftEntry, b: CommercialDraftEntry) => JSON.stringify(a) === JSON.stringify(b);

/** Restoring is explicit and read-only. Drafts never carry an automatic server mutation. */
export function useCommercialDraftRecovery(scope: string | null, transport: typeof fetch, onRestore: (lead: CommercialLead, entry: CommercialDraftEntry) => boolean, storageOverride?: SalesDraftStorage): CommercialDraftManager {
  const binding = typeof scope === 'string' && /^[a-f0-9]{64}$/.test(scope) ? scope : null;
  const storage = useMemo<SalesDraftStorage>(() => storageOverride ?? {
    getItem: key => window.sessionStorage.getItem(key), setItem: (key, value) => window.sessionStorage.setItem(key, value), removeItem: key => window.sessionStorage.removeItem(key),
  }, [storageOverride]);
  const [stored, setStored] = useState<Stored>(() => empty(null));
  const [loading, setLoading] = useState<{ scope: string; id: string } | null>(null);
  const currentScope = useRef(binding), currentState = useRef(stored), callback = useRef(onRestore);
  const active = useRef<AbortController | null>(null), generation = useRef(0), mounted = useRef(true);
  currentScope.current = binding; currentState.current = stored; callback.current = onRestore;
  const cancel = useCallback(() => { generation.current += 1; active.current?.abort(); active.current = null; }, []);
  const report = useCallback((message: string) => {
    if (mounted.current && binding && currentScope.current === binding) setStored(previous => previous.scope === binding ? { ...previous, error: message } : { ...empty(binding), error: message });
  }, [binding]);
  const refresh = useCallback(() => {
    if (!mounted.current || !binding || currentScope.current !== binding) return false;
    const result = readCommercialDrafts(storage, binding);
    setStored(result.kind === 'ready' ? { scope: binding, ready: true, entries: result.entries, expired: result.expired, error: '' } : {
      ...empty(binding), error: result.kind === 'invalid' ? 'La copia de cambios locales está incompleta. No se reemplazará ni se enviará al servidor. Revisa el almacenamiento.' : 'No se pudo leer el borrador de esta pestaña. Habilita el almacenamiento y vuelve a intentarlo.',
    });
    return result.kind === 'ready';
  }, [binding, storage]);
  useEffect(() => {
    mounted.current = true; cancel(); setLoading(null);
    if (binding) refresh(); else setStored(empty(null));
    return () => { mounted.current = false; cancel(); };
  }, [binding, storage, refresh, cancel]);
  const permitted = () => mounted.current && !!binding && currentScope.current === binding && currentState.current.scope === binding && currentState.current.ready;
  const persist = (base: CommercialLead, draft: CommercialDraft, expected: CommercialDraftEntry | null) => {
    if (!permitted() || !binding) return null;
    const entry = createCommercialDraftEntry(base, draft);
    if (!entry || !putCommercialDraft(storage, binding, entry, expected)) { refresh(); report('No se pudo conservar este borrador o cambió otra copia local. Tus cambios siguen en el editor; revisa la recuperación antes de reemplazarlos.'); return null; }
    refresh(); return entry;
  };
  const clear = (entry: CommercialDraftEntry) => {
    if (!permitted() || !binding) return false;
    if (!clearCommercialDraft(storage, binding, entry)) { refresh(); report('No se pudo retirar este borrador o cambió desde la última lectura. No se modificó el contacto.'); return false; }
    return refresh();
  };
  const restore = async (entry: CommercialDraftEntry) => {
    if (!permitted() || !binding) return;
    const isCurrent = () => {
      const result = readCommercialDrafts(storage, binding);
      if (result.kind !== 'ready') { refresh(); return false; }
      return result.entries.some(candidate => same(candidate, entry));
    };
    if (!isCurrent()) { refresh(); report('Este borrador cambió, venció o ya no está disponible. Vuelve a leer los cambios locales.'); return; }
    cancel(); const sequence = generation.current, controller = new AbortController(); active.current = controller;
    setLoading({ scope: binding, id: entry.id }); report('');
    let timer: ReturnType<typeof setTimeout> | undefined, aborted: (() => void) | undefined;
    try {
      const interrupted = new Promise<never>((_, reject) => {
        aborted = () => reject(new Error('La consulta se interrumpió. Vuelve a recuperar el borrador.'));
        controller.signal.addEventListener('abort', aborted, { once: true });
        timer = setTimeout(() => controller.abort(), 20_000);
      });
      const lead = await Promise.race([requestCommercialLead(entry.reference, transport, controller.signal), interrupted]);
      if (sequence !== generation.current || controller.signal.aborted || currentScope.current !== binding) return;
      if (!isCurrent()) { refresh(); report('El borrador cambió o venció durante la consulta. No se reemplazó el editor ni se envió un guardado.'); return; }
      if (!lead || lead.id !== entry.id || lead.reference !== entry.reference || lead.revision < entry.base.revision) {
        report('El contacto no está disponible o no coincide con este borrador. La copia local se conserva.'); return;
      }
      if (lead.revision === entry.base.revision && (lead.status !== entry.base.status || lead.revenue_bs !== entry.base.revenueBs || lead.notes !== entry.base.notes)) {
        report('La versión actual no coincide con la base de este borrador. No se reemplazó el editor; conserva la copia para revisarla.'); return;
      }
      if (!callback.current(lead, entry)) report('Esta ficha tiene cambios o una operación pendiente. Revísala antes de recuperar este borrador.');
    } catch (cause) {
      if (sequence === generation.current && currentScope.current === binding) report(cause instanceof Error ? cause.message : 'No se pudo comprobar el contacto. La copia local se conserva.');
    } finally {
      if (timer) clearTimeout(timer);
      if (aborted) controller.signal.removeEventListener('abort', aborted);
      if (sequence === generation.current && currentScope.current === binding) { active.current = null; setLoading(null); }
    }
  };
  const visible = stored.scope === binding && binding !== null;
  return { ready: visible && stored.ready, entries: visible ? stored.entries : [], expired: visible ? stored.expired : [], error: visible ? stored.error : '', loadingId: loading?.scope === binding ? loading.id : null, persist, clear, forget: clear, restore,
    retry: () => { if (!mounted.current || currentScope.current !== binding) return; cancel(); setLoading(null); refresh(); } };
}

const button = 'min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39] disabled:opacity-50';

export default function CommercialDraftRecovery({ manager, pendingIds }: { manager: CommercialDraftManager; pendingIds?: ReadonlySet<string> }) {
  const [confirm, setConfirm] = useState<CommercialDraftEntry | null>(null);
  if (!manager.entries.length && !manager.expired.length && !manager.error) return null;
  const rows = [...manager.entries.map(entry => ({ entry, expired: false })), ...manager.expired.map(entry => ({ entry, expired: true }))];
  return <section aria-label="Recuperación de cambios comerciales sin enviar" className="min-w-0 space-y-4 rounded-2xl border border-[#dfd7cb] bg-[#faf7f2] p-4 font-outfit text-sm leading-6 text-gray-800 sm:p-5">
    <h3 className="font-playfair text-2xl">Cambios sin enviar</h3>
    <p>Estos borradores pertenecen a esta pestaña y sesión. Puedes recuperarlos durante 24 horas. Recuperar consulta el contacto; no guarda cambios en el servidor ni procesa pagos.</p>
    {manager.error && <div className="space-y-3"><p role="alert" className="text-amber-950">{manager.error}</p><button type="button" className={button} disabled={!!manager.loadingId} onClick={manager.retry}>Volver a leer borradores</button></div>}
    <ul className="min-w-0 space-y-4">{rows.map(({ entry, expired }) => <li key={entry.id} className="min-w-0 space-y-3 border-t border-[#dfd7cb] pt-4">
      <p><strong translate="no" className="font-mono">{entry.reference}</strong> · {expired ? 'Borrador vencido' : 'Borrador local'}</p>
      <time dateTime={new Date(entry.savedAt).toISOString()}>{new Date(entry.savedAt).toLocaleString('es-BO')}</time>
      {expired && <p>Pasaron las 24 horas disponibles para recuperar. Esta copia no se aplicará al contacto; puedes retirarla explícitamente.</p>}
      {pendingIds?.has(entry.id) && <p className="text-amber-950">Primero comprueba la operación pendiente de este contacto. Ese guardado tiene prioridad sobre el borrador.</p>}
      <div className="flex flex-wrap gap-3">{!expired && <button type="button" disabled={!manager.ready || !!manager.loadingId || !!pendingIds?.has(entry.id)} className={button} onClick={() => void manager.restore(entry)}>{manager.loadingId === entry.id ? 'Comprobando contacto…' : 'Recuperar cambios'}</button>}<button type="button" disabled={!manager.ready || !!manager.loadingId} className={button} onClick={() => setConfirm(entry)}>Descartar borrador local…</button></div>
      {confirm?.id === entry.id && <div className="space-y-3"><p>Se retirará únicamente esta copia local. No se modifica el contacto, su historial, ninguna operación enviada ni los pagos.</p><div className="flex flex-wrap gap-3"><button type="button" disabled={!!manager.loadingId} className={button} onClick={() => { if (manager.forget(confirm)) setConfirm(null); }}>Sí, descartar borrador local</button><button type="button" className={button} onClick={() => setConfirm(null)}>Conservar borrador</button></div></div>}
    </li>)}</ul>
    {manager.loadingId && <p role="status">Comprobando el contacto. No se está enviando un guardado.</p>}
  </section>;
}
