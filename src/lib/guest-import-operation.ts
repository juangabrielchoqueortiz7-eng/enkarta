import type { Guest } from './types';
import type { GuestImportRow } from './guest-import';
import { isRevision, isUuid } from './rsvp-contract';

export interface GuestImportOperation { invitationId: string; requestId: string; guests: GuestImportRow[] }
export interface GuestImportReceipt { guests: Guest[]; replayed: boolean; importedCount: number; missingCount: number }
export class GuestImportError extends Error {
  constructor(message: string, readonly uncertain: boolean, readonly status?: number) { super(message); }
}
export const guestImportStorageKey = (id: string) => `enkarta:guest-import:v1:${id}`;

/** A private, tab-scoped recovery draft contains input only, never QR tokens or credentials. */
export function restoreGuestImport(value: string | null, invitationId: string): GuestImportOperation | null {
  if (!value || value.length > 131072) return null;
  try {
    const operation = JSON.parse(value);
    if (operation.invitationId !== invitationId || !isUuid(operation.requestId) || !Array.isArray(operation.guests)
      || operation.guests.length < 1 || operation.guests.length > 200
      || operation.guests.some((row: GuestImportRow) => !row || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 80
        || !Number.isInteger(row.passes) || row.passes < 1 || row.passes > 20)) return null;
    return operation;
  } catch { return null; }
}

/** A late acknowledgement must never remove a newer recovery draft. */
export function clearGuestImport(storage: Pick<Storage, 'getItem' | 'removeItem'>, invitationId: string, requestId: string) {
  const key = guestImportStorageKey(invitationId);
  if (restoreGuestImport(storage.getItem(key), invitationId)?.requestId === requestId) storage.removeItem(key);
}

/** The caller must retain this EXACT operation until the server acknowledges it. */
export async function submitGuestImport(operation: GuestImportOperation, transport: typeof fetch = fetch): Promise<GuestImportReceipt> {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
  try {
    let response: Response;
    try {
      response = await transport('/api/guests', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation), signal: controller.signal });
    } catch { throw new GuestImportError('No pudimos comprobar la importación. Recupera el resultado antes de añadir otra lista.', true); }
    let result;
    try { result = await response.json(); }
    catch { throw new GuestImportError('La respuesta llegó incompleta. Recupera el resultado del mismo lote.', true); }
    if (!response.ok) throw new GuestImportError(result?.error || 'No se pudo importar la lista.', response.status >= 500 || response.status === 429, response.status);
    if (result?.requestId !== operation.requestId || !Array.isArray(result.guests) || typeof result.replayed !== 'boolean'
      || !Number.isSafeInteger(result.importedCount) || result.importedCount !== operation.guests.length
      || !Number.isSafeInteger(result.missingCount) || result.missingCount < 0 || result.missingCount > result.importedCount
      || result.guests.length + result.missingCount !== result.importedCount
      || new Set(result.guests.map((guest: Guest) => guest?.id)).size !== result.guests.length
      || result.guests.some((guest: Guest) => !isUuid(guest?.id) || !isRevision(guest.responseRevision))) {
      throw new GuestImportError('No pudimos verificar el resultado. Conservamos el lote para recuperarlo.', true);
    }
    return { guests: result.guests, replayed: result.replayed, importedCount: result.importedCount, missingCount: result.missingCount };
  } finally { clearTimeout(timeout); }
}

export function guestImportMessage(result: GuestImportReceipt) {
  return `${result.replayed ? 'Importación recuperada' : 'Importación guardada'}: ${result.importedCount} ${result.importedCount === 1 ? 'invitado' : 'invitados'}.`
    + (result.missingCount ? ` ${result.missingCount} ya no ${result.missingCount === 1 ? 'está' : 'están'} en la lista; no se ${result.missingCount === 1 ? 'volvió' : 'volvieron'} a crear.` : '');
}
