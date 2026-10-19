// Read-only production acceptance. Credentials remain in memory; no bank calls.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const arg = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
assert.ok(process.argv.includes('--production'));
assert.equal(arg('--expect-project'), 'eodedockxqvynedwhpsp');
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0], 'eodedockxqvynedwhpsp');
const reportPath = path.resolve(arg('--report') || '');
assert.ok(reportPath.startsWith(path.resolve('tmp') + path.sep) && reportPath.endsWith('.json'));
assert.ok(!fs.existsSync(reportPath), 'Use a new report path.');
const origin = 'https://enkarta.vercel.app';
const report = { origin, checks: [], cleanup: 'pending', recordsCreated: 0, messagesSent: 0, bankCalls: 0 };
let adminCookie = '';
const request = (route, init = {}) => fetch(origin + route, { ...init, redirect: 'manual', signal: AbortSignal.timeout(20000) });
async function run() {
  for (const cookie of ['', 'enkarta-host=QA-NOT-ADMIN', 'enkarta-door=QA-NOT-ADMIN', 'enkarta-review=QA-NOT-ADMIN']) {
    const response = await request('/api/admin/sales-config', { headers: cookie ? { Cookie: cookie } : {} });
    assert.equal(response.status, 401); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).draftScope, undefined);
  }
  report.checks.push('Anonymous and operational cookies cannot read sales configuration or draft binding');
  const dev = await request('/dev/services/sales-quote');
  assert.equal(dev.status, 404); await dev.body?.cancel();
  report.checks.push('Development-only quote workbench is unavailable in production');
  if (process.argv.includes('--read-admin-config')) {
    assert.ok(process.env.ADMIN_PASSWORD, 'Admin credential is unavailable in the local environment.');
    const login = await request('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) });
    assert.equal(login.status, 200, 'Normal admin authentication failed.');
    adminCookie = (login.headers.get('set-cookie') || '').match(/enkarta-admin=[^;]+/)?.[0] || '';
    assert.ok(adminCookie, 'Admin login did not issue its session cookie.'); await login.body?.cancel();
    const read = async () => {
      const response = await request('/api/admin/sales-config', { headers: { Cookie: adminCookie } });
      assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
      const value = await response.json();
      assert.equal(typeof value.paymentInstructions, 'string'); assert.ok(value.paymentInstructions.length <= 900);
      assert.equal(typeof value.salesHours, 'string'); assert.ok(value.salesHours.length <= 120);
      assert.equal(value.paymentConfigured, Boolean(value.paymentInstructions)); assert.match(value.draftScope, /^[a-f0-9]{64}$/);
      assert.ok(!JSON.stringify(value).includes(adminCookie.split('=')[1]));
      return value.draftScope;
    };
    assert.equal(await read(), await read());
    report.checks.push('Authenticated configuration is bounded, private and bound consistently to its admin session');
  }
}
run().catch(error => { report.failure = error.message; process.exitCode = 1; }).finally(async () => {
  try {
    if (adminCookie) {
      const logout = await request('/api/admin/auth', { method: 'DELETE', headers: { Cookie: adminCookie } });
      assert.equal(logout.status, 200); await logout.body?.cancel(); adminCookie = '';
    }
    report.cleanup = 'verified-no-records-created; temporary-client-session-cleared';
  } catch { report.cleanup = 'logout-failed; no-database-records-created'; process.exitCode = 1; }
  report.completedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.checks.length, cleanup: report.cleanup, recordsCreated: 0, messagesSent: 0, bankCalls: 0, ...(report.failure ? { failure: report.failure } : {}) }));
});
