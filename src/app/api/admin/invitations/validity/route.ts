import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/host-session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { isUuid } from '@/lib/rsvp-contract';
import { parseValidityCommand } from '@/lib/invitation-validity';
import { privateJson, serviceBody } from '@/lib/services-server';
import { readValidity, validityError } from '@/lib/validity-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return privateJson({ error: 'No autorizado' }, 403);
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!isUuid(id)) throw new Error('INVALID_INPUT');
    return privateJson(await readValidity(id, true));
  } catch (error) { return validityError(error); }
}
export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return privateJson({ error: 'No autorizado' }, 403);
  try {
    const command = parseValidityCommand(await serviceBody(request));
    const { data, error } = await supabaseAdmin.rpc('enkarta_change_validity', {
      p_id: command.id, p_action: command.action, p_days: command.days, p_expires_at: command.expiresAt,
      p_reason: command.reason, p_expected_revision: command.expectedRevision, p_request_id: command.requestId,
    });
    if (error) throw error;
    return privateJson({ ...await readValidity(command.id, true), replayed: data?.replayed === true });
  } catch (error) { return validityError(error); }
}
