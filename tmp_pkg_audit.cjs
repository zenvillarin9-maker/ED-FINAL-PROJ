// Audit all installed packages for stripped/missing type declarations.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const NM = path.join(ROOT, 'node_modules');

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

const problems = [];
let checked = 0;

for (const entry of fs.readdirSync(NM)) {
  if (entry.startsWith('.')) continue;
  const dir = path.join(NM, entry);

  // handle scoped packages
  const pkgDirs = entry.startsWith('@')
    ? fs.readdirSync(dir).map((s) => path.join(dir, s))
    : [dir];

  for (const pd of pkgDirs) {
    const pjPath = path.join(pd, 'package.json');
    if (!fs.existsSync(pjPath)) continue;
    checked++;
    let pj;
    try {
      pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'));
    } catch {
      continue;
    }

    const typesField = pj.types || pj.typings;
    const mainField = pj.main || 'index.js';

    // Case 1: declares types but the file is absent
    if (typesField) {
      const tp = path.join(pd, typesField);
      if (!fs.existsSync(tp)) {
        problems.push({ pkg: pj.name || pd, issue: 'declared types missing', file: typesField });
      }
    }

    // Case 2: ships .d.ts files but none for the main entry
    const files = walk(pd);
    const hasDts = files.some((f) => f.endsWith('.d.ts'));
    const hasJs = files.some((f) => f.endsWith('.js'));
    if (!typesField && hasDts) {
      const dtsCount = files.filter((f) => f.endsWith('.d.ts')).length;
      const entryDts = mainField.replace(/\.js$/, '.d.ts');
      if (!files.includes(entryDts) && dtsCount < 3) {
        problems.push({
          pkg: pj.name || pd,
          issue: `has ${dtsCount} d.ts but no entry types`,
          file: mainField,
        });
      }
    }

    // Case 3: package has runtime js but zero .d.ts and zero types field
    if (hasJs && !hasDts && !typesField && !pj.typings) {
      // only flag if it looks like a TS-authored package
      const srcHasTs = files.some((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
      if (srcHasTs) {
        problems.push({ pkg: pj.name || pd, issue: 'TS sources but no declarations', file: '' });
      }
    }
  }
}

console.log('packages checked:', checked);
console.log('packages with type problems:', problems.length);
for (const p of problems) {
  console.log(`  ${p.pkg}: ${p.issue}${p.file ? ' -> ' + p.file : ''}`);
}
