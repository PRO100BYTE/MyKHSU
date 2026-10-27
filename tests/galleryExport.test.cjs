const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../utils/galleryExport.js'), 'utf8')
  .replace(/^export /gm, '')
  .replace(/const getMediaLibrary = \(\) => \{[\s\S]*?\n\};/, `const getMediaLibrary = () => globalThis.MediaLibrary;`);

function loadGallery(mediaLibrary) {
  const context = vm.createContext({ MediaLibrary: mediaLibrary });
  vm.runInContext(`${source}\nglobalThis.api = { getGalleryPermission, requestGalleryPermission, saveScheduleImage };`, context);
  return context.api;
}

test('permission helpers use write-only access and no Android read granular permissions', async () => {
  const calls = [];
  const api = loadGallery({
    async getPermissionsAsync(...args) {
      calls.push(['get', ...args]);
      return { status: 'denied' };
    },
    async requestPermissionsAsync(...args) {
      calls.push(['request', ...args]);
      return { status: 'granted' };
    },
  });

  assert.deepEqual(await api.getGalleryPermission(), { status: 'denied' });
  assert.deepEqual(await api.requestGalleryPermission(), { status: 'granted' });
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'get');
  assert.equal(calls[0][1], true);
  assert.deepEqual([...calls[0][2]], []);
  assert.equal(calls[1][0], 'request');
  assert.equal(calls[1][1], true);
  assert.deepEqual([...calls[1][2]], []);
});

test('native module absence is reported without rejecting permission checks', async () => {
  const api = loadGallery(null);
  assert.equal((await api.getGalleryPermission()).status, 'unavailable');
  assert.equal((await api.requestGalleryPermission()).status, 'unavailable');
  await assert.rejects(api.saveScheduleImage('file:///schedule.png'), { message: 'GALLERY_UNAVAILABLE' });
});

test('permission errors are not incorrectly reported as missing native modules', async () => {
  const api = loadGallery({ getPermissionsAsync: async () => { throw Error('permission service failed'); } });
  await assert.rejects(api.getGalleryPermission(), /permission service failed/);
});

test('saveScheduleImage uses the SDK 57 Asset API', async () => {
  const calls = [];
  const asset = { id: 'asset-1' };
  const api = loadGallery({
    Asset: {
      async create(uri) {
        calls.push(uri);
        return asset;
      },
    },
  });

  assert.equal(await api.saveScheduleImage('file:///schedule.png'), asset);
  assert.equal(await api.saveScheduleImage('file:///tmp/capture'), asset);
  assert.deepEqual([...calls], ['file:///schedule.png', 'file:///tmp/capture']);
  await assert.rejects(api.saveScheduleImage(), { message: 'GALLERY_IMAGE_URI_MISSING' });
});
