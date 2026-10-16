import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { readGuests, mapGuestRow } from '@/lib/guests';
import { genPublicId } from '@/lib/access';
import { canManageInvitation, invitationIdOfGuest } from '@/lib/host-session';
import { privateJson, serviceBody, serviceError } from '@/lib/services-server';
import { isRevision, isUuid } from '@/lib/rsvp-contract';
import { invitationServiceConfig, guestForServices } from '@/lib/package-services-server';
import { allowsService } from '@/lib/packages';
import { guestMetadata, parseGuestMetadata, withGuestMetadata } from '@/lib/guest-metadata';

const forbidden = () => NextResponse.json({ error: 'No autorizado' }, { status: 403 });

// CRUD de invitados (tabla `guests` en Postgres) para el panel del admin/anfitrión.
//   GET    ?id=<invitationId>          → lista
//   POST   { invitationId, requestId, guests:[] } → creación transaccional recuperable
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
    guest_metadata: parseGuestMetadata(g),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return privateJson([]);
    if (!(await canManageInvitation(id, 'guestManagement'))) return forbidden();
    const { config } = await invitationServiceConfig(id);
    return privateJson((await readGuests(id)).map(guest => guestForServices(withGuestMetadata(guest, config.guestMeta?.[guest.publicId]), config)));
  } catch (error) { return serviceError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await serviceBody(request, 131072);
    const invitationId = String(body.invitationId || body.id || '').trim();
    if (!invitationId) return NextResponse.json({ error: 'invitationId requerido' }, { status: 400 });
    if (!(await canManageInvitation(invitationId, 'guestManagement'))) return forbidden();
    if (!isUuid(body.requestId)) return privateJson({ error: 'Actualiza el panel antes de importar. Falta el identificador de la operación; no se creó ningún invitado.', code: 'IMPORT_REQUEST_REQUIRED' }, 400);
    const { config } = await invitationServiceConfig(invitationId);

    const input = Array.isArray(body.guests) ? body.guests : [body];
    if (input.length > 200) return privateJson({ error: 'Importa hasta 200 invitados por lote.' }, 400);
    if (input.some((value: unknown) => {
      const guest = value as { name?: unknown; passes?: unknown; tableNo?: unknown; allowKids?: unknown; sent?: unknown } | null;
      return !guest || typeof guest.name !== 'string' || !guest.name.trim() || guest.name.trim().length > 80
        || (guest.tableNo !== undefined && guest.tableNo !== null && (typeof guest.tableNo !== 'string' || guest.tableNo.trim().length > 20))
        || (guest.allowKids !== undefined && typeof guest.allowKids !== 'boolean')
        || (guest.sent !== undefined && typeof guest.sent !== 'boolean')
        || (guest.passes !== undefined && (typeof guest.passes !== 'number' || !Number.isInteger(guest.passes) || guest.passes < 1 || guest.passes > 20));
    })) return privateJson({ error: 'Revisa nombres y pases: usa un entero entre 1 y 20. No se importó ninguna fila.' }, 400);
    const rows = input.map((g: unknown) => rowFromInput(invitationId, g)).filter((row): row is NonNullable<typeof row> => row !== null);
    if (!rows.length) return NextResponse.json({ error: 'Sin invitados válidos' }, { status: 400 });

    const { data, error } = await supabaseAdmin.rpc('enkarta_import_guests', {
      p_invitation_id: invitationId, p_request_id: body.requestId, p_guests: rows,
      p_table_assignment: allowsService(config, 'tableAssignment'),
    });
    if (error) return serviceError(error);
    if (!data || !Array.isArray(data.guests)) throw new Error('SERVICE_UNAVAILABLE');
    return privateJson({ ok: true, requestId: body.requestId, replayed: data.replayed === true,
      importedCount: data.importedCount, missingCount: data.missingCount,
      guests: data.guests.map((row: Record<string, unknown>) => guestForServices(mapGuestRow(row, true), config)) });
  } catch (e) {
    return serviceError(e);
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
    if (!isRevision(body.expectedRevision)) return privateJson({ error: 'Actualiza la lista antes de guardar.', code: 'GUEST_REVISION_REQUIRED' }, 400);
    if (body.passes !== undefined && (typeof body.passes !== 'number' || !Number.isInteger(body.passes) || body.passes < 1 || body.passes > 20)) return serviceError(new Error('INVALID_PASSES'));

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = String(body.name).trim().slice(0, 80);
    if (body.tableNo !== undefined) patch.table_no = body.tableNo ? String(body.tableNo).trim().slice(0, 20) : null;
    if (body.passes !== undefined) patch.passes = clampPasses(body.passes);
    if (body.allowKids !== undefined) patch.allow_kids = body.allowKids === true;
    if (body.sent === true) { patch.sent = true; patch.delivery_status = 'marked'; patch.manually_marked_at = new Date().toISOString(); }
    const metadata = parseGuestMetadata(body);
    if (Object.keys(metadata).length) {
      const current = await supabaseAdmin.from('guests').select('guest_metadata,response_revision').eq('id', id).maybeSingle();
      if (current.error) return serviceError(current.error);
      if (!current.data || current.data.response_revision !== body.expectedRevision) return privateJson({ error: 'El invitado cambió. Actualiza antes de guardar.', code: 'STALE_GUEST' }, 409);
      patch.guest_metadata = { ...guestMetadata(current.data.guest_metadata), ...metadata };
    }
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    if (patch.name === '') return privateJson({ error: 'El nombre no puede estar vacío.' }, 400);

    let query = supabaseAdmin.from('guests').update(patch).eq('id', id);
    if (body.expectedRevision !== undefined) query = query.eq('response_revision', body.expectedRevision);
    const { data, error } = await query.select('*').maybeSingle();
    if (error) return serviceError(error);
    if (!data) return privateJson({ error: 'Este invitado cambió en otra sesión. Actualiza sus datos antes de guardar.', code: 'STALE_GUEST' }, 409);
    return privateJson({ ok: true, guest: data ? guestForServices(mapGuestRow(data, true), config) : null });
  } catch (e) {
    return serviceError(e);
  }
}

export async function DELETE(request: NextRequest) {
  const guestId = new URL(request.url).searchParams.get('guestId');
  if (!guestId) return NextResponse.json({ error: 'guestId requerido' }, { status: 400 });
  const ownerId = await invitationIdOfGuest(guestId);
  if (!ownerId || !(await canManageInvitation(ownerId, 'guestManagement'))) return forbidden();
  const revision = new URL(request.url).searchParams.get('expectedRevision');
    if (revision === null || !/^\d+$/.test(revision) || !isRevision(Number(revision))) return privateJson({ error: 'Actualiza la lista antes de eliminar.', code: 'GUEST_REVISION_REQUIRED' }, 400);
  let query = supabaseAdmin.from('guests').delete().eq('id', guestId);
  if (revision !== null) query = query.eq('response_revision', Number(revision));
  const { data, error } = await query.select('id').maybeSingle();
  if (error) return serviceError(error);
  if (!data) return privateJson({ error: 'El invitado cambió o ya fue eliminado. Actualiza antes de continuar.' }, 409);
  return NextResponse.json({ ok: true });
}
