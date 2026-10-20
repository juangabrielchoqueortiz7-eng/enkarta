// Unsent commercial drafts use fictional records and memory storage only.
const fs=require('node:fs'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},fileName:file}).outputText,file);
const {COMMERCIAL_DRAFT_TTL:TTL,createCommercialDraftEntry:create,parseCommercialDraftEntry:parse,readCommercialDrafts:read,putCommercialDraft:put,clearCommercialDraft:clear}=require('../src/lib/commercial-drafts.ts');
const {commercialDraftDirty}=require('../src/lib/commercial-update.ts');
const now=Date.now(),scope='a'.repeat(64),otherScope='b'.repeat(64),key=`enkarta.commercial-drafts.v1:${scope}`;
const uuid=n=>`abcdef01-0000-4000-8000-${String(n).padStart(12,'0')}`,ref=n=>`EK-${n.toString(16).toUpperCase().padStart(8,'0')}`;
const lead=(n=1,patch={})=>({id:uuid(n),reference:ref(n),status:'contacted',package_key:'premium',design:'Lunaria',event_category:'Boda',placement:'qa',utm_source:'',utm_medium:'',utm_campaign:'',referrer_host:'',revenue_bs:200,notes:'QA nota base',revision:4,created_at:'2001-01-01T12:00:00Z',updated_at:'2026-10-19T12:00:00Z',...patch});
const draft=(patch={})=>({status:'reserved',revenue:'930,50',notes:'QA nota editada',...patch});
const entry=(n=1,patch={})=>({...create(lead(n),draft(),now),...patch});
const envelope=entries=>({version:1,scope,entries});
function storage(seed=null){const values=new Map(seed===null?[]:[[key,seed]]),calls=[];return{values,calls,getItem(name){calls.push(['get',name]);return values.get(name)??null;},setItem(name,value){calls.push(['set',name]);values.set(name,value);},removeItem(name){calls.push(['remove',name]);values.delete(name);}};}
const writes=store=>store.calls.filter(([type])=>type!=='get');

test('draft creation keeps only identity, operational baseline and exact editable values',()=>{
 const source=lead(1,{session_hash:'QA_PRIVATE_SESSION',password:'QA_PRIVATE_PASSWORD',clientName:'QA_PRIVATE_NAME'}),raw=draft({revenue:'12,',notes:'  QA nota editada  '});
 const result=create(source,raw,now);
 assert.deepEqual(result,{id:source.id,reference:source.reference,savedAt:now,base:{revision:4,status:'contacted',revenueBs:200,notes:'QA nota base'},draft:raw});
 assert.doesNotMatch(JSON.stringify(result),/QA_PRIVATE|package_key|created_at|utm_source|requestId|history|design/);assert.equal(raw.notes,'  QA nota editada  ');
});

test('semantic clean drafts are not stored for formatting-only changes',()=>{
 for(const revenue of ['200','200.00','200,00','000200,00']){
  const raw=draft({status:'contacted',revenue,notes:'  QA nota base  '});assert.equal(commercialDraftDirty(raw,lead()),false);assert.equal(create(lead(),raw,now),null);
 }
 assert.equal(create(lead(1,{revenue_bs:null}),draft({status:'contacted',revenue:'',notes:'QA nota base'}),now),null);
 assert.ok(create(lead(1,{revenue_bs:0}),draft({status:'contacted',revenue:'',notes:'QA nota base'}),now));
});

test('incomplete and invalid revenue strings survive exactly for later correction',()=>{
 for(const revenue of ['12,','930.','1e3','-1','bad',' ','0000000000000000']){
  const raw=draft({revenue}),result=create(lead(),raw,now);assert.ok(result);assert.equal(result.draft.revenue,revenue);assert.equal(commercialDraftDirty(raw,lead()),true);
 }
});

test('baseline numbers and revision limits remain canonical without coercion or rounding',()=>{
 const original=entry();
 for(const revenueBs of [null,0,0.01,930.5,1000000])assert.equal(parse({...original,base:{...original.base,revenueBs}},now).base.revenueBs,revenueBs);
 assert.equal(parse({...original,base:{...original.base,revision:2147483647}},now).base.revision,2147483647);
 for(const patch of [{revenueBs:'200'},{revenueBs:true},{revenueBs:-0},{revenueBs:-1},{revenueBs:0.105},{revenueBs:1000000.01},{revenueBs:Infinity},{revision:'4'},{revision:-1},{revision:1.5},{revision:2147483648},{status:'paid'}])assert.equal(parse({...original,base:{...original.base,...patch}},now),null);
});

test('parsing rejects malformed identity, fields, controls, oversized text and private snapshots',()=>{
 const original=entry(),raws=[null,[],{}, {...original,id:uuid(1).toUpperCase()},{...original,id:'bad'},{...original,reference:'ENK-Q6MRGK'},{...original,reference:`${ref(1)}\n`},{...original,reference:'ek-00000001'},{...original,requestId:uuid(2)},{...original,base:{...original.base,password:'QA_PRIVATE'}},{...original,draft:{...original.draft,accessToken:'QA_PRIVATE'}}];
 for(const patch of [{revenue:123},{revenue:'x'.repeat(17)},{revenue:'12\n'},{revenue:'12\0'},{revenue:'12\t'},{notes:'x'.repeat(1001)},{notes:'bad\0note'},{status:'paid'}])raws.push({...original,draft:{...original.draft,...patch}});
 raws.push({...original,base:{...original.base,notes:'bad\0note'}},{...original,base:{...original.base,notes:'x'.repeat(1001)}});
 for(const raw of raws)assert.equal(parse(raw,now),null);
});

test('note whitespace and line breaks remain exact rather than being normalized at recovery time',()=>{
 const original=entry(),value={...original,base:{...original.base,notes:'  QA baseline\n '},draft:{...original.draft,notes:'  QA edit\n '}};
 assert.deepEqual(parse(value,now),value);assert.equal(parse(value,now).draft.notes,value.draft.notes);
});

test('empty journals are ready without manufacturing saved drafts or writing storage',()=>{
 const store=storage();assert.deepEqual(read(store,scope,now),{kind:'ready',entries:[],expired:[]});assert.deepEqual(writes(store),[]);
});

test('read partitions the exact 24-hour boundary and preserves expired records without cleanup',()=>{
 const current=entry(1,{savedAt:now-TTL}),expired=entry(2,{savedAt:now-TTL-1}),raw=JSON.stringify(envelope([expired,current])),store=storage(raw);
 assert.deepEqual(read(store,scope,now),{kind:'ready',entries:[current],expired:[expired]});assert.equal(store.values.get(key),raw);assert.deepEqual(writes(store),[]);
 assert.deepEqual(parse(expired,now),expired);
});

test('foreign sessions, unsupported envelopes and corrupt journals cannot be overwritten or cleared',()=>{
 const malformed=['','{broken','x'.repeat(240001),JSON.stringify([]),JSON.stringify({...envelope([]),scope:otherScope}),JSON.stringify({...envelope([]),version:2}),JSON.stringify({version:1,scope}),JSON.stringify({...envelope([]),entries:{}}),JSON.stringify({...envelope([]),notes:'QA_PRIVATE'})];
 for(const raw of malformed){const store=storage(raw);assert.equal(read(store,scope,now).kind,'invalid');assert.equal(put(store,scope,entry()),false);assert.equal(clear(store,scope,entry()),false);assert.equal(store.values.get(key),raw);assert.deepEqual(writes(store),[]);}
});

test('invalid bindings and clocks are rejected before storage is read',()=>{
 const store=storage();
 for(const binding of ['',null,'A'.repeat(64),'a'.repeat(63),`${scope}\n`,'../x']){
  assert.equal(read(store,binding,now).kind,'invalid');assert.equal(put(store,binding,entry()),false);assert.equal(clear(store,binding,entry()),false);
 }
 for(const clock of [null,-1,NaN,Infinity,1.5,'1',Number.MAX_SAFE_INTEGER+1]){assert.equal(parse(entry(),clock),null);assert.equal(create(lead(),draft(),clock),null);assert.equal(read(store,scope,clock).kind,'invalid');}
 assert.deepEqual(store.calls,[]);
});

test('future timestamps accept only the stated one-minute clock tolerance',()=>{
 assert.ok(parse(entry(1,{savedAt:now+60000}),now));assert.equal(parse(entry(1,{savedAt:now+60001}),now),null);assert.equal(parse(entry(1,{savedAt:'1'}),now),null);assert.equal(parse(entry(1,{savedAt:-1}),now),null);
});

test('duplicate IDs, references or one invalid entry reject the whole journal',()=>{
 for(const entries of [[entry(),entry(1,{reference:ref(2)})],[entry(),entry(2,{reference:ref(1)})],[entry(),{...entry(2),draft:{...draft(),notes:null}}]]){
  const raw=JSON.stringify(envelope(entries)),store=storage(raw);assert.equal(read(store,scope,now).kind,'invalid');assert.equal(store.values.get(key),raw);assert.deepEqual(writes(store),[]);
 }
});

test('creating a new draft requires absence while replacing it requires its exact prior contents',()=>{
 const store=storage(),first=entry(),second=entry(1,{savedAt:now+1,draft:draft({notes:'QA siguiente edición'})});
 assert.equal(put(store,scope,first),true);const raw=store.values.get(key);
 assert.equal(put(store,scope,second),false);assert.equal(store.values.get(key),raw);
 assert.equal(put(store,scope,second,{...first,savedAt:now-1}),false);assert.equal(store.values.get(key),raw);
 assert.equal(put(store,scope,second,first),true);assert.deepEqual(read(store,scope,now+2).entries,[second]);
 assert.equal(put(storage(),scope,second,first),false);
});

test('putting identical contents is an idempotent no-op even when further writes are denied',()=>{
 const store=storage(),value=entry();assert.equal(put(store,scope,value),true);const raw=store.values.get(key),before=writes(store).length;
 store.setItem=()=>{throw Error('QA quota');};assert.equal(put(store,scope,{...value,base:{...value.base},draft:{...value.draft}}),true);assert.equal(store.values.get(key),raw);assert.equal(writes(store).length,before);
});

test('an acknowledgement for an older draft cannot remove or replace a newer local edit',()=>{
 const store=storage(),old=entry(),next=entry(1,{savedAt:now+1,draft:draft({revenue:'12,'})});put(store,scope,old);put(store,scope,next,old);const raw=store.values.get(key);
 assert.equal(clear(store,scope,old),false);assert.equal(put(store,scope,entry(1,{savedAt:now+2}),old),false);assert.equal(store.values.get(key),raw);
 assert.equal(clear(store,scope,next),true);assert.equal(store.values.has(key),false);assert.equal(clear(store,scope,next),true);
});

test('expired drafts remain available for exact discard while unrelated current drafts stay intact',()=>{
 const old=entry(1,{savedAt:now-TTL-1000}),current=entry(2),store=storage(JSON.stringify(envelope([old,current])));
 assert.equal(clear(store,scope,{...old,savedAt:old.savedAt+1}),false);assert.equal(read(store,scope,now).expired.length,1);
 assert.equal(clear(store,scope,old),true);assert.deepEqual(read(store,scope,now),{kind:'ready',entries:[current],expired:[]});
 assert.equal(clear(store,scope,entry(3)),true);assert.deepEqual(read(store,scope,now).entries,[current]);
});

test('expired entries count toward the fifty-record limit and are never evicted by a new draft',()=>{
 const entries=Array.from({length:50},(_,index)=>entry(index+1,{savedAt:index<25?now-TTL-1000:now})),raw=JSON.stringify(envelope(entries)),store=storage(raw);
 const loaded=read(store,scope,now);assert.equal(loaded.entries.length,25);assert.equal(loaded.expired.length,25);
 assert.equal(put(store,scope,entry(51)),false);assert.equal(store.values.get(key),raw);assert.deepEqual(writes(store),[]);
 const oversized=storage(JSON.stringify(envelope([...entries,entry(51)])));assert.equal(read(oversized,scope,now).kind,'invalid');
});

test('the serialized character limit fails without trimming notes or evicting existing drafts',()=>{
 const store=storage();let accepted=0,previous=null;
 for(let index=1;index<=50;index++){
  const value=entry(index,{base:{revision:4,status:'contacted',revenueBs:200,notes:'\u0001'.repeat(1000)},draft:draft({notes:'\u0002'.repeat(1000)})});
  if(!put(store,scope,value)){assert.equal(store.values.get(key),previous);break;}
  accepted++;previous=store.values.get(key);assert.ok(previous.length<=240000);
 }
 assert.ok(accepted>0&&accepted<50);assert.equal(read(store,scope,now).entries.length,accepted);
});

test('storage failures preserve exact bytes and never claim saving or clearing succeeded',()=>{
 const missing=storage();missing.getItem=()=>{throw Error('QA read denied');};assert.equal(read(missing,scope,now).kind,'unavailable');assert.equal(put(missing,scope,entry()),false);assert.equal(clear(missing,scope,entry()),false);
 const store=storage(),value=entry();put(store,scope,value);const raw=store.values.get(key);store.setItem=()=>{throw Error('QA write denied');};assert.equal(put(store,scope,entry(2)),false);assert.equal(store.values.get(key),raw);
 store.removeItem=()=>{throw Error('QA remove denied');};assert.equal(clear(store,scope,value),false);assert.equal(store.values.get(key),raw);
 const multi=storage(JSON.stringify(envelope([entry(),entry(2)]))),multiRaw=multi.values.get(key);multi.setItem=()=>{throw Error('QA rewrite denied');};assert.equal(clear(multi,scope,entry()),false);assert.equal(multi.values.get(key),multiRaw);
});

test('crossed references, malformed expectations and private fields cannot replace a draft',()=>{
 const store=storage(),value=entry();put(store,scope,value);const raw=store.values.get(key);
 for(const expected of [{...value,base:{...value.base,revision:3}},{...value,reference:ref(2)},entry(2),{...value,requestId:uuid(10)}])assert.equal(put(store,scope,entry(1,{savedAt:now+1}),expected),false);
 assert.equal(put(store,scope,entry(2,{reference:ref(1)})),false);assert.equal(clear(store,scope,{...value,reference:ref(2)}),false);
 assert.equal(put(store,scope,{...value,token:'QA_PRIVATE'}),false);assert.equal(store.values.get(key),raw);
});

test('returned objects and frozen inputs cannot mutate the stored journal',()=>{
 const base=Object.freeze(lead()),raw=Object.freeze(draft()),value=create(base,raw,now),store=storage();Object.freeze(value.base);Object.freeze(value.draft);Object.freeze(value);
 assert.equal(put(store,scope,value),true);const saved=store.values.get(key),restored=read(store,scope,now);restored.entries[0].base.notes='QA changed copy';restored.entries[0].draft.revenue='0';
 assert.equal(store.values.get(key),saved);assert.deepEqual(read(store,scope,now).entries,[entry()]);assert.equal(base.notes,'QA nota base');assert.equal(raw.revenue,'930,50');
});
