// Real PartnerDesignPicker, catalog and request helper; fictional responses and
// deterministic RAM clock. No DOM, credentials, real transport, storage or banking.
'use strict';
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest);
};
const transpile = (source, filename) => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
}, fileName: filename }).outputText;
require.extensions['.ts'] = require.extensions['.tsx'] = (mod, filename) => mod._compile(transpile(fs.readFileSync(filename, 'utf8'), filename), filename);
const React = require('react');
let navigation;
require.cache[require.resolve('next/navigation')] = { exports: { useRouter: () => navigation } };
const filename = path.join(root, 'src/components/partners/PartnerDesignPicker.tsx');
let source = fs.readFileSync(filename, 'utf8');
if (process.argv.includes('--baseline')) {
  // Reproduction only: normal shallow-checkout CI never invokes Git.
  source = require('node:child_process').execFileSync('git', ['-c', 'core.fsmonitor=false', 'show',
    'c905b082ad91c5062b4d31511bb8a289d54862d0:src/components/partners/PartnerDesignPicker.tsx'], { cwd: root, encoding: 'utf8' });
}
const compiled = new Module(filename, module);
compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(transpile(source, filename), filename);
const Picker = compiled.exports.default;
const catalog = require('../src/lib/collection-catalog.ts').collectionCatalog();
const { draftCap } = require('../src/lib/partner-plans.ts');
const { PARTNER_REQUEST_TIMEOUT_MS: TIMEOUT } = require('../src/lib/partner-checkout.ts');
const ID = '30000000-0000-4000-8000-000000000101', NEXT_ID = '30000000-0000-4000-8000-000000000102';
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const observe = promise => { const state = { done: false }; Promise.resolve(promise).then(value => { state.done = true; state.value = value; }, error => { state.done = true; state.error = error; }); return state; };
const nodes = (element, predicate) => !React.isValidElement(element) ? [] : [
  ...(predicate(element) ? [element] : []), ...React.Children.toArray(element.props.children).flatMap(child => nodes(child, predicate)),
];
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(text).join(' ') : React.isValidElement(value) ? text(value.props.children) : '';
const buttons = runner => nodes(runner.current(), node => node.type === 'button');
const message = runner => text(runner.current());
const alerts = runner => nodes(runner.current(), node => node.props.role === 'alert').map(text).join(' ');
const action = (runner, index = 0) => buttons(runner)[index].props.onClick;
const ok = (id = ID) => Response.json({ id }, { status: 201 });
const samples = runner => nodes(runner.current(), node => node.type === 'article').map(card => ({
  image: nodes(card, node => node.type === 'img')[0].props.src,
  name: nodes(card, node => node.type === 'img')[0].props.alt,
  href: nodes(card, node => node.type === 'a')[0].props.href,
}));
function fakeClock(t) {
  let now = 1_800_000_000_000, serial = 0;
  const timers = new Map();
  t.mock.method(Date, 'now', () => now);
  t.mock.method(global, 'setTimeout', (callback, delay) => { const id = ++serial; timers.set(id, { callback, at: now + delay }); return id; });
  t.mock.method(global, 'clearTimeout', id => timers.delete(id));
  return { timers, elapse: ms => { now += ms; }, tick(ms) {
    now += ms;
    for (let round = 0; round < 500; round++) {
      const pending = [...timers].filter(([, timer]) => timer.at <= now).sort((left, right) => left[1].at - right[1].at)[0];
      if (!pending) return;
      timers.delete(pending[0]); pending[1].callback();
    }
    assert.fail('Unexpected draft timer loop');
  } };
}
async function withPicker(scenario, { props = {}, reply, pushError = false } = {}) {
  const names = ['useState', 'useRef', 'useEffect', 'useMemo', 'useCallback'];
  const original = Object.fromEntries(names.map(name => [name, React[name]])), oldFetch = global.fetch;
  const calls = [], pushes = [], snapshots = [], owners = [];
  let fiber = { slots: [], active: true }, cursor = 0, dirty = true, effects = [], tree, unmounted = false, lateWrites = 0;
  owners.push(fiber);
  let input = { plan: 'inicio', canPublish: false, totalInvitations: 0, ...props };
  const same = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  React.useState = initial => {
    const owner = fiber, index = cursor++;
    if (!(index in owner.slots)) {
      const slot = owner.slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      slot.set = next => { if (!owner.active) { lateWrites++; return; } next = typeof next === 'function' ? next(slot.value) : next; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } };
    }
    return [owner.slots[index].value, owner.slots[index].set];
  };
  React.useRef = initial => { const index = cursor++; return fiber.slots[index] ?? (fiber.slots[index] = { current: initial }); };
  React.useMemo = (compute, deps) => { const index = cursor++; if (!fiber.slots[index] || !same(fiber.slots[index].deps, deps)) fiber.slots[index] = { value: compute(), deps }; return fiber.slots[index].value; };
  React.useCallback = (callback, deps) => React.useMemo(() => callback, deps);
  React.useEffect = (effect, deps) => {
    const owner = fiber, index = cursor++, previous = owner.slots[index];
    if (!previous || !same(previous.deps, deps)) {
      const slot = { deps, effect, cleanup: previous?.cleanup }; owner.slots[index] = slot;
      effects.push(() => { if (owner.active) { slot.cleanup?.(); slot.cleanup = effect(); } });
    }
  };
  navigation = { push: url => { pushes.push(url); if (pushError) throw Error('QA_PRIVATE_ROUTER'); } };
  global.fetch = async (url, options = {}) => {
    assert.equal(url, '/api/partner/invitations', 'Only a fictional draft endpoint may be requested');
    assert.equal(options.method, 'POST', 'No implicit list/write/payment/auth requests');
    const call = { url, method: options.method, body: JSON.parse(options.body), headers: options.headers, cache: options.cache, signal: options.signal };
    calls.push(call); return reply ? reply(call, calls) : ok();
  };
  const cleanup = owner => { for (const slot of owner.slots) slot?.cleanup?.(); owner.active = false; };
  const flush = async () => {
    for (let round = 0; round < 60; round++) {
      if (dirty && !unmounted) { dirty = false; cursor = 0; effects = []; tree = Picker(input); snapshots.push(tree); for (const effect of effects) effect(); }
      await new Promise(done => setImmediate(done));
      if (!dirty || unmounted) return tree;
    }
    throw Error('Draft picker hooks did not settle');
  };
  const unmount = () => { if (!unmounted) { unmounted = true; cleanup(fiber); } };
  const runner = { calls, pushes, snapshots, flush, unmount, current: () => tree, lateWrites: () => lateWrites,
    update: async patch => { input = { ...input, ...patch }; dirty = true; return flush(); },
    remount: async patch => { unmount(); input = { ...input, ...patch }; fiber = { slots: [], active: true }; owners.push(fiber); unmounted = false; dirty = true; return flush(); },
    replayEffects: async () => {
      for (const slot of fiber.slots) if (slot?.effect) slot.cleanup?.();
      for (const slot of fiber.slots) if (slot?.effect) slot.cleanup = slot.effect();
      await flush();
    },
  };
  try { await flush(); return await scenario(runner); }
  finally {
    unmount(); for (const owner of owners) assert.equal(owner.active, false);
    for (const name of names) React[name] = original[name]; global.fetch = oldFetch;
    assert.ok(calls.every(call => call.url === '/api/partner/invitations' && call.method === 'POST'));
  }
}
function assertUncertain(runner) {
  assert.match(alerts(runner), /No pudimos comprobar si se creó el borrador/);
  assert.ok(nodes(runner.current(), node => node.type === 'a' && node.props.href === '/socios/panel' && text(node) === 'Revisar mis invitaciones').length);
  assert.ok(buttons(runner).every(node => node.props.disabled));
  assert.ok(buttons(runner).every(node => node.props['aria-busy'] === undefined));
  assert.doesNotMatch(message(runner), /Creando…|QA_PRIVATE|Borrador creado/);
  assert.deepEqual(runner.pushes, []);
}

test('a fetch that ignores abort leaves Creando after exactly 25 seconds without posting again', async t => {
  const clock = fakeClock(t), pending = deferred();
  await withPicker(async runner => {
    const click = action(runner), work = observe(click()); await runner.flush();
    assert.match(message(runner), /Creando…/); assert.equal(work.done, false);
    clock.tick(TIMEOUT - 1); await runner.flush(); assert.match(message(runner), /Creando…/); assert.equal(work.done, false);
    clock.tick(1); await runner.flush(); assert.equal(work.done, true); assert.equal(work.error, undefined); assertUncertain(runner);
    assert.equal(runner.calls[0].signal.aborted, true); click(); action(runner, 1)(); await runner.flush();
    assert.equal(runner.calls.length, 1); assert.equal(clock.timers.size, 0);
  }, { reply: () => pending.promise });
});

test('a successful response with a body that never settles uses the same 25 second deadline', async t => {
  const clock = fakeClock(t), pending = deferred();
  await withPicker(async runner => {
    const work = observe(action(runner)()); await runner.flush(); assert.equal(work.done, false);
    clock.tick(TIMEOUT); await runner.flush(); assert.equal(work.done, true); assertUncertain(runner);
    assert.equal(runner.calls.length, 1); assert.equal(runner.calls[0].signal.aborted, true); assert.equal(clock.timers.size, 0);
  }, { reply: () => ({ ok: true, status: 201, json: () => pending.promise }) });
});

test('JSON parsing receives only the time remaining after transport instead of a fresh 25 seconds', async t => {
  const clock = fakeClock(t), transport = deferred(), body = deferred(); let reads = 0;
  await withPicker(async runner => {
    const work = observe(action(runner)()); await runner.flush(); clock.tick(22_000);
    transport.resolve({ ok: true, status: 201, json: () => { reads++; return body.promise; } }); await runner.flush(); assert.equal(reads, 1);
    clock.tick(2_999); await runner.flush(); assert.equal(work.done, false); assert.match(message(runner), /Creando…/);
    clock.tick(1); await runner.flush(); assert.equal(work.done, true); assertUncertain(runner); assert.equal(clock.timers.size, 0);
  }, { reply: () => transport.promise });
});

test('a received definitive 4xx with an indefinitely pending error body stops waiting at the deadline', async t => {
  const clock = fakeClock(t), body = deferred();
  await withPicker(async runner => {
    const work = observe(action(runner)()); await runner.flush(); clock.tick(TIMEOUT); await runner.flush();
    assert.equal(work.done, true); assert.match(alerts(runner), /No se pudo crear el borrador/);
    assert.ok(buttons(runner).every(node => !node.props.disabled)); assert.doesNotMatch(message(runner), /Creando…|Borrador creado/);
    assert.equal(runner.calls.length, 1); assert.deepEqual(runner.pushes, []); assert.equal(clock.timers.size, 0);
  }, { reply: () => ({ ok: false, status: 422, json: () => body.promise }) });
});

test('a late transport ACK is ignored without reading its body or navigating after the deadline', async t => {
  const clock = fakeClock(t), pending = deferred(); let reads = 0;
  await withPicker(async runner => {
    observe(action(runner)()); await runner.flush(); clock.tick(TIMEOUT); await runner.flush(); assertUncertain(runner);
    const snapshots = runner.snapshots.length;
    pending.resolve({ ok: true, status: 201, json: async () => { reads++; return { id: ID }; } }); await runner.flush();
    assert.equal(reads, 0); assert.equal(runner.snapshots.length, snapshots); assert.equal(runner.lateWrites(), 0); assertUncertain(runner);
  }, { reply: () => pending.promise });
});

test('a late successful JSON body cannot turn an uncertain creation into navigation', async t => {
  const clock = fakeClock(t), pending = deferred();
  await withPicker(async runner => {
    observe(action(runner)()); await runner.flush(); clock.tick(TIMEOUT); await runner.flush(); const snapshots = runner.snapshots.length;
    pending.resolve({ id: ID }); await runner.flush(); assertUncertain(runner);
    assert.equal(runner.snapshots.length, snapshots); assert.equal(runner.lateWrites(), 0); assert.equal(clock.timers.size, 0);
  }, { reply: () => ({ ok: true, status: 201, json: () => pending.promise }) });
});

test('same-turn duplicate and different-design actions share one no-store POST and synchronous lock', async t => {
  fakeClock(t); const pending = deferred();
  await withPicker(async runner => {
    const first = action(runner), other = action(runner, 1); observe(first()); first(); other();
    assert.equal(runner.calls.length, 1); assert.deepEqual(runner.calls[0].body, { template: catalog[0].key });
    assert.equal(runner.calls[0].cache, 'no-store'); assert.equal(runner.calls[0].headers['Content-Type'], 'application/json'); assert.ok(runner.calls[0].signal instanceof AbortSignal);
    await runner.flush(); assert.equal(buttons(runner)[0].props['aria-busy'], true); assert.equal(buttons(runner)[1].props['aria-busy'], undefined);
    pending.resolve(ok()); await runner.flush(); assert.deepEqual(runner.pushes, ['/socios/constructor/' + ID]);
    first(); other(); await runner.flush(); assert.equal(runner.calls.length, 1);
  }, { reply: () => pending.promise });
});

test('a verified ACK before the deadline opens exactly once and clears the request timer', async t => {
  const clock = fakeClock(t), pending = deferred();
  await withPicker(async runner => {
    const before = samples(runner), stale = action(runner, 1); observe(action(runner)()); await runner.flush();
    clock.tick(TIMEOUT - 1); pending.resolve(ok()); await runner.flush();
    assert.deepEqual(runner.pushes, ['/socios/constructor/' + ID]); assert.match(message(runner), /Borrador creado\. Abriendo el constructor…/);
    assert.ok(buttons(runner).every(node => node.props.disabled)); assert.equal(clock.timers.size, 0); assert.deepEqual(samples(runner), before);
    stale(); clock.tick(TIMEOUT); await runner.flush(); assert.equal(runner.pushes.length, 1); assert.equal(runner.calls.length, 1);
  }, { reply: () => pending.promise });
});

test('definitive readable 4xx responses allow exactly one new explicit corrected attempt', async t => {
  const clock = fakeClock(t);
  for (const status of [400, 401, 403, 409, 422, 429]) await withPicker(async runner => {
    observe(action(runner)()); await runner.flush(); assert.match(alerts(runner), /QA selección rechazada/);
    assert.ok(buttons(runner).every(node => !node.props.disabled)); assert.equal(clock.timers.size, 0); assert.deepEqual(runner.pushes, []);
    const next = action(runner, 1); observe(next()); next(); await runner.flush();
    assert.equal(runner.calls.length, 2); assert.deepEqual(runner.calls[1].body, { template: catalog[1].key }); assert.equal(alerts(runner), '');
    assert.deepEqual(runner.pushes, ['/socios/constructor/' + NEXT_ID]);
  }, { reply: (_call, calls) => calls.length === 1 ? Response.json({ error: 'QA selección rechazada' }, { status }) : ok(NEXT_ID) });
});

test('a malformed definitive 4xx keeps its fallback and permits an explicit new attempt', async t => {
  const clock = fakeClock(t);
  for (const body of ['reject', 'null', 'array']) await withPicker(async runner => {
    observe(action(runner)()); await runner.flush(); assert.match(alerts(runner), /No se pudo crear el borrador/);
    assert.doesNotMatch(message(runner), /QA_PRIVATE|Borrador creado/); assert.ok(buttons(runner).every(node => !node.props.disabled)); assert.equal(clock.timers.size, 0);
    observe(action(runner, 1)()); await runner.flush(); assert.equal(runner.calls.length, 2); assert.equal(runner.pushes.length, 1);
  }, { reply: (_call, calls) => calls.length > 1 ? ok() : { ok: false, status: 400, json: async () => {
    if (body === 'reject') throw Error('QA_PRIVATE_MALFORMED'); return body === 'null' ? null : [];
  } } });
});

test('server, connection, malformed success and missing IDs stay uncertain without automatic retries', async t => {
  const clock = fakeClock(t);
  const failures = [
    () => { throw Error('QA_PRIVATE_NETWORK'); },
    () => Response.json({ error: 'QA_PRIVATE_SERVER' }, { status: 503 }),
    () => ({ ok: true, status: 201, json: async () => { throw Error('QA_PRIVATE_JSON'); } }),
    () => Response.json({ status: 'draft' }, { status: 201 }),
    () => Response.json({ id: 'https://qa.invalid/not-a-uuid' }, { status: 201 }),
    () => Response.json(null, { status: 201 }),
  ];
  for (const reply of failures) await withPicker(async runner => {
    const click = action(runner); observe(click()); await runner.flush(); assertUncertain(runner); assert.equal(clock.timers.size, 0);
    click(); action(runner, 1)(); clock.tick(100_000); await runner.flush(); assert.equal(runner.calls.length, 1); assertUncertain(runner);
  }, { reply });
});

test('router failure offers the already verified UUID without a second POST or hidden retry', async t => {
  const clock = fakeClock(t);
  await withPicker(async runner => {
    observe(action(runner)()); await runner.flush(); assert.match(alerts(runner), /El borrador se creó/);
    assert.ok(nodes(runner.current(), node => node.type === 'a' && node.props.href === '/socios/constructor/' + ID && text(node) === 'Abrir el borrador').length);
    assert.doesNotMatch(message(runner), /QA_PRIVATE/); assert.equal(runner.pushes.length, 1); assert.equal(clock.timers.size, 0);
    action(runner, 1)(); await runner.flush(); assert.equal(runner.calls.length, 1);
  }, { pushError: true });
});

test('changing the plan during creation preserves the submitted template and its one valid ACK', async t => {
  const clock = fakeClock(t), pending = deferred(); let reads = 0;
  await withPicker(async runner => {
    const stale = action(runner); observe(stale()); await runner.flush(); await runner.update({ plan: 'estudio' });
    assert.equal(runner.calls[0].signal.aborted, false); assert.match(message(runner), /Creando…/);
    pending.resolve({ ok: true, status: 201, json: async () => { reads++; return { id: ID }; } }); await runner.flush();
    stale(); action(runner, 1)(); await runner.flush(); assert.equal(reads, 1); assert.equal(runner.calls.length, 1);
    assert.deepEqual(runner.calls[0].body, { template: catalog[0].key }); assert.deepEqual(runner.pushes, ['/socios/constructor/' + ID]); assert.equal(clock.timers.size, 0);
  }, { reply: () => pending.promise });
});

test('capacity changes and ABA keep one pending creation rather than bypassing the synchronous lock', async t => {
  const clock = fakeClock(t), body = deferred();
  await withPicker(async runner => {
    const old = action(runner); observe(old()); await runner.flush(); await runner.update({ totalInvitations: draftCap('inicio') });
    assert.match(message(runner), /Creando…/); assert.equal(runner.calls[0].signal.aborted, false);
    await runner.update({ totalInvitations: 0 }); old(); action(runner)(); await runner.flush();
    body.resolve({ id: ID }); await runner.flush(); assert.equal(runner.calls.length, 1); assert.deepEqual(runner.pushes, ['/socios/constructor/' + ID]); assert.equal(clock.timers.size, 0);
  }, { reply: () => ({ ok: true, status: 201, json: () => body.promise }) });
});

test('selected-design ABA during a pending POST cannot replace its submitted template or create twice', async t => {
  const clock = fakeClock(t), pending = deferred();
  await withPicker(async runner => {
    const old = action(runner); observe(old()); await runner.flush(); await runner.update({ selectedDesign: catalog[1].key }); const intermediate = action(runner);
    await runner.update({ selectedDesign: catalog[0].key }); old(); intermediate(); await runner.flush(); assert.equal(runner.calls.length, 1);
    pending.resolve(ok()); await runner.flush(); assert.deepEqual(runner.calls.map(call => call.body), [{ template: catalog[0].key }]);
    assert.deepEqual(runner.pushes, ['/socios/constructor/' + ID]); assert.equal(clock.timers.size, 0);
  }, { props: { selectedDesign: catalog[0].key }, reply: () => pending.promise });
});

test('a retained idle handler cannot bypass newly reached capacity or a changed plan', async t => {
  fakeClock(t);
  await withPicker(async runner => {
    const old = action(runner); await runner.update({ plan: 'estudio', totalInvitations: draftCap('estudio') });
    old(); action(runner)(); await runner.flush(); assert.equal(runner.calls.length, 0); assert.match(message(runner), /Llegaste al límite/);
    await runner.update({ totalInvitations: 0 }); await runner.flush(); assert.equal(runner.calls.length, 0);
    observe(action(runner)()); await runner.flush(); assert.equal(runner.calls.length, 1);
  });
});

test('a canPublish change does not discard a verified creation or duplicate the submitted draft', async t => {
  const clock = fakeClock(t), pending = deferred();
  await withPicker(async runner => {
    observe(action(runner)()); await runner.flush(); await runner.update({ canPublish: true });
    assert.match(message(runner), /Creando…/); assert.equal(runner.calls[0].signal.aborted, false);
    action(runner, 1)(); pending.resolve(ok()); await runner.flush();
    assert.deepEqual(runner.pushes, ['/socios/constructor/' + ID]); assert.equal(runner.calls.length, 1); assert.equal(clock.timers.size, 0);
  }, { reply: () => pending.promise });
});

test('unmount during transport or JSON aborts the wait and never writes state or navigates late', async t => {
  const clock = fakeClock(t);
  for (const phase of ['fetch', 'json']) {
    const pending = deferred(); let reads = 0;
    await withPicker(async runner => {
      const old = action(runner), work = observe(old()); await runner.flush(); const snapshots = runner.snapshots.length;
      runner.unmount(); await runner.flush(); assert.equal(runner.calls[0].signal.aborted, true); assert.equal(work.done, true); assert.equal(clock.timers.size, 0);
      pending.resolve(phase === 'fetch' ? { ok: true, status: 201, json: async () => { reads++; return { id: ID }; } } : { id: ID });
      old(); await runner.flush(); assert.deepEqual(runner.pushes, []); assert.equal(runner.calls.length, 1); assert.equal(runner.snapshots.length, snapshots); assert.equal(runner.lateWrites(), 0);
      assert.equal(reads, phase === 'fetch' ? 0 : 1);
    }, { reply: () => phase === 'fetch' ? pending.promise : { ok: true, status: 201, json: () => { reads++; return pending.promise; } } });
  }
});

test('a fresh mounted instance can create while the old canceled instance cannot affect it', async t => {
  const clock = fakeClock(t), pending = deferred();
  await withPicker(async runner => {
    const old = action(runner); observe(old()); await runner.flush(); await runner.remount({ selectedDesign: catalog[1].key });
    assert.equal(runner.calls[0].signal.aborted, true); old(); observe(action(runner)()); await runner.flush();
    assert.equal(runner.calls.length, 2); assert.deepEqual(runner.calls[1].body, { template: catalog[1].key });
    assert.deepEqual(runner.pushes, ['/socios/constructor/' + NEXT_ID]); pending.resolve(ok()); await runner.flush();
    assert.equal(runner.pushes.length, 1); assert.equal(runner.lateWrites(), 0); assert.equal(clock.timers.size, 0);
  }, { reply: (_call, calls) => calls.length === 1 ? pending.promise : ok(NEXT_ID) });
});

test('React 18 effect cleanup and setup replay before interaction permits one fresh creation', async t => {
  const clock = fakeClock(t);
  await withPicker(async runner => {
    const original = samples(runner); await runner.replayEffects(); assert.deepEqual(runner.calls, []);
    observe(action(runner)()); await runner.flush(); assert.equal(runner.calls.length, 1); assert.deepEqual(runner.pushes, ['/socios/constructor/' + ID]);
    assert.deepEqual(samples(runner), original); assert.equal(clock.timers.size, 0); assert.equal(runner.lateWrites(), 0);
  });
});

test('effect replay during pending creation settles as uncertain and never leaves Creando or permits retry', async t => {
  const clock = fakeClock(t), pending = deferred();
  await withPicker(async runner => {
    const old = action(runner); observe(old()); await runner.flush(); await runner.replayEffects();
    assert.equal(runner.calls[0].signal.aborted, true); assertUncertain(runner); assert.equal(clock.timers.size, 0);
    old(); action(runner, 1)(); pending.resolve(ok()); await runner.flush(); assert.equal(runner.calls.length, 1); assertUncertain(runner); assert.equal(runner.lateWrites(), 0);
  }, { reply: () => pending.promise });
});

test('a late definitive 4xx body cannot alter the fallback and retry requires a new explicit action', async t => {
  const clock = fakeClock(t), transport = deferred(), body = deferred();
  await withPicker(async runner => {
    observe(action(runner)()); await runner.flush(); clock.tick(24_000);
    transport.resolve({ ok: false, status: 409, json: () => body.promise }); await runner.flush();
    clock.tick(1_000); await runner.flush(); assert.match(alerts(runner), /No se pudo crear el borrador/); const snapshots = runner.snapshots.length;
    body.resolve({ error: 'QA selección rechazada tardía' }); await runner.flush();
    assert.equal(runner.snapshots.length, snapshots); assert.equal(runner.calls.length, 1); assert.equal(clock.timers.size, 0);
    assert.ok(buttons(runner).every(node => !node.props.disabled)); assert.doesNotMatch(alerts(runner), /tardía/);
    observe(action(runner, 1)()); await runner.flush(); assert.equal(runner.calls.length, 2); assert.deepEqual(runner.pushes, ['/socios/constructor/' + NEXT_ID]);
  }, { reply: (_call, calls) => calls.length === 1 ? transport.promise : ok(NEXT_ID) });
});

test('a delayed browser timer cannot accept a successful ACK received after the elapsed budget', async t => {
  const clock = fakeClock(t), pending = deferred(); let reads = 0;
  await withPicker(async runner => {
    const work = observe(action(runner)()); await runner.flush(); clock.elapse(TIMEOUT);
    assert.equal(clock.timers.size, 1); assert.equal(work.done, false);
    pending.resolve({ ok: true, status: 201, json: async () => { reads++; return { id: ID }; } }); await runner.flush();
    assert.equal(work.done, true); assertUncertain(runner); assert.equal(reads, 0); assert.equal(clock.timers.size, 0);
    assert.equal(runner.calls[0].signal.aborted, true); assert.equal(runner.calls.length, 1);
  }, { reply: () => pending.promise });
});

test('4xx headers arriving after the budget cannot unlock a possible POST while its timer is delayed', async t => {
  const clock = fakeClock(t), pending = deferred(); let reads = 0;
  await withPicker(async runner => {
    observe(action(runner)()); await runner.flush(); clock.elapse(TIMEOUT + 1);
    pending.resolve({ ok: false, status: 422, json: async () => { reads++; return { error: 'QA rechazo fuera de plazo' }; } }); await runner.flush();
    assertUncertain(runner); assert.equal(reads, 0); assert.equal(clock.timers.size, 0);
    action(runner, 1)(); await runner.flush(); assert.equal(runner.calls.length, 1);
  }, { reply: () => pending.promise });
});

test('a 4xx body completed outside the elapsed budget cannot replace the known rejection fallback', async t => {
  const clock = fakeClock(t), body = deferred();
  await withPicker(async runner => {
    const work = observe(action(runner)()); await runner.flush(); clock.elapse(TIMEOUT);
    body.resolve({ error: 'QA rechazo fuera de plazo' }); await runner.flush();
    assert.equal(work.done, true); assert.match(alerts(runner), /No se pudo crear el borrador/);
    assert.doesNotMatch(alerts(runner), /QA rechazo fuera de plazo/); assert.doesNotMatch(message(runner), /Creando…|Borrador creado/);
    assert.ok(buttons(runner).every(node => !node.props.disabled)); assert.deepEqual(runner.pushes, []); assert.equal(runner.calls.length, 1); assert.equal(clock.timers.size, 0);
  }, { reply: () => ({ ok: false, status: 409, json: () => body.promise }) });
});

test('effect replay after known 4xx headers allows a fresh explicit POST and ignores the old body', async t => {
  const clock = fakeClock(t), body = deferred();
  await withPicker(async runner => {
    observe(action(runner)()); await runner.flush(); await runner.replayEffects();
    assert.equal(runner.calls[0].signal.aborted, true); assert.match(alerts(runner), /No se pudo crear el borrador/);
    assert.ok(buttons(runner).every(node => !node.props.disabled)); assert.equal(runner.calls.length, 1); assert.equal(clock.timers.size, 0);
    observe(action(runner, 1)()); await runner.flush(); assert.equal(runner.calls.length, 2); assert.deepEqual(runner.pushes, ['/socios/constructor/' + NEXT_ID]);
    const snapshots = runner.snapshots.length; body.resolve({ error: 'QA rechazo antiguo' }); await runner.flush();
    assert.equal(alerts(runner), ''); assert.equal(runner.snapshots.length, snapshots); assert.equal(runner.pushes.length, 1); assert.equal(runner.lateWrites(), 0); assert.equal(clock.timers.size, 0);
  }, { reply: (_call, calls) => calls.length === 1 ? { ok: false, status: 422, json: () => body.promise } : ok(NEXT_ID) });
});
