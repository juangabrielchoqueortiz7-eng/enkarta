import { NextRequest, NextResponse } from 'next/server';
import { commercialDesignName } from '@/lib/commercial-designs';
import { normalizeCommercialReference } from '@/lib/commercial-lookup';
import { getAdminSession } from '@/lib/host-session';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const privateResponse = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const missing = (error: { code?: string; message?: string } | null) => !!error && (error.code === '42P01' || /does not exist|schema cache/i.test(error.message || ''));

/** Exact lookup is independent of the dashboard's reporting period and row cap. */
export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return privateResponse({ error: 'No autorizado' }, 401);

  const values = request.nextUrl.searchParams.getAll('reference');
  const reference = values.length === 1 ? normalizeCommercialReference(values[0]) : null;
  if (!reference) return privateResponse({ error: 'Introduce una referencia completa: EK-XXXXXXXX', code: 'INVALID_REFERENCE' }, 400);

  try {
    const { data, error } = await supabaseAdmin.from('commercial_leads')
      .select('id,reference,status,package_key,design,event_category,placement,utm_source,utm_medium,utm_campaign,referrer_host,revenue_bs,notes,created_at,updated_at')
      .eq('reference', reference).maybeSingle();
    if (error) {
      const migrationRequired = missing(error);
      return privateResponse({ error: migrationRequired ? 'Ejecuta migrations/012_commercial_funnel.sql' : 'No se pudo buscar la referencia', code: migrationRequired ? 'MIGRATION_REQUIRED' : 'READ_FAILED' }, migrationRequired ? 503 : 500);
    }
    return privateResponse({ lead: data ? { ...data, design: commercialDesignName(data.design) } : null });
  } catch {
    return privateResponse({ error: 'No se pudo buscar la referencia', code: 'READ_FAILED' }, 500);
  }
}
