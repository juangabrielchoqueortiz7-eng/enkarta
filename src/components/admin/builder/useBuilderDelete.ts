'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { InvitationParsed } from '@/lib/types';
import { isUuid } from '@/lib/rsvp-contract';
import { PARTNER_REQUEST_TIMEOUT_MS, partnerRequest } from '@/lib/partner-checkout';

const UNKNOWN = 'No pudimos confirmar si se eliminó. Revisa tus invitaciones antes de repetir. La operación puede haberse recibido en el servidor.';
const REJECTED = 'La eliminación fue rechazada. Conservamos el borrador en este editor.';
export type BuilderDeletion = {
  phase: 'pending' | 'uncertain' | 'deleted'; names: string; message: string; snapshot: InvitationParsed;
};
interface Attempt {
  controller: AbortController; startedAt: number; sent: boolean; phase: BuilderDeletion['phase'];
  state?: BuilderDeletion; rejection?: { message: string };
}
interface Options {
  sourceId: string; backHref: string;
  snapshot: () => InvitationParsed;
  canStart: () => boolean;
  locked: (value: boolean) => void;
  confirmed: () => void;
  navigate: (href: string) => void;
}

/** One DELETE attempt per editor. Aborting the wait cannot undo a server write. */
export function useBuilderDelete(options: Options) {
  const latest = useRef(options); latest.current = options;
  const operation = useRef<Attempt | null>(null), mounted = useRef(false);
  const [deletion, setDeletion] = useState<BuilderDeletion | null>(null);
  const [deleteError, setDeleteError] = useState('');
  useEffect(() => {
    mounted.current = true;
    const pending = operation.current;
    if (pending?.phase === 'pending' && pending.controller.signal.aborted) {
      if (!pending.sent || pending.rejection) {
        operation.current = null; latest.current.locked(false); setDeletion(null);
        if (pending.rejection) setDeleteError(pending.rejection.message);
      } else if (pending.state) {
        pending.phase = 'uncertain'; pending.state = { ...pending.state, phase: 'uncertain', message: UNKNOWN };
        setDeletion(pending.state);
      }
    }
    return () => { mounted.current = false; operation.current?.controller.abort(); };
  }, [options.sourceId, options.backHref]);

  const handleDelete = useCallback(async () => {
    const scope = latest.current;
    if (!mounted.current || operation.current) return;
    if (!scope.canStart() || scope.snapshot().id !== scope.sourceId || !isUuid(scope.sourceId)) {
      setDeleteError('Espera a que terminen las operaciones en curso antes de eliminar. Esta acción no está disponible en una muestra.');
      return;
    }
    const attempt: Attempt = { controller: new AbortController(), startedAt: Date.now(), sent: false, phase: 'pending' };
    operation.current = attempt;
    const current = () => mounted.current && operation.current === attempt && !attempt.controller.signal.aborted
      && latest.current.sourceId === scope.sourceId && latest.current.backHref === scope.backHref
      && latest.current.snapshot().id === scope.sourceId;
    try {
      document.activeElement?.closest<HTMLElement>('[data-edit-key][contenteditable="true"]')?.blur();
      const name = latest.current.snapshot().names || latest.current.snapshot().slug;
      if (!confirm(`¿Eliminar «${name}» permanentemente? Los cambios sin guardar y las subidas pendientes se descartarán si se confirma la eliminación. Esta acción no se puede deshacer.`)) return;
      if (!current() || !latest.current.canStart()) return;
      const snapshot = JSON.parse(JSON.stringify(latest.current.snapshot())) as InvitationParsed;
      attempt.state = { phase: 'pending', names: snapshot.names || snapshot.slug, snapshot, message: 'Estamos comprobando la eliminación. No se enviará otra solicitud automáticamente.' };
      latest.current.locked(true);
      setDeleteError(''); setDeletion(attempt.state);
      attempt.startedAt = Date.now(); attempt.sent = true;
      const result = await partnerRequest<{ success: boolean }>(`/api/admin/invitations?id=${scope.sourceId}`, {
        method: 'DELETE', signal: attempt.controller.signal,
      }, async (url, init) => {
        const response = await fetch(url, init);
        if (current() && !init?.signal?.aborted && Date.now() - attempt.startedAt < PARTNER_REQUEST_TIMEOUT_MS
          && response.status >= 400 && response.status < 500) {
          // This route returns 4xx only for an unauthorised or aborted deletion.
          attempt.rejection = { message: REJECTED };
          const body = await response.json().catch(() => null);
          if (current() && !init?.signal?.aborted && Date.now() - attempt.startedAt < PARTNER_REQUEST_TIMEOUT_MS && typeof body?.error === 'string') {
            attempt.rejection.message = `${body.error} Conservamos el borrador en este editor.`;
          }
          return Response.json(body ?? null, { status: response.status });
        }
        return response;
      });
      if (!current()) return;
      if (result.success !== true) throw new Error('Unverified deletion');
      attempt.phase = 'deleted';
      attempt.state = { ...attempt.state, phase: 'deleted', message: 'La eliminación fue confirmada. Puedes volver al panel.' };
      latest.current.confirmed(); setDeletion(attempt.state);
      try { latest.current.navigate(scope.backHref); }
      catch { setDeletion({ ...attempt.state, message: 'La invitación se eliminó, pero no pudimos abrir el panel. Usa «Volver al panel».' }); }
    } catch {
      if (!current()) return;
      if (!attempt.sent || attempt.rejection) {
        operation.current = null; latest.current.locked(false); setDeletion(null); setDeleteError(attempt.rejection?.message ?? REJECTED);
      } else if (attempt.state) {
        attempt.phase = 'uncertain'; attempt.state = { ...attempt.state, phase: 'uncertain', message: UNKNOWN }; setDeletion(attempt.state);
      }
    } finally {
      if (!attempt.sent && operation.current === attempt) operation.current = null;
      attempt.controller.abort();
    }
  }, []);
  return { handleDelete, deletion, deleteError };
}
