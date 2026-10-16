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
    const direct = module.exports.default({ title: 'Schedule', glass: {}, status: { icon: 'cloud-done-outline' }, accent: '#123456',
      actions: [{ label: 'Share', direct: true, icon: 'share-outline', onPress() {} }] });
    assert.equal(!!includes(direct), false, 'direct share action never renders an ellipsis menu');
    const collect = node => !node || typeof node !== 'object' ? [] : [node, ...(node.props?.children || []).flat(Infinity).flatMap(collect)];
    const icons = collect(direct).filter(node => node.type === 'Icon');
    const cache = icons.find(node => node.props.name === 'cloud-done-outline');
    assert.equal(cache.props.size, 22);
    assert.equal(cache.props.color, '#123456');
    assert.ok(icons.some(node => node.props.name === 'share-outline'));
    const customControl = { type: 'MapFilterButton', props: { children: [] } };
    const custom = module.exports.default({ title: 'Map', glass: {}, actions: [{ primary: true, label: 'Filters', render: () => customControl }] });
    const customNodes = collect(custom);
    assert.ok(customNodes.includes(customControl));
    assert.equal(customNodes.some(node => node.type === 'TouchableOpacity'), false, 'native filter trigger is not nested in another touchable');
  }
});
