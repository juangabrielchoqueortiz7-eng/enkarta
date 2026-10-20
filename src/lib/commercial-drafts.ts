import { COMMERCIAL_LEAD_STATUSES, type CommercialLeadStatus } from './commercial';
import { parseCommercialLead, type CommercialLead } from './commercial-lookup';
import { isUuid } from './rsvp-contract';
import type { CommercialDraft } from './commercial-update';
import type { SalesDraftStorage } from './sales-draft';

export type CommercialDraftEntry = {
  id: string; reference: string; savedAt: number;
  base: { revision: number; status: CommercialLeadStatus; revenueBs: number | null; notes: string };
  draft: CommercialDraft;
};
type ReadResult = { kind: 'ready'; entries: CommercialDraftEntry[]; expired: CommercialDraftEntry[] } | { kind: 'invalid' | 'unavailable' };
export const COMMERCIAL_DRAFT_TTL = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 50, MAX_CHARS = 240_000;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
const validScope = (value: unknown): value is string => typeof value === 'string' && value.length === 64 && /^[a-f0-9]{64}$/.test(value);
const validNow = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const validStatus = (value: unknown): value is CommercialLeadStatus => COMMERCIAL_LEAD_STATUSES.includes(value as CommercialLeadStatus);
const validNotes = (value: unknown): value is string => typeof value === 'string' && value.length <= 1000 && !value.includes('\0');
const validRevenue = (value: unknown): value is number | null => value === null || (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0) && value >= 0 && value <= 1_000_000 && /^\d+(?:\.\d{1,2})?$/.test(String(value)));
const keyFor = (scope: string) => `enkarta.commercial-drafts.v1:${scope}`;
const same = (left: CommercialDraftEntry, right: CommercialDraftEntry) => JSON.stringify(left) === JSON.stringify(right);

/** Structural validation also accepts expired entries so they can be discarded by exact CAS. */
export function parseCommercialDraftEntry(value: unknown, now = Date.now()): CommercialDraftEntry | null {
  try {
    if (!validNow(now) || !record(value) || !exactKeys(value, ['id', 'reference', 'savedAt', 'base', 'draft'])
      || typeof value.id !== 'string' || !isUuid(value.id) || value.id !== value.id.toLowerCase()
      || typeof value.reference !== 'string' || value.reference.length !== 11 || !/^EK-[A-F0-9]{8}$/.test(value.reference)
      || !validNow(value.savedAt) || value.savedAt > now + 60_000 || !record(value.base) || !record(value.draft)) return null;
    const base = value.base, draft = value.draft;
    if (!exactKeys(base, ['revision', 'status', 'revenueBs', 'notes']) || !exactKeys(draft, ['status', 'revenue', 'notes'])
      || !Number.isInteger(base.revision) || Number(base.revision) < 0 || Number(base.revision) > 2147483647
      || !validStatus(base.status) || !validRevenue(base.revenueBs) || !validNotes(base.notes)
      || !validStatus(draft.status) || typeof draft.revenue !== 'string' || draft.revenue.length > 16 || /[\u0000-\u001f\u007f]/.test(draft.revenue) || !validNotes(draft.notes)) return null;
    return { id: value.id, reference: value.reference, savedAt: value.savedAt,
      base: { revision: Number(base.revision), status: base.status, revenueBs: base.revenueBs, notes: base.notes },
      draft: { status: draft.status, revenue: draft.revenue, notes: draft.notes } };
  } catch { return null; }
}

/** Match the editor's semantic comparison while preserving the original raw amount. */
function draftRevenue(value: string): number | null | undefined {
  if (value === '') return null;
  if (value !== value.trim() || !/^\d+(?:[.,]\d{1,2})?$/.test(value)) return undefined;
  const amount = Number(value.replace(',', '.'));
  return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000 ? amount : undefined;
}

export function createCommercialDraftEntry(base: CommercialLead, draft: CommercialDraft, now = Date.now()): CommercialDraftEntry | null {
  const lead = parseCommercialLead(base);
  if (!lead) return null;
  const entry = parseCommercialDraftEntry({ id: lead.id, reference: lead.reference, savedAt: now,
    base: { revision: lead.revision, status: lead.status, revenueBs: lead.revenue_bs, notes: lead.notes }, draft }, now);
  if (!entry || (entry.draft.status === entry.base.status && draftRevenue(entry.draft.revenue) === entry.base.revenueBs && entry.draft.notes.trim() === entry.base.notes)) return null;
  return entry;
}

/** Read the whole journal atomically. Age is reported, never used to delete data silently. */
export function readCommercialDrafts(storage: SalesDraftStorage, scope: string, now = Date.now()): ReadResult {
  if (!validScope(scope) || !validNow(now)) return { kind: 'invalid' };
  let raw: string | null;
  try { raw = storage.getItem(keyFor(scope)); } catch { return { kind: 'unavailable' }; }
  if (raw === null) return { kind: 'ready', entries: [], expired: [] };
  try {
    if (typeof raw !== 'string' || raw.length > MAX_CHARS) return { kind: 'invalid' };
    const envelope: unknown = JSON.parse(raw);
    if (!record(envelope) || !exactKeys(envelope, ['version', 'scope', 'entries']) || envelope.version !== 1 || envelope.scope !== scope || !Array.isArray(envelope.entries) || envelope.entries.length > MAX_ENTRIES) return { kind: 'invalid' };
    const entries: CommercialDraftEntry[] = [], expired: CommercialDraftEntry[] = [], ids = new Set<string>(), references = new Set<string>();
    for (const value of envelope.entries) {
      const entry = parseCommercialDraftEntry(value, now);
      if (!entry || ids.has(entry.id) || references.has(entry.reference)) return { kind: 'invalid' };
      ids.add(entry.id); references.add(entry.reference);
      (now - entry.savedAt > COMMERCIAL_DRAFT_TTL ? expired : entries).push(entry);
    }
    return { kind: 'ready', entries, expired };
  } catch { return { kind: 'invalid' }; }
}

/** Exact compare-and-set prevents an old editor from replacing a newer local draft. */
export function putCommercialDraft(storage: SalesDraftStorage, scope: string, value: CommercialDraftEntry, expected: CommercialDraftEntry | null = null): boolean {
  const entry = parseCommercialDraftEntry(value), previous = expected === null ? null : parseCommercialDraftEntry(expected);
  if (!validScope(scope) || !entry || (expected !== null && !previous) || (previous && (previous.id !== entry.id || previous.reference !== entry.reference))) return false;
  const current = readCommercialDrafts(storage, scope);
  if (current.kind !== 'ready') return false;
  const all = [...current.entries, ...current.expired], existing = all.find(row => row.id === entry.id);
  if (existing && same(existing, entry)) return true;
  if ((existing && (!previous || !same(existing, previous))) || (!existing && previous) || all.some(row => row.id !== entry.id && row.reference === entry.reference)
    || (!existing && all.length >= MAX_ENTRIES)) return false;
  try {
    const entries = existing ? all.map(row => row.id === entry.id ? entry : row) : [...all, entry], raw = JSON.stringify({ version: 1, scope, entries });
    if (raw.length > MAX_CHARS) return false;
    storage.setItem(keyFor(scope), raw); return true;
  } catch { return false; }
}

/** Exact cleanup also works for expired records; no other draft is affected. */
export function clearCommercialDraft(storage: SalesDraftStorage, scope: string, value: CommercialDraftEntry): boolean {
  const expected = parseCommercialDraftEntry(value);
  if (!validScope(scope) || !expected) return false;
  const current = readCommercialDrafts(storage, scope);
  if (current.kind !== 'ready') return false;
  const all = [...current.entries, ...current.expired], existing = all.find(row => row.id === expected.id);
  if (!existing) return true;
  if (!same(existing, expected)) return false;
  try {
    const entries = all.filter(row => row.id !== expected.id);
    if (entries.length) storage.setItem(keyFor(scope), JSON.stringify({ version: 1, scope, entries }));
    else storage.removeItem(keyFor(scope));
    return true;
  } catch { return false; }
}
