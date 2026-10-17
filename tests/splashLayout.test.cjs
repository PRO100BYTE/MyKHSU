const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('splash logo remains upright and centered while the header is raised', () => {
  const source = fs.readFileSync(require.resolve('../components/SplashScreen.js'), 'utf8');
  assert.doesNotMatch(source, /logoFrame:[^\n]*rotate/);
  assert.doesNotMatch(source, /logo:[^\n]*rotate/);
  assert.match(source, /left: '50%'/);
  assert.match(source, /top: '50%'/);
  assert.match(source, /top: 18/);
  assert.match(source, /borderRadius: 30/);
});
