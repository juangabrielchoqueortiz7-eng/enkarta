import { NextRequest } from 'next/server';
import { getHostSession, getAdminSession } from '@/lib/host-session';
import { readHostSnapshot } from '@/lib/host-dashboard-server';
import { privateJson, serviceError } from '@/lib/services-server';
import { isUuid } from '@/lib/rsvp-contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const host = await getHostSession(true);
    const requested = request.nextUrl.searchParams.get('id');
    const id = requested || host;
    if (!isUuid(id) || (host !== id && !await getAdminSession())) return privateJson({ error: 'La sesión terminó o no tiene acceso a este evento.' }, 403);
    return privateJson(await readHostSnapshot(id));
  } catch (error) { return serviceError(error); }
}
