import { parseCommercialLead } from './commercial-lookup';
import { isUuid } from './rsvp-contract';
import type { SalesDraftStorage } from './sales-draft';

export type CommercialSearchEntry = { id: string; reference: string; savedAt: number };
export type CommercialSearchRead = { kind: 'ready'; entry: CommercialSearchEntry } | { kind: 'empty' } | { kind: 'expired'; entry: CommercialSearchEntry } | { kind: 'invalid' } | { kind: 'unavailable' };
export const COMMERCIAL_SEARCH_TTL = 24 * 60 * 60 * 1000;
const MAX_CHARS = 1024;
const keyFor = (scope: string) => `enkarta.commercial-search.v1:${scope}`;
const validScope = (value: unknown): value is string => typeof value === 'string' && value.length === 64 && /^[a-f0-9]{64}$/.test(value);
const validTime = (value: unknown): value is number => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
const same = (left: CommercialSearchEntry, right: CommercialSearchEntry) => left.id === right.id && left.reference === right.reference && left.savedAt === right.savedAt;

function parseEntry(value: unknown, now: number): CommercialSearchEntry | null {
  try {
    if (!validTime(now) || !record(value) || !exactKeys(value, ['id', 'reference', 'savedAt'])
      || typeof value.id !== 'string' || value.id.length !== 36 || !isUuid(value.id) || value.id !== value.id.toLowerCase()
      || typeof value.reference !== 'string' || value.reference.length !== 11 || !/^EK-[A-F0-9]{8}$/.test(value.reference)
      || !validTime(value.savedAt) || value.savedAt > now + 60_000) return null;
    return { id: value.id, reference: value.reference, savedAt: value.savedAt };
  } catch { return null; }
}

/** Persist only the identity of a checked contact, never its commercial or private fields. */
export function createCommercialSearchEntry(value: unknown, now = Date.now()): CommercialSearchEntry | null {
  try {
    const lead = parseCommercialLead(value);
    return lead ? parseEntry({ id: lead.id, reference: lead.reference, savedAt: now }, now) : null;
  } catch { return null; }
}

/** Age is reported without deleting or renewing the reference during a read. */
export function readCommercialSearch(storage: SalesDraftStorage, scope: string, now = Date.now()): CommercialSearchRead {
  if (!validScope(scope) || !validTime(now)) return { kind: 'invalid' };
  let raw: string | null;
  try { raw = storage.getItem(keyFor(scope)); } catch { return { kind: 'unavailable' }; }
  if (raw === null) return { kind: 'empty' };
  try {
    if (typeof raw !== 'string' || raw.length > MAX_CHARS) return { kind: 'invalid' };
    const envelope: unknown = JSON.parse(raw);
    if (!record(envelope) || !exactKeys(envelope, ['version', 'scope', 'entry']) || envelope.version !== 1 || envelope.scope !== scope) return { kind: 'invalid' };
    const entry = parseEntry(envelope.entry, now);
    if (!entry) return { kind: 'invalid' };
    return { kind: now - entry.savedAt > COMMERCIAL_SEARCH_TTL ? 'expired' : 'ready', entry };
  } catch { return { kind: 'invalid' }; }
}

/** The expected complete identity is captured before lookup; late results cannot replace a newer choice. */
export function putCommercialSearch(storage: SalesDraftStorage, scope: string, value: CommercialSearchEntry, expected: CommercialSearchEntry | null): boolean {
  const now = Date.now(), entry = parseEntry(value, now), previous = expected === null ? null : parseEntry(expected, now);
  if (!validScope(scope) || !entry || (expected !== null && !previous)) return false;
  const current = readCommercialSearch(storage, scope, now);
  if (current.kind === 'invalid' || current.kind === 'unavailable') return false;
  const existing = current.kind === 'empty' ? null : current.entry;
  if (existing && same(existing, entry)) return true;
  if (existing ? !previous || !same(existing, previous) : !!previous) return false;
  try {
    const raw = JSON.stringify({ version: 1, scope, entry });
    if (raw.length > MAX_CHARS) return false;
    storage.setItem(keyFor(scope), raw); return true;
  } catch { return false; }
}

/** Remove only the reference the user chose to forget, including an expired identity. */
export function clearCommercialSearch(storage: SalesDraftStorage, scope: string, value: CommercialSearchEntry): boolean {
  const now = Date.now(), expected = parseEntry(value, now);
  if (!validScope(scope) || !expected) return false;
  const current = readCommercialSearch(storage, scope, now);
  if (current.kind === 'invalid' || current.kind === 'unavailable') return false;
  if (current.kind === 'empty') return true;
  if (!same(current.entry, expected)) return false;
  try { storage.removeItem(keyFor(scope)); return true; } catch { return false; }
}
