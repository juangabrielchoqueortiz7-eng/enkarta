import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { mapGuestRow, materializeAttendees } from '@/lib/guests';
import { genAccessToken, genAccessCode } from '@/lib/access';

// Confirmación pública del invitado (desde su link único ?g=). Actualiza su
// estado, y si asiste genera el token + ID de acceso del QR y materializa sus
// asientos (attendees) para el control de ingreso en la puerta.
//   POST { slug, publicId, attending:'yes'|'no', passes?, confirmName?, message? }

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = String(body.slug || '').trim();
    const publicId = String(body.publicId || '').trim();
    if (!slug || !publicId) return NextResponse.json({ error: 'slug y publicId requeridos' }, { status: 400 });

    // Resolver invitación + invitado, y validar fecha límite de confirmación.
    const { data: inv } = await supabaseAdmin
      .from('invitations')
      .select('id, rsvp_deadline')
      .eq('slug', slug)
      .single();
    if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });

    if (inv.rsvp_deadline && inv.rsvp_deadline < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: 'La fecha límite de confirmación ya pasó' }, { status: 403 });
    }

    const { data: gRow } = await supabaseAdmin
      .from('guests')
      .select('*')
      .eq('invitation_id', inv.id)
      .eq('public_id', publicId)
      .maybeSingle();
    if (!gRow) return NextResponse.json({ error: 'Invitado no encontrado' }, { status: 404 });

    const attending = body.attending === 'no' ? 'declined' : 'confirmed';
    const confirmedPasses = attending === 'confirmed'
      ? Math.max(1, Math.min(gRow.passes || 1, Number(body.passes) || 1))
      : 0;

    // Generar token/código de acceso una sola vez (estable en reconfirmaciones).
    const accessToken = gRow.access_token || genAccessToken();
    const accessCode = gRow.access_code || genAccessCode();

    const patch: Record<string, unknown> = {
      status: attending,
      confirmed_passes: confirmedPasses,
      confirm_name: body.confirmName ? String(body.confirmName).trim().slice(0, 120) : gRow.name,
      message: body.message ? String(body.message).trim().slice(0, 400) : null,
      responded_at: new Date().toISOString(),
    };
    if (attending === 'confirmed') {
      patch.access_token = accessToken;
      patch.access_code = accessCode;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('guests').update(patch).eq('id', gRow.id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Materializar los asientos para el check-in (solo si asiste).
    if (attending === 'confirmed') await materializeAttendees(gRow.id, gRow.passes || 1);

    return NextResponse.json({ ok: true, guest: mapGuestRow(updated) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 });
  }
}
