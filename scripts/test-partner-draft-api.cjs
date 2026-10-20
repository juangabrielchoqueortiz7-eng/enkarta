// Real POST handlers and PostgreSQL trigger in isolated PGlite. This suite does
// not certify concurrent sessions: test-partner-draft-concurrency.cjs does that.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict'), ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..'), db = new PGlite(), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { if (request === 'server-only') return path.join(__dirname, 'server-only.stub'); return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, file);
const replace = (file, exports) => { require.cache[require.resolve(file)] = { exports }; }, source = file => path.join(root, 'src', file);
replace('server-only', {});
const owner = '20000000-0000-4000-8000-000000000001', otherOwner = '20000000-0000-4000-8000-000000000002';
let actor = 'partner', activeOwner = owner, staleContext = null, beforeInsert = null, insertFailure = null, insertCalls = 0;
const scalar = async (sql, values = []) => (await db.query(sql, values)).rows[0]?.result;
const count = (partner = owner) => scalar('SELECT count(*)::int AS result FROM invitations WHERE partner_id=$1', [partner]);
const wire = row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? (['event_date', 'expires_at', 'rsvp_deadline'].includes(key) ? value.toISOString().slice(0, 10) : value.toISOString()) : value]));
const { subscriptionState, planQuota } = require(source('lib/partner-plans.ts'));
async function context() {
  if (staleContext) return staleContext;
  const partner = (await db.query('SELECT * FROM partners WHERE id=$1', [activeOwner])).rows[0];
  const subscription = subscriptionState(await scalar('SELECT to_jsonb(s) AS result FROM partner_subscriptions s WHERE partner_id=$1', [activeOwner]));
  return { partner, subscription, quota: planQuota(subscription.plan, 0), totalInvitations: await count(activeOwner) };
}
function queryClient(table) {
  assert.equal(table, 'invitations'); let columns = '*', operation = 'read', payload, filters = [], ordering = '', limit = '';
  const query = {
    select(value = '*') { columns = value; return this; }, insert(value) { operation = 'insert'; payload = value; return this; },
    eq(key, value) { assert.match(key, /^[a-z_]+$/); filters.push([key, value]); return this; },
    order(key, options = {}) { assert.match(key, /^[a-z_]+$/); ordering = ` ORDER BY ${key} ${options.ascending === false ? 'DESC' : 'ASC'}`; return this; },
    limit(value) { assert.ok(Number.isInteger(value)); limit = ' LIMIT ' + value; return this; }, single() { this.one = true; return this; }, maybeSingle() { this.one = true; return this; },
    async then(done) {
      try {
        let values = [], sql;
        if (operation === 'insert') {
          insertCalls++; if (beforeInsert) { const hook = beforeInsert; beforeInsert = null; await hook(); }
          if (insertFailure) return done({ data: null, error: insertFailure });
          const keys = Object.keys(payload); assert.ok(keys.every(key => /^[a-z_]+$/.test(key)));
          values = Object.values(payload); sql = `INSERT INTO invitations(${keys.join(',')}) VALUES(${keys.map((_, index) => '$' + (index + 1)).join(',')}) RETURNING ${columns}`;
        } else { values = filters.map(([, value]) => value); sql = `SELECT ${columns} FROM invitations${filters.length ? ' WHERE ' + filters.map(([key], index) => key + '=$' + (index + 1)).join(' AND ') : ''}${ordering}${limit}`; }
        const rows = (await db.query(sql, values)).rows.map(wire); return done({ data: this.one ? rows[0] ?? null : rows, error: null });
      } catch (error) { return done({ data: null, error: { code: error.code, message: error.message, details: error.detail } }); }
    },
  }; return query;
}
replace(source('lib/supabase/server.ts'), { supabaseAdmin: { from: queryClient } });
replace(source('lib/partner-session.ts'), {
  getPartnerContext: async () => actor === 'partner' ? context() : null, partnerContextFor: context,
  getBuilderActor: async () => actor === 'admin' ? { kind: 'admin' } : actor === 'partner' ? { kind: 'partner', partnerId: activeOwner, context: await context() } : null,
  partnerOwnsInvitation: async () => false,
  packageForPlan: plan => ({ inicio: 'plus', estudio: 'premium', agencia: 'exclusive' })[plan],
  publishBlockReason: () => null,
});
replace(source('lib/host-session.ts'), { getAdminSession: async () => actor === 'admin', canManageInvitation: async () => false });
const partnerRoute = require(source('app/api/partner/invitations/route.ts')), adminRoute = require(source('app/api/admin/invitations/route.ts'));
const { NextRequest } = require('next/server'), { STARTER_TEMPLATE_KEYS } = require(source('lib/template-starters.ts')), { newServiceContract } = require(source('lib/packages.ts'));
const template = STARTER_TEMPLATE_KEYS[0], request = body => new NextRequest('http://qa.invalid/api/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const adminBody = (patch = {}) => ({ slug: 'qa-admin-' + crypto.randomUUID(), names: 'QA draft', status: 'draft', template: 'perla', type: 'boda', builder_config: newServiceContract({}, 'plus'), ...patch });
const create = (route = 'partner', patch = {}) => route === 'partner' ? partnerRoute.POST(request({ template, ...patch })) : adminRoute.POST(request(adminBody(patch)));
async function seed(amount, partner = owner, packageKey = 'plus') {
  await db.query(`INSERT INTO invitations(slug,partner_id,builder_config,names) SELECT 'qa-seed-'||$1||'-'||n,$2,$3,'QA seed' FROM generate_series(1,$4::int)n`, [crypto.randomUUID(), partner, { package: packageKey }, amount]);
}
const migrationFile = () => fs.readdirSync(path.join(root, 'migrations')).find(file => file.startsWith('021_'));
before(async () => {
  global.fetch = async () => assert.fail('No real Auth, Supabase, bank or media request is allowed');
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$SELECT gen_random_uuid()$$;');
  for (const prefix of ['001', '002', '003']) { const file = fs.readdirSync(path.join(root, 'migrations')).find(file => file.startsWith(prefix + '_')); await db.exec(fs.readFileSync(path.join(root, 'migrations', file), 'utf8').replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', '')); }
  await db.exec('ALTER TABLE invitations ADD COLUMN views_count integer DEFAULT 0, ADD COLUMN builder_config jsonb, ADD COLUMN phone_whatsapp text;');
  for (const prefix of ['004', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015']) { const file = fs.readdirSync(path.join(root, 'migrations')).find(file => file.startsWith(prefix + '_')); await db.exec(fs.readFileSync(path.join(root, 'migrations', file), 'utf8')); }
  assert.ok(migrationFile(), 'Migration 021 must exist'); const sql = fs.readFileSync(path.join(root, 'migrations', migrationFile()), 'utf8'); await db.exec(sql); await db.exec(sql);
});
beforeEach(async () => {
  actor = 'partner'; activeOwner = owner; staleContext = null; beforeInsert = null; insertFailure = null; insertCalls = 0;
  await db.exec('TRUNCATE invitations,partners CASCADE;');
  await db.query("INSERT INTO partners(id,email) VALUES($1,'qa-owner@example.invalid'),($2,'qa-other@example.invalid')", [owner, otherOwner]);
  await db.query("INSERT INTO partner_subscriptions(partner_id,plan_key,status,current_period_end) VALUES($1,'inicio','active',now()+interval '1 month'),($2,'estudio','active',now()+interval '1 month')", [owner, otherOwner]);
});
after(() => db.close());

test('021 is reappliable and readiness is true without changing existing invitation content', async () => {
  await seed(1); const before = await scalar('SELECT to_jsonb(i) AS result FROM invitations i LIMIT 1'); await db.exec(fs.readFileSync(path.join(root, 'migrations', migrationFile()), 'utf8'));
  assert.equal(await scalar('SELECT public.enkarta_partner_draft_creation_ready() AS result'), true); assert.deepEqual(await scalar('SELECT to_jsonb(i) AS result FROM invitations i LIMIT 1'), before);
});
test('anonymous calls cannot reach the INSERT in either draft endpoint', async () => {
  actor = 'none'; for (const route of ['partner', 'admin']) assert.equal((await create(route)).status, 401); assert.equal(insertCalls, 0); assert.equal(await count(), 0);
});
test('a normal partner creates the selected original starter with its owned draft and plan package', async () => {
  const response = await create(), value = await response.json(); assert.equal(response.status, 201); assert.equal(value.status, 'draft');
  const stored = await scalar('SELECT to_jsonb(i) AS result FROM invitations i WHERE id=$1', [value.id]); assert.equal(stored.partner_id, owner); assert.equal(stored.builder_config.package, 'plus'); assert.equal(await count(), 1);
  const original = require(source('lib/template-starters.ts')).invitationStarter(template); assert.deepEqual(stored.builder_config.layout, original.builder_config.layout); assert.equal(stored.cover_image_url, original.cover_image_url ?? null);
});
test('untrusted owner, package, status and content cannot replace the selected partner starter', async () => {
  const response = await create('partner', { partner_id: otherOwner, status: 'ready', names: 'ATTACKER', builder_config: { package: 'exclusive', injected: true } }); assert.equal(response.status, 201);
  const stored = await scalar('SELECT to_jsonb(i) AS result FROM invitations i LIMIT 1'); assert.equal(stored.partner_id, owner); assert.equal(stored.status, 'draft'); assert.equal(stored.builder_config.package, 'plus'); assert.equal(stored.builder_config.injected, undefined); assert.notEqual(stored.names, 'ATTACKER'); assert.equal(await count(otherOwner), 0);
});
test('invalid templates fail before INSERT without changing owned or other drafts', async () => {
  for (const template of [undefined, '', '../perla', '__proto__', ['perla'], { template: 'perla' }]) assert.equal((await create('partner', { template })).status, 400);
  assert.equal(insertCalls, 0); assert.equal(await count(), 0); assert.equal(await count(otherOwner), 0);
});
test('the normal cap allows the twelfth draft and refuses the thirteenth before INSERT', async () => {
  await seed(11); assert.equal((await create()).status, 201); assert.equal(await count(), 12); const attempts = insertCalls; const refused = await create(); assert.equal(refused.status, 409); assert.equal(insertCalls, attempts); assert.equal(await count(), 12);
});
test('a stale total cannot bypass the database cap in either partner or shared admin POST', async () => {
  for (const route of ['partner', 'admin']) { await db.exec('TRUNCATE invitations CASCADE;'); await seed(11); staleContext = await context(); await seed(1);
    const response = await create(route), value = await response.json(); assert.equal(response.status, 409); assert.equal(value.code, 'DRAFT_QUOTA_REACHED'); assert.equal(await count(), 12); staleContext = null; }
});
test('an intervening owner suspension is checked by the trigger despite a stale active context', async () => {
  staleContext = await context(); await db.query("UPDATE partners SET status='suspended' WHERE id=$1", [owner]); const response = await create(); assert.equal(response.status, 403); assert.equal((await response.json()).code, 'DRAFT_CREATE_FORBIDDEN'); assert.equal(await count(), 0);
});
test('an intervening plan change rejects stale package allocation without adding an invitation', async () => {
  staleContext = await context(); await db.query("UPDATE partner_subscriptions SET plan_key='estudio' WHERE partner_id=$1", [owner]); const response = await create(); assert.equal(response.status, 409); assert.equal((await response.json()).code, 'DRAFT_PLAN_CHANGED'); assert.equal(await count(), 0);
});
test('draft capacity follows Inicio, Estudio and Agencia from current SQL plan values', async () => {
  for (const [plan, packageKey, cap] of [['inicio', 'plus', 12], ['estudio', 'premium', 30], ['agencia', 'exclusive', 200]]) {
    await db.exec('TRUNCATE invitations CASCADE;'); await db.query('UPDATE partner_subscriptions SET plan_key=$1 WHERE partner_id=$2', [plan, owner]); await seed(cap - 1, owner, packageKey);
    assert.equal((await create()).status, 201); assert.equal(await count(), cap); staleContext = { ...(await context()), totalInvitations: cap - 1 };
    const response = await create(); assert.equal(response.status, 409); assert.equal((await response.json()).code, 'DRAFT_QUOTA_REACHED'); assert.equal(await count(), cap); staleContext = null;
  }
});
test('draft creation remains possible without a paid subscription and uses the default Inicio package', async () => {
  await db.query('DELETE FROM partner_subscriptions WHERE partner_id=$1', [owner]); const response = await create(); assert.equal(response.status, 201); assert.equal(await count(), 1); assert.equal(await scalar("SELECT builder_config->>'package' AS result FROM invitations LIMIT 1"), 'plus');
});
test('other owners do not consume this partner cap and GET remains strictly owned', async () => {
  await seed(12, otherOwner, 'premium'); assert.equal((await create()).status, 201); const response = await partnerRoute.GET(), body = await response.json(); assert.equal(response.status, 200); assert.equal(body.invitations.length, 1); assert.equal(await count(otherOwner), 12);
});
test('the shared admin POST used by a partner cannot assign another owner or a stronger package', async () => {
  const response = await create('admin', { partner_id: otherOwner, builder_config: newServiceContract({}, 'exclusive') }); assert.equal(response.status, 201); const stored = await scalar('SELECT to_jsonb(i) AS result FROM invitations i LIMIT 1'); assert.equal(stored.partner_id, owner); assert.equal(stored.builder_config.package, 'plus'); assert.equal(await count(otherOwner), 0);
});
test('the shared partner POST cannot create an already-published invitation', async () => {
  const response = await create('admin', { status: 'ready' }); assert.equal(response.status, 400); assert.equal(await count(), 0);
});
test('team invitations with no partner remain independent of an exhausted partner cap', async () => {
  await seed(12); actor = 'admin'; const response = await create('admin'); assert.equal(response.status, 201); const created = await response.json(); assert.equal(created.partner_id, null); assert.equal(await count(), 12);
});
test('failed creation never reports success or leaves a partial invitation', async () => {
  insertFailure = { code: '08006', message: 'QA_PRIVATE_DATABASE_FAILURE' }; const response = await create(), body = await response.json(); assert.notEqual(response.status, 201); assert.equal(await count(), 0); assert.equal(body.id, undefined); assert.doesNotMatch(JSON.stringify(body), /QA_PRIVATE_DATABASE_FAILURE/);
});
test('readiness and trigger functions allow only the service role and expose no owner data', async () => {
  for (const role of ['anon', 'authenticated']) {
    for (const signature of ['public.enkarta_partner_draft_creation_ready()', 'public.enkarta_guard_partner_draft_creation()']) assert.equal(await scalar('SELECT has_function_privilege($1,$2,\'EXECUTE\') AS result', [role, signature]), false);
    await db.exec('SET ROLE ' + role); try { await assert.rejects(db.query('SELECT public.enkarta_partner_draft_creation_ready()'), /permission denied/); } finally { await db.exec('RESET ROLE'); }
  }
  await db.exec('SET ROLE service_role'); try { assert.equal(await scalar('SELECT public.enkarta_partner_draft_creation_ready() AS result'), true); } finally { await db.exec('RESET ROLE'); }
});
test('a multirow insert exceeding the final remaining slot rolls back every row in its statement', async () => {
  await seed(11); await assert.rejects(seed(2), /DRAFT_QUOTA_REACHED/); assert.equal(await count(), 11);
});
test('owner reassignment is checked at the target cap while a same-owner edit remains permitted', async () => {
  await seed(12); const freeId = await scalar("INSERT INTO invitations(slug,builder_config) VALUES('qa-team-free','{\"package\":\"plus\"}') RETURNING id AS result");
  await assert.rejects(db.query('UPDATE invitations SET partner_id=$1 WHERE id=$2', [owner, freeId]), /DRAFT_QUOTA_REACHED/);
  assert.equal(await scalar('SELECT partner_id AS result FROM invitations WHERE id=$1', [freeId]), null); assert.equal(await count(), 12);
  await db.query("UPDATE invitations SET partner_id=partner_id,names='QA same owner preserved' WHERE partner_id=$1", [owner]); assert.equal(await count(), 12);
});
