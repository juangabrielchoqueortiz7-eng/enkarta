// Executes the original-icon component hooks with in-memory viewport/Lottie doubles.
'use strict';
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = require.extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText, file);
const React = require('react');
const stub = (file, exports) => { require.cache[require.resolve(file)] = { exports }; };
const Lottie = () => null;
let policy, armed, loader;
stub('next/dynamic', () => Lottie);
stub('../src/lib/use-media-preferences.ts', { useMediaPreferences: () => policy });
stub('../src/lib/scroll-motion.tsx', { usePageMotion: () => ({ armed }) });
const utils = require('../src/lib/lottie-utils.ts');
stub('../src/lib/lottie-utils.ts', { ...utils, loadLottieByPath: (src, options) => { assert.deepEqual(options, { fallback: false }); return loader(src); } });
const Icon = require('../src/components/invitations/ParadiseReferenceIcon.tsx').default;
const original = Object.freeze({ v: '5.7.4', ip: 0, op: 60, layers: [] });
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const nodes = (el, match) => !React.isValidElement(el) ? [] : [...(match(el) ? [el] : []), ...React.Children.toArray(el.props.children).flatMap(child => nodes(child, match))];

async function withIcon(input, scenario, { pending = {} } = {}) {
  const names = ['useState', 'useRef', 'useEffect', 'useMemo'], hooks = Object.fromEntries(names.map(name => [name, React[name]]));
  const globalNames = ['window', 'IntersectionObserver', 'fetch'], saved = Object.fromEntries(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]));
  let props = { ...input }, cursor = 0, dirty = true, effects = [], tree, unmounted = false, late = 0;
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
  global.fetch = () => assert.fail('The icon hook regressions must not contact the network');
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
    throw Error('Icon hooks did not settle');
  };
  const unmount = () => { if (unmounted) return; unmounted = true; for (const slot of slots) slot?.cleanup?.(); };
  const runner = { tree: () => tree, calls, requests, observers, player, flush, unmount, late: () => late,
    reveal: async visible => { observers[0].callback([{ isIntersecting: visible }]); await flush(); },
    update: async patch => { props = { ...props, ...patch }; dirty = true; await flush(); },
    preference: async patch => { policy = { ...policy, ...patch }; dirty = true; await flush(); },
    arm: async value => { armed = value; dirty = true; await flush(); },
  };
  try { await flush(); await scenario(runner); } finally { unmount(); for (const name of names) React[name] = hooks[name]; for (const name of globalNames) { if (saved[name]) Object.defineProperty(global, name, saved[name]); else delete global[name]; } }
}

test('original icons defer loading and alternate forward/backward exactly as the reference, without rewriting their JSON', async () => {
  const source = '/lottie/invitali-originales/2025-05-17-Iglesia.json';
  await withIcon({ src: source, reverse: true }, async r => {
    assert.deepEqual(r.requests, []); assert.equal(nodes(r.tree(), node => node.type === Lottie).length, 0);
    await r.reveal(true); assert.deepEqual(r.requests, [source]);
    const animation = nodes(r.tree(), node => node.type === Lottie)[0];
    assert.equal(animation.props.animationData, original); assert.equal(animation.props.autoplay, false); assert.equal(animation.props.loop, false);
    assert.equal(r.calls.filter(call => call[0] === 'direction').at(-1)[1], 1); assert.ok(r.calls.some(call => call[0] === 'play'));
    animation.props.onComplete(); assert.equal(r.calls.filter(call => call[0] === 'direction').at(-1)[1], -1);
    animation.props.onComplete(); assert.equal(r.calls.filter(call => call[0] === 'direction').at(-1)[1], 1);
    assert.deepEqual(original, { v: '5.7.4', ip: 0, op: 60, layers: [] });
    r.unmount(); assert.equal(r.observers[0].disconnected, true); assert.equal(r.calls.at(-1)[0], 'pause');
  });
});

test('icon playback pauses for viewport, visibility, reduced motion, save-data and closed entry without losing its JSON', async () => {
  await withIcon({ src: '/original-icon.json' }, async r => {
    await r.reveal(true);
    for (const [key, off] of [['pageVisible', false], ['reducedMotion', true], ['saveData', true], ['ready', false]]) {
      await r.preference({ [key]: off }); assert.equal(r.calls.at(-1)[0], 'pause');
      await r.preference({ [key]: !off }); assert.equal(r.calls.at(-1)[0], 'play');
    }
    await r.arm(false); assert.equal(r.calls.at(-1)[0], 'pause'); await r.arm(true); assert.equal(r.calls.at(-1)[0], 'play');
    await r.reveal(false); assert.equal(r.calls.at(-1)[0], 'pause'); await r.reveal(true); assert.equal(r.calls.at(-1)[0], 'play');
    await r.update({ active: false }); assert.equal(r.calls.at(-1)[0], 'pause');
    assert.deepEqual(r.requests, ['/original-icon.json']);
  });
});

test('a completed reverse cycle stays paused while hidden, resumes its new direction and resets forward for a new source', async () => {
  await withIcon({ src: '/first.json', reverse: true }, async r => {
    await r.reveal(true); await r.preference({ pageVisible: false });
    nodes(r.tree(), node => node.type === Lottie)[0].props.onComplete();
    assert.equal(r.calls.filter(call => call[0] === 'direction').at(-1)[1], -1); assert.equal(r.calls.at(-1)[0], 'pause');
    await r.preference({ pageVisible: true }); assert.equal(r.calls.at(-1)[0], 'play');
    await r.update({ src: '/second.json' }); assert.equal(r.calls.filter(call => call[0] === 'direction').at(-1)[1], 1);
    await r.update({ reverse: false }); assert.equal(nodes(r.tree(), node => node.type === Lottie)[0].props.loop, true);
  });
});

test('a newly loaded paused icon shows the original middle frame and preserves its data', async () => {
  await withIcon({ src: '/original-music.json', active: false }, async r => {
    await r.reveal(true);
    const animation = nodes(r.tree(), node => node.type === Lottie)[0];
    animation.props.onDOMLoaded();
    assert.deepEqual(r.calls.filter(call => call[0] === 'seek').at(-1), ['seek', 30, true]);
    assert.equal(r.calls.at(-1)[0], 'pause');
    assert.equal(animation.props.animationData, original);
    const seeks = r.calls.filter(call => call[0] === 'seek').length;
    await r.update({ active: true }); await r.update({ active: false });
    assert.equal(r.calls.filter(call => call[0] === 'seek').length, seeks);
    assert.equal(r.calls.at(-1)[0], 'pause');
  });
});

test('reduced motion uses a static original pose on load while a running animation retains its current frame when paused', async () => {
  await withIcon({ src: '/original-motion.json' }, async r => {
    await r.reveal(true);
    const activeAnimation = nodes(r.tree(), node => node.type === Lottie)[0];
    const before = r.calls.filter(call => call[0] === 'seek').length;
    activeAnimation.props.onDOMLoaded();
    assert.equal(r.calls.filter(call => call[0] === 'seek').length, before);
    await r.preference({ reducedMotion: true });
    assert.equal(r.calls.filter(call => call[0] === 'seek').length, before);
    nodes(r.tree(), node => node.type === Lottie)[0].props.onDOMLoaded();
    assert.deepEqual(r.calls.filter(call => call[0] === 'seek').at(-1), ['seek', 30, true]);
    assert.equal(r.calls.at(-1)[0], 'pause');
  });
});

test('a replaced or unmounted pending icon load cannot revive obsolete content or update disposed hooks', async () => {
  const first = deferred(), second = deferred(), third = deferred();
  await withIcon({ src: '/first.json' }, async r => {
    await r.reveal(true); await r.update({ src: '/second.json' }); first.resolve({ ...original, nm: 'obsolete' }); await r.flush();
    assert.equal(nodes(r.tree(), node => node.type === Lottie).length, 0);
    const chosen = { ...original, nm: 'chosen' }; second.resolve(chosen); await r.flush();
    assert.equal(nodes(r.tree(), node => node.type === Lottie)[0].props.animationData, chosen);
    await r.update({ src: '/third.json' }); r.unmount(); third.resolve({ ...original, nm: 'disposed' }); await r.flush(); assert.equal(r.late(), 0);
  }, { pending: { '/first.json': first, '/second.json': second, '/third.json': third } });
});

test('the strict original loader makes no placeholder request on 404, invalid JSON or network failure, preserving the legacy default', async () => {
  const saved = global.fetch, requests = [];
  const valid = { ...original, w: 50, h: 50, fr: 30 };
  try {
    global.fetch = async src => { requests.push(src); return { ok: src === '/lottie/_placeholder.json', json: async () => valid }; };
    assert.equal(await utils.loadLottieByPath('/missing-original.json', { fallback: false }), null);
    assert.deepEqual(requests, ['/missing-original.json']); requests.length = 0;
    assert.equal(await utils.loadLottieByPath('/legacy-missing.json'), valid);
    assert.deepEqual(requests, ['/legacy-missing.json', '/lottie/_placeholder.json']); requests.length = 0;
    global.fetch = async src => { requests.push(src); return { ok: true, json: async () => ({ message: 'not an animation' }) }; };
    assert.equal(await utils.loadLottieByPath('/invalid-original.json', { fallback: false }), null);
    assert.deepEqual(requests, ['/invalid-original.json']); requests.length = 0;
    global.fetch = async src => { requests.push(src); return { ok: true, json: async () => { throw Error('invalid JSON'); } }; };
    assert.equal(await utils.loadLottieByPath('/malformed-original.json', { fallback: false }), null);
    assert.deepEqual(requests, ['/malformed-original.json']); requests.length = 0;
    await assert.rejects(() => utils.loadLottieByPath('/legacy-malformed.json'), /invalid JSON/);
    assert.deepEqual(requests, ['/legacy-malformed.json']); requests.length = 0;
    global.fetch = async src => { requests.push(src); throw Error('offline'); };
    assert.equal(await utils.loadLottieByPath('/offline-original.json', { fallback: false }), null);
    assert.deepEqual(requests, ['/offline-original.json']); requests.length = 0;
    global.fetch = async src => { requests.push(src); return { ok: true, json: async () => valid }; };
    assert.equal(await utils.loadLottieByPath('/valid-original.json', { fallback: false }), valid);
    assert.deepEqual(valid, { v: '5.7.4', ip: 0, op: 60, layers: [], w: 50, h: 50, fr: 30 });
  } finally { global.fetch = saved; }
});

test('an unavailable original leaves the reference slot empty instead of drawing a substitute animation', async () => {
  await withIcon({ src: '/missing.json' }, async r => {
    await r.reveal(true);
    assert.equal(nodes(r.tree(), node => node.type === Lottie).length, 0);
    assert.equal(r.tree().props['data-paradise-original-icon-state'], 'unavailable');
  }, { pending: { '/missing.json': { promise: Promise.resolve(null) } } });
});
