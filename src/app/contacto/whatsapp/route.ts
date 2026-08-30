import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { commercialWhatsappUrl, parseCommercialContext } from '@/lib/commercial';
import { supabaseAdmin } from '@/lib/supabase/server';
import { publicTemplateName } from '@/lib/enkarta-collections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'enkarta-commercial';
const cleanDesignFromPath = (pathname: string) => {
  const key = pathname.match(/^\/muestra\/([a-z0-9-]+)/i)?.[1] || '';
  if (!key) return '';
  if (key === 'marfil-vivo') return 'Marfil Vivo';
  return publicTemplateName(key === 'carmesi' ? 'carmesi_v2' : key);
};

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  let refererHost = '';
  let refererPath = '/';
  try {
    const referer = request.headers.get('referer');
    if (referer) { const parsed = new URL(referer); refererHost = parsed.hostname; refererPath = parsed.pathname; }
  } catch { /* Un referer inválido no bloquea el contacto. */ }
  const context = parseCommercialContext({
    ...params,
    landingPath: params.landing_path || refererPath,
    referrerHost: refererHost,
    design: params.design || cleanDesignFromPath(refererPath),
  });
  const existing = request.cookies.get(SESSION_COOKIE)?.value || '';
  const session = /^[0-9a-f-]{36}$/i.test(existing) ? existing : randomUUID();
  const hash = createHash('sha256').update(`enkarta-commercial:${session}`).digest('hex');
  const id = randomUUID();
  const reference = `EK-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

  // El contacto nunca falla por analítica: si falta la migración, WhatsApp sigue abriendo.
  const row = {
    id, reference, session_hash: hash, status: 'whatsapp_open', package_key: context.packageKey,
    design: context.design, event_category: context.eventType, placement: context.placement,
    landing_path: context.landingPath, referrer_host: context.referrerHost,
    utm_source: context.utmSource, utm_medium: context.utmMedium, utm_campaign: context.utmCampaign,
    utm_content: context.utmContent, utm_term: context.utmTerm,
  };
  try {
    await Promise.race([
      Promise.all([
        supabaseAdmin.from('commercial_leads').insert(row),
        supabaseAdmin.from('commercial_events').insert({
          session_hash: hash, event_type: 'whatsapp_open', package_key: context.packageKey,
          design: context.design, event_category: context.eventType, placement: context.placement,
          landing_path: context.landingPath, referrer_host: context.referrerHost,
          utm_source: context.utmSource, utm_medium: context.utmMedium, utm_campaign: context.utmCampaign,
          utm_content: context.utmContent, utm_term: context.utmTerm,
        }),
      ]),
      new Promise(resolve => setTimeout(resolve, 1200)),
    ]);
  } catch {
    // Un fallo o demora de analítica nunca impide que el visitante abra WhatsApp.
  }

  const response = NextResponse.redirect(commercialWhatsappUrl(context, reference), 302);
  response.cookies.set(SESSION_COOKIE, session, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 90, path: '/' });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
