const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(require.resolve('../components/IOSEdgeSwipeBack.js'), 'utf8');

test('iOS edge-back starts only at the left edge and requires a deliberate right swipe', () => {
  assert.match(source, /pageX <= EDGE_WIDTH/);
  assert.match(source, /gesture\.dx > 8/);
  assert.match(source, /Math\.abs\(gesture\.dx\) > Math\.abs\(gesture\.dy\)/);
  assert.match(source, /gesture\.dx >= DISTANCE_THRESHOLD/);
  assert.match(source, /gesture\.vx > 0\.45/);
  assert.match(source, /Platform\.OS === 'ios'/);
});

test('App enables edge-back only for an existing internal subsection', () => {
  const app = fs.readFileSync(require.resolve('../App.js'), 'utf8');
  assert.match(app, /isSubscreenOpen/);
  assert.match(app, /<IOSEdgeSwipeBack/);
  assert.match(app, /activeScreen === SCREENS\.MAP/);
  assert.match(app, /mapScreenRef\.current\?\.goBack\(\)/);
  assert.match(app, /freshmanScreenRef\.current\?\.goBack\(\)/);
  assert.match(app, /settingsScreenRef\.current\?\.goBack\(\)/);
});
