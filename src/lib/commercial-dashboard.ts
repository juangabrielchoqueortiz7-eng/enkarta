import { COMMERCIAL_LEAD_STATUSES, leadStatusLabel, type CommercialLeadStatus } from './commercial';
import { parseCommercialLead, type CommercialLead } from './commercial-lookup';

export type CommercialFilter = 'all' | CommercialLeadStatus;
export type CommercialCursor = { asOf: string; createdAt: string; id: string; status: CommercialFilter };
export type CommercialDashboardQuery = { status: CommercialFilter; cursor: CommercialCursor | null };
export type CommercialBreakdown = { label: string; opens: number; contacts: number; sales: number };
export type CommercialDashboard = {
  periodDays: 180; asOf: string; syncedAt: string;
  summary: { visits: number; landingViews: number; designViews: number; processViews: number; whatsappOpens: number; contacts: number; reserved: number; sales: number; revenue: number; intentRate: number; conversationRate: number; closeRate: number };
  sources: CommercialBreakdown[]; campaigns: CommercialBreakdown[]; packages: CommercialBreakdown[]; events: CommercialBreakdown[]; designs: CommercialBreakdown[];
  statuses: { status: CommercialLeadStatus; label: string; value: number }[];
  leads: CommercialLead[];
  pagination: { size: 25; total: number; hasMore: boolean; nextCursor: string | null };
};

/** Replace a page while keeping pending or explicitly opened editors mounted. */
export function mergeCommercialPageEditors(previous: CommercialLead[], incoming: CommercialLead[], active: ReadonlySet<string>, openedId: string | null = null): CommercialLead[] {
  const prior = new Map(previous.map(lead => [lead.id, lead])), received = new Set(incoming.map(lead => lead.id));
  const rows = incoming.map(lead => { const old = prior.get(lead.id); return old && old.revision > lead.revision ? old : lead; });
  for (const old of previous) if ((active.has(old.id) || old.id === openedId) && !received.has(old.id)) rows.push(old);
  return rows;
}

/** An exact lookup may open a historical contact without changing the reporting period. */
export function openCommercialLeadEditor(previous: CommercialLead[], incoming: unknown, retained: ReadonlySet<string>): CommercialLead[] {
  const lead = parseCommercialLead(incoming);
  if (!lead) return previous;
  const old = previous.filter(row => row.id === lead.id).reduce<CommercialLead | null>((latest, row) => !latest || row.revision > latest.revision ? row : latest, null);
  const opened = old && old.revision >= lead.revision ? old : lead;
  const rows: CommercialLead[] = [], included = new Set<string>();
  for (const row of previous) {
    if (included.has(row.id) || (!retained.has(row.id) && row.id !== lead.id)) continue;
    rows.push(row.id === lead.id ? opened : row);
    included.add(row.id);
  }
  if (!included.has(lead.id)) rows.push(opened);
  return rows;
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const statusValue = (value: unknown): value is CommercialFilter => value === 'all' || COMMERCIAL_LEAD_STATUSES.includes(value as CommercialLeadStatus);
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);

export function commercialTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(value)) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 19) !== value.slice(0, 19)) return null;
  return `${value.slice(0, 19)}.${(value.split('.')[1]?.slice(0, -1) ?? '').padEnd(6, '0')}Z`;
}

function validCursor(value: unknown): CommercialCursor | null {
  if (!record(value) || !statusValue(value.status) || !uuid(value.id)) return null;
  const asOf = commercialTimestamp(value.asOf), createdAt = commercialTimestamp(value.createdAt);
  if (!asOf || !createdAt || createdAt > asOf || Date.parse(createdAt) < Date.parse(asOf) - 180 * 86400000) return null;
  return { asOf, createdAt, id: value.id, status: value.status };
}

export function encodeCommercialCursor(value: CommercialCursor): string {
  const cursor = validCursor(value);
  if (!cursor) throw new Error('INVALID_CURSOR');
  return btoa(JSON.stringify({ v: 1, ...cursor })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeCommercialCursor(value: unknown): CommercialCursor | null {
  if (typeof value !== 'string' || value.length > 768 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const body = JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)));
    if (!record(body) || body.v !== 1 || Object.keys(body).sort().join(',') !== 'asOf,createdAt,id,status,v') return null;
    return validCursor(body);
  } catch { return null; }
}

export function parseCommercialDashboardQuery(params: URLSearchParams): CommercialDashboardQuery | null {
  if (params.getAll('status').length > 1 || params.getAll('cursor').length > 1 || [...params.keys()].some(key => !['status', 'cursor'].includes(key))) return null;
  const status = params.get('status') ?? 'all';
  if (!statusValue(status)) return null;
  const raw = params.get('cursor'), cursor = raw === null ? null : decodeCommercialCursor(raw);
  if (raw !== null && (!cursor || cursor.status !== status)) return null;
  return { status, cursor };
}

/** Validate a complete page before replacing either the metrics or the editable contacts. */
export function parseCommercialDashboard(value: unknown, filter: CommercialFilter = 'all'): CommercialDashboard | null {
  if (!record(value) || value.periodDays !== 180 || !record(value.summary) || !record(value.pagination)) return null;
  const asOf = commercialTimestamp(value.asOf), syncedAt = commercialTimestamp(value.syncedAt);
  if (!asOf || !syncedAt) return null;
  const s = value.summary;
  const fields = ['visits', 'landingViews', 'designViews', 'processViews', 'whatsappOpens', 'contacts', 'reserved', 'sales', 'intentRate', 'conversationRate', 'closeRate'] as const;
  if (fields.some(field => !count(s[field])) || typeof s.revenue !== 'number' || !Number.isFinite(s.revenue) || s.revenue < 0) return null;
  if (Number(s.contacts) > Number(s.whatsappOpens) || Number(s.reserved) > Number(s.contacts) || Number(s.sales) > Number(s.reserved) || Number(s.landingViews) > Number(s.visits) || Number(s.designViews) > Number(s.visits) || Number(s.processViews) > Number(s.visits) || Number(s.conversationRate) > 100 || Number(s.closeRate) > 100) return null;
  const summary = { ...Object.fromEntries(fields.map(field => [field, s[field]])), revenue: s.revenue } as CommercialDashboard['summary'];
  if (!Array.isArray(value.statuses) || value.statuses.length !== 5) return null;
  const statuses = COMMERCIAL_LEAD_STATUSES.map(status => {
    const rows = (value.statuses as unknown[]).filter(row => record(row) && row.status === status);
    return rows.length === 1 && record(rows[0]) && count(rows[0].value) ? { status, label: leadStatusLabel(status), value: rows[0].value } : null;
  });
  if (statuses.some(row => !row) || statuses.reduce((sum, row) => sum + (row?.value ?? 0), 0) !== summary.whatsappOpens) return null;
  if (!Array.isArray(value.leads) || value.leads.length > 25) return null;
  const leads = value.leads.map(row => parseCommercialLead(row));
  if (leads.some(lead => !lead || (filter !== 'all' && lead.status !== filter) || !commercialTimestamp(lead.created_at) || commercialTimestamp(lead.created_at)! > asOf || Date.parse(lead.created_at) < Date.parse(asOf) - 180 * 86400000) || new Set(leads.map(row => row?.id)).size !== leads.length) return null;
  for (let index = 1; index < leads.length; index++) {
    const current = leads[index]!, previous = leads[index - 1]!;
    const time = commercialTimestamp(current.created_at)!, priorTime = commercialTimestamp(previous.created_at)!;
    if (time > priorTime || (time === priorTime && current.id >= previous.id)) return null;
  }
  const p = value.pagination;
  if (p.size !== 25 || !count(p.total) || p.total < leads.length || p.total > summary.whatsappOpens || typeof p.hasMore !== 'boolean' || (p.nextCursor !== null && typeof p.nextCursor !== 'string')) return null;
  const total = filter === 'all' ? summary.whatsappOpens : statuses.find(row => row?.status === filter)?.value;
  if (p.total !== total || p.hasMore !== !!p.nextCursor || (p.hasMore && leads.length !== 25)) return null;
  if (p.nextCursor) {
    const next = decodeCommercialCursor(p.nextCursor), last = leads[leads.length - 1];
    if (!next || next.asOf !== asOf || next.status !== filter || next.id !== last?.id || next.createdAt !== commercialTimestamp(last?.created_at)) return null;
  }
  const groups: Record<string, CommercialBreakdown[]> = {};
  for (const field of ['sources', 'campaigns', 'packages', 'events', 'designs']) {
    const rows = value[field];
    if (!Array.isArray(rows) || rows.length > 8) return null;
    const parsed: CommercialBreakdown[] = [];
    for (const row of rows) {
      if (!record(row) || typeof row.label !== 'string' || row.label.length > 120 || !count(row.opens) || !count(row.contacts) || !count(row.sales) || row.sales > row.contacts || row.contacts > row.opens || row.opens > summary.whatsappOpens || parsed.some(item => item.label === row.label)) return null;
      parsed.push({ label: row.label, opens: row.opens, contacts: row.contacts, sales: row.sales });
    }
    groups[field] = parsed;
  }
  return { periodDays: 180, asOf, syncedAt, summary, sources: groups.sources, campaigns: groups.campaigns, packages: groups.packages, events: groups.events, designs: groups.designs, statuses: statuses as CommercialDashboard['statuses'], leads: leads as CommercialLead[], pagination: { size: 25, total: p.total, hasMore: p.hasMore, nextCursor: p.nextCursor as string | null } };
}

export async function requestCommercialDashboard(query: CommercialDashboardQuery, transport: typeof fetch = fetch, signal?: AbortSignal): Promise<CommercialDashboard> {
  const params = new URLSearchParams({ status: query.status });
  if (query.cursor) params.set('cursor', encodeCommercialCursor(query.cursor));
  let response: Response;
  try { response = await transport(`/api/admin/commercial?${params}`, { cache: 'no-store', signal }); }
  catch { throw new Error('No se pudo cargar Ventas. Revisa tu conexión y vuelve a intentarlo.'); }
  if (response.status === 401) throw new Error('Tu sesión terminó. Vuelve a ingresar para consultar Ventas.');
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new Error('La respuesta de Ventas llegó incompleta. Vuelve a intentarlo.'); }
  if (!response.ok) throw new Error(record(body) && body.code === 'MIGRATION_REQUIRED' ? 'Ventas requiere la migración 020 para consultar las métricas completas y las páginas.' : 'No se pudo cargar Ventas. Vuelve a intentarlo.');
  const page = parseCommercialDashboard(body, query.status);
  if (!page || (query.cursor && page.asOf !== query.cursor.asOf)) throw new Error('La respuesta de Ventas llegó incompleta o corresponde a otro recorrido. Vuelve a intentarlo.');
  if (query.cursor && page.leads.some(lead => { const time = commercialTimestamp(lead.created_at)!; return time > query.cursor!.createdAt || (time === query.cursor!.createdAt && lead.id >= query.cursor!.id); })) throw new Error('La respuesta no corresponde a esta página. Vuelve a intentarlo.');
  return page;
}
