import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { canManageInvitation } from '@/lib/host-session';
import { insertRsvp, readRsvps } from '@/lib/rsvps';
import type { RsvpEntry } from '@/lib/types';

// Confirmaciones de asistencia abiertas (RSVP). Datos en la tabla `rsvps`
// (migración 003, INSERT atómico — ver src/lib/rsvps.ts, que también cubre el
// fallback e importación del JSON legacy). POST es público (lo usan los
// invitados); GET ?id= es de los paneles: admin o el anfitrión dueño.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json([]);
  if (!(await canManageInvitation(id))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return NextResponse.json(await readRsvps(id));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = String(body.slug || '').trim();
    if (!slug) return NextResponse.json({ error: 'slug requerido' }, { status: 400 });

    const { data: inv } = await supabaseAdmin.from('invitations').select('id').eq('slug', slug).single();
    if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });

    const entry: RsvpEntry = {
      id: `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: String(body.name || '').trim().slice(0, 80) || 'Invitado',
      attending: body.attending === 'no' ? 'no' : 'yes',
      passes: Math.max(0, Math.min(20, Number(body.passes) || 1)),
      message: String(body.message || '').trim().slice(0, 400),
      at: new Date().toISOString(),
    };

    const error = await insertRsvp(inv.id, entry);
    if (error) return NextResponse.json({ error }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 });
  }
}
