// Real upload handlers, NextRequest and multipart FormData with isolated authorization/storage.
// The actor/ownership boundaries are controlled; this does not simulate Google/Auth or use real storage.
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},fileName:file}).outputText,file);
const {NextRequest}=require('next/server'),{File}=require('node:buffer'),{sanitizeSvg}=require('../src/lib/sanitize-svg.ts');
const source=file=>path.join(root,'src',file),replace=(file,exports)=>{require.cache[require.resolve(file)]={exports};};
const partnerId='20000000-0000-4000-8000-000000000001',own='30000000-0000-4000-8000-0000000000ab',foreign='30000000-0000-4000-8000-0000000000cd';
const routeFile=source('app/api/admin/upload/route.ts');let live;
replace(source('lib/builder-access.ts'),{builderActor:async()=>{live.actorCalls++;live.events.push('actor');return live.actor;}});
replace(source('lib/partner-session.ts'),{partnerOwnsInvitation:async(partner,invitation)=>{live.ownership.push({partner,invitation});live.events.push('ownership');if(live.ownershipError)throw Error('QA_PRIVATE_OWNERSHIP_FAILURE');return live.owns(partner,invitation);}});
replace(source('lib/supabase/server.ts'),{supabaseAdmin:{from:()=>assert.fail('Upload authorization must use the dedicated ownership boundary'),storage:{
 async getBucket(bucket){live.storage.push({operation:'getBucket',bucket});live.events.push('getBucket');return{data:live.bucketExists?{name:bucket}:null};},
 async createBucket(bucket,options){live.storage.push({operation:'createBucket',bucket,options});live.events.push('createBucket');return{data:{name:bucket},error:null};},
 from(bucket){live.storage.push({operation:'from',bucket});return{
  async upload(destination,bytes,options){live.events.push('upload');live.uploads.push({bucket,path:destination,bytes:Buffer.from(bytes),options});if(live.uploadError)return{data:null,error:{message:'QA upload rejected'}};return{data:{path:destination},error:null};},
  getPublicUrl(destination){live.events.push('getPublicUrl');live.urls.push(destination);return{data:{publicUrl:`https://qa.invalid/storage/v1/object/public/${bucket}/${destination}`}};},
  async remove(paths){live.events.push('remove');live.removed.push({bucket,paths});return{data:paths,error:null};},
 };},
}}});
global.fetch=async()=>assert.fail('No Supabase/Auth/bank/media network is permitted in upload access tests');
function harness({role='partner',owns=(partner,invitation)=>partner===partnerId&&invitation===own,ownershipError=false,bucketExists=true,uploadError=false}={}){
 live={actor:role==='admin'?{kind:'admin'}:role==='partner'?{kind:'partner',partnerId}:null,actorCalls:0,events:[],ownership:[],owns,ownershipError,bucketExists,uploadError,storage:[],uploads:[],urls:[],removed:[],formReads:0};
 delete require.cache[require.resolve(routeFile)];const route=require(routeFile);return{route,state:live};
}
const media=(name='qa-fixture.png',type='image/png',bytes=Buffer.from([0,1,2,3,255,128]))=>new File([bytes],name,{type});
function postRequest(options={}){
 const {folder='covers',file=media(),headers={}}=options,owner=Object.hasOwn(options,'owner')?options.owner:own;
 const form=new FormData();if(file!==undefined)form.append('file',file);if(owner!==undefined)form.append('id',owner);if(folder!==undefined)form.append('folder',folder);
 const request=new NextRequest('https://qa.invalid/api/admin/upload',{method:'POST',body:form,headers});const parse=request.formData.bind(request);request.formData=async()=>{live.formReads++;return parse();};return request;
}
const deleteRequest=value=>new NextRequest('https://qa.invalid/api/admin/upload'+(value===undefined?'':'?'+new URLSearchParams({path:value})));
const noStorage=state=>{assert.deepEqual(state.storage,[]);assert.deepEqual(state.uploads,[]);assert.deepEqual(state.urls,[]);assert.deepEqual(state.removed,[]);};
const authorizationBeforeStorage=state=>{assert.ok(state.events.indexOf('ownership')>state.events.indexOf('actor'));const storageIndex=state.events.findIndex(value=>['getBucket','createBucket','upload','getPublicUrl','remove'].includes(value));assert.ok(storageIndex>state.events.indexOf('ownership'));};
const bufferEquals=(left,right)=>assert.deepEqual(Buffer.from(left),Buffer.from(right));

test('a rejected actor, including invalid-admin and suspended-partner contracts, never parses the form or touches storage',async()=>{
 for(const role of ['anonymous','invalid-admin','suspended-partner']){
  const {route,state}=harness({role}),response=await route.POST(postRequest({headers:{cookie:role==='invalid-admin'?'enkarta-admin=QA-INVALID':''}}));assert.equal(response.status,401);assert.deepEqual(await response.json(),{error:'No autorizado'});assert.equal(state.actorCalls,1);assert.equal(state.formReads,0);assert.deepEqual(state.ownership,[]);noStorage(state);
 }
});

test('a partner can upload only under its exact owned canonical invitation UUID with the original bytes',async()=>{
 const {route,state}=harness({bucketExists:false}),original=media('QA Foto Ácida.PNG','image/png'),response=await route.POST(postRequest({file:original}));assert.equal(response.status,200);const value=await response.json();
 assert.deepEqual(state.ownership,[{partner:partnerId,invitation:own}]);authorizationBeforeStorage(state);assert.equal(state.uploads.length,1);assert.equal(state.uploads[0].path.split('/')[1],own);assert.match(state.uploads[0].path,new RegExp(`^covers/${own}/\\d+-qa-foto-acida\\.png$`));assert.equal(value.path,state.uploads[0].path);assert.equal(value.url,`https://qa.invalid/storage/v1/object/public/invitations/${value.path}`);assert.equal(value.bytes,original.size);assert.equal(value.contentType,'image/png');bufferEquals(state.uploads[0].bytes,await original.arrayBuffer());assert.deepEqual(state.uploads[0].options,{contentType:'image/png',cacheControl:'31536000',upsert:false});assert.deepEqual(state.storage.find(value=>value.operation==='createBucket').options,{public:true,fileSizeLimit:15*1024*1024});
});

test('a known foreign invitation is forbidden before bucket lookup, creation or any object write',async()=>{
 const {route,state}=harness({bucketExists:false}),response=await route.POST(postRequest({owner:foreign}));assert.equal(response.status,403);assert.deepEqual(await response.json(),{error:'No autorizado'});assert.deepEqual(state.ownership,[{partner:partnerId,invitation:foreign}]);noStorage(state);
});

test('missing, shared, blank, malformed, uppercase and path-normalization aliases cannot impersonate an owned invitation',async()=>{
 const invalid=[undefined,'','shared','not-a-uuid',own.toUpperCase(),` ${own}`,`${own} `,`${own}\n`,`${own}/`,`${own}/../${foreign}`,`${own}\\`,`covers/${own}`,own.replaceAll('-',''),`{${own}}`,`${own}?owner=${foreign}`];
 for(const owner of invalid){const {route,state}=harness(),response=await route.POST(postRequest({owner}));assert.equal(response.status,403,JSON.stringify(owner));assert.deepEqual(await response.json(),{error:'No autorizado'});assert.deepEqual(state.ownership,[]);noStorage(state);}
});

test('a multipart File used as the owner value is rejected rather than coerced into a storage path',async()=>{
 const {route,state}=harness(),response=await route.POST(postRequest({owner:media(own,'text/plain')}));assert.equal(response.status,403);assert.deepEqual(await response.json(),{error:'No autorizado'});assert.deepEqual(state.ownership,[]);noStorage(state);
});

test('ownership denial or lookup failure can never fall through to the public bucket and lookup failure exposes no private error',async()=>{
 for(const ownershipError of [false,true]){const {route,state}=harness({owns:()=>false,ownershipError}),response=await route.POST(postRequest());assert.equal(response.status,ownershipError?503:403);const body=await response.json();assert.doesNotMatch(JSON.stringify(body),/QA_PRIVATE|SQL|supabase|service_role/);assert.deepEqual(state.ownership,[{partner:partnerId,invitation:own}]);noStorage(state);}
});

test('upload to the canonical owner is rechecked per request instead of reusing earlier authorization',async()=>{
 let granted=true;const {route,state}=harness({owns:()=>granted});assert.equal((await route.POST(postRequest())).status,200);const storageCount=state.storage.length,uploadCount=state.uploads.length;granted=false;assert.equal((await route.POST(postRequest())).status,403);assert.equal(state.ownership.length,2);assert.equal(state.storage.length,storageCount);assert.equal(state.uploads.length,uploadCount);
});

test('the team admin retains shared and legacy owner namespace behavior without a partner ownership query',async()=>{
 for(const owner of [undefined,'shared','legacy-client-001']){const {route,state}=harness({role:'admin'}),response=await route.POST(postRequest({owner,folder:'gallery'}));assert.equal(response.status,200);const value=await response.json();assert.equal(value.path.split('/')[0],'gallery');assert.equal(value.path.split('/')[1],owner??'shared');assert.deepEqual(state.ownership,[]);assert.equal(state.uploads.length,1);}
});

test('missing or text-valued file fields are rejected with no storage access after permission checks',async()=>{
 for(const file of [undefined,'QA not a file']){const {route,state}=harness();const form=new FormData();form.set('id',own);form.set('folder','covers');if(file!==undefined)form.set('file',file);const response=await route.POST(new NextRequest('https://qa.invalid/api/admin/upload',{method:'POST',body:form}));assert.equal(response.status,400);noStorage(state);}
});

test('unsupported MIME types and oversized image, audio, video and SVG files keep their previous rejection limits',async()=>{
 const cases=[['qa.exe','application/octet-stream',1,415],['qa.txt','text/plain',1,415],['qa.png','image/png',8*1024*1024+1,413],['qa.mp3','audio/mpeg',15*1024*1024+1,413],['qa.mp4','video/mp4',15*1024*1024+1,413],['qa.svg','image/svg+xml',1024*1024+1,413]];
 for(const[name,type,size,status]of cases){const {route,state}=harness(),response=await route.POST(postRequest({file:media(name,type,Buffer.alloc(size,7))}));assert.equal(response.status,status,`${type}:${size}`);assert.deepEqual(state.ownership,[{partner:partnerId,invitation:own}]);noStorage(state);}
});

test('the exact image, audio and video size limits remain accepted without recompression or byte rewriting',async()=>{
 for(const[type,name,size]of [['image/png','qa-image.png',8*1024*1024],['audio/mpeg','qa-audio.mp3',15*1024*1024],['video/mp4','qa-video.mp4',15*1024*1024]]){
  const bytes=Buffer.alloc(size,31);bytes[0]=0;bytes[size-1]=255;const {route,state}=harness(),response=await route.POST(postRequest({file:media(name,type,bytes)}));assert.equal(response.status,200);assert.equal((await response.json()).bytes,size);assert.equal(state.uploads.length,1);bufferEquals(state.uploads[0].bytes,bytes);
 }
});

test('all currently allowed audio/image/video MIME variants retain identical uploaded bytes and content type',async()=>{
 const types=['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/aac','audio/x-m4a','audio/mp4','image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm'];
 for(const type of types){const bytes=Buffer.from([1,2,3,0,128,255]),{route,state}=harness(),response=await route.POST(postRequest({file:media('qa-original.bin',type,bytes)}));assert.equal(response.status,200,type);bufferEquals(state.uploads[0].bytes,bytes);assert.equal(state.uploads[0].options.contentType,type);assert.equal((await response.json()).contentType,type);}
});

test('new SVG uploads keep the existing sanitizer contract while audio and original archive resources are untouched',async()=>{
 const input='<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><foreignObject>QA</foreignObject><path d="M0 0L1 1" fill="#123456"/><a href="javascript:alert(3)">QA</a></svg>',{route,state}=harness();
 const response=await route.POST(postRequest({file:media('qa-icon.svg','image/svg+xml',Buffer.from(input))}));assert.equal(response.status,200);assert.equal(state.uploads.length,1);bufferEquals(state.uploads[0].bytes,Buffer.from(sanitizeSvg(input)));assert.doesNotMatch(state.uploads[0].bytes.toString(),/script|foreignObject|onload|javascript/);assert.match(state.uploads[0].bytes.toString(),/fill="#123456"/);assert.equal((await response.json()).bytes,Buffer.byteLength(sanitizeSvg(input)));
});

test('invalid SVG and storage rejection never produce a false public upload success',async()=>{
 let active=harness();let response=await active.route.POST(postRequest({file:media('qa-invalid.svg','image/svg+xml',Buffer.from('not an SVG'))}));assert.equal(response.status,400);assert.equal(active.state.uploads.length,0);assert.deepEqual(active.state.urls,[]);
 active=harness({uploadError:true});response=await active.route.POST(postRequest());assert.equal(response.status,500);assert.equal(active.state.uploads.length,1);assert.deepEqual(active.state.urls,[]);assert.equal((await response.json()).url,undefined);
});

test('DELETE permits only the partner own object namespace and keeps denied actors and foreign/shared paths away from storage',async()=>{
 for(const[role,destination,status]of [['partner',`covers/${own}/qa.png`,200],['partner',`covers/${foreign}/qa.png`,403],['partner','covers/shared/qa.png',403],['anonymous',`covers/${own}/qa.png`,401],['invalid-admin',`covers/${own}/qa.png`,401],['suspended-partner',`covers/${own}/qa.png`,401]]){
  const {route,state}=harness({role}),response=await route.DELETE(deleteRequest(destination));assert.equal(response.status,status);if(status===200){assert.deepEqual(await response.json(),{success:true});assert.deepEqual(state.removed,[{bucket:'invitations',paths:[destination]}]);assert.deepEqual(state.ownership,[{partner:partnerId,invitation:own}]);authorizationBeforeStorage(state);}else noStorage(state);
 }
});

test('DELETE missing path or failed ownership lookup remains fail-closed and admin shared removal stays compatible',async()=>{
 let active=harness();let response=await active.route.DELETE(deleteRequest());assert.equal(response.status,400);noStorage(active.state);assert.deepEqual(active.state.ownership,[]);
 active=harness({ownershipError:true});response=await active.route.DELETE(deleteRequest(`covers/${own}/qa.png`));assert.equal(response.status,500);noStorage(active.state);
 active=harness({role:'admin'});response=await active.route.DELETE(deleteRequest('gallery/shared/qa-admin-file.png'));assert.equal(response.status,200);assert.deepEqual(active.state.ownership,[]);assert.deepEqual(active.state.removed,[{bucket:'invitations',paths:['gallery/shared/qa-admin-file.png']}]);
});
