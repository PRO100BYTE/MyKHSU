const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');

test('toolbar never mounts missing MenuView, registered view uses native menu', () => {
  const filename = require.resolve('../components/HeaderToolbar.js');
  const code = babel.transformFileSync(filename, { presets: ['babel-preset-expo'], plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const nativeMenu = function NativeMenu() {};
  const element = (type, props, ...children) => ({ type, props: { ...props, children } });
  for (const available of [false, true]) {
    const react = { createElement: element };
    const rn = { Platform: { OS: 'ios' }, UIManager: { hasViewManagerConfig: () => available },
      Alert: { alert() {} }, ActionSheetIOS: { showActionSheetWithOptions() {} },
      Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View', StyleSheet: { create: x => x, hairlineWidth: 1 } };
    const module = { exports: {} };
    vm.runInNewContext(code, { module, exports: module.exports, console,
      require: name => {
        if (name.startsWith('@babel/runtime/')) return require(name);
        if (name === 'react') return react;
        if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props: { ...props, children: [props?.children] } }), jsxs: (type, props) => ({ type, props: { ...props, children: [props?.children] } }) };
        if (name === 'react-native') return rn;
        if (name === '@react-native-menu/menu') return { MenuView: nativeMenu };
        if (name === '@expo/vector-icons') return { Ionicons: 'Icon' };
        if (name === 'expo-blur') return { BlurView: 'BlurView' };
        if (name === 'expo-glass-effect') return { GlassView: 'GlassView' };
        throw Error(name);
      } });
    const tree = module.exports.default({ title: 'Schedule', glass: {}, actions: [{ label: 'Share', onPress() {} }] });
    const includes = node => node && typeof node === 'object' && (node.type === nativeMenu || (node.props?.children || []).flat(Infinity).some(includes));
    assert.equal(!!includes(tree), available);
  }
});
