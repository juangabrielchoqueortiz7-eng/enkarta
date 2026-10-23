// Executes the dedicated reference components and data helpers. The lifecycle
// harness supplies synthetic DOM/events in RAM; it does not replace browser
// comparison, a physical-device test, or a production request.
'use strict';
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = require.extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText, file);
require.extensions['.css'] = mod => { mod.exports = { __esModule: true, default: new Proxy({}, { get: (_target, name) => String(name) }) }; };
const React = require('react');
const stub = (file, exports) => { require.cache[require.resolve(file)] = { exports }; };
let analytics = [];
stub('../src/components/invitations/InvitationAnalytics.tsx', { emitInvitationAnalytics: value => analytics.push(value) });
const { renderToStaticMarkup } = require('react-dom/server');
const { paradiseReferenceStarter, paradiseReferenceDemo, paradiseReferenceHeading } = require('../src/lib/paradise-reference.ts');
const { ParadiseReferenceEntry: Entry, ParadiseReferenceHero: Hero, default: Invitation } = require('../src/components/invitations/ParadiseReference.tsx');
const { invitationDemo, STARTER_TEMPLATE_KEYS } = require('../src/lib/template-starters.ts');
const { STARTER_DESIGNS } = require('../src/lib/enkarta-collections.ts');
const { parseInvitation } = require('../src/lib/types.ts');
const clone = value => structuredClone(value);
const nodes = (value, match) => !React.isValidElement(value) ? [] : [...(match(value) ? [value] : []), ...React.Children.toArray(value.props.children).flatMap(child => nodes(child, match))];
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(text).join(' ') : React.isValidElement(value) ? text(value.props.children) : '';

test('the reference is an independent draft profile and is not sold as a finished collection', () => {
  const legacy = clone(invitationDemo('paradise'));
  const first = paradiseReferenceStarter(), second = paradiseReferenceStarter();
  assert.equal(first.status, 'draft'); assert.equal(first.template, 'paradise'); assert.equal(first.builder_config.designKey, 'paradise-referencia');
  assert.equal(STARTER_TEMPLATE_KEYS.includes('paradise-referencia'), false);
  assert.equal(STARTER_DESIGNS.some(design => design.key === 'paradise-referencia'), false);
  assert.notEqual(first.builder_config, second.builder_config);
  first.names = 'QA different names'; first.builder_config.city = 'QA another city'; first.builder_config.brideLast = 'QA changed';
  assert.notEqual(second.names, first.names); assert.notEqual(second.builder_config.city, first.builder_config.city); assert.notEqual(second.builder_config.brideLast, first.builder_config.brideLast);
  const unchanged = invitationDemo('paradise');
  // The existing generic demo stamps created_at each time it is requested.
  unchanged.created_at = legacy.created_at;
  assert.deepEqual(unchanged, legacy, 'Creating or editing the reference cannot mutate Verdealma');
});

test('edited names, surnames, city, date and cover survive the existing persisted invitation parser', () => {
  const draft = paradiseReferenceDemo();
  draft.names = 'QA Ana & QA Luis'; draft.event_date = '2027-06-19'; draft.cover_image_url = '/qa-private-cover.webp';
  draft.config.brideLast = 'QA Primera'; draft.config.groomLast = 'QA Segundo'; draft.config.city = 'QA Ciudad';
  const saved = parseInvitation({ ...draft, builder_config: JSON.stringify(draft.config) });
  const before = clone(saved), heading = paradiseReferenceHeading(saved);
  assert.equal(saved.config.designKey, 'paradise-referencia'); assert.equal(heading.bride, 'QA Ana'); assert.equal(heading.groom, 'QA Luis');
  assert.equal(heading.brideLast, 'QA Primera'); assert.equal(heading.groomLast, 'QA Segundo'); assert.equal(heading.city, 'QA Ciudad');
  assert.equal(heading.coverImage, '/qa-private-cover.webp'); assert.match(heading.dateLine, /19\s*\/\s*06\s*\/\s*27/);
  assert.deepEqual(saved, before, 'Deriving display data cannot rewrite the saved draft');
  const fresh = paradiseReferenceDemo(); assert.notEqual(fresh.names, saved.names); assert.notEqual(fresh.config.city, saved.config.city);
});

test('blank edits remain blank and invalid dates cannot resurrect the reference date', () => {
  const data = paradiseReferenceDemo();
  data.names = ''; data.cover_image_url = null; data.config.brideLast = ''; data.config.groomLast = ''; data.config.city = '';
  for (const value of [null, '', '2027-02-29', '2028-13-01', 'not-a-date']) {
    data.event_date = value;
    assert.deepEqual(paradiseReferenceHeading(data), { bride: '', groom: '', brideLast: '', groomLast: '', dateLine: '', city: '', coverImage: '' });
  }
});

test('the public registry selects the reference only by its own design key and preserves the legacy mapper', () => {
  const { premiumFor } = require('../src/lib/template-registry.tsx');
  const legacy = invitationDemo('paradise'), reference = paradiseReferenceDemo();
  const before = clone(legacy), legacyEntry = premiumFor(legacy), referenceEntry = premiumFor(reference);
  assert.ok(legacyEntry); assert.ok(referenceEntry); assert.notEqual(referenceEntry.Comp, legacyEntry.Comp);
  assert.equal(referenceEntry.map(reference), reference);
  assert.deepEqual(legacy, before);
  assert.equal(premiumFor(invitationDemo('paradise')).Comp, legacyEntry.Comp);
});

test('the dedicated public study route remains noindex and supports explicit entry bypass without joining the catalog', async () => {
  const route = require('../src/app/muestra/paradise-referencia/page.tsx');
  assert.deepEqual(route.metadata.robots, { index: false, follow: false });
  for (const [query, skipped] of [[{}, false], [{ full: '1' }, true], [{ preview: '1' }, true], [{ full: '0' }, false]]) {
    const page = await route.default({ searchParams: Promise.resolve(query) });
    assert.equal(page.type, Invitation); assert.equal(page.props.data.config.designKey, 'paradise-referencia'); assert.equal(page.props.demo, true); assert.equal(page.props.skipEntry, skipped);
  }
});

test('hero renders editable content as text, keeps the original photo source and derives its date from the event', () => {
  const data = paradiseReferenceDemo();
  data.names = 'QA Ana <script>alert(1)</script> & QA Luis'; data.event_date = '2028-02-29'; data.cover_image_url = '/qa-edited-photo.webp';
  data.config.brideLast = '<apellido>'; data.config.groomLast = 'QA Garrido'; data.config.city = 'QA Ciudad & Jardín';
  const html = renderToStaticMarkup(React.createElement(Hero, { data }));
  assert.match(html, /QA Ana &lt;script&gt;alert\(1\)&lt;\/script&gt;/); assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;apellido&gt;/); assert.match(html, /QA Garrido/); assert.match(html, /QA Ciudad &amp; Jardín/);
  assert.match(html, /29\s*\/\s*02\s*\/\s*28/); assert.match(html, /src="\/qa-edited-photo.webp"/);
  assert.match(html, /<h1[\s>]/); assert.doesNotMatch(html, /https?:\/\/invitali\.com/);
});

async function withEntry(t, scenario, { reduced = false, overflow = 'clip', label } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const hookNames = ['useState', 'useRef', 'useEffect', 'useLayoutEffect', 'useMemo', 'useCallback'];
  const hooks = Object.fromEntries(hookNames.map(name => [name, React[name]]));
  const globalNames = ['window', 'document', 'CustomEvent', 'fetch'];
  const globals = Object.fromEntries(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]));
  const slots = [], events = new EventTarget(), enters = [], focused = [];
  let cursor = 0, dirty = true, effects = [], tree, unmounted = false, late = 0, controlCount = 1;
  analytics = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  React.useState = initial => { const i = cursor++; if (!slots[i]) { const slot = slots[i] = { value: typeof initial === 'function' ? initial() : initial }; slot.set = value => { if (unmounted) { late++; return; } const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; } return [slots[i].value, slots[i].set]; };
  React.useRef = initial => { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); };
  React.useMemo = (compute, deps) => { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: compute() }; return slots[i].value; };
  React.useCallback = (callback, deps) => React.useMemo(() => callback, deps);
  React.useEffect = React.useLayoutEffect = (effect, deps) => { const i = cursor++, old = slots[i]; if (!old || !same(old.deps, deps)) { const slot = slots[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); }); } };
  const focusable = name => ({ isConnected: true, focus() { global.document.activeElement = this; focused.push(name); } });
  const trigger = focusable('trigger'), first = focusable('first'), last = focusable('last'), heading = focusable('heading');
  const controls = [first, last];
  const content = Object.assign(focusable('content'), { inert: false, attributes: new Set(), setAttribute(name) { this.attributes.add(name); if (name === 'inert') this.inert = true; }, removeAttribute(name) { this.attributes.delete(name); if (name === 'inert') this.inert = false; }, querySelector: () => heading });
  const dialog = { querySelector: () => first, querySelectorAll: () => controls.slice(0, controlCount) };
  global.window = Object.assign(events, { matchMedia: () => ({ matches: reduced }), setTimeout, clearTimeout });
  global.document = { activeElement: trigger, body: { style: { overflow } } };
  global.CustomEvent = class extends Event { constructor(type, options) { super(type); this.detail = options?.detail; } };
  global.fetch = () => assert.fail('Entry regression tests must not request the network');
  window.addEventListener('enkarta:enter', event => enters.push(event));
  const assign = (ref, value) => { if (typeof ref === 'function') ref(value); else if (ref) ref.current = value; };
  const attach = () => { controlCount = Math.min(controls.length, nodes(tree, node => node.type === 'button').length); let buttonIndex = 0; for (const element of nodes(tree, node => node.ref)) { if (element.type === 'button') assign(element.ref, controls[Math.min(buttonIndex++, controls.length - 1)]); else if (element.props.role === 'dialog') assign(element.ref, dialog); else if (/^h[12]$/.test(element.type)) assign(element.ref, heading); else assign(element.ref, content); } };
  const flush = async () => { for (let round = 0; round < 40; round++) { if (dirty && !unmounted) { dirty = false; cursor = 0; effects = []; tree = Entry({ label, children: React.createElement('h1', {}, 'QA invitation content') }); attach(); for (const effect of effects) effect(); } await new Promise(done => setImmediate(done)); if (!dirty || unmounted) return tree; } throw Error('Reference entry hooks did not settle'); };
  const unmount = () => { if (unmounted) return; unmounted = true; for (const slot of slots) slot?.cleanup?.(); };
  const key = (keyValue, shiftKey = false) => { const event = { key: keyValue, shiftKey, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} }; const gate = nodes(tree, node => node.props.role === 'dialog')[0]; gate?.props.onKeyDown?.(event); return event; };
  const runner = { tree: () => tree, flush, unmount, key, first, get last() { return controls[Math.max(0, controlCount - 1)]; }, heading, content, focused, enters, analytics: () => analytics, late: () => late, overflow: () => document.body.style.overflow, click() { const seal = nodes(tree, node => node.type === 'button')[0]; assert.ok(seal, 'The entry exposes a native opening button'); seal.props.onClick({ stopPropagation() {}, preventDefault() {} }); }, tick: async ms => { t.mock.timers.tick(ms); await flush(); } };
  try { await flush(); await scenario(runner); } finally { unmount(); for (const name of hookNames) React[name] = hooks[name]; for (const name of globalNames) { if (globals[name]) Object.defineProperty(global, name, globals[name]); else delete global[name]; } }
}

const gate = runner => nodes(runner.tree(), node => node.props.role === 'dialog')[0];

test('entry locks only its background, focuses its native control and traps keyboard focus', async t => {
  await withEntry(t, async r => {
    assert.equal(r.overflow(), 'hidden'); assert.equal(r.content.inert, true); assert.equal(document.activeElement, r.first);
    const current = gate(r); assert.equal(String(current.props['aria-modal']), 'true');
    const buttons = nodes(current, node => node.type === 'button'); assert.ok(buttons.some(button => /Ver invitación/i.test(button.props['aria-label'] || text(button))));
    document.activeElement = r.last; assert.equal(r.key('Tab').defaultPrevented, true); assert.equal(document.activeElement, r.first);
    document.activeElement = r.first; assert.equal(r.key('Tab', true).defaultPrevented, true); assert.equal(document.activeElement, r.last);
  });
});

test('same-turn repeated activation opens once and reveals content without an animation event', async t => {
  await withEntry(t, async r => {
    r.click(); r.click(); await r.flush(); assert.deepEqual(r.analytics(), ['entry_open']);
    await r.tick(1099); assert.ok(gate(r)); assert.equal(r.enters.length, 0);
    await r.tick(1); assert.equal(gate(r), undefined); assert.equal(r.enters.length, 1);
    assert.equal(r.content.inert, false); assert.equal(r.overflow(), 'clip'); assert.equal(document.activeElement, r.heading);
  });
});

test('Escape opens the invitation and reduced motion does not require the decorative delay', async t => {
  await withEntry(t, async r => {
    assert.equal(r.key('Escape').defaultPrevented, true); await r.flush(); await r.tick(0);
    assert.equal(gate(r), undefined); assert.equal(r.enters.length, 1); assert.deepEqual(r.analytics(), ['entry_open']); assert.equal(r.overflow(), 'clip');
  }, { reduced: true });
});

test('unmounting during opening cancels the timer and restores the exact preexisting scroll state', async t => {
  await withEntry(t, async r => {
    r.click(); await r.flush(); r.unmount(); assert.equal(r.overflow(), 'scroll');
    await r.tick(10000); assert.equal(r.enters.length, 0); assert.equal(r.late(), 0);
  }, { overflow: 'scroll' });
});

test('preview, full/skip, an explicitly disabled entrance and missing entry entitlement render without a dialog', () => {
  for (const mode of ['preview', 'skipEntry', 'disabled', 'featureOff']) {
    const data = paradiseReferenceDemo(); if (mode === 'disabled') data.config.entry = { ...data.config.entry, enabled: false };
    if (mode === 'featureOff') { delete data.config.entry.enabled; data.config.features = { entry: false }; }
    const props = { data, ...(['disabled', 'featureOff'].includes(mode) ? {} : { [mode]: true }) };
    const html = renderToStaticMarkup(React.createElement(Invitation, props));
    assert.doesNotMatch(html, /role="dialog"/); assert.match(html, /Laura/); assert.match(html, /Elvis/);
    assert.doesNotMatch(html, /<audio|autoplay|autoPlay/);
  }
});
