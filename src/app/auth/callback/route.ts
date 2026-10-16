import { NextRequest, NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/auth';
import { PartnerSchemaMissing, syncPartnerFromAuth } from '@/lib/partner-session';
import { safePartnerNext, partnerLoginErrorPath } from '@/lib/partner-journey';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vuelta de Google: cambia el `code` por la sesión (cookies httpOnly) y deja
// creada la ficha del socio antes de mandarlo a su panel.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  // Detrás del proxy de Vercel el origin de la request es interno.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const base = process.env.NODE_ENV === 'development' || !forwardedHost ? origin : `https://${forwardedHost}`;
  const target = safePartnerNext(searchParams.get('next'));
  const back = (error: string) => NextResponse.redirect(`${base}${partnerLoginErrorPath(error, target)}`);

  if (searchParams.get('error')) return back('cancelado');
  const code = searchParams.get('code');
  if (!code) return back('oauth');

  const client = await createAuthServerClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.user) return back('oauth');

  try {
    await syncPartnerFromAuth(data.user);
  } catch (e) {
    if (e instanceof PartnerSchemaMissing) return back('migracion');
    return back('cuenta');
  }

  return NextResponse.redirect(`${base}${target}`);
}
