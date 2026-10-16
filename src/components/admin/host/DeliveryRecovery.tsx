'use client';
import { useEffect, useRef, useState } from 'react';
import type { Guest } from '@/lib/types';
import type { DeliveryAction } from '@/lib/guest-delivery';
import { clearDeliveryRecovery, deliveryFailureIsDefinitive, deliveryRecoveryKey, restoreDeliveryRecovery, saveDeliveryRecovery } from '@/lib/delivery-recovery';
import { trackGuestDelivery, type DeliveryOperation } from '@/lib/whatsapp-queue';
import styles from '../operations/Operations.module.css';

type Attempt = { guest: Guest | null; operation: DeliveryOperation };
type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const recoveryEvent = 'enkarta:delivery-recovery';

export function useDeliveryTracking(saved: (guest: Guest, submitted: Guest | null, operation: DeliveryOperation) => void,
  settled?: () => void, transport: typeof fetch = fetch, invitationId?: string, storage?: RecoveryStorage) {
  const [pending, setPending] = useState<Attempt | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [readyScope, setReadyScope] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false), [unreadable, setUnreadable] = useState(false);
  const attempt = useRef<Attempt | null>(null), running = useRef(false);
  const generation = useRef<{ active: boolean }>({ active: false });
  const storageBacked = useRef(false);
  const ready = readyScope === (invitationId ?? 'memory');
  useEffect(() => {
    const currentGeneration = { active: true }; generation.current = currentGeneration;
    attempt.current = null; storageBacked.current = false; setPending(null); setError(''); setPersisted(false); setUnreadable(false);
    const restore = () => {
      if (running.current || !invitationId) return;
      try {
        const raw = (storage ?? sessionStorage).getItem(deliveryRecoveryKey(invitationId));
        // A failed storage write leaves the attempt only in memory. Focus/sync must keep it.
        if (!raw && attempt.current && !storageBacked.current) return;
        const operation = restoreDeliveryRecovery(raw, invitationId);
        setUnreadable(!!raw && !operation);
        if (operation?.requestId !== attempt.current?.operation.requestId) {
          attempt.current = operation ? { guest: null, operation } : null;
          setPending(attempt.current);
        }
        storageBacked.current = !!operation; setPersisted(!!operation);
      } catch { setPersisted(false); }
    };
    restore(); setReadyScope(invitationId ?? 'memory');
    window.addEventListener('focus', restore); window.addEventListener(recoveryEvent, restore);
    return () => {
      currentGeneration.active = false;
      window.removeEventListener('focus', restore); window.removeEventListener(recoveryEvent, restore);
    };
  }, [invitationId, storage]);
  useEffect(() => {
    if (!pending || persisted) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pending, persisted]);
  const run = async (current: Attempt, recovering: boolean): Promise<Guest | null> => {
    if (running.current) return null;
    const currentGeneration = generation.current;
    const active = () => currentGeneration.active && generation.current === currentGeneration;
    running.current = true; setBusy(true); setError('');
    const clear = () => {
      // An unmounted panel leaves recovery for the next mount.
      if (!active()) return;
      if (invitationId) {
        try { clearDeliveryRecovery(storage ?? sessionStorage, invitationId, current.operation.requestId); } catch { /* Keep memory outcome. */ }
      }
      attempt.current = null; storageBacked.current = false; setPending(null); setPersisted(false);
      window.dispatchEvent(new Event(recoveryEvent));
    };
    try {
      const result = await trackGuestDelivery(current.operation, transport);
      clear();
      if (active()) saved(result, current.guest, current.operation);
      return active() ? result : null;
    } catch (failure) {
      // A later 403/409 does not prove whether an earlier uncertain write committed.
      if (deliveryFailureIsDefinitive(failure, recovering)) clear();
      if (active()) setError(failure instanceof Error ? failure.message : 'No se pudo comprobar el seguimiento.');
      return null;
    } finally {
      running.current = false;
      if (generation.current.active) setBusy(false);
      window.dispatchEvent(new Event(recoveryEvent));
      if (active()) settled?.();
    }
  };
  const start = async (guest: Guest, action: DeliveryAction, url?: string): Promise<Guest | null> => {
    if (!ready || running.current || attempt.current || unreadable) return null;
    const current: Attempt = { guest: { ...guest }, operation: { guestId: guest.id, action, expectedRevision: guest.responseRevision ?? 0, requestId: crypto.randomUUID() } };
    setError('');
    let stored = false;
    if (invitationId) {
      try {
        if (!saveDeliveryRecovery(storage ?? sessionStorage, invitationId, current.operation)) {
          const raw = (storage ?? sessionStorage).getItem(deliveryRecoveryKey(invitationId));
          const previous = restoreDeliveryRecovery(raw, invitationId);
          attempt.current = previous ? { guest: null, operation: previous } : null;
          storageBacked.current = !!previous; setPending(attempt.current); setUnreadable(!previous); setPersisted(!!previous);
          setError('Hay un seguimiento anterior por comprobar. Recupéralo antes de preparar otro contacto.'); return null;
        }
        stored = true;
      } catch { /* Storage denied or full: retain the exact attempt in memory. */ }
    }
    attempt.current = current; storageBacked.current = stored; setPending(current); setPersisted(stored);
    // Persist synchronously before handing control to the external application.
    if (url) {
      try { window.open(url, '_blank', 'noopener,noreferrer'); }
      catch {
        if (stored && invitationId) { try { clearDeliveryRecovery(storage ?? sessionStorage, invitationId, current.operation.requestId); } catch { /* Recovery remains safe. */ } }
        attempt.current = null; storageBacked.current = false; setPending(null); setPersisted(false);
        setError('No pudimos abrir WhatsApp. Revisa los permisos del navegador o copia el mensaje.'); return null;
      }
    }
    return run(current, false);
  };
  const forget = () => {
    if (running.current || !window.confirm('¿Quitar este reintento de la pestaña? Esto no deshace ningún seguimiento ya guardado. Actualiza y revisa el estado del invitado antes de preparar otro recordatorio.')) return;
    if (invitationId) {
      try {
        if (attempt.current) clearDeliveryRecovery(storage ?? sessionStorage, invitationId, attempt.current.operation.requestId);
        else (storage ?? sessionStorage).removeItem(deliveryRecoveryKey(invitationId));
      } catch { setError('No pudimos quitar el reintento. Mantén el panel abierto y vuelve a comprobarlo.'); return; }
    }
    attempt.current = null; storageBacked.current = false; setPending(null); setPersisted(false); setUnreadable(false);
    setError('Reintento local retirado. Actualiza la lista y revisa el seguimiento antes de preparar otro contacto.'); settled?.();
    window.dispatchEvent(new Event(recoveryEvent));
  };
  return { pending, busy, error, ready, persisted, unreadable, blocked: !ready || busy || !!pending || unreadable, start, forget,
    retry: async () => ready && attempt.current ? run(attempt.current, true) : null };
}

export default function DeliveryRecovery({ tracker, disabled = false }: { tracker: ReturnType<typeof useDeliveryTracking>; disabled?: boolean }) {
  if (!tracker.pending && !tracker.error && !tracker.unreadable) return null;
  return <div className={`${styles.surface} space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950`}>
    <div role="status" aria-atomic="true" className="space-y-2">
      {tracker.pending && <><p className="break-words font-semibold">{tracker.busy ? 'Guardando seguimiento…' : 'Seguimiento por comprobar'}{tracker.pending.guest ? `: ${tracker.pending.guest.name}` : ' de un invitado de este evento'}</p>
        <p>Comprobar conserva la misma acción y no vuelve a abrir WhatsApp ni envía otro mensaje.</p>
        <p>{tracker.persisted ? 'Puedes recargar y recuperar el reintento en esta pestaña. No se comparte con otros dispositivos.' : 'El navegador no permite conservar este reintento. Mantén el panel abierto hasta comprobarlo.'}</p></>}
      {tracker.unreadable && <p>No pudimos leer el reintento guardado. Actualiza y revisa la lista antes de retirarlo; no se enviará una operación desconocida.</p>}
      {tracker.error && <p>{tracker.error}</p>}
    </div>
    {tracker.pending && !tracker.busy && <button type="button" disabled={disabled} onClick={() => void tracker.retry()} className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-medium hover:bg-amber-100 disabled:opacity-40">Reintentar solo el seguimiento</button>}
    {(tracker.pending || tracker.unreadable) && !tracker.busy && <details><summary className="min-h-11 cursor-pointer py-3 underline underline-offset-4">Si no puedes recuperar el resultado</summary><p className="mb-2">Quitar el reintento no deshace lo guardado en el servidor. Revisa el estado actual antes de continuar.</p><button type="button" disabled={disabled} onClick={tracker.forget} className="min-h-11 rounded-lg border border-amber-300 px-3 hover:bg-amber-100 disabled:opacity-40">Quitar solo el reintento local</button></details>}
  </div>;
}
