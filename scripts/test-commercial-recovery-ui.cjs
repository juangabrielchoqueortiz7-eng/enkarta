// Reconciliation and server-render contracts. No browser, production data or clipboard.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {default:Dashboard,CommercialSalesWorkspace:Workspace,CommercialDashboardFeedback:Feedback,CommercialContactList:ContactList}=require('../src/components/admin/CommercialDashboard.tsx');
const SalesToolkit=require('../src/components/admin/SalesToolkit.tsx').default;
const ReferenceSearch=require('../src/components/admin/CommercialReferenceSearch.tsx').default;
const {updateCommercialSearchResult:refreshSnapshot}=require('../src/components/admin/CommercialReferenceSearch.tsx');
const Summary=require('../src/components/admin/CommercialLeadSummary.tsx').default;
const {createCommercialNavigation:initial,commercialNavigationReducer:reduce,commercialRetryLocation:retry}=require('../src/lib/commercial-navigation.ts');
const anchor='2026-10-19T12:00:00.123456Z';
const target={query:{status:'lost',cursor:{asOf:anchor,createdAt:'2026-10-18T12:00:00.654321Z',id:'30000000-0000-4000-8000-000000000099',status:'lost'}},index:1,previous:[null]};
let requests=0;
const transport=async()=>{requests++;throw Error('No network is allowed during render');};
const start=(state=initial())=>reduce(state,{type:'start',sequence:state.sequence+1,target});
const failure=(state=start(),message='Revisa tu conexión.')=>reduce(state,{type:'failed',sequence:state.sequence,message});
const render=navigation=>renderToStaticMarkup(React.createElement(Workspace,{navigation,transport,onRetry:()=>{}},navigation.data?React.createElement('p',null,'QA datos anteriores'):null));
const descendants=element=>React.Children.toArray(element.props.children);

test('the actual initial dashboard exposes both independent tools before metrics are available',()=>{
  const html=renderToStaticMarkup(React.createElement(Dashboard,{transport}));
  assert.match(html,/Cotiza y responde sin improvisar/);assert.match(html,/Buscar referencia de WhatsApp/);
  assert.match(html,/Cargando el embudo de Ventas/);assert.match(html,/Contactos de WhatsApp/);
  assert.doesNotMatch(html,/Ingresos registrados|Página 1 ·|No hay contactos en este estado/);
  assert.equal(requests,0);
});

test('an initial dashboard failure leaves quotation and reference tools available beside an explicit retry',()=>{
  const html=render(failure());
  assert.match(html,/Cotiza y responde sin improvisar/);assert.match(html,/Buscar referencia de WhatsApp/);
  assert.match(html,/Puedes seguir usando el cotizador y la búsqueda por referencia/);
  assert.match(html,/Reintentar carga solicitada/);assert.doesNotMatch(html,/QA datos anteriores/);
});

test('tools retain their React type, key and parent position across load, failure, retry and success',()=>{
  const failed=failure(),pending=start(failed),ready=reduce(pending,{type:'loaded',sequence:pending.sequence,data:{qa:true}});
  const states=[initial(),failed,pending,ready,start(ready),failure(start(ready))];
  const children=React.createElement('p',null,'QA previous metrics');
  const trees=states.map(navigation=>Workspace({navigation,transport,onRetry:()=>{},children}));
  const baseline=descendants(trees[0]);
  for(const tree of trees){
    assert.equal(tree.type,'div');const nodes=descendants(tree);
    assert.equal(nodes[0].type,SalesToolkit);assert.equal(nodes[1].type,ReferenceSearch);
    assert.equal(nodes[0].key,baseline[0].key);assert.equal(nodes[1].key,baseline[1].key);
    assert.equal(nodes[0].props.transport,transport);assert.equal(nodes[1].props.transport,transport);
    assert.equal(nodes[2].type,Feedback);assert.equal(nodes[3].props.children,'QA previous metrics');
  }
});

test('failed pagination names the attempted page and filter while identifying previously loaded data',()=>{
  let state=reduce(initial(),{type:'loaded',sequence:0,data:{qa:true}});
  state=failure(start(state));const html=render(state);
  assert.match(html,/la página 2 de «No concretó»/);assert.match(html,/Los datos visibles corresponden a la carga anterior/);
  assert.match(html,/QA datos anteriores/);assert.doesNotMatch(html,/Puedes seguir usando el cotizador/);
});

test('the recovery button invokes one explicit retry carrying the unsuccessful destination',()=>{
  const navigation=failure(),attempts=[];
  const feedback=Feedback({navigation,onRetry:()=>attempts.push(retry(navigation))});
  const button=descendants(feedback).find(node=>node.type==='button');
  assert.ok(button);assert.equal(button.props.type,'button');assert.equal(button.props.disabled,false);
  assert.equal(attempts.length,0);button.props.onClick();assert.deepEqual(attempts,[target]);
});

test('initial retry and ready states do not keep a stale error or extra retry button',()=>{
  const failed=failure(),pending=start(failed),ready=reduce(pending,{type:'loaded',sequence:pending.sequence,data:{qa:true}});
  const retryMarkup=render(pending);assert.match(retryMarkup,/Cargando el embudo/);assert.doesNotMatch(retryMarkup,/Revisa tu conexión|Reintentar carga/);
  assert.equal(Feedback({navigation:ready,onRetry:()=>{}}),null);
});

test('recovery feedback escapes unexpected text and retains accessible error and button semantics',()=>{
  const html=render(failure(start(),'<script>QA ficticio</script>'));
  assert.match(html,/&lt;script&gt;QA ficticio&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/);
  assert.match(html,/role="alert"/);assert.match(html,/aria-label="Recuperación del embudo"/);
  assert.match(html,/<button type="button"/);assert.match(html,/min-h-11/);assert.match(html,/focus-visible:outline/);
});

test('every workspace state renders each tool once and performs no requests during rendering',()=>{
  for(const state of [initial(),failure(),start(failure())]){
    const html=render(state);assert.equal((html.match(/Cotiza y responde sin improvisar/g)||[]).length,1);
    assert.equal((html.match(/Buscar referencia de WhatsApp/g)||[]).length,1);
  }
  assert.equal(requests,0);
});

const lead=(patch={})=>({id:'30000000-0000-4000-8000-000000000100',reference:'EK-A1B2C3D4',status:'contacted',package_key:'premium',design:'Lunaria',event_category:'Boda',placement:'qa',utm_source:'QA pruebas locales',utm_medium:'',utm_campaign:'',referrer_host:'',revenue_bs:null,notes:'QA nota ficticia',revision:0,created_at:anchor,updated_at:anchor,...patch});
const listProps=(rows,patch={})=>({leads:rows,pageIds:new Set(rows.map(row=>row.id)),activeIds:new Set(),openedId:null,onUnpin:()=>{},onSaved:()=>{},onActivityChange:()=>{},transport,...patch});
const nodesWhere=(element,predicate)=>!React.isValidElement(element)?[]:[...(predicate(element)?[element]:[]),...React.Children.toArray(element.props.children).flatMap(child=>nodesWhere(child,predicate))];

test('the workspace opens the looked-up contact only after its explicit summary action',()=>{
 const found=lead(),opened=[],tree=Workspace({navigation:failure(),onRetry:()=>{},transport,onOpenLead:value=>opened.push(value)});
 const search=descendants(tree).find(node=>node.type===ReferenceSearch),summary=search.props.renderLead(found);
 assert.equal(summary.type,Summary);assert.equal(summary.props.lead,found);assert.deepEqual(opened,[]);
 const button=nodesWhere(Summary(summary.props),node=>node.type==='button').find(node=>node.props.children==='Abrir seguimiento');
 assert.ok(button);assert.equal(button.props.type,'button');button.props.onClick();assert.deepEqual(opened,[found]);
 assert.equal(requests,0);
});

test('a summary without an opening callback stays read only and creates no second editor',()=>{
 const html=renderToStaticMarkup(React.createElement(Summary,{lead:lead(),transport}));
 assert.match(html,/Consulta de solo lectura/);assert.doesNotMatch(html,/Abrir seguimiento|<form\b|name="lead-status"/);assert.equal(requests,0);
});

test('opening a contact already on the page renders exactly one editing form',()=>{
 const found=lead(),props=listProps([found],{openedId:found.id}),html=renderToStaticMarkup(React.createElement(ContactList,props));
 assert.equal((html.match(/<form\b/g)||[]).length,1);assert.equal((html.match(/name="lead-status"/g)||[]).length,1);
 assert.match(html,/Ficha abierta por referencia/);assert.doesNotMatch(html,/Este contacto está fuera de la página/);
 assert.match(html,new RegExp(`id="commercial-lead-${found.id}"`));assert.match(html,/tabindex="-1"/);assert.match(html,/aria-label="Seguimiento de EK-A1B2C3D4"/);assert.equal(requests,0);
});

test('a clean contact from 2001 remains editable outside an empty reporting page',()=>{
 const historic=lead({created_at:'2001-01-01T12:00:00Z',updated_at:'2001-01-01T12:00:00Z'}),props=listProps([historic],{openedId:historic.id,pageIds:new Set()});
 const html=renderToStaticMarkup(React.createElement(ContactList,props));
 assert.equal((html.match(/<form\b/g)||[]).length,1);assert.match(html,/2001/);assert.match(html,/Este contacto está fuera de la página o el filtro actual/);
 assert.match(html,/Las métricas siguen limitadas a los últimos 180 días/);assert.match(html,/Guardar cambios/);assert.equal(requests,0);
});

test('pending contacts cannot be unpinned and remain visible beside a newly opened reference',()=>{
 const pending=lead(),opened=lead({id:'30000000-0000-4000-8000-000000000101',reference:'EK-A1B2C3D5'});
 const props=listProps([pending,opened],{pageIds:new Set(),activeIds:new Set([pending.id,opened.id]),openedId:opened.id});
 const html=renderToStaticMarkup(React.createElement(ContactList,props));
 assert.equal((html.match(/<form\b/g)||[]).length,2);assert.match(html,/Cambios pendientes fuera de la página actual/);
 assert.match(html,/Guarda, comprueba o descarta sus cambios antes de dejar de fijarla/);
 const button=nodesWhere(ContactList(props),node=>node.type==='button').find(node=>node.props.children==='Dejar de fijar ficha');
 assert.ok(button);assert.equal(button.props.disabled,true);
});

test('clean opened contacts offer an explicit unpin action without writing a contact',()=>{
 const found=lead(),unpins=[],props=listProps([found],{pageIds:new Set(),openedId:found.id,onUnpin:()=>unpins.push(found.id)});
 const button=nodesWhere(ContactList(props),node=>node.type==='button').find(node=>node.props.children==='Dejar de fijar ficha');
 assert.ok(button);assert.equal(button.props.disabled,false);assert.equal(unpins.length,0);button.props.onClick();assert.deepEqual(unpins,[found.id]);assert.equal(requests,0);
});

test('a contact keeps the same React parent, row key and editor type when the page changes',()=>{
 const opened=lead(),other=lead({id:'30000000-0000-4000-8000-000000000101',reference:'EK-A1B2C3D5'});
 const before=ContactList(listProps([opened,other],{openedId:opened.id}));
 const after=ContactList(listProps([other,opened],{openedId:opened.id,pageIds:new Set([other.id])}));
 assert.equal(before.type,after.type);
 const row=tree=>descendants(tree).find(node=>node.props.id===`commercial-lead-${opened.id}`),oldRow=row(before),newRow=row(after);
 assert.ok(oldRow);assert.ok(newRow);assert.equal(oldRow.key,newRow.key);assert.equal(oldRow.type,newRow.type);
 const oldCard=descendants(oldRow).find(node=>typeof node.type==='function'),newCard=descendants(newRow).find(node=>typeof node.type==='function');
 assert.equal(oldCard.type,newCard.type);assert.equal(oldCard.props.lead,opened);assert.equal(newCard.props.lead,opened);
});

test('an opened historical editor survives all workspace loading and failure feedback states',()=>{
 const historic=lead({created_at:'2001-01-01T12:00:00Z'}),list=React.createElement(ContactList,listProps([historic],{pageIds:new Set(),openedId:historic.id}));
 for(const navigation of [initial(),failure(),start(failure())]){
  const html=renderToStaticMarkup(React.createElement(Workspace,{navigation,transport,onRetry:()=>{}},list));
  assert.equal((html.match(/<form\b/g)||[]).length,2); // Search plus the existing contact editor.
  assert.equal((html.match(/name="lead-status"/g)||[]).length,1);assert.match(html,/Ficha abierta por referencia/);
 }
 assert.equal(requests,0);
});

test('a confirmed revision updates the current search snapshot and the history input',()=>{
 const before=lead(),result={reference:before.reference,lead:before},saved=lead({revision:2,status:'reserved',notes:'QA reserva confirmada',revenue_bs:200});
 const refreshed=refreshSnapshot(result,saved);assert.notStrictEqual(refreshed,result);assert.deepEqual(refreshed,{reference:saved.reference,lead:saved});
 const summary=Summary({lead:refreshed.lead,transport}),history=nodesWhere(summary,node=>typeof node.type==='function').find(node=>node.props.lead);
 assert.ok(history);assert.equal(history.props.lead.revision,2);assert.equal(result.lead.revision,0);
});

test('search snapshots cannot roll back to an older or equal revision',()=>{
 const current=lead({revision:3,notes:'QA versión actual'}),result={reference:current.reference,lead:current};
 for(const revision of [0,2,3])assert.strictEqual(refreshSnapshot(result,lead({revision,notes:'QA consulta anterior'})),result);
});

test('saving cannot resurrect a cleared, absent or different reference result',()=>{
 const saved=lead({revision:2}),missing={reference:saved.reference,lead:null},otherLead=lead({id:'30000000-0000-4000-8000-000000000101',reference:'EK-A1B2C3D5'}),other={reference:otherLead.reference,lead:otherLead};
 assert.equal(refreshSnapshot(null,saved),null);assert.strictEqual(refreshSnapshot(missing,saved),missing);assert.strictEqual(refreshSnapshot(other,saved),other);
 const crossed={reference:otherLead.reference,lead:lead()};assert.strictEqual(refreshSnapshot(crossed,saved),crossed);
});

test('updated snapshots reject malformed contacts and strip unexpected private fields',()=>{
 const current=lead(),result={reference:current.reference,lead:current},incoming=lead({revision:1,password:'QA_PRIVATE_PASSWORD',session_hash:'QA_PRIVATE_SESSION'});
 const updated=refreshSnapshot(result,incoming);assert.equal(updated.lead.revision,1);assert.doesNotMatch(JSON.stringify(updated),/QA_PRIVATE/);assert.equal(incoming.password,'QA_PRIVATE_PASSWORD');
 for(const value of [null,undefined,{},lead({revision:-1}),lead({id:'bad'}),lead({notes:undefined})])assert.strictEqual(refreshSnapshot(result,value),result);
});

// Execute the actual dashboard callbacks with a small in-memory hook runner. Effects are
// intentionally withheld: this is state/reconciliation coverage, not a browser or focus test.
async function withDashboardHooks(scenario){
 const names=['useState','useReducer','useRef','useEffect','useCallback','useMemo'],original=Object.fromEntries(names.map(name=>[name,React[name]]));
 const values=[],refs=[];let stateIndex=0,refIndex=0;
 React.useState=initialValue=>{const index=stateIndex++;if(!(index in values))values[index]=typeof initialValue==='function'?initialValue():initialValue;return[values[index],value=>{values[index]=typeof value==='function'?value(values[index]):value;}];};
 React.useReducer=(reducer,initialValue,init)=>[init?init(initialValue):initialValue,()=>{}];
 React.useRef=initialValue=>{const index=refIndex++;return refs[index]??(refs[index]={current:initialValue});};
 React.useEffect=()=>{};React.useCallback=value=>value;React.useMemo=compute=>compute();
 const renderActual=transportOverride=>{stateIndex=0;refIndex=0;return Dashboard({transport:transportOverride});};
 try{return await scenario(renderActual);}finally{for(const name of names)React[name]=original[name];}
}

test('a late save acknowledgement cannot replace a newer canonical search snapshot',async()=>{
 await withDashboardHooks(async renderActual=>{
  let calls=0;const fakeTransport=async()=>{calls++;throw Error('QA deliberate metrics failure');};
  const newest=lead({revision:2,notes:'QA versión de otro dispositivo'}),ack=lead({revision:1,notes:'QA confirmación anterior'});
  let tree=renderActual(fakeTransport);assert.equal(tree.type,Workspace);tree.props.onOpenLead(newest);
  tree=renderActual(fakeTransport);
  const list=nodesWhere(tree,node=>node.type===ContactList)[0];assert.ok(list);assert.equal(list.props.leads[0].revision,2);
  list.props.onSaved(ack);
  tree=renderActual(fakeTransport);assert.equal(tree.props.latestLead.revision,2);assert.equal(tree.props.latestLead.notes,newest.notes);
  const updated=refreshSnapshot({reference:newest.reference,lead:lead()},tree.props.latestLead);assert.equal(updated.lead.revision,2);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);
 });
});

test('quotation is requested only through the explicit summary action and forwarded to the existing toolkit',()=>{
 const found=lead(),quoted=[],opened=[],request={sequence:7,contact:{reference:found.reference,eventType:'Boda',design:'Lunaria',packageKey:'premium'}};
 const tree=Workspace({navigation:failure(),onRetry:()=>{},transport,onQuoteLead:value=>quoted.push(value),onOpenLead:value=>opened.push(value),quoteRequest:request});
 const children=descendants(tree),toolkit=children.find(node=>node.type===SalesToolkit),search=children.find(node=>node.type===ReferenceSearch);
 assert.strictEqual(toolkit.props.contactRequest,request);assert.deepEqual(quoted,[]);assert.deepEqual(opened,[]);
 const summary=search.props.renderLead(found),button=nodesWhere(Summary(summary.props),node=>node.type==='button').find(node=>node.props.children==='Preparar cotización');
 assert.ok(button);assert.equal(button.props.type,'button');button.props.onClick();assert.deepEqual(quoted,[found]);assert.deepEqual(opened,[]);
 assert.equal(children.filter(node=>node.type===SalesToolkit).length,1);assert.equal(requests,0);
});

test('quotation action stays absent without authorization from its parent or valid contact context',()=>{
 const withoutAction=renderToStaticMarkup(React.createElement(Summary,{lead:lead(),transport}));assert.doesNotMatch(withoutAction,/Preparar cotización/);
 const tree=Workspace({navigation:failure(),onRetry:()=>{},transport,onQuoteLead:()=>{throw Error('Invalid contact must not be quoted');}});
 const search=descendants(tree).find(node=>node.type===ReferenceSearch);
 const invalid=search.props.renderLead(lead({reference:'EK-INVALID'}));assert.equal(invalid.props.onQuote,undefined);
 const general=search.props.renderLead(lead({package_key:'general'}));assert.equal(typeof general.props.onQuote,'function');assert.equal(requests,0);
});

test('actual dashboard quotation requests preserve the open pending editor and include only the quotation context',async()=>{
 await withDashboardHooks(async renderActual=>{
  const pending=lead(),found=Object.freeze(lead({id:'30000000-0000-4000-8000-000000000101',reference:'EK-A1B2C3D5',package_key:'general',notes:'QA private follow-up note',revenue_bs:123,session_hash:'QA_PRIVATE_SESSION'}));
  let tree=renderActual(transport);tree.props.onOpenLead(pending);tree=renderActual(transport);
  let list=nodesWhere(tree,node=>node.type===ContactList)[0];list.props.onActivityChange(pending.id,true);tree=renderActual(transport);
  const before=nodesWhere(tree,node=>node.type===ContactList)[0].props;
  tree.props.onQuoteLead(found);tree=renderActual(transport);const first=tree.props.quoteRequest;
  assert.equal(first.sequence,1);assert.deepEqual(first.contact,{reference:found.reference,eventType:'Boda',design:'Lunaria',packageKey:null});
  assert.doesNotMatch(JSON.stringify(first),/QA_PRIVATE|private follow-up|revenue|status|revision|session_hash|123/);
  list=nodesWhere(tree,node=>node.type===ContactList)[0];assert.strictEqual(list.props.leads,before.leads);assert.equal(list.props.openedId,pending.id);assert.equal(list.props.activeIds.has(pending.id),true);
  tree.props.onQuoteLead(found);tree=renderActual(transport);assert.equal(tree.props.quoteRequest.sequence,2);assert.deepEqual(tree.props.quoteRequest.contact,first.contact);
  assert.equal(found.notes,'QA private follow-up note');assert.equal(found.revenue_bs,123);assert.equal(requests,0);
 });
});

test('invalid quote requests cannot erase the previously prepared contact or issue a write',async()=>{
 await withDashboardHooks(async renderActual=>{
  let tree=renderActual(transport);tree.props.onQuoteLead(lead());tree=renderActual(transport);const prepared=tree.props.quoteRequest;
  for(const value of [null,{},lead({reference:'EK-INVALID'}),lead({package_key:'unregistered'}),lead({event_category:'QA\ninvalid'})]){
   tree.props.onQuoteLead(value);tree=renderActual(transport);assert.strictEqual(tree.props.quoteRequest,prepared);
  }
  assert.equal(requests,0);
 });
});
