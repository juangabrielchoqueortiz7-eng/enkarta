// Real BlockEditorPanel, registry, bindings and gallery contracts; upload boundaries are inert.
// No DOM mounting, files, Auth, bank, network or device acceptance is involved.
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react'),panelFile=path.join(root,'src/components/admin/builder/panels/BlockEditorPanel.tsx');
const ImageUploader=()=>null,MultiImageUploader=()=>null,ImageStudio=()=>null,IconPicker=()=>null;
function stub(file,exports){require.cache[require.resolve(file)]={exports};}
for(const [file,Component] of [['../src/components/admin/builder/ImageUploader.tsx',ImageUploader],['../src/components/admin/builder/MultiImageUploader.tsx',MultiImageUploader],['../src/components/admin/builder/ImageStudio.tsx',ImageStudio],['../src/components/admin/builder/IconPicker.tsx',IconPicker]])stub(file,{__esModule:true,default:Component});
for(const name of ['CleanDesignFields','MariaMarioFields','KarlaMauricioFields','PaulaJuanFelipeFields','MarianaJesusFields','ManuelMayaFields','NicoleFranciscoFields','RolyYelianaFields','AnnieMickyFields','LauraAndresFields'])stub(`../src/components/admin/builder/panels/${name}.tsx`,{__esModule:true,default:()=>null});
let storedTemplates=[];
stub('../src/lib/user-templates.ts',{listUserTemplates:async()=>storedTemplates,saveUserTemplate:async()=>[],deleteUserTemplate:async()=>[]});
stub('../src/lib/user-sections.ts',{listUserSections:()=>[],hydrateUserSections:async()=>({sections:[],cloud:false}),saveUserSection:()=>[],deleteUserSection:()=>[]});
const source=process.argv.includes('--baseline')?execFileSync('git',['-c','core.fsmonitor=false','show','21f03f2:src/components/admin/builder/panels/BlockEditorPanel.tsx'],{cwd:root,encoding:'utf8'}):fs.readFileSync(panelFile,'utf8');
const compiled=new Module(panelFile,module);compiled.filename=panelFile;compiled.paths=module.paths;compiled._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:panelFile}).outputText,panelFile);
const BlockEditorPanel=compiled.exports.default,{newServiceContract}=require('../src/lib/packages.ts');
const owner='40000000-0000-4000-8000-000000000001',otherOwner='40000000-0000-4000-8000-000000000002',first='/qa-first.jpg',second='/qa-second.jpg',added='https://qa.invalid/qa-new.jpg';
const clone=value=>JSON.parse(JSON.stringify(value));
const gallery=(id='qa-gallery')=>({id,type:'gallery',enabled:true,props:{title:'QA título',message:'QA mensaje',images:[first,second],captions:[{image:first,title:'QA primera',caption:'QA pie anterior',alt:'QA alt anterior'},{image:second,title:'QA segunda',caption:'QA pie segunda',alt:'QA alt segunda'}],layout:'editorial'},style:{bgKind:'none',padTop:44},animation:{preset:'fadeUp'},bindings:{title:'couple.full'}});
const image=(id='qa-image')=>({id,type:'image',enabled:true,props:{url:'/qa-original.jpg',alt:'QA alt original',focal:'50% 50%',rounded:16},style:{padTop:12},layout:{x:4,y:8}});
const sibling=()=>({id:'qa-sibling',type:'text',enabled:true,props:{text:'QA no restaurar'},style:{padBottom:33}});
const initialData=(blocks=[gallery(),sibling()])=>({id:owner,slug:'qa-blocks-private',names:'QA evento ficticio',template:'perla',type:'boda',event_date:'2027-02-01',config:newServiceContract({galleryImages:[first,second],galleryCaptions:[{image:first,title:'QA vinculada'}],musicUrl:'/music/qa-original.mp3',theme:{primary:'#193827'},decor:{icon:'/lottie/qa-original.json'},qualityControl:{summary:'QA intacto'},workflow:{reviewStatus:'pending'},layout:{version:2,basePreset:'perla',presetKey:'qa-preserve',blocks}},'premium')});
const groupData=()=>initialData([{id:'qa-group',type:'group',enabled:true,props:{mode:'overlay',columns:1},style:{bgKind:'soft'},children:[gallery('qa-child-gallery'),image('qa-child-image'),sibling()]},image('qa-outside')]);
const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const expandable=new Set(['Labeled','FieldControl','ListEditor','VisualLayoutSelect','LayoutPreview','Toggle']);
function nodes(element,predicate){if(!React.isValidElement(element))return[];const result=predicate(element)?[element]:[];if(typeof element.type==='function'&&expandable.has(element.type.name))return[...result,...nodes(element.type(element.props),predicate)];return[...result,...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];}
const find=(runner,predicate)=>{const node=nodes(runner.current(),predicate)[0];assert.ok(node,'Expected real BlockEditorPanel control');return node;};
const uploader=(runner,index=0)=>{const node=nodes(runner.current(),node=>node.type===MultiImageUploader)[index];assert.ok(node,'Expected gallery uploader boundary');return node;};
const studio=runner=>find(runner,node=>node.type===ImageStudio);
const button=(runner,label,index=0)=>{const node=nodes(runner.current(),node=>node.type==='button'&&text(node).trim()===label)[index];assert.ok(node,`Expected button ${label}`);return node;};
const caption=(runner,key,index=0)=>{const node=nodes(runner.current(),node=>node.type===(key==='caption'?'textarea':'input')&&node.props.placeholder===({title:'Ej. Nuestro primer viaje',caption:'Una frase breve que cuente este momento',alt:'Describe lo que aparece en la foto'})[key])[index];assert.ok(node,`Expected caption ${key}`);return node;};
const labeled=(runner,label,index=0)=>{const node=nodes(runner.current(),node=>typeof node.type==='function'&&node.type.name==='Labeled'&&node.props.label===label)[index];assert.ok(node,`Expected label ${label}`);const control=nodes(node,node=>['input','textarea','select'].includes(node.type))[0];assert.ok(control);return control;};
async function withPanel(scenario,{data=initialData(),selectedId='qa-gallery',templates=[]}={}){
 const previousTemplates=storedTemplates;storedTemplates=templates;
 const hookNames=['useState','useRef','useEffect','useCallback','useMemo'],original=Object.fromEntries(hookNames.map(name=>[name,React[name]])),oldFetch=global.fetch;
 const slots=[],patches=[];let cursor=0,dirty=true,tree,effects=[],unmounted=false,lateWrites=0,currentData=clone(data),selected=selectedId;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 React.useState=initial=>{const index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initial==='function'?initial():initial};slot.set=next=>{if(unmounted){lateWrites++;return;}next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useRef=initial=>{const index=cursor++;return slots[index]??(slots[index]={current:initial});};
 React.useCallback=(callback,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:callback,deps};return slots[index].value;};
 React.useMemo=(callback,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:callback(),deps};return slots[index].value;};
 React.useEffect=(effect,deps)=>{const index=cursor++,previous=slots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 global.fetch=()=>{throw Error('Block media regression must never use a network');};
 const onChange=patch=>{if(unmounted)lateWrites++;patches.push(clone(patch));currentData={...currentData,...patch};dirty=true;};
 const flush=async()=>{for(let round=0;round<40;round++){if(dirty&&!unmounted){dirty=false;effects=[];cursor=0;tree=BlockEditorPanel({data:currentData,onChange,selectedId:selected,selectedIds:selected?[selected]:[],onSelect:id=>{selected=id;dirty=true;},previewMode:'mobile',previewWidth:390});for(const effect of effects)effect();}await new Promise(done=>setImmediate(done));if(!dirty||unmounted)return tree;}throw Error('Block hooks did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const runner={current:()=>tree,data:()=>currentData,blocks:()=>currentData.config.layout.blocks,patches,flush,unmount,lateWrites:()=>lateWrites,select:async id=>{selected=id;dirty=true;await flush();},setData:async patch=>{currentData={...currentData,...patch};dirty=true;await flush();},replaceBlocks:async blocks=>{currentData={...currentData,config:{...currentData.config,layout:{...currentData.config.layout,blocks}}};dirty=true;await flush();}};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of hookNames)React[name]=original[name];global.fetch=oldFetch;storedTemplates=previousTemplates;}
}

test('a retained gallery upload preserves the newest caption, title, block style and independent config',async()=>{
 await withPanel(async runner=>{
  const complete=uploader(runner).props.onChange;
  caption(runner,'title').props.onChange({target:{value:'QA título foto nuevo'}});await runner.flush();
  caption(runner,'caption').props.onChange({target:{value:'QA pie foto nuevo'}});await runner.flush();
  caption(runner,'alt').props.onChange({target:{value:'QA descripción nueva'}});await runner.flush();
  labeled(runner,'Título').props.onChange({target:{value:'QA galería nueva'}});await runner.flush();
  const newer=clone(runner.data());newer.config.theme.primary='#543210';newer.config.workflow.reviewStatus='approved';newer.config.layout.blocks[0].style.padTop=88;await runner.setData(newer);
  complete([first,second,added]);await runner.flush();const actual=runner.blocks()[0];
  assert.deepEqual(actual.props.images,[first,second,added]);assert.equal(actual.props.title,'QA galería nueva');assert.deepEqual(actual.props.captions[0],{image:first,title:'QA título foto nuevo',caption:'QA pie foto nuevo',alt:'QA descripción nueva'});assert.deepEqual(actual.props.captions[2],{image:added});assert.equal(actual.style.padTop,88);assert.equal(runner.data().config.theme.primary,'#543210');assert.equal(runner.data().config.workflow.reviewStatus,'approved');
 });
});

test('a gallery ACK cannot restore an unrelated removed block or reverse the current block order',async()=>{
 for(const mode of ['remove','reorder'])await withPanel(async runner=>{
  const complete=uploader(runner).props.onChange;const original=clone(runner.blocks());await runner.replaceBlocks(mode==='remove'?[original[0]]:[original[1],original[0]]);
  complete([first,second,added]);await runner.flush();assert.deepEqual(runner.blocks().map(block=>block.id),mode==='remove'?['qa-gallery']:['qa-sibling','qa-gallery']);assert.deepEqual(runner.blocks().find(block=>block.id==='qa-gallery').props.images,[first,second,added]);
 });
});

test('an upload for a deleted gallery neither restores it nor touches the surviving block',async()=>{
 await withPanel(async runner=>{const complete=uploader(runner).props.onChange;await runner.replaceBlocks([runner.blocks()[1]]);const before=clone(runner.data()),count=runner.patches.length;complete([first,second,added]);await runner.flush();assert.deepEqual(runner.data(),before);assert.equal(runner.patches.length,count);});
});

test('a retained field callback stays with its original block when another block is selected',async()=>{
 await withPanel(async runner=>{const complete=uploader(runner).props.onChange;await runner.select('qa-sibling');const before=clone(runner.blocks()[1]);complete([first,second,added]);await runner.flush();assert.deepEqual(runner.blocks()[0].props.images,[first,second,added]);assert.deepEqual(runner.blocks()[1],before);});
});

test('gallery image binding resolves against current invitation values and only that binding detaches',async()=>{
 const data=initialData();data.config.layout.blocks[0].bindings={images:'media.galleryImages',captions:'media.galleryCaptions',title:'couple.full'};data.config.layout.blocks[0].props.images=[];
 await withPanel(async runner=>{assert.deepEqual(uploader(runner).props.values,[first,second]);const complete=uploader(runner).props.onChange;const newer=clone(runner.data());newer.config.galleryImages=[second,first];newer.config.galleryCaptions=[{image:first,title:'QA enlazada vigente'}];await runner.setData(newer);complete([second,first,added]);await runner.flush();assert.deepEqual(runner.blocks()[0].props.images,[second,first,added]);assert.deepEqual(runner.blocks()[0].props.captions[1],{image:first,title:'QA enlazada vigente'});assert.deepEqual(runner.blocks()[0].bindings,{captions:'media.galleryCaptions',title:'couple.full'});assert.deepEqual(runner.data().config.galleryCaptions,[{image:first,title:'QA enlazada vigente'}]);assert.deepEqual(runner.data().config.galleryImages,[second,first]);},{data});
});

test('ImageStudio upload preserves edits made to the same photo while the upload was pending',async()=>{
 await withPanel(async runner=>{const complete=studio(runner).props.onImageChange;labeled(runner,'Descripción accesible').props.onChange({target:{value:'QA alt nueva'}});await runner.flush();studio(runner).props.onSettingsChange({focal:'15% 75%',zoom:1.8,brightness:0.8});await runner.flush();const before=clone(runner.blocks()[0]);complete(added);await runner.flush();assert.equal(runner.blocks()[0].props.url,added);for(const key of ['alt','focal','zoom','brightness'])assert.deepEqual(runner.blocks()[0].props[key],before.props[key]);assert.deepEqual(runner.blocks()[0].style,before.style);assert.deepEqual(runner.blocks()[1],sibling());},{data:initialData([image(),sibling()]),selectedId:'qa-image'});
});

test('retained ImageStudio settings and image completion merge without losing either change in one turn',async()=>{
 await withPanel(async runner=>{const before=studio(runner).props;before.onSettingsChange({focal:'25% 75%',contrast:1.2});before.onImageChange(added);await runner.flush();assert.equal(runner.blocks()[0].props.url,added);assert.equal(runner.blocks()[0].props.focal,'25% 75%');assert.equal(runner.blocks()[0].props.contrast,1.2);},{data:initialData([image()]),selectedId:'qa-image'});
});

test('a child gallery completion follows its stable ID after children reorder and retains its latest caption',async()=>{
 await withPanel(async runner=>{const complete=uploader(runner).props.onChange;caption(runner,'caption').props.onChange({target:{value:'QA pie hijo actual'}});await runner.flush();button(runner,'↓').props.onClick();await runner.flush();assert.deepEqual(runner.blocks()[0].children.map(child=>child.id),['qa-child-image','qa-child-gallery','qa-sibling']);const latest=clone(runner.blocks()[0]);complete([first,second,added]);await runner.flush();const kids=runner.blocks()[0].children;assert.deepEqual(kids.map(child=>child.id),latest.children.map(child=>child.id));assert.deepEqual(kids[0],latest.children[0]);assert.deepEqual(kids[1].props.images,[first,second,added]);assert.equal(kids[1].props.captions[0].caption,'QA pie hijo actual');},{data:groupData(),selectedId:'qa-group'});
});

test('an old child gallery callback cannot revive a deleted child or replace its current sibling',async()=>{
 await withPanel(async runner=>{const complete=uploader(runner).props.onChange;button(runner,'✕').props.onClick();await runner.flush();const before=clone(runner.data()),count=runner.patches.length;complete([first,second,added]);await runner.flush();assert.deepEqual(runner.data(),before);assert.equal(runner.patches.length,count);},{data:groupData(),selectedId:'qa-group'});
});

test('an old child image callback uses the original child ID after another child was removed',async()=>{
 await withPanel(async runner=>{const complete=find(runner,node=>node.type===ImageUploader&&node.props.value==='/qa-original.jpg').props.onChange;button(runner,'✕').props.onClick();await runner.flush();complete(added);await runner.flush();const kids=runner.blocks()[0].children;assert.deepEqual(kids.map(child=>child.id),['qa-child-image','qa-sibling']);assert.equal(kids[0].props.url,added);assert.deepEqual(kids[1],sibling());},{data:groupData(),selectedId:'qa-group'});
});

test('a late child gallery ACK cannot revive a removed group or overwrite another group layout',async()=>{
 await withPanel(async runner=>{const complete=uploader(runner).props.onChange;await runner.replaceBlocks([runner.blocks()[1]]);const before=clone(runner.data()),count=runner.patches.length;complete([first,second,added]);await runner.flush();assert.deepEqual(runner.data(),before);assert.equal(runner.patches.length,count);},{data:groupData(),selectedId:'qa-group'});
});

test('top-level and nested gallery completions cannot write into another invitation',async()=>{
 for(const nested of [false,true])await withPanel(async runner=>{const complete=uploader(runner).props.onChange;await runner.setData({id:otherOwner,names:'QA otro evento'});const before=clone(runner.data()),count=runner.patches.length;complete([first,second,added]);await runner.flush();assert.deepEqual(runner.data(),before);assert.equal(runner.patches.length,count);},{data:nested?groupData():initialData(),selectedId:nested?'qa-group':'qa-gallery'});
});

test('an owner switch away and back cannot revive an upload callback from the previous editing session',async()=>{
 for(const nested of [false,true])await withPanel(async runner=>{const complete=uploader(runner).props.onChange;await runner.setData({id:otherOwner});await runner.setData({id:owner});const before=clone(runner.data()),count=runner.patches.length;complete([first,second,added]);await runner.flush();assert.deepEqual(runner.data(),before);assert.equal(runner.patches.length,count);},{data:nested?groupData():initialData(),selectedId:nested?'qa-group':'qa-gallery'});
});

test('unmount invalidates retained gallery and ImageStudio callbacks without late writes',async()=>{
 for(const kind of ['gallery','nested','image'])await withPanel(async runner=>{const complete=kind==='image'?studio(runner).props.onImageChange:uploader(runner).props.onChange;const before=clone(runner.data()),count=runner.patches.length;runner.unmount();complete(kind==='image'?added:[first,second,added]);await runner.flush();assert.deepEqual(runner.data(),before);assert.equal(runner.patches.length,count);assert.equal(runner.lateWrites(),0);},{data:kind==='nested'?groupData():kind==='image'?initialData([image()]):initialData(),selectedId:kind==='nested'?'qa-group':kind==='image'?'qa-image':'qa-gallery'});
});

test('applying a saved template invalidates an earlier gallery upload even when it reuses the same block ID',async()=>{
 const replacement=initialData();replacement.config.layout.blocks[0].props.title='QA plantilla aplicada';replacement.config.layout.blocks[0].props.images=['/qa-replacement.jpg'];replacement.config.layout.blocks[0].props.captions=[{image:'/qa-replacement.jpg',title:'QA foto aplicada'}];
 const templates=[{id:'qa-template',name:'QA plantilla ficticia',createdAt:1,layout:replacement.config.layout,theme:{primary:'#123456'}}];
 await withPanel(async runner=>{const complete=uploader(runner).props.onChange;await runner.select('');button(runner,'+ Biblioteca').props.onClick();await runner.flush();button(runner,'Aplicar').props.onClick();assert.equal(runner.blocks()[0].props.title,'QA plantilla aplicada');const before=clone(runner.data()),count=runner.patches.length;complete([first,second,added]);await runner.flush();assert.deepEqual(clone(runner.data()),before);assert.equal(runner.patches.length,count);},{templates});
});

test('changing the template or design key away and back prevents a callback from the previous design session',async()=>{
 for(const field of ['template','designKey'])await withPanel(async runner=>{const complete=uploader(runner).props.onChange,previous=clone(runner.data());if(field==='template'){await runner.setData({template:'noche'});await runner.setData({template:previous.template});}else{await runner.setData({config:{...runner.data().config,designKey:'qa-another-design'}});await runner.setData({config:previous.config});}const before=clone(runner.data()),count=runner.patches.length;complete([first,second,added]);await runner.flush();assert.deepEqual(runner.data(),before);assert.equal(runner.patches.length,count);});
});

test('retained icon selection preserves current content, colors and speed on top-level and reordered child blocks',async()=>{
 const event=()=>({id:'qa-event',type:'eventCard',enabled:true,props:{title:'QA ceremonia',icon:'church',place:'QA lugar'},bindings:{title:'couple.full'},style:{padBottom:23}});
 for(const nested of [false,true]){
  const data=initialData(nested?[{id:'qa-group',type:'group',props:{mode:'overlay',columns:1},children:[event(),sibling()]}]:[event(),sibling()]);
  await withPanel(async runner=>{const complete=find(runner,node=>node.type===IconPicker).props.onChange;labeled(runner,'Lugar').props.onChange({target:{value:'QA lugar actualizado'}});await runner.flush();if(nested){button(runner,'↓').props.onClick();await runner.flush();}const before=clone(runner.data());complete('/lottie/qa-original-custom.json',{primary:'#315b28'},0.7);await runner.flush();const actual=nested?runner.blocks()[0].children.find(child=>child.id==='qa-event'):runner.blocks()[0];assert.equal(actual.props.place,'QA lugar actualizado');assert.equal(actual.props.icon,'/lottie/qa-original-custom.json');assert.deepEqual(actual.props.iconColors,{primary:'#315b28'});assert.equal(actual.props.iconSpeed,0.7);assert.deepEqual(actual.bindings,{title:'couple.full'});if(nested)assert.deepEqual(runner.blocks()[0].children.map(child=>child.id),before.config.layout.blocks[0].children.map(child=>child.id));else assert.deepEqual(runner.blocks()[1],before.config.layout.blocks[1]);},{data,selectedId:nested?'qa-group':'qa-event'});
 }
});

test('discarding blocks invalidates retained upload callbacks in the same turn before React rerenders',async()=>{
 const previousConfirm=global.confirm;global.confirm=()=>true;
 try{await withPanel(async runner=>{const complete=uploader(runner).props.onChange;await runner.select('');button(runner,'Quitar bloques').props.onClick();assert.equal(runner.data().config.layout,undefined);const before=clone(runner.data()),count=runner.patches.length;complete([first,second,added]);await runner.flush();assert.deepEqual(clone(runner.data()),before);assert.equal(runner.data().config.layout,undefined);assert.equal(runner.patches.length,count);});}finally{if(previousConfirm===undefined)delete global.confirm;else global.confirm=previousConfirm;}
});
