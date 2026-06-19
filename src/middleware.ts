import { NextRequest, NextResponse } from 'next/server';

// Barrera de UX para las subrutas del admin: si no hay cookie de sesión, redirige
// al login (/admin) antes de renderizar. La verificación REAL de la firma se hace
// en cada API (getAdminSession) y en las páginas server (requireAdminPage); aquí
// solo se comprueba presencia (el middleware corre en Edge, sin crypto de Node).
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin es la pantalla de login; protegemos solo las subrutas.
  if (pathname.startsWith('/admin/')) {
    const hasCookie = !!request.cookies.get('enkarta-admin')?.value;
    if (!hasCookie) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path+'],
};
