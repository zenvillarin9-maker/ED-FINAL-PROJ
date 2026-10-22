// Restore damaged packages in node_modules from the local npm cache (cacache).
// Verifies each tarball against package-lock.json integrity before extracting.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname);
const NM = path.join(ROOT, 'node_modules');
const CACHE = process.env.npm_config_cache || 'C:\\Users\\Villarin F\\AppData\\Local\\npm-cache';

const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));

function walk(root, base, out) {
  base = base === undefined ? root : base;
  out = out === undefined ? [] : out;
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

// --- locate tarball content in cacache by integrity hash ---
const CACACHE = path.join(CACHE, '_cacache');
const CONTENT = path.join(CACACHE, 'content-v2');

function contentPathFor(integrity) {
  const [algo, b64] = integrity.split('-');
  const hex = Buffer.from(b64, 'base64').toString('hex');
  return path.join(CONTENT, algo, hex.slice(0, 2), hex.slice(2, 4), hex.slice(4));
}

// --- detect damaged packages: declared types missing, or zero .d.ts for TS pkgs ---
function detectDamaged() {
  const damaged = [];
  for (const [pkgPath, meta] of Object.entries(lock.packages || {})) {
    if (!pkgPath.startsWith('node_modules/')) continue;
    const dir = path.join(ROOT, pkgPath);
    if (!fs.existsSync(dir)) continue;
    const pjPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pjPath)) continue;
    let pj;
    try { pj = JSON.parse(fs.readFileSync(pjPath, 'utf8')); } catch { continue; }

    const typesField = pj.types || pj.typings;
    const files = walk(dir);
    const hasDts = files.some((f) => f.endsWith('.d.ts'));

    let issue = null;
    if (typesField) {
      // "typings": "dist/index" may point at dist/index.d.ts
      const candidates = [
        typesField,
        `${typesField}.d.ts`,
        typesField.replace(/\.js$/, '.d.ts'),
        path.join(typesField, 'index.d.ts'),
      ];
      const found = candidates.some((c) => fs.existsSync(path.join(dir, c)));
      if (!found) issue = `declared types "${typesField}" missing`;
    } else if (!hasDts) {
      // TS-authored package with runtime JS but no declarations
      const hasTsSource = files.some((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
      const hasJs = files.some((f) => f.endsWith('.js'));
      if (hasTsSource && hasJs) issue = 'no declarations at all';
    }
    if (issue) damaged.push({ pkgPath, dir, meta, issue });
  }
  return damaged;
}

const damaged = detectDamaged();
console.log('=== damaged packages detected ===');
damaged.forEach((d) => console.log(`  ${d.pkgPath} :: ${d.issue}`));
console.log('');

if (process.argv.includes('--list')) process.exit(0);

const workDir = path.join(process.env.TEMP, 'npm_restore');
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });

let fixed = 0;
let failed = 0;

for (const d of damaged) {
  const integrity = d.meta.integrity;
  if (!integrity) { console.log(`SKIP ${d.pkgPath}: no integrity in lockfile`); failed++; continue; }

  const tarball = contentPathFor(integrity);
  if (!fs.existsSync(tarball)) {
    console.log(`SKIP ${d.pkgPath}: tarball not in cache`);
    failed++;
    continue;
  }

  // verify integrity
  const actual = 'sha512-' + crypto.createHash('sha512').update(fs.readFileSync(tarball)).digest('base64');
  if (actual !== integrity) {
    console.log(`SKIP ${d.pkgPath}: cache content hash mismatch`);
    failed++;
    continue;
  }

  // extract
  const dest = path.join(workDir, path.basename(d.pkgPath));
  fs.mkdirSync(dest, { recursive: true });
  try {
    execFileSync('tar', ['-xzf', tarball, '-C', dest, '--strip-components', '1'], { stdio: 'pipe' });
  } catch (e) {
    console.log(`SKIP ${d.pkgPath}: extract failed`);
    failed++;
    continue;
  }

  // copy only files that are missing or differ
  const srcFiles = walk(dest);
  let added = 0, replaced = 0, same = 0;
  for (const f of srcFiles) {
    const from = path.join(dest, f);
    const to = path.join(d.dir, f);
    if (fs.existsSync(to)) {
      if (fs.readFileSync(from).equals(fs.readFileSync(to))) { same++; continue; }
      replaced++;
    } else {
      added++;
    }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
  console.log(`FIXED ${d.pkgPath}: +${added} added, ~${replaced} replaced, =${same} identical`);
  fixed++;
}

console.log(`\nfixed: ${fixed}, skipped: ${failed}`);

// re-verify
console.log('\n=== re-check ===');
const still = detectDamaged();
console.log('still damaged:', still.length);
still.forEach((d) => console.log(`  ${d.pkgPath} :: ${d.issue}`));
