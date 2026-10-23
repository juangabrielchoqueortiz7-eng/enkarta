// Execute the Capitulo original-icon lifecycle with in-memory media and Lottie doubles.
// Browser rendering and network-byte checks are covered separately.
'use strict';
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = require.extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText, file);
require.extensions['.css'] = mod => { mod.exports = { __esModule: true, default: new Proxy({}, { get: (_target, name) => String(name) }) }; };
const React = require('react');
const stub = (file, exports) => { require.cache[require.resolve(file)] = { exports }; };
const Lottie = () => null;
let policy, armed, loader;
stub('next/dynamic', () => Lottie);
stub('../src/lib/use-media-preferences.ts', { useMediaPreferences: () => policy });
stub('../src/lib/scroll-motion.tsx', { usePageMotion: () => ({ armed }) });
const utils = require('../src/lib/lottie-utils.ts');
stub('../src/lib/lottie-utils.ts', { ...utils, loadLottieByPath: (src, options) => { assert.deepEqual(options, { fallback: false }); return loader(src); } });
const { CAPITULO_ORIGINALS } = require('../src/lib/capitulo-assets.ts');
const { colorCapituloIcon, CAPITULO_ICON_INK, CAPITULO_ICON_PAPER } = require('../src/lib/capitulo-icon-palette.ts');
const Icon = require('../src/components/invitations/CapituloOriginalIcon.tsx').default;
const freeze = value => { Object.freeze(value); for (const child of Object.values(value)) if (child && typeof child === 'object' && !Object.isFrozen(child)) freeze(child); return value; };
const original = freeze({ v: '5.7.4', ip: 0, op: 60, layers: [{ shapes: [{ ty: 'fl', c: { a: 0, k: [0, 0, 0, .75] }, o: { a: 0, k: 80 } }] }] });
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const nodes = (el, match) => !React.isValidElement(el) ? [] : [...(match(el) ? [el] : []), ...React.Children.toArray(el.props.children).flatMap(child => nodes(child, match))];

async function withIcon(input, scenario, { pending = {} } = {}) {
  const names = ['useState', 'useRef', 'useEffect', 'useMemo'], hooks = Object.fromEntries(names.map(name => [name, React[name]]));
  const globalNames = ['window', 'IntersectionObserver', 'fetch'], saved = Object.fromEntries(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]));
  let props = { role: 'ceremony', config: {}, ...input }, cursor = 0, dirty = true, effects = [], tree, unmounted = false, late = 0;
  const slots = [], requests = [], observers = [], calls = [], element = {};
  const player = { setSpeed: value => calls.push(['speed', value]), setDirection: value => calls.push(['direction', value]), goToAndStop: (...value) => calls.push(['seek', ...value]), play: () => calls.push(['play']), pause: () => calls.push(['pause']) };
  policy = { ready: true, reducedMotion: false, saveData: false, pageVisible: true }; armed = true;
  loader = src => { requests.push(src); return pending[src]?.promise ?? Promise.resolve(original); };
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  React.useState = initial => { const i = cursor++; if (!slots[i]) { const slot = slots[i] = { value: typeof initial === 'function' ? initial() : initial }; slot.set = value => { if (unmounted) { late++; return; } const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; } return [slots[i].value, slots[i].set]; };
  React.useRef = initial => { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); };
  React.useMemo = (compute, deps) => { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: compute() }; return slots[i].value; };
  React.useEffect = (effect, deps) => { const i = cursor++, old = slots[i]; if (!old || !same(old.deps, deps)) { const slot = slots[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); }); } };
  class Observer { constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); } observe(target) { assert.equal(target, element); } disconnect() { this.disconnected = true; } }
  global.window = { IntersectionObserver: Observer }; global.IntersectionObserver = Observer;
  global.fetch = () => assert.fail('Motion regressions must not contact the network');
  const flush = async () => {
    for (let round = 0; round < 30; round++) {
      if (dirty && !unmounted) {
        dirty = false; cursor = 0; effects = []; tree = Icon(props);
        for (const node of nodes(tree, value => value.ref || value.props.lottieRef)) {
          if (node.ref && typeof node.ref === 'object') node.ref.current = element;
          if (node.props.lottieRef) node.props.lottieRef.current = player;
        }
        for (const effect of effects) effect();
      }
      await new Promise(done => setImmediate(done));
      if (!dirty || unmounted) return;
    }
    throw Error('Capitulo icon hooks did not settle');
  };
  const unmount = () => { if (unmounted) return; unmounted = true; for (const slot of slots) slot?.cleanup?.(); };
  const runner = { tree: () => tree, calls, requests, observers, flush, unmount, late: () => late,
    reveal: async visible => { observers.at(-1).callback([{ isIntersecting: visible }]); await flush(); },
    update: async patch => { props = { ...props, ...patch }; dirty = true; await flush(); },
    preference: async patch => { policy = { ...policy, ...patch }; dirty = true; await flush(); },
    arm: async value => { armed = value; dirty = true; await flush(); },
  };
  try { await flush(); await scenario(runner); } finally { unmount(); for (const name of names) React[name] = hooks[name]; for (const name of globalNames) { if (saved[name]) Object.defineProperty(global, name, saved[name]); else delete global[name]; } }
}
const animation = r => nodes(r.tree(), node => node.type === Lottie)[0];
const ink = [140 / 255, 69 / 255, 59 / 255];
const paints = value => {
  if (Array.isArray(value)) return value.flatMap(paints);
  if (!value || typeof value !== 'object') return [];
  return [...(['fl', 'st'].includes(value.ty) && Array.isArray(value.c?.k) ? [value] : []), ...Object.values(value).flatMap(paints)];
};
// Resolve the exported AE color link used by these originals. Reading c.k alone
// misses the blue Color Ctrl value that Lottie actually paints in the browser.
const effectiveColor = (paint, document) => {
  if (!paint.c.x) return paint.c.k;
  const target = paint.c.x.match(/thisComp\.layer\(['"]([^'"]+)['"]\)\.effect\(['"]([^'"]+)['"]\)\(['"]Color['"]\)/);
  assert.ok(target, 'The original color expression has a known Color Ctrl source');
  const compositions = [document, ...(document.assets ?? [])];
  const layer = compositions.flatMap(comp => comp.layers ?? []).find(item => item.nm === target[1]);
  const effect = layer?.ef?.find(item => item.nm === target[2]);
  const controller = effect?.ef?.find(item => item.ty === 2)?.v?.k;
  assert.ok(controller, `Color Ctrl ${target[2]} exists`);
  return controller;
};
const visibleStrokes = document => {
  const matteIds = new Set();
  const refs = value => { if (Array.isArray(value)) return value.forEach(refs); if (!value || typeof value !== 'object') return; if (value.td === 1 && value.refId) matteIds.add(value.refId); Object.values(value).forEach(refs); };
  refs(document);
  const list = [];
  const visit = (value, matte = false) => {
    if (Array.isArray(value)) return value.forEach(child => visit(child, matte));
    if (!value || typeof value !== 'object') return;
    matte ||= value.td === 1 || matteIds.has(value.id);
    if (value.ty === 'st' && !matte && value.c?.k?.[3] !== 0 && !(value.o?.a === 0 && value.o.k === 0)) list.push(value);
    Object.values(value).forEach(child => visit(child, matte));
  };
  visit(document); return list;
};

test('the Capitulo palette styles paint rather than geometry and preserves white interiors, skin, masks and opacity', () => {
  const paint = (ty, k, opacity = 100) => ({ ty, c: { a: 0, k }, o: { a: 0, k: opacity } });
  const fixture = freeze({ layers: [{ shapes: [
    paint('st', [0, 0, 0, .75], 68), paint('st', [.2, .8, .8, 1]),
    paint('fl', [1, 1, 1, .9]), paint('fl', [.9, .65, .5, 1]),
    paint('st', [.2, .8, .8, 0]), paint('st', [0, 0, 0, 1], 0),
    { ty: 'tr', p: { a: 0, k: [0, 0, 0, 1], x: 'value + [Math.sin(time), 0]' } },
  ] }, { td: 1, refId: 'matte', shapes: [paint('fl', [1, 0, 0, 1])] }], assets: [{ id: 'matte', layers: [{ shapes: [paint('fl', [1, 0, 0, 1])] }] }] });
  const before = JSON.stringify(fixture), colored = colorCapituloIcon(fixture), items = colored.layers[0].shapes;
  assert.equal(CAPITULO_ICON_INK, '#8c453b'); assert.equal(CAPITULO_ICON_PAPER, '#f8f7f3');
  assert.deepEqual(items[0].c.k, [...ink, .75]); assert.equal(items[0].o.k, 68);
  assert.deepEqual(items[1].c.k, [...ink, 1]);
  assert.deepEqual(items[2].c.k, [248 / 255, 247 / 255, 243 / 255, .9]);
  for (const i of [3, 4, 5, 6]) assert.deepEqual(items[i], fixture.layers[0].shapes[i]);
  assert.deepEqual(colored.layers[1], fixture.layers[1]); assert.deepEqual(colored.assets, fixture.assets);
  assert.equal(JSON.stringify(fixture), before);
});

test('RGB and RGBA instance colors release only the AE color expression so live controllers cannot restore blue or cyan', () => {
  const expression = "var $bm_rt; $bm_rt = thisComp.layer('Main Stroke width - Color Ctrl').effect('Highlight')('Color');";
  const fixture = freeze({ layers: [
    { nm: 'Main Stroke width - Color Ctrl', ef: [{ nm: 'Highlight', ef: [{ ty: 2, v: { a: 0, k: [.53, .74, .94, 1] } }] }] },
    { shapes: [
      { ty: 'st', c: { a: 0, k: [0, 0, 0], x: expression }, o: { a: 0, k: 100 } },
      { ty: 'st', c: { a: 0, k: [.2, .8, .8, .75], x: expression }, o: { a: 0, k: 68 } },
      { ty: 'tr', p: { a: 0, k: [0, 0, 0], x: 'value + [Math.sin(time), 0]' } },
    ] },
  ] });
  assert.deepEqual(effectiveColor(fixture.layers[1].shapes[0], fixture), [.53, .74, .94, 1], 'Regression fixture reproduces the browser color');
  const colored = colorCapituloIcon(fixture), strokes = visibleStrokes(colored);
  assert.equal(strokes.length, 2);
  assert.deepEqual(strokes[0].c.k, ink); assert.deepEqual(strokes[1].c.k, [...ink, .75]);
  for (const stroke of strokes) { assert.equal(stroke.c.x, undefined); assert.deepEqual(effectiveColor(stroke, colored).slice(0, 3), ink); }
  assert.equal(strokes[1].o.k, 68); assert.deepEqual(colored.layers[1].shapes[2], fixture.layers[1].shapes[2]);
  assert.deepEqual(colored.layers[0], fixture.layers[0], 'The controller and timing are still archived in the instance');
  const chosen = colorCapituloIcon(fixture, { colors: { '#000000': '#336699', '#33cccc': 'transparent' } });
  assert.deepEqual(effectiveColor(chosen.layers[1].shapes[0], chosen), [.2, .4, .6]);
  assert.equal(chosen.layers[1].shapes[1].c.x, undefined); assert.equal(chosen.layers[1].shapes[1].c.k[3], 0); assert.equal(chosen.layers[1].shapes[1].o.k, 0);
});

test('all 13 registered originals (including 11 active icons) keep their bytes, geometry and masks with a uniform visible palette', () => {
  assert.equal(Object.keys(CAPITULO_ORIGINALS).length, 13);
  for (const [role, asset] of Object.entries(CAPITULO_ORIGINALS)) {
    const file = path.join(root, 'public', asset.localPath), bytes = fs.readFileSync(file), source = freeze(JSON.parse(bytes));
    const colored = colorCapituloIcon(source), before = paints(source), after = paints(colored);
    assert.equal(after.length, before.length, role); assert.deepEqual(colored.layers.map(layer => layer.ks), source.layers.map(layer => layer.ks), role);
    let changedStrokes = 0;
    for (let i = 0; i < before.length; i++) {
      const initial = before[i], next = after[i];
      assert.deepEqual(next.o, initial.o, `${role}: opacity`); assert.equal(next.c.k[3], initial.c.k[3], `${role}: alpha`);
      assert.deepEqual(Object.fromEntries(Object.entries(next).filter(([key]) => key !== 'c')), Object.fromEntries(Object.entries(initial).filter(([key]) => key !== 'c')), `${role}: shape and paths`);
      if (initial.ty === 'st' && JSON.stringify(initial.c.k) !== JSON.stringify(next.c.k)) {
        assert.deepEqual(next.c.k.slice(0, 3), ink, `${role}: visible stroke`); changedStrokes++;
      }
      if (initial.c.k.slice(0, 3).every(channel => channel === 1)) assert.deepEqual(next.c.k.slice(0, 3), [248 / 255, 247 / 255, 243 / 255], `${role}: paper interior`);
      if (initial.c.k[0] === 1 && initial.c.k[1] === 0 && initial.c.k[2] === 0) assert.deepEqual(next.c, initial.c, `${role}: red track matte`);
    }
    assert.ok(changedStrokes, `${role}: principal and accent strokes were recolored`);
    const strokes = visibleStrokes(colored); assert.ok(strokes.length, `${role}: visible strokes`);
    for (const stroke of strokes) {
      assert.equal(stroke.c.x, undefined, `${role}: instance paint cannot be replaced by an AE color expression`);
      assert.deepEqual(effectiveColor(stroke, colored).slice(0, 3), ink, `${role}: EVERY effective visible stroke uses terracotta`);
    }
    assert.deepEqual(fs.readFileSync(file), bytes, `${role}: archived bytes`);
  }
});

test('partial host overrides match original colors and leave the remaining artwork on its configured palette', () => {
  const fixture = freeze({ layers: [{ shapes: [
    { ty: 'st', c: { a: 0, k: [0, 0, 0, .6] }, o: { a: 0, k: 75 } },
    { ty: 'st', c: { a: 0, k: [.2, .8, .8, 1] }, o: { a: 0, k: 100 } },
    { ty: 'fl', c: { a: 0, k: [1, 1, 1, .8] }, o: { a: 0, k: 100 } },
  ] }] });
  const colored = paints(colorCapituloIcon(fixture, { iconColor: '#456', colors: { '#000000': '#336699' } }));
  assert.deepEqual(colored[0].c.k, [.2, .4, .6, .6]); assert.equal(colored[0].o.k, 75);
  assert.deepEqual(colored[1].c.k, [68 / 255, 85 / 255, 102 / 255, 1]);
  assert.deepEqual(colored[2].c.k, [248 / 255, 247 / 255, 243 / 255, .8]);
  const transparent = paints(colorCapituloIcon(fixture, { colors: { '#000000': 'transparent', '#ffffff': '#ffeecc' } }));
  assert.deepEqual(transparent[0].c.k, [0, 0, 0, 0]); assert.equal(transparent[0].o.k, 0);
  assert.deepEqual(transparent[1].c.k, [...ink, 1]); assert.deepEqual(transparent[2].c.k, [1, 238 / 255, .8, .8]);
});

test('Capitulo loads its local original only on approach and alternates playback without rewriting JSON', async () => {
  const source = CAPITULO_ORIGINALS.ceremony.localPath;
  await withIcon({}, async r => {
    assert.deepEqual(r.requests, []); assert.equal(animation(r), undefined);
    await r.reveal(true); assert.deepEqual(r.requests, [source]);
    assert.equal(r.tree().props['data-capitulo-original-icon'], source);
    assert.notEqual(animation(r).props.animationData, original); assert.deepEqual(animation(r).props.animationData.layers[0].shapes[0].c.k, [...ink, .75]); assert.equal(animation(r).props.autoplay, false); assert.equal(animation(r).props.loop, false);
    animation(r).props.onComplete(); assert.equal(r.calls.filter(call => call[0] === 'direction').at(-1)[1], -1);
    animation(r).props.onComplete(); assert.equal(r.calls.filter(call => call[0] === 'direction').at(-1)[1], 1);
    r.unmount(); assert.equal(r.observers[0].disconnected, true); assert.equal(r.calls.at(-1)[0], 'pause');
  });
});

test('palette, per-row playback speed and scale customize only the mounted instance', async () => {
  const before = JSON.stringify(original);
  await withIcon({ config: { iconScale: 1.5, sectionIconColors: { ceremony: { '#000000': '#336699' } }, sectionIconSpeeds: { ceremony: 1.75 } } }, async r => {
    await r.reveal(true);
    const rendered = animation(r).props.animationData;
    assert.notEqual(rendered, original); assert.deepEqual(rendered.layers[0].shapes[0].c.k, [.2, .4, .6, .75]);
    assert.equal(r.tree().props.style.width, 126); assert.equal(r.calls.filter(call => call[0] === 'speed').at(-1)[1], 1.75);
    await r.update({ colors: { '#000000': 'transparent' }, speed: 2.25 });
    assert.equal(animation(r).props.animationData.layers[0].shapes[0].o.k, 0); assert.equal(r.calls.filter(call => call[0] === 'speed').at(-1)[1], 2.25);
    await r.update({ config: { iconColor: '#abcdef' }, colors: {} });
    assert.deepEqual(animation(r).props.animationData.layers[0].shapes[0].c.k, [171 / 255, 205 / 255, 239 / 255, .75]);
    assert.equal(JSON.stringify(original), before, 'Original animation remains byte-equivalent after instance changes');
  });
});

test('an explicitly cleared or unsafe icon stays absent and full archived URLs resolve to the local copy', async () => {
  for (const src of ['', 'javascript:alert(1)', '//foreign.example/icon.json', 'https://user:password@example.com/icon.json', '/not-a-media-file', 'https://example.com/not-media']) {
    await withIcon({ src }, async r => { assert.equal(r.tree(), null, src); assert.deepEqual(r.requests, []); });
  }
  await withIcon({ src: CAPITULO_ORIGINALS.ceremony.source }, async r => {
    await r.reveal(true); assert.deepEqual(r.requests, [CAPITULO_ORIGINALS.ceremony.localPath]);
    await r.update({ src: '' }); assert.equal(r.tree(), null, 'Clearing a previously loaded icon cannot revive the default');
  });
});

test('safe IconPicker images remain visible and stale image events cannot overwrite the current source status', async () => {
  await withIcon({ config: { sectionIcons: { ceremony: '/qa-static.png' } } }, async r => {
    const first = nodes(r.tree(), node => node.type === 'img')[0];
    assert.ok(first); assert.equal(first.props.src, '/qa-static.png'); assert.equal(first.props.alt, ''); assert.equal(first.props.loading, 'lazy');
    assert.equal(r.tree().props['data-capitulo-original-icon-state'], 'pending');
    await r.reveal(true); assert.deepEqual(r.requests, [], 'Static images never enter the JSON loader');
    first.props.onLoad(); await r.flush(); assert.equal(r.tree().props['data-capitulo-original-icon-state'], 'ready');
    await r.update({ src: '/qa-second.svg?v=2' });
    const second = nodes(r.tree(), node => node.type === 'img')[0];
    assert.equal(second.props.src, '/qa-second.svg?v=2'); assert.equal(r.tree().props['data-capitulo-original-icon-state'], 'pending');
    first.props.onLoad(); first.props.onError(); await r.flush();
    assert.equal(r.tree().props['data-capitulo-original-icon-state'], 'pending', 'Prior source events cannot settle the newly chosen image');
    second.props.onError(); await r.flush(); assert.equal(r.tree().props['data-capitulo-original-icon-state'], 'unavailable');
    first.props.onLoad(); await r.flush(); assert.equal(r.tree().props['data-capitulo-original-icon-state'], 'unavailable');
    second.props.onLoad(); await r.flush(); assert.equal(r.tree().props['data-capitulo-original-icon-state'], 'ready');
    await r.update({ src: 'https://qa.example/host-image.webp' });
    assert.equal(nodes(r.tree(), node => node.type === 'img')[0].props.src, 'https://qa.example/host-image.webp');
    assert.equal(r.tree().props['data-capitulo-original-icon-state'], 'pending'); assert.deepEqual(r.requests, []);
    await r.update({ src: '' }); assert.equal(r.tree(), null);
  });
});

test('viewport, page visibility, reduced motion, save-data and closed entry pause the original', async () => {
  await withIcon({}, async r => {
    await r.reveal(true);
    for (const [key, paused] of [['pageVisible', false], ['reducedMotion', true], ['saveData', true], ['ready', false]]) {
      await r.preference({ [key]: paused }); assert.equal(r.calls.at(-1)[0], 'pause');
      await r.preference({ [key]: !paused }); assert.equal(r.calls.at(-1)[0], 'play');
    }
    await r.arm(false); assert.equal(r.calls.at(-1)[0], 'pause'); await r.arm(true); assert.equal(r.calls.at(-1)[0], 'play');
    await r.reveal(false); assert.equal(r.calls.at(-1)[0], 'pause'); await r.reveal(true); assert.equal(r.calls.at(-1)[0], 'play');
    await r.preference({ reducedMotion: true }); animation(r).props.onDOMLoaded();
    assert.deepEqual(r.calls.filter(call => call[0] === 'seek').at(-1), ['seek', 30, true]); assert.equal(r.calls.at(-1)[0], 'pause');
    assert.deepEqual(animation(r).props.animationData.layers[0].shapes[0].c.k, [...ink, .75]);
  });
});

test('replaced and disposed pending JSON cannot revive an obsolete icon, while missing originals stay empty', async () => {
  const first = deferred(), second = deferred(), third = deferred();
  await withIcon({ src: '/first.json' }, async r => {
    await r.reveal(true); await r.update({ src: '/second.json' }); first.resolve({ ...original, nm: 'obsolete' }); await r.flush();
    assert.equal(animation(r), undefined);
    const chosen = { ...original, nm: 'chosen' }; second.resolve(chosen); await r.flush(); assert.equal(animation(r).props.animationData.nm, 'chosen'); assert.deepEqual(animation(r).props.animationData.layers[0].shapes[0].c.k, [...ink, .75]);
    await r.update({ src: '/third.json' }); r.unmount(); third.resolve(original); await r.flush(); assert.equal(r.late(), 0);
  }, { pending: { '/first.json': first, '/second.json': second, '/third.json': third } });
  await withIcon({ src: '/missing.json' }, async r => {
    await r.reveal(true); assert.equal(animation(r), undefined); assert.equal(r.tree().props['data-capitulo-original-icon-state'], 'unavailable');
  }, { pending: { '/missing.json': { promise: Promise.resolve(null) } } });
});
