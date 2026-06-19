import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { hashPassword } from '@/lib/access';
import { getAdminSession } from '@/lib/host-session';

// El equipo Enkarta fija las credenciales de acceso del cliente para un evento:
// correo + contraseña (se hashea) + fecha límite de confirmación. Solo admin.
//   GET  ?id=<invitationId>  → { hostEmail, hasPassword, rsvpDeadline }
//   POST { id, email?, password?, rsvpDeadline? }

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const { data } = await supabaseAdmin
    .from('invitations')
    .select('host_email, host_password_hash, rsvp_deadline')
    .eq('id', id)
    .maybeSingle();

  return NextResponse.json({
    hostEmail: data?.host_email ?? '',
    hasPassword: !!data?.host_password_hash,
    rsvpDeadline: data?.rsvp_deadline ?? '',
  });
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    const patch: Record<string, unknown> = {};
    if (body.email !== undefined) patch.host_email = body.email ? String(body.email).trim().toLowerCase() : null;
    if (body.password) patch.host_password_hash = hashPassword(String(body.password));
    if (body.rsvpDeadline !== undefined) patch.rsvp_deadline = body.rsvpDeadline || null;
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });

    const { error } = await supabaseAdmin.from('invitations').update(patch).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 });
  }
}
