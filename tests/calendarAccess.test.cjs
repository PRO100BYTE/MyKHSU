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
test('permission reads do not request access and both calls explicitly request full calendar access', async () => {
  let requests = 0;
  const writeOnlyValues = [];
  const api = load({
    getCalendarPermissions: async writeOnly => { writeOnlyValues.push(writeOnly); return { status: 'undetermined' }; },
    requestCalendarPermissions: async writeOnly => { writeOnlyValues.push(writeOnly); requests++; return { status: 'granted' }; },
  });
  assert.equal((await api.get()).status, 'undetermined');
  assert.equal(requests, 0);
  assert.equal((await api.request()).status, 'granted');
  assert.equal(requests, 1);
  assert.deepEqual(writeOnlyValues, [false, false]);
});
test('unsupported native method and Expo Go report unavailable, unexpected errors remain actionable', async () => {
  assert.equal((await load({ getCalendarPermissions: async () => { throw Error('native method not available'); } }).get()).status, 'unavailable');
  assert.equal((await load({ requestCalendarPermissions: async () => { throw Error('Calendar@next functionality is not available in Expo Go'); } }).request()).status, 'unavailable');
  await assert.rejects(load({ getCalendarPermissions: async () => { throw Error('storage failure'); } }).get(), /storage failure/);
});
