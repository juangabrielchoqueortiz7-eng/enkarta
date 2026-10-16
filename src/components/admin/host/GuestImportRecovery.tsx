'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GuestImportRow } from '@/lib/guest-import';
import { clearGuestImport, discardUnreadableGuestImport, GuestImportError, GuestImportWriteError, guestImportStorageKey, restoreGuestImport, saveGuestImport, submitGuestImport, type GuestImportOperation, type GuestImportReceipt, type GuestImportStorage } from '@/lib/guest-import-operation';

export function useGuestImport(invitationId: string, transport: typeof fetch = fetch, storage?: GuestImportStorage) {
  const [pending, setPending] = useState<GuestImportOperation | null>(null);
  const [busy, setBusy] = useState(false), [readyScope, setReadyScope] = useState<string | null>(null);
  const [error, setError] = useState(''), [persisted, setPersisted] = useState(false), [unreadable, setUnreadable] = useState(false);
  const [recoveryVersion, setRecoveryVersion] = useState(0);
  const operation = useRef<GuestImportOperation | null>(null), lock = useRef(false), storageBacked = useRef(false);
  const generation = useRef({ active: false });
  const storedRaw = useRef<string | null>(null), reload = useRef(() => {});
  const ready = readyScope === invitationId;
  useEffect(() => {
    const currentGeneration = { active: true }; generation.current = currentGeneration;
    operation.current = null; storageBacked.current = false; storedRaw.current = null;
    setPending(null); setPersisted(false); setUnreadable(false); setError(''); setBusy(false);
    const restore = () => {
      if (lock.current) return;
      try {
        const raw = (storage ?? sessionStorage).getItem(guestImportStorageKey(invitationId));
        if (storedRaw.current !== raw) setRecoveryVersion(value => value + 1);
        storedRaw.current = raw;
        if (raw === null && operation.current) { storageBacked.current = false; setPersisted(false); setUnreadable(false); return; }
        const recovered = restoreGuestImport(raw, invitationId);
        operation.current = recovered; storageBacked.current = !!recovered;
        setPending(recovered); setPersisted(!!recovered); setUnreadable(raw !== null && !recovered); setError('');
      } catch {
        storedRaw.current = null; setUnreadable(true); setPersisted(false);
        setError('No pudimos leer la recuperación del lote. Vuelve a leerla antes de añadir otra lista.');
      }
    };
    reload.current = restore; restore(); setReadyScope(invitationId);
    window.addEventListener('focus', restore);
    return () => { currentGeneration.active = false; reload.current = () => {}; window.removeEventListener('focus', restore); };
  }, [invitationId, storage]);
  useEffect(() => {
    if (!pending || persisted) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pending, persisted]);
  const submit = useCallback(async (rows?: GuestImportRow[]): Promise<GuestImportReceipt | null> => {
    if (lock.current || !ready || unreadable) return null;
    const attempt = operation.current ?? (rows?.length ? { invitationId, requestId: crypto.randomUUID(), guests: JSON.parse(JSON.stringify(rows)) as GuestImportRow[] } : null);
    if (!attempt) return null;
    const currentGeneration = generation.current;
    const active = () => currentGeneration.active && generation.current === currentGeneration;
    const recovering = operation.current !== null;
    let stored = false;
    try {
      if (!saveGuestImport(storage ?? sessionStorage, attempt)) {
        reload.current(); setError('Hay otro lote por comprobar. Recupera su resultado antes de añadir una lista nueva.'); return null;
      }
      stored = true;
    } catch (failure) {
      if (!(failure instanceof GuestImportWriteError)) {
        storedRaw.current = null; setUnreadable(true);
        setError('No pudimos consultar la recuperación guardada. Vuelve a leerla antes de importar.'); return null;
      }
    }
    lock.current = true; operation.current = attempt; storageBacked.current = stored;
    setPending(attempt); setBusy(true); setError(''); setPersisted(stored);
    const clear = () => {
      // A late reply from another event must leave its stored lot for that event.
      if (!active()) return false;
      try {
        if (!clearGuestImport(storage ?? sessionStorage, invitationId, attempt)) {
          setError('La recuperación guardada cambió. No se retiró ningún lote; vuelve a leerla antes de continuar.'); return false;
        }
      } catch {
        setError('El resultado se comprobó, pero no pudimos retirar su recuperación local. Comprueba el mismo lote de nuevo antes de añadir otra lista.'); return false;
      }
      operation.current = null; storageBacked.current = false; setPending(null); setPersisted(false); return true;
    };
    try {
      const receipt = await submitGuestImport(attempt, transport);
      return clear() ? receipt : null;
    } catch (failure) {
      if (!active()) return null;
      // A later refusal cannot disprove an earlier uncertain write.
      if (!recovering && failure instanceof GuestImportError && !failure.uncertain && !clear()) return null;
      setError(failure instanceof Error ? failure.message : 'No pudimos comprobar el resultado. Recupera el lote.');
      return null;
    } finally { lock.current = false; if (active()) setBusy(false); }
  }, [invitationId, ready, unreadable, transport, storage]);
  const discard = (acknowledged: boolean) => {
    if (!ready || lock.current || !acknowledged || !unreadable || operation.current || storedRaw.current === null) return false;
    try {
      if (!discardUnreadableGuestImport(storage ?? sessionStorage, invitationId, storedRaw.current)) {
        setError('El lote guardado cambió. Vuelve a leerlo antes de retirar la copia dañada.'); return false;
      }
    } catch { setError('No pudimos retirar la copia. Vuelve a leerla cuando el navegador permita acceder.'); return false; }
    storedRaw.current = null; setUnreadable(false);
    setError('Copia local dañada retirada. Actualiza y revisa el padrón antes de volver a importar; esto no elimina invitados del servidor.');
    return true;
  };
  return { pending, busy, ready, error, persisted, unreadable, recoveryVersion, blocked: !ready || busy || !!pending || unreadable, submit,
    reload: () => reload.current(), discard, canDiscard: unreadable && !pending && storedRaw.current !== null };
}

export default function GuestImportRecovery({ importer, recovered, disabled = false }: {
  importer: ReturnType<typeof useGuestImport>; recovered: (result: GuestImportReceipt) => void; disabled?: boolean;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  useEffect(() => setAcknowledged(false), [importer.pending?.requestId, importer.unreadable, importer.recoveryVersion]);
  if (!importer.pending && !importer.error && !importer.unreadable) return null;
  return <div aria-busy={importer.busy} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <div role="status" aria-atomic="true" className="space-y-2">
      {importer.pending && <><p className="font-semibold">{importer.busy ? 'Comprobando importación…' : 'Importación por comprobar'} · {importer.pending.guests.length} {importer.pending.guests.length === 1 ? 'invitado' : 'invitados'}</p><p>Conservamos el lote original. Recuperar su resultado no vuelve a crear los invitados ya guardados.</p>{!importer.persisted && <p>Mantén este panel abierto: el navegador no permitió conservar la recuperación al recargar.</p>}</>}
      {importer.unreadable && <p>No pudimos leer un lote válido. Añadir invitados está bloqueado hasta recuperar el lote o retirar explícitamente su copia dañada.</p>}
      {importer.error && <p>{importer.error}</p>}
    </div>
    {(importer.pending || importer.unreadable) && !importer.busy && <button type="button" disabled={disabled} onClick={importer.reload} className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-medium hover:bg-amber-100 disabled:opacity-40">Volver a leer recuperación del lote</button>}
    {importer.pending && <button type="button" disabled={importer.busy || importer.unreadable || disabled} onClick={async () => { const result = await importer.submit(); if (result) recovered(result); }} className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-medium hover:bg-amber-100 disabled:opacity-40">{importer.busy ? 'Comprobando…' : 'Recuperar resultado del lote'}</button>}
    {importer.canDiscard && <details><summary className="min-h-11 cursor-pointer py-3 underline underline-offset-4">Si la copia del lote está dañada</summary><p>Revisa el padrón antes de importar otra vez. Retirar esta copia no elimina invitados ni cancela una importación que el servidor ya recibió.</p><label className="flex min-h-11 cursor-pointer items-start gap-2 py-2"><input type="checkbox" name="discard-import-acknowledged" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" />Entiendo que debo revisar el padrón antes de repetir la importación.</label><button type="button" disabled={disabled || importer.busy || !acknowledged} onClick={() => { if (importer.discard(acknowledged)) setAcknowledged(false); }} className="min-h-11 rounded-lg border border-amber-300 px-3 hover:bg-amber-100 disabled:opacity-40">Retirar solo la copia dañada del lote</button></details>}
  </div>;
}
