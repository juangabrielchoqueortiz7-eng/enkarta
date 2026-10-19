// Private page-navigation contracts. No browser, credentials or real network.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) { return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest); };
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: file }).outputText, file);
const { initialCommercialLocation, createCommercialNavigation, commercialNavigationReducer: reduce, commercialRetryLocation: retry } = require('../src/lib/commercial-navigation.ts');
const { requestCommercialDashboard, decodeCommercialCursor } = require('../src/lib/commercial-dashboard.ts');
const anchor = '2026-10-19T12:00:00.123456Z';
const cursor = { asOf: anchor, createdAt: '2026-10-18T12:00:00.654321Z', id: '30000000-0000-4000-8000-000000000099', status: 'all' };
const prior = { ...cursor, createdAt: anchor, id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' };
const pageOne = () => ({ query: { status: 'all', cursor: null }, index: 0, previous: [] });
const pageTwo = () => ({ query: { status: 'all', cursor: { ...cursor } }, index: 1, previous: [{ ...prior }] });
function dashboard(status = 'all') {
  const group = [{ label: 'QA ficticio', opens: 0, contacts: 0, sales: 0 }];
  return {
    periodDays: 180, asOf: anchor, syncedAt: anchor,
    summary: { visits: 12, landingViews: 12, designViews: 0, processViews: 0, whatsappOpens: 0, contacts: 0, reserved: 0, sales: 0, revenue: 0, intentRate: 0, conversationRate: 0, closeRate: 0 },
    sources: group, campaigns: group, packages: group, events: group, designs: group,
    statuses: ['whatsapp_open', 'contacted', 'reserved', 'won', 'lost'].map(status => ({ status, label: status, value: 0 })),
    leads: [], pagination: { size: 25, total: 0, hasMore: false, nextCursor: null },
  };
}
function loaded(location = pageOne(), data = dashboard()) {
  const started = reduce(createCommercialNavigation(), { type: 'start', sequence: 1, target: location });
  return reduce(started, { type: 'loaded', sequence: 1, data });
}

test('initial navigation exposes no invented metrics and uses independent location snapshots', () => {
  const first = createCommercialNavigation(), second = createCommercialNavigation();
  assert.deepEqual(initialCommercialLocation(), pageOne());
  assert.equal(first.data, null); assert.equal(first.failed, null); assert.equal(first.error, ''); assert.equal(first.sequence, 0);
  assert.deepEqual(first.location, pageOne()); assert.deepEqual(first.pending, pageOne());
  first.location.previous.push(cursor);
  assert.deepEqual(first.pending, pageOne()); assert.deepEqual(second.location, pageOne());
  assert.deepEqual(initialCommercialLocation(), pageOne());
});

test('a successful request replaces the displayed page only after its matching result', () => {
  const old = loaded(), target = pageTwo(), data = dashboard();
  const pending = reduce(old, { type: 'start', sequence: 2, target });
  assert.equal(pending.data, old.data); assert.equal(pending.location, old.location); assert.deepEqual(pending.pending, target);
  const complete = reduce(pending, { type: 'loaded', sequence: 2, data });
  assert.equal(complete.data, data); assert.deepEqual(complete.location, target);
  assert.equal(complete.pending, null); assert.equal(complete.failed, null); assert.equal(complete.error, '');
});

test('a failed next page retains visible data and retries the exact cutoff, cursor and history', () => {
  const old = loaded(), target = pageTwo();
  const failed = reduce(reduce(old, { type: 'start', sequence: 2, target }), { type: 'failed', sequence: 2, message: 'Sin conexión' });
  assert.equal(failed.data, old.data); assert.equal(failed.location, old.location); assert.equal(failed.pending, null);
  assert.equal(failed.error, 'Sin conexión'); assert.deepEqual(retry(failed), target);
  assert.equal(retry(failed).query.cursor.asOf, anchor); assert.equal(retry(failed).query.cursor.createdAt, cursor.createdAt);
  assert.deepEqual(retry(failed).previous, [prior]);
  const restarted = reduce(failed, { type: 'start', sequence: 3, target: retry(failed) });
  assert.deepEqual(restarted.pending, target); assert.equal(restarted.failed, null); assert.equal(restarted.error, '');
});

test('a failed previous-page request never retries the still-visible later page', () => {
  const old = loaded(pageTwo()), target = { query: { status: 'all', cursor: { ...prior } }, index: 0, previous: [] };
  const failed = reduce(reduce(old, { type: 'start', sequence: 2, target }), { type: 'failed', sequence: 2, message: 'Consulta incompleta' });
  assert.equal(failed.location.index, 1); assert.equal(retry(failed).index, 0);
  assert.deepEqual(retry(failed), target); assert.deepEqual(retry(failed).query.cursor, prior);
});

test('a failed filter retains the old view while its retry uses the newly selected filter', () => {
  const old = loaded(pageTwo()), target = { query: { status: 'lost', cursor: null }, index: 0, previous: [] };
  const failed = reduce(reduce(old, { type: 'start', sequence: 2, target }), { type: 'failed', sequence: 2, message: 'Sin conexión' });
  assert.equal(failed.location.query.status, 'all'); assert.equal(failed.data, old.data);
  assert.deepEqual(retry(failed), target);
  const complete = reduce(reduce(failed, { type: 'start', sequence: 3, target: retry(failed) }), { type: 'loaded', sequence: 3, data: dashboard('lost') });
  assert.equal(complete.location.query.status, 'lost'); assert.equal(complete.location.index, 0);
});

test('an initial failure remains retryable without manufacturing a successful page', () => {
  const pending = reduce(createCommercialNavigation(), { type: 'start', sequence: 1, target: pageOne() });
  const failed = reduce(pending, { type: 'failed', sequence: 1, message: 'SQL pendiente' });
  assert.equal(failed.data, null); assert.equal(failed.pending, null); assert.deepEqual(retry(failed), pageOne());
  const recovered = reduce(reduce(failed, { type: 'start', sequence: 2, target: retry(failed) }), { type: 'loaded', sequence: 2, data: dashboard() });
  assert.ok(recovered.data); assert.equal(recovered.failed, null); assert.equal(recovered.error, '');
});

test('starting a load snapshots the query, cursor and every previous-page cursor', () => {
  const target = pageTwo(), expected = structuredClone(target);
  target.previous.push(null);
  expected.previous.push(null);
  const pending = reduce(loaded(), { type: 'start', sequence: 2, target });
  target.query.status = 'lost'; target.query.cursor.asOf = '2027-01-01T00:00:00.000000Z';
  target.previous[0].id = '40000000-0000-4000-8000-000000000001'; target.previous.push(cursor); target.index = 20;
  assert.deepEqual(pending.pending, expected);
  const failed = reduce(pending, { type: 'failed', sequence: 2, message: 'Falló' });
  assert.deepEqual(retry(failed), expected);
});

test('out-of-order success and abort failures cannot replace a newer destination or error', () => {
  const first = reduce(loaded(), { type: 'start', sequence: 2, target: pageTwo() });
  const target = { query: { status: 'won', cursor: null }, index: 0, previous: [] };
  const second = reduce(first, { type: 'start', sequence: 3, target });
  assert.equal(reduce(second, { type: 'loaded', sequence: 2, data: dashboard() }), second);
  assert.equal(reduce(second, { type: 'failed', sequence: 2, message: 'La carga cancelada agotó su tiempo' }), second);
  const failed = reduce(second, { type: 'failed', sequence: 3, message: 'Error actual' });
  assert.equal(reduce(failed, { type: 'failed', sequence: 2, message: 'Error anterior' }), failed);
  assert.deepEqual(retry(failed), target); assert.equal(failed.error, 'Error actual');
});

test('duplicate or stale starts and settled results do not reopen a completed request', () => {
  const state = loaded();
  for (const sequence of [0, 1, -1, NaN, Infinity, 1.5]) assert.equal(reduce(state, { type: 'start', sequence, target: pageTwo() }), state);
  assert.equal(reduce(state, { type: 'loaded', sequence: 1, data: dashboard() }), state);
  assert.equal(reduce(state, { type: 'failed', sequence: 1, message: 'Respuesta duplicada' }), state);
});

test('refresh explicitly resets pagination while a failed or aborted refresh retries that reset', () => {
  const state = loaded(pageTwo()), refresh = { query: { status: state.location.query.status, cursor: null }, index: 0, previous: [] };
  assert.equal(retry(state), state.location);
  const failed = reduce(reduce(state, { type: 'start', sequence: 2, target: refresh }), { type: 'failed', sequence: 2, message: 'Tiempo agotado' });
  assert.equal(failed.location.index, 1); assert.deepEqual(retry(failed), refresh);
  const pending = reduce(failed, { type: 'start', sequence: 3, target: retry(failed) });
  assert.deepEqual(pending.pending, refresh); assert.equal(pending.data, state.data);
});

test('retry uses the exact private GET URL without an automatic transport retry', async () => {
  let state = loaded(); const target = pageTwo(), urls = [];
  const transport = async (url, options) => { urls.push(String(url)); assert.equal(options.cache, 'no-store'); if (urls.length === 1) throw new TypeError('QA sin conexión'); return Response.json(dashboard()); };
  state = reduce(state, { type: 'start', sequence: 2, target });
  await assert.rejects(requestCommercialDashboard(target.query, transport), /Revisa tu conexión/);
  assert.equal(urls.length, 1);
  state = reduce(state, { type: 'failed', sequence: 2, message: 'Sin conexión' });
  const destination = retry(state); state = reduce(state, { type: 'start', sequence: 3, target: destination });
  const response = await requestCommercialDashboard(destination.query, transport);
  state = reduce(state, { type: 'loaded', sequence: 3, data: response });
  assert.equal(urls.length, 2); assert.equal(urls[1], urls[0]);
  const query = new URL(urls[1], 'https://qa.invalid').searchParams;
  assert.equal(query.get('status'), 'all'); assert.deepEqual(decodeCommercialCursor(query.get('cursor')), cursor);
  assert.deepEqual(state.location, target); assert.equal(state.failed, null);
});
