import { NextRequest, NextResponse } from 'next/server';
import { getHostSession, getAdminSession } from '@/lib/host-session';
import { isUuid } from '@/lib/rsvp-contract';
import { privateJson, serviceBody, serviceError } from '@/lib/services-server';
import { requireInvitationService } from '@/lib/package-services-server';
import { parseRosterQuery } from '@/lib/roster-query';
import { readHostRosterCsv } from '@/lib/host-dashboard-server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseGuestMetadata } from '@/lib/guest-metadata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
async function eventAccess(request: NextRequest) {
  const host = await getHostSession(true);
  const id = request.nextUrl.searchParams.get('id') || host;
  if (!isUuid(id) || (host !== id && !await getAdminSession())) throw new Error('FORBIDDEN');
  await requireInvitationService(id, 'guestManagement');
  return id;
}
function failure(error: unknown) {
  if (error instanceof Error && error.message === 'FORBIDDEN') return privateJson({ error: 'La sesión terminó o no tiene acceso a este evento.' },403);
  if (error instanceof Error && error.message === 'ROSTER_CHANGED') return privateJson({ error: 'El padrón cambió durante la exportación. Actualiza y vuelve a exportar.', code: 'ROSTER_CHANGED' },409);
  return serviceError(error);
}
export async function GET(request: NextRequest) {
  try {
    const id = await eventAccess(request);
    const csv = await readHostRosterCsv(id, parseRosterQuery(request.nextUrl.searchParams));
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="invitados.csv"', 'Cache-Control': 'private, no-store' } });
  } catch(error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const id = await eventAccess(request), body = await serviceBody(request, 120000);
    if (!Array.isArray(body.candidates) || body.candidates.length > 200) throw new Error('INVALID_INPUT');
    const candidates = body.candidates.map(item => {
      if (!item || typeof item !== 'object' || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80) throw new Error('INVALID_INPUT');
      return { name: item.name, phone: parseGuestMetadata({ phone: item.phone }).phone || '' };
    });
    const { data, error } = await supabaseAdmin.rpc('enkarta_roster_duplicates', { p_invitation_id: id, p_candidates: candidates });
    if (error) throw error;
    if (!Array.isArray(data) || data.some(index => !Number.isInteger(index) || index < 0 || index >= candidates.length)) throw new Error('SERVICE_UNAVAILABLE');
    return privateJson({ duplicates: data });
  } catch(error) { return failure(error); }
}
