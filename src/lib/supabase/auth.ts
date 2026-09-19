import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente de Supabase Auth ligado a las cookies de la petición: es el que sabe
// QUIÉN es el socio que entró con Google. No confundir con `supabaseAdmin`
// (service role, lee y escribe datos) ni con `supabase` (cliente anónimo).
// Nunca importar esto desde un componente 'use client'.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function createAuthServerClient() {
  const store = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Un Server Component no puede escribir cookies: el refresco del token
          // lo hace el middleware antes de renderizar.
        }
      },
    },
  });
}
