import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de navegador (clave anónima). Igual que el de servidor, se construye
 * de forma perezosa para que compilar sin las variables de entorno no rompa el
 * build al prerenderizar los componentes que lo importan.
 */
let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase no está configurado: faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  cached = createClient(url, anonKey);
  return cached;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
