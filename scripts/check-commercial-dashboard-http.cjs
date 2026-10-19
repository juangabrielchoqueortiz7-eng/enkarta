// Explicit production acceptance, only after SQL 020 and deployment.
// Exactly 27 fictional contacts/events at the reporting cutoff isolate both pages
// from customers. No bank, WhatsApp, account creation or external navigation.
// --resume-cleanup skips acceptance and removes only the durable fixture scope.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const { createClient } = require('@supabase/supabase-js');

const arg = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
assert.ok(process.argv.includes('--exercise') && process.argv.includes('--production'), 'Both explicit production exercise flags are required.');
const origin = 'https://enkarta.vercel.app', project = 'eodedockxqvynedwhpsp';
assert.equal(arg('--expect-project'), project);
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin, 'https://' + project + '.supabase.co');
assert.notEqual(String(process.env.PAYMENT_PROVIDER || '').toLowerCase(), 'bcp', 'BCP must remain disabled.');
assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY, 'The local service credential is required.');
const output = arg('--report');
assert.ok(output, 'A new report path within tmp is required.');
const reportPath = path.resolve(output);
assert.ok(reportPath.startsWith(path.resolve('tmp') + path.sep) && reportPath.endsWith('.json'), 'The report must stay within tmp.');
const resume = process.argv.includes('--resume-cleanup');
assert.ok(resume ? fs.existsSync(reportPath) : !fs.existsSync(reportPath), 'Use a new report or resume an existing cleanup.');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const hash = (id, tag) => crypto.createHash('sha256').update('enkarta-qa-commercial-dashboard:v1:' + id + ':' + tag).digest('hex');
const asOf = new Date().toISOString();
const tag = 'qa-commercial-dashboard-' + crypto.randomUUID();
const report = resume ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : {
  version: 1, origin, project, startedAt: asOf,
  fixture: { tag, asOf, createdAt: new Date(Date.parse(asOf) - 180 * 86_400_000).toISOString(), requestId: crypto.randomUUID(),
    rows: Array.from({ length: 27 }, () => {
      const id = crypto.randomUUID();
      return { id, eventId: crypto.randomUUID(), sessionHash: hash(id, tag), reference: 'EK-' + crypto.randomBytes(4).toString('hex').toUpperCase() };
    }) },
  checks: [], cleanup: 'not-started', adminCleanup: 'not-created', leadInsertAttempted: false, eventInsertAttempted: false,
  bankCalls: 0, messagesSent: 0, usersCreated: 0,
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
assert.equal(report.version, 1); assert.equal(report.origin, origin); assert.equal(report.project, project);
assert.match(report.fixture?.tag || '', /^qa-commercial-dashboard-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
assert.match(report.fixture.requestId || '', uuid);
assert.ok(typeof report.fixture.asOf === 'string' && Number.isFinite(Date.parse(report.fixture.asOf)));
assert.equal(report.fixture.createdAt, new Date(Date.parse(report.fixture.asOf) - 180 * 86_400_000).toISOString());
assert.ok(Array.isArray(report.fixture.rows) && report.fixture.rows.length === 27);
for (const row of report.fixture.rows) {
  assert.match(row.id || '', uuid); assert.match(row.eventId || '', uuid); assert.match(row.reference || '', /^EK-[A-F0-9]{8}$/);
  assert.equal(row.sessionHash, hash(row.id, report.fixture.tag));
}
for (const field of ['id', 'eventId', 'sessionHash', 'reference']) assert.equal(new Set(report.fixture.rows.map(row => row[field])).size, 27);
assert.equal(new Set(report.fixture.rows.flatMap(row => [row.id, row.eventId])).size, 54);
assert.ok(Array.isArray(report.checks) && report.checks.every(value => typeof value === 'string'));
const fixture = report.fixture;
const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
// Only fixed labels leave the process: no response bodies, SQL errors or credentials.
const expect = (condition, label) => { if (!condition) { const error = new Error(label); error.acceptanceLabel = label; throw error; } };
const safeFailure = error => error?.acceptanceLabel || 'Unexpected acceptance failure; private details omitted.';
const must = (result, label) => { expect(!result.error, label); return result.data; };
const record = label => { report.checks.push(label); save(); };
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
const encodeCursor = (status, createdAt, id) => Buffer.from(JSON.stringify({ v: 1, asOf: fixture.asOf, createdAt, id, status }), 'utf8').toString('base64url');
const firstCursor = status => encodeCursor(status, fixture.createdAt, 'ffffffff-ffff-ffff-ffff-ffffffffffff');
const emptyCursor = status => encodeCursor(status, fixture.createdAt, '00000000-0000-4000-8000-000000000000');
const dashboard = (status, cursor, cookie = adminCookie) => request('/api/admin/commercial?' + new URLSearchParams({ status, cursor }), { headers: cookie ? { Cookie: cookie } : {} });
const privateStatus = (response, status, label) => {
  expect(response.status === status, label + ': unexpected HTTP status.');
  expect(response.headers.get('cache-control') === 'no-store', label + ': missing private cache policy.');
};
const summaryFields = ['visits', 'landingViews', 'designViews', 'processViews', 'whatsappOpens', 'contacts', 'reserved', 'sales', 'revenue', 'intentRate', 'conversationRate', 'closeRate'];
const statuses = ['whatsapp_open', 'contacted', 'reserved', 'won', 'lost'];
const leadFields = ['id', 'reference', 'status', 'package_key', 'design', 'event_category', 'placement', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer_host', 'revenue_bs', 'notes', 'created_at', 'updated_at', 'revision'].sort().join(',');
function checkDashboard(body) {
  expect(body?.periodDays === 180 && Date.parse(body.asOf) === Date.parse(fixture.asOf), 'The reporting period or fixed cutoff changed.');
  expect(typeof body.syncedAt === 'string' && Number.isFinite(Date.parse(body.syncedAt)), 'The dashboard did not return its synchronization time.');
  expect(body.summary && Object.keys(body.summary).sort().join(',') === [...summaryFields].sort().join(','), 'The complete summary has an unexpected contract.');
  for (const field of summaryFields) expect(typeof body.summary[field] === 'number' && Number.isFinite(body.summary[field]) && body.summary[field] >= 0, 'A summary metric is invalid.');
  expect(Array.isArray(body.statuses) && body.statuses.length === statuses.length && new Set(body.statuses.map(item => item.status)).size === statuses.length, 'The status counts are incomplete.');
  for (const status of statuses) expect(body.statuses.some(item => item.status === status && Number.isSafeInteger(item.value) && item.value >= 0), 'A status count is invalid.');
  expect(Array.isArray(body.leads) && body.leads.length <= 25, 'A dashboard page exceeds the fixed page size.');
  expect(body.pagination?.size === 25 && Number.isSafeInteger(body.pagination.total) && body.pagination.total >= 0 && typeof body.pagination.hasMore === 'boolean', 'The pagination totals are incomplete.');
  expect(body.pagination.hasMore ? typeof body.pagination.nextCursor === 'string' && body.pagination.nextCursor.length > 0 : body.pagination.nextCursor === null, 'The next-page cursor is inconsistent.');
  for (const field of ['sources', 'campaigns', 'packages', 'events', 'designs']) expect(Array.isArray(body[field]) && body[field].length <= 8, 'A full-period breakdown is invalid.');
}
async function readDashboard(status, cursor, label) {
  const response = await dashboard(status, cursor); privateStatus(response, 200, label);
  const body = await response.json(); checkDashboard(body); return body;
}
function numericSnapshot(body) {
  return { summary: { ...body.summary }, statuses: Object.fromEntries(body.statuses.map(row => [row.status, row.value])), total: body.pagination.total };
}
function checkEmpty(body) { expect(body.leads.length === 0 && !body.pagination.hasMore && body.pagination.nextCursor === null, 'The metrics-only boundary cursor unexpectedly selected contacts.'); }
function sameSummary(first, second) {
  expect(summaryFields.every(field => first.summary[field] === second.summary[field]), 'Changing page or status changed full-period metrics.');
  expect(statuses.every(status => first.statuses[status] === second.statuses[status]), 'Changing page or status changed full-period status counts.');
}
function ownedLead(lead) {
  const row = fixture.rows.find(item => item.id === lead?.id);
  expect(Boolean(row) && lead.reference === row.reference && lead.placement === fixture.tag && lead.utm_campaign === fixture.tag, 'A page escaped the isolated fictional scope.');
  expect(lead.status === 'lost' && lead.revenue_bs === null && lead.design === 'Lunaria', 'A fictional reply invented sales, revenue or changed its original design.');
  expect(Object.keys(lead).sort().join(',') === leadFields, 'A contact reply exceeded the operational field whitelist.');
  expect(!JSON.stringify(lead).includes(row.sessionHash), 'A contact reply exposed its private session hash.');
}
const scopedLeads = (query, rows) => query.in('id', rows.map(row => row.id)).in('session_hash', rows.map(row => row.sessionHash)).eq('placement', fixture.tag).eq('utm_campaign', fixture.tag);
const scopedEvents = (query, rows) => query.in('id', rows.map(row => row.eventId)).in('session_hash', rows.map(row => row.sessionHash)).eq('placement', fixture.tag).eq('utm_campaign', fixture.tag);
async function ownCount(table, column, ids, label) {
  const result = await db.from(table).select(column, { count: 'exact', head: true }).in(column, ids);
  must(result, label); expect(Number.isSafeInteger(result.count) && result.count >= 0, label); return result.count;
}
async function run() {
  for (const cookie of ['', 'enkarta-admin=QA-INVALID-ADMIN', 'enkarta-host=QA-NOT-ADMIN', 'enkarta-review=QA-NOT-ADMIN', 'enkarta-door=QA-NOT-ADMIN']) {
    const response = await dashboard('lost', emptyCursor('lost'), cookie); privateStatus(response, 401, 'Non-admin dashboard');
    const body = await response.json(); expect(!Object.prototype.hasOwnProperty.call(body, 'leads') && !Object.prototype.hasOwnProperty.call(body, 'summary'), 'An unauthorized request exposed contacts or metrics.');
  }
  record('Anonymous, invalid admin and operational cookie slots cannot read commercial pages or metrics');
  const dev = await request('/dev/services/commercial-dashboard');
  expect(dev.status === 404, 'The commercial dashboard workbench must be unavailable in production.'); await dev.body?.cancel();
  record('Development-only commercial dashboard workbench returns 404 in production');

  expect(Boolean(process.env.ADMIN_PASSWORD), 'The local admin credential is unavailable.');
  const login = await request('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) });
  adminCookie = (login.headers.get('set-cookie') || '').match(/enkarta-admin=[^;]+/)?.[0] || '';
  if (adminCookie) { report.adminCleanup = 'temporary-session-held-in-memory'; save(); }
  expect(login.status === 200 && Boolean(adminCookie), 'Normal admin authentication failed.'); await login.body?.cancel();
  for (const query of ['?status=unknown', '?status=lost&cursor=not-a-cursor', '?status=all&cursor=' + encodeURIComponent(firstCursor('lost')), '?status=lost&status=lost']) {
    const response = await request('/api/admin/commercial' + query, { headers: { Cookie: adminCookie } }); privateStatus(response, 400, 'Invalid pagination');
    const body = await response.json(); expect(!Object.prototype.hasOwnProperty.call(body, 'leads') && !Object.prototype.hasOwnProperty.call(body, 'summary'), 'Invalid pagination exposed contacts or metrics.');
  }
  record('Unknown statuses, malformed cursors, mismatched filters and duplicate parameters fail privately before reading contacts');

  // No real contact may share this millisecond boundary; after this check all
  // qualifying rows at the cutoff are the 27 identities already saved above.
  const collision = await db.from('commercial_leads').select('id', { count: 'exact', head: true }).eq('created_at', fixture.createdAt);
  must(collision, 'Could not establish the isolated reporting cutoff.');
  expect(collision.count === 0, 'The selected cutoff is already occupied; acceptance aborted without altering customers.');
  const baselineLost = await readDashboard('lost', emptyCursor('lost'), 'Baseline filtered metrics'); checkEmpty(baselineLost);
  const baselineAll = await readDashboard('all', emptyCursor('all'), 'Baseline complete metrics'); checkEmpty(baselineAll);
  const beforeLost = numericSnapshot(baselineLost), beforeAll = numericSnapshot(baselineAll);
  sameSummary(beforeLost, beforeAll);
  record('Migration 020 returns complete private metrics with an empty boundary page before fixture insertion');

  report.leadInsertAttempted = true; save();
  must(await db.from('commercial_leads').insert(fixture.rows.map(row => ({
    id: row.id, reference: row.reference, session_hash: row.sessionHash, status: 'lost', package_key: 'premium',
    design: 'azure', event_category: 'Boda', placement: fixture.tag, utm_campaign: fixture.tag, revenue_bs: null,
    notes: 'QA ficticio: paginación y métricas sin pagos ni mensajes.', revision: 0, created_at: fixture.createdAt, updated_at: fixture.createdAt,
  }))), 'Could not create the isolated fictional commercial contacts.');
  report.eventInsertAttempted = true; save();
  must(await db.from('commercial_events').insert(fixture.rows.map(row => ({
    id: row.eventId, session_hash: row.sessionHash, event_type: 'landing_view', package_key: 'premium', design: 'azure',
    event_category: 'Boda', placement: fixture.tag, utm_campaign: fixture.tag, occurred_at: fixture.createdAt,
  }))), 'Could not create the isolated fictional landing views.');
  const afterLost = await readDashboard('lost', emptyCursor('lost'), 'Complete filtered metrics'); checkEmpty(afterLost);
  const afterAll = await readDashboard('all', emptyCursor('all'), 'Complete unfiltered metrics'); checkEmpty(afterAll);
  const after = numericSnapshot(afterLost), afterGlobal = numericSnapshot(afterAll);
  sameSummary(after, afterGlobal);
  for (const field of ['visits', 'landingViews', 'whatsappOpens', 'contacts']) expect(after.summary[field] - beforeLost.summary[field] === 27, 'A full-period metric did not include all 27 fictional contacts or visits.');
  for (const field of ['designViews', 'processViews', 'reserved', 'sales', 'revenue']) expect(after.summary[field] === beforeLost.summary[field], 'Acceptance invented traffic, reservations, sales or revenue.');
  for (const status of statuses) expect(after.statuses[status] - beforeLost.statuses[status] === (status === 'lost' ? 27 : 0), 'Full-period status counts do not match the isolated fixture delta.');
  expect(after.total - beforeLost.total === 27 && afterGlobal.total - beforeAll.total === 27, 'Filtered or complete totals were capped or omitted fictional contacts.');
  expect(after.summary.intentRate === (after.summary.visits ? Math.round(after.summary.whatsappOpens / after.summary.visits * 100) : 0)
    && after.summary.conversationRate === (after.summary.whatsappOpens ? Math.round(after.summary.contacts / after.summary.whatsappOpens * 100) : 0)
    && after.summary.closeRate === (after.summary.contacts ? Math.round(after.summary.sales / after.summary.contacts * 100) : 0), 'The full-period conversion rates are inconsistent with their denominators.');
  record('All 27 isolated boundary contacts and visits contribute to complete totals and rates; no reservation, sale or revenue is fabricated');

  const expectedIds = fixture.rows.map(row => row.id).sort().reverse();
  const page1 = await readDashboard('lost', firstCursor('lost'), 'First fictional page');
  page1.leads.forEach(ownedLead);
  expect(page1.leads.length === 25 && page1.leads.map(row => row.id).join(',') === expectedIds.slice(0, 25).join(',') && page1.pagination.hasMore, 'The first fictional page is not the deterministic 25-row UUID tie order.');
  sameSummary(after, numericSnapshot(page1)); expect(page1.pagination.total === after.total, 'The first page changed its complete filtered total.');
  const page2 = await readDashboard('lost', page1.pagination.nextCursor, 'Second fictional page');
  page2.leads.forEach(ownedLead);
  expect(page2.leads.length === 2 && page2.leads.map(row => row.id).join(',') === expectedIds.slice(25).join(',') && !page2.pagination.hasMore && page2.pagination.nextCursor === null, 'The final fictional page does not contain exactly the two remaining contacts.');
  sameSummary(after, numericSnapshot(page2));
  expect(new Set([...page1.leads, ...page2.leads].map(row => row.id)).size === 27 && page2.pagination.total === after.total, 'Pagination duplicated a contact or changed its complete total.');
  record('Two isolated HTTP pages return exactly 25 plus 2 contacts without duplicate IDs, missing rows or private field leakage');

  const target = fixture.rows.find(row => row.id === expectedIds[26]);
  const update = await request('/api/admin/commercial', { method: 'PATCH', headers: { Cookie: adminCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({
    id: target.id, requestId: fixture.requestId, expectedRevision: 0, status: 'lost', revenueBs: null, notes: 'QA ficticio: editar notas no debe cambiar la página de alta.',
  }) });
  privateStatus(update, 200, 'Fictional note update'); const updated = await update.json(); ownedLead(updated.lead);
  expect(updated.outcome === 'saved' && updated.requestId === fixture.requestId && updated.lead.id === target.id && updated.lead.revision === 1, 'The isolated note update did not confirm exactly one revision.');
  expect(await ownCount('commercial_lead_history', 'lead_id', fixture.rows.map(row => row.id), 'Could not count fictional history.') === 1
    && await ownCount('commercial_lead_update_requests', 'lead_id', fixture.rows.map(row => row.id), 'Could not count fictional request receipts.') === 1, 'The single fictional update did not create exactly one history entry and receipt.');
  const stable = await readDashboard('lost', firstCursor('lost'), 'Stable first page after note update'); stable.leads.forEach(ownedLead);
  expect(stable.leads.map(row => row.id).join(',') === expectedIds.slice(0, 25).join(','), 'Editing notes reordered the creation-based first page.');
  sameSummary(after, numericSnapshot(stable));
  record('Editing a fictional contact on the second page records one revision and leaves creation-based first-page order and complete metrics unchanged');
}

async function cleanupFixture() {
  report.cleanup = 'in-progress'; save();
  // Bounded ownership queries and HEAD exact counts are independent of both
  // PostgREST row caps and the new SQL 020 function; cleanup works before rollout.
  for (let start = 0; start < fixture.rows.length; start += 100) {
    const rows = fixture.rows.slice(start, start + 100), ids = rows.map(row => row.id);
    const leads = must(await scopedLeads(db.from('commercial_leads').select('id,reference,session_hash'), rows).limit(rows.length + 1), 'Could not inspect the exact fictional contact cleanup scope.');
    expect(leads.length <= rows.length && leads.every(lead => rows.some(row => row.id === lead.id && row.reference === lead.reference && row.sessionHash === lead.session_hash)), 'Cleanup encountered a contact outside the durable ownership map.');
    must(await scopedLeads(db.from('commercial_leads').delete(), rows), 'Could not delete the exact fictional contacts.');
    const remainingLeads = await scopedLeads(db.from('commercial_leads').select('id', { count: 'exact', head: true }), rows);
    must(remainingLeads, 'Could not verify the exact fictional contact cleanup.'); expect(remainingLeads.count === 0, 'Fictional contacts remain after cleanup.');
    expect(await ownCount('commercial_lead_history', 'lead_id', ids, 'Could not verify fictional history cleanup.') === 0
      && await ownCount('commercial_lead_update_requests', 'lead_id', ids, 'Could not verify fictional receipt cleanup.') === 0, 'Fictional history or request receipts remain after cleanup.');
    const events = must(await scopedEvents(db.from('commercial_events').select('id,session_hash'), rows).limit(rows.length + 1), 'Could not inspect the exact fictional event cleanup scope.');
    expect(events.length <= rows.length && events.every(event => rows.some(row => row.eventId === event.id && row.sessionHash === event.session_hash)), 'Cleanup encountered an event outside the durable ownership map.');
    must(await scopedEvents(db.from('commercial_events').delete(), rows), 'Could not delete the exact fictional landing views.');
    const remainingEvents = await scopedEvents(db.from('commercial_events').select('id', { count: 'exact', head: true }), rows);
    must(remainingEvents, 'Could not verify the exact fictional event cleanup.'); expect(remainingEvents.count === 0, 'Fictional landing views remain after cleanup.');
  }
  report.cleanup = 'verified-no-fictional-contacts-history-receipts-or-events-remain'; save();
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
