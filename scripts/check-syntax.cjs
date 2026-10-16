const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const roots = ['App.js', 'index.js', 'components', 'hooks', 'utils'];
let count = 0;
function check(file) {
  if (fs.statSync(file).isDirectory()) {
    for (const entry of fs.readdirSync(file)) check(path.join(file, entry));
  } else if (file.endsWith('.js')) {
    babel.transformFileSync(file, { presets: ['babel-preset-expo'] });
    count++;
  }
}
for (const root of roots) check(root);
console.log(`Syntax checked: ${count} JavaScript files`);
