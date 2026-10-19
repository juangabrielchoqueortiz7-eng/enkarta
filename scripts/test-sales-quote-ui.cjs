// Quote review rendering with fictional inputs; no browser, network or real clipboard.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return resolve.call(this,request.startsWith('@/')?path.join(root,'src',request.slice(2)):request,parent,...rest);};
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},fileName:file}).outputText,file);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {SalesQuoteReview}=require('../src/components/admin/SalesToolkit.tsx');
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
