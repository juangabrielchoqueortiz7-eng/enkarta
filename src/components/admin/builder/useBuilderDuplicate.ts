'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { InvitationParsed } from '@/lib/types';
import { isUuid } from '@/lib/rsvp-contract';
import { PARTNER_REQUEST_TIMEOUT_MS, partnerRequest } from '@/lib/partner-checkout';

const UNCERTAIN = 'No pudimos confirmar la copia. Revisa tus invitaciones antes de volver a duplicar.';
const REJECTED = 'No se pudo duplicar la invitación. Revisa los datos antes de intentarlo de nuevo.';
type Phase = 'pending' | 'created' | 'uncertain';
type DuplicateState = { phase: Phase; message: string; href?: string };
type Attempt = {
  phase: Phase; controller: AbortController; startedAt: number;
  rejection?: { message: string };
};
interface Options {
  sourceId: string;
  builderPath: string;
  snapshot: () => InvitationParsed;
  sequence: () => number;
  dirty: () => boolean;
  canStart: () => boolean;
  navigate: (href: string) => void;
}

/** This operation creates a new row; cancellation cannot undo an accepted POST. */
export function useBuilderDuplicate(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const mounted = useRef(false), operation = useRef<Attempt | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateState | null>(null);
  const [duplicateError, setDuplicateError] = useState('');
  useEffect(() => {
    mounted.current = true;
    const pending = operation.current;
    // React 18 can replay setup without rendering. Never resume an aborted POST.
    if (pending?.phase === 'pending' && pending.controller.signal.aborted) {
      if (pending.rejection) {
        operation.current = null; setDuplicate(null); setDuplicateError(pending.rejection.message);
      } else {
        pending.phase = 'uncertain'; setDuplicate({ phase: 'uncertain', message: UNCERTAIN });
      }
    }
    return () => { mounted.current = false; operation.current?.controller.abort(); };
  }, [options.sourceId, options.builderPath]);

  const handleDuplicate = useCallback(async () => {
    const scope = latest.current;
    if (!mounted.current || operation.current || !scope.canStart() || scope.snapshot().id !== scope.sourceId) return;
    const attempt: Attempt = { phase: 'pending', controller: new AbortController(), startedAt: Date.now() };
    // Acquire before confirm as well as before the first await.
    operation.current = attempt;
    const current = () => mounted.current && operation.current === attempt && !attempt.controller.signal.aborted
      && latest.current.sourceId === scope.sourceId && latest.current.builderPath === scope.builderPath
      && latest.current.snapshot().id === scope.sourceId;
    let sent = false;
    try {
      document.activeElement?.closest<HTMLElement>('[data-edit-key][contenteditable="true"]')?.blur();
      if (!confirm('¿Duplicar esta invitación? Se creará una copia como borrador con el mismo diseño.')
        || !current() || !latest.current.canStart()) {
        if (operation.current === attempt) operation.current = null;
        return;
      }
      const data = latest.current.snapshot(), editedAt = latest.current.sequence();
      const slug = `${data.slug}-copia-${crypto.randomUUID()}`;
      const payload = JSON.stringify({
        slug, status: 'draft', template: data.template, type: data.type,
        names: data.names, event_date: data.event_date, rsvp_deadline: data.rsvp_deadline,
        ceremony_time: data.ceremony_time, ceremony_place: data.ceremony_place, ceremony_address: data.ceremony_address,
        reception_time: data.reception_time, reception_place: data.reception_place, reception_address: data.reception_address,
        guest_name: data.guest_name, guest_passes: data.guest_passes, message: data.message,
        dress_code: data.dress_code, no_kids: data.no_kids,
        parents_groom: data.parents_groom, parents_bride: data.parents_bride,
        sponsors: data.sponsors, itinerary: data.itinerary,
        gift_message: data.gift_message, bank_account: data.bank_account,
        cover_image_url: data.cover_image_url, gallery_url: data.gallery_url,
        color_primary: data.color_primary, color_secondary: data.color_secondary, color_accent: data.color_accent,
        phone_whatsapp: data.phone_whatsapp, builder_config: data.config ?? {},
      });
      setDuplicateError('');
      setDuplicate({ phase: 'pending', message: 'Duplicando invitación… Espera la respuesta antes de crear otra copia.' });
      attempt.startedAt = Date.now();
      sent = true;
      const result = await partnerRequest<{ id: string; slug: string; status: string }>('/api/admin/invitations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, signal: attempt.controller.signal,
      }, async (url, init) => {
        const response = await fetch(url, init);
        // This route rejects all 4xx before inserting. Observe headers even if
        // the explanatory JSON is unreadable or exceeds the shared deadline.
        if (current() && !init?.signal?.aborted && Date.now() - attempt.startedAt < PARTNER_REQUEST_TIMEOUT_MS
          && response.status >= 400 && response.status < 500) {
          attempt.rejection = { message: REJECTED };
          const body = await response.json().catch(() => null);
          if (current() && !init?.signal?.aborted && Date.now() - attempt.startedAt < PARTNER_REQUEST_TIMEOUT_MS
            && typeof body?.error === 'string') attempt.rejection.message = body.error;
          return Response.json(body ?? null, { status: response.status });
        }
        return response;
      });
      if (!current()) return;
      if (!isUuid(result.id) || result.id === scope.sourceId || result.slug !== slug || result.status !== 'draft') throw new Error('Unverified copy');
      attempt.phase = 'created';
      const href = `${scope.builderPath}/${result.id}`;
      setDuplicate({ phase: 'created', href, message: 'Copia creada. Puedes abrirla en otra pestaña y conservar este editor.' });
      // Next navigation does not trigger beforeunload. Keep original unsaved
      // work here, including edits made while the creation was pending.
      if (latest.current.sequence() !== editedAt || latest.current.dirty() || !latest.current.canStart()) return;
      try { latest.current.navigate(href); }
      catch { setDuplicate({ phase: 'created', href, message: 'La copia se creó, pero no pudimos abrirla. Usa «Abrir copia» para continuar.' }); }
    } catch {
      if (!current()) return;
      if (!sent || attempt.rejection) {
        operation.current = null; setDuplicate(null); setDuplicateError(attempt.rejection?.message ?? REJECTED);
      } else {
        attempt.phase = 'uncertain'; setDuplicate({ phase: 'uncertain', message: UNCERTAIN });
      }
    } finally {
      attempt.controller.abort();
    }
  }, []);

  return { handleDuplicate, duplicate, duplicateError };
}
