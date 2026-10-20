// Real InvitationBuilder history handlers; child panels and persistence are inert.
// This suite checks the upload revision contract only, without DOM, storage or network.
'use strict';
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript'), test = require('node:test'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'), originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest);
};
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const React = require('react'), panels = {}, timersEnabled = new WeakSet();
const replace = (file, exports) => { require.cache[require.resolve(file)] = { exports }; };
replace('next/navigation', { useRouter: () => ({ push() {}, replace() {}, refresh() {} }) });
for (const name of ['LivePreview', 'ContentPanel', 'StylePanel', 'MediaPanel', 'ConfigPanel', 'DecorPanel', 'MotionPanel', 'BlockEditorPanel', 'ElementsPanel', 'GuestsPanel', 'ExportPanel', 'VersionsPanel', 'QualityControlPanel']) {
  panels[name] = () => null;
  replace('../src/components/admin/builder/' + (name === 'LivePreview' ? '' : 'panels/') + name + '.tsx', { __esModule: true, default: panels[name] });
}
replace('../src/components/invitations/blocks/registry.tsx', { cloneBlock: block => ({ ...block, id: 'qa-history-copy' }) });
let persistence;
replace('../src/lib/builder-versions.ts', {
  activePublishedVersion: () => null, nextScheduledVersion: () => null,
  hydrateBuilderState: async () => ({ versions: [], notes: [] }),
  saveBuilderVersion: (...args) => { persistence.saves.push(args); return []; },
  persistBuilderVersion: async (data, label, source, summary, role, action) => {
    const request = { data, label, source, summary, role, action }; persistence.versions.push(request);
    if (persistence.persist) await persistence.persist(request);
    const version = { id: 'qa-upload-history-version-' + persistence.versions.length, invitationId: data.id, data, label, source, summary, role, createdAt: 1 };
    return { version, versions: [version] };
  },
});
const file = path.join(root, 'src/components/admin/builder/InvitationBuilder.tsx');
const source = process.argv.includes('--baseline') ? execFileSync('git', ['-c', 'core.fsmonitor=false', 'show', 'ce39b9b:src/components/admin/builder/InvitationBuilder.tsx'], { cwd: root, encoding: 'utf8' }) : fs.readFileSync(file, 'utf8');
const compiled = new Module(file, module); compiled.filename = file; compiled.paths = module.paths;
compiled._compile(ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
const Builder = compiled.exports.default, { marfilVivoDemo } = require('../src/lib/marfil-vivo.ts'), { newServiceContract } = require('../src/lib/packages.ts');
const copy = value => JSON.parse(JSON.stringify(value));
const fixture = () => ({ ...marfilVivoDemo(), id: '61000000-0000-4000-8000-000000000001', slug: 'qa-upload-history', names: 'QA historia actual', draft_revision: 0, validity_mode: 'automatic', validity_extra_days: 0, validity_revision: 0 });
const nodes = (element, predicate) => !React.isValidElement(element) ? [] : [...(predicate(element) ? [element] : []), ...React.Children.toArray(element.props.children).flatMap(child => nodes(child, predicate))];
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(text).join(' ') : React.isValidElement(value) ? text(value.props.children) : '';
const panel = (runner, name) => { const found = nodes(runner.current(), node => node.type === panels[name])[0]; assert.ok(found, 'Expected actual builder boundary ' + name); return found; };
const button = (runner, label) => { const found = nodes(runner.current(), node => node.type === 'button' && text(node).trim() === label)[0]; assert.ok(found, 'Expected button ' + label); return found; };
const history = (runner, redo = false) => { const found = nodes(runner.current(), node => node.type === 'button' && node.props.title === (redo ? 'Rehacer (Ctrl+Shift+Z)' : 'Deshacer (Ctrl+Z)'))[0]; assert.ok(found); return found; };
const press = async (runner, label) => { const pending = button(runner, label).props.onClick(); await runner.flush(); return { pending }; };
const blocks = async runner => { if (!nodes(runner.current(), node => node.type === panels.BlockEditorPanel).length) { if (nodes(runner.current(), node => node.type === 'button' && text(node).trim() === 'Más herramientas').length) await press(runner, 'Más herramientas'); await press(runner, 'Bloques'); } return panel(runner, 'BlockEditorPanel'); };
const revision = async runner => { const value = (await blocks(runner)).props.editingRevision; assert.ok(value && typeof value.current === 'number', 'BlockEditorPanel must receive the live editingRevision ref'); return value; };
const draft = runner => panel(runner, 'LivePreview').props.invitation;

async function withBuilder(t, scenario, { initial = fixture(), persist } = {}) {
  if (!timersEnabled.has(t)) { t.mock.timers.enable({ apis: ['setTimeout'] }); timersEnabled.add(t); }
  const hookNames = ['useState', 'useRef', 'useEffect', 'useMemo', 'useCallback'], original = Object.fromEntries(hookNames.map(name => [name, React[name]]));
  const globals = Object.fromEntries(['window', 'document', 'fetch', 'alert', 'confirm', 'navigator'].map(name => [name, Object.getOwnPropertyDescriptor(global, name)]));
  const slots = [], requests = [], alerts = [], local = new Map(); let cursor = 0, dirty = true, tree, effects = [], unmounted = false, lateWrites = 0, storedRevision = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  React.useState = initial => { const index = cursor++; if (!(index in slots)) { const slot = slots[index] = { value: typeof initial === 'function' ? initial() : initial }; slot.set = next => { if (unmounted) { lateWrites++; return; } next = typeof next === 'function' ? next(slot.value) : next; if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; } }; } return [slots[index].value, slots[index].set]; };
  React.useRef = initial => { const index = cursor++; return slots[index] ?? (slots[index] = { current: initial }); };
  React.useMemo = (compute, deps) => { const index = cursor++; if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { deps, value: compute() }; return slots[index].value; };
  React.useCallback = (callback, deps) => React.useMemo(() => callback, deps);
  React.useEffect = (effect, deps) => { const index = cursor++, previous = slots[index]; if (!previous || !same(previous.deps, deps)) { const slot = slots[index] = { deps, cleanup: previous?.cleanup }; effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); }); } };
  global.window = { innerWidth: 390, addEventListener() {}, removeEventListener() {}, confirm: () => true, localStorage: { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value), removeItem: key => local.delete(key) } };
  global.document = { getElementById: () => null }; global.alert = value => alerts.push(value); global.confirm = () => true;
  Object.defineProperty(global, 'navigator', { configurable: true, value: { onLine: true } });
  global.fetch = async (url, options = {}) => { requests.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : null }); assert.equal(url, '/api/admin/invitations'); assert.equal(options.method, 'PUT'); return Response.json({ draft_revision: ++storedRevision, expires_at: initial.expires_at, validity_mode: initial.validity_mode, validity_extra_days: initial.validity_extra_days, validity_revision: initial.validity_revision }); };
  persistence = { saves: [], versions: [], persist };
  const flush = async () => { for (let round = 0; round < 40; round++) { if (dirty && !unmounted) { dirty = false; cursor = 0; effects = []; tree = Builder({ initialData: initial }); for (const effect of effects) effect(); } await new Promise(done => setImmediate(done)); if (!dirty || unmounted) return tree; } throw Error('Upload history builder did not settle'); };
  const runner = { initial, requests, alerts, persistence, current: () => tree, flush };
  try { await flush(); return await scenario(runner); } finally { unmounted = true; for (const slot of slots) slot?.cleanup?.(); for (const name of hookNames) React[name] = original[name]; for (const [name, descriptor] of Object.entries(globals)) { if (descriptor) Object.defineProperty(global, name, descriptor); else delete global[name]; } assert.equal(lateWrites, 0); assert.ok(requests.every(request => request.url === '/api/admin/invitations' && request.method === 'PUT'), 'Only isolated draft PUTs are permitted'); }
}

test('empty undo and redo preserve the upload revision even when their disabled handlers are invoked', async t => {
  await withBuilder(t, async runner => { const signal = await revision(runner), before = signal.current; assert.equal(history(runner).props.disabled, true); assert.equal(history(runner, true).props.disabled, true); history(runner).props.onClick(); history(runner, true).props.onClick(); assert.equal(signal.current, before); await runner.flush(); assert.equal((await revision(runner)), signal); assert.equal(signal.current, before); });
});

test('ordinary content and layout edits preserve uploads while real undo and redo invalidate synchronously', async t => {
  await withBuilder(t, async runner => {
    const signal = await revision(runner), before = signal.current, block = panel(runner, 'BlockEditorPanel');
    block.props.onChange({ names: 'QA edición ordinaria' }); await runner.flush(); assert.equal(signal.current, before);
    const current = draft(runner); panel(runner, 'BlockEditorPanel').props.onChange({ config: { ...current.config, layout: { ...current.config.layout, blocks: current.config.layout.blocks.map((item, index) => index ? item : { ...item, style: { ...item.style, padTop: 88 } }) } } }); await runner.flush(); assert.equal(signal.current, before);
    history(runner).props.onClick(); assert.equal(signal.current, before + 1, 'Invalidate before a delayed upload can finish ahead of React'); await runner.flush(); assert.equal((await revision(runner)), signal); assert.equal(draft(runner).config.layout.blocks[0].style.padTop, runner.initial.config.layout.blocks[0].style.padTop);
    history(runner, true).props.onClick(); assert.equal(signal.current, before + 2); await runner.flush(); assert.equal(draft(runner).names, 'QA edición ordinaria'); assert.equal(draft(runner).config.layout.blocks[0].style.padTop, 88);
    history(runner, true).props.onClick(); assert.equal(signal.current, before + 2, 'No future snapshot means no new upload invalidation');
  });
});

test('restoring a historical draft with reused block IDs invalidates before render and keeps invitation ownership', async t => {
  await withBuilder(t, async runner => {
    const signal = await revision(runner), before = signal.current; await press(runner, '4. Revisar'); const snapshot = copy(draft(runner)); snapshot.id = '61000000-0000-4000-8000-000000000099'; snapshot.slug = 'qa-other-copy'; snapshot.names = 'QA versión histórica'; snapshot.config.layout.blocks[0].props.poster = '/qa-history-poster.jpg';
    panel(runner, 'VersionsPanel').props.onRestore(snapshot); assert.equal(signal.current, before + 1); await runner.flush(); assert.equal(draft(runner).id, runner.initial.id); assert.equal(draft(runner).slug, runner.initial.slug); assert.equal(draft(runner).names, snapshot.names); assert.equal(draft(runner).config.layout.blocks[0].id, runner.initial.config.layout.blocks[0].id); assert.equal((await revision(runner)), signal);
  });
});

test('a restore rejected by the existing color contract leaves the current upload revision valid', async t => {
  const initial = fixture(); initial.config = newServiceContract(initial.config, 'plus');
  await withBuilder(t, async runner => { const signal = await revision(runner), before = signal.current, original = copy(draft(runner)); await press(runner, '4. Revisar'); const denied = copy(original); denied.config.theme.primary = '#000001'; panel(runner, 'VersionsPanel').props.onRestore(denied); assert.equal(signal.current, before); await runner.flush(); assert.deepEqual(copy(draft(runner)), original); assert.match(text(runner.current()), /conserva la paleta original/); assert.equal(signal.current, before); }, { initial });
});

test('saving and publishing the current document preserve its upload revision without restoring historical content', async t => {
  await withBuilder(t, async runner => { const signal = await revision(runner), before = signal.current, originalLayout = copy(draft(runner).config.layout); const saved = await press(runner, 'Guardar'); await saved.pending; await runner.flush(); assert.equal(signal.current, before); assert.equal(runner.requests.length, 1); await press(runner, 'Publicar'); const published = await press(runner, 'Publicar esta versión'); await published.pending; await runner.flush(); assert.equal(signal.current, before); assert.deepEqual(copy(draft(runner).config.layout), originalLayout); assert.ok(runner.persistence.versions.some(item => item.action === 'publish')); assert.equal((await revision(runner)), signal); });
});

test('a published historical rollback invalidates only when that older document becomes the working draft', async t => {
  for (const retainNewerEdits of [false, true]) {
    let release; const held = new Promise(done => { release = done; });
    await withBuilder(t, async runner => {
      const signal = await revision(runner), before = signal.current; await press(runner, '4. Revisar');
      const snapshot = copy(draft(runner)); snapshot.names = 'QA rollback histórico';
      const pending = panel(runner, 'VersionsPanel').props.onRollback({ id: 'qa-history-published', invitationId: snapshot.id, label: 'QA anterior', source: 'publish', createdAt: 1, data: snapshot });
      await runner.flush(); assert.equal(signal.current, before, 'Pending publication has not yet restored another document');
      let newerLayout;
      if (retainNewerEdits) {
        const inspector = await blocks(runner), current = draft(runner);
        newerLayout = { ...current.config.layout, blocks: current.config.layout.blocks.map((item, index) => index ? item : { ...item, props: { ...item.props, poster: '/qa-newer-working-poster.jpg' } }) };
        inspector.props.onChange({ names: 'QA edición posterior al rollback', config: { ...current.config, layout: newerLayout } });
        await runner.flush(); assert.equal(signal.current, before, 'Ordinary edits during publication keep their upload destination');
      }
      release(); await pending; await runner.flush();
      if (retainNewerEdits) {
        assert.equal(signal.current, before, 'Publishing an older version must not invalidate uploads of the retained newer draft');
        assert.equal(draft(runner).names, 'QA edición posterior al rollback');
        assert.deepEqual(copy(draft(runner).config.layout), copy(newerLayout));
      } else {
        assert.equal(signal.current, before + 1); assert.equal(draft(runner).names, snapshot.names);
      }
      assert.equal((await revision(runner)), signal);
    }, { persist: request => request.action === 'publish' ? held : undefined });
  }
});
