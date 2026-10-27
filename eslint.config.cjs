const js = require('@eslint/js');
const globals = require('globals');
const babelParser = require('@babel/eslint-parser');
const react = require('eslint-plugin-react');

module.exports = [
  { ignores: ['node_modules/**', '.expo/**', 'dist/**', 'coverage/**', 'android/**', 'ios/**'] },
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: { requireConfigFile: false, babelOptions: { presets: ['babel-preset-expo'] } },
      globals: { ...globals.browser, ...globals.node, __DEV__: 'readonly', requestAnimationFrame: 'readonly' },
    },
    plugins: { react },
    rules: {
      'constructor-super': js.configs.recommended.rules['constructor-super'],
      'no-undef': 'error',
      'no-dupe-args': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'valid-typeof': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-no-duplicate-props': 'error',
    },
  },
];
