// Read-only deployment check. Does not create invitations, RSVP or access records.
const { loadEnvConfig } = require('@next/env');
const { randomUUID } = require('node:crypto');
loadEnvConfig(process.cwd());
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const functions = ['enkarta_assert_event_open', 'enkarta_rsvp_state', 'enkarta_confirm_guest', 'enkarta_submit_open_rsvp', 'enkarta_checkin_group', 'enkarta_checkin'];
const phase = process.argv.includes('--phase7') ? 7 : process.argv.includes('--phase6') ? 6 : process.argv.includes('--phase5') ? 5 : process.argv.includes('--phase4') ? 4 : process.argv.includes('--phase3') ? 3 : process.argv.includes('--phase2') ? 2 : 1;
if (phase >= 3) functions.push('enkarta_host_snapshot');
if (phase >= 4) functions.push('enkarta_package_days', 'enkarta_change_validity');
if (phase >= 5) functions.push('enkarta_record_delivery');
if (phase >= 7) functions.push('enkarta_submit_save_date');
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
  if (phase >= 2) {
    const columns = 'review_email,review_password_hash' + (phase >= 3 ? ',door_email,door_password_hash' : '');
    const result = await read(`invitations?select=${columns}&limit=0`, service);
    if (result.status !== 200) throw new Error(`Faltan columnas de accesos de fase ${phase}. No se consultaron valores.`);
  }
  if (phase >= 3) {
    const args = { method: 'POST', body: JSON.stringify({p_invitation_id:randomUUID()}) };
    const snapshot = await read('rpc/enkarta_host_snapshot', service, args);
    if (snapshot.status !== 200 || snapshot.body.guests?.length !== 0) throw new Error('La lectura del panel no responde correctamente.');
    const denied = await read('rpc/enkarta_host_snapshot', anon, args);
    if (denied.body.code !== '42501') throw new Error('La lectura del panel debe ser privada.');
  }
  if (phase >= 4) {
    for (const [table, columns] of Object.entries({invitations:'validity_mode,validity_extra_days,validity_revision,expires_at',invitation_validity_events:'id,action,before_revision,after_revision'})) {
      const result = await read(`${table}?select=${columns}&limit=0`, service);
      if (result.status !== 200) throw new Error(`Falta activar 009: ${table}. No se consultaron valores.`);
    }
    const deniedHistory = await read('invitation_validity_events?select=id&limit=0', anon);
    if (deniedHistory.body.code !== '42501') throw new Error('El historial de vigencia debe ser privado.');
    // Pure calculation only: never invoke the mutation RPC with production credentials.
    for (const [name, days] of Object.entries({plus:30,premium:60,exclusive:90})) {
      const result = await read('rpc/enkarta_package_days', service, {method:'POST',body:JSON.stringify({p_config:{package:name,serviceContract:{version:2}}})});
      if (result.status !== 200 || result.body !== days) throw new Error('El cálculo SQL no coincide con el catálogo.');
    }
  }
  if (phase >= 5) {
    const result = await read('guests?select=delivery_status,whatsapp_opened_at,manually_marked_at,last_reminder_at,reminder_count,last_delivery_request,last_delivery_expected_revision&limit=0', service);
    if (result.status !== 200) throw new Error('Falta activar 010. No se consultaron invitados.');
  }
  if (phase >= 7) {
    const result = await read('save_date_responses?select=id,invitation_id,response_key_hash,interest,guests,revision,last_request_id&limit=0', service);
    if (result.status !== 200) throw new Error('Falta activar 011. No se consultaron respuestas.');
    const deniedResponses = await read('save_date_responses?select=id&limit=0', anon);
    if (deniedResponses.body.code !== '42501') throw new Error('Las preconfirmaciones deben ser privadas.');
  }
  const missingSlug = `readiness-${randomUUID()}`;
  const state = await read('rpc/enkarta_rsvp_state', service, { method: 'POST', body: JSON.stringify({ p_slug: missingSlug }) });
  if (state.body.message !== 'NOT_FOUND') throw new Error(`La lectura RSVP no responde como se esperaba: HTTP ${state.status}, código ${state.body.code ?? 'desconocido'}`);
  const denied = await read('rpc/enkarta_rsvp_state', anon, { method: 'POST', body: JSON.stringify({ p_slug: missingSlug }) });
  if (denied.body.code !== '42501') throw new Error('La lectura RSVP debe estar restringida al servidor.');
  console.log(`OK: ${functions.length} funciones presentes, columnas de fase ${phase} disponibles y tablas personales restringidas.`);
  console.log('OK: lectura RPC operativa desde servidor y denegada a anónimos. No se modificaron registros.');
}
main().catch(error => { console.error(error instanceof TypeError ? 'Fallo de conexión en la comprobación de solo lectura.' : error.message); process.exitCode = 1; });
