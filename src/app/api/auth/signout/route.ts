import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cierra la sesión del socio borrando las cookies de Supabase Auth. */
export async function POST() {
  const client = await createAuthServerClient();
  const { error } = await client.auth.signOut();
  if (error) return NextResponse.json({ error: 'No se pudo confirmar el cierre de sesión.' }, { status: 503 });
  return NextResponse.json({ success: true });
}
