// Exercises the actual Paradise reference helpers and component handlers in RAM.
// Synthetic media/DOM do not certify browser autoplay or visual fidelity.
'use strict';
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = require.extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText, file);
require.extensions['.css'] = mod => { mod.exports = { __esModule: true, default: new Proxy({}, { get: (_target, name) => String(name) }) }; };
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const stub = (file, exports) => { require.cache[require.resolve(file)] = { exports }; };
stub('../src/components/invitations/InvitationAnalytics.tsx', { emitInvitationAnalytics() {} });
const clone = value => structuredClone(value);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const nodes = (value, match) => !React.isValidElement(value) ? [] : [...(match(value) ? [value] : []), ...React.Children.toArray(value.props.children).flatMap(child => nodes(child, match))];
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(text).join(' ') : React.isValidElement(value) ? text(value.props.children) : '';

async function withUI(Component, input, scenario, { play, reduced = false, overflow = 'clip' } = {}) {
  const hookNames = ['useState', 'useRef', 'useEffect', 'useLayoutEffect', 'useCallback', 'useMemo', 'useContext'];
  const hooks = Object.fromEntries(hookNames.map(name => [name, React[name]]));
  const globalNames = ['window', 'document', 'CustomEvent', 'fetch', 'navigator'];
  const globals = Object.fromEntries(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(global, name)]));
  const slots = [], events = new EventTarget(), documentEvents = new EventTarget();
  let cursor = 0, dirty = true, effects = [], tree, unmounted = false, late = 0, pauses = 0, plays = 0;
  let props = { ...input };
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  React.useState = initial => { const i = cursor++; if (!slots[i]) { const slot = slots[i] = { value: typeof initial === 'function' ? initial() : initial }; slot.set = value => { if (unmounted) { late++; return; } const next = typeof value === 'function' ? value(slot.value) : value; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; } return [slots[i].value, slots[i].set]; };
  React.useRef = initial => { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); };
  React.useMemo = (compute, deps) => { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: compute() }; return slots[i].value; };
  React.useCallback = (callback, deps) => React.useMemo(() => callback, deps);
  React.useContext = context => context._currentValue;
  React.useEffect = React.useLayoutEffect = (effect, deps) => { const i = cursor++, old = slots[i]; if (!old || !same(old.deps, deps)) { const slot = slots[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); }); } };
  const audio = Object.assign(new EventTarget(), {
    paused: true, source: props.src ?? '/qa-track-one.mp3', currentTime: 0,
    getAttribute(name) { return name === 'src' ? this.source : null; },
    play() { plays++; return play ? play(audio, plays) : (audio.paused = false, audio.dispatchEvent(new Event('play')), Promise.resolve()); },
    pause() { pauses++; audio.paused = true; audio.dispatchEvent(new Event('pause')); },
    load() {},
  });
  const trigger = { isConnected: true, focus() { document.activeElement = trigger; } };
  const heading = { isConnected: true, focus() { document.activeElement = heading; } };
  const content = { inert: false, contains: node => node === audio, querySelector: selector => selector.includes('audio') ? audio : heading, querySelectorAll: () => [trigger], setAttribute(name) { if (name === 'inert') this.inert = true; }, removeAttribute(name) { if (name === 'inert') this.inert = false; } };
  global.window = Object.assign(events, { matchMedia: () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }), setTimeout, clearTimeout, setInterval, clearInterval });
  global.document = Object.assign(documentEvents, { activeElement: trigger, body: { style: { overflow } }, visibilityState: 'visible', hidden: false });
  global.CustomEvent = class extends Event { constructor(type, options) { super(type, options); this.detail = options?.detail; } };
  Object.defineProperty(global, 'navigator', { configurable: true, value: { clipboard: { writeText() { return Promise.reject(Error('Clipboard not permitted in this regression')); } } } });
  global.fetch = () => assert.fail('Paradise interior regressions must not request the network');
  const assign = (ref, value) => { if (typeof ref === 'function') ref(value); else if (ref) ref.current = value; };
  const attach = () => { for (const element of nodes(tree, node => node.ref)) assign(element.ref, element.type === 'audio' ? (audio.source = element.props.src, audio) : element.type === 'button' ? trigger : content); };
  const flush = async () => { for (let round = 0; round < 45; round++) { if (dirty && !unmounted) { dirty = false; cursor = 0; effects = []; tree = Component(props); attach(); for (const effect of effects) effect(); } await new Promise(done => setImmediate(done)); if (!dirty || unmounted) return tree; } throw Error('Paradise interior hooks did not settle'); };
  const unmount = () => { if (unmounted) return; unmounted = true; for (const slot of slots) slot?.cleanup?.(); };
  const runner = { tree: () => tree, flush, unmount, audio, content, trigger, heading, late: () => late, plays: () => plays, pauses: () => pauses, overflow: () => document.body.style.overflow,
    update: async patch => { props = { ...props, ...patch }; dirty = true; await flush(); },
    dispatch: event => events.dispatchEvent(event),
    key: key => { const event = new Event('keydown', { cancelable: true }); event.key = key; events.dispatchEvent(event); return event; },
  };
  try { await flush(); await scenario(runner); } finally { unmount(); for (const name of hookNames) React[name] = hooks[name]; for (const name of globalNames) { if (globals[name]) Object.defineProperty(global, name, globals[name]); else delete global[name]; } }
}

const button = (runner, label) => nodes(runner.tree(), node => node.type === 'button' && (!label || (node.props['aria-label'] || text(node)).includes(label)))[0];

const dataHelpers = () => require('../src/lib/paradise-reference.ts');

test('one persisted event date drives the header and calendar, including a leap day', () => {
  const { paradiseReferenceDemo, paradiseReferenceDate, paradiseReferenceHeading, paradiseReferenceCalendar } = dataHelpers();
  const { parseInvitation } = require('../src/lib/types.ts');
  const original = paradiseReferenceDemo();
  original.event_date = '2028-02-29'; original.ceremony_time = '16:45'; original.names = 'QA Ana & QA Luis';
  const saved = parseInvitation({ ...original, builder_config: JSON.stringify(original.config) });
  const before = clone(saved), date = paradiseReferenceDate(saved.event_date);
  assert.ok(date); assert.equal(date.iso, '2028-02-29'); assert.equal(date.dateLine, '29/02/28');
  assert.equal(paradiseReferenceHeading(saved).dateLine, date.dateLine);
  const calendar = new URL(paradiseReferenceCalendar(saved));
  assert.equal(calendar.searchParams.get('ctz'), 'America/La_Paz', 'the calendar and countdown use the same event timezone');
  assert.equal(calendar.protocol, 'https:'); assert.equal(calendar.hostname, 'calendar.google.com');
  assert.match(calendar.searchParams.get('dates'), /^20280229/);
  assert.match(calendar.searchParams.get('text'), /QA Ana/); assert.match(calendar.searchParams.get('text'), /QA Luis/);
  assert.deepEqual(saved, before, 'Date derivation and calendar preparation cannot rewrite the saved draft');
});

test('blank and impossible dates never revive the sample event or create a calendar link', () => {
  const { paradiseReferenceDemo, paradiseReferenceDate, paradiseReferenceCalendar, paradiseReferenceHeading } = dataHelpers();
  for (const invalid of [null, '', '2027-02-29', '2028-02-30', '2028-13-01', '2028-00-10', 'invalid']) {
    const data = paradiseReferenceDemo(); data.event_date = invalid;
    assert.equal(paradiseReferenceDate(invalid), null, String(invalid));
    assert.equal(paradiseReferenceCalendar(data), null, String(invalid));
    assert.equal(paradiseReferenceHeading(data).dateLine, '', String(invalid));
  }
});

test('the interior formats valid 24-hour clocks and leaves incomplete or impossible times empty', () => {
  const { paradiseReferenceClock } = dataHelpers();
  for (const [value, expected] of [['00:00', '00:00 h'], ['06:09', '06:09 h'], ['18:30:00', '18:30 h'], ['23:59', '23:59 h']]) assert.equal(paradiseReferenceClock(value), expected);
  for (const invalid of [null, '', '6:00', '24:00', '12:60', '25:95', '-1:00', 'invalid']) assert.equal(paradiseReferenceClock(invalid), '');
});

test('calendar all-day dates and the last minute of the year always end after they begin', () => {
  const { paradiseReferenceDemo, paradiseReferenceCalendar } = dataHelpers();
  const data = paradiseReferenceDemo(); data.event_date = '2028-12-31'; data.ceremony_time = null; data.reception_time = null;
  const allDay = new URL(paradiseReferenceCalendar(data)).searchParams.get('dates');
  assert.equal(allDay, '20281231/20290101');
  data.ceremony_time = '23:59';
  const [start, end] = new URL(paradiseReferenceCalendar(data)).searchParams.get('dates').split('/');
  assert.match(start, /^20281231T2359/); assert.ok(end > start, 'A 23:59 ceremony must not create a zero-length event');
  assert.doesNotMatch(start + end, /Z/, 'The model has no timezone that would justify rewriting its local event time to UTC');
});

test('calendar and map destinations keep edited names and places as encoded data', () => {
  const { paradiseReferenceDemo, paradiseReferenceCalendar, paradiseReferenceMaps } = dataHelpers();
  const data = paradiseReferenceDemo(); data.names = 'QA Ana & Luis? # Jardín'; data.event_date = '2029-06-19';
  data.ceremony_place = 'QA Iglesia & Salón'; data.ceremony_address = 'QA Calle #5?x=1&next=javascript:alert(1)';
  const calendar = new URL(paradiseReferenceCalendar(data));
  assert.equal(calendar.searchParams.get('text').includes(data.names), true);
  const map = new URL(paradiseReferenceMaps(data.ceremony_place, data.ceremony_address));
  assert.equal(map.protocol, 'https:'); assert.ok(['www.google.com', 'maps.google.com'].includes(map.hostname));
  assert.equal([...map.searchParams.values()].some(value => value.includes(data.ceremony_place) && value.includes(data.ceremony_address)), true);
  assert.equal(paradiseReferenceMaps('', ''), null); assert.equal(paradiseReferenceMaps(null, null), null);
});

test('the reference starter creates independent editable interior lists without changing Verdealma', () => {
  const { paradiseReferenceStarter } = dataHelpers();
  const { invitationDemo } = require('../src/lib/template-starters.ts');
  const before = clone(invitationDemo('paradise')), first = paradiseReferenceStarter(), second = paradiseReferenceStarter();
  assert.equal(first.builder_config.designKey, 'paradise-referencia'); assert.equal(first.status, 'draft');
  for (const key of ['parents_groom', 'parents_bride', 'sponsors', 'itinerary']) {
    assert.ok(Array.isArray(first[key])); assert.notEqual(first[key], second[key]);
  }
  first.parents_bride.push('QA edited parent'); first.itinerary.push({ time: '12:30', label: 'QA edited activity', icon: 'clock' });
  assert.equal(second.parents_bride.includes('QA edited parent'), false);
  assert.equal(second.itinerary.some(item => item.label === 'QA edited activity'), false);
  const after = invitationDemo('paradise'); after.created_at = before.created_at;
  assert.deepEqual(after, before);
});

const musicComponents = () => require('../src/components/invitations/ParadiseReferenceMusic.tsx');

test('music preserves the original source, avoids mount autoplay and follows actual play/pause events', async () => {
  const { default: Music, startParadiseReferenceMusic } = musicComponents();
  await withUI(Music, { src: '/audio/qa-original.mp3' }, async r => {
    const audio = nodes(r.tree(), node => node.type === 'audio')[0];
    assert.equal(audio.props.src, '/audio/qa-original.mp3'); assert.equal(audio.props.preload, 'none'); assert.equal(audio.props.loop, true); assert.equal(r.plays(), 0);
    assert.equal(button(r).props['aria-label'], 'Reproducir música');
    startParadiseReferenceMusic(null); assert.equal(r.plays(), 0);
    startParadiseReferenceMusic(r.content); assert.equal(r.plays(), 1, 'Starting inside the entry gesture must not wait for a timer or render');
    await r.flush(); assert.equal(button(r).props['aria-label'], 'Pausar música');
    button(r).props.onClick(); await r.flush(); assert.equal(button(r).props['aria-label'], 'Reproducir música'); assert.equal(r.audio.paused, true);
  });
});

test('same-turn entry requests start one playback attempt and an explicit pause cancels its late rejection', async () => {
  const { default: Music, startParadiseReferenceMusic } = musicComponents(), wait = deferred();
  await withUI(Music, { src: '/audio/qa-one.mp3' }, async r => {
    startParadiseReferenceMusic(r.content); startParadiseReferenceMusic(r.content); assert.equal(r.plays(), 1);
    button(r).props.onClick(); await r.flush(); assert.equal(r.audio.paused, true);
    wait.reject(Error('QA canceled attempt')); await r.flush();
    assert.equal(nodes(r.tree(), node => node.props.role === 'status').length, 0); assert.equal(r.plays(), 1);
  }, { play: () => wait.promise });
});

test('a rejected entry playback exposes an accessible retry and the next user gesture can play', async () => {
  const { default: Music, startParadiseReferenceMusic } = musicComponents();
  await withUI(Music, { src: '/audio/qa-one.mp3' }, async r => {
    startParadiseReferenceMusic(r.content); await r.flush();
    assert.equal(r.audio.paused, true); assert.equal(nodes(r.tree(), node => node.props.role === 'status').length, 1);
    assert.equal(button(r).props['aria-label'], 'Reproducir música');
    button(r).props.onClick(); await r.flush(); assert.equal(r.plays(), 2); assert.equal(button(r).props['aria-label'], 'Pausar música');
    assert.equal(nodes(r.tree(), node => node.props.role === 'status').length, 0);
  }, { play: (audio, count) => count === 1 ? Promise.reject(Error('QA browser blocked autoplay')) : (audio.paused = false, audio.dispatchEvent(new Event('play')), Promise.resolve()) });
});

test('a stalled play has a finite timeout and can be retried without a late error overwriting the result', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { default: Music } = musicComponents(), wait = deferred();
  await withUI(Music, { src: '/audio/qa-one.mp3' }, async r => {
    button(r).props.onClick(); await r.flush(); t.mock.timers.tick(25000); await r.flush();
    assert.equal(r.audio.paused, true); assert.equal(nodes(r.tree(), node => node.props.role === 'status').length, 1);
    button(r).props.onClick(); await r.flush(); assert.equal(r.plays(), 2); assert.equal(button(r).props['aria-label'], 'Pausar música');
    wait.reject(Error('QA old attempt finished late')); await r.flush();
    assert.equal(button(r).props['aria-label'], 'Pausar música'); assert.equal(nodes(r.tree(), node => node.props.role === 'status').length, 0);
  }, { play: (audio, count) => count === 1 ? wait.promise : (audio.paused = false, audio.dispatchEvent(new Event('play')), Promise.resolve()) });
});

test('changing tracks ignores the obsolete play rejection and pauses the removed source', async () => {
  const { default: Music } = musicComponents(), wait = deferred();
  await withUI(Music, { src: '/audio/qa-one.mp3' }, async r => {
    button(r).props.onClick(); await r.flush(); const pauses = r.pauses();
    await r.update({ src: '/audio/qa-two.mp3' }); assert.ok(r.pauses() > pauses); assert.equal(r.audio.source, '/audio/qa-two.mp3');
    wait.reject(Error('QA old source rejected')); await r.flush();
    assert.equal(nodes(r.tree(), node => node.props.role === 'status').length, 0); assert.equal(button(r).props['aria-label'], 'Reproducir música');
  }, { play: () => wait.promise });
});

test('unmount removes media listeners and rejects late playback work without writing state', async () => {
  const { default: Music } = musicComponents(), wait = deferred();
  await withUI(Music, { src: '/audio/qa-one.mp3' }, async r => {
    button(r).props.onClick(); r.unmount(); wait.reject(Error('QA unmounted attempt'));
    r.audio.dispatchEvent(new Event('play')); r.dispatch(new CustomEvent('enkarta:audio-error', { detail: { audio: r.audio } })); await r.flush();
    assert.equal(r.late(), 0); assert.equal(r.audio.paused, true);
  }, { play: () => wait.promise });
});

test('late playback fulfillment cannot undo a newer explicit pause', async () => {
  const { default: Music } = musicComponents(), wait = deferred();
  await withUI(Music, { src: '/audio/qa-one.mp3' }, async r => {
    const click = button(r).props.onClick; click(); click(); await r.flush();
    r.audio.paused = false; wait.resolve(); await r.flush();
    assert.equal(r.audio.paused, true); assert.equal(button(r).props['aria-label'], 'Reproducir música'); assert.equal(r.plays(), 1);
  }, { play: () => wait.promise });
});

test('a hidden document pauses playback and returning to the page does not restart it automatically', async () => {
  const { default: Music } = musicComponents();
  await withUI(Music, { src: '/audio/qa-one.mp3' }, async r => {
    button(r).props.onClick(); await r.flush(); assert.equal(button(r).props['aria-label'], 'Pausar música');
    document.visibilityState = 'hidden'; document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); await r.flush();
    assert.equal(r.audio.paused, true); assert.equal(button(r).props['aria-label'], 'Reproducir música');
    document.visibilityState = 'visible'; document.hidden = false; document.dispatchEvent(new Event('visibilitychange')); await r.flush();
    assert.equal(r.plays(), 1); assert.equal(r.audio.paused, true);
  });
});

test('an audio error from a different invitation cannot affect this player', async () => {
  const { default: Music } = musicComponents();
  await withUI(Music, { src: '/audio/qa-one.mp3' }, async r => {
    r.dispatch(new CustomEvent('enkarta:audio-error', { detail: { audio: {} } })); await r.flush();
    assert.equal(nodes(r.tree(), node => node.props.role === 'status').length, 0);
    r.dispatch(new CustomEvent('enkarta:audio-error', { detail: { audio: r.audio } })); await r.flush();
    assert.equal(nodes(r.tree(), node => node.props.role === 'status').length, 1);
  });
});

test('a generic cinematic entry can start the same player and a later external event cannot reverse a requested pause', async () => {
  const { default: Music } = musicComponents();
  await withUI(Music, { src: '/audio/qa-one.mp3' }, async r => {
    await r.audio.play(); await r.flush(); assert.equal(button(r).props['aria-label'], 'Pausar música');
    button(r).props.onClick(); await r.flush(); r.audio.paused = false; r.audio.dispatchEvent(new Event('play')); await r.flush();
    assert.equal(r.audio.paused, true); assert.equal(button(r).props['aria-label'], 'Reproducir música');
  });
});

test('builder preview and an intentionally cleared track expose no player and never start playback', async () => {
  const { default: Music } = musicComponents();
  for (const props of [{ src: '/audio/qa-one.mp3', preview: true }, { src: '' }]) await withUI(Music, props, async r => {
    assert.equal(nodes(r.tree(), node => node.type === 'audio').length, 0); assert.equal(button(r), undefined); assert.equal(r.plays(), 0);
  });
});

test('entry fallback reports only its own current audio when the player has not attached listeners', async () => {
  const { startParadiseReferenceMusic } = musicComponents();
  function AudioOnly({ src }) { const ref = React.useRef(null); return React.createElement('audio', { src, ref, 'data-invitation-music': true }); }
  for (const invalidation of ['none', 'source', 'removed']) {
    const wait = deferred();
    await withUI(AudioOnly, { src: '/audio/qa-one.mp3' }, async r => {
      const errors = []; window.addEventListener('enkarta:audio-error', event => errors.push(event.detail.audio));
      startParadiseReferenceMusic(r.content); assert.equal(r.plays(), 1);
      if (invalidation === 'source') r.audio.source = '/audio/qa-new.mp3';
      if (invalidation === 'removed') r.content.contains = () => false;
      wait.reject(Error('QA fallback blocked')); await r.flush();
      assert.deepEqual(errors, invalidation === 'none' ? [r.audio] : []);
    }, { play: () => wait.promise });
  }
});

let mediaPolicy = { ready: true, reducedMotion: false, saveData: false, pageVisible: true };
const sectionComponents = () => {
  stub('../src/lib/use-media-preferences.ts', { useMediaPreferences: () => mediaPolicy });
  return require('../src/components/invitations/ParadiseReferenceSections.tsx');
};

test('edited interior text, ordered families, sponsors, activities and clocks survive persistence and render escaped', () => {
  const { paradiseReferenceDemo } = dataHelpers(), { parseInvitation } = require('../src/lib/types.ts');
  const data = paradiseReferenceDemo(); data.event_date = '2028-02-29'; data.ceremony_time = '16:45'; data.reception_time = '18:15';
  data.config.introMessage = 'QA intro <script>alert(1)</script>'; data.config.verse = 'QA verse & promise'; data.config.verseRef = 'QA reference';
  data.parents_bride = ['QA Primera', 'QA Segunda']; data.parents_groom = ['QA Tercero'];
  data.sponsors = [{ role: 'QA <role>', names: 'QA sponsors' }]; data.dress_code = 'QA edited formal';
  data.itinerary = [{ time: '16:45', label: 'QA first activity', place: 'QA garden', note: 'QA invitation note' }, { time: '19:10', label: 'QA second activity' }];
  const stored = { ...data, builder_config: JSON.stringify(data.config) };
  for (const key of ['parents_bride', 'parents_groom', 'sponsors', 'itinerary']) stored[key] = JSON.stringify(data[key]);
  const saved = parseInvitation(stored), before = clone(saved);
  const { ParadiseReferenceSections } = sectionComponents();
  const html = renderToStaticMarkup(React.createElement(ParadiseReferenceSections, { data: saved }));
  assert.match(html, /QA intro &lt;script&gt;alert\(1\)&lt;\/script&gt;/); assert.doesNotMatch(html, /<script>/);
  for (const expected of ['QA verse &amp; promise', 'QA reference', 'QA &lt;role&gt;', 'QA sponsors', 'QA edited formal', 'QA garden', 'QA invitation note', '16:45 h', '18:15 h', '19:10 h']) assert.ok(html.includes(expected), expected);
  assert.ok(html.indexOf('QA Primera') < html.indexOf('QA Segunda')); assert.ok(html.indexOf('QA first activity') < html.indexOf('QA second activity'));
  assert.deepEqual(saved, before, 'Rendering cannot reorder or modify saved editorial data');
});

test('clearing editable interior fields and lists does not revive the reference sample data', () => {
  const { paradiseReferenceDemo } = dataHelpers(), data = paradiseReferenceDemo();
  for (const key of ['introMessage', 'verse', 'verseRef', 'blessing', 'rsvpMessage', 'rsvpClosing', 'galleryMessage', 'noKidsMessage', 'giftRegistryUrl', 'giftQrUrl', 'footerImage', 'secondaryImage']) data.config[key] = '';
  data.config.galleryImages = []; data.config.lodging = []; data.config.sectionImages = {};
  data.parents_bride = []; data.parents_groom = []; data.sponsors = []; data.itinerary = []; data.no_kids = false;
  data.ceremony_time = null; data.ceremony_place = null; data.ceremony_address = null; data.reception_time = null; data.reception_place = null; data.reception_address = null;
  data.guest_name = null; data.gift_message = null; data.bank_account = null; data.gallery_url = null; data.message = null; data.dress_code = null;
  const { ParadiseReferenceSections } = sectionComponents();
  const html = renderToStaticMarkup(React.createElement(ParadiseReferenceSections, { data }));
  for (const absent of ['Liduzmila', 'José Zeña', 'Alicia Mariluz', 'Jorge Pachas', 'Notre Dame', 'Madisson', 'Hotel Four Points', 'Nuestro gran día', 'Eclesiastés', 'Daniel Martinez', 'Solo Adultos']) assert.equal(html.includes(absent), false, absent);
  for (const absent of ['parents', 'sponsors', 'itinerary', 'lodging', 'adults', 'closing', 'verse']) assert.doesNotMatch(html, new RegExp(`data-paradise-section="${absent}"`));
});

test('configured destinations remain safe links and do not turn editor text into executable navigation', () => {
  const { paradiseReferenceDemo } = dataHelpers(), data = paradiseReferenceDemo();
  const { ParadiseReferenceSections, paradiseReferenceHref } = sectionComponents();
  for (const unsafe of ['javascript:alert(1)', 'data:text/html,x', '//evil.example/path', 'http://example.org', 'https://user:pass@example.org', 'https://example.org\\attack', '/path\nattack']) assert.equal(paradiseReferenceHref(unsafe), undefined, unsafe);
  assert.equal(paradiseReferenceHref('/gallery/qa'), '/gallery/qa'); assert.equal(paradiseReferenceHref('https://qa.example/photos?a=1&b=2'), 'https://qa.example/photos?a=1&b=2');
  data.config.giftRegistryUrl = 'javascript:QA_REGISTRY'; data.config.giftQrUrl = 'data:QA_QR'; data.gallery_url = '//QA_SHARE.example';
  data.config.lodging = [{ name: 'QA Hotel', image: '/qa-hotel.webp', url: 'javascript:QA_HOTEL' }];
  const html = renderToStaticMarkup(React.createElement(ParadiseReferenceSections, { data }));
  assert.doesNotMatch(html, /QA_REGISTRY|QA_QR|QA_SHARE|QA_HOTEL/); assert.doesNotMatch(html, /href="(?:javascript:|data:|\/\/)/);
});

const activeSlide = runner => nodes(runner.tree(), node => node.props['data-active'] !== undefined)[0];
const activeImage = runner => nodes(activeSlide(runner), node => node.type === 'img')[0]?.props.src;

test('gallery arrows compose repeated clicks, keep the selected photo on reorder and preserve URL-associated captions', async () => {
  const { ParadiseReferenceCarousel: Carousel } = sectionComponents();
  await withUI(Carousel, { images: ['/qa-one.webp', '/qa-two.webp', '/qa-three.webp'], label: 'QA Galería', captions: [{ image: '/qa-three.webp', title: 'QA third title', caption: 'QA third caption', alt: 'QA third description' }] }, async r => {
    assert.equal(activeImage(r), '/qa-one.webp');
    const next = button(r, 'Siguiente').props.onClick; next(); next(); await r.flush();
    assert.equal(activeImage(r), '/qa-three.webp'); assert.match(text(r.tree()), /3\s*\/\s*3/); assert.match(text(r.tree()), /QA third title/); assert.match(text(r.tree()), /QA third caption/);
    assert.equal(nodes(activeSlide(r), node => node.type === 'img')[0].props.alt, 'QA third description');
    await r.update({ images: ['/qa-three.webp', '/qa-one.webp', '/qa-two.webp'] });
    assert.equal(activeImage(r), '/qa-three.webp'); assert.match(text(r.tree()), /1\s*\/\s*3/); assert.match(text(r.tree()), /QA third caption/);
    await r.update({ images: ['/qa-two.webp'] }); assert.equal(activeImage(r), '/qa-two.webp'); assert.doesNotMatch(text(r.tree()), /QA third caption/); assert.equal(button(r), undefined);
  });
});

test('an unsafe hotel image is removed together with its own title, preserving the next hotel association', () => {
  const { ParadiseReferenceCarousel: Carousel } = sectionComponents();
  const html = renderToStaticMarkup(React.createElement(Carousel, { images: ['/qa-hotel-one.webp', 'javascript:qa-bad', '/qa-hotel-three.webp'], titles: ['QA Hotel One', 'QA Invalid Hotel', 'QA Hotel Three'], label: 'QA Hospedaje' }));
  assert.match(html, /QA Hotel One/); assert.match(html, /QA Hotel Three/); assert.doesNotMatch(html, /QA Invalid Hotel|javascript:/);
});

test('two hotels may share a photograph without making the second hotel unreachable', async () => {
  const { ParadiseReferenceCarousel: Carousel } = sectionComponents();
  await withUI(Carousel, { images: ['/qa-shared-hotel.webp', '/qa-shared-hotel.webp'], titles: ['QA Hotel A', 'QA Hotel B'], label: 'QA Hospedaje' }, async r => {
    assert.match(text(activeSlide(r)), /QA Hotel A/);
    button(r, 'Siguiente').props.onClick(); await r.flush();
    assert.match(text(activeSlide(r)), /QA Hotel B/); assert.match(text(r.tree()), /2\s*\/\s*2/);
    button(r, 'Anterior').props.onClick(); await r.flush(); assert.match(text(activeSlide(r)), /QA Hotel A/);
  });
});

test('automatic slides pause after manual navigation, resume explicitly and stop on unmount', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { ParadiseReferenceCarousel: Carousel } = sectionComponents();
  await withUI(Carousel, { images: ['/qa-one.webp', '/qa-two.webp', '/qa-three.webp'], label: 'QA Galería', intervalMs: 2000 }, async r => {
    t.mock.timers.tick(2000); await r.flush(); assert.equal(activeImage(r), '/qa-two.webp');
    button(r, 'Siguiente').props.onClick(); await r.flush(); assert.equal(activeImage(r), '/qa-three.webp');
    t.mock.timers.tick(10000); await r.flush(); assert.equal(activeImage(r), '/qa-three.webp'); assert.ok(button(r, 'Reanudar'));
    button(r, 'Reanudar').props.onClick(); await r.flush(); t.mock.timers.tick(2000); await r.flush(); assert.equal(activeImage(r), '/qa-one.webp');
    r.unmount(); t.mock.timers.tick(10000); await r.flush(); assert.equal(r.late(), 0);
  });
});

test('reduced motion, data saving and page visibility suppress automatic slides while retaining manual controls', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { ParadiseReferenceCarousel: Carousel } = sectionComponents();
  const normal = { ready: true, reducedMotion: false, saveData: false, pageVisible: true };
  try {
    for (const override of [{ reducedMotion: true }, { saveData: true }, { pageVisible: false }, { ready: false }]) {
      mediaPolicy = { ...normal, ...override };
      await withUI(Carousel, { images: ['/qa-one.webp', '/qa-two.webp'], label: 'QA Galería', kenBurns: true }, async r => {
        t.mock.timers.tick(20000); await r.flush(); assert.equal(activeImage(r), '/qa-one.webp');
        if (override.reducedMotion || override.saveData) assert.equal(r.tree().props['data-ken-burns'], undefined);
        button(r, 'Siguiente').props.onClick(); await r.flush(); assert.equal(activeImage(r), '/qa-two.webp');
      });
    }
  } finally { mediaPolicy = normal; }
});

test('the interior RSVP renders one server-supplied form inside native details before the closing photographs', () => {
  const { default: Rsvp, ParadiseReferenceRsvpProvider: Provider } = require('../src/components/invitations/ParadiseReferenceRsvp.tsx');
  const verified = React.createElement('form', { 'data-qa-server-form': 'verified' }, React.createElement('p', {}, 'QA verified family · 2 passes'));
  const html = renderToStaticMarkup(React.createElement(Provider, { form: verified }, React.createElement(Rsvp)));
  assert.match(html, /<details/); assert.match(html, /<summary[^>]*>Confirmar Asistencia<\/summary>/);
  assert.equal((html.match(/data-qa-server-form="verified"/g) || []).length, 1); assert.match(html, /QA verified family · 2 passes/);
  assert.ok(html.indexOf('<summary') < html.indexOf('<form')); assert.ok(html.indexOf('</form>') < html.indexOf('</details>'));
  const { ParadiseReferenceSections } = sectionComponents(), data = dataHelpers().paradiseReferenceDemo();
  const interior = renderToStaticMarkup(React.createElement(Provider, { form: verified }, React.createElement(ParadiseReferenceSections, { data })));
  assert.equal((interior.match(/data-qa-server-form="verified"/g) || []).length, 1);
  assert.ok(interior.indexOf('data-paradise-section="rsvp"') < interior.indexOf('data-qa-server-form="verified"'));
  assert.ok(interior.indexOf('data-qa-server-form="verified"') < interior.indexOf('data-paradise-section="closing"'));
});

test('an absent authorized form does not grant RSVP or invent an external confirmation destination', () => {
  const { default: Rsvp, ParadiseReferenceRsvpProvider: Provider } = require('../src/components/invitations/ParadiseReferenceRsvp.tsx');
  for (const content of [React.createElement(Rsvp), React.createElement(Provider, { form: null }, React.createElement(Rsvp))]) {
    const html = renderToStaticMarkup(content);
    assert.doesNotMatch(html, /<form|<details|<button|href=|forms\.gle|wa\.me|docs\.google/); assert.match(html, /Solicita a los anfitriones/);
  }
});

test('the demo confirmation explicitly says no RSVP was sent and performs no request', async () => {
  const { default: Rsvp } = require('../src/components/invitations/ParadiseReferenceRsvp.tsx');
  await withUI(Rsvp, { demo: true }, async r => {
    assert.equal(nodes(r.tree(), node => node.type === 'form').length, 0); assert.equal(nodes(r.tree(), node => node.props.role === 'status').length, 0);
    button(r, 'Confirmar Asistencia').props.onClick(); await r.flush();
    assert.equal(nodes(r.tree(), node => node.props.role === 'status').length, 1); assert.match(text(r.tree()), /No se envió ninguna confirmación/);
    button(r, 'Confirmar Asistencia').props.onClick(); await r.flush(); assert.equal(nodes(r.tree(), node => node.props.role === 'status').length, 1);
  });
});

test('the actual countdown uses the edited event day and Bolivia clock, updates, and never becomes negative', async t => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'], now: new Date('2028-02-28T20:45:00Z') });
  const { ParadiseReferenceSections } = sectionComponents(), data = dataHelpers().paradiseReferenceDemo();
  data.event_date = '2028-02-29'; data.ceremony_time = '16:45';
  const component = nodes(ParadiseReferenceSections({ data }), node => typeof node.type === 'function' && node.type.name === 'Countdown')[0];
  assert.ok(component, 'The profile mounts its real editable countdown');
  await withUI(component.type, { data }, async r => {
    const values = () => nodes(nodes(r.tree(), node => node.props.role === 'timer')[0], node => node.type === 'span').map(text);
    assert.deepEqual(values(), ['01', '00', '00', '00']);
    t.mock.timers.tick(1000); await r.flush(); assert.deepEqual(values(), ['00', '23', '59', '59']);
    const past = clone(data); past.event_date = '2027-06-19'; await r.update({ data: past }); assert.deepEqual(values(), ['00', '00', '00', '00']);
    const invalid = clone(data); invalid.event_date = null; await r.update({ data: invalid }); assert.deepEqual(values(), ['—', '—', '—', '—']);
    assert.equal(nodes(r.tree(), node => node.type === 'a').length, 0, 'An invalid date does not leave a stale calendar link');
  });
});

test('the visual reference never grants calendar, guest-name or lodging features disabled by the contract', () => {
  const { ParadiseReferenceSections } = sectionComponents(), data = dataHelpers().paradiseReferenceDemo();
  data.config.features = { calendar: false, guestNames: false, lodging: false };
  const html = renderToStaticMarkup(React.createElement(ParadiseReferenceSections, { data }));
  assert.doesNotMatch(html, /calendar\.google\.com|Daniel Martinez|data-paradise-section="lodging"/);
});

const fieldsHarness = () => require('./test-template-fields-ux-ui.cjs');
const referenceEditorFixture = () => {
  const data = dataHelpers().paradiseReferenceDemo();
  data.config.sectionImages = { paradiseClosingSecond: '/qa-closing-second.webp', qaOtherOriginal: '/qa-section-original.webp' };
  data.config.lodging = [{ name: 'QA Hotel A', image: '/qa-hotel-a.webp', desc: 'QA description A', url: 'https://qa-a.example/', qaOriginal: { revision: 1 } }, { name: 'QA Hotel B', image: '/qa-hotel-b.webp', desc: 'QA description B', url: 'https://qa-b.example/', qaOriginal: { revision: 2 } }];
  return data;
};

test('the real Paradise editor composes same-turn text edits and merges a retained closing-photo callback with current section images', async () => {
  const { withFields, controls } = fieldsHarness();
  await withFields(async r => {
    const field = name => { const input = controls(r).find(node => node.props.name === name); assert.ok(input, name); return input; };
    const intro = field('paradise-introMessage'), verse = field('paradise-verse'), closing = field('paradise-closing-second');
    intro.props.onChange({ target: { value: 'QA newer intro' } }); verse.props.onChange({ target: { value: 'QA newer verse' } }); await r.flush();
    assert.equal(r.data().config.introMessage, 'QA newer intro'); assert.equal(r.data().config.verse, 'QA newer verse');
    await r.setData({ config: { ...r.data().config, musicUrl: '/audio/qa-current.mp3', sectionImages: { ...r.data().config.sectionImages, qaOtherOriginal: '/qa-section-new.webp', qaInsertedImage: '/qa-inserted.webp' } } });
    closing.props.onChange({ target: { value: '/qa-closing-latest.webp' } }); await r.flush();
    assert.deepEqual(r.data().config.sectionImages, { paradiseClosingSecond: '/qa-closing-latest.webp', qaOtherOriginal: '/qa-section-new.webp', qaInsertedImage: '/qa-inserted.webp' });
    assert.equal(r.data().config.musicUrl, '/audio/qa-current.mp3'); assert.equal(r.data().config.introMessage, 'QA newer intro');
  }, { data: referenceEditorFixture() });
});

test('two hotel edits before rendering preserve each other, original row metadata and current unrelated invitation data', async () => {
  const { withFields, controls } = fieldsHarness();
  await withFields(async r => {
    const hotelFields = field => controls(r).filter(node => node.props.name?.startsWith('paradise-hotel-') && node.props.name.endsWith('-' + field));
    const before = clone(r.data().config.lodging), retainedName = hotelFields('name')[0], retainedSecondDescription = hotelFields('desc')[1];
    retainedName.props.onChange({ target: { value: 'QA Hotel A newer name' } }); retainedSecondDescription.props.onChange({ target: { value: 'QA Hotel B newer description' } }); await r.flush();
    assert.deepEqual(r.data().config.lodging, [{ ...before[0], name: 'QA Hotel A newer name' }, { ...before[1], desc: 'QA Hotel B newer description' }]);
    assert.equal(r.data().config.designKey, 'paradise-referencia'); assert.equal(r.data().config.sectionImages.qaOtherOriginal, '/qa-section-original.webp');
    assert.doesNotMatch(JSON.stringify(r.data()), /list-row-\d+/, 'Editing-only identities do not enter saved invitation JSON');
  }, { data: referenceEditorFixture() });
});

test('retained hotel controls follow their row after reordering and cannot resurrect that hotel after removal', async () => {
  const { withFields, controls, buttons, text: fieldText } = fieldsHarness();
  await withFields(async r => {
    const firstUrl = controls(r).find(node => node.props.name?.startsWith('paradise-hotel-') && node.props.name.endsWith('-url'));
    const move = buttons(r).find(node => node.props['aria-label'] === 'Bajar hospedaje 1'); assert.ok(firstUrl); assert.ok(move);
    move.props.onClick(); await r.flush(); assert.equal(r.data().config.lodging[1].name, 'QA Hotel A');
    firstUrl.props.onChange({ target: { value: 'https://qa-a-latest.example/' } }); await r.flush();
    assert.equal(r.data().config.lodging[1].url, 'https://qa-a-latest.example/'); assert.equal(r.data().config.lodging[0].url, 'https://qa-b.example/');
    const remove = buttons(r).find(node => fieldText(node).replace(/\s+/g, ' ').trim() === 'Quitar hospedaje 2'); assert.ok(remove); remove.props.onClick(); await r.flush();
    const before = clone(r.data()), writes = r.patches.length;
    firstUrl.props.onChange({ target: { value: 'https://qa-retired.example/' } }); await r.flush();
    assert.deepEqual(r.data(), before); assert.equal(r.patches.length, writes); assert.equal(r.data().config.lodging.length, 1);
  }, { data: referenceEditorFixture() });
});

test('retained Paradise-specific editors cannot modify a different invitation or a newer inherited editing revision', async () => {
  const { withFields, controls } = fieldsHarness();
  for (const changed of ['owner', 'revision']) await withFields(async r => {
    const old = controls(r).find(node => node.props.name === 'paradise-closing-second'); assert.ok(old);
    if (changed === 'owner') await r.setData({ id: '30000000-0000-4000-8000-000000000002' }); else await r.revise();
    const before = clone(r.data()), writes = r.patches.length;
    old.props.onChange({ target: { value: '/qa-obsolete-close.webp' } }); await r.flush();
    assert.deepEqual(r.data(), before); assert.equal(r.patches.length, writes);
  }, { data: referenceEditorFixture(), inherited: changed === 'revision' });
});
