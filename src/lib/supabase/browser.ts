'use client';

import { createBrowserClient } from '@supabase/ssr';

// Cliente de navegador para iniciar el flujo OAuth de Google y cerrar sesión.
// Escribe la sesión en cookies para que el servidor la lea (createAuthServerClient).

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function authBrowserClient() {
  if (!cached) {
    cached = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return cached;
}
