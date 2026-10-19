// Standalone regression tests against installed TypeScript; no browser, network or credentials.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest);
};
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file,
}).outputText, file);

const { commercialRevenue, commercialDraftRevenue, parseCommercialUpdate, prepareCommercialDraftUpdate, commercialDraft, commercialDraftDirty, saveCommercialLead,
  createCommercialEditor, commercialEditorReducer: reduce } = require('../src/lib/commercial-update.ts');
const { parseCommercialLead, requestCommercialLead } = require('../src/lib/commercial-lookup.ts');
const fixture = Object.freeze({
  id: 'abcdef01-0000-4000-8000-000000000019', reference: 'EK-A1B2C3D4', status: 'contacted', package_key: 'premium',
  design: 'Lunaria', event_category: 'Boda', placement: 'catalogo', utm_source: 'qa', utm_medium: '', utm_campaign: '',
  referrer_host: '', revenue_bs: 200, notes: 'Nota inicial', created_at: '2026-10-19T10:00:00.000Z', updated_at: '2026-10-19T11:00:00.000Z', revision: 4,
});
const command = (extra = {}) => ({ id: fixture.id, requestId: 'abcdef02-0000-4000-8000-000000000019', expectedRevision: 4,
  status: 'reserved', revenueBs: 930, notes: 'QA resumen acordado', ...extra });
const savedLead = (update = command(), extra = {}) => ({ ...fixture, status: update.status, revenue_bs: update.revenueBs,
  notes: update.notes, revision: update.expectedRevision + 1, updated_at: '2026-10-19T12:00:00.000Z', ...extra });
const receipt = (extra = {}, update = command()) => ({ requestId: update.requestId, outcome: 'saved', lead: savedLead(update), ...extra });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const edit = (state, changes) => reduce(state, { type: 'edit', draft: { ...state.draft, ...changes } });
const start = (state, update = command()) => reduce(state, { type: 'start', request: update });
const received = (state, lead) => reduce(state, { type: 'receive', lead });
const settle = (state, result) => reduce(state, { type: 'result', result });

test('money accepts explicit empty values, zero and bounded cents without changing their meaning', () => {
  for (const value of ['', null]) assert.equal(commercialRevenue(value), null);
  for (const [value, expected] of [[0, 0], ['0.00', 0], ['000200.00', 200], ['0.01', 0.01], [930.5, 930.5], ['1000000.00', 1000000]]) {
    assert.equal(commercialRevenue(value), expected);
  }
});

test('money refuses coercion, exponent strings, nonfinite values and amounts with excess precision', () => {
  for (const value of [undefined, true, false, [], [200], {}, ' ', '1e3', '1E3', '+200', '-0', '-1', -0.01,
    '.50', '1.', '1,20', '1.001', 1.001, '1000000.01', 1000000.01, NaN, Infinity, -Infinity, 'NaN', 'Infinity']) {
    assert.equal(commercialRevenue(value), undefined, String(value));
  }
});

test('the update parser creates a canonical whitelisted command without carrying credentials', () => {
  const original = command({ id: fixture.id.toUpperCase(), requestId: command().requestId.toUpperCase(), revenueBs: '0930.00', notes: '  QA resumen acordado  ',
    session_hash: 'private-session', password: 'private-password', apiKey: 'private-key', design: 'forged design' });
  assert.deepEqual(parseCommercialUpdate(original), command());
  assert.equal(original.notes, '  QA resumen acordado  ');
  assert.equal(parseCommercialUpdate(command({ revenueBs: '' })).revenueBs, null);
  assert.equal(parseCommercialUpdate(command({ notes: 'x'.repeat(1000) })).notes.length, 1000);
});

test('the update parser rejects malformed fields instead of truncating or guessing intent', () => {
  for (const value of [null, [], {}, true, 'change', command({ id: 'bad' }), command({ requestId: 'bad' }),
    command({ expectedRevision: -1 }), command({ expectedRevision: 0.5 }), command({ expectedRevision: '4' }),
    command({ expectedRevision: true }), command({ expectedRevision: 2147483647 }), command({ status: ['reserved'] }),
    command({ status: 'paid' }), command({ notes: null }), command({ notes: ['nota'] }), command({ notes: 'x'.repeat(1001) }),
    command({ revenueBs: true }), command({ revenueBs: undefined })]) assert.equal(parseCommercialUpdate(value), null);
});

test('lead parsing keeps only public operational fields and requires a valid numeric revision', () => {
  const lead = parseCommercialLead({ ...fixture, revenue_bs: '200.00', session_hash: 'secret', api_key: 'private', landing_path: '/private' });
  assert.deepEqual(lead, fixture);
  for (const value of [null, [], {}, { ...fixture, revision: undefined }, { ...fixture, revision: '4' },
    { ...fixture, revision: -1 }, { ...fixture, revision: 1.5 }, { ...fixture, revision: 2147483648 },
    { ...fixture, notes: null }, { ...fixture, revenue_bs: true }, { ...fixture, status: 'paid' }]) assert.equal(parseCommercialLead(value), null);
});

test('one explicit save sends one canonical PATCH with private caching and the caller abort signal', async () => {
  let calls = 0;
  const controller = new AbortController();
  const input = command({ id: fixture.id.toUpperCase(), requestId: command().requestId.toUpperCase(), notes: ' QA resumen acordado ', revenueBs: '0930.00', apiKey: 'never-send' });
  const result = await saveCommercialLead(input, fixture.reference, async (url, options) => {
    calls++;
    assert.equal(url, '/api/admin/commercial');
    assert.equal(options.method, 'PATCH');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.signal, controller.signal);
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), command());
    return json(receipt());
  }, controller.signal);
  assert.equal(calls, 1);
  assert.equal(result.kind, 'confirmed');
  assert.equal(result.lead.notes, command().notes);
});

test('invalid commands perform no request and never report a successful save', async () => {
  let calls = 0;
  const result = await saveCommercialLead(command({ notes: 'x'.repeat(1001) }), fixture.reference, async () => { calls++; return json(receipt()); });
  assert.equal(result.kind, 'uncertain');
  assert.equal(calls, 0);
});

test('network failure never triggers an automatic second write or mutates the retained command', async () => {
  const input = Object.freeze(command());
  let calls = 0;
  const result = await saveCommercialLead(input, fixture.reference, async () => { calls++; throw new TypeError('offline'); });
  assert.equal(result.kind, 'uncertain');
  assert.equal(calls, 1);
  assert.deepEqual(input, command());
});

test('explicit recovery after a lost response replays exactly the same request and accepts its receipt', async () => {
  const bodies = [];
  const input = Object.freeze(command());
  const transport = async (_url, options) => {
    bodies.push(options.body);
    if (bodies.length === 1) throw new TypeError('connection lost after commit');
    return json(receipt({ outcome: 'replayed' }));
  };
  assert.equal((await saveCommercialLead(input, fixture.reference, transport)).kind, 'uncertain');
  const result = await saveCommercialLead(input, fixture.reference, transport);
  assert.equal(result.kind, 'confirmed');
  assert.equal(result.outcome, 'replayed');
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0], bodies[1]);
});

test('confirmed receipts require the exact revision transition for saved, unchanged and replayed intents', async () => {
  for (const [outcome, revision] of [['saved', 5], ['unchanged', 4], ['replayed', 4], ['replayed', 5]]) {
    const result = await saveCommercialLead(command(), fixture.reference, async () => json(receipt({ outcome, lead: savedLead(command(), { revision }) })));
    assert.equal(result.kind, 'confirmed', `${outcome}:${revision}`);
  }
});

test('borrowed identity, reference, request and mismatched saved fields cannot confirm another operation', async () => {
  for (const body of [receipt({ requestId: 'abcdef03-0000-4000-8000-000000000019' }),
    receipt({ lead: savedLead(command(), { id: 'abcdef03-0000-4000-8000-000000000019' }) }),
    receipt({ lead: savedLead(command(), { reference: 'EK-DEADBEEF' }) }),
    receipt({ lead: savedLead(command(), { status: 'won' }) }), receipt({ lead: savedLead(command(), { notes: 'Another note' }) }),
    receipt({ lead: savedLead(command(), { revenue_bs: 931 }) }), receipt({ lead: savedLead(command(), { revision: 4 }) }),
    receipt({ lead: savedLead(command(), { revision: 6 }) }), receipt({ lead: savedLead(command(), { revision: -1 }) }),
    receipt({ lead: savedLead(command(), { revision: '5' }) }), receipt({ lead: savedLead(command(), { revision: undefined }) }),
    receipt({ lead: savedLead(command(), { revision: 5.1 }) }), receipt({ outcome: 'invented' }),
    receipt({ outcome: 'unchanged', lead: savedLead() })]) {
    let calls = 0;
    const result = await saveCommercialLead(command(), fixture.reference, async () => { calls++; return json(body); });
    assert.equal(result.kind, 'uncertain');
    assert.equal(calls, 1);
  }
});

test('incomplete or unsuccessful replies preserve uncertainty and expose migration or session guidance', async () => {
  for (const body of ['{truncated', 'null', '[]', '{}', JSON.stringify(receipt({ lead: null }))]) {
    assert.equal((await saveCommercialLead(command(), fixture.reference, async () => new Response(body))).kind, 'uncertain');
  }
  const unauthorized = await saveCommercialLead(command(), fixture.reference, async () => json({ error: 'No autorizado' }, 401));
  assert.match(unauthorized.message, /sesión/);
  const migration = await saveCommercialLead(command(), fixture.reference, async () => json({ code: 'MIGRATION_REQUIRED' }, 503));
  assert.match(migration.message, /019/);
  assert.equal((await saveCommercialLead(command(), fixture.reference, async () => json(receipt(), 500))).kind, 'uncertain');
});

test('a valid CAS conflict exposes the current contact while malformed or borrowed conflicts stay uncertain', async () => {
  const current = savedLead(command(), { revision: 6, status: 'won', notes: 'Cambio en otro dispositivo' });
  const body = { code: 'REVISION_CONFLICT', requestId: command().requestId, lead: current };
  const result = await saveCommercialLead(command(), fixture.reference, async () => json(body, 409));
  assert.deepEqual(result, { kind: 'conflict', lead: current });
  for (const bad of [{ ...body, requestId: undefined }, { ...body, lead: { ...current, revision: 4 } },
    { ...body, lead: { ...current, reference: 'EK-DEADBEEF' } }, { ...body, lead: { ...current, id: command().requestId } },
    { ...body, code: 'REQUEST_REUSED' }]) {
    assert.equal((await saveCommercialLead(command(), fixture.reference, async () => json(bad, 409))).kind, 'uncertain');
  }
});

test('reference recovery makes a single exact private GET and never accepts a different contact reference', async () => {
  let calls = 0;
  const lead = await requestCommercialLead(' ek-a1b2c3d4 ', async (url, options) => {
    calls++; assert.equal(url, '/api/admin/commercial/lookup?reference=EK-A1B2C3D4'); assert.equal(options.cache, 'no-store'); return json({ lead: fixture });
  });
  assert.deepEqual(lead, fixture);
  assert.equal(calls, 1);
  await assert.rejects(requestCommercialLead(fixture.reference, async () => json({ lead: { ...fixture, reference: 'EK-DEADBEEF' } })), /corresponde/);
  assert.equal(await requestCommercialLead(fixture.reference, async () => json({ lead: null })), null);
});

test('initial and formatted amounts are clean until their semantic value or another field changes', () => {
  const state = createCommercialEditor(fixture);
  assert.equal(state.phase, 'editing');
  assert.equal(state.request, null);
  assert.equal(commercialDraftDirty(state.draft, fixture), false);
  assert.equal(commercialDraftDirty({ ...state.draft, revenue: '0200.00', notes: ' Nota inicial ' }, fixture), false);
  assert.equal(commercialDraftDirty({ ...state.draft, revenue: '200.01' }, fixture), true);
  assert.equal(commercialDraftDirty({ ...state.draft, revenue: '1e3' }, fixture), true);
  const noRevenue = { ...fixture, revenue_bs: null };
  assert.equal(commercialDraft(noRevenue).revenue, '');
  assert.equal(commercialDraftDirty(commercialDraft(noRevenue), noRevenue), false);
});

test('incoming edits cannot erase a dirty local draft and older or different contacts are ignored', () => {
  const dirty = edit(createCommercialEditor(fixture), { notes: 'Mi nota pendiente' });
  const newer = { ...fixture, revision: 5, status: 'reserved', revenue_bs: 400 };
  const conflicted = received(dirty, newer);
  assert.equal(conflicted.phase, 'conflict');
  assert.deepEqual(conflicted.draft, dirty.draft);
  assert.equal(conflicted.base.revision, 4);
  assert.deepEqual(conflicted.incoming, newer);
  for (const lead of [fixture, { ...fixture, revision: 3 }, { ...newer, revision: 4 }, { ...newer, id: command().requestId, revision: 99 }]) {
    assert.strictEqual(received(conflicted, lead), conflicted);
  }
});

test('a clean editor follows a newer contact without manufacturing unsaved changes', () => {
  const newer = { ...fixture, revision: 5, status: 'reserved', revenue_bs: 400, notes: 'Actualizada' };
  const state = received(createCommercialEditor(fixture), newer);
  assert.equal(state.phase, 'editing');
  assert.deepEqual(state.base, newer);
  assert.deepEqual(state.draft, commercialDraft(newer));
  assert.equal(commercialDraftDirty(state.draft, state.base), false);
});

test('explicit rebase carries only fields the user edited and adopts newer untouched values', () => {
  const newer = { ...fixture, revision: 5, status: 'won', revenue_bs: 930, notes: 'Otra nota' };
  const cases = [
    [{ notes: 'Mi nota' }, { status: 'won', revenue: '930', notes: 'Mi nota' }],
    [{ status: 'lost' }, { status: 'lost', revenue: '930', notes: 'Otra nota' }],
    [{ revenue: '450.00' }, { status: 'won', revenue: '450.00', notes: 'Otra nota' }],
  ];
  for (const [changes, expected] of cases) {
    const dirty = edit(createCommercialEditor(fixture), changes);
    const conflicted = received(dirty, newer);
    const rebased = reduce(conflicted, { type: 'rebase' });
    assert.equal(rebased.phase, 'editing');
    assert.deepEqual(rebased.base, newer);
    assert.deepEqual(rebased.draft, expected);
    assert.equal(rebased.request, null);
    assert.equal(rebased.incoming, null);
    assert.match(rebased.message, /aún no se guardaron/);
  }
});

test('discard replaces a dirty draft only after an explicit decision against a known current version', () => {
  const dirty = edit(createCommercialEditor(fixture), { notes: 'Mi nota' });
  assert.strictEqual(reduce(dirty, { type: 'discard' }), dirty);
  const newer = { ...fixture, revision: 5, notes: 'Nota del servidor' };
  const conflicted = received(dirty, newer);
  assert.equal(conflicted.draft.notes, 'Mi nota');
  const discarded = reduce(conflicted, { type: 'discard' });
  assert.equal(discarded.phase, 'editing');
  assert.deepEqual(discarded.base, newer);
  assert.deepEqual(discarded.draft, commercialDraft(newer));
  assert.equal(commercialDraftDirty(discarded.draft, discarded.base), false);
});

test('uncertainty retains the original operation and draft through edits, refresh and exact recovery', () => {
  const input = Object.freeze(command());
  const dirty = edit(createCommercialEditor(fixture), { status: input.status, revenue: '930', notes: input.notes });
  const saving = start(dirty, input);
  const uncertain = settle(saving, { kind: 'uncertain', message: 'Respuesta perdida' });
  for (const action of [{ type: 'edit', draft: { status: 'won', revenue: '1', notes: 'forged' } }, { type: 'rebase' }, { type: 'discard' }]) {
    assert.strictEqual(reduce(uncertain, action), uncertain);
  }
  const refreshed = received(uncertain, { ...fixture, revision: 6, notes: 'Nueva nota remota' });
  assert.deepEqual(refreshed.request, input);
  assert.deepEqual(refreshed.draft, dirty.draft);
  assert.equal(refreshed.phase, 'uncertain');
  const recovery = start(refreshed, input);
  assert.equal(recovery.phase, 'saving');
  assert.deepEqual(recovery.request, input);
  assert.deepEqual(recovery.draft, dirty.draft);
});

test('an unresolved operation cannot be replaced by a different write while checking its outcome', () => {
  const input = Object.freeze(command());
  const dirty = edit(createCommercialEditor(fixture), { status: input.status, revenue: '930', notes: input.notes });
  const saving = start(dirty, input);
  assert.equal(saving.phase, 'saving');
  const uncertain = settle(saving, { kind: 'uncertain', message: 'Respuesta perdida' });
  for (const state of [saving, uncertain]) {
    for (const replacement of [command({ requestId: fixture.id }), command({ notes: 'Otra intención' }), command({ expectedRevision: 5 })]) {
      const result = start(state, replacement);
      assert.deepEqual(result.request, input);
      assert.equal(result.request.requestId, input.requestId);
      assert.equal(result.request.notes, input.notes);
    }
  }
});

test('acknowledging an older successful receipt cannot overwrite a known later edit', () => {
  const current = { ...fixture, status: 'won', revision: 7, revenue_bs: 1200, notes: 'Edición posterior' };
  let state = start(edit(createCommercialEditor(fixture), { status: command().status, revenue: '930', notes: command().notes }), command());
  assert.equal(state.phase, 'saving');
  state = received(state, current);
  state = settle(state, { kind: 'confirmed', outcome: 'replayed', lead: savedLead() });
  assert.equal(state.phase, 'editing');
  assert.deepEqual(state.base, current);
  assert.deepEqual(state.draft, commercialDraft(current));
  assert.equal(state.request, null);
  assert.equal(state.incoming, null);
  assert.match(state.message, /cambios posteriores/);
  assert.strictEqual(received(state, savedLead()), state);
});

test('a conflict response preserves local intent and chooses the newest already-known version', () => {
  const input = command({ notes: 'Mi intención' });
  const dirty = edit(createCommercialEditor(fixture), { status: input.status, revenue: '930', notes: input.notes });
  const current = { ...fixture, revision: 7, notes: 'Más reciente' };
  let state = received(start(dirty, input), current);
  assert.equal(state.phase, 'saving');
  state = settle(state, { kind: 'conflict', lead: { ...fixture, revision: 6, notes: 'Anterior' } });
  assert.equal(state.phase, 'conflict');
  assert.deepEqual(state.draft, dirty.draft);
  assert.deepEqual(state.incoming, current);
  assert.equal(state.request, null);
  assert.equal(state.base.revision, 4);
});

test('explicit draft reset returns to canonical values but cannot cancel an uncertain write', () => {
  const dirty = edit(createCommercialEditor(fixture), { notes: 'Cambio local descartable' });
  const clean = reduce(dirty, { type: 'reset' });
  assert.deepEqual(clean.draft, commercialDraft(fixture));
  assert.equal(clean.request, null);
  const input = command();
  const saving = start(edit(createCommercialEditor(fixture), { status: input.status, revenue: '930', notes: input.notes }), input);
  const uncertain = settle(saving, { kind: 'uncertain', message: 'Sin respuesta' });
  assert.strictEqual(reduce(saving, { type: 'reset' }), saving);
  assert.strictEqual(reduce(uncertain, { type: 'reset' }), uncertain);
});

test('draft money accepts either decimal separator with the same bounded numeric meaning', () => {
  assert.equal(commercialDraftRevenue(''), null);
  for (const [text, expected] of [['0', 0], ['0,00', 0], ['0.00', 0], ['0,01', 0.01], ['0.01', 0.01],
    ['0200,00', 200], ['0200.00', 200], ['930,5', 930.5], ['930.5', 930.5], ['1000000,00', 1000000],
    ['1000000.00', 1000000], ['0'.repeat(13) + ',00', 0]]) {
    assert.equal(commercialDraftRevenue(text), expected, text);
  }
});

test('draft money refuses coercion, whitespace, ambiguous separators, incomplete text and excess precision', () => {
  for (const value of [null, undefined, true, false, 0, 930.5, [], ['200,00'], {}, NaN, Infinity,
    ' ', '\t', '\n', ' 200,00', '200,00 ', '2 00', '2\u00a0000', '1e3', '1E3', '+200', '-0', '-1',
    ',50', '.50', '1,', '1.', '1,,20', '1..20', '1,2.0', '1.2,0', '1,000', '1.000', '1.000,00',
    '1,000.00', '1000000,01', '1000000.01', '0'.repeat(14) + ',00', '0'.repeat(17)]) {
    assert.equal(commercialDraftRevenue(value), undefined, String(value));
  }
});

test('localized draft support never widens the server update contract to raw comma amounts', async () => {
  for (const text of ['0,00', '200,00', '930,50', '1000000,00']) {
    assert.equal(commercialRevenue(text), undefined);
    assert.equal(parseCommercialUpdate(command({ revenueBs: text })), null);
  }
  let calls = 0;
  const result = await saveCommercialLead(command({ revenueBs: '930,50' }), fixture.reference, async () => {
    calls++; return json(receipt());
  });
  assert.equal(result.kind, 'uncertain');
  assert.equal(calls, 0);
});

test('pasted line endings cannot be silently removed from draft or canonical revenue', () => {
  for (const suffix of ['\n', '\r', '\r\n', '\u2028', '\u2029', '\t', '\u00a0']) {
    for (const text of ['930,50', '930.50', '0', '1000000']) {
      const raw = text + suffix;
      assert.equal(commercialDraftRevenue(raw), undefined, JSON.stringify(raw));
      assert.equal(commercialRevenue(raw), undefined, JSON.stringify(raw));
      assert.equal(parseCommercialUpdate(command({ revenueBs: raw })), null);
      assert.equal(prepareCommercialDraftUpdate(fixture, { ...commercialDraft(fixture), revenue: raw }, command().requestId), null);
    }
  }
});

test('equivalent comma and point draft amounts do not manufacture edits', () => {
  for (const text of ['200', '200,0', '200,00', '0200,00', '200.0', '200.00']) {
    const state = edit(createCommercialEditor(fixture), { revenue: text });
    assert.equal(state.draft.revenue, text);
    assert.equal(commercialDraftDirty(state.draft, fixture), false, text);
  }
  for (const text of ['200,01', '0,00', '', '200,', '200,001']) {
    assert.equal(commercialDraftDirty({ ...commercialDraft(fixture), revenue: text }, fixture), true, text);
  }
});

test('zero localized revenue remains different from an explicitly empty amount', () => {
  const emptyBase = { ...fixture, revenue_bs: null };
  const zeroBase = { ...fixture, revenue_bs: 0 };
  assert.equal(commercialDraftDirty({ ...commercialDraft(emptyBase), revenue: '' }, emptyBase), false);
  assert.equal(commercialDraftDirty({ ...commercialDraft(emptyBase), revenue: '0,00' }, emptyBase), true);
  assert.equal(commercialDraftDirty({ ...commercialDraft(zeroBase), revenue: '0,00' }, zeroBase), false);
  assert.equal(commercialDraftDirty({ ...commercialDraft(zeroBase), revenue: '' }, zeroBase), true);
  assert.equal(prepareCommercialDraftUpdate(emptyBase, { ...commercialDraft(emptyBase), revenue: '' }, command().requestId).revenueBs, null);
  assert.equal(prepareCommercialDraftUpdate(zeroBase, { ...commercialDraft(zeroBase), revenue: '0,00' }, command().requestId).revenueBs, 0);
});

test('a clean comma-formatted editor follows newer server data without a false conflict', () => {
  const state = edit(createCommercialEditor(fixture), { revenue: '0200,00' });
  const newer = { ...fixture, revenue_bs: 400.5, revision: 5, notes: 'Edición remota' };
  const next = received(state, newer);
  assert.equal(next.phase, 'editing');
  assert.deepEqual(next.base, newer);
  assert.deepEqual(next.draft, commercialDraft(newer));
  assert.equal(next.request, null);
  assert.equal(commercialDraftDirty(next.draft, newer), false);
});

test('rebase adopts untouched equivalent comma money but preserves a real localized amount edit', () => {
  const newer = { ...fixture, revenue_bs: 930.5, status: 'won', notes: 'Nota remota', revision: 5 };
  const equivalent = edit(createCommercialEditor(fixture), { revenue: '200,00', notes: 'Mi nota pendiente' });
  const equivalentRebase = reduce(received(equivalent, newer), { type: 'rebase' });
  assert.deepEqual(equivalentRebase.draft, { status: 'won', revenue: '930.5', notes: 'Mi nota pendiente' });
  const changed = edit(createCommercialEditor(fixture), { revenue: '450,50' });
  const changedRebase = reduce(received(changed, newer), { type: 'rebase' });
  assert.deepEqual(changedRebase.draft, { status: 'won', revenue: '450,50', notes: 'Nota remota' });
  assert.equal(changedRebase.request, null);
  assert.equal(commercialDraftRevenue(changedRebase.draft.revenue), 450.5);
});

test('incomplete or invalid localized revenue survives edits and conflict rebase without rounding or erasure', () => {
  const newer = { ...fixture, revision: 5, revenue_bs: 400, notes: 'Nota remota' };
  for (const text of ['12,', '12.', '12,345', ' 12,50', '-12,50', '1,000.00']) {
    const state = edit(createCommercialEditor(fixture), { revenue: text });
    assert.equal(state.draft.revenue, text);
    const conflict = received(state, newer);
    assert.equal(conflict.phase, 'conflict');
    assert.equal(conflict.draft.revenue, text);
    const rebased = reduce(conflict, { type: 'rebase' });
    assert.equal(rebased.draft.revenue, text);
    assert.equal(commercialDraftRevenue(rebased.draft.revenue), undefined);
    assert.equal(commercialDraftDirty(rebased.draft, newer), true);
    assert.equal(rebased.request, null);
  }
});

test('a localized draft starts only its canonical command while retaining the exact displayed text', () => {
  const input = Object.freeze(command({ revenueBs: 930.5 }));
  const state = edit(createCommercialEditor(fixture), { status: input.status, revenue: '0930,50', notes: ' QA resumen acordado ' });
  const next = start(state, input);
  assert.equal(next.phase, 'saving');
  assert.deepEqual(next.request, input);
  assert.deepEqual(next.draft, state.draft);
  assert.equal(next.draft.revenue, '0930,50');
  assert.equal(next.request.revenueBs, 930.5);
  assert.equal(next.request.requestId, input.requestId);
  assert.deepEqual(input, command({ revenueBs: 930.5 }));
});

test('the reducer rejects guessed amounts and raw comma commands before a save starts', () => {
  const state = edit(createCommercialEditor(fixture), { status: 'reserved', revenue: '930,50', notes: command().notes });
  for (const input of [command({ revenueBs: 930 }), command({ revenueBs: null }), command({ revenueBs: '930,50' })]) {
    assert.strictEqual(start(state, input), state);
  }
  for (const text of ['930,', '930,501', ' 930,50', '1e3']) {
    const invalid = edit(state, { revenue: text });
    assert.strictEqual(start(invalid, command({ revenueBs: 930.5 })), invalid);
    assert.equal(invalid.draft.revenue, text);
    assert.equal(invalid.request, null);
    assert.equal(prepareCommercialDraftUpdate(invalid.base, invalid.draft, command().requestId), null);
  }
});

test('a localized draft sends one numeric JSON amount rather than a comma string', async () => {
  const raw = '0930,50';
  const draft = Object.freeze({ ...commercialDraft(fixture), status: command().status, revenue: raw, notes: ' QA resumen acordado ' });
  const update = prepareCommercialDraftUpdate(fixture, draft, command().requestId.toUpperCase());
  assert.ok(update);
  let calls = 0;
  const result = await saveCommercialLead(update, fixture.reference, async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    assert.equal(typeof body.revenueBs, 'number');
    assert.equal(body.revenueBs, 930.5);
    assert.deepEqual(body, command({ revenueBs: 930.5 }));
    return json(receipt({}, update));
  });
  assert.equal(calls, 1);
  assert.equal(result.kind, 'confirmed');
  assert.equal(result.lead.revenue_bs, 930.5);
  assert.equal(raw, '0930,50');
  assert.equal(draft.revenue, raw);
  assert.equal(draft.notes, ' QA resumen acordado ');
  for (const invalid of [{ ...draft, notes: 'x'.repeat(1001) }, { ...draft, status: 'paid' }]) {
    assert.equal(prepareCommercialDraftUpdate(fixture, invalid, command().requestId), null);
  }
  assert.equal(prepareCommercialDraftUpdate(fixture, draft, 'bad'), null);
  assert.equal(prepareCommercialDraftUpdate({ ...fixture, revision: -1 }, draft, command().requestId), null);
});

test('rechecking an uncertain localized save retains its UUID and exact canonical body', async () => {
  const input = Object.freeze(prepareCommercialDraftUpdate(fixture, { status: command().status, revenue: '930,50', notes: command().notes }, command().requestId));
  let state = start(edit(createCommercialEditor(fixture), { status: input.status, revenue: '930,50', notes: input.notes }), input);
  const bodies = [];
  const transport = async (_url, options) => {
    bodies.push(options.body);
    if (bodies.length === 1) throw new TypeError('lost receipt');
    return json(receipt({ outcome: 'replayed' }, input));
  };
  state = settle(state, await saveCommercialLead(state.request, fixture.reference, transport));
  assert.equal(state.phase, 'uncertain');
  assert.strictEqual(edit(state, { revenue: '1000,00' }), state);
  assert.strictEqual(start(state, command({ revenueBs: 930.5, requestId: fixture.id })), state);
  assert.strictEqual(start(state, command({ revenueBs: 930.51 })), state);
  const retained = state.request;
  state = start(state, retained);
  assert.deepEqual(state.request, input);
  assert.equal(state.draft.revenue, '930,50');
  state = settle(state, await saveCommercialLead(state.request, fixture.reference, transport));
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0], bodies[1]);
  assert.equal(JSON.parse(bodies[1]).requestId, input.requestId);
  assert.equal(JSON.parse(bodies[1]).revenueBs, 930.5);
  assert.equal(state.phase, 'editing');
  assert.equal(state.base.revenue_bs, 930.5);
  assert.equal(state.request, null);
});

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const CommercialLeadEditor = require('../src/components/admin/CommercialLeadEditor.tsx').default;
const renderEditor = (extra = {}) => renderToStaticMarkup(React.createElement(CommercialLeadEditor, {
  lead: { ...fixture, ...extra }, onSaved: () => assert.fail('SSR must not save a contact'),
  transport: async () => assert.fail('SSR must not send a request'),
}));
const revenueControl = html => html.match(/<input\b[^>]*\bname="lead-revenue"[^>]*>/)?.[0] ?? '';

test('the real editor renders a decimal text keyboard without browser numeric coercion', () => {
  const input = revenueControl(renderEditor());
  assert.ok(input);
  assert.match(input, /\btype="text"/);
  assert.match(input, /\binputMode="decimal"/);
  assert.match(input, /\bmaxLength="16"/);
  assert.match(input, /\bautoComplete="off"/);
  assert.match(input, /\bvalue="200"/);
  assert.match(input, /\bplaceholder="Ej\. 930,50…"/);
  assert.doesNotMatch(input, /\btype="number"|\bstep=|\bmin=/);
});

test('the real editor connects revenue guidance and the manual income explanation accessibly', () => {
  const html = renderEditor();
  const input = revenueControl(html);
  const id = input.match(/\bid="([^"]+)-revenue"/)?.[1];
  assert.ok(id);
  const description = input.match(/\baria-describedby="([^"]+)"/)?.[1].split(' ');
  assert.ok(description.includes(`${id}-revenue-hint`));
  assert.ok(description.includes(`${id}-help`));
  assert.ok(html.includes(`id="${id}-revenue-hint"`));
  assert.match(html, /Usa coma o punto decimal/);
  assert.match(html, /hasta dos decimales y sin separadores de miles/);
  assert.match(html, /Vacío retira el ingreso registrado/);
  assert.match(html, /Este formulario no procesa cobros/);
  assert.match(input, /aria-invalid="false"/);
});

test('the real editor displays registered zero and an empty revenue distinctly without pending writes', () => {
  for (const [revenue_bs, expected] of [[0, '0'], [null, '']]) {
    const html = renderEditor({ revenue_bs });
    assert.ok(revenueControl(html).includes(`value="${expected}"`));
    const submit = html.match(/<button\b[^>]*\btype="submit"[^>]*>/)?.[0] ?? '';
    assert.match(submit, /\sdisabled(?:=|[\s>])/);
    assert.doesNotMatch(html, /Comprobar guardado|Descartar cambios…|Guardando el contacto/);
  }
});
