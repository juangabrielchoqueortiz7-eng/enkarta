import { NextRequest, NextResponse } from 'next/server';
import { commercialHistoryTimestamp, encodeCommercialHistoryCursor, parseCommercialHistoryPage, parseCommercialHistoryQuery } from '@/lib/commercial-history';
import { getAdminSession } from '@/lib/host-session';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const privateResponse = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
const missing = (error: { code?: string; message?: string } | null) => !!error && (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code || '') || /does not exist|schema cache/i.test(error.message || ''));
const readFailure = (error: { code?: string; message?: string } | null) => missing(error)
  ? privateResponse({ error: 'Ejecuta migrations/012_commercial_funnel.sql', code: 'MIGRATION_REQUIRED' }, 503)
  : privateResponse({ error: 'No se pudo cargar el historial comercial', code: 'READ_FAILED' }, 500);

/** Read an exact contact and one bounded audit page; never fetch history for dashboard rows. */
export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return privateResponse({ error: 'No autorizado' }, 401);
  const query = parseCommercialHistoryQuery(request.nextUrl.searchParams);
  if (!query) return privateResponse({ error: 'Contacto o página inválidos', code: 'INVALID_QUERY' }, 400);
  try {
    const { data: lead, error: leadError } = await supabaseAdmin.from('commercial_leads').select('id,reference').eq('id', query.leadId).maybeSingle();
    if (leadError) return readFailure(leadError);
    if (!lead) return privateResponse({ error: 'Contacto no encontrado', code: 'NOT_FOUND' }, 404);
    const asOf = query.cursor?.asOf ?? commercialHistoryTimestamp(new Date().toISOString())!;
    let history = supabaseAdmin.from('commercial_lead_history').select('id,lead_id,from_status,to_status,revenue_bs,note,created_at').eq('lead_id', query.leadId).lte('created_at', asOf);
    if (query.cursor) history = history.or(`created_at.lt.${query.cursor.createdAt},and(created_at.eq.${query.cursor.createdAt},id.lt.${query.cursor.id})`);
    const { data: rows, error } = await history.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(21);
    if (error) return readFailure(error);
    if (!Array.isArray(rows) || rows.length > 21) return readFailure(null);
    const entries = rows.slice(0, 20), last = entries[entries.length - 1], hasMore = rows.length > 20;
    const nextCursor = hasMore ? encodeCommercialHistoryCursor({ leadId: query.leadId, asOf, createdAt: commercialHistoryTimestamp(last?.created_at)!, id: last?.id }) : null;
    const page = parseCommercialHistoryPage({ lead, asOf, entries, pagination: { size: 20, hasMore, nextCursor } }, { id: query.leadId, reference: lead.reference }, query.cursor ? encodeCommercialHistoryCursor(query.cursor) : null);
    return page ? privateResponse(page) : readFailure(null);
  } catch { return readFailure(null); }
}
