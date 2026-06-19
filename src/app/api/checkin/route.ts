import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { mapGuestRow, mapAttendeeRow, materializeAttendees } from '@/lib/guests';
import { canManageInvitation, invitationIdOfAttendee } from '@/lib/host-session';

const FORBIDDEN = NextResponse.json({ error: 'No autorizado' }, { status: 403 });

// Control de acceso en la puerta.
//   GET  ?token=<accessToken> | ?code=<accessCode>  → carga el grupo (guest + asientos)
//   POST { attendeeId, action:'in'|'out', by? }      → marca ingreso/salida (atómico) + bitácora
// El access_token del QR (o el access_code legible) es el secreto de acceso.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Resuelve el invitado por token (QR) o por código legible (ENK-XXXX). */
async function resolveGuest(token: string | null, code: string | null) {
  let q = supabaseAdmin.from('guests').select('*');
  if (token) q = q.eq('access_token', token);
  else if (code) q = q.eq('access_code', code.toUpperCase());
  else return null;
  const { data } = await q.maybeSingle();
  return data;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const code = url.searchParams.get('code');

  const g = await resolveGuest(token, code);
  if (!g) return NextResponse.json({ error: 'Código no válido' }, { status: 404 });
  // Solo el operador del evento (o admin) puede cargar el grupo.
  if (!(await canManageInvitation(g.invitation_id))) return FORBIDDEN;
  if (g.status !== 'confirmed') return NextResponse.json({ error: 'Este invitado no ha confirmado asistencia' }, { status: 409 });

  // Asegura los asientos según los pases (reconcilia si cambiaron).
  const attendees = await materializeAttendees(g.id, g.passes || 1);

  return NextResponse.json({ guest: mapGuestRow(g), attendees });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const attendeeId = String(body.attendeeId || '').trim();
    const action = body.action === 'out' ? 'out' : 'in';
    if (!attendeeId) return NextResponse.json({ error: 'attendeeId requerido' }, { status: 400 });

    const ownerId = await invitationIdOfAttendee(attendeeId);
    if (!ownerId || !(await canManageInvitation(ownerId))) return FORBIDDEN;

    const { data: att } = await supabaseAdmin.from('attendees').select('*').eq('id', attendeeId).maybeSingle();
    if (!att) return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 });

    // Antifraude: no permitir marcar el mismo estado dos veces seguidas.
    const targetState = action === 'in' ? 'in' : 'out';
    if (att.state === targetState) {
      return NextResponse.json({
        error: action === 'in' ? 'Esta persona ya ingresó' : 'Esta persona no está dentro',
        attendee: mapAttendeeRow(att),
      }, { status: 409 });
    }

    const now = new Date().toISOString();
    const patch = action === 'in'
      ? { state: 'in', checked_in_at: now }
      : { state: 'out', checked_out_at: now };

    const { data: updated, error } = await supabaseAdmin
      .from('attendees').update(patch).eq('id', attendeeId).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Bitácora para auditoría / antifraude.
    await supabaseAdmin.from('access_log').insert({ guest_id: att.guest_id, attendee_id: attendeeId, action });

    return NextResponse.json({ ok: true, attendee: mapAttendeeRow(updated) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 });
  }
}
