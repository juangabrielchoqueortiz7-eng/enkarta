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

test('all 13 catalogue entries use the same names, dates, image and native layout as creation', () => {
  const catalog = collectionCatalog();
  assert.equal(catalog.length, 13);
  for (const card of catalog) {
    const starter = invitationStarter(card.key);
    const demo = invitationDemo(card.key);
    assert.equal(card.names, starter.names);
    assert.equal(card.date, starter.event_date);
    assert.equal(card.image, starter.cover_image_url);
    assert.equal(demo.config.layout.presetKey, card.key);
    assert.equal(starter.builder_config.designMode, 'guided');
    assert.equal(starter.builder_config.tokens.visualProfile, card.key === 'marfil-vivo' ? 'marfil-v1' : 'collection-v1');
    assert.deepEqual(demo.config.layout.blocks.map(b => b.type), starter.builder_config.layout.blocks.map(b => b.type));
    assert.deepEqual(validateInvitationBuilder(demo).errors, [], card.key);
    assert.ok(card.demoPath.startsWith('/muestra/'));
  }
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
    const demo = invitationDemo(key);
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
