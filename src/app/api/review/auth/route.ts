import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';
import { signReviewSession, verifyPassword } from '@/lib/access';
import { REVIEW_COOKIE } from '@/lib/host-session';
import { privateJson, serviceBody, serviceError } from '@/lib/services-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const body = await serviceBody(request);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password || email.length > 254 || password.length > 200) throw new Error('INVALID_INPUT');
    const { data, error } = await supabaseAdmin.from('invitations').select('id,review_password_hash').eq('review_email', email).maybeSingle();
    if (error) return serviceError(error);
    if (!data?.review_password_hash || !verifyPassword(password, data.review_password_hash)) return privateJson({ error: 'Correo o contraseña de revisión incorrectos.' }, 401);
    (await cookies()).set(REVIEW_COOKIE, signReviewSession(data.id, data.review_password_hash), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return privateJson({ ok: true });
  } catch (error) { return serviceError(error); }
}
export async function DELETE() { (await cookies()).delete(REVIEW_COOKIE); return privateJson({ ok: true }); }
