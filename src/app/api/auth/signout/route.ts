import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cierra la sesión del socio borrando las cookies de Supabase Auth. */
export async function POST() {
  const client = await createAuthServerClient();
  await client.auth.signOut();
  return NextResponse.json({ success: true });
}
