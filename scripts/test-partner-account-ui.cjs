// Real AccountTab / Dashboard and request helpers. Fictional profiles, fake clock,
// controlled transport in RAM. No DOM, authentication, storage, network or banking.
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
require.cache[require.resolve('next/navigation')] = { exports: { useRouter: () => ({ push() {}, replace() {}, refresh() {} }) } };
const filename = path.join(root, 'src/components/partners/PartnerDashboard.tsx');
let source = fs.readFileSync(filename, 'utf8');
if (process.argv.includes('--baseline')) {
  // Optional reproduction only. Normal shallow-checkout CI never invokes Git.
  const { execFileSync } = require('node:child_process');
  const before = execFileSync('git', ['-c', 'core.fsmonitor=false', 'show', 'c634a6f1776f457ead2f266be1c6e702cc9dbab2:src/components/partners/PartnerDashboard.tsx'], { cwd: root, encoding: 'utf8' });
  const declaration = value => ts.createSourceFile(filename, value, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX).statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'AccountTab');
  const current = declaration(source), previous = declaration(before);
  assert.ok(current && previous, 'The reproduction replaces only the real AccountTab declaration');
  source = source.slice(0, current.getStart()) + before.slice(previous.getStart(), previous.end) + source.slice(current.end);
}
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(transpile(source + '\nexport { AccountTab };\n', filename), filename);
const { default: Dashboard, AccountTab } = compiled.exports;
const { subscriptionState, planQuota } = require('../src/lib/partner-plans.ts');
const { PARTNER_REQUEST_TIMEOUT_MS: TIMEOUT } = require('../src/lib/partner-checkout.ts');
const stamp = '2026-10-20T12:00:00.000Z';
const account = (patch = {}) => ({
  profile: { email: 'qa-profile@example.invalid', name: 'QA Socio', avatar: '', brand: 'QA marca', phone: '59170000000', city: 'La Paz', status: 'active', memberSince: stamp },
  subscription: subscriptionState({ plan_key: 'inicio', status: 'none', period_end: null }), quota: planQuota('inicio', 0), totalInvitations: 0, payments: [],
  billing: { instructions: 'QA sin pagos reales', qrUrl: '', whatsapp: '', configured: false, provider: 'manual', ready: true }, ...patch,
});
const withProfile = (profile, base = account()) => ({ ...base, profile: { ...base.profile, ...profile } });
const ack = profile => ({ profile: withProfile(profile).profile, subscription: account().subscription, quota: account().quota, totalInvitations: 0 });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const observe = promise => { const state = { done: false }; Promise.resolve(promise).then(value => { state.done = true; state.value = value; }, error => { state.done = true; state.error = error; }); return state; };
const nodes = (element, predicate) => !React.isValidElement(element) ? [] : [
  ...(predicate(element) ? [element] : []), ...React.Children.toArray(element.props.children).flatMap(child => nodes(child, predicate)),
];
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(text).join(' ') : React.isValidElement(value) ? text(value.props.children) : '';
const button = (runner, label) => nodes(runner.current(), node => node.type === 'button' && text(node).trim() === label)[0];
const brandInput = runner => nodes(runner.current(), node => node.type === 'input' && node.props.placeholder === 'Ej. Estudio Aurora')[0];
const phoneInput = runner => nodes(runner.current(), node => node.type === 'input' && node.props.placeholder === '591 7XXXXXXX')[0];
const cityInput = runner => nodes(runner.current(), node => node.type === 'input' && node.props.placeholder === 'La Paz')[0];
const change = (runner, key, value) => ({ brand: brandInput, phone: phoneInput, city: cityInput })[key](runner).props.onChange({ target: { value } });
const puts = runner => runner.calls.filter(call => call.method === 'PUT');
const gets = runner => runner.calls.filter(call => call.url === '/api/partner/account' && call.method === 'GET');
const message = runner => text(runner.current()) + ' ' + text(runner.parent()) + ' ' + runner.notices.map(notice => notice.text).join(' ');
function fakeClock(t) {
  let now = 1_800_000_000_000, serial = 0;
  const timers = new Map();
  t.mock.method(Date, 'now', () => now);
  t.mock.method(global, 'setTimeout', (callback, delay) => { const id = ++serial; timers.set(id, { callback, at: now + delay }); return id; });
  t.mock.method(global, 'clearTimeout', id => timers.delete(id));
  t.mock.method(global, 'setInterval', (callback, delay) => { const id = ++serial; timers.set(id, { callback, at: now + delay, interval: delay }); return id; });
  t.mock.method(global, 'clearInterval', id => timers.delete(id));
  return { timers, tick(ms) {
    now += ms;
    for (let round = 0; round < 500; round++) {
      const pending = [...timers].filter(([, timer]) => timer.at <= now).sort((left, right) => left[1].at - right[1].at)[0];
      if (!pending) return;
      timers.delete(pending[0]);
      if (pending[1].interval) timers.set(pending[0], { ...pending[1], at: now + pending[1].interval });
      pending[1].callback();
    }
    assert.fail('Unexpected account timer loop');
  } };
}
async function withAccount(scenario, { full = true, initial = account(), reply, onSaved } = {}) {
  const names = ['useState', 'useRef', 'useEffect', 'useMemo', 'useCallback'];
  const original = Object.fromEntries(names.map(name => [name, React[name]]));
  const old = { fetch: global.fetch, window: global.window, document: global.document };
  const fibers = new Map(), calls = [], notices = [], saved = [], snapshots = [];
  let fiber, cursor = 0, dirty = true, tree, parentTree, effects = [], unmounted = false, lateWrites = 0, childType;
  let props = full ? { initialAccount: initial, initialTab: 'cuenta' } : {
    account: initial, onSaved: value => { saved.push(value); return onSaved ? onSaved(value) : true; },
    onNotice: (tone, value) => notices.push({ tone, text: value }),
  };
  const same = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  React.useState = initialValue => {
    const owner = fiber, index = cursor++;
    if (!(index in owner.slots)) {
      const slot = owner.slots[index] = { value: typeof initialValue === 'function' ? initialValue() : initialValue };
      slot.set = next => { if (!owner.active) { lateWrites++; return; } next = typeof next === 'function' ? next(slot.value) : next; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } };
    }
    return [owner.slots[index].value, owner.slots[index].set];
  };
  React.useRef = initialValue => { const index = cursor++; return fiber.slots[index] ?? (fiber.slots[index] = { current: initialValue }); };
  React.useMemo = (compute, deps) => { const index = cursor++; if (!fiber.slots[index] || !same(fiber.slots[index].deps, deps)) fiber.slots[index] = { value: compute(), deps }; return fiber.slots[index].value; };
  React.useCallback = (callback, deps) => React.useMemo(() => callback, deps);
  React.useEffect = (effect, deps) => {
    const owner = fiber, index = cursor++, previous = owner.slots[index];
    if (!previous || !same(previous.deps, deps)) {
      const slot = { deps, effect, cleanup: previous?.cleanup }; owner.slots[index] = slot;
      effects.push(() => { if (owner.active) { slot.cleanup?.(); slot.cleanup = effect(); } });
    }
  };
  global.window = { setTimeout, clearTimeout, setInterval, clearInterval, confirm: () => { throw Error('Account must never require a bank/payment confirmation'); }, location: { href: 'https://qa.invalid/socios/panel', origin: 'https://qa.invalid' }, history: { replaceState() {} } };
  global.document = { visibilityState: 'visible' };
  global.fetch = async (url, options = {}) => {
    assert.ok(['/api/partner/account', '/api/partner/invitations'].includes(url), 'Only fictitious account/list transport is allowed');
    const call = { url, method: options.method ?? 'GET', body: options.body, signal: options.signal, cache: options.cache, headers: options.headers }; calls.push(call);
    if (url === '/api/partner/invitations') { assert.equal(call.method, 'GET'); return Response.json({ invitations: [] }); }
    return reply ? reply(call, calls) : Response.json(call.method === 'PUT' ? ack(JSON.parse(call.body)) : initial);
  };
  const cleanup = owner => { if (!owner) return; for (const slot of owner.slots) slot?.cleanup?.(); owner.active = false; };
  const render = (key, Component, input) => {
    fiber = fibers.get(key); if (!fiber) { fiber = { slots: [], active: true }; fibers.set(key, fiber); } cursor = 0; return Component(input);
  };
  const flush = async () => {
    for (let round = 0; round < 60; round++) {
      if (dirty && !unmounted) {
        dirty = false; effects = []; parentTree = render('root', full ? Dashboard : AccountTab, props);
        const child = full ? nodes(parentTree, node => ['AccountTab', 'SubscriptionTab', 'InvitationsTab'].includes(node.type?.name))[0] : null;
        if (childType !== child?.type) { cleanup(fibers.get('child')); fibers.delete('child'); childType = child?.type; }
        tree = child ? render('child', child.type, child.props) : parentTree; snapshots.push(tree); for (const effect of effects) effect();
      }
      await new Promise(done => setImmediate(done));
      if (!dirty || unmounted) return tree;
    }
    throw Error('Account hooks did not settle');
  };
  const unmount = () => { if (unmounted) return; unmounted = true; for (const owner of fibers.values()) cleanup(owner); };
  const runner = {
    calls, notices, saved, snapshots, flush, unmount, current: () => tree, parent: () => parentTree, lateWrites: () => lateWrites,
    child: () => full ? nodes(parentTree, node => ['AccountTab', 'SubscriptionTab', 'InvitationsTab'].includes(node.type?.name))[0] : { props },
    update: async value => { props = { ...props, ...value }; dirty = true; return flush(); },
    tab: async label => { const control = nodes(parentTree, node => node.type === 'button' && text(node).trim() === label)[0]; assert.ok(control, 'Tab exists: ' + label); control.props.onClick(); await flush(); },
    replayEffects: async () => { const owners = [...fibers.values()]; for (const owner of owners) for (const slot of owner.slots) if (slot?.effect) slot.cleanup?.(); for (const owner of owners) for (const slot of owner.slots) if (slot?.effect) slot.cleanup = slot.effect(); await flush(); },
  };
  try { await flush(); return await scenario(runner); }
  finally {
    unmount(); for (const name of names) React[name] = original[name];
    for (const [key, value] of Object.entries(old)) { if (value === undefined) delete global[key]; else global[key] = value; }
    assert.ok(calls.every(call => call.url === '/api/partner/account' || (call.url === '/api/partner/invitations' && call.method === 'GET')));
  }
}

test('same-turn duplicate save handlers dispatch exactly one PUT with the edited profile', async t => {
  fakeClock(t); const pending = deferred();
  await withAccount(async runner => {
    change(runner, 'brand', 'QA enviada'); await runner.flush();
    const save = button(runner, 'Guardar cambios').props.onClick, work = observe(save()); save(); save(); await runner.flush();
    assert.equal(puts(runner).length, 1);
    assert.deepEqual(JSON.parse(puts(runner)[0].body), { brand: 'QA enviada', phone: '59170000000', city: 'La Paz' });
    assert.ok(puts(runner)[0].signal instanceof AbortSignal); assert.equal(puts(runner)[0].cache, 'no-store');
    assert.ok(button(runner, 'Guardando…')?.props.disabled);
    pending.resolve(Response.json(ack({ brand: 'QA enviada' }))); await runner.flush(); assert.equal(work.done, true); assert.equal(work.error, undefined);
    assert.match(message(runner), /Datos guardados/);
  }, { reply: () => pending.promise });
});

test('the current input values win even when save is invoked before the next React render', async t => {
  fakeClock(t);
  await withAccount(async runner => {
    const save = button(runner, 'Guardar cambios').props.onClick;
    change(runner, 'brand', 'QA antes del render'); change(runner, 'phone', '59171112222'); change(runner, 'city', 'Cochabamba');
    await save(); await runner.flush();
    assert.deepEqual(JSON.parse(puts(runner)[0].body), { brand: 'QA antes del render', phone: '59171112222', city: 'Cochabamba' });
    assert.equal(runner.child().props.account.profile.brand, 'QA antes del render');
  });
});

test('a verified PUT cannot erase newer edits typed while its response was pending', async t => {
  fakeClock(t); const pending = deferred();
  await withAccount(async runner => {
    change(runner, 'brand', 'QA enviada'); await runner.flush(); observe(button(runner, 'Guardar cambios').props.onClick()); await runner.flush();
    change(runner, 'brand', 'QA siguiente'); change(runner, 'phone', '59173334444'); change(runner, 'city', 'Sucre'); await runner.flush();
    pending.resolve(Response.json(ack({ brand: 'QA enviada' }))); await runner.flush();
    assert.equal(brandInput(runner).props.value, 'QA siguiente'); assert.equal(phoneInput(runner).props.value, '59173334444'); assert.equal(cityInput(runner).props.value, 'Sucre');
    assert.equal(runner.child().props.account.profile.brand, 'QA enviada'); assert.equal(button(runner, 'Guardar cambios').props.disabled, false); assert.equal(puts(runner).length, 1);
  }, { reply: () => pending.promise });
});

test('a retained pre-save handler cannot repeat the already acknowledged revision', async t => {
  fakeClock(t);
  await withAccount(async runner => {
    change(runner, 'brand', 'QA una vez'); await runner.flush(); const old = button(runner, 'Guardar cambios').props.onClick;
    await old(); await runner.flush(); old(); await runner.flush();
    assert.equal(puts(runner).length, 1); assert.equal(runner.child().props.account.profile.brand, 'QA una vez');
  });
});

test('transport deadline releases its spinner, blocks all retained PUT handlers and never reads a late body', async t => {
  const clock = fakeClock(t), pending = deferred(); let bodies = 0;
  await withAccount(async runner => {
    change(runner, 'brand', 'QA incierta'); await runner.flush(); const old = button(runner, 'Guardar cambios').props.onClick, work = observe(old()); await runner.flush();
    clock.tick(TIMEOUT); await runner.flush(); assert.equal(work.done, true); assert.equal(work.error, undefined);
    assert.equal(button(runner, 'Guardar cambios').props.disabled, true); assert.equal(button(runner, 'Comprobar guardado').props.disabled, false); assert.match(message(runner), /25 segundos/);
    old(); await runner.flush(); assert.equal(puts(runner).length, 1); assert.equal(gets(runner).length, 0);
    pending.resolve({ ok: true, status: 200, json: async () => { bodies++; return ack({ brand: 'QA incierta' }); } }); await runner.flush();
    assert.equal(bodies, 0); assert.equal(runner.child().props.account.profile.brand, 'QA marca'); assert.equal(button(runner, 'Guardar cambios').props.disabled, true);
  }, { reply: () => pending.promise });
});

test('transport and JSON share one 25-second budget and a late JSON cannot acknowledge the profile', async t => {
  const clock = fakeClock(t), transport = deferred(), body = deferred(); let bodyReads = 0;
  await withAccount(async runner => {
    change(runner, 'brand', 'QA cuerpo pendiente'); await runner.flush(); const work = observe(button(runner, 'Guardar cambios').props.onClick()); await runner.flush();
    clock.tick(15_000); transport.resolve({ ok: true, status: 200, json: () => { bodyReads++; return body.promise; } }); await runner.flush(); assert.equal(bodyReads, 1);
    clock.tick(9_999); await runner.flush(); assert.equal(work.done, false); clock.tick(1); await runner.flush(); assert.equal(work.done, true);
    assert.equal(button(runner, 'Guardar cambios').props.disabled, true); body.resolve(ack({ brand: 'QA cuerpo pendiente' })); await runner.flush();
    assert.equal(runner.child().props.account.profile.brand, 'QA marca'); assert.equal(puts(runner).length, 1);
  }, { reply: () => transport.promise });
});

test('connection rejection is handled and a matching explicit GET is required before saving a newer draft', async t => {
  fakeClock(t); let attempts = 0;
  await withAccount(async runner => {
    change(runner, 'brand', 'QA conexión'); await runner.flush(); const old = button(runner, 'Guardar cambios').props.onClick, work = observe(old()); await runner.flush();
    assert.equal(work.done, true); assert.equal(work.error, undefined); assert.equal(button(runner, 'Guardar cambios').props.disabled, true);
    old(); await runner.flush(); assert.equal(puts(runner).length, 1); assert.equal(gets(runner).length, 0);
    await button(runner, 'Comprobar guardado').props.onClick(); await runner.flush(); assert.equal(gets(runner).length, 1); assert.equal(puts(runner).length, 1);
    assert.equal(brandInput(runner).props.value, 'QA conexión'); assert.equal(button(runner, 'Guardar cambios').props.disabled, true);
    change(runner, 'brand', 'QA conexión nueva'); await runner.flush(); assert.equal(button(runner, 'Guardar cambios').props.disabled, false);
    await button(runner, 'Guardar cambios').props.onClick(); await runner.flush(); assert.equal(puts(runner).length, 2); assert.equal(runner.child().props.account.profile.brand, 'QA conexión nueva');
  }, { reply: call => { if (call.method === 'GET') return Response.json(withProfile({ brand: 'QA conexión' })); if (++attempts === 1) throw Error('QA transport only'); return Response.json(ack(JSON.parse(call.body))); } });
});

test('malformed JSON after HTTP 200 is uncertain and cannot show a false saved notice', async t => {
  fakeClock(t);
  await withAccount(async runner => {
    change(runner, 'brand', 'QA JSON'); await runner.flush(); const work = observe(button(runner, 'Guardar cambios').props.onClick()); await runner.flush();
    assert.equal(work.done, true); assert.equal(work.error, undefined); assert.equal(button(runner, 'Guardar cambios').props.disabled, true); assert.ok(button(runner, 'Comprobar guardado'));
    assert.equal(runner.child().props.account.profile.brand, 'QA marca'); assert.doesNotMatch(message(runner), /Datos guardados/);
  }, { reply: () => ({ ok: true, status: 200, json: async () => { throw Error('QA bad JSON'); } }) });
});

test('incomplete and mismatching profile acknowledgements never alter the verified profile', async t => {
  fakeClock(t);
  const invalid = [
    { profile: null }, ack({ email: 'otra-persona@example.invalid', brand: 'QA cambio' }),
    ack({ memberSince: '2026-10-21T12:00:00.000Z', brand: 'QA cambio' }), ack({ brand: 'QA equivocada' }),
    ack({ brand: 'QA cambio', phone: '59179999999' }), ack({ brand: 'QA cambio', city: 'Oruro' }),
    ack({ brand: 'QA cambio', status: 'unknown' }), ack({ brand: 'QA cambio', status: ['active'] }),
    ack({ brand: 'QA cambio', memberSince: 'invalid-date' }),
  ];
  for (const response of invalid) await withAccount(async runner => {
    change(runner, 'brand', 'QA cambio'); await runner.flush(); await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
    assert.equal(runner.child().props.account.profile.brand, 'QA marca'); assert.equal(button(runner, 'Guardar cambios').props.disabled, true);
    assert.ok(button(runner, 'Comprobar guardado')); assert.doesNotMatch(message(runner), /Datos guardados/);
  }, { reply: () => Response.json(response) });
});

test('an explicit verification GET has its own synchronous lock and does not resend the uncertain PUT', async t => {
  fakeClock(t); const pending = deferred();
  await withAccount(async runner => {
    change(runner, 'brand', 'QA verificar'); await runner.flush(); await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
    const check = button(runner, 'Comprobar guardado').props.onClick, work = observe(check()); check(); check(); await runner.flush();
    assert.equal(gets(runner).length, 1); assert.equal(puts(runner).length, 1); assert.ok(button(runner, 'Comprobando…')?.props.disabled);
    pending.resolve(Response.json(withProfile({ brand: 'QA verificar' }))); await runner.flush(); assert.equal(work.done, true);
    assert.equal(brandInput(runner).props.value, 'QA verificar'); assert.equal(runner.child().props.account.profile.brand, 'QA verificar');
  }, { reply: call => { if (call.method === 'PUT') throw Error('QA unknown'); return pending.promise; } });
});

test('a verification GET never replaces newer unsent fields with the consulted profile', async t => {
  fakeClock(t); const pending = deferred();
  await withAccount(async runner => {
    change(runner, 'brand', 'QA enviada'); await runner.flush(); await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
    observe(button(runner, 'Comprobar guardado').props.onClick()); await runner.flush();
    change(runner, 'brand', 'QA siguiente'); change(runner, 'city', 'Tarija'); await runner.flush();
    pending.resolve(Response.json(withProfile({ brand: 'QA enviada' }))); await runner.flush();
    assert.equal(runner.child().props.account.profile.brand, 'QA enviada'); assert.equal(brandInput(runner).props.value, 'QA siguiente'); assert.equal(cityInput(runner).props.value, 'Tarija');
    assert.equal(button(runner, 'Guardar cambios').props.disabled, false); assert.equal(puts(runner).length, 1);
  }, { reply: call => { if (call.method === 'PUT') throw Error('QA unknown'); return pending.promise; } });
});

test('rejected and incomplete verification GETs leave uncertainty and the exact draft intact', async t => {
  fakeClock(t); const initial = account(); let reads = 0;
  const invalid = [Response.json({ error: 'QA sin sesión' }, { status: 401 }), Response.json({ profile: initial.profile }), Response.json({ ...initial, billing: null }), Response.json(withProfile({ email: 'otro@example.invalid' })), Response.json(withProfile({ memberSince: '2026-10-22T12:00:00.000Z' }))];
  await withAccount(async runner => {
    change(runner, 'brand', 'QA conservar'); change(runner, 'phone', '59172223333'); await runner.flush(); await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
    for (const ignored of invalid) {
      void ignored; await button(runner, 'Comprobar guardado').props.onClick(); await runner.flush();
      assert.equal(button(runner, 'Guardar cambios').props.disabled, true); assert.equal(button(runner, 'Comprobar guardado').props.disabled, false);
      assert.equal(brandInput(runner).props.value, 'QA conservar'); assert.equal(phoneInput(runner).props.value, '59172223333'); assert.equal(runner.child().props.account.profile.brand, 'QA marca');
    }
    assert.equal(reads, invalid.length); assert.equal(puts(runner).length, 1);
  }, { initial, reply: call => { if (call.method === 'PUT') throw Error('QA unknown'); return invalid[reads++]; } });
});

test('verification timeout covers stalled transport and JSON and late reads never clear uncertainty', async t => {
  const clock = fakeClock(t);
  for (const phase of ['fetch', 'json']) {
    const pending = deferred(); let bodyReads = 0;
    await withAccount(async runner => {
      change(runner, 'brand', 'QA consulta suspendida'); await runner.flush(); await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
      const work = observe(button(runner, 'Comprobar guardado').props.onClick()); await runner.flush(); clock.tick(TIMEOUT); await runner.flush();
      assert.equal(work.done, true); assert.equal(work.error, undefined); assert.equal(button(runner, 'Comprobar guardado').props.disabled, false); assert.equal(button(runner, 'Guardar cambios').props.disabled, true);
      pending.resolve(phase === 'fetch' ? { ok: true, status: 200, json: async () => { bodyReads++; return withProfile({ brand: 'QA consulta suspendida' }); } } : withProfile({ brand: 'QA consulta suspendida' })); await runner.flush();
      assert.equal(bodyReads, phase === 'fetch' ? 0 : 1); assert.equal(runner.child().props.account.profile.brand, 'QA marca'); assert.equal(button(runner, 'Guardar cambios').props.disabled, true);
    }, { reply: call => { if (call.method === 'PUT') throw Error('QA unknown'); return phase === 'fetch' ? pending.promise : { ok: true, status: 200, json: () => { bodyReads++; return pending.promise; } }; } });
  }
});

test('leaving and reopening Mi cuenta cannot bypass the pending profile verification barrier', async t => {
  const clock = fakeClock(t);
  for (const afterTimeout of [false, true]) {
    const pending = deferred(); let bodyReads = 0;
    await withAccount(async runner => {
      change(runner, 'brand', 'QA fuera de pestaña'); await runner.flush(); const old = button(runner, 'Guardar cambios').props.onClick; observe(old()); await runner.flush();
      if (afterTimeout) { clock.tick(TIMEOUT); await runner.flush(); }
      await runner.tab('Mis invitaciones'); await runner.tab('Mi cuenta');
      assert.equal(button(runner, 'Guardar cambios').props.disabled, true); assert.ok(button(runner, 'Comprobar guardado'));
      old(); await runner.flush(); assert.equal(puts(runner).length, 1);
      pending.resolve({ ok: true, status: 200, json: async () => { bodyReads++; return ack({ brand: 'QA fuera de pestaña' }); } }); await runner.flush();
      assert.equal(bodyReads, 0); assert.equal(runner.child().props.account.profile.brand, 'QA marca'); assert.equal(button(runner, 'Guardar cambios').props.disabled, true); assert.equal(runner.lateWrites(), 0);
    }, { reply: () => pending.promise });
  }
});

test('a late PUT after unmount cannot write state, notify success, or read its body', async t => {
  fakeClock(t); const pending = deferred(); let bodyReads = 0;
  await withAccount(async runner => {
    change(runner, 'brand', 'QA desmontada'); await runner.flush(); const old = button(runner, 'Guardar cambios').props.onClick, work = observe(old()); await runner.flush();
    const snapshots = runner.snapshots.length; runner.unmount(); old();
    pending.resolve({ ok: true, status: 200, json: async () => { bodyReads++; return ack({ brand: 'QA desmontada' }); } }); await runner.flush();
    assert.equal(work.done, true); assert.equal(work.error, undefined); assert.equal(bodyReads, 0); assert.equal(runner.snapshots.length, snapshots); assert.equal(runner.lateWrites(), 0); assert.equal(puts(runner).length, 1);
    assert.doesNotMatch(message(runner), /Datos guardados/);
  }, { reply: () => pending.promise });
});

test('React 18 cleanup/setup replay still permits a fresh profile save exactly once', async t => {
  fakeClock(t);
  await withAccount(async runner => {
    await runner.replayEffects(); change(runner, 'brand', 'QA StrictMode'); await runner.flush();
    const save = button(runner, 'Guardar cambios').props.onClick; await save(); await runner.flush();
    assert.equal(puts(runner).length, 1); assert.equal(runner.child().props.account.profile.brand, 'QA StrictMode'); assert.match(message(runner), /Datos guardados/); assert.equal(runner.lateWrites(), 0);
  });
});

test('the accepted profile must match the server’s precise trimming, control replacement and length limits', async t => {
  fakeClock(t);
  const typed = { brand: '  QA\u0001marca  ', phone: ' 5917000\u007f1234 ', city: '  ' + 'X'.repeat(70) + '  ' };
  const clean = (value, max) => String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
  const expected = { brand: clean(typed.brand, 80), phone: clean(typed.phone, 30), city: clean(typed.city, 60) };
  await withAccount(async runner => {
    for (const [key, value] of Object.entries(typed)) change(runner, key, value); await runner.flush();
    await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
    assert.deepEqual(JSON.parse(puts(runner)[0].body), expected); assert.equal(runner.child().props.account.profile.brand, expected.brand);
    assert.equal(runner.child().props.account.profile.phone, expected.phone); assert.equal(runner.child().props.account.profile.city, expected.city); assert.match(message(runner), /Datos guardados/);
  }, { reply: call => Response.json(ack(JSON.parse(call.body))) });
});

test('a complete but nonmatching verification cannot prove an uncertain PUT has finished', async t => {
  fakeClock(t);
  await withAccount(async runner => {
    change(runner, 'brand', 'QA enviada incierta'); await runner.flush(); const old = button(runner, 'Guardar cambios').props.onClick; await old(); await runner.flush();
    await button(runner, 'Comprobar guardado').props.onClick(); await runner.flush();
    assert.equal(button(runner, 'Guardar cambios').props.disabled, true); assert.ok(button(runner, 'Comprobar guardado')); assert.equal(brandInput(runner).props.value, 'QA enviada incierta');
    old(); await runner.flush(); assert.equal(puts(runner).length, 1); assert.equal(gets(runner).length, 1); assert.doesNotMatch(message(runner), /Datos guardados/);
  }, { reply: call => { if (call.method === 'PUT') throw Error('QA unknown'); return Response.json(account()); } });
});

test('a newer canonical profile from payment polling invalidates the pending profile acknowledgement', async t => {
  const clock = fakeClock(t), pending = deferred();
  const payment = { id: '30000000-0000-4000-8000-000000000001', reference: 'ENK-QAONLY', plan_key: 'inicio', months: 1, amount_bs: 249, method: 'qr', receipt_url: '', quote_locked_at: null, status: 'pending', review_note: '', created_at: stamp, period_end: null };
  const initial = account({ payments: [payment] }), updated = withProfile({ brand: 'QA perfil externo' }, initial);
  await withAccount(async runner => {
    change(runner, 'brand', 'QA intento anterior'); await runner.flush(); observe(button(runner, 'Guardar cambios').props.onClick()); await runner.flush();
    clock.tick(15_000); await runner.flush(); assert.equal(gets(runner).length, 1); assert.equal(runner.child().props.account.profile.brand, 'QA perfil externo');
    pending.resolve({ ok: true, status: 200, json: async () => ack({ brand: 'QA intento anterior' }) }); await runner.flush();
    assert.equal(runner.child().props.account.profile.brand, 'QA perfil externo'); assert.equal(brandInput(runner).props.value, 'QA intento anterior'); assert.doesNotMatch(message(runner), /Datos guardados/); assert.equal(puts(runner).length, 1);
  }, { initial, reply: call => call.method === 'PUT' ? pending.promise : Response.json(updated) });
});

test('an explicit check result is ignored after leaving Mi cuenta and the reopened view remains guarded', async t => {
  fakeClock(t); const pending = deferred(); let bodies = 0;
  await withAccount(async runner => {
    change(runner, 'brand', 'QA chequeo fuera'); await runner.flush(); await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
    const check = button(runner, 'Comprobar guardado').props.onClick; observe(check()); await runner.flush(); await runner.tab('Mis invitaciones'); await runner.tab('Mi cuenta');
    pending.resolve({ ok: true, status: 200, json: async () => { bodies++; return withProfile({ brand: 'QA chequeo fuera' }); } }); await runner.flush();
    assert.equal(bodies, 0); assert.equal(runner.child().props.account.profile.brand, 'QA marca'); assert.equal(button(runner, 'Guardar cambios').props.disabled, true); assert.equal(runner.lateWrites(), 0);
    check(); await runner.flush(); assert.equal(gets(runner).length, 1); assert.equal(puts(runner).length, 1);
  }, { reply: call => { if (call.method === 'PUT') throw Error('QA unknown'); return pending.promise; } });
});

test('React 18 effect replay during a write cancels that attempt without releasing uncertainty or accepting a late ACK', async t => {
  fakeClock(t); const pending = deferred(); let bodyReads = 0;
  await withAccount(async runner => {
    change(runner, 'brand', 'QA replay pendiente'); await runner.flush(); const old = button(runner, 'Guardar cambios').props.onClick; observe(old()); await runner.flush(); await runner.replayEffects();
    old(); await runner.flush(); assert.equal(puts(runner).length, 1); assert.equal(button(runner, 'Guardar cambios').props.disabled, true);
    pending.resolve({ ok: true, status: 200, json: async () => { bodyReads++; return ack({ brand: 'QA replay pendiente' }); } }); await runner.flush();
    assert.equal(bodyReads, 0); assert.equal(runner.child().props.account.profile.brand, 'QA marca'); assert.doesNotMatch(message(runner), /Datos guardados/); assert.equal(runner.lateWrites(), 0);
  }, { reply: () => pending.promise });
});

test('HTTP rejection is handled without changing the verified profile or reporting a false success', async t => {
  fakeClock(t);
  for (const status of [400, 401, 403, 409, 500, 503]) await withAccount(async runner => {
    change(runner, 'brand', 'QA rechazada'); await runner.flush(); const work = observe(button(runner, 'Guardar cambios').props.onClick()); await runner.flush();
    assert.equal(work.done, true); assert.equal(work.error, undefined); assert.equal(runner.child().props.account.profile.brand, 'QA marca'); assert.equal(brandInput(runner).props.value, 'QA rechazada');
    assert.doesNotMatch(message(runner), /Datos guardados/); assert.equal(puts(runner).length, 1); assert.equal(gets(runner).length, 0);
  }, { reply: () => Response.json({ error: 'QA solicitud rechazada' }, { status }) });
});

test('a timed-out old verification cannot clear the barrier during a newer verification', async t => {
  const clock = fakeClock(t), first = deferred(), second = deferred(); let reads = 0, bodies = 0;
  await withAccount(async runner => {
    change(runner, 'brand', 'QA verificar nuevo'); await runner.flush(); await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
    observe(button(runner, 'Comprobar guardado').props.onClick()); await runner.flush(); clock.tick(TIMEOUT); await runner.flush();
    observe(button(runner, 'Comprobar guardado').props.onClick()); await runner.flush(); assert.equal(gets(runner).length, 2);
    first.resolve({ ok: true, status: 200, json: async () => { bodies++; return withProfile({ brand: 'QA verificar nuevo' }); } }); await runner.flush();
    assert.equal(bodies, 0); assert.ok(button(runner, 'Comprobando…')?.props.disabled); assert.equal(button(runner, 'Guardar cambios').props.disabled, true);
    second.resolve(Response.json(withProfile({ brand: 'QA verificar nuevo' }))); await runner.flush(); assert.equal(runner.child().props.account.profile.brand, 'QA verificar nuevo'); assert.equal(puts(runner).length, 1);
  }, { reply: call => { if (call.method === 'PUT') throw Error('QA unknown'); return ++reads === 1 ? first.promise : second.promise; } });
});

test('a refused parent profile commit cannot report success even when the HTTP profile is well formed', async t => {
  fakeClock(t);
  await withAccount(async runner => {
    change(runner, 'brand', 'QA rechazada local'); await runner.flush(); await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
    assert.doesNotMatch(message(runner), /Datos guardados/); assert.ok(button(runner, 'Comprobar guardado')); assert.equal(button(runner, 'Guardar cambios').props.disabled, true); assert.equal(runner.saved.length, 1);
  }, { full: false, onSaved: () => false });
});

test('a polling read started before a profile save cannot restore the old profile after its confirmed ACK', async t => {
  const clock = fakeClock(t), pending = deferred(); let bodies = 0;
  const payment = { id: '30000000-0000-4000-8000-000000000001', reference: 'ENK-QAONLY', plan_key: 'inicio', months: 1, amount_bs: 249, method: 'qr', receipt_url: '', quote_locked_at: null, status: 'pending', review_note: '', created_at: stamp, period_end: null };
  const initial = account({ payments: [payment] });
  await withAccount(async runner => {
    clock.tick(15_000); await runner.flush(); assert.equal(gets(runner).length, 1);
    change(runner, 'brand', 'QA guardada actual'); await runner.flush(); await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
    assert.equal(runner.child().props.account.profile.brand, 'QA guardada actual');
    pending.resolve({ ok: true, status: 200, json: async () => { bodies++; return initial; } }); await runner.flush();
    assert.equal(bodies, 0); assert.equal(runner.child().props.account.profile.brand, 'QA guardada actual'); assert.equal(brandInput(runner).props.value, 'QA guardada actual'); assert.equal(puts(runner).length, 1);
  }, { initial, reply: call => call.method === 'GET' ? pending.promise : Response.json(ack(JSON.parse(call.body))) });
});

test('definitive HTTP validation and permission refusals permit a reviewed new attempt without pretending the first succeeded', async t => {
  fakeClock(t);
  for (const status of [400, 401, 403]) {
    let attempts = 0;
    await withAccount(async runner => {
      change(runner, 'brand', 'QA rechazada primero'); await runner.flush(); await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
      assert.equal(button(runner, 'Guardar cambios').props.disabled, false); assert.equal(gets(runner).length, 0); assert.doesNotMatch(message(runner), /Datos guardados/);
      change(runner, 'brand', 'QA intento revisado'); await runner.flush(); await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
      assert.equal(puts(runner).length, 2); assert.equal(gets(runner).length, 0); assert.equal(runner.child().props.account.profile.brand, 'QA intento revisado');
    }, { reply: call => ++attempts === 1 ? Response.json({ error: 'QA rechazo definitivo' }, { status }) : Response.json(ack(JSON.parse(call.body))) });
  }
});

test('canonical profile A to B to A during one PUT cannot revalidate the original stale acknowledgement', async t => {
  const clock = fakeClock(t), pending = deferred(); let reads = 0;
  const payment = { id: '30000000-0000-4000-8000-000000000001', reference: 'ENK-QAONLY', plan_key: 'inicio', months: 1, amount_bs: 249, method: 'qr', receipt_url: '', quote_locked_at: null, status: 'pending', review_note: '', created_at: stamp, period_end: null };
  const initial = account({ payments: [payment] }), intermediate = withProfile({ brand: 'QA perfil intermedio' }, initial);
  await withAccount(async runner => {
    // The first poll is one second after PUT and the second is sixteen seconds
    // after it, so this exercises ABA without accidentally testing the deadline.
    clock.tick(14_000); await runner.flush(); change(runner, 'brand', 'QA ACK obsoleto'); await runner.flush();
    const work = observe(button(runner, 'Guardar cambios').props.onClick()); await runner.flush();
    clock.tick(1_000); await runner.flush(); assert.equal(runner.child().props.account.profile.brand, 'QA perfil intermedio');
    clock.tick(15_000); await runner.flush(); assert.equal(gets(runner).length, 2); assert.equal(runner.child().props.account.profile.brand, 'QA marca'); assert.equal(work.done, false);
    pending.resolve(Response.json(ack({ brand: 'QA ACK obsoleto' }))); await runner.flush();
    assert.equal(work.done, true); assert.equal(runner.child().props.account.profile.brand, 'QA marca'); assert.equal(brandInput(runner).props.value, 'QA ACK obsoleto');
    assert.equal(button(runner, 'Guardar cambios').props.disabled, true); assert.doesNotMatch(message(runner), /Datos guardados/); assert.equal(puts(runner).length, 1);
  }, { initial, reply: call => call.method === 'PUT' ? pending.promise : Response.json(++reads === 1 ? intermediate : initial) });
});

test('newer dirty fields survive a tab remount and matching recovery of the earlier uncertain submission', async t => {
  fakeClock(t); const pending = deferred(); let bodyReads = 0;
  await withAccount(async runner => {
    change(runner, 'brand', 'QA enviada antes'); await runner.flush(); const old = button(runner, 'Guardar cambios').props.onClick; observe(old()); await runner.flush();
    change(runner, 'brand', 'QA marca posterior'); change(runner, 'phone', '59175556666'); change(runner, 'city', 'Potosí'); await runner.flush();
    await runner.tab('Mis invitaciones'); await runner.tab('Mi cuenta');
    assert.equal(brandInput(runner).props.value, 'QA marca posterior'); assert.equal(phoneInput(runner).props.value, '59175556666'); assert.equal(cityInput(runner).props.value, 'Potosí');
    pending.resolve({ ok: true, status: 200, json: async () => { bodyReads++; return ack({ brand: 'QA enviada antes' }); } }); await runner.flush();
    assert.equal(bodyReads, 0); assert.equal(runner.child().props.account.profile.brand, 'QA marca'); assert.equal(button(runner, 'Guardar cambios').props.disabled, true);
    await button(runner, 'Comprobar guardado').props.onClick(); await runner.flush();
    assert.equal(runner.child().props.account.profile.brand, 'QA enviada antes'); assert.equal(brandInput(runner).props.value, 'QA marca posterior'); assert.equal(phoneInput(runner).props.value, '59175556666'); assert.equal(cityInput(runner).props.value, 'Potosí');
    assert.equal(button(runner, 'Guardar cambios').props.disabled, false); assert.equal(puts(runner).length, 1); assert.equal(gets(runner).length, 1);
    old(); await runner.flush(); assert.equal(puts(runner).length, 1); assert.equal(runner.lateWrites(), 0);
  }, { reply: call => call.method === 'PUT' ? pending.promise : Response.json(withProfile({ brand: 'QA enviada antes' })) });
});

test('standalone AccountTab clears the old identity draft and rejects its old handlers and ACK after an account change', async t => {
  fakeClock(t); const pending = deferred(); let writes = 0, bodyReads = 0;
  const replacement = withProfile({ email: 'qa-new-owner@example.invalid', memberSince: '2026-10-21T12:00:00.000Z', brand: 'QA segunda identidad', phone: '59176667777', city: 'Tarija' });
  await withAccount(async runner => {
    change(runner, 'brand', 'QA primera identidad editada'); await runner.flush(); const old = button(runner, 'Guardar cambios').props.onClick; observe(old()); await runner.flush();
    await runner.update({ account: replacement });
    assert.equal(brandInput(runner).props.value, 'QA segunda identidad'); assert.equal(phoneInput(runner).props.value, '59176667777'); assert.equal(cityInput(runner).props.value, 'Tarija');
    old(); await runner.flush(); assert.equal(puts(runner).length, 1);
    pending.resolve({ ok: true, status: 200, json: async () => { bodyReads++; return ack({ brand: 'QA primera identidad editada' }); } }); await runner.flush();
    assert.equal(bodyReads, 0); assert.equal(runner.saved.length, 0); assert.equal(brandInput(runner).props.value, 'QA segunda identidad');
    change(runner, 'brand', 'QA segunda guardada'); await runner.flush(); await button(runner, 'Guardar cambios').props.onClick(); await runner.flush();
    assert.equal(puts(runner).length, 2); assert.equal(runner.saved.length, 1); assert.equal(runner.saved[0].profile.email, replacement.profile.email); assert.equal(runner.saved[0].profile.brand, 'QA segunda guardada');
  }, { full: false, reply: call => ++writes === 1 ? pending.promise : Response.json({ profile: { ...replacement.profile, ...JSON.parse(call.body) } }) });
});

test('standalone accepted profile stays visible when its consumer does not immediately replace the account prop', async t => {
  fakeClock(t);
  await withAccount(async runner => {
    change(runner, 'brand', 'QA guardada standalone'); change(runner, 'phone', '59177778888'); change(runner, 'city', 'Santa Cruz'); await runner.flush();
    const old = button(runner, 'Guardar cambios').props.onClick; await old(); await runner.flush();
    assert.equal(runner.saved.length, 1); assert.equal(brandInput(runner).props.value, 'QA guardada standalone'); assert.equal(phoneInput(runner).props.value, '59177778888'); assert.equal(cityInput(runner).props.value, 'Santa Cruz');
    // An ordinary consumer rerender with the same still-current prop is not a
    // canonical refresh and must not restore the opening profile or resend it.
    await runner.update({ onNotice: (tone, value) => runner.notices.push({ tone, text: value }) });
    assert.equal(brandInput(runner).props.value, 'QA guardada standalone'); old(); await runner.flush();
    assert.equal(puts(runner).length, 1); assert.equal(runner.saved.length, 1); assert.match(message(runner), /Datos guardados/);
  }, { full: false });
});
