// Actual React components/hooks simulated in RAM. No ReactDOM, browser or real network.
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react');let oauth;
require.cache[require.resolve('../src/lib/supabase/browser.ts')]={exports:{authBrowserClient:()=>({auth:{signInWithOAuth:options=>oauth(options)}})}};
const Quality=require('../src/components/admin/builder/panels/QualityControlPanel.tsx').default;
const {qualityChecksFor}=require('../src/lib/quality-assurance.ts');
const Validity=require('../src/components/admin/builder/panels/ValidityPanel.tsx').default;
const {invitationValidity}=require('../src/lib/invitation-validity.ts');
const Versions=require('../src/components/admin/builder/panels/VersionsPanel.tsx').default,Google=require('../src/components/partners/GoogleSignIn.tsx').default,ClientReview=require('../src/components/admin/host/ClientReviewPanel.tsx').default;
const id='30000000-0000-4000-8000-000000000001',clone=v=>JSON.parse(JSON.stringify(v)),draft=(name='QA current')=>({id,slug:'qa-current',names:name,status:'draft',config:{layout:{version:2,blocks:[]}}});
const version=(patch={})=>({id:'version-qa',invitationId:id,label:'QA checkpoint',createdAt:1,source:'manual',data:draft('QA historical'),...patch});
const scheduled=()=>version({source:'publish',publicationState:'scheduled',publishAt:'2099-01-01T12:00:00Z'});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const nodes=(element,check)=>!React.isValidElement(element)?[]:[...(check(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(c=>nodes(c,check))];
const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const button=(r,label)=>nodes(r.tree(),n=>n.type==='button'&&text(n).trim()===label)[0];
const input=(r,label)=>nodes(r.tree(),n=>n.props['aria-label']===label)[0];
async function withUI(run,{component=Versions,rows=[],reply,allowed=true}={}){
 const names=['useState','useRef','useMemo','useCallback','useEffect'],hooks=Object.fromEntries(names.map(n=>[n,React[n]]));
 const globalNames=['window','document','fetch','sessionStorage'],globals=Object.fromEntries(globalNames.map(n=>[n,Object.getOwnPropertyDescriptor(global,n)])),env=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const slots=[],requests=[],storage=new Map(),events=new Map(),cancelled=[],restored=[],states=[],navigation=[],oauthCalls=[];let cursor=0,dirty=true,tree,effects=[],unmounted=false,late=0;
 const draftSource={current:component===Validity?{...draft(),event_date:'2027-06-19',expires_at:'2027-06-30',is_active:true,validity_mode:'legacy',validity_revision:0}:draft()};const props=component===Versions?{data:draftSource.current,draftSource,canMutate:()=>allowed,onMutationState:s=>states.push(s),onCancelSchedule:vid=>cancelled.push(vid),onRestore:v=>restored.push(v),onRollback:async()=>{},onUnpublish:async()=>{},onWorkflowChange:()=>{}}:component===ClientReview?{invitation:draftSource.current}:component===Validity?{data:draftSource.current}:component===Quality?{data:draftSource.current,draftSource,editingRevision:{current:0},onChange:config=>{draftSource.current={...draftSource.current,config};props.data=draftSource.current;dirty=true;}}:{};
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 React.useState=initial=>{const i=cursor++;if(!slots[i]){const slot=slots[i]={value:typeof initial==='function'?initial():initial};slot.set=value=>{if(unmounted){late++;return;}const next=typeof value==='function'?value(slot.value):value;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[i].value,slots[i].set];};
 React.useRef=initial=>{const i=cursor++;return slots[i]??(slots[i]={current:initial});};
 React.useMemo=(compute,deps)=>{const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps))slots[i]={deps,value:compute()};return slots[i].value;};React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const i=cursor++,old=slots[i];if(!old||!same(old.deps,deps)){const slot=slots[i]={deps,cleanup:old?.cleanup};effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 global.window={confirm:()=>true,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},location:{origin:'https://qa.invalid',assign:url=>navigation.push(url)},addEventListener:(name,cb)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(cb);},removeEventListener:(name,cb)=>events.get(name)?.delete(cb)};global.document={};global.sessionStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};process.env.NEXT_PUBLIC_SUPABASE_URL='https://qa-project.supabase.co';
 oauth=options=>{oauthCalls.push(options);return reply?reply({oauth:true,options}):Promise.resolve({data:{url:'https://qa-project.supabase.co/auth/v1/authorize?provider=google'},error:null});};
 global.fetch=async(url,init={})=>{assert(/^\/api\/admin\/(builder-state|invitations\/validity)(\?|$)/.test(String(url)),'Only isolated history and validity calls');const q={url,method:init.method??'GET',body:init.body?JSON.parse(init.body):null,signal:init.signal};requests.push(q);return reply?.(q)??Response.json(String(url).startsWith('/api/admin/invitations/validity')?{validity:invitationValidity(draftSource.current),history:[]}:q.method==='GET'?{versions:rows,notes:[]}:{success:true});};
 const flush=async()=>{for(let round=0;round<35;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];tree=component(props);for(const effect of effects)effect();}await new Promise(done=>setImmediate(done));if(!dirty||unmounted)return tree;}throw Error('UI did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const r={tree:()=>tree,flush,requests,storage,cancelled,restored,states,navigation,oauthCalls,late:()=>late,unmount,source:draftSource,update:async data=>{draftSource.current=data;if(component===Versions||component===Validity||component===Quality)props.data=data;else props.invitation=data;dirty=true;await flush();},beforeUnload:()=>{const event={prevented:false,preventDefault(){this.prevented=true;}};for(const cb of events.get('beforeunload')??[])cb(event);return event.prevented;}};
 try{await flush();await run(r);}finally{unmount();for(const name of names)React[name]=hooks[name];for(const name of globalNames){if(globals[name])Object.defineProperty(global,name,globals[name]);else delete global[name];}if(env===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=env;}
}
const mutate=r=>r.requests.filter(q=>q.method!=='GET');

test('cancel schedule keeps the planned publication visible and suppresses repeated clicks until confirmation',async()=>{
 const wait=deferred();await withUI(async r=>{const action=button(r,'Cancelar').props.onClick;action();action();await r.flush();assert.equal(mutate(r).length,1);assert.deepEqual(r.cancelled,[]);assert.match(text(r.tree()),/Programada para/);assert.equal(r.beforeUnload(),true);wait.resolve(Response.json({success:true}));await r.flush();assert.deepEqual(r.cancelled,['version-qa']);assert.doesNotMatch(text(r.tree()),/Programada para/);assert.deepEqual(r.states,['pending','done']);},{rows:[scheduled()],reply:q=>q.method==='DELETE'?wait.promise:undefined});
});
test('failed schedule cancellation cannot announce cancellation or hide the planned version',async()=>{
 await withUI(async r=>{button(r,'Cancelar').props.onClick();await r.flush();assert.deepEqual(r.cancelled,[]);assert.match(text(r.tree()),/Programada para/);assert.match(text(r.tree()),/QA refusal/);},{rows:[scheduled()],reply:q=>q.method==='DELETE'?Response.json({error:'QA refusal'},{status:403}):undefined});
});
test('a schedule cancellation timeout preserves the schedule, releases waiting state and blocks stale retries',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();await withUI(async r=>{const action=button(r,'Cancelar').props.onClick;action();await r.flush();t.mock.timers.tick(25000);await r.flush();assert.deepEqual(r.cancelled,[]);assert.match(text(r.tree()),/Conserva tus textos y recarga/);assert.equal(nodes(r.tree(),n=>n.type==='fieldset')[0].props.disabled,true);action();await r.flush();assert.equal(mutate(r).length,1);wait.resolve(Response.json({success:true}));await r.flush();assert.deepEqual(r.cancelled,[]);assert.deepEqual(r.states,['pending','uncertain','done']);},{rows:[scheduled()],reply:q=>q.method==='DELETE'?wait.promise:undefined});
});
test('restoring requires a confirmed backup and never discards edits made while waiting for that backup',async()=>{
 const wait=deferred();await withUI(async r=>{button(r,'Restaurar al borrador').props.onClick();await r.flush();assert.deepEqual(r.restored,[]);assert.equal(mutate(r)[0].body.version.data.names,'QA current');await r.update(draft('QA later edits'));wait.resolve(Response.json({success:true}));await r.flush();assert.deepEqual(r.restored,[]);assert.match(text(r.tree()),/hay cambios posteriores/);},{rows:[version()],reply:q=>q.method==='POST'?wait.promise:undefined});
});
test('a refused backup leaves both the current draft and chosen historical version intact',async()=>{
 await withUI(async r=>{const before=clone(r.source.current);button(r,'Restaurar al borrador').props.onClick();await r.flush();assert.deepEqual(r.source.current,before);assert.deepEqual(r.restored,[]);assert.match(text(r.tree()),/QA backup failure/);},{rows:[version()],reply:q=>q.method==='POST'?Response.json({error:'QA backup failure'},{status:409}):undefined});
});
test('a note uses same-turn current text, rejects duplicate submission and retains later text after its ACK',async()=>{
 const wait=deferred();await withUI(async r=>{const field=input(r,'Observación del diseño'),action=button(r,'Añadir nota').props.onClick;field.props.onChange({target:{value:'QA submitted'}});action();action();await r.flush();assert.equal(mutate(r).length,1);assert.equal(mutate(r)[0].body.note.text,'QA submitted');input(r,'Observación del diseño').props.onChange({target:{value:'QA later note'}});await r.flush();wait.resolve(Response.json({success:true}));await r.flush();assert.equal(input(r,'Observación del diseño').props.value,'QA later note');assert.match(text(r.tree()),/QA submitted/);assert.equal(r.beforeUnload(),true);},{reply:q=>q.method==='POST'?wait.promise:undefined});
});
test('parent save/publication guards prevent mutations of the history too',async()=>{
 await withUI(async r=>{button(r,'Restaurar al borrador').props.onClick();input(r,'Observación del diseño').props.onChange({target:{value:'QA blocked'}});button(r,'Añadir nota').props.onClick();await r.flush();assert.equal(mutate(r).length,0);assert.deepEqual(r.restored,[]);},{rows:[version()],allowed:false});
});
test('a late history operation after unmount cannot write UI state or announce a canceled schedule',async()=>{
 const wait=deferred();await withUI(async r=>{button(r,'Cancelar').props.onClick();await r.flush();r.unmount();wait.resolve(Response.json({success:true}));await r.flush();assert.equal(r.late(),0);},{rows:[scheduled()],reply:q=>q.method==='DELETE'?wait.promise:undefined});
});
test('Google entry locks before render and navigates only to the verified auth origin after SDK completion',async()=>{
 const wait=deferred();await withUI(async r=>{const action=button(r,'Continuar con Google').props.onClick,pending=action();action();await r.flush();assert.equal(r.oauthCalls.length,1);assert.equal(r.oauthCalls[0].options.skipBrowserRedirect,true);assert.deepEqual(r.navigation,[]);wait.resolve({data:{url:'https://qa-project.supabase.co/auth/v1/authorize?provider=google'},error:null});await pending;await r.flush();assert.equal(r.navigation.length,1);},{component:Google,reply:()=>wait.promise});
});
test('Google SDK timeout releases the button and ignores a late URL instead of redirecting unexpectedly',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();await withUI(async r=>{const pending=button(r,'Continuar con Google').props.onClick();await r.flush();t.mock.timers.tick(25000);await pending;await r.flush();assert.equal(button(r,'Continuar con Google').props.disabled,false);assert.match(text(r.tree()),/No se pudo abrir/);wait.resolve({data:{url:'https://qa-project.supabase.co/auth/v1/authorize?provider=google'},error:null});await r.flush();assert.deepEqual(r.navigation,[]);},{component:Google,reply:()=>wait.promise});
});
test('a foreign OAuth URL or unmounted success never redirects',async()=>{
 await withUI(async r=>{await button(r,'Continuar con Google').props.onClick();await r.flush();assert.deepEqual(r.navigation,[]);assert.match(text(r.tree()),/No se pudo abrir/);},{component:Google,reply:async()=>({data:{url:'https://other.invalid/collect'},error:null})});
 const wait=deferred();await withUI(async r=>{const pending=button(r,'Continuar con Google').props.onClick();r.unmount();wait.resolve({data:{url:'https://qa-project.supabase.co/auth/v1/authorize'},error:null});await pending;await r.flush();assert.deepEqual(r.navigation,[]);assert.equal(r.late(),0);},{component:Google,reply:()=>wait.promise});
});
test('client approval uses a single confirmed note and cannot repeat an uncertain submission',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();await withUI(async r=>{const action=button(r,'Aprobar versión').props.onClick;action();action();await r.flush();assert.equal(mutate(r).length,1);t.mock.timers.tick(25000);await r.flush();assert.match(text(r.tree()),/No pudimos confirmar la observación/);action();await r.flush();assert.equal(mutate(r).length,1);wait.resolve(Response.json({success:true}));await r.flush();assert.doesNotMatch(text(r.tree()),/Tu respuesta quedó guardada/);},{component:ClientReview,reply:q=>q.method==='POST'?wait.promise:undefined});
});

test('validity admits one synchronous operation and retains its idempotency UUID after a deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();await withUI(async r=>{
  t.mock.timers.tick(400);await r.flush();const reason=nodes(r.tree(),n=>n.type==='textarea')[0],check=nodes(r.tree(),n=>n.type==='input'&&n.props.type==='checkbox')[0];assert(reason&&check);
  reason.props.onChange({target:{value:'QA extension'}});check.props.onChange({target:{checked:true}});await r.flush();const action=button(r,'Guardar acuerdo de vigencia').props.onClick;action();action();await r.flush();assert.equal(mutate(r).length,1);const original=clone(mutate(r)[0].body);t.mock.timers.tick(12000);await r.flush();assert.match(text(r.tree()),/No sabemos si el servidor/);assert.equal(button(r,'Verificar el mismo cambio').props.disabled,false);
  button(r,'Verificar el mismo cambio').props.onClick();await r.flush();assert.equal(mutate(r).length,2);assert.deepEqual(mutate(r)[1].body,original);wait.resolve({validity:{...invitationValidity(r.source.current),revision:1,expiresAt:'2027-07-30'},history:[]});await r.flush();assert.match(text(r.tree()),/Vigencia guardada/);
 },{component:Validity,reply:q=>q.method==='POST'?wait.promise.then(body=>Response.json(body)):undefined});
});
test('a stalled validity read ends in a recoverable error instead of an endless loading state',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const wait=deferred();await withUI(async r=>{t.mock.timers.tick(400);await r.flush();t.mock.timers.tick(12000);await r.flush();assert.match(text(r.tree()),/espera terminó|interrumpió/);assert.equal(button(r,'Actualizar').props.disabled,false);wait.resolve(Response.json({validity:invitationValidity(r.source.current),history:[]}));await r.flush();assert.doesNotMatch(text(r.tree()),/Vencimiento actual/);},{component:Validity,reply:()=>wait.promise});
});

const field=(r,label)=>{const owner=nodes(r.tree(),n=>n.type==='label'&&text(n).startsWith(label))[0];assert(owner,'Expected '+label);return nodes(owner,n=>['input','select','textarea'].includes(n.type))[0];};
test('quality support, privacy, release and run fields merge same-turn edits over current configuration',async()=>{
 await withUI(async r=>{
  const before=clone(r.source.current.config);field(r,'Canal de soporte').props.onChange({target:{value:'QA soporte'}});field(r,'Horario y días').props.onChange({target:{value:'QA horario'}});field(r,'Responsable de eliminación').props.onChange({target:{value:'QA privacidad'}});field(r,'Responsable de incidentes').props.onChange({target:{value:'QA incidentes'}});field(r,'URL de vista previa').props.onChange({target:{value:'https://qa.invalid'}});field(r,'Versión para rollback').props.onChange({target:{value:'QA version'}});field(r,'Entorno').props.onChange({target:{value:'preview'}});field(r,'URL comprobada').props.onChange({target:{value:'https://qa.invalid/review'}});await r.flush();const q=r.source.current.config.qualityControl;
  assert.equal(q.support.channel,'QA soporte');assert.equal(q.support.availability,'QA horario');assert.equal(q.privacy.deletionOwner,'QA privacidad');assert.equal(q.privacy.incidentOwner,'QA incidentes');assert.equal(q.release.previewUrl,'https://qa.invalid');assert.equal(q.release.rollbackVersionId,'QA version');assert.equal(q.runs.exclusive.environment,'preview');assert.equal(q.runs.exclusive.url,'https://qa.invalid/review');assert.deepEqual(r.source.current.config.layout,before.layout);assert.equal(r.requests.length,0);
 },{component:Quality});
});
test('quality check result preserves evidence entered immediately before its click',async()=>{
 await withUI(async r=>{const detail=nodes(r.tree(),n=>n.type==='details')[0];assert(detail);const evidence=nodes(detail,n=>n.type==='input')[0],approve=nodes(detail,n=>n.type==='button'&&text(n)==='Aprobado')[0];evidence.props.onChange({target:{value:'QA evidencia explícita'}});approve.props.onClick();await r.flush();const record=r.source.current.config.qualityControl.runs.exclusive.checks[qualityChecksFor('exclusive')[0].id];assert.equal(record.evidence,'QA evidencia explícita');assert.equal(record.result,'passed');},{component:Quality});
});
test('retained quality handlers reject a different selected package and cannot bypass release requirements',async()=>{
 await withUI(async r=>{const old=field(r,'Canal de soporte').props.onChange,release=button(r,'Aprobar entrega').props.onClick;const pkg=nodes(r.tree(),n=>n.type==='button'&&text(n).startsWith('Plus'))[0];assert(pkg);pkg.props.onClick();old({target:{value:'QA obsolete'}});release();await r.flush();assert.equal(r.source.current.config.qualityControl,undefined);},{component:Quality});
});
