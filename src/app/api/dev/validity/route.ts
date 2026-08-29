import type { NextRequest } from 'next/server';
import { addDays, invitationValidity, parseValidityCommand, type ValidityCommand, type ValidityEvent, type ValiditySource } from '@/lib/invitation-validity';
import { eventDay, isUuid } from '@/lib/rsvp-contract';
import { newServiceContract } from '@/lib/packages';
import { privateJson, serviceBody } from '@/lib/services-server';

/** In-memory UI fixture only. This route never imports a database client. */
interface Fixture { source: ValiditySource; history: ValidityEvent[]; commands: Map<string, string>; failAfterSave: boolean; at: number }
const fixtures = new Map<string, Fixture>();
function fixture(id: string) {
  for (const [key, value] of Array.from(fixtures)) if (Date.now() - value.at > 3600000) fixtures.delete(key);
  if (fixtures.size > 20) fixtures.clear();
  if (!fixtures.has(id)) fixtures.set(id, { source: { event_date: addDays(eventDay(), -84), expires_at: addDays(eventDay(), 6), validity_mode: 'automatic', validity_extra_days: 0, validity_revision: 1, status: 'ready', is_active: true, config: newServiceContract({}, 'exclusive') }, history: [], commands: new Map(), failAfterSave: false, at: Date.now() });
  return fixtures.get(id)!;
}
const snapshot = (f: Fixture) => ({ validity: invitationValidity(f.source), history: [...f.history].reverse() });
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return privateJson({ error: 'No disponible' }, 404);
  const id = new URL(request.url).searchParams.get('id');
  return isUuid(id) ? privateJson(snapshot(fixture(id))) : privateJson({}, 400);
}
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return privateJson({ error: 'No disponible' }, 404);
  try {
    const body = await serviceBody(request);
    if (!isUuid(body.id)) throw new Error('INVALID_INPUT');
    const f = fixture(body.id);
    if (body.action === 'fail_next') { f.failAfterSave = true; return privateJson({ ok: true }); }
    if (body.action === 'reset') { fixtures.delete(body.id); return privateJson(snapshot(fixture(body.id))); }
    if (body.action === 'legacy') { f.source.validity_mode = 'legacy'; f.source.expires_at = null; f.source.validity_revision!++; return privateJson(snapshot(f)); }
    if (body.action === 'reschedule') {
      f.source.event_date = addDays(f.source.event_date!, 14);
      f.source.validity_revision!++;
      f.source.expires_at = invitationValidity(f.source, eventDay(), true).expiresAt;
      return privateJson(snapshot(f));
    }
    const command: ValidityCommand = parseValidityCommand(body);
    if (f.commands.has(command.requestId)) return f.commands.get(command.requestId) === JSON.stringify(command) ? privateJson({ ...snapshot(f), replayed: true }) : privateJson({ error: 'Solicitud reutilizada' }, 409);
    if (command.expectedRevision !== f.source.validity_revision) return privateJson({ error: 'La fecha cambió en otra sesión. Actualiza y revisa el plazo.', code: 'STALE_VALIDITY' }, 409);
    const before = f.source.expires_at;
    if (command.action === 'extend') {
      if (!before) return privateJson({ error: 'Falta la fecha de vencimiento.' }, 409);
      f.source.expires_at = addDays(before, command.days!);
      if (f.source.validity_mode === 'automatic') f.source.validity_extra_days! += command.days!;
    } else if (command.action === 'activate') {
      f.source.validity_mode = 'automatic';
      f.source.expires_at = invitationValidity(f.source, eventDay(), true).expiresAt;
    } else f.source.expires_at = command.expiresAt;
    f.source.validity_revision!++;
    f.history.push({ id: command.requestId, action: command.action, days: command.days, reason: command.reason, before_expires_at: before, after_expires_at: f.source.expires_at, before_revision: command.expectedRevision, after_revision: f.source.validity_revision!, created_at: new Date().toISOString() });
    f.commands.set(command.requestId, JSON.stringify(command));
    if (f.failAfterSave) { f.failAfterSave = false; return privateJson({ error: 'Simulación: la respuesta se perdió después de guardar.' }, 503); }
    return privateJson({ ...snapshot(f), replayed: false });
  } catch { return privateJson({ error: 'Solicitud inválida' }, 400); }
}
