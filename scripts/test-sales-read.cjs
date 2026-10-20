// Full-attempt deadlines for private sales reads. Fictional replies, fake clocks, no network.
const fs=require('node:fs'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},fileName:file}).outputText,file);
const {runSalesRead:run}=require('../src/lib/sales-read.ts');
const {requestCommercialHistory,COMMERCIAL_HISTORY_TIMEOUT_MS}=require('../src/lib/commercial-history.ts');
const {requestSalesConfig,SALES_CONFIG_TIMEOUT_MS}=require('../src/lib/sales-draft.ts');
const lead={id:'30000000-0000-4000-8000-000000000001',reference:'EK-A1B2C3D4'},scope='a'.repeat(64);
const history=()=>({lead:{...lead},asOf:'2025-01-02T12:00:00.123456Z',entries:[],pagination:{size:20,hasMore:false,nextCursor:null}});
const config=()=>({paymentInstructions:'QA instrucciones ficticias. Sin pago real.',paymentConfigured:true,salesHours:'QA lunes a viernes',draftScope:scope});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const flush=()=>new Promise(done=>setImmediate(done));
const observe=promise=>{const state={kind:'pending',value:null,error:null};promise.then(value=>{state.kind='resolved';state.value=value;},error=>{state.kind='rejected';state.error=error;});return state;};
function clock(t){
 let now=Date.now(),sequence=0;const timers=new Map(),cleared=[];
 t.mock.method(Date,'now',()=>now);
 t.mock.method(global,'setTimeout',(callback,delay)=>{const id=++sequence;timers.set(id,{callback,at:now+delay});return id;});
 t.mock.method(global,'clearTimeout',id=>{cleared.push(id);timers.delete(id);});
 return{timers,cleared,advance:ms=>{now+=ms;},tick:ms=>{now+=ms;for(let count=0;count<1000;count++){const next=[...timers].filter(([,timer])=>timer.at<=now).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)return;timers.delete(next[0]);next[1].callback();}assert.fail('Unexpected timer loop');}};
}
function trackedSignal(t,controller=new AbortController()){
 const signal=controller.signal,add=signal.addEventListener.bind(signal),remove=signal.removeEventListener.bind(signal),listeners=new Set();let added=0,removed=0;
 t.mock.method(signal,'addEventListener',(type,callback,options)=>{if(type==='abort'){added++;listeners.add(callback);}return add(type,callback,options);});
 t.mock.method(signal,'removeEventListener',(type,callback,options)=>{if(type==='abort'){removed++;listeners.delete(callback);}return remove(type,callback,options);});
 return{controller,signal,listeners,counts:()=>({added,removed})};
}
const options=(signal,timeoutMs=50)=>({signal,timeoutMs,timeoutMessage:'QA deadline',cancelMessage:'QA cancelled'});

test('read helper resolves through an independent child signal and cleans its timer and external listener',async t=>{
 const fake=clock(t),external=trackedSignal(t);let child,calls=0;
 assert.deepEqual(await run(async signal=>{child=signal;calls++;return{ok:true};},options(external.signal)),{ok:true});
 assert.equal(calls,1);assert.ok(child instanceof AbortSignal);assert.notEqual(child,external.signal);assert.equal(child.aborted,false);assert.equal(external.signal.aborted,false);assert.equal(fake.timers.size,0);assert.equal(external.listeners.size,0);assert.deepEqual(external.counts(),{added:1,removed:1});
 fake.tick(100);external.controller.abort();assert.equal(child.aborted,false);
});

test('read helper preserves synchronous and asynchronous attempt errors and always cleans up',async t=>{
 const fake=clock(t),external=trackedSignal(t),sync=Error('QA sync'),asyncError=Error('QA async');
 await assert.rejects(run(()=>{throw sync;},options(external.signal)),error=>error===sync);
 await assert.rejects(run(async()=>{throw asyncError;},options(external.signal)),error=>error===asyncError);
 assert.equal(fake.timers.size,0);assert.equal(external.listeners.size,0);assert.deepEqual(external.counts(),{added:2,removed:2});assert.equal(external.signal.aborted,false);
});

test('invalid deadlines reject before an attempt, timer or external listener is registered',async t=>{
 const fake=clock(t),external=trackedSignal(t);let calls=0;
 for(const timeout of [undefined,null,0,-1,0.5,NaN,Infinity,'50',2147483648])await assert.rejects(run(async()=>{calls++;return true;},{...options(external.signal),timeoutMs:timeout}),/límite de espera/);
 assert.equal(calls,0);assert.equal(fake.timers.size,0);assert.deepEqual(external.counts(),{added:0,removed:0});
});

test('a pre-aborted external signal causes zero attempt calls and no timer or listener',async t=>{
 const fake=clock(t),external=trackedSignal(t);external.controller.abort();let calls=0;
 await assert.rejects(run(async()=>{calls++;return true;},options(external.signal)),/QA cancelled/);assert.equal(calls,0);assert.equal(fake.timers.size,0);assert.deepEqual(external.counts(),{added:0,removed:0});
});

test('external abort rejects an uncooperative attempt immediately and propagates only to its child',async t=>{
 const fake=clock(t),external=trackedSignal(t),pending=deferred();let child,calls=0;
 const state=observe(run(signal=>{child=signal;calls++;return pending.promise;},options(external.signal)));external.controller.abort();await flush();
 assert.equal(state.kind,'rejected');assert.match(state.error.message,/QA cancelled/);assert.equal(child.aborted,true);assert.equal(calls,1);assert.equal(fake.timers.size,0);assert.equal(external.listeners.size,0);
 pending.resolve('QA late result');await flush();assert.equal(state.kind,'rejected');fake.tick(100);assert.equal(calls,1);
});

test('deadline rejects an uncooperative attempt at its boundary without aborting the caller controller',async t=>{
 const fake=clock(t),external=trackedSignal(t);let child,calls=0;
 const state=observe(run(signal=>{child=signal;calls++;return new Promise(()=>{});},options(external.signal)));
 fake.tick(49);await flush();assert.equal(state.kind,'pending');fake.tick(1);await flush();assert.equal(state.kind,'rejected');assert.equal(state.error.message,'QA deadline');assert.equal(child.aborted,true);assert.equal(external.signal.aborted,false);assert.equal(external.listeners.size,0);assert.equal(fake.timers.size,0);assert.equal(calls,1);
});

test('the helper settles its own reason before an abort-driven transport rejection can replace it',async t=>{
 const fake=clock(t),external=trackedSignal(t);let child;
 const attempt=signal=>{child=signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('QA transport abort override')),{once:true}));};
 const timeout=observe(run(attempt,options(external.signal)));fake.tick(50);await flush();assert.equal(timeout.error.message,'QA deadline');assert.equal(child.aborted,true);
 const cancelled=observe(run(attempt,options(external.signal)));external.controller.abort();await flush();assert.equal(cancelled.error.message,'QA cancelled');assert.equal(fake.timers.size,0);assert.equal(external.listeners.size,0);
});

test('late rejection after deadline is handled and cannot trigger retries or an unhandled rejection',async t=>{
 const fake=clock(t),external=trackedSignal(t),pending=deferred(),unhandled=[];let calls=0;
 const listener=error=>unhandled.push(error);process.on('unhandledRejection',listener);t.after(()=>process.removeListener('unhandledRejection',listener));
 const state=observe(run(()=>{calls++;return pending.promise;},options(external.signal)));fake.tick(50);await flush();pending.reject(Error('QA_PRIVATE late rejection'));await flush();
 assert.equal(state.error.message,'QA deadline');assert.equal(calls,1);assert.deepEqual(unhandled,[]);assert.equal(fake.timers.size,0);assert.equal(external.signal.aborted,false);
});

test('synchronous validation consuming the whole budget cannot resolve before a delayed timer callback',async t=>{
 const fake=clock(t),external=trackedSignal(t);let child;
 const state=observe(run(async signal=>{child=signal;fake.advance(50);return'QA validated too late';},options(external.signal)));await flush();
 assert.equal(state.kind,'rejected');assert.equal(state.error.message,'QA deadline');assert.equal(child.aborted,true);assert.equal(fake.timers.size,0);assert.equal(external.signal.aborted,false);
});

test('separate reads have separate timers and cancellation cannot stop another read',async t=>{
 const fake=clock(t),first=trackedSignal(t),second=trackedSignal(t),one=deferred(),two=deferred();let childOne,childTwo;
 const a=observe(run(signal=>{childOne=signal;return one.promise;},options(first.signal))),b=observe(run(signal=>{childTwo=signal;return two.promise;},options(second.signal)));
 assert.equal(fake.timers.size,2);first.controller.abort();await flush();assert.equal(a.error.message,'QA cancelled');assert.equal(b.kind,'pending');assert.equal(childOne.aborted,true);assert.equal(childTwo.aborted,false);assert.equal(fake.timers.size,1);
 two.resolve('QA second result');await flush();assert.equal(b.kind,'resolved');assert.equal(b.value,'QA second result');assert.equal(second.signal.aborted,false);assert.equal(fake.timers.size,0);
});

const services=[
 {name:'history',timeout:COMMERCIAL_HISTORY_TIMEOUT_MS,expectedTimeout:20000,body:history,request:(transport,signal)=>requestCommercialHistory(lead,null,transport,signal),url:`/api/admin/commercial/history?leadId=${lead.id}`,timeoutText:/historial tardó demasiado/,cancelText:/historial se interrumpió/,invalidText:/incompleto/,validationBody:advance=>Object.defineProperty(history(),'entries',{get(){advance();return[];}})},
 {name:'config',timeout:SALES_CONFIG_TIMEOUT_MS,expectedTimeout:12000,body:config,request:requestSalesConfig,url:'/api/admin/sales-config',timeoutText:/configuración tardó demasiado/,cancelText:/configuración se interrumpió/,invalidText:/incompleta/,validationBody:advance=>Object.defineProperty(config(),'draftScope',{get(){advance();return scope;}})},
];

test('config: session binding rejects a final newline, noncanonical scopes and array-shaped payloads',async t=>{
 const fake=clock(t),payloads=[null,'QA_PRIVATE',42,Object.assign([],config()),...['a'.repeat(63),scope+'\n','A'.repeat(64),[scope],null].map(draftScope=>({...config(),draftScope}))];
 for(const payload of payloads){const external=trackedSignal(t);await assert.rejects(requestSalesConfig(async()=>({ok:true,status:200,json:async()=>payload}),external.signal),/configuración llegó incompleta/);assert.equal(external.listeners.size,0);assert.equal(external.signal.aborted,false);assert.equal(fake.timers.size,0);}
});

for(const service of services){
 test(`${service.name}: a valid read uses one private GET, a child signal and the fixed deadline`,async t=>{
  const fake=clock(t),external=trackedSignal(t);let calls=0,child;
  assert.equal(service.timeout,service.expectedTimeout);
  const expected=service.body(),result=await service.request(async(url,request)=>{calls++;assert.equal(url,service.url);assert.equal(request.cache,'no-store');assert.equal(request.method,undefined);assert.equal(request.body,undefined);assert.notEqual(request.signal,external.signal);child=request.signal;return{ok:true,status:200,json:async()=>({...expected,privateSession:'QA_PRIVATE',request:'QA_PRIVATE'})};},external.signal);
  assert.deepEqual(result,expected);assert.doesNotMatch(JSON.stringify(result),/QA_PRIVATE/);assert.equal(calls,1);assert.equal(child.aborted,false);assert.equal(external.signal.aborted,false);assert.equal(fake.timers.size,0);assert.equal(external.listeners.size,0);
 });

 test(`${service.name}: a pre-aborted request never calls the transport`,async t=>{
  const fake=clock(t),external=trackedSignal(t);external.controller.abort();let calls=0;
  await assert.rejects(service.request(async()=>{calls++;return{ok:true,status:200,json:async()=>service.body()};},external.signal),service.cancelText);assert.equal(calls,0);assert.equal(fake.timers.size,0);assert.deepEqual(external.counts(),{added:0,removed:0});
 });

 test(`${service.name}: a transport ignoring abort still fails on time without automatic retry`,async t=>{
  const fake=clock(t),external=trackedSignal(t);let calls=0,child;
  const state=observe(service.request(async(_url,request)=>{calls++;child=request.signal;return new Promise(()=>{});},external.signal));fake.tick(service.timeout-1);await flush();assert.equal(state.kind,'pending');fake.tick(1);await flush();
  assert.equal(state.kind,'rejected');assert.match(state.error.message,service.timeoutText);assert.equal(child.aborted,true);assert.equal(external.signal.aborted,false);assert.equal(external.listeners.size,0);assert.equal(fake.timers.size,0);fake.tick(service.timeout*2);await flush();assert.equal(calls,1);
 });

 test(`${service.name}: a hanging response body is bounded and a late valid body never becomes success`,async t=>{
  const fake=clock(t),external=trackedSignal(t),body=deferred();let calls=0,jsonCalls=0,child;
  const state=observe(service.request(async(_url,request)=>{calls++;child=request.signal;return{ok:true,status:200,json:()=>{jsonCalls++;return body.promise;}};},external.signal));await flush();assert.equal(jsonCalls,1);fake.tick(service.timeout);await flush();assert.equal(state.kind,'rejected');assert.match(state.error.message,service.timeoutText);assert.equal(child.aborted,true);
  body.resolve(service.body());await flush();assert.equal(state.kind,'rejected');assert.equal(state.value,null);assert.equal(calls,1);assert.equal(jsonCalls,1);assert.equal(external.signal.aborted,false);assert.equal(fake.timers.size,0);
 });

 test(`${service.name}: late fetch success after timeout is rejected before reading its body`,async t=>{
  const fake=clock(t),external=trackedSignal(t),transport=deferred();let calls=0,jsonCalls=0;
  const state=observe(service.request(async()=>{calls++;return transport.promise;},external.signal));fake.tick(service.timeout);await flush();transport.resolve({ok:true,status:200,json:async()=>{jsonCalls++;return service.body();}});await flush();
  assert.equal(state.kind,'rejected');assert.match(state.error.message,service.timeoutText);assert.equal(calls,1);assert.equal(jsonCalls,0);assert.equal(fake.timers.size,0);assert.equal(external.listeners.size,0);
 });

 test(`${service.name}: late fetch or body rejection after timeout is consumed safely`,async t=>{
  const fake=clock(t),unhandled=[],listener=error=>unhandled.push(error);process.on('unhandledRejection',listener);t.after(()=>process.removeListener('unhandledRejection',listener));
  for(const phase of ['transport','body']){
   const external=trackedSignal(t),pending=deferred();let calls=0;
   const state=observe(service.request(async()=>{calls++;return phase==='transport'?pending.promise:{ok:true,status:200,json:()=>pending.promise};},external.signal));await flush();fake.tick(service.timeout);await flush();pending.reject(Error('QA_PRIVATE late failure'));await flush();assert.match(state.error.message,service.timeoutText);assert.equal(state.kind,'rejected');assert.equal(calls,1);assert.equal(external.signal.aborted,false);
  }
  assert.deepEqual(unhandled,[]);assert.equal(fake.timers.size,0);
 });

 test(`${service.name}: external abort after fetch prevents any JSON read even if fetch ignores it`,async t=>{
  const fake=clock(t),external=trackedSignal(t),transport=deferred();let jsonCalls=0,child;
  const state=observe(service.request(async(_url,request)=>{child=request.signal;return transport.promise;},external.signal));external.controller.abort();transport.resolve({ok:true,status:200,json:async()=>{jsonCalls++;return service.body();}});await flush();
  assert.equal(state.kind,'rejected');assert.match(state.error.message,service.cancelText);assert.equal(child.aborted,true);assert.equal(jsonCalls,0);assert.equal(fake.timers.size,0);assert.equal(external.listeners.size,0);
 });

 test(`${service.name}: external abort while reading JSON rejects and a later body cannot return data`,async t=>{
  const fake=clock(t),external=trackedSignal(t),body=deferred();let jsonCalls=0;
  const state=observe(service.request(async()=>({ok:true,status:200,json:()=>{jsonCalls++;return body.promise;}}),external.signal));await flush();assert.equal(jsonCalls,1);external.controller.abort();await flush();assert.match(state.error.message,service.cancelText);
  body.resolve(service.body());await flush();assert.equal(state.kind,'rejected');assert.equal(state.value,null);assert.equal(fake.timers.size,0);assert.equal(external.listeners.size,0);
 });

 test(`${service.name}: abort immediately after JSON and during validation never returns a valid reply`,async t=>{
  const fake=clock(t);
  for(const phase of ['json','validation']){
   const external=trackedSignal(t),body=phase==='validation'?service.validationBody(()=>external.controller.abort()):service.body();
   const state=observe(service.request(async()=>({ok:true,status:200,json:async()=>{if(phase==='json')external.controller.abort();return body;}}),external.signal));await flush();assert.equal(state.kind,'rejected');assert.match(state.error.message,service.cancelText);assert.equal(state.value,null);assert.equal(external.listeners.size,0);
  }
  assert.equal(fake.timers.size,0);
 });

 test(`${service.name}: validation belongs to the same deadline and cannot enable a late result`,async t=>{
  const fake=clock(t),external=trackedSignal(t),body=service.validationBody(()=>fake.advance(service.timeout));let child;
  const state=observe(service.request(async(_url,request)=>{child=request.signal;return{ok:true,status:200,json:async()=>body};},external.signal));await flush();assert.equal(state.kind,'rejected');assert.match(state.error.message,service.timeoutText);assert.equal(child.aborted,true);assert.equal(external.signal.aborted,false);assert.equal(fake.timers.size,0);assert.equal(external.listeners.size,0);
 });

 test(`${service.name}: authentication, connection, JSON and schema errors remain explicit and clean all resources`,async t=>{
  const fake=clock(t);
  const failures=[
   {transport:async()=>{throw Error('QA_PRIVATE offline');},pattern:/conexión|conectar/},
   {transport:async()=>({ok:false,status:401,json:async()=>assert.fail('401 must not read JSON')}),pattern:/sesión/},
   {transport:async()=>({ok:false,status:500,json:async()=>({error:'QA_PRIVATE'})}),pattern:/No se pudo/},
   {transport:async()=>({ok:true,status:200,json:async()=>{throw Error('QA_PRIVATE body');}}),pattern:service.invalidText},
   {transport:async()=>({ok:true,status:200,json:async()=>({})}),pattern:service.invalidText},
  ];
  if(service.name==='history')failures.push({transport:async()=>({ok:false,status:404,json:async()=>assert.fail('404 must not read JSON')}),pattern:/ya no está disponible/},{transport:async()=>({ok:false,status:503,json:async()=>({code:'MIGRATION_REQUIRED'})}),pattern:/migración 012/});
  for(const failure of failures){const external=trackedSignal(t);let calls=0;await assert.rejects(service.request(async(...args)=>{calls++;return failure.transport(...args);},external.signal),error=>{assert.match(error.message,failure.pattern);assert.doesNotMatch(error.message,/QA_PRIVATE/);return true;});assert.equal(calls,1);assert.equal(external.listeners.size,0);assert.equal(external.signal.aborted,false);assert.equal(fake.timers.size,0);}
 });
}
