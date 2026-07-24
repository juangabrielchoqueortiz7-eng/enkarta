import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de servidor (service role — se salta RLS, sin caché de Next.js).
 *
 * Se construye de forma PEREZOSA: `createClient` solo corre en la primera
 * consulta real, no al importar el módulo. Es lo que permite que `next build`
 * termine sin las llaves de Supabase — al compilar, Next evalúa todas las rutas
 * ("Collecting page data") y antes reventaba con "supabaseUrl is required",
 * tumbando los despliegues de Preview en Vercel (que no llevan los secretos de
 * producción). Las páginas que no tocan la base (la landing, /muestra/*) se
 * generan igual; las que sí la necesitan avisan claro en tiempo de ejecución.
 */
let cached: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase no está configurado: faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY. ' +
      'Añádelas en las variables de entorno (incluido el entorno Preview de Vercel).',
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, options = {}) => fetch(input, { ...options, cache: 'no-store' }),
    },
  });
  return cached;
}

// Proxy: mismo uso de siempre (`supabaseAdmin.from(...)`, `.storage`, `.rpc()`),
// pero el cliente nace en el primer acceso a una propiedad, no al importar.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getAdminClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
