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

test('Capitulo loads its local original only on approach and alternates playback without rewriting JSON', async () => {
  const source = CAPITULO_ORIGINALS.ceremony.localPath;
  await withIcon({}, async r => {
    assert.deepEqual(r.requests, []); assert.equal(animation(r), undefined);
    await r.reveal(true); assert.deepEqual(r.requests, [source]);
    assert.equal(r.tree().props['data-capitulo-original-icon'], source);
    assert.equal(animation(r).props.animationData, original); assert.equal(animation(r).props.autoplay, false); assert.equal(animation(r).props.loop, false);
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
    assert.notEqual(rendered, original); assert.deepEqual(rendered.layers[0].shapes[0].c.k, [.2, .4, .6, 1]);
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
    assert.equal(animation(r).props.animationData, original);
  });
});

test('replaced and disposed pending JSON cannot revive an obsolete icon, while missing originals stay empty', async () => {
  const first = deferred(), second = deferred(), third = deferred();
  await withIcon({ src: '/first.json' }, async r => {
    await r.reveal(true); await r.update({ src: '/second.json' }); first.resolve({ ...original, nm: 'obsolete' }); await r.flush();
    assert.equal(animation(r), undefined);
    const chosen = { ...original, nm: 'chosen' }; second.resolve(chosen); await r.flush(); assert.equal(animation(r).props.animationData, chosen);
    await r.update({ src: '/third.json' }); r.unmount(); third.resolve(original); await r.flush(); assert.equal(r.late(), 0);
  }, { pending: { '/first.json': first, '/second.json': second, '/third.json': third } });
  await withIcon({ src: '/missing.json' }, async r => {
    await r.reveal(true); assert.equal(animation(r), undefined); assert.equal(r.tree().props['data-capitulo-original-icon-state'], 'unavailable');
  }, { pending: { '/missing.json': { promise: Promise.resolve(null) } } });
});
