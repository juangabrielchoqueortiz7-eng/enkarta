// Local recovery effects with fictional records. No browser or real network.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {default:Panel,useCommercialDraftRecovery:useRecovery}=require('../src/components/admin/CommercialDraftRecovery.tsx');
const {createCommercialDraftEntry:create,readCommercialDrafts:read,putCommercialDraft:put,clearCommercialDraft:clear}=require('../src/lib/commercial-drafts.ts');
const scope='a'.repeat(64),otherScope='b'.repeat(64),reference='EK-A1B2C3D4',DAY=86400000;
const lead=(patch={})=>({id:'30000000-0000-4000-8000-000000000001',reference,status:'contacted',package_key:'premium',design:'Lunaria',event_category:'Boda',placement:'qa',utm_source:'QA',utm_medium:'',utm_campaign:'',referrer_host:'',revenue_bs:200,notes:'QA_BASE_PRIVATE_NOTE',revision:2,created_at:'2001-01-01T12:00:00Z',updated_at:'2026-10-19T12:00:00Z',...patch});
const draft=(patch={})=>({status:'reserved',revenue:'930,',notes:'QA_DRAFT_PRIVATE_NOTE',...patch});
const memory=()=>{const values=new Map(),reads=[],writes=[],removals=[];return{values,reads,writes,removals,getItem:key=>{reads.push(key);return values.get(key)??null;},setItem:(key,value)=>{writes.push(key);values.set(key,value);},removeItem:key=>{removals.push(key);values.delete(key);}};};
const seed=(storage,base=lead(),edit=draft(),binding=scope,when=Date.now())=>{const entry=create(base,edit,when);assert.ok(entry);assert.equal(put(storage,binding,entry,null),true);storage.reads.length=0;storage.writes.length=0;storage.removals.length=0;return entry;};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];

// Dependencies and component effects run in memory. DOM refs are not populated;
// these regressions do not claim layout, real keyboard focus or device acceptance.
async function withHooks(Component,initialProps,scenario){
 const names=['useState','useReducer','useRef','useEffect','useMemo','useCallback','useId'],original=Object.fromEntries(names.map(name=>[name,React[name]])),oldWindow=global.window,oldDocument=global.document;
 const slots=[],snapshots=[];let cursor=0,dirty=true,value,props=initialProps,effects=[],unmounted=false;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((item,index)=>Object.is(item,b[index]));
 React.useState=initial=>{const index=cursor++;if(!(index in slots))slots[index]={value:typeof initial==='function'?initial():initial};const slot=slots[index];return[slot.value,next=>{next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}}];};
 React.useReducer=(reduce,initial,init)=>{const[state,setState]=React.useState(()=>init?init(initial):initial);return[state,action=>setState(previous=>reduce(previous,action))];};
 React.useRef=initial=>{const index=cursor++;return slots[index]??(slots[index]={current:initial});};
 React.useId=()=>{const index=cursor++;return slots[index]??(slots[index]=`:qa-draft-${index}:`);};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:compute(),deps};return slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const index=cursor++,before=slots[index];if(!before||!same(before.deps,deps)){const slot={deps,cleanup:before?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 global.window={sessionStorage:initialProps.storage??memory(),addEventListener:()=>{},removeEventListener:()=>{},setTimeout,clearTimeout};
 global.document={getElementById:()=>null};
 const flush=async()=>{for(let round=0;round<25;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];value=Component(props);snapshots.push(value);for(const effect of effects)effect();}await new Promise(resolve=>setImmediate(resolve));if(!dirty||unmounted)return value;}throw Error('Draft effects did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const runner={flush,current:()=>value,snapshots,unmount,update:async patch=>{props={...props,...patch};dirty=true;return flush();}};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of names)React[name]=original[name];if(oldWindow===undefined)delete global.window;else global.window=oldWindow;if(oldDocument===undefined)delete global.document;else global.document=oldDocument;}
}
const Harness=props=>useRecovery(props.scope,props.transport,props.onRestore,props.storage);
const offline=async()=>assert.fail('Local recovery must not make a network request without an explicit restore');

test('unbound and malformed sessions cannot read, persist, restore or reveal local drafts',async()=>{
 for(const binding of [null,'','A'.repeat(64),'invalid']){
  const storage=memory();await withHooks(Harness,{scope:binding,storage,transport:offline,onRestore:()=>assert.fail()},async runner=>{
   const manager=runner.current();assert.equal(manager.ready,false);assert.deepEqual(manager.entries,[]);assert.deepEqual(manager.expired,[]);assert.equal(manager.persist(lead(),draft(),null),null);assert.deepEqual(storage.reads,[]);assert.deepEqual(storage.writes,[]);
  });
 }
});

test('loading current and expired drafts never rewrites, refreshes their age, clears them or sends a request',async()=>{
 const storage=memory(),current=seed(storage),expired=seed(storage,lead({id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002'}),draft(),scope,Date.now()-25*DAY/24);
 await withHooks(Harness,{scope,storage,transport:offline,onRestore:()=>assert.fail()},async runner=>{
  assert.equal(runner.current().ready,true);assert.deepEqual(runner.current().entries,[current]);assert.deepEqual(runner.current().expired,[expired]);runner.current().retry();await runner.flush();assert.equal(runner.current().expired[0].savedAt,expired.savedAt);assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);
 });
});

test('session changes hide the old entries before effects and reject every stale mutation callback',async()=>{
 const storage=memory(),first=seed(storage),second=seed(storage,lead(),draft({notes:'QA other session'}),otherScope);
 await withHooks(Harness,{scope,storage,transport:offline,onRestore:()=>assert.fail()},async runner=>{
  const old=runner.current(),index=runner.snapshots.length;await runner.update({scope:otherScope});assert.deepEqual(runner.snapshots[index].entries,[]);assert.equal(runner.snapshots[index].ready,false);assert.deepEqual(runner.current().entries,[second]);assert.equal(old.persist(lead(),draft(),first),null);assert.equal(old.clear(first),false);assert.deepEqual(storage.writes,[]);
  await runner.update({scope:null});assert.deepEqual(runner.current().entries,[]);assert.deepEqual(runner.current().expired,[]);
 });
});

test('persist keeps raw incomplete decimal text and uses compare-and-swap without losing other drafts',async()=>{
 const storage=memory(),other=seed(storage,lead({id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002'}));
 await withHooks(Harness,{scope,storage,transport:offline,onRestore:()=>assert.fail()},async runner=>{
  const first=runner.current().persist(lead(),draft(),null);assert.ok(first);assert.equal(first.draft.revenue,'930,');await runner.flush();assert.equal(runner.current().entries.length,2);
  const next=runner.current().persist(lead(),draft({revenue:'930,50',notes:'QA revised draft'}),first);assert.ok(next);await runner.flush();assert.equal(next.draft.revenue,'930,50');assert.ok(runner.current().entries.some(entry=>entry.id===other.id));assert.equal(storage.writes.length,2);
 });
});

test('stale update and removal tokens cannot replace or erase a newer local draft',async()=>{
 const storage=memory(),first=seed(storage),replacement=create(lead(),draft({notes:'QA newer local draft'}));assert.ok(replacement);
 await withHooks(Harness,{scope,storage,transport:offline,onRestore:()=>assert.fail()},async runner=>{
  assert.equal(put(storage,scope,replacement,first),true);storage.writes.length=0;
  assert.equal(runner.current().persist(lead(),draft({notes:'QA stale overwrite'}),first),null);await runner.flush();assert.deepEqual(runner.current().entries,[replacement]);assert.ok(runner.current().error);
  assert.equal(runner.current().clear(first),false);await runner.flush();assert.deepEqual(runner.current().entries,[replacement]);assert.deepEqual(storage.writes,[]);
 });
});

test('explicit clear can retire one expired draft while preserving current drafts',async()=>{
 const storage=memory(),current=seed(storage),expired=seed(storage,lead({id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002'}),draft(),scope,Date.now()-2*DAY);
 await withHooks(Harness,{scope,storage,transport:offline,onRestore:()=>assert.fail()},async runner=>{
  assert.equal(runner.current().forget(expired),true);await runner.flush();assert.deepEqual(runner.current().expired,[]);assert.deepEqual(runner.current().entries,[current]);
 });
});

test('unavailable or invalid local journals require an explicit retry and are never overwritten on load',async()=>{
 for(const inaccessible of [false,true]){
  const storage=memory();seed(storage);const key=[...storage.values.keys()][0];if(inaccessible)storage.getItem=()=>{throw Error('QA denied');};else storage.values.set(key,'{broken');
  await withHooks(Harness,{scope,storage,transport:offline,onRestore:()=>assert.fail()},async runner=>{
   assert.equal(runner.current().ready,false);assert.ok(runner.current().error);assert.equal(runner.current().persist(lead(),draft(),null),null);assert.deepEqual(storage.writes,[]);
   storage.getItem=key=>storage.values.get(key)??null;storage.values.clear();runner.current().retry();await runner.flush();assert.equal(runner.current().ready,true);assert.equal(runner.current().error,'');
  });
 }
});

test('storage quota and removal failures retain existing copies and report that local persistence failed',async()=>{
 const storage=memory(),entry=seed(storage);storage.setItem=()=>{throw Error('QA quota');};storage.removeItem=()=>{throw Error('QA removal');};
 await withHooks(Harness,{scope,storage,transport:offline,onRestore:()=>assert.fail()},async runner=>{
  assert.equal(runner.current().persist(lead(),draft({notes:'QA new note'}),entry),null);await runner.flush();assert.deepEqual(runner.current().entries,[entry]);assert.ok(runner.current().error);
  assert.equal(runner.current().clear(entry),false);await runner.flush();assert.deepEqual(runner.current().entries,[entry]);assert.ok(runner.current().error);
 });
});

test('explicit restore performs one private GET, retains the original draft and never saves it to the server',async()=>{
 const storage=memory(),entry=seed(storage),calls=[],restored=[];
 await withHooks(Harness,{scope,storage,transport:async(url,options)=>{calls.push({url,options});assert.equal(options.method,undefined);return Response.json({lead:lead()});},onRestore:(value,copy)=>{restored.push({value,copy});return true;}},async runner=>{
  assert.deepEqual(calls,[]);await runner.current().restore(entry);await runner.flush();assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/admin/commercial/lookup?reference='+reference);assert.equal(calls[0].options.cache,'no-store');assert.deepEqual(restored,[{value:lead(),copy:entry}]);assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);assert.equal(read(storage,scope).entries[0].savedAt,entry.savedAt);
 });
});

test('a newer canonical revision is supplied for conflict review while the old baseline and raw draft remain exact',async()=>{
 const storage=memory(),entry=seed(storage),canonical=lead({revision:7,status:'won',revenue_bs:1500,notes:'QA remote revised note'}),restored=[];
 await withHooks(Harness,{scope,storage,transport:async()=>Response.json({lead:canonical}),onRestore:(value,copy)=>{restored.push({value,copy});return true;}},async runner=>{
  await runner.current().restore(entry);await runner.flush();assert.deepEqual(restored,[{value:canonical,copy:entry}]);assert.equal(restored[0].copy.base.revision,2);assert.equal(restored[0].copy.draft.revenue,'930,');assert.deepEqual(storage.writes,[]);
 });
});

test('inconsistent same-revision fields, missing contacts, borrowed identities and older versions never restore',async()=>{
 for(const reply of [()=>Response.json({lead:lead({status:'won'})}),()=>Response.json({lead:lead({revenue_bs:null})}),()=>Response.json({lead:lead({notes:'QA changed without revision'})}),()=>Response.json({lead:null}),()=>Response.json({code:'NOT_FOUND'},{status:404}),()=>Response.json({lead:lead({id:'30000000-0000-4000-8000-000000000002'})}),()=>Response.json({lead:lead({reference:'EK-00000002'})}),()=>Response.json({lead:lead({revision:1})})]){
  const storage=memory(),entry=seed(storage);let restored=0;
  await withHooks(Harness,{scope,storage,transport:async()=>reply(),onRestore:()=>{restored++;return true;}},async runner=>{
   await runner.current().restore(entry);await runner.flush();assert.equal(restored,0);assert.deepEqual(runner.current().entries,[entry]);assert.ok(runner.current().error);assert.equal(runner.current().loadingId,null);assert.deepEqual(storage.writes,[]);
  });
 }
});

test('expired drafts cannot trigger lookup or restoration and remain available only for explicit local removal',async()=>{
 const storage=memory(),entry=seed(storage,lead(),draft(),scope,Date.now()-2*DAY);
 await withHooks(Harness,{scope,storage,transport:offline,onRestore:()=>assert.fail()},async runner=>{
  assert.deepEqual(runner.current().entries,[]);await runner.current().restore(entry);await runner.flush();assert.deepEqual(runner.current().expired,[entry]);assert.ok(runner.current().error);assert.deepEqual(storage.removals,[]);assert.deepEqual(storage.writes,[]);
 });
});

test('a draft expiring during lookup cannot be applied and its original age remains unchanged',async t=>{
 const started=Date.now();let now=started;t.mock.method(Date,'now',()=>now);
 const storage=memory(),entry=seed(storage,lead(),draft(),scope,started-DAY+100),pending=deferred();let restored=0;
 await withHooks(Harness,{scope,storage,transport:async()=>pending.promise,onRestore:()=>{restored++;return true;}},async runner=>{
  const checking=runner.current().restore(entry);await runner.flush();now+=200;pending.resolve(Response.json({lead:lead()}));await checking;await runner.flush();assert.equal(restored,0);assert.deepEqual(runner.current().expired,[entry]);assert.equal(runner.current().entries.length,0);assert.deepEqual(storage.writes,[]);
 });
});

test('a local draft changed before or during lookup cannot overwrite an active editor',async()=>{
 for(const during of [false,true]){
  const storage=memory(),entry=seed(storage),pending=deferred();let calls=0,restored=0;
  await withHooks(Harness,{scope,storage,transport:async()=>{calls++;return pending.promise;},onRestore:()=>{restored++;return true;}},async runner=>{
   const replace=()=>{const replacement=create(lead(),draft({notes:'QA next local draft'}));assert.equal(put(storage,scope,replacement,entry),true);};
   if(!during)replace();const checking=runner.current().restore(entry);if(during){await runner.flush();replace();pending.resolve(Response.json({lead:lead()}));}await checking;await runner.flush();assert.equal(calls,during?1:0);assert.equal(restored,0);assert.ok(runner.current().error);assert.equal(runner.current().entries[0].draft.notes,'QA next local draft');
  });
 }
});

test('a session change aborts restoration and stale retry callbacks cannot cancel the new session lookup',async()=>{
 const storage=memory(),entry=seed(storage),second=seed(storage,lead(),draft({notes:'QA next session'}),otherScope),pending=[deferred(),deferred()],signals=[],restored=[];
 await withHooks(Harness,{scope,storage,transport:async(_url,options)=>{const index=signals.length;signals.push(options.signal);return pending[index].promise;},onRestore:(_lead,copy)=>{restored.push(copy);return true;}},async runner=>{
  const old=runner.current(),first=old.restore(entry);await runner.flush();await runner.update({scope:otherScope});assert.equal(signals[0].aborted,true);await first;
  const checking=runner.current().restore(second);await runner.flush();old.retry();assert.equal(signals[1].aborted,false);pending[1].resolve(Response.json({lead:lead()}));await checking;pending[0].resolve(Response.json({lead:lead()}));await runner.flush();assert.deepEqual(restored,[second]);assert.deepEqual(runner.current().entries,[second]);
 });
});

test('a stalled canonical lookup times out without auto retry and ignores its late response',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const storage=memory(),entry=seed(storage),pending=deferred();let calls=0,restored=0;
 await withHooks(Harness,{scope,storage,transport:async()=>{calls++;return pending.promise;},onRestore:()=>{restored++;return true;}},async runner=>{
  const checking=runner.current().restore(entry);await runner.flush();t.mock.timers.tick(20000);await checking;await runner.flush();assert.equal(runner.current().loadingId,null);assert.ok(runner.current().error);pending.resolve(Response.json({lead:lead()}));await runner.flush();assert.equal(calls,1);assert.equal(restored,0);assert.deepEqual(runner.current().entries,[entry]);
 });
});

test('unmount aborts lookup and cannot permit late callbacks or stale storage writes',async()=>{
 const storage=memory(),entry=seed(storage),pending=deferred();let signal,restored=0;
 await withHooks(Harness,{scope,storage,transport:async(_url,options)=>{signal=options.signal;return pending.promise;},onRestore:()=>{restored++;return true;}},async runner=>{
  const old=runner.current(),checking=old.restore(entry);runner.unmount();assert.equal(signal.aborted,true);await checking;pending.resolve(Response.json({lead:lead()}));assert.equal(old.persist(lead(),draft(),entry),null);assert.equal(old.clear(entry),false);old.retry();assert.equal(restored,0);assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);
 });
});

test('the parent can reject restoration for active edits or a pending operation without losing the draft',async()=>{
 const storage=memory(),entry=seed(storage);
 await withHooks(Harness,{scope,storage,transport:async()=>Response.json({lead:lead()}),onRestore:()=>false},async runner=>{
  await runner.current().restore(entry);await runner.flush();assert.match(runner.current().error,/cambios o una operación pendiente/);assert.deepEqual(runner.current().entries,[entry]);assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);
 });
});

const managerFor=entry=>({ready:true,entries:[entry],expired:[],error:'',loadingId:null,persist:()=>assert.fail(),clear:()=>assert.fail(),forget:()=>assert.fail(),restore:()=>assert.fail(),retry:()=>assert.fail()});
test('the draft panel lists only reference, date and local type without exposing notes, revenue or operational baseline',()=>{
 const entry=seed(memory()),html=renderToStaticMarkup(React.createElement(Panel,{manager:managerFor(entry)}));assert.match(html,/Cambios sin enviar|EK-A1B2C3D4|Borrador local/);assert.match(html,/no guarda cambios en el servidor ni procesa pagos/);assert.doesNotMatch(html,/QA_BASE_PRIVATE_NOTE|QA_DRAFT_PRIVATE_NOTE|930,|revenueBs|revision|30000000-0000/);assert.match(html,/min-h-11|focus-visible:outline/);
});

test('expired rows offer only local discard and pending operations disable draft restoration with clear priority text',()=>{
 const entry=seed(memory()),manager=managerFor(entry),expired=renderToStaticMarkup(React.createElement(Panel,{manager:{...manager,entries:[],expired:[entry]}}));assert.match(expired,/Borrador vencido|24 horas/);assert.doesNotMatch(expired,/Recuperar cambios/);assert.match(expired,/Descartar borrador local/);
 const waiting=renderToStaticMarkup(React.createElement(Panel,{manager,pendingIds:new Set([entry.id])})),restore=waiting.match(/<button\b[^>]*>Recuperar cambios<\/button>/)?.[0];assert.ok(restore);assert.match(restore,/\sdisabled(?:=|[\s>])/);assert.match(waiting,/Primero comprueba la operación pendiente/);
});

test('local draft discard requires inline confirmation and preserves the copy on cancellation or failed CAS',async()=>{
 const entry=seed(memory()),discarded=[];let succeeds=false;const manager={...managerFor(entry),forget:value=>{discarded.push(value);return succeeds;}};
 await withHooks(Panel,{manager},async runner=>{
  const button=text=>nodes(runner.current(),node=>node.type==='button'&&node.props.children===text)[0];assert.deepEqual(discarded,[]);button('Descartar borrador local…').props.onClick();await runner.flush();assert.deepEqual(discarded,[]);
  const notice=nodes(runner.current(),node=>node.type==='p'&&typeof node.props.children==='string').map(node=>node.props.children).join(' ');assert.match(notice,/No se modifica el contacto/);assert.match(notice,/ninguna operación enviada ni los pagos/);
  button('Conservar borrador').props.onClick();await runner.flush();assert.deepEqual(discarded,[]);assert.equal(button('Sí, descartar borrador local'),undefined);
  button('Descartar borrador local…').props.onClick();await runner.flush();button('Sí, descartar borrador local').props.onClick();await runner.flush();assert.deepEqual(discarded,[entry]);assert.ok(button('Sí, descartar borrador local'));
  succeeds=true;button('Sí, descartar borrador local').props.onClick();await runner.flush();assert.equal(button('Sí, descartar borrador local'),undefined);
 });
});

test('loading disables draft actions and read failures retain an explicit accessible retry',()=>{
 const entry=seed(memory()),html=renderToStaticMarkup(React.createElement(Panel,{manager:{...managerFor(entry),loadingId:entry.id}}));assert.ok(html.match(/<button\b[^>]*>/g).every(button=>/\sdisabled(?:=|[\s>])/.test(button)));assert.match(html,/No se está enviando un guardado/);
 const error=renderToStaticMarkup(React.createElement(Panel,{manager:{...managerFor(entry),ready:false,entries:[],error:'QA no se pudo leer'}}));assert.match(error,/role="alert"/);assert.match(error,/Volver a leer borradores/);
});

const Editor=require('../src/components/admin/CommercialLeadEditor.tsx').default;
const pending=require('../src/lib/commercial-pending.ts');
const {prepareCommercialDraftUpdate}=require('../src/lib/commercial-update.ts');
const buttonIn=(runner,label)=>nodes(runner.current(),node=>node.type==='button'&&node.props.children===label)[0];
const fieldIn=(runner,name)=>nodes(runner.current(),node=>node.props.name===name)[0];
const messages=runner=>nodes(runner.current(),node=>node.type==='p'&&typeof node.props.children==='string').map(node=>node.props.children).join(' ');
const submit=async runner=>{nodes(runner.current(),node=>node.type==='form')[0].props.onSubmit({preventDefault:()=>{}});await runner.flush();};
const change=async(runner,name,value)=>{fieldIn(runner,name).props.onChange({target:{value}});await runner.flush();};
function localDraftRecovery(storage,extra={}){
 return{scope,ready:true,get entry(){const result=read(storage,scope);return result.kind==='ready'?[...result.entries,...result.expired].find(entry=>entry.id===lead().id)??null:null;},restored:null,persist:(base,edit,expected)=>{const entry=create(base,edit);return entry&&put(storage,scope,entry,expected)?entry:null;},clear:entry=>clear(storage,scope,entry),restore:async()=>assert.fail('Draft restore must be an explicit read-only parent action'),...extra};
}
function localPendingRecovery(storage,extra={}){
 return{ready:true,get entry(){const result=pending.readCommercialPending(storage,scope);return result.kind==='ready'?result.entries.find(entry=>entry.request.id===lead().id)??null:null;},resumed:null,persist:(ref,command)=>{const result=pending.putCommercialPending(storage,scope,ref,command);return result.ok?result.entry:null;},complete:entry=>pending.clearCommercialPending(storage,scope,entry),resume:async()=>assert.fail('Pending recovery cannot happen automatically'),...extra};
}
const receipt=(command,outcome='saved')=>Response.json({requestId:command.requestId,outcome,lead:lead({status:command.status,revenue_bs:command.revenueBs,notes:command.notes,revision:command.expectedRevision+1})});
const completedEdits=async runner=>{await change(runner,'lead-status','reserved');await change(runner,'lead-revenue','930,50');await change(runner,'lead-notes','QA edited locally');};

test('the real editor preserves raw incomplete text locally without creating a server request',async()=>{
 const storage=memory(),draftRecovery=localDraftRecovery(storage);
 await withHooks(Editor,{lead:lead(),draftRecovery,transport:offline,onSaved:()=>assert.fail()},async runner=>{
  assert.deepEqual(storage.writes,[]);await change(runner,'lead-revenue','930,');assert.equal(fieldIn(runner,'lead-revenue').props.value,'930,');assert.equal(read(storage,scope).entries[0].draft.revenue,'930,');assert.match(messages(runner),/Borrador conservado/);
  await submit(runner);assert.match(messages(runner),/Escribe un importe/);assert.equal(read(storage,scope).entries[0].draft.revenue,'930,');assert.equal(pending.readCommercialPending(storage,scope).entries.length,0);
 });
});

test('an existing draft locks a remounted editor and only explicit read-only restoration applies its exact fields',async()=>{
 const storage=memory(),entry=seed(storage),draftRecovery=localDraftRecovery(storage,{entry}),restored=[];
 await withHooks(Harness,{scope,storage,transport:async(_url,options)=>{assert.equal(options.method,undefined);return Response.json({lead:lead()});},onRestore:(value,copy)=>{restored.push({value,copy});return true;}},async runner=>{
  assert.deepEqual(restored,[]);await runner.current().restore(entry);await runner.flush();
 });
 await withHooks(Editor,{lead:lead(),draftRecovery,transport:offline,onSaved:()=>assert.fail()},async runner=>{
  assert.equal(nodes(runner.current(),node=>node.type==='fieldset')[0].props.disabled,true);assert.equal(fieldIn(runner,'lead-notes').props.value,lead().notes);
  await change(runner,'lead-notes','QA blocked automatic overwrite');assert.equal(fieldIn(runner,'lead-notes').props.value,lead().notes);await submit(runner);assert.deepEqual(storage.writes,[]);
  await runner.update({draftRecovery:{...draftRecovery,restored:restored[0].copy}});assert.equal(fieldIn(runner,'lead-revenue').props.value,'930,');assert.equal(fieldIn(runner,'lead-notes').props.value,entry.draft.notes);assert.equal(nodes(runner.current(),node=>node.type==='fieldset')[0].props.disabled,false);assert.deepEqual(storage.writes,[]);
 });
});

test('restored conflicts rebase only edited fields and persist the reviewed draft against the newer baseline',async()=>{
 const storage=memory(),entry=seed(storage,lead(),draft({status:'contacted',revenue:'200',notes:'QA my pending note'})),canonical=lead({revision:7,status:'won',revenue_bs:1200,notes:'QA remote note'});
 const draftRecovery=localDraftRecovery(storage,{entry,restored:entry});
 await withHooks(Editor,{lead:canonical,draftRecovery,transport:offline,onSaved:()=>assert.fail()},async runner=>{
  assert.ok(buttonIn(runner,'Revisar mis cambios'));assert.equal(fieldIn(runner,'lead-notes').props.value,entry.draft.notes);assert.deepEqual(storage.writes,[]);
  buttonIn(runner,'Revisar mis cambios').props.onClick();await runner.flush();assert.equal(fieldIn(runner,'lead-status').props.value,'won');assert.equal(fieldIn(runner,'lead-revenue').props.value,'1200');assert.equal(fieldIn(runner,'lead-notes').props.value,entry.draft.notes);
  const current=read(storage,scope).entries[0];assert.equal(current.base.revision,7);assert.equal(current.base.notes,canonical.notes);assert.equal(current.draft.notes,entry.draft.notes);assert.equal(current.draft.status,'won');assert.equal(current.draft.revenue,'1200');
 });
});

test('failed draft discard CAS retains the edited values and a different newer local copy',async()=>{
 const storage=memory(),draftRecovery=localDraftRecovery(storage);
 await withHooks(Editor,{lead:lead(),draftRecovery,transport:offline,onSaved:()=>assert.fail()},async runner=>{
  await change(runner,'lead-notes','QA current editor note');const old=read(storage,scope).entries[0],newer=create(lead(),draft({notes:'QA another local copy'}));assert.equal(put(storage,scope,newer,old),true);storage.writes.length=0;await runner.update({draftRecovery:{...draftRecovery,entry:old}});
  buttonIn(runner,'Descartar cambios…').props.onClick();await runner.flush();buttonIn(runner,'Sí, descartar cambios').props.onClick();await runner.flush();
  assert.equal(fieldIn(runner,'lead-notes').props.value,'QA current editor note');assert.deepEqual(read(storage,scope).entries,[newer]);assert.match(messages(runner),/No se pudo retirar tu copia local/);assert.deepEqual(storage.writes,[]);
 });
});

test('failed local draft writes retain RAM edits and recover on a later edit without sending them',async()=>{
 const storage=memory(),normalWrite=storage.setItem;storage.setItem=()=>{throw Error('QA quota');};
 await withHooks(Editor,{lead:lead(),draftRecovery:localDraftRecovery(storage),transport:offline,onSaved:()=>assert.fail()},async runner=>{
  await change(runner,'lead-revenue','930,');assert.equal(fieldIn(runner,'lead-revenue').props.value,'930,');assert.deepEqual(read(storage,scope).entries,[]);assert.match(messages(runner),/solo en memoria/);
  storage.setItem=normalWrite;await change(runner,'lead-notes','QA retained RAM note');assert.equal(read(storage,scope).entries[0].draft.revenue,'930,');assert.equal(read(storage,scope).entries[0].draft.notes,'QA retained RAM note');assert.match(messages(runner),/Borrador conservado/);
 });
});

test('promoting a valid draft journals the pending operation then clears the exact draft before PATCH',async()=>{
 const storage=memory(),order=[],removed=[];
 const draftRecovery=localDraftRecovery(storage,{clear:entry=>{order.push('draft.clear');removed.push(entry);return clear(storage,scope,entry);}});
 const recovery=localPendingRecovery(storage,{persist:(ref,command)=>{order.push('pending.persist');const result=pending.putCommercialPending(storage,scope,ref,command);return result.ok?result.entry:null;},complete:entry=>{order.push('pending.complete');return pending.clearCommercialPending(storage,scope,entry);}});
 await withHooks(Editor,{lead:lead(),draftRecovery,recovery,transport:async(_url,options)=>{order.push('PATCH');const command=JSON.parse(options.body);assert.deepEqual(read(storage,scope).entries,[]);assert.deepEqual(pending.readCommercialPending(storage,scope).entries[0].request,command);return receipt(command);},onSaved:()=>order.push('saved')},async runner=>{
  await completedEdits(runner);const entry=read(storage,scope).entries[0];assert.deepEqual(order,[]);await submit(runner);assert.deepEqual(order,['pending.persist','draft.clear','PATCH','pending.complete','saved']);assert.deepEqual(removed,[entry]);assert.deepEqual(read(storage,scope).entries,[]);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[]);
 });
});

test('failure to journal the operation or retire the draft stops promotion before any PATCH',async()=>{
 for(const failing of ['pending','draft.clear','draft.notready']){
  const storage=memory(),order=[];let draftRecovery=localDraftRecovery(storage,{clear:entry=>{order.push('draft.clear');return failing==='draft.clear'?false:clear(storage,scope,entry);}});
  const recovery=localPendingRecovery(storage,{persist:(ref,command)=>{order.push('pending.persist');if(failing==='pending')return null;const result=pending.putCommercialPending(storage,scope,ref,command);return result.ok?result.entry:null;}});
  await withHooks(Editor,{lead:lead(),draftRecovery,recovery,transport:offline,onSaved:()=>assert.fail()},async runner=>{
   await completedEdits(runner);const entry=read(storage,scope).entries[0];if(failing==='draft.notready'){draftRecovery={...draftRecovery,ready:false};await runner.update({draftRecovery});}await submit(runner);
   assert.deepEqual(read(storage,scope).entries,[entry]);assert.match(messages(runner),/No se pudo/);assert.equal(pending.readCommercialPending(storage,scope).entries.length,failing==='pending'?0:1);assert.deepEqual(order,failing==='draft.clear'?['pending.persist','draft.clear']:['pending.persist']);
  });
 }
});

test('a crash between journals recovers the exact pending request and retires only its matching unsent draft',async()=>{
 const storage=memory(),entry=seed(storage,lead(),draft({revenue:'930,50',notes:'QA promoted note'})),command=prepareCommercialDraftUpdate(lead(),entry.draft,'30000000-0000-4000-8000-000000000011');assert.ok(command);
 const result=pending.putCommercialPending(storage,scope,reference,command);assert.equal(result.ok,true);const copy=result.entry,order=[],sent=[];
 const draftRecovery=localDraftRecovery(storage,{entry,clear:value=>{order.push('draft.clear');assert.deepEqual(value,entry);return clear(storage,scope,value);}}),recovery=localPendingRecovery(storage,{entry:copy,resumed:copy});
 await withHooks(Editor,{lead:lead({revision:7,status:'won',revenue_bs:1500,notes:'QA later canonical'}),draftRecovery,recovery,transport:async(_url,options)=>{order.push('PATCH');sent.push(JSON.parse(options.body));return receipt(command,'replayed');},onSaved:()=>{}},async runner=>{
  assert.deepEqual(order,[]);assert.ok(buttonIn(runner,'Comprobar guardado'));assert.equal(nodes(runner.current(),node=>node.type==='fieldset')[0].props.disabled,true);buttonIn(runner,'Comprobar guardado').props.onClick();await runner.flush();
  assert.deepEqual(order,['draft.clear','PATCH']);assert.deepEqual(sent,[command]);assert.deepEqual(read(storage,scope).entries,[]);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[]);assert.equal(fieldIn(runner,'lead-notes').props.value,'QA later canonical');
 });
});

test('mismatched draft and pending payloads remain separate and block replay until explicitly reviewed',async()=>{
 const storage=memory(),entry=seed(storage,lead(),draft({revenue:'930,50',notes:'QA other unsent note'})),command=prepareCommercialDraftUpdate(lead(),{...entry.draft,notes:'QA originally sent note'},'30000000-0000-4000-8000-000000000011');
 const result=pending.putCommercialPending(storage,scope,reference,command);assert.equal(result.ok,true);const copy=result.entry;
 await withHooks(Editor,{lead:lead(),draftRecovery:localDraftRecovery(storage,{entry}),recovery:localPendingRecovery(storage,{entry:copy,resumed:copy}),transport:offline,onSaved:()=>assert.fail()},async runner=>{
  buttonIn(runner,'Comprobar guardado').props.onClick();await runner.flush();assert.match(messages(runner),/Hay otro borrador local/);assert.deepEqual(read(storage,scope).entries,[entry]);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[copy]);
 });
});

test('an unresolved server operation takes priority over restoring a competing local draft',async()=>{
 const storage=memory(),entry=seed(storage),command=prepareCommercialDraftUpdate(lead(),draft({revenue:'930,50'}),'30000000-0000-4000-8000-000000000011'),result=pending.putCommercialPending(storage,scope,reference,command);assert.equal(result.ok,true);
 await withHooks(Editor,{lead:lead(),draftRecovery:localDraftRecovery(storage,{entry,restored:entry}),recovery:localPendingRecovery(storage,{entry:result.entry}),transport:offline,onSaved:()=>assert.fail()},async runner=>{
  assert.equal(fieldIn(runner,'lead-notes').props.value,lead().notes);assert.ok(buttonIn(runner,'Recuperar operación pendiente'));assert.equal(nodes(runner.current(),node=>node.type==='fieldset')[0].props.disabled,true);
  const prior=storage.writes.length;await change(runner,'lead-notes','QA blocked overwrite');await submit(runner);assert.equal(storage.writes.length,prior);assert.equal(fieldIn(runner,'lead-notes').props.value,lead().notes);
 });
});

test('clean read-only rendering and canonical refresh create no draft or pending mutation',async()=>{
 const storage=memory();await withHooks(Editor,{lead:lead(),draftRecovery:localDraftRecovery(storage),recovery:localPendingRecovery(storage),transport:offline,onSaved:()=>assert.fail()},async runner=>{
  await submit(runner);await runner.update({lead:lead({revision:7,notes:'QA newer untouched note'})});assert.equal(fieldIn(runner,'lead-notes').props.value,'QA newer untouched note');assert.deepEqual(read(storage,scope).entries,[]);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[]);assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);
 });
});

test('failed pre-send draft retirement can resume the same prepared operation in place after storage recovers',async()=>{
 const storage=memory(),bodies=[];let removable=false;
 const draftRecovery=localDraftRecovery(storage,{clear:entry=>removable&&clear(storage,scope,entry)}),recovery=localPendingRecovery(storage);
 await withHooks(Editor,{lead:lead(),draftRecovery,recovery,transport:async(_url,options)=>{bodies.push(JSON.parse(options.body));return receipt(bodies.at(-1));},onSaved:()=>{}},async runner=>{
  await completedEdits(runner);const entry=read(storage,scope).entries[0];await submit(runner);const pendingEntry=pending.readCommercialPending(storage,scope).entries[0];
  assert.ok(pendingEntry);assert.deepEqual(bodies,[]);assert.ok(buttonIn(runner,'Comprobar guardado'));assert.match(messages(runner),/todavía no se envió/);
  await runner.update({recovery:{...recovery,entry:pendingEntry},draftRecovery:{...draftRecovery,entry}});removable=true;
  buttonIn(runner,'Comprobar guardado').props.onClick();await runner.flush();assert.deepEqual(bodies,[pendingEntry.request]);assert.deepEqual(read(storage,scope).entries,[]);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[]);
 });
});

test('a server conflict preserves the original local intent before removing its pending copy and survives reload',async()=>{
 const storage=memory(),order=[],canonical=lead({revision:7,status:'won',revenue_bs:1500,notes:'QA remote conflict version'});
 const draftRecovery=localDraftRecovery(storage,{persist:(base,edit,expected)=>{const entry=create(base,edit);if(!entry||!put(storage,scope,entry,expected))return null;order.push('draft.persist');return entry;}});
 const recovery=localPendingRecovery(storage,{complete:entry=>{order.push('pending.complete');assert.equal(read(storage,scope).entries.length,1);return pending.clearCommercialPending(storage,scope,entry);}});
 await withHooks(Editor,{lead:lead(),draftRecovery,recovery,transport:async(_url,options)=>{const command=JSON.parse(options.body);order.push('PATCH');return Response.json({code:'REVISION_CONFLICT',requestId:command.requestId,lead:canonical},{status:409});},onSaved:()=>assert.fail()},async runner=>{
  await completedEdits(runner);order.length=0;await submit(runner);assert.deepEqual(order,['PATCH','draft.persist','pending.complete']);assert.ok(buttonIn(runner,'Revisar mis cambios'));assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[]);
 });
 const entry=read(storage,scope).entries[0];assert.equal(entry.base.revision,2);assert.equal(entry.draft.notes,'QA edited locally');assert.equal(entry.draft.revenue,'930,50');
 await withHooks(Editor,{lead:canonical,draftRecovery:localDraftRecovery(storage,{entry,restored:entry}),transport:offline,onSaved:()=>assert.fail()},async runner=>{
  assert.ok(buttonIn(runner,'Revisar mis cambios'));assert.equal(fieldIn(runner,'lead-notes').props.value,entry.draft.notes);assert.equal(fieldIn(runner,'lead-revenue').props.value,'930,50');assert.equal(fieldIn(runner,'lead-status').props.value,'reserved');
 });
});

test('if preserving a conflict draft fails the exact pending operation remains recoverable after reload',async()=>{
 const storage=memory(),canonical=lead({revision:7,status:'won',revenue_bs:1500,notes:'QA canonical conflict'});let denyConflictDraft=false,command;
 const draftRecovery=localDraftRecovery(storage,{persist:(base,edit,expected)=>{if(denyConflictDraft)return null;const entry=create(base,edit);return entry&&put(storage,scope,entry,expected)?entry:null;}});
 await withHooks(Editor,{lead:lead(),draftRecovery,recovery:localPendingRecovery(storage),transport:async(_url,options)=>{command=JSON.parse(options.body);denyConflictDraft=true;return Response.json({code:'REVISION_CONFLICT',requestId:command.requestId,lead:canonical},{status:409});},onSaved:()=>assert.fail()},async runner=>{
  await completedEdits(runner);await submit(runner);assert.match(messages(runner),/se mantiene la copia de la operación/);assert.deepEqual(read(storage,scope).entries,[]);assert.deepEqual(pending.readCommercialPending(storage,scope).entries[0].request,command);
 });
 const entry=pending.readCommercialPending(storage,scope).entries[0];
 await withHooks(Editor,{lead:canonical,draftRecovery:localDraftRecovery(storage),recovery:localPendingRecovery(storage,{entry,resumed:entry}),transport:offline,onSaved:()=>assert.fail()},async runner=>{
  assert.ok(buttonIn(runner,'Comprobar guardado'));assert.equal(fieldIn(runner,'lead-notes').props.value,command.notes);assert.equal(fieldIn(runner,'lead-revenue').props.value,'930.5');
 });
});

function recoveredConflict(storage){
 const command={id:lead().id,requestId:'30000000-0000-4000-8000-000000000011',expectedRevision:4,status:'reserved',revenueBs:200,notes:'QA note A from recovered operation'};
 const canonical=lead({revision:8,status:'won',revenue_bs:1500,notes:'QA note B from newer canonical version'}),result=pending.putCommercialPending(storage,scope,reference,command);assert.equal(result.ok,true);
 return{command,canonical,entry:result.entry,transport:async(_url,options)=>{assert.deepEqual(JSON.parse(options.body),command);return Response.json({code:'REVISION_CONFLICT',requestId:command.requestId,lead:canonical},{status:409});}};
}

test('a recovered request conflicting at revision eight preserves its full intent across reload until explicit review',async()=>{
 const storage=memory(),fixture=recoveredConflict(storage);
 const recovery=localPendingRecovery(storage,{resumed:fixture.entry});
 await withHooks(Editor,{lead:fixture.canonical,draftRecovery:localDraftRecovery(storage),recovery,transport:fixture.transport,onSaved:()=>assert.fail()},async runner=>{
  buttonIn(runner,'Comprobar guardado').props.onClick();await runner.flush();assert.ok(buttonIn(runner,'Revisar valores recuperados'));assert.deepEqual(read(storage,scope).entries,[]);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[fixture.entry]);assert.equal(fieldIn(runner,'lead-notes').props.value,fixture.command.notes);
 });
 await withHooks(Editor,{lead:fixture.canonical,draftRecovery:localDraftRecovery(storage),recovery,transport:fixture.transport,onSaved:()=>assert.fail()},async runner=>{
  buttonIn(runner,'Comprobar guardado').props.onClick();await runner.flush();assert.equal(fieldIn(runner,'lead-notes').props.value,fixture.command.notes);assert.deepEqual(read(storage,scope).entries,[]);
  buttonIn(runner,'Revisar valores recuperados').props.onClick();await runner.flush();const reviewed=read(storage,scope).entries[0];
  assert.equal(reviewed.base.revision,8);assert.equal(reviewed.base.notes,fixture.canonical.notes);assert.equal(reviewed.draft.notes,fixture.command.notes);assert.equal(reviewed.draft.status,fixture.command.status);assert.equal(reviewed.draft.revenue,'200');assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[]);
 });
 const reviewed=read(storage,scope).entries[0];
 await withHooks(Editor,{lead:fixture.canonical,draftRecovery:localDraftRecovery(storage,{restored:reviewed}),transport:offline,onSaved:()=>assert.fail()},async runner=>{
  assert.equal(fieldIn(runner,'lead-notes').props.value,fixture.command.notes);assert.equal(fieldIn(runner,'lead-status').props.value,fixture.command.status);assert.equal(fieldIn(runner,'lead-revenue').props.value,'200');
 });
});

test('failed persistence or pending cleanup during recovered conflict review cannot advance or lose the operation',async()=>{
 for(const failure of ['draft.persist','pending.clear']){
  const storage=memory(),fixture=recoveredConflict(storage);let repaired=false,patches=0;
  const draftRecovery=localDraftRecovery(storage,{persist:(base,edit,expected)=>{if(!repaired&&failure==='draft.persist')return null;const entry=create(base,edit);return entry&&put(storage,scope,entry,expected)?entry:null;}});
  const recovery=localPendingRecovery(storage,{resumed:fixture.entry,complete:entry=>repaired||failure!=='pending.clear'?pending.clearCommercialPending(storage,scope,entry):false});
  await withHooks(Editor,{lead:fixture.canonical,draftRecovery,recovery,transport:async(...args)=>{patches++;return fixture.transport(...args);},onSaved:()=>assert.fail()},async runner=>{
   buttonIn(runner,'Comprobar guardado').props.onClick();await runner.flush();buttonIn(runner,'Revisar valores recuperados').props.onClick();await runner.flush();
   assert.ok(buttonIn(runner,'Revisar valores recuperados'));assert.equal(nodes(runner.current(),node=>node.type==='fieldset')[0].props.disabled,true);assert.equal(fieldIn(runner,'lead-notes').props.value,fixture.command.notes);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[fixture.entry]);assert.equal(patches,1);
   repaired=true;buttonIn(runner,'Revisar valores recuperados').props.onClick();await runner.flush();assert.equal(buttonIn(runner,'Revisar valores recuperados'),undefined);assert.equal(read(storage,scope).entries[0].draft.notes,fixture.command.notes);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[]);assert.equal(patches,1);
  });
 }
});

test('discard of a recovered conflict requires exact pending cleanup before replacing its full intent',async()=>{
 const storage=memory(),fixture=recoveredConflict(storage);let removable=false;
 const recovery=localPendingRecovery(storage,{resumed:fixture.entry,complete:entry=>removable&&pending.clearCommercialPending(storage,scope,entry)});
 await withHooks(Editor,{lead:fixture.canonical,draftRecovery:localDraftRecovery(storage),recovery,transport:fixture.transport,onSaved:()=>assert.fail()},async runner=>{
  buttonIn(runner,'Comprobar guardado').props.onClick();await runner.flush();buttonIn(runner,'Descartar mis cambios…').props.onClick();await runner.flush();buttonIn(runner,'Sí, cargar versión actual').props.onClick();await runner.flush();
  assert.equal(fieldIn(runner,'lead-notes').props.value,fixture.command.notes);assert.ok(buttonIn(runner,'Sí, cargar versión actual'));assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[fixture.entry]);assert.match(messages(runner),/No se pudo retirar la copia de la operación revisada/);
  removable=true;buttonIn(runner,'Sí, cargar versión actual').props.onClick();await runner.flush();assert.equal(fieldIn(runner,'lead-notes').props.value,fixture.canonical.notes);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[]);assert.deepEqual(read(storage,scope).entries,[]);
 });
});

test('discarding the journal copy through the panel leaves editor RAM intact and the next edit creates a fresh draft',async()=>{
 const storage=memory();await withHooks(Editor,{lead:lead(),draftRecovery:localDraftRecovery(storage),transport:offline,onSaved:()=>assert.fail()},async runner=>{
  await change(runner,'lead-revenue','930,');const previous=read(storage,scope).entries[0];assert.equal(clear(storage,scope,previous),true);await runner.update({draftRecovery:localDraftRecovery(storage)});
  assert.equal(fieldIn(runner,'lead-revenue').props.value,'930,');assert.deepEqual(read(storage,scope).entries,[]);assert.match(messages(runner),/La copia local se retiró/);
  await change(runner,'lead-notes','QA next edit after panel discard');const next=read(storage,scope).entries[0];assert.ok(next);assert.equal(next.draft.revenue,'930,');assert.equal(next.draft.notes,'QA next edit after panel discard');assert.equal(next.base.revision,2);
 });
});

test('discarding editor RAM after a newer copy appears never removes that newer local draft',async()=>{
 const storage=memory(),removed=[],draftRecovery=localDraftRecovery(storage,{clear:entry=>{removed.push(entry);return clear(storage,scope,entry);}});
 await withHooks(Editor,{lead:lead(),draftRecovery,transport:offline,onSaved:()=>assert.fail()},async runner=>{
  await change(runner,'lead-notes','QA older editor RAM');const previous=read(storage,scope).entries[0],newer=create(lead(),draft({revenue:'123,40',notes:'QA newer external copy'}));assert.equal(put(storage,scope,newer,previous),true);await runner.update({draftRecovery});
  assert.equal(nodes(runner.current(),node=>node.type==='fieldset')[0].props.disabled,true);buttonIn(runner,'Descartar cambios…').props.onClick();await runner.flush();buttonIn(runner,'Sí, descartar cambios').props.onClick();await runner.flush();
  assert.equal(fieldIn(runner,'lead-notes').props.value,lead().notes);assert.deepEqual(read(storage,scope).entries,[newer]);assert.deepEqual(removed,[]);assert.equal(nodes(runner.current(),node=>node.type==='fieldset')[0].props.disabled,true);
 });
});

const {default:Dashboard,CommercialContactList:ContactList}=require('../src/components/admin/CommercialDashboard.tsx');
const PendingPanel=require('../src/components/admin/CommercialPendingRecovery.tsx').default;
const dashboardTransport=calls=>async(url,options)=>{calls.push(url);assert.equal(options?.method,undefined,'Dashboard recovery never makes a PATCH');if(String(url).startsWith('/api/admin/commercial/lookup?'))return Response.json({lead:lead()});throw Error('QA deliberately unavailable metrics');};

test('the real Dashboard binds recovery after configuration and opens exactly one editor with the restored draft context',async()=>{
 const storage=memory(),entry=seed(storage),calls=[];
 await withHooks(Dashboard,{storage,transport:dashboardTransport(calls)},async runner=>{
  const panel=()=>nodes(runner.current(),node=>node.type===Panel)[0],list=()=>nodes(runner.current(),node=>node.type===ContactList)[0];
  assert.equal(panel().props.manager.ready,false);assert.deepEqual(panel().props.manager.entries,[]);assert.equal(calls.filter(value=>String(value).includes('/lookup?')).length,0);
  runner.current().props.onRecoveryScope(scope);await runner.flush();assert.equal(panel().props.manager.ready,true);assert.deepEqual(panel().props.manager.entries,[entry]);
  await panel().props.manager.restore(entry);await runner.flush();assert.equal(calls.filter(value=>String(value).includes('/lookup?')).length,1);assert.equal(list().props.leads.length,1);assert.equal(list().props.openedId,entry.id);assert.equal(list().props.pageIds.size,0);
  const contactTree=ContactList(list().props),card=nodes(contactTree,node=>typeof node.type==='function'&&node.props.lead)[0],editorNodes=nodes(card.type(card.props),node=>node.type===Editor);assert.equal(editorNodes.length,1);
  const context=editorNodes[0].props.draftRecovery;assert.equal(context.scope,scope);assert.equal(context.ready,true);assert.deepEqual(context.entry,entry);assert.deepEqual(context.restored,entry);
  runner.current().props.onOpenLead(lead());await runner.flush();assert.equal(list().props.leads.length,1);assert.deepEqual(storage.writes,[]);
 });
});

test('Dashboard rejects restoring over active editor changes or a pending operation even after a valid lookup',async()=>{
 for(const blocker of ['active','pending']){
  const storage=memory(),entry=seed(storage),calls=[];
  await withHooks(Dashboard,{storage,transport:dashboardTransport(calls)},async runner=>{
   const panel=()=>nodes(runner.current(),node=>node.type===Panel)[0],list=()=>nodes(runner.current(),node=>node.type===ContactList)[0];runner.current().props.onRecoveryScope(scope);await runner.flush();
   if(blocker==='active'){runner.current().props.onOpenLead(lead());await runner.flush();list().props.onActivityChange(entry.id,true);await runner.flush();}
   else{const manager=nodes(runner.current(),node=>node.type===PendingPanel)[0].props.manager,command=prepareCommercialDraftUpdate(lead(),draft({revenue:'930,50'}),'30000000-0000-4000-8000-000000000011');assert.ok(manager.persist(reference,command));await runner.flush();assert.equal(panel().props.pendingIds.has(entry.id),true);}
   await panel().props.manager.restore(entry);await runner.flush();assert.match(panel().props.manager.error,/cambios o una operación pendiente/);assert.equal(list().props.draftRecovery.restored.size,0);assert.equal(list().props.leads.length,blocker==='active'?1:0);assert.equal(calls.filter(value=>String(value).includes('/lookup?')).length,1);assert.deepEqual(read(storage,scope).entries,[entry]);
  });
 }
});

test('QA cleanup removes current and expired drafts and pending operations only from its fictional session',async()=>{
 const Workbench=require('../src/app/dev/services/commercial-dashboard/workbench.tsx').default,storage=memory(),qaScope='e'.repeat(64),outsideScope='f'.repeat(64),otherLead=lead({id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002'});
 seed(storage,lead(),draft(),qaScope);seed(storage,otherLead,draft(),qaScope,Date.now()-2*DAY);const outside=seed(storage,lead(),draft(),outsideScope),outsideExpired=seed(storage,otherLead,draft(),outsideScope,Date.now()-2*DAY);
 const command=prepareCommercialDraftUpdate(lead(),draft({revenue:'930,50'}),'30000000-0000-4000-8000-000000000011');assert.equal(pending.putCommercialPending(storage,qaScope,reference,command).ok,true);const otherPending=pending.putCommercialPending(storage,outsideScope,reference,command);assert.equal(otherPending.ok,true);storage.writes.length=0;storage.removals.length=0;
 await withHooks(Workbench,{storage},async runner=>{
  buttonIn(runner,'Limpiar QA').props.onClick();await runner.flush();assert.deepEqual(read(storage,qaScope),{kind:'ready',entries:[],expired:[]});assert.deepEqual(read(storage,outsideScope),{kind:'ready',entries:[outside],expired:[outsideExpired]});assert.deepEqual(pending.readCommercialPending(storage,qaScope).entries,[]);assert.deepEqual(pending.readCommercialPending(storage,outsideScope).entries,[otherPending.entry]);
  assert.ok([...storage.writes,...storage.removals].every(key=>key.endsWith(qaScope)));assert.match(messages(runner),/ficticios retirados/);
 });
});

test('reload after reviewed-draft persistence but failed pending cleanup can explicitly replay and retry exact review cleanup',async()=>{
 const storage=memory(),fixture=recoveredConflict(storage);let reviewed;
 await withHooks(Editor,{lead:fixture.canonical,draftRecovery:localDraftRecovery(storage),recovery:localPendingRecovery(storage,{resumed:fixture.entry,complete:()=>false}),transport:fixture.transport,onSaved:()=>assert.fail()},async runner=>{
  buttonIn(runner,'Comprobar guardado').props.onClick();await runner.flush();buttonIn(runner,'Revisar valores recuperados').props.onClick();await runner.flush();reviewed=read(storage,scope).entries[0];assert.equal(reviewed.base.revision,8);assert.equal(reviewed.draft.notes,fixture.command.notes);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[fixture.entry]);assert.ok(buttonIn(runner,'Revisar valores recuperados'));
 });
 const cleared=[],sent=[];const draftRecovery=localDraftRecovery(storage,{clear:entry=>{cleared.push(entry);return clear(storage,scope,entry);}});
 await withHooks(Editor,{lead:fixture.canonical,draftRecovery,recovery:localPendingRecovery(storage,{resumed:fixture.entry}),transport:async(...args)=>{sent.push(JSON.parse(args[1].body));return fixture.transport(...args);},onSaved:()=>assert.fail()},async runner=>{
  assert.deepEqual(sent,[]);assert.ok(buttonIn(runner,'Comprobar guardado'));buttonIn(runner,'Comprobar guardado').props.onClick();await runner.flush();assert.deepEqual(sent,[fixture.command]);assert.deepEqual(cleared,[]);assert.deepEqual(read(storage,scope).entries,[reviewed]);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[fixture.entry]);
  buttonIn(runner,'Revisar valores recuperados').props.onClick();await runner.flush();const current=read(storage,scope).entries[0];assert.equal(current.base.revision,8);assert.deepEqual(current.base,reviewed.base);assert.deepEqual(current.draft,reviewed.draft);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[]);assert.equal(buttonIn(runner,'Revisar valores recuperados'),undefined);assert.deepEqual(cleared,[]);assert.equal(sent.length,1);
 });
});

test('recovered conflict cleanup cannot replace a later draft whose baseline or raw intent differs from the reviewed values',async()=>{
 const variations=[
  entry=>({...entry,base:{...entry.base,revision:7}}),entry=>({...entry,base:{...entry.base,status:'contacted'}}),entry=>({...entry,base:{...entry.base,revenueBs:123.4}}),entry=>({...entry,base:{...entry.base,notes:'QA different baseline note'}}),
  entry=>({...entry,draft:{...entry.draft,status:'contacted'}}),entry=>({...entry,draft:{...entry.draft,revenue:'0200.00'}}),entry=>({...entry,draft:{...entry.draft,notes:'QA different later draft'}}),
 ];
 for(const vary of variations){
  const storage=memory(),fixture=recoveredConflict(storage),candidate=create(fixture.canonical,{status:fixture.command.status,revenue:'200',notes:fixture.command.notes}),different=vary(candidate);assert.equal(put(storage,scope,different,null),true);
  await withHooks(Editor,{lead:fixture.canonical,draftRecovery:localDraftRecovery(storage),recovery:localPendingRecovery(storage,{resumed:fixture.entry}),transport:fixture.transport,onSaved:()=>assert.fail()},async runner=>{
   buttonIn(runner,'Comprobar guardado').props.onClick();await runner.flush();assert.deepEqual(read(storage,scope).entries,[different]);buttonIn(runner,'Revisar valores recuperados').props.onClick();await runner.flush();
   assert.ok(buttonIn(runner,'Revisar valores recuperados'));assert.deepEqual(read(storage,scope).entries,[different]);assert.deepEqual(pending.readCommercialPending(storage,scope).entries,[fixture.entry]);assert.equal(fieldIn(runner,'lead-notes').props.value,fixture.command.notes);
  });
 }
});
