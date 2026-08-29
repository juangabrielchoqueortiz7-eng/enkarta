import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { mapGuestRow, mapAttendeeRow } from '@/lib/guests';
import { canScanInvitation, getAdminSession, getHostSession, getDoorSession, invitationIdOfAttendee } from '@/lib/host-session';
import { isRevision, isUuid } from '@/lib/rsvp-contract';
import { privateJson, serviceBody, serviceError } from '@/lib/services-server';
import { requireInvitationService } from '@/lib/package-services-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const forbidden = () => privateJson({ error: 'No autorizado' }, 403);

export async function GET(request: NextRequest) {
  try {
    const doorScope = request.nextUrl.searchParams.get('scope') === 'door';
    const admin = !doorScope && await getAdminSession();
    const host = !doorScope ? await getHostSession() : null;
    const door = doorScope ? await getDoorSession() : null;
    if (!admin && !host && !door) return forbidden();
    const token = request.nextUrl.searchParams.get('token');
    const code = request.nextUrl.searchParams.get('code');
    if ((!token && !code) || (token && code)) throw new Error('INVALID_INPUT');
    let query = supabaseAdmin.from('guests').select('id,invitation_id');
    query = token ? query.eq('access_token', token) : query.eq('access_code', code!.toUpperCase());
    if (!admin) query = query.eq('invitation_id', door || host!);
    const { data: matches, error: lookupError } = await query.limit(2);
    if (lookupError) return serviceError(lookupError);
    if (!matches?.length) throw new Error('NOT_FOUND');
    if (matches.length !== 1) return privateJson({ error: 'Este código coincide con más de un acceso. Escanea el QR completo.' }, 409);
    const owner = matches[0];
    if (!(await canScanInvitation(owner.invitation_id))) return forbidden();
    await requireInvitationService(owner.invitation_id, 'qrAccess');
    const { data, error } = await supabaseAdmin.rpc('enkarta_checkin_group', { p_invitation_id: owner.invitation_id, p_guest_id: owner.id });
    if (error) return serviceError(error);
    const guest = mapGuestRow(data.guest);
    // El escáner solo necesita identificar el grupo. Nunca mensajes, teléfonos o tokens.
    return privateJson({ guest: { id: guest.id, name: guest.name, tableNo: guest.tableNo || null, accessCode: guest.accessCode || null }, attendees: data.attendees.map(mapAttendeeRow) });
  } catch (error) { return serviceError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await serviceBody(request);
    const doorScope = body.scope === 'door';
    const admin = !doorScope && await getAdminSession();
    const host = !doorScope ? await getHostSession() : null;
    const door = doorScope ? await getDoorSession() : null;
    if (!admin && !host && !door) return forbidden();
    if (!isUuid(body.attendeeId) || !isUuid(body.requestId) || !isRevision(body.expectedRevision) || !['in', 'out'].includes(String(body.action))) throw new Error('INVALID_INPUT');
    const ownerId = await invitationIdOfAttendee(body.attendeeId);
    if (!ownerId || (!admin && ownerId !== (door || host)) || !(await canScanInvitation(ownerId))) return forbidden();
    await requireInvitationService(ownerId, 'qrAccess');
    const { data, error } = await supabaseAdmin.rpc('enkarta_checkin', {
      p_invitation_id: ownerId, p_attendee_id: body.attendeeId, p_action: body.action,
      p_expected_revision: body.expectedRevision, p_request_id: body.requestId, p_operator: admin ? 'admin' : door ? 'door:' + door : 'host:' + host,
    });
    if (error) return serviceError(error);
    return privateJson({ ok: true, attendee: mapAttendeeRow(data.attendee), replayed: data.replayed });
  } catch (error) { return serviceError(error); }
}
