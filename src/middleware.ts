import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Barrera de UX para las subrutas del admin: si no hay cookie de sesión, redirige
// al login (/admin) antes de renderizar. La verificación REAL de la firma se hace
// en cada API (getAdminSession) y en las páginas server (requireAdminPage); aquí
// solo se comprueba presencia (el middleware corre en Edge, sin crypto de Node).
//
// En /socios además se refresca el token de Supabase Auth: un Server Component no
// puede escribir cookies, así que la renovación tiene que ocurrir aquí.

/** /socios es la página pública del programa; todo lo de adentro pide sesión. */
const isPartnerPublic = (pathname: string) => pathname === '/socios' || pathname === '/socios/';

async function partnerSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  try {
    const client = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await client.auth.getUser();
    if (!data.user && !isPartnerPublic(request.nextUrl.pathname)) {
      const login = new URL('/socios', request.url);
      login.searchParams.set('next', request.nextUrl.pathname);
      return NextResponse.redirect(login);
    }
  } catch {
    // Un fallo de red con Auth no debe tumbar la página pública del programa.
    if (!isPartnerPublic(request.nextUrl.pathname)) return NextResponse.redirect(new URL('/socios', request.url));
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin es la pantalla de login; protegemos solo las subrutas.
  if (pathname.startsWith('/admin/')) {
    const hasCookie = !!request.cookies.get('enkarta-admin')?.value;
    if (!hasCookie) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  if (pathname === '/socios' || pathname.startsWith('/socios/')) return partnerSession(request);

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path+', '/socios/:path*'],
};
