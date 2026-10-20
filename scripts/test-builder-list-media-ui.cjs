// Real BlockEditorPanel/ListEditor/FieldControl and registry; media boundaries are inert.
// No DOM is mounted or media uploaded; no Auth, bank, network or device acceptance is involved.
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
const source=process.argv.includes('--baseline')?execFileSync('git',['-c','core.fsmonitor=false','show','e841446d9dd5f6896ffe6db06bc3c5a0eea5e44d:src/components/admin/builder/panels/BlockEditorPanel.tsx'],{cwd:root,encoding:'utf8'}):fs.readFileSync(panelFile,'utf8');
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
const listBlock=(kind='timeline',items)=>({id:'qa-list',type:kind,enabled:true,props:{title:'QA lista ficticia',items:items??(kind==='timeline'?[{year:'2019',title:'QA primera',text:'QA texto primero',image:'/qa-one.jpg'},{year:'2022',title:'QA segunda',text:'QA texto segundo',image:'/qa-two.jpg'},{year:'2026',title:'QA tercera',text:'QA texto tercero',image:'/qa-three.jpg'}]:[{time:'16:00',label:'QA ceremonia',place:'QA iglesia',duration:'45 min',note:'QA antes',icon:'church'},{time:'18:00',label:'QA recepción',place:'QA salón',duration:'2 h',note:'QA después',icon:'cheers'}])},style:{padTop:31},animation:{preset:'fadeUp'}});
const findBlock=(blocks,id)=>{for(const block of blocks){if(block.id===id)return block;const nested=findBlock(block.children??[],id);if(nested)return nested;}return undefined;};
const listElement=(runner,index=0)=>{const found=nodes(runner.current(),node=>typeof node.type==='function'&&node.type.name==='ListEditor')[index];assert.ok(found,'Expected real list editor');return found;};
const listTree=(runner,index=0)=>{const node=listElement(runner,index);return node.type(node.props);};
const listRows=(runner,index=0)=>React.Children.toArray(listTree(runner,index).props.children).filter(node=>React.isValidElement(node)&&node.type==='div');
const row=(runner,index=0,listIndex=0)=>{const found=listRows(runner,listIndex)[index];assert.ok(found,`Expected list row ${index}`);return found;};
const rowMedia=(runner,index=0,listIndex=0)=>{const found=nodes(row(runner,index,listIndex),node=>node.type===ImageUploader)[0];assert.ok(found,'Expected real image field upload boundary');return found;};
const rowIcon=(runner,index=0,listIndex=0)=>{const found=nodes(row(runner,index,listIndex),node=>node.type===IconPicker)[0];assert.ok(found,'Expected real icon field boundary');return found;};
const rowField=(runner,label,index=0,listIndex=0)=>{const found=nodes(row(runner,index,listIndex),node=>typeof node.type==='function'&&node.type.name==='Labeled'&&node.props.label===label)[0];assert.ok(found,`Expected row field ${label}`);const input=nodes(found,node=>['input','textarea','select'].includes(node.type))[0];assert.ok(input);return input;};
const rowButton=(runner,label,index=0,listIndex=0)=>{const found=nodes(row(runner,index,listIndex),node=>node.type==='button'&&(text(node).trim()===label||node.props['aria-label']===label))[0];assert.ok(found,`Expected list row button ${label}`);return found;};
const addRow=(runner,listIndex=0)=>{const found=nodes(listTree(runner,listIndex),node=>node.type==='button'&&text(node).trim()==='+ Añadir elemento')[0];assert.ok(found,'Expected list add button');found.props.onClick();};
const editRow=(runner,label,value,index=0,listIndex=0)=>rowField(runner,label,index,listIndex).props.onChange({target:{value}});
const items=runner=>findBlock(runner.blocks(),'qa-list').props.items;
async function withList(scenario,{kind='timeline',nested=false,rows,binding=false}={}){
 const target=listBlock(kind,rows);if(binding)target.bindings={items:'event.itinerary'};
 const data=initialData(nested?[{id:'qa-group',type:'group',enabled:true,props:{mode:'overlay',columns:1},children:[target,image('qa-child-image')]},sibling()]:[target,sibling()]);if(binding)data.itinerary=clone(target.props.items);
 return withPanel(scenario,{data,selectedId:nested?'qa-group':'qa-list'});
}

test('timeline image completion preserves current year, title, text, independent block fields and config',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner).props.onChange;editRow(runner,'Año / fecha','2030');await runner.flush();editRow(runner,'Título','QA título actualizado');await runner.flush();editRow(runner,'Texto','QA texto actualizado');await runner.flush();const config=runner.data().config;await runner.setData({config:{...config,theme:{...config.theme,primary:'#543210'},workflow:{...config.workflow,reviewStatus:'approved'}}});const before=clone(items(runner));complete(added);await runner.flush();assert.deepEqual(items(runner),before.map((item,index)=>index?item:{...item,image:added}));assert.equal(runner.data().config.theme.primary,'#543210');assert.equal(runner.data().config.workflow.reviewStatus,'approved');assert.equal(findBlock(runner.blocks(),'qa-list').style.padTop,31);});
});

test('a pending image follows its timeline row and React key when that row moves down',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner).props.onChange,keys=listRows(runner).map(node=>node.key);rowButton(runner,'Bajar elemento').props.onClick();await runner.flush();assert.deepEqual(listRows(runner).map(node=>node.key),[keys[1],keys[0],keys[2]]);const before=clone(items(runner));complete(added);await runner.flush();assert.deepEqual(items(runner),before.map((item,index)=>index===1?{...item,image:added}:item));});
});

test('a pending image for a deleted timeline row cannot restore it or modify a neighbor',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner).props.onChange;rowButton(runner,'Eliminar').props.onClick();await runner.flush();const before=clone(items(runner)),count=runner.patches.length;complete(added);await runner.flush();assert.deepEqual(items(runner),before);assert.equal(runner.patches.length,count);});
});

test('removing an earlier neighbor does not redirect a pending image to the new occupant of its old index',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner,1).props.onChange;rowButton(runner,'Eliminar',0).props.onClick();await runner.flush();const before=clone(items(runner));complete(added);await runner.flush();assert.deepEqual(items(runner),before.map((item,index)=>index?item:{...item,image:added}));});
});

test('adding and editing another row while an image is pending retains the new row and all its content',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner).props.onChange;addRow(runner);await runner.flush();editRow(runner,'Año / fecha','2035',3);await runner.flush();editRow(runner,'Título','QA nueva fila',3);await runner.flush();editRow(runner,'Texto','QA contenido nuevo',3);await runner.flush();const before=clone(items(runner));complete(added);await runner.flush();assert.equal(items(runner).length,4);assert.deepEqual(items(runner),before.map((item,index)=>index?item:{...item,image:added}));});
});

test('retained year, title, text and upload callbacks merge changes in the same turn without a React rerender',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner).props.onChange,year=rowField(runner,'Año / fecha').props.onChange,title=rowField(runner,'Título').props.onChange,body=rowField(runner,'Texto').props.onChange;year({target:{value:'2032'}});title({target:{value:'QA mismo turno'}});body({target:{value:'QA texto mismo turno'}});complete(added);await runner.flush();assert.deepEqual(items(runner)[0],{year:'2032',title:'QA mismo turno',text:'QA texto mismo turno',image:added});});
});

test('two retained image callbacks for different rows both survive reverse completion order',async()=>{
 await withList(async runner=>{const firstComplete=rowMedia(runner,0).props.onChange,secondComplete=rowMedia(runner,1).props.onChange;secondComplete('https://qa.invalid/qa-second-new.jpg');firstComplete(added);await runner.flush();assert.equal(items(runner)[0].image,added);assert.equal(items(runner)[1].image,'https://qa.invalid/qa-second-new.jpg');assert.equal(items(runner)[2].image,'/qa-three.jpg');});
});

test('two identical empty rows retain distinct identities when reordered during a pending upload',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner).props.onChange,keys=listRows(runner).map(node=>node.key);assert.notEqual(keys[0],keys[1]);rowButton(runner,'Bajar elemento').props.onClick();await runner.flush();assert.deepEqual(listRows(runner).map(node=>node.key),[keys[1],keys[0]]);complete(added);await runner.flush();assert.deepEqual(items(runner),[{}, {image:added}]);},{rows:[{},{}]});
});

test('deleting an empty row and appending another empty row does not revive its prior upload intent',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner).props.onChange,key=listRows(runner)[0].key;rowButton(runner,'Eliminar').props.onClick();await runner.flush();addRow(runner);await runner.flush();assert.notEqual(listRows(runner)[1].key,key);const before=clone(items(runner)),count=runner.patches.length;complete(added);await runner.flush();assert.deepEqual(items(runner),before);assert.equal(runner.patches.length,count);},{rows:[{},{}]});
});

test('a pending row upload is ignored after its source list is externally replaced with unknown rows',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner).props.onChange;const current=findBlock(runner.blocks(),'qa-list'),replacement={...current,props:{...current.props,items:[{year:'2040',title:'QA reemplazo independiente',text:'QA no relacionar',image:'/qa-replacement.jpg'}]}};await runner.replaceBlocks([replacement,runner.blocks()[1]]);const before=clone(items(runner)),count=runner.patches.length;complete(added);await runner.flush();assert.deepEqual(items(runner),before);assert.equal(runner.patches.length,count);});
});

test('an itinerary icon completion merges current row fields and preserves exact icon colors and speed',async()=>{
 for(const binding of [false,true])await withList(async runner=>{const complete=rowIcon(runner).props.onChange;for(const [label,value] of [['Nombre','QA ceremonia nueva'],['Hora','17:10'],['Lugar','QA jardín nuevo'],['Duración','60 min'],['Nota breve','QA nota nueva']]){editRow(runner,label,value);await runner.flush();}const before=clone(items(runner));complete('/lottie/qa-original-custom.json',{primary:'#315b28'},0.7);await runner.flush();assert.deepEqual(items(runner),before.map((item,index)=>index?item:{...item,icon:'/lottie/qa-original-custom.json',iconColors:{primary:'#315b28'},iconSpeed:0.7}));if(binding){assert.equal(findBlock(runner.blocks(),'qa-list').bindings?.items,undefined);assert.equal(runner.data().itinerary[0].note,'QA antes');}},{kind:'itinerary',binding});
});

test('a pending bound itinerary icon cannot detach or replace a newer unknown global itinerary',async()=>{
 await withList(async runner=>{const complete=rowIcon(runner).props.onChange;await runner.setData({itinerary:[{time:'21:00',label:'QA agenda reemplazada',place:'QA otro lugar',icon:'dance'}]});const before=clone(runner.data()),count=runner.patches.length;complete('/lottie/qa-original-custom.json',{primary:'#315b28'},0.7);await runner.flush();assert.deepEqual(clone(runner.data()),before);assert.equal(runner.patches.length,count);assert.deepEqual(findBlock(runner.blocks(),'qa-list').bindings,{items:'event.itinerary'});},{kind:'itinerary',binding:true});
});

test('a child timeline image follows the original child after its group children reorder',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner).props.onChange;button(runner,'↓').props.onClick();await runner.flush();const before=clone(runner.blocks()[0].children.map(child=>child.id));complete(added);await runner.flush();assert.deepEqual(runner.blocks()[0].children.map(child=>child.id),before);assert.equal(findBlock(runner.blocks(),'qa-list').props.items[0].image,added);assert.equal(findBlock(runner.blocks(),'qa-child-image').props.url,'/qa-original.jpg');},{nested:true});
});

test('a pending child timeline image preserves row reorder, latest text and unchanged neighboring children',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner).props.onChange;editRow(runner,'Texto','QA texto hijo actual');await runner.flush();rowButton(runner,'Bajar elemento').props.onClick();await runner.flush();const before=clone(items(runner));complete(added);await runner.flush();assert.deepEqual(items(runner),before.map((item,index)=>index===1?{...item,image:added}:item));assert.equal(findBlock(runner.blocks(),'qa-child-image').props.url,'/qa-original.jpg');},{nested:true});
});

test('a pending child row upload cannot revive the child or its parent group after deletion',async()=>{
 for(const target of ['child','parent'])await withList(async runner=>{const complete=rowMedia(runner).props.onChange;if(target==='child'){const group=runner.blocks()[0];await runner.replaceBlocks([{...group,children:group.children.filter(child=>child.id!=='qa-list')},runner.blocks()[1]]);}else await runner.replaceBlocks([runner.blocks()[1]]);const before=clone(runner.data()),count=runner.patches.length;complete(added);await runner.flush();assert.deepEqual(runner.data(),before);assert.equal(runner.patches.length,count);},{nested:true});
});

test('selecting another list block does not redirect an upload retained by the original list',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner).props.onChange;const other={...listBlock(),id:'qa-another-list'};await runner.replaceBlocks([...runner.blocks(),other]);await runner.select('qa-another-list');complete(added);await runner.flush();assert.equal(findBlock(runner.blocks(),'qa-list').props.items[0].image,added);assert.deepEqual(findBlock(runner.blocks(),'qa-another-list'),other);});
});

test('an upload callback cannot apply after its invitation changes away and back',async()=>{
 for(const nested of [false,true])await withList(async runner=>{const complete=rowMedia(runner).props.onChange;await runner.setData({id:otherOwner});await runner.setData({id:owner});const before=clone(runner.data()),count=runner.patches.length;complete(added);await runner.flush();assert.deepEqual(runner.data(),before);assert.equal(runner.patches.length,count);},{nested});
});

test('unmount invalidates pending top-level and nested row image and icon callbacks without late writes',async()=>{
 for(const kind of ['timeline','itinerary'])for(const nested of [false,true])await withList(async runner=>{const complete=(kind==='timeline'?rowMedia(runner):rowIcon(runner)).props.onChange,before=clone(runner.data()),count=runner.patches.length;runner.unmount();complete(added);await runner.flush();assert.deepEqual(runner.data(),before);assert.equal(runner.patches.length,count);assert.equal(runner.lateWrites(),0);},{kind,nested});
});

test('caption editing follows the original image after gallery images reorder',async()=>{
 await withPanel(async runner=>{const change=caption(runner,'title').props.onChange;uploader(runner).props.onChange([second,first]);await runner.flush();const before=clone(runner.blocks()[0].props.captions);change({target:{value:'QA título asociado actualizado'}});await runner.flush();assert.deepEqual(runner.blocks()[0].props.images,[second,first]);assert.deepEqual(runner.blocks()[0].props.captions,before.map(item=>item.image===first?{...item,title:'QA título asociado actualizado'}:item));});
});

test('a retained caption callback cannot restore a removed photo or its caption',async()=>{
 await withPanel(async runner=>{const change=caption(runner,'caption').props.onChange;uploader(runner).props.onChange([second]);await runner.flush();const before=clone(runner.data()),count=runner.patches.length;change({target:{value:'QA no restaurar pie'}});await runner.flush();assert.deepEqual(runner.data(),before);assert.equal(runner.patches.length,count);});
});

test('title, caption and accessible description of one gallery photo merge in the same turn',async()=>{
 await withPanel(async runner=>{const title=caption(runner,'title').props.onChange,body=caption(runner,'caption').props.onChange,alt=caption(runner,'alt').props.onChange;title({target:{value:'QA título simultáneo'}});body({target:{value:'QA pie simultáneo'}});alt({target:{value:'QA descripción simultánea'}});await runner.flush();assert.deepEqual(runner.blocks()[0].props.captions[0],{image:first,title:'QA título simultáneo',caption:'QA pie simultáneo',alt:'QA descripción simultánea'});assert.deepEqual(runner.blocks()[0].props.images,[first,second]);});
});

test('row changes never add runtime identity keys or alter the persisted invitation document shape',async()=>{
 await withList(async runner=>{const originalKeys=Object.keys(items(runner)[0]).sort();const complete=rowMedia(runner).props.onChange;rowButton(runner,'Bajar elemento').props.onClick();await runner.flush();editRow(runner,'Texto','QA conservar formato',1);await runner.flush();complete(added);await runner.flush();assert.deepEqual(Object.keys(items(runner)[1]).sort(),originalKeys);assert.deepEqual(Object.keys(findBlock(runner.blocks(),'qa-list')).sort(),['animation','enabled','id','props','style','type']);assert.equal(runner.blocks()[0].props.items[1].image,added);assert.equal(runner.blocks()[0].props.items[1].text,'QA conservar formato');});
});

test('unknown identical clones and ambiguous duplicated references cannot inherit an earlier row upload intent',async()=>{
 for(const replacement of ['clone','duplicate-reference'])await withList(async runner=>{const complete=rowMedia(runner).props.onChange,current=findBlock(runner.blocks(),'qa-list'),source=items(runner),next=replacement==='clone'?clone(source):[source[0],source[0]];await runner.replaceBlocks([{...current,props:{...current.props,items:next}},runner.blocks()[1]]);const before=clone(items(runner)),count=runner.patches.length;complete(added);await runner.flush();assert.deepEqual(items(runner),before);assert.equal(runner.patches.length,count);});
});

test('an external reorder reusing unique live row objects keeps the upload with its original row',async()=>{
 await withList(async runner=>{const complete=rowMedia(runner).props.onChange,current=findBlock(runner.blocks(),'qa-list'),source=items(runner),next=[source[1],source[0],source[2]];await runner.replaceBlocks([{...current,props:{...current.props,items:next}},runner.blocks()[1]]);const before=clone(items(runner));complete(added);await runner.flush();assert.deepEqual(items(runner),before.map((item,index)=>index===1?{...item,image:added}:item));});
});

test('generated editorial detail rows remain editable while preserving a newer independent global event field',async()=>{
 const details={id:'qa-editorial-details',type:'editorialDetails',enabled:true,props:{title:'QA información',items:[]},bindings:{items:'content.editorialDetails'},style:{padTop:27}};
 await withPanel(async runner=>{const changeLabel=rowField(runner,'Etiqueta',1).props.onChange,changeValue=rowField(runner,'Dato principal',1).props.onChange;await runner.setData({ceremony_time:'19:00',message:'QA mensaje global vigente'});changeLabel({target:{value:'QA punto de encuentro'}});changeValue({target:{value:'QA jardín ficticio'}});await runner.flush();const actual=findBlock(runner.blocks(),'qa-editorial-details');assert.equal(actual.props.items.length,3);assert.equal(actual.props.items[0].note,'Ceremonia · 19:00 h');assert.equal(actual.props.items[1].label,'QA punto de encuentro');assert.equal(actual.props.items[1].value,'QA jardín ficticio');assert.equal(actual.props.items[2].label,'Vestimenta');assert.equal(actual.bindings?.items,undefined);assert.equal(runner.data().ceremony_time,'19:00');assert.equal(runner.data().message,'QA mensaje global vigente');assert.equal(actual.style.padTop,27);},{data:initialData([details,sibling()]),selectedId:'qa-editorial-details'});
});

test('in-place external list mutations are reconciled before a retained upload without restoring removed rows',async()=>{
 for(const mode of ['splice-neighbor','reverse','replace-target','splice-target','replace-neighbor'])await withList(async runner=>{const targetIndex=mode==='splice-neighbor'?1:0,complete=rowMedia(runner,targetIndex).props.onChange,source=items(runner),target=source[targetIndex];if(mode==='splice-neighbor'||mode==='splice-target')source.splice(0,1);else if(mode==='reverse')source.reverse();else source[mode==='replace-target'?0:1]={year:'2045',title:'QA reemplazo in-place',text:'QA contenido externo',image:'/qa-external-replacement.jpg'};const before=clone(source),remaining=source.indexOf(target),count=runner.patches.length;complete(added);await runner.flush();assert.deepEqual(items(runner),before.map((item,index)=>index===remaining?{...item,image:added}:item));if(remaining<0)assert.equal(runner.patches.length,count);});
});

test('two caption rows with the same photo URL remain editable in one turn and retain their keys across rerenders',async()=>{
 const data=initialData();data.config.layout.blocks[0].props.images=[first,first];data.config.layout.blocks[0].props.captions=[{image:first,title:'QA duplicada',caption:'QA pie duplicado',alt:'QA alt duplicado'}];
 await withPanel(async runner=>{const initialKeys=listRows(runner).map(node=>node.key);assert.equal(initialKeys.length,2);assert.notEqual(initialKeys[0],initialKeys[1]);assert.deepEqual(listRows(runner).map(node=>node.key),initialKeys);const titleFirst=caption(runner,'title',0).props.onChange,bodySecond=caption(runner,'caption',1).props.onChange,altFirst=caption(runner,'alt',0).props.onChange;titleFirst({target:{value:'QA primera editada'}});bodySecond({target:{value:'QA segunda editada'}});altFirst({target:{value:'QA alt primera'}});await runner.flush();assert.deepEqual(runner.blocks()[0].props.images,[first,first]);assert.deepEqual(runner.blocks()[0].props.captions,[{image:first,title:'QA primera editada',caption:'QA pie duplicado',alt:'QA alt primera'},{image:first,title:'QA duplicada',caption:'QA segunda editada',alt:'QA alt duplicado'}]);assert.deepEqual(listRows(runner).map(node=>node.key),initialKeys);assert.equal(caption(runner,'title',0).props.value,'QA primera editada');assert.equal(caption(runner,'caption',1).props.value,'QA segunda editada');await runner.setData({names:'QA rerender independiente'});assert.deepEqual(listRows(runner).map(node=>node.key),initialKeys);caption(runner,'title',1).props.onChange({target:{value:'QA título segunda vigente'}});await runner.flush();assert.equal(runner.blocks()[0].props.captions[1].title,'QA título segunda vigente');assert.equal(runner.blocks()[0].props.captions[0].title,'QA primera editada');assert.deepEqual(listRows(runner).map(node=>node.key),initialKeys);},{data});
});
