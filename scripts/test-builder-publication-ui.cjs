// Real InvitationBuilder state/effects and publication persistence, isolated from HTTP and DOM renderers.
// Fictional copies of an existing preset preserve its original resource paths; no production or bank traffic.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react'),router={push:()=>{},replace:()=>{},refresh:()=>{}},panels={};
const replace=(file,exports)=>{require.cache[require.resolve(file)]={exports};};
replace('next/navigation',{useRouter:()=>router});
for(const name of ['LivePreview','ContentPanel','StylePanel','MediaPanel','ConfigPanel','DecorPanel','MotionPanel','BlockEditorPanel','ElementsPanel','GuestsPanel','ExportPanel','VersionsPanel','QualityControlPanel']){
 const stub=()=>null;panels[name]=stub;replace('../src/components/admin/builder/'+(name==='LivePreview'?'':'panels/')+name+'.tsx',{__esModule:true,default:stub});
}
replace('../src/components/invitations/blocks/registry.tsx',{cloneBlock:block=>({...block,id:'qa-clone'})});
const Builder=require('../src/components/admin/builder/InvitationBuilder.tsx').default;
const {marfilVivoDemo}=require('../src/lib/marfil-vivo.ts'),{validateInvitationBuilder}=require('../src/lib/builder-validation.ts');
const initialized=new WeakSet(),deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};},copy=value=>JSON.parse(JSON.stringify(value));
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];
const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const button=(runner,label)=>nodes(runner.current(),node=>node.type==='button'&&text(node.props.children).trim()===label)[0];
const panel=(runner,name)=>nodes(runner.current(),node=>node.type===panels[name])[0];
const current=runner=>panel(runner,'LivePreview').props.invitation;
const historyButton=(runner,title)=>nodes(runner.current(),node=>node.type==='button'&&node.props.title===title)[0];
const click=async(runner,label)=>{const action=button(runner,label);assert.ok(action,'Expected '+label);assert.equal(!!action.props.disabled,false);const pending=action.props.onClick();await runner.flush();return{pending};};
const base=()=>({...marfilVivoDemo(),id:'30000000-0000-4000-8000-000000000001',slug:'qa-builder-publication',names:'QA current draft',draft_revision:0,validity_mode:'automatic',validity_extra_days:0,validity_revision:0});
const oldVersion=data=>({id:'version-qa-old',invitationId:data.id,label:'QA previous publication',source:'publish',createdAt:1,publicationState:'published',data:{...copy(data),names:'QA historical snapshot'}});
async function withBuilder(t,scenario,{initial,reply}={}){
 if(!initialized.has(t)){t.mock.timers.enable({apis:['setTimeout']});initialized.add(t);}
 const initialData=initial??base();assert.deepEqual(validateInvitationBuilder(initialData).errors,[],'The fixture must pass real publication validation');
 const hookNames=['useState','useRef','useEffect','useMemo','useCallback'],original=Object.fromEntries(hookNames.map(name=>[name,React[name]])),oldWindow=global.window,oldDocument=global.document,oldFetch=global.fetch,oldNavigator=Object.getOwnPropertyDescriptor(global,'navigator'),oldAlert=global.alert,oldConfirm=global.confirm;
 const slots=[],snapshots=[],requests=[],alerts=[],events=new Map(),local=new Map(),unexpected=[];let cursor=0,dirty=true,tree,effects=[],unmounted=false,revision=0;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((item,index)=>Object.is(item,b[index]));
 React.useState=initial=>{const index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initial==='function'?initial():initial};slot.set=next=>{next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useRef=initial=>{const index=cursor++;return slots[index]??(slots[index]={current:initial});};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:compute(),deps};return slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const index=cursor++,previous=slots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 global.window={innerWidth:390,localStorage:{getItem:key=>local.get(key)??null,setItem:(key,value)=>local.set(key,value),removeItem:key=>local.delete(key)},addEventListener:(name,callback)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(callback);},removeEventListener:(name,callback)=>events.get(name)?.delete(callback),setTimeout,clearTimeout,confirm:()=>true};
 global.document={getElementById:()=>null};Object.defineProperty(global,'navigator',{configurable:true,value:{onLine:true}});global.alert=value=>alerts.push(value);global.confirm=()=>true;
 const stored=()=>Response.json({draft_revision:++revision,expires_at:initialData.expires_at,validity_mode:initialData.validity_mode,validity_extra_days:initialData.validity_extra_days,validity_revision:initialData.validity_revision});
 global.fetch=async(url,init={})=>{
  const record={url,method:init.method??'GET',body:init.body?JSON.parse(init.body):null};requests.push(record);
  const allowed=(record.method==='GET'&&String(url).startsWith('/api/admin/builder-state?'))||(record.method==='POST'&&url==='/api/admin/builder-state')||(record.method==='PUT'&&url==='/api/admin/invitations');if(!allowed){unexpected.push(record);throw Error('Unexpected isolated builder request');}
  if(reply){const response=reply(record,{requests,stored});if(response!==undefined)return response;}
  // Deferred test acknowledgements may already have advanced the server revision.
  if(record.method==='PUT')revision=Math.max(revision,record.body.expectedDraftRevision);
  return record.method==='GET'?Response.json({versions:[],notes:[]}):record.method==='PUT'?stored():Response.json({success:true});
 };
 const flush=async()=>{for(let round=0;round<40;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];tree=Builder({initialData,backHref:'/socios/panel',builderPath:'/socios/constructor'});snapshots.push(tree);for(const effect of effects)effect();}await new Promise(resolve=>setImmediate(resolve));if(!dirty||unmounted)return tree;}throw Error('Builder effects did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const runner={flush,current:()=>tree,initialData,snapshots,requests,alerts,local,unmount,advance:async milliseconds=>{t.mock.timers.tick(milliseconds);return flush();},beforeUnload:()=>{const event={prevented:false,preventDefault(){this.prevented=true;},returnValue:undefined};for(const callback of events.get('beforeunload')??[])callback(event);return event;},puts:()=>requests.filter(value=>value.method==='PUT'),publications:()=>requests.filter(value=>value.method==='POST'&&['publish','schedule'].includes(value.body?.action))};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of hookNames)React[name]=original[name];if(oldWindow===undefined)delete global.window;else global.window=oldWindow;if(oldDocument===undefined)delete global.document;else global.document=oldDocument;global.fetch=oldFetch;if(oldNavigator)Object.defineProperty(global,'navigator',oldNavigator);else delete global.navigator;if(oldAlert===undefined)delete global.alert;else global.alert=oldAlert;if(oldConfirm===undefined)delete global.confirm;else global.confirm=oldConfirm;assert.deepEqual(unexpected,[]);}
}
const edit=async(runner,names)=>{if(!panel(runner,'ContentPanel'))await click(runner,'1. Datos');panel(runner,'ContentPanel').props.onChange({names});await runner.flush();};
const startRollback=async runner=>{await click(runner,'4. Revisar');const pending=panel(runner,'VersionsPanel').props.onRollback(oldVersion(runner.initialData));await runner.flush();return{pending};};
const publishedId=async runner=>{await click(runner,'4. Revisar');return panel(runner,'VersionsPanel').props.publishedVersionId;};
const startPublication=async(runner,mode='publish')=>{await click(runner,'Publicar');if(mode==='schedule')await click(runner,'Programar fecha');return click(runner,mode==='schedule'?'Programar publicación':'Publicar esta versión');};
const assertDirtyUndo=runner=>{assert.match(text(runner.current()),/Cambios sin guardar|Error al guardar/);assert.equal(runner.beforeUnload().prevented,true);assert.equal(historyButton(runner,'Deshacer (Ctrl+Z)').props.disabled,false);};

test('a delayed rollback publication preserves newer editing, dirty state and undo without PUT of the historical snapshot',async t=>{
 const publication=deferred();await withBuilder(t,async runner=>{
  const {pending}=await startRollback(runner);assert.equal(runner.publications().length,1);assert.equal(runner.publications()[0].body.version.data.names,'QA historical snapshot');await edit(runner,'QA newer edit B');publication.resolve(Response.json({success:true}));await pending;await runner.flush();
  assert.equal(current(runner).names,'QA newer edit B');assertDirtyUndo(runner);assert.equal(runner.puts().some(value=>value.body.names==='QA historical snapshot'),false);const acceptedId=await publishedId(runner);assert.ok(acceptedId);assert.equal(current(runner).config.workflow.lastPublishedVersionId,acceptedId);assert.equal(current(runner).config.workflow.reviewStatus,'pending');assert.deepEqual(current(runner).config.layout,runner.initialData.config.layout);
  historyButton(runner,'Deshacer (Ctrl+Z)').props.onClick();await runner.flush();assert.equal(current(runner).names,'QA current draft');assert.equal(current(runner).status,'ready');assert.equal(current(runner).config.workflow.lastPublishedVersionId,acceptedId);historyButton(runner,'Rehacer (Ctrl+Shift+Z)').props.onClick();await runner.flush();assert.equal(current(runner).names,'QA newer edit B');assert.equal(current(runner).config.workflow.lastPublishedVersionId,acceptedId);
 },{reply:record=>record.body?.action==='publish'?publication.promise:undefined});
});

test('a rollback without intervening edits replaces the draft, synchronizes it once and resets undo',async t=>{
 await withBuilder(t,async runner=>{
  const {pending}=await startRollback(runner);await pending;await runner.flush();assert.equal(current(runner).names,'QA historical snapshot');assert.equal(current(runner).status,'ready');assert.equal(runner.puts().length,1);assert.equal(runner.puts()[0].body.names,'QA historical snapshot');assert.match(text(runner.current()),/Guardado/);assert.equal(runner.beforeUnload().prevented,false);assert.equal(historyButton(runner,'Deshacer (Ctrl+Z)').props.disabled,true);assert.equal(runner.publications().length,1);assert.ok(await publishedId(runner));
 });
});

test('publication and scheduling retain edits made while their immutable version is being committed',async t=>{
 for(const mode of ['publish','schedule']){
  const publication=deferred();await withBuilder(t,async runner=>{
   const {pending}=await startPublication(runner,mode);assert.equal(runner.publications().length,1);assert.equal(runner.publications()[0].body.action,mode);assert.equal(runner.puts().length,1);await edit(runner,'QA newer '+mode+' edit');publication.resolve(Response.json({success:true}));await pending;await runner.flush();
   assert.equal(current(runner).names,'QA newer '+mode+' edit');assertDirtyUndo(runner);assert.equal(runner.puts().length,1,'Only the pre-publication PUT may contain the captured older names');assert.equal(runner.publications()[0].body.version.data.names,'QA current draft');assert.equal(nodes(runner.current(),node=>node.props.role==='dialog').length,0);
   if(mode==='publish')assert.ok(await publishedId(runner));else{await click(runner,'Publicar');assert.match(text(runner.current()),/Ya existe una publicación programada/);}
  },{reply:record=>record.body?.action===mode?publication.promise:undefined});
 }
});

test('an existing autosave settles before rollback publication and a subsequent edit cannot queue the historical draft',async t=>{
 const autosave=deferred();let held=true;await withBuilder(t,async runner=>{
  await edit(runner,'QA edit A before autosave');await runner.advance(2500);assert.equal(runner.puts().length,1);const {pending}=await startRollback(runner);assert.equal(runner.publications().length,0,'Publication waits for the previous autosave');assert.equal(runner.puts().length,1);await edit(runner,'QA edit B while rollback sync is queued');
  autosave.resolve(Response.json({draft_revision:1,expires_at:runner.initialData.expires_at,validity_mode:runner.initialData.validity_mode,validity_extra_days:0,validity_revision:0}));await pending;await runner.flush();assert.equal(runner.publications().length,1);assert.equal(current(runner).names,'QA edit B while rollback sync is queued');assertDirtyUndo(runner);assert.equal(runner.puts().some(value=>value.body.names==='QA historical snapshot'),false);
  await runner.advance(2500);assert.equal(runner.puts().at(-1).body.names,'QA edit B while rollback sync is queued');assert.equal(current(runner).names,'QA edit B while rollback sync is queued');
 },{reply:record=>{if(record.method==='PUT'&&held){held=false;return autosave.promise;}}});
});

test('new autosaves wait during rollback publication and resume afterward with the retained newer edit',async t=>{
 const publication=deferred();await withBuilder(t,async runner=>{
  const {pending}=await startRollback(runner);await edit(runner,'QA autosaving edit B');await runner.advance(5000);assert.equal(runner.puts().length,0,'A new autosave must not race publication');publication.resolve(Response.json({success:true}));await pending;await runner.flush();assert.equal(current(runner).names,'QA autosaving edit B');assertDirtyUndo(runner);
  await runner.advance(2500);assert.equal(runner.puts().length,1);assert.equal(runner.puts()[0].body.names,'QA autosaving edit B');assert.equal(current(runner).names,'QA autosaving edit B');assert.equal(historyButton(runner,'Deshacer (Ctrl+Z)').props.disabled,false);assert.equal(runner.puts().some(value=>value.body.names==='QA historical snapshot'),false);assert.ok(await publishedId(runner));
 },{reply:record=>record.body?.action==='publish'?publication.promise:undefined});
});

test('a refused rollback publication preserves newer work and never claims a new published version or sends the historical draft',async t=>{
 const publication=deferred();await withBuilder(t,async runner=>{
  const {pending}=await startRollback(runner);await edit(runner,'QA edit B after refused publication');publication.resolve(Response.json({error:'QA publication refused'},{status:409}));await pending;await runner.flush();assert.equal(current(runner).names,'QA edit B after refused publication');assertDirtyUndo(runner);assert.equal(runner.puts().length,0);assert.equal(await publishedId(runner),undefined);assert.ok(runner.alerts.some(value=>/QA publication refused/.test(value)));assert.equal(runner.publications().length,1);
 },{reply:record=>record.body?.action==='publish'?publication.promise:undefined});
});

test('a confirmed rollback with failed draft synchronization remains recoverable without republishing on manual Save',async t=>{
 let fail=true;await withBuilder(t,async runner=>{
  const {pending}=await startRollback(runner);await pending;await runner.flush();assert.equal(current(runner).names,'QA historical snapshot');assert.equal(runner.beforeUnload().prevented,true);assert.match(text(runner.current()),/Error al guardar/);assert.ok(await publishedId(runner));assert.ok(runner.alerts.some(value=>/rollback.*publicado/i.test(value)));assert.equal(runner.publications().length,1);
  const writes=runner.puts().length;await runner.advance(5000);assert.equal(runner.puts().length,writes,'A failed final write must not automatically retry the same intent');assert.equal(runner.publications().length,1);assert.match(text(runner.current()),/Error al guardar/);assert.equal(runner.beforeUnload().prevented,true);
  fail=false;const saved=await click(runner,'Guardar');await saved.pending;await runner.flush();assert.equal(runner.publications().length,1);assert.equal(runner.puts().at(-1).body.names,'QA historical snapshot');assert.equal(runner.beforeUnload().prevented,false);assert.match(text(runner.current()),/Guardado/);
 },{reply:record=>record.method==='PUT'&&fail?Response.json({error:'QA failed draft synchronization'},{status:500}):undefined});
});

test('a late manual-save acknowledgement cannot clear a subsequent edit or record it as already saved',async t=>{
 const save=deferred();let held=true;await withBuilder(t,async runner=>{
  await edit(runner,'QA manual save A');const {pending}=await click(runner,'Guardar');assert.equal(runner.puts().length,1);await edit(runner,'QA newer manual edit B');save.resolve(Response.json({draft_revision:1,expires_at:runner.initialData.expires_at,validity_mode:runner.initialData.validity_mode,validity_extra_days:0,validity_revision:0}));await pending;await runner.flush();assert.equal(current(runner).names,'QA newer manual edit B');assertDirtyUndo(runner);assert.equal(runner.requests.some(value=>value.method==='POST'&&value.body?.version?.source==='save'),false);
 },{reply:record=>record.method==='PUT'&&held?(held=false,save.promise):undefined});
});

test('undo while rollback is pending remains a user edit and retains redo after the public acknowledgement',async t=>{
 const publication=deferred();await withBuilder(t,async runner=>{
  const {pending}=await startRollback(runner);await edit(runner,'QA undoable edit B');historyButton(runner,'Deshacer (Ctrl+Z)').props.onClick();await runner.flush();assert.equal(current(runner).names,'QA current draft');assert.equal(historyButton(runner,'Rehacer (Ctrl+Shift+Z)').props.disabled,false);
  publication.resolve(Response.json({success:true}));await pending;await runner.flush();assert.equal(current(runner).names,'QA current draft');assert.equal(runner.beforeUnload().prevented,true);assert.match(text(runner.current()),/Cambios sin guardar/);assert.equal(historyButton(runner,'Rehacer (Ctrl+Shift+Z)').props.disabled,false);assert.equal(runner.puts().length,0);historyButton(runner,'Rehacer (Ctrl+Shift+Z)').props.onClick();await runner.flush();assert.equal(current(runner).names,'QA undoable edit B');assert.equal(runner.publications().length,1);
 },{reply:record=>record.body?.action==='publish'?publication.promise:undefined});
});

test('a late final draft-sync acknowledgement leaves an edit made after public success dirty and undoable',async t=>{
 const sync=deferred();let held=true;await withBuilder(t,async runner=>{
  const {pending}=await startRollback(runner);assert.equal(runner.publications().length,1);assert.equal(runner.puts().length,1);assert.equal(runner.puts()[0].body.names,'QA historical snapshot');await edit(runner,'QA edit after public success');
  sync.resolve(Response.json({draft_revision:1,expires_at:runner.initialData.expires_at,validity_mode:runner.initialData.validity_mode,validity_extra_days:0,validity_revision:0}));await pending;await runner.flush();assert.equal(current(runner).names,'QA edit after public success');assertDirtyUndo(runner);assert.equal(runner.publications().length,1);assert.equal(runner.puts().length,1,'The earlier in-flight PUT may finish, but cannot trigger another obsolete synchronization');assert.ok(await publishedId(runner));
 },{reply:record=>record.method==='PUT'&&held?(held=false,sync.promise):undefined});
});

test('unpublishing uses the latest draft before its PUT and retains edits made during the pause acknowledgement',async t=>{
 const backup=deferred(),pause=deferred();let held=true;await withBuilder(t,async runner=>{
  await click(runner,'4. Revisar');const pending=panel(runner,'VersionsPanel').props.onUnpublish();await runner.flush();assert.equal(runner.puts().length,0);assert.equal(runner.requests.filter(value=>value.body?.version?.label==='Antes de despublicar').length,1);
  await edit(runner,'QA pause edit B before PUT');backup.resolve(Response.json({success:true}));await runner.flush();assert.equal(runner.puts().length,1);assert.equal(runner.puts()[0].body.names,'QA pause edit B before PUT');assert.equal(runner.puts()[0].body.status,'disabled');await edit(runner,'QA pause edit C during PUT');
  pause.resolve(Response.json({draft_revision:1,expires_at:runner.initialData.expires_at,validity_mode:runner.initialData.validity_mode,validity_extra_days:0,validity_revision:0}));await pending;await runner.flush();assert.equal(current(runner).names,'QA pause edit C during PUT');assert.equal(current(runner).status,'disabled');const pausedAt=current(runner).config.workflow.unpublishedAt;assert.ok(Number.isFinite(Date.parse(pausedAt)));assertDirtyUndo(runner);assert.match(text(runner.current()),/enlace quedó pausado/i);
  historyButton(runner,'Deshacer (Ctrl+Z)').props.onClick();await runner.flush();assert.equal(current(runner).status,'disabled');assert.equal(current(runner).config.workflow.unpublishedAt,pausedAt);historyButton(runner,'Rehacer (Ctrl+Shift+Z)').props.onClick();await runner.flush();assert.equal(current(runner).names,'QA pause edit C during PUT');assert.equal(current(runner).status,'disabled');
  await runner.advance(2500);assert.equal(runner.puts().length,2);assert.equal(runner.puts()[1].body.names,'QA pause edit C during PUT');assert.equal(runner.puts()[1].body.status,'disabled');assert.equal(runner.puts()[1].body.builder_config.workflow.unpublishedAt,pausedAt);assert.equal(runner.puts().some(value=>value.body.names==='QA current draft'),false);assert.equal(runner.publications().length,0);
 },{initial:{...base(),status:'ready'},reply:record=>record.body?.version?.label==='Antes de despublicar'?backup.promise:record.method==='PUT'&&held?(held=false,pause.promise):undefined});
});

test('a preceding manual save cannot release publication controls before the pending rollback acknowledges',async t=>{
 const save=deferred(),publication=deferred();let held=true;await withBuilder(t,async runner=>{
  await edit(runner,'QA manual save before rollback');await click(runner,'4. Revisar');const rollback=panel(runner,'VersionsPanel').props.onRollback,saveAction=button(runner,'Guardar').props.onClick;const manual=saveAction();await runner.flush();const pending=rollback(oldVersion(runner.initialData));await runner.flush();assert.equal(runner.puts().length,1);assert.equal(runner.publications().length,0);
  save.resolve(Response.json({draft_revision:1,expires_at:'2029-06-01',validity_mode:runner.initialData.validity_mode,validity_extra_days:6,validity_revision:3}));await manual;await runner.flush();assert.equal(runner.publications().length,1);assert.equal(button(runner,'Publicar').props.disabled,true);assert.equal(button(runner,'Guardando…').props.disabled,true);saveAction();await runner.flush();assert.equal(runner.puts().length,1,'A stale manual-save handler must not start a new write during publication');
  publication.resolve(Response.json({success:true}));await pending;await runner.flush();assert.equal(button(runner,'Publicar').props.disabled,false);assert.equal(button(runner,'Guardar').props.disabled,false);assert.equal(runner.publications().length,1);assert.equal(current(runner).names,'QA historical snapshot');assert.equal(current(runner).expires_at,'2029-06-01');assert.equal(current(runner).validity_revision,3);assert.equal(current(runner).validity_extra_days,6);assert.equal(runner.beforeUnload().prevented,false);assert.doesNotMatch(text(runner.current()),/Tus cambios posteriores/,'Canonical validity updates must not count as visual edits');
 },{reply:record=>record.method==='PUT'&&held?(held=false,save.promise):record.body?.action==='publish'?publication.promise:undefined});
});

test('an initial hydration response arriving after publication cannot replace its newer acknowledged public version',async t=>{
 const hydration=deferred();await withBuilder(t,async runner=>{
  assert.equal(runner.requests.filter(value=>value.method==='GET').length,1);const {pending}=await startRollback(runner);await pending;await runner.flush();const latestId=await publishedId(runner);assert.ok(latestId);assert.notEqual(latestId,'version-qa-old');assert.equal(current(runner).config.workflow.lastPublishedVersionId,latestId);
  hydration.resolve(Response.json({versions:[oldVersion(runner.initialData)],notes:[]}));await runner.flush();assert.equal(await publishedId(runner),latestId);assert.equal(current(runner).config.workflow.lastPublishedVersionId,latestId);assert.equal(current(runner).names,'QA historical snapshot');const mirrored=JSON.parse(runner.local.get('enkarta_builder_versions_v1')??'[]');assert.ok(mirrored.some(value=>value.id===latestId),'The acknowledged version must remain in its local history mirror');assert.equal(runner.publications().length,1);assert.equal(runner.requests.filter(value=>value.method==='GET').length,1);
 },{reply:record=>record.method==='GET'?hydration.promise:undefined});
});

