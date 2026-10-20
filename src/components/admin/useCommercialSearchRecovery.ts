'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommercialLead } from '@/lib/commercial-lookup';
import { clearCommercialSearch, createCommercialSearchEntry, putCommercialSearch, readCommercialSearch, type CommercialSearchEntry, type CommercialSearchRead } from '@/lib/commercial-search-recovery';
import type { SalesDraftStorage } from '@/lib/sales-draft';

export type CommercialSearchManager = {
  ready: boolean; entry: CommercialSearchEntry | null; expired: CommercialSearchEntry | null; error: string;
  persist: (lead: CommercialLead, expected: CommercialSearchEntry | null) => CommercialSearchEntry | null;
  clear: (entry: CommercialSearchEntry) => boolean; isCurrent: (entry: CommercialSearchEntry) => boolean; retry: () => void;
};
type Stored = { scope: string | null; storage: SalesDraftStorage | null; ready: boolean; entry: CommercialSearchEntry | null; expired: CommercialSearchEntry | null; error: string };
const empty = (scope: string | null, storage: SalesDraftStorage | null = null): Stored => ({ scope, storage, ready: false, entry: null, expired: null, error: '' });
const same = (left: CommercialSearchEntry, right: CommercialSearchEntry) => left.id === right.id && left.reference === right.reference && left.savedAt === right.savedAt;

/** A tab/session-scoped identity is offered for explicit lookup; this hook never queries or changes a contact. */
export function useCommercialSearchRecovery(scope: string | null, storageOverride?: SalesDraftStorage): CommercialSearchManager {
  const binding = typeof scope === 'string' && scope.length === 64 && /^[a-f0-9]{64}$/.test(scope) ? scope : null;
  const storage = useMemo<SalesDraftStorage>(() => storageOverride ?? {
    getItem: key => window.sessionStorage.getItem(key), setItem: (key, value) => window.sessionStorage.setItem(key, value), removeItem: key => window.sessionStorage.removeItem(key),
  }, [storageOverride]);
  const [stored, setStored] = useState<Stored>(() => empty(null));
  const currentScope = useRef(binding), currentStorage = useRef(storage), currentState = useRef(stored), mounted = useRef(true);
  const lifetime = useRef({ scope: binding, storage, generation: 0 });
  if (lifetime.current.scope !== binding || lifetime.current.storage !== storage) lifetime.current = { scope: binding, storage, generation: lifetime.current.generation + 1 };
  const generation = lifetime.current.generation;
  currentScope.current = binding; currentStorage.current = storage; currentState.current = stored;
  const bound = () => mounted.current && !!binding && currentScope.current === binding && currentStorage.current === storage && lifetime.current.generation === generation;
  const report = useCallback((message: string) => {
    if (!mounted.current || !binding || currentScope.current !== binding || currentStorage.current !== storage || lifetime.current.generation !== generation) return;
    setStored(previous => previous.scope === binding && previous.storage === storage ? { ...previous, error: message } : { ...empty(binding, storage), error: message });
  }, [binding, storage, generation]);
  const refresh = useCallback((): CommercialSearchRead | null => {
    if (!mounted.current || !binding || currentScope.current !== binding || currentStorage.current !== storage || lifetime.current.generation !== generation) return null;
    const result = readCommercialSearch(storage, binding);
    const next: Stored = result.kind === 'ready' || result.kind === 'expired' || result.kind === 'empty' ? {
      scope: binding, storage, ready: true, entry: result.kind === 'ready' ? result.entry : null, expired: result.kind === 'expired' ? result.entry : null, error: '',
    } : { ...empty(binding, storage), error: result.kind === 'invalid'
      ? 'La referencia local está incompleta o no corresponde a esta sesión. No se reemplazará. Revisa el almacenamiento.'
      : 'No se pudo leer la última referencia de esta pestaña. Habilita el almacenamiento y vuelve a intentarlo.' };
    currentState.current = next; setStored(next); return result;
  }, [binding, storage, generation]);
  useEffect(() => {
    mounted.current = true;
    if (binding) refresh(); else { const next = empty(null); currentState.current = next; setStored(next); }
    return () => { mounted.current = false; };
  }, [binding, storage, refresh]);
  const permitted = () => bound() && currentState.current.scope === binding && currentState.current.storage === storage && currentState.current.ready;
  const persist = (lead: CommercialLead, expected: CommercialSearchEntry | null) => {
    if (!permitted() || !binding) return null;
    const entry = createCommercialSearchEntry(lead);
    if (!entry || !putCommercialSearch(storage, binding, entry, expected)) {
      refresh(); report('No se pudo conservar esta referencia o cambió otra elección local. El contacto consultado no se modificó.'); return null;
    }
    refresh(); return entry;
  };
  const clear = (entry: CommercialSearchEntry) => {
    if (!permitted() || !binding) return false;
    if (!clearCommercialSearch(storage, binding, entry)) {
      refresh(); report('La referencia cambió o no se pudo retirar. Se conserva la copia disponible; vuelve a leerla.'); return false;
    }
    const result = refresh(); return !!result && result.kind !== 'invalid' && result.kind !== 'unavailable';
  };
  const isCurrent = (entry: CommercialSearchEntry) => {
    if (!permitted()) return false;
    const result = refresh();
    if (result?.kind === 'ready' && same(result.entry, entry)) return true;
    if (result && result.kind !== 'invalid' && result.kind !== 'unavailable') report('La referencia cambió, venció o ya no está disponible. Vuelve a leerla antes de retomar.');
    return false;
  };
  const visible = binding !== null && stored.scope === binding && stored.storage === storage;
  return { ready: visible && stored.ready, entry: visible ? stored.entry : null, expired: visible ? stored.expired : null, error: visible ? stored.error : '', persist, clear, isCurrent,
    retry: () => { if (bound()) refresh(); } };
}
