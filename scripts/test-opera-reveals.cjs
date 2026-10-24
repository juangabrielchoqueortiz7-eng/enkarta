// Exercise the actual Opera scroll hook with controlled DOM, viewport and RAF.
// These lifecycle tests never fetch media or certify a rendered visual match.
'use strict';
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: file }).outputText, file);
const React = require('react');
let policy;
require.cache[require.resolve('../src/lib/use-media-preferences.ts')] = { exports: { useMediaPreferences: () => policy } };
const { useOperaReveals } = require('../src/lib/use-opera-reveals.ts');

// The small DOM double implements descendant selectors and closest ancestors,
// so choosing a whole section or an excluded control changes observable results.
class Element {
  constructor(tag, name, attrs = {}, children = []) {
    this.tagName = tag.toUpperCase(); this.name = name; this.attrs = { ...attrs }; this.children = [];
    this.style = { opacity: '', visibility: '', transform: '' }; this.animations = [];
    children.forEach(child => this.append(child));
  }
  append(child) { child.parentElement = this; this.children.push(child); return child; }
  hasAttribute(name) { return Object.hasOwn(this.attrs, name); }
  getAttribute(name) { return this.attrs[name] ?? null; }
  matches(selector) {
    selector = selector.trim();
    const descendant = selector.match(/^(.+)\s+([^\s]+)$/);
    if (descendant) return this.matches(descendant[2]) && !!this.parentElement?.closest(descendant[1]);
    const attribute = selector.match(/^\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]$/);
    return attribute ? this.hasAttribute(attribute[1]) && (attribute[2] === undefined || this.attrs[attribute[1]] === attribute[2]) : this.tagName === selector.toUpperCase();
  }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (selector.split(',').some(part => node.matches(part))) return node; return null; }
  querySelectorAll(selector) {
    const descendants = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
    return selector === '*' ? descendants : descendants.filter(node => selector.split(',').some(part => node.matches(part)));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  animate(keyframes, options) {
    const animation = { keyframes, options, cancelled: false, onfinish: null, cancel() { this.cancelled = true; } };
    this.animations.push(animation); return animation;
  }
}
const el = (tag, name, attrs, children) => new Element(tag, name, attrs, children);
const fixture = () => {
  const heading = el('h1', 'heading'), copy = el('p', 'copy'), secondCopy = el('p', 'second-copy'), thirdCopy = el('p', 'third-copy');
  const photo = el('img', 'photo', { 'data-opera-photo': '' }), unmarkedImage = el('img', 'unmarked-image');
  const excluded = [
    el('form', 'form', {}, [el('p', 'form-copy')]),
    el('details', 'details', {}, [el('h3', 'details-heading')]),
    el('div', 'status', { role: 'status' }, [el('p', 'status-copy')]),
    el('div', 'live', { 'aria-live': 'polite' }, [el('p', 'live-copy')]),
    el('div', 'carousel', { 'aria-roledescription': 'carrusel' }, [el('p', 'carousel-copy'), el('img', 'carousel-photo', { 'data-opera-photo': '' })]),
    el('span', 'icon', { 'data-opera-original-icon': '/qa-original.json' }, [el('p', 'icon-copy')]),
  ];
  const section = el('section', 'section', { 'data-opera-section': 'hero' }, [heading, copy, secondCopy, thirdCopy, photo, unmarkedImage, el('button', 'button'), ...excluded]);
  const outsideCopy = el('p', 'outside-copy');
  const content = el('div', 'root', {}, [section, outsideCopy]);
  const wrapper = el('main', 'wrapper', {}, [content]);
  return { content, wrapper, heading, copy, secondCopy, thirdCopy, photo, section, unmarkedImage, outsideCopy, excluded, eligible: [heading, copy, secondCopy, thirdCopy, photo] };
};

async function withReveals(scenario, input = {}) {
  const hooks = { useRef: React.useRef, useEffect: React.useEffect };
  const globalNames = ['window', 'document', 'navigator', 'IntersectionObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'fetch', 'Element', 'HTMLElement'];
  const saved = Object.fromEntries(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]));
  const install = (name, value) => Object.defineProperty(global, name, { configurable: true, writable: true, value });
  const dom = fixture(), listeners = new Map(), frames = new Map(), scheduled = [], cancelledFrames = [], observers = [], slots = [];
  const ref = { current: input.missingRoot ? null : dom.content };
  let cursor = 0, effects = [], props = { preview: false, disabled: false, ...input }, frameId = 0, unmounted = false;
  policy = { ready: true, reducedMotion: false, saveData: false, pageVisible: true, ...input.policy };
  if (input.inert) dom.wrapper.attrs.inert = '';
  if (input.hidden) dom.wrapper.attrs['aria-hidden'] = 'true';
  if (input.gate) dom.content.append(el('div', 'gate', { 'data-opera-entry': 'closed' }));
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  React.useRef = initial => { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); };
  React.useEffect = (effect, deps) => { const i = cursor++, old = slots[i]; if (!old || !same(old.deps, deps)) { const slot = slots[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); }); } };
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); this.disconnected = false; observers.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.disconnected = true; this.targets.clear(); }
  }
  const requestFrame = callback => { const id = ++frameId; frames.set(id, callback); scheduled.push({ id, callback }); return id; };
  const cancelFrame = id => { frames.delete(id); cancelledFrames.push(id); };
  const browser = {
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    requestAnimationFrame: requestFrame, cancelAnimationFrame: cancelFrame,
    IntersectionObserver: input.noObserver ? undefined : Observer,
  };
  install('window', browser); install('document', { visibilityState: 'visible' }); install('navigator', { connection: { saveData: false } });
  install('Element', Element); install('HTMLElement', Element); install('IntersectionObserver', browser.IntersectionObserver);
  install('requestAnimationFrame', requestFrame); install('cancelAnimationFrame', cancelFrame);
  install('fetch', () => assert.fail('Scroll regressions cannot contact the network'));
  const render = () => { if (unmounted) return; cursor = 0; effects = []; useOperaReveals(ref, props.preview, props.disabled); for (const effect of effects) effect(); };
  const unmount = () => { if (unmounted) return; unmounted = true; for (const slot of slots) slot?.cleanup?.(); };
  const runner = { ...dom, observers, frames, scheduled, cancelledFrames, listeners, unmount,
    update(patch) { props = { ...props, ...patch }; render(); },
    preference(patch) { policy = { ...policy, ...patch }; render(); },
    enter() { for (const listener of [...(listeners.get('enkarta:enter') ?? [])]) listener({ type: 'enkarta:enter' }); },
    flushFrames() { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(); },
    openGate() { delete dom.wrapper.attrs.inert; delete dom.wrapper.attrs['aria-hidden']; dom.content.children = dom.content.children.filter(child => !child.hasAttribute('data-opera-entry')); },
    intersect(targets, isIntersecting = true, observer = observers.at(-1)) { assert.ok(observer, 'A viewport observer exists'); observer.callback(targets.map(target => ({ target, isIntersecting }))); },
    animationCount() { return dom.content.querySelectorAll('*').reduce((total, node) => total + node.animations.length, 0); },
  };
  try { render(); await scenario(runner); } finally { unmount(); Object.assign(React, hooks); for (const name of globalNames) { if (saved[name]) Object.defineProperty(global, name, saved[name]); else delete global[name]; } }
}

test('only article headings, copy and marked photos are observed, leaving controls and media players alone', async () => {
  await withReveals(r => {
    assert.equal(r.observers.length, 1);
    assert.deepEqual([...r.observers[0].targets], r.eligible);
    assert.equal(r.animationCount(), 0, 'No animation or prehiding before entering the viewport');
    for (const node of r.content.querySelectorAll('*')) assert.deepEqual(node.style, { opacity: '', visibility: '', transform: '' });
    r.intersect(r.eligible, false); assert.equal(r.animationCount(), 0);
    r.intersect(r.eligible); assert.equal(r.animationCount(), r.eligible.length);
    assert.equal(r.observers[0].targets.size, 0, 'Visited elements are no longer observed');
    r.intersect(r.eligible); assert.equal(r.animationCount(), r.eligible.length, 'Repeated intersections cannot restart the article');
  });
});

test('photographs and text use distinct restrained entrances with bounded copy staggering and no persistent fill', async () => {
  await withReveals(r => {
    r.intersect(r.eligible);
    const photo = r.photo.animations[0], heading = r.heading.animations[0], copy = r.copy.animations[0];
    assert.match(photo.keyframes[0].transform, /scale\(/); assert.ok(photo.keyframes[0].clipPath, 'The photograph has a separate crop reveal');
    assert.doesNotMatch(heading.keyframes[0].transform, /scale\(/); assert.doesNotMatch(copy.keyframes[0].transform, /scale\(/);
    assert.notDeepEqual(photo.keyframes, heading.keyframes); assert.notDeepEqual(heading.keyframes, copy.keyframes);
    assert.ok(photo.options.duration > heading.options.duration); assert.ok(heading.options.duration >= copy.options.duration);
    assert.equal(photo.options.delay ?? 0, 0); assert.equal(heading.options.delay ?? 0, 0);
    const delays = [r.copy, r.secondCopy, r.thirdCopy].map(node => node.animations[0].options.delay);
    assert.equal(new Set(delays).size, 3); assert.ok(delays.every(delay => delay > 0 && delay <= 225));
    for (const node of r.eligible) {
      const animation = node.animations[0], final = animation.keyframes.at(-1);
      assert.equal(final.opacity, 1); assert.ok(animation.options.duration > 0 && animation.options.duration <= 1000);
      assert.ok(!['forwards', 'both'].includes(animation.options.fill), 'Finished animation cannot override later editor changes');
    }
  });
});

test('an inert, hidden or closed entry waits for the opening event and a fresh animation frame', async () => {
  for (const options of [{ inert: true }, { hidden: true }, { gate: true }]) {
    await withReveals(r => {
      assert.equal(r.observers.length, 0); assert.equal(r.animationCount(), 0);
      r.enter(); assert.equal(r.frames.size, 1); r.flushFrames(); assert.equal(r.observers.length, 0, 'An event cannot bypass a still-closed gate');
      r.openGate(); r.enter(); r.enter(); assert.equal(r.frames.size, 1, 'Repeated entry events coalesce');
      assert.equal(r.observers.length, 0); r.flushFrames(); assert.equal(r.observers.length, 1);
      r.intersect([r.heading]); assert.equal(r.heading.animations.length, 1);
    }, options);
  }
});

test('preview, disabled motion and unavailable media preferences never observe or animate the document', async () => {
  const cases = [{ preview: true }, { disabled: true }, { missingRoot: true }, { noObserver: true },
    ...[{ ready: false }, { reducedMotion: true }, { saveData: true }, { pageVisible: false }].map(value => ({ policy: value }))];
  for (const options of cases) await withReveals(r => {
    assert.equal(r.observers.length, 0, JSON.stringify(options)); assert.equal(r.animationCount(), 0);
    r.enter(); r.flushFrames(); assert.equal(r.observers.length, 0);
  }, options);
});

test('hiding the page cancels current motion, preserves visited targets and admits unseen content when visible again', async () => {
  await withReveals(r => {
    r.intersect([r.heading]); const first = r.heading.animations[0], observer = r.observers[0];
    r.preference({ pageVisible: false }); assert.equal(first.cancelled, true); assert.equal(observer.disconnected, true);
    observer.callback([{ target: r.copy, isIntersecting: true }]); assert.equal(r.copy.animations.length, 0, 'A stale hidden observer cannot animate content');
    r.preference({ pageVisible: true });
    const current = r.observers.at(-1); assert.notEqual(current, observer); assert.equal(current.targets.has(r.heading), false);
    assert.equal(current.targets.has(r.copy), true); r.intersect([r.heading, r.copy]);
    assert.equal(r.heading.animations.length, 1); assert.equal(r.copy.animations.length, 1);
  });
});

test('unmount cancels unfinished animation and queued opening work without cancelling an already finished reveal', async () => {
  await withReveals(r => {
    r.intersect([r.heading, r.copy]); const finished = r.heading.animations[0], pending = r.copy.animations[0];
    finished.onfinish(); r.enter(); const lateFrame = r.scheduled.at(-1).callback, observer = r.observers[0];
    assert.equal(r.frames.size, 1); r.unmount();
    assert.equal(observer.disconnected, true); assert.equal(finished.cancelled, false); assert.equal(pending.cancelled, true);
    assert.equal(r.frames.size, 0); assert.equal(r.listeners.get('enkarta:enter')?.size ?? 0, 0);
    const count = r.animationCount(), observerCount = r.observers.length;
    lateFrame(); observer.callback([{ target: r.photo, isIntersecting: true }]); r.enter();
    assert.equal(r.animationCount(), count); assert.equal(r.observers.length, observerCount);
  });
});

test('entering a hidden subtree and unsupported animation APIs remain readable without aborting the other entrances', async () => {
  await withReveals(r => {
    r.copy.attrs['aria-hidden'] = 'true'; r.photo.animate = () => { throw Error('Unsupported keyframe'); }; r.secondCopy.animate = undefined;
    assert.doesNotThrow(() => r.intersect(r.eligible));
    assert.equal(r.copy.animations.length, 0); assert.equal(r.photo.animations.length, 0); assert.equal(r.secondCopy.animations.length, 0);
    assert.equal(r.heading.animations.length, 1); assert.equal(r.thirdCopy.animations.length, 1);
    for (const node of r.eligible) assert.deepEqual(node.style, { opacity: '', visibility: '', transform: '' });
  });
});
