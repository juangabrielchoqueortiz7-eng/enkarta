// Real InvitationBuilder/duplication hook; inline tests bridge real Editable and parent callbacks.
// Panels/preview, browser lifecycle/events, closest/blur and fetch stay in RAM; no ReactDOM or real requests.
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
const source=process.argv.includes('--baseline')?require('node:child_process').execFileSync('git',['-c','core.fsmonitor=false','show','dbdd82c9a9efa34eabbb96bfcae81b952b6f6e9c:src/components/admin/builder/InvitationBuilder.tsx'],{cwd:root,encoding:'utf8'}):fs.readFileSync(builderFile,'utf8');
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
const base=()=>({...marfilVivoDemo(),id:'30000000-0000-4000-8000-000000000003',slug:'qa-builder-duplicate',names:'QA duplicate original',draft_revision:0,validity_mode:'automatic',validity_extra_days:0,validity_revision:0});
const oldVersion=data=>({id:'qa-desktop-historical',invitationId:data.id,label:'QA desktop historical',source:'publish',createdAt:1,publicationState:'published',data:{...copy(data),names:'QA desktop previous publication'}});

async function withBuilder(t,scenario,{initial=base(),reply,fixtureMode=false,confirmAction=()=>true,navigateAction=()=>{},builderPath='/socios/constructor'}={}){
 if(!initialized.has(t)){t.mock.timers.enable({apis:['setTimeout']});initialized.add(t);}
 assert.deepEqual(validateInvitationBuilder(initial).errors,[],'The fictional preset copy must pass real validation');
 const hookNames=['useState','useRef','useEffect','useMemo','useCallback'],hooks=Object.fromEntries(hookNames.map(name=>[name,React[name]]));
 const globalNames=['window','document','fetch','navigator','alert','confirm'],globals=Object.fromEntries(globalNames.map(name=>[name,Object.getOwnPropertyDescriptor(global,name)]));
 const slots=[],requests=[],alerts=[],confirms=[],navigation=[],local=new Map(),events=new Map(),unexpected=[];let renderInitial=initial,lateWrites=0;
 let cursor=0,dirty=true,tree,effects=[],unmounted=false,revision=initial.draft_revision??0;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 React.useState=initialValue=>{const index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initialValue==='function'?initialValue():initialValue};slot.set=value=>{if(unmounted){lateWrites++;return;}const next=typeof value==='function'?value(slot.value):value;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useRef=value=>{const index=cursor++;return slots[index]??(slots[index]={current:value});};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:compute(),deps};return slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const index=cursor++,previous=slots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup,effect};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 const install=(name,value)=>Object.defineProperty(global,name,{configurable:true,writable:true,value});
 install('window',{innerWidth:1440,localStorage:{getItem:key=>local.get(key)??null,setItem:(key,value)=>local.set(key,value),removeItem:key=>local.delete(key)},addEventListener:(name,callback)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(callback);},removeEventListener:(name,callback)=>events.get(name)?.delete(callback),setTimeout,clearTimeout,confirm:message=>{confirms.push(message);return confirmAction(message,runner);}});
 install('document',{getElementById:()=>null});install('navigator',{onLine:true});install('alert',value=>alerts.push(value));install('confirm',message=>{confirms.push(message);return confirmAction(message,runner);});navigate=url=>{navigation.push(url);return navigateAction(url,runner);};
 const created=(request,patch={})=>Response.json({id:'31000000-0000-4000-8000-000000000001',slug:request.body.slug,status:'draft',...patch},{status:201});
 const stored=()=>Response.json({draft_revision:++revision,expires_at:initial.expires_at,validity_mode:initial.validity_mode,validity_extra_days:initial.validity_extra_days,validity_revision:initial.validity_revision});
 install('fetch',async(url,init={})=>{
  const request={url,method:init.method??'GET',body:init.body?JSON.parse(init.body):null,signal:init.signal,cache:init.cache};requests.push(request);
  const allowed=(request.method==='GET'&&String(url).startsWith('/api/admin/builder-state?'))||(request.method==='POST'&&url==='/api/admin/builder-state')||(['POST','PUT'].includes(request.method)&&url==='/api/admin/invitations');
  if(!allowed){unexpected.push(request);throw Error('Unexpected duplication RAM request');}
  if(reply){const response=reply(request,{requests,stored,created});if(response!==undefined)return response;}
  return request.method==='GET'?Response.json({versions:[],notes:[]}):request.method==='PUT'?stored():url==='/api/admin/invitations'?created(request):Response.json({success:true});
 });
 const drain=async()=>{for(let round=0;round<4;round++)await new Promise(done=>setImmediate(done));};
 const flush=async()=>{for(let round=0;round<45;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];tree=Builder({initialData:renderInitial,backHref:'/socios/panel',builderPath,fixtureMode});for(const effect of effects)effect();}await new Promise(done=>setImmediate(done));if(!dirty||unmounted)return tree;}throw Error('Duplicate hooks did not settle');};
 const dispatch=(name,event)=>{for(const callback of [...(events.get(name)??[])])callback(event);};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const runner={flush,drain,current:()=>tree,initialData:initial,requests,alerts,confirms,navigation,local,stored,created,unmount,dispatch,lateWrites:()=>lateWrites,duplicate:()=>nodes(tree,node=>node.type==='button'&&node.props['aria-label']==='Duplicar invitación')[0],copies:()=>requests.filter(request=>request.method==='POST'&&request.url==='/api/admin/invitations'),replayEffects:()=>{const slotsWithEffect=slots.filter(slot=>slot?.effect);for(const slot of slotsWithEffect)slot.cleanup?.();for(const slot of slotsWithEffect)slot.cleanup=slot.effect();},setInitial:async value=>{renderInitial=value;dirty=true;await flush();},listenerCount:name=>events.get(name)?.size??0,puts:()=>requests.filter(request=>request.method==='PUT'),publications:()=>requests.filter(request=>request.method==='POST'&&['publish','schedule'].includes(request.body?.action)),advance:async milliseconds=>{t.mock.timers.tick(milliseconds);await flush();},beforeUnload:()=>{const event={prevented:false,preventDefault(){this.prevented=true;},returnValue:undefined};dispatch('beforeunload',event);return event;},key:(options={})=>{const event={key:'s',ctrlKey:true,metaKey:false,altKey:false,shiftKey:false,isComposing:false,repeat:false,defaultPrevented:false,target:{tagName:'DIV',isContentEditable:false},preventCalls:0,preventDefault(){this.defaultPrevented=true;this.preventCalls++;},...options};dispatch('keydown',event);return event;}};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of hookNames)React[name]=hooks[name];for(const name of globalNames)if(globals[name])Object.defineProperty(global,name,globals[name]);else delete global[name];assert.deepEqual(unexpected,[],'The transport never delegates to the real network');}
}
const click=async(runner,label)=>{const action=button(runner,label);assert.ok(action,'Expected '+label);assert.equal(!!action.props.disabled,false);const pending=action.props.onClick();await runner.flush();return{pending};};
const edit=async(runner,names)=>{if(!panel(runner,'ContentPanel'))await click(runner,'1. Datos');panel(runner,'ContentPanel').props.onChange({names});await runner.flush();};
const assertPending=runner=>{assert.match(text(runner.current()),/Cambios sin guardar|Error al guardar/);assert.equal(runner.beforeUnload().prevented,true);assert.equal(historyButton(runner,'Deshacer (Ctrl+Z)').props.disabled,false);};

const isCopy=request=>request.method==='POST'&&request.url==='/api/admin/invitations';
const copyId='31000000-0000-4000-8000-000000000001';
const uncertain='No pudimos confirmar la copia. Revisa tus invitaciones antes de volver a duplicar.';
const duplicate=runner=>{const action=runner.duplicate();assert.ok(action,'The real duplication button must exist');return action.props.onClick({target:{closest:()=>null}});};
const copyLink=runner=>nodes(runner.current(),node=>node.type==='a'&&node.props['aria-label']==='Abrir copia en una pestaña nueva')[0];
const assertUnknown=runner=>{assert.ok(text(runner.current()).includes(uncertain));assert.equal(runner.duplicate().props.disabled,true);assert.deepEqual(runner.navigation,[]);};
const inlineFixture=()=>{const data=base();return{...data,config:{...data.config,layout:{...data.config.layout,blocks:[...data.config.layout.blocks,{id:'qa-inline-copy',type:'text',enabled:true,props:{text:'QA original literal',qaOriginal:'/qa-inline-original.svg'},bindings:{text:'couple.full',untouched:'couple.groom'},style:{italic:true,padTop:31}}]}}};};
const inlineBlock=data=>data.config.layout.blocks.find(block=>block.id==='qa-inline-copy');
function inlineBridge(runner,newText){
 const preview=panel(runner,'LivePreview').props,block=inlineBlock(preview.invitation);
 const values=new Map([[BlockEditProvider._context,{editing:true,onEdit:(key,value)=>preview.onEditBlockProp(block.id,key,value)}],[BlockDesignProvider._context,{}]]);
 const original=React.useContext;let rendered;
 React.useContext=context=>{assert.ok(values.has(context),'Only the real edit/design contexts are expected');return values.get(context);};
 try{rendered=Editable({k:'text',value:String(resolveBlockEditorProps(block,preview.invitation).text)});}finally{React.useContext=original;}
 assert.equal(rendered.props.contentEditable,true);assert.equal(rendered.props['data-edit-key'],'text');
 const editable={tagName:'SPAN',isContentEditable:true,textContent:newText,blurCalls:0,blur(){this.blurCalls++;rendered.props.onBlur({currentTarget:this});},closest(selector){return selector==='[data-edit-key][contenteditable="true"]'?this:null;}};
 return{rendered,editable};
}

test('opening and canceling duplicate never writes, navigates, marks the original saved or consumes a later attempt',async t=>{
 let accept=false;await withBuilder(t,async runner=>{
  const before=copy(current(runner));assert.equal(runner.copies().length,0);assert.equal(runner.confirms.length,0);
  await duplicate(runner);await runner.flush();assert.equal(runner.confirms.length,1);assert.equal(runner.copies().length,0);assert.deepEqual(runner.navigation,[]);assert.deepEqual(current(runner),before);assert.equal(runner.duplicate().props.disabled,false);
  accept=true;await duplicate(runner);await runner.flush();assert.equal(runner.confirms.length,2);assert.equal(runner.copies().length,1);assert.deepEqual(runner.navigation,['/socios/constructor/'+copyId]);
 },{confirmAction:()=>accept});
});

test('duplicate snapshots the latest full document after confirmation, even through an old callback before a render',async t=>{
 await withBuilder(t,async runner=>{
  const oldAction=runner.duplicate().props.onClick;
  panel(runner,'ContentPanel').props.onChange({names:'QA latest before confirmation'});
  await oldAction();await runner.flush();const request=runner.copies()[0];assert.ok(request);
  assert.equal(request.body.names,'QA edited during confirmation');assert.equal(request.body.builder_config.qaCopyOnly,'QA latest config');assert.equal(request.body.builder_config.entry.label,'QA confirmed label');assert.equal(runner.puts().length,0);assertPending(runner);assert.equal(runner.navigation.length,0);assert.ok(copyLink(runner));
 },{confirmAction:(_message,runner)=>{const data=panel(runner,'LivePreview').props.invitation;panel(runner,'ContentPanel').props.onChange({names:'QA edited during confirmation',config:{...data.config,qaCopyOnly:'QA latest config',entry:{...data.config.entry,label:'QA confirmed label'}}});return true;}});
});

test('the copied draft preserves original arrays, design and resource paths without copying identity or access credentials',async t=>{
 const initial={...base(),partner_id:'32000000-0000-4000-8000-000000000001',host_email:'qa-host@example.invalid',host_password_hash:'QA_FAKE_HASH',door_email:'qa-door@example.invalid',review_email:'qa-review@example.invalid',published_version_id:'qa-published',views_count:88};
 await withBuilder(t,async runner=>{const before=copy(current(runner));await duplicate(runner);await runner.flush();const payload=runner.copies()[0].body;assert.equal(payload.status,'draft');assert.match(payload.slug,new RegExp('^'+initial.slug+'-copia-'));assert.equal(payload.names,initial.names);assert.equal(payload.template,initial.template);assert.equal(payload.type,initial.type);for(const key of ['parents_groom','parents_bride','sponsors','itinerary','cover_image_url','gallery_url'])assert.deepEqual(payload[key],before[key]);assert.deepEqual(payload.builder_config,before.config);for(const key of ['id','partner_id','host_email','host_password_hash','door_email','review_email','published_version_id','views_count','draft_revision'])assert.equal(Object.hasOwn(payload,key),false,key);assert.deepEqual(current(runner),before);assert.equal(runner.puts().length,0);assert.equal(runner.copies()[0].cache,'no-store');},{initial});
});

test('confirmation reentry and two clicks before React renders share one synchronous attempt and one POST',async t=>{
 const wait=deferred();let reentered=false;await withBuilder(t,async runner=>{
  const action=runner.duplicate().props.onClick,first=action(),second=action();await runner.drain();assert.equal(runner.confirms.length,1);assert.equal(runner.copies().length,1);await runner.flush();assert.equal(runner.duplicate().props.disabled,true);assert.match(text(runner.current()),/Duplicando invitación…/);assert.equal(runner.navigation.length,0);
  wait.resolve(runner.created(runner.copies()[0]));await Promise.all([first,second]);await runner.flush();assert.equal(runner.copies().length,1);assert.equal(runner.navigation.length,1);
 },{confirmAction:(_message,runner)=>{if(!reentered){reentered=true;runner.duplicate().props.onClick();}return true;},reply:request=>isCopy(request)?wait.promise:undefined});
});

test('a verified copy navigates only after its complete acknowledgement and uses the caller builder path',async t=>{
 for(const builderPath of ['/admin/builder','/socios/constructor']){const body=deferred();let reads=0;await withBuilder(t,async runner=>{const pending=duplicate(runner);await runner.flush();assert.equal(runner.copies().length,1);assert.equal(reads,1);assert.deepEqual(runner.navigation,[]);assert.equal(runner.duplicate().props.disabled,true);body.resolve({id:copyId,slug:runner.copies()[0].body.slug,status:'draft'});await pending;await runner.flush();assert.deepEqual(runner.navigation,[builderPath+'/'+copyId]);assert.equal(runner.copies().length,1);},{builderPath,reply:request=>isCopy(request)?{ok:true,status:201,json:()=>{reads++;return body.promise;}}:undefined});}
});

test('received 4xx rejections release the attempt for an explicit retry even when their JSON is unreadable',async t=>{
 for(const kind of ['valid-json','invalid-json']){let reject=true;await withBuilder(t,async runner=>{await duplicate(runner);await runner.flush();assert.equal(runner.copies().length,1);assert.equal(runner.duplicate().props.disabled,false);assert.equal(runner.navigation.length,0);reject=false;await duplicate(runner);await runner.flush();assert.equal(runner.copies().length,2);assert.equal(runner.confirms.length,2);assert.equal(runner.navigation.length,1);},{reply:request=>isCopy(request)&&reject?kind==='valid-json'?Response.json({error:'QA copy rejected'},{status:409}):{ok:false,status:422,json:async()=>{throw Error('QA invalid error body');}}:undefined});}
});

test('a 4xx header followed by a stalled body remains a definitive rejection after the bounded wait',async t=>{
 const body=deferred();let reject=true;await withBuilder(t,async runner=>{const pending=duplicate(runner);await runner.flush();await runner.advance(25000);assert.equal(runner.copies()[0].signal?.aborted,true,'The complete response must have a bounded wait');await pending;await runner.flush();assert.equal(runner.copies().length,1);assert.equal(runner.duplicate().props.disabled,false);assert.equal(runner.navigation.length,0);reject=false;await duplicate(runner);await runner.flush();assert.equal(runner.copies().length,2);assert.equal(runner.navigation.length,1);},{reply:request=>isCopy(request)&&reject?{ok:false,status:403,json:()=>body.promise}:undefined});
});

test('network errors and 5xx responses keep an uncertainty barrier and never silently retry a possibly created copy',async t=>{
 for(const failure of ['network','server'])await withBuilder(t,async runner=>{const oldAction=runner.duplicate().props.onClick;await oldAction();await runner.flush();assert.equal(runner.copies().length,1);assertUnknown(runner);oldAction();await runner.advance(75000);runner.dispatch('online',{});await runner.flush();assert.equal(runner.copies().length,1);assert.equal(runner.confirms.length,1);assertUnknown(runner);},{reply:request=>{if(isCopy(request)){if(failure==='network')throw TypeError('QA isolated connection failure');return Response.json({error:'QA server uncertainty'},{status:503});}}});
});

test('incomplete or mismatched success acknowledgements cannot navigate and keep the uncertainty barrier',async t=>{
 for(const kind of ['invalid-json','invalid-id','source-id','other-slug','public-status','array','null'])await withBuilder(t,async runner=>{const oldAction=runner.duplicate().props.onClick;await oldAction();await runner.flush();assertUnknown(runner);await oldAction();await runner.flush();assert.equal(runner.copies().length,1);assert.equal(runner.confirms.length,1);},{reply:(request,{created})=>{if(!isCopy(request))return;const value={id:copyId,slug:request.body.slug,status:'draft'};if(kind==='invalid-json')return{ok:true,status:201,json:async()=>{throw Error('QA incomplete success');}};if(kind==='array')return Response.json([value],{status:201});if(kind==='null')return Response.json(null,{status:201});return created(request,kind==='invalid-id'?{id:'../../qa-invalid'}:kind==='source-id'?{id:base().id}:kind==='other-slug'?{slug:'qa-other-event'}:{status:'ready'});}});
});

test('timeouts bound headers and success bodies without retrying when the transport ignores abort or later acknowledges',async t=>{
 for(const phase of ['headers','body']){const wait=deferred();let reads=0;await withBuilder(t,async runner=>{const oldAction=runner.duplicate().props.onClick,pending=oldAction();await runner.flush();assert.equal(runner.copies().length,1);await runner.advance(25000);assertUnknown(runner);await pending;await runner.flush();assert.equal(runner.copies()[0].signal.aborted,true);const request=runner.copies()[0];wait.resolve(phase==='headers'?{ok:true,status:201,json:async()=>{reads++;return{id:copyId,slug:request.body.slug,status:'draft'};}}:{id:copyId,slug:request.body.slug,status:'draft'});await runner.flush();await oldAction();await runner.flush();assert.equal(runner.copies().length,1);assert.equal(reads,phase==='headers'?0:1);assertUnknown(runner);},{reply:request=>!isCopy(request)?undefined:phase==='headers'?wait.promise:{ok:true,status:201,json:()=>{reads++;return wait.promise;}}});}
});

test('an original with unsaved changes stays open after copying and offers its verified copy in a separate tab',async t=>{
 await withBuilder(t,async runner=>{await edit(runner,'QA original unsaved');const before=copy(current(runner));await duplicate(runner);await runner.flush();assert.equal(runner.copies()[0].body.names,'QA original unsaved');assert.deepEqual(runner.navigation,[]);assert.deepEqual(current(runner),before);assertPending(runner);const link=copyLink(runner);assert.ok(link);assert.equal(link.props.href,'/socios/constructor/'+copyId);assert.equal(link.props.target,'_blank');assert.match(link.props.rel,/noopener/);assert.equal(runner.puts().length,0);});
});

test('edits after sending the frozen snapshot stay in the original without being silently copied, saved or discarded by navigation',async t=>{
 const wait=deferred();await withBuilder(t,async runner=>{const pending=duplicate(runner);await runner.flush();const sent=copy(runner.copies()[0].body);await edit(runner,'QA edit after duplicate POST');assert.deepEqual(runner.copies()[0].body,sent);wait.resolve(runner.created(runner.copies()[0]));await pending;await runner.flush();assert.equal(current(runner).names,'QA edit after duplicate POST');assert.equal(runner.copies()[0].body.names,runner.initialData.names);assert.equal(runner.puts().length,0);assertPending(runner);assert.deepEqual(runner.navigation,[]);assert.ok(copyLink(runner));},{reply:request=>isCopy(request)?wait.promise:undefined});
});

test('a router failure after verified creation offers the known copy instead of inviting an unsafe duplicate retry',async t=>{
 await withBuilder(t,async runner=>{const oldAction=runner.duplicate().props.onClick;await oldAction();await runner.flush();assert.deepEqual(runner.navigation,['/socios/constructor/'+copyId]);assert.ok(copyLink(runner));assert.equal(copyLink(runner).props.href,'/socios/constructor/'+copyId);await oldAction();await runner.flush();assert.equal(runner.copies().length,1);assert.equal(runner.confirms.length,1);assert.equal(runner.navigation.length,1);assert.ok(!text(runner.current()).includes(uncertain));},{navigateAction:()=>{throw Error('QA router unavailable');}});
});

test('unmount during headers or JSON ignores later successes, failures, navigation and late notifications',async t=>{
 for(const phase of ['headers','body'])for(const result of ['success','failure']){const wait=deferred();await withBuilder(t,async runner=>{const oldAction=runner.duplicate().props.onClick,pending=oldAction();await runner.flush();const request=runner.copies()[0];runner.unmount();if(result==='failure')wait.reject(Error('QA obsolete failure'));else wait.resolve(phase==='headers'?runner.created(request):{id:copyId,slug:request.body.slug,status:'draft'});await pending;await runner.drain();await oldAction();await runner.drain();assert.deepEqual(runner.navigation,[]);assert.equal(runner.alerts.length,0);assert.equal(runner.lateWrites(),0);assert.equal(runner.copies().length,1);assert.equal(runner.confirms.length,1);assert.equal(request.signal.aborted,true);},{reply:request=>!isCopy(request)?undefined:phase==='headers'?wait.promise:{ok:true,status:201,json:()=>wait.promise}});}
});

test('source mismatch cannot retarget the current command and pending replies cannot navigate into another source context',async t=>{
 await withBuilder(t,async runner=>{const command=runner.duplicate().props.onClick;await runner.setInitial({...runner.initialData,id:'30000000-0000-4000-8000-000000000004'});await command();await runner.flush();assert.equal(runner.copies().length,0);assert.equal(runner.confirms.length,0);await duplicate(runner);await runner.flush();assert.equal(runner.copies().length,0);await runner.setInitial(runner.initialData);await command();await runner.flush();assert.equal(runner.copies().length,1);assert.equal(runner.navigation.length,1);});
 const wait=deferred();await withBuilder(t,async runner=>{const pending=duplicate(runner);await runner.flush();const request=runner.copies()[0];await runner.setInitial({...runner.initialData,id:'30000000-0000-4000-8000-000000000004'});wait.resolve(runner.created(request));await pending;await runner.flush();assert.deepEqual(runner.navigation,[]);assert.equal(copyLink(runner),undefined);assert.equal(runner.copies().length,1);assert.equal(request.signal.aborted,true);},{reply:request=>isCopy(request)?wait.promise:undefined});
});

test('React 18 effect replay permits a fresh valid copy without resurrecting a cleaned-up operation',async t=>{
 await withBuilder(t,async runner=>{runner.replayEffects();await duplicate(runner);await runner.flush();assert.equal(runner.copies().length,1);assert.equal(runner.copies()[0].signal.aborted,false);assert.equal(runner.navigation.length,1);assert.equal(runner.alerts.length,0);});
});

test('fixture mode, a pending manual save and an active public operation reject even a retained duplicate handler',async t=>{
 await withBuilder(t,async runner=>{await duplicate(runner);await runner.flush();assert.equal(runner.requests.length,0);assert.equal(runner.confirms.length,0);},{fixtureMode:true});
 for(const operation of ['save','publication']){const wait=deferred();await withBuilder(t,async runner=>{const oldAction=runner.duplicate().props.onClick;let pending;if(operation==='save'){await edit(runner,'QA busy original save');({pending}=await click(runner,'Guardar'));}else{await click(runner,'4. Revisar');pending=panel(runner,'VersionsPanel').props.onRollback(oldVersion(runner.initialData));await runner.flush();}await oldAction();await runner.flush();assert.equal(runner.copies().length,0);assert.equal(runner.confirms.length,0);wait.resolve(operation==='save'?runner.stored():Response.json({success:true}));await pending;await runner.flush();},{reply:request=>operation==='save'&&request.method==='PUT'||operation==='publication'&&request.body?.action==='publish'?wait.promise:undefined});}
});

test('opening a publication dialog or starting manual Save during duplication vetoes late automatic navigation',async t=>{
 for(const activity of ['dialog','manual-save']){const created=deferred(),saved=deferred();await withBuilder(t,async runner=>{
  const copyPending=duplicate(runner);await runner.flush();let savePending;
  if(activity==='dialog')await click(runner,'Publicar');else({pending:savePending}=await click(runner,'Guardar'));
  created.resolve(runner.created(runner.copies()[0]));await copyPending;await runner.flush();assert.deepEqual(runner.navigation,[]);assert.ok(copyLink(runner));assert.equal(runner.copies().length,1);
  if(activity==='dialog')assert.equal(nodes(runner.current(),node=>node.props.role==='dialog').length,1);else{assert.equal(button(runner,'Guardando…').props.disabled,true);saved.resolve(runner.stored());await savePending;await runner.flush();assert.equal(runner.navigation.length,0);assert.equal(button(runner,'Guardar').props.disabled,false);}
 },{reply:request=>isCopy(request)?created.promise:request.method==='PUT'?saved.promise:undefined});}
});

test('real inline text commits before the duplication confirmation and remains pending even when that confirmation is canceled',async t=>{
 for(const accept of [true,false]){let bridge;await withBuilder(t,async runner=>{
  const before=copy(current(runner));bridge=inlineBridge(runner,'  QA current inline <copy> & literal  ');document.activeElement=bridge.editable;
  assert.equal(bridge.rendered.props.dangerouslySetInnerHTML.__html,runner.initialData.names);
  assert.equal(inlineBlock(current(runner)).props.text,'QA original literal');
  await duplicate(runner);await runner.flush();assert.equal(bridge.editable.blurCalls,1);assert.equal(runner.confirms.length,1);assert.equal(runner.copies().length,accept?1:0);assert.equal(runner.puts().length,0);
  const latest=inlineBlock(current(runner));assert.equal(latest.props.text,'QA current inline <copy> & literal');assert.deepEqual(latest.bindings,{untouched:'couple.groom'});assert.deepEqual(latest.style,inlineBlock(before).style);assert.equal(latest.props.qaOriginal,'/qa-inline-original.svg');assert.equal(current(runner).names,before.names);assertPending(runner);assert.deepEqual(runner.navigation,[]);
  assert.deepEqual(current(runner).config.layout.blocks.filter(block=>block.id!=='qa-inline-copy'),before.config.layout.blocks.filter(block=>block.id!=='qa-inline-copy'));
  if(accept){const copied=inlineBlock({config:runner.copies()[0].body.builder_config});assert.deepEqual(copied,latest);assert.ok(copyLink(runner));}else{assert.equal(runner.duplicate().props.disabled,false);assert.equal(copyLink(runner),undefined);}
 },{initial:inlineFixture(),confirmAction:()=>{assert.equal(bridge.editable.blurCalls,1,'Editable must commit before opening confirmation');return accept;}});}
});

test('React 18 cleanup/setup during a pending POST keeps uncertainty and never resumes or repeats that aborted attempt',async t=>{
 const wait=deferred();await withBuilder(t,async runner=>{
  const command=runner.duplicate().props.onClick,pending=command();await runner.flush();const request=runner.copies()[0];assert.ok(request);assert.equal(request.signal.aborted,false);
  runner.replayEffects();await runner.flush();assertUnknown(runner);await pending;assert.equal(request.signal.aborted,true);assert.equal(runner.copies().length,1);
  wait.resolve(runner.created(request));await runner.flush();await command();await runner.flush();await runner.advance(75000);assertUnknown(runner);assert.equal(runner.copies().length,1);assert.equal(runner.confirms.length,1);assert.equal(runner.alerts.length,0);
 },{reply:request=>isCopy(request)?wait.promise:undefined});
});
