'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceWhatsAppReview, canClearWhatsAppReview, clearWhatsAppReview, prepareWhatsAppReview, restoreWhatsAppReview, saveWhatsAppReview, whatsappReviewKey, whatsappReviewRecord, type WhatsAppReview } from '@/lib/whatsapp-review';
import type { QueuePurpose } from '@/lib/whatsapp-queue';

type ReviewStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function useWhatsAppReview(invitationId: string, storage?: ReviewStorage) {
  const [state, setState] = useState<{ scope: string; review: WhatsAppReview | null; persisted: boolean; unreadable: boolean } | null>(null);
  const [error, setError] = useState('');
  const [storageNote, setStorageNote] = useState('');
  const current = useRef<WhatsAppReview | null>(null), memoryOnly = useRef(false), scope = useRef(invitationId);
  const storedRaw = useRef<string | null>(null), reload = useRef(() => {});
  const ready = state?.scope === invitationId;
  useEffect(() => {
    scope.current = invitationId; current.current = null; memoryOnly.current = false; storedRaw.current = null; setError(''); setStorageNote('');
    const restore = () => {
      if (memoryOnly.current) return;
      try {
        const raw = (storage ?? sessionStorage).getItem(whatsappReviewKey(invitationId));
        storedRaw.current = raw; setError('');
        const review = restoreWhatsAppReview(raw, invitationId);
        current.current = review;
        setState({ scope: invitationId, review, persisted: !!review, unreadable: !!raw && !review });
      } catch {
        memoryOnly.current = true;
        setState({ scope: invitationId, review: current.current, persisted: false, unreadable: false });
      }
    };
    reload.current = restore;
    restore(); window.addEventListener('focus', restore);
    return () => { window.removeEventListener('focus', restore); };
  }, [invitationId, storage]);

  const commit = useCallback((review: WhatsAppReview) => {
    if (scope.current !== invitationId) return false;
    try { whatsappReviewRecord(invitationId, review); } catch { setError('La lista de revisión no es válida. Vuelve a elegir los contactos.'); return false; }
    let persisted = false;
    if (!memoryOnly.current) {
      try {
        if (!saveWhatsAppReview(storage ?? sessionStorage, invitationId, review)) {
          setError('El progreso guardado cambió o caducó. Cierra la revisión y vuelve a consultar este evento.'); return false;
        }
        persisted = true;
        storedRaw.current = JSON.stringify(whatsappReviewRecord(invitationId, review));
      } catch { memoryOnly.current = true; }
    }
    current.current = review; setState({ scope: invitationId, review, persisted, unreadable: false }); setError(''); return true;
  }, [invitationId, storage]);
  const begin = (ids: string[], purpose: QueuePurpose) => {
    if (!ready || current.current || state?.unreadable) return false;
    return commit({ id: crypto.randomUUID(), ids, purpose, position: 0, prepared: [], revision: 0, updatedAt: Date.now() });
  };
  const prepare = useCallback((id: string) => {
    const review = current.current;
    if (scope.current !== invitationId || !review) return false;
    const next = prepareWhatsAppReview(review, id);
    return next === review ? review.ids.includes(id) : commit(next);
  }, [commit, invitationId]);
  const advance = () => {
    if (!ready || !current.current) return false;
    const next = advanceWhatsAppReview(current.current);
    return next === current.current || commit(next);
  };
  const clear = () => {
    if (!ready) return false;
    let removed = false;
    try {
      const raw = (storage ?? sessionStorage).getItem(whatsappReviewKey(invitationId));
      if (current.current) {
        // A failed write may leave an older copy. Only remove this review's identity.
        const stored = restoreWhatsAppReview(raw, invitationId);
        if (stored && !canClearWhatsAppReview(stored, current.current, memoryOnly.current)) {
          setError('Hay un progreso más reciente. Vuelve a consultar el evento antes de descartarlo.'); return false;
        }
        if (stored) {
          if (!clearWhatsAppReview(storage ?? sessionStorage, invitationId, stored)) { setError('El progreso cambió antes de retirarlo. Vuelve a leerlo.'); return false; }
        }
        else {
          if (raw !== storedRaw.current) { setError('El progreso guardado cambió. Vuelve a leerlo antes de descartarlo.'); return false; }
          (storage ?? sessionStorage).removeItem(whatsappReviewKey(invitationId));
        }
      } else {
        if (raw !== storedRaw.current) { setError('El progreso guardado cambió. Vuelve a leerlo antes de descartarlo.'); return false; }
        (storage ?? sessionStorage).removeItem(whatsappReviewKey(invitationId));
      }
      removed = true;
    } catch {
      if (!memoryOnly.current) { setError('No se pudo retirar el progreso guardado. Mantén esta pantalla abierta e inténtalo de nuevo.'); return false; }
      setStorageNote('Se retiró el progreso de esta pantalla. La copia guardada no se pudo retirar y puede reaparecer al recargar.');
    }
    current.current = null;
    if (removed) { memoryOnly.current = false; storedRaw.current = null; setStorageNote(''); }
    setState({ scope: invitationId, review: null, persisted: false, unreadable: false }); setError(''); return true;
  };
  useEffect(() => {
    if (!ready || !state?.review || state.persisted) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [ready, state]);
  return { review: ready ? state.review : null, ready, persisted: ready && state.persisted, unreadable: ready && state.unreadable,
    error, storageNote, blocked: !ready || !!state?.unreadable || !!error, begin, prepare, advance, clear, reload: () => reload.current() };
}

export default function WhatsAppReviewStatus({ controller, resume, disabled }: {
  controller: ReturnType<typeof useWhatsAppReview>; resume: () => void; disabled: boolean;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const review = controller.review;
  useEffect(() => { setAcknowledged(false); }, [review?.id, controller.unreadable]);
  if (!review && !controller.unreadable && !controller.error) return controller.storageNote ? <p role="status" className="text-sm text-amber-950">{controller.storageNote}</p> : null;
  return <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <p role="status" aria-atomic="true">{review ? `${review.purpose === 'reminder' ? 'Recordatorios' : 'Invitaciones'}: ${review.position} de ${review.ids.length} contactos revisados.` : 'La revisión guardada caducó o no se puede leer.'}</p>
    {review && <><p>{controller.persisted ? 'Puedes continuar en esta pestaña, también después de recargar. El progreso guardado caduca tras 24 horas sin cambios.' : 'El navegador no permite guardar este progreso. Se conserva solo mientras esta pantalla siga abierta.'}</p><button type="button" disabled={disabled || controller.blocked} onClick={resume} className="min-h-11 rounded-xl bg-gray-800 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50">{review.position === review.ids.length ? 'Ver revisión completada' : 'Continuar revisión de WhatsApp'}</button></>}
    {controller.error && <div role="alert"><p>{controller.error}</p><button type="button" disabled={disabled} onClick={controller.reload} className="mt-2 min-h-11 underline underline-offset-4">Volver a leer el progreso guardado</button></div>}
    <details><summary className="flex min-h-11 cursor-pointer items-center underline underline-offset-4">Descartar esta revisión…</summary><p className="mt-2">Solo elimina el orden y progreso local. No deshace seguimientos ni marcas manuales guardadas y no afecta reintentos pendientes.</p><label className="my-2 flex min-h-11 cursor-pointer items-center gap-2"><input name="discard-whatsapp-review" type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} disabled={disabled} className="h-4 w-4 shrink-0 accent-[#516749]" />Entiendo que se perderá el progreso de esta revisión.</label><button type="button" disabled={disabled || !acknowledged} onClick={() => { if (controller.clear()) setAcknowledged(false); }} className="min-h-11 rounded-xl border border-amber-700 px-3 py-2 hover:bg-amber-100 disabled:opacity-50">Descartar solo la revisión</button></details>
  </div>;
}
