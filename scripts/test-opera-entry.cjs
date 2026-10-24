// Execute the actual entry lifecycle with hooks, focus and timers in RAM.
// This does not contact production, load audio or claim visual equivalence.
'use strict';
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = require.extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText, file);
require.extensions['.css'] = mod => { mod.exports = { __esModule: true, default: new Proxy({}, { get: (_target, name) => String(name) }) }; };
const React = require('react'), stub = (file, exports) => { require.cache[require.resolve(file)] = { exports }; };
let musicRequests, analytics;
stub('../src/components/invitations/ParadiseReferenceMusic.tsx', { __esModule: true, default: () => null, startParadiseReferenceMusic: node => musicRequests.push(node) });
stub('../src/components/invitations/InvitationAnalytics.tsx', { emitInvitationAnalytics: name => analytics.push(name) });
const { OperaEntry: Entry } = require('../src/components/invitations/Opera.tsx');
const { operaDemo } = require('../src/lib/opera.ts');
const nodes = (el, match) => !React.isValidElement(el) ? [] : [...(match(el) ? [el] : []), ...React.Children.toArray(el.props.children).flatMap(child => nodes(child, match))];
const contentText = el => typeof el === 'string' || typeof el === 'number' ? String(el) : Array.isArray(el) ? el.map(contentText).join(' ') : React.isValidElement(el) ? contentText(el.props.children) : '';

async function withEntry(scenario, { reducedMotion = false, saveData = false, data = operaDemo() } = {}) {
  const hookNames = ['useState', 'useRef', 'useEffect'], hooks = Object.fromEntries(hookNames.map(name => [name, React[name]]));
  const globalNames = ['window', 'document', 'navigator', 'CustomEvent', 'setTimeout', 'clearTimeout', 'fetch'], saved = Object.fromEntries(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]));
  const install = (name, value) => Object.defineProperty(global, name, { configurable: true, writable: true, value });
  let cursor = 0, dirty = true, unmounted = false, late = 0, tree, effects = [], clock = 0, timerId = 0;
  const slots = [], timers = new Map(), scheduled = [], events = [], eventSnapshots = [], focusCalls = [], attrs = new Map(), controls = [];
  musicRequests = []; analytics = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  React.useState = initial => { const i = cursor++; if (!slots[i]) { const slot = slots[i] = { value: typeof initial === 'function' ? initial() : initial }; slot.set = value => { if (unmounted) { late++; return; } const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; } return [slots[i].value, slots[i].set]; };
  React.useRef = initial => { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); };
  React.useEffect = (effect, deps) => { const i = cursor++, old = slots[i]; if (!old || !same(old.deps, deps)) { const slot = slots[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); }); } };
  const heading = { tabIndex: 0, focus: options => { document.activeElement = heading; focusCalls.push(['heading', options]); } };
  const content = { setAttribute: (name, value) => attrs.set(name, value), removeAttribute: name => attrs.delete(name), querySelector: selector => selector === 'h1' ? heading : null, focus: options => { document.activeElement = content; focusCalls.push(['content', options]); } };
  const gate = { querySelector: selector => selector.includes('button') ? controls[0] : null, querySelectorAll: selector => selector.includes('button') ? controls.filter(button => !button.props.disabled) : [], contains: node => controls.includes(node) };
  install('document', { body: { style: { overflow: 'clip' } }, activeElement: null });
  install('navigator', { connection: { saveData } });
  install('window', { matchMedia: () => ({ matches: reducedMotion }), dispatchEvent: event => {
    events.push(event.type);
    eventSnapshots.push({ type: event.type, dialogRendered: nodes(tree, el => el.props['data-opera-entry']).length > 0, inert: attrs.has('inert'), focused: document.activeElement });
    return true;
  } });
  install('CustomEvent', class { constructor(type, options) { this.type = type; this.detail = options?.detail; } });
  install('setTimeout', (callback, delay) => { const id = ++timerId, timer = { id, callback, delay, due: clock + delay }; timers.set(id, timer); scheduled.push(timer); return id; });
  install('clearTimeout', id => timers.delete(id));
  install('fetch', () => assert.fail('Entry regressions cannot contact the network'));
  const flush = async () => {
    for (let round = 0; round < 15; round++) {
      if (dirty && !unmounted) {
        dirty = false; cursor = 0; effects = []; tree = Entry({ data, children: React.createElement('h1', null, 'QA interior') });
        const dialog = nodes(tree, el => el.props['data-opera-entry'])[0];
        const buttons = dialog ? nodes(dialog, el => el.type === 'button') : [];
        buttons.forEach((element, index) => { const control = controls[index] ?? (controls[index] = { focus: options => { document.activeElement = controls[index]; focusCalls.push(['button', index, options]); } }); control.props = element.props; });
        for (const element of nodes(tree, el => el.ref && typeof el.ref === 'object')) element.ref.current = element.props['data-opera-entry'] ? gate : content;
        for (const effect of effects) effect();
      }
      await Promise.resolve();
      if (!dirty || unmounted) return;
    }
    throw Error('Opera entry hooks did not settle');
  };
  const unmount = () => { if (unmounted) return; unmounted = true; for (const slot of slots) slot?.cleanup?.(); };
  const runner = {
    tree: () => tree, controls, attrs, heading, content, events, eventSnapshots, focusCalls, scheduled,
    musicRequests: () => musicRequests, analytics: () => analytics, late: () => late, pending: () => timers.size,
    dialog: () => nodes(tree, el => el.props['data-opera-entry'])[0], flush, unmount,
    click: async index => { assert.ok(controls[index], `Control ${index}`); controls[index].props.onClick(); await flush(); },
    advance: async milliseconds => { clock += milliseconds; for (const timer of [...timers.values()]) if (timer.due <= clock && timers.delete(timer.id)) timer.callback(); await flush(); },
    key: async (key, options = {}) => { const event = { key, shiftKey: false, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...options }; const dialog = nodes(tree, el => el.props['data-opera-entry'])[0]; dialog?.props.onKeyDown?.(event); await flush(); return event; },
  };
  try { await flush(); await scenario(runner); } finally { unmount(); for (const name of hookNames) React[name] = hooks[name]; for (const name of globalNames) { if (saved[name]) Object.defineProperty(global, name, saved[name]); else delete global[name]; } }
}

test('the envelope keeps the invitation inert and audio silent until an explicit opening gesture', async () => {
  await withEntry(async r => {
    assert.equal(r.dialog().props['data-opera-entry'], 'closed'); assert.equal(r.dialog().props['aria-modal'], 'true');
    assert.equal(r.attrs.has('inert'), true); assert.equal(document.body.style.overflow, 'hidden');
    assert.equal(document.activeElement, r.controls[0]); assert.equal(r.controls.length, 2);
    assert.match(contentText(r.controls[1].props.children), /sin música/i);
    assert.deepEqual(r.musicRequests(), []); assert.deepEqual(r.analytics(), []); assert.equal(r.pending(), 0);
    r.unmount(); assert.equal(document.body.style.overflow, 'clip'); assert.equal(r.attrs.has('inert'), false);
  });
});

test('normal opening requests music once in the gesture, blocks repeats, then focuses the interior', async () => {
  await withEntry(async r => {
    await r.click(0); assert.equal(r.dialog().props['data-opera-entry'], 'opening');
    assert.deepEqual(r.musicRequests(), [r.content]); assert.deepEqual(r.analytics(), ['entry_open']);
    assert.equal(r.pending(), 1); assert.equal(r.scheduled[0].delay > 0, true);
    await r.click(0); await r.click(1); await r.key('Escape');
    assert.equal(r.scheduled.length, 1); assert.equal(r.musicRequests().length, 1); assert.equal(r.analytics().length, 1);
    await r.advance(r.scheduled[0].delay - 1); assert.ok(r.dialog()); assert.equal(r.attrs.has('inert'), true);
    await r.advance(1); assert.equal(r.dialog(), undefined); assert.equal(r.attrs.has('inert'), false);
    assert.deepEqual(r.events, ['enkarta:enter']); assert.equal(document.activeElement, r.heading);
    assert.equal(r.heading.tabIndex, -1); assert.equal(document.body.style.overflow, 'clip');
  });
});

test('opening without music still opens the envelope but never requests playback', async () => {
  await withEntry(async r => {
    await r.click(1); assert.equal(r.dialog().props['data-opera-entry'], 'opening');
    assert.deepEqual(r.musicRequests(), []); assert.deepEqual(r.analytics(), ['entry_open']);
    await r.click(0); await r.advance(r.scheduled[0].delay);
    assert.deepEqual(r.musicRequests(), []); assert.equal(r.dialog(), undefined); assert.deepEqual(r.events, ['enkarta:enter']);
  });
});

test('the opening event reaches scroll effects only after the committed gate is gone and the interior is usable', async () => {
  for (const reducedMotion of [false, true]) await withEntry(async r => {
    await r.click(1);
    assert.deepEqual(r.eventSnapshots, [], 'Beginning the envelope transition cannot arm hidden content');
    await r.advance(r.scheduled[0].delay);
    assert.equal(r.eventSnapshots.length, 1);
    const snapshot = r.eventSnapshots[0];
    assert.equal(snapshot.type, 'enkarta:enter');
    assert.equal(snapshot.dialogRendered, false, 'The opening listener must see the committed render without the gate');
    assert.equal(snapshot.inert, false, 'The opening listener must not see an inert invitation');
    assert.equal(snapshot.focused, r.heading, 'The heading is focused before observers are armed');
  }, { reducedMotion });
});

test('disposing a pending opening restores the page, cancels its timer and ignores a late callback', async () => {
  await withEntry(async r => {
    await r.click(0); const callback = r.scheduled[0].callback;
    r.unmount(); assert.equal(r.pending(), 0); assert.equal(r.attrs.has('inert'), false); assert.equal(document.body.style.overflow, 'clip');
    callback(); await r.flush(); assert.equal(r.late(), 0); assert.deepEqual(r.events, []);
  });
});

test('reduced motion completes without waiting for the animated envelope', async () => {
  await withEntry(async r => {
    await r.click(1); assert.equal(r.scheduled[0].delay, 0); await r.advance(0);
    assert.equal(r.dialog(), undefined); assert.equal(document.activeElement, r.heading); assert.deepEqual(r.musicRequests(), []);
  }, { reducedMotion: true });
});

test('keyboard navigation can reach both choices and cycles within the closed envelope', async () => {
  await withEntry(async r => {
    document.activeElement = r.controls[1];
    const end = await r.key('Tab'); assert.equal(end.defaultPrevented, true); assert.equal(document.activeElement, r.controls[0]);
    const beginning = await r.key('Tab', { shiftKey: true }); assert.equal(beginning.defaultPrevented, true); assert.equal(document.activeElement, r.controls[1]);
    document.activeElement = r.controls[0];
    const between = await r.key('Tab');
    if (between.defaultPrevented) assert.equal(document.activeElement, r.controls[1], 'An explicit focus loop must expose the secondary choice');
    assert.deepEqual(r.musicRequests(), []); assert.equal(r.pending(), 0);
  });
});

test('Escape offers a silent opening rather than unexpectedly requesting audio', async () => {
  await withEntry(async r => {
    const escape = await r.key('Escape'); assert.equal(escape.defaultPrevented, true);
    assert.equal(r.dialog().props['data-opera-entry'], 'opening'); assert.deepEqual(r.musicRequests(), []);
    await r.advance(r.scheduled[0].delay); assert.equal(r.dialog(), undefined); assert.deepEqual(r.events, ['enkarta:enter']);
  });
});

test('save-data also skips the animated opening delay', async () => {
  await withEntry(async r => {
    await r.click(1); assert.equal(r.scheduled[0].delay, 0); await r.advance(0);
    assert.equal(r.dialog(), undefined); assert.deepEqual(r.musicRequests(), []);
  }, { saveData: true });
});

test('an explicitly cleared soundtrack removes the extra choice and never requests playback', async () => {
  const data = operaDemo(); data.config.musicUrl = '';
  await withEntry(async r => {
    assert.equal(r.controls.length, 1);
    await r.click(0); assert.deepEqual(r.musicRequests(), []);
    await r.advance(r.scheduled[0].delay); assert.equal(r.dialog(), undefined);
    assert.deepEqual(r.musicRequests(), []); assert.deepEqual(r.events, ['enkarta:enter']);
  }, { data });
});
