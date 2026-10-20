// Real MediaPanel and ImageUploader hooks, synthetic media and controlled fetch.
// Compression is an isolated boundary. DOM refs are not mounted; no device acceptance is claimed.
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react');let compress;
require.cache[require.resolve('../src/lib/image-compress.ts')]={exports:{compressImage:(...args)=>compress(...args)}};
const MultiImageUploader=()=>null;
require.cache[require.resolve('../src/components/admin/builder/MultiImageUploader.tsx')]={exports:{__esModule:true,default:MultiImageUploader}};
const MediaPanel=require('../src/components/admin/builder/panels/MediaPanel.tsx').default,ImageUploader=require('../src/components/admin/builder/ImageUploader.tsx').default;
const {newServiceContract}=require('../src/lib/packages.ts'),{MUSIC_LIBRARY}=require('../src/lib/music.ts');
const {File}=require('node:buffer');
const owner='30000000-0000-4000-8000-000000000001',otherOwner='30000000-0000-4000-8000-000000000002';
const originalMusic='/music/qa-original.mp3',uploadedMusic='https://qa.invalid/qa-uploaded.mp3';
const initialData=()=>({id:owner,slug:'qa-private-media',names:'QA evento ficticio',cover_image_url:'/qa-cover.jpg',gallery_url:null,config:newServiceContract({musicUrl:originalMusic,galleryImages:['/qa-first.jpg','/qa-second.jpg'],galleryCaptions:[{image:'/qa-first.jpg',title:'QA título anterior',caption:'QA pie anterior',alt:'QA alt anterior'},{image:'/qa-second.jpg',title:'QA segunda',caption:'QA pie segunda',alt:'QA alt segunda'}],workflow:{reviewStatus:'pending'},theme:{primary:'#193827'},decor:{icon:'/lottie/qa-original.json'},qualityControl:{summary:'QA no modificar'}},'premium')});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];
const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const uploaderButton=(runner,label)=>nodes(runner.current(),node=>node.type==='button'&&text(node).trim().replace(/^↑\s*/,'')===label)[0];
const caption=(runner,key,index=0)=>nodes(runner.media(),node=>node.type=== (key==='caption'?'textarea':'input')&&node.props.placeholder===({title:'Título · Nuestro primer viaje',caption:'Pie de foto · Una frase breve que cuente este momento',alt:'Descripción accesible de lo que aparece'})[key])[index];
const clone=value=>JSON.parse(JSON.stringify(value));
const file=(name='qa-original.mp3',type='audio/mpeg')=>new File(['QA fictional media bytes'],name,{type});
const observe=promise=>{const state={done:false};Promise.resolve(promise).then(()=>{state.done=true;},error=>{state.done=true;state.error=error;});return state;};
function videoEnvironment(t){
 let time=1_800_000_000_000,serial=0;const timers=new Map(),media=[],created=[],revoked=[],listeners=new Map(),oldWindow=global.window,oldDocument=global.document;
 t.mock.method(Date,'now',()=>time);t.mock.method(global,'setTimeout',(callback,delay)=>{const id=++serial;timers.set(id,{callback,at:time+delay});return id;});t.mock.method(global,'clearTimeout',id=>timers.delete(id));
 const add=AbortSignal.prototype.addEventListener,remove=AbortSignal.prototype.removeEventListener;
 t.mock.method(AbortSignal.prototype,'addEventListener',function(type,callback,options){if(type==='abort'){if(!listeners.has(this))listeners.set(this,new Set());listeners.get(this).add(callback);}return add.call(this,type,callback,options);});
 t.mock.method(AbortSignal.prototype,'removeEventListener',function(type,callback,options){if(type==='abort')listeners.get(this)?.delete(callback);return remove.call(this,type,callback,options);});
 t.mock.method(URL,'createObjectURL',value=>{const url=`blob:qa-video-${created.length+1}`;created.push({url,file:value});return url;});t.mock.method(URL,'revokeObjectURL',url=>revoked.push(url));
 global.window={setTimeout,clearTimeout};global.document={createElement:tag=>{assert.equal(tag,'video');const node={duration:12,onloadedmetadata:null,onerror:null,src:'',removed:0,loads:0,removeAttribute(name){assert.equal(name,'src');this.src='';this.removed++;},load(){this.loads++;}};media.push(node);return node;}};
 t.after(()=>{if(oldWindow===undefined)delete global.window;else global.window=oldWindow;if(oldDocument===undefined)delete global.document;else global.document=oldDocument;});
 return{timers,media,created,revoked,listeners:()=>[...listeners.values()].reduce((sum,items)=>sum+items.size,0),tick(ms){time+=ms;for(let index=0;index<100;index++){const next=[...timers].find(([,timer])=>timer.at<=time);if(!next)return;timers.delete(next[0]);next[1].callback();}assert.fail('Unexpected video timer loop');}};
}
async function withMedia(scenario,{integrated=true,data=initialData(),props={},reply,compression}={}){
 const hookNames=['useState','useRef','useEffect','useCallback'],original=Object.fromEntries(hookNames.map(name=>[name,React[name]])),oldFetch=global.fetch;
 const fibers=new Map(),requests=[],compressions=[],changes=[],patches=[],snapshots=[];let fiber,cursor=0,dirty=true,mediaTree,tree,effects=[],unmounted=false,lateWrites=0,currentData=clone(data),currentProps={ownerId:owner,folder:'music',kind:'audio',value:originalMusic,...props};
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 React.useState=initial=>{const slots=fiber.slots,index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initial==='function'?initial():initial};slot.set=next=>{if(unmounted){lateWrites++;return;}next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useRef=initial=>{const index=cursor++;return fiber.slots[index]??(fiber.slots[index]={current:initial});};
 React.useCallback=(callback,deps)=>{const slots=fiber.slots,index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:callback,deps};return slots[index].value;};
 React.useEffect=(effect,deps)=>{const slots=fiber.slots,index=cursor++,previous=slots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 compress=(...args)=>{compressions.push(args);return compression?compression(...args):Promise.resolve(args[0]);};
 global.fetch=async(url,options={})=>{const request={url,method:options.method,body:options.body,signal:options.signal};requests.push(request);return reply?reply(request,requests):Response.json({url:uploadedMusic});};
 const onChange=patch=>{patches.push(clone(patch));currentData={...currentData,...patch};dirty=true;};
 const standaloneChange=value=>{changes.push(value);currentProps={...currentProps,value};dirty=true;};
 const render=(name,Component,input)=>{fiber=fibers.get(name);if(!fiber){fiber={slots:[]};fibers.set(name,fiber);}cursor=0;return Component(input);};
 const flush=async()=>{for(let round=0;round<35;round++){if(dirty&&!unmounted){dirty=false;effects=[];if(integrated){mediaTree=render('media',MediaPanel,{data:currentData,onChange});const audio=nodes(mediaTree,node=>node.type===ImageUploader&&node.props.kind==='audio')[0];tree=render('upload',ImageUploader,audio.props);}else tree=render('upload',ImageUploader,{...currentProps,onChange:currentProps.onChange??standaloneChange});snapshots.push(tree);for(const effect of effects)effect();}await new Promise(done=>setImmediate(done));if(!dirty||unmounted)return tree;}throw Error('Media hooks did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const item of fibers.values())for(const slot of item.slots)slot?.cleanup?.();};
 const runner={current:()=>tree,media:()=>mediaTree,data:()=>currentData,props:()=>currentProps,requests,compressions,changes,patches,snapshots,flush,unmount,lateWrites:()=>lateWrites,
  choose:media=>{const input=nodes(tree,node=>node.type==='input'&&node.props.type==='file')[0];return input.props.onChange({target:{files:[media],value:media.name}});},
  setProps:async patch=>{currentProps={...currentProps,...patch};dirty=true;await flush();},setData:async patch=>{currentData={...currentData,...patch};dirty=true;await flush();},
  reorder:async next=>{nodes(mediaTree,node=>node.type===MultiImageUploader)[0].props.onChange(next);await flush();},
  showUrl:async()=>{uploaderButton(runner,'+ O pegar una URL').props.onClick();await flush();},
  setUrl:value=>nodes(tree,node=>node.type==='input'&&node.props.placeholder==='https://...')[0].props.onChange({target:{value}}),
 };
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of hookNames)React[name]=original[name];global.fetch=oldFetch;assert.ok(requests.every(request=>request.url==='/api/admin/upload'&&request.method==='POST'),'No Auth, bank, original-media download or production request is allowed');}
}

test('pending audio upload preserves newer gallery titles, captions, alt text and reorder when its ACK arrives',async()=>{
 const wait=deferred();await withMedia(async runner=>{
  const before=clone(runner.data().config);runner.choose(file());await runner.flush();assert.equal(runner.requests.length,1);
  caption(runner,'title').props.onChange({target:{value:'QA título nuevo'}});await runner.flush();caption(runner,'caption').props.onChange({target:{value:'QA pie nuevo'}});await runner.flush();caption(runner,'alt').props.onChange({target:{value:'QA alt nuevo'}});await runner.flush();
  await runner.reorder(['/qa-second.jpg','/qa-first.jpg']);const edited=clone(runner.data().config);
  wait.resolve(Response.json({url:uploadedMusic}));await runner.flush();const after=runner.data().config;
  assert.equal(after.musicUrl,uploadedMusic);assert.deepEqual(after.galleryImages,edited.galleryImages);assert.deepEqual(after.galleryCaptions,edited.galleryCaptions);assert.deepEqual(after.galleryCaptions[1],{image:'/qa-first.jpg',title:'QA título nuevo',caption:'QA pie nuevo',alt:'QA alt nuevo'});
  for(const key of ['theme','decor','qualityControl','serviceContract','features','workflow'])assert.deepEqual(after[key],before[key]);assert.equal(runner.compressions.length,0);
 },{reply:()=>wait.promise});
});

test('rerendering the same uploader tuple cannot redirect an upload ACK to another field callback and preserves original audio bytes',async()=>{
 const wait=deferred(),oldCalls=[],newCalls=[];await withMedia(async runner=>{
  const original=file();runner.choose(original);await runner.flush();assert.equal(runner.requests.length,1);const request=runner.requests[0],posted=request.body.get('file');assert.equal(request.body.get('folder'),'music');assert.equal(request.body.get('id'),owner);assert.equal(posted.name,original.name);assert.equal(posted.type,original.type);assert.deepEqual(Buffer.from(await posted.arrayBuffer()),Buffer.from(await original.arrayBuffer()));assert.equal(runner.compressions.length,0);
  await runner.setProps({onChange:value=>newCalls.push(value)});wait.resolve(Response.json({url:uploadedMusic}));await runner.flush();assert.deepEqual(oldCalls,[uploadedMusic]);assert.deepEqual(newCalls,[]);assert.equal(runner.requests.length,1);assert.equal(runner.lateWrites(),0);
 },{integrated:false,props:{onChange:value=>oldCalls.push(value)},reply:()=>wait.promise});
});

test('removing the audio or entering a manual URL supersedes an in-flight upload even if its transport ignores abort',async()=>{
 for(const intent of ['remove','url']){
  const wait=deferred();await withMedia(async runner=>{
   runner.choose(file());await runner.flush();const signal=runner.requests[0].signal;
   if(intent==='remove')uploaderButton(runner,'Quitar').props.onClick();else{await runner.showUrl();runner.setUrl('https://qa.invalid/explicit-new.mp3');}await runner.flush();
   const expected=intent==='remove'?undefined:'https://qa.invalid/explicit-new.mp3';assert.equal(runner.data().config.musicUrl,expected);const retained=clone(runner.data().config);
   wait.resolve(Response.json({url:uploadedMusic}));await runner.flush();assert.equal(runner.data().config.musicUrl,expected);assert.deepEqual(runner.data().config.galleryCaptions,retained.galleryCaptions);assert.ok(signal instanceof AbortSignal);assert.equal(signal.aborted,true);assert.equal(runner.requests.length,1);
  },{reply:()=>wait.promise});
 }
});

test('selecting original library music while upload is pending keeps that exact library asset after the old ACK',async()=>{
 const wait=deferred();await withMedia(async runner=>{
  runner.choose(file());await runner.flush();const track=MUSIC_LIBRARY[0],choice=nodes(runner.media(),node=>node.type==='button'&&text(node).trim()===track.label)[0];assert.ok(choice);choice.props.onClick();await runner.flush();assert.equal(runner.data().config.musicUrl,track.url);const afterSelection=clone(runner.data().config);
  wait.resolve(Response.json({url:uploadedMusic}));await runner.flush();assert.equal(runner.data().config.musicUrl,track.url);assert.deepEqual(runner.data().config,afterSelection);assert.equal(runner.requests[0].signal.aborted,true);
 },{reply:()=>wait.promise});
});

test('a library selection made immediately before the upload ACK survives without waiting for a React rerender',async()=>{
 for(const returned of [false,true]){const wait=deferred();await withMedia(async runner=>{
  runner.choose(file());await runner.flush();const track=MUSIC_LIBRARY[0],choice=nodes(runner.media(),node=>node.type==='button'&&text(node).trim()===track.label)[0],setMusic=nodes(runner.media(),node=>node.type===ImageUploader&&node.props.kind==='audio')[0].props.onChange;choice.props.onClick();if(returned)setMusic(originalMusic);
  const expected=returned?originalMusic:track.url;assert.equal(runner.data().config.musicUrl,expected);
  wait.resolve(Response.json({url:uploadedMusic}));await runner.flush();assert.equal(runner.data().config.musicUrl,expected);assert.equal(runner.requests.length,1);assert.equal(runner.compressions.length,0);
 },{reply:()=>wait.promise});}
});

test('retained gallery callbacks merge title, caption, alt and reordering in the same event turn',async()=>{
 const wait=deferred();await withMedia(async runner=>{
  runner.choose(file());await runner.flush();const title=caption(runner,'title').props.onChange,pie=caption(runner,'caption').props.onChange,alt=caption(runner,'alt').props.onChange,reorder=nodes(runner.media(),node=>node.type===MultiImageUploader)[0].props.onChange;
  title({target:{value:'QA título mismo turno'}});pie({target:{value:'QA pie mismo turno'}});alt({target:{value:'QA alt mismo turno'}});reorder(['/qa-second.jpg','/qa-first.jpg']);
  wait.resolve(Response.json({url:uploadedMusic}));await runner.flush();assert.deepEqual(runner.data().config.galleryImages,['/qa-second.jpg','/qa-first.jpg']);assert.deepEqual(runner.data().config.galleryCaptions[1],{image:'/qa-first.jpg',title:'QA título mismo turno',caption:'QA pie mismo turno',alt:'QA alt mismo turno'});assert.equal(runner.data().config.musicUrl,uploadedMusic);
 },{reply:()=>wait.promise});
});

test('a second selected file wins when two upload responses arrive in reverse order',async()=>{
 const first=deferred(),second=deferred();await withMedia(async runner=>{
  runner.choose(file('qa-first.mp3'));await runner.flush();runner.choose(file('qa-second.mp3'));await runner.flush();assert.equal(runner.requests.length,2);assert.equal(runner.requests[0].body.get('file').name,'qa-first.mp3');assert.equal(runner.requests[1].body.get('file').name,'qa-second.mp3');
  second.resolve(Response.json({url:'https://qa.invalid/second.mp3'}));await runner.flush();first.resolve(Response.json({url:'https://qa.invalid/first.mp3'}));await runner.flush();assert.deepEqual(runner.changes,['https://qa.invalid/second.mp3']);assert.equal(runner.requests[0].signal.aborted,true);assert.equal(runner.compressions.length,0);
 },{integrated:false,reply:(_request,requests)=>requests.length===1?first.promise:second.promise});
});

test('a superseded upload failure cannot hide a newer pending upload or display its old error',async()=>{
 const first=deferred(),second=deferred();await withMedia(async runner=>{
  runner.choose(file('qa-first.mp3'));await runner.flush();runner.choose(file('qa-second.mp3'));await runner.flush();first.reject(Error('QA_PRIVATE_OLD_FAILURE'));await runner.flush();assert.ok(uploaderButton(runner,'Reemplazar audio').props.disabled);assert.doesNotMatch(text(runner.current()),/QA_PRIVATE_OLD_FAILURE|Error al subir/);assert.deepEqual(runner.changes,[]);
  second.resolve(Response.json({url:'https://qa.invalid/second.mp3'}));await runner.flush();assert.deepEqual(runner.changes,['https://qa.invalid/second.mp3']);assert.equal(uploaderButton(runner,'Reemplazar audio').props.disabled,false);
 },{integrated:false,props:{compact:true},reply:(_request,requests)=>requests.length===1?first.promise:second.promise});
});

test('owner, folder, kind and externally changed media values invalidate a pending upload without applying it elsewhere',async()=>{
 const replacements=[{ownerId:otherOwner},{folder:'another-music-folder'},{kind:'image'},{value:'https://qa.invalid/external-change.mp3'}];
 for(const replacement of replacements){const wait=deferred();await withMedia(async runner=>{
  runner.choose(file());await runner.flush();await runner.setProps(replacement);wait.resolve(Response.json({url:uploadedMusic}));await runner.flush();assert.deepEqual(runner.changes,[]);assert.equal(runner.requests.length,1);assert.equal(runner.requests[0].signal.aborted,true);assert.doesNotMatch(text(runner.current()),/Error al subir/);
 },{integrated:false,reply:()=>wait.promise});}
});

test('switching owner or media value away and back cannot revive an earlier upload intent',async()=>{
 for(const field of ['ownerId','value']){const wait=deferred();await withMedia(async runner=>{
  runner.choose(file());await runner.flush();await runner.setProps({[field]:field==='ownerId'?otherOwner:'https://qa.invalid/intermediate.mp3'});await runner.setProps({[field]:field==='ownerId'?owner:originalMusic});
  wait.resolve(Response.json({url:uploadedMusic}));await runner.flush();assert.deepEqual(runner.changes,[]);assert.equal(runner.requests[0].signal.aborted,true);
 },{integrated:false,reply:()=>wait.promise});}
});

test('changing a restrictive upload limit invalidates an earlier request rather than publishing its outdated acceptance',async()=>{
 for(const limits of [{maxBytes:1},{maxDurationSeconds:1}]){const wait=deferred();await withMedia(async runner=>{
  runner.choose(file());await runner.flush();await runner.setProps(limits);wait.resolve(Response.json({url:uploadedMusic}));await runner.flush();assert.deepEqual(runner.changes,[]);assert.equal(runner.requests[0].signal.aborted,true);
 },{integrated:false,reply:()=>wait.promise});}
});

test('an old MediaPanel callback applies a config patch to the current gallery but never to another invitation',async()=>{
 await withMedia(async runner=>{
  const retained=nodes(runner.media(),node=>node.type===ImageUploader&&node.props.kind==='audio')[0].props.onChange;
  caption(runner,'title').props.onChange({target:{value:'QA conservar título actual'}});await runner.flush();const currentGallery=clone(runner.data().config.galleryCaptions);retained('https://qa.invalid/retained-callback.mp3');await runner.flush();assert.deepEqual(runner.data().config.galleryCaptions,currentGallery);
  await runner.setData({id:otherOwner,names:'QA otro evento',config:newServiceContract({musicUrl:'/qa-other-original.mp3'},'premium')});const next=runner.data(),patchCount=runner.patches.length;retained('https://qa.invalid/wrong-owner.mp3');await runner.flush();assert.equal(runner.data(),next);assert.equal(runner.patches.length,patchCount);
 });
});

test('leaving while compression, upload transport or response JSON is pending prevents stale callbacks and state writes',async()=>{
 for(const phase of ['compress','transport','json']){
  const wait=deferred();let bodyReads=0;await withMedia(async runner=>{
   runner.choose(file(phase==='compress'?'qa-image.png':'qa-audio.mp3',phase==='compress'?'image/png':'audio/mpeg'));await runner.flush();runner.unmount();
   if(phase==='compress')wait.resolve(file('qa-image.png','image/png'));else if(phase==='transport')wait.resolve({ok:true,status:200,json:async()=>{bodyReads++;return{url:uploadedMusic};}});else wait.resolve({url:uploadedMusic});await runner.flush();
   assert.deepEqual(runner.changes,[]);assert.equal(runner.lateWrites(),0);assert.equal(runner.requests.length,phase==='compress'?0:1);assert.equal(bodyReads,phase==='json'?1:0);if(runner.requests.length)assert.equal(runner.requests[0].signal.aborted,true);
  },{integrated:false,props:{kind:phase==='compress'?'image':'audio'},compression:phase==='compress'?()=>wait.promise:undefined,reply:()=>phase==='transport'?wait.promise:{ok:true,status:200,json:()=>{bodyReads++;return wait.promise;}}});
 }
});

test('invalid JSON, malformed success and HTTP rejection preserve current music and expose no invented upload success',async()=>{
 const failures=[
  ()=>new Response('{truncated'),
  ()=>Response.json(null),()=>Response.json({}),()=>Response.json({url:42}),()=>Response.json({url:''}),()=>Response.json({url:'   '}),()=>Response.json({url:[]}),
  ...['http://','https://','javascript:alert(1)'].map(url=>()=>Response.json({url})),
  ()=>Response.json({url:uploadedMusic,error:'QA archivo rechazado'},{status:415}),
 ];
 for(const reply of failures)await withMedia(async runner=>{
  runner.choose(file());await runner.flush();assert.deepEqual(runner.changes,[]);assert.equal(runner.props().value,originalMusic);assert.equal(runner.requests.length,1);assert.equal(uploaderButton(runner,'Reemplazar audio').props.disabled,false);assert.doesNotMatch(text(runner.current()),/Optimizada:|Animación lista:/);assert.match(text(runner.current()),/respuesta|archivo|subir|verificar|válida|URL|inesperad|incomplet|Error|JSON/i);
 },{integrated:false,props:{compact:true},reply});
});

test('a current rejected upload can be explicitly retried once without replacing or compressing original audio',async()=>{
 await withMedia(async runner=>{
  const original=file();runner.choose(original);await runner.flush();assert.deepEqual(runner.changes,[]);assert.match(text(runner.current()),/QA archivo rechazado/);runner.choose(original);await runner.flush();assert.equal(runner.requests.length,2);assert.deepEqual(runner.changes,[uploadedMusic]);assert.equal(runner.compressions.length,0);assert.doesNotMatch(text(runner.current()),/QA archivo rechazado/);
 },{integrated:false,props:{compact:true},reply:(_request,requests)=>requests.length===1?Response.json({error:'QA archivo rechazado'},{status:415}):Response.json({url:uploadedMusic})});
});

test('valid video metadata releases its object URL, abort listener and timer before uploading the original bytes',async t=>{
 const env=videoEnvironment(t);await withMedia(async runner=>{
  const original=file('qa-original.mp4','video/mp4');runner.choose(original);await runner.flush();assert.equal(env.media.length,1);assert.equal(runner.requests.length,0);assert.equal(env.timers.size,1);assert.equal(env.listeners(),1);
  env.media[0].duration=12;env.media[0].onloadedmetadata();await runner.flush();assert.equal(runner.requests.length,1);assert.deepEqual(runner.changes,[uploadedMusic]);assert.equal(runner.compressions.length,0);assert.deepEqual(env.revoked,[env.created[0].url]);assert.equal(env.media[0].onloadedmetadata,null);assert.equal(env.media[0].onerror,null);assert.equal(env.media[0].loads,1);assert.equal(env.timers.size,0);assert.equal(env.listeners(),0);assert.deepEqual(Buffer.from(await runner.requests[0].body.get('file').arrayBuffer()),Buffer.from(await original.arrayBuffer()));
 },{integrated:false,props:{kind:'video',value:'https://qa.invalid/original.mp4'}});
});

test('a newer video selection cancels older metadata work and only the current video can upload',async t=>{
 const env=videoEnvironment(t);await withMedia(async runner=>{
  runner.choose(file('qa-first.mp4','video/mp4'));await runner.flush();runner.choose(file('qa-second.webm','video/webm'));await runner.flush();assert.equal(env.media.length,2);assert.equal(env.media[0].onloadedmetadata,null);assert.equal(env.media[0].onerror,null);assert.deepEqual(env.revoked,[env.created[0].url]);assert.equal(env.timers.size,1);assert.equal(env.listeners(),1);assert.equal(runner.requests.length,0);
  env.media[1].duration=8;env.media[1].onloadedmetadata();await runner.flush();assert.equal(runner.requests.length,1);assert.equal(runner.requests[0].body.get('file').name,'qa-second.webm');assert.deepEqual(runner.changes,[uploadedMusic]);assert.deepEqual(env.revoked,env.created.map(value=>value.url));assert.equal(env.timers.size,0);assert.equal(env.listeners(),0);
 },{integrated:false,props:{kind:'video',value:'https://qa.invalid/original.mp4'}});
});

test('unmount during video metadata validation releases browser resources immediately without uploading or late updates',async t=>{
 const env=videoEnvironment(t);await withMedia(async runner=>{
  runner.choose(file('qa-waiting.mp4','video/mp4'));await runner.flush();assert.equal(env.timers.size,1);runner.unmount();await runner.flush();assert.equal(runner.requests.length,0);assert.deepEqual(runner.changes,[]);assert.equal(runner.lateWrites(),0);assert.equal(env.media[0].onloadedmetadata,null);assert.equal(env.media[0].onerror,null);assert.deepEqual(env.revoked,[env.created[0].url]);assert.equal(env.timers.size,0);assert.equal(env.listeners(),0);env.tick(20000);await runner.flush();assert.equal(runner.lateWrites(),0);
 },{integrated:false,props:{kind:'video',value:'https://qa.invalid/original.mp4'}});
});

test('video duration timeout, invalid duration and decoding errors release resources and do not upload rejected files',async t=>{
 const env=videoEnvironment(t);for(const mode of ['timeout','nonfinite','too-long','decode'])await withMedia(async runner=>{
  const index=env.media.length;runner.choose(file(`qa-${mode}.mp4`,'video/mp4'));await runner.flush();const media=env.media[index];
  if(mode==='timeout')env.tick(10000);else if(mode==='decode')media.onerror();else{media.duration=mode==='nonfinite'?NaN:61;media.onloadedmetadata();}await runner.flush();
  assert.equal(runner.requests.length,0);assert.deepEqual(runner.changes,[]);assert.equal(env.timers.size,0);assert.equal(env.listeners(),0);assert.equal(media.onloadedmetadata,null);assert.equal(media.onerror,null);assert.equal(media.loads,1);assert.equal(env.revoked.filter(value=>value===env.created[index].url).length,1);assert.match(text(runner.current()),/duración|máximo|reproducir/);
 },{integrated:false,props:{kind:'video',value:'https://qa.invalid/original.mp4',compact:true}});
});
