import { NextRequest, NextResponse } from 'next/server';
import { canManageInvitation } from '@/lib/host-session';
import { privateJson, serviceBody, serviceError } from '@/lib/services-server';
import { isUuid } from '@/lib/rsvp-contract';
import { parseRosterQuery } from '@/lib/roster-query';
import { readManagedGuestCsv, readManagedGuestSnapshot } from '@/lib/host-dashboard-server';
import { readRosterDuplicates } from '@/lib/roster-duplicates-server';
import { invitationServiceConfig, guestForServices } from '@/lib/package-services-server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { mapGuestRow } from '@/lib/guests';
import { withGuestMetadata } from '@/lib/guest-metadata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
async function authorize(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!isUuid(id)) throw new Error('INVALID_INPUT');
  if (!await canManageInvitation(id, 'guestManagement')) throw new Error('FORBIDDEN');
  return id;
}
function failure(error: unknown) {
  if (error instanceof Error && error.message === 'FORBIDDEN') return privateJson({ error: 'La sesión terminó o no tiene acceso a los invitados de este evento.' }, 403);
  if (error instanceof Error && error.message === 'ROSTER_CHANGED') return privateJson({ error: 'El padrón cambió durante la exportación. Actualiza y vuelve a exportar.', code: 'ROSTER_CHANGED' }, 409);
  return serviceError(error);
}
export async function GET(request: NextRequest) {
  try {
    const id = await authorize(request), params = request.nextUrl.searchParams;
    const format = params.get('format');
    if (format === 'preview') {
      const guestId = params.get('guestId');
      if (!isUuid(guestId)) throw new Error('INVALID_INPUT');
      const { config } = await invitationServiceConfig(id);
      const { data, error } = await supabaseAdmin.from('guests').select('*').eq('invitation_id', id).eq('id', guestId).maybeSingle();
      if (error) throw error;
      if (!data) return privateJson({ error: 'El invitado ya no está disponible.' }, 404);
      // Explicit single-guest preview only. The ordinary roster never carries QR tokens.
      const guest = mapGuestRow(data, true);
      return privateJson({ guest: guestForServices(withGuestMetadata(guest, config.guestMeta?.[guest.publicId]), config) });
    }
    if (format !== null && format !== 'csv') throw new Error('INVALID_INPUT');
    const query = parseRosterQuery(params);
    if (format === 'csv') return new NextResponse(await readManagedGuestCsv(id, query), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="invitados.csv"', 'Cache-Control': 'private, no-store' } });
    return privateJson(await readManagedGuestSnapshot(id, query));
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const id = await authorize(request);
    return privateJson(await readRosterDuplicates(id, await serviceBody(request, 120000)));
  } catch (error) { return failure(error); }
}
