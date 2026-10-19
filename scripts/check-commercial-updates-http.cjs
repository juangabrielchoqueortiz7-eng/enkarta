// Explicit production acceptance, only after SQL 019 and deployment.
// One fictional lead; no bank, WhatsApp or account creation. Never follow external URLs.
// --resume-cleanup skips every acceptance mutation and removes only the saved fixture.
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

const fixtureHash = (id, tag) => crypto.createHash('sha256').update('enkarta-qa-commercial-update:v1:' + id + ':' + tag).digest('hex');
const id = crypto.randomUUID(), tag = 'qa-commercial-update-' + crypto.randomUUID();
const report = resume ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : {
  version: 1, origin, project, startedAt: new Date().toISOString(),
  fixture: { id, tag, sessionHash: fixtureHash(id, tag), reference: 'EK-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    firstRequestId: crypto.randomUUID(), secondRequestId: crypto.randomUUID(), recoveryRequestId: crypto.randomUUID() },
  checks: [], cleanup: 'not-started', adminCleanup: 'not-created', fixtureInsertAttempted: false,
  bankCalls: 0, messagesSent: 0, usersCreated: 0,
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
assert.equal(report.version, 1); assert.equal(report.origin, origin); assert.equal(report.project, project);
assert.match(report.fixture?.id || '', uuid);
assert.match(report.fixture.tag, /^qa-commercial-update-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
assert.equal(report.fixture.sessionHash, fixtureHash(report.fixture.id, report.fixture.tag));
assert.match(report.fixture.reference, /^EK-[A-F0-9]{8}$/);
for (const field of ['firstRequestId', 'secondRequestId', 'recoveryRequestId']) assert.match(report.fixture[field] || '', uuid);
assert.equal(new Set([report.fixture.firstRequestId, report.fixture.secondRequestId, report.fixture.recoveryRequestId]).size, 3);
assert.ok(Array.isArray(report.checks) && report.checks.every(value => typeof value === 'string'));
const fixture = report.fixture;
const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
// Only fixed labels leave the process: never persist HTTP replies, SQL errors or credentials.
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
const patch = (command, cookie = adminCookie) => request('/api/admin/commercial', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(command),
});
const lookup = () => request('/api/admin/commercial/lookup?' + new URLSearchParams({ reference: fixture.reference }), { headers: { Cookie: adminCookie } });
const privateStatus = (response, status, label) => {
  expect(response.status === status, label + ': unexpected HTTP status.');
  expect(response.headers.get('cache-control') === 'no-store', label + ': missing private cache policy.');
};
const scoped = query => query.eq('id', fixture.id).eq('session_hash', fixture.sessionHash).eq('placement', fixture.tag).eq('utm_campaign', fixture.tag);
const scopedEvents = query => query.eq('session_hash', fixture.sessionHash).eq('placement', fixture.tag).eq('utm_campaign', fixture.tag);
const readFixture = () => scoped(db.from('commercial_leads').select('id,reference,status,design,revenue_bs,notes,revision,created_at,updated_at')).maybeSingle().then(result => must(result, 'Could not read the isolated fixture.'));
const readHistory = () => db.from('commercial_lead_history').select('id,from_status,to_status,revenue_bs,note').eq('lead_id', fixture.id).then(result => must(result, 'Could not inspect the fictional commercial history.'));
const readReceipts = () => db.from('commercial_lead_update_requests').select('request_id').eq('lead_id', fixture.id).then(result => must(result, 'Could not inspect the fictional request receipts.'));
const publicFields = ['id', 'reference', 'status', 'package_key', 'design', 'event_category', 'placement', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer_host', 'revenue_bs', 'notes', 'created_at', 'updated_at', 'revision'].sort().join(',');
function checkLead(lead, revision) {
  expect(lead?.id === fixture.id && lead.reference === fixture.reference && lead.revision === revision, 'A reply did not identify the expected fictional lead and revision.');
  expect(lead.design === 'Lunaria' && lead.revenue_bs === null, 'The fictional reply changed its original design or invented revenue.');
  expect(Object.keys(lead).sort().join(',') === publicFields, 'A commercial reply exceeded its public field whitelist.');
  expect(!JSON.stringify(lead).includes(fixture.sessionHash), 'A commercial reply exposed its private session hash.');
}
function checkCommand(lead, command) {
  expect(lead.status === command.status && lead.notes === command.notes && lead.revenue_bs === command.revenueBs, 'A reply did not confirm the submitted fictional changes.');
}
async function checkCounts(historyCount, receiptCount) {
  expect((await readHistory()).length === historyCount, 'The fictional commercial history count is incorrect.');
  expect((await readReceipts()).length === receiptCount, 'The fictional request receipt count is incorrect.');
}
async function run() {
  const first = { id: fixture.id, requestId: fixture.firstRequestId, expectedRevision: 0, status: 'contacted', revenueBs: null, notes: 'QA ficticio A: conversación sin pagos ni mensajes.' };
  const second = { ...first, requestId: fixture.secondRequestId, status: 'reserved', notes: 'QA ficticio B: reserva simulada sin pagos ni mensajes.' };
  for (const cookie of ['', 'enkarta-admin=QA-INVALID-ADMIN', 'enkarta-host=QA-NOT-ADMIN', 'enkarta-review=QA-NOT-ADMIN', 'enkarta-door=QA-NOT-ADMIN']) {
    const response = await patch(first, cookie); privateStatus(response, 401, 'Non-admin update');
    const body = await response.json(); expect(!Object.prototype.hasOwnProperty.call(body, 'lead'), 'An unauthorized mutation exposed a contact.');
  }
  record('Anonymous, invalid admin and operational cookie slots cannot update commercial contacts');
  const dev = await request('/dev/services/commercial-update');
  expect(dev.status === 404, 'The commercial update workbench must be unavailable in production.'); await dev.body?.cancel();
  record('Development-only commercial update workbench returns 404 in production');

  expect(Boolean(process.env.ADMIN_PASSWORD), 'The local admin credential is unavailable.');
  const login = await request('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) });
  adminCookie = (login.headers.get('set-cookie') || '').match(/enkarta-admin=[^;]+/)?.[0] || '';
  if (adminCookie) { report.adminCleanup = 'temporary-session-held-in-memory'; save(); }
  expect(login.status === 200 && Boolean(adminCookie), 'Normal admin authentication failed.'); await login.body?.cancel();

  // The full ownership/deletion scope and all request IDs are durable before INSERT.
  report.fixtureInsertAttempted = true; save();
  must(await db.from('commercial_leads').insert({
    id: fixture.id, reference: fixture.reference, session_hash: fixture.sessionHash,
    status: 'whatsapp_open', package_key: 'premium', design: 'azure', event_category: 'Boda',
    placement: fixture.tag, utm_campaign: fixture.tag, revenue_bs: null, revision: 0,
    notes: 'QA ficticio: guardado seguro sin pagos ni mensajes.', created_at: fixture.createdAt, updated_at: fixture.updatedAt,
  }), 'Could not create the isolated fictional commercial contact; verify migration 019 first.');
  const before = await readFixture();
  expect(before?.id === fixture.id && before.reference === fixture.reference && before.revision === 0 && before.design === 'azure', 'The isolated fixture did not start at the expected original revision.');
  await checkCounts(0, 0);
  const initial = await lookup(); privateStatus(initial, 200, 'Initial exact lookup');
  checkLead((await initial.json()).lead, 0);
  record('The isolated current fictional contact is private, starts at revision zero and retains its original design');

  // Distinct HTTP requests compete for the same SQL revision. Only one may commit.
  const responses = await Promise.all([patch(first), patch(second)]);
  expect(responses.filter(response => response.status === 200).length === 1 && responses.filter(response => response.status === 409).length === 1, 'Competing saves did not acknowledge exactly one winner and one conflict.');
  const winnerIndex = responses[0].status === 200 ? 0 : 1;
  const winnerCommand = winnerIndex === 0 ? first : second, loserCommand = winnerIndex === 0 ? second : first;
  privateStatus(responses[winnerIndex], 200, 'Winning update'); privateStatus(responses[1 - winnerIndex], 409, 'Stale update');
  const winner = await responses[winnerIndex].json(), loser = await responses[1 - winnerIndex].json();
  expect(winner.outcome === 'saved' && winner.requestId === winnerCommand.requestId, 'The winning update did not return its saved receipt.');
  checkLead(winner.lead, 1); checkCommand(winner.lead, winnerCommand);
  expect(loser.code === 'REVISION_CONFLICT' && loser.requestId === loserCommand.requestId, 'The stale update did not identify its revision conflict.');
  checkLead(loser.lead, 1); checkCommand(loser.lead, winnerCommand);
  await checkCounts(1, 1);
  let current = await readFixture();
  expect(current?.revision === 1 && current.design === 'azure' && current.updated_at !== before.updated_at, 'The winning mutation did not preserve its original design and increment its revision.');
  checkCommand(current, winnerCommand);
  expect((await readReceipts())[0]?.request_id === winnerCommand.requestId, 'The stale request created a receipt or displaced the winning receipt.');
  record('Two concurrent HTTP saves commit exactly one revision, history entry and request receipt; the other returns a canonical conflict');

  const replayResponse = await patch(winnerCommand); privateStatus(replayResponse, 200, 'Exact retry');
  const replay = await replayResponse.json();
  expect(replay.outcome === 'replayed' && replay.requestId === winnerCommand.requestId, 'The exact retry did not recover its existing receipt.');
  expect(JSON.stringify(replay.lead) === JSON.stringify(winner.lead), 'The retry changed the original saved snapshot or timestamp.');
  await checkCounts(1, 1);
  const afterReplay = await readFixture();
  expect(afterReplay?.updated_at === current.updated_at && afterReplay.revision === 1, 'The exact retry performed an additional write.');
  record('Replaying the winning request returns the identical saved snapshot and timestamp without duplicate history or receipts');

  const reused = await patch({ ...winnerCommand, notes: 'QA ficticio: este contenido distinto debe rechazarse.' }); privateStatus(reused, 409, 'Reused request ID');
  const reusedBody = await reused.json();
  expect(reusedBody.code === 'REQUEST_REUSED' && !Object.prototype.hasOwnProperty.call(reusedBody, 'lead'), 'A reused request ID exposed or changed a contact.');
  await checkCounts(1, 1); current = await readFixture();
  expect(current?.updated_at === afterReplay.updated_at && current.revision === 1, 'Reusing a request ID performed an additional write.'); checkCommand(current, winnerCommand);
  record('Reusing a request ID for different content returns REQUEST_REUSED and leaves the saved contact untouched');

  // Deliberately discard the first reply body. This simulates a client losing its
  // acknowledgement, not a claim that a real network outage occurred.
  const recovery = { ...winnerCommand, requestId: fixture.recoveryRequestId, expectedRevision: 1,
    status: winnerCommand.status === 'contacted' ? 'reserved' : 'contacted', notes: 'QA ficticio: recuperación de respuesta descartada sin pagos ni mensajes.' };
  const discarded = await patch(recovery); privateStatus(discarded, 200, 'Reply-body recovery setup'); await discarded.body?.cancel();
  const recoveredResponse = await patch(recovery); privateStatus(recoveredResponse, 200, 'Reply-body recovery');
  const recovered = await recoveredResponse.json();
  expect(recovered.outcome === 'replayed' && recovered.requestId === recovery.requestId, 'The discarded reply could not be recovered by the exact request.');
  checkLead(recovered.lead, 2); checkCommand(recovered.lead, recovery); await checkCounts(2, 2);
  current = await readFixture(); expect(current?.revision === 2 && current.design === 'azure', 'Reply recovery changed the original design or counted an extra revision.'); checkCommand(current, recovery);
  const receiptIds = new Set((await readReceipts()).map(receipt => receipt.request_id));
  expect(receiptIds.has(winnerCommand.requestId) && receiptIds.has(recovery.requestId) && !receiptIds.has(loserCommand.requestId), 'Request receipt identities do not match the two saved operations.');
  const final = await lookup(); privateStatus(final, 200, 'Final exact lookup'); const finalBody = await final.json(); checkLead(finalBody.lead, 2); checkCommand(finalBody.lead, recovery);
  expect(must(await scopedEvents(db.from('commercial_events').select('id')), 'Could not verify fictional commercial events.').length === 0, 'Administrative updates invented commercial tracking events.');
  record('Discarding the first response body and retrying its exact operation recovers one save without duplicating revisions, history or receipts');
}

async function cleanupFixture() {
  report.cleanup = 'in-progress'; save();
  // Core columns keep cleanup independent from the new revision projection.
  const existing = must(await scoped(db.from('commercial_leads').select('id,reference')).maybeSingle(), 'Could not inspect the exact fictional cleanup scope.');
  if (existing) expect(existing.id === fixture.id && existing.reference === fixture.reference, 'Cleanup encountered an unexpected scoped contact.');
  must(await scoped(db.from('commercial_leads').delete()), 'Could not delete the exact fictional contact.');
  expect(must(await scoped(db.from('commercial_leads').select('id')).maybeSingle(), 'Could not verify the exact fictional contact cleanup.') === null, 'The exact fictional contact remains after cleanup.');
  // FK cascades remove only history and receipts belonging to the deleted lead.
  await checkCounts(0, 0);
  const events = must(await scopedEvents(db.from('commercial_events').select('id')), 'Could not inspect the fictional event cleanup scope.');
  for (const event of events) must(await scopedEvents(db.from('commercial_events').delete().eq('id', event.id)), 'Could not delete an exact fictional tracking event.');
  expect(must(await scopedEvents(db.from('commercial_events').select('id')), 'Could not verify fictional event cleanup.').length === 0, 'Fictional tracking events remain after cleanup.');
  report.cleanup = 'verified-no-fictional-lead-history-receipts-or-events-remain'; save();
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
