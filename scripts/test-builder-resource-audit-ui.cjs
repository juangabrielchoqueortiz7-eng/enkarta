// Real publication audit component, resource collector, metrics and request helper.
// All responses, clocks and hooks live in RAM; no DOM, network, credentials or asset writes.
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
const filename = path.join(root, 'src/components/admin/builder/PublicationAuditPanel.tsx');
let source = fs.readFileSync(filename, 'utf8');
if (process.argv.includes('--baseline')) {
  // Explicit reproduction only. Normal shallow-checkout CI never invokes Git.
  source = require('node:child_process').execFileSync('git', ['-c', 'core.fsmonitor=false', 'show',
    'f129c3c2c0f16332cd42ad9eff8cdbf855e16c0a:src/components/admin/builder/PublicationAuditPanel.tsx'], { cwd: root, encoding: 'utf8' });
}
const compiled = new Module(filename, module);
compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(transpile(source, filename), filename);
const Panel = compiled.exports.default;
const { collectPublicationResources, publicationMetrics, resourceBudgetBytes } = require('../src/lib/publication-audit.ts');
const client = () => require('../src/lib/publication-audit-client.ts');
const TIMEOUT = 25_000, ID = '30000000-0000-4000-8000-000000000201', OTHER = '30000000-0000-4000-8000-000000000202';
const copy = value => JSON.parse(JSON.stringify(value));
const base = () => ({ id: ID, slug: 'qa-resource-audit', names: 'QA fictional event', cover_image_url: '/qa/cover-original.jpg',
  config: { musicUrl: '/qa/music-original.mp3' }, validity_mode: 'automatic' });
const validation = () => ({ errors: [], warnings: [] });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const observe = promise => { const state = { done: false }; Promise.resolve(promise).then(value => { state.done = true; state.value = value; }, error => { state.done = true; state.error = error; }); return state; };
const nodes = (element, predicate) => !React.isValidElement(element) ? [] : [
  ...(predicate(element) ? [element] : []), ...React.Children.toArray(element.props.children).flatMap(child => nodes(child, predicate)),
];
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(text).join(' ') : React.isValidElement(value) ? text(value.props.children) : '';
const message = runner => text(runner.current()).replace(/\s+/g, ' ');
const auditButton = runner => nodes(runner.current(), node => node.type === 'button' && /^(Analizar \d+|Analizando…|Repetir prueba|Reintentar análisis)$/.test(text(node).trim()))[0];
const action = runner => { const button = auditButton(runner); assert.ok(button, 'Expected the real resource audit action'); return button.props.onClick; };
const resultVisible = runner => /Verificados \d+ de \d+/.test(message(runner));
const assertPending = runner => { assert.equal(text(auditButton(runner)), 'Analizando…'); assert.equal(auditButton(runner).props.disabled, true); };
const assertError = runner => {
  assert.doesNotMatch(message(runner), /Analizando…|Verificados \d+ de \d+|QA_PRIVATE/);
  assert.match(message(runner), /No se pudo|No pudimos|no se pudo|no pudimos|tiempo|25 segundos/);
  assert.equal(auditButton(runner).props.disabled, false);
  assert.equal(resultVisible(runner), false);
};
function report(resources, edits = {}) {
  const results = resources.slice(0, 24).map(resource => ({ url: resource.url.trim(), kind: resource.kind,
    label: String(resource.label || 'Recurso').slice(0, 120), ...(resource.blockId ? { blockId: String(resource.blockId).slice(0, 120) } : {}),
    ok: true, status: 200, bytes: 1200, durationMs: 100, ...edits }));
  return summarize(results, resources.length);
}
function summarize(results, available) {
  const durations = results.map(item => item.durationMs || 0).filter(Boolean);
  return { results, summary: { checked: results.length, available,
    unknownSize: results.filter(item => item.kind !== 'link' && typeof item.bytes !== 'number').length,
    failed: results.filter(item => !item.ok).length,
    totalBytes: results.reduce((sum, item) => sum + (typeof item.bytes === 'number' ? item.bytes : 0), 0),
    averageResponseMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
    slow: results.filter(item => (item.durationMs || 0) > 1800).length,
    heavy: results.filter(item => (item.bytes || 0) > resourceBudgetBytes(item.kind, item.url)).length,
  } };
}
const response = resources => Response.json(report(resources));
function fakeClock(t) {
  let now = 1_800_000_000_000, serial = 0; const timers = new Map();
  t.mock.method(Date, 'now', () => now);
  t.mock.method(global, 'setTimeout', (callback, delay) => { const id = ++serial; timers.set(id, { callback, at: now + delay }); return id; });
  t.mock.method(global, 'clearTimeout', id => timers.delete(id));
  return { timers, elapse: ms => { now += ms; }, tick(ms) {
    now += ms;
    for (let round = 0; round < 500; round++) {
      const pending = [...timers].filter(([, timer]) => timer.at <= now).sort((a, b) => a[1].at - b[1].at)[0];
      if (!pending) return; timers.delete(pending[0]); pending[1].callback();
    }
    assert.fail('Unexpected resource audit timer loop');
  } };
}
async function withPanel(scenario, { data, reply } = {}) {
  const names = ['useState', 'useRef', 'useEffect', 'useMemo', 'useCallback'];
  const original = Object.fromEntries(names.map(name => [name, React[name]])), oldFetch = global.fetch;
  const calls = [], runners = []; let owner, cursor = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  React.useState = initial => {
    const fiber = owner, index = cursor++;
    if (!(index in fiber.slots)) {
      const slot = fiber.slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      slot.set = next => { if (!fiber.active) { fiber.lateWrites++; return; } next = typeof next === 'function' ? next(slot.value) : next;
        if (!Object.is(next, slot.value)) { slot.value = next; fiber.dirty = true; } };
    }
    return [fiber.slots[index].value, fiber.slots[index].set];
  };
  React.useRef = initial => { const index = cursor++; return owner.slots[index] ?? (owner.slots[index] = { current: initial }); };
  React.useMemo = (compute, deps) => { const index = cursor++; if (!owner.slots[index] || !same(owner.slots[index].deps, deps)) owner.slots[index] = { value: compute(), deps }; return owner.slots[index].value; };
  React.useCallback = (callback, deps) => React.useMemo(() => callback, deps);
  React.useEffect = (effect, deps) => {
    const fiber = owner, index = cursor++, previous = fiber.slots[index];
    if (!previous || !same(previous.deps, deps)) {
      const slot = { deps, effect, cleanup: previous?.cleanup }; fiber.slots[index] = slot;
      fiber.effects.push(() => { if (fiber.active) { slot.cleanup?.(); slot.cleanup = effect(); } });
    }
  };
  global.fetch = async (url, options = {}) => {
    assert.equal(url, '/api/admin/publication-audit'); assert.equal(options.method, 'POST');
    const call = { url, ...options, body: JSON.parse(options.body) }; calls.push(call);
    return reply ? reply(call, calls) : response(call.body.resources);
  };
  const create = async initial => {
    const fiber = { slots: [], active: true, dirty: true, effects: [], snapshots: [], lateWrites: 0, tree: null,
      props: { data: initial || base(), validation: validation() } };
    const runner = { calls, current: () => fiber.tree, snapshots: fiber.snapshots, lateWrites: () => fiber.lateWrites,
      async flush() {
        for (let round = 0; round < 80; round++) {
          if (fiber.dirty && fiber.active) { fiber.dirty = false; owner = fiber; cursor = 0; fiber.effects = [];
            fiber.tree = Panel(fiber.props); fiber.snapshots.push(fiber.tree); for (const effect of fiber.effects) effect(); }
          await new Promise(done => setImmediate(done)); if (!fiber.dirty || !fiber.active) return fiber.tree;
        }
        throw Error('Publication audit hooks did not settle');
      },
      update: async patch => { fiber.props = { ...fiber.props, ...patch }; fiber.dirty = true; return runner.flush(); },
      unmount() { if (fiber.active) { for (const slot of fiber.slots) slot?.cleanup?.(); fiber.active = false; } },
      async replayEffects() {
        for (const slot of fiber.slots) if (slot?.effect) slot.cleanup?.();
        for (const slot of fiber.slots) if (slot?.effect) slot.cleanup = slot.effect();
        return runner.flush();
      },
    };
    runners.push(runner); await runner.flush(); return runner;
  };
  try { const runner = await create(data); return await scenario(runner, create); }
  finally { for (const runner of runners) runner.unmount(); for (const name of names) React[name] = original[name]; global.fetch = oldFetch; }
}

test('transport that ignores cancellation cannot leave Analizando active after 25 seconds', async t => {
  const clock = fakeClock(t), pending = deferred();
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); assertPending(runner);
    clock.tick(TIMEOUT - 1); await runner.flush(); assertPending(runner);
    clock.tick(1); await runner.flush(); assertError(runner); assert.equal(runner.calls.length, 1);
    assert.equal(runner.calls[0].signal.aborted, true); assert.equal(clock.timers.size, 0);
  }, { reply: () => pending.promise });
});

test('a successful HTTP response with hanging JSON also has the full-attempt deadline', async t => {
  const clock = fakeClock(t), body = deferred();
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); assertPending(runner);
    clock.tick(TIMEOUT); await runner.flush(); assertError(runner); assert.equal(clock.timers.size, 0);
  }, { reply: () => ({ ok: true, status: 200, json: () => body.promise }) });
});

test('transport and JSON share one budget instead of receiving separate 25 second periods', async t => {
  const clock = fakeClock(t), transport = deferred(), body = deferred(); let reads = 0;
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); clock.tick(22_000);
    transport.resolve({ ok: true, status: 200, json: () => { reads++; return body.promise; } }); await runner.flush();
    assert.equal(reads, 1); clock.tick(2_999); await runner.flush(); assertPending(runner);
    clock.tick(1); await runner.flush(); assertError(runner); assert.equal(runner.calls.length, 1);
  }, { reply: () => transport.promise });
});

test('a late HTTP response is ignored without reading its body after timeout', async t => {
  const clock = fakeClock(t), transport = deferred(); let reads = 0;
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); clock.tick(TIMEOUT); await runner.flush(); assertError(runner);
    const snapshots = runner.snapshots.length;
    transport.resolve({ ok: true, status: 200, json: async () => { reads++; return report(collectPublicationResources(base())); } }); await runner.flush();
    assert.equal(reads, 0); assert.equal(runner.snapshots.length, snapshots); assertError(runner);
  }, { reply: () => transport.promise });
});

test('a late JSON result cannot replace the visible timeout error', async t => {
  const clock = fakeClock(t), body = deferred();
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); clock.tick(TIMEOUT); await runner.flush(); const snapshots = runner.snapshots.length;
    body.resolve(report(collectPublicationResources(base()))); await runner.flush();
    assertError(runner); assert.equal(runner.snapshots.length, snapshots); assert.equal(runner.lateWrites(), 0);
  }, { reply: () => ({ ok: true, status: 200, json: () => body.promise }) });
});

test('wall clock expiry rejects HTTP headers even when the timer callback was delayed', async t => {
  const clock = fakeClock(t), transport = deferred(); let reads = 0;
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); clock.elapse(TIMEOUT + 1);
    transport.resolve({ ok: true, status: 200, json: async () => { reads++; return report(collectPublicationResources(base())); } }); await runner.flush();
    assertError(runner); assert.equal(reads, 0); assert.equal(clock.timers.size, 0);
  }, { reply: () => transport.promise });
});

test('wall clock expiry rejects a JSON ACK even when no timer callback has executed', async t => {
  const clock = fakeClock(t), body = deferred();
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); clock.elapse(TIMEOUT);
    body.resolve(report(collectPublicationResources(base()))); await runner.flush(); assertError(runner); assert.equal(clock.timers.size, 0);
  }, { reply: () => ({ ok: true, status: 200, json: () => body.promise }) });
});

test('same-turn repeated actions issue one request and expose an accessible busy state', async t => {
  fakeClock(t); const pending = deferred();
  await withPanel(async runner => {
    const click = action(runner); click(); click(); click(); assert.equal(runner.calls.length, 1);
    await runner.flush(); assertPending(runner); assert.equal(auditButton(runner).props['aria-busy'], true);
    assert.ok(nodes(runner.current(), node => node.props.role === 'status').length);
    pending.resolve(response(runner.calls[0].body.resources)); await runner.flush();
    assert.equal(runner.calls.length, 1); assert.equal(resultVisible(runner), true);
  }, { reply: () => pending.promise });
});

test('a valid request uses no-store and the captured invitation and resources without modifying source data', async t => {
  const clock = fakeClock(t), data = base(), before = copy(data), resources = collectPublicationResources(data), metrics = publicationMetrics(data);
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); assert.equal(runner.calls.length, 1);
    assert.deepEqual(runner.calls[0].body, { invitationId: ID, resources }); assert.equal(runner.calls[0].cache, 'no-store');
    assert.equal(runner.calls[0].headers['Content-Type'], 'application/json'); assert.deepEqual(data, before);
    assert.deepEqual(publicationMetrics(data), metrics); assert.equal(resultVisible(runner), true);
    assert.match(message(runner), /Verificados 2 de 2/); assert.equal(text(auditButton(runner)), 'Repetir prueba');
    assert.notEqual(auditButton(runner).props['aria-busy'], true); assert.equal(clock.timers.size, 0);
  }, { data });
});

test('two mounted editors have independent request locks and reports', async t => {
  fakeClock(t); const pending = new Map();
  await withPanel(async (runner, create) => {
    const second = await create({ ...base(), id: OTHER }); action(runner)(); action(second)();
    await runner.flush(); await second.flush(); assert.equal(runner.calls.length, 2); assertPending(runner); assertPending(second);
    pending.get(OTHER).resolve(response(runner.calls[1].body.resources)); await second.flush(); await runner.flush();
    assert.equal(resultVisible(second), true); assertPending(runner);
    pending.get(ID).resolve(response(runner.calls[0].body.resources)); await runner.flush(); assert.equal(resultVisible(runner), true);
  }, { reply: call => { const item = deferred(); pending.set(call.body.invitationId, item); return item.promise; } });
});

test('unmount cancels pending work and an abort-ignoring response never writes to dead hooks', async t => {
  const clock = fakeClock(t), pending = deferred(); let reads = 0;
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); runner.unmount(); assert.equal(runner.calls[0].signal.aborted, true);
    pending.resolve({ ok: true, status: 200, json: async () => { reads++; return report(runner.calls[0].body.resources); } }); await runner.flush();
    assert.equal(reads, 0); assert.equal(runner.lateWrites(), 0); assert.equal(clock.timers.size, 0);
  }, { reply: () => pending.promise });
});

test('StrictMode effect replay ends stale running work and permits one new explicit read-only audit', async t => {
  fakeClock(t); const pending = deferred();
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); await runner.replayEffects();
    assert.equal(runner.calls[0].signal.aborted, true); assert.notEqual(text(auditButton(runner)), 'Analizando…');
    assert.equal(auditButton(runner).props.disabled, false); assert.equal(runner.calls.length, 1);
    action(runner)(); await runner.flush(); assert.equal(runner.calls.length, 2); assert.equal(resultVisible(runner), true);
    pending.resolve(response(runner.calls[0].body.resources)); await runner.flush(); assert.equal(runner.calls.length, 2); assert.equal(resultVisible(runner), true);
  }, { reply: (call, calls) => calls.length === 1 ? pending.promise : response(call.body.resources) });
});

test('initial StrictMode replay does not start a network audit automatically', async t => {
  fakeClock(t);
  await withPanel(async runner => {
    await runner.replayEffects(); assert.equal(runner.calls.length, 0); assert.equal(auditButton(runner).props.disabled, false);
    action(runner)(); await runner.flush(); assert.equal(runner.calls.length, 1); assert.equal(resultVisible(runner), true);
  });
});

test('changing invitation identity clears a report even when its resources are identical', async t => {
  fakeClock(t);
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); assert.equal(resultVisible(runner), true);
    const stale = action(runner); await runner.update({ data: { ...base(), id: OTHER } });
    assert.equal(resultVisible(runner), false); stale(); await runner.flush(); assert.equal(runner.calls.length, 1);
    action(runner)(); await runner.flush(); assert.equal(runner.calls[1].body.invitationId, OTHER); assert.equal(resultVisible(runner), true);
  });
});

test('changing resource identity aborts pending work and rejects a retained old click handler', async t => {
  fakeClock(t); const pending = deferred();
  await withPanel(async runner => {
    const stale = action(runner); stale(); await runner.flush();
    const changed = { ...base(), cover_image_url: '/qa/new-original.jpg' }; await runner.update({ data: changed });
    assert.equal(runner.calls[0].signal.aborted, true); assert.notEqual(text(auditButton(runner)), 'Analizando…');
    stale(); await runner.flush(); assert.equal(runner.calls.length, 1);
    pending.resolve(response(runner.calls[0].body.resources)); await runner.flush(); assert.equal(resultVisible(runner), false);
    action(runner)(); await runner.flush(); assert.equal(resultVisible(runner), true); assert.equal(runner.calls.length, 2);
    assert.equal(runner.calls[1].body.resources[0].url, changed.cover_image_url);
  }, { reply: (call, calls) => calls.length === 1 ? pending.promise : response(call.body.resources) });
});

test('invitation A to B to A invalidates both the old ACK and old handlers', async t => {
  fakeClock(t); const pending = deferred();
  await withPanel(async runner => {
    const stale = action(runner); stale(); await runner.flush();
    await runner.update({ data: { ...base(), id: OTHER } }); await runner.update({ data: base() });
    stale(); await runner.flush(); assert.equal(runner.calls.length, 1);
    pending.resolve(response(runner.calls[0].body.resources)); await runner.flush(); assert.equal(resultVisible(runner), false);
    action(runner)(); await runner.flush(); assert.equal(runner.calls.length, 2); assert.equal(resultVisible(runner), true);
  }, { reply: (call, calls) => calls.length === 1 ? pending.promise : response(call.body.resources) });
});

test('resource A to B to A invalidates old handlers even after an exact signature returns', async t => {
  fakeClock(t);
  await withPanel(async runner => {
    const stale = action(runner); await runner.update({ data: { ...base(), cover_image_url: '/qa/b.jpg' } });
    await runner.update({ data: base() }); stale(); await runner.flush(); assert.equal(runner.calls.length, 0);
    action(runner)(); await runner.flush(); assert.equal(runner.calls.length, 1); assert.equal(resultVisible(runner), true);
  });
});

test('editing non-resource fields preserves a pending audit and its original resource snapshot', async t => {
  fakeClock(t); const pending = deferred();
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); await runner.update({ data: { ...base(), names: 'QA names changed during audit', slug: 'qa-another-slug' } });
    assert.equal(runner.calls[0].signal.aborted, false); assertPending(runner);
    pending.resolve(response(runner.calls[0].body.resources)); await runner.flush(); assert.equal(resultVisible(runner), true);
    assert.deepEqual(runner.calls[0].body.resources, collectPublicationResources(base()));
    assert.ok(nodes(runner.current(), node => node.type === 'a' && node.props.href === '/i/qa-another-slug?preview=1').length);
  }, { reply: () => pending.promise });
});

test('a fresh data object and changed validation retain a valid report for unchanged resources', async t => {
  fakeClock(t);
  await withPanel(async runner => {
    action(runner)(); await runner.flush();
    await runner.update({ data: { ...base(), names: 'QA current text' }, validation: { errors: [{ severity: 'error', title: 'QA required field', detail: 'QA detail', category: 'contenido' }], warnings: [] } });
    assert.equal(resultVisible(runner), true); assert.match(message(runner), /QA required field/); assert.equal(runner.calls.length, 1);
  });
});

test('repeating an audit removes the previous report while pending and keeps it cleared after failure', async t => {
  fakeClock(t); const pending = deferred();
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); assert.equal(resultVisible(runner), true);
    action(runner)(); await runner.flush(); assertPending(runner); assert.equal(resultVisible(runner), false);
    pending.reject(Error('QA_PRIVATE_TRANSPORT')); await runner.flush(); assertError(runner); assert.equal(runner.calls.length, 2);
  }, { reply: (call, calls) => calls.length === 1 ? response(call.body.resources) : pending.promise });
});

test('a rejected audit is retried only by an explicit click and can then show a verified report', async t => {
  const clock = fakeClock(t);
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); assertError(runner); clock.tick(TIMEOUT * 3); await runner.flush();
    assert.equal(runner.calls.length, 1); action(runner)(); await runner.flush(); assert.equal(runner.calls.length, 2);
    assert.equal(resultVisible(runner), true); assert.doesNotMatch(message(runner), /QA_PRIVATE|No se pudo ejecutar/);
  }, { reply: (call, calls) => calls.length === 1 ? Response.json({ error: 'QA_PRIVATE_SESSION' }, { status: 401 }) : response(call.body.resources) });
});

test('a structurally valid failed resource produces its warning instead of a false clean report', async t => {
  fakeClock(t);
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); assert.equal(resultVisible(runner), true);
    assert.match(message(runner), /Portada principal no responde/); assert.match(message(runner), /QA resource unavailable/);
    assert.doesNotMatch(message(runner), /Sin problemas detectados/);
  }, { reply: call => {
    const audit = report(call.body.resources); audit.results[0] = { ...audit.results[0], ok: false, status: 404, error: 'QA resource unavailable' };
    return Response.json(summarize(audit.results, call.body.resources.length));
  } });
});

test('more than 24 resources are reported honestly as an incomplete capped audit', async t => {
  fakeClock(t); const data = base(); data.config.galleryImages = Array.from({ length: 25 }, (_, index) => `/qa/gallery-${index}.jpg`);
  const resources = collectPublicationResources(data); assert.equal(resources.length, 27);
  await withPanel(async runner => {
    action(runner)(); await runner.flush(); assert.equal(resultVisible(runner), true);
    assert.match(message(runner), /Verificados 24 de 27/); assert.match(message(runner), /Falta comprobar recursos/);
    assert.equal(runner.calls[0].body.resources.length, 27);
  }, { data });
});

test('client validates the server normalization of long labels and block IDs without editing caller resources', async t => {
  fakeClock(t); const resources = [{ url: '/qa/long.jpg', kind: 'image', label: 'QA '.repeat(70), blockId: 'qa-block-'.repeat(25) }], before = copy(resources);
  const audit = await client().requestPublicationAudit(ID, resources, new AbortController().signal, async () => response(resources));
  assert.equal(audit.results[0].label, resources[0].label.slice(0, 120)); assert.equal(audit.results[0].blockId, resources[0].blockId.slice(0, 120));
  assert.deepEqual(resources, before); assert.equal(client().PUBLICATION_AUDIT_TIMEOUT_MS, TIMEOUT);
});

test('malformed JSON and missing or non-array results never become a verified UI report', async t => {
  fakeClock(t);
  for (const body of [null, {}, { results: null, summary: {} }, { results: {}, summary: {} }, { results: [], summary: null }]) {
    await withPanel(async runner => { action(runner)(); await runner.flush(); assertError(runner); }, { reply: () => Response.json(body) });
  }
  await withPanel(async runner => { action(runner)(); await runner.flush(); assertError(runner); }, { reply: () => ({ ok: true, status: 200, json: async () => { throw SyntaxError('QA_PRIVATE_JSON'); } }) });
});

test('non-boolean availability and missing required result identity are rejected', async t => {
  fakeClock(t);
  for (const mutate of [audit => { audit.results[0].ok = 'true'; }, audit => { audit.results[0].ok = 1; },
    audit => { delete audit.results[0].ok; }, audit => { delete audit.results[0].url; }, audit => { delete audit.results[0].kind; },
    audit => { audit.results[0].label = null; }, audit => { audit.results[0] = null; },
    audit => { audit.results[0].status = 404; }, audit => { delete audit.results[0].status; },
    audit => { audit.results[0].ok = false; }, audit => { delete audit.results[0].durationMs; }, audit => { audit.results[0].error = true; }]) {
    await withPanel(async runner => { action(runner)(); await runner.flush(); assertError(runner); }, { reply: call => { const audit = report(call.body.resources); mutate(audit); return Response.json(audit); } });
  }
});

test('invalid numeric measurements and status values cannot contaminate totals or warnings', async t => {
  fakeClock(t);
  for (const [key, value] of [['bytes', -1], ['bytes', '1200'], ['bytes', null], ['durationMs', -1], ['durationMs', '100'],
    ['durationMs', null], ['status', '200'], ['status', 200.5], ['status', 999], ['status', null]]) {
    await withPanel(async runner => { action(runner)(); await runner.flush(); assertError(runner); }, { reply: call => {
      const audit = report(call.body.resources); audit.results[0][key] = value; return Response.json(audit);
    } });
  }
});

test('forged counters and absent summary metrics are rejected instead of claiming completed verification', async t => {
  fakeClock(t);
  for (const mutate of [audit => { audit.summary.checked = 999; }, audit => { audit.summary.available = 999; },
    audit => { audit.summary.failed = 0.5; }, audit => { audit.summary.totalBytes = '2400'; }, audit => { audit.summary.averageResponseMs = null; },
    audit => { audit.summary.unknownSize = 99; }, audit => { audit.summary.slow = 999; }, audit => { audit.summary.heavy = -1; },
    audit => { delete audit.summary.totalBytes; }]) {
    await withPanel(async runner => { action(runner)(); await runner.flush(); assertError(runner); }, { reply: call => { const audit = report(call.body.resources); mutate(audit); return Response.json(audit); } });
  }
});

test('changed, reordered, duplicated, missing or extra resources cannot be accepted as this audit', async t => {
  fakeClock(t);
  for (const mutate of [audit => { audit.results[0].url = '/qa/other.jpg'; }, audit => { audit.results[0].kind = 'video'; },
    audit => { audit.results[0].label = 'QA unrelated label'; }, audit => { audit.results[0].blockId = 'qa-other-block'; },
    audit => { audit.results.reverse(); }, audit => { audit.results[1] = { ...audit.results[0] }; },
    audit => { audit.results.pop(); }, audit => { audit.results.push({ ...audit.results[0], url: '/qa/extra.jpg' }); }]) {
    await withPanel(async runner => { action(runner)(); await runner.flush(); assertError(runner); }, { reply: call => { const audit = report(call.body.resources); mutate(audit); return Response.json(audit); } });
  }
});

test('zero resources has a disabled audit action and cannot issue a hidden request', async t => {
  fakeClock(t); const data = { ...base(), cover_image_url: null, config: {} };
  await withPanel(async runner => {
    assert.equal(auditButton(runner).props.disabled, true); action(runner)(); await runner.flush(); assert.equal(runner.calls.length, 0);
  }, { data });
});
