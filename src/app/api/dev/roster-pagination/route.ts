import { NextRequest, NextResponse } from 'next/server';
import { rosterFixture } from '@/lib/dev/roster-fixture';
import { parseRosterQuery } from '@/lib/roster-query';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return new NextResponse(null, { status: 404 });
  if (request.nextUrl.searchParams.get('qaMode') === 'failure') return NextResponse.json({ error: 'Fallo de prueba.' }, { status: 503 });
  if (request.nextUrl.searchParams.get('qaMode') === 'slow') await new Promise(resolve => setTimeout(resolve,1500));
  try { return NextResponse.json(rosterFixture(parseRosterQuery(request.nextUrl.searchParams)), { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch { return NextResponse.json({ error: 'Filtro ficticio inválido.' }, { status: 400 }); }
}
