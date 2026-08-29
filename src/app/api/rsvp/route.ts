import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { canReadResponses } from '@/lib/host-session';
import { requireInvitationService } from '@/lib/package-services-server';
import { mapRsvpRow, readRsvps } from '@/lib/rsvps';
import { parseRsvpInput } from '@/lib/rsvp-contract';
import { mapRsvpState, openReceipt, privateJson, serviceBody, serviceError } from '@/lib/services-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      if (!(await canReadResponses(id))) return privateJson({ error: 'No autorizado' }, 401);
      return privateJson(await readRsvps(id));
    }
    const slug = request.nextUrl.searchParams.get('slug');
    if (!slug) throw new Error('INVALID_INPUT');
    await requireInvitationService(slug, 'rsvp', 'slug');
    const receipt = openReceipt(request, slug, true);
    const { data, error } = await supabaseAdmin.rpc('enkarta_rsvp_state', { p_slug: slug, p_receipt_hash: receipt.hash });
    if (error) return serviceError(error);
    const response = privateJson(mapRsvpState(data));
    if (receipt.fresh && receipt.token) response.cookies.set(receipt.name, receipt.token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/rsvp', maxAge: 60 * 60 * 24 * 180,
    });
    return response;
  } catch (error) { return serviceError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await serviceBody(request);
    const input = parseRsvpInput(body);
    const slug = String(body.slug ?? '').trim();
    if (!slug) throw new Error('INVALID_INPUT');
    await requireInvitationService(slug, 'rsvp', 'slug');
    const receipt = openReceipt(request, slug);
    if (!receipt.hash) return privateJson({ error: 'Actualiza el formulario para iniciar una confirmación segura.', code: 'SESSION_REQUIRED' }, 400);
    const { data, error } = await supabaseAdmin.rpc('enkarta_submit_open_rsvp', {
      p_slug: slug, p_receipt_hash: receipt.hash, p_attending: input.attending, p_passes: input.passes,
      p_name: input.name, p_message: input.message, p_request_id: input.requestId, p_expected_revision: input.expectedRevision,
    });
    if (error) return serviceError(error);
    return privateJson({ ok: true, entry: mapRsvpRow(data.entry), replayed: data.replayed });
  } catch (error) { return serviceError(error); }
}
