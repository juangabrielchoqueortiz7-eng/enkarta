// Contracts for private metrics and pages. No network, browser or credentials.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const c=require('../src/lib/commercial-dashboard.ts');
const anchor='2026-10-19T12:00:00.123456Z';
const cursor={asOf:anchor,createdAt:'2026-10-18T12:00:00.654321Z',id:'30000000-0000-4000-8000-000000000999',status:'all'};
function page(){
 const leads=Array.from({length:25},(_,n)=>({id:`30000000-0000-4000-8000-${String(100-n).padStart(12,'0')}`,reference:`EK-${n.toString(16).toUpperCase().padStart(8,'0')}`,status:'lost',package_key:'premium',design:'Lunaria',event_category:'Boda',placement:'qa',utm_source:'',utm_medium:'',utm_campaign:'',referrer_host:'',revenue_bs:null,notes:'',revision:0,created_at:cursor.createdAt,updated_at:cursor.createdAt}));
 const summary={visits:10055,landingViews:10055,designViews:0,processViews:0,whatsappOpens:1255,contacts:1255,reserved:0,sales:0,revenue:0,intentRate:12,conversationRate:100,closeRate:0},group=[{label:'Lunaria',opens:1255,contacts:1255,sales:0}];
 return{periodDays:180,asOf:anchor,syncedAt:anchor,summary,sources:group,campaigns:group,packages:group,events:group,designs:group,statuses:['whatsapp_open','contacted','reserved','won','lost'].map(status=>({status,label:status,value:status==='lost'?1255:0})),leads,pagination:{size:25,total:1255,hasMore:true,nextCursor:c.encodeCommercialCursor({...cursor,id:leads[24].id})}};
}
test('cursor timestamps retain six decimals and reject impossible calendars or offsets',()=>{
 assert.equal(c.commercialTimestamp(anchor),anchor);assert.equal(c.commercialTimestamp('2026-10-19T12:00:00Z'),'2026-10-19T12:00:00.000000Z');
 for(const value of ['2026-02-31T12:00:00Z','2026-10-19T25:00:00Z','2026-10-19T12:00:00+00:00','2026-10-19T12:00:00.1234567Z','x',null])assert.equal(c.commercialTimestamp(value),null);
});
test('cursor roundtrip preserves tie breaker, reporting cutoff and status without private fields',()=>{const encoded=c.encodeCommercialCursor(cursor);assert.match(encoded,/^[\w-]+$/);assert.deepEqual(c.decodeCommercialCursor(encoded),cursor);assert.ok(encoded.length<768);});
test('cursors reject oversized, malformed, unsupported and partial payloads',()=>{
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 for(const raw of ['', '!', 'x'.repeat(769),encode({v:2,...cursor}),encode({v:1,...cursor,session_hash:'SECRET'}),encode({v:1,...cursor,id:'bad'}),encode({v:1,...cursor,createdAt:'2027-01-01T00:00:00Z'}),encode({v:1,...cursor,createdAt:'2020-01-01T00:00:00Z'}),encode({v:1,...cursor,status:'paid'})])assert.equal(c.decodeCommercialCursor(raw),null);
});
test('query requires one status and a cursor bound to that status',()=>{
 assert.deepEqual(c.parseCommercialDashboardQuery(new URLSearchParams()),{status:'all',cursor:null});
 const encoded=c.encodeCommercialCursor(cursor);assert.deepEqual(c.parseCommercialDashboardQuery(new URLSearchParams({status:'all',cursor:encoded})),{status:'all',cursor});
 for(const query of ['status=lost&status=all','cursor=x&cursor=y','page=1','size=1000','status=won&cursor='+encoded,'cursor=','status=paid'])assert.equal(c.parseCommercialDashboardQuery(new URLSearchParams(query)),null);
});
test('25 contacts can accompany metrics covering 1255 contacts and 10055 visits',()=>{const p=page(),parsed=c.parseCommercialDashboard(p);assert.equal(parsed.leads.length,25);assert.deepEqual(parsed.summary,p.summary);assert.equal(parsed.pagination.total,1255);assert.equal(parsed.statuses[4].label,'No concretó');});
test('filter validation retains global metrics and whitelists every returned object',()=>{
 const p=page();p.pagination.nextCursor=c.encodeCommercialCursor({...cursor,status:'lost',id:p.leads[24].id});p.password='NEVER';p.summary.token='NEVER';p.leads[0].session_hash='NEVER';p.designs[0].secret='NEVER';
 const parsed=c.parseCommercialDashboard(p,'lost');assert.ok(parsed);assert.equal(parsed.summary.whatsappOpens,1255);assert.ok(!JSON.stringify(parsed).includes('NEVER'));
 assert.equal(c.parseCommercialDashboard(p,'won'),null);
});
test('incomplete, duplicated, reordered and oversized pages never replace current contacts',()=>{
 for(const change of [p=>p.leads.pop(),p=>p.leads.push(p.leads[0]),p=>p.leads[1]=p.leads[0],p=>p.leads.reverse(),p=>delete p.summary.visits,p=>p.statuses.pop(),p=>p.statuses[0].value=1,p=>p.pagination.total=3,p=>p.pagination.hasMore=false,p=>p.pagination.size=1000,p=>p.sources=null,p=>p.summary.revenue=Infinity,p=>p.leads[0].revision=-1]){const p=page();change(p);assert.equal(c.parseCommercialDashboard(p),null);}
});
test('next-page cursors must identify the actual last contact and matching period',()=>{
 for(const patch of [{id:cursor.id},{status:'lost'},{asOf:'2026-10-19T12:00:01.123456Z'},{createdAt:'2026-10-18T12:00:00.654320Z'}]){const p=page();p.pagination.nextCursor=c.encodeCommercialCursor({...cursor,id:p.leads[24].id,...patch});assert.equal(c.parseCommercialDashboard(p),null);}
});
test('a final or empty page has no fabricated continuation',()=>{
 const p=page();p.leads=p.leads.slice(0,2);p.pagination.hasMore=false;p.pagination.nextCursor=null;assert.ok(c.parseCommercialDashboard(p));p.leads=[];assert.ok(c.parseCommercialDashboard(p));p.pagination.nextCursor=c.encodeCommercialCursor(cursor);assert.equal(c.parseCommercialDashboard(p),null);
});
test('request sends one explicit private GET with its signal and exact cursor',async()=>{
 let calls=0;const signal=new AbortController().signal;
 const result=await c.requestCommercialDashboard({status:'all',cursor},async(url,options)=>{calls++;const parsed=new URL(url,'https://test.invalid');assert.equal(parsed.pathname,'/api/admin/commercial');assert.deepEqual(c.decodeCommercialCursor(parsed.searchParams.get('cursor')),cursor);assert.equal(options.cache,'no-store');assert.equal(options.signal,signal);assert.equal(options.method,undefined);return Response.json(page());},signal);
 assert.equal(calls,1);assert.equal(result.summary.visits,10055);
});
test('transport failure never retries, exposes internals or manufactures metrics',async()=>{let calls=0;await assert.rejects(c.requestCommercialDashboard({status:'all',cursor:null},async()=>{calls++;throw Error('PRIVATE_INTERNAL_DETAIL');}),/Revisa tu conexión/);assert.equal(calls,1);});
test('session, migration, database and truncated replies remain failures',async()=>{
 for(const[status,body]of[[401,{}],[503,{code:'MIGRATION_REQUIRED'}],[500,{}],[200,{}]])await assert.rejects(c.requestCommercialDashboard({status:'all',cursor:null},async()=>Response.json(body,{status})));
 await assert.rejects(c.requestCommercialDashboard({status:'all',cursor:null},async()=>new Response('{PRIVATE_INTERNAL_DETAIL')),/respuesta de Ventas llegó incompleta/);
});
test('request rejects a different anchor or a repeated page despite a valid response shape',async()=>{
 const wrong=page();wrong.asOf='2026-10-19T12:00:01.123456Z';wrong.pagination.nextCursor=c.encodeCommercialCursor({...cursor,asOf:wrong.asOf,id:wrong.leads[24].id});
 await assert.rejects(c.requestCommercialDashboard({status:'all',cursor},async()=>Response.json(wrong)));
 const p=page();await assert.rejects(c.requestCommercialDashboard({status:'all',cursor:{...cursor,id:p.leads[5].id}},async()=>Response.json(p)),/página/);
});
test('development dashboard fixture is unavailable outside development',()=>{const source=fs.readFileSync(path.join(root,'src/app/dev/services/commercial-dashboard/page.tsx'),'utf8');assert.match(source,/process\.env\.NODE_ENV !== 'development'/);assert.match(source,/notFound\(\)/);});
test('changing page retains pending editors and drops clean contacts from the previous page',()=>{
 const first=page().leads,second=first.slice(20).map((lead,index)=>({...lead,id:`40000000-0000-4000-8000-${String(index).padStart(12,'0')}`}));
 const merged=c.mergeCommercialPageEditors(first,second,new Set([first[0].id,first[2].id]));
 assert.deepEqual(merged.slice(0,5),second);assert.equal(merged.length,7);assert.strictEqual(merged[5],first[0]);assert.strictEqual(merged[6],first[2]);assert.equal(first.length,25);
 const settled=c.mergeCommercialPageEditors(merged,second,new Set());assert.deepEqual(settled,second);
});
test('page refresh never rolls back a saved revision or mounts a duplicate editor',()=>{
 const old=page().leads[0],saved={...old,revision:3,notes:'QA guardado confirmado'},incoming={...old,revision:1};
 const merged=c.mergeCommercialPageEditors([saved],[incoming],new Set([saved.id]));assert.deepEqual(merged,[saved]);
 const newer={...old,revision:4,notes:'QA otra pantalla'};assert.deepEqual(c.mergeCommercialPageEditors(merged,[newer],new Set([saved.id])),[newer]);
});
test('an exact lookup can open a contact from 2001 without admitting it into reporting pages',()=>{
 const historic={...page().leads[0],created_at:'2001-01-01T12:00:00Z',updated_at:'2001-01-01T12:00:00Z'};
 const opened=c.openCommercialLeadEditor([],historic,new Set());assert.equal(opened.length,1);assert.deepEqual(opened[0],historic);
 const report=page();report.leads[0]=historic;assert.equal(c.parseCommercialDashboard(report),null);
});
test('an explicitly opened clean contact survives page changes and empty filtered pages',()=>{
 const first=page().leads,opened=first[0],second=first.slice(20);
 const merged=c.mergeCommercialPageEditors(first,second,new Set(),opened.id);assert.equal(merged.length,6);assert.strictEqual(merged[5],opened);
 const empty=c.mergeCommercialPageEditors(merged,[],new Set(),opened.id);assert.deepEqual(empty,[opened]);
 const released=c.mergeCommercialPageEditors(empty,[],new Set());assert.deepEqual(released,[]);
});
test('opening an already visible contact reuses its one editor and keeps page order',()=>{
 const prior=page().leads,opened=c.openCommercialLeadEditor(prior,prior[7],new Set(prior.map(row=>row.id)));
 assert.equal(opened.length,25);assert.deepEqual(opened.map(row=>row.id),prior.map(row=>row.id));assert.strictEqual(opened[7],prior[7]);
 const merged=c.mergeCommercialPageEditors(opened,prior,new Set(),prior[7].id);assert.equal(merged.length,25);assert.equal(merged.filter(row=>row.id===prior[7].id).length,1);
});
test('opening another reference retains pending and visible editors while dropping a clean old selection',()=>{
 const [visible,pending,clean,next]=page().leads;
 const prior=[visible,pending,clean],retained=new Set([visible.id,pending.id]);
 const opened=c.openCommercialLeadEditor(prior,next,retained);
 assert.deepEqual(opened,[visible,pending,next]);assert.strictEqual(opened[0],visible);assert.strictEqual(opened[1],pending);assert.equal(opened.some(row=>row.id===clean.id),false);
});
test('an older or equal lookup never rolls back or replaces an existing editor revision',()=>{
 const source=page().leads[0],latest={...source,revision:4,notes:'QA versión actual'};
 for(const revision of [0,3,4]){
  const opened=c.openCommercialLeadEditor([latest],{...source,revision,notes:'QA consulta previa'},new Set());
  assert.deepEqual(opened,[latest]);assert.strictEqual(opened[0],latest);
 }
});
test('a newer lookup updates one editor without changing unrelated retained contacts',()=>{
 const [old,other]=page().leads,next={...old,revision:5,notes:'QA versión nueva'};
 const opened=c.openCommercialLeadEditor([other,old],next,new Set([other.id]));
 assert.deepEqual(opened,[other,next]);assert.strictEqual(opened[0],other);
 assert.equal(opened.filter(row=>row.id===old.id).length,1);
});
test('new lookup data is whitelisted before it enters editable state',()=>{
 const source=page().leads[0],incoming={...source,password:'QA_PRIVATE_PASSWORD',session_hash:'QA_PRIVATE_SESSION',payload:{token:'QA_PRIVATE_TOKEN'}};
 const opened=c.openCommercialLeadEditor([],incoming,new Set());
 assert.deepEqual(opened,[source]);assert.notStrictEqual(opened[0],incoming);assert.doesNotMatch(JSON.stringify(opened),/QA_PRIVATE/);
 assert.equal(incoming.password,'QA_PRIVATE_PASSWORD');
});
test('malformed lookup data cannot prune or alter existing editors',()=>{
 const prior=page().leads;
 for(const incoming of [null,[],{}, {...prior[0],id:'bad'},{...prior[0],reference:'EK-INVALID'},{...prior[0],revision:-1},{...prior[0],status:'paid'},{...prior[0],notes:undefined}])assert.strictEqual(c.openCommercialLeadEditor(prior,incoming,new Set()),prior);
});
test('opening and retaining contacts does not mutate input arrays, contacts or retained IDs',()=>{
 const [old,other,next]=page().leads.map(Object.freeze),prior=Object.freeze([old,other]),retained=new Set([other.id]);
 const snapshot=JSON.stringify(prior),opened=c.openCommercialLeadEditor(prior,next,retained);
 assert.deepEqual(opened,[other,next]);assert.equal(JSON.stringify(prior),snapshot);assert.deepEqual([...retained],[other.id]);
 const merged=c.mergeCommercialPageEditors(Object.freeze(opened),Object.freeze([other]),new Set(),next.id);assert.deepEqual(merged,[other,next]);assert.equal(JSON.stringify(prior),snapshot);
});
test('reopening the same reference cannot accumulate duplicate editors',()=>{
 const [lead,other]=page().leads,retained=new Set([other.id]);
 let opened=[other];for(let revision=0;revision<4;revision++)opened=c.openCommercialLeadEditor(opened,{...lead,revision},retained);
 assert.equal(opened.length,2);assert.equal(opened.filter(row=>row.id===lead.id).length,1);assert.equal(opened[1].revision,3);assert.strictEqual(opened[0],other);
});
