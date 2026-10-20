// Pending commercial intents use only fictional payloads and memory storage.
const fs=require('node:fs'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},fileName:file}).outputText,file);
const {readCommercialPending:read,putCommercialPending:put,clearCommercialPending:clear}=require('../src/lib/commercial-pending.ts');
const scope='a'.repeat(64),otherScope='b'.repeat(64),now=Date.now(),key=`enkarta.commercial-pending.v1:${scope}`;
const uuid=n=>`abcdef01-0000-4000-8000-${String(n).padStart(12,'0')}`;
const reference=n=>`EK-${n.toString(16).toUpperCase().padStart(8,'0')}`;
const command=(n=1,patch={})=>({id:uuid(n),requestId:uuid(1000+n),expectedRevision:4,status:'reserved',revenueBs:930.5,notes:'QA resumen ficticio',...patch});
const entry=(n=1,patch={})=>({reference:reference(n),savedAt:now,request:command(n),...patch});
const envelope=entries=>({version:1,scope,entries});
function storage(seed=null){const values=new Map(seed===null?[]:[[key,seed]]),calls=[];return{values,calls,getItem(name){calls.push(['get',name]);return values.get(name)??null;},setItem(name,value){calls.push(['set',name]);values.set(name,value);},removeItem(name){calls.push(['remove',name]);values.delete(name);}};}
const writes=store=>store.calls.filter(([type])=>type!=='get');

test('missing storage is an empty ready journal without any mutation',()=>{
 const store=storage();assert.deepEqual(read(store,scope,now),{kind:'ready',entries:[]});assert.deepEqual(writes(store),[]);
});

test('a canonical intention is journaled under the session namespace without a contact snapshot',()=>{
 const store=storage(),update=Object.freeze(command()),result=put(store,scope,reference(1),update,now);
 assert.deepEqual(result,{ok:true,entry:entry()});assert.deepEqual([...store.values.keys()],[key]);
 assert.deepEqual(JSON.parse(store.values.get(key)),envelope([entry()]));assert.deepEqual(update,command());
 assert.doesNotMatch(store.values.get(key),/history|session_hash|password|accessToken|created_at|utm_source|paymentInstructions/);
});

test('several distinct contact intentions roundtrip in order with exact null and zero revenues',()=>{
 const store=storage(),first=put(store,scope,reference(1),command(1,{revenueBs:null}),now),second=put(store,scope,reference(2),command(2,{revenueBs:0}),now+1);
 assert.equal(first.ok,true);assert.equal(second.ok,true);assert.deepEqual(read(store,scope,now+2),{kind:'ready',entries:[first.entry,second.entry]});
 assert.equal(first.entry.request.revenueBs,null);assert.equal(second.entry.request.revenueBs,0);
});

test('rechecking the same request preserves its original timestamp and does not require another write',()=>{
 const store=storage(),first=put(store,scope,reference(1),command(),now),raw=store.values.get(key),before=writes(store).length;
 store.setItem=()=>{throw Error('QA quota');};
 const repeated=put(store,scope,reference(1),{...command()},now+2*86400000);
 assert.deepEqual(repeated,first);assert.equal(repeated.entry.savedAt,now);assert.equal(store.values.get(key),raw);assert.equal(writes(store).length,before);
});

test('a contact pending operation cannot be replaced by another UUID, reference or payload',()=>{
 const store=storage();put(store,scope,reference(1),command(),now);const raw=store.values.get(key),before=writes(store).length;
 for(const patch of [{requestId:uuid(5000)},{expectedRevision:5},{status:'won'},{revenueBs:null},{notes:'QA otra intención'}])assert.deepEqual(put(store,scope,reference(1),command(1,patch),now),{ok:false});
 assert.deepEqual(put(store,scope,reference(2),command(),now),{ok:false});assert.equal(store.values.get(key),raw);assert.equal(writes(store).length,before);
});

test('references and request UUIDs cannot identify two different pending contacts',()=>{
 const store=storage();put(store,scope,reference(1),command(),now);const raw=store.values.get(key);
 assert.deepEqual(put(store,scope,reference(1),command(2),now),{ok:false});
 assert.deepEqual(put(store,scope,reference(2),command(2,{requestId:command().requestId}),now),{ok:false});assert.equal(store.values.get(key),raw);
});

test('invalid scopes and clocks are rejected before reading or modifying storage',()=>{
 const store=storage(),expected=entry();
 for(const invalid of ['',null,undefined,'A'.repeat(64),'a'.repeat(63),`${scope}\n`,'../secret']){
  assert.equal(read(store,invalid,now).kind,'invalid');assert.deepEqual(put(store,invalid,reference(1),command(),now),{ok:false});assert.equal(clear(store,invalid,expected),false);
 }
 for(const invalid of [NaN,Infinity,-1,1.5,'1',null,Number.MAX_SAFE_INTEGER+1]){
  assert.equal(read(store,scope,invalid).kind,'invalid');assert.deepEqual(put(store,scope,reference(1),command(),invalid),{ok:false});
 }
 assert.deepEqual(store.calls,[]);
});

test('malformed or foreign envelopes remain intact and cannot be overwritten or cleared',()=>{
 const invalids=['','{broken','x'.repeat(160001),JSON.stringify([]),JSON.stringify({...envelope([]),version:2}),JSON.stringify({...envelope([]),scope:otherScope}),JSON.stringify({version:1,scope}),JSON.stringify({...envelope([]),entries:{}}),JSON.stringify({...envelope([]),password:'QA_PRIVATE'})];
 for(const raw of invalids){
  const store=storage(raw);assert.equal(read(store,scope,now).kind,'invalid');assert.deepEqual(put(store,scope,reference(1),command(),now),{ok:false});assert.equal(clear(store,scope,entry()),false);
  assert.equal(store.values.get(key),raw);assert.deepEqual(writes(store),[]);
 }
});

test('stored requests must already be canonical rather than being normalized during recovery',()=>{
 const changes=[{id:command().id.toUpperCase()},{requestId:command().requestId.toUpperCase()},{revenueBs:'930.50'},{revenueBs:''},{notes:' QA resumen ficticio '},{expectedRevision:'4'},{password:'QA_PRIVATE'},{revenueBs:true},{status:'paid'},{notes:'bad\0note'}];
 for(const patch of changes){
  const raw=JSON.stringify(envelope([entry(1,{request:command(1,patch)})])),store=storage(raw);
  assert.equal(read(store,scope,now).kind,'invalid');assert.deepEqual(put(store,scope,reference(2),command(2),now),{ok:false});assert.equal(store.values.get(key),raw);assert.deepEqual(writes(store),[]);
 }
});

test('malformed entry identities, timestamps and unknown snapshot fields invalidate the complete journal',()=>{
 for(const patch of [{reference:'ENK-Q6MRGK'},{reference:'ek-00000001'},{reference:`${reference(1)}\n`},{reference:[]},{savedAt:-1},{savedAt:now+60001},{savedAt:'1'},{savedAt:null},{savedAt:1.5},{request:null},{notes:'QA_PRIVATE_SNAPSHOT'}]){
  const raw=JSON.stringify(envelope([entry(2),entry(1,patch)])),store=storage(raw);assert.equal(read(store,scope,now).kind,'invalid');assert.equal(store.values.get(key),raw);assert.deepEqual(writes(store),[]);
 }
});

test('duplicate contact, request or reference identities are never partially recovered',()=>{
 const duplicateSets=[[entry(),entry(1,{reference:reference(2),request:command(1,{requestId:uuid(8000)})})],[entry(),entry(2,{request:command(2,{requestId:command().requestId})})],[entry(),entry(2,{reference:reference(1)})]];
 for(const entries of duplicateSets){const raw=JSON.stringify(envelope(entries)),store=storage(raw);assert.equal(read(store,scope,now).kind,'invalid');assert.equal(store.values.get(key),raw);assert.deepEqual(writes(store),[]);}
});

test('old intentions remain present after 24 hours and are never evicted by adding a newer contact',()=>{
 const store=storage(),old=put(store,scope,reference(1),command(),now-60*86400000);
 assert.equal(old.ok,true);assert.equal(read(store,scope,now).entries[0].savedAt,old.entry.savedAt);
 assert.equal(put(store,scope,reference(2),command(2),now).ok,true);assert.equal(read(store,scope,now).entries.length,2);assert.equal(read(store,scope,now).entries[0].savedAt,old.entry.savedAt);
});

test('timestamp tolerance permits exactly one minute of skew without accepting future timestamps beyond it',()=>{
 const accepted=storage(JSON.stringify(envelope([entry(1,{savedAt:now+60000})]))),rejected=storage(JSON.stringify(envelope([entry(1,{savedAt:now+60001})])));
 assert.equal(read(accepted,scope,now).kind,'ready');assert.equal(read(rejected,scope,now).kind,'invalid');
});

test('fifty contacts are retained and a fifty-first cannot truncate or evict the journal',()=>{
 const store=storage();for(let index=1;index<=50;index++)assert.equal(put(store,scope,reference(index),command(index),now).ok,true);
 const raw=store.values.get(key),before=writes(store).length;assert.equal(read(store,scope,now).entries.length,50);
 assert.deepEqual(put(store,scope,reference(51),command(51),now),{ok:false});assert.equal(store.values.get(key),raw);assert.equal(writes(store).length,before);
 const oversized=storage(JSON.stringify(envelope(Array.from({length:51},(_,index)=>entry(index+1)))));assert.equal(read(oversized,scope,now).kind,'invalid');
});

test('the serialized character limit rejects an oversized addition without dropping existing intentions',()=>{
 const store=storage();let accepted=0,previous=null;
 for(let index=1;index<=50;index++){
  const result=put(store,scope,reference(index),command(index,{notes:'\u0001'.repeat(1000)}),now);
  if(!result.ok){assert.equal(store.values.get(key),previous);break;}
  accepted++;previous=store.values.get(key);assert.ok(previous.length<=160000);
 }
 assert.ok(accepted>0&&accepted<50);assert.equal(read(store,scope,now).entries.length,accepted);
});

test('storage read and write failures do not claim durable recovery or replace existing bytes',()=>{
 const unavailable=storage();unavailable.getItem=()=>{throw Error('QA denied');};assert.equal(read(unavailable,scope,now).kind,'unavailable');assert.deepEqual(put(unavailable,scope,reference(1),command(),now),{ok:false});assert.equal(clear(unavailable,scope,entry()),false);assert.deepEqual(writes(unavailable),[]);
 const store=storage();put(store,scope,reference(1),command(),now);const raw=store.values.get(key);store.setItem=()=>{throw Error('QA quota');};
 assert.deepEqual(put(store,scope,reference(2),command(2),now),{ok:false});assert.equal(store.values.get(key),raw);
});

test('exact acknowledgement removes only its entry and clearing again is idempotent',()=>{
 const store=storage(),first=put(store,scope,reference(1),command(),now).entry,second=put(store,scope,reference(2),command(2),now).entry;
 assert.equal(clear(store,scope,first),true);assert.deepEqual(read(store,scope,now),{kind:'ready',entries:[second]});
 const before=writes(store).length;assert.equal(clear(store,scope,first),true);assert.equal(writes(store).length,before);
 assert.equal(clear(store,scope,second),true);assert.equal(store.values.has(key),false);assert.deepEqual(read(store,scope,now),{kind:'ready',entries:[]});
});

test('a timestamp, reference or payload mismatch cannot acknowledge another intention',()=>{
 const store=storage(),original=put(store,scope,reference(1),command(),now).entry,raw=store.values.get(key),before=writes(store).length;
 for(const expected of [{...original,savedAt:now-1},{...original,reference:reference(2)},{...original,request:command(1,{notes:'QA distinta'})},{...original,request:command(1,{requestId:uuid(9000)})}])assert.equal(clear(store,scope,expected),false);
 assert.equal(store.values.get(key),raw);assert.equal(writes(store).length,before);
});

test('a late acknowledgement cannot delete a new intention for the same contact',()=>{
 const store=storage(),old=put(store,scope,reference(1),command(),now).entry;assert.equal(clear(store,scope,old),true);
 const next=put(store,scope,reference(1),command(1,{requestId:uuid(9000),expectedRevision:5,notes:'QA próxima intención'}),now+1).entry,raw=store.values.get(key);
 assert.equal(clear(store,scope,old),false);assert.equal(store.values.get(key),raw);assert.deepEqual(read(store,scope,now+2).entries,[next]);
});

test('clearing fails safely if removal or rewriting the remaining entries is denied',()=>{
 const one=storage(),first=put(one,scope,reference(1),command(),now).entry,oneRaw=one.values.get(key);one.removeItem=()=>{throw Error('QA remove denied');};assert.equal(clear(one,scope,first),false);assert.equal(one.values.get(key),oneRaw);
 const two=storage(),target=put(two,scope,reference(1),command(),now).entry;put(two,scope,reference(2),command(2),now);const twoRaw=two.values.get(key);two.setItem=()=>{throw Error('QA rewrite denied');};assert.equal(clear(two,scope,target),false);assert.equal(two.values.get(key),twoRaw);
});

test('malformed or noncanonical put and clear arguments cannot write or remove a journal',()=>{
 const store=storage();put(store,scope,reference(1),command(),now);const raw=store.values.get(key),before=writes(store).length;
 for(const update of [null,{},[],command(2,{revenueBs:'930.50'}),command(2,{notes:' QA '}),command(2,{id:uuid(2).toUpperCase()}),command(2,{apiKey:'QA_PRIVATE'})])assert.deepEqual(put(store,scope,reference(2),update,now),{ok:false});
 for(const ref of [null,'',`${reference(2)}\n`,'ENK-Q6MRGK'])assert.deepEqual(put(store,scope,ref,command(2),now),{ok:false});
 for(const expected of [null,{},[],entry(1,{password:'QA_PRIVATE'}),entry(1,{request:command(1,{revenueBs:'930.50'})})])assert.equal(clear(store,scope,expected),false);
 assert.equal(store.values.get(key),raw);assert.equal(writes(store).length,before);
});

test('returned records are copies and cannot mutate subsequent journal recovery',()=>{
 const store=storage(),source=command(),result=put(store,scope,reference(1),source,now),raw=store.values.get(key);
 result.entry.request.notes='QA mutated returned copy';source.notes='QA mutated input';const readResult=read(store,scope,now);readResult.entries[0].reference=reference(2);readResult.entries[0].request.revenueBs=1;
 assert.equal(store.values.get(key),raw);assert.deepEqual(read(store,scope,now).entries,[entry()]);
});
