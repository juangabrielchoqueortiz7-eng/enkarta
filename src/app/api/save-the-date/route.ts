import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseInvitation, type Invitation } from '@/lib/types';
import { clientInvitation } from '@/lib/client-invitation';
import { mapSaveDateResponse, parseSaveDateInput, publishedSaveDate } from '@/lib/save-date';
import { privateJson, serviceBody, serviceError } from '@/lib/services-server';
import { createHash } from 'crypto';
import { canReadResponses } from '@/lib/host-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function available(slug: string) {
  const { data, error } = await supabaseAdmin.from('invitations').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('NOT_FOUND');
  const invitation = clientInvitation(parseInvitation(data as Invitation), true);
  if (!publishedSaveDate(invitation) || data.is_active === false || ['disabled', 'expired'].includes(data.status)) throw new Error('SAVE_DATE_CLOSED');
  return { id: data.id as string, invitation };
}

export async function GET(request: NextRequest) {
  try {
    const invitationId = request.nextUrl.searchParams.get('id');
    if (invitationId) {
      if (!(await canReadResponses(invitationId))) return privateJson({ error: 'No autorizado' }, 401);
      const { data, error } = await supabaseAdmin.from('save_date_responses').select('id,name,interest,guests,message,revision,updated_at').eq('invitation_id', invitationId).order('updated_at', { ascending: false }).limit(500);
      if (error) return serviceError(error);
      const responses = (data ?? []).map(mapSaveDateResponse);
      return privateJson({ responses, metrics: {
        total: responses.length,
        interested: responses.filter(item => item.interest === 'interested').length,
        maybe: responses.filter(item => item.interest === 'maybe').length,
        unavailable: responses.filter(item => item.interest === 'unavailable').length,
        estimatedGuests: responses.filter(item => item.interest !== 'unavailable').reduce((sum, item) => sum + item.guests, 0),
      } });
    }
    const slug = request.nextUrl.searchParams.get('slug')?.trim() ?? '';
    const responseKey = request.nextUrl.searchParams.get('responseKey') ?? '';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[0-9a-f-]{36}$/i.test(responseKey)) throw new Error('INVALID_INPUT');
    const { id } = await available(slug);
    const hash = createHash('sha256').update(responseKey).digest('hex');
    const { data, error } = await supabaseAdmin.from('save_date_responses').select('*').eq('invitation_id', id).eq('response_key_hash', hash).maybeSingle();
    if (error) return serviceError(error);
    return privateJson({ response: data ? mapSaveDateResponse(data) : null });
  } catch (error) { return serviceError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await serviceBody(request);
    const input = parseSaveDateInput(body);
    await available(input.slug);
    const { data, error } = await supabaseAdmin.rpc('enkarta_submit_save_date', {
      p_slug: input.slug, p_response_key_hash: input.responseKeyHash, p_name: input.name, p_interest: input.interest,
      p_guests: input.guests, p_message: input.message, p_request_id: input.requestId,
      p_request_fingerprint: input.fingerprint, p_expected_revision: input.expectedRevision,
    });
    if (error) return serviceError(error);
    return privateJson({ ok: true, response: mapSaveDateResponse(data.response), replayed: data.replayed === true });
  } catch (error) { return serviceError(error); }
}
