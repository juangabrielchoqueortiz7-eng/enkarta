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

const scalar = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.result;
async function rpc(name, params) {
  assert.match(name, /^enkarta_[a-z_]+$/);
  const keys = Object.keys(params);
  return scalar(`select public.${name}(${keys.map((key,i) => `${key} => $${i+1}`).join(',')}) as result`, Object.values(params));
}
const queryClient = (table) => {
  assert.ok(['guests', 'attendees', 'rsvps'].includes(table));
  let columns = '*', filters = [], limit;
  const query = {
    select(value) { columns = value; return this; },
    eq(column,value) { filters.push([column,value]); return this; },
    limit(value) { limit = value; return this; },
    order() { return this; },
    maybeSingle() { this.one = true; return this; },
    single() { this.one = true; return this; },
    async then(ok, fail) {
      try {
        const result = await db.query(`select ${columns} from public.${table}${filters.length ? ' where '+filters.map(([col],i)=>`${col}=$${i+1}`).join(' and ') : ''}${limit ? ' limit '+limit : ''}`, filters.map(([,value])=>value));
        return ok({ data: this.one ? result.rows[0] ?? null : result.rows, error: null });
      } catch(error) { if(fail) return fail(error); throw error; }
    },
  };
  return query;
};
// Replace only production boundaries before importing route handlers.
require.cache[require.resolve('../src/lib/supabase/server.ts')] = { exports: { supabaseAdmin: {
  from: queryClient,
  async rpc(name, params) { if(rpcFailure) return {data:null,error:rpcFailure}; try { return {data:await rpc(name,params),error:null}; } catch(error) { return {data:null,error}; } },
} } };
require.cache[require.resolve('../src/lib/host-session.ts')] = { exports: {
  getAdminSession: async () => actor?.role === 'admin',
  getHostSession: async () => actor?.role === 'host' ? actor.id : null,
  canManageInvitation: async id => actor?.role === 'admin' || (actor?.role === 'host' && actor.id === id),
  invitationIdOfAttendee: async id => scalar('select g.invitation_id as result from attendees a join guests g on g.id=a.guest_id where a.id=$1',[id]),
} };
const { NextRequest } = require('next/server');
const guestRoute = require('../src/app/api/guests/confirm/route.ts');
const openRoute = require('../src/app/api/rsvp/route.ts');
const checkinRoute = require('../src/app/api/checkin/route.ts');
const { parseRsvpInput, eventDay, hasRsvpForm } = require('../src/lib/rsvp-contract.ts');
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
  await db.exec('ALTER TABLE invitations ADD COLUMN views_count integer DEFAULT 0;');
  await db.exec(fs.readFileSync(path.join(root,'migrations/004_builder_cloud_and_analytics.sql'),'utf8'));
  await db.exec('GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role; GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;');
  try {
    await db.exec(migration);
    await db.exec(migration); // Reapplicable without changing data.
  } catch(error) { throw new Error(`Migration: ${error.message} at ${error.position}; ${migration.slice(Math.max(0,Number(error.position)-100),Number(error.position)+100)}`); }
});
beforeEach(async () => {
  actor=null; rpcFailure=null;
  await db.exec('TRUNCATE invitations,guests,attendees,access_log,rsvps,builder_versions CASCADE');
  await db.query("INSERT INTO invitations(id,slug,status,rsvp_deadline) VALUES($1,'test-event','ready',((now() AT TIME ZONE 'America/La_Paz')::date+1)),($2,'other-event','ready',NULL)",[invId,otherId]);
  await db.query("INSERT INTO guests(id,invitation_id,public_id,name,passes) VALUES($1,$2,'TEST0001','Familia Prueba',5)",[guestId,invId]);
});
after(async () => { await db.close(); });

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
