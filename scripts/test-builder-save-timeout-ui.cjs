// Real InvitationBuilder and Editable; panels/preview are inert boundaries.
// Simulated closest/blur, anchor defaults, lifecycle and fetch stay in RAM: no ReactDOM or real requests.
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
const transpile=(source,file)=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText;
require.extensions['.ts']=require.extensions['.tsx']=(mod,file)=>mod._compile(transpile(fs.readFileSync(file,'utf8'),file),file);
const React=require('react'),panels={},stub=(request,exports)=>require.cache[require.resolve(request)]={exports};
stub('next/navigation',{useRouter:()=>({push(){throw Error('Private preview must not use router.push');},replace(){},refresh(){}})});
for(const name of ['LivePreview','ContentPanel','StylePanel','MediaPanel','ConfigPanel','DecorPanel','MotionPanel','BlockEditorPanel','ElementsPanel','GuestsPanel','ExportPanel','VersionsPanel','QualityControlPanel']){
 const Component=panels[name]=()=>null;
 stub('../src/components/admin/builder/'+(name==='LivePreview'?'':'panels/')+name+'.tsx',{__esModule:true,default:Component});
}
stub('../src/components/invitations/blocks/registry.tsx',{cloneBlock:block=>({...block,id:'qa-desktop-clone'})});
const builderFile=path.join(root,'src/components/admin/builder/InvitationBuilder.tsx');
const source=process.argv.includes('--baseline')?require('node:child_process').execFileSync('git',['-c','core.fsmonitor=false','show','709b4ac:src/components/admin/builder/InvitationBuilder.tsx'],{cwd:root,encoding:'utf8'}):fs.readFileSync(builderFile,'utf8');
const compiled=new Module(builderFile,module);compiled.filename=builderFile;compiled.paths=Module._nodeModulePaths(path.dirname(builderFile));compiled._compile(transpile(source,builderFile),builderFile);
const Builder=compiled.exports.default,{marfilVivoDemo}=require('../src/lib/marfil-vivo.ts'),{validateInvitationBuilder}=require('../src/lib/builder-validation.ts');
const {Editable,BlockEditProvider}=require('../src/components/invitations/blocks/editable.tsx');
const {BlockDesignProvider}=require('../src/components/invitations/blocks/theme.tsx');
const {resolveBlockEditorProps}=require('../src/lib/block-bindings.ts');
const initialized=new WeakSet(),copy=value=>JSON.parse(JSON.stringify(value));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];
const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const button=(runner,label)=>nodes(runner.current(),node=>node.type==='button'&&text(node).trim()===label)[0];
const panel=(runner,name)=>nodes(runner.current(),node=>node.type===panels[name])[0];
const current=runner=>panel(runner,'LivePreview').props.invitation;
const historyButton=(runner,title)=>nodes(runner.current(),node=>node.type==='button'&&node.props.title===title)[0];
const base=()=>({...marfilVivoDemo(),id:'30000000-0000-4000-8000-000000000005',slug:'qa-builder-private-preview',names:'QA preview original',draft_revision:0,validity_mode:'automatic',validity_extra_days:0,validity_revision:0});
const oldVersion=data=>({id:'qa-desktop-historical',invitationId:data.id,label:'QA desktop historical',source:'publish',createdAt:1,publicationState:'published',data:{...copy(data),names:'QA desktop previous publication'}});

async function withBuilder(t,scenario,{initial=base(),reply,fixtureMode=false,initialOnline=true}={}){
 if(!initialized.has(t)){t.mock.timers.enable({apis:['setTimeout']});initialized.add(t);}
 assert.deepEqual(validateInvitationBuilder(initial).errors,[],'The fictional preset copy must pass real validation');
 const hookNames=['useState','useRef','useEffect','useMemo','useCallback'],hooks=Object.fromEntries(hookNames.map(name=>[name,React[name]]));
 const globalNames=['window','document','fetch','navigator','alert','confirm'],globals=Object.fromEntries(globalNames.map(name=>[name,Object.getOwnPropertyDescriptor(global,name)]));
 const slots=[],requests=[],alerts=[],nativeIntents=[],renders=[],local=new Map(),events=new Map(),unexpected=[];let renderInitial=initial,renderFixture=fixtureMode;
 let cursor=0,dirty=true,tree,effects=[],unmounted=false,revision=initial.draft_revision??0;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 React.useState=initialValue=>{const index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initialValue==='function'?initialValue():initialValue};slot.set=value=>{const next=typeof value==='function'?value(slot.value):value;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useRef=value=>{const index=cursor++;return slots[index]??(slots[index]={current:value});};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:compute(),deps};return slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const index=cursor++,previous=slots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 const install=(name,value)=>Object.defineProperty(global,name,{configurable:true,writable:true,value});
 install('window',{innerWidth:1440,localStorage:{getItem:key=>local.get(key)??null,setItem:(key,value)=>local.set(key,value),removeItem:key=>local.delete(key)},addEventListener:(name,callback)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(callback);},removeEventListener:(name,callback)=>events.get(name)?.delete(callback),setTimeout,clearTimeout,confirm:()=>true,open(){unexpected.push('window.open');throw Error('Private preview must use the native anchor');}});
 install('document',{getElementById:()=>null});install('navigator',{onLine:initialOnline});install('alert',value=>alerts.push(value));install('confirm',()=>true);
 const stored=()=>Response.json({draft_revision:++revision,expires_at:initial.expires_at,validity_mode:initial.validity_mode,validity_extra_days:initial.validity_extra_days,validity_revision:initial.validity_revision});
 install('fetch',async(url,init={})=>{
  const request={url,signal:init.signal,method:init.method??'GET',body:init.body?JSON.parse(init.body):null};requests.push(request);
  const allowed=(request.method==='GET'&&String(url).startsWith('/api/admin/builder-state?'))||(request.method==='POST'&&url==='/api/admin/builder-state')||(request.method==='PUT'&&url==='/api/admin/invitations');
  if(!allowed){unexpected.push(request);throw Error('Unexpected private-preview RAM request');}
  if(reply){const response=reply(request,{requests,stored});if(response!==undefined)return response;}
  return request.method==='GET'?Response.json({versions:[],notes:[]}):request.method==='PUT'?stored():Response.json({success:true});
 });
 const drain=async()=>{for(let round=0;round<4;round++)await new Promise(done=>setImmediate(done));};
 const flush=async()=>{for(let round=0;round<45;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];tree=Builder({initialData:renderInitial,backHref:'/socios/panel',builderPath:'/socios/constructor',fixtureMode:renderFixture});renders.push(tree);for(const effect of effects)effect();}await new Promise(done=>setImmediate(done));if(!dirty||unmounted)return tree;}throw Error('Private-preview hooks did not settle');};
 const dispatch=(name,event)=>{for(const callback of [...(events.get(name)??[])])callback(event);};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const runner={flush,drain,current:()=>tree,initialData:initial,requests,alerts,nativeIntents,renders,local,stored,unmount,dispatch,setProps:async patch=>{if('initialData' in patch)renderInitial=patch.initialData;if('fixtureMode' in patch)renderFixture=patch.fixtureMode;dirty=true;await flush();},rerender:async()=>{dirty=true;await flush();},listenerCount:name=>events.get(name)?.size??0,puts:()=>requests.filter(request=>request.method==='PUT'),publications:()=>requests.filter(request=>request.method==='POST'&&['publish','schedule'].includes(request.body?.action)),advance:async milliseconds=>{t.mock.timers.tick(milliseconds);await flush();},beforeUnload:()=>{const event={prevented:false,preventDefault(){this.prevented=true;},returnValue:undefined};dispatch('beforeunload',event);return event;},key:(options={})=>{const event={key:'s',ctrlKey:true,metaKey:false,altKey:false,shiftKey:false,isComposing:false,repeat:false,defaultPrevented:false,target:{tagName:'DIV',isContentEditable:false},preventCalls:0,preventDefault(){this.defaultPrevented=true;this.preventCalls++;},...options};dispatch('keydown',event);return event;}};
 // Let already-queued isolated continuations reach their held boundary before restoring globals,
 // including when the negative-control source fails an assertion before a public operation awaits.
 try{await flush();return await scenario(runner);}finally{unmount();await drain();for(const name of hookNames)React[name]=hooks[name];for(const name of globalNames)if(globals[name])Object.defineProperty(global,name,globals[name]);else delete global[name];assert.deepEqual(unexpected,[],'The transport never delegates to the real network');}
}
const click=async(runner,label)=>{const action=button(runner,label);assert.ok(action,'Expected '+label);assert.equal(!!action.props.disabled,false);const pending=action.props.onClick();await runner.flush();return{pending};};
const edit=async(runner,names)=>{if(!panel(runner,'ContentPanel'))await click(runner,'1. Datos');panel(runner,'ContentPanel').props.onChange({names});await runner.flush();};
const assertPending=runner=>{assert.match(text(runner.current()),/Cambios sin guardar|Error al guardar/);assert.equal(runner.beforeUnload().prevented,true);assert.equal(historyButton(runner,'Deshacer (Ctrl+Z)').props.disabled,false);};

const inlineFixture=(bound=false)=>{const data=base();return{...data,config:{...data.config,layout:{...data.config.layout,blocks:[...data.config.layout.blocks,{id:'qa-inline-save',type:'text',enabled:true,props:{text:'QA inline literal',qaOriginal:'/qa-original-inline.svg'},bindings:{...(bound?{text:'couple.full'}:{}),untouched:'couple.groom'},style:{padTop:37,italic:true}}]}}};};
const inlineBlock=data=>data.config.layout.blocks.find(block=>block.id==='qa-inline-save');
function inlineBridge(runner,newText){
 const preview=panel(runner,'LivePreview').props,block=inlineBlock(preview.invitation);
 const values=new Map([[BlockEditProvider._context,{editing:true,onEdit:(key,value)=>preview.onEditBlockProp(block.id,key,value)}],[BlockDesignProvider._context,{}]]);
 const original=React.useContext;let rendered;
 React.useContext=context=>{assert.ok(values.has(context),'Only the real edit/design contexts are expected');return values.get(context);};
 try{rendered=Editable({k:'text',value:String(resolveBlockEditorProps(block,preview.invitation).text)});}finally{React.useContext=original;}
 assert.equal(rendered.props.contentEditable,true);assert.equal(rendered.props['data-edit-key'],'text');
 const editable={tagName:'SPAN',isContentEditable:true,textContent:newText,closest(selector){return selector==='[data-edit-key][contenteditable="true"]'?this:null;},blurCalls:0,selectors:[],blur(){this.blurCalls++;rendered.props.onBlur({currentTarget:this});}};
 const target={tagName:'STRONG',isContentEditable:true,closest(selector){editable.selectors.push(selector);return selector==='[data-edit-key][contenteditable="true"]'?editable:null;}};
 return{rendered,editable,target};
}


const preview=r=>nodes(r.current(),n=>['a','button'].includes(n.type)&&n.props['aria-label']==='Abrir vista privada del borrador')[0];
const timeout=25_000;
const uncertain=r=>{
 assert.match(text(r.current()),/El guardado no respondió en 25 segundos/);
 assert.match(text(r.current()),/El servidor puede haberlos recibido/);
 assert.match(text(r.current()),/Error al guardar/);
 assert.ok(button(r,'Descargar respaldo de mis cambios'));
 assert.equal(button(r,'Guardar').props.disabled,true);
 assert.equal(button(r,'Guardar').props['aria-busy'],false);
 assert.equal(button(r,'Publicar').props.disabled,true);
 assert.equal(preview(r).type,'button');
 assert.equal(r.beforeUnload().prevented,true);
 assert.equal(r.requests.some(q=>q.body?.version?.source==='save'),false);
};

for(const automatic of [false,true])test((automatic?'automatic':'manual')+' save bounds pending headers AND JSON, preserves newest edits and ignores a late acknowledgement',async t=>{
 for(const phase of ['headers','body']){
  const wait=deferred();await withBuilder(t,async r=>{
   await edit(r,'QA attempt A');let op;
   if(automatic)await r.advance(2500);else op=await click(r,'Guardar');
   assert.equal(r.puts().length,1);await edit(r,'QA latest B');const latest=copy(current(r));
   await r.advance(timeout-1);assert.doesNotMatch(text(r.current()),/El guardado no respondió/);
   await r.advance(1);uncertain(r);await op?.pending;
   assert.equal(r.puts()[0].signal.aborted,true);assert.deepEqual(current(r),latest);
   wait.resolve(phase==='headers'?Response.json({draft_revision:1,validity_revision:999,validity_extra_days:99}):{draft_revision:1,validity_revision:999,validity_extra_days:99});
   await r.flush();assert.deepEqual(current(r),latest);uncertain(r);await r.advance(timeout*3);assert.equal(r.puts().length,1);
  },{reply:q=>q.method==='PUT'?(phase==='headers'?wait.promise:{ok:true,status:200,json:()=>wait.promise}):undefined});
 }
});

test('a timed out autosave drops an already queued newer manual save without a second PUT',async t=>{
 const wait=deferred();await withBuilder(t,async r=>{
  await edit(r,'QA autosave A');await r.advance(2500);await edit(r,'QA queued B');const op=await click(r,'Guardar');
  await r.advance(timeout);uncertain(r);await op.pending;assert.equal(r.puts().length,1);
  wait.resolve(r.stored());await r.flush();assert.equal(current(r).names,'QA queued B');uncertain(r);assert.equal(r.puts().length,1);
 },{reply:q=>q.method==='PUT'?wait.promise:undefined});
});

test('manual handlers, keyboard, reconnect, future autosave and public version actions cannot retry an uncertain PUT',async t=>{
 const wait=deferred();await withBuilder(t,async r=>{
  await edit(r,'QA timeout');const oldSave=button(r,'Guardar').props.onClick,oldPublish=button(r,'Publicar').props.onClick;
  await click(r,'4. Revisar');const versions=panel(r,'VersionsPanel').props;const duplicate=nodes(r.current(),n=>n.type==='button'&&n.props['aria-label']==='Duplicar invitación')[0].props.onClick;await click(r,'Más herramientas');await click(r,'Config');const remove=panel(r,'ConfigPanel').props.onDelete;
  const op=await click(r,'Guardar');await r.advance(timeout);uncertain(r);await op.pending;
  await oldSave();oldPublish();versions.onUnpublish();versions.onRollback(oldVersion(r.initialData));await duplicate();await remove();
  r.key();r.dispatch('online',{});await r.flush();await edit(r,'QA edited after timeout');await r.advance(timeout*3);
  uncertain(r);assert.equal(current(r).names,'QA edited after timeout');assert.equal(r.puts().length,1);assert.equal(r.publications().length,0);
  wait.resolve(r.stored());await r.flush();uncertain(r);
 },{reply:q=>q.method==='PUT'?wait.promise:undefined});
});

test('a prepublication or prescheduling PUT timeout never sends its public snapshot and leaves an escapable dialog',async t=>{
 for(const scheduled of [false,true]){
  const wait=deferred();await withBuilder(t,async r=>{
   await edit(r,'QA no publication after timeout');await click(r,'Publicar');if(scheduled)await click(r,'Programar fecha');
   const label=scheduled?'Programar publicación':'Publicar esta versión',action=button(r,label).props.onClick;
   const op=await click(r,label);await r.advance(timeout);uncertain(r);await op.pending;
   assert.equal(button(r,'Seguir editando').props.disabled,false);await action();await r.flush();assert.equal(r.puts().length,1);assert.equal(r.publications().length,0);
   await click(r,'Seguir editando');assert.equal(nodes(r.current(),n=>n.props.role==='dialog').length,0);
   wait.resolve(r.stored());await r.flush();uncertain(r);
  },{reply:q=>q.method==='PUT'?wait.promise:undefined});
 }
});

test('an unchanged draft with an uncertain manual save also warns on leaving and cannot be previewed',async t=>{
 const wait=deferred();await withBuilder(t,async r=>{
  const before=copy(current(r)),op=await click(r,'Guardar');await r.advance(timeout);uncertain(r);await op.pending;
  assert.deepEqual(current(r),before);wait.resolve(r.stored());await r.flush();uncertain(r);
 },{reply:q=>q.method==='PUT'?wait.promise:undefined});
});

test('backup remains usable after timeout and contains current content and original design and media',async t=>{
 const wait=deferred();await withBuilder(t,async r=>{
  await edit(r,'QA backup A');const op=await click(r,'Guardar');await r.advance(timeout);uncertain(r);await op.pending;
  await edit(r,'QA backup newest B');const expected=copy(current(r));
  const create=URL.createObjectURL,revoke=URL.revokeObjectURL;let blob,download,clicked=false;
  URL.createObjectURL=value=>{blob=value;return 'blob:qa-local-only';};URL.revokeObjectURL=url=>assert.equal(url,'blob:qa-local-only');
  document.createElement=tag=>{assert.equal(tag,'a');return{set href(value){assert.equal(value,'blob:qa-local-only');},set download(value){download=value;},click(){clicked=true;}};};
  try{button(r,'Descargar respaldo de mis cambios').props.onClick();assert.equal(clicked,true);assert.equal(download,expected.slug+'-respaldo.json');assert.deepEqual(JSON.parse(await blob.text()),expected);}finally{URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
  assert.equal(r.puts().length,1);wait.resolve(r.stored());await r.flush();uncertain(r);
 },{reply:q=>q.method==='PUT'?wait.promise:undefined});
});

test('a valid complete response before the deadline clears its timer and retains normal saving',async t=>{
 const wait=deferred();await withBuilder(t,async r=>{
  await edit(r,'QA timely save');const op=await click(r,'Guardar');await r.advance(timeout-1);
  wait.resolve(r.stored());await op.pending;await r.flush();assert.equal(r.beforeUnload().prevented,false);
  assert.equal(r.puts()[0].signal?.aborted??false,false);assert.equal(preview(r).type,'a');await r.advance(timeout*3);
  assert.doesNotMatch(text(r.current()),/El guardado no respondió/);assert.equal(button(r,'Guardar').props.disabled,false);assert.equal(r.puts().length,1);
 },{reply:q=>q.method==='PUT'?wait.promise:undefined});
});

test('a definitive HTTP rejection preserves the existing explicit retry flow',async t=>{
 let reject=true;await withBuilder(t,async r=>{
  await edit(r,'QA rejected save');const first=await click(r,'Guardar');await first.pending;await r.flush();assert.match(text(r.current()),/QA conflict/);assert.equal(button(r,'Guardar').props.disabled,false);
  reject=false;const second=await click(r,'Guardar');await second.pending;await r.flush();assert.equal(r.puts().length,2);assert.equal(r.beforeUnload().prevented,false);assert.equal(preview(r).type,'a');
 },{reply:q=>q.method==='PUT'&&reject?Response.json({error:'QA conflict'},{status:409}):undefined});
});
