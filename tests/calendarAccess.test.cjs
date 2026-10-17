const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../utils/calendarAccess.js'), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export const /g, 'const ');
function load(Calendar) {
  const scope = { Calendar };
  vm.runInNewContext(source + '\nthis.get = getCalendarPermission; this.request = requestCalendarPermission;', scope);
  return scope;
}
test('old binary without permission functions reports unavailable instead of TypeError', async () => {
  const api = load({});
  assert.equal((await api.get()).status, 'unavailable');
  assert.equal((await api.request()).status, 'unavailable');
});
test('permission reads do not request access and preserve status', async () => {
  let requests = 0;
  const api = load({ getCalendarPermissions: async () => ({ status: 'undetermined' }), requestCalendarPermissions: async () => { requests++; return { status: 'granted' }; } });
  assert.equal((await api.get()).status, 'undetermined');
  assert.equal(requests, 0);
  assert.equal((await api.request()).status, 'granted');
  assert.equal(requests, 1);
});
test('unsupported native method reports unavailable, unexpected errors remain actionable', async () => {
  assert.equal((await load({ getCalendarPermissions: async () => { throw Error('native method not available'); } }).get()).status, 'unavailable');
  await assert.rejects(load({ getCalendarPermissions: async () => { throw Error('storage failure'); } }).get(), /storage failure/);
});
