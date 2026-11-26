// Exports the live data (database/data/db.json) as ONE PostgreSQL / Supabase file:
// the schema (database/schema.sql) + INSERTs for every record → database/export.sql
//   npm run export-sql      then paste database/export.sql into the Supabase SQL editor (or: psql "$DATABASE_URL" -f database/export.sql)
// Safe to run again on the same database: existing rows are skipped (ON CONFLICT DO NOTHING).
// Login sessions, OTP codes and API keys / secrets are NOT exported. Vendor document files stay in database/data/docs.
// (With Supabase connected — SUPABASE_URL + key, see README — the server keeps Supabase up to date by itself and this
// file is only needed for a one-off copy.)
const fs = require('fs');
const path = require('path');
const { TABLES, JSON_SCALARS, buildRows } = require('./rows');
const ROOT = path.join(__dirname, '..');

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const db = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'db.json'), 'utf8'));
const out = [fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'), '', 'BEGIN;'];

// SQL literal: text quoted, booleans TRUE/FALSE, lists / objects as JSON text (cast to JSONB by the column)
const lit = v => (v == null ? 'NULL' : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : typeof v === 'number' ? (Number.isFinite(v) ? String(v) : 'NULL')
  : `'${(typeof v === 'object' ? JSON.stringify(v) : String(v)).replace(/'/g, "''")}'`);
const counts = {};
const rows = buildRows(db);
for (const [table] of TABLES) for (const row of rows[table]) {
  // a JSONB column holding plain text / a number ("all", 99) is written as JSON text
  for (const c of JSON_SCALARS[table] || []) if (row[c] != null && typeof row[c] !== 'object') row[c] = JSON.stringify(row[c]);
  const cols = Object.keys(row);
  out.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(c => lit(row[c])).join(', ')}) ON CONFLICT DO NOTHING;`);
  counts[table] = (counts[table] || 0) + 1;
}

out.push('COMMIT;', '');
const file = process.env.EXPORT_FILE ? path.resolve(process.env.EXPORT_FILE) : path.join(__dirname, 'export.sql'); // EXPORT_FILE: write elsewhere (tests)
fs.writeFileSync(file, out.join('\n'));
console.log('Wrote', path.relative(ROOT, file));
for (const [t, n] of Object.entries(counts)) console.log(' ', t.padEnd(22), n);
