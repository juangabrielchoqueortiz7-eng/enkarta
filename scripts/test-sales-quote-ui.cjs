// Quote review rendering with fictional inputs; no browser, network or real clipboard.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {default:SalesToolkit,SalesQuoteReview,SalesCopyButton,SalesContactImport}=require('../src/components/admin/SalesToolkit.tsx');
const {readSalesDraft,salesDraftKey}=require('../src/lib/sales-draft.ts');
const complete={clientName:'QA Familia Pérez',eventType:'Boda',eventDate:'2028-02-29',design:'Lunaria',packageKey:'premium',extrasBs:'270,50',extrasLabel:'Servicio ficticio',paymentInstructions:'QA: instrucciones ficticias, sin pago real.'};
let copies=0;
const render=(input,disabled=false)=>renderToStaticMarkup(React.createElement(SalesQuoteReview,{input,disabled,writeText:async()=>{copies++;}}));
const copyButton=html=>{const match=html.match(/<button\b[^>]*>[\s\S]*?<\/button>/);assert.ok(match,'review must expose an explicit copy action');return match[0];};

test('a complete valid quote offers a proposal without a draft watermark',()=>{
 const html=render(complete);assert.match(html,/Copiar propuesta/);assert.match(html,/RESUMEN DE PROPUESTA/);assert.doesNotMatch(html,/BORRADOR DE PROPUESTA/);assert.doesNotMatch(copyButton(html),/\sdisabled(?:=|[\s>])/);
});
test('missing customer information remains visibly marked as draft even with payment instructions',()=>{
 const html=render({...complete,clientName:'',eventDate:'',design:''});assert.match(html,/Copiar borrador/);assert.match(html,/BORRADOR DE PROPUESTA/);assert.match(html,/Por confirmar/);assert.doesNotMatch(html,/RESUMEN DE PROPUESTA/);assert.doesNotMatch(copyButton(html),/\sdisabled(?:=|[\s>])/);
});
test('missing payment instructions cannot promote otherwise complete data to a proposal',()=>{
 const html=render({...complete,paymentInstructions:''});assert.match(html,/Copiar borrador/);assert.match(html,/BORRADOR DE PROPUESTA/);assert.doesNotMatch(html,/Copiar propuesta|RESUMEN DE PROPUESTA/);
});
test('unconfigured authentication or session booting keeps copy disabled',()=>{
 const html=render(complete,true);assert.match(copyButton(html),/\sdisabled(?:=|[\s>])/);assert.equal(copies,0);
});
test('invalid amounts never render a fabricated zero-price quote or an infinite total',()=>{
 for(const extrasBs of ['12,','1e3','0.105','-2',Infinity,1e308,'999070.01']){
  const html=render({...complete,extrasBs});assert.match(copyButton(html),/\sdisabled(?:=|[\s>])/);assert.match(html,/Corrige|Revisa/);assert.doesNotMatch(html,/RESUMEN DE PROPUESTA|BORRADOR DE PROPUESTA|Infinity|NaN|Total: 0/);
 }
 assert.equal(copies,0);
});
test('an impossible calendar date cannot be copied as a different valid date',()=>{
 for(const eventDate of ['2027-02-31','2026-02-29','0000-01-01']){const html=render({...complete,eventDate});assert.match(copyButton(html),/\sdisabled(?:=|[\s>])/);assert.doesNotMatch(html,/3 de marzo|RESUMEN DE PROPUESTA|BORRADOR DE PROPUESTA/);}
});
test('comma cents remain visible in the reviewed total and balance',()=>{
 const html=render(complete);assert.match(html,/1[.,]200[.,]5 Bs/);assert.match(html,/1[.,]000[.,]5 Bs/);assert.doesNotMatch(html,/1[.,]200[.,]499/);
});
test('reviewed text is escaped instead of becoming active HTML',()=>{
 const html=render({...complete,clientName:'<script>ficticio()</script>'});assert.match(html,/&lt;script&gt;ficticio\(\)&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/);
});
test('a recovered legacy amount with excess precision remains editable but not copyable',()=>{
 const scope='a'.repeat(64),now=Date.now(),input={...complete,extrasBs:0.105};delete input.paymentInstructions;
 const raw=JSON.stringify({version:1,scope,savedAt:now,input});const storage={getItem:key=>key===salesDraftKey(scope)?raw:null};
 const recovered=readSalesDraft(storage,scope,now);assert.equal(recovered.kind,'ready');assert.equal(recovered.input.extrasBs,0.105);
 const html=render({...recovered.input,paymentInstructions:complete.paymentInstructions});assert.match(copyButton(html),/\sdisabled(?:=|[\s>])/);assert.doesNotMatch(html,/0[.,]11 Bs|RESUMEN DE PROPUESTA/);
});
test('the quote fixture remains unavailable outside development',()=>{
 const Page=require('../src/app/dev/services/sales-quote/page.tsx').default,previous=process.env.NODE_ENV;
 try{for(const env of ['production','test']){process.env.NODE_ENV=env;assert.throws(()=>Page(),/404|NEXT_HTTP_ERROR_FALLBACK/);}process.env.NODE_ENV='development';assert.ok(Page());}
 finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});

const nodesWhere=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodesWhere(child,predicate))];
const contact=(patch={})=>({reference:'EK-A1B2C3D4',eventType:'Boda',design:'Lunaria',packageKey:'premium',...patch});
const draftScope='b'.repeat(64);
const fixtureStorage=(input,failWrite=false)=>{
 const values=new Map(input?[[salesDraftKey(draftScope),JSON.stringify({version:2,scope:draftScope,savedAt:Date.now(),input})]]:[]),writes=[],removals=[];
 return{values,writes,removals,getItem:key=>values.get(key)??null,setItem:(key,value)=>{writes.push({key,value});if(failWrite)throw Error('QA storage unavailable');values.set(key,value);},removeItem:key=>{removals.push(key);values.delete(key);}};
};

// Execute component state and dependency-aware effects in memory. DOM refs stay null:
// these tests cover transitions, not browser layout, keyboard focus or Android acceptance.
async function withSalesHooks(Component,initialProps,scenario){
 const names=['useState','useRef','useEffect','useMemo','useId'],original=Object.fromEntries(names.map(name=>[name,React[name]]));
 const oldWindow=global.window,slots=[];let cursor=0,dirty=true,tree,props=initialProps,effects=[];
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
 React.useState=initial=>{const index=cursor++;if(!(index in slots))slots[index]={value:typeof initial==='function'?initial():initial};const slot=slots[index];return[slot.value,value=>{const next=typeof value==='function'?value(slot.value):value;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}}];};
 React.useRef=initial=>{const index=cursor++;return slots[index]??(slots[index]={current:initial});};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:compute(),deps};return slots[index].value;};
 React.useId=()=>{const index=cursor++;return slots[index]??(slots[index]=`:qa-sales-${index}:`);};
 React.useEffect=(effect,deps)=>{const index=cursor++,previous=slots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 global.window={setTimeout,clearTimeout};
 const flush=async()=>{for(let iteration=0;iteration<30;iteration++){if(dirty){dirty=false;cursor=0;effects=[];tree=Component(props);for(const effect of effects)effect();}await new Promise(resolve=>setImmediate(resolve));if(!dirty)return tree;}throw Error('QA hook effects did not settle');};
 const runner={flush,tree:()=>tree,update:async patch=>{props={...props,...patch};dirty=true;return flush();}};
 try{await flush();return await scenario(runner);}finally{for(const slot of slots)slot?.cleanup?.();for(const name of names)React[name]=original[name];if(oldWindow===undefined)delete global.window;else global.window=oldWindow;}
}

async function withToolkit(input,request,scenario,options={}){
 const storage=fixtureStorage(input,options.failWrite),calls=[],copied=[];
 const transport=async(url,init)=>{calls.push({url,method:init?.method??'GET'});assert.equal(url,'/api/admin/sales-config');assert.equal(init?.method,undefined);return Response.json({paymentInstructions:'QA instrucciones sin pago real',paymentConfigured:true,salesHours:'QA horario',draftScope});};
 await withSalesHooks(SalesToolkit,{storage,transport,writeText:async value=>copied.push(value),contactRequest:request},async runner=>{
  const context={...runner,storage,calls,copied,import:()=>nodesWhere(runner.tree(),node=>node.type===SalesContactImport)[0],review:()=>nodesWhere(runner.tree(),node=>node.type===SalesQuoteReview)[0],field:name=>nodesWhere(runner.tree(),node=>node.props.name===name)[0]};
  await scenario(context);assert.deepEqual(calls,[{url:'/api/admin/sales-config',method:'GET'}],'Only isolated read-only configuration is requested; never PATCH/contact mutation');
 });
}

test('contact import requires explicit review before replacing a recovered draft and cancellation writes nothing',async()=>{
 const previous={...complete,commercialReference:'EK-00000001'};delete previous.paymentInstructions;
 await withToolkit(previous,{sequence:1,contact:contact()},async runner=>{
  assert.ok(runner.import());assert.equal(runner.import().props.replacing,true);assert.equal(runner.review().props.input.clientName,previous.clientName);
  assert.equal(runner.storage.writes.length,0);assert.equal(runner.storage.removals.length,0);assert.equal(runner.review().props.disabled,true);
  runner.import().props.onCancel();await runner.flush();
  assert.equal(runner.import(),undefined);assert.equal(runner.review().props.input.commercialReference,previous.commercialReference);assert.equal(runner.review().props.input.extrasBs,previous.extrasBs);
  assert.equal(runner.storage.writes.length,0);assert.equal(runner.storage.removals.length,0);assert.deepEqual(runner.copied,[]);
 });
});

test('a known contact prefills only reviewed quotation fields after confirmation',async()=>{
 await withToolkit(null,{sequence:1,contact:contact({eventType:'XV años',design:'Granate',packageKey:'exclusive'})},async runner=>{
  assert.equal(runner.import().props.packageKey,'exclusive');assert.equal(runner.import().props.replacing,false);assert.equal(runner.storage.writes.length,0);
  runner.import().props.onApply();await runner.flush();
  const input=runner.review().props.input;assert.equal(input.commercialReference,'EK-A1B2C3D4');assert.equal(input.eventType,'XV años');assert.equal(input.design,'Granate');assert.equal(input.packageKey,'exclusive');assert.equal(input.extrasBs,0);
  assert.equal(input.clientName,undefined);assert.equal(input.eventDate,undefined);assert.equal(input.extrasLabel,undefined);assert.equal(runner.import(),undefined);assert.equal(runner.review().props.disabled,false);
  assert.equal(runner.storage.writes.length,1);const saved=JSON.parse(runner.storage.writes[0].value);assert.equal(saved.input.commercialReference,input.commercialReference);assert.equal(saved.input.paymentInstructions,undefined);
 });
});

test('a general contact has no automatic package and cannot import until one is selected',async()=>{
 const general=contact({packageKey:null});
 const html=renderToStaticMarkup(React.createElement(SalesContactImport,{contact:general,packageKey:'',replacing:false,onPackage:()=>{},onApply:()=>{},onCancel:()=>{}}));
 assert.match(html,/El contacto no tiene paquete/);assert.match(html,/no se asignará automáticamente/);assert.match(copyButton(html),/\sdisabled(?:=|[\s>])/);
 await withToolkit(null,{sequence:1,contact:general},async runner=>{
  assert.equal(runner.import().props.packageKey,'');runner.import().props.onApply();await runner.flush();assert.equal(runner.storage.writes.length,0);assert.ok(runner.import());
  runner.import().props.onPackage('plus');await runner.flush();assert.equal(runner.import().props.packageKey,'plus');
  runner.import().props.onApply();await runner.flush();assert.equal(runner.review().props.input.packageKey,'plus');assert.equal(runner.review().props.input.commercialReference,general.reference);assert.equal(runner.storage.writes.length,1);
 });
});

test('reopening the same commercial reference preserves all local quotation adjustments without another write',async()=>{
 const previous={...complete,commercialReference:'EK-A1B2C3D4'};delete previous.paymentInstructions;
 await withToolkit(previous,{sequence:1,contact:contact({design:'Granate',packageKey:'plus'})},async runner=>{
  assert.equal(runner.import(),undefined);assert.equal(runner.review().props.input.design,'Lunaria');assert.equal(runner.review().props.input.extrasBs,'270,50');assert.equal(runner.review().props.input.clientName,previous.clientName);
  runner.field('quote-client').props.onChange({target:{value:'QA Familia editada'}});await runner.flush();const writes=runner.storage.writes.length;
  await runner.update({contactRequest:{sequence:2,contact:contact({design:'Granate',packageKey:'plus'})}});
  assert.equal(runner.import(),undefined);assert.equal(runner.review().props.input.clientName,'QA Familia editada');assert.equal(runner.review().props.input.design,'Lunaria');assert.equal(runner.review().props.input.packageKey,'premium');assert.equal(runner.review().props.input.extrasBs,'270,50');assert.equal(runner.storage.writes.length,writes);
 });
});

test('switching to a new contact clears previous customer, date and extras only after replacement is confirmed',async()=>{
 const previous={...complete,commercialReference:'EK-A1B2C3D4'};delete previous.paymentInstructions;
 const next=contact({reference:'EK-00000002',design:'Granate',eventType:'Corporativo',packageKey:'plus'});
 await withToolkit(previous,{sequence:1,contact:next},async runner=>{
  assert.equal(runner.review().props.input.clientName,previous.clientName);assert.equal(runner.storage.writes.length,0);
  runner.import().props.onApply();await runner.flush();const input=runner.review().props.input;
  assert.equal(input.commercialReference,next.reference);assert.equal(input.design,next.design);assert.equal(input.eventType,next.eventType);assert.equal(input.packageKey,next.packageKey);
  assert.equal(input.clientName,undefined);assert.equal(input.eventDate,undefined);assert.equal(input.extrasLabel,undefined);assert.equal(input.extrasBs,0);
  assert.equal(runner.storage.writes.length,1);assert.doesNotMatch(runner.storage.writes[0].value,/QA Familia Pérez|Servicio ficticio|2028-02-29|EK-A1B2C3D4/);
 });
});

test('pending import blocks quotation editing, proposal copy and every quick reply',async()=>{
 await withToolkit(null,{sequence:1,contact:contact()},async runner=>{
  assert.equal(runner.review().props.disabled,true);assert.equal(nodesWhere(runner.tree(),node=>node.type==='fieldset')[0].props.disabled,true);
  const buttons=nodesWhere(runner.tree(),node=>node.type===SalesCopyButton);assert.equal(buttons.length,5);assert.ok(buttons.every(node=>node.props.disabled===true));
  assert.equal(runner.storage.writes.length,0);assert.deepEqual(runner.copied,[]);
 });
});

test('a failed storage write keeps the confirmed contact in memory with an explicit recovery warning',async()=>{
 await withToolkit(null,{sequence:1,contact:contact()},async runner=>{
  runner.import().props.onApply();await runner.flush();
  assert.equal(runner.review().props.input.commercialReference,'EK-A1B2C3D4');assert.equal(runner.review().props.disabled,false);assert.equal(runner.storage.writes.length,1);assert.equal(runner.storage.values.size,0);
  const texts=nodesWhere(runner.tree(),node=>node.type==='p').flatMap(node=>typeof node.props.children==='string'?[node.props.children]:Array.isArray(node.props.children)?node.props.children.filter(value=>typeof value==='string'):[]).join(' ');
  assert.match(texts,/No se pudo guardar o descartar el borrador/);assert.match(texts,/al recargar puede reaparecer el borrador anterior/);assert.deepEqual(runner.copied,[]);
 },{failWrite:true});
});

test('the commercial reference remains visible in the reviewed text and the explicit copied proposal',async()=>{
 const input={...complete,commercialReference:'EK-A1B2C3D4'},html=render(input);assert.match(html,/Referencia comercial: EK-A1B2C3D4/);assert.doesNotMatch(copyButton(html),/\sdisabled(?:=|[\s>])/);
 const {formatSalesQuote}=require('../src/lib/sales-playbook.ts'),value=formatSalesQuote(input),copied=[];
 await withSalesHooks(SalesCopyButton,{value,label:'Copiar propuesta',writeText:async text=>copied.push(text)},async runner=>{
  assert.deepEqual(copied,[]);nodesWhere(runner.tree(),node=>node.type==='button')[0].props.onClick();await runner.flush();
  assert.deepEqual(copied,[value]);assert.match(copied[0],/Referencia comercial: EK-A1B2C3D4/);assert.doesNotMatch(copied[0],/ENK-[A-Z0-9]{6}/);
 });
});

test('a pending quotation request is applied once configuration has finished, without automatically writing a draft',async()=>{
 const storage=fixtureStorage(),calls=[];let finishConfig;
 const transport=async url=>{calls.push(url);return new Promise(resolve=>{finishConfig=()=>resolve(Response.json({paymentInstructions:'',paymentConfigured:false,salesHours:'QA horario',draftScope}));});};
 await withSalesHooks(SalesToolkit,{storage,transport,contactRequest:{sequence:1,contact:contact()}},async runner=>{
  assert.equal(nodesWhere(runner.tree(),node=>node.type===SalesContactImport).length,0);
  assert.equal(nodesWhere(runner.tree(),node=>node.type===SalesQuoteReview)[0].props.disabled,true);assert.equal(storage.writes.length,0);
  finishConfig();await runner.flush();const imported=nodesWhere(runner.tree(),node=>node.type===SalesContactImport);
  assert.equal(imported.length,1);assert.equal(imported[0].props.contact.reference,'EK-A1B2C3D4');assert.equal(storage.writes.length,0);assert.deepEqual(calls,['/api/admin/sales-config']);
 });
});

test('QA cleanup removes only its quotation draft and remounts the restored fictional workspace',async()=>{
 const Workbench=require('../src/app/dev/services/commercial-dashboard/workbench.tsx').default,Dashboard=require('../src/components/admin/CommercialDashboard.tsx').default;
 const qaKey=salesDraftKey('e'.repeat(64)),otherKey=salesDraftKey('f'.repeat(64)),values=new Map([[qaKey,'QA draft to remove'],[otherKey,'Other isolated session draft']]),removed=[];
 await withSalesHooks(Workbench,{},async runner=>{
  window.sessionStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>{removed.push(key);values.delete(key);}};
  const button=text=>nodesWhere(runner.tree(),node=>node.type==='button'&&node.props.children===text)[0];
  nodesWhere(runner.tree(),node=>node.type==='select'&&node.props['aria-label']==='Respuesta QA')[0].props.onChange({target:{value:'offline'}});await runner.flush();
  button('Ocultar Ventas QA').props.onClick();await runner.flush();const previousKey=nodesWhere(runner.tree(),node=>node.type===Dashboard)[0].key;
  button('Limpiar QA').props.onClick();await runner.flush();
  assert.deepEqual(removed,[qaKey]);assert.equal(values.has(qaKey),false);assert.equal(values.get(otherKey),'Other isolated session draft');
  assert.notEqual(nodesWhere(runner.tree(),node=>node.type===Dashboard)[0].key,previousKey);assert.equal(nodesWhere(runner.tree(),node=>node.type==='select'&&node.props['aria-label']==='Respuesta QA')[0].props.value,'ok');
  assert.ok(button('Ocultar Ventas QA'));assert.equal(nodesWhere(runner.tree(),node=>node.type==='div'&&node.props.hidden===false).length,1);
  assert.ok(nodesWhere(runner.tree(),node=>node.type==='p'&&typeof node.props.children==='string'&&node.props.children.includes('Cambios, recibos y borrador ficticios retirados.')).length);
 });
});

test('failed QA draft cleanup reports the failure without resetting or claiming a clean workspace',async()=>{
 const Workbench=require('../src/app/dev/services/commercial-dashboard/workbench.tsx').default,Dashboard=require('../src/components/admin/CommercialDashboard.tsx').default;
 const qaKey=salesDraftKey('e'.repeat(64)),otherKey=salesDraftKey('f'.repeat(64)),values=new Map([[qaKey,'QA draft retained'],[otherKey,'Other session retained']]),removed=[];
 await withSalesHooks(Workbench,{},async runner=>{
  window.sessionStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>{removed.push(key);throw Error('QA storage denied');}};
  const button=text=>nodesWhere(runner.tree(),node=>node.type==='button'&&node.props.children===text)[0];
  nodesWhere(runner.tree(),node=>node.type==='select'&&node.props['aria-label']==='Respuesta QA')[0].props.onChange({target:{value:'offline'}});await runner.flush();
  button('Ocultar Ventas QA').props.onClick();await runner.flush();const previousKey=nodesWhere(runner.tree(),node=>node.type===Dashboard)[0].key;
  button('Limpiar QA').props.onClick();await runner.flush();
  assert.deepEqual(removed,[qaKey]);assert.equal(values.get(qaKey),'QA draft retained');assert.equal(values.get(otherKey),'Other session retained');
  assert.equal(nodesWhere(runner.tree(),node=>node.type===Dashboard)[0].key,previousKey);assert.equal(nodesWhere(runner.tree(),node=>node.type==='select'&&node.props['aria-label']==='Respuesta QA')[0].props.value,'offline');
  assert.ok(button('Volver a Ventas QA'));assert.equal(nodesWhere(runner.tree(),node=>node.type==='div'&&node.props.hidden===true).length,1);
  const notices=nodesWhere(runner.tree(),node=>node.type==='p'&&node.props.role==='status').map(node=>node.props.children).filter(value=>typeof value==='string').join(' ');
  assert.match(notices,/No se pudo retirar el borrador ficticio/);assert.doesNotMatch(notices,/ficticios retirados|se restablecieron/);
 });
});
