// Settings from the project's .env file (KEY=value lines) for `npm start` on a laptop or VPS. Loaded before
// anything else reads process.env; values the host already set (Docker, Render, the shell) win.
const fs = require('fs');
const path = require('path');
try {
  for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    const v = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (v !== '') process.env[m[1]] = v; // empty lines in the example (KEY=) set nothing
  }
} catch { /* no .env file */ }
