'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GuestImportRow } from '@/lib/guest-import';
import { clearGuestImport, GuestImportError, guestImportStorageKey, restoreGuestImport, submitGuestImport, type GuestImportOperation, type GuestImportReceipt } from '@/lib/guest-import-operation';

export function useGuestImport(invitationId: string, transport: typeof fetch = fetch) {
  const [pending, setPending] = useState<GuestImportOperation | null>(null);
  const [busy, setBusy] = useState(false), [ready, setReady] = useState(false);
  const [error, setError] = useState(''), [persisted, setPersisted] = useState(false);
  const operation = useRef<GuestImportOperation | null>(null), lock = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let recovered = null;
    try { recovered = restoreGuestImport(sessionStorage.getItem(guestImportStorageKey(invitationId)), invitationId); }
    catch { /* Memory recovery remains available when browser storage is disabled. */ }
    operation.current = recovered; setPending(recovered); setPersisted(!!recovered); setReady(true);
    return () => { mounted.current = false; };
  }, [invitationId]);
  const submit = useCallback(async (rows?: GuestImportRow[]): Promise<GuestImportReceipt | null> => {
    if (lock.current || !ready) return null;
    const attempt = operation.current ?? (rows?.length ? { invitationId, requestId: crypto.randomUUID(), guests: JSON.parse(JSON.stringify(rows)) as GuestImportRow[] } : null);
    if (!attempt) return null;
    const recovering = operation.current !== null;
    lock.current = true; operation.current = attempt; setPending(attempt); setBusy(true); setError('');
    try { sessionStorage.setItem(guestImportStorageKey(invitationId), JSON.stringify(attempt)); setPersisted(true); }
    catch { setPersisted(false); }
    const clear = () => {
      if (operation.current?.requestId === attempt.requestId) operation.current = null;
      // If the panel closed before acknowledgement, preserve the draft so the
      // next mounted panel can recover and display the result to the user.
      if (mounted.current) {
        try { clearGuestImport(sessionStorage, invitationId, attempt.requestId); } catch { /* No persistent draft. */ }
        setPending(current => current?.requestId === attempt.requestId ? null : current);
      }
    };
    try {
      const receipt = await submitGuestImport(attempt, transport);
      clear(); return receipt;
    } catch (failure) {
      // A refusal on the FIRST attempt confirms there was no write. After an
      // uncertain attempt, a later permission/plan error cannot prove that.
      if (!recovering && failure instanceof GuestImportError && !failure.uncertain) clear();
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'No pudimos comprobar el resultado. Recupera el lote.');
      return null;
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }, [invitationId, ready, transport]);
  return { pending, busy, ready, error, persisted, submit };
}

export default function GuestImportRecovery({ importer, recovered, disabled = false }: {
  importer: ReturnType<typeof useGuestImport>; recovered: (result: GuestImportReceipt) => void; disabled?: boolean;
}) {
  if (!importer.pending && !importer.error) return null;
  return <div role="status" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
    {importer.pending && <><p className="font-medium">{importer.busy ? 'Comprobando importación…' : 'Importación por comprobar'} · {importer.pending.guests.length} {importer.pending.guests.length === 1 ? 'invitado' : 'invitados'}</p>
      <p>Conservamos el lote original. Recuperar su resultado no vuelve a crear los invitados ya guardados.</p>
      {!importer.persisted && <p>Mantén este panel abierto: el navegador no permitió conservar la recuperación al recargar.</p>}
      <button type="button" disabled={importer.busy || disabled} onClick={async () => { const result = await importer.submit(); if (result) recovered(result); }} className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-medium disabled:opacity-40">{importer.busy ? 'Comprobando…' : 'Recuperar resultado del lote'}</button></>}
    {importer.error && <p>{importer.error}</p>}
  </div>;
}
