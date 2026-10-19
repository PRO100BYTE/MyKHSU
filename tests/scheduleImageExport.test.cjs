const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const parser = require('@babel/parser');
const generate = require('@babel/generator').default;

const source = fs.readFileSync(
  path.join(__dirname, '../components/ScheduleScreen.js'),
  'utf8',
);

function extractSaveHandler() {
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  let callback;
  const visit = node => {
    if (!node || callback) return;
    if (node.type === 'VariableDeclarator'
      && node.id.type === 'Identifier'
      && node.id.name === 'handleSaveScheduleImage'
      && node.init?.type === 'CallExpression'
      && node.init.callee.type === 'Identifier'
      && node.init.callee.name === 'useCallback') {
      callback = node.init.arguments[0];
      return;
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) value.forEach(visit);
        else visit(value);
      }
    }
  };
  visit(ast);
  assert.ok(callback, 'ScheduleScreen save handler was not found');
  return generate(callback).code;
}

const handlerSource = extractSaveHandler();

function loadHandler({ permission, requestedPermission = permission, save, exporting = false } = {}) {
  const alerts = [];
  const permissionCalls = [];
  const captures = [];
  const releases = [];
  const exportingChanges = [];
  const ref = { current: { capture: async options => {
    captures.push(JSON.parse(JSON.stringify(options)));
    return 'file:///schedule.png';
  } } };
  const busyRef = { current: false };
  let currentExporting = exporting;

  const context = vm.createContext({
    console: { error() {} },
    exporting: currentExporting,
    imageExportBusyRef: busyRef,
    shareImageRef: ref,
    setExporting(value) {
      exportingChanges.push(value);
      currentExporting = value;
    },
    async getGalleryPermission() {
      permissionCalls.push('get');
      return permission;
    },
    async requestGalleryPermission() {
      permissionCalls.push('request');
      return requestedPermission;
    },
    async saveScheduleImage(uri) {
      if (save) return save(uri);
    },
    Alert: { alert(...args) { alerts.push(args); } },
    Linking: { openSettings: async () => {} },
    ViewShot: { releaseCapture(uri) { releases.push(uri); } },
  });
  vm.runInContext(`globalThis.handler = ${handlerSource};`, context);
  return {
    invoke: (...args) => context.handler(...args),
    alerts, permissionCalls, captures, releases, exportingChanges,
    get busy() { return busyRef.current; },
    get exporting() { return currentExporting; },
  };
}

test('denied gallery permission does not capture or request when asking is unavailable', async () => {
  const api = loadHandler({ permission: { status: 'denied', canAskAgain: false } });

  await api.invoke();

  assert.deepEqual(api.permissionCalls, ['get']);
  assert.equal(api.captures.length, 0);
  assert.equal(api.releases.length, 0);
  assert.equal(api.busy, false);
  assert.equal(api.alerts[0][0], 'Нет доступа к галерее');
});

test('unavailable gallery does not request permission or capture', async () => {
  const api = loadHandler({ permission: { status: 'unavailable' } });

  await api.invoke();

  assert.deepEqual(api.permissionCalls, ['get']);
  assert.equal(api.captures.length, 0);
  assert.equal(api.releases.length, 0);
  assert.equal(api.alerts[0][0], 'Галерея недоступна');
});

test('granted permission captures at full quality, saves the URI, and releases it', async () => {
  let savedUri;
  const api = loadHandler({
    permission: { status: 'granted' },
    save: async uri => { savedUri = uri; },
  });

  await api.invoke();

  assert.deepEqual(api.permissionCalls, ['get']);
  assert.equal(api.captures.length, 1);
  assert.equal(api.captures[0].format, 'png');
  assert.equal(api.captures[0].quality, 1);
  assert.equal(savedUri, 'file:///schedule.png');
  assert.deepEqual(api.releases, ['file:///schedule.png']);
  assert.deepEqual(api.exportingChanges, [true, false]);
  assert.equal(api.busy, false);
  assert.equal(api.alerts[0][0], 'Готово');
});

test('mutex allows only one concurrent capture and save', async () => {
  let releaseSave;
  const saveStarted = new Promise(resolve => { releaseSave = resolve; });
  let saves = 0;
  const api = loadHandler({
    permission: { status: 'granted' },
    save: async () => {
      saves += 1;
      await saveStarted;
    },
  });

  const first = api.invoke();
  await new Promise(resolve => setImmediate(resolve));
  const second = api.invoke();
  releaseSave();
  await Promise.all([first, second]);

  assert.equal(saves, 1);
  assert.equal(api.captures.length, 1);
  assert.deepEqual(api.releases, ['file:///schedule.png']);
  assert.deepEqual(api.exportingChanges, [true, false]);
  assert.equal(api.busy, false);
});

test('save failure still releases the capture and resets the mutex', async () => {
  const api = loadHandler({
    permission: { status: 'granted' },
    save: async () => { throw new Error('disk full'); },
  });

  await api.invoke();
  assert.deepEqual(api.releases, ['file:///schedule.png']);
  assert.deepEqual(api.exportingChanges, [true, false]);
  assert.equal(api.busy, false);
  assert.equal(api.alerts.at(-1)[0], 'Ошибка');
});
