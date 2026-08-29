import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { mapGuestRow } from '@/lib/guests';
import { genAccessToken, genAccessCode } from '@/lib/access';
import { parseRsvpInput } from '@/lib/rsvp-contract';
import { mapRsvpState, privateJson, serviceBody, serviceError } from '@/lib/services-server';
import { guestForServices, requireInvitationService } from '@/lib/package-services-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    const publicId = request.nextUrl.searchParams.get('publicId');
    if (!slug || !publicId) throw new Error('INVALID_INPUT');
    const { config } = await requireInvitationService(slug, 'rsvp', 'slug');
    const { data, error } = await supabaseAdmin.rpc('enkarta_rsvp_state', { p_slug: slug, p_public_id: publicId });
    if (error) return serviceError(error);
    const state = mapRsvpState(data);
    return privateJson({ ...state, guest: guestForServices(state.guest, config) });
  } catch (error) { return serviceError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await serviceBody(request);
    const input = parseRsvpInput(body);
    const slug = String(body.slug ?? '').trim();
    const publicId = String(body.publicId ?? '').trim();
    if (!slug || !publicId) throw new Error('INVALID_INPUT');
    const { config } = await requireInvitationService(slug, 'rsvp', 'slug');
    const { data, error } = await supabaseAdmin.rpc('enkarta_confirm_guest', {
      p_slug: slug, p_public_id: publicId, p_attending: input.attending, p_passes: input.passes,
      p_name: input.name, p_message: input.message, p_request_id: input.requestId,
      p_expected_revision: input.expectedRevision, p_token: genAccessToken(), p_code: genAccessCode(),
    });
    if (error) return serviceError(error);
    return privateJson({ ok: true, guest: guestForServices(mapGuestRow(data.guest), config), replayed: data.replayed });
  } catch (error) { return serviceError(error); }
}
