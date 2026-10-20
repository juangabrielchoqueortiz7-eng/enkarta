// Real IconPicker, IconLibrary and ImageUploader; controlled React hook scheduler.
// Only compression, registry/JSON loading and visual animation boundaries are fake.
// Synthetic PNGs, no DOM, network, Auth, storage or invitation asset requests.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { File } = require('node:buffer');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest);
};
const compile = (source, file) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file,
}).outputText;
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => module._compile(compile(fs.readFileSync(file, 'utf8'), file), file);
const React = require('react');
let compress;
require.cache[require.resolve('../src/lib/image-compress.ts')] = { exports: { compressImage: (...args) => compress(...args) } };
const EventIcon = () => null;
const LottieIcon = () => null;
require.cache[require.resolve('../src/components/invitations/shared.tsx')] = { exports: { EventIcon } };
require.cache[require.resolve('../src/components/ui/LottieIcon.tsx')] = { exports: { __esModule: true, default: LottieIcon } };
const firstIcon = { id: 'qa-one', label: 'QA icono uno', path: '/lottie/qa/one.json', tags: ['qa'] };
const secondIcon = { id: 'qa-two', label: 'QA icono dos', path: '/lottie/qa/two.json', tags: ['qa'] };
const registry = { version: 'qa-only-in-ram', categories: [{ id: 'boda', label: 'QA', emoji: '', icons: [firstIcon, secondIcon] }] };
const syntheticLottie = { layers: [{ shapes: [{ c: { a: 0, k: [0.2, 0.4, 0.6, 1] } }] }] };
const lottie = require('../src/lib/lottie-utils.ts');
lottie.loadLottieRegistry = async () => registry;
lottie.loadLottieByPath = async () => syntheticLottie;
const pickerFile = path.join(root, 'src/components/admin/builder/IconPicker.tsx');
const source = process.argv.includes('--baseline')
  ? execFileSync('git', ['-c', 'core.fsmonitor=false', 'show', 'fa817011726d99a3a4752c4738063c7a6fbabfaf:src/components/admin/builder/IconPicker.tsx'], { cwd: root, encoding: 'utf8' })
  : fs.readFileSync(pickerFile, 'utf8');
const compiled = new Module(pickerFile, module);
compiled.filename = pickerFile;
compiled.paths = module.paths;
compiled._compile(compile(source, pickerFile), pickerFile);
require.cache[pickerFile] = compiled;
const IconPicker = compiled.exports.default;
const ImageUploader = require('../src/components/admin/builder/ImageUploader.tsx').default;
const IconLibrary = require('../src/components/admin/IconLibrary.tsx').default;
for (const name of ['CleanDesignFields', 'MariaMarioFields', 'KarlaMauricioFields', 'PaulaJuanFelipeFields', 'MarianaJesusFields', 'ManuelMayaFields', 'NicoleFranciscoFields', 'RolyYelianaFields', 'AnnieMickyFields', 'LauraAndresFields']) {
  require.cache[require.resolve(`../src/components/admin/builder/panels/${name}.tsx`)] = { exports: { __esModule: true, default: () => null } };
}
for (const name of ['ImageStudio', 'MultiImageUploader']) require.cache[require.resolve(`../src/components/admin/builder/${name}.tsx`)] = { exports: { __esModule: true, default: () => null } };
require.cache[require.resolve('../src/lib/user-templates.ts')] = { exports: { listUserTemplates: async () => [], saveUserTemplate: async () => [], deleteUserTemplate: async () => [] } };
require.cache[require.resolve('../src/lib/user-sections.ts')] = { exports: { listUserSections: () => [], hydrateUserSections: async () => ({ sections: [], cloud: false }), saveUserSection: () => [], deleteUserSection: () => [] } };
const BlockEditorPanel = require('../src/components/admin/builder/panels/BlockEditorPanel.tsx').default;
const { newServiceContract } = require('../src/lib/packages.ts');
const owner = '64000000-0000-4000-8000-000000000001';
const otherOwner = '64000000-0000-4000-8000-000000000002';
const uploaded = 'https://qa.invalid/icon-current.png';
const obsolete = 'https://qa.invalid/icon-obsolete.png';
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const file = (name = 'qa-icon.png') => new File(['QA synthetic PNG bytes'], name, { type: 'image/png' });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const nodes = (element, predicate) => !React.isValidElement(element) ? [] : [
  ...(predicate(element) ? [element] : []),
  ...React.Children.toArray(element.props.children).flatMap(child => nodes(child, predicate)),
];
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value)
  : Array.isArray(value) ? value.map(text).join(' ') : React.isValidElement(value) ? text(value.props.children) : '';
const find = (runner, predicate) => { const found = nodes(runner.current(), predicate)[0]; assert.ok(found, 'Expected real icon picker control'); return found; };
const button = (runner, label) => find(runner, node => node.type === 'button' && text(node).trim() === label);
const iconButton = (runner, icon = firstIcon) => find(runner, node => node.type === 'button' && node.props.title === icon.label);
const pickerPreview = runner => find(runner, node => node.type === EventIcon);
const blockFixture = () => ({ id: owner, slug: 'qa-private-icon', names: 'QA iconos ficticios', template: 'perla', type: 'boda', event_date: '2027-02-01', config: newServiceContract({ designKey: 'qa-original', musicUrl: '/music/qa-original.mp3', decor: { icon: '/lottie/qa-original.json' }, layout: { version: 2, basePreset: 'perla', presetKey: 'qa-original', blocks: ['qa-block-a', 'qa-block-b'].map(id => ({ id, type: 'eventCard', enabled: true, props: { icon: 'church', title: id, iconColors: { __tint: '#315b28' }, iconSpeed: 1.5 }, style: { padTop: 31 } })) } }, 'premium') });

async function withPicker(scenario, { props = {}, reply, compression, block = false } = {}) {
  const hooks = ['useState', 'useRef', 'useEffect', 'useCallback', 'useMemo'];
  const oldHooks = Object.fromEntries(hooks.map(name => [name, React[name]]));
  const oldFetch = global.fetch;
  const fibers = new Map(), requests = [], compressions = [], changes = [], patches = [];
  let fiber, cursor = 0, dirty = true, tree, effects = [], unmounted = false, visible = true, lateWrites = 0;
  let currentProps = { value: 'church', defaultIcon: 'rings', colors: { __tint: '#315b28' }, speed: 1.5, ownerId: owner, destinationKey: 'qa-block-a:icon', eventType: 'boda', ...props };
  let uploaders = [], libraries = [], pickers = [], pickerFiber, currentData = blockFixture(), selected = 'qa-block-a';
  const editingRevision = { current: 0 };
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  React.useState = initial => {
    const active = fiber, slots = fiber.slots, index = cursor++;
    if (!(index in slots)) {
      const slot = slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      slot.set = next => {
        if (unmounted || !active.live) { lateWrites++; return; }
        next = typeof next === 'function' ? next(slot.value) : next;
        if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; }
      };
    }
    return [slots[index].value, slots[index].set];
  };
  React.useRef = initial => { const index = cursor++; return fiber.slots[index] ?? (fiber.slots[index] = { current: initial }); };
  React.useCallback = (callback, deps) => { const slots = fiber.slots, index = cursor++; if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { value: callback, deps }; return slots[index].value; };
  React.useMemo = (compute, deps) => { const slots = fiber.slots, index = cursor++; if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { value: compute(), deps }; return slots[index].value; };
  React.useEffect = (effect, deps) => {
    const slots = fiber.slots, index = cursor++, before = slots[index];
    if (!before || !same(before.deps, deps)) {
      const slot = slots[index] = { deps, effect, cleanup: before?.cleanup };
      effects.push(() => { slot.cleanup?.(); slot.cleanup = effect(); });
    }
  };
  compress = (...args) => { compressions.push(args); return compression ? compression(...args, compressions) : Promise.resolve(args[0]); };
  global.fetch = async (url, options = {}) => {
    const request = { url, method: options.method, body: options.body, signal: options.signal };
    requests.push(request);
    return reply ? reply(request, requests) : Response.json({ url: uploaded });
  };
  const onChange = (value, colors, speed) => {
    if (unmounted) lateWrites++;
    changes.push({ value, colors: clone(colors), speed });
    currentProps = { ...currentProps, value, colors, speed };
    dirty = true;
  };
  const notify = patch => { if (unmounted) lateWrites++; patches.push(clone(patch)); currentData = { ...currentData, ...patch }; dirty = true; };
  const render = (key, Component, input) => {
    let active = fibers.get(key);
    if (!active || !active.live) { active = { slots: [], live: true }; fibers.set(key, active); }
    active.used = true; fiber = active; cursor = 0;
    return { element: Component(input), fiber: active };
  };
  const expand = (element, key) => {
    if (!React.isValidElement(element)) return element;
    if (element.type === IconPicker || element.type === ImageUploader || element.type === IconLibrary) {
      const rendered = render(key + '/' + element.type.name, element.type, element.props);
      (element.type === IconPicker ? pickers : element.type === ImageUploader ? uploaders : libraries).push({ props: element.props, fiber: rendered.fiber });
      return expand(rendered.element, key + '/' + element.type.name);
    }
    if (typeof element.type === 'function' && ['Labeled', 'FieldControl', 'Toggle'].includes(element.type.name)) return expand(element.type(element.props), key + '/' + element.type.name);
    return React.cloneElement(element, undefined, ...React.Children.toArray(element.props.children).map((child, index) =>
      expand(child, key + '/' + (React.isValidElement(child) && child.key != null ? child.key : index))));
  };
  const flush = async () => {
    for (let round = 0; round < 50; round++) {
      if (dirty && !unmounted) {
        dirty = false; effects = []; uploaders = []; libraries = []; pickers = [];
        for (const active of fibers.values()) active.used = false;
        if (visible) {
          if (block) {
            tree = expand(render('root', BlockEditorPanel, { data: currentData, onChange: notify, selectedId: selected, selectedIds: [selected], onSelect: id => { selected = id; dirty = true; }, previewMode: 'mobile', previewWidth: 390, editingRevision }).element, 'root');
            pickerFiber = pickers[0]?.fiber;
          } else {
            const input = { ...currentProps, onChange: currentProps.onChange ?? onChange }, rendered = render('root', IconPicker, input);
            pickerFiber = rendered.fiber; pickers.push({ props: input, fiber: rendered.fiber }); tree = expand(rendered.element, 'root');
          }
        } else tree = null;
        for (const active of fibers.values()) if (!active.used && active.live) { active.live = false; for (const slot of active.slots) slot?.cleanup?.(); }
        for (const effect of effects) effect();
      }
      await new Promise(done => setImmediate(done));
      if (!dirty || unmounted) return tree;
    }
    throw Error('Icon picker hooks did not settle');
  };
  const unmount = () => { if (unmounted) return; unmounted = true; for (const active of fibers.values()) { active.live = false; for (const slot of active.slots) slot?.cleanup?.(); } };
  const runner = {
    current: () => tree, props: () => currentProps, value: () => block ? currentData.config.layout.blocks.find(item => item.id === selected)?.props.icon : currentProps.value, changes, requests, compressions, patches,
    uploaders: () => uploaders, libraries: () => libraries, pickers: () => pickers, pickerFiber: () => pickerFiber, data: () => currentData, editingRevision, flush, unmount, lateWrites: () => lateWrites,
    drain: async () => { for (let tick = 0; tick < 4; tick++) await new Promise(done => setImmediate(done)); },
    choose: media => find({ current: () => tree }, node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [media], value: media.name } }),
    setProps: async patch => { currentProps = { ...currentProps, ...patch }; dirty = true; await flush(); },
    select: async id => { selected = id; dirty = true; await flush(); },
    hide: async () => { visible = false; dirty = true; await flush(); },
    show: async () => { visible = true; dirty = true; await flush(); },
    replayEffects: () => {
      const currentEffects = [...fibers.values()].filter(active => active.live).flatMap(active => active.slots.filter(slot => slot?.effect));
      for (const slot of currentEffects) slot.cleanup?.();
      for (const slot of currentEffects) slot.cleanup = slot.effect();
    },
  };
  try { await flush(); return await scenario(runner); }
  finally {
    unmount();
    for (const name of hooks) React[name] = oldHooks[name];
    global.fetch = oldFetch;
    assert.ok(requests.every(request => request.url === '/api/admin/upload' && request.method === 'POST'), 'Only RAM upload POSTs allowed');
  }
}
async function openUpload(runner) {
  find(runner, node => node.type === 'button' && node.props.title === 'Cambiar icono').props.onClick();
  await runner.flush();
  button(runner, 'Subir el mío').props.onClick();
  await runner.flush();
}

for (const phase of ['compression', 'transport', 'json']) test(`restore wins before the next render while ${phase} is pending, preserving the SVG or Lottie default`, async () => {
  for (const defaultIcon of ['rings', '/lottie/qa/design-default.json']) {
    const wait = deferred(); let jsonReads = 0;
    await withPicker(async runner => {
      await openUpload(runner);
      const instance = runner.uploaders()[0].fiber;
      assert.equal(runner.uploaders()[0].props.value, '');
      runner.choose(file()); await runner.flush();
      assert.equal(runner.requests.length, phase === 'compression' ? 0 : 1);
      button(runner, 'Restaurar').props.onClick();
      assert.deepEqual(runner.changes, [{ value: '', colors: undefined, speed: undefined }]);
      wait.resolve(phase === 'compression' ? file() : phase === 'transport' ? { ok: true, status: 200, json: async () => { jsonReads++; return { url: obsolete }; } } : { url: obsolete });
      await runner.drain();
      assert.equal(runner.value(), '');
      assert.equal(runner.changes.length, 1);
      assert.equal(runner.requests.length, phase === 'compression' ? 0 : 1);
      assert.equal(jsonReads, phase === 'json' ? 1 : 0);
      await runner.flush();
      assert.equal(runner.uploaders()[0].fiber, instance);
      assert.equal(runner.uploaders()[0].props.value, '');
      assert.equal(pickerPreview(runner).props.name, defaultIcon);
      assert.doesNotMatch(text(runner.current()), /Subiendo/);
      assert.equal(runner.lateWrites(), 0);
    }, { props: { defaultIcon }, compression: phase === 'compression' ? () => wait.promise : undefined, reply: () => phase === 'transport' ? wait.promise : { ok: true, status: 200, json: () => { jsonReads++; return wait.promise; } } });
  }
});

test('the real library selection callback wins over a pending JSON before a render and keeps the complete animation path', async () => {
  const wait = deferred();
  await withPicker(async runner => {
    find(runner, node => node.type === 'button' && node.props.title === 'Cambiar icono').props.onClick(); await runner.flush();
    const selectFirst = iconButton(runner).props.onClick;
    button(runner, 'Subir el mío').props.onClick(); await runner.flush();
    runner.choose(file()); await runner.flush();
    selectFirst();
    wait.resolve({ url: obsolete }); await runner.drain();
    assert.deepEqual(runner.changes, [{ value: firstIcon.path, colors: undefined, speed: undefined }]);
    await runner.flush();
    assert.equal(pickerPreview(runner).props.name, firstIcon.path);
    assert.equal(runner.lateWrites(), 0);
  }, { reply: () => ({ ok: true, status: 200, json: () => wait.promise }) });
});

test('multiple retained manual controls in one turn keep the last explicit choice', async () => {
  const wait = deferred();
  await withPicker(async runner => {
    find(runner, node => node.type === 'button' && node.props.title === 'Cambiar icono').props.onClick(); await runner.flush();
    const selectFirst = iconButton(runner).props.onClick, selectSecond = iconButton(runner, secondIcon).props.onClick;
    button(runner, 'Subir el mío').props.onClick(); await runner.flush();
    runner.choose(file()); await runner.flush();
    button(runner, 'Restaurar').props.onClick(); selectFirst(); selectSecond();
    wait.resolve(Response.json({ url: obsolete })); await runner.drain();
    assert.deepEqual(runner.changes.map(change => change.value), ['', firstIcon.path, secondIcon.path]);
    assert.equal(runner.value(), secondIcon.path);
  }, { reply: () => wait.promise });
});

test('color, speed and unrelated presentation changes do not cancel an upload or change its destination', async () => {
  const wait = deferred();
  await withPicker(async runner => {
    await openUpload(runner);
    runner.choose(file()); await runner.flush();
    const instance = runner.uploaders()[0].fiber;
    find(runner, node => node.type === 'input' && node.props['aria-label'] === 'Color general del icono').props.onChange({ target: { value: '#123456' } }); await runner.flush();
    find(runner, node => node.type === 'input' && node.props.type === 'range').props.onChange({ target: { value: '2.25' } }); await runner.flush();
    await runner.setProps({ colors: { __tint: '#abcdef', '#336699': 'transparent' }, speed: 0.5, iconScale: 1.4 });
    assert.equal(runner.requests[0].signal.aborted, false);
    assert.equal(runner.uploaders()[0].fiber, instance);
    assert.equal(runner.value(), firstIcon.path);
    wait.resolve(Response.json({ url: uploaded })); await runner.flush();
    assert.equal(runner.value(), uploaded);
    assert.equal(runner.changes.at(-1).value, uploaded);
    assert.equal(runner.props().iconScale, 1.4);
    assert.equal(runner.requests[0].body.get('id'), owner);
    assert.equal(runner.requests[0].body.get('folder'), 'icons');
  }, { props: { value: firstIcon.path }, reply: () => wait.promise });
});

test('the existing 1x control still clears an explicit speed without canceling a pending upload', async () => {
  const wait = deferred();
  await withPicker(async runner => {
    await openUpload(runner);
    runner.choose(file()); await runner.flush();
    const colors = clone(runner.props().colors);
    button(runner, '1x').props.onClick(); await runner.flush();
    assert.equal(runner.props().speed, undefined);
    assert.deepEqual(runner.props().colors, colors);
    assert.match(text(runner.current()), /Velocidad\s+1\.00\s*x/);
    assert.equal(runner.requests[0].signal.aborted, false);
    wait.resolve(Response.json({ url: uploaded })); await runner.flush();
    assert.equal(runner.value(), uploaded);
    assert.equal(runner.changes.length, 2);
  }, { props: { value: firstIcon.path }, reply: () => wait.promise });
});

test('editing the default tint promotes the same effective icon without canceling its upload, whose ACK uses the latest callback', async () => {
  const wait = deferred(), received = [];
  await withPicker(async runner => {
    await openUpload(runner);
    runner.choose(file()); await runner.flush();
    const revision = runner.uploaders()[0].props.fieldRevision?.current;
    find(runner, node => node.type === 'input' && node.props['aria-label'] === 'Color general del icono').props.onChange({ target: { value: '#123456' } }); await runner.flush();
    assert.equal(runner.value(), 'rings');
    assert.equal(runner.uploaders()[0].props.fieldRevision?.current, revision);
    await runner.setProps({ onChange: (...args) => received.push(args) });
    assert.equal(runner.requests[0].signal.aborted, false);
    wait.resolve(Response.json({ url: uploaded })); await runner.flush();
    assert.deepEqual(received, [[uploaded, undefined, undefined]]);
    assert.deepEqual(runner.changes, [{ value: 'rings', colors: { __tint: '#123456' }, speed: 1.5 }]);
  }, { props: { value: '' }, reply: () => wait.promise });
});

test('a parent destination guard blocks a manual restore and a pending ACK before another render', async () => {
  const wait = deferred(); let valid = true;
  await withPicker(async runner => {
    await openUpload(runner);
    runner.choose(file()); await runner.flush();
    valid = false;
    button(runner, 'Restaurar').props.onClick();
    wait.resolve({ url: obsolete }); await runner.drain();
    assert.deepEqual(runner.changes, []);
    assert.equal(runner.value(), 'church');
    assert.equal(runner.lateWrites(), 0);
  }, { props: { isDestinationCurrent: () => valid }, reply: () => ({ ok: true, status: 200, json: () => wait.promise }) });
});

test('a fresh upload after restoring survives an obsolete failure and shows only the current result', async () => {
  const old = deferred(), current = deferred();
  await withPicker(async runner => {
    await openUpload(runner);
    runner.choose(file('qa-old.png')); await runner.flush();
    button(runner, 'Restaurar').props.onClick(); await runner.flush();
    runner.choose(file('qa-current.png')); await runner.flush();
    assert.equal(runner.requests.length, 2);
    assert.equal(runner.requests[0].signal.aborted, true);
    old.reject(Error('QA_OBSOLETE_ICON_FAILURE')); await runner.flush();
    assert.equal(runner.value(), '');
    assert.doesNotMatch(text(runner.current()), /QA_OBSOLETE_ICON_FAILURE/);
    assert.match(text(runner.current()), /Subiendo/);
    current.resolve(Response.json({ url: uploaded })); await runner.flush();
    assert.deepEqual(runner.changes.map(change => change.value), ['', uploaded]);
    assert.equal(pickerPreview(runner).props.name, uploaded);
  }, { reply: (_request, requests) => requests.length === 1 ? old.promise : current.promise });
});

for (const contextField of ['ownerId', 'destinationKey', 'defaultIcon', 'eventType', 'value']) test(`stale restore and library controls cannot cancel a new upload after ${contextField} changes, including ABA`, async () => {
  for (const back of [false, true]) {
    const wait = deferred();
    await withPicker(async runner => {
      find(runner, node => node.type === 'button' && node.props.title === 'Cambiar icono').props.onClick(); await runner.flush();
      const selectOld = iconButton(runner).props.onClick, restoreOld = button(runner, 'Restaurar').props.onClick;
      button(runner, 'Subir el mío').props.onClick(); await runner.flush();
      const initial = runner.props()[contextField], next = contextField === 'ownerId' ? otherOwner : contextField === 'destinationKey' ? 'qa-block-b:icon' : contextField === 'eventType' ? 'xv' : '/lottie/qa/other-default.json';
      await runner.setProps({ [contextField]: next });
      if (back) await runner.setProps({ [contextField]: initial });
      runner.choose(file()); await runner.flush();
      const revision = runner.uploaders()[0].props.fieldRevision?.current;
      restoreOld(); selectOld(); await runner.drain();
      assert.deepEqual(runner.changes, []);
      assert.equal(runner.value(), contextField === 'value' && !back ? next : 'church');
      assert.equal(runner.uploaders()[0].props.fieldRevision?.current, revision);
      await runner.flush();
      assert.equal(runner.requests[0].signal.aborted, false);
      wait.resolve(Response.json({ url: uploaded })); await runner.flush();
      assert.deepEqual(runner.changes.map(change => change.value), [uploaded]);
    }, { reply: () => wait.promise });
  }
});

test('an upload is invalidated when a reused icon field changes destination and returns with the same value', async () => {
  const wait = deferred();
  await withPicker(async runner => {
    await openUpload(runner);
    const picker = runner.pickerFiber(), uploader = runner.uploaders()[0].fiber;
    runner.choose(file()); await runner.flush();
    await runner.setProps({ destinationKey: 'qa-block-b:icon' });
    await runner.setProps({ destinationKey: 'qa-block-a:icon' });
    assert.equal(runner.pickerFiber(), picker);
    assert.equal(runner.uploaders()[0].fiber, uploader);
    assert.equal(runner.requests[0].signal.aborted, true);
    wait.resolve(Response.json({ url: obsolete })); await runner.flush();
    assert.deepEqual(runner.changes, []);
    assert.equal(runner.value(), 'church');
  }, { reply: () => wait.promise });
});

test('unmounted manual controls cannot change a remounted picker or interrupt its new upload', async () => {
  const wait = deferred();
  await withPicker(async runner => {
    find(runner, node => node.type === 'button' && node.props.title === 'Cambiar icono').props.onClick(); await runner.flush();
    const selectOld = iconButton(runner).props.onClick, restoreOld = button(runner, 'Restaurar').props.onClick, picker = runner.pickerFiber();
    await runner.hide(); await runner.show();
    assert.notEqual(runner.pickerFiber(), picker);
    await openUpload(runner);
    runner.choose(file()); await runner.flush();
    restoreOld(); selectOld(); await runner.drain();
    assert.deepEqual(runner.changes, []);
    await runner.flush();
    assert.equal(runner.requests[0].signal.aborted, false);
    wait.resolve(Response.json({ url: uploaded })); await runner.flush();
    assert.equal(runner.value(), uploaded);
    assert.equal(runner.lateWrites(), 0);
  }, { reply: () => wait.promise });
});

test('unmount during compression, transport and JSON makes no late icon changes or state writes', async () => {
  for (const phase of ['compression', 'transport', 'json']) {
    const wait = deferred(); let jsonReads = 0;
    await withPicker(async runner => {
      await openUpload(runner);
      runner.choose(file()); await runner.flush();
      runner.unmount();
      wait.resolve(phase === 'compression' ? file() : phase === 'transport' ? { ok: true, status: 200, json: async () => { jsonReads++; return { url: obsolete }; } } : { url: obsolete });
      await runner.drain();
      assert.deepEqual(runner.changes, []);
      assert.equal(runner.lateWrites(), 0);
      assert.equal(runner.requests.length, phase === 'compression' ? 0 : 1);
      assert.equal(jsonReads, phase === 'json' ? 1 : 0);
    }, { compression: phase === 'compression' ? () => wait.promise : undefined, reply: () => phase === 'transport' ? wait.promise : { ok: true, status: 200, json: () => { jsonReads++; return wait.promise; } } });
  }
});

test('React 18 effect cleanup and setup replay permits a fresh upload before another render', async () => {
  await withPicker(async runner => {
    await openUpload(runner);
    runner.replayEffects();
    runner.choose(file()); await runner.flush();
    assert.equal(runner.requests.length, 1);
    assert.equal(runner.requests[0].signal.aborted, false);
    assert.deepEqual(runner.changes.map(change => change.value), [uploaded]);
    assert.equal(runner.value(), uploaded);
    assert.equal(runner.lateWrites(), 0);
  });
});

test('the real block editor passes icon destination and guard, protecting a new batch from stale controls on A/B/A selection', async () => {
  for (const back of [false, true]) {
    const old = deferred(), current = deferred();
    await withPicker(async runner => {
      await openUpload(runner);
      const picker = runner.pickers()[0], upload = runner.uploaders()[0], restoreOld = button(runner, 'Restaurar').props.onClick;
      assert.ok(picker.props.destinationKey);
      assert.equal(typeof picker.props.isDestinationCurrent, 'function');
      runner.choose(file('qa-block-a.png')); await runner.flush();
      await runner.select('qa-block-b');
      if (back) await runner.select('qa-block-a');
      assert.equal(runner.pickers()[0].fiber, picker.fiber);
      assert.equal(runner.uploaders()[0].fiber, upload.fiber);
      if (back) assert.equal(runner.pickers()[0].props.destinationKey, picker.props.destinationKey);
      else assert.notEqual(runner.pickers()[0].props.destinationKey, picker.props.destinationKey);
      assert.equal(runner.requests[0].signal.aborted, true);
      old.resolve(Response.json({ url: obsolete })); await runner.flush();
      assert.equal(runner.patches.length, 0);
      runner.choose(file('qa-current-block.png')); await runner.flush();
      restoreOld(); await runner.drain();
      assert.equal(runner.patches.length, 0);
      await runner.flush();
      assert.equal(runner.requests[1].signal.aborted, false);
      current.resolve(Response.json({ url: uploaded })); await runner.flush();
      assert.equal(runner.patches.length, 1);
      assert.equal(runner.value(), uploaded);
      const currentId = back ? 'qa-block-a' : 'qa-block-b', blocks = runner.data().config.layout.blocks;
      assert.equal(blocks.find(item => item.id !== currentId).props.icon, 'church');
      assert.deepEqual(blocks.find(item => item.id !== currentId).props.iconColors, { __tint: '#315b28' });
      assert.equal(blocks.find(item => item.id === currentId).props.title, currentId);
      assert.equal(Object.hasOwn(blocks.find(item => item.id === currentId).props, 'destinationKey'), false);
      assert.equal(Object.hasOwn(blocks.find(item => item.id === currentId).props, 'iconRevision'), false);
      assert.deepEqual(runner.data().config.decor, { icon: '/lottie/qa-original.json' });
      assert.equal(runner.lateWrites(), 0);
    }, { block: true, reply: (_request, requests) => requests.length === 1 ? old.promise : current.promise });
  }
});

test('the real block editing revision rejects restore and late JSON before React renders a history change', async () => {
  const wait = deferred();
  await withPicker(async runner => {
    await openUpload(runner);
    runner.choose(file()); await runner.flush();
    runner.editingRevision.current++;
    button(runner, 'Restaurar').props.onClick();
    wait.resolve({ url: obsolete }); await runner.drain();
    assert.equal(runner.patches.length, 0);
    assert.equal(runner.value(), 'church');
    assert.equal(runner.lateWrites(), 0);
  }, { block: true, reply: () => ({ ok: true, status: 200, json: () => wait.promise }) });
});
