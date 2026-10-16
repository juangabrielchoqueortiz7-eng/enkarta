import { supabaseAdmin } from './supabase/server';
import { parseGuestMetadata } from './guest-metadata';

/** Authorized event only; return candidate indexes, never roster contacts. */
export async function readRosterDuplicates(invitationId: string, body: Record<string, unknown>) {
  if (!Array.isArray(body.candidates) || body.candidates.length > 200) throw new Error('INVALID_INPUT');
  const candidates = body.candidates.map(item => {
    if (!item || typeof item !== 'object' || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80) throw new Error('INVALID_INPUT');
    return { name: item.name, phone: parseGuestMetadata({ phone: item.phone }).phone || '' };
  });
  const { data, error } = await supabaseAdmin.rpc('enkarta_roster_duplicates', { p_invitation_id: invitationId, p_candidates: candidates });
  if (error) throw error;
  if (!Array.isArray(data) || data.some(index => !Number.isInteger(index) || index < 0 || index >= candidates.length)) throw new Error('SERVICE_UNAVAILABLE');
  return { duplicates: data };
}
