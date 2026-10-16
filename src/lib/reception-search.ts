export interface ReceptionMatch { id: string; name: string; tableNo?: string; passes: number }
export type ReceptionSearchField = 'name' | 'table';

/** Treat %, _ and backslashes as literal text, never as SQL LIKE wildcards. */
export function receptionSearch(query: string, field: string) {
  const term = query.trim();
  if (!['name', 'table'].includes(field) || term.length < (field === 'table' ? 1 : 2)
    || term.length > (field === 'table' ? 20 : 80) || /[\x00-\x1f\x7f]/.test(term)) throw new Error('INVALID_INPUT');
  const literal = term.replace(/[\\%_]/g, '\\$&');
  return { field: field as ReceptionSearchField, pattern: field === 'table' ? literal : `%${literal}%` };
}

export async function findReceptionGuests(invitationId: string, scope: 'host' | 'door', query: string, field: ReceptionSearchField, signal: AbortSignal, transport: typeof fetch = fetch) {
  receptionSearch(query, field);
  const params = new URLSearchParams({ invitationId, scope, q: query.trim(), field });
  let response: Response;
  try { response = await transport(`/api/checkin/search?${params}`, { cache: 'no-store', signal }); }
  catch (error) { if (signal.aborted) throw error; throw new Error('Sin conexión. Comprueba la red y vuelve a buscar.'); }
  let result;
  try { result = await response.json(); }
  catch { throw new Error('La respuesta llegó incompleta. Vuelve a buscar antes de elegir un grupo.'); }
  if (!response.ok) throw new Error(result?.error || 'No se pudo buscar en el evento.');
  if (!Array.isArray(result?.guests) || result.guests.length > 20 || typeof result.hasMore !== 'boolean'
    || result.guests.some((guest: ReceptionMatch) => !guest || typeof guest.id !== 'string' || typeof guest.name !== 'string' || !Number.isInteger(guest.passes) || guest.passes < 1 || guest.passes > 20)) throw new Error('No se pudo verificar la búsqueda. Vuelve a consultar.');
  return result as { guests: ReceptionMatch[]; hasMore: boolean };
}
