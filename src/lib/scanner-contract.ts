import type { Attendee, Guest } from './types';
import { isRevision, isUuid } from './rsvp-contract';

export type ScannerGroup = { invitationId: string; guest: Pick<Guest, 'id' | 'name' | 'tableNo' | 'accessCode'>; attendees: Attendee[] };
export interface ScanOperation { attendeeId: string; action: 'in' | 'out'; expectedRevision: number; requestId: string }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const optionalText = (value: unknown) => value === undefined || value === null || typeof value === 'string';

function attendee(value: unknown): Attendee | null {
  if (!object(value) || !isUuid(value.id) || !isUuid(value.guestId) || !isRevision(value.revision)
    || !Number.isInteger(value.seatNo) || Number(value.seatNo) < 1 || Number(value.seatNo) > 20
    || (value.state !== 'in' && value.state !== 'out') || !optionalText(value.label)
    || !optionalText(value.checkedInAt) || !optionalText(value.checkedOutAt)) return null;
  return { id: value.id, guestId: value.guestId, seatNo: Number(value.seatNo), revision: value.revision,
    state: value.state as 'in' | 'out', label: value.label as string | undefined,
    checkedInAt: value.checkedInAt as string | undefined, checkedOutAt: value.checkedOutAt as string | undefined };
}

/** An HTTP 200 alone is not proof that the displayed passes are safe to use. */
export function parseScannerGroup(value: unknown, expectedGuestId?: string, expectedInvitationId?: string): ScannerGroup {
  const invalid = () => new Error('No pudimos verificar los pases. Consulta de nuevo el grupo antes de registrar ingresos.');
  if (!object(value) || !isUuid(value.invitationId) || (expectedInvitationId && value.invitationId !== expectedInvitationId)
    || !object(value.guest) || !isUuid(value.guest.id)
    || (expectedGuestId && value.guest.id !== expectedGuestId) || typeof value.guest.name !== 'string'
    || !optionalText(value.guest.tableNo) || !optionalText(value.guest.accessCode)
    || !Array.isArray(value.attendees) || value.attendees.length > 20) throw invalid();
  const guest = value.guest;
  const ids = new Set<string>(), seats = new Set<number>();
  const attendees = value.attendees.map(item => {
    const parsed = attendee(item);
    if (!parsed || parsed.guestId !== guest.id || ids.has(parsed.id) || seats.has(parsed.seatNo)) throw invalid();
    ids.add(parsed.id); seats.add(parsed.seatNo); return parsed;
  }).sort((a, b) => a.seatNo - b.seatNo);
  return { invitationId: value.invitationId, guest: { id: value.guest.id, name: value.guest.name, tableNo: value.guest.tableNo as string | undefined,
    accessCode: value.guest.accessCode as string | undefined }, attendees };
}

export class ScanRequestError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}
export const scanFailureIsDefinitive = (failure: unknown, recovering: boolean) => !recovering && failure instanceof ScanRequestError && !failure.retryable;

/** Replays may return a newer state after another operator's later movement. */
export function parseScanReceipt(value: unknown, operation: ScanOperation, before: Pick<Attendee, 'id' | 'guestId' | 'seatNo'>) {
  const result = object(value) ? attendee(value.attendee) : null;
  if (!object(value) || value.ok !== true || typeof value.replayed !== 'boolean' || !result
    || result.id !== operation.attendeeId || result.guestId !== before.guestId || result.seatNo !== before.seatNo
    || result.revision <= operation.expectedRevision
    || (!value.replayed && result.revision !== operation.expectedRevision + 1)
    || (result.revision === operation.expectedRevision + 1 && result.state !== operation.action)) {
    throw new ScanRequestError('La confirmación llegó incompleta o no corresponde a este pase. Comprueba el mismo movimiento.', true);
  }
  return { attendee: result, replayed: value.replayed, changedLater: result.revision > operation.expectedRevision + 1 };
}

export async function recordScan(operation: ScanOperation, before: Pick<Attendee, 'id' | 'guestId' | 'seatNo'>, scope: 'host' | 'door', transport: typeof fetch = fetch, binding?: { sessionKey: string; invitationId: string }) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
  try {
    let response: Response;
    try { response = await transport('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(binding ? { 'X-Enkarta-Scanner-Session': binding.sessionKey } : {}) },
      body: JSON.stringify({ attendeeId: operation.attendeeId, action: operation.action, expectedRevision: operation.expectedRevision, requestId: operation.requestId, scope, ...(binding ? { invitationId: binding.invitationId } : {}) }), signal: controller.signal }); }
    catch { throw new ScanRequestError('No pudimos comprobar el resultado. Comprueba el mismo movimiento al recuperar la conexión.', true); }
    let result;
    try { result = await response.json(); } catch { throw new ScanRequestError('La respuesta llegó incompleta. Comprueba el mismo movimiento.', true); }
    if (!response.ok) throw new ScanRequestError(typeof result?.error === 'string' ? result.error : 'No se pudo registrar el movimiento.', response.status >= 500 || response.status === 429);
    return parseScanReceipt(result, operation, before);
  } finally { clearTimeout(timeout); }
}
