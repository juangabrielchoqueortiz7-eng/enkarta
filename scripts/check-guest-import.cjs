// Schema/permission probes only: no guest records, fixtures or financial calls.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const { createClient } = require('@supabase/supabase-js');
const argument = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
assert.equal(argument('--expect-project'), host.split('.')[0], 'Indica la referencia exacta con --expect-project');
const client = key => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, init = {}) => fetch(url, { ...init, signal: AbortSignal.timeout(20000) }) } });
const db = client(process.env.SUPABASE_SERVICE_ROLE_KEY);
const report = { checkedAt: new Date().toISOString(), databaseHost: host, readOnly: true, code: 'SCHEMA_CHECK_UNAVAILABLE', checks: {} };
(async () => {
  const table = await db.from('guest_import_requests').select('invitation_id,request_id,payload_hash,guest_ids,created_at').limit(0);
  if (table.error) {
    report.code = ['PGRST205','42P01','42703'].includes(table.error.code) ? 'MIGRATION_017_REQUIRED' : 'SCHEMA_CHECK_UNAVAILABLE';
    process.exitCode = report.code === 'MIGRATION_017_REQUIRED' ? 2 : 1; return;
  }
  report.checks.tableAvailable = true;
  // NULLs must be rejected before any ledger write. This also checks the RPC's signature.
  const args = { p_invitation_id: null, p_request_id: null, p_guests: [], p_table_assignment: false };
  const rpc = await db.rpc('enkarta_import_guests', args);
  report.checks.rpcAvailable = rpc.error?.message === 'INVALID_INPUT';
  const anon = client(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [read, execute] = await Promise.all([
    anon.from('guest_import_requests').select('request_id').limit(0), anon.rpc('enkarta_import_guests', args),
  ]);
  report.checks.anonymousReadDenied = ['42501','PGRST205'].includes(read.error?.code);
  report.checks.anonymousExecuteDenied = ['42501','PGRST202'].includes(execute.error?.code);
  report.code = Object.values(report.checks).every(Boolean) ? 'GUEST_IMPORT_READY' : 'SCHEMA_CHECK_UNAVAILABLE';
  if (report.code !== 'GUEST_IMPORT_READY') process.exitCode = 1;
})().catch(() => { process.exitCode = 1; }).finally(() => {
  console.log(report.code + ': no se leyeron invitados ni se crearon registros.');
  const output = argument('--report'); if (output) { fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); }
});
