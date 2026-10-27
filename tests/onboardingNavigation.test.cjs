const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const babel = require('@babel/core');

const compile = filename => babel.transformFileSync(require.resolve(filename), {
  presets: ['babel-preset-expo'],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
const navigationCode = compile('../components/OnboardingNavigation.ios.js');
const fallbackCode = compile('../components/OnboardingNavigationFallback.js');
const element = (type, props, ...children) => ({ type, props: { ...props, children } });
const collect = node => !node || typeof node !== 'object' ? [] : [node,
  ...(node.props?.children || []).flat(Infinity).flatMap(collect)];

function loadNavigation({ available = true, version = '26.0' } = {}) {
  const Button = function SwiftUIButton() {};
  const Host = function SwiftUIHost() {};
  const nativeImports = [];
  const rn = {
    Platform: { OS: 'ios', Version: version },
    View: 'View', Text: 'Text', Pressable: 'Pressable',
    StyleSheet: { create: styles => styles },
  };
  const modifiers = Object.fromEntries(
    ['buttonStyle', 'buttonBorderShape', 'controlSize', 'tint', 'disabled']
      .map(name => [name, value => ({ name, value })]),
  );
  let fallback;
  function evaluate(code) {
    const module = { exports: {} };
    vm.runInNewContext(code, {
      module, exports: module.exports, console,
      require: name => {
        if (name.startsWith('@babel/runtime/')) return require(name);
        if (name === 'react') return { createElement: element };
        if (name === 'react/jsx-runtime') return {
          jsx: (type, props) => ({ type, props: { ...props, children: [props?.children] } }),
          jsxs: (type, props) => ({ type, props: { ...props, children: [props?.children] } }),
        };
        if (name === 'react-native') return rn;
        if (name === 'expo-modules-core') return {
          requireOptionalNativeModule: moduleName => {
            assert.equal(moduleName, 'ExpoUI');
            return available ? {} : null;
          },
        };
        if (name === './OnboardingNavigationFallback') return { default: fallback, __esModule: true };
        if (name.startsWith('@expo/ui/')) {
          nativeImports.push(name);
          assert.ok(available, 'missing ExpoUI must not load SwiftUI bindings');
          if (name === '@expo/ui/swift-ui') return { Button, Host };
          if (name === '@expo/ui/swift-ui/modifiers') return modifiers;
        }
        throw Error(`Unexpected import: ${name}`);
      },
    });
    return module.exports.default;
  }
  fallback = evaluate(fallbackCode);
  return { Navigation: evaluate(navigationCode), fallback, Button, Host, nativeImports };
}

function propsFor(overrides = {}) {
  return {
    onBack() {}, onNext() {}, backDisabled: false, busy: false, isLast: false,
    accent: '#123456', textColor: '#abcdef', theme: 'dark', ...overrides,
  };
}

function modifier(button, name) {
  const matches = button.props.modifiers.filter(item => item.name === name);
  assert.equal(matches.length, 1, `exactly one ${name} modifier`);
  return matches[0].value;
}

for (const version of ['26.0', 27, '18.6']) {
  test(`iOS ${version} uses genuine SwiftUI buttons with native capsule styles`, () => {
    const { Navigation, Button, Host } = loadNavigation({ version });
    const props = propsFor();
    const nodes = collect(Navigation(props));
    const buttons = nodes.filter(node => node.type === Button);
    const hosts = nodes.filter(node => node.type === Host);
    assert.equal(buttons.length, 2);
    assert.equal(hosts.length, 2);
    assert.equal(nodes.some(node => node.type === 'Pressable'), false);
    for (const [index, host] of hosts.entries()) {
      assert.equal(host.props.matchContents, true);
      assert.equal(host.props.colorScheme, props.theme);
      assert.equal(host.props.ignoreSafeArea, 'all');
      assert.equal(collect(host).filter(node => node.type === Button)[0], buttons[index]);
    }
    for (const button of buttons) {
      assert.equal(modifier(button, 'buttonBorderShape'), 'capsule');
      assert.equal(modifier(button, 'controlSize'), 'large');
      assert.equal(modifier(button, 'tint'), props.accent);
    }
    const glass = Number.parseInt(version, 10) >= 26;
    assert.equal(modifier(buttons[0], 'buttonStyle'), glass ? 'glass' : 'bordered');
    assert.equal(modifier(buttons[1], 'buttonStyle'), glass ? 'glassProminent' : 'borderedProminent');
  });
}

for (const available of [true, false]) {
  test(`${available ? 'native' : 'fallback'} navigation respects disabled/busy state, labels and callbacks`, () => {
    const { Navigation, fallback, Button, nativeImports } = loadNavigation({ available });
    for (const backDisabled of [false, true]) {
      for (const busy of [false, true]) {
        for (const isLast of [false, true]) {
          const calls = [];
          const props = propsFor({ backDisabled, busy, isLast,
            onBack: () => calls.push('back'), onNext: () => calls.push('next') });
          let tree = Navigation(props);
          if (!available) {
            assert.equal(tree.type, fallback);
            for (const [key, value] of Object.entries(props)) assert.equal(tree.props[key], value);
            tree = tree.type(tree.props);
          }
          const buttons = collect(tree).filter(node => node.type === (available ? Button : 'Pressable'));
          assert.equal(buttons.length, 2);
          const [back, next] = buttons;
          const disabled = button => available ? modifier(button, 'disabled') : button.props.disabled;
          assert.equal(disabled(back), backDisabled || busy);
          assert.equal(disabled(next), busy);
          const label = button => available ? button.props.label
            : collect(button).find(node => node.type === 'Text').props.children.flat(Infinity).join('');
          assert.equal(label(back), 'Назад');
          assert.equal(label(next), isLast ? 'Начать' : 'Далее');
          assert.equal(back.props.onPress, props.onBack);
          assert.equal(next.props.onPress, props.onNext);
          if (!available) {
            for (const button of buttons) {
              assert.equal(button.props.accessibilityRole, 'button');
              assert.equal(button.props.accessibilityState.disabled, disabled(button));
            }
          }
          if (!disabled(back)) back.props.onPress();
          if (!disabled(next)) next.props.onPress();
          assert.deepEqual(calls, [...(!backDisabled && !busy ? ['back'] : []), ...(!busy ? ['next'] : [])]);
        }
      }
    }
    if (!available) assert.deepEqual(nativeImports, []);
  });
}
