/* Vivah Saathi storefront + user panel (vanilla JS, hash router) */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inr = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const offPct = p => p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const shortDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
const unsplash = (id, w = 600, hgt = w) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${hgt}&fit=crop&auto=format&q=70`;

const store = {
  get(k, d) { try { const v = localStorage.getItem('sa_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sa_' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

const S = {
  meta: null, user: null, token: store.get('token', null), cart: store.get('cart', []),
  district: store.get('district', null), events: store.get('events', {}), myOrders: store.get('myorders', []),
  side: store.get('side', ''), // whose wedding: 'boy' (bete ki) | 'girl' (beti ki) | 'skip' | '' (not asked yet)
  products: new Map(), presetEvent: null, lastOrder: null,
};

// What each function / event needs — used for "Shop by function" pages
const EVENT_INFO = {
  'Sagai / Roka': { hi: 'सगाई / रोका', img: '1710857397974-f0617001c39e', cats: ['gifts', 'mithai', 'pandit-ji', 'photo-video', 'catering', 'decoration'] },
  'Tilak / Chheka': { hi: 'तिलक', img: '1754782915842-aa4fca6c203a', cats: ['puja-samagri', 'pandit-ji', 'mithai', 'photo-video', 'decoration', 'gifts'] },
  'Haldi': { hi: 'हल्दी', img: '1681717166573-f71589207785', cats: ['mehndi-haldi', 'puja-samagri', 'pandit-ji', 'decoration', 'photo-video', 'band-dj'] },
  'Mehndi': { hi: 'मेहंदी', img: '1771992226177-759e116e72f4', cats: ['mehndi-haldi', 'decoration', 'photo-video', 'band-dj', 'catering'] },
  'Matkor': { hi: 'मटकोर', img: '1786822550756-4a5c22ef131c', cats: ['puja-samagri', 'pandit-ji', 'band-dj', 'mithai'] },
  // mama ghar se bhaat: kapde, gahne, mithai for the bride's / groom's family
  'Bhaat': { hi: 'भात', img: '1610173827043-9db50e0d8ef9', cats: ['wedding-wear', 'gifts', 'mithai', 'band-dj', 'car-transport'] },
  'Sangeet': { hi: 'संगीत', img: '1470225620780-dba8ba36b745', cats: ['band-dj', 'decoration', 'catering', 'photo-video', 'tent'] },
  'Shaadi (Vivah)': { hi: 'विवाह', img: '1587271636175-90d58cdad458', cats: ['puja-samagri', 'pandit-ji', 'tent', 'decoration', 'catering', 'photo-video', 'wedding-wear', 'mithai', 'cards'] },
  'Baraat': { hi: 'बारात', img: '1781077128735-ee92e7377d78', cats: ['car-transport', 'band-dj', 'wedding-wear', 'decoration'] },
  'Bidai': { hi: 'विदाई', img: '1790845160661-f04a7c11c13f', cats: ['car-transport', 'decoration', 'band-dj', 'gifts', 'photo-video'] },
  'Reception': { hi: 'रिसेप्शन', img: '1745573673416-66e829644ae9', cats: ['catering', 'tent', 'decoration', 'photo-video', 'band-dj', 'gifts'] },
  'Other': { hi: 'अन्य', img: '1745573673416-66e829644ae9', cats: [] },
};
const evShort = e => e.split(' (')[0].split(' /')[0];

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && S.token) setSession(null, null);
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// Anonymous analytics ping (visits, product views, add-to-cart, checkout)
const ping = (type, productId) => fetch('/api/a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, productId }) }).catch(() => {});

// Live slot check for a service on a date; disables the given buttons when fully booked
const availabilityChecks = new WeakMap();
async function checkAvail(p, date, el, btns) {
  const check = {};
  availabilityChecks.set(el, check);
  btns.forEach(b => { b.disabled = false; });
  if (p.type !== 'service' || !date) { el.innerHTML = ''; return; }
  btns.forEach(b => { b.disabled = true; });
  el.innerHTML = '<span class="muted small">Checking availability…</span>';
  try {
    const r = await api(`/api/availability?productId=${encodeURIComponent(p.id)}&date=${date}`);
    if (availabilityChecks.get(el) !== check) return;
    el.innerHTML = r.available
      ? `<span class="ok-txt">✓ Available on ${fmtDate(date)}</span>`
      : `<span class="bad-txt">✗ Fully booked on ${fmtDate(date)} — please choose another date</span>`;
    btns.forEach(b => { b.disabled = !r.available; });
  } catch {
    if (availabilityChecks.get(el) !== check) return;
    el.textContent = 'Availability will be checked at checkout.';
    btns.forEach(b => { b.disabled = false; });
  }
}

function setSession(token, user) {
  S.token = token; S.user = user;
  store.set('token', token);
  if (user && S.meta && mergePrefs(user)) renderDistrict();
  renderAcct();
}

/* ---------------- Saved choices ↔ account ---------------- */
// Function dates, side (bete / beti ki) and district live in this browser and, when logged in, on the account too, so
// they follow the customer to any phone. A filled value is never replaced by an empty one; when both have a value,
// the one changed more recently wins (sa_prefsAt here, prefs.updatedAt on the server).
let prefTimer = null;
const prefsNow = () => ({ events: Object.fromEntries(Object.entries(S.events || {}).filter(([, d]) => d)), side: S.side || '', district: S.district || '' });
const prefsKey = p => JSON.stringify([Object.entries((p && p.events) || {}).filter(([, d]) => d).sort(), (p && p.side) || '', (p && p.district) || '']);
function pushPrefs() {
  clearTimeout(prefTimer);
  if (!S.user) return;
  prefTimer = setTimeout(() => api('/api/me', { method: 'PUT', body: { prefs: prefsNow() } }).then(r => { if (S.user) S.user.prefs = r.user.prefs; }).catch(() => {}), 500);
}
function savePref(k) { store.set(k, S[k]); store.set('prefsAt', new Date().toISOString()); pushPrefs(); }
// returns true when this browser took values from the account
function mergePrefs(user) {
  const sp = user.prefs || {}, serverNewer = (sp.updatedAt || '') > store.get('prefsAt', '');
  const pick = (mine, theirs) => (!theirs ? mine : !mine ? theirs : serverNewer ? theirs : mine);
  const before = prefsKey(prefsNow()), ev = {};
  for (const e of new Set([...Object.keys(S.events || {}), ...Object.keys(sp.events || {})])) { const d = pick(S.events[e], (sp.events || {})[e]); if (d) ev[e] = d; }
  S.events = ev; S.side = pick(S.side, sp.side) || ''; S.district = pick(S.district, sp.district && district(sp.district) ? sp.district : '') || null;
  store.set('events', S.events); store.set('side', S.side); store.set('district', S.district);
  if (prefsKey(prefsNow()) !== prefsKey(sp)) pushPrefs(); // the account is missing something this browser has
  return prefsKey(prefsNow()) !== before;
}

function toast(msg, isErr) {
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' err' : '');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

const cat = id => S.meta.categories.find(c => c.id === id) || { name: 'Other', emoji: '🎁', color: '#f3eef0' };
const district = id => S.meta.districts.find(d => d.id === id);
const waLink = text => `https://wa.me/${S.meta.settings.whatsapp}?text=${encodeURIComponent(text)}`;
// "Share with family": WhatsApp opens the contact picker with the item and its link (the whole family decides together)
const shareLink = (title, path) => `https://wa.me/?text=${encodeURIComponent(`${title}\n${location.origin}/${path}`)}`;

// Photo with emoji fallback (shown if there is no photo or it fails to load)
function ph(src, emoji, bg, extra = '') {
  return `<div class="ph ${extra}" style="background:${h(bg || '#f6eef0')}">${h(emoji || '🎁')}${src ? `<img src="${h(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>`;
}
const pPhoto = (p, extra = '', inner = '') => ph(p.image, p.emoji, cat(p.cat).color, extra).replace(/<\/div>$/, inner + '</div>');

/* ---------------- Cart model ---------------- */
// A booking line is unique per product + event (e.g. photographer for Haldi and for Shaadi)
const sameLine = (l, id, ev) => l.productId === id && (l.event || '') === (ev || '');
const linesFor = id => S.cart.filter(l => l.productId === id);
function saveCart() { store.set('cart', S.cart); afterCartChange(); }
let lastCartCount = null;
const vendorCount = () => (window.VENDORS ? window.VENDORS.count() : 0);
function afterCartChange() {
  const n = S.cart.length + vendorCount();
  $('#cartCount').textContent = n; $('#cartCount').classList.toggle('hide', !n);
  $('#bnavCount').textContent = n; $('#bnavCount').classList.toggle('hide', !n);
  if (lastCartCount != null && n > lastCartCount) ['#cartCount', '#bnavCount'].forEach(s => { const b = $(s); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
  lastCartCount = n;
  $$('[data-for]').forEach(el => { const p = S.products.get(el.dataset.for); if (p) el.innerHTML = cardAction(p); });
  renderCartbar();
}
function addProduct(id, delta) {
  const p = S.products.get(id);
  const step = p.minQty > 1 ? Math.max(1, Math.round(p.minQty / 10)) : 1;
  let line = S.cart.find(l => sameLine(l, id, ''));
  if (!line && delta > 0) { S.cart.push({ productId: id, qty: p.minQty || 1, event: '', eventDate: '' }); toast(`Added: ${p.name}`); ping('carts', id); }
  else if (line) {
    line.qty += delta * step;
    if (line.qty < (p.minQty || 1)) { S.cart = S.cart.filter(l => l !== line); toast('Removed from cart'); }
  }
  saveCart();
}
function setEventDate(ev, date) {
  if (!ev) return;
  S.events[ev] = date; savePref('events');
  S.cart.forEach(l => {
    if (l.event === ev && date) l.eventDate = date;
    // full-ceremony bookings keep a date per rasam: the same function date applies there too
    if (date && Array.isArray(l.dates)) for (const d of l.dates) if (d.event === ev) d.date = date;
  });
}
// every date of a cart / order line: one function, or each rasam of a full-ceremony booking
const datesOf = l => ((l.dates || []).length ? l.dates : l.eventDate ? [{ event: l.event || '', date: l.eventDate }] : []);
const datesChips = l => datesOf(l).map(d => `<span class="chip chip-ev">${h(evShort(d.event || 'Event'))} · ${fmtDate(d.date)}</span>`).join(' ');
const datesText = l => datesOf(l).map(d => `${evShort(d.event)} ${fmtDate(d.date)}`).join(', ');
// ci = the line's own place in S.cart, so − / + / Remove always act on that exact line (even if two look alike)
// Tent size → area and how many guests fit. Rough rule of thumb: about 8 sq ft a guest on chairs in rows,
// 12 at dinner with round tables, 6 standing / buffet. "per 1000 sq ft" tents are booked by area.
const SQFT_PER = { chairs: 8, tables: 12, standing: 6 };
const SEAT_NAME = { chairs: 'on chairs', tables: 'at dinner tables', standing: 'standing / buffet' };
function tentSize(s) {
  const m = /(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*ft/i.exec(s || '');
  if (m) return { w: +m[1], l: +m[2], area: Math.round(m[1] * m[2]) };
  const u = /per\s*([\d,]+)\s*sq\s*ft/i.exec(s || '');
  return u ? { per: Number(u[1].replace(/,/g, '')) } : null;
}
const nn = v => Math.round(v).toLocaleString('en-IN');
const seatsTxt = area => `~${nn(area / SQFT_PER.chairs)} on chairs · ~${nn(area / SQFT_PER.tables)} at tables`;
// Drawn top view of a tent package: canopy to scale, qanat walls, entrance, carpet aisle, stage, tables or chair rows
function tentPlan(p, sz) {
  const inc = (p.includes || []).join(' ').toLowerCase(), small = /mandap|stage/i.test(p.name);
  const W = 300, sc = Math.min(W / sz.w, 220 / sz.l), w = sz.w * sc, l = sz.l * sc, x0 = (340 - w) / 2, y0 = 22;
  const sides = Number((/qanat on (\d)/.exec(inc) || [])[1] || (/drape|wall/.test(inc) ? 3 : 0));
  const wall = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#7a1031" stroke-width="5" stroke-linecap="round"/>`;
  let body = '';
  if (small) {
    // stage / mandap: backdrop at the back, sofa or havan kund in the middle, four pillars for a mandap
    const mandap = /mandap/i.test(p.name);
    body = mandap ? [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => `<circle cx="${x0 + 8 + a * (w - 16)}" cy="${y0 + 8 + b * (l - 16)}" r="5" fill="#d4a017"/>`).join('') + `<rect x="${x0 + w / 2 - 12}" y="${y0 + l / 2 - 12}" width="24" height="24" fill="#f97316" opacity=".8"/><text x="${x0 + w / 2}" y="${y0 + l / 2 + 26}" font-size="10" text-anchor="middle" fill="#7c2d12">havan kund</text>`
      : `<rect x="${x0}" y="${y0}" width="${w}" height="8" fill="#db2777" opacity=".7"/><text x="${x0 + w / 2}" y="${y0 + 20}" font-size="10" text-anchor="middle" fill="#7c2d12">flower backdrop</text><rect x="${x0 + w / 2 - 30}" y="${y0 + l / 2 - 8}" width="60" height="16" rx="4" fill="#d4a017"/><text x="${x0 + w / 2}" y="${y0 + l / 2 + 4}" font-size="9" text-anchor="middle" fill="#fff">sofa</text>`;
  } else {
    const stage = /stage|sofa|mandap/.test(inc), tables = Number((/(\d+)\s*(?:round )?tables/.exec(inc) || [])[1] || 0), carpet = /carpet|aisle/.test(inc);
    if (stage) body += `<rect x="${x0 + w * .3}" y="${y0 + 6}" width="${w * .4}" height="${Math.max(16, l * .12)}" rx="3" fill="#d4a017"/><text x="${x0 + w / 2}" y="${y0 + 6 + Math.max(16, l * .12) / 2 + 3}" font-size="9" text-anchor="middle" fill="#fff">stage</text>`;
    if (carpet) body += `<rect x="${x0 + w / 2 - 6}" y="${y0 + (stage ? Math.max(16, l * .12) + 8 : 4)}" width="12" height="${l - (stage ? Math.max(16, l * .12) + 8 : 4)}" fill="#dc2626" opacity=".55"/>`;
    // seating: round tables when the package has them, otherwise rows of chairs on both sides of the aisle
    const top = y0 + (stage ? Math.max(16, l * .12) + 16 : 12), rows = [];
    if (tables) { const cols = Math.ceil(Math.sqrt(tables * w / l)), rws = Math.ceil(tables / cols); for (let i = 0; i < tables; i++) rows.push(`<circle cx="${x0 + (i % cols + .5) * w / cols}" cy="${top + (Math.floor(i / cols) + .5) * (y0 + l - top - 6) / rws}" r="${Math.min(8, w / cols / 3)}" fill="#fff" stroke="#7a1031"/>`); }
    else for (let r = top; r < y0 + l - 10; r += 9) for (let c = x0 + 8; c < x0 + w - 6; c += 9) if (!carpet || Math.abs(c - (x0 + w / 2)) > 10) rows.push(`<rect x="${c}" y="${r}" width="5" height="5" fill="#7a1031" opacity=".35"/>`);
    body += rows.join('');
  }
  const walls = [sides >= 1 ? wall(x0, y0, x0 + w, y0) : '', sides >= 2 ? wall(x0, y0, x0, y0 + l) : '', sides >= 3 ? wall(x0 + w, y0, x0 + w, y0 + l) : '', sides >= 4 ? wall(x0, y0 + l, x0 + w, y0 + l) : ''].join('');
  return `<svg class="tent-plan" viewBox="0 0 340 ${l + 60}" role="img" aria-label="Top view of the set-up">
    <rect x="${x0}" y="${y0}" width="${w}" height="${l}" fill="#fff7e6" stroke="#d4a017" stroke-dasharray="5 3" stroke-width="1.5"/>${body}${walls}
    <text x="${x0 + w / 2}" y="14" font-size="11" text-anchor="middle" font-weight="700" fill="#5b3a06">${sz.w} ft</text>
    <text x="${x0 - 8}" y="${y0 + l / 2}" font-size="11" text-anchor="middle" font-weight="700" fill="#5b3a06" transform="rotate(-90 ${x0 - 8} ${y0 + l / 2})">${sz.l} ft</text>
    ${!small && sides < 4 ? `<text x="${x0 + w / 2}" y="${y0 + l + 16}" font-size="10" text-anchor="middle" fill="#7a1031">▲ entrance</text>` : ''}
    <text x="170" y="${l + 54}" font-size="9.5" text-anchor="middle" fill="#8a7f83">Top view, to scale${sides ? ` · thick line = qanat (${sides} side${sides > 1 ? 's' : ''})` : ''}</text></svg>`;
}
// tent package page: size, area, guests, components, how it looks, and "which size do I need?"
function tentBox(p) {
  const sz = tentSize(p.tentSize); if (!sz) return '';
  const small = /mandap|stage/i.test(p.name), photos = [p.image, ...(p.gallery || [])].filter(Boolean);
  const stats = sz.per ? [[`per ${nn(sz.per)} sq ft`, 'sold by area'], [`~${nn(sz.per / SQFT_PER.chairs)}`, 'guests on chairs per unit'], [`~${nn(sz.per / SQFT_PER.tables)}`, 'at tables per unit']]
    : small ? [[p.tentSize, 'size'], [nn(sz.area), 'sq ft']]
    : [[p.tentSize, 'size'], [nn(sz.area), 'sq ft covered'], [`~${nn(sz.area / SQFT_PER.chairs)}`, 'guests on chairs'], [`~${nn(sz.area / SQFT_PER.tables)}`, 'at dinner tables'], [`~${nn(sz.area / SQFT_PER.standing)}`, 'standing / buffet']];
  return `<div class="box tent-box"><h3>Tent details</h3>
    <div class="tb-stats">${stats.map(([b, s]) => `<div><b>${h(b)}</b><span>${h(s)}</span></div>`).join('')}</div>
    ${(p.includes || []).length ? `<div class="tb-comp"><b>What you get</b><div>${p.includes.map(i => `<span>✓ ${h(i)}</span>`).join('')}</div></div>` : ''}
    <div class="tb-look"><b>How it will look</b><div class="tb-look-g">${sz.per ? '' : tentPlan(p, sz)}${photos.map((u, i) => `<a href="${h(u)}" target="_blank" rel="noopener" class="tb-ph"><img src="${h(u)}" alt="Set-up photo ${i + 1}" loading="lazy" onerror="this.parentNode.remove()"></a>`).join('')}</div></div>
    ${small ? '' : `<div class="tb-fit"><b>Which size do I need?</b><div class="tb-fit-f"><input type="number" class="input" id="tfG" min="1" max="20000" placeholder="How many guests?" inputmode="numeric"><select class="input" id="tfS">${Object.keys(SQFT_PER).map(k => `<option value="${k}">${k === 'chairs' ? 'Chairs in rows' : k === 'tables' ? 'Dinner at tables' : 'Standing / buffet'}</option>`).join('')}</select></div><div id="tfOut" class="small muted">Enter guests to check if this ${sz.per ? 'tent area' : 'tent'} is enough.</div></div>`}
    <p class="small muted" style="margin:8px 0 0">Guest numbers are a rough guide (about 8 sq ft a guest on chairs, 12 at tables, 6 standing). Not sure? <a class="link" href="#/vendors?type=tent">Book a free site visit</a> — a tent house measures your place.</p></div>`;
}
// a product with styles (mala, jaimala…): the line carries the chosen style's name, photo, size and price
const styleOf = (p, key) => ((p.styles || []).length ? p.styles.find(s => s.key === key) || p.styles[0] : null);
const styled = (p, key) => { const st = p && styleOf(p, key); return st ? { ...p, name: `${p.name} — ${st.name}`, price: st.price, mrp: st.price, unit: st.unit || p.unit, image: st.photo || p.image } : p; };
function cartLines() { return S.cart.map((l, ci) => ({ ...l, ci, p: styled(S.products.get(l.productId), l.style) })).filter(l => l.p); }
// a samagri kit line can carry extras (more of a kit item, or items from other kits), priced on their own
const extrasAmt = l => (l.extras || []).reduce((a, x) => a + x.price * x.qty, 0);
const lineAmt = l => l.p.price * l.qty + extrasAmt(l);
const extrasHtml = l => ((l.extras || []).length ? `<div class="ci-extras">${l.extras.map(x => `<span>${x.inKit ? '+ Extra' : '+ Added'}: ${h(x.name)} × ${x.qty} <small>(${h(x.unit)})</small> <b>${inr(x.price * x.qty)}</b></span>`).join('')}</div>` : '');
function totals(lines, distId) {
  const s = S.meta.settings;
  const sub = lines.reduce((a, l) => a + lineAmt(l), 0);
  const mrp = lines.reduce((a, l) => a + l.p.mrp * l.qty + extrasAmt(l), 0);
  const goods = lines.filter(l => l.p.type === 'product').reduce((a, l) => a + lineAmt(l), 0);
  const d = district(distId);
  let delivery = goods > 0 && goods < s.freeDeliveryAbove ? s.deliveryCharge : 0;
  if (goods > 0 && d) delivery += d.extraCharge || 0;
  const advance = Math.round(lines.filter(l => l.p.type === 'service').reduce((a, l) => a + l.p.price * l.qty, 0) * s.advancePercent / 100);
  return { sub, mrp, discount: mrp - sub, delivery, total: sub + delivery, advance, goods };
}
function cartWhatsappText(lines) {
  const d = district(S.district);
  const t = totals(lines, S.district);
  return `Namaste ${S.meta.settings.siteName} 🙏\nMujhe ye order / booking karni hai:\n\n` +
    lines.map((l, i) => `${i + 1}. ${l.p.name} × ${l.qty} ${l.p.unit} = ${inr(l.p.price * l.qty)}${(l.extras || []).map(x => `\n    + ${x.name} × ${x.qty} (${x.unit}) = ${inr(x.price * x.qty)}`).join('')}${l.event ? `\n    ${(l.dates || []).length ? datesText(l) : `${l.event}${l.eventDate ? ', ' + fmtDate(l.eventDate) : ''}`}` : ''}`).join('\n') +
    `\n\nTotal: ${inr(t.total)}${d ? `\nDistrict: ${d.name}, ${d.state}` : ''}`;
}

/* ---------------- Motion helpers ---------------- */
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
// Picture flies from the product into the cart icon
function flyToCart(fromEl) {
  if (!fromEl || reduceMotion()) return;
  const src = fromEl.querySelector ? (fromEl.closest('.pcard, .book-head, .pdp-img, .pk') || fromEl).querySelector('.ph img') : null;
  const mobile = innerWidth <= 800;
  const target = mobile ? $('#bnav a[data-nav="cart"]') : $('#cartCount').parentElement;
  if (!src || !target) return;
  const a = src.getBoundingClientRect(), b = target.getBoundingClientRect();
  const img = document.createElement('img');
  img.src = src.currentSrc || src.src; img.className = 'fly'; img.alt = '';
  img.style.left = a.left + a.width / 2 - 32 + 'px'; img.style.top = a.top + a.height / 2 - 32 + 'px';
  document.body.appendChild(img);
  requestAnimationFrame(() => {
    img.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(.25) rotate(20deg)`;
    img.style.opacity = '.4';
  });
  setTimeout(() => { img.remove(); const icon = target.querySelector('.bi') || target; icon.classList.remove('cart-wiggle'); void icon.offsetWidth; icon.classList.add('cart-wiggle'); }, 760);
}
// Sections fade up as they scroll into view; cards inside follow one by one
let revealObs = null;
function revealOnScroll() {
  if (reduceMotion() || !('IntersectionObserver' in window)) return;
  revealObs = revealObs || new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('#app .sec, #app .steps, #app .listing > .panel, #app .pdp, #app .wa-band').forEach(el => {
    if (el.classList.contains('reveal')) return;
    el.classList.add('reveal');
    $$('.pcard, .pk, .ev-tile, .tile', el).forEach((c, i) => c.style.setProperty('--i', Math.min(i, 10)));
    revealObs.observe(el);
  });
  // safety net: never leave content hidden if the observer is delayed (background tabs, old browsers)
  clearTimeout(revealOnScroll.t);
  revealOnScroll.t = setTimeout(() => $$('#app .reveal:not(.in)').forEach(el => { if (el.getBoundingClientRect().top < innerHeight * 1.2) el.classList.add('in'); }), 900);
  setTimeout(() => $$('#app .reveal:not(.in)').forEach(el => el.classList.add('in')), 4000);
}
const petals = (n = 16) => reduceMotion() ? '' : `<div class="petals" aria-hidden="true">${Array.from({ length: n }, () => `<i style="left:${Math.round(Math.random() * 100)}%;animation-duration:${(6 + Math.random() * 6).toFixed(1)}s;animation-delay:-${(Math.random() * 10).toFixed(1)}s;transform:scale(${(0.7 + Math.random() * 0.6).toFixed(2)})"></i>`).join('')}</div>`;
const skeleton = (n = 8) => { app().innerHTML = `<div class="panel"><div style="padding:16px"><div class="skel" style="height:22px;width:40%"></div><div class="skel" style="height:12px;width:25%;margin-top:10px"></div></div><div class="skel-grid">${Array.from({ length: n }, () => '<div class="skel-card"><div class="skel img"></div><div class="skel l"></div><div class="skel l" style="width:60%"></div><div class="skel l" style="width:40%;height:18px"></div></div>').join('')}</div></div>`; };

/* ---------------- Product card ---------------- */
function cardAction(p) {
  if (p.type === 'service') {
    const n = linesFor(p.id).length;
    return n ? `<button class="add-btn done" data-book="${p.id}">✓ Booked${n > 1 ? ` (${n})` : ''} · Add more</button>`
      : `<button class="add-btn svc" data-book="${p.id}">Book Now</button>`;
  }
  const l = S.cart.find(x => sameLine(x, p.id, ''));
  return l ? `<div class="stepper"><button data-dec="${p.id}" aria-label="Less">−</button><span>${l.qty} ${h(p.unit.length <= 6 ? p.unit : '')}</span><button data-inc="${p.id}" aria-label="More">+</button></div>`
    : `<button class="add-btn" data-inc="${p.id}">+ Add to Cart</button>`;
}
function card(p) {
  const wished = S.user && S.user.wishlist.includes(p.id);
  const off = offPct(p);
  return `<div class="pcard">
    <button class="wish ${wished ? 'on' : ''}" data-wish="${p.id}" title="Wishlist" aria-label="Wishlist">♥</button>
    <a href="#/p/${p.id}">${pPhoto(p, '', `${off ? `<span class="offtag">${off}% OFF</span>` : ''}<span class="chip tag ${p.type === 'service' ? 'chip-svc' : 'chip-prod'}">${p.type === 'service' ? '📅 Booking' : '🚚 Delivery'}</span>`)}</a>
    <div class="pbody">
      <a class="pname" href="#/p/${p.id}">${h(p.name)}</a>
      ${ratingBadge(p)}
      <div class="pprice">${(p.styles || []).length > 1 ? '<small class="muted">from</small> ' : ''}<span class="price">${inr(p.price)}</span>${off ? `<span class="mrp">${inr(p.mrp)}</span>` : ''}${(p.styles || []).length > 1 ? ` <small class="muted">· ${p.styles.length} ${p.optKind === 'brand' ? 'companies' : 'styles'}</small>` : ''}</div>
      <div class="punit">per ${h(p.unit)}${p.minQty > 1 ? ` · min ${p.minQty}` : ''}</div>
      ${p.day ? `<div class="pday ${p.day.left ? '' : 'full'}">${p.day.left ? `✓ Free on ${shortDate(p.day.date)}${p.day.left <= 2 ? ` · only ${p.day.left} left` : ''}` : `✗ Booked on ${shortDate(p.day.date)}`}</div>` : ''}
      <div class="pact" data-for="${p.id}">${cardAction(p)}</div>
    </div>
  </div>`;
}

/* ---------------- Header / chrome ---------------- */
function renderChrome() {
  const s = S.meta.settings;
  document.title = `${s.siteName} – Wedding Samagri & Bookings | Bihar & UP`;
  $('#siteName').textContent = s.siteName; $('#footName').textContent = s.siteName;
  $('#tagline').textContent = s.tagline;
  $('#announce').textContent = s.announcement; $('#announce').classList.toggle('hide', !s.announcement);
  $('#year').textContent = new Date().getFullYear();
  $('#footPhone').classList.toggle('hide', !s.phone);
  $('#footPhone').textContent = '📞 ' + s.phone; $('#footPhone').href = 'tel:' + s.phone.replace(/\s/g, '');
  $('#footMail').classList.toggle('hide', !s.email);
  $('#footMail').textContent = '✉️ ' + s.email; $('#footMail').href = 'mailto:' + s.email;
  for (const link of [$('#footWa'), $('#waFloat')]) {
    link.classList.toggle('hide', !s.whatsapp);
    link.href = 'https://wa.me/' + s.whatsapp;
  }
  drawSideCats();
  $('#catbar').innerHTML = `<a class="cat-pill vendors-pill" data-cat="vendors" href="#/vendors"><span class="ic">🤝</span><span>All Vendors</span></a><a class="cat-pill ark-pill" data-cat="arkestra" href="#/arkestra"><span class="ic">🎤</span><span>Orchestra</span></a><a class="cat-pill car-pill" data-cat="cars" href="#/cars"><span class="ic">🚗</span><span>Car Rental</span></a>` + S.meta.categories.map(c => `<a class="cat-pill" data-cat="${c.id}" href="${SHOP_PAGE[c.id] || `#/c/${c.id}`}"><span class="ic" style="background:${h(c.color)}">${h(c.emoji)}${c.image ? `<img src="${h(c.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span><span>${h((NICE[c.id] || c.name).split('&')[0].split(',')[0].trim())}</span>${c.off ? `<em class="off-badge">${c.off}% off</em>` : ''}</a>`).join('');
  $('#footCats').innerHTML = S.meta.categories.slice(0, 7).map(c => `<a href="#/c/${c.id}">${h(c.name)}</a>`).join('');
  renderDistrict(); renderAcct(); afterCartChange();
}
function renderDistrict() {
  const d = district(S.district), loc = window.GEO && GEO.get();
  $('#districtBtn .sub').textContent = loc ? 'Ghar / venue' : 'Deliver to';
  $('#districtLbl').textContent = loc ? (loc.label.length > 20 ? loc.label.slice(0, 19) + '…' : loc.label)
    : d ? `${d.name.replace(/\s*\(.*\)/, '')}, ${d.state === 'Bihar' ? 'BR' : 'UP'}` : 'Select';
}

// Customer's ghar / venue location: nearest cars, halwai, arkestra and vendors are shown first
function pickHomeLocation(after) {
  const cur = GEO.get();
  GEO.pick({
    initial: cur, district: S.district,
    onPick(loc) {
      GEO.set(loc);
      if (loc.district) { S.district = loc.district; savePref('district'); }
      renderDistrict(); toast('📍 Showing the nearest first from ' + loc.label);
      if (after) after(); else route();
    },
    onClear() { GEO.clear(); renderDistrict(); toast('Location removed'); if (after) after(); else route(); },
  });
}
function renderAcct() {
  const el = $('#acct');
  if (!S.user) { el.innerHTML = `<button class="hdr-btn" data-act="login">👤 <span class="lbl"><span class="sub">Hello, Guest</span>Login</span></button>`; return; }
  el.innerHTML = `<button class="hdr-btn" type="button" data-act="acct-menu">👤 <span class="lbl"><span class="sub">Namaste,</span>${h(S.user.name.split(' ')[0])} ▾</span></button>
    <div class="dropdown">
      <div class="dd-head">${h(S.user.name)}<br>${h(S.user.phone)}</div>
      <a href="#/account/orders">📦 My Orders</a><a href="#/events">📅 My Events</a><a href="#/account/wishlist">♥ Wishlist</a>
      <a href="#/account/profile">👤 Profile</a><a href="#/account/addresses">📍 Addresses</a>
      ${S.user.role === 'admin' ? '<a href="/admin">🛠️ Admin Panel</a>' : ''}
      <button data-act="logout">🚪 Logout</button>
    </div>`;
}
function renderCartbar() {
  const lines = cartLines(), vn = vendorCount();
  const route = location.hash.split('?')[0];
  const n = lines.length + vn;
  const show = n && !['#/cart', '#/checkout', '#/vbdone', '#/tent/review'].includes(route) && !route.startsWith('#/order/');
  const tent = route === '#/tent'; // Tent Booking: the bar leads to the final-order review
  const total = (lines.length ? totals(lines, S.district).total : 0) + (vn ? window.VENDORS.total() : 0);
  document.body.classList.toggle('has-cartbar', !!show);
  $('#cartbar').innerHTML = show ? `<div class="cartbar"><div class="info"><b>${n} item${n > 1 ? 's' : ''} · ${inr(total)}</b><small>${vn ? `${window.VENDORS.groups().length} vendor booking${window.VENDORS.groups().length > 1 ? 's' : ''} · ` : ''}No login needed</small></div><a class="btn btn-gold" href="${tent ? '#/tent/review' : '#/cart'}">${tent ? 'Review & Create Final Order →' : 'View Cart & Book →'}</a></div>` : '';
}

/* ---------------- Modals ---------------- */
function modal(html, cls = '') {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg'; bg.id = 'modalBg';
  bg.innerHTML = `<div class="modal ${cls}"><button class="modal-x" data-act="close-modal" aria-label="Close">×</button>${html}</div>`;
  bg.addEventListener('mousedown', e => { if (e.target === bg) closeModal(); });
  document.body.appendChild(bg);
  return bg;
}
function closeModal() { const m = $('#modalBg'); if (m) m.remove(); }

/* ---------------- Ratings & reviews ---------------- */
// Real ratings only: stars appear once a product has at least one published review from a real order
const revCount = n => `${n} review${n === 1 ? '' : 's'}`;
const starRow = r =>'★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));
const ratingBadge = p => (p.reviews ? `<span class="prating" title="${h(p.rating)} out of 5"><span class="vrate sm">★ ${h(p.rating)}</span><span class="small muted">(${p.reviews})</span></span>` : '');
// a delivered item, or a booking whose function date has passed, can be reviewed (the server checks the same)
const canRate = (o, i) => ['delivered', 'completed'].includes(o.status) && !i.reviewed && !i.extra && (i.type !== 'service' || (datesOf(i).map(d => d.date).sort().pop() || '9') <= today());
const RV_WORDS = ['Tap the stars', 'Bad', 'Not good', 'Okay', 'Good', 'Excellent'];
// Tap-the-stars popup for Track Order / My Orders and vendor booking tracking: the order / booking number and mobile are
// already known on that screen, so the customer only taps stars (text and photo optional). send(data) posts it.
function openReview({ title, sub, withPhoto, send, done }) {
  let rating = 0, pic = '';
  const m = modal(`<div class="m-pad rv-modal"><h3 style="margin:0">⭐ Rate & review</h3><p class="muted small" style="margin:2px 0 12px"><span>${h(title)}</span>${sub ? ` · <span>${h(sub)}</span>` : ''}</p>
    <div class="rv-stars" id="rvStars">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" aria-label="${n} of 5">★</button>`).join('')}</div>
    <div class="rv-word" id="rvWord">${RV_WORDS[0]}</div>
    <div class="field"><label>Your review (optional)</label><textarea id="rvText" rows="3" maxlength="1000" placeholder="What was good? What could be better?"></textarea></div>
    ${withPhoto && window.DOCUP ? '<div class="field"><label>Add a photo (optional)</label><input type="file" id="rvPic" accept="image/*"><div id="rvPrev"></div></div>' : ''}
    <button type="button" class="btn btn-primary btn-block" id="rvSend" disabled>Submit review</button></div>`, 'sm');
  $('#rvStars', m).addEventListener('click', e => {
    const b = e.target.closest('[data-star]'); if (!b) return;
    rating = Number(b.dataset.star);
    $$('[data-star]', m).forEach(x => x.classList.toggle('on', Number(x.dataset.star) <= rating));
    $('#rvWord', m).textContent = RV_WORDS[rating]; $('#rvSend', m).disabled = false;
  });
  const picIn = $('#rvPic', m);
  if (picIn) picIn.addEventListener('change', async () => {
    try { pic = picIn.files[0] ? await window.DOCUP.photoDataUrl(picIn.files[0]) : ''; $('#rvPrev', m).innerHTML = pic ? `<img class="rv-pic" src="${pic}" alt="">` : ''; } catch (err) { pic = ''; toast(err.message, true); }
  });
  $('#rvSend', m).addEventListener('click', async () => {
    const btn = $('#rvSend', m); btn.disabled = true;
    try { await send({ rating, text: $('#rvText', m).value.trim(), ...(pic ? { photo: pic } : {}) }); closeModal(); toast('Thank you for your review ✓'); if (done) done(); } catch (err) { toast(err.message, true); btn.disabled = false; }
  });
}
// summary (big number + 5★…1★ bars) and the review list of a product page
function reviewsBlock(p, list) {
  if (!p.reviews) return '<p class="muted small" style="margin:0">No reviews yet. Bought or booked this? Rate it from Track Order after delivery.</p>';
  return `<div class="vrev-sum"><div class="vrev-big"><b>${h(p.rating)}</b><div>${starRow(p.rating)}</div><span class="small muted">${revCount(p.reviews)}</span></div>
    <div class="vrev-bars">${(p.breakdown || []).map((n, i) => `<div><span>${5 - i}★</span><i><b style="width:${Math.round(n / p.reviews * 100)}%"></b></i><span>${n}</span></div>`).join('')}</div></div>
    ${list.map(r => `<div class="vrev"><div><b>${h(r.name)}</b>${r.district ? ` <span class="small muted">· ${h(r.district)}</span>` : ''} <span class="vrate sm">★ ${r.rating}</span> <span class="chip pay-paid">✓ Verified buyer</span> <span class="small muted">${fmtDate(r.createdAt)}</span></div>
      ${r.text ? `<p>${h(r.text)}</p>` : ''}${r.photo ? `<a href="${h(r.photo)}" target="_blank" rel="noopener"><img class="rv-pic" src="${h(r.photo)}" alt="Customer photo" loading="lazy"></a>` : ''}
      ${r.reply ? `<div class="vrev-reply"><b>Reply from ${h(S.meta.settings.siteName)}:</b> ${h(r.reply)}</div>` : ''}</div>`).join('')}`;
}

// Functions a service can be booked for: a Tilak puja only for Tilak, a tent for any function
const evsFor = p => ((p.covers || []).length ? p.covers : (p.events || []).length ? p.events : S.meta.events);
const pickEv = (p, want) => { const ok = evsFor(p); return ok.includes(want) ? want : ok.includes(p.defaultEvent) ? p.defaultEvent : ok[0]; };
// Function picker: Shaadi is the full wedding (its own wide button); single functions are grouped under it.
// attr = the data attribute the page listens to (data-ev on product pages, data-vev on vendor pages)
const funcChips = (list, ev, attr = 'data-ev') => {
  const SH = 'Shaadi (Vivah)', one = list.filter(e => e !== SH);
  const chip = e => `<button type="button" ${attr}="${h(e)}" class="${e === ev ? 'on' : ''}">${h(evShort(e))}${S.events[e] ? `<span class="d">${shortDate(S.events[e])}</span>` : ''}</button>`;
  // many single functions → one compact dropdown; one or two → plain buttons
  const pick = one.length > 2
    ? `<select class="input ev-sel ${one.includes(ev) ? 'on' : ''}" data-evsel="${attr}" aria-label="Choose one function"><option value="">${list.includes(SH) ? 'Or just one function…' : 'Choose function…'}</option>${one.map(e => `<option value="${h(e)}" ${e === ev ? 'selected' : ''}>${h(evShort(e))}${S.events[e] ? ` · ${shortDate(S.events[e])}` : ''}</option>`).join('')}</select>`
    : one.map(chip).join('');
  return `<div class="ev-row">${list.includes(SH) ? `<button type="button" ${attr}="${SH}" class="ev-full ${ev === SH ? 'on' : ''}"><b>Shaadi (full wedding)</b><small>Main vivah day${S.events[SH] ? ` · ${shortDate(S.events[SH])}` : ''}</small></button>` : ''}${pick}</div>`;
};
const evChips = (p, ev) => funcChips(evsFor(p), ev)
  + ((p.events || []).length ? `<span class="ev-only">Only for ${p.events.map(evShort).join(' & ')}</span>` : '');

// Booking popup: which function, which date, how many
function openBooking(id, presetEvent, after) {
  const p = S.products.get(id);
  if ((p.covers || []).length) { location.hash = '#/p/' + id; return; } // full ceremony: a date for every rasam, on its own page
  let ev = pickEv(p, presetEvent || S.presetEvent || p.defaultEvent || 'Shaadi (Vivah)');
  const existing = () => S.cart.find(l => sameLine(l, id, ev));
  const m = modal(`<div class="m-pad">
    <div class="book-head">${pPhoto(p)}<div><h3>${h(p.name)}</h3><div class="muted small">${h(p.nameHi || '')}</div><div><b>${inr(p.price)}</b> <span class="muted small">per ${h(p.unit)}</span></div></div></div>
    <div class="field"><label>Function</label><div class="ev-chips" id="bkEv"></div></div>
    <div class="grid-2">
      <div class="field"><label for="bkDate">Function date</label><input type="date" id="bkDate" min="${today()}"></div>
      <div class="field"><label for="bkQty">Quantity (${h(p.unit)})</label><div class="qty"><button type="button" data-bq="-1" aria-label="Decrease quantity">−</button><input id="bkQty" type="number" min="${p.minQty || 1}"><button type="button" data-bq="1" aria-label="Increase quantity">+</button></div></div>
    </div>
    <div id="bkAvail" style="margin:-4px 0 10px;font-size:14px"></div>
    <a class="link small cal-link" href="#/p/${h(p.id)}?cal=1">📅 See available dates — next 5 months →</a>
    <div class="box" style="display:flex;justify-content:space-between;align-items:center;margin:4px 0 14px"><span class="muted">Booking amount</span><b id="bkTotal" style="font-size:20px"></b></div>
    <div class="cta-row"><button class="btn btn-primary" id="bkGo">Add & View Cart</button><button class="btn btn-ghost" id="bkAdd">Add & Keep Shopping</button></div>
  </div>`, 'sm');
  const dateIn = $('#bkDate', m), qtyIn = $('#bkQty', m);
  const draw = () => {
    $('#bkEv', m).innerHTML = evChips(p, ev);
    const l = existing();
    dateIn.value = (l && l.eventDate) || S.events[ev] || '';
    qtyIn.value = l ? l.qty : (p.minQty || 1);
    $('#bkTotal', m).textContent = inr(p.price * qtyIn.value);
    checkAvail(p, dateIn.value, $('#bkAvail', m), [$('#bkAdd', m), $('#bkGo', m)]);
  };
  dateIn.addEventListener('change', () => checkAvail(p, dateIn.value, $('#bkAvail', m), [$('#bkAdd', m), $('#bkGo', m)]));
  $('#bkEv', m).addEventListener('click', e => { const b = e.target.closest('[data-ev]'); if (b) { ev = b.dataset.ev; draw(); } });
  $('#bkEv', m).addEventListener('change', e => { const s = e.target.closest('[data-evsel]'); if (s && s.value) { ev = s.value; draw(); } });
  const step = p.minQty > 1 ? Math.max(1, Math.round(p.minQty / 10)) : 1;
  $$('[data-bq]', m).forEach(b => b.addEventListener('click', () => { qtyIn.value = Math.max(p.minQty || 1, (Number(qtyIn.value) || 0) + Number(b.dataset.bq) * step); $('#bkTotal', m).textContent = inr(p.price * qtyIn.value); }));
  qtyIn.addEventListener('input', () => { $('#bkTotal', m).textContent = inr(p.price * (Number(qtyIn.value) || 0)); });
  const save = goCart => {
    if (!dateIn.value) { toast('Please select the function date', true); dateIn.focus(); return; }
    if (!dateIn.reportValidity()) return;
    const qty = Math.max(p.minQty || 1, Math.round(Number(qtyIn.value) || 1));
    const l = existing();
    if (l) { l.qty = qty; l.eventDate = dateIn.value; } else { S.cart.push({ productId: id, qty, event: ev, eventDate: dateIn.value }); ping('carts', id); }
    setEventDate(ev, dateIn.value);
    flyToCart($('.book-head', m));
    saveCart(); closeModal();
    toast(`Booked for ${evShort(ev)} ✓`);
    if (goCart) location.hash = '#/cart'; else if (after) after();
  };
  $('#bkAdd', m).addEventListener('click', () => save(false));
  $('#bkGo', m).addEventListener('click', () => save(true));
  draw();
}

// Add a whole package; ask once for the dates of any functions that are not planned yet
function addPackage(pkId) {
  const pk = S.meta.packages.find(x => x.id === pkId);
  const items = pk.items.map(i => ({ ...i, p: S.products.get(i.productId) })).filter(i => i.p);
  const needed = [...new Set(items.filter(i => i.p.type === 'service').map(i => i.p.defaultEvent || 'Shaadi (Vivah)'))];
  const apply = () => {
    for (const i of items) {
      const ev = i.p.type === 'service' ? (i.p.defaultEvent || 'Shaadi (Vivah)') : '';
      const l = S.cart.find(x => sameLine(x, i.productId, ev));
      if (l) l.qty = Math.max(l.qty, i.qty);
      else S.cart.push({ productId: i.productId, qty: Math.max(i.p.minQty || 1, i.qty), event: ev, eventDate: ev ? S.events[ev] || '' : '' });
    }
    saveCart(); closeModal();
    toast(`${pk.name} added ✓`);
    location.hash = '#/cart';
  };
  const missing = needed.filter(e => !S.events[e]);
  if (!missing.length) return apply();
  const m = modal(`<div class="m-pad"><h3 style="margin:0 0 4px">📅 Function dates</h3><p class="muted small" style="margin:0 0 14px">${h(pk.name)}</p>
    <form id="pkForm">${missing.map((e, index) => `<div class="field"><label for="pk-date-${index}">${h(e)} date</label><input id="pk-date-${index}" type="date" name="${h(e)}" min="${today()}" required></div>`).join('')}
    <button class="btn btn-primary btn-block">Add Package to Cart</button></form></div>`, 'sm');
  $('#pkForm', m).addEventListener('submit', e => {
    e.preventDefault();
    for (const [k, v] of new FormData(e.target)) setEventDate(k, v);
    apply();
  });
}

// Mobile OTP form: send code -> enter code (+ name for new customers) -> logged in
function mountOtp(el, { onDone, phone = '', submitLabel = 'Verify & Login' }) {
  const o = S.meta.settings.otp;
  el.innerHTML = `<form class="otp-form" novalidate>
    <div class="err hide" data-otp-err></div>
    <div class="field"><label>Mobile number</label><div class="otp-row"><span class="cc">+91</span><input name="phone" inputmode="numeric" maxlength="10" placeholder="10-digit mobile" autocomplete="tel" value="${h(phone)}"><button type="button" class="btn btn-primary btn-sm" data-otp-send>Send OTP</button></div></div>
    <div data-otp-step2 class="hide">
      <div class="field"><label>Enter the 6-digit OTP sent by SMS</label><input name="otp" class="otp-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••"></div>
      <div class="field"><label>Your name <span class="muted">(needed only for new customers)</span></label><input name="name" maxlength="80" autocomplete="name"></div>
      <p class="small muted" data-otp-info style="margin:-4px 0 12px"></p>
      <button class="btn btn-gold btn-block" type="submit">${h(submitLabel)}</button>
    </div>
    ${o.testMode ? '<p class="small" style="margin:10px 0 0;color:#8a5a00">🧪 Test mode: SMS is not sent — the OTP is printed in the server window.</p>' : ''}
  </form>`;
  const f = $('form', el), err = $('[data-otp-err]', el), sendBtn = $('[data-otp-send]', el);
  const showErr = msg => { err.textContent = msg; err.classList.toggle('hide', !msg); };
  let timer = null;
  const countdown = secs => {
    clearInterval(timer); sendBtn.disabled = true;
    const tick = () => { sendBtn.textContent = secs > 0 ? `Resend in ${secs}s` : 'Resend OTP'; if (secs-- <= 0) { clearInterval(timer); sendBtn.disabled = false; } };
    tick(); timer = setInterval(tick, 1000);
  };
  sendBtn.addEventListener('click', async () => {
    showErr('');
    const ph = f.phone.value.trim();
    if (!/^[6-9]\d{9}$/.test(ph)) return showErr('Enter a valid 10-digit mobile number');
    sendBtn.disabled = true; sendBtn.textContent = 'Sending…';
    try {
      const r = await api('/api/auth/otp/send', { method: 'POST', body: { phone: ph } });
      $('[data-otp-step2]', el).classList.remove('hide');
      $('[data-otp-info]', el).textContent = `OTP sent to +91 ${ph}. It is valid for 5 minutes.`;
      f.otp.focus(); countdown(r.resendIn || 30);
    } catch (e) { showErr(e.message); sendBtn.disabled = false; sendBtn.textContent = 'Send OTP'; }
  });
  f.addEventListener('submit', async e => {
    e.preventDefault(); showErr('');
    const btn = $('button[type=submit]', f); btn.disabled = true;
    try {
      const r = await api('/api/auth/otp/verify', { method: 'POST', body: { phone: f.phone.value.trim(), otp: f.otp.value.trim(), name: f.name.value.trim() } });
      clearInterval(timer);
      setSession(r.token, r.user);
      toast(r.isNew ? `Swagat hai ${r.user.name.split(' ')[0]}! Account created 🙏` : `Namaste ${r.user.name.split(' ')[0]}! 🙏`);
      onDone(r);
    } catch (e2) { showErr(e2.message); btn.disabled = false; }
  });
}

let afterLogin = null;
function openLogin(next, mode) {
  afterLogin = next || null;
  const otpOn = S.meta.settings.otp.login;
  mode = mode || (otpOn ? 'otp' : 'login');
  const reg = mode === 'register', isOtp = mode === 'otp';
  const finish = () => { closeModal(); const n = afterLogin; afterLogin = null; if (typeof n === 'function') n(); else route(); };
  const m = modal(`<div class="login-wrap">
    <div class="login-art"><h2>${reg ? 'Swagat hai!' : 'Login'}</h2><p>${isOtp ? 'Sirf mobile number aur OTP — koi password yaad rakhne ki zaroorat nahi.' : reg ? 'Account banaiye — orders, wishlist aur addresses ek jagah.' : 'Login is optional. You can order without an account too.'}</p>${reg ? '<div style="font-size:90px;text-align:center;margin-top:36px">💐</div>' : '<img src="/img/logo.svg" alt="" width="96" height="96" style="display:block;margin:36px auto 0;border-radius:22px;box-shadow:0 8px 24px -8px rgba(0,0,0,.45)">'}</div>
    <div class="login-form">
      <h3>${isOtp ? 'Login / Sign up with OTP' : reg ? 'Create your account' : 'Login with password'}</h3>
      ${isOtp ? '<div id="otpBox"></div>' : `<form id="loginForm">
      <div class="err hide" id="loginErr"></div>
      ${reg ? '<div class="field"><label>Full name</label><input name="name" required maxlength="80" autocomplete="name"></div>' : ''}
      <div class="field"><label>Mobile number</label><input name="phone" required inputmode="numeric" maxlength="10" placeholder="10-digit mobile" autocomplete="tel"></div>
      <div class="field"><label>Password</label><input name="password" type="password" required minlength="6" autocomplete="${reg ? 'new-password' : 'current-password'}"></div>
      <button class="btn btn-gold btn-block" type="submit">${reg ? 'Create Account' : 'Login'}</button></form>`}
      <p class="small muted" style="text-align:center;margin-top:16px">
        ${isOtp ? 'Have a password? <a class="link" data-act="to-login">Login with password</a>'
          : `${otpOn ? '<a class="link" data-act="to-otp">Login with OTP instead</a> · ' : ''}${reg ? 'Have an account? <a class="link" data-act="to-login">Login</a>' : 'New here? <a class="link" data-act="to-register">Create an account</a>'}`}</p>
    </div></div>`);
  if (isOtp) { mountOtp($('#otpBox', m), { onDone: finish }); setTimeout(() => $('#otpBox input', m).focus(), 50); return; }
  $('form', m).addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('button[type=submit]', e.target); btn.disabled = true;
    try {
      const r = await api(reg ? '/api/auth/register' : '/api/auth/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
      setSession(r.token, r.user); closeModal();
      toast(`Namaste ${r.user.name.split(' ')[0]}! 🙏`);
      const next2 = afterLogin; afterLogin = null;
      if (typeof next2 === 'function') next2(); else route();
    } catch (err) { $('#loginErr').textContent = err.message; $('#loginErr').classList.remove('hide'); } finally { btn.disabled = false; }
  });
  setTimeout(() => $('input', m).focus(), 50);
}

function openDistrict(onPick) {
  let state = (district(S.district) || {}).state || 'Bihar';
  const m = modal(`<div class="m-pad">
    <button type="button" class="loc-cta" data-act="home-loc"><span>🏠</span><span><b>${GEO.get() ? 'Change ghar / venue location' : 'Set your ghar / venue location'}</b><small>${GEO.get() ? `Now: ${h(GEO.get().label)}` : 'Type address, pincode or use GPS — nearest cars, halwai & vendors first'}</small></span><i>›</i></button>
    <h3 style="margin:14px 0 4px">📍 Or just select your district</h3>
    <p class="muted small" style="margin:0">We serve every district of Bihar and Uttar Pradesh. Local team from your district handles your order.</p>
    <div class="state-tabs"><button data-st="Bihar">Bihar (${S.meta.districts.filter(d => d.state === 'Bihar').length})</button><button data-st="Uttar Pradesh">Uttar Pradesh (${S.meta.districts.filter(d => d.state === 'Uttar Pradesh').length})</button></div>
    <input class="input" id="distSearch" placeholder="Search district..." autocomplete="off">
    <div class="dist-grid" id="distGrid"></div></div>`);
  const draw = () => {
    const q = $('#distSearch').value.toLowerCase();
    $$('.state-tabs button', m).forEach(b => b.classList.toggle('on', b.dataset.st === state));
    $('#distGrid').innerHTML = S.meta.districts.filter(d => (q || d.state === state) && d.name.toLowerCase().includes(q))
      .map(d => `<button data-d="${d.id}" class="${d.id === S.district ? 'on' : ''}">${h(d.name)}${q ? `<br><span class="small muted">${h(d.state)}</span>` : ''}</button>`).join('') || '<p class="muted">No district found</p>';
  };
  m.addEventListener('click', e => {
    if (e.target.closest('[data-act="home-loc"]')) { closeModal(); pickHomeLocation(onPick); return; }
    const st = e.target.closest('[data-st]');
    if (st) { state = st.dataset.st; $('#distSearch').value = ''; draw(); }
    const d = e.target.closest('[data-d]');
    if (d) {
      S.district = d.dataset.d; savePref('district');
      if ((GEO.get() || {}).district && GEO.get().district !== S.district) GEO.clear(); // a different zila: the old ghar pin no longer applies
      renderDistrict(); closeModal(); toast('Delivering to ' + district(S.district).name);
      if (onPick) onPick(); else route();
    }
  });
  $('#distSearch').addEventListener('input', draw);
  draw();
}

/* ---------------- Views ---------------- */
const app = () => $('#app');
const spinner = () => { app().innerHTML = '<div class="spinner"></div>'; };

function rowSection(title, sub, items, link) {
  return `<section class="sec"><div class="sec-head"><h2>${h(title)}<small>${h(sub || '')}</small></h2>${link ? `<a href="${link}">View all →</a>` : ''}</div>
    <div class="hscroll">${items.slice(0, 12).map(card).join('')}</div></section>`;
}
function packageCard(pk) {
  const items = pk.items.map(i => ({ ...i, p: S.products.get(i.productId) })).filter(i => i.p);
  const total = items.reduce((a, i) => a + i.p.price * Math.max(i.qty, i.p.minQty || 1), 0);
  const mrp = items.reduce((a, i) => a + i.p.mrp * Math.max(i.qty, i.p.minQty || 1), 0);
  return `<div class="pk">${ph(pk.image, '🎁', '#fbeff3').replace(/<\/div>$/, mrp > total ? `<span class="save">Save ${inr(mrp - total)}</span></div>` : '</div>')}
    <div class="pk-body"><h3>${h(pk.name)}</h3>
      <div class="pk-foot"><div><span class="price">${inr(total)}</span>${mrp > total ? ` <span class="mrp">${inr(mrp)}</span>` : ''}</div><button type="button" class="btn btn-primary btn-sm" data-pk="${h(pk.id)}">Add Package</button></div>
      <details class="pk-details"><summary>What’s included</summary>
        ${pk.desc ? `<p>${h(pk.desc)}</p>` : ''}
        <ul class="pk-items">${items.map(i => {
          const qty = Math.max(i.qty, i.p.minQty || 1);
          return `<li>${h(i.p.name)}${qty > 1 ? ` × ${qty}` : ''}</li>`;
        }).join('')}</ul>
      </details></div></div>`;
}

let heroTimer = null;
function viewHome() {
  const s = S.meta.settings;
  const all = [...S.products.values()];
  const featured = all.filter(p => p.featured);
  const recent = store.get('recent', []).map(id => S.products.get(id)).filter(Boolean);
  const deals = all.filter(p => offPct(p) > 0).sort((a, b) => offPct(b) - offPct(a)).slice(0, 12); // only real MRPs
  const rows = S.meta.categories.map(c => ({ c, items: all.filter(p => p.cat === c.id) })).filter(r => r.items.length);
  const evs = sideEvents(Object.keys(EVENT_INFO).filter(e => e !== 'Other' && S.meta.events.includes(e)));
  app().innerHTML = `
    ${s.banners.length ? `<section class="hero home-hero" id="hero">
      ${s.banners.map((b, i) => `<div class="slide ${i ? '' : 'on'}" ${i ? 'inert' : ''}>
        <div class="txt"><h1>${h(b.title)}</h1><p>${h(b.subtitle)}</p>${b.cta ? `<a class="btn btn-gold btn-lg" href="${h(b.link || '#/')}">${h(b.cta)}</a>` : ''}</div>
        <div class="hero-scene" aria-hidden="true"><div class="hero-stage">
          <span class="hero-stage-floor"></span>
          <span class="hero-stage-canopy"></span>
          <span class="hero-arch hero-arch-left"></span>
          <span class="hero-arch hero-arch-right"></span>
          <span class="hero-arch hero-arch-main">${b.image ? `<img src="${h(b.image)}" alt="" onerror="this.remove()">` : ''}</span>
          <span class="hero-stage-pillar hero-stage-pillar-left"></span>
          <span class="hero-stage-pillar hero-stage-pillar-right"></span>
          <span class="hero-stage-edge"></span>
        </div></div>
      </div>`).join('')}
      ${petals(8)}
      ${s.banners.length > 1 ? `<button class="hero-nav prev" data-hero="-1" aria-label="Previous">‹</button><button class="hero-nav next" data-hero="1" aria-label="Next">›</button><div class="dots">${s.banners.map((_, i) => `<button data-dot="${i}" class="${i ? '' : 'on'}" aria-label="Slide ${i + 1}"></button>`).join('')}</div>` : ''}
    </section>` : `<section class="panel empty"><h1>${h(s.siteName)}</h1><p class="muted">Find wedding services for your function date and district.</p><a class="btn btn-primary" href="#/vendors">Browse vendors</a></section>`}
    <div class="steps">
      <div><span class="n">1</span><span><b>Choose your function</b>Haldi, Mehndi, Tilak, Shaadi…</span></div>
      <div><span class="n">2</span><span><b>Tap Add / Book</b>Pick date — no login needed</span></div>
      <div><span class="n">3</span><span><b>We call to confirm</b>Local team in your district</span></div>
      <div><span class="n">4</span><span><b>Pay later</b>Cash on delivery / small advance</span></div>
    </div>

    ${sideAsk()}
    <section class="sec"><div class="sec-head"><h2>Shop by Function${realSide() ? ` <span class="side-tag">${sideName(S.side)}</span>` : ''}<small>Har rasam ke liye zaroori saman aur booking</small></h2><a href="#/events">Plan my dates →</a></div>
      <div class="events">${evs.map(e => `<a class="ev-tile" href="#/e/${encodeURIComponent(e)}"><img src="${unsplash(EVENT_INFO[e].img, 300, 400)}" alt="" loading="lazy" onerror="this.remove()"><span>${h(evShort(e))}<small${S.events[e] ? '' : ' class="hi-dup"'}>${S.events[e] ? '📅 ' + shortDate(S.events[e]) : h(EVENT_INFO[e].hi)}</small></span></a>`).join('')}</div></section>

    ${window.VENDORS ? window.VENDORS.homeSection() : ''}

    ${window.VENDORS ? window.VENDORS.arkHome() : ''}

    ${S.meta.packages.length ? `<section class="sec"><div class="sec-head"><h2>Ready Packages</h2></div><div class="pk-grid">${S.meta.packages.map(packageCard).join('')}</div></section>` : ''}

    ${recent.length ? rowSection('Recently Viewed', 'Aapne haal hi mein dekha', recent, '') : ''}
    ${featured.length ? rowSection('Top Picks', 'Hamari team ki pasand', featured, '#/search?featured=1') : ''}
    ${deals.length ? rowSection('Biggest Discounts', 'Sabse zyada bachat wale items', deals, '#/search?sort=discount') : ''}

    <section class="sec"><div class="sec-head"><h2>Shop by Category</h2></div>
      <div class="tiles">${S.meta.categories.map(c => `<a class="tile" href="#/c/${c.id}">${ph(c.image, c.emoji, c.color)}<span>${h(c.name)}<small>${h(c.nameHi || '')}</small></span></a>`).join('')}</div></section>

    ${rows.map(r => rowSection(r.c.name, r.c.nameHi, r.items, '#/c/' + r.c.id)).join('')}

    ${s.phone || s.whatsapp ? `<section class="sec wa-band"><div><h3>Get help with your booking</h3><p>Tell us your function and date.</p></div>
      <div class="cta-row" style="flex:0 0 auto">${s.whatsapp ? `<a class="btn btn-wa" target="_blank" rel="noopener" href="${waLink('Namaste, mujhe shaadi ke liye saman / booking chahiye.')}">💬 WhatsApp</a>` : ''}${s.phone ? `<a class="btn btn-gold" href="tel:${h(s.phone.replace(/\s/g, ''))}">📞 ${h(s.phone)}</a>` : ''}</div></section>` : ''}`;

  const slides = $$('.slide'), dots = $$('.dots button');
  let cur = 0;
  const go = i => {
    cur = (i + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      slide.inert = index !== cur;
      slide.classList.toggle('on', index === cur);
    });
    dots.forEach((dot, index) => dot.classList.toggle('on', index === cur));
  };
  clearInterval(heroTimer);
  const hero = $('#hero');
  if (slides.length > 1 && !reduceMotion()) heroTimer = setInterval(() => {
    if (!hero.isConnected) clearInterval(heroTimer);
    else if (!hero.matches(':hover, :focus-within')) go(cur + 1);
  }, 6500);
  if (matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
    hero.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      const bounds = hero.getBoundingClientRect();
      hero.style.setProperty('--hero-y', `${-16 + ((event.clientX - bounds.left) / bounds.width - .5) * 36}deg`);
      hero.style.setProperty('--hero-x', `${-8 + (.5 - (event.clientY - bounds.top) / bounds.height) * 22}deg`);
    });
    hero.addEventListener('pointerleave', () => {
      hero.style.removeProperty('--hero-y');
      hero.style.removeProperty('--hero-x');
    });
  }
  hero.addEventListener('click', e => {
    const n = e.target.closest('[data-hero]'), d = e.target.closest('[data-dot]');
    if (n) go(cur + Number(n.dataset.hero)); if (d) go(Number(d.dataset.dot));
  });
}

function listingShell({ title, crumb, category, total, products, filtersHtml, sortHtml, banner, empty }) {
  return `<div class="listing one catalog">
    <header class="catalog-cover">
      <div class="catalog-intro">
        <div class="crumbs"><a href="#/">Home</a> / ${h(crumb)}</div>
        <h1>${h(title)}</h1>
        <p>${total} ${total === 1 ? 'item' : 'items'}</p>
      </div>
      <div class="catalog-scene" aria-hidden="true">
        <div class="catalog-sculpture">${ph(category?.image, category?.emoji || '✦', '#472a57')}</div>
      </div>
    </header>
    <section class="catalog-controls">
      <div class="lh-filters" id="filters">${filtersHtml}</div>
      <div class="lh-sort">${sortHtml}</div>
    </section>
    <section class="catalog-results">
      ${banner || ''}
      ${products.length ? `<div class="pgrid">${products.map(card).join('')}</div>` : empty || `<div class="empty"><div class="big">🔍</div><h3>Kuch nahi mila</h3><p class="muted">Try another word, or <a class="link" href="${waLink('Namaste, mujhe ye chahiye: ')}" target="_blank" rel="noopener">ask us on WhatsApp</a>.</p></div>`}
    </section></div>`;
}

// Bookings need the customer's function date and district: with both, only the services free on that date and
// served in that district are listed (fully booked ones are left out); without them, bookings wait behind this bar.
const svcDate = () => (window.VENDORS ? window.VENDORS.chosenDate() : '');
function bookBar(date, ready, waiting) {
  return `<div class="book-bar ${ready ? 'ready' : ''}">
    <div class="bb-f"><label for="bbDate">Function date</label><input type="date" class="input" id="bbDate" min="${today()}" value="${h(date)}"></div>
    <div class="bb-f"><label>District</label><button type="button" class="btn btn-light btn-sm" data-act="district">${S.district ? h(district(S.district).name) : 'Select district'}</button></div>
    <p class="small">${ready ? `Showing bookings <b>free on ${fmtDate(date)}</b> in ${h(district(S.district).name)}. Fully booked ones are hidden.`
      : `<b>Choose your function date and district</b> to see ${waiting ? `the ${waiting} booking${waiting > 1 ? 's' : ''}` : 'bookings'} free for you — we show only what can really come on your date.`}</p>
  </div>`;
}
// a category offer running now (Admin → Categories): banner on its page; prices are already the offer prices
const offerBanner = c => `<div class="offer-banner"><b>🎉 ${c.off}% off</b> on all ${h(c.name)} from our shop${c.offUntil ? ` — till ${fmtDate(c.offUntil)}` : ''}<span class="small">Offer price shown on every item, old price crossed out · local vendors set their own prices</span></div>`;
async function viewListing(params) {
  const catId = params.cat || params.q.get('cat') || '';
  const q = params.q.get('q') || '', type = params.q.get('type') || '', sort = params.q.get('sort') || '';
  const min = params.q.get('min') || '', max = params.q.get('max') || '';
  const onlyMine = params.q.get('mine') !== '0';
  const bDate = svcDate(), ready = !!(bDate && S.district);
  const qs = new URLSearchParams();
  if (q) qs.set('q', q); if (catId) qs.set('cat', catId); if (type) qs.set('type', type); if (sort) qs.set('sort', sort);
  if (min) qs.set('min', min); if (max) qs.set('max', max); if (params.q.get('featured')) qs.set('featured', 1);
  if (S.district && (onlyMine || ready)) qs.set('district', S.district);
  if (ready) { qs.set('date', bDate); qs.set('avail', '1'); }
  skeleton();
  let { products, total } = await api('/api/products?' + qs);
  products.forEach(p => S.products.set(p.id, p));
  // bookings wait until the date and district are known
  const svcHere = type === 'service' || BOOK_CATS.includes(catId) || products.some(p => p.type === 'service');
  const waiting = ready ? 0 : products.filter(p => p.type === 'service').length;
  if (!ready && waiting) { products = products.filter(p => p.type !== 'service'); total = products.length; }
  const c = catId ? cat(catId) : null;
  const title = q ? `Results for "${q}"` : c ? c.name : params.q.get('featured') ? 'Top Picks' : 'All Products';
  const base = params.cat ? `#/c/${catId}` : '#/search';
  const setParam = (k, v) => { const p = new URLSearchParams(params.q); if (v) p.set(k, v); else p.delete(k); location.hash = base + (p.toString() ? '?' + p : ''); };
  app().innerHTML = listingShell({
    title, crumb: c ? c.name : 'Search', category: c, total, products,
    empty: !ready && waiting ? '<div class="empty"><div class="big">📅</div><h3>Choose your date and district above</h3><p class="muted">Then you see only the bookings that are free for your function.</p></div>'
      : ready && svcHere ? `<div class="empty"><div class="big">📅</div><h3>Everything here is booked on ${fmtDate(bDate)}</h3><p class="muted">Try another date, or <a class="link" href="${waLink(`Namaste, ${fmtDate(bDate)} ke liye ${c ? c.name : 'booking'} chahiye.`)}" target="_blank" rel="noopener">ask us on WhatsApp</a> — we will try to arrange it.</p></div>` : '',
    banner: (c && c.off ? offerBanner(c) : '') + (svcHere ? bookBar(bDate, ready, waiting) : '') + (q || !window.VENDORS ? '' : catId === 'catering' ? window.VENDORS.halwaiStrip() : window.VENDORS.catVendorStrip(catId)),
    filtersHtml: `<div class="lf-type">${[['', 'All'], ['product', '🚚 Saman'], ['service', '📅 Booking']].map(([v, l]) => `<button type="button" data-ftype="${v}" class="${type === v ? 'on' : ''}">${l}</button>`).join('')}</div>
      <form class="lf-price" id="priceForm"><span class="small muted">₹</span><input name="min" type="number" min="0" placeholder="Min" aria-label="Minimum price" value="${h(min)}"><span>–</span><input name="max" type="number" min="0" placeholder="Max" aria-label="Maximum price" value="${h(max)}"><button class="btn btn-primary btn-sm">Apply</button></form>
      <select class="input lf-cat" id="fcatSel" aria-label="Category"><option value="">All categories</option>${S.meta.categories.map(x => `<option value="${x.id}" ${x.id === catId ? 'selected' : ''}>${h(x.name)}</option>`).join('')}</select>
      <div class="lf-loc">${S.district ? `<label class="small"><input type="checkbox" id="fmine" ${onlyMine ? 'checked' : ''}> 📍 Only ${h(district(S.district).name)}</label>` : ''}${S.district ? '' : '<a class="link small" data-act="district">📍 Select district</a>'}</div>`,
    sortHtml: `<div class="sorts"><b class="small">Sort</b>${[['', 'Popular'], ['price-asc', 'Price: Low to High'], ['price-desc', 'Price: High to Low']].map(([v, l]) => `<button data-sort="${v}" class="${sort === v ? 'on' : ''}">${l}</button>`).join('')}</div>`,
  });
  $('#fcatSel').addEventListener('change', e => { const p = new URLSearchParams(params.q); p.delete('cat'); location.hash = (e.target.value ? `#/c/${e.target.value}` : '#/search') + (p.toString() ? '?' + p : ''); });
  $$('[data-ftype]').forEach(b => b.addEventListener('click', () => setParam('type', b.dataset.ftype)));
  $$('[data-sort]').forEach(b => b.addEventListener('click', () => setParam('sort', b.dataset.sort)));
  $('#priceForm').addEventListener('submit', e => { e.preventDefault(); const p = new URLSearchParams(params.q); const f = new FormData(e.target); ['min', 'max'].forEach(k => f.get(k) ? p.set(k, f.get(k)) : p.delete(k)); location.hash = base + (p.toString() ? '?' + p : ''); });
  const mine = $('#fmine'); if (mine) mine.addEventListener('change', () => setParam('mine', mine.checked ? '' : '0'));
  const bb = $('#bbDate'); if (bb) bb.addEventListener('change', () => { if (bb.value && window.VENDORS) { window.VENDORS.setDate(bb.value); route(); } });
}

// "Shop by function" page — e.g. everything for Haldi, bookings default to that event
function viewEvent(ev) {
  const info = EVENT_INFO[ev] || EVENT_INFO.Other;
  S.presetEvent = ev;
  const all = [...S.products.values()].filter(p => (info.cats.includes(p.cat) || p.defaultEvent === ev) && evsFor(p).includes(ev)) // e.g. no Vivah puja on the Tilak page
    .sort((a, b) => (b.defaultEvent === ev) - (a.defaultEvent === ev) || (b.type === 'service') - (a.type === 'service') || b.featured - a.featured);
  const groups = info.cats.map(c => ({ c: cat(c), items: all.filter(p => p.cat === c) })).filter(g => g.items.length);
  app().innerHTML = `<section class="hero" style="height:200px"><div class="slide on"><img src="${unsplash(info.img, 1600, 500)}" alt="" onerror="this.remove()"><div class="txt"><h1>${h(ev)} ${h(info.hi)}</h1><p>${S.events[ev] ? `📅 Your ${h(evShort(ev))} date: <b>${fmtDate(S.events[ev])}</b>` : 'Set your function date once — all bookings will use it.'}</p>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="date" class="input" id="evDate" min="${today()}" value="${h(S.events[ev] || '')}" style="width:auto"><span class="small">${S.events[ev] ? 'Change date' : 'Set date'}</span></div></div></div></section>
    ${groups.map(g => rowSection(g.c.name, `${evShort(ev)} ke liye`, g.items, '#/c/' + g.c.id)).join('') || '<div class="panel empty"><h3>Coming soon</h3></div>'}`;
  $('#evDate').addEventListener('change', e => { setEventDate(ev, e.target.value); saveCart(); toast(`${evShort(ev)} date saved ✓`); viewEvent(ev); });
}

function viewEvents() {
  const evs = sideEvents(S.meta.events.filter(e => e !== 'Other'));
  const lines = cartLines();
  app().innerHTML = `<div class="panel" style="padding:18px 20px">
    <h1 style="margin:0">📅 Meri Shaadi ke Function</h1>
    ${sideAsk(true)}
    <p class="muted" style="margin:4px 0 16px">Set your function dates once. Every booking (Pandit Ji, photographer, phool, mehndi, tent…) will use these dates automatically.</p>
    <div class="ev-plan">${evs.map(e => {
      const n = lines.filter(l => l.event === e).length;
      return `<div class="ev-card">${ph(unsplash((EVENT_INFO[e] || EVENT_INFO.Other).img, 500, 220), '📅', '#fbeff3')}<div class="b"><h4>${h(e)} <span class="muted small hi-dup">${h((EVENT_INFO[e] || {}).hi || '')}</span></h4>
        <input type="date" class="input" data-evd="${h(e)}" min="${today()}" value="${h(S.events[e] || '')}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span class="small ${n ? 'ok-txt' : 'muted'}">${n ? `${n} booking${n > 1 ? 's' : ''} in cart` : 'No bookings yet'}</span><a class="link small" href="#/e/${encodeURIComponent(e)}">Book for ${h(evShort(e))} →</a></div></div></div>`;
    }).join('')}</div></div>`;
  $$('[data-evd]').forEach(i => i.addEventListener('change', () => { setEventDate(i.dataset.evd, i.value); saveCart(); toast(`${evShort(i.dataset.evd)} date saved ✓`); }));
}

async function viewProduct(id) {
  skeleton(4);
  const { product: p, related, reviewList = [] } = await api('/api/products/' + encodeURIComponent(id));
  S.products.set(p.id, p); related.forEach(r => S.products.set(r.id, r)); (p.loose || []).forEach(r => S.products.set(r.id, r));
  store.set('recent', [p.id, ...store.get('recent', []).filter(x => x !== p.id)].slice(0, 12));
  const c = cat(p.cat), off = offPct(p), d = district(S.district), s = S.meta.settings;
  const avail = !d || p.districts === 'all' || (Array.isArray(p.districts) && p.districts.includes(d.id));
  const isSvc = p.type === 'service';
  const wished = S.user && S.user.wishlist.includes(p.id);
  // full ceremony: one booking, a date for every rasam it covers; filed under the shaadi (lagan) day
  const covers = isSvc ? (p.covers || []) : [], main = covers.includes('Shaadi (Vivah)') ? 'Shaadi (Vivah)' : covers[covers.length - 1];
  let ev = covers.length ? main : isSvc ? pickEv(p, S.presetEvent || p.defaultEvent || 'Shaadi (Vivah)') : '';
  let activeRd = null, laganSet = new Set(), plannerPick = null, plannerDates = null; // planner: Pandit Ji rasam picker
  // samagri kit: its items (more of any), and items from the other kits that can be added; extras[key] = how many
  const kit = isSvc ? [] : p.kitItems || [], pool = kit.length ? p.extraPool || [] : [];
  const tSize = tentSize(p.tentSize); // tent packages: area, guests, top view, size helper
  // styles (flowers): the one in the cart, else the first; each style its own cart line
  const styles = isSvc ? [] : p.styles || [];
  let st0 = styles.length ? styleOf(p, (S.cart.find(x => x.productId === p.id && x.style) || {}).style) : null;
  const kitLine = S.cart.find(x => sameLine(x, p.id, ''));
  const extras = Object.fromEntries(((kitLine && kitLine.extras) || []).map(x => [x.key, x.qty]));
  app().innerHTML = `<div class="panel pdp">
    <div class="pdp-img">${pPhoto(st0 && st0.photo ? { ...p, image: st0.photo } : p, '', off ? `<span class="offtag" style="position:absolute;left:12px;top:12px;z-index:1;background:var(--green);color:#fff;font-weight:800;padding:3px 9px;border-radius:6px">${off}% OFF</span>` : '')}</div>
    <div>
      <div class="crumbs"><a href="#/">Home</a> › <a href="#/c/${c.id}">${h(c.name)}</a></div>
      <h1>${h(p.name)}</h1><div class="hi">${h(p.nameHi || '')}</div>
      ${p.reviews ? `<button type="button" class="pdp-rating" data-act="to-rev"><span class="vrate">★ ${h(p.rating)}</span><span class="stars">${starRow(p.rating)}</span><span class="small muted">${revCount(p.reviews)}</span></button>` : ''}
      <div class="prate" style="margin-top:8px"><span class="chip ${isSvc ? 'chip-svc' : 'chip-prod'}">${isSvc ? '📅 Booking for your date' : '🚚 Home delivery'}</span>
        <button class="btn btn-light btn-sm" data-wish="${p.id}" style="margin-left:auto">${wished ? '♥ Wishlisted' : '♡ Wishlist'}</button></div>
      <div class="pricebox"><span class="price" id="pPrice">${inr(st0 ? st0.price : p.price)}</span>${off && !st0 ? `<span class="mrp">${inr(p.mrp)}</span><span class="off">${off}% off</span>` : ''}<span class="muted" id="pUnit">per ${h(st0 && st0.unit ? st0.unit : p.unit)}${p.minQty > 1 ? ` · minimum ${p.minQty}` : ''}</span></div>
      ${p.catOff ? `<div class="offer-line">🎉 <b>${p.catOff}% off</b> on all ${h(c.name)}${p.catOffUntil ? ` — till ${fmtDate(p.catOffUntil)}` : ''}${styles.length ? ' · offer prices shown below' : ''}</div>` : ''}
      ${styles.length && p.optKind === 'brand' ? `<div class="box sty-box br-box"><h3>Choose company / brand <span class="small muted">${styles.length} to choose from</span></h3>
        <select class="input" id="pBrand" aria-label="Company / brand">${styles.map(s => `<option value="${h(s.key)}" ${s.key === st0.key ? 'selected' : ''}>${h(s.name)} — ${inr(s.price)}${s.unit ? ` / ${h(s.unit)}` : ''}${s.note ? ` · ${h(s.note)}` : ''}</option>`).join('')}</select>
        <p class="small muted" style="margin:6px 0 0">The photo and price change with the company. Each company goes to the cart as its own line.</p></div>`
      : styles.length ? `<div class="box sty-box"><h3>Choose a style <span class="small muted">${styles.length} designs · tap to see the price</span></h3>
        <div class="sty-grid">${styles.map(s => `<button type="button" class="sty ${s.key === st0.key ? 'on' : ''}" data-sty="${h(s.key)}">${s.photo ? `<img src="${h(s.photo)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="sty-e">${h(p.emoji || '🌼')}</span>`}
          <span class="sty-t"><b>${h(s.name)}</b>${s.note ? `<small>${h(s.note)}</small>` : ''}<em>${inr(s.price)}${s.unit ? ` · ${h(s.unit)}` : ''}</em></span></button>`).join('')}</div></div>` : ''}

      <div class="box">
        ${covers.length ? `<h3 style="margin-bottom:4px">📅 Rasam dates <span class="ev-only">Covers ${covers.map(evShort).join(' · ')}</span></h3>
          <p class="small muted" style="margin:0 0 8px">Pandit Ji comes for every rasam. Enter the date of each — tap a rasam, then a green date in the calendar below. The ${h(evShort(main))} (lagan) date is required; leave a rasam empty if you don't need Pandit Ji for it.</p>
          <div class="rdates" id="pRd">${covers.map(e => `<div class="rd" data-rd="${h(e)}"><span class="rd-n"><b>${h(evShort(e))}</b><small${e === main ? '' : ' class="hi-dup"'}>${e === main ? 'Lagan / vivah day *' : h((EVENT_INFO[e] || {}).hi || '')}</small></span><input type="date" ${e === main ? 'id="dateIn"' : ''} data-rdate="${h(e)}" min="${today()}"><span class="rd-st" data-rst="${h(e)}"></span></div>`).join('')}</div>`
        : isSvc ? `<h3>📅 Kis function ke liye?</h3><div class="ev-chips" id="pEv"></div>` : '<h3>🛍️ Quantity</h3>'}
        <div class="grid-2">
          ${isSvc && !covers.length ? `<div class="field"><label>Function date</label><input id="dateIn" type="date" min="${today()}"></div>` : ''}
          <div class="field"><label>Quantity (${h(p.unit)})</label><div class="qty"><button type="button" data-q="-1">−</button><input id="qtyIn" type="number" min="${p.minQty || 1}" value="${p.minQty || 1}"><button type="button" data-q="1">+</button></div></div>
        </div>
        <div id="pAvail" style="margin:-2px 0 12px;font-size:14px"></div>
        ${isSvc ? '<button type="button" class="link small cal-link" data-act="to-cal">📅 See available dates — next 5 months ↓</button>' : ''}
        <div class="cta-row">
          <button class="btn btn-ghost" id="addBtn" ${avail ? '' : 'disabled'}>${isSvc ? '+ Add Booking' : '+ Add to Cart'}</button>
          <button class="btn btn-primary" id="buyBtn" ${avail ? '' : 'disabled'}>${isSvc ? 'Book Now' : '⚡ Buy Now'}</button>
        </div>
        <p class="small muted" style="margin:10px 0 0">${isSvc ? `No payment now — our team calls to confirm, then ${s.advancePercent}% advance. Balance on the function day.` : `Cash on delivery. Free delivery above ${inr(s.freeDeliveryAbove)}.`} No login needed.</p>
        <p class="pdp-policy">${policyLine(p)} <a class="link" href="#/policy">Policy</a></p>
      </div>
      ${kit.length ? `<div class="box kit-box" id="pKit"><h3>What's in this kit <span class="small muted">${kit.length} items · tap + to add more of any item</span></h3>
        <div class="kit-list">${kit.map(x => `<div class="kit-row"><span class="kit-n"><b>${h(x.name)}</b><small>${h(x.inKit)} in the kit</small></span><span class="kit-p">+ ${inr(x.price)}<small>per ${h(x.unit)}</small></span>
          <div class="qty kq"><button type="button" data-kx="${h(x.key)}" data-d="-1">−</button><input type="number" min="0" max="500" value="0" data-kxi="${h(x.key)}" aria-label="Extra ${h(x.name)}"><button type="button" data-kx="${h(x.key)}" data-d="1">+</button></div></div>`).join('')}</div>
        ${pool.length ? `<div class="kit-add"><b>Add other samagri</b> <span class="small muted">not in this kit</span>
          <div class="bt-pick" style="margin:6px 0 0"><select class="input" id="kxSel" aria-label="Choose samagri"><option value="">Choose an item…</option>${pool.map(x => `<option value="${h(x.key)}">${h(x.name)} · ${inr(x.price)} per ${h(x.unit)}</option>`).join('')}</select>
            <input type="number" class="input" id="kxQty" min="1" max="500" value="1" aria-label="How many"><button type="button" class="btn btn-primary btn-sm" id="kxAdd">Add</button></div>
          <div id="kxChosen"></div></div>` : ''}
        <div class="kit-sum" id="kitSum"></div></div>` : ''}
      ${(p.loose || []).length ? `<div class="box"><h3>Buy loose flowers <span class="small muted">just the flowers — by kg, bunch or stems</span></h3>
        <div class="loose-row">${p.loose.map(x => `<div class="loose"><a href="#/p/${x.id}">${pPhoto(x)}</a><div class="loose-t"><a href="#/p/${x.id}"><b>${h(x.name)}</b></a><span>${inr(x.price)} <small>/ ${h(x.unit)}</small></span></div><div class="pact" data-for="${x.id}">${cardAction(x)}</div></div>`).join('')}</div></div>` : ''}
      ${p.cat === 'pandit-ji' ? '<div id="pRasam"></div>' : ''}
      ${isSvc ? '<div class="box pmonths" id="pMonths"><div class="spinner"></div></div>' : ''}

      <div class="box"><div class="avail">📍 ${d ? (avail ? `<span class="ok-txt">Available in ${h(d.name)}, ${h(d.state)}</span>` : `<span class="bad-txt">Not available in ${h(d.name)} yet</span>`) : '<span class="muted">Select your district to check availability</span>'} <a class="link small" data-act="district">${d ? 'Change' : 'Select district'}</a></div></div>
      ${tSize ? tentBox(p) : ''}
      <div class="box"><h3>About this ${isSvc ? 'service' : 'item'}</h3><p style="margin:0;white-space:pre-line">${h(p.desc)}</p></div>
      ${!kit.length && !tSize && p.includes && p.includes.length ? `<div class="box"><h3>What's included</h3><ul class="includes">${p.includes.map(i => `<li>${h(i)}</li>`).join('')}</ul></div>` : ''}
      <div class="box prev" id="pRev"><h3>⭐ Ratings & Reviews</h3>${reviewsBlock(p, reviewList)}</div>
      <div class="cta-row"><a class="btn btn-wa" target="_blank" rel="noopener" href="${waLink(`Namaste, mujhe "${p.name}" ke baare mein jaankari chahiye.`)}">💬 Ask on WhatsApp</a><a class="btn btn-light" href="tel:${h(s.phone.replace(/\s/g, ''))}">📞 Call ${h(s.phone)}</a>
        <a class="btn btn-light" target="_blank" rel="noopener" href="${h(shareLink(`${p.name} — ${inr(st0 ? st0.price : p.price)} per ${st0 && st0.unit ? st0.unit : p.unit} · ${s.siteName}`, '#/p/' + p.id))}">↗ Share with family</a></div>
    </div></div>
    ${related.length ? rowSection('Similar items', 'Aur dekhiye', related, '#/c/' + p.cat) : ''}`;

  const qtyIn = $('#qtyIn'), dateIn = $('#dateIn');
  const step = p.minQty > 1 ? Math.max(1, Math.round(p.minQty / 10)) : 1;
  // full ceremony: is Pandit Ji free on each rasam date (and is the shaadi day a published lagan)?
  const rdStatus = async e => {
    const inp = $(`[data-rdate="${CSS.escape(e)}"]`), st = $(`[data-rst="${CSS.escape(e)}"]`); if (!inp || !st) return;
    if (!inp.value) { st.innerHTML = e === main ? '<span class="bad-txt">Required</span>' : '<span class="muted">Not needed</span>'; return; }
    try {
      const a = await api(`/api/availability?productId=${encodeURIComponent(p.id)}&date=${inp.value}`);
      const lg = laganSet.has(inp.value) ? ' · 🪔 Lagan' : e === main && laganSet.size ? ' · <span class="muted">not a lagan day</span>' : '';
      st.innerHTML = a.available ? `<span class="ok-txt">✓ Free${lg}</span>` : '<span class="bad-txt">✗ Fully booked</span>';
    } catch { st.textContent = ''; }
  };
  const setActive = e => { activeRd = e; $$('#pRd .rd').forEach(x => x.classList.toggle('on', x.dataset.rd === e)); };
  const drawEv = () => {
    if (!isSvc) return;
    const l = S.cart.find(x => sameLine(x, p.id, ev));
    if (covers.length) {
      for (const e of covers) { const d = ((l && l.dates) || []).find(x => x.event === e); $(`[data-rdate="${CSS.escape(e)}"]`).value = (d && d.date) || (l && e === main && l.eventDate) || S.events[e] || ''; rdStatus(e); }
      setActive(covers.find(e => !$(`[data-rdate="${CSS.escape(e)}"]`).value) || main);
    } else {
      $('#pEv').innerHTML = evChips(p, ev);
      dateIn.value = (l && l.eventDate) || S.events[ev] || '';
    }
    if (l) qtyIn.value = l.qty;
    if (avail) checkAvail(p, dateIn.value, $('#pAvail'), [$('#addBtn'), $('#buyBtn')]);
  };
  ping('views', p.id);
  // Amazon-style zoom: picture follows the mouse
  const zoomBox = $('.pdp-img .ph');
  if (zoomBox && $('img', zoomBox) && matchMedia('(hover: hover)').matches) {
    zoomBox.addEventListener('mouseenter', () => zoomBox.classList.add('zoom'));
    zoomBox.addEventListener('mouseleave', () => zoomBox.classList.remove('zoom'));
    zoomBox.addEventListener('mousemove', e => { const r = zoomBox.getBoundingClientRect(); const im = $('img', zoomBox); if (im) im.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`; });
  }
  drawEv();
  const pickedDates = () => plannerDates ? plannerDates() : (covers.length ? $$('[data-rdate]').map(i => i.value) : [dateIn ? dateIn.value : '']).filter(Boolean);
  const markSel = () => { const d = pickedDates(); $$('#pMonths .vday').forEach(x => x.classList.toggle('sel', d.includes(x.dataset.pday))); };
  // Advance booking: the next 5 months, free / full days and lagan days; tapping a free day picks it
  const drawMonths = async () => {
    const box = $('#pMonths'); if (!box) return;
    try {
      const { months } = await api('/api/availability/months?productId=' + encodeURIComponent(p.id));
      if (!box.isConnected) return;
      laganSet = new Set(months.flatMap(m => m.calendar.filter(c => c.lagan).map(c => c.date)));
      covers.forEach(rdStatus);
      const free = months.reduce((a, m) => a + m.calendar.filter(c => c.status === 'available').length, 0);
      const mini = ({ month, calendar }) => {
        const [y, mo] = month.split('-').map(Number), pad = (new Date(y, mo - 1, 1).getDay() + 6) % 7, n = calendar.filter(c => c.status === 'available').length;
        return `<div class="mcal"><div class="mcal-h"><b>${new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</b><span class="${n ? 'ok-txt' : 'bad-txt'}">${n} free</span></div>
          <div class="mcal-g">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<i>${x}</i>`).join('')}${'<span></span>'.repeat(pad)}${calendar.map(c => `<button type="button" class="vday ${c.status} ${pickedDates().includes(c.date) ? 'sel' : ''} ${c.lagan ? 'lg' : ''}" data-pday="${c.date}" ${c.status !== 'available' ? 'disabled' : ''} title="${fmtDate(c.date)}${c.left != null && c.status === 'available' ? ` · ${c.left} left` : ''}${c.lagan ? ' · 🪔 Lagan' : ''}">${Number(c.date.slice(8))}</button>`).join('')}</div></div>`;
      };
      box.innerHTML = `<h3 style="margin:0 0 4px">📅 Available dates – next 5 months <span class="small ok-txt" style="font-weight:700">${free} dates free</span></h3>
        <p class="small muted" style="margin:0">Book up to 5 months in advance. Tap a green date to choose it${months.some(m => m.calendar.some(c => c.lagan)) ? ' · 🪔 = lagan (shubh vivah) day, book early' : ''}.</p>
        <div class="mcals" style="padding:10px 0 0">${months.map(mini).join('')}</div>
        <div class="vlegend" style="padding:6px 0 0"><span><i class="available"></i>Free</span><span><i class="full"></i>Fully booked</span><span><i class="sel"></i>Your date</span></div>`;
      if (/[?&]cal=1/.test(location.hash)) setTimeout(() => box.scrollIntoView({ block: 'start' }), 300); // came from "See available dates"
    } catch { box.remove(); }
  };
  if (isSvc) {
    drawMonths();
    $('#pMonths').addEventListener('click', e => {
      const b = e.target.closest('[data-pday]'); if (!b) return;
      if (plannerPick) { plannerPick(b.dataset.pday); return; }
      // full ceremony: the date goes to the rasam being filled, then the next empty rasam is picked
      const forEv = covers.length ? activeRd || main : ev;
      const inp = covers.length ? $(`[data-rdate="${CSS.escape(forEv)}"]`) : dateIn;
      inp.value = b.dataset.pday;
      if (covers.length) { rdStatus(forEv); setActive(covers.find(x => !$(`[data-rdate="${CSS.escape(x)}"]`).value) || forEv); }
      if (avail && inp === dateIn) checkAvail(p, dateIn.value, $('#pAvail'), [$('#addBtn'), $('#buyBtn')]);
      markSel();
      if (!covers.length) $('#pEv').closest('.box').scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(`${fmtDate(inp.value)} selected for ${evShort(forEv)}`);
    });
    $$(covers.length ? '[data-rdate]' : '#dateIn').forEach(i => i.addEventListener('change', () => { markSel(); if (covers.length) rdStatus(i.dataset.rdate); }));
  }
  if (covers.length) $('#pRd').addEventListener('focusin', e => { const r = e.target.closest('[data-rd]'); if (r) setActive(r.dataset.rd); });
  if (covers.length) $('#pRd').addEventListener('click', e => { const r = e.target.closest('[data-rd]'); if (r) setActive(r.dataset.rd); });
  // Pandit Ji planner: tick the rasams you need, give each a date — the right booking is chosen for you
  // (Shaadi ticked → Full Ceremony covers every ticked rasam; otherwise Only Tilak / Only Haldi & Matkor)
  const usePlanner = p.cat === 'pandit-ji' && ((p.covers || []).length || (p.events || []).length);
  if (usePlanner) (async () => {
    const { products: list } = await api('/api/products?cat=pandit-ji');
    list.forEach(x => S.products.set(x.id, x));
    const SH = 'Shaadi (Vivah)';
    const full = list.find(x => (x.covers || []).includes(SH));
    const forRasam = e => (e === SH ? full : list.find(x => x !== full && ((x.events || []).includes(e) || (x.covers || []).includes(e))));
    const rasams = ['Tilak / Chheka', 'Haldi', 'Matkor', SH].filter(forRasam);
    const ids = new Set(rasams.map(e => forRasam(e).id));
    const box = document.createElement('div');
    box.className = 'box plan'; box.id = 'pPlan';
    const book = $('#addBtn').closest('.box');
    book.before(box); book.hidden = true; if ($('#pRasam')) $('#pRasam').hidden = true;
    // start from what is in the cart; otherwise tick this page's own rasams (dates from the saved function dates)
    const inCart = S.cart.filter(l => ids.has(l.productId));
    const sel = {};
    if (inCart.length) for (const l of inCart) for (const d of datesOf(l)) sel[d.event] = d.date;
    else for (const e of rasams) if ((p.covers || []).includes(e) || (p.events || []).includes(e)) sel[e] = S.events[e] || '';
    let active = rasams.find(e => e in sel && !sel[e]) || rasams.find(e => e in sel) || rasams[0];
    const plan = () => {
      const picked = rasams.filter(e => e in sel);
      if (picked.includes(SH)) return [{ prod: full, ev: picked.filter(e => full.covers.includes(e)) }];
      const out = [];
      for (const e of picked) { const pr = forRasam(e); const g = out.find(x => x.prod === pr); if (g) g.ev.push(e); else out.push({ prod: pr, ev: [e] }); }
      return out;
    };
    const status = {};
    const check = async e => {
      if (!sel[e]) { status[e] = ''; return; }
      try { const a = await api(`/api/availability?productId=${encodeURIComponent(forRasam(sel[SH] !== undefined && full.covers.includes(e) ? SH : e).id)}&date=${sel[e]}`); status[e] = a.available ? `<span class="ok-txt">✓ Free${laganSet.has(sel[e]) ? ' · 🪔 Lagan' : ''}</span>` : '<span class="bad-txt">✗ Fully booked</span>'; } catch { status[e] = ''; }
      draw();
    };
    const draw = () => {
      const lines = plan(), total = lines.reduce((a, x) => a + x.prod.price, 0), missing = rasams.filter(e => e in sel && !sel[e]);
      const has = S.cart.some(l => ids.has(l.productId));
      box.innerHTML = `<h3 style="margin:0 0 4px">🙏 Book Pandit Ji — tick the rasams you need</h3>
        <p class="small muted" style="margin:0 0 8px">Give a date for each ticked rasam (tap a row, then a green date in the calendar below — tap it again to remove). Untick or ✕ to remove a rasam.</p>
        <button type="button" class="link small cal-link" data-act="to-cal" style="margin:0 0 8px">📅 See available dates — next 5 months ↓</button>
        <div class="rdates">${rasams.map(e => `<div class="rd pl ${e === active ? 'on' : ''} ${e in sel ? 'chk' : ''}" data-pr="${h(e)}">
          <label class="pl-c"><input type="checkbox" data-pc="${h(e)}" ${e in sel ? 'checked' : ''}><span class="rd-n"><b>${h(evShort(e))}</b><small${e === SH ? '' : ' class="hi-dup"'}>${e === SH ? 'Lagan / vivah day' : h((EVENT_INFO[e] || {}).hi || '')}</small></span></label>
          <input type="date" data-pd="${h(e)}" min="${today()}" value="${h(sel[e] || '')}" ${e in sel ? '' : 'disabled'}>
          <span class="rd-st">${e in sel ? (sel[e] ? (status[e] || '') + (e !== SH && sel[SH] && sel[e] > sel[SH] ? '<span class="bad-txt"> · ⚠️ after Shaadi?</span>' : '') : '<span class="bad-txt">Pick a date</span>') : '<span class="muted">Not needed</span>'}</span>
          ${e in sel ? `<button type="button" class="pl-x" data-px="${h(e)}" aria-label="Remove ${h(evShort(e))}">✕</button>` : '<span></span>'}</div>`).join('')}</div>
        <div class="pl-sum">${lines.length ? lines.map(x => `<div><span><b>${h(x.prod === full ? 'Full Ceremony' : x.prod.name)}</b><small>${x.ev.map(evShort).join(' · ')}${x.prod === full && x.ev.length < full.covers.length ? ' · other rasams can be added any time' : ''}</small></span><b>${inr(x.prod.price)}</b></div>`).join('')
          + `<div class="pl-tot"><span>Total</span><b>${inr(total)}</b></div>` : '<p class="muted small" style="margin:0">Tick at least one rasam.</p>'}
          ${lines.length && !(SH in sel) && full ? `<p class="small muted" style="margin:6px 0 0">💡 Need Pandit Ji for the Shaadi too? Tick Shaadi — the Full Ceremony (${inr(full.price)}) covers all rasams.</p>` : ''}
          ${SH in sel ? '<p class="small ok-txt" style="margin:6px 0 0">✓ Full Ceremony: Pandit Ji comes on every ticked rasam date.</p>' : ''}</div>
        <div class="cta-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-pact="add" ${!lines.length || missing.length ? 'disabled' : ''}>${has ? '✓ Update cart' : '+ Add to Cart'}</button><button type="button" class="btn btn-primary" data-pact="go" ${!lines.length || missing.length ? 'disabled' : ''}>Book Now</button></div>
        ${has ? '<button type="button" class="btn btn-light btn-sm btn-block" data-pact="rm" style="margin-top:8px">Remove Pandit Ji booking from cart</button>' : ''}
        <p class="small muted" style="margin:8px 0 0">No payment now — our team calls to confirm, then ${s.advancePercent}% advance. No login needed.</p>`;
      markSel();
    };
    const next = () => { active = rasams.find(e => e in sel && !sel[e]) || (active in sel ? active : rasams.find(e => e in sel)) || active; };
    const setDate = (e, d) => { if (d) sel[e] = d; else if (e in sel) sel[e] = ''; check(e); };
    box.addEventListener('change', e => {
      const c = e.target.closest('[data-pc]'), d = e.target.closest('[data-pd]');
      if (c) { const r = c.dataset.pc; if (c.checked) { sel[r] = S.events[r] && S.events[r] >= today() ? S.events[r] : ''; active = r; check(r); } else { delete sel[r]; next(); } draw(); }
      if (d) { setDate(d.dataset.pd, d.value); active = d.dataset.pd; }
    });
    box.addEventListener('click', async e => {
      const x = e.target.closest('[data-px]'), row = e.target.closest('[data-pr]'), a = e.target.closest('[data-pact]');
      if (x) { delete sel[x.dataset.px]; next(); draw(); return; }
      if (a) {
        if (a.dataset.pact === 'rm') { S.cart = S.cart.filter(l => !ids.has(l.productId)); saveCart(); toast('Pandit Ji booking removed from cart'); draw(); return; }
        S.cart = S.cart.filter(l => !ids.has(l.productId)); // one Pandit Ji plan in the cart: replace what was there
        for (const g of plan()) {
          const ds = g.ev.map(ev2 => ({ event: ev2, date: sel[ev2] }));
          const m = ds.find(d => d.event === SH) || ds[0];
          S.cart.push({ productId: g.prod.id, qty: 1, event: m.event, eventDate: m.date, ...((g.prod.covers || []).length ? { dates: ds } : {}) });
          ping('carts', g.prod.id);
          ds.forEach(d => setEventDate(d.event, d.date));
        }
        saveCart(); flyToCart($('.pdp-img'));
        if (a.dataset.pact === 'go') location.hash = '#/cart'; else { toast('Pandit Ji booking saved in cart ✓'); draw(); }
        return;
      }
      if (row && !e.target.closest('input, button')) { active = row.dataset.pr; if (!(active in sel)) { sel[active] = ''; } draw(); }
    });
    // calendar taps: fill the active rasam; tapping its own date again removes it
    plannerPick = d => {
      const same = rasams.find(e => sel[e] === d);
      if (same) { sel[same] = ''; active = same; draw(); return; }
      if (!(active in sel)) sel[active] = '';
      sel[active] = d; check(active); toast(`${fmtDate(d)} – ${evShort(active)}`); next(); draw();
    };
    plannerDates = () => rasams.map(e => sel[e]).filter(Boolean);
    draw(); rasams.forEach(e => sel[e] && check(e));
  })().catch(() => {});
  // Pandit Ji: one puja per rasam — show them all, and book Pandit Ji for every rasam in one tap
  if ($('#pRasam') && !usePlanner) (async () => {
    const { products: list } = await api('/api/products?cat=pandit-ji');
    const one = list.filter(x => x.type === 'service' && (x.events || []).length).sort((a, b) => S.meta.events.indexOf(a.events[0]) - S.meta.events.indexOf(b.events[0]));
    const full = list.filter(x => x.type === 'service' && (x.covers || []).length);
    const box = $('#pRasam'); if (!box || !(one.length + full.length)) return;
    [...one, ...full].forEach(x => S.products.set(x.id, x));
    const row = (x, what, note) => `<a class="rasam-row ${x.id === p.id ? 'on' : ''}" href="#/p/${x.id}"><span><b>${h(what)}</b><small>${h(note)}</small></span><span>${inr(x.price)}${x.id === p.id ? ' <small class="ok-txt">· this page</small>' : ''}</span></a>`;
    box.innerHTML = `<div class="box rasam-box"><h3 style="margin:0 0 8px">🙏 Which Pandit Ji booking do you need?</h3>
      ${full.map(x => row(x, `All rasams — ${x.covers.map(evShort).join(', ')}`, `${x.name} · one booking, you give each date`)).join('')}
      ${one.length ? `<div class="small muted" style="margin:10px 2px 0">Only one rasam:</div>${one.map(x => row(x, `Only ${x.events.map(evShort).join(' & ')}`, x.name)).join('')}` : ''}</div>`;
  })().catch(() => {});
  if (isSvc && avail) dateIn.addEventListener('change', () => checkAvail(p, dateIn.value, $('#pAvail'), [$('#addBtn'), $('#buyBtn')]));
  if (isSvc && !covers.length) $('#pEv').addEventListener('click', e => { const b = e.target.closest('[data-ev]'); if (b) { ev = b.dataset.ev; drawEv(); } });
  if (isSvc && !covers.length) $('#pEv').addEventListener('change', e => { const s = e.target.closest('[data-evsel]'); if (s && s.value) { ev = s.value; drawEv(); } });
  else { const l = S.cart.find(x => sameLine(x, p.id, '')); if (l) qtyIn.value = l.qty; }
  $$('[data-q]').forEach(b => b.addEventListener('click', () => { qtyIn.value = Math.max(p.minQty || 1, (Number(qtyIn.value) || 0) + Number(b.dataset.q) * step); }));
  // kit extras: live list, chosen "other samagri", and what they add to the price
  const kitAll = [...kit, ...pool], kitItem = key => kitAll.find(x => x.key === key);
  const extraList = () => Object.entries(extras).filter(([, n]) => n > 0).map(([key, qty]) => { const x = kitItem(key); return x && { key, qty, name: x.name, unit: x.unit, price: x.price, inKit: kit.some(y => y.key === key) }; }).filter(Boolean);
  const drawKit = () => {
    if (!kit.length) return;
    $$('[data-kxi]').forEach(i => { i.value = extras[i.dataset.kxi] || 0; i.closest('.kit-row').classList.toggle('on', (extras[i.dataset.kxi] || 0) > 0); });
    const ch = $('#kxChosen'), added = extraList().filter(x => !x.inKit);
    if (ch) ch.innerHTML = added.length ? `<div class="bt-list" style="margin:8px 0 0">${added.map(x => `<div class="bt-row"><div class="bt-n"><b>${h(x.name)}</b><small>${inr(x.price)} per ${h(x.unit)}</small></div>
      <div class="qty vqty"><button type="button" data-kx="${h(x.key)}" data-d="-1">−</button><input type="number" min="0" max="500" value="${x.qty}" data-kxi="${h(x.key)}"><button type="button" data-kx="${h(x.key)}" data-d="1">+</button></div>
      <b class="bt-amt">${inr(x.price * x.qty)}</b><button type="button" class="bt-x" data-kxx="${h(x.key)}" aria-label="Remove">×</button></div>`).join('')}</div>` : '';
    const ex = extraList(), amt = ex.reduce((a, x) => a + x.price * x.qty, 0), q = Math.max(p.minQty || 1, Math.round(Number(qtyIn.value) || 1));
    $('#kitSum').innerHTML = ex.length ? `<span>Kit ${inr(p.price)} × ${q} + ${ex.length} extra item${ex.length > 1 ? 's' : ''} ${inr(amt)}</span><b>${inr(p.price * q + amt)}</b>`
      : '<span class="muted">No extra items. Need more roli, ghee, diye…? Tap + above.</span>';
  };
  if (kit.length) {
    const box = $('#pKit');
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-kx]'); if (b) { extras[b.dataset.kx] = Math.max(0, Math.min(500, (extras[b.dataset.kx] || 0) + Number(b.dataset.d))); return drawKit(); }
      const x = e.target.closest('[data-kxx]'); if (x) { delete extras[x.dataset.kxx]; return drawKit(); }
      if (e.target.closest('#kxAdd')) {
        const sel = $('#kxSel'); if (!sel.value) { sel.focus(); return toast('Choose an item first'); }
        extras[sel.value] = Math.min(500, (extras[sel.value] || 0) + Math.max(1, Math.round(Number($('#kxQty').value)) || 1));
        sel.value = ''; $('#kxQty').value = 1; drawKit();
      }
    });
    box.addEventListener('change', e => { const i = e.target.closest('[data-kxi]'); if (i) { extras[i.dataset.kxi] = Math.max(0, Math.min(500, Math.round(Number(i.value)) || 0)); drawKit(); } });
    qtyIn.addEventListener('input', drawKit); $$('[data-q]').forEach(b => b.addEventListener('click', () => setTimeout(drawKit, 0)));
    drawKit();
  }
  // "which size do I need?": guests + seating → fits / too small, or how many units of a per-1000 sq ft tent
  const tfG = $('#tfG'), tfS = $('#tfS');
  if (tfG) {
    const fit = () => {
      const g = Math.round(Number(tfG.value)) || 0, f = SQFT_PER[tfS.value], out = $('#tfOut');
      if (!g) { out.className = 'small muted'; out.textContent = 'Enter guests to check if this tent is enough.'; return; }
      const need = g * f;
      if (tSize.per) {
        const n = Math.ceil(need / tSize.per);
        out.className = 'small tf-ok';
        out.innerHTML = `${nn(g)} guests ${SEAT_NAME[tfS.value]} need about <b>${nn(need)} sq ft</b> → book <b>${n} × ${nn(tSize.per)} sq ft</b> (${inr(p.price * n)}). <button type="button" class="btn btn-light btn-sm" id="tfUse">Use ${n}</button>`;
        $('#tfUse').addEventListener('click', () => { qtyIn.value = Math.max(p.minQty || 1, n); toast(`Quantity set to ${n}`); });
        return;
      }
      const holds = Math.floor(tSize.area / f);
      out.className = holds >= g ? 'small tf-ok' : 'small tf-bad';
      out.innerHTML = holds >= g ? `✓ Fits — this ${h(p.tentSize)} tent holds about <b>${nn(holds)}</b> guests ${SEAT_NAME[tfS.value]}. Your ${nn(g)} guests have room.`
        : `✗ Too small for ${nn(g)} guests ${SEAT_NAME[tfS.value]} — it holds about ${nn(holds)}. You need about <b>${nn(need)} sq ft</b>: book ${Math.ceil(need / tSize.area)} of these, or a <a class="link" href="#/c/tent">bigger tent / German hangar</a>.`;
    };
    tfG.addEventListener('input', fit); tfS.addEventListener('change', fit);
  }
  // style card tapped, or a company chosen from the dropdown → its photo, price and size show at the top; each goes
  // to the cart as its own line
  const pickStyle = key => {
    st0 = styleOf(p, key);
    $$('.sty').forEach(x => x.classList.toggle('on', x.dataset.sty === key));
    $('#pPrice').textContent = inr(st0.price);
    $('#pUnit').textContent = `per ${st0.unit || p.unit}${p.minQty > 1 ? ` · minimum ${p.minQty}` : ''}`;
    const img = $('.pdp-img img'); if (img) img.src = st0.photo || p.image || img.src;
    const inCart = S.cart.find(x => x.productId === p.id && x.style === st0.key); qtyIn.value = inCart ? inCart.qty : p.minQty || 1;
  };
  if (styles.length) $('.sty-box').addEventListener('click', e => { const b = e.target.closest('[data-sty]'); if (b) pickStyle(b.dataset.sty); });
  const pb = $('#pBrand'); if (pb) pb.addEventListener('change', () => pickStyle(pb.value));
  const put = goCart => {
    const qty = Math.max(p.minQty || 1, Math.round(Number(qtyIn.value) || 1));
    if (isSvc && !dateIn.value) { toast(covers.length ? `Please enter the ${evShort(main)} (lagan) date` : 'Please select the function date', true); dateIn.focus(); return; }
    const key = isSvc ? ev : '';
    // full ceremony: every rasam that has a date
    const dates = covers.length ? covers.map(e => ({ event: e, date: $(`[data-rdate="${CSS.escape(e)}"]`).value })).filter(d => d.date) : null;
    const l = st0 ? S.cart.find(x => x.productId === p.id && (x.style || styles[0].key) === st0.key) : S.cart.find(x => sameLine(x, p.id, key));
    const kx = { ...(kit.length ? { extras: extraList() } : {}), ...(st0 ? { style: st0.key } : {}) };
    if (l) { l.qty = qty; if (isSvc) l.eventDate = dateIn.value; if (dates) l.dates = dates; if (kit.length) l.extras = kx.extras; } else { S.cart.push({ productId: p.id, qty, event: key, eventDate: isSvc ? dateIn.value : '', ...(dates ? { dates } : {}), ...kx }); ping('carts', p.id); }
    if (dates) dates.forEach(d => setEventDate(d.event, d.date)); else if (isSvc) setEventDate(ev, dateIn.value);
    flyToCart($('.pdp-img'));
    saveCart();
    if (goCart) location.hash = '#/cart'; else { toast(isSvc ? `Booked for ${evShort(ev)} ✓` : 'Added to cart ✓'); drawEv(); }
  };
  $('#addBtn').addEventListener('click', () => put(false));
  $('#buyBtn').addEventListener('click', () => put(true));
}

const ZERO_T = { sub: 0, mrp: 0, discount: 0, delivery: 0, total: 0, advance: 0, goods: 0 };
// vt = vendor bookings total (paid to vendors directly, shown separately)
// phones: total + the page's main button fixed at the bottom (cart / checkout)
const stickyBar = (total, label, target) => `<div class="vsticky" data-sticky="${h(target)}"><div class="vs-info"><b class="st-total">${inr(total)}</b><small>Total amount</small></div><button class="btn btn-gold" type="button" data-stick>${label}</button></div>`;
// beti ki shaadi: the baraat comes to you, so "Baraat" bookings (dulha car, ghodi) move to the end
const sideEvents = list => (S.side === 'girl' ? [...list.filter(e => e !== 'Baraat'), ...list.filter(e => e === 'Baraat')] : list);
// Whose wedding is it? Asked once (My Events, home, cart); every booking and order then carries it
const SIDES = { boy: ['🤵', 'Bete ki shaadi', 'ladke wale – baraat le jaayenge'], girl: ['👰', 'Beti ki shaadi', 'ladki wale – baraat aayegi'] };
const sideName = s => (SIDES[s] ? `${SIDES[s][0]} ${SIDES[s][1]}` : '');
const realSide = () => (SIDES[S.side] ? S.side : '');
function sideAsk(always) {
  if (!always && S.side) return '';
  return `<div class="side-ask ${S.side && S.side !== 'skip' ? 'done' : ''}"><div class="sa-q"><b>Shaadi kiski hai?</b><small>Ek baar batayein — saari bookings isi hisaab se, vendor ko bhi pata rahega.</small></div>
    <div class="sa-opts">${Object.entries(SIDES).map(([k, [ic, t, sub]]) => `<button type="button" data-side="${k}" class="${S.side === k ? 'on' : ''}"><span class="sa-ic">${ic}</span><span><b>${t}</b><small>${sub}</small></span></button>`).join('')}
      ${always ? '' : '<button type="button" class="sa-skip" data-side="skip">Baad mein</button>'}</div></div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-side]'); if (!b) return;
  S.side = b.dataset.side; savePref('side');
  if (SIDES[S.side]) toast(`${sideName(S.side)} ✓ — saved for all your bookings`);
  // checkout: keep what the customer already typed, only swap the question for the answer
  const box = b.closest('.side-ask');
  if (location.hash.startsWith('#/checkout') && box) { box.outerHTML = realSide() ? `<div class="side-line" style="margin:0 0 8px">${sideName(S.side)} ✓</div>` : ''; return; }
  route();
});
// "See available dates" → the 5-month calendar on the service page
document.addEventListener('click', e => { if (e.target.closest('[data-act="to-cal"]')) { const c = $('#pMonths'); if (c) c.scrollIntoView({ block: 'start' }); } });
document.addEventListener('click', e => { if (e.target.closest('[data-act="to-rev"]')) { const r = $('#pRev'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-stick]'); if (!b) return;
  const el = $(b.closest('[data-sticky]').dataset.sticky);
  if (!el) return;
  if (el.disabled) { ($('.summary .err') || el).scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Please select the function dates first', true); } else el.click();
});
function summaryBox(t, btn, vt = 0) {
  const s = S.meta.settings;
  const shop = t.total > 0;
  return `<aside class="panel summary"><h3>Price details</h3>
    <div style="padding:8px 0">
      ${shop ? `${t.discount > 0 ? `<div class="sum-row"><span>Price (MRP)</span><span>${inr(t.mrp)}</span></div>
      <div class="sum-row"><span>Discount</span><span class="off">− ${inr(t.discount)}</span></div>` : `<div class="sum-row"><span>Price</span><span>${inr(t.sub)}</span></div>`}
      <div class="sum-row"><span>Delivery charges</span><span>${t.delivery ? inr(t.delivery) : '<span class="off">FREE</span>'}</span></div>
      ${vt ? `<div class="sum-row"><b>Shop order</b><b>${inr(t.total)}</b></div>` : ''}` : ''}
      ${vt ? `<div class="sum-row"><span>🤝 Vendor bookings<br><small class="muted">pay vendors directly</small></span><b>${inr(vt)}</b></div>` : ''}
      <div class="sum-row sum-total"><span>Total amount</span><span>${inr(t.total + vt)}</span></div>
      ${t.advance ? `<div class="sum-row small muted"><span>Booking advance after confirmation (${s.advancePercent}%)</span><span>${inr(t.advance)}</span></div>` : ''}
      ${t.goods && t.goods < s.freeDeliveryAbove ? `<div class="sum-row small muted"><span>Add ${inr(s.freeDeliveryAbove - t.goods)} more saman for free delivery</span></div>` : ''}
    </div>
    ${t.discount ? `<div class="save-line">🎉 You save ${inr(t.discount)} on this order</div>` : ''}
    ${btn ? `<div style="padding:0 18px 18px">${btn}</div>` : ''}</aside>`;
}

async function ensureCartProducts() {
  const missing = S.cart.filter(l => !S.products.has(l.productId));
  await Promise.all(missing.map(l => api('/api/products/' + l.productId).then(r => S.products.set(r.product.id, r.product)).catch(() => { S.cart = S.cart.filter(x => x.productId !== l.productId); })));
  // older carts: give every booking an event
  S.cart.forEach(l => { const p = S.products.get(l.productId); if (p && p.type === 'service' && !l.event) l.event = p.defaultEvent || 'Shaadi (Vivah)'; });
  store.set('cart', S.cart);
}

async function viewCart() {
  spinner();
  await ensureCartProducts();
  afterCartChange();
  const lines = cartLines();
  const vsec = window.VENDORS.cartSection(viewCart), vt = window.VENDORS.total(), vn = window.VENDORS.count();
  if (!lines.length && !vn) {
    app().innerHTML = `<div class="panel empty"><div class="big">🛒</div><h2>Your cart is empty</h2><p class="muted">Pick a function to start — Haldi, Mehndi, Tilak, Shaadi…</p><a class="btn btn-primary" href="#/">Start Shopping</a> <a class="btn btn-ghost" href="#/vendors">Book Vendors</a> <a class="btn btn-ghost" href="#/events">Plan my functions</a></div>`;
    return;
  }
  const t = lines.length ? totals(lines, S.district) : ZERO_T;
  const goods = lines.filter(l => l.p.type === 'product');
  const evNames = [...new Set(lines.filter(l => l.p.type === 'service').map(l => l.event))]
    .sort((a, b) => (S.events[a] || '9').localeCompare(S.events[b] || '9'));
  const missingDates = lines.filter(l => l.p.type === 'service' && !l.eventDate);
  const itemRow = l => `<div class="cart-item">
      <a href="#/p/${l.p.id}">${pPhoto(l.p)}</a>
      <div>
        <h4><a href="#/p/${l.p.id}">${h(l.p.name)}</a></h4>
        <div class="small muted">${inr(l.p.price)} per ${h(l.p.unit)}</div>
        ${(l.p.covers || []).length ? `<div class="rd-list">${datesChips(l)} <a class="link small" href="#/p/${l.p.id}">Edit rasam dates</a></div>` : ''}
        ${extrasHtml(l)}${(l.p.kitItems || []).length ? `<a class="link small" href="#/p/${l.p.id}">${(l.extras || []).length ? 'Change extra items' : '+ Add more samagri to this kit'}</a>` : ''}
        <div class="ci-controls">
          <div class="qty"><button data-cq="-1" data-i="${l.ci}">−</button><input data-cqi="${l.ci}" type="number" min="${l.p.minQty || 1}" value="${l.qty}"><button data-cq="1" data-i="${l.ci}">+</button></div>
          <button class="btn btn-light btn-sm" data-rm="${l.ci}">Remove</button>
        </div>
      </div>
      <div class="ci-price"><span class="price">${inr(lineAmt(l))}</span>${l.p.mrp > l.p.price ? `<br><span class="mrp">${inr(l.p.mrp * l.qty + extrasAmt(l))}</span>` : ''}</div>
    </div>`;
  app().innerHTML = `<div class="two-col"><section class="panel" style="overflow:hidden">
    <div class="group-h" style="background:#fff;font-size:18px">🛒 My Cart (${lines.length + vn}) <span class="small" style="font-weight:600">📍 ${S.district ? h(district(S.district).name + ', ' + district(S.district).state) : '<a class="link" data-act="district">Select district</a>'}</span></div>
    ${sideAsk() ? `<div style="padding:10px 14px 0">${sideAsk()}</div>` : realSide() ? `<div class="side-line">${sideName(S.side)} <a class="link small" href="#/events">Change</a></div>` : ''}
    ${vsec.html}
    ${evNames.map(ev => `<div class="group-h"><span>📅 ${h(ev)}</span><label class="small" style="font-weight:600">Date: <input type="date" class="input" style="width:auto;padding:4px 8px" data-gdate="${h(ev)}" min="${today()}" value="${h(S.events[ev] || (lines.find(l => l.event === ev) || {}).eventDate || '')}"></label></div>
      ${lines.filter(l => l.event === ev && l.p.type === 'service').map(itemRow).join('')}`).join('')}
    ${goods.length ? `<div class="group-h"><span>🚚 Home delivery saman</span><span class="small muted" style="font-weight:500">Delivered before your first function</span></div>${goods.map(itemRow).join('')}` : ''}
    ${lines.length ? `<div style="padding:14px 18px;display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between"><a class="btn btn-ghost" href="#/">← Add more items</a><a class="btn btn-light" href="#/events">📅 Edit function dates</a></div>` : ''}
  </section>
  ${summaryBox(t, `${missingDates.length ? `<div class="err">Select the date for: ${missingDates.map(l => h(evShort(l.event))).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</div>` : ''}
    <button class="btn btn-gold btn-block btn-lg" data-act="checkout" ${missingDates.length ? 'disabled' : ''}>Continue to Checkout</button>
    ${lines.length ? `<a class="btn btn-wa btn-block" target="_blank" rel="noopener" href="${waLink(cartWhatsappText(lines))}">💬 Or order on WhatsApp</a>` : ''}`, vt)}</div>
  ${stickyBar(t.total + vt, 'Checkout', '[data-act="checkout"]')}`;
  vsec.bind(app());

  const setQty = (i, v) => {
    const l = S.cart[i]; const p = S.products.get(l.productId);
    // going below the minimum (e.g. − on 1) takes the item out of the cart
    if (Math.round(v) < (p.minQty || 1)) { S.cart.splice(i, 1); toast('Removed from cart'); } else l.qty = Math.round(v);
    saveCart(); viewCart();
  };
  $$('[data-cq]').forEach(b => b.addEventListener('click', () => { const l = S.cart[b.dataset.i]; const p = S.products.get(l.productId); setQty(b.dataset.i, l.qty + Number(b.dataset.cq) * (p.minQty > 1 ? Math.max(1, Math.round(p.minQty / 10)) : 1)); }));
  $$('[data-cqi]').forEach(i => i.addEventListener('change', () => setQty(i.dataset.cqi, Number(i.value))));
  $$('[data-rm]').forEach(b => b.addEventListener('click', () => { S.cart.splice(Number(b.dataset.rm), 1); saveCart(); toast('Removed from cart'); viewCart(); }));
  $$('[data-gdate]').forEach(i => i.addEventListener('change', () => { setEventDate(i.dataset.gdate, i.value); saveCart(); viewCart(); }));
}

function districtSelect(name, selected) {
  const st = (district(selected) || {}).state || 'Bihar';
  return `<div class="grid-2">
    <div class="field"><label>State</label><select data-state-for="${name}">${['Bihar', 'Uttar Pradesh'].map(s => `<option ${s === st ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field"><label>District</label><select name="${name}" required><option value="">Select district</option>${S.meta.districts.filter(d => d.state === st).map(d => `<option value="${d.id}" ${d.id === selected ? 'selected' : ''}>${h(d.name)}</option>`).join('')}</select></div></div>`;
}
function wireStateSelects(root) {
  $$('[data-state-for]', root).forEach(sel => sel.addEventListener('change', () => {
    const dsel = $(`select[name="${sel.dataset.stateFor}"]`, root);
    dsel.innerHTML = '<option value="">Select district</option>' + S.meta.districts.filter(d => d.state === sel.value).map(d => `<option value="${d.id}">${h(d.name)}</option>`).join('');
    dsel.dispatchEvent(new Event('change'));
  }));
}
function addressForm(a = {}) {
  return `<div class="grid-2">
      <div class="field"><label>Your name</label><input name="name" required autocomplete="name" value="${h(a.name || (S.user && S.user.name !== 'Customer' && S.user.name) || '')}"></div>
      <div class="field"><label>Mobile number (we will call on this)</label><input name="phone" required inputmode="numeric" maxlength="10" pattern="[6-9][0-9]{9}" autocomplete="tel" value="${h(a.phone || (S.user && S.user.phone) || '')}"></div></div>
    <div class="field"><label>House no., Mohalla / Village, Road</label><textarea name="line1" rows="2" required>${h(a.line1 || '')}</textarea></div>
    <div class="grid-2">
      <div class="field"><label>Landmark</label><input name="landmark" value="${h(a.landmark || '')}"></div>
      <div class="field"><label>City / Town / Block</label><input name="city" value="${h(a.city || '')}"></div></div>
    ${districtSelect('district', a.district || S.district)}
    <div class="field" style="max-width:220px"><label>Pincode</label><input name="pincode" required inputmode="numeric" maxlength="6" pattern="[0-9]{6}" value="${h(a.pincode || '')}"></div>`;
}

/* ---------------- Razorpay ---------------- */
let rzpScript = null;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  rzpScript = rzpScript || new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve; s.onerror = () => { rzpScript = null; reject(new Error('Could not load the payment page. Check your internet connection.')); };
    document.head.appendChild(s);
  });
  return rzpScript;
}
// Opens Razorpay Checkout; resolves { paid, order } once verified on our server, or { paid: false } if closed
async function payOnline(payment) {
  await loadRazorpay();
  return new Promise(resolve => {
    const rzp = new window.Razorpay({
      key: payment.keyId, amount: payment.amount, currency: payment.currency, name: payment.name, description: payment.description,
      order_id: payment.rzpOrderId, prefill: payment.prefill, notes: { order: payment.number }, theme: { color: '#7a1031' },
      handler: async resp => {
        try {
          // shop orders and vendor bookings each confirm on their own route (payment.verify)
          const r = await api(payment.verify || '/api/payments/verify', { method: 'POST', body: { number: payment.number, ...resp } });
          resolve({ paid: true, order: r.order, booking: r.booking });
        } catch (e) { toast(e.message, true); resolve({ paid: false }); }
      },
      modal: { ondismiss: () => resolve({ paid: false }) },
    });
    rzp.on('payment.failed', r => toast((r.error && r.error.description) || 'Payment failed. Please try again.', true));
    rzp.open();
  });
}
async function retryPayment(number, phone) {
  try {
    const { payment } = await api('/api/payments/retry', { method: 'POST', body: { number, phone } });
    const r = await payOnline(payment);
    if (r.paid) { S.lastOrder = r.order; toast('Payment successful ✓'); }
    route();
  } catch (e) { toast(e.message, true); }
}
// the family paid but the success screen never came (closed app, lost network): ask Razorpay through our server
async function checkPayment(number, phone) {
  try {
    const r = await api('/api/payments/status', { method: 'POST', body: { number, phone } });
    S.lastOrder = r.order;
    toast(r.found || ['paid', 'partial'].includes(r.order.paymentStatus) ? 'Payment found and confirmed ✓' : 'No payment found yet. If money was taken, it is confirmed within a few minutes — or pay again.', !r.found && r.order.paymentStatus === 'pending');
    route();
  } catch (e) { toast(e.message, true); }
}
async function switchToCod(number, phone) {
  try { const { order } = await api('/api/payments/cod', { method: 'POST', body: { number, phone } }); S.lastOrder = order; toast('Switched to Cash on Delivery'); route(); } catch (e) { toast(e.message, true); }
}
// "Pay now" is offered for any open order that still has a balance, once Razorpay or a UPI ID is set up
const balance = o => Math.max(0, o.total - (o.returnedValue || 0) - (o.paid || 0)); // returned items come off the bill
const canPay = o => o.status !== 'cancelled' && !['pending', 'verifying', 'refunded'].includes(o.paymentStatus) && balance(o) > 0
  && (S.meta.settings.payments.online || !!S.meta.settings.payments.upi);
const payNowBtn = (o, cls = 'btn-sm') => canPay(o) ? `<button class="btn btn-primary ${cls}" data-paybal="${h(o.number)}" data-phone="${h(o.address.phone)}">💳 Pay ${inr(balance(o))} now</button>` : '';

let qrScript = null;
const loadQr = () => window.QRCode ? Promise.resolve() : (qrScript = qrScript || new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  s.onload = resolve; s.onerror = () => { qrScript = null; reject(new Error('QR code could not load')); };
  document.head.appendChild(s);
}));

async function openPay(number, phone) {
  let o;
  try { o = (await api(`/api/track?number=${encodeURIComponent(number)}&phone=${encodeURIComponent(phone)}`)).order; } catch (e) { return toast(e.message, true); }
  if (!canPay(o)) { toast('Nothing to pay for this order right now'); return route(); }
  const p = S.meta.settings.payments, amt = balance(o);
  const upiLink = p.upi ? `upi://pay?pa=${encodeURIComponent(p.upi.id)}&pn=${encodeURIComponent(p.upi.name)}&am=${amt.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Vivah Saathi order ' + o.number)}` : '';
  const m = modal(`<div class="m-pad">
    <h3 style="margin:0 0 2px">Pay ${inr(amt)} for order #${h(o.number)}</h3>
    <p class="small muted" style="margin:0 0 14px">Total ${inr(o.total)}${o.paid ? ` · already paid ${inr(o.paid)}` : ''}</p>
    ${p.online ? `<button class="btn btn-gold btn-block btn-lg" id="payRzp">💳 Pay with UPI, Card or Net Banking</button><p class="small muted" style="text-align:center;margin:6px 0 ${p.upi ? '16px' : '0'}">Secure payment by Razorpay${p.testMode ? ' · test mode' : ''}</p>` : ''}
    ${p.upi ? `${p.online ? '<div class="or-line"><span>or pay directly by UPI</span></div>' : ''}
      <div class="upi-box">
        <div id="upiQr" class="upi-qr"></div>
        <div style="flex:1;min-width:200px">
          <div class="small muted">Scan with GPay, PhonePe, Paytm or BHIM</div>
          <div style="font-size:22px;font-weight:800;margin:2px 0">${inr(amt)}</div>
          <div class="small">UPI ID: <b id="upiId">${h(p.upi.id)}</b> <button type="button" class="btn btn-light btn-sm" id="upiCopy" style="padding:2px 8px">Copy</button></div>
          <div class="small muted">Name: ${h(p.upi.name)}</div>
          <a class="btn btn-wa btn-sm upi-app" href="${h(upiLink)}" style="margin-top:8px">📱 Open UPI app</a>
        </div>
      </div>
      <form id="utrForm" style="margin-top:12px"><div class="field"><label>After paying, enter the 12-digit UPI reference / UTR number</label>
        <div class="otp-row"><input name="utr" inputmode="numeric" maxlength="12" placeholder="e.g. 412345678901" required><button class="btn btn-primary btn-sm">Submit</button></div></div>
        <p class="small muted" style="margin:-4px 0 0">Find it in your UPI app under the payment details ("UPI Ref No." / "UTR"). Our team confirms it within a few hours.</p></form>` : ''}
  </div>`, 'sm');
  if (p.online) $('#payRzp', m).addEventListener('click', async e => {
    e.target.disabled = true;
    try {
      const { payment } = await api('/api/payments/start', { method: 'POST', body: { number: o.number, phone: o.address.phone } });
      closeModal();
      const r = await payOnline(payment);
      if (r.paid) { S.lastOrder = r.order; toast('Payment successful ✓'); }
      route();
    } catch (err) { toast(err.message, true); e.target.disabled = false; }
  });
  if (p.upi) {
    loadQr().then(() => { const el = $('#upiQr', m); if (el) new window.QRCode(el, { text: upiLink, width: 168, height: 168, correctLevel: window.QRCode.CorrectLevel.M }); }).catch(() => { $('#upiQr', m).innerHTML = '<span class="small muted">QR not available – use the UPI ID</span>'; });
    $('#upiCopy', m).addEventListener('click', () => { try { navigator.clipboard.writeText(p.upi.id); toast('UPI ID copied'); } catch { /* clipboard blocked */ } });
    $('#utrForm', m).addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const r = await api('/api/payments/utr', { method: 'POST', body: { number: o.number, phone: o.address.phone, utr: e.target.utr.value } });
        S.lastOrder = r.order; closeModal(); toast('Thank you! We will verify your UPI payment shortly ✓'); route();
      } catch (err) { toast(err.message, true); }
    });
  }
}

const payLabel = o => o.paymentStatus === 'paid' ? `<span class="chip pay-paid">✓ Paid ${inr(o.paid)}</span>`
  : o.paymentStatus === 'partial' ? `<span class="chip pay-paid">✓ Paid ${inr(o.paid)} · balance ${inr(balance(o))}</span>`
  : o.paymentStatus === 'verifying' ? `<span class="chip pay-pending">⏳ UPI payment ${inr(o.utrAmount)} being verified</span>`
  : o.paymentStatus === 'pending' ? '<span class="chip pay-pending">⏳ Payment pending</span>'
  : o.paymentStatus === 'refunded' ? '<span class="chip pay-ref">↩ Refunded</span>'
  : o.paymentStatus === 'failed' ? '<span class="chip pay-ref">Payment not completed</span>'
  : `<span class="chip pay-cod">${o.paymentMethod === 'upi' ? '📱 UPI after confirmation' : '💵 Cash / pay on function day'}</span>`;

async function viewCheckout() {
  spinner();
  await ensureCartProducts();
  const lines = cartLines();
  const vgs = window.VENDORS.groups(), vt = window.VENDORS.total();
  if (!lines.length && !vgs.length) { location.hash = '#/cart'; return; }
  if (lines.some(l => l.p.type === 'service' && !l.eventDate)) { toast('Please select function dates first', true); location.hash = '#/cart'; return; }
  ping('checkouts');
  const s = S.meta.settings;
  const T = distId => (lines.length ? totals(lines, distId) : ZERO_T);
  // Mobile must be verified by OTP first when the admin turns that on
  if (s.otp.required && !S.user) {
    const t = T(S.district);
    app().innerHTML = `<div class="two-col"><section class="panel step"><div class="step-h"><span class="n">1</span> Verify your mobile number</div><div class="step-b" style="max-width:460px">
      <p class="muted small" style="margin-top:0">We send a one-time code by SMS so our team can reach you about your bookings. No password needed.</p><div id="coOtp"></div></div></section>
      ${summaryBox(t, '', vt)}</div>`;
    mountOtp($('#coOtp'), { onDone: () => viewCheckout(), submitLabel: 'Verify & Continue' });
    return;
  }
  const addrs = (S.user && S.user.addresses) || [];
  let addrIdx = addrs.length ? 0 : -1, pay = s.payments.online ? 'online-full' : 'cod', placing = false;
  const servicesTotal = lines.filter(l => l.p.type === 'service').reduce((a, l) => a + l.p.price * l.qty, 0);
  const advanceNow = t => t.total - servicesTotal + t.advance;
  const payNowFor = t => pay === 'online-full' ? t.total : pay === 'online-advance' ? advanceNow(t) : 0;
  const vLabel = vgs.length ? `${vgs.length} vendor booking${vgs.length > 1 ? 's' : ''}` : '';
  const placeBtn = t => `<button class="btn btn-gold btn-block btn-lg" id="placeBtn" ${placing ? 'disabled' : ''}>${placing ? 'Submitting…' : !lines.length ? 'Request Booking' : payNowFor(t) ? `🔒 Pay ${inr(payNowFor(t))} & Place Order` : `Confirm Order · ${inr(t.total + vt)}`}</button>
    <p class="small muted" style="text-align:center;margin:8px 0 0">${vgs.length ? `Send ${vLabel} for confirmation. Pay for vendor services after confirmation. ` : ''}${lines.length && payNowFor(t) ? 'Shop payment is handled by Razorpay.' : ''}</p>
    <p class="small muted" style="text-align:center;margin:4px 0 0">By placing the order you agree to our <a class="link" href="#/terms">Terms & Conditions</a> and <a class="link" href="#/policy">Cancellation, Return & Refund Policy</a>.</p>`;
  const updateSummary = () => {
    const distId = addrIdx >= 0 ? addrs[addrIdx].district : $('select[name=district]', $('#addrForm')).value;
    const t = T(distId);
    $('.summary').outerHTML = summaryBox(t, placeBtn(t), vt);
    const amounts = { full: t.total, advance: advanceNow(t), balance: t.total - advanceNow(t) };
    $$('[data-pay-amount]').forEach(el => { el.textContent = inr(amounts[el.dataset.payAmount]); });
    const st = $('.vsticky .st-total'); if (st) st.textContent = inr(t.total + vt);
    $('#placeBtn').addEventListener('click', place);
  };
  const draw = () => {
    const t = T(addrIdx >= 0 ? addrs[addrIdx].district : S.district);
    app().innerHTML = `<div class="two-col"><div>
      <section class="panel step"><div class="step-h"><span class="n">1</span> Your details & address</div><div class="step-b">
        ${!S.user ? `<p class="small muted" style="margin:0 0 12px">No account needed. Already registered? <a class="link" data-act="login-checkout">Login</a> to use saved addresses.</p>` : ''}
        ${addrs.map((a, i) => `<label class="addr-opt ${i === addrIdx ? 'on' : ''}"><input type="radio" name="addrPick" value="${i}" ${i === addrIdx ? 'checked' : ''}><div><b>${h(a.name)}</b> · ${h(a.phone)}<br><span class="small">${h(a.line1)}${a.landmark ? ', ' + h(a.landmark) : ''}, ${h(a.city)}, ${h((district(a.district) || {}).name || '')} – ${h(a.pincode)}</span></div></label>`).join('')}
        ${addrs.length ? `<label class="addr-opt ${addrIdx === -1 ? 'on' : ''}"><input type="radio" name="addrPick" value="-1" ${addrIdx === -1 ? 'checked' : ''}><b>+ Use a new address</b></label>` : ''}
        <form id="addrForm" class="${addrIdx === -1 ? '' : 'hide'}" style="margin-top:6px">${addressForm()}
          ${S.user ? '<label class="small"><input type="checkbox" name="saveAddress" checked> Save this address</label>' : ''}</form>
      </div></section>
      <details class="panel step checkout-review" ${vgs.length ? 'open' : ''}><summary class="step-h"><span class="n">2</span> Review selection (${lines.length + vgs.reduce((a, g) => a + g.lines.length, 0)} items)</summary><div class="step-b">
        ${realSide() ? `<div class="side-line" style="margin:0 0 8px">${sideName(S.side)} <span class="small muted">· sent with every booking</span> <a class="link small" href="#/events">Change</a></div>` : sideAsk()}
        ${lines.map(l => `<div class="oi">${pPhoto(l.p)}<div style="flex:1"><b>${h(l.p.name)}</b><div class="small muted">${l.qty} × ${inr(l.p.price)} / ${h(l.p.unit)}${l.event ? ` · ${datesChips(l)}` : ''}</div>${extrasHtml(l)}</div><b>${inr(lineAmt(l))}</b></div>`).join('')}
        ${vgs.map(g => `<div class="co-vgroup"><div class="co-vh">🤝 <b>${h(g.vendorName)}</b> · 📅 ${fmtDate(g.date)}${g.eventTime ? ` · ⏰ ${h(g.eventTime)}` : ''}${g.event ? ` · <span class="chip chip-ev">${h(evShort(g.event))}</span>` : ''}${g.canDeliver ? ` · ${g.fulfil === 'delivery' ? (g.rental ? '🚚 Delivery & set-up' : '🚚 Delivery') : '🏪 Pickup'}` : ''}<span style="margin-left:auto"><b>${inr(g.total)}</b></span></div>
          ${g.lines.map(x => `<div class="small" style="display:flex;justify-content:space-between;padding:2px 0 2px 24px"><span>${h(x.name)} × ${x.qty} ${h(x.unit)}${(x.dates || []).length ? `<br>${datesChips(x)}` : ''}</span><span>${inr(x.price * x.qty)}</span></div>`).join('')}${g.deliveryCharge ? `<div class="small" style="display:flex;justify-content:space-between;padding:2px 0 2px 24px"><span>🚚 Delivery${g.rental ? ' & transport' : ''}</span><span>${inr(g.deliveryCharge)}</span></div>` : ''}</div>`).join('')}
        <div class="field" style="margin-top:10px"><label for="orderNote">Booking note (optional)</label><textarea id="orderNote" rows="2" placeholder="e.g. Baraat at 7 PM"></textarea></div>
      </div></details>
      ${lines.length ? `<section class="panel step"><div class="step-h"><span class="n">3</span> Payment ${s.payments.online && s.payments.testMode ? '<span class="chip pay-pending" style="margin-left:auto">Test mode</span>' : ''}</div><div class="step-b">
        ${s.payments.online ? `
        <label class="pay-opt ${pay === 'online-full' ? 'on' : ''}"><input type="radio" name="pay" value="online-full" ${pay === 'online-full' ? 'checked' : ''}><div><b>💳 Pay online now – <span data-pay-amount="full">${inr(t.total)}</span></b><div class="small muted">UPI, card or net banking via Razorpay</div></div></label>
        ${servicesTotal ? `<label class="pay-opt ${pay === 'online-advance' ? 'on' : ''}"><input type="radio" name="pay" value="online-advance" ${pay === 'online-advance' ? 'checked' : ''}><div><b>🔖 Pay advance online – <span data-pay-amount="advance">${inr(advanceNow(t))}</span> now</b><div class="small muted">Saman + ${s.advancePercent}% booking advance now. Balance <span data-pay-amount="balance">${inr(t.total - advanceNow(t))}</span> on the function day.</div></div></label>` : ''}` : ''}
        <label class="pay-opt ${pay === 'cod' ? 'on' : ''}"><input type="radio" name="pay" value="cod" ${pay === 'cod' ? 'checked' : ''}><div><b>💵 Cash on Delivery / Pay on function day</b><div class="small muted">Saman ka paisa delivery par. Bookings: team calls to confirm, then small advance.</div></div></label>
        ${s.payments.upi ? `<label class="pay-opt ${pay === 'upi' ? 'on' : ''}"><input type="radio" name="pay" value="upi" ${pay === 'upi' ? 'checked' : ''}><div><b>📱 Pay by UPI now – <span data-pay-amount="full">${inr(t.total)}</span></b><div class="small muted">Open UPI or scan a QR on the next screen.</div></div></label>`
          : !s.payments.online ? `<label class="pay-opt ${pay === 'upi' ? 'on' : ''}"><input type="radio" name="pay" value="upi" ${pay === 'upi' ? 'checked' : ''}><div><b>📱 UPI / Bank transfer</b><div class="small muted">We share UPI details on call / WhatsApp after confirming.${t.advance ? ` Booking advance: ${inr(t.advance)}.` : ''}</div></div></label>` : ''}
        ${vgs.length ? `<p class="small muted" style="margin:6px 0 0">Payment above is for the shop order (<span data-pay-amount="full">${inr(t.total)}</span>). Vendor bookings (${inr(vt)}) are paid to each vendor directly as agreed.</p>` : ''}
      </div></section>` : ''}
    </div>${summaryBox(t, placeBtn(t), vt)}</div>
    ${stickyBar(t.total + vt, lines.length ? 'Place Order' : 'Request Booking', '#placeBtn')}`;
    $$('input[name=addrPick]').forEach(r => r.addEventListener('change', () => {
      addrIdx = Number(r.value);
      $('#addrForm').classList.toggle('hide', addrIdx !== -1);
      $$('.addr-opt').forEach(x => x.classList.toggle('on', $('input', x).checked));
      updateSummary();
    }));
    $$('input[name=pay]').forEach(r => r.addEventListener('change', () => { pay = r.value; $$('.pay-opt').forEach(x => x.classList.toggle('on', $('input', x).checked)); updateSummary(); }));
    wireStateSelects($('#addrForm'));
    $('select[name=district]', $('#addrForm')).addEventListener('change', () => { if (addrIdx === -1) updateSummary(); });
    $('#placeBtn').addEventListener('click', place);
  };
  const place = async () => {
    if (placing) return;
    let address, saveAddress = false;
    if (addrIdx >= 0) address = addrs[addrIdx];
    else {
      const f = $('#addrForm');
      if (!f.reportValidity()) return;
      const fd = new FormData(f);
      address = Object.fromEntries(fd); saveAddress = fd.get('saveAddress') === 'on'; delete address.saveAddress;
    }
    const note = $('#orderNote').value;
    const method = pay, online = lines.length > 0 && method.startsWith('online');
    const side = realSide();
    const form = $('#addrForm');
    placing = true;
    updateSummary();
    const retry = error => {
      placing = false;
      toast(error.message, true);
      if (form.isConnected) updateSummary();
    };
    if (online) {
      try { await loadRazorpay(); } catch (e) { retry(e); return; }
    }
    // 1) all vendor bookings in one all-or-nothing request (no payment needed)
    let vbooked = [];
    if (vgs.length) {
      try {
        vbooked = await window.VENDORS.bookCart({ name: address.name, phone: address.phone, address: [address.line1, address.landmark, address.city].filter(Boolean).join(', '), district: address.district, pincode: address.pincode, side }, note);
      } catch (e) { retry(e); return; }
      if (!lines.length) { location.hash = '#/vbdone'; return; }
    }
    // 2) shop order (with payment if chosen)
    try {
      const { order, payment } = await api('/api/orders', { method: 'POST', body: { items: S.cart, address, paymentMethod: online ? 'online' : method, payPlan: method === 'online-advance' ? 'advance' : 'full', note, saveAddress, side } });
      S.cart = []; saveCart();
      S.lastOrder = order;
      S.myOrders = [{ number: order.number, phone: order.address.phone }, ...S.myOrders.filter(o => o.number !== order.number)].slice(0, 20);
      store.set('myorders', S.myOrders);
      if (!S.district) { S.district = order.address.district; savePref('district'); renderDistrict(); }
      if (S.user && saveAddress) { try { S.user = (await api('/api/me')).user; } catch { /* ignore */ } }
      if (payment) {
        const r = await payOnline(payment);
        if (r.paid) { S.lastOrder = r.order; toast('Payment successful ✓'); }
      }
      if (vbooked.length) S.justVB = order.number;
      location.hash = '#/order/' + order.number;
      if (method === 'upi' && s.payments.upi) setTimeout(() => openPay(order.number, order.address.phone), 400);
    } catch (e) {
      if (vbooked.length) { toast(`Vendor bookings were sent, but the shop order failed: ${e.message}`, true); location.hash = '#/vbdone'; return; }
      retry(e);
    }
  };
  draw();
}

async function viewSuccess(number) {
  spinner();
  let o = S.lastOrder && S.lastOrder.number === number ? S.lastOrder : null;
  const mine = S.myOrders.find(x => x.number === number);
  if (!o && mine) { try { o = (await api(`/api/track?number=${encodeURIComponent(number)}&phone=${encodeURIComponent(mine.phone)}`)).order; } catch { /* fallthrough */ } }
  if (!o) { location.hash = '#/track'; return; }
  const s = S.meta.settings;
  const msg = `Namaste ${s.siteName} 🙏\nMaine order kiya hai.\nOrder number: ${o.number}\nNaam: ${o.address.name}\nDistrict: ${o.address.districtName}\nTotal: ${inr(o.total)}\n\n` + o.items.map(i => `• ${i.name} × ${i.qty}${i.event ? ` (${datesText(i)})` : ''}`).join('\n');
  const pending = o.paymentStatus === 'pending' && o.status !== 'cancelled';
  app().innerHTML = `<div class="panel success"><div class="tick" style="${pending ? 'background:var(--gold)' : ''}">${pending ? '⏳' : '✓'}</div>
    <h1 style="margin:0">${pending ? 'Order saved – payment pending' : 'Order placed successfully!'}</h1>
    <p class="muted" style="margin:6px 0 0">Your order number</p><div class="order-no">#${h(o.number)}</div>
    ${pending ? `<div class="box" style="max-width:520px;margin:6px auto 14px;background:var(--gold-soft)"><b>Complete the payment of ${inr(o.payNow)} within 30 minutes</b> to confirm your booking dates.
      <div class="cta-row" style="margin-top:10px"><button class="btn btn-primary" data-paynow="${h(o.number)}" data-phone="${h(o.address.phone)}">🔒 Pay ${inr(o.payNow)} now</button><button class="btn btn-ghost" data-cod="${h(o.number)}" data-phone="${h(o.address.phone)}">Pay cash instead</button></div>
      <p class="small" style="margin:10px 0 0">Already paid and the page closed? <button type="button" class="link" data-paycheck="${h(o.number)}" data-phone="${h(o.address.phone)}" style="border:0;background:none;padding:0;font:inherit">Check my payment again</button></p></div>` : ''}
    <p>Hamari ${h(o.address.districtName)} team aapko <b>${h(o.address.phone)}</b> par jaldi call karegi.<br>Total: <b>${inr(o.total)}</b> · ${payLabel(o)}</p>
    ${canPay(o) ? `<div class="box" style="max-width:520px;margin:0 auto 6px"><b>Want to pay now?</b> <span class="small muted">Optional – you can also pay on delivery / function day.</span><div style="margin-top:8px">${payNowBtn(o, '')}</div></div>` : ''}
    ${S.justVB === o.number ? `<div style="max-width:720px;margin:12px auto 0;text-align:left">${window.VENDORS.doneBlock(window.VENDORS.lastBookings())}</div>` : ''}
    <div class="cta-row" style="max-width:640px;margin:18px auto 0">
      <a class="btn btn-wa" target="_blank" rel="noopener" href="${waLink(msg)}">💬 Send order on WhatsApp</a>
      <a class="btn btn-primary" href="#/track?number=${h(o.number)}">📦 Track this order</a>
      <a class="btn btn-light" href="#/bill/${h(o.number)}">🧾 Bill / receipt</a>
      <a class="btn btn-ghost" href="#/">Continue Shopping</a>
    </div>
    <p class="small muted" style="margin-top:16px">Save your order number. You can track it any time with your mobile number — no login needed.</p></div>`;
}

const FLOW = ['placed', 'confirmed', 'dispatched', 'delivered'];
const STATUS_LABEL = { placed: 'Placed', confirmed: 'Confirmed', dispatched: 'Dispatched / Assigned', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled' };
// after delivery / the function: "Rate & review" on each line (number + mobile go with it), "✓ Reviewed" once done
const rateBtn = (o, i, k) => (i.reviewed ? '<span class="rv-done">✓ Reviewed</span>'
  : canRate(o, i) ? `<button type="button" class="btn btn-gold btn-sm rv-btn" data-rate="${h(o.number)}" data-line="${k}" data-pid="${h(i.productId)}" data-name="${h(i.name)}" data-phone="${h(o.address.phone)}">⭐ Rate & review</button>` : '');
const fmtWhen = d => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
// tracking words fit what was ordered: saman is dispatched and delivered, a booking gets its team assigned and is done
function trackWords(o) {
  const svc = o.items.filter(i => i.type === 'service').length, all = svc === o.items.length;
  return {
    label: { placed: 'Order placed', confirmed: 'Confirmed', dispatched: all ? 'Team assigned' : svc ? 'Dispatched / assigned' : 'Dispatched', delivered: all ? 'Service done' : 'Delivered' },
    next: {
      placed: `Our team will call you on ${o.address.phone} to confirm the order.`,
      confirmed: all ? 'Confirmed. We will assign the team before your function date.' : svc ? 'Confirmed. We will dispatch the saman and assign the team before your function date.' : 'Confirmed. We will pack and dispatch your order soon.',
      dispatched: all ? 'Team assigned. They will reach you on the function date.' : 'Your order is on the way.',
      delivered: `All done — thank you!${o.items.some(i => canRate(o, i)) ? ' Please rate your items below.' : ''}`,
      completed: `All done — thank you!${o.items.some(i => canRate(o, i)) ? ' Please rate your items below.' : ''}`,
    },
  };
}
function trackHtml(o) {
  const w = trackWords(o), ups = [...o.history].reverse();
  const at = st => (o.history.find(x => x.status === st) || {}).at;
  let top;
  if (o.status === 'cancelled') {
    const c = at('cancelled');
    top = `<div class="o-next red"><b>Cancelled${c ? ' on ' + fmtWhen(c) : ''}</b>${(o.history.find(x => x.status === 'cancelled') || {}).note ? ' — ' + h(o.history.find(x => x.status === 'cancelled').note) : ''}.${o.paid ? ` Paid amount ${inr(o.paid)} will be refunded.` : ''}</div>`;
  } else {
    const step = o.status === 'completed' ? FLOW.length - 1 : FLOW.indexOf(o.status);
    top = `<div class="timeline">${FLOW.map((s, i) => `<div class="tl ${i <= step ? 'done' : ''}${i === step ? ' now' : ''}"><div class="dot">${i <= step ? '✓' : ''}</div><span>${w.label[s]}</span>${at(s) ? `<small>${fmtWhen(at(s))}</small>` : ''}</div>`).join('')}</div>
      <div class="o-next">${w.next[o.status]}</div>`;
  }
  return top + (ups.length ? `<details class="o-upd"><summary>All updates (${ups.length})</summary>${ups.map(x => `<div><span>${fmtWhen(x.at)}</span><b>${x.status === 'cancelled' ? 'Cancelled' : w.label[x.status] || STATUS_LABEL[x.status]}</b>${x.note ? ` — ${h(x.note)}` : ''}</div>`).join('')}</details>` : '');
}
function orderCard(o, cancelAttr) {
  return `<div class="order-card">
    <div class="order-top"><div><b>#${h(o.number)}</b> · ${fmtDate(o.createdAt)}</div><span class="status st-${o.status}">${o.status === 'cancelled' || o.status === 'completed' ? STATUS_LABEL[o.status] : trackWords(o).label[o.status]}</span></div>
    ${trackHtml(o)}
    ${deliveryCheckHtml(o)}
    ${aftercareHtml(o)}
    ${o.items.some(i => canRate(o, i)) ? '<div class="rv-ask">⭐ How was everything? Rate each item — it takes 5 seconds and helps other families.</div>' : ''}
    <div class="order-items">${o.items.map((i, k) => `<div class="oi">${ph(i.image, i.emoji, '#fbeff3')}<div style="flex:1"><a href="#/p/${i.productId}"><b>${h(i.name)}</b></a><div class="small muted">${i.qty} × ${inr(i.price)} / ${h(i.unit)}${i.eventDate ? ` · ${datesChips(i)}` : ''}</div>${rateBtn(o, i, k)}</div><b>${inr(i.price * i.qty)}</b></div>`).join('')}</div>
    ${o.adminNote ? `<div class="small" style="padding:0 16px 10px"><b>Message from our team:</b> ${h(o.adminNote)}</div>` : ''}
    <div class="order-foot"><span class="small muted">📍 ${h(o.address.line1)}, ${h(o.address.districtName)}, ${h(o.address.state)}</span>
      <span style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${payLabel(o)}<b>Total ${inr(o.total)}</b><a class="btn btn-light btn-sm" href="#/bill/${h(o.number)}">${o.invoice ? '🧾 Tax invoice' : '🧾 Bill'}</a>
        ${o.paymentStatus === 'pending' && o.status !== 'cancelled' ? `<button class="btn btn-primary btn-sm" data-paynow="${h(o.number)}" data-phone="${h(o.address.phone)}">Pay ${inr(o.payNow)}</button><button class="btn btn-light btn-sm" data-paycheck="${h(o.number)}" data-phone="${h(o.address.phone)}">I've paid — check</button>` : payNowBtn(o)}
        ${cancelAttr ? orderActions(o) : ''}</span></div>
  </div>`;
}

async function viewTrack(q) {
  const num = q.get('number') || '';
  const saved = S.myOrders;
  app().innerHTML = `<div class="two-col" style="grid-template-columns:1fr 340px"><section class="panel" style="padding:18px 20px">
      <h1 style="margin:0 0 4px">📦 Track your order</h1><p class="muted" style="margin:0 0 16px">Orders placed from this phone / browser are shown below. ${S.user ? '<a class="link" href="#/account/orders">See all orders in My Account →</a>' : ''}</p>
      <p class="small" style="margin:-8px 0 14px">🤝 Booked a vendor (gaadi, halwai, DJ, orchestra…)? <a class="link" href="#/vtrack">Track vendor bookings →</a></p>
      <div id="trackList">${saved.length ? '<div class="spinner"></div>' : '<p class="muted">No orders placed from this device yet.</p>'}</div></section>
    <aside class="panel" style="padding:18px"><h3 style="margin:0 0 12px">Find an order</h3><form id="trackForm">
      <div class="field"><label>Order number</label><input name="number" required placeholder="e.g. SA1006" value="${h(num)}"></div>
      <div class="field"><label>Mobile number used in the order</label><input name="phone" required inputmode="numeric" maxlength="10" value="${h((saved.find(o => o.number === num) || {}).phone || '')}"></div>
      <button class="btn btn-primary btn-block">Track Order</button></form><div id="trackOne" style="margin-top:14px"></div></aside></div>`;
  const draw = async () => {
    if (!saved.length) return;
    const res = await Promise.all(saved.map(o => api(`/api/track?number=${encodeURIComponent(o.number)}&phone=${encodeURIComponent(o.phone)}`).then(r => r.order).catch(() => null)));
    const list = res.filter(Boolean);
    $('#trackList').innerHTML = list.length ? list.map(o => orderCard(o, true)).join('') : '<p class="muted">No orders found.</p>';
  };
  $('#trackForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    try {
      const { order } = await api(`/api/track?number=${encodeURIComponent(fd.number)}&phone=${encodeURIComponent(fd.phone)}`);
      // a found order replaces any old entry with the same number (e.g. saved with a different mobile)
      const old = S.myOrders.findIndex(o => o.number === order.number);
      if (old >= 0) S.myOrders.splice(old, 1);
      S.myOrders.unshift({ number: order.number, phone: fd.phone }); store.set('myorders', S.myOrders);
      $('#trackOne').innerHTML = `<p class="ok-txt" style="margin:0">Found! Status: ${STATUS_LABEL[order.status]}</p>`;
      draw();
    } catch (err) { $('#trackOne').innerHTML = `<div class="err">${h(err.message)}</div>`; }
  });
  // opened from a WhatsApp / SMS link with the order number: just ask for the mobile
  if (num && !$('#trackForm').phone.value) $('#trackForm').phone.focus();
  draw();
}

async function viewAccount(tab) {
  if (!S.user) return openLogin(() => viewAccount(tab));
  tab = tab || 'orders';
  const u = S.user;
  const nav = [['orders', '📦', 'My Orders'], ['wishlist', '♥', 'Wishlist'], ['profile', '👤', 'Profile'], ['addresses', '📍', 'Addresses']];
  app().innerHTML = `<div class="account">
    <aside class="panel acc-side"><div class="hello"><div class="avatar">${h((u.name[0] || '?').toUpperCase())}</div><div><div class="small muted">Namaste,</div><b>${h(u.name)}</b></div></div>
      <nav>${nav.map(([k, i, l]) => `<a href="#/account/${k}" class="${k === tab ? 'on' : ''}">${i} ${l}</a>`).join('')}<a href="#/events">📅 My Events</a>
      ${u.role === 'admin' ? '<a href="/admin">🛠️ Admin Panel</a>' : ''}<a data-act="logout" href="#/">🚪 Logout</a></nav></aside>
    <section class="panel" id="accBody"><div class="spinner"></div></section></div>`;
  const body = $('#accBody');
  if (tab === 'orders') {
    // the account is the source of truth: shop orders + vendor bookings made while logged in (any device), guest ones
    // with this OTP-verified mobile, plus whatever this browser remembers (e.g. booked with another number) — no duplicates
    const V = window.VENDORS;
    const [mine, vmine] = await Promise.all([api('/api/orders/mine'), api('/api/vbookings/mine').catch(() => ({ bookings: [] }))]);
    const orders = mine.orders, vbs = vmine.bookings;
    const moreO = await Promise.all(S.myOrders.filter(x => !orders.some(o => o.number === x.number)).map(x => api(`/api/track?number=${encodeURIComponent(x.number)}&phone=${encodeURIComponent(x.phone)}`).then(r => r.order).catch(() => null)));
    const moreV = V ? await Promise.all(V.saved().filter(x => !vbs.some(b => b.number === x.number)).map(x => api(`/api/vbookings/track?number=${encodeURIComponent(x.number)}&phone=${encodeURIComponent(x.phone)}`).then(r => ({ ...r.booking, vendor: r.vendor })).catch(() => null))) : [];
    // remember the account's ones in this browser too, so Track Order / My Vendor Bookings show them
    const known = new Set(S.myOrders.map(x => x.number));
    S.myOrders = [...S.myOrders, ...orders.filter(o => !known.has(o.number)).map(o => ({ number: o.number, phone: o.address.phone }))].slice(0, 40); store.set('myorders', S.myOrders);
    if (V) V.remember(vbs);
    const allO = [...orders, ...moreO.filter(Boolean)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const allV = [...vbs, ...moreV.filter(Boolean)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const own = new Set(orders.map(o => o.id));
    body.innerHTML = `<div class="group-h" style="background:#fff;font-size:18px">My Orders & Bookings</div><div style="padding:16px">
      ${mine.phoneVerified ? '' : `<p class="small muted" style="margin:0 0 12px">Log in once with OTP on this mobile number to also see orders and bookings you made without logging in.</p>`}
      <h3 style="margin:0 0 10px">🛍️ Shop orders <span class="muted">(${allO.length})</span></h3>
      ${allO.length ? allO.map(o => orderCard(o, true)).join('') : '<div class="empty" style="padding:18px"><div class="big">📦</div><h3>No orders yet</h3><a class="btn btn-primary" href="#/">Start Shopping</a></div>'}
      <h3 style="margin:22px 0 10px">🤝 Vendor bookings <span class="muted">(${allV.length})</span></h3>
      ${allV.length && V ? allV.map(b => V.card(b, b.vendor)).join('') : '<div class="empty" style="padding:18px"><div class="big">🤝</div><h3>No vendor bookings yet</h3><a class="btn btn-primary" href="#/vendors">Book Local Vendors</a></div>'}</div>`;
  } else if (tab === 'wishlist') {
    const items = await Promise.all(u.wishlist.map(id => S.products.get(id) || api('/api/products/' + id).then(r => (S.products.set(id, r.product), r.product)).catch(() => null)));
    const list = items.filter(Boolean);
    body.innerHTML = `<div class="group-h" style="background:#fff;font-size:18px">My Wishlist (${list.length})</div>${list.length ? `<div class="pgrid">${list.map(card).join('')}</div>` : '<div class="empty"><div class="big">♡</div><h3>Wishlist is empty</h3><p class="muted">Tap ♥ on any item to save it here.</p></div>'}`;
  } else if (tab === 'profile') {
    body.innerHTML = `<div class="group-h" style="background:#fff;font-size:18px">Profile</div><div style="padding:18px;max-width:560px">
      <form id="profForm"><div class="field"><label>Full name</label><input name="name" required value="${h(u.name)}"></div>
        <div class="field"><label>Mobile number</label><input value="${h(u.phone)}" disabled></div>
        <div class="field"><label>Email (optional)</label><input name="email" type="email" value="${h(u.email)}"></div>
        <button class="btn btn-primary">Save Profile</button></form>
      <h3 style="margin-top:28px">${u.hasPassword ? 'Change password' : 'Set a password (optional)'}</h3>
      ${u.hasPassword ? '' : '<p class="small muted" style="margin-top:-6px">You log in with OTP. A password lets you log in even when SMS is slow.</p>'}
      <form id="pwForm"><div class="grid-2">${u.hasPassword ? '<div class="field"><label>Current password</label><input name="oldPassword" type="password" required autocomplete="current-password"></div>' : ''}
        <div class="field"><label>New password</label><input name="newPassword" type="password" minlength="6" required autocomplete="new-password"></div></div>
        <button class="btn btn-ghost">Update Password</button></form></div>`;
    const submit = (sel, msg) => $(sel).addEventListener('submit', async e => {
      e.preventDefault();
      try { const r = await api('/api/me', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }); S.user = r.user; renderAcct(); toast(msg); viewAccount(tab); } catch (err) { toast(err.message, true); }
    });
    submit('#profForm', 'Profile saved ✓'); submit('#pwForm', 'Password updated ✓');
  } else if (tab === 'addresses') {
    const saveAddrs = async addresses => { try { const r = await api('/api/me', { method: 'PUT', body: { addresses } }); S.user = r.user; toast('Addresses updated ✓'); drawAddr(); } catch (e) { toast(e.message, true); } };
    const drawAddr = () => {
      body.innerHTML = `<div class="group-h" style="background:#fff;font-size:18px">Saved Addresses <button class="btn btn-primary btn-sm" id="addAddr">+ Add new</button></div><div style="padding:16px">
        <form id="newAddr" class="hide box">${addressForm()}<button class="btn btn-primary">Save Address</button></form>
        ${S.user.addresses.length ? S.user.addresses.map((a, i) => `<div class="addr-opt" style="cursor:default"><div style="flex:1"><b>${h(a.name)}</b> · ${h(a.phone)}<br><span class="small">${h(a.line1)}${a.landmark ? ', ' + h(a.landmark) : ''}, ${h(a.city)}, ${h((district(a.district) || {}).name || '')} – ${h(a.pincode)}</span></div><button class="btn btn-light btn-sm" data-del="${i}">Delete</button></div>`).join('') : '<p class="muted">No saved addresses yet.</p>'}</div>`;
      wireStateSelects($('#newAddr'));
      $('#addAddr').addEventListener('click', () => $('#newAddr').classList.toggle('hide'));
      $('#newAddr').addEventListener('submit', e => { e.preventDefault(); saveAddrs([Object.fromEntries(new FormData(e.target)), ...S.user.addresses]); });
      $$('[data-del]', body).forEach(b => b.addEventListener('click', () => saveAddrs(S.user.addresses.filter((_, i) => i !== Number(b.dataset.del)))));
    };
    drawAddr();
  }
}

function viewHelp() {
  const s = S.meta.settings;
  app().innerHTML = `<div class="panel" style="padding:24px;max-width:880px;margin:0 auto">
    <h1 style="margin-top:0">How ordering works</h1>
    <ol style="padding-left:20px;line-height:1.9">
      <li><b>Set your function dates</b> in <a class="link" href="#/events">My Events</a> (Tilak, Haldi, Mehndi, Shaadi…). Or pick a date when you book.</li>
      <li><b>Tap “Add to Cart”</b> for saman (kits, mithai, phool, kapde) or <b>“Book Now”</b> for services (Pandit Ji, photographer, mehndi artist, car, tent, band…). Choose which function it is for.</li>
      <li>Or add a <b>Ready Package</b> — everything for one function in a single click.</li>
      <li><b>Place the order</b> with your name, mobile and address. No account or password needed.</li>
      <li>Our local team calls you to confirm. Saman is paid on delivery; bookings need ${s.advancePercent}% advance after confirmation.</li>
      <li>Track any time with your order number + mobile at <a class="link" href="#/track">Track Order</a>.</li>
    </ol>
    <h3>Cancel, return & refund</h3><p>Cancel free from Track Order until the order is dispatched or the team is assigned; after that send a cancellation request. Eligible saman can be returned within ${s.policy.returnDays} days of delivery. <a class="link" href="#/policy">Read the full policy →</a></p>
    <a class="btn btn-wa" target="_blank" rel="noopener" href="${waLink('Namaste, mujhe order karne mein madad chahiye.')}">💬 Need help? WhatsApp us</a>
  </div>`;
}

/* ---------------- Cancel, return & refund ---------------- */
// one line under the buy buttons: what this item allows
function policyLine(p) {
  const P = S.meta.settings.policy;
  if (p.type === 'service') return 'Free cancellation until the team is assigned.';
  if (P.noReturnCats.includes(p.cat)) return 'Not returnable (food, fresh flowers or printed item) · free cancellation before dispatch.';
  return `${P.returnDays}-day return if damaged, wrong or unused · free cancellation before dispatch.`;
}
function viewPolicy() {
  const s = S.meta.settings, P = s.policy;
  const noRet = P.noReturnCats.map(id => (S.meta.categories.find(c => c.id === id) || {}).name).filter(Boolean);
  app().innerHTML = `<div class="panel policy" style="padding:24px;max-width:880px;margin:0 auto">
    <h1 style="margin-top:0">Cancellation, Return & Refund Policy</h1>
    <p class="muted">Simple rules for shop orders on ${h(s.siteName)}. Everything is done from <a class="link" href="#/track">Track Order</a> with your order number and mobile — no login needed.</p>
    <div class="pol-grid">
      <div class="pol-box"><b>Cancel</b><span>Free until dispatch / team assigned</span></div>
      <div class="pol-box"><b>Return</b><span>Within ${P.returnDays} days of delivery</span></div>
      <div class="pol-box"><b>Refund</b><span>Within ${P.refundDays} days after approval</span></div>
    </div>
    <h2>1. Cancelling an order</h2>
    <ul>
      <li><b>Saman (kits, kapde, gifts…):</b> cancel free from Track Order until the order is dispatched.</li>
      <li><b>Bookings (Pandit Ji, tent, band, halwai, photographer…):</b> cancel free until the team is assigned.</li>
      <li><b>After dispatch / team assigned:</b> tap <b>Request cancellation</b>. Our team calls you and decides with you. If the saman is already on the way or the team has already prepared (samagri bought, dates blocked for you), the delivery charge or part of the booking advance may be kept.</li>
      <li>A delivered order cannot be cancelled — eligible items can be returned instead.</li>
      <li>Vendor marketplace bookings (gaadi, orchestra, DJ…) are agreed with the vendor directly — see the booking for their terms.</li>
    </ul>
    <h2>2. Returning items</h2>
    <ul>
      <li>Return within <b>${P.returnDays} days of delivery</b> from Track Order → <b>Return items</b>. Choose the items, how many, and the reason.</li>
      <li>Items should be unused, in the original pack, with tags. Clothes must not be altered or stitched.</li>
      <li>For a damaged, wrong or poor-quality item, add a photo — it helps us approve quickly.</li>
      <li><b>Not returnable:</b> ${noRet.map(h).join(', ')} — food, fresh flowers and cards printed with your names — and every service booking. If something was wrong with these, call us and we will help.</li>
    </ul>
    <div class="pol-steps"><span>Return requested</span><span>Approved · pickup arranged</span><span>Picked up & checked</span><span>Refund sent</span></div>
    <h2>3. Refunds</h2>
    <ul>
      <li><b>Paid online (UPI / card / net banking via Razorpay):</b> refunded to the same account. Banks usually take 5–7 working days to show it.</li>
      <li><b>Paid by cash or UPI to us:</b> refunded by UPI to the UPI ID you give when cancelling or returning, within ${P.refundDays} days.</li>
      <li><b>Not paid yet (cash on delivery):</b> nothing to refund — returned items simply come off your bill.</li>
      <li>You can see every step and the refund reference on Track Order.</li>
    </ul>
    <h2>4. Need help?</h2>
    <p>Call <b>${h(s.phone)}</b> or <a class="link" target="_blank" rel="noopener" href="${waLink('Namaste, mujhe cancel / return / refund ke baare mein madad chahiye.')}">WhatsApp us</a> with your order number.</p>
  </div>`;
}
/* ---------------- Contact Us, Terms, Privacy, Shipping ----------------
   Business details come from Admin → Settings → Business details; anything not filled in is simply left out */
const biz = () => {
  const s = S.meta.settings, b = s.business || {};
  return { s, b, brand: s.siteName, name: b.legalName || s.siteName, email: s.email, gEmail: b.grievanceEmail || s.email };
};
const mailA = e => (e ? `<a class="link" href="mailto:${h(e)}">${h(e)}</a>` : '');
const telA = p => (p ? `<a class="link" href="tel:${h(p)}">${h(p)}</a>` : '');
function legalPage(title, intro, body) {
  const { b } = biz();
  app().innerHTML = `<div class="panel policy" style="padding:24px;max-width:880px;margin:0 auto">
    <h1 style="margin-top:0">${title}</h1>
    ${b.updated ? `<p class="small muted" style="margin-top:-6px">Last updated: ${fmtDate(b.updated)}</p>` : ''}
    <p class="muted">${intro}</p>${body}
    <p class="small muted" style="margin-top:22px">Also see: <a class="link" href="#/terms">Terms & Conditions</a> · <a class="link" href="#/privacy">Privacy Policy</a> · <a class="link" href="#/shipping">Shipping & Delivery</a> · <a class="link" href="#/policy">Cancellation, Return & Refund</a> · <a class="link" href="#/contact">Contact Us</a></p>
  </div>`;
}
// who runs the site, in one sentence
const runBy = () => { const { b, brand, name } = biz(); return `${h(brand)}${name !== brand ? ` is run by <b>${h(name)}</b>` : ''}${b.address ? `, ${h(b.address)}` : ''}`; };

function viewContact() {
  const { s, b, name, email, gEmail } = biz();
  const card = (t, v) => (v ? `<div class="pol-box"><b>${t}</b><span>${v}</span></div>` : '');
  legalPage('Contact Us', 'Questions about an order, a booking, a payment or a refund — we are happy to help. Keep your order or booking number ready.', `
    <div class="pol-grid">
      ${card('Call us', telA(s.phone))}
      ${card('WhatsApp', s.whatsapp ? `<a class="link" target="_blank" rel="noopener" href="${waLink('Namaste, mujhe madad chahiye.')}">Chat on WhatsApp</a>` : '')}
      ${card('Email', mailA(email))}
    </div>
    <h2>Business details</h2>
    <ul>
      <li><b>${h(name)}</b>${b.gstin ? ` · GSTIN ${h(b.gstin)}` : ''}</li>
      ${b.address ? `<li>Address: ${h(b.address)}</li>` : ''}
      ${b.hours ? `<li>Support hours: ${h(b.hours)}</li>` : ''}
      <li>We serve families in Bihar and Uttar Pradesh.</li>
    </ul>
    <h2>Order or booking help</h2>
    <ul>
      <li>See the status of any order with your order number and mobile at <a class="link" href="#/track">Track Order</a>. Cancel, return and refund requests are made there too.</li>
      <li>For a vendor booking (tent, DJ, gaadi, orchestra…), open the booking from the message we sent you or call us.</li>
    </ul>
    <h2>Complaints (grievance officer)</h2>
    <p>If your problem is not solved, write to our grievance officer${b.grievanceName ? `, <b>${h(b.grievanceName)}</b>` : ''}${gEmail ? `, at ${mailA(gEmail)}` : ''}. We reply as soon as possible and resolve complaints within one month.</p>`);
}

function viewTerms() {
  const { s, b, brand, name } = biz();
  legalPage('Terms & Conditions', `These terms apply when you use ${h(brand)} — the website, ordering saman, booking services and booking vendors. By placing an order or booking you agree to them.`, `
    <h2>1. Who we are</h2>
    <p>${runBy()}. We sell wedding saman (puja samagri, kits, kapde, gifts, mithai, phool…) and arrange wedding services (Pandit Ji, mehndi, photographer, tent, band, halwai…) in Bihar and Uttar Pradesh, and list independent local vendors you can book.</p>
    <h2>2. Using the site</h2>
    <ul>
      <li>Give your correct name, mobile number and address. We may confirm your mobile by OTP.</li>
      <li>You must be 18 or older, or order with a parent's or guardian's consent.</li>
      <li>Do not misuse the site — no fake orders, false reviews or attempts to break in.</li>
    </ul>
    <h2>3. Orders and bookings</h2>
    <ul>
      <li>An order is confirmed when our team calls you to confirm it. We may decline an order if an item is out of stock, the date is already booked, or the address is outside our service area — any money paid is then refunded in full.</li>
      <li>Prices are in Indian Rupees and include the charges shown at checkout. Delivery charges are explained on <a class="link" href="#/shipping">Shipping & Delivery</a>.</li>
      <li>Photos show the type of item. Handmade and natural items (flowers, mithai, kapde) can differ a little in colour or design.</li>
    </ul>
    <h2>4. Payment</h2>
    <ul>
      <li>You can pay online through Razorpay (UPI, cards, net banking, wallets) when it is offered, by UPI, or in cash on delivery / on the function day.</li>
      <li>Online payments are processed by Razorpay. We never see or store your card number, CVV or UPI PIN.</li>
      <li>Service bookings may need an advance of ${Number(s.advancePercent) || 0}% after our team confirms; the rest is paid as agreed on the call.</li>
    </ul>
    <h2>5. Vendor marketplace</h2>
    <ul>
      <li>Vendors listed on ${h(brand)} (tent house, DJ, gaadi, orchestra, decorators and others) are independent businesses. We check their identity papers before showing them as verified, but the service itself is agreed between you and the vendor.</li>
      <li>The vendor's price and terms are shown on your booking. A request becomes a booking only when the vendor confirms it.</li>
      <li>If you pay a vendor's advance online to ${h(brand)}, we hold it and pass it on to the vendor. If the vendor turns the booking down, or it is cancelled before we pass the money on, it is refunded to you.</li>
    </ul>
    <h2>6. Cancellation, returns and refunds</h2>
    <p>See our <a class="link" href="#/policy">Cancellation, Return & Refund Policy</a>.</p>
    <h2>7. Reviews and photos</h2>
    <p>Reviews must be honest and about your own experience. We may hide reviews that are abusive, fake or not about the item or vendor. Only upload photos you have the right to share.</p>
    <h2>8. Our responsibility</h2>
    <ul>
      <li>We do our best to deliver on time and as described. We are not responsible for delays caused by things outside our control, such as extreme weather, road closures, strikes or government orders — we will call you and help arrange another way.</li>
      <li>For any order, our total responsibility is limited to the amount you paid for that order.</li>
    </ul>
    <h2>9. Law and disputes</h2>
    <p>These terms follow the laws of India. Please contact us first — most problems are solved on a call. Any dispute is handled by the courts at ${b.city ? h(b.city) : 'the place where our business is registered'}.</p>
    <h2>10. Changes</h2>
    <p>We may update these terms. The date at the top shows the latest change; orders already placed follow the terms in force when they were placed.</p>
    <h2>11. Contact</h2>
    <p>${h(name)} · <a class="link" href="#/contact">Contact Us</a></p>`);
}

function viewPrivacy() {
  const { b, brand, name, gEmail } = biz();
  legalPage('Privacy Policy', `How ${h(brand)} collects, uses and protects your personal information.`, `
    <h2>1. Who we are</h2>
    <p>${runBy()}. We decide how your information is used for the purposes below.</p>
    <h2>2. What we collect</h2>
    <ul>
      <li><b>Contact details:</b> name, mobile number, and email if you give it.</li>
      <li><b>Delivery and function details:</b> address, district, function dates and the events you plan (Tilak, Haldi, Shaadi…), and whose wedding it is, if you tell us.</li>
      <li><b>Orders and bookings:</b> what you ordered or booked, its status, payments received and refunds.</li>
      <li><b>Payments:</b> Razorpay processes online payments. We receive the payment ID, amount and method (e.g. UPI or card) — never your card number, CVV or UPI PIN.</li>
      <li><b>Vendors:</b> business details, photos, and identity / business papers for verification.</li>
      <li><b>Site use:</b> we count visits, product views and checkouts in total to improve the site. We do not use advertising trackers.</li>
    </ul>
    <h2>3. Why we use it</h2>
    <ul>
      <li>To deliver your saman, confirm bookings and call or WhatsApp you about them.</li>
      <li>To send OTPs that confirm your mobile number.</li>
      <li>To take payments, send refunds and prevent fraud.</li>
      <li>To keep the accounting and tax records the law requires.</li>
    </ul>
    <h2>4. Who we share it with</h2>
    <ul>
      <li>The vendor or our local team doing your order or booking — your name, mobile, address and date, only as needed for the job.</li>
      <li>Razorpay, for online payments and refunds.</li>
      <li>Our SMS provider, to send OTPs to your mobile.</li>
      <li>Companies that host our website and database for us, under our instructions.</li>
      <li>Government authorities, when the law requires it.</li>
    </ul>
    <p><b>We do not sell your personal information.</b></p>
    <h2>5. How we protect it</h2>
    <p>Your information is kept on secured servers. Passwords are stored in scrambled (hashed) form, payment pages use encrypted connections, and only our team can see orders. Vendor identity papers are seen only by our admin team for verification.</p>
    <h2>6. How long we keep it</h2>
    <p>We keep order and booking details while you use ${h(brand)} and for as long as tax and accounting laws require. After that they are deleted or made anonymous.</p>
    <h2>7. Your choices</h2>
    <ul>
      <li>See and change your saved addresses and wedding details in My Account.</li>
      <li>Ask us to correct or delete your information, or to stop messages, by writing to ${gEmail ? mailA(gEmail) : 'us'}. We keep only what the law requires us to keep.</li>
    </ul>
    <h2>8. Browser storage</h2>
    <p>Your cart, chosen district, language and login are saved in your own browser's storage so the site remembers them. Maps are loaded from OpenStreetMap or Google Maps, which see your internet address when the map loads. We do not use advertising cookies.</p>
    <h2>9. Children</h2>
    <p>${h(brand)} is meant for adults planning a wedding. We do not knowingly collect information from children.</p>
    <h2>10. Grievance officer</h2>
    <p>For any concern about your information, contact our grievance officer${b.grievanceName ? `, <b>${h(b.grievanceName)}</b>` : ''}${gEmail ? `, at ${mailA(gEmail)}` : ''} (${h(name)}). Complaints are resolved within one month.</p>
    <h2>11. Changes</h2>
    <p>We may update this policy. The date at the top shows the latest change.</p>`);
}

function viewShipping() {
  const { s, b, brand } = biz(), P = s.policy || {};
  const ds = S.meta.districts || [], n = st => ds.filter(d => d.state === st).length;
  const extra = ds.some(d => d.extraCharge > 0);
  const charge = Number(s.deliveryCharge) ? `${inr(s.deliveryCharge)} per order${Number(s.freeDeliveryAbove) ? `, <strong>free on orders above ${inr(s.freeDeliveryAbove)}</strong>` : ''}` : '<strong>Free delivery</strong>';
  legalPage('Shipping & Delivery Policy', `How and when ${h(brand)} delivers saman and sends teams for your functions.`, `
    <div class="pol-grid">
      <div class="pol-box"><b>Where</b><span>${n('Bihar')} districts of Bihar · ${n('Uttar Pradesh')} of Uttar Pradesh</span></div>
      <div class="pol-box"><b>Charge</b><span>${charge}</span></div>
      <div class="pol-box"><b>Track</b><span>Order number + mobile at Track Order</span></div>
    </div>
    <h2>1. Where we deliver</h2>
    <ul>
      <li>We deliver only to the districts of Bihar and Uttar Pradesh you can choose at checkout. We do not ship to other states or outside India.</li>
      <li>Delivery is done by our own local team or local delivery partners in your district.</li>
    </ul>
    <h2>2. Delivery charges</h2>
    <ul>
      <li>Saman: ${charge}.</li>
      ${extra ? '<li>Some far districts have a small extra charge. It is shown at checkout before you place the order.</li>' : ''}
      <li>Service bookings (Pandit Ji, tent, band, halwai…) have no separate delivery charge — travel is included in the price shown, unless the team tells you otherwise on the confirmation call.</li>
    </ul>
    <h2>3. When it arrives</h2>
    <ul>
      <li>${b.deliveryTime ? h(b.deliveryTime) : 'After you place an order, our team calls to confirm it and fixes the delivery day with you. Saman is delivered before your function date.'}</li>
      <li>For services, the team or vendor comes to your venue on the booked date and time. Tent houses and decorators may visit before the function to measure the place.</li>
      <li>Lagan (wedding season) dates fill up fast — please order early.</li>
    </ul>
    <h2>4. Tracking your order</h2>
    <p>Follow every step — confirmed, dispatched / team assigned, delivered — at <a class="link" href="#/track">Track Order</a> with your order number and mobile. We also call or WhatsApp you before delivery.</p>
    <h2>5. At delivery</h2>
    <ul>
      <li>Please check the saman when it arrives. If something is damaged, wrong or missing, tell us within ${P.returnDays || 7} days from Track Order → Return items, with a photo if possible.</li>
      <li>If we cannot reach you or the address cannot be found, we will call to fix another time. A second delivery to a wrong address may be charged.</li>
    </ul>
    <h2>6. Vendor bookings</h2>
    <p>For vendors booked through the marketplace (gaadi, DJ, orchestra…), the vendor comes to you as agreed in the booking.</p>
    <p>Cancellations and refunds are explained in the <a class="link" href="#/policy">Cancellation, Return & Refund Policy</a>.</p>`);
}

/* ---------------- Bill / receipt (print or save as PDF) ----------------
   Opened from Track Order / My Orders / the order page; needs the order number + the mobile used (kept on this phone,
   else asked) — the mobile never goes into the address bar. Not a GST tax invoice. */
const PAY_VIA = { checkout: 'Online (Razorpay)', webhook: 'Online (Razorpay)', reconcile: 'Online (Razorpay)', upi: 'UPI' };
async function viewBill(number) {
  number = String(number || '').toUpperCase().replace(/^#/, '');
  const known = S.myOrders.find(x => x.number === number) || (S.lastOrder && S.lastOrder.number === number ? { phone: S.lastOrder.address.phone } : null);
  const ask = (err = '') => {
    app().innerHTML = `<div class="panel" style="padding:24px;max-width:420px;margin:0 auto"><h1 style="margin-top:0">🧾 Bill for #${h(number)}</h1>
      <p class="muted">Enter the mobile number used in this order.</p>${err ? `<div class="err">${h(err)}</div>` : ''}
      <form id="billForm"><div class="field"><label>Mobile number</label><input name="phone" required inputmode="numeric" maxlength="10" pattern="[0-9]{10}"></div>
      <button class="btn btn-primary btn-block">Show bill</button></form></div>`;
    $('#billForm').addEventListener('submit', e => { e.preventDefault(); show(e.target.phone.value.trim()); });
  };
  const show = async phone => {
    spinner();
    let o;
    try { o = (await api(`/api/track?number=${encodeURIComponent(number)}&phone=${encodeURIComponent(phone)}`)).order; } catch (e) { return ask(e.message); }
    if (!S.myOrders.some(x => x.number === o.number)) { S.myOrders.unshift({ number: o.number, phone }); store.set('myorders', S.myOrders); }
    app().innerHTML = billHtml(o);
    $('#billPrint').addEventListener('click', () => window.print());
  };
  if (known) show(known.phone); else ask();
}
// GST tax invoice / credit note, as frozen by the server when it was issued (seller, buyer, rates and numbers never change)
const n2 = v => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function taxDoc(inv, cn) {
  const d = cn || inv, sel = inv.seller, buy = inv.buyer, inter = inv.inter;
  return `<div class="panel bill tax-doc">
    <div class="bill-head">
      <div class="bill-from"><img src="/img/logo-mark.svg" alt="" width="44" height="44"><div><b class="bill-brand">${h(sel.brand || sel.name)}</b>${sel.brand && sel.brand !== sel.name ? `<div>${h(sel.name)}</div>` : ''}
        <div class="small">${h(sel.address)}</div><div class="small">GSTIN: <b>${h(sel.gstin)}</b> · State: ${h(sel.state)} (${h(sel.stateCode)})</div>
        <div class="small">${[sel.phone && 'Ph: ' + h(sel.phone), sel.email && h(sel.email)].filter(Boolean).join(' · ')}</div></div></div>
      <div class="bill-meta"><h2>${cn ? 'Credit Note' : 'Tax Invoice'}</h2><div>${cn ? 'Credit note' : 'Invoice'} No. <b>${h(d.number)}</b></div><div>Date: ${fmtDate(d.date)}</div>
        ${cn ? `<div>Against invoice <b>${h(inv.number)}</b> of ${fmtDate(inv.date)}</div><div>Reason: ${h(cn.reason)}</div>` : `<div>Order No. #${h(inv.orderNumber)}</div>`}
        <div>Place of supply: ${h(inv.placeOfSupply)}</div><div class="small">Tax payable on reverse charge: ${h(inv.reverseCharge || 'No')}</div></div>
    </div>
    <div class="bill-to"><span class="small muted">Bill to${buy.gstin ? ' (registered business)' : ''}</span><b>${h(buy.name)}</b>${buy.gstin ? `<div class="small">GSTIN: <b>${h(buy.gstin)}</b></div>` : ''}
      <div class="small">${h(buy.address)}${buy.pincode ? ' – ' + h(buy.pincode) : ''}</div><div class="small">State: ${h(buy.state)} (${h(buy.stateCode)}) · ${h(buy.phone)}</div></div>
    <div class="tbl-wrap"><table class="bill-tbl tax-tbl"><thead><tr><th>#</th><th>Description</th><th>HSN/SAC</th><th class="num">Qty</th><th class="num">Taxable value</th><th class="num">GST</th>${inter ? '<th class="num">IGST</th>' : '<th class="num">CGST</th><th class="num">SGST</th>'}<th class="num">Total</th></tr></thead><tbody>
      ${d.lines.map((l, k) => `<tr><td>${k + 1}</td><td><b>${h(l.name)}</b><div class="small muted">₹${n2(l.price)}${l.line >= 0 ? ` per ${h(l.unit || 'item')}` : ''} incl. GST</div></td><td>${h(l.hsn || '—')}</td><td class="num">${l.qty}${l.unit ? ' ' + h(l.unit) : ''}</td>
        <td class="num">${n2(l.taxable)}</td><td class="num">${l.rate}%</td>${inter ? `<td class="num">${n2(l.igst)}</td>` : `<td class="num">${n2(l.cgst)}<div class="small muted">${l.rate / 2}%</div></td><td class="num">${n2(l.sgst)}<div class="small muted">${l.rate / 2}%</div></td>`}<td class="num">${n2(l.amount)}</td></tr>`).join('')}
    </tbody><tfoot><tr class="bill-total"><td colspan="4"><b>Total</b></td><td class="num"><b>${n2(d.totals.taxable)}</b></td><td></td>${inter ? `<td class="num"><b>${n2(d.totals.igst)}</b></td>` : `<td class="num"><b>${n2(d.totals.cgst)}</b></td><td class="num"><b>${n2(d.totals.sgst)}</b></td>`}<td class="num"><b>₹${n2(d.totals.amount)}</b></td></tr></tfoot></table></div>
    <p style="margin:10px 0 0"><span class="small muted">Amount in words:</span> <b>${h(d.words)}</b></p>
    <div class="tax-sign"><p class="small muted" style="margin:0">${cn ? `This credit note reduces tax invoice ${h(inv.number)}.` : 'Prices include GST. Certified that the particulars given above are true and correct.'} Computer-generated document — no signature needed.</p>
      <div class="tax-for">For <b>${h(sel.name)}</b><br><span class="small muted">Authorised signatory</span></div></div>
  </div>`;
}
function billHtml(o) {
  const { s, b, name } = biz(), a = o.address, inv = o.invoice;
  const pays = (o.payments || []).map(p => ({ at: p.at, label: `${PAY_VIA[p.via] || 'Payment'}${p.method ? ' · ' + String(p.method).toUpperCase() : ''}`, ref: p.id, amount: p.amount }));
  // money the team recorded by hand (cash at delivery…) has no payment line of its own
  const other = (o.paid || 0) - pays.reduce((t, p) => t + p.amount, 0);
  if (other > 0) pays.push({ at: '', label: 'Received (cash / in person)', ref: '', amount: other });
  const refunds = (o.refunds || []).filter(r => r.status !== 'failed'), back = refunds.reduce((t, r) => t + r.amount, 0);
  const ret = o.returnedValue || 0, cancelled = o.status === 'cancelled';
  const payable = cancelled ? 0 : o.total - ret, due = cancelled ? 0 : Math.max(0, payable - (o.paid || 0) + back);
  const owed = o.refundOwed || 0; // paid more than is now payable (cancelled, returned, or a refund the bank sent back)
  const row = (l, v, cls = '') => `<tr class="${cls}"><td colspan="4">${l}</td><td class="num">${v}</td></tr>`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${s.siteName} — ${inv ? `tax invoice ${inv.number}, order` : 'bill for order'} #${o.number}\nTotal: ${inr(o.total)}\nPaid: ${inr((o.paid || 0) - back)}${due ? `\nBalance: ${inr(due)}` : ''}${owed ? `\nRefund due: ${inr(owed)}` : ''}\n${location.origin}/#/bill/${o.number}`)}`;
  return `<div class="bill-wrap">
    <div class="cta-row no-print" style="margin-bottom:12px"><button type="button" class="btn btn-primary" id="billPrint">🖨️ Print / Save as PDF</button>
      <a class="btn btn-wa" target="_blank" rel="noopener" href="${h(wa)}">💬 Share on WhatsApp</a><a class="btn btn-light" href="#/track?number=${h(o.number)}">← Track Order</a></div>
    ${inv ? taxDoc(inv) + (o.creditNotes || []).map(c => taxDoc(inv, c)).join('') : ''}
    <div class="panel bill">
      <div class="bill-head">
        <div class="bill-from"><img src="/img/logo-mark.svg" alt="" width="44" height="44"><div><b class="bill-brand">${h(s.siteName)}</b>
          ${name !== s.siteName ? `<div>${h(name)}</div>` : ''}${b.address ? `<div class="small">${h(b.address)}</div>` : ''}
          <div class="small">${[s.phone && 'Ph: ' + h(s.phone), s.email && h(s.email)].filter(Boolean).join(' · ')}</div>${b.gstin ? `<div class="small">GSTIN: ${h(b.gstin)}</div>` : ''}</div></div>
        <div class="bill-meta"><h2>${inv ? 'Payment Receipt' : 'Order Receipt'}</h2><div>No. <b>#${h(o.number)}</b></div><div>Date: ${fmtDate(o.createdAt)}</div>
          <div>Status: <b>${h(STATUS_LABEL[o.status] || o.status)}</b></div></div>
      </div>
      <div class="bill-to"><span class="small muted">Bill to</span><b>${h(a.name)}</b><div class="small">${h(a.phone)}</div>
        <div class="small">${[a.line1, a.line2, a.landmark, a.city, a.districtName, a.state].filter(Boolean).map(h).join(', ')}${a.pincode ? ' – ' + h(a.pincode) : ''}</div>
        ${o.side === 'boy' || o.side === 'girl' ? `<div class="small">${o.side === 'boy' ? 'Bete ki shaadi' : 'Beti ki shaadi'}</div>` : ''}</div>
      <div class="tbl-wrap"><table class="bill-tbl"><thead><tr><th>#</th><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>
        ${o.items.map((i, k) => `<tr><td>${k + 1}</td><td><b>${h(i.name)}</b>${i.style ? ` <span class="small muted">· ${h(i.style)}</span>` : ''}${i.catOff ? ` <span class="small ok-txt">· ${i.catOff}% offer applied</span>` : ''}${i.eventDate || (i.dates || []).length ? `<div class="small muted">${h(datesText(i))}</div>` : ''}</td><td class="num">${i.qty} ${h(i.unit || '')}</td><td class="num">${inr(i.price)}</td><td class="num">${inr(i.price * i.qty)}</td></tr>`).join('')}
      </tbody><tfoot>
        ${row('Subtotal', inr(o.subtotal != null ? o.subtotal : o.total - (o.delivery || 0)))}
        ${row('Delivery', o.delivery ? inr(o.delivery) : 'Free')}
        ${row('<b>Order total</b>', `<b>${inr(o.total)}</b>`, 'bill-total')}
        ${o.discount > 0 ? row('<span class="ok-txt">You saved</span>', `<span class="ok-txt">${inr(o.discount)}</span>`) : ''}
        ${ret ? row('Items returned', '− ' + inr(ret)) : ''}
        ${cancelled ? row('Order cancelled — the order total is not charged', '') : ''}
        ${pays.map(p => row(`Paid${p.at ? ' ' + fmtDate(p.at) : ''} · ${h(p.label)}${p.ref ? ` <span class="small muted">${h(p.ref)}</span>` : ''}`, '− ' + inr(p.amount))).join('')}
        ${refunds.map(r => row(`Refunded${r.at ? ' ' + fmtDate(r.at) : ''}${r.status === 'pending' ? ' (on the way)' : ''} <span class="small muted">${h(r.id || '')}</span>`, '+ ' + inr(r.amount))).join('')}
        ${owed ? row('<b>Refund due to you</b>', `<b>${inr(owed)}</b>`, 'bill-due')
          : row(`<b>${due ? 'Balance to pay' : cancelled ? 'Nothing to pay' : 'Fully paid'}</b>`, `<b>${inr(due)}</b>`, 'bill-due')}
      </tfoot></table></div>
      <p class="small muted" style="margin:14px 0 0">Prices include all charges shown at checkout. ${inv ? `GST details are on tax invoice ${h(inv.number)}${(o.creditNotes || []).length ? ' and its credit notes' : ''} above.` : b.gstin && !cancelled ? 'Your GST tax invoice is issued when the order is delivered — it will appear on this page.' : 'This is an order receipt, not a GST tax invoice.'} Cancellation, return & refund policy: ${h(location.origin)}/#/policy · Questions: ${h(s.phone || '')}${s.email ? ' · ' + h(s.email) : ''}</p>
      <p style="margin:10px 0 0;text-align:center"><b>Dhanyavaad! 🙏</b> <span class="small muted">Shubh vivah — ${h(s.siteName)}</span></p>
    </div></div>`;
}

// what is left of the payment, and where a refund goes
const paidLeft = o => Math.max(0, (o.paid || 0) - (o.refunds || []).reduce((a, r) => a + r.amount, 0));
const refundWhere = o => (o.rzpPaymentId ? 'to the same bank / UPI account (5–7 working days)' : o.refundTo ? `by UPI to ${h(o.refundTo)}` : 'by UPI — our team will ask for your UPI ID');
const upiField = o => `<div class="field"><label>UPI ID for your refund</label><input name="upi" placeholder="e.g. 98xxxxxx@ybl" value="${h(o.refundTo || '')}" autocomplete="off"><div class="small muted">Refund is sent here within ${S.meta.settings.policy.refundDays} days.</div></div>`;
const reasonList = (list, name) => `<div class="reason-list">${list.map(r => `<label><input type="radio" name="${name}" value="${h(r)}" required> ${h(r)}</label>`).join('')}</div>`;
async function trackedOrder(number, phone) {
  try { return (await api(`/api/track?number=${encodeURIComponent(number)}&phone=${encodeURIComponent(phone)}`)).order; } catch (e) { toast(e.message, true); return null; }
}
async function openCancel(number, phone) {
  const o = await trackedOrder(number, phone);
  if (!o) return;
  const P = S.meta.settings.policy, free = ['placed', 'confirmed'].includes(o.status), left = paidLeft(o);
  const m = modal(`<form class="m-pad" id="cxForm"><h3 style="margin:0">${free ? 'Cancel order' : 'Request cancellation'} #${h(o.number)}</h3>
    <div class="o-next${free ? '' : ' amber'}" style="margin:10px 0 14px">${free ? 'Free cancellation — nothing is charged.' : 'Your order is already dispatched / the team is assigned. Our team will call you and confirm the cancellation.'}</div>
    <div class="field"><label>Why do you want to cancel?</label>${reasonList(P.cancelReasons, 'reason')}</div>
    <div class="field"><label>Anything else (optional)</label><textarea name="note" rows="2" maxlength="300"></textarea></div>
    ${left ? (o.rzpPaymentId ? `<p class="small" style="margin:0 0 12px">You paid ${inr(left)} online — the refund goes back ${refundWhere(o)}.</p>` : `<p class="small" style="margin:0 0 6px">You paid ${inr(left)}.</p>${upiField(o)}`) : ''}
    <div style="display:flex;gap:10px"><button type="button" class="btn btn-light" style="flex:1" id="cxKeep">Keep order</button><button class="btn btn-primary" style="flex:1">${free ? 'Cancel order' : 'Send request'}</button></div>
    <p class="small muted" style="margin:10px 0 0;text-align:center"><a class="link" href="#/policy">Cancellation & refund policy</a></p></form>`, 'sm');
  $('#cxKeep', m).addEventListener('click', closeModal);
  $('#cxForm', m).addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('button:not([type])', e.target); btn.disabled = true;
    try {
      await api('/api/track/cancel', { method: 'POST', body: { number: o.number, phone, ...Object.fromEntries(new FormData(e.target)) } });
      closeModal(); toast(free ? 'Order cancelled' : 'Cancellation request sent — our team will call you'); route();
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  });
}
async function openReturn(number, phone) {
  const o = await trackedOrder(number, phone);
  if (!o) return;
  const P = S.meta.settings.policy, lines = o.returnLines || [], ok = lines.filter(l => !l.why && l.qty > 0), left = paidLeft(o);
  const until = (lines[0] || {}).until;
  let pics = [];
  const m = modal(`<form class="m-pad" id="rtForm"><h3 style="margin:0">Return items · #${h(o.number)}</h3>
    <p class="small muted" style="margin:2px 0 12px">Return window open until <b>${fmtDate(until)}</b> · items unused, in the original pack.</p>
    <div class="field"><label>Which items?</label><div class="ret-lines">${lines.map(l => l.why || l.qty <= 0
      ? `<div class="ret-line off"><span>${h(l.name)}</span><small>${h(l.why || 'Already returned')}</small></div>`
      : `<label class="ret-line"><input type="checkbox" data-rl="${l.line}"><span>${h(l.name)}<small>${inr(l.price)} each</small></span>
          <select data-rq="${l.line}">${Array.from({ length: l.qty }, (_, i) => `<option value="${i + 1}" ${i + 1 === l.qty ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>`).join('')}</div></div>
    <div class="field"><label>Reason</label><select name="reason" required><option value="">Choose a reason</option>${P.returnReasons.map(r => `<option>${h(r)}</option>`).join('')}</select></div>
    ${window.DOCUP ? `<div class="field"><label>Photos of the item — up to 4 <span class="muted small" id="rtPicHint">(optional)</span></label><input type="file" id="rtPic" accept="image/*" multiple><div id="rtPrev" class="thumbs"></div><div class="small muted">Show the damage, the wrong item or the pack label clearly.</div></div>` : ''}
    <div class="field"><label>Anything else (optional)</label><textarea name="note" rows="2" maxlength="500" placeholder="e.g. 2 diyas broken in the kit"></textarea></div>
    ${left ? (o.rzpPaymentId ? `<p class="small" style="margin:0 0 12px">Refund goes back ${refundWhere(o)} after pickup.</p>` : upiField(o)) : '<p class="small" style="margin:0 0 12px">Not paid yet — returned items simply come off your bill.</p>'}
    <div class="ret-total small">Return value: <b id="rtVal">${inr(0)}</b></div>
    <button class="btn btn-primary btn-block" ${ok.length ? '' : 'disabled'}>Send return request</button>
    <p class="small muted" style="margin:10px 0 0;text-align:center"><a class="link" href="#/policy">Return & refund policy</a></p></form>`, 'sm');
  const f = $('#rtForm', m);
  const picked = () => $$('[data-rl]', m).filter(c => c.checked).map(c => ({ line: Number(c.dataset.rl), qty: Number($(`[data-rq="${c.dataset.rl}"]`, m).value) }));
  const sum = () => { $('#rtVal', m).textContent = inr(picked().reduce((a, x) => a + lines[x.line].price * x.qty, 0)); };
  f.addEventListener('change', e => {
    if (e.target.dataset.rq) { const c = $(`[data-rl="${e.target.dataset.rq}"]`, m); c.checked = true; }
    if (e.target.name === 'reason' && $('#rtPicHint', m)) $('#rtPicHint', m).textContent = P.photoReasons.includes(e.target.value) ? '(needed for this reason)' : '(optional)';
    sum();
  });
  const picIn = $('#rtPic', m);
  if (picIn) picIn.addEventListener('change', async () => {
    const files = [...picIn.files].slice(0, 4);
    if (picIn.files.length > 4) toast('Only the first 4 photos are used');
    try { pics = await Promise.all(files.map(f2 => window.DOCUP.photoDataUrl(f2))); } catch (err) { pics = []; toast(err.message, true); }
    $('#rtPrev', m).innerHTML = pics.map(p => `<img src="${p}" alt="">`).join('');
  });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const want = picked();
    if (!want.length) return toast('Tick the items you want to return', true);
    const btn = $('button.btn-primary', f); btn.disabled = true;
    try {
      await api('/api/track/return', { method: 'POST', body: { number: o.number, phone, lines: want, ...Object.fromEntries(new FormData(f)), photos: pics } });
      closeModal(); toast('Return request sent — we will arrange the pickup'); route();
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  });
}
// Cancel / Request cancellation / Return items — whatever this order allows now
function orderActions(o) {
  const at = `data-number="${h(o.number)}" data-phone="${h(o.address.phone)}"`, out = [];
  if (['placed', 'confirmed'].includes(o.status)) out.push(`<button class="btn btn-light btn-sm" data-ocancel ${at}>Cancel order</button>`);
  if (o.status === 'dispatched' && !(o.cancelRequest && ['requested', 'rejected'].includes(o.cancelRequest.status))) out.push(`<button class="btn btn-light btn-sm" data-ocancel ${at}>Request cancellation</button>`);
  if ((o.returnLines || []).some(l => !l.why && l.qty > 0)) out.push(`<button class="btn btn-light btn-sm" data-oreturn ${at}>Return items</button>`);
  return out.join('');
}
const thumbs = list => (list || []).length ? `<div class="thumbs">${list.map(u => `<a href="${h(u)}" target="_blank" rel="noopener"><img src="${h(u)}" alt="" loading="lazy"></a>`).join('')}</div>` : '';
// what was counted at the door, shown to the customer
function deliveryCheckHtml(o) {
  const c = o.deliveryCheck;
  if (!c) return '';
  const total = c.lines.reduce((a, l) => a + l.qty, 0), good = c.lines.reduce((a, l) => a + l.received, 0);
  return `<details class="o-upd dchk"><summary>Checked at delivery · ${good} of ${total} pieces OK</summary>
    <p class="small muted" style="margin:6px 0">${fmtWhen(c.at)} · checked by ${h(c.checkedBy)} · received by ${h(c.receivedBy)}</p>
    ${c.lines.map(l => `<div><span>${h(l.name)}</span><b>${l.received} / ${l.qty} OK</b>${l.damaged ? ` · <b class="bad">${l.damaged} damaged</b>` : ''}${l.short ? ` · <b class="bad">${l.short} short</b>` : ''}${l.note ? ` — ${h(l.note)}` : ''}</div>`).join('')}
    ${c.note ? `<p class="small" style="margin:6px 0 0">${h(c.note)}</p>` : ''}${thumbs(c.photos)}</details>`;
}
const RET_STEPS = [['requested', 'Requested'], ['approved', 'Pickup arranged'], ['picked', 'Picked up'], ['done', 'Refund sent']];
// cancel request, returns and refunds under the tracking steps
function aftercareHtml(o) {
  const out = [], cr = o.cancelRequest;
  if (cr && cr.status === 'requested') out.push(`<div class="o-next amber"><b>Cancellation requested</b> on ${fmtWhen(cr.at)} (${h(cr.reason)}). Our team will call you.</div>`);
  if (cr && cr.status === 'rejected') out.push(`<div class="o-next amber"><b>Cancellation not possible</b> — ${h(cr.reply)}</div>`);
  for (const r of o.returns || []) {
    const i = RET_STEPS.findIndex(s => s[0] === r.status), at = st => (r.history.find(x => x.status === st) || {}).at;
    if (r.kind === 'delivery') {
      out.push(`<div class="ret-card"><div class="ret-h"><b>Not kept at delivery</b><span>${r.items.map(x => `${h(x.name)} × ${x.qty}`).join(', ')} · ${inr(r.value)}</span></div>
        <p class="small" style="margin:4px 0 0">${h(r.note)} — ${r.status === 'done' ? (r.settled === 'refund' ? 'refunded.' : 'taken off your bill.') : 'refund on the way.'}</p></div>`);
      continue;
    }
    out.push(`<div class="ret-card"><div class="ret-h"><b>Return ${h(r.id)}</b><span>${r.items.map(x => `${h(x.name)} × ${x.qty}`).join(', ')} · ${inr(r.value)} · ${h(r.reason)}</span></div>${thumbs(r.photos || (r.photo ? [r.photo] : []))}
      ${r.status === 'rejected' ? `<div class="o-next red" style="margin:6px 0 0">Return not accepted — ${h((r.history.find(x => x.status === 'rejected') || {}).note || '')}</div>`
        : `<div class="ret-steps">${RET_STEPS.map(([s, n], k) => `<span class="${k <= i ? 'done' : ''}">${k <= i ? '✓ ' : ''}${s === 'done' && r.settled === 'bill' ? 'Taken off the bill' : n}${at(s) ? `<small>${fmtWhen(at(s))}</small>` : ''}</span>`).join('')}</div>`}</div>`);
  }
  if (o.refundOwed > 0) out.push(`<div class="o-next amber"><b>Refund of ${inr(o.refundOwed)} on the way</b> — sent ${refundWhere(o)} within ${S.meta.settings.policy.refundDays} days.</div>`);
  for (const r of o.refunds || []) out.push(`<div class="o-next"><b>Refunded ${inr(r.amount)}</b> on ${fmtWhen(r.at)}${r.via && r.via !== 'razorpay' ? ` by ${r.via === 'upi' ? 'UPI' : r.via}` : ' online'}${r.id && r.id !== 'cash' ? ` · ref ${h(r.id)}` : ''}</div>`);
  const ok = (o.returnLines || []).filter(l => !l.why && l.qty > 0);
  if (ok.length && o.status !== 'cancelled') out.push(`<p class="small muted" style="margin:0 16px 10px">Return available until <b>${fmtDate(ok[0].until)}</b> for ${ok.length} item${ok.length > 1 ? 's' : ''}.</p>`);
  return out.join('');
}

/* ---------------- Router ---------------- */
/* Left category column (computer screens): services to book first, then saman to buy.
   Phones keep the swipeable icon row (#catbar). */
const BOOK_CATS = ['pandit-ji', 'car-transport', 'tent', 'band-dj', 'catering', 'decoration', 'photo-video', 'mehndi-haldi'];
// browse pages get the column; product, vendor, cart and checkout pages use the full width
const SIDE_PAGES = ['', 'c', 'search', 'vendors', 'arkestra', 'cars', 'events', 'e', 'lagan', 'help', 'cards', 'ration', 'tent'];
// sections that have their own all-shops item page (every vendor's items with photo, details and price)
const SHOP_PAGE = { cards: '#/cards' };
// menu names that read well on the portal (left column and top icon row; the category keeps its own name elsewhere)
const NICE = { catering: 'Catering & Halwai', mithai: 'Sweets & Mithai', 'pandit-ji': 'Pandit Ji', 'puja-samagri': 'Puja Samagri', decoration: 'Flowers & Decoration', 'mehndi-haldi': 'Mehndi & Haldi',
  'band-dj': 'Band & DJ', 'photo-video': 'Photography & Video', 'car-transport': 'Bus, Baggi & Ghodi', tent: 'Tent & Shamiyana', 'wedding-wear': 'Bridal & Groom Wear', gifts: 'Gifts & Shagun', cards: 'Wedding Cards' };
function drawSideCats() {
  const cats = S.meta.categories;
  const link = (cat, href, ic, name, cls = '') => `<a class="sc-link ${cls}" data-cat="${h(cat)}" href="${href}"><span class="sc-ic">${ic}</span><span class="sc-n">${h(name)}</span></a>`;
  const catIc = c => `<span style="background:${h(c.color)}">${h(c.emoji)}</span>${c.image ? `<img src="${h(c.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''}`;
  // one section per kind of need, so a family finds things the way they think: khana, puja, programs, gaadi-tent, shopping
  // ['c', categoryId] = a shop category · ['x', id, href, emoji, name, gradient] = a booking page
  const GROUPS = [
    ['Food & Catering', [['c', 'catering'], ['c', 'mithai'], ['x', 'ration', '#/ration', '🏪', 'Grocery & Ration', 'sc-g3'], ['x', 'sabzi', '#/vendors?type=vegetable', '🥬', 'Fresh Vegetables', 'sc-g3']]],
    ['Puja & Rituals', [['c', 'pandit-ji'], ['c', 'puja-samagri'], ['c', 'decoration'], ['c', 'mehndi-haldi']]],
    ['Entertainment & Media', [['x', 'arkestra', '#/arkestra', '🎤', 'Orchestra & Artists', 'sc-g2'], ['c', 'band-dj'], ['c', 'photo-video']]],
    // one tent entry: its page has the ready packages, the item-by-item builder and site visits
    ['Transport & Tent', [['x', 'cars', '#/cars', '🚗', 'Car Rental', 'sc-g3'], ['c', 'car-transport'], ['c', 'tent']]],
    ['Wedding Shopping', [['c', 'wedding-wear'], ['c', 'gifts'], ['c', 'cards']]],
  ];
  const used = new Set(GROUPS.flatMap(([, l]) => l.filter(x => x[0] === 'c').map(x => x[1])));
  GROUPS[GROUPS.length - 1][1].push(...cats.filter(c => !used.has(c.id)).map(c => ['c', c.id])); // new admin categories land in Shopping
  const item = x => {
    if (x[0] === 'x') return link(x[1], x[2], `<span class="${x[5]}">${x[3]}</span>`, x[4]);
    const c = cats.find(y => y.id === x[1]);
    return c ? link(c.id, SHOP_PAGE[c.id] || `#/c/${c.id}`, catIc(c), NICE[c.id] || c.name) : '';
  };
  $('#sidecat').innerHTML = `<div class="sc-sec">${link('vendors', '#/vendors', '<span class="sc-g1">🤝</span>', 'All Vendors', 'sc-top')}</div>
    ${GROUPS.map(([title, list]) => { const inner = list.map(item).join(''); return inner ? `<div class="sc-sec"><div class="sc-h">${title}</div>${inner}</div>` : ''; }).join('')}
    <a class="sc-join" href="#/vendor-join"><span class="sc-join-t"><small>🏪 Vendor, artist or car owner?</small><b>List your business free</b></span><span class="sc-join-go">→</span></a>`;
}

async function route() {
  closeModal();
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  const q = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] !== 'e' && parts[0] !== 'p') S.presetEvent = null;
  document.body.classList.toggle('with-side', SIDE_PAGES.includes(parts[0] || ''));
  // product lists have their own filter column: the category column joins only on wide screens
  document.body.classList.toggle('side-wide', false); // product lists no longer have a filter column, so the category column fits from 1100px
  $$('.cat-pill, .sc-link').forEach(a => a.classList.toggle('active', (parts[0] === 'c' && a.dataset.cat === parts[1]) || (!!parts[0] && a.dataset.cat === parts[0]) || (a.dataset.cat === 'vendors' && ['vendors', 'v', 'vb', 'vtrack', 'vendor-join'].includes(parts[0])) || (a.dataset.cat === 'arkestra' && parts[0] === 'arkestra') || (a.dataset.cat === 'cars' && ['cars', 'list-car'].includes(parts[0])) || (a.dataset.cat === 'tent' && parts[0] === 'tent')));
  $('#searchInput').value = parts[0] === 'search' ? (q.get('q') || '') : '';
  $('#acct').classList.remove('open');
  window.scrollTo(0, 0);
  try {
    if (!parts.length) viewHome();
    else if (parts[0] === 'c' && SHOP_PAGE[parts[1]]) { location.hash = SHOP_PAGE[parts[1]]; return; } // e.g. Shaadi Cards → every printer's designs
    else if (parts[0] === 'c') await viewListing({ cat: parts[1], q });
    else if (parts[0] === 'search') await viewListing({ q });
    else if (parts[0] === 'e') viewEvent(parts[1]);
    else if (parts[0] === 'events') viewEvents();
    else if (parts[0] === 'p') await viewProduct(parts[1]);
    else if (parts[0] === 'cart') await viewCart();
    else if (parts[0] === 'checkout') await viewCheckout();
    else if (parts[0] === 'order') await viewSuccess(parts[1]);
    else if (parts[0] === 'track') await viewTrack(q);
    else if (parts[0] === 'account') await viewAccount(parts[1]);
    else if (parts[0] === 'help') viewHelp();
    else if (parts[0] === 'policy') viewPolicy();
    else if (parts[0] === 'contact') viewContact();
    else if (parts[0] === 'terms') viewTerms();
    else if (parts[0] === 'privacy') viewPrivacy();
    else if (parts[0] === 'shipping') viewShipping();
    else if (parts[0] === 'bill') await viewBill(parts[1]);
    else if (parts[0] === 'vendors') { if (q.get('type') === 'orchestra') { location.hash = '#/arkestra'; return; } await window.VENDORS.list(q); }
    else if (parts[0] === 'arkestra') await window.VENDORS.arkestra(q);
    else if (parts[0] === 'cars') await window.VENDORS.cars(q);
    else if (parts[0] === 'tent') await (parts[1] === 'review' ? window.VENDORS.tentReview() : window.VENDORS.tent(q));
    else if (parts[0] === 'lagan') await window.VENDORS.lagan(q);
    else if (parts[0] === 'cards') await window.VENDORS.cardGallery(q);
    else if (parts[0] === 'ration') await window.VENDORS.ration(q);
    else if (parts[0] === 'list-car') window.VENDORS.listCar(q);
    else if (parts[0] === 'v') await window.VENDORS.detail(parts[1], q);
    else if (parts[0] === 'vb') await window.VENDORS.success(parts[1]);
    else if (parts[0] === 'vtrack') await window.VENDORS.track();
    else if (parts[0] === 'vbdone') window.VENDORS.done();
    else if (parts[0] === 'vendor-join') window.VENDORS.join(q);
    else viewHome();
  } catch (e) {
    app().innerHTML = `<div class="panel empty"><div class="big">😕</div><h2>${h(e.message)}</h2><a class="btn btn-primary" href="#/">Go Home</a></div>`;
  }
  renderCartbar();
  $$('#bnav a').forEach(a => a.classList.toggle('on', a.dataset.nav === (['c', 'p', 'e'].includes(parts[0]) ? 'search' : parts[0] === 'order' || parts[0] === 'account' ? 'track' : parts[0] || '')));
  revealOnScroll();
}

/* ---------------- Search suggestions (as you type) ---------------- */
// the typed letters in bold inside a name (escaped)
const hlq = (text, q) => {
  const s = String(text || ''), low = s.toLowerCase(), k = String(q || '').toLowerCase();
  // the start of a word first ("g" in "Shagun & Gifts" is the G of Gifts), else anywhere
  const i = !k ? -1 : low.startsWith(k) ? 0 : [...low.matchAll(/[\s(/,.+&-]+/g)].map(m => m.index + m[0].length).find(p => low.startsWith(k, p)) ?? low.indexOf(k);
  return i < 0 ? h(s) : `${h(s.slice(0, i))}<b>${h(s.slice(i, i + k.length))}</b>${h(s.slice(i + k.length))}`;
};
// a word starts with the typed letters (one letter is enough), or — from 2 letters — they are anywhere in it
const sgHit = (hay, q) => { const s = String(hay || '').toLowerCase(); return s.startsWith(q) || s.split(/[\s(/,.+&-]+/).some(w => w.startsWith(q)) || (q.length > 1 && s.includes(q)); };
const sgCache = new Map();
// vendors, their items and kinds of service matching the letters (from the server, remembered per text)
const remoteSuggest = (q, types) => {
  const k = `${types || ''}|${q}`;
  if (!sgCache.has(k)) sgCache.set(k, api(`/api/suggest?q=${encodeURIComponent(q)}${types ? `&types=${types}` : ''}${S.district ? `&district=${encodeURIComponent(S.district)}` : ''}`).catch(() => ({ types: [], vendors: [], items: [] })));
  return sgCache.get(k);
};
// rows for remote results: an item (one vendor → that vendor at the item; several → the list), a vendor, a kind of service
const sgRows = (r, q, listHref) => [
  ...r.types.map(t => ({ href: t.id === 'vehicle' ? '#/cars' : `#/vendors?type=${t.id}`, pic: `<span class="s-ic">${t.emoji}</span>`, name: hlq(t.name, q), sub: `${t.count} vendor${t.count > 1 ? 's' : ''}${t.hi ? ' · ' + h(t.hi) : ''}` })),
  ...r.items.map(x => ({ href: x.count > 1 ? listHref(x) : `#/v/${x.vendorId}?item=${x.listingId}`, pic: ph(x.photo, '🤝', '#f6eef0'), name: hlq(x.name, q),
    sub: `${h(x.typeName)} · ${x.count > 1 ? `${x.count} vendors` : h(x.vendorName)}`, right: `${x.count > 1 ? '<small>from</small> ' : ''}${inr(x.price)}` })),
  ...r.vendors.map(v => ({ href: `#/v/${v.id}`, pic: ph(v.photo, '🏷️', '#f6eef0'), name: hlq(v.name, q), sub: `${h(v.typeName)}${v.districtName ? ' · ' + h(v.districtName) : ''}${v.sample ? ' · sample' : ''}` })),
];
const sgListHref = x => (x.type === 'vehicle' ? `#/cars?q=${encodeURIComponent(x.name)}&dist=` : `#/vendors?type=${x.type}&q=${encodeURIComponent(x.name)}`);
// Suggestions under a search box from the first letter. get(q, raw) → rows { href | pick(), pic, name (html), sub, right };
// all(raw) → the last "search for …" row. Arrow keys + Enter choose, Esc or a click outside closes.
function attachSuggest(input, get, all) {
  const host = input.closest('form') || input.parentElement;
  host.classList.add('sg-host');
  let box = null, idx = -1, timer = null, seq = 0, rows = [];
  const close = () => { if (box) box.remove(); box = null; idx = -1; };
  const choose = r => { close(); if (r.href) { location.hash = r.href; input.blur(); } else if (r.pick) r.pick(); };
  const draw = async () => {
    const raw = input.value.trim();
    if (!raw || !document.body.contains(input)) return close();
    const my = ++seq, got = await get(raw.toLowerCase(), raw);
    if (my !== seq || document.activeElement !== input) return;
    rows = [...got, ...(all ? [{ cls: 's-all', ...all(raw) }] : [])];
    if (!rows.length) return close();
    if (!box) { box = document.createElement('div'); box.className = 'suggest'; host.appendChild(box); }
    box.innerHTML = rows.map((r, i) => `<a href="${r.href ? h(r.href) : '#'}" data-sgi="${i}" class="${r.cls || ''}">${r.pic || ''}<span class="s-name">${r.name}${r.sub ? `<small>${r.sub}</small>` : ''}</span>${r.right ? `<span class="s-price">${r.right}</span>` : ''}</a>`).join('');
    idx = -1;
  };
  input.setAttribute('autocomplete', 'off');
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(draw, 90); });
  input.addEventListener('focus', draw);
  input.addEventListener('keydown', e => {
    if (!box) return;
    const links = $$('a', box);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links.forEach((l, i) => l.classList.toggle('on', i === idx));
    } else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); choose(rows[idx]); }
    else if (e.key === 'Escape') close();
  });
  host.addEventListener('mousedown', e => { if (e.target.closest('.suggest a')) e.preventDefault(); }); // keep focus until the click lands
  host.addEventListener('click', e => { const a = e.target.closest('.suggest a'); if (!a) return; e.preventDefault(); choose(rows[Number(a.dataset.sgi)]); });
  // page boxes go away with their page: their listeners are dropped on the next click after that
  const onDoc = e => { if (!document.body.contains(input)) { document.removeEventListener('click', onDoc); window.removeEventListener('hashchange', close); } else if (box && !host.contains(e.target)) close(); };
  document.addEventListener('click', onDoc);
  window.addEventListener('hashchange', close);
}
// header search: categories and shop items (here in the page), then kinds of service, vendors' items and vendors
attachSuggest($('#searchInput'), async q => {
  if (!S.meta) return [];
  const cats = S.meta.categories.filter(c => sgHit(c.name, q) || sgHit(c.nameHi, q)).slice(0, 2);
  const prods = [...S.products.values()].filter(p => sgHit(p.name, q) || sgHit(p.nameHi, q) || sgHit(cat(p.cat).name, q))
    .sort((a, b) => (b.name.toLowerCase().startsWith(q)) - (a.name.toLowerCase().startsWith(q)) || b.featured - a.featured).slice(0, 5);
  const r = await remoteSuggest(q);
  return [...cats.map(c => ({ href: `#/c/${c.id}`, pic: ph(c.image, c.emoji, c.color), name: hlq(c.name, q), sub: 'Category' })),
    ...prods.map(p => ({ href: `#/p/${p.id}`, pic: pPhoto(p), name: hlq(p.name, q), sub: h(cat(p.cat).name), right: inr(p.price) })),
    ...sgRows({ ...r, items: r.items.slice(0, 4), vendors: r.vendors.slice(0, 3) }, q, sgListHref)];
}, raw => ({ href: `#/search?q=${encodeURIComponent(raw)}`, name: `🔍 See all results for “${h(raw)}”` }));

/* ---------------- Global events ---------------- */
document.addEventListener('click', async e => {
  const t = e.target;
  const inc = t.closest('[data-inc]'), dec = t.closest('[data-dec]'), book = t.closest('[data-book]'), pk = t.closest('[data-pk]'), w = t.closest('[data-wish]');
  if (inc) { e.preventDefault(); flyToCart(inc); return addProduct(inc.dataset.inc, 1); }
  if (dec) { e.preventDefault(); return addProduct(dec.dataset.dec, -1); }
  if (book) { e.preventDefault(); return openBooking(book.dataset.book); }
  if (pk) { e.preventDefault(); return addPackage(pk.dataset.pk); }
  const payBal = t.closest('[data-paybal]');
  if (payBal) return openPay(payBal.dataset.paybal, payBal.dataset.phone);
  const payNow = t.closest('[data-paynow]'), cod = t.closest('[data-cod]'), tcancel = t.closest('[data-tcancel]');
  if (payNow) { payNow.disabled = true; return retryPayment(payNow.dataset.paynow, payNow.dataset.phone).finally(() => { payNow.disabled = false; }); }
  const payChk = t.closest('[data-paycheck]');
  if (payChk) { payChk.disabled = true; return checkPayment(payChk.dataset.paycheck, payChk.dataset.phone).finally(() => { payChk.disabled = false; }); }
  if (cod) return switchToCod(cod.dataset.cod, cod.dataset.phone);
  const rate = t.closest('[data-rate]');
  if (rate) {
    const d = rate.dataset;
    return openReview({ title: d.name, sub: `Order #${d.rate}`, withPhoto: true,
      send: r => api('/api/reviews', { method: 'POST', body: { orderNumber: d.rate, phone: d.phone, productId: d.pid, line: Number(d.line), ...r } }),
      done: () => { rate.outerHTML = '<span class="rv-done">✓ Reviewed</span>'; } });
  }
  const ocancel = t.closest('[data-ocancel]'), oreturn = t.closest('[data-oreturn]');
  if (ocancel) return openCancel(ocancel.dataset.number, ocancel.dataset.phone);
  if (oreturn) return openReturn(oreturn.dataset.number, oreturn.dataset.phone);
  if (tcancel) return openCancel(tcancel.dataset.tcancel, tcancel.dataset.phone);
  if (w) {
    e.preventDefault(); e.stopPropagation();
    if (!S.user) return openLogin(() => route());
    try {
      const r = await api('/api/me/wishlist', { method: 'POST', body: { productId: w.dataset.wish } });
      S.user.wishlist = r.wishlist;
      const on = r.wishlist.includes(w.dataset.wish);
      $$(`[data-wish="${w.dataset.wish}"]`).forEach(b => { b.classList.toggle('on', on); if (b.classList.contains('btn')) b.textContent = on ? '♥ Wishlisted' : '♡ Wishlist'; });
      toast(on ? 'Added to wishlist ♥' : 'Removed from wishlist');
    } catch (err) { toast(err.message, true); }
    return;
  }
  const a = t.closest('[data-act]');
  if (!a) { if (!t.closest('#acct')) $('#acct').classList.remove('open'); return; }
  const act = a.dataset.act;
  if (act === 'login') openLogin();
  else if (act === 'login-checkout') openLogin(() => viewCheckout());
  else if (act === 'acct-menu') $('#acct').classList.toggle('open');
  else if (act === 'to-register') openLogin(afterLogin, 'register');
  else if (act === 'to-login') openLogin(afterLogin, 'login');
  else if (act === 'to-otp') openLogin(afterLogin, 'otp');
  else if (act === 'close-modal') closeModal();
  else if (act === 'lang') window.I18N.toggle();
  else if (act === 'district') openDistrict();
  else if (act === 'toggle-filters') $('#filters').classList.toggle('open');
  else if (act === 'checkout') location.hash = '#/checkout';
  else if (act === 'logout') {
    e.preventDefault();
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* already logged out */ }
    setSession(null, null); toast('Logged out'); location.hash = '#/';
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
$('#searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = $('#searchInput').value.trim();
  location.hash = q ? '#/search?q=' + encodeURIComponent(q) : '#/search';
});
$('#districtBtn').addEventListener('click', () => openDistrict());
window.addEventListener('hashchange', route);

(async function boot() {
  try {
    const [meta, list] = await Promise.all([api('/api/meta'), api('/api/products?limit=200')]);
    S.meta = meta;
    GEO.useMeta(meta);
    list.products.forEach(p => S.products.set(p.id, p));
    $$('#langBtn [data-l]').forEach(b => b.classList.toggle('on', b.dataset.l === window.LANG));
    // Hindi names for products, categories and packages (used by the Hindi switch)
    window.I18N.setNames([
      ...list.products.map(p => [p.name, p.nameHi]),
      ...meta.categories.map(c => [c.name, c.nameHi]),
      ...meta.packages.map(k => [k.name, k.nameHi]),
    ]);
    if (S.district && !district(S.district)) { S.district = null; store.set('district', null); }
    if (S.token) { try { S.user = (await api('/api/me')).user; } catch { setSession(null, null); } }
    if (S.user) mergePrefs(S.user); // dates / side / district saved on the account (e.g. from another phone)
    // vendors.js loads after this file; wait for it so the first page includes the vendor sections
    if (!window.VENDORS) await new Promise(r => { window.addEventListener('vendors-ready', r, { once: true }); setTimeout(r, 4000); });
    renderChrome();
    try { if (!sessionStorage.getItem('sa_visit')) { sessionStorage.setItem('sa_visit', '1'); ping('visits'); } } catch { /* storage unavailable */ }
    await route();
    // ask for the district, but not over the help / policy pages (people — and Razorpay's review — just want to read them)
    const reading = () => /^#\/(help|policy|contact|terms|privacy|shipping|bill)\b/.test(location.hash);
    if (!S.district) setTimeout(() => { if (!$('#modalBg') && !reading()) openDistrict(() => route()); }, 1200);
  } catch (e) {
    app().innerHTML = `<div class="panel empty"><div class="big">⚠️</div><h2>Could not load the store</h2><p class="muted">${h(e.message)}</p></div>`;
  }
})();
