import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { isRevision, isUuid } from '@/lib/rsvp-contract';
import { SCANNER_QA_EVENTS, scannerQaGroup, scannerQaScope } from '@/lib/dev/scanner-fixture';
import type { ScannerGroup } from '@/lib/scanner-contract';
import type { ScannerRole } from '@/lib/scan-recovery';

export const dynamic = 'force-dynamic';
type Fixture = { group: ScannerGroup; receipts: Map<string, string> };
const devRuntime = globalThis as typeof globalThis & { enkartaScannerQa?: Map<string, Fixture> };
const fixtures = process.env.NODE_ENV === 'development' ? devRuntime.enkartaScannerQa ??= new Map<string, Fixture>() : new Map<string, Fixture>();
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });

/** Development-only synthetic server. Never imports Supabase, banking or messaging. */
async function handle(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return new NextResponse(null, { status: 404 });
  const event = request.nextUrl.searchParams.get('qaEvent') || '';
  const role = request.nextUrl.searchParams.get('qaRole') as ScannerRole;
  if (!SCANNER_QA_EVENTS.includes(event) || !['host', 'door', 'admin'].includes(role)) return json({ error: 'Solo se admiten eventos ficticios.' }, 400);
  const scope = scannerQaScope(event, role, request.nextUrl.searchParams.get('qaSession') === '2');
  if (request.headers.get('x-enkarta-scanner-session') !== scope.sessionKey || request.headers.get('x-qa-mode') === 'denied') return json({ error: 'Permiso ficticio revocado.' }, 403);
  let fixture = fixtures.get(event);
  if (!fixture) { fixture = { group: scannerQaGroup(event), receipts: new Map() }; fixtures.set(event, fixture); }
  const { group, receipts } = fixture;
  if (request.method === 'GET') {
    const q = request.nextUrl.searchParams;
    if (q.get('code') !== 'ENK-QA2026' && q.get('token') !== 'QA-ONLY-NOT-A-REAL-ACCESS-TOKEN-2026' && q.get('guestId') !== group.guest.id) return json({ error: 'Usa ENK-QA2026; solo hay datos ficticios.' }, 404);
    return json({ ...(request.headers.get('x-qa-mode') === 'group' ? { ...group, attendees: [...group.attendees, group.attendees[0]] } : group), qaMovements: receipts.size });
  }
  if (request.method === 'PATCH') {
    const person = group.attendees.find(item => item.state === 'in');
    if (person) { person.state = 'out'; person.revision++; receipts.set(randomUUID(), 'deliberate later synthetic exit'); }
    return json({ qaMovements: receipts.size });
  }
  try {
    const body = await request.json();
    if (!isUuid(body.attendeeId) || !isUuid(body.requestId) || !isRevision(body.expectedRevision) || !['in', 'out'].includes(body.action) || body.invitationId !== event) return json({ error: 'Operación ficticia inválida.' }, 400);
    const person = group.attendees.find(item => item.id === body.attendeeId);
    if (!person) return json({ error: 'Pase ficticio no encontrado.' }, 404);
    const identity = JSON.stringify(body), previous = receipts.get(body.requestId);
    if (previous && previous !== identity) return json({ error: 'Reintento diferente.' }, 409);
    if (previous) return json({ ok: true, attendee: person, replayed: true, qaMovements: receipts.size });
    if (person.revision !== body.expectedRevision || person.state === body.action) return json({ error: 'Conflicto ficticio: consulta el grupo.' }, 409);
    if (receipts.size >= 100) return json({ error: 'Reinicia el servidor de prueba.' }, 503);
    person.state = body.action; person.revision++; receipts.set(body.requestId, identity);
    return json({ ok: true, attendee: request.headers.get('x-qa-mode') === 'foreign' ? { ...person, id: group.guest.id } : person, replayed: false, qaMovements: receipts.size });
  } catch { return json({ error: 'Operación ficticia inválida.' }, 400); }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
