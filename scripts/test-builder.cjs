// Runs the installed TypeScript sources without adding a test runtime dependency.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
// Private master archives are deliberately excluded from the public repository.
// CI reports these byte checks as skipped; local/deployment QA must run them.
const originalArchiveMissingInCi = !!process.env.CI && !fs.existsSync(path.join(root, 'public/invitali-originales.json'));
const originalArchiveTest = (name, run) => test(name, { skip: originalArchiveMissingInCi ? 'Private original archive unavailable in Git checkout; verified locally and against deployment.' : false }, run);
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest);
};
const compileTypeScript = (module, file) => {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: file,
  }).outputText;
  module._compile(output, file);
};
require.extensions['.ts'] = compileTypeScript;
require.extensions['.tsx'] = compileTypeScript;

const {safePartnerNext,partnerEntryPath,partnerNewDesignPath,partnerPlanPath,partnerLoginErrorPath,selectedPartnerDesign}=require('../src/lib/partner-journey.ts');
const {checkoutPaymentLabel,checkoutQuoteMatches,paymentUnderReview,partnerRequest,validCheckoutPayment}=require('../src/lib/partner-checkout.ts');
test('commercial journey keeps every original design choice through the Socios continuation',()=>{
 const {STARTER_DESIGNS}=require('../src/lib/enkarta-collections.ts');
 for(const design of STARTER_DESIGNS){const next=partnerNewDesignPath(design.key),entry=new URL(partnerEntryPath(next),'https://enkarta.invalid');assert.equal(selectedPartnerDesign(design.key),design.key);assert.equal(entry.searchParams.get('next'),next);assert.equal(safePartnerNext(entry.searchParams.get('next')),next);}
 assert.equal(selectedPartnerDesign('not-a-design'),undefined);assert.equal(partnerNewDesignPath('https://evil.invalid'),'/socios/panel/nueva');
});
test('commercial journey keeps selected plan and safe continuation after OAuth cancellation',()=>{
 for(const plan of ['inicio','estudio','agencia']){const next=partnerPlanPath(plan);assert.equal(safePartnerNext(next),next);const cancelled=new URL(partnerLoginErrorPath('cancelado',next),'https://enkarta.invalid');assert.equal(cancelled.searchParams.get('next'),next);assert.equal(cancelled.searchParams.get('error'),'cancelado');}
 const builder='/socios/constructor/10000000-0000-4000-8000-000000000001';assert.equal(safePartnerNext(builder),builder);
});
test('Socios continuation refuses external, control, backslash and unrelated routes',()=>{
 for(const value of [undefined,'https://evil.invalid','//evil.invalid','/\\evil.invalid','/socios/panel\n','/admin','/api/auth/signout','/socios/constructor/not-a-uuid','/socios/panel#https://evil.invalid','/%2f%2fevil.invalid'])assert.equal(safePartnerNext(value),'/socios/panel',String(value));
 assert.equal(safePartnerNext('/socios/panel?tab=suscripcion&plan=forged&secret=PRIVATE'),'/socios/panel?tab=suscripcion');
});
const checkoutFixture={id:'30000000-0000-4000-8000-000000000001',reference:'ENK-TEST01',plan_key:'estudio',months:1,method:'qr',amount_bs:449,receipt_url:'',quote_locked_at:null,status:'pending',created_at:'2026-10-16T12:00:00Z',period_end:null,review_note:''};
test('checkout distinguishes prepared reference, note-only review and actual approval',()=>{
 assert.equal(checkoutPaymentLabel(checkoutFixture),'Referencia preparada');assert.equal(paymentUnderReview(checkoutFixture),false);
 const noteOnly={...checkoutFixture,quote_locked_at:'2026-10-16T12:01:00Z'};assert.equal(checkoutPaymentLabel(noteOnly),'Comprobante en revisión');assert.equal(paymentUnderReview(noteOnly),true);assert.equal(paymentUnderReview({...checkoutFixture,receipt_url:'private/path'}),true);
 for(const [status,label]of [['approved','Aprobado'],['rejected','Rechazado'],['canceled','Cancelado']])assert.equal(checkoutPaymentLabel({...checkoutFixture,status}),label);
});
test('checkout evidence matches the exact saved plan, cycle, method and amount',()=>{
 assert.equal(checkoutQuoteMatches({...checkoutFixture,amount_bs:'449.00'},'estudio',1,'qr',449),true);
 for(const changed of [{plan_key:'agencia'},{months:3},{method:'cash'},{amount_bs:748},{status:'approved'}])assert.equal(checkoutQuoteMatches({...checkoutFixture,...changed},'estudio',1,'qr',449),false);
 assert.equal(checkoutQuoteMatches(null,'estudio',1,'qr',449),false);
});
test('checkout rejects malformed or borrowed payment receipts before updating local state',()=>{
 assert.equal(validCheckoutPayment(checkoutFixture,checkoutFixture.id),true);assert.equal(validCheckoutPayment({...checkoutFixture,amount_bs:'449.00'}),true);
 for(const value of [null,{},[],{...checkoutFixture,id:'x'},{...checkoutFixture,reference:''},{...checkoutFixture,plan_key:'free'},{...checkoutFixture,months:2},{...checkoutFixture,amount_bs:'NaN'},{...checkoutFixture,receipt_url:null},{...checkoutFixture,quote_locked_at:'broken'},{...checkoutFixture,status:'paid'}])assert.equal(validCheckoutPayment(value),false);
 assert.equal(validCheckoutPayment(checkoutFixture,'30000000-0000-4000-8000-000000000002'),false);
});
test('checkout request never retries writes or converts transport and incomplete replies into success',async()=>{
 let calls=0;await assert.rejects(partnerRequest('/api/partner/payments',{method:'POST'},async()=>{calls++;throw new TypeError('offline');}),/Actualiza/);assert.equal(calls,1);
 for(const body of ['{truncated','null','[]'])await assert.rejects(partnerRequest('/api/partner/payments',undefined,async()=>new Response(body)));
 await assert.rejects(partnerRequest('/api/partner/payments',undefined,async()=>new Response('{"error":"Pago bloqueado"}',{status:409})),/Pago bloqueado/);
 assert.deepEqual(await partnerRequest('/api/partner/payments',undefined,async(_url,opts)=>{assert.equal(opts.cache,'no-store');return new Response('{"success":true}');}),{success:true});
});
test('checkout render shows manual activation, canonical quote and locked note-only review',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{SubscriptionTab}=require('../src/components/partners/PartnerDashboard.tsx');
 const account={subscription:{plan:'inicio',active:false},billing:{configured:false,provider:'manual',ready:true,whatsapp:'59100000000'},payments:[]};
 const render=pending=>renderToStaticMarkup(React.createElement(SubscriptionTab,{account,pending,onRefresh:async()=>{},onNotice:()=>{},onPayment:()=>{},selectedPlan:'agencia'}));
 const html=render({...checkoutFixture,quote_locked_at:'2026-10-16T12:01:00Z'});assert.match(html,/Comprobante en revisión/);assert.match(html,/ENK-TEST01/);assert.match(html,/Bs 449/);assert.match(html,/activación es manual/);assert.match(html,/name="billing-period" disabled=""/);assert.match(html,/name="billing-method" disabled=""/);
 const prepared=render(checkoutFixture);assert.match(prepared,/Referencia preparada/);assert.doesNotMatch(prepared,/Comprobante en revisión/);
 const fresh=render(null);assert.match(fresh,/Bs 749/);assert.match(fresh,/Preparar referencia/);assert.doesNotMatch(fresh,/Enviar comprobante/);
});

test('first reference exposes keyboard-accessible payment history without losing rows or evidence links',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{SubscriptionTab}=require('../src/components/partners/PartnerDashboard.tsx');
 const payments=['pending','approved','rejected','canceled'].map((status,index)=>({...checkoutFixture,id:`30000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,reference:`ENK-TEST0${index+1}`,status,review_note:index===2?'<revisión ficticia>':'',receiptUrl:index===1?'https://storage.example.invalid/signed/qa-receipt':undefined}));
 const account={subscription:{plan:'inicio',active:false},billing:{configured:false,provider:'manual',ready:true,whatsapp:'59100000000'},payments};
 const render=(list,pending)=>renderToStaticMarkup(React.createElement(SubscriptionTab,{account:{...account,payments:list},pending,onRefresh:async()=>{},onNotice:()=>{},onPayment:()=>{}}));
 for(const list of [payments.slice(0,1),payments]){
  const html=render(list,list[0]);
  const region=html.match(/<div[^>]*role="region"[^>]*aria-labelledby="([^"]+)"[^>]*tabindex="0"[^>]*>([\s\S]*?<\/table>)/);
  assert.ok(region,'History must remain reachable by keyboard as an independent scroll region');
  assert.ok(html.includes(`id="${region[1]}"`));assert.match(region[2],/<table/);
  assert.equal((region[2].match(/<tr /g)||[]).length,list.length+1);
  for(const payment of list){assert.ok(region[2].includes(payment.reference));assert.ok(region[2].includes(checkoutPaymentLabel(payment)));}
  if(list.length>1){assert.ok(region[2].includes(payments[1].receiptUrl));assert.match(region[2],/&lt;revisión ficticia&gt;/);}
 }
 const empty=render([],null);assert.doesNotMatch(empty,/aria-labelledby="partner-payment-history"/);assert.doesNotMatch(empty,/<table/);
});

const {prepareWhatsAppMessage,whatsAppMessageUrl,messageChoiceKey,MAX_WHATSAPP_MESSAGE}=require('../src/lib/whatsapp-message.ts');
const messageGuest={id:'30000000-0000-4000-8000-000000000004',publicId:'QA-FAMILY',name:'Familia {link} Pérez & Ñandú',phone:'+59170000001',passes:4,tableNo:'7',accessCode:'ENK-QA'};
const messageLink='https://enkarta.example.invalid/i/qa-event?g=QA-FAMILY';
const message=(template,purpose='invitation',guest=messageGuest,link=messageLink)=>prepareWhatsAppMessage(template,guest,link,purpose);
test('WhatsApp message review substitutes documented aliases once and keeps the recipient personal link',()=>{
 const result=message('{nombre_invitado}: {cantidad_pases} pases, mesa {mesa}, {codigo}. {link_unico}');assert.equal(result.ready,true);assert.equal(result.text,`${messageGuest.name}: 4 pases, mesa 7, ENK-QA. ${messageLink}`);assert.deepEqual(result.issues,[]);
 const url=new URL(whatsAppMessageUrl(result,messageGuest.phone));assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/59170000001');assert.equal(url.searchParams.get('text'),result.text);assert.ok(result.text.includes('{link} Pérez')); // Guest data is never evaluated as a second template.
});
test('WhatsApp message review rejects missing personal link and misspelled or malformed variables',()=>{
 for(const template of ['Hola {nombree}', 'Hola { nombre }, {link}', 'Hola {{nombre}}, {link}', 'Hola {nombre, {link}', 'Hola {}, {link}', 'Hola, te esperamos']){const result=message(template);assert.equal(result.ready,false);assert.equal(whatsAppMessageUrl(result,messageGuest.phone),null);assert.ok(result.issues.length);}
 assert.ok(message('Hola {nombree}').issues.some(issue=>issue.code==='UNKNOWN_VARIABLE'));assert.ok(message('Hola {nombre}').issues.some(issue=>issue.code==='MISSING_LINK'));
});
test('WhatsApp default invitation and blank reminder retain different meanings and valid personal links',()=>{
 for(const template of [undefined,'','   ']){assert.equal(message(template).ready,true);assert.equal(message(template).defaultTemplate,true);assert.match(message(template,'reminder').text,/recordamos confirmar/);assert.equal(message(template,'reminder').ready,true);}
 assert.match(message(undefined).text,/invitación personal/);
});
test('WhatsApp review binds the link to the correct guest and rejects unsafe or ambiguous URLs',()=>{
 for(const link of ['javascript:alert(1)','/i/qa?g=QA-FAMILY','https://user:secret@example.invalid/i/qa?g=QA-FAMILY','https://example.invalid/i/qa?g=OTHER','https://example.invalid/i/qa?g=QA-FAMILY&g=QA-FAMILY','https://example.invalid/catalogo?g=QA-FAMILY']){const result=message('{link}','invitation',messageGuest,link);assert.equal(result.ready,false);assert.ok(result.issues.some(issue=>issue.code==='INVALID_LINK'));assert.equal(whatsAppMessageUrl(result,messageGuest.phone),null);}
 assert.equal(message('{link}','invitation',messageGuest,'http://localhost:3001/i/qa?g=QA-FAMILY').ready,true);
});
test('WhatsApp app review limits bound both template and personalized expansion',()=>{
 assert.equal(message('x'.repeat(1201)+'{link}').ready,false);
 const expanded=message('{nombre}'.repeat(130)+'{link}','invitation',{...messageGuest,name:'P'.repeat(80)});assert.ok(expanded.text.length>MAX_WHATSAPP_MESSAGE);assert.ok(expanded.issues.some(issue=>issue.code==='MESSAGE_LENGTH'));assert.equal(whatsAppMessageUrl(expanded,messageGuest.phone),null);
});
test('WhatsApp URL encoding preserves accents, newlines, query separators and normalized Bolivian numbers',()=>{
 const result=message('Hola {nombre}\n4 pases & regalos?\n{link}');assert.equal(result.ready,true);const url=new URL(whatsAppMessageUrl(result,'70000001'));assert.equal(url.searchParams.get('text'),result.text);assert.equal(url.searchParams.size,1);
 for(const phone of ['', 'not-a-number','0000'])assert.equal(whatsAppMessageUrl(result,phone),null);
});
test('WhatsApp fallback is scoped to contact, content, purpose and template, while tracking-only revisions retain it',()=>{
 const key=messageChoiceKey(messageGuest,'invitation','Hola {nombre}');assert.equal(key,messageChoiceKey({...messageGuest,responseRevision:10},'invitation','Hola {nombre}'));
 for(const changed of [{id:'other'},{publicId:'other'},{name:'Otra familia'},{passes:2},{phone:'+59170000002'},{tableNo:'8'}])assert.notEqual(key,messageChoiceKey({...messageGuest,...changed},'invitation','Hola {nombre}'));
 assert.notEqual(key,messageChoiceKey(messageGuest,'reminder','Hola {nombre}'));assert.notEqual(key,messageChoiceKey(messageGuest,'invitation','{link}'));
 const template='Hola {nombree}';assert.equal(message(template).ready,false);assert.equal(message(undefined).ready,true);assert.equal(template,'Hola {nombree}');
});

const {readGuestCsvFile,createGuestCsvReader,MAX_GUEST_CSV_BYTES}=require('../src/lib/guest-csv-file.ts');
const csvFile=(bytes,name='invitados.csv')=>({name,size:bytes.length,arrayBuffer:async()=>Uint8Array.from(bytes).buffer});
const unicodeGuestCsv='Nombre\tTeléfono\tPases\tGrupo\r\n"Familia Pérez, Muñoz"\t+59170000001\t4\tFamilia\r\nAna Ñandú\t70000002\t2\tAmigos';
test('guest file decodes UTF-8 with or without BOM and preserves accents, delimiters and phone text',async()=>{
 for(const prefix of ['','\uFEFF']){const result=await readGuestCsvFile(csvFile(Buffer.from(prefix+unicodeGuestCsv)));assert.equal(result.source.encoding,'UTF-8');assert.equal(result.parsed.rows.length,2);assert.equal(result.parsed.rows[0][0],'Familia Pérez, Muñoz');assert.equal(result.parsed.rows[0][1],'+59170000001');assert.equal(result.parsed.rows[1][0],'Ana Ñandú');}
});
test('guest file reads Excel Unicode UTF-16 LE and BE with BOM without changing names',async()=>{
 const le=Buffer.from('\uFEFF'+unicodeGuestCsv,'utf16le'),be=Buffer.from(le);be.swap16();
 for(const [bytes,encoding]of [[le,'UTF-16 LE'],[be,'UTF-16 BE']]){const result=await readGuestCsvFile(csvFile(bytes,'lista.TXT'));assert.equal(result.source.encoding,encoding);assert.equal(result.parsed.delimiter,'\t');assert.equal(result.parsed.rows[1][0],'Ana Ñandú');}
});
test('guest file rejects invalid encoding, control/binary bytes and renamed workbooks instead of corrupting names',async()=>{
 for(const bytes of [Buffer.from('Nombre\nPérez','latin1'),Buffer.from([0xff,0xfe,0x41]),Buffer.from('Nombre\nA\0na'),Buffer.from([0x50,0x4b,3,4]),Buffer.from([0xd0,0xcf,0x11,0xe0]),Buffer.from('Nombre\nAna\ufffd')])await assert.rejects(readGuestCsvFile(csvFile(bytes)));
});
test('guest file rejects empty, header-only, malformed and oversized input before committing a draft',async()=>{
 for(const bytes of [Buffer.alloc(0),Buffer.from('Nombre;Pases\r\n'),Buffer.from('Nombre\n"Sin cierre')])await assert.rejects(readGuestCsvFile(csvFile(bytes)));
 let reads=0;await assert.rejects(readGuestCsvFile({name:'lista.csv',size:MAX_GUEST_CSV_BYTES+1,arrayBuffer:async()=>{reads++;return new ArrayBuffer(0);}}));assert.equal(reads,0);
 await assert.rejects(readGuestCsvFile({...csvFile(Buffer.from('Nombre\nAna')),size:500}));
 await assert.rejects(readGuestCsvFile({...csvFile(Buffer.from('Nombre\nAna')),arrayBuffer:async()=>{throw new Error('File no longer available');}}),/seleccionarlo/);
 for(const name of ['lista.xlsx','lista.xls','lista.csv.exe','lista.json'])await assert.rejects(readGuestCsvFile(csvFile(Buffer.from('Nombre\nAna'),name)));
});
test('guest file reader commits only the latest selection and ignores an earlier late success',async()=>{
 const pending=[];const reader=createGuestCsvReader('event-A',file=>new Promise(resolve=>pending.push({file,resolve})));assert.equal(reader.scope,'event-A');const one=reader.read(csvFile([1],'primero.csv')),two=reader.read(csvFile([2],'segundo.csv'));assert.equal(reader.pending,true);
 pending[1].resolve({source:{name:'segundo.csv'}});assert.equal((await two).value.source.name,'segundo.csv');assert.equal(reader.pending,false);pending[0].resolve({source:{name:'primero.csv'}});assert.deepEqual(await one,{status:'superseded'});
});
test('guest file reader ignores superseded failures and never releases a newer pending selection',async()=>{
 const pending=[];const reader=createGuestCsvReader('event-A',()=>new Promise((resolve,reject)=>pending.push({resolve,reject})));const one=reader.read(csvFile([1])),two=reader.read(csvFile([2]));pending[0].reject(new Error('old failure'));assert.deepEqual(await one,{status:'superseded'});assert.equal(reader.pending,true);pending[1].reject(new Error('current failure'));assert.deepEqual(await two,{status:'error',error:'current failure'});assert.equal(reader.pending,false);
});
test('guest file reader cancellation protects manual edits, closure, unmount and a different event',async()=>{
 for(const reason of ['manual edit','close','unmount','event change']){let resolve;const reader=createGuestCsvReader('event-A',()=>new Promise(done=>{resolve=done;}));const result=reader.read(csvFile([1]));reader.cancel();assert.equal(reader.pending,false,reason);resolve({source:{name:'old.csv'}});assert.deepEqual(await result,{status:'superseded'},reason);}
});
test('guest file reader can reselect the same file after a read error or explicit cancellation',async()=>{
 let calls=0;const file=csvFile([1]);const reader=createGuestCsvReader('event-A',async()=>{if(++calls===1)throw new Error('unreadable');return {source:{name:'ready.csv'}};});assert.equal((await reader.read(file)).status,'error');reader.cancel();assert.equal((await reader.read(file)).status,'ready');assert.equal(calls,2);
});

const {historyTimestamp,parseHistoryCursor,movementCursor,historyOperator,parseCheckinHistory,readCheckinHistory}=require('../src/lib/checkin-history.ts');
const historyEvent='10000000-0000-4000-8000-000000000001',historyGuest='20000000-0000-4000-8000-000000000001';
const historyMovement=(n=1)=>({id:`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`,at:'2026-10-16T10:00:00.123456Z',action:'in',seatNo:1,label:'Persona ficticia',operatorRole:'door'});
const historyPage=()=>({invitationId:historyEvent,guestId:historyGuest,movements:[historyMovement()],nextCursor:null,readAt:'2026-10-16T10:00:01.000Z'});
test('history cursors preserve exact PostgreSQL microseconds and reject invalid dates or filter injection',()=>{
 assert.equal(historyTimestamp('2026-10-16T10:00:00.123456+00:00'),'2026-10-16T10:00:00.123456Z');assert.equal(historyTimestamp('2026-10-16T10:00:00Z'),'2026-10-16T10:00:00.000000Z');
 const movement=historyMovement();assert.deepEqual(parseHistoryCursor(movementCursor(movement)),{at:movement.at,id:movement.id});assert.equal(parseHistoryCursor(null),null);
 for(const cursor of ['','2026-02-30T10:00:00.000000Z|'+movement.id,movementCursor(movement)+',or(id.gt.x)','x'.repeat(81),'2026-10-16T10:00:00.123Z|'+movement.id])assert.throws(()=>parseHistoryCursor(cursor));
});
test('history contracts bind event and group, validate order and omit undeclared private fields',()=>{
 const page=historyPage();assert.equal(parseCheckinHistory({...page,secret:'discard'},historyEvent,historyGuest).secret,undefined);
 for(const changed of [{invitationId:historyGuest},{guestId:historyEvent},{movements:[historyMovement(),historyMovement()]},{movements:[historyMovement(1),historyMovement(2)]},{movements:[{...historyMovement(),action:'oops'}]},{movements:[{...historyMovement(),seatNo:21}]},{movements:[{...historyMovement(),operatorRole:'admin:secret'}]},{readAt:'bad'},{nextCursor:'invalid'}])assert.throws(()=>parseCheckinHistory({...page,...changed},historyEvent,historyGuest));
 const movements=Array.from({length:20},(_,i)=>historyMovement(20-i));assert.equal(parseCheckinHistory({...page,movements,nextCursor:movementCursor(movements.at(-1))},historyEvent,historyGuest).movements.length,20);
});
test('history operator classification reveals only known roles',()=>{
 assert.equal(historyOperator('admin'),'admin');assert.equal(historyOperator('door:'+historyEvent),'door');assert.equal(historyOperator('host:'+historyEvent),'host');for(const value of [null,'unknown-person','door:bad','host:'+historyEvent+':secret'])assert.equal(historyOperator(value),'unknown');
});
test('history transport is read-only, no-store, session-bound and rejects wrong scope or malformed success',async()=>{
 const binding={invitationId:historyEvent,guestId:historyGuest,sessionKey:'a'.repeat(64),scope:'door'},signal=new AbortController().signal;
 let seen;const result=await readCheckinHistory(binding,null,signal,async(url,init)=>{seen={url,init};return Response.json(historyPage());});assert.equal(result.movements.length,1);assert.match(seen.url,/scope=door/);assert.equal(seen.init.cache,'no-store');assert.equal(seen.init.signal,signal);assert.equal(seen.init.headers['X-Enkarta-Scanner-Session'],binding.sessionKey);assert.equal(seen.init.method,undefined);
 await assert.rejects(readCheckinHistory(binding,null,signal,async()=>Response.json({...historyPage(),guestId:historyEvent})));
 await assert.rejects(readCheckinHistory(binding,null,signal,async()=>new Response('invalid')));
 await assert.rejects(readCheckinHistory(binding,null,signal,async()=>new Response('',{status:403})),error=>error.forbidden===true);
 await assert.rejects(readCheckinHistory(binding,null,signal,async()=>new Response('',{status:503})),error=>error.forbidden===false);
});

const { marfilVivoStarter, marfilVivoDemo } = require('../src/lib/marfil-vivo.ts');
const { invitationStarter, invitationDemo, STARTER_TEMPLATE_KEYS } = require('../src/lib/template-starters.ts');
const { collectionCatalog } = require('../src/lib/collection-catalog.ts');
const { collectionDesign, restoreBlockCollectionStyle, isEmptyOptionalBlock } = require('../src/lib/collection-design.ts');
const { invitationToLayout } = require('../src/lib/layout-presets.ts');
const { resolveLayoutBindings, resolveBlockEditorProps, detachBinding } = require('../src/lib/block-bindings.ts');
const { parseInvitation } = require('../src/lib/types.ts');
const { captionsForImages, reorderGalleryCaptions } = require('../src/lib/gallery.ts');
const { collectPublicationResources, publicationMetrics, resourceBudgetBytes } = require('../src/lib/publication-audit.ts');
const { probeLocalPublicAsset } = require('../src/lib/public-assets.ts');
const { validateInvitationBuilder } = require('../src/lib/builder-validation.ts');
const { publicTemplateName } = require('../src/lib/enkarta-collections.ts');
const { MARFIL_THEME, MARFIL_TOKENS, MARFIL_SPACE, MARFIL_WIDTH, resolveInvitationTypography, hasMarfilVisualSystem } = require('../src/lib/marfil-visual-system.ts');
const { resolveBlockTheme } = require('../src/components/invitations/blocks/theme.tsx');
const { resolveInvitationVisualSystem } = require('../src/components/invitations/blocks/visual-system.ts');
const { resolveFonts } = require('../src/lib/fonts.ts');
const { PACKAGE_CATALOG, PACKAGE_PRESETS, commercialRows, newServiceContract, adoptServiceContract, contractErrors, resolveFeatures, gateInvitation, allowsService } = require('../src/lib/packages.ts');
const { changesUncontractedColors } = require('../src/lib/package-colors.ts');
const { responseCsv, responseRows } = require('../src/lib/response-sheet.ts');
const { filterRoster, hostMetrics, rosterCsv, formatSyncTime } = require('../src/lib/host-dashboard.ts');
const { rosterPage, rosterTables } = require('../src/lib/roster-view.ts');
const { createLiveSync, SyncDenied, retryDelay } = require('../src/lib/live-sync.ts');
const { addDays, validDay, invitationValidity, parseValidityCommand, validityLabel } = require('../src/lib/invitation-validity.ts');
const { deliveryState, guestMessage, reminderMessage, parseDeliveryInput } = require('../src/lib/guest-delivery.ts');
const { parseGuestCsv, mapGuestCsvRows, normalizeGuestPhone, parseQuickGuestList } = require('../src/lib/guest-import.ts');
const { mergeSavedGuest } = require('../src/lib/guest-edits.ts');
const { scannerStatus } = require('../src/lib/scanner-status.ts');
const { passFilename, accessPassPng } = require('../src/lib/access-pass.ts');
const { guestMetadata, parseGuestMetadata, withGuestMetadata, publicGuest } = require('../src/lib/guest-metadata.ts');
const { whatsappQueue, trackGuestDelivery, DeliveryTrackingError } = require('../src/lib/whatsapp-queue.ts');
const { validateQrImage, qrLookup } = require('../src/lib/scanner-input.ts');
const { receptionSearch, findReceptionGuests, parseReceptionSearch } = require('../src/lib/reception-search.ts');
const { deliveryFailureIsDefinitive, deliveryRecoveryKey, deliveryRecoveryRecord, restoreDeliveryRecovery, saveDeliveryRecovery, clearDeliveryRecovery, discardUnreadableDelivery, DeliveryRecoveryWriteError } = require('../src/lib/delivery-recovery.ts');
const { parseScannerGroup, parseScanReceipt, recordScan, ScanRequestError, scanFailureIsDefinitive } = require('../src/lib/scanner-contract.ts');
const { REVIEW_MAX_AGE, whatsappReviewKey, whatsappReviewRecord, restoreWhatsAppReview, advanceWhatsAppReview, prepareWhatsAppReview, saveWhatsAppReview, clearWhatsAppReview, canClearWhatsAppReview } = require('../src/lib/whatsapp-review.ts');
const { scanRecoveryKey, scanRecoveryRecord, restoreScanRecovery, saveScanRecovery, clearScanRecovery, discardUnreadableScan, scanRecoveryPerson, ScanRecoveryWriteError } = require('../src/lib/scan-recovery.ts');
const { scannerSessionFingerprint } = require('../src/lib/scanner-session.ts');
const {guestEditValues,guestEditDirty,guestEditStale,validateGuestEdit,verifyGuestEditReceipt}=require('../src/lib/guest-edit-form.ts');
const editFixture={id:'80000000-0000-4000-8000-000000000001',publicId:'QA-ONLY',name:'Familia ficticia',phone:'+59170000001',group:'Familia',eventAccess:'both',tableNo:'7',passes:4,allowKids:false,status:'pending',sent:false,responseRevision:2};
const {rosterRequestUrl,parseRosterQuery:parseBuilderRosterQuery,rosterParams:builderRosterParams,defaultRosterQuery:defaultBuilderRosterQuery}=require('../src/lib/roster-query.ts');
const {parseManagedGuestPreview}=require('../src/lib/managed-guest-preview.ts');
const {managedRosterCsv}=require('../src/lib/managed-roster-csv.ts');
test('builder CSV keeps contacts and personal links, escapes formulas and respects QR/table services',()=>{
 const guest={...editFixture,name:'=SUM(A1)',inside:1,accessToken:'never-export-this-token',reminderCount:2};
 const text=managedRosterCsv([guest],{guestManagement:true,qrAccess:true,tableAssignment:true},'https://qa.invalid','evento seguro');
 assert.ok(text.startsWith('\uFEFF'));assert.ok(text.includes('Teléfono'));assert.ok(text.includes("'=SUM(A1)"));assert.ok(text.includes("'+59170000001"));assert.ok(text.includes('https://qa.invalid/i/evento%20seguro?g=QA-ONLY'));assert.ok(!text.includes(guest.accessToken));
 const limited=managedRosterCsv([guest],{guestManagement:true,qrAccess:false,tableAssignment:false},'https://qa.invalid','test');assert.ok(!limited.includes('Dentro ahora'));assert.ok(!limited.includes('Mesa'));assert.ok(limited.includes('Enlace personal'));
});
test('builder roster requests retain CSV flags and exact literal filters with an isolated event ID',()=>{
 const query={...defaultBuilderRosterQuery(),page:3,filter:{...defaultBuilderRosterQuery().filter,search:'Pérez & 100%_+',group:'Amigos'}};
 const params=builderRosterParams(query);params.set('id',editFixture.id);const url=new URL(rosterRequestUrl('/api/guests/roster?format=csv&id=old',params),'https://qa.invalid');
 assert.equal(url.searchParams.get('format'),'csv');assert.equal(url.searchParams.getAll('id').length,1);assert.equal(url.searchParams.get('id'),editFixture.id);assert.deepEqual(parseBuilderRosterQuery(url.searchParams),query);
 for(const endpoint of ['https://other.invalid','//other.invalid','/\\other.invalid'])assert.throws(()=>rosterRequestUrl(endpoint,params),/INVALID_ROSTER_ENDPOINT/);
});
test('builder guest preview preserves canvas inputs and QR only when explicitly returned and strips unknown fields',()=>{
 const original={...editFixture,accessToken:'synthetic-token',accessCode:'ENK-QA',cookie:'secret-cookie',host_password_hash:'secret-hash'};
 const preview=parseManagedGuestPreview({guest:original},editFixture.id);for(const field of ['name','publicId','passes','allowKids','phone','group','eventAccess','accessToken','accessCode'])assert.equal(preview[field],original[field]);assert.ok(!JSON.stringify(preview).includes('secret-'));
 const limited=parseManagedGuestPreview({guest:editFixture},editFixture.id);assert.equal(limited.accessToken,undefined);
 assert.equal(parseManagedGuestPreview({guest:{...editFixture,status:'declined',confirmedPasses:0}},editFixture.id).confirmedPasses,0);
});
test('builder guest preview rejects an unrelated guest, malformed fields or unverified revisions',()=>{
 for(const patch of [{id:'90000000-0000-4000-8000-000000000001'},{passes:2.5},{passes:21},{responseRevision:-1},{publicId:''},{name:''},{allowKids:1},{status:['pending']},{accessToken:{}},{confirmedPasses:5}])assert.throws(()=>parseManagedGuestPreview({guest:{...editFixture,...patch}},editFixture.id),/No pudimos verificar/);
 assert.throws(()=>parseManagedGuestPreview(null,editFixture.id));
});
test('guest editor keeps only editable fields and detects changes without including live state',()=>{
 const values=guestEditValues({...editFixture,accessToken:'private-token',inside:1});
 assert.deepEqual(Object.keys(values).sort(),['allowKids','eventAccess','group','name','passes','phone','tableNo']);
 assert.equal(guestEditDirty(editFixture,values,true),false);
 for(const [key,value] of Object.entries({name:'Otro',phone:'',group:'Amigos',eventAccess:'ceremony',passes:'5',tableNo:'8',allowKids:true}))assert.equal(guestEditDirty(editFixture,{...values,[key]:value},true),true);
 assert.equal(guestEditDirty(editFixture,{...values,tableNo:'8'},false),false);
 assert.equal(guestEditDirty({...editFixture,status:'confirmed',inside:2,reminderCount:3},values,true),false);
});
test('guest editor whitelists its command and normalizes contacts without changing IDs or response state',()=>{
 const values={...guestEditValues(editFixture),name:'  Familia Pérez  ',phone:'76543210',group:' Amigos ',tableNo:' 9 '};
 const {errors,command}=validateGuestEdit(editFixture,values,true);assert.deepEqual(errors,{});
 assert.deepEqual(command,{id:editFixture.id,expectedRevision:2,name:'Familia Pérez',phone:'+59176543210',group:'Amigos',eventAccess:'both',passes:4,allowKids:false,tableNo:'9'});
 assert.equal(validateGuestEdit(editFixture,values,false).command.tableNo,undefined);
 const cleared=validateGuestEdit(editFixture,{...values,phone:'',group:'',tableNo:''},true).command;assert.equal(cleared.phone,'');assert.equal(cleared.group,'');assert.equal(cleared.tableNo,'');
});
test('guest editor rejects invalid fields and never silently truncates or converts fractional passes',()=>{
 const values=guestEditValues(editFixture);
 for(const [key,value]of [['name',' '],['name','a'.repeat(81)],['phone','llamar 76543210'],['phone','12'],['group','x'.repeat(41)],['tableNo','x'.repeat(21)],['eventAccess','all'],['passes',''],['passes','2.5'],['passes','0'],['passes','21']]){
  const result=validateGuestEdit(editFixture,{...values,[key]:value},true);assert.ok(result.errors[key]);assert.equal(result.command,undefined);
 }
 assert.ok(validateGuestEdit(editFixture,{...values,tableNo:'x'.repeat(30)},false).command);
 assert.equal(validateGuestEdit({...editFixture,id:'bad'},values,true).command,undefined);
 assert.equal(validateGuestEdit({...editFixture,responseRevision:undefined},values,true).command,undefined);
});
test('guest editor cannot offer fewer assigned passes than an existing confirmation',()=>{
 const values=guestEditValues(editFixture),confirmed={...editFixture,status:'confirmed',confirmedPasses:3};
 assert.ok(validateGuestEdit(confirmed,{...values,passes:'2'},true).errors.passes);
 assert.equal(validateGuestEdit(confirmed,{...values,passes:'3'},true).command.passes,3);
 assert.ok(validateGuestEdit({...confirmed,confirmedPasses:undefined},{...values,passes:'3'},true).errors.passes);
});
test('guest editor detects a missing guest, different identity or changed revision before follow-up',()=>{
 assert.equal(guestEditStale(editFixture,{...editFixture}),false);
 for(const latest of [undefined,{...editFixture,id:'80000000-0000-4000-8000-000000000002'},{...editFixture,responseRevision:3}])assert.equal(guestEditStale(editFixture,latest),true);
 assert.equal(guestEditStale(editFixture,{...editFixture,inside:1}),false);
});
test('guest editor accepts only a matching saved or no-op receipt',()=>{
 const {command}=validateGuestEdit(editFixture,guestEditValues(editFixture),true);
 for(const revision of [2,3])assert.doesNotThrow(()=>verifyGuestEditReceipt({ok:true,guest:{...editFixture,responseRevision:revision}},command));
});
test('guest editor retains its draft for foreign, partial or inconsistent successful responses',()=>{
 const {command}=validateGuestEdit(editFixture,guestEditValues(editFixture),true);
 for(const response of [null,{}, {ok:false,guest:editFixture},{ok:true,guest:null},...[
  {id:'other'},{responseRevision:1},{responseRevision:4},{responseRevision:'3'},{name:'Ajeno'},{passes:8},{allowKids:true},{phone:'+59170000002'},{group:'VIP'},{eventAccess:'ceremony'},{tableNo:'9'},{status:['pending']},{status:'paid'}
 ].map(patch=>({ok:true,guest:{...editFixture,...patch}}))])assert.throws(()=>verifyGuestEditReceipt(response,command),/Conservamos tu edición/);
});

const recoveryScope={role:'door',sessionKey:'d'.repeat(64),invitationId:'70000000-0000-4000-8000-000000000001'};
const recoveryFixture={invitationId:recoveryScope.invitationId,guestId:'70000000-0000-4000-8000-000000000002',seatNo:1,operation:{attendeeId:'70000000-0000-4000-8000-000000000003',requestId:'70000000-0000-4000-8000-000000000004',action:'in',expectedRevision:0}};
test('QR recovery persists minimal identity without names, labels, tokens, codes, contacts or cookies',()=>{
 const record=scanRecoveryRecord(recoveryScope,{...recoveryFixture,name:'private-name',label:'private-label',accessToken:'private-token',accessCode:'private-code',phone:'private-phone',cookie:'private-cookie',operation:{...recoveryFixture.operation,message:'private-message'}});
 assert.deepEqual(record,{version:1,role:'door',sessionKey:recoveryScope.sessionKey,recovery:recoveryFixture});
 const raw=JSON.stringify(record);assert.ok(raw.length<=1024);assert.doesNotMatch(raw,/private-/);
 assert.deepEqual(restoreScanRecovery(raw,recoveryScope),recoveryFixture);
});
test('QR recovery is isolated by event, role and signed-session fingerprint',()=>{
 const raw=JSON.stringify(scanRecoveryRecord(recoveryScope,recoveryFixture));
 for(const scope of [{...recoveryScope,role:'host'},{...recoveryScope,invitationId:recoveryFixture.guestId},{...recoveryScope,sessionKey:'e'.repeat(64)}]) {
  assert.equal(restoreScanRecovery(raw,scope),null);assert.notEqual(scanRecoveryKey(scope),scanRecoveryKey(recoveryScope));
 }
 const admin={role:'admin',sessionKey:'a'.repeat(64)};
 assert.equal(restoreScanRecovery(JSON.stringify(scanRecoveryRecord(admin,recoveryFixture)),admin).invitationId,recoveryScope.invitationId);
 for(const scope of [{role:'door',sessionKey:'d'.repeat(64)},{...recoveryScope,sessionKey:['d'.repeat(64)]},{...recoveryScope,role:'review'}])assert.throws(()=>scanRecoveryKey(scope));
});
test('QR recovery refuses corrupted or unsupported records and never coerces operations',()=>{
 const record=scanRecoveryRecord(recoveryScope,recoveryFixture);
 for(const raw of [null,'bad','x'.repeat(1025),JSON.stringify({...record,version:2}),JSON.stringify({...record,role:'admin'})])assert.equal(restoreScanRecovery(raw,recoveryScope),null);
 for(const patch of [{seatNo:0},{seatNo:21},{guestId:'unknown'},{invitationId:recoveryFixture.guestId},{operation:{...recoveryFixture.operation,action:['in']}},{operation:{...recoveryFixture.operation,expectedRevision:-1}},{operation:{...recoveryFixture.operation,requestId:'unknown'}}])assert.equal(restoreScanRecovery(JSON.stringify({...record,recovery:{...recoveryFixture,...patch}}),recoveryScope),null);
});
test('saving QR recovery cannot replace an unresolved request or alter the same request',()=>{
 const values=new Map(), storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 assert.equal(saveScanRecovery(storage,recoveryScope,recoveryFixture),true);assert.equal(saveScanRecovery(storage,recoveryScope,recoveryFixture),true);
 for(const patch of [{requestId:recoveryFixture.guestId},{action:'out'},{expectedRevision:1},{attendeeId:recoveryFixture.guestId}])assert.equal(saveScanRecovery(storage,recoveryScope,{...recoveryFixture,operation:{...recoveryFixture.operation,...patch}}),false);
 assert.deepEqual(restoreScanRecovery(storage.getItem(scanRecoveryKey(recoveryScope)),recoveryScope),recoveryFixture);
 values.set(scanRecoveryKey(recoveryScope),'bad');assert.equal(saveScanRecovery(storage,recoveryScope,recoveryFixture),false);
});
test('late QR acknowledgements and unreadable cleanup never remove a different pending movement',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 saveScanRecovery(storage,recoveryScope,recoveryFixture);
 const oldRaw=storage.getItem(scanRecoveryKey(recoveryScope));
 const newer={...recoveryFixture,operation:{...recoveryFixture.operation,requestId:recoveryFixture.guestId}};
 values.set(scanRecoveryKey(recoveryScope),JSON.stringify(scanRecoveryRecord(recoveryScope,newer)));
 assert.equal(clearScanRecovery(storage,recoveryScope,recoveryFixture),false);assert.equal(discardUnreadableScan(storage,recoveryScope,oldRaw),false);
 assert.equal(clearScanRecovery(storage,recoveryScope,newer),true);assert.equal(clearScanRecovery(storage,recoveryScope,newer),true);
 values.set(scanRecoveryKey(recoveryScope),'bad');assert.equal(discardUnreadableScan(storage,recoveryScope,'bad'),true);
});
test('QR journal distinguishes an unreadable store from a failed write with safe memory fallback',()=>{
 const readDenied={getItem:()=>{throw new Error('read denied');},setItem:()=>{},removeItem:()=>{}};
 assert.throws(()=>saveScanRecovery(readDenied,recoveryScope,recoveryFixture),error=>!(error instanceof ScanRecoveryWriteError));
 const full={getItem:()=>null,setItem:()=>{throw new Error('quota');},removeItem:()=>{}};
 assert.throws(()=>saveScanRecovery(full,recoveryScope,recoveryFixture),ScanRecoveryWriteError);
});
test('restored QR request retains identity and accepts a newer exit without duplicating the entry',async()=>{
 const restored=restoreScanRecovery(JSON.stringify(scanRecoveryRecord(recoveryScope,recoveryFixture)),recoveryScope);
 const wire={ok:true,replayed:true,attendee:{...scanRecoveryPerson(restored),revision:2,state:'out'}};
 let body,headers;
 const receipt=await recordScan(restored.operation,scanRecoveryPerson(restored),'door',async(_url,init)=>{body=JSON.parse(init.body);headers=init.headers;return new Response(JSON.stringify(wire));},{sessionKey:recoveryScope.sessionKey,invitationId:restored.invitationId});
 assert.equal(body.requestId,recoveryFixture.operation.requestId);assert.equal(body.expectedRevision,0);assert.equal(body.action,'in');assert.equal(body.invitationId,recoveryFixture.invitationId);
 assert.equal(headers['X-Enkarta-Scanner-Session'],recoveryScope.sessionKey);assert.equal(receipt.changedLater,true);assert.equal(receipt.attendee.state,'out');
});
test('scanner session binding is opaque and changes with cookie rotation and role',()=>{
 const cookie='synthetic-signed-cookie-not-a-real-credential', value=scannerSessionFingerprint('door',cookie);
 assert.match(value,/^[a-f0-9]{64}$/);assert.equal(value.includes(cookie),false);
 assert.equal(scannerSessionFingerprint('door',cookie),value);
 assert.notEqual(scannerSessionFingerprint('host',cookie),value);assert.notEqual(scannerSessionFingerprint('door',cookie+'-new'),value);
});

const reviewEvent='50000000-0000-4000-8000-000000000001';
const reviewFixture={id:'50000000-0000-4000-8000-000000000002',purpose:'reminder',ids:['50000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000004'],position:0,prepared:[],revision:0,updatedAt:1000};
test('WhatsApp review whitelists only progress, without private guest fields or messages',()=>{
 const record=whatsappReviewRecord(reviewEvent,{...reviewFixture,guest:{name:'private-name'},phone:'private-phone',message:'private-message',accessToken:'private-token',url:'private-link'});
 assert.deepEqual(record,{version:1,invitationId:reviewEvent,review:reviewFixture});
 for(const secret of ['private-name','private-phone','private-message','private-token','private-link'])assert.ok(!JSON.stringify(record).includes(secret));
 assert.deepEqual(restoreWhatsAppReview(JSON.stringify(record),reviewEvent,1000),reviewFixture);
 assert.notEqual(whatsappReviewKey(reviewEvent),whatsappReviewKey(reviewFixture.id));
});
test('review restores the same ordered list, position and opening intent after interruption',()=>{
 const prepared=prepareWhatsAppReview(reviewFixture,reviewFixture.ids[0],1100);
 assert.deepEqual(prepared.prepared,[reviewFixture.ids[0]]);assert.equal(prepared.position,0);
 assert.equal(prepareWhatsAppReview(prepared,reviewFixture.ids[0],1200),prepared);
 const next=advanceWhatsAppReview(prepared,1200), raw=JSON.stringify(whatsappReviewRecord(reviewEvent,next));
 assert.deepEqual(restoreWhatsAppReview(raw,reviewEvent,1300),{...next,position:1,revision:2});
 assert.deepEqual(next.ids,reviewFixture.ids);assert.equal(prepareWhatsAppReview(next,'not-in-this-list'),next);
 const complete=advanceWhatsAppReview(next,1400);assert.equal(advanceWhatsAppReview(complete,1500),complete);
});
test('review refuses corruption, another event, future timestamps and expiration',()=>{
 const record=whatsappReviewRecord(reviewEvent,reviewFixture), raw=JSON.stringify(record);
 for(const value of [null,'broken','x'.repeat(20001),JSON.stringify({...record,version:2}),JSON.stringify({...record,invitationId:reviewFixture.id})])assert.equal(restoreWhatsAppReview(value,reviewEvent,1000),null);
 assert.equal(restoreWhatsAppReview(raw,reviewEvent,999),null);
 assert.equal(restoreWhatsAppReview(raw,reviewEvent,1000+REVIEW_MAX_AGE+1),null);
 assert.ok(restoreWhatsAppReview(raw,reviewEvent,1000+REVIEW_MAX_AGE));
 for(const patch of [{ids:[]},{ids:[...reviewFixture.ids,reviewFixture.ids[0]]},{ids:['unknown']},{prepared:['unknown']},{prepared:[reviewFixture.ids[0],reviewFixture.ids[0]]},{position:3},{position:-1},{revision:1.5},{purpose:['reminder']}])assert.throws(()=>whatsappReviewRecord(reviewEvent,{...reviewFixture,...patch}));
});
test('review bounds are sufficient for 200 contacts and reject a larger list',()=>{
 const ids=Array.from({length:200},(_,i)=>`50000000-0000-4000-8000-${String(i+10).padStart(12,'0')}`);
 const full={...reviewFixture,ids,prepared:ids,position:200};
 const raw=JSON.stringify(whatsappReviewRecord(reviewEvent,full));assert.ok(raw.length<20000);
 assert.equal(restoreWhatsAppReview(raw,reviewEvent,1000).ids.length,200);
 assert.throws(()=>whatsappReviewRecord(reviewEvent,{...full,ids:[...ids,reviewEvent]}));
});
test('stale review panels cannot overwrite newer progress or change a revision in place',()=>{
 const values=new Map(), storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 assert.equal(saveWhatsAppReview(storage,reviewEvent,reviewFixture,1000),true);
 const next=advanceWhatsAppReview(reviewFixture,1100);assert.equal(saveWhatsAppReview(storage,reviewEvent,next,1100),true);
 assert.equal(saveWhatsAppReview(storage,reviewEvent,reviewFixture,1100),false);
 assert.equal(saveWhatsAppReview(storage,reviewEvent,{...next,prepared:[next.ids[0]]},1100),false);
 assert.equal(saveWhatsAppReview(storage,reviewEvent,{...next,id:reviewEvent},1100),false);
 assert.deepEqual(restoreWhatsAppReview(storage.getItem(whatsappReviewKey(reviewEvent)),reviewEvent,1100),next);
});
test('clearing a review never clears another review, another event or newer progress',()=>{
 const values=new Map(), storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 saveWhatsAppReview(storage,reviewEvent,reviewFixture,1000);saveWhatsAppReview(storage,reviewFixture.id,reviewFixture,1000);
 const next=advanceWhatsAppReview(reviewFixture,1100);saveWhatsAppReview(storage,reviewEvent,next,1100);
 assert.equal(canClearWhatsAppReview(next,reviewFixture,true),false);
 assert.equal(canClearWhatsAppReview(reviewFixture,next,true),true);
 assert.equal(canClearWhatsAppReview({...reviewFixture,id:reviewEvent},next,true),false);
 assert.equal(clearWhatsAppReview(storage,reviewEvent,reviewFixture,1100),false);
 assert.equal(clearWhatsAppReview(storage,reviewEvent,{...next,id:reviewEvent},1100),false);
 assert.equal(clearWhatsAppReview(storage,reviewEvent,next,1100),true);
 assert.ok(storage.getItem(whatsappReviewKey(reviewFixture.id)));
 assert.equal(saveWhatsAppReview(storage,reviewEvent,next,1100),false);
});
test('review storage failures remain explicit instead of reporting a saved draft',()=>{
 for(const failing of ['read','write','remove']) {
  const raw=JSON.stringify(whatsappReviewRecord(reviewEvent,reviewFixture));
  const storage={getItem:()=>{if(failing==='read')throw new Error('denied');return failing==='write'?null:raw;},setItem:()=>{throw new Error('quota');},removeItem:()=>{throw new Error('denied');}};
  if(failing==='remove')assert.throws(()=>clearWhatsAppReview(storage,reviewEvent,reviewFixture,1000));
  else assert.throws(()=>saveWhatsAppReview(storage,reviewEvent,reviewFixture,1000));
 }
});

const scanGuest='40000000-0000-4000-8000-000000000001';
const scanPerson={id:'40000000-0000-4000-8000-000000000101',guestId:scanGuest,seatNo:1,state:'out',revision:4};
const scanOperation={attendeeId:scanPerson.id,action:'in',expectedRevision:4,requestId:'40000000-0000-4000-8000-000000000201'};
const scanReceipt={ok:true,replayed:false,attendee:{...scanPerson,state:'in',revision:5}};

test('scanner refuses mixed, duplicated or malformed passes before enabling entry',()=>{
 const group={invitationId:recoveryScope.invitationId,guest:{id:scanGuest,name:'Familia ficticia',tableNo:'7',accessCode:'ENK-QA'},attendees:[scanPerson]};
 assert.deepEqual(parseScannerGroup(group).attendees[0].id,scanPerson.id);
 for(const attendees of [[scanPerson,scanPerson],[scanPerson,{...scanPerson,id:scanOperation.requestId}], [{...scanPerson,guestId:scanOperation.requestId}], [{...scanPerson,state:'paid'}], [{...scanPerson,state:['in']}], [{...scanPerson,revision:-1}], [{...scanPerson,seatNo:21}], [null], Array(21).fill(scanPerson)]) assert.throws(()=>parseScannerGroup({...group,attendees}));
 assert.throws(()=>parseScannerGroup(group,scanOperation.requestId));
 assert.throws(()=>parseScannerGroup(group,undefined,scanGuest));
 assert.throws(()=>parseScannerGroup({guest:group.guest}));
 assert.equal(parseScannerGroup({...group,attendees:[]}).attendees.length,0);
});

test('scanner only accepts a receipt for the exact person, family, seat and committed revision',()=>{
 assert.equal(parseScanReceipt(scanReceipt,scanOperation,scanPerson).attendee.state,'in');
 for(const value of [null,{}, {...scanReceipt,ok:false}, {...scanReceipt,replayed:undefined}, {...scanReceipt,attendee:{...scanReceipt.attendee,id:scanGuest}}, {...scanReceipt,attendee:{...scanReceipt.attendee,guestId:scanOperation.requestId}}, {...scanReceipt,attendee:{...scanReceipt.attendee,seatNo:2}}, {...scanReceipt,attendee:{...scanReceipt.attendee,revision:4}}, {...scanReceipt,attendee:{...scanReceipt.attendee,revision:6}}, {...scanReceipt,attendee:{...scanReceipt.attendee,state:'out'}}]) assert.throws(()=>parseScanReceipt(value,scanOperation,scanPerson),error=>error instanceof ScanRequestError && error.retryable);
});

test('a replay may report a later exit and must preserve the current server state',()=>{
 const result=parseScanReceipt({...scanReceipt,replayed:true,attendee:{...scanPerson,state:'out',revision:6}},scanOperation,scanPerson);
 assert.equal(result.changedLater,true);assert.equal(result.attendee.state,'out');
 assert.equal(parseScanReceipt({...scanReceipt,replayed:true},scanOperation,scanPerson).changedLater,false);
 assert.throws(()=>parseScanReceipt({...scanReceipt,replayed:true,attendee:{...scanPerson,revision:5}},scanOperation,scanPerson));
});

test('lost check-in reply retries the identical operation and counts only once',async()=>{
 const bodies=[];let writes=0;
 const transport=async(url,options)=>{assert.equal(url,'/api/checkin');assert.equal(options.method,'POST');bodies.push(JSON.parse(options.body));if(bodies.length===1){writes++;throw new TypeError('lost');}return new Response(JSON.stringify({...scanReceipt,replayed:true}));};
 await assert.rejects(recordScan({...scanOperation,phone:'private',guestToken:'secret'},scanPerson,'door',transport),error=>error.retryable);
 const result=await recordScan(scanOperation,scanPerson,'door',transport);
 assert.equal(result.replayed,true);assert.equal(writes,1);assert.deepEqual(bodies[0],{...scanOperation,scope:'door'});assert.deepEqual(bodies[0],bodies[1]);
});

test('scanner retains uncertainty for incomplete replies, throttling and subsequent refusals',async()=>{
 for(const response of [new Response('bad'),new Response(JSON.stringify({error:'later'}),{status:503}),new Response(JSON.stringify({error:'slow'}),{status:429}),new Response(JSON.stringify({...scanReceipt,attendee:{...scanReceipt.attendee,id:scanGuest}}))]) {
  await assert.rejects(recordScan(scanOperation,scanPerson,'host',async()=>response),error=>error.retryable && !scanFailureIsDefinitive(error,false));
 }
 for(const status of [400,403,404,409]) await assert.rejects(recordScan(scanOperation,scanPerson,'door',async()=>new Response(JSON.stringify({error:'refused'}),{status})),error=>scanFailureIsDefinitive(error,false) && !scanFailureIsDefinitive(error,true));
});

test('a later permission or revision refusal never discards an earlier uncertain delivery', () => {
 for(const message of ['No autorizado','Invitado modificado','Invitado eliminado']) {
  const refusal=new DeliveryTrackingError(message,false);
  assert.equal(deliveryFailureIsDefinitive(refusal,false),true);
  assert.equal(deliveryFailureIsDefinitive(refusal,true),false);
 }
 for(const error of [new TypeError('offline'),new DeliveryTrackingError('Incomplete receipt',true),new Error('Unknown')]) {
  assert.equal(deliveryFailureIsDefinitive(error,false),false);assert.equal(deliveryFailureIsDefinitive(error,true),false);
 }
});

test('delivery recovery persists only scoped operation identity, never guest/contact/message or QR data', () => {
 const id='10000000-0000-4000-8000-000000000001';
 const operation={guestId:'20000000-0000-4000-8000-000000000001',requestId:'30000000-0000-4000-8000-000000000001',expectedRevision:7,action:'reminder'};
 const record=deliveryRecoveryRecord(id,{...operation,phone:'private-phone',message:'private-message',accessToken:'private-token',guest:{name:'private-name'}});
 assert.deepEqual(record,{version:1,invitationId:id,operation});
 const serialized=JSON.stringify(record);
 for(const secret of ['private-phone','private-message','private-token','private-name']) assert.ok(!serialized.includes(secret));
 assert.deepEqual(restoreDeliveryRecovery(serialized,id),operation);
 assert.notEqual(deliveryRecoveryKey(id),deliveryRecoveryKey('other'));
 for(const bad of [null,'bad','x'.repeat(1025),JSON.stringify({...record,version:2}),JSON.stringify({...record,invitationId:'other'}),JSON.stringify({...record,operation:{...operation,action:'paid'}}),JSON.stringify({...record,operation:{...operation,expectedRevision:-1}}),JSON.stringify({...record,operation:{...operation,guestId:'invalid'}})])assert.equal(restoreDeliveryRecovery(bad,id),null);
});

test('delivery recovery refuses to replace an unresolved request or delete a newer one', () => {
 const id='10000000-0000-4000-8000-000000000001',key=deliveryRecoveryKey(id);
 const operation={guestId:'20000000-0000-4000-8000-000000000001',requestId:'30000000-0000-4000-8000-000000000001',expectedRevision:7,action:'reminder'};
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
 assert.equal(saveDeliveryRecovery(storage,id,operation),true);
 assert.equal(saveDeliveryRecovery(storage,id,{...operation,requestId:'30000000-0000-4000-8000-000000000002'}),false);
 assert.equal(saveDeliveryRecovery(storage,id,{...operation,action:'manual'}),false);
 assert.equal(saveDeliveryRecovery(storage,id,operation),true);
 assert.equal(clearDeliveryRecovery(storage,id,{...operation,requestId:'30000000-0000-4000-8000-000000000002'}),false);assert.ok(data.has(key));
 assert.equal(clearDeliveryRecovery(storage,id,operation),true);assert.ok(!data.has(key));
 data.set(key,'broken');assert.equal(saveDeliveryRecovery(storage,id,operation),false);assert.equal(data.get(key),'broken');
});

test('a delivery draft restored after reload retries the exact same body and accepts its replay receipt', async () => {
 const id='10000000-0000-4000-8000-000000000001';
 const operation={guestId:'20000000-0000-4000-8000-000000000001',requestId:'30000000-0000-4000-8000-000000000001',expectedRevision:7,action:'reminder'};
 let firstBody;
 await assert.rejects(trackGuestDelivery(operation,async(_url,options)=>{firstBody=options.body;throw new TypeError('reply lost after write');}),error=>error.retryable);
 const restored=restoreDeliveryRecovery(JSON.stringify(deliveryRecoveryRecord(id,operation)),id);
 const result=await trackGuestDelivery(restored,async(_url,options)=>{assert.equal(options.body,firstBody);return new Response(JSON.stringify({guest:{id:operation.guestId,responseRevision:8,reminderCount:1},replayed:true}));});
 assert.equal(result.reminderCount,1);
});

test('roster pagination bounds large and shrinking live lists without dropping the last group', () => {
 const guests=Array.from({length:1001},(_,index)=>({id:String(index)}));
 const original=guests.slice();
 const first=rosterPage(guests,1),last=rosterPage(guests,1000);
 assert.equal(first.items.length,25);assert.equal(first.from,1);assert.equal(first.to,25);assert.equal(first.pages,41);
 assert.deepEqual(last.items,[guests[1000]]);assert.equal(last.page,41);assert.equal(last.from,1001);assert.equal(last.to,1001);
 const shrunk=rosterPage(guests.slice(0,26),41);assert.equal(shrunk.page,2);assert.equal(shrunk.items[0].id,'25');
 for(const invalid of [0,-1,NaN,Infinity,1.5])assert.equal(rosterPage(guests,invalid).page,1);
 assert.deepEqual(rosterPage([],9),{items:[],page:1,pages:1,from:0,to:0,total:0});
 assert.deepEqual(guests,original);
});

test('pagination does not restrict the filtered CSV or WhatsApp queue to the visible page', () => {
 const guests=Array.from({length:63},(_,index)=>({id:`qa-${index}`,publicId:`QA${index}`,name:`Familia ${String(index).padStart(3,'0')}`,passes:2,status:'pending',sent:false,allowKids:false,inside:0,group:index<60?'Familia':'Amigos',phone:'+59170000001'}));
 const filtered=filterRoster(guests,{search:'',status:'all',delivery:'all',table:'all',access:'all',sort:'name',group:'Familia'});
 const listing=rosterPage(filtered,2);
 assert.equal(listing.items.length,25);assert.equal(listing.from,26);assert.equal(listing.to,50);assert.equal(listing.total,60);
 const exported=rosterCsv(filtered,{guestManagement:true,qrAccess:true,tableAssignment:true});
 assert.equal(exported.split('\r\n').length,61);assert.ok(exported.includes('Familia 059'));assert.ok(!exported.includes('Familia 060'));
 const queue=whatsappQueue(filtered,'invitation');assert.equal(queue.ids.length,60);assert.ok(queue.ids.includes('qa-59'));assert.ok(!queue.ids.includes('qa-60'));
});

test('table summary and filtering agree on legacy whitespace and count confirmed people only', () => {
 const base={publicId:'QA',allowKids:false,sent:false,inside:0};
 const guests=[
  {...base,id:'a',name:'A',tableNo:' 2 ',status:'confirmed',passes:4,confirmedPasses:2},
  {...base,id:'b',name:'B',tableNo:'2',status:'confirmed',passes:3},
  {...base,id:'c',name:'C',tableNo:'10',status:'pending',passes:6},
  {...base,id:'d',name:'D',tableNo:'2',status:'declined',passes:5},
  {...base,id:'e',name:'E',tableNo:' ',status:'confirmed',passes:1},
 ];
 assert.deepEqual(rosterTables(guests),[{name:'2',confirmed:5},{name:'10',confirmed:0}]);
 const filtered=filterRoster(guests,{search:'',status:'all',delivery:'all',table:'2',access:'all',sort:'name'});
 assert.deepEqual(filtered.map(g=>g.id),['a','b','d']);
});

test('reception search keeps SQL wildcards literal and bounds every field',()=>{
 assert.deepEqual(receptionSearch('  Pérez  ','name'),{field:'name',pattern:'%Pérez%'});
 assert.equal(receptionSearch('50%_A\\B','name').pattern,'%50\\%\\_A\\\\B%');
 assert.equal(receptionSearch('7','table').pattern,'7');
 for(const [q,field] of [['x','name'],['','table'],['a\nb','name'],['x'.repeat(81),'name'],['x'.repeat(21),'table'],['Test','phone']])assert.throws(()=>receptionSearch(q,field),/INVALID_INPUT/);
});
test('reception client checks its reply and passes scope, exact table and cancellation to the private endpoint',async()=>{
 const controller=new AbortController(),id='60000000-0000-4000-8000-000000000017',key='a'.repeat(64);const response={invitationId:id,guests:[{id:'60000000-0000-4000-8000-000000000001',name:'Familia QA',passes:4,tableNo:'7'}],hasMore:false};
 const result=await findReceptionGuests(id,'door','7','table',controller.signal,key,async(url,options)=>{const q=new URL(url,'https://local.invalid');assert.equal(q.pathname,'/api/checkin/search');assert.equal(q.searchParams.get('scope'),'door');assert.equal(q.searchParams.get('invitationId'),id);assert.equal(q.searchParams.get('field'),'table');assert.equal(options.signal,controller.signal);assert.equal(options.cache,'no-store');assert.equal(new Headers(options.headers).get('X-Enkarta-Scanner-Session'),key);return new Response(JSON.stringify(response));});assert.deepEqual(result,response);
 await assert.rejects(findReceptionGuests(id,'door','Test','name',controller.signal,key,async()=>new Response('{"error":"No autorizado"}',{status:403})),/No autorizado/);
 for(const bad of [null,{...response,hasMore:'yes'},{...response,guests:[{...response.guests[0],passes:0}]}]) await assert.rejects(findReceptionGuests(id,'host','Test','name',controller.signal,key,async()=>new Response(JSON.stringify(bad))),/verificar/);
});

const receptionEvent='60000000-0000-4000-8000-000000000017';
const receptionReply={invitationId:receptionEvent,guests:[{id:'60000000-0000-4000-8000-000000000001',name:'Familia Pérez',passes:4,tableNo:'7'}],hasMore:false};
test('reception reply requires the expected event and valid unique groups before exposing selectable IDs',()=>{
 for(const value of [null,{},[],{...receptionReply,invitationId:'60000000-0000-4000-8000-000000000018'},{...receptionReply,guests:[receptionReply.guests[0],receptionReply.guests[0]]},{...receptionReply,guests:[{...receptionReply.guests[0],id:'not-a-uuid'}]},{...receptionReply,guests:Array(21).fill(receptionReply.guests[0])}])assert.throws(()=>parseReceptionSearch(value,receptionEvent),/verificar/);
 assert.deepEqual(parseReceptionSearch({invitationId:receptionEvent,guests:[],hasMore:false},receptionEvent),{invitationId:receptionEvent,guests:[],hasMore:false});
});
test('reception reply validates names, tables and capacity while returning only reception fields',()=>{
 for(const change of [{name:null},{name:'  '},{tableNo:{}},{tableNo:7},{passes:'4'},{passes:0},{passes:21},{passes:1.5}])assert.throws(()=>parseReceptionSearch({...receptionReply,guests:[{...receptionReply.guests[0],...change}]},receptionEvent),/verificar/);
 const value={...receptionReply,phone:'PRIVATE',guests:[{...receptionReply.guests[0],phone:'PRIVATE',accessToken:'PRIVATE',message:'PRIVATE'}]};assert.deepEqual(parseReceptionSearch(value,receptionEvent),receptionReply);assert.doesNotMatch(JSON.stringify(parseReceptionSearch(value,receptionEvent)),/PRIVATE/);
});
test('reception client rejects missing scope binding and pre-cancelled work without querying',async()=>{
 let calls=0;const transport=async()=>{calls++;return new Response(JSON.stringify(receptionReply));};
 for(const [id,scope,key]of [['event','door','a'.repeat(64)],[receptionEvent,'other','a'.repeat(64)],[receptionEvent,'door',''],[receptionEvent,'door','not-a-session']])await assert.rejects(findReceptionGuests(id,scope,'Pérez','name',new AbortController().signal,key,transport),/inicia sesión/);
 const controller=new AbortController();controller.abort();await assert.rejects(findReceptionGuests(receptionEvent,'door','Pérez','name',controller.signal,'a'.repeat(64),transport));assert.equal(calls,0);
});
test('reception client discards late transport and body replies after a query or screen is cancelled',async()=>{
 for(const during of ['transport','body']){const controller=new AbortController();let release,started;const waiting=new Promise(resolve=>{release=resolve;}),entered=new Promise(resolve=>{started=resolve;});
 const pending=findReceptionGuests(receptionEvent,'door','Pérez','name',controller.signal,'a'.repeat(64),async()=>{if(during==='transport'){started();await waiting;return new Response(JSON.stringify(receptionReply));}return {ok:true,json:async()=>{started();await waiting;return receptionReply;}};});
 await entered;controller.abort();release();await assert.rejects(pending,error=>error.name==='AbortError');}
});
test('reception client reports network and incomplete replies without accepting a stale group',async()=>{
 const find=transport=>findReceptionGuests(receptionEvent,'host','Pérez','name',new AbortController().signal,'a'.repeat(64),transport);
 await assert.rejects(find(async()=>{throw new TypeError('offline');}),/Sin conexión/);await assert.rejects(find(async()=>new Response('{truncated')),/incompleta/);await assert.rejects(find(async()=>new Response(JSON.stringify({error:{private:'INTERNAL'}}),{status:500})),/No se pudo buscar/);
 await assert.rejects(find(async()=>new Response(JSON.stringify({...receptionReply,invitationId:'60000000-0000-4000-8000-000000000018'}))),/verificar/);
});
test('malformed delivery receipts stay retryable instead of losing their original operation',async()=>{
 const operation={guestId:'qa',action:'reminder',expectedRevision:7,requestId:'operation'};
 for(const value of [null,{}, {guest:{id:'qa',responseRevision:7},replayed:true},{guest:{id:'qa',responseRevision:8}},{guest:{id:'other',responseRevision:8},replayed:true}]) await assert.rejects(trackGuestDelivery(operation,async()=>new Response(JSON.stringify(value))),error=>error instanceof DeliveryTrackingError && error.retryable);
});
const { clearGuestImport, saveGuestImport, discardUnreadableGuestImport, GuestImportWriteError, submitGuestImport, restoreGuestImport, guestImportStorageKey, guestImportMessage, GuestImportError } = require('../src/lib/guest-import-operation.ts');

test('guest import recovery draft is bounded, scoped to its event and preserves the exact request',()=>{
 const id='10000000-0000-4000-8000-000000000001';
 const operation={invitationId:id,requestId:'20000000-0000-4000-8000-000000000001',guests:[{name:'Familia',passes:4,phone:'+59171234567',allowKids:false,eventAccess:'reception'}]};
 assert.deepEqual(restoreGuestImport(JSON.stringify(operation),id),operation);
 assert.notEqual(guestImportStorageKey(id),guestImportStorageKey('other'));
 for(const value of [null,'{bad',JSON.stringify({...operation,invitationId:'other'}),JSON.stringify({...operation,requestId:'bad'}),JSON.stringify({...operation,guests:[]}),JSON.stringify({...operation,guests:Array(201).fill(operation.guests[0])}),JSON.stringify({...operation,guests:[{name:'Bad',passes:2.5}]}),'x'.repeat(131073)]) assert.equal(restoreGuestImport(value,id),null);
});
test('import transport distinguishes an uncertain result from an explicit rejection',async()=>{
 const operation={invitationId:'qa',requestId:'qa',guests:[{name:'QA',passes:1}]};
 for(const transport of [async()=>{throw new TypeError('offline');},async()=>new Response('bad'),async()=>new Response(JSON.stringify({error:'Busy'}),{status:503}),async()=>new Response('{}',{status:429})]) {
  await assert.rejects(submitGuestImport(operation,transport),error=>error instanceof GuestImportError && error.uncertain);
 }
 for(const status of [400,403,409]) await assert.rejects(submitGuestImport(operation,async()=>new Response('{"error":"Denied"}',{status})),error=>error instanceof GuestImportError && !error.uncertain && error.message==='Denied');
});
test('a late import acknowledgement never clears a newer pending operation',()=>{
 const invitationId='10000000-0000-4000-8000-000000000001',requestId='20000000-0000-4000-8000-000000000001';
 const key=guestImportStorageKey(invitationId),data=new Map([[key,JSON.stringify({invitationId,requestId,guests:[{name:'QA',passes:1}]})]]);
 const storage={getItem:key=>data.get(key)??null,removeItem:key=>data.delete(key)};
 const operation={invitationId,requestId,guests:[{name:'QA',passes:1}]};
 assert.equal(clearGuestImport(storage,invitationId,{...operation,requestId:'20000000-0000-4000-8000-000000000002'}),false);assert.equal(data.size,1);
 assert.equal(clearGuestImport(storage,invitationId,operation),true);assert.equal(data.size,0);
});

const storageEvent='10000000-0000-4000-8000-000000000001';
const storageDelivery={guestId:'20000000-0000-4000-8000-000000000001',requestId:'30000000-0000-4000-8000-000000000001',expectedRevision:7,action:'reminder'};
const storageImport={invitationId:storageEvent,requestId:'30000000-0000-4000-8000-000000000002',guests:[{name:'Familia ficticia',passes:2,allowKids:false,eventAccess:'both'}]};
function memoryStorage(){const values=new Map();return{values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
test('WhatsApp recovery distinguishes an unknown read from a failed write after a verified read',()=>{
 const denied=new Error('read denied');let writes=0;
 assert.throws(()=>saveDeliveryRecovery({getItem:()=>{throw denied},setItem:()=>writes++},storageEvent,storageDelivery),error=>error===denied&&!(error instanceof DeliveryRecoveryWriteError));assert.equal(writes,0);
 assert.throws(()=>saveDeliveryRecovery({getItem:()=>null,setItem:()=>{throw new Error('full')}},storageEvent,storageDelivery),DeliveryRecoveryWriteError);
});
test('import recovery cannot overwrite another lot or a changed payload using the same request UUID',()=>{
 const storage=memoryStorage();assert.equal(saveGuestImport(storage,storageImport),true);assert.equal(saveGuestImport(storage,storageImport),true);
 for(const changed of [{...storageImport,requestId:storageDelivery.requestId},{...storageImport,guests:[{...storageImport.guests[0],passes:3}]}]){
  assert.equal(saveGuestImport(storage,changed),false);assert.equal(clearGuestImport(storage,storageEvent,changed),false);
 }
 assert.deepEqual(restoreGuestImport(storage.getItem(guestImportStorageKey(storageEvent)),storageEvent),storageImport);
 assert.equal(clearGuestImport(storage,storageEvent,storageImport),true);assert.equal(clearGuestImport(storage,storageEvent,storageImport),true);
});
test('import recovery never treats a storage read error as an empty draft or an allowed memory fallback',()=>{
 const denied=new Error('read denied');let writes=0;
 assert.throws(()=>saveGuestImport({getItem:()=>{throw denied},setItem:()=>writes++},storageImport),error=>error===denied&&!(error instanceof GuestImportWriteError));assert.equal(writes,0);
 assert.throws(()=>saveGuestImport({getItem:()=>null,setItem:()=>{throw new Error('quota')}},storageImport),GuestImportWriteError);
});
test('WhatsApp acknowledgement compares the whole action and preserves any changed or corrupted recovery',()=>{
 const storage=memoryStorage();saveDeliveryRecovery(storage,storageEvent,storageDelivery);
 for(const changed of [{...storageDelivery,action:'manual'},{...storageDelivery,expectedRevision:8},{...storageDelivery,guestId:storageImport.requestId}])assert.equal(clearDeliveryRecovery(storage,storageEvent,changed),false);
 assert.equal(clearDeliveryRecovery(storage,storageEvent,storageDelivery),true);assert.equal(clearDeliveryRecovery(storage,storageEvent,storageDelivery),true);
 storage.setItem(deliveryRecoveryKey(storageEvent),'broken');assert.equal(clearDeliveryRecovery(storage,storageEvent,storageDelivery),false);
});
test('empty and malformed records block new imports, WhatsApp actions and QR movements instead of being overwritten',()=>{
 for(const raw of ['', 'broken', '{}']){
  const delivery=memoryStorage();delivery.setItem(deliveryRecoveryKey(storageEvent),raw);assert.equal(saveDeliveryRecovery(delivery,storageEvent,storageDelivery),false);assert.equal(clearDeliveryRecovery(delivery,storageEvent,storageDelivery),false);assert.equal(delivery.getItem(deliveryRecoveryKey(storageEvent)),raw);
  const imports=memoryStorage();imports.setItem(guestImportStorageKey(storageEvent),raw);assert.equal(saveGuestImport(imports,storageImport),false);assert.equal(clearGuestImport(imports,storageEvent,storageImport),false);assert.equal(imports.getItem(guestImportStorageKey(storageEvent)),raw);
  const scans=memoryStorage();scans.setItem(scanRecoveryKey(recoveryScope),raw);assert.equal(saveScanRecovery(scans,recoveryScope,recoveryFixture),false);assert.equal(clearScanRecovery(scans,recoveryScope,recoveryFixture),false);assert.equal(scans.getItem(scanRecoveryKey(recoveryScope)),raw);
 }
});
test('discarding an unreadable import or WhatsApp draft requires the exact last observed bytes',()=>{
 for(const [key,discard]of [[guestImportStorageKey(storageEvent),discardUnreadableGuestImport],[deliveryRecoveryKey(storageEvent),discardUnreadableDelivery]]){
  const storage=memoryStorage();storage.setItem(key,'broken');assert.equal(discard(storage,storageEvent,'previous-broken'),false);assert.equal(storage.getItem(key),'broken');
  storage.setItem(key,'newer');assert.equal(discard(storage,storageEvent,'broken'),false);assert.equal(storage.getItem(key),'newer');
  assert.equal(discard(storage,storageEvent,'newer'),true);storage.setItem(key,'');assert.equal(discard(storage,storageEvent,''),true);
 }
});
test('failed removal stays explicit so neither imports nor WhatsApp can acknowledge local retirement',()=>{
 for(const [raw,clear]of [[JSON.stringify(storageImport),s=>clearGuestImport(s,storageEvent,storageImport)],[JSON.stringify(deliveryRecoveryRecord(storageEvent,storageDelivery)),s=>clearDeliveryRecovery(s,storageEvent,storageDelivery)]]){
  let removals=0;const storage={getItem:()=>raw,removeItem:()=>{removals++;throw new Error('remove denied')}};
  assert.throws(()=>clear(storage),/remove denied/);assert.equal(removals,1);assert.equal(storage.getItem(),raw);
 }
});
test('recovering a stored import keeps its exact body across a lost reply and storage cleanup failure',async()=>{
 const storage=memoryStorage();saveGuestImport(storage,storageImport);const restored=restoreGuestImport(storage.getItem(guestImportStorageKey(storageEvent)),storageEvent);
 let submitted;await assert.rejects(submitGuestImport(restored,async(_url,options)=>{submitted=options.body;throw new TypeError('lost reply')}),GuestImportError);
 const guest={id:storageDelivery.guestId,responseRevision:0};
 const receipt=await submitGuestImport(restored,async(_url,options)=>{assert.equal(options.body,submitted);return new Response(JSON.stringify({requestId:restored.requestId,guests:[guest],replayed:true,importedCount:1,missingCount:0}))});assert.equal(receipt.replayed,true);
 assert.throws(()=>clearGuestImport({...storage,removeItem:()=>{throw new Error('denied')}},storageEvent,restored),/denied/);
 assert.deepEqual(restoreGuestImport(storage.getItem(guestImportStorageKey(storageEvent)),storageEvent),restored);
});
test('import transport accepts only a complete receipt for the same operation and unique guest IDs',async()=>{
 const operation={invitationId:'qa',requestId:'qa-operation',guests:[{name:'QA',passes:1}]};
 const guest={id:'10000000-0000-4000-8000-000000000001',name:'QA',responseRevision:2};
 const valid={requestId:operation.requestId,guests:[guest],importedCount:1,missingCount:0,replayed:true};
 const transport=value=>async()=>new Response(JSON.stringify(value));
 const receipt=await submitGuestImport(operation,transport(valid));assert.equal(receipt.guests[0].responseRevision,2);assert.equal(receipt.replayed,true);
 for(const patch of [{requestId:'other'},{replayed:'true'},{importedCount:2},{missingCount:-1},{missingCount:1},{guests:[{...guest,responseRevision:-1}]},{guests:[{...guest,id:'bad'}]},{guests:[guest,guest]}]) await assert.rejects(submitGuestImport(operation,transport({...valid,...patch})),error=>error instanceof GuestImportError && error.uncertain);
 const deleted=await submitGuestImport(operation,transport({...valid,guests:[],missingCount:1}));assert.equal(deleted.missingCount,1);assert.match(guestImportMessage(deleted),/no se volvió a crear/);
});

test('CSV review reports exact records and never guesses ambiguous columns or invalid preferences',()=>{
 const parsed=parseGuestCsv('Nombre;Pases;Grupo;Niños;Preferencia\nAna;2;Amigos;Sí;Ceremonia\nError;2.5;Amigos;Sí;Todo\nAna;2;Amigos;Sí;Ceremonia\nAdultos;2;Familia;tal vez;Todo\nSitio;2;Familia;No;backstage');
 const mapping={0:'name',1:'passes',2:'group',3:'allowKids',4:'eventAccess'};
 const result=mapGuestCsvRows(parsed,mapping);
 assert.equal(result.rows.length,1);assert.equal(result.invalid,3);assert.equal(result.duplicates,1);
 assert.deepEqual(result.issues.map(issue=>issue.record),[2,3,4,5]);
 assert.match(result.issues[0].reason,/entero/);assert.equal(result.issues[1].kind,'duplicate');assert.match(result.issues[2].reason,/Niños/);assert.match(result.issues[3].reason,/Preferencia/);
 assert.equal(mapGuestCsvRows(parsed,{...mapping,4:'name'}).rows.length,0);
 assert.match(mapGuestCsvRows(parsed,{...mapping,4:'name'}).mappingErrors[0],/una sola vez/);
 assert.match(mapGuestCsvRows(parsed,{0:'ignore',1:'passes'}).mappingErrors[0],/Nombre/);
});
test('CSV rejects oversized groups without truncation and normalizes legacy phones for duplicates',()=>{
 const parsed=parseGuestCsv('Nombre;Teléfono;Grupo\nAna;71234567;Amigos\nLuis;;'+ 'x'.repeat(41));
 const result=mapGuestCsvRows(parsed,{0:'name',1:'phone',2:'group'},[{name:'Ana',phone:'7123 4567'}]);
 assert.equal(result.rows.length,0);assert.equal(result.duplicates,1);assert.equal(result.invalid,1);assert.match(result.issues[1].reason,/40/);
 const template=parseGuestCsv(require('../src/lib/guest-import.ts').guestImportTemplate());
 assert.equal(mapGuestCsvRows(template,Object.fromEntries(template.headers.map((h,i)=>[i,require('../src/lib/guest-import.ts').guessGuestColumn(h)]))).rows.length,1);
});
test('WhatsApp queues distinguish first invitations, reminders, invalid phones and bounded filtered lists',()=>{
 const base={name:'QA',status:'pending',sent:false,phone:'+59171234567'};
 const guests=[{...base,id:'pending'},{...base,id:'opened',deliveryStatus:'opened'},{...base,id:'marked',sent:true},{...base,id:'answered',status:'confirmed'},{...base,id:'invalid',phone:'bad'},{...base,id:'pending'}];
 assert.deepEqual(whatsappQueue(guests,'invitation').ids,['pending']);
 assert.deepEqual(whatsappQueue(guests,'reminder').ids,['pending','opened','marked']);
 assert.equal(whatsappQueue(guests,'reminder').invalidPhone,1);assert.equal(whatsappQueue(guests,'reminder').excluded,1);
 const many=whatsappQueue(Array.from({length:205},(_,i)=>({...base,id:String(i)})),'invitation');assert.equal(many.ids.length,200);assert.equal(many.overflow,5);
 const filter={search:'',status:'all',delivery:'all',table:'all',access:'all',sort:'name',group:'Familia'};
 assert.deepEqual(filterRoster([{...base,id:'a',group:'Familia'},{...base,id:'b',group:'Amigos'}],filter).map(g=>g.id),['a']);
});
test('lost delivery responses retry the same body without changing the request identity',async()=>{
 const operation={guestId:'qa',action:'reminder',expectedRevision:7,requestId:'request-qa'};
 const bodies=[];let attempt=0;
 const transport=async(url,init)=>{assert.equal(url,'/api/guests/delivery');bodies.push(init.body);if(++attempt===1)throw new Error('lost');return new Response(JSON.stringify({guest:{id:'qa',responseRevision:8},replayed:true}),{status:200});};
 await assert.rejects(trackGuestDelivery(operation,transport),error=>error instanceof DeliveryTrackingError && error.retryable);
 assert.equal((await trackGuestDelivery(operation,transport)).responseRevision,8);assert.equal(bodies[0],bodies[1]);
 for(const status of [403,409]) await assert.rejects(trackGuestDelivery(operation,async()=>new Response(JSON.stringify({error:'conflict'}),{status})),error=>error.retryable===false);
 await assert.rejects(trackGuestDelivery(operation,async()=>new Response('<html>down</html>',{status:503})),error=>error.retryable===true);
});
test('QR photo input validates size and format, and never treats decoded URLs as navigation',()=>{
 for(const type of ['image/png','image/jpeg','image/webp'])assert.doesNotThrow(()=>validateQrImage({type,size:90000}));
 for(const file of [{type:'image/svg+xml',size:100},{type:'image/png',size:0},{type:'image/png',size:10485761}])assert.throws(()=>validateQrImage(file));
 assert.equal(qrLookup('  QA-access-token-123  '),'token=QA-access-token-123');
 assert.equal(qrLookup('https://example.invalid/access'),'token=https%3A%2F%2Fexample.invalid%2Faccess');
 for(const value of ['', 'contains space', 'a'.repeat(257)])assert.throws(()=>qrLookup(value));
});

test('private metadata validates explicit clears and cannot override canonical values with a legacy draft',()=>{
 assert.deepEqual(parseGuestMetadata({phone:'7123 4567',group:' Amigos ',eventAccess:'ceremony'}),{phone:'+59171234567',group:'Amigos',eventAccess:'ceremony'});
 assert.deepEqual(parseGuestMetadata({phone:'',group:''}),{phone:'',group:''});
 for(const value of [{phone:'abc71234567'},{group:4},{eventAccess:['both']}]) assert.throws(()=>parseGuestMetadata(value));
 assert.deepEqual(guestMetadata({phone:'ok',group:5,eventAccess:'bad',arbitrary:'no'}),{phone:'ok'});
 const canonical={id:'qa',name:'QA',metadataStored:true,phone:'',group:''};
 assert.equal(withGuestMetadata(canonical,{phone:'OLD',group:'OLD'}).phone,'');
 assert.equal(withGuestMetadata({id:'legacy'},{phone:'OLD'}).phone,'OLD');
 const publicValue=publicGuest({...canonical,phone:'PRIVATE-PHONE',group:'PRIVATE-GROUP'});
 assert.equal(publicValue.phone,undefined); assert.equal(publicValue.group,undefined); assert.equal(publicValue.metadataStored,undefined);
});

test('a public invitation never serializes contact data from a preview guest',()=>{
 const invitation=marfilVivoDemo(); invitation.config.activeGuest={id:'qa',publicId:'qa',name:'QA',passes:2,allowKids:true,sent:false,status:'pending',phone:'PRIVATE-PHONE',group:'PRIVATE-GROUP',metadataStored:true};
 assert.doesNotMatch(JSON.stringify(require('../src/lib/client-invitation.ts').clientInvitation(invitation).config.activeGuest),/PRIVATE-PHONE|PRIVATE-GROUP|metadataStored/);
});

test('CSV preserves quoted delimiters, escaped quotes and multiline names', () => {
 const csv = parseGuestCsv('\uFEFFNombre;Pases;Grupo\r\n"Familia\r\nPérez, \"\"VIP\"\"";4;Amigos\r\nAna;2;Familia');
 assert.equal(csv.delimiter, ';'); assert.equal(csv.rows.length, 2);
 const result = mapGuestCsvRows(csv, {0:'name',1:'passes',2:'group'});
 assert.equal(result.invalid,0); assert.equal(result.rows[0].name,'Familia Pérez, "VIP"');
 assert.equal(result.rows[0].passes,4); assert.equal(result.rows[1].group,'Familia');
 assert.equal(parseGuestCsv('Nombre\tPases\nAna\t2').delimiter,'\t');
 const emptyLastCell = parseGuestCsv('Nombre\tPases\tGrupo\nAna\t2\t');
 assert.equal(emptyLastCell.invalidRows.length,0); assert.equal(emptyLastCell.rows[0][2],'');
 assert.throws(()=>parseGuestCsv('Nombre,Pases\n"Ana,2'),/sin cerrar/);
 assert.throws(()=>parseGuestCsv('Nombre,Pases\n"Ana"extra,2'),/fuera de/);
});
test('CSV rejects malformed width, fractional/excess passes and supplied invalid phones', () => {
 const parsed = parseGuestCsv('Nombre,Pases,Teléfono\nAna,2,71234567\nMalo,2.5,71234567\nExceso,21,71234567\nCero,0,71234567\nError,2,123\nExtra,2,71234567,sobra\nIncompleto,2\nAna,2,+59171234567');
 const result = mapGuestCsvRows(parsed, {0:'name',1:'passes',2:'phone'});
 assert.equal(result.rows.length,1); assert.equal(result.invalid,6); assert.equal(result.duplicates,1);
 assert.equal(result.rows[0].phone,'+59171234567');
 assert.equal(normalizeGuestPhone('00591 7123-4567'),'+59171234567');
 assert.equal(normalizeGuestPhone('+1234567890123456'),'');
 assert.equal(normalizeGuestPhone('012345678'),'');
 assert.equal(normalizeGuestPhone('abc71234567'),'');
 assert.equal(normalizeGuestPhone("'+59171234567"),'+59171234567');
 assert.equal(parseGuestCsv('').rows.length,0);
 assert.throws(()=>parseGuestCsv('a'.repeat(1048577)),/1 MB/);
});
test('quick lists never silently clamp passes or truncate names or batches', () => {
 assert.deepEqual(parseQuickGuestList('Ana López, 2\r\nCarlos').map(g=>[g.name,g.passes]),[['Ana López',2],['Carlos',1]]);
 for(const value of ['Ana, 21','Ana, 0','Ana, -1','Ana, 2.5','Ana, dos','a'.repeat(81)]) assert.throws(()=>parseQuickGuestList(value),/Revisa/);
 assert.throws(()=>parseQuickGuestList(Array(201).fill('Ana').join('\n')),/200/);
});
test('WhatsApp aliases resolve once and do not expand text inside guest data', () => {
 const guest={name:'Familia {link}',passes:4,tableNo:'7',accessCode:'ENK-QA'};
 assert.equal(guestMessage('{nombre_invitado} · {cantidad_pases} · {link_unico}',guest,'https://example.invalid/personal'),'Familia {link} · 4 · https://example.invalid/personal');
 assert.equal(guestMessage('{nombre} · {pases} · {mesa} · {codigo}',guest,'url'),'Familia {link} · 4 · 7 · ENK-QA');
});
test('acknowledged guest revisions preserve newer typing and local metadata', () => {
 const submitted={id:'qa',name:'Nombre guardado',passes:2,tableNo:'A',allowKids:true,status:'pending',responseRevision:0,phone:'+59171234567'};
 const saved={...submitted,name:'Nombre guardado normalizado',status:'confirmed',confirmedPasses:2,responseRevision:1};
 const latest={...submitted,name:'Nombre escrito después',tableNo:'B',group:'Amigos'};
 const merged=mergeSavedGuest(latest,submitted,saved);
 assert.equal(merged.name,latest.name); assert.equal(merged.tableNo,'B'); assert.equal(merged.group,'Amigos');
 assert.equal(merged.responseRevision,1); assert.equal(merged.status,'confirmed');
 assert.equal(mergeSavedGuest(submitted,submitted,saved).name,saved.name);
});
test('reception distinguishes partial entry, exhausted passes and exit for reentry', () => {
 const attendees=[1,2,3,4].map(id=>({id:String(id),state:id<3?'in':'out'}));
 assert.deepEqual([scannerStatus(attendees).inside,scannerStatus(attendees).remaining],[2,2]);
 assert.match(scannerStatus(attendees).title,/2 personas/);
 const full=attendees.map(a=>({...a,state:'in'})); assert.equal(scannerStatus(full).exhausted,true);
 assert.match(scannerStatus(full).detail,/salida/);
 full[0].state='out'; assert.equal(scannerStatus(full).exhausted,false); assert.match(scannerStatus(full).title,/1 persona/);
});
test('download names omit unsafe paths; invalid passes fail before canvas rendering', async () => {
 assert.equal(passFilename('../../ENK-QA/<>'),'pase-ENK-QA.png');
 assert.equal(passFilename(''),'pase-evento.png');
 for(const passes of [0,21,2.5]) await assert.rejects(accessPassPng({accessToken:'synthetic-token',accessCode:'ENK-QA',guestName:'Prueba',passes}),/pase válido/);
});
const { mapToAzure } = require('../src/lib/invitation-mapper.ts');
const { additionalServiceChecks, additionalServiceErrors, navigationCandidates, publicAdditionalServices } = require('../src/lib/additional-services.ts');
const { activeInvitationLocale, formatInvitationDate, invitationCopy } = require('../src/lib/invitation-i18n.ts');
const { parseSaveDateInput } = require('../src/lib/save-date.ts');
const { clientInvitation } = require('../src/lib/client-invitation.ts');
const { qualityChecksFor, qualityProgress, releaseReady, qualityReport, updateQualityCheck } = require('../src/lib/quality-assurance.ts');
const { commercialMessage, commercialContactPath, commercialConfirmationPath, parseCommercialContext } = require('../src/lib/commercial.ts');
const { COMMERCIAL_EVENT_PAGES, COMMERCIAL_EVENT_SLUGS } = require('../src/lib/event-pages.ts');
const { COMMERCIAL_PROOFS, isPublishableClientProof } = require('../src/lib/commercial-proof.ts');
const { LAUNCH_CALENDAR, MARKETING_CAMPAIGNS, MARKETING_FORMATS, marketingTrackingPath } = require('../src/lib/marketing-kit.ts');
const { SALES_PIPELINE, formatSalesQuote, salesQuoteTotals, salesReply } = require('../src/lib/sales-playbook.ts');

test('delivery tracking distinguishes opening, manual marking and real responses',()=>{
  assert.equal(deliveryState({status:'pending',sent:false,deliveryStatus:'pending'}),'pending');
  assert.equal(deliveryState({status:'pending',sent:false,deliveryStatus:'opened'}),'opened');
  assert.equal(deliveryState({status:'pending',sent:true,deliveryStatus:'pending'}),'marked');
  assert.equal(deliveryState({status:'confirmed',sent:false,deliveryStatus:'pending'}),'responded');
});
test('personal messages replace every supported field without claiming delivery',()=>{
  const g={name:'Familia Pérez',passes:3,tableNo:'7',accessCode:'ENK-123'};
  assert.equal(guestMessage('Hola {nombre}: {pases}, mesa {mesa}, {codigo} — {link}',g,'https://enkarta.test/i/x'),'Hola Familia Pérez: 3, mesa 7, ENK-123 — https://enkarta.test/i/x');
  assert.match(reminderMessage(undefined,g,'https://enkarta.test/i/x'),/recordamos confirmar/);
  const input={guestId:'10000000-0000-4000-8000-000000000001',requestId:'10000000-0000-4000-8000-000000000002',expectedRevision:0,action:'reminder'};
  assert.equal(parseDeliveryInput(input).action,'reminder'); assert.throws(()=>parseDeliveryInput({...input,requestId:'x'}));
});

test('commercial WhatsApp identifies package, design and reference without personal tracking', () => {
  const context = parseCommercialContext({ package: 'premium', design: 'Lunaria', event_type: 'Boda', placement: 'pricing_card', landing_path: '/muestra/azure', utm_source: 'instagram' });
  const message = commercialMessage(context, 'EK-A1B2C3D4');
  assert.match(message, /Premium de 930 Bs/); assert.match(message, /diseño Lunaria/); assert.match(message, /Referencia: EK-A1B2C3D4/);
  assert.doesNotMatch(JSON.stringify(context), /phone|telefono|ip/i);
  assert.equal(commercialContactPath({ packageKey: 'exclusive', design: 'Granate', placement: 'test' }), '/contacto/whatsapp?package=exclusive&placement=test&design=Granate');
  assert.equal(parseCommercialContext({ package: 'forged', landing_path: 'https://evil.test' }).packageKey, 'general');
  assert.equal(parseCommercialContext({ package: 'forged', landing_path: 'https://evil.test' }).landingPath, '/');
  assert.equal(commercialConfirmationPath({ packageKey: 'premium', design: 'Lunaria', eventType: 'Boda', landingPath: '/bodas' }), '/contacto/preparado?package=premium&design=Lunaria&event_type=Boda&from=%2Fbodas');
  assert.equal(commercialConfirmationPath({ landingPath: 'https://evil.test' }), '/contacto/preparado?from=%2F');
});

test('event landing pages are distinct, attributable and linked to real demos', () => {
  assert.deepEqual(COMMERCIAL_EVENT_SLUGS.sort(), ['bodas', 'cumpleanos', 'xv-anos']);
  const pages = Object.values(COMMERCIAL_EVENT_PAGES);
  assert.equal(new Set(pages.map(page => page.title)).size, 3);
  assert.equal(new Set(pages.map(page => page.eventType)).size, 3);
  for (const page of pages) {
    assert.equal(page.designKeys.length, 3);
    assert.equal(new Set(page.designKeys).size, 3);
    assert.equal(page.features.length, 3);
  }
});

test('client proof cannot be published without a dated authorization', () => {
  assert.ok(COMMERCIAL_PROOFS.every(isPublishableClientProof));
  assert.ok(COMMERCIAL_PROOFS.every(proof => proof.kind === 'demonstration'));
  const forged = { ...COMMERCIAL_PROOFS[0], kind: 'verified-client', permissionRecordedAt: undefined };
  assert.equal(isPublishableClientProof(forged), false);
  assert.equal(isPublishableClientProof({ ...forged, permissionRecordedAt: '2026-08-29T12:00:00Z' }), true);
});

test('marketing kit generates one measured asset matrix without changing campaign destinations', () => {
  assert.equal(Object.keys(MARKETING_CAMPAIGNS).length, 3);
  assert.equal(Object.keys(MARKETING_FORMATS).length, 3);
  for (const campaign of Object.keys(MARKETING_CAMPAIGNS)) for (const format of Object.keys(MARKETING_FORMATS)) {
    const path = marketingTrackingPath(campaign, format);
    assert.ok(path.startsWith(MARKETING_CAMPAIGNS[campaign].path));
    assert.match(path, /utm_source=instagram/); assert.match(path, /utm_campaign=lanzamiento_/); assert.match(path, /utm_content=/);
  }
  assert.match(marketingTrackingPath('bodas', 'square', 'whatsapp'), /utm_source=whatsapp/);
  assert.match(marketingTrackingPath('bodas', 'square', 'whatsapp'), /utm_medium=message/);
  assert.equal(LAUNCH_CALENDAR.length, 14);
  assert.deepEqual(LAUNCH_CALENDAR.map(item => item.day), Array.from({ length: 14 }, (_, index) => index + 1));
  assert.ok(LAUNCH_CALENDAR.some(item => item.channel === 'Operación'));
});

test('sales playbook produces consistent totals, proposal and stage replies', () => {
  const input = { clientName: 'Ana y Luis', eventType: 'Boda', eventDate: '2027-06-12', design: 'Lunaria', packageKey: 'premium', extrasLabel: 'Entrega express', extrasBs: 270, paymentInstructions: 'QR empresarial confirmado' };
  assert.deepEqual(salesQuoteTotals(input), { base: 930, extras: 270, total: 1200, reservation: 200, balance: 1000 });
  const proposal = formatSalesQuote(input, 'https://enkarta.test');
  assert.match(proposal, /Total: 1[.,]200 Bs/);
  assert.match(proposal, /Reserva para iniciar: 200 Bs/);
  assert.match(proposal, /QR empresarial confirmado/);
  assert.match(proposal, /https:\/\/enkarta\.test\/legal\/pagos/);
  assert.match(salesReply('materials', input), /reserva confirmada/i);
  assert.equal(SALES_PIPELINE.length, 5);
});

test('validity calendar arithmetic handles leap years, months and years without timezone shifts', () => {
  assert.equal(addDays('2028-01-31', 30), '2028-03-01');
  assert.equal(addDays('2027-01-31', 30), '2027-03-02');
  assert.equal(addDays('2026-12-20', 30), '2027-01-19');
  assert.equal(addDays('2028-02-29', 90), '2028-05-29');
  for (const day of ['2026-02-29', '2026-13-01', '2026-04-31', '2026-1-1', '2026-08-28T00:00:00Z']) assert.equal(validDay(day), false);
});
test('validity expires after the entire Bolivia date and announces the last seven days', () => {
  const source = { event_date:'2026-07-29', expires_at:'2026-08-28', is_active:true, status:'ready' };
  for (const [today, state] of [['2026-08-20','active'], ['2026-08-21','soon'], ['2026-08-28','today'], ['2026-08-29','expired']]) assert.equal(invitationValidity(source,today).state, state);
  assert.equal(validityLabel(invitationValidity(source,'2026-08-27')),'Vence en 1 día');
  assert.equal(invitationValidity({...source,is_active:false},'2026-08-20').paused,true);
});
test('automatic preview uses package plus preserved extension; legacy has no inferred deadline', () => {
  const inv = {event_date:'2026-08-28',expires_at:null,status:'draft',is_active:true,config:newServiceContract({},'plus')};
  assert.equal(invitationValidity(inv).state,'unlimited');
  assert.equal(invitationValidity({...inv,validity_mode:'automatic',validity_extra_days:10},'2026-08-28',true).expiresAt,'2026-10-07');
  assert.equal(invitationValidity({...inv,validity_mode:'automatic',event_date:null},'2026-08-28',true).state,'pending');
  assert.equal(invitationValidity({...inv,expires_at:'2027-01-01'},'2026-08-28',true).expiresAt,'2027-01-01');
});
test('renewal commands validate integer days, ISO dates, revisions, references and UUIDs', () => {
  const command={id:'10000000-0000-4000-8000-000000000001',requestId:'10000000-0000-4000-8000-000000000002',expectedRevision:0,action:'extend',days:30,reason:'Acuerdo de prueba'};
  assert.equal(parseValidityCommand(command).days,30);
  for (const days of [0,-1,0.5,'30',3651,null]) assert.throws(()=>parseValidityCommand({...command,days}));
  for (const extra of [{reason:' '},{expectedRevision:-1},{requestId:'x'},{action:'delete'},{action:'set_expiry',expiresAt:'2026-02-30'}]) assert.throws(()=>parseValidityCommand({...command,...extra}));
  assert.equal(parseValidityCommand({...command,action:'set_expiry',expiresAt:null}).expiresAt,null);
});

test('last-sync time renders in Bolivia both on server and client',()=>{
  assert.equal(formatSyncTime('2026-08-28T12:34:56Z'),'08:34:56');
});

test('roster filters combine accent-insensitive search, status, table and actual occupancy', () => {
  const guests=[{id:'a',name:'José',status:'confirmed',tableNo:'2',passes:4,confirmedPasses:2,inside:1,sent:true}, {id:'b',name:'Ana',status:'pending',tableNo:null,passes:3,inside:0,sent:false}, {id:'c',name:'Luis',status:'declined',tableNo:'10',passes:1,inside:0,sent:false}];
  const filter={search:'jose',status:'confirmed',table:'2',access:'waiting',sort:'name'};
  assert.deepEqual(filterRoster(guests,filter).map(g=>g.id),['a']);
  assert.deepEqual(filterRoster(guests,{...filter,search:'',status:'all',table:'unassigned',access:'all'}).map(g=>g.id),['b']);
  assert.deepEqual(filterRoster(guests,{search:'',status:'all',table:'all',access:'all',sort:'table'}).map(g=>g.id),['a','c','b']);
  assert.deepEqual(hostMetrics(guests),{total:3,passes:8,sent:1,confirmed:1,pending:1,declined:1,confirmedPasses:2,checkedIn:1,unassigned:0});
});
test('operational CSV is formula-safe, excludes secrets and respects service columns',()=>{
  const guest={name:'=CMD()',group:'@formula',status:'confirmed',passes:2,confirmedPasses:1,inside:1,tableNo:'5',sent:false,accessToken:'secret-token',phone:'secret-phone'};
  const csv=rosterCsv([guest],{tableAssignment:true,qrAccess:true});
  assert.match(csv,/'=CMD\(\)/); assert.match(csv,/'@formula/); assert.doesNotMatch(csv,/secret-/);
  const limited=rosterCsv([guest],{tableAssignment:false,qrAccess:false});
  assert.doesNotMatch(limited,/Mesa|Dentro ahora/);
});
const fakeScheduler = () => { let id=0; const tasks=new Map(); return {tasks,schedule:(fn,delay)=>{const next=++id;tasks.set(next,{fn,delay});return next;},cancel:id=>tasks.delete(id)}; };
test('live sync ignores out-of-order responses and aborts the superseded read',async()=>{
  const clock=fakeScheduler(), deferred=[], values=[];
  const sync=createLiveSync({...clock,read:signal=>new Promise(resolve=>deferred.push({signal,resolve})),receive:v=>values.push(v),status:()=>{}});
  const first=sync.refresh(); const second=sync.refresh();
  assert.equal(deferred[0].signal.aborted,true);
  deferred[1].resolve('new'); await second; deferred[0].resolve('old'); await first;
  assert.deepEqual(values,['new']); assert.equal(clock.tasks.size,1); sync.stop(); assert.equal(clock.tasks.size,0);
});
test('live sync retries with bounded backoff and retains last successful data',async()=>{
  const clock=fakeScheduler(), values=[], states=[]; let fails=false;
  const sync=createLiveSync({...clock,read:async()=>{if(fails)throw new Error('offline');return 'saved';},receive:v=>values.push(v),status:v=>states.push(v)});
  await sync.refresh(); fails=true; await sync.refresh();
  assert.deepEqual(values,['saved']); assert.equal(states.at(-1),'retrying');
  assert.equal([...clock.tasks.values()][0].delay,16000);
  assert.equal(retryDelay(100),60000); sync.stop();
});
test('hidden/offline suspension and cleanup abort requests and avoid stale updates',async()=>{
  const clock=fakeScheduler(), values=[]; let finish; let signal;
  const sync=createLiveSync({...clock,read:s=>{signal=s;return new Promise(resolve=>{finish=resolve;});},receive:v=>values.push(v),status:()=>{}});
  const pending=sync.refresh(); sync.pause('offline'); assert.equal(signal.aborted,true);
  finish('stale'); await pending; assert.deepEqual(values,[]); assert.equal(clock.tasks.size,0);
  await sync.refresh(); assert.deepEqual(values,[]); sync.stop();
});
test('denied live session stops retrying instead of keeping unauthorized controls alive',async()=>{
  const clock=fakeScheduler(), states=[]; let calls=0;
  const sync=createLiveSync({...clock,read:async()=>{calls++;throw new SyncDenied();},receive:()=>assert.fail('No data allowed'),status:v=>states.push(v)});
  await sync.refresh(); await sync.refresh(); sync.resume();
  assert.equal(calls,1); assert.equal(states.at(-1),'denied'); assert.equal(clock.tasks.size,0); sync.stop();
});

test('commercial matrix and server share the unchanged prices and precise RSVP modes', () => {
  assert.deepEqual(Object.values(PACKAGE_CATALOG).map(p => [p.bs,p.usd]), [[1100,157],[930,133],[750,107]]);
  assert.deepEqual(commercialRows()[0].slice(2), ['Sistema inteligente','Formulario y planilla','WhatsApp']);
  for (const pkg of ['exclusive','premium','plus']) {
    const config=newServiceContract({},pkg);
    assert.deepEqual(contractErrors(config),[]);
    assert.deepEqual(resolveFeatures(config), PACKAGE_PRESETS[pkg]);
  }
});
test('content switches cannot grant unpaid services or increase gallery allowance', () => {
  const config={...newServiceContract({},'premium'),features:{qrAccess:true,hostPanel:true,galleryMax:99,rsvpMode:'smart'}};
  const f=resolveFeatures(config); assert.equal(f.qrAccess,false); assert.equal(f.hostPanel,false); assert.equal(f.galleryMax,8); assert.equal(f.rsvpMode,'form');
  assert.equal(resolveFeatures({...config,features:{galleryMax:3}}).galleryMax,3);
  assert.equal(allowsService({package:'plus'},'qrAccess'),true); // Earlier agreements stay intact.
  assert.equal(allowsService(newServiceContract({},'plus'),'qrAccess'),false);
});
test('extras require valid values, reason, date and consistent dependencies', () => {
  const config=newServiceContract({},'premium');
  const extra={id:'test',feature:'galleryMax',value:12,reason:'Contrato de prueba',source:'contracted',recordedAt:new Date().toISOString()};
  config.serviceContract.extras=[extra]; assert.deepEqual(contractErrors(config),[]); assert.equal(resolveFeatures(config).galleryMax,12);
  for (const patch of [{value:100},{reason:''},{value:1.5},{recordedAt:'bad'},{feature:'rsvpMode',value:['smart']}]) {
    assert.ok(contractErrors({...config,serviceContract:{...config.serviceContract,extras:[{...extra,...patch}]}}).length);
  }
  assert.ok(contractErrors({...config,serviceContract:{...config.serviceContract,extras:{bad:true}}}).length);
  config.serviceContract.extras=[{...extra,feature:'qrAccess',value:true}]; assert.ok(contractErrors(config).length);
  assert.deepEqual(contractErrors(adoptServiceContract({package:'plus'},'premium')),[]);
});
test('gating traverses nested groups, respects disabled and responsive blocks without changing source', () => {
  const images=Array.from({length:12},(_,i)=>'photo-'+i);
  const gallery=(id,layout)=>({id,type:'gallery',enabled:true,props:{images,shareUrl:'https://example.test/photos'},layout});
  const inv=marfilVivoDemo(); inv.config={...newServiceContract(inv.config,'premium'),layout:{version:2,blocks:[
    {id:'disabled',type:'group',enabled:false,props:{},children:[gallery('hidden')]},
    gallery('mobile',{hideOn:'desktop'}), gallery('desktop',{hideOn:'mobile'}),
    {id:'group',type:'group',props:{},children:[{id:'qr',type:'accessPass',props:{}},{id:'table',type:'tableFinder',props:{}},{id:'calendar',type:'calendar',props:{}},{id:'rsvp',type:'rsvp',props:{mode:'whatsapp'}}]},
  ]}};
  const source=JSON.stringify(inv);
  const result=gateInvitation(inv);
  assert.equal(result.config.layout.blocks[1].props.images.length,8); assert.equal(result.config.layout.blocks[2].props.images.length,8);
  assert.equal(result.config.layout.blocks[1].props.shareUrl,'');
  assert.deepEqual(result.config.layout.blocks[3].children.map(b=>b.type),['rsvp']);
  assert.equal(result.config.layout.blocks[3].children[0].props.mode,'form');
  assert.equal(JSON.stringify(inv),source);
});
test('dynamic bindings cannot reintroduce excluded galleries or forms', () => {
  const inv=marfilVivoDemo(); inv.config=newServiceContract({...inv.config,galleryImages:Array(20).fill('test-photo')},'premium');
  const layout={version:2,blocks:[{id:'gallery',type:'gallery',props:{images:[]},bindings:{images:'media.galleryImages'}}]};
  assert.equal(resolveLayoutBindings(layout,inv).blocks[0].props.images.length,8);
  inv.config=newServiceContract(inv.config,'plus');
  assert.equal(resolveLayoutBindings(layout,inv).blocks.length,0);
});
test('Plus palette needs an explicit extra; JSON key order and content edits do not count as color changes', () => {
  const current={color_primary:'#123456',config:{...newServiceContract({},'plus'),theme:{primary:'#123456',bg:'#ffffff'},layout:{version:2,blocks:[{id:'b',type:'text',props:{text:'Hola',color:'#123456'}}]}}};
  const next=structuredClone(current); next.config.theme={bg:'#ffffff',primary:'#123456'}; next.config.layout.blocks[0].props.text='Otra frase';
  assert.equal(changesUncontractedColors(current,next),false);
  next.config.layout.blocks[0].props.color='#ff0000'; assert.equal(changesUncontractedColors(current,next),true);
  next.config.serviceContract.extras=[{id:'extra',feature:'colorCustomization',value:true,reason:'Adicional contratado',recordedAt:new Date().toISOString(),source:'contracted'}];
  assert.equal(changesUncontractedColors(current,next),false);
});
test('read-only planilla combines sources without exposing QR and neutralizes CSV formulas', () => {
  const rows=responseRows([{id:'test',name:'=SUM(A1)',publicId:'PRIVATE',accessToken:'SECRET',passes:5,status:'confirmed',confirmedPasses:2}], [{id:'open',name:'Otro',attending:'no',message:'@formula',at:'2026-08-28'}]);
  assert.equal(rows.length,2); assert.equal(rows[0].confirmed,2); assert.equal(rows[1].confirmed,0);
  assert.doesNotMatch(JSON.stringify(rows),/SECRET|PRIVATE/);
  const csv=responseCsv(rows); assert.match(csv,/"'=SUM\(A1\)"/); assert.match(csv,/"'@formula"/);
});

test('Marfil typography uses two families and one treatment per semantic role', () => {
  const roles = ['display', 'title', 'subtitle', 'body', 'note', 'label', 'action', 'field', 'number', 'time'];
  const styles = roles.map(role => resolveInvitationTypography(MARFIL_TOKENS, role));
  assert.equal(new Set(styles.map(style => style.fontFamily)).size, 2);
  assert.match(styles[1].fontFamily, /--ek-font-heading/);
  assert.match(styles[3].fontFamily, /--ek-font-body/);
  assert.match(styles[1].fontSize, /32px/);
  assert.match(styles[3].fontSize, /18px/);
  assert.match(styles[4].fontSize, /15px/);
  assert.match(styles[5].fontSize, /12px/);
  assert.match(styles[6].fontSize, /15px/);
  assert.match(styles[7].fontSize, /16px/);
  assert.equal(styles[6].textTransform, 'none');
  assert.equal(styles[9].fontVariantNumeric, 'tabular-nums');
  assert.match(resolveInvitationTypography(MARFIL_TOKENS, 'body', 1.1).fontSize, /19.8px/);
  assert.equal(resolveInvitationTypography(MARFIL_TOKENS, 'body', NaN).fontSize, styles[3].fontSize);
});

test('visual profile is opt-in and old invitations do not acquire it while parsing', () => {
  for (const tokens of [undefined, {}, { visualProfile: 'unknown' }]) {
    assert.equal(hasMarfilVisualSystem(tokens), false);
    assert.deepEqual(resolveInvitationTypography(tokens, 'title'), {});
  }
  for (const key of STARTER_TEMPLATE_KEYS.filter(key => key !== 'marfil-vivo')) {
    assert.equal(hasMarfilVisualSystem(invitationStarter(key).builder_config.tokens), false);
  }
  const demo = marfilVivoDemo();
  delete demo.config.tokens.visualProfile;
  demo.config.tokens.cardRadius = 27;
  demo.config.fontHeading = 'Marcellus';
  demo.builder_config = JSON.stringify(demo.config);
  const parsed = parseInvitation({ ...demo, itinerary: JSON.stringify(demo.itinerary), parents_groom: '[]', parents_bride: '[]', sponsors: '[]' });
  assert.equal(parsed.config.tokens.visualProfile, undefined);
  assert.equal(parsed.config.tokens.cardRadius, 27);
  assert.equal(parsed.config.fontHeading, 'Marcellus');
});

test('Marfil spacing and widths come from its documented scale', () => {
  const starter = marfilVivoStarter();
  const allowed = new Set([0, ...Object.values(MARFIL_SPACE)]);
  for (const block of starter.builder_config.layout.blocks) {
    assert.ok(allowed.has(block.style.padTop), block.id);
    assert.ok(allowed.has(block.style.padBottom), block.id);
    if (block.style.maxWidth) assert.ok(Object.values(MARFIL_WIDTH).includes(block.style.maxWidth), block.id);
  }
  assert.equal(starter.builder_config.tokens.visualProfile, 'marfil-v1');
  assert.match(resolveFonts(starter.builder_config).vars['--ek-font-body'], /Outfit/);
  assert.match(resolveFonts(starter.builder_config).vars['--ek-font-heading'], /Playfair Display/);
  starter.builder_config.tokens.typeScale.body = 1.2;
  assert.equal(marfilVivoStarter().builder_config.tokens.typeScale.body, 1);
});

test('Marfil controls share geometry and preserve explicit shape overrides', () => {
  const theme = resolveBlockTheme(MARFIL_THEME);
  const visual = resolveInvitationVisualSystem(theme, MARFIL_TOKENS);
  assert.equal(visual.primaryButton.minHeight, 48);
  assert.equal(visual.field.minHeight, 48);
  assert.equal(visual.primaryButton.borderRadius, visual.secondaryButton.borderRadius);
  assert.equal(visual.field.borderRadius, 6);
  assert.equal(visual.cardRadius, 8);
  assert.equal(visual.mediaRadius, 4);
  assert.match(visual.field.border, /55%/);
  const custom = resolveInvitationVisualSystem(theme, { ...MARFIL_TOKENS, fieldRadius: 10, buttonRadius: 18 });
  assert.equal(custom.field.borderRadius, 10);
  assert.equal(custom.primaryButton.borderRadius, 18);
  assert.equal(resolveInvitationVisualSystem(theme, { ...MARFIL_TOKENS, cardBorder: 'none' }).field.border, '1px solid transparent');
  const legacy = resolveInvitationVisualSystem(theme, {});
  assert.equal(legacy.field.minHeight, undefined);
  assert.equal(legacy.primaryButton.fontFamily, undefined);
});

test('Marfil Vivo is a complete native layout using an existing SQL template', () => {
  const starter = marfilVivoStarter(new Date('2026-08-27T12:00:00Z'));
  assert.equal(starter.template, 'grazia');
  assert.equal(starter.builder_config.layout.presetKey, 'marfil-vivo');
  const blocks = starter.builder_config.layout.blocks;
  assert.equal(new Set(blocks.map(block => block.id)).size, blocks.length);
  for (const type of ['cinematicHero', 'editorialChapter', 'editorialDetails', 'itinerary', 'gallery', 'rsvp']) assert.ok(blocks.some(block => block.type === type));
  assert.ok(starter.event_date > '2026-08-27');
  assert.equal(publicTemplateName('grazia', 'marfil-vivo'), 'Marfil Vivo');
});

test('all old starters still work and the new design is selectable', () => {
  assert.ok(STARTER_TEMPLATE_KEYS.includes('marfil-vivo'));
  for (const key of STARTER_TEMPLATE_KEYS) {
    const starter = invitationStarter(key);
    assert.equal(starter.status, 'draft');
    assert.ok(starter.names);
    assert.ok(starter.builder_config);
    if (['laura-y-andres','annie-y-micky','roly-y-yeliana','nicole-y-francisco','manuel-y-maya','mariana-y-jesus','paula-y-juan-felipe','karla-y-mauricio','maria-angelica-y-mario','siena-editorial','jardin-salvia','carta-malva','costa-celeste','noche-champagne','jardin-de-seda','casa-limone','promesa','aurelia','velada'].includes(key)) assert.equal(starter.template, 'dolcevita');
    else if (key !== 'marfil-vivo') assert.equal(starter.template, key);
  }
});

test('bound names, media, date and enriched itinerary follow global edits', () => {
  const demo = marfilVivoDemo();
  demo.names = 'Lucía & Diego';
  demo.cover_image_url = '/catalog/azure.jpg';
  demo.event_date = '2027-02-20';
  demo.itinerary = [{ label: 'Cena', time: '20:00', place: 'Terraza', duration: '1 h', note: 'Llegar temprano' }];
  const layout = resolveLayoutBindings(demo.config.layout, demo);
  const hero = layout.blocks.find(block => block.type === 'cinematicHero');
  assert.equal(hero.props.groom, 'Lucía');
  assert.equal(hero.props.bride, 'Diego');
  assert.equal(hero.props.poster, '/catalog/azure.jpg');
  assert.match(hero.props.dateLabel, /2027/);
  assert.deepEqual(layout.blocks.find(block => block.type === 'itinerary').props.items, demo.itinerary);
  assert.ok(!JSON.stringify(layout.blocks.map(block => block.props)).includes('{{'));
});

test('stored starter round-trips through the existing invitation parser', () => {
  const demo = marfilVivoDemo();
  const parsed = parseInvitation({ ...demo, itinerary: JSON.stringify(demo.itinerary), parents_groom: '[]', parents_bride: '[]', sponsors: '[]' });
  assert.equal(parsed.config.layout.presetKey, 'marfil-vivo');
  assert.equal(parsed.itinerary[0].place, 'Capilla del jardín');
});

test('the inspector shows bound items and detaches only the edited field', () => {
  const demo = marfilVivoDemo();
  const itinerary = demo.config.layout.blocks.find(block => block.type === 'itinerary');
  const props = resolveBlockEditorProps(itinerary, demo);
  assert.equal(props.items.length, 5);
  const edited = { ...detachBinding(itinerary, 'items'), props: { ...itinerary.props, items: props.items.map((item, i) => i === 0 ? { ...item, label: 'Ceremonia editada' } : item) } };
  assert.equal(edited.bindings?.items, undefined);
  assert.equal(resolveBlockEditorProps(edited, demo).items[0].label, 'Ceremonia editada');
  assert.equal(demo.itinerary[0].label, 'El sí, quiero');
  const letter = demo.config.layout.blocks.find(block => block.id === 'marfil-closing');
  assert.match(resolveBlockEditorProps(letter, demo).note, /\{\{couple.full\}\}/);
});

test('SQL TIME values with seconds produce a valid countdown date', () => {
  const demo = marfilVivoDemo();
  demo.ceremony_time = '16:00:00';
  const countdown = resolveLayoutBindings(demo.config.layout, demo).blocks.find(block => block.type === 'countdown');
  assert.equal(countdown.props.isoDate, `${demo.event_date}T16:00:00-04:00`);
  assert.equal(new Date(countdown.props.isoDate).toISOString(), `${demo.event_date}T20:00:00.000Z`);
  assert.ok(Number.isFinite(new Date(countdown.props.isoDate).getTime()));
});

test('captions remain attached to their photo after reorder, deletion and additions', () => {
  const old = ['/a.jpg', '/b.jpg'];
  const captions = [{ title: 'A', alt: 'Descripción A' }, { title: 'B', alt: 'Descripción B' }];
  const next = reorderGalleryCaptions(old, captions, ['/b.jpg', '/c.jpg', '/a.jpg']);
  assert.deepEqual(next.map(item => item.title), ['B', undefined, 'A']);
  assert.equal(captionsForImages(['/a.jpg'], next)[0].alt, 'Descripción A');
});

test('phase 6 carries enriched itinerary and global photo stories across old and block designs', () => {
  const demo = invitationDemo('azure', { blocks: true });
  demo.itinerary = [{ time: '19:30', label: 'Cena', place: 'Terraza', duration: '90 min', note: 'Menú especial', icon: 'dinner' }];
  demo.config.galleryImages = ['/uno.jpg', '/dos.jpg'];
  demo.config.galleryCaptions = [
    { image: '/uno.jpg', title: 'El comienzo', caption: 'Nuestra primera aventura', alt: 'Pareja caminando frente al mar' },
    { image: '/dos.jpg', title: 'El gran sí', caption: 'Un día inolvidable', alt: 'Pareja mostrando el anillo' },
  ];
  const legacy = mapToAzure(demo);
  assert.equal(legacy.itinerary[0].place, 'Terraza');
  assert.equal(legacy.itinerary[0].duration, '90 min');
  assert.equal(legacy.itinerary[0].note, 'Menú especial');
  assert.equal(legacy.galleryCaptions[1].title, 'El gran sí');
  const layout = resolveLayoutBindings(demo.config.layout, demo);
  const gallery = layout.blocks.find(block => block.type === 'gallery');
  assert.deepEqual(gallery.props.images, demo.config.galleryImages);
  assert.equal(gallery.props.captions[0].alt, 'Pareja caminando frente al mar');
});

test('package gallery limits trim photo stories together with hidden images', () => {
  const demo = invitationDemo('azure');
  const images = Array.from({ length: 10 }, (_, index) => `/foto-${index}.jpg`);
  demo.config = newServiceContract({ ...demo.config, galleryImages: images, galleryCaptions: images.map((image, index) => ({ image, title: `Foto ${index}` })) }, 'premium');
  const gated = gateInvitation(demo);
  assert.equal(gated.config.galleryImages.length, 8);
  assert.equal(gated.config.galleryCaptions.length, 8);
  assert.equal(gated.config.galleryCaptions[7].image, '/foto-7.jpg');
});

test('resource audit includes nested gallery arrays and local assets, but not disabled children', () => {
  const data = marfilVivoDemo();
  data.cover_image_url = null;
  data.config.galleryImages = [];
  data.config.layout.blocks = [{ id: 'group', type: 'group', props: {}, children: [
    { id: 'g', type: 'gallery', props: { images: ['/catalog/solar-original.png', 'https://example.com/a.jpg'] } },
    { id: 'hidden', enabled: false, type: 'image', props: { url: 'https://example.com/hidden.jpg' } },
  ] }];
  const resources = collectPublicationResources(data);
  assert.equal(resources.length, 2);
  assert.ok(resources.every(resource => resource.kind === 'image'));
  assert.equal(publicationMetrics(data).blocks, 2);
});

test('GIF in a video field is classified as an animated image', () => {
  const data = marfilVivoDemo();
  // Isolate the fixture: WebP photos in a sample are also conservatively audited as possible animations.
  data.config.galleryImages = [];
  data.config.layout.blocks = [{ id: 'gif', type: 'video', props: { url: 'https://example.com/motion.gif?v=2' } }];
  assert.equal(collectPublicationResources(data).find(resource => resource.blockId === 'gif').kind, 'image');
  assert.equal(publicationMetrics(data).animatedImages, 1);
  assert.equal(resourceBudgetBytes('video', '/clip.mp4'), 8_000_000);
});

test('local public audit checks file size and rejects traversal or non-media files', async () => {
  const result = await probeLocalPublicAsset('/catalog/solar-original.png');
  assert.equal(result.ok, true);
  assert.ok(result.bytes > 0);
  for (const bad of ['/../secrets.png', '/%2e%2e/secrets.png', '//example.com/a.jpg', '/catalog/%5c..%5csecrets.png', '/.env.local']) {
    await assert.rejects(probeLocalPublicAsset(bad));
  }
});

test('Marfil Vivo has no validation errors or false empty-cover/itinerary warnings', () => {
  const validation = validateInvitationBuilder(marfilVivoDemo());
  assert.deepEqual(validation.errors, []);
  assert.ok(!validation.warnings.some(issue => /No hay portada|Itinerario vacío|Galería vacía|Actividad incompleta/.test(issue.title)));
});

test('all catalogue entries keep native identity and expose blocks only as an opt-in', () => {
  const catalog = collectionCatalog();
  assert.equal(catalog.length, STARTER_TEMPLATE_KEYS.length);
  for (const card of catalog) {
    const starter = invitationStarter(card.key);
    const demo = invitationDemo(card.key);
    const blockDemo = invitationDemo(card.key, { blocks: true });
    assert.equal(card.names, starter.names);
    assert.equal(card.date, starter.event_date);
    assert.equal(card.image, starter.cover_image_url);
    if (card.key === 'marfil-vivo') assert.equal(demo.config.layout.presetKey, card.key);
    else assert.equal(demo.config.layout, undefined, `${card.key} debe conservar su plantilla original`);
    if (['laura-y-andres','annie-y-micky','roly-y-yeliana','nicole-y-francisco','manuel-y-maya','mariana-y-jesus','paula-y-juan-felipe','karla-y-mauricio','maria-angelica-y-mario','siena-editorial','jardin-salvia','carta-malva','costa-celeste','noche-champagne','jardin-de-seda','casa-limone','promesa','aurelia','velada'].includes(card.key)) {
      assert.equal(blockDemo.config.designKey, card.key);
      assert.equal(blockDemo.config.layout, undefined);
      if(['mariana-y-jesus','karla-y-mauricio'].includes(card.key)) assert.deepEqual(validateInvitationBuilder(demo).errors.map(e=>e.title), ['Contraste de texto insuficiente']);
      else assert.deepEqual(validateInvitationBuilder(demo).errors, []);
      continue;
    }
    assert.equal(blockDemo.config.layout.presetKey, card.key);
    assert.equal(blockDemo.config.designMode, 'guided');
    assert.equal(blockDemo.config.tokens.visualProfile, card.key === 'marfil-vivo' ? 'marfil-v1' : 'collection-v1');
    assert.deepEqual(validateInvitationBuilder(demo).errors, [], card.key);
    assert.ok(card.demoPath.startsWith('/muestra/'));
  }
});

test('public samples render artistic templates by default and blocks only on explicit request', () => {
  const source = fs.readFileSync(path.join(root, 'src/app/muestra/[template]/page.tsx'), 'utf8');
  assert.match(source, /if \(key === 'marfil-vivo'\)/);
  assert.match(source, /const el = blocks === '1'/);
  assert.doesNotMatch(source, /STARTER_TEMPLATE_KEYS\.includes/);
});

test('collection defaults retain their colour identities and explicitly selected default fonts', () => {
  assert.notEqual(collectionDesign('azure').theme.primary, collectionDesign('carmesi_v2').theme.primary);
  assert.equal(collectionDesign('obsidiana').theme.bg, '#100f0c');
  assert.match(resolveFonts(collectionDesign('obsidiana')).vars['--ek-font-heading'], /Cinzel/);
  assert.match(resolveFonts(collectionDesign('azure')).vars['--ek-font-heading'], /Cormorant Garamond/);
  assert.equal(resolveFonts({ fontHeading: 'Cinzel' }).vars['--ek-font-heading'], undefined);
  assert.equal(collectionDesign('azure').decor.floating.on, false);
});

test('restoring coordinated style preserves content, bindings, geometry, uploads and child identity', () => {
  const block = { id: 'keep', type: 'text', props: { text: 'Mi mensaje', family: 'great', size: 72, textColor: '#ff0000' }, bindings: { text: 'content.intro' }, layout: { x: 24, w: 300 }, visibility: { audience: 'personalized' }, style: { padTop: 32, radius: 24, shadow: 'strong' }, children: [{ id: 'child', type: 'image', props: { url: '/uploaded.jpg' } }] };
  const restored = restoreBlockCollectionStyle(block);
  assert.equal(restored.id, block.id);
  assert.equal(restored.props.text, 'Mi mensaje');
  assert.equal(restored.props.family, undefined);
  assert.equal(restored.props.size, undefined);
  assert.deepEqual(restored.bindings, block.bindings);
  assert.deepEqual(restored.layout, block.layout);
  assert.deepEqual(restored.children, block.children);
  assert.deepEqual(restored.visibility, block.visibility);
  assert.equal(restored.style.padTop, 32);
  assert.equal(block.props.family, 'great');
  for (const type of ['monogram', 'ornament']) assert.equal(restoreBlockCollectionStyle({ id: type, type, props: { size: 180 } }).props.size, 180);
});

test('conversion keeps complete names, SQL seconds, itinerary details and global bindings', () => {
  const data = invitationDemo('azure');
  data.names = 'Yolanda y Yago';
  data.ceremony_time = '16:30:00';
  data.itinerary = [{ time: '20:00', label: 'Cena', place: 'Terraza', note: 'Sin prisa', duration: '1 h', icon: '/my-icon.svg', iconColors: { __tint: '#a23559' } }];
  const layout = invitationToLayout(data);
  const cover = layout.blocks.find(b => b.type === 'cover');
  assert.equal(cover.props.groom, 'Yolanda');
  assert.equal(cover.props.bride, 'Yago');
  assert.ok(Number.isFinite(new Date(layout.blocks.find(b => b.type === 'countdown').props.isoDate).getTime()));
  const itinerary = layout.blocks.find(b => b.type === 'itinerary');
  assert.equal(itinerary.props.items[0].place, 'Terraza');
  data.itinerary[0].label = 'Cena actualizada';
  assert.equal(resolveLayoutBindings(layout, data).blocks.find(b => b.type === 'itinerary').props.items[0].label, 'Cena actualizada');
});

test('public empty-section detection only hides genuinely empty optional content', () => {
  const gallery = { id: 'g', type: 'gallery', props: { title: 'Fotos', images: [] } };
  const itinerary = { id: 'i', type: 'itinerary', props: { items: [] } };
  assert.equal(isEmptyOptionalBlock(gallery), true);
  assert.equal(isEmptyOptionalBlock(itinerary), true);
  assert.equal(isEmptyOptionalBlock({ ...gallery, props: { images: ['/photo.jpg'] } }), false);
  assert.equal(isEmptyOptionalBlock({ ...gallery, props: { images: [], shareUrl: 'https://example.com/album' } }), false);
  assert.equal(isEmptyOptionalBlock({ id: 'text', type: 'text', props: { text: '' } }), false);
  assert.equal(isEmptyOptionalBlock({ id: 'group', type: 'group', props: {}, children: [gallery, itinerary] }), true);
});

test('all collection documents round-trip without losing manual style and icon overrides', () => {
  for (const key of STARTER_TEMPLATE_KEYS) {
    const demo = invitationDemo(key, { blocks: true });
    demo.config.designMode = 'free';
    demo.config.fontHeading = 'Marcellus';
    demo.config.iconColor = '#a23559';
    demo.config.iconScale = 1.2;
    if (demo.config.layout) demo.config.layout.blocks[0].props.focal = '32% 64%';
    const original = JSON.parse(JSON.stringify(demo.config));
    const parsed = parseInvitation({ ...demo, builder_config: JSON.stringify(original), itinerary: JSON.stringify(demo.itinerary), parents_groom: '[]', parents_bride: '[]', sponsors: '[]' });
    assert.deepEqual(JSON.parse(JSON.stringify(parsed.config)), original, key);
  }
});

test('Marfil editorial photos are independent, local and below 200 KB each', async () => {
  const demo = invitationDemo('marfil-vivo');
  const story = demo.config.layout.blocks.find(b => b.type === 'editorialChapter' && b.props.image);
  assert.notEqual(story.props.image, demo.cover_image_url);
  assert.equal(story.bindings?.image, undefined);
  for (const image of demo.config.galleryImages) {
    assert.ok(image.startsWith('/catalog/marfil/'));
    const asset = await probeLocalPublicAsset(image);
    assert.equal(asset.ok, true);
    assert.ok(asset.bytes > 0 && asset.bytes < 200000, image);
  }
});

test('manual text styling overrides coordinated defaults and custom icons remain custom', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { BLOCKS } = require('../src/components/invitations/blocks/registry.tsx');
  const { BlockDesignProvider, BlockIconProvider } = require('../src/components/invitations/blocks/theme.tsx');
  const { EventIcon } = require('../src/components/invitations/shared.tsx');
  const wrap = child => React.createElement(BlockDesignProvider, { value: MARFIL_TOKENS }, child);
  const text = renderToStaticMarkup(wrap(React.createElement(BLOCKS.text.Component, { block: { id: 'manual', type: 'text', props: { text: 'Mi texto', family: 'outfit', size: 23, textColor: '#123456' } } })));
  assert.match(text, /font-family:Outfit, sans-serif/);
  assert.match(text, /font-size:calc\(23px/);
  assert.match(text, /color:#123456/);
  const icon = (name, extra) => renderToStaticMarkup(wrap(React.createElement(BlockIconProvider, { value: { color: '#a23559' } }, React.createElement(EventIcon, { name, ...extra }))));
  assert.match(icon('church'), /stroke="#a23559"/);
  assert.match(icon('church'), /stroke-width="1.25"/);
  assert.match(icon('church', { lottieColors: { __tint: '#123456' } }), /stroke="#123456"/);
  assert.match(icon('/uploaded.svg'), /<img[^>]+src="\/uploaded.svg"/);
});

test('public access block hides retained QR after a decline or pending response', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { BLOCKS } = require('../src/components/invitations/blocks/registry.tsx');
  const { BlockDataProvider } = require('../src/components/invitations/blocks/editable.tsx');
  const guest = { id: 'test', publicId: 'test-public', name: 'Familia', confirmName: 'Nombre confirmado', status: 'confirmed', passes: 5, confirmedPasses: 2, accessToken: 'test-token', accessCode: 'ENK-TEST' };
  const render = overrides => renderToStaticMarkup(React.createElement(BlockDataProvider, { value: { guest: { ...guest, ...overrides } } }, React.createElement(BLOCKS.accessPass.Component, { block: { id: 'access', type: 'accessPass', props: {} } })));
  assert.match(render({}), /ENK-TEST/);
  assert.match(render({}), /Nombre confirmado/);
  assert.match(render({ status: 'declined', confirmedPasses: 0 }), /pase de acceso está inactivo/);
  for (const overrides of [{ status: 'declined' }, { status: 'pending' }, { confirmedPasses: 0 }]) assert.doesNotMatch(render(overrides), /ENK-TEST/);
});

test('phase 7 additional services cannot be delivered with an incomplete checklist', () => {
  const data = invitationDemo('marfil-vivo');
  const candidates = navigationCandidates(data.config.layout).slice(0, 3);
  data.config.additionalServices = { version: 1,
    domain: { status: 'ready', hostname: 'boda.ejemplo.com', ownershipVerified: true, dnsVerified: true, httpsVerified: false, expiresAt: '2027-01-01' },
    navigation: { status: 'ready', enabled: true, items: candidates, mobileVerified: true },
  };
  assert.equal(additionalServiceChecks('domain', data).find(item => item.label === 'HTTPS activo').done, false);
  assert.match(additionalServiceErrors(data)[0], /Dominio propio/);
  data.config.additionalServices.domain.httpsVerified = true;
  assert.deepEqual(additionalServiceErrors(data), []);
  assert.ok(candidates.length >= 2);
});

test('public invitation exposes delivered controls but strips internal briefs, owners and notes', () => {
  const data = invitationDemo('marfil-vivo');
  const items = navigationCandidates(data.config.layout).slice(0, 2);
  data.config.additionalServices = { version: 1,
    language: { status: 'ready', owner: 'Internal owner', notes: 'Private note', sourceLocale: 'es-BO', targetLocale: 'en-US', contentTranslated: true, formsTranslated: true, datesLocalized: true, systemMessagesTranslated: true },
    navigation: { status: 'ready', owner: 'Designer', enabled: true, items, mobileVerified: true },
    personalization: { status: 'ready', brief: 'This must never be public', references: ['https://private.invalid'], proposalReady: true, clientApproved: true },
  };
  const publicConfig = clientInvitation(data).config.additionalServices;
  assert.equal(publicConfig.language.targetLocale, 'en-US');
  assert.equal(publicConfig.language.owner, undefined);
  assert.equal(publicConfig.personalization, undefined);
  assert.equal(publicConfig.navigation.items.length, 2);
  assert.deepEqual(publicAdditionalServices(data.config.additionalServices), publicConfig);
});

test('phase 7 localizes system controls and SQL dates without timezone shifts', () => {
  const config = { additionalServices: { version: 1, language: { status: 'ready', targetLocale: 'en-US' } } };
  assert.equal(activeInvitationLocale(config), 'en-US');
  assert.equal(invitationCopy('en-US').yourName, 'Your name');
  assert.match(formatInvitationDate('2028-02-29', 'en-US'), /February/);
  assert.match(formatInvitationDate('2028-02-29', 'es-BO'), /febrero/i);
});

test('Save the Date validates private response keys, revisions and idempotency input', () => {
  const body = { slug: 'ana-y-luis', responseKey: '10000000-0000-4000-8000-000000000001', name: 'Familia Paz', interest: 'interested', guests: 3, message: '', requestId: '10000000-0000-4000-8000-000000000002', expectedRevision: 0 };
  const parsed = parseSaveDateInput(body);
  assert.equal(parsed.guests, 3);
  assert.match(parsed.responseKeyHash, /^[0-9a-f]{64}$/);
  assert.throws(() => parseSaveDateInput({ ...body, responseKey: 'public-key' }));
  assert.throws(() => parseSaveDateInput({ ...body, guests: 21 }));
  assert.equal(parseSaveDateInput({ ...body, interest: 'unavailable', guests: 7 }).guests, 0);
});

test('phase 8 acceptance has package-specific journeys and cannot approve partial evidence', () => {
  assert.ok(qualityChecksFor('exclusive').some(check => check.id === 'exclusive_qr'));
  assert.ok(qualityChecksFor('premium').some(check => check.id === 'premium_sheet'));
  assert.ok(qualityChecksFor('plus').some(check => check.id === 'plus_limits'));
  assert.ok(!qualityChecksFor('plus').some(check => check.id === 'exclusive_qr'));
  let control = { version: 1 };
  for (const check of qualityChecksFor('plus')) control = updateQualityCheck(control, 'plus', check.id, { result: 'passed', checkedAt: '2026-08-29T10:00:00.000Z', evidence: 'Fixture' });
  assert.equal(qualityProgress(control, 'plus').percent, 100);
  assert.equal(releaseReady(control, 'plus'), false);
  control.support = { channel: 'WhatsApp', availability: 'Lun–Vie', firstResponseHours: 4, escalationOwner: 'Operaciones', instructionsDelivered: true };
  control.privacy = { retentionConfirmed: true, backupAt: '2026-08-29T10:00:00.000Z', restoreTestedAt: '2026-08-29T11:00:00.000Z', deletionOwner: 'Operaciones', incidentOwner: 'Soporte' };
  control.release = { previewUrl: 'https://preview.example', rollbackVersionId: 'v-prev' };
  assert.equal(releaseReady(control, 'plus'), true);
  const bypass = structuredClone(control);
  bypass.runs.plus.checks[qualityChecksFor('plus')[0].id] = { result: 'not_applicable', evidence: 'Attempted bypass' };
  assert.equal(qualityProgress(bypass, 'plus').percent < 100, true);
  assert.equal(releaseReady(bypass, 'plus'), false);
});

test('phase 8 report is reproducible and quality evidence never reaches guests', () => {
  const data = invitationDemo('azure');
  data.config = newServiceContract(data.config, 'premium');
  data.config.qualityControl = { version: 1, support: { channel: 'Private' }, release: { notes: 'Internal incident plan' } };
  const report = qualityReport(data, '2026-08-29T12:00:00.000Z');
  assert.equal(report.generatedAt, '2026-08-29T12:00:00.000Z');
  assert.equal(report.invitation.package, 'premium');
  assert.equal(clientInvitation(data).config.qualityControl, undefined);
});


test('Laura editable data and animation choices survive save, reopen and duplication', () => {
  const { laText, laMaps } = require('../src/lib/laura-andres.ts');
  const demo = invitationDemo('laura-y-andres');
  demo.names = 'Lucía y Diego';
  demo.event_date = '2027-06-12';
  demo.config.lauraAndres.texts.story = '';
  demo.config.lauraAndres.sections.gallery = false;
  demo.config.lauraAndres.coverImages = ['/foto-personal.webp'];
  demo.config.sectionIcons.noKids = '/lottie/boda/laura-sin-ninos.json';
  const reopened = parseInvitation({...demo, builder_config:JSON.stringify(demo.config), itinerary:JSON.stringify(demo.itinerary), parents_groom:'[]', parents_bride:'[]', sponsors:'[]'});
  assert.equal(reopened.config.designKey,'laura-y-andres');
  assert.equal(reopened.names,'Lucía y Diego');
  assert.equal(laText(reopened,'story'),'');
  assert.equal(reopened.config.lauraAndres.sections.gallery,false);
  assert.deepEqual(reopened.config.lauraAndres.coverImages,['/foto-personal.webp']);
  assert.equal(laMaps('Casa Aragón'),'https://www.google.com/maps/search/?api=1&query=Casa%20Arag%C3%B3n');
  assert.ok(collectPublicationResources(reopened).some(r=>r.url==='/foto-personal.webp'));
  assert.notEqual(laText(invitationDemo('laura-y-andres'),'story'),'');
  for (const name of ['sin-ninos','corazones','lluvia-de-sobres']) {
    const animation=JSON.parse(fs.readFileSync(path.join(root,'public/lottie/boda/laura-'+name+'.json'),'utf8'));
    assert.ok(animation.layers.length && animation.op > animation.ip && animation.fr > 0);
    assert.ok(!animation.assets.length, 'Animations must be self-contained');
  }
});

test('Laura carousels obey the package photo allowance without modifying the saved design', () => {
  const { laMedia } = require('../src/lib/laura-andres.ts');
  const data=invitationDemo('laura-y-andres');
  const original=JSON.stringify(data.config.lauraAndres);
  data.config=newServiceContract(data.config,'plus');
  assert.equal(Object.values(laMedia(data)).flat().length,0);
  data.config=newServiceContract(data.config,'premium');
  assert.ok(new Set(Object.values(laMedia(data)).flat()).size<=8);
  assert.equal(JSON.stringify(data.config.lauraAndres),original);
});

test('Annie edits survive persistence and use independent local media within package limits',()=>{
 const {amText,amMedia}=require('../src/lib/annie-micky.ts');
 const data=invitationDemo('annie-y-micky');
 assert.equal(data.config.lauraAndres,undefined);
 assert.ok(!JSON.stringify(data).includes('invitali.com'));
 for(const url of [data.cover_image_url,...data.config.galleryImages]) assert.ok(fs.existsSync(path.join(root,'public',url)));
 data.config.annieMicky.texts.honor='Nuestra fiesta';
 data.config.annieMicky.texts.story='';
 data.config.annieMicky.sections.family=false;
 data.config.annieMicky.coverImages=['/mi-foto.webp'];
 data.config.annieMicky.wideImages=['/panoramica.webp'];
 const reopened=parseInvitation({...data,builder_config:JSON.stringify(data.config)});
 assert.equal(amText(reopened,'honor'),'Nuestra fiesta');
 assert.equal(amText(reopened,'story'),'');
 assert.equal(reopened.config.annieMicky.sections.family,false);
 assert.ok(collectPublicationResources(reopened).some(r=>r.url==='/mi-foto.webp'));
 assert.deepEqual(reopened.config.annieMicky.wideImages,['/panoramica.webp']);
 assert.ok(collectPublicationResources(reopened).some(r=>r.url==='/panoramica.webp'));
 assert.ok(amMedia(reopened).wide.includes('/panoramica.webp'));
 assert.notEqual(amText(invitationDemo('annie-y-micky'),'honor'),'Nuestra fiesta');
 reopened.config=newServiceContract(reopened.config,'plus');
 assert.equal(Object.values(amMedia(reopened)).flat().length,0);
 reopened.config=newServiceContract(reopened.config,'premium');
 assert.ok(new Set(Object.values(amMedia(reopened)).flat()).size<=8);
});

test('Roly retains independent content, original resources and bounded carousels on reopen', () => {
 const {ryText,ryMedia,RY_ICONS}=require('../src/lib/roly-y-yeliana.ts');
 const {originalInvitationAsset,REMOTE_ORIGINAL_ICONS}=require('../src/lib/invitation-assets.ts');
 const draft=invitationDemo('roly-y-yeliana');
 draft.config.rolyYeliana.texts.headline='Nuestra gran noticia';
 draft.config.rolyYeliana.firstImages=['/mi-foto.webp'];
 const reopened=parseInvitation({...draft,itinerary:JSON.stringify(draft.itinerary),builder_config:JSON.stringify(draft.config)});
 assert.equal(reopened.config.designKey,'roly-y-yeliana');
 assert.equal(ryText(reopened,'headline'),'Nuestra gran noticia');
 assert.deepEqual(ryMedia(reopened).first,['/mi-foto.webp']);
 assert.equal(reopened.itinerary.length,9);
 assert.equal(originalInvitationAsset('https://invitali.com/wp-content/uploads/2024/05/Animation-1715978306775.json'),'/lottie/boda/annie-corazones-original.json');
 assert.ok(REMOTE_ORIGINAL_ICONS.some(icon=>icon.path===RY_ICONS.car));
 const original=JSON.parse(fs.readFileSync(path.join(root,'public/lottie/boda/annie-corazones-original.json')));
 assert.equal(original.w,1920);assert.equal(original.h,1080);assert.ok(original.layers.some(layer=>layer.ks?.p?.a===1));
 for(const image of [draft.cover_image_url,draft.config.rolyYeliana.backgroundImage,draft.config.rolyYeliana.dressImage,draft.config.rolyYeliana.registryImage,draft.config.giftQrUrl])assert.ok(fs.existsSync(path.join(root,'public',image)));
 reopened.config=newServiceContract(reopened.config,'plus');
 assert.equal(Object.values(ryMedia(reopened)).flat().length,0);
 reopened.config=newServiceContract(reopened.config,'premium');
 assert.ok(new Set(Object.values(ryMedia(reopened)).flat()).size<=8);
});


test('Nicole preserves independent sections, original assets and edits after reopening',()=>{
 const {nfText,nfMedia,NF_ICONS}=require('../src/lib/nicole-francisco.ts');
 const {REMOTE_ORIGINAL_ICONS}=require('../src/lib/invitation-assets.ts');
 const data=invitationDemo('nicole-y-francisco');
 assert.equal(data.config.rolyYeliana,undefined);
 assert.equal(data.config.annieMicky,undefined);
 assert.equal(data.itinerary.length,5);
 for(const url of [data.cover_image_url,...Object.values(nfMedia(data)).flat(),data.config.nicoleFrancisco.monogramImage,data.config.nicoleFrancisco.envelopeImage,data.config.giftQrUrl])assert.ok(fs.existsSync(path.join(root,'public',url)),url);
 data.config.nicoleFrancisco.texts.entry='Abrir nuestro día';
 data.config.nicoleFrancisco.sections.dress=false;
 data.config.nicoleFrancisco.collageImages=['/collage-propio.webp'];
 data.itinerary[0].iconColors={'#000000':'#112233'};
 data.itinerary[0].iconSpeed=0.6;
 const reopened=parseInvitation({...data,itinerary:JSON.stringify(data.itinerary),builder_config:JSON.stringify(data.config)});
 assert.equal(nfText(reopened,'entry'),'Abrir nuestro día');
 assert.equal(reopened.config.nicoleFrancisco.sections.dress,false);
 assert.equal(reopened.itinerary[0].iconSpeed,0.6);
 assert.equal(reopened.itinerary[0].iconColors['#000000'],'#112233');
 assert.ok(collectPublicationResources(reopened).some(r=>r.url==='/collage-propio.webp'));
 assert.ok(REMOTE_ORIGINAL_ICONS.some(i=>i.path===NF_ICONS.photo));
 assert.notEqual(nfText(invitationDemo('nicole-y-francisco'),'entry'),'Abrir nuestro día');
 reopened.config=newServiceContract(reopened.config,'plus');
 assert.equal(Object.values(nfMedia(reopened)).flat().length,0);
 reopened.config=newServiceContract(reopened.config,'premium');
 assert.ok(new Set(Object.values(nfMedia(reopened)).flat()).size<=8);
});

test('Manuel preserves its family, galleries and independent builder configuration',()=>{
 const {mmText,mmMedia,MM_ICONS}=require('../src/lib/manuel-maya.ts');
 const {originalInvitationAsset}=require('../src/lib/invitation-assets.ts');
 const data=invitationDemo('manuel-y-maya');
 assert.equal(data.config.nicoleFrancisco,undefined);
 assert.equal(data.itinerary.length,8);
 assert.equal(data.sponsors.length,2);
 assert.equal(data.config.manuelMaya.registryImages.length,2);
 for(const url of [data.cover_image_url,...Object.values(mmMedia(data)).flat(),...data.config.manuelMaya.registryImages,data.config.manuelMaya.churchImage,data.config.manuelMaya.sealImage,data.config.giftQrUrl,originalInvitationAsset(MM_ICONS.cake)])assert.ok(fs.existsSync(path.join(root,'public',url)),url);
 data.cover_image_url='/portada-editada.webp';
 assert.equal(mmMedia(data).cover[0],'/portada-editada.webp');
 data.config.manuelMaya.texts.family='Nuestras familias';
 data.config.manuelMaya.sections.dress=false;
 data.config.manuelMaya.firstImages=['/fotos-nuevas.webp'];
 data.sponsors[0].names='Familia editada';
 const reopened=parseInvitation({...data,sponsors:JSON.stringify(data.sponsors),builder_config:JSON.stringify(data.config)});
 assert.equal(mmText(reopened,'family'),'Nuestras familias');
 assert.equal(reopened.sponsors[0].names,'Familia editada');
 assert.equal(reopened.config.manuelMaya.sections.dress,false);
 assert.ok(collectPublicationResources(reopened).some(r=>r.url==='/fotos-nuevas.webp'));
 assert.notEqual(mmText(invitationDemo('manuel-y-maya'),'family'),'Nuestras familias');
 reopened.config=newServiceContract(reopened.config,'plus');
 assert.equal(Object.values(mmMedia(reopened)).flat().length,0);
 reopened.config=newServiceContract(reopened.config,'premium');
 assert.ok(new Set(Object.values(mmMedia(reopened)).flat()).size<=8);
});

originalArchiveTest('Manuel original music is available at its unchanged distribution path',()=>{
 const {originalInvitationAsset}=require('../src/lib/invitation-assets.ts');
 const url=originalInvitationAsset(invitationDemo('manuel-y-maya').config.musicUrl);assert.ok(fs.existsSync(path.join(root,'public',url)),url);
});

originalArchiveTest('Imported originals preserve archive bytes and disambiguate duplicate filenames',()=>{
 const crypto=require('node:crypto');
 const {originalInvitationAsset}=require('../src/lib/invitation-assets.ts');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/invitali-originales.json')));
 for(const item of manifest.filter(item=>item.localPath)){
  const source=fs.readFileSync(path.join(root,item.archiveFile));
  const served=fs.readFileSync(path.join(root,'public',originalInvitationAsset(item.url)));
  assert.ok(source.equals(served),item.url);
  assert.equal(crypto.createHash('sha256').update(served).digest('hex'),item.sha256);
 }
 assert.notEqual(originalInvitationAsset('https://invitali.com/wp-content/uploads/2025/07/boda.json'),originalInvitationAsset('https://invitali.com/wp-content/uploads/2025/08/boda.json'));
});

test('Mariana and Paula preserve isolated native edits and package media limits',()=>{
 const {mjMedia,mjText}=require('../src/lib/mariana-jesus.ts');
 const {pjMedia,pjText}=require('../src/lib/paula-juan-felipe.ts');
 for(const [key,scope,media,text] of [['mariana-y-jesus','marianaJesus',mjMedia,mjText],['paula-y-juan-felipe','paulaJuanFelipe',pjMedia,pjText]]){
  const data=invitationDemo(key);data.config[scope].texts.family='Familia editada';data.config[scope].sections.dress=false;
  const reopened=parseInvitation({...data,builder_config:JSON.stringify(data.config)});
  assert.equal(text(reopened,'family'),'Familia editada');assert.equal(reopened.config[scope].sections.dress,false);
  assert.notEqual(text(invitationDemo(key),'family'),'Familia editada');
  assert.ok(!reopened.config.manuelMaya);
  for(const item of collectPublicationResources(reopened).filter(r=>r.url.startsWith('/invitations/')))assert.ok(fs.existsSync(path.join(root,'public',item.url)),item.url);
  assert.ok(reopened.itinerary.every(i=>i.icon));
  reopened.config=newServiceContract(reopened.config,'plus');assert.equal(Object.values(media(reopened)).flat().filter(Boolean).length,0);
  reopened.config=newServiceContract(reopened.config,'premium');assert.ok(new Set(Object.values(media(reopened)).flat().filter(Boolean)).size<=8);
 }
});
originalArchiveTest('Replica media archives preserve every distributed byte',()=>{
 const crypto=require('node:crypto');
 for(const name of ['mariana-jesus','paula-juan-felipe','karla-mauricio','maria-mario']){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'Iconos INVITALI',name+'-recursos.json')));
  for(const item of rows){const archived=fs.readFileSync(path.join(root,item.archiveFile)),served=fs.readFileSync(path.join(root,'public',item.localPath));assert.ok(archived.equals(served));assert.equal(crypto.createHash('sha256').update(served).digest('hex'),item.sha256);}
 }
});

test('Karla native fields, original icons and resource edits survive reopening independently',()=>{
 const {kmText,KM_ICONS}=require('../src/lib/karla-mauricio.ts');
 const data=invitationDemo('karla-y-mauricio');
 assert.equal(data.config.musicUrl,undefined);
 assert.ok(!data.config.manuelMaya);
 assert.equal(data.config.sectionIcons.heart,KM_ICONS.heart);
 data.config.karlaMauricio.texts.family='Nuestra familia';
 data.config.karlaMauricio.sections.gift=false;
 data.config.karlaMauricio.scrollSpeed=3.2;
 data.config.karlaMauricio.backgroundImage='/nuevo-fondo.webp';
 const reopened=parseInvitation({...data,builder_config:JSON.stringify(data.config)});
 assert.equal(kmText(reopened,'family'),'Nuestra familia');
 assert.equal(reopened.config.karlaMauricio.sections.gift,false);
 assert.equal(reopened.config.karlaMauricio.scrollSpeed,3.2);
 assert.notEqual(kmText(invitationDemo('karla-y-mauricio'),'family'),'Nuestra familia');
 assert.ok(collectPublicationResources(reopened).some(r=>r.url==='/nuevo-fondo.webp'));
 for(const r of collectPublicationResources(invitationDemo('karla-y-mauricio')).filter(r=>r.url.startsWith('/invitations/')))assert.ok(fs.existsSync(path.join(root,'public',r.url)),r.url);
});

test('Maria keeps independent editable travel, hotels and media limits after reopening',()=>{
 const {maText,maMedia}=require('../src/lib/maria-mario.ts');
 const data=invitationDemo('maria-angelica-y-mario');
 assert.ok(!data.config.manuelMaya);
 for(const r of collectPublicationResources(data).filter(r=>r.url.startsWith('/invitations/')))assert.ok(fs.existsSync(path.join(root,'public',r.url)),r.url);
 data.config.mariaMario.texts.city='La Paz';data.config.mariaMario.sections.hotel=false;
 data.config.mariaMario.hotels[0]={name:'Mi hotel',image:'/hotel.webp',url:'https://example.com/'};
 data.config.mariaMario.travelVideo='/viaje.mp4';
 const reopened=parseInvitation({...data,builder_config:JSON.stringify(data.config)});
 assert.equal(maText(reopened,'city'),'La Paz');assert.equal(reopened.config.mariaMario.sections.hotel,false);
 assert.equal(reopened.config.mariaMario.hotels[0].name,'Mi hotel');
 assert.ok(collectPublicationResources(reopened).some(r=>r.url==='/viaje.mp4'));
 assert.notEqual(invitationDemo('maria-angelica-y-mario').config.mariaMario.hotels[0].name,'Mi hotel');
 reopened.config=newServiceContract(reopened.config,'plus');assert.equal(Object.values(maMedia(reopened)).flat().length,0);
 reopened.config=newServiceContract(reopened.config,'premium');assert.ok(new Set(Object.values(maMedia(reopened)).flat()).size<=8);
});

test('collection editions persist independent content, palette and editable routes',()=>{
 const {CLEAN_DESIGNS}=require('../src/lib/clean-designs.ts');
 const {cleanDemo}=require('../src/lib/clean-starters.ts');
 assert.equal(new Set(CLEAN_DESIGNS.map(d=>d.paper)).size,10);
 for(const d of CLEAN_DESIGNS){const data=cleanDemo(d.key);data.config.travelRoute.origin='Mi ciudad';data.config.travelRoute.originLat=-17.78;data.config.mariaMario.texts.family='Familia nueva';const opened=parseInvitation({...data,builder_config:JSON.stringify(data.config)});assert.equal(opened.config.designKey,d.key);assert.equal(opened.config.travelRoute.origin,'Mi ciudad');assert.equal(opened.config.travelRoute.originLat,-17.78);assert.equal(opened.config.mariaMario.texts.family,'Familia nueva');assert.notEqual(cleanDemo(d.key).config.mariaMario.texts.family,'Familia nueva');}
 assert.equal(invitationDemo('maria-angelica-y-mario').config.travelRoute,undefined);
});
test('travel route handles international date line, invalid numbers and coincident cities',()=>{
 const {routeGeometry}=require('../src/lib/travel-route.ts');
 const cross=routeGeometry({originLon:170,destinationLon:-170,originLat:20,destinationLat:20});assert.equal(Math.abs(cross.a.x-cross.b.x),20);
 for(const r of [{originLon:NaN,destinationLat:Infinity},{originLon:0,destinationLon:0,originLat:0,destinationLat:0}]){const g=routeGeometry(r);assert.ok(!/NaN|Infinity/.test(g.path+g.viewBox));assert.ok(g.width>0);}
 assert.equal(routeGeometry({seconds:0}).seconds,2);assert.equal(routeGeometry({seconds:100}).seconds,30);
});

test('new editions keep their itinerary edits and personalized invitation data on reopen',()=>{
 const {CLEAN_DESIGNS}=require('../src/lib/clean-designs.ts');const {cleanDemo}=require('../src/lib/clean-starters.ts');
 for(const design of CLEAN_DESIGNS){const data=cleanDemo(design.key);assert.equal(data.itinerary.length,5);assert.ok(data.itinerary.every(i=>i.time&&i.label&&i.icon));data.guest_name='Familia Pérez';data.guest_passes=3;data.itinerary[1].time='18:45';data.itinerary[1].note='Terraza principal';const opened=parseInvitation({...data,itinerary:JSON.stringify(data.itinerary),builder_config:JSON.stringify(data.config)});assert.equal(opened.guest_name,'Familia Pérez');assert.equal(opened.guest_passes,3);assert.equal(opened.itinerary[1].time,'18:45');assert.equal(opened.itinerary[1].note,'Terraza principal');assert.equal(cleanDemo(design.key).itinerary[1].time,'18:00');}
});


test('original stationery starters retain their artwork, photo framing and guest edits independently', () => {
 for(const [key,field,names] of [['jardin-de-seda','silk','Isabella & Gabriel'],['casa-limone','limone','Lucía & Nicolás']]){
  const data=invitationDemo(key);
  assert.equal(data.names,names);
  assert.equal(data.config.designKey,key);
  assert.ok(data.config.entry.enabled);
  const art=data.config[field].artImage;
  if(art)assert.ok(fs.existsSync(path.join(root,'public',art)));
  if(key==='casa-limone')assert.equal(art,undefined);
  assert.equal(data.config.mariaMario.collageImages.length,6);
  if(art)assert.ok(collectPublicationResources(data).some(r=>r.url===art));
  data.config[field].heroPosition='50% 25%';
  data.config[field].galleryPositions[2]='50% 75%';
  data.config.mariaMario.sections.collage=false;
  data.guest_name='Familia de prueba';data.guest_passes=3;
  const opened=parseInvitation({...data,builder_config:JSON.stringify(data.config)});
  assert.equal(opened.config[field].galleryPositions[2],'50% 75%');
  assert.equal(opened.config.mariaMario.sections.collage,false);
  assert.equal(opened.guest_passes,3);
  assert.notEqual(invitationDemo(key).config[field].galleryPositions[2],'50% 75%');
  assert.equal(invitationDemo(key).config.mariaMario.sections.collage,undefined);
 }
});


test('Promesa has independent album pages, framing and reusable originals',()=>{
 const data=invitationDemo('promesa');
 assert.equal(data.names,'Emilia & Alejandro');
 assert.equal(data.config.designKey,'promesa');
 assert.equal(data.config.silk,undefined);
 assert.equal(data.config.mariaMario.collageImages.length,6);
 for(const photo of data.config.mariaMario.collageImages)assert.ok(fs.existsSync(path.join(root,'public',photo)));
 data.config.promesa.heroPosition='50% 25%';
 data.config.promesa.galleryPositions[1]='50% 75%';
 data.config.mariaMario.collageImages.reverse();
 data.config.mariaMario.sections.itinerary=false;
 data.guest_name='Familia Rojas';data.guest_passes=4;
 const restored=parseInvitation({...data,builder_config:JSON.stringify(data.config)});
 assert.equal(restored.config.promesa.heroPosition,'50% 25%');
 assert.equal(restored.config.promesa.galleryPositions[1],'50% 75%');
 assert.equal(restored.guest_passes,4);
 assert.equal(restored.config.mariaMario.sections.itinerary,false);
 assert.equal(invitationDemo('promesa').config.promesa.heroPosition,'50% 40%');
 assert.notEqual(invitationDemo('promesa').config.mariaMario.collageImages[0],restored.config.mariaMario.collageImages[0]);
});
