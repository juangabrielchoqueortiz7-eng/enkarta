// Explicit quotation hand-off from the real roster; all contacts and storage are fictional.
// In-memory hooks cover transitions and ref calls, not browser layout or device acceptance.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {default:Dashboard,CommercialContactList,CommercialSalesWorkspace}=require('../src/components/admin/CommercialDashboard.tsx');
const Editor=require('../src/components/admin/CommercialLeadEditor.tsx').default,History=require('../src/components/admin/CommercialLeadHistory.tsx').default;
const {default:Toolkit,SalesContactImport,SalesQuoteReview,SalesCopyButton}=require('../src/components/admin/SalesToolkit.tsx');
const {encodeCommercialCursor,parseCommercialDashboard}=require('../src/lib/commercial-dashboard.ts');
const {salesDraftKey}=require('../src/lib/sales-draft.ts');
const scope='a'.repeat(64),asOf='2026-10-19T12:00:00.123456Z',created='2026-10-18T12:00:00.654321Z';
const lead=(number=100,patch={})=>({id:'30000000-0000-4000-8000-'+String(number).padStart(12,'0'),reference:'EK-'+number.toString(16).toUpperCase().padStart(8,'0'),status:'lost',package_key:'premium',design:'Lunaria',event_category:'Boda',placement:'QA roster',utm_source:'QA fictional source',utm_medium:'QA fictional medium',utm_campaign:'QA fictional campaign',referrer_host:'qa.invalid',revenue_bs:930.5,notes:'QA_PRIVATE_NOTES_NEVER_IMPORT',revision:2,created_at:created,updated_at:created,...patch});
function page(status='all',second=false){
 const leads=Array.from({length:second?2:25},(_,index)=>lead((second?75:100)-index)),summary={visits:111,landingViews:111,designViews:17,processViews:4,whatsappOpens:27,contacts:27,reserved:0,sales:0,revenue:0,intentRate:24,conversationRate:100,closeRate:0},group=[{label:'QA fictional',opens:27,contacts:27,sales:0}];
 return{periodDays:180,asOf,syncedAt:asOf,summary,sources:group,campaigns:group,packages:group,events:group,designs:group,statuses:['whatsapp_open','contacted','reserved','won','lost'].map(value=>({status:value,label:value,value:value==='lost'?27:0})),leads,pagination:{size:25,total:27,hasMore:!second,nextCursor:second?null:encodeCommercialCursor({asOf,createdAt:created,id:leads.at(-1).id,status})}};
}
const nodes=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodes(child,predicate))];
const text=value=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):React.isValidElement(value)?text(value.props.children):'';
const memory=()=>{const values=new Map(),reads=[],writes=[],removals=[];return{values,reads,writes,removals,getItem:key=>{reads.push(key);return values.get(key)??null;},setItem:(key,value)=>{writes.push({key,value});values.set(key,value);},removeItem:key=>{removals.push(key);values.delete(key);}};};
const listProps=(leads,patch={})=>({leads,pageIds:new Set(leads.map(row=>row.id)),activeIds:new Set(),openedId:null,onUnpin:()=>{},onSaved:()=>{throw Error('Unexpected save');},onActivityChange:()=>{throw Error('Unexpected edit');},transport:async()=>{throw Error('Unexpected transport');},...patch});
const rowsIn=tree=>nodes(tree,node=>node.type==='div'&&node.props.role==='group'&&typeof node.props.id==='string'&&node.props.id.startsWith('commercial-lead-'));
const cardIn=(tree,id)=>{const row=rowsIn(tree).find(value=>value.props.id==='commercial-lead-'+id);assert.ok(row,'Expected one keyed roster row');return nodes(row,node=>typeof node.type==='function'&&node.props.lead?.id===id)[0];};
const editorIn=card=>nodes(card.type(card.props),node=>node.type===Editor)[0];
const quoteIn=card=>nodes(card.type(card.props),node=>node.type==='button'&&node.props['aria-label']==='Preparar cotización de '+card.props.lead.reference)[0];
const listIn=runner=>nodes(runner.current(),node=>node.type===CommercialContactList)[0];
const renderedList=runner=>CommercialContactList(listIn(runner).props);
const buttonIn=(runner,label)=>nodes(runner.current(),node=>node.type==='button'&&node.props.children===label)[0];
const importIn=runner=>nodes(runner.current(),node=>node.type===SalesContactImport)[0];
const reviewIn=runner=>nodes(runner.current(),node=>node.type===SalesQuoteReview)[0];

// Stable hook identities and dependency-aware effects; no real browser or network.
// Optional host ref spies assert the destination requested by effects, not actual DOM focus.
async function withHooks(Component,initialProps,scenario,options={}){
 const names=['useState','useReducer','useRef','useEffect','useMemo','useCallback','useId'],original=Object.fromEntries(names.map(name=>[name,React[name]])),oldWindow=global.window,oldDocument=global.document,oldFetch=global.fetch;
 const slots=[],snapshots=[],audit=[],wrapped=new Map(),refTargets=new Map(),refCalls=[];let cursor=0,dirty=true,value,props,effects=[],unmounted=false,networkCalls=0;
 const storage=initialProps.storage??memory(),same=(a,b)=>a&&b&&a.length===b.length&&a.every((item,index)=>Object.is(item,b[index]));
 const bind=patch=>{if(typeof patch.transport!=='function')return patch;const fn=patch.transport;if(!wrapped.has(fn))wrapped.set(fn,async(url,init)=>{audit.push({url,method:init?.method??'GET'});return fn(url,init);});return{...patch,transport:wrapped.get(fn)};};props=bind(initialProps);
 React.useState=initial=>{const index=cursor++;if(!(index in slots)){const slot=slots[index]={value:typeof initial==='function'?initial():initial};slot.set=next=>{next=typeof next==='function'?next(slot.value):next;if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}return[slots[index].value,slots[index].set];};
 React.useReducer=(reduce,initial,init)=>{const index=cursor++;if(!(index in slots)){const slot=slots[index]={value:init?init(initial):initial,reduce};slot.dispatch=action=>{const next=slot.reduce(slot.value,action);if(!Object.is(next,slot.value)){slot.value=next;dirty=true;}};}slots[index].reduce=reduce;return[slots[index].value,slots[index].dispatch];};
 React.useRef=initial=>{const index=cursor++;return slots[index]??(slots[index]={current:initial});};
 React.useId=()=>{const index=cursor++;return slots[index]??(slots[index]=':qa-roster-'+index+':');};
 React.useMemo=(compute,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={value:compute(),deps};return slots[index].value;};
 React.useCallback=(callback,deps)=>React.useMemo(()=>callback,deps);
 React.useEffect=(effect,deps)=>{const index=cursor++,previous=slots[index];if(!previous||!same(previous.deps,deps)){const slot={deps,cleanup:previous?.cleanup};slots[index]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=effect();});}};
 global.window={sessionStorage:storage,addEventListener:()=>{},removeEventListener:()=>{},setTimeout,clearTimeout};global.document={getElementById:()=>null};global.fetch=async()=>{networkCalls++;throw Error('Real network is disabled');};
 const attachRefs=()=>{if(!options.refs)return;for(const node of nodes(value,node=>typeof node.type==='string'&&node.ref&&typeof node.ref==='object')){const ref=node.ref,label=node.props['aria-label']??(node.props['aria-expanded']!==undefined?'quote heading':node.type);if(!refTargets.has(ref))refTargets.set(ref,{focus:arg=>refCalls.push({label,method:'focus',arg}),scrollIntoView:arg=>refCalls.push({label,method:'scrollIntoView',arg})});ref.current=refTargets.get(ref);}};
 const flush=async()=>{for(let round=0;round<30;round++){if(dirty&&!unmounted){dirty=false;cursor=0;effects=[];value=Component(props);snapshots.push(value);attachRefs();for(const effect of effects)effect();}await new Promise(resolve=>setImmediate(resolve));if(!dirty||unmounted)return value;}throw Error('Roster component effects did not settle');};
 const unmount=()=>{if(unmounted)return;unmounted=true;for(const slot of slots)slot?.cleanup?.();};
 const runner={flush,current:()=>value,snapshots,storage,audit,refCalls,unmount,update:async patch=>{props={...props,...bind(patch)};dirty=true;return flush();}};
 try{await flush();return await scenario(runner);}finally{unmount();for(const name of names)React[name]=original[name];if(oldWindow===undefined)delete global.window;else global.window=oldWindow;if(oldDocument===undefined)delete global.document;else global.document=oldDocument;global.fetch=oldFetch;assert.equal(networkCalls,0);assert.ok(audit.every(call=>call.method==='GET'),'Quotation hand-off must never PATCH a commercial contact');}
}
async function withDashboard(scenario){
 const storage=memory(),calls=[],transport=async(url,options)=>{calls.push({url,method:options?.method??'GET'});const query=new URL(url,'https://qa.invalid');assert.equal(query.pathname,'/api/admin/commercial');const status=query.searchParams.get('status'),body=page(status,query.searchParams.has('cursor'));assert.ok(parseCommercialDashboard(body,status));return Response.json(body);};
 return withHooks(Dashboard,{transport,storage},async runner=>{assert.ok(runner.current().props.navigation.data);return scenario({...runner,calls});});
}
const config=()=>({paymentInstructions:'QA fictitious instructions, no real payment',paymentConfigured:true,salesHours:'QA hours',draftScope:scope});
const previousQuote={packageKey:'premium',eventType:'Boda',clientName:'QA previous family',eventDate:'2028-02-29',design:'Lunaria',extrasBs:'270,50',extrasLabel:'QA previous service',commercialReference:'EK-00000001'};
const seedQuote=storage=>storage.values.set(salesDraftKey(scope),JSON.stringify({version:2,scope,savedAt:Date.now(),input:previousQuote}));
async function withToolkit(request,scenario,{previous=false,transport:override,refs=false}={}){
 const storage=memory(),calls=[],copies=[];if(previous)seedQuote(storage);
 const transport=override??(async(url,options)=>{calls.push({url,method:options?.method??'GET'});assert.equal(url,'/api/admin/sales-config');return Response.json(config());});
 await withHooks(Toolkit,{storage,transport,contactRequest:request,writeText:async value=>copies.push(value)},async runner=>{await scenario({...runner,calls,copies});if(!override)assert.deepEqual(calls,[{url:'/api/admin/sales-config',method:'GET'}]);},{refs});
}
const requestFromList=async(patch={})=>withDashboard(async runner=>{const list=listIn(runner),selected={...list.props.leads[0],...patch};list.props.onQuote(selected);await runner.flush();return runner.current().props.quoteRequest;});

test('a valid roster card offers one explicit native quote button without invoking it on render',()=>{
 const selected=Object.freeze(lead()),calls=[],props=listProps([selected],{onQuote:value=>calls.push(value)}),tree=CommercialContactList(props),card=cardIn(tree,selected.id),button=quoteIn(card);
 assert.ok(button);assert.equal(button.props.type,'button');assert.equal(button.props.children,'Preparar cotización');assert.equal(button.props['aria-label'],'Preparar cotización de '+selected.reference);assert.match(button.props.className,/min-h-11/);assert.match(button.props.className,/focus-visible/);assert.deepEqual(calls,[]);
 const before=JSON.stringify(selected);button.props.onClick();assert.deepEqual(calls,[selected]);assert.strictEqual(calls[0],selected);assert.equal(JSON.stringify(selected),before);assert.equal(editorIn(card).props.lead,selected);assert.equal(nodes(card.type(card.props),node=>node.type===History).length,1);
});

test('missing callback or invalid quotation context cannot expose a roster quote action',()=>{
 const base=lead();assert.equal(quoteIn(cardIn(CommercialContactList(listProps([base])),base.id)),undefined);
 for(const patch of [{reference:'EK-INVALID'},{revision:-1},{package_key:'unknown'},{event_category:'QA\ninvalid'},{design:'x'.repeat(101)},{notes:undefined}]){
  const selected={...base,...patch},tree=CommercialContactList(listProps([selected],{onQuote:()=>{throw Error('Invalid quote callback');}}));assert.equal(quoteIn(cardIn(tree,selected.id)),undefined);
 }
});

test('only visible, active or pinned cards expose the quote action and each retains one keyed editor',()=>{
 const visible=lead(100),active=lead(99),pinned=lead(98),hidden=lead(97),all=[visible,active,pinned,hidden],calls=[];
 const tree=CommercialContactList(listProps(all,{pageIds:new Set([visible.id]),activeIds:new Set([active.id]),openedId:pinned.id,onQuote:value=>calls.push(value)})),rows=rowsIn(tree);
 assert.equal(rows.length,3);assert.equal(rows.some(row=>row.props.id==='commercial-lead-'+hidden.id),false);assert.equal(new Set(rows.map(row=>row.key)).size,3);
 for(const selected of [visible,active,pinned]){const card=cardIn(tree,selected.id);assert.equal(nodes(card.type(card.props),node=>node.type===Editor).length,1);quoteIn(card).props.onClick();}
 assert.deepEqual(calls.map(value=>value.id),[visible.id,active.id,pinned.id]);assert.equal(all.length,4);
});

test('the real dashboard hand-off whitelists quotation context and performs no contact, payment or storage mutation',async()=>{
 await withDashboard(async runner=>{
  const before=runner.current().props.navigation,list=listIn(runner),selected=list.props.leads[0],prior=JSON.stringify(selected),editor=editorIn(cardIn(renderedList(runner),selected.id));
  assert.equal(runner.current().props.quoteRequest,null);quoteIn(cardIn(renderedList(runner),selected.id)).props.onClick();await runner.flush();
  const request=runner.current().props.quoteRequest;assert.deepEqual(request,{sequence:1,contact:{reference:selected.reference,eventType:'Boda',design:'Lunaria',packageKey:'premium'}});assert.deepEqual(Object.keys(request.contact).sort(),['design','eventType','packageKey','reference']);assert.doesNotMatch(JSON.stringify(request),/QA_PRIVATE|utm_|revenue|revision|placement|referrer|30000000/);
  assert.strictEqual(runner.current().props.navigation,before);assert.strictEqual(listIn(runner).props.leads,list.props.leads);assert.strictEqual(editorIn(cardIn(renderedList(runner),selected.id)).props.lead,editor.props.lead);assert.equal(JSON.stringify(selected),prior);assert.equal(runner.calls.length,1);assert.deepEqual(runner.storage.writes,[]);assert.deepEqual(runner.storage.removals,[]);
 });
});

test('the dashboard validates a direct hand-off again and does not replace a valid request with invalid data',async()=>{
 await withDashboard(async runner=>{
  const list=listIn(runner),selected=list.props.leads[0];list.props.onQuote({...selected,session_hash:'QA_PRIVATE',payload:{token:'QA_PRIVATE'}});await runner.flush();const valid=runner.current().props.quoteRequest;
  for(const patch of [{id:'bad'},{reference:'ENK-QA0000'},{event_category:'QA\ninvalid'},{package_key:'unknown'},{revision:-1}]){listIn(runner).props.onQuote({...selected,...patch});await runner.flush();assert.strictEqual(runner.current().props.quoteRequest,valid);}
  assert.equal(valid.sequence,1);assert.equal(runner.calls.length,1);assert.deepEqual(runner.storage.writes,[]);assert.doesNotMatch(JSON.stringify(valid),/QA_PRIVATE/);
 });
});

test('known and general contacts keep their exact commercial reference without inventing a default package',async()=>{
 const known=await requestFromList({package_key:'exclusive',event_category:'XV años',design:'Granate'}),general=await requestFromList({package_key:'general',event_category:'Corporativo',design:''});
 assert.deepEqual(known.contact,{reference:lead().reference,eventType:'XV años',design:'Granate',packageKey:'exclusive'});assert.deepEqual(general.contact,{reference:lead().reference,eventType:'Corporativo',design:'',packageKey:null});assert.equal(known.sequence,1);assert.equal(general.sequence,1);
});

test('quoting a pinned historical contact preserves active editors, filter, second page and full metrics',async()=>{
 await withDashboard(async runner=>{
  nodes(runner.current(),node=>node.type==='select'&&node.props['aria-label']==='Filtrar contactos')[0].props.onChange({target:{value:'lost'}});await runner.flush();
  const selected=listIn(runner).props.leads[0],historical=lead(999,{reference:'EK-A1B2C3D4',created_at:'2001-01-01T12:00:00Z',updated_at:'2001-01-01T12:00:00Z'});listIn(runner).props.onActivityChange(selected.id,true);runner.current().props.onOpenLead(historical);await runner.flush();
  buttonIn(runner,'Siguiente').props.onClick();await runner.flush();const before=runner.current().props.navigation,list=listIn(runner),tree=renderedList(runner),pinnedCard=cardIn(tree,historical.id),oldEditor=editorIn(pinnedCard),rowKeys=rowsIn(tree).map(row=>row.key);
  assert.equal(before.location.index,1);assert.equal(before.location.query.status,'lost');assert.equal(before.data.leads.length,2);assert.equal(before.data.summary.whatsappOpens,27);assert.equal(list.props.openedId,historical.id);assert.equal(list.props.activeIds.has(selected.id),true);assert.equal(list.props.pageIds.has(historical.id),false);assert.equal(list.props.leads.length,4);
  quoteIn(pinnedCard).props.onClick();await runner.flush();assert.strictEqual(runner.current().props.navigation,before);assert.strictEqual(listIn(runner).props.leads,list.props.leads);assert.strictEqual(listIn(runner).props.activeIds,list.props.activeIds);assert.strictEqual(listIn(runner).props.pageIds,list.props.pageIds);assert.equal(listIn(runner).props.openedId,historical.id);assert.deepEqual(rowsIn(renderedList(runner)).map(row=>row.key),rowKeys);assert.strictEqual(editorIn(cardIn(renderedList(runner),historical.id)).type,oldEditor.type);assert.strictEqual(editorIn(cardIn(renderedList(runner),historical.id)).props.lead,oldEditor.props.lead);
  assert.equal(runner.current().props.quoteRequest.contact.reference,historical.reference);assert.equal(runner.calls.length,3);assert.deepEqual(runner.storage.writes,[]);assert.equal(text(runner.current()).includes('Página 2'),true);
 });
});

test('repeat roster actions create explicit request sequences without duplicating editors or reloading the roster',async()=>{
 await withDashboard(async runner=>{
  const selected=listIn(runner).props.leads[0],before=listIn(runner).props.leads;for(let sequence=1;sequence<=3;sequence++){quoteIn(cardIn(renderedList(runner),selected.id)).props.onClick();await runner.flush();assert.equal(runner.current().props.quoteRequest.sequence,sequence);assert.equal(runner.current().props.quoteRequest.contact.reference,selected.reference);}
  assert.strictEqual(listIn(runner).props.leads,before);assert.equal(rowsIn(renderedList(runner)).length,25);assert.equal(runner.calls.length,1);assert.deepEqual(runner.storage.writes,[]);
 });
});

test('workspace composition forwards the one request to the existing toolkit without moving the editor children',async()=>{
 await withDashboard(async runner=>{
  const before=CommercialSalesWorkspace(runner.current().props),first=React.Children.toArray(before.props.children),children=runner.current().props.children,selected=listIn(runner).props.leads[0];quoteIn(cardIn(renderedList(runner),selected.id)).props.onClick();await runner.flush();
  const after=CommercialSalesWorkspace(runner.current().props),next=React.Children.toArray(after.props.children),toolkits=nodes(after,node=>node.type===Toolkit);assert.equal(toolkits.length,1);assert.deepEqual(toolkits[0].props.contactRequest,runner.current().props.quoteRequest);assert.strictEqual(runner.current().props.children[0].type,children[0].type);
  assert.deepEqual(first.map(node=>[node.type,node.key]),next.map(node=>[node.type,node.key]));assert.strictEqual(next[0].type,Toolkit);assert.equal(nodes(after,node=>node.type===CommercialContactList).length,1);assert.equal(runner.calls.length,1);
 });
});

test('a real roster request opens explicit import review and cancellation preserves the recovered quote without writing',async()=>{
 const request=await requestFromList();await withToolkit(request,async runner=>{
  assert.equal(nodes(runner.current(),node=>node.type==='button'&&node.props['aria-expanded']===true).length,1);assert.ok(importIn(runner));assert.equal(importIn(runner).props.replacing,true);assert.equal(reviewIn(runner).props.input.clientName,previousQuote.clientName);assert.equal(reviewIn(runner).props.disabled,true);assert.equal(nodes(runner.current(),node=>node.type==='fieldset')[0].props.disabled,true);assert.ok(nodes(runner.current(),node=>node.type===SalesCopyButton).every(node=>node.props.disabled===true));assert.deepEqual(runner.storage.writes,[]);
  importIn(runner).props.onCancel();await runner.flush();assert.equal(importIn(runner),undefined);for(const[key,value]of Object.entries(previousQuote))assert.equal(reviewIn(runner).props.input[key],value);assert.deepEqual(runner.storage.writes,[]);assert.deepEqual(runner.storage.removals,[]);assert.deepEqual(runner.copies,[]);
 },{previous:true});
});

test('known roster context replaces previous customer and extras only after explicit import confirmation',async()=>{
 const request=await requestFromList({package_key:'exclusive',design:'Granate',event_category:'XV años'});await withToolkit(request,async runner=>{
  assert.deepEqual(runner.storage.writes,[]);assert.equal(importIn(runner).props.packageKey,'exclusive');importIn(runner).props.onApply();await runner.flush();const input=reviewIn(runner).props.input;
  assert.equal(input.commercialReference,request.contact.reference);assert.equal(input.packageKey,'exclusive');assert.equal(input.eventType,'XV años');assert.equal(input.design,'Granate');assert.equal(input.extrasBs,0);assert.equal(input.clientName,undefined);assert.equal(input.eventDate,undefined);assert.equal(input.extrasLabel,undefined);assert.equal(runner.storage.writes.length,1);
  const local=JSON.parse(runner.storage.writes[0].value);assert.equal(local.input.commercialReference,request.contact.reference);assert.doesNotMatch(runner.storage.writes[0].value,/QA_PRIVATE|previous family|previous service|2028-02-29|paymentInstructions|utm_/);assert.equal(reviewIn(runner).props.disabled,false);assert.deepEqual(runner.copies,[]);
 },{previous:true});
});

test('a general roster contact remains blocked until a package is selected in explicit review',async()=>{
 const request=await requestFromList({package_key:'general'});await withToolkit(request,async runner=>{
  assert.equal(importIn(runner).props.packageKey,'');const html=renderToStaticMarkup(React.createElement(SalesContactImport,importIn(runner).props));assert.match(html,/no se asignará automáticamente/);assert.match(html,/<button[^>]*disabled/);importIn(runner).props.onApply();await runner.flush();assert.ok(importIn(runner));assert.deepEqual(runner.storage.writes,[]);
  importIn(runner).props.onPackage('plus');await runner.flush();importIn(runner).props.onApply();await runner.flush();assert.equal(reviewIn(runner).props.input.packageKey,'plus');assert.equal(reviewIn(runner).props.input.commercialReference,request.contact.reference);assert.equal(runner.storage.writes.length,1);assert.deepEqual(runner.copies,[]);
 });
});

test('same-reference roster hand-off continues the saved quotation without resetting customer or local adjustments',async()=>{
 const request=await requestFromList();await withToolkit(request,async runner=>{
  assert.ok(importIn(runner));importIn(runner).props.onApply();await runner.flush();
  nodes(runner.current(),node=>node.props.name==='quote-client')[0].props.onChange({target:{value:'QA retained family'}});await runner.flush();nodes(runner.current(),node=>node.props.name==='quote-extras')[0].props.onChange({target:{value:'199,50'}});await runner.flush();const writes=runner.storage.writes.length;
  await runner.update({contactRequest:{sequence:request.sequence+1,contact:{...request.contact,packageKey:'plus',design:'Granate'}}});assert.equal(importIn(runner),undefined);assert.equal(reviewIn(runner).props.input.clientName,'QA retained family');assert.equal(reviewIn(runner).props.input.extrasBs,'199,50');assert.equal(reviewIn(runner).props.input.packageKey,'premium');assert.equal(reviewIn(runner).props.input.design,'Lunaria');assert.equal(runner.storage.writes.length,writes);assert.match(text(runner.current()),/Se conservaron tus datos y ajustes/);
 });
});

test('a roster request waiting for configuration targets the quote heading, then the explicit review when ready',async()=>{
 const request=await requestFromList(),pending={};pending.promise=new Promise(resolve=>pending.resolve=resolve);let calls=0;
 await withToolkit(request,async runner=>{
  assert.equal(calls,1);assert.equal(importIn(runner),undefined);assert.equal(reviewIn(runner).props.disabled,true);assert.match(text(runner.current()),/Comprobando configuración/);assert.equal(nodes(runner.current(),node=>node.props['aria-expanded']===true).length,1);assert.ok(runner.refCalls.some(call=>call.label==='quote heading'&&call.method==='focus'));assert.ok(runner.refCalls.some(call=>call.label==='quote heading'&&call.method==='scrollIntoView'&&call.arg.behavior==='auto'));assert.deepEqual(runner.storage.writes,[]);
  pending.resolve(Response.json(config()));await runner.flush();assert.ok(importIn(runner));const reviewLabel='Revisar cotización para '+request.contact.reference;assert.ok(runner.refCalls.some(call=>call.label===reviewLabel&&call.method==='focus'));assert.ok(runner.refCalls.some(call=>call.label===reviewLabel&&call.method==='scrollIntoView'));assert.deepEqual(runner.storage.writes,[]);assert.deepEqual(runner.copies,[]);assert.equal(calls,1);
 },{transport:async()=>{calls++;return pending.promise;},refs:true});
});

