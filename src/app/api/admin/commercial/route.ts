import { NextRequest, NextResponse } from 'next/server';
import { COMMERCIAL_LEAD_STATUSES, type CommercialLeadStatus, leadStatusLabel } from '@/lib/commercial';
import { getAdminSession } from '@/lib/host-session';
import { isUuid } from '@/lib/rsvp-contract';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type EventRow = { session_hash: string; event_type: string; package_key: string; design: string; utm_source: string; utm_campaign: string; referrer_host: string; occurred_at: string };
type LeadRow = { id: string; reference: string; status: CommercialLeadStatus; package_key: string; design: string; event_category: string; placement: string; utm_source: string; utm_medium: string; utm_campaign: string; referrer_host: string; revenue_bs: number | null; notes: string; created_at: string; updated_at: string };
const missing = (error: { code?: string; message?: string } | null) => !!error && (error.code === '42P01' || /does not exist|schema cache/i.test(error.message || ''));
const privateResponse = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  if (!(await getAdminSession())) return privateResponse({ error: 'No autorizado' }, 401);
  const cutoff = new Date(Date.now() - 180 * 86_400_000).toISOString();
  const [eventsResult, leadsResult] = await Promise.all([
    supabaseAdmin.from('commercial_events').select('session_hash,event_type,package_key,design,utm_source,utm_campaign,referrer_host,occurred_at').gte('occurred_at', cutoff).order('occurred_at', { ascending: false }).limit(10000),
    supabaseAdmin.from('commercial_leads').select('id,reference,status,package_key,design,event_category,placement,utm_source,utm_medium,utm_campaign,referrer_host,revenue_bs,notes,created_at,updated_at').gte('created_at', cutoff).order('updated_at', { ascending: false }).limit(1000),
  ]);
  if (eventsResult.error || leadsResult.error) {
    const migrationRequired = missing(eventsResult.error) || missing(leadsResult.error);
    return privateResponse({ error: migrationRequired ? 'Ejecuta migrations/012_commercial_funnel.sql' : 'No se pudo cargar el embudo', code: migrationRequired ? 'MIGRATION_REQUIRED' : 'READ_FAILED' }, migrationRequired ? 503 : 500);
  }
  const events = (eventsResult.data || []) as EventRow[];
  const leads = (leadsResult.data || []) as LeadRow[];
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
}

export async function PATCH(request: NextRequest) {
  if (!(await getAdminSession())) return privateResponse({ error: 'No autorizado' }, 401);
  try {
    const body = await request.json();
    const id = String(body.id || '');
    const status = String(body.status || '') as CommercialLeadStatus;
    if (!isUuid(id) || !COMMERCIAL_LEAD_STATUSES.includes(status)) return privateResponse({ error: 'Cambio inválido' }, 400);
    const notes = String(body.notes || '').trim().slice(0, 1000);
    const revenue = body.revenueBs === '' || body.revenueBs === null || body.revenueBs === undefined ? null : Number(body.revenueBs);
    if (revenue !== null && (!Number.isFinite(revenue) || revenue < 0 || revenue > 1_000_000)) return privateResponse({ error: 'Importe inválido' }, 400);
    const { data: previous, error: readError } = await supabaseAdmin.from('commercial_leads').select('status').eq('id', id).maybeSingle();
    if (readError) return privateResponse({ error: missing(readError) ? 'Ejecuta migrations/012_commercial_funnel.sql' : 'No se pudo leer el contacto' }, missing(readError) ? 503 : 500);
    if (!previous) return privateResponse({ error: 'Contacto no encontrado' }, 404);
    const { data, error } = await supabaseAdmin.from('commercial_leads').update({ status, notes, revenue_bs: revenue, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return privateResponse({ error: 'No se pudo actualizar' }, 500);
    if (previous.status !== status || notes || revenue !== null) await supabaseAdmin.from('commercial_lead_history').insert({ lead_id: id, from_status: previous.status, to_status: status, revenue_bs: revenue, note: notes });
    return privateResponse({ lead: data });
  } catch {
    return privateResponse({ error: 'Solicitud inválida' }, 400);
  }
}
