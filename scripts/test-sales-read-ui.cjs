// Real component state/effects with isolated GETs and fictional local drafts.
// Timers are virtual; no browser, production data or real clipboard is used.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react');
const History=require('../src/components/admin/CommercialLeadHistory.tsx').default;
const {default:Toolkit,SalesQuoteReview,SalesCopyButton}=require('../src/components/admin/SalesToolkit.tsx');
const {encodeCommercialHistoryCursor}=require('../src/lib/commercial-history.ts');
const {salesDraftKey}=require('../src/lib/sales-draft.ts');
const scope='a'.repeat(64),otherScope='b'.repeat(64),identity={id:'30000000-0000-4000-8000-000000000001',reference:'EK-A1B2C3D4',revision:2};
const other={id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002',revision:2};
const anchor='2025-01-03T12:00:00.123456Z';
const memory=()=>{const values=new Map(),reads=[],writes=[],removals=[];return{values,reads,writes,removals,getItem:key=>{reads.push(key);return values.get(key)??null;},setItem:(key,value)=>{writes.push(key);values.set(key,value);},removeItem:key=>{removals.push(key);values.delete(key);}};};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];

// Stable setters and dependency-aware effects preserve component behavior.
// DOM refs stay null: this is not layout, keyboard focus or device acceptance.
async function withHooks(Component,initialProps,scenario){
 const names=['useState','useReducer','useRef','useEffect','useMemo','useCallback','useId'],original=Object.fromEntries(names.map(name=>[name,React[name]])),oldWindow=global.window,oldDocument=global.document,oldFetch=global.fetch;
 const slots=[],snapshots=[],audit=[],wrapped=new Map();let cursor=0,dirty=true,value,props,effects=[],unmounted=false,networkCalls=0;
 const bind=patch=>{if(typeof patch.transport!=='function')return patch;const fn=patch.transport;if(!wrapped.has(fn))wrapped.set(fn,async(url,options)=>{audit.push({fn,url,method:options?.method??'GET'});return fn(url,options);});return{...patch,transport:wrapped.get(fn)};};props=bind(initialProps);
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((item,index)=>Object.is(item,b[index]));
 React.useState=initial=>{const index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initial==='function'?initial():initial};slot.set=next=>{next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useReducer=(reduce,initial,init)=>{const index=cursor++;if(!(index in slots)){const slot=slots[index]={value:init?init(initial):initial,reduce};slot.dispatch=action=>{const next=slot.reduce(slot.value,action);if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}slots[index].reduce=reduce;return[slots[index].value,slots[index].dispatch];};
 React.useRef=initial=>{const index=cursor++;return slots[index]??(slots[index]={current:initial});};
 React.useId=()=>{const index=cursor++;return slots[index]??(slots[index]=`:qa-read-${index}:`);};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:compute(),deps};return slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const index=cursor++,before=slots[index];if(!before||!same(before.deps,deps)){const slot={deps,cleanup:before?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 global.window={sessionStorage:initialProps.storage??memory(),addEventListener:()=>{},removeEventListener:()=>{},setTimeout,clearTimeout};global.document={getElementById:()=>null};global.fetch=async()=>{networkCalls++;throw Error('Real network is disabled');};
 const flush=async()=>{for(let round=0;round<30;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];value=Component(props);snapshots.push(value);for(const effect of effects)effect();}await new Promise(resolve=>setImmediate(resolve));if(!dirty||unmounted)return value;}throw Error('Read component effects did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const runner={flush,current:()=>value,snapshots,unmount,update:async patch=>{props={...props,...bind(patch)};dirty=true;return flush();}};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of names)React[name]=original[name];if(oldWindow===undefined)delete global.window;else global.window=oldWindow;if(oldDocument===undefined)delete global.document;else global.document=oldDocument;global.fetch=oldFetch;assert.equal(networkCalls,0);assert.ok(audit.every(call=>call.method==='GET'),'Read components must never send a PATCH');}
}
const buttonIn=(runner,label)=>nodes(runner.current(),node=>node.type==='button'&&node.props.children===label)[0];
const textOf=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(textOf).join(' '):React.isValidElement(value)?textOf(value.props.children):'';
const textIn=runner=>textOf(runner.current());
const reviewIn=runner=>nodes(runner.current(),node=>node.type===SalesQuoteReview)[0];
const fieldIn=(runner,name)=>nodes(runner.current(),node=>node.props.name===name)[0];
const openHistory=async runner=>{buttonIn(runner,'Ver historial').props.onClick();await runner.flush();};
const openToolkit=async runner=>{nodes(runner.current(),node=>node.type==='button'&&node.props['aria-expanded']===false)[0].props.onClick();await runner.flush();};
function historyPage(lead=identity,tag='FIRST',older=false){
 const time=older?'2024-01-01T12:00:00.654321Z':'2024-01-02T12:00:00.654321Z';
 const entries=Array.from({length:older?10:20},(_,i)=>({id:`40000000-0000-4000-8000-${String((older?80:100)-i).padStart(12,'0')}`,lead_id:lead.id,from_status:'contacted',to_status:'reserved',revenue_bs:200,note:`QA_${tag}_${i}`,created_at:time}));
 const last=entries.at(-1);return{lead:{id:lead.id,reference:lead.reference},asOf:anchor,entries,pagination:{size:20,hasMore:!older,nextCursor:older?null:encodeCommercialHistoryCursor({leadId:lead.id,asOf:anchor,createdAt:last.created_at,id:last.id})}};
}
const config=(binding=scope,patch={})=>({paymentInstructions:'QA INSTRUCTIONS A NO PAYMENT',paymentConfigured:true,salesHours:'QA horario',draftScope:binding,...patch});
const storedQuote=(storage,binding=scope,patch={})=>{const input={packageKey:'premium',eventType:'Boda',clientName:'QA saved quote A',eventDate:'2028-02-29',design:'Lunaria',extrasBs:'270,50',extrasLabel:'QA extras',...patch};storage.values.set(salesDraftKey(binding),JSON.stringify({version:2,scope:binding,savedAt:Date.now(),input}));return input;};

test('collapsed history performs no GET until the operator explicitly opens it',async()=>{
 const calls=[];await withHooks(History,{lead:identity,transport:async(url,options)=>{calls.push({url,options});return Response.json(historyPage());}},async runner=>{
  assert.deepEqual(calls,[]);assert.doesNotMatch(textIn(runner),/QA_FIRST/);await openHistory(runner);assert.equal(calls.length,1);assert.equal(calls[0].options.cache,'no-store');assert.match(textIn(runner),/QA_FIRST_0/);assert.equal(nodes(runner.current(),node=>node.type==='input'||node.type==='form').length,0);
 });
});

test('a stalled history transport exits at twenty seconds and explicit retry ignores the late old response',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const pending=deferred(),calls=[];let signal,bodyReads=0;
 await withHooks(History,{lead:identity,transport:async(url,options)=>{calls.push(url);if(calls.length===1){signal=options.signal;return pending.promise;}return Response.json(historyPage(identity,'RETRIED'));}},async runner=>{
  await openHistory(runner);assert.match(textIn(runner),/Cargando historial/);t.mock.timers.tick(19999);await runner.flush();assert.equal(buttonIn(runner,'Reintentar consulta'),undefined);t.mock.timers.tick(1);await runner.flush();assert.equal(signal.aborted,true);assert.match(textIn(runner),/tardó demasiado/);assert.doesNotMatch(textIn(runner),/Cargando historial/);
  buttonIn(runner,'Reintentar consulta').props.onClick();await runner.flush();assert.equal(calls.length,2);assert.equal(calls[1],calls[0]);assert.match(textIn(runner),/QA_RETRIED_0/);
  pending.resolve({status:200,ok:true,json:async()=>{bodyReads++;return historyPage(identity,'LATE');}});await runner.flush();assert.equal(bodyReads,0);assert.doesNotMatch(textIn(runner),/QA_LATE/);assert.equal(calls.length,2);
 });
});

test('the twenty-second history deadline covers an ignored-abort JSON body without accepting its late notes',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const body=deferred();let calls=0,bodyReads=0;
 await withHooks(History,{lead:identity,transport:async()=>{calls++;return{status:200,ok:true,json:()=>{bodyReads++;return body.promise;}};}},async runner=>{
  await openHistory(runner);assert.equal(bodyReads,1);t.mock.timers.tick(20000);await runner.flush();assert.ok(buttonIn(runner,'Reintentar consulta'));assert.doesNotMatch(textIn(runner),/Cargando historial/);body.resolve(historyPage(identity,'LATE_BODY'));await runner.flush();assert.doesNotMatch(textIn(runner),/QA_LATE_BODY/);assert.equal(calls,1);
 });
});

test('history continuation timeout preserves the visible page and retry repeats the exact failed cursor',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const pending=deferred(),calls=[],first=historyPage(),second=historyPage(identity,'SECOND',true);
 await withHooks(History,{lead:identity,transport:async(url)=>{calls.push(url);return calls.length===1?Response.json(first):calls.length===2?pending.promise:Response.json(second);}},async runner=>{
  await openHistory(runner);assert.match(textIn(runner),/QA_FIRST_0/);buttonIn(runner,'Ver 20 anteriores').props.onClick();await runner.flush();const failed=new URL(calls[1],'https://qa.invalid');assert.equal(failed.searchParams.get('cursor'),first.pagination.nextCursor);
  t.mock.timers.tick(20000);await runner.flush();assert.match(textIn(runner),/QA_FIRST_0/);assert.match(textIn(runner),/consulta anterior/);buttonIn(runner,'Reintentar consulta').props.onClick();await runner.flush();assert.equal(calls[2],calls[1]);assert.equal(calls.length,3);assert.match(textIn(runner),/QA_SECOND_0/);assert.doesNotMatch(textIn(runner),/QA_FIRST_0/);assert.equal(buttonIn(runner,'Ver 20 anteriores').props.disabled,true);
  pending.resolve(Response.json(historyPage(identity,'LATE_PAGE',true)));await runner.flush();assert.doesNotMatch(textIn(runner),/QA_LATE_PAGE/);assert.equal(calls.length,3);
 });
});

test('closing an active history read aborts it and never renders or reads the late response body',async()=>{
 const pending=deferred();let signal,calls=0,bodyReads=0;
 await withHooks(History,{lead:identity,transport:async(_url,options)=>{calls++;signal=options.signal;return pending.promise;}},async runner=>{
  await openHistory(runner);buttonIn(runner,'Ocultar historial').props.onClick();await runner.flush();assert.equal(signal.aborted,true);assert.ok(buttonIn(runner,'Ver historial'));pending.resolve({status:200,ok:true,json:async()=>{bodyReads++;return historyPage(identity,'CLOSED');}});await runner.flush();assert.equal(bodyReads,0);assert.doesNotMatch(textIn(runner),/QA_CLOSED|Cargando historial|Reintentar consulta/);assert.equal(calls,1);
 });
});

test('unmount cancels history without late notes, late errors or a second read',async()=>{
 const pending=deferred();let signal,calls=0,bodyReads=0;
 await withHooks(History,{lead:identity,transport:async(_url,options)=>{calls++;signal=options.signal;return pending.promise;}},async runner=>{
  await openHistory(runner);runner.unmount();assert.equal(signal.aborted,true);pending.resolve({status:200,ok:true,json:async()=>{bodyReads++;return historyPage(identity,'UNMOUNTED');}});await runner.flush();assert.equal(bodyReads,0);assert.equal(calls,1);
 });
});

test('changing contact or revision rejects history callbacks captured from an older identity',async()=>{
 for(const replacement of [other,{...identity,revision:3}]){
  const calls=[];await withHooks(History,{lead:identity,transport:async(url)=>{calls.push(url);const leadId=new URL(url,'https://qa.invalid').searchParams.get('leadId');return Response.json(historyPage(leadId===other.id?other:identity));}},async runner=>{
   await openHistory(runner);const oldMore=buttonIn(runner,'Ver 20 anteriores').props.onClick;await runner.update({lead:replacement});const previous=calls.length;oldMore();await runner.flush();assert.equal(calls.length,previous);assert.doesNotMatch(textIn(runner),/otro contacto/);
  });
 }
});

test('a closed history cannot be reopened by stale pagination callbacks from its previous disclosure',async()=>{
 const calls=[];await withHooks(History,{lead:identity,transport:async url=>{calls.push(url);return Response.json(historyPage());}},async runner=>{
  await openHistory(runner);const oldMore=buttonIn(runner,'Ver 20 anteriores').props.onClick;buttonIn(runner,'Ocultar historial').props.onClick();await runner.flush();oldMore();await runner.flush();assert.equal(calls.length,1);assert.ok(buttonIn(runner,'Ver historial'));assert.doesNotMatch(textIn(runner),/QA_FIRST/);
 });
});

test('returning to the same history identity does not reactivate an older lifetime handler',async()=>{
 const calls=[];await withHooks(History,{lead:identity,transport:async url=>{calls.push(url);const leadId=new URL(url,'https://qa.invalid').searchParams.get('leadId');return Response.json(historyPage(leadId===other.id?other:identity));}},async runner=>{
  await openHistory(runner);const oldMore=buttonIn(runner,'Ver 20 anteriores').props.onClick;await runner.update({lead:other});await runner.update({lead:identity});const count=calls.length;oldMore();await runner.flush();assert.equal(calls.length,count);
 });
});

test('identity changes during a stalled history read cannot leak notes from the original contact',async()=>{
 const pending=deferred(),calls=[];let oldSignal;
 await withHooks(History,{lead:identity,transport:async(url,options)=>{calls.push(url);if(calls.length===1){oldSignal=options.signal;return pending.promise;}return Response.json(historyPage(other,'OTHER_CONTACT'));}},async runner=>{
  await openHistory(runner);await runner.update({lead:other});assert.equal(oldSignal.aborted,true);pending.resolve(Response.json(historyPage(identity,'BORROWED')));await runner.flush();assert.doesNotMatch(textIn(runner),/QA_BORROWED/);const count=calls.length;await runner.flush();assert.equal(calls.length,count);
 });
});

test('borrowed or malformed history pages remain retryable errors instead of empty successful history',async()=>{
 for(const reply of [()=>Response.json(historyPage(other)),()=>Response.json({entries:[]}),()=>Response.json({error:'QA_PRIVATE_INTERNAL'},{status:500}),()=>Response.json({error:'No autorizado'},{status:401})]){
  await withHooks(History,{lead:identity,transport:async()=>reply()},async runner=>{
   await openHistory(runner);assert.ok(buttonIn(runner,'Reintentar consulta'));assert.ok(nodes(runner.current(),node=>node.props.role==='alert').length);assert.doesNotMatch(textIn(runner),/Aún no hay cambios registrados|QA_PRIVATE_INTERNAL|QA_FIRST/);
  });
 }
});

test('configuration transport timeout releases loading at twelve seconds without binding or hydrating a late scope',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const storage=memory(),pending=deferred(),bindings=[],copied=[];storedQuote(storage);let signal,bodyReads=0,calls=0;
 await withHooks(Toolkit,{storage,onScopeReady:value=>bindings.push(value),writeText:async value=>copied.push(value),transport:async(_url,options)=>{calls++;signal=options.signal;return pending.promise;}},async runner=>{
  await openToolkit(runner);assert.deepEqual(bindings,[null]);assert.deepEqual(storage.reads,[]);t.mock.timers.tick(11999);await runner.flush();assert.equal(buttonIn(runner,'Reintentar configuración'),undefined);t.mock.timers.tick(1);await runner.flush();assert.equal(signal.aborted,true);assert.ok(buttonIn(runner,'Reintentar configuración'));assert.match(textIn(runner),/tardó demasiado/);assert.doesNotMatch(textIn(runner),/Comprobando configuración y borrador/);assert.equal(reviewIn(runner).props.disabled,true);assert.ok(nodes(runner.current(),node=>node.type===SalesCopyButton).every(node=>node.props.disabled));
  pending.resolve({status:200,ok:true,json:async()=>{bodyReads++;return config();}});await runner.flush();assert.equal(bodyReads,0);assert.ok(bindings.every(value=>value===null));assert.deepEqual(storage.reads,[]);assert.deepEqual(storage.writes,[]);assert.deepEqual(copied,[]);assert.equal(calls,1);assert.equal(fieldIn(runner,'quote-client').props.value,'');
 });
});

test('configuration JSON deadline cannot publish late instructions and an explicit retry binds only its fresh session',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const storage=memory(),body=deferred(),bindings=[],copied=[];storedQuote(storage);storedQuote(storage,otherScope,{clientName:'QA saved quote B'});let calls=0;
 await withHooks(Toolkit,{storage,onScopeReady:value=>bindings.push(value),writeText:async value=>copied.push(value),transport:async()=>++calls===1?{status:200,ok:true,json:()=>body.promise}:Response.json(config(otherScope,{paymentInstructions:'QA FRESH INSTRUCTIONS B'}))},async runner=>{
  await openToolkit(runner);t.mock.timers.tick(12000);await runner.flush();assert.ok(buttonIn(runner,'Reintentar configuración'));assert.ok(bindings.every(value=>value===null));assert.deepEqual(storage.reads,[]);assert.equal(reviewIn(runner).props.disabled,true);
  buttonIn(runner,'Reintentar configuración').props.onClick();await runner.flush();assert.equal(calls,2);assert.equal(bindings.at(-1),otherScope);assert.equal(bindings.filter(value=>value===otherScope).length,1);assert.equal(fieldIn(runner,'quote-client').props.value,'QA saved quote B');assert.equal(reviewIn(runner).props.input.paymentInstructions,'QA FRESH INSTRUCTIONS B');
  body.resolve(config(scope,{paymentInstructions:'QA LATE PRIVATE INSTRUCTIONS A'}));await runner.flush();assert.equal(calls,2);assert.equal(bindings.includes(scope),false);assert.equal(fieldIn(runner,'quote-client').props.value,'QA saved quote B');assert.equal(reviewIn(runner).props.input.paymentInstructions,'QA FRESH INSTRUCTIONS B');assert.ok(storage.reads.every(key=>key===salesDraftKey(otherScope)));assert.deepEqual(storage.writes,[]);assert.deepEqual(copied,[]);
 });
});

test('unmounted configuration reads abort promptly and cannot hydrate storage or emit a session from a late response',async()=>{
 const storage=memory(),pending=deferred(),bindings=[];storedQuote(storage);let signal,bodyReads=0;
 await withHooks(Toolkit,{storage,onScopeReady:value=>bindings.push(value),transport:async(_url,options)=>{signal=options.signal;return pending.promise;}},async runner=>{
  runner.unmount();assert.equal(signal.aborted,true);pending.resolve({status:200,ok:true,json:async()=>{bodyReads++;return config();}});await runner.flush();assert.equal(bodyReads,0);assert.ok(bindings.every(value=>value===null));assert.deepEqual(storage.reads,[]);assert.deepEqual(storage.writes,[]);
 });
});

test('replacing a pending configuration read cannot let the old response bind or expose its scope',async()=>{
 const storage=memory(),pending=deferred(),bindings=[];storedQuote(storage);storedQuote(storage,otherScope,{clientName:'QA current tab B'});let signal;
 await withHooks(Toolkit,{storage,onScopeReady:value=>bindings.push(value),transport:async(_url,options)=>{signal=options.signal;return pending.promise;}},async runner=>{
  await openToolkit(runner);await runner.update({transport:async()=>Response.json(config(otherScope,{paymentInstructions:'QA B ONLY'}))});assert.equal(signal.aborted,true);assert.equal(bindings.at(-1),otherScope);assert.equal(fieldIn(runner,'quote-client').props.value,'QA current tab B');pending.resolve(Response.json(config()));await runner.flush();assert.equal(bindings.includes(scope),false);assert.equal(fieldIn(runner,'quote-client').props.value,'QA current tab B');assert.equal(reviewIn(runner).props.input.paymentInstructions,'QA B ONLY');assert.ok(storage.reads.every(key=>key===salesDraftKey(otherScope)));assert.deepEqual(storage.writes,[]);
 });
});

test('a saved quotation survives a configuration timeout and retry without being overwritten or losing local adjustments',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const storage=memory(),bindings=[],copied=[],pending=deferred();storedQuote(storage);let retryCalls=0;
 const onScopeReady=value=>bindings.push(value),flaky=async()=>++retryCalls===1?pending.promise:Response.json(config());
 await withHooks(Toolkit,{storage,onScopeReady,writeText:async value=>copied.push(value),transport:async()=>Response.json(config())},async runner=>{
  await openToolkit(runner);fieldIn(runner,'quote-client').props.onChange({target:{value:'QA adjusted quotation'}});await runner.flush();const raw=storage.values.get(salesDraftKey(scope)),writes=storage.writes.length;assert.equal(fieldIn(runner,'quote-client').props.value,'QA adjusted quotation');
  await runner.update({transport:flaky});assert.equal(bindings.at(-1),null);assert.equal(reviewIn(runner).props.disabled,true);t.mock.timers.tick(12000);await runner.flush();assert.ok(buttonIn(runner,'Reintentar configuración'));assert.equal(storage.values.get(salesDraftKey(scope)),raw);assert.equal(fieldIn(runner,'quote-client').props.value,'QA adjusted quotation');
  buttonIn(runner,'Reintentar configuración').props.onClick();await runner.flush();assert.equal(retryCalls,2);assert.equal(bindings.at(-1),scope);assert.equal(fieldIn(runner,'quote-client').props.value,'QA adjusted quotation');assert.equal(storage.values.get(salesDraftKey(scope)),raw);assert.equal(storage.writes.length,writes);assert.deepEqual(copied,[]);
  pending.resolve(Response.json(config(otherScope)));await runner.flush();assert.equal(bindings.at(-1),scope);assert.equal(fieldIn(runner,'quote-client').props.value,'QA adjusted quotation');assert.equal(bindings.includes(otherScope),false);
 });
});

test('invalid private configuration schema cannot bind a recovery session, hydrate a draft or unlock copying',async()=>{
 const invalid=[config(scope,{paymentInstructions:{value:'QA malformed'}}),config(scope,{paymentInstructions:'',paymentConfigured:true}),config(scope,{salesHours:'x'.repeat(121)}),config(scope,{draftScope:'A'.repeat(64)}),config(scope,{draftScope:'invalid'})];
 for(const response of invalid){
  const storage=memory(),bindings=[];storedQuote(storage);await withHooks(Toolkit,{storage,onScopeReady:value=>bindings.push(value),transport:async()=>Response.json(response)},async runner=>{
   await openToolkit(runner);assert.ok(buttonIn(runner,'Reintentar configuración'));assert.equal(reviewIn(runner).props.disabled,true);assert.ok(bindings.every(value=>value===null));assert.deepEqual(storage.reads,[]);assert.deepEqual(storage.writes,[]);assert.equal(fieldIn(runner,'quote-client').props.value,'');
  });
 }
});

test('extra private fields in an otherwise valid configuration never enter the quote or local recovery copy',async()=>{
 const storage=memory(),bindings=[];storedQuote(storage);
 await withHooks(Toolkit,{storage,onScopeReady:value=>bindings.push(value),transport:async()=>Response.json({...config(),apiKey:'QA_PRIVATE_KEY',service_role:'QA_PRIVATE_ROLE',password:'QA_PRIVATE_PASSWORD'})},async runner=>{
  await openToolkit(runner);assert.equal(bindings.at(-1),scope);assert.equal(reviewIn(runner).props.input.clientName,'QA saved quote A');assert.doesNotMatch(JSON.stringify(reviewIn(runner).props.input),/QA_PRIVATE_KEY|QA_PRIVATE_ROLE|QA_PRIVATE_PASSWORD/);assert.doesNotMatch(textIn(runner),/QA_PRIVATE_KEY|QA_PRIVATE_ROLE|QA_PRIVATE_PASSWORD/);assert.doesNotMatch(storage.values.get(salesDraftKey(scope)),/INSTRUCTIONS|paymentInstructions|QA_PRIVATE/);assert.deepEqual(storage.writes,[]);
 });
});

test('successful configuration disposes its deadline and cannot disable the quote or revoke the session later',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const storage=memory(),bindings=[];storedQuote(storage);let calls=0;
 await withHooks(Toolkit,{storage,onScopeReady:value=>bindings.push(value),transport:async()=>{calls++;return Response.json(config());}},async runner=>{
  await openToolkit(runner);assert.equal(reviewIn(runner).props.disabled,false);const snapshot=[...bindings];t.mock.timers.tick(24000);await runner.flush();assert.deepEqual(bindings,snapshot);assert.equal(reviewIn(runner).props.disabled,false);assert.equal(calls,1);assert.equal(buttonIn(runner,'Reintentar configuración'),undefined);assert.deepEqual(storage.writes,[]);
 });
});

test('configuration retry errors expose no payment success and keep every copy action disabled',async()=>{
 const storage=memory(),copied=[];storedQuote(storage);let calls=0;
 await withHooks(Toolkit,{storage,writeText:async value=>copied.push(value),transport:async()=>{calls++;return Response.json({error:'QA_PRIVATE_SERVER_DETAILS'},{status:401});}},async runner=>{
  await openToolkit(runner);assert.equal(reviewIn(runner).props.disabled,true);assert.ok(nodes(runner.current(),node=>node.type===SalesCopyButton).every(node=>node.props.disabled));assert.doesNotMatch(textIn(runner),/QA_PRIVATE_SERVER_DETAILS|Instrucciones de pago configuradas|pago confirmado/);buttonIn(runner,'Reintentar configuración').props.onClick();await runner.flush();assert.equal(calls,2);assert.equal(reviewIn(runner).props.disabled,true);assert.deepEqual(storage.reads,[]);assert.deepEqual(storage.writes,[]);assert.deepEqual(copied,[]);
 });
});

test('a new configuration lifetime immediately blanks payment instructions and rejects old edit and discard callbacks',async()=>{
 const storage=memory(),pending=deferred(),bindings=[];storedQuote(storage);
 await withHooks(Toolkit,{storage,onScopeReady:value=>bindings.push(value),transport:async()=>Response.json(config())},async runner=>{
  await openToolkit(runner);const oldEdit=fieldIn(runner,'quote-client').props.onChange;buttonIn(runner,'Descartar borrador').props.onClick();await runner.flush();const oldDiscard=buttonIn(runner,'Sí, descartar').props.onClick,raw=storage.values.get(salesDraftKey(scope)),index=runner.snapshots.length;
  await runner.update({transport:async()=>pending.promise});const first=nodes(runner.snapshots[index],node=>node.type===SalesQuoteReview)[0];assert.equal(first.props.disabled,true);assert.equal(first.props.input.paymentInstructions,'');assert.equal(bindings.at(-1),null);
  oldEdit({target:{value:'QA stale edit'}});oldDiscard();await runner.flush();assert.equal(fieldIn(runner,'quote-client').props.value,'QA saved quote A');assert.equal(storage.values.get(salesDraftKey(scope)),raw);assert.deepEqual(storage.writes,[]);assert.deepEqual(storage.removals,[]);assert.equal(reviewIn(runner).props.disabled,true);
 });
});

test('a contact import callback from a previous configuration lifetime cannot replace the quote',async()=>{
 const storage=memory(),pending=deferred();storedQuote(storage);const {SalesContactImport}=require('../src/components/admin/SalesToolkit.tsx');
 await withHooks(Toolkit,{storage,contactRequest:{sequence:1,contact:{reference:'EK-00000002',eventType:'XV años',design:'Granate',packageKey:'plus'}},transport:async()=>Response.json(config())},async runner=>{
  const panel=nodes(runner.current(),node=>node.type===SalesContactImport)[0];assert.ok(panel);const oldApply=panel.props.onApply;await runner.update({transport:async()=>pending.promise});oldApply();await runner.flush();assert.equal(fieldIn(runner,'quote-client').props.value,'QA saved quote A');assert.equal(reviewIn(runner).props.input.commercialReference,undefined);assert.deepEqual(storage.writes,[]);assert.equal(nodes(runner.current(),node=>node.type===SalesContactImport)[0].props.disabled,true);
 });
});

test('a stale configuration retry callback cannot start another read after a new configuration has succeeded',async()=>{
 const storage=memory(),bindings=[];let failedCalls=0,newCalls=0;
 await withHooks(Toolkit,{storage,onScopeReady:value=>bindings.push(value),transport:async()=>{failedCalls++;return Response.json({error:'No autorizado'},{status:401});}},async runner=>{
  await openToolkit(runner);const oldRetry=buttonIn(runner,'Reintentar configuración').props.onClick;await runner.update({transport:async()=>{newCalls++;return Response.json(config(otherScope));}});assert.equal(bindings.at(-1),otherScope);oldRetry();await runner.flush();assert.equal(failedCalls,1);assert.equal(newCalls,1);assert.equal(reviewIn(runner).props.disabled,false);assert.equal(bindings.at(-1),otherScope);
 });
});

test('stale copy handlers cannot copy after their action is disabled, changes its value or unmounts',async()=>{
 for(const change of ['disabled','value','unmount']){
  const copied=[];await withHooks(SalesCopyButton,{value:'QA old instructions',label:'Copiar',writeText:async value=>copied.push(value)},async runner=>{
   const old=buttonIn(runner,'Copiar').props.onClick;if(change==='unmount')runner.unmount();else await runner.update(change==='disabled'?{disabled:true}:{value:'QA current instructions'});old();await runner.flush();assert.deepEqual(copied,[]);
  });
 }
});
