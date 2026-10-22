// Real InvitationBuilder/deletion hook and stateless barrier; panels are inert boundaries.
// Real Editable is bridged through simulated closest/blur. Lifecycle and HTTP remain isolated in RAM.
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
const transpile=(source,file)=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText;
require.extensions['.ts']=require.extensions['.tsx']=(mod,file)=>mod._compile(transpile(fs.readFileSync(file,'utf8'),file),file);
let navigate=()=>{};
const React=require('react'),panels={},stub=(request,exports)=>require.cache[require.resolve(request)]={exports};
stub('next/navigation',{useRouter:()=>({push(url){navigate(url);},replace(){},refresh(){}})});
for(const name of ['LivePreview','ContentPanel','StylePanel','MediaPanel','ConfigPanel','DecorPanel','MotionPanel','BlockEditorPanel','ElementsPanel','GuestsPanel','ExportPanel','VersionsPanel','QualityControlPanel']){
 const Component=panels[name]=()=>null;
 stub('../src/components/admin/builder/'+(name==='LivePreview'?'':'panels/')+name+'.tsx',{__esModule:true,default:Component});
}
stub('../src/components/invitations/blocks/registry.tsx',{cloneBlock:block=>({...block,id:'qa-desktop-clone'})});
const builderFile=path.join(root,'src/components/admin/builder/InvitationBuilder.tsx');
const source=process.argv.includes('--baseline')?require('node:child_process').execFileSync('git',['-c','core.fsmonitor=false','show','dab8149e70e99157c72deac3715b9676d435a6bb:src/components/admin/builder/InvitationBuilder.tsx'],{cwd:root,encoding:'utf8'}):fs.readFileSync(builderFile,'utf8');
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
const base=()=>({...marfilVivoDemo(),id:'30000000-0000-4000-8000-000000000007',slug:'qa-builder-delete',names:'QA delete original',draft_revision:0,validity_mode:'automatic',validity_extra_days:0,validity_revision:0});
const oldVersion=data=>({id:'qa-desktop-historical',invitationId:data.id,label:'QA desktop historical',source:'publish',createdAt:1,publicationState:'published',data:{...copy(data),names:'QA desktop previous publication'}});

async function withBuilder(t,scenario,{initial=base(),reply,fixtureMode=false,confirmAction=()=>true,navigateAction=()=>{},builderPath='/socios/constructor',backHref='/socios/panel'}={}){
 if(!initialized.has(t)){t.mock.timers.enable({apis:['setTimeout']});initialized.add(t);}
 assert.deepEqual(validateInvitationBuilder(initial).errors,[],'The fictional preset copy must pass real validation');
 const hookNames=['useState','useRef','useEffect','useMemo','useCallback'],hooks=Object.fromEntries(hookNames.map(name=>[name,React[name]]));
 const globalNames=['window','document','fetch','navigator','alert','confirm'],globals=Object.fromEntries(globalNames.map(name=>[name,Object.getOwnPropertyDescriptor(global,name)]));
 const slots=[],requests=[],alerts=[],confirms=[],navigation=[],local=new Map(),events=new Map(),unexpected=[];let renderInitial=initial,lateWrites=0,draftSource={current:initial};
 let cursor=0,dirty=true,tree,effects=[],unmounted=false,revision=initial.draft_revision??0,activeSlots=slots,barrierSlots=null,barrierSeen=false;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 React.useState=initialValue=>{const index=cursor++;if(!(index in slots)){const slot=activeSlots[index]={value:typeof initialValue==='function'?initialValue():initialValue};slot.set=value=>{if(unmounted){lateWrites++;return;}const next=typeof value==='function'?value(slot.value):value;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[activeSlots[index].value,activeSlots[index].set];};
 React.useRef=value=>{const index=cursor++;return activeSlots[index]??(activeSlots[index]={current:value});};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!activeSlots[index]||!same(activeSlots[index].deps,deps))activeSlots[index]={value:compute(),deps};return activeSlots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const index=cursor++,previous=activeSlots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup,effect};activeSlots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 const install=(name,value)=>Object.defineProperty(global,name,{configurable:true,writable:true,value});
 install('window',{innerWidth:1440,localStorage:{getItem:key=>local.get(key)??null,setItem:(key,value)=>local.set(key,value),removeItem:key=>local.delete(key)},addEventListener:(name,callback)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(callback);},removeEventListener:(name,callback)=>events.get(name)?.delete(callback),setTimeout,clearTimeout,confirm:message=>{confirms.push(message);return confirmAction(message,runner);}});
 install('document',{getElementById:()=>null});install('navigator',{onLine:true});install('alert',value=>alerts.push(value));install('confirm',message=>{confirms.push(message);return confirmAction(message,runner);});navigate=url=>{navigation.push(url);return navigateAction(url,runner);};
 const created=(request,patch={})=>Response.json({id:'31000000-0000-4000-8000-000000000001',slug:request.body.slug,status:'draft',...patch},{status:201});
 const stored=()=>Response.json({draft_revision:++revision,expires_at:initial.expires_at,validity_mode:initial.validity_mode,validity_extra_days:initial.validity_extra_days,validity_revision:initial.validity_revision});
 install('fetch',async(url,init={})=>{
  const request={url,method:init.method??'GET',body:init.body?JSON.parse(init.body):null,signal:init.signal,cache:init.cache};requests.push(request);
  const allowed=(request.method==='GET'&&String(url).startsWith('/api/admin/builder-state?'))||(request.method==='POST'&&url==='/api/admin/builder-state')||(['POST','PUT'].includes(request.method)&&url==='/api/admin/invitations')||(request.method==='DELETE'&&String(url).startsWith('/api/admin/invitations?id='));
  if(!allowed){unexpected.push(request);throw Error('Unexpected deletion RAM request');}
  if(reply){const response=reply(request,{requests,stored,created});if(response!==undefined)return response;}
  return request.method==='GET'?Response.json({versions:[],notes:[]}):request.method==='PUT'?stored():url==='/api/admin/invitations'&&request.method==='POST'?created(request):Response.json({success:true});
 });
 const expandBarrier=value=>{if(Array.isArray(value))return value.map(expandBarrier);if(!React.isValidElement(value))return value;if(typeof value.type==='function'&&value.type.name==='BuilderDeleteState'){barrierSeen=true;barrierSlots??=[];const previous=activeSlots,position=cursor;activeSlots=barrierSlots;cursor=0;let rendered;try{rendered=value.type(value.props);}finally{activeSlots=previous;cursor=position;}return expandBarrier(rendered);}return React.cloneElement(value,undefined,React.Children.map(value.props.children,expandBarrier));};
 const drain=async()=>{for(let round=0;round<4;round++)await new Promise(done=>setImmediate(done));};
 const flush=async()=>{for(let round=0;round<45;round++){if(dirty&&!unmounted){dirty=false;cursor=0;activeSlots=slots;barrierSeen=false;effects=[];tree=expandBarrier(Builder({initialData:renderInitial,backHref,builderPath,fixtureMode}));const sourceNode=nodes(tree,node=>!!node.props.draftSource)[0];if(sourceNode)draftSource=sourceNode.props.draftSource;if(!barrierSeen&&barrierSlots){for(const slot of barrierSlots)slot?.cleanup?.();barrierSlots=null;}for(const effect of effects)effect();}await new Promise(done=>setImmediate(done));if(!dirty||unmounted)return tree;}throw Error('Delete hooks did not settle');};
 const dispatch=(name,event)=>{for(const callback of [...(events.get(name)??[])])callback(event);};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of [...slots,...(barrierSlots??[])])slot?.cleanup?.();};
 const runner={flush,drain,current:()=>tree,initialData:initial,requests,alerts,confirms,navigation,local,stored,created,unmount,dispatch,readDraft:()=>draftSource.current,deletes:()=>requests.filter(request=>request.method==='DELETE'),lateWrites:()=>lateWrites,duplicate:()=>nodes(tree,node=>node.type==='button'&&node.props['aria-label']==='Duplicar invitación')[0],copies:()=>requests.filter(request=>request.method==='POST'&&request.url==='/api/admin/invitations'),replayEffects:()=>{const slotsWithEffect=[...slots,...(barrierSlots??[])].filter(slot=>slot?.effect);for(const slot of slotsWithEffect)slot.cleanup?.();for(const slot of slotsWithEffect)slot.cleanup=slot.effect();},setInitial:async value=>{renderInitial=value;dirty=true;await flush();},listenerCount:name=>events.get(name)?.size??0,puts:()=>requests.filter(request=>request.method==='PUT'),publications:()=>requests.filter(request=>request.method==='POST'&&['publish','schedule'].includes(request.body?.action)),advance:async milliseconds=>{t.mock.timers.tick(milliseconds);await flush();},beforeUnload:()=>{const event={prevented:false,preventDefault(){this.prevented=true;},returnValue:undefined};dispatch('beforeunload',event);return event;},key:(options={})=>{const event={key:'s',ctrlKey:true,metaKey:false,altKey:false,shiftKey:false,isComposing:false,repeat:false,defaultPrevented:false,target:{tagName:'DIV',isContentEditable:false},preventCalls:0,preventDefault(){this.defaultPrevented=true;this.preventCalls++;},...options};dispatch('keydown',event);return event;}};
 try{await flush();return await scenario(runner);}finally{unmount();await drain();for(const name of hookNames)React[name]=hooks[name];for(const name of globalNames)if(globals[name])Object.defineProperty(global,name,globals[name]);else delete global[name];assert.deepEqual(unexpected,[],'The transport never delegates to the real network');}
}
const click=async(runner,label)=>{const action=button(runner,label);assert.ok(action,'Expected '+label);assert.equal(!!action.props.disabled,false);const pending=action.props.onClick();await runner.flush();return{pending};};
const edit=async(runner,names)=>{if(!panel(runner,'ContentPanel'))await click(runner,'1. Datos');panel(runner,'ContentPanel').props.onChange({names});await runner.flush();};
const assertPending=runner=>{assert.match(text(runner.current()),/Cambios sin guardar|Error al guardar/);assert.equal(runner.beforeUnload().prevented,true);assert.equal(historyButton(runner,'Deshacer (Ctrl+Z)').props.disabled,false);};

const isDelete=request=>request.method==='DELETE';
const startDelete=async runner=>{await click(runner,'Config');const action=panel(runner,'ConfigPanel').props.onDelete;assert.equal(typeof action,'function','The actual parent must wire the danger action');return action;};
const frozen=runner=>{for(const name of ['ContentPanel','ConfigPanel','LivePreview','VersionsPanel'])assert.equal(panel(runner,name),undefined,'The editor is unmounted behind the deletion barrier');assert.equal(nodes(runner.current(),node=>node.props.role==='dialog').length,0);};
const assertUncertain=runner=>{frozen(runner);assert.match(text(runner.current()),/Eliminación sin confirmar/);};
const returnLink=runner=>nodes(runner.current(),node=>node.type==='a'&&text(node).trim()==='Volver al panel')[0];
const previewControl=runner=>nodes(runner.current(),node=>['a','button'].includes(node.type)&&node.props['aria-label']==='Abrir vista privada del borrador')[0];
const inlineFixture=()=>{const data=base();return{...data,config:{...data.config,layout:{...data.config.layout,blocks:[...data.config.layout.blocks,{id:'qa-inline-delete',type:'text',enabled:true,props:{text:'QA original inline',qaOriginal:'/qa-original-delete.svg'},bindings:{text:'couple.full',untouched:'couple.groom'},style:{padTop:41,italic:true}}]}}};};
const inlineBlock=data=>data.config.layout.blocks.find(block=>block.id==='qa-inline-delete');
function inlineBridge(runner,newText){
 const props=panel(runner,'LivePreview').props,block=inlineBlock(props.invitation),original=React.useContext;
 const values=new Map([[BlockEditProvider._context,{editing:true,onEdit:(key,value)=>props.onEditBlockProp(block.id,key,value)}],[BlockDesignProvider._context,{}]]);let rendered;
 React.useContext=context=>{assert.ok(values.has(context));return values.get(context);};
 try{rendered=Editable({k:'text',value:String(resolveBlockEditorProps(block,props.invitation).text)});}finally{React.useContext=original;}
 assert.equal(rendered.props.contentEditable,true);
 const editable={tagName:'SPAN',isContentEditable:true,textContent:newText,blurCalls:0,closest:selector=>selector==='[data-edit-key][contenteditable="true"]'?editable:null,blur(){this.blurCalls++;rendered.props.onBlur({currentTarget:this});}};
 return{rendered,editable};
}

test('canceling deletion preserves the dirty original without writes or navigation and permits a later explicit attempt',async t=>{
 let consent=false;await withBuilder(t,async runner=>{await edit(runner,'QA unsaved retained');const action=await startDelete(runner),before=copy(runner.readDraft());await action();await runner.flush();assert.equal(runner.deletes().length,0);assert.equal(runner.puts().length,0);assert.equal(runner.confirms.length,1);assert.deepEqual(runner.readDraft(),before);assertPending(runner);assert.deepEqual(runner.navigation,[]);consent=true;await action();await runner.flush();assert.equal(runner.deletes().length,1);assert.deepEqual(runner.navigation,['/socios/panel']);},{confirmAction:()=>consent});
});

test('confirmation reentry and two calls before React paints acquire one DELETE lock before the first confirm',async t=>{
 const wait=deferred();let reentered=false;await withBuilder(t,async runner=>{const action=await startDelete(runner),first=action(),second=action();await runner.drain();assert.equal(runner.deletes().length,1);assert.equal(runner.confirms.length,1);assert.match(runner.confirms[0],/Los cambios sin guardar y las subidas pendientes (?:no se conservarán|se descartarán si se confirma la eliminación)\./);await runner.flush();frozen(runner);assert.match(text(runner.current()),/Eliminando invitación…/);assert.equal(runner.deletes()[0].url,'/api/admin/invitations?id='+runner.initialData.id);assert.equal(runner.deletes()[0].body,null);assert.equal(runner.deletes()[0].cache,'no-store');wait.resolve(Response.json({success:true}));await Promise.all([first,second]);await runner.flush();assert.equal(runner.deletes().length,1);assert.equal(runner.navigation.length,1);},{confirmAction:(_message,runner)=>{if(!reentered){reentered=true;panel(runner,'ConfigPanel').props.onDelete();}return true;},reply:request=>isDelete(request)?wait.promise:undefined});
});

test('verified deletion waits for a complete success acknowledgement then returns to the caller panel',async t=>{
 for(const backHref of ['/admin','/socios/panel']){const body=deferred();await withBuilder(t,async runner=>{const action=await startDelete(runner),pending=action();await runner.flush();frozen(runner);assert.equal(runner.deletes().length,1);assert.deepEqual(runner.navigation,[]);body.resolve({success:true});await pending;await runner.flush();assert.deepEqual(runner.navigation,[backHref]);assert.equal(runner.beforeUnload().prevented,false);assert.match(text(runner.current()),/Invitación eliminada/);},{backHref,reply:request=>isDelete(request)?{ok:true,status:200,json:()=>body.promise}:undefined});}
});

test('received 4xx responses restore the same original and permit only an explicit new deletion attempt',async t=>{
 for(const kind of ['valid-json','invalid-json']){let reject=true;await withBuilder(t,async runner=>{await edit(runner,'QA rejected deletion retains original');const action=await startDelete(runner),before=copy(runner.readDraft());await action();await runner.flush();assert.ok(panel(runner,'ConfigPanel'));assert.deepEqual(runner.readDraft(),before);assert.equal(runner.beforeUnload().prevented,true);assert.equal(runner.deletes().length,1);assert.deepEqual(runner.navigation,[]);reject=false;await action();await runner.flush();assert.equal(runner.deletes().length,2);assert.equal(runner.confirms.length,2);assert.equal(runner.navigation.length,1);assert.equal(runner.puts().length,0);},{reply:request=>isDelete(request)&&reject?kind==='valid-json'?Response.json({error:'QA deletion refused'},{status:409}):{ok:false,status:403,json:async()=>{throw Error('QA unreadable refusal');}}:undefined});}
});

test('a received 4xx with a stalled body is still a definitive refusal when the complete wait expires',async t=>{
 const body=deferred();let reject=true;await withBuilder(t,async runner=>{const action=await startDelete(runner),pending=action();await runner.flush();await runner.advance(25000);assert.equal(runner.deletes()[0].signal?.aborted,true,'The full body wait must be bounded');await pending;await runner.flush();assert.ok(panel(runner,'ConfigPanel'));assert.equal(runner.navigation.length,0);reject=false;await action();await runner.flush();assert.equal(runner.deletes().length,2);assert.equal(runner.navigation.length,1);},{reply:request=>isDelete(request)&&reject?{ok:false,status:422,json:()=>body.promise}:undefined});
});

test('network failures and 5xx results keep the original locked without claiming rollback or automatically retrying',async t=>{
 for(const result of ['network','server'])await withBuilder(t,async runner=>{await edit(runner,'QA uncertain original');const action=await startDelete(runner),before=copy(runner.readDraft());await action();await runner.flush();assertUncertain(runner);assert.deepEqual(runner.readDraft(),before);await action();await runner.advance(75000);runner.dispatch('online',{});await runner.flush();assertUncertain(runner);assert.equal(runner.deletes().length,1);assert.equal(runner.confirms.length,1);assert.equal(runner.puts().length,0);assert.deepEqual(runner.navigation,[]);},{reply:request=>{if(isDelete(request)){if(result==='network')throw TypeError('QA isolated deletion connection failure');return Response.json({error:'QA server uncertainty'},{status:503});}}});
});

test('malformed or unverified 2xx bodies never count as confirmed deletion or enable another destructive attempt',async t=>{
 for(const result of ['invalid-json','false','missing','array','null'])await withBuilder(t,async runner=>{const action=await startDelete(runner);await action();await runner.flush();assertUncertain(runner);await action();await runner.flush();assert.equal(runner.deletes().length,1);assert.equal(runner.confirms.length,1);assert.deepEqual(runner.navigation,[]);},{reply:request=>{if(!isDelete(request))return;if(result==='invalid-json')return{ok:true,status:200,json:async()=>{throw Error('QA incomplete deletion body');}};return Response.json(result==='false'?{success:false}:result==='missing'?{}:result==='array'?[{success:true}]:null);}});
});

test('25-second header and body deadlines retain uncertainty even when transport ignores abort and responds later',async t=>{
 for(const phase of ['headers','body']){const wait=deferred();let jsonReads=0;await withBuilder(t,async runner=>{const action=await startDelete(runner),pending=action();await runner.flush();await runner.advance(25000);assertUncertain(runner);await pending;assert.equal(runner.deletes()[0].signal.aborted,true);wait.resolve(phase==='headers'?{ok:true,status:200,json:async()=>{jsonReads++;return{success:true};}}:{success:true});await runner.flush();await action();await runner.flush();assertUncertain(runner);assert.equal(runner.deletes().length,1);assert.equal(jsonReads,phase==='headers'?0:1);assert.deepEqual(runner.navigation,[]);},{reply:request=>!isDelete(request)?undefined:phase==='headers'?wait.promise:{ok:true,status:200,json:()=>{jsonReads++;return wait.promise;}}});}
});

test('pending, uncertain and confirmed barriers reject retained editing, undo, save, publication, duplicate and preview callbacks',async t=>{
 for(const phase of ['pending','uncertain','deleted']){const wait=deferred();await withBuilder(t,async runner=>{
  await edit(runner,'QA frozen original');const content=panel(runner,'ContentPanel').props.onChange,save=button(runner,'Guardar').props.onClick,duplicateAction=runner.duplicate().props.onClick,openPublish=button(runner,'Publicar').props.onClick,undo=historyButton(runner,'Deshacer (Ctrl+Z)').props.onClick,redo=historyButton(runner,'Rehacer (Ctrl+Shift+Z)').props.onClick,preview=previewControl(runner);
  await click(runner,'4. Revisar');const versions=panel(runner,'VersionsPanel').props;const action=await startDelete(runner),pending=action();await runner.flush();if(phase!=='pending')await pending;await runner.flush();frozen(runner);const before=copy(runner.readDraft()),requestCount=runner.requests.length;
  content({names:'QA forbidden content'});undo();redo();versions.onRestore({...before,names:'QA forbidden restore'});versions.onRollback(oldVersion(runner.initialData));versions.onUnpublish();save();duplicateAction();openPublish();const event={defaultPrevented:false,currentTarget:{getAttribute:()=>preview.props.href??null},preventDefault(){this.defaultPrevented=true;}};preview.props.onClick?.(event);runner.key();runner.dispatch('online',{});await runner.advance(10000);
  assert.equal(event.defaultPrevented,true);frozen(runner);assert.deepEqual(runner.readDraft(),before);assert.equal(runner.requests.length,requestCount);assert.equal(runner.confirms.length,1);assert.equal(runner.puts().length,0);assert.equal(runner.copies().length,0);assert.equal(runner.publications().length,0);
  if(phase==='pending'){wait.resolve(Response.json({success:true}));await pending;await runner.flush();}
 },{navigateAction:()=>{if(phase==='deleted')throw Error('QA keep confirmed state mounted');},reply:request=>isDelete(request)?phase==='pending'?wait.promise:phase==='uncertain'?Response.json({error:'QA unknown'},{status:503}):undefined:undefined});}
});

test('a refused deletion resumes the original autosave instead of losing edits or saving while the barrier is active',async t=>{
 const wait=deferred();await withBuilder(t,async runner=>{await edit(runner,'QA retained after rejection');const action=await startDelete(runner),before=copy(runner.readDraft()),pending=action();await runner.flush();await runner.advance(10000);assert.equal(runner.puts().length,0);wait.resolve(Response.json({error:'QA refused deletion'},{status:409}));await pending;await runner.flush();assert.deepEqual(runner.readDraft(),before);assert.ok(panel(runner,'ConfigPanel'));assert.equal(runner.beforeUnload().prevented,true);await runner.advance(2500);assert.equal(runner.puts().length,1);assert.equal(runner.puts()[0].body.names,before.names);assert.deepEqual(runner.puts()[0].body.builder_config,before.config);assert.equal(runner.beforeUnload().prevented,false);},{reply:request=>isDelete(request)?wait.promise:undefined});
});

test('fixture, manual-save, autosave, publication-dialog and public-operation guards reject deletion before confirming',async t=>{
 await withBuilder(t,async runner=>{const action=await startDelete(runner);await action();await runner.flush();assert.equal(runner.deletes().length,0);assert.equal(runner.confirms.length,0);assert.equal(runner.requests.length,0);},{fixtureMode:true});
 for(const busy of ['manual-save','autosave','dialog','publication']){const wait=deferred();await withBuilder(t,async runner=>{const action=await startDelete(runner);let pending;if(busy==='manual-save'){pending=button(runner,'Guardar').props.onClick();}else if(busy==='autosave'){await edit(runner,'QA autosave busy');await runner.advance(2500);}else if(busy==='dialog'){await click(runner,'Publicar');}else{await click(runner,'4. Revisar');pending=panel(runner,'VersionsPanel').props.onRollback(oldVersion(runner.initialData));}await action();await runner.flush();assert.equal(runner.deletes().length,0);assert.equal(runner.confirms.length,0);if(busy==='manual-save'||busy==='autosave')wait.resolve(runner.stored());else if(busy==='publication')wait.resolve(Response.json({success:true}));if(pending)await pending;await runner.flush();},{reply:request=>(busy==='manual-save'||busy==='autosave')&&request.method==='PUT'||busy==='publication'&&request.body?.action==='publish'?wait.promise:undefined});}
});

test('a pending or uncertain duplication cannot race with deleting its original source',async t=>{
 for(const state of ['pending','uncertain']){const wait=deferred();await withBuilder(t,async runner=>{const action=await startDelete(runner),pending=runner.duplicate().props.onClick();await runner.flush();if(state==='uncertain')await pending;await action();await runner.flush();assert.equal(runner.deletes().length,0);assert.equal(runner.confirms.length,1);assert.equal(runner.copies().length,1);if(state==='pending'){wait.resolve(runner.created(runner.copies()[0]));await pending;await runner.flush();}},{reply:request=>request.method==='POST'&&request.url==='/api/admin/invitations'?state==='pending'?wait.promise:Response.json({error:'QA uncertain copy'},{status:503}):undefined});}
});

test('real inline text commits before confirmation; cancel preserves it and consent discards it without a pre-delete Save',async t=>{
 for(const accept of [false,true]){let bridge;await withBuilder(t,async runner=>{const action=await startDelete(runner),before=copy(runner.readDraft());bridge=inlineBridge(runner,'  QA current inline before deletion  ');document.activeElement=bridge.editable;await action();await runner.flush();assert.equal(bridge.editable.blurCalls,1);assert.equal(runner.puts().length,0);assert.equal(runner.deletes().length,accept?1:0);const latest=inlineBlock(runner.readDraft());assert.equal(latest.props.text,'QA current inline before deletion');assert.deepEqual(latest.bindings,{untouched:'couple.groom'});assert.deepEqual(latest.style,inlineBlock(before).style);assert.equal(latest.props.qaOriginal,'/qa-original-delete.svg');if(!accept){assert.ok(panel(runner,'ConfigPanel'));assert.equal(runner.beforeUnload().prevented,true);assert.equal(runner.navigation.length,0);}else{assert.equal(runner.beforeUnload().prevented,false);assert.equal(runner.navigation.length,1);}}, {initial:inlineFixture(),confirmAction:()=>{assert.equal(bridge.editable.blurCalls,1,'The real Editable.onBlur must run before consent');return accept;}});}
});

test('unmount during headers or JSON suppresses late outcomes, navigation, alerts and old delete handlers',async t=>{
 for(const phase of ['headers','body'])for(const result of ['success','failure']){const wait=deferred();await withBuilder(t,async runner=>{const action=await startDelete(runner),pending=action();await runner.flush();const request=runner.deletes()[0];runner.unmount();if(result==='failure')wait.reject(Error('QA obsolete deletion failure'));else wait.resolve(phase==='headers'?Response.json({success:true}):{success:true});await pending;await runner.drain();await action();await runner.drain();assert.equal(request.signal.aborted,true);assert.equal(runner.deletes().length,1);assert.equal(runner.confirms.length,1);assert.equal(runner.navigation.length,0);assert.equal(runner.alerts.length,0);assert.equal(runner.lateWrites(),0);},{reply:request=>!isDelete(request)?undefined:phase==='headers'?wait.promise:{ok:true,status:200,json:()=>wait.promise}});}
});

test('source mismatch rejects new destructive work and a source change while awaiting deletion cannot navigate',async t=>{
 await withBuilder(t,async runner=>{const action=await startDelete(runner);await runner.setInitial({...runner.initialData,id:'30000000-0000-4000-8000-000000000008'});await action();await runner.flush();assert.equal(runner.deletes().length,0);assert.equal(runner.confirms.length,0);});
 const wait=deferred();await withBuilder(t,async runner=>{const action=await startDelete(runner),pending=action();await runner.flush();await runner.setInitial({...runner.initialData,id:'30000000-0000-4000-8000-000000000008'});wait.resolve(Response.json({success:true}));await pending;await runner.flush();assert.equal(runner.navigation.length,0);assert.equal(runner.deletes().length,1);assert.equal(runner.deletes()[0].signal.aborted,true);},{reply:request=>isDelete(request)?wait.promise:undefined});
});

test('React 18 effect replay allows a fresh deletion but turns an interrupted pending attempt into locked uncertainty',async t=>{
 await withBuilder(t,async runner=>{const action=await startDelete(runner);runner.replayEffects();await action();await runner.flush();assert.equal(runner.deletes().length,1);assert.equal(runner.navigation.length,1);});
 const wait=deferred();await withBuilder(t,async runner=>{const action=await startDelete(runner),pending=action();await runner.flush();runner.replayEffects();await runner.flush();assertUncertain(runner);await pending;wait.resolve(Response.json({success:true}));await runner.flush();await action();await runner.advance(75000);assertUncertain(runner);assert.equal(runner.deletes().length,1);assert.equal(runner.confirms.length,1);assert.equal(runner.navigation.length,0);},{reply:request=>isDelete(request)?wait.promise:undefined});
});

test('confirmed deletion with failed navigation exposes a safe return link and never repeats the DELETE',async t=>{
 await withBuilder(t,async runner=>{await edit(runner,'QA explicit discard');const action=await startDelete(runner);await action();await runner.flush();frozen(runner);assert.match(text(runner.current()),/Invitación eliminada/);const link=returnLink(runner);assert.ok(link);assert.equal(link.props.href,'/socios/panel');assert.equal(runner.beforeUnload().prevented,false);await action();await runner.advance(75000);assert.equal(runner.deletes().length,1);assert.equal(runner.confirms.length,1);assert.equal(runner.navigation.length,1);assert.equal(runner.puts().length,0);},{navigateAction:()=>{throw Error('QA router unavailable');}});
});
