import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { canScanInvitation, getAdminSession, getHostSession, getDoorSession, scannerRecoveryScope } from '@/lib/host-session';
import { isUuid } from '@/lib/rsvp-contract';
import { privateJson, serviceError } from '@/lib/services-server';
import { requireInvitationService } from '@/lib/package-services-server';
import { HISTORY_PAGE_SIZE, historyTimestamp, historyOperator, movementCursor, parseHistoryCursor, type CheckinMovement } from '@/lib/checkin-history';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const doorScope = params.get('scope') === 'door';
    const admin = !doorScope && await getAdminSession();
    const host = !doorScope ? await getHostSession() : null;
    const door = doorScope ? await getDoorSession() : null;
    if (!admin && !host && !door) return privateJson({ error: 'No autorizado' }, 403);
    const binding = request.headers.get('x-enkarta-scanner-session');
    if (binding !== null && binding !== (await scannerRecoveryScope(admin ? 'admin' : door ? 'door' : 'host')).sessionKey) return privateJson({ error: 'No autorizado' }, 403);
    const guestId = params.get('guestId');
    if (!isUuid(guestId) || params.getAll('guestId').length !== 1 || params.getAll('cursor').length > 1) throw new Error('INVALID_INPUT');
    const cursor = parseHistoryCursor(params.get('cursor'));
    let lookup = supabaseAdmin.from('guests').select('id,invitation_id').eq('id', guestId);
    if (!admin) lookup = lookup.eq('invitation_id', door || host!);
    const { data: guest, error: lookupError } = await lookup.maybeSingle();
    if (lookupError) return serviceError(lookupError);
    if (!guest) throw new Error('NOT_FOUND');
    if (!(await canScanInvitation(guest.invitation_id))) return privateJson({ error: 'No autorizado' }, 403);
    await requireInvitationService(guest.invitation_id, 'qrAccess');
    // Reuse the scanner's validity/availability checks; QR entitlement alone is insufficient.
    const { data: group, error: groupError } = await supabaseAdmin.rpc('enkarta_checkin_group', { p_invitation_id: guest.invitation_id, p_guest_id: guest.id });
    if (groupError) return serviceError(groupError);
    let query = supabaseAdmin.from('access_log').select('id,attendee_id,action,at,operator').eq('guest_id', guest.id);
    if (cursor) query = query.or(`at.lt.${cursor.at},and(at.eq.${cursor.at},id.lt.${cursor.id})`);
    const { data: rows, error } = await query.order('at', { ascending: false }).order('id', { ascending: false }).limit(HISTORY_PAGE_SIZE + 1);
    if (error) return serviceError(error);
    const attendees = new Map<string, { seat_no: number; label?: string }>(group.attendees.map((person: { id: string; seat_no: number; label?: string }) => [person.id, person]));
    const movements: CheckinMovement[] = (rows || []).slice(0, HISTORY_PAGE_SIZE).map(row => {
      const person = attendees.get(row.attendee_id);
      const at = historyTimestamp(row.at);
      if (!at || !isUuid(row.id) || !['in', 'out'].includes(row.action)) throw new Error('INVALID_HISTORY');
      return { id: row.id, action: row.action, at, seatNo: person?.seat_no || null,
        label: (person?.label || (person ? `Persona ${person.seat_no}` : 'Pase anterior')).slice(0, 500), operatorRole: historyOperator(row.operator) };
    });
    // Never serialize raw operators, request IDs, tokens, contact details or the RPC group.
    return privateJson({ invitationId: guest.invitation_id, guestId: guest.id, movements,
      nextCursor: (rows?.length || 0) > HISTORY_PAGE_SIZE ? movementCursor(movements[movements.length - 1]) : null, readAt: new Date().toISOString() });
  } catch (error) { return serviceError(error); }
}
