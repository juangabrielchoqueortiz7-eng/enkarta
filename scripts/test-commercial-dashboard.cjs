// Real PostgreSQL in memory. No network, credentials or production data.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'migrations/020_commercial_dashboard_pagination.sql'), 'utf8');
const signature = 'public.enkarta_commercial_dashboard(text,integer,timestamptz,timestamptz,uuid,jsonb)';
const snapshotKeys = ['id','reference','status','package_key','design','event_category','placement','utm_source','utm_medium',
  'utm_campaign','referrer_host','revenue_bs','notes','created_at','updated_at','revision'].sort();
let asOf;
const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.result;
const call = (changes = {}) => {
  const input = { status: 'all', size: 25, asOf, afterCreatedAt: null, afterId: null, labels: { azure: 'Lunaria' }, ...changes };
  return scalar('SELECT public.enkarta_commercial_dashboard($1::text,$2::integer,$3::timestamptz,$4::timestamptz,$5::uuid,$6::jsonb) AS result',
    [input.status, input.size, input.asOf, input.afterCreatedAt, input.afterId, JSON.stringify(input.labels)]);
};
const asRole = async (role, work) => {
  assert.ok(['anon','authenticated','service_role'].includes(role));
  await db.exec(`SET ROLE ${role}`);
  try { return await work(); } finally { await db.exec('RESET ROLE'); }
};
const seedLeads = async (count, sameTime = false) => db.query(`
  INSERT INTO public.commercial_leads(id,reference,session_hash,status,package_key,design,event_category,
    utm_source,utm_campaign,revenue_bs,notes,created_at,updated_at)
  SELECT ('10000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'EK-'||upper(lpad(to_hex(i),8,'0')),repeat('a',64),
    (ARRAY['whatsapp_open','contacted','reserved','won','lost'])[(i%5)+1],
    (ARRAY['general','plus','premium','exclusive'])[(i%4)+1],CASE WHEN i%2=0 THEN 'azure' ELSE 'Lunaria' END,
    'Boda','source-'||(i%10),'campaign-'||(i%10),CASE WHEN i%5=3 THEN 10.01 ELSE 999.99 END,'QA ficticio',
    $2::timestamptz-CASE WHEN $3::boolean THEN interval '1 second' ELSE i*interval '1 second' END,
    $2::timestamptz-interval '1 second'
  FROM generate_series(1,$1::integer) i`, [count, asOf, sameTime]);
const allPages = async (changes = {}) => {
  let page = await call(changes);
  const rows = [...page.leads];
  let pages = 1;
  while (page.pagination.hasMore) {
    assert.ok(pages++ < 100, 'pagination terminates');
    const previous = page;
    page = await call({ ...changes, asOf: page.asOf, afterCreatedAt: page.pagination.next.createdAt, afterId: page.pagination.next.id });
    assert.equal(page.asOf, previous.asOf);
    assert.equal(page.pagination.total, previous.pagination.total);
    rows.push(...page.leads);
  }
  assert.equal(page.pagination.next, null);
  return { rows, pages, last: page };
};

before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS 'SELECT gen_random_uuid()';
    GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;`);
  for (const file of ['012_commercial_funnel.sql','019_commercial_lead_updates.sql']) {
    await db.exec(fs.readFileSync(path.join(root, 'migrations', file), 'utf8'));
  }
  await db.exec(migration);
  await db.exec(migration);
  asOf = await scalar(`SELECT to_char((statement_timestamp()-interval '1 hour') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS result`);
});
after(() => db.close());
beforeEach(async () => db.exec('TRUNCATE public.commercial_events,public.commercial_leads CASCADE;'));

test('020 is reappliable and readiness checks private invoker function and both page indexes', async () => {
  const ready = await db.query(migration.slice(migration.lastIndexOf('\nSELECT ') + 1));
  assert.equal(ready.rows[0].commercial_dashboard_pagination_ready, true);
  assert.equal(await scalar('SELECT prosecdef AS result FROM pg_proc WHERE oid=$1::regprocedure', [signature]), false);
  const indexes = (await db.query(`SELECT indexdef FROM pg_indexes WHERE indexname IN ('commercial_leads_created_page','commercial_leads_status_created_page') ORDER BY indexname`)).rows;
  assert.match(indexes[0].indexdef, /\(created_at DESC, id DESC\)/);
  assert.match(indexes[1].indexdef, /\(status, created_at DESC, id DESC\)/);
});

test('real anon/authenticated roles cannot execute or select; service_role can read', async () => {
  for (const role of ['anon','authenticated']) {
    assert.equal(await scalar("SELECT has_function_privilege($1,$2,'EXECUTE') AS result", [role, signature]), false);
    await assert.rejects(asRole(role, () => call()), /permission denied/);
    await assert.rejects(asRole(role, () => db.query('SELECT * FROM public.commercial_leads')), /permission denied/);
  }
  assert.equal((await asRole('service_role', () => call())).pagination.total, 0);
});

test('empty dashboard returns canonical zero metrics, five statuses and no continuation', async () => {
  const value = await call();
  assert.equal(value.periodDays, 180);
  assert.equal(value.asOf, asOf);
  assert.match(value.syncedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
  assert.deepEqual(value.summary, { visits: 0,landingViews: 0,designViews: 0,processViews: 0,whatsappOpens: 0,
    contacts: 0,reserved: 0,sales: 0,revenue: 0,intentRate: 0,conversationRate: 0,closeRate: 0 });
  assert.deepEqual(value.pagination, { size: 25,total: 0,hasMore: false,next: null });
  assert.deepEqual(value.leads, []);
  for (const key of ['sources','campaigns','packages','events','designs']) assert.deepEqual(value[key], []);
  assert.deepEqual(value.statuses.map(item => item.status), ['whatsapp_open','contacted','reserved','won','lost']);
  assert.ok(value.statuses.every(item => item.value === 0));
});

test('complete aggregates exceed 1000 leads and 10000 events without truncating totals or money', async () => {
  await seedLeads(1255);
  await db.query(`INSERT INTO public.commercial_events(session_hash,event_type,occurred_at)
    SELECT lpad(to_hex(i%1501),64,'0'),(ARRAY['landing_view','design_view','process_view','whatsapp_open'])[(i%4)+1],
      $1::timestamptz-interval '1 second' FROM generate_series(1,10055) i`, [asOf]);
  const value = await asRole('service_role', () => call());
  assert.deepEqual(value.summary, { visits: 1501,landingViews: 1501,designViews: 1501,processViews: 1501,
    whatsappOpens: 1255,contacts: 1004,reserved: 502,sales: 251,revenue: 2512.51,intentRate: 84,conversationRate: 80,closeRate: 25 });
  assert.equal(value.pagination.total, 1255);
  assert.equal(value.leads.length, 25);
  assert.ok(value.pagination.hasMore);
  assert.ok(value.statuses.every(item => item.value === 251));
  assert.deepEqual(value.designs, [{ label: 'Lunaria',opens: 1255,contacts: 1004,sales: 251 }]);
  assert.equal(value.sources.length, 8);
  assert.equal(value.sources[0].opens, 126);
  assert.equal(value.packages.reduce((sum,item) => sum+item.opens,0), 1255);
  assert.equal(value.events[0].opens, 1255);
  const paginated = await allPages();
  assert.equal(paginated.rows.length, 1255);
  assert.equal(new Set(paginated.rows.map(row => row.id)).size, 1255);
  assert.equal(paginated.pages, 51);
  assert.equal(paginated.last.leads.length, 5);
});

test('all keyset pages contain each contact exactly once with stable descending UUID ties', async () => {
  await seedLeads(77, true);
  const expected = (await db.query('SELECT id FROM public.commercial_leads ORDER BY created_at DESC,id DESC')).rows.map(row => row.id);
  const { rows, pages, last } = await allPages();
  assert.equal(pages, 4);
  assert.deepEqual(rows.map(row => row.id), expected);
  assert.equal(new Set(rows.map(row => row.id)).size, 77);
  assert.equal(last.leads.length, 2);
  for (const lead of rows) {
    assert.deepEqual(Object.keys(lead).sort(), snapshotKeys);
    assert.equal(lead.revision, 0);
    assert.match(lead.created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
    assert.match(lead.updated_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
    assert.equal('session_hash' in lead, false);
    assert.equal('landing_path' in lead, false);
  }
});

test('microsecond cursor boundaries preserve timestamps and never round contacts out of a page', async () => {
  await seedLeads(27, true);
  await db.query(`UPDATE public.commercial_leads SET created_at=date_trunc('second',$1::timestamptz)-interval '1 second'
    +right(id::text,2)::integer*interval '1 microsecond'`, [asOf]);
  const first = await call();
  assert.match(first.pagination.next.createdAt, /\.000003Z$/);
  const next = await call({ afterCreatedAt: first.pagination.next.createdAt, afterId: first.pagination.next.id });
  assert.equal(next.leads.length, 2);
  assert.match(next.leads[0].created_at, /\.000002Z$/);
  assert.match(next.leads[1].created_at, /\.000001Z$/);
  assert.equal(next.leads[0].id.endsWith('000000000002'), true);
  assert.equal(next.leads[1].id.endsWith('000000000001'), true);
  assert.equal(next.pagination.hasMore, false);
});

test('exact page size 25 has no continuation; 26 has one final row', async () => {
  await seedLeads(25);
  assert.deepEqual((await call()).pagination, { size: 25,total: 25,hasMore: false,next: null });
  await db.query(`INSERT INTO public.commercial_leads(reference,session_hash,created_at) VALUES('EK-ABCD0026',repeat('c',64),$1::timestamptz-interval '26 seconds')`, [asOf]);
  const first = await call();
  assert.equal(first.pagination.hasMore, true);
  const next = await call({ afterCreatedAt: first.pagination.next.createdAt, afterId: first.pagination.next.id });
  assert.equal(next.leads.length, 1);
  assert.equal(next.pagination.hasMore, false);
});

test('status filters change only rows and exact filtered total, never global summaries or breakdowns', async () => {
  await seedLeads(155, true);
  const baseline = await call();
  for (const status of ['whatsapp_open','contacted','reserved','won','lost']) {
    const value = await call({ status });
    assert.equal(value.pagination.total, 31);
    assert.equal(value.leads.length, 25);
    assert.ok(value.leads.every(lead => lead.status === status));
    for (const key of ['summary','statuses','sources','campaigns','packages','events','designs']) assert.deepEqual(value[key], baseline[key]);
    const { rows, pages } = await allPages({ status });
    assert.equal(pages, 2);
    assert.equal(rows.length, 31);
  }
});

test('inclusive 180-day UTC boundaries exclude older and future records independent of timezone', async () => {
  await db.query(`INSERT INTO public.commercial_leads(reference,session_hash,created_at,status,revenue_bs)
    SELECT 'EK-'||upper(lpad(to_hex(i),8,'0')),repeat('a',64),$1::timestamptz+time_offset, 'won',1.01
    FROM (VALUES (1,-interval '4320 hours'),(2,interval '0 seconds'),(3,-interval '4320 hours 1 microsecond'),(4,interval '1 microsecond')) v(i,time_offset)`, [asOf]);
  await db.query(`INSERT INTO public.commercial_events(session_hash,event_type,occurred_at)
    SELECT lpad(to_hex(i),64,'0'),'landing_view',created_at FROM (SELECT row_number() OVER() AS i,created_at FROM public.commercial_leads) t`);
  const utc = await call();
  await db.exec("SET TIME ZONE 'America/New_York'");
  let local;
  try { local = await call(); } finally { await db.exec("SET TIME ZONE 'UTC'"); }
  assert.equal(utc.pagination.total, 2);
  assert.equal(utc.summary.visits, 2);
  assert.equal(utc.summary.revenue, 2.02);
  assert.equal(local.asOf, utc.asOf);
  assert.deepEqual(local.summary, utc.summary);
  assert.deepEqual(local.leads, utc.leads);
});

test('asOf excludes new arrivals on subsequent pages while reading current statuses', async () => {
  await seedLeads(40);
  const first = await call();
  await db.query(`INSERT INTO public.commercial_leads(reference,session_hash,created_at,status)
    VALUES('EK-FF000001',repeat('b',64),$1::timestamptz+interval '1 second','won')`, [asOf]);
  await db.query(`UPDATE public.commercial_leads SET status='won' WHERE id='10000000-0000-4000-8000-000000000040'`);
  const next = await call({ afterCreatedAt: first.pagination.next.createdAt, afterId: first.pagination.next.id });
  assert.equal(next.pagination.total, 40);
  assert.equal(next.leads.some(row => row.reference === 'EK-FF000001'), false);
  assert.equal(next.leads.find(row => row.id.endsWith('000000000040')).status, 'won');
  assert.equal(next.summary.sales, first.summary.sales+1);
});

test('top eight tie ordering is deterministic and defaults, aliases and package names are explicit', async () => {
  await seedLeads(10);
  await db.exec(`UPDATE public.commercial_leads SET utm_source='',utm_campaign='',event_category='',design='',referrer_host='';`);
  const defaults = await call();
  assert.equal(defaults.sources[0].label, 'Directo');
  assert.equal(defaults.campaigns[0].label, 'Sin campaña');
  assert.equal(defaults.events[0].label, 'Sin categoría');
  assert.equal(defaults.designs[0].label, 'Sin diseño');
  assert.deepEqual(defaults.packages.map(item => item.label).sort(), ['Exclusive','Plus','Premium','Sin paquete']);
  await db.exec(`UPDATE public.commercial_leads SET utm_source='z-'||right(reference,2);`);
  const tied = await call();
  assert.equal(tied.sources.length, 8);
  assert.deepEqual(tied.sources.map(item => item.label), ['z-01','z-02','z-03','z-04','z-05','z-06','z-07','z-08']);
  await db.exec(`UPDATE public.commercial_leads SET design=CASE WHEN right(reference,1) IN ('1','2','3','4','5') THEN 'azure' ELSE 'Lunaria' END;`);
  assert.equal((await call()).designs.length, 1);
  assert.equal((await call({ labels: {} })).designs.length, 2);
});

test('view metrics deduplicate across types and exclude whatsapp-only sessions', async () => {
  await db.query(`INSERT INTO public.commercial_events(session_hash,event_type,occurred_at)
    SELECT repeat(session,64),type,$1::timestamptz FROM (VALUES
      ('a','landing_view'),('a','landing_view'),('a','design_view'),('a','process_view'),
      ('b','design_view'),('c','process_view'),('d','whatsapp_open')) events(session,type)`, [asOf]);
  const value = await call();
  assert.equal(value.summary.visits, 3);
  assert.equal(value.summary.landingViews, 1);
  assert.equal(value.summary.designViews, 2);
  assert.equal(value.summary.processViews, 2);
  assert.equal(value.summary.whatsappOpens, 0);
});

test('caller cannot weaken input limits, forge half cursors or malformed aliases', async () => {
  const before = await call();
  for (const changes of [{ status: null },{ status: 'paid' },{ size: 26 },{ size: null },{ asOf: 'infinity' },{ asOf: '-infinity' },
    { asOf: '1999-12-31T23:59:59Z' },{ asOf: '2099-01-01T00:00:00Z' },{ afterCreatedAt: asOf },
    { afterId: '10000000-0000-4000-8000-000000000001' },
    { afterCreatedAt: 'infinity',afterId: '10000000-0000-4000-8000-000000000001' },
    { afterCreatedAt: '2000-01-01T00:00:00Z',afterId: '10000000-0000-4000-8000-000000000001' },
    { labels: null },{ labels: [] },{ labels: { a: {} } },{ labels: { a: 3 } },{ labels: { a: 'x'.repeat(81) } },
    { labels: { ['x'.repeat(81)]: 'a' } },{ labels: { a: 'bad\u0000label' } },
    { labels: Object.fromEntries(Array.from({ length: 257 },(_,i) => [`key-${i}`,'value'])) }]) {
    await assert.rejects(call(changes), /INVALID_INPUT|unsupported Unicode escape sequence/);
  }
  assert.equal((await call()).pagination.total, before.pagination.total);
});

test('read calls and migration reapplication preserve every contact, revision, event and history receipt', async () => {
  await seedLeads(3);
  await scalar(`SELECT public.enkarta_update_commercial_lead('10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',0,'won',12.34,'QA nota') AS result`);
  const snapshot = async () => scalar(`SELECT jsonb_build_object(
    'leads',(SELECT jsonb_agg(to_jsonb(l) ORDER BY id) FROM public.commercial_leads l),
    'history',(SELECT jsonb_agg(to_jsonb(h) ORDER BY id) FROM public.commercial_lead_history h),
    'requests',(SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public.commercial_lead_update_requests r),
    'events',(SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM public.commercial_events e)) AS result`);
  const original = await snapshot();
  const value = await call();
  assert.equal(value.leads.find(row => row.id.endsWith('000000000001')).revision, 1);
  await call({ status: 'won' });
  await db.exec(migration);
  assert.deepEqual(await snapshot(), original);
  assert.equal((await call()).summary.revenue, 22.35);
});
