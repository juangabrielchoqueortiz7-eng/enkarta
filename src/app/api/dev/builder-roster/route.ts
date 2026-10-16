import { NextRequest, NextResponse } from 'next/server';
import { rosterFixture } from '@/lib/dev/roster-fixture';
import { parseRosterQuery } from '@/lib/roster-query';
import { managedRosterCsv } from '@/lib/managed-roster-csv';
import { normalizeGuestPhone } from '@/lib/guest-import';
export const dynamic = 'force-dynamic';
async function ready(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return new NextResponse(null, { status: 404 });
  const mode = request.nextUrl.searchParams.get('qaMode');
  if (mode === 'failure' || mode === 'denied') return NextResponse.json({ error: 'Acceso ficticio no disponible.' }, { status: mode === 'denied' ? 403 : 503 });
  if (mode === 'slow') await new Promise(resolve => setTimeout(resolve, 1500));
  return null;
}
export async function GET(request: NextRequest) {
  const blocked = await ready(request); if (blocked) return blocked;
  try {
    const params = request.nextUrl.searchParams, query = parseRosterQuery(params), format = params.get('format');
    if (format === 'preview') {
      const id = params.get('guestId') || '';
      const guest = rosterFixture({ ...query, selected: [id] }).selectedGuests?.[0];
      return guest ? NextResponse.json({ guest: { ...guest, accessToken: 'qa-preview-token-only' } }, { headers: { 'Cache-Control': 'private, no-store' } }) : NextResponse.json({ error: 'Invitado ficticio no disponible.' }, { status: 404 });
    }
    const snapshot = rosterFixture(query);
    if (format === 'csv') {
      const all = Array.from({ length: snapshot.roster?.pages ?? 0 }, (_, index) => rosterFixture({ ...query, page: index + 1 }).guests).flat();
      return new NextResponse(managedRosterCsv(all, snapshot.services, 'https://qa.invalid', 'qa-builder-roster'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'private, no-store' } });
    }
    return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Consulta ficticia inválida.' }, { status: 400 }); }
}
export async function POST(request: NextRequest) {
  const blocked = await ready(request); if (blocked) return blocked;
  const body = await request.json();
  if (!Array.isArray(body.candidates) || body.candidates.length > 200) return NextResponse.json({ error: 'Candidatos ficticios inválidos.' }, { status: 400 });
  const duplicates: number[] = [];
  body.candidates.forEach((candidate: { name: string; phone: string }, index: number) => {
    const query = parseRosterQuery(new URLSearchParams({ search: candidate.name }));
    if (rosterFixture(query).guests.some(guest => guest.name === candidate.name && normalizeGuestPhone(guest.phone || '') === normalizeGuestPhone(candidate.phone || ''))) duplicates.push(index);
  });
  return NextResponse.json({ duplicates }, { headers: { 'Cache-Control': 'private, no-store' } });
}
