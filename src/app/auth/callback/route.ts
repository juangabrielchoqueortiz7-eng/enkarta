import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/auth';
import { PartnerSchemaMissing, syncPartnerFromAuth } from '@/lib/partner-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vuelta de Google: cambia el `code` por la sesión (cookies httpOnly) y deja
// creada la ficha del socio antes de mandarlo a su panel.

/** Solo rutas internas: un `next` externo convertiría el login en un redirector abierto. */
function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/socios/panel';
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  // Detrás del proxy de Vercel el origin de la request es interno.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const base = process.env.NODE_ENV === 'development' || !forwardedHost ? origin : `https://${forwardedHost}`;
  const back = (query: string) => NextResponse.redirect(`${base}/socios${query}`);

  if (searchParams.get('error')) return back('?error=cancelado');
  const code = searchParams.get('code');
  if (!code) return back('?error=oauth');

  const client = await createAuthServerClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.user) return back('?error=oauth');

  try {
    await syncPartnerFromAuth(data.user);
  } catch (e) {
    if (e instanceof PartnerSchemaMissing) return back('?error=migracion');
    return back('?error=cuenta');
  }

  return NextResponse.redirect(`${base}${safeNext(searchParams.get('next'))}`);
}
