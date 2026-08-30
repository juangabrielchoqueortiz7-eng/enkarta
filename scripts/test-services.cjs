// Real PostgreSQL (WASM), isolated in memory. No production credentials/network.
// PGlite uses one connection: competing calls test revisions/replays, not
// independent PostgreSQL sessions. Two-device staging acceptance is still required.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const db = new PGlite();
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest);
};
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file,
}).outputText, file);

const migration = fs.readFileSync(path.join(root, 'migrations/006_reliable_rsvp_and_access.sql'), 'utf8');
const invId = '10000000-0000-4000-8000-000000000001';
const guestId = '20000000-0000-4000-8000-000000000001';
const otherId = '10000000-0000-4000-8000-000000000002';
const receipt = createHash('sha256').update('test-only-receipt').digest('hex');
let actor = null;
let rpcFailure = null;
let queryFailure = null;
const cookieJar = new Map();
const { hashPassword, signHostSession, signReviewSession, signDoorSession, signAdminSession, verifyHostSession, verifyReviewSession } = require('../src/lib/access.ts');
const hostHash = hashPassword('test-host-password');
const reviewHash = hashPassword('test-review-password');
const doorHash = hashPassword('test-door-password');
require.cache[require.resolve('next/headers')] = { exports: { cookies: () => ({
  get(name) {
    let value = cookieJar.get(name);
    if (actor?.role === 'admin' && name === 'enkarta-admin') value = signAdminSession();
    if (actor?.role === 'host' && name === 'enkarta-host') value = signHostSession(actor.id, hostHash);
    if (actor?.role === 'review' && name === 'enkarta-review') value = signReviewSession(actor.id, reviewHash);
    if (actor?.role === 'door' && name === 'enkarta-door') value = signDoorSession(actor.id, doorHash);
    return value ? { value } : undefined;
  },
  set(name, value) { cookieJar.set(name, value); }, delete(name) { cookieJar.delete(name); },
}) } };

const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.result;
// PostgREST serializes SQL DATE as YYYY-MM-DD; PGlite returns JS Date objects.
const wireRow = row => Object.fromEntries(Object.entries(row).map(([key,value]) => [key,
  value instanceof Date ? ['event_date','expires_at','rsvp_deadline','before_expires_at','after_expires_at','requested_expires_at'].includes(key) ? value.toISOString().slice(0,10) : value.toISOString() : value]));
async function rpc(name, params) {
  assert.match(name, /^enkarta_[a-z_]+$/);
  const keys = Object.keys(params);
  return scalar(`select public.${name}(${keys.map((key,i) => `${key} => $${i+1}`).join(',')}) as result`, Object.values(params));
}
const queryClient = (table) => {
  assert.ok(['guests', 'attendees', 'rsvps', 'invitations', 'builder_versions', 'builder_review_notes', 'invitation_validity_events', 'save_date_responses'].includes(table));
  let columns = '*', filters = [], limit, update, insert, remove;
  const query = {
    select(value = '*') { columns = value; return this; },
    eq(column,value) { filters.push([column,value,'=']); return this; },
    ilike(column,value) { filters.push([column,value,'ILIKE']); return this; },
    update(value) { update=value; return this; },
    insert(value) { insert=Array.isArray(value) ? value : [value]; return this; },
    delete() { remove=true; return this; },
    limit(value) { limit = value; return this; },
    order() { return this; },
    maybeSingle() { this.one = true; return this; },
    single() { this.one = true; return this; },
    async then(ok, fail) {
      try {
        if (queryFailure) return ok({data:null,error:queryFailure});
        let values = filters.map(([,value])=>value);
        const where = filters.length ? ' where '+filters.map(([col,,op],i)=>`${col} ${op} $${i+1}`).join(' and ') : '';
        let sql = `select ${columns} from public.${table}${where}${limit ? ' limit '+limit : ''}`;
        if (update) { const entries=Object.entries(update); sql=`update public.${table} set ${entries.map(([key],i)=>`${key}=$${values.length+i+1}`).join(',')}${where} returning ${columns}`; values.push(...entries.map(([,value])=>value)); }
        if (remove) sql=`delete from public.${table}${where} returning ${columns}`;
        if (insert) { const keys=Object.keys(insert[0]); values=[]; sql=`insert into public.${table}(${keys.join(',')}) values ${insert.map(row=>'('+keys.map(key=>{values.push(row[key]);return '$'+values.length;}).join(',')+')').join(',')} returning ${columns}`; }
        const result = await db.query(sql, values);
        const rows=result.rows.map(wireRow);
        return ok({ data: this.one ? rows[0] ?? null : rows, error: null });
      } catch(error) { return ok({data:null,error}); }
    },
  };
  return query;
};
// Replace only production boundaries before importing route handlers.
require.cache[require.resolve('../src/lib/supabase/server.ts')] = { exports: { supabaseAdmin: {
  from: queryClient,
  storage: { from: () => ({ download: async () => ({data:null,error:{message:'No legacy fixture'}}) }) },
  async rpc(name, params) { if(rpcFailure) return {data:null,error:rpcFailure}; try { return {data:await rpc(name,params),error:null}; } catch(error) { return {data:null,error}; } },
} } };
// Exercise real host/review authorization; only cookies and database transport are isolated.
const { NextRequest } = require('next/server');
const guestRoute = require('../src/app/api/guests/confirm/route.ts');
const openRoute = require('../src/app/api/rsvp/route.ts');
const checkinRoute = require('../src/app/api/checkin/route.ts');
const guestCrud = require('../src/app/api/guests/route.ts');
const adminRoute = require('../src/app/api/admin/invitations/route.ts');
const credentialsRoute = require('../src/app/api/admin/host-credentials/route.ts');
const reviewAuth = require('../src/app/api/review/auth/route.ts');
const hostAuth = require('../src/app/api/host/auth/route.ts');
const doorAuth = require('../src/app/api/door/auth/route.ts');
const dashboardRoute = require('../src/app/api/host/dashboard/route.ts');
const reviewState = require('../src/app/api/admin/builder-state/route.ts');
const botRoute = require('../src/app/api/invitations/route.ts');
const validityRoute = require('../src/app/api/admin/invitations/validity/route.ts');
const deliveryRoute = require('../src/app/api/guests/delivery/route.ts');
const saveDateRoute = require('../src/app/api/save-the-date/route.ts');
const { canReviewInvitation, canManageInvitation, canReadResponses, getHostSession, getReviewSession, getDoorSession } = require('../src/lib/host-session.ts');
const { newServiceContract, allowsService } = require('../src/lib/packages.ts');
const { parseRsvpInput, eventDay, hasRsvpForm } = require('../src/lib/rsvp-contract.ts');
const { addDays } = require('../src/lib/invitation-validity.ts');
const req = (url, body, cookie) => new NextRequest('http://localhost:3001'+url, body ? { method:'POST', headers:{'Content-Type':'application/json', ...(cookie ? {Cookie:cookie} : {})}, body:JSON.stringify(body) } : { headers: cookie ? {Cookie:cookie} : {} });
const guestInput = (extra = {}) => ({ slug:'test-event',publicId:'TEST0001',attending:'yes',passes:2,confirmName:'Familia Prueba',message:'',requestId:randomUUID(),expectedRevision:0,...extra });
const confirm = async (extra={}) => { const response=await guestRoute.POST(req('/api/guests/confirm',guestInput(extra))); assert.equal(response.status,200,JSON.stringify(await response.clone().json())); return response.json(); };
const group = () => rpc('enkarta_checkin_group',{p_invitation_id:invId,p_guest_id:guestId});
const scan = (a, action='in', extra={}) => rpc('enkarta_checkin',{p_invitation_id:invId,p_attendee_id:a.id,p_action:action,p_expected_revision:a.revision,p_request_id:randomUUID(),p_operator:'test',...extra});

before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS 'SELECT gen_random_uuid()';`);
  for(const file of ['001_create_invitations.sql','002_guests_access.sql','003_rsvps.sql']) {
    await db.exec(fs.readFileSync(path.join(root,'migrations',file),'utf8').replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',''));
  }
  await db.exec('ALTER TABLE invitations ADD COLUMN views_count integer DEFAULT 0, ADD COLUMN builder_config jsonb, ADD COLUMN phone_whatsapp text;');
  await db.exec(fs.readFileSync(path.join(root,'migrations/004_builder_cloud_and_analytics.sql'),'utf8'));
  await db.exec('GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role; GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;');
  try {
    await db.exec(migration);
    await db.exec(migration); // Reapplicable without changing data.
    await db.exec(fs.readFileSync(path.join(root,'migrations/007_separate_design_review.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/007_separate_design_review.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/008_live_host_and_door_access.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/008_live_host_and_door_access.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/009_invitation_validity.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/009_invitation_validity.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/010_delivery_followup.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/010_delivery_followup.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/011_verifiable_addons.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/011_verifiable_addons.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/012_commercial_funnel.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/012_commercial_funnel.sql'),'utf8'));
  } catch(error) { throw new Error(`Migration: ${error.message} at ${error.position}; ${migration.slice(Math.max(0,Number(error.position)-100),Number(error.position)+100)}`); }
});
beforeEach(async () => {
  actor=null; rpcFailure=null; queryFailure=null; cookieJar.clear();
  await db.exec('TRUNCATE invitations,guests,attendees,access_log,rsvps,builder_versions,save_date_responses,commercial_events,commercial_leads CASCADE');
  await db.query("INSERT INTO invitations(id,slug,status,rsvp_deadline) VALUES($1,'test-event','ready',((now() AT TIME ZONE 'America/La_Paz')::date+1)),($2,'other-event','ready',NULL)",[invId,otherId]);
  await db.query("UPDATE invitations SET host_email=id::text||'@test.invalid', host_password_hash=$1, review_email=id::text||'@review.invalid', review_password_hash=$2",[hostHash,reviewHash]);
  await db.query("UPDATE invitations SET door_email=id::text||'@door.invalid', door_password_hash=$1",[doorHash]);
  await db.query("INSERT INTO guests(id,invitation_id,public_id,name,passes) VALUES($1,$2,'TEST0001','Familia Prueba',5)",[guestId,invId]);
});
after(async () => { await db.close(); });

test('WhatsApp opening is not an alleged send; retries are idempotent and stale actions fail',async()=>{
  actor={role:'host',id:invId}; const requestId=randomUUID();
  const input={guestId,action:'opened',expectedRevision:0,requestId};
  let response=await deliveryRoute.POST(req('/api/guests/delivery',input)); assert.equal(response.status,200);
  let body=await response.json(); assert.equal(body.guest.deliveryStatus,'opened'); assert.equal(body.guest.sent,false); assert.equal(body.guest.responseRevision,1);
  response=await deliveryRoute.POST(req('/api/guests/delivery',input)); assert.equal((await response.json()).replayed,true);
  response=await deliveryRoute.POST(req('/api/guests/delivery',{...input,action:'manual'})); assert.equal((await response.json()).code,'REQUEST_REUSED');
  response=await deliveryRoute.POST(req('/api/guests/delivery',{...input,expectedRevision:1})); assert.equal((await response.json()).code,'REQUEST_REUSED');
  response=await deliveryRoute.POST(req('/api/guests/delivery',{...input,requestId:randomUUID()})); assert.equal((await response.json()).code,'STALE_GUEST');
});
test('manual marks and reminders are distinct; answered guests cannot receive reminders',async()=>{
  actor={role:'host',id:invId};
  let response=await deliveryRoute.POST(req('/api/guests/delivery',{guestId,action:'reminder',expectedRevision:0,requestId:randomUUID()}));
  let body=await response.json(); assert.equal(body.guest.reminderCount,1); assert.equal(body.guest.sent,false);
  response=await deliveryRoute.POST(req('/api/guests/delivery',{guestId,action:'manual',expectedRevision:1,requestId:randomUUID()}));
  body=await response.json(); assert.equal(body.guest.deliveryStatus,'marked'); assert.equal(body.guest.sent,true);
  await confirm({expectedRevision:2});
  response=await deliveryRoute.POST(req('/api/guests/delivery',{guestId,action:'reminder',expectedRevision:3,requestId:randomUUID()}));
  assert.equal((await response.json()).code,'REMINDER_NOT_NEEDED');
});
test('delivery mutations are owner-only and RPC is private',async()=>{
  const input={guestId,action:'opened',expectedRevision:0,requestId:randomUUID()};
  for(const role of [null,'review','door']) { actor=role?{role,id:invId}:null; assert.equal((await deliveryRoute.POST(req('/api/guests/delivery',input))).status,403); }
  assert.equal(await scalar("select has_function_privilege('anon','enkarta_record_delivery(uuid,text,integer,uuid)','EXECUTE') as result"),false);
});

test('Save the Date keeps a separate idempotent preconfirmation with revisions',async()=>{
  const services={version:1,saveDate:{status:'ready',enabled:true,published:true,preconfirmationEnabled:true,title:'Reserva la fecha',message:'Muy pronto'}};
  await db.query('update invitations set builder_config=$1 where id=$2',[{additionalServices:services},invId]);
  const responseKey=randomUUID(), requestId=randomUUID();
  const input={slug:'test-event',responseKey,name:'Familia Prueba',interest:'interested',guests:3,message:'Allí estaremos',requestId,expectedRevision:0};
  let response=await saveDateRoute.POST(req('/api/save-the-date',input));
  assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
  let body=await response.json(); assert.equal(body.response.revision,1); assert.equal(body.response.guests,3); assert.equal(body.replayed,false);
  response=await saveDateRoute.POST(req('/api/save-the-date',input)); body=await response.json(); assert.equal(body.replayed,true); assert.equal(body.response.revision,1);
  response=await saveDateRoute.POST(req('/api/save-the-date',{...input,message:'Otro',requestId})); assert.equal((await response.json()).code,'REQUEST_REUSED');
  response=await saveDateRoute.POST(req('/api/save-the-date',{...input,requestId:randomUUID(),expectedRevision:0})); assert.equal((await response.json()).code,'STALE_SAVE_DATE');
  response=await saveDateRoute.POST(req('/api/save-the-date',{...input,requestId:randomUUID(),expectedRevision:1,interest:'unavailable',guests:9}));
  body=await response.json(); assert.equal(body.response.revision,2); assert.equal(body.response.guests,0);
  response=await saveDateRoute.GET(req(`/api/save-the-date?slug=test-event&responseKey=${responseKey}`));
  body=await response.json(); assert.equal(body.response.interest,'unavailable'); assert.equal(body.response.revision,2);
  actor=null; response=await saveDateRoute.GET(req(`/api/save-the-date?id=${invId}`)); assert.equal(response.status,401);
  actor={role:'admin'}; response=await saveDateRoute.GET(req(`/api/save-the-date?id=${invId}`)); body=await response.json(); assert.equal(body.metrics.total,1); assert.equal(body.metrics.unavailable,1);
});

test('Save the Date is closed unless delivered and remains private in PostgreSQL',async()=>{
  const input={slug:'test-event',responseKey:randomUUID(),name:'Familia',interest:'maybe',guests:2,message:'',requestId:randomUUID(),expectedRevision:0};
  let response=await saveDateRoute.POST(req('/api/save-the-date',input)); assert.equal((await response.json()).code,'SAVE_DATE_CLOSED');
  await db.query("update invitations set builder_config=$1 where id=$2",[{additionalServices:{version:1,saveDate:{status:'ready',enabled:true,published:true,preconfirmationEnabled:true}}},invId]);
  response=await saveDateRoute.POST(req('/api/save-the-date',{...input,responseKey:'invalid'})); assert.equal(response.status,400);
  assert.equal(await scalar("select has_table_privilege('anon','save_date_responses','SELECT') as result"),false);
  assert.equal(await scalar("select has_function_privilege('anon','enkarta_submit_save_date(text,text,text,text,integer,text,uuid,text,integer)','EXECUTE') as result"),false);
});

test('commercial attribution is private, constrained and independent from guest data', async () => {
  const hash=createHash('sha256').update('anonymous-commercial-session').digest('hex');
  await db.query("insert into commercial_events(session_hash,event_type,package_key,design,utm_source) values($1,'landing_view','general','','instagram')",[hash]);
  const leadId=randomUUID();
  await db.query("insert into commercial_leads(id,reference,session_hash,package_key,design,utm_source) values($1,'EK-A1B2C3D4',$2,'premium','Lunaria','instagram')",[leadId,hash]);
  assert.equal(await scalar('select count(*)::int as result from commercial_events'),1);
  assert.equal(await scalar('select count(*)::int as result from commercial_leads'),1);
  for(const role of ['anon','authenticated']) {
    assert.equal(await scalar("select has_table_privilege($1,'commercial_events','SELECT') as result",[role]),false);
    assert.equal(await scalar("select has_table_privilege($1,'commercial_leads','SELECT') as result",[role]),false);
  }
  await assert.rejects(db.query("insert into commercial_leads(reference,session_hash,status) values('BAD',$1,'sold')",[hash]));
  assert.equal(await scalar('select count(*)::int as result from guests'),1);
});

const validityInput = (extra={}) => ({ id:invId, action:'extend', days:30, reason:'Ampliación acordada en prueba', expectedRevision:0, requestId:randomUUID(), ...extra });
const termRow = async () => wireRow((await db.query('select * from invitations where id=$1',[invId])).rows[0]);
async function activateTerm(pkg='exclusive', date=eventDay()) {
  await db.query('update invitations set builder_config=$1,event_date=$2 where id=$3',[newServiceContract({},pkg),date,invId]);
  actor={role:'admin'};
  const input=validityInput({action:'activate',days:null,expectedRevision:(await termRow()).validity_revision});
  const response=await validityRoute.POST(req('/api/admin/invitations/validity',input));
  assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
  return (await response.json()).validity;
}
test('new invitations automatically receive the 30/60/90-day package term at the database boundary',async()=>{
  actor={role:'admin'};
  for(const [pkg,days] of Object.entries({plus:30,premium:60,exclusive:90})) {
    const response=await adminRoute.POST(req('/api/admin/invitations',{slug:`validity-${pkg}`,event_date:'2028-01-31',builder_config:newServiceContract({},pkg)}));
    assert.equal(response.status,201,JSON.stringify(await response.clone().json()));
    const row=await response.json(); assert.equal(row.validity_mode,'automatic'); assert.equal(row.expires_at,addDays('2028-01-31',days));
    assert.equal(await rpc('enkarta_package_days',{p_config:newServiceContract({},pkg)}),require('../src/lib/packages.ts').PACKAGE_CATALOG[pkg].days);
  }
});
test('migration reapplication and contract updates preserve all previous manual and unlimited terms',async()=>{
  await db.query('update invitations set builder_config=$1,event_date=$2 where id=$3',[newServiceContract({},'plus'),'2026-01-01',invId]);
  await db.query("update invitations set expires_at='2030-01-01' where id=$1",[otherId]);
  await db.exec(fs.readFileSync(path.join(root,'migrations/009_invitation_validity.sql'),'utf8'));
  assert.equal((await termRow()).validity_mode,'legacy'); assert.equal((await termRow()).expires_at,null);
  assert.equal(await scalar('select expires_at::text as result from invitations where id=$1',[otherId]),'2030-01-01');
  assert.equal(await scalar('select count(*)::int as result from guests'),1);
});
test('adoption never shortens a later agreed date and records the preserved extra days',async()=>{
  const today=eventDay(); await db.query('update invitations set expires_at=$1 where id=$2',[addDays(today,150),invId]);
  const v=await activateTerm('plus',today);
  assert.equal(v.expiresAt,addDays(today,150)); assert.equal(v.extraDays,120); assert.equal(v.mode,'automatic');
  assert.equal(await scalar("select count(*)::int as result from invitation_validity_events where action='activate'"),1);
});
test('renewals are idempotent, resist stale edits and cannot reuse a request for another action or event',async()=>{
  const v=await activateTerm(); const input=validityInput({expectedRevision:v.revision});
  let response=await validityRoute.POST(req('/api/admin/invitations/validity',input)); assert.equal(response.status,200);
  const first=await response.json(); assert.equal(first.validity.expiresAt,addDays(v.expiresAt,30));
  response=await validityRoute.POST(req('/api/admin/invitations/validity',input)); assert.equal((await response.json()).replayed,true);
  response=await validityRoute.POST(req('/api/admin/invitations/validity',validityInput({expectedRevision:v.revision}))); assert.equal((await response.json()).code,'STALE_VALIDITY');
  for(const patch of [{days:60},{id:otherId},{reason:'Otro acuerdo'}]) {
    response=await validityRoute.POST(req('/api/admin/invitations/validity',{...input,...patch})); assert.equal((await response.json()).code,'REQUEST_REUSED');
  }
  assert.equal(await scalar("select count(*)::int as result from invitation_validity_events where action='extend'"),1);
});
test('rescheduling or changing package recalculates expiry, keeping purchased days and ignoring stale snapshot fields',async()=>{
  const v=await activateTerm();
  await validityRoute.POST(req('/api/admin/invitations/validity',validityInput({expectedRevision:v.revision})));
  const nextEvent=addDays(eventDay(),10);
  const response=await adminRoute.PUT(req('/api/admin/invitations',{id:invId,event_date:nextEvent,builder_config:newServiceContract({},'premium'),expires_at:null,validity_extra_days:0,validity_mode:'legacy',validity_revision:0}));
  assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
  const row=await termRow(); assert.equal(row.expires_at,addDays(nextEvent,90)); assert.equal(row.validity_extra_days,30); assert.equal(row.validity_mode,'automatic');
  assert.equal(await scalar("select count(*)::int as result from invitation_validity_events where action='recalculate'"),1);
});
test('renewal failure rolls back both the new date and its audit record',async()=>{
  const v=await activateTerm();
  await db.exec("CREATE FUNCTION fail_validity_test() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.action='extend' THEN RAISE EXCEPTION 'TEST_FAIL'; END IF; RETURN NEW; END;$$; CREATE TRIGGER fail_validity_test BEFORE INSERT ON invitation_validity_events FOR EACH ROW EXECUTE FUNCTION fail_validity_test();");
  try {
    const response=await validityRoute.POST(req('/api/admin/invitations/validity',validityInput({expectedRevision:v.revision})));
    assert.equal(response.status,503); assert.equal((await termRow()).expires_at,v.expiresAt);
    assert.equal(await scalar("select count(*)::int as result from invitation_validity_events where action='extend'"),0);
  } finally { await db.exec('DROP TRIGGER fail_validity_test ON invitation_validity_events; DROP FUNCTION fail_validity_test();'); }
});
test('public closure is inclusive and preserves guests, responses, QR tokens, access history and private panel',async()=>{
  const confirmed=await confirm(); await scan((await group()).attendees[0]);
  const bootstrap=await openRoute.GET(req('/api/rsvp?slug=test-event'));
  const cookie=bootstrap.headers.get('set-cookie').split(';')[0];
  const open=await openRoute.POST(req('/api/rsvp',{slug:'test-event',name:'Prueba abierta',attending:'yes',passes:1,requestId:randomUUID(),expectedRevision:0},cookie)); assert.equal(open.status,200);
  const v=await activateTerm('exclusive',addDays(eventDay(),-90)); assert.equal(v.state,'today');
  await rpc('enkarta_assert_event_open',{p_id:invId,p_deadline:false});
  await db.query('update invitations set event_date=$1 where id=$2',[addDays(eventDay(),-91),invId]);
  await assert.rejects(rpc('enkarta_assert_event_open',{p_id:invId}),/EVENT_CLOSED/);
  actor={role:'host',id:invId}; const snapshot=await dashboardRoute.GET(req('/api/host/dashboard'));
  assert.equal(snapshot.status,200); assert.equal((await snapshot.json()).validity.state,'expired');
  assert.equal(await scalar('select count(*)::int as result from guests'),1);
  assert.equal(await scalar('select count(*)::int as result from rsvps'),1);
  assert.equal(await scalar('select count(*)::int as result from access_log'),1);
  assert.equal(await scalar('select access_token as result from guests where id=$1',[guestId]),confirmed.guest.accessToken);
  actor={role:'admin'}; await db.query('update invitations set is_active=false where id=$1',[invId]);
  const input=validityInput({expectedRevision:(await termRow()).validity_revision});
  assert.equal((await validityRoute.POST(req('/api/admin/invitations/validity',input))).status,200);
  await assert.rejects(rpc('enkarta_assert_event_open',{p_id:invId}),/EVENT_CLOSED/);
  assert.equal((await termRow()).is_active,false);
});
test('automatic drafts without a date cannot publish or respond through an old published snapshot',async()=>{
  const id=randomUUID();
  await db.query("insert into invitations(id,slug,builder_config) values($1,'no-date',$2)",[id,newServiceContract({},'exclusive')]);
  await assert.rejects(db.query("update invitations set status='ready' where id=$1",[id]),/VALIDITY_EVENT_REQUIRED/);
  await db.query("insert into builder_versions(id,invitation_id,label,source,snapshot) values('date-test',$1,'Published','publish','{}')",[id]);
  await assert.rejects(rpc('enkarta_assert_event_open',{p_id:id}),/EVENT_CLOSED/);
});
test('legacy manual terms are audited, require a reason, and cannot end before the event',async()=>{
  actor={role:'admin'};
  await db.query('update invitations set event_date=$1 where id=$2',[eventDay(),invId]);
  const revision=(await termRow()).validity_revision;
  let response=await validityRoute.POST(req('/api/admin/invitations/validity',validityInput({action:'set_expiry',expiresAt:addDays(eventDay(),-1),expectedRevision:revision}))); assert.equal((await response.json()).code,'VALIDITY_BEFORE_EVENT');
  response=await validityRoute.POST(req('/api/admin/invitations/validity',validityInput({action:'set_expiry',expiresAt:addDays(eventDay(),40),expectedRevision:revision})));
  const saved=await response.json(); assert.equal(response.status,200); assert.equal(saved.validity.mode,'legacy');
  response=await validityRoute.POST(req('/api/admin/invitations/validity',validityInput({action:'set_expiry',expiresAt:null,expectedRevision:saved.validity.revision,reason:'Restituir plazo indefinido'})));
  assert.equal((await response.json()).validity.state,'unlimited');
});
test('only admin can read/change renewal history; direct public SQL access and RPC execution are denied',async()=>{
  const v=await activateTerm();
  for(const role of [null,'host','review','door']) {
    actor=role ? {role,id:invId} : null;
    assert.equal((await validityRoute.GET(req('/api/admin/invitations/validity?id='+invId))).status,403);
    assert.equal((await validityRoute.POST(req('/api/admin/invitations/validity',validityInput({expectedRevision:v.revision})))).status,403);
  }
  for(const role of ['anon','authenticated']) {
    assert.equal(await scalar("select has_table_privilege($1,'invitation_validity_events','SELECT') as result",[role]),false);
    assert.equal(await scalar("select has_function_privilege($1,'enkarta_change_validity(uuid,text,integer,date,text,integer,uuid)','EXECUTE') as result",[role]),false);
  }
  assert.equal(await scalar("select has_table_privilege('service_role','invitation_validity_events','UPDATE') as result"),false);
  await db.exec('SET ROLE service_role');
  try { await rpc('enkarta_change_validity',{p_id:invId,p_action:'extend',p_days:30,p_expires_at:null,p_reason:'Prueba con permisos reales',p_expected_revision:v.revision,p_request_id:randomUUID()}); }
  finally { await db.exec('RESET ROLE'); }
});
test('validity API validates origin/input and reports missing SQL without overwriting dates',async()=>{
  actor={role:'admin'};
  for(const extra of [{days:1.5},{reason:''},{requestId:'bad'},{expectedRevision:-1}]) assert.equal((await validityRoute.POST(req('/api/admin/invitations/validity',validityInput(extra)))).status,400);
  const foreign=new NextRequest('http://localhost:3001/api/admin/invitations/validity',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://unrelated.invalid'},body:JSON.stringify(validityInput())});
  assert.equal((await validityRoute.POST(foreign)).status,400);
  queryFailure={code:'42703',message:'missing column'};
  const response=await validityRoute.GET(req('/api/admin/invitations/validity?id='+invId));
  assert.equal(response.status,503); assert.equal((await response.json()).code,'MIGRATION_REQUIRED');
});

test('strict contract rejects fractional, overflowing, negative and forged input',()=>{
  for(const passes of [1.5,0,-1,21,'2',Infinity,NaN]) assert.throws(()=>parseRsvpInput(guestInput({passes})));
  for(const extra of [{attending:'maybe'},{confirmName:''},{requestId:'x'},{expectedRevision:-1},{expectedRevision:0.5}]) assert.throws(()=>parseRsvpInput(guestInput(extra)));
  assert.equal(parseRsvpInput(guestInput({attending:'no',passes:5})).passes,0);
  assert.equal(eventDay(new Date('2026-08-28T02:00:00Z')),'2026-08-27');
});
test('only enabled form blocks suppress the legacy fallback, including nested groups',()=>{
  assert.equal(hasRsvpForm([{type:'rsvp',props:{mode:'whatsapp'}}]),false);
  assert.equal(hasRsvpForm([{type:'rsvp',enabled:false,props:{mode:'form'}}]),false);
  assert.equal(hasRsvpForm([{type:'group',props:{},children:[{type:'rsvp',props:{mode:'form'}}]}]),true);
  const mobileOnly=[{type:'group',props:{},layout:{hideOn:'desktop'},children:[{type:'rsvp',props:{mode:'form'}}]}];
  assert.equal(hasRsvpForm(mobileOnly,'mobile'),true); assert.equal(hasRsvpForm(mobileOnly,'desktop'),false);
});
test('5 assigned and 2 confirmed produce exactly 2 eligible seats and a QR',async()=>{
  const result=await confirm(); assert.equal(result.guest.confirmedPasses,2); assert.ok(result.guest.accessToken);
  assert.equal((await group()).attendees.length,2);
});
test('network retry returns the same response, token and revision without additional seats',async()=>{
  const requestId=randomUUID(); const a=await confirm({requestId}); const b=await confirm({requestId});
  assert.equal(b.replayed,true); assert.equal(a.guest.responseRevision,b.guest.responseRevision); assert.equal(a.guest.accessToken,b.guest.accessToken);
  assert.equal((await group()).attendees.length,2);
});
test('stale response cannot overwrite a newer answer, request reuse cannot change content',async()=>{
  const requestId=randomUUID(); await confirm({requestId});
  let response=await guestRoute.POST(req('/api/guests/confirm',guestInput({passes:3})));
  assert.equal(response.status,409); assert.equal((await response.json()).code,'STALE_RESPONSE');
  response=await guestRoute.POST(req('/api/guests/confirm',guestInput({requestId,passes:3})));
  assert.equal((await response.json()).code,'REQUEST_REUSED');
});
test('response corrections preserve seat ids and QR; declining invalidates entry',async()=>{
  const first=await confirm(); const seats=(await group()).attendees;
  const reduced=await confirm({passes:1,expectedRevision:first.guest.responseRevision});
  assert.equal((await group()).attendees[0].id,seats[0].id);
  assert.equal(await scalar('select count(*)::int as result from attendees'),2);
  assert.equal(reduced.guest.accessToken,first.guest.accessToken);
  await confirm({attending:'no',expectedRevision:reduced.guest.responseRevision});
  await assert.rejects(group(),/NOT_CONFIRMED/);
  await assert.rejects(scan(seats[0]),/NOT_CONFIRMED/);
});
test('two competing scan operations count only one admission and one log',async()=>{
  await confirm(); const a=(await group()).attendees[0];
  const results=await Promise.allSettled([scan(a),scan(a)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected').length,1);
  assert.equal(await scalar('select count(*)::int as result from access_log'),1);
});
test('same scan retry is idempotent; delayed stale scan after exit does not readmit',async()=>{
  await confirm(); const a=(await group()).attendees[0]; const requestId=randomUUID();
  const one=await scan(a,'in',{p_request_id:requestId});
  assert.equal((await scan(a,'in',{p_request_id:requestId})).replayed,true);
  const out=await scan(one.attendee,'out'); assert.equal(out.attendee.state,'out');
  assert.equal((await scan(a,'in',{p_request_id:requestId})).attendee.state,'out');
  await assert.rejects(scan(a),/STALE_SCAN/);
  assert.equal(await scalar('select count(*)::int as result from access_log'),2);
});
test('used seats cannot be reduced or canceled even after an exit; history cannot be deleted',async()=>{
  const first=await confirm(); const a=(await group()).attendees[1]; const one=await scan(a); await scan(one.attendee,'out');
  for(const extra of [{passes:1},{attending:'no'}]) {
    const response=await guestRoute.POST(req('/api/guests/confirm',guestInput({...extra,expectedRevision:first.guest.responseRevision})));
    assert.equal((await response.json()).code,'USED_PASSES');
  }
  await assert.rejects(db.query('delete from guests where id=$1',[guestId]),/USED_PASSES/);
  assert.equal(await scalar('select count(*)::int as result from access_log'),2);
});
test('failed log insert rolls back the admission in the same transaction',async()=>{
  await confirm(); const a=(await group()).attendees[0];
  await db.exec("CREATE FUNCTION fail_access_test() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'TEST_FAIL'; END;$$; CREATE TRIGGER fail_access_test BEFORE INSERT ON access_log FOR EACH ROW EXECUTE FUNCTION fail_access_test();");
  try { await assert.rejects(scan(a),/TEST_FAIL/); assert.equal((await group()).attendees[0].state,'out'); }
  finally { await db.exec('DROP TRIGGER fail_access_test ON access_log; DROP FUNCTION fail_access_test();'); }
});
test('public RSVP and QR honor unpublished, paused and expired invitations',async()=>{
  for(const sql of ["status='draft'","is_active=false","expires_at=((now() AT TIME ZONE 'America/La_Paz')::date-1)"]) {
    await db.exec('update invitations set '+sql);
    const response=await guestRoute.POST(req('/api/guests/confirm',guestInput())); assert.equal(response.status,403);
    await db.exec("update invitations set status='ready',is_active=true,expires_at=NULL");
  }
  assert.equal(await scalar('select count(*)::int as result from attendees'),0);
});
test('RSVP deadline is inclusive; after closing, submissions stop but event access remains valid',async()=>{
  await db.exec("update invitations set rsvp_deadline=(now() AT TIME ZONE 'America/La_Paz')::date");
  const first=await confirm();
  await db.exec("update invitations set rsvp_deadline=(now() AT TIME ZONE 'America/La_Paz')::date-1");
  const response=await guestRoute.POST(req('/api/guests/confirm',guestInput({expectedRevision:first.guest.responseRevision})));
  assert.equal((await response.json()).code,'RSVP_CLOSED');
  assert.equal((await scan((await group()).attendees[0])).attendee.state,'in');
});
test('published snapshot keeps a draft available; future scheduled snapshot does not',async()=>{
  await db.exec("update invitations set status='draft'");
  await db.query("insert into builder_versions(id,invitation_id,label,source,snapshot) values('v1',$1,'test','publish',$2)",[invId,{config:{__enkartaVersion:{publicationState:'scheduled',publishAt:'2099-01-01T00:00:00Z'}}}]);
  assert.equal((await guestRoute.POST(req('/api/guests/confirm',guestInput()))).status,403);
  await db.exec("update builder_versions set snapshot='{}'"); await confirm();
});
test('admin edits cannot reduce below confirmed capacity and invalidate stale response revisions',async()=>{
  const first=await confirm(); await assert.rejects(db.query('update guests set passes=1 where id=$1',[guestId]),/CONFIRMED_LIMIT/);
  await db.query("update guests set table_no='7' where id=$1",[guestId]);
  assert.equal((await guestRoute.POST(req('/api/guests/confirm',guestInput({expectedRevision:first.guest.responseRevision})))).status,409);
});
test('open RSVP reuses a private receipt across reloads and updates a single row',async()=>{
  const bootstrap=await openRoute.GET(req('/api/rsvp?slug=test-event')); assert.equal(bootstrap.status,200);
  const cookie=bootstrap.headers.get('set-cookie').split(';')[0]; assert.match(bootstrap.headers.get('set-cookie'),/HttpOnly/i);
  const body=guestInput({name:'Otra familia'}); delete body.confirmName; delete body.publicId;
  const firstResponse=await openRoute.POST(req('/api/rsvp',body,cookie)); assert.equal(firstResponse.status,200); const first=await firstResponse.json();
  const retry=await openRoute.POST(req('/api/rsvp',body,cookie)); assert.equal((await retry.json()).replayed,true);
  const current=await openRoute.GET(req('/api/rsvp?slug=test-event',null,cookie)); assert.equal((await current.json()).entry.id,first.entry.id);
  const update=await openRoute.POST(req('/api/rsvp',{...body,requestId:randomUUID(),expectedRevision:first.entry.revision,attending:'no'},cookie));
  assert.equal((await update.json()).entry.passes,0); assert.equal(await scalar('select count(*)::int as result from rsvps'),1);
  const outsider=await openRoute.GET(req('/api/rsvp?slug=test-event')); assert.equal((await outsider.json()).entry,undefined);
});
test('open RSVP requires a receipt and respects event and RSVP closures',async()=>{
  assert.equal((await openRoute.POST(req('/api/rsvp',guestInput()))).status,400);
  await db.exec("update invitations set rsvp_deadline=(now() AT TIME ZONE 'America/La_Paz')::date-1");
  await assert.rejects(rpc('enkarta_submit_open_rsvp',{p_slug:'test-event',p_receipt_hash:receipt,p_attending:'yes',p_passes:2,p_name:'Test',p_message:'',p_request_id:randomUUID(),p_expected_revision:0}),/RSVP_CLOSED/);
});
test('scanner API denies anonymous and wrong-event operators, allows the owner',async()=>{
  const first=await confirm(); const a=(await group()).attendees[0];
  const body={attendeeId:a.id,action:'in',expectedRevision:0,requestId:randomUUID()};
  assert.equal((await checkinRoute.POST(req('/api/checkin',body))).status,403);
  assert.equal((await checkinRoute.GET(req('/api/checkin?token='+first.guest.accessToken))).status,403);
  actor={role:'host',id:otherId}; assert.equal((await checkinRoute.POST(req('/api/checkin',body))).status,403);
  assert.equal((await checkinRoute.GET(req('/api/checkin?token='+first.guest.accessToken))).status,404);
  actor={role:'host',id:invId}; assert.equal((await checkinRoute.POST(req('/api/checkin',body))).status,200);
  assert.equal((await checkinRoute.GET(req('/api/checkin?token='+first.guest.accessToken))).status,200);
});
test('database public roles cannot read personal records or bypass APIs with RPC',async()=>{
  for(const role of ['anon','authenticated']) {
    for(const table of ['invitations','guests','attendees','rsvps','access_log']) assert.equal(await scalar('select has_table_privilege($1,$2,\'SELECT\') as result',[role,table]),false);
    assert.equal(await scalar("select has_function_privilege($1,'enkarta_checkin(uuid,uuid,text,integer,uuid,text)','EXECUTE') as result",[role]),false);
    assert.equal(await scalar("select has_function_privilege($1,'enkarta_confirm_guest(text,text,text,integer,text,text,uuid,integer,text,text)','EXECUTE') as result",[role]),false);
  }
});
test('missing migration fails closed with an explicit maintenance response, never JSON fallback',async()=>{
  rpcFailure={code:'PGRST202',message:'missing function'};
  const response=await guestRoute.POST(req('/api/guests/confirm',guestInput()));
  assert.equal(response.status,503); assert.equal((await response.json()).code,'MIGRATION_REQUIRED');
  assert.equal(await scalar('select count(*)::int as result from attendees'),0);
});

test('service_role can use the new functions with real restricted table permissions',async()=>{
  await db.exec('SET ROLE service_role');
  try { const value=await confirm(); assert.equal(value.guest.confirmedPasses,2); assert.equal((await group()).attendees.length,2); }
  finally { await db.exec('RESET ROLE'); }
});
test('legacy surplus seats are retained but cannot be admitted beyond confirmed capacity',async()=>{
  await confirm(); await db.query('insert into attendees(guest_id,seat_no) values($1,3)',[guestId]);
  const extra=(await db.query('select * from attendees where seat_no=3')).rows[0];
  assert.equal((await group()).attendees.length,2); await assert.rejects(scan(extra),/NOT_CONFIRMED/);
  await db.exec(migration); assert.equal(await scalar('select count(*)::int as result from attendees'),3);
});
test('simultaneous open submissions with the same receipt create one row',async()=>{
  const params={p_slug:'test-event',p_receipt_hash:receipt,p_attending:'yes',p_passes:2,p_name:'Test',p_message:'',p_expected_revision:0};
  const results=await Promise.allSettled([rpc('enkarta_submit_open_rsvp',{...params,p_request_id:randomUUID()}),rpc('enkarta_submit_open_rsvp',{...params,p_request_id:randomUUID()})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1); assert.equal(await scalar('select count(*)::int as result from rsvps'),1);
});
test('malformed JSON and cross-origin mutations are rejected before database changes',async()=>{
  const malformed=new NextRequest('http://localhost:3001/api/guests/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad'});
  assert.equal((await guestRoute.POST(malformed)).status,400);
  const cross=new NextRequest('http://localhost:3001/api/guests/confirm',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://unrelated.example'},body:JSON.stringify(guestInput())});
  assert.equal((await guestRoute.POST(cross)).status,400); assert.equal(await scalar('select count(*)::int as result from attendees'),0);
});

const usePackage = async pkg => db.query('update invitations set builder_config=$1 where id=$2',[newServiceContract({},pkg),invId]);
test('Plus blocks form submissions and guest CRUD even if the body claims Exclusive',async()=>{
  await usePackage('plus');
  let response = await guestRoute.POST(req('/api/guests/confirm',guestInput({package:'exclusive',features:{qrAccess:true}})));
  assert.equal(response.status,403); assert.equal((await response.json()).code,'SERVICE_NOT_INCLUDED');
  assert.equal((await openRoute.GET(req('/api/rsvp?slug=test-event'))).status,403);
  actor={role:'admin'};
  assert.equal((await guestCrud.POST(req('/api/guests',{invitationId:invId,name:'Not allowed'}))).status,403);
  assert.equal(await scalar('select count(*)::int as result from attendees'),0);
});
test('Premium confirms, exposes no QR or table, allows read-only sheet and denies scanner',async()=>{
  await usePackage('premium');
  await db.query("update guests set table_no='12' where id=$1",[guestId]);
  const result=await confirm({expectedRevision:1}); assert.equal(result.guest.accessToken,undefined); assert.equal(result.guest.tableNo,undefined);
  const token=await scalar('select access_token as result from guests where id=$1',[guestId]);
  const current=await guestRoute.GET(req('/api/guests/confirm?slug=test-event&publicId=TEST0001'));
  assert.equal(current.status,200); assert.equal((await current.json()).guest?.accessToken,undefined);
  actor={role:'host',id:invId};
  assert.equal(await canReadResponses(invId),true); assert.equal(await canManageInvitation(invId),false);
  assert.equal(await canReviewInvitation(invId),false);
  assert.equal((await openRoute.GET(req('/api/rsvp?id='+invId))).status,200);
  assert.equal((await guestCrud.GET(req('/api/guests?id='+invId))).status,403);
  assert.equal((await checkinRoute.GET(req('/api/checkin?token='+token))).status,403);
  actor={role:'admin'}; assert.equal((await checkinRoute.GET(req('/api/checkin?token='+token))).status,403);
  assert.equal(await scalar('select count(*)::int as result from access_log'),0);
});
test('Exclusive grants event operations; changing to Premium immediately blocks old QR',async()=>{
  await usePackage('exclusive'); const result=await confirm(); actor={role:'host',id:invId};
  assert.equal((await checkinRoute.GET(req('/api/checkin?token='+result.guest.accessToken))).status,200);
  await usePackage('premium');
  assert.equal((await checkinRoute.GET(req('/api/checkin?token='+result.guest.accessToken))).status,403);
});
test('review session reads only its design and cannot mutate guests, publish or read responses',async()=>{
  await usePackage('exclusive'); actor={role:'review',id:invId};
  assert.equal(await canReviewInvitation(invId),true); assert.equal(await canReviewInvitation(otherId),false);
  assert.equal(await canReadResponses(invId),false); assert.equal(await canManageInvitation(invId),false);
  assert.equal((await guestCrud.POST(req('/api/guests',{invitationId:invId,name:'Blocked'}))).status,403);
  assert.equal((await openRoute.GET(req('/api/rsvp?id='+invId))).status,401);
  assert.equal((await reviewState.POST(req('/api/admin/builder-state',{invitationId:invId,action:'publish'}))).status,403);
  assert.equal((await reviewState.GET(req('/api/admin/builder-state?invitationId='+otherId))).status,401);
});
test('review snapshot strips raw config, guest metadata and both password hashes',async()=>{
  await db.query("insert into builder_versions(id,invitation_id,label,source,snapshot) values('v1',$1,'test','save',$2)",[invId,{id:invId,config:{guestMeta:{TEST0001:{phone:'secret-phone'}}},builder_config:'secret-raw',host_password_hash:'secret-host',review_password_hash:'secret-review'}]);
  actor={role:'review',id:invId};
  const response=await reviewState.GET(req('/api/admin/builder-state?invitationId='+invId)); assert.equal(response.status,200);
  const content=JSON.stringify(await response.json()); assert.doesNotMatch(content,/secret-/);
});
test('review and host logins use separate credentials and cookies, invalidated by password changes',async()=>{
  await usePackage('premium');
  const email=invId+'@review.invalid';
  assert.equal((await reviewAuth.POST(req('/api/review/auth',{email,password:'test-host-password'}))).status,401);
  assert.equal((await reviewAuth.POST(req('/api/review/auth',{email,password:'test-review-password'}))).status,200);
  assert.equal(await getReviewSession(),invId); assert.equal(await getHostSession(),null);
  cookieJar.set('enkarta-host',cookieJar.get('enkarta-review'));
  assert.equal(await getHostSession(),null);
  await db.query('update invitations set review_password_hash=$1 where id=$2',[hashPassword('changed-review-password'),invId]);
  assert.equal(await getReviewSession(),null);
  cookieJar.clear();
  assert.equal((await hostAuth.POST(req('/api/host/auth',{email:invId+'@test.invalid',password:'test-host-password'}))).status,200);
  assert.equal(await getHostSession(),invId);
  await db.query('update invitations set host_password_hash=$1 where id=$2',[hashPassword('changed-host-password'),invId]);
  assert.equal(await getHostSession(),null);
});
test('credentials endpoint is admin-only, scoped, validates passwords and never returns hashes',async()=>{
  assert.equal((await credentialsRoute.GET(req('/api/admin/host-credentials?id='+invId))).status,401);
  actor={role:'admin'};
  assert.equal((await credentialsRoute.POST(req('/api/admin/host-credentials',{id:invId,scope:'review',email:'review@test.invalid',password:'short'}))).status,400);
  const response=await credentialsRoute.POST(req('/api/admin/host-credentials',{id:invId,scope:'review',email:'review@test.invalid',password:'a-safe-test-password'}));
  assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
  assert.equal(await scalar('select host_password_hash as result from invitations where id=$1',[invId]),hostHash);
  const get=await credentialsRoute.GET(req('/api/admin/host-credentials?id='+invId+'&scope=review'));
  assert.deepEqual(await get.json(),{email:'review@test.invalid',hasPassword:true,rsvpDeadline:''});
  assert.equal((await credentialsRoute.POST(req('/api/admin/host-credentials',{id:otherId,scope:'review',email:'review@test.invalid',password:'another-safe-password'}))).status,400);
});
test('new records require explicit package; malformed contracts fail and visual restore keeps agreement',async()=>{
  actor={role:'admin'};
  assert.equal((await adminRoute.POST(req('/api/admin/invitations',{slug:'new'}))).status,400);
  const response=await adminRoute.POST(req('/api/admin/invitations',{slug:'new',builder_config:{package:'premium'}}));
  assert.equal(response.status,201,JSON.stringify(await response.clone().json()));
  const created=await response.json(); assert.equal(created.builder_config.serviceContract.version,2);
  assert.equal((await adminRoute.PUT(req('/api/admin/invitations',{id:created.id,builder_config:{package:'exclusive',serviceContract:{version:2,adoptedAt:'bad',extras:{bad:true}}}}))).status,400);
  assert.equal((await adminRoute.PUT(req('/api/admin/invitations',{id:created.id,builder_config:{package:'exclusive',theme:{primary:'#abcdef'}}}))).status,200);
  const config=await scalar('select builder_config as result from invitations where id=$1',[created.id]);
  assert.equal(config.package,'premium'); assert.equal(config.theme.primary,'#abcdef'); assert.equal(allowsService(config,'qrAccess'),false);
});

test('color customization requires a registered extra in the save API, not only in the UI',async()=>{
  actor={role:'admin'}; await usePackage('plus');
  assert.equal((await adminRoute.PUT(req('/api/admin/invitations',{id:invId,color_primary:'#ff0000'}))).status,400);
  const config=newServiceContract({},'plus'); config.serviceContract.extras=[{id:'color',feature:'colorCustomization',value:true,reason:'Acordado en prueba',source:'contracted',recordedAt:new Date().toISOString()}];
  assert.equal((await adminRoute.PUT(req('/api/admin/invitations',{id:invId,builder_config:config,color_primary:'#ff0000'}))).status,200);
  assert.equal(await scalar('select color_primary as result from invitations where id=$1',[invId]),'#ff0000');
});
test('review cannot overwrite team notes or move a note from another invitation by upsert id',async()=>{
  actor={role:'review',id:invId};
  await db.query("insert into builder_review_notes(id,invitation_id,text,author) values('team-note',$1,'Nota del equipo','Equipo'),('foreign-note',$2,'Otra nota','Equipo')",[invId,otherId]);
  for(const id of ['team-note','foreign-note']) {
    const response=await reviewState.POST(req('/api/admin/builder-state',{invitationId:invId,note:{id,text:'Sobrescribir',role:'client'}}));
    assert.equal(response.status,403);
  }
  assert.equal(await scalar("select text as result from builder_review_notes where id='team-note'"),'Nota del equipo');
});
test('integration creation also requires a package and an API key',async()=>{
  const previous=process.env.ENKARTA_API_KEY;
  try {
    process.env.ENKARTA_API_KEY='unit-test-only-key';
    assert.equal((await botRoute.POST(req('/api/invitations',{package:'plus'}))).status,401);
    const request=body=>new NextRequest('http://localhost:3001/api/invitations',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':'unit-test-only-key'},body:JSON.stringify(body)});
    assert.equal((await botRoute.POST(request({slug:'integration-test'}))).status,400);
    const response=await botRoute.POST(request({slug:'integration-test',package:'plus'})); assert.equal(response.status,201);
    const {id}=await response.json(); const config=await scalar('select builder_config as result from invitations where id=$1',[id]);
    assert.equal(config.package,'plus'); assert.equal(config.serviceContract.version,2);
  } finally { if(previous===undefined) delete process.env.ENKARTA_API_KEY; else process.env.ENKARTA_API_KEY=previous; }
});

test('live dashboard rejects anonymous, review, door and other-event sessions',async()=>{
  for (const identity of [null,{role:'review',id:invId},{role:'door',id:invId},{role:'host',id:otherId}]) {
    actor=identity;
    assert.equal((await dashboardRoute.GET(req('/api/host/dashboard?id='+invId))).status,403);
  }
  actor={role:'host',id:invId};
  assert.equal((await dashboardRoute.GET(req('/api/host/dashboard'))).status,200);
});
test('one live snapshot updates confirmations, occupancy and tables without mixing open responses',async()=>{
  await usePackage('exclusive'); await confirm();
  await db.query("update guests set table_no='2' where id=$1",[guestId]);
  await rpc('enkarta_submit_open_rsvp',{p_slug:'test-event',p_receipt_hash:receipt,p_attending:'yes',p_passes:3,p_name:'Respuesta abierta',p_message:'',p_request_id:randomUUID(),p_expected_revision:0});
  const g=await group(); await scan(g.attendees[0]);
  actor={role:'host',id:invId};
  const response=await dashboardRoute.GET(req('/api/host/dashboard'));
  assert.match(response.headers.get('cache-control'),/no-store/);
  const state=await response.json();
  assert.equal(state.mode,'operations'); assert.equal(state.metrics.confirmed,1);
  assert.equal(state.metrics.confirmedPasses,2); assert.equal(state.metrics.passes,5);
  assert.equal(state.metrics.checkedIn,1); assert.equal(state.guests[0].inside,1);
  assert.equal(state.guests[0].tableNo,'2'); assert.equal(state.rows.length,2);
  assert.doesNotMatch(JSON.stringify(state),/accessToken|access_token|receipt_hash|password_hash|last_response_request/);
  await scan((await group()).attendees[0],'out');
  assert.equal((await (await dashboardRoute.GET(req('/api/host/dashboard'))).json()).metrics.checkedIn,0);
});
test('Premium live data stays read-only and strips all operational fields, including legacy QR',async()=>{
  await usePackage('exclusive'); await confirm(); await usePackage('premium');
  actor={role:'host',id:invId};
  const state=await (await dashboardRoute.GET(req('/api/host/dashboard'))).json();
  assert.equal(state.mode,'responses'); assert.deepEqual(state.guests,[]); assert.equal(state.metrics,null);
  assert.equal(state.rows[0].confirmed,2); assert.equal(state.services.qrAccess,false);
  assert.doesNotMatch(JSON.stringify(state),/accessCode|accessToken|tableNo|phone|publicId/);
  await usePackage('plus'); assert.equal((await dashboardRoute.GET(req('/api/host/dashboard'))).status,403);
});
test('live data failures return maintenance, never an empty success snapshot',async()=>{
  actor={role:'host',id:invId}; rpcFailure={code:'PGRST202',message:'function missing'};
  const response=await dashboardRoute.GET(req('/api/host/dashboard'));
  assert.equal(response.status,503); assert.equal((await response.json()).code,'MIGRATION_REQUIRED');
});
test('an authentication database outage is retryable, not a revoked live session',async()=>{
  actor={role:'host',id:invId}; queryFailure={code:'08006',message:'Connection unavailable'};
  const response=await dashboardRoute.GET(req('/api/host/dashboard'));
  assert.equal(response.status,503); assert.equal((await response.json()).code,'SERVICE_UNAVAILABLE');
});
test('snapshot RPC is service-role-only and stays scoped to one event',async()=>{
  for (const role of ['anon','authenticated']) assert.equal(await scalar("select has_function_privilege($1,'public.enkarta_host_snapshot(uuid)','EXECUTE') as result",[role]),false);
  await db.exec('SET ROLE service_role');
  try {
    const state=await rpc('enkarta_host_snapshot',{p_invitation_id:otherId});
    assert.deepEqual(state.guests,[]); assert.deepEqual(state.rsvps,[]); assert.deepEqual(state.occupancy,[]);
  } finally {await db.exec('RESET ROLE');}
});
test('host edits compare revision atomically and prevent stale table or delivery overwrites',async()=>{
  actor={role:'host',id:invId}; await usePackage('exclusive');
  const edit=patch=>guestCrud.PATCH(req('/api/guests',{id:guestId,...patch}));
  assert.equal((await edit({tableNo:'Mesa A',expectedRevision:0})).status,200);
  assert.equal((await edit({tableNo:'Mesa B',expectedRevision:0})).status,409);
  assert.equal(await scalar('select table_no as result from guests where id=$1',[guestId]),'Mesa A');
  assert.equal((await edit({sent:true,allowKids:false,expectedRevision:1})).status,200);
  assert.equal(await scalar('select response_revision as result from guests where id=$1',[guestId]),2);
  assert.equal((await edit({name:'Nombre antiguo',expectedRevision:1})).status,409);
  assert.equal((await edit({name:'',expectedRevision:2})).status,400);
  assert.equal((await guestCrud.DELETE(req('/api/guests?guestId='+guestId+'&expectedRevision=1'))).status,409);
  assert.equal((await guestCrud.DELETE(req('/api/guests?guestId='+guestId+'&expectedRevision=2'))).status,200);
});
test('door login uses independent credentials; changing or removing them invalidates sessions',async()=>{
  await usePackage('exclusive');
  const email=invId+'@door.invalid';
  assert.equal((await doorAuth.POST(req('/api/door/auth',{email,password:'test-host-password'}))).status,401);
  assert.equal((await doorAuth.POST(req('/api/door/auth',{email,password:'test-door-password'}))).status,200);
  assert.equal(await getDoorSession(),invId); assert.equal(await getHostSession(),null);
  cookieJar.set('enkarta-host',cookieJar.get('enkarta-door')); assert.equal(await getHostSession(),null);
  cookieJar.set('enkarta-review',cookieJar.get('enkarta-door')); assert.equal(await getReviewSession(),null);
  await db.query('update invitations set door_password_hash=$1 where id=$2',[hashPassword('rotated-door-password'),invId]);
  assert.equal(await getDoorSession(),null);
  await db.query('update invitations set door_password_hash=$1, door_email=null where id=$2',[doorHash,invId]);
  actor={role:'door',id:invId}; assert.equal(await getDoorSession(),null);
});
test('door session expires on the server even if a client replays the cookie',async()=>{
  cookieJar.set('enkarta-door',signDoorSession(invId,doorHash,Math.floor(Date.now()/1000)-1));
  assert.equal(await getDoorSession(),null);
  const valid=signDoorSession(invId,doorHash);
  cookieJar.set('enkarta-door',valid); assert.equal(await getDoorSession(),invId);
  const forged=valid.split('.'); forged[1]=String(Number(forged[1])+86400);
  cookieJar.set('enkarta-door',forged.join('.')); assert.equal(await getDoorSession(),null);
});
test('door can scan only its event, writes attributed idempotent logs and cannot operate guests',async()=>{
  await usePackage('exclusive'); const {guest}=await confirm();
  actor={role:'door',id:invId};
  const lookup=await checkinRoute.GET(req('/api/checkin?scope=door&token='+guest.accessToken));
  assert.equal(lookup.status,200); const g=await lookup.json();
  assert.deepEqual(Object.keys(g.guest).sort(),['accessCode','id','name','tableNo']);
  const operation={scope:'door',attendeeId:g.attendees[0].id,action:'in',expectedRevision:0,requestId:randomUUID()};
  assert.equal((await checkinRoute.POST(req('/api/checkin',operation))).status,200);
  assert.equal((await checkinRoute.POST(req('/api/checkin',operation))).status,200);
  assert.equal(await scalar('select count(*)::int as result from access_log'),1);
  assert.equal(await scalar('select operator as result from access_log'),'door:'+invId);
  assert.equal(await canManageInvitation(invId),false); assert.equal(await canReadResponses(invId),false); assert.equal(await canReviewInvitation(invId),false);
  assert.equal((await guestCrud.GET(req('/api/guests?id='+invId))).status,403);
  assert.equal((await guestCrud.POST(req('/api/guests',{invitationId:invId,name:'No autorizado'}))).status,403);
  assert.equal((await guestCrud.PATCH(req('/api/guests',{id:guestId,name:'No autorizado'}))).status,403);
  assert.equal((await guestCrud.DELETE(req('/api/guests?guestId='+guestId))).status,403);
  assert.equal((await openRoute.GET(req('/api/rsvp?id='+invId))).status,401);
  actor={role:'door',id:otherId};
  assert.equal((await checkinRoute.GET(req('/api/checkin?scope=door&token='+guest.accessToken))).status,404);
  assert.equal((await checkinRoute.POST(req('/api/checkin',operation))).status,403);
});
test('scanner scope cannot borrow another open session and package downgrade stops door access',async()=>{
  await usePackage('exclusive'); const {guest}=await confirm();
  actor={role:'host',id:invId};
  assert.equal((await checkinRoute.GET(req('/api/checkin?scope=door&token='+guest.accessToken))).status,403);
  actor={role:'door',id:invId};
  assert.equal((await checkinRoute.GET(req('/api/checkin?token='+guest.accessToken))).status,403);
  await usePackage('premium');
  assert.equal((await checkinRoute.GET(req('/api/checkin?scope=door&token='+guest.accessToken))).status,403);
  assert.equal((await doorAuth.POST(req('/api/door/auth',{email:invId+'@door.invalid',password:'test-door-password'}))).status,403);
});
test('admin configures door separately, can revoke after downgrade, and sends no credentials to client DTO',async()=>{
  actor={role:'admin'}; await usePackage('exclusive');
  assert.equal((await credentialsRoute.POST(req('/api/admin/host-credentials',{id:invId,scope:'door',email:'door@test.invalid',password:'safe-door-password'}))).status,200);
  const settings=await (await credentialsRoute.GET(req('/api/admin/host-credentials?id='+invId+'&scope=door'))).json();
  assert.deepEqual(settings,{email:'door@test.invalid',hasPassword:true,rsvpDeadline:''});
  assert.equal(await scalar('select host_password_hash as result from invitations where id=$1',[invId]),hostHash);
  await usePackage('premium');
  assert.equal((await credentialsRoute.POST(req('/api/admin/host-credentials',{id:invId,scope:'door',email:'another@test.invalid'}))).status,403);
  assert.equal((await credentialsRoute.POST(req('/api/admin/host-credentials',{id:invId,scope:'door',email:''}))).status,200);
  assert.equal(await scalar('select door_password_hash as result from invitations where id=$1',[invId]),null);
  const {clientInvitation}=require('../src/lib/client-invitation.ts');
  const dto=clientInvitation({config:{},door_email:'secret-email',door_password_hash:'secret-hash'});
  assert.doesNotMatch(JSON.stringify(dto),/secret-/);
});
