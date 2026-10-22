// Actual React functions/events with simulated hooks and local transports; no browser or network.
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react');let navigate=()=>{},analytics=()=>{},generate=()=>{},png=()=>{};
require.cache[require.resolve('next/navigation')]={exports:{useRouter:()=>({refresh:()=>navigate()})}};
require.cache[require.resolve('../src/components/invitations/InvitationAnalytics.tsx')]={exports:{emitInvitationAnalytics:(...args)=>analytics(...args)}};
const QRCode=require('qrcode');QRCode.toDataURL=(...args)=>generate(...args);
const pass=require('../src/lib/access-pass.ts');pass.accessPassPng=(...args)=>png(...args);
const Form=require('../src/components/invitations/ConfirmationForm.tsx').default,Qr=require('../src/components/invitations/QrCard.tsx').default;
const {isRsvpSession,isRsvpAcknowledgement}=require('../src/lib/rsvp-contract.ts'),{boundedInvitationTask}=require('../src/lib/invitation-request.ts');
const guest=(patch={})=>({id:'30000000-0000-4000-8000-000000000001',publicId:'qa-recipient-a',name:'QA Familia',passes:2,allowKids:true,sent:false,status:'pending',responseRevision:0,...patch});
const confirmed=(patch={})=>guest({status:'confirmed',confirmedPasses:2,responseRevision:1,accessToken:'qa-local-token',accessCode:'ENK-QATEST',...patch});
const entry=(patch={})=>({id:'30000000-0000-4000-8000-000000000002',name:'QA Hogar',attending:'yes',passes:2,message:'',at:'2026-10-23T00:00:00Z',revision:1,...patch});
const theme={line:'#ddd',text:'#222',muted:'#666',primary:'#233',onPrimary:'#fff',bg:'#fff',surface:'#fff'};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const nodes=(element,check)=>!React.isValidElement(element)?[]:[...(check(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(c=>nodes(c,check))];
const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const button=(r,label)=>nodes(r.tree(),n=>n.type==='button'&&text(n).trim()===label)[0];
const input=(r,label)=>nodes(r.tree(),n=>n.props['aria-label']===label)[0];
const edit=(r,label,value)=>input(r,label).props.onChange({target:{value}});
const post=r=>r.requests.filter(q=>q.method==='POST');
const submit=r=>{const form=nodes(r.tree(),n=>n.type==='form')[0];assert(form,'Expected RSVP form');form.props.onSubmit({preventDefault(){}});};
async function withUI(run,{component=Form,props:extra={},reply,qrReply,pngReply}={}){
 const names=['useState','useRef','useMemo','useCallback','useEffect'],hooks=Object.fromEntries(names.map(n=>[n,React[n]]));
 const globalNames=['document','fetch'],globals=Object.fromEntries(globalNames.map(n=>[n,Object.getOwnPropertyDescriptor(global,n)])),urlMethods={createObjectURL:URL.createObjectURL,revokeObjectURL:URL.revokeObjectURL};
 const slots=[],requests=[],navigations=[],events=[],generations=[],pngs=[],downloads=[],urls=[],revoked=[];let cursor=0,dirty=true,tree,effects=[],unmounted=false,late=0;
 const props=component===Qr?{t:theme,accessToken:'qa-local-token',accessCode:'ENK-QATEST',guestName:'QA Familia',passes:2,...extra}:{theme,slug:'qa-event',...extra};
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 React.useState=initial=>{const i=cursor++;if(!slots[i]){const slot=slots[i]={value:typeof initial==='function'?initial():initial};slot.set=value=>{if(unmounted){late++;return;}const next=typeof value==='function'?value(slot.value):value;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[i].value,slots[i].set];};
 React.useRef=initial=>{const i=cursor++;return slots[i]??(slots[i]={current:initial});};
 React.useMemo=(compute,deps)=>{const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps))slots[i]={deps,value:compute()};return slots[i].value;};React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const i=cursor++,old=slots[i];if(!old||!same(old.deps,deps)){const slot=slots[i]={deps,cleanup:old?.cleanup};effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 navigate=()=>navigations.push('refresh');analytics=(...args)=>events.push(args);
 generate=(token,options)=>{generations.push({token,options});return qrReply?.(token,options)??Promise.resolve('data:image/png;base64,QA');};
 png=details=>{pngs.push(details);return pngReply?.(details)??Promise.resolve(new Blob(['qa'],{type:'image/png'}));};
 URL.createObjectURL=blob=>{const url='blob:qa-'+urls.length;urls.push({blob,url});return url;};URL.revokeObjectURL=url=>revoked.push(url);
 global.document={createElement:tag=>{assert.equal(tag,'a');const link={click(){downloads.push({href:link.href,download:link.download});}};return link;}};
 global.fetch=async(url,init={})=>{assert(/^\/api\/(guests\/confirm|rsvp)(\?|$)/.test(String(url)),'Only in-memory RSVP endpoints');const q={url,method:init.method??'GET',body:init.body?JSON.parse(init.body):null,signal:init.signal,cache:init.cache};requests.push(q);return reply?.(q)??Response.json(q.method==='GET'?{canRespond:true,...(props.guest?{guest:props.guest}:{})}:props.guest?{ok:true,guest:confirmed({publicId:props.guest.publicId})}:{ok:true,entry:entry()});};
 const flush=async()=>{for(let round=0;round<40;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];tree=component(props);for(const effect of effects)effect();}await new Promise(done=>setImmediate(done));if(!dirty||unmounted)return tree;}throw Error('UI did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const r={tree:()=>tree,flush,requests,navigations,events,generations,pngs,downloads,urls,revoked,unmount,late:()=>late,update:async patch=>{Object.assign(props,patch);dirty=true;await flush();}};
 try{await flush();await run(r);}finally{unmount();for(const name of names)React[name]=hooks[name];for(const name of globalNames){if(globals[name])Object.defineProperty(global,name,globals[name]);else delete global[name];}Object.assign(URL,urlMethods);}
}

test('public reply validators reject missing ACKs, foreign recipients and impossible/replayed old revisions',()=>{
 assert.equal(isRsvpSession({canRespond:true,guest:guest()},guest().publicId),true);
 for(const value of [{},{canRespond:'true'},{canRespond:true,entry:entry({passes:21})},{canRespond:true,guest:guest()}])assert.equal(isRsvpSession(value),false);
 for(const value of [{guest:confirmed()},{ok:true},{ok:true,guest:confirmed({publicId:'other'})},{ok:true,guest:confirmed({confirmedPasses:3})},{ok:true,guest:confirmed({responseRevision:0})},{ok:true,guest:guest()}])assert.equal(isRsvpAcknowledgement(value,guest().publicId,0),false);
 assert.equal(isRsvpAcknowledgement({ok:true,entry:entry({revision:2})},undefined,1,entry().id),true);
 assert.equal(isRsvpAcknowledgement({ok:true,entry:entry({revision:2,id:'foreign'})},undefined,1,entry().id),false);
 assert.equal(isRsvpAcknowledgement({ok:true,entry:entry({attending:'no',passes:1})}),false);
});

test('reading confirmed legacy groups and declined legacy entries preserves their supported fallbacks',()=>{
 assert.equal(isRsvpSession({canRespond:true,guest:guest({status:'confirmed',confirmedPasses:undefined})},guest().publicId),true);
 assert.equal(isRsvpSession({canRespond:false,closedReason:'QA closed'},guest().publicId),true);
 assert.equal(isRsvpSession({canRespond:true,entry:entry({attending:'no',passes:1,revision:0})}),true);
 assert.equal(isRsvpAcknowledgement({ok:true,guest:confirmed({confirmedPasses:undefined})},guest().publicId),false);
});

test('malformed optional session fields and array statuses never reach React or count as a verified reply',()=>{
 for(const closedReason of [{},[],false,2,null])assert.equal(isRsvpSession({canRespond:false,closedReason}),false);
 for(const hasUsedPasses of [{},[],1,'true',null])assert.equal(isRsvpSession({canRespond:false,hasUsedPasses}),false);
 assert.equal(isRsvpSession({canRespond:false,closedReason:'QA cerrado',hasUsedPasses:false}),true);
 assert.equal(isRsvpSession({canRespond:true,guest:guest({status:['confirmed']})},guest().publicId),false);
 assert.equal(isRsvpAcknowledgement({ok:true,guest:confirmed({status:['confirmed']})},guest().publicId),false);
 assert.equal(isRsvpSession({canRespond:true,entry:entry({attending:['yes']})}),false);
 assert.equal(isRsvpAcknowledgement({ok:true,entry:entry({attending:['yes']})}),false);
});

test('invitation deadlines settle even when local work ignores AbortSignal',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();let signal;const result=boundedInvitationTask(s=>{signal=s;return wait.promise;},{timeout:25});t.mock.timers.tick(25);await assert.rejects(result,/espera terminó/);assert.equal(signal.aborted,true);wait.resolve('late');
});

test('a pending public read ends after 12 seconds and supports explicit refresh',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();let first=true;
 await withUI(async r=>{assert.match(text(r.tree()),/Consultando/);t.mock.timers.tick(12000);await r.flush();assert.doesNotMatch(text(r.tree()),/Consultando/);assert.match(text(r.tree()),/No pudimos consultar/);button(r,'Actualizar mi respuesta').props.onClick();await r.flush();assert.ok(input(r,'Tu nombre'));assert.equal(r.requests.length,2);wait.resolve(Response.json({canRespond:false}));await r.flush();assert.ok(input(r,'Tu nombre'));},{reply:q=>q.method==='GET'&&first?(first=false,wait.promise):undefined});
});

test('a stalled JSON read is bounded as part of the same initial query',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();await withUI(async r=>{t.mock.timers.tick(12000);await r.flush();assert.ok(button(r,'Actualizar mi respuesta'));assert.equal(post(r).length,0);wait.resolve({canRespond:true});await r.flush();assert.ok(button(r,'Actualizar mi respuesta'));},{reply:()=>({ok:true,status:200,json:()=>wait.promise})});
});

test('an invalid successful read cannot open the form or expose an unrelated guest',async()=>{
 for(const reply of [{},{canRespond:true,guest:guest({publicId:'qa-foreign',name:'QA forbidden'})}])await withUI(async r=>{assert.ok(button(r,'Actualizar mi respuesta'));assert.doesNotMatch(text(r.tree()),/QA forbidden/);assert.equal(nodes(r.tree(),n=>n.type==='fieldset')[0].props.disabled,true);},{props:{guest:guest()},reply:()=>Response.json(reply)});
});

test('a personalized RSVP checks cap and suppresses a same-turn double submit',async()=>{
 const wait=deferred();await withUI(async r=>{edit(r,'N.º de personas','3');await r.flush();submit(r);await r.flush();assert.equal(post(r).length,0);assert.match(text(r.tree()),/entre 1 y 2/);edit(r,'N.º de personas','2');await r.flush();const form=nodes(r.tree(),n=>n.type==='form')[0],action=()=>form.props.onSubmit({preventDefault(){}});action();action();await r.flush();assert.equal(post(r).length,1);assert.equal(post(r)[0].body.passes,2);wait.resolve(Response.json({ok:true,guest:confirmed()}));await r.flush();assert.match(text(r.tree()),/Asistencia confirmada/);assert.equal(r.navigations.length,1);assert.equal(r.events.length,1);assert.equal(nodes(r.tree(),n=>n.type===Qr)[0].props.passes,2);assert(r.requests.every(q=>q.cache==='no-store'));},{props:{guest:guest()},reply:q=>q.method==='POST'?wait.promise:undefined});
});

test('a POST timeout preserves the exact idempotent payload and ignores its late success',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();let postAttempt=0;await withUI(async r=>{submit(r);await r.flush();const original=structuredClone(post(r)[0].body);t.mock.timers.tick(15000);await r.flush();assert.match(text(r.tree()),/No pudimos comprobar/);assert.ok(button(r,'Reintentar la misma respuesta'));assert.equal(nodes(r.tree(),n=>n.type==='fieldset')[0].props.disabled,true);wait.resolve(Response.json({ok:true,guest:confirmed()}));await r.flush();assert.doesNotMatch(text(r.tree()),/Asistencia confirmada/);assert.equal(r.navigations.length,0);submit(r);await r.flush();assert.equal(post(r).length,2);assert.deepEqual(post(r)[1].body,original);assert.match(text(r.tree()),/Asistencia confirmada/);},{props:{guest:guest()},reply:q=>q.method==='POST'&&postAttempt++===0?wait.promise:undefined});
});

test('a stalled POST body never announces success and can retry only the same operation',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();await withUI(async r=>{submit(r);await r.flush();t.mock.timers.tick(15000);await r.flush();assert.ok(button(r,'Reintentar la misma respuesta'));assert.equal(r.events.length,0);wait.resolve({ok:true,guest:confirmed()});await r.flush();assert.equal(r.events.length,0);},{props:{guest:guest()},reply:q=>q.method==='POST'?{ok:true,status:200,json:()=>wait.promise}:undefined});
});

test('malformed or foreign success ACKs preserve the pending request instead of confirming',async()=>{
 for(const ack of [{},{ok:false,guest:confirmed()},{ok:true,guest:confirmed({publicId:'other',name:'QA forbidden'})},{ok:true,guest:confirmed({responseRevision:0})}])await withUI(async r=>{submit(r);await r.flush();assert.ok(button(r,'Reintentar la misma respuesta'));assert.doesNotMatch(text(r.tree()),/Asistencia confirmada|QA forbidden/);assert.equal(r.navigations.length,0);assert.equal(r.events.length,0);},{props:{guest:guest()},reply:q=>q.method==='POST'?Response.json(ack):undefined});
});

test('definitive conflict requires a fresh authoritative read before a new request',async()=>{
 let reads=0;await withUI(async r=>{submit(r);await r.flush();assert.match(text(r.tree()),/QA conflict/);assert.equal(nodes(r.tree(),n=>n.type==='fieldset')[0].props.disabled,true);button(r,'Actualizar mi respuesta').props.onClick();await r.flush();assert.match(text(r.tree()),/Asistencia confirmada/);button(r,'Modificar mi respuesta').props.onClick();await r.flush();submit(r);await r.flush();assert.equal(post(r).length,2);assert.notEqual(post(r)[0].body.requestId,post(r)[1].body.requestId);assert.equal(post(r)[1].body.expectedRevision,1);},{props:{guest:guest()},reply:q=>q.method==='POST'?Response.json({error:'QA conflict'},{status:409}):++reads>1?Response.json({canRespond:true,guest:confirmed()}):undefined});
});

test('open RSVP requires a real entry acknowledgement and preserves browser-based identity',async()=>{
 await withUI(async r=>{edit(r,'Tu nombre','QA Hogar');edit(r,'N.º de personas','2');await r.flush();submit(r);await r.flush();assert.equal(post(r)[0].url,'/api/rsvp');assert.match(text(r.tree()),/Asistencia confirmada/);assert.equal(nodes(r.tree(),n=>n.type===Qr).length,0);assert.equal(r.navigations.length,0);button(r,'Modificar mi respuesta').props.onClick();await r.flush();assert.equal(input(r,'Tu nombre').props.value,'QA Hogar');},{reply:q=>q.method==='POST'?Response.json({ok:true,entry:entry()}):undefined});
});

test('late POST and retained submit handlers cannot cross invitation identity',async()=>{
 const wait=deferred();await withUI(async r=>{const form=nodes(r.tree(),n=>n.type==='form')[0];submit(r);await r.flush();await r.update({slug:'qa-second',guest:guest({publicId:'qa-recipient-b',name:'QA B'})});assert.equal(input(r,'Tu nombre').props.value,'QA B');wait.resolve(Response.json({ok:true,guest:confirmed()}));await r.flush();assert.equal(input(r,'Tu nombre').props.value,'QA B');assert.equal(r.navigations.length,0);form.props.onSubmit({preventDefault(){}});await r.flush();assert.equal(post(r).length,1);},{props:{guest:guest()},reply:q=>q.method==='POST'?wait.promise:undefined});
});

test('late initial reads cannot replace another recipient after route reuse',async()=>{
 const wait=deferred();await withUI(async r=>{await r.update({slug:'qa-second',guest:guest({publicId:'qa-recipient-b',name:'QA B'})});assert.equal(input(r,'Tu nombre').props.value,'QA B');wait.resolve(Response.json({canRespond:true,guest:confirmed()}));await r.flush();assert.equal(input(r,'Tu nombre').props.value,'QA B');assert.equal(r.events.length,0);},{props:{guest:guest()},reply:q=>q.method==='GET'&&String(q.url).includes('qa-recipient-a')?wait.promise:undefined});
});

test('late read and write completions after unmount have no UI updates or navigation',async()=>{
 for(const stage of ['GET','POST']){const wait=deferred();await withUI(async r=>{if(stage==='POST'){submit(r);await r.flush();}r.unmount();wait.resolve(Response.json(stage==='GET'?{canRespond:true,guest:guest()}:{ok:true,guest:confirmed()}));await r.flush();assert.equal(r.late(),0);assert.equal(r.navigations.length,0);assert.equal(r.events.length,0);},{props:{guest:guest()},reply:q=>q.method===stage?wait.promise:undefined});}
});

test('demo confirmations never call a server or expose access tokens',async()=>{
 await withUI(async r=>{submit(r);await r.flush();assert.equal(r.requests.length,0);assert.match(text(r.tree()),/Asistencia confirmada/);assert.equal(nodes(r.tree(),n=>n.type===Qr).length,0);assert.equal(r.events.length,0);},{props:{guest:guest(),demo:true}});
});

test('QR image generation is local, dimensioned and has a fallback after a deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();await withUI(async r=>{assert.equal(r.requests.length,0);t.mock.timers.tick(12000);await r.flush();assert.match(text(r.tree()),/Usa el ID de acceso/);assert.match(text(r.tree()),/No se pudo generar/);wait.resolve('data:image/png;base64,LATE');await r.flush();assert.equal(nodes(r.tree(),n=>n.type==='img').length,0);},{component:Qr,qrReply:()=>wait.promise});
 await withUI(async r=>{const img=nodes(r.tree(),n=>n.type==='img')[0];assert.equal(img.props.width,176);assert.equal(img.props.height,176);assert.equal(r.generations[0].token,'qa-local-token');assert.equal(r.requests.length,0);},{component:Qr});
});

test('QR download synchronously suppresses duplicate clicks and revokes the local object URL',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();await withUI(async r=>{const action=button(r,'Descargar pase PNG').props.onClick;action();action();await r.flush();assert.equal(r.pngs.length,1);assert.equal(button(r,'Preparando imagen…').props['aria-busy'],true);wait.resolve(new Blob(['QA']));await r.flush();assert.equal(r.downloads.length,1);assert.equal(r.downloads[0].download,'pase-ENK-QATEST.png');assert(!r.downloads[0].download.includes('token'));t.mock.timers.tick(1000);await r.flush();assert.deepEqual(r.revoked,[r.downloads[0].href]);},{component:Qr,pngReply:()=>wait.promise});
});

test('QR download deadline releases the button and ignores a late image',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();await withUI(async r=>{button(r,'Descargar pase PNG').props.onClick();await r.flush();t.mock.timers.tick(15000);await r.flush();assert.equal(button(r,'Descargar pase PNG').props.disabled,false);assert.match(text(r.tree()),/No se pudo descargar/);wait.resolve(new Blob(['QA late']));await r.flush();assert.equal(r.downloads.length,0);assert.equal(r.urls.length,0);},{component:Qr,pngReply:()=>wait.promise});
});

test('changing pass details prevents downloading a stale pass even if its token is stable',async()=>{
 const wait=deferred();await withUI(async r=>{const old=button(r,'Descargar pase PNG').props.onClick;old();await r.flush();await r.update({passes:1,guestName:'QA Updated',tableNo:'9'});wait.resolve(new Blob(['QA obsolete']));await r.flush();assert.equal(r.downloads.length,0);old();await r.flush();assert.equal(r.pngs.length,1);button(r,'Descargar pase PNG').props.onClick();await r.flush();assert.equal(r.pngs[1].passes,1);assert.equal(r.pngs[1].guestName,'QA Updated');assert.equal(r.downloads.length,1);},{component:Qr,pngReply:()=>wait.promise});
});

test('a late QR generation cannot display an older recipient code',async()=>{
 const wait=deferred();await withUI(async r=>{await r.update({accessToken:'qa-new-token',accessCode:'ENK-NEWQA'});wait.resolve('data:image/png;base64,OLD');await r.flush();assert.equal(nodes(r.tree(),n=>n.type==='img')[0].props.src,'data:image/png;base64,QA');assert.match(text(r.tree()),/ENK-NEWQA/);},{component:Qr,qrReply:token=>token==='qa-local-token'?wait.promise:undefined});
});

test('unmounted QR work cannot create object URLs, downloads or late UI state',async()=>{
 for(const stage of ['generate','download']){const wait=deferred();await withUI(async r=>{if(stage==='download'){button(r,'Descargar pase PNG').props.onClick();await r.flush();}r.unmount();wait.resolve(stage==='download'?new Blob(['QA']):'data:image/png;base64,QA');await r.flush();assert.equal(r.late(),0);assert.equal(r.downloads.length,0);assert.equal(r.urls.length,0);},{component:Qr,qrReply:stage==='generate'?()=>wait.promise:undefined,pngReply:stage==='download'?()=>wait.promise:undefined});}
});
