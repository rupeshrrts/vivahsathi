/* Vivah Saathi admin panel */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inr = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const fmtDate = d => d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtTime = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const evShort = e => String(e || '').split(' (')[0].split(' /')[0];
// every date of an order line: one function, or each rasam of a full-ceremony booking
const itemDates = i => ((i.dates || []).length ? i.dates : i.eventDate ? [{ event: i.event || '', date: i.eventDate }] : []);

const store = {
  get(k, d) { try { const v = localStorage.getItem('sa_admin_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sa_admin_' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const A = { token: store.get('token', null), user: null, meta: null, cats: [], districts: [], products: [], pending: 0, lastTotal: null };

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(A.token ? { Authorization: 'Bearer ' + A.token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (opts.blob && res.ok) return res.blob(); // private files (vendor documents)
  const data = await res.json().catch(() => ({}));
  if ((res.status === 401 || res.status === 403) && A.token && !path.includes('/auth/')) { A.token = null; store.set('token', null); loginPage(); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function toast(msg, isErr) {
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' err' : '');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
function modal(html, width = 780) {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg'; bg.id = 'modalBg';
  bg.innerHTML = `<div class="modal" style="max-width:${width}px"><button class="modal-x" aria-label="Close">×</button><div class="a-modal">${html}</div></div>`;
  $('.modal-x', bg).addEventListener('click', closeModal);
  bg.addEventListener('mousedown', e => { if (e.target === bg) closeModal(); });
  document.body.appendChild(bg);
  return bg;
}
function closeModal() { const m = $('#modalBg'); if (m) m.remove(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

const STATUS = ['placed', 'confirmed', 'dispatched', 'delivered', 'completed', 'cancelled'];
const STATUS_LABEL = { placed: 'New / Placed', confirmed: 'Confirmed', dispatched: 'Dispatched / Assigned', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled' };
// same rule as the server: forward only (steps may be skipped), cancel before delivery; cancelled / completed are final
const nextStatuses = s => (['cancelled', 'completed'].includes(s) ? [s]
  : [s, ...STATUS.filter(t => t !== 'cancelled' && STATUS.indexOf(t) > STATUS.indexOf(s)), ...(['placed', 'confirmed', 'dispatched'].includes(s) ? ['cancelled'] : [])]);
const statusSelect = (o, attr) => `<select ${attr}${nextStatuses(o.status).length === 1 ? ' disabled title="Final — cannot be changed"' : ''}>${nextStatuses(o.status).map(st => `<option value="${st}" ${st === o.status ? 'selected' : ''}>${STATUS_LABEL[st]}</option>`).join('')}</select>`;
// WhatsApp update for the customer, worded for the status, with the tracking link
const STATUS_MSG = { placed: 'humein mil gaya hai', confirmed: 'confirm ho gaya hai', dispatched: 'nikal chuka hai / team assign ho gayi hai', delivered: 'deliver ho gaya hai', completed: 'poora ho gaya hai — dhanyavaad!', cancelled: 'cancel ho gaya hai' };
const statusWa = (o, st = o.status, note = '') => {
  const due = Math.max(0, o.total - (o.paid || 0));
  return waTo(o.address.phone, `Namaste ${o.address.name} ji 🙏\n${A.meta.settings.siteName}: aapka order #${o.number} ${STATUS_MSG[st]}.${note ? '\n' + note : ''}\nTotal: ${inr(o.total)}${due && st !== 'cancelled' ? ` · Baaki: ${inr(due)}` : ''}\nOrder status dekhein: ${location.origin}/#/track?number=${o.number}`);
};
const pill = s => `<span class="status st-${s}">${STATUS_LABEL[s] || s}</span>`;
const catOf = id => A.cats.find(c => c.id === id) || { name: id, emoji: '🎁', color: '#f3eef0' };
const ph = (src, emoji, bg, cls = '') => `<div class="ph ${cls}" style="background:${h(bg || '#f6eef0')}">${h(emoji || '')}${src ? `<img src="${h(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>`;
const thumb = p => ph(p.image, p.emoji, catOf(p.cat).color, 'thumb');
const waTo = (phone, text) => `https://wa.me/91${String(phone).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(text)}`;

/* ---------------- New-order alerts ---------------- */
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18].forEach((t, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = i ? 1046 : 784; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.2, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
    });
  } catch { /* audio not allowed */ }
}
function setPendingBadge(n) {
  A.pending = n;
  const el = $('#nNew');
  if (el) { el.textContent = n; el.classList.toggle('hide', !n); }
  document.title = (n ? `(${n}) New orders · ` : '') + 'Vivah Saathi Admin';
}
async function pollOrders() {
  try {
    const r = await api('/api/admin/pending');
    if (A.lastTotal != null && r.total > A.lastTotal) {
      beep();
      toast(`${r.total - A.lastTotal} new order${r.total - A.lastTotal > 1 ? 's' : ''} received!`);
      const page = (location.hash.slice(2) || 'dashboard').split('?')[0];
      if (['dashboard', 'orders', 'calendar', 'vbookings'].includes(page) && !$('#modalBg')) route();
    }
    A.lastTotal = r.total;
    setPendingBadge(r.count);
    for (const [id, n] of [['#nVB', r.vrequests], ['#nVA', r.vapplications]]) { const el = $(id); if (el) { el.textContent = n; el.classList.toggle('hide', !n); } }
  } catch { /* offline, try again later */ }
}

/* ---------------- Login ---------------- */
function loginPage() {
  $('#root').innerHTML = `<div class="login-page"><form class="login-card" id="aLogin">
    <img src="/img/logo.svg" alt="" width="64" height="64" style="display:block;margin:0 auto 6px"><h1>Vivah Saathi</h1><p class="muted" style="margin-top:0">Admin Panel – login to manage orders & bookings</p>
    <div class="err hide" id="aErr"></div>
    <div class="field"><label>Admin mobile number</label><input name="phone" required autocomplete="username"></div>
    <div class="field"><label>Password</label><input name="password" type="password" required autocomplete="current-password"></div>
    <button class="btn btn-primary btn-block">Login</button>
    <p class="small muted" style="text-align:center;margin-bottom:0"><a class="link" href="/">← Back to store</a></p></form></div>`;
  $('#aLogin').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const r = await api('/api/auth/login', { method: 'POST', body: { ...Object.fromEntries(new FormData(e.target)), admin: true } });
      A.token = r.token; A.user = r.user; store.set('token', r.token);
      await start();
    } catch (err) { $('#aErr').textContent = err.message; $('#aErr').classList.remove('hide'); }
  });
}

/* ---------------- Shell ---------------- */
const PAGES = [
  ['dashboard', 'Dashboard & Analytics'], ['orders', 'Orders & Bookings'], ['calendar', 'Booking Calendar'],
  ['vendors', 'Vendors'], ['vbookings', 'Vendor Bookings'], ['vreviews', 'Reviews'], ['lagan', 'Lagan Dates'],
  ['products', 'Products & Services'], ['packages', 'Packages'], ['categories', 'Categories'],
  ['districts', 'Districts (BR / UP)'], ['users', 'Customers'], ['integrations', 'Go-live, Payments & SMS'], ['settings', 'Settings'],
];
const PAY_LABEL = { paid: '✓ Paid', partial: '✓ Part paid', pending: 'Online payment pending', verifying: 'UPI – verify UTR', refunded: 'Refunded', failed: '✗ Not paid', unpaid: '' };
const payPill = o => {
  if (['paid', 'partial', 'pending', 'verifying', 'refunded', 'failed'].includes(o.paymentStatus)) {
    const cls = { paid: 'st-delivered', partial: 'st-confirmed', pending: 'st-placed', verifying: 'st-placed', refunded: 'st-cancelled', failed: 'st-cancelled' }[o.paymentStatus];
    return `<span class="status ${cls}">${PAY_LABEL[o.paymentStatus]}${['paid', 'partial'].includes(o.paymentStatus) ? ' ' + inr(o.paid) : o.paymentStatus === 'verifying' ? ' ' + inr(o.utrAmount) : ''}</span>`;
  }
  return `<span class="small muted">${o.paymentMethod === 'upi' ? 'UPI (manual)' : 'COD'}${o.paid ? ' · paid ' + inr(o.paid) : ''}</span>`;
};
function shell() {
  $('#root').innerHTML = `<div class="a-shell">
    <aside class="a-side" id="aSide">
      <div class="a-brand"><div class="logo-mark"><img src="/img/logo-mark.svg" alt=""></div><div><b>${h(A.meta.settings.siteName)}</b><small>ADMIN PANEL</small></div></div>
      <nav class="a-nav">${PAGES.map(([k, l]) => `<a href="#/${k}" data-page="${k}"><span class="t">${l}</span>${k === 'orders' ? '<span class="n hide" id="nNew">0</span>' : k === 'vbookings' ? '<span class="n hide" id="nVB">0</span>' : k === 'vendors' ? '<span class="n hide" id="nVA">0</span>' : ''}</a>`).join('')}</nav>
      <div class="a-foot">Logged in as <b>${h(A.user.name)}</b><a href="/" target="_blank">Open store ↗</a><a id="aLogout">Logout</a></div>
    </aside>
    <div class="a-main"><div class="a-top"><button class="a-menu" id="aMenu">☰</button><h1 id="aTitle"></h1><div id="aTopRight"></div></div><div class="a-body" id="aBody"></div></div></div>`;
  $('#aMenu').addEventListener('click', () => $('#aSide').classList.toggle('open'));
  $('#aLogout').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    A.token = null; store.set('token', null); loginPage();
  });
}

async function route() {
  closeModal();
  const page = (location.hash.slice(2) || 'dashboard').split('?')[0];
  const def = PAGES.find(p => p[0] === page) || PAGES[0];
  $$('.a-nav a').forEach(a => a.classList.toggle('on', a.dataset.page === def[0]));
  $('#aSide').classList.remove('open');
  $('#aTitle').textContent = def[1];
  $('#aTopRight').innerHTML = '';
  $('#aBody').innerHTML = '<div class="spinner"></div>';
  try { await VIEWS[def[0]](); } catch (e) { $('#aBody').innerHTML = `<div class="a-card pad">${h(e.message)}</div>`; }
}

/* ---------------- Dashboard & analytics ---------------- */
let statRange = 30;
const RANGES = [[1, 'Today'], [7, '7 days'], [30, '30 days'], [180, '6 months'], [365, '1 year']];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// short rupees for chart labels: ₹950, ₹12.5k, ₹1.6L
const inrS = v => (v >= 1e5 ? '₹' + +(v / 1e5).toFixed(1) + 'L' : v >= 1e3 ? '₹' + +(v / 1e3).toFixed(1) + 'k' : '₹' + Math.round(v));
const PIE = ['#7a1031', '#d4a017', '#2563eb', '#16a34a', '#7c3aed', '#0f766e', '#9ca3af'];
// up to a month: one bar per day; 6 months / 1 year: one bar per month
function buckets(days) {
  if (days.length <= 31) return days.map(d => ({ ...d, label: days.length === 1 ? 'Today' : `${Number(d.date.slice(8))}/${Number(d.date.slice(5, 7))}`, tip: fmtDate(d.date) }));
  const m = {};
  for (const d of days) {
    const k = d.date.slice(0, 7), b = m[k] || (m[k] = { label: MON[Number(k.slice(5)) - 1], tip: `${MON[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`, revenue: 0, orders: 0, vbookings: 0, vvalue: 0, visits: 0, online: 0, onlineBack: 0 });
    for (const key of ['revenue', 'orders', 'vbookings', 'vvalue', 'visits', 'online', 'onlineBack']) b[key] += d[key] || 0;
  }
  return Object.values(m);
}
// bar chart; several series are stacked: series = [[key, color, name]]
function barChart(rows, series, fmt) {
  const W = 640, H = 190, B = 22, L = 46, T = 16, tot = r => series.reduce((s, [k]) => s + (r[k] || 0), 0);
  if (!rows.some(tot)) return '<p class="muted ch-empty">Nothing in this period</p>';
  const max = Math.max(1, ...rows.map(tot)), bw = (W - L - 4) / rows.length, w = Math.min(44, bw * .7);
  const y = v => H - B - v / max * (H - B - T), step = Math.ceil(rows.length / 10);
  const legend = series.length > 1 ? `<div class="ch-lg">${series.map(([, c, n]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}</div>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" class="chart">
    ${[0, .5, 1].map(f => `<line x1="${L}" x2="${W}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="#eee4e7"/><text x="${L - 6}" y="${y(max * f) + 4}" font-size="10" text-anchor="end" fill="#8a7f83">${fmt(max * f)}</text>`).join('')}
    ${rows.map((r, i) => {
      const x = L + i * bw + (bw - w) / 2;
      let base = 0;
      const rects = series.map(([k, c, n]) => { const v = r[k] || 0, y1 = y(base + v), y0 = y(base); base += v; return v ? `<rect x="${x}" y="${y1}" width="${w}" height="${Math.max(2, y0 - y1)}" rx="3" style="fill:${c}"><title>${r.tip}${series.length > 1 ? ' · ' + n : ''}: ${fmt(v)}</title></rect>` : ''; }).join('');
      return rects + (tot(r) && rows.length <= 12 ? `<text x="${x + w / 2}" y="${y(tot(r)) - 4}" font-size="10" font-weight="700" text-anchor="middle" fill="#3b0818">${fmt(tot(r))}</text>` : '')
        + (i % step === 0 ? `<text x="${x + w / 2}" y="${H - 6}" font-size="10" text-anchor="middle" fill="#8a7f83">${r.label}</text>` : '');
    }).join('')}
  </svg>${legend}`;
}
// circle chart: parts = [[name, value, color, shown value, note]]; pie = filled, else a ring with the total in the middle
function donut(parts, center, sub, pie) {
  const tot = parts.reduce((s, p) => s + p[1], 0), R = pie ? 25 : 40, SW = pie ? 50 : 18, C = 2 * Math.PI * R;
  let off = 0;
  const segs = tot ? parts.filter(p => p[1] > 0).map(([n, v, c, shown]) => {
    const len = v / tot * C, seg = `<circle r="${R}" cx="60" cy="60" fill="none" style="stroke:${c}" stroke-width="${SW}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"><title>${n}: ${shown ?? v} (${Math.round(v / tot * 100)}%)</title></circle>`;
    off += len; return seg;
  }).join('') : `<circle r="${R}" cx="60" cy="60" fill="none" stroke="#eee4e7" stroke-width="${SW}"/>`;
  const mid = pie ? '' : `<text x="60" y="${sub ? 60 : 65}" text-anchor="middle" font-size="15" font-weight="700" fill="#3b0818">${center}</text>${sub ? `<text x="60" y="75" text-anchor="middle" font-size="9" fill="#8a7f83">${sub}</text>` : ''}`;
  return `<div class="donut"><svg viewBox="0 0 120 120">${segs}${mid}</svg><div class="d-lgs">${tot ? parts.map(([n, v, c, shown, note]) => `<div class="d-lg${v ? '' : ' zero'}"><i style="background:${c}"></i><span>${n}</span><b>${shown ?? v}</b><em>${Math.round(v / tot * 100)}%${note ? ' · ' + note : ''}</em></div>`).join('') : '<p class="muted small">Nothing in this period</p>'}</div></div>`;
}
// top 5, rest as "Other"
const top5 = rows => rows.length > 6 ? [...rows.slice(0, 5), ['Other', rows.slice(5).reduce((s, r) => s + r[1], 0)]] : rows;
const hbars = (rows, fmt, color = 'var(--maroon)') => {
  const max = Math.max(1, ...rows.map(r => r[1]));
  return rows.length ? rows.map(([n, v]) => `<div class="hbar"><div class="lbl"><span>${n}</span><b>${fmt(v)}</b></div><div class="trk"><div class="fill" style="width:${Math.round(v / max * 100)}%;background:${color}"></div></div></div>`).join('') : '<p class="muted">No data yet</p>';
};

const VBL_DASH = { requested: ['New request', '#d97706'], confirmed: ['Confirmed', '#2563eb'], completed: ['Completed', 'var(--green)'], cancelled: ['Cancelled', '#9ca3af'], rejected: ['Rejected by vendor', '#b91c1c'] };
const n0 = v => Number(v || 0).toLocaleString('en-IN');
const stars = r => (r ? `★ ${r}` : '—');
const revList = (list, empty) => list.length ? list.map(r => `<div class="d-rev"><div><b>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</b> <span class="small">${h(r.item)}</span> <span class="small muted">· ${h(r.name)} · ${fmtDate(r.createdAt)}${r.status === 'hidden' ? ' · hidden' : ''}</span></div>${r.text ? `<div class="small">${h(r.text.length > 140 ? r.text.slice(0, 139) + '…' : r.text)}</div>` : ''}</div>`).join('') : `<p class="muted small">${empty}</p>`;
async function viewDashboard() {
  const s = await api('/api/admin/dashboard?days=' + statRange);
  $('#aTopRight').innerHTML = `<label class="st-pick">Show <select id="stRange">${RANGES.map(([d, n]) => `<option value="${d}"${d === statRange ? ' selected' : ''}>${d === 1 ? n : 'Last ' + n}</option>`).join('')}</select></label>`;
  $('#stRange').addEventListener('change', e => { statRange = Number(e.target.value); viewDashboard(); });
  const f = s.funnel, fmax = Math.max(1, f.visits, f.views, f.carts, f.checkouts, f.orders, f.vbookings || 0);
  const stateTotal = Object.values(s.byState).reduce((a, b) => a + b, 0) || 1;
  const sh = s.shop, v = s.vendor, ac = s.accounts, rp = s.reviews.product, rvv = s.reviews.vendor;
  const per = s.range === 1 ? 'today' : `last ${s.range === 365 ? 'year' : s.range === 180 ? '6 months' : s.range + ' days'}`;
  const rows = buckets(s.days), unit = s.range === 1 ? 'today' : s.range > 31 ? 'per month' : 'per day';
  const vb = v.byStatus, sideOf = k => s.side[k].orders + s.side[k].vbookings;
  const glance = [
    ['Money from shop orders', donut([['Received', sh.collected, '#16a34a', inr(sh.collected)], ['Still to collect', sh.due, '#d4a017', inr(sh.due)], ['Refunded', sh.refunds, '#9ca3af', inr(sh.refunds)]], inrS(sh.gross), 'order value')],
    ['How customers pay', donut([['Online (Razorpay)', 'online', '#2563eb'], ['Cash / COD', 'cod', '#d4a017'], ['Manual UPI', 'upi', '#7c3aed']].map(([n, k, c]) => [n, sh.byMethod[k] ? sh.byMethod[k].value : 0, c, inr(sh.byMethod[k] ? sh.byMethod[k].value : 0), `${sh.byMethod[k] ? sh.byMethod[k].n : 0} orders`]), '', '', true)],
    ['Sales by category', donut(top5(s.catSales).map(([n, val], i) => [h(n), val, PIE[i], inr(val)]), '', '', true)],
    ['Shop orders', donut([['New', 'placed', '#d97706'], ['Confirmed', 'confirmed', '#2563eb'], ['On the way', 'dispatched', '#7c3aed'], ['Delivered', 'delivered', '#16a34a'], ['Completed', 'completed', '#0f766e'], ['Cancelled', 'cancelled', '#9ca3af']].map(([n, k, c]) => [n, s.rangeStatus[k] || 0, c]), s.orders, 'orders')],
    ['Vendor bookings', donut(Object.entries(VBL_DASH).map(([k, [n, c]]) => [n, vb[k].n, c.startsWith('var') ? '#16a34a' : c, vb[k].n, inr(vb[k].value)]), v.requests, 'requests')],
    ['Whose wedding', donut([['Bete ki shaadi', 'boy', '#7a1031'], ['Beti ki shaadi', 'girl', '#d4a017'], ['Not told', 'unknown', '#9ca3af']].map(([n, k, c]) => [n, sideOf(k), c, sideOf(k), `${s.side[k].orders} shop · ${s.side[k].vbookings} vendor`]), '', '', true)],
  ];
  // what is left out of the real numbers, said once
  const notes = [v.sample.vendors && `${v.sample.vendors} sample vendor${v.sample.vendors > 1 ? 's' : ''}${v.sample.bookings ? ` (${v.sample.bookings} booking request${v.sample.bookings > 1 ? 's' : ''} to them, ${inr(v.sample.value)})` : ''}`, s.reviews.sample.n && `${s.reviews.sample.n} sample review${s.reviews.sample.n > 1 ? 's' : ''}`].filter(Boolean);
  // what the admin should act on now
  const word = (n, w) => (n === 1 ? w : w + 's');
  const soon = new Date(Date.parse(s.to) + 7 * 864e5).toISOString().slice(0, 10);
  const todo = [
    [s.byStatus.placed, n => `${word(n, 'shop order')} waiting to confirm`, '#/orders'],
    [v.waiting, n => `${word(n, 'vendor request')} waiting for the vendor${v.oldestWaitingHours ? ` (oldest ${v.oldestWaitingHours} h)` : ''}`, '#/vbookings'],
    [v.dueSoon, n => `${word(n, 'request')} released within 6 h if the vendor does not answer — call them`, '#/vbookings'],
    [v.expired, n => `${word(n, 'request')} released ${per} — vendor did not answer in time`, '#/vbookings'],
    [(v.visits || {}).open, n => `${word(n, 'site visit')} to fix with the tent house / decorator`, '#/vbookings'],
    [v.vendors.pending.length, n => `${word(n, 'new vendor')} to verify`, '#/vendors'],
    [s.upcoming.filter(u => u.date <= soon).length, n => `${word(n, 'function')} in the next 7 days`, '#/calendar'],
    [rp.attention.length + rvv.attention.length, n => `${word(n, 'low rating')} without a reply`, '#/vreviews'],
    [s.lowStock.length, n => `${word(n, 'product')} low on stock`, '#/products'],
    [s.aftercare.cancelRequests, n => `${word(n, 'cancellation request')} to answer`, '#/orders'],
    [s.aftercare.returnRequests, n => `${word(n, 'return request')} to check`, '#/orders'],
    [s.aftercare.pickups, n => `return ${word(n, 'pickup')} to collect`, '#/orders'],
  ].filter(t => t[0]).map(([n, txt, href]) => `<a class="todo-i" href="${href}"><b>${n}</b><span>${txt(n)}</span></a>`);
  if (sh.due) todo.push(`<a class="todo-i" href="#/orders"><b>${inr(sh.due)}</b><span>still to collect · orders ${per}</span></a>`);
  if (sh.refundDue) todo.unshift(`<a class="todo-i red" href="#/orders"><b>${inr(sh.refundDue)}</b><span>refund due on ${word(s.aftercare.refunds, 'order')} (cancelled or returned)</span></a>`);
  // vendor advances paid online to us: give back on bookings called off, pass on to vendors
  const vm = s.vendorMoney || {};
  if (vm.refundDue) todo.unshift(`<a class="todo-i red" href="#/vbookings"><b>${inr(vm.refundDue)}</b><span>to refund on ${word(vm.refundBookings, 'vendor booking')} called off after paying online</span></a>`);
  if (vm.toPayOut) todo.push(`<a class="todo-i" href="#/vbookings"><b>${inr(vm.toPayOut)}</b><span>paid online for ${word(vm.payoutBookings, 'vendor booking')} — to pass on to the vendor${vm.payoutBookings > 1 ? 's' : ''}</span></a>`);
  const rz = s.razorpay;
  if (rz.refundsFailed.n) todo.unshift(`<a class="todo-i red" href="#/orders"><b>${inr(rz.refundsFailed.value)}</b><span>${word(rz.refundsFailed.n, 'Razorpay refund')} sent back by the bank — refund again</span></a>`);
  if (rz.onHold) todo.push(`<a class="todo-i" href="#/orders"><b>${rz.onHold}</b><span>online ${word(rz.onHold, 'payment')} held by the bank — checked again every few minutes</span></a>`);
  // Razorpay money: switched off / test keys / live, then what came in and went back
  const RZ_M = [['upi', 'UPI', '#16a34a'], ['card', 'Card', '#2563eb'], ['netbanking', 'Net banking', '#7c3aed'], ['wallet', 'Wallet', '#d4a017'], ['emi', 'EMI', '#0f766e'], ['other', 'Other', '#9ca3af']];
  const rzState = rz.on ? (rz.testMode ? ['Test mode — no real money', '#d97706'] : ['Live', '#16a34a']) : ['Off — customers pay cash / UPI', '#6b7280'];
  const rzHasData = rz.allTime || rz.recent.length;
  const rzKpi = ([l, val, sub, c]) => `<div class="kpi" style="--c:${c}"><span class="kl">${l}</span><b>${val}</b><span class="ks">${sub}</span></div>`;
  const rzSection = `
    <h2 class="d-sec">Online payments — Razorpay <span class="chip" style="background:${rzState[1]};color:#fff">${rzState[0]}</span> <a class="btn btn-light btn-sm" href="#/integrations">Payment settings</a></h2>
    ${!rz.on && !rzHasData ? `<div class="a-card" style="margin-bottom:14px"><div class="pad"><p style="margin:0">Online payment is not switched on yet${rz.keys ? ' — keys are saved; turn on <b>Accept online payments</b>' : ' — add your Razorpay keys'} in <a class="link" href="#/integrations">Payment settings</a>. Money received, refunds, failed payments and payment methods show here once customers pay online.</p></div></div>` : `
    <div class="kpis k3">${[
      ['Received online', inr(rz.received), `${rz.receivedN} ${word(rz.receivedN, 'payment')} ${per}`, '#16a34a'],
      ['Refunded online', inr(rz.refunded), `${rz.refundedN} ${word(rz.refundedN, 'refund')}${rz.refundsOnWay.n ? ` · ${inr(rz.refundsOnWay.value)} on the way` : ''}`, '#9ca3af'],
      ['Net online', inr(rz.net), `${inr(rz.shop)} shop · ${inr(rz.vendor)} vendor bookings`, '#7a1031'],
      ['With us for vendors', inr(vm.toPayOut || 0), `${inr(vm.paidOut || 0)} passed on so far`, '#2563eb'],
      ['Waiting for payment', rz.waiting.n, rz.waiting.n ? `${inr(rz.waiting.value)} · held 30 min, then released` : 'Nobody paying right now', '#d97706'],
      ['Not completed', rz.abandoned.n + rz.failedAttempts, `${rz.abandoned.n} ${word(rz.abandoned.n, 'order')} not paid in time · ${rz.failedAttempts} failed ${word(rz.failedAttempts, 'attempt')}`, '#b91c1c'],
    ].map(rzKpi).join('')}</div>
    <div class="a-grid half">
      <div class="a-card"><h3>Online money (₹) ${unit}</h3><div class="pad">${barChart(rows, [['online', '#16a34a', 'Received'], ['onlineBack', '#9ca3af', 'Refunded']], inrS)}</div></div>
      <div class="a-card"><h3>Paid by</h3><div class="pad">${donut(RZ_M.map(([k, n, c]) => [n, rz.byMethod[k] ? rz.byMethod[k].value : 0, c, inr(rz.byMethod[k] ? rz.byMethod[k].value : 0), `${rz.byMethod[k] ? rz.byMethod[k].n : 0} ${word(rz.byMethod[k] ? rz.byMethod[k].n : 0, 'payment')}`]), '', '', true)}</div></div>
    </div>
    <div class="a-card" style="margin-bottom:14px"><h3>Latest online payments & refunds</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>Type</th><th>For</th><th>Customer</th><th>Method</th><th>Amount</th><th>Razorpay ID</th></tr></thead><tbody>
      ${rz.recent.map(x => `<tr><td>${fmtTime(x.at)}</td><td>${x.type === 'payment' ? '<span class="chip" style="background:#dcfce7;color:#166534">Payment</span>' : `<span class="chip" style="background:#f3f4f6">Refund${x.status === 'pending' ? ' · on the way' : x.status === 'failed' ? ' · failed' : ''}</span>`}</td><td>${x.kind === 'shop' ? `<a class="link" data-order="${h(x.id)}">#${h(x.number)}</a>` : `<a class="link" data-vb="${h(x.number)}">#${h(x.number)}</a> <span class="small muted">vendor</span>`}</td><td>${h(x.name)}</td><td>${x.type === 'payment' ? h((RZ_M.find(m => m[0] === x.method) || [, x.method || '—'])[1]) : '—'}</td><td><b>${x.type === 'refund' ? '−' : ''}${inr(x.amount)}</b></td><td class="small muted">${h(x.pid || x.rid || '')}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No online payments yet</td></tr>'}
    </tbody></table></div></div>
    <p class="small muted" style="margin:-6px 0 14px">Razorpay keeps its fee (about 2% + GST) and sends the rest to your bank account in about 2 working days — exact fees and settlements are in your Razorpay dashboard.${rz.on && !rz.webhook ? ' <b>Webhook secret not saved</b> — add it in Payment settings so payments are confirmed even when the customer closes the page.' : ''}</p>`}`;
  const hasVB = v.requests > 0, vbDist = s.districts.some(d => d.vbookings);
  const hasRev = rp.n + rvv.n + rp.attention.length + rvv.attention.length > 0;
  const vendorChecks = `<div class="a-card"><h3>Vendor checks <a class="btn btn-light btn-sm" href="#/vendors">Vendors</a></h3><div class="pad">
    <p class="small" style="margin:0">${v.vendors.live} live · ${v.vendors.real} real · ${v.vendors.sample} sample</p>
    ${v.vendors.pending.length || v.vendors.missingPapers.length ? `
    <h4 style="margin:12px 0 6px">Waiting for verification (${v.vendors.pending.length})</h4>
    ${v.vendors.pending.slice(0, 8).map(x => `<div class="small d-line"><span>${h(x.name)} <span class="muted">· ${h(x.type)} · ${h(x.district)}</span></span><span class="muted">${fmtDate(x.createdAt)}${x.docsPending ? ` · ${x.docsPending} papers to check` : ''}</span></div>`).join('') || '<p class="muted small">None</p>'}
    <h4 style="margin:12px 0 6px">Papers missing (${v.vendors.missingPapers.length})</h4>
    ${v.vendors.missingPapers.slice(0, 8).map(x => `<div class="small d-line"><span>${h(x.name)}${x.verified ? '' : ' <span class="muted">(unverified)</span>'}</span><span class="muted">${h(x.missing.join(', '))}</span></div>`).join('') || '<p class="muted small">None</p>'}`
    : '<p class="small muted" style="margin:8px 0 0">All vendors checked — nobody waiting, no papers missing.</p>'}
  </div></div>`;
  $('#aBody').innerHTML = `
    <div class="kpis">
      ${[
        ['Shop sales', inr(s.revenue), `${per}${sh.refunds ? ` · ${inr(sh.refunds)} refunded` : ''}`, '#7a1031'],
        ['Money received', inr(sh.collected), `${inr(sh.online)} online · <b class="due">${inr(sh.due)} still due</b>`, '#16a34a'],
        ['Shop orders', s.orders, `${s.byStatus.placed} waiting · ${s.cancelled} cancelled`, '#d97706'],
        ['Vendor bookings', v.requests, `${inr(v.value)} paid to vendors`, '#2563eb'],
        ['Vendors confirm', v.confirmRate == null ? '—' : v.confirmRate + '%', v.answered ? `${v.avgConfirmHours != null ? `avg ${v.avgConfirmHours} h · ` : ''}${v.waiting} waiting` : `No requests answered yet${v.waiting ? ` · ${v.waiting} waiting` : ''}`, '#0f766e'],
        ['Customers', s.customers, `${s.newCustomers} new · ${s.repeatCustomers} repeat`, '#0284c7'],
        ['Conversion', s.conversion + '%', `of ${n0(f.visits)} visits placed an order`, '#7c3aed'],
        ['Ratings', rp.n || rvv.n ? `${rp.avg || '—'} / ${rvv.avg || '—'}` : '—', rp.n || rvv.n ? `products (${rp.n}) / vendors (${rvv.n})` : 'No reviews yet', '#d4a017'],
      ].map(([l, val, sub, c]) => `<div class="kpi" style="--c:${c}"><span class="kl">${l}</span><b>${val}</b><span class="ks">${sub}</span></div>`).join('')}
    </div>
    ${notes.length ? `<p class="small muted" style="margin:-6px 0 14px">Real numbers only — not counted: ${notes.join(' and ')}. Days are India time (IST).</p>` : ''}
    <div class="todo">${todo.length ? `<span class="todo-h">Needs your attention</span>${todo.join('')}` : '<span class="todo-h ok">All caught up — nothing waiting</span>'}</div>
    ${rzSection}

    <h2 class="d-sec">At a glance <span class="small muted">${per}</span></h2>
    <div class="glance">${glance.map(([t, c]) => `<div class="a-card"><h3>${t}</h3><div class="pad">${c}</div></div>`).join('')}</div>
    <div class="a-grid half">
      <div class="a-card"><h3>Shop sales (₹) ${unit}</h3><div class="pad">${barChart(rows, [['revenue', '#7a1031', 'Shop sales']], inrS)}</div></div>
      <div class="a-card"><h3>Bookings ${unit}</h3><div class="pad">${barChart(rows, [['orders', '#7a1031', 'Shop orders'], ['vbookings', '#2563eb', 'Vendor bookings']], n => (Number.isInteger(n) ? n : ''))}</div></div>
    </div>

    <h2 class="d-sec">Coming up</h2>
    <div class="a-grid">
      <div class="a-card"><h3>Function dates — next 30 days <a class="btn btn-light btn-sm" href="#/calendar">Open calendar</a></h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Function</th><th>Booked</th><th>Customer</th><th>District</th><th>Ref</th></tr></thead><tbody>
        ${s.upcoming.length ? s.upcoming.map(u => `<tr><td><b>${fmtDate(u.date)}</b></td><td>${evShort(u.event) ? `<span class="chip chip-ev">${h(evShort(u.event))}</span>` : '<span class="muted">—</span>'}</td><td>${h(u.name)}<br><span class="small muted">${u.kind === 'vendor' ? 'Vendor' : 'Shop'}${u.status === 'requested' ? ' · request' : ''}</span></td><td>${h(u.customer)}${u.side ? ` <span class="small muted">${u.side === 'boy' ? 'bete ki' : u.side === 'girl' ? 'beti ki' : ''}</span>` : ''}<br><a class="small link" href="tel:${h(u.phone)}">${h(u.phone)}</a></td><td>${h(u.district)}</td><td>${u.kind === 'shop' ? `<a class="link" data-order="${h(u.refId)}">#${h(u.ref)}</a>` : `<a class="link" data-vb="${h(u.ref)}">#${h(u.ref)}</a>`}</td></tr>`).join('') : '<tr><td colspan="6" class="muted">No functions in the next 30 days</td></tr>'}
      </tbody></table></div></div>
      <div class="a-card"><h3>Busiest dates ahead</h3><div class="pad">
        ${hbars(s.busiest.map(d => [`${fmtDate(d.date)}${d.lagan ? ' <span class="tag-lagan">Lagan</span>' : ''} <span class="muted small">${d.shop} shop · ${d.vendor} vendor</span>`, d.shop + d.vendor]), n => `${n} ${word(n, 'booking')}`, '#9b1b42')}
        <p class="small muted" style="margin:8px 0 0">Next 90 days: ${s.laganLoad.days} lagan (shubh vivah) dates · <b>${s.laganLoad.onLagan}</b> bookings on lagan days, ${s.laganLoad.otherDays} on other days.</p>
      </div></div>
    </div>

    <h2 class="d-sec">Shop orders</h2>
    <div class="a-grid">
      <div class="a-card"><h3>Recent orders <a class="btn btn-light btn-sm" href="#/orders">All orders</a></h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Customer</th><th>District</th><th>Total</th><th>Status</th></tr></thead><tbody>
        ${s.recent.map(o => `<tr><td><a class="link" data-order="${o.id}">#${h(o.number)}</a><br><span class="small muted">${fmtTime(o.createdAt)}</span></td><td>${h(o.address.name)}${o.guest ? ' <span class="chip" style="background:#f3edef">Guest</span>' : ''}</td><td>${h(o.address.districtName)}</td><td><b>${inr(o.total)}</b></td><td>${pill(o.status)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No orders yet</td></tr>'}
      </tbody></table></div></div>
      <div class="a-card"><h3>Sales by state</h3><div class="pad">
        ${['Bihar', 'Uttar Pradesh'].map(st => `<div class="hbar"><div class="lbl"><span>${st}</span><b>${inr(s.byState[st] || 0)} <span class="muted small">${Math.round((s.byState[st] || 0) / stateTotal * 100)}%</span></b></div><div class="trk"><div class="fill" style="width:${Math.round((s.byState[st] || 0) / stateTotal * 100)}%;background:${st === 'Bihar' ? 'var(--maroon)' : 'var(--gold)'}"></div></div></div>`).join('')}
        ${s.lowStock.length ? `<h4 style="margin:16px 0 8px;color:#b91c1c">Low stock</h4>${s.lowStock.map(p => `<div class="small" style="display:flex;justify-content:space-between"><span>${h(p.name)}</span><b>${p.stock}</b></div>`).join('')}` : ''}
      </div></div>
    </div>
    <div class="a-grid">
      <div class="a-card"><h3>Top selling products & services</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Orders</th><th>Qty</th><th>Revenue</th></tr></thead><tbody>
        ${s.topProducts.map(p => `<tr><td>${h(p.name)}</td><td>${p.bookings}</td><td>${p.qty}</td><td><b>${inr(p.revenue)}</b></td></tr>`).join('') || '<tr><td colspan="4" class="muted">No sales yet</td></tr>'}
      </tbody></table></div></div>
      <div class="a-card"><h3>Bookings by function <span class="small muted">shop + vendor</span></h3><div class="pad">${hbars(s.byEvent.map(([e, n]) => [h(e), n]), n => `${n} ${word(n, 'booking')}`, '#9b1b42')}</div></div>
    </div>

    <h2 class="d-sec">Vendor marketplace <span class="small muted">paid to vendors directly — not shop revenue</span></h2>
    ${hasVB ? `
    <div class="a-grid">
      <div class="a-card"><h3>Vendor booking value (₹) ${unit} <a class="btn btn-light btn-sm" href="#/vbookings">All</a></h3><div class="pad">${barChart(rows, [['vvalue', '#2563eb', 'Vendor bookings']], inrS)}</div></div>
      <div class="a-card"><h3>Top vendors</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vendor</th><th>Bookings</th><th>Value</th></tr></thead><tbody>
        ${v.topVendors.map(x => `<tr><td>${h(x.name)}<br><span class="small muted">${h(x.type)}</span></td><td>${x.n}</td><td><b>${inr(x.value)}</b></td></tr>`).join('')}
      </tbody></table></div></div>
    </div>
    <div class="a-grid half">
      <div class="a-card"><h3>Bookings by vendor category</h3><div class="pad">${hbars(v.byType.map(t => [`${h(t.name)} · ${t.n}`, t.value]), inr, '#2563eb')}</div></div>
      ${vendorChecks}
    </div>
    ${v.rentals.length ? `<div class="a-card" style="margin-bottom:14px"><h3>Tent & rental items booked</h3><div class="pad">${hbars(v.rentals.map(r => [`${h(r.name)} · ${r.bookings} ${word(r.bookings, 'booking')} · ${inr(r.value)}`, r.qty]), q => n0(q) + ' pcs', '#0f766e')}</div></div>` : ''}`
    : `<div class="a-grid half">
      <div class="a-card"><h3>Vendor bookings <a class="btn btn-light btn-sm" href="#/vbookings">All</a></h3><div class="pad"><p class="muted" style="margin:0">No bookings to real vendors ${per}.${v.sample.bookings ? ` ${v.sample.bookings} to sample vendors are not counted.` : ''} Charts and top vendors show here once customers book.</p></div></div>
      ${vendorChecks}
    </div>`}

    <h2 class="d-sec">Customers</h2>
    <div class="a-grid">
      <div class="a-card"><h3>Top districts</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>District</th><th>Shop orders</th><th>Shop ₹</th>${vbDist ? '<th>Vendor bookings</th><th>Vendor ₹</th>' : ''}</tr></thead><tbody>
        ${s.districts.map(d => `<tr><td><b>${h(d.name)}</b></td><td>${d.orders}</td><td>${inr(d.shop)}</td>${vbDist ? `<td>${d.vbookings}</td><td>${inr(d.vendor)}</td>` : ''}</tr>`).join('') || `<tr><td colspan="5" class="muted">No orders yet</td></tr>`}
      </tbody></table></div></div>
      <div class="a-card"><h3>Who is booking</h3><div class="pad">
        <div class="kv"><span>New / repeat</span><b>${s.newCustomers} / ${s.repeatCustomers}</b><span>Accounts</span><b>${ac.users} <span class="small muted">(+${ac.newUsers} new, ${ac.verified} OTP-verified)</span></b>
          <span>Shop orders</span><b>${ac.orders.account} logged in · ${ac.orders.guest} guest${ac.orders.guestLinked ? ` <span class="small muted">(${ac.orders.guestLinked} matched to an account)</span>` : ''}</b>
          <span>Vendor bookings</span><b>${ac.vbookings.account} logged in · ${ac.vbookings.guest} guest</b></div>
      </div></div>
    </div>

    ${hasRev ? `<h2 class="d-sec">Reviews</h2>
    <div class="a-grid half">
      ${[['Product & service reviews', rp, '#/vreviews'], ['Vendor reviews', rvv, '#/vreviews']].map(([t, r, link]) => `<div class="a-card"><h3>${t} <a class="btn btn-light btn-sm" href="${link}">Manage</a></h3><div class="pad">
        <p style="margin-top:0"><b style="font-size:22px">${stars(r.avg)}</b> <span class="muted">${r.n} published · ${r.periodN} in ${per}${r.periodN ? ` (avg ${r.periodAvg})` : ''}</span></p>
        ${hbars(r.breakdown.map((n, i) => [`${5 - i} ★`, n]), n => n, 'var(--gold)')}
        <h4 style="margin:12px 0 6px;color:#b91c1c">Needs attention — 1–2 ★ without a reply (${r.attention.length})</h4>${revList(r.attention, 'Nothing waiting')}
        <h4 style="margin:12px 0 6px">Latest</h4>${revList(r.latest, 'No reviews yet')}
      </div></div>`).join('')}
    </div>` : ''}

    <h2 class="d-sec">Website traffic</h2>
    <div class="a-grid">
      <div class="a-card"><h3>Website visits ${unit}</h3><div class="pad">${barChart(rows, [['visits', '#d97706', 'Visits']], n => (Number.isInteger(n) ? n0(n) : ''))}</div></div>
      <div class="a-card"><h3>Conversion funnel</h3><div class="pad">
        ${[['Visits', f.visits], ['Product views', f.views], ['Added to cart', f.carts], ['Reached checkout', f.checkouts], ['Shop orders placed', f.orders], ['Vendor booking checkouts', f.vbookings || 0]].map(([n, val], i, arr) => `<div class="funnel-row"><div class="lbl"><span>${n}</span><b>${n0(val)}${i === 1 ? ` <span class="muted small">(${arr[0][1] ? (val / arr[0][1]).toFixed(1) : 0} per visit)</span>` : i ? ` <span class="muted small">(${arr[0][1] ? Math.min(100, Math.round(val / arr[0][1] * 100)) : 0}% of visits)</span>` : ''}</b></div><div class="trk"><div class="fill" style="width:${Math.max(2, Math.round(val / fmax * 100))}%"></div></div></div>`).join('')}
        <p class="small muted" style="margin:0">Counted per visit / page view; a cart checkout with several vendors is one vendor checkout.</p>
      </div></div>
    </div>
    <div class="a-grid half top">
      <div class="a-card"><h3>Most viewed (all time)</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Views</th><th>Add to cart</th></tr></thead><tbody>
        ${s.topViewed.map(p => `<tr><td>${h(p.name)}</td><td>${p.views}</td><td>${p.carts}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">No views yet</td></tr>'}
      </tbody></table></div></div>
      ${hasRev ? '' : `<div class="a-card"><h3>Reviews <a class="btn btn-light btn-sm" href="#/vreviews">Manage</a></h3><div class="pad"><p class="muted" style="margin:0">No reviews yet. Customers can rate a product or vendor after the service is done; ratings and low-rating alerts show here.</p></div></div>`}
    </div>`;
  $$('[data-order]').forEach(a => a.addEventListener('click', () => openOrderById(a.dataset.order, viewDashboard)));
  // vendor booking: open the Vendor Bookings list filtered to that number
  $$('[data-vb]').forEach(a => a.addEventListener('click', () => { vbFilter = { q: a.dataset.vb, status: '' }; location.hash = '#/vbookings'; }));
}

/* ---------------- Booking calendar ---------------- */
let calMonth = new Date().toISOString().slice(0, 7);
async function viewCalendar() {
  const { bookings } = await api('/api/admin/calendar?month=' + calMonth);
  const [y, mo] = calMonth.split('-').map(Number);
  const first = new Date(y, mo - 1, 1), daysIn = new Date(y, mo, 0).getDate(), pad = (first.getDay() + 6) % 7;
  const label = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const shift = n => { const d = new Date(y, mo - 1 + n, 1); calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; viewCalendar(); };
  const byDay = {};
  bookings.forEach(b => (byDay[b.date] = byDay[b.date] || []).push(b));
  const todayStr = new Date().toISOString().slice(0, 10);
  $('#aTopRight').innerHTML = `<div style="display:flex;gap:6px;align-items:center"><button class="btn btn-light btn-sm" id="cPrev">‹</button><b style="min-width:140px;text-align:center">${label}</b><button class="btn btn-light btn-sm" id="cNext">›</button></div>`;
  $('#cPrev').addEventListener('click', () => shift(-1)); $('#cNext').addEventListener('click', () => shift(1));
  const cells = [];
  for (let i = 0; i < pad; i++) cells.push('<div class="cal-cell empty"></div>');
  for (let d = 1; d <= daysIn; d++) {
    const ds = `${calMonth}-${String(d).padStart(2, '0')}`, list = byDay[ds] || [];
    cells.push(`<div class="cal-cell ${ds === todayStr ? 'today' : ''} ${list.length ? 'has' : ''}" data-day="${ds}"><div class="cal-d">${d}${list.length ? `<span class="cal-n">${list.length}</span>` : ''}</div>
      ${list.slice(0, 3).map(b => `<div class="cal-b st-${b.status}" title="${h(b.name)} – ${h(b.customer)}">${h(evShort(b.event))} · ${h(b.name)}</div>`).join('')}${list.length > 3 ? `<div class="small muted">+${list.length - 3} more</div>` : ''}</div>`);
  }
  $('#aBody').innerHTML = `<p class="small muted" style="margin-top:0">${bookings.length} bookings in ${label}. Click a day to see details. Colours show order status.</p>
    <div class="a-card"><div class="cal-head">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div>${d}</div>`).join('')}</div><div class="cal-grid">${cells.join('')}</div></div>
    <div class="a-card" style="margin-top:14px" id="dayBox"><h3>Select a day</h3></div>`;
  const showDay = ds => {
    const list = byDay[ds] || [];
    $('#dayBox').innerHTML = `<h3>${fmtDate(ds)} · ${list.length} booking${list.length === 1 ? '' : 's'}</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Function</th><th>Service</th><th>Qty</th><th>Customer</th><th>District</th><th>Order</th></tr></thead><tbody>
      ${list.map(b => `<tr><td><span class="chip chip-ev">${h(b.event || '—')}</span></td><td>${h(b.name)}</td><td>${b.qty} ${h(b.unit)}</td><td>${h(b.customer)}<br><a class="small link" href="tel:${h(b.phone)}">${h(b.phone)}</a></td><td>${h(b.district)}</td><td><a class="link" data-order="${b.orderId}">#${h(b.order)}</a> ${pill(b.status)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No bookings on this day</td></tr>'}
    </tbody></table></div>`;
    $$('[data-order]', $('#dayBox')).forEach(a => a.addEventListener('click', () => openOrderById(a.dataset.order, viewCalendar)));
  };
  $$('[data-day]').forEach(c => c.addEventListener('click', () => showDay(c.dataset.day)));
  const firstBooked = Object.keys(byDay).sort().find(d => d >= todayStr) || Object.keys(byDay).sort()[0];
  if (firstBooked) showDay(firstBooked);
}

/* ---------------- Orders ---------------- */
let orderFilter = { q: '', status: '', state: '', from: '', to: '' };
async function openOrderById(id, onDone) {
  const { orders } = await api('/api/admin/orders');
  openOrder(orders.find(o => o.id === id), onDone);
}

/* Cancel requests, returns, refunds and the delivery check inside an order */
// small flags in the order list: what is waiting on this order
const orderFlags = o => [
  o.cancelRequest && o.cancelRequest.status === 'requested' && 'Cancel requested',
  (o.returns || []).some(r => r.status === 'requested') && 'Return requested',
  (o.returns || []).some(r => r.status === 'approved') && 'Pickup pending',
  o.refundOwed > 0 && `Refund due ${inr(o.refundOwed)}`,
].filter(Boolean).map(f => `<br><span class="o-flag">${f}</span>`).join('');
const paidLeftA = o => Math.max(0, (o.paid || 0) - (o.refunds || []).filter(r => r.status !== 'failed').reduce((a, r) => a + r.amount, 0));
const RET_LABEL = { requested: 'Requested', approved: 'Pickup arranged', picked: 'Picked up · refund due', done: 'Done', rejected: 'Rejected' };
const thumbsA = list => (list || []).length ? `<div class="thumbs">${list.map(u => `<a href="${h(u)}" target="_blank" rel="noopener"><img src="${h(u)}" alt=""></a>`).join('')}</div>` : '';
function aftercareAdmin(o) {
  const out = [], cr = o.cancelRequest;
  if (cr && cr.status === 'requested') out.push(`<div class="box ac-box warn no-print"><h3>Cancellation requested</h3>
    <p style="margin:0 0 8px">${fmtTime(cr.at)} · <b>${h(cr.reason)}</b>${cr.note ? ` — ${h(cr.note)}` : ''}</p>
    <p class="small muted" style="margin:0 0 8px">The order is already dispatched / team assigned. Call the customer, then approve (the order is cancelled, stock goes back) or keep the order going with a reason.</p>
    <div class="toolbar"><input class="input grow" id="crNote" placeholder="Note for the customer (needed to keep the order)"><button type="button" class="btn btn-primary btn-sm" data-cr="approve">Approve cancellation</button><button type="button" class="btn btn-light btn-sm" data-cr="reject">Keep the order</button></div></div>`);
  if ((o.returns || []).length) out.push(`<div class="box ac-box"><h3>Returns</h3>${o.returns.map(r => `<div class="ac-ret">
      <div class="ac-ret-h"><b>${h(r.id)}</b><span class="chip">${r.kind === 'delivery' ? 'At delivery' : RET_LABEL[r.status]}</span><span>${r.items.map(x => `${h(x.name)} × ${x.qty}`).join(', ')} · <b>${inr(r.value)}</b></span></div>
      <div class="small">${h(r.reason)}${r.note ? ` — ${h(r.note)}` : ''} <span class="muted">· ${fmtTime(r.at)}</span></div>${thumbsA(r.photos || (r.photo ? [r.photo] : []))}
      ${r.status === 'rejected' ? `<div class="small" style="color:#b91c1c">Rejected — ${h((r.history.find(x => x.status === 'rejected') || {}).note || '')}</div>` : ''}
      ${['requested', 'approved'].includes(r.status) ? `<div class="toolbar no-print" style="margin-top:8px"><input class="input grow" data-rnote="${h(r.id)}" placeholder="${r.status === 'requested' ? 'Pickup time / note (a reason is needed to reject)' : 'Note (optional)'}">
        ${r.status === 'requested' ? `<button type="button" class="btn btn-primary btn-sm" data-ret="approve" data-rid="${h(r.id)}">Approve · arrange pickup</button><button type="button" class="btn btn-light btn-sm" data-ret="reject" data-rid="${h(r.id)}">Reject</button>` : ''}
        <button type="button" class="btn ${r.status === 'approved' ? 'btn-primary' : 'btn-light'} btn-sm" data-ret="picked" data-rid="${h(r.id)}">Items picked up${r.reason === 'Damaged / broken' ? '' : ' · stock back'}</button></div>` : ''}
    </div>`).join('')}</div>`);
  if (o.refundOwed > 0) out.push(`<div class="box ac-box warn no-print"><h3>Refund due · ${inr(o.refundOwed)}</h3>
    <p class="small" style="margin:0 0 8px">${o.rzpPaymentId ? 'Paid online — use “Refund via Razorpay” in Payment above, or record a refund sent another way:' : `Send it by UPI${o.refundTo ? ` to <b>${h(o.refundTo)}</b>` : ' (ask the customer for their UPI ID)'}, then record it here:`}</p>
    <div class="toolbar"><input class="input" type="number" id="mrAmt" min="1" max="${paidLeftA(o)}" value="${o.refundOwed}" style="width:110px;min-width:0">
      <select id="mrVia" class="input" style="width:auto"><option value="upi">UPI</option><option value="bank">Bank transfer</option><option value="cash">Cash</option></select>
      <input class="input grow" id="mrRef" placeholder="UPI / bank reference no."><button type="button" class="btn btn-primary btn-sm" id="mrBtn">Record refund</button></div></div>`);
  const saman = o.items.map((i, k) => ({ ...i, k })).filter(i => i.type === 'product');
  if (o.deliveryCheck) {
    const c = o.deliveryCheck;
    out.push(`<div class="box ac-box"><h3>Delivery check</h3><p class="small" style="margin:0 0 6px">${fmtTime(c.at)} · checked by <b>${h(c.checkedBy)}</b> · received by <b>${h(c.receivedBy)}</b></p>
      ${c.lines.map(l => `<div class="small d-line"><span>${h(l.name)}</span><span><b>${l.received}/${l.qty} OK</b>${l.damaged ? ` · <b style="color:#b91c1c">${l.damaged} damaged</b>` : ''}${l.short ? ` · <b style="color:#b91c1c">${l.short} short</b>` : ''}${l.note ? ` · ${h(l.note)}` : ''}</span></div>`).join('')}
      ${c.note ? `<p class="small" style="margin:6px 0 0">${h(c.note)}</p>` : ''}${thumbsA(c.photos)}</div>`);
  } else if (saman.length && ['placed', 'confirmed', 'dispatched'].includes(o.status)) {
    out.push(`<form class="box ac-box no-print" id="dcForm"><h3>Delivery check <span class="small muted" style="font-weight:500">count every item with the customer, then mark delivered</span></h3>
      <div class="tbl-wrap"><table class="tbl dc-tbl"><thead><tr><th>Item</th><th>Sent</th><th>Good</th><th>Damaged</th><th>Note</th></tr></thead><tbody>
        ${saman.map(i => `<tr data-dl="${i.k}"><td>${h(i.name)}</td><td><b>${i.qty}</b></td><td><input class="input" type="number" min="0" max="${i.qty}" value="${i.qty}" data-f="received"></td><td><input class="input" type="number" min="0" max="${i.qty}" value="0" data-f="damaged"></td><td><input class="input" data-f="note" placeholder="optional"></td></tr>`).join('')}
      </tbody></table></div>
      <p class="small muted" style="margin:6px 0 10px">Short = Sent − Good − Damaged. Short and damaged pieces come off the customer's bill (or are refunded) automatically.</p>
      <div class="grid-3"><div class="field"><label>Received by (customer side)</label><input name="receivedBy" required placeholder="Name of the person who took it"></div>
        <div class="field"><label>Checked by (our side)</label><input name="checkedBy" required value="${h(A.user.name)}"></div>
        <div class="field"><label>Photos — up to 4 <span class="small muted">(needed if anything is damaged)</span></label><input type="file" id="dcPics" accept="image/*" multiple><div id="dcPrev" class="thumbs"></div></div></div>
      <div class="field"><label>Note (optional)</label><input name="note" placeholder="e.g. Kit seal OK, counted in front of Ravi ji"></div>
      <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary">Save check & mark delivered</button></div></form>`);
  }
  return out.join('');
}
function wireAftercare(o, m, onDone) {
  const reopen = r => { toast('Saved ✓'); pollOrders(); openOrder(r.order, onDone); if (onDone) onDone(); };
  $$('[data-cr]', m).forEach(b => b.addEventListener('click', async () => {
    if (b.dataset.cr === 'approve' && !confirm('Cancel this order? Stock goes back and booked dates are freed.')) return;
    try { reopen(await api(`/api/admin/orders/${o.id}/cancel-request`, { method: 'POST', body: { action: b.dataset.cr, note: $('#crNote', m).value.trim() } })); } catch (e) { toast(e.message, true); }
  }));
  $$('[data-ret]', m).forEach(b => b.addEventListener('click', async () => {
    try { reopen(await api(`/api/admin/orders/${o.id}/returns/${b.dataset.rid}`, { method: 'POST', body: { action: b.dataset.ret, note: $(`[data-rnote="${b.dataset.rid}"]`, m).value.trim() } })); } catch (e) { toast(e.message, true); }
  }));
  const mr = $('#mrBtn', m);
  if (mr) mr.addEventListener('click', async () => {
    const amount = Number($('#mrAmt', m).value);
    if (!confirm(`Record a refund of ${inr(amount)} to the customer? Do this only after the money is sent.`)) return;
    try { reopen(await api(`/api/admin/orders/${o.id}/refund-manual`, { method: 'POST', body: { amount, via: $('#mrVia', m).value, ref: $('#mrRef', m).value.trim() } })); } catch (e) { toast(e.message, true); }
  });
  const dc = $('#dcForm', m);
  if (!dc) return;
  let pics = [];
  $('#dcPics', m).addEventListener('change', async e => {
    const files = [...e.target.files].slice(0, 4);
    try { pics = window.DOCUP ? await Promise.all(files.map(f => window.DOCUP.photoDataUrl(f))) : []; } catch (err) { pics = []; toast(err.message, true); }
    $('#dcPrev', m).innerHTML = pics.map(p => `<img src="${p}" alt="">`).join('');
  });
  dc.addEventListener('submit', async e => {
    e.preventDefault();
    const lines = $$('[data-dl]', dc).map(tr => ({ line: Number(tr.dataset.dl), received: Number($('[data-f=received]', tr).value), damaged: Number($('[data-f=damaged]', tr).value), note: $('[data-f=note]', tr).value.trim() }));
    const short = lines.reduce((a, l, i) => a + Math.max(0, Number($$('[data-dl]', dc)[i].children[1].textContent) - l.received - l.damaged), 0);
    if (short && !confirm(`${short} piece(s) are short. They will come off the customer's bill. Continue?`)) return;
    const fd = Object.fromEntries(new FormData(dc));
    try { reopen(await api(`/api/admin/orders/${o.id}/delivery-check`, { method: 'POST', body: { ...fd, lines, photos: pics } })); } catch (err) { toast(err.message, true); }
  });
}
async function viewOrders() {
  const { orders } = await api('/api/admin/orders');
  $('#aTopRight').innerHTML = '<button class="btn btn-ghost btn-sm" id="gstBtn">GST report</button> <button class="btn btn-ghost btn-sm" id="csvBtn">Export CSV</button>';
  $('#gstBtn').addEventListener('click', gstReport);
  const draw = () => {
    const f = orderFilter, q = f.q.toLowerCase();
    const list = orders.filter(o => (!f.status || o.status === f.status) && (!f.state || o.address.state === f.state)
      && (!f.from || o.createdAt.slice(0, 10) >= f.from) && (!f.to || o.createdAt.slice(0, 10) <= f.to)
      && (!q || [o.number, o.address.name, o.address.phone, o.address.districtName, o.userName, ...o.items.map(i => i.name + ' ' + (i.event || ''))].join(' ').toLowerCase().includes(q)));
    $('#oRows').innerHTML = list.length ? list.map(o => `<tr class="${o.status === 'placed' ? 'row-new' : ''}">
      <td><a class="link" data-open="${o.id}">#${h(o.number)}</a><br><span class="small muted">${fmtTime(o.createdAt)}</span></td>
      <td>${h(o.address.name)}${o.guest ? ' <span class="chip" style="background:#f3edef">Guest</span>' : ''}<br><a class="small link" href="tel:${h(o.address.phone)}">${h(o.address.phone)}</a></td>
      <td>${h(o.address.districtName)}<br><span class="small muted">${h(o.address.state)}</span></td>
      <td class="small">${o.items.slice(0, 2).map(i => `${h(i.name)}${i.eventDate ? ` <b>(${itemDates(i).map(d => `${h(evShort(d.event))} ${fmtDate(d.date)}`).join(', ')})</b>` : ''}`).join('<br>')}${o.items.length > 2 ? `<br><span class="muted">+${o.items.length - 2} more</span>` : ''}</td>
      <td><b>${inr(o.total)}</b><br>${payPill(o)}${orderFlags(o)}${o.invoice ? `<br><span class="small muted">${h(o.invoice.number)}</span>` : ''}</td>
      <td>${statusSelect(o, `class="input" style="padding:5px 8px;width:auto" data-status="${o.id}"`)}</td>
      <td class="actions">${o.status === 'placed' ? `<button class="btn btn-primary btn-sm" data-confirm="${o.id}">✓ Confirm</button> ` : ''}<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" title="Send status update on WhatsApp" href="${statusWa(o)}">WhatsApp</a> <button class="btn btn-light btn-sm" data-open="${o.id}">View</button></td></tr>`).join('') : '<tr><td colspan="7" class="muted" style="text-align:center;padding:30px">No orders match the filters</td></tr>';
    $('#oCount').textContent = `${list.length} orders · ${inr(list.filter(o => o.status !== 'cancelled').reduce((a, o) => a + o.total, 0))}`;
    $$('[data-open]').forEach(b => b.addEventListener('click', () => openOrder(orders.find(o => o.id === b.dataset.open), viewOrders)));
    const setStatus = async (id, status) => {
      if (status === 'cancelled' && !confirm('Cancel this order? Stock goes back and the booked dates are freed. This cannot be undone.')) return draw();
      try { await api('/api/admin/orders/' + id, { method: 'PUT', body: { status } }); toast('Status updated ✓'); pollOrders(); viewOrders(); } catch (e) { toast(e.message, true); draw(); }
    };
    $$('[data-status]').forEach(sel => sel.addEventListener('change', () => setStatus(sel.dataset.status, sel.value)));
    $$('[data-confirm]').forEach(b => b.addEventListener('click', () => setStatus(b.dataset.confirm, 'confirmed')));
    return list;
  };
  $('#aBody').innerHTML = `<div class="toolbar">
      <input class="input grow" id="oq" placeholder="Search order no., name, phone, district, item, function..." value="${h(orderFilter.q)}">
      <select id="ost"><option value="">All statuses</option>${STATUS.map(s => `<option value="${s}" ${orderFilter.status === s ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select>
      <select id="ostate"><option value="">Bihar + UP</option><option ${orderFilter.state === 'Bihar' ? 'selected' : ''}>Bihar</option><option ${orderFilter.state === 'Uttar Pradesh' ? 'selected' : ''}>Uttar Pradesh</option></select>
      <label class="small">From <input type="date" class="input" id="ofrom" value="${orderFilter.from}"></label>
      <label class="small">To <input type="date" class="input" id="oto" value="${orderFilter.to}"></label>
    </div>
    <div class="a-card"><h3><span id="oCount"></span><span class="small muted" style="font-weight:500">New orders are highlighted · this page refreshes when a new order arrives</span></h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Customer</th><th>District</th><th>Items / bookings</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody id="oRows"></tbody></table></div></div>`;
  let current = draw();
  const bind = (id, key, ev = 'change') => $(id).addEventListener(ev, e => { orderFilter[key] = e.target.value; current = draw(); });
  bind('#oq', 'q', 'input'); bind('#ost', 'status'); bind('#ostate', 'state'); bind('#ofrom', 'from'); bind('#oto', 'to');
  $('#csvBtn').addEventListener('click', () => {
    const rows = [['Order', 'Date', 'Customer', 'Phone', 'Address', 'District', 'State', 'Pincode', 'Items', 'Functions & dates', 'Subtotal', 'Delivery', 'Total', 'Payment', 'Status']];
    current.forEach(o => rows.push([o.number, o.createdAt.slice(0, 10), o.address.name, o.address.phone, `${o.address.line1} ${o.address.landmark} ${o.address.city}`.trim(), o.address.districtName, o.address.state, o.address.pincode,
      o.items.map(i => `${i.name} x${i.qty}`).join('; '), o.items.flatMap(i => itemDates(i).map(d => `${d.event} ${d.date}`)).join('; '), o.subtotal, o.delivery, o.total, o.paymentMethod, o.status]));
    // a cell starting with = + - @ would run as a formula in Excel: such text gets a leading ' (shown as plain text)
    const cell = v => { const s = String(v ?? ''); return `"${(/^[=+\-@\t\r]/.test(s) && typeof v !== 'number' ? "'" + s : s).replace(/"/g, '""')}"`; };
    const csv = rows.map(r => r.map(cell).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = `vivah-saathi-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  });
}

function openOrder(o, onDone) {
  if (!o) return;
  const s = A.meta.settings;
  const m = modal(`<h2>Order #${h(o.number)} ${pill(o.status)} ${o.guest ? '<span class="chip" style="background:#f3edef">Guest order</span>' : ''}${o.side ? ` <span class="side-tag">${o.side === 'boy' ? 'Ladke wale (bete ki shaadi)' : 'Ladki wale (beti ki shaadi)'}</span>` : ''}</h2>
    <p class="small muted" style="margin-top:-8px">Placed ${fmtTime(o.createdAt)} by ${h(o.userName)} (${h(o.userPhone)})</p>
    <div class="od-grid">
      <div class="box"><h3>Customer & address</h3><div class="kv">
        <span>Name</span><b>${h(o.address.name)}</b><span>Mobile</span><span><a class="link" href="tel:${h(o.address.phone)}">${h(o.address.phone)}</a> · <a class="link" target="_blank" rel="noopener" href="${waTo(o.address.phone, `Namaste ${o.address.name} ji, ${s.siteName} se baat kar rahe hain — aapke order #${o.number} ke baare mein.`)}">WhatsApp</a></span>
        <span>Address</span><span>${h(o.address.line1)}${o.address.landmark ? ', ' + h(o.address.landmark) : ''}${o.address.city ? ', ' + h(o.address.city) : ''}</span>
        <span>District</span><b>${h(o.address.districtName)}, ${h(o.address.state)}</b><span>Pincode</span><span>${h(o.address.pincode)}</span></div></div>
      <div class="box"><h3>Payment</h3><div class="kv">
        <span>Method</span><b>${o.paymentMethod === 'online' ? `Online – Razorpay (${o.payPlan === 'advance' ? 'advance' : 'full'})` : o.paymentMethod === 'upi' ? 'UPI / Bank (manual)' : 'Cash / Pay on event'}</b>
        <span>Status</span><span>${payPill(o)}</span>
        <span>Subtotal</span><span>${inr(o.subtotal)}</span><span>Discount</span><span>${inr(o.discount)}</span>
        <span>Delivery</span><span>${inr(o.delivery)}</span><span>Total</span><b>${inr(o.total)}</b><span>Advance due</span><span>${inr(o.advance)}</span><span>Paid so far</span><b>${inr(o.paid || 0)}</b>
        <span>Balance</span><b style="color:${o.total - (o.paid || 0) > 0 ? '#b91c1c' : 'var(--green)'}">${inr(Math.max(0, o.total - (o.paid || 0)))}</b>
        ${(o.payments || []).length ? (o.payments || []).map(p => `<span>Payment</span><span class="small">${inr(p.amount)} · ${h(p.method ? p.method.toUpperCase() : p.via)} · ${h(p.id)} · ${fmtTime(p.at)}</span>`).join('') : o.rzpPaymentId ? `<span>Razorpay ID</span><span class="small">${h(o.rzpPaymentId)}</span>` : ''}
        ${(o.refunds || []).map(r => `<span>Refund</span><span class="small">${inr(r.amount)} · ${h(r.id)}${r.via === 'razorpay' ? ` · <b class="${r.status === 'failed' ? 'bad-txt' : r.status === 'processed' ? 'ok-txt' : ''}">${r.status === 'failed' ? 'FAILED — refund again' : r.status === 'processed' ? 'reached the customer' : 'on its way (5–7 days)'}</b>` : ''}</span>`).join('')}</div>
        ${o.paymentStatus === 'verifying' ? `<div class="box no-print" style="margin:10px 0 0;background:#fff8e6"><b>Customer says they paid ${inr(o.utrAmount)} by UPI</b><br><span class="small">UPI reference (UTR): <b style="font-size:15px;letter-spacing:1px">${h(o.utr)}</b> — check it in your bank / UPI app, then:</span>
          <div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="btn btn-primary btn-sm" data-utr="approve">✓ Payment received</button><button type="button" class="btn btn-light btn-sm" data-utr="reject">✗ Not found</button></div></div>` : ''}
        ${['paid', 'partial', 'refunded'].includes(o.paymentStatus) && o.rzpPaymentId && paidLeftA(o) > 0 ? `<div class="toolbar no-print" style="margin:10px 0 0"><input class="input" type="number" min="1" max="${paidLeftA(o)}" value="${o.refundOwed || paidLeftA(o)}" id="refAmt" style="width:120px;min-width:0"><button type="button" class="btn btn-light btn-sm" id="refBtn">Refund via Razorpay</button></div>` : ''}</div>
    </div>
    <div class="box" style="margin-top:14px"><h3>Items & bookings</h3>
      ${o.items.map(i => `<div class="oi">${ph(i.image, i.emoji, '#fbeff3')}<div style="flex:1"><b>${h(i.name)}</b>${i.reviewed ? ' <span class="chip pay-paid">Reviewed</span>' : ''}<div class="small muted">${i.qty} × ${inr(i.price)} / ${h(i.unit)} · ${i.type === 'service' ? 'Booking' : 'Saman'}${i.eventDate ? ` · <b style="color:var(--maroon)">${itemDates(i).map(d => `${h(d.event || '')} – ${fmtDate(d.date)}`).join(' · ')}</b>` : ''}</div></div><b>${inr(i.price * i.qty)}</b></div>`).join('')}
      ${['delivered', 'completed'].includes(o.status) && o.items.some(i => !i.reviewed) ? `<div class="no-print" style="margin-top:8px"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${waTo(o.address.phone, `Namaste ${o.address.name} ji 🙏\n${s.siteName} se order #${o.number} ke liye dhanyavaad!\nAapko saman / seva kaisi lagi? 2 minute mein rating de dijiye — order number aur mobile se khulega:\n${location.origin}/#/track?number=${o.number}\nAapki rating doosre parivaron ki madad karegi.`)}">Ask for review on WhatsApp</a></div>` : ''}
      ${o.note ? `<p class="small" style="margin-bottom:0"><b>Customer note:</b> ${h(o.note)}</p>` : ''}</div>
    ${gstBox(o)}
    ${aftercareAdmin(o)}
    <div class="box"><h3>History</h3>${o.history.map(x => `<div class="small" style="padding:2px 0">${fmtTime(x.at)} — ${pill(x.status)} ${h(x.note)}</div>`).join('')}</div>
    <form id="oForm" class="box no-print"><h3>Update order</h3>
      <div class="grid-3">
        <div class="field"><label>Status</label>${statusSelect(o, 'name="status"')}</div>
        <div class="field"><label>Update for the customer (shown on Track Order)</label><input name="statusNote" maxlength="200" placeholder="e.g. Pandit Sharma ji assigned · 98xxxxxx"></div>
        <div class="field"><label>Amount received (₹)</label><input name="paid" type="number" min="0" value="${o.paid || 0}"></div>
      </div>
      <div class="field"><label>Message to customer (shown on Track Order)</label><textarea name="adminNote" rows="2">${h(o.adminNote)}</textarea></div>
      ${(A.meta.settings.business || {}).gstin && !o.invoice ? `<div class="grid-2"><div class="field"><label>Customer GSTIN <span class="small muted">— only for a business purchase (B2B)</span></label><input name="buyerGstin" maxlength="15" value="${h((o.buyer || {}).gstin || '')}" placeholder="Leave empty for a family"></div>
        <div class="field"><label>Customer's registered business name</label><input name="buyerName" maxlength="120" value="${h((o.buyer || {}).name || '')}" placeholder="As on their GST certificate"></div></div>` : ''}
      <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="btn btn-light" id="printBtn">Print</button><a class="btn btn-wa" target="_blank" rel="noopener" id="oWa" href="${statusWa(o)}">Send update on WhatsApp</a><button class="btn btn-primary">Save Changes</button></div>
    </form>`, 880);
  $('#printBtn', m).addEventListener('click', () => window.print());
  $$('[data-utr]', m).forEach(b => b.addEventListener('click', async () => {
    try { const r = await api(`/api/admin/orders/${o.id}/utr`, { method: 'POST', body: { action: b.dataset.utr } }); toast(b.dataset.utr === 'approve' ? 'Payment marked as received ✓' : 'Customer will be asked to pay again'); openOrder(r.order, onDone); } catch (e) { toast(e.message, true); }
  }));
  const refBtn = $('#refBtn', m);
  if (refBtn) refBtn.addEventListener('click', async () => {
    const amount = Number($('#refAmt', m).value);
    if (!confirm(`Refund ${inr(amount)} to the customer through Razorpay? This cannot be undone.`)) return;
    refBtn.disabled = true;
    try { const r = await api(`/api/admin/orders/${o.id}/refund`, { method: 'POST', body: { amount } }); toast('Refund started ✓'); openOrder(r.order, onDone); } catch (e) { toast(e.message, true); refBtn.disabled = false; }
  });
  wireAftercare(o, m, onDone);
  const invIssue = $('#invIssue', m), invView = $('#invView', m);
  if (invIssue) invIssue.addEventListener('click', async () => {
    invIssue.disabled = true;
    try { const r = await api(`/api/admin/orders/${o.id}/invoice`, { method: 'POST' }); toast(`Tax invoice ${r.order.invoice.number} issued ✓`); openOrder(r.order, onDone); } catch (e) { toast(e.message, true); invIssue.disabled = false; }
  });
  if (invView) invView.addEventListener('click', () => openBill(o));
  // the WhatsApp message follows the status / update being typed
  const fm = $('#oForm', m), syncWa = () => { $('#oWa', m).href = statusWa(o, fm.status.value, fm.statusNote.value.trim()); };
  fm.status.addEventListener('change', syncWa); fm.statusNote.addEventListener('input', syncWa);
  $('#oForm', m).addEventListener('submit', async e => {
    e.preventDefault();
    if (fm.status.value === 'cancelled' && o.status !== 'cancelled' && !confirm('Cancel this order? Stock goes back and the booked dates are freed. This cannot be undone.')) return;
    try {
      await api('/api/admin/orders/' + o.id, { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) });
      toast('Order updated ✓'); closeModal(); pollOrders(); onDone && onDone();
    } catch (err) { toast(err.message, true); }
  });
}

/* ---------------- GST: invoice box on an order, opening the printable invoice, monthly report ---------------- */
const inr2 = v => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function gstBox(o) {
  const inv = o.invoice, on = !!(A.meta.settings.business || {}).gstin;
  if (!on && !inv) return '';
  const t = inv && inv.totals;
  return `<div class="box"><h3>GST tax invoice</h3>${inv ? `<div class="kv">
      <span>Invoice</span><b>${h(inv.number)} · ${fmtDate(inv.date)}</b>
      <span>Taxable value</span><span>${inr2(t.taxable)}</span>
      <span>${inv.inter ? 'IGST' : 'CGST + SGST'}</span><span>${inv.inter ? inr2(t.igst) : `${inr2(t.cgst)} + ${inr2(t.sgst)}`}</span>
      <span>Invoice total</span><b>${inr2(t.amount)}</b>
      <span>Customer</span><span>${inv.buyer.gstin ? `B2B · GSTIN ${h(inv.buyer.gstin)}` : 'B2C (family)'} · place of supply ${h(inv.placeOfSupply)}</span>
      ${(o.creditNotes || []).map(c => `<span>Credit note</span><span>${h(c.number)} · ${fmtDate(c.date)} · ${inr2(c.totals.amount)} · ${h(c.reason)}</span>`).join('')}</div>
      <button type="button" class="btn btn-light btn-sm no-print" id="invView" style="margin-top:8px">View / print invoice</button>`
    : `<p class="small" style="margin:0 0 8px">${o.invoiceError ? `<b class="bad-txt">Not issued yet:</b> ${h(o.invoiceError)}` : o.status === 'cancelled' ? 'Cancelled before an invoice was issued — none needed.' : 'Issued automatically when the order is delivered / completed (Settings → Business details).'}</p>
      ${o.status !== 'cancelled' ? '<button type="button" class="btn btn-light btn-sm no-print" id="invIssue">Issue tax invoice now</button>' : ''}`}</div>`;
}
// the invoice page lives on the shop site and opens with order number + mobile: hand them over through this browser's storage
function openBill(o) {
  try { const k = 'sa_myorders', list = JSON.parse(localStorage.getItem(k) || '[]').filter(x => x.number !== o.number); localStorage.setItem(k, JSON.stringify([{ number: o.number, phone: o.address.phone }, ...list].slice(0, 40))); } catch { /* storage off: the page asks for the mobile */ }
  window.open('/#/bill/' + encodeURIComponent(o.number), '_blank', 'noopener');
}
async function gstReport() {
  let month = new Date(Date.now() + 330 * 60e3).toISOString().slice(0, 7);
  const m = modal(`<h2>GST report</h2><p class="small muted" style="margin-top:-6px">Tax invoices and credit notes of a month — give the CSV to your CA for GSTR-1 / GSTR-3B.</p>
    <div class="toolbar"><label class="small">Month <input type="month" class="input" id="gMonth" value="${month}"></label><button type="button" class="btn btn-primary btn-sm" id="gCsv">Download CSV</button></div><div id="gBody"><div class="spinner"></div></div>`, 860);
  let data = null;
  const load = async () => {
    $('#gBody', m).innerHTML = '<div class="spinner"></div>';
    try { data = await api('/api/admin/gst-report?month=' + month); } catch (e) { $('#gBody', m).innerHTML = `<p class="bad-txt">${h(e.message)}</p>`; return; }
    const n = data.net;
    $('#gBody', m).innerHTML = `${data.seller ? '' : '<p class="bad-txt">GST is off — add your GSTIN, registered name and address in Settings → Business details.</p>'}
      <div class="kpis" style="margin-top:10px">${[['Invoices', data.invoices], ['Credit notes', data.creditNotes], ['Taxable value (net)', inr2(n.taxable)], ['Tax (net)', `${inr2(n.cgst + n.sgst + n.igst)}`]].map(([l, v]) => `<div class="kpi" style="--c:#7a1031"><span class="kl">${l}</span><b>${v}</b></div>`).join('')}</div>
      <p class="small">CGST ${inr2(n.cgst)} · SGST ${inr2(n.sgst)} · IGST ${inr2(n.igst)} · invoice value (net) ${inr2(n.amount)}</p>
      ${data.missing.length ? `<p class="small bad-txt"><b>${data.missing.length} delivered order${data.missing.length > 1 ? 's' : ''} without an invoice:</b> ${data.missing.map(x => `#${h(x.number)}${x.error ? ` (${h(x.error)})` : ''}`).join(', ')}</p>` : ''}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Type</th><th>Number</th><th>Date</th><th>Customer</th><th>GST %</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total</th></tr></thead><tbody>
      ${data.rows.map(r => `<tr><td>${h(r.type)}</td><td>${h(r.number)}${r.against ? `<br><span class="small muted">against ${h(r.against)}</span>` : ''}</td><td>${fmtDate(r.date)}</td><td>${h(r.customer)}${r.gstin ? `<br><span class="small muted">${h(r.gstin)}</span>` : ''}</td><td>${r.rate}%</td><td>${inr2(r.taxable)}</td><td>${inr2(r.cgst)}</td><td>${inr2(r.sgst)}</td><td>${inr2(r.igst)}</td><td><b>${inr2(r.amount)}</b></td></tr>`).join('') || '<tr><td colspan="10" class="muted">No invoices in this month</td></tr>'}
      </tbody></table></div>`;
  };
  $('#gMonth', m).addEventListener('change', e => { month = e.target.value; load(); });
  $('#gCsv', m).addEventListener('click', () => {
    if (!data) return;
    const cell = v => { const s = String(v ?? ''); return `"${(/^[=+\-@\t\r]/.test(s) && typeof v !== 'number' ? "'" + s : s).replace(/"/g, '""')}"`; };
    const rows = [['GST report', data.month, data.seller ? `GSTIN ${data.seller.gstin}` : '', data.seller ? data.seller.name : ''], [],
      ['Type', 'Number', 'Date', 'Against invoice', 'Order', 'Customer', 'Customer GSTIN', 'B2B / B2C', 'Place of supply', 'GST %', 'Taxable value', 'CGST', 'SGST', 'IGST', 'Total'],
      ...data.rows.map(r => [r.type, r.number, r.date, r.against, r.order, r.customer, r.gstin, r.b2b ? 'B2B' : 'B2C', r.placeOfSupply, r.rate, r.taxable, r.cgst, r.sgst, r.igst, r.amount]),
      [], ['Net (invoices minus credit notes)', '', '', '', '', '', '', '', '', '', data.net.taxable, data.net.cgst, data.net.sgst, data.net.igst, data.net.amount],
      [], ['HSN / SAC summary'], ['HSN / SAC', 'GST %', 'Quantity (net)', 'Taxable value', 'CGST', 'SGST', 'IGST', 'Total'],
      ...data.hsn.map(x => [x.hsn || '(not set)', x.rate, x.qty, x.taxable, x.cgst, x.sgst, x.igst, x.amount])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv' }));
    a.download = `gst-report-${data.month}.csv`;
    a.click();
  });
  load();
}

/* ---------------- GST rate & HSN / SAC (categories, products) ---------------- */
// prices include GST; the tax invoice works the tax back from them. Set the rates with your CA — none are guessed here.
const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40];
const rateTxt = v => (v == null || v === '' ? '' : `${v}%`);
// cat = the category (its rate is what an empty product rate falls back to); for a category itself pass no cat
function gstFields(x, cat) {
  const own = x.gstRate == null || x.gstRate === '' ? '' : String(x.gstRate);
  return `<div class="field"><label>GST rate <span class="small muted">— the price includes it</span></label><select name="gstRate">
      <option value="">${cat ? `Same as category${cat.gstRate != null && cat.gstRate !== '' ? ` (${rateTxt(cat.gstRate)})` : ' (not set)'}` : 'Not set yet'}</option>
      ${GST_RATES.map(r => `<option value="${r}" ${own === String(r) ? 'selected' : ''}>${r}%${r === 0 ? ' (exempt / nil)' : ''}</option>`).join('')}</select></div>
    <div class="field"><label>HSN / SAC code <span class="small muted">— 4, 6 or 8 digits${cat ? '; empty = category\'s' : ''}</span></label><input name="hsn" inputmode="numeric" maxlength="8" pattern="\\d{4}(\\d{2}){0,2}" value="${h(x.hsn || '')}" placeholder="${h(cat && cat.hsn ? cat.hsn : 'HSN for goods, SAC (99…) for services')}"></div>`;
}

/* ---------------- Products ---------------- */
let prodFilter = { q: '', cat: '', type: '', status: '' };
async function viewProducts() {
  const { products } = await api('/api/admin/products');
  A.products = products;
  $('#aTopRight').innerHTML = '<button class="btn btn-gold btn-sm" id="addProd">+ Add Product / Service</button>';
  $('#addProd').addEventListener('click', () => editProduct(null));
  const draw = () => {
    const f = prodFilter, q = f.q.toLowerCase();
    const list = products.filter(p => (!f.cat || p.cat === f.cat) && (!f.type || p.type === f.type)
      && (!f.status || (f.status === 'active' ? p.active : f.status === 'hidden' ? !p.active : f.status === 'nophoto' ? !p.image : p.type === 'product' && p.stock < 10))
      && (!q || (p.name + ' ' + (p.nameHi || '')).toLowerCase().includes(q)));
    $('#pCount').textContent = `${list.length} of ${products.length} items`;
    $('#pRows').innerHTML = list.map(p => `<tr>
      <td>${thumb(p)}</td>
      <td><b>${h(p.name)}</b><br><span class="small muted">${h(p.nameHi || '')}</span>${p.featured ? ' <span class="chip" style="background:#fff1d6;color:#92400e">★ Featured</span>' : ''}</td>
      <td class="small">${h(catOf(p.cat).name)}</td>
      <td><span class="chip ${p.type === 'service' ? 'chip-svc' : 'chip-prod'}">${p.type === 'service' ? 'Booking' : 'Saman'}</span></td>
      <td><b>${inr(p.price)}</b><br><span class="small muted">${p.mrp > p.price ? `MRP ${inr(p.mrp)} · ` : ''}per ${h(p.unit)}</span></td>
      <td class="small">${p.type === 'service' ? `${p.dailyCapacity || 1} / date` : `<b style="color:${p.stock < 10 ? '#b91c1c' : 'inherit'}">${p.stock}</b> in stock`}</td>
      <td class="small">${p.districts === 'all' ? 'All districts' : `${p.districts.length} districts`}</td>
      <td><label class="switch" title="Show on store"><input type="checkbox" data-active="${p.id}" ${p.active ? 'checked' : ''}><span></span></label></td>
      <td class="actions"><button class="btn btn-light btn-sm" data-edit="${p.id}">Edit</button> <button class="btn btn-light btn-sm" data-del="${p.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan="9" class="muted" style="text-align:center;padding:30px">No items</td></tr>';
    $$('[data-edit]').forEach(b => b.addEventListener('click', () => editProduct(products.find(p => p.id === b.dataset.edit))));
    $$('[data-active]').forEach(c => c.addEventListener('change', async () => {
      try { await api('/api/admin/products/' + c.dataset.active, { method: 'PUT', body: { active: c.checked } }); products.find(p => p.id === c.dataset.active).active = c.checked; toast(c.checked ? 'Visible on store' : 'Hidden from store'); } catch (e) { toast(e.message, true); }
    }));
    $$('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const p = products.find(x => x.id === b.dataset.del);
      if (!confirm(`Delete "${p.name}" permanently? (Tip: use the switch to just hide it)`)) return;
      try { await api('/api/admin/products/' + p.id, { method: 'DELETE' }); toast('Deleted'); viewProducts(); } catch (e) { toast(e.message, true); }
    }));
  };
  $('#aBody').innerHTML = `<div class="toolbar">
      <input class="input grow" id="pq" placeholder="Search products & services..." value="${h(prodFilter.q)}">
      <select id="pcat"><option value="">All categories</option>${A.cats.map(c => `<option value="${c.id}" ${prodFilter.cat === c.id ? 'selected' : ''}>${h(c.name)}</option>`).join('')}</select>
      <select id="ptype"><option value="">Saman + Booking</option><option value="product" ${prodFilter.type === 'product' ? 'selected' : ''}>Saman (products)</option><option value="service" ${prodFilter.type === 'service' ? 'selected' : ''}>Booking (services)</option></select>
      <select id="pst"><option value="">Any status</option><option value="active" ${prodFilter.status === 'active' ? 'selected' : ''}>Visible</option><option value="hidden" ${prodFilter.status === 'hidden' ? 'selected' : ''}>Hidden</option><option value="low" ${prodFilter.status === 'low' ? 'selected' : ''}>Low stock (&lt;10)</option><option value="nophoto" ${prodFilter.status === 'nophoto' ? 'selected' : ''}>Without photo</option></select>
    </div>
    <div class="a-card"><h3 id="pCount"></h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Name</th><th>Category</th><th>Type</th><th>Price</th><th>Stock / slots</th><th>Available in</th><th>Visible</th><th></th></tr></thead><tbody id="pRows"></tbody></table></div></div>`;
  draw();
  const bind = (id, key, ev = 'change') => $(id).addEventListener(ev, e => { prodFilter[key] = e.target.value; draw(); });
  bind('#pq', 'q', 'input'); bind('#pcat', 'cat'); bind('#ptype', 'type'); bind('#pst', 'status');
}

// Upload helper: file input -> /api/admin/upload -> URL
function wireUpload(input, onUrl) {
  input.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast('Image must be under 5 MB', true);
    const rd = new FileReader();
    rd.onload = async () => { try { const r = await api('/api/admin/upload', { method: 'POST', body: { dataUrl: rd.result } }); onUrl(r.url); toast('Photo uploaded ✓'); } catch (err) { toast(err.message, true); } };
    rd.readAsDataURL(file);
  });
}

function editProduct(p) {
  const isNew = !p;
  p = p || { name: '', nameHi: '', cat: prodFilter.cat || A.cats[0].id, type: 'product', price: '', mrp: '', unit: 'piece', minQty: 1, emoji: '🎁', image: '', desc: '', includes: [], stock: 100, dailyCapacity: 5, defaultEvent: 'Shaadi (Vivah)', active: true, featured: false, districts: 'all' };
  const picked = new Set(p.districts === 'all' ? [] : p.districts);
  const m = modal(`<h2>${isNew ? 'Add product / service' : 'Edit: ' + h(p.name)}</h2>
    <form id="pForm">
      <div class="img-pick box">
        <div id="pPrev"></div>
        <div style="flex:1">
          <div class="field"><label>Photo – upload from phone / computer</label><input type="file" id="pFile" accept="image/png,image/jpeg,image/webp,image/gif"></div>
          <div class="field"><label>…or paste photo link (URL)</label><input name="image" value="${h(p.image)}" placeholder="https://..."></div>
          <div class="field" style="max-width:200px;margin:0"><label>Emoji (if no photo)</label><input name="emoji" maxlength="8" value="${h(p.emoji)}"></div>
        </div>
      </div>
      <div class="grid-2">
        <div class="field"><label>Name (English)</label><input name="name" required value="${h(p.name)}"></div>
        <div class="field"><label>Name (Hindi)</label><input name="nameHi" value="${h(p.nameHi)}"></div>
      </div>
      <div class="grid-3">
        <div class="field"><label>Category</label><select name="cat">${A.cats.map(c => `<option value="${c.id}" ${c.id === p.cat ? 'selected' : ''}>${h(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Type</label><select name="type"><option value="product" ${p.type === 'product' ? 'selected' : ''}>Saman – home delivery</option><option value="service" ${p.type === 'service' ? 'selected' : ''}>Booking – for a function date</option></select></div>
        <div class="field"><label>Unit (per ...)</label><input name="unit" value="${h(p.unit)}" placeholder="kg, kit, day, plate, event"></div>
        <div class="field"><label>Selling price (₹)</label><input name="price" type="number" min="1" required value="${h(p.price)}"></div>
        <div class="field"><label>MRP (₹) <span class="small muted">— only the real printed MRP</span></label><input name="mrp" type="number" min="0" value="${h(p.mrp > p.price ? p.mrp : '')}" placeholder="Leave empty if there is none"><span class="small muted">Customers see "% off" only when this is higher than your price.</span></div>
        <div class="field"><label>Minimum quantity</label><input name="minQty" type="number" min="1" value="${h(p.minQty || 1)}"></div>
        ${gstFields(p, (A.cats.find(c => c.id === p.cat) || {}))}
        <div class="field svc-only"><label>Bookings per date <span class="small muted">— how many teams / pandits / cars we can send on one date; that date shows “Fully booked” once all are taken</span></label><input name="dailyCapacity" type="number" min="1" value="${h(p.dailyCapacity || 1)}"></div>
        <div class="field svc-only"><label>Usual function</label><select name="defaultEvent">${A.meta.events.map(e => `<option ${e === p.defaultEvent ? 'selected' : ''}>${h(e)}</option>`).join('')}</select></div>
        <div class="field prod-only"><label>Stock</label><input name="stock" type="number" min="0" value="${h(p.stock)}"></div>
        <div class="field"><label>Visible on store</label><label class="switch"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}><span></span></label></div>
        <div class="field"><label>Featured on home page</label><label class="switch"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}><span></span></label></div>
      </div>
      <div class="field svc-only"><label>Full ceremony — covers these rasams in one booking <span class="small muted">— customer gives a date for each (e.g. Pandit Ji full shaadi). Leave empty for a one-function service.</span></label>
        <div class="vf-days">${A.meta.events.map(e => `<label><input type="checkbox" name="covers" value="${h(e)}" ${(p.covers || []).includes(e) ? 'checked' : ''}> ${h(e)}</label>`).join('')}</div></div>
      <div class="field svc-only"><label>Booked for which functions? <span class="small muted">— none ticked = any function (tent, photographer…). Tick e.g. only Tilak for a Tilak puja.</span></label>
        <div class="vf-days">${A.meta.events.map(e => `<label><input type="checkbox" name="events" value="${h(e)}" ${(p.events || []).includes(e) ? 'checked' : ''}> ${h(e)}</label>`).join('')}</div></div>
      <div class="field"><label>Description</label><textarea name="desc" rows="3">${h(p.desc)}</textarea></div>
      <div class="field"><label>What's included (one per line)</label><textarea name="includes" rows="4">${h((p.includes || []).join('\n'))}</textarea></div>
      <div class="field svc-only"><label>Tent size <span class="small muted">— e.g. <code>40×60 ft</code>, or <code>per 1000 sq ft</code> for tents sold by area. Customers then see the area, how many guests fit, and a drawn top view of the set-up.</span></label><input name="tentSize" value="${h(p.tentSize || '')}" placeholder="40×60 ft"></div>
      <div class="field"><label>More photos — how it looks after set-up <span class="small muted">(one link per line; upload with the image button above and paste the link)</span></label><textarea name="gallery" rows="3" placeholder="/uploads/img_….jpg">${h((p.gallery || []).join('\n'))}</textarea></div>
      <div class="field prod-only"><label>Styles / designs with photo <span class="small muted">— one per line: <b>name | price | photo link | note | size (optional)</b>, e.g. <code>Genda + rose | 1800 | https://… | Orange with red roses</code>. Customers pick a style from photo cards; the card price shows "from" the lowest. Upload a photo with the image button above and paste its link. Leave empty for one style.</span></label>
        <textarea name="styles" rows="5" placeholder="Orange genda mala | 1200 | /uploads/img_….jpg | Classic 5 ft strings">${h((p.styles || []).map(x => [x.name, x.price, x.photo || '', x.note || '', x.unit || ''].join(' | ').replace(/( \| )+$/, '')).join('\n'))}</textarea></div>
      <div class="field prod-only"><label>These options are</label><select name="optKind">${[['', 'Styles / designs — photo cards'], ['brand', 'Companies / brands — a dropdown with each company\'s price (e.g. Rasgulla tin: Haldiram\'s | 380, Bikaji | 340)']].map(([k, t]) => `<option value="${k}" ${(p.optKind || '') === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <span class="small muted">For the same product from different companies, put one company per line above (name | price | photo of that company's pack) and choose "Companies / brands".</span></div>
      <div class="field prod-only"><label>Kit items with extra price <span class="small muted">— one per line: <b>name | in the kit | sold extra per | price</b>, e.g. <code>Ghee | 500 g | 500 g | 330</code>. Customers see the full list, can add more of any item, and add items from your other kits of this category. Leave empty for a normal product.</span></label>
        <textarea name="kitItems" rows="6" placeholder="Roli | 50 g | 50 g pack | 20">${h((p.kitItems || []).map(x => `${x.name} | ${x.inKit} | ${x.unit} | ${x.price}`).join('\n'))}</textarea></div>
      <div class="field"><label>Available in</label>
        <div class="dpick">
          <label><input type="radio" name="dmode" value="all" ${p.districts === 'all' ? 'checked' : ''}> All districts of Bihar & UP</label>
          <label><input type="radio" name="dmode" value="some" ${p.districts !== 'all' ? 'checked' : ''}> Only selected districts <span class="muted" id="dCnt"></span></label>
          <div id="dBox" class="${p.districts === 'all' ? 'hide' : ''}">
            <div class="toolbar" style="margin:8px 0 0"><input class="input grow" id="dq" placeholder="Search district..."><button type="button" class="btn btn-light btn-sm" data-dall="Bihar">All Bihar</button><button type="button" class="btn btn-light btn-sm" data-dall="Uttar Pradesh">All UP</button><button type="button" class="btn btn-light btn-sm" data-dall="">Clear</button></div>
            <div class="list" id="dList"></div>
          </div>
        </div></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px"><button type="button" class="btn btn-light" id="pCancel">Cancel</button><button class="btn btn-primary">${isNew ? 'Add Item' : 'Save Changes'}</button></div>
    </form>`, 880);
  const f = $('#pForm', m);
  const prev = () => { $('#pPrev', m).innerHTML = ph(f.image.value, f.emoji.value || '🎁', catOf(f.cat.value).color, 'prev'); };
  const typeVis = () => { $$('.svc-only', m).forEach(x => x.classList.toggle('hide', f.type.value !== 'service')); $$('.prod-only', m).forEach(x => x.classList.toggle('hide', f.type.value === 'service')); };
  const drawD = () => {
    const q = $('#dq', m).value.toLowerCase();
    $('#dList', m).innerHTML = A.districts.filter(d => d.name.toLowerCase().includes(q)).map(d => `<label><input type="checkbox" value="${d.id}" ${picked.has(d.id) ? 'checked' : ''}> ${h(d.name)} <span class="muted">${d.state === 'Bihar' ? 'BR' : 'UP'}</span></label>`).join('');
    $('#dCnt', m).textContent = `(${picked.size} selected)`;
  };
  prev(); drawD(); typeVis();
  f.emoji.addEventListener('input', prev); f.image.addEventListener('change', prev); f.cat.addEventListener('change', prev); f.type.addEventListener('change', typeVis);
  $('#pCancel', m).addEventListener('click', closeModal);
  wireUpload($('#pFile', m), url => { f.image.value = url; prev(); });
  $$('input[name=dmode]', m).forEach(r => r.addEventListener('change', () => $('#dBox', m).classList.toggle('hide', r.value === 'all' && r.checked)));
  $('#dq', m).addEventListener('input', drawD);
  $('#dList', m).addEventListener('change', e => { if (e.target.checked) picked.add(e.target.value); else picked.delete(e.target.value); $('#dCnt', m).textContent = `(${picked.size} selected)`; });
  $$('[data-dall]', m).forEach(b => b.addEventListener('click', () => { if (!b.dataset.dall) picked.clear(); else A.districts.filter(d => d.state === b.dataset.dall).forEach(d => picked.add(d.id)); drawD(); }));
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(f);
    const body = Object.fromEntries(fd);
    body.active = !!fd.get('active'); body.featured = !!fd.get('featured');
    body.events = fd.get('type') === 'service' ? fd.getAll('events') : [];
    body.covers = fd.get('type') === 'service' ? fd.getAll('covers') : [];
    body.districts = fd.get('dmode') === 'all' ? 'all' : [...picked];
    if (body.districts !== 'all' && !body.districts.length) return toast('Select at least one district', true);
    delete body.dmode;
    try {
      if (isNew) await api('/api/admin/products', { method: 'POST', body });
      else await api('/api/admin/products/' + p.id, { method: 'PUT', body });
      toast(isNew ? 'Item added ✓' : 'Saved ✓'); closeModal(); viewProducts();
    } catch (err) { toast(err.message, true); }
  });
}

/* ---------------- Packages ---------------- */
async function viewPackages() {
  const [{ packages }, { products }] = await Promise.all([api('/api/admin/packages'), api('/api/admin/products')]);
  A.products = products;
  const pname = id => (products.find(p => p.id === id) || {}).name || id;
  const price = k => k.items.reduce((a, i) => { const p = products.find(x => x.id === i.productId); return a + (p ? p.price * Math.max(i.qty, p.minQty || 1) : 0); }, 0);
  $('#aTopRight').innerHTML = '<button class="btn btn-gold btn-sm" id="addPk">+ Add Package</button>';
  $('#addPk').addEventListener('click', () => editPackage(null));
  $('#aBody').innerHTML = `<p class="small muted" style="margin-top:0">Packages appear on the home page. Customers add every item to the cart with one click.</p>
    <div class="a-card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Package</th><th>Items</th><th>Price</th><th>Visible</th><th></th></tr></thead><tbody>
    ${packages.map(k => `<tr><td>${ph(k.image, '', '#fbeff3', 'thumb')}</td><td><b>${h(k.name)}</b><br><span class="small muted">${h(k.desc).slice(0, 80)}</span></td>
      <td class="small">${k.items.map(i => `${h(pname(i.productId))}${i.qty > 1 ? ' × ' + i.qty : ''}`).join('<br>')}</td><td><b>${inr(price(k))}</b></td>
      <td><label class="switch"><input type="checkbox" data-kact="${k.id}" ${k.active ? 'checked' : ''}><span></span></label></td>
      <td class="actions"><button class="btn btn-light btn-sm" data-kedit="${k.id}">Edit</button> <button class="btn btn-light btn-sm" data-kdel="${k.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No packages yet</td></tr>'}
    </tbody></table></div></div>`;
  $$('[data-kedit]').forEach(b => b.addEventListener('click', () => editPackage(packages.find(k => k.id === b.dataset.kedit))));
  $$('[data-kact]').forEach(c => c.addEventListener('change', async () => { try { await api('/api/admin/packages/' + c.dataset.kact, { method: 'PUT', body: { active: c.checked } }); toast('Saved ✓'); } catch (e) { toast(e.message, true); } }));
  $$('[data-kdel]').forEach(b => b.addEventListener('click', async () => { if (!confirm('Delete this package?')) return; try { await api('/api/admin/packages/' + b.dataset.kdel, { method: 'DELETE' }); toast('Deleted'); viewPackages(); } catch (e) { toast(e.message, true); } }));
}
function editPackage(k) {
  const isNew = !k;
  k = k || { name: '', nameHi: '', image: '', desc: '', items: [], active: true };
  let items = k.items.map(i => ({ ...i }));
  const opts = A.products.map(p => `<option value="${p.id}">${h(p.name)} (${inr(p.price)}/${h(p.unit)})</option>`).join('');
  const m = modal(`<h2>${isNew ? 'Add package' : 'Edit package'}</h2><form id="kForm">
    <div class="grid-2"><div class="field"><label>Package name</label><input name="name" required value="${h(k.name)}"></div><div class="field"><label>Hindi name</label><input name="nameHi" value="${h(k.nameHi)}"></div></div>
    <div class="grid-2"><div class="field"><label>Photo link (URL)</label><input name="image" value="${h(k.image)}"></div><div class="field"><label>…or upload photo</label><input type="file" id="kFile" accept="image/*"></div></div>
    <div class="field"><label>Description</label><textarea name="desc" rows="2">${h(k.desc)}</textarea></div>
    <div class="field"><label>Items in this package</label><div id="kItems"></div>
      <div class="toolbar" style="margin:8px 0 0"><select id="kAddSel" class="grow">${opts}</select><button type="button" class="btn btn-light btn-sm" id="kAdd">+ Add item</button></div></div>
    <div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn btn-primary">Save Package</button></div></form>`, 760);
  const draw = () => {
    $('#kItems', m).innerHTML = items.map((i, n) => `<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--line)"><span style="flex:1">${h((A.products.find(p => p.id === i.productId) || {}).name || i.productId)}</span><input type="number" min="1" value="${i.qty}" data-kq="${n}" class="charge-in"><button type="button" class="btn btn-light btn-sm" data-krm="${n}">✕</button></div>`).join('') || '<p class="muted small">No items yet</p>';
  };
  draw();
  $('#kItems', m).addEventListener('input', e => { if (e.target.dataset.kq != null) items[e.target.dataset.kq].qty = Number(e.target.value) || 1; });
  $('#kItems', m).addEventListener('click', e => { const b = e.target.closest('[data-krm]'); if (b) { items.splice(Number(b.dataset.krm), 1); draw(); } });
  $('#kAdd', m).addEventListener('click', () => { const id = $('#kAddSel', m).value; if (!items.some(i => i.productId === id)) items.push({ productId: id, qty: 1 }); draw(); });
  wireUpload($('#kFile', m), url => { $('#kForm', m).image.value = url; });
  $('#kForm', m).addEventListener('submit', async e => {
    e.preventDefault();
    const body = { ...Object.fromEntries(new FormData(e.target)), items };
    try {
      if (isNew) await api('/api/admin/packages', { method: 'POST', body }); else await api('/api/admin/packages/' + k.id, { method: 'PUT', body });
      toast('Package saved ✓'); closeModal(); viewPackages();
    } catch (err) { toast(err.message, true); }
  });
}

/* ---------------- Categories ---------------- */
async function viewCategories() {
  const { categories } = await api('/api/admin/categories');
  A.cats = categories.sort((a, b) => a.order - b.order);
  $('#aTopRight').innerHTML = '<button class="btn btn-gold btn-sm" id="addCat">+ Add Category</button>';
  $('#addCat').addEventListener('click', () => editCat(null));
  const gstOn = !!((A.meta.settings.business || {}).gstin), noRate = A.cats.filter(c => c.gstRate == null || c.gstRate === '').length;
  $('#aBody').innerHTML = `${gstOn && noRate ? `<div class="a-card pad" style="margin-bottom:14px;background:#fff8e6"><b>${noRate} ${noRate > 1 ? 'categories have' : 'category has'} no GST rate yet.</b> <span class="small">Tax invoices can only be made for items with a rate — tap Edit and set the rate and HSN / SAC code (ask your CA).</span></div>` : ''}
    <div class="a-card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th></th><th>Name</th><th>Hindi</th><th>Items</th><th>Offer</th><th>GST · HSN/SAC</th><th>Visible</th><th></th></tr></thead><tbody>
    ${A.cats.map(c => `<tr><td>${c.order}</td><td>${ph(c.image, c.emoji, c.color, 'thumb')}</td><td><b>${h(c.name)}</b></td><td>${h(c.nameHi)}</td><td>${c.count}</td>
      <td>${Number(c.offPct) > 0 ? (c.offUntil && c.offUntil < new Date(Date.now() + 330 * 60e3).toISOString().slice(0, 10) ? `<span class="muted small">${c.offPct}% — ended ${fmtDate(c.offUntil)}</span>` : `<span class="chip pay-paid">${c.offPct}% off</span>${c.offUntil ? `<br><span class="small muted">till ${fmtDate(c.offUntil)}</span>` : ''}`) : '<span class="muted small">—</span>'}</td>
      <td>${c.gstRate == null || c.gstRate === '' ? '<span class="muted small">not set</span>' : `<b>${rateTxt(c.gstRate)}</b>`}${c.hsn ? ` <span class="small muted">· ${h(c.hsn)}</span>` : ''}</td>
      <td><label class="switch"><input type="checkbox" data-cact="${c.id}" ${c.active ? 'checked' : ''}><span></span></label></td>
      <td class="actions"><button class="btn btn-light btn-sm" data-cedit="${c.id}">Edit</button> <button class="btn btn-light btn-sm" data-cdel="${c.id}">Delete</button></td></tr>`).join('')}
  </tbody></table></div></div>`;
  $$('[data-cedit]').forEach(b => b.addEventListener('click', () => editCat(A.cats.find(c => c.id === b.dataset.cedit))));
  $$('[data-cact]').forEach(c => c.addEventListener('change', async () => { try { await api('/api/admin/categories/' + c.dataset.cact, { method: 'PUT', body: { active: c.checked } }); toast('Saved ✓'); } catch (e) { toast(e.message, true); } }));
  $$('[data-cdel]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this category?')) return;
    try { await api('/api/admin/categories/' + b.dataset.cdel, { method: 'DELETE' }); toast('Deleted'); viewCategories(); } catch (e) { toast(e.message, true); }
  }));
}
function editCat(c) {
  const isNew = !c;
  c = c || { name: '', nameHi: '', emoji: '🎁', color: '#fbeef2', image: '', order: A.cats.length + 1 };
  const m = modal(`<h2>${isNew ? 'Add category' : 'Edit category'}</h2><form id="cForm">
    <div class="grid-2"><div class="field"><label>Name</label><input name="name" required value="${h(c.name)}"></div><div class="field"><label>Hindi name</label><input name="nameHi" value="${h(c.nameHi)}"></div>
    <div class="field"><label>Photo link (URL)</label><input name="image" value="${h(c.image || '')}"></div><div class="field"><label>…or upload photo</label><input type="file" id="cFile" accept="image/*"></div>
    <div class="field"><label>Emoji icon</label><input name="emoji" value="${h(c.emoji)}"></div><div class="field"><label>Background colour</label><input name="color" type="color" value="${h(c.color)}"></div>
    <div class="field"><label>Display order</label><input name="order" type="number" value="${h(c.order)}"></div></div>
    <h3 style="margin:6px 0 4px">Category offer</h3>
    <p class="small muted" style="margin:0 0 8px">Every item in this category is sold this much cheaper; customers see the old price crossed out and an offer banner. The server charges the offer price, and GST is worked out on it.</p>
    <div class="grid-2"><div class="field"><label>Discount (% off)</label><select name="offPct">${[0, 5, 10, 15, 20, 25, 30, 40, 50].concat(c.offPct && ![0, 5, 10, 15, 20, 25, 30, 40, 50].includes(Number(c.offPct)) ? [Number(c.offPct)] : []).map(v => `<option value="${v}" ${Number(c.offPct || 0) === v ? 'selected' : ''}>${v ? v + '% off' : 'No offer'}</option>`).join('')}</select></div>
      <div class="field"><label>Offer ends after <span class="small muted">— empty = until you switch it off</span></label><input name="offUntil" type="date" value="${h(c.offUntil || '')}"></div></div>
    <h3 style="margin:6px 0 4px">GST for this category's items</h3>
    <p class="small muted" style="margin:0 0 8px">Used on tax invoices for every item here, unless a product sets its own. Prices include GST. Ask your CA which rate and HSN / SAC code apply.</p>
    <div class="grid-2">${gstFields(c)}</div>
    <div style="display:flex;justify-content:flex-end;gap:10px"><button class="btn btn-primary">Save</button></div></form>`, 600);
  wireUpload($('#cFile', m), url => { $('#cForm', m).image.value = url; });
  $('#cForm', m).addEventListener('submit', async e => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      if (isNew) { const r = await api('/api/admin/categories', { method: 'POST', body }); await api('/api/admin/categories/' + r.category.id, { method: 'PUT', body: { order: body.order } }); }
      else await api('/api/admin/categories/' + c.id, { method: 'PUT', body });
      toast('Saved ✓'); closeModal(); viewCategories();
    } catch (err) { toast(err.message, true); }
  });
}

/* ---------------- Lagan dates (shared by every vendor; verified Pandit Ji can also edit) ---------------- */
function viewLaganAdmin() {
  $('#aBody').innerHTML = `<div class="a-card pad"><h3 style="margin-top:0">Lagan dates – shubh vivah muhurat</h3>
    <p class="small muted">One list for the whole site. Verified Pandit Ji add dates from their Vendor Panel (Lagan tab); you can add or remove any. Customers see them in the date picker and on <a class="link" href="/#/lagan" target="_blank">/#/lagan</a>, and every vendor's lagan price applies on these dates.</p>
    <div id="lgAdmin"><div class="spinner"></div></div></div>`;
  VF.laganEditor($('#lgAdmin'), { api, uploadPath: '/api/admin/upload', canEdit: true, admin: true, me: 'admin' });
}

/* ---------------- Districts ---------------- */
let distState = 'Bihar';
async function viewDistricts() {
  const { districts } = await api('/api/admin/districts');
  A.districts = districts;
  const list = districts.filter(d => d.state === distState);
  $('#aBody').innerHTML = `<div class="toolbar">
      <div class="st-tabs"><button data-st="Bihar" class="${distState === 'Bihar' ? 'on' : ''}">Bihar (${districts.filter(d => d.state === 'Bihar').length})</button><button data-st="Uttar Pradesh" class="${distState === 'Uttar Pradesh' ? 'on' : ''}">Uttar Pradesh (${districts.filter(d => d.state === 'Uttar Pradesh').length})</button></div>
      <input class="input grow" id="dq" placeholder="Search district...">
      <button class="btn btn-light btn-sm" data-bulk="1">Enable all in ${distState}</button><button class="btn btn-light btn-sm" data-bulk="0">Disable all in ${distState}</button>
    </div>
    <p class="small muted" style="margin-top:0">Turn a district off to stop taking orders there. "Extra delivery charge" is added to saman (product) orders for that district.</p>
    <div class="a-card"><h3>${list.filter(d => d.active).length} of ${list.length} districts active</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>District</th><th>State</th><th>Extra delivery charge (₹)</th><th>Service active</th></tr></thead><tbody id="dRows">
      ${list.map(d => `<tr data-name="${h(d.name.toLowerCase())}"><td><b>${h(d.name)}</b></td><td>${h(d.state)}</td><td><input class="charge-in" type="number" min="0" value="${d.extraCharge}" data-charge="${d.id}"></td>
        <td><label class="switch"><input type="checkbox" data-dact="${d.id}" ${d.active ? 'checked' : ''}><span></span></label></td></tr>`).join('')}
    </tbody></table></div></div>`;
  $$('[data-st]').forEach(b => b.addEventListener('click', () => { distState = b.dataset.st; viewDistricts(); }));
  $('#dq').addEventListener('input', e => { const q = e.target.value.toLowerCase(); $$('#dRows tr').forEach(tr => tr.classList.toggle('hide', !tr.dataset.name.includes(q))); });
  $$('[data-dact]').forEach(c => c.addEventListener('change', async () => { try { await api('/api/admin/districts/' + c.dataset.dact, { method: 'PUT', body: { active: c.checked } }); toast('Saved ✓'); } catch (e) { toast(e.message, true); } }));
  $$('[data-charge]').forEach(i => i.addEventListener('change', async () => { try { await api('/api/admin/districts/' + i.dataset.charge, { method: 'PUT', body: { extraCharge: i.value } }); toast('Charge saved ✓'); } catch (e) { toast(e.message, true); } }));
  $$('[data-bulk]').forEach(b => b.addEventListener('click', async () => {
    try { await api('/api/admin/districts', { method: 'PUT', body: { state: distState, active: b.dataset.bulk === '1' } }); toast('Updated ✓'); viewDistricts(); } catch (e) { toast(e.message, true); }
  }));
}

/* ---------------- Users ---------------- */
async function viewUsers() {
  const { users } = await api('/api/admin/users');
  const draw = q => {
    const list = users.filter(u => !q || (u.name + u.phone + u.email).toLowerCase().includes(q));
    $('#uRows').innerHTML = list.map(u => `<tr><td><b>${h(u.name)}</b>${u.role === 'admin' ? ' <span class="chip chip-svc">Admin</span>' : ''}<br><span class="small muted">${h(u.email)}</span></td>
      <td><a class="link" href="tel:${h(u.phone)}">${h(u.phone)}</a>${u.phoneVerified ? ' <span class="small" title="Mobile verified with OTP">✓</span>' : ''}</td><td>${fmtDate(u.createdAt)}</td><td>${u.orders}</td><td><b>${inr(u.spent)}</b></td><td>${u.vbookings || 0}</td><td>${inr(u.vbValue)}</td>
      <td class="small">${u.addresses[0] ? h(u.addresses[0].city || '') : '—'}</td>
      <td class="actions">${u.id === A.user.id ? '<span class="muted small">You</span>' : `<button class="btn btn-light btn-sm" data-role="${u.id}" data-to="${u.role === 'admin' ? 'user' : 'admin'}">${u.role === 'admin' ? 'Remove admin' : 'Make admin'}</button> <button class="btn btn-sm ${u.blocked ? 'btn-primary' : 'btn-light'}" data-block="${u.id}" data-to="${u.blocked ? '' : '1'}">${u.blocked ? 'Unblock' : 'Block'}</button>`}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No customers</td></tr>';
    $$('[data-block]').forEach(b => b.addEventListener('click', async () => { try { await api('/api/admin/users/' + b.dataset.block, { method: 'PUT', body: { blocked: !!b.dataset.to } }); toast('Updated ✓'); viewUsers(); } catch (e) { toast(e.message, true); } }));
    $$('[data-role]').forEach(b => b.addEventListener('click', async () => {
      if (b.dataset.to === 'admin' && !confirm('Give this person full admin access?')) return;
      try { await api('/api/admin/users/' + b.dataset.role, { method: 'PUT', body: { role: b.dataset.to } }); toast('Updated ✓'); viewUsers(); } catch (e) { toast(e.message, true); }
    }));
  };
  $('#aBody').innerHTML = `<p class="small muted" style="margin-top:0">Registered accounts. Counts include guest orders / vendor bookings made with the same mobile once it is OTP-verified (✓). Vendor booking value is paid to the vendors directly. Other guest orders are listed under Orders.</p><div class="toolbar"><input class="input grow" id="uq" placeholder="Search name, mobile, email..."></div>
    <div class="a-card"><h3>${users.length} accounts</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Mobile</th><th>Joined</th><th>Shop orders</th><th>Spent</th><th>Vendor bookings</th><th>Vendor value</th><th>City</th><th></th></tr></thead><tbody id="uRows"></tbody></table></div></div>`;
  draw('');
  $('#uq').addEventListener('input', e => draw(e.target.value.toLowerCase()));
}

/* ---------------- Settings ---------------- */
async function viewSettings() {
  const { settings: s } = await api('/api/admin/settings');
  let banners = s.banners.map(b => ({ ...b }));
  const bz = s.business || {};
  const bannerRows = () => banners.map((b, i) => `<div class="banner-row" data-bi="${i}">
      ${ph(b.image, b.emoji, '#fbeff3', 'thumb')}<input data-k="title" value="${h(b.title)}" placeholder="Title"><input data-k="subtitle" value="${h(b.subtitle)}" placeholder="Subtitle">
      <input data-k="cta" value="${h(b.cta)}" placeholder="Button text"><input data-k="link" value="${h(b.link)}" placeholder="#/c/mithai">
      <input data-k="image" value="${h(b.image || '')}" placeholder="Photo link (URL)">
      <button type="button" class="btn btn-light btn-sm" data-brm="${i}">✕</button></div>`).join('');
  $('#aBody').innerHTML = `<form id="sForm">
    <div class="a-grid">
      <div class="a-card"><h3>Store details</h3><div class="pad">
        <div class="grid-2"><div class="field"><label>Store name</label><input name="siteName" value="${h(s.siteName)}"></div><div class="field"><label>Tagline</label><input name="tagline" value="${h(s.tagline)}"></div>
        <div class="field"><label>Support phone</label><input name="phone" value="${h(s.phone)}"></div><div class="field"><label>WhatsApp number (with 91)</label><input name="whatsapp" value="${h(s.whatsapp)}"></div>
        <div class="field"><label>Support email</label><input name="email" value="${h(s.email)}"></div></div>
        <div class="field"><label>Announcement bar text</label><input name="announcement" value="${h(s.announcement)}"></div>
      </div></div>
      <div class="a-card"><h3>Charges</h3><div class="pad">
        <div class="field"><label>Delivery charge (₹)</label><input name="deliveryCharge" type="number" min="0" value="${s.deliveryCharge}"></div>
        <div class="field"><label>Free delivery above (₹)</label><input name="freeDeliveryAbove" type="number" min="0" value="${s.freeDeliveryAbove}"></div>
        <div class="field"><label>Booking advance (% of services)</label><input name="advancePercent" type="number" min="0" max="100" value="${s.advancePercent}"></div>
        <div class="field"><label>Return window (days after delivery)</label><input name="returnDays" type="number" min="1" max="30" value="${s.returnDays ?? 7}"></div>
        <div class="field"><label>Refund sent within (days)</label><input name="refundDays" type="number" min="1" max="30" value="${s.refundDays ?? 7}"></div>
      </div></div>
    </div>
    <div class="a-card" style="margin-bottom:14px"><h3>Business details <span class="small muted">shown on Contact Us, Terms, Privacy and Shipping pages — Razorpay checks these before going live</span></h3><div class="pad">
      <div class="grid-2"><div class="field"><label>Registered business name *</label><input name="legalName" value="${h(bz.legalName || '')}" placeholder="As on your PAN / GST / bank account"></div>
        <div class="field"><label>GSTIN <span class="muted">(if registered)</span></label><input name="gstin" maxlength="15" value="${h(bz.gstin || '')}"></div></div>
      <div class="field"><label>Business address *</label><textarea name="address" rows="2" placeholder="Shop / office address with PIN code">${h(bz.address || '')}</textarea></div>
      <div class="grid-2"><div class="field"><label>City for legal matters (courts)</label><input name="city" value="${h(bz.city || '')}" placeholder="e.g. Patna"></div>
        <div class="field"><label>Support hours</label><input name="hours" value="${h(bz.hours || '')}" placeholder="e.g. Mon–Sun, 9 am – 8 pm"></div>
        <div class="field"><label>Grievance officer name</label><input name="grievanceName" value="${h(bz.grievanceName || '')}" placeholder="Person who answers complaints"></div>
        <div class="field"><label>Grievance officer email</label><input name="grievanceEmail" type="email" value="${h(bz.grievanceEmail || '')}" placeholder="Leave empty to use the support email"></div></div>
      <div class="grid-2"><div class="field"><label>Invoice number prefix</label><input name="invoicePrefix" maxlength="4" value="${h(bz.invoicePrefix || 'INV')}" placeholder="INV"><span class="small muted">Invoices are numbered ${h(bz.invoicePrefix || 'INV')}/26-27/00001, a new series each April; credit notes CN/26-27/00001.</span></div>
        <div class="field"><label>GST tax invoices</label><label class="small" style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" name="autoInvoice" ${bz.autoInvoice === false ? '' : 'checked'}> Issue automatically when an order is delivered / completed</label>
          <span class="small muted">Needs a valid GSTIN above and a GST rate on every category (Admin → Categories). Without a GSTIN customers get a simple receipt.</span></div></div>
      <div class="field"><label>Delivery time (shown on the Shipping page)</label><input name="deliveryTime" value="${h(bz.deliveryTime || '')}" placeholder="e.g. 2–5 days after the order is confirmed, always before your function date"></div>
      <p class="small muted" style="margin:0">See the pages: <a class="link" href="/#/contact" target="_blank">Contact Us</a> · <a class="link" href="/#/terms" target="_blank">Terms</a> · <a class="link" href="/#/privacy" target="_blank">Privacy</a> · <a class="link" href="/#/shipping" target="_blank">Shipping</a> · <a class="link" href="/#/policy" target="_blank">Refund</a>. The support email above is used on these pages too. The pages are plain-language templates — have your CA or lawyer read them once before going live.</p>
    </div></div>
    <div class="a-card" style="margin-bottom:14px"><h3>Home page banners <button type="button" class="btn btn-light btn-sm" id="bAdd">+ Add banner</button></h3><div class="pad" id="bRows">${bannerRows()}</div></div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px"><button class="btn btn-primary">Save Settings</button></div>
  </form>
  <div class="a-card" style="max-width:560px"><h3>Change my admin password</h3><form class="pad" id="pwForm">
    <div class="field"><label>Current password</label><input name="oldPassword" type="password" required autocomplete="current-password"></div>
    <div class="field"><label>New password</label><input name="newPassword" type="password" required minlength="6" autocomplete="new-password"></div>
    <button class="btn btn-ghost">Update Password</button></form></div>`;
  const rows = $('#bRows');
  rows.addEventListener('input', e => { const r = e.target.closest('[data-bi]'); if (r && e.target.dataset.k) banners[r.dataset.bi][e.target.dataset.k] = e.target.value; });
  rows.addEventListener('click', e => { const b = e.target.closest('[data-brm]'); if (b) { banners.splice(Number(b.dataset.brm), 1); rows.innerHTML = bannerRows(); } });
  $('#bAdd').addEventListener('click', () => { banners.push({ emoji: '🎉', title: 'New offer', subtitle: '', cta: 'Shop Now', link: '#/', theme: 'maroon', image: '' }); rows.innerHTML = bannerRows(); });
  $('#sForm').addEventListener('submit', async e => {
    e.preventDefault();
    try { const r = await api('/api/admin/settings', { method: 'PUT', body: { ...Object.fromEntries(new FormData(e.target)), autoInvoice: e.target.autoInvoice.checked, banners } }); A.meta.settings = r.settings; toast('Settings saved ✓'); } catch (err) { toast(err.message, true); }
  });
  $('#pwForm').addEventListener('submit', async e => {
    e.preventDefault();
    try { await api('/api/me', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }); toast('Password updated ✓'); e.target.reset(); } catch (err) { toast(err.message, true); }
  });
}

/* ---------------- Vendors marketplace ---------------- */
let vFilter = { q: '', type: '', status: '' };
async function viewVendorsAdmin() {
  const { vendors, types } = await api('/api/admin/vendors');
  const tName = id => (types.find(t => t.id === id) || {}).name || id;
  const tEmoji = id => (types.find(t => t.id === id) || {}).emoji || '🤝';
  const samples = vendors.filter(v => v.sample).length;
  $('#aTopRight').innerHTML = `<div style="display:flex;gap:8px">${samples ? `<button class="btn btn-light btn-sm" id="vRmS">Remove ${samples} sample vendors</button>` : ''}<button class="btn btn-wa btn-sm" id="vInv">Invite Artist / Vendor</button><button class="btn btn-gold btn-sm" id="vAdd">+ Add Vendor</button></div>`;
  $('#vInv').addEventListener('click', () => inviteVendor(types));
  const draw = () => {
    const f = vFilter, q = f.q.toLowerCase();
    const list = vendors.filter(v => (!f.type || v.type === f.type) && (!f.status || (f.status === 'pending' ? !v.verified : f.status === 'verified' ? v.verified && v.active : !v.active))
      && (!q || [v.name, v.owner, v.phone, v.districtName].join(' ').toLowerCase().includes(q)));
    $('#vRows').innerHTML = list.map(v => `<tr class="${!v.verified ? 'row-new' : ''}">
      <td>${ph(v.photos[0], tEmoji(v.type), '#f6eef0', 'thumb')}</td>
      <td><b>${h(v.name)}</b>${v.sample ? ' <span class="chip chip-prod">Sample</span>' : ''}<br><span class="small muted">${h(v.owner)} · <a class="link" href="tel:${h(v.phone)}">${h(v.phone)}</a></span></td>
      <td class="small">${h(tName(v.type))}${v.subtype ? `<br><span class="muted">${h(v.subtype)}</span>` : ''}</td>
      <td class="small">${h(v.districtName)}</td>
      <td>${v.verified ? '<span class="status st-delivered">✓ Verified</span>' : '<span class="status st-placed">Pending</span>'}${v.active ? '' : '<br><span class="status st-cancelled">Hidden</span>'}</td>
      <td class="small">${v.listingCount} items · ${v.bookingCount} bookings${v.reviews ? `<br>★ ${v.rating} (${v.reviews})` : ''}${v.docsPending ? `<br><span class="status st-placed">${v.docsPending} document${v.docsPending > 1 ? 's' : ''} to check</span>` : ''}${v.docsMissing ? `<br><span class="status st-cancelled">${v.docsMissing} needed paper${v.docsMissing > 1 ? 's' : ''} missing / not verified</span>` : ''}</td>
      <td class="small">${v.hasLogin ? '✓ Can log in' : '<span class="muted">No login</span>'}</td>
      <td class="actions">${v.verified ? '' : `<button class="btn btn-primary btn-sm" data-verify="${v.id}">✓ Verify</button> `}<button class="btn btn-light btn-sm" data-manage="${v.id}">Manage</button> <button class="btn btn-light btn-sm" data-login="${v.id}">Login</button> <button class="btn btn-light btn-sm" data-vdel="${v.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">No vendors</td></tr>';
    $('#vCount').textContent = `${list.length} of ${vendors.length} vendors · ${vendors.filter(v => !v.verified).length} waiting for verification`;
    $$('[data-verify]').forEach(b => b.addEventListener('click', async () => {
      const v = vendors.find(x => x.id === b.dataset.verify);
      if ((v.docsMissing || v.docsPending) && !confirm(`${v.name}: ${v.docsMissing ? `${v.docsMissing} needed paper(s) are not verified yet` : `${v.docsPending} paper(s) are waiting to be checked`}. Open Manage → Documents to check them.\n\nMake this vendor visible to customers anyway?`)) return;
      try { await api('/api/admin/vendors/' + b.dataset.verify, { method: 'PUT', body: { verified: true, active: true } }); toast('Vendor verified – now visible to customers ✓'); pollOrders(); viewVendorsAdmin(); } catch (e) { toast(e.message, true); } }));
    $$('[data-manage]').forEach(b => b.addEventListener('click', () => manageVendor(b.dataset.manage)));
    $$('[data-login]').forEach(b => b.addEventListener('click', () => vendorLogin(vendors.find(v => v.id === b.dataset.login))));
    $$('[data-vdel]').forEach(b => b.addEventListener('click', async () => { if (!confirm('Delete this vendor and all its items?')) return; try { await api('/api/admin/vendors/' + b.dataset.vdel, { method: 'DELETE' }); toast('Deleted'); viewVendorsAdmin(); } catch (e) { toast(e.message, true); } }));
  };
  $('#aBody').innerHTML = `<p class="small muted" style="margin-top:0">Only <b>verified</b> and active vendors are shown to customers. New "Join as Vendor / Artist" applications appear here as Pending. Vendors log in at <a class="link" href="/vendor" target="_blank">/vendor</a> after you give them a login.</p>
    <div class="toolbar"><input class="input grow" id="vq" placeholder="Search name, owner, phone, district..." value="${h(vFilter.q)}">
      <select id="vt"><option value="">All types</option>${types.map(t => `<option value="${t.id}" ${vFilter.type === t.id ? 'selected' : ''}>${h(t.name)}</option>`).join('')}</select>
      <select id="vs"><option value="">Any status</option><option value="pending" ${vFilter.status === 'pending' ? 'selected' : ''}>Pending verification</option><option value="verified" ${vFilter.status === 'verified' ? 'selected' : ''}>Verified & live</option><option value="hidden" ${vFilter.status === 'hidden' ? 'selected' : ''}>Hidden</option></select></div>
    <div class="a-card"><h3 id="vCount"></h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Vendor</th><th>Type</th><th>District</th><th>Status</th><th>Activity</th><th>Login</th><th></th></tr></thead><tbody id="vRows"></tbody></table></div></div>`;
  draw();
  const bind = (id, key, ev = 'change') => $(id).addEventListener(ev, e => { vFilter[key] = e.target.value; draw(); });
  bind('#vq', 'q', 'input'); bind('#vt', 'type'); bind('#vs', 'status');
  $('#vAdd').addEventListener('click', () => addVendor(types));
  const rm = $('#vRmS'); if (rm) rm.addEventListener('click', async () => { if (!confirm(`Remove all ${samples} sample vendors, their items and sample reviews? Real vendors are not touched.`)) return; const r = await api('/api/admin/vendors/remove-samples', { method: 'POST' }); toast(`${r.removed} sample vendors removed`); viewVendorsAdmin(); });
}
function manageVendor(id) {
  const m = modal('<div id="vfModal"><div class="spinner"></div></div>', 1050);
  VF.manage($('#vfModal', m), { api, base: '/api/admin/vendors/' + id, uploadPath: '/api/admin/upload', districts: A.districts, admin: true, tab: 'profile', onChange: () => { if (!$('#modalBg')) viewVendorsAdmin(); } })
    .catch(e => { $('#vfModal', m).innerHTML = `<div class="err">${h(e.message)}</div>`; });
  $('.modal-x', m).addEventListener('click', () => viewVendorsAdmin());
}
function addVendor(types) {
  const m = modal(`<h2>Add vendor</h2><form id="avForm">
    <div class="grid-2"><div class="field"><label>Type</label><select name="type">${types.map(t => `<option value="${t.id}">${h(t.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Business / artist name</label><input name="name" required></div>
    <div class="field"><label>Owner / contact</label><input name="owner"></div><div class="field"><label>Mobile</label><input name="phone" maxlength="10"></div>
    <div class="field"><label>District</label><select name="district">${A.districts.map(d => `<option value="${d.id}">${h(d.name)} (${d.state === 'Bihar' ? 'BR' : 'UP'})</option>`).join('')}</select></div><div class="field"><label>Address</label><input name="address"></div></div>
    <label class="small"><input type="checkbox" name="verified" checked> Verified (I have checked this vendor)</label>
    <div style="margin-top:12px"><button class="btn btn-primary">Create & add items</button></div></form>`, 640);
  $('#avForm', m).addEventListener('submit', async e => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target)); body.verified = !!e.target.verified.checked; body.whatsapp = body.phone;
    try { const r = await api('/api/admin/vendors', { method: 'POST', body }); toast('Vendor created ✓'); closeModal(); manageVendor(r.vendor.id); } catch (err) { toast(err.message, true); }
  });
}
// Invite a real artist / orchestra / vendor: sends them a pre-filled sign-up link on WhatsApp.
// Nothing is listed until they submit their own details and you verify them.
function inviteVendor(types) {
  const m = modal(`<h2>Invite Artist / Vendor</h2>
    <p class="small muted" style="margin-top:0">Use this for orchestra groups, singers, dancers, pandit ji, halwai, gaadi owners you have spoken to. They get a WhatsApp message with a sign-up link already filled with their name — they add their <b>own photo, fees and available dates</b>, then you verify.</p>
    <form id="invForm"><div class="grid-2">
      <div class="field"><label>Type</label><select name="type" id="invType">${types.map(t => `<option value="${t.id}" ${t.id === 'orchestra' ? 'selected' : ''}>${h(t.name)}</option>`).join('')}</select></div>
      <div class="field" id="invSubWrap"><label>Category</label><select name="sub" id="invSub"></select></div>
      <div class="field"><label>Artist / group / business name</label><input name="name" required placeholder="e.g. their stage name"></div>
      <div class="field"><label>Contact person</label><input name="owner" placeholder="Artist or manager name"></div>
      <div class="field"><label>Their WhatsApp number</label><input name="phone" required maxlength="10" pattern="[6-9][0-9]{9}"></div></div>
      <button class="btn btn-wa">Send invite on WhatsApp</button> <button type="button" class="btn btn-light" id="invCopy">Copy link</button></form>`, 640);
  const f = $('#invForm', m);
  const drawSub = () => { const t = types.find(x => x.id === f.type.value); $('#invSubWrap', m).classList.toggle('hide', !t.subtypes); $('#invSub', m).innerHTML = (t.subtypes || []).map(([id, n]) => `<option value="${id}" ${id === 'artist' ? 'selected' : ''}>${h(n)}</option>`).join(''); };
  drawSub(); f.type.addEventListener('change', drawSub);
  const link = () => { const p = new URLSearchParams({ type: f.type.value, name: f.name.value.trim(), owner: f.owner.value.trim(), phone: f.phone.value.trim() }); if (f.sub.value && !$('#invSubWrap', m).classList.contains('hide')) p.set('sub', f.sub.value); return `${location.origin}/#/vendor-join?${p}`; };
  $('#invCopy', m).addEventListener('click', () => { if (!f.reportValidity()) return; try { navigator.clipboard.writeText(link()); toast('Invite link copied ✓'); } catch { prompt('Copy this link', link()); } });
  f.addEventListener('submit', e => {
    e.preventDefault();
    const msg = `Namaste ${f.owner.value.trim() || f.name.value.trim()} ji 🙏\n${A.meta.settings.siteName} par shaadi ke liye booking lene ke liye apna free profile banaiye — apni photo, fees aur available dates khud daaliye:\n${link()}`;
    window.open(`https://wa.me/91${f.phone.value.trim()}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    toast('WhatsApp opened with the invite ✓');
  });
}

function vendorLogin(v) {
  const m = modal(`<h2>Vendor login – ${h(v.name)}</h2>
    <p class="small muted" style="margin-top:0">The vendor logs in at <b>${h(location.origin)}/vendor</b> with this mobile number using OTP${''} — or with the password you set here.</p>
    <form id="vlForm"><div class="grid-2"><div class="field"><label>Mobile number</label><input name="phone" maxlength="10" value="${h(v.phone)}" required></div>
      <div class="field"><label>Password (optional, min 6)</label><input name="password" type="password" autocomplete="new-password"></div></div>
      <button class="btn btn-primary">${v.hasLogin ? 'Update login' : 'Give login'}</button></form>`, 560);
  $('#vlForm', m).addEventListener('submit', async e => {
    e.preventDefault();
    try { const r = await api(`/api/admin/vendors/${v.id}/login`, { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast(`Login ready for ${r.phone} ✓`); closeModal(); viewVendorsAdmin(); } catch (err) { toast(err.message, true); }
  });
}

let vbFilter = { q: '', status: '' };
// pass money paid online on to the vendor, or give it back to the family (through Razorpay, or record a UPI / cash refund)
function vbMoneyForm(b, kind) {
  const m = b.money || {}, onlinePaid = (b.payments || []).some(p => /^pay_/.test(p.id)), amt = kind === 'refund' ? (m.refundOwed || m.held) : m.held;
  const md = modal(`<div class="m-pad"><h3 style="margin:0 0 4px">${kind === 'payout' ? `Pay out to ${h(b.vendorName)}` : `Refund ${h(b.customer.name)}`} · #${h(b.number)}</h3>
    <p class="small muted" style="margin:0 0 12px">Paid online ${inr(m.paid || 0)} · paid out ${inr(m.paidOut || 0)} · with us <b>${inr(m.held || 0)}</b></p>
    <form id="vbmF"><div class="field"><label>Amount (₹)</label><input name="amount" type="number" min="1" max="${m.held || 0}" value="${amt || 0}" required></div>
      ${kind === 'refund' && onlinePaid ? `<label class="field" style="flex-direction:row;gap:8px;align-items:center"><input type="radio" name="how" value="online" checked> Back to the family's bank / UPI through Razorpay (5–7 days)</label><label class="field" style="flex-direction:row;gap:8px;align-items:center"><input type="radio" name="how" value="manual"> I sent it myself (UPI / bank / cash)</label>` : '<input type="hidden" name="how" value="manual">'}
      <div class="grid-2" id="vbmMan" ${kind === 'refund' && onlinePaid ? 'hidden' : ''}><div class="field"><label>How</label><select name="via"><option value="upi">UPI</option><option value="bank">Bank transfer</option><option value="cash">Cash</option></select></div>
        <div class="field"><label>UPI / bank reference</label><input name="ref" maxlength="60" placeholder="12-digit UTR"></div></div>
      <button class="btn btn-primary">${kind === 'payout' ? 'Record payout' : 'Refund'}</button></form></div>`, 520);
  const f = $('#vbmF', md);
  $$('input[name=how]', f).forEach(r => r.addEventListener('change', () => { $('#vbmMan', f).hidden = f.how.value === 'online'; }));
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const body = { amount: Number(f.amount.value), via: f.via.value, ref: f.ref.value.trim(), ...(kind === 'refund' && f.how.value === 'manual' ? { manual: true } : {}) };
    try { await api(`/api/admin/vbookings/${b.id}/${kind}`, { method: 'POST', body }); closeModal(); toast(kind === 'payout' ? 'Payout recorded ✓' : 'Refund done ✓'); viewVBookingsAdmin(); } catch (err) { toast(err.message, true); }
  });
}
// site visits (tent house / decorator measures the ground first): new ones on top; the vendor fixes them in the panel
function visitsAdminHtml(visits) {
  if (!visits.length) return '';
  const SV = { requested: ['New request', 'st-placed'], confirmed: ['Visit fixed', 'st-confirmed'], done: ['Measured', 'st-delivered'], cancelled: ['Cancelled', 'st-cancelled'] };
  return `<div class="a-card" style="margin-top:16px"><h3>Site visits <span class="small muted" style="font-weight:500">${visits.filter(s => s.status === 'requested').length} new · ${visits.length} in all</span></h3><div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>Visit</th><th>Visit date</th><th>Vendor</th><th>Family & place</th><th>Size / guests</th><th>Status</th><th></th></tr></thead><tbody>
    ${visits.map(s => `<tr class="${s.status === 'requested' ? 'row-new' : ''}"><td><b>#${h(s.number)}</b><br><span class="small muted">${fmtTime(s.createdAt)}</span></td>
      <td><b>${fmtDate(s.date)}</b><br><span class="small">${h(s.slot || '')}</span>${s.functionDate ? `<br><span class="small muted">function ${fmtDate(s.functionDate)}</span>` : ''}</td>
      <td>${h(s.vendorName)}${s.sample ? ' <span class="small muted">(sample)</span>' : ''}${s.vendorPhone ? `<br><a class="small link" href="tel:${h(s.vendorPhone)}">${h(s.vendorPhone)}</a>` : ''}</td>
      <td>${h(s.customer.name)}<br><a class="small link" href="tel:${h(s.customer.phone)}">${h(s.customer.phone)}</a><br><span class="small">${h(s.customer.address)}${s.customer.landmark ? ', ' + h(s.customer.landmark) : ''} · ${h(s.customer.districtName || '')}</span></td>
      <td class="small">${s.area ? h(s.area) : '—'}${s.guests ? `<br>${s.guests} guests` : ''}${s.measured ? `<br><b>Measured: ${h(s.measured)}</b>` : ''}${s.note ? `<br><span class="muted">${h(s.note)}</span>` : ''}</td>
      <td><span class="status ${(SV[s.status] || [])[1] || ''}">${(SV[s.status] || [s.status])[0]}</span></td>
      <td class="actions"><button class="btn btn-light btn-sm" data-svm="${s.vendorId}">Open vendor</button></td></tr>`).join('')}</tbody></table></div></div>`;
}
async function viewVBookingsAdmin() {
  const [{ bookings }, { vendors }, { visits }] = await Promise.all([api('/api/admin/vbookings'), api('/api/admin/vendors'), api('/api/admin/vvisits').catch(() => ({ visits: [] }))]);
  const VBL = { requested: 'New request', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', rejected: 'Rejected', expired: 'Not answered in time' };
  const cls = { requested: 'st-placed', confirmed: 'st-confirmed', completed: 'st-delivered', cancelled: 'st-cancelled', rejected: 'st-cancelled' };
  const when = iso => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  // under the status: till when a request holds the date, that it was released, and the vendor's advance
  const extra = b => [b.status === 'requested' && b.answerBy ? `<span class="small ${Date.parse(b.answerBy) - Date.now() < 6 * 36e5 ? 'bad-txt' : 'muted'}">answer by ${when(b.answerBy)}</span>` : '',
    b.expired ? '<span class="small bad-txt">vendor did not answer — date released</span>' : '', b.advance ? `<span class="small muted">advance ${inr(b.advance)}</span>` : '',
    ...moneyLines(b)].filter(Boolean).join('<br>');
  // paid online to us: how much, how much passed on to the vendor, what is still held or owed back
  function moneyLines(b) {
    const m = b.money || {};
    if (!m.paid) return [];
    return [`<span class="small ok-txt">paid online ${inr(m.paid)}</span>`, m.paidOut ? `<span class="small muted">paid out to vendor ${inr(m.paidOut)}</span>` : '',
      m.refundOwed ? `<span class="small bad-txt">refund due ${inr(m.refundOwed)}</span>` : m.held ? `<span class="small" style="color:#b45309">with us — pay out ${inr(m.held)}</span>` : ''];
  }
  const moneyBtns = b => { const m = b.money || {}; return [m.held && !m.refundOwed ? `<button class="btn btn-gold btn-sm" data-vbpayout="${b.id}">Pay out ${inr(m.held)}</button>` : '', m.held ? `<button class="btn btn-light btn-sm" data-vbrefund="${b.id}">Refund${m.refundOwed ? ' ' + inr(m.refundOwed) : ''}</button>` : ''].join(''); };
  const draw = () => {
    const f = vbFilter, q = f.q.toLowerCase();
    const list = bookings.filter(b => (!f.status || (f.status === 'expired' ? b.expired : b.status === f.status && !(f.status === 'cancelled' && b.expired))) && (!q || [b.number, b.vendorName, b.customer.name, b.customer.phone, b.customer.districtName].join(' ').toLowerCase().includes(q)));
    $('#vbRows').innerHTML = list.map(b => `<tr class="${b.status === 'requested' ? 'row-new' : ''}"><td><b>#${h(b.number)}</b><br><span class="small muted">${fmtTime(b.createdAt)}</span></td>
      <td><b>${fmtDate(b.date)}</b>${b.event ? `<br><span class="small">${h(evShort(b.event))}</span>` : ''}</td><td>${h(b.vendorName)}<br><span class="small muted">${h(b.type)}</span></td>
      <td>${h(b.customer.name)}${b.customer.side ? `<br><span class="small">${b.customer.side === 'boy' ? 'Ladke wale' : 'Ladki wale'}</span>` : ''}<br><a class="small link" href="tel:${h(b.customer.phone)}">${h(b.customer.phone)}</a> · <span class="small">${h(b.customer.districtName)}</span></td>
      <td class="small">${b.items.map(i => `${h(i.name)} × ${i.qty}${(i.dates || []).length ? ` <b>(${i.dates.map(d => `${h(evShort(d.event))} ${fmtDate(d.date)}`).join(', ')})</b>` : ''}`).join('<br>')}</td><td><b>${inr(b.total)}</b></td>
      <td><span class="status ${cls[b.status]}">${b.expired ? VBL.expired : VBL[b.status]}</span>${extra(b) ? `<br>${extra(b)}` : ''}</td>
      <td class="actions">${moneyBtns(b)}<button class="btn btn-light btn-sm" data-vbm="${b.vendorId}">Open vendor</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">No vendor bookings yet</td></tr>';
    $$('[data-vbpayout]').forEach(x => x.addEventListener('click', () => vbMoneyForm(bookings.find(b => b.id === x.dataset.vbpayout), 'payout')));
    $$('[data-vbrefund]').forEach(x => x.addEventListener('click', () => vbMoneyForm(bookings.find(b => b.id === x.dataset.vbrefund), 'refund')));
    $('#vbCount').textContent = `${list.length} bookings · ${bookings.filter(b => b.status === 'requested').length} waiting for vendor`;
    $$('[data-vbm]').forEach(b => b.addEventListener('click', () => { const m = modal('<div id="vfModal"><div class="spinner"></div></div>', 1050); VF.manage($('#vfModal', m), { api, base: '/api/admin/vendors/' + b.dataset.vbm, uploadPath: '/api/admin/upload', districts: A.districts, admin: true, tab: 'bookings', onChange: () => {} }); $('.modal-x', m).addEventListener('click', () => viewVBookingsAdmin()); }));
  };
  $('#aBody').innerHTML = `<p class="small muted" style="margin-top:0">Vendors confirm or reject requests in their panel. You can also do it here via <b>Open vendor → Bookings</b>. The same slot can never be booked twice.</p>
    <div class="toolbar"><input class="input grow" id="vbq" placeholder="Search booking no., vendor, customer, phone..." value="${h(vbFilter.q)}">
      <select id="vbs"><option value="">All statuses</option>${Object.entries(VBL).map(([k, l]) => `<option value="${k}" ${vbFilter.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="a-card"><h3 id="vbCount"></h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Booking</th><th>Date</th><th>Vendor</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody id="vbRows"></tbody></table></div></div>
    ${visitsAdminHtml(visits)}`;
  draw();
  $$('[data-svm]').forEach(b => b.addEventListener('click', () => { const m = modal('<div id="vfModal"><div class="spinner"></div></div>', 1050); VF.manage($('#vfModal', m), { api, base: '/api/admin/vendors/' + b.dataset.svm, uploadPath: '/api/admin/upload', districts: A.districts, admin: true, tab: 'bookings', onChange: () => {} }); $('.modal-x', m).addEventListener('click', () => viewVBookingsAdmin()); }));
  $('#vbq').addEventListener('input', e => { vbFilter.q = e.target.value; draw(); });
  $('#vbs').addEventListener('change', e => { vbFilter.status = e.target.value; draw(); });
}

// Reviews: shop products (from delivered orders) and vendors (from completed bookings), one tab each
let revTab = 'shop';
async function viewVReviewsAdmin() {
  const tabs = `<div class="toolbar" style="margin-bottom:12px"><button class="btn ${revTab === 'shop' ? 'btn-primary' : 'btn-light'} btn-sm" data-rtab="shop">Shop product reviews</button><button class="btn ${revTab === 'vendor' ? 'btn-primary' : 'btn-light'} btn-sm" data-rtab="vendor">Vendor reviews</button></div>`;
  const wireTabs = () => $$('[data-rtab]').forEach(b => b.addEventListener('click', () => { revTab = b.dataset.rtab; viewVReviewsAdmin(); }));
  if (revTab === 'shop') {
    const { reviews } = await api('/api/admin/reviews');
    $('#aBody').innerHTML = `${tabs}<p class="small muted" style="margin-top:0">Written only by customers of a delivered order (order number + mobile), once per item — bookings after the function date. Product stars on the site come only from shown reviews. Hide anything abusive or fake; your reply is shown under the review.</p>
      <div class="a-card"><h3>${reviews.length} product reviews</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Product</th><th>Rating</th><th>Review</th><th>By</th><th>Reply</th><th>Shown</th><th></th></tr></thead><tbody>
      ${reviews.map(r => `<tr><td>${h(r.productName || r.productId)}<div class="small muted">Order #${h(r.orderNumber)}</div></td><td><b>★ ${r.rating}</b></td>
        <td class="small" style="max-width:360px">${h(r.text) || '<span class="muted">(stars only)</span>'}${r.photo ? `<div><a href="${h(r.photo)}" target="_blank" rel="noopener"><img src="${h(r.photo)}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;margin-top:4px"></a></div>` : ''}</td>
        <td class="small">${h(r.name)}${r.district ? ', ' + h(r.district) : ''}<br>${fmtDate(r.createdAt)}</td>
        <td><textarea class="input" rows="2" data-rreply="${r.id}" maxlength="800" placeholder="Reply (optional)" style="min-width:180px">${h(r.reply)}</textarea><button class="btn btn-light btn-sm" data-rsave="${r.id}" style="margin-top:4px">Save reply</button></td>
        <td><label class="switch"><input type="checkbox" data-prv="${r.id}" ${r.status === 'published' ? 'checked' : ''}><span></span></label></td>
        <td><button class="btn btn-light btn-sm" data-rdel="${r.id}" title="Delete">Delete</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">No product reviews yet. Customers get a “Rate & review” button in Track Order once an order is delivered — use “Ask for review” on a delivered order to remind them.</td></tr>'}
      </tbody></table></div></div>`;
    wireTabs();
    $$('[data-prv]').forEach(c => c.addEventListener('change', async () => { try { await api('/api/admin/reviews/' + c.dataset.prv, { method: 'PUT', body: { status: c.checked ? 'published' : 'hidden' } }); toast(c.checked ? 'Review shown' : 'Review hidden — removed from the product rating'); } catch (e) { toast(e.message, true); } }));
    $$('[data-rsave]').forEach(b => b.addEventListener('click', async () => { try { await api('/api/admin/reviews/' + b.dataset.rsave, { method: 'PUT', body: { reply: $(`[data-rreply="${b.dataset.rsave}"]`).value } }); toast('Reply saved ✓'); } catch (e) { toast(e.message, true); } }));
    $$('[data-rdel]').forEach(b => b.addEventListener('click', async () => { if (!confirm('Delete this review for good?')) return; try { await api('/api/admin/reviews/' + b.dataset.rdel, { method: 'DELETE' }); toast('Review deleted'); viewVReviewsAdmin(); } catch (e) { toast(e.message, true); } }));
    return;
  }
  const { reviews } = await api('/api/admin/vreviews');
  $('#aBody').innerHTML = `${tabs}<p class="small muted" style="margin-top:0">Reviews can only be written by customers whose booking was completed (marked "Verified booking"). Hide anything abusive or fake.</p>
    <div class="a-card"><h3>${reviews.length} reviews</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vendor</th><th>Rating</th><th>Review</th><th>By</th><th>Shown</th></tr></thead><tbody>
    ${reviews.map(r => `<tr><td>${h(r.vendorName)}</td><td><b>★ ${r.rating}</b></td><td class="small" style="max-width:420px">${h(r.text)}${r.reply ? `<div class="muted">↳ Vendor: ${h(r.reply)}</div>` : ''}</td>
      <td class="small">${h(r.name)}${r.sample ? ' <span class="chip chip-prod">Sample</span>' : r.verified ? ' <span class="chip pay-paid">Verified booking</span>' : ''}<br>${fmtDate(r.createdAt)}</td>
      <td><label class="switch"><input type="checkbox" data-rv="${r.id}" ${r.status === 'published' ? 'checked' : ''}><span></span></label></td></tr>`).join('') || '<tr><td colspan="5" class="muted">No reviews yet</td></tr>'}
    </tbody></table></div></div>`;
  wireTabs();
  $$('[data-rv]').forEach(c => c.addEventListener('change', async () => { try { await api('/api/admin/vreviews/' + c.dataset.rv, { method: 'PUT', body: { status: c.checked ? 'published' : 'hidden' } }); toast(c.checked ? 'Review shown' : 'Review hidden'); } catch (e) { toast(e.message, true); } }));
}

/* ---------------- Payments & SMS OTP ---------------- */
async function viewIntegrations() {
  const g = await api('/api/admin/integrations');
  const hookUrl = `${location.origin}/api/payments/webhook`;
  const badge = (ok, yes, no) => `<span class="status ${ok ? 'st-delivered' : 'st-placed'}">${ok ? yes : no}</span>`;
  // go-live checklist: what a real family needs before the first real booking, each with where to fix it
  const rd = g.readiness || {}, https = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  const checks = [
    [rd.verifiedReal > 0, `Real vendors live: <b>${rd.verifiedReal || 0}</b>${rd.realVendors > rd.verifiedReal ? ` <span class="muted">(${rd.realVendors - rd.verifiedReal} waiting for verification)</span>` : ''}`, 'Add or verify vendors under Vendors — families can only book vendors you have verified.', '#/vendors'],
    [!rd.showSamples || !rd.sampleVendors, rd.showSamples && rd.sampleVendors ? `<b>${rd.sampleVendors} sample vendors</b> are shown to families (placeholder phone numbers)` : 'Sample vendors are hidden from families', 'Hide them with the switch below once your real vendors are in, so nobody books a sample.', ''],
    [g.sms.provider !== 'console', g.sms.provider !== 'console' ? 'OTP SMS are sent to phones' : 'OTP SMS are <b>not sent</b> — test mode shows them only in the server window', 'Set up Fast2SMS or another provider in "SMS OTP login" below, then send a test SMS.', ''],
    [g.otpRequired, g.otpRequired ? 'Mobile is checked by OTP before every order / booking' : 'Orders and bookings are taken <b>without OTP</b> — a wrong number can hold a vendor\'s date for 48 h', 'Turn on "Verify mobile by OTP before every order" once SMS works.', ''],
    [g.working.online || rd.upi, g.working.online ? `Online payments on (${g.razorpay.mode})` : rd.upi ? 'Direct UPI payment is on' : 'No way to pay online yet — only cash / pay on event', 'Add your UPI ID below (free), or Razorpay keys after KYC.', ''],
    [rd.sitePhone && rd.siteWhatsapp, rd.sitePhone && rd.siteWhatsapp ? 'Help phone and WhatsApp number are set' : 'Help phone / WhatsApp number missing', 'Families call this number when stuck — set it in Settings.', '#/settings'],
    [rd.business, rd.business ? 'Business name, address and email are on the policy pages' : 'Business name / address / email missing on the policy pages', 'Razorpay checks Contact Us, Terms, Privacy, Shipping and Refund pages before approving live payments — fill "Business details" in Settings.', '#/settings'],
    [!!(g.supabase && g.supabase.configured && g.supabase.ok), g.supabase && g.supabase.configured ? (g.supabase.ok ? 'All data is copied to Supabase as it changes' : 'Supabase copy is failing — see the Supabase card') : 'No live copy of the data outside this server', 'Connect Supabase below: if this server breaks, nothing is lost and a new one starts from the copy.', ''],
    [https, https ? 'Site address is secure (https) or local' : 'Site is not on https', 'Put the site on an https address before taking payments and OTP logins.', ''],
  ];
  const ready = checks.every(c => c[0]);
  const goLive = `<div class="a-card golive" style="margin-bottom:14px"><h3>Ready for real bookings? ${badge(ready, 'Ready', `${checks.filter(c => !c[0]).length} to do`)}</h3><div class="pad">
      <ul class="gl-list">${checks.map(([ok, txt, fix, href]) => `<li class="${ok ? 'ok' : 'todo'}"><span class="gl-ic">${ok ? '✓' : '!'}</span><span>${txt}${ok ? '' : `<small>${fix}${href ? ` <a class="link" href="${href}">Open →</a>` : ''}</small>`}</span></li>`).join('')}</ul>
      ${rd.sampleVendors ? `<label class="field" style="flex-direction:row;align-items:center;gap:10px;margin:12px 0 0"><label class="switch"><input type="checkbox" id="glSamples" ${rd.showSamples ? 'checked' : ''}><span></span></label> Show the ${rd.sampleVendors} sample vendors to families <span class="muted small">(turn off at launch — they stay in the data for testing)</span></label>` : ''}
    </div></div>`;
  // Supabase: the live copy of all data (sent a few seconds after every change)
  const sbs = g.supabase || {}, ago = iso => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '—');
  const sbCard = `<form class="a-card" id="sbForm" style="margin-bottom:14px"><h3>Supabase — live copy of all data ${badge(sbs.configured && sbs.ok !== false, sbs.configured ? (sbs.ok ? 'Up to date' : 'Connecting…') : '', sbs.configured ? 'Sync failing' : 'Not connected')}</h3><div class="pad">
      <p class="small muted" style="margin-top:0">Every order, booking, payment and vendor change is copied to your Supabase database a few seconds after it happens — no script to run. ${sbs.hasToken ? 'With the access token the tables are also created and kept up to date with every code update.' : 'Add the access token and the tables are created and kept up to date by themselves (otherwise run <code>database/schema.sql</code> once in Supabase → SQL Editor).'} A new server with an empty data folder starts from the copy in Supabase (set the URL and key as environment variables there).</p>
      ${sbs.configured ? `<div class="kv small" style="margin-bottom:10px"><span>Project</span><b>${h(sbs.ref)}</b><span>Last copied</span><span>${ago(sbs.lastSyncAt)}${sbs.running ? ' · copying now…' : sbs.pending ? ' · change waiting' : ''}</span><span>Snapshot</span><span>${ago(sbs.snapshotAt)}</span><span>Tables updated</span><span>${sbs.schemaAppliedAt ? ago(sbs.schemaAppliedAt) : sbs.hasToken ? '—' : 'by hand (no access token)'}</span>${sbs.lastError || sbs.schemaError ? `<span>Problem</span><b class="bad-txt">${h(sbs.schemaError || sbs.lastError)}</b>` : ''}</div>` : ''}
      <div class="field"><label>Project URL <span class="muted small">(Project Settings → API)</span></label><input name="sbUrl" value="${h(sbs.url || '')}" placeholder="https://abcdefgh.supabase.co" ${sbs.fromEnv ? 'disabled' : ''}></div>
      <div class="field"><label>Service-role key ${sbs.hasKey ? '<span class="ok-txt small">· saved</span>' : ''} <span class="muted small">(secret — never put it in a web page)</span></label><input name="sbServiceKey" type="password" autocomplete="new-password" placeholder="${sbs.hasKey ? '•••••••• (leave empty to keep)' : 'eyJ… service_role key'}" ${sbs.fromEnv ? 'disabled' : ''}></div>
      <div class="field"><label>Access token ${sbs.hasToken ? '<span class="ok-txt small">· saved</span>' : '<span class="muted small">(optional — makes the tables by itself)</span>'}</label><input name="sbAccessToken" type="password" autocomplete="new-password" placeholder="${sbs.hasToken ? '•••••••• (leave empty to keep)' : 'sbp_… from Account → Access Tokens'}" ${sbs.fromEnv ? 'disabled' : ''}></div>
      ${sbs.fromEnv ? '<p class="small muted">Set by environment variables on the server.</p>' : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary">Save & connect</button>${sbs.configured ? '<button type="button" class="btn btn-light" id="sbSync">Copy everything now</button>' : ''}</div>
    </div></form>`;
  $('#aBody').innerHTML = `${goLive}${sbCard}
    <form class="a-card" id="upiForm" style="margin-bottom:14px"><h3>Direct UPI payment – works without Razorpay ${badge(!!g.upiId, 'ON', 'Not set up')}</h3><div class="pad">
      <p class="small muted" style="margin-top:0">Customers see a QR code and an "Open UPI app" button for your UPI ID, pay from GPay / PhonePe / Paytm, then type the 12-digit UPI reference. You check it in your bank app and tap <b>Payment received</b> on the order. No gateway fees.</p>
      <div class="grid-2"><div class="field"><label>Your UPI ID</label><input name="upiId" value="${h(g.upiId)}" placeholder="shopname@okaxis or 98xxxxxxxx@ybl"></div>
      <div class="field"><label>Name shown in UPI app</label><input name="upiName" value="${h(g.upiName)}" placeholder="${h(A.meta.settings.siteName)}"></div></div>
      <button class="btn btn-primary">Save UPI</button>
    </div></form>
    <form class="a-card" id="mapsForm" style="margin-bottom:14px"><h3>Google Maps – optional ${badge(!!(g.googleMapsKey || g.mapsFromEnv), 'Google Maps', 'Using free OpenStreetMap')}</h3><div class="pad">
      <p class="small muted" style="margin-top:0">Customers set their ghar / venue location by typing the address, by GPS, or by moving a pin on a map, and then see the nearest cars, halwai, arkestra and other vendors first. All of this works <b>without any key</b> (free OpenStreetMap). Add a Google Maps key only if you want Google's map and address search. Get one at <b>console.cloud.google.com → APIs → Maps JavaScript API + Geocoding API</b>, and restrict it to your website address.</p>
      <div class="field"><label>Google Maps browser key</label><input name="googleMapsKey" value="${h(g.googleMapsKey)}" placeholder="AIza… (leave empty to use OpenStreetMap)" ${g.mapsFromEnv ? 'disabled' : ''}></div>
      ${g.mapsFromEnv ? '<p class="small muted">Key is set by the GOOGLE_MAPS_KEY environment variable on the server.</p>' : ''}
      <button class="btn btn-primary">Save map setting</button>
    </div></form>
    <div class="a-grid">
    <form class="a-card" id="rzForm"><h3>Online payments – Razorpay ${badge(g.working.online, g.razorpay.mode === 'live' ? 'LIVE – taking real money' : 'ON – test mode', 'OFF')}</h3><div class="pad">
      <p class="small muted" style="margin-top:0">Customers pay by UPI, cards, net banking or wallets. Get keys at <b>dashboard.razorpay.com → Account & Settings → API Keys</b>. Use <b>Test keys</b> (rzp_test_…) first; switch to Live keys after KYC.</p>
      <label class="field" style="flex-direction:row;align-items:center;gap:10px"><label class="switch"><input type="checkbox" name="onlinePayments" ${g.onlinePayments ? 'checked' : ''}><span></span></label> Accept online payments at checkout</label>
      <div class="field"><label>Key ID</label><input name="rzpKeyId" value="${h(g.razorpay.keyId)}" placeholder="rzp_test_xxxxxxxxxxxx" ${g.razorpay.fromEnv ? 'disabled' : ''}></div>
      <div class="field"><label>Key Secret ${g.razorpay.hasSecret ? '<span class="ok-txt small">· saved</span>' : ''}</label><input name="rzpKeySecret" type="password" autocomplete="new-password" placeholder="${g.razorpay.hasSecret ? '•••••••• (leave empty to keep)' : 'paste secret'}" ${g.razorpay.fromEnv ? 'disabled' : ''}></div>
      <div class="field"><label>Webhook secret ${g.razorpay.hasWebhookSecret ? '<span class="ok-txt small">· saved</span>' : '<span class="muted small">(recommended)</span>'}</label><input name="rzpWebhookSecret" type="password" autocomplete="new-password" placeholder="${g.razorpay.hasWebhookSecret ? '•••••••• (leave empty to keep)' : 'secret you type when creating the webhook'}"></div>
      <div class="box small" style="background:#fbf8f9">Webhook URL (Razorpay → Settings → Webhooks, events <b>payment.authorized</b>, <b>payment.captured</b>, <b>payment.failed</b>, <b>refund.processed</b>, <b>refund.failed</b>):<br><code style="word-break:break-all">${h(hookUrl)}</code><br><span class="muted">Webhooks only work once the site is on a public https address. Payments still confirm without them.</span></div>
      ${g.razorpay.fromEnv ? '<p class="small muted">Keys are set by environment variables on the server.</p>' : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary">Save</button><button type="button" class="btn btn-light" id="rzTest">Test keys</button></div>
    </div></form>
    <form class="a-card" id="smsForm"><h3>SMS OTP login ${badge(g.sms.provider !== 'console', 'Sending real SMS', 'Test mode')}</h3><div class="pad">
      <label class="field" style="flex-direction:row;align-items:center;gap:10px"><label class="switch"><input type="checkbox" name="otpLogin" ${g.otpLogin ? 'checked' : ''}><span></span></label> Customers can log in / sign up with mobile OTP</label>
      <label class="field" style="flex-direction:row;align-items:center;gap:10px"><label class="switch"><input type="checkbox" name="otpRequired" ${g.otpRequired ? 'checked' : ''}><span></span></label> Verify mobile by OTP before every order <span class="muted small">(stops fake COD orders)</span></label>
      <div class="field"><label>SMS provider</label><select name="smsProvider" id="smsProv" ${g.sms.fromEnv ? 'disabled' : ''}>
        <option value="console" ${g.sms.provider === 'console' ? 'selected' : ''}>Test mode – show OTP in server window (no SMS)</option>
        <option value="fast2sms" ${g.sms.provider === 'fast2sms' ? 'selected' : ''}>Fast2SMS (OTP route)</option>
        <option value="custom" ${g.sms.provider === 'custom' ? 'selected' : ''}>Custom SMS URL (MSG91, 2Factor, any provider)</option></select></div>
      <div class="field" data-prov="fast2sms"><label>Fast2SMS API key ${g.sms.apiKey ? `<span class="ok-txt small">· saved ${h(g.sms.apiKey)}</span>` : ''}</label><input name="smsApiKey" type="password" autocomplete="new-password" placeholder="${g.sms.apiKey ? 'leave empty to keep' : 'Fast2SMS → Dev API → API key'}"></div>
      <div class="field" data-prov="custom"><label>SMS URL – use {phone} and {otp}</label><textarea name="smsUrlTemplate" rows="3" placeholder="https://provider.example/api?apikey=KEY&mobile=91{phone}&otp={otp}">${h(g.sms.urlTemplate)}</textarea>
        <span class="small muted">The site calls this URL (GET) for every OTP. Your provider gives the exact format; DLT-approved OTP template required in India.</span></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn btn-primary">Save</button><input class="input" id="smsPhone" placeholder="Your mobile" maxlength="10" style="width:150px"><button type="button" class="btn btn-light" id="smsTest">Send test SMS</button></div>
      <p class="small muted" style="margin-bottom:0">Admin accounts always log in with password. OTPs are valid 5 minutes, max 5 per hour per number.</p>
    </div></form></div>`;
  const gl = $('#glSamples');
  if (gl) gl.addEventListener('change', async () => {
    try { await api('/api/admin/settings', { method: 'PUT', body: { showSamples: gl.checked } }); toast(gl.checked ? 'Sample vendors shown to families' : 'Sample vendors hidden from families ✓'); viewIntegrations(); } catch (e) { toast(e.message, true); gl.checked = !gl.checked; }
  });
  const provVis = () => $$('[data-prov]').forEach(x => x.classList.toggle('hide', x.dataset.prov !== $('#smsProv').value));
  provVis(); $('#smsProv').addEventListener('change', provVis);
  const save = async (form, extra) => {
    const fd = new FormData(form);
    const body = { ...Object.fromEntries(fd), ...extra };
    try { await api('/api/admin/integrations', { method: 'PUT', body }); toast('Saved ✓'); viewIntegrations(); } catch (e) { toast(e.message, true); }
  };
  $('#rzForm').addEventListener('submit', e => { e.preventDefault(); save(e.target, { onlinePayments: e.target.onlinePayments.checked }); });
  $('#upiForm').addEventListener('submit', e => { e.preventDefault(); save(e.target, {}); });
  $('#mapsForm').addEventListener('submit', e => { e.preventDefault(); save(e.target, {}); });
  $('#sbForm').addEventListener('submit', e => { e.preventDefault(); save(e.target, {}); setTimeout(viewIntegrations, 4000); }); // the first copy takes a few seconds
  const sbSync = $('#sbSync');
  if (sbSync) sbSync.addEventListener('click', async () => {
    sbSync.disabled = true; sbSync.textContent = 'Copying…';
    try { await api('/api/admin/supabase/sync', { method: 'POST' }); toast('Everything copied to Supabase ✓'); } catch (err) { toast(err.message, true); }
    viewIntegrations();
  });
  $('#smsForm').addEventListener('submit', e => { e.preventDefault(); save(e.target, { otpLogin: e.target.otpLogin.checked, otpRequired: e.target.otpRequired.checked }); });
  $('#rzTest').addEventListener('click', async () => { try { const r = await api('/api/admin/integrations/test-razorpay', { method: 'POST' }); toast(r.message); } catch (e) { toast(e.message, true); } });
  $('#smsTest').addEventListener('click', async () => { try { const r = await api('/api/admin/integrations/test-sms', { method: 'POST', body: { phone: $('#smsPhone').value } }); toast(r.message); } catch (e) { toast(e.message, true); } });
}

const VIEWS = { lagan: viewLaganAdmin, vendors: viewVendorsAdmin, vbookings: viewVBookingsAdmin, vreviews: viewVReviewsAdmin, integrations: viewIntegrations, dashboard: viewDashboard, orders: viewOrders, calendar: viewCalendar, products: viewProducts, packages: viewPackages, categories: viewCategories, districts: viewDistricts, users: viewUsers, settings: viewSettings };

let pollTimer = null;
async function start() {
  const [me, meta, cats, dists] = await Promise.all([api('/api/me'), api('/api/meta'), api('/api/admin/categories'), api('/api/admin/districts')]);
  A.user = me.user; A.meta = meta;
  A.cats = cats.categories.sort((a, b) => a.order - b.order);
  A.districts = dists.districts;
  shell();
  window.onhashchange = route;
  await pollOrders();
  clearInterval(pollTimer);
  pollTimer = setInterval(pollOrders, 20000);
  route();
}

(async function boot() {
  if (!A.token) return loginPage();
  try { await start(); } catch { A.token = null; store.set('token', null); loginPage(); }
})();
