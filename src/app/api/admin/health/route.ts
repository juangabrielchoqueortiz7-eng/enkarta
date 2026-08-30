import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/host-session';
import { runOperationalChecks } from '@/lib/operational-health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const health = await runOperationalChecks();
  return NextResponse.json(health, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

