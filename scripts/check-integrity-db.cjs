// Default: schema/permission reads only. --exercise uses disposable, UUID-scoped
// fixtures. Never truncates tables or invokes BCP, WhatsApp, email or a bank.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const { createClient } = require('@supabase/supabase-js');
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const exercise = process.argv.includes('--exercise');
const argument = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
const reportFile = argument('--report');
const report = { checkedAt: new Date().toISOString(), mode: exercise ? 'synthetic-fixtures' : 'read-only', checks: [], cleanup: 'not-needed' };
const runId = randomUUID();
const prefix = `qa-integrity-${runId}`;
const partnerIds = [randomUUID(), randomUUID()];
const invitationIds = Array.from({ length: 5 }, () => randomUUID());
let db, anonymous, fixturesStarted = false;
function must(result, operation) {
  if (result.error) throw new Error(`${operation}: ${result.error.code || 'DATABASE_ERROR'}`);
  return result.data;
}
async function check(name, run) {
  try { await run(); report.checks.push({ name, passed: true }); console.log(`OK: ${name}`); }
  catch (error) { report.checks.push({ name, passed: false }); throw error; }
}
async function rpc(name, args) { return must(await db.rpc(name, args), name); }
async function get(table, id) { return must(await db.from(table).select('*').eq('id', id).single(), `${table} fixture read`); }
async function denied(result, code) { assert.equal(result.error?.message, code, `Expected ${code}, received ${result.error?.code || 'success'}`); }
const contract = () => ({ package: 'plus', serviceContract: { version: 2, adoptedAt: new Date().toISOString(), extras: [] } });
const eventDate = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
const snapshot = id => ({ id, slug: `${prefix}-${invitationIds.indexOf(id)}`, template: 'perla', type: 'boda',
  names: 'QA synthetic event', event_date: eventDate, config: contract() });
const version = (id, name, source = 'publish') => ({ id: `${prefix}-${name}`, label: 'Disposable QA version', source,
  snapshot: snapshot(id), created_at: new Date().toISOString() });
const store = (id, versions, action = null, partner = partnerIds[0], notes = []) => db.rpc('enkarta_store_builder_state', {
  p_invitation_id: id, p_partner_id: partner, p_client: false, p_versions: versions, p_notes: notes, p_action: action,
});
const publish = (id, name) => store(id, [version(id, name)], 'publish');
const reference = () => `ENK-${randomBytes(3).toString('hex').toUpperCase()}`;
const intent = (overrides = {}) => db.rpc('enkarta_payment_intent', { p_partner_id: partnerIds[0], p_plan: 'inicio',
  p_months: 1, p_amount: 249, p_method: 'qr', p_reference: reference(), p_provider: 'manual', ...overrides });
const paymentReview = id => db.rpc('enkarta_review_payment', { p_payment_id: id, p_action: 'approve',
  p_note: 'Disposable QA ledger entry; no money moved', p_reviewer: prefix });
async function checkInstallation() {
  const response = await fetch(`${base}/rest/v1/`, { headers: { apikey: service, Authorization: `Bearer ${service}`,
    Accept: 'application/openapi+json' }, signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, 'Service schema unavailable');
  const schema = await response.json();
  const probes = {
    enkarta_assert_publish: { p_id: randomUUID(), p_partner_id: randomUUID() },
    enkarta_store_builder_state: { p_invitation_id: randomUUID(), p_partner_id: randomUUID(), p_client: false, p_versions: [], p_notes: [], p_action: null },
    enkarta_set_publication: { p_id: randomUUID(), p_partner_id: randomUUID(), p_enabled: false },
    enkarta_cancel_schedule: { p_id: randomUUID(), p_version_id: prefix },
    enkarta_version_due: { snapshot: {}, created: new Date().toISOString() },
    enkarta_payment_intent: { p_partner_id: randomUUID(), p_plan: 'inicio', p_months: 1, p_amount: 249, p_method: 'qr', p_reference: reference(), p_provider: 'manual' },
    enkarta_attach_payment_receipt: { p_partner_id: randomUUID(), p_payment_id: randomUUID(), p_path: '', p_note: 'Permission probe' },
    enkarta_review_payment: { p_payment_id: randomUUID(), p_action: 'approve', p_note: '', p_reviewer: prefix },
    enkarta_cancel_payment: { p_partner_id: randomUUID(), p_payment_id: randomUUID() },
  };
  await check('014/015: all nine integrity functions installed', async () => {
    for (const name of Object.keys(probes)) assert.ok(schema.paths?.[`/rpc/${name}`], `Missing function ${name}`);
  });
  await check('014/015: publication, revision and payment columns installed', async () => {
    must(await db.from('invitations').select('publication_managed,published_version_id,scheduled_version_id,draft_revision').limit(0), '014 columns');
    must(await db.from('partner_payments').select('provider,currency,quote_locked_at,provider_reference,provider_transaction_id,reviewed_by').limit(0), '015 columns');
  });
  await check('anonymous cannot read private tables or execute integrity functions', async () => {
    for (const table of ['invitations', 'builder_versions', 'builder_review_notes', 'builder_user_sections', 'partners', 'partner_subscriptions', 'partner_payments']) {
      const result = await anonymous.from(table).select('*').limit(0);
      assert.equal(result.error?.code, '42501', `Unexpected anonymous table access: ${table}`);
    }
    for (const [name, args] of Object.entries(probes)) {
      const result = await anonymous.rpc(name, args);
      assert.equal(result.error?.code, '42501', `Unexpected anonymous RPC access: ${name}`);
    }
  });
  await check('BCP remains disabled and no API key is configured locally', async () => {
    assert.notEqual(process.env.PAYMENT_PROVIDER, 'bcp', 'BCP must remain disabled');
    assert.equal(Boolean(process.env.BCP_API_KEY), false, 'Unexpected bank credential: no bank calls will be made');
  });
}
async function exerciseFlows() {
  fixturesStarted = true;
  report.fixtureScope = { prefix, partnerIds, invitationIds };
  must(await db.from('partners').insert(partnerIds.map((id, index) => ({ id, email: `${prefix}-${index}@example.invalid`, full_name: 'Disposable integrity QA' }))), 'Create QA partners');
  must(await db.from('partner_subscriptions').insert(partnerIds.map(partner_id => ({ partner_id, plan_key: 'inicio', status: 'active',
    current_period_end: new Date(Date.now() + 30 * 86400000).toISOString() }))), 'Create QA subscriptions');
  must(await db.from('invitations').insert(invitationIds.map((id, index) => ({ id, slug: `${prefix}-${index}`, partner_id: partnerIds[index === 4 ? 1 : 0],
    names: 'QA synthetic event', template: 'perla', type: 'boda', status: 'draft', event_date: eventDate, builder_config: contract() }))), 'Create QA invitations');
  const first = invitationIds[0];
  await check('new drafts require an explicit snapshot publication', async () => {
    assert.equal((await get('invitations', first)).publication_managed, true);
    await denied(await store(first, [version(first, 'bypass')], null), 'PUBLICATION_ACTION_REQUIRED');
    assert.equal((await get('invitations', first)).published_version_id, null);
    must(await publish(first, 'public-no-action'), 'Explicit QA publication');
    assert.equal((await get('invitations', first)).published_version_id, `${prefix}-public-no-action`);
  });
  await check('publication retains its anchor after 35 saves and draft edits', async () => {
    const drafts = Array.from({ length: 35 }, (_, i) => ({ ...version(first, `draft-${i}`, 'save'),
      created_at: new Date(Date.now() + i).toISOString() }));
    must(await store(first, drafts.slice(0, 30)), 'First draft batch');
    must(await store(first, drafts.slice(30)), 'Second draft batch');
    const versions = must(await db.from('builder_versions').select('id,source,snapshot').eq('invitation_id', first), 'Read QA history');
    assert.equal(versions.filter(v => v.source !== 'publish').length, 30);
    assert.ok(versions.some(v => v.id === `${prefix}-public-no-action`));
    must(await db.from('invitations').update({ names: 'QA draft edit' }).eq('id', first), 'Edit QA draft');
    assert.equal((await get('builder_versions', `${prefix}-public-no-action`)).snapshot.names, 'QA synthetic event');
    assert.equal((await get('invitations', first)).status, 'ready');
  });
  await check('published snapshot cannot be overwritten or deleted', async () => {
    await denied(await db.from('builder_versions').update({ snapshot: {} }).eq('id', `${prefix}-public-no-action`), 'IMMUTABLE_PUBLICATION');
    await denied(await db.from('builder_versions').delete().eq('id', `${prefix}-public-no-action`), 'ACTIVE_PUBLICATION');
  });
  await check('cross-partner publication and cross-event version/note reassignment denied', async () => {
    await denied(await publish(invitationIds[4], 'foreign-publish'), 'PUBLISH_FORBIDDEN');
    const foreign = version(invitationIds[4], 'foreign-save', 'save');
    must(await store(invitationIds[4], [foreign], null, partnerIds[1]), 'Create QA foreign version');
    await denied(await store(first, [foreign]), 'BUILDER_FORBIDDEN');
    const note = { id: `${prefix}-foreign-note`, text: 'Disposable QA note', author: 'QA', resolved: false, created_at: new Date().toISOString() };
    must(await store(invitationIds[4], [], null, partnerIds[1], [note]), 'Create QA foreign note');
    await denied(await store(first, [], null, partnerIds[0], [note]), 'BUILDER_FORBIDDEN');
  });
  await check('pause closes public operations; resume preserves the snapshot', async () => {
    await rpc('enkarta_set_publication', { p_id: first, p_partner_id: partnerIds[0], p_enabled: false });
    assert.equal((await get('invitations', first)).status, 'disabled');
    await denied(await db.rpc('enkarta_assert_event_open', { p_id: first, p_deadline: false }), 'EVENT_CLOSED');
    await rpc('enkarta_set_publication', { p_id: first, p_partner_id: partnerIds[0], p_enabled: true });
    await rpc('enkarta_assert_event_open', { p_id: first, p_deadline: false });
  });
  await check('future schedule reserves quota without opening its working draft', async () => {
    const scheduled = version(invitationIds[1], 'future');
    scheduled.snapshot.config.__enkartaVersion = { publicationState: 'scheduled', publishAt: new Date(Date.now() + 86400000).toISOString() };
    must(await store(invitationIds[1], [scheduled], 'schedule'), 'Schedule QA publication');
    await denied(await db.rpc('enkarta_assert_event_open', { p_id: invitationIds[1], p_deadline: false }), 'EVENT_CLOSED');
  });
  await check('two concurrent publications compete for one remaining quota slot', async () => {
    const results = await Promise.all([publish(invitationIds[2], 'race-a'), publish(invitationIds[3], 'race-b')]);
    assert.equal(results.filter(result => !result.error).length, 1, 'Exactly one publication must succeed');
    assert.equal(results.find(result => result.error)?.error.message, 'QUOTA_REACHED');
  });
  await check('schedule cancellation removes its reservation and draft revisions reject stale writes', async () => {
    await rpc('enkarta_cancel_schedule', { p_id: invitationIds[1], p_version_id: `${prefix}-future` });
    assert.equal((await get('invitations', invitationIds[1])).status, 'draft');
    const revision = (await get('invitations', first)).draft_revision;
    const one = must(await db.from('invitations').update({ names: 'QA newer draft' }).eq('id', first).eq('draft_revision', revision).select('id'), 'CAS first write');
    const two = must(await db.from('invitations').update({ names: 'QA stale draft' }).eq('id', first).eq('draft_revision', revision).select('id'), 'CAS stale write');
    assert.equal(one.length, 1); assert.equal(two.length, 0);
  });
  await check('simultaneous payment intentions produce one pending ledger entry', async () => {
    const results = await Promise.all([intent(), intent()]);
    const payments = results.map(result => must(result, 'Create QA payment intention'));
    assert.equal(payments[0].id, payments[1].id); report.fixturePaymentId = payments[0].id;
  });
  const paymentId = report.fixturePaymentId;
  await check('receipt preserves grace; quotation freezes; wrong partner cannot attach proof', async () => {
    must(await db.from('partner_subscriptions').update({ current_period_end: new Date(Date.now() - 86400000).toISOString() }).eq('partner_id', partnerIds[0]), 'Set QA grace');
    const before = must(await db.from('partner_subscriptions').select('*').eq('partner_id', partnerIds[0]).single(), 'Read QA grace');
    await rpc('enkarta_attach_payment_receipt', { p_partner_id: partnerIds[0], p_payment_id: paymentId, p_path: '', p_note: 'Synthetic QA only; no transfer made' });
    const after = must(await db.from('partner_subscriptions').select('*').eq('partner_id', partnerIds[0]).single(), 'Read unchanged QA term');
    assert.equal(after.current_period_end, before.current_period_end); assert.equal(after.status, 'active');
    await rpc('enkarta_assert_event_open', { p_id: first, p_deadline: false });
    await denied(await publish(first, 'expired-subscription'), 'SUBSCRIPTION_REQUIRED');
    await denied(await intent({ p_plan: 'agencia', p_amount: 749 }), 'PAYMENT_LOCKED');
    await denied(await db.rpc('enkarta_attach_payment_receipt', { p_partner_id: partnerIds[1], p_payment_id: paymentId, p_path: '', p_note: 'QA' }), 'NOT_FOUND');
  });
  await check('concurrent approvals activate exactly one period and retries are idempotent', async () => {
    const results = (await Promise.all([paymentReview(paymentId), paymentReview(paymentId)])).map(result => must(result, 'Approve synthetic ledger entry'));
    assert.equal(results.filter(result => result.replayed === false).length, 1);
    assert.equal(results.filter(result => result.replayed === true).length, 1);
    assert.equal(results[0].periodEnd, results[1].periodEnd);
    const sub = must(await db.from('partner_subscriptions').select('*').eq('partner_id', partnerIds[0]).single(), 'Read QA activated term');
    const payment = await get('partner_payments', paymentId);
    assert.equal(sub.status, 'active'); assert.equal(sub.current_period_end, payment.period_end);
    assert.equal(new Date(sub.current_period_end).getTime() - new Date(payment.period_start).getTime() >= 28 * 86400000, true);
    assert.equal(new Date(sub.current_period_end).getTime() - new Date(payment.period_start).getTime() <= 31 * 86400000, true);
    assert.equal(must(await paymentReview(paymentId), 'Replay QA approval').replayed, true);
    assert.equal((await get('partner_payments', paymentId)).period_end, payment.period_end);
  });
  await check('manual cancellation preserves evidence and BCP cannot be approved without bank confirmation', async () => {
    const next = must(await intent(), 'New QA payment');
    await rpc('enkarta_cancel_payment', { p_partner_id: partnerIds[0], p_payment_id: next.id });
    assert.equal((await get('partner_payments', next.id)).status, 'canceled');
    // Synthetic ledger record only; no QR generation, API key or bank request.
    const bank = must(await db.from('partner_payments').insert({ partner_id: partnerIds[0], reference: reference(), plan_key: 'inicio', months: 1,
      amount_bs: 249, provider: 'bcp' }).select('id').single(), 'Create isolated unverified QA ledger record');
    await denied(await paymentReview(bank.id), 'BANK_CONFIRMATION_REQUIRED');
    assert.equal((await get('partner_payments', bank.id)).status, 'pending');
  });
}
async function cleanup() {
  if (!fixturesStarted) return;
  // Only exact UUIDs created by this run, additionally checked against our slug.
  const owned = must(await db.from('invitations').select('id,slug').in('id', invitationIds), 'Find this run fixtures');
  assert.ok(owned.every(row => row.slug.startsWith(`${prefix}-`)), 'Fixture cleanup scope mismatch');
  for (const invitation of owned) {
    must(await db.from('invitations').update({ status: 'disabled', published_version_id: null, scheduled_version_id: null }).eq('id', invitation.id).eq('slug', invitation.slug), 'Pause QA fixture');
    must(await db.from('invitations').delete().eq('id', invitation.id).eq('slug', invitation.slug), 'Delete QA fixture');
  }
  for (const id of partnerIds) must(await db.from('partners').delete().eq('id', id).like('email', `${prefix}-%@example.invalid`), 'Delete QA partner and ledger');
  for (const [table, column, ids] of [['invitations', 'id', invitationIds], ['partners', 'id', partnerIds], ['partner_payments', 'partner_id', partnerIds],
    ['builder_versions', 'invitation_id', invitationIds], ['builder_review_notes', 'invitation_id', invitationIds]]) {
    assert.equal(must(await db.from(table).select(column).in(column, ids), 'Verify fixture cleanup').length, 0, `${table} fixture remains`);
  }
  report.cleanup = 'verified-no-fixtures-remain'; console.log('OK: cleanup verified; no fixture records remain');
}
async function main() {
  assert.ok(base && service && anon, 'Supabase configuration missing; secrets are not printed');
  const host = new URL(base).hostname;
  report.databaseHost = host;
  if (exercise) assert.equal(argument('--expect-project'), host.split('.')[0], 'Exercise requires the exact --expect-project reference');
  const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init = {}) => fetch(url, { ...init, signal: AbortSignal.timeout(25000) }) } };
  db = createClient(base, service, options); anonymous = createClient(base, anon, options);
  try { await checkInstallation(); if (exercise) await exerciseFlows(); }
  finally { await cleanup(); }
}
main().catch(error => { report.failure = error.message; console.error(`FAIL: ${error.message}`); process.exitCode = 1; }).finally(() => {
  if (reportFile) { const output = path.resolve(reportFile); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); }
});
