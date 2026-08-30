import { NextResponse } from 'next/server';
import { runOperationalChecks } from '@/lib/operational-health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const health = await runOperationalChecks();
  return NextResponse.json({ status: health.status, checkedAt: health.checkedAt }, {
    status: health.status === 'operational' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

