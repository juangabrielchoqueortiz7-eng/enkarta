// Real hydration/version helpers with controlled fetch and storage. No production, browser or bank traffic.
const fs = require('node:fs'), ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
const versions = require('../src/lib/builder-versions.ts');
const VERSION_KEY = 'enkarta_builder_versions_v1', NOTE_KEY = 'enkarta_builder_review_notes_v1';
const id = '30000000-0000-4000-8000-000000000001', otherId = '30000000-0000-4000-8000-000000000002';
const data = (invitationId = id, names = 'QA current draft') => ({ id: invitationId, slug: 'qa-hydration', names, config: { layout: { blocks: [] } } });
const version = (invitationId = id, patch = {}) => ({ id: 'version-qa-initial', invitationId, label: 'QA local version', createdAt: 1, source: 'manual', data: data(invitationId), ...patch });
const note = (invitationId = id, patch = {}) => ({ id: 'note-qa-initial', invitationId, text: 'QA original note', author: 'QA', role: 'admin', status: 'pending', resolved: false, createdAt: 1, ...patch });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
async function isolated(scenario, { localVersions = [], localNotes = [], reply } = {}) {
  const oldWindow = global.window, oldFetch = global.fetch, values = new Map([[VERSION_KEY, JSON.stringify(localVersions)], [NOTE_KEY, JSON.stringify(localNotes)]]), writes = [], requests = [];
  global.window = { localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes.push({ key, value }); values.set(key, value); }, removeItem: key => values.delete(key) } };
  global.fetch = async (url, init = {}) => {
    assert.ok(url === '/api/admin/builder-state' || String(url).startsWith('/api/admin/builder-state?'), 'No external or unrelated request is allowed');
    const request = { url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : null, cache: init.cache }; requests.push(request);
    return reply ? reply(request) : Response.json(request.method === 'GET' ? { versions: [], notes: [] } : { success: true });
  };
  try { await scenario({ values, writes, requests }); }
  finally { if (oldWindow === undefined) delete global.window; else global.window = oldWindow; global.fetch = oldFetch; }
}

test('an acknowledged publication survives an earlier GET returning an empty history and is not migrated again', async () => {
  const read = deferred();
  await isolated(async scope => {
    const pending = versions.hydrateBuilderState(id);
    const confirmed = await versions.persistBuilderVersion(data(), 'QA confirmed publication', 'publish', '', 'admin', 'publish', { publicationState: 'published' });
    assert.equal(versions.listBuilderVersions(id).some(value => value.id === confirmed.version.id), true);
    const before = scope.values.get(VERSION_KEY), writes = scope.writes.length;
    read.resolve(Response.json({ versions: [], notes: [] })); const result = await pending;
    assert.equal(result.cloud, false); assert.deepEqual(result.versions.map(value => value.id), [confirmed.version.id]);
    assert.equal(scope.values.get(VERSION_KEY), before); assert.equal(scope.writes.length, writes);
    assert.equal(scope.requests.filter(value => value.method === 'POST').length, 1);
  }, { reply: request => request.method === 'GET' ? read.promise : Response.json({ success: true }) });
});

test('a note edited or deleted during hydration is neither reverted nor re-uploaded from the old captured copy', async () => {
  for (const action of ['edit', 'delete']) {
    const read = deferred(), original = note();
    await isolated(async scope => {
      const pending = versions.hydrateBuilderState(id);
      if (action === 'edit') versions.patchReviewNote(id, original.id, { text: 'QA newer note' }); else versions.deleteReviewNote(id, original.id);
      const before = scope.values.get(NOTE_KEY), writes = scope.writes.length;
      read.resolve(Response.json({ versions: [], notes: [original] })); const result = await pending;
      assert.equal(result.cloud, false); assert.equal(scope.values.get(NOTE_KEY), before); assert.equal(scope.writes.length, writes);
      assert.deepEqual(result.notes.map(value => value.text), action === 'edit' ? ['QA newer note'] : []);
      assert.equal(scope.requests.length, 2); assert.equal(scope.requests[1].method, action === 'edit' ? 'PATCH' : 'DELETE');
      assert.equal(scope.requests.some(value => value.method === 'POST'), false);
    }, { localNotes: [original], reply: request => request.method === 'GET' ? read.promise : Response.json({ success: true }) });
  }
});

test('a newer local checkpoint is preserved when a stale body finishes after its GET headers', async () => {
  const body = deferred();
  await isolated(async scope => {
    const pending = versions.hydrateBuilderState(id); await new Promise(done => setImmediate(done));
    const added = versions.saveBuilderVersion(data(id, 'QA newer checkpoint'), 'QA new checkpoint', 'manual');
    const before = scope.values.get(VERSION_KEY), writes = scope.writes.length;
    body.resolve({ versions: [], notes: [] }); const result = await pending;
    assert.equal(result.cloud, false); assert.deepEqual(result.versions, JSON.parse(JSON.stringify(added))); assert.equal(scope.values.get(VERSION_KEY), before); assert.equal(scope.writes.length, writes);
    assert.equal(scope.requests.filter(value => value.method === 'POST').length, 1);
  }, { localVersions: [version()], reply: request => request.method === 'GET' ? { ok: true, json: () => body.promise } : Response.json({ success: true }) });
});

test('an unchanged mirror accepts fresh cloud data and migrates only the current nonpublication drafts and notes', async () => {
  const local = version(), oldPublished = version(id, { id: 'version-qa-old-publication', source: 'publish' }), localNote = note();
  const confirmed = version(id, { id: 'version-qa-cloud-publication', source: 'publish', publicationState: 'published', createdAt: 3 });
  await isolated(async scope => {
    const result = await versions.hydrateBuilderState(id);
    assert.equal(result.cloud, true); assert.deepEqual(result.versions.map(value => value.id), [confirmed.id, local.id]); assert.deepEqual(result.notes, [localNote]);
    assert.deepEqual(versions.listBuilderVersions(id), result.versions); assert.deepEqual(versions.listReviewNotes(id), result.notes);
    const writes = scope.requests.filter(value => value.method === 'POST'); assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].body, { invitationId: id, versions: [local], notes: [localNote] });
    assert.equal(scope.requests[0].cache, 'no-store'); assert.equal(JSON.stringify(scope.requests).includes('SUPABASE'), false);
  }, { localVersions: [local, oldPublished], localNotes: [localNote], reply: request => Response.json(request.method === 'GET' ? { versions: [confirmed], notes: [] } : { success: true }) });
});

test('changing another invitation does not invalidate the requested read or erase that other invitation mirror', async () => {
  const read = deferred(), foreignNote = note(otherId, { id: 'note-qa-other' }), cloudVersion = version(id, { id: 'version-qa-fresh-cloud' });
  await isolated(async scope => {
    const pending = versions.hydrateBuilderState(id);
    versions.patchReviewNote(otherId, foreignNote.id, { text: 'QA newer unrelated note' });
    read.resolve(Response.json({ versions: [cloudVersion], notes: [] })); const result = await pending;
    assert.equal(result.cloud, true); assert.deepEqual(result.versions, [cloudVersion]); assert.deepEqual(result.notes, []);
    assert.equal(versions.listReviewNotes(otherId)[0].text, 'QA newer unrelated note'); assert.deepEqual(versions.listBuilderVersions(otherId), [version(otherId)]);
    assert.equal(scope.requests.filter(value => value.method === 'POST').length, 0);
  }, { localVersions: [version(otherId)], localNotes: [foreignNote], reply: request => request.method === 'GET' ? read.promise : Response.json({ success: true }) });
});

test('a failed read returns the latest local note state rather than its pre-request snapshot', async () => {
  const read = deferred();
  await isolated(async scope => {
    const pending = versions.hydrateBuilderState(id); versions.patchReviewNote(id, note().id, { text: 'QA note after failed read began' });
    const before = scope.values.get(NOTE_KEY), writes = scope.writes.length; read.reject(Error('QA controlled offline')); const result = await pending;
    assert.equal(result.cloud, false); assert.equal(result.notes[0].text, 'QA note after failed read began'); assert.equal(scope.values.get(NOTE_KEY), before); assert.equal(scope.writes.length, writes);
    assert.equal(scope.requests.filter(value => value.method === 'POST').length, 0);
  }, { localNotes: [note()], reply: request => request.method === 'GET' ? read.promise : Response.json({ success: true }) });
});
