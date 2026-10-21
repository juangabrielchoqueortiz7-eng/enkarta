// Real ServiceAccessPanel/AccessForm, isolated React hooks and fictional transport in RAM.
// No network, authentication, password storage or banking. Normal CI does not require Git.
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),relative='src/components/admin/builder/panels/ServiceAccessPanel.tsx',filename=path.join(root,relative),originalResolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return originalResolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
const transpile=(source,file)=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText;
require.extensions['.ts']=require.extensions['.tsx']=(mod,file)=>mod._compile(transpile(fs.readFileSync(file,'utf8'),file),file);
const option=process.argv.find(argument=>argument.startsWith('--baseline-ref=')),optionIndex=process.argv.indexOf('--baseline-ref');
const baseline=option?option.slice('--baseline-ref='.length):optionIndex>=0?process.argv[optionIndex+1]:null;
if(optionIndex>=0&&!baseline)throw Error('The baseline argument requires a complete Git SHA');
if(baseline&&!/^[a-f0-9]{40}$/i.test(baseline))throw Error('A baseline must be a complete Git SHA');
const source=baseline?require('node:child_process').execFileSync('git',['-c','core.fsmonitor=false','show',baseline+':'+relative],{cwd:root,encoding:'utf8'}):fs.readFileSync(filename,'utf8');
const compiled=new Module(filename,module);compiled.filename=filename;compiled.paths=Module._nodeModulePaths(path.dirname(filename));compiled._compile(transpile(source+'\nexport { AccessForm };',filename),filename);
const {default:ServiceAccessPanel,AccessForm}=compiled.exports,React=require('react'),{newServiceContract}=require('../src/lib/packages.ts');
const IDS=['30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002'];
const scopes=['review','host','door'],config=newServiceContract({},'exclusive');
const deferred=()=>{let resolve,reject;const promise=new Promise((done,fail)=>{resolve=done;reject=fail;});return{promise,resolve,reject};};
const response=(body={ok:true},status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];
const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
const edit=(control,value)=>{assert.ok(control,'Expected a real rendered input');control.props.onChange({target:{value}});};
const secretEqual=(actual,expected)=>assert.ok(actual===expected,'The secret in RAM must equal the expected revision (values intentionally omitted)');

async function withAccess(scenario,{scope='host',panel=false,metadata,post,get,id=IDS[0]}={}){
 const hooks=['useState','useRef','useEffect','useLayoutEffect','useMemo','useCallback','useId'],original=Object.fromEntries(hooks.map(name=>[name,React[name]])),oldFetch=global.fetch,oldWindow=global.window;
 const oldStorage=Object.fromEntries(['localStorage','sessionStorage'].map(name=>[name,Object.getOwnPropertyDescriptor(global,name)]));
 const calls=[],forbidden=[],storageAttempts=[],fibers=new Map(),secrets=[crypto.randomBytes(20).toString('hex'),crypto.randomBytes(20).toString('hex')];
 let fiber,cursor=0,tree,dirty=true,effects=[],stopped=false,lateWrites=0,input={id,scope,operational:scope==='host',config};
 const cleanup=owner=>{owner.active=false;for(const slot of owner.slots)slot?.cleanup?.();};
 React.useState=initial=>{const owner=fiber,index=cursor++;if(!(index in owner.slots)){const slot=owner.slots[index]={value:typeof initial==='function'?initial():initial};slot.set=next=>{if(stopped||!owner.active){lateWrites++;return;}next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[owner.slots[index].value,owner.slots[index].set];};
 React.useRef=initial=>{const index=cursor++;return fiber.slots[index]??(fiber.slots[index]={current:initial});};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!fiber.slots[index]||!same(fiber.slots[index].deps,deps))fiber.slots[index]={value:compute(),deps};return fiber.slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useId=()=>{const index=cursor++;return fiber.slots[index]??(fiber.slots[index]='qa-'+fiber.key.replace(/\W/g,'-')+'-'+index);};
 React.useEffect=React.useLayoutEffect=(effect,deps)=>{const index=cursor++,previous=fiber.slots[index];if(!previous||!same(previous.deps,deps)){const owner=fiber,slot={deps,cleanup:previous?.cleanup};fiber.slots[index]=slot;effects.push(()=>{if(!owner.active)return;slot.cleanup?.();slot.cleanup=effect();});}};
 const storage={getItem(){return null;},setItem(){storageAttempts.push('setItem');},removeItem(){storageAttempts.push('removeItem');},clear(){storageAttempts.push('clear');}};
 for(const name of ['localStorage','sessionStorage'])Object.defineProperty(global,name,{configurable:true,value:storage});
 global.window={location:{origin:'https://example.invalid'},localStorage:storage,sessionStorage:storage};
 global.fetch=async(url,options={})=>{
  const call={url:String(url),method:options.method??'GET',body:null};calls.push(call);
  const deny=reason=>{forbidden.push({url:call.url,method:call.method,reason});throw Error('Fictional access transport rejected: '+reason);};
  if(call.method==='GET'){
   let parsed;try{parsed=new URL(call.url,'https://example.invalid');}catch{return deny('invalid URL');}
   if(parsed.origin!=='https://example.invalid'||parsed.pathname!=='/api/admin/host-credentials'||!IDS.includes(parsed.searchParams.get('id'))||!scopes.includes(parsed.searchParams.get('scope'))||[...parsed.searchParams.keys()].some(key=>!['id','scope'].includes(key)))return deny('unexpected GET');
   call.id=parsed.searchParams.get('id');call.scope=parsed.searchParams.get('scope');
   if(get)return get(call,calls);
   return response(typeof metadata==='function'?metadata(call):metadata??{email:'qa-'+call.scope+'@example.invalid',hasPassword:true,rsvpDeadline:call.scope==='host'?'2029-09-20':''});
  }
  if(call.method!=='POST'||call.url!=='/api/admin/host-credentials')return deny('unexpected write');
  try{call.body=JSON.parse(options.body);}catch{return deny('invalid JSON');}
  if(!call.body||!IDS.includes(call.body.id)||!scopes.includes(call.body.scope)||typeof call.body.email!=='string'||Object.keys(call.body).some(key=>!['id','scope','email','password','rsvpDeadline'].includes(key))||('password'in call.body&&typeof call.body.password!=='string')||('rsvpDeadline'in call.body&&(call.body.scope!=='host'||typeof call.body.rsvpDeadline!=='string')))return deny('unexpected access payload');
  call.id=call.body.id;call.scope=call.body.scope;
  return post?post(call,calls):response();
 };
 const expand=(value,key)=>{
  if(Array.isArray(value))return value.map((child,index)=>expand(child,key+'/'+(child?.key??index)));
  if(!React.isValidElement(value))return value;
  if(value.type===React.Fragment)return React.createElement(React.Fragment,{key:value.key??key},expand(value.props.children,key+'/fragment'));
  if(typeof value.type==='function'){
   const previousFiber=fiber,previousCursor=cursor;let owner=fibers.get(key);
   if(!owner||owner.type!==value.type||!owner.active){if(owner?.active)cleanup(owner);owner={key,type:value.type,slots:[],active:true};fibers.set(key,owner);}
   owner.used=true;owner.props=value.props;fiber=owner;cursor=0;const rendered=value.type(value.props);fiber=previousFiber;cursor=previousCursor;owner.tree=expand(rendered,key+'/rendered');return owner.tree;
  }
  return React.cloneElement(value,{key:value.key??key},expand(value.props.children,key+'/children'));
 };
 const flush=async()=>{for(let round=0;round<50;round++){
  if(dirty&&!stopped){dirty=false;effects=[];for(const owner of fibers.values())owner.used=false;tree=expand(React.createElement(panel?ServiceAccessPanel:AccessForm,input),'root');for(const owner of fibers.values())if(owner.active&&!owner.used)cleanup(owner);for(const effect of effects)effect();}
  await new Promise(done=>setImmediate(done));if(!dirty||stopped)return tree;
 }throw Error('Access hook renders did not settle');};
 const form=which=>{const owner=[...fibers.values()].find(value=>value.active&&value.used&&value.type===AccessForm&&value.props.scope===which);return owner?.tree;};
 const runner={calls,secret:secrets[0],nextSecret:secrets[1],flush,current:()=>tree,form:(which=scope)=>form(which),posts:()=>calls.filter(call=>call.method==='POST'),gets:()=>calls.filter(call=>call.method==='GET'),lateWrites:()=>lateWrites,input:(type,which=scope)=>nodes(form(which),node=>node.type==='input'&&node.props.type===type)[0],button:(which=scope)=>nodes(form(which),node=>node.type==='button')[0],status:(which=scope)=>nodes(form(which),node=>node.props.role==='status').map(text).join(' '),alert:(which=scope)=>nodes(form(which),node=>node.props.role==='alert').map(text).join(' '),setProps:async patch=>{input={...input,...patch};dirty=true;await flush();},unmount:()=>{if(stopped)return;stopped=true;for(const owner of fibers.values())if(owner.active)cleanup(owner);}};
 runner.start=async(which=scope)=>{const button=runner.button(which);assert.ok(button,'Expected a real rendered save action');assert.equal(!!button.props.disabled,false);const pending=button.props.onClick();await flush();return{pending};};
 try{await flush();return await scenario(runner);}finally{
  runner.unmount();for(const name of hooks)React[name]=original[name];global.fetch=oldFetch;if(oldWindow===undefined)delete global.window;else global.window=oldWindow;
  for(const name of ['localStorage','sessionStorage'])if(oldStorage[name])Object.defineProperty(global,name,oldStorage[name]);else delete global[name];
  assert.deepEqual(forbidden,[],'Every attempted transport, even a caught rejection, must satisfy the fictional allowlist');
  assert.deepEqual(storageAttempts,[],'Private credentials must never enter browser storage');
 }
}

for(const scope of scopes){
 test(scope+': one same-turn save operation blocks duplicate retained clicks until its ACK',async()=>{
  const wait=deferred();await withAccess(async r=>{edit(r.input('password'),r.secret);await r.flush();const retained=r.button().props.onClick,first=retained(),second=retained();await r.flush();assert.equal(r.posts().length,1);assert.equal(r.button().props.disabled,true);assert.equal(r.button().props['aria-busy'],true);retained();await r.flush();assert.equal(r.posts().length,1);wait.resolve(response());await Promise.all([first,second]);await r.flush();assert.equal(r.button().props.disabled,false);assert.equal(r.posts().length,1);assert.equal(r.gets().length,1);},{scope,post:()=>wait.promise});
 });
 test(scope+': a retained save action submits the latest edits made before React renders',async()=>withAccess(async r=>{
  const retained=r.button().props.onClick;edit(r.input('email'),'qa-latest@example.invalid');edit(r.input('password'),r.secret);if(scope==='host')edit(r.input('date'),'2029-12-31');const pending=retained();await pending;await r.flush();assert.equal(r.posts().length,1);const body=r.posts()[0].body;assert.equal(body.id,IDS[0]);assert.equal(body.scope,scope);assert.equal(body.email,'qa-latest@example.invalid');secretEqual(body.password,r.secret);if(scope==='host')assert.equal(body.rsvpDeadline,'2029-12-31');else assert.equal('rsvpDeadline'in body,false);
 },{scope}));
 test(scope+': edits made during a request remain editable and are marked unsaved after ACK',async()=>{
  const wait=deferred();await withAccess(async r=>{edit(r.input('password'),r.secret);await r.flush();const {pending}=await r.start();assert.ok(nodes(r.form(),node=>node.type==='input').every(node=>!node.props.disabled));edit(r.input('email'),'qa-unsent@example.invalid');edit(r.input('password'),r.nextSecret);if(scope==='host')edit(r.input('date'),'2030-01-02');await r.flush();wait.resolve(response());await pending;await r.flush();assert.equal(r.input('email').props.value,'qa-unsent@example.invalid');secretEqual(r.input('password').props.value,r.nextSecret);if(scope==='host')assert.equal(r.input('date').props.value,'2030-01-02');assert.match(r.status(),/sin guardar/);secretEqual(r.posts()[0].body.password,r.secret);assert.equal(r.posts().length,1);assert.equal(r.input('password').props.placeholder,'Vacío para conservarla');},{scope,post:()=>wait.promise});
 });
 test(scope+': password A to B to A stays an unsent new revision after the older A is acknowledged',async()=>{
  const wait=deferred();await withAccess(async r=>{edit(r.input('password'),r.secret);await r.flush();const {pending}=await r.start(),retained=r.input('password');edit(retained,r.nextSecret);edit(retained,r.secret);await r.flush();wait.resolve(response());await pending;await r.flush();secretEqual(r.input('password').props.value,r.secret);assert.match(r.status(),/sin guardar/);assert.equal(r.posts().length,1);},{scope,post:()=>wait.promise});
 });
 test(scope+': a successful unchanged submitted password is cleared without echoing it',async()=>withAccess(async r=>{
  edit(r.input('password'),r.secret);await r.flush();const {pending}=await r.start();await pending;await r.flush();secretEqual(r.input('password').props.value,'');assert.equal(r.input('password').props.placeholder,'Vacío para conservarla');assert.match(r.status(),/Acceso guardado/);assert.doesNotMatch(r.status(),/sin guardar/);assert.equal(r.alert(),'');assert.ok(!text(r.current()).includes(r.secret),'A secret must not be echoed in visible copy');
 },{scope}));
 test(scope+': a definitive rejection preserves the draft and only a manual next click retries',async()=>withAccess(async r=>{
  edit(r.input('email'),'qa-rejected@example.invalid');edit(r.input('password'),r.secret);if(scope==='host')edit(r.input('date'),'2030-02-03');await r.flush();const first=await r.start();await first.pending;await r.flush();assert.match(r.alert(),/QA acceso rechazado/);assert.equal(r.status(),'');assert.equal(r.input('email').props.value,'qa-rejected@example.invalid');secretEqual(r.input('password').props.value,r.secret);if(scope==='host')assert.equal(r.input('date').props.value,'2030-02-03');assert.equal(r.button().props.disabled,false);await r.flush();assert.equal(r.posts().length,1);assert.equal(r.gets().length,1);const second=await r.start();await second.pending;await r.flush();assert.equal(r.posts().length,2);assert.equal(r.alert(),'');assert.match(r.status(),/Acceso guardado/);
 },{scope,post:(_call,calls)=>calls.filter(call=>call.method==='POST').length===1?response({error:'QA acceso rechazado'},403):response()}));
 test(scope+': an unconfirmed network result preserves every draft field without automatic retry',async()=>withAccess(async r=>{
  edit(r.input('password'),r.secret);edit(r.input('email'),'qa-network@example.invalid');await r.flush();const {pending}=await r.start();await pending;await r.flush();assert.match(r.alert(),/No pudimos confirmar/);assert.equal(r.status(),'');secretEqual(r.input('password').props.value,r.secret);assert.equal(r.input('email').props.value,'qa-network@example.invalid');assert.equal(r.button().props.disabled,false);await r.flush();assert.equal(r.posts().length,1);assert.equal(r.gets().length,1);const retry=await r.start();await retry.pending;await r.flush();assert.equal(r.posts().length,2);assert.match(r.status(),/Acceso guardado/);
 },{scope,post:(_call,calls)=>{if(calls.filter(call=>call.method==='POST').length===1)throw Error('QA synthetic transport interruption');return response();}}));
}

test('HTTP success without an exact true ACK never clears a draft or announces success',async()=>{
 for(const body of [{},{ok:false},{ok:'true'},null,[]])await withAccess(async r=>{edit(r.input('password'),r.secret);await r.flush();const {pending}=await r.start();await pending;await r.flush();secretEqual(r.input('password').props.value,r.secret);assert.match(r.alert(),/No pudimos confirmar/);assert.equal(r.status(),'');assert.equal(r.button().props.disabled,false);await r.flush();assert.equal(r.posts().length,1);assert.equal(r.gets().length,1);},{post:()=>response(body)});
});
test('a JSON parsing failure preserves the submitted secret and permits one explicit manual retry',async()=>withAccess(async r=>{
 edit(r.input('password'),r.secret);await r.flush();const {pending}=await r.start();await pending;await r.flush();assert.match(r.alert(),/No pudimos confirmar/);secretEqual(r.input('password').props.value,r.secret);assert.equal(r.status(),'');assert.equal(r.posts().length,1);const retry=await r.start();await retry.pending;await r.flush();assert.equal(r.posts().length,2);assert.match(r.status(),/Acceso guardado/);
},{post:(_call,calls)=>calls.filter(call=>call.method==='POST').length===1?{ok:true,json:async()=>{throw Error('QA synthetic malformed JSON');}}:response()}));
test('the save lock covers delayed JSON parsing as well as the fetch response',async()=>{
 const body=deferred();await withAccess(async r=>{edit(r.input('password'),r.secret);await r.flush();const retained=r.button().props.onClick,{pending}=await r.start();retained();await r.flush();assert.equal(r.posts().length,1);assert.equal(r.button().props.disabled,true);body.resolve({ok:true});await pending;await r.flush();assert.equal(r.button().props.disabled,false);assert.match(r.status(),/Acceso guardado/);},{post:()=>({ok:true,json:()=>body.promise})});
});
test('review host and door saves have independent locks payloads and out-of-order ACKs',async()=>{
 const waits=Object.fromEntries(scopes.map(scope=>[scope,deferred()]));await withAccess(async r=>{for(const scope of scopes){edit(r.input('password',scope),r.secret);edit(r.input('email',scope),'qa-'+scope+'-separate@example.invalid');}await r.flush();const started=[];for(const scope of scopes){started.push(await r.start(scope));for(const other of scopes.filter(other=>!started.length||!r.posts().some(call=>call.scope===other)))assert.equal(r.button(other).props.disabled,false);}assert.equal(r.posts().length,3);assert.deepEqual(r.posts().map(call=>call.scope),scopes);for(const scope of [...scopes].reverse()){waits[scope].resolve(response());await started[scopes.indexOf(scope)].pending;await r.flush();assert.match(r.status(scope),/Acceso guardado/);secretEqual(r.input('password',scope).props.value,'');}assert.equal(r.gets().length,3);assert.ok(scopes.every(scope=>!r.button(scope).props.disabled));},{panel:true,post:call=>waits[call.scope].promise});
});
test('a successful revocation uses its submitted email while keeping a newer unsent email and password',async()=>{
 const wait=deferred();await withAccess(async r=>{edit(r.input('email'),'');await r.flush();const {pending}=await r.start();edit(r.input('email'),'qa-not-enabled-yet@example.invalid');edit(r.input('password'),r.nextSecret);await r.flush();wait.resolve(response());await pending;await r.flush();assert.equal(r.posts()[0].body.email,'');assert.equal(r.input('email').props.value,'qa-not-enabled-yet@example.invalid');secretEqual(r.input('password').props.value,r.nextSecret);assert.equal(r.input('password').props.placeholder,'Mínimo 8 caracteres');assert.match(r.status(),/Acceso deshabilitado/);assert.match(r.status(),/sin guardar/);},{post:()=>wait.promise});
});
test('an enabled submitted account remains configured even if its current draft email was cleared',async()=>{
 const wait=deferred();await withAccess(async r=>{edit(r.input('password'),r.secret);await r.flush();const {pending}=await r.start();edit(r.input('email'),'');await r.flush();wait.resolve(response());await pending;await r.flush();assert.equal(r.input('email').props.value,'');assert.equal(r.input('password').props.placeholder,'Vacío para conservarla');assert.match(r.status(),/Acceso guardado/);assert.match(r.status(),/sin guardar/);assert.equal(r.posts().length,1);},{metadata:{email:'qa-enable@example.invalid',hasPassword:false,rsvpDeadline:''},post:()=>wait.promise});
});
test('a later explicit revocation updates configured metadata after an earlier successful enable',async()=>withAccess(async r=>{
 edit(r.input('password'),r.secret);await r.flush();let attempt=await r.start();await attempt.pending;await r.flush();assert.equal(r.input('password').props.placeholder,'Vacío para conservarla');edit(r.input('email'),'');await r.flush();attempt=await r.start();await attempt.pending;await r.flush();assert.equal(r.input('password').props.placeholder,'Mínimo 8 caracteres');assert.match(r.status(),/Acceso deshabilitado/);assert.equal(r.posts().length,2);
},{metadata:{email:'qa-enable@example.invalid',hasPassword:false,rsvpDeadline:''}}));
test('email-only edits made while pending preserve the edit without misreporting a new password revision',async()=>{
 const wait=deferred();await withAccess(async r=>{edit(r.input('password'),r.secret);await r.flush();const {pending}=await r.start();edit(r.input('email'),'qa-new-email@example.invalid');await r.flush();wait.resolve(response());await pending;await r.flush();secretEqual(r.input('password').props.value,'');assert.equal(r.input('email').props.value,'qa-new-email@example.invalid');assert.match(r.status(),/sin guardar/);},{post:()=>wait.promise});
});
test('a pending reply from a previous invitation cannot clear or confirm the new invitation draft',async()=>{
 const wait=deferred();await withAccess(async r=>{edit(r.input('password','host'),r.secret);await r.flush();const {pending}=await r.start('host');await r.setProps({id:IDS[1]});assert.equal(r.input('email','host').props.value,'qa-new-owner@example.invalid');edit(r.input('password','host'),r.nextSecret);await r.flush();const writes=r.lateWrites();wait.resolve(response());await pending;await r.flush();secretEqual(r.input('password','host').props.value,r.nextSecret);assert.equal(r.status('host'),'');assert.equal(r.alert('host'),'');assert.equal(r.lateWrites(),writes);assert.equal(r.posts().length,1);},{panel:true,metadata:call=>({email:call.id===IDS[1]?'qa-new-owner@example.invalid':'qa-old-owner@example.invalid',hasPassword:true,rsvpDeadline:'2029-09-20'}),post:()=>wait.promise});
});
test('a retained old invitation save handler cannot submit while a new invitation is loading',async()=>{
 const read=deferred();await withAccess(async r=>{const retained=r.button('review').props.onClick;await r.setProps({id:IDS[1]});assert.equal(r.button('review'),undefined);await retained();await r.flush();assert.equal(r.posts().length,0);read.resolve(response({email:'qa-loaded@example.invalid',hasPassword:false,rsvpDeadline:''}));await r.flush();assert.ok(r.button('review'));},{panel:true,get:call=>call.id===IDS[1]?read.promise:response({email:'qa-old@example.invalid',hasPassword:true,rsvpDeadline:''})});
});
test('invitation A to B to A does not revive an obsolete save handler or its edits',async()=>withAccess(async r=>{
 const retiredSave=r.button('host').props.onClick,retiredEmail=r.input('email','host');await r.setProps({id:IDS[1]});await r.setProps({id:IDS[0]});edit(retiredEmail,'qa-obsolete@example.invalid');await retiredSave();await r.flush();assert.equal(r.posts().length,0);assert.equal(r.input('email','host').props.value,'qa-host@example.invalid');assert.equal(r.status('host'),'');
},{panel:true}));
test('late initial metadata from a previous invitation never initializes the current invitation',async()=>{
 const oldRead=deferred();await withAccess(async r=>{assert.equal(r.button('review'),undefined);await r.setProps({id:IDS[1]});assert.equal(r.input('email','review').props.value,'qa-current@example.invalid');oldRead.resolve(response({email:'qa-obsolete@example.invalid',hasPassword:true,rsvpDeadline:''}));await r.flush();assert.equal(r.input('email','review').props.value,'qa-current@example.invalid');assert.equal(r.posts().length,0);},{panel:true,get:call=>call.id===IDS[0]?oldRead.promise:response({email:'qa-current@example.invalid',hasPassword:false,rsvpDeadline:''})});
});
test('unmounted pending successful and failed saves cannot write state retry or announce success',async()=>{
 for(const outcome of ['success','failure']){const wait=deferred();await withAccess(async r=>{edit(r.input('password'),r.secret);await r.flush();const {pending}=await r.start(),writes=r.lateWrites();r.unmount();if(outcome==='success')wait.resolve(response());else wait.reject(Error('QA synthetic connection loss'));await pending;await r.flush();assert.equal(r.lateWrites(),writes,'A disposed access form must not receive reply state writes');assert.equal(r.posts().length,1);assert.equal(r.gets().length,1);},{post:()=>wait.promise});}
});
test('removing host capability disposes only that form and leaves review and door independent',async()=>{
 const wait=deferred();await withAccess(async r=>{edit(r.input('password','host'),r.secret);await r.flush();const {pending}=await r.start('host');await r.setProps({config:newServiceContract({},'plus')});assert.equal(r.form('host'),undefined);assert.ok(r.button('review'));assert.ok(r.button('door'));const writes=r.lateWrites();wait.resolve(response());await pending;await r.flush();assert.equal(r.lateWrites(),writes);assert.equal(r.status('review'),'');assert.equal(r.status('door'),'');assert.equal(r.posts().length,1);},{panel:true,post:()=>wait.promise});
});
test('a failed later save clears the earlier success status and retains its new draft',async()=>withAccess(async r=>{
 edit(r.input('password'),r.secret);await r.flush();let attempt=await r.start();await attempt.pending;await r.flush();assert.match(r.status(),/Acceso guardado/);edit(r.input('password'),r.nextSecret);await r.flush();attempt=await r.start();await attempt.pending;await r.flush();assert.equal(r.status(),'');assert.match(r.alert(),/QA siguiente rechazo/);secretEqual(r.input('password').props.value,r.nextSecret);assert.equal(r.posts().length,2);
},{post:(_call,calls)=>calls.filter(call=>call.method==='POST').length===1?response():response({error:'QA siguiente rechazo'},422)}));
test('failed initial metadata offers no editable access or save request and does not retry automatically',async()=>withAccess(async r=>{
 assert.match(r.alert(),/QA lectura rechazada/);assert.equal(r.input('email'),undefined);assert.equal(r.button(),undefined);await r.flush();assert.equal(r.posts().length,0);assert.equal(r.gets().length,1);
},{get:()=>response({error:'QA lectura rechazada'},403)}));
