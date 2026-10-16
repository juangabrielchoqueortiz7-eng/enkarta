import { isUuid } from './rsvp-contract';

export const HISTORY_PAGE_SIZE = 20;
export type HistoryOperator = 'admin' | 'host' | 'door' | 'unknown';
export interface CheckinMovement {
  id: string;
  action: 'in' | 'out';
  at: string;
  seatNo: number | null;
  label: string;
  operatorRole: HistoryOperator;
}
export interface CheckinHistory {
  invitationId: string;
  guestId: string;
  movements: CheckinMovement[];
  nextCursor: string | null;
  readAt: string;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Preserve PostgreSQL microseconds: truncating to JS milliseconds would skip rows. */
export function historyTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/.exec(value);
  if (!match) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 19) !== match[1]) return null;
  return `${match[1]}.${(match[2] || '').padEnd(6, '0')}Z`;
}
export function movementCursor(movement: Pick<CheckinMovement, 'at' | 'id'>) { return `${movement.at}|${movement.id}`; }
export function parseHistoryCursor(value: string | null): { at: string; id: string } | null {
  if (value === null) return null;
  if (value.length > 80) throw new Error('INVALID_INPUT');
  const [at, id, extra] = value.split('|');
  if (extra !== undefined || historyTimestamp(at) !== at || !isUuid(id) || id !== id.toLowerCase()) throw new Error('INVALID_INPUT');
  return { at, id };
}
export function historyOperator(value: unknown): HistoryOperator {
  if (value === 'admin') return 'admin';
  if (typeof value === 'string') {
    const [role, id, extra] = value.split(':');
    if (extra === undefined && isUuid(id) && (role === 'host' || role === 'door')) return role;
  }
  return 'unknown';
}
export const historyOperatorLabel = (role: HistoryOperator) => ({ admin: 'Equipo Enkarta', host: 'Anfitrión', door: 'Recepción', unknown: 'Operador sin identificar' })[role];

export function parseCheckinHistory(value: unknown, invitationId: string, guestId: string): CheckinHistory {
  const invalid = () => new Error('No pudimos verificar el historial de este grupo. Vuelve a consultarlo.');
  if (!object(value) || value.invitationId !== invitationId || value.guestId !== guestId || !isUuid(invitationId) || !isUuid(guestId)
    || !Array.isArray(value.movements) || value.movements.length > HISTORY_PAGE_SIZE || !historyTimestamp(value.readAt)) throw invalid();
  const ids = new Set<string>();
  let previous = '';
  const movements = value.movements.map(item => {
    if (!object(item) || !isUuid(item.id) || item.id !== item.id.toLowerCase() || historyTimestamp(item.at) !== item.at
      || !['in', 'out'].includes(String(item.action)) || typeof item.label !== 'string' || item.label.length > 500
      || (item.seatNo !== null && (!Number.isInteger(item.seatNo) || Number(item.seatNo) < 1 || Number(item.seatNo) > 20))
      || !['admin', 'host', 'door', 'unknown'].includes(String(item.operatorRole)) || ids.has(item.id)) throw invalid();
    const key = `${item.at}|${item.id}`;
    if (previous && key >= previous) throw invalid();
    previous = key; ids.add(item.id);
    return { id: item.id, at: item.at as string, action: item.action as 'in' | 'out', seatNo: item.seatNo as number | null,
      label: item.label, operatorRole: item.operatorRole as HistoryOperator };
  });
  if (value.nextCursor !== null && (typeof value.nextCursor !== 'string' || movements.length !== HISTORY_PAGE_SIZE
    || value.nextCursor !== movementCursor(movements[movements.length - 1]))) throw invalid();
  return { invitationId, guestId, movements, nextCursor: value.nextCursor as string | null, readAt: historyTimestamp(value.readAt)! };
}

export class HistoryRequestError extends Error {
  constructor(message: string, readonly forbidden = false) { super(message); }
}
export async function readCheckinHistory(binding: { invitationId: string; guestId: string; sessionKey: string; scope: 'host' | 'door' }, cursor: string | null, signal: AbortSignal, transport: typeof fetch = fetch) {
  const params = new URLSearchParams({ guestId: binding.guestId, scope: binding.scope });
  if (cursor) params.set('cursor', cursor);
  const response = await transport(`/api/checkin/history?${params}`, { cache: 'no-store', signal, headers: { 'X-Enkarta-Scanner-Session': binding.sessionKey } });
  if (response.status === 403) throw new HistoryRequestError('Ya no tienes acceso a este historial. Vuelve a iniciar sesión en recepción.', true);
  if (!response.ok) throw new HistoryRequestError('No se pudo consultar el historial. Comprueba tu conexión y vuelve a intentar.');
  return parseCheckinHistory(await response.json(), binding.invitationId, binding.guestId);
}
