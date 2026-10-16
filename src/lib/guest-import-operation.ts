import type { Guest } from './types';
import type { GuestImportRow } from './guest-import';
import { isRevision, isUuid } from './rsvp-contract';

export interface GuestImportOperation { invitationId: string; requestId: string; guests: GuestImportRow[] }
export interface GuestImportReceipt { guests: Guest[]; replayed: boolean; importedCount: number; missingCount: number }
export class GuestImportError extends Error {
  constructor(message: string, readonly uncertain: boolean, readonly status?: number) { super(message); }
}
export type GuestImportStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export class GuestImportWriteError extends Error {}
export const guestImportStorageKey = (id: string) => `enkarta:guest-import:v1:${id}`;

/** A private, tab-scoped recovery draft contains input only, never QR tokens or credentials. */
export function restoreGuestImport(value: string | null, invitationId: string): GuestImportOperation | null {
  if (!value || value.length > 131072) return null;
  try {
    const operation = JSON.parse(value);
    if (!isUuid(invitationId) || operation.invitationId !== invitationId || !isUuid(operation.requestId) || !Array.isArray(operation.guests)
      || operation.guests.length < 1 || operation.guests.length > 200
      || operation.guests.some((row: GuestImportRow) => !row || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 80
        || !Number.isInteger(row.passes) || row.passes < 1 || row.passes > 20)) return null;
    return operation;
  } catch { return null; }
}

/** Never overwrite an unreadable or different lot, even when its request UUID matches. */
export function saveGuestImport(storage: GuestImportStorage, operation: GuestImportOperation) {
  const key = guestImportStorageKey(operation.invitationId), raw = storage.getItem(key);
  const record = JSON.stringify(operation);
  if (!restoreGuestImport(record, operation.invitationId)) throw new Error('INVALID_GUEST_IMPORT');
  const previous = restoreGuestImport(raw, operation.invitationId);
  if (raw !== null && (!previous || JSON.stringify(previous) !== record)) return false;
  try { storage.setItem(key, record); }
  catch { throw new GuestImportWriteError('No se pudo conservar el lote en esta pestaña.'); }
  return true;
}

/** A late acknowledgement must never remove a newer recovery draft. */
export function clearGuestImport(storage: Pick<Storage, 'getItem' | 'removeItem'>, invitationId: string, operation: GuestImportOperation) {
  const key = guestImportStorageKey(invitationId);
  if (operation.invitationId !== invitationId) return false;
  const raw = storage.getItem(key);
  if (raw === null) return true;
  const previous = restoreGuestImport(raw, invitationId);
  if (!previous || JSON.stringify(previous) !== JSON.stringify(operation)) return false;
  storage.removeItem(key); return true;
}

export function discardUnreadableGuestImport(storage: GuestImportStorage, invitationId: string, expectedRaw: string) {
  const key = guestImportStorageKey(invitationId);
  if (storage.getItem(key) !== expectedRaw) return false;
  storage.removeItem(key); return true;
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
