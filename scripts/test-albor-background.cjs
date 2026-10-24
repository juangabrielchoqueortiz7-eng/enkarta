// Exercise the independent Albor viewport background with controlled scroll, size and RAF.
// These tests do not fetch media or claim visual equivalence with a browser capture.
'use strict';
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: file }).outputText, file);
const React = require('react');
const { useAlborBackground, alborBackgroundFrame } = require('../src/lib/use-albor-background.ts');
const activeCount = listeners => [...listeners.values()].reduce((sum, entries) => sum + entries.size, 0);

async function withBackground(scenario, input = {}) {
  const hooks = { useRef: React.useRef, useEffect: React.useEffect, useState: React.useState };
  const globalNames = ['window', 'document', 'navigator', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'fetch'];
  const saved = Object.fromEntries(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]));
  const install = (name, value) => Object.defineProperty(global, name, { configurable: true, writable: true, value });
  const listeners = new Map(), frames = new Map(), scheduled = [], cancellations = [], observers = [], registrations = [], slots = [], writes = [];
  const dimensions = { viewport: 900, width: 1440, top: 0, documentHeight: 9000, rootHeight: 9000, ...input.dimensions };
  const attrs = new Map(Object.entries(input.attrs ?? {}));
  const initialTransform = input.transform ?? 'translateX(3px)'; let currentTransform = initialTransform;
  const style = { setProperty(name, value) { this[name] = value; }, getPropertyValue(name) { return this[name] ?? ''; }, removeProperty(name) { const previous = this[name]; delete this[name]; return previous; } };
  Object.defineProperty(style, 'transform', { configurable: true, get: () => currentTransform, set: value => { currentTransform = value; writes.push(value); } });
  const layer = { style, getAttribute: name => attrs.get(name) ?? null, hasAttribute: name => attrs.has(name), setAttribute: (name, value) => attrs.set(name, String(value)), removeAttribute: name => attrs.delete(name), getBoundingClientRect: () => ({ top: 0, bottom: dimensions.viewport, height: dimensions.viewport, width: dimensions.width }) };
  let blocked = Boolean(input.inert || input.hidden), closed = Boolean(input.gate);
  const rootNode = { closest: selector => blocked && /inert|aria-hidden/.test(selector) ? {} : null, querySelector: selector => closed && /data-albor-entry/.test(selector) ? {} : null, getBoundingClientRect: () => ({ top: -dimensions.top, height: dimensions.rootHeight, bottom: dimensions.rootHeight - dimensions.top, width: dimensions.width }) };
  Object.defineProperty(rootNode, 'scrollHeight', { get: () => dimensions.rootHeight });
  Object.defineProperty(rootNode, 'offsetHeight', { get: () => dimensions.rootHeight });
  const body = {}, documentElement = {};
  for (const element of [body, documentElement]) {
    Object.defineProperties(element, { scrollHeight: { get: () => dimensions.documentHeight }, offsetHeight: { get: () => dimensions.documentHeight }, clientHeight: { get: () => dimensions.viewport }, scrollTop: { get: () => dimensions.top } });
    element.getBoundingClientRect = () => ({ top: -dimensions.top, height: dimensions.documentHeight, bottom: dimensions.documentHeight - dimensions.top });
  }
  const requestFrame = callback => { const id = scheduled.length + 1; const item = { id, callback }; scheduled.push(item); frames.set(id, callback); return id; };
  const cancelFrame = id => { frames.delete(id); cancellations.push(id); };
  class Observer { constructor(callback) { this.callback = callback; this.targets = new Set(); this.disconnected = false; observers.push(this); } observe(element) { this.targets.add(element); } unobserve(element) { this.targets.delete(element); } disconnect() { this.disconnected = true; this.targets.clear(); } }
  const browser = {
    addEventListener(type, callback, options) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); registrations.push({ type, callback, options }); },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    requestAnimationFrame: input.noRaf ? undefined : requestFrame, cancelAnimationFrame: cancelFrame,
    ResizeObserver: input.noObserver ? undefined : Observer,
    get innerHeight() { return dimensions.viewport; }, get innerWidth() { return dimensions.width; }, get scrollY() { return dimensions.top; }, get pageYOffset() { return dimensions.top; },
  };
  install('window', browser); install('document', { body, documentElement, scrollingElement: documentElement }); install('navigator', {});
  install('requestAnimationFrame', browser.requestAnimationFrame); install('cancelAnimationFrame', cancelFrame); install('ResizeObserver', browser.ResizeObserver);
  install('fetch', () => assert.fail('Background regression tests must not contact the network'));
  let mode = input.mode ?? 'active', cursor = 0, effects = [], unmounted = false;
  const rootRef = { current: input.missingRoot ? null : rootNode }, layerRef = { current: input.missingLayer ? null : layer };
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  React.useState = () => assert.fail('A decorative scroll background must not trigger React state updates');
  React.useRef = value => { const index = cursor++; return slots[index] ?? (slots[index] = { current: value }); };
  React.useEffect = (effect, deps) => { const index = cursor++, previous = slots[index]; if (!previous || !same(previous.deps, deps)) { const slot = slots[index] = { deps, cleanup: previous?.cleanup }; effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); }); } };
  const render = () => { if (unmounted) return; cursor = 0; effects = []; useAlborBackground(rootRef, layerRef, mode); for (const effect of effects) effect(); };
  const unmount = () => { if (unmounted) return; unmounted = true; for (const slot of slots) slot?.cleanup?.(); };
  const emit = type => { for (const listener of [...(listeners.get(type) ?? [])]) listener({ type }); };
  const flush = () => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(); };
  const runner = { dimensions, rootNode, body, documentElement, layer, attrs, writes, listeners, registrations, frames, scheduled, cancellations, observers, initialTransform,
    emit, flush, unmount, activeListeners: () => activeCount(listeners),
    update(nextMode) { mode = nextMode; render(); },
    open() { blocked = false; closed = false; emit('enkarta:enter'); },
    resize() { for (const observer of observers.filter(value => !value.disconnected)) observer.callback([{ target: rootNode }, { target: body }]); },
    expected() { return alborBackgroundFrame(dimensions.viewport, -dimensions.top, dimensions.rootHeight); },
  };
  try { render(); await scenario(runner); } finally { unmount(); Object.assign(React, hooks); for (const name of globalNames) { if (saved[name]) Object.defineProperty(global, name, saved[name]); else delete global[name]; } }
}

function assertFrame(r) {
  const frame = r.expected();
  assert.equal(r.layer.style.transform, 'translateY(' + frame.offset + 'px)');
  assert.equal(r.layer.getAttribute('data-albor-background-motion'), 'active');
}

test('the exact rounded root-progress formula and scroll bursts apply the latest position in one RAF without React state', async () => {
  const initial = alborBackgroundFrame(900, 0, 9000);
  assert.equal(initial.height, 1341); assert.ok(Math.abs(initial.offset - (-441 * .0909)) < 1e-8, 'Progress is rounded to two decimal percentage points before converting to translation');
  const progressed = alborBackgroundFrame(900, -1600, 9000);
  assert.ok(Math.abs(progressed.offset - (-441 * .2525)) < 1e-8);
  assert.ok(alborBackgroundFrame(900, 1000, 9000).offset === 0, 'Clamping above the document has zero displacement, including negative zero');
  assert.equal(alborBackgroundFrame(900, -10000, 9000).offset, -441);
  for (const values of [[0, 0, 9000], [900, 0, 0], [NaN, 0, 9000], [900, Infinity, 9000], [900, 0, Infinity]]) assert.equal(alborBackgroundFrame(...values), null);
  await withBackground(r => {
    r.flush(); assertFrame(r);
    const initialWrites = r.writes.length;
    for (const top of [150, 750, 1600]) { r.dimensions.top = top; r.emit('scroll'); }
    assert.equal(r.frames.size, 1); assert.equal(r.writes.length, initialWrites);
    r.flush(); assertFrame(r); assert.equal(r.writes.length, initialWrites + 1);
    const position = r.layer.style.transform;
    r.dimensions.documentHeight = 40000; r.emit('scroll'); r.flush();
    assert.equal(r.layer.style.transform, position, 'Unrelated document height cannot change a root-relative Elementor translation');
    assert.equal(r.registrations.find(item => item.type === 'scroll')?.options?.passive, true);
  });
});

test('viewport and root resize recompute coverage from current measurements and share pending work', async () => {
  await withBackground(r => {
    r.flush(); assert.ok(r.observers.length > 0);
    const observed = new Set(r.observers.flatMap(observer => [...observer.targets]));
    assert.ok(observed.has(r.rootNode), 'Late photos and resized invitation content are observed');
    r.dimensions.viewport = 720; r.dimensions.top = 2800; r.dimensions.documentHeight = 14000; r.dimensions.rootHeight = 14000;
    r.emit('resize'); r.resize(); r.resize(); assert.equal(r.frames.size, 1);
    r.flush(); assertFrame(r);
  });
});

test('closed or inert invitation content waits for the committed opening event without attaching scroll work', async () => {
  for (const input of [{ gate: true }, { inert: true }, { hidden: true }]) await withBackground(r => {
    assert.equal(r.listeners.get('scroll')?.size ?? 0, 0); assert.equal(r.observers.length, 0);
    r.emit('enkarta:enter'); r.flush(); assert.equal(r.listeners.get('scroll')?.size ?? 0, 0);
    r.open(); r.emit('enkarta:enter'); assert.equal(r.frames.size, 1); r.flush(); assert.equal(r.listeners.get('scroll')?.size, 1);
    assert.equal(r.frames.size, 1, 'The committed opening connects first, then paints on the next scheduled frame'); r.flush();
    assertFrame(r);
  }, input);
});

test('preview and every static media mode leave the original transform untouched with zero listeners or observers', async () => {
  for (const mode of ['preview', 'disabled', 'pending', 'reduced', 'save-data', 'hidden']) await withBackground(r => {
    assert.equal(r.activeListeners(), 0, mode); assert.equal(r.observers.length, 0); assert.equal(r.frames.size, 0);
    assert.equal(r.layer.style.transform, r.initialTransform); assert.notEqual(r.layer.getAttribute('data-albor-background-motion'), 'active');
    r.emit('scroll'); r.emit('resize'); r.emit('enkarta:enter'); r.flush(); assert.equal(r.writes.length, 0);
  }, { mode });
});

test('hiding active content disposes pending work and returning visible uses fresh geometry', async () => {
  await withBackground(r => {
    r.flush(); r.dimensions.top = 1200; r.emit('scroll'); const stale = r.scheduled.at(-1).callback;
    r.update('hidden'); assert.equal(r.activeListeners(), 0); assert.equal(r.frames.size, 0);
    assert.ok(r.observers.every(observer => observer.disconnected)); assert.equal(r.layer.style.transform, r.initialTransform);
    const writes = r.writes.length; stale(); assert.equal(r.writes.length, writes);
    r.dimensions.top = 2600; r.dimensions.documentHeight = 12000; r.dimensions.rootHeight = 12000;
    r.update('active'); r.flush(); assertFrame(r); assert.equal(r.listeners.get('scroll')?.size, 1);
  });
});

test('unmount cancels queued work, removes listeners and restores previous layer styling even after stale callbacks', async () => {
  await withBackground(r => {
    r.flush(); r.emit('scroll'); const lateFrame = r.scheduled.at(-1).callback, observer = r.observers[0];
    r.unmount(); assert.equal(r.frames.size, 0); assert.equal(r.activeListeners(), 0); assert.ok(r.cancellations.length > 0);
    assert.equal(r.layer.style.transform, r.initialTransform); assert.equal(r.layer.getAttribute('data-albor-background-motion'), 'owned-before-hook');
    const writes = r.writes.length;
    lateFrame(); observer.callback([{ target: r.rootNode }]); r.emit('scroll'); r.flush(); assert.equal(r.writes.length, writes);
  }, { attrs: { 'data-albor-background-motion': 'owned-before-hook' } });
});

test('missing DOM or invalid viewport stays static while missing ResizeObserver still supports resize events', async () => {
  for (const input of [{ missingRoot: true }, { missingLayer: true }, { noRaf: true }, { dimensions: { viewport: 0 } }, { dimensions: { viewport: NaN } }]) await withBackground(r => {
    assert.equal(r.activeListeners(), 0); assert.equal(r.observers.length, 0); assert.equal(r.frames.size, 0);
    assert.equal(r.layer.style.transform, r.initialTransform);
  }, input);
  await withBackground(r => {
    r.flush(); assert.equal(r.observers.length, 0); assert.equal(r.listeners.get('resize')?.size, 1);
    r.dimensions.viewport = 660; r.emit('resize'); r.flush(); assertFrame(r);
  }, { noObserver: true });
});
