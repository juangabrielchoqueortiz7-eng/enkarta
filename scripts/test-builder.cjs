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
require.extensions['.ts'] = (module, file) => {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: file,
  }).outputText;
  module._compile(output, file);
};

const { marfilVivoStarter, marfilVivoDemo } = require('../src/lib/marfil-vivo.ts');
const { invitationStarter, STARTER_TEMPLATE_KEYS } = require('../src/lib/template-starters.ts');
const { resolveLayoutBindings, resolveBlockEditorProps, detachBinding } = require('../src/lib/block-bindings.ts');
const { parseInvitation } = require('../src/lib/types.ts');
const { captionsForImages, reorderGalleryCaptions } = require('../src/lib/gallery.ts');
const { collectPublicationResources, publicationMetrics, resourceBudgetBytes } = require('../src/lib/publication-audit.ts');
const { probeLocalPublicAsset } = require('../src/lib/public-assets.ts');
const { validateInvitationBuilder } = require('../src/lib/builder-validation.ts');
const { publicTemplateName } = require('../src/lib/enkarta-collections.ts');

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
  data.config.layout.blocks.push({ id: 'gif', type: 'video', props: { url: 'https://example.com/motion.gif?v=2' } });
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
