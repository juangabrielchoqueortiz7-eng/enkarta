// Focused behavior and provenance checks for the independent Vespera invitation.
// SSR complements browser review; it does not certify visual or temporal identity.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = require.extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText, file);
require.extensions['.css'] = mod => { mod.exports = { __esModule: true, default: new Proxy({}, { get: (_target, name) => String(name) }) }; };
const React = require('react');
require.cache[require.resolve('../src/components/invitations/InvitationAnalytics.tsx')] = { exports: { emitInvitationAnalytics: () => {} } };
const { renderToStaticMarkup } = require('react-dom/server');
const { VESPERA_KEY, VESPERA_ASSETS, vesperaStarter, vesperaDemo, vesperaDate, vesperaNames } = require('../src/lib/vespera.ts');
const { VESPERA_ORIGINALS, VESPERA_ENTRY_ASSETS, VESPERA_MUSIC } = require('../src/lib/vespera-assets.ts');
const { default: Invitation, VesperaEntry: Entry, VesperaRsvpProvider: RsvpProvider } = require('../src/components/invitations/Vespera.tsx');
const { invitationDemo, STARTER_TEMPLATE_KEYS } = require('../src/lib/template-starters.ts');
const { STARTER_DESIGNS, publicTemplateName } = require('../src/lib/enkarta-collections.ts');
const { parseInvitation } = require('../src/lib/types.ts');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const markup = (data = vesperaDemo(), props = {}) => renderToStaticMarkup(React.createElement(Invitation, { data, demo: true, skipEntry: true, ...props }));
const section = (html, key) => html.match(new RegExp(`<section\\b[^>]*data-vespera-section="${key}"[^>]*>[\\s\\S]*?<\\/section>`))?.[0];

test('public sample query flags preserve static preview and never manufacture personalized guests', async () => {
  const { default: Page, metadata } = require('../src/app/muestra/vespera/page.tsx');
  assert.equal(metadata.robots.index, false);
  for (const [query, skipEntry, preview] of [[{}, false, false], [{ full: '1' }, true, false], [{ preview: '1' }, true, true], [{ full: '0', preview: '0', n: '99', m: 'QA familia inventada' }, false, false]]) {
    const el = await Page({ searchParams: Promise.resolve(query) });
    assert.equal(el.props.demo, true); assert.equal(el.props.skipEntry, skipEntry); assert.equal(el.props.preview, preview);
    assert.equal(el.props.data.config.activeGuest, undefined); assert.equal(el.props.data.names, 'Camila & Nicolás');
    assert.equal(el.props.data.guest_passes, 2, 'Untrusted parameters cannot assign extra guest passes');
  }
});

test('Véspera is an independent draft and does not replace Seda or alter its available starter designs', () => {
  const legacy = structuredClone(invitationDemo('grazia')), keys = [...STARTER_TEMPLATE_KEYS], first = vesperaStarter(), second = vesperaStarter();
  assert.equal(VESPERA_KEY, 'vespera'); assert.equal(first.template, 'grazia'); assert.equal(first.status, 'draft');
  assert.equal(first.builder_config.designKey, VESPERA_KEY); assert.equal(STARTER_TEMPLATE_KEYS.includes(VESPERA_KEY), false);
  assert.equal(STARTER_DESIGNS.some(design => design.key === VESPERA_KEY), false);
  assert.equal(publicTemplateName('grazia'), 'Seda'); assert.equal(publicTemplateName('grazia', VESPERA_KEY), 'Véspera');
  first.names = 'QA pareja distinta'; first.builder_config.city = 'QA ciudad'; assert.notEqual(second.names, first.names); assert.notEqual(second.builder_config.city, first.builder_config.city);
  const unchanged = invitationDemo('grazia'); unchanged.created_at = legacy.created_at;
  assert.deepEqual(unchanged, legacy); assert.deepEqual(STARTER_TEMPLATE_KEYS, keys);
});

test('dates and names remain derived from editable content and impossible dates stay absent', () => {
  assert.deepEqual(vesperaNames('QA Ana y QA Luis'), { first: 'QA Ana', second: 'QA Luis' });
  assert.deepEqual(vesperaNames(''), { first: '', second: '' });
  assert.equal(vesperaDate('2028-02-29').day, '29'); assert.equal(vesperaDate('2027-06-19').year, '2027');
  for (const invalid of [null, '', '2027-02-29', '2028-13-01', '2027-06-31', 'not-a-date']) assert.equal(vesperaDate(invalid), null);
  const data = vesperaDemo(); data.event_date = '2027-10-23';
  assert.match(markup(data), /dates=20271023\/20271024(?:&amp;|&)/, 'All-day calendar end is the next day, exclusively');
  data.event_date = '2028-02-29';
  assert.match(markup(data), /dates=20280229\/20280301(?:&amp;|&)/, 'UTC calendar arithmetic crosses leap day into March');
});

test('edited and cleared names, copy, pictures and optional lists survive persistence without restoring samples', () => {
  const data = vesperaDemo(); data.names = 'QA Ana & QA Luis'; data.config = { ...data.config, city: 'QA ciudad', welcomeTitle: 'QA invitación editable', introMessage: '' };
  const saved = parseInvitation({ ...data, builder_config: JSON.stringify(data.config) });
  assert.equal(saved.config.designKey, VESPERA_KEY); assert.equal(saved.config.introMessage, '');
  const html = markup(saved); for (const text of ['QA Ana', 'QA Luis', 'QA ciudad', 'QA invitación editable']) assert.ok(html.includes(text), text);
  const empty = vesperaDemo(), initial = vesperaDemo();
  Object.assign(empty, { names: '', event_date: null, parents_bride: [], parents_groom: [], sponsors: [], itinerary: [], dress_code: null, no_kids: false, gift_message: null, bank_account: null });
  empty.config = { ...empty.config, city: '', welcomeTitle: '', introMessage: '', storyTitle: '', storyMessage: '', verse: '', verseRef: '', galleryImages: [], galleryCaptions: [], galleryMessage: '', rsvpMessage: '', sectionImages: { ...empty.config.sectionImages, vesperaDetail: '', vesperaCelebration: '' } };
  const cleared = markup(empty);
  for (const value of [...Object.values(vesperaNames(initial.names)), initial.config.city]) if (value) assert.equal(cleared.includes(value), false, value);
  assert.doesNotMatch(cleared, /data-vespera-section="(?:parents|itinerary|adults|gallery)"/);
  assert.equal(cleared.includes(VESPERA_ASSETS.detail), false); assert.equal(cleared.includes(VESPERA_ASSETS.celebration), false);
});

test('the demo renders its new photographs and original itinerary without foreign forms, bank data or transactions', () => {
  const data = vesperaDemo(), before = structuredClone(data), html = markup(data);
  for (const asset of Object.values(VESPERA_ASSETS)) { assert.match(asset, /^\/invitations\/vespera\/.+\.webp$/); assert.ok(html.includes(asset), asset); }
  const photos = html.match(/<img\b[^>]*(?:data-vespera-photo|class="heroPhoto")[^>]*>/g) ?? []; assert.equal(photos.length, 3);
  assert.equal(data.itinerary.length, 8, 'The complete celebration has eight editable moments');
  for (const item of data.itinerary) { assert.ok(item.time && item.label); assert.match(item.icon, /^\/lottie\/.+\.json$/); assert.ok(html.includes(item.label), item.label); }
  assert.equal(data.bank_account, null); assert.equal(data.phone_whatsapp, null);
  assert.doesNotMatch(html, /<form\b|<iframe\b|forms\.gle|docs\.google\.com\/forms|action="https?:|wa\.me\/\d|BANCOLOMBIA|4432324355|652342346667/i);
  assert.match(html, /Confirmar/i); assert.deepEqual(data, before, 'Rendering cannot rewrite the stored invitation');
});

test('the native entry keeps an editable action and authentic original paper and wax seal, while preview exposes the interior', () => {
  const data = vesperaDemo(), html = renderToStaticMarkup(React.createElement(Entry, { data, label: 'QA abrir mi invitación' }, React.createElement('h1', null, 'QA contenido protegido')));
  assert.match(html, /role="dialog"/); assert.match(html, /aria-modal="true"/); assert.ok(html.includes('QA abrir mi invitación'));
  assert.match(html, /aria-hidden="true"[^>]*><h1>QA contenido protegido/);
  assert.doesNotMatch(markup(data, { preview: true, skipEntry: false }), /role="dialog"/);
  const lock = JSON.parse(read('scripts/original-distribution-lock.json')).resources;
  for (const asset of Object.values(VESPERA_ENTRY_ASSETS)) {
    assert.ok(html.includes(asset), `Archived entry art is rendered: ${asset}`);
    const row = lock.find(value => value.path === asset); assert.ok(row, asset);
    const bytes = fs.readFileSync(path.join(root, 'public', asset)); assert.equal(sha(bytes), row.sha256); assert.equal(bytes.length, row.bytes);
  }
});

test('only the server-supplied RSVP is rendered and an unverified visitor cannot receive a fabricated form', () => {
  const html = renderToStaticMarkup(React.createElement(RsvpProvider, { form: React.createElement('form', { 'data-qa-authorized-rsvp': 'true' }, 'QA formulario autorizado') }, React.createElement(Invitation, { data: vesperaDemo(), demo: false, skipEntry: true })));
  assert.equal((html.match(/data-qa-authorized-rsvp="true"/g) ?? []).length, 1); assert.equal((html.match(/<form\b/g) ?? []).length, 1);
  assert.doesNotMatch(markup(vesperaDemo(), { demo: false }), /<form\b|forms\.gle|docs\.google\.com\/forms/);
});

test('the archived selected track never autoplays; clearing it and silent builder preview remain silent', () => {
  const data = vesperaDemo(); assert.equal(data.config.musicUrl, VESPERA_MUSIC.localPath);
  const row = JSON.parse(read('scripts/original-distribution-lock.json')).resources.find(asset => asset.path === data.config.musicUrl); assert.ok(row);
  const bytes = fs.readFileSync(path.join(root, 'public', data.config.musicUrl)); assert.equal(sha(bytes), row.sha256); assert.equal(bytes.length, row.bytes);
  const html = markup(data); assert.equal((html.match(/<audio\b/g) ?? []).length, 1); assert.doesNotMatch(html, /\bautoPlay=|\bautoplay=/i); assert.match(html, /preload="none"/);
  data.config.musicUrl = ''; const saved = parseInvitation({ ...data, builder_config: JSON.stringify(data.config) });
  assert.equal(saved.config.musicUrl, ''); assert.doesNotMatch(markup(saved), /<audio\b/);
  assert.doesNotMatch(markup(vesperaDemo(), { preview: true }), /<audio\b/);
});

test('gallery captions stay with their image and gallery limits, reordered itinerary and cleared icons remain authoritative', () => {
  const data = vesperaDemo(), images = ['/invitations/qa-third.webp', '/invitations/qa-first.webp'];
  data.config = { ...data.config, galleryImages: images, galleryCaptions: [{ image: images[1], title: 'QA primera', caption: 'QA pie primera' }, { image: images[0], title: 'QA tercera', caption: 'QA pie tercera', alt: 'QA descripción tercera' }], features: { ...data.config.features, galleryMax: 1 } };
  let html = markup(data), gallery = section(html, 'gallery'); assert.ok(gallery);
  for (const value of [images[0], 'QA tercera', 'QA pie tercera', 'QA descripción tercera']) assert.ok(gallery.includes(value), value);
  assert.equal(gallery.includes(images[1]), false); assert.equal(gallery.includes('QA primera'), false);
  data.config.galleryImages = []; assert.equal(section(markup(data), 'gallery'), undefined);
  data.config.galleryImages = images; data.config.features.galleryMax = 0; assert.equal(section(markup(data), 'gallery'), undefined);
  data.itinerary = [{ time: '21:15', label: 'QA cena editada', icon: '/lottie/qa-custom-dinner.json', iconColors: { '#000000': '#15607a' }, iconSpeed: 1.75 }, { time: '16:10', label: 'QA sin icono', icon: '' }];
  const saved = parseInvitation({ ...data, itinerary: JSON.stringify(data.itinerary), builder_config: JSON.stringify(data.config) }); assert.deepEqual(saved.itinerary, data.itinerary);
  html = markup(saved); const rows = html.match(/<li\b[^>]*data-vespera-itinerary-item[^>]*>[\s\S]*?<\/li>/g) ?? [];
  assert.equal(rows.length, 2); assert.ok(rows[0].includes('QA cena editada')); assert.ok(rows[0].includes('/lottie/qa-custom-dinner.json'));
  assert.ok(rows[1].includes('QA sin icono')); assert.doesNotMatch(rows[1], /data-vespera-original-icon=/);
});

test('three new generated masters and WebP distributions have explicit prompts, distinct hashes and valid dimensions', async () => {
  const manifest = JSON.parse(read('docs/assets/vespera-images.json')); assert.equal(manifest.variant, VESPERA_KEY); assert.equal(manifest.synthetic, true); assert.equal(manifest.assets.length, 3);
  const byPath = new Map(manifest.assets.map(asset => [asset.distribution?.path, asset])); assert.equal(byPath.size, 3);
  const earlier = ['capitulo', 'travesia', 'serenata'].flatMap(key => JSON.parse(read(`docs/assets/${key}-images.json`)).assets).flatMap(asset => [asset.generatedMaster.sha256, asset.distribution.sha256]);
  const sharp = require('sharp');
  for (const local of Object.values(VESPERA_ASSETS)) {
    const asset = byPath.get(local); assert.ok(asset, local); assert.equal(asset.source, 'OpenAI image_gen built-in'); assert.ok(asset.prompt.trim().length > 50);
    assert.notEqual(asset.referenceImageUsed, true, 'The new scene is not an edited original photograph');
    assert.equal(earlier.includes(asset.generatedMaster.sha256), false); assert.equal(earlier.includes(asset.distribution.sha256), false);
    const masterFile = path.resolve(root, asset.generatedMaster.file); assert.match(asset.generatedMaster.file.replaceAll('\\', '/'), /^assets\/generated\/vespera\//);
    if (fs.existsSync(masterFile)) { const bytes = fs.readFileSync(masterFile); assert.equal(sha(bytes), asset.generatedMaster.sha256); assert.equal(bytes.length, asset.generatedMaster.bytes); } else assert.ok(process.env.CI);
    const bytes = fs.readFileSync(path.join(root, 'public', local)); assert.equal(sha(bytes), asset.distribution.sha256); assert.equal(bytes.length, asset.distribution.bytes);
    const metadata = await sharp(bytes).metadata(); assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, asset.distribution.width); assert.equal(metadata.height, asset.distribution.height); assert.ok(metadata.width >= 600 && metadata.height >= 600);
  }
});

test('all fourteen exact JSON sources are locally resolved and byte-protected; owned builder fields expose only this variant', () => {
  const { originalInvitationAsset } = require('../src/lib/invitation-assets.ts');
  const lock = JSON.parse(read('scripts/original-distribution-lock.json')).resources;
  const roles = ['embrace', 'ceremony', 'reception', 'couple', 'dinner', 'party', 'cake', 'farewell', 'camera', 'music', 'adults', 'gift', 'envelopes', 'dress'];
  assert.deepEqual(Object.keys(VESPERA_ORIGINALS).sort(), [...roles].sort());
  for (const role of roles) {
    const asset = VESPERA_ORIGINALS[role]; assert.match(asset.source, /^https:\/\/invitali\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/.+\.json$/);
    assert.equal(originalInvitationAsset(asset.source), asset.localPath); const row = lock.find(item => item.path === asset.localPath); assert.ok(row, role);
    const bytes = fs.readFileSync(path.join(root, 'public', asset.localPath)); assert.equal(sha(bytes), row.sha256); assert.equal(bytes.length, row.bytes);
    const json = JSON.parse(bytes); assert.ok(Array.isArray(json.layers)); assert.ok(json.op > json.ip);
  }
  const Fields = require('../src/components/admin/builder/panels/TemplateContentFields.tsx').default;
  const fields = renderToStaticMarkup(React.createElement(Fields, { data: vesperaDemo(), onChange: () => {} }));
  for (const name of ['vespera-welcomeTitle', 'vespera-storyMessage', 'vespera-vesperaDetail', 'vespera-vesperaCelebration', 'vespera-giftRegistryUrl']) assert.ok(fields.includes(`name="${name}"`), name);
  assert.doesNotMatch(fields, /name="(?:capitulo|travesia)-/);
});
