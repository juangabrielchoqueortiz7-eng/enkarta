'use client';
import { useEffect, useRef, useState } from 'react';
import type { Guest } from '@/lib/types';
import type { DeliveryAction } from '@/lib/guest-delivery';
import { clearDeliveryRecovery, deliveryFailureIsDefinitive, deliveryRecoveryKey, discardUnreadableDelivery, restoreDeliveryRecovery, saveDeliveryRecovery, DeliveryRecoveryWriteError, type RecoveryStorage } from '@/lib/delivery-recovery';
import { trackGuestDelivery, type DeliveryOperation } from '@/lib/whatsapp-queue';
import styles from '../operations/Operations.module.css';

type Attempt = { guest: Guest | null; operation: DeliveryOperation };
const recoveryEvent = 'enkarta:delivery-recovery';

export function useDeliveryTracking(saved: (guest: Guest, submitted: Guest | null, operation: DeliveryOperation) => void,
  settled?: () => void, transport: typeof fetch = fetch, invitationId?: string, storage?: RecoveryStorage) {
  const [pending, setPending] = useState<Attempt | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [readyScope, setReadyScope] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false), [unreadable, setUnreadable] = useState(false);
  const [recoveryVersion, setRecoveryVersion] = useState(0);
  const attempt = useRef<Attempt | null>(null), running = useRef(false);
  const generation = useRef<{ active: boolean }>({ active: false });
  const storageBacked = useRef(false);
  const storedRaw = useRef<string | null>(null), reload = useRef(() => {});
  const ready = readyScope === (invitationId ?? 'memory');
  useEffect(() => {
    const currentGeneration = { active: true }; generation.current = currentGeneration;
    attempt.current = null; storageBacked.current = false; storedRaw.current = null; setPending(null); setError(''); setPersisted(false); setUnreadable(false);
    const restore = () => {
      if (running.current || !invitationId) return;
      try {
        const raw = (storage ?? sessionStorage).getItem(deliveryRecoveryKey(invitationId));
        if (storedRaw.current !== raw) setRecoveryVersion(value => value + 1);
        storedRaw.current = raw;
        // An absent local copy is not acknowledgement of an uncertain server write.
        if (raw === null && attempt.current) { storageBacked.current = false; setPersisted(false); setUnreadable(false); return; }
        const operation = restoreDeliveryRecovery(raw, invitationId);
        setUnreadable(raw !== null && !operation);
        if (JSON.stringify(operation) !== JSON.stringify(attempt.current?.operation ?? null)) {
          attempt.current = operation ? { guest: null, operation } : null;
          setPending(attempt.current);
        }
        storageBacked.current = !!operation; setPersisted(!!operation);
      } catch { storedRaw.current = null; setUnreadable(true); setPersisted(false); }
    };
    reload.current = restore;
    restore(); setReadyScope(invitationId ?? 'memory');
    window.addEventListener('focus', restore); window.addEventListener(recoveryEvent, restore);
    return () => {
      currentGeneration.active = false;
      reload.current = () => {};
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
      if (!active()) return false;
      if (invitationId) {
        try {
          if (!clearDeliveryRecovery(storage ?? sessionStorage, invitationId, current.operation)) {
            setError('La recuperación guardada cambió. No se retiró ningún seguimiento; vuelve a leerla antes de continuar.'); return false;
          }
        } catch {
          setError('El resultado se comprobó, pero no pudimos retirar su reintento local. Mantén esta pantalla abierta y vuelve a comprobarlo.'); return false;
        }
      }
      attempt.current = null; storageBacked.current = false; setPending(null); setPersisted(false);
      window.dispatchEvent(new Event(recoveryEvent));
      return true;
    };
    try {
      const result = await trackGuestDelivery(current.operation, transport);
      if (!clear()) return null;
      if (active()) saved(result, current.guest, current.operation);
      return active() ? result : null;
    } catch (failure) {
      // A later 403/409 does not prove whether an earlier uncertain write committed.
      if (deliveryFailureIsDefinitive(failure, recovering) && !clear()) return null;
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
      } catch (failure) {
        if (!(failure instanceof DeliveryRecoveryWriteError)) {
          storedRaw.current = null; setUnreadable(true);
          setError('No pudimos consultar la recuperación guardada. Vuelve a leerla antes de preparar otro contacto.'); return null;
        }
        // Only a failed write AFTER a verified read permits memory-only recovery.
      }
    }
    attempt.current = current; storageBacked.current = stored; setPending(current); setPersisted(stored);
    // Persist synchronously before handing control to the external application.
    if (url) {
      try { window.open(url, '_blank', 'noopener,noreferrer'); }
      catch {
        if (invitationId) {
          try { if (!clearDeliveryRecovery(storage ?? sessionStorage, invitationId, current.operation)) { setError('No se abrió WhatsApp y la recuperación cambió. Vuelve a leerla antes de continuar.'); return null; } }
          catch { setError('No se abrió WhatsApp y no pudimos retirar su reintento local. Vuelve a leer la recuperación antes de continuar.'); return null; }
        }
        attempt.current = null; storageBacked.current = false; setPending(null); setPersisted(false);
        setError('No pudimos abrir WhatsApp. Revisa los permisos del navegador o copia el mensaje.'); return null;
      }
    }
    return run(current, false);
  };
  const forget = (acknowledged: boolean) => {
    if (!ready || running.current || !acknowledged) return false;
    if (invitationId) {
      try {
        const removed = attempt.current ? clearDeliveryRecovery(storage ?? sessionStorage, invitationId, attempt.current.operation)
          : storedRaw.current !== null && discardUnreadableDelivery(storage ?? sessionStorage, invitationId, storedRaw.current);
        if (!removed) { setError('La recuperación cambió o no se pudo leer. Vuelve a leerla antes de retirarla.'); return false; }
      } catch { setError('No pudimos quitar el reintento. Mantén el panel abierto y vuelve a leerlo.'); return false; }
    }
    attempt.current = null; storageBacked.current = false; setPending(null); setPersisted(false); setUnreadable(false);
    setError('Reintento local retirado. Actualiza la lista y revisa el seguimiento antes de preparar otro contacto.'); settled?.();
    window.dispatchEvent(new Event(recoveryEvent));
    return true;
  };
  return { pending, busy, error, ready, persisted, unreadable, recoveryVersion, blocked: !ready || busy || !!pending || unreadable, start, forget, reload: () => reload.current(),
    retry: async () => ready && !unreadable && attempt.current ? run(attempt.current, true) : null };
}

export default function DeliveryRecovery({ tracker, disabled = false }: { tracker: ReturnType<typeof useDeliveryTracking>; disabled?: boolean }) {
  const [acknowledged, setAcknowledged] = useState(false);
  useEffect(() => setAcknowledged(false), [tracker.pending?.operation.requestId, tracker.unreadable, tracker.recoveryVersion]);
  if (!tracker.pending && !tracker.error && !tracker.unreadable) return null;
  return <div className={`${styles.surface} space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950`}>
    <div role="status" aria-atomic="true" className="space-y-2">
      {tracker.pending && <><p className="break-words font-semibold">{tracker.busy ? 'Guardando seguimiento…' : 'Seguimiento por comprobar'}{tracker.pending.guest ? `: ${tracker.pending.guest.name}` : ' de un invitado de este evento'}</p>
        <p>Comprobar conserva la misma acción y no vuelve a abrir WhatsApp ni envía otro mensaje.</p>
        <p>{tracker.persisted ? 'Puedes recargar y recuperar el reintento en esta pestaña. No se comparte con otros dispositivos.' : 'El navegador no permite conservar este reintento. Mantén el panel abierto hasta comprobarlo.'}</p></>}
      {tracker.unreadable && <p>No pudimos leer una recuperación válida. No prepares otro contacto hasta volver a leerla o retirar explícitamente la copia dañada. No se enviará una operación desconocida.</p>}
      {tracker.error && <p>{tracker.error}</p>}
    </div>
    {(tracker.pending || tracker.unreadable) && !tracker.busy && <button type="button" disabled={disabled} onClick={tracker.reload} className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-medium hover:bg-amber-100 disabled:opacity-40">Volver a leer recuperación de WhatsApp</button>}
    {tracker.pending && !tracker.busy && <button type="button" disabled={disabled || tracker.unreadable} onClick={() => void tracker.retry()} className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-medium hover:bg-amber-100 disabled:opacity-40">Reintentar solo el seguimiento</button>}
    {(tracker.pending || tracker.unreadable) && !tracker.busy && <details><summary className="min-h-11 cursor-pointer py-3 underline underline-offset-4">Si no puedes recuperar el resultado</summary><p className="mb-2">Quitar el reintento no deshace lo guardado en el servidor. Actualiza y revisa el seguimiento antes de preparar otro recordatorio.</p><label className="flex min-h-11 cursor-pointer items-start gap-2 py-2"><input type="checkbox" name="discard-delivery-acknowledged" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" />Entiendo que retirarlo no cancela ni revierte seguimientos del servidor.</label><button type="button" disabled={disabled || !acknowledged} onClick={() => { if (tracker.forget(acknowledged)) setAcknowledged(false); }} className="min-h-11 rounded-lg border border-amber-300 px-3 hover:bg-amber-100 disabled:opacity-40">Quitar solo el reintento local</button></details>}
  </div>;
}
