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
const source=process.argv.includes('--baseline')?require('node:child_process').execFileSync('git',['-c','core.fsmonitor=false','show','f4e3c5e:src/components/admin/builder/InvitationBuilder.tsx'],{cwd:root,encoding:'utf8'}):fs.readFileSync(builderFile,'utf8');
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


const preview=r=>nodes(r.current(),n=>['a','button'].includes(n.type)&&n.props['aria-label']==='Abrir vista privada del borrador')[0];
const invalid=[null,[],{}, {draft_revision:'1'}, {draft_revision:0},{draft_revision:2},{draft_revision:1.5},{draft_revision:-1},{draft_revision:1,id:'other-row'}];
for(const automatic of [false,true])test('unverified '+(automatic?'auto':'manual')+' save acknowledgements retain dirty edits, history, backup and private-preview guard',async t=>{
 for(const value of invalid)await withBuilder(t,async r=>{await edit(r,'QA unchecked '+automatic);const before=copy(current(r));if(automatic)await r.advance(2500);else{const op=await click(r,'Guardar');await op.pending;await r.flush();}assert.equal(r.puts().length,1);assertPending(r);assert.deepEqual(current(r),before);assert.match(text(r.current()),/No pudimos verificar el guardado/);assert.equal(preview(r).type,'button');assert.equal(r.requests.some(q=>q.body?.version?.source==='save'),false);await r.advance(7500);assert.equal(r.puts().length,1);},{reply:q=>q.method==='PUT'?Response.json(value):undefined});
});
test('a verified next revision accepts optional matching identity and synchronizes authoritative validity',async t=>{
 await withBuilder(t,async r=>{await edit(r,'QA valid ack');const op=await click(r,'Guardar');await op.pending;await r.flush();assert.equal(r.beforeUnload().prevented,false);assert.equal(current(r).validity_revision,4);assert.equal(current(r).validity_extra_days,7);assert.equal(preview(r).type,'a');assert.match(text(r.current()),/Guardado/);},{reply:q=>q.method==='PUT'?Response.json({id:q.body.id,draft_revision:q.body.expectedDraftRevision+1,validity_mode:'automatic',validity_revision:4,validity_extra_days:7,expires_at:'2028-07-01'}):undefined});
});
test('rejected acknowledgement does not advance the optimistic revision used by the explicit next attempt',async t=>{
 let bad=true;await withBuilder(t,async r=>{await edit(r,'QA retain revision');let op=await click(r,'Guardar');await op.pending;await r.flush();assertPending(r);bad=false;op=await click(r,'Guardar');await op.pending;await r.flush();assert.equal(r.puts().length,2);assert.equal(r.puts()[1].body.expectedDraftRevision,0);assert.equal(r.beforeUnload().prevented,false);},{reply:q=>q.method==='PUT'?Response.json({draft_revision:bad?90:1,validity_mode:'automatic',validity_revision:0,validity_extra_days:0}):undefined});
});
test('invalid acknowledgement cannot apply foreign validity or overwrite newer edits',async t=>{
 const wait=deferred();await withBuilder(t,async r=>{await edit(r,'QA saved A');const op=await click(r,'Guardar');await edit(r,'QA latest B');const before=copy(current(r));wait.resolve(Response.json({draft_revision:22,validity_mode:'manual',validity_revision:99,validity_extra_days:999,expires_at:'2099-01-01'}));await op.pending;await r.flush();assert.deepEqual(current(r),before);assertPending(r);assert.equal(r.puts().length,1);},{reply:q=>q.method==='PUT'?wait.promise:undefined});
});
test('invalid prepublication Save never sends a publish or schedule mutation',async t=>{
 for(const scheduled of [false,true])await withBuilder(t,async r=>{await edit(r,'QA unverified publish');await click(r,'Publicar');if(scheduled)await click(r,'Programar fecha');const op=await click(r,scheduled?'Programar publicación':'Publicar esta versión');await op.pending;await r.flush();assert.equal(r.publications().length,0);assert.equal(r.puts().length,1);assert.equal(r.beforeUnload().prevented,true);assert.match(text(r.current()),/No pudimos verificar el guardado/);},{reply:q=>q.method==='PUT'?Response.json({}):undefined});
});

test('SQL no-op acknowledgements require complete matching content and tolerate JSONB key order and serialized list columns',async t=>{
 for(const wrong of [false,true])await withBuilder(t,async r=>{const before=copy(current(r));const op=await click(r,'Guardar');await op.pending;await r.flush();assert.deepEqual(current(r),before);if(wrong){assert.match(text(r.current()),/No pudimos verificar el guardado/);assert.equal(preview(r).type,'button');}else{assert.equal(preview(r).type,'a');assert.match(text(r.current()),/Guardado/);}},{reply:q=>{if(q.method!=='PUT')return;const {expectedDraftRevision,...fields}=q.body;const row={...fields,draft_revision:expectedDraftRevision,expires_at:null,validity_mode:"automatic",validity_extra_days:0,validity_revision:0};for(const key of ['parents_groom','parents_bride','sponsors','itinerary'])if(row[key]!==undefined)row[key]=JSON.stringify(row[key]);if(wrong)row.names='QA wrong echo';return Response.json(row);}});
});
