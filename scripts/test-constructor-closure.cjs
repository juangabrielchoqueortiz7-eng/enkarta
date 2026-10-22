// Actual persistence and library helpers; all transport/storage/time is isolated.
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const {builderRequest,boundedBuilderTask,BuilderRequestError}=require('../src/lib/builder-request.ts'),versions=require('../src/lib/builder-versions.ts'),sections=require('../src/lib/user-sections.ts'),templates=require('../src/lib/user-templates.ts'),elements=require('../src/lib/user-elements.ts'),packs=require('../src/lib/user-decor-packs.ts'),kits=require('../src/lib/user-design-kits.ts'),{builderLibraryKey}=require('../src/lib/builder-library-key.ts');
const id='30000000-0000-4000-8000-000000000001',other='30000000-0000-4000-8000-000000000002',scopeA='partner:'+id,scopeB='partner:'+other,V='enkarta_builder_versions_v1',N='enkarta_builder_review_notes_v1';
const clone=v=>JSON.parse(JSON.stringify(v)),deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const draft=(name='QA original')=>({id,slug:'qa-closure',names:name,template:'azure',type:'boda',config:{layout:{version:2,blocks:[{id:'original-block',type:'text',props:{text:'Original',asset:'/original.json'}}]},musicUrl:'/musica/musica1.mp3',galleryImages:['/catalog/azure.jpg']}});
const version=()=>({id:'version-qa',invitationId:id,label:'QA checkpoint',source:'manual',createdAt:1,data:draft()});
const note=()=>({id:'note-qa',invitationId:id,text:'QA observation',author:'QA',createdAt:1,status:'pending',role:'admin',resolved:false});
async function isolated(run,{seed={},reply}={}){
 const oldWindow=global.window,oldFetch=global.fetch,values=new Map(Object.entries(seed).map(([k,v])=>[k,typeof v==='string'?v:JSON.stringify(v)])),requests=[];
 global.window={localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
 global.fetch=async(url,init={})=>{
  assert.ok(/^\/api\/(admin\/(builder-state|sections|templates)|auth\/signout)(\?|$)/.test(String(url)),'No real network or unrelated route');
  const q={url,method:init.method??'GET',body:init.body?JSON.parse(init.body):null,signal:init.signal};requests.push(q);
  return reply?.(q,requests)??Response.json(q.method==='GET'?(String(url).startsWith('/api/admin/builder-state')?{versions:[],notes:[]}:[]):{success:true});
 };
 try{return await run({values,requests});}finally{await new Promise(done=>setImmediate(done));global.fetch=oldFetch;if(oldWindow===undefined)delete global.window;else global.window=oldWindow;}
}

for(const phase of ['headers','JSON'])test('bounded mutations settle stalled '+phase+', abort once, and ignore late results',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();await isolated(async r=>{
  const pending=builderRequest('/api/admin/builder-state',{method:'POST',body:'{}'},v=>v?.success===true);const rejection=assert.rejects(pending,e=>e instanceof BuilderRequestError&&e.uncertain);
  t.mock.timers.tick(24_999);await Promise.resolve();assert.equal(r.requests[0].signal.aborted,false);t.mock.timers.tick(1);await rejection;
  assert.equal(r.requests[0].signal.aborted,true);wait.resolve(phase==='headers'?Response.json({success:true}):{success:true});await new Promise(done=>setImmediate(done));assert.equal(r.requests.length,1);
 },{reply:()=>phase==='headers'?wait.promise:{ok:true,status:200,json:()=>wait.promise}});
});
test('cancellation and an already canceled signal prevent subsequent work',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;await assert.rejects(boundedBuilderTask(async()=>{calls++;},{signal:controller.signal}));assert.equal(calls,0);
});
test('an elapsed deadline is enforced even when the event loop has not dispatched its timer',async()=>{
 const wait=deferred(),now=Date.now;let stamp=0;Date.now=()=>stamp;try{const pending=boundedBuilderTask(()=>wait.promise,{mutation:true});stamp=25000;wait.resolve({success:true});await assert.rejects(pending,e=>e.uncertain);}finally{Date.now=now;}
});
test('HTTP failures and malformed acknowledgements cannot be mistaken for completed mutations',async()=>{
 for(const [status,body,uncertain] of [[409,{error:'QA conflict'},false],[503,{error:'QA unavailable'},true],[200,{},true],[200,{success:'true'},true]])await isolated(async()=>{await assert.rejects(builderRequest('/api/admin/builder-state',{method:'POST',body:'{}'},v=>v?.success===true),e=>e.uncertain===uncertain);},{reply:()=>Response.json(body,{status})});
});
test('a publication is never placed in the local mirror before its server acknowledgement',async()=>{
 const wait=deferred();await isolated(async r=>{
  const pending=versions.persistBuilderVersion(draft(),'QA publish','publish','','admin','publish');assert.deepEqual(versions.listBuilderVersions(id),[]);
  wait.resolve(Response.json({success:true}));const result=await pending;assert.equal(result.version.id,versions.listBuilderVersions(id)[0].id);assert.equal(r.requests.length,1);
 },{reply:()=>wait.promise});
});
test('rejected or corrupt publication ACK retains previous history and never creates a phantom publication',async()=>{
 for(const body of [{},null,{success:false}])await isolated(async()=>{await assert.rejects(versions.persistBuilderVersion(draft(),'QA phantom','publish','','admin','publish'));assert.deepEqual(versions.listBuilderVersions(id),[version()]);},{seed:{[V]:[version()]},reply:()=>Response.json(body)});
});
test('a late concurrent checkpoint is retained after a publication acknowledgement',async()=>{
 const wait=deferred();await isolated(async r=>{
  const pending=versions.persistBuilderVersion(draft(),'QA publish','publish','','admin','publish');const other=versions.saveBuilderVersion(draft('QA latest'),'QA checkpoint','manual');wait.resolve(Response.json({success:true}));const result=await pending;assert(result.versions.some(v=>v.id===other[0].id));assert.equal(result.versions.length,2);
 },{reply:q=>q.body?.action==='publish'?wait.promise:Response.json({success:true})});
});
test('deleting a version waits for ACK and preserves it on refusal or uncertainty',async()=>{
 for(const status of [200,409,503]){const wait=deferred();await isolated(async()=>{
  const pending=versions.persistDeleteBuilderVersion(id,version().id);assert.equal(versions.listBuilderVersions(id).length,1);const handled=status===200?pending:assert.rejects(pending);wait.resolve(Response.json(status===200?{success:true}:{error:'QA refused'},{status}));await handled;assert.equal(versions.listBuilderVersions(id).length,status===200?0:1);
 },{seed:{[V]:[version()]},reply:()=>wait.promise});}
});
test('notes are added, patched and removed only after a verified response',async()=>{
 let wait=deferred();await isolated(async()=>{
  let pending=versions.persistReviewNote(id,'QA exact note','QA',undefined,'admin');assert.deepEqual(versions.listReviewNotes(id),[]);wait.resolve(Response.json({success:true}));await pending;const added=versions.listReviewNotes(id)[0];
  wait=deferred();pending=versions.persistPatchReviewNote(id,added.id,{status:'approved'});assert.equal(versions.listReviewNotes(id)[0].status,'pending');wait.resolve(Response.json({success:true}));await pending;assert.equal(versions.listReviewNotes(id)[0].status,'approved');
  wait=deferred();pending=versions.persistDeleteReviewNote(id,added.id);assert.equal(versions.listReviewNotes(id).length,1);wait.resolve(Response.json({success:true}));await pending;assert.deepEqual(versions.listReviewNotes(id),[]);
 },{reply:()=>wait.promise});
});
test('an uncertain note never appears as an acknowledged approval or loses previous notes',async()=>{
 await isolated(async()=>{await assert.rejects(versions.persistReviewNote(id,'QA uncertain approval','QA',undefined,'client','approved'));assert.deepEqual(versions.listReviewNotes(id),[note()]);},{seed:{[N]:[note()]},reply:()=>Response.json({})});
});
test('a history read never silently re-uploads stale versions or notes',async()=>{
 await isolated(async r=>{await versions.hydrateBuilderState(id);assert.equal(r.requests.filter(q=>q.method!=='GET').length,0);},{seed:{[V]:[version()],[N]:[note()]}});
});
test('foreign or malformed history cannot enter this invitation mirror',async()=>{
 for(const body of [{versions:[{...version(),invitationId:other}],notes:[]},{versions:[],notes:[{...note(),role:'unknown'}]},{versions:[],notes:[{...note(),author:null}]}])await isolated(async()=>{const before=versions.listBuilderVersions(id),state=await versions.hydrateBuilderState(id);assert.equal(state.cloud,false);assert.deepEqual(versions.listBuilderVersions(id),before);},{seed:{[V]:[version()]},reply:()=>Response.json(body)});
});
test('autosave checkpoints recognize text and gallery/music changes even when the block layout is identical',async()=>{
 await isolated(async()=>{versions.saveBuilderVersion(draft(),'QA initial','save');versions.saveBuilderVersion(draft('QA changed text'),'QA later','save');const next=draft('QA changed text');next.config.musicUrl='/musica/musica2.mp3';versions.saveBuilderVersion(next,'QA later music','save');assert.equal(versions.listBuilderVersions(id).length,3);});
});
test('actor library keys isolate both partners and preserve original team keys byte for byte',async()=>{
 assert.equal(builderLibraryKey('enkarta_user_elements'),'enkarta_user_elements');assert.notEqual(builderLibraryKey('enkarta_user_elements',scopeA),builderLibraryKey('enkarta_user_elements',scopeB));assert.throws(()=>builderLibraryKey('x','partner:bad'));
 await isolated(async r=>{
  const original=r.values.get('enkarta_user_elements');assert.deepEqual(elements.listUserElements(scopeA),[]);elements.addUserElement('/qa-partner-a.svg',scopeA);assert.deepEqual(elements.listUserElements(scopeB),[]);elements.addUserElement('/qa-partner-b.svg',scopeB);assert.equal(elements.listUserElements(scopeA)[0].url,'/qa-partner-a.svg');assert.equal(r.values.get('enkarta_user_elements'),original);
 },{seed:{enkarta_user_elements:[{url:'/team-original.json',createdAt:1}]}});
});
test('packs and style kits remain reusable within the same actor and invisible to other actors',async()=>{
 await isolated(async()=>{
  packs.saveUserPack('QA pack',draft().config.layout.blocks,scopeA);kits.saveUserDesignKit('QA kit',draft(),scopeA);
  assert.equal(packs.listUserPacks(scopeA).length,1);assert.equal(kits.listUserDesignKits(scopeA).length,1);assert.deepEqual(packs.listUserPacks(scopeB),[]);assert.deepEqual(kits.listUserDesignKits(scopeB),[]);assert.deepEqual(packs.listUserPacks(),[]);
  assert.equal(packs.listUserPacks(scopeA)[0].blocks[0].props.asset,'/original.json');
 });
});
test('multiple same-tick local packs and kits get distinct IDs',async()=>{
 await isolated(async()=>{packs.saveUserPack('QA1',[],scopeA);packs.saveUserPack('QA2',[],scopeA);assert.equal(new Set(packs.listUserPacks(scopeA).map(p=>p.id)).size,2);kits.saveUserDesignKit('QA1',draft(),scopeA);kits.saveUserDesignKit('QA2',draft(),scopeA);assert.equal(new Set(kits.listUserDesignKits(scopeA).map(p=>p.id)).size,2);});
});
test('sections wait for confirmation and a refused delete retains the reusable original',async()=>{
 const wait=deferred();let rejectDelete=false;await isolated(async()=>{
  const pending=sections.persistUserSection('QA section',draft().config.layout.blocks,scopeA);assert.deepEqual(sections.listUserSections(scopeA),[]);wait.resolve(Response.json({success:true}));await pending;assert.equal(sections.listUserSections(scopeA).length,1);rejectDelete=true;await assert.rejects(sections.persistDeleteUserSection(sections.listUserSections(scopeA)[0].id,scopeA));assert.equal(sections.listUserSections(scopeA).length,1);assert.deepEqual(sections.listUserSections(scopeB),[]);
 },{reply:()=>rejectDelete?Response.json({error:'QA refused'},{status:403}):wait.promise});
});
test('an earlier section read cannot resurrect a section removed while awaiting the server',async()=>{
 const wait=deferred(),row={id:'section-qa',name:'QA section',createdAt:1,blocks:[]};await isolated(async r=>{
  const pending=sections.hydrateUserSections(scopeA);sections.deleteUserSection(row.id,scopeA);const bytes=r.values.get(builderLibraryKey('enkarta_user_sections_v1',scopeA));wait.resolve(Response.json([row]));const result=await pending;assert.deepEqual(result.sections,[]);assert.equal(r.values.get(builderLibraryKey('enkarta_user_sections_v1',scopeA)),bytes);assert.equal(r.requests.filter(q=>q.method==='POST').length,0);
 },{seed:{[builderLibraryKey('enkarta_user_sections_v1',scopeA)]:[row]},reply:q=>q.method==='GET'?wait.promise:Response.json({success:true})});
});
test('concurrent template saves are serialized and preserve both original snapshots',async()=>{
 let cloud=[],first=deferred(),puts=0;await isolated(async r=>{
  const original=draft().config;const a=templates.saveUserTemplate('QA A',{layout:original.layout},scopeA);const b=templates.saveUserTemplate('QA B',{layout:original.layout},scopeA);
  for(let i=0;i<4;i++)await new Promise(done=>setImmediate(done));assert.equal(puts,1);first.resolve(Response.json({success:true}));await Promise.all([a,b]);assert.equal(cloud.length,2);assert.equal(new Set(cloud.map(p=>p.id)).size,2);assert(cloud.every(p=>p.layout.blocks[0].props.asset==='/original.json'));assert.equal(r.requests.filter(q=>q.method==='PUT').length,2);
 },{reply:q=>{if(q.method==='GET')return Response.json(cloud);cloud=clone(q.body);return ++puts===1?first.promise:Response.json({success:true});}});
});
