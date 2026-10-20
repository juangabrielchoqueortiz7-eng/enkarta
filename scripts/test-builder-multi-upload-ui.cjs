// Real MultiImageUploader and optional MediaPanel hooks with synthetic files.
// Compression/fetch are controlled boundaries. No mounted DOM, device acceptance or real media is claimed.
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react');let compress;
require.cache[require.resolve('../src/lib/image-compress.ts')]={exports:{compressImage:(...args)=>compress(...args)}};
const ImageUploader=()=>null;
require.cache[require.resolve('../src/components/admin/builder/ImageUploader.tsx')]={exports:{__esModule:true,default:ImageUploader}};
const MultiImageUploader=require('../src/components/admin/builder/MultiImageUploader.tsx').default,MediaPanel=require('../src/components/admin/builder/panels/MediaPanel.tsx').default;
const {newServiceContract}=require('../src/lib/packages.ts'),{File}=require('node:buffer');
const owner='30000000-0000-4000-8000-000000000001',otherOwner='30000000-0000-4000-8000-000000000002';
const first='/qa-first.jpg',second='/qa-second.jpg',third='/qa-third.jpg',uploaded='https://qa.invalid/qa-uploaded.jpg';
const initialData=()=>({id:owner,slug:'qa-private-multi',names:'QA evento ficticio',cover_image_url:'/qa-cover.jpg',config:newServiceContract({musicUrl:'/music/qa-original.mp3',galleryImages:[first,second,third],galleryCaptions:[{image:first,title:'QA primera',caption:'QA pie primero',alt:'QA alt primero'},{image:second,title:'QA segunda',caption:'QA pie segundo',alt:'QA alt segundo'},{image:third,title:'QA tercera',caption:'QA pie tercero',alt:'QA alt tercero'}],workflow:{reviewStatus:'pending'},theme:{primary:'#193827'},decor:{icon:'/lottie/qa-original.json'},qualityControl:{summary:'QA no modificar'}},'premium')});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];
const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const clone=value=>JSON.parse(JSON.stringify(value));
const file=(name='qa-upload.jpg',bytes='QA synthetic original image')=>new File([bytes],name,{type:'image/jpeg'});
const caption=(runner,key,index=0)=>nodes(runner.media(),node=>node.type===(key==='caption'?'textarea':'input')&&node.props.placeholder===({title:'Título · Nuestro primer viaje',caption:'Pie de foto · Una frase breve que cuente este momento',alt:'Descripción accesible de lo que aparece'})[key])[index];
function card(runner,url){return nodes(runner.current(),node=>node.type==='div'&&nodes(node,item=>item.type==='img'&&item.props.src===url).length===1&&nodes(node,item=>item.type==='button'&&text(item).trim()==='✕').length===1).at(-1);}
function control(runner,url,label){const item=card(runner,url);assert.ok(item,`Missing synthetic card ${url}`);const found=nodes(item,node=>node.type==='button'&&text(node).trim()===label)[0];assert.ok(found,`Missing ${label} on ${url}`);return found;}

async function withMulti(scenario,{integrated=false,props={},data=initialData(),reply,compression}={}){
 const names=['useState','useRef','useEffect','useCallback'],original=Object.fromEntries(names.map(name=>[name,React[name]])),oldFetch=global.fetch;
 const fibers=new Map(),requests=[],compressions=[],changes=[],patches=[];let fiber,cursor=0,dirty=true,effects=[],unmounted=false,lateWrites=0,tree,mediaTree,currentData=clone(data),currentProps={values:[first,second,third],ownerId:owner,folder:'gallery',max:12,...props};
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 React.useState=initial=>{const slots=fiber.slots,index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initial==='function'?initial():initial};slot.set=next=>{if(unmounted){lateWrites++;return;}next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useRef=initial=>{const index=cursor++;return fiber.slots[index]??(fiber.slots[index]={current:initial});};
 React.useCallback=(callback,deps)=>{const slots=fiber.slots,index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:callback,deps};return slots[index].value;};
 React.useEffect=(effect,deps)=>{const slots=fiber.slots,index=cursor++,previous=slots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 compress=(...args)=>{compressions.push(args);return compression?compression(...args):Promise.resolve(args[0]);};
 global.fetch=async(url,options={})=>{const request={url,method:options.method,body:options.body,signal:options.signal};requests.push(request);return reply?reply(request,requests):Response.json({url:uploaded});};
 const standardChange=values=>{changes.push([...values]);currentProps={...currentProps,values};dirty=true;};
 const patch=next=>{patches.push(clone(next));currentData={...currentData,...next};dirty=true;};
 const render=(name,Component,input)=>{fiber=fibers.get(name);if(!fiber){fiber={slots:[]};fibers.set(name,fiber);}cursor=0;return Component(input);};
 const flush=async()=>{for(let round=0;round<35;round++){if(dirty&&!unmounted){dirty=false;effects=[];if(integrated){mediaTree=render('media',MediaPanel,{data:currentData,onChange:patch});tree=render('multi',MultiImageUploader,nodes(mediaTree,node=>node.type===MultiImageUploader)[0].props);}else tree=render('multi',MultiImageUploader,{...currentProps,onChange:currentProps.onChange??standardChange});for(const effect of effects)effect();}await new Promise(done=>setImmediate(done));if(!dirty||unmounted)return tree;}throw Error('Multi uploader hooks did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const item of fibers.values())for(const slot of item.slots)slot?.cleanup?.();};
 const runner={current:()=>tree,media:()=>mediaTree,values:()=>integrated?currentData.config.galleryImages:currentProps.values,data:()=>currentData,props:()=>currentProps,requests,compressions,changes,patches,flush,unmount,lateWrites:()=>lateWrites,
  choose:files=>nodes(tree,node=>node.type==='input'&&node.props.type==='file')[0].props.onChange({target:{files,value:'qa-selection'}}),
  handler:()=>nodes(tree,node=>node.type==='input'&&node.props.type==='file')[0].props.onChange,
  setProps:async next=>{currentProps={...currentProps,...next};dirty=true;await flush();},
  setData:async next=>{currentData={...currentData,...next};dirty=true;await flush();},
  setValues:async values=>{currentProps={...currentProps,values};dirty=true;await flush();},
 };
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of names)React[name]=original[name];global.fetch=oldFetch;assert.ok(requests.every(request=>request.url==='/api/admin/upload'&&request.method==='POST'),'Only isolated upload requests are permitted');}
}

test('a pending gallery batch appends to the edited list without restoring a removed photo or its old order',async()=>{
 const wait=deferred();await withMulti(async runner=>{
  runner.choose([file()]);await runner.flush();assert.equal(runner.requests.length,1);
  control(runner,first,'✕').props.onClick();await runner.flush();control(runner,third,'←').props.onClick();await runner.flush();assert.deepEqual(runner.values(),[third,second]);
  wait.resolve(Response.json({url:uploaded}));await runner.flush();assert.deepEqual(runner.values(),[third,second,uploaded]);assert.equal(runner.changes.filter(values=>values.includes(uploaded)).length,1);
 },{reply:()=>wait.promise});
});

test('partial batch success keeps current removals/order and exposes failure without inventing the failed URL',async()=>{
 const wait=deferred();await withMulti(async runner=>{
  runner.choose([file('qa-success.jpg'),file('qa-failure.jpg')]);await runner.flush();assert.equal(runner.requests.length,2);
  control(runner,first,'✕').props.onClick();await runner.flush();control(runner,third,'←').props.onClick();await runner.flush();
  const beforeFailure=runner.changes.length;wait.resolve(Response.json({error:'QA archivo rechazado'},{status:415}));await runner.flush();assert.deepEqual(runner.values(),[third,second,uploaded]);assert.match(text(runner.current()),/QA archivo rechazado/);assert.equal(runner.changes.length,beforeFailure,'Failure must not replay the already published partial list');assert.equal(runner.requests.length,2);
 },{reply:(_request,requests)=>requests.length===1?Response.json({url:uploaded}):wait.promise});
});

test('real MediaPanel keeps current title, caption, alt, music and design configuration when a gallery ACK arrives',async()=>{
 const wait=deferred();await withMulti(async runner=>{
  const before=clone(runner.data().config);runner.choose([file()]);await runner.flush();
  caption(runner,'title',1).props.onChange({target:{value:'QA título editado'}});await runner.flush();caption(runner,'caption',1).props.onChange({target:{value:'QA pie editado'}});await runner.flush();caption(runner,'alt',1).props.onChange({target:{value:'QA alt editado'}});await runner.flush();
  control(runner,first,'✕').props.onClick();await runner.flush();control(runner,third,'←').props.onClick();await runner.flush();caption(runner,'title',1).props.onChange({target:{value:'QA título editado'}});wait.resolve(Response.json({url:uploaded}));await runner.flush();
  const after=runner.data().config;assert.deepEqual(after.galleryImages,[third,second,uploaded]);assert.deepEqual(after.galleryCaptions[1],{image:second,title:'QA título editado',caption:'QA pie editado',alt:'QA alt editado'});assert.equal(after.galleryCaptions.some(item=>item.image===first),false);
  for(const key of ['musicUrl','theme','decor','qualityControl','workflow','serviceContract','features'])assert.deepEqual(after[key],before[key]);
 },{integrated:true,reply:()=>wait.promise});
});

test('retained remove/move controls use photo identity and current values within the same event turn',async()=>{
 await withMulti(async runner=>{
  const removeFirst=control(runner,first,'✕').props.onClick,moveThird=control(runner,third,'←').props.onClick;
  removeFirst();moveThird();await runner.flush();assert.deepEqual(runner.values(),[third,second]);
  removeFirst();await runner.flush();assert.deepEqual(runner.values(),[third,second]);
 });
});

test('same-turn edits immediately before the batch ACK survive without requiring a React render',async()=>{
 const wait=deferred();await withMulti(async runner=>{
  runner.choose([file()]);await runner.flush();const removeFirst=control(runner,first,'✕').props.onClick,moveThird=control(runner,third,'←').props.onClick;removeFirst();moveThird();wait.resolve(Response.json({url:uploaded}));await runner.flush();assert.deepEqual(runner.values(),[third,second,uploaded]);
 },{reply:()=>wait.promise});
});

test('duplicate file starts in the same turn are synchronously locked to one batch',async()=>{
 const wait=deferred();await withMulti(async runner=>{
  const handler=runner.handler();handler({target:{files:[file('qa-first.jpg')],value:'first'}});handler({target:{files:[file('qa-second.jpg')],value:'second'}});await runner.flush();assert.equal(runner.compressions.length,1);assert.equal(runner.requests.length,1);assert.equal(runner.requests[0].body.get('file').name,'qa-first.jpg');
  wait.resolve(Response.json({url:uploaded}));await runner.flush();assert.deepEqual(runner.values(),[first,second,third,uploaded]);
 },{reply:()=>wait.promise});
});

test('the initial photo limit only uploads available slots and a full gallery does no compression or request',async()=>{
 await withMulti(async runner=>{
  runner.choose([file('qa-one.jpg'),file('qa-two.jpg')]);await runner.flush();assert.equal(runner.requests.length,1);assert.equal(runner.compressions.length,1);assert.deepEqual(runner.values(),[first,second,third,uploaded]);
  const changeCount=runner.changes.length;runner.choose([file('qa-over-limit.jpg')]);await runner.flush();assert.equal(runner.requests.length,1);assert.equal(runner.compressions.length,1);assert.equal(runner.changes.length,changeCount);
 },{props:{max:4}});
});

test('externally supplied current values are retained when the same destination batch completes',async()=>{
 const wait=deferred();await withMulti(async runner=>{
  runner.choose([file()]);await runner.flush();await runner.setValues([third,'/qa-external.jpg']);wait.resolve(Response.json({url:uploaded}));await runner.flush();assert.deepEqual(runner.values(),[third,'/qa-external.jpg',uploaded]);
 },{reply:()=>wait.promise});
});

test('each validated photo becomes editable immediately and deleting it cannot be undone by a later ACK or failure',async()=>{
 for(const failure of [false,true]){const wait=deferred();await withMulti(async runner=>{
  runner.choose([file('qa-first-added.jpg'),file('qa-last.jpg')]);await runner.flush();assert.equal(runner.requests.length,2);assert.deepEqual(runner.values(),[first,second,third,uploaded]);
  control(runner,uploaded,'✕').props.onClick();await runner.flush();control(runner,third,'←').props.onClick();await runner.flush();const edited=[first,third,second];assert.deepEqual(runner.values(),edited);const changes=runner.changes.length;
  wait.resolve(failure?Response.json({error:'QA último rechazado'},{status:415}):Response.json({url:'https://qa.invalid/last.jpg'}));await runner.flush();assert.deepEqual(runner.values(),failure?edited:[...edited,'https://qa.invalid/last.jpg']);assert.equal(runner.values().includes(uploaded),false);assert.equal(runner.changes.length,changes+(failure?0:1));
 },{reply:(_request,requests)=>requests.length===1?Response.json({url:uploaded}):wait.promise});}
});

test('same-destination rerenders use the current callback while preserving the latest parent configuration',async()=>{
 const wait=deferred(),oldCalls=[],newCalls=[];await withMulti(async runner=>{
  runner.choose([file()]);await runner.flush();await runner.setProps({onChange:values=>newCalls.push(values),values:[third]});wait.resolve(Response.json({url:uploaded}));await runner.flush();assert.deepEqual(oldCalls,[]);assert.deepEqual(newCalls,[[third,uploaded]]);assert.equal(runner.requests.length,1);
 },{props:{onChange:values=>oldCalls.push(values)},reply:()=>wait.promise});
});

test('an in-flight batch never exceeds a current photo limit when another edit fills its last slot',async()=>{
 const wait=deferred();await withMulti(async runner=>{
  runner.choose([file()]);await runner.flush();await runner.setValues([first,second,third,'/qa-external.jpg']);wait.resolve(Response.json({url:uploaded}));await runner.flush();assert.deepEqual(runner.values(),[first,second,third,'/qa-external.jpg']);assert.equal(runner.values().length,4);assert.equal(runner.requests.length,1);
 },{props:{max:4},reply:()=>wait.promise});
});

test('invalid JSON, missing/malformed URLs and HTTP errors cannot append a claimed image',async()=>{
 const failures=[()=>new Response('{truncated'),...([null,{}, {url:42},{url:[]},{url:''},{url:'   '},{url:'http://'},{url:'https://'},{url:'javascript:alert(1)'}].map(value=>()=>Response.json(value))),()=>Response.json({url:uploaded,error:'QA no aceptado'},{status:415})];
 for(const reply of failures)await withMulti(async runner=>{
  runner.choose([file()]);await runner.flush();assert.deepEqual(runner.values(),[first,second,third]);assert.deepEqual(runner.changes,[]);assert.equal(runner.requests.length,1);assert.match(text(runner.current()),/Error|JSON|respuesta|subir|URL|válid|aceptado|verificar|incomplet/i);
 },{reply});
});

test('a malformed second success response preserves only the validated partial upload and current gallery edits',async()=>{
 const wait=deferred();await withMulti(async runner=>{
  runner.choose([file('qa-valid.jpg'),file('qa-invalid.jpg')]);await runner.flush();assert.equal(runner.requests.length,2);control(runner,first,'✕').props.onClick();await runner.flush();wait.resolve(Response.json({url:'https://'}));await runner.flush();assert.deepEqual(runner.values(),[second,third,uploaded]);assert.equal(runner.values().includes('https://'),false);assert.match(text(runner.current()),/Error|respuesta|URL|válid|verificar|incomplet/i);
 },{reply:(_request,requests)=>requests.length===1?Response.json({url:uploaded}):wait.promise});
});

test('leaving during compression, transport or JSON prevents callback/state changes and later batch requests',async()=>{
 for(const phase of ['compress','transport','json']){const wait=deferred();let reads=0;await withMulti(async runner=>{
  runner.choose([file('qa-first.jpg'),file('qa-never-start.jpg')]);await runner.flush();runner.unmount();
  if(phase==='compress')wait.resolve(file());else if(phase==='transport')wait.resolve({ok:true,status:200,json:async()=>{reads++;return{url:uploaded};}});else wait.resolve({url:uploaded});await runner.flush();
  assert.deepEqual(runner.changes,[]);assert.equal(runner.lateWrites(),0);assert.equal(runner.requests.length,phase==='compress'?0:1);assert.equal(reads,phase==='json'?1:0);if(runner.requests.length){assert.ok(runner.requests[0].signal instanceof AbortSignal);assert.equal(runner.requests[0].signal.aborted,true);}
 },{compression:phase==='compress'?()=>wait.promise:undefined,reply:()=>phase==='transport'?wait.promise:{ok:true,status:200,json:()=>{reads++;return wait.promise;}}});}
});

test('changing owner, folder, destination key or limit invalidates a pending batch and an away/back change cannot revive it',async()=>{
 const replacements={ownerId:otherOwner,folder:'another-gallery',destinationKey:'another-block:images',max:4},originals={ownerId:owner,folder:'gallery',destinationKey:'',max:12};
 for(const field of Object.keys(replacements))for(const back of [false,true]){const wait=deferred();await withMulti(async runner=>{
  runner.choose([file('qa-pending.jpg'),file('qa-never-start.jpg')]);await runner.flush();await runner.setProps({[field]:replacements[field]});if(back)await runner.setProps({[field]:originals[field]});
  wait.resolve(Response.json({url:uploaded}));await runner.flush();assert.deepEqual(runner.changes,[]);assert.equal(runner.requests.length,1);assert.equal(runner.requests[0].signal.aborted,true);assert.doesNotMatch(text(runner.current()),/QA_PRIVATE|Error al subir/);
 },{reply:()=>wait.promise});}
});

test('a changed destination also invalidates work waiting for compression or body JSON, without applying it to a new callback',async()=>{
 for(const phase of ['compress','json']){const wait=deferred(),oldCalls=[],newCalls=[];await withMulti(async runner=>{
  runner.choose([file('qa-waiting.jpg'),file('qa-never-start.jpg')]);await runner.flush();await runner.setProps({destinationKey:'new-block:images',onChange:values=>newCalls.push(values)});
  wait.resolve(phase==='compress'?file():{url:uploaded});await runner.flush();assert.deepEqual(oldCalls,[]);assert.deepEqual(newCalls,[]);assert.equal(runner.requests.length,phase==='compress'?0:1);assert.equal(runner.lateWrites(),0);if(runner.requests.length)assert.equal(runner.requests[0].signal.aborted,true);
 },{props:{onChange:values=>oldCalls.push(values)},compression:phase==='compress'?()=>wait.promise:undefined,reply:()=>({ok:true,status:200,json:()=>wait.promise})});}
});

test('an old destination failure cannot stop the spinner or replace values for a newer batch',async()=>{
 const old=deferred(),latest=deferred();await withMulti(async runner=>{
  runner.choose([file('qa-old.jpg')]);await runner.flush();await runner.setProps({ownerId:otherOwner,values:['/qa-other.jpg']});runner.choose([file('qa-new.jpg')]);await runner.flush();assert.equal(runner.requests.length,2);
  old.reject(Error('QA_PRIVATE_OLD_FAILURE'));await runner.flush();assert.doesNotMatch(text(runner.current()),/QA_PRIVATE_OLD_FAILURE/);assert.equal(nodes(runner.current(),node=>node.type==='button'&&node.props.disabled===true&&nodes(node,item=>item.type==='svg').length>0).length,1);assert.deepEqual(runner.values(),['/qa-other.jpg']);
  latest.resolve(Response.json({url:uploaded}));await runner.flush();assert.deepEqual(runner.values(),['/qa-other.jpg',uploaded]);assert.equal(runner.requests[1].body.get('id'),otherOwner);
 },{reply:(_request,requests)=>requests.length===1?old.promise:latest.promise});
});

test('a failed current batch permits an explicit retry and sends only synthetic compressed bytes to its original namespace',async()=>{
 const compressed=file('qa-derived.jpg','QA smaller bytes');await withMulti(async runner=>{
  const original=file('qa-original.jpg','QA synthetic larger original bytes for compression');runner.choose([original]);await runner.flush();assert.deepEqual(runner.values(),[first,second,third]);runner.choose([original]);await runner.flush();assert.equal(runner.requests.length,2);assert.deepEqual(runner.values(),[first,second,third,uploaded]);assert.doesNotMatch(text(runner.current()),/QA archivo rechazado/);
  for(const request of runner.requests){assert.equal(request.body.get('folder'),'gallery');assert.equal(request.body.get('id'),owner);assert.equal(request.body.get('file').name,compressed.name);assert.deepEqual(Buffer.from(await request.body.get('file').arrayBuffer()),Buffer.from(await compressed.arrayBuffer()));}
  assert.ok(runner.compressions.every(([,width,quality])=>width===1920&&quality===0.82));assert.match(text(runner.current()),/optimizada/i);
 },{compression:()=>Promise.resolve(compressed),reply:(_request,requests)=>requests.length===1?Response.json({error:'QA archivo rechazado'},{status:415}):Response.json({url:uploaded})});
});

test('compression savings accumulate only for individually confirmed images, including before a later partial failure',async()=>{
 const large=file('qa-large.jpg',new Uint8Array(1024*1024+16)),small=file('qa-small.jpg',new Uint8Array(16));
 await withMulti(async runner=>{
  runner.choose([large,large,large]);await runner.flush();assert.equal(runner.requests.length,3);assert.deepEqual(runner.values(),[first,second,third,'https://qa.invalid/one.jpg','https://qa.invalid/two.jpg']);assert.match(text(runner.current()),/ahorraste\s+2\.0\s+MB/);assert.match(text(runner.current()),/QA tercer archivo rechazado/);
 },{compression:()=>Promise.resolve(small),reply:(_request,requests)=>requests.length<3?Response.json({url:`https://qa.invalid/${requests.length===1?'one':'two'}.jpg`}):Response.json({error:'QA tercer archivo rechazado'},{status:415})});
});
