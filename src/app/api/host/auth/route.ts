import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyPassword, signHostSession } from '@/lib/access';
import { HOST_COOKIE } from '@/lib/host-session';

// Login del cliente/anfitrión por evento (correo + contraseña). Una credencial
// pertenece a UNA invitación; la cookie firmada restringe el panel a ese evento.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const mail = String(email || '').trim().toLowerCase();
    if (!mail || !password) return NextResponse.json({ error: 'Correo y contraseña requeridos' }, { status: 400 });

    const { data: inv } = await supabaseAdmin
      .from('invitations')
      .select('id, slug, names, host_password_hash')
      .ilike('host_email', mail)
      .maybeSingle();

    if (!inv || !verifyPassword(String(password), inv.host_password_hash)) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 });
    }

    (await cookies()).set(HOST_COOKIE, signHostSession(inv.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
      path: '/',
    });

    return NextResponse.json({ ok: true, slug: inv.slug, names: inv.names });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE() {
  (await cookies()).delete(HOST_COOKIE);
  return NextResponse.json({ ok: true });
}
