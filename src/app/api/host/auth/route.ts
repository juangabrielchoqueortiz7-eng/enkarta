import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyPassword, signHostSession } from '@/lib/access';
import { HOST_COOKIE } from '@/lib/host-session';
import { allowsService } from '@/lib/packages';
import { storedServiceConfig } from '@/lib/package-services-server';
import { serviceBody, serviceError } from '@/lib/services-server';

// Login del cliente/anfitrión por evento (correo + contraseña). Una credencial
// pertenece a UNA invitación; la cookie firmada restringe el panel a ese evento.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await serviceBody(request);
    const mail = String(email || '').trim().toLowerCase();
    if (!mail || typeof password !== 'string' || !password || mail.length > 254 || password.length > 200) return NextResponse.json({ error: 'Correo y contraseña no válidos' }, { status: 400 });

    const { data: inv } = await supabaseAdmin
      .from('invitations')
      .select('id, slug, names, host_password_hash, builder_config')
      .eq('host_email', mail)
      .maybeSingle();

    if (!inv || !verifyPassword(String(password), inv.host_password_hash)) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 });
    }
    const config = storedServiceConfig(inv.builder_config);
    if (!allowsService(config, 'hostPanel') && !allowsService(config, 'rsvp')) return NextResponse.json({ error: 'El paquete no incluye gestión ni planilla. Para revisar el diseño utiliza el acceso de revisión.' }, { status: 403 });

    (await cookies()).set(HOST_COOKIE, signHostSession(inv.id, inv.host_password_hash), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
      path: '/',
    });

    return NextResponse.json({ ok: true, slug: inv.slug, names: inv.names });
  } catch (e) { return serviceError(e); }
}

export async function DELETE() {
  (await cookies()).delete(HOST_COOKIE);
  return NextResponse.json({ ok: true });
}
