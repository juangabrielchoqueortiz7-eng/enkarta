import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { COMMERCIAL_VIEW_EVENTS, parseCommercialContext } from '@/lib/commercial';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'enkarta-commercial';
const sessionValue = (request: NextRequest) => {
  const value = request.cookies.get(SESSION_COOKIE)?.value || '';
  return /^[0-9a-f-]{36}$/i.test(value) ? value : randomUUID();
};
const sessionHash = (value: string) => createHash('sha256').update(`enkarta-commercial:${value}`).digest('hex');
const migrationMissing = (error: { code?: string; message?: string } | null) => !!error && (error.code === '42P01' || /does not exist|schema cache/i.test(error.message || ''));

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const event = String(body.event || '');
    if (!COMMERCIAL_VIEW_EVENTS.includes(event as never)) return NextResponse.json({ error: 'Evento inválido' }, { status: 400 });
    const context = parseCommercialContext(body);
    const session = sessionValue(request);
    const { error } = await supabaseAdmin.from('commercial_events').insert({
      session_hash: sessionHash(session), event_type: event, package_key: context.packageKey,
      design: context.design, event_category: context.eventType, placement: context.placement,
      landing_path: context.landingPath, referrer_host: context.referrerHost,
      utm_source: context.utmSource, utm_medium: context.utmMedium, utm_campaign: context.utmCampaign,
      utm_content: context.utmContent, utm_term: context.utmTerm,
    });
    if (error) return NextResponse.json({ error: migrationMissing(error) ? 'Embudo pendiente de migración' : 'No se pudo registrar', code: migrationMissing(error) ? 'MIGRATION_REQUIRED' : 'TRACK_FAILED' }, { status: migrationMissing(error) ? 503 : 500 });
    if (event === 'landing_view') {
      const cutoff = new Date(Date.now() - 180 * 86_400_000).toISOString();
      await supabaseAdmin.from('commercial_events').delete().lt('occurred_at', cutoff);
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, session, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 90, path: '/' });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
}
