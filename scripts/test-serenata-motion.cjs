// Execute the Serenata original-icon lifecycle with in-memory media and Lottie doubles.
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
const { SERENATA_ORIGINALS } = require('../src/lib/serenata-assets.ts');
const Icon = require('../src/components/invitations/SerenataOriginalIcon.tsx').default;
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
    throw Error('Serenata icon hooks did not settle');
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

test('the exact Serenata original loads on approach, plays only when allowed and stays cleared after removal', async () => {
  await withIcon({}, async r => {
    assert.deepEqual(r.requests, []); assert.equal(animation(r), undefined);
    await r.reveal(true); assert.deepEqual(r.requests, [SERENATA_ORIGINALS.ceremony.localPath]);
    assert.equal(r.tree().props['data-serenata-original-icon'], SERENATA_ORIGINALS.ceremony.localPath);
    assert.equal(animation(r).props.autoplay, false); assert.equal(r.calls.at(-1)[0], 'play');
    await r.update({ src: '' }); assert.equal(r.tree(), null);
    assert.equal(r.requests.length, 1, 'Clearing cannot restore the original');
    r.unmount(); assert.equal(r.observers[0].disconnected, true); assert.equal(r.calls.at(-1)[0], 'pause');
  });
});

test('explicit per-instance colors, speed and scale preserve archived geometry and opacity', async () => {
  const before = JSON.stringify(original);
  await withIcon({ config: { iconScale: 1.25, sectionIconColors: { ceremony: { '#000000': '#336699' } }, sectionIconSpeeds: { ceremony: 1.5 } } }, async r => {
    await r.reveal(true);
    assert.deepEqual(animation(r).props.animationData.layers[0].shapes[0].c.k, [.2, .4, .6, .75]);
    assert.equal(animation(r).props.animationData.layers[0].shapes[0].o.k, 80);
    assert.equal(r.tree().props.style.width, 105); assert.equal(r.calls.filter(c => c[0] === 'speed').at(-1)[1], 1.5);
    await r.update({ colors: { '#000000': 'transparent' }, speed: 2 });
    assert.equal(animation(r).props.animationData.layers[0].shapes[0].o.k, 0);
    assert.equal(r.calls.filter(c => c[0] === 'speed').at(-1)[1], 2);
    assert.equal(JSON.stringify(original), before);
  });
});

test('the preserved original heart keeps its complete unmodified animation data', async () => {
  await withIcon({ role: 'hearts', preserveOriginal: true }, async r => {
    await r.reveal(true); assert.deepEqual(r.requests, [SERENATA_ORIGINALS.hearts.localPath]);
    assert.equal(animation(r).props.animationData, original, 'A preserved original is not replaced by an approximate drawing or palette');
    await r.reveal(false); assert.equal(r.calls.at(-1)[0], 'pause');
  });
});

test('media preferences and entry gating pause playback; stale loads and disposal cannot revive a replaced icon', async () => {
  await withIcon({}, async r => {
    await r.reveal(true);
    for (const [key, stop] of [['pageVisible', false], ['reducedMotion', true], ['saveData', true], ['ready', false]]) {
      await r.preference({ [key]: stop }); assert.equal(r.calls.at(-1)[0], 'pause');
      await r.preference({ [key]: !stop }); assert.equal(r.calls.at(-1)[0], 'play');
    }
    await r.arm(false); assert.equal(r.calls.at(-1)[0], 'pause');
    await r.arm(true); assert.equal(r.calls.at(-1)[0], 'play');
  });
  const first = deferred(), second = deferred();
  await withIcon({ src: '/qa-first.json' }, async r => {
    await r.reveal(true); await r.update({ src: '/qa-second.json' });
    first.resolve({ ...original, nm: 'obsolete' }); await r.flush(); assert.equal(animation(r), undefined);
    r.unmount(); second.resolve({ ...original, nm: 'disposed' }); await r.flush(); assert.equal(r.late(), 0);
  }, { pending: { '/qa-first.json': first, '/qa-second.json': second } });
});
