import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAdminSession, getHostSession, getDoorSession, canScanInvitation } from '@/lib/host-session';
import { requireInvitationService } from '@/lib/package-services-server';
import { allowsService } from '@/lib/packages';
import { isUuid } from '@/lib/rsvp-contract';
import { privateJson, serviceError } from '@/lib/services-server';
import { receptionSearch } from '@/lib/reception-search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams, door = params.get('scope') === 'door';
    const admin = !door && await getAdminSession();
    const owner = door ? await getDoorSession() : await getHostSession();
    if (!admin && !owner) return privateJson({ error: 'No autorizado' }, 403);
    const requested = params.get('invitationId');
    if (!admin && requested && requested !== owner) return privateJson({ error: 'No autorizado' }, 403);
    const invitationId = admin ? requested || owner : owner;
    if (!isUuid(invitationId)) throw new Error('INVALID_INPUT');
    if (!await canScanInvitation(invitationId)) return privateJson({ error: 'No autorizado' }, 403);
    const { config } = await requireInvitationService(invitationId, 'qrAccess');
    const search = receptionSearch(params.get('q') || '', params.get('field') || 'name');
    if (search.field === 'table' && !allowsService(config, 'tableAssignment')) throw new Error('SERVICE_NOT_INCLUDED');
    const open = await supabaseAdmin.rpc('enkarta_assert_event_open', { p_id: invitationId, p_deadline: false });
    if (open.error) throw open.error;
    // Minimal reception DTO. No contact data, messages or access tokens.
    const result = await supabaseAdmin.from('guests').select('id,name,table_no,confirmed_passes,passes')
      .eq('invitation_id', invitationId).eq('status', 'confirmed')
      .ilike(search.field === 'table' ? 'table_no' : 'name', search.pattern).order('name').limit(21);
    if (result.error) throw result.error;
    const rows = result.data ?? [];
    return privateJson({ guests: rows.slice(0, 20).map(row => ({ id: row.id, name: row.name,
      ...(allowsService(config, 'tableAssignment') && row.table_no ? { tableNo: row.table_no } : {}), passes: row.confirmed_passes ?? row.passes })), hasMore: rows.length > 20 });
  } catch (error) { return serviceError(error); }
}
