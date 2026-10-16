import { isUuid } from './rsvp-contract';

export interface ReceptionMatch { id: string; name: string; tableNo?: string; passes: number }
export type ReceptionSearchField = 'name' | 'table';
export interface ReceptionSearchResult { invitationId: string; guests: ReceptionMatch[]; hasMore: boolean }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Keep only the reception DTO, and never display a reply belonging to another event. */
export function parseReceptionSearch(value: unknown, invitationId: string): ReceptionSearchResult {
  const invalid = () => new Error('No se pudo verificar la búsqueda. Vuelve a consultar antes de elegir un grupo.');
  if (!isUuid(invitationId) || !object(value) || value.invitationId !== invitationId
    || !Array.isArray(value.guests) || value.guests.length > 20 || typeof value.hasMore !== 'boolean') throw invalid();
  const ids = new Set<string>();
  const guests = value.guests.map(guest => {
    if (!object(guest) || !isUuid(guest.id) || ids.has(guest.id.toLowerCase())
      || typeof guest.name !== 'string' || !guest.name.trim()
      || (guest.tableNo !== undefined && typeof guest.tableNo !== 'string')
      || !Number.isInteger(guest.passes) || Number(guest.passes) < 1 || Number(guest.passes) > 20) throw invalid();
    ids.add(guest.id.toLowerCase());
    return { id: guest.id, name: guest.name, passes: Number(guest.passes), ...(guest.tableNo === undefined ? {} : { tableNo: guest.tableNo as string }) };
  });
  return { invitationId, guests, hasMore: value.hasMore };
}

/** Treat %, _ and backslashes as literal text, never as SQL LIKE wildcards. */
export function receptionSearch(query: string, field: string) {
  const term = query.trim();
  if (!['name', 'table'].includes(field) || term.length < (field === 'table' ? 1 : 2)
    || term.length > (field === 'table' ? 20 : 80) || /[\x00-\x1f\x7f]/.test(term)) throw new Error('INVALID_INPUT');
  const literal = term.replace(/[\\%_]/g, '\\$&');
  return { field: field as ReceptionSearchField, pattern: field === 'table' ? literal : `%${literal}%` };
}

export async function findReceptionGuests(invitationId: string, scope: 'host' | 'door', query: string, field: ReceptionSearchField, signal: AbortSignal, sessionKey: string, transport: typeof fetch = fetch) {
  receptionSearch(query, field);
  if (!isUuid(invitationId) || !['host', 'door'].includes(scope) || !/^[a-f0-9]{64}$/.test(sessionKey)) throw new Error('Actualiza recepción e inicia sesión antes de buscar un grupo.');
  signal.throwIfAborted();
  const params = new URLSearchParams({ invitationId, scope, q: query.trim(), field });
  let response: Response;
  try { response = await transport(`/api/checkin/search?${params}`, { cache: 'no-store', headers: { 'X-Enkarta-Scanner-Session': sessionKey }, signal }); }
  catch (error) { if (signal.aborted) throw error; throw new Error('Sin conexión. Comprueba la red y vuelve a buscar.'); }
  signal.throwIfAborted();
  let result;
  try { result = await response.json(); }
  catch { throw new Error('La respuesta llegó incompleta. Vuelve a buscar antes de elegir un grupo.'); }
  signal.throwIfAborted();
  if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : 'No se pudo buscar en el evento.');
  return parseReceptionSearch(result, invitationId);
}
