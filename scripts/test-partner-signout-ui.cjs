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
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of hookNames)React[name]=oldHooks[name];for(const[key,value]of Object.entries(old)){if(value===undefined)delete global[key];else global[key]=value;}if(oldNavigator)Object.defineProperty(global,'navigator',oldNavigator);else delete global.navigator;assert.ok(calls.every(call=>(/^(?:\/api\/partner\/(invitations|account|payments(?:\/receipt)?)(?:\?|$)|\/api\/auth\/signout$)/).test(call.url)),'Only the isolated partner endpoints are permitted');}
}


const logoutCalls=r=>r.calls.filter(q=>q.url==='/api/auth/signout');
const replyBase=q=>q.url==='/api/partner/invitations'?okList([invitation(),invitation({id:otherId,slug:'qa-socio-dos'})]):Response.json(account());
test('signout acquires its lock before render and navigates only after a true ACK',async t=>{
 clock(t);const wait=deferred();await withDashboard(async r=>{const action=parentButton(r,'Salir').props.onClick,pending=action();action();await r.flush();assert.equal(logoutCalls(r).length,1);assert.deepEqual(r.routes,[]);assert.equal(parentButton(r,'Cerrando sesión…').props.disabled,true);wait.resolve(Response.json({success:true}));await pending;await r.flush();assert.deepEqual(r.routes,['/socios']);},{reply:q=>q.url==='/api/auth/signout'?wait.promise:replyBase(q)});
});
test('signout never redirects on an HTTP rejection, unreadable JSON or an absent true ACK',async t=>{
 clock(t);for(const response of [()=>Response.json({error:'QA refusal'},{status:503}),()=>Response.json({success:false}),()=>({ok:true,status:200,json:async()=>{throw Error('QA JSON');}})])await withDashboard(async r=>{await parentButton(r,'Salir').props.onClick();await r.flush();assert.deepEqual(r.routes,[]);assert.match(text(r.parent()),/No pudimos confirmar el cierre/);assert.equal(parentButton(r,'Salir').props.disabled,false);assert.equal(logoutCalls(r).length,1);},{reply:q=>q.url==='/api/auth/signout'?response():replyBase(q)});
});
for(const phase of ['headers','JSON'])test('signout bounds '+phase+' and a late response cannot navigate',async t=>{
 const fake=clock(t),wait=deferred();await withDashboard(async r=>{const pending=parentButton(r,'Salir').props.onClick();await r.flush();fake.tick(25000);await pending;await r.flush();assert.deepEqual(r.routes,[]);assert.equal(parentButton(r,'Salir').props.disabled,false);assert.equal(logoutCalls(r)[0].signal.aborted,true);wait.resolve(phase==='headers'?Response.json({success:true}):{success:true});await r.flush();assert.deepEqual(r.routes,[]);},{reply:q=>q.url==='/api/auth/signout'?(phase==='headers'?wait.promise:{ok:true,status:200,json:()=>wait.promise}):replyBase(q)});
});
test('an active invitation mutation prevents closing the session mid-write',async t=>{
 clock(t);const wait=deferred();await withDashboard(async r=>{const pending=rowButton(r,id,'Publicar').props.onClick();await r.flush();await parentButton(r,'Salir').props.onClick();await r.flush();assert.equal(logoutCalls(r).length,0);assert.match(text(r.parent()),/Espera a que termine la operación/);wait.resolve(okPatch());await pending;await r.flush();},{reply:q=>q.method==='PATCH'?wait.promise:replyBase(q)});
});
test('unmount aborts signout and suppresses late navigation and state updates',async t=>{
 clock(t);const wait=deferred();await withDashboard(async r=>{const pending=parentButton(r,'Salir').props.onClick();await r.flush();r.unmount();wait.resolve(Response.json({success:true}));await pending;assert.deepEqual(r.routes,[]);assert.equal(logoutCalls(r)[0].signal.aborted,true);assert.equal(r.lateWrites(),0);},{reply:q=>q.url==='/api/auth/signout'?wait.promise:replyBase(q)});
});
