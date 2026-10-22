// Real BlockEditorPanel rows, inspector, registry and draft operations in RAM.
// Framer's real DragControls are retained; only its DOM/layout transport is isolated.
// This checks gesture entry points and committed block state, not physical browser scrolling.
// No HTTP, local/cloud libraries, uploads, credentials or payment operations are allowed.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest);
};
const transpile = (source, file) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  fileName: file,
}).outputText;
require.extensions['.ts'] = require.extensions['.tsx'] = (mod, file) => mod._compile(transpile(fs.readFileSync(file, 'utf8'), file), file);
const baselineFlag = process.argv.find(value => value.startsWith('--baseline-ref='));
const baseline = baselineFlag ? baselineFlag.slice(15) : null;
if (baseline && !/^[a-f0-9]{40}$/i.test(baseline)) throw Error('A complete baseline Git SHA is required');
const React = require('react');
const realUseDragControls = require('framer-motion').useDragControls;
const stub = (relative, exports) => require.cache[require.resolve(path.join(root, relative))] = { exports };
const inert = () => null;
for (const name of ['ImageUploader', 'MultiImageUploader', 'ImageStudio', 'IconPicker', 'DesignModeControl']) {
  stub(`src/components/admin/builder/${name}.tsx`, { __esModule: true, default: inert });
}
for (const name of ['CleanDesignFields', 'MariaMarioFields', 'KarlaMauricioFields', 'PaulaJuanFelipeFields', 'MarianaJesusFields', 'ManuelMayaFields', 'NicoleFranciscoFields', 'RolyYelianaFields', 'AnnieMickyFields', 'LauraAndresFields']) {
  stub(`src/components/admin/builder/panels/${name}.tsx`, { __esModule: true, default: inert });
}
let boundary;
const deny = reason => {
  boundary.forbidden.push(reason);
  throw Error('Touch regression RAM boundary: ' + reason);
};
stub('src/lib/user-templates.ts', {
  listUserTemplates: async () => [],
  saveUserTemplate: () => deny('template write'),
  deleteUserTemplate: () => deny('template removal'),
});
stub('src/lib/user-sections.ts', {
  listUserSections: () => [],
  hydrateUserSections: async () => ({ sections: [], cloud: false }),
  saveUserSection: () => deny('section write'),
  deleteUserSection: () => deny('section removal'),
});
const ReorderGroup = props => React.createElement('qa-reorder-group', props, props.children);
const ReorderItem = props => {
  React.useEffect(() => props.dragControls?.subscribe({
    start: (event, options) => boundary.starts.push({ id: props.value.id, event, options }),
    cancel: () => {}, stop: () => {},
  }), [props.dragControls, props.value.id]);
  return React.createElement('qa-reorder-item', props, props.children);
};
stub('node_modules/framer-motion/dist/cjs/index.js', {
  Reorder: { Group: ReorderGroup, Item: ReorderItem },
  useDragControls: realUseDragControls,
});
const relative = 'src/components/admin/builder/panels/BlockEditorPanel.tsx';
const filename = path.join(root, relative);
const source = baseline ? execFileSync('git', ['-c', 'core.fsmonitor=false', 'show', baseline + ':' + relative], { cwd: root, encoding: 'utf8' }) : fs.readFileSync(filename, 'utf8');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(transpile(source, filename), filename);
const BlockEditorPanel = compiled.exports.default;
const { newServiceContract } = require('../src/lib/packages.ts');
const clone = value => JSON.parse(JSON.stringify(value));
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(text).join(' ') : React.isValidElement(value) ? text(value.props.children) : '';
const normal = value => text(value).replace(/\s+/g, ' ').trim();
const nodes = (value, predicate) => Array.isArray(value) ? value.flatMap(child => nodes(child, predicate)) : !React.isValidElement(value) ? [] : [...(predicate(value) ? [value] : []), ...nodes(value.props.children, predicate)];
const block = (id, type = 'text') => ({ id, type, enabled: true, locked: false, props: type === 'text' ? { text: 'QA ' + id } : { names: 'QA Ana y QA Luis' }, style: { padTop: 32 }, layout: { mobile: { x: 0, y: 0 }, desktop: { x: 14 } }, qaOriginal: '/qa-preserved.json' });
const fixture = () => ({
  id: '50000000-0000-4000-8000-000000000031', slug: 'qa-block-touch-private', names: 'QA Ana y QA Luis',
  type: 'boda', template: 'azure', status: 'draft', event_date: '2027-06-19',
  config: newServiceContract({ musicUrl: '/music/qa-original.mp3', qaOriginal: ' QA original \n ', layout: {
    version: 2, basePreset: 'azure', presetKey: 'qa-touch', qaOriginal: '/qa-layout-original.json',
    blocks: [block('qa-a', 'cover'), block('qa-b'), block('qa-c')],
  } }, 'exclusive'),
});
const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

async function withPanel(scenario) {
  const hooks = ['useState', 'useRef', 'useEffect', 'useLayoutEffect', 'useMemo', 'useCallback', 'useId'];
  const original = Object.fromEntries(hooks.map(name => [name, React[name]]));
  const globals = Object.fromEntries(['fetch', 'window', 'document', 'localStorage', 'confirm', 'navigator'].map(name => [name, Object.getOwnPropertyDescriptor(global, name)]));
  const fibers = new Map(), patches = [], selections = [];
  let fiber, cursor = 0, tree, dirty = true, effects = [], stopped = false;
  let data = clone(fixture()), selected = '', selectedIds = [];
  const draftSource = { current: data }, editingRevision = { current: 0 };
  boundary = { starts: [], forbidden: [] };
  const currentBoundary = boundary;
  const scrollSurface = { scrollTop: 860 }, closestCalls = [], focusCalls = [];
  const panelSurface = {
    closest: selector => { closestCalls.push(selector); assert.equal(selector, '[data-builder-panel-scroll]'); return scrollSurface; },
    querySelector: selector => {
      assert.equal(selector, '[data-block-inspector-heading]');
      const heading = nodes(tree, node => node.props['data-block-inspector-heading'] !== undefined)[0];
      return heading ? { focus: options => focusCalls.push({ options, title: normal(heading) }) } : null;
    },
  };
  const install = (name, value) => Object.defineProperty(global, name, { configurable: true, writable: true, value });
  install('fetch', () => deny('HTTP'));
  install('window', { prompt: () => deny('prompt') });
  install('confirm', () => deny('destructive confirmation'));
  install('document', { createElement: () => deny('DOM allocation') });
  install('localStorage', { getItem: () => deny('local read'), setItem: () => deny('local write'), removeItem: () => deny('local removal') });
  install('navigator', { clipboard: { writeText: () => deny('clipboard') } });
  const cleanup = owner => { owner.active = false; for (const slot of owner.slots) slot?.cleanup?.(); };
  React.useState = initial => {
    const owner = fiber, index = cursor++;
    if (!(index in owner.slots)) {
      const slot = owner.slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      slot.set = next => {
        assert.ok(!stopped && owner.active, 'No state writes after unmount');
        next = typeof next === 'function' ? next(slot.value) : next;
        if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; }
      };
    }
    return [owner.slots[index].value, owner.slots[index].set];
  };
  React.useRef = initial => { const index = cursor++; return fiber.slots[index] ?? (fiber.slots[index] = { current: initial }); };
  React.useMemo = (compute, deps) => { const index = cursor++; if (!fiber.slots[index] || !same(fiber.slots[index].deps, deps)) fiber.slots[index] = { value: compute(), deps }; return fiber.slots[index].value; };
  React.useCallback = (callback, deps) => React.useMemo(() => callback, deps);
  React.useId = () => { const index = cursor++; return fiber.slots[index] ?? (fiber.slots[index] = 'qa-touch-' + index); };
  React.useEffect = React.useLayoutEffect = (effect, deps) => {
    const index = cursor++, previous = fiber.slots[index];
    if (!previous || !same(previous.deps, deps)) {
      const owner = fiber, slot = { deps, cleanup: previous?.cleanup };
      fiber.slots[index] = slot;
      effects.push(() => { if (!owner.active) return; slot.cleanup?.(); slot.cleanup = effect(); });
    }
  };
  const update = patch => { data = { ...data, ...patch }; draftSource.current = data; dirty = true; };
  const onChange = patch => { assert.ok(!stopped); patches.push(clone(patch)); update(patch); };
  const onSelect = (id, additive = false) => {
    assert.ok(!stopped); selections.push({ id, additive }); selected = id;
    selectedIds = additive ? selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id] : id ? [id] : [];
    dirty = true;
  };
  const expand = (value, key) => {
    if (Array.isArray(value)) return value.map((child, index) => expand(child, key + '/' + (child?.key ?? index)));
    if (!React.isValidElement(value)) return value;
    if (value.type === React.Fragment) return React.createElement(React.Fragment, { key: value.key ?? key }, expand(value.props.children, key + '/fragment'));
    if (typeof value.type === 'function') {
      const previous = fiber, previousCursor = cursor;
      let owner = fibers.get(key);
      if (!owner || owner.type !== value.type || !owner.active) {
        if (owner?.active) cleanup(owner);
        owner = { type: value.type, slots: [], active: true }; fibers.set(key, owner);
      }
      owner.used = true; fiber = owner; cursor = 0;
      const rendered = value.type(value.props); fiber = previous; cursor = previousCursor;
      return expand(rendered, key + '/rendered');
    }
    if (value.ref && typeof value.ref === 'object') value.ref.current = panelSurface;
    return React.cloneElement(value, { key: value.key ?? key }, expand(value.props.children, key + '/children'));
  };
  const flush = async () => {
    for (let round = 0; round < 50; round++) {
      if (dirty && !stopped) {
        dirty = false; effects = []; for (const owner of fibers.values()) owner.used = false;
        tree = expand(React.createElement(BlockEditorPanel, { data, onChange, selectedId: selected, selectedIds, onSelect, previewMode: 'mobile', previewWidth: 390, draftSource, editingRevision }), 'root');
        for (const owner of fibers.values()) if (owner.active && !owner.used) cleanup(owner);
        for (const effect of effects) effect();
      }
      await new Promise(done => setImmediate(done));
      if (!dirty || stopped) return tree;
    }
    throw Error('Touch regression hooks did not settle');
  };
  const r = {
    current: () => tree, data: () => data, blocks: () => data.config.layout.blocks,
    ids: () => data.config.layout.blocks.map(item => item.id), selected: () => selected,
    patches, selections, starts: currentBoundary.starts, flush, commit: update, editingRevision,
    scrollSurface, closestCalls, focusCalls, select: async id => { onSelect(id); await flush(); },
    row: id => nodes(tree, node => node.type === 'qa-reorder-item' && node.props.value.id === id)[0],
    button: (label, scope = tree) => nodes(scope, node => node.type === 'button' && normal(node) === label)[0],
    aria: (label, scope = tree) => nodes(scope, node => node.type === 'button' && node.props['aria-label'] === label)[0],
    findButton: (pattern, scope = tree) => nodes(scope, node => node.type === 'button' && pattern.test(node.props['aria-label'] ?? ''))[0],
    click: async control => { assert.ok(control, 'Expected real button'); assert.ok(!control.props.disabled, 'Button is enabled'); control.props.onClick({ shiftKey: false }); await flush(); },
    unmount: () => { stopped = true; for (const owner of fibers.values()) if (owner.active) cleanup(owner); },
  };
  try { await flush(); return await scenario(r); }
  finally {
    if (!stopped) r.unmount();
    for (const name of hooks) React[name] = original[name];
    for (const [name, descriptor] of Object.entries(globals)) if (descriptor) Object.defineProperty(global, name, descriptor); else delete global[name];
    assert.deepEqual(currentBoundary.forbidden, [], 'No operations may escape the RAM boundary');
  }
}

function pointerDown(target, ancestors = [], pointerType = 'touch', button = 0) {
  let stopped = false, prevented = false;
  const event = { pointerType, button, isPrimary: true, nativeEvent: { pointerType, button }, stopPropagation: () => { stopped = true; }, preventDefault: () => { prevented = true; } };
  for (const node of [target, ...ancestors]) {
    if (!node || stopped) break;
    node.props.onPointerDown?.(event);
  }
  return { stopped, prevented };
}

test('the real rows do not make the whole card a drag target', async () => withPanel(r => {
  assert.equal(nodes(r.current(), node => node.type === 'qa-reorder-item').length, 3);
  for (const id of r.ids()) {
    const row = r.row(id);
    assert.equal(row.props.dragListener, false, 'Framer automatic row drag must be disabled');
    assert.ok(row.props.dragControls, 'Only an explicit drag controller owns desktop drag');
    assert.equal(row.props.style?.touchAction, 'pan-y', 'The row keeps native vertical pan available');
    assert.ok(!/cursor-grab/.test(row.props.className ?? ''), 'A scrollable card must not advertise whole-card dragging');
  }
}));

test('only the explicit handle starts the real drag controller for touch mouse and pen', async () => withPanel(r => {
  for (const pointerType of ['touch', 'mouse', 'pen']) {
    const row = r.row('qa-b'), handle = r.findButton(/^Arrastrar /, row);
    assert.ok(handle, 'The dedicated handle is a named button');
    assert.equal(handle.props.type, 'button');
    assert.equal(handle.props.style?.touchAction, 'none', 'Only the handle reserves the touch gesture for drag');
    const count = r.starts.length;
    const gesture = pointerDown(handle, [row], pointerType);
    assert.equal(gesture.stopped, true, 'Handle pointerdown does not leak to parent controls');
    assert.equal(r.starts.length, count + 1);
    assert.equal(r.starts.at(-1).id, 'qa-b');
    assert.equal(r.starts.at(-1).event.pointerType, pointerType);
  }
  assert.equal(r.patches.length, 0, 'Starting a gesture does not itself commit an order');
  assert.equal(r.selections.length, 0);
}));

test('touching row content and ordinary controls neither starts a drag nor commits an order change', async () => withPanel(async r => {
  const before = clone(r.data());
  for (const id of r.ids()) {
    const row = r.row(id);
    pointerDown(row);
    for (const control of nodes(row, node => node.type === 'button' && !/Arrastrar/.test(node.props['aria-label'] ?? ''))) {
      const gesture = pointerDown(control, [row]);
      assert.equal(gesture.prevented, false, 'Ordinary touch starts remain available for native scrolling');
    }
  }
  await r.flush();
  assert.equal(r.starts.length, 0);
  assert.equal(r.patches.length, 0);
  assert.equal(r.selections.length, 0);
  assert.deepEqual(r.data(), before);
}));

test('explicit move buttons reorder actual current rows and preserve all original content', async () => withPanel(async r => {
  const original = clone(r.data());
  await r.click(r.findButton(/^Bajar /, r.row('qa-a')));
  assert.deepEqual(r.ids(), ['qa-b', 'qa-a', 'qa-c']);
  await r.click(r.findButton(/^Subir /, r.row('qa-a')));
  assert.deepEqual(r.ids(), ['qa-a', 'qa-b', 'qa-c']);
  for (const item of r.blocks()) assert.deepEqual(item, original.config.layout.blocks.find(value => value.id === item.id));
  assert.equal(r.data().config.musicUrl, original.config.musicUrl);
  assert.equal(r.data().config.qaOriginal, original.config.qaOriginal);
  assert.equal(r.data().config.layout.qaOriginal, original.config.layout.qaOriginal);
  assert.equal(r.starts.length, 0);
  assert.equal(r.selections.length, 0);
}));

test('the first and last rows expose disabled boundary moves', async () => withPanel(r => {
  assert.equal(r.findButton(/^Subir /, r.row('qa-a')).props.disabled, true);
  assert.equal(r.findButton(/^Bajar /, r.row('qa-c')).props.disabled, true);
  assert.equal(r.findButton(/^Bajar /, r.row('qa-a')).props.disabled, false);
  assert.equal(r.findButton(/^Subir /, r.row('qa-c')).props.disabled, false);
}));

test('a retained move action uses live content and never restores an externally removed sibling', async () => withPanel(async r => {
  const down = r.findButton(/^Bajar /, r.row('qa-a')).props.onClick;
  const current = clone(r.blocks()); current[0].props.names = 'QA nombre actual';
  r.commit({ config: { ...r.data().config, musicUrl: '/music/qa-current.mp3', layout: { ...r.data().config.layout, blocks: [current[0], current[2], block('qa-new')] } } });
  down({ shiftKey: false }); await r.flush();
  assert.deepEqual(r.ids(), ['qa-c', 'qa-a', 'qa-new']);
  assert.equal(r.blocks()[1].props.names, 'QA nombre actual');
  assert.equal(r.data().config.musicUrl, '/music/qa-current.mp3');
}));

test('rapid repeated move clicks read the current order and stop at its boundary', async () => withPanel(async r => {
  const down = r.findButton(/^Bajar /, r.row('qa-a')).props.onClick;
  down(); down(); down(); await r.flush();
  assert.deepEqual(r.ids(), ['qa-b', 'qa-c', 'qa-a']);
  assert.equal(r.patches.length, 2, 'A retained enabled action cannot move past the end');
}));

for (const invalidation of ['removed', 'different-type', 'revision', 'owner', 'unmount']) {
  test('retained row moves cannot act after ' + invalidation, async () => withPanel(async r => {
    const down = r.findButton(/^Bajar /, r.row('qa-a')).props.onClick;
    if (invalidation === 'removed') r.commit({ config: { ...r.data().config, layout: { ...r.data().config.layout, blocks: r.blocks().filter(item => item.id !== 'qa-a') } } });
    if (invalidation === 'different-type') r.commit({ config: { ...r.data().config, layout: { ...r.data().config.layout, blocks: r.blocks().map(item => item.id === 'qa-a' ? block('qa-a', 'text') : item) } } });
    if (invalidation === 'revision') r.editingRevision.current++;
    if (invalidation === 'owner') r.commit({ id: '50000000-0000-4000-8000-000000000032' });
    if (invalidation === 'unmount') r.unmount();
    const before = clone(r.data()), count = r.patches.length;
    down(); await r.flush();
    assert.deepEqual(clone(r.data()), before);
    assert.equal(r.patches.length, count);
  }));
}

test('the explicit editor entry opens the real inspector and makes Position controls reachable', async () => withPanel(async r => {
  await r.click(r.findButton(/^Editar /, r.row('qa-a')));
  assert.equal(r.selected(), 'qa-a');
  assert.deepEqual(r.selections, [{ id: 'qa-a', additive: false }]);
  const position = nodes(r.current(), node => node.type === 'button' && nodes(node, child => child.type === 'span' && normal(child) === 'Posición').length)[0];
  assert.ok(position, 'The real inspector must offer a visible position tab');
  await r.click(position);
  assert.ok(nodes(r.current(), node => node.type === 'button' && nodes(node, child => child.type === 'span' && normal(child) === 'Personalizado').length)[0], 'Position opens actual viewport mode controls');
  assert.ok(nodes(r.current(), node => node.type === 'label' && /Horizontal/.test(normal(node))).length);
  assert.ok(nodes(r.current(), node => node.type === 'label' && /Vertical/.test(normal(node))).length);
  assert.equal(r.patches.length, 0, 'Navigation must not change an invitation');
}));

test('opening a deeply scrolled row resets only its panel and focuses the inspector without page scrolling', async () => withPanel(async r => {
  assert.equal(r.scrollSurface.scrollTop, 860);
  assert.equal(r.closestCalls.length, 0);
  await r.click(r.findButton(/^Editar /, r.row('qa-c')));
  assert.equal(r.scrollSurface.scrollTop, 0);
  assert.deepEqual(r.closestCalls, ['[data-builder-panel-scroll]']);
  assert.deepEqual(r.focusCalls, [{ options: { preventScroll: true }, title: 'Texto' }]);
  r.scrollSurface.scrollTop = 460;
  const calls = r.closestCalls.length, focusCalls = r.focusCalls.length;
  r.commit({ names: 'QA nombre guardado' }); await r.flush();
  assert.equal(r.scrollSurface.scrollTop, 460, 'Ordinary draft/save rerenders must not jump back to the top');
  assert.equal(r.closestCalls.length, calls);
  assert.equal(r.focusCalls.length, focusCalls);
  await r.select('qa-b');
  assert.equal(r.scrollSurface.scrollTop, 0, 'Changing the selected block opens the next inspector at its start');
  assert.equal(r.focusCalls.length, focusCalls + 1);
}));

test('batch selection preserves list scroll until explicitly opening the selected editor', async () => withPanel(async r => {
  const select = r.findButton(/^Seleccionar /, r.row('qa-c'));
  assert.equal(select.props['aria-pressed'], false);
  await r.click(select);
  assert.equal(r.scrollSurface.scrollTop, 860, 'Marking a lower row must not jump out of the list');
  assert.equal(r.closestCalls.length, 0);
  assert.equal(r.focusCalls.length, 0);
  assert.ok(r.row('qa-c'), 'Batch mode stays on the actual list');
  const pressed = nodes(r.row('qa-c'), node => node.type === 'button' && /^Seleccionar /.test(node.props['aria-label'] ?? '') && node.props['aria-pressed'] !== undefined)[0];
  assert.equal(pressed.props['aria-pressed'], true);
  await r.click(nodes(r.current(), node => node.type === 'button' && /^Editar selección/.test(normal(node)))[0]);
  assert.equal(r.scrollSurface.scrollTop, 0);
  assert.equal(r.focusCalls.length, 1);
  assert.equal(r.focusCalls[0].title, 'Texto');
  assert.equal(r.patches.length, 0);
}));
