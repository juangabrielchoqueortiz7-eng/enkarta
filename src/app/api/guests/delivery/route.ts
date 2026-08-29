import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { invitationIdOfGuest, canManageInvitation } from '@/lib/host-session';
import { privateJson, serviceBody, serviceError } from '@/lib/services-server';
import { parseDeliveryInput } from '@/lib/guest-delivery';
import { mapGuestRow } from '@/lib/guests';

export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function POST(request:NextRequest) {
 try {
  const input=parseDeliveryInput(await serviceBody(request));
  const owner=await invitationIdOfGuest(input.guestId);
  if (!owner || !(await canManageInvitation(owner,'guestManagement'))) return privateJson({error:'No autorizado'},403);
  const {data,error}=await supabaseAdmin.rpc('enkarta_record_delivery',{p_guest_id:input.guestId,p_action:input.action,p_expected_revision:input.expectedRevision,p_request_id:input.requestId});
  if (error) throw error;
  return privateJson({guest:mapGuestRow(data.guest),replayed:data.replayed===true});
 } catch(error) {
  const message=(error as {message?:string}).message;
  if (message==='STALE_GUEST') return privateJson({error:'El invitado cambió en otra sesión. Actualiza antes de continuar.',code:message},409);
  if (message==='REMINDER_NOT_NEEDED') return privateJson({error:'Este invitado ya respondió; no necesita recordatorio.',code:message},409);
  return serviceError(error);
 }
}
