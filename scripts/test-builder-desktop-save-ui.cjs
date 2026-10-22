// Real InvitationBuilder hooks, keyboard listeners, persistence queue and versions.
// Panels/preview are inert; inline regressions bridge real Editable.onBlur to real parent callbacks.
// closest/blur and browser events are simulated in RAM, without claiming a DOM mount.
// No ReactDOM, production access, real storage, payments or invitation resources are used.
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
const transpile=(source,file)=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText;
require.extensions['.ts']=require.extensions['.tsx']=(mod,file)=>mod._compile(transpile(fs.readFileSync(file,'utf8'),file),file);
const React=require('react'),panels={},stub=(request,exports)=>require.cache[require.resolve(request)]={exports};
stub('next/navigation',{useRouter:()=>({push(){},replace(){},refresh(){}})});
for(const name of ['LivePreview','ContentPanel','StylePanel','MediaPanel','ConfigPanel','DecorPanel','MotionPanel','BlockEditorPanel','ElementsPanel','GuestsPanel','ExportPanel','VersionsPanel','QualityControlPanel']){
 const Component=panels[name]=()=>null;
 stub('../src/components/admin/builder/'+(name==='LivePreview'?'':'panels/')+name+'.tsx',{__esModule:true,default:Component});
}
stub('../src/components/invitations/blocks/registry.tsx',{cloneBlock:block=>({...block,id:'qa-desktop-clone'})});
const builderFile=path.join(root,'src/components/admin/builder/InvitationBuilder.tsx');
// Git is opt-in for reproducing defects, never required by the normal shallow-checkout CI run.
const source=process.argv.includes('--baseline')?require('node:child_process').execFileSync('git',['-c','core.fsmonitor=false','show','a242393:src/components/admin/builder/InvitationBuilder.tsx'],{cwd:root,encoding:'utf8'}):fs.readFileSync(builderFile,'utf8');
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
const base=()=>({...marfilVivoDemo(),id:'30000000-0000-4000-8000-000000000002',slug:'qa-builder-desktop-save',names:'QA desktop original',draft_revision:0,validity_mode:'automatic',validity_extra_days:0,validity_revision:0});
const oldVersion=data=>({id:'qa-desktop-historical',invitationId:data.id,label:'QA desktop historical',source:'publish',createdAt:1,publicationState:'published',data:{...copy(data),names:'QA desktop previous publication'}});

async function withBuilder(t,scenario,{initial=base(),reply,fixtureMode=false,libraryScope='admin'}={}){
 if(!initialized.has(t)){t.mock.timers.enable({apis:['setTimeout']});initialized.add(t);}
 assert.deepEqual(validateInvitationBuilder(initial).errors,[],'The fictional preset copy must pass real validation');
 const hookNames=['useState','useRef','useEffect','useMemo','useCallback'],hooks=Object.fromEntries(hookNames.map(name=>[name,React[name]]));
 const globalNames=['window','document','fetch','navigator','alert','confirm'],globals=Object.fromEntries(globalNames.map(name=>[name,Object.getOwnPropertyDescriptor(global,name)]));
 const slots=[],requests=[],alerts=[],local=new Map(),events=new Map(),unexpected=[];
 let cursor=0,dirty=true,tree,effects=[],unmounted=false,revision=initial.draft_revision??0;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 React.useState=initialValue=>{const index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initialValue==='function'?initialValue():initialValue};slot.set=value=>{const next=typeof value==='function'?value(slot.value):value;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useRef=value=>{const index=cursor++;return slots[index]??(slots[index]={current:value});};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:compute(),deps};return slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const index=cursor++,previous=slots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 const install=(name,value)=>Object.defineProperty(global,name,{configurable:true,writable:true,value});
 install('window',{innerWidth:1440,localStorage:{getItem:key=>local.get(key)??null,setItem:(key,value)=>local.set(key,value),removeItem:key=>local.delete(key)},addEventListener:(name,callback)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(callback);},removeEventListener:(name,callback)=>events.get(name)?.delete(callback),setTimeout,clearTimeout,confirm:()=>true});
 install('document',{getElementById:()=>null});install('navigator',{onLine:true});install('alert',value=>alerts.push(value));install('confirm',()=>true);
 const stored=()=>Response.json({draft_revision:++revision,expires_at:initial.expires_at,validity_mode:initial.validity_mode,validity_extra_days:initial.validity_extra_days,validity_revision:initial.validity_revision});
 install('fetch',async(url,init={})=>{
  const request={url,method:init.method??'GET',body:init.body?JSON.parse(init.body):null};requests.push(request);
  const allowed=(request.method==='GET'&&String(url).startsWith('/api/admin/builder-state?'))||(request.method==='POST'&&url==='/api/admin/builder-state')||(request.method==='PUT'&&url==='/api/admin/invitations');
  if(!allowed){unexpected.push(request);throw Error('Unexpected desktop-save RAM request');}
  if(reply){const response=reply(request,{requests,stored});if(response!==undefined)return response;}
  return request.method==='GET'?Response.json({versions:[],notes:[]}):request.method==='PUT'?stored():Response.json({success:true});
 });
 const drain=async()=>{for(let round=0;round<4;round++)await new Promise(done=>setImmediate(done));};
 const flush=async()=>{for(let round=0;round<45;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];tree=Builder({initialData:initial,backHref:'/socios/panel',builderPath:'/socios/constructor',fixtureMode,libraryScope});for(const effect of effects)effect();}await new Promise(done=>setImmediate(done));if(!dirty||unmounted)return tree;}throw Error('Desktop-save hooks did not settle');};
 const dispatch=(name,event)=>{for(const callback of [...(events.get(name)??[])])callback(event);};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const runner={flush,drain,current:()=>tree,initialData:initial,requests,alerts,local,stored,unmount,dispatch,listenerCount:name=>events.get(name)?.size??0,puts:()=>requests.filter(request=>request.method==='PUT'),publications:()=>requests.filter(request=>request.method==='POST'&&['publish','schedule'].includes(request.body?.action)),advance:async milliseconds=>{t.mock.timers.tick(milliseconds);await flush();},beforeUnload:()=>{const event={prevented:false,preventDefault(){this.prevented=true;},returnValue:undefined};dispatch('beforeunload',event);return event;},key:(options={})=>{const event={key:'s',ctrlKey:true,metaKey:false,altKey:false,shiftKey:false,isComposing:false,repeat:false,defaultPrevented:false,target:{tagName:'DIV',isContentEditable:false},preventCalls:0,preventDefault(){this.defaultPrevented=true;this.preventCalls++;},...options};dispatch('keydown',event);return event;}};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of hookNames)React[name]=hooks[name];for(const name of globalNames)if(globals[name])Object.defineProperty(global,name,globals[name]);else delete global[name];assert.deepEqual(unexpected,[],'The transport never delegates to the real network');}
}
const click=async(runner,label)=>{const action=button(runner,label);assert.ok(action,'Expected '+label);assert.equal(!!action.props.disabled,false);const pending=action.props.onClick();await runner.flush();return{pending};};
const edit=async(runner,names)=>{if(!panel(runner,'ContentPanel'))await click(runner,'1. Datos');panel(runner,'ContentPanel').props.onChange({names});await runner.flush();};
const assertPending=runner=>{assert.match(text(runner.current()),/Cambios sin guardar|Error al guardar/);assert.equal(runner.beforeUnload().prevented,true);assert.equal(historyButton(runner,'Deshacer (Ctrl+Z)').props.disabled,false);};
const targets=[{tagName:'INPUT'},{tagName:'TEXTAREA'},{tagName:'SELECT'},{tagName:'SPAN',isContentEditable:true}];

const inlineFixture=(bound=false)=>{const data=base();return{...data,config:{...data.config,layout:{...data.config.layout,blocks:[...data.config.layout.blocks,{id:'qa-inline-save',type:'text',enabled:true,props:{text:'QA inline literal',qaOriginal:'/qa-original-inline.svg'},bindings:{...(bound?{text:'couple.full'}:{}),untouched:'couple.groom'},style:{padTop:37,italic:true}}]}}};};
const inlineBlock=data=>data.config.layout.blocks.find(block=>block.id==='qa-inline-save');
function inlineBridge(runner,newText){
 const preview=panel(runner,'LivePreview').props,block=inlineBlock(preview.invitation);
 const values=new Map([[BlockEditProvider._context,{editing:true,onEdit:(key,value)=>preview.onEditBlockProp(block.id,key,value)}],[BlockDesignProvider._context,{}]]);
 const original=React.useContext;let rendered;
 React.useContext=context=>{assert.ok(values.has(context),'Only the real edit/design contexts are expected');return values.get(context);};
 try{rendered=Editable({k:'text',value:String(resolveBlockEditorProps(block,preview.invitation).text)});}finally{React.useContext=original;}
 assert.equal(rendered.props.contentEditable,true);assert.equal(rendered.props['data-edit-key'],'text');
 const editable={tagName:'SPAN',isContentEditable:true,textContent:newText,blurCalls:0,selectors:[],blur(){this.blurCalls++;rendered.props.onBlur({currentTarget:this});}};
 const target={tagName:'STRONG',isContentEditable:true,closest(selector){editable.selectors.push(selector);return selector==='[data-edit-key][contenteditable="true"]'?editable:null;}};
 return{rendered,editable,target};
}

test('Ctrl and Command Save persist the latest draft from text fields and contenteditable without changing original resources',async t=>{
 for(const modifier of ['ctrlKey','metaKey'])for(const target of targets)await withBuilder(t,async runner=>{
  await edit(runner,'QA latest '+modifier+' '+target.tagName);const before=copy(current(runner));
  const event=runner.key({ctrlKey:modifier==='ctrlKey',metaKey:modifier==='metaKey',key:modifier==='metaKey'?'S':'s',target});
  assert.equal(event.defaultPrevented,true);await runner.flush();assert.equal(runner.puts().length,1);assert.equal(runner.puts()[0].body.names,before.names);assert.deepEqual(runner.puts()[0].body.builder_config,before.config);assert.deepEqual(current(runner).config.layout,before.config.layout);assert.equal(runner.beforeUnload().prevented,false);assert.match(text(runner.current()),/Guardado/);
 });
});

test('unmodified, Shift, Alt, composing, previously handled and unrelated keys keep their native behavior',async t=>{
 await withBuilder(t,async runner=>{await edit(runner,'QA native exclusions');const before=copy(current(runner));for(const options of [{ctrlKey:false},{shiftKey:true},{altKey:true},{isComposing:true},{defaultPrevented:true},{key:'p'},{key:'F5',ctrlKey:false}]){const event=runner.key({...options,target:{tagName:'INPUT'}});assert.equal(event.preventCalls,0,JSON.stringify(options));}await runner.flush();assert.equal(runner.puts().length,0);assert.deepEqual(current(runner),before);assertPending(runner);});
});

test('native text undo, redo, copy and paste are not intercepted while builder undo still works outside a field',async t=>{
 await withBuilder(t,async runner=>{await edit(runner,'QA native field history');const before=copy(current(runner));for(const target of targets)for(const key of ['z','y','c','v']){const event=runner.key({key,target});assert.equal(event.preventCalls,0);}await runner.flush();assert.deepEqual(current(runner),before);const undo=runner.key({key:'z'});assert.equal(undo.defaultPrevented,true);await runner.flush();assert.equal(current(runner).names,runner.initialData.names);const redo=runner.key({key:'y'});assert.equal(redo.defaultPrevented,true);await runner.flush();assert.equal(current(runner).names,before.names);assert.equal(runner.puts().length,0);});
});

test('Save key repeat is consumed without starting work or queuing another write while a real Save is pending',async t=>{
 const wait=deferred();await withBuilder(t,async runner=>{await edit(runner,'QA key repeat');const repeated=runner.key({repeat:true,target:{tagName:'INPUT'}});assert.equal(repeated.defaultPrevented,true);await runner.flush();assert.equal(runner.puts().length,0);assert.equal(runner.key().defaultPrevented,true);await runner.flush();assert.equal(runner.puts().length,1);for(let repeat=0;repeat<3;repeat++)assert.equal(runner.key({repeat:true}).defaultPrevented,true);await runner.flush();assert.equal(runner.puts().length,1);wait.resolve(runner.stored());await runner.flush();assert.equal(runner.puts().length,1);assert.equal(runner.beforeUnload().prevented,false);},{reply:request=>request.method==='PUT'?wait.promise:undefined});
});

test('two retained Save clicks before React renders acquire only one manual-save operation',async t=>{
 const wait=deferred();await withBuilder(t,async runner=>{await edit(runner,'QA same-turn double click');const save=button(runner,'Guardar').props.onClick,first=save(),second=save();await runner.drain();assert.equal(runner.puts().length,1);await runner.flush();assert.equal(button(runner,'Guardando…').props.disabled,true);wait.resolve(runner.stored());await Promise.all([first,second]);await runner.flush();assert.equal(runner.puts().length,1);assert.equal(button(runner,'Guardar').props.disabled,false);assert.equal(runner.beforeUnload().prevented,false);},{reply:request=>request.method==='PUT'?wait.promise:undefined});
});

test('shortcut and retained click share their immediate guard in either order before a render',async t=>{
 for(const shortcutFirst of [true,false]){const wait=deferred();await withBuilder(t,async runner=>{await edit(runner,'QA mixed save '+shortcutFirst);const save=button(runner,'Guardar').props.onClick;let clickPromise;if(shortcutFirst){assert.equal(runner.key().defaultPrevented,true);clickPromise=save();}else{clickPromise=save();assert.equal(runner.key().defaultPrevented,true);}await runner.drain();assert.equal(runner.puts().length,1);wait.resolve(runner.stored());await clickPromise;await runner.flush();assert.equal(runner.puts().length,1);assert.equal(runner.beforeUnload().prevented,false);},{reply:request=>request.method==='PUT'?wait.promise:undefined});}
});

test('autosave timers and reconnect cannot queue a duplicate snapshot during a slow manual Save',async t=>{
 const wait=deferred();await withBuilder(t,async runner=>{await edit(runner,'QA slow manual write');const {pending}=await click(runner,'Guardar');assert.equal(runner.puts().length,1);await runner.advance(7500);runner.dispatch('online',{});await runner.flush();assert.equal(runner.puts().length,1);assert.equal(button(runner,'Guardando…').props.disabled,true);wait.resolve(runner.stored());await pending;await runner.flush();await runner.advance(7500);assert.equal(runner.puts().length,1);assert.equal(runner.beforeUnload().prevented,false);assert.match(text(runner.current()),/Guardado/);},{reply:request=>request.method==='PUT'?wait.promise:undefined});
});

test('a refused or disconnected manual Save keeps work pending and releases its guard for explicit retry',async t=>{
 for(const failure of ['http','network']){let failing=true;await withBuilder(t,async runner=>{await edit(runner,'QA retry '+failure);const event=runner.key();assert.equal(event.defaultPrevented,true);await runner.flush();assert.equal(runner.puts().length,1);assertPending(runner);assert.match(text(runner.current()),/Error al guardar/);assert.equal(button(runner,'Guardar').props.disabled,false);await runner.advance(7500);assert.equal(runner.puts().length,1);failing=false;assert.equal(runner.key({ctrlKey:false,metaKey:true,target:{tagName:'TEXTAREA'}}).defaultPrevented,true);await runner.flush();assert.equal(runner.puts().length,2);assert.equal(runner.puts()[1].body.names,'QA retry '+failure);assert.equal(runner.beforeUnload().prevented,false);assert.match(text(runner.current()),/Guardado/);},{reply:request=>{if(request.method==='PUT'&&failing){if(failure==='network')throw new TypeError('QA isolated network failure');return Response.json({error:'QA isolated refusal'},{status:409});}}});}
});

test('a late manual acknowledgement never clears newer edits and their autosave uses the next server revision',async t=>{
 const wait=deferred();let hold=true;await withBuilder(t,async runner=>{await edit(runner,'QA saved A');const {pending}=await click(runner,'Guardar');await edit(runner,'QA newer B');assert.equal(runner.key().defaultPrevented,true);await runner.advance(5000);assert.equal(runner.puts().length,1);wait.resolve(runner.stored());await pending;await runner.flush();assert.equal(current(runner).names,'QA newer B');assertPending(runner);assert.equal(runner.requests.some(request=>request.method==='POST'&&request.body?.version?.source==='save'),false);await runner.advance(2500);assert.equal(runner.puts().length,2);assert.equal(runner.puts()[1].body.names,'QA newer B');assert.equal(runner.puts()[1].body.expectedDraftRevision,1);assert.equal(runner.beforeUnload().prevented,false);assert.equal(current(runner).names,'QA newer B');},{reply:request=>request.method==='PUT'&&hold?(hold=false,wait.promise):undefined});
});

test('manual Save joins an existing autosave of the same unchanged snapshot instead of writing it twice',async t=>{
 const wait=deferred();let hold=true;await withBuilder(t,async runner=>{await edit(runner,'QA shared snapshot A');await runner.advance(2500);assert.equal(runner.puts().length,1);const {pending}=await click(runner,'Guardar');await runner.advance(7500);assert.equal(runner.puts().length,1);wait.resolve(runner.stored());await pending;await runner.flush();assert.equal(runner.puts().length,1);assert.equal(runner.beforeUnload().prevented,false);assert.equal(button(runner,'Guardar').props.disabled,false);},{reply:request=>request.method==='PUT'&&hold?(hold=false,wait.promise):undefined});
});

test('manual Save after a newer edit queues that distinct snapshot behind autosave and stays busy until its own acknowledgement',async t=>{
 const auto=deferred(),manual=deferred();await withBuilder(t,async runner=>{await edit(runner,'QA autosave A');await runner.advance(2500);await edit(runner,'QA manual B');const {pending}=await click(runner,'Guardar');assert.equal(runner.puts().length,1);auto.resolve(runner.stored());await runner.flush();assert.equal(runner.puts().length,2);assert.equal(runner.puts()[0].body.names,'QA autosave A');assert.equal(runner.puts()[1].body.names,'QA manual B');assert.equal(runner.puts()[1].body.expectedDraftRevision,1);assert.equal(button(runner,'Guardando…').props.disabled,true);assert.equal(runner.beforeUnload().prevented,true);manual.resolve(runner.stored());await pending;await runner.flush();assert.equal(runner.beforeUnload().prevented,false);assert.equal(current(runner).names,'QA manual B');assert.equal(runner.puts().length,2);},{reply:(request,{requests})=>request.method==='PUT'?(requests.filter(value=>value.method==='PUT').length===1?auto.promise:manual.promise):undefined});
});

test('undo and redo to the same object are a new editing sequence and must not join its older autosave',async t=>{
 const auto=deferred(),manual=deferred();await withBuilder(t,async runner=>{await edit(runner,'QA repeated snapshot');const snapshot=current(runner);await runner.advance(2500);historyButton(runner,'Deshacer (Ctrl+Z)').props.onClick();await runner.flush();historyButton(runner,'Rehacer (Ctrl+Shift+Z)').props.onClick();await runner.flush();assert.equal(current(runner),snapshot);const {pending}=await click(runner,'Guardar');auto.resolve(runner.stored());await runner.flush();assert.equal(runner.puts().length,2);assert.equal(runner.puts()[1].body.names,snapshot.names);assert.equal(runner.beforeUnload().prevented,true);manual.resolve(runner.stored());await pending;await runner.flush();assert.equal(runner.beforeUnload().prevented,false);},{reply:(request,{requests})=>request.method==='PUT'?(requests.filter(value=>value.method==='PUT').length===1?auto.promise:manual.promise):undefined});
});

test('an edit after queued manual B remains pending when both autosave A and queued B acknowledge',async t=>{
 const auto=deferred(),manual=deferred();await withBuilder(t,async runner=>{await edit(runner,'QA queue A');await runner.advance(2500);await edit(runner,'QA queue B');const {pending}=await click(runner,'Guardar');await edit(runner,'QA latest C');auto.resolve(runner.stored());await runner.flush();assert.equal(runner.puts().length,2);assert.equal(runner.puts()[1].body.names,'QA queue B');manual.resolve(runner.stored());await pending;await runner.flush();assert.equal(current(runner).names,'QA latest C');assertPending(runner);await runner.advance(2500);assert.equal(runner.puts().length,3);assert.equal(runner.puts()[2].body.names,'QA latest C');assert.equal(runner.puts()[2].body.expectedDraftRevision,2);assert.equal(runner.beforeUnload().prevented,false);},{reply:(request,{requests})=>{if(request.method==='PUT'){const count=requests.filter(value=>value.method==='PUT').length;return count===1?auto.promise:count===2?manual.promise:undefined;}}});
});

test('the publication dialog consumes the Save shortcut without saving its working draft or publication fields',async t=>{
 await withBuilder(t,async runner=>{await edit(runner,'QA before publication dialog');await click(runner,'Publicar');const before=copy(current(runner)),dialog=nodes(runner.current(),node=>node.props.role==='dialog')[0];assert.ok(dialog);const input=nodes(dialog,node=>node.type==='input'&&node.props.name==='publication-label')[0];assert.ok(input);input.props.onChange({target:{value:'QA unpublished label'}});const event=runner.key({target:{tagName:'INPUT'}});assert.equal(event.defaultPrevented,true);await runner.flush();assert.equal(runner.puts().length,0);assert.equal(runner.publications().length,0);assert.deepEqual(current(runner),before);assert.equal(nodes(runner.current(),node=>node.props.role==='dialog').length,1);});
});

test('publication, scheduling, rollback and pause exclude shortcuts and retained Save clicks until their public operation finishes',async t=>{
 for(const operation of ['publish','schedule','rollback','pause']){const wait=deferred();await withBuilder(t,async runner=>{await edit(runner,'QA pending '+operation);const oldSave=button(runner,'Guardar').props.onClick;let pending;if(operation==='publish'||operation==='schedule'){await click(runner,'Publicar');if(operation==='schedule')await click(runner,'Programar fecha');({pending}=await click(runner,operation==='schedule'?'Programar publicación':'Publicar esta versión'));}else{await click(runner,'4. Revisar');pending=operation==='rollback'?panel(runner,'VersionsPanel').props.onRollback(oldVersion(runner.initialData)):panel(runner,'VersionsPanel').props.onUnpublish();await runner.flush();}const count=runner.puts().length;assert.equal(runner.key({target:{tagName:'TEXTAREA'}}).defaultPrevented,true);oldSave();await runner.flush();await runner.advance(5000);assert.equal(runner.puts().length,count);assert.equal(button(runner,'Guardando…').props.disabled,true);wait.resolve(Response.json({success:true}));await pending;await runner.flush();assert.equal(button(runner,'Guardar').props.disabled,false);assert.equal(runner.publications().length,operation==='pause'?0:1);},{reply:request=>((operation==='publish'||operation==='schedule'||operation==='rollback')&&['publish','schedule'].includes(request.body?.action))||(operation==='pause'&&request.body?.version?.label==='Antes de despublicar')?wait.promise:undefined});}
});

test('fixture mode cannot perform a shortcut write and unmount removes every save listener',async t=>{
 await withBuilder(t,async runner=>{await edit(runner,'QA fixture keyboard');runner.key({target:{tagName:'INPUT'}});await runner.flush();assert.equal(runner.puts().length,0);assert.equal(runner.requests.length,0);},{fixtureMode:true});
 await withBuilder(t,async runner=>{await edit(runner,'QA listeners');const count=runner.listenerCount('keydown');assert.ok(count>0);await edit(runner,'QA listeners latest');assert.equal(runner.listenerCount('keydown'),count);runner.unmount();assert.equal(runner.listenerCount('keydown'),0);const event=runner.key();assert.equal(event.preventCalls,0);await runner.drain();assert.equal(runner.puts().length,0);});
});

test('Save commits real unblurred inline text before capturing its PUT and detaches only the edited binding',async t=>{
 for(const bound of [false,true])await withBuilder(t,async runner=>{
  const before=copy(current(runner)),bridge=inlineBridge(runner,'  QA inline new <texto> & literal  ');
  assert.equal(inlineBlock(current(runner)).props.text,'QA inline literal');
  assert.equal(bridge.rendered.props.dangerouslySetInnerHTML.__html,bound?runner.initialData.names:'QA inline literal');
  const event=runner.key({target:bridge.target});assert.equal(event.defaultPrevented,true);
  assert.equal(bridge.editable.blurCalls,1,'The real Editable blur handler must run synchronously');
  await runner.drain();assert.equal(runner.puts().length,1);
  const saved=inlineBlock({config:runner.puts()[0].body.builder_config});
  assert.equal(saved.props.text,'QA inline new <texto> & literal');
  assert.deepEqual(saved.bindings,{untouched:'couple.groom'});assert.deepEqual(saved.style,inlineBlock(before).style);
  assert.equal(saved.props.qaOriginal,'/qa-original-inline.svg');
  await runner.flush();assert.equal(inlineBlock(current(runner)).props.text,saved.props.text);assert.equal(current(runner).names,before.names);assert.equal(runner.beforeUnload().prevented,false);
  assert.deepEqual(current(runner).config.layout.blocks.filter(block=>block.id!=='qa-inline-save'),before.config.layout.blocks.filter(block=>block.id!=='qa-inline-save'));
 },{initial:inlineFixture(bound)});
});

test('inline B commits through real Editable while manual A is pending and autosaves after its older acknowledgement',async t=>{
 const wait=deferred();let hold=true;await withBuilder(t,async runner=>{
  await edit(runner,'QA inline manual A');const {pending}=await click(runner,'Guardar');assert.equal(runner.puts().length,1);
  const bridge=inlineBridge(runner,'QA inline B typed without blur');
  assert.equal(inlineBlock(current(runner)).props.text,'QA inline literal');
  assert.equal(runner.key({ctrlKey:false,metaKey:true,target:bridge.target}).defaultPrevented,true);
  assert.equal(bridge.editable.blurCalls,1,'Busy guards must not skip committing newer inline text');
  await runner.flush();assert.equal(inlineBlock(current(runner)).props.text,'QA inline B typed without blur');assert.equal(runner.puts().length,1);
  await runner.advance(5000);assert.equal(runner.puts().length,1);wait.resolve(runner.stored());await pending;await runner.flush();
  assertPending(runner);assert.equal(inlineBlock(current(runner)).props.text,'QA inline B typed without blur');
  assert.equal(runner.requests.some(request=>request.method==='POST'&&request.body?.version?.source==='save'),false,'The old ACK must not mark inline B as already saved');
  await runner.advance(2500);assert.equal(runner.puts().length,2);assert.equal(runner.puts()[1].body.expectedDraftRevision,1);
  const saved=inlineBlock({config:runner.puts()[1].body.builder_config});assert.equal(saved.props.text,'QA inline B typed without blur');assert.deepEqual(saved.bindings,{untouched:'couple.groom'});
  assert.equal(current(runner).names,'QA inline manual A');assert.equal(runner.beforeUnload().prevented,false);
 },{initial:inlineFixture(true),reply:request=>request.method==='PUT'&&hold?(hold=false,wait.promise):undefined});
});

test('history operations exclude manual/autosave, publication, preview and leaving until completion',async t=>{
 await withBuilder(t,async r=>{await edit(r,'QA history boundary');const oldSave=button(r,'Guardar').props.onClick,oldPublish=button(r,'Publicar').props.onClick;await click(r,'4. Revisar');const history=panel(r,'VersionsPanel').props;assert.equal(history.canMutate(),true);history.onMutationState('pending');await r.flush();await oldSave();oldPublish();r.key();await r.advance(5000);assert.equal(r.puts().length,0);assert.equal(history.canMutate(),false);assert.equal(r.beforeUnload().prevented,true);assert.equal(button(r,'Guardando…').props.disabled,true);history.onMutationState('done');await r.flush();assert.equal(button(r,'Guardar').props.disabled,false);assert.equal(panel(r,'VersionsPanel').props.canMutate(),true);});
});
test('uncertain history locks the constructor after its waiting state releases and permits a local backup',async t=>{
 await withBuilder(t,async r=>{await click(r,'4. Revisar');const history=panel(r,'VersionsPanel').props;history.onMutationState('pending');history.onMutationState('uncertain');history.onMutationState('done');await r.flush();assert.equal(button(r,'Guardar').props.disabled,true);assert.equal(button(r,'Publicar').props.disabled,true);assert.ok(button(r,'Descargar respaldo de mis cambios'));assert.equal(r.beforeUnload().prevented,true);assert.match(text(r.current()),/No pudimos confirmar el cambio del historial/);r.key();await r.advance(30000);assert.equal(r.puts().length,0);});
});
test('switching tools keeps the visited history component mounted under the same invitation key',async t=>{
 await withBuilder(t,async r=>{await click(r,'4. Revisar');const first=panel(r,'VersionsPanel');assert.ok(String(first.key).endsWith(r.initialData.id));await click(r,'1. Datos');const hidden=nodes(r.current(),n=>n.type==='div'&&n.props.hidden===true&&nodes(n,x=>x.type===panels.VersionsPanel).length>0)[0];assert.ok(hidden);assert.equal(panel(r,'VersionsPanel').key,first.key);await click(r,'4. Revisar');assert.equal(nodes(r.current(),n=>n.type==='div'&&n.props.hidden===true&&nodes(n,x=>x.type===panels.VersionsPanel).length>0).length,0);});
});

test('the partner editor passes its private library scope and hides team-only quality and contract controls',async t=>{
 const scope='partner:30000000-0000-4000-8000-000000000002';await withBuilder(t,async r=>{await click(r,'Más herramientas');assert.equal(nodes(r.current(),n=>n.type==='button'&&text(n).includes('Calidad')).length,0);const config=nodes(r.current(),n=>n.type==='button'&&n.props.title==='Accesos, vigencia y pantalla de entrada')[0];if(config){config.props.onClick();await r.flush();}else{const nav=nodes(r.current(),n=>n.type==='button'&&nodes(n,c=>c.type==='span'&&text(c)==='Config').length)[0];assert.ok(nav);nav.props.onClick();await r.flush();}assert.equal(panel(r,'ConfigPanel').props.contractAccess,'partner');await click(r,'3. Estilo');assert.equal(panel(r,'StylePanel').props.libraryScope,scope);},{libraryScope:scope});
});
