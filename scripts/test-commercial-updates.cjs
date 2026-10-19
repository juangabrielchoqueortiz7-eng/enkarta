// Real PostgreSQL (PGlite), isolated in memory: no credentials or network.
// PGlite serializes one connection. Promise.all covers queued competing intents
// and replays; it does not certify locks across independent PostgreSQL sessions.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'migrations/019_commercial_lead_updates.sql'), 'utf8');
const leadId = '10000000-0000-4000-8000-000000000019';
const otherId = '20000000-0000-4000-8000-000000000019';
const rpcSignature = 'public.enkarta_update_commercial_lead(uuid,uuid,integer,text,numeric,text)';
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.result;
const call = (changes = {}) => {
  const input = { leadId, requestId: randomUUID(), expectedRevision: 0, status: 'contacted', revenueBs: 930, notes: 'QA seguimiento ficticio', ...changes };
  return scalar('SELECT public.enkarta_update_commercial_lead($1::uuid,$2::uuid,$3::integer,$4::text,$5::numeric,$6::text) AS result',
    [input.leadId, input.requestId, input.expectedRevision, input.status, input.revenueBs, input.notes]);
};
const counts = () => scalar(`SELECT jsonb_build_object('history',(SELECT count(*) FROM public.commercial_lead_history),
  'requests',(SELECT count(*) FROM public.commercial_lead_update_requests)) AS result`);
const readLead = (id = leadId) => scalar('SELECT to_jsonb(l) AS result FROM public.commercial_leads l WHERE id=$1', [id]);
const asRole = async (role, work) => {
  assert.ok(['anon', 'authenticated', 'service_role'].includes(role));
  await db.exec(`SET ROLE ${role}`);
  try { return await work(); } finally { await db.exec('RESET ROLE'); }
};

before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS 'SELECT gen_random_uuid()';
    GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;`);
  await db.exec(fs.readFileSync(path.join(root, 'migrations/012_commercial_funnel.sql'), 'utf8'));
  await db.exec(migration);
  await db.exec(migration);
});
after(() => db.close());
beforeEach(async () => {
  await db.exec('TRUNCATE public.commercial_leads CASCADE;');
  await db.query(`INSERT INTO public.commercial_leads(id,reference,session_hash,design,utm_content,landing_path)
    VALUES($1,'EK-AABB0019',repeat('a',64),'Lunaria','private-content','/private-origin'),
      ($2,'EK-CCDD0019',repeat('b',64),'Otro diseño','private-content-other','/other-private-origin')`, [leadId, otherId]);
});

test('019 is reappliable and its readiness query checks the live schema', async () => {
  const result = await db.query(migration.slice(migration.lastIndexOf('\nSELECT ') + 1));
  assert.equal(result.rows[0].commercial_lead_updates_ready, true);
  assert.equal((await readLead()).revision, 0);
});

test('commercial update tables and functions deny PUBLIC, anon and authenticated', async () => {
  for (const role of ['anon', 'authenticated']) {
    for (const table of ['commercial_leads', 'commercial_lead_history', 'commercial_lead_update_requests']) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        assert.equal(await scalar('SELECT has_table_privilege($1,$2,$3) AS result', [role, `public.${table}`, privilege]), false);
      }
    }
    for (const fn of [rpcSignature, 'public.enkarta_guard_commercial_lead_revision()', 'public.enkarta_commercial_lead_snapshot(public.commercial_leads)']) {
      assert.equal(await scalar('SELECT has_function_privilege($1,$2,\'EXECUTE\') AS result', [role, fn]), false);
    }
    await assert.rejects(asRole(role, () => call()), /permission denied/);
    await assert.rejects(asRole(role, () => db.query('SELECT * FROM public.commercial_lead_update_requests')), /permission denied/);
  }
  assert.equal(await scalar('SELECT prosecdef AS result FROM pg_proc WHERE oid=$1::regprocedure', [rpcSignature]), false);
  assert.equal((await asRole('service_role', () => call())).outcome, 'saved');
});

test('a saved update atomically records a whitelisted receipt, history and revision', async () => {
  const requestId = randomUUID();
  const result = await call({ requestId });
  assert.equal(result.outcome, 'saved');
  assert.equal(result.requestId, requestId);
  assert.equal(result.lead.revision, 1);
  assert.equal(result.lead.status, 'contacted');
  assert.equal(result.lead.revenue_bs, 930);
  assert.equal(result.lead.notes, 'QA seguimiento ficticio');
  assert.deepEqual(Object.keys(result.lead).sort(), ['id','reference','status','package_key','design','event_category','placement',
    'utm_source','utm_medium','utm_campaign','referrer_host','revenue_bs','notes','created_at','updated_at','revision'].sort());
  const history = (await db.query('SELECT from_status,to_status,revenue_bs,note FROM public.commercial_lead_history')).rows;
  assert.deepEqual(history, [{ from_status: 'whatsapp_open', to_status: 'contacted', revenue_bs: '930.00', note: 'QA seguimiento ficticio' }]);
  const receipt = await scalar('SELECT result AS result FROM public.commercial_lead_update_requests WHERE request_id=$1', [requestId]);
  assert.deepEqual(receipt, result);
  assert.equal(JSON.stringify(receipt).includes('private-origin'), false);
  assert.equal((await readLead()).session_hash, 'a'.repeat(64));
  assert.deepEqual(await counts(), { history: 1, requests: 1 });
});

test('an unchanged intent records its receipt without moving revision, timestamp or history', async () => {
  const beforeLead = await readLead();
  const requestId = randomUUID();
  const result = await call({ requestId, status: 'whatsapp_open', revenueBs: null, notes: '' });
  assert.equal(result.outcome, 'unchanged');
  assert.equal(result.lead.revision, 0);
  assert.equal(result.lead.updated_at, beforeLead.updated_at);
  assert.deepEqual(await readLead(), beforeLead);
  assert.deepEqual(await counts(), { history: 0, requests: 1 });
  assert.equal((await call({ requestId, status: 'whatsapp_open', revenueBs: null, notes: '' })).outcome, 'replayed');
});

test('clearing revenue and notes creates history even when status stays the same', async () => {
  await call();
  const result = await call({ expectedRevision: 1, revenueBs: null, notes: '' });
  assert.equal(result.lead.revision, 2);
  const history = (await db.query('SELECT from_status,to_status,revenue_bs,note FROM public.commercial_lead_history ORDER BY created_at,id')).rows;
  assert.equal(history.length, 2);
  assert.deepEqual(history[1], { from_status: 'contacted', to_status: 'contacted', revenue_bs: null, note: '' });
});

test('stale and future revisions return current state without a receipt or history', async () => {
  const saved = await call();
  for (const expectedRevision of [0, 2]) {
    const result = await call({ expectedRevision, status: 'won' });
    assert.equal(result.outcome, 'conflict');
    assert.deepEqual(result.lead, saved.lead);
  }
  assert.deepEqual(await counts(), { history: 1, requests: 1 });
});

test('a missing contact returns not_found without retaining a request', async () => {
  const result = await call({ leadId: randomUUID() });
  assert.equal(result.outcome, 'not_found');
  assert.equal(result.lead, null);
  assert.deepEqual(await counts(), { history: 0, requests: 0 });
});

test('retry after an uncertain response returns the original receipt before checking revision', async () => {
  const requestId = randomUUID();
  const saved = await call({ requestId });
  await call({ expectedRevision: 1, status: 'won', notes: 'Segundo cambio confirmado' });
  const replay = await call({ requestId });
  assert.equal(replay.outcome, 'replayed');
  assert.deepEqual(replay.lead, saved.lead);
  assert.equal((await readLead()).status, 'won');
  assert.equal((await readLead()).revision, 2);
  assert.deepEqual(await counts(), { history: 2, requests: 2 });
});

test('reusing a request with any different argument returns request_conflict', async () => {
  const requestId = randomUUID();
  const saved = await call({ requestId });
  for (const changes of [{ leadId: otherId }, { expectedRevision: 1 }, { status: 'won' }, { revenueBs: 931 }, { notes: 'Otra nota' }]) {
    const result = await call({ requestId, ...changes });
    assert.deepEqual(result, { outcome: 'request_conflict', requestId, lead: null });
  }
  assert.equal((await call({ requestId })).outcome, 'replayed');
  assert.equal((await readLead()).revision, saved.lead.revision);
  assert.equal((await readLead(otherId)).revision, 0);
  assert.deepEqual(await counts(), { history: 1, requests: 1 });
});

test('numeric canonical payload treats equivalent decimal representations as the same intent', async () => {
  const requestId = randomUUID();
  await call({ requestId, revenueBs: '930.00' });
  assert.equal((await call({ requestId, revenueBs: '930.0' })).outcome, 'replayed');
  assert.equal((await call({ requestId, revenueBs: '930' })).outcome, 'replayed');
  assert.deepEqual(await counts(), { history: 1, requests: 1 });
});

test('amount validation rejects negatives, over-limit values, excess precision and non-finite numerics', async () => {
  for (const revenueBs of ['-0.01', '1000000.01', '1.001', 'NaN', 'Infinity', '-Infinity']) {
    await assert.rejects(call({ revenueBs }), /INVALID_INPUT/);
  }
  assert.deepEqual(await counts(), { history: 0, requests: 0 });
  assert.equal((await call({ revenueBs: '0.01' })).lead.revenue_bs, 0.01);
  assert.equal((await call({ expectedRevision: 1, revenueBs: 1000000 })).lead.revenue_bs, 1000000);
});

test('invalid request fields reject the whole operation without truncating notes', async () => {
  for (const changes of [{ leadId: null }, { requestId: null }, { expectedRevision: null }, { expectedRevision: -1 },
    { status: null }, { status: 'paid' }, { notes: null }, { notes: 'x'.repeat(1001) }]) {
    await assert.rejects(call(changes), /INVALID_INPUT/);
  }
  assert.equal((await readLead()).revision, 0);
  assert.deepEqual(await counts(), { history: 0, requests: 0 });
  assert.equal((await call({ notes: 'x'.repeat(1000) })).lead.notes.length, 1000);
});

test('failure writing history rolls back the contact, revision and receipt', async () => {
  const original = await readLead();
  await db.exec(`CREATE FUNCTION public.qa_reject_history() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'QA_HISTORY_FAILURE'; END; $$;
    CREATE TRIGGER qa_reject_history BEFORE INSERT ON public.commercial_lead_history FOR EACH ROW EXECUTE FUNCTION public.qa_reject_history();`);
  try { await assert.rejects(call(), /QA_HISTORY_FAILURE/); }
  finally { await db.exec('DROP TRIGGER qa_reject_history ON public.commercial_lead_history; DROP FUNCTION public.qa_reject_history();'); }
  assert.deepEqual(await readLead(), original);
  assert.deepEqual(await counts(), { history: 0, requests: 0 });
});

test('failure writing the receipt rolls back both contact and history', async () => {
  const original = await readLead();
  await db.exec(`CREATE FUNCTION public.qa_reject_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'QA_RECEIPT_FAILURE'; END; $$;
    CREATE TRIGGER qa_reject_receipt BEFORE INSERT ON public.commercial_lead_update_requests FOR EACH ROW EXECUTE FUNCTION public.qa_reject_receipt();`);
  try { await assert.rejects(call(), /QA_RECEIPT_FAILURE/); }
  finally { await db.exec('DROP TRIGGER qa_reject_receipt ON public.commercial_lead_update_requests; DROP FUNCTION public.qa_reject_receipt();'); }
  assert.deepEqual(await readLead(), original);
  assert.deepEqual(await counts(), { history: 0, requests: 0 });
});

test('queued duplicate requests apply once and replay once', async () => {
  const requestId = randomUUID();
  const results = await Promise.all([call({ requestId }), call({ requestId })]);
  assert.deepEqual(results.map(result => result.outcome).sort(), ['replayed', 'saved']);
  assert.deepEqual(results[0].lead, results[1].lead);
  assert.equal((await readLead()).revision, 1);
  assert.deepEqual(await counts(), { history: 1, requests: 1 });
});

test('queued competing edits at one revision save one and conflict one', async () => {
  const results = await Promise.all([call({ notes: 'Edición A' }), call({ notes: 'Edición B' })]);
  assert.deepEqual(results.map(result => result.outcome).sort(), ['conflict', 'saved']);
  assert.deepEqual(results[0].lead, results[1].lead);
  assert.equal((await readLead()).revision, 1);
  assert.deepEqual(await counts(), { history: 1, requests: 1 });
});

test('legacy edits advance revision and monotonic time without changing prior receipts', async () => {
  const requestId = randomUUID();
  const saved = await call({ requestId });
  await db.query(`UPDATE public.commercial_leads SET status='reserved',updated_at='2000-01-01',revision=0 WHERE id=$1`, [leadId]);
  const updated = await readLead();
  assert.equal(updated.revision, 2);
  assert.ok(updated.updated_at > saved.lead.updated_at);
  assert.equal((await call({ expectedRevision: 1, status: 'won' })).outcome, 'conflict');
  assert.deepEqual((await call({ requestId })).lead, saved.lead);
  await db.query(`UPDATE public.commercial_leads SET revision=500,utm_content='changed metadata' WHERE id=$1`, [leadId]);
  assert.equal((await readLead()).revision, 2);
  assert.deepEqual(await counts(), { history: 1, requests: 1 });
});

test('reapplying 019 preserves existing leads, history, request receipts and effective revision', async () => {
  const requestId = randomUUID();
  const saved = await call({ requestId });
  const original = await readLead();
  const history = (await db.query('SELECT to_jsonb(h) AS result FROM public.commercial_lead_history h')).rows;
  const requests = (await db.query('SELECT to_jsonb(r) AS result FROM public.commercial_lead_update_requests r')).rows;
  await db.exec(migration);
  assert.deepEqual(await readLead(), original);
  assert.deepEqual((await db.query('SELECT to_jsonb(h) AS result FROM public.commercial_lead_history h')).rows, history);
  assert.deepEqual((await db.query('SELECT to_jsonb(r) AS result FROM public.commercial_lead_update_requests r')).rows, requests);
  assert.deepEqual((await call({ requestId })).lead, saved.lead);
  assert.equal((await call({ expectedRevision: 1, status: 'reserved' })).lead.revision, 2);
});

test('deleting a synthetic contact cascades its receipts and history without touching another contact', async () => {
  await call();
  await db.query('DELETE FROM public.commercial_leads WHERE id=$1', [leadId]);
  assert.equal(await readLead(), undefined);
  assert.deepEqual(await counts(), { history: 0, requests: 0 });
  assert.equal((await readLead(otherId)).reference, 'EK-CCDD0019');
});
