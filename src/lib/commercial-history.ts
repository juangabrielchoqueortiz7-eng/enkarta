import { COMMERCIAL_LEAD_STATUSES, type CommercialLeadStatus } from './commercial';
import { normalizeCommercialReference } from './commercial-lookup';

export type CommercialHistoryEntry = { id: string; lead_id: string; from_status: CommercialLeadStatus; to_status: CommercialLeadStatus; revenue_bs: number | null; note: string; created_at: string };
export type CommercialHistoryCursor = { leadId: string; asOf: string; createdAt: string; id: string };
export type CommercialHistoryPage = { lead: { id: string; reference: string }; asOf: string; entries: CommercialHistoryEntry[]; pagination: { size: 20; hasMore: boolean; nextCursor: string | null } };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);

/** Preserve PostgreSQL microseconds while accepting its equivalent UTC suffix. */
export function commercialHistoryTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(value)) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 19) !== value.slice(0, 19)) return null;
  return `${value.slice(0, 19)}.${(value.slice(19).replace(/(?:Z|\+00:00)$/, '').replace(/^\./, '')).padEnd(6, '0')}Z`;
}

function validCursor(value: unknown): CommercialHistoryCursor | null {
  if (!record(value) || !uuid(value.leadId) || !uuid(value.id)) return null;
  const asOf = commercialHistoryTimestamp(value.asOf), createdAt = commercialHistoryTimestamp(value.createdAt);
  if (!asOf || !createdAt || createdAt > asOf || Date.parse(asOf) > Date.now() + 60000) return null;
  return { leadId: value.leadId, asOf, createdAt, id: value.id };
}

export function encodeCommercialHistoryCursor(value: CommercialHistoryCursor): string {
  const cursor = validCursor(value);
  if (!cursor) throw new Error('INVALID_CURSOR');
  return btoa(JSON.stringify({ v: 1, ...cursor })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeCommercialHistoryCursor(value: unknown): CommercialHistoryCursor | null {
  if (typeof value !== 'string' || value.length > 768 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const decoded = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
    if (btoa(decoded).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== value) return null;
    const body = JSON.parse(decoded);
    if (!record(body) || body.v !== 1 || Object.keys(body).sort().join(',') !== 'asOf,createdAt,id,leadId,v') return null;
    return validCursor(body);
  } catch { return null; }
}

export function parseCommercialHistoryQuery(params: URLSearchParams): { leadId: string; cursor: CommercialHistoryCursor | null } | null {
  if (params.getAll('leadId').length !== 1 || params.getAll('cursor').length > 1 || [...params.keys()].some(key => !['leadId', 'cursor'].includes(key))) return null;
  const leadId = params.get('leadId');
  if (!uuid(leadId)) return null;
  const raw = params.get('cursor'), cursor = raw === null ? null : decodeCommercialHistoryCursor(raw);
  if (raw !== null && (!cursor || cursor.leadId !== leadId)) return null;
  return { leadId, cursor };
}

/** Validate the complete page and whitelist each audit entry before showing private notes. */
export function parseCommercialHistoryPage(value: unknown, lead: { id: string; reference: string }, cursor: string | null = null): CommercialHistoryPage | null {
  if (!uuid(lead.id) || normalizeCommercialReference(lead.reference) !== lead.reference || !record(value) || !record(value.lead) || value.lead.id !== lead.id || value.lead.reference !== lead.reference || !record(value.pagination)) return null;
  const asOf = commercialHistoryTimestamp(value.asOf), after = cursor === null ? null : decodeCommercialHistoryCursor(cursor);
  if (!asOf || Date.parse(asOf) > Date.now() + 60000 || (cursor !== null && (!after || after.leadId !== lead.id || after.asOf !== asOf)) || !Array.isArray(value.entries) || value.entries.length > 20) return null;
  const entries: CommercialHistoryEntry[] = [];
  for (const row of value.entries) {
    if (!record(row) || !uuid(row.id) || row.lead_id !== lead.id || !COMMERCIAL_LEAD_STATUSES.includes(row.from_status as CommercialLeadStatus) || !COMMERCIAL_LEAD_STATUSES.includes(row.to_status as CommercialLeadStatus) || typeof row.note !== 'string' || row.note.length > 1000) return null;
    const createdAt = commercialHistoryTimestamp(row.created_at);
    const revenue = row.revenue_bs === null ? null : typeof row.revenue_bs === 'number' || (typeof row.revenue_bs === 'string' && /^\d+(\.\d{1,2})?$/.test(row.revenue_bs)) ? Number(row.revenue_bs) : NaN;
    if (!createdAt || createdAt > asOf || (revenue !== null && (!Number.isFinite(revenue) || revenue < 0))) return null;
    const boundary = entries.length ? { createdAt: entries[entries.length - 1].created_at, id: entries[entries.length - 1].id } : after;
    if (boundary && (createdAt > boundary.createdAt || (createdAt === boundary.createdAt && row.id >= boundary.id))) return null;
    if (entries.some(entry => entry.id === row.id)) return null;
    entries.push({ id: row.id, lead_id: lead.id, from_status: row.from_status as CommercialLeadStatus, to_status: row.to_status as CommercialLeadStatus, revenue_bs: revenue, note: row.note, created_at: createdAt });
  }
  const p = value.pagination;
  if (p.size !== 20 || typeof p.hasMore !== 'boolean' || (p.nextCursor !== null && typeof p.nextCursor !== 'string') || p.hasMore !== !!p.nextCursor || (p.hasMore && entries.length !== 20)) return null;
  if (p.nextCursor) {
    const next = decodeCommercialHistoryCursor(p.nextCursor), last = entries[entries.length - 1];
    if (!next || next.leadId !== lead.id || next.asOf !== asOf || next.id !== last?.id || next.createdAt !== last?.created_at) return null;
  }
  return { lead: { id: lead.id, reference: lead.reference }, asOf, entries, pagination: { size: 20, hasMore: p.hasMore, nextCursor: p.nextCursor as string | null } };
}

export async function requestCommercialHistory(lead: { id: string; reference: string }, cursor: string | null = null, transport: typeof fetch = fetch, signal?: AbortSignal): Promise<CommercialHistoryPage> {
  const params = new URLSearchParams({ leadId: lead.id });
  if (cursor !== null) params.set('cursor', cursor);
  if (!parseCommercialHistoryQuery(params) || normalizeCommercialReference(lead.reference) !== lead.reference) throw new Error('No se pudo identificar el contacto para consultar su historial.');
  let response: Response;
  try { response = await transport(`/api/admin/commercial/history?${params}`, { cache: 'no-store', signal }); }
  catch { throw new Error('No se pudo cargar el historial. Revisa tu conexión y vuelve a intentarlo.'); }
  if (response.status === 401) throw new Error('Tu sesión de administración terminó. Vuelve a ingresar para consultar el historial.');
  if (response.status === 404) throw new Error('El contacto ya no está disponible. Actualiza Ventas antes de continuar.');
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error('El historial llegó incompleto. Vuelve a intentarlo.'); }
  if (!response.ok) throw new Error(record(body) && body.code === 'MIGRATION_REQUIRED' ? 'El historial comercial requiere la migración 012. Consulta con administración.' : 'No se pudo cargar el historial. Vuelve a intentarlo.');
  const page = parseCommercialHistoryPage(body, lead, cursor);
  if (!page) throw new Error('El historial llegó incompleto o corresponde a otro contacto. Vuelve a intentarlo.');
  return page;
}
