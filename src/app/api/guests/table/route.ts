import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// Buscador de mesa público: el invitado escribe su nombre y obtiene su número de
// mesa. Devuelve SOLO la coincidencia de ese nombre (no lista a los demás
// invitados). Coincidencia por nombre (parcial, sin distinción de may/min).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = String(body.slug || '').trim();
    const query = String(body.name || '').trim();
    if (!slug || query.length < 2) {
      return NextResponse.json({ error: 'Escribe tu nombre completo.' }, { status: 400 });
    }

    const { data: inv } = await supabaseAdmin.from('invitations').select('id').eq('slug', slug).single();
    if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });

    // Búsqueda por nombre del invitado o por el nombre con que confirmó.
    const { data } = await supabaseAdmin
      .from('guests')
      .select('name, table_no, passes, confirm_name')
      .eq('invitation_id', inv.id)
      .or(`name.ilike.%${query}%,confirm_name.ilike.%${query}%`)
      .limit(5);

    const matches = (data ?? []).filter(g => g.table_no);
    if (matches.length === 0) {
      return NextResponse.json({ found: false });
    }
    // Si hay varias coincidencias, devolvemos todas para que el invitado elija.
    return NextResponse.json({
      found: true,
      results: matches.map(g => ({ name: g.name, tableNo: g.table_no, passes: g.passes })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 });
  }
}
