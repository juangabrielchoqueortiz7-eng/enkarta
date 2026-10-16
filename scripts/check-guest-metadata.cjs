// Read-only schema preflight. Never prints credentials or reads guest records.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const { createClient } = require('@supabase/supabase-js');
const argument = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
assert.equal(argument('--expect-project'), host.split('.')[0], 'Indica la referencia exacta con --expect-project');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const report = { checkedAt: new Date().toISOString(), databaseHost: host, readOnly: true, columnAvailable: false };
(async () => {
  const result = await db.from('guests').select('guest_metadata,response_revision').limit(0).abortSignal(AbortSignal.timeout(20000));
  report.columnAvailable = !result.error;
  if (result.error) {
    report.code = ['42703','PGRST204'].includes(result.error.code) ? 'MIGRATION_016_REQUIRED' : 'SCHEMA_CHECK_UNAVAILABLE';
    console.log(report.code); process.exitCode = report.code === 'MIGRATION_016_REQUIRED' ? 2 : 1;
  } else { report.code = 'GUEST_METADATA_COLUMN_AVAILABLE'; console.log(report.code + ': no se leyeron registros de invitados. Falta el ejercicio de revisiones por HTTP.'); }
})().catch(() => { report.code = 'SCHEMA_CHECK_UNAVAILABLE'; console.error(report.code); process.exitCode = 1; }).finally(() => {
  const output = argument('--report'); if (output) { fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); }
});
