const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('splash logo remains upright and centered while the header is raised', () => {
  const source = fs.readFileSync(require.resolve('../components/SplashScreen.js'), 'utf8');
  assert.doesNotMatch(source, /logoFrame:[^\n]*rotate/);
  assert.doesNotMatch(source, /logo:[^\n]*rotate/);
  assert.doesNotMatch(source, /logoStage: \{ position: 'absolute'/);
  assert.match(source, /top: 18/);
  assert.match(source, /borderRadius: 30/);
  assert.match(source, /paddingTop: 52/);
  assert.match(source, /2025-\{CURRENT_YEAR\} PRO100BYTE Team/);
});
