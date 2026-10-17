const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../app.json').expo;

test('gallery configuration requests add-only access without media read categories', () => {
  const plugin = config.plugins.find(item => Array.isArray(item) && item[0] === 'expo-media-library');
  assert.ok(plugin);
  assert.equal(plugin[1].photosPermission, false);
  assert.ok(plugin[1].savePhotosPermission.includes('расписания'));
  assert.deepEqual(plugin[1].granularPermissions, []);
  assert.equal(plugin[1].isAccessMediaLocationEnabled, false);
});
