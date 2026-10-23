// Executes the independent Azure reference profile and its data helpers. Static
// markup and byte checks do not replace the browser comparison recorded in
// docs/AZURE_REFERENCIA.md, a physical-device test, or a production request.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = require.extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText, file);
require.extensions['.css'] = mod => { mod.exports = { __esModule: true, default: new Proxy({}, { get: (_target, name) => String(name) }) }; };
const React = require('react');
const stub = (file, exports) => { require.cache[require.resolve(file)] = { exports }; };
stub('../src/components/invitations/InvitationAnalytics.tsx', { emitInvitationAnalytics: () => {} });
const { renderToStaticMarkup } = require('react-dom/server');
const { AZURE_REFERENCE_ASSETS, azureReferenceStarter, azureReferenceDemo, azureReferenceDate, azureReferenceNames } = require('../src/lib/azure-reference.ts');
const { AzureReferenceEntry: Entry, default: Invitation } = require('../src/components/invitations/AzureReference.tsx');
const { invitationDemo, STARTER_TEMPLATE_KEYS } = require('../src/lib/template-starters.ts');
const { STARTER_DESIGNS, publicTemplateName } = require('../src/lib/enkarta-collections.ts');
const { parseInvitation } = require('../src/lib/types.ts');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
// The master folder and audio originals are not versioned; CI checks only what it has.
const archiveMissingInCi = !!process.env.CI && !fs.existsSync(path.join(root, 'Iconos INVITALI/azure-referencia-recursos.json'));

test('the reference is an independent draft and never mutates the existing Azure design', () => {
  const legacy = structuredClone(invitationDemo('azure'));
  const first = azureReferenceStarter(), second = azureReferenceStarter();
  assert.equal(first.status, 'draft'); assert.equal(first.template, 'azure'); assert.equal(first.builder_config.designKey, 'azure-referencia');
  assert.equal(STARTER_TEMPLATE_KEYS.includes('azure-referencia'), false);
  assert.equal(STARTER_DESIGNS.some(design => design.key === 'azure-referencia'), false);
  assert.equal(publicTemplateName('azure', 'azure-referencia'), 'Azure · estudio de referencia');
  first.names = 'QA otro'; first.builder_config.city = 'QA ciudad';
  assert.notEqual(second.names, first.names); assert.notEqual(second.builder_config.city, first.builder_config.city);
  const unchanged = invitationDemo('azure'); unchanged.created_at = legacy.created_at;
  assert.deepEqual(unchanged, legacy);
});

test('date labels come only from the editable event date', () => {
  assert.deepEqual(azureReferenceDate('2026-07-04'), { iso: '2026-07-04', day: '04', year: '2026', month: 'JULIO', weekday: 'SÁBADO', entryLine: 'Julio  04  2026' });
  assert.equal(azureReferenceDate('2027-12-25').weekday, 'SÁBADO');
  for (const value of [null, '', '2027-02-29', '2028-13-01', 'not-a-date']) assert.equal(azureReferenceDate(value), null);
});

test('blank names stay blank and edited names survive the persisted parser', () => {
  assert.deepEqual(azureReferenceNames(''), { first: '', second: '' });
  assert.deepEqual(azureReferenceNames('Ana y Luis'), { first: 'Ana', second: 'Luis' });
  const draft = azureReferenceDemo(); draft.names = 'QA Ana & QA Luis'; draft.config.city = 'QA Ciudad';
  const saved = parseInvitation({ ...draft, builder_config: JSON.stringify(draft.config) });
  assert.equal(saved.config.designKey, 'azure-referencia'); assert.equal(saved.config.city, 'QA Ciudad');
  assert.deepEqual(azureReferenceNames(saved.names), { first: 'QA Ana', second: 'QA Luis' });
});

test('the interior renders editable content without the reference bank data or brand', () => {
  const html = renderToStaticMarkup(React.createElement(Invitation, { data: azureReferenceDemo(), demo: true, skipEntry: true }));
  for (const value of ['Lorena', 'Marcos', 'SÁBADO', 'JULIO', 'BOGOTÁ', 'Solo faltan', 'Juan Pablo Castaño Herrera', 'Capilla de los Santos Apóstoles', 'Club Los Lagartos', 'Hombres:', 'Itinerario', '19:00 h', 'Sugerencia de Regalo', 'DEMO · no realizar transferencias', 'Confirmar Asistencia', 'ENKARTA'])
    assert.ok(html.includes(value), value);
  for (const value of ['BANCOLOMBIA', '4432324355', '652342346667', 'Invitali', 'invitali.com', 'QR-BNB']) assert.equal(html.includes(value), false, value);
  assert.match(html, /https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=Capilla/);
  assert.ok(html.includes('data-az-reveal'), 'fadeInUp targets remain visible until an observer arms them');
});

test('edited content replaces the sample and empty optional sections disappear', () => {
  const data = azureReferenceDemo();
  Object.assign(data, { names: 'QA Ana & QA Luis', parents_bride: [], parents_groom: [], itinerary: [], dress_code: null, gift_message: null, bank_account: 'Banco QA\nCuenta: 0001112223' });
  data.config = { ...data.config, city: '', welcomeTitle: 'QA bienvenida' };
  const html = renderToStaticMarkup(React.createElement(Invitation, { data, demo: false, skipEntry: true }));
  assert.ok(html.includes('QA bienvenida') && html.includes('QA Ana') && html.includes('0001112223'));
  for (const value of ['Lorena', 'BOGOTÁ', 'Itinerario', 'data-azure-section="parents"', 'data-azure-section="dress"', 'DEMO · no realizar']) assert.equal(html.includes(value), false, value);
});

test('the entry is a modal over an inert invitation and uses the editable label', () => {
  const html = renderToStaticMarkup(React.createElement(Entry, { data: azureReferenceDemo(), label: 'QA entrar' }, React.createElement('h1', null, 'Contenido')));
  assert.match(html, /role="dialog"/); assert.match(html, /aria-modal="true"/); assert.ok(html.includes('QA entrar'));
  assert.ok(html.includes('Lorena &amp; Marcos') && html.includes('Julio'));
  assert.match(html, /aria-hidden="true"[^>]*><h1>Contenido/);
  const blank = azureReferenceDemo(); blank.config = { ...blank.config, sectionImages: { azureMonogram: '' } };
  assert.equal(renderToStaticMarkup(React.createElement(Entry, { data: blank }, null)).includes('logo-laura-y-mateo'), false);
});

test('every local original matches its archived SHA-256 and the importer manifest', { skip: archiveMissingInCi && 'archive not present in CI' }, () => {
  const manifest = JSON.parse(read('Iconos INVITALI/azure-referencia-recursos.json'));
  const byPath = new Map(manifest.map(row => [row.localPath, row]));
  const music = JSON.parse(read('public/invitali-originales.json')).find(row => row.localPath === AZURE_REFERENCE_ASSETS.music);
  for (const [role, local] of Object.entries(AZURE_REFERENCE_ASSETS)) {
    const bytes = fs.readFileSync(path.join(root, 'public', local));
    const row = byPath.get(local) ?? (role === 'music' ? music : null);
    if (role === 'hearts') { assert.equal(sha(bytes), '96991ec4e2b0f4175d064c0698078e68b9a408aba72a35e3e4c2ec774a713303'); continue; }
    assert.ok(row, 'registered ' + role);
    assert.equal(bytes.length, row.bytes, role); assert.equal(sha(bytes), row.sha256, role);
    if (row.archiveFile) assert.equal(sha(fs.readFileSync(path.join(root, row.archiveFile))), row.sha256, role);
  }
  assert.equal(new Set(manifest.map(row => row.url)).size, manifest.length);
  assert.ok(manifest.every(row => row.url.startsWith('https://')));
});

test('the public page owns one entry and one RSVP boundary for the profile', () => {
  const page = read('src/app/i/[slug]/page.tsx');
  assert.match(page, /nativeAzureReference = config\.designKey === 'azure-referencia' && !hasBlocks/);
  assert.match(page, /AzureReferenceRsvpProvider form=\{smartRsvp\}/);
  assert.match(page, /!nativeReference && smartRsvp/);
  assert.match(read('src/lib/template-registry.tsx'), /designKey === 'azure-referencia'\) return \{ Comp: AzureReference/);
  const css = read('src/components/invitations/AzureReference.module.css');
  assert.equal(/:global\((?!html\):has\(\.profile\[data-azure-reference-page\]\))/.test(css), false, 'no global rules beyond the page guard');
});
