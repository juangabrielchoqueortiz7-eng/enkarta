// Actual component hooks and event handlers with synthetic DOM/audio in RAM.
// No browser, physical gestures, downloads or production requests are performed.
'use strict';
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = require.extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText, file);
const React = require('react');
const stub = (file, exports) => { require.cache[require.resolve(file)] = { exports }; };
stub('react-dom', { createPortal: value => value });
stub('framer-motion', { useReducedMotion: () => false, AnimatePresence: () => null, motion: { div: 'motion.div' } });
stub('../src/lib/scroll-motion.tsx', { ScrollReveal: () => null });
stub('../src/components/invitations/blocks/typography.ts', { useBlockTypography: () => ({}) });
stub('../src/components/invitations/blocks/theme.tsx', { useBlockDesign: () => ({}), useBlockIconTheme: () => ({}) });
stub('../src/lib/marfil-visual-system.ts', { hasInvitationVisualSystem: () => false });
stub('../src/components/invitations/blocks/editorial-icons.tsx', { EditorialEventIcon: () => null, EDITORIAL_ICON_NAMES: [] });
stub('../src/components/invitations/entry/scenes.tsx', { EntryScene: () => null });
let analytics = [];
stub('../src/components/invitations/InvitationAnalytics.tsx', { emitInvitationAnalytics: value => analytics.push(value) });
const Music = require('../src/components/invitations/MusicPlayer.tsx').default;
const Entry = require('../src/components/invitations/EntryGate.tsx').default;
const { Lightbox, FadeImg, MasonryGallery } = require('../src/components/invitations/shared.tsx');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const nodes = (el, match) => !React.isValidElement(el) ? [] : [...(match(el) ? [el] : []), ...React.Children.toArray(el.props.children).flatMap(child => nodes(child, match))];
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(text).join(' ') : React.isValidElement(value) ? text(value.props.children) : '';
const touch = (id, x, y) => ({ identifier: id, clientX: x, clientY: y });
const touchEvent = (touches, changedTouches = []) => ({ touches, changedTouches });

async function withUI(Component, input, scenario, { play, overflow = 'clip', complete = false } = {}) {
  const hookNames = ['useState', 'useRef', 'useEffect', 'useCallback', 'useMemo'];
  const hooks = Object.fromEntries(hookNames.map(name => [name, React[name]]));
  const globalNames = ['window', 'document', 'CustomEvent', 'fetch'];
  const globals = Object.fromEntries(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]));
  const slots = [], events = new EventTarget(), indexChanges = [];
  let cursor = 0, dirty = true, effects = [], tree, unmounted = false, late = 0, closes = 0, pauses = 0, plays = 0, attrs = new Set();
  analytics = [];
  let props = { ...input };
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  React.useState = initial => { const i = cursor++; if (!slots[i]) { const slot = slots[i] = { value: typeof initial === 'function' ? initial() : initial }; slot.set = value => { if (unmounted) { late++; return; } const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; } return [slots[i].value, slots[i].set]; };
  React.useRef = initial => { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); };
  React.useMemo = (compute, deps) => { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: compute() }; return slots[i].value; };
  React.useCallback = (callback, deps) => React.useMemo(() => callback, deps);
  React.useEffect = (effect, deps) => { const i = cursor++, old = slots[i]; if (!old || !same(old.deps, deps)) { const slot = slots[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); }); } };
  const trigger = { isConnected: true, focus() { global.document.activeElement = trigger; } };
  const audio = Object.assign(new EventTarget(), { paused: true, source: props.src ?? '/qa-track-one.mp3', getAttribute(name) { assert.equal(name, 'src'); return this.source; }, play() { plays++; return play ? play(audio, plays) : (audio.paused = false, audio.dispatchEvent(new Event('play')), Promise.resolve()); }, pause() { pauses++; audio.paused = true; audio.dispatchEvent(new Event('pause')); } });
  const image = { complete };
  const controls = Array.from({ length: 6 }, () => ({ focus() { global.document.activeElement = this; } }));
  const dialog = { querySelector: () => controls[0], querySelectorAll: () => controls };
  const heading = { focus() { global.document.activeElement = heading; } };
  const content = { setAttribute: name => attrs.add(name), removeAttribute: name => attrs.delete(name), querySelector: selector => selector.includes('audio') ? audio : heading };
  global.window = events;
  global.document = { activeElement: trigger, body: { style: { overflow } } };
  global.CustomEvent = class extends Event { constructor(type, options) { super(type); this.detail = options?.detail; } };
  global.fetch = () => assert.fail('Media regressions must not perform network requests');
  const onClose = () => { closes++; };
  const onIndex = index => { indexChanges.push(index); props.index = index; dirty = true; };
  if (Component === Lightbox) props = { ...props, onClose, onIndex };
  const attach = () => {
    for (const element of nodes(tree, node => node.ref)) {
      const ref = element.ref;
      if (typeof ref !== 'object') continue;
      if (element.type === 'audio') { ref.current = audio; audio.source = element.props.src; }
      else if (Component === FadeImg && element.type === 'img') ref.current = image;
      else if (Component === Entry) ref.current = element.props['data-entry-gate'] !== undefined ? dialog : content;
      else if (Component === Lightbox && element.props.role === 'dialog') ref.current = dialog;
    }
  };
  const flush = async () => {
    for (let round = 0; round < 35; round++) {
      if (dirty && !unmounted) { dirty = false; cursor = 0; effects = []; tree = Component(props); attach(); for (const effect of effects) effect(); }
      await new Promise(done => setImmediate(done));
      if (!dirty || unmounted) return tree;
    }
    throw Error('Guest media hooks did not settle');
  };
  const unmount = () => { if (unmounted) return; unmounted = true; for (const slot of slots) slot?.cleanup?.(); };
  const runner = { tree: () => tree, flush, unmount, audio, image, controls, trigger, attrs, indexChanges, closes: () => closes, late: () => late, plays: () => plays, pauses: () => pauses, analytics: () => analytics, overflow: () => global.document.body.style.overflow,
    update: async patch => { props = { ...props, ...patch }; dirty = true; await flush(); }, dispatch: event => events.dispatchEvent(event),
    key: key => { const event = new Event('keydown', { cancelable: true }); event.key = key; events.dispatchEvent(event); return event; },
  };
  try { await flush(); await scenario(runner); } finally { unmount(); for (const name of hookNames) React[name] = hooks[name]; for (const name of globalNames) { if (globals[name]) Object.defineProperty(global, name, globals[name]); else delete global[name]; } }
}
const button = runner => nodes(runner.tree(), node => node.type === 'button')[0];
const dialog = runner => nodes(runner.tree(), node => node.props.role === 'dialog')[0];

test('music reflects actual play/pause events, keeps original src and starts only after a gesture', async () => {
  await withUI(Music, { src: '/music/qa-original.mp3' }, async r => {
    assert.equal(r.plays(), 0); const media = nodes(r.tree(), n => n.type === 'audio')[0]; assert.equal(media.props.src, '/music/qa-original.mp3'); assert.equal(media.props.preload, 'none');
    button(r).props.onClick(); await r.flush(); assert.equal(button(r).props['aria-label'], 'Pausar música');
    button(r).props.onClick(); await r.flush(); assert.equal(button(r).props['aria-label'], 'Reproducir música'); assert.equal(r.audio.paused, true);
  });
});
test('a second tap cancels pending music playback and its late rejection cannot show an error', async () => {
  const wait = deferred(); await withUI(Music, { src: '/qa-one.mp3' }, async r => {
    const click = button(r).props.onClick; click(); click(); await r.flush(); assert.equal(r.plays(), 1); assert.equal(r.audio.paused, true);
    wait.reject(Error('late canceled play')); await r.flush(); assert.equal(nodes(r.tree(), n => n.props.role === 'status').length, 0);
  }, { play: () => wait.promise });
});
test('music timeout ends a stalled play, pauses it and allows an explicit retry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const wait = deferred();
  await withUI(Music, { src: '/qa-one.mp3' }, async r => {
    button(r).props.onClick(); await r.flush(); t.mock.timers.tick(25000); await r.flush(); assert.equal(r.audio.paused, true); assert.match(text(r.tree()), /Toca el botón para reintentar/);
    button(r).props.onClick(); await r.flush(); assert.equal(r.plays(), 2);
    wait.reject(Error('late')); await r.flush(); assert.equal(r.late(), 0);
  }, { play: (audio, count) => count === 1 ? wait.promise : (audio.paused = false, Promise.resolve()) });
});
test('changing tracks ignores an earlier play rejection and cleans playback on unmount', async () => {
  const wait = deferred(); await withUI(Music, { src: '/qa-one.mp3' }, async r => {
    button(r).props.onClick(); await r.flush(); await r.update({ src: '/qa-two.mp3' });
    wait.reject(Error('old track')); await r.flush(); assert.equal(nodes(r.tree(), n => n.props.role === 'status').length, 0);
    r.unmount(); assert.equal(r.audio.paused, true); assert.equal(r.late(), 0);
  }, { play: () => wait.promise });
});
test('unmounting pending music removes listeners and rejects late work without writing UI', async () => {
  const wait = deferred(); await withUI(Music, { src: '/qa-one.mp3' }, async r => {
    button(r).props.onClick(); r.unmount(); wait.reject(Error('late unmounted')); r.audio.dispatchEvent(new Event('play')); await r.flush(); assert.equal(r.late(), 0); assert.equal(r.audio.paused, true);
  }, { play: () => wait.promise });
});
test('entry audio errors target only their own player', async () => {
  await withUI(Music, { src: '/qa-one.mp3' }, async r => {
    r.dispatch(new CustomEvent('enkarta:audio-error', { detail: { audio: {} } })); await r.flush(); assert.equal(nodes(r.tree(), n => n.props.role === 'status').length, 0);
    r.dispatch(new CustomEvent('enkarta:audio-error', { detail: { audio: r.audio } })); await r.flush(); assert.equal(nodes(r.tree(), n => n.props.role === 'status').length, 1);
  });
});
test('lightbox clamps removed-photo indexes and preserves title, caption and original photo source', async () => {
  await withUI(Lightbox, { images: ['/qa-one.jpg', '/qa-two.jpg'], captions: [{ title: 'QA title', caption: 'QA caption' }], index: 40 }, async r => {
    assert.equal(nodes(r.tree(), n => n.type === 'img')[0].props.src, '/qa-two.jpg'); assert.match(text(r.tree()), /2\s*\/\s*2/);
    await r.update({ images: ['/qa-one.jpg'] }); assert.equal(nodes(r.tree(), n => n.type === 'img')[0].props.src, '/qa-one.jpg'); assert.match(text(r.tree()), /QA title/); assert.match(text(r.tree()), /QA caption/);
  });
});
test('an empty lightbox neither locks scrolling nor consumes keyboard input', async () => {
  await withUI(Lightbox, { images: [], index: 1 }, async r => {
    assert.equal(r.tree(), null); assert.equal(r.overflow(), 'clip');
    assert.equal(r.key('ArrowRight').defaultPrevented, false); assert.deepEqual(r.indexChanges, []);
  });
});
test('lightbox keyboard navigation composes same-turn keys, blocks scroll and restores prior focus and scroll', async () => {
  await withUI(Lightbox, { images: ['/qa-one.jpg', '/qa-two.jpg', '/qa-three.jpg'], index: 0 }, async r => {
    assert.equal(r.overflow(), 'hidden'); r.key('ArrowRight'); r.key('ArrowRight'); await r.flush(); assert.deepEqual(r.indexChanges, [1, 2]);
    r.key('ArrowLeft'); await r.flush(); assert.equal(r.indexChanges.at(-1), 1);
    r.key('Escape'); assert.equal(r.closes(), 1); r.unmount(); assert.equal(r.overflow(), 'clip'); assert.equal(document.activeElement, r.trigger);
  });
});
test('canceled, multi-touch and unrelated-finger swipes do not change or close the photo', async () => {
  await withUI(Lightbox, { images: ['/qa-one.jpg', '/qa-two.jpg'], index: 0 }, async r => {
    const d = dialog(r).props;
    d.onTouchStart(touchEvent([touch(1, 200, 100)])); d.onTouchCancel(); d.onTouchEnd(touchEvent([], [touch(1, 0, 100)]));
    d.onTouchStart(touchEvent([touch(1, 200, 100)])); d.onTouchStart(touchEvent([touch(1, 200, 100), touch(2, 100, 100)])); d.onTouchEnd(touchEvent([], [touch(1, 0, 100)]));
    d.onTouchStart(touchEvent([touch(1, 200, 100)])); d.onTouchEnd(touchEvent([], [touch(2, 0, 400)]));
    assert.deepEqual(r.indexChanges, []); assert.equal(r.closes(), 0);
    d.onTouchStart(touchEvent([touch(3, 200, 100)])); d.onTouchEnd(touchEvent([], [touch(3, 0, 100)])); assert.deepEqual(r.indexChanges, [1]);
  });
});
test('lightbox accepts deliberate single-finger down-close and its close button stops backdrop bubbling', async () => {
  await withUI(Lightbox, { images: ['/qa-one.jpg'], index: 0 }, async r => {
    const d = dialog(r).props; d.onTouchStart(touchEvent([touch(1, 100, 100)])); d.onTouchEnd(touchEvent([], [touch(1, 100, 200)])); assert.equal(r.closes(), 1);
    let stopped = false; button(r).props.onClick({ stopPropagation() { stopped = true; } }); assert.equal(stopped, true); assert.equal(r.closes(), 2);
  });
});
test('FadeImg composes consumer load/error callbacks and hides a newly selected image until ready', async () => {
  const calls = []; await withUI(FadeImg, { src: '/qa-one.jpg', alt: 'QA accessible', onLoad: () => calls.push('load'), onError: () => calls.push('error') }, async r => {
    assert.equal(r.tree().props.style.opacity, 0); r.tree().props.onLoad({}); await r.flush(); assert.equal(r.tree().props.style.opacity, 1); assert.deepEqual(calls, ['load']);
    await r.update({ src: '/qa-two.jpg' }); assert.equal(r.tree().props.style.opacity, 0); r.tree().props.onError({}); await r.flush(); assert.equal(r.tree().props.style.opacity, 1); assert.equal(r.tree().props.alt, 'QA accessible'); assert.deepEqual(calls, ['load', 'error']);
  });
});
test('cached FadeImg is visible without a repeated load event', async () => {
  await withUI(FadeImg, { src: '/qa-cached.jpg' }, async r => { assert.equal(r.tree().props.style.opacity, 1); }, { complete: true });
});
for (const variant of ['grid', 'polaroid', 'rounded']) test(`MasonryGallery ${variant} supports Enter and Space without changing its composition`, async () => {
  await withUI(MasonryGallery, { images: ['/qa-one.jpg', '/qa-two.jpg'], variant }, async r => {
    const figures = nodes(r.tree(), n => n.type === 'figure' && n.props.role === 'button'); assert.equal(figures.length, 2); assert.equal(figures[0].props.tabIndex, 0);
    for (const key of ['Enter', ' ']) { let prevented = false; figures[1].props.onKeyDown({ key, preventDefault() { prevented = true; } }); await r.flush(); assert.equal(prevented, true); assert.equal(nodes(r.tree(), n => n.type === Lightbox)[0].props.index, 1); }
  });
});
test('EntryGate preserves the preexisting scroll lock, deduplicates opening and reveals content after its timer', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withUI(Entry, { names: 'QA ficticia', initials: 'QA', children: React.createElement('h1', {}, 'QA content') }, async r => {
    assert.equal(r.overflow(), 'hidden'); assert.equal(r.attrs.has('inert'), true); const gate = nodes(r.tree(), n => n.props['data-entry-gate'] !== undefined)[0];
    gate.props.onClick(); gate.props.onClick(); await r.flush(); assert.equal(r.plays(), 1); assert.deepEqual(r.analytics(), ['entry_open']);
    t.mock.timers.tick(1100); await r.flush(); nodes(r.tree(), n => n.props['data-entry-gate'] !== undefined)[0].props.onAnimationComplete(); await r.flush(); assert.equal(r.attrs.has('inert'), false); assert.equal(r.overflow(), 'clip');
  });
});
test('EntryGate removes reveal timers and ignores audio failures after unmount', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const wait = deferred();
  await withUI(Entry, { names: 'QA ficticia', initials: 'QA', children: 'QA' }, async r => {
    nodes(r.tree(), n => n.props['data-entry-gate'] !== undefined)[0].props.onClick(); await r.flush(); r.unmount(); wait.reject(Error('late entry audio')); t.mock.timers.tick(2000); await r.flush(); assert.equal(r.late(), 0); assert.equal(r.overflow(), 'clip');
  }, { play: () => wait.promise });
});
test('EntryGate scopes playback failure to its audio and rejects old source failures', async () => {
  const wait = deferred(); await withUI(Entry, { names: 'QA ficticia', initials: 'QA', children: 'QA' }, async r => {
    const failures = []; window.addEventListener('enkarta:audio-error', event => failures.push(event.detail.audio));
    nodes(r.tree(), n => n.props['data-entry-gate'] !== undefined)[0].props.onClick(); await r.flush(); r.audio.source = '/qa-later.mp3'; wait.reject(Error('old source')); await r.flush(); assert.deepEqual(failures, []);
  }, { play: () => wait.promise });
});
