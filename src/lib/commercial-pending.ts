import { parseCanonicalCommercialUpdate, type CommercialUpdate } from './commercial-update';
import { isSalesCommercialReference } from './sales-playbook';
import type { SalesDraftStorage } from './sales-draft';

export type CommercialPendingEntry = { reference: string; savedAt: number; request: CommercialUpdate };
type ReadResult = { kind: 'ready'; entries: CommercialPendingEntry[] } | { kind: 'invalid' | 'unavailable' };
type PutResult = { ok: true; entry: CommercialPendingEntry } | { ok: false };
const MAX_ENTRIES = 50, MAX_CHARS = 160_000;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
const validScope = (scope: unknown): scope is string => typeof scope === 'string' && scope.length === 64 && /^[a-f0-9]{64}$/.test(scope);
const validNow = (now: number) => Number.isSafeInteger(now) && now >= 0;
const keyFor = (scope: string) => `enkarta.commercial-pending.v1:${scope}`;

function parseEntry(value: unknown, now: number): CommercialPendingEntry | null {
  if (!record(value) || !exactKeys(value, ['reference', 'savedAt', 'request']) || !isSalesCommercialReference(value.reference)
    || !Number.isSafeInteger(value.savedAt) || Number(value.savedAt) < 0 || Number(value.savedAt) > now + 60_000) return null;
  const request = parseCanonicalCommercialUpdate(value.request);
  return request ? { reference: value.reference, savedAt: Number(value.savedAt), request } : null;
}

/** Missing storage is empty. Old intentions remain recoverable until explicitly resolved. */
export function readCommercialPending(storage: SalesDraftStorage, scope: string, now = Date.now()): ReadResult {
  if (!validScope(scope) || !validNow(now)) return { kind: 'invalid' };
  let raw: string | null;
  try { raw = storage.getItem(keyFor(scope)); } catch { return { kind: 'unavailable' }; }
  if (raw === null) return { kind: 'ready', entries: [] };
  try {
    if (typeof raw !== 'string' || raw.length > MAX_CHARS) return { kind: 'invalid' };
    const envelope: unknown = JSON.parse(raw);
    if (!record(envelope) || !exactKeys(envelope, ['version', 'scope', 'entries']) || envelope.version !== 1 || envelope.scope !== scope || !Array.isArray(envelope.entries) || envelope.entries.length > MAX_ENTRIES) return { kind: 'invalid' };
    const entries: CommercialPendingEntry[] = [], ids = new Set<string>(), requests = new Set<string>(), references = new Set<string>();
    for (const value of envelope.entries) {
      const entry = parseEntry(value, now);
      if (!entry || ids.has(entry.request.id) || requests.has(entry.request.requestId) || references.has(entry.reference)) return { kind: 'invalid' };
      ids.add(entry.request.id); requests.add(entry.request.requestId); references.add(entry.reference); entries.push(entry);
    }
    return { kind: 'ready', entries };
  } catch { return { kind: 'invalid' }; }
}

/** Journal before sending. A second intention cannot replace an unresolved contact operation. */
export function putCommercialPending(storage: SalesDraftStorage, scope: string, reference: string, update: CommercialUpdate, now = Date.now()): PutResult {
  if (!validScope(scope) || !validNow(now) || !isSalesCommercialReference(reference)) return { ok: false };
  const request = parseCanonicalCommercialUpdate(update);
  if (!request) return { ok: false };
  const current = readCommercialPending(storage, scope, now);
  if (current.kind !== 'ready') return { ok: false };
  const previous = current.entries.find(entry => entry.request.id === request.id);
  if (previous) return previous.reference === reference && JSON.stringify(previous.request) === JSON.stringify(request) ? { ok: true, entry: previous } : { ok: false };
  if (current.entries.length >= MAX_ENTRIES || current.entries.some(entry => entry.request.requestId === request.requestId || entry.reference === reference)) return { ok: false };
  const entry: CommercialPendingEntry = { reference, savedAt: now, request };
  try {
    const raw = JSON.stringify({ version: 1, scope, entries: [...current.entries, entry] });
    if (raw.length > MAX_CHARS) return { ok: false };
    storage.setItem(keyFor(scope), raw);
    return { ok: true, entry };
  } catch { return { ok: false }; }
}

/** Remove exactly the acknowledged intention; never clear a newer or different operation. */
export function clearCommercialPending(storage: SalesDraftStorage, scope: string, entry: CommercialPendingEntry): boolean {
  if (!validScope(scope)) return false;
  const expected = parseEntry(entry, Date.now());
  if (!expected) return false;
  const current = readCommercialPending(storage, scope);
  if (current.kind !== 'ready') return false;
  const previous = current.entries.find(value => value.request.id === expected.request.id);
  if (!previous) return true;
  if (JSON.stringify(previous) !== JSON.stringify(expected)) return false;
  try {
    const entries = current.entries.filter(value => value.request.id !== expected.request.id);
    if (entries.length) storage.setItem(keyFor(scope), JSON.stringify({ version: 1, scope, entries }));
    else storage.removeItem(keyFor(scope));
    return true;
  } catch { return false; }
}
