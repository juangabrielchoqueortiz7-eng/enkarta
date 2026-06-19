import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signAdminSession } from '@/lib/access';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    const cookieStore = cookies();
    // Valor firmado (HMAC): no se puede falsificar enviando un texto fijo.
    (await cookieStore).set('enkarta-admin', signAdminSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = cookies();
  (await cookieStore).delete('enkarta-admin');
  return NextResponse.json({ success: true });
}
