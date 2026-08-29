import { NextRequest } from 'next/server';
import { hostFixture } from '@/lib/dev/host-fixture';
import { hostMetrics, type HostSnapshot } from '@/lib/host-dashboard';
import { privateJson, serviceBody } from '@/lib/services-server';

// QA solo en desarrollo: nunca importa Supabase ni toca registros reales.
const fixtures = new Map<string, { snapshot: HostSnapshot; failed: boolean; at: number }>();
export const dynamic = 'force-dynamic';
function fixture(request: NextRequest) {
  const key = (request.nextUrl.searchParams.get('session') || 'demo').slice(0, 80);
  if (fixtures.size > 20) fixtures.clear();
  let value = fixtures.get(key);
  if (!value || Date.now() - value.at > 3600000) { value = { snapshot: hostFixture(), failed: false, at: Date.now() }; fixtures.set(key, value); }
  return value;
}
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return privateJson({ error: 'Not found' }, 404);
  const value = fixture(request);
  return value.failed ? privateJson({ error: 'Fallo simulado' }, 503) : privateJson({ ...value.snapshot, syncedAt: new Date().toISOString() });
}
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return privateJson({ error: 'Not found' }, 404);
  try {
    const { action } = await serviceBody(request);
    const value = fixture(request);
    if (action === 'confirm') { value.snapshot.guests[1].status = 'confirmed'; value.snapshot.guests[1].confirmedPasses = 2; value.snapshot.guests[1].responseRevision = 1; }
    else if (action === 'enter') value.snapshot.guests[0].inside = 1;
    else if (action === 'table') { value.snapshot.guests[0].tableNo = '5'; value.snapshot.guests[0].responseRevision = (value.snapshot.guests[0].responseRevision || 0) + 1; }
    else if (action === 'fail') value.failed = true;
    else if (action === 'recover') value.failed = false;
    else if (action === 'reset') { value.snapshot = hostFixture(); value.failed = false; }
    else return privateJson({ error: 'Acción inválida' }, 400);
    value.snapshot.metrics = hostMetrics(value.snapshot.guests);
    return privateJson({ ok: true });
  } catch { return privateJson({ error: 'Acción inválida' }, 400); }
}
