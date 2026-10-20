// Complete partner-request deadline, real helper, fictional fetch/body readers.
// Fake timers make these tests deterministic; no Auth, HTTP or bank operation.
'use strict';
const fs = require('node:fs'), ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: file }).outputText, file);
const { partnerRequest, PARTNER_REQUEST_TIMEOUT_MS: timeout } = require('../src/lib/partner-checkout.ts');
const url = '/api/partner/payments', timeoutText = /No pudimos comprobar el resultado en 25 segundos/, cancelText = /Se interrumpió la espera/;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = () => new Promise(done => setImmediate(done));
function observe(promise) { const state = { kind: 'pending', value: null, error: null, fulfilled: 0, rejected: 0 }; promise.then(value => { state.kind = 'fulfilled'; state.value = value; state.fulfilled++; }, error => { state.kind = 'rejected'; state.error = error; state.rejected++; }); return state; }
function clock(t) {
  let now = 1_800_000_000_000, sequence = 0; const timers = new Map();
  t.mock.method(Date, 'now', () => now);
  t.mock.method(global, 'setTimeout', (callback, delay) => { const id = ++sequence; timers.set(id, { callback, at: now + delay, delay }); return id; });
  t.mock.method(global, 'clearTimeout', id => timers.delete(id));
  return { timers, advance(ms) { now += ms; }, tick(ms) { now += ms; for (let index = 0; index < 100; index++) { const pending = [...timers].filter(([, timer]) => timer.at <= now).sort((a, b) => a[1].at - b[1].at)[0]; if (!pending) return; timers.delete(pending[0]); pending[1].callback(); } assert.fail('Unexpected timer loop'); } };
}
function tracked(t) {
  const controller = new AbortController(), signal = controller.signal, listeners = new Set(), add = signal.addEventListener.bind(signal), remove = signal.removeEventListener.bind(signal); let added = 0, removed = 0;
  t.mock.method(signal, 'addEventListener', (type, callback, options) => { if (type === 'abort') { listeners.add(callback); added++; } return add(type, callback, options); });
  t.mock.method(signal, 'removeEventListener', (type, callback, options) => { if (type === 'abort') { listeners.delete(callback); removed++; } return remove(type, callback, options); });
  return { controller, signal, listeners, counts: () => ({ added, removed }) };
}
const reply = value => ({ ok: true, status: 200, json: async () => value });
function uncertain(error, pattern) { assert.match(error.message, pattern); assert.match(error.message, /Actualizar estado.*antes de repetir/); assert.match(error.message, /puede haberse recibido en el servidor/); assert.doesNotMatch(error.message, /pago falló|no se (?:guardó|recibió)|canceló.*servidor|QA_PRIVATE/i); }

test('checkout keeps its three-argument contract, complete 25-second budget and one request with unchanged mutation body', async t => {
  const fake = clock(t), external = tracked(t), body = JSON.stringify({ plan: 'inicio', months: 1, method: 'qr' }), headers = { 'Content-Type': 'application/json' }; let calls = 0, child;
  assert.equal(timeout, 25000);
  const result = await partnerRequest(url, { method: 'POST', body, headers, signal: external.signal }, async (endpoint, options) => {
    calls++; child = options.signal; assert.equal(endpoint, url); assert.equal(options.method, 'POST'); assert.equal(options.body, body); assert.equal(options.headers, headers); assert.equal(options.cache, 'no-store'); assert.ok(child instanceof AbortSignal); assert.notEqual(child, external.signal); assert.equal([...fake.timers.values()][0].delay, timeout); return reply({ payment: { id: 'QA-canonical-result' } });
  });
  assert.deepEqual(result, { payment: { id: 'QA-canonical-result' } }); assert.equal(calls, 1); assert.equal(child.aborted, false); assert.equal(external.signal.aborted, false); assert.equal(external.listeners.size, 0); assert.deepEqual(external.counts(), { added: 1, removed: 1 }); assert.equal(fake.timers.size, 0);
  fake.tick(timeout * 2); external.controller.abort(); assert.equal(child.aborted, false); assert.equal(calls, 1);
});

test('a hanging transport that ignores AbortSignal rejects exactly at the deadline and never retries writes', async t => {
  const fake = clock(t), external = tracked(t); let child, calls = 0;
  const state = observe(partnerRequest(url, { method: 'POST', signal: external.signal }, async (_url, options) => { calls++; child = options.signal; return new Promise(() => {}); }));
  fake.tick(timeout - 1); await flush(); assert.equal(state.kind, 'pending'); fake.tick(1); await flush(); uncertain(state.error, timeoutText);
  assert.equal(state.kind, 'rejected'); assert.equal(state.rejected, 1); assert.equal(child.aborted, true); assert.equal(external.signal.aborted, false); assert.equal(external.listeners.size, 0); assert.equal(fake.timers.size, 0); fake.tick(timeout * 3); await flush(); assert.equal(calls, 1); assert.equal(state.rejected, 1);
});

test('a hanging response body uses the original request deadline and a late valid body cannot become success', async t => {
  const fake = clock(t), external = tracked(t), transport = deferred(), body = deferred(); let calls = 0, jsonCalls = 0, child;
  const state = observe(partnerRequest(url, { method: 'POST', signal: external.signal }, async (_url, options) => { calls++; child = options.signal; return transport.promise; }));
  fake.tick(18000); transport.resolve({ ok: true, status: 200, json: () => { jsonCalls++; return body.promise; } }); await flush(); assert.equal(jsonCalls, 1);
  fake.tick(6999); await flush(); assert.equal(state.kind, 'pending'); fake.tick(1); await flush(); uncertain(state.error, timeoutText); assert.equal(child.aborted, true);
  body.resolve({ payment: { reference: 'ENK-LATEQA' } }); await flush(); assert.equal(state.kind, 'rejected'); assert.equal(state.fulfilled, 0); assert.equal(state.rejected, 1); assert.equal(calls, 1); assert.equal(jsonCalls, 1); assert.equal(external.signal.aborted, false); assert.equal(fake.timers.size, 0); assert.equal(external.listeners.size, 0);
});

test('late transport success never invokes its JSON reader after timeout', async t => {
  const fake = clock(t), external = tracked(t), pending = deferred(); let calls = 0, jsonCalls = 0;
  const state = observe(partnerRequest(url, { method: 'POST', signal: external.signal }, async () => { calls++; return pending.promise; })); fake.tick(timeout); await flush();
  pending.resolve({ ok: true, status: 200, json: async () => { jsonCalls++; return { success: true }; } }); await flush(); uncertain(state.error, timeoutText); assert.equal(state.fulfilled, 0); assert.equal(state.rejected, 1); assert.equal(jsonCalls, 0); assert.equal(calls, 1); assert.equal(external.listeners.size, 0); assert.equal(fake.timers.size, 0);
});

test('late transport and JSON rejections are consumed without unhandled rejections, extra completions or retries', async t => {
  const fake = clock(t), unhandled = [], listener = error => unhandled.push(error); process.on('unhandledRejection', listener); t.after(() => process.removeListener('unhandledRejection', listener));
  for (const phase of ['transport', 'body']) {
    const external = tracked(t), pending = deferred(); let calls = 0;
    const state = observe(partnerRequest(url, { method: 'POST', signal: external.signal }, async () => { calls++; return phase === 'transport' ? pending.promise : { ok: true, status: 200, json: () => pending.promise }; })); await flush(); fake.tick(timeout); await flush();
    pending.reject(Error('QA_PRIVATE_LATE_FAILURE')); await flush(); uncertain(state.error, timeoutText); assert.equal(state.fulfilled, 0); assert.equal(state.rejected, 1); assert.equal(calls, 1); assert.equal(external.listeners.size, 0); assert.equal(fake.timers.size, 0);
  }
  assert.deepEqual(unhandled, []);
});

test('a pre-aborted caller signal stops before network, timers and listener registration', async t => {
  const fake = clock(t), external = tracked(t); external.controller.abort(); let calls = 0;
  await assert.rejects(partnerRequest(url, { method: 'POST', signal: external.signal }, async () => { calls++; return reply({ success: true }); }), error => { uncertain(error, cancelText); return true; });
  assert.equal(calls, 0); assert.equal(fake.timers.size, 0); assert.deepEqual(external.counts(), { added: 0, removed: 0 });
});

test('external cancellation propagates to its child even when transport ignores abort and prevents a later body read', async t => {
  const fake = clock(t), external = tracked(t), pending = deferred(); let child, calls = 0, jsonCalls = 0;
  const state = observe(partnerRequest(url, { method: 'DELETE', signal: external.signal }, async (_url, options) => { calls++; child = options.signal; return pending.promise; }));
  external.controller.abort(); await flush(); uncertain(state.error, cancelText); assert.equal(child.aborted, true); assert.equal(external.listeners.size, 0); assert.equal(fake.timers.size, 0);
  pending.resolve({ ok: true, status: 200, json: async () => { jsonCalls++; return { success: true }; } }); await flush(); assert.equal(jsonCalls, 0); assert.equal(calls, 1); assert.equal(state.rejected, 1); assert.equal(state.fulfilled, 0);
});

test('external cancellation while reading JSON prevents a late successful result', async t => {
  const fake = clock(t), external = tracked(t), body = deferred(); let child, jsonCalls = 0;
  const state = observe(partnerRequest('/api/partner/payments/receipt', { method: 'POST', body: new FormData(), signal: external.signal }, async (_url, options) => { child = options.signal; return { ok: true, status: 200, json: () => { jsonCalls++; return body.promise; } }; })); await flush(); assert.equal(jsonCalls, 1);
  external.controller.abort(); await flush(); uncertain(state.error, cancelText); body.resolve({ payment: { quote_locked_at: '2027-01-01' } }); await flush();
  assert.equal(child.aborted, true); assert.equal(state.fulfilled, 0); assert.equal(state.rejected, 1); assert.equal(external.listeners.size, 0); assert.equal(fake.timers.size, 0);
});

test('cancellation immediately after fetch headers or JSON prevents processing any late reply', async t => {
  const fake = clock(t);
  for (const phase of ['headers', 'json']) {
    const external = tracked(t); let jsonCalls = 0;
    const state = observe(partnerRequest(url, { signal: external.signal }, async () => {
      if (phase === 'headers') external.controller.abort();
      return { ok: true, status: 200, json: async () => { jsonCalls++; if (phase === 'json') external.controller.abort(); return { success: true }; } };
    })); await flush(); uncertain(state.error, cancelText); assert.equal(jsonCalls, phase === 'headers' ? 0 : 1); assert.equal(state.fulfilled, 0); assert.equal(external.listeners.size, 0); assert.equal(fake.timers.size, 0);
  }
});

test('deadline and cancellation reasons settle before synchronous abort-triggered transport rejection', async t => {
  const fake = clock(t);
  for (const phase of ['timeout', 'cancel']) {
    const external = tracked(t); const state = observe(partnerRequest(url, { method: 'POST', signal: external.signal }, async (_url, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(Error('QA_PRIVATE_ABORT_OVERRIDE')), { once: true }))));
    if (phase === 'timeout') fake.tick(timeout); else external.controller.abort(); await flush(); uncertain(state.error, phase === 'timeout' ? timeoutText : cancelText); assert.equal(state.rejected, 1); assert.equal(fake.timers.size, 0); assert.equal(external.listeners.size, 0);
  }
});

test('elapsed budget rejects before a delayed timer can run after fetch, JSON or error validation', async t => {
  const fake = clock(t);
  for (const phase of ['headers', 'json', 'validation']) {
    const external = tracked(t); let jsonCalls = 0, child;
    const state = observe(partnerRequest(url, { signal: external.signal }, async (_url, options) => {
      child = options.signal; if (phase === 'headers') fake.advance(timeout);
      return { get ok() { if (phase === 'validation') fake.advance(timeout); return phase !== 'validation'; }, status: 200,
        json: async () => { jsonCalls++; if (phase === 'json') fake.advance(timeout); return { success: true, error: 'QA valid error' }; } };
    })); await flush(); uncertain(state.error, timeoutText); assert.equal(child.aborted, true); assert.equal(jsonCalls, phase === 'headers' ? 0 : 1); assert.equal(state.fulfilled, 0); assert.equal(fake.timers.size, 0); assert.equal(external.listeners.size, 0);
  }
});

test('success just before the deadline cleans resources and later abort cannot change or cancel its result', async t => {
  const fake = clock(t), external = tracked(t), body = deferred(); let child;
  const state = observe(partnerRequest(url, { signal: external.signal }, async (_url, options) => { child = options.signal; return { ok: true, status: 200, json: () => body.promise }; })); await flush(); fake.tick(timeout - 1); body.resolve({ success: true }); await flush();
  assert.equal(state.kind, 'fulfilled'); assert.deepEqual(state.value, { success: true }); assert.equal(fake.timers.size, 0); assert.equal(external.listeners.size, 0); fake.tick(1); external.controller.abort(); await flush(); assert.equal(state.fulfilled, 1); assert.equal(state.rejected, 0); assert.equal(child.aborted, false);
});

test('connection, incomplete JSON, HTTP and payload errors preserve the previous contract and clean resources', async t => {
  const fake = clock(t), failures = [
    { transport: async () => { throw Error('QA_PRIVATE_TRANSPORT'); }, text: /problema de conexión/ },
    { transport: () => { throw Error('QA_PRIVATE_SYNC_TRANSPORT'); }, text: /problema de conexión/ },
    { transport: async () => ({ ok: true, status: 200, json: async () => { throw Error('QA_PRIVATE_JSON'); } }), text: /respuesta llegó incompleta/ },
    { transport: async () => new Response('{truncated'), text: /respuesta llegó incompleta/ },
    ...[null, [], '', 0, true].map(value => ({ transport: async () => reply(value), text: /No pudimos verificar la respuesta/ })),
    ...[400, 401, 403, 409, 422, 500, 503].map(status => ({ transport: async () => ({ ok: false, status, json: async () => ({ error: 'Pago bloqueado de QA' }) }), text: /^Pago bloqueado de QA$/ })),
    ...[null, [], { error: {} }, { error: 42 }, {}].map(value => ({ transport: async () => ({ ok: false, status: 500, json: async () => value }), text: /No se pudo completar la operación/ })),
  ];
  for (const failure of failures) {
    const external = tracked(t); let calls = 0, child;
    await assert.rejects(partnerRequest(url, { method: 'POST', signal: external.signal }, (...args) => { calls++; child = args[1].signal; return failure.transport(...args); }), error => { assert.match(error.message, failure.text); assert.doesNotMatch(error.message, /QA_PRIVATE/); return true; });
    assert.equal(calls, 1); assert.equal(child.aborted, false); assert.equal(external.signal.aborted, false); assert.deepEqual(external.counts(), { added: 1, removed: 1 }); assert.equal(external.listeners.size, 0); assert.equal(fake.timers.size, 0);
  }
});

test('independent requests do not share deadlines or cancellation and null external signals stay compatible', async t => {
  const fake = clock(t), first = tracked(t), second = tracked(t), a = deferred(), b = deferred(); let childA, childB;
  const one = observe(partnerRequest(url, { signal: first.signal }, async (_url, options) => { childA = options.signal; return a.promise; })); fake.tick(5000);
  const two = observe(partnerRequest('/api/partner/account', { signal: second.signal }, async (_url, options) => { childB = options.signal; return b.promise; })); assert.equal(fake.timers.size, 2);
  first.controller.abort(); await flush(); uncertain(one.error, cancelText); assert.equal(childA.aborted, true); assert.equal(childB.aborted, false); assert.equal(fake.timers.size, 1); assert.equal(two.kind, 'pending');
  b.resolve(reply({ account: true })); await flush(); assert.deepEqual(two.value, { account: true }); assert.equal(fake.timers.size, 0); assert.equal(second.signal.aborted, false);
  assert.deepEqual(await partnerRequest(url, { signal: null }, async () => reply({ success: true })), { success: true }); assert.equal(fake.timers.size, 0);
});
