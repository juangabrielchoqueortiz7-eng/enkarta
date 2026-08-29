import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';
import { DOOR_SESSION_SECONDS, signDoorSession, verifyPassword } from '@/lib/access';
import { DOOR_COOKIE } from '@/lib/host-session';
import { allowsService } from '@/lib/packages';
import { storedServiceConfig } from '@/lib/package-services-server';
import { privateJson, serviceBody, serviceError } from '@/lib/services-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await serviceBody(request);
    if (typeof email !== 'string' || !email.trim() || email.length > 254 || typeof password !== 'string' || !password || password.length > 200) return privateJson({ error: 'Correo y contraseña no válidos.' }, 400);
    const { data, error } = await supabaseAdmin.from('invitations').select('id,door_password_hash,builder_config').eq('door_email', email.trim().toLowerCase()).maybeSingle();
    if (error) return serviceError(error);
    if (!data || !verifyPassword(password, data.door_password_hash)) return privateJson({ error: 'Correo o contraseña incorrectos.' }, 401);
    if (!allowsService(storedServiceConfig(data.builder_config), 'qrAccess')) return privateJson({ error: 'El control de acceso no está habilitado para este evento.' }, 403);
    (await cookies()).set(DOOR_COOKIE, signDoorSession(data.id, data.door_password_hash), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: DOOR_SESSION_SECONDS });
    return privateJson({ ok: true });
  } catch (error) { return serviceError(error); }
}
export async function DELETE() {
  (await cookies()).delete(DOOR_COOKIE);
  return privateJson({ ok: true });
}
