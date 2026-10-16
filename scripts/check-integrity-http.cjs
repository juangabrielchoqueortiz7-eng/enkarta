// Real HTTP handlers + configured Supabase, disposable fixtures only.
// Credentials only go to loopback, or the explicitly authorized production origin.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const { createClient } = require('@supabase/supabase-js');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: file,
}).outputText, file);
const { hashPassword } = require('../src/lib/access.ts');
const { parseInvitation } = require('../src/lib/types.ts');
const { editorInvitation } = require('../src/lib/client-invitation.ts');
const { newServiceContract } = require('../src/lib/packages.ts');
const { deliveryRecoveryRecord, restoreDeliveryRecovery } = require('../src/lib/delivery-recovery.ts');
const { parseScannerGroup, parseScanReceipt } = require('../src/lib/scanner-contract.ts');
const { scannerSessionFingerprint } = require('../src/lib/scanner-session.ts');
const { scanRecoveryRecord, restoreScanRecovery, scanRecoveryPerson } = require('../src/lib/scan-recovery.ts');
const { guestEditValues, validateGuestEdit, verifyGuestEditReceipt } = require('../src/lib/guest-edit-form.ts');
const { isUuid } = require('../src/lib/rsvp-contract.ts');
const { whatsappReviewRecord, prepareWhatsAppReview, restoreWhatsAppReview, advanceWhatsAppReview } = require('../src/lib/whatsapp-review.ts');
const argument = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
assert.ok(process.argv.includes('--exercise'), 'HTTP QA creates disposable fixtures and requires --exercise');
const origin = (argument('--app-url') || 'http://127.0.0.1:3000').replace(/\/$/, '');
const app = new URL(origin);
const localTarget = app.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(app.hostname);
const productionTarget = process.argv.includes('--production') && app.origin === 'https://enkarta.vercel.app';
assert.ok((localTarget || productionTarget) && app.pathname === '/' && !app.search && !app.hash && !app.username && !app.password,
  'HTTP QA requires loopback or --production with the exact https://enkarta.vercel.app origin');
const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
assert.equal(argument('--expect-project'), project, 'An exact --expect-project reference is required');
assert.notEqual(process.env.PAYMENT_PROVIDER, 'bcp', 'BCP must remain disabled');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init = {}) => fetch(url, { ...init, signal: AbortSignal.timeout(25000) }) } });
const resumeCleanup = process.argv.includes('--resume-cleanup');
let previousReport = null;
if (resumeCleanup) {
  assert.ok(argument('--report'), 'Cleanup recovery requires the original --report file');
  previousReport = JSON.parse(fs.readFileSync(argument('--report'), 'utf8'));
  const scope = previousReport.fixtureScope;
  assert.equal(previousReport.application, origin); assert.equal(previousReport.databaseHost, new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname);
  assert.equal(previousReport.environment, productionTarget ? 'production' : 'local');
  assert.match(scope?.tag || '', /^qa-http-[a-f0-9-]{36}$/);
  assert.ok(isUuid(scope.partner) && Array.isArray(scope.invitationIds) && scope.invitationIds.length === 2 && scope.invitationIds.every(isUuid) && new Set(scope.invitationIds).size === 2, 'Invalid recorded cleanup scope');
  assert.ok(Array.isArray(previousReport.checks), 'Original check results required');
  previousReport.cleanupRecovery = { previousStatus: previousReport.cleanup, resumedAt: new Date().toISOString(), newFixturesCreated: 0 };
}
const tag = previousReport?.fixtureScope.tag ?? `qa-http-${randomUUID()}`, partner = previousReport?.fixtureScope.partner ?? randomUUID(), ids = previousReport?.fixtureScope.invitationIds ?? [randomUUID(), randomUUID()];
const email = `${tag}@example.invalid`, password = randomBytes(24).toString('base64url'), reviewHash = hashPassword(password);
const report = previousReport ?? { checkedAt: new Date().toISOString(), application: origin, databaseHost: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
  environment: productionTarget ? 'production' : 'local', bankCalls: 0,
  fixtureScope: { tag, partner, invitationIds: ids }, checks: [], cleanup: 'not-started' };
let started = false;
const browserFixture = path.join(root, 'tmp', 'scan-recovery', 'browser-fixture.json');
const browserDone = path.join(root, 'tmp', 'scan-recovery', 'browser-done.json');
const editorFixture = path.join(root, path.dirname(argument('--report') || 'tmp/guest-editor/production-http.json'), 'guest-editor-fixture.json');
const editorDone = path.join(path.dirname(editorFixture), 'guest-editor-done.json');
const rosterFixture = path.join(path.dirname(editorFixture), 'roster-fixture.json');
const rosterDone = path.join(path.dirname(editorFixture), 'roster-done.json');
function writeReport() {
  const output = argument('--report');
  if (output) { fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); }
}
function must(result, action) { if (result.error) throw new Error(`${action}: ${result.error.code || 'DATABASE_ERROR'}`); return result.data; }
async function row(table, id) { return must(await db.from(table).select('*').eq('id', id).single(), 'Read own QA fixture'); }
async function check(name, run) { try { await run(); report.checks.push({ name, passed: true }); writeReport(); console.log(`OK: ${name}`); }
  catch (error) { report.checks.push({ name, passed: false }); writeReport(); throw error; } }
async function request(route, method = 'GET', body, cookie = '', headers = {}) {
  const result = await fetch(`${origin}${route}`, { method, headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000), redirect: 'manual' });
  const text = await result.text(); let data; try { data = JSON.parse(text); } catch { data = null; }
  return { status: result.status, text, data, cookie: (result.headers.get('set-cookie') || '').split(';')[0] };
}
async function cleanup() {
  if (!started) return;
  report.cleanup = 'in-progress'; writeReport();
  const owned = must(await db.from('invitations').select('id,slug,partner_id').in('id', ids), 'Read cleanup scope');
  assert.ok(owned.every(item => [tag + '-0', tag + '-1'].includes(item.slug) && item.partner_id === partner), 'HTTP fixture cleanup scope mismatch');
  const recordedPartner = must(await db.from('partners').select('id,email').eq('id', partner).maybeSingle(), 'Verify synthetic partner ownership');
  assert.ok(!recordedPartner || recordedPartner.email === email, 'HTTP partner cleanup scope mismatch');
  for (const item of owned) {
    const guests = [];
    for (let offset=0; ; offset+=500) {
      const batch=must(await db.from('guests').select('id').eq('invitation_id',item.id).order('id').range(offset,offset+499),'Read bounded cleanup scope');
      guests.push(...batch); if(batch.length<500)break;
    }
    if (guests.length) {
      for(let start=0;start<guests.length;start+=200){
      const guestIds = guests.slice(start,start+200).map(guest => guest.id);
      must(await db.from('access_log').delete().in('guest_id', guestIds), 'Remove synthetic access log');
      must(await db.from('attendees').delete().in('guest_id', guestIds), 'Remove synthetic used passes');
      assert.equal(must(await db.from('access_log').select('id').in('guest_id', guestIds), 'Verify access log cleanup').length, 0);
      assert.equal(must(await db.from('attendees').select('id').in('guest_id', guestIds), 'Verify pass cleanup').length, 0);
      }
    }
    must(await db.from('invitations').update({ status: 'disabled', published_version_id: null, scheduled_version_id: null }).eq('id', item.id).eq('slug', item.slug), 'Pause HTTP fixture');
    must(await db.from('invitations').delete().eq('id', item.id).eq('slug', item.slug), 'Delete HTTP fixture');
  }
  must(await db.from('partners').delete().eq('id', partner).eq('email', email), 'Delete HTTP QA partner and ledger');
  for (const [table, column, values] of [['invitations', 'id', ids], ['partners', 'id', [partner]], ['partner_payments', 'partner_id', [partner]],
    ['partner_subscriptions', 'partner_id', [partner]], ['builder_versions', 'invitation_id', ids], ['builder_review_notes', 'invitation_id', ids],
    ['invitation_validity_events', 'invitation_id', ids], ['invitation_analytics_events', 'invitation_id', ids], ['guests', 'invitation_id', ids], ['guest_import_requests', 'invitation_id', ids]]) {
    assert.equal(must(await db.from(table).select(column).in(column, values), 'Verify HTTP cleanup').length, 0);
  }
  report.cleanup = 'verified-no-fixtures-remain'; console.log('OK: HTTP fixtures and ledger removed');
}
async function main() {
  assert.ok(process.env.ADMIN_PASSWORD, 'Local admin credential unavailable');
  must(await db.from('guests').select('guest_metadata').limit(0), 'Migration 016 must be applied before testing this code');
  must(await db.from('guest_import_requests').select('request_id').limit(0), 'Migration 017 must be applied before testing this code');
  if(process.argv.includes('--roster-pagination'))must(await db.rpc('enkarta_host_roster',{p_invitation_id:ids[1]}),'Migration 018 must be applied before testing pagination');
  started = true;
  must(await db.from('partners').insert({ id: partner, email, full_name: 'Disposable HTTP QA' }), 'Create HTTP QA partner');
  must(await db.from('partner_subscriptions').insert({ partner_id: partner, plan_key: 'inicio', status: 'active',
    current_period_end: new Date(Date.now() + 86400000).toISOString() }), 'Create HTTP QA subscription');
  must(await db.from('invitations').insert(ids.map((id, index) => ({ id, slug: `${tag}-${index}`, partner_id: partner, template: 'perla', type: 'boda',
    names: 'QA public HTTP invitation', event_date: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10), ceremony_place: 'Synthetic QA venue',
    builder_config: { package: 'plus', serviceContract: { version: 2, adoptedAt: new Date().toISOString(), extras: [] } },
    ...(index === 0 ? { review_email: email, review_password_hash: reviewHash } : {}) }))), 'Create HTTP QA invitations');
  let adminCookie, reviewCookie;
  await check('HTTP anonymous cannot edit, publish or approve a payment', async () => {
    assert.equal((await request(`/api/admin/builder-state?invitationId=${ids[0]}`)).status, 401);
    assert.equal((await request('/api/admin/invitations', 'PUT', { id: ids[0], names: 'Forged edit' })).status, 401);
    assert.equal((await request('/api/admin/partners', 'PATCH', { id: randomUUID(), action: 'approve' })).status, 401);
  });
  await check('HTTP admin and design-review logins establish separate sessions', async () => {
    const admin = await request('/api/admin/auth', 'POST', { password: process.env.ADMIN_PASSWORD });
    assert.equal(admin.status, 200); adminCookie = admin.cookie; assert.ok(adminCookie.startsWith('enkarta-admin='));
    const review = await request('/api/review/auth', 'POST', { email, password });
    assert.equal(review.status, 200); reviewCookie = review.cookie; assert.ok(reviewCookie.startsWith('enkarta-review='));
  });
  await check('HTTP reviewer can read its own design, cannot access another or operate guests/payments', async () => {
    assert.equal((await request(`/api/admin/builder-state?invitationId=${ids[0]}`, 'GET', undefined, reviewCookie)).status, 200);
    assert.equal((await request(`/api/admin/builder-state?invitationId=${ids[1]}`, 'GET', undefined, reviewCookie)).status, 401);
    assert.equal((await request('/api/admin/builder-state', 'POST', { invitationId: ids[0], action: 'publish' }, reviewCookie)).status, 403);
    assert.equal((await request(`/api/guests?id=${ids[0]}`, 'GET', undefined, reviewCookie)).status, 403);
    assert.equal((await request('/api/admin/partners', 'PATCH', { id: randomUUID(), action: 'approve' }, reviewCookie)).status, 401);
  });
  const data = editorInvitation(parseInvitation(await row('invitations', ids[0])));
  const version = { id: `${tag}-published`, invitationId: ids[0], label: 'HTTP QA', source: 'publish', createdAt: Date.now(), data };
  await check('HTTP publication requires explicit action, then commits a ready snapshot', async () => {
    const bypass = await request('/api/admin/builder-state', 'POST', { invitationId: ids[0], version }, adminCookie);
    assert.equal(bypass.status, 400); assert.equal((await row('invitations', ids[0])).published_version_id, null);
    const publication = await request('/api/admin/builder-state', 'POST', { invitationId: ids[0], action: 'publish', version }, adminCookie);
    assert.equal(publication.status, 200, `Publish HTTP ${publication.status}: ${publication.data?.code || 'validation'}`);
    const published = await row('invitations', ids[0]); assert.equal(published.status, 'ready'); assert.equal(published.published_version_id, version.id);
  });
  await check('HTTP public invitation displays the published snapshot', async () => {
    const page = await request(`/i/${data.slug}`); assert.equal(page.status, 200); assert.ok(page.text.includes(data.names));
    assert.equal(page.text.includes(reviewHash), false);
  });
  await check('HTTP autosave preserves publication and stale revisions return 409', async () => {
    const revision = (await row('invitations', ids[0])).draft_revision;
    const saved = await request('/api/admin/invitations', 'PUT', { id: ids[0], expectedDraftRevision: revision, status: 'draft', names: 'QA PRIVATE unsent working content' }, adminCookie);
    assert.equal(saved.status, 200); assert.equal(saved.data.status, 'ready');
    const stale = await request('/api/admin/invitations', 'PUT', { id: ids[0], expectedDraftRevision: revision, names: 'QA stale' }, adminCookie);
    assert.equal(stale.status, 409);
    const page = await request(`/i/${data.slug}`); assert.ok(page.text.includes(data.names)); assert.equal(page.text.includes('QA PRIVATE unsent working content'), false);
  });
  await check('HTTP history strips credentials and pausing hides public content', async () => {
    const history = await request(`/api/admin/builder-state?invitationId=${ids[0]}`, 'GET', undefined, adminCookie);
    assert.equal(history.status, 200); assert.equal(history.text.includes(reviewHash), false);
    const current = await row('invitations', ids[0]);
    assert.equal((await request('/api/admin/invitations', 'PUT', { id: ids[0], expectedDraftRevision: current.draft_revision, status: 'disabled' }, adminCookie)).status, 200);
    const page = await request(`/i/${data.slug}`); assert.equal(page.text.includes(data.names), false);
    assert.equal(page.text.includes('QA PRIVATE unsent working content'), false);
  });
  // One separate, disposable Exclusive event for all guest/door operations.
  let guest, doorCookie, hostCookie, group, priorScan;
  const scannerBinding = () => ({ 'X-Enkarta-Scanner-Session': scannerSessionFingerprint('door', decodeURIComponent(doorCookie.slice(doorCookie.indexOf('=') + 1))) });
  const opsSlug = `${tag}-1`;
  await check('HTTP Exclusive event publishes and establishes isolated host and door sessions', async () => {
    must(await db.from('invitations').update({ builder_config: newServiceContract({}, 'exclusive'), host_email: email,
      host_password_hash: reviewHash, door_email: email, door_password_hash: reviewHash }).eq('id', ids[1]), 'Configure synthetic operations event');
    const opsData = editorInvitation(parseInvitation(await row('invitations', ids[1])));
    const response = await request('/api/admin/builder-state', 'POST', { invitationId: ids[1], action: 'publish',
      version: { ...version, id: `${tag}-operations`, invitationId: ids[1], data: opsData } }, adminCookie);
    assert.equal(response.status, 200, `Exclusive publish HTTP ${response.status}: ${JSON.stringify(response.data?.issues || response.data?.code)}`);
    const host = await request('/api/host/auth', 'POST', { email, password }); assert.equal(host.status, 200); hostCookie = host.cookie;
    const door = await request('/api/door/auth', 'POST', { email, password }); assert.equal(door.status, 200); doorCookie = door.cookie;
  });
  await check('HTTP guest import validates the whole batch and door cannot edit the roster', async () => {
    const invalid = await request('/api/guests', 'POST', { requestId: randomUUID(), invitationId: ids[1], guests: [{ name: 'QA valid', passes: 4 }, { name: 'QA invalid', passes: 2.5 }] }, hostCookie);
    assert.equal(invalid.status, 400); assert.equal(must(await db.from('guests').select('id').eq('invitation_id', ids[1]), 'Read own guest scope').length, 0);
    const created = await request('/api/guests', 'POST', { requestId: randomUUID(), invitationId: ids[1], guests: [{ name: 'QA synthetic family', passes: 4, tableNo: 'QA-7', phone: '71234567', group: 'QA-private-group' }] }, hostCookie);
    assert.equal(created.status, 200); guest = created.data.guests[0];
    assert.ok(guest.publicId); assert.equal(guest.passes, 4);
    assert.equal(guest.phone, '+59171234567'); assert.equal(guest.group, 'QA-private-group'); assert.equal(guest.metadataStored, true);
    assert.equal((await request(`/api/guests?id=${ids[1]}`, 'GET', undefined, doorCookie)).status, 403);
    assert.equal((await request('/api/guests', 'PATCH', { id: guest.id, expectedRevision: guest.responseRevision, name: 'Forbidden' }, doorCookie)).status, 403);
  });
  await check('HTTP concurrent import retries create once and changed content cannot reuse the request', async () => {
    const operation = { invitationId: ids[1], requestId: randomUUID(), guests: [{ name: 'QA import retry only', passes: 2, phone: '76543210' }] };
    const replies = await Promise.all([1,2,3].map(() => request('/api/guests', 'POST', operation, hostCookie)));
    replies.forEach(reply => assert.equal(reply.status, 200));
    const initial = replies.find(reply => !reply.data.replayed); assert.ok(initial);
    assert.equal(replies.filter(reply => !reply.data.replayed).length, 1);
    replies.forEach(reply => assert.equal(reply.data.guests[0].id, initial.data.guests[0].id));
    assert.equal(must(await db.from('guests').select('id').eq('invitation_id', ids[1]), 'Read own import count').length, 2);
    const conflict = await request('/api/guests', 'POST', { ...operation, guests: [{ ...operation.guests[0], passes: 3 }] }, hostCookie);
    assert.equal(conflict.status, 409); assert.equal(conflict.data.code, 'REQUEST_REUSED');
    assert.equal((await request('/api/guests', 'POST', operation, doorCookie)).status, 403);
    const removed = await request('/api/guests?guestId=' + initial.data.guests[0].id + '&expectedRevision=0', 'DELETE', undefined, hostCookie);
    assert.equal(removed.status, 200);
    const recovered = await request('/api/guests', 'POST', operation, hostCookie);
    assert.equal(recovered.status, 200); assert.equal(recovered.data.replayed, true); assert.equal(recovered.data.importedCount, 1);
    assert.equal(recovered.data.missingCount, 1); assert.equal(recovered.data.guests.length, 0);
    assert.equal(must(await db.from('guests').select('id').eq('invitation_id', ids[1]), 'Verify deleted row not recreated').length, 1);
  });
  await check('HTTP stale edits fail and WhatsApp opening never claims a sent message', async () => {
    const noRevision = await request('/api/guests', 'PATCH', { id: guest.id, name: 'Not saved' }, hostCookie); assert.equal(noRevision.status, 400);
    const changed = await request('/api/guests', 'PATCH', { id: guest.id, expectedRevision: guest.responseRevision, tableNo: 'QA-8' }, hostCookie);
    assert.equal(changed.status, 200);
    const stale = await request('/api/guests', 'PATCH', { id: guest.id, expectedRevision: guest.responseRevision, tableNo: 'QA-old' }, hostCookie); assert.equal(stale.status, 409);
    guest = changed.data.guest;
    const body = { guestId: guest.id, action: 'opened', expectedRevision: guest.responseRevision, requestId: randomUUID() };
    const opened = await request('/api/guests/delivery', 'POST', body, hostCookie); assert.equal(opened.status, 200);
    guest = opened.data.guest; assert.equal(guest.sent, false); assert.equal(guest.deliveryStatus, 'opened');
    const repeated = await request('/api/guests/delivery', 'POST', body, hostCookie); assert.equal(repeated.status, 200); assert.equal(repeated.data.replayed, true);
  });
  await check('HTTP recovered reminder identity counts once and a manual mark stays separate from an opening', async () => {
    const draft = prepareWhatsAppReview({ id: randomUUID(), ids: [guest.id], position: 0, purpose: 'reminder', prepared: [], revision: 0, updatedAt: Date.now() }, guest.id);
    const savedReview = JSON.stringify(whatsappReviewRecord(ids[1], draft));
    const operation = { guestId: guest.id, action: 'reminder', expectedRevision: guest.responseRevision, requestId: randomUUID() };
    const one = await request('/api/guests/delivery', 'POST', operation, hostCookie); assert.equal(one.status, 200); assert.equal(one.data.guest.reminderCount, 1); assert.equal(one.data.guest.sent, false);
    const restored = restoreDeliveryRecovery(JSON.stringify(deliveryRecoveryRecord(ids[1], operation)), ids[1]);
    assert.deepEqual(restored, operation);
    assert.equal(restoreDeliveryRecovery(JSON.stringify(deliveryRecoveryRecord(ids[1], operation)), ids[0]), null);
    assert.equal((await request('/api/guests/delivery', 'POST', restored, doorCookie)).status, 403);
    const replay = await request('/api/guests/delivery', 'POST', restored, hostCookie); assert.equal(replay.status, 200); assert.equal(replay.data.replayed, true); assert.equal(replay.data.guest.reminderCount, 1);
    const resumed = restoreWhatsAppReview(savedReview, ids[1]);
    assert.equal(resumed.ids[resumed.position], guest.id); assert.deepEqual(resumed.prepared, [guest.id]);
    assert.equal(restoreWhatsAppReview(savedReview, ids[0]), null);
    assert.equal(advanceWhatsAppReview(resumed).position, 1);
    guest = replay.data.guest;
    const marked = await request('/api/guests/delivery', 'POST', { ...operation, action: 'manual', requestId: randomUUID(), expectedRevision: guest.responseRevision }, hostCookie);
    assert.equal(marked.status, 200); guest = marked.data.guest; assert.equal(guest.sent, true); assert.equal(guest.deliveryStatus, 'marked'); assert.equal(guest.reminderCount, 1);
  });
  await check('HTTP contact updates are versioned, survive a legacy design restore, and never leak publicly', async () => {
    const changed = await request('/api/guests', 'PATCH', { id: guest.id, expectedRevision: guest.responseRevision, group: 'QA-private-current', eventAccess: 'ceremony' }, hostCookie);
    assert.equal(changed.status, 200); assert.equal(changed.data.guest.responseRevision, guest.responseRevision + 1); guest = changed.data.guest;
    const event = await row('invitations', ids[1]);
    must(await db.from('invitations').update({ builder_config: { ...event.builder_config, guestMeta: { [guest.publicId]: { phone: 'QA-private-OLD', group: 'QA-private-OLD' } } } }).eq('id', ids[1]), 'Restore synthetic legacy metadata');
    const list = await request(`/api/guests?id=${ids[1]}`, 'GET', undefined, hostCookie); assert.equal(list.status, 200);
    assert.equal(list.data[0].phone, '+59171234567'); assert.equal(list.data[0].group, 'QA-private-current');
    // A legacy snapshot can contain old guestMeta: publishing it must still not
    // put contacts into the public guest context or revert the canonical record.
    const legacyData = editorInvitation(parseInvitation(await row('invitations', ids[1])));
    const legacyPublication = await request('/api/admin/builder-state', 'POST', { invitationId: ids[1], action: 'publish',
      version: { ...version, id: `${tag}-ops-legacy`, invitationId: ids[1], data: legacyData } }, adminCookie);
    assert.equal(legacyPublication.status, 200);
    const page = await request(`/i/${opsSlug}?g=${guest.publicId}`); assert.equal(page.status, 200);
    assert.equal(page.text.includes('QA-private-current'), false); assert.equal(page.text.includes('QA-private-OLD'), false); assert.equal(page.text.includes('+59171234567'), false);
    const cleared = await request('/api/guests', 'PATCH', { id: guest.id, expectedRevision: guest.responseRevision, phone: '' }, hostCookie); assert.equal(cleared.status, 200); guest = cleared.data.guest;
    const refreshed = await request(`/api/guests?id=${ids[1]}`, 'GET', undefined, hostCookie); assert.equal(refreshed.data[0].phone, '');
  });
  await check('HTTP reviewed guest edit saves a verified contact once and cannot overwrite a newer revision', async () => {
    const { command } = validateGuestEdit(guest, { ...guestEditValues(guest), phone: '76543210', tableNo: 'QA-8' }, true);
    assert.ok(command);
    const saved = await request('/api/guests', 'PATCH', command, hostCookie); assert.equal(saved.status, 200);
    assert.doesNotThrow(() => verifyGuestEditReceipt(saved.data, command));
    assert.equal(saved.data.guest.phone, '+59176543210'); guest = saved.data.guest;
    assert.equal((await request('/api/guests', 'PATCH', command, hostCookie)).status, 409);
    assert.equal(must(await db.from('access_log').select('id').eq('guest_id', guest.id), 'Verify editing did not enter a pass').length, 0);
  });
  await check('HTTP RSVP cannot exceed assigned passes and materializes exactly four seats', async () => {
    const input = { slug: opsSlug, publicId: guest.publicId, attending: 'yes', confirmName: 'QA synthetic family', passes: 5, expectedRevision: guest.responseRevision, requestId: randomUUID() };
    const excess = await request('/api/guests/confirm', 'POST', input); assert.equal(excess.status, 400);
    assert.equal(must(await db.from('attendees').select('id').eq('guest_id', guest.id), 'Read own seats').length, 0);
    const accepted = await request('/api/guests/confirm', 'POST', { ...input, passes: 4, requestId: randomUUID() });
    assert.equal(accepted.status, 200); guest = accepted.data.guest; assert.ok(guest.accessToken); assert.equal(guest.confirmedPasses, 4);
    const found = await request(`/api/checkin?scope=door&token=${encodeURIComponent(guest.accessToken)}`, 'GET', undefined, doorCookie);
    assert.equal(found.status, 200); group = parseScannerGroup(found.data, guest.id); assert.equal(group.attendees.length, 4); assert.equal(group.attendees.filter(a => a.state === 'in').length, 0);
  });
  await check('HTTP reception finds only its confirmed event group without contacts, tokens or accidental entry', async () => {
    for (const [page, cookie] of [['/puerta', doorCookie], ['/panel/scan', hostCookie]]) {
      const view = await request(page, 'GET', undefined, cookie); assert.equal(view.status, 200);
      assert.ok(view.text.includes('¿El invitado no encuentra su QR?'), 'Reception page must render its scoped search');
    }
    const params = new URLSearchParams({ scope: 'door', invitationId: ids[1], q: 'QA synthetic', field: 'name' });
    const path = '/api/checkin/search?' + params;
    assert.equal((await request(path)).status, 403);
    assert.equal((await request(path, 'GET', undefined, reviewCookie)).status, 403);
    assert.equal((await request(path, 'GET', undefined, hostCookie)).status, 403);
    const result = await request(path, 'GET', undefined, doorCookie); assert.equal(result.status, 200);
    assert.deepEqual(result.data, { guests: [{ id: guest.id, name: 'QA synthetic family', tableNo: 'QA-8', passes: 4 }], hasMore: false });
    assert.equal(JSON.stringify(result.data).includes(guest.accessToken), false);
    params.set('invitationId', ids[0]); assert.equal((await request('/api/checkin/search?' + params, 'GET', undefined, doorCookie)).status, 403);
    params.set('invitationId', ids[1]); params.set('field', 'table'); params.set('q', 'QA-8');
    assert.equal((await request('/api/checkin/search?' + params, 'GET', undefined, doorCookie)).data.guests.length, 1);
    params.set('q', '8'); assert.equal((await request('/api/checkin/search?' + params, 'GET', undefined, doorCookie)).data.guests.length, 0);
    params.set('field', 'name'); params.set('q', '%_'); assert.equal((await request('/api/checkin/search?' + params, 'GET', undefined, doorCookie)).data.guests.length, 0);
    const selected = await request('/api/checkin?scope=door&guestId=' + guest.id, 'GET', undefined, doorCookie);
    assert.equal(selected.status, 200); assert.equal(selected.data.attendees.length, 4); assert.equal(selected.data.attendees.every(person => person.state === 'out'), true);
    assert.equal(must(await db.from('access_log').select('id').eq('guest_id', guest.id), 'Verify search did not check in').length, 0);
  });
  await check('HTTP scanner recovery rejects changed sessions, borrowed roles and a false event without writing', async () => {
    const query = `/api/checkin?scope=door&guestId=${guest.id}`, oldBinding = scannerBinding();
    const initial = await request(query, 'GET', undefined, doorCookie, oldBinding);
    assert.equal(initial.status, 200); assert.equal(initial.data.invitationId, ids[1]);
    const operation = { scope: 'door', invitationId: ids[0], attendeeId: group.attendees[0].id, action: 'in', expectedRevision: 0, requestId: randomUUID() };
    assert.equal((await request('/api/checkin', 'POST', operation, doorCookie, oldBinding)).status, 403);
    assert.equal((await request(query, 'GET', undefined, hostCookie, oldBinding)).status, 403);
    // Rotate only our disposable fixture credential. New valid login must not reuse the old journal.
    must(await db.from('invitations').update({ door_password_hash: hashPassword(password) }).eq('id', ids[1]).eq('slug', opsSlug), 'Rotate own synthetic door session');
    const login = await request('/api/door/auth', 'POST', { email, password }); assert.equal(login.status, 200);
    assert.notEqual(login.cookie, doorCookie); doorCookie = login.cookie;
    assert.equal((await request(query, 'GET', undefined, doorCookie, oldBinding)).status, 403);
    assert.equal((await request('/api/checkin', 'POST', { ...operation, invitationId: ids[1] }, doorCookie, oldBinding)).status, 403);
    assert.equal((await request(query, 'GET', undefined, doorCookie, scannerBinding())).status, 200);
    assert.equal(must(await db.from('access_log').select('id').eq('guest_id', guest.id), 'Verify scoped refusal did not write').length, 0);
  });
  await check('HTTP private scanner pages expose scoped recovery metadata without signed cookies', async () => {
    for (const [role, cookie, page] of [['door', doorCookie, '/puerta'], ['host', hostCookie, '/panel/scan'], ['admin', adminCookie, '/panel/scan']]) {
      const value = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
      const binding = scannerSessionFingerprint(role, value);
      const html = await request(page, 'GET', undefined, cookie);
      assert.equal(html.status, 200); assert.ok(html.text.includes(binding)); assert.equal(html.text.includes(value), false);
      const groupReply = await request(`/api/checkin?scope=${role === 'door' ? 'door' : 'host'}&guestId=${guest.id}`, 'GET', undefined, cookie, { 'X-Enkarta-Scanner-Session': binding });
      assert.equal(groupReply.status, 200); assert.equal(parseScannerGroup(groupReply.data, guest.id, ids[1]).invitationId, ids[1]);
    }
  });
  await check('HTTP competing door scans count once; replay and partial entry preserve the remaining passes', async () => {
    const person = group.attendees[0];
    const first = { scope: 'door', invitationId: ids[1], attendeeId: person.id, action: 'in', expectedRevision: person.revision, requestId: randomUUID() };
    const second = { ...first, requestId: randomUUID() };
    const attempts = await Promise.all([request('/api/checkin', 'POST', first, doorCookie, scannerBinding()), request('/api/checkin', 'POST', second, doorCookie, scannerBinding())]);
    assert.deepEqual(attempts.map(r => r.status).sort(), [200,409]);
    const winning = attempts[0].status === 200 ? first : second;
    priorScan = { operation: winning, before: person };
    const replay = await request('/api/checkin', 'POST', winning, doorCookie, scannerBinding()); assert.equal(replay.status, 200); assert.equal(replay.data.replayed, true);
    assert.equal(parseScanReceipt(replay.data, winning, person).attendee.state, 'in');
    const next = group.attendees[1];
    assert.equal((await request('/api/checkin', 'POST', { ...first, attendeeId: next.id, expectedRevision: next.revision, requestId: randomUUID() }, doorCookie)).status, 200);
    const found = await request(`/api/checkin?scope=door&token=${encodeURIComponent(guest.accessToken)}`, 'GET', undefined, doorCookie); group = found.data;
    assert.equal(found.status, 200); assert.equal(group.attendees.filter(a => a.state === 'in').length, 2); assert.equal(group.attendees.filter(a => a.state === 'out').length, 2);
  });
  await check('HTTP serialized QR recovery respects a later exit and does not duplicate the original entry', async () => {
    const recoveryScope = { role: 'door', invitationId: ids[1], sessionKey: scannerBinding()['X-Enkarta-Scanner-Session'] };
    const restored = restoreScanRecovery(JSON.stringify(scanRecoveryRecord(recoveryScope, { invitationId: ids[1], guestId: guest.id, seatNo: priorScan.before.seatNo, operation: priorScan.operation })), recoveryScope);
    assert.ok(restored); assert.equal(restored.operation.requestId, priorScan.operation.requestId);
    const current = group.attendees.find(person => person.id === priorScan.operation.attendeeId);
    const exit = { scope: 'door', attendeeId: current.id, action: 'out', expectedRevision: current.revision, requestId: randomUUID() };
    const exited = await request('/api/checkin', 'POST', exit, doorCookie); assert.equal(exited.status, 200);
    const replay = await request('/api/checkin', 'POST', { ...restored.operation, invitationId: restored.invitationId, scope: 'door' }, doorCookie, scannerBinding()); assert.equal(replay.status, 200);
    const receipt = parseScanReceipt(replay.data, restored.operation, scanRecoveryPerson(restored));
    assert.equal(receipt.replayed, true); assert.equal(receipt.changedLater, true); assert.equal(receipt.attendee.state, 'out');
    assert.equal(must(await db.from('access_log').select('id').eq('request_id', priorScan.operation.requestId), 'Count own replay log').length, 1);
    const reentry = await request('/api/checkin', 'POST', { ...exit, action: 'in', expectedRevision: receipt.attendee.revision, requestId: randomUUID() }, doorCookie);
    assert.equal(reentry.status, 200);
    const found = await request(`/api/checkin?scope=door&token=${encodeURIComponent(guest.accessToken)}`, 'GET', undefined, doorCookie);
    assert.equal(found.status, 200); group = parseScannerGroup(found.data, guest.id);
    assert.equal(group.attendees.filter(person => person.state === 'in').length, 2);
  });
  await check('HTTP exhausted passes reject double entry and invalid tokens; exit permits a deliberate reentry', async () => {
    for (const person of group.attendees.filter(a => a.state === 'out')) {
      assert.equal((await request('/api/checkin', 'POST', { scope: 'door', attendeeId: person.id, action: 'in', expectedRevision: person.revision, requestId: randomUUID() }, doorCookie)).status, 200);
    }
    const full = await request(`/api/checkin?scope=door&token=${encodeURIComponent(guest.accessToken)}`, 'GET', undefined, doorCookie);
    assert.equal(full.data.attendees.filter(a => a.state === 'in').length, 4);
    const person = full.data.attendees[0];
    const input = { scope: 'door', attendeeId: person.id, action: 'in', expectedRevision: person.revision, requestId: randomUUID() };
    assert.equal((await request('/api/checkin', 'POST', input, doorCookie)).status, 409);
    assert.equal((await request(`/api/checkin?scope=door&token=${tag}-invalid`, 'GET', undefined, doorCookie)).status, 404);
    const out = await request('/api/checkin', 'POST', { ...input, action: 'out', requestId: randomUUID() }, doorCookie); assert.equal(out.status, 200);
    const back = await request('/api/checkin', 'POST', { ...input, expectedRevision: out.data.attendee.revision, requestId: randomUUID() }, doorCookie); assert.equal(back.status, 200);
    assert.equal((await request(`/api/guests?guestId=${guest.id}&expectedRevision=${guest.responseRevision}`, 'DELETE', undefined, hostCookie)).status, 409);
  });
  await check('HTTP manual payment approval activates once; repeat approval is idempotent', async () => {
    must(await db.from('partner_subscriptions').update({ status: 'none', current_period_end: null }).eq('partner_id', partner), 'Reset synthetic paid term');
    const payment = must(await db.from('partner_payments').insert({ partner_id: partner, reference: `ENK-${randomBytes(3).toString('hex').toUpperCase()}`,
      plan_key: 'inicio', months: 1, amount_bs: 249, provider: 'manual' }).select('id').single(), 'Create synthetic manual ledger');
    const one = await request('/api/admin/partners', 'PATCH', { id: payment.id, action: 'approve', note: 'QA only; no real payment' }, adminCookie);
    assert.equal(one.status, 200); assert.equal(one.data.replayed, false);
    const two = await request('/api/admin/partners', 'PATCH', { id: payment.id, action: 'approve' }, adminCookie);
    assert.equal(two.status, 200); assert.equal(two.data.replayed, true); assert.equal(one.data.periodEnd, two.data.periodEnd);
    const sub = must(await db.from('partner_subscriptions').select('status,current_period_end').eq('partner_id', partner).single(), 'Read activated QA subscription');
    assert.equal(sub.status, 'active'); assert.equal(sub.current_period_end, (await row('partner_payments', payment.id)).period_end);
  });
  await check('HTTP forged bank-paid data cannot approve an unverified BCP ledger entry', async () => {
    const bank = must(await db.from('partner_payments').insert({ partner_id: partner, reference: `ENK-${randomBytes(3).toString('hex').toUpperCase()}`,
      plan_key: 'inicio', months: 1, amount_bs: 249, provider: 'bcp' }).select('id').single(), 'Create unverified synthetic bank ledger');
    const response = await request('/api/admin/partners', 'PATCH', { id: bank.id, action: 'approve', paid: true, providerTransaction: 'FORGED-QA', verifiedAmount: 249 }, adminCookie);
    assert.equal(response.status, 409); assert.equal(response.data.code, 'BANK_CONFIRMATION_REQUIRED');
    assert.equal((await row('partner_payments', bank.id)).status, 'pending');
  });
  if(process.argv.includes('--roster-pagination')) {
    let expectedTotal;
    await check('HTTP SQL pagination returns 25 of more than 1000 synthetic groups with complete metrics and stable pages',async()=>{
      const rows=Array.from({length:1001},(_,index)=>({invitation_id:ids[1],public_id:randomBytes(12).toString('hex'),name:`QA Padrón ${String(index).padStart(4,'0')}`,passes:2,
        guest_metadata:{phone:'+59170000001',group:index%2?'QA-impares':'QA-pares'},table_no:String(index%10+1)}));
      for(let offset=0;offset<rows.length;offset+=200)must(await db.from('guests').insert(rows.slice(offset,offset+200)),'Create bounded synthetic roster');
      const count=await db.from('guests').select('id',{head:true,count:'exact'}).eq('invitation_id',ids[1]);must(count,'Count own synthetic roster');expectedTotal=count.count;
      const first=await request('/api/host/dashboard','GET',undefined,hostCookie),second=await request('/api/host/dashboard?page=2','GET',undefined,hostCookie);
      assert.equal(first.status,200);assert.equal(second.status,200);assert.equal(first.data.guests.length,25);assert.equal(first.data.metrics.total,expectedTotal);assert.equal(first.data.roster.total,expectedTotal);
      assert.equal(first.data.roster.version,second.data.roster.version);assert.equal(new Set([...first.data.guests,...second.data.guests].map(g=>g.id)).size,50);
      assert.equal(first.data.rows.some(r=>r.source==='personal'),false);assert.equal(first.text.includes('accessToken'),false);
      const last=await request('/api/host/dashboard?page=1000000','GET',undefined,hostCookie);assert.equal(last.data.roster.to,expectedTotal);assert.ok(last.data.guests.length<=25);
      report.rosterPagination={syntheticGroups:expectedTotal,pageSize:first.data.guests.length,pages:first.data.roster.pages};
    });
    await check('HTTP filtered CSV and WhatsApp cover every matching page and duplicate lookup finds an off-page group',async()=>{
      const filtered=await request('/api/host/dashboard?search='+encodeURIComponent('QA Padrón'),'GET',undefined,hostCookie);assert.equal(filtered.status,200);
      assert.equal(filtered.data.roster.total,1001);assert.equal(filtered.data.metrics.total,expectedTotal);assert.equal(filtered.data.roster.invitationQueue.ids.length,200);assert.equal(filtered.data.roster.invitationQueue.overflow,801);
      const csv=await request('/api/host/roster?search='+encodeURIComponent('QA Padrón'),'GET',undefined,hostCookie);assert.equal(csv.status,200);assert.equal(csv.text.split('\r\n').length,1002);assert.ok(csv.text.includes('QA Padrón 1000'));
      const duplicates=await request('/api/host/roster','POST',{candidates:[{name:'QA Padrón 1000',phone:'70000001'}]},hostCookie);assert.equal(duplicates.status,200);assert.deepEqual(duplicates.data.duplicates,[0]);
      const selected=await request('/api/host/dashboard?search=unmatched&selected='+guest.id,'GET',undefined,hostCookie);assert.equal(selected.data.guests.length,0);assert.equal(selected.data.selectedGuests[0].id,guest.id);
    });
    await check('HTTP paginated roster and export deny anonymous, reviewer, reception and cross-event reads',async()=>{
      for(const cookie of ['',reviewCookie,doorCookie])for(const route of ['/api/host/dashboard','/api/host/roster'])assert.equal((await request(route+'?id='+ids[1],'GET',undefined,cookie)).status,403);
      assert.equal((await request('/api/host/roster?id='+ids[0],'GET',undefined,hostCookie)).status,403);
      assert.equal((await request('/api/host/dashboard?page=0','GET',undefined,hostCookie)).status,400);
    });
    await check('HTTP duplicate preview accepts a full UTF-8 batch without creating guests',async()=>{
      const candidates=Array.from({length:200},()=>({name:'界'.repeat(80),phone:'+59170000001'}));
      const response=await request('/api/host/roster','POST',{candidates},hostCookie);assert.equal(response.status,200);assert.deepEqual(response.data.duplicates,[]);
      const count=await db.from('guests').select('id',{head:true,count:'exact'}).eq('invitation_id',ids[1]);must(count,'Verify preview writes no guests');assert.equal(count.count,expectedTotal);
    });
    if(process.argv.includes('--roster-window') || process.argv.includes('--csv-window'))await check(process.argv.includes('--csv-window') ? 'Production browser downloads the complete filtered CSV without writes' : 'Production browser paginates and resumes an off-page WhatsApp contact without writes',async()=>{
      const before=await row('guests',guest.id), accessBefore=must(await db.from('access_log').select('id').eq('guest_id',guest.id),'Read browser access baseline');
      fs.writeFileSync(rosterFixture,JSON.stringify({tag,email,password,invitationId:ids[1],guestId:guest.id,total:expectedTotal}));
      console.log('READY: synthetic roster browser fixture; waiting for acknowledgement');
      const deadline=Date.now()+8*60*1000;let completed=false;
      while(Date.now()<deadline){let done;try{done=JSON.parse(fs.readFileSync(rosterDone,'utf8'));}catch{}if(done?.tag===tag&&done.failed===true)throw new Error('Browser CSV verification failed; cleaning fixtures');if(done?.tag===tag&&done.confirmed===true){completed=true;break;}await new Promise(resolve=>setTimeout(resolve,500));}
      assert.ok(completed,'Roster browser exercise timed out');assert.equal((await row('guests',guest.id)).response_revision,before.response_revision);
      assert.deepEqual(must(await db.from('access_log').select('id').eq('guest_id',guest.id),'Verify no browser access writes'),accessBefore);
      report.rosterBrowser={writes:0,bankCalls:0,messagesSent:0};
      if(process.argv.includes('--csv-window')){
        const bytes=fs.readFileSync(path.join(path.dirname(rosterFixture),'browser-export.csv'));
        const expected=await request('/api/host/roster?search='+encodeURIComponent('QA Padrón'),'GET',undefined,hostCookie);assert.equal(expected.status,200);
        assert.equal(bytes.subarray(0,3).toString('hex'),'efbbbf');assert.equal(bytes.toString('utf8').split('\r\n').length,1002);
        assert.equal(bytes.toString('utf8').slice(1),expected.text.replace(/^\uFEFF/,''));
        report.csvDownload={rows:1001,bytes:bytes.length,utf8Bom:true,exactHttpMatch:true};
      }
    });
  }
  if (process.argv.includes('--guest-editor-window')) await check('Production browser guest edit updates one revision and leaves access movements unchanged', async () => {
    const before = await row('guests', guest.id);
    const logBefore = must(await db.from('access_log').select('id').eq('guest_id', guest.id), 'Read own editor access baseline');
    fs.mkdirSync(path.dirname(editorFixture), { recursive: true });
    fs.writeFileSync(editorFixture, JSON.stringify({ tag, email, password, invitationId: ids[1], guestId: guest.id,
      expectedName: 'QA edición verificada', expectedPhone: '+59170000002', baselineRevision: before.response_revision }));
    console.log('READY: synthetic host editor fixture; waiting up to 8 minutes for local acknowledgement');
    let done = false; const deadline = Date.now() + 8 * 60 * 1000;
    while (Date.now() < deadline) {
      try { const value = JSON.parse(fs.readFileSync(editorDone, 'utf8')); if (value.tag === tag && value.confirmed === true) { done = true; break; } } catch { /* acknowledgement not ready */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(done, 'Guest editor browser acknowledgement timed out; fixtures will be cleaned');
    const saved = await row('guests', guest.id);
    assert.equal(saved.name, 'QA edición verificada'); assert.equal(saved.guest_metadata.phone, '+59170000002');
    assert.equal(saved.response_revision, before.response_revision + 1);
    const logAfter = must(await db.from('access_log').select('id').eq('guest_id', guest.id), 'Verify editor did not change reception');
    assert.deepEqual(logAfter.map(item => item.id).sort(), logBefore.map(item => item.id).sort());
    report.browserGuestEdit = { changedRevisions: 1, accessMovementsUnchanged: true, fixtureScopeVerified: true };
  });
  if (process.argv.includes('--browser-window')) await check('Production browser recovery adds one scoped movement despite reload and retry', async () => {
    // The preceding exhausted-passes regression deliberately leaves everyone inside.
    // Prepare one synthetic arrival with an audited exit before taking the baseline.
    const seat = must(await db.from('attendees').select('id,state,revision').eq('guest_id', guest.id).eq('seat_no', 1).single(), 'Read own browser fixture seat');
    if (seat.state === 'in') must(await db.rpc('enkarta_checkin', {
      p_invitation_id: ids[1], p_attendee_id: seat.id, p_action: 'out', p_expected_revision: seat.revision,
      p_request_id: randomUUID(), p_operator: 'qa-browser-fixture-preparation',
    }), 'Prepare own synthetic arrival with audited exit');
    const before = must(await db.from('access_log').select('id').eq('guest_id', guest.id), 'Read own browser baseline');
    const baseline = new Set(before.map(item => item.id));
    fs.mkdirSync(path.dirname(browserFixture), { recursive: true });
    // Disposable credentials only, never printed or deployed; removed in finally.
    fs.writeFileSync(browserFixture, JSON.stringify({ tag, email, password, invitationId: ids[1], guestId: guest.id, accessCode: guest.accessCode }));
    console.log('READY: synthetic browser fixture; waiting up to 8 minutes for local acknowledgement');
    const deadline = Date.now() + 8 * 60 * 1000;
    let completed = false;
    while (Date.now() < deadline) {
      try { const done = JSON.parse(fs.readFileSync(browserDone, 'utf8')); if (done.tag === tag && done.confirmed === true) { completed = true; break; } } catch { /* acknowledgement not ready */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(completed, 'Browser exercise acknowledgement timed out; fixtures will be cleaned');
    const changes = must(await db.from('access_log').select('id,request_id,action,guest_id').eq('guest_id', guest.id), 'Verify own browser movement').filter(item => !baseline.has(item.id));
    assert.equal(changes.length, 1); assert.equal(changes[0].action, 'in'); assert.equal(changes[0].guest_id, guest.id);
    assert.equal(must(await db.from('access_log').select('id').eq('request_id', changes[0].request_id), 'Verify browser retry counted once').length, 1);
    report.browserRecovery = { additionalMovements: changes.length, originalRequestCount: 1, fixtureScopeVerified: true };
  });
}
// Save only non-secret fixture identity before the first mutation so cleanup is
// recoverable even when the host terminates the process before finally runs.
writeReport();
(resumeCleanup ? Promise.resolve().then(() => { started = true; console.log('OK: resuming only the recorded fixture cleanup; no new fixtures created'); }) : main()).catch(error => { report.failure = error.message; console.error(`FAIL: ${error.message}`); process.exitCode = 1; }).finally(async () => {
  try { await cleanup(); } catch (error) { report.cleanup = 'failed'; report.cleanupFailure = error.message; console.error('FAIL: fixture cleanup requires attention'); process.exitCode = 1; }
  try { if (JSON.parse(fs.readFileSync(browserFixture, 'utf8')).tag === tag) fs.unlinkSync(browserFixture); } catch { /* absent or another run's file */ }
  try { if (JSON.parse(fs.readFileSync(browserDone, 'utf8')).tag === tag) fs.unlinkSync(browserDone); } catch { /* absent or another run's file */ }
  for (const file of [editorFixture, editorDone, rosterFixture, rosterDone]) { try { if (JSON.parse(fs.readFileSync(file, 'utf8')).tag === tag) fs.unlinkSync(file); } catch { /* absent or another run's file */ } }
  writeReport();
});
