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

function fakeAnimated() {
  const listeners = new Map();
  const calls = [];
  let nextListener = 1;
  const value = {
    setValue(number) { calls.push(['setValue', number]); },
    addListener(listener) {
      const id = nextListener++;
      listeners.set(id, listener);
      calls.push(['addListener', id]);
      return id;
    },
    removeListener(id) {
      listeners.delete(id);
      calls.push(['removeListener', id]);
    },
    emit(number) {
      for (const listener of listeners.values()) listener({ value: number });
    },
  };
  const animation = {
    start(callback) {
      calls.push(['start']);
      this.callback = callback;
    },
    stop() { calls.push(['stop']); },
  };
  const Animated = {
    timing(input, config) {
      calls.push(['timing', input, config]);
      return animation;
    },
  };
  return { Animated, value, animation, calls };
}

function scrollView() {
  const calls = [];
  return { ref: { current: { scrollTo: options => calls.push(options) } }, calls };
}

test('animates through listener offsets and uses non-native scroll paging', () => {
  const fake = fakeAnimated();
  const scroll = scrollView();
  let completed = 0;
  const cancel = animateOnboardingPage({
    Animated: fake.Animated,
    value: fake.value,
    scrollRef: scroll.ref,
    target: 720,
    onComplete: () => { completed += 1; },
  });

  assert.equal(fake.calls[1][0], 'timing');
  assert.equal(fake.calls[1][1], fake.value);
  assert.deepEqual({ ...fake.calls[1][2] }, {
    toValue: 720, duration: 360, useNativeDriver: false,
  });
  fake.value.emit(180);
  fake.value.emit(510);
  assert.deepEqual(scroll.calls.map(options => ({ ...options })), [
    { x: 180, y: 0, animated: false },
    { x: 510, y: 0, animated: false },
  ]);

  fake.animation.callback({ finished: true });
  assert.equal(completed, 1);
  assert.deepEqual(fake.calls.at(-1), ['removeListener', 1]);
  cancel();
  assert.equal(completed, 1);
  assert.deepEqual(fake.calls.at(-1), ['removeListener', 1]);
});

test('reduce motion sets the target immediately without creating an animation', () => {
  const fake = fakeAnimated();
  const scroll = scrollView();
  let completed = 0;
  animateOnboardingPage({
    Animated: fake.Animated,
    value: fake.value,
    scrollRef: scroll.ref,
    target: 320,
    reduceMotion: true,
    onComplete: () => { completed += 1; },
  });

  assert.deepEqual(fake.calls, [['setValue', 320]]);
  assert.deepEqual(scroll.calls.map(options => ({ ...options })), [{ x: 320, y: 0, animated: false }]);
  assert.equal(completed, 1);
});

test('cancelling stops the animation, removes its listener, and suppresses completion', () => {
  const fake = fakeAnimated();
  const scroll = scrollView();
  let completed = 0;
  const cancel = animateOnboardingPage({
    Animated: fake.Animated,
    value: fake.value,
    scrollRef: scroll.ref,
    target: 100,
    onComplete: () => { completed += 1; },
  });

  cancel();
  cancel();
  fake.animation.callback({ finished: true });
  fake.value.emit(50);
  assert.equal(completed, 0);
  assert.deepEqual(fake.calls.map(([kind, first, second]) => kind === 'timing' ? [kind, first, { ...second }] : [kind, first].filter(value => value !== undefined)), [
    ['addListener', 1],
    ['timing', fake.value, { toValue: 100, duration: 360, useNativeDriver: false }],
    ['start'],
    ['stop'],
    ['removeListener', 1],
  ]);
  assert.deepEqual(scroll.calls, []);
});
