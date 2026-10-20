// Bidirectional private history navigation with fictional records and isolated GETs.
// The hook harness exercises state/effects; DOM refs stay null and device acceptance is deferred.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react'),History=require('../src/components/admin/CommercialLeadHistory.tsx').default;
const {encodeCommercialHistoryCursor,decodeCommercialHistoryCursor}=require('../src/lib/commercial-history.ts');
const lead={id:'30000000-0000-4000-8000-000000000001',reference:'EK-A1B2C3D4',revision:2},other={id:'30000000-0000-4000-8000-000000000002',reference:'EK-00000002',revision:2};
const anchor='2025-01-03T12:00:00.123456Z',freshAnchor='2025-01-04T12:00:00.654321Z',createdAt='2024-01-02T12:00:00.654321Z';
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];
const memory=()=>({getItem:()=>null,setItem:()=>{throw Error('History must not write local data');},removeItem:()=>{throw Error('History must not remove local data');}});
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
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
 const runner={flush,current:()=>value,snapshots,audit,unmount,update:async patch=>{props={...props,...bind(patch)};dirty=true;return flush();}};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of names)React[name]=original[name];if(oldWindow===undefined)delete global.window;else global.window=oldWindow;if(oldDocument===undefined)delete global.document;else global.document=oldDocument;global.fetch=oldFetch;assert.equal(networkCalls,0);assert.ok(audit.every(call=>call.method==='GET'),'Read components must never send a PATCH');}
}

const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const textIn=runner=>text(runner.current()).replace(/\s+/g,' ');
const buttonIn=(runner,label)=>nodes(runner.current(),node=>node.type==='button'&&node.props.children===label)[0];
const click=async(runner,label)=>{const button=buttonIn(runner,label);assert.ok(button,'Expected explicit '+label+' action');assert.equal(!!button.props.disabled,false,label+' must be available');button.props.onClick();await runner.flush();};
const assertPage=(runner,index,asOf=anchor,tag='OLD')=>{assert.match(textIn(runner),new RegExp('Página\\s*'+index+'(?:\\D|$)'));assert.match(textIn(runner),new RegExp('QA_'+tag+'_PAGE_'+index+'_0'));assert.ok(textIn(runner).includes(new Date(asOf).toLocaleString('es-BO').replace(/\s+/g,' ')),'Visible cutoff must remain bound to the accepted page');};
function page(index=1,asOf=anchor,identity=lead,tag=asOf===freshAnchor?'FRESH':'OLD',empty=false){
 const entries=Array.from({length:empty?0:index===3?3:20},(_,offset)=>({id:'40000000-0000-4000-8000-'+String(100-(index-1)*20-offset).padStart(12,'0'),lead_id:identity.id,from_status:'contacted',to_status:'reserved',revenue_bs:200,note:'QA_'+tag+'_PAGE_'+index+'_'+offset,created_at:createdAt})),last=entries.at(-1),hasMore=!empty&&index<3;
 return{lead:{id:identity.id,reference:identity.reference},asOf,entries,pagination:{size:20,hasMore,nextCursor:hasMore?encodeCommercialHistoryCursor({leadId:identity.id,asOf,createdAt,id:last.id}):null}};
}
function location(url){
 const query=new URL(url,'https://qa.invalid');assert.equal(query.pathname,'/api/admin/commercial/history');assert.equal(query.searchParams.getAll('leadId').length,1);assert.ok([...query.searchParams.keys()].every(key=>['leadId','cursor','asOf'].includes(key)));
 const raw=query.searchParams.get('cursor'),asOf=query.searchParams.get('asOf');assert.ok(!(raw&&asOf),'Cursor and first-page anchor must never be combined');const cursor=raw?decodeCommercialHistoryCursor(raw):null;if(raw)assert.ok(cursor);
 const identity=query.searchParams.get('leadId')===other.id?other:lead,index=!cursor?1:cursor.id.endsWith('000000000081')?2:cursor.id.endsWith('000000000061')?3:0;assert.ok(index,'No fabricated sentinel or unknown cursor may be requested');
 return{query,raw,asOf:cursor?.asOf??asOf,index,identity};
}
const responseFor=(url,currentAnchor=anchor)=>{const target=location(url);return Response.json(page(target.index,target.asOf??currentAnchor,target.identity));};
async function setup(scenario,reply){
 const calls=[],transport=async(url,options)=>{calls.push({url,options});assert.equal(options?.cache,'no-store');return reply?reply(url,options,calls):responseFor(url);};
 await withHooks(History,{lead,transport},runner=>scenario({...runner,calls,transport}));
}
const open=runner=>click(runner,'Ver historial');

test('history is explicit and navigates 1 to 2 to 3 to 2 to 1 with one immutable cutoff and no sentinel cursor',async()=>{
 await setup(async runner=>{
  assert.deepEqual(runner.calls,[]);assert.equal(buttonIn(runner,'Anterior'),undefined);await open(runner);assertPage(runner,1);assert.equal(buttonIn(runner,'Anterior').props.disabled,true);assert.equal(buttonIn(runner,'Siguiente').props.disabled,false);
  await click(runner,'Siguiente');assertPage(runner,2);await click(runner,'Siguiente');assertPage(runner,3);assert.equal(buttonIn(runner,'Siguiente').props.disabled,true);await click(runner,'Anterior');assertPage(runner,2);await click(runner,'Anterior');assertPage(runner,1);assert.equal(buttonIn(runner,'Anterior').props.disabled,true);
  const requested=runner.calls.map(call=>location(call.url));assert.deepEqual(requested.map(value=>value.index),[1,2,3,2,1]);assert.equal(requested[0].asOf,null);assert.ok(requested.slice(1).every(value=>value.asOf===anchor));assert.equal(requested[4].raw,null);assert.equal(requested[4].query.searchParams.get('asOf'),anchor);assert.deepEqual(runner.calls.map(call=>call.options.method),[undefined,undefined,undefined,undefined,undefined]);assert.equal(nodes(runner.current(),node=>node.type==='form'||node.type==='input').length,0);
 });
});

test('failed forward navigation keeps page one and retries the exact cursor without changing its displayed cutoff',async()=>{
 let fail=true;await setup(async runner=>{
  await open(runner);await click(runner,'Siguiente');assertPage(runner,1);assert.ok(buttonIn(runner,'Reintentar consulta'));assert.match(textIn(runner),/consulta anterior|siguen visibles/);const failed=runner.calls.at(-1).url;assert.equal(location(failed).index,2);
  await click(runner,'Reintentar consulta');assertPage(runner,2);assert.equal(runner.calls.at(-1).url,failed);assert.equal(runner.calls.length,3);assert.equal(buttonIn(runner,'Reintentar consulta'),undefined);
 },url=>{if(location(url).index===2&&fail){fail=false;return Response.json({error:'QA_PRIVATE_INTERNAL'},{status:500});}return responseFor(url);});
});

test('failed backward navigation to either page two or anchored page one preserves the current page and exact retry target',async()=>{
 for(const target of [2,1]){
  let fail=false;await setup(async runner=>{
   await open(runner);await click(runner,'Siguiente');if(target===2)await click(runner,'Siguiente');assertPage(runner,target+1);fail=true;
   await click(runner,'Anterior');assertPage(runner,target+1);assert.ok(buttonIn(runner,'Reintentar consulta'));const failed=runner.calls.at(-1).url,request=location(failed);assert.equal(request.index,target);assert.equal(request.asOf,anchor);assert.equal(request.raw===null,target===1);
   await click(runner,'Reintentar consulta');assertPage(runner,target);assert.equal(runner.calls.at(-1).url,failed);assert.equal(buttonIn(runner,'Reintentar consulta'),undefined);
  },url=>{if(fail){fail=false;return target===1?Response.json(page(1,freshAnchor)):Response.json({error:'QA failure'},{status:500});}return responseFor(url);});
 }
});

test('failed fresh refresh retains page two and the old cutoff until an exact fresh retry succeeds with a new page one',async()=>{
 let mode='old';await setup(async runner=>{
  await open(runner);await click(runner,'Siguiente');assertPage(runner,2);mode='fail';await click(runner,'Actualizar historial');assertPage(runner,2);assert.ok(buttonIn(runner,'Reintentar consulta'));const failed=runner.calls.at(-1).url,request=location(failed);assert.equal(request.raw,null);assert.equal(request.asOf,null);mode='fresh';
  await click(runner,'Reintentar consulta');assertPage(runner,1,freshAnchor,'FRESH');assert.equal(runner.calls.at(-1).url,failed);assert.equal(buttonIn(runner,'Anterior').props.disabled,true);assert.doesNotMatch(textIn(runner),/QA_OLD_PAGE_2/);await click(runner,'Siguiente');assertPage(runner,2,freshAnchor,'FRESH');assert.equal(location(runner.calls.at(-1).url).asOf,freshAnchor);
 },url=>mode==='fail'?Response.json({error:'QA refresh failure'},{status:500}):responseFor(url,mode==='fresh'?freshAnchor:anchor));
});

test('rapid or stale navigation handlers cannot duplicate an in-flight request or resurrect a previously accepted page',async()=>{
 const pending=deferred();let deferredOnce=true;await setup(async runner=>{
  await open(runner);const oldNext=buttonIn(runner,'Siguiente').props.onClick,oldRefresh=buttonIn(runner,'Actualizar historial').props.onClick,oldPrevious=buttonIn(runner,'Anterior').props.onClick;
  oldNext();oldNext();oldRefresh();oldPrevious();await runner.flush();assert.equal(runner.calls.length,2);assertPage(runner,1);assert.equal(buttonIn(runner,'Siguiente').props.disabled,true);assert.equal(buttonIn(runner,'Anterior').props.disabled,true);assert.equal(buttonIn(runner,'Actualizar historial').props.disabled,true);
  oldNext();oldRefresh();await runner.flush();assert.equal(runner.calls.length,2);pending.resolve(responseFor(runner.calls[1].url));await runner.flush();assertPage(runner,2);oldNext();oldRefresh();oldPrevious();await runner.flush();assert.equal(runner.calls.length,2);assertPage(runner,2);
  await click(runner,'Anterior');assertPage(runner,1);const count=runner.calls.length;oldNext();oldRefresh();await runner.flush();assert.equal(runner.calls.length,count);assertPage(runner,1);
 },url=>{if(location(url).index===2&&deferredOnce){deferredOnce=false;return pending.promise;}return responseFor(url);});
});

test('a retry callback from an earlier failure cannot interrupt a new pending request or navigate after success',async()=>{
 const pending=deferred();let secondReads=0;await setup(async runner=>{
  await open(runner);await click(runner,'Siguiente');assertPage(runner,1);const oldRetry=buttonIn(runner,'Reintentar consulta').props.onClick;oldRetry();await runner.flush();assert.equal(runner.calls.length,3);const currentSignal=runner.calls[2].options.signal;
  oldRetry();await runner.flush();assert.equal(runner.calls.length,3);assert.equal(currentSignal.aborted,false);pending.resolve(responseFor(runner.calls[2].url));await runner.flush();assertPage(runner,2);oldRetry();await runner.flush();assert.equal(runner.calls.length,3);assertPage(runner,2);
 },url=>location(url).index===2?(++secondReads===1?Response.json({error:'QA failure'},{status:500}):pending.promise):responseFor(url));
});

test('closing, unmounting or changing history identity or transport invalidates callbacks and ignores late private responses',async()=>{
 for(const change of ['close','unmount','revision','contact','transport']){
  const pending=deferred();let bodyReads=0;await setup(async runner=>{
   await open(runner);const oldNext=buttonIn(runner,'Siguiente').props.onClick,oldRefresh=buttonIn(runner,'Actualizar historial').props.onClick;oldNext();await runner.flush();const aborted=runner.calls.at(-1).options.signal;
   if(change==='close')await click(runner,'Ocultar historial');else if(change==='unmount')runner.unmount();else if(change==='transport')await runner.update({transport:async url=>responseFor(url,freshAnchor)});else await runner.update({lead:change==='revision'?{...lead,revision:3}:other});
   assert.equal(aborted.aborted,true);const count=runner.audit.length;oldNext();oldRefresh();await runner.flush();assert.equal(runner.audit.length,count);pending.resolve({status:200,ok:true,json:async()=>{bodyReads++;return page(2,anchor,lead,'LATE_PRIVATE');}});await runner.flush();assert.equal(bodyReads,0);assert.doesNotMatch(textIn(runner),/QA_LATE_PRIVATE/);
   if(change==='close'){assert.equal(buttonIn(runner,'Anterior'),undefined);assert.ok(buttonIn(runner,'Ver historial'));}else if(change!=='unmount'){assert.equal(buttonIn(runner,'Anterior').props.disabled,true);assert.match(textIn(runner),/Página\s*1/);}
  },url=>location(url).index===2?pending.promise:responseFor(url));
 }
});

test('an empty first history page remains page one with both directions disabled and refresh stays explicit',async()=>{
 let reads=0;await setup(async runner=>{
  assert.deepEqual(runner.calls,[]);await open(runner);assert.equal(reads,1);assert.match(textIn(runner),/Página\s*1/);assert.match(textIn(runner),/Aún no hay cambios registrados/);assert.equal(buttonIn(runner,'Anterior').props.disabled,true);assert.equal(buttonIn(runner,'Siguiente').props.disabled,true);assert.equal(buttonIn(runner,'Actualizar historial').props.disabled,false);await runner.flush();assert.equal(reads,1);await click(runner,'Actualizar historial');assert.equal(reads,2);assert.equal(location(runner.calls.at(-1).url).asOf,null);
 },url=>{reads++;return Response.json(page(1,anchor,location(url).identity,'EMPTY',true));});
});

