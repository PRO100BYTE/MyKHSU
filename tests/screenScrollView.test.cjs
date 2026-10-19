const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');

const source = babel.transformSync(fs.readFileSync(require.resolve('../components/ScreenScrollView.js'), 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
}).code;

function render(props = {}, { platform = 'ios', nested = false, fontScale = 1 } = {}) {
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    forwardRef: (fn) => fn,
    useContext: () => nested,
    useMemo: (fn) => fn(),
    createElement: (type, props, ...children) => ({ type, props, children }),
  };
  const flatten = (style) => Array.isArray(style)
    ? Object.assign({}, ...style.map(flatten)) : style || {};
  const modules = {
    react,
    'react-native': {
      Platform: { OS: platform },
      ScrollView: 'ScrollView',
      StyleSheet: { flatten, hairlineWidth: 0.5 },
      useWindowDimensions: () => ({ fontScale }),
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 47 }) },
  };
  const context = { exports: {}, require: (id) => modules[id] };
  vm.runInNewContext(source, context);
  const result = context.exports.default(props, 'ref').children[0];
  return { props: result.props, style: flatten(result.props.contentContainerStyle), inset: context.exports.useScreenHeaderInset() };
}

test('root starts at offset zero with header clearance and scrollable gap', () => {
  const { props, style, inset } = render();
  assert.equal(style.paddingTop, inset + 16);
  assert.equal(props.contentInset, undefined);
  assert.equal(props.contentOffset, undefined);
  assert.equal(props.contentInsetAdjustmentBehavior, 'never');
  assert.equal(props.ref, 'ref');
});

test('padding shorthand and style arrays retain existing space and other edges', () => {
  const { style, inset } = render({ contentContainerStyle: [{ padding: 20 }, { paddingVertical: 24, paddingBottom: 90 }] });
  assert.equal(style.paddingTop, inset + 24);
  assert.equal(style.paddingBottom, 90);
  assert.equal(style.padding, 20);
});

test('explicit header, inset and offset are not applied twice', () => {
  const contentInset = { top: 8, bottom: 10 };
  const contentOffset = { x: 0, y: 120 };
  const { props, style } = render({ headerInset: 100, contentInset, contentOffset, scrollIndicatorInsets: { top: 4, bottom: 5 } });
  assert.equal(style.paddingTop, 116);
  assert.equal(props.contentInset, contentInset);
  assert.equal(props.contentOffset, contentOffset);
  assert.equal(props.scrollIndicatorInsets.top, 104);
  assert.equal(props.scrollIndicatorInsets.bottom, 5);
});

test('nested, horizontal, opted out, Android and web scroll views are unchanged', () => {
  for (const [input, options] of [[{}, { nested: true }], [{ horizontal: true }, {}], [{ underlap: false }, {}], [{}, { platform: 'android' }], [{}, { platform: 'web' }]]) {
    const contentContainerStyle = { padding: 12 };
    const { props } = render({ ...input, contentContainerStyle }, options);
    assert.equal(props.contentContainerStyle, contentContainerStyle);
    assert.equal(props.contentInsetAdjustmentBehavior, undefined);
  }
});

test('header estimate responds to Dynamic Type', () => {
  assert.ok(render({}, { fontScale: 1.5 }).inset > render().inset);
});
