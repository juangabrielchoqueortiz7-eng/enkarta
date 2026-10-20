// History contracts and rendering against synthetic records. No network or credentials.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const h=require('../src/lib/commercial-history.ts');
const lead={id:'30000000-0000-4000-8000-000000000001',reference:'EK-A1B2C3D4'};
const other={id:'30000000-0000-4000-8000-000000000002',reference:'EK-1234ABCD'};
const anchor='2025-01-02T12:00:00.123456Z',time='2024-01-01T12:00:00.654321Z';
const cursor={leadId:lead.id,asOf:anchor,createdAt:'2024-01-02T12:00:00.654321Z',id:'40000000-0000-4000-8000-000000000999'};
function page(){const entries=Array.from({length:20},(_,i)=>({id:`40000000-0000-4000-8000-${String(100-i).padStart(12,'0')}`,lead_id:lead.id,from_status:'contacted',to_status:i%2?'reserved':'contacted',revenue_bs:i%2?0:null,note:'QA: nota <ficticia> con acentos y emoji 🌿',created_at:time}));return{lead:{...lead},asOf:anchor,entries,pagination:{size:20,hasMore:true,nextCursor:h.encodeCommercialHistoryCursor({...cursor,createdAt:time,id:entries[19].id})}};}
const response=(body,status=200)=>Response.json(body,{status});

test('history timestamps preserve PostgreSQL microseconds and normalize UTC suffixes',()=>{
 assert.equal(h.commercialHistoryTimestamp(time),time);assert.equal(h.commercialHistoryTimestamp(time.replace('Z','+00:00')),time);
 assert.equal(h.commercialHistoryTimestamp('2024-01-01T12:00:00Z'),'2024-01-01T12:00:00.000000Z');
 for(const v of ['2024-02-31T12:00:00Z','2024-01-01T25:00:00Z','2024-01-01T12:00:00.1234567Z','2024-01-01T12:00:00+04:00',null,'x'])assert.equal(h.commercialHistoryTimestamp(v),null);
});
test('history cursors bind the exact contact, cutoff and last tuple without note data',()=>{
 const encoded=h.encodeCommercialHistoryCursor(cursor);assert.match(encoded,/^[A-Za-z0-9_-]+$/);assert.deepEqual(h.decodeCommercialHistoryCursor(encoded),cursor);assert.ok(encoded.length<768);
});
test('invalid, future, overlong and extra-field history cursors are rejected',()=>{
 const raw=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 for(const v of ['', '!', 'x'.repeat(769),raw({v:2,...cursor}),raw({v:1,...cursor,notes:'PRIVATE'}),raw({v:1,...cursor,leadId:'bad'}),raw({v:1,...cursor,id:'bad'}),raw({v:1,...cursor,createdAt:'2027-01-01T00:00:00Z'}),raw({v:1,...cursor,asOf:'2099-01-01T00:00:00Z'})])assert.equal(h.decodeCommercialHistoryCursor(v),null);
});
test('query validation requires one lead ID and rejects mismatched or ambiguous pages',()=>{
 const encoded=h.encodeCommercialHistoryCursor(cursor);
 assert.deepEqual(h.parseCommercialHistoryQuery(new URLSearchParams({leadId:lead.id})),{leadId:lead.id,cursor:null,asOf:null});
 assert.deepEqual(h.parseCommercialHistoryQuery(new URLSearchParams({leadId:lead.id,cursor:encoded})),{leadId:lead.id,cursor,asOf:null});
 for(const q of ['',`leadId=${lead.id}&leadId=${lead.id}`,`leadId=${lead.id}&cursor=x&cursor=y`,`leadId=${other.id}&cursor=${encoded}`,`leadId=${lead.id}&cursor=`,`leadId=${lead.id}&limit=1000`,`leadId=${lead.id}&reference=${lead.reference}`,'leadId=bad,or(id.gt.0)'])assert.equal(h.parseCommercialHistoryQuery(new URLSearchParams(q)),null);
});

test('an explicit first-page cutoff keeps microseconds, accepts UTC equivalents and allows old contacts',()=>{
 for(const raw of [anchor,anchor.replace('Z','+00:00')])assert.deepEqual(h.parseCommercialHistoryQuery(new URLSearchParams({leadId:lead.id,asOf:raw})),{leadId:lead.id,cursor:null,asOf:anchor});
 assert.deepEqual(h.parseCommercialHistoryQuery(new URLSearchParams({leadId:lead.id,asOf:'2001-01-01T00:00:00Z'})),{leadId:lead.id,cursor:null,asOf:'2001-01-01T00:00:00.000000Z'});
});

test('cutoff queries reject duplicates, cursor combinations, malformed dates and controls before reading',()=>{
 const encoded=h.encodeCommercialHistoryCursor(cursor),queries=[new URLSearchParams({leadId:lead.id,cursor:encoded,asOf:anchor}),new URLSearchParams([['leadId',lead.id],['asOf',anchor],['asOf',anchor]])];
 for(const asOf of ['',anchor+'\n',anchor+' ',anchor.slice(0,-1)+'7Z','2024-02-31T12:00:00Z','2024-01-01','2024-01-01T12:00:00+04:00','2099-01-01T00:00:00Z','x,or(id.gt.0)'])queries.push(new URLSearchParams({leadId:lead.id,asOf}));
 for(const query of queries)assert.equal(h.parseCommercialHistoryQuery(query),null,query.toString());
});

test('explicit cutoff queries use the same one-minute future tolerance as history cursors',t=>{
 const now=Date.now();t.mock.method(Date,'now',()=>now);
 const accepted=new Date(now+60000).toISOString(),future=new Date(now+60001).toISOString();
 assert.equal(h.parseCommercialHistoryQuery(new URLSearchParams({leadId:lead.id,asOf:accepted})).asOf,h.commercialHistoryTimestamp(accepted));
 assert.equal(h.parseCommercialHistoryQuery(new URLSearchParams({leadId:lead.id,asOf:future})),null);
});
test('old history, same-state note changes, zero and null revenue retain their meaning',()=>{
 const p=page();p.entries[2].revenue_bs='999999999.99';const parsed=h.parseCommercialHistoryPage(p,lead);
 assert.ok(parsed);assert.equal(parsed.entries.length,20);assert.equal(parsed.entries[0].from_status,parsed.entries[0].to_status);assert.equal(parsed.entries[0].revenue_bs,null);assert.equal(parsed.entries[1].revenue_bs,0);assert.equal(parsed.entries[2].revenue_bs,999999999.99);assert.equal(parsed.entries[0].created_at,time);
});
test('history whitelists nested data and never exposes a request receipt or actor claim',()=>{
 const p=page();p.secret='PRIVATE';p.lead.session_hash='PRIVATE';p.entries[0].request_payload='PRIVATE';p.entries[0].actor='PRIVATE';p.pagination.password='PRIVATE';
 const parsed=h.parseCommercialHistoryPage(p,lead);assert.ok(parsed);assert.ok(!JSON.stringify(parsed).includes('PRIVATE'));assert.deepEqual(Object.keys(parsed.entries[0]).sort(),['id','lead_id','from_status','to_status','revenue_bs','note','created_at'].sort());
});
test('a response cannot substitute another reference or another contact history',()=>{
 for(const change of [p=>p.lead=other,p=>p.lead.reference=other.reference,p=>p.entries[0].lead_id=other.id,p=>p.entries[0].id='bad']){const p=page();change(p);assert.equal(h.parseCommercialHistoryPage(p,lead),null);}
});
test('malformed entries, invalid revenue, duplicate IDs and wrong microsecond order fail closed',()=>{
 for(const change of [p=>p.entries[0].note='x'.repeat(1001),p=>p.entries[0].to_status='paid',p=>p.entries[0].revenue_bs=true,p=>p.entries[0].revenue_bs=-1,p=>p.entries[0].revenue_bs=Infinity,p=>p.entries[1]=p.entries[0],p=>p.entries.reverse(),p=>p.entries[1].created_at='2024-01-01T12:00:00.654322Z',p=>p.entries[0].created_at='2025-01-02T12:00:00.123457Z']){const p=page();change(p);assert.equal(h.parseCommercialHistoryPage(p,lead),null);}
});
test('continuation must represent exactly the last of twenty returned entries',()=>{
 for(const change of [p=>p.entries.pop(),p=>p.entries.push(p.entries[0]),p=>p.pagination.size=21,p=>p.pagination.hasMore=false,p=>p.pagination.nextCursor=h.encodeCommercialHistoryCursor(cursor),p=>p.pagination.nextCursor=h.encodeCommercialHistoryCursor({...cursor,leadId:other.id,createdAt:time,id:p.entries[19].id})]){const p=page();change(p);assert.equal(h.parseCommercialHistoryPage(p,lead),null);}
});
test('empty history and final short pages have no fabricated continuation',()=>{
 const p=page();p.entries=p.entries.slice(0,3);p.pagination={size:20,hasMore:false,nextCursor:null};assert.ok(h.parseCommercialHistoryPage(p,lead));p.entries=[];assert.ok(h.parseCommercialHistoryPage(p,lead));p.pagination.nextCursor=h.encodeCommercialHistoryCursor(cursor);assert.equal(h.parseCommercialHistoryPage(p,lead),null);
});
test('the next history page must keep the cutoff and stay strictly behind its cursor',()=>{
 const p=page();assert.ok(h.parseCommercialHistoryPage(p,lead,h.encodeCommercialHistoryCursor(cursor)));
 assert.equal(h.parseCommercialHistoryPage(p,lead,h.encodeCommercialHistoryCursor({...cursor,id:p.entries[5].id,createdAt:time})),null);
 assert.equal(h.parseCommercialHistoryPage(p,lead,h.encodeCommercialHistoryCursor({...cursor,asOf:'2025-01-03T00:00:00.000000Z'})),null);
});

test('a first-page response must match its requested cutoff even when the page is empty or short',()=>{
 const p=page();p.entries=p.entries.slice(0,2);p.pagination={size:20,hasMore:false,nextCursor:null};
 assert.ok(h.parseCommercialHistoryPage(p,lead,null,anchor));assert.ok(h.parseCommercialHistoryPage(p,lead,null,anchor.replace('Z','+00:00')));
 for(const expected of ['2025-01-02T12:00:00.123457Z','2025-01-01T12:00:00.123456Z','',anchor+'\n',{},[]])assert.equal(h.parseCommercialHistoryPage(p,lead,null,expected),null);
 p.entries=[];assert.ok(h.parseCommercialHistoryPage(p,lead,null,anchor));assert.equal(h.parseCommercialHistoryPage({...p,asOf:'2025-01-02T12:00:00.123457Z'},lead,null,anchor),null);
});

test('an inclusive first page accepts the maximum UUID exactly at its cutoff without a sentinel',()=>{
 const p=page(),first={...p.entries[0],id:'ffffffff-ffff-ffff-ffff-ffffffffffff',created_at:anchor};p.entries=[first,...p.entries.slice(0,19)];
 const last=p.entries.at(-1);p.pagination.nextCursor=h.encodeCommercialHistoryCursor({leadId:lead.id,asOf:anchor,createdAt:last.created_at,id:last.id});
 const parsed=h.parseCommercialHistoryPage(p,lead,null,anchor);assert.ok(parsed);assert.equal(parsed.entries[0].id,first.id);assert.equal(parsed.entries[0].created_at,anchor);
});
test('history transport sends one private read with the abort signal and no note in its URL',async()=>{
 let calls=0;const signal=new AbortController().signal,encoded=h.encodeCommercialHistoryCursor(cursor);
 const p=await h.requestCommercialHistory(lead,encoded,async(url,options)=>{calls++;const u=new URL(url,'https://test.invalid');assert.equal(u.pathname,'/api/admin/commercial/history');assert.equal(u.searchParams.get('leadId'),lead.id);assert.equal(u.searchParams.get('cursor'),encoded);assert.equal(u.searchParams.size,2);assert.equal(options.cache,'no-store');assert.ok(options.signal instanceof AbortSignal);assert.notEqual(options.signal,signal);assert.equal(options.signal.aborted,false);assert.equal(options.method,undefined);return response(page());},signal);
 assert.equal(calls,1);assert.equal(p.entries.length,20);
});

test('returning to the first page sends the normalized cutoff without a cursor or editing data',async()=>{
 let calls=0;const signal=new AbortController().signal,source=page();source.entries=source.entries.slice(0,2);source.pagination={size:20,hasMore:false,nextCursor:null};
 const result=await h.requestCommercialHistory(lead,null,async(url,options)=>{calls++;const u=new URL(url,'https://test.invalid');assert.deepEqual([...u.searchParams], [['leadId',lead.id],['asOf',anchor]]);assert.equal(options.cache,'no-store');assert.equal(options.method,undefined);assert.equal(options.body,undefined);assert.ok(options.signal instanceof AbortSignal);assert.notEqual(options.signal,signal);return response(source);},signal,anchor.replace('Z','+00:00'));
 assert.equal(result.asOf,anchor);assert.equal(calls,1);
});

test('invalid or combined local cutoffs reject before transport and never coerce objects into timestamps',async()=>{
 let calls=0;const transport=async()=>{calls++;return response(page());},encoded=h.encodeCommercialHistoryCursor(cursor);
 for(const asOf of ['',anchor+'\n','2099-01-01T00:00:00Z',[],{toString:()=>anchor},1])await assert.rejects(h.requestCommercialHistory(lead,null,transport,undefined,asOf),/identificar el contacto/);
 await assert.rejects(h.requestCommercialHistory(lead,encoded,transport,undefined,anchor),/identificar el contacto/);assert.equal(calls,0);
});

test('a successful first-page HTTP response cannot substitute a cutoff differing by one microsecond',async()=>{
 const p=page();p.entries=p.entries.slice(0,2);p.pagination={size:20,hasMore:false,nextCursor:null};p.asOf='2025-01-02T12:00:00.123457Z';let calls=0;
 await assert.rejects(h.requestCommercialHistory(lead,null,async()=>{calls++;return response(p);},undefined,anchor),/incompleto/);assert.equal(calls,1);
});
test('invalid local identity or another contact cursor never reaches the transport',async()=>{
 let calls=0;const transport=async()=>{calls++;return response(page());};
 await assert.rejects(h.requestCommercialHistory({...lead,id:'bad'},null,transport));await assert.rejects(h.requestCommercialHistory({...lead,reference:other.reference.toLowerCase()},null,transport));await assert.rejects(h.requestCommercialHistory(other,h.encodeCommercialHistoryCursor(cursor),transport));assert.equal(calls,0);
});
test('network failures and malformed JSON remain recoverable errors without internal details or retry',async()=>{
 let calls=0;await assert.rejects(h.requestCommercialHistory(lead,null,async()=>{calls++;throw Error('PRIVATE_INTERNAL');}),/Revisa tu conexión/);assert.equal(calls,1);
 await assert.rejects(h.requestCommercialHistory(lead,null,async()=>new Response('{PRIVATE_INTERNAL')),/incompleto/);
});
test('session, deletion, migration and server errors cannot masquerade as an empty history',async()=>{
 for(const[status,body,pattern]of[[401,{},/sesión/],[404,{},/ya no está disponible/],[503,{code:'MIGRATION_REQUIRED'},/migración 012/],[500,{error:'PRIVATE_INTERNAL'},/No se pudo cargar/],[200,{},/incompleto/]])await assert.rejects(h.requestCommercialHistory(lead,null,async()=>response(body,status)),pattern);
});
test('the collapsed history renders an accessible read action without another editing surface',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),History=require('../src/components/admin/CommercialLeadHistory.tsx').default;
 let calls=0;const html=renderToStaticMarkup(React.createElement(History,{lead:{...lead,revision:0},transport:async()=>{calls++;throw Error('Unexpected read during render');}}));
 assert.match(html,/Ver historial/);assert.match(html,/aria-expanded="false"/);assert.doesNotMatch(html,/<input|<select|<textarea|<form|Guardar/);assert.equal(calls,0);
});
test('history workbench rejects production and test environments before exposing its fixture',()=>{
 const Page=require('../src/app/dev/services/commercial-history/page.tsx').default,prior=process.env.NODE_ENV;
 try{for(const env of ['production','test']){process.env.NODE_ENV=env;assert.throws(()=>Page(),/404|NEXT_HTTP_ERROR_FALLBACK/);}process.env.NODE_ENV='development';assert.ok(Page());}finally{if(prior===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=prior;}
});
