// Real content/section editors, shared draft/list state, IconPicker and ImageUploader.
// A controlled React hook scheduler replaces only DOM/animation, registry loading,
// compression and HTTP. Synthetic PNGs stay in RAM; no Auth, storage or bank calls.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { File } = require('node:buffer');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest);
};
const compile = (source, file) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file,
}).outputText;
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => module._compile(compile(fs.readFileSync(file, 'utf8'), file), file);
const React = require('react');
let compress;
require.cache[require.resolve('../src/lib/image-compress.ts')] = { exports: { compressImage: (...args) => compress(...args) } };
const EventIcon = () => null, LottieIcon = () => null;
require.cache[require.resolve('../src/components/invitations/shared.tsx')] = { exports: { EventIcon } };
require.cache[require.resolve('../src/components/ui/LottieIcon.tsx')] = { exports: { __esModule: true, default: LottieIcon } };
const lottie = require('../src/lib/lottie-utils.ts');
lottie.loadLottieRegistry = async () => ({ version: 'qa-in-ram', categories: [] });
lottie.loadLottieByPath = async () => ({ layers: [] });
const baseline = 'd9c0c01945b3133cdb6d2995e60f0460c879acc5';
function editor(relative) {
  const file = path.join(root, relative), compiled = new Module(file, module);
  const source = process.argv.includes('--baseline')
    ? execFileSync('git', ['-c', 'core.fsmonitor=false', 'show', `${baseline}:${relative}`], { cwd: root, encoding: 'utf8' })
    : fs.readFileSync(file, 'utf8');
  compiled.filename = file; compiled.paths = module.paths;
  compiled._compile(compile(source, file), file); require.cache[file] = compiled;
  return compiled.exports.default;
}
const SectionIconsEditor = editor('src/components/admin/builder/SectionIconsEditor.tsx');
const { CAPITULO_ORIGINALS } = require('../src/lib/capitulo-assets.ts');
const TemplateContentFields = editor('src/components/admin/builder/panels/TemplateContentFields.tsx');
const ContentPanel = editor('src/components/admin/builder/panels/ContentPanel.tsx');
const IconPicker = require('../src/components/admin/builder/IconPicker.tsx').default;
const ImageUploader = require('../src/components/admin/builder/ImageUploader.tsx').default;
const IconLibrary = require('../src/components/admin/IconLibrary.tsx').default;
const { newServiceContract } = require('../src/lib/packages.ts');
const childEditorNames = new Set(['TemplateContentFields', 'CleanDesignFields', 'MariaMarioFields', 'KarlaMauricioFields', 'PaulaJuanFelipeFields', 'MarianaJesusFields', 'ManuelMayaFields', 'NicoleFranciscoFields', 'RolyYelianaFields', 'AnnieMickyFields', 'LauraAndresFields', 'CleanItineraryFields', 'TravelRouteFields', 'SilkArtFields']);
const owner = '65000000-0000-4000-8000-000000000001';
const otherOwner = '65000000-0000-4000-8000-000000000002';
const uploaded = 'https://qa.invalid/section-current.png';
const obsolete = 'https://qa.invalid/section-obsolete.png';
const otherUploaded = 'https://qa.invalid/other-section-current.png';
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const file = (name = 'qa-section.png') => new File(['QA synthetic PNG bytes'], name, { type: 'image/png' });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const nodes = (element, predicate) => !React.isValidElement(element) ? [] : [
  ...(predicate(element) ? [element] : []),
  ...React.Children.toArray(element.props.children).flatMap(child => nodes(child, predicate)),
];
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value)
  : Array.isArray(value) ? value.map(text).join(' ') : React.isValidElement(value) ? text(value.props.children) : '';
const find = (tree, predicate, index = 0) => { const found = nodes(tree, predicate)[index]; assert.ok(found, 'Expected real section/content control'); return found; };
const button = (tree, label) => find(tree, node => node.type === 'button' && text(node).trim() === label);
const itineraryCards = runner => nodes(runner.current(), node => node.type === 'div' && /list-row-\d+/.test(String(node.key)) && nodes(node, field => field.type === 'input' && field.props.placeholder === '16:00').length === 1 && nodes(node, field => field.type === 'input' && field.props.placeholder === 'Ceremonia').length === 1);
const rowInput = (runner, index, placeholder) => find(itineraryCards(runner)[index], node => node.type === 'input' && node.props.placeholder === placeholder);
const removeRow = (runner, index) => button(itineraryCards(runner)[index], '✕').props.onClick;
const labelControl = (runner, label, type) => {
  const container = find(runner.current(), node => node.type === 'div' && React.Children.toArray(node.props.children).some(child => React.isValidElement(child) && child.type === 'label' && text(child).trim() === label));
  return find(container, node => node.type === 'input' && (!type || node.props.type === type));
};
const globalColor = runner => labelControl(runner, 'Color iconos SVG', 'color');
const scale = runner => find(runner.current(), node => node.type === 'input' && node.props.type === 'range' && node.props.min === 0.7);
const fixture = () => ({
  id: owner, slug: 'qa-private-section-icons', names: 'QA iconos ficticios', message: 'QA mensaje inicial', template: 'azure', type: 'boda', event_date: '2027-02-01',
  guest_passes: 2, parents_groom: ['QA padre'], parents_bride: ['QA madre'], no_kids: false,
  itinerary: [
    { time: '16:00', label: 'QA ceremonia', icon: 'rings', iconColors: { __tint: '#315b28' }, iconSpeed: 1.5 },
    { time: '18:00', label: 'QA recepción', icon: 'cheers', iconColors: { __tint: '#834d5c' }, iconSpeed: 0.75 },
    { time: '20:00', label: 'QA baile', icon: 'dance' },
  ],
  config: newServiceContract({ designKey: 'qa-original', iconColor: '#1e3a5f', iconScale: 1, musicUrl: '/music/qa-original.mp3',
    decor: { icon: '/lottie/qa-original.json' },
    sectionIcons: { ceremony: 'church', reception: 'cheers', dress: 'dress', gallery: 'camera' },
    sectionIconColors: { ceremony: { __tint: '#315b28' }, reception: { __tint: '#834d5c' } },
    sectionIconSpeeds: { ceremony: 1.5, reception: 0.75 },
  }, 'premium'),
});

test('Capitulo exposes its exact section originals and composes simultaneous icon settings without changing other values', async () => {
  const initial = fixture(); initial.template = 'primicia'; initial.config.designKey = 'capitulo';
  await withEditor(async runner => {
    const pickers = runner.pickers();
    assert.deepEqual(pickers.map(picker => picker.props.defaultIcon), [
      CAPITULO_ORIGINALS.bride.localPath, CAPITULO_ORIGINALS.groom.localPath,
      CAPITULO_ORIGINALS.location.localPath, CAPITULO_ORIGINALS.location.localPath,
      CAPITULO_ORIGINALS.suit.localPath, CAPITULO_ORIGINALS.dress.localPath,
      CAPITULO_ORIGINALS.adults.localPath, CAPITULO_ORIGINALS.reception.localPath, CAPITULO_ORIGINALS.gift.localPath,
    ]);
    pickers[0].props.onChange('', {}, 1);
    pickers[7].props.onChange(CAPITULO_ORIGINALS.reception.localPath, { __tint: '#314529' }, 1.5);
    assert.equal(runner.data().config.sectionIcons.parentsBride, '');
    assert.equal(runner.data().config.sectionIcons.rsvp, CAPITULO_ORIGINALS.reception.localPath);
    assert.deepEqual(runner.data().config.sectionIconColors.rsvp, { __tint: '#314529' });
    assert.equal(runner.data().config.sectionIconSpeeds.rsvp, 1.5);
    assert.equal(runner.data().config.sectionIcons.ceremony, initial.config.sectionIcons.ceremony);
    assert.deepEqual(runner.data().itinerary, initial.itinerary);
    assert.equal(runner.requests.length, 0);
  }, { data: initial, sectionOnly: true });
});

async function withEditor(scenario, { data = fixture(), sectionOnly = false, reply, compression, parentTransform } = {}) {
  const hooks = ['useState', 'useRef', 'useEffect', 'useCallback', 'useMemo'];
  const oldHooks = Object.fromEntries(hooks.map(name => [name, React[name]])), oldFetch = global.fetch;
  const fibers = new Map(), requests = [], compressions = [], patches = [];
  let fiber, cursor = 0, dirty = true, tree, effects = [], unmounted = false, visible = true, lateWrites = 0, currentData = data;
  let pickers = [], uploaders = [], templates = [];
  const editingRevision = { current: 0 };
  const draftSource = { current: data };
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  React.useState = initial => {
    const active = fiber, slots = active.slots, index = cursor++;
    if (!(index in slots)) {
      const slot = slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      slot.set = next => {
        if (unmounted || !active.live) { lateWrites++; return; }
        next = typeof next === 'function' ? next(slot.value) : next;
        if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; }
      };
    }
    return [slots[index].value, slots[index].set];
  };
  React.useRef = initial => { const index = cursor++; return fiber.slots[index] ?? (fiber.slots[index] = { current: initial }); };
  React.useCallback = (callback, deps) => { const slots = fiber.slots, index = cursor++; if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { value: callback, deps }; return slots[index].value; };
  React.useMemo = (compute, deps) => { const slots = fiber.slots, index = cursor++; if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { value: compute(), deps }; return slots[index].value; };
  React.useEffect = (effect, deps) => {
    const slots = fiber.slots, index = cursor++, before = slots[index];
    if (!before || !same(before.deps, deps)) {
      const slot = slots[index] = { deps, effect, cleanup: before?.cleanup };
      effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); });
    }
  };
  compress = (...args) => { compressions.push(args); return compression ? compression(...args, compressions) : Promise.resolve(args[0]); };
  global.fetch = async (url, options = {}) => {
    const request = { url, method: options.method, body: options.body, signal: options.signal }; requests.push(request);
    return reply ? reply(request, requests) : Response.json({ url: uploaded });
  };
  const notify = patch => {
    if (unmounted) lateWrites++;
    patches.push(clone(patch));
    const merged = { ...currentData, ...patch };
    currentData = parentTransform ? parentTransform(merged, patch, currentData) : merged;
    draftSource.current = currentData; dirty = true;
  };
  const render = (key, Component, props) => {
    let active = fibers.get(key);
    if (!active || !active.live) { active = { slots: [], live: true }; fibers.set(key, active); }
    active.used = true; fiber = active; cursor = 0;
    return { element: Component(props), fiber: active };
  };
  const expand = (element, key) => {
    if (!React.isValidElement(element)) return element;
    if ([SectionIconsEditor, IconPicker, ImageUploader, IconLibrary].includes(element.type) || typeof element.type === 'function' && childEditorNames.has(element.type.name)) {
      const rendered = render(key + '/' + element.type.name, element.type, element.props);
      const entry = { props: element.props, fiber: rendered.fiber, tree: undefined };
      if (element.type === IconPicker) pickers.push(entry);
      if (element.type === ImageUploader) uploaders.push(entry);
      if (element.type === TemplateContentFields) templates.push(entry);
      entry.tree = expand(rendered.element, key + '/' + element.type.name);
      return entry.tree;
    }
    if (typeof element.type === 'function' && ['Field', 'Wrapper'].includes(element.type.name)) return expand(element.type(element.props), key + '/' + element.type.name);
    return React.cloneElement(element, undefined, ...React.Children.toArray(element.props.children).map((child, index) =>
      expand(child, key + '/' + (React.isValidElement(child) && child.key != null ? child.key : index))));
  };
  const flush = async () => {
    for (let round = 0; round < 50; round++) {
      if (dirty && !unmounted) {
        dirty = false; effects = []; pickers = []; uploaders = []; templates = [];
        for (const active of fibers.values()) active.used = false;
        tree = visible ? expand(render('root', sectionOnly ? SectionIconsEditor : ContentPanel, { data: currentData, onChange: notify, editingRevision, draftSource }).element, 'root') : null;
        for (const active of fibers.values()) if (!active.used && active.live) { active.live = false; for (const slot of active.slots) slot?.cleanup?.(); }
        for (const effect of effects) effect();
      }
      await new Promise(done => setImmediate(done));
      if (!dirty || unmounted) return tree;
    }
    throw Error('Section/content hooks did not settle');
  };
  const unmount = () => { if (unmounted) return; unmounted = true; for (const active of fibers.values()) { active.live = false; for (const slot of active.slots) slot?.cleanup?.(); } };
  const runner = {
    current: () => tree, data: () => currentData, patches, requests, compressions, flush, unmount, lateWrites: () => lateWrites,
    pickers: () => pickers, uploaders: () => uploaders, template: () => templates[0]?.tree, editingRevision,
    picker: (kind, index = 0) => { const found = pickers[(kind === 'section' && !sectionOnly ? currentData.itinerary.length : 0) + index]; assert.ok(found, `Expected ${kind} picker ${index}`); return found; },
    choose: (kind, index = 0, media = file()) => find(runner.picker(kind, index).tree, node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [media], value: media.name } }),
    drain: async () => { for (let tick = 0; tick < 4; tick++) await new Promise(done => setImmediate(done)); },
    setData: async patch => { currentData = { ...currentData, ...patch }; draftSource.current = currentData; dirty = true; await flush(); },
    hide: async () => { visible = false; dirty = true; await flush(); },
    show: async () => { visible = true; dirty = true; await flush(); },
    replayEffects: () => {
      const currentEffects = [...fibers.values()].filter(active => active.live).flatMap(active => active.slots.filter(slot => slot?.effect));
      for (const slot of currentEffects) slot.cleanup?.();
      for (const slot of currentEffects) slot.cleanup = slot.effect();
    },
  };
  try { await flush(); return await scenario(runner); }
  finally {
    unmount(); for (const name of hooks) React[name] = oldHooks[name]; global.fetch = oldFetch;
    assert.ok(requests.every(request => request.url === '/api/admin/upload' && request.method === 'POST'), 'Only RAM upload POSTs allowed');
  }
}
async function openUpload(runner, kind = 'section', index = 0) {
  if (!nodes(runner.picker(kind, index).tree, node => node.type === 'button' && text(node).trim() === 'Subir el mío').length) {
    find(runner.picker(kind, index).tree, node => node.type === 'button' && node.props.title === 'Cambiar icono').props.onClick(); await runner.flush();
  }
  button(runner.picker(kind, index).tree, 'Subir el mío').props.onClick(); await runner.flush();
}
const unchanged = (runner, before) => {
  assert.deepEqual(runner.data().config.decor, before.config.decor);
  assert.equal(runner.data().config.musicUrl, before.config.musicUrl);
  assert.deepEqual(runner.data().config.serviceContract, before.config.serviceContract);
  assert.deepEqual(runner.data().config.features, before.config.features);
};

for (const phase of ['compression', 'transport', 'json']) test(`section upload preserves SVG color, scale and other sections edited before the next render during ${phase}`, async () => {
  const wait = deferred(), initial = fixture();
  await withEditor(async runner => {
    await openUpload(runner); runner.choose('section'); await runner.flush();
    globalColor(runner).props.onChange({ target: { value: '#c0ffee' } });
    scale(runner).props.onChange({ target: { value: '1.35' } });
    const before = runner.patches.length;
    wait.resolve(phase === 'compression' ? file() : phase === 'transport' ? Response.json({ url: uploaded }) : { url: uploaded });
    await runner.drain();
    assert.equal(runner.patches.length, before + 1);
    assert.equal(runner.data().config.iconColor, '#c0ffee'); assert.equal(runner.data().config.iconScale, 1.35);
    assert.deepEqual(runner.data().config.sectionIcons, { ...initial.config.sectionIcons, ceremony: uploaded });
    assert.deepEqual(runner.data().config.sectionIconColors.reception, initial.config.sectionIconColors.reception);
    assert.equal(runner.data().config.sectionIconSpeeds.reception, 0.75);
    assert.deepEqual(runner.data().itinerary, initial.itinerary); unchanged(runner, initial);
    assert.equal(runner.requests.length, 1); assert.equal(runner.lateWrites(), 0);
  }, { data: initial, compression: phase === 'compression' ? () => wait.promise : undefined,
    reply: () => phase === 'transport' ? wait.promise : phase === 'json' ? { ok: true, status: 200, json: () => wait.promise } : Response.json({ url: uploaded }) });
});

test('two section uploads completing in reverse order compose their maps and current global settings', async () => {
  const first = deferred(), second = deferred(), initial = fixture();
  await withEditor(async runner => {
    await openUpload(runner, 'section', 0); runner.choose('section', 0, file('qa-ceremony.png')); await runner.flush();
    await openUpload(runner, 'section', 1); runner.choose('section', 1, file('qa-reception.png')); await runner.flush();
    globalColor(runner).props.onChange({ target: { value: '#315b28' } }); scale(runner).props.onChange({ target: { value: '1.25' } });
    second.resolve({ url: otherUploaded }); await runner.drain(); first.resolve({ url: uploaded }); await runner.drain();
    assert.deepEqual(runner.data().config.sectionIcons, { ...initial.config.sectionIcons, ceremony: uploaded, reception: otherUploaded });
    assert.equal(runner.data().config.iconColor, '#315b28'); assert.equal(runner.data().config.iconScale, 1.25);
    // Choosing a different custom image intentionally resets its old animation styling.
    assert.equal(runner.requests.length, 2); assert.equal(runner.data().config.sectionIconSpeeds.ceremony, 1); assert.equal(runner.data().config.sectionIconSpeeds.reception, 1);
    assert.deepEqual(runner.data().config.sectionIconColors.ceremony, {}); assert.deepEqual(runner.data().config.sectionIconColors.reception, {});
    unchanged(runner, initial); assert.equal(runner.lateWrites(), 0);
  }, { data: initial, reply: (_request, requests) => ({ ok: true, status: 200, json: () => requests.length === 1 ? first.promise : second.promise }) });
});

test('a section upload merges the latest externally rendered config instead of restoring captured music or text', async () => {
  const wait = deferred(), initial = fixture();
  await withEditor(async runner => {
    await openUpload(runner); runner.choose('section'); await runner.flush();
    await runner.setData({ config: { ...runner.data().config, city: 'QA ciudad vigente', musicUrl: '/music/qa-current.mp3', iconScale: 1.2 } });
    wait.resolve({ url: uploaded }); await runner.flush();
    assert.equal(runner.data().config.city, 'QA ciudad vigente'); assert.equal(runner.data().config.musicUrl, '/music/qa-current.mp3'); assert.equal(runner.data().config.iconScale, 1.2);
    assert.equal(runner.data().config.sectionIcons.ceremony, uploaded); assert.deepEqual(runner.data().itinerary, initial.itinerary);
  }, { data: initial, reply: () => ({ ok: true, status: 200, json: () => wait.promise }) });
});

test('the parent content fields, itinerary and section editor share same-turn draft changes before upload completion', async () => {
  const wait = deferred(), initial = fixture();
  await withEditor(async runner => {
    await openUpload(runner); runner.choose('section'); await runner.flush();
    const time = rowInput(runner, 0, '16:00').props.onChange, label = rowInput(runner, 0, 'Ceremonia').props.onChange;
    const names = labelControl(runner, 'Nombres (ej: Ana & Carlos)').props.onChange;
    names({ target: { value: 'QA nombres vigentes' } }); time({ target: { value: '17:30' } }); label({ target: { value: 'QA momento vigente' } });
    globalColor(runner).props.onChange({ target: { value: '#ab12cd' } }); wait.resolve({ url: uploaded }); await runner.drain();
    assert.equal(runner.data().names, 'QA nombres vigentes'); assert.equal(runner.data().itinerary[0].time, '17:30'); assert.equal(runner.data().itinerary[0].label, 'QA momento vigente');
    assert.equal(runner.data().config.iconColor, '#ab12cd'); assert.equal(runner.data().config.sectionIcons.ceremony, uploaded); unchanged(runner, initial);
  }, { data: initial, reply: () => ({ ok: true, status: 200, json: () => wait.promise }) });
});

const richVariants = [
  { key: 'annieMicky', designKey: 'annie-y-micky' },
  { key: 'lauraAndres', designKey: 'laura-y-andres' },
  { key: 'manuelMaya', designKey: 'manuel-y-maya' },
  { key: 'mariaMario', designKey: 'maria-angelica-y-mario' },
  { key: 'nicoleFrancisco', designKey: 'nicole-y-francisco' },
  { key: 'rolyYeliana', designKey: 'roly-y-yeliana' },
  { key: 'paulaJuanFelipe', designKey: 'paula-y-juan-felipe' },
  { key: 'mariaMario', designKey: 'jardin-de-seda' },
  { key: 'karlaMauricio', designKey: 'karla-y-mauricio' },
  { key: 'marianaJesus', designKey: 'mariana-y-jesus' },
];
for (const descriptor of richVariants) test(`${descriptor.designKey}: real rich text edits after a section upload ACK preserve the icon before React renders`, async () => {
  const wait = deferred(), initial = fixture();
  initial.config.designKey = descriptor.designKey;
  initial.config[descriptor.key] = { texts: { qaOriginal: 'QA texto ajeno intacto' }, sections: { qaOriginal: true } };
  await withEditor(async runner => {
    assert.equal(runner.patches.length, 0);
    const editor = find(runner.template(), node => node.type === 'textarea').props.onChange;
    const ceremonyIndex = runner.pickers().slice(initial.itinerary.length).findIndex(picker => picker.props.value === 'church');
    assert.ok(ceremonyIndex >= 0, 'The fixture ceremony must remain distinct from music/passes/gallery');
    await openUpload(runner, 'section', ceremonyIndex); runner.choose('section', ceremonyIndex); await runner.flush();
    wait.resolve({ url: uploaded }); await runner.drain();
    assert.equal(runner.data().config.sectionIcons.ceremony, uploaded);
    editor({ target: { value: 'QA texto vigente después del icono' } });
    globalColor(runner).props.onChange({ target: { value: '#112233' } });
    assert.equal(runner.data().config.sectionIcons.ceremony, uploaded);
    assert.equal(runner.data().config.iconColor, '#112233');
    assert.ok(Object.values(runner.data().config[descriptor.key].texts).includes('QA texto vigente después del icono'));
    assert.equal(runner.data().config[descriptor.key].texts.qaOriginal, 'QA texto ajeno intacto');
    assert.deepEqual(runner.data().itinerary, initial.itinerary); unchanged(runner, initial);
    assert.equal(runner.lateWrites(), 0);
  }, { data: initial, reply: () => ({ ok: true, status: 200, json: () => wait.promise }) });
});

test('the real generic template city field composes with section settings and an upload ACK without a render', async () => {
  const wait = deferred(), initial = fixture();
  await withEditor(async runner => {
    const city = find(runner.template(), node => node.type === 'input' && node.props.placeholder === 'Bogotá').props.onChange;
    await openUpload(runner); runner.choose('section'); await runner.flush();
    wait.resolve({ url: uploaded }); await runner.drain(); city({ target: { value: 'QA ciudad después del icono' } });
    scale(runner).props.onChange({ target: { value: '1.35' } });
    assert.equal(runner.data().config.city, 'QA ciudad después del icono'); assert.equal(runner.data().config.sectionIcons.ceremony, uploaded);
    assert.equal(runner.data().config.iconScale, 1.35); unchanged(runner, initial);
  }, { data: initial, reply: () => ({ ok: true, status: 200, json: () => wait.promise }) });
});

test('the authoritative parent draft preserves its pending workflow and rejected field edits before the next render', async () => {
  for (const mode of ['workflow', 'rejection']) {
    const wait = deferred(), initial = fixture(); initial.config.workflow = { reviewStatus: 'approved' };
    await withEditor(async runner => {
      await openUpload(runner); runner.choose('section'); await runner.flush();
      globalColor(runner).props.onChange({ target: { value: mode === 'workflow' ? '#112233' : '#badbad' } });
      wait.resolve({ url: uploaded }); await runner.drain();
      assert.equal(runner.data().config.sectionIcons.ceremony, uploaded);
      assert.equal(runner.data().config.iconColor, mode === 'workflow' ? '#112233' : initial.config.iconColor);
      assert.equal(runner.patches.at(-1).config.iconColor, mode === 'workflow' ? '#112233' : initial.config.iconColor);
      if (mode === 'workflow') assert.equal(runner.patches.at(-1).config.workflow.reviewStatus, 'pending');
      assert.deepEqual(runner.data().itinerary, initial.itinerary); assert.equal(runner.lateWrites(), 0);
    }, { data: initial, reply: () => ({ ok: true, status: 200, json: () => wait.promise }),
      parentTransform: mode === 'workflow' ? next => ({ ...next, config: { ...next.config, workflow: { ...next.config.workflow, reviewStatus: 'pending' } } })
        : (next, patch, current) => patch.config?.iconColor === '#badbad' ? current : next });
  }
});

for (const mode of ['rename', 'delete-target', 'delete-neighbor', 'reorder', 'add', 'unknown-clone']) test(`itinerary upload follows its original row through ${mode} without losing current fields or restoring rows`, async () => {
  const wait = deferred(), initial = fixture();
  await withEditor(async runner => {
    const index = mode === 'delete-neighbor' ? 1 : 0, original = initial.itinerary[index];
    await openUpload(runner, 'itinerary', index); const instance = runner.picker('itinerary', index).fiber;
    const beforeKeys = itineraryCards(runner).map(node => node.key);
    runner.choose('itinerary', index); await runner.flush();
    if (mode === 'rename') {
      rowInput(runner, index, 'Ceremonia').props.onChange({ target: { value: 'QA nombre editado durante subida' } });
      rowInput(runner, index, '16:00').props.onChange({ target: { value: '17:45' } });
    } else if (mode === 'delete-target') removeRow(runner, index)();
    else if (mode === 'delete-neighbor') removeRow(runner, 0)();
    else if (mode === 'add') button(runner.current(), '+ Agregar paso').props.onClick();
    else if (mode === 'reorder') await runner.setData({ itinerary: [runner.data().itinerary[1], runner.data().itinerary[0], runner.data().itinerary[2]] });
    else await runner.setData({ itinerary: clone(runner.data().itinerary) });
    const before = clone(runner.data().itinerary), count = runner.patches.length;
    const target = mode === 'delete-neighbor' ? 0 : mode === 'reorder' ? 1 : index;
    wait.resolve({ url: uploaded }); await runner.drain();
    assert.deepEqual(runner.data().itinerary, before.map((item, position) => position === target && !['delete-target', 'unknown-clone'].includes(mode) ? { ...item, icon: uploaded, iconColors: undefined, iconSpeed: undefined } : item));
    assert.equal(runner.patches.length, count + (['delete-target', 'unknown-clone'].includes(mode) ? 0 : 1));
    await runner.flush();
    if (mode === 'reorder') { assert.deepEqual(itineraryCards(runner).map(node => node.key), [beforeKeys[1], beforeKeys[0], beforeKeys[2]]); assert.equal(runner.picker('itinerary', 1).fiber, instance); }
    if (mode === 'delete-neighbor') { assert.equal(itineraryCards(runner)[0].key, beforeKeys[1]); assert.equal(runner.picker('itinerary', 0).fiber, instance); }
    for (const item of runner.data().itinerary) assert.deepEqual(Object.keys(item).sort(), (item.time === '' ? ['icon', 'label', 'time'] : item.label === 'QA baile' ? Object.keys(initial.itinerary[2]) : Object.keys(original)).sort());
    unchanged(runner, initial); assert.equal(runner.lateWrites(), 0);
  }, { data: initial, reply: () => ({ ok: true, status: 200, json: () => wait.promise }) });
});

test('retained add, edit and remove controls in the same turn preserve both new steps and never resurrect a removed target', async () => {
  const initial = fixture();
  await withEditor(async runner => {
    const add = button(runner.current(), '+ Agregar paso').props.onClick, remove = removeRow(runner, 0), editRemoved = rowInput(runner, 0, 'Ceremonia').props.onChange;
    const editNeighbor = rowInput(runner, 1, 'Ceremonia').props.onChange;
    add(); add(); editNeighbor({ target: { value: 'QA vecino vigente' } }); remove(); editRemoved({ target: { value: 'QA no debe reaparecer' } });
    await runner.flush();
    assert.equal(runner.data().itinerary.length, 4); assert.equal(runner.data().itinerary[0].label, 'QA vecino vigente');
    assert.deepEqual(runner.data().itinerary.slice(-2), [{ time: '', label: '', icon: '' }, { time: '', label: '', icon: '' }]);
    assert.equal(runner.data().itinerary.some(item => item.label === 'QA no debe reaparecer'), false); unchanged(runner, initial);
  }, { data: initial });
});

test('rows with identical icon values retain distinct upload destinations and the correct reused picker after neighbor deletion', async () => {
  const wait = deferred(), initial = fixture(); initial.itinerary[1].icon = initial.itinerary[0].icon;
  await withEditor(async runner => {
    const destinations = runner.pickers().slice(0, 3).map(picker => picker.props.destinationKey);
    assert.ok(destinations.every(value => typeof value === 'string' && value)); assert.equal(new Set(destinations).size, 3);
    await openUpload(runner, 'itinerary', 1); const instance = runner.picker('itinerary', 1).fiber; runner.choose('itinerary', 1); await runner.flush();
    removeRow(runner, 0)(); await runner.flush(); assert.equal(runner.picker('itinerary', 0).fiber, instance);
    assert.equal(runner.picker('itinerary', 0).props.destinationKey, destinations[1]);
    wait.resolve({ url: uploaded }); await runner.flush();
    assert.deepEqual(runner.data().itinerary, [{ ...initial.itinerary[1], icon: uploaded, iconColors: undefined, iconSpeed: undefined }, initial.itinerary[2]]); unchanged(runner, initial);
  }, { data: initial, reply: () => ({ ok: true, status: 200, json: () => wait.promise }) });
});

test('an externally cloned duplicate itinerary drops an obsolete upload instead of guessing identity from equal values', async () => {
  const wait = deferred(), initial = fixture(); initial.itinerary = [initial.itinerary[0], clone(initial.itinerary[0])];
  await withEditor(async runner => {
    await openUpload(runner, 'itinerary', 0); runner.choose('itinerary', 0); await runner.flush();
    const beforeKeys = itineraryCards(runner).map(node => node.key);
    await runner.setData({ itinerary: clone(runner.data().itinerary).reverse() });
    assert.ok(itineraryCards(runner).every(node => !beforeKeys.includes(node.key)));
    const before = clone(runner.data()), count = runner.patches.length; wait.resolve({ url: obsolete }); await runner.flush();
    assert.deepEqual(clone(runner.data()), before); assert.equal(runner.patches.length, count); assert.equal(runner.lateWrites(), 0);
  }, { data: initial, reply: () => ({ ok: true, status: 200, json: () => wait.promise }) });
});

for (const field of ['owner', 'template', 'design']) test(`obsolete section and itinerary controls cannot affect a new upload after ${field} A/B/A`, async () => {
  for (const kind of ['section', 'itinerary']) {
    const old = deferred(), current = deferred(), initial = fixture();
    await withEditor(async runner => {
      await openUpload(runner, kind); const oldDestination = runner.picker(kind).props.destinationKey;
      assert.ok(oldDestination); const restoreOld = button(runner.picker(kind).tree, 'Restaurar').props.onClick;
      const oldGlobal = globalColor(runner).props.onChange, oldEdit = rowInput(runner, 0, 'Ceremonia').props.onChange;
      runner.choose(kind, 0, file('qa-old.png')); await runner.flush();
      if (field === 'owner') { await runner.setData({ id: otherOwner }); await runner.setData({ id: owner }); }
      else if (field === 'template') { await runner.setData({ template: 'dolcevita' }); await runner.setData({ template: 'azure' }); }
      else { await runner.setData({ config: { ...runner.data().config, designKey: 'qa-next-design' } }); await runner.setData({ config: { ...runner.data().config, designKey: 'qa-original' } }); }
      await openUpload(runner, kind); assert.notEqual(runner.picker(kind).props.destinationKey, oldDestination);
      runner.choose(kind, 0, file('qa-current.png')); await runner.flush(); const count = runner.patches.length;
      restoreOld(); oldGlobal({ target: { value: '#badbad' } }); oldEdit({ target: { value: 'QA obsolete label' } }); old.resolve({ url: obsolete }); await runner.drain();
      assert.equal(runner.patches.length, count); assert.equal(runner.requests[1].signal.aborted, false);
      current.resolve({ url: uploaded }); await runner.flush();
      assert.equal(kind === 'section' ? runner.data().config.sectionIcons.ceremony : runner.data().itinerary[0].icon, uploaded);
      assert.equal(runner.data().config.iconColor, initial.config.iconColor); assert.equal(runner.data().itinerary[0].label, initial.itinerary[0].label);
      assert.equal(runner.patches.length, count + 1); unchanged(runner, initial); assert.equal(runner.lateWrites(), 0);
    }, { data: initial, reply: (_request, requests) => { const wait = requests.length === 1 ? old : current; return { ok: true, status: 200, json: () => wait.promise }; } });
  }
});

test('unmounts during compression, transport and JSON make no content patches or late state writes', async () => {
  for (const kind of ['section', 'itinerary']) for (const phase of ['compression', 'transport', 'json']) {
    const wait = deferred();
    await withEditor(async runner => {
      await openUpload(runner, kind); runner.choose(kind); await runner.flush(); runner.unmount();
      wait.resolve(phase === 'compression' ? file() : phase === 'transport' ? Response.json({ url: obsolete }) : { url: obsolete }); await runner.drain();
      assert.deepEqual(runner.patches, []); assert.equal(runner.lateWrites(), 0);
      assert.equal(runner.requests.length, phase === 'compression' ? 0 : 1);
    }, { compression: phase === 'compression' ? () => wait.promise : undefined,
      reply: () => phase === 'transport' ? wait.promise : { ok: true, status: 200, json: () => wait.promise } });
  }
});

test('a remounted content editor ignores old controls while accepting a fresh section upload', async () => {
  const wait = deferred(), initial = fixture();
  await withEditor(async runner => {
    await openUpload(runner); const oldGlobal = globalColor(runner).props.onChange, oldRow = rowInput(runner, 0, 'Ceremonia').props.onChange;
    const oldPicker = runner.picker('section').fiber, oldRestore = button(runner.picker('section').tree, 'Restaurar').props.onClick;
    await runner.hide(); await runner.show(); assert.notEqual(runner.picker('section').fiber, oldPicker);
    await openUpload(runner); runner.choose('section'); await runner.flush();
    oldRestore(); oldGlobal({ target: { value: '#badbad' } }); oldRow({ target: { value: 'QA obsolete' } }); await runner.drain();
    assert.deepEqual(runner.patches, []); assert.equal(runner.requests[0].signal.aborted, false);
    wait.resolve({ url: uploaded }); await runner.flush();
    assert.equal(runner.data().config.sectionIcons.ceremony, uploaded); assert.equal(runner.data().config.iconColor, initial.config.iconColor); assert.deepEqual(runner.data().itinerary, initial.itinerary);
    assert.equal(runner.lateWrites(), 0);
  }, { data: initial, reply: () => ({ ok: true, status: 200, json: () => wait.promise }) });
});

test('React 18 cleanup/setup replay accepts fresh section and itinerary uploads before another render', async () => {
  for (const kind of ['section', 'itinerary', 'standalone-section']) await withEditor(async runner => {
    const destination = kind === 'itinerary' ? 'itinerary' : 'section';
    await openUpload(runner, destination); const currentColor = globalColor(runner).props.onChange;
    const editRow = kind === 'itinerary' ? rowInput(runner, 0, 'Ceremonia').props.onChange : null;
    runner.replayEffects(); currentColor({ target: { value: '#c0ffee' } }); editRow?.({ target: { value: 'QA edición tras replay' } }); runner.choose(destination); await runner.flush();
    assert.equal(runner.data().config.iconColor, '#c0ffee');
    assert.equal(destination === 'section' ? runner.data().config.sectionIcons.ceremony : runner.data().itinerary[0].icon, uploaded);
    if (editRow) assert.equal(runner.data().itinerary[0].label, 'QA edición tras replay');
    assert.equal(runner.requests.length, 1); assert.equal(runner.requests[0].signal.aborted, false); assert.equal(runner.lateWrites(), 0);
  }, { sectionOnly: kind === 'standalone-section' });
});

test('a history revision invalidates section and itinerary callbacks synchronously before rendering and accepts the new session', async () => {
  for (const kind of ['section', 'itinerary']) {
    const old = deferred(), current = deferred();
    await withEditor(async runner => {
      await openUpload(runner, kind); const oldDestination = runner.picker(kind).props.destinationKey;
      const restore = button(runner.picker(kind).tree, 'Restaurar').props.onClick;
      const editGlobal = globalColor(runner).props.onChange, editRow = rowInput(runner, 0, 'Ceremonia').props.onChange;
      runner.choose(kind, 0, file('qa-old-history.png')); await runner.flush();
      runner.editingRevision.current += 1;
      restore(); editGlobal({ target: { value: '#badbad' } }); editRow({ target: { value: 'QA obsolete history' } });
      old.resolve({ url: obsolete }); await runner.drain(); assert.deepEqual(runner.patches, []);
      await runner.setData({ names: 'QA resultado de historial' }); await openUpload(runner, kind);
      assert.notEqual(runner.picker(kind).props.destinationKey, oldDestination);
      runner.choose(kind, 0, file('qa-current-history.png')); await runner.flush();
      current.resolve({ url: uploaded }); await runner.flush();
      assert.equal(kind === 'section' ? runner.data().config.sectionIcons.ceremony : runner.data().itinerary[0].icon, uploaded);
      assert.equal(runner.data().names, 'QA resultado de historial'); assert.equal(runner.patches.length, 1); assert.equal(runner.lateWrites(), 0);
    }, { reply: (_request, requests) => { const wait = requests.length === 1 ? old : current; return { ok: true, status: 200, json: () => wait.promise }; } });
  }
});

test('section and itinerary destinations remain stable for ordinary edits and runtime identities never enter saved JSON', async () => {
  const initial = fixture();
  await withEditor(async runner => {
    assert.deepEqual(runner.patches, []); const before = runner.pickers().map(picker => picker.props.destinationKey);
    assert.ok(before.every(value => typeof value === 'string' && value)); assert.equal(new Set(before).size, before.length);
    rowInput(runner, 1, 'Ceremonia').props.onChange({ target: { value: 'QA unchanged destination' } }); globalColor(runner).props.onChange({ target: { value: '#112233' } }); await runner.flush();
    assert.deepEqual(runner.pickers().map(picker => picker.props.destinationKey), before);
    assert.doesNotMatch(JSON.stringify(runner.data()), /(?:destinationKey|list-row-|iconRevision|fieldRevision)/);
    assert.deepEqual(Object.keys(runner.data()).sort(), Object.keys(initial).sort()); assert.deepEqual(Object.keys(runner.data().config).sort(), Object.keys(initial.config).sort());
    unchanged(runner, initial);
  }, { data: initial });
});
