// Focused executable regressions for the independent Capitulo invitation.
// SSR and provenance checks complement, rather than certify, browser appearance.
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
const { CAPITULO_KEY, CAPITULO_ASSETS, capituloStarter, capituloDemo, capituloDate, capituloNames } = require('../src/lib/capitulo.ts');
const { CapituloEntry: Entry, CapituloRsvpProvider: RsvpProvider, default: Invitation } = require('../src/components/invitations/Capitulo.tsx');
const { invitationDemo, STARTER_TEMPLATE_KEYS } = require('../src/lib/template-starters.ts');
const { STARTER_DESIGNS, publicTemplateName } = require('../src/lib/enkarta-collections.ts');
const { parseInvitation } = require('../src/lib/types.ts');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const markup = (data = capituloDemo(), props = {}) => renderToStaticMarkup(React.createElement(Invitation, { data, demo: true, skipEntry: true, ...props }));

test('Capitulo is an independent editorial draft and never replaces Áurea or its available starters', () => {
  const legacy = structuredClone(invitationDemo('primicia')), keys = [...STARTER_TEMPLATE_KEYS];
  const first = capituloStarter(), second = capituloStarter();
  assert.equal(CAPITULO_KEY, 'capitulo'); assert.equal(first.status, 'draft'); assert.equal(first.template, 'primicia');
  assert.equal(first.builder_config.designKey, 'capitulo');
  assert.equal(STARTER_TEMPLATE_KEYS.includes(CAPITULO_KEY), false);
  assert.equal(STARTER_DESIGNS.some(design => design.key === CAPITULO_KEY), false);
  assert.equal(publicTemplateName('primicia'), 'Áurea'); assert.match(publicTemplateName('primicia', CAPITULO_KEY), /Capítulo/);
  first.names = 'QA otra pareja'; first.builder_config.city = 'QA otra ciudad';
  assert.notEqual(second.names, first.names); assert.notEqual(second.builder_config.city, first.builder_config.city);
  const unchanged = invitationDemo('primicia'); unchanged.created_at = legacy.created_at;
  assert.deepEqual(unchanged, legacy); assert.deepEqual(STARTER_TEMPLATE_KEYS, keys);
});

test('editorial date labels use the exact editable date and reject impossible calendar input', () => {
  assert.deepEqual(capituloDate('2027-06-19'), { iso: '2027-06-19', day: '19', year: '2027', month: 'JUNIO', weekday: 'SÁBADO', entryLine: '19 de junio de 2027' });
  assert.equal(capituloDate('2028-02-29').weekday, 'MARTES');
  for (const value of [null, '', '2027-02-29', '2028-13-01', '2027-06-31', 'not-a-date']) assert.equal(capituloDate(value), null, String(value));
});

test('names and independently edited content survive parser persistence without reviving sample values', () => {
  assert.deepEqual(capituloNames(null), { first: '', second: '' });
  assert.deepEqual(capituloNames(''), { first: '', second: '' });
  assert.deepEqual(capituloNames('QA Ana y QA Luis'), { first: 'QA Ana', second: 'QA Luis' });
  const data = capituloDemo(); data.names = 'QA Ana & QA Luis'; data.config = { ...data.config, city: 'QA Ciudad', welcomeTitle: 'QA capítulo editable', introMessage: '' };
  const saved = parseInvitation({ ...data, builder_config: JSON.stringify(data.config) });
  assert.equal(saved.config.designKey, CAPITULO_KEY); assert.equal(saved.config.city, 'QA Ciudad'); assert.equal(saved.config.introMessage, '');
  assert.deepEqual(capituloNames(saved.names), { first: 'QA Ana', second: 'QA Luis' });
  const html = markup(saved);
  for (const text of ['QA Ana', 'QA Luis', 'QA Ciudad', 'QA capítulo editable']) assert.ok(html.toLowerCase().includes(text.toLowerCase()), text);
});

test('cleared names, city and optional lists remain cleared in the rendered interior', () => {
  const data = capituloDemo(), initial = capituloDemo();
  Object.assign(data, { names: '', event_date: null, parents_bride: [], parents_groom: [], sponsors: [], itinerary: [], dress_code: null, gift_message: null, bank_account: null });
  data.config = { ...data.config, city: '', introMessage: '', welcomeTitle: '', verse: '', verseRef: '', galleryMessage: '', rsvpMessage: '', storyTitle: '', storyMessage: '', sectionImages: { ...data.config.sectionImages, capituloDetail: '', capituloCelebration: '' } };
  const html = markup(data);
  for (const sample of [...Object.values(capituloNames(initial.names)), initial.config.city]) if (sample) assert.equal(html.toLowerCase().includes(sample.toLowerCase()), false, `cleared sample: ${sample}`);
  assert.doesNotMatch(html, /data-capitulo-section="(?:parents|itinerary|adults)"/, 'Removed lists cannot restore sample sections');
  assert.equal(html.includes(CAPITULO_ASSETS.detail), false, 'Clearing the story image cannot restore its generated default');
  assert.equal(html.includes(CAPITULO_ASSETS.celebration), false, 'Clearing the celebration image cannot restore its generated default');
  if (initial.config.welcomeTitle) assert.equal(html.includes(initial.config.welcomeTitle), false);
  if (initial.config.storyTitle) assert.equal(html.includes(initial.config.storyTitle), false);
});

test('the public demo uses the new artwork without foreign RSVP forms, personal bank data or transactions', () => {
  const data = capituloDemo(), html = markup(data);
  for (const role of ['hero', 'detail', 'celebration']) {
    assert.equal(CAPITULO_ASSETS[role], `/invitations/capitulo/${role}.webp`);
    assert.ok(html.includes(CAPITULO_ASSETS[role]), `generated ${role} is rendered`);
  }
  assert.equal(data.bank_account, null); assert.equal(data.phone_whatsapp, null);
  assert.doesNotMatch(html, /invitali\.com|>Invitali<|BANCOLOMBIA|4432324355|652342346667|forms\.gle|docs\.google\.com\/forms|action="https?:|wa\.me\/\d/i);
  assert.doesNotMatch(html, /<form\b|<iframe\b/i, 'A visual sample cannot submit attendance or embed a third-party form');
  assert.match(html, /Confirmar/i);
});

test('the native entry is one modal over an inert invitation with an editable label', () => {
  const data = capituloDemo(), html = renderToStaticMarkup(React.createElement(Entry, { data, label: 'QA abrir mi capítulo' }, React.createElement('h1', null, 'QA contenido protegido')));
  assert.match(html, /role="dialog"/); assert.match(html, /aria-modal="true"/); assert.ok(html.includes('QA abrir mi capítulo'));
  assert.match(html, /aria-hidden="true"[^>]*><h1>QA contenido protegido/);
  const preview = markup(data, { preview: true, skipEntry: false });
  assert.doesNotMatch(preview, /role="dialog"/, 'The builder preview exposes the interior without an entry blocking its canvas');
  const cleared = renderToStaticMarkup(React.createElement(Entry, { data, label: '' }, React.createElement('h1', null, 'QA contenido protegido')));
  if (data.config.entry?.label) assert.equal(cleared.includes(data.config.entry.label), false, 'An explicitly cleared label cannot restore the sample button text');
});

test('the native interior receives only the server-supplied RSVP node and never fabricates a guest form', () => {
  const html = renderToStaticMarkup(React.createElement(RsvpProvider, { form: React.createElement('form', { 'data-qa-authorized-rsvp': 'true' }, 'QA formulario autorizado') }, React.createElement(Invitation, { data: capituloDemo(), demo: false, skipEntry: true })));
  assert.equal((html.match(/data-qa-authorized-rsvp="true"/g) ?? []).length, 1);
  assert.equal((html.match(/<form\b/g) ?? []).length, 1);
  const noVerifiedForm = markup(capituloDemo(), { demo: false });
  assert.doesNotMatch(noVerifiedForm, /<form\b/);
  assert.doesNotMatch(noVerifiedForm, /forms\.gle|docs\.google\.com\/forms/);
});

test('generated imagery has explicit source, prompts, source-byte hashes and verified WebP distribution dimensions', async () => {
  const manifest = JSON.parse(read('docs/assets/capitulo-images.json'));
  assert.equal(manifest.variant, CAPITULO_KEY); assert.equal(manifest.synthetic, true);
  assert.ok(Array.isArray(manifest.assets)); assert.equal(manifest.assets.length, 3);
  const images = new Map(manifest.assets.map(asset => [asset.distribution?.path, asset]));
  assert.equal(images.size, 3);
  const earlierImages = JSON.parse(read('docs/assets/travesia-images.json')).assets;
  const earlierHashes = new Set(earlierImages.flatMap(asset => [asset.generatedMaster.sha256, asset.distribution.sha256]));
  const sharp = require('sharp');
  for (const local of Object.values(CAPITULO_ASSETS)) {
    const asset = images.get(local); assert.ok(asset, `documented artwork: ${local}`);
    assert.equal(asset.source, 'OpenAI image_gen built-in'); assert.ok(typeof asset.prompt === 'string' && asset.prompt.trim().length >= 50);
    assert.equal(asset.referenceImageUsed, false, 'New artwork is generated without a downloaded reference image');
    assert.ok(asset.generatedMaster?.file && /^[a-f0-9]{64}$/.test(asset.generatedMaster.sha256)); assert.ok(asset.generatedMaster.bytes > 0);
    assert.match(asset.generatedMaster.file.replaceAll('\\', '/'), /^assets\/generated\/capitulo\//);
    assert.equal(earlierHashes.has(asset.generatedMaster.sha256), false, 'The master is new artwork rather than an earlier invitation image');
    assert.equal(earlierHashes.has(asset.distribution.sha256), false, 'The distributed image cannot reuse another invitation asset');
    const masterFile = path.resolve(root, asset.generatedMaster.file);
    if (fs.existsSync(masterFile)) {
      const bytes = fs.readFileSync(masterFile); assert.equal(bytes.length, asset.generatedMaster.bytes); assert.equal(sha(bytes), asset.generatedMaster.sha256);
    } else assert.ok(process.env.CI, `generated source is present locally: ${asset.generatedMaster.file}`);
    assert.match(local, /^\/invitations\/capitulo\/[a-z-]+\.webp$/);
    const bytes = fs.readFileSync(path.join(root, 'public', local));
    assert.equal(bytes.length, asset.distribution.bytes); assert.equal(sha(bytes), asset.distribution.sha256);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, asset.distribution.width); assert.equal(metadata.height, asset.distribution.height);
    assert.ok(metadata.width >= 600 && metadata.height >= 600, 'Large artwork remains suitable for desktop and mobile crops');
  }
});
