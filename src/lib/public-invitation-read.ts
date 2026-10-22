import 'server-only';
import { supabaseAdmin } from './supabase/server';
import type { Invitation } from './types';
import { validInvitationSlug } from './invitation-sharing';

/** Request-local read only: never cache invitations, previews or tokens globally. */
export async function readInvitationBySlug(slug: unknown): Promise<Invitation | null> {
  if (!validInvitationSlug(slug)) return null;
  const { data, error } = await supabaseAdmin.from('invitations').select('*').eq('slug', slug).single();
  return error || !data ? null : data as Invitation;
}
