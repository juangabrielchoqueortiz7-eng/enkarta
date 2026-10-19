import { NextRequest, NextResponse } from 'next/server';
import { COMMERCIAL_LEAD_STATUSES, type CommercialLeadStatus, leadStatusLabel } from '@/lib/commercial';
import { commercialDesignName } from '@/lib/commercial-designs';
import { encodeCommercialCursor, parseCommercialDashboard, parseCommercialDashboardQuery } from '@/lib/commercial-dashboard';
import { ENKARTA_COLLECTIONS, STARTER_DESIGNS } from '@/lib/enkarta-collections';
import { parseCommercialLead } from '@/lib/commercial-lookup';
import { parseCommercialUpdate } from '@/lib/commercial-update';
import { getAdminSession } from '@/lib/host-session';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const missing = (error: { code?: string; message?: string } | null) => !!error && (['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205'].includes(error.code || '') || /does not exist|schema cache/i.test(error.message || ''));
const privateResponse = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const writeUncertain = () => privateResponse({ error: 'No se pudo comprobar el guardado. Conserva tus cambios y reintenta la misma solicitud.', code: 'WRITE_UNCERTAIN' }, 500);
function publicLead(value: unknown) {
  const lead = parseCommercialLead(value);
  return lead ? { ...lead, design: commercialDesignName(lead.design) } : null;
}

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return privateResponse({ error: 'No autorizado' }, 401);
  const query = parseCommercialDashboardQuery(request?.nextUrl.searchParams ?? new URLSearchParams());
  if (!query) return privateResponse({ error: 'Filtro o página inválidos', code: 'INVALID_QUERY' }, 400);
  try {
    // Aggregate inside PostgreSQL: PostgREST's row limit must never truncate KPIs.
    const designLabels = Object.fromEntries([
      ...Object.values(ENKARTA_COLLECTIONS).map(design => [design.key, design.name]),
      ...STARTER_DESIGNS.map(design => [design.key, design.name]),
    ]);
    const { data, error } = await supabaseAdmin.rpc('enkarta_commercial_dashboard', {
      p_status: query.status, p_size: 25, p_as_of: query.cursor?.asOf ?? null,
      p_after_created_at: query.cursor?.createdAt ?? null, p_after_id: query.cursor?.id ?? null,
      p_design_labels: designLabels,
    });
    if (error) {
      if (error.code === 'P0001' && error.message === 'INVALID_INPUT') return privateResponse({ error: 'Filtro o página inválidos', code: 'INVALID_QUERY' }, 400);
      return missing(error)
        ? privateResponse({ error: 'Ejecuta migrations/020_commercial_dashboard_pagination.sql', code: 'MIGRATION_REQUIRED' }, 503)
        : privateResponse({ error: 'No se pudo cargar el embudo', code: 'READ_FAILED' }, 500);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.leads) || !Array.isArray(data.statuses)
      || !data.pagination || typeof data.pagination !== 'object' || Array.isArray(data.pagination)) throw new Error('INVALID_DASHBOARD');
    const leads = data.leads.map(publicLead);
    const statuses = data.statuses.map((row: unknown) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
      const value = row as Record<string, unknown>;
      if (!COMMERCIAL_LEAD_STATUSES.includes(value.status as CommercialLeadStatus)) return null;
      return { status: value.status, label: leadStatusLabel(value.status as CommercialLeadStatus), value: value.value };
    });
    const next = data.pagination.next;
    if (leads.some((lead: unknown) => !lead) || statuses.some((status: unknown) => !status)
      || (next !== null && (!next || typeof next !== 'object' || Array.isArray(next) || typeof next.createdAt !== 'string' || typeof next.id !== 'string'))) throw new Error('INVALID_DASHBOARD');
    const dashboard = parseCommercialDashboard({
      periodDays: data.periodDays, asOf: data.asOf, syncedAt: data.syncedAt, summary: data.summary,
      sources: data.sources, campaigns: data.campaigns, packages: data.packages, events: data.events, designs: data.designs,
      statuses, leads, pagination: { size: data.pagination.size, total: data.pagination.total, hasMore: data.pagination.hasMore,
        nextCursor: next === null ? null : encodeCommercialCursor({ asOf: data.asOf, createdAt: next.createdAt, id: next.id, status: query.status }) },
    }, query.status);
    if (!dashboard) throw new Error('INVALID_DASHBOARD');
    return privateResponse(dashboard);
  } catch {
    return privateResponse({ error: 'No se pudo cargar el embudo', code: 'READ_FAILED' }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await getAdminSession())) return privateResponse({ error: 'No autorizado' }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return privateResponse({ error: 'Cambio inválido', code: 'INVALID_UPDATE' }, 400); }
  const update = parseCommercialUpdate(body);
  if (!update) return privateResponse({ error: 'Cambio inválido', code: 'INVALID_UPDATE' }, 400);
  try {
    const { data, error } = await supabaseAdmin.rpc('enkarta_update_commercial_lead', {
      p_lead_id: update.id, p_request_id: update.requestId, p_expected_revision: update.expectedRevision,
      p_status: update.status, p_revenue_bs: update.revenueBs, p_notes: update.notes,
    });
    if (error) return missing(error) ? privateResponse({ error: 'Ejecuta migrations/019_commercial_lead_updates.sql', code: 'MIGRATION_REQUIRED' }, 503) : writeUncertain();
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.requestId !== update.requestId) return writeUncertain();
    if (data.outcome === 'not_found') return privateResponse({ error: 'Contacto no encontrado', code: 'NOT_FOUND' }, 404);
    if (data.outcome === 'request_conflict') return privateResponse({ error: 'Esta solicitud ya se usó para otros cambios. Revisa la ficha antes de guardar.', code: 'REQUEST_REUSED' }, 409);
    const lead = publicLead(data.lead);
    if (!lead || lead.id !== update.id) return writeUncertain();
    if (data.outcome === 'conflict') return lead.revision !== update.expectedRevision ? privateResponse({ error: 'Otro guardado actualizó el contacto. Revisa la versión actual antes de continuar.', code: 'REVISION_CONFLICT', lead, requestId: update.requestId }, 409) : writeUncertain();
    if (!['saved', 'unchanged', 'replayed'].includes(data.outcome)) return writeUncertain();
    const expectedRevision = data.outcome === 'saved' ? update.expectedRevision + 1 : update.expectedRevision;
    if (lead.status !== update.status || lead.notes !== update.notes || lead.revenue_bs !== update.revenueBs
      || (data.outcome === 'replayed' ? ![update.expectedRevision, update.expectedRevision + 1].includes(lead.revision) : lead.revision !== expectedRevision)) return writeUncertain();
    return privateResponse({ lead, outcome: data.outcome, requestId: update.requestId });
  } catch {
    return writeUncertain();
  }
}
