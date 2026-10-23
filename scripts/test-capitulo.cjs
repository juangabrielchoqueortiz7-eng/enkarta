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
  Object.assign(data, { names: '', event_date: null, parents_bride: [], parents_groom: [], sponsors: [], itinerary: [], dress_code: null, no_kids: false, gift_message: null, bank_account: null });
  data.config = { ...data.config, city: '', introMessage: '', welcomeTitle: '', verse: '', verseRef: '', galleryMessage: '', galleryImages: [], galleryCaptions: [], rsvpMessage: '', storyTitle: '', storyMessage: '', sectionImages: { ...data.config.sectionImages, capituloDetail: '', capituloCelebration: '' } };
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

test('Capitulo reuses the exact archived JSON by full source URL, with matching original and distribution bytes', () => {
  const { CAPITULO_ORIGINALS } = require('../src/lib/capitulo-assets.ts');
  const { originalInvitationAsset } = require('../src/lib/invitation-assets.ts');
  const manifest = JSON.parse(read('docs/assets/capitulo-originals.json'));
  assert.equal(manifest.variant, CAPITULO_KEY);
  const optionalManifest = file => fs.existsSync(path.join(root, file)) ? JSON.parse(read(file)) : null;
  const archive = optionalManifest('Iconos INVITALI/manifest.json');
  const distributed = optionalManifest('public/invitali-originales.json');
  const locked = JSON.parse(read('scripts/original-distribution-lock.json')).resources;
  for (const role of ['bride', 'groom', 'ceremony', 'reception', 'firstDance', 'dinner', 'dance', 'farewell', 'suit', 'dress', 'location', 'adults', 'gift']) {
    const resource = CAPITULO_ORIGINALS[role]; assert.ok(resource, `Original available for ${role}`);
    const documented = manifest.originals[role]; assert.ok(documented, `Versioned provenance: ${role}`);
    assert.equal(documented.source, resource.source); assert.equal(documented.localPath, resource.localPath);
    assert.match(documented.sha256, /^[a-f0-9]{64}$/); assert.ok(Number.isSafeInteger(documented.bytes) && documented.bytes > 0);
    assert.match(resource.source, /^https:\/\/invitali\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/.+\.json$/);
    assert.equal(originalInvitationAsset(resource.source), resource.localPath, `Full source URL resolves locally for ${role}`);
    assert.equal(typeof resource.reverse, 'boolean');
    const source = archive?.find(asset => asset.url === resource.source);
    const distribution = distributed?.find(asset => asset.url === resource.source);
    const protection = locked.find(asset => asset.path === resource.localPath);
    assert.ok(protection, `Protected original: ${role}`);
    const publicBytes = fs.readFileSync(path.join(root, 'public', resource.localPath));
    // This original predates the importer and is recorded explicitly in the
    // shared source registry. Its immutable distribution is protected by SHA.
    if (role === 'adults') {
      assert.equal(resource.source, 'https://invitali.com/wp-content/uploads/2025/05/10-no-ninos.json');
      assert.equal(resource.localPath, '/lottie/boda/invitali-sin-ninos-original.json');
    } else {
      if (archive) assert.ok(source, `Full local archive includes ${role}`);
      if (distributed) assert.ok(distribution, `Full local distribution manifest includes ${role}`);
    }
    if (source) assert.equal(source.localPath, resource.localPath);
    if (distribution) assert.equal(distribution.localPath, resource.localPath);
    assert.ok(typeof documented.archiveFile === 'string' && documented.archiveFile, `Original archive path: ${role}`);
    const masterFile = path.join(root, documented.archiveFile);
    if (['bride', 'groom', 'location'].includes(role)) assert.ok(fs.existsSync(masterFile), `New original is committed: ${role}`);
    if (fs.existsSync(masterFile)) assert.deepEqual(publicBytes, fs.readFileSync(masterFile), `No rewritten JSON for ${role}`);
    if (source?.archiveFile && fs.existsSync(path.join(root, source.archiveFile))) {
      assert.deepEqual(publicBytes, fs.readFileSync(path.join(root, source.archiveFile)), `Full local archive bytes: ${role}`);
    }
    for (const expected of [documented, source, distribution, protection].filter(Boolean)) {
      assert.equal(publicBytes.length, expected.bytes, `Original size: ${role}`);
      assert.equal(sha(publicBytes), expected.sha256, `Original hash: ${role}`);
    }
    const json = JSON.parse(publicBytes); assert.ok(Array.isArray(json.layers)); assert.ok(json.op > json.ip);
  }
});

test('the demo has six editable itinerary rows with original icons and its three own gallery photographs', () => {
  const data = capituloDemo(), before = structuredClone(data);
  assert.equal(data.itinerary.length, 6);
  for (const item of data.itinerary) {
    assert.ok(item.label && item.time); assert.match(item.icon, /^\/lottie\/.+\.json$/);
  }
  assert.deepEqual(data.config.galleryImages, Object.values(CAPITULO_ASSETS));
  const html = markup(data);
  const rows = html.match(/<li\b[^>]*data-capitulo-itinerary-item[^>]*>[\s\S]*?<\/li>/g) ?? [];
  assert.equal(rows.length, 6);
  rows.forEach((row, index) => { assert.ok(row.includes(data.itinerary[index].label)); assert.ok(row.includes(data.itinerary[index].icon)); });
  for (const section of ['itinerary', 'gallery', 'venues']) assert.ok(html.includes(`data-capitulo-section="${section}"`), section);
  assert.deepEqual(data, before, 'Rendering cannot rewrite the editable source lists');
});

test('itinerary edits, reordered rows and explicitly removed icons survive persistence without restoring samples', () => {
  const data = capituloDemo();
  data.itinerary = [
    { time: '21:15', label: 'QA cena editada', icon: '/lottie/qa-custom-dinner.json', iconColors: { '#000000': '#15607a' }, iconSpeed: 1.75 },
    { time: '16:10', label: 'QA sin icono', icon: '' },
  ];
  const saved = parseInvitation({ ...data, itinerary: JSON.stringify(data.itinerary), builder_config: JSON.stringify(data.config) });
  assert.deepEqual(saved.itinerary, data.itinerary);
  const html = markup(saved), rows = html.match(/<li\b[^>]*data-capitulo-itinerary-item[^>]*>[\s\S]*?<\/li>/g) ?? [];
  assert.equal(rows.length, 2); assert.ok(rows[0].includes('QA cena editada')); assert.ok(rows[0].includes('/lottie/qa-custom-dinner.json'));
  assert.ok(rows[1].includes('QA sin icono')); assert.doesNotMatch(rows[1], /data-capitulo-original-icon=/);
  data.itinerary = []; data.dress_code = null;
  assert.doesNotMatch(markup(data), /data-capitulo-section="itinerary"/);
});

test('the editorial gallery keeps URL-associated captions, respects photo limits and never restores a cleared list', () => {
  const data = capituloDemo();
  const images = ['/invitations/qa-third.webp', '/invitations/qa-first.webp', '/invitations/qa-second.webp'];
  data.config = { ...data.config, galleryImages: images, galleryCaptions: [
    { image: images[1], title: 'QA título primera', caption: 'QA pie primera', alt: 'QA descripción primera' },
    { image: images[0], title: 'QA título tercera', caption: 'QA pie tercera', alt: 'QA descripción tercera' },
  ], features: { ...data.config.features, galleryMax: 1 } };
  const html = markup(data), gallery = html.match(/<section\b[^>]*data-capitulo-section="gallery"[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(gallery); assert.ok(gallery.includes(images[0])); assert.equal(gallery.includes(images[1]), false); assert.equal(gallery.includes(images[2]), false);
  for (const expected of ['QA título tercera', 'QA pie tercera', 'QA descripción tercera']) assert.ok(gallery.includes(expected), expected);
  assert.equal(gallery.includes('QA título primera'), false, 'Captions cannot move to a different photograph');
  data.config.galleryImages = [];
  assert.doesNotMatch(markup(data), /data-capitulo-section="gallery"/);
  data.config.galleryImages = images; data.config.features.galleryMax = 0;
  assert.doesNotMatch(markup(data), /data-capitulo-section="gallery"/);
  data.config.features.galleryMax = 99; data.config.package = 'plus'; data.config.serviceContract = { version: 2, adoptedAt: '2026-10-23T00:00:00Z', extras: [] };
  assert.doesNotMatch(markup(data), /data-capitulo-section="gallery"/, 'A content toggle cannot unlock photos outside the contracted package');
});
