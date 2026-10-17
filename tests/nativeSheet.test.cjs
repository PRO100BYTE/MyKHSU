const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../components/NativeSheet.js'), 'utf8');

test('bounded NativeSheet keeps backdrop and panel animations independent', () => {
  assert.match(source, /useWindowDimensions\(\)/);
  assert.match(source, /const panelTranslate = useRef\(new Animated\.Value/);
  assert.match(source, /const backdropOpacity = useRef\(new Animated\.Value/);
  assert.match(source, /<Animated\.View pointerEvents="none" style=\{\[styles\.backdrop, \{ opacity: backdropOpacity \}\]}/);
  assert.match(source, /transform: \[\{ translateY: panelTranslate \}\]/);
});

test('bounded NativeSheet supports a half-height expandable panel and dismissal gestures', () => {
  assert.match(source, /minHeight = 0\.5/);
  assert.match(source, /expandable = true/);
  assert.match(source, /PanResponder\.create/);
  assert.match(source, /onPanResponderRelease: settleDrag/);
  assert.match(source, /onPress=\{requestClose\}/);
});
