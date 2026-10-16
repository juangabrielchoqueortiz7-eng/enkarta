// Authorized HTTP acceptance with a disposable Auth user, event and manual ledger.
// No email, Google consent, WhatsApp message, real receipt upload or bank operation.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),crypto=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
assert.ok(process.argv.includes('--exercise'));
const origin=(arg('--app-url')||'http://127.0.0.1:3000').replace(/\/$/,''),url=new URL(origin);
assert.ok((url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname))||(process.argv.includes('--production')&&origin==='https://enkarta.vercel.app'));
assert.equal(url.origin,origin);assert.notEqual(process.env.PAYMENT_PROVIDER,'bcp');
const project=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];assert.equal(arg('--expect-project'),project);
const output=arg('--report');assert.ok(output,'A persisted cleanup scope is required');fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
const ts=require('typescript');require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},fileName:file}).outputText,file);
const {createClient}=require('@supabase/supabase-js'),{createServerClient}=require('@supabase/ssr');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init={})=>fetch(url,{...init,signal:AbortSignal.timeout(25000)})}});
const {editorInvitation}=require('../src/lib/client-invitation.ts'),{parseInvitation}=require('../src/lib/types.ts'),{validCheckoutPayment,checkoutPaymentLabel}=require('../src/lib/partner-checkout.ts'),{partnerEntryPath,partnerNewDesignPath}=require('../src/lib/partner-journey.ts');
const resuming=process.argv.includes('--resume-cleanup');
const tag='qa-commercial-'+crypto.randomUUID();
const report=resuming?JSON.parse(fs.readFileSync(output,'utf8')):{checkedAt:new Date().toISOString(),origin,project,tag,userId:crypto.randomUUID(),email:tag+'@example.invalid',invitationIds:[],checks:[],cleanup:'not-started',bankCalls:0,messagesSent:0,emailsSent:0,authFlow:'Synthetic password sign-in; does not certify browser Google OAuth'};
assert.equal(report.origin,origin);assert.equal(report.project,project);assert.match(report.tag,/^qa-commercial-[a-f0-9-]{36}$/);assert.equal(report.email,report.tag+'@example.invalid');assert.match(report.userId,/^[a-f0-9-]{36}$/);assert.ok(Array.isArray(report.invitationIds)&&report.invitationIds.length<=3&&report.invitationIds.every(id=>/^[a-f0-9-]{36}$/.test(id)));
const write=()=>fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
const must=(result,label)=>{if(result.error)throw Error(label+': '+(result.error.code||result.error.status||'SERVICE_ERROR'));return result.data;};
async function check(name,run){try{await run();report.checks.push({name,passed:true});write();console.log('OK: '+name);}catch(error){report.checks.push({name,passed:false});write();throw error;}}
async function http(route,method='GET',body,cookie=''){
 const result=await fetch(origin+route,{method,headers:{Origin:origin,Cookie:cookie,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)}),redirect:'manual',signal:AbortSignal.timeout(30000)});
 const text=await result.text();let data;try{data=JSON.parse(text);}catch{}return {status:result.status,data,text,location:result.headers.get('location'),cookie:(result.headers.get('set-cookie')||'').split(';')[0]};
}
async function ownInvitation(id){const data=must(await db.from('invitations').select('*').eq('id',id).eq('partner_id',report.userId).single(),'Read own draft');assert.ok(data.slug.startsWith('invitacion-azure-'));return data;}
let partnerCookie='',adminCookie='';
async function main(){
 await check('Public catalog distinguishes event commission and monthly Socios builder while preserving the selected design',async()=>{
  const catalog=await http('/catalogo');assert.equal(catalog.status,200);assert.ok(catalog.text.includes('Encargar al equipo'));assert.ok(catalog.text.includes('Usar en el constructor de Socios'));
  const selection=await http(partnerEntryPath(partnerNewDesignPath('azure')));assert.equal(selection.status,200);assert.ok(selection.text.includes('Diseño elegido:'));assert.ok(selection.text.includes('Lunaria'));
  const direct=await http(partnerNewDesignPath('azure'));assert.ok([303,307].includes(direct.status));assert.equal(new URL(direct.location,origin).pathname,'/socios');assert.equal(new URL(direct.location,origin).searchParams.get('next'),partnerNewDesignPath('azure'));
  const cancelled=await http('/auth/callback?error=access_denied&next='+encodeURIComponent(partnerNewDesignPath('azure')));assert.equal(new URL(cancelled.location,origin).searchParams.get('next'),partnerNewDesignPath('azure'));
 });
 await check('Disposable Auth user can access only its own partner account without emails',async()=>{
  const password=crypto.randomBytes(30).toString('base64url');
  const user=must(await db.auth.admin.createUser({id:report.userId,email:report.email,password,email_confirm:true,app_metadata:{qa_tag:report.tag},user_metadata:{full_name:'QA Commercial Journey'}}),'Create disposable Auth user').user;
  assert.equal(user.id,report.userId);
  // The random password lives only in memory. Sign in through the normal Auth API.
  const cookies=new Map(),client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:list=>list.forEach(({name,value})=>cookies.set(name,value))}});
  must(await client.auth.signInWithPassword({email:report.email,password}),'Sign in disposable user');partnerCookie=[...cookies].map(([name,value])=>`${name}=${encodeURIComponent(value)}`).join('; ');assert.ok(partnerCookie);
  const result=await http('/api/partner/account','GET',undefined,partnerCookie);assert.equal(result.status,200);assert.equal(result.data.profile.email,report.email);assert.equal(result.data.subscription.active,false);assert.equal(result.data.payments.length,0);
  assert.equal((await http('/api/partner/account')).status,401);
 });
 let invitation,payment;
 await check('New partner creates an original draft and cannot publish without an active plan',async()=>{
  const result=await http('/api/partner/invitations','POST',{template:'azure'},partnerCookie);assert.equal(result.status,201);report.invitationIds.push(result.data.id);write();invitation=await ownInvitation(result.data.id);assert.equal(invitation.status,'draft');
  const unpublished=await http('/i/'+invitation.slug);assert.ok([200,404].includes(unpublished.status));assert.equal(unpublished.text.includes(invitation.names),false,'Unpublished working names must stay private');
  const current=editorInvitation(parseInvitation(invitation));const response=await http('/api/admin/builder-state','POST',{invitationId:invitation.id,action:'publish',version:{id:report.tag+'-denied',invitationId:invitation.id,label:'QA denied',source:'publish',createdAt:Date.now(),data:current}},partnerCookie);assert.equal(response.status,402);assert.equal(response.data.code,'SUBSCRIPTION_REQUIRED');
 });
 await check('Manual reference uses server amount, is repeatable once and does not activate a subscription',async()=>{
  const request={plan:'inicio',months:1,method:'qr',amount:1,paid:true};const first=await http('/api/partner/payments','POST',request,partnerCookie);assert.equal(first.status,200);payment=first.data.payment;assert.ok(validCheckoutPayment(payment));assert.equal(Number(payment.amount_bs),249);assert.equal(checkoutPaymentLabel(payment),'Referencia preparada');
  const replay=await http('/api/partner/payments','POST',request,partnerCookie);assert.equal(replay.status,200);assert.equal(replay.data.payment.id,payment.id);
  const account=await http('/api/partner/account','GET',undefined,partnerCookie);assert.equal(account.data.subscription.active,false);assert.equal(account.data.payments.length,1);
 });
 await check('Note-only evidence appears in review, freezes the quote and never acts as a paid bank confirmation',async()=>{
  const form=new FormData();form.set('paymentId',payment.id);form.set('note','QA SYNTHETIC TRANSACTION - NO TRANSFER');
  const attached=await http('/api/partner/payments/receipt','POST',form,partnerCookie);assert.equal(attached.status,200);assert.ok(attached.data.payment.quote_locked_at);
  const account=await http('/api/partner/account','GET',undefined,partnerCookie);assert.equal(account.status,200);assert.equal(account.data.subscription.active,false);assert.equal(checkoutPaymentLabel(account.data.payments[0]),'Comprobante en revisión');assert.equal(account.text.includes('QA SYNTHETIC TRANSACTION'),false);
  const locked=await http('/api/partner/payments','POST',{plan:'agencia',months:12,method:'qr'},partnerCookie);assert.equal(locked.status,409);assert.equal(locked.data.code,'PAYMENT_LOCKED');
  const denied=await http('/api/admin/partners','PATCH',{id:payment.id,action:'approve'},partnerCookie);assert.equal(denied.status,401);
  const panel=await http('/socios/panel?tab=suscripcion','GET',undefined,partnerCookie);assert.equal(panel.status,200);assert.ok(panel.text.includes('Comprobante en revisión'));
 });
 await check('Only synthetic manual admin approval activates the plan; repeating it does not extend twice',async()=>{
  const login=await http('/api/admin/auth','POST',{password:process.env.ADMIN_PASSWORD});assert.equal(login.status,200);adminCookie=login.cookie;
  const one=await http('/api/admin/partners','PATCH',{id:payment.id,action:'approve',note:'QA disposable only; no real payment'},adminCookie);assert.equal(one.status,200);assert.equal(one.data.replayed,false);
  const two=await http('/api/admin/partners','PATCH',{id:payment.id,action:'approve'},adminCookie);assert.equal(two.status,200);assert.equal(two.data.replayed,true);assert.equal(one.data.periodEnd,two.data.periodEnd);
  const account=await http('/api/partner/account','GET',undefined,partnerCookie);assert.equal(account.data.subscription.active,true);assert.equal(account.data.subscription.plan,'inicio');
 });
 await check('Paid synthetic partner explicitly publishes its version and keeps working edits private',async()=>{
  invitation=await ownInvitation(invitation.id);const eventDate=new Date(Date.now()+45*86400000).toISOString().slice(0,10);
  const saved=await http('/api/admin/invitations','PUT',{id:invitation.id,expectedDraftRevision:invitation.draft_revision,names:'QA Commercial Published',event_date:eventDate,ceremony_place:'QA synthetic venue'},partnerCookie);assert.equal(saved.status,200);
  invitation=await ownInvitation(invitation.id);const data=editorInvitation(parseInvitation(invitation));
  const published=await http('/api/admin/builder-state','POST',{invitationId:invitation.id,action:'publish',version:{id:report.tag+'-published',invitationId:invitation.id,label:'QA Commercial',source:'publish',createdAt:Date.now(),data}},partnerCookie);assert.equal(published.status,200);
  const page=await http('/i/'+invitation.slug);assert.equal(page.status,200);assert.ok(page.text.includes('QA Commercial Published'));
  invitation=await ownInvitation(invitation.id);const draft=await http('/api/admin/invitations','PUT',{id:invitation.id,expectedDraftRevision:invitation.draft_revision,names:'QA PRIVATE WORKING EDIT'},partnerCookie);assert.equal(draft.status,200);
  const again=await http('/i/'+invitation.slug);assert.equal(again.status,200);assert.equal(again.text.includes('QA PRIVATE WORKING EDIT'),false);
 });
}
async function cleanup(){
 report.cleanup='in-progress';write();
 const profile=must(await db.from('partners').select('id,email').eq('id',report.userId).maybeSingle(),'Verify cleanup partner');assert.ok(!profile||profile.email===report.email);
 const invitations=must(await db.from('invitations').select('id,slug').eq('partner_id',report.userId),'Read own cleanup scope');assert.ok(invitations.length<=3);assert.ok(invitations.every(item=>item.slug.startsWith('invitacion-azure-')));
 report.invitationIds=[...new Set([...report.invitationIds,...invitations.map(item=>item.id)])];write();
 for(const item of invitations){assert.equal(must(await db.from('guests').select('id').eq('invitation_id',item.id),'Verify no customer guests').length,0);must(await db.from('invitations').update({status:'disabled',published_version_id:null,scheduled_version_id:null}).eq('id',item.id).eq('partner_id',report.userId),'Pause own test');must(await db.from('invitations').delete().eq('id',item.id).eq('partner_id',report.userId),'Delete own event');}
 must(await db.from('partners').delete().eq('id',report.userId).eq('email',report.email),'Delete own partner ledger');
 for(const [table,key]of [['partners','id'],['partner_subscriptions','partner_id'],['partner_payments','partner_id'],['invitations','partner_id']])assert.equal(must(await db.from(table).select(key).eq(key,report.userId),'Verify cleaned '+table).length,0);
 for(const id of report.invitationIds)for(const table of ['builder_versions','builder_review_notes','invitation_validity_events','invitation_analytics_events','guests','guest_import_requests'])assert.equal(must(await db.from(table).select('invitation_id').eq('invitation_id',id),'Verify event records removed').length,0);
 const user=await db.auth.admin.getUserById(report.userId);
 if(!user.error){assert.equal(user.data.user.email,report.email);assert.equal(user.data.user.app_metadata.qa_tag,report.tag);must(await db.auth.admin.deleteUser(report.userId),'Delete own Auth user');}else assert.equal(user.error.status,404);
 const gone=await db.auth.admin.getUserById(report.userId);assert.equal(gone.error?.status,404);
 if(partnerCookie)assert.equal((await http('/api/partner/account','GET',undefined,partnerCookie)).status,401);
 report.cleanup='verified-no-fixtures-remain';write();console.log('OK: disposable Auth user, event and payment ledger removed');
}
write();(resuming?Promise.resolve():main()).catch(error=>{report.failure=error.message;write();console.error('FAIL: '+error.message);process.exitCode=1;}).finally(async()=>{try{await cleanup();}catch(error){report.cleanup='failed';report.cleanupFailure=error.message;write();console.error('FAIL: cleanup requires attention');process.exitCode=1;}});
