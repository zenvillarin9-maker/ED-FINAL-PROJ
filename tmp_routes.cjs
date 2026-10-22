// Empirically determine what useSegments() returns for this app's route tree.
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.resolve(__dirname);
const APP = path.join(ROOT, 'app');

function walk(dir, base, out) {
  base = base === undefined ? dir : base;
  out = out === undefined ? [] : out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else out.push('./' + path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

const keys = walk(APP).filter((k) => /\.(tsx?|jsx?)$/.test(k));

// Build a fake require.context
const contextModule = (key) => {
  const abs = path.join(APP, key.replace(/^\.\//, ''));
  const m = { default: () => null };
  try {
    // Don't actually evaluate TSX; just return a stub with the right shape.
    const src = fs.readFileSync(abs, 'utf8');
    m.default = () => null;
    m.__src = src.length;
  } catch {}
  return m;
};
contextModule.keys = () => keys;

const { getRoutes } = require(path.join(ROOT, 'node_modules', 'expo-router', 'build', 'getRoutes.js'));

const routes = getRoutes(contextModule, {
  platform: 'ios',
  ignoreEntryPoints: true,
  experimental: { isRouter: true },
  unstable_allowFullyDynamic: false,
  origin: '/',
});

function dump(node, depth) {
  const pad = '  '.repeat(depth);
  console.log(`${pad}${node.route === '' ? '(root)' : node.route}  [${node.type}]`);
  for (const c of node.children || []) dump(c, depth + 1);
}
dump(routes, 0);

console.log('\n--- React Navigation screen names (what segments are built from) ---');
const { getReactNavigationConfig } = require(path.join(
  ROOT, 'node_modules', 'expo-router', 'build', 'getReactNavigationConfig.js'
));
const config = getReactNavigationConfig(routes, false);
console.log(JSON.stringify(config, (k, v) => (k === '_route' ? undefined : v), 2));
