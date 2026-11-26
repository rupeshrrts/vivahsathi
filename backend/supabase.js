// Live copy of the data in Supabase (PostgreSQL), kept up to date by the server itself.
// The site keeps working from its own data file (fast, and it still works when the internet drops); every change is
// sent to Supabase a few seconds later — only the rows that changed, and rows deleted here are deleted there — plus
// a full snapshot, so a new server with an empty data folder starts from Supabase. With an access token the tables
// are also created / brought up to date from database/schema.sql at every start: a code update never needs SQL by hand.
// Settings: SUPABASE_URL + SUPABASE_SERVICE_KEY (+ SUPABASE_ACCESS_TOKEN), or Admin → Go-live, Payments & SMS.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { TABLES, buildRows } = require('../database/rows');

const SCHEMA_FILE = path.join(__dirname, '..', 'database', 'schema.sql');
const API_BASE = () => process.env.SUPABASE_API_BASE || 'https://api.supabase.com'; // only changed for tests
const PAGE = 1000, CHUNK = 500;
const hash = v => crypto.createHash('sha1').update(JSON.stringify(v)).digest('hex');
// https://abcd.supabase.co → abcd (the project's id in the Supabase management API)
const projectRef = url => { try { const h = new URL(url).hostname; return h.endsWith('.supabase.co') ? h.split('.')[0] : process.env.SUPABASE_PROJECT_REF || 'local'; } catch { return ''; } };
// the snapshot: everything except login sessions and keys
const snapshotOf = db => { const { sessions, secrets, ...rest } = db; return rest; };
// values for PostgREST's in.(…) filter, each double-quoted
const inList = vals => `(${vals.map(v => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`;
const enc = encodeURIComponent;

// Before the server loads its data: a new server (no data file yet) takes the last snapshot from Supabase.
// Runs a short child process so it can wait for the network while the server is still starting.
function restoreIfEmpty(dbFile) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (fs.existsSync(dbFile) || !url || !key) return '';
  const script = `(async()=>{const r=await fetch(process.env.U+'/rest/v1/app_snapshot?id=eq.main&select=data,saved_at',{headers:{apikey:process.env.K,Authorization:'Bearer '+process.env.K}});
    if(!r.ok){console.log('ERR '+r.status);return}const a=await r.json();if(!a.length||!a[0].data){console.log('EMPTY');return}
    require('fs').writeFileSync(process.env.F,JSON.stringify({...a[0].data,sessions:{}},null,2));console.log('OK '+a[0].saved_at)})().catch(e=>console.log('ERR '+e.message))`;
  try {
    const out = execFileSync(process.execPath, ['-e', script], { env: { ...process.env, U: url.replace(/\/$/, ''), K: key, F: dbFile }, timeout: 60e3, encoding: 'utf8' }).trim();
    return out.startsWith('OK') ? `Data restored from Supabase (snapshot of ${out.slice(3)})` : out === 'EMPTY' ? '' : `Supabase restore failed: ${out.slice(4)}`;
  } catch (e) { return 'Supabase restore failed: ' + e.message; }
}

function setupSupabase({ getDb, config }) {
  const st = { ok: null, lastSyncAt: null, lastError: '', lastErrorAt: null, lastDurationMs: 0, rowsSent: 0, running: false, pending: false, schemaAppliedAt: null, schemaError: '', snapshotAt: null, restored: '' };
  // what Supabase already has: table → Map(row key → hash of the row); null = not known (the next sync compares all)
  let sent = null;
  let timer = null, firstChangeAt = 0, again = false, failures = 0, lastSnapshot = 0, current = null, needSchema = false;
  const on = () => { const c = config(); return !!(c.url && c.key); };

  async function rest(c, method, pq, body, prefer) {
    const res = await fetch(c.url.replace(/\/$/, '') + '/rest/v1/' + pq, { method, headers: { apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    if (!res.ok) {
      let m = text; try { const j = JSON.parse(text); m = j.message || j.error || text; if (/does not exist|PGRST205|schema cache/i.test(text)) m += ' — the tables are missing: add the Supabase access token (tables are then made automatically) or run database/schema.sql once in the Supabase SQL editor'; } catch { /* plain text */ }
      throw new Error(`${method} ${pq.split('?')[0]} → ${res.status}: ${String(m).slice(0, 400)}`);
    }
    return text ? JSON.parse(text) : null;
  }
  // every row of a table, a page at a time (Supabase sends at most 1000 per request)
  async function fetchAll(c, table, select) {
    const all = [];
    for (let off = 0; ; off += PAGE) { const page = await rest(c, 'GET', `${table}?select=${select}&limit=${PAGE}&offset=${off}`); all.push(...page); if (page.length < PAGE) return all; }
  }
  const upsert = async (c, table, key, rows) => { for (let i = 0; i < rows.length; i += CHUNK) await rest(c, 'POST', `${table}?on_conflict=${key.join(',')}`, rows.slice(i, i + CHUNK), 'resolution=merge-duplicates,return=minimal,missing=default'); };
  const insert = async (c, table, rows) => { for (let i = 0; i < rows.length; i += CHUNK) await rest(c, 'POST', table, rows.slice(i, i + CHUNK), 'return=minimal,missing=default'); };
  const deleteIn = async (c, table, col, vals) => { for (let i = 0; i < vals.length; i += 100) await rest(c, 'DELETE', `${table}?${col}=in.${enc(inList(vals.slice(i, i + 100)))}`, null, 'return=minimal'); };

  // tables from database/schema.sql: made / brought up to date at start (needs the access token)
  async function applySchema() {
    const c = config(); if (!c.url || !c.token) return false;
    try {
      const sql = fs.readFileSync(SCHEMA_FILE, 'utf8') + "\nNOTIFY pgrst, 'reload schema';\n";
      const res = await fetch(`${API_BASE()}/v1/projects/${projectRef(c.url)}/database/query`, { method: 'POST', headers: { Authorization: 'Bearer ' + c.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: sql }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      st.schemaAppliedAt = new Date().toISOString(); st.schemaError = '';
      await new Promise(r => setTimeout(r, 1500)); // the API takes a moment to see new tables
      return true;
    } catch (e) { st.schemaError = 'Could not update the tables: ' + e.message; console.error('Supabase schema:', e.message); return false; }
  }

  async function syncNow(full) {
    const c = config();
    const rows = buildRows(getDb());
    const done = {}; let n = 0;
    // one shape per table (Supabase wants the same columns in every row of a request)
    for (const [t] of TABLES) { const cols = new Set(rows[t].flatMap(r => Object.keys(r))); rows[t] = rows[t].map(r => Object.fromEntries([...cols].map(k => [k, r[k] === undefined ? null : r[k]]))); }
    const known = full || !sent ? null : sent, next = {}, gone = [];
    for (const [t, m] of TABLES) {
      if (m.key) {
        const kOf = r => m.key.map(k => String(r[k])).join('\u0001'), now = new Map(rows[t].map(r => [kOf(r), hash(r)]));
        let before = known && known[t];
        if (!before) {
          // first sync: what is in Supabase now (rows only there are deleted below)
          const there = await fetchAll(c, t, m.key.join(','));
          before = new Map(there.map(r => [m.key.map(k => String(r[k])).join('\u0001'), '']));
        }
        const changed = rows[t].filter(r => before.get(kOf(r)) !== now.get(kOf(r)));
        if (changed.length) { await upsert(c, t, m.key, changed); n += changed.length; }
        const removed = [...before.keys()].filter(k => !now.has(k));
        if (removed.length) gone.push([t, m.key, removed]);
        next[t] = now;
      } else {
        // items / history: all rows of one order (booking) are replaced together when any of them changes
        const groups = new Map();
        for (const r of rows[t]) { const p = String(r[m.parent]); if (!groups.has(p)) groups.set(p, []); groups.get(p).push(r); }
        const now = new Map([...groups].map(([p, g]) => [p, hash(g)]));
        const before = known && known[t];
        if (!before) {
          await rest(c, 'DELETE', `${t}?${m.parent}=not.is.null`, null, 'return=minimal');
          const all = [...groups.values()].flat(); if (all.length) await insert(c, t, all); n += all.length;
        } else {
          const changed = [...now.keys()].filter(p => before.get(p) !== now.get(p)), removed = [...before.keys()].filter(p => !now.has(p));
          if (changed.length || removed.length) await deleteIn(c, t, m.parent, [...changed, ...removed]);
          const add = changed.flatMap(p => groups.get(p)); if (add.length) { await insert(c, t, add); n += add.length; }
        }
        next[t] = now;
      }
      done[t] = true;
    }
    // rows deleted here: children before parents
    for (const [t, key, removed] of gone.reverse()) {
      if (key.length === 1) await deleteIn(c, t, key[0], removed);
      else for (const k of removed) { const v = k.split('\u0001'); await rest(c, 'DELETE', `${t}?${key.map((col, i) => `${col}=eq.${enc(v[i])}`).join('&')}`, null, 'return=minimal'); }
    }
    sent = next;
    // the snapshot a new server starts from (at most every 30 s, and on every full sync)
    if (full || Date.now() - lastSnapshot > 30e3) {
      await rest(c, 'POST', 'app_snapshot?on_conflict=id', [{ id: 'main', data: snapshotOf(getDb()), saved_at: new Date().toISOString() }], 'resolution=merge-duplicates,return=minimal');
      lastSnapshot = Date.now(); st.snapshotAt = new Date().toISOString();
    }
    st.rowsSent += n;
    return n;
  }

  async function run(full) {
    if (!on()) return;
    if (st.running) { again = true; return current; }
    clearTimeout(timer); timer = null; firstChangeAt = 0; st.pending = false; st.running = true;
    const t0 = Date.now();
    current = (async () => {
      try {
        // tables missing last time (new project, someone dropped them): make them again first
        if (needSchema && config().token) { needSchema = false; await applySchema(); full = true; }
        await syncNow(full);
        st.ok = true; st.lastSyncAt = new Date().toISOString(); st.lastError = ''; failures = 0;
      } catch (e) {
        // try again later (15 s, 30 s, 1 min … at most 5 min) comparing everything again
        st.ok = false; st.lastError = e.message; st.lastErrorAt = new Date().toISOString(); sent = null; failures++;
        if (/tables are missing/.test(e.message)) needSchema = true;
        console.error('Supabase sync failed:', e.message);
        timer = setTimeout(() => run(), Math.min(300e3, 15e3 * 2 ** (failures - 1))); timer.unref();
      } finally {
        st.running = false; st.lastDurationMs = Date.now() - t0;
        if (again) { again = false; changed(); }
      }
    })();
    return current;
  }
  // a change was saved: send it within 2 s of the last change, never later than 10 s after the first
  function changed() {
    if (!on()) return;
    st.pending = true;
    if (!firstChangeAt) firstChangeAt = Date.now();
    clearTimeout(timer);
    timer = setTimeout(() => run(), Math.max(0, Math.min(2000, 10e3 - (Date.now() - firstChangeAt))));
    timer.unref();
  }
  // at start: tables up to date, then everything compared and sent
  async function start(restored) {
    st.restored = restored || '';
    if (!on()) return;
    await applySchema();
    await run(true);
  }
  // before the server stops: send what is waiting (the caller does not wait forever)
  const flush = () => (on() && (st.pending || st.running) ? (st.running ? current : run()) : Promise.resolve());
  const status = () => { const c = config(); return { configured: on(), url: c.url || '', ref: c.url ? projectRef(c.url) : '', hasKey: !!c.key, hasToken: !!c.token, fromEnv: !!process.env.SUPABASE_URL, ...st }; };
  return { changed, run: () => run(true), start, flush, status, applySchema };
}

module.exports = { setupSupabase, restoreIfEmpty };
