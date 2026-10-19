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
let rpcObserver = null;
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
  assert.ok(['guests', 'attendees', 'access_log', 'rsvps', 'invitations', 'builder_versions', 'builder_review_notes', 'invitation_validity_events', 'save_date_responses', 'commercial_leads', 'commercial_events'].includes(table));
  let columns = '*', filters = [], limit, update, insert, remove, sort = [], historyCursor;
  const query = {
    select(value = '*') { columns = value; return this; },
    eq(column,value) { filters.push([column,value,'=']); return this; },
    gte(column,value) { filters.push([column,value,'>=']); return this; },
    ilike(column,value) { filters.push([column,value,'ILIKE']); return this; },
    or(expression) {
      const match = /^at\.lt\.([^,]+),and\(at\.eq\.([^,]+),id\.lt\.([a-f0-9-]+)\)$/.exec(expression);
      assert.ok(match); assert.equal(match[1],match[2]); historyCursor={at:match[1],id:match[3]}; return this;
    },
    update(value) { update=value; return this; },
    insert(value) { insert=Array.isArray(value) ? value : [value]; return this; },
    delete() { remove=true; return this; },
    limit(value) { limit = value; return this; },
    order(column, options = {}) { sort.push(`${column} ${options.ascending === false ? 'DESC' : 'ASC'}`); return this; },
    maybeSingle() { this.one = true; return this; },
    single() { this.one = true; return this; },
    async then(ok, fail) {
      try {
        if (queryFailure) return ok({data:null,error:queryFailure});
        let values = filters.map(([,value])=>value);
        const conditions=filters.map(([col,,op],i)=>`${col} ${op} $${i+1}`);
        if(historyCursor){values.push(historyCursor.at,historyCursor.id);const n=values.length;conditions.push(`(at < $${n-1} OR (at = $${n-1} AND id < $${n}))`);}
        const where = conditions.length ? ' where '+conditions.join(' and ') : '';
        // PostgREST preserves timestamp microseconds; JS Date (PGlite's default) truncates them.
        const projection=table==='access_log'?columns.replace(/\bat\b/g,`to_char(at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS at`):columns;
        let sql = `select ${projection} from public.${table}${where}${sort.length ? ' order by '+sort.join(',') : ''}${limit ? ' limit '+limit : ''}`;
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
  async rpc(name, params) { if(rpcFailure) return {data:null,error:rpcFailure}; try { const data=await rpc(name,params);if(rpcObserver)await rpcObserver(name,params);return {data,error:null}; } catch(error) { return {data:null,error}; } },
} } };
// Exercise real host/review authorization; only cookies and database transport are isolated.
const { NextRequest } = require('next/server');
const guestRoute = require('../src/app/api/guests/confirm/route.ts');
const openRoute = require('../src/app/api/rsvp/route.ts');
const checkinRoute = require('../src/app/api/checkin/route.ts');
const historyRoute = require('../src/app/api/checkin/history/route.ts');
const receptionRoute = require('../src/app/api/checkin/search/route.ts');
const guestCrud = require('../src/app/api/guests/route.ts');
const adminRoute = require('../src/app/api/admin/invitations/route.ts');
const credentialsRoute = require('../src/app/api/admin/host-credentials/route.ts');
const reviewAuth = require('../src/app/api/review/auth/route.ts');
const hostAuth = require('../src/app/api/host/auth/route.ts');
const doorAuth = require('../src/app/api/door/auth/route.ts');
const dashboardRoute = require('../src/app/api/host/dashboard/route.ts');
const commercialContact = require('../src/app/contacto/whatsapp/route.ts');
const commercialAdmin = require('../src/app/api/admin/commercial/route.ts');
const salesConfig = require('../src/app/api/admin/sales-config/route.ts');
const rosterRoute = require('../src/app/api/host/roster/route.ts');
const managedRosterRoute = require('../src/app/api/guests/roster/route.ts');
const {readGuestCsvFile}=require('../src/lib/guest-csv-file.ts');
const {guessGuestColumn,mapGuestCsvRows}=require('../src/lib/guest-import.ts');
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
    await db.exec(fs.readFileSync(path.join(root,'migrations/016_guest_metadata.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/016_guest_metadata.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/017_guest_import_idempotency.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/017_guest_import_idempotency.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/018_host_roster_pagination.sql'),'utf8'));
    await db.exec(fs.readFileSync(path.join(root,'migrations/018_host_roster_pagination.sql'),'utf8'));
  } catch(error) { throw new Error(`Migration: ${error.message} at ${error.position}; ${migration.slice(Math.max(0,Number(error.position)-100),Number(error.position)+100)}`); }
});
beforeEach(async () => {
  actor=null; rpcFailure=null; queryFailure=null; rpcObserver=null; cookieJar.clear();
  await db.exec('TRUNCATE invitations,guests,attendees,access_log,rsvps,builder_versions,save_date_responses,commercial_events,commercial_leads CASCADE');
  await db.query("INSERT INTO invitations(id,slug,status,rsvp_deadline) VALUES($1,'test-event','ready',((now() AT TIME ZONE 'America/La_Paz')::date+1)),($2,'other-event','ready',NULL)",[invId,otherId]);
  await db.query("UPDATE invitations SET host_email=id::text||'@test.invalid', host_password_hash=$1, review_email=id::text||'@review.invalid', review_password_hash=$2",[hostHash,reviewHash]);
  await db.query("UPDATE invitations SET door_email=id::text||'@door.invalid', door_password_hash=$1",[doorHash]);
  await db.query("INSERT INTO guests(id,invitation_id,public_id,name,passes) VALUES($1,$2,'TEST0001','Familia Prueba',5)",[guestId,invId]);
});
after(async () => { await db.close(); });

const history = (cursor) => historyRoute.GET(req('/api/checkin/history?guestId='+guestId+(actor?.role==='door'?'&scope=door':'')+(cursor?'&cursor='+encodeURIComponent(cursor):'')));
const historySetup = async()=>{await db.query('update invitations set builder_config=$1 where id=$2',[newServiceContract({},'exclusive'),invId]);return confirm();};
test('history records repeated entry/exit, idempotent replays once and exposes a private whitelist',async()=>{
 const {guest}=await historySetup();actor={role:'door',id:invId};let people=(await group()).attendees;
 const first={attendeeId:people[0].id,action:'in',expectedRevision:0,requestId:randomUUID(),scope:'door',invitationId:invId};
 assert.equal((await checkinRoute.POST(req('/api/checkin',first))).status,200);
 assert.equal((await checkinRoute.POST(req('/api/checkin',first))).status,200);
 for(const [revision,action] of [[1,'out'],[2,'in'],[3,'out'],[4,'in']])assert.equal((await checkinRoute.POST(req('/api/checkin',{...first,action,expectedRevision:revision,requestId:randomUUID()}))).status,200);
 const response=await history();assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/private, no-store/);
 const page=await response.json();assert.equal(page.movements.length,5);assert.equal(page.nextCursor,null);assert.equal(page.invitationId,invId);assert.equal(page.guestId,guestId);
 assert.deepEqual(page.movements.map(row=>row.action),['in','out','in','out','in']);
 assert.ok(page.movements.every(row=>row.operatorRole==='door'&&row.seatNo===1));
 assert.deepEqual(Object.keys(page.movements[0]).sort(),['action','at','id','label','operatorRole','seatNo']);
 const wire=JSON.stringify(page);for(const secret of [guest.accessToken,first.requestId,'door:'+invId,'password_hash','phone','message'])assert.ok(!wire.includes(secret));
 assert.equal((await group()).attendees[0].revision,5); // History reads never register movements.
});
test('history keyset pagination handles tied timestamps and new rows without duplicating older pages',async()=>{
 await historySetup();actor={role:'admin'};const people=(await group()).attendees;
 for(let n=1;n<=43;n++)await db.query('insert into access_log(id,guest_id,attendee_id,action,at,operator) values($1,$2,$3,$4,$5,$6)',[`50000000-0000-4000-8000-${String(n).padStart(12,'0')}`,guestId,people[0].id,n%2?'in':'out','2026-01-02T12:00:00.123456Z','host:'+invId]);
 const one=await(await history()).json();assert.equal(one.movements.length,20);assert.ok(one.nextCursor);
 await db.query("insert into access_log(guest_id,attendee_id,action,at) values($1,$2,'in','2026-01-03T12:00:00Z')",[guestId,people[0].id]);
 const two=await(await history(one.nextCursor)).json(),three=await(await history(two.nextCursor)).json();assert.equal(two.movements.length,20);assert.equal(three.movements.length,3);assert.equal(three.nextCursor,null);
 const ids=[...one.movements,...two.movements,...three.movements].map(row=>row.id);assert.equal(new Set(ids).size,43);assert.equal(ids[0],'50000000-0000-4000-8000-000000000043');assert.equal(ids.at(-1),'50000000-0000-4000-8000-000000000001');
});
test('history denies anonymous, review, foreign event and explicit door scope cannot borrow admin cookies',async()=>{
 await historySetup();
 for(const role of [null,'review','host','door']){actor=role?{role,id:role==='review'?invId:otherId}:null;assert.equal((await history()).status,role===null||role==='review'?403:404);}
 actor={role:'admin'};assert.equal((await historyRoute.GET(req('/api/checkin/history?scope=door&guestId='+guestId))).status,403);
 actor={role:'host',id:invId};assert.equal((await history()).status,200);
 actor={role:'door',id:invId};assert.equal((await history()).status,200);
});
test('history rejects rotated session, disabled QR, closed event and unconfirmed group',async()=>{
 await historySetup();actor={role:'door',id:invId};const request=req('/api/checkin/history?scope=door&guestId='+guestId);request.headers.set('X-Enkarta-Scanner-Session','f'.repeat(64));assert.equal((await historyRoute.GET(request)).status,403);
 await db.query('update invitations set builder_config=$1 where id=$2',[newServiceContract({},'premium'),invId]);assert.equal((await history()).status,403);
 await db.query("update invitations set builder_config=$1,status='draft' where id=$2",[newServiceContract({},'exclusive'),invId]);assert.equal((await history()).status,403);
 await db.query("update invitations set status='ready' where id=$1",[invId]);
 await db.query("update guests set status='pending' where id=$1",[guestId]);assert.notEqual((await history()).status,200);
});
test('history validates cursor, fails closed on database faults and distinguishes a real empty history',async()=>{
 await historySetup();actor={role:'admin'};const empty=await(await history()).json();assert.deepEqual(empty.movements,[]);assert.equal(empty.nextCursor,null);
 for(const cursor of ['', 'invalid','2026-01-02T00:00:00.000000Z|bad', '2026-02-30T00:00:00.000000Z|'+guestId, 'x'.repeat(200)])assert.equal((await historyRoute.GET(req('/api/checkin/history?guestId='+guestId+'&cursor='+encodeURIComponent(cursor)))).status,400);
 assert.equal((await historyRoute.GET(req('/api/checkin/history?guestId='+guestId+'&guestId='+otherId))).status,400);
 queryFailure={code:'57014'};assert.equal((await history()).status,503);queryFailure=null;rpcFailure={message:'EVENT_CLOSED'};assert.notEqual((await history()).status,200);
});
test('history does not expose another group and marks old or unknown operators honestly',async()=>{
 await historySetup();actor={role:'admin'};
 await db.query("insert into guests(id,invitation_id,public_id,name) values($1,$2,'FOREIGNHISTORY','Otro grupo')",[otherId,otherId]);
 await db.query("insert into access_log(guest_id,action,operator) values($1,'in','some-private-operator'),($2,'in','admin')",[guestId,otherId]);
 const page=await(await history()).json();assert.equal(page.movements.length,1);assert.equal(page.movements[0].label,'Pase anterior');assert.equal(page.movements[0].seatNo,null);assert.equal(page.movements[0].operatorRole,'unknown');assert.ok(!JSON.stringify(page).includes('some-private-operator'));
});

const rosterRpc = (extra={}) => rpc('enkarta_host_roster',{p_invitation_id:invId,...extra});
test('Unicode guest file imports verified names and contact data once with existing permissions and recovery',async()=>{
 actor={role:'host',id:invId};await db.query('update invitations set builder_config=$1 where id=$2',[newServiceContract({},'exclusive'),invId]);
 const bytes=Buffer.from('\uFEFFNombre\tTeléfono\tPases\tMesa\tGrupo\tNiños\tPreferencia\r\nFamilia Pérez\t70000001\t4\t8\tFamilia\tSí\tTodo el evento\r\nAna Ñandú\t+59170000002\t2\t9\tAmigos\tNo\tRecepción','utf16le');
 const {parsed}=await readGuestCsvFile({name:'lista.txt',size:bytes.length,arrayBuffer:async()=>Uint8Array.from(bytes).buffer});const mapped=mapGuestCsvRows(parsed,Object.fromEntries(parsed.headers.map((name,index)=>[index,guessGuestColumn(name)])));assert.equal(mapped.rows.length,2);assert.deepEqual(mapped.issues,[]);
 const body={invitationId:invId,requestId:randomUUID(),guests:mapped.rows};const first=await guestCrud.POST(req('/api/guests',body));assert.equal(first.status,200);const result=await first.json();assert.equal(result.importedCount,2);assert.equal(result.guests[0].name,'Familia Pérez');assert.equal(result.guests[0].phone,'+59170000001');assert.equal(result.guests[0].passes,4);assert.equal(result.guests[1].eventAccess,'reception');
 const replay=await guestCrud.POST(req('/api/guests',body));assert.equal(replay.status,200);assert.equal((await replay.json()).replayed,true);assert.equal((await db.query('select id from guests where invitation_id=$1',[invId])).rows.length,3);
 actor={role:'door',id:invId};assert.equal((await guestCrud.POST(req('/api/guests',{...body,requestId:randomUUID()}))).status,403);assert.equal((await db.query('select id from access_log')).rows.length,0);
});
test('builder roster paginates and exports beyond 1000 for personal guests without granting hostPanel',async()=>{
 actor={role:'admin'};await db.query('update invitations set builder_config=$1 where id=$2',[newServiceContract({},'premium'),invId]);
 assert.equal(allowsService(newServiceContract({},'premium'),'hostPanel'),false);
 await db.query("insert into guests(invitation_id,public_id,name,passes,guest_metadata) select $1,'BUILDER'||n,'Familia '||lpad(n::text,4,'0'),2,jsonb_build_object('phone','+59170000001') from generate_series(1,1001) n",[invId]);
 const first=await managedRosterRoute.GET(req('/api/guests/roster?id='+invId));assert.equal(first.status,200);assert.match(first.headers.get('Cache-Control'),/no-store/);const page=await first.json();assert.equal(page.guests.length,25);assert.equal(page.metrics.total,1002);assert.deepEqual(page.rows,[]);assert.equal(page.services.qrAccess,false);assert.equal(page.services.tableAssignment,false);
 const last=await managedRosterRoute.GET(req('/api/guests/roster?id='+invId+'&page=41'));assert.equal((await last.json()).guests.length,2);
 const csv=await managedRosterRoute.GET(req('/api/guests/roster?id='+invId+'&format=csv'));assert.equal(csv.status,200);const text=await csv.text();assert.equal(text.split('\r\n').length,1003);assert.ok(text.includes('Familia 1001'));assert.ok(!text.includes('Dentro ahora'));assert.ok(text.includes('Teléfono'));assert.ok(text.includes('/i/test-event?g=BUILDER1001'));
 const duplicates=await managedRosterRoute.POST(req('/api/guests/roster?id='+invId,{candidates:[{name:'Familia 1001',phone:'70000001'}]}));assert.deepEqual((await duplicates.json()).duplicates,[0]);
 actor={role:'host',id:invId};assert.equal((await managedRosterRoute.GET(req('/api/guests/roster?id='+invId))).status,403);assert.equal((await dashboardRoute.GET(req('/api/host/dashboard'))).status,200); // Response-only access remains separate.
});
test('builder preview is explicit, single-event and service-gated while ordinary pages omit QR tokens',async()=>{
 await db.query('update invitations set builder_config=$1 where id=$2',[newServiceContract({},'exclusive'),invId]);const{guest}=await confirm();actor={role:'admin'};
 const list=await managedRosterRoute.GET(req('/api/guests/roster?id='+invId));assert.equal(list.status,200);assert.ok(!(await list.text()).includes(guest.accessToken));
 const preview=await managedRosterRoute.GET(req('/api/guests/roster?id='+invId+'&format=preview&guestId='+guestId));assert.equal(preview.status,200);assert.match(preview.headers.get('Cache-Control'),/no-store/);assert.equal((await preview.json()).guest.accessToken,guest.accessToken);
 await db.query("insert into guests(id,invitation_id,public_id,name) values($1,$2,'OTHERPREVIEW','Otro evento')",[otherId,otherId]);assert.equal((await managedRosterRoute.GET(req('/api/guests/roster?id='+invId+'&format=preview&guestId='+otherId))).status,404);
 await db.query('update invitations set builder_config=$1 where id=$2',[newServiceContract({},'premium'),invId]);
 const limited=await (await managedRosterRoute.GET(req('/api/guests/roster?id='+invId+'&format=preview&guestId='+guestId))).json();assert.equal(limited.guest.accessToken,undefined);assert.equal(limited.guest.accessCode,undefined);assert.equal(limited.guest.tableNo,undefined);
});
test('builder roster denies anonymous, reviewer, door and foreign host across list, CSV, preview and duplicate checks',async()=>{
 for(const role of [null,'review','door','host']){
  actor=role?{role,id:role==='host'?otherId:invId}:null;
  for(const suffix of ['','&format=csv','&format=preview&guestId='+guestId])assert.equal((await managedRosterRoute.GET(req('/api/guests/roster?id='+invId+suffix))).status,403);
  assert.equal((await managedRosterRoute.POST(req('/api/guests/roster?id='+invId,{candidates:[]}))).status,403);
 }
 actor={role:'admin'};await db.query('update invitations set builder_config=$1 where id=$2',[newServiceContract({},'plus'),invId]);assert.equal((await managedRosterRoute.GET(req('/api/guests/roster?id='+invId))).status,403);
});
test('builder CSV rejects concurrent edits and feature downgrades without returning a partial file',async()=>{
 actor={role:'admin'};await db.query("insert into guests(invitation_id,public_id,name) select $1,'BUILDERCHANGE'||n,'Nombre '||n from generate_series(1,251) n",[invId]);
 rpcObserver=async(name,args)=>{if(name==='enkarta_host_roster'&&args.p_page===1){rpcObserver=null;await db.query("update guests set name='Otra revisión' where id=$1",[guestId]);}};
 const changed=await managedRosterRoute.GET(req('/api/guests/roster?id='+invId+'&format=csv'));assert.equal(changed.status,409);assert.equal((await changed.json()).code,'ROSTER_CHANGED');
 rpcObserver=async(name,args)=>{if(name==='enkarta_host_roster'&&args.p_page===1){rpcObserver=null;await db.query('update invitations set builder_config=$1 where id=$2',[newServiceContract({},'premium'),invId]);}};
 assert.equal((await managedRosterRoute.GET(req('/api/guests/roster?id='+invId+'&format=csv'))).status,409);
 rpcObserver=async(name,args)=>{if(name==='enkarta_host_roster'&&args.p_page===2){rpcObserver=null;await db.query("update invitations set slug='changed-during-export' where id=$1",[invId]);}};
 assert.equal((await managedRosterRoute.GET(req('/api/guests/roster?id='+invId+'&format=csv'))).status,409);
});
test('builder roster validates filters, preview IDs and full UTF-8 duplicate batches and fails closed without pagination SQL',async()=>{
 actor={role:'admin'};
 for(const suffix of ['&page=0','&sort=unsafe','&format=unknown','&format=preview&guestId=bad'])assert.equal((await managedRosterRoute.GET(req('/api/guests/roster?id='+invId+suffix))).status,400);
 for(const candidates of [[{name:'',phone:'70000001'}],Array(201).fill({name:'QA'})])assert.equal((await managedRosterRoute.POST(req('/api/guests/roster?id='+invId,{candidates}))).status,400);
 const unicode=await managedRosterRoute.POST(req('/api/guests/roster?id='+invId,{candidates:Array.from({length:200},()=>({name:'界'.repeat(80),phone:'+59170000001'}))}));assert.equal(unicode.status,200);assert.deepEqual((await unicode.json()).duplicates,[]);
 rpcFailure={code:'42883',message:'function unavailable'};assert.equal((await managedRosterRoute.GET(req('/api/guests/roster?id='+invId))).status,503);
});
test('018 WhatsApp phone eligibility agrees with the browser, including legacy and invalid values',async()=>{
 const {normalizeGuestPhone}=require('../src/lib/guest-import.ts');
 for(const phone of ['', '7123 4567', '+59170000001', '0059170000001', "'+59170000001", 'abc71234567', '00000000', '+001', '1'.repeat(16), '(591) 7000-0001'])assert.equal(await scalar('select public.enkarta_roster_phone($1) as result',[phone]),normalizeGuestPhone(phone));
});
test('roster query rejects forged sizes, pages, statuses and selections; encoding roundtrips literal filters',()=>{
 const {parseRosterQuery,rosterParams,defaultRosterQuery,rosterListingKey}=require('../src/lib/roster-query.ts');
 for(const query of ['page=0','page=-2','page=2.5','page=1000001','status=deleted','sort=random','selected=bad','search='+encodeURIComponent('x'.repeat(121))])assert.throws(()=>parseRosterQuery(new URLSearchParams(query)),/INVALID_INPUT/);
 const query={...defaultRosterQuery(),page:7,filter:{...defaultRosterQuery().filter,search:'Pérez & 100%_+',group:'Amigos'},selected:[guestId]};assert.deepEqual(parseRosterQuery(rosterParams(query)),query);
 assert.equal(parseRosterQuery(new URLSearchParams('size=99999')).page,1); // Client cannot change the SQL page size.
 assert.equal(rosterListingKey('/api/host/dashboard?page=2&selected='+guestId),rosterListingKey('/api/host/dashboard?page=2'));
 assert.notEqual(rosterListingKey('/api/host/dashboard?page=2'),rosterListingKey('/api/host/dashboard?page=1'));
});
test('host HTTP pagination bounds the payload, exports all 1002 rows and checks off-page duplicates and selection',async()=>{
 actor={role:'host',id:invId};
 await db.query("insert into guests(invitation_id,public_id,name,passes,guest_metadata) select $1,'HTTPPAGE'||n,'Familia '||lpad(n::text,4,'0'),2,jsonb_build_object('phone','+59170000001','group',case when n%2=0 then 'Pares' else 'Impares' end) from generate_series(1,1001) n",[invId]);
 const page=await dashboardRoute.GET(req('/api/host/dashboard?page=41'));assert.equal(page.status,200);assert.match(page.headers.get('Cache-Control'),/no-store/);const value=await page.json();assert.equal(value.guests.length,2);assert.equal(value.roster.total,1002);assert.equal(value.metrics.total,1002);assert.deepEqual(value.rows,[]);assert.equal(JSON.stringify(value).includes('access_token'),false);
 const selected=await dashboardRoute.GET(req('/api/host/dashboard?search=nothing&selected='+guestId));assert.equal((await selected.json()).selectedGuests[0].id,guestId);
 const csv=await rosterRoute.GET(req('/api/host/roster'));assert.equal(csv.status,200);assert.match(csv.headers.get('Cache-Control'),/no-store/);const text=await csv.text();assert.equal(text.split('\r\n').length,1003);assert.ok(text.includes('Familia 1001'));assert.equal(text.includes('access_token'),false);
 const filtered=await rosterRoute.GET(req('/api/host/roster?group=Pares'));assert.equal((await filtered.text()).split('\r\n').length,501);
 const duplicate=await rosterRoute.POST(req('/api/host/roster',{candidates:[{name:'Familia 1001',phone:'70000001'},{name:'Nueva',phone:'70000001'}]}));assert.equal(duplicate.status,200);assert.deepEqual((await duplicate.json()).duplicates,[0]);
});
test('roster export discards all batches if concurrent edits change the snapshot',async()=>{
 actor={role:'host',id:invId};await db.query("insert into guests(invitation_id,public_id,name) select $1,'CHANGE'||n,'Nombre '||n from generate_series(1,251) n",[invId]);
 rpcObserver=async(name,args)=>{if(name==='enkarta_host_roster'&&args.p_page===1){rpcObserver=null;await db.query("update guests set name='Nueva versión' where id=$1",[guestId]);}};
 const response=await rosterRoute.GET(req('/api/host/roster'));assert.equal(response.status,409);assert.equal((await response.json()).code,'ROSTER_CHANGED');
});
test('roster duplicate preview accepts 200 valid names with the maximum UTF-8 length',async()=>{
 actor={role:'host',id:invId};
 const candidates=Array.from({length:200},()=>({name:'界'.repeat(80),phone:'+59170000001'}));
 assert.ok(Buffer.byteLength(JSON.stringify({candidates}),'utf8')>40000);
 const response=await rosterRoute.POST(req('/api/host/roster',{candidates}));assert.equal(response.status,200);assert.deepEqual((await response.json()).duplicates,[]);
});
test('roster endpoints deny anonymous, reviewer, door and foreign-event callers, validate candidates, and fail closed without 018',async()=>{
 for(const role of [null,'review','door','host']){
  actor=role?{role,id:role==='host'?otherId:invId}:null;
  assert.equal((await rosterRoute.GET(req('/api/host/roster?id='+invId))).status,403);
  assert.equal((await rosterRoute.POST(req('/api/host/roster?id='+invId,{candidates:[]}))).status,403);
 }
 actor={role:'host',id:invId};
 for(const candidates of [[{name:'',phone:'70000001'}],[{name:'Válido',phone:123}],Array(201).fill({name:'Válido'})])assert.equal((await rosterRoute.POST(req('/api/host/roster',{candidates}))).status,400);
 assert.equal((await rosterRoute.POST(req('/api/host/roster',{candidates:[]},undefined))).status,200);
 rpcFailure={code:'PGRST202',message:'Missing RPC'};
 const response=await dashboardRoute.GET(req('/api/host/dashboard'));assert.equal(response.status,503);assert.equal((await response.json()).code,'MIGRATION_REQUIRED');
 assert.equal((await rosterRoute.GET(req('/api/host/roster'))).status,503);
});
test('018 paginates in PostgreSQL beyond 1000 rows, with global totals and stable unique pages',async()=>{
 await db.query("insert into guests(invitation_id,public_id,name,passes,guest_metadata) select $1,'PAGE'||n,lpad(n::text,4,'0')||' Familia',2,jsonb_build_object('phone','+59170000001','group',case when n%2=0 then 'Familia' else 'Amigos' end) from generate_series(1,1001) n",[invId]);
 const first=await rosterRpc();assert.equal(first.guests.length,25);assert.equal(first.roster.total,1002);assert.equal(first.roster.pages,41);assert.equal(first.metrics.passes,2007);assert.equal(first.metrics.total,1002);
 const last=await rosterRpc({p_page:999});assert.equal(last.roster.page,41);assert.equal(last.guests.length,2);assert.equal(last.roster.from,1001);assert.equal(last.roster.to,1002);
 const second=await rosterRpc({p_page:2});assert.equal(new Set([...first.guests,...second.guests].map(g=>g.id)).size,50);assert.equal(first.roster.version,second.roster.version);
 assert.equal(first.roster.reminderQueue.ids.length,200);assert.equal(first.roster.reminderQueue.overflow,801);assert.equal(first.roster.reminderQueue.invalidPhone,1);
 const filtered=await rosterRpc({p_filter:{search:'1001'}});assert.equal(filtered.guests.length,1);assert.equal(filtered.metrics.total,1002);assert.equal(filtered.roster.total,1);assert.equal(filtered.roster.groups.length,2);
 const exportPage=await rosterRpc({p_size:250});assert.equal(exportPage.guests.length,250);assert.equal(exportPage.roster.total,1002);
});
test('018 scopes selected guests, duplicates and metrics to the event and revokes public execution',async()=>{
 const foreign=randomUUID();await db.query("insert into guests(id,invitation_id,public_id,name,passes,guest_metadata) values($1,$2,'FOREIGN','Secreto',1,'{\"phone\":\"+59170000001\"}')",[foreign,otherId]);
 const result=await rosterRpc({p_filter:{search:'No existe'},p_selected:[guestId,foreign]});assert.equal(result.guests.length,0);assert.equal(result.roster.from,0);assert.equal(result.selectedGuests.length,1);assert.equal(result.selectedGuests[0].id,guestId);assert.equal(result.metrics.total,1);
 assert.deepEqual(await rpc('enkarta_roster_duplicates',{p_invitation_id:invId,p_candidates:[{name:'Fámilia   Prueba'},{name:'Secreto',phone:'+59170000001'}]}),[0]);
 for(const role of ['anon','authenticated'])for(const fn of ['enkarta_host_roster(uuid,jsonb,integer,integer,uuid[],boolean,boolean)','enkarta_roster_duplicates(uuid,jsonb)'])assert.equal(await scalar('select has_function_privilege($1,$2,\'EXECUTE\') as result',[role,'public.'+fn]),false);
 for(const args of [{p_page:0},{p_size:1000},{p_selected:[guestId,foreign,randomUUID()]}])await assert.rejects(rosterRpc(args),/INVALID_INPUT/);
});
test('018 matches accents and literal search, delivery, access and natural table order',async()=>{
 await db.query("update guests set name='Álvaro 100%_literal',table_no='Mesa 10',guest_metadata='{\"phone\":\"7123 4567\",\"group\":\"Amigos\"}' where id=$1",[guestId]);
 await db.query("insert into guests(invitation_id,public_id,name,passes,table_no) values($1,'SORT2','Alvaro','2','Mesa 2'),($1,'SORT3','Alvaro',1,null)",[invId]);
 assert.equal((await rosterRpc({p_filter:{search:'alvaro'}})).guests.length,3);
 assert.equal((await rosterRpc({p_filter:{search:'100%_'}})).guests.length,1);
 assert.equal((await rosterRpc({p_filter:{search:'%not wildcard'}})).guests.length,0);
 assert.deepEqual((await rosterRpc({p_filter:{sort:'table'}})).guests.map(g=>g.table_no),['Mesa 2','Mesa 10',null]);
 assert.equal((await rosterRpc({p_filter:{group:'Amigos'}})).roster.total,1);
 await confirm({passes:2,expectedRevision:1});const seats=await group();await scan(seats.attendees[0]);
 assert.equal((await rosterRpc({p_filter:{access:'inside'}})).roster.total,1);assert.equal((await rosterRpc()).metrics.checkedIn,1);
 assert.equal((await rosterRpc({p_filter:{delivery:'responded'}})).roster.total,1);
 const noQr=await rosterRpc({p_qr:false,p_tables:false,p_filter:{search:'Mesa 10'}});assert.equal(noQr.roster.total,0);assert.deepEqual(noQr.roster.tables,[]);assert.equal(noQr.metrics.checkedIn,0);
 const before=(await rosterRpc()).roster.version;await db.query("update guests set name='Otro' where id=$1",[guestId]);assert.notEqual((await rosterRpc()).roster.version,before);
});

test('016 migrates legacy contacts without changing the design and never restores a cleared contact',async()=>{
 const config={package:'exclusive',theme:{primary:'#123456'},guestMeta:{TEST0001:{phone:'7123 4567',group:'Familia',eventAccess:'ceremony',unexpected:'ignored'}}};
 await db.query('update invitations set builder_config=$1 where id=$2',[config,invId]);
 await db.exec('alter table guests alter column guest_metadata drop not null');
 await db.query('update guests set guest_metadata=null where id=$1',[guestId]);
 const sql=fs.readFileSync(path.join(root,'migrations/016_guest_metadata.sql'),'utf8');
 await db.exec(sql);
 assert.deepEqual(await scalar('select guest_metadata as result from guests where id=$1',[guestId]),{phone:'7123 4567',group:'Familia',eventAccess:'ceremony'});
 assert.deepEqual(await scalar('select builder_config as result from invitations where id=$1',[invId]),config);
 await db.query('update guests set guest_metadata=$1 where id=$2',[{},guestId]);
 await db.exec(sql);
 assert.deepEqual(await scalar('select guest_metadata as result from guests where id=$1',[guestId]),{});
 for(const role of ['anon','authenticated']) assert.equal(await scalar("select has_table_privilege($1,'public.guests','SELECT') as result",[role]),false);
 await assert.rejects(db.query("update guests set guest_metadata='[]' where id=$1",[guestId]),/guests_metadata_object/);
});
test('016 handles string JSON and malformed legacy values while preserving the original backup',async()=>{
 const config=JSON.stringify({guestMeta:{TEST0001:{phone:'71234567',group:27,eventAccess:'invalid'}}});
 await db.query('update invitations set builder_config=$1 where id=$2',[JSON.stringify(config),invId]);
 await db.exec('alter table guests alter column guest_metadata drop not null');
 await db.query('update guests set guest_metadata=null where id=$1',[guestId]);
 await db.exec(fs.readFileSync(path.join(root,'migrations/016_guest_metadata.sql'),'utf8'));
 assert.deepEqual(await scalar('select guest_metadata as result from guests where id=$1',[guestId]),{phone:'71234567'});
 assert.equal(await scalar('select builder_config as result from invitations where id=$1',[invId]),config);
});
test('guest creation stores normalized contact and group atomically and invalid metadata rejects the entire batch',async()=>{
 actor={role:'host',id:invId};
 for(const bad of [{phone:'abc71234567'},{phone:123},{group:'x'.repeat(41)},{eventAccess:'backstage'}]) {
  const response=await guestCrud.POST(req('/api/guests',{requestId:randomUUID(),invitationId:invId,guests:[{name:'Valid',passes:2,phone:'71234567'},{name:'Bad',...bad}]}));
  assert.equal(response.status,400);
 }
 assert.equal(await scalar('select count(*)::int as result from guests'),1);
 const response=await guestCrud.POST(req('/api/guests',{requestId:randomUUID(),invitationId:invId,name:'Familia Nueva',passes:4,phone:'7123 4567',group:' Amigos ',eventAccess:'reception'}));
 assert.equal(response.status,200); const guest=(await response.json()).guests[0];
 assert.equal(guest.phone,'+59171234567'); assert.equal(guest.group,'Amigos'); assert.equal(guest.metadataStored,true);
 assert.deepEqual(await scalar('select guest_metadata as result from guests where id=$1',[guest.id]),{phone:guest.phone,group:'Amigos',eventAccess:'reception'});
 assert.equal(await scalar('select builder_config as result from invitations where id=$1',[invId]),null);
});
test('guest creation requires a request identity and never writes for an obsolete client',async()=>{
 actor={role:'host',id:invId};
 for(const requestId of [undefined,'not-a-uuid',123]) {
  const response=await guestCrud.POST(req('/api/guests',{invitationId:invId,requestId,name:'No crear'}));
  assert.equal(response.status,400);assert.equal((await response.json()).code,'IMPORT_REQUEST_REQUIRED');
 }
 assert.equal(await scalar('select count(*)::int as result from guests'),1);
 assert.equal(await scalar('select count(*)::int as result from guest_import_requests'),0);
});
test('competing retries import a batch once even though public identifiers are generated afresh',async()=>{
 actor={role:'host',id:invId};
 const operation={invitationId:invId,requestId:randomUUID(),guests:[{name:'Primero',passes:2,phone:'71234567'},{name:'Segundo',passes:1}]};
 const replies=await Promise.all([1,2,3].map(()=>guestCrud.POST(req('/api/guests',operation))));
 for(const reply of replies) assert.equal(reply.status,200,JSON.stringify(await reply.clone().json()));
 const values=await Promise.all(replies.map(reply=>reply.json()));
 assert.equal(values.filter(value=>!value.replayed).length,1);
 values.forEach(value=>{assert.deepEqual(value.guests.map(g=>g.id),values[0].guests.map(g=>g.id));assert.equal(value.importedCount,2);assert.equal(value.missingCount,0);assert.equal(value.requestId,operation.requestId);});
 assert.equal(await scalar('select count(*)::int as result from guests'),3);
 assert.equal(await scalar('select count(*)::int as result from guest_import_requests'),1);
});
test('guest import client recovers an actually committed batch after losing its HTTP response',async()=>{
 actor={role:'host',id:invId};
 const {submitGuestImport,GuestImportError}=require('../src/lib/guest-import-operation.ts');
 const operation={invitationId:invId,requestId:randomUUID(),guests:[{name:'Familia desconectada',passes:4,allowKids:true,eventAccess:'both'}]};
 let lose=true;const bodies=[];
 const transport=async(_url,options)=>{bodies.push(options.body);const result=await guestCrud.POST(req('/api/guests',JSON.parse(options.body)));assert.equal(result.status,200);if(lose){lose=false;throw new TypeError('lost after commit');}return result;};
 await assert.rejects(submitGuestImport(operation,transport),error=>error instanceof GuestImportError && error.uncertain);
 const result=await submitGuestImport(operation,transport);
 assert.equal(result.replayed,true);assert.equal(result.importedCount,1);assert.equal(bodies[0],bodies[1]);
 assert.equal(await scalar('select count(*)::int as result from guests'),2);
});
test('reusing an import identity with changed content or ordering is rejected atomically',async()=>{
 actor={role:'host',id:invId};
 const operation={invitationId:invId,requestId:randomUUID(),guests:[{name:'A',passes:2,phone:'71234567',tableNo:'7'},{name:'B',passes:1}]};
 assert.equal((await guestCrud.POST(req('/api/guests',operation))).status,200);
 for(const guests of [operation.guests.slice().reverse(),operation.guests.slice(0,1),...[
  {name:'Changed'},{passes:3},{phone:'76543210'},{tableNo:'8'},{group:'VIP'},{allowKids:false},{sent:true},
 ].map(patch=>[{...operation.guests[0],...patch},operation.guests[1]])]) {
  const response=await guestCrud.POST(req('/api/guests',{...operation,guests}));assert.equal(response.status,409);assert.equal((await response.json()).code,'REQUEST_REUSED');
 }
 assert.equal(await scalar('select count(*)::int as result from guests'),3);
});
test('import replay returns current confirmations and contacts and never recreates a deleted row',async()=>{
 actor={role:'host',id:invId};
 const operation={invitationId:invId,requestId:randomUUID(),guests:[{name:'Conservar',passes:4,phone:'71234567'},{name:'Borrar',passes:1}]};
 const first=await (await guestCrud.POST(req('/api/guests',operation))).json();const [saved,removed]=first.guests;
 assert.equal((await guestCrud.PATCH(req('/api/guests',{id:saved.id,expectedRevision:0,phone:'76543210',group:'Nuevo'}))).status,200);
 const confirmation=await guestRoute.POST(req('/api/guests/confirm',guestInput({publicId:saved.publicId,expectedRevision:1,passes:3})));assert.equal(confirmation.status,200);
 assert.equal((await guestCrud.DELETE(req('/api/guests?guestId='+removed.id+'&expectedRevision=0'))).status,200);
 const result=await (await guestCrud.POST(req('/api/guests',operation))).json();
 assert.equal(result.replayed,true);assert.equal(result.importedCount,2);assert.equal(result.missingCount,1);assert.equal(result.guests.length,1);
 assert.equal(result.guests[0].phone,'+59176543210');assert.equal(result.guests[0].group,'Nuevo');assert.equal(result.guests[0].status,'confirmed');assert.equal(result.guests[0].confirmedPasses,3);assert.equal(result.guests[0].responseRevision,2);
 assert.equal(await scalar('select count(*)::int as result from guests'),2);
});
test('a database failure rolls back the whole import and its ledger, allowing a safe retry',async()=>{
 const input={p_invitation_id:invId,p_request_id:randomUUID(),p_guests:[
  {public_id:'NEWABCDE',name:'Rollback',table_no:null,passes:2,allow_kids:true,sent:false,guest_metadata:{}},
  {public_id:'TEST0001',name:'Collision',table_no:null,passes:1,allow_kids:true,sent:false,guest_metadata:{}},
 ]};
 // Match an existing valid public ID to provoke a UNIQUE violation on row 2.
 await db.query("update guests set public_id='TESTABCD' where id=$1",[guestId]);input.p_guests[1].public_id='TESTABCD';
 await assert.rejects(rpc('enkarta_import_guests',input),/duplicate key/);
 assert.equal(await scalar('select count(*)::int as result from guests'),1);
 assert.equal(await scalar('select count(*)::int as result from guest_import_requests'),0);
 input.p_guests[1].public_id='NEWBCDEF';const result=await rpc('enkarta_import_guests',input);assert.equal(result.importedCount,2);assert.equal(result.replayed,false);
});
test('import ledger is private, scoped to the event, reappliable, and removed with the event',async()=>{
 actor={role:'admin'};const requestId=randomUUID();
 for(const invitationId of [invId,otherId]) assert.equal((await guestCrud.POST(req('/api/guests',{invitationId,requestId,name:'Mismo nombre'}))).status,200);
 await db.exec(fs.readFileSync(path.join(root,'migrations/017_guest_import_idempotency.sql'),'utf8'));
 assert.equal(await scalar('select count(*)::int as result from guest_import_requests'),2);
 for(const role of ['anon','authenticated']) {
  assert.equal(await scalar(`select has_table_privilege('${role}','public.guest_import_requests','SELECT') as result`),false);
  assert.equal(await scalar(`select has_function_privilege('${role}','public.enkarta_import_guests(uuid,uuid,jsonb,boolean)','EXECUTE') as result`),false);
 }
 assert.equal(await scalar("select has_function_privilege('service_role','public.enkarta_import_guests(uuid,uuid,jsonb,boolean)','EXECUTE') as result"),true);
 const columns=(await db.query("select column_name from information_schema.columns where table_name='guest_import_requests' order by ordinal_position")).rows.map(row=>row.column_name);
 assert.deepEqual(columns,['invitation_id','request_id','payload_hash','guest_ids','created_at']);
 await db.query('delete from invitations where id=$1',[otherId]);assert.equal(await scalar('select count(*)::int as result from guest_import_requests'),1);
});
test('import retries recheck current access and a missing RPC never falls back to unprotected writes',async()=>{
 actor={role:'host',id:invId};const operation={invitationId:invId,requestId:randomUUID(),name:'Privado'};
 assert.equal((await guestCrud.POST(req('/api/guests',operation))).status,200);
 for(const role of [null,'review','door','otherHost']) {actor=role?{role:role==='otherHost'?'host':role,id:otherId}:null;assert.equal((await guestCrud.POST(req('/api/guests',operation))).status,403);}
 actor={role:'host',id:invId};rpcFailure={code:'PGRST202'};
 const response=await guestCrud.POST(req('/api/guests',{...operation,requestId:randomUUID()}));assert.equal(response.status,503);assert.equal((await response.json()).code,'MIGRATION_REQUIRED');
 assert.equal(await scalar('select count(*)::int as result from guests'),2);
});
test('a replay survives table entitlement changes without changing the original import or leaking the table',async()=>{
 actor={role:'host',id:invId};const operation={invitationId:invId,requestId:randomUUID(),name:'Mesa privada',tableNo:'7'};
 const first=await (await guestCrud.POST(req('/api/guests',operation))).json();assert.equal(first.guests[0].tableNo,'7');
 await db.query('update invitations set builder_config=$1 where id=$2',[{...newServiceContract({},'exclusive'),features:{tableAssignment:false}},invId]);
 const response=await guestCrud.POST(req('/api/guests',operation));assert.equal(response.status,200);
 const result=await response.json();assert.equal(result.replayed,true);assert.equal(result.guests[0].tableNo,undefined);
 assert.equal(await scalar('select table_no as result from guests where id=$1',[first.guests[0].id]),'7');
 const created=await (await guestCrud.POST(req('/api/guests',{...operation,requestId:randomUUID(),name:'Sin mesa'}))).json();
 assert.equal(await scalar('select table_no as result from guests where id=$1',[created.guests[0].id]),null);
});
test('contact and seat edits commit together, conflict atomically, and cleared values cannot fall back to old design data',async()=>{
 actor={role:'host',id:invId};
 await db.query('update invitations set builder_config=$1 where id=$2',[{guestMeta:{TEST0001:{phone:'old-private',group:'OLD'}}},invId]);
 const edit=patch=>guestCrud.PATCH(req('/api/guests',{id:guestId,...patch}));
 const response=await edit({expectedRevision:0,phone:'71234567',group:'VIP',tableNo:'9'}); assert.equal(response.status,200);
 const guest=(await response.json()).guest; assert.equal(guest.responseRevision,1); assert.equal(guest.phone,'+59171234567'); assert.equal(guest.tableNo,'9');
 assert.equal((await edit({expectedRevision:0,phone:'76543210',tableNo:'old'})).status,409);
 assert.equal((await edit({expectedRevision:1,phone:'bad',tableNo:'not saved'})).status,400);
 assert.equal(await scalar('select table_no as result from guests where id=$1',[guestId]),'9');
 const cleared=await edit({expectedRevision:1,phone:'',group:''}); assert.equal(cleared.status,200); assert.equal((await cleared.json()).guest.responseRevision,2);
 const list=await (await guestCrud.GET(req('/api/guests?id='+invId))).json(); assert.equal(list[0].phone,''); assert.equal(list[0].group,'');
 const dashboard=await (await dashboardRoute.GET(req('/api/host/dashboard'))).json(); assert.equal(dashboard.guests[0].phone,''); assert.equal(dashboard.guests[0].group,'');
 assert.equal((await scalar('select builder_config as result from invitations where id=$1',[invId])).guestMeta.TEST0001.phone,'old-private');
});
test('competing contact edits acknowledge only one revision and never overwrite each other',async()=>{
 actor={role:'host',id:invId};
 const attempts=await Promise.all(['Amigos','Familia'].map(group=>guestCrud.PATCH(req('/api/guests',{id:guestId,expectedRevision:0,group}))));
 assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);
 assert.equal(await scalar('select response_revision as result from guests where id=$1',[guestId]),1);
 const winner=await attempts.find(r=>r.status===200).json();
 assert.equal((await scalar('select guest_metadata as result from guests where id=$1',[guestId])).group,winner.guest.group);
});
test('private contact is visible to organizers but absent from public RSVP and reception payloads',async()=>{
 actor={role:'host',id:invId};
 const contact={phone:'+59171234567',group:'PRIVATE-GROUP',eventAccess:'reception'};
 assert.equal((await guestCrud.PATCH(req('/api/guests',{id:guestId,expectedRevision:0,...contact}))).status,200);
 const list=await (await guestCrud.GET(req('/api/guests?id='+invId))).json(); assert.equal(list[0].phone,contact.phone);
 const accepted=await confirm({expectedRevision:1});
 for(const response of [accepted,await (await guestRoute.GET(req('/api/guests/confirm?slug=test-event&publicId=TEST0001'))).json()]) assert.doesNotMatch(JSON.stringify(response),/PRIVATE-GROUP|59171234567|metadataStored|guest_metadata/);
 const reception=await checkinRoute.GET(req('/api/checkin?code='+accepted.guest.accessCode));
 assert.equal(reception.status,200); assert.doesNotMatch(JSON.stringify(await reception.json()),/PRIVATE-GROUP|59171234567|guest_metadata/);
 const dashboard=await (await dashboardRoute.GET(req('/api/host/dashboard'))).json(); assert.equal(dashboard.guests[0].group,contact.group);
 for(const role of ['review','door']) { actor={role,id:invId}; assert.equal((await guestCrud.PATCH(req('/api/guests',{id:guestId,expectedRevision:2,phone:'76543210'}))).status,403); }
});

test('guest edits and deletes require a revision and reject fractional passes',async()=>{
 actor={role:'host',id:invId};
 let response=await guestCrud.PATCH(req('/api/guests',{id:guestId,name:'No guardar'}));
 assert.equal(response.status,400); assert.equal((await response.json()).code,'GUEST_REVISION_REQUIRED');
 response=await guestCrud.DELETE(req('/api/guests?guestId='+guestId));
 assert.equal(response.status,400); assert.equal((await response.json()).code,'GUEST_REVISION_REQUIRED');
 for(const passes of [0,21,2.5,'2']) {
  response=await guestCrud.PATCH(req('/api/guests',{id:guestId,expectedRevision:0,passes}));
  assert.equal(response.status,400); assert.equal((await response.json()).code,'INVALID_PASSES');
 }
 assert.equal(await scalar('select count(*)::int as result from guests'),1);
 assert.equal(await scalar('select response_revision as result from guests where id=$1',[guestId]),0);
});
test('invalid import batches fail entirely, while 200 long names fit the body budget',async()=>{
 actor={role:'host',id:invId};
 for(const bad of [{name:'Error',passes:2.5},{name:'Error',passes:21},{name:'Error',passes:'2'},{name:'a'.repeat(81)},null]) {
  const response=await guestCrud.POST(req('/api/guests',{requestId:randomUUID(),invitationId:invId,guests:[{name:'Válido',passes:2},bad]}));
  assert.equal(response.status,400);
 }
 assert.equal(await scalar('select count(*)::int as result from guests'),1);
 const guests=Array.from({length:200},(_,i)=>({name:`${i} ${'Á'.repeat(75)}`,passes:2,allowKids:true,tableNo:'8'}));
 const response=await guestCrud.POST(req('/api/guests',{requestId:randomUUID(),invitationId:invId,guests}));
 assert.equal(response.status,200,JSON.stringify(await response.clone().json())); assert.equal((await response.json()).guests.length,200);
 const tooMany=await guestCrud.POST(req('/api/guests',{requestId:randomUUID(),invitationId:invId,guests:[...guests,guests[0]]})); assert.equal(tooMany.status,400);
});
test('guest reads report outages and guest imports reject foreign origins and oversized bodies',async()=>{
 actor={role:'admin'};
 queryFailure={message:'unavailable'};
 let response=await guestCrud.GET(req('/api/guests?id='+invId)); assert.equal(response.status,503); assert.equal((await response.json()).code,'SERVICE_UNAVAILABLE');
 queryFailure=null;
 response=await guestCrud.POST(new NextRequest('http://localhost:3001/api/guests',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://foreign.invalid'},body:JSON.stringify({invitationId:invId,name:'No importar'})}));
 assert.equal(response.status,400);
 response=await guestCrud.POST(req('/api/guests',{requestId:randomUUID(),invitationId:invId,name:'Prueba',extra:'á'.repeat(66000)})); assert.equal(response.status,400);
 assert.equal(await scalar('select count(*)::int as result from guests'),1);
});

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

test('queue client recovers a committed reminder after a lost HTTP response without counting it twice',async()=>{
 actor={role:'host',id:invId};
 const {trackGuestDelivery}=require('../src/lib/whatsapp-queue.ts');
 const operation={guestId,action:'reminder',expectedRevision:0,requestId:randomUUID()};
 let lost=true;const transport=async(url,init)=>{
  const response=await deliveryRoute.POST(req(url,JSON.parse(init.body)));
  if(lost){lost=false;assert.equal(response.status,200);throw new TypeError('response lost after commit');}
  return response;
 };
 await assert.rejects(trackGuestDelivery(operation,transport),error=>error.retryable===true);
 const saved=await trackGuestDelivery(operation,transport);assert.equal(saved.reminderCount,1);assert.equal(saved.responseRevision,1);assert.equal(saved.sent,false);
 const manual=await trackGuestDelivery({guestId,action:'manual',expectedRevision:1,requestId:randomUUID()},transport);
 assert.equal(manual.sent,true);assert.equal(manual.deliveryStatus,'marked');assert.equal(manual.reminderCount,1);
 await confirm({expectedRevision:2});
 await assert.rejects(trackGuestDelivery({guestId,action:'reminder',expectedRevision:3,requestId:randomUUID()},transport),error=>error.retryable===false);
 assert.equal(await scalar('select reminder_count as result from guests where id=$1',[guestId]),1);
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

test('commercial handoff records only an intent and preserves public design, package and campaign',async()=>{
 const session=randomUUID(),request=new NextRequest('https://enkarta.test/contacto/whatsapp?package=premium&design=azure&placement=qa_contact&utm_campaign=qa_campaign',{headers:{Cookie:`enkarta-commercial=${session}`}});
 const response=await commercialContact.GET(request);assert.equal(response.status,302);assert.equal(response.headers.get('cache-control'),'no-store');
 const destination=new URL(response.headers.get('location'));assert.equal(destination.origin,'https://wa.me');const message=destination.searchParams.get('text');assert.match(message,/diseño Lunaria/);assert.match(message,/Premium de 930 Bs/);
 const lead=(await db.query('select * from commercial_leads')).rows[0];assert.equal(lead.design,'Lunaria');assert.equal(lead.status,'whatsapp_open');assert.equal(lead.utm_campaign,'qa_campaign');assert.equal(lead.session_hash,createHash('sha256').update('enkarta-commercial:'+session).digest('hex'));assert.ok(message.includes(lead.reference));assert.equal(lead.revenue_bs,null);
 assert.equal(await scalar("select count(*)::int as result from commercial_events where event_type='whatsapp_open'"),1);
 await db.query('update commercial_leads set design=$1 where id=$2',['azure',lead.id]); // Historical technical key, not a data migration.
 actor={role:'admin'};const dashboard=await commercialAdmin.GET();assert.equal(dashboard.status,200);const body=await dashboard.json();
 assert.equal(body.leads[0].design,'Lunaria');assert.equal(body.designs[0].label,'Lunaria');assert.equal(body.statuses[0].label,'Intento de contacto');assert.equal(body.summary.contacts,0);
 assert.equal(await scalar('select design as result from commercial_leads where id=$1',[lead.id]),'azure','Reading the panel must not rewrite legacy records');
 actor=null;assert.equal((await commercialAdmin.GET()).status,401);
});

test('commercial handoff infers original preset names and the legacy carmesi demo correctly',async()=>{
 for(const [demo,name]of [['nicole-y-francisco','Nicole y Francisco'],['carmesi','Granate']]){
  const response=await commercialContact.GET(new NextRequest('https://enkarta.test/contacto/whatsapp?placement=qa_demo',{headers:{referer:'https://enkarta.test/muestra/'+demo}}));
  assert.equal(response.status,302);const message=new URL(response.headers.get('location')).searchParams.get('text');assert.ok(message.includes('diseño '+name));assert.ok(!message.includes('Edición Enkarta'));
 }
 assert.equal(await scalar("select count(*)::int as result from commercial_leads where status<>'whatsapp_open'"),0);
});

test('sales config is admin-only and never cacheable for other roles',async()=>{
 for(const value of [null,{role:'host',id:invId},{role:'review',id:invId},{role:'door',id:invId},{role:'partner',id:invId}]){actor=value;const response=await salesConfig.GET();assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).draftScope,undefined);}
});
test('sales draft binding stays stable for one signed admin session and changes with a renewed session',async()=>{
 const previous=process.env.ENKARTA_PAYMENT_INSTRUCTIONS;process.env.ENKARTA_PAYMENT_INSTRUCTIONS='QA INSTRUCCIONES SIN PAGO REAL';
 try{
  actor=null;const expiry=Math.floor(Date.now()/1000)+3600,cookie=signAdminSession(expiry);cookieJar.set('enkarta-admin',cookie);
  const response=await salesConfig.GET();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const config=await response.json();
  assert.match(config.draftScope,/^[a-f0-9]{64}$/);assert.equal(config.paymentConfigured,true);assert.equal(config.paymentInstructions,'QA INSTRUCCIONES SIN PAGO REAL');assert.ok(!JSON.stringify(config).includes(cookie));
  assert.equal((await(await salesConfig.GET()).json()).draftScope,config.draftScope);
  cookieJar.set('enkarta-admin',signAdminSession(expiry+60));assert.notEqual((await(await salesConfig.GET()).json()).draftScope,config.draftScope);
  process.env.ENKARTA_PAYMENT_INSTRUCTIONS='';assert.equal((await(await salesConfig.GET()).json()).paymentConfigured,false);
 }finally{if(previous===undefined)delete process.env.ENKARTA_PAYMENT_INSTRUCTIONS;else process.env.ENKARTA_PAYMENT_INSTRUCTIONS=previous;}
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
test('reception search is scoped to the signed host or door event and rejects reviewers and cross-scope sessions',async()=>{
 await confirm();const url='/api/checkin/search?invitationId='+invId+'&q=Familia';
 for(const role of [null,'review']) {actor=role?{role,id:invId}:null;assert.equal((await receptionRoute.GET(req(url))).status,403);}
 actor={role:'host',id:otherId};assert.equal((await receptionRoute.GET(req(url))).status,403);
 actor={role:'host',id:invId};assert.equal((await receptionRoute.GET(req(url+'&scope=door'))).status,403);
 assert.equal((await receptionRoute.GET(req(url))).status,200);
 actor={role:'door',id:invId};assert.equal((await receptionRoute.GET(req(url))).status,403);
 const response=await receptionRoute.GET(req(url+'&scope=door'));assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal((await receptionRoute.GET(req(url.replace(invId,otherId)+'&scope=door'))).status,403);
 actor={role:'admin'};assert.equal((await receptionRoute.GET(req('/api/checkin/search?q=Familia'))).status,400);
});
test('reception search exposes only confirmed group identity, authorized table and confirmed capacity, without checking anyone in',async()=>{
 await db.query('update guests set table_no=$1,guest_metadata=$2,message=$3 where id=$4',['7',{phone:'+59171234567',group:'PRIVATE-CONTACT'},'PRIVATE-MESSAGE',guestId]);
 await db.query("insert into guests(invitation_id,public_id,name,passes,status) values($1,'PENDINGX','Familia pendiente',2,'pending'),($1,'DECLINEX','Familia rechazada',2,'declined'),($2,'FOREIGNX','Familia ajena',2,'confirmed')",[invId,otherId]);
 const accepted=await confirm({passes:3,expectedRevision:1});actor={role:'door',id:invId};
 const response=await receptionRoute.GET(req('/api/checkin/search?scope=door&q=Familia'));assert.equal(response.status,200);
 const value=await response.json();assert.deepEqual(value,{invitationId:invId,guests:[{id:guestId,name:'Familia Prueba',tableNo:'7',passes:3}],hasMore:false});
 assert.doesNotMatch(JSON.stringify(value),new RegExp('PRIVATE|accessToken|access_token|59171234567|'+accepted.guest.accessToken));
 const found=await checkinRoute.GET(req('/api/checkin?scope=door&guestId='+guestId));assert.equal(found.status,200);assert.equal((await found.json()).attendees.length,3);
 assert.equal(await scalar('select count(*)::int as result from access_log'),0);
 assert.equal(await scalar("select count(*)::int as result from attendees where state='in'"),0);
});
test('reception search escapes literal wildcard characters, matches exact tables, limits results and refuses invalid input',async()=>{
 await confirm();actor={role:'host',id:invId};
 await db.query('update guests set name=$1,table_no=$2 where id=$3',['Familia 50%_A\\B','7',guestId]);
 const find=(q,field='name')=>receptionRoute.GET(req('/api/checkin/search?'+new URLSearchParams({q,field})));
 for(const q of ['50%_A\\B','%_','Familia']) {const r=await find(q);assert.equal(r.status,200);assert.equal((await r.json()).guests.length,1);}
 const none=await find('Prueba');assert.equal((await none.json()).guests.length,0);
 const table=await find('7','table');assert.equal(table.status,200);assert.equal((await table.json()).guests.length,1);
 assert.equal((await (await find('07','table')).json()).guests.length,0);
 for(const [q,field] of [['','name'],['F','name'],['x'.repeat(81),'name'],['x'.repeat(21),'table'],['a\nb','name'],['Familia','phone']]) assert.equal((await find(q,field)).status,400);
 for(let i=0;i<23;i++)await db.query("insert into guests(invitation_id,public_id,name,status,passes,confirmed_passes) values($1,$2,$3,'confirmed',1,1)",[invId,'LIMIT'+String(i).padStart(3,'0'),'Coincidencia '+String(i).padStart(2,'0')]);
 const limited=await (await find('Coincidencia')).json();assert.equal(limited.guests.length,20);assert.equal(limited.hasMore,true);assert.equal(limited.guests[0].name,'Coincidencia 00');
});
test('reception search and selection fail closed for stopped events, removed services and database outages',async()=>{
 await confirm();actor={role:'host',id:invId};const url='/api/checkin/search?q=Familia';
 await db.query('update invitations set is_active=false where id=$1',[invId]);assert.equal((await receptionRoute.GET(req(url))).status,403);
 await db.query('update invitations set is_active=true,builder_config=$1 where id=$2',[newServiceContract({},'premium'),invId]);assert.equal((await receptionRoute.GET(req(url))).status,403);
 await db.query('update invitations set builder_config=$1 where id=$2',[{...newServiceContract({},'exclusive'),features:{tableAssignment:false}},invId]);
 assert.equal((await receptionRoute.GET(req('/api/checkin/search?q=7&field=table'))).status,403);
 const result=await (await receptionRoute.GET(req(url))).json();assert.equal(result.guests[0].tableNo,undefined);
 rpcFailure={code:'PGRST202'};assert.equal((await receptionRoute.GET(req(url))).status,503);
});

test('reception search binds host, door and admin queries to the selected signed session without recording access',async()=>{
 await confirm();const {scannerSessionFingerprint}=require('../src/lib/scanner-session.ts');
 for(const role of ['host','door','admin']){actor={role,id:invId};const cookie=role==='admin'?signAdminSession():role==='door'?signDoorSession(invId,doorHash):signHostSession(invId,hostHash);
 const url='/api/checkin/search?'+new URLSearchParams({scope:role==='door'?'door':'host',invitationId:invId,q:'Familia'});
 const good=req(url);good.headers.set('X-Enkarta-Scanner-Session',scannerSessionFingerprint(role,cookie));const response=await receptionRoute.GET(good);assert.equal(response.status,200);assert.equal((await response.json()).invitationId,invId);
 for(const key of ['f'.repeat(64),'',scannerSessionFingerprint(role==='door'?'host':'door',cookie)]){const bad=req(url);bad.headers.set('X-Enkarta-Scanner-Session',key);const denied=await receptionRoute.GET(bad);assert.equal(denied.status,403);assert.deepEqual(await denied.json(),{error:'No autorizado'});}
 }
 assert.equal(await scalar('select count(*)::int as result from access_log'),0);
});

test('reception search rejects an old binding after door credential rotation while accepting the new cookie',async()=>{
 await confirm();actor=null;const {scannerSessionFingerprint}=require('../src/lib/scanner-session.ts');const old=signDoorSession(invId,doorHash);
 const newHash=hashPassword('test-rotated-door-password'),rotated=signDoorSession(invId,newHash);await db.query('update invitations set door_password_hash=$1 where id=$2',[newHash,invId]);cookieJar.set('enkarta-door',rotated);
 const url='/api/checkin/search?scope=door&invitationId='+invId+'&q=Familia';
 const stale=req(url);stale.headers.set('X-Enkarta-Scanner-Session',scannerSessionFingerprint('door',old));const denied=await receptionRoute.GET(stale);assert.equal(denied.status,403);assert.deepEqual(await denied.json(),{error:'No autorizado'});
 const valid=req(url);valid.headers.set('X-Enkarta-Scanner-Session',scannerSessionFingerprint('door',rotated));assert.equal((await receptionRoute.GET(valid)).status,200);
 // Compatibility: a tab on the previous release still requires a valid signed cookie.
 assert.equal((await receptionRoute.GET(req(url))).status,200);cookieJar.set('enkarta-door',old);assert.equal((await receptionRoute.GET(req(url))).status,403);
 assert.equal(await scalar('select count(*)::int as result from access_log'),0);
});
test('selection by guest ID checks scope, identifiers and current confirmation without revealing tokens',async()=>{
 await confirm();actor={role:'door',id:invId};
 for(const suffix of ['guestId=invalid','guestId='+guestId+'&code=ENK-TEST','guestId='+guestId+'&token=x']) assert.equal((await checkinRoute.GET(req('/api/checkin?scope=door&'+suffix))).status,400);
 actor={role:'door',id:otherId};assert.equal((await checkinRoute.GET(req('/api/checkin?scope=door&guestId='+guestId))).status,404);
 actor={role:'door',id:invId};await db.query("update guests set status='declined',confirmed_passes=0 where id=$1",[guestId]);assert.equal((await checkinRoute.GET(req('/api/checkin?scope=door&guestId='+guestId))).status,409);
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
  assert.equal((await guestCrud.POST(req('/api/guests',{requestId:randomUUID(),invitationId:invId,name:'Not allowed'}))).status,403);
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
  assert.equal((await guestCrud.POST(req('/api/guests',{requestId:randomUUID(),invitationId:invId,name:'Blocked'}))).status,403);
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
  assert.equal(state.guests[0].tableNo,'2'); assert.equal(state.rows.length,1); // Personal rows live only in the paginated roster.
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

test('guest editor command roundtrip acknowledges normalized fields and rejects a stale repeat without access movements',async()=>{
 actor={role:'host',id:invId};await usePackage('exclusive');
 const {guestEditValues,validateGuestEdit,verifyGuestEditReceipt}=require('../src/lib/guest-edit-form.ts');
 const guests=await (await guestCrud.GET(req('/api/guests?id='+invId))).json(),base=guests.find(guest=>guest.id===guestId);
 const {command}=validateGuestEdit(base,{...guestEditValues(base),name:'Familia editada',phone:'76543210',group:'Amigos',tableNo:'12'},true);assert.ok(command);
 const saved=await guestCrud.PATCH(req('/api/guests',command));assert.equal(saved.status,200);const receipt=await saved.json();
 assert.doesNotThrow(()=>verifyGuestEditReceipt(receipt,command));assert.equal(receipt.guest.phone,'+59176543210');
 assert.equal((await guestCrud.PATCH(req('/api/guests',command))).status,409);
 assert.equal(await scalar('select count(*)::int as result from access_log'),0);
 assert.equal(await scalar('select count(*)::int as result from attendees'),0);
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
  assert.equal((await guestCrud.POST(req('/api/guests',{requestId:randomUUID(),invitationId:invId,name:'No autorizado'}))).status,403);
  assert.equal((await guestCrud.PATCH(req('/api/guests',{id:guestId,name:'No autorizado'}))).status,403);
  assert.equal((await guestCrud.DELETE(req('/api/guests?guestId='+guestId))).status,403);
  assert.equal((await openRoute.GET(req('/api/rsvp?id='+invId))).status,401);
  actor={role:'door',id:otherId};
  assert.equal((await checkinRoute.GET(req('/api/checkin?scope=door&token='+guest.accessToken))).status,404);
  assert.equal((await checkinRoute.POST(req('/api/checkin',operation))).status,403);
});

test('scanner binding rejects a different signed session and event claim before writing',async()=>{
 await usePackage('exclusive');const {guest}=await confirm();
 const {scannerSessionFingerprint}=require('../src/lib/scanner-session.ts');
 const cookie=signDoorSession(invId,doorHash);cookieJar.set('enkarta-door',cookie);
 const binding=scannerSessionFingerprint('door',cookie);
 const query='/api/checkin?scope=door&token='+guest.accessToken;
 const wrong=req(query);wrong.headers.set('X-Enkarta-Scanner-Session','f'.repeat(64));assert.equal((await checkinRoute.GET(wrong)).status,403);
 const found=req(query);found.headers.set('X-Enkarta-Scanner-Session',binding);const response=await checkinRoute.GET(found);assert.equal(response.status,200);
 const group=await response.json();assert.equal(group.invitationId,invId);
 const operation={scope:'door',invitationId:otherId,attendeeId:group.attendees[0].id,action:'in',expectedRevision:0,requestId:randomUUID()};
 const write=req('/api/checkin',operation);write.headers.set('X-Enkarta-Scanner-Session',binding);assert.equal((await checkinRoute.POST(write)).status,403);
 assert.equal(await scalar('select count(*)::int as result from access_log'),0);
});

test('QR recovery roundtrip replays exactly once and preserves a later real SQL exit',async()=>{
 await usePackage('exclusive');const {guest}=await confirm();
 const {scannerSessionFingerprint}=require('../src/lib/scanner-session.ts');
 const {scanRecoveryRecord,restoreScanRecovery,scanRecoveryPerson}=require('../src/lib/scan-recovery.ts');
 const {parseScanReceipt}=require('../src/lib/scanner-contract.ts');
 const cookie=signDoorSession(invId,doorHash);cookieJar.set('enkarta-door',cookie);
 const scope={role:'door',invitationId:invId,sessionKey:scannerSessionFingerprint('door',cookie)};
 const group=await (await checkinRoute.GET(req('/api/checkin?scope=door&token='+guest.accessToken))).json();
 const before=group.attendees[0], recovery={invitationId:invId,guestId:guest.id,seatNo:before.seatNo,operation:{attendeeId:before.id,action:'in',expectedRevision:before.revision,requestId:randomUUID()}};
 const request=(operation)=>{const value=req('/api/checkin',{...operation,scope:'door',invitationId:invId});value.headers.set('X-Enkarta-Scanner-Session',scope.sessionKey);return value;};
 assert.equal((await checkinRoute.POST(request(recovery.operation))).status,200);
 const restored=restoreScanRecovery(JSON.stringify(scanRecoveryRecord(scope,recovery)),scope);
 const replay=await checkinRoute.POST(request(restored.operation));assert.equal(replay.status,200);assert.equal((await replay.json()).replayed,true);
 assert.equal(await scalar('select count(*)::int as result from access_log'),1);
 assert.equal((await checkinRoute.POST(request({...restored.operation,action:'out',expectedRevision:1,requestId:randomUUID()}))).status,200);
 const later=await (await checkinRoute.POST(request(restored.operation))).json();
 const receipt=parseScanReceipt(later,restored.operation,scanRecoveryPerson(restored));assert.equal(receipt.attendee.state,'out');assert.equal(receipt.changedLater,true);
 assert.equal(await scalar('select count(*)::int as result from access_log'),2);
});

test('valid reauthentication cannot reuse the prior scanner binding or borrow a different role',async()=>{
 await usePackage('exclusive');const {guest}=await confirm();
 const {scannerSessionFingerprint}=require('../src/lib/scanner-session.ts');
 const old=signDoorSession(invId,doorHash);cookieJar.set('enkarta-door',old);
 const group=await (await checkinRoute.GET(req('/api/checkin?scope=door&token='+guest.accessToken))).json();
 const body={scope:'door',invitationId:invId,attendeeId:group.attendees[0].id,action:'in',expectedRevision:0,requestId:randomUUID()};
 const rotated=signDoorSession(invId,doorHash,Math.floor(Date.now()/1000)+3600);assert.notEqual(old,rotated);cookieJar.set('enkarta-door',rotated);
 const stale=req('/api/checkin',body);stale.headers.set('X-Enkarta-Scanner-Session',scannerSessionFingerprint('door',old));assert.equal((await checkinRoute.POST(stale)).status,403);
 cookieJar.set('enkarta-host',signHostSession(invId,hostHash));
 const borrowed=req('/api/checkin',{...body,scope:'host'});borrowed.headers.set('X-Enkarta-Scanner-Session',scannerSessionFingerprint('door',rotated));assert.equal((await checkinRoute.POST(borrowed)).status,403);
 cookieJar.set('enkarta-admin',signAdminSession());
 const shifted=req('/api/checkin',{...body,scope:'host'});shifted.headers.set('X-Enkarta-Scanner-Session',scannerSessionFingerprint('host',cookieJar.get('enkarta-host')));assert.equal((await checkinRoute.POST(shifted)).status,403);
 assert.equal(await scalar('select count(*)::int as result from access_log'),0);
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
