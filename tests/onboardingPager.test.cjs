const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const babel = require('@babel/core');

const source = babel.transformFileSync(require.resolve('../utils/onboardingPager.js'), {
  presets: ['babel-preset-expo'],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
const loadedModule = { exports: {} };
vm.runInNewContext(source, { module: loadedModule, exports: loadedModule.exports });
const { animateOnboardingPage } = loadedModule.exports;

function scrollView() {
  const calls = [];
  return { ref: { current: { scrollTo: options => calls.push(options) } }, calls };
}

test('uses native animated scroll paging without JS feedback', () => {
  const scroll = scrollView();
  let completed = 0;
  const cancel = animateOnboardingPage({ scrollRef: scroll.ref, target: 720, onComplete: () => { completed += 1; } });
  assert.deepEqual(scroll.calls.map(options => ({ ...options })), [{ x: 720, y: 0, animated: true }]);
  assert.equal(completed, 1);
  cancel();
});

test('reduce motion uses an immediate native scroll', () => {
  const scroll = scrollView();
  animateOnboardingPage({ scrollRef: scroll.ref, target: 320, reduceMotion: true });
  assert.deepEqual(scroll.calls.map(options => ({ ...options })), [{ x: 320, y: 0, animated: false }]);
});

test('does not require an Animated value or listener', () => {
  const scroll = scrollView();
  assert.doesNotThrow(() => animateOnboardingPage({ scrollRef: scroll.ref, target: 100 }));
  assert.equal(scroll.calls[0].animated, true);
});
