// Real partner components and deadline helper; all accounts, files and traffic are fictional.
// Hooks/effects and timers are simulated. DOM refs are not mounted: this is not device acceptance.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react');require.cache[require.resolve('next/navigation')]={exports:{useRouter:()=>({push:()=>{},replace:()=>{},refresh:()=>{}})}};
const {default:Dashboard,SubscriptionTab}=require('../src/components/partners/PartnerDashboard.tsx');
const {subscriptionState,planQuota}=require('../src/lib/partner-plans.ts');
const {File}=require('node:buffer');
const id='30000000-0000-4000-8000-000000000001',stamp='2026-10-20T12:00:00.000Z';
const payment=(patch={})=>({id,reference:'ENK-QAONLY',plan_key:'inicio',months:1,amount_bs:249,method:'qr',receipt_url:'',status:'pending',review_note:'',created_at:stamp,period_end:null,quote_locked_at:null,...patch});
const account=(payments=[],patch={})=>({profile:{email:'qa@enkarta.invalid',name:'QA ficticio',avatar:'',brand:'QA anterior',phone:'',city:'',status:'active',memberSince:stamp},subscription:subscriptionState({plan_key:'inicio',status:'none',period_end:null}),quota:planQuota('inicio',0),totalInvitations:1,payments,billing:{instructions:'QA sin pago real',qrUrl:'',whatsapp:'',configured:false,provider:'manual',ready:true},...patch});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];
const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const button=(runner,label)=>nodes(runner.current(),node=>node.type==='button'&&text(node)===label)[0];
const field=(runner,name)=>nodes(runner.current(),node=>node.props.name===name)[0];
const change=(runner,name,value)=>field(runner,name).props.onChange({target:{value}});
const writes=runner=>runner.calls.filter(call=>call.method!=='GET');
const switchTab=async(runner,label)=>{nodes(runner.parent(),node=>node.type==='button'&&text(node).trim().startsWith(label))[0].props.onClick();await runner.flush();};
async function withCheckout(scenario,{full=false,initial=account(),reply,onRefresh,onPayment,tab='suscripcion'}={}){
 const hookNames=['useState','useRef','useEffect','useMemo','useCallback'],original=Object.fromEntries(hookNames.map(name=>[name,React[name]])),old={fetch:global.fetch,window:global.window,document:global.document};
 const fibers=new Map(),calls=[],notices=[],payments=[],snapshots=[];let fiber,cursor=0,dirty=true,parentTree,tree,effects=[],unmounted=false,lateStateWrites=0,confirms=0,childType;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((item,index)=>Object.is(item,b[index]));
 React.useState=initial=>{const slots=fiber.slots,index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initial==='function'?initial():initial};slot.set=next=>{if(unmounted){lateStateWrites++;return;}next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useRef=initial=>{const index=cursor++;return fiber.slots[index]??(fiber.slots[index]={current:initial});};
 React.useMemo=(compute,deps)=>{const slots=fiber.slots,index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:compute(),deps};return slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const slots=fiber.slots,index=cursor++,previous=slots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 global.window={setTimeout,clearTimeout,setInterval,clearInterval,confirm:()=>{confirms++;return true;},location:{href:'https://qa.invalid/socios/panel?tab=suscripcion',origin:'https://qa.invalid'},history:{replaceState:()=>{}}};global.document={visibilityState:'visible'};
 global.fetch=async(url,options={})=>{const call={url,method:options.method??'GET',body:options.body,signal:options.signal};calls.push(call);if(url==='/api/partner/invitations'&&call.method==='GET')return Response.json({invitations:[]});return reply?reply(call,calls):Response.json(initial);};
 let props=full?{initialAccount:initial,initialTab:tab}:{account:initial,pending:initial.payments.find(value=>value.status==='pending')??null,onRefresh:onRefresh??(async()=>initial),onNotice:(tone,message)=>notices.push({tone,text:message}),onPayment:value=>{payments.push(value);onPayment?.(value);}};
 const render=(key,Component,input)=>{fiber=fibers.get(key);if(!fiber){fiber={slots:[]};fibers.set(key,fiber);}cursor=0;return Component(input);};
 const flush=async()=>{for(let round=0;round<40;round++){if(dirty&&!unmounted){dirty=false;effects=[];parentTree=render('root',full?Dashboard:SubscriptionTab,props);const child=full?nodes(parentTree,node=>node.type===SubscriptionTab||node.type?.name==='AccountTab')[0]:null;if(childType!==child?.type){for(const slot of fibers.get('child')?.slots??[])slot?.cleanup?.();fibers.delete('child');childType=child?.type;}tree=child?render('child',child.type,child.props):parentTree;snapshots.push(tree);for(const effect of effects)effect();}await new Promise(done=>setImmediate(done));if(!dirty||unmounted)return tree;}throw Error('Partner checkout effects did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const value of fibers.values())for(const slot of value.slots)slot?.cleanup?.();};
 const runner={flush,current:()=>tree,parent:()=>parentTree,child:()=>nodes(parentTree,node=>node.type===SubscriptionTab||node.type?.name==='AccountTab')[0],calls,notices,payments,snapshots,unmount,confirms:()=>confirms,lateStateWrites:()=>lateStateWrites,update:async patch=>{props={...props,...patch};dirty=true;return flush();}};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of hookNames)React[name]=original[name];for(const [key,value]of Object.entries(old)){if(value===undefined)delete global[key];else global[key]=value;}assert.ok(calls.every(value=>/^\/api\/partner\/(account|invitations|payments(?:\/receipt)?)(?:\?|$)/.test(value.url)),'No real network or banking endpoint is allowed');}
}

test('uncertain prepare releases its spinner but even a retained pre-timeout handler cannot repeat the POST',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const wait=deferred();let reads=0;
 await withCheckout(async runner=>{
  const old=button(runner,'Preparar referencia').props.onClick;const work=old();old();await runner.flush();assert.equal(runner.calls.length,1);assert.match(text(runner.current()),/Preparando…/);
  t.mock.timers.tick(25000);await work;await runner.flush();assert.equal(button(runner,'Actualizar estado').props.disabled,false);assert.equal(button(runner,'Preparar referencia').props.disabled,true);assert.match(text(runner.current()),/25 segundos/);
  void old();await runner.flush();assert.equal(runner.calls.length,1,'A stale enabled handler must not resend an uncertain write');
  wait.resolve({ok:true,status:200,json:async()=>{reads++;return{payment:payment()};}});await runner.flush();assert.equal(reads,0);assert.deepEqual(runner.payments,[]);assert.equal(runner.calls.length,1);
 },{reply:()=>wait.promise});
});

test('an old polling response cannot revert a newer explicit account refresh',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const old=deferred(),initial=account([payment()]),approved=account([payment({status:'approved'})],{profile:{...initial.profile,brand:'QA aprobado'}});let reads=0,bodyReads=0;
 await withCheckout(async runner=>{
  t.mock.timers.tick(15000);await runner.flush();assert.equal(reads,1);button(runner,'Actualizar estado').props.onClick();await runner.flush();assert.equal(reads,2);assert.equal(runner.child().props.account.payments[0].status,'approved');
  old.resolve({ok:true,status:200,json:async()=>{bodyReads++;return initial;}});await runner.flush();assert.equal(runner.child().props.account.payments[0].status,'approved');assert.equal(bodyReads,0);assert.match(text(runner.parent()),/QA aprobado/);
 },{full:true,initial,reply:call=>call.url==='/api/partner/account'?(++reads===1?old.promise:Response.json(approved)):Response.json({})});
});

test('a receipt with a stalled JSON body retains the exact note and file until explicit recovery and a verified new attempt',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const body=deferred(),p=payment(),initial=account([p]),file=new File(['QA ONLY'],'qa.pdf',{type:'application/pdf'});let count=0,refreshes=0;
 await withCheckout(async runner=>{
  change(runner,'payment-transaction','  QA transferencia sin pago real  ');field(runner,'payment-receipt').props.onChange({target:{files:[file]}});await runner.flush();
  const old=button(runner,'Enviar comprobante').props.onClick;const work=old();old();await runner.flush();assert.equal(writes(runner).length,1);assert.equal(writes(runner)[0].body.get('paymentId'),id);assert.equal(writes(runner)[0].body.get('note'),'QA transferencia sin pago real');assert.equal(writes(runner)[0].body.get('file'),file);
  t.mock.timers.tick(25000);await work;await runner.flush();assert.equal(field(runner,'payment-transaction').props.value,'  QA transferencia sin pago real  ');assert.equal(button(runner,'Enviar comprobante').props.disabled,true);assert.equal(button(runner,'Actualizar estado').props.disabled,false);assert.deepEqual(runner.payments,[]);assert.equal(refreshes,0);
  body.resolve({payment:payment({receipt_url:'qa/fake.pdf',quote_locked_at:stamp})});await runner.flush();assert.deepEqual(runner.payments,[]);void old();await runner.flush();assert.equal(writes(runner).length,1);
  button(runner,'Actualizar estado').props.onClick();await runner.flush();assert.equal(refreshes,1);assert.equal(button(runner,'Enviar comprobante').props.disabled,false);assert.equal(field(runner,'payment-transaction').props.value,'  QA transferencia sin pago real  ');
  await button(runner,'Enviar comprobante').props.onClick();await runner.flush();assert.equal(writes(runner).length,2);assert.equal(writes(runner)[1].body.get('file'),file);assert.equal(writes(runner)[1].body.get('note'),'QA transferencia sin pago real');assert.equal(field(runner,'payment-transaction').props.value,'');assert.equal(runner.payments.length,1);assert.match(text(runner.current()),/Comprobante recibido para revisión manual/);assert.equal(runner.payments[0].status,'pending');
 },{initial,onRefresh:async()=>{refreshes++;return initial;},reply:()=>++count===1?{ok:true,status:200,json:()=>body.promise}:Response.json({payment:payment({receipt_url:'qa/fake.pdf',quote_locked_at:stamp})})});
});

test('uncertain cancellation keeps the pending request, never repeats DELETE and accepts the canonical status only after consultation',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const pending=deferred(),initial=account([payment()]);let refreshed=0,bodyReads=0;
 await withCheckout(async runner=>{
  const old=button(runner,'Retirar solicitud').props.onClick;old();old();await runner.flush();assert.equal(runner.confirms(),1);assert.equal(writes(runner).length,1);assert.equal(writes(runner)[0].method,'DELETE');assert.match(writes(runner)[0].url,new RegExp('id='+id));
  t.mock.timers.tick(25000);await runner.flush();assert.equal(button(runner,'Retirar solicitud').props.disabled,true);assert.equal(button(runner,'Actualizar estado').props.disabled,false);assert.equal(runner.payments.length,0);assert.match(text(runner.current()),/ENK-QAONLY/);
  old();await runner.flush();assert.equal(writes(runner).length,1);assert.equal(runner.confirms(),1);pending.resolve({ok:true,status:200,json:async()=>{bodyReads++;return{success:true};}});await runner.flush();assert.equal(bodyReads,0);assert.deepEqual(runner.payments,[]);
  button(runner,'Actualizar estado').props.onClick();await runner.flush();assert.equal(refreshed,1);assert.match(text(runner.current()),/Estado consultado/);assert.equal(writes(runner).length,1);
 },{initial,onRefresh:async()=>{refreshed++;return account([payment({status:'approved'})]);},reply:()=>pending.promise});
});

test('explicit account refresh is bounded across transport and JSON and a late response cannot release uncertainty',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 for(const phase of ['fetch','json']){
  const waiting=deferred(),initial=account([payment()]);let gets=0,bodyReads=0;
  await withCheckout(async runner=>{
   change(runner,'payment-transaction','QA keep');await runner.flush();await button(runner,'Enviar comprobante').props.onClick();await runner.flush();assert.equal(button(runner,'Enviar comprobante').props.disabled,true);
   button(runner,'Actualizar estado').props.onClick();await runner.flush();assert.match(text(runner.current()),/Consultando…/);t.mock.timers.tick(25000);await runner.flush();assert.equal(button(runner,'Actualizar estado').props.disabled,false);assert.equal(button(runner,'Enviar comprobante').props.disabled,true);assert.equal(gets,1);assert.equal(field(runner,'payment-transaction').props.value,'QA keep');
   waiting.resolve(phase==='fetch'?{ok:true,status:200,json:async()=>{bodyReads++;return account([]);}}:account([]));await runner.flush();assert.equal(bodyReads,phase==='fetch'?0:1);assert.equal(runner.child().props.pending.id,id);assert.equal(button(runner,'Enviar comprobante').props.disabled,true);
   button(runner,'Actualizar estado').props.onClick();await runner.flush();assert.equal(gets,2);assert.equal(button(runner,'Enviar comprobante').props.disabled,false);assert.match(text(runner.current()),/Estado consultado/);assert.equal(writes(runner).length,1);
  },{full:true,initial,reply:call=>{if(call.method==='POST')throw Error('QA connection');if(++gets>1)return Response.json(initial);return phase==='fetch'?waiting.promise:{ok:true,status:200,json:()=>{bodyReads++;return waiting.promise;}};}});
 }
});

test('incomplete account and malformed payments cannot clear uncertainty or replace the last verified account',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const initial=account([payment()]);
 const invalid=[{profile:initial.profile,subscription:initial.subscription,payments:[]},{...initial,billing:null},{...initial,quota:{...initial.quota,remaining:null}},{...initial,payments:[payment({id:'invalid'})]},{...initial,payments:[payment(),payment()]},{...initial,payments:[payment({created_at:'not-a-date'})]}];
 let gets=0;
 await withCheckout(async runner=>{
  change(runner,'payment-transaction','QA preserved');await runner.flush();await button(runner,'Enviar comprobante').props.onClick();await runner.flush();
  for(const ignored of invalid){void ignored;button(runner,'Actualizar estado').props.onClick();await runner.flush();assert.equal(button(runner,'Enviar comprobante').props.disabled,true);assert.equal(button(runner,'Actualizar estado').props.disabled,false);assert.equal(runner.child().props.account,initial);assert.match(text(runner.current()),/No pudimos verificar tu cuenta/);assert.equal(field(runner,'payment-transaction').props.value,'QA preserved');}
  button(runner,'Actualizar estado').props.onClick();await runner.flush();assert.equal(button(runner,'Enviar comprobante').props.disabled,false);assert.equal(writes(runner).length,1);assert.equal(gets,invalid.length+1);
 },{full:true,initial,reply:call=>{if(call.method==='POST')throw Error('QA uncertain');return Response.json(invalid[gets++]??initial);}});
});

test('polling alone can update the account but cannot acknowledge the operator’s uncertain write',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const initial=account([payment()]);let gets=0;
 await withCheckout(async runner=>{
  change(runner,'payment-transaction','QA unknown');await runner.flush();await button(runner,'Enviar comprobante').props.onClick();await runner.flush();t.mock.timers.tick(15000);await runner.flush();assert.equal(gets,1);assert.equal(button(runner,'Enviar comprobante').props.disabled,true);assert.equal(field(runner,'payment-transaction').props.value,'QA unknown');
  button(runner,'Actualizar estado').props.onClick();await runner.flush();assert.equal(gets,2);assert.equal(button(runner,'Enviar comprobante').props.disabled,false);assert.equal(writes(runner).length,1);
 },{full:true,initial,reply:call=>{if(call.method==='POST')throw Error('QA uncertain');gets++;return Response.json(initial);}});
});

test('a verified prepare, receipt and cancellation each write once and never activate the manual subscription locally',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});let canonical=account();
 await withCheckout(async runner=>{
  await button(runner,'Preparar referencia').props.onClick();await runner.flush();assert.equal(runner.child().props.pending.reference,'ENK-QAONLY');assert.equal(runner.child().props.account.subscription.active,false);assert.match(text(runner.current()),/Esto no confirma un pago ni activa la suscripción/);
  change(runner,'payment-transaction','QA manual no transfer');await runner.flush();await button(runner,'Enviar comprobante').props.onClick();await runner.flush();assert.match(text(runner.current()),/Comprobante recibido para revisión manual/);assert.equal(runner.child().props.account.subscription.active,false);assert.equal(field(runner,'payment-transaction').props.value,'');assert.equal(button(runner,'Comprobante en revisión').props.disabled,true);
  button(runner,'Retirar solicitud').props.onClick();await runner.flush();assert.equal(runner.child().props.pending,null);assert.equal(runner.child().props.account.payments[0].status,'canceled');assert.match(text(runner.current()),/No se realizó un reembolso ni una operación bancaria/);assert.deepEqual(writes(runner).map(call=>call.method),['POST','POST','DELETE']);assert.equal(runner.confirms(),1);assert.ok(writes(runner).every(call=>call.signal instanceof AbortSignal));
 },{full:true,reply:call=>{if(call.method==='GET')return Response.json(canonical);if(call.method==='DELETE'){canonical=account([payment({status:'canceled',quote_locked_at:stamp})]);return Response.json({success:true});}const p=payment(call.url.endsWith('/receipt')?{quote_locked_at:stamp}:{});canonical=account([p]);return Response.json({payment:p});}});
});

test('confirmed payment acknowledgement invalidates earlier polling even when the following account refresh fails',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const old=deferred(),initial=account([payment()]);let gets=0,bodyReads=0;
 await withCheckout(async runner=>{
  t.mock.timers.tick(15000);await runner.flush();change(runner,'payment-transaction','QA confirm');await runner.flush();await button(runner,'Enviar comprobante').props.onClick();await runner.flush();assert.equal(runner.child().props.pending.quote_locked_at,stamp);assert.equal(button(runner,'Reemplazar comprobante').props.disabled,true);
  old.resolve({ok:true,status:200,json:async()=>{bodyReads++;return initial;}});await runner.flush();assert.equal(bodyReads,0);assert.equal(runner.child().props.pending.quote_locked_at,stamp);assert.equal(button(runner,'Reemplazar comprobante').props.disabled,true);assert.match(text(runner.current()),/Comprobante recibido.*No pudimos actualizar/);assert.doesNotMatch(text(runner.parent()),/No pudimos actualizar el pago/);
 },{full:true,initial,reply:call=>{if(call.method==='POST')return Response.json({payment:payment({quote_locked_at:stamp})});if(++gets===1)return old.promise;throw Error('QA refresh failed');}});
});

test('background reads never overlap or replace a slower explicit refresh',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const waiting=deferred(),initial=account([payment()]);let gets=0;
 await withCheckout(async runner=>{
  button(runner,'Actualizar estado').props.onClick();await runner.flush();t.mock.timers.tick(15000);await runner.flush();assert.equal(gets,1);assert.match(text(runner.current()),/Consultando…/);waiting.resolve(Response.json(initial));await runner.flush();assert.match(text(runner.current()),/Estado consultado/);t.mock.timers.tick(15000);await runner.flush();assert.equal(gets,2);t.mock.timers.tick(15000);await runner.flush();assert.equal(gets,3);
 },{full:true,initial,reply:()=>{gets++;return gets===1?waiting.promise:Response.json(initial);}});
});

test('leaving during a write or its JSON body aborts waiting without late notices, state writes, account reads or fabricated success',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 for(const phase of ['fetch','json']){
  const wait=deferred();let bodyReads=0,refreshes=0;
  await withCheckout(async runner=>{
   const old=button(runner,'Preparar referencia').props.onClick,work=old();await runner.flush();runner.unmount();assert.equal(writes(runner)[0].signal.aborted,true);await work;wait.resolve(phase==='fetch'?{ok:true,status:201,json:async()=>{bodyReads++;return{payment:payment()};}}:{payment:payment()});await runner.flush();await old();assert.deepEqual(runner.payments,[]);assert.deepEqual(runner.notices,[]);assert.equal(refreshes,0);assert.equal(runner.lateStateWrites(),0);assert.equal(bodyReads,phase==='fetch'?0:1);assert.equal(writes(runner).length,1);
  },{onRefresh:async()=>{refreshes++;return account();},reply:()=>phase==='fetch'?wait.promise:{ok:true,status:200,json:()=>{bodyReads++;return wait.promise;}}});
 }
});

test('invalid write acknowledgements require consultation and do not clear captured evidence',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const initial=account([payment()]);
 await withCheckout(async runner=>{
  change(runner,'payment-transaction','QA retained invalid ACK');await runner.flush();await button(runner,'Enviar comprobante').props.onClick();await runner.flush();assert.equal(field(runner,'payment-transaction').props.value,'QA retained invalid ACK');assert.equal(button(runner,'Enviar comprobante').props.disabled,true);assert.match(text(runner.current()),/No pudimos verificar la recepción/);assert.deepEqual(runner.payments,[]);t.mock.timers.tick(100000);await runner.flush();assert.equal(writes(runner).length,1);
 },{initial,reply:()=>Response.json({payment:payment({status:'approved',quote_locked_at:stamp})})});
});

test('BCP remains unavailable for all write actions, including retained handlers and cancellation',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const initial=account([payment()],{billing:{...account().billing,provider:'bcp',ready:false}});
 await withCheckout(async runner=>{
  change(runner,'payment-transaction','QA no bank');await runner.flush();assert.equal(button(runner,'Enviar comprobante').props.disabled,true);assert.equal(button(runner,'Retirar solicitud').props.disabled,true);await button(runner,'Referencia preparada').props.onClick();await button(runner,'Enviar comprobante').props.onClick();button(runner,'Retirar solicitud').props.onClick();await runner.flush();assert.equal(writes(runner).length,0);assert.equal(runner.confirms(),0);assert.equal(runner.payments.length,0);
 },{initial});
});

test('profile acknowledgement merges only validated profile fields and never restores obsolete payments from its opening snapshot',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const waiting=deferred(),initial=account([payment()]),approved=account([payment({status:'approved'})],{subscription:{...initial.subscription,active:true,tone:'active',label:'QA active'}});let puts=0;
 await withCheckout(async runner=>{
  const input=nodes(runner.current(),node=>node.type==='input'&&node.props.placeholder==='Ej. Estudio Aurora')[0];input.props.onChange({target:{value:'QA perfil guardado'}});await runner.flush();const save=button(runner,'Guardar cambios').props.onClick();await runner.flush();t.mock.timers.tick(15000);await runner.flush();assert.equal(runner.child().props.account.payments[0].status,'approved');waiting.resolve(Response.json({profile:{...initial.profile,brand:'QA perfil guardado'},subscription:initial.subscription,quota:initial.quota,totalInvitations:1}));await save;await runner.flush();assert.equal(runner.child().props.account.payments[0].status,'approved');assert.equal(runner.child().props.account.subscription.active,true);assert.equal(runner.child().props.account.profile.brand,'QA perfil guardado');assert.equal(puts,1);
 },{full:true,tab:'cuenta',initial,reply:call=>{if(call.method==='PUT'){puts++;return waiting.promise;}return Response.json(approved);}});
});

test('an incomplete profile ACK preserves the verified profile and reports no false save',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const initial=account();
 await withCheckout(async runner=>{
  await button(runner,'Guardar cambios').props.onClick();await runner.flush();assert.equal(runner.child().props.account.profile,initial.profile);assert.match(text(runner.parent()),/respuesta del perfil llegó incompleta/);assert.doesNotMatch(text(runner.parent()),/Datos guardados/);
 },{full:true,tab:'cuenta',initial,reply:()=>Response.json({profile:null})});
});

test('changing tabs during a write or after its timeout cannot bypass the parent verification barrier',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 for(const leaveAfterTimeout of [false,true]){
  const waiting=deferred();let gets=0,bodyReads=0;
  await withCheckout(async runner=>{
   const old=button(runner,'Preparar referencia').props.onClick,work=old();await runner.flush();assert.equal(writes(runner).length,1);if(leaveAfterTimeout){t.mock.timers.tick(25000);await work;await runner.flush();}
   await switchTab(runner,'Mi cuenta');await work;assert.equal(writes(runner)[0].signal.aborted,true);await switchTab(runner,'Suscripción y pagos');assert.equal(button(runner,'Preparar referencia').props.disabled,true);assert.match(text(runner.current()),/Hay una operación por comprobar/);void old();void button(runner,'Preparar referencia').props.onClick();await runner.flush();assert.equal(writes(runner).length,1);
   waiting.resolve({ok:true,status:201,json:async()=>{bodyReads++;return{payment:payment()};}});await runner.flush();assert.equal(bodyReads,0);assert.equal(runner.child().props.pending,null);
   button(runner,'Actualizar estado').props.onClick();await runner.flush();assert.equal(button(runner,'Preparar referencia').props.disabled,true);assert.equal(gets,1);await switchTab(runner,'Mi cuenta');await switchTab(runner,'Suscripción y pagos');assert.equal(button(runner,'Preparar referencia').props.disabled,true);
   button(runner,'Actualizar estado').props.onClick();await runner.flush();assert.equal(gets,2);assert.equal(button(runner,'Preparar referencia').props.disabled,false);await switchTab(runner,'Mi cuenta');await switchTab(runner,'Suscripción y pagos');assert.equal(button(runner,'Preparar referencia').props.disabled,false);assert.equal(writes(runner).length,1);
  },{full:true,reply:call=>{if(call.method==='POST')return waiting.promise;if(++gets===1)throw Error('QA refresh error');return Response.json(account());}});
 }
});

test('leaving during the post-ACK refresh keeps the verified payment and the tab barrier until a new explicit valid GET',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const waiting=deferred();let gets=0,bodyReads=0;
 await withCheckout(async runner=>{
  const work=button(runner,'Preparar referencia').props.onClick();await runner.flush();assert.equal(runner.child().props.pending.reference,'ENK-QAONLY');assert.equal(gets,1);await switchTab(runner,'Mi cuenta');await work;await switchTab(runner,'Suscripción y pagos');assert.equal(button(runner,'Enviar comprobante').props.disabled,true);assert.match(text(runner.current()),/Hay una operación por comprobar/);
  waiting.resolve({ok:true,status:200,json:async()=>{bodyReads++;return account([]);}});await runner.flush();assert.equal(bodyReads,0);assert.equal(runner.child().props.pending.id,id);assert.equal(button(runner,'Enviar comprobante').props.disabled,true);
  button(runner,'Actualizar estado').props.onClick();await runner.flush();assert.equal(gets,2);assert.equal(button(runner,'Enviar comprobante').props.disabled,false);assert.equal(runner.child().props.pending.id,id);assert.equal(writes(runner).length,1);
 },{full:true,reply:call=>{if(call.method==='POST')return Response.json({payment:payment()});return ++gets===1?waiting.promise:Response.json(account([payment()]));}});
});
