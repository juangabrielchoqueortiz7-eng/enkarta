// Read-only deployment check. Does not create invitations, RSVP or access records.
const { loadEnvConfig } = require('@next/env');
const { randomUUID } = require('node:crypto');
loadEnvConfig(process.cwd());
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const functions = ['enkarta_assert_event_open', 'enkarta_rsvp_state', 'enkarta_confirm_guest', 'enkarta_submit_open_rsvp', 'enkarta_checkin_group', 'enkarta_checkin'];
async function read(path, key, options = {}) {
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...options.headers },
    signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, body: await response.json() };
}
async function main() {
  if (!base || !service || !anon) throw new Error('Faltan variables de Supabase; no se muestran sus valores.');
  const schema = await read('', service, { headers: { Accept: 'application/openapi+json' } });
  if (schema.status !== 200) throw new Error(`Esquema no disponible: HTTP ${schema.status}`);
  for (const name of functions) {
    if (!schema.body.paths?.[`/rpc/${name}`]) throw new Error(`Falta la función ${name}`);
  }
  for (const [table, columns] of Object.entries({ guests: 'response_revision,last_response_request', attendees: 'revision', rsvps: 'receipt_hash,response_revision', access_log: 'request_id,before_revision,operator', builder_versions: 'id' })) {
    const result = await read(`${table}?select=${columns}&limit=0`, service);
    if (result.status !== 200) throw new Error(`Revisar tabla ${table}: HTTP ${result.status}, código ${result.body.code ?? 'desconocido'}`);
  }
  for (const table of ['invitations', 'guests', 'attendees', 'rsvps', 'access_log']) {
    const result = await read(`${table}?select=id&limit=0`, anon);
    if (result.body.code !== '42501') throw new Error(`Revisar permisos anónimos de ${table}: HTTP ${result.status}`);
  }
  const missingSlug = `readiness-${randomUUID()}`;
  const state = await read('rpc/enkarta_rsvp_state', service, { method: 'POST', body: JSON.stringify({ p_slug: missingSlug }) });
  if (state.body.message !== 'NOT_FOUND') throw new Error(`La lectura RSVP no responde como se esperaba: HTTP ${state.status}, código ${state.body.code ?? 'desconocido'}`);
  const denied = await read('rpc/enkarta_rsvp_state', anon, { method: 'POST', body: JSON.stringify({ p_slug: missingSlug }) });
  if (denied.body.code !== '42501') throw new Error('La lectura RSVP debe estar restringida al servidor.');
  console.log('OK: 6 funciones presentes, columnas de 006 disponibles y tablas personales restringidas.');
  console.log('OK: lectura RPC operativa desde servidor y denegada a anónimos. No se modificaron registros.');
}
main().catch(error => { console.error(error instanceof TypeError ? 'Fallo de conexión en la comprobación de solo lectura.' : error.message); process.exitCode = 1; });
