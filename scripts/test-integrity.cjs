// Real handlers and migrations, isolated PostgreSQL/WASM; no bank/Auth network.
// PGlite has one connection. Two independent PostgreSQL sessions remain a staging check.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const {test,before,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');
const root=path.resolve(__dirname,'..'),db=new PGlite();
const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){if(request==='server-only')return path.join(__dirname,'server-only.stub');return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const replace=(file,exports)=>{require.cache[require.resolve(file)]={exports};};
const source=file=>path.join(root,'src',file);
replace('server-only',{});
replace('next/og',{ImageResponse:class{constructor(tree){this.tree=tree;}}});
replace('next/cache',{unstable_noStore(){}});
replace(source('components/admin/builder/InvitationBuilder.tsx'),{__esModule:true,default:()=>null});
global.fetch=async()=>new Response('',{status:404});
const own='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
const partnerId='20000000-0000-4000-8000-000000000001',paymentId='30000000-0000-4000-8000-000000000001';
const guestId='40000000-0000-4000-8000-000000000001';
let actor='partner',rpcFailure=null,beforeInvitationUpdate=null;
const scalar=async(sql,args=[])=> (await db.query(sql,args)).rows[0]?.result;
const row=async(table,id)=> (await db.query(`select * from ${table} where id=$1`,[id])).rows[0];
const wire=row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value instanceof Date?(['event_date','expires_at','rsvp_deadline'].includes(key)?value.toISOString().slice(0,10):value.toISOString()):value]));
async function rpc(name,params){const keys=Object.keys(params);return scalar(`select public.${name}(${keys.map((key,i)=>key+'=> $'+(i+1)).join(',')}) as result`,Object.values(params));}
function queryClient(table){
 assert.match(table,/^[a-z_]+$/);
 let columns='*',filters=[],operation='read',payload,limit,offset=0,order,conflict='id',count=false,head=false;
 return {
  select(value='*',opts={}){columns=value;count=opts.count==='exact';head=opts.head;return this;},
  eq(key,value){filters.push([key,value,'=']);return this;},in(key,value){filters.push([key,value,'in']);return this;},
  order(key,opts={}){order=[key,opts.ascending===false?'desc':'asc'];return this;},limit(value){limit=value;return this;},
  range(start,end){offset=start;limit=end-start+1;return this;},
  insert(value){operation='insert';payload=Array.isArray(value)?value:[value];return this;},
  upsert(value,opts={}){operation='upsert';payload=Array.isArray(value)?value:[value];conflict=opts.onConflict||'id';return this;},
  update(value){operation='update';payload=value;return this;},delete(){operation='delete';return this;},
  maybeSingle(){this.one=true;return this;},single(){this.one=true;return this;},
  async then(ok){try{
   if(table==='invitations'&&operation==='update'&&beforeInvitationUpdate){const interleave=beforeInvitationUpdate;beforeInvitationUpdate=null;await interleave();}
   let values=[];const bind=v=>{values.push(v);return '$'+values.length;};
   const where=filters.length?' where '+filters.map(([k,v,op])=>op==='in'?`${k}=any(${bind(v)}::text[])`:`${k}=${bind(v)}`).join(' and '):'';
   let sql;
   if(operation==='insert'||operation==='upsert'){
    values=[];const keys=Object.keys(payload[0]);sql=`insert into ${table}(${keys.join(',')}) values ${payload.map(r=>'('+keys.map(k=>bind(r[k])).join(',')+')').join(',')}`;
    if(operation==='upsert')sql+=` on conflict(${conflict}) do update set `+keys.filter(k=>k!==conflict).map(k=>`${k}=excluded.${k}`).join(',');sql+=` returning ${columns}`;
   }else if(operation==='update')sql=`update ${table} set ${Object.entries(payload).map(([k,v])=>`${k}=${bind(v)}`).join(',')}${where} returning ${columns}`;
   else if(operation==='delete')sql=`delete from ${table}${where} returning ${columns}`;
   else sql=`select ${columns} from ${table}${where}${order?' order by '+order.join(' '):''}${limit!==undefined?' limit '+limit:''}${offset?' offset '+offset:''}`;
   const rows=(await db.query(sql,values)).rows.map(wire);
   return ok({data:head?null:this.one?rows[0]??null:rows,error:null,...(count?{count:rows.length}:{})});
  }catch(error){return ok({data:null,error});}}
 };
}
replace(source('lib/supabase/server.ts'),{supabaseAdmin:{from:queryClient,async rpc(name,params){if(rpcFailure)return{data:null,error:rpcFailure};try{return{data:await rpc(name,params),error:null};}catch(error){return{data:null,error};}}}});
const {subscriptionState,planQuota,extendPeriod}=require(source('lib/partner-plans.ts'));
async function context(){const partner=await row('partners',partnerId);const sub=await scalar('select to_jsonb(s) as result from partner_subscriptions s where partner_id=$1',[partnerId]);const subscription=subscriptionState(sub);return{partner,subscription,quota:planQuota(subscription.plan,Number(await scalar("select count(*) as result from invitations where partner_id=$1 and status='ready'",[partnerId]))),totalInvitations:Number(await scalar('select count(*) as result from invitations where partner_id=$1',[partnerId]))};}
const owns=async(partner,id)=>!!await scalar('select true as result from invitations where id=$1 and partner_id=$2',[id,partner]);
replace(source('lib/partner-session.ts'),{
 getBuilderActor:async()=>actor==='admin'?{kind:'admin'}:actor==='partner'?{kind:'partner',partnerId,context:await context()}:null,
 getPartnerContext:async()=>actor==='partner'?context():null,partnerContextFor:context,
 requirePartnerPage:async()=>{if(actor!=='partner')throw new Error('UNAUTHORIZED_PARTNER_PAGE');return context();},
 partnerOwnsInvitation:owns,isPartnerOwnerOf:async id=>actor==='partner'&&owns(partnerId,id),
 packageForPlan:p=>({inicio:'plus',estudio:'premium',agencia:'exclusive'})[p],
 publishBlockReason:(ctx,already)=>!ctx.subscription.active?'subscription-required':!already&&ctx.quota.reached?'quota-reached':null,
 partnerServesInvitation:async id=>!id||(await owns(id,own)&&((await context()).subscription.active||(await context()).subscription.inGrace)),
});
const {signAdminSession,verifyAdminSession,signHostSession,verifyHostSession,signReviewSession,verifyReviewSession}=require(source('lib/access.ts'));
replace('next/headers',{cookies:()=>({get:name=>actor==='admin'&&name==='enkarta-admin'?{value:signAdminSession()}:undefined})});
const {NextRequest}=require('next/server');
const admin=require(source('app/api/admin/invitations/route.ts'));
const builder=require(source('app/api/admin/builder-state/route.ts'));
const partnerInvites=require(source('app/api/partner/invitations/route.ts'));
const approvals=require(source('app/api/admin/partners/route.ts'));
const receipts=require(source('app/api/partner/payments/receipt/route.ts'));
const payments=require(source('app/api/partner/payments/route.ts'));
const guests=require(source('app/api/guests/route.ts'));
const starterRoute=require(source('app/api/admin/invitations/starter/route.ts'));
const {STARTER_TEMPLATE_KEYS}=require(source('lib/template-starters.ts'));
const {publicInvitationData}=require(source('lib/published-invitation.ts'));
const Og=require(source('app/i/[slug]/opengraph-image.tsx')).default;
const adminEditor=require(source('app/admin/builder/[id]/page.tsx'));
const partnerEditor=require(source('app/socios/constructor/[id]/page.tsx'));
const {newServiceContract}=require(source('lib/packages.ts'));
const {versionSnapshotForStorage}=require(source('lib/builder-versions.ts'));
const req=body=>new NextRequest('http://localhost:3000/api/test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const version=(id,source='save')=>({id,invitationId:own,label:'Fixture',source,createdAt:Date.now(),data:{id:own,slug:'own',names:'Published names',config:newServiceContract({},'premium')}});
const publish=async(id='published')=>builder.POST(req({invitationId:own,action:'publish',version:version(id,'publish')}));
before(async()=>{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create function uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;');
 for(const file of ['001_create_invitations.sql','002_guests_access.sql','003_rsvps.sql'])await db.exec(fs.readFileSync(path.join(root,'migrations',file),'utf8').replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',''));
 await db.exec('alter table invitations add column views_count integer default 0,add column builder_config jsonb,add column phone_whatsapp text;');
 for(const prefix of ['004','006','007','008','009','010','011','012','013','014','015']){
  const file=fs.readdirSync(path.join(root,'migrations')).find(f=>f.startsWith(prefix));
  try{await db.exec(fs.readFileSync(path.join(root,'migrations',file),'utf8'));}catch(e){throw new Error(file+': '+e.message+' at '+e.position);}
 }
});
beforeEach(async()=>{
 actor='partner';rpcFailure=null;beforeInvitationUpdate=null;delete process.env.PAYMENT_PROVIDER;
 await db.exec('truncate invitations,partners cascade');
 await db.query("insert into partners(id,email,status) values($1,'test@example.invalid','active')",[partnerId]);
 await db.query("insert into partner_subscriptions(partner_id,plan_key,status,current_period_end) values($1,'estudio','active',now()+interval '1 month')",[partnerId]);
 await db.query("insert into invitations(id,slug,partner_id,builder_config,event_date,names,host_password_hash) values($1,'own',$2,$3,'2027-02-20','PRIVATE DRAFT','SECRET-HASH'),($4,'other',null,$3,'2027-02-20','OTHER',null)",[own,partnerId,newServiceContract({},'premium'),other]);
 await db.exec("update invitations set ceremony_place='Test venue'");
 await db.query("insert into guests(id,invitation_id,public_id,name,passes) values($1,$2,'TEST0001','Family',2)",[guestId,own]);
 await db.query("insert into partner_payments(id,reference,partner_id,plan_key,months,amount_bs) values($1,'ENK-TEST01',$2,'estudio',1,449)",[paymentId,partnerId]);
});
after(()=>db.close());
test('publication requires explicit action before storing any snapshot',async()=>{
 const response=await builder.POST(req({invitationId:own,version:version('bypass','publish')}));
 assert.equal(response.status,400);assert.equal(await scalar("select count(*) as result from builder_versions where id='bypass'"),0);
});
test('new published anchor survives 35 draft versions and public content stays published',async()=>{
 assert.equal((await publish()).status,200);
 for(let i=0;i<35;i++)assert.equal((await builder.POST(req({invitationId:own,version:version('draft-'+i)}))).status,200);
 assert.equal(await scalar("select count(*) as result from builder_versions where source='save'"),30);
 assert.equal((await row('invitations',own)).published_version_id,'published');
 assert.equal((await publicInvitationData(wire(await row('invitations',own)))).names,'Published names');
 const history=await (await builder.GET(new NextRequest('http://localhost/api/test?invitationId='+own))).json();
 assert.ok(history.versions.some(v=>v.id==='published'));
});
test('unpublishing removes public availability and releases quota',async()=>{
 await publish();const response=await partnerInvites.PATCH(req({id:own,status:'draft'}));assert.equal(response.status,200,JSON.stringify(await response.json()));
 assert.equal((await row('invitations',own)).status,'disabled');assert.equal(await publicInvitationData(wire(await row('invitations',own))),null);
 assert.equal((await context()).quota.used,0);
});
test('another tenant note and version IDs cannot be reassigned',async()=>{
 await db.query("insert into builder_review_notes(id,invitation_id,text,author) values('foreign',$1,'Original','Team')",[other]);
 let response=await builder.POST(req({invitationId:own,note:{id:'foreign',text:'Overwrite',createdAt:Date.now()}}));assert.equal(response.status,403);
 assert.equal((await row('builder_review_notes','foreign')).invitation_id,other);
 await db.query("insert into builder_versions(id,invitation_id,label,source,snapshot) values('foreign-v',$1,'Other','save','{}')",[other]);
 response=await builder.POST(req({invitationId:own,version:version('foreign-v')}));assert.equal(response.status,403);
});
test('partner cannot upgrade contract, publish through CRUD, or read password hashes',async()=>{
 const revision=(await row('invitations',own)).draft_revision;
 let response=await admin.PUT(req({id:own,expectedDraftRevision:revision,builder_config:newServiceContract({},'exclusive')}));assert.equal(response.status,200);
 assert.equal((await row('invitations',own)).builder_config.package,'premium');
 assert.equal((await admin.POST(req({slug:'bypass',status:'ready',builder_config:newServiceContract({},'exclusive')}))).status,400);
 assert.equal((await admin.PUT(req({id:own,expectedDraftRevision:revision,status:'ready'}))).status,409);
 const body=await (await admin.GET()).json();assert.equal(JSON.stringify(body).includes('SECRET-HASH'),false);
});
test('SQL enforces subscription and final quota slot, including scheduled publications',async()=>{
 await db.query("update partner_subscriptions set plan_key='inicio' where partner_id=$1",[partnerId]);
 for(let i=0;i<3;i++)await db.query("insert into invitations(slug,partner_id,status) values($1,$2,'ready')",['slot-'+i,partnerId]);
 assert.equal((await publish()).status,402);assert.equal(await scalar('select count(*) as result from builder_versions'),0);
 await db.query("update partner_subscriptions set current_period_end=now()-interval '1 day' where partner_id=$1",[partnerId]);
 assert.equal((await publish()).status,402);
});
test('schedule reserves a slot, serves no draft, and can be canceled',async()=>{
 const v={...version('scheduled','publish'),publicationState:'scheduled',publishAt:'2099-01-01T00:00:00.000Z'};
 assert.equal((await builder.POST(req({invitationId:own,action:'schedule',version:v}))).status,200);
 assert.equal((await context()).quota.used,1);assert.equal(await publicInvitationData(wire(await row('invitations',own))),null);
 assert.equal((await builder.DELETE(new NextRequest('http://localhost/api/test?invitationId='+own+'&entity=version&id=scheduled'))).status,200);
 assert.equal((await row('invitations',own)).scheduled_version_id,null);
});
test('active publication is immutable and cannot be removed',async()=>{
 await publish();const original=await row('builder_versions','published');
 await assert.rejects(db.query("update builder_versions set snapshot='{}' where id='published'"),/IMMUTABLE_PUBLICATION/);
 await assert.rejects(db.query("delete from builder_versions where id='published'"),/ACTIVE_PUBLICATION/);
 assert.deepEqual((await row('builder_versions','published')).snapshot,original.snapshot);
});
test('payment approval rolls back if subscription activation fails',async()=>{
 actor='admin';await db.exec("update partner_subscriptions set status='none';create function fail_sub_test() returns trigger language plpgsql as $$begin raise exception 'TEST_FAIL'; end;$$;create trigger fail_sub_test before update on partner_subscriptions for each row execute function fail_sub_test();");
 try{const response=await approvals.PATCH(req({action:'approve',id:paymentId}));assert.equal(response.status,500);assert.equal((await row('partner_payments',paymentId)).status,'pending');}
 finally{await db.exec('drop trigger fail_sub_test on partner_subscriptions;drop function fail_sub_test();');}
});
test('approval is idempotent, rejects bank-unverified payments and reuses no bank transaction',async()=>{
 actor='admin';assert.equal((await approvals.PATCH(req({action:'approve',id:paymentId}))).status,200);
 const end=(await row('partner_payments',paymentId)).period_end;
 const result=await (await approvals.PATCH(req({action:'approve',id:paymentId}))).json();assert.equal(result.replayed,true);assert.deepEqual((await row('partner_payments',paymentId)).period_end,end);
 await db.query("update partner_payments set provider='bcp' where id=$1",[paymentId]);
 assert.equal((await approvals.PATCH(req({action:'approve',id:paymentId}))).status,409);
});
test('receipt submission preserves paid term and grace, freezes quote and references exact payment',async()=>{
 await db.query("update partner_subscriptions set current_period_end=now()-interval '1 day' where partner_id=$1",[partnerId]);
 const before=await context();assert.equal(before.subscription.inGrace,true);
 const form=new FormData();form.set('paymentId',paymentId);form.set('note','TRANSACTION-TEST');
 assert.equal((await receipts.POST(new NextRequest('http://localhost/api/test',{method:'POST',body:form}))).status,200);
 const after=await context();assert.equal(after.subscription.inGrace,true);assert.equal(after.subscription.periodEnd,before.subscription.periodEnd);
 assert.equal((await payments.POST(req({plan:'agencia',months:12,method:'qr'}))).status,409);
 assert.equal((await row('partner_payments',paymentId)).amount_bs,'449.00');
});
test('cancel preserves payment evidence and repeated intent is unique',async()=>{
 assert.equal((await payments.POST(req({plan:'estudio',months:1,method:'qr'}))).status,200);
 assert.equal(await scalar("select count(*) as result from partner_payments where status='pending'"),1);
 assert.equal((await payments.DELETE(new NextRequest('http://localhost/api/test?id='+paymentId))).status,200);
 assert.equal((await row('partner_payments',paymentId)).status,'canceled');
});
test('Estudio producer can prepare personalized guests without host panel entitlement',async()=>{
 assert.equal((await guests.GET(new NextRequest('http://localhost/api/test?id='+own))).status,200);
});
test('draft OpenGraph contains no private names or photos; new draft never falls back to working content',async()=>{
 assert.equal(await publicInvitationData(wire(await row('invitations',own))),null);
 const image=await Og({params:Promise.resolve({slug:'own'})});assert.equal(JSON.stringify(image.tree).includes('PRIVATE DRAFT'),false);
});
test('editor hydration strips credentials while preserving editable design and private metadata is authorized',async()=>{
 await db.query("update invitations set review_password_hash='SECRET-REVIEW',door_password_hash='SECRET-DOOR' where id=$1",[own]);
 const props={params:Promise.resolve({id:own})};
 for(const [role,page] of [['admin',adminEditor],['partner',partnerEditor]]){
  actor=role;const element=await page.default(props);const data=element.props.initialData;
  const serialized=JSON.stringify(data);assert.equal(serialized.includes('SECRET-'),false);
  assert.equal(data.names,'PRIVATE DRAFT');assert.equal(data.config.package,'premium');
  assert.equal((await page.generateMetadata(props)).title.includes('PRIVATE DRAFT'),true);
 }
 actor='partner';assert.equal((await partnerEditor.generateMetadata({params:Promise.resolve({id:other})})).title.includes('OTHER'),false);
 actor='none';await assert.rejects(adminEditor.generateMetadata(props),/NEXT_REDIRECT/);
 await assert.rejects(partnerEditor.generateMetadata(props),/UNAUTHORIZED_PARTNER_PAGE/);
});

test('BCP remains closed until official adapter exists and no client bank status activates service',async()=>{
 process.env.PAYMENT_PROVIDER='bcp';process.env.BCP_API_KEY='SYNTHETIC-SECRET';
 const response=await payments.POST(req({plan:'estudio',months:1,method:'qr',paid:true}));assert.equal(response.status,503);
 assert.equal(JSON.stringify(await response.json()).includes('SYNTHETIC-SECRET'),false);delete process.env.BCP_API_KEY;
});
test('calendar-month renewal clamps January 31 to February 28',()=>{
 assert.equal(extendPeriod('2027-01-31T12:00:00Z',1,new Date('2027-01-01T12:00:00Z')).toISOString(),'2027-02-28T12:00:00.000Z');
});
test('critical RPCs are inaccessible to anon and authenticated roles',async()=>{
 for(const role of ['anon','authenticated'])for(const signature of ['enkarta_store_builder_state(uuid,uuid,boolean,jsonb,jsonb,text)','enkarta_review_payment(uuid,text,text,text,text,numeric,text)'])
  assert.equal(await scalar('select has_function_privilege($1,$2,\'EXECUTE\') as result',[role,'public.'+signature]),false);
});
test('saving cannot overwrite a publication or pause committed between the route read and UPDATE',async()=>{
 let revision=(await row('invitations',own)).draft_revision;
 beforeInvitationUpdate=async()=>assert.equal((await publish('interleaved')).status,200);
 assert.equal((await admin.PUT(req({id:own,expectedDraftRevision:revision,status:'draft',names:'Saved content'}))).status,200);
 assert.equal((await row('invitations',own)).status,'ready');
 assert.equal((await publicInvitationData(wire(await row('invitations',own)))).names,'Published names');
 revision=(await row('invitations',own)).draft_revision;
 beforeInvitationUpdate=async()=>rpc('enkarta_set_publication',{p_id:own,p_partner_id:partnerId,p_enabled:false});
 assert.equal((await admin.PUT(req({id:own,expectedDraftRevision:revision,status:'ready',names:'Still saved'}))).status,200);
 assert.equal((await row('invitations',own)).status,'disabled');
 assert.equal(await publicInvitationData(wire(await row('invitations',own))),null);
});

test('draft updates require a revision, reject stale tabs and never unpublish while saving',async()=>{
 const base=(await row('invitations',own)).draft_revision;
 assert.equal((await admin.PUT(req({id:own,names:'Unversioned'}))).status,400);
 assert.equal((await admin.PUT(req({id:own,expectedDraftRevision:base,names:'Newer'}))).status,200);
 assert.equal((await admin.PUT(req({id:own,expectedDraftRevision:base,names:'Old tab'}))).status,409);
 assert.equal((await row('invitations',own)).names,'Newer');
 await publish();
 const revision=(await row('invitations',own)).draft_revision;
 assert.equal((await admin.PUT(req({id:own,expectedDraftRevision:revision,status:'draft',names:'Still working'}))).status,200);
 assert.equal((await row('invitations',own)).status,'ready');
 assert.equal((await publicInvitationData(wire(await row('invitations',own)))).names,'Published names');
});
test('expiring private sessions reject replay after expiry and admin password rotation',()=>{
 const expired=Math.floor(Date.now()/1000)-1;
 assert.equal(verifyAdminSession(signAdminSession(expired)),false);
 assert.equal(verifyHostSession(signHostSession(own,'hash',expired),'hash'),null);
 assert.equal(verifyReviewSession(signReviewSession(own,'hash',expired),'hash'),false);
 const previous=process.env.ADMIN_PASSWORD;
 try{process.env.ADMIN_PASSWORD='test-before';const cookie=signAdminSession();assert.equal(verifyAdminSession(cookie),true);process.env.ADMIN_PASSWORD='test-after';assert.equal(verifyAdminSession(cookie),false);}
 finally{if(previous===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=previous;}
});
test('second side of payment failure also rolls back subscription and bank amount must match',async()=>{
 actor='admin';const before=await context();
 await db.exec("create function fail_pay_test() returns trigger language plpgsql as $$begin raise exception 'TEST_FAIL';end;$$;create trigger fail_pay_test before update on partner_payments for each row execute function fail_pay_test();");
 try{assert.equal((await approvals.PATCH(req({action:'approve',id:paymentId}))).status,500);assert.equal((await context()).subscription.periodEnd,before.subscription.periodEnd);}
 finally{await db.exec('drop trigger fail_pay_test on partner_payments;drop function fail_pay_test();');}
 await db.query("update partner_payments set provider='bcp' where id=$1",[paymentId]);
 await assert.rejects(rpc('enkarta_review_payment',{p_payment_id:paymentId,p_action:'approve',p_note:'Verified sandbox',p_reviewer:'bank',p_provider_transaction:'bank-test-1',p_verified_amount:1,p_verified_currency:'BOB'}),/BANK_CONFIRMATION_REQUIRED/);
 assert.equal((await row('partner_payments',paymentId)).status,'pending');
 const paid=await rpc('enkarta_review_payment',{p_payment_id:paymentId,p_action:'approve',p_note:'Verified sandbox',p_reviewer:'bank',p_provider_transaction:'bank-test-1',p_verified_amount:449,p_verified_currency:'BOB'});
 assert.equal(paid.success,true);
});
test('reapplying integrity migrations preserves published anchors and canceled payments',async()=>{
 await publish();await rpc('enkarta_cancel_payment',{p_partner_id:partnerId,p_payment_id:paymentId});
 for(const file of ['014_publication_integrity.sql','015_payment_integrity.sql'])await db.exec(fs.readFileSync(path.join(root,'migrations',file),'utf8'));
 assert.equal((await row('invitations',own)).published_version_id,'published');assert.equal((await row('partner_payments',paymentId)).status,'canceled');
});
test('every catalog starter can be created as a draft without editing its assets',async()=>{
 actor='admin';
 for(const template of STARTER_TEMPLATE_KEYS){const response=await starterRoute.POST(req({template,package:'premium'}));assert.equal(response.status,201,template+': '+JSON.stringify(await response.json()));}
});
test('server rejects an incomplete publication before inserting it',async()=>{
 const bad=version('bad-pub','publish');bad.data.names='';
 assert.equal((await builder.POST(req({invitationId:own,action:'publish',version:bad}))).status,400);
 assert.equal(await scalar("select count(*) as result from builder_versions where source='publish'"),0);
});
test('service role can execute the restricted publication transaction and untrusted roles cannot read snapshots',async()=>{
 await db.exec('set role service_role');
 try{await rpc('enkarta_store_builder_state',{p_invitation_id:own,p_partner_id:partnerId,p_client:false,p_versions:[],p_notes:[],p_action:null});}
 finally{await db.exec('reset role');}
 for(const role of ['anon','authenticated'])assert.equal(await scalar("select has_table_privilege($1,'public.builder_versions','SELECT') as result",[role]),false);
});
test('migration never exposes a draft whose old publication was already purged',async()=>{
 await db.query("update invitations set publication_managed=false,status='ready',builder_config=jsonb_set(builder_config,'{workflow}','{\"lastPublishedVersionId\":\"missing-snapshot\"}') where id=$1",[own]);
 await db.exec(fs.readFileSync(path.join(root,'migrations/014_publication_integrity.sql'),'utf8'));
 const invitation=wire(await row('invitations',own));assert.equal(invitation.publication_managed,true);assert.equal(await publicInvitationData(invitation),null);
});
test('payment migration restores grace only when an approved payment backs the period',async()=>{
 await db.exec("update partner_subscriptions set status='pending',current_period_end=now()-interval '1 day';update partner_payments set status='approved',period_end=(select current_period_end from partner_subscriptions limit 1)");
 await db.exec(fs.readFileSync(path.join(root,'migrations/015_payment_integrity.sql'),'utf8'));
 assert.equal((await context()).subscription.inGrace,true);
});
test('image allowlist preserves catalog media and gift QR while refusing unknown hosts',async()=>{
 const config=(await import('../next.config.mjs')).default;
 const {hasRemoteMatch}=require('next/dist/shared/lib/match-remote-pattern');
 const accepts=url=>hasRemoteMatch([],config.images.remotePatterns,new URL(url));
 const {invitationDemo}=require(source('lib/template-starters.ts'));
 const {collectPublicationResources}=require(source('lib/publication-audit.ts'));
 for(const template of STARTER_TEMPLATE_KEYS)for(const asset of collectPublicationResources(invitationDemo(template)).filter(r=>r.kind==='image'&&r.url.startsWith('https:')))
  assert.equal(accepts(asset.url),true,template+': '+asset.url);
 const samples=require(source('components/invitations/sampleData.ts'));
 function checkQr(value){if(!value||typeof value!=='object')return;for(const[key,item]of Object.entries(value)){if(/qrurl$/i.test(key)&&typeof item==='string'&&item.startsWith('https:'))assert.equal(accepts(item),true,item);else if(item&&typeof item==='object')checkQr(item);}}
 checkQr(samples);
 assert.equal(accepts('https://unapproved.example.invalid/photo.jpg'),false);
 assert.equal(accepts('https://api.qrserver.com/unapproved-path'),false);
});
