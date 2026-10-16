import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { isRevision, isUuid } from '@/lib/rsvp-contract';
import { SCANNER_QA_EVENTS, scannerQaGroup, scannerQaScope } from '@/lib/dev/scanner-fixture';
import type { ScannerGroup } from '@/lib/scanner-contract';
import type { ScannerRole } from '@/lib/scan-recovery';
import { HISTORY_PAGE_SIZE, historyTimestamp, movementCursor, parseHistoryCursor, type CheckinMovement } from '@/lib/checkin-history';

export const dynamic = 'force-dynamic';
type Fixture = { group: ScannerGroup; receipts: Map<string, string>; movements: CheckinMovement[] };
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
  if (!fixture) { fixture = { group: scannerQaGroup(event), receipts: new Map(), movements: [] }; fixtures.set(event, fixture); }
  const { group, receipts, movements } = fixture;
  if (request.method === 'GET') {
    const q = request.nextUrl.searchParams;
    if (q.get('code') !== 'ENK-QA2026' && q.get('token') !== 'QA-ONLY-NOT-A-REAL-ACCESS-TOKEN-2026' && q.get('guestId') !== group.guest.id) return json({ error: 'Usa ENK-QA2026; solo hay datos ficticios.' }, 404);
    if (q.get('history') === '1') {
      const mode = request.headers.get('x-qa-mode');
      if (mode === 'history-error') return json({ error: 'Error ficticio del historial' }, 503);
      const source: CheckinMovement[] = mode === 'history-pages' ? Array.from({ length: 43 }, (_, i) => ({ id: `50000000-0000-4000-8000-${String(43-i).padStart(12,'0')}`, at: '2026-10-16T12:00:00.123456Z', action: i % 2 ? 'out' : 'in', seatNo: 1, label: 'QA Persona con nombre y apellidos muy largos para comprobar la lectura en una pantalla móvil', operatorRole: 'door' })) : [...movements].sort((a,b) => movementCursor(b).localeCompare(movementCursor(a)));
      let cursor; try { cursor = parseHistoryCursor(q.get('cursor')); } catch { return json({ error: 'Cursor ficticio inválido' }, 400); }
      const remaining = cursor ? source.filter(item => movementCursor(item) < `${cursor.at}|${cursor.id}`) : source;
      const page = remaining.slice(0,HISTORY_PAGE_SIZE);
      return json({ invitationId: event, guestId: group.guest.id, movements: page, nextCursor: remaining.length > HISTORY_PAGE_SIZE ? movementCursor(page[page.length-1]) : null, readAt: new Date().toISOString() });
    }
    return json({ ...(request.headers.get('x-qa-mode') === 'group' ? { ...group, attendees: [...group.attendees, group.attendees[0]] } : group), qaMovements: receipts.size });
  }
  if (request.method === 'PATCH') {
    const person = group.attendees.find(item => item.state === 'in');
    if (person) { person.state = 'out'; person.revision++; receipts.set(randomUUID(), 'deliberate later synthetic exit'); movements.push({ id: randomUUID(), action: 'out', at: historyTimestamp(new Date().toISOString())!, seatNo: person.seatNo, label: person.label || `Persona ${person.seatNo}`, operatorRole: 'door' }); }
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
    movements.push({ id: randomUUID(), action: body.action, at: historyTimestamp(new Date().toISOString())!, seatNo: person.seatNo, label: person.label || `Persona ${person.seatNo}`, operatorRole: role });
    return json({ ok: true, attendee: request.headers.get('x-qa-mode') === 'foreign' ? { ...person, id: group.guest.id } : person, replayed: false, qaMovements: receipts.size });
  } catch { return json({ error: 'Operación ficticia inválida.' }, 400); }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
