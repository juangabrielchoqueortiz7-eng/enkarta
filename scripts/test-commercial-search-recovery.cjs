// Identity-only sales search recovery: fictional contacts, memory storage and hook effects. No network.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react');
const {COMMERCIAL_SEARCH_TTL:TTL,createCommercialSearchEntry:create,readCommercialSearch:read,putCommercialSearch:put,clearCommercialSearch:clear}=require('../src/lib/commercial-search-recovery.ts');
const {useCommercialSearchRecovery:useRecovery}=require('../src/components/admin/useCommercialSearchRecovery.ts');
const scope='a'.repeat(64),otherScope='b'.repeat(64),key=`enkarta.commercial-search.v1:${scope}`;
const uuid=n=>`abcdef01-0000-4000-8000-${String(n).padStart(12,'0')}`,ref=n=>`EK-${n.toString(16).toUpperCase().padStart(8,'0')}`;
const lead=(n=1,patch={})=>({id:uuid(n),reference:ref(n),status:'contacted',package_key:'premium',design:'Lunaria',event_category:'Boda',placement:'QA',utm_source:'QA_PRIVATE_SOURCE',utm_medium:'',utm_campaign:'',referrer_host:'',revenue_bs:930.5,notes:'QA_PRIVATE_NOTE',revision:4,created_at:'2001-01-01T12:00:00Z',updated_at:'2026-10-19T12:00:00Z',...patch});
const entry=(n=1,savedAt=Date.now())=>({id:uuid(n),reference:ref(n),savedAt});
const envelope=(value,binding=scope)=>({version:1,scope:binding,entry:value});
const memory=()=>{const values=new Map(),reads=[],writes=[],removals=[];return{values,reads,writes,removals,getItem:key=>{reads.push(key);return values.get(key)??null;},setItem:(key,value)=>{writes.push(key);values.set(key,value);},removeItem:key=>{removals.push(key);values.delete(key);}};};
const seed=(storage,value=entry(),binding=scope)=>{storage.values.set(`enkarta.commercial-search.v1:${binding}`,JSON.stringify(envelope(value,binding)));return value;};
const noMutations=storage=>{assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);};

test('a checked historical lead creates only its identity and original save time',()=>{
 const now=Date.now(),source=Object.freeze(lead(1,{session_hash:'QA_PRIVATE_SESSION',password:'QA_PRIVATE_PASSWORD',clientName:'QA_PRIVATE_NAME',history:[{note:'QA_PRIVATE_HISTORY'}]})),value=create(source,now);
 assert.deepEqual(value,entry(1,now));assert.deepEqual(Object.keys(value),['id','reference','savedAt']);
 assert.doesNotMatch(JSON.stringify(value),/QA_PRIVATE|status|revenue|notes|revision|history|package|design|created_at/);assert.equal(source.created_at,'2001-01-01T12:00:00Z');
});

test('creation rejects incomplete leads, noncanonical identities, invalid clocks and throwing data',()=>{
 const now=Date.now();for(const value of [null,[],{},entry(),lead(1,{id:uuid(1).toUpperCase()}),lead(1,{id:uuid(1)+'\n'}),lead(1,{reference:'ek-00000001'}),lead(1,{reference:ref(1)+'\n'}),lead(1,{reference:'ENK-Q6MRGK'}),lead(1,{revision:undefined}),lead(1,{notes:null})])assert.equal(create(value,now),null);
 for(const clock of [-0,-1,null,NaN,Infinity,1.5,'1',Number.MAX_SAFE_INTEGER+1])assert.equal(create(lead(),clock),null);
 assert.equal(create(Object.defineProperty({},'reference',{get(){throw Error('QA getter');}}),now),null);
});

test('empty reads do not manufacture identities, write or delete anything',()=>{
 const storage=memory();assert.deepEqual(read(storage,scope),{kind:'empty'});assert.deepEqual(storage.reads,[key]);noMutations(storage);
});

test('roundtrip stores an exact small whitelist envelope without a full contact cache',()=>{
 const storage=memory(),value=create(lead());assert.equal(put(storage,scope,value,null),true);
 assert.deepEqual(JSON.parse(storage.values.get(key)),envelope(value));assert.deepEqual(read(storage,scope),{kind:'ready',entry:value});
 assert.doesNotMatch(storage.values.get(key),/QA_PRIVATE|notes|status|revenue|history|revision|package|design/);
});

test('TTL keeps the exact 24-hour boundary active and reports older identities without cleanup',()=>{
 const now=Date.now(),current=entry(1,now-TTL),old=entry(1,now-TTL-1),storage=memory();seed(storage,current);
 assert.deepEqual(read(storage,scope,now),{kind:'ready',entry:current});seed(storage,old);const raw=storage.values.get(key);
 assert.deepEqual(read(storage,scope,now),{kind:'expired',entry:old});assert.equal(storage.values.get(key),raw);noMutations(storage);
});

test('read accepts at most one minute of future clock tolerance and never coerces timestamps',()=>{
 const now=Date.now(),storage=memory();seed(storage,entry(1,now+60000));assert.equal(read(storage,scope,now).kind,'ready');
 for(const savedAt of [now+60001,-1,null,'1',1.5,Number.MAX_SAFE_INTEGER+1]){seed(storage,entry(1,savedAt));assert.equal(read(storage,scope,now).kind,'invalid');}
 noMutations(storage);
});

test('invalid scopes and clocks fail before touching storage',()=>{
 const storage=memory(),value=entry();
 for(const binding of [null,'','A'.repeat(64),'a'.repeat(63),scope+'\n','../commercial']){assert.equal(read(storage,binding).kind,'invalid');assert.equal(put(storage,binding,value,null),false);assert.equal(clear(storage,binding,value),false);}
 for(const now of [-0,-1,null,NaN,Infinity,1.5,'1',Number.MAX_SAFE_INTEGER+1])assert.equal(read(storage,scope,now).kind,'invalid');
 assert.deepEqual(storage.reads,[]);noMutations(storage);
});

test('foreign sessions, unsupported versions, oversized or malformed envelopes are preserved fail closed',()=>{
 const value=entry(),storage=memory(),raws=['','{broken',' '.repeat(1025),JSON.stringify([]),JSON.stringify(null),JSON.stringify({...envelope(value),scope:otherScope}),JSON.stringify({...envelope(value),version:2}),JSON.stringify({version:1,scope}),JSON.stringify({...envelope(value),entry:null}),JSON.stringify({...envelope(value),notes:'QA_PRIVATE_NOTE'})];
 for(const raw of raws){storage.values.set(key,raw);assert.equal(read(storage,scope).kind,'invalid');assert.equal(put(storage,scope,value,null),false);assert.equal(clear(storage,scope,value),false);assert.equal(storage.values.get(key),raw);}
 noMutations(storage);
});

test('entry validation rejects unknown snapshots, controls, payment references and noncanonical UUIDs',()=>{
 const value=entry(),storage=memory(),bad=[{...value,id:uuid(1).toUpperCase()},{...value,id:uuid(1)+'\n'},{...value,id:'bad'},{...value,reference:'ENK-Q6MRGK'},{...value,reference:ref(1)+'\n'},{...value,reference:'ek-00000001'},{...value,reference:'EK-0000000\0'},{...value,reference:{}},{...value,notes:'QA_PRIVATE_NOTE'},{...value,requestId:uuid(2)},{...value,lead:lead()}];
 for(const malformed of bad){seed(storage,malformed);const raw=storage.values.get(key);assert.equal(read(storage,scope).kind,'invalid');assert.equal(put(storage,scope,value,null),false);assert.equal(clear(storage,scope,value),false);assert.equal(storage.values.get(key),raw);}
 noMutations(storage);
});

test('first save requires absence and choosing another contact requires the exact prior identity',()=>{
 const storage=memory(),first=entry(),next=entry(2);assert.equal(put(storage,scope,first,null),true);const raw=storage.values.get(key);
 assert.equal(put(storage,scope,next,null),false);assert.equal(put(storage,scope,next,{...first,savedAt:first.savedAt-1}),false);assert.equal(storage.values.get(key),raw);
 assert.equal(put(storage,scope,next,first),true);assert.deepEqual(read(storage,scope),{kind:'ready',entry:next});assert.equal(put(memory(),scope,next,first),false);
});

test('late lookup responses and old clear actions cannot replace or erase a newer selection',()=>{
 const storage=memory(),first=entry(),newer=entry(2),late=entry(3);put(storage,scope,first,null);put(storage,scope,newer,first);const raw=storage.values.get(key);
 assert.equal(put(storage,scope,late,first),false);assert.equal(clear(storage,scope,first),false);assert.equal(storage.values.get(key),raw);
 assert.equal(clear(storage,scope,newer),true);assert.equal(storage.values.has(key),false);assert.equal(put(storage,scope,late,first),false);assert.equal(clear(storage,scope,newer),true);
});

test('an identical entry is an idempotent no-op without needing another storage write',()=>{
 const storage=memory(),value=entry();put(storage,scope,value,null);const raw=storage.values.get(key),writes=storage.writes.length;
 storage.setItem=()=>{throw Error('QA quota');};assert.equal(put(storage,scope,{...value},value),true);assert.equal(storage.values.get(key),raw);assert.equal(storage.writes.length,writes);
});

test('expired references participate in exact replacement and explicit removal CAS',()=>{
 const storage=memory(),expired=seed(storage,entry(1,Date.now()-TTL-1000)),next=entry(2);assert.equal(put(storage,scope,next,null),false);noMutations(storage);
 assert.equal(put(storage,scope,next,expired),true);assert.equal(clear(storage,scope,expired),false);assert.deepEqual(read(storage,scope),{kind:'ready',entry:next});
 seed(storage,expired);assert.equal(clear(storage,scope,expired),true);assert.equal(storage.values.has(key),false);
});

test('malformed expected entries cannot overwrite or clear a valid identity',()=>{
 const storage=memory(),value=seed(storage),next=entry(2),raw=storage.values.get(key);
 for(const expected of [undefined,{},[],{...value,notes:'QA_PRIVATE'}, {...value,id:uuid(2)}, {...value,reference:ref(2)}])assert.equal(put(storage,scope,next,expected),false);
 assert.equal(put(storage,scope,{...next,notes:'QA_PRIVATE'},value),false);assert.equal(clear(storage,scope,{...value,notes:'QA_PRIVATE'}),false);assert.equal(storage.values.get(key),raw);noMutations(storage);
});

test('get, quota and remove failures preserve the prior bytes and never report false success',()=>{
 const unavailable=memory(),value=entry();unavailable.getItem=()=>{throw Error('QA_PRIVATE denied');};assert.equal(read(unavailable,scope).kind,'unavailable');assert.equal(put(unavailable,scope,value,null),false);assert.equal(clear(unavailable,scope,value),false);noMutations(unavailable);
 const storage=memory();seed(storage,value);const raw=storage.values.get(key);storage.setItem=()=>{throw Error('QA quota');};assert.equal(put(storage,scope,entry(2),value),false);assert.equal(storage.values.get(key),raw);
 storage.removeItem=()=>{throw Error('QA removal');};assert.equal(clear(storage,scope,value),false);assert.equal(storage.values.get(key),raw);
});

test('clock reversal beyond tolerance fails closed without replacing or erasing the saved identity',t=>{
 const now=Date.now(),storage=memory(),value=seed(storage,entry(1,now)),raw=storage.values.get(key);t.mock.method(Date,'now',()=>now-60001);
 assert.equal(read(storage,scope).kind,'invalid');assert.equal(put(storage,scope,entry(2,now-60001),value),false);assert.equal(clear(storage,scope,value),false);assert.equal(storage.values.get(key),raw);noMutations(storage);
});

test('returned copies and frozen inputs cannot mutate a stored identity or another session',()=>{
 const storage=memory(),value=Object.freeze(entry()),other=entry(2);assert.equal(put(storage,scope,value,null),true);seed(storage,other,otherScope);const raw=storage.values.get(key),second=storage.values.get(`enkarta.commercial-search.v1:${otherScope}`);
 const result=read(storage,scope);result.entry.reference=ref(3);result.entry.savedAt=0;assert.equal(storage.values.get(key),raw);assert.deepEqual(read(storage,scope).entry,value);
 assert.equal(clear(storage,scope,value),true);assert.equal(storage.values.get(`enkarta.commercial-search.v1:${otherScope}`),second);
});

// Run the real hook effects without a browser or DOM. No visual/device acceptance is claimed.
async function withHooks(initialProps,scenario){
 const names=['useState','useRef','useEffect','useMemo','useCallback'],original=Object.fromEntries(names.map(name=>[name,React[name]])),oldWindow=global.window,oldFetch=global.fetch;
 const slots=[],snapshots=[];let cursor=0,dirty=true,value,props=initialProps,effects=[],unmounted=false;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((item,index)=>Object.is(item,b[index]));
 React.useState=initial=>{const index=cursor++;if(!(index in slots))slots[index]={value:typeof initial==='function'?initial():initial};const slot=slots[index];return[slot.value,next=>{next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}}];};
 React.useRef=initial=>{const index=cursor++;return slots[index]??(slots[index]={current:initial});};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:compute(),deps};return slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const index=cursor++,before=slots[index];if(!before||!same(before.deps,deps)){const slot={deps,cleanup:before?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 global.window={sessionStorage:initialProps.defaultStorage??initialProps.storage??memory()};global.fetch=()=>assert.fail('Identity recovery must never perform a network request');
 const flush=async()=>{for(let round=0;round<25;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];value=useRecovery(props.scope,props.storage);snapshots.push(value);for(const effect of effects)effect();}await new Promise(resolve=>setImmediate(resolve));if(!dirty||unmounted)return value;}throw Error('Search recovery effects did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const runner={flush,current:()=>value,snapshots,unmount,update:async patch=>{props={...props,...patch};dirty=true;return flush();}};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of names)React[name]=original[name];if(oldWindow===undefined)delete global.window;else global.window=oldWindow;global.fetch=oldFetch;}
}

test('unbound and invalid hook sessions cannot read, reveal, persist or clear any reference',async()=>{
 for(const binding of [null,'','A'.repeat(64),scope+'\n','bad']){
  const storage=memory(),value=seed(storage);await withHooks({scope:binding,storage},async runner=>{
   const manager=runner.current();assert.equal(manager.ready,false);assert.equal(manager.entry,null);assert.equal(manager.expired,null);assert.equal(manager.persist(lead(),null),null);assert.equal(manager.clear(value),false);assert.equal(manager.isCurrent(value),false);manager.retry();assert.deepEqual(storage.reads,[]);noMutations(storage);
  });
 }
});

test('hook reads a reference once per bound scope and never auto consults, rewrites or renews it',async()=>{
 const storage=memory(),value=seed(storage,entry(1,Date.now()-1000));await withHooks({scope,storage},async runner=>{
  assert.equal(runner.current().ready,true);assert.deepEqual(runner.current().entry,value);assert.equal(runner.current().expired,null);assert.deepEqual(storage.reads,[key]);
  await runner.update({unrelated:'QA render'});assert.deepEqual(storage.reads,[key]);runner.current().retry();await runner.flush();assert.equal(storage.reads.length,2);assert.equal(runner.current().entry.savedAt,value.savedAt);noMutations(storage);
 });
});

test('hook exposes expired identities separately and retains them for an explicit CAS choice',async()=>{
 const storage=memory(),value=seed(storage,entry(1,Date.now()-TTL-1000));await withHooks({scope,storage},async runner=>{
  assert.equal(runner.current().ready,true);assert.equal(runner.current().entry,null);assert.deepEqual(runner.current().expired,value);noMutations(storage);
  assert.equal(runner.current().persist(lead(2),null),null);await runner.flush();assert.deepEqual(runner.current().expired,value);
  const replacement=runner.current().persist(lead(2),value);assert.ok(replacement);await runner.flush();assert.deepEqual(runner.current().entry,replacement);assert.equal(runner.current().expired,null);
 });
});

test('session changes hide an old identity before effects and reject all stale callbacks',async()=>{
 const storage=memory(),first=seed(storage),second=seed(storage,entry(2),otherScope);await withHooks({scope,storage},async runner=>{
  const old=runner.current(),index=runner.snapshots.length;await runner.update({scope:otherScope});assert.equal(runner.snapshots[index].ready,false);assert.equal(runner.snapshots[index].entry,null);assert.deepEqual(runner.current().entry,second);const reads=storage.reads.length;
  assert.equal(old.persist(lead(3),first),null);assert.equal(old.clear(first),false);assert.equal(old.isCurrent(first),false);old.retry();assert.equal(storage.reads.length,reads);noMutations(storage);
  await runner.update({scope:null});assert.equal(runner.current().entry,null);assert.equal(runner.current().expired,null);assert.equal(runner.current().ready,false);
 });
});

test('returning to the same scope does not revive callbacks captured before another session',async()=>{
 const storage=memory(),first=seed(storage);seed(storage,entry(2),otherScope);await withHooks({scope,storage},async runner=>{
  const old=runner.current();await runner.update({scope:otherScope});await runner.update({scope});const reads=storage.reads.length;
  assert.equal(old.persist(lead(3),first),null);assert.equal(old.clear(first),false);assert.equal(old.isCurrent(first),false);old.retry();assert.equal(storage.reads.length,reads);assert.deepEqual(runner.current().entry,first);noMutations(storage);
 });
});

test('changing storage in the same scope hides previous state and denies its old callbacks',async()=>{
 const storage=memory(),nextStorage=memory(),first=seed(storage),second=seed(nextStorage,entry(2));await withHooks({scope,storage},async runner=>{
  const old=runner.current(),index=runner.snapshots.length;await runner.update({storage:nextStorage});assert.equal(runner.snapshots[index].ready,false);assert.equal(runner.snapshots[index].entry,null);assert.deepEqual(runner.current().entry,second);const reads=storage.reads.length;
  assert.equal(old.clear(first),false);assert.equal(old.persist(lead(3),first),null);assert.equal(old.isCurrent(first),false);old.retry();assert.equal(storage.reads.length,reads);noMutations(storage);noMutations(nextStorage);
 });
});

test('explicit persistence keeps no private contact fields and changes the last reference only with CAS',async()=>{
 const storage=memory();await withHooks({scope,storage},async runner=>{
  assert.equal(runner.current().ready,true);assert.equal(runner.current().entry,null);const first=runner.current().persist(lead(),null);assert.ok(first);await runner.flush();assert.deepEqual(runner.current().entry,first);
  assert.equal(runner.current().persist(lead(2),null),null);await runner.flush();assert.deepEqual(runner.current().entry,first);
  const second=runner.current().persist(lead(2,{session:'QA_PRIVATE_SESSION'}),first);assert.ok(second);await runner.flush();assert.deepEqual(runner.current().entry,second);assert.doesNotMatch(storage.values.get(key),/QA_PRIVATE|notes|revenue|status|history|revision|design/);
 });
});

test('a late persist or clear refuses a newer storage choice and refreshes the offered identity',async()=>{
 const storage=memory(),first=seed(storage),second=entry(2);await withHooks({scope,storage},async runner=>{
  assert.equal(put(storage,scope,second,first),true);storage.writes.length=0;
  assert.equal(runner.current().persist(lead(3),first),null);await runner.flush();assert.deepEqual(runner.current().entry,second);assert.ok(runner.current().error);
  assert.equal(runner.current().clear(first),false);await runner.flush();assert.deepEqual(runner.current().entry,second);noMutations(storage);
 });
});

test('isCurrent checks a fresh exact active identity without a write or network request',async()=>{
 const storage=memory(),value=seed(storage);await withHooks({scope,storage},async runner=>{
  const before=storage.reads.length;assert.equal(runner.current().isCurrent(value),true);await runner.flush();assert.equal(storage.reads.length,before+1);assert.deepEqual(runner.current().entry,value);noMutations(storage);
  seed(storage,{...value,savedAt:value.savedAt-1});assert.equal(runner.current().isCurrent(value),false);await runner.flush();assert.equal(runner.current().entry.savedAt,value.savedAt-1);assert.ok(runner.current().error);noMutations(storage);
 });
});

test('a reference expiring before a resumed lookup finishes is no longer current and is never renewed',async t=>{
 const started=Date.now();let now=started;t.mock.method(Date,'now',()=>now);const storage=memory(),value=seed(storage,entry(1,started-TTL+100));await withHooks({scope,storage},async runner=>{
  assert.equal(runner.current().isCurrent(value),true);await runner.flush();now+=101;
  assert.equal(runner.current().isCurrent(value),false);await runner.flush();assert.equal(runner.current().entry,null);assert.deepEqual(runner.current().expired,value);assert.ok(runner.current().error);noMutations(storage);
 });
});

test('isCurrent rejects absent, invalid, foreign and unreadable storage without overwriting it',async()=>{
 for(const condition of ['absent','invalid','foreign','unavailable']){
  const storage=memory(),value=seed(storage);await withHooks({scope,storage},async runner=>{
   if(condition==='absent')storage.values.delete(key);else if(condition==='invalid')storage.values.set(key,'{broken');else if(condition==='foreign')storage.values.set(key,JSON.stringify(envelope(value,otherScope)));else storage.getItem=()=>{throw Error('QA_PRIVATE read failed');};
   assert.equal(runner.current().isCurrent(value),false);await runner.flush();assert.equal(runner.current().entry,null);assert.ok(runner.current().error);assert.doesNotMatch(runner.current().error,/QA_PRIVATE/);if(condition!=='absent')assert.equal(runner.current().ready,false);noMutations(storage);
  });
 }
});

test('invalid or unavailable journals require an explicit retry before any persistence',async()=>{
 for(const inaccessible of [false,true]){
  const storage=memory(),value=seed(storage),getItem=storage.getItem;if(inaccessible)storage.getItem=()=>{throw Error('QA_PRIVATE denied');};else storage.values.set(key,'{broken');
  await withHooks({scope,storage},async runner=>{
   assert.equal(runner.current().ready,false);assert.ok(runner.current().error);assert.equal(runner.current().persist(lead(2),value),null);assert.equal(runner.current().clear(value),false);noMutations(storage);
   storage.getItem=getItem;storage.values.delete(key);await runner.update({unrelated:true});assert.equal(runner.current().ready,false);runner.current().retry();await runner.flush();assert.equal(runner.current().ready,true);assert.equal(runner.current().entry,null);assert.equal(runner.current().error,'');noMutations(storage);
  });
 }
});

test('quota and removal errors preserve the previous reference and report safe recoverable errors',async()=>{
 const storage=memory(),value=seed(storage),raw=storage.values.get(key);storage.setItem=()=>{throw Error('QA_PRIVATE quota');};storage.removeItem=()=>{throw Error('QA_PRIVATE removal');};await withHooks({scope,storage},async runner=>{
  assert.equal(runner.current().persist(lead(2),value),null);await runner.flush();assert.deepEqual(runner.current().entry,value);assert.ok(runner.current().error);assert.doesNotMatch(runner.current().error,/QA_PRIVATE/);
  assert.equal(runner.current().clear(value),false);await runner.flush();assert.deepEqual(runner.current().entry,value);assert.ok(runner.current().error);assert.equal(storage.values.get(key),raw);
 });
});

test('explicit clear removes an active or expired identity and remains idempotent when absent',async()=>{
 for(const when of [Date.now(),Date.now()-TTL-1000]){
  const storage=memory(),value=seed(storage,entry(1,when));await withHooks({scope,storage},async runner=>{
   assert.equal(runner.current().clear(value),true);await runner.flush();assert.equal(runner.current().entry,null);assert.equal(runner.current().expired,null);assert.equal(runner.current().ready,true);assert.equal(storage.values.has(key),false);assert.equal(runner.current().clear(value),true);assert.equal(storage.removals.length,1);
  });
 }
});

test('unmount denies every old callback without even reading storage',async()=>{
 const storage=memory(),value=seed(storage);await withHooks({scope,storage},async runner=>{
  const old=runner.current(),reads=storage.reads.length;runner.unmount();assert.equal(old.persist(lead(2),value),null);assert.equal(old.clear(value),false);assert.equal(old.isCurrent(value),false);old.retry();assert.equal(storage.reads.length,reads);noMutations(storage);
 });
});

test('the hook default adapter uses only the current tab session storage',async()=>{
 const storage=memory(),value=seed(storage);await withHooks({scope,defaultStorage:storage},async runner=>{
  assert.deepEqual(runner.current().entry,value);assert.equal(runner.current().isCurrent(value),true);await runner.flush();assert.equal(runner.current().clear(value),true);await runner.flush();assert.equal(storage.values.has(key),false);assert.equal(runner.current().entry,null);
 });
});
