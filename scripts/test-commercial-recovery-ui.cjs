// Reconciliation and server-render contracts. No browser, production data or clipboard.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {default:Dashboard,CommercialSalesWorkspace:Workspace,CommercialDashboardFeedback:Feedback}=require('../src/components/admin/CommercialDashboard.tsx');
const SalesToolkit=require('../src/components/admin/SalesToolkit.tsx').default;
const ReferenceSearch=require('../src/components/admin/CommercialReferenceSearch.tsx').default;
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
  assert.match(html,/Cargando el embudo de Ventas/);assert.doesNotMatch(html,/Ingresos registrados|Contactos de WhatsApp/);
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
