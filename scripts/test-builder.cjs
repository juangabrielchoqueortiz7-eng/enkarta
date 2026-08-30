// Runs the installed TypeScript sources without adding a test runtime dependency.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
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
const { createLiveSync, SyncDenied, retryDelay } = require('../src/lib/live-sync.ts');
const { addDays, validDay, invitationValidity, parseValidityCommand, validityLabel } = require('../src/lib/invitation-validity.ts');
const { deliveryState, guestMessage, reminderMessage, parseDeliveryInput } = require('../src/lib/guest-delivery.ts');
const { mapToAzure } = require('../src/lib/invitation-mapper.ts');
const { additionalServiceChecks, additionalServiceErrors, navigationCandidates, publicAdditionalServices } = require('../src/lib/additional-services.ts');
const { activeInvitationLocale, formatInvitationDate, invitationCopy } = require('../src/lib/invitation-i18n.ts');
const { parseSaveDateInput } = require('../src/lib/save-date.ts');
const { clientInvitation } = require('../src/lib/client-invitation.ts');
const { qualityChecksFor, qualityProgress, releaseReady, qualityReport, updateQualityCheck } = require('../src/lib/quality-assurance.ts');
const { commercialMessage, commercialContactPath, commercialConfirmationPath, parseCommercialContext } = require('../src/lib/commercial.ts');
const { COMMERCIAL_EVENT_PAGES, COMMERCIAL_EVENT_SLUGS } = require('../src/lib/event-pages.ts');
const { COMMERCIAL_PROOFS, isPublishableClientProof } = require('../src/lib/commercial-proof.ts');
const { MARKETING_CAMPAIGNS, MARKETING_FORMATS, marketingTrackingPath } = require('../src/lib/marketing-kit.ts');

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
    if (key !== 'marfil-vivo') assert.equal(starter.template, key);
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
  assert.equal(countdown.props.isoDate, `${demo.event_date}T16:00:00`);
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

test('all 13 catalogue entries keep native identity and expose blocks only as an opt-in', () => {
  const catalog = collectionCatalog();
  assert.equal(catalog.length, 13);
  for (const card of catalog) {
    const starter = invitationStarter(card.key);
    const demo = invitationDemo(card.key);
    const blockDemo = invitationDemo(card.key, { blocks: true });
    assert.equal(card.names, starter.names);
    assert.equal(card.date, starter.event_date);
    assert.equal(card.image, starter.cover_image_url);
    if (card.key === 'marfil-vivo') assert.equal(demo.config.layout.presetKey, card.key);
    else assert.equal(demo.config.layout, undefined, `${card.key} debe conservar su plantilla original`);
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
    demo.config.layout.blocks[0].props.focal = '32% 64%';
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
