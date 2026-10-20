// Isolated component effects and storage. No browser, production data or real network.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {default:Panel,useCommercialPendingRecovery:useRecovery}=require('../src/components/admin/CommercialPendingRecovery.tsx');
const {readCommercialPending:read,putCommercialPending:put,clearCommercialPending:clear}=require('../src/lib/commercial-pending.ts');
const scope='a'.repeat(64),otherScope='b'.repeat(64),reference='EK-A1B2C3D4';
const request=(patch={})=>({id:'30000000-0000-4000-8000-000000000001',requestId:'30000000-0000-4000-8000-000000000011',expectedRevision:2,status:'reserved',revenueBs:930.5,notes:'QA_PRIVATE_RECOVERY_NOTE',...patch});
const lead=(patch={})=>({id:request().id,reference,status:'contacted',package_key:'premium',design:'Lunaria',event_category:'Boda',placement:'qa',utm_source:'QA',utm_medium:'',utm_campaign:'',referrer_host:'',revenue_bs:200,notes:'QA_CANONICAL_NOTE',revision:2,created_at:'2001-01-01T12:00:00Z',updated_at:'2026-10-19T12:00:00Z',...patch});
const memory=()=>{const values=new Map(),reads=[],writes=[],removals=[];return{values,reads,writes,removals,getItem:key=>{reads.push(key);return values.get(key)??null;},setItem:(key,value)=>{writes.push(key);values.set(key,value);},removeItem:key=>{removals.push(key);values.delete(key);}};};
const seed=(storage,ref=reference,update=request(),binding=scope,when=Date.now())=>{const result=put(storage,binding,ref,update,when);assert.equal(result.ok,true);storage.reads.length=0;storage.writes.length=0;storage.removals.length=0;return result.entry;};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];

// Re-renders state with dependency-aware effects. DOM refs are not populated;
// this does not claim visual, keyboard-focus or device acceptance.
async function withHooks(Component,initialProps,scenario){
 const names=['useState','useReducer','useRef','useEffect','useMemo','useCallback','useId'],original=Object.fromEntries(names.map(name=>[name,React[name]])),oldWindow=global.window;
 const slots=[],snapshots=[];let cursor=0,dirty=true,value,props=initialProps,effects=[],unmounted=false;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((item,index)=>Object.is(item,b[index]));
 React.useState=initial=>{const index=cursor++;if(!(index in slots))slots[index]={value:typeof initial==='function'?initial():initial};const slot=slots[index];return[slot.value,next=>{next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}}];};
 React.useReducer=(reduce,initial,init)=>{const[state,setState]=React.useState(()=>init?init(initial):initial);return[state,action=>setState(previous=>reduce(previous,action))];};
 React.useRef=initial=>{const index=cursor++;return slots[index]??(slots[index]={current:initial});};
 React.useId=()=>{const index=cursor++;return slots[index]??(slots[index]=`:qa-recovery-${index}:`);};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:compute(),deps};return slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const index=cursor++,before=slots[index];if(!before||!same(before.deps,deps)){const slot={deps,cleanup:before?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 global.window={sessionStorage:initialProps.storage??memory(),addEventListener:()=>{},removeEventListener:()=>{},setTimeout,clearTimeout};
 const flush=async()=>{for(let round=0;round<25;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];value=Component(props);snapshots.push(value);for(const effect of effects)effect();}await new Promise(resolve=>setImmediate(resolve));if(!dirty||unmounted)return value;}throw Error('Recovery effects did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const runner={flush,current:()=>value,snapshots,unmount,update:async patch=>{props={...props,...patch};dirty=true;return flush();}};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of names)React[name]=original[name];if(oldWindow===undefined)delete global.window;else global.window=oldWindow;}
}
const Harness=props=>useRecovery(props.scope,props.transport,props.onResume,props.storage);
const offline=async()=>assert.fail('Reading local recovery must never call the network');

test('missing and malformed session bindings reveal no entries and perform no storage or network access',async()=>{
 for(const binding of [null,'','A'.repeat(64),'invalid'])await withHooks(Harness,{scope:binding,storage:memory(),transport:offline,onResume:()=>assert.fail()},async runner=>{
  const manager=runner.current();assert.equal(manager.ready,false);assert.deepEqual(manager.entries,[]);assert.equal(manager.persist(reference,request()),null);assert.equal(manager.error,'');
 });
});

test('a valid session reads pending copies without automatically writing, resuming or clearing them',async()=>{
 const storage=memory(),entry=seed(storage);
 await withHooks(Harness,{scope,storage,transport:offline,onResume:()=>assert.fail()},async runner=>{
  assert.equal(runner.current().ready,true);assert.deepEqual(runner.current().entries,[entry]);assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);
 });
});

test('session changes mask previous entries immediately and stale manager callbacks cannot persist them',async()=>{
 const storage=memory();seed(storage);const other=seed(storage,'EK-00000002',request({id:'30000000-0000-4000-8000-000000000002',requestId:'30000000-0000-4000-8000-000000000012'}),otherScope);
 await withHooks(Harness,{scope,storage,transport:offline,onResume:()=>assert.fail()},async runner=>{
  const previous=runner.current(),index=runner.snapshots.length;await runner.update({scope:otherScope});
  assert.deepEqual(runner.snapshots[index].entries,[]);assert.equal(runner.snapshots[index].ready,false);assert.deepEqual(runner.current().entries,[other]);assert.equal(previous.persist(reference,request()),null);
  await runner.update({scope:null});assert.deepEqual(runner.current().entries,[]);assert.equal(runner.current().ready,false);assert.deepEqual(storage.writes,[]);
 });
});

test('persist preserves other operations and returns the exact durable entry before any server write',async()=>{
 const storage=memory(),first=seed(storage);
 await withHooks(Harness,{scope,storage,transport:offline,onResume:()=>assert.fail()},async runner=>{
  const update=request({id:'30000000-0000-4000-8000-000000000002',requestId:'30000000-0000-4000-8000-000000000012'}),entry=runner.current().persist('EK-00000002',update);
  assert.ok(entry);assert.deepEqual(entry.request,update);await runner.flush();assert.equal(runner.current().entries.length,2);assert.ok(runner.current().entries.some(value=>value.request.requestId===first.request.requestId));assert.equal(storage.writes.length,1);
 });
});

test('a conflicting durable write leaves previous operations available with explicit error guidance',async()=>{
 const storage=memory(),entry=seed(storage);
 await withHooks(Harness,{scope,storage,transport:offline,onResume:()=>assert.fail()},async runner=>{
  assert.equal(runner.current().persist(reference,request({requestId:'30000000-0000-4000-8000-000000000099'})),null);await runner.flush();assert.match(runner.current().error,/No se pudo conservar/);assert.deepEqual(runner.current().entries,[entry]);
 });
});

test('a storage write failure returns no durable operation and preserves the existing journal',async()=>{
 const storage=memory(),entry=seed(storage);storage.setItem=()=>{throw Error('QA quota exceeded');};
 await withHooks(Harness,{scope,storage,transport:offline,onResume:()=>assert.fail()},async runner=>{
  const different=request({id:'30000000-0000-4000-8000-000000000002',requestId:'30000000-0000-4000-8000-000000000012'});
  assert.equal(runner.current().persist('EK-00000002',different),null);await runner.flush();assert.deepEqual(runner.current().entries,[entry]);assert.match(runner.current().error,/No se pudo conservar/);assert.deepEqual(read(storage,scope).entries,[entry]);
 });
});

test('invalid and unavailable journals disable recovery until an explicit successful reread',async()=>{
 for(const unavailable of [false,true]){
  const storage=memory();if(unavailable)storage.getItem=()=>{throw Error('QA unavailable');};else storage.values.set('enkarta.commercial-pending.v1:'+scope,'{broken');
  await withHooks(Harness,{scope,storage,transport:offline,onResume:()=>assert.fail()},async runner=>{
   assert.equal(runner.current().ready,false);assert.ok(runner.current().error);assert.equal(runner.current().persist(reference,request()),null);assert.deepEqual(storage.writes,[]);
   storage.getItem=key=>storage.values.get(key)??null;storage.values.clear();runner.current().retry();await runner.flush();assert.equal(runner.current().ready,true);assert.equal(runner.current().error,'');
  });
 }
});

test('completion removes exactly its matching copy while preserving another contact',async()=>{
 const storage=memory(),entry=seed(storage),other=seed(storage,'EK-00000002',request({id:'30000000-0000-4000-8000-000000000002',requestId:'30000000-0000-4000-8000-000000000012'}));
 await withHooks(Harness,{scope,storage,transport:offline,onResume:()=>assert.fail()},async runner=>{
  assert.equal(runner.current().complete(entry),true);await runner.flush();assert.deepEqual(runner.current().entries,[other]);assert.deepEqual(read(storage,scope).entries,[other]);
 });
});

test('a stale completion cannot erase a replacement operation for the same contact',async()=>{
 const storage=memory(),entry=seed(storage);
 await withHooks(Harness,{scope,storage,transport:offline,onResume:()=>assert.fail()},async runner=>{
  assert.equal(clear(storage,scope,entry),true);const replacement=seed(storage,reference,request({requestId:'30000000-0000-4000-8000-000000000099'}));
  assert.equal(runner.current().complete(entry),false);await runner.flush();assert.deepEqual(runner.current().entries,[replacement]);assert.match(runner.current().error,/cambió|retirar/);
 });
});

test('failed removal reports an error and keeps the original recovery copy intact',async()=>{
 const storage=memory(),entry=seed(storage);storage.removeItem=()=>{throw Error('QA removal blocked');};
 await withHooks(Harness,{scope,storage,transport:offline,onResume:()=>assert.fail()},async runner=>{
  assert.equal(runner.current().forget(entry),false);await runner.flush();assert.deepEqual(runner.current().entries,[entry]);assert.ok(runner.current().error);
 });
});

test('explicit resume makes one private GET and forwards the exact operation alongside a newer canonical contact',async()=>{
 const storage=memory(),entry=seed(storage),calls=[],resumed=[],canonical=lead({revision:7});
 const transport=async(url,options)=>{calls.push({url,options});assert.equal(options.method,undefined);return Response.json({lead:canonical});};
 await withHooks(Harness,{scope,storage,transport,onResume:(value,copy)=>{resumed.push({value,copy});return true;}},async runner=>{
  assert.deepEqual(calls,[]);await runner.current().resume(entry);await runner.flush();assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/admin/commercial/lookup?reference='+reference);assert.equal(calls[0].options.cache,'no-store');assert.deepEqual(resumed,[{value:canonical,copy:entry}]);assert.deepEqual(runner.current().entries,[entry]);assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);
 });
});

test('missing contacts, 404, mismatched identities and older canonical revisions never resume or delete a pending copy',async()=>{
 for(const response of [()=>Response.json({lead:null}),()=>Response.json({code:'NOT_FOUND'},{status:404}),()=>Response.json({lead:lead({id:'30000000-0000-4000-8000-000000000002'})}),()=>Response.json({lead:lead({reference:'EK-00000002'})}),()=>Response.json({lead:lead({revision:1})})]){
  const storage=memory(),entry=seed(storage);let resumed=0;
  await withHooks(Harness,{scope,storage,transport:async(_url,options)=>{assert.equal(options.method,undefined);return response();},onResume:()=>{resumed++;return true;}},async runner=>{
   await runner.current().resume(entry);await runner.flush();assert.equal(resumed,0);assert.deepEqual(runner.current().entries,[entry]);assert.ok(runner.current().error);assert.equal(runner.current().loadingId,null);
  });
 }
});

test('a stalled lookup times out without retrying or accepting its late canonical response',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const storage=memory(),entry=seed(storage),pending=deferred();let calls=0,resumed=0,signal;
 await withHooks(Harness,{scope,storage,transport:async(_url,options)=>{calls++;signal=options.signal;return pending.promise;},onResume:()=>{resumed++;return true;}},async runner=>{
  const checking=runner.current().resume(entry);await runner.flush();t.mock.timers.tick(20_000);await checking;await runner.flush();assert.equal(signal.aborted,true);assert.equal(runner.current().loadingId,null);assert.ok(runner.current().error);
  pending.resolve(Response.json({lead:lead()}));await runner.flush();assert.equal(calls,1);assert.equal(resumed,0);assert.deepEqual(runner.current().entries,[entry]);
 });
});

test('a scope change aborts an in-flight lookup and its ignored late response cannot expose or resume the old session',async()=>{
 const storage=memory(),entry=seed(storage),pending=deferred();let signal,resumed=0;
 await withHooks(Harness,{scope,storage,transport:async(_url,options)=>{signal=options.signal;return pending.promise;},onResume:()=>{resumed++;return true;}},async runner=>{
  const checking=runner.current().resume(entry);await runner.flush();assert.equal(runner.current().loadingId,entry.request.requestId);
  await runner.update({scope:otherScope});assert.equal(signal.aborted,true);await checking;pending.resolve(Response.json({lead:lead()}));await runner.flush();assert.equal(resumed,0);assert.deepEqual(runner.current().entries,[]);assert.equal(runner.current().error,'');
 });
});

test('starting another explicit lookup aborts the former one and only the latest selection can open',async()=>{
 const storage=memory(),first=seed(storage),second=seed(storage,'EK-00000002',request({id:'30000000-0000-4000-8000-000000000002',requestId:'30000000-0000-4000-8000-000000000012'})),pending=[deferred(),deferred()],signals=[],opened=[];
 const transport=async(_url,options)=>{const index=signals.length;signals.push(options.signal);return pending[index].promise;};
 await withHooks(Harness,{scope,storage,transport,onResume:(_lead,entry)=>{opened.push(entry.reference);return true;}},async runner=>{
  const old=runner.current().resume(first);await runner.flush();const latest=runner.current().resume(second);await runner.flush();assert.equal(signals[0].aborted,true);
  pending[1].resolve(Response.json({lead:lead({id:second.request.id,reference:second.reference})}));await latest;pending[0].resolve(Response.json({lead:lead()}));await old;await runner.flush();assert.deepEqual(opened,[second.reference]);
 });
});

test('an entry changed before lookup performs no GET and one changed during lookup never opens',async()=>{
 for(const during of [false,true]){
  const storage=memory(),entry=seed(storage),pending=deferred();let calls=0,resumed=0;
  await withHooks(Harness,{scope,storage,transport:async()=>{calls++;return pending.promise;},onResume:()=>{resumed++;return true;}},async runner=>{
   const replace=()=>{assert.equal(clear(storage,scope,entry),true);seed(storage,reference,request({requestId:'30000000-0000-4000-8000-000000000099'}));};
   if(!during)replace();const checking=runner.current().resume(entry);if(during){await runner.flush();replace();pending.resolve(Response.json({lead:lead()}));}await checking;await runner.flush();assert.equal(calls,during?1:0);assert.equal(resumed,0);assert.ok(runner.current().error);assert.equal(read(storage,scope).entries.length,1);
  });
 }
});

test('an already active editor can reject restoration without losing or falsely confirming the operation',async()=>{
 const storage=memory(),entry=seed(storage);
 await withHooks(Harness,{scope,storage,transport:async()=>Response.json({lead:lead()}),onResume:()=>false},async runner=>{
  await runner.current().resume(entry);await runner.flush();assert.match(runner.current().error,/ya tiene cambios/);assert.deepEqual(runner.current().entries,[entry]);assert.equal(storage.removals.length,0);
 });
});

test('unmounting aborts an outstanding GET and prevents late callbacks or stale local writes',async()=>{
 const storage=memory(),entry=seed(storage),pending=deferred();let signal,resumed=0;
 await withHooks(Harness,{scope,storage,transport:async(_url,options)=>{signal=options.signal;return pending.promise;},onResume:()=>{resumed++;return true;}},async runner=>{
  const manager=runner.current(),checking=manager.resume(entry);runner.unmount();assert.equal(signal.aborted,true);await checking;pending.resolve(Response.json({lead:lead()}));assert.equal(manager.persist(reference,request()),null);assert.equal(resumed,0);assert.deepEqual(storage.writes,[]);
 });
});

const managerFor=entry=>({ready:true,entries:[entry],error:'',loadingId:null,persist:()=>assert.fail(),complete:()=>assert.fail(),forget:()=>assert.fail(),resume:()=>assert.fail(),retry:()=>assert.fail()});
test('the recovery panel exposes only reference, date and pending type without request payload or notes',()=>{
 const entry=seed(memory()),html=renderToStaticMarkup(React.createElement(Panel,{manager:managerFor(entry)}));assert.match(html,/EK-A1B2C3D4/);assert.match(html,/Operación por comprobar/);assert.match(html,/Recuperar operación|Retirar copia local/);assert.doesNotMatch(html,/QA_PRIVATE_RECOVERY_NOTE|930\.5|expectedRevision|requestId|30000000-0000/);assert.match(html,/min-h-11|focus-visible:outline/);
});

test('old operations remain visible with a warning instead of expiring or automatically replaying',()=>{
 const entry=seed(memory(),reference,request(),scope,Date.now()-3*86400000),html=renderToStaticMarkup(React.createElement(Panel,{manager:managerFor(entry)}));assert.match(html,/más de 24 horas/);assert.match(html,/comprobación explícita/);assert.match(html,/EK-A1B2C3D4/);
});

test('removing a local copy requires inline confirmation and cancellation performs no removal',async()=>{
 const entry=seed(memory()),removed=[],manager={...managerFor(entry),forget:value=>{removed.push(value);return true;}};
 await withHooks(Panel,{manager},async runner=>{
  const button=text=>nodes(runner.current(),node=>node.type==='button'&&node.props.children===text)[0];
  assert.deepEqual(removed,[]);button('Retirar copia local…').props.onClick();await runner.flush();assert.deepEqual(removed,[]);
  const warnings=nodes(runner.current(),node=>node.type==='p').filter(node=>typeof node.props.children==='string').map(node=>node.props.children).join(' ');assert.match(warnings,/no revierte una operación guardada/);assert.match(warnings,/ni confirma o cancela pagos/);
  button('Conservar copia').props.onClick();await runner.flush();assert.deepEqual(removed,[]);assert.equal(button('Sí, retirar copia local'),undefined);
  button('Retirar copia local…').props.onClick();await runner.flush();button('Sí, retirar copia local').props.onClick();await runner.flush();assert.deepEqual(removed,[entry]);assert.equal(button('Sí, retirar copia local'),undefined);
 });
});

test('loading disables recovery and removal actions and states that no write is being sent',()=>{
 const entry=seed(memory()),html=renderToStaticMarkup(React.createElement(Panel,{manager:{...managerFor(entry),loadingId:entry.request.requestId}}));const buttons=html.match(/<button\b[^>]*>/g);assert.equal(buttons.length,2);assert.ok(buttons.every(button=>/\sdisabled(?:=|[\s>])/.test(button)));assert.match(html,/No se está enviando un guardado/);
});

test('retry from an older session cannot cancel a lookup owned by the current session',async()=>{
 const storage=memory();seed(storage);const entry=seed(storage,reference,request(),otherScope),pending=deferred();let signal,resumed=0;
 await withHooks(Harness,{scope,storage,transport:async(_url,options)=>{signal=options.signal;return pending.promise;},onResume:()=>{resumed++;return true;}},async runner=>{
  const old=runner.current();await runner.update({scope:otherScope});const checking=runner.current().resume(entry);await runner.flush();old.retry();await runner.flush();assert.equal(signal.aborted,false);assert.equal(runner.current().loadingId,entry.request.requestId);
  pending.resolve(Response.json({lead:lead()}));await checking;await runner.flush();assert.equal(resumed,1);
 });
});

const Editor=require('../src/components/admin/CommercialLeadEditor.tsx').default;
const buttonIn=(runner,label)=>nodes(runner.current(),node=>node.type==='button'&&node.props.children===label)[0];
const fieldIn=(runner,name)=>nodes(runner.current(),node=>node.props.name===name)[0];
const submit=async runner=>{nodes(runner.current(),node=>node.type==='form')[0].props.onSubmit({preventDefault:()=>{}});await runner.flush();};
const change=async(runner,name,value)=>{fieldIn(runner,name).props.onChange({target:{value}});await runner.flush();};
const edited=async runner=>{await change(runner,'lead-status','reserved');await change(runner,'lead-revenue','930,50');await change(runner,'lead-notes','QA requested note');};
const saved=(update,patch={})=>lead({status:update.status,revenue_bs:update.revenueBs,notes:update.notes,revision:update.expectedRevision+1,...patch});
const receipt=(update,outcome='saved',patch={})=>Response.json({requestId:update.requestId,outcome,lead:saved(update,patch)});
function localRecovery(storage,extra={}){
 return{ready:true,entry:null,resumed:null,persist:(ref,update)=>{const result=put(storage,scope,ref,update);return result.ok?result.entry:null;},complete:entry=>clear(storage,scope,entry),resume:async()=>assert.fail('Editor cannot automatically restore another operation'),...extra};
}

test('the real editor persists the operation before PATCH and clears exactly the confirmed entry',async()=>{
 const storage=memory(),order=[],confirmed=[],copies=[];
 const recovery=localRecovery(storage,{persist:(ref,update)=>{order.push('persist');const result=put(storage,scope,ref,update);assert.equal(result.ok,true);copies.push(result.entry);return result.entry;},complete:entry=>{order.push('complete');assert.strictEqual(entry,copies[0]);return clear(storage,scope,entry);}});
 const transport=async(url,options)=>{order.push('PATCH');assert.equal(url,'/api/admin/commercial');assert.equal(options.method,'PATCH');const command=JSON.parse(options.body);assert.deepEqual(read(storage,scope).entries[0].request,command);return receipt(command);};
 await withHooks(Editor,{lead:lead(),recovery,transport,onSaved:value=>{order.push('saved');confirmed.push(value);}},async runner=>{
  await edited(runner);assert.deepEqual(order,[]);await submit(runner);assert.deepEqual(order,['persist','PATCH','complete','saved']);assert.equal(confirmed.length,1);assert.deepEqual(read(storage,scope).entries,[]);assert.equal(fieldIn(runner,'lead-notes').props.value,'QA requested note');
 });
});

test('failed persistence sends no PATCH and explicit fallback keeps the same prepared UUID and payload',async()=>{
 const storage=memory(),prepared=[],bodies=[];
 const recovery=localRecovery(storage,{persist:(_ref,command)=>{prepared.push(command);return null;},complete:()=>assert.fail('No durable copy was created')});
 await withHooks(Editor,{lead:lead(),recovery,transport:async(_url,options)=>{bodies.push(JSON.parse(options.body));return receipt(bodies.at(-1));},onSaved:()=>{}},async runner=>{
  await edited(runner);await submit(runner);assert.equal(prepared.length,1);assert.deepEqual(bodies,[]);assert.ok(buttonIn(runner,'Guardar sin recuperación local'));
  await submit(runner);assert.equal(prepared.length,2);assert.deepEqual(prepared[0],prepared[1]);assert.deepEqual(bodies,[]);
  buttonIn(runner,'Guardar sin recuperación local').props.onClick();await runner.flush();assert.deepEqual(bodies,[prepared[0]]);assert.equal(prepared.length,2);assert.equal(storage.writes.length,0);
 });
});

test('an uncertain editor save retains one durable entry and explicit checking replays its exact request',async()=>{
 const storage=memory(),bodies=[],completed=[];
 const recovery=localRecovery(storage,{complete:entry=>{completed.push(entry);return clear(storage,scope,entry);}});
 const transport=async(_url,options)=>{const command=JSON.parse(options.body);bodies.push(command);if(bodies.length===1)throw Error('QA lost response');return receipt(command,'replayed');};
 await withHooks(Editor,{lead:lead(),recovery,transport,onSaved:()=>{}},async runner=>{
  await edited(runner);await submit(runner);const entry=read(storage,scope).entries[0];assert.ok(entry);assert.equal(completed.length,0);assert.equal(storage.writes.length,1);assert.ok(buttonIn(runner,'Comprobar guardado'));assert.equal(nodes(runner.current(),node=>node.type==='fieldset')[0].props.disabled,true);
  buttonIn(runner,'Comprobar guardado').props.onClick();await runner.flush();assert.equal(bodies.length,2);assert.deepEqual(bodies[1],bodies[0]);assert.deepEqual(completed,[entry]);assert.deepEqual(read(storage,scope).entries,[]);assert.equal(storage.writes.length,1);
 });
});

test('a canonical conflict clears only the attempted copy and leaves the editor in explicit review',async()=>{
 const storage=memory(),completed=[],acknowledged=[];let sent;
 const recovery=localRecovery(storage,{complete:entry=>{completed.push(entry);return clear(storage,scope,entry);}});
 await withHooks(Editor,{lead:lead(),recovery,transport:async(_url,options)=>{sent=JSON.parse(options.body);return Response.json({code:'REVISION_CONFLICT',requestId:sent.requestId,lead:lead({revision:7,status:'won',notes:'QA remote version'})},{status:409});},onSaved:value=>acknowledged.push(value)},async runner=>{
  await edited(runner);await submit(runner);assert.equal(completed.length,1);assert.deepEqual(completed[0].request,sent);assert.equal(completed[0].reference,reference);assert.deepEqual(read(storage,scope).entries,[]);assert.deepEqual(acknowledged,[]);assert.ok(buttonIn(runner,'Revisar mis cambios'));assert.equal(fieldIn(runner,'lead-notes').props.value,'QA requested note');
 });
});

test('reload and explicit GET restoration keep the real editor locked until exact replay and preserve a later canonical revision',async()=>{
 const storage=memory(),mutations=[],completed=[],canonical=lead({revision:7,status:'won',revenue_bs:1200,notes:'QA newer canonical note'});
 await withHooks(Editor,{lead:lead(),recovery:localRecovery(storage),transport:async(_url,options)=>{mutations.push(JSON.parse(options.body));throw Error('QA committed response lost');},onSaved:()=>assert.fail()},async runner=>{
  await edited(runner);await submit(runner);assert.ok(buttonIn(runner,'Comprobar guardado'));
 });
 const entry=read(storage,scope).entries[0],restorations=[];let gets=0;
 await withHooks(Harness,{scope,storage,transport:async(url,options)=>{gets++;assert.match(url,/lookup\?reference=/);assert.equal(options.method,undefined);return Response.json({lead:canonical});},onResume:(value,copy)=>{restorations.push({value,copy});return true;}},async runner=>{
  assert.equal(gets,0);await runner.current().resume(entry);await runner.flush();assert.equal(gets,1);assert.equal(mutations.length,1);
 });
 assert.equal(restorations.length,1);assert.deepEqual(restorations[0].copy.request,mutations[0]);
 const recovery=localRecovery(storage,{entry,resumed:entry,complete:copy=>{completed.push(copy);return clear(storage,scope,copy);}});
 await withHooks(Editor,{lead:restorations[0].value,recovery,transport:async(_url,options)=>{const command=JSON.parse(options.body);mutations.push(command);return receipt(command,'replayed');},onSaved:()=>{}},async runner=>{
  assert.equal(mutations.length,1);assert.equal(fieldIn(runner,'lead-notes').props.value,entry.request.notes);assert.equal(fieldIn(runner,'lead-revenue').props.value,'930.5');assert.equal(nodes(runner.current(),node=>node.type==='fieldset')[0].props.disabled,true);assert.ok(buttonIn(runner,'Comprobar guardado'));
  buttonIn(runner,'Comprobar guardado').props.onClick();await runner.flush();assert.equal(mutations.length,2);assert.deepEqual(mutations[1],mutations[0]);assert.deepEqual(completed,[entry]);assert.equal(fieldIn(runner,'lead-status').props.value,'won');assert.equal(fieldIn(runner,'lead-revenue').props.value,'1200');assert.equal(fieldIn(runner,'lead-notes').props.value,canonical.notes);assert.deepEqual(read(storage,scope).entries,[]);
 });
});

test('mismatched reference, contact identity or stale canonical revision cannot restore an editor or send a PATCH',async()=>{
 for(const invalid of [{reference:'EK-00000002'},{request:request({id:'30000000-0000-4000-8000-000000000002'})},{request:request({expectedRevision:9})}]){
  const storage=memory(),entry={...seed(storage),...invalid},recovery=localRecovery(storage,{entry,resumed:entry});let writes=0;
  await withHooks(Editor,{lead:lead(),recovery,transport:async()=>{writes++;assert.fail('Invalid restoration must not write');},onSaved:()=>assert.fail()},async runner=>{
   assert.equal(buttonIn(runner,'Comprobar guardado'),undefined);assert.equal(nodes(runner.current(),node=>node.type==='fieldset')[0].props.disabled,true);await submit(runner);assert.equal(writes,0);assert.equal(fieldIn(runner,'lead-notes').props.value,lead().notes);
  });
 }
});

test('a known pending operation blocks a new editor write until its explicit recovery action',async()=>{
 const storage=memory(),entry=seed(storage),resumed=[],recovery=localRecovery(storage,{entry,resume:async value=>{resumed.push(value);}});
 await withHooks(Editor,{lead:lead(),recovery,transport:offline,onSaved:()=>assert.fail()},async runner=>{
  assert.equal(nodes(runner.current(),node=>node.type==='fieldset')[0].props.disabled,true);await submit(runner);assert.deepEqual(storage.writes,[]);assert.deepEqual(resumed,[]);
  buttonIn(runner,'Recuperar operación pendiente').props.onClick();await runner.flush();assert.deepEqual(resumed,[entry]);assert.equal(buttonIn(runner,'Comprobar guardado'),undefined);
 });
});

test('a prepared operation invalidated by a remote revision is rebuilt after explicit rebase',async()=>{
 const storage=memory(),prepared=[],sent=[];let attempts=0;
 const recovery=localRecovery(storage,{persist:(ref,command)=>{prepared.push(command);if(++attempts===1)return null;const result=put(storage,scope,ref,command);return result.ok?result.entry:null;}});
 await withHooks(Editor,{lead:lead(),recovery,transport:async(_url,options)=>{sent.push(JSON.parse(options.body));return receipt(sent.at(-1));},onSaved:()=>{}},async runner=>{
  await edited(runner);await submit(runner);assert.equal(prepared[0].expectedRevision,2);assert.deepEqual(sent,[]);
  await runner.update({lead:lead({revision:7,status:'won',revenue_bs:1200,notes:'QA newer remote'})});assert.ok(buttonIn(runner,'Revisar mis cambios'));
  buttonIn(runner,'Revisar mis cambios').props.onClick();await runner.flush();await submit(runner);assert.equal(prepared.length,2);assert.equal(prepared[1].expectedRevision,7);assert.notEqual(prepared[1].requestId,prepared[0].requestId);assert.equal(prepared[1].notes,'QA requested note');assert.deepEqual(sent,[prepared[1]]);
 });
});

test('discarding a failed prepared operation cannot send it later and the next edit receives a fresh UUID',async()=>{
 const storage=memory(),prepared=[],sent=[];let attempts=0;
 const recovery=localRecovery(storage,{persist:(ref,command)=>{prepared.push(command);if(++attempts===1)return null;const result=put(storage,scope,ref,command);return result.ok?result.entry:null;}});
 await withHooks(Editor,{lead:lead(),recovery,transport:async(_url,options)=>{sent.push(JSON.parse(options.body));return receipt(sent.at(-1));},onSaved:()=>{}},async runner=>{
  await edited(runner);await submit(runner);buttonIn(runner,'Descartar cambios…').props.onClick();await runner.flush();buttonIn(runner,'Sí, descartar cambios').props.onClick();await runner.flush();await submit(runner);assert.deepEqual(sent,[]);
  await change(runner,'lead-notes','QA entirely new edit');await submit(runner);assert.equal(prepared.length,2);assert.notEqual(prepared[1].requestId,prepared[0].requestId);assert.equal(prepared[1].notes,'QA entirely new edit');assert.equal(prepared[1].status,'contacted');assert.equal(prepared[1].revenueBs,200);assert.deepEqual(sent,[prepared[1]]);
 });
});

const Toolkit=require('../src/components/admin/SalesToolkit.tsx').default;
const salesConfig=binding=>({paymentInstructions:'',paymentConfigured:false,salesHours:'QA horario',draftScope:binding});
test('Toolkit grants a recovery binding only after valid configuration and revokes it through errors, retry and unmount',async()=>{
 const storage=memory(),bindings=[],onScopeReady=value=>bindings.push(value);let attempts=0;
 const transport=async(url,options)=>{assert.equal(url,'/api/admin/sales-config');assert.equal(options.method,undefined);return Response.json(salesConfig(++attempts===1?'invalid':scope));};
 await withHooks(Toolkit,{storage,transport,onScopeReady},async runner=>{
  assert.deepEqual(bindings,[null]);nodes(runner.current(),node=>node.type==='button'&&node.props['aria-expanded']===false)[0].props.onClick();await runner.flush();
  assert.ok(buttonIn(runner,'Reintentar configuración'));buttonIn(runner,'Reintentar configuración').props.onClick();await runner.flush();assert.equal(bindings.at(-1),scope);assert.equal(bindings.filter(value=>value===scope).length,1);
  let failureAttempts=0;const failedTransport=async()=>++failureAttempts===1?Response.json({error:'No autorizado'},{status:401}):Response.json(salesConfig(otherScope));
  await runner.update({transport:failedTransport});assert.equal(bindings.at(-1),null);assert.ok(buttonIn(runner,'Reintentar configuración'));
  buttonIn(runner,'Reintentar configuración').props.onClick();await runner.flush();assert.equal(bindings.at(-1),otherScope);assert.equal(bindings.filter(value=>value===otherScope).length,1);assert.deepEqual(storage.writes,[]);
  runner.unmount();assert.equal(bindings.at(-1),null);
 });
});

test('Toolkit configuration arriving after unmount cannot restore a revoked recovery binding',async()=>{
 const storage=memory(),bindings=[],pending=deferred();let signal;
 await withHooks(Toolkit,{storage,onScopeReady:value=>bindings.push(value),transport:async(_url,options)=>{signal=options.signal;return pending.promise;}},async runner=>{
  assert.deepEqual(bindings,[null]);runner.unmount();assert.equal(signal.aborted,true);assert.equal(bindings.at(-1),null);
  pending.resolve(Response.json(salesConfig(scope)));await runner.flush();assert.ok(bindings.every(value=>value===null));assert.deepEqual(storage.writes,[]);
 });
});

test('fictional workspace cleanup removes its journal and quote while preserving other session scopes',async()=>{
 const Workbench=require('../src/app/dev/services/commercial-dashboard/workbench.tsx').default,storage=memory(),qaScope='e'.repeat(64),outsideScope='f'.repeat(64);
 seed(storage,reference,request(),qaScope);const outside=seed(storage,reference,request(),outsideScope);
 const {salesDraftKey}=require('../src/lib/sales-draft.ts');storage.values.set(salesDraftKey(qaScope),'QA quote');storage.values.set(salesDraftKey(outsideScope),'Other session quote');
 await withHooks(Workbench,{storage},async runner=>{
  assert.equal(read(storage,qaScope).entries.length,1);buttonIn(runner,'Limpiar QA').props.onClick();await runner.flush();
  assert.deepEqual(read(storage,qaScope).entries,[]);assert.deepEqual(read(storage,outsideScope).entries,[outside]);assert.equal(storage.values.has(salesDraftKey(qaScope)),false);assert.equal(storage.values.get(salesDraftKey(outsideScope)),'Other session quote');
  assert.ok(storage.removals.every(key=>key.endsWith(qaScope)));assert.ok(nodes(runner.current(),node=>node.type==='p'&&typeof node.props.children==='string'&&node.props.children.includes('ficticios retirados')).length);
 });
});
