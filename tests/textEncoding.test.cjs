const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('onboarding and export UI sources contain no Unicode replacement characters', () => {
  for (const name of ['OnboardingScreen.js', 'OnboardingNavigation.ios.js', 'ScheduleScreen.js', 'AboutModal.js']) {
    const source = fs.readFileSync(path.join(__dirname, '..', 'components', name), 'utf8');
    assert.ok(!source.includes('\uFFFD'), `${name} contains corrupted text`);
  }
});
