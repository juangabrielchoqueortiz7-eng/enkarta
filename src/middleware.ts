import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (not the auth API)
  if (pathname.startsWith('/admin')) {
    const authCookie = request.cookies.get('enkarta-admin');

    if (!authCookie || authCookie.value !== 'authenticated') {
      // Redirect to login or return the admin page which shows login
      // We'll handle this client-side instead
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
