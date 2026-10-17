const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function service(failure) {
  const calls = { register: 0, unregister: 0 };
  const source = fs.readFileSync(require.resolve('../utils/backgroundService.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export const /g, 'const ').replace(/export default .*;/, '');
  const notifications = { getNotificationSettings: async () => ({ enabled: true, news: true }), hasPermission: async () => true, subscribe() {} };
  const scope = { Platform: { OS: 'ios' }, TaskManager: { isTaskDefined: () => true, isTaskRegisteredAsync: async () => false },
    BackgroundFetch: { BackgroundFetchStatus: { Available: 3 }, getStatusAsync: async () => 3,
      registerTaskAsync: async () => { calls.register++; throw Error(failure); }, unregisterTaskAsync: async () => { calls.unregister++; } },
    ApiService: {}, notificationService: notifications, console: { log() {}, warn() {}, error() {} } };
  vm.runInNewContext(`${source}\nthis.register = registerBackgroundNewsCheck;`, scope);
  return { calls, register: scope.register };
}

test('missing native fetch configuration is attempted once per service lifetime', async () => {
  const instance = service('BackgroundFetchDisabled: UIBackgroundModes fetch');
  await instance.register();
  await instance.register();
  assert.equal(instance.calls.register, 1);
});

test('transient registration failure remains retryable', async () => {
  const instance = service('temporary system error');
  await instance.register();
  await instance.register();
  assert.equal(instance.calls.register, 2);
});
