// Focused behavior and provenance checks for the independent Albor invitation.
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
const { ALBOR_KEY, ALBOR_ASSETS, alborStarter, alborDemo, alborDate, alborNames } = require('../src/lib/albor.ts');
const { ALBOR_ORIGINALS, ALBOR_ENTRY_ASSETS, ALBOR_MUSIC } = require('../src/lib/albor-assets.ts');
const { default: Invitation, AlborEntry: Entry, AlborRsvpProvider: RsvpProvider } = require('../src/components/invitations/Albor.tsx');
const { invitationDemo, STARTER_TEMPLATE_KEYS } = require('../src/lib/template-starters.ts');
const { STARTER_DESIGNS, publicTemplateName } = require('../src/lib/enkarta-collections.ts');
const { parseInvitation } = require('../src/lib/types.ts');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const markup = (data = alborDemo(), props = {}) => renderToStaticMarkup(React.createElement(Invitation, { data, demo: true, skipEntry: true, ...props }));
const section = (html, key) => html.match(new RegExp(`<section\\b[^>]*data-albor-section="${key}"[^>]*>[\\s\\S]*?<\\/section>`))?.[0];

test('public sample query flags preserve static preview and never manufacture personalized guests', async () => {
  const { default: Page, metadata } = require('../src/app/muestra/albor/page.tsx');
  assert.equal(metadata.robots.index, false);
  for (const [query, skipEntry, preview] of [[{}, false, false], [{ full: '1' }, true, false], [{ preview: '1' }, true, true], [{ full: '0', preview: '0', n: '99', m: 'QA familia inventada' }, false, false]]) {
    const el = await Page({ searchParams: Promise.resolve(query) });
    assert.equal(el.props.demo, true); assert.equal(el.props.skipEntry, skipEntry); assert.equal(el.props.preview, preview);
    assert.equal(el.props.data.config.activeGuest, undefined); assert.equal(el.props.data.names, 'Elena & Tomás');
    assert.equal(el.props.data.guest_passes, 2, 'Untrusted parameters cannot assign extra guest passes');
  }
});

test('Albor is an independent draft and does not replace Terracota or alter its available starter designs', () => {
  const legacy = structuredClone(invitationDemo('euforia')), keys = [...STARTER_TEMPLATE_KEYS], first = alborStarter(), second = alborStarter();
  assert.equal(ALBOR_KEY, 'albor'); assert.equal(first.template, 'euforia'); assert.equal(first.status, 'draft');
  assert.equal(first.builder_config.designKey, ALBOR_KEY); assert.equal(STARTER_TEMPLATE_KEYS.includes(ALBOR_KEY), false);
  assert.equal(STARTER_DESIGNS.some(design => design.key === ALBOR_KEY), false);
  assert.equal(publicTemplateName('euforia'), 'Terracota'); assert.equal(publicTemplateName('euforia', ALBOR_KEY), 'Albor');
  first.names = 'QA pareja distinta'; first.builder_config.city = 'QA ciudad'; assert.notEqual(second.names, first.names); assert.notEqual(second.builder_config.city, first.builder_config.city);
  const unchanged = invitationDemo('euforia'); unchanged.created_at = legacy.created_at;
  assert.deepEqual(unchanged, legacy); assert.deepEqual(STARTER_TEMPLATE_KEYS, keys);
});

test('dates and names remain derived from editable content and impossible dates stay absent', () => {
  assert.deepEqual(alborNames('QA Ana y QA Luis'), { first: 'QA Ana', second: 'QA Luis' });
  assert.deepEqual(alborNames(''), { first: '', second: '' });
  assert.equal(alborDate('2028-02-29').day, '29'); assert.equal(alborDate('2027-06-19').year, '2027');
  for (const invalid of [null, '', '2027-02-29', '2028-13-01', '2027-06-31', 'not-a-date']) assert.equal(alborDate(invalid), null);
  const data = alborDemo(); data.event_date = '2027-10-23';
  assert.match(markup(data), /dates=20271023\/20271024(?:&amp;|&)/, 'All-day calendar end is the next day, exclusively');
  data.event_date = '2028-02-29';
  assert.match(markup(data), /dates=20280229\/20280301(?:&amp;|&)/, 'UTC calendar arithmetic crosses leap day into March');
});

test('the prominent event date keeps its accessible complete date, edited clock and city without inventing missing values', () => {
  const data = alborDemo();
  data.event_date = '2028-04-22'; data.ceremony_time = '18:45'; data.config = { ...data.config, city: 'QA <Ciudad>' };
  let html = markup(data), date = section(html, 'date'); assert.ok(date);
  const eventTime = date.match(/<time\b[^>]*data-albor-event-date\b[^>]*>[\s\S]*?<\/time>/)?.[0];
  assert.ok(eventTime, 'The visual date remains a semantic time element');
  assert.match(eventTime, /\bdatetime="2028-04-22"/i);
  assert.match(eventTime, /aria-label="[^"]*SÁBADO[^"]*22 de abril de 2028[^"]*18:45/i);
  assert.match(eventTime, /data-albor-date-weekday\b[^>]*>SÁBADO</);
  assert.match(eventTime, /data-albor-date-day\b[^>]*>22</);
  assert.match(eventTime, /data-albor-date-clock\b[^>]*>18:45 h</);
  const month = date.match(/<span\b[^>]*data-albor-date-month\b[^>]*>([\s\S]*?)<\/span>/)?.[1];
  assert.ok(month && /ABRIL/i.test(month) && /2028/.test(month), 'The month and year stay visible below the date');
  assert.ok(date.includes('QA &lt;Ciudad&gt;')); assert.doesNotMatch(date, /<Ciudad>/);
  assert.match(date, /dates=20280422\/20280423(?:&amp;|&)/);

  for (const missingClock of [null, '', '25:90']) {
    data.ceremony_time = missingClock; date = section(markup(data), 'date');
    assert.ok(date); assert.doesNotMatch(date, /data-albor-date-clock\b|18:45|25:90/);
    assert.match(date, /data-albor-date-day\b[^>]*>22</);
  }
  data.event_date = '2028-02-29'; data.ceremony_time = null;
  date = section(markup(data), 'date');
  assert.match(date, /data-albor-date-weekday\b[^>]*>MARTES</);
  assert.match(date, /data-albor-date-day\b[^>]*>29</);
  assert.match(date, /dates=20280229\/20280301(?:&amp;|&)/);
  for (const invalidDate of [null, '', '2027-02-29', 'not-a-date']) {
    data.event_date = invalidDate; html = markup(data);
    assert.equal(section(html, 'date'), undefined);
    assert.doesNotMatch(html, /data-albor-event-date\b|data-albor-date-(?:weekday|day|month|clock)\b/);
  }
});

test('the itinerary keeps edited order, escaped details and per-item original icon settings when its layout changes', () => {
  const data = alborDemo();
  const colors = { '#000000': '#15607a' };
  data.itinerary = [
    { time: '21:15', label: 'QA cena <especial>', place: 'QA jardín & salón', note: '<script>QA nota</script>', duration: '45 minutos', icon: '/lottie/qa-custom-dinner.json', iconColors: colors, iconSpeed: 1.75 },
    { time: '99:99', label: 'QA segundo momento', icon: '' },
  ];
  const before = structuredClone(data), icons = [], iconModule = require('../src/components/invitations/AlborOriginalIcon.tsx'), OriginalIcon = iconModule.default;
  iconModule.default = props => { icons.push(props); return props.src === '' ? null : React.createElement('span', { 'data-qa-icon-source': props.src }); };
  try {
    const html = markup(data), itinerary = section(html, 'itinerary'); assert.ok(itinerary);
    assert.match(itinerary, /<h2\b[^>]*>Itinerario<\/h2>/);
    const rows = itinerary.match(/<li\b[^>]*data-albor-itinerary-item[^>]*>[\s\S]*?<\/li>/g) ?? [];
    assert.equal(rows.length, 2); assert.ok(rows[0].includes('QA cena &lt;especial&gt;')); assert.ok(rows[1].includes('QA segundo momento'));
    for (const value of ['21:15 h', 'QA jardín &amp; salón', '&lt;script&gt;QA nota&lt;/script&gt;', '45 minutos']) assert.ok(rows[0].includes(value), value);
    assert.doesNotMatch(itinerary, /<script\b|99:99|16:00 h|Nuestra ceremonia/);
    assert.doesNotMatch(rows[1], /<time\b|data-qa-icon-source/);
    const first = icons.filter(icon => icon.sectionKey === 'itinerary-0'); assert.equal(first.length, 1);
    assert.equal(first[0].src, data.itinerary[0].icon); assert.deepEqual(first[0].colors, colors); assert.equal(first[0].speed, 1.75); assert.equal(first[0].active, true);
    icons.length = 0; markup(data, { preview: true });
    assert.equal(icons.find(icon => icon.sectionKey === 'itinerary-0')?.active, false, 'The embedded builder preview cannot start original animations');
    assert.deepEqual(data, before, 'Responsive presentation cannot rewrite saved itinerary data');
  } finally { iconModule.default = OriginalIcon; }
});

test('the header wave remains decorative and accompanies only the selected photograph', () => {
  const data = alborDemo(); let html = markup(data);
  const header = html.match(/<header\b[^>]*data-albor-section="hero"[^>]*>[\s\S]*?<\/header>/)?.[0]; assert.ok(header);
  const wave = header.match(/<svg\b[^>]*data-albor-hero-wave\b[^>]*>[\s\S]*?<\/svg>/)?.[0]; assert.ok(wave);
  assert.match(wave, /aria-hidden="true"/); assert.equal((wave.match(/<path\b/g) ?? []).length, 3);
  assert.ok(header.includes(ALBOR_ASSETS.hero));
  assert.equal((html.match(/<img\b[^>]*data-albor-photo\b/g) ?? []).length, 3, 'The decorative separator adds no replacement photograph');
  data.cover_image_url = '/invitations/qa-edited-cover.webp'; html = markup(data);
  assert.ok(html.includes(data.cover_image_url)); assert.match(html, /data-albor-hero-wave\b/);
  data.cover_image_url = ''; html = markup(data);
  assert.doesNotMatch(html, /data-albor-hero-wave\b/);
  assert.equal((html.match(/<img\b[^>]*data-albor-photo\b/g) ?? []).length, 2, 'Clearing the cover retains the other two original generated photographs');
});

test('edited and cleared names, copy, pictures and optional lists survive persistence without restoring samples', () => {
  const data = alborDemo(); data.names = 'QA Ana & QA Luis'; data.config = { ...data.config, city: 'QA ciudad', welcomeTitle: 'QA invitación editable', introMessage: '' };
  const saved = parseInvitation({ ...data, builder_config: JSON.stringify(data.config) });
  assert.equal(saved.config.designKey, ALBOR_KEY); assert.equal(saved.config.introMessage, '');
  const html = markup(saved); for (const text of ['QA Ana', 'QA Luis', 'QA ciudad', 'QA invitación editable']) assert.ok(html.includes(text), text);
  const empty = alborDemo(), initial = alborDemo();
  Object.assign(empty, { names: '', event_date: null, parents_bride: [], parents_groom: [], sponsors: [], itinerary: [], dress_code: null, no_kids: false, gift_message: null, bank_account: null });
  empty.config = { ...empty.config, city: '', welcomeTitle: '', introMessage: '', storyTitle: '', storyMessage: '', verse: '', verseRef: '', galleryImages: [], galleryCaptions: [], galleryMessage: '', rsvpMessage: '', sectionImages: { ...empty.config.sectionImages, alborDetail: '', alborCelebration: '' } };
  const cleared = markup(empty);
  for (const value of [...Object.values(alborNames(initial.names)), initial.config.city]) if (value) assert.equal(cleared.includes(value), false, value);
  assert.doesNotMatch(cleared, /data-albor-section="(?:parents|itinerary|adults|gallery)"/);
  assert.equal(cleared.includes(ALBOR_ASSETS.detail), false); assert.equal(cleared.includes(ALBOR_ASSETS.celebration), false);
});

test('the demo renders its new photographs and original itinerary without foreign forms, bank data or transactions', () => {
  const data = alborDemo(), before = structuredClone(data), html = markup(data);
  for (const asset of Object.values(ALBOR_ASSETS)) { assert.match(asset, /^\/invitations\/albor\/.+\.webp$/); assert.ok(html.includes(asset), asset); }
  const photos = html.match(/<img\b[^>]*(?:data-albor-photo|class="heroPhoto")[^>]*>/g) ?? []; assert.equal(photos.length, 3);
  assert.equal(data.itinerary.length, 7, 'The complete celebration has seven editable moments');
  for (const item of data.itinerary) { assert.ok(item.time && item.label); assert.match(item.icon, /^\/lottie\/.+\.json$/); assert.ok(html.includes(item.label), item.label); }
  assert.equal(data.bank_account, null); assert.equal(data.phone_whatsapp, null);
  assert.doesNotMatch(html, /<form\b|<iframe\b|forms\.gle|docs\.google\.com\/forms|action="https?:|wa\.me\/\d|BANCOLOMBIA|4432324355|652342346667/i);
  assert.match(html, /Confirmar/i); assert.deepEqual(data, before, 'Rendering cannot rewrite the stored invitation');
});

test('the native entry keeps an editable action and authentic original paper and wax seal, while preview exposes the interior', () => {
  const data = alborDemo(), html = renderToStaticMarkup(React.createElement(Entry, { data, label: 'QA abrir mi invitación' }, React.createElement('h1', null, 'QA contenido protegido')));
  assert.match(html, /role="dialog"/); assert.match(html, /aria-modal="true"/); assert.ok(html.includes('QA abrir mi invitación'));
  assert.match(html, /aria-hidden="true"[^>]*><h1>QA contenido protegido/);
  assert.doesNotMatch(markup(data, { preview: true, skipEntry: false }), /role="dialog"/);
  const lock = JSON.parse(read('scripts/original-distribution-lock.json')).resources;
  for (const asset of Object.values(ALBOR_ENTRY_ASSETS)) {
    assert.ok(html.includes(asset), `Archived entry art is rendered: ${asset}`);
    const row = lock.find(value => value.path === asset); assert.ok(row, asset);
    const bytes = fs.readFileSync(path.join(root, 'public', asset)); assert.equal(sha(bytes), row.sha256); assert.equal(bytes.length, row.bytes);
  }
});

test('the clean envelope and original ring accompany a separate Euforia background layer without invented side leaves or family overlays', () => {
  const postcss = require('postcss'), css = postcss.parse(read('src/components/invitations/Albor.module.css'));
  const canonical = selector => selector.replace(/\s+/g, '');
  const declarations = (selector, accepts = () => true) => {
    const values = {};
    css.walkRules(rule => {
      if (!accepts(rule) || !rule.selectors?.some(value => canonical(value) === selector)) return;
      rule.walkDecls(declaration => {
        values[declaration.prop] = declaration.value;
        if (declaration.prop === 'background') {
          values['background-image'] = /url\(|gradient\(|var\(--ab-(?:ring|leaves)/i.test(declaration.value) ? declaration.value : 'none';
          values['background-color'] = /^(?:none|transparent|initial|unset)$/.test(declaration.value) ? 'transparent' : declaration.value;
        }
      });
    });
    return values;
  };
  const entry = renderToStaticMarkup(React.createElement(Entry, { data: alborDemo() }, React.createElement('h1', null, 'QA interior')));
  const identity = entry.match(/<div\b[^>]*class="entryIdentity"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  assert.ok(identity && identity.includes('Elena') && identity.includes('Tomás') && identity.includes(alborDate(alborDemo().event_date).entryLine));
  assert.doesNotMatch(identity, /<img\b|class="heroWreath"/, 'The envelope identity has names and date, without the interior floral ring');
  const identityStyle = declarations('.entryIdentity');
  for (const property of ['background', 'background-image']) assert.doesNotMatch(identityStyle[property] || '', /url\(|gradient\(|var\(--ab-ring/i, 'The envelope remains clean');
  const html = markup();
  assert.match(html, /class="heroWreath"/);
  assert.match(declarations('.heroWreath')['background-image'] || '', /var\(--ab-ring\)/, 'The original ring remains on the interior header');

  const poster = JSON.parse(read('docs/assets/albor-originals.json')).media.bodyLeaves;
  assert.equal(poster.url, 'https://invitali.com/wp-content/uploads/2024/09/jairo-y-GabrielaRecurso-47cuerpo-1-copia.webp');
  assert.equal(poster.sha256, 'b1650a27e371642f625fd6f26b9fd051caad15354f4e160fbb1fdb0c59dfc6ab');
  assert.ok(html.includes(poster.localPath), 'The instance points to the exact original whole poster');
  const lock = JSON.parse(read('scripts/original-distribution-lock.json')).resources.find(resource => resource.path === poster.localPath);
  assert.ok(lock); assert.equal(lock.sha256, poster.sha256);
  const bytes = fs.readFileSync(path.join(root, 'public', poster.localPath));
  assert.equal(sha(bytes), poster.sha256); assert.equal(bytes.length, lock.bytes);
  const frame = declarations('.background', rule => rule.parent.type === 'root'), layer = declarations('.backgroundLayer', rule => rule.parent.type === 'root');
  assert.equal(frame.position, 'fixed'); assert.equal(frame['pointer-events'], 'none');
  assert.equal(layer['background-image'], 'var(--ab-leaves)');
  assert.equal(layer['background-size'], 'cover');
  assert.match(layer['background-position'], /^0(?:px|%)?\s+0(?:px|%)?$/);
  assert.equal(layer['background-repeat'], 'repeat-y', 'The complete tall watercolor repeats, rather than a substituted foliage motif');
  assert.equal(layer['pointer-events'], 'none'); assert.equal(layer.height, '100%', 'Static preferences retain a viewport-sized poster');
  assert.equal(declarations('.backgroundLayer[data-albor-background-motion=active]', rule => rule.parent.type === 'root').height, '149%', 'The active source scroll effect owns its additional coverage');
  assert.match(html, /data-albor-background\b[^>]*aria-hidden="true"/);
  assert.match(html, /data-albor-background-layer/);
  let mobileContainsPoster = false;
  css.walkAtRules('media', atRule => {
    if (!/max-width/.test(atRule.params)) return;
    atRule.walkRules(rule => {
      if (!rule.selectors?.some(selector => canonical(selector) === '.backgroundLayer')) return;
      rule.walkDecls('background-size', declaration => { if (declaration.value === 'contain') mobileContainsPoster = true; });
    });
  });
  assert.equal(mobileContainsPoster, true, 'Narrow public viewports preserve the original contain treatment');
  assert.equal(declarations('.shell[data-preview].background').position, 'absolute', 'The editor paints within its own canvas');
  assert.equal(declarations('.shell[data-preview].backgroundLayer')['background-size'], '100% auto');
  assert.doesNotMatch(css.toString(), /--ab-side-|48cuerpo/i, 'The invented side pattern must not return');
  css.walkRules(rule => {
    for (const selector of rule.selectors || []) assert.doesNotMatch(canonical(selector), /^\.(?:page|parents)::?(?:before|after)$/, 'No mirrored botanical or sage overlay layers remain');
  });
  for (const selector of ['.page', '.parents', '.hero', '.background', '.backgroundLayer']) {
    const values = declarations(selector);
    for (const property of ['filter', 'mix-blend-mode', 'mask-image', '-webkit-mask-image', 'mask', '-webkit-mask']) assert.ok(!values[property] || values[property] === 'none' || values[property] === 'normal', selector + ' preserves the poster without color or alpha effects');
    assert.ok(!values.opacity || Number(values.opacity) === 1);
    if (!['.backgroundLayer'].includes(selector)) {
      assert.ok(!values['background-image'] || values['background-image'] === 'none');
      assert.ok(!values['background-color'] || values['background-color'] === 'transparent', selector + ' lets the original poster show without a new tinted band');
    }
  }
  const portrait = declarations('.portraitimg');
  assert.ok(!portrait['box-shadow'] || portrait['box-shadow'] === 'none', 'The photograph receives no added decorative shadow');
});

test('only the server-supplied RSVP is rendered and an unverified visitor cannot receive a fabricated form', () => {
  const html = renderToStaticMarkup(React.createElement(RsvpProvider, { form: React.createElement('form', { 'data-qa-authorized-rsvp': 'true' }, 'QA formulario autorizado') }, React.createElement(Invitation, { data: alborDemo(), demo: false, skipEntry: true })));
  assert.equal((html.match(/data-qa-authorized-rsvp="true"/g) ?? []).length, 1); assert.equal((html.match(/<form\b/g) ?? []).length, 1);
  assert.doesNotMatch(markup(alborDemo(), { demo: false }), /<form\b|forms\.gle|docs\.google\.com\/forms/);
});

test('the archived selected track never autoplays; clearing it and silent builder preview remain silent', () => {
  const data = alborDemo(); assert.equal(data.config.musicUrl, ALBOR_MUSIC.localPath);
  const row = JSON.parse(read('scripts/original-distribution-lock.json')).resources.find(asset => asset.path === data.config.musicUrl); assert.ok(row);
  const bytes = fs.readFileSync(path.join(root, 'public', data.config.musicUrl)); assert.equal(sha(bytes), row.sha256); assert.equal(bytes.length, row.bytes);
  const html = markup(data); assert.equal((html.match(/<audio\b/g) ?? []).length, 1); assert.doesNotMatch(html, /\bautoPlay=|\bautoplay=/i); assert.match(html, /preload="none"/);
  data.config.musicUrl = ''; const saved = parseInvitation({ ...data, builder_config: JSON.stringify(data.config) });
  assert.equal(saved.config.musicUrl, ''); assert.doesNotMatch(markup(saved), /<audio\b/);
  assert.doesNotMatch(markup(alborDemo(), { preview: true }), /<audio\b/);
});

test('gallery captions stay with their image and gallery limits, reordered itinerary and cleared icons remain authoritative', () => {
  const data = alborDemo(), images = ['/invitations/qa-third.webp', '/invitations/qa-first.webp'];
  data.config = { ...data.config, galleryImages: images, galleryCaptions: [{ image: images[1], title: 'QA primera', caption: 'QA pie primera' }, { image: images[0], title: 'QA tercera', caption: 'QA pie tercera', alt: 'QA descripción tercera' }], features: { ...data.config.features, galleryMax: 1 } };
  let html = markup(data), gallery = section(html, 'gallery'); assert.ok(gallery);
  for (const value of [images[0], 'QA tercera', 'QA pie tercera', 'QA descripción tercera']) assert.ok(gallery.includes(value), value);
  assert.equal(gallery.includes(images[1]), false); assert.equal(gallery.includes('QA primera'), false);
  data.config.galleryImages = []; assert.equal(section(markup(data), 'gallery'), undefined);
  data.config.galleryImages = images; data.config.features.galleryMax = 0; assert.equal(section(markup(data), 'gallery'), undefined);
  data.itinerary = [{ time: '21:15', label: 'QA cena editada', icon: '/lottie/qa-custom-dinner.json', iconColors: { '#000000': '#15607a' }, iconSpeed: 1.75 }, { time: '16:10', label: 'QA sin icono', icon: '' }];
  const saved = parseInvitation({ ...data, itinerary: JSON.stringify(data.itinerary), builder_config: JSON.stringify(data.config) }); assert.deepEqual(saved.itinerary, data.itinerary);
  html = markup(saved); const rows = html.match(/<li\b[^>]*data-albor-itinerary-item[^>]*>[\s\S]*?<\/li>/g) ?? [];
  assert.equal(rows.length, 2); assert.ok(rows[0].includes('QA cena editada')); assert.ok(rows[0].includes('/lottie/qa-custom-dinner.json'));
  assert.ok(rows[1].includes('QA sin icono')); assert.doesNotMatch(rows[1], /data-albor-original-icon=/);
});

test('three new generated masters and WebP distributions have explicit prompts, distinct hashes and valid dimensions', async () => {
  const manifest = JSON.parse(read('docs/assets/albor-images.json')); assert.equal(manifest.variant, ALBOR_KEY); assert.equal(manifest.synthetic, true); assert.equal(manifest.assets.length, 3);
  const byPath = new Map(manifest.assets.map(asset => [asset.distribution?.path, asset])); assert.equal(byPath.size, 3);
  const earlier = ['capitulo', 'travesia', 'serenata', 'vespera', 'opera'].flatMap(key => JSON.parse(read(`docs/assets/${key}-images.json`)).assets).flatMap(asset => [asset.generatedMaster.sha256, asset.distribution.sha256]);
  const sharp = require('sharp');
  for (const local of Object.values(ALBOR_ASSETS)) {
    const asset = byPath.get(local); assert.ok(asset, local); assert.equal(asset.source, 'OpenAI image_gen built-in'); assert.ok(asset.prompt.trim().length > 50);
    assert.notEqual(asset.referenceImageUsed, true, 'The new scene is not an edited original photograph');
    assert.equal(earlier.includes(asset.generatedMaster.sha256), false); assert.equal(earlier.includes(asset.distribution.sha256), false);
    const masterFile = path.resolve(root, asset.generatedMaster.file); assert.match(asset.generatedMaster.file.replaceAll('\\', '/'), /^assets\/generated\/albor\//);
    if (fs.existsSync(masterFile)) { const bytes = fs.readFileSync(masterFile); assert.equal(sha(bytes), asset.generatedMaster.sha256); assert.equal(bytes.length, asset.generatedMaster.bytes); } else assert.ok(process.env.CI);
    const bytes = fs.readFileSync(path.join(root, 'public', local)); assert.equal(sha(bytes), asset.distribution.sha256); assert.equal(bytes.length, asset.distribution.bytes);
    const metadata = await sharp(bytes).metadata(); assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, asset.distribution.width); assert.equal(metadata.height, asset.distribution.height); assert.ok(metadata.width >= 600 && metadata.height >= 600);
  }
});

test('all sixteen exact JSON sources are locally resolved and byte-protected; April intro stays distinct and owned fields expose only this variant', () => {
  const { originalInvitationAsset } = require('../src/lib/invitation-assets.ts');
  const lock = JSON.parse(read('scripts/original-distribution-lock.json')).resources;
  const roles = ['music', 'intro', 'ceremony', 'reception', 'jacket', 'dress', 'firstDance', 'toast', 'dinner', 'party', 'cake', 'farewell', 'adults', 'camera', 'gift', 'bird'];
  assert.deepEqual(Object.keys(ALBOR_ORIGINALS).sort(), [...roles].sort());
  for (const role of roles) {
    const asset = ALBOR_ORIGINALS[role]; assert.match(asset.source, /^https:\/\/invitali\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/.+\.json$/);
    assert.equal(originalInvitationAsset(asset.source), asset.localPath); const row = lock.find(item => item.path === asset.localPath); assert.ok(row, role);
    const bytes = fs.readFileSync(path.join(root, 'public', asset.localPath)); assert.equal(sha(bytes), row.sha256); assert.equal(bytes.length, row.bytes);
    const json = JSON.parse(bytes); assert.ok(Array.isArray(json.layers)); assert.ok(json.op > json.ip);
  }
  assert.equal(ALBOR_ORIGINALS.intro.source, 'https://invitali.com/wp-content/uploads/2024/04/Animation-1714111678127.json');
  const mayHeart = originalInvitationAsset('https://invitali.com/wp-content/uploads/2024/05/Animation-1715978306775.json');
  assert.notEqual(ALBOR_ORIGINALS.intro.localPath, mayHeart, 'The April intro cannot be substituted by the distinct May hearts');
  assert.notEqual(sha(fs.readFileSync(path.join(root, 'public', ALBOR_ORIGINALS.intro.localPath))), sha(fs.readFileSync(path.join(root, 'public', mayHeart))));
  const Fields = require('../src/components/admin/builder/panels/TemplateContentFields.tsx').default;
  const fields = renderToStaticMarkup(React.createElement(Fields, { data: alborDemo(), onChange: () => {} }));
  for (const name of ['albor-welcomeTitle', 'albor-storyMessage', 'albor-verse', 'albor-verseRef', 'albor-alborDetail', 'albor-alborCelebration', 'albor-giftRegistryUrl']) assert.ok(fields.includes(`name="${name}"`), name);
  assert.doesNotMatch(fields, /name="(?:capitulo|travesia|serenata|vespera|opera)-/);
  const pickerFile = require.resolve('../src/components/admin/builder/IconPicker.tsx'), previousPicker = require.cache[pickerFile], pickers = [];
  require.cache[pickerFile] = { exports: { __esModule: true, default: props => { pickers.push(props); return React.createElement('span', null); } } };
  try {
    const SectionIconsEditor = require('../src/components/admin/builder/SectionIconsEditor.tsx').default;
    renderToStaticMarkup(React.createElement(SectionIconsEditor, { data: alborDemo(), onChange: () => {} }));
    assert.equal(pickers.length, 8, 'Both dress illustrations have independently editable selectors');
    for (const role of ['ceremony', 'reception', 'dress', 'jacket', 'adults', 'gift', 'camera']) assert.ok(pickers.some(picker => picker.defaultIcon === ALBOR_ORIGINALS[role].localPath), role);
    const gown = pickers.find(picker => picker.defaultIcon === ALBOR_ORIGINALS.dress.localPath), jacket = pickers.find(picker => picker.defaultIcon === ALBOR_ORIGINALS.jacket.localPath);
    assert.notEqual(gown.destinationKey, jacket.destinationKey, 'Gown and jacket uploads cannot share a destination');
  } finally { if (previousPicker) require.cache[pickerFile] = previousPicker; else delete require.cache[pickerFile]; }
});
