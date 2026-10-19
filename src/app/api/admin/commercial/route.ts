import { NextRequest, NextResponse } from 'next/server';
import { COMMERCIAL_LEAD_STATUSES, type CommercialLeadStatus, leadStatusLabel } from '@/lib/commercial';
import { commercialDesignName } from '@/lib/commercial-designs';
import { parseCommercialLead } from '@/lib/commercial-lookup';
import { parseCommercialUpdate } from '@/lib/commercial-update';
import { getAdminSession } from '@/lib/host-session';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type EventRow = { session_hash: string; event_type: string; package_key: string; design: string; utm_source: string; utm_campaign: string; referrer_host: string; occurred_at: string };
type LeadRow = { id: string; reference: string; status: CommercialLeadStatus; package_key: string; design: string; event_category: string; placement: string; utm_source: string; utm_medium: string; utm_campaign: string; referrer_host: string; revenue_bs: number | null; notes: string; created_at: string; updated_at: string; revision: number };
const missing = (error: { code?: string; message?: string } | null) => !!error && (['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205'].includes(error.code || '') || /does not exist|schema cache/i.test(error.message || ''));
const privateResponse = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const writeUncertain = () => privateResponse({ error: 'No se pudo comprobar el guardado. Conserva tus cambios y reintenta la misma solicitud.', code: 'WRITE_UNCERTAIN' }, 500);
function publicLead(value: unknown) {
  const lead = parseCommercialLead(value);
  return lead ? { ...lead, design: commercialDesignName(lead.design) } : null;
}

export async function GET() {
  if (!(await getAdminSession())) return privateResponse({ error: 'No autorizado' }, 401);
  try {
  const cutoff = new Date(Date.now() - 180 * 86_400_000).toISOString();
  const [eventsResult, leadsResult] = await Promise.all([
    supabaseAdmin.from('commercial_events').select('session_hash,event_type,package_key,design,utm_source,utm_campaign,referrer_host,occurred_at').gte('occurred_at', cutoff).order('occurred_at', { ascending: false }).limit(10000),
    supabaseAdmin.from('commercial_leads').select('id,reference,status,package_key,design,event_category,placement,utm_source,utm_medium,utm_campaign,referrer_host,revenue_bs,notes,created_at,updated_at,revision').gte('created_at', cutoff).order('updated_at', { ascending: false }).limit(1000),
  ]);
  if (eventsResult.error || leadsResult.error) {
    const migrationRequired = missing(eventsResult.error) || missing(leadsResult.error);
    const revisionMissing = leadsResult.error?.code === '42703' || leadsResult.error?.code === 'PGRST204';
    return privateResponse({ error: migrationRequired ? `Ejecuta migrations/${revisionMissing ? '019_commercial_lead_updates.sql' : '012_commercial_funnel.sql'}` : 'No se pudo cargar el embudo', code: migrationRequired ? 'MIGRATION_REQUIRED' : 'READ_FAILED' }, migrationRequired ? 503 : 500);
  }
  const events = (eventsResult.data || []) as EventRow[];
  const mappedLeads = ((leadsResult.data || []) as unknown[]).map(publicLead);
  if (mappedLeads.some(lead => !lead)) return privateResponse({ error: 'No se pudo cargar el embudo', code: 'READ_FAILED' }, 500);
  const leads = mappedLeads as LeadRow[];
  const unique = (type: string) => new Set(events.filter(event => event.event_type === type).map(event => event.session_hash)).size;
  const visits = new Set(events.filter(event => ['landing_view', 'design_view', 'process_view'].includes(event.event_type)).map(event => event.session_hash)).size;
  const whatsappOpens = leads.length;
  const contacts = leads.filter(lead => lead.status !== 'whatsapp_open').length;
  const reserved = leads.filter(lead => ['reserved', 'won'].includes(lead.status)).length;
  const sales = leads.filter(lead => lead.status === 'won').length;
  const revenue = leads.filter(lead => lead.status === 'won').reduce((sum, lead) => sum + Number(lead.revenue_bs || 0), 0);
  const grouped = (selector: (lead: LeadRow) => string) => {
    const counts = new Map<string, { opens: number; contacts: number; sales: number }>();
    leads.forEach(lead => {
      const label = selector(lead) || 'Directo';
      const current = counts.get(label) || { opens: 0, contacts: 0, sales: 0 };
      current.opens += 1; if (lead.status !== 'whatsapp_open') current.contacts += 1; if (lead.status === 'won') current.sales += 1; counts.set(label, current);
    });
    return Array.from(counts.entries()).map(([label, value]) => ({ label, ...value })).sort((a, b) => b.opens - a.opens).slice(0, 8);
  };
  return privateResponse({
    periodDays: 180,
    summary: { visits, landingViews: unique('landing_view'), designViews: unique('design_view'), processViews: unique('process_view'), whatsappOpens, contacts, reserved, sales, revenue, intentRate: visits ? Math.round(whatsappOpens / visits * 100) : 0, conversationRate: whatsappOpens ? Math.round(contacts / whatsappOpens * 100) : 0, closeRate: contacts ? Math.round(sales / contacts * 100) : 0 },
    sources: grouped(lead => lead.utm_source || lead.referrer_host || 'Directo'),
    campaigns: grouped(lead => lead.utm_campaign || 'Sin campaña'),
    packages: grouped(lead => lead.package_key === 'general' ? 'Sin paquete' : lead.package_key[0].toUpperCase() + lead.package_key.slice(1)),
    events: grouped(lead => lead.event_category || 'Sin categoría'),
    designs: grouped(lead => lead.design || 'Sin diseño'),
    statuses: COMMERCIAL_LEAD_STATUSES.map(status => ({ status, label: leadStatusLabel(status), value: leads.filter(lead => lead.status === status).length })),
    leads,
  });
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
