// Real Dashboard/InvitationsTab and partnerRequest; fictional rows, fake clock and transport.
// DOM refs are not mounted. This suite does not certify browser/mobile acceptance.
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react');let navigation;
require.cache[require.resolve('next/navigation')]={exports:{useRouter:()=>navigation}};
const Dashboard=require('../src/components/partners/PartnerDashboard.tsx').default,{subscriptionState,planQuota}=require('../src/lib/partner-plans.ts');
const {PARTNER_REQUEST_TIMEOUT_MS:TIMEOUT}=require('../src/lib/partner-checkout.ts');
const id='30000000-0000-4000-8000-000000000001',otherId='30000000-0000-4000-8000-000000000002',stamp='2026-10-20T12:00:00.000Z';
const invitation=(patch={})=>({id,slug:'qa-socio-uno',status:'draft',template:'perla',type:'boda',names:'QA Familia Uno',event_date:'2027-02-20',cover_image_url:'/qa-private-cover.jpg',created_at:stamp,...patch});
const account=(patch={})=>({profile:{email:'qa@example.invalid',name:'QA prueba',avatar:'',brand:'QA marca',phone:'',city:'',status:'active',memberSince:stamp},subscription:subscriptionState({plan_key:'inicio',status:'active',current_period_end:'2099-01-01T00:00:00.000Z'}),quota:planQuota('inicio',0),totalInvitations:2,payments:[],billing:{instructions:'QA ficticio. Sin pagos.',qrUrl:'',whatsapp:'',configured:false,provider:'manual',ready:true},...patch});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];
const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const button=(runner,label)=>nodes(runner.current(),node=>node.type==='button'&&text(node).trim()===label)[0];
const parentButton=(runner,label)=>nodes(runner.parent(),node=>node.type==='button'&&text(node).trim()===label)[0];
const cards=runner=>nodes(runner.current(),node=>node.type==='article');
const cardId=card=>String(card.key).split('$').at(-1);
const rowButton=(runner,which,label)=>nodes(cards(runner).find(card=>cardId(card)===which),node=>node.type==='button'&&text(node).trim()===label)[0];
const mutations=runner=>runner.calls.filter(call=>['PATCH','DELETE'].includes(call.method));
const okList=rows=>Response.json({invitations:rows,quota:planQuota('inicio',rows.filter(row=>row.status==='ready').length)});
const okPatch=(row=invitation({status:'ready'}))=>Response.json({invitation:row,quota:planQuota('inicio',row.status==='ready'?1:0)});
const observe=promise=>{const state={done:false};Promise.resolve(promise).then(()=>{state.done=true;},error=>{state.done=true;state.error=error;});return state;};
function clock(t){let now=1_800_000_000_000,serial=0;const timers=new Map();t.mock.method(Date,'now',()=>now);t.mock.method(global,'setTimeout',(callback,delay)=>{const id=++serial;timers.set(id,{callback,at:now+delay});return id;});t.mock.method(global,'clearTimeout',id=>timers.delete(id));t.mock.method(global,'setInterval',(callback,delay)=>{const id=++serial;timers.set(id,{callback,at:now+delay,interval:delay});return id;});t.mock.method(global,'clearInterval',id=>timers.delete(id));return{timers,tick:ms=>{now+=ms;for(let index=0;index<500;index++){const pending=[...timers].filter(([,timer])=>timer.at<=now).sort((a,b)=>a[1].at-b[1].at)[0];if(!pending)return;timers.delete(pending[0]);if(pending[1].interval)timers.set(pending[0],{...pending[1],at:now+pending[1].interval});pending[1].callback();}assert.fail('Unexpected invitation-action timer loop');}};}
async function withDashboard(scenario,{rows=[invitation(),invitation({id:otherId,slug:'qa-socio-dos',names:'QA Familia Dos'})],initial=account(),reply,confirm=true}={}){
 const hookNames=['useState','useRef','useEffect','useMemo','useCallback'],oldHooks=Object.fromEntries(hookNames.map(name=>[name,React[name]])),old={fetch:global.fetch,window:global.window,document:global.document,confirm:global.confirm},oldNavigator=Object.getOwnPropertyDescriptor(global,'navigator');
 const fibers=new Map(),calls=[],snapshots=[],routes=[],confirmations=[],clipboard=[];let fiber,cursor=0,dirty=true,parentTree,tree,effects=[],unmounted=false,lateWrites=0;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 React.useState=initial=>{const slots=fiber.slots,index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initial==='function'?initial():initial};slot.set=next=>{if(unmounted){lateWrites++;return;}next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useRef=initial=>{const index=cursor++;return fiber.slots[index]??(fiber.slots[index]={current:initial});};
 React.useMemo=(make,deps)=>{const slots=fiber.slots,index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:make(),deps};return slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const slots=fiber.slots,index=cursor++,previous=slots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 navigation={push:url=>routes.push(url),replace:url=>routes.push(url),refresh:()=>{}};
 Object.defineProperty(global,'navigator',{configurable:true,value:{clipboard:{writeText:async value=>clipboard.push(value)}}});
 global.confirm=message=>{confirmations.push(message);return confirm;};global.window={setTimeout,clearTimeout,setInterval,clearInterval,confirm:global.confirm,location:{href:'https://qa.invalid/socios/panel',origin:'https://qa.invalid'},history:{replaceState:()=>{}}};global.document={visibilityState:'visible'};
 global.fetch=async(url,options={})=>{const call={url,method:options.method??'GET',body:options.body,signal:options.signal};calls.push(call);if(reply)return reply(call,calls);if(call.method==='GET'&&url==='/api/partner/invitations')return okList(rows);if(call.method==='GET'&&url==='/api/partner/account')return Response.json(initial);if(call.method==='PATCH')return okPatch();if(call.method==='DELETE')return Response.json({success:true});throw Error('Unexpected isolated request');};
 const render=(key,Component,props)=>{fiber=fibers.get(key);if(!fiber){fiber={slots:[]};fibers.set(key,fiber);}cursor=0;return Component(props);};
 const flush=async()=>{for(let round=0;round<40;round++){if(dirty&&!unmounted){dirty=false;effects=[];parentTree=render('parent',Dashboard,{initialAccount:initial});const child=nodes(parentTree,node=>['InvitationsTab','SubscriptionTab','AccountTab'].includes(node.type?.name))[0];tree=child?render(child.type.name,child.type,child.props):parentTree;snapshots.push(tree);for(const effect of effects)effect();}await new Promise(done=>setImmediate(done));if(!dirty||unmounted)return tree;}throw Error('Invitation action hooks did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const value of fibers.values())for(const slot of value.slots)slot?.cleanup?.();};
 const runner={current:()=>tree,parent:()=>parentTree,child:()=>nodes(parentTree,node=>['InvitationsTab','SubscriptionTab','AccountTab'].includes(node.type?.name))[0],calls,snapshots,routes,confirmations,clipboard,flush,unmount,lateWrites:()=>lateWrites,tab:async label=>{parentButton(runner,label).props.onClick();await flush();}};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of hookNames)React[name]=oldHooks[name];for(const[key,value]of Object.entries(old)){if(value===undefined)delete global[key];else global[key]=value;}if(oldNavigator)Object.defineProperty(global,'navigator',oldNavigator);else delete global.navigator;assert.ok(calls.every(call=>/^\/api\/partner\/(invitations|account|payments(?:\/receipt)?)(?:\?|$)/.test(call.url)),'Only the isolated partner endpoints are permitted');}
}

test('rapid same-row and other-row publish/delete actions share one synchronous global mutation lock',async t=>{
 clock(t);const wait=deferred();await withDashboard(async runner=>{
  const first=rowButton(runner,id,'Publicar').props.onClick,other=rowButton(runner,otherId,'Publicar').props.onClick,remove=rowButton(runner,otherId,'Eliminar').props.onClick;
  const work=observe(first());first();other();remove();await runner.flush();
  try{assert.equal(mutations(runner).length,1);assert.equal(mutations(runner)[0].method,'PATCH');assert.deepEqual(JSON.parse(mutations(runner)[0].body),{id,status:'ready'});assert.ok(cards(runner).every(card=>nodes(card,node=>node.type==='button'&&['Publicar','Despublicar','Eliminar','…'].includes(text(node))).every(node=>node.props.disabled)));}
  finally{wait.resolve(okPatch());await runner.flush();}assert.equal(work.done,true);
 },{reply:call=>call.method==='PATCH'||call.method==='DELETE'?wait.promise:call.url==='/api/partner/invitations'?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(account())});
});

test('two rapid confirmations cannot dispatch duplicate DELETE or another publish while deletion is pending',async t=>{
 clock(t);const wait=deferred();await withDashboard(async runner=>{
  const remove=rowButton(runner,id,'Eliminar').props.onClick,publish=rowButton(runner,otherId,'Publicar').props.onClick;observe(remove());remove();publish();await runner.flush();
  try{assert.equal(mutations(runner).length,1);assert.equal(mutations(runner)[0].method,'DELETE');assert.equal(runner.confirmations.length,1);}
  finally{wait.resolve(Response.json({success:true}));await runner.flush();}
 },{reply:call=>['PATCH','DELETE'].includes(call.method)?wait.promise:call.url==='/api/partner/invitations'?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(account())});
});

test('a suspended PATCH transport releases busy after 25 seconds and blocks retained handlers until explicit verification',async t=>{
 const fake=clock(t),wait=deferred();let lateBody=0;await withDashboard(async runner=>{
  const old=rowButton(runner,id,'Publicar').props.onClick,work=observe(old());await runner.flush();fake.tick(TIMEOUT);await runner.flush();
  try{assert.equal(work.done,true);assert.ok(button(runner,'Actualizar invitaciones'));assert.equal(button(runner,'Actualizar invitaciones').props.disabled,false);assert.match(text(runner.parent())+' '+text(runner.current()),/Actualizar invitaciones|25 segundos/);old();await runner.flush();assert.equal(mutations(runner).length,1);assert.equal(cards(runner).length,2);assert.ok(rowButton(runner,id,'Publicar').props.disabled);}
  finally{wait.resolve({ok:true,status:200,json:async()=>{lateBody++;return{invitation:invitation({status:'ready'}),quota:planQuota('inicio',1)};}});await runner.flush();}assert.equal(lateBody,0);assert.ok(rowButton(runner,id,'Publicar'));assert.equal(mutations(runner).length,1);
 },{reply:call=>call.method==='PATCH'?wait.promise:call.url==='/api/partner/invitations'?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(account())});
});

test('a suspended PATCH JSON body shares the deadline and a late reply cannot publish the visible card',async t=>{
 const fake=clock(t),body=deferred();await withDashboard(async runner=>{
  const work=observe(rowButton(runner,id,'Publicar').props.onClick());await runner.flush();fake.tick(TIMEOUT);await runner.flush();
  try{assert.equal(work.done,true);assert.equal(button(runner,'Actualizar invitaciones').props.disabled,false);assert.ok(rowButton(runner,id,'Publicar').props.disabled);}
  finally{body.resolve({invitation:invitation({status:'ready'}),quota:planQuota('inicio',1)});await runner.flush();}assert.ok(rowButton(runner,id,'Publicar'));assert.equal(mutations(runner).length,1);
 },{reply:call=>call.method==='PATCH'?{ok:true,status:200,json:()=>body.promise}:call.url==='/api/partner/invitations'?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(account())});
});

test('a successful PATCH must identify the same complete invitation and requested status before replacing a card',async t=>{
 clock(t);for(const value of [{},null,{invitation:invitation({id:otherId,status:'ready'})},{invitation:invitation({status:'draft'})},{invitation:{id,status:'ready'}},{invitation:invitation({status:'ready',template:null})}]){
  await withDashboard(async runner=>{
   await rowButton(runner,id,'Publicar').props.onClick();await runner.flush();assert.equal(cards(runner).length,2);assert.ok(rowButton(runner,id,'Publicar'));assert.ok(rowButton(runner,id,'Publicar').props.disabled);assert.doesNotMatch(text(runner.parent()),/Invitación publicada\. Ya puedes compartir/);assert.equal(mutations(runner).length,1);assert.ok(button(runner,'Actualizar invitaciones'));
  },{reply:call=>call.method==='PATCH'?Response.json(value):call.url==='/api/partner/invitations'?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(account())});
 }
});

test('DELETE requires a true canonical acknowledgement and never removes a card on empty, malformed or false success',async t=>{
 clock(t);for(const result of [{},null,{success:false},{success:'true'}])await withDashboard(async runner=>{
  await rowButton(runner,id,'Eliminar').props.onClick();await runner.flush();assert.equal(cards(runner).length,2);assert.ok(rowButton(runner,id,'Eliminar').props.disabled);assert.equal(mutations(runner).length,1);assert.ok(button(runner,'Actualizar invitaciones'));
 },{reply:call=>call.method==='DELETE'?Response.json(result):call.url==='/api/partner/invitations'?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(account())});
});

test('uncertainty survives tabs and only an explicit complete invitation/account read enables another mutation',async t=>{
 clock(t);let write=0,listReads=0,accountReads=0;await withDashboard(async runner=>{
  const old=rowButton(runner,id,'Publicar').props.onClick;await old();await runner.flush();assert.ok(rowButton(runner,id,'Publicar').props.disabled);
  await runner.tab('Mi cuenta');await runner.tab('Mis invitaciones');assert.ok(rowButton(runner,id,'Publicar').props.disabled);old();await runner.flush();assert.equal(write,1);
  const refresh=button(runner,'Actualizar invitaciones');assert.ok(refresh);await refresh.props.onClick();await runner.flush();assert.ok(rowButton(runner,id,'Publicar').props.disabled,'An incomplete account must not resolve uncertainty');
  await button(runner,'Actualizar invitaciones').props.onClick();await runner.flush();assert.ok(rowButton(runner,id,'Publicar').props.disabled,'A complete but incoherent count must not resolve uncertainty');
  await button(runner,'Actualizar invitaciones').props.onClick();await runner.flush();assert.equal(rowButton(runner,id,'Publicar').props.disabled,false);await rowButton(runner,id,'Publicar').props.onClick();await runner.flush();assert.equal(write,2);assert.ok(rowButton(runner,id,'Despublicar'));
 },{reply:call=>{
  if(call.method==='PATCH'){write++;return write===1?Promise.reject(Error('QA_PRIVATE_NETWORK')):okPatch();}
  if(call.url==='/api/partner/invitations'){listReads++;return okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]);}
  accountReads++;return Response.json(accountReads===1?{profile:{}}:accountReads===2?account({totalInvitations:99,quota:planQuota('inicio',1)}):account({quota:planQuota('inicio',write>1?1:0)}));
 }});assert.ok(listReads>=4);assert.ok(accountReads>=3);
});

test('an older list response cannot revert a confirmed publication or resurrect a confirmed deletion',async t=>{
 clock(t);for(const method of ['PATCH','DELETE']){
  const old=deferred(),original=[invitation(),invitation({id:otherId,slug:'qa-socio-dos'})];let listReads=0,live=original;
  await withDashboard(async runner=>{
   // The initial list is deliberately pending; a newer explicit read provides cards.
   const refresh=button(runner,'Actualizar invitaciones');
   try{
    assert.ok(refresh);await refresh.props.onClick();await runner.flush();assert.ok(rowButton(runner,id,'Publicar'));await rowButton(runner,id,method==='PATCH'?'Publicar':'Eliminar').props.onClick();await runner.flush();
    if(method==='PATCH')assert.ok(rowButton(runner,id,'Despublicar'));else{assert.equal(cards(runner).length,1);assert.equal(cardId(cards(runner)[0]),otherId);}
   }finally{old.resolve(okList(original));await runner.flush();}
   if(method==='PATCH')assert.ok(rowButton(runner,id,'Despublicar'));else{assert.equal(cards(runner).length,1);assert.equal(cardId(cards(runner)[0]),otherId);}
   assert.equal(mutations(runner).length,1);assert.equal(rowButton(runner,otherId,'Publicar').props.disabled,false);
  },{reply:call=>{
   if(call.method==='PATCH'){live=live.map(value=>value.id===id?{...value,status:'ready'}:value);return okPatch(live.find(value=>value.id===id));}
   if(call.method==='DELETE'){live=live.filter(value=>value.id!==id);return Response.json({success:true});}
   return call.url==='/api/partner/invitations'?(++listReads===1?old.promise:okList(live)):Response.json(account({totalInvitations:live.length,quota:planQuota('inicio',live.filter(value=>value.status==='ready').length)}));
  }});
 }
});

test('malformed, incomplete and duplicate invitation lists retain the previous verified cards',async t=>{
 clock(t);let read=0;const invalids=[{}, {invitations:[invitation(),invitation()]}, {invitations:[invitation({template:null})]}];await withDashboard(async runner=>{
  for(let index=0;index<invalids.length;index++){const refresh=button(runner,'Actualizar invitaciones');assert.ok(refresh);await refresh.props.onClick();await runner.flush();assert.equal(cards(runner).length,2);assert.ok(rowButton(runner,id,'Publicar'));assert.match(text(runner.parent())+' '+text(runner.current()),/verificar|consultar|completa|válida/);}
 },{reply:call=>call.url==='/api/partner/invitations'?++read===1?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(invalids[read-2]):Response.json(account())});
});

test('an uncertain pause does not allow a retained copy-link action to announce the old published state as current',async t=>{
 const fake=clock(t),wait=deferred(),rows=[invitation({status:'ready'}),invitation({id:otherId,slug:'qa-socio-dos'})];await withDashboard(async runner=>{
  const copy=rowButton(runner,id,'Copiar enlace').props.onClick,work=observe(rowButton(runner,id,'Despublicar').props.onClick());await runner.flush();fake.tick(TIMEOUT);await runner.flush();
  try{assert.equal(work.done,true);const currentCopy=rowButton(runner,id,'Copiar enlace');assert.ok(!currentCopy||currentCopy.props.disabled);await copy();await runner.flush();assert.deepEqual(runner.clipboard,[]);assert.doesNotMatch(text(runner.current()),/Copiado/);}
  finally{wait.resolve(okPatch(invitation({status:'disabled'})));await runner.flush();}
 },{rows,initial:account({quota:planQuota('inicio',1)}),reply:call=>call.method==='PATCH'?wait.promise:call.url==='/api/partner/invitations'?okList(rows):Response.json(account({quota:planQuota('inicio',1)}))});
});

test('billing rejection keeps the subscription guidance and requires a verified refresh before another action',async t=>{
 clock(t);for(const payload of [{error:'QA suscripción requerida',code:'SUBSCRIPTION_REQUIRED'},{error:'QA cuota alcanzada',code:'QUOTA_REACHED'},{error:'QA suscripción requerida',needsSubscription:true}])await withDashboard(async runner=>{
  await rowButton(runner,id,'Publicar').props.onClick();await runner.flush();assert.equal(runner.child().type.name,'SubscriptionTab');await runner.tab('Mis invitaciones');assert.ok(rowButton(runner,id,'Publicar').props.disabled);assert.equal(cards(runner).length,2);assert.equal(mutations(runner).length,1);
  await button(runner,'Actualizar invitaciones').props.onClick();await runner.flush();assert.equal(rowButton(runner,id,'Publicar').props.disabled,false);
 },{reply:call=>call.method==='PATCH'?Response.json(payload,{status:402}):call.url==='/api/partner/invitations'?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(account())});
});

test('a nonbilling rejection preserves the card and only allows a corrected action after explicit verification',async t=>{
 clock(t);let attempts=0;await withDashboard(async runner=>{
  await rowButton(runner,id,'Publicar').props.onClick();await runner.flush();assert.equal(runner.child().type.name,'InvitationsTab');assert.ok(rowButton(runner,id,'Publicar').props.disabled);assert.match(text(runner.parent()),/QA requiere publicar versión/);assert.doesNotMatch(text(runner.parent()),/Invitación publicada\. Ya puedes compartir/);
  await button(runner,'Actualizar invitaciones').props.onClick();await runner.flush();assert.equal(rowButton(runner,id,'Publicar').props.disabled,false);
  await rowButton(runner,id,'Publicar').props.onClick();await runner.flush();assert.equal(attempts,2);assert.ok(rowButton(runner,id,'Despublicar'));assert.equal(cards(runner).length,2);
 },{reply:call=>call.method==='PATCH'?++attempts===1?Response.json({error:'QA requiere publicar versión',code:'PUBLICATION_REQUIRED'},{status:409}):okPatch():call.url==='/api/partner/invitations'?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(account({quota:planQuota('inicio',attempts>1?1:0)}))});
});

test('an HTTP server error after possible publication never enables an immediate repeat or invents success',async t=>{
 clock(t);for(const status of [400,401,403,409,429,500,503])await withDashboard(async runner=>{
  const old=rowButton(runner,id,'Publicar').props.onClick;await old();await runner.flush();assert.ok(rowButton(runner,id,'Publicar').props.disabled);assert.ok(button(runner,'Actualizar invitaciones'));assert.doesNotMatch(text(runner.parent()),/Invitación publicada\. Ya puedes compartir/);old();await runner.flush();assert.equal(mutations(runner).length,1);assert.equal(cards(runner).length,2);
 },{reply:call=>call.method==='PATCH'?Response.json({error:'QA resultado no comprobado'},{status}):call.url==='/api/partner/invitations'?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(account())});
});

test('an incomplete DELETE body ends its wait but retains the invitation and blocks an uncertain repeated deletion',async t=>{
 const fake=clock(t),body=deferred();await withDashboard(async runner=>{
  const old=rowButton(runner,id,'Eliminar').props.onClick,work=observe(old());await runner.flush();fake.tick(TIMEOUT);await runner.flush();
  try{assert.equal(work.done,true);assert.equal(cards(runner).length,2);assert.equal(button(runner,'Actualizar invitaciones').props.disabled,false);old();await runner.flush();assert.equal(mutations(runner).length,1);assert.ok(rowButton(runner,id,'Eliminar').props.disabled);}
  finally{body.resolve({success:true});await runner.flush();}assert.equal(cards(runner).length,2);assert.equal(mutations(runner).length,1);
 },{reply:call=>call.method==='DELETE'?{ok:true,status:200,json:()=>body.promise}:call.url==='/api/partner/invitations'?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(account())});
});

test('confirmed publish, pause and deletion keep their exact semantics and pending snapshots never substitute another card',async t=>{
 clock(t);const fixtures=[invitation(),invitation({id:otherId,slug:'qa-socio-dos',names:'QA Familia Dos'})];let published=false,deleted=false;await withDashboard(async runner=>{
  await rowButton(runner,id,'Publicar').props.onClick();await runner.flush();assert.ok(rowButton(runner,id,'Despublicar'));assert.equal(rowButton(runner,id,'Despublicar').props.disabled,false);assert.equal(rowButton(runner,otherId,'Publicar').props.disabled,false);assert.equal(cards(runner).length,2);
  await rowButton(runner,id,'Despublicar').props.onClick();await runner.flush();assert.ok(rowButton(runner,id,'Publicar'));assert.equal(rowButton(runner,id,'Publicar').props.disabled,false);assert.equal(JSON.parse(mutations(runner)[1].body).status,'draft');
  await rowButton(runner,id,'Eliminar').props.onClick();await runner.flush();assert.equal(cards(runner).length,1);assert.equal(cardId(cards(runner)[0]),otherId);assert.equal(rowButton(runner,otherId,'Publicar').props.disabled,false);assert.equal(button(runner,'Actualizar invitaciones').props.disabled,false);assert.equal(runner.confirmations.length,1);assert.deepEqual(mutations(runner).map(call=>call.method),['PATCH','PATCH','DELETE']);
 },{rows:fixtures,reply:call=>{
  if(call.method==='PATCH'){published=JSON.parse(call.body).status==='ready';return okPatch(invitation({status:published?'ready':'disabled'}));}
  if(call.method==='DELETE'){deleted=true;return Response.json({success:true});}
  return call.url==='/api/partner/invitations'?okList(fixtures):Response.json(account({totalInvitations:deleted?1:2,quota:planQuota('inicio',published?1:0)}));
 }});
});

test('a confirmed PATCH or DELETE survives failed account verification and only a fresh explicit read unlocks without resending the mutation',async t=>{
 const fake=clock(t);for(const {method,read} of [{method:'PATCH',read:'hang'},{method:'DELETE',read:'error'},{method:'PATCH',read:'incoherent'}]){
  const delayedAccount=deferred();let accountReads=0,live=[invitation(),invitation({id:otherId,slug:'qa-socio-dos'})];
  await withDashboard(async runner=>{
   const old=rowButton(runner,id,method==='PATCH'?'Publicar':'Eliminar').props.onClick,work=observe(old());await runner.flush();
   assert.equal(mutations(runner).length,1);assert.equal(accountReads,1);assert.equal(runner.child().props.invitations.length,method==='PATCH'?2:1);
   if(method==='PATCH')assert.equal(runner.child().props.invitations.find(value=>value.id===id).status,'ready');
   if(read==='hang'){assert.equal(work.done,false);fake.tick(TIMEOUT);await runner.flush();}
   assert.equal(work.done,true);assert.equal(button(runner,'Actualizar invitaciones').props.disabled,false);assert.doesNotMatch(text(runner.parent()),/Ya puedes compartir el enlace/);assert.match(text(runner.parent())+' '+text(runner.current()),/comprobar el cupo|Actualizar invitaciones/);
   const displayed=nodes(runner.parent(),node=>node.type?.name==='StatusCard')[0].props.account;assert.equal(displayed.profile.brand,'QA marca');assert.equal(displayed.quota.used,0);assert.equal(displayed.totalInvitations,2);assert.doesNotMatch(text(runner.parent()),/QA INCOHERENT ACCOUNT/);
   assert.ok(rowButton(runner,method==='PATCH'?id:otherId,method==='PATCH'?'Despublicar':'Publicar').props.disabled);old();await runner.flush();assert.equal(mutations(runner).length,1);
   await button(runner,'Actualizar invitaciones').props.onClick();await runner.flush();assert.equal(mutations(runner).length,1);assert.equal(rowButton(runner,method==='PATCH'?id:otherId,method==='PATCH'?'Despublicar':'Publicar').props.disabled,false);
   assert.equal(cards(runner).length,method==='PATCH'?2:1);assert.doesNotMatch(text(runner.parent()),/Ya puedes compartir el enlace/);
   delayedAccount.resolve(Response.json(account()));await runner.flush();assert.equal(cards(runner).length,method==='PATCH'?2:1);assert.equal(mutations(runner).length,1);
  },{reply:call=>{
   if(call.method==='PATCH'){live=live.map(value=>value.id===id?{...value,status:'ready'}:value);return okPatch(live.find(value=>value.id===id));}
   if(call.method==='DELETE'){live=live.filter(value=>value.id!==id);return Response.json({success:true});}
   if(call.url==='/api/partner/invitations')return okList(live);
   accountReads++;if(accountReads===1){
    if(read==='hang')return delayedAccount.promise;
    if(read==='incoherent')return Response.json(account({profile:{...account().profile,brand:'QA INCOHERENT ACCOUNT'},quota:planQuota('inicio',0)}));
    return Response.json({error:'QA no se pudo consultar cuenta'},{status:500});
   }
   return Response.json(account({totalInvitations:live.length,quota:planQuota('inicio',live.filter(value=>value.status==='ready').length)}));
  }});
 }
});

test('leaving while a mutation or list read is pending aborts local waits and prevents late state or navigation callbacks',async t=>{
 clock(t);for(const phase of ['patch','delete','list']){const wait=deferred();await withDashboard(async runner=>{
  let work;if(phase==='patch')work=observe(rowButton(runner,id,'Publicar').props.onClick());if(phase==='delete')work=observe(rowButton(runner,id,'Eliminar').props.onClick());await runner.flush();const pending=runner.calls.find(call=>phase==='list'?call.method==='GET'&&call.url==='/api/partner/invitations':call.method===phase.toUpperCase());runner.unmount();
  wait.resolve(phase==='patch'?okPatch():phase==='delete'?Response.json({success:true}):okList([invitation()]));await runner.flush();assert.ok(pending.signal instanceof AbortSignal);assert.equal(pending.signal.aborted,true);assert.equal(runner.lateWrites(),0);assert.deepEqual(runner.routes,[]);if(work)assert.equal(work.done,true);
 },{reply:call=>phase==='list'&&call.url==='/api/partner/invitations'||phase==='patch'&&call.method==='PATCH'||phase==='delete'&&call.method==='DELETE'?wait.promise:call.url==='/api/partner/invitations'?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(account())});}
});

test('canceling the destructive confirmation performs no request and preserves all original card and preview resources',async t=>{
 clock(t);await withDashboard(async runner=>{
  const before=cards(runner).map(card=>({id:card.key,images:nodes(card,node=>node.type==='img').map(node=>node.props.src),links:nodes(card,node=>node.type==='a').map(node=>node.props.href)}));await rowButton(runner,id,'Eliminar').props.onClick();await runner.flush();assert.equal(mutations(runner).length,0);assert.equal(runner.confirmations.length,1);assert.deepEqual(cards(runner).map(card=>({id:card.key,images:nodes(card,node=>node.type==='img').map(node=>node.props.src),links:nodes(card,node=>node.type==='a').map(node=>node.props.href)})),before);
 },{confirm:false});
});
