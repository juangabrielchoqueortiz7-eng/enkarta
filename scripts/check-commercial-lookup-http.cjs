// Production acceptance uses one isolated fictional lead and never follows external URLs.
// Run only after deployment. --resume-cleanup performs only the scoped database cleanup.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const { createClient } = require('@supabase/supabase-js');

const arg = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
assert.ok(process.argv.includes('--exercise') && process.argv.includes('--production'), 'Both explicit production exercise flags are required.');
const origin = 'https://enkarta.vercel.app';
const project = 'eodedockxqvynedwhpsp';
assert.equal(arg('--expect-project'), project);
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, project + '.supabase.co');
assert.notEqual(String(process.env.PAYMENT_PROVIDER || '').toLowerCase(), 'bcp', 'BCP must remain disabled.');
assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY, 'The local service credential is required.');
const output = arg('--report');
assert.ok(output, 'A new report path within tmp is required.');
const reportPath = path.resolve(output);
assert.ok(reportPath.startsWith(path.resolve('tmp') + path.sep) && reportPath.endsWith('.json'));
const resume = process.argv.includes('--resume-cleanup');
assert.ok(resume ? fs.existsSync(reportPath) : !fs.existsSync(reportPath), 'Use a new report or resume an existing cleanup.');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const id = crypto.randomUUID();
const tag = 'qa-commercial-lookup-' + crypto.randomUUID();
const fixtureHash = (fixtureId, fixtureTag) => crypto.createHash('sha256').update('enkarta-qa-commercial-lookup:v1:' + fixtureId + ':' + fixtureTag).digest('hex');
const oldDate = new Date(Date.now() - 730 * 86_400_000).toISOString();
const report = resume ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : {
  version: 1, origin, project, startedAt: new Date().toISOString(),
  fixture: { id, tag, sessionHash: fixtureHash(id, tag), reference: 'EK-' + crypto.randomBytes(4).toString('hex').toUpperCase(), createdAt: oldDate, updatedAt: oldDate },
  checks: [], cleanup: 'not-started', adminCleanup: 'not-created', fixtureInsertAttempted: false,
  bankCalls: 0, messagesSent: 0, usersCreated: 0,
};
assert.equal(report.version, 1); assert.equal(report.origin, origin); assert.equal(report.project, project);
assert.match(report.fixture?.id || '', /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
assert.match(report.fixture.tag, /^qa-commercial-lookup-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
assert.equal(report.fixture.sessionHash, fixtureHash(report.fixture.id, report.fixture.tag));
assert.match(report.fixture.reference, /^EK-[A-F0-9]{8}$/);
assert.ok(Array.isArray(report.checks) && report.checks.every(value => typeof value === 'string'));
const fixture = report.fixture;
const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
// Failure labels are fixed strings. Never persist response bodies, headers or credentials.
const expect = (condition, label) => { if (!condition) { const error = new Error(label); error.acceptanceLabel = label; throw error; } };
const safeFailure = error => error?.acceptanceLabel || 'Unexpected acceptance failure; private details omitted.';
const must = (result, label) => { expect(!result.error, label); return result.data; };
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (url, init = {}) => fetch(url, { ...init, signal: AbortSignal.timeout(25000) }) },
});
let adminCookie = '';
const request = (route, init = {}) => {
  const url = new URL(route, origin);
  expect(url.origin === origin, 'Acceptance requests must stay on the production origin.');
  return fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(25000) });
};
const lookup = (reference, cookie = adminCookie) => request('/api/admin/commercial/lookup?' + new URLSearchParams({ reference }), { headers: cookie ? { Cookie: cookie } : {} });
const privateStatus = (response, status, label) => {
  expect(response.status === status, label + ': unexpected HTTP status.');
  expect(response.headers.get('cache-control') === 'no-store', label + ': missing private cache policy.');
};
const scoped = query => query.eq('id', fixture.id).eq('session_hash', fixture.sessionHash).eq('placement', fixture.tag).eq('utm_campaign', fixture.tag);
async function readFixture() {
  return must(await scoped(db.from('commercial_leads').select('id,reference,status,design,revenue_bs,notes,created_at,updated_at')).maybeSingle(), 'Could not read the isolated fixture.');
}
async function fixtureHistory() {
  // This foreign key belongs to the already scoped fictional record; no other lead is read.
  return must(await db.from('commercial_lead_history').select('id').eq('lead_id', fixture.id), 'Could not verify the fictional lead history.');
}
const scopedEvents = query => query.eq('session_hash', fixture.sessionHash).eq('placement', fixture.tag).eq('utm_campaign', fixture.tag);
async function absentReference() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const reference = 'EK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    if (reference === fixture.reference) continue;
    // HEAD plus an exact count verifies absence without returning existing customer data.
    const result = await db.from('commercial_leads').select('id', { count: 'exact', head: true }).eq('reference', reference);
    must(result, 'Could not establish a safe absent reference.');
    if (result.count === 0) return reference;
  }
  expect(false, 'Could not establish a safe absent reference without collisions.');
}
const record = label => { report.checks.push(label); save(); };

async function run() {
  for (const cookie of ['', 'enkarta-admin=QA-INVALID-ADMIN', 'enkarta-host=QA-NOT-ADMIN', 'enkarta-review=QA-NOT-ADMIN', 'enkarta-door=QA-NOT-ADMIN']) {
    const response = await lookup(fixture.reference, cookie);
    privateStatus(response, 401, 'Non-admin lookup');
    const body = await response.json();
    expect(!Object.prototype.hasOwnProperty.call(body, 'lead'), 'An unauthorized lookup exposed a result.');
  }
  record('Anonymous, invalid admin and operational cookies cannot read commercial references');
  const dev = await request('/dev/services/commercial-lookup');
  expect(dev.status === 404, 'The development workbench must be unavailable in production.'); await dev.body?.cancel();
  record('Development-only commercial lookup workbench returns 404 in production');

  expect(Boolean(process.env.ADMIN_PASSWORD), 'The local admin credential is unavailable.');
  const login = await request('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) });
  // Capture the cookie before any assertion so finally can clear even an abnormal login reply.
  adminCookie = (login.headers.get('set-cookie') || '').match(/enkarta-admin=[^;]+/)?.[0] || '';
  if (adminCookie) { report.adminCleanup = 'temporary-session-held-in-memory'; save(); }
  expect(login.status === 200 && Boolean(adminCookie), 'Normal admin authentication failed.'); await login.body?.cancel();

  // Persist the full deletion scope before attempting INSERT, including ambiguous responses.
  report.fixtureInsertAttempted = true; save();
  must(await db.from('commercial_leads').insert({
    id: fixture.id, reference: fixture.reference, session_hash: fixture.sessionHash,
    status: 'whatsapp_open', package_key: 'premium', design: 'azure', event_category: 'Boda',
    placement: fixture.tag, utm_campaign: fixture.tag, notes: 'QA ficticio: búsqueda exacta sin pagos ni mensajes.',
    revenue_bs: null, created_at: fixture.createdAt, updated_at: fixture.updatedAt,
  }), 'Could not create the isolated fictional reference.');
  const before = await readFixture();
  expect(Boolean(before) && before.id === fixture.id && before.reference === fixture.reference, 'The isolated fixture was not found after insertion.');
  expect(Date.parse(before.created_at) < Date.now() - 180 * 86_400_000, 'The fixture must lie outside the dashboard reporting period.');
  expect((await fixtureHistory()).length === 0, 'The new fictional reference must have no history.');

  const expectedFields = ['id', 'reference', 'status', 'package_key', 'design', 'event_category', 'placement', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer_host', 'revenue_bs', 'notes', 'created_at', 'updated_at'].sort().join(',');
  for (const reference of [fixture.reference, '  ' + fixture.reference.toLowerCase() + '  ']) {
    const response = await lookup(reference); privateStatus(response, 200, 'Authenticated exact lookup');
    const body = await response.json();
    expect(body.lead?.id === fixture.id && body.lead.reference === fixture.reference, 'Exact lookup returned the wrong fictional reference.');
    expect(body.lead.design === 'Lunaria', 'A legacy design key must display its public design name.');
    expect(Object.keys(body.lead).sort().join(',') === expectedFields, 'Lookup returned fields outside its operational whitelist.');
    expect(!JSON.stringify(body).includes(fixture.sessionHash) && !JSON.stringify(body).includes(adminCookie.split('=')[1]), 'Lookup exposed a private session value.');
  }
  record('Exact and normalized lookup find the two-year-old fictional reference with public design and private field whitelist');

  const missing = await lookup(await absentReference()); privateStatus(missing, 200, 'Absent exact lookup');
  const missingBody = await missing.json();
  expect(Object.keys(missingBody).join(',') === 'lead' && missingBody.lead === null, 'An absent reference must return only lead:null.');
  record('A verified absent random reference returns an empty exact result without reading another customer');
  for (const query of ['', '?reference=EK-A1B2', '?reference=EK-A1B2C3D_', '?reference=' + encodeURIComponent(fixture.reference + '%'), '?' + new URLSearchParams([['reference', fixture.reference], ['reference', fixture.reference]])]) {
    const response = await request('/api/admin/commercial/lookup' + query, { headers: { Cookie: adminCookie } });
    privateStatus(response, 400, 'Invalid reference lookup');
    const body = await response.json(); expect(body.code === 'INVALID_REFERENCE' && !Object.prototype.hasOwnProperty.call(body, 'lead'), 'Invalid lookup must fail before returning a lead.');
  }
  record('Missing, partial, wildcard and duplicate references fail with private HTTP 400 responses');

  const after = await readFixture();
  expect(Boolean(after) && after.status === before.status && after.updated_at === before.updated_at && after.design === before.design && after.revenue_bs === null && after.notes === before.notes, 'Read-only lookup changed the isolated fictional lead.');
  expect((await fixtureHistory()).length === 0, 'Read-only lookup created commercial history.');
  const events = must(await scopedEvents(db.from('commercial_events').select('id')), 'Could not verify isolated commercial events.');
  expect(events.length === 0, 'Read-only lookup created commercial tracking events.');
  record('Lookup leaves status, timestamp, legacy design, revenue and notes unchanged and creates no history or tracking events');
}

async function cleanupFixture() {
  report.cleanup = 'in-progress'; save();
  // All lead reads and deletion use the complete saved scope. No campaign sweeps.
  const existing = await readFixture();
  if (existing) expect(existing.id === fixture.id && existing.reference === fixture.reference, 'Cleanup encountered an unexpected scoped record.');
  must(await scoped(db.from('commercial_leads').delete()), 'Could not delete the exact fictional reference.');
  expect((await readFixture()) === null, 'The exact fictional reference remains after cleanup.');
  expect((await fixtureHistory()).length === 0, 'Fictional history remains after the scoped lead cleanup.');
  // None should exist. If a regression created one, remove only each exact owned event.
  const events = must(await scopedEvents(db.from('commercial_events').select('id')), 'Could not inspect the isolated event cleanup scope.');
  for (const event of events) must(await scopedEvents(db.from('commercial_events').delete().eq('id', event.id)), 'Could not delete an exact fictional tracking event.');
  expect(must(await scopedEvents(db.from('commercial_events').select('id')), 'Could not verify fictional event cleanup.').length === 0, 'Fictional tracking events remain after cleanup.');
  report.cleanup = 'verified-no-fictional-lead-history-or-events-remain'; save();
}

save();
(resume ? Promise.resolve() : run()).catch(error => {
  report.failure = safeFailure(error); save(); process.exitCode = 1;
}).finally(async () => {
  try { await cleanupFixture(); }
  catch (error) { report.cleanup = 'failed'; report.cleanupFailure = safeFailure(error); save(); process.exitCode = 1; }
  try {
    if (adminCookie) {
      const logout = await request('/api/admin/auth', { method: 'DELETE', headers: { Cookie: adminCookie } });
      expect(logout.status === 200, 'Temporary admin session logout failed.'); await logout.body?.cancel();
      report.adminCleanup = 'temporary-client-session-cleared';
    } else if (resume && report.adminCleanup === 'temporary-session-held-in-memory') {
      report.adminCleanup = 'interrupted-process-cookie-not-retained; no-session-loaded-by-cleanup';
    }
  } catch (error) { report.adminCleanup = 'logout-failed; cookie-cleared-from-process'; report.logoutFailure = safeFailure(error); process.exitCode = 1; }
  finally { adminCookie = ''; }
  report.completedAt = new Date().toISOString(); save();
  console.log(JSON.stringify({ passed: report.checks.length, cleanup: report.cleanup, adminCleanup: report.adminCleanup, bankCalls: 0, messagesSent: 0, usersCreated: 0, ...(report.failure ? { failure: report.failure } : {}) }));
});
