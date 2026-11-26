// Syntax check for every server and browser script (no dependencies): `npm run check`
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const files = ['backend', 'scripts', 'database', path.join('frontend', 'js')]
  .flatMap(d => fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.js')).map(f => path.join(d, f)));
let bad = 0;
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' }); }
  catch (e) { bad++; console.error(`✗ ${f}\n${String(e.stderr || e.message)}`); }
}
console.log(`${files.length - bad}/${files.length} files OK`);
process.exit(bad ? 1 : 0);
