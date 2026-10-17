const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('clear cache preserves onboarding and user storage, removes TTL envelopes only', async () => {
  const data = new Map([
    ['onboarding_completed_v1', 'true'], ['user_notes', JSON.stringify({ text: 'keep' })],
    ['broken', 'not json'], ['api_news', JSON.stringify({ value: [], expiry: 123 })],
    ['plain_setting', 'dark'],
  ]);
  const source = fs.readFileSync(require.resolve('../utils/cache.js'), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export const /g, 'const ');
  const scope = { console, AsyncStorage: { getAllKeys: async () => [...data.keys()], multiGet: async keys => keys.map(key => [key, data.get(key)]), multiRemove: async keys => keys.forEach(key => data.delete(key)) } };
  vm.runInNewContext(source + '\nthis.clear = clearAllCache;', scope);
  assert.equal(await scope.clear(), true);
  assert.equal(data.has('api_news'), false);
  assert.equal(data.get('onboarding_completed_v1'), 'true');
  assert.equal(data.has('user_notes'), true);
  assert.equal(data.has('broken'), true);
  assert.equal(data.get('plain_setting'), 'dark');
});
