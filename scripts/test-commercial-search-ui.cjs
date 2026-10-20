// Component transitions use fictional storage and injected GET responses only.
// No browser, production data, clipboard or real network is used.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const Search=require('../src/components/admin/CommercialReferenceSearch.tsx').default;
const scope='a'.repeat(64),otherScope='b'.repeat(64),reference='EK-A1B2C3D4';
const lead=(patch={})=>({id:'30000000-0000-4000-8000-000000000001',reference,status:'contacted',package_key:'premium',design:'Lunaria',event_category:'Boda',placement:'qa',utm_source:'QA',utm_medium:'',utm_campaign:'',referrer_host:'',revenue_bs:930.5,notes:'QA_PRIVATE_SEARCH_NOTE',revision:2,created_at:'2001-01-01T12:00:00Z',updated_at:'2026-10-19T12:00:00Z',...patch});
const memory=()=>{const values=new Map(),reads=[],writes=[],removals=[];return{values,reads,writes,removals,getItem:key=>{reads.push(key);return values.get(key)??null;},setItem:(key,value)=>{writes.push(key);values.set(key,value);},removeItem:key=>{removals.push(key);values.delete(key);}};};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];

// Run state, reducers and dependency-aware effects in memory. Stable setters match
// React's contract. No populated DOM refs or visual/focus acceptance is claimed.
async function withHooks(Component,initialProps,scenario){
 const names=['useState','useReducer','useRef','useEffect','useMemo','useCallback','useId'],original=Object.fromEntries(names.map(name=>[name,React[name]])),oldWindow=global.window,oldDocument=global.document,oldFetch=global.fetch;
 const slots=[],snapshots=[],transportAudit=[],wrapped=new Map();let cursor=0,dirty=true,value,props,effects=[],unmounted=false,realNetworkCalls=0;
 const bind=patch=>{if(typeof patch.transport!=='function')return patch;const originalTransport=patch.transport;if(!wrapped.has(originalTransport))wrapped.set(originalTransport,async(url,options)=>{transportAudit.push({originalTransport,url,method:options?.method??'GET'});return originalTransport(url,options);});return{...patch,transport:wrapped.get(originalTransport)};};props=bind(initialProps);
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((item,index)=>Object.is(item,b[index]));
 React.useState=initial=>{const index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initial==='function'?initial():initial};slot.set=next=>{next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useReducer=(reduce,initial,init)=>{const index=cursor++;if(!(index in slots)){const slot=slots[index]={value:init?init(initial):initial,reduce};slot.dispatch=action=>{const next=slot.reduce(slot.value,action);if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}slots[index].reduce=reduce;return[slots[index].value,slots[index].dispatch];};
 React.useRef=initial=>{const index=cursor++;return slots[index]??(slots[index]={current:initial});};
 React.useId=()=>{const index=cursor++;return slots[index]??(slots[index]=`:qa-search-${index}:`);};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:compute(),deps};return slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const index=cursor++,before=slots[index];if(!before||!same(before.deps,deps)){const slot={deps,cleanup:before?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 global.window={sessionStorage:initialProps.storage??memory(),addEventListener:()=>{},removeEventListener:()=>{},setTimeout,clearTimeout};global.document={getElementById:()=>null};global.fetch=async()=>{realNetworkCalls++;throw Error('The real network boundary is disabled');};
 const flush=async()=>{for(let round=0;round<30;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];value=Component(props);snapshots.push(value);for(const effect of effects)effect();}await new Promise(resolve=>setImmediate(resolve));if(!dirty||unmounted)return value;}throw Error('Search effects did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const runner={flush,current:()=>value,snapshots,unmount,update:async patch=>{props={...props,...bind(patch)};dirty=true;return flush();}};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of names)React[name]=original[name];if(oldWindow===undefined)delete global.window;else global.window=oldWindow;if(oldDocument===undefined)delete global.document;else global.document=oldDocument;global.fetch=oldFetch;assert.equal(realNetworkCalls,0);assert.ok(transportAudit.every(call=>call.method==='GET'),'No component request may mutate the server');assert.ok(transportAudit.every(call=>call.originalTransport!==offline),'Read-only transitions must not request anything');}
}
const renderedLead=value=>React.createElement('p',{'data-qa-live-lead':value.id},value.notes);
const inputIn=runner=>nodes(runner.current(),node=>node.props.name==='commercial-reference')[0];
const buttonIn=(runner,label)=>nodes(runner.current(),node=>node.type==='button'&&node.props.children===label)[0];
const live=runner=>nodes(runner.current(),node=>node.props['data-qa-live-lead']);
const change=async(runner,value)=>{inputIn(runner).props.onChange({target:{value}});await runner.flush();};
const submit=async runner=>{nodes(runner.current(),node=>node.type==='form')[0].props.onSubmit({preventDefault:()=>{}});await runner.flush();};
const textIn=runner=>nodes(runner.current(),node=>typeof node.props.children==='string').map(node=>node.props.children).join(' ');
const offline=async()=>assert.fail('No GET or PATCH is allowed until an explicit search action');

test('an empty search mounts without a request or storage write and its input remains editable',async()=>{
 const storage=memory();await withHooks(Search,{storage,recoveryScope:scope,transport:offline,renderLead:renderedLead},async runner=>{
  assert.equal(inputIn(runner).props.value,'');assert.deepEqual(live(runner),[]);assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);
  await change(runner,'ek-a1b');assert.equal(inputIn(runner).props.value,'ek-a1b');assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);
 });
});

test('manual search still validates exact commercial references before requesting or persisting anything',async()=>{
 const storage=memory();await withHooks(Search,{storage,recoveryScope:scope,transport:offline,renderLead:renderedLead},async runner=>{
  await change(runner,'ENK-ABC123');await submit(runner);assert.match(textIn(runner),/referencia completa/);assert.deepEqual(storage.writes,[]);assert.deepEqual(live(runner),[]);
 });
});

const searchKey=binding=>'enkarta.commercial-search.v1:'+binding;
const copyIn=(storage,binding=scope)=>{const raw=storage.values.get(searchKey(binding));return raw===undefined?null:JSON.parse(raw).entry;};
const seed=(storage,binding=scope,value=lead(),savedAt=Date.now())=>{const entry={id:value.id,reference:value.reference,savedAt};storage.values.set(searchKey(binding),JSON.stringify({version:1,scope:binding,entry}));return entry;};
const transportFor=(calls,response=()=>Response.json({lead:lead()}))=>async(url,options)=>{calls.push({url,options});assert.equal(options?.method,undefined,'Search must never send a PATCH');return response(url,options);};

test('a reloaded query offers only reference and date until explicit resumption fetches the current canonical contact',async()=>{
 const storage=memory(),entry=seed(storage),calls=[],canonical=lead({revision:7,notes:'QA current server note'});
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,()=>Response.json({lead:canonical})),renderLead:renderedLead},async runner=>{
  assert.equal(inputIn(runner).props.value,'');assert.deepEqual(live(runner),[]);assert.deepEqual(calls,[]);assert.ok(buttonIn(runner,'Retomar consulta'));assert.match(textIn(runner),/EK-A1B2C3D4/);assert.doesNotMatch(textIn(runner),/QA_PRIVATE_SEARCH_NOTE|QA current server note|930/);assert.deepEqual(storage.writes,[]);
  buttonIn(runner,'Retomar consulta').props.onClick();await runner.flush();assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/admin/commercial/lookup?reference='+reference);assert.equal(calls[0].options.cache,'no-store');assert.equal(live(runner).length,1);assert.equal(live(runner)[0].props.children,canonical.notes);assert.equal(copyIn(storage).id,entry.id);assert.equal(copyIn(storage).reference,entry.reference);
 });
});

test('an accepted manual lookup stores only its identity and never caches commercial notes, revenue or attribution',async()=>{
 const storage=memory(),calls=[];
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls),renderLead:renderedLead},async runner=>{
  await change(runner,'  ek-a1b2c3d4 ');assert.deepEqual(storage.writes,[]);await submit(runner);assert.equal(calls.length,1);assert.equal(live(runner).length,1);const entry=copyIn(storage);assert.deepEqual(Object.keys(entry).sort(),['id','reference','savedAt']);assert.equal(entry.id,lead().id);assert.equal(entry.reference,reference);assert.ok(Number.isSafeInteger(entry.savedAt));assert.equal(storage.writes.length,1);
  const raw=storage.values.get(searchKey(scope));assert.doesNotMatch(raw,/QA_PRIVATE_SEARCH_NOTE|930\.5|revenue|status|revision|package|utm_source|landing/);
 });
});

test('identity mismatch, missing contact and failed HTTP during resume preserve the previous copy without showing borrowed data',async()=>{
 for(const response of [()=>Response.json({lead:lead({id:'30000000-0000-4000-8000-000000000002'})}),()=>Response.json({lead:lead({reference:'EK-00000002'})}),()=>Response.json({lead:null}),()=>Response.json({code:'NOT_FOUND'},{status:404}),()=>Response.json({error:'No autorizado'},{status:401})]){
  const storage=memory(),entry=seed(storage),calls=[];
  await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,response),renderLead:renderedLead},async runner=>{
   buttonIn(runner,'Retomar consulta').props.onClick();await runner.flush();assert.equal(calls.length,1);assert.deepEqual(live(runner),[]);assert.deepEqual(copyIn(storage),entry);assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);assert.ok(nodes(runner.current(),node=>node.props.role==='alert').length);
  });
 }
});

test('typing never replaces a cached consultation and an unfound manual query cannot erase it',async()=>{
 const storage=memory(),entry=seed(storage),calls=[];
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,()=>Response.json({lead:null})),renderLead:renderedLead},async runner=>{
  await change(runner,'EK-00000002');assert.deepEqual(copyIn(storage),entry);assert.deepEqual(storage.writes,[]);await submit(runner);assert.deepEqual(copyIn(storage),entry);assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);assert.deepEqual(live(runner),[]);
 });
});

test('clearing a consultation removes its exact copy and a later saved snapshot cannot resurrect the result',async()=>{
 const storage=memory(),calls=[];
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls),renderLead:renderedLead},async runner=>{
  await change(runner,reference);await submit(runner);assert.equal(live(runner).length,1);assert.ok(copyIn(storage));buttonIn(runner,'Limpiar búsqueda').props.onClick();await runner.flush();assert.equal(copyIn(storage),null);assert.equal(inputIn(runner).props.value,'');assert.deepEqual(live(runner),[]);
  const writes=storage.writes.length;await runner.update({latestLead:lead({revision:9,notes:'QA later save snapshot'})});assert.deepEqual(live(runner),[]);assert.equal(copyIn(storage),null);assert.equal(storage.writes.length,writes);assert.equal(calls.length,1);
 });
});

test('failed cleanup CAS preserves a newer stored reference and the currently displayed result',async()=>{
 const storage=memory(),calls=[];
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls),renderLead:renderedLead},async runner=>{
  await change(runner,reference);await submit(runner);const next=seed(storage,scope,lead({id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002'}));buttonIn(runner,'Limpiar búsqueda').props.onClick();await runner.flush();assert.deepEqual(copyIn(storage),next);assert.equal(live(runner).length,1);assert.equal(inputIn(runner).props.value,reference);assert.ok(nodes(runner.current(),node=>node.props.role==='alert').length);assert.deepEqual(storage.removals,[]);
 });
});

test('clearing during a stalled lookup cancels it and its late response cannot recreate the cache or result',async()=>{
 const storage=memory(),pending=deferred(),calls=[];let signal,bodyReads=0;
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,(_url,options)=>{signal=options.signal;return pending.promise;}),renderLead:renderedLead},async runner=>{
  await change(runner,reference);await submit(runner);assert.equal(calls.length,1);buttonIn(runner,'Limpiar búsqueda').props.onClick();await runner.flush();assert.equal(signal.aborted,true);pending.resolve({status:200,ok:true,json:async()=>{bodyReads++;return{lead:lead()};}});await runner.flush();assert.equal(bodyReads,0);assert.deepEqual(live(runner),[]);assert.equal(copyIn(storage),null);assert.deepEqual(storage.writes,[]);assert.equal(inputIn(runner).props.value,'');
 });
});

test('a changed cache during resume lookup cannot be overwritten or rendered from the older consultation',async()=>{
 const storage=memory(),entry=seed(storage),pending=deferred(),calls=[];
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,()=>pending.promise),renderLead:renderedLead},async runner=>{
  buttonIn(runner,'Retomar consulta').props.onClick();await runner.flush();const next=seed(storage,scope,lead({id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002'}),entry.savedAt+1);pending.resolve(Response.json({lead:lead()}));await runner.flush();assert.deepEqual(copyIn(storage),next);assert.deepEqual(live(runner),[]);assert.deepEqual(storage.writes,[]);assert.ok(nodes(runner.current(),node=>node.props.role==='alert').length);
 });
});

test('manual lookup captures the previous cache at request start and cannot overwrite a copy changed in flight',async()=>{
 const storage=memory(),entry=seed(storage),pending=deferred(),calls=[];
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,()=>pending.promise),renderLead:renderedLead},async runner=>{
  await change(runner,reference);await submit(runner);const next=seed(storage,scope,lead({id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002'}),entry.savedAt+1);pending.resolve(Response.json({lead:lead()}));await runner.flush();assert.deepEqual(copyIn(storage),next);assert.deepEqual(storage.writes,[]);
 });
});

test('changing recovery session masks old input and results immediately and ignores older handlers and late replies',async()=>{
 const storage=memory(),entry=seed(storage),next=seed(storage,otherScope,lead({id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002'})),pending=deferred(),calls=[];let signal;
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,(_url,options)=>{signal=options.signal;return pending.promise;}),renderLead:renderedLead},async runner=>{
  await change(runner,reference);const oldSubmit=nodes(runner.current(),node=>node.type==='form')[0].props.onSubmit,oldChange=inputIn(runner).props.onChange;await submit(runner);const index=runner.snapshots.length;
  await runner.update({recoveryScope:otherScope});assert.equal(signal.aborted,true);assert.equal(nodes(runner.snapshots[index],node=>node.props.name==='commercial-reference')[0].props.value,'');assert.deepEqual(live(runner),[]);
  oldChange({target:{value:reference}});oldSubmit({preventDefault:()=>{}});await runner.flush();assert.equal(calls.length,1);assert.equal(inputIn(runner).props.value,'');pending.resolve(Response.json({lead:lead()}));await runner.flush();assert.deepEqual(live(runner),[]);assert.deepEqual(copyIn(storage,scope),entry);assert.deepEqual(copyIn(storage,otherScope),next);assert.deepEqual(storage.writes,[]);
 });
});

test('unmounting an active search prevents late persistence and rendering after an ignored abort',async()=>{
 const storage=memory(),pending=deferred(),calls=[];let signal;
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,(_url,options)=>{signal=options.signal;return pending.promise;}),renderLead:renderedLead},async runner=>{
  await change(runner,reference);await submit(runner);runner.unmount();assert.equal(signal.aborted,true);pending.resolve(Response.json({lead:lead()}));await runner.flush();assert.equal(copyIn(storage),null);assert.deepEqual(storage.writes,[]);
 });
});

test('a transport ignoring abort still exits the twenty-second deadline without retrying or caching a late response',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const storage=memory(),pending=deferred(),calls=[];
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,()=>pending.promise),renderLead:renderedLead},async runner=>{
  await change(runner,reference);await submit(runner);assert.ok(buttonIn(runner,'Buscando…'));t.mock.timers.tick(20000);await runner.flush();assert.ok(buttonIn(runner,'Buscar referencia'));assert.match(textIn(runner),/tardó demasiado|agot/);pending.resolve(Response.json({lead:lead()}));await runner.flush();assert.equal(calls.length,1);assert.deepEqual(storage.writes,[]);assert.deepEqual(live(runner),[]);
 });
});

test('a storage capacity failure keeps the accepted canonical result in RAM without claiming successful recovery storage',async()=>{
 const storage=memory(),calls=[];storage.setItem=()=>{throw Error('QA storage quota');};
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls),renderLead:renderedLead},async runner=>{
  await change(runner,reference);await submit(runner);assert.equal(live(runner).length,1);assert.equal(copyIn(storage),null);assert.ok(nodes(runner.current(),node=>node.props.role==='alert').length);assert.equal(calls.length,1);
 });
});

test('expired references cannot resume automatically or explicitly and remain available for exact cleanup',async()=>{
 const storage=memory(),entry=seed(storage,scope,lead(),Date.now()-2*86400000);
 await withHooks(Search,{storage,recoveryScope:scope,transport:offline,renderLead:renderedLead},async runner=>{
  assert.equal(buttonIn(runner,'Retomar consulta'),undefined);assert.match(textIn(runner),/venci|24 horas/i);assert.deepEqual(copyIn(storage),entry);assert.deepEqual(storage.writes,[]);assert.ok(buttonIn(runner,'Limpiar búsqueda'));buttonIn(runner,'Limpiar búsqueda').props.onClick();await runner.flush();assert.equal(copyIn(storage),null);
 });
});

test('an unreadable recovery copy is never overwritten by mounting or typing',async()=>{
 const storage=memory();storage.values.set(searchKey(scope),'{broken');await withHooks(Search,{storage,recoveryScope:scope,transport:offline,renderLead:renderedLead},async runner=>{
  await change(runner,reference);assert.equal(storage.values.get(searchKey(scope)),'{broken');assert.deepEqual(storage.writes,[]);assert.ok(nodes(runner.current(),node=>node.props.role==='alert').length);
 });
});

test('a new successful manual consultation replaces only the exact previously captured search copy',async()=>{
 const storage=memory(),previous=seed(storage),calls=[],canonical=lead({id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002',notes:'QA newly requested contact'});
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,()=>Response.json({lead:canonical})),renderLead:renderedLead},async runner=>{
  await change(runner,canonical.reference);await submit(runner);assert.equal(copyIn(storage).id,canonical.id);assert.equal(copyIn(storage).reference,canonical.reference);assert.notDeepEqual(copyIn(storage),previous);assert.equal(storage.writes.length,1);assert.equal(live(runner)[0].props.children,canonical.notes);
 });
});

test('two manual lookups accept only the latest request and an older reply cannot replace its cache',async()=>{
 const storage=memory(),pending=[deferred(),deferred()],calls=[],signals=[],canonical=lead({id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002',notes:'QA latest result'});
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,(_url,options)=>{const index=signals.length;signals.push(options.signal);return pending[index].promise;}),renderLead:renderedLead},async runner=>{
  await change(runner,reference);await submit(runner);await change(runner,canonical.reference);await submit(runner);assert.equal(signals[0].aborted,true);pending[1].resolve(Response.json({lead:canonical}));await runner.flush();pending[0].resolve(Response.json({lead:lead()}));await runner.flush();assert.equal(calls.length,2);assert.equal(copyIn(storage).id,canonical.id);assert.equal(live(runner)[0].props.children,canonical.notes);assert.equal(storage.writes.length,1);
 });
});

test('returning to the same scope does not reactivate callbacks captured before the intervening session',async()=>{
 const storage=memory(),calls=[];
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls),renderLead:renderedLead},async runner=>{
  await change(runner,reference);const oldSubmit=nodes(runner.current(),node=>node.type==='form')[0].props.onSubmit,oldChange=inputIn(runner).props.onChange;
  await runner.update({recoveryScope:otherScope});await runner.update({recoveryScope:scope});oldChange({target:{value:reference}});oldSubmit({preventDefault:()=>{}});await runner.flush();assert.deepEqual(calls,[]);assert.equal(inputIn(runner).props.value,'');assert.deepEqual(storage.writes,[]);assert.deepEqual(live(runner),[]);
 });
});

test('changing storage within one scope masks previous results and rejects callbacks from the old storage lifetime',async()=>{
 const first=memory(),second=memory(),calls=[];seed(second,scope,lead({id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002'}));
 await withHooks(Search,{storage:first,recoveryScope:scope,transport:transportFor(calls),renderLead:renderedLead},async runner=>{
  await change(runner,reference);await submit(runner);const oldClear=buttonIn(runner,'Limpiar búsqueda').props.onClick,index=runner.snapshots.length;assert.equal(live(runner).length,1);
  await runner.update({storage:second});assert.equal(nodes(runner.snapshots[index],node=>node.props.name==='commercial-reference')[0].props.value,'');assert.deepEqual(live(runner),[]);oldClear();await runner.flush();assert.ok(copyIn(first));assert.equal(copyIn(second).reference,'EK-00000002');assert.deepEqual(second.writes,[]);assert.deepEqual(second.removals,[]);
 });
});

test('deadline also covers a response body that ignores abort and its late JSON cannot render or persist',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const storage=memory(),body=deferred(),calls=[];let bodyReads=0;
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,()=>({status:200,ok:true,json:()=>{bodyReads++;return body.promise;}})),renderLead:renderedLead},async runner=>{
  await change(runner,reference);await submit(runner);assert.equal(bodyReads,1);t.mock.timers.tick(20000);await runner.flush();assert.ok(buttonIn(runner,'Buscar referencia'));body.resolve({lead:lead()});await runner.flush();assert.deepEqual(live(runner),[]);assert.equal(copyIn(storage),null);assert.deepEqual(storage.writes,[]);assert.equal(calls.length,1);
 });
});

test('clearing an unreadable consultation clears screen state without pretending to delete an unknown local copy',async()=>{
 const storage=memory();storage.values.set(searchKey(scope),'{broken');await withHooks(Search,{storage,recoveryScope:scope,transport:offline,renderLead:renderedLead},async runner=>{
  await change(runner,reference);buttonIn(runner,'Limpiar búsqueda').props.onClick();await runner.flush();assert.equal(inputIn(runner).props.value,'');assert.equal(storage.values.get(searchKey(scope)),'{broken');assert.deepEqual(storage.removals,[]);assert.match(textIn(runner),/No se pudo comprobar la copia local/);
 });
});

const {default:Dashboard,CommercialSalesWorkspace:Workspace,CommercialContactList:ContactList}=require('../src/components/admin/CommercialDashboard.tsx');
test('Dashboard passes the session binding to its one stable search and resuming a query never opens an editor automatically',async()=>{
 const storage=memory(),entry=seed(storage),calls=[];
 const transport=transportFor(calls,url=>String(url).startsWith('/api/admin/commercial/lookup?')?Response.json({lead:lead()}):Promise.reject(Error('QA metrics unavailable')));
 await withHooks(Dashboard,{storage,transport},async runner=>{
  const search=()=>nodes(Workspace(runner.current().props),node=>node.type===Search),list=()=>nodes(runner.current(),node=>node.type===ContactList)[0];assert.equal(search().length,1);assert.equal(search()[0].props.recoveryScope,null);const key=search()[0].key;
  runner.current().props.onRecoveryScope(scope);await runner.flush();assert.equal(search().length,1);assert.equal(search()[0].props.recoveryScope,scope);assert.equal(search()[0].key,key);assert.equal(list().props.leads.length,0);
  await withHooks(Search,{...search()[0].props,storage},async child=>{
   assert.ok(buttonIn(child,'Retomar consulta'));buttonIn(child,'Retomar consulta').props.onClick();await child.flush();assert.equal(nodes(child.current(),node=>typeof node.type==='function'&&node.props.lead?.id===entry.id).length,1);
  });
  await runner.flush();assert.equal(list().props.leads.length,0);assert.equal(calls.filter(call=>String(call.url).includes('/lookup?')).length,1);runner.current().props.onRecoveryScope(otherScope);await runner.flush();assert.equal(search().length,1);assert.equal(search()[0].props.recoveryScope,otherScope);assert.equal(search()[0].key,key);
 });
});

test('QA cleanup removes only its last consultation and preserves the reference of another session',async()=>{
 const Workbench=require('../src/app/dev/services/commercial-dashboard/workbench.tsx').default,storage=memory(),qaScope='e'.repeat(64),outsideScope='f'.repeat(64);seed(storage,qaScope);const outside=seed(storage,outsideScope);storage.values.set('QA unrelated storage','retained');
 await withHooks(Workbench,{storage},async runner=>{
  buttonIn(runner,'Limpiar QA').props.onClick();await runner.flush();assert.equal(copyIn(storage,qaScope),null);assert.deepEqual(copyIn(storage,outsideScope),outside);assert.equal(storage.values.get('QA unrelated storage'),'retained');assert.ok(storage.removals.every(key=>key.endsWith(qaScope)));assert.match(textIn(runner),/ficticios retirados/);
 });
});

test('a saved reference expiring during resumption cannot display a contact or silently renew its lifetime',async t=>{
 const initial=Date.now();let now=initial;t.mock.method(Date,'now',()=>now);const storage=memory(),entry=seed(storage,scope,lead(),initial-86400000+100),pending=deferred(),calls=[];
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls,()=>pending.promise),renderLead:renderedLead},async runner=>{
  buttonIn(runner,'Retomar consulta').props.onClick();await runner.flush();now+=200;pending.resolve(Response.json({lead:lead()}));await runner.flush();assert.deepEqual(live(runner),[]);assert.deepEqual(copyIn(storage),entry);assert.deepEqual(storage.writes,[]);assert.equal(buttonIn(runner,'Retomar consulta'),undefined);assert.match(textIn(runner),/venció/);
 });
});

test('a later confirmed lead revision refreshes the visible snapshot without making another request or rewriting consultation storage',async()=>{
 const storage=memory(),calls=[];
 await withHooks(Search,{storage,recoveryScope:scope,transport:transportFor(calls),renderLead:renderedLead},async runner=>{
  await change(runner,reference);await submit(runner);const entry=copyIn(storage),writes=storage.writes.length;await runner.update({latestLead:lead({revision:8,notes:'QA saved later revision'})});assert.equal(live(runner)[0].props.children,'QA saved later revision');assert.deepEqual(copyIn(storage),entry);assert.equal(storage.writes.length,writes);assert.equal(calls.length,1);
 });
});
