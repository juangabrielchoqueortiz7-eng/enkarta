// Real PartnerDesignPicker hooks and catalog, with fictional responses and no browser/network.
// DOM refs are not mounted: these verify transitions and native semantics, not device acceptance.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react');let navigation;
require.cache[require.resolve('next/navigation')]={exports:{useRouter:()=>navigation}};
const Picker=require('../src/components/partners/PartnerDesignPicker.tsx').default,{collectionCatalog}=require('../src/lib/collection-catalog.ts'),{draftCap}=require('../src/lib/partner-plans.ts');
const catalog=collectionCatalog(),invitationId='30000000-0000-4000-8000-000000000001';
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];
const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const buttons=runner=>nodes(runner.current(),node=>node.type==='button');
const cards=runner=>nodes(runner.current(),node=>node.type==='article');
const samples=runner=>cards(runner).map(card=>({key:card.key,image:nodes(card,node=>node.type==='img')[0].props.src,alt:nodes(card,node=>node.type==='img')[0].props.alt,href:nodes(card,node=>node.type==='a')[0].props.href}));
const alertText=runner=>nodes(runner.current(),node=>node.props.role==='alert').map(node=>text(node)).join(' ');
async function withPicker(scenario,{props={},reply,pushError=false}={}){
 const hookNames=['useState','useRef','useEffect'],original=Object.fromEntries(hookNames.map(name=>[name,React[name]])),oldFetch=global.fetch,slots=[],snapshots=[],calls=[],pushes=[];let cursor=0,dirty=true,tree,effects=[],unmounted=false;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((item,index)=>Object.is(item,b[index]));
 React.useState=initial=>{const index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initial==='function'?initial():initial};slot.set=next=>{next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useRef=initial=>{const index=cursor++;return slots[index]??(slots[index]={current:initial});};
 React.useEffect=(effect,deps)=>{const index=cursor++,previous=slots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 navigation={push:url=>{pushes.push(url);if(pushError)throw Error('QA_PRIVATE_ROUTER_FAILURE');}};
 global.fetch=async(url,options)=>{const call={url,method:options?.method,body:options?.body?JSON.parse(options.body):null,headers:options?.headers};calls.push(call);return reply?reply(call,calls):Response.json({id:invitationId},{status:201});};
 const input={plan:'inicio',canPublish:false,totalInvitations:0,...props};
 const flush=async()=>{for(let round=0;round<25;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];tree=Picker(input);snapshots.push(tree);for(const effect of effects)effect();}await new Promise(resolve=>setImmediate(resolve));if(!dirty||unmounted)return tree;}throw Error('Picker effects did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const runner={current:()=>tree,flush,unmount,calls,pushes,snapshots};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of hookNames)React[name]=original[name];global.fetch=oldFetch;assert.ok(calls.every(call=>call.url==='/api/partner/invitations'&&call.method==='POST'),'Only the explicit isolated draft creation endpoint may be called');}
}

test('rapid same and different design actions share one synchronous creation lock before rerender',async()=>{
 const pending=deferred();await withPicker(async runner=>{
  assert.deepEqual(runner.calls,[]);const initial=buttons(runner);assert.ok(initial.length>1);const first=initial[0].props.onClick();initial[0].props.onClick();initial[1].props.onClick();assert.equal(runner.calls.length,1);assert.deepEqual(runner.calls[0].body,{template:catalog[0].key});await runner.flush();assert.ok(buttons(runner).every(value=>value.props.disabled));assert.equal(buttons(runner)[0].props['aria-busy'],true);assert.equal(buttons(runner)[1].props['aria-busy'],undefined);assert.match(text(runner.current()),/Creando…/);assert.deepEqual(runner.pushes,[]);
  pending.resolve(Response.json({id:invitationId},{status:201}));await first;await runner.flush();assert.deepEqual(runner.pushes,['/socios/constructor/'+invitationId]);assert.equal(runner.calls.length,1);
 },{reply:()=>pending.promise});
});

test('the creation lock remains held while the response JSON is being read',async()=>{
 const body=deferred();await withPicker(async runner=>{
  const first=buttons(runner)[0].props.onClick();await runner.flush();buttons(runner)[1].props.onClick();await runner.flush();assert.equal(runner.calls.length,1);assert.deepEqual(runner.pushes,[]);body.resolve({id:invitationId});await first;await runner.flush();assert.deepEqual(runner.pushes,['/socios/constructor/'+invitationId]);assert.ok(buttons(runner).every(value=>value.props.disabled));
 },{reply:()=>({status:201,ok:true,json:()=>body.promise})});
});

test('a verified creation navigates once, remains locked while routing and preserves the chosen catalog design and originals',async()=>{
 const chosen=catalog.at(-1);await withPicker(async runner=>{
  const before=samples(runner),first=buttons(runner)[0];assert.equal(before[0].alt,chosen.name);assert.equal(before[0].image,chosen.image);assert.equal(before[0].href,chosen.demoPath);assert.equal(first.props.type,'button');assert.match(first.props.className,/focus-visible/);const oldOther=buttons(runner)[1].props.onClick;
  await first.props.onClick();await runner.flush();oldOther();buttons(runner)[0].props.onClick();await runner.flush();assert.deepEqual(runner.calls.map(call=>call.body),[{template:chosen.key}]);assert.deepEqual(runner.pushes,['/socios/constructor/'+invitationId]);assert.ok(buttons(runner).every(value=>value.props.disabled));assert.match(text(runner.current()),/Borrador creado\. Abriendo el constructor…/);assert.deepEqual(samples(runner),before);assert.match(text(runner.current()),/Conservamos tu elección/);assert.doesNotMatch(alertText(runner),/./);
 },{props:{selectedDesign:chosen.key}});
});

test('every plan capacity blocks creation while keeping original preview links available',async()=>{
 for(const plan of ['inicio','estudio','agencia']){
  await withPicker(async runner=>{
   assert.equal(runner.calls.length,0);assert.ok(buttons(runner).every(value=>value.props.disabled));await buttons(runner)[0].props.onClick();await runner.flush();assert.deepEqual(runner.calls,[]);assert.deepEqual(runner.pushes,[]);assert.match(text(runner.current()),/Llegaste al límite/);assert.equal(samples(runner).length,catalog.length);assert.ok(samples(runner).every(value=>value.href&&value.image));
  },{props:{plan,totalInvitations:draftCap(plan)}});
 }
});

test('a definitive HTTP rejection releases the lock and allows one corrected explicit attempt',async()=>{
 for(const status of [400,401,403,409,422]){
  await withPicker(async runner=>{
   await buttons(runner)[0].props.onClick();await runner.flush();assert.equal(runner.calls.length,1);assert.ok(buttons(runner).every(value=>!value.props.disabled));assert.match(alertText(runner),/QA rejected selection/);assert.deepEqual(runner.pushes,[]);
   await buttons(runner)[1].props.onClick();await runner.flush();assert.equal(runner.calls.length,2);assert.equal(runner.calls[1].body.template,catalog[1].key);assert.deepEqual(runner.pushes,['/socios/constructor/'+invitationId]);assert.equal(alertText(runner),'');
  },{reply:(_call,calls)=>calls.length===1?Response.json({error:'QA rejected selection'},{status}):Response.json({id:invitationId},{status:201})});
 }
});

test('an unreadable definitive rejection still allows correction without presenting a successful creation',async()=>{
 await withPicker(async runner=>{
  await buttons(runner)[0].props.onClick();await runner.flush();assert.ok(buttons(runner).every(value=>!value.props.disabled));assert.match(alertText(runner),/No se pudo crear el borrador/);assert.deepEqual(runner.pushes,[]);assert.doesNotMatch(text(runner.current()),/Borrador creado/);await buttons(runner)[1].props.onClick();await runner.flush();assert.equal(runner.calls.length,2);assert.equal(runner.pushes.length,1);
 },{reply:(_call,calls)=>calls.length===1?{ok:false,status:400,json:async()=>{throw Error('QA_PRIVATE_BODY');}}:Response.json({id:invitationId},{status:201})});
});

test('network, incomplete, invalid-success and server failures remain uncertain without retrying a possible creation',async()=>{
 const replies=[
  async()=>{throw Error('QA_PRIVATE_NETWORK');},
  ()=>({ok:true,status:201,json:async()=>{throw Error('QA_PRIVATE_JSON');}}),
  ()=>Response.json({status:'draft'},{status:201}),
  ()=>Response.json({id:'https://qa.invalid/invalid'},{status:201}),
  ()=>Response.json({error:'QA_PRIVATE_SERVER'},{status:500}),
 ];
 for(const reply of replies)await withPicker(async runner=>{
  const old=buttons(runner)[0].props.onClick;await old();await runner.flush();assert.equal(runner.calls.length,1);assert.ok(buttons(runner).every(value=>value.props.disabled));assert.ok(buttons(runner).every(value=>value.props['aria-busy']===undefined));assert.equal(buttons(runner)[0].props.children,'Sin confirmar');assert.match(alertText(runner),/No pudimos comprobar si se creó el borrador/);assert.ok(nodes(nodes(runner.current(),node=>node.props.role==='alert')[0],node=>node.type==='a'&&node.props.href==='/socios/panel'&&text(node)==='Revisar mis invitaciones').length);assert.doesNotMatch(text(runner.current()),/QA_PRIVATE|Borrador creado/);
  old();buttons(runner)[1].props.onClick();await runner.flush();await runner.flush();assert.equal(runner.calls.length,1);assert.deepEqual(runner.pushes,[]);
 },{reply});
});

test('a router failure after verified creation offers the exact existing draft and does not create or navigate again',async()=>{
 await withPicker(async runner=>{
  await buttons(runner)[0].props.onClick();await runner.flush();assert.equal(runner.calls.length,1);assert.equal(runner.pushes.length,1);assert.match(alertText(runner),/El borrador se creó/);assert.doesNotMatch(alertText(runner),/QA_PRIVATE/);assert.ok(nodes(runner.current(),node=>node.type==='a'&&node.props.href==='/socios/constructor/'+invitationId&&text(node)==='Abrir el borrador').length);assert.ok(buttons(runner).every(value=>value.props.disabled));await buttons(runner)[1].props.onClick();await runner.flush();assert.equal(runner.calls.length,1);assert.equal(runner.pushes.length,1);
 },{pushError:true});
});

test('leaving during fetch or JSON reading prevents late navigation and stale handlers cannot create another draft',async()=>{
 for(const phase of ['fetch','json']){
  const pending=deferred();let bodyReads=0;await withPicker(async runner=>{
   const old=buttons(runner)[0].props.onClick,operation=old();await runner.flush();runner.unmount();const count=runner.snapshots.length;pending.resolve(phase==='fetch'?{ok:true,status:201,json:async()=>{bodyReads++;return{id:invitationId};}}:{id:invitationId});await operation;await runner.flush();await old();assert.equal(runner.calls.length,1);assert.deepEqual(runner.pushes,[]);assert.equal(runner.snapshots.length,count);assert.equal(bodyReads,phase==='fetch'?0:1);
  },{reply:()=>phase==='fetch'?pending.promise:{ok:true,status:201,json:()=>{bodyReads++;return pending.promise;}}});
 }
});
