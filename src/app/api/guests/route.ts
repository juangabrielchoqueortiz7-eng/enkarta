import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { readGuests, mapGuestRow } from '@/lib/guests';
import { genPublicId } from '@/lib/access';
import { canManageInvitation, invitationIdOfGuest } from '@/lib/host-session';
import { privateJson, serviceBody, serviceError } from '@/lib/services-server';
import { isRevision } from '@/lib/rsvp-contract';
import { invitationServiceConfig, guestForServices } from '@/lib/package-services-server';
import { allowsService } from '@/lib/packages';

const forbidden = () => NextResponse.json({ error: 'No autorizado' }, { status: 403 });

// CRUD de invitados (tabla `guests` en Postgres) para el panel del admin/anfitrión.
//   GET    ?id=<invitationId>          → lista
//   POST   { invitationId, guests:[] } | { invitationId, name, ... } → crea uno o varios
//   PATCH  { id, ...campos }           → edita un invitado (mesa, pases, enviada, etc.)
//   DELETE ?guestId=<id>               → elimina
// La confirmación del invitado vive en /api/guests/confirm (público).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const clampPasses = (n: unknown) => Math.max(1, Math.min(20, Math.trunc(Number(n) || 1)));

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowFromInput(invitationId: string, g: any) {
  const name = String(g?.name ?? '').trim().slice(0, 80);
  if (!name) return null;
  return {
    invitation_id: invitationId,
    public_id: genPublicId(),
    name,
    table_no: g?.tableNo ? String(g.tableNo).trim().slice(0, 20) : null,
    passes: clampPasses(g?.passes),
    allow_kids: g?.allowKids !== false,
    sent: g?.sent === true,
    status: 'pending' as const,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json([]);
  if (!(await canManageInvitation(id, 'guestManagement'))) return forbidden();
  const { config } = await invitationServiceConfig(id);
  return NextResponse.json((await readGuests(id)).map(guest => guestForServices(guest, config)));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const invitationId = String(body.invitationId || body.id || '').trim();
    if (!invitationId) return NextResponse.json({ error: 'invitationId requerido' }, { status: 400 });
    if (!(await canManageInvitation(invitationId, 'guestManagement'))) return forbidden();
    const { config } = await invitationServiceConfig(invitationId);

    const input = Array.isArray(body.guests) ? body.guests : [body];
    const rows = input.map((g: unknown) => rowFromInput(invitationId, g)).filter(Boolean);
    if (!allowsService(config, 'tableAssignment')) rows.forEach((row: { table_no: string | null }) => { row.table_no = null; });
    if (!rows.length) return NextResponse.json({ error: 'Sin invitados válidos' }, { status: 400 });

    const { data, error } = await supabaseAdmin.from('guests').insert(rows).select('*');
    if (error) return serviceError(error);
    return NextResponse.json({ ok: true, guests: (data ?? []).map(mapGuestRow) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await serviceBody(request);
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const ownerId = await invitationIdOfGuest(id);
    if (!ownerId || !(await canManageInvitation(ownerId, 'guestManagement'))) return forbidden();
    const { config } = await invitationServiceConfig(ownerId);
    if (body.tableNo !== undefined && !allowsService(config, 'tableAssignment')) return serviceError(new Error('SERVICE_NOT_INCLUDED'));
    if (body.expectedRevision !== undefined && !isRevision(body.expectedRevision)) return privateJson({ error: 'La revisión del invitado no es válida.' }, 400);

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 80);
    if (body.tableNo !== undefined) patch.table_no = body.tableNo ? String(body.tableNo).trim().slice(0, 20) : null;
    if (body.passes !== undefined) patch.passes = clampPasses(body.passes);
    if (body.allowKids !== undefined) patch.allow_kids = body.allowKids === true;
    if (body.sent === true) { patch.sent = true; patch.delivery_status = 'marked'; patch.manually_marked_at = new Date().toISOString(); }
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    if (patch.name === '') return privateJson({ error: 'El nombre no puede estar vacío.' }, 400);

    let query = supabaseAdmin.from('guests').update(patch).eq('id', id);
    if (body.expectedRevision !== undefined) query = query.eq('response_revision', body.expectedRevision);
    const { data, error } = await query.select('*').maybeSingle();
    if (error) return serviceError(error);
    if (!data) return privateJson({ error: 'Este invitado cambió en otra sesión. Actualiza sus datos antes de guardar.', code: 'STALE_GUEST' }, 409);
    return NextResponse.json({ ok: true, guest: data ? guestForServices(mapGuestRow(data), config) : null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const guestId = new URL(request.url).searchParams.get('guestId');
  if (!guestId) return NextResponse.json({ error: 'guestId requerido' }, { status: 400 });
  const ownerId = await invitationIdOfGuest(guestId);
  if (!ownerId || !(await canManageInvitation(ownerId, 'guestManagement'))) return forbidden();
  const revision = new URL(request.url).searchParams.get('expectedRevision');
  if (revision !== null && (!/^\d+$/.test(revision) || !isRevision(Number(revision)))) return privateJson({ error: 'Revisión no válida.' }, 400);
  let query = supabaseAdmin.from('guests').delete().eq('id', guestId);
  if (revision !== null) query = query.eq('response_revision', Number(revision));
  const { data, error } = await query.select('id').maybeSingle();
  if (error) return serviceError(error);
  if (!data) return privateJson({ error: 'El invitado cambió o ya fue eliminado. Actualiza antes de continuar.' }, 409);
  return NextResponse.json({ ok: true });
}
