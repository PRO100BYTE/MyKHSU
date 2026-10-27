const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../utils/contextActions.js'), 'utf8')
  .replace(/^import .*;\r?\n/, '')
  .replace(/export const /g, 'const ');
let sheet, alert, shared, opened;
const context = {
  console,
  Platform: { OS: 'ios' },
  ActionSheetIOS: { showActionSheetWithOptions: (options, callback) => { sheet = { options, callback }; } },
  Alert: { alert: (...args) => { alert = args; } },
  Share: { share: async payload => { shared = payload; } },
  Linking: { openURL: async url => { opened = url; } },
};
vm.createContext(context);
vm.runInContext(`${source}\nthis.api = { getNewsUrl, showNewsActions, showContextActions };`, context);
const { getNewsUrl, showNewsActions, showContextActions } = context.api;
assert.equal(getNewsUrl(null), null);
assert.equal(getNewsUrl({ url: 'javascript:alert(1)' }), null);
assert.equal(getNewsUrl({ url: ' https://example.com/news ' }), 'https://example.com/news');
assert.equal(getNewsUrl({ link: 'http://example.com' }), 'http://example.com');
(async () => {
  showNewsActions({ content: 'News' });
  assert.equal(sheet.options.options.join(','), 'Поделиться,Отмена');
  sheet.callback(sheet.options.cancelButtonIndex);
  assert.equal(shared, undefined);
  sheet.callback(0);
  await Promise.resolve();
  assert.equal(shared.message, 'News');
  showNewsActions({ content: 'News', url: 'https://example.com' });
  sheet.callback(0);
  await Promise.resolve();
  assert.equal(opened, 'https://example.com');
  context.Platform.OS = 'android';
  showNewsActions({ content: 'News' });
  assert.equal(alert[2].length, 2);
  assert.equal(alert[2][1].style, 'cancel');
  assert.equal(alert[3].cancelable, true);
  showContextActions({ title: 'Failure', actions: [{ label: 'Fail', onPress: async () => { throw new Error('test'); } }] });
  alert[2][0].onPress();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(alert[0], 'Не удалось выполнить действие');
  console.log('contextActions tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
