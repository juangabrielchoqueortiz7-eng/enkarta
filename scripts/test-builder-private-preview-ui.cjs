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
const source=process.argv.includes('--baseline')?require('node:child_process').execFileSync('git',['-c','core.fsmonitor=false','show','b6fe0257ba52a8f04d5c61ded14c84d83a135de8:src/components/admin/builder/InvitationBuilder.tsx'],{cwd:root,encoding:'utf8'}):fs.readFileSync(builderFile,'utf8');
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
  const request={url,method:init.method??'GET',body:init.body?JSON.parse(init.body):null};requests.push(request);
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

const preview=runner=>nodes(runner.current(),node=>['a','button'].includes(node.type)&&node.props['aria-label']==='Abrir vista privada del borrador')[0];
const dirtyHelp='Guarda los cambios y espera «Guardado» antes de abrir la vista privada.';
const pendingHelp='Espera a que termine el guardado antes de abrir la vista privada.';
function activate(runner,{control=preview(runner),kind='onClick',...options}={}){
 assert.ok(control,'The real private-preview control must exist');
 const event={defaultPrevented:false,preventCalls:0,button:kind==='onAuxClick'?1:0,ctrlKey:false,metaKey:false,shiftKey:false,altKey:false,currentTarget:{getAttribute:name=>name==='href'?control.props.href??null:null},preventDefault(){this.defaultPrevented=true;this.preventCalls++;},...options};
 control.props[kind]?.(event);
 if(!event.defaultPrevented&&control.type==='a'&&control.props.href)runner.nativeIntents.push({kind,href:control.props.href,target:control.props.target});
 return event;
}
const assertBlocked=runner=>{const control=preview(runner);assert.equal(control.type,'button');assert.equal(control.props.href,undefined);assert.notEqual(control.props.disabled,true,'The blocked control remains operable to explain the reason');assert.equal(String(control.props['aria-disabled']),'true');return control;};
const assertReady=runner=>{const control=preview(runner);assert.equal(control.type,'a');assert.equal(control.props.href,'/i/'+encodeURIComponent(current(runner).slug)+'?preview=1');assert.equal(control.props.target,'_blank');assert.match(control.props.rel,/noopener/);assert.match(control.props.rel,/noreferrer/);return control;};

test('a clean saved draft keeps native click, middle-click and context-menu link behavior without writes or window.open',async t=>{
 for(const slug of ['qa-builder-private-preview','qa-private-preview-2027'])await withBuilder(t,async runner=>{const before=copy(current(runner)),control=assertReady(runner);assert.match(text(control),/Vista privada/);for(const kind of ['onClick','onAuxClick','onContextMenu']){const event=activate(runner,{control,kind});assert.equal(event.preventCalls,0);assert.equal(runner.nativeIntents.at(-1).href,control.props.href);}await runner.flush();assert.deepEqual(current(runner),before);assert.equal(runner.puts().length,0);assert.equal(runner.publications().length,0);assert.equal(runner.alerts.length,0);},{initial:{...base(),slug}});
});

test('dirty drafts expose an operable button with no href and an accessible reason instead of opening stale saved content',async t=>{
 await withBuilder(t,async runner=>{await edit(runner,'QA unsaved preview');const control=assertBlocked(runner);for(const kind of ['onClick','onAuxClick','onContextMenu'])assert.equal(activate(runner,{control,kind}).defaultPrevented,true);await runner.flush();assert.ok(text(runner.current()).includes(dirtyHelp));const describedBy=preview(runner).props['aria-describedby'];assert.ok(describedBy,'The explanatory notice is associated with the control');assert.ok(nodes(runner.current(),node=>node.props.id===describedBy).length);assert.equal(button(runner,'Guardar').props.disabled,false);assert.equal(runner.puts().length,0);assert.equal(runner.nativeIntents.length,0);assertPending(runner);});
});

test('a ready anchor retained before same-turn edits is blocked by click, middle-click and context menu before any rerender',async t=>{
 for(const kind of ['onClick','onAuxClick','onContextMenu'])await withBuilder(t,async runner=>{const retained=preview(runner);panel(runner,'ContentPanel').props.onChange({names:'QA before paint '+kind});const event=activate(runner,{control:retained,kind});assert.equal(event.defaultPrevented,true);assert.equal(runner.nativeIntents.length,0);await runner.flush();assertBlocked(runner);assert.ok(text(runner.current()).includes(dirtyHelp));assert.equal(current(runner).names,'QA before paint '+kind);assert.equal(runner.puts().length,0);});
});

test('Ctrl and Command clicks respect the same dirty guard while a clean anchor preserves its native new-tab behavior',async t=>{
 for(const modifier of ['ctrlKey','metaKey'])await withBuilder(t,async runner=>{const clean=preview(runner);assert.equal(activate(runner,{control:clean,[modifier]:true}).preventCalls,0);panel(runner,'ContentPanel').props.onChange({names:'QA modified '+modifier});assert.equal(activate(runner,{control:clean,[modifier]:true}).defaultPrevented,true);await runner.flush();assert.equal(runner.nativeIntents.length,1);assertBlocked(runner);assert.equal(runner.puts().length,0);});
});

test('real unblurred Editable commits before the preview check, detaches only its text binding and preserves original style and resources',async t=>{
 for(const kind of ['onClick','onAuxClick','onContextMenu'])await withBuilder(t,async runner=>{const before=copy(current(runner)),retained=preview(runner),bridge=inlineBridge(runner,'  QA preview inline <new> & text  ');document.activeElement=bridge.editable;assert.equal(bridge.rendered.props.dangerouslySetInnerHTML.__html,runner.initialData.names);const event=activate(runner,{control:retained,kind});assert.equal(event.defaultPrevented,true);assert.equal(bridge.editable.blurCalls,1);await runner.flush();const block=inlineBlock(current(runner));assert.equal(block.props.text,'QA preview inline <new> & text');assert.deepEqual(block.bindings,{untouched:'couple.groom'});assert.deepEqual(block.style,inlineBlock(before).style);assert.equal(block.props.qaOriginal,'/qa-original-inline.svg');assert.deepEqual(current(runner).config.layout.blocks.filter(block=>block.id!=='qa-inline-save'),before.config.layout.blocks.filter(block=>block.id!=='qa-inline-save'));assertBlocked(runner);assertPending(runner);assert.equal(runner.puts().length,0);assert.equal(runner.nativeIntents.length,0);},{initial:inlineFixture(true)});
});

test('blurring unchanged real inline text does not invent a draft edit or suppress its native ready link',async t=>{
 await withBuilder(t,async runner=>{const before=copy(current(runner)),bridge=inlineBridge(runner,runner.initialData.names);document.activeElement=bridge.editable;const event=activate(runner);assert.equal(event.preventCalls,0);assert.equal(bridge.editable.blurCalls,1);await runner.flush();assert.deepEqual(current(runner),before);assertReady(runner);assert.equal(runner.puts().length,0);assert.equal(runner.beforeUnload().prevented,false);assert.equal(runner.nativeIntents.length,1);},{initial:inlineFixture(true)});
});

test('a manual Save started from clean state blocks the retained anchor immediately and restores it only after a stable acknowledgement',async t=>{
 const wait=deferred();await withBuilder(t,async runner=>{const retained=preview(runner),pending=button(runner,'Guardar').props.onClick();assert.equal(activate(runner,{control:retained}).defaultPrevented,true);await runner.flush();assert.equal(runner.puts().length,1);assert.equal(assertBlocked(runner).props['aria-busy'],true);assert.ok(text(runner.current()).includes(pendingHelp));assert.equal(runner.nativeIntents.length,0);wait.resolve(runner.stored());await pending;await runner.flush();assertReady(runner);assert.equal(activate(runner).preventCalls,0);assert.equal(runner.puts().length,1);assert.equal(runner.beforeUnload().prevented,false);},{reply:request=>request.method==='PUT'?wait.promise:undefined});
});

test('a pending autosave explains its busy state without starting another write or opening the older stored version',async t=>{
 const wait=deferred();await withBuilder(t,async runner=>{await edit(runner,'QA waiting autosave');await runner.advance(2500);assert.equal(runner.puts().length,1);assert.equal(activate(runner).defaultPrevented,true);await runner.flush();assert.equal(assertBlocked(runner).props['aria-busy'],true);assert.ok(text(runner.current()).includes(pendingHelp));assert.equal(runner.puts().length,1);assert.equal(runner.nativeIntents.length,0);wait.resolve(runner.stored());await runner.flush();assertReady(runner);assert.equal(activate(runner).preventCalls,0);assert.equal(runner.puts().length,1);},{reply:request=>request.method==='PUT'?wait.promise:undefined});
});

test('a refused save blocks preview even for previously clean content and only an explicit successful retry restores readiness',async t=>{
 for(const editFirst of [false,true]){let rejected=true;await withBuilder(t,async runner=>{if(editFirst)await edit(runner,'QA refusal draft');const {pending}=await click(runner,'Guardar');await pending;await runner.flush();assert.equal(runner.puts().length,1);assert.match(text(runner.current()),/Error al guardar/);assert.equal(activate(runner).defaultPrevented,true);await runner.flush();assertBlocked(runner);assert.equal(runner.nativeIntents.length,0);await runner.advance(7500);assert.equal(runner.puts().length,1);rejected=false;const retry=await click(runner,'Guardar');await retry.pending;await runner.flush();assertReady(runner);assert.equal(activate(runner).preventCalls,0);assert.equal(runner.puts().length,2);},{reply:request=>request.method==='PUT'&&rejected?Response.json({error:'QA save refused'},{status:409}):undefined});}
});

test('offline status is read before render and preview clicks never perform network work or automatically save the draft',async t=>{
 await withBuilder(t,async runner=>{const retained=preview(runner);navigator.onLine=false;assert.equal(activate(runner,{control:retained}).defaultPrevented,true);await runner.flush();assertBlocked(runner);assert.match(text(runner.current()),/conexión|conectar|conectarte/i);assert.equal(runner.puts().length,0);assert.equal(runner.nativeIntents.length,0);navigator.onLine=true;runner.dispatch('online',{});await runner.rerender();assertReady(runner);assert.equal(activate(runner).preventCalls,0);assert.equal(runner.puts().length,0);});
});

test('an older acknowledgement never enables preview for edits made during manual Save',async t=>{
 const wait=deferred();let hold=true;await withBuilder(t,async runner=>{await edit(runner,'QA preview saved A');const {pending}=await click(runner,'Guardar');await edit(runner,'QA preview unsaved B');wait.resolve(runner.stored());await pending;await runner.flush();assert.equal(current(runner).names,'QA preview unsaved B');assert.equal(activate(runner).defaultPrevented,true);await runner.flush();assertBlocked(runner);assertPending(runner);assert.equal(runner.nativeIntents.length,0);assert.equal(runner.puts().length,1);const retry=await click(runner,'Guardar');await retry.pending;await runner.flush();assertReady(runner);assert.equal(activate(runner).preventCalls,0);assert.equal(runner.puts()[1].body.names,'QA preview unsaved B');assert.equal(runner.puts()[1].body.expectedDraftRevision,1);},{reply:request=>request.method==='PUT'&&hold?(hold=false,wait.promise):undefined});
});

test('queued autosave A and manual B cannot enable preview before the latest edit C is acknowledged',async t=>{
 const auto=deferred(),manual=deferred();await withBuilder(t,async runner=>{await edit(runner,'QA queued preview A');await runner.advance(2500);await edit(runner,'QA queued preview B');const {pending}=await click(runner,'Guardar');await edit(runner,'QA current preview C');auto.resolve(runner.stored());await runner.flush();assert.equal(runner.puts().length,2);assert.equal(activate(runner).defaultPrevented,true);manual.resolve(runner.stored());await pending;await runner.flush();assert.equal(current(runner).names,'QA current preview C');assert.equal(activate(runner).defaultPrevented,true);await runner.flush();assertBlocked(runner);assert.equal(runner.puts().length,2);const save=await click(runner,'Guardar');await save.pending;await runner.flush();assertReady(runner);assert.equal(activate(runner).preventCalls,0);assert.equal(runner.puts().length,3);assert.equal(runner.puts()[2].body.names,'QA current preview C');assert.equal(runner.puts()[2].body.expectedDraftRevision,2);},{reply:(request,{requests})=>{if(request.method==='PUT'){const count=requests.filter(item=>item.method==='PUT').length;return count===1?auto.promise:count===2?manual.promise:undefined;}}});
});

test('a retained anchor with an old slug cannot open after the new slug saves before React paints its new href',async t=>{
 await withBuilder(t,async runner=>{const retained=preview(runner),oldSlug=current(runner).slug;panel(runner,'ContentPanel').props.onChange({slug:'qa-preview-new-slug'});const pending=button(runner,'Guardar').props.onClick();await pending;await runner.drain();assert.equal(retained.props.href,'/i/'+oldSlug+'?preview=1');assert.equal(activate(runner,{control:retained}).defaultPrevented,true);assert.equal(runner.nativeIntents.length,0);await runner.flush();const ready=assertReady(runner);assert.equal(ready.props.href,'/i/qa-preview-new-slug?preview=1');assert.equal(activate(runner).preventCalls,0);assert.equal(runner.puts().length,1);});
});

test('fixture mode and source-context mismatch block fresh and retained preview controls without server writes',async t=>{
 await withBuilder(t,async runner=>{assert.equal(activate(runner).defaultPrevented,true);await runner.flush();assertBlocked(runner);assert.equal(runner.requests.length,0);assert.equal(runner.nativeIntents.length,0);},{fixtureMode:true});
 for(const context of ['fixture','source'])await withBuilder(t,async runner=>{const retained=preview(runner);await runner.setProps(context==='fixture'?{fixtureMode:true}:{initialData:{...runner.initialData,id:'30000000-0000-4000-8000-000000000006'}});assert.equal(activate(runner,{control:retained}).defaultPrevented,true);await runner.flush();assertBlocked(runner);assert.equal(runner.nativeIntents.length,0);assert.equal(runner.puts().length,0);});
});

test('an open publication dialog blocks preview without modifying or saving its clean working content',async t=>{
 await withBuilder(t,async runner=>{const retained=preview(runner),before=copy(current(runner));await click(runner,'Publicar');assert.equal(nodes(runner.current(),node=>node.props.role==='dialog').length,1);assert.equal(activate(runner,{control:retained}).defaultPrevented,true);await runner.flush();assertBlocked(runner);assert.deepEqual(current(runner),before);assert.equal(runner.puts().length,0);assert.equal(runner.publications().length,0);assert.equal(runner.nativeIntents.length,0);});
});

test('public operations acquire their preview guard before React renders and release it after stable draft synchronization',async t=>{
 const wait=deferred();await withBuilder(t,async runner=>{const retained=preview(runner);await click(runner,'4. Revisar');const pending=panel(runner,'VersionsPanel').props.onRollback(oldVersion(runner.initialData));assert.equal(activate(runner,{control:retained}).defaultPrevented,true);await runner.flush();assertBlocked(runner);assert.equal(runner.publications().length,1);assert.equal(runner.puts().length,0);assert.equal(runner.nativeIntents.length,0);wait.resolve(Response.json({success:true}));await pending;await runner.flush();assertReady(runner);assert.equal(activate(runner).preventCalls,0);assert.equal(runner.puts().length,1);assert.equal(runner.beforeUnload().prevented,false);},{reply:request=>request.body?.action==='publish'?wait.promise:undefined});
});

test('the first render has the same native-link contract online and offline before connection effects run',async t=>{
 const initialControls=[];
 for(const initialOnline of [true,false])await withBuilder(t,async runner=>{
  const first=nodes(runner.renders[0],node=>['a','button'].includes(node.type)&&node.props['aria-label']==='Abrir vista privada del borrador')[0];assert.ok(first);assert.equal(first.type,'a');
  initialControls.push({type:first.type,href:first.props.href,target:first.props.target,rel:first.props.rel,label:first.props['aria-label'],text:text(first)});
  if(initialOnline)assertReady(runner);else{assertBlocked(runner);assert.equal(activate(runner).defaultPrevented,true);await runner.flush();assert.match(text(runner.current()),/conectarte|conexión/i);}
  assert.equal(runner.puts().length,0);
 },{initialOnline});
 assert.deepEqual(initialControls[0],initialControls[1],'Connection effects may update readiness after the stable first render');
});
