/* Vendor marketplace pages (uses helpers from app.js: $, $$, h, inr, api, S, store, modal, toast, ph, fmtDate, shortDate, today ...) */
const VTYPES = [
  { id: 'vehicle', name: 'Vehicles', hi: 'गाड़ियाँ', emoji: '🚙', mode: 'unit', img: '1774012697329-273cb2bb1762', subtypes: [['car', 'Cars & SUVs'], ['owner', 'Own Car (Owner-Driver)'], ['dulha', 'Dulha Entry']] },
  { id: 'catering', name: 'Cooks & Catering', hi: 'हलवाई व कैटरिंग', emoji: '👨‍🍳', mode: 'event', img: '1742281257687-092746ad6021', subtypes: [['cook', 'Individual Cooks / Halwai'], ['caterer', 'Catering Services']] },
  { id: 'ration', name: 'Raw Materials & Ration', hi: 'राशन सामग्री', emoji: '🌾', mode: 'stock', img: '1586201375761-83865001e31c' },
  { id: 'vegetable', name: 'Vegetables', hi: 'सब्ज़ी', emoji: '🥬', mode: 'stock', img: '1769685104379-0bedf8505586' },
  { id: 'sweets', name: 'Sweet Shops', hi: 'मिठाई की दुकान', emoji: '🍬', mode: 'stock', img: '1758910536889-43ce7b3199fd' },
  { id: 'studio', name: 'Cameras & Studios', hi: 'कैमरा व स्टूडियो', emoji: '📸', mode: 'event', img: '1471341971476-ae15ff5dd4ea' },
  { id: 'dj', name: 'DJ & Sound', hi: 'डीजे व साउंड', emoji: '🎧', mode: 'event', img: '1470225620780-dba8ba36b745' },
  { id: 'pandit', name: 'Pandit Ji', hi: 'पंडित जी', emoji: '🙏', mode: 'event', img: '1741201864879-c5e7f81c98b0' },
  { id: 'orchestra', name: 'Orchestra & Artists', hi: 'आर्केस्ट्रा व कलाकार', emoji: '🎤', mode: 'event', img: '1574155376612-bfa4ed8aabfd', subtypes: [['group', 'Orchestra Groups'], ['artist', 'Individual Artists']] },
  { id: 'tent', name: 'Tent, Shamiyana & Light', hi: 'टेंट, शामियाना व लाइट', emoji: '⛺', mode: 'event', img: '1744891470493-44321ef136a2', subtypes: [['tent', 'Tent House'], ['light', 'Light & Generator']] },
  { id: 'decoration', name: 'Phool & Decoration', hi: 'फूल व सजावट', emoji: '💐', mode: 'event', img: '1789971649652-ae5dfeeaa7b4', subtypes: [['decor', 'Decorators (mandap, stage, gate)'], ['flowers', 'Phool / Mala Wala']] },
  { id: 'band', name: 'Band Baja & Shehnai', hi: 'बैंड बाजा व शहनाई', emoji: '🥁', mode: 'event', img: '1774438464558-a3f4c6aad0a5', subtypes: [['band', 'Band Party'], ['shehnai', 'Shehnai & Dhol']] },
  { id: 'mehndi', name: 'Mehndi Artists', hi: 'मेहंदी आर्टिस्ट', emoji: '🌿', mode: 'event', img: '1771992226177-759e116e72f4' },
  { id: 'makeup', name: 'Makeup & Beauty Parlour', hi: 'मेकअप व ब्यूटी पार्लर', emoji: '💄', mode: 'event', img: '1681717166573-f71589207785', subtypes: [['artist', 'Makeup Artists'], ['parlour', 'Beauty Parlours']] },
  { id: 'venue', name: 'Marriage Hall & Venue', hi: 'मैरिज हॉल व वेन्यू', emoji: '🏛️', mode: 'event', img: '1587271636175-90d58cdad458', subtypes: [['hall', 'Marriage Halls'], ['lawn', 'Lawns & Gardens'], ['hotel', 'Hotels & Resorts']] },
  { id: 'wear', name: 'Dulha-Dulhan Wear', hi: 'दूल्हा-दुल्हन परिधान', emoji: '👑', mode: 'stock', img: '1610173827043-9db50e0d8ef9' },
  { id: 'puja', name: 'Puja Samagri Shops', hi: 'पूजा सामग्री दुकान', emoji: '🪔', mode: 'stock', img: '1783255166346-b7c82195ba34' },
  { id: 'gifts', name: 'Shagun & Gift Shops', hi: 'शगुन व उपहार दुकान', emoji: '🎁', mode: 'stock', img: '1710857397974-f0617001c39e' },
  { id: 'cards', name: 'Shaadi Card Printing', hi: 'शादी कार्ड छपाई', emoji: '💌', mode: 'stock', img: '1633037773384-27d7ac0491e7' },
];
// types whose work is best shown with photos / videos (portfolio section and video links)
const PORTFOLIO_TYPES = ['studio', 'orchestra', 'dj', 'tent', 'decoration', 'band', 'mehndi', 'makeup', 'venue', 'cards'];
// shop category → the vendor types that offer the same thing locally
const CAT_VENDORS = { tent: ['tent'], 'band-dj': ['band', 'dj'], decoration: ['decoration'], 'mehndi-haldi': ['mehndi', 'makeup'], 'wedding-wear': ['wear', 'makeup'], 'puja-samagri': ['puja', 'pandit'], 'pandit-ji': ['pandit'], mithai: ['sweets'], 'car-transport': ['vehicle'], gifts: ['gifts'], 'photo-video': ['studio'], cards: ['cards'] };
const vtype = id => VTYPES.find(t => t.id === id) || VTYPES[0];
const VS = { date: store.get('vdate', ''), compare: [], myVB: store.get('myvb', []), sel: {}, selG: {}, last: [] };
// Halwai / cooks price by number of guests: the tier that covers `n` guests (or the biggest one)
const tierFor = (l, n) => { const ts = l.guestTiers || []; return ts.find(x => x.guests >= n) || ts[ts.length - 1] || null; };
// any guest count (e.g. 250): the vendor's rate for the smallest package that covers it; null when more than the biggest
const guestTier = (l, n) => (n > 0 ? (l.guestTiers || []).find(x => x.guests >= n) || null : null);
const maxGuests = l => ((l.guestTiers || []).slice(-1)[0] || {}).guests || 0;
// guest-count dropdown with a "custom number" box; price text for the chosen count
function guestPick(id, tiers, n, attr) {
  const custom = n > 0 && !tiers.some(t => t.guests === n);
  return `<select class="input" ${attr}="${id}"><option value="">Kitne log? (guests)</option>${tiers.map(t => `<option value="${t.guests}" ${n === t.guests ? 'selected' : ''}>${t.guests} log · ${inr(t.price)}</option>`).join('')}<option value="custom" ${custom ? 'selected' : ''}>Custom number…</option></select>
    <input type="number" class="input gt-num" ${attr}-n="${id}" min="1" max="${tiers.slice(-1)[0].guests}" inputmode="numeric" placeholder="e.g. 250" value="${custom ? n : ''}" ${custom ? '' : 'hidden'}>`;
}
const guestPriceTxt = (l, n) => { if (!n) return ''; const t = guestTier(l, n); return t ? `<b>${inr(t.price)}</b> for ${n} log${t.guests !== n ? ` <span class="muted">(rate for up to ${t.guests})</span>` : ''}` : `<span class="bad-txt">Takes up to ${maxGuests(l)} guests</span>`; };
// Goods sold by quantity (sweets per kg, boxes, cards): price per unit for `qty` — bulk rate, then lagan-day price,
// then card add-ons. Mirrors the server, which charges the same. r: { n: normal price, b: bulk tiers, lg: lagan day, pct, lp: lagan price, add }
function ruleUnit(r, qty) {
  const bulk = (r.b || []).filter(t => qty >= t.min).pop(), base = bulk ? bulk.price : r.n;
  const p = !r.lg ? base : !bulk && r.lp > 0 ? r.lp : r.pct > 0 ? Math.round(base * (1 + r.pct / 100)) : base;
  return p + (r.add || 0);
}
const qtyStep = x => (x.kind === 'card' ? 50 : x.kind === 'box' ? 10 : x.unit === 'plate' ? 50 : x.unit === 'kg' ? (x.type === 'sweets' ? 1 : 5) : /litre/.test(x.unit) ? 5 : 1);
/* ---------------- Vendor cart (several vendors / vehicles / dates, booked together at checkout) ---------------- */
VS.vcart = store.get('vcart', []);
function saveVCart() { store.set('vcart', VS.vcart); afterCartChange(); }
function groupsOf(lines) {
  const map = new Map();
  for (const x of lines) {
    const k = x.vendorId + '|' + x.date;
    if (!map.has(k)) map.set(k, { key: k, vendorId: x.vendorId, vendorName: x.vendorName, type: x.type, mode: x.mode, date: x.date, event: '', eventTime: '', delivery: x.delivery, fulfil: x.fulfil || 'pickup', lines: [] });
    const g = map.get(k);
    g.lines.push(x);
    if (!g.event && x.event) g.event = x.event; // one function per vendor booking (Tilak, Haldi, Shaadi...)
    if (!g.eventTime && x.eventTime) g.eventTime = x.eventTime; // function time on that date (tent set-up by then)
    if (!g.delivery && x.delivery) g.delivery = x.delivery;
  }
  return [...map.values()].map(g => {
    const subtotal = g.lines.reduce((a, x) => a + x.price * x.qty, 0);
    // rental pieces (tent, chairs, lights) are always brought and set up: the vendor's delivery charge applies (same as the server)
    const rental = g.lines.some(x => x.rental);
    const canDeliver = (g.mode === 'stock' || rental) && g.delivery && g.delivery.available;
    const deliveryCharge = canDeliver && (rental || g.fulfil === 'delivery') ? (g.delivery.freeAbove && subtotal >= g.delivery.freeAbove ? 0 : g.delivery.charge || 0) : 0;
    return { ...g, rental, fulfil: rental ? 'delivery' : g.fulfil, canDeliver, subtotal, deliveryCharge, total: subtotal + deliveryCharge };
  }).sort((a, b) => a.date.localeCompare(b.date));
}
const vGroups = () => groupsOf(VS.vcart);
// function time on a date: every vendor line of that date carries it (booked with each vendor of the day)
const dateTime = date => (VS.vcart.find(x => x.date === date && x.eventTime) || {}).eventTime || '';
const setDateTime = (date, t) => { VS.vcart.forEach(x => { if (x.date === date) x.eventTime = t; }); saveVCart(); };
const vCount = () => VS.vcart.length;
const vTotal = () => vGroups().reduce((a, g) => a + g.total, 0);

// Cart page block; `redraw` re-renders the whole cart page
function vCartSection(redraw) {
  const gs = vGroups();
  if (!gs.length) return { html: '', bind: () => {} };
  const html = `<div class="group-h vc-head"><span>🤝 Vendor bookings (${gs.length} vendor${gs.length > 1 ? 's' : ''})</span><span class="small muted" style="font-weight:500">Booked together at checkout · pay vendors directly</span></div>
    ${gs.map(g => `<div class="vc-group" data-g="${h(g.key)}">
      <div class="vc-gh"><a class="link" href="#/v/${g.vendorId}"><b>${h(g.vendorName)}</b></a><span class="chip chip-ev">📅 ${fmtDate(g.date)}</span>${g.eventTime ? `<span class="chip chip-ev">⏰ ${h(g.eventTime)}</span>` : ''}${g.event ? `<span class="chip chip-ev">${h(evShort(g.event))}</span>` : ''}
        ${g.rental ? `<span class="chip chip-ev">🚚 ${g.canDeliver ? 'Delivery & set-up' : 'Set up at your venue'}</span>` : g.canDeliver ? `<span class="vc-ful"><label><input type="radio" name="vf_${h(g.key)}" value="delivery" data-gful="${h(g.key)}" ${g.fulfil === 'delivery' ? 'checked' : ''}> 🚚 Delivery</label><label><input type="radio" name="vf_${h(g.key)}" value="pickup" data-gful="${h(g.key)}" ${g.fulfil !== 'delivery' ? 'checked' : ''}> 🏪 Pickup</label></span>` : ''}
        <button class="btn btn-light btn-sm" data-grm="${h(g.key)}">Remove</button></div>
      ${g.lines.map(x => `<div class="cart-item vc-item">
        <a href="#/v/${x.vendorId}">${ph(x.photo, x.emoji, '#f6eef0')}</a>
        <div><h4>${h(x.name)}</h4><div class="small muted">${x.guests ? `👥 Khana ${x.guests} logon ke liye · ${inr(x.price)}` : `${inr(x.price)} per ${h(x.unit)}${x.rule && x.price - (x.rule.add || 0) < x.rule.n ? ' · <b class="ok-txt">bulk rate</b>' : ''}${x.min > 1 ? ` · min ${x.min}` : ''}`}</div>
          ${(x.dates || []).length ? `<div class="small">${datesChips(x)}</div>` : ''}
          <div class="ci-controls">${x.guests || x.plan ? `<a class="btn btn-light btn-sm" href="#/v/${x.vendorId}">${x.plan ? 'Change functions' : 'Change guests'}</a>` : `<div class="qty"><button data-vcq="-1" data-k="${h(g.key)}|${x.listingId}">−</button><input data-vcqi="${h(g.key)}|${x.listingId}" type="number" min="1" max="${x.max || 100000}" value="${x.qty}"><button data-vcq="1" data-k="${h(g.key)}|${x.listingId}">+</button></div>`}
          <button class="btn btn-light btn-sm" ${x.plan ? `data-vcri="${VS.vcart.indexOf(x)}"` : `data-vcrm="${h(g.key)}|${x.listingId}"`}>Remove</button></div></div>
        <div class="ci-price"><span class="price">${inr(x.price * x.qty)}</span></div></div>`).join('')}
      <div class="vc-gt">${g.deliveryCharge ? `Delivery ${inr(g.deliveryCharge)} · ` : ''}<b>${h(g.vendorName)} total ${inr(g.total)}</b></div>
    </div>`).join('')}
    <div style="padding:10px 18px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-ghost btn-sm" href="#/vendors">+ Add more vendors</a>${gs.some(g => g.rental) ? '<a class="btn btn-light btn-sm" href="#/tent">⛺ Edit tent selection</a><a class="btn btn-gold btn-sm" href="#/tent/review">🧾 Review & Create Final Order</a>' : ''}</div>`;
  const find = k => { const [vid, date, lid] = k.split('|'); return VS.vcart.find(x => x.vendorId === vid && x.date === date && x.listingId === lid); };
  const bind = root => {
    // a new quantity can reach a bulk rate: the unit price is worked out again (minimum order respected)
    const setQty = (k, val) => { const x = find(k); if (!x) return; x.qty = Math.max(x.min || 1, Math.min(x.max || 100000, Math.round(val) || 1)); if (x.rule) x.price = ruleUnit(x.rule, x.qty); saveVCart(); redraw(); };
    $$('[data-vcq]', root).forEach(b => b.addEventListener('click', () => { const x = find(b.dataset.k); const step = x.mode === 'unit' || x.rental ? 1 : qtyStep(x); setQty(b.dataset.k, x.qty + Number(b.dataset.vcq) * step); }));
    $$('[data-vcqi]', root).forEach(i => i.addEventListener('change', () => setQty(i.dataset.vcqi, Number(i.value))));
    $$('[data-vcrm]', root).forEach(b => b.addEventListener('click', () => { const x = find(b.dataset.vcrm); VS.vcart = VS.vcart.filter(y => y !== x); saveVCart(); toast('Removed from cart'); redraw(); }));
    // a studio line is for one function (the same item can be there for several): removed by its place in the cart
    $$('[data-vcri]', root).forEach(b => b.addEventListener('click', () => { VS.vcart.splice(Number(b.dataset.vcri), 1); saveVCart(); toast('Removed from cart'); redraw(); }));
    $$('[data-grm]', root).forEach(b => b.addEventListener('click', () => { VS.vcart = VS.vcart.filter(y => y.vendorId + '|' + y.date !== b.dataset.grm); saveVCart(); toast('Vendor removed from cart'); redraw(); }));
    $$('[data-gful]', root).forEach(r => r.addEventListener('change', () => { VS.vcart.forEach(y => { if (y.vendorId + '|' + y.date === r.dataset.gful) y.fulfil = r.value; }); saveVCart(); redraw(); }));
  };
  return { html, bind };
}

// Checkout: books every vendor group in one request (all or nothing)
async function bookVendorCart(customer, note) {
  const gs = vGroups();
  if (!gs.length) return [];
  try {
    const r = await api('/api/vbookings/bulk', { method: 'POST', body: { customer, note, groups: gs.map(g => ({ vendorId: g.vendorId, date: g.date, event: g.event || undefined, eventTime: g.eventTime || undefined, delivery: g.fulfil, items: g.lines.map(x => ({ listingId: x.listingId, qty: x.qty, guests: x.guests, addons: x.addons, dates: x.dates, style: x.style })) })) } });
    VS.myVB = [...r.bookings.map(b => ({ number: b.number, phone: b.customer.phone, vendorId: b.vendorId })), ...VS.myVB].slice(0, 40);
    store.set('myvb', VS.myVB);
    VS.vcart = []; saveVCart();
    VS.lastBookings = r.bookings;
    return r.bookings;
  } catch (e) {
    throw new Error(e.message + ' Check My Vendor Bookings before trying again if the connection dropped.');
  }
}
// a vendor booking's function and, for full-ceremony items, every rasam date
const vbEv = b => (b.eventTime ? ` · ⏰ ${h(b.eventTime)}` : '') + (b.event ? ` · <span class="chip chip-ev">${h(evShort(b.event))}</span>` : '');
const vbRasams = b => b.items.filter(i => (i.dates || []).length).map(i => `<div class="small">${datesChips(i)}</div>`).join('');
function bookingsDoneBlock(list) {
  if (!list || !list.length) return '';
  const s = S.meta.settings;
  return `<div class="box vb-done"><h3 style="margin:0 0 8px">🤝 ${list.length} vendor booking request${list.length > 1 ? 's' : ''} sent</h3>
    ${list.map(b => `<div class="vb-done-row"><div><b>#${h(b.number)}</b> · ${h(b.vendorName)} · 📅 ${fmtDate(b.date)}${vbEv(b)}<div class="small muted">${b.items.map(i => `${h(i.name)} × ${i.qty}`).join(', ')}</div>${vbRasams(b)}</div>
      <div style="display:flex;gap:6px;align-items:center"><b>${inr(b.total)}</b>${b.vendor ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="https://wa.me/91${h(b.vendor.whatsapp || b.vendor.phone)}?text=${encodeURIComponent(`Namaste, I requested booking #${b.number} for ${fmtDate(b.date)} on ${s.siteName}.`)}">💬</a>` : ''}</div></div>`).join('')}
    <p class="small muted" style="margin:8px 0 0">Wait for each vendor to confirm before paying. Save your booking numbers and check the status in <a class="link" href="#/vtrack">My Vendor Bookings</a>.</p></div>`;
}
function viewVBDone() {
  const list = VS.lastBookings;
  if (!list || !list.length) { location.hash = '#/vtrack'; return; }
  app().innerHTML = `<div class="panel success"><div class="tick">✓</div><h1 style="margin:0">Booking requests sent!</h1>
    <p class="muted">Your requests are now in each vendor’s booking panel.</p>
    <div style="max-width:720px;margin:0 auto;text-align:left">${bookingsDoneBlock(list)}</div>
    <div class="cta-row" style="max-width:520px;margin:16px auto 0"><a class="btn btn-primary" href="#/vtrack">📦 Track vendor bookings</a><a class="btn btn-ghost" href="#/vendors">Book more vendors</a></div></div>`;
}

const tomorrow = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const vDate = () => { const d = VS.date || S.events['Shaadi (Vivah)'] || today(); return d < today() ? today() : d; };
const setVDate = d => { VS.date = d; store.set('vdate', d); };
// the function date the customer really chose (date bar, or their Shaadi date in My Events); '' when none yet
const chosenDate = () => [VS.date, S.events['Shaadi (Vivah)']].find(d => d && d >= today()) || '';
const stars = r => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));

function availPill(a, date, showCapacity = true) {
  const d = shortDate(date);
  if (a.status === 'available') return `<span class="av ok">✓ Available ${d}${showCapacity && a.left != null && a.left < 50 ? ` · ${a.left} left` : ''}</span>`;
  if (a.status === 'full') return `<span class="av bad">✗ Booked on ${d}</span>`;
  if (a.status === 'closed') return `<span class="av off">Closed on ${d}</span>`;
  return '';
}
// Person profile photo, or initials (e.g. "RM") until the person uploads a real photo
const AV_COLORS = ['#7c0f33', '#a3184a', '#b45309', '#0f766e', '#4338ca', '#9d174d', '#166534'];
// artists are known by their stage name; pandit ji and cooks by their own name
const personName = v => (v.type === 'orchestra' ? v.name : (v.owner || v.name));
function personAvatar(v, cls = '') {
  const nm = String(personName(v)).replace(/^Sample\s+/i, '').replace(/^(Pt\.|Pandit|Acharya|Sri|Shri|Mr\.|Mrs\.|Smt\.)\s+/i, '').trim();
  const ini = nm.split(/\s+/).filter(w => /^\p{L}/u.test(w)).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const col = AV_COLORS[[...nm].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];
  return `<div class="pav ${cls}" style="background:linear-gradient(135deg, ${col}, #f7b500)">${v.profilePhoto ? `<img src="${h(v.profilePhoto)}" alt="${h(nm)}" loading="lazy" onerror="this.remove()">` : `<span>${h(ini)}</span>`}</div>`;
}
// Arkestra team: who is in the group, their work, how many ladies
const ROLE_IC = { singer: '🎤', dancer: '💃', anchor: '🎙️', comedian: '😂', musician: '🥁', 'sound & lights': '💡', choreographer: '🕺', 'jhanki artist': '🪔', manager: '📋' };
const roleIc = r => ROLE_IC[String(r).toLowerCase()] || '⭐';
const rolePl = (r, n) => n > 1 && !/s$|&/.test(r) ? r + 's' : r;
function memberAvatar(m, cls = '') {
  const nm = String(m.name || '').replace(/^Sample\s+/i, '').replace(new RegExp('^' + String(m.role || '').replace(/[^\w ]/g, '') + '\\s+', 'i'), '').trim();
  const ini = (m.count || 1) > 1 ? roleIc(m.role) : nm.split(/\s+/).filter(w => /^\p{L}/u.test(w)).map(w => w[0]).join('').slice(0, 2).toUpperCase() || roleIc(m.role);
  return `<div class="tav ${m.gender === 'female' ? 'f' : ''} ${cls}">${m.photo ? `<img src="${h(m.photo)}" alt="${h(m.name)}" loading="lazy" onerror="this.remove()">` : ''}<span>${h(ini)}</span></div>`;
}
const teamLine = v => v.teamTotal ? `👥 <b>${v.teamTotal}</b> people · 👩 <b>${v.teamLadies}</b> ladies` : '';
const rolesLine = v => (v.teamRoles || []).map(r => `${r.n} ${h(rolePl(r.role, r.n))}`).join(' · ');
function teamHtml(v) {
  const team = v.team || [];
  if (!team.length) return '';
  return `<section class="panel vsec" id="vTeam"><div class="group-h" style="background:#fff;font-size:17px">👥 Team – who will perform <span class="dish-n">${v.teamTotal} people</span></div>
    <div class="team-sum"><div><b>${v.teamTotal}</b><span>Total people</span></div><div class="f"><b>${v.teamLadies}</b><span>👩 Ladies</span></div><div><b>${v.teamTotal - v.teamLadies}</b><span>👨 Men</span></div></div>
    <div class="team-roles">${v.teamRoles.map(r => `<span>${roleIc(r.role)} ${r.n} ${h(rolePl(r.role, r.n))}</span>`).join('')}</div>
    <div class="team-grid">${team.map(m => `<div class="tm">${memberAvatar(m, 'lg')}<b>${h(m.name || m.role)}</b><span class="small">${roleIc(m.role)} ${h(m.role)}${m.count > 1 ? ` × ${m.count}` : ''}</span>${m.gender ? `<span class="tm-g ${m.gender === 'female' ? 'f' : ''}">${m.gender === 'female' ? '👩 Lady' : '👨 Male'}${m.count > 1 ? ` × ${m.count}` : ''}</span>` : ''}</div>`).join('')}</div>
    ${v.sample ? '<p class="small muted" style="margin:0 16px 12px">Sample team – real groups add each artist\'s own photo.</p>' : ''}</section>`;
}
const dishTotal = v => v.dishCount ?? (v.dishes || []).reduce((a, g) => a + g.items.length, 0);
const skillTotal = v => v.skillCount ?? (v.skills || []).reduce((a, g) => a + g.items.length, 0);
const hasAstro = v => v.astro ?? (v.skills || []).some(g => /jyotish|astro|kundli/i.test(g.group));
// Education and every skill (pujas, jyotish…) grouped, on the vendor's profile
function skillsHtml(v) {
  const n = skillTotal(v), edu = v.education || [];
  if (!n && !edu.length) return '';
  return `<section class="panel vsec" id="vSkills"><div class="group-h" style="background:#fff;font-size:17px">${v.type === 'pandit' ? '🕉️ Pujas, skills & education' : '🎓 Skills & education'} <span class="dish-n">${n ? `${n} skills` : ''}</span></div>
    ${edu.length ? `<div class="edu-list"><h4>🎓 Education & training</h4><ul>${edu.map(x => `<li>${h(x)}</li>`).join('')}</ul></div>` : ''}
    ${n ? `<div class="dish-groups">${v.skills.map(g => `<div class="dish-g ${/jyotish|astro|kundli/i.test(g.group) ? 'astro' : ''}"><h4>${/jyotish|astro|kundli/i.test(g.group) ? '🔮 ' : ''}${h(g.group || 'Skills')} <span class="muted small">(${g.items.length})</span></h4><div class="dish-chips">${g.items.map(x => `<span>${h(x)}</span>`).join('')}</div></div>`).join('')}</div>` : ''}</section>`;
}
// "What can this halwai cook?" — every dish, grouped (Sabzi, Mithai...), with a search box when the list is long
// "Famous for": the cook's speciality (their best dishes, comma separated) — shown first and starred in the menu
const famousOf = v => String(v.speciality || '').split(/[,،;/]| and | aur /i).map(x => x.trim()).filter(x => x.length > 1).slice(0, 8);
// extra people a family can add to a booking (same roles as the server's STAFF_BY)
const ROLE_LABEL = { cook: 'Cooks', helper: 'Helpers / labour', dancer: 'Extra lady dancers', singer: 'Extra singers' };
// a tent / pandal piece with a size like "40×60 ft": its area and about how many guests fit on chairs (helpers in app.js)
const tentCap = l => { if (!['tent', 'stage'].includes(l.category)) return ''; const s = tentSize(l.size); return s && s.area ? `${nn(s.area)} sq ft${l.category === 'tent' ? ` · ~${nn(s.area / SQFT_PER.chairs)} guests` : ''}` : ''; };
// tent house pieces by category (same ids as the server's TENT_CATS, in that order)
const TENT_NAME = { tent: 'Tents & pandal', poles: 'Poles & frames', fabric: 'Fabric & kanaat', carpet: 'Carpet & flooring', chairs: 'Chairs', tables: 'Tables', stage: 'Stage & mandap', sofa: 'Sofa & lounge',
  lighting: 'Lighting', sound: 'Sound & DJ', generator: 'Generator', decoration: 'Decoration', flowers: 'Flowers', bartan: 'Bartan & kitchen', other: 'Other items' };
// halwai bartan groups (same ids as the server's BARTAN_CATS)
const BARTAN_NAME = { cooking: 'Cooking vessels — degchi, kadhai, bhagona, tawa', serving: 'Serving & storage — balti, tasla, thali, jug', fire: 'Bhatti, gas & chulha', tools: 'Karchhi, jharna & tools', other: 'Other bartan' };
// menu section colour: veg green, non-veg red, sweets pink, the rest gold
const menuKind = g => { const s = String(g || '').toLowerCase(); return /non[\s-]?veg|meat|mutton|chicken|fish|machh|egg/.test(s) ? 'nv' : /meeth|mith|sweet|dessert|halwa/.test(s) ? 'sw' : /veg|sabzi|dal|paneer/.test(s) ? 'vg' : 'ot'; };
const isFamous = (fam, dish) => fam.some(f => { const a = f.toLowerCase(), b = dish.toLowerCase(); return a === b || (a.length > 3 && (b.includes(a) || a.includes(b))); });
function dishesHtml(v) {
  const n = dishTotal(v);
  if (!n) return '';
  const fam = v.type === 'catering' ? famousOf(v) : [];
  return `<section class="panel vsec" id="vDishes"><div class="group-h" style="background:#fff;font-size:17px">Menu · dishes ${h(personName(v))} can cook <span class="dish-n">${n} items</span></div>
    ${fam.length ? `<div class="dish-fam"><b>Famous for</b><div>${fam.map(x => `<span>★ ${h(x)}</span>`).join('')}</div></div>` : ''}
    ${n > 12 ? '<div class="dish-find"><input class="input" id="dishQ" placeholder="Search a dish – e.g. gulab jamun, litti, biryani"></div>' : ''}
    <div class="dish-groups menu">${v.dishes.map(g => `<div class="dish-g menu-g ${menuKind(g.group)}"><div class="menu-h"><b>${h(g.group || 'Dishes')}</b><span>${g.items.length}</span></div>
      <ul class="dish-list">${[...g.items].sort((a, b) => isFamous(fam, b) - isFamous(fam, a)).map(x => `<li class="${isFamous(fam, x) ? 'fam' : ''}"><i></i><span>${h(x)}</span>${isFamous(fam, x) ? '<em>Famous</em>' : ''}</li>`).join('')}</ul></div>`).join('')}</div>
    <p class="small muted dish-none" hidden style="margin:0 16px 12px">Not in the list — call or WhatsApp to ask, most halwai can make it.</p></section>`;
}
// Badges for papers the team has checked (customers never see the papers themselves)
const trustChips = v => {
  const t = v.trust || {};
  return [t.papers ? '📄 Licence & RC checked' : t.id ? '🆔 ID checked' : '', t.fssai ? '🍲 FSSAI registered' : '', t.team ? '👥 Team age-checked (18+)' : '', t.gst ? '🧾 GST registered' : '']
    .filter(Boolean).map(x => `<span class="vpapers">${x}</span>`).join('');
};

function vCard(v, date) {
  const on = VS.compare.includes(v.id);
  const badges = `${v.verified ? '<span class="vbadge">✓ Verified</span>' : ''}${v.sample ? '<span class="vsample">Sample</span>' : ''}`;
  // every card: same photo size; a person's face sits beside the name (not on the photo) so all cards line up
  return `<div class="vcard ${v.person ? 'is-person' : ''}">
    <div class="vph-wrap"><a class="vph" href="#/v/${v.id}">${ph(v.photo, v.emoji, '#f6eef0')}${badges}</a>
      <label class="vcmp vcmp-ph" title="Compare up to 3 vendors"><input type="checkbox" data-cmp="${v.id}" ${on ? 'checked' : ''}> Compare</label></div>
    <div class="vbody">
      <div class="vhead">${v.person ? personAvatar(v, 'sm') : ''}<div class="vhead-t">
        <a class="vtitle${v.person ? ' vpname' : ''}" href="#/v/${v.id}">${h(v.person ? personName(v) : v.name)}</a>
        <div class="vmeta">${placeLine(v)}${v.reviews ? `<span class="vrate">★ ${v.rating}</span>` : ''}</div></div></div>
      <div class="vavail">${availPill(v.avail, date, false)}</div>
      <div class="vact">${v.startingPrice ? `<div class="vprice"><small>${v.lagan ? '🪔 Lagan · from' : 'From'}</small><b>${inr(v.startingPrice)}</b><small>/ ${h(v.unit)}</small></div>` : ''}<a class="btn btn-primary btn-sm" href="#/v/${v.id}">Book</a></div>
    </div></div>`;
}

/* ---------------- Shaadi ration & ingredients: plan for your guests, compare shops, order ---------------- */
const MENUS = [['simple', 'Simple bhoj', 0.85], ['standard', 'Standard', 1], ['grand', 'Grand (more dishes)', 1.3]];
// quantity for `guests` from the per-100-guests estimate, rounded so it reads naturally
const planQty = (ing, guests, factor) => { const x = ing.per100 * guests / 100 * factor; return x >= 10 ? Math.round(x) : Math.round(x * 10) / 10; };
const perBaseText = o => (o.packSize !== 1 ? ` <span class="muted small">(${inr(o.perBase)}/${o.unit === 'litre' || /oil/.test(o.item) ? 'L' : 'kg'})</span>` : '');
// one shop's items → vendor cart (same shape the shop page uses, so bulk rates update in the cart)
function addRationLines(shop, lines, date) {
  for (const x of lines) {
    VS.vcart = VS.vcart.filter(c => !(c.vendorId === shop.vendorId && c.date === date && c.listingId === x.listingId));
    VS.vcart.push({ vendorId: shop.vendorId, vendorName: shop.vendorName, type: shop.vendorType, mode: 'stock', date, listingId: x.listingId, name: `${x.name}${x.brand ? ` · ${x.brand}` : ''}`, nameHi: x.nameHi, unit: x.unit,
      price: x.unitPrice, qty: Math.min(x.units, x.stock || x.units), max: x.stock, photo: x.photo, emoji: '🌾', delivery: shop.delivery, fulfil: shop.delivery && shop.delivery.available ? 'delivery' : 'pickup', rule: x.rule, min: x.minQty || 1, kind: '' });
  }
  saveVCart();
}
async function viewRation(q) {
  const tab = q.get('tab') === 'compare' ? 'compare' : 'plan';
  const go = (k, v) => { const p = new URLSearchParams(q); if (v === '' || v == null) p.delete(k); else p.set(k, v); location.hash = '#/ration' + (p.toString() ? '?' + p : ''); };
  skeleton(4);
  const date = vDate(), loc = GEO.get();
  const { ingredients, groups, qualities } = VS.ingCat || (VS.ingCat = await api('/api/ingredients'));
  // which shops: near the ghar pin, the customer's district, or all of Bihar & UP
  const allArea = q.get('area') === 'all';
  const where = () => (loc ? locParams() : S.district && !allArea ? { district: S.district } : {});
  const areaSel = loc ? '' : `<select class="input" data-rarea aria-label="Area"><option value="">📍 ${h(S.district ? (district(S.district) || {}).name || 'My district' : 'My district')}</option><option value="all" ${allArea ? 'selected' : ''}>All Bihar & UP</option></select>`;
  app().innerHTML = `<section class="vhero ration-hero"><div class="vhero-txt"><h1>🌾 Shaadi Ration & Ingredients</h1>
      <p>Rice, atta, dal, oil, ghee, masale, dry fruits and sabzi for the wedding bhoj — work out how much you need for your guests, compare every local shop and order with delivery.</p>
      <div class="car-links"><a class="btn btn-gold btn-sm" href="#/vendors?type=ration">🏪 All ration shops</a><a class="btn btn-light btn-sm" href="#/vendors?type=vegetable">🥬 Sabzi shops</a><a class="btn btn-light btn-sm" href="#/vendor-join?type=ration">List your shop free</a></div></div>
      <div id="vDateSlot"></div></section>
    <div class="vsubtabs"><button data-rtab="plan" class="${tab === 'plan' ? 'on' : ''}">🧮 Plan for my guests</button><button data-rtab="compare" class="${tab === 'compare' ? 'on' : ''}">⚖️ Compare prices</button></div>
    ${locBar('ration shops', q.get('km') || '0')}
    <div id="rBody"><div class="spinner"></div></div>`;
  $('#vDateSlot').appendChild(vDateBar(() => viewRation(q)));
  $$('[data-rtab]').forEach(b => b.addEventListener('click', () => { const p = new URLSearchParams(); if (b.dataset.rtab === 'compare') p.set('tab', 'compare'); location.hash = '#/ration' + (p.toString() ? '?' + p : ''); }));
  bindLocBar(go);
  $('#rBody').addEventListener('change', e => { if (e.target.matches('[data-rarea]')) go('area', e.target.value); });
  if (tab === 'compare') return rationCompare(q, go, { date, ingredients, groups, qualities, where, areaSel });

  // ---- planner: guests → ingredient list (editable) → quotations from every shop ----
  const P = store.get('rationPlan', null) || { guests: 200, menu: 'standard', qty: {}, off: {} };
  const factor = () => (MENUS.find(m => m[0] === P.menu) || MENUS[1])[2];
  const qtyOf = i => (P.qty[i.key] != null ? P.qty[i.key] : planQty(i, P.guests, factor()));
  const saveP = () => store.set('rationPlan', P);
  const draw = () => {
    const chosen = ingredients.filter(i => !P.off[i.key]);
    $('#rBody').innerHTML = `<div class="rp-grid"><section class="panel rp-list">
        <div class="rp-top"><div class="field"><label>👥 Guests</label><input type="number" id="rpGuests" min="10" max="10000" step="25" value="${P.guests}"><div class="rp-chips">${[100, 200, 300, 500, 1000].map(n => `<button type="button" data-rpg="${n}" class="${P.guests === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
          <div class="field"><label>🍛 Menu</label><select id="rpMenu" class="input">${MENUS.map(([k, n]) => `<option value="${k}" ${P.menu === k ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="small muted">Rough estimates — change any quantity.</span></div></div>
        ${groups.map(g => `<div class="rp-g"><h4>${h(g)}</h4>${ingredients.filter(i => i.group === g).map(i => `<label class="rp-row ${P.off[i.key] ? 'off' : ''}"><input type="checkbox" data-rpon="${i.key}" ${P.off[i.key] ? '' : 'checked'}>
            <span class="rp-n">${h(i.name)} <small class="muted">${h(i.hi)}</small></span>
            <span class="rp-q"><input type="number" min="0" step="${i.unit === 'kg' && i.per100 < 1 ? 0.1 : 0.5}" value="${qtyOf(i)}" data-rpq="${i.key}" ${P.off[i.key] ? 'disabled' : ''}> ${h(i.unit)}${P.qty[i.key] != null ? '<i title="Changed by you">✎</i>' : ''}</span></label>`).join('')}</div>`).join('')}
        <div class="rp-actions"><button type="button" class="btn btn-light btn-sm" id="rpReset">↺ Recalculate for ${P.guests} guests</button></div>
      </section>
      <aside class="panel rp-side"><h3 style="margin:0 0 6px">🧾 Your list</h3><p class="small muted" style="margin:0 0 10px"><b>${chosen.length}</b> ingredients for <b>${P.guests}</b> guests · ${fmtDate(date)}</p>
        ${areaSel ? `<div class="field" style="margin-bottom:10px"><label>Shops from</label>${areaSel}</div>` : ''}
        <button class="btn btn-gold btn-block btn-lg" id="rpQuote">⚖️ Get quotations from shops →</button>
        <p class="small muted" style="margin:8px 0 0">Every nearby ration & sabzi shop prices your whole list with their bulk rates, minimum order, stock and delivery charge. Cheapest first.</p></aside></div>
      <div id="rpQuotes"></div>`;
  };
  draw();
  const body = $('#rBody');
  body.addEventListener('click', e => {
    const g = e.target.closest('[data-rpg]'); if (g) { P.guests = Number(g.dataset.rpg); P.qty = {}; saveP(); draw(); return; }
    if (e.target.closest('#rpReset')) { P.qty = {}; saveP(); draw(); toast(`Quantities worked out again for ${P.guests} guests`); return; }
    if (e.target.closest('#rpQuote')) return quote();
    const add = e.target.closest('[data-rpadd]');
    if (add) { const s = VS.lastQuote[add.dataset.rpadd]; addRationLines(s, s.lines, date); toast(`${s.lines.length} items from ${s.vendorName} added to cart ✓`); add.outerHTML = '<a class="btn btn-primary btn-sm" href="#/cart">✓ In cart — view cart →</a>'; return; }
    const mix = e.target.closest('[data-rpmix]');
    if (mix) { for (const s of VS.lastMix.shops) addRationLines(s, s.lines, date); toast(`Cheapest mix added: ${VS.lastMix.shops.length} shops ✓`); mix.outerHTML = '<a class="btn btn-primary btn-sm" href="#/cart">✓ In cart — view cart →</a>'; }
  });
  body.addEventListener('change', e => {
    if (e.target.id === 'rpGuests') { P.guests = Math.max(10, Math.min(10000, Math.round(Number(e.target.value)) || 100)); P.qty = {}; saveP(); draw(); return; }
    if (e.target.id === 'rpMenu') { P.menu = e.target.value; P.qty = {}; saveP(); draw(); return; }
    const on = e.target.closest('[data-rpon]'); if (on) { P.off[on.dataset.rpon] = !on.checked; saveP(); draw(); return; }
    const qi = e.target.closest('[data-rpq]'); if (qi) { P.qty[qi.dataset.rpq] = Math.max(0, Number(qi.value) || 0); saveP(); }
  });
  async function quote() {
    const items = ingredients.filter(i => !P.off[i.key]).map(i => ({ key: i.key, qty: qtyOf(i) })).filter(x => x.qty > 0);
    const box = $('#rpQuotes'); box.innerHTML = '<div class="spinner"></div>';
    let r;
    try { r = await api('/api/ration/quote', { method: 'POST', body: { date, items, ...where() } }); } catch (err) { box.innerHTML = `<p class="err">${h(err.message)}</p>`; return; }
    VS.lastQuote = Object.fromEntries(r.quotes.map(x => [x.vendorId, x])); VS.lastMix = r.bestMix;
    const nameOf = k => (ingredients.find(i => i.key === k) || { name: k }).name;
    const lineRows = s => s.lines.map(x => `<tr><td>${h(nameOf(x.key))}<br><small class="muted">${h(x.name)}${x.brand ? ` · ${h(x.brand)}` : ''}${x.quality ? ` · ${h(x.quality)}` : ''}</small></td>
        <td>${x.units} ${h(x.unit)}${x.packSize !== 1 ? `<br><small class="muted">= ${Math.round(x.units * x.packSize * 100) / 100} ${x.unit === 'litre' || /oil/.test(x.key) ? 'L' : 'kg'}</small>` : ''}</td>
        <td>${inr(x.unitPrice)}${x.bulk ? ' <span class="ok-txt small">bulk ✓</span>' : ''}${x.short ? `<br><small class="bad-txt">only ${x.stock} in stock</small>` : ''}</td><td><b>${inr(x.cost)}</b></td></tr>`).join('');
    const deliv = s => (s.deliveryCharge == null ? 'Pickup only' : s.deliveryCharge ? `Delivery ${inr(s.deliveryCharge)}` : '🚚 Free delivery');
    const card = (s, i) => `<details class="panel rq ${i === 0 && !s.missing.length ? 'best' : ''}" ${i === 0 ? 'open' : ''}><summary>
        <div class="rq-h"><b>${h(s.vendorName)}</b>${s.sample ? ' <span class="vsample inline">Sample</span>' : ''}<small class="muted">${s.km != null ? `📍 ${GEO.kmText(s.km, s.kmApprox)} · ` : ''}${h(s.districtName)}${s.reviews ? ` · ★ ${s.rating}` : ''} · ${deliv(s)}</small></div>
        <div class="rq-cov ${s.missing.length ? 'part' : ''}">${s.lines.length}/${items.length} items</div>
        <div class="rq-t"><b>${inr(s.total)}</b>${i === 0 && !s.missing.length ? '<small class="ok-txt">Cheapest full quote</small>' : ''}</div></summary>
      <div class="rq-body">${s.missing.length ? `<p class="small bad-txt" style="margin:0 0 6px">Does not sell: ${s.missing.map(k => h(nameOf(k))).join(', ')}</p>` : ''}
        <div class="tbl-wrap"><table class="tbl rq-tbl"><thead><tr><th>Ingredient</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${lineRows(s)}</tbody></table></div>
        <div class="rq-foot"><span class="small">Items ${inr(s.subtotal)} · ${deliv(s)}</span><span style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-light btn-sm" href="#/v/${s.vendorId}">View shop</a><button type="button" class="btn btn-gold btn-sm" data-rpadd="${s.vendorId}">🛒 Add this quote to cart</button></span></div></div></details>`;
    box.innerHTML = r.quotes.length ? `<h2 class="rq-title">⚖️ Quotations for ${P.guests} guests <small class="muted">${r.quotes.length} shop${r.quotes.length > 1 ? 's' : ''} · ${fmtDate(r.date)}${r.lagan ? ' · 🪔 lagan rates' : ''}</small></h2>
        ${r.bestMix && r.bestMix.shops.length > 1 ? `<div class="panel rq-mix"><div><b>💡 Cheapest mix: ${inr(r.bestMix.total)}</b><small>Buy each ingredient where it is cheapest — ${r.bestMix.shops.map(s => `${h(s.vendorName)} (${s.lines.length})`).join(' + ')}${r.bestMix.missing.length ? ` · ${r.bestMix.missing.length} not available` : ''}</small></div><button type="button" class="btn btn-gold btn-sm" data-rpmix="1">🛒 Add cheapest mix to cart</button></div>` : ''}
        ${r.quotes.map(card).join('')}
        <p class="small muted">Prices include each shop's bulk rates for these quantities. Orders go to the shop as a request — they confirm and deliver; you pay the shop directly.</p>`
      : '<div class="panel empty"><div class="big">🌾</div><h3>No ration shop found nearby</h3><p class="muted">Try "Show all districts" with a wider distance, or set your ghar location.</p></div>';
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (q.get('quote')) quote();
}
// Compare one ingredient across every shop (cheapest per kg / litre first)
async function rationCompare(q, go, { date, ingredients, groups, qualities, where, areaSel }) {
  const item = q.get('item');
  const qs = new URLSearchParams({ date, ...where() });
  if (!item) {
    const r = await api('/api/ration/compare?' + qs);
    $('#rBody').innerHTML = (areaSel ? `<div class="panel vtoolbar"><span class="small"><b>Shops from</b></span>${areaSel}<span class="small muted">Tap an ingredient to compare every shop, cheapest per kg / litre first.</span></div>` : '') + groups.map(g => `<section class="panel rc-g"><h3>${h(g)}</h3><div class="rc-tiles">${r.ingredients.filter(i => i.group === g).map(i => `<button type="button" class="rc-tile" data-rci="${i.key}"><b>${h(i.name)}</b><small class="muted">${h(i.hi)}</small>
        <span>${i.offers ? `from <b>${inr(i.minPerBase)}</b>/${h(i.unit)}${i.maxPerBase > i.minPerBase ? ` <small class="muted">to ${inr(i.maxPerBase)}</small>` : ''}` : '<span class="muted">no shop yet</span>'}</span><small>${i.offers} shop${i.offers === 1 ? '' : 's'}</small></button>`).join('')}</div></section>`).join('');
    $$('[data-rci]').forEach(b => b.addEventListener('click', () => go('item', b.dataset.rci)));
    return;
  }
  for (const [k, key] of [['quality', 'quality'], ['brand', 'brand'], ['delivery', 'delivery'], ['sort', 'sort'], ['km', 'km']]) if (q.get(k)) qs.set(key, q.get(k));
  if (q.get('stock') !== '0') qs.set('inStock', '1');
  qs.set('item', item);
  const r = await api('/api/ration/compare?' + qs);
  const ing = r.ingredient, base = ing.unit === 'litre' ? 'L' : 'kg';
  const row = (o, i) => `<div class="rc-offer ${i === 0 ? 'best' : ''}">
      ${ph(o.photo, '🌾', '#f6f1e7', 'rc-ph')}
      <div class="rc-info"><b>${h(o.name)}</b>${i === 0 ? ' <span class="rc-best">Cheapest</span>' : ''}<div class="cd-tags">${o.brand ? `<span>🏷️ ${h(o.brand)}</span>` : ''}${o.quality ? `<span>${h(o.quality)}</span>` : ''}</div>
        <a class="link small" href="#/v/${o.vendorId}">${h(o.vendorName)}</a>${o.sample ? ' <span class="vsample inline">Sample</span>' : ''}
        <div class="small muted">${o.km != null ? `📍 ${GEO.kmText(o.km, o.kmApprox)} · ` : ''}${h(o.districtName)}${o.reviews ? ` · ★ ${o.rating}` : ''} · ${o.delivery.available ? (o.delivery.charge ? `🚚 ${inr(o.delivery.charge)}${o.delivery.freeAbove ? `, free above ${inr(o.delivery.freeAbove)}` : ''}` : '🚚 Free delivery') : '🏪 Pickup only'}</div>
        ${o.bulkTiers.length ? `<div class="bulk-chips"><span class="muted">Bulk:</span>${o.bulkTiers.map(t => `<span>${t.min}+ ${h(o.unit)} <b>${inr(t.price)}</b></span>`).join('')}</div>` : ''}
        <div class="small">${o.stock > 0 ? `<span class="ok-txt">${o.stock} ${h(o.unit)} in stock</span>` : '<span class="bad-txt">Out of stock</span>'}${o.minQty > 1 ? ` · min ${o.minQty} ${h(o.unit)}` : ''}${o.avail === 'closed' ? ' · <span class="bad-txt">closed on this date</span>' : ''}</div></div>
      <div class="rc-buy"><div class="rc-price"><b>${inr(o.price)}</b><small>/${h(o.unit)}</small>${perBaseText(o)}</div>
        ${o.stock > 0 && o.avail !== 'closed' ? `<div class="rc-add"><input type="number" min="${Math.max(1, o.minQty)}" max="${o.stock}" value="${Math.max(1, o.minQty)}" data-rcq="${o.listingId}" aria-label="Quantity"><button type="button" class="btn btn-primary btn-sm" data-rcadd="${o.listingId}">+ Add</button></div>` : ''}</div></div>`;
  $('#rBody').innerHTML = `<div class="crumbs"><a class="link" data-rcback>⚖️ All ingredients</a> › ${h(ing.name)}</div>
    <div class="panel vtoolbar">
      ${areaSel}
      ${(r.brands || []).length > 1 || q.get('brand') ? `<select id="rcBrand" class="input" aria-label="Company / brand"><option value="">Any company / brand (${(r.brands || []).length})</option>${(r.brands || []).map(b => `<option value="${h(b.name)}" ${q.get('brand') === b.name ? 'selected' : ''}>${h(b.name)} · from ${inr(b.minPerBase)}/${base}${b.n > 1 ? ` · ${b.n} shops` : ''}</option>`).join('')}</select>` : ''}
      <select id="rcQuality" class="input"><option value="">Any quality</option>${qualities.map(x => `<option ${q.get('quality') === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <select id="rcDel" class="input">${[['', 'Delivery: any'], ['available', 'Delivers to home'], ['free', 'Free delivery']].map(([v, l]) => `<option value="${v}" ${(q.get('delivery') || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select id="rcSort" class="input">${[['', `Cheapest per ${base}`], ['near', 'Nearest shop'], ['rating', 'Top rated'], ['price-desc', 'Highest price']].map(([v, l]) => `<option value="${v}" ${(q.get('sort') || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label class="small vonly"><input type="checkbox" id="rcStock" ${q.get('stock') !== '0' ? 'checked' : ''}> In stock & open on ${shortDate(date)}</label>
    </div>
    <div class="vcount"><b>${r.total}</b> offer${r.total === 1 ? '' : 's'} for <b>${h(ing.name)}</b> ${h(ing.hi)} · cheapest per ${base} first</div>
    ${r.offers.length ? `<div class="panel rc-list">${r.offers.map(row).join('')}</div>` : '<div class="panel empty"><div class="big">🔍</div><h3>No shop matches these filters</h3><p class="muted">Try any quality / delivery, or a wider area.</p></div>'}`;
  $('[data-rcback]').addEventListener('click', () => go('item', ''));
  [['#rcBrand', 'brand'], ['#rcQuality', 'quality'], ['#rcDel', 'delivery'], ['#rcSort', 'sort']].forEach(([s, k]) => { const el = $(s); if (el) el.addEventListener('change', e => go(k, e.target.value)); });
  $('#rcStock').addEventListener('change', e => go('stock', e.target.checked ? '' : '0'));
  $$('[data-rcadd]').forEach(b => b.addEventListener('click', () => {
    const o = r.offers.find(x => x.listingId === b.dataset.rcadd), n = Math.max(o.minQty || 1, Math.min(o.stock, Math.round(Number($(`[data-rcq="${o.listingId}"]`).value)) || 1));
    addRationLines({ vendorId: o.vendorId, vendorName: o.vendorName, vendorType: o.vendorType, delivery: o.delivery }, [{ ...o, units: n, unitPrice: ruleUnit(o.rule, n) }], date);
    flyToCart(b.closest('.rc-offer').querySelector('.rc-ph')); toast(`${n} ${o.unit} ${o.name} from ${o.vendorName} added ✓`);
  }));
}

/* ---------------- Wedding card gallery: every design from every printer ---------------- */
async function viewCardGallery(q) {
  const loc = GEO.get();
  const p = { q: q.get('q') || '', type: q.get('type') || '', print: q.get('print') || '', paper: q.get('paper') || '', max: q.get('max') || '', qty: q.get('qty') || '200', sort: q.get('sort') || '', dist: q.get('dist') || '' };
  const go = (k, val) => { const u = new URLSearchParams(q); if (val === '' || val == null) u.delete(k); else u.set(k, val); location.hash = '#/cards' + (u.toString() ? '?' + u : ''); };
  skeleton(6);
  const qs = new URLSearchParams({ qty: p.qty });
  for (const [k, key] of [['q', 'q'], ['type', 'cardType'], ['print', 'printing'], ['paper', 'paper'], ['max', 'max'], ['sort', 'sort'], ['dist', 'district']]) if (p[k]) qs.set(key, p[k]);
  if (loc) for (const [k, val] of Object.entries(locParams())) qs.set(k, val);
  const r = await api('/api/card-designs?' + qs);
  window.I18N.setNames(r.designs.map(x => [x.name, x.nameHi]));
  const viewsOf = x => (x.cardViews ? [[x.cardViews.front, 'Front'], [x.cardViews.back, 'Back'], ...(x.cardViews.inside || []).map((u, i) => [u, `Inside ${i + 1}`])] : x.photos.map((u, i) => [u, i ? `Photo ${i + 1}` : 'Front'])).filter(v => v[0]);
  const tile = x => {
    const views = viewsOf(x), n = Number(p.qty) || x.minQty, enough = n >= x.minQty;
    return `<div class="cdesign">
      <button type="button" class="cd-ph" data-gpics="${x.id}">${ph(views[0] ? views[0][0] : '', '💌', '#fbf3f6')}${x.sample ? '<span class="vsample">Sample</span>' : ''}<span class="pg-count">📷 ${views.length}</span></button>
      ${views.length > 1 ? `<div class="cd-thumbs">${views.slice(0, 4).map((v, i) => `<button type="button" data-gpics="${x.id}" data-i="${i}" title="${h(v[1])}"><img src="${h(v[0])}" alt="${h(v[1])}" loading="lazy"><small>${h(v[1])}</small></button>`).join('')}</div>` : ''}
      <div class="cd-body"><b class="cd-name">${h(x.name)}</b><div class="small muted">${h(x.vendorName)} · 📍 ${x.km != null ? `${GEO.kmText(x.km, x.kmApprox)} · ` : ''}${h(x.districtName)}</div>
        <div class="cd-tags">${x.cardType ? `<span>${h(x.cardType)}</span>` : ''}${x.paper ? `<span>📄 ${h(x.paper)}</span>` : ''}${x.printing.map(pr => `<span>🖨️ ${h(pr)}</span>`).join('')}</div>
        <div class="cd-price"><b>${inr(x.priceForQty)}</b><small>/card</small> <span class="muted small">for ${x.forQty} cards</span>${x.priceForQty < x.price ? ` <s class="small muted">${inr(x.price)}</s>` : ''}</div>
        <div class="small">${enough ? `≈ <b>${inr(x.priceForQty * n)}</b> for ${n} cards` : `<span class="bad-txt">Minimum ${x.minQty} cards</span>`} · min ${x.minQty}${x.leadDays ? ` · ⏱ ${x.leadDays} days` : ''}</div>
        ${x.addons.length ? `<div class="small muted">Add-ons: ${x.addons.map(a => `${h(a.name)}${a.price ? ` +${inr(a.price)}` : ''}`).join(', ')}</div>` : ''}
        <a class="btn btn-primary btn-sm btn-block" href="#/v/${x.vendorId}?design=${x.id}&qty=${Math.max(n, x.minQty)}" ${x.inStock ? '' : 'aria-disabled="true"'}>${x.inStock ? 'Choose this design →' : 'Not taking orders'}</a></div></div>`;
  };
  const opt = (arr, cur, any) => `<option value="">${any}</option>` + arr.map(x => `<option ${x === cur ? 'selected' : ''}>${h(x)}</option>`).join('');
  app().innerHTML = `<section class="vhero cards-hero"><div class="vhero-txt"><h1>💌 Shaadi Card Designs</h1>
      <p>Every design from local card printers — see the front, back and inside, compare paper and printing, and see the price for the number of cards you need. Cheapest first.</p></div>
      <div class="vdate-box cg-qty"><label>🔢 How many cards?</label><input type="number" id="cgQty" min="10" step="50" value="${h(p.qty)}"><div class="vchips">${[100, 200, 300, 500, 1000].map(n => `<button data-cgq="${n}" class="${String(n) === p.qty ? 'on' : ''}">${n}</button>`).join('')}</div></div></section>
    ${locBar('card printers', '0')}
    <div class="panel vtoolbar">
      <form id="cgSearch" class="vsearch"><input name="q" class="input" placeholder="Search design, colour, printer…" value="${h(p.q)}"><button class="btn btn-primary btn-sm">🔍</button></form>
      <select id="cgType" class="input">${opt(r.facets.cardTypes, p.type, 'All card types')}</select>
      <select id="cgPrint" class="input">${opt(r.facets.printing, p.print, 'Any printing')}</select>
      <select id="cgPaper" class="input">${opt(r.facets.papers, p.paper, 'Any paper')}</select>
      <select id="cgMax" class="input">${[['', 'Any price'], ['10', 'Up to ₹10/card'], ['25', 'Up to ₹25/card'], ['50', 'Up to ₹50/card'], ['100', 'Up to ₹100/card']].map(([v, l]) => `<option value="${v}" ${p.max === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select id="cgSort" class="input">${[['', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['moq', 'Smallest minimum order'], ...(loc ? [['near', 'Nearest printer']] : [])].map(([v, l]) => `<option value="${v}" ${p.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    <div class="vcount"><b>${r.total}</b> design${r.total === 1 ? '' : 's'} · price per card for <b>${h(p.qty)}</b> cards${p.type || p.print || p.paper || p.max || p.q ? ' · <a class="link" data-cgclear>Clear filters</a>' : ''}</div>
    ${r.designs.length ? `<div class="cd-grid cd-grid-wide">${r.designs.map(tile).join('')}</div>` : `<div class="panel empty"><div class="big">💌</div><h3>No card designs match</h3><p class="muted">Try another card type or price, or clear the filters.</p><a class="btn btn-gold" href="#/vendor-join?type=cards">Are you a card printer? Join free →</a></div>`}
    <div class="panel vjoin"><div><b>Do you print shaadi cards?</b> Upload your designs with front, back and inside photos, set bulk rates — customers order straight from this gallery.</div><a class="btn btn-gold" href="#/vendor-join?type=cards">Join as Card Printer →</a></div>`;
  $('#cgSearch').addEventListener('submit', e => { e.preventDefault(); go('q', e.target.q.value.trim()); });
  sectionSuggest($('#cgSearch input'), 'cards', raw => go('q', raw), x => `#/cards?q=${encodeURIComponent(x.name)}`);
  [['#cgType', 'type'], ['#cgPrint', 'print'], ['#cgPaper', 'paper'], ['#cgMax', 'max'], ['#cgSort', 'sort']].forEach(([s, k]) => $(s).addEventListener('change', e => go(k, e.target.value)));
  $('#cgQty').addEventListener('change', e => go('qty', String(Math.max(10, Math.round(Number(e.target.value)) || 200))));
  $$('[data-cgq]').forEach(b => b.addEventListener('click', () => go('qty', b.dataset.cgq)));
  $$('[data-cgclear]').forEach(b => b.addEventListener('click', () => { location.hash = '#/cards' + (p.qty ? '?qty=' + p.qty : ''); }));
  $$('[data-gpics]').forEach(b => b.addEventListener('click', () => { const x = r.designs.find(y => y.id === b.dataset.gpics), views = viewsOf(x); photoViewer(views.map(v => v[0]), Number(b.dataset.i) || 0, x.name, views.map(v => v[1])); }));
  bindLocBar(go);
}

/* ---------------- Lagan dates (kept by Pandit Ji) ---------------- */
let laganP = null;
const laganDates = (fresh) => (!fresh && laganP) || (laganP = api('/api/lagan').then(r => { VS.laganSheets = r.sheets; return r.dates; }).catch(() => { laganP = null; return []; }));
// Public page: every upcoming lagan date by month, and the lagan sheet photos Pandit Ji uploaded
async function viewLagan() {
  skeleton(2);
  const list = await laganDates(true), sheets = VS.laganSheets || [];
  const months = {};
  for (const x of list) (months[x.date.slice(0, 7)] = months[x.date.slice(0, 7)] || []).push(x);
  app().innerHTML = `<section class="vhero lagan-hero"><div class="vhero-txt"><h1>🪔 Lagan Dates – Shubh Vivah Muhurat</h1>
      <p>Wedding dates listed by Pandit Ji. On lagan days demand is high — many vendors charge lagan rates, so book early. Tap a date to see who is free.</p></div></section>
    ${list.length ? Object.entries(months).map(([m, xs]) => `<section class="panel lagan-month"><h3>${new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} <small class="muted">${xs.length} lagan</small></h3>
      <div class="lagan-days">${xs.map(x => `<button data-lgd="${x.date}"><b>${Number(x.date.slice(8))}</b><span>${new Date(x.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}</span>${x.note ? `<small>${h(x.note)}</small>` : ''}</button>`).join('')}</div></section>`).join('')
    : '<div class="panel empty"><div class="big">🪔</div><h3>Lagan dates are being added</h3><p class="muted">Pandit Ji will publish this season\'s shubh vivah dates here soon.</p></div>'}
    ${sheets.length ? `<section class="panel lagan-month"><h3>📜 Lagan sheet${sheets.length > 1 ? 's' : ''}</h3><div class="lagan-sheets">${sheets.map(s => `<button data-lgs="${h(s.url)}" data-t="${h(s.title)}"><img src="${h(s.url)}" alt="${h(s.title)}" loading="lazy"><span>${h(s.title)}<small>by ${h(s.byName)}</small></span></button>`).join('')}</div></section>` : ''}
    <p class="small muted" style="text-align:center">Dates are given by Pandit Ji on Vivah Saathi. Please confirm the exact muhurat with your family Pandit Ji.</p>`;
  $$('[data-lgd]').forEach(b => b.addEventListener('click', () => { setVDate(b.dataset.lgd); toast('Date set to ' + fmtDate(b.dataset.lgd)); location.hash = '#/vendors'; }));
  $$('[data-lgs]').forEach(b => b.addEventListener('click', () => photoViewer(sheets.map(s => s.url), sheets.findIndex(s => s.url === b.dataset.lgs), 'Lagan sheet')));
}

/* ---------------- Ghar / venue location: nearest first ---------------- */
const LOC_KM = [['10', 'Within 10 km'], ['25', 'Within 25 km'], ['50', 'Within 50 km'], ['100', 'Within 100 km'], ['0', 'Any distance']];
const locParams = () => { const l = GEO.get(); return l ? { lat: l.lat, lng: l.lng, ...(l.pincode ? { pin: l.pincode } : {}) } : {}; };
const locQs = () => new URLSearchParams(locParams()).toString();
// "📍 4.2 km · Siwan" (+ "Same pincode") once the customer has set a location, else just the district
const placeLine = x => `<span class="muted small vplace">📍 ${x.km != null ? `<b>${GEO.kmText(x.km, x.kmApprox)}</b> · ` : ''}${h(x.districtName)}</span>${x.samePin ? '<span class="vpin">📮 Same pincode</span>' : ''}`;
function locBar(what, km) {
  const l = GEO.get();
  return l ? `<div class="panel locbar on"><span class="locbar-ic">🏠</span><div class="locbar-txt"><b>Nearest ${h(what)} first</b><small>from ${h(l.label)}${l.pincode ? ` · ${h(l.pincode)}` : ''}${l.approx ? ' (approx)' : ''}</small></div>
      <select class="input" data-lockm aria-label="Distance">${LOC_KM.map(([v, t]) => `<option value="${v}" ${km === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <button type="button" class="btn btn-light btn-sm" data-locset>Change</button><button type="button" class="locbar-x" data-locoff title="Remove location" aria-label="Remove location">×</button></div>`
    : `<button type="button" class="panel locbar" data-locset><span class="locbar-ic">🏠</span><span class="locbar-txt"><b>Shaadi ghar pe hai? Apna address daalein</b><small>Aas paas ki ${h(what)} pehle dikhenge — gaon / mohalla, pincode ya GPS</small></span><span class="btn btn-primary btn-sm">📍 Set location</span></button>`;
}
// distance filter events ([data-locset] / [data-locoff] are handled on the document); go(key, value) updates the page's URL
function bindLocBar(go) {
  $$('[data-lockm]').forEach(s => s.addEventListener('change', () => go('km', s.value)));
  $$('[data-farther]').forEach(b => b.addEventListener('click', () => go('km', '0')));
}
const countLine = (n, noun, km, distName, date, dist, beyond) => {
  const l = GEO.get();
  return `<div class="vcount"><b>${n}</b> ${noun}${n === 1 ? '' : 's'}${l ? (km !== '0' ? ` within <b>${h(km)} km</b>` : '') + ' · nearest first' : distName ? ` in ${h(distName)}` : ''} for <b>${fmtDate(date)}</b>${l && beyond ? ` · <a class="link" data-farther>+${beyond} farther away</a>` : ''}${!l && dist ? ' · <a class="link" data-alldist>Show all districts</a>' : ''}</div>`;
};

function vDateBar(onChange) {
  const d = vDate();
  const evChips = Object.entries(S.events).filter(([, x]) => x && x >= today()).sort((a, b) => a[1].localeCompare(b[1])).slice(0, 4);
  const el = document.createElement('div');
  el.className = 'vdate-box';
  el.innerHTML = `<label for="vDate">Function date</label>
    <input type="date" id="vDate" min="${today()}" value="${d}">
    ${evChips.length ? `<div class="vchips">${evChips.map(([e, x]) => `<button data-d="${x}" class="${d === x ? 'on' : ''}">${h(evShort(e))} · ${shortDate(x)}</button>`).join('')}</div>` : ''}`;
  // lagan (shubh vivah) dates from Pandit Ji: is the chosen date one, and the next few to pick from
  el.insertAdjacentHTML('beforeend', '<div class="vlagan" id="vLagan"></div>');
  laganDates().then(list => {
    const box = el.querySelector('#vLagan'); if (!box || !list.length) return;
    const on = list.find(x => x.date === d);
    box.innerHTML = `${on ? '<div class="vlagan-on">Lagan day</div>' : ''}
      <details class="booking-options"><summary>Lagan dates</summary><div class="vchips">${list.filter(x => x.date !== d).slice(0, 4).map(x => `<button data-d="${x.date}" title="${h(x.note || 'Shubh vivah lagan')}">${shortDate(x.date)}</button>`).join('')}<a class="small link" href="#/lagan">Full calendar</a></div></details>`;
  });
  el.addEventListener('change', e => { if (e.target.id === 'vDate' && e.target.value) { setVDate(e.target.value); onChange(); } });
  el.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) { setVDate(b.dataset.d); onChange(); } });
  return el;
}

/* ---------------- Listing page ---------------- */
async function viewVendors(q, opts = {}) {
  const type = q.get('type') || '';
  const ark = opts.arkestra || type === 'orchestra';
  const t = type ? vtype(type) : null;
  const loc = GEO.get();
  // with a ghar / venue location, vendors from every nearby district count (not only the customer's own)
  const params = { q: q.get('q') || '', sub: q.get('sub') || '', dist: q.get('dist') ?? (loc ? '' : S.district || ''), state: q.get('state') || '', rating: q.get('rating') || '', sort: q.get('sort') || '', min: q.get('min') || '', max: q.get('max') || '', avail: q.get('avail') !== '0', km: q.get('km') || '50' };
  const base = opts.arkestra ? '#/arkestra' : '#/vendors';
  const go = (k, v) => { const p = new URLSearchParams(q); if (opts.arkestra) p.delete('type'); if (v === '' || v == null) p.delete(k); else p.set(k, v); location.hash = base + (p.toString() ? '?' + p : ''); };
  skeleton(8);
  // Step 1: pick a kind of vendor (nothing heavy loads until then). Step 2: date + place. Step 3: only who is free.
  const needDate = ark || (t && t.mode !== 'stock'), place = loc || params.dist || S.district;
  if ((!type && !params.q && !ark) || ((type || ark) && ((needDate && !chosenDate()) || !place))) {
    const { types } = await api('/api/vtypes');
    const counts = Object.fromEntries(types.map(x => [x.id, x.count]));
    const pick = !type && !ark, kind = ark ? 'arkestra & artists' : t ? t.name.toLowerCase() : 'vendors';
    app().innerHTML = `
      <section class="vhero ${ark ? 'ark-hero' : ''}"><div class="vhero-txt"><h1>${pick ? 'Book Local Wedding Vendors' : ark ? '🎤 Arkestra Booking' : `${t.emoji} ${h(t.name)}`}</h1>
        <p>${pick ? 'Choose what you need — then tell us your date and place, and see only the vendors who are free for you.' : 'Tell us your function date and place — we show only who is free on your date and serves your area.'}</p></div></section>
      ${pick ? `<div class="vcat-grid">${VTYPES.map(x => `<a class="vcat" href="${x.id === 'orchestra' ? '#/arkestra' : `#/vendors?type=${x.id}`}">
          <img src="${unsplash(x.img, 360, 220)}" alt="" loading="lazy" onerror="this.remove()"><span><b>${x.emoji} ${h(x.name)}</b><small>${counts[x.id] || 0} vendor${counts[x.id] === 1 ? '' : 's'}</small></span></a>`).join('')}</div>`
      : `<div class="panel vgate"><h3>Your function date and place</h3>
          <div class="vgate-f">${needDate ? `<label>Function date<input type="date" class="input" id="vgDate" min="${today()}" value="${h(chosenDate())}"></label>` : ''}
            <label>District<button type="button" class="btn btn-light" data-act="district">${S.district ? h(district(S.district).name) : 'Select district'}</button></label></div>
          <p class="small muted" style="margin:10px 0 0">${[needDate && !chosenDate() && 'pick your function date', !place && `choose your district (or set your ghar / venue location below for the nearest ${h(kind)})`].filter(Boolean).join(' and ').replace(/^./, c => c.toUpperCase())}.</p></div>
        ${locBar(kind, params.km)}`}
      <div class="panel vjoin"><div><b>Are you a vendor or artist?</b> Tent, phool, band baja, car, halwai, DJ, mehndi, makeup, marriage hall, orchestra, studio, pandit ji, shops — list your business for free.</div><a class="btn btn-gold" href="#/vendor-join">Join as Vendor / Artist →</a></div>`;
    const vg = $('#vgDate'); if (vg) vg.addEventListener('change', () => { if (vg.value) { setVDate(vg.value); viewVendors(q, opts); } });
    if (!pick) bindLocBar(go);
    return;
  }
  const date = vDate();
  const qs = new URLSearchParams({ date });
  if (type) qs.set('type', type);
  for (const [k, key] of [['q', 'q'], ['sub', 'subtype'], ['rating', 'rating'], ['sort', 'sort'], ['min', 'min'], ['max', 'max']]) if (params[k]) qs.set(key, params[k]);
  if (params.dist) qs.set('district', params.dist); else if (params.state) qs.set('state', params.state);
  if (params.avail) qs.set('avail', '1');
  if (ark) qs.set('ahead', '1'); // arkestra cards show free dates for the next 5 months
  if (loc) { for (const [k, v] of Object.entries(locParams())) qs.set(k, v); if (params.km !== '0') qs.set('km', params.km); }
  const [{ vendors, total, beyond }, typesRes] = await Promise.all([api('/api/vendors?' + qs), api('/api/vtypes')]);
  VS.last = vendors;
  window.I18N.setNames(vendors.map(v => [v.name, v.nameHi]));
  const counts = Object.fromEntries(typesRes.types.map(x => [x.id, x.count]));
  const distName = params.dist ? (district(params.dist) || {}).name : '';
  app().innerHTML = `
    <section class="vhero ${ark ? 'ark-hero' : ''}">
      <div class="vhero-txt">${ark ? `<h1>🎤 Arkestra Booking</h1>
        <p>Bhojpuri stage shows, orchestra groups, singers, dancers, jagran & anchors for tilak, shaadi and baraat nights — see who is free on your date and book.</p>`
      : `<h1>${t ? `${t.emoji} ${h(t.name)}` : 'Book Local Wedding Vendors'}</h1>
        <p>Verified vendors from your district — see who is free on your date, compare prices and book directly.</p>`}</div>
      <div id="vDateSlot"></div>
    </section>
    ${ark ? '' : `<div class="vtabs">
      <a href="#/vendors${params.dist ? '?dist=' + h(encodeURIComponent(params.dist)) : ''}" class="${!type ? 'on' : ''}">🤝 All</a>
      ${VTYPES.map(x => `<a href="${x.id === 'orchestra' ? '#/arkestra' : `#/vendors?type=${x.id}`}${x.id !== 'orchestra' && params.dist ? '&dist=' + h(encodeURIComponent(params.dist)) : ''}" class="${x.id === type ? 'on' : ''}">${x.emoji} ${h(x.name)} <small>${counts[x.id] || 0}</small></a>`).join('')}
    </div>`}
    ${t && t.subtypes ? `<div class="vsubtabs ${ark ? 'ark-tabs' : ''}"><button data-sub="" class="${!params.sub ? 'on' : ''}">${ark ? '🎤 All' : 'All'}</button>${t.subtypes.map(([id, n]) => `<button data-sub="${id}" class="${params.sub === id ? 'on' : ''}">${ark ? (id === 'group' ? '🎶 ' : '⭐ ') : ''}${h(n)}</button>`).join('')}</div>` : ''}
    ${locBar(ark ? 'arkestra & artists' : t ? t.name.toLowerCase() : 'vendors', params.km)}
    <div class="panel vtoolbar">
      <form id="vSearch" class="vsearch"><input name="q" class="input" placeholder="Search vendor, item, area..." value="${h(params.q)}"><button class="btn btn-primary btn-sm">🔍</button></form>
      <button type="button" class="btn btn-light btn-sm vfilt-btn" id="vFiltBtn">⚙️ Filters${[params.state, params.rating, params.sort, params.min, params.max].filter(Boolean).length ? ` (${[params.state, params.rating, params.sort, params.min, params.max].filter(Boolean).length})` : ''}</button>
      <select id="vState" class="input"><option value="">Bihar + UP</option><option ${params.state === 'Bihar' ? 'selected' : ''}>Bihar</option><option ${params.state === 'Uttar Pradesh' ? 'selected' : ''}>Uttar Pradesh</option></select>
      <select id="vDist" class="input"><option value="">All districts</option>${S.meta.districts.filter(d => !params.state || d.state === params.state).map(d => `<option value="${d.id}" ${d.id === params.dist ? 'selected' : ''}>${h(d.name)}</option>`).join('')}</select>
      <select id="vRating" class="input"><option value="">Any rating</option>${[['3', '3★ & up'], ['4', '4★ & up'], ['4.5', '4.5★ & up']].map(([v, l]) => `<option value="${v}" ${params.rating === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select id="vSort" class="input">${[['', loc ? 'Free first, then nearest' : 'Recommended'], ...(loc ? [['near', 'Nearest first']] : []), ['price-asc', 'Price: Low to High'], ['price-desc', 'Price: High to Low'], ['rating', 'Top rated']].map(([v, l]) => `<option value="${v}" ${params.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <form id="vPrice" class="price-inputs"><input name="min" type="number" min="0" placeholder="Min ₹" value="${h(params.min)}"><input name="max" type="number" min="0" placeholder="Max ₹" value="${h(params.max)}"><button class="btn btn-light btn-sm">Go</button></form>
      <label class="small vonly"><input type="checkbox" id="vAvail" ${params.avail ? 'checked' : ''}> Only available on ${shortDate(date)}</label>
      ${t && t.mode === 'stock' ? '<button class="btn btn-gold btn-sm" id="vPriceCmp">⚖️ Compare prices</button>' : ''}
    </div>
    ${type === 'vehicle' ? '<a class="panel car-switch" href="#/cars"><span>🚗 <b>See every car one by one</b> — Bolero, Scorpio, Innova… each with its vendor or owner</span><span class="btn btn-gold btn-sm">Book a Car →</span></a>' : ''}
    ${['ration', 'vegetable'].includes(type) ? '<div class="panel car-switch ration-switch"><span>🧮 <b>How much ration for your guests?</b> Enter the number of guests — get the full ingredient list and quotations from every shop</span><span style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-gold btn-sm" href="#/ration">Plan & compare →</a><a class="btn btn-light btn-sm" href="#/ration?tab=compare">⚖️ Compare prices</a></span></div>' : ''}
    ${type === 'cards' ? '<a class="panel car-switch" href="#/cards"><span>💌 <b>See every card design in one gallery</b> — front, back & inside photos, paper, printing and price for your quantity</span><span class="btn btn-gold btn-sm">Card designs →</span></a>' : ''}
    ${countLine(total, 'vendor', params.km, distName, date, params.dist, beyond)}
    ${vendors.length ? (ark && !params.sub ? arkGroupsHtml(vendors, date) : `<div class="vgrid">${vendors.map(v => vCard(v, date)).join('')}</div>`)
      : t && !counts[type] ? (() => {
        // nobody of this kind has joined yet: invite them, and point customers to the shop meanwhile
        const shopCat = Object.keys(CAT_VENDORS).find(c => CAT_VENDORS[c].includes(type));
        return `<div class="panel empty"><div class="big">${t.emoji}</div><h3>No ${h(t.name)} listed yet</h3><p class="muted">We are adding local ${h(t.name.toLowerCase())} in every district. Do you offer this service? List yourself free — customers near you will see you first.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-gold" href="#/vendor-join?type=${type}">Join as ${h(t.name)} →</a>${shopCat ? `<a class="btn btn-light" href="#/c/${shopCat}">Book from our shop meanwhile</a>` : ''}</div></div>`;
      })()
      : loc && beyond ? `<div class="panel empty"><div class="big">📍</div><h3>No ${ark ? 'arkestra' : 'vendors'} within ${h(params.km)} km of your ghar</h3><p class="muted">${beyond} more ${beyond === 1 ? 'is' : 'are'} a little farther away.</p><button class="btn btn-primary" data-farther>Show farther ones</button></div>`
      : `<div class="panel empty"><div class="big">🔍</div><h3>No vendors found for this date</h3><p class="muted">Try another date, all districts, or turn off "Only available".</p>${params.dist ? '<button class="btn btn-primary" data-alldist>Show all districts</button>' : ''}</div>`}
    <div class="panel vjoin"><div><b>Are you a vendor or artist?</b> Tent, phool, band baja, car, halwai, DJ, mehndi, makeup, marriage hall, orchestra, studio, pandit ji, shops — list your business for free.</div><a class="btn btn-gold" href="#/vendor-join">Join as Vendor / Artist →</a></div>
    <div id="cmpTray"></div>`;
  $('#vDateSlot').appendChild(vDateBar(() => viewVendors(q, opts)));
  drawTray();
  $('#vSearch').addEventListener('submit', e => { e.preventDefault(); go('q', e.target.q.value.trim()); });
  sectionSuggest($('#vSearch input'), type || '', raw => go('q', raw), x => `${base}?${type ? `type=${x.type}&` : ''}q=${encodeURIComponent(x.name)}`);
  $('#vFiltBtn').addEventListener('click', () => $('.vtoolbar').classList.toggle('open'));
  $('#vPrice').addEventListener('submit', e => { e.preventDefault(); const p = new URLSearchParams(q); if (opts.arkestra) p.delete('type'); ['min', 'max'].forEach(k => e.target[k].value ? p.set(k, e.target[k].value) : p.delete(k)); location.hash = base + '?' + p; });
  $('#vState').addEventListener('change', e => { const p = new URLSearchParams(q); if (opts.arkestra) p.delete('type'); p.set('dist', ''); e.target.value ? p.set('state', e.target.value) : p.delete('state'); location.hash = base + '?' + p; });
  $('#vDist').addEventListener('change', e => go('dist', e.target.value || ''));
  $('#vRating').addEventListener('change', e => go('rating', e.target.value));
  $('#vSort').addEventListener('change', e => go('sort', e.target.value));
  $('#vAvail').addEventListener('change', e => go('avail', e.target.checked ? '' : '0'));
  $$('[data-sub]').forEach(b => b.addEventListener('click', () => go('sub', b.dataset.sub)));
  $$('[data-alldist]').forEach(b => b.addEventListener('click', () => go('dist', '')));
  bindLocBar(go);
  const pc = $('#vPriceCmp'); if (pc) pc.addEventListener('click', () => priceCompare(vendors, t));
}

// Compare tray (pick up to 3 vendors)
function drawTray() {
  const el = $('#cmpTray'); if (!el) return;
  el.innerHTML = VS.compare.length ? `<div class="cmp-tray"><span><b>${VS.compare.length}</b> selected to compare</span><button class="btn btn-gold btn-sm" data-act="cmp-open" ${VS.compare.length < 2 ? 'disabled' : ''}>Compare now</button><button class="btn btn-light btn-sm" data-act="cmp-clear">Clear</button></div>` : '';
}
async function openCompare() {
  const date = vDate();
  const data = await Promise.all(VS.compare.map(id => api(`/api/vendors/${id}?date=${date}`).catch(() => null)));
  const list = data.filter(Boolean);
  const row = (label, fn) => `<tr><th>${label}</th>${list.map(d => `<td>${fn(d)}</td>`).join('')}</tr>`;
  const minPrice = d => Math.min(...d.listings.map(l => l.price).filter(Boolean));
  const best = Math.min(...list.map(minPrice));
  modal(`<div class="m-pad"><h3 style="margin:0 0 12px">⚖️ Compare vendors · ${fmtDate(date)}</h3><div class="tbl-wrap"><table class="cmp-tbl">
    <tr><th></th>${list.map(d => `<td>${ph(d.vendor.photos[0], vtype(d.vendor.type).emoji, '#f6eef0', 'cmp-ph')}<a class="link" href="#/v/${d.vendor.id}"><b>${h(d.vendor.name)}</b></a></td>`).join('')}</tr>
    ${row('Rating', d => d.reviews ? `★ ${d.rating} (${d.reviews})` : 'New')}
    ${row('Starting price', d => `<b class="${minPrice(d) === best ? 'ok-txt' : ''}">${inr(minPrice(d))}</b>${minPrice(d) === best ? ' <span class="chip pay-paid">Lowest</span>' : ''}`)}
    ${row(`Available ${shortDate(date)}`, d => availPill(d.avail, date) || '—')}
    ${row('District', d => h(d.vendor.districtName))}
    ${row('Delivery', d => d.vendor.delivery && d.vendor.delivery.available ? `Yes · ${inr(d.vendor.delivery.charge)}` : '—')}
    ${row('Items & prices', d => d.listings.slice(0, 6).map(l => `<div class="small">${h(l.name)} – <b>${inr(l.price)}</b>/${h(l.unit)}</div>`).join(''))}
  </table></div></div>`, 'wide');
}
// Item-wise price comparison for ration / vegetables / sweets
function priceCompare(vendors, t) {
  const cols = vendors.filter(v => v.items && v.items.length).slice(0, 6);
  const items = {};
  // a shop with several brands of one item: its cheapest one in the table (the brand is named under the price)
  cols.forEach(v => v.items.forEach(i => { const r = items[i.item] = items[i.item] || { name: i.name, unit: i.unit, prices: {} }; if (!r.prices[v.id] || i.price < r.prices[v.id].price) r.prices[v.id] = i; }));
  const rows = Object.values(items).filter(r => Object.keys(r.prices).length).sort((a, b) => Object.keys(b.prices).length - Object.keys(a.prices).length);
  modal(`<div class="m-pad"><h3 style="margin:0 0 4px">⚖️ Price comparison – ${h(t.name)}</h3><p class="small muted" style="margin:0 0 12px">Lowest price for each item is highlighted. Prices per unit, set by each vendor.</p>
    <div class="tbl-wrap"><table class="cmp-tbl"><tr><th>Item</th>${cols.map(v => `<td><a class="link" href="#/v/${v.id}"><b>${h(v.name)}</b></a><div class="small muted">📍 ${h(v.districtName)}</div></td>`).join('')}</tr>
    ${rows.map(r => { const low = Math.min(...Object.values(r.prices).map(p => p.price)); return `<tr><th>${h(r.name)}<div class="small muted">per ${h(r.unit)}</div></th>${cols.map(v => { const p = r.prices[v.id]; return `<td>${p ? `<b class="${p.price === low ? 'ok-txt' : ''}">${inr(p.price)}</b>${p.price === low ? ' <span class="chip pay-paid">Lowest</span>' : ''}${p.brand ? `<div class="small">🏷️ ${h(p.brand)}</div>` : ''}<div class="small muted">${p.stock} ${h(p.unit)} in stock</div>` : '<span class="muted">—</span>'}</td>`; }).join('')}</tr>`; }).join('') || '<tr><td>No items to compare</td></tr>'}
    </table></div></div>`, 'wide');
}

/* ---------------- Halwai & arkestra: 5 months of availability (+ halwai price by guests) ---------------- */
// Card block: how many dates are free in the next 5 months and the next few, tap one to book that date
const aheadFreeHtml = v => v.nextFree ? `<div class="vahead"><div class="small"><b>📅 ${v.freeDays} dates free</b> <span class="muted">in next 5 months</span></div>
  <div class="hw-days">${v.nextFree.slice(0, 4).map(dd => `<button data-vfree="${dd}" data-v="${v.id}">${shortDate(dd)}</button>`).join('') || '<span class="small bad-txt">Fully booked</span>'}<a class="small link" href="#/v/${v.id}">All dates →</a></div></div>` : '';
// how this vendor's dates fill up, said under the calendar
function lockNote(v) {
  const mode = (VTYPES.find(t => t.id === v.type) || {}).mode;
  const txt = v.onePerDay ? `<b>One wedding per date.</b> Once a family books ${h(v.name)}, that date is locked for other weddings.`
    : mode === 'unit' ? '<b>Each car goes to one wedding per date.</b> A booked car shows as booked on that date.'
    : mode === 'event' ? (v.capacityPerDay > 1 ? `<b>Can serve ${v.capacityPerDay} weddings on the same date.</b> The date shows Booked when all are taken.` : '<b>One wedding per date.</b> A booked date is locked for other weddings.')
    : '';
  return txt ? `<p class="small vlock">${txt} Your date is held as soon as you send the request.</p>` : '';
}
// Every month of the advance booking window side by side; tap a green date to book it
function aheadCalHtml(ahead, date, v) {
  const free = ahead.reduce((a, m) => a + m.calendar.filter(c => c.status === 'available').length, 0);
  const mini = ({ month, calendar }) => {
    const [y, m] = month.split('-').map(Number), pad = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const n = calendar.filter(c => c.status === 'available').length;
    return `<div class="mcal"><div class="mcal-h"><b>${new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</b><span class="${n ? 'ok-txt' : 'bad-txt'}">${n} free</span></div>
      <div class="mcal-g">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<i>${x}</i>`).join('')}${'<span></span>'.repeat(pad)}${calendar.map(c => `<button class="vday ${c.status} ${c.date === date ? 'sel' : ''} ${c.lagan ? 'lg' : ''}" data-day="${c.date}" ${['past', 'closed'].includes(c.status) ? 'disabled' : ''} title="${fmtDate(c.date)} · ${c.status}${c.lagan ? ' · 🪔 Lagan' : ''}">${Number(c.date.slice(8))}</button>`).join('')}</div></div>`;
  };
  return `<section class="panel vsec" id="vCal"><div class="group-h" style="background:#fff;font-size:17px">📅 Availability – next ${ahead.length} months <span class="small ok-txt" style="font-weight:700">${free} dates free</span></div>
    <p class="small muted" style="margin:10px 16px 0">Book up to ${ahead.length} months in advance. Tap a green date to choose it.</p>
    <div class="mcals">${ahead.map(mini).join('')}</div>
    <div class="vlegend"><span><i class="available"></i>Available</span><span><i class="full"></i>Booked</span><span><i class="closed"></i>Closed</span><span><i class="sel"></i>Your date</span></div>${v ? lockNote(v) : ''}</section>`;
}

// Halwai & Catering category page: halwai / cooks as people — photo, contact, price for 100 / 200 / 300 log, free dates
// Shop category page → "book a local tent house / band party…" with how many are listed
function catVendorStrip(catId) {
  const ids = CAT_VENDORS[catId];
  if (!ids) return '';
  setTimeout(async () => {
    const el = $('#catVend'); if (!el) return;
    let counts = {};
    try { counts = Object.fromEntries((await api('/api/vtypes')).types.map(x => [x.id, x.count])); } catch { /* show without counts */ }
    // tent: one page, three ways — a ready package (listed below), build it item by item, or call a tent house to measure first
    const ways = catId === 'tent' ? `<div class="tent-ways">
        <a href="#tentPk" data-scrollpk><b>Ready packages</b><small>Shamiyana, mandap, stage — fixed price, listed below</small></a>
        <a href="#/tent"><b>Build item by item</b><small>Choose tents, chairs, lights, bartan… by quantity for your date</small></a>
        <a href="#/vendors?type=tent"><b>Site visit first</b><small>A tent house comes to measure your ground and place — free</small></a></div>` : '';
    el.innerHTML = `${ways}<div class="catv-txt"><b>🤝 Book a local vendor</b><small>Verified people from your district — see who is free on your date, compare and book directly.</small></div>
      <div class="catv-btns">${catId === 'decoration' ? '<a class="btn btn-primary btn-sm" href="#/tent">⛺ Tent Booking – item by item →</a>' : ''}${ids.map(id => { const t = vtype(id); return `<a class="btn btn-gold btn-sm" href="${id === 'vehicle' ? '#/cars' : id === 'orchestra' ? '#/arkestra' : id === 'cards' ? '#/cards' : `#/vendors?type=${id}`}">${t.emoji} ${h(t.name)}${counts[id] ? ` <small>(${counts[id]})</small>` : ''} →</a>`; }).join('')}
        <a class="link small" href="#/vendor-join?type=${ids[0]}">Offer this service? Join free →</a></div>`;
    const sp = $('[data-scrollpk]', el); if (sp) sp.addEventListener('click', e => { e.preventDefault(); const g = $('.pgrid'); if (g) g.scrollIntoView({ block: 'start' }); });
    if (ids.includes('vehicle')) return carPick(el);
    // local vendors' own items, next to the shop's: photo, vendor, "from" price; tap opens the vendor at that item
    let items = [];
    try { ({ items } = await api(`/api/vitems?types=${ids.join(',')}&limit=24${S.district ? `&district=${encodeURIComponent(S.district)}` : ''}`)); } catch { /* strip without items */ }
    if (!items.length || !$('#catVend')) return;
    // filter chips: by kind of vendor (Band / DJ…) when there are several, else by item category (tents, chairs…)
    const groups = new Set(items.map(x => x.vendorType)).size > 1
      ? [...new Set(items.map(x => x.vendorType))].map(id => [id, vtype(id).name, x => x.vendorType === id])
      : [...new Set(items.map(x => x.category).filter(Boolean))].map(c => [c, TENT_NAME[c] || BARTAN_NAME[c] || c, x => x.category === c]);
    const st = { g: '', q: '' };
    const match = (x, g) => (!g || groups.find(y => y[0] === g)[2](x)) && (!st.q || sgHit(`${x.name} ${x.nameHi} ${x.vendorName}`, st.q.toLowerCase()));
    const box = document.createElement('div');
    box.className = 'vi-strip cp';
    const card = x => `<a class="vi-card" href="#/v/${x.vendorId}?item=${x.listingId}">${ph(x.photo, vtype(x.vendorType).emoji, '#f6eef0', 'vi-pic')}${x.sample ? '<span class="vsample">Sample</span>' : ''}
        <span class="vi-t"><b>${h(x.name)}</b><small>${h(x.vendorName)}${x.districtName ? ' · ' + h(x.districtName) : ''}</small><em>${x.styles > 1 ? '<small>from</small> ' : ''}${inr(x.price)} <small>/ ${h(x.unit)}${x.styles > 1 ? ` · ${x.styles} styles` : ''}</small></em></span></a>`;
    const draw = () => {
      const list = items.filter(x => match(x, st.g));
      $('.vi-row', box).innerHTML = list.length ? list.map(card).join('') : `<p class="small muted cp-none">Nothing${st.q ? ` for “${h(st.q)}”` : ''} here. <a class="link" data-viclear>Show all</a></p>`;
      $$('[data-vig]', box).forEach(b => { const n = items.filter(x => match(x, b.dataset.vig)).length; b.classList.toggle('on', b.dataset.vig === st.g); b.classList.toggle('zero', !n); b.querySelector('small').textContent = n; });
    };
    box.innerHTML = `<div class="vi-head"><b>From local vendors</b><span class="small muted">${items.length} items · book directly with the vendor</span></div>
      <div class="cp-bar">${groups.length > 1 ? `<div class="cp-kinds"><button type="button" data-vig=""><span>All</span> <small></small></button>${groups.map(([id, name]) => `<button type="button" data-vig="${h(id)}"><span>${h(name)}</span> <small></small></button>`).join('')}</div>` : ''}
        <input class="input cp-q" type="search" placeholder="Search these items…" aria-label="Search local vendors' items"></div>
      <div class="vi-row"></div>`;
    $('#catVend').appendChild(box);
    draw();
    box.addEventListener('click', e => {
      const g = e.target.closest('[data-vig]'); if (g) { st.g = g.dataset.vig; return draw(); }
      if (e.target.closest('[data-viclear]')) { st.g = ''; st.q = ''; $('.cp-q', box).value = ''; draw(); }
    });
    const qi = $('.cp-q', box);
    qi.addEventListener('input', () => { st.q = qi.value.trim(); draw(); });
    // as you type: the matching item names here (tap one to show just that)
    attachSuggest(qi, async q => [...new Map(items.filter(x => sgHit(`${x.name} ${x.nameHi}`, q)).map(x => [x.name.toLowerCase(), x])).values()].slice(0, 6)
      .map(x => ({ pick: () => { qi.value = x.name; st.q = x.name; draw(); }, pic: ph(x.photo, vtype(x.vendorType).emoji, '#f6eef0'), name: hlq(x.name, q), sub: h(vtype(x.vendorType).name), right: inr(x.price) })));
  }, 0);
  return '<div class="panel catv" id="catVend"></div>';
}

// a section's own search box: suggestions of that section's items and vendors from the first letter; Enter / the last
// row searches the section for the typed text (search(raw)); listHref(item) is where an item several vendors have goes
function sectionSuggest(input, types, search, listHref) {
  if (!input) return;
  attachSuggest(input, async q => sgRows(await remoteSuggest(q, types), q, listHref), raw => ({ pick: () => search(raw), name: `🔍 Search “${h(raw)}” here` }));
}
// kinds of gaadi (same ids as the server) and the words a family may type for each
const CAR_KINDS = [['car', 'Car & SUV', 'car suv gaadi'], ['luxury', 'Luxury car', 'luxury'], ['open', 'Open jeep & vintage', 'open jeep vintage'],
  ['ghodi', 'Ghodi (horse)', 'ghodi ghoda horse'], ['baggi', 'Baggi', 'baggi buggy horse cart'], ['bus', 'Bus & tempo', 'bus tempo']];
// Car, Bus & Baggi shop page: every gaadi of the state for the function date — filter by kind or name, add straight to the cart
async function carPick(el) {
  const date = vDate(), dist = district(S.district) || {};
  let cars = [];
  try { ({ cars } = await api(`/api/vcars?date=${date}${dist.state ? `&state=${encodeURIComponent(dist.state)}` : ''}`)); } catch { return; }
  if (!cars.length || !$('#catVend')) return;
  window.I18N.setNames(cars.flatMap(c => [[c.name, c.nameHi], [c.vendorName, c.vendorNameHi]]));
  // own district first, free before booked, then cheaper
  cars.sort((a, b) => (b.districtName === dist.name) - (a.districtName === dist.name) || (a.status !== 'available') - (b.status !== 'available') || a.price - b.price);
  VS.carPick = VS.carPick || { kind: '', q: '', free: true };
  const st = VS.carPick;
  const box = document.createElement('div');
  box.className = 'vi-strip cp';
  el.appendChild(box);
  const words = c => `${c.name} ${c.nameHi} ${c.specs} ${c.vendorName} ${c.districtName} ${(CAR_KINDS.find(k => k[0] === c.kind) || [])[2] || ''}`.toLowerCase();
  const match = (c, kind) => (!kind || c.kind === kind) && (!st.q || words(c).includes(st.q.toLowerCase())) && (!st.free || c.status === 'available');
  const inCart = c => VS.vcart.find(x => x.listingId === c.listingId && x.date === date);
  const setCar = (c, qty) => {
    VS.vcart = VS.vcart.filter(x => !(x.listingId === c.listingId && x.date === date));
    if (qty > 0) VS.vcart.push({ vendorId: c.vendorId, vendorName: c.vendorName, type: 'vehicle', mode: 'unit', date, listingId: c.listingId, name: c.name, nameHi: c.nameHi, unit: c.unit, price: c.price, qty: Math.min(qty, c.left), max: c.left, photo: c.photo, emoji: '🚙', delivery: null, fulfil: 'pickup' });
    saveVCart(); drawCards();
  };
  const card = c => {
    const x = inCart(c), free = c.status === 'available';
    return `<div class="vi-card cp-card"><a href="#/v/${c.vendorId}?item=${c.listingId}">${ph(c.photo, '🚙', '#f6eef0', 'vi-pic')}${c.sample ? '<span class="vsample">Sample</span>' : ''}</a>
      <span class="vi-t"><b>${h(c.name)}</b><small>${h(c.vendorName)}${c.districtName ? ' · ' + h(c.districtName) : ''}</small>
        <em>${inr(c.price)} <small>/ ${h(c.unit)}${c.lagan ? ' · lagan' : ''}</small></em>
        <span class="small">${free ? `<span class="ok-txt">✓ Free ${shortDate(date)}${c.units > 1 ? ` · ${c.left} of ${c.units}` : ''}</span>` : `<span class="bad-txt">✗ ${c.status === 'closed' ? 'Closed' : 'Booked'} ${shortDate(date)}</span>`}</span>
        <span class="cp-act">${!free ? `<a class="btn btn-light btn-sm" href="#/v/${c.vendorId}">Other dates</a>`
          : x ? `<span class="qty cqty"><button type="button" data-cpq="-1" data-cl="${c.listingId}">−</button><span>${x.qty}</span><button type="button" data-cpq="1" data-cl="${c.listingId}" ${x.qty >= c.left ? 'disabled' : ''}>+</button></span>`
          : `<button type="button" class="btn btn-primary btn-sm" data-cpadd="${c.listingId}">+ Add</button>`}</span></span></div>`;
  };
  const drawCards = () => {
    const list = cars.filter(c => match(c, st.kind));
    $('.cp-cards', box).innerHTML = list.length ? list.map(card).join('')
      : `<p class="small muted cp-none">No ${st.kind ? h((CAR_KINDS.find(k => k[0] === st.kind) || [])[1] || '') : 'gaadi'}${st.q ? ` for “${h(st.q)}”` : ''}${st.free ? ` free on ${shortDate(date)}` : ''}. ${st.free ? '<a class="link" data-cpfree>Show booked ones too</a>' : ''}</p>`;
    $$('[data-cpk]', box).forEach(b => { const n = cars.filter(c => match(c, b.dataset.cpk)).length; b.classList.toggle('on', b.dataset.cpk === st.kind); b.classList.toggle('zero', !n); b.querySelector('small').textContent = n; });
  };
  const kinds = CAR_KINDS.filter(([id]) => cars.some(c => c.kind === id));
  box.innerHTML = `<div class="vi-head"><b>Choose your gaadi</b><span class="small muted">${cars.length} from local vendors · book directly · ${fmtDate(date)}</span><a class="link small" href="#/cars">All filters →</a></div>
    <div class="cp-bar"><div class="cp-kinds"><button type="button" data-cpk=""><span>All</span> <small></small></button>${kinds.map(([id, name]) => `<button type="button" data-cpk="${id}"><span>${h(name)}</span> <small></small></button>`).join('')}</div>
      <input class="input cp-q" type="search" placeholder="Search by name — Scorpio, ghodi, baggi…" value="${h(st.q)}" aria-label="Search gaadi by name">
      <label class="small cp-free"><input type="checkbox" ${st.free ? 'checked' : ''}> Only free</label></div>
    <div class="vi-row cp-cards"></div>`;
  drawCards();
  box.addEventListener('click', e => {
    const k = e.target.closest('[data-cpk]'); if (k) { st.kind = k.dataset.cpk; return drawCards(); }
    if (e.target.closest('[data-cpfree]')) { st.free = false; $('.cp-free input', box).checked = false; return drawCards(); }
    const a = e.target.closest('[data-cpadd]');
    if (a) { const c = cars.find(x => x.listingId === a.dataset.cpadd); flyToCart(a.closest('.cp-card').querySelector('.vi-pic')); setCar(c, 1); return toast(`${c.name} (${c.vendorName}) added to cart ✓`); }
    const b = e.target.closest('[data-cpq]');
    if (b) { const c = cars.find(x => x.listingId === b.dataset.cl); setCar(c, ((inCart(c) || {}).qty || 0) + Number(b.dataset.cpq)); }
  });
  const qi = $('.cp-q', box);
  qi.addEventListener('input', e => { st.q = e.target.value.trim(); drawCards(); });
  // as you type: kinds and gaadi names that match (tap one to show just that)
  attachSuggest(qi, async q => [
    ...CAR_KINDS.filter(([id, name, w]) => cars.some(c => c.kind === id) && (sgHit(name, q) || (q.length > 2 && sgHit(w, q)))).map(([id, name]) => ({ pick: () => { st.kind = id; st.q = ''; qi.value = ''; drawCards(); }, pic: '<span class="s-ic">🔎</span>', name: hlq(name, q), sub: `${cars.filter(c => c.kind === id).length} gaadi` })),
    ...[...new Map(cars.filter(c => sgHit(`${c.name} ${c.nameHi}`, q)).map(c => [c.name.toLowerCase(), c])).values()].slice(0, 6)
      .map(c => ({ pick: () => { qi.value = c.name; st.q = c.name; drawCards(); }, pic: ph(c.photo, '🚙', '#f6eef0'), name: hlq(c.name, q), sub: h(c.vendorName), right: inr(c.price) }))]);
  $('.cp-free input', box).addEventListener('change', e => { st.free = e.target.checked; drawCards(); });
}

const HW_GUESTS = [100, 200, 300, 500];
function halwaiStrip() {
  const draw = async () => {
    const el = $('#hwStrip'); if (!el) return;
    const date = vDate(), want = Number(store.get('hwGuests', 200));
    let vendors;
    const loc = GEO.get();
    try { ({ vendors } = await api(`/api/vendors?type=catering&subtype=cook&date=${date}&ahead=1${loc ? '&' + locQs() : S.district ? `&state=${encodeURIComponent((district(S.district) || {}).state || '')}` : ''}`)); } catch { el.innerHTML = ''; return; }
    window.I18N.setNames(vendors.map(v => [v.name, v.nameHi]));
    // those who can cook for that many guests first, then nearest to the ghar (or own district), then most free dates
    const covers = v => (v.tiers.length ? v.tiers[v.tiers.length - 1].guests : Infinity) >= want;
    vendors.sort((a, b) => covers(b) - covers(a) || (loc ? (b.samePin - a.samePin) || a.km - b.km : (b.district === S.district) - (a.district === S.district)) || b.freeDays - a.freeDays);
    el.innerHTML = `<div class="hw-head"><div><h2>👨‍🍳 Book a Halwai / Cook</h2><span class="small muted">Halwai with photo, phone number and 5-month availability. Price depends on kitne logon ka khana banana hai.</span></div>
        <div class="hw-g"><label class="small" for="hwG"><b>Kitne log?</b></label>
          <select class="input" id="hwG">${HW_GUESTS.map(g => `<option value="${g}" ${g === want ? 'selected' : ''}>${g} log</option>`).join('')}<option value="custom" ${HW_GUESTS.includes(want) ? '' : 'selected'}>Custom…</option></select>
          <input type="number" class="input gt-num" id="hwGn" min="10" max="10000" inputmode="numeric" placeholder="e.g. 250" value="${HW_GUESTS.includes(want) ? '' : want}" ${HW_GUESTS.includes(want) ? 'hidden' : ''}></div></div>
      ${vendors.length ? `<div class="hw-row">${vendors.map(v => hwCard(v, date, want)).join('')}</div>` : '<p class="muted" style="padding:0 16px 14px">No halwai listed in your state yet.</p>'}
      <div class="hw-foot"><a class="link" href="#/vendors?type=catering&sub=cook">See all halwai & cooks →</a><a class="link" href="#/vendor-join?type=catering&sub=cook">Are you a halwai? List yourself free →</a></div>`;
    const gs = $('#hwG', el), gn = $('#hwGn', el);
    gs.addEventListener('change', () => { if (gs.value === 'custom') { gn.hidden = false; gn.focus(); } else { store.set('hwGuests', Number(gs.value)); draw(); } });
    gn.addEventListener('change', () => { const n = Math.round(Number(gn.value)); if (n >= 10 && n <= 10000) { store.set('hwGuests', n); draw(); } else toast('Enter between 10 and 10,000 guests', true); });
  };
  setTimeout(draw, 0);
  return '<div class="hw-strip" id="hwStrip"><div class="spinner" style="margin:24px auto"></div></div>';
}
function hwCard(v, date, want) {
  const tl = { guestTiers: v.tiers }, tr = guestTier(tl, want), st = (v.avail || {}).status;
  const wa = `https://wa.me/91${v.whatsapp}?text=${encodeURIComponent(`Namaste, I found you on ${S.meta.settings.siteName}. Khana ${want} logon ke liye chahiye.`)}`;
  // the photo is the person's own clear face photo (so families know who comes); food / work photos live on the
  // profile with the ratings. No photo yet: a clean name tile. Only what decides a booking is on the card.
  const link = `#/v/${v.id}?g=${want}`, maxG = maxGuests(tl);
  return `<div class="hw-card">
    <a class="hw-pic" href="${link}">${v.profilePhoto ? `<img src="${h(v.profilePhoto)}" alt="${h(personName(v))}" loading="lazy" onerror="this.remove()">` : ''}<span class="hw-mono">${personAvatar(v, 'hw-ini')}</span>${v.sample ? '<span class="vsample">Sample</span>' : v.verified ? '<span class="hw-ok">✓ Verified</span>' : ''}</a>
    <div class="hw-info">
      <a class="hw-name" href="${link}">${h(personName(v))}</a>
      <div class="hw-sub">${h(v.districtName)}${v.km != null ? ` · ${GEO.kmText(v.km, v.kmApprox)}` : ''}${v.experienceYears ? ` · ${v.experienceYears} yrs exp.` : ''}</div>
      <div class="hw-sub">${v.reviews ? `<b class="hw-star">★ ${v.rating}</b> (${v.reviews} reviews)` : '<span class="vnew">New</span>'}</div>
      ${v.speciality ? `<div class="hw-spec" title="${h(v.speciality)}">${h(v.speciality)}</div>` : ''}
      <div class="hw-deal">
        ${!v.tiers.length ? `<div><b>${inr(v.startingPrice)}</b><span>per ${h(v.unit)}</span></div>`
          : tr ? `<div><b>${inr(tr.price)}</b><span>for ${want} log${tr.guests !== want ? ` (up to ${tr.guests})` : ''}</span></div>`
          : `<div><span class="bad-txt">Up to ${maxG} guests</span></div>`}
        ${st ? `<span class="hw-st ${st === 'available' ? 'ok' : 'no'}">${st === 'available' ? 'Free' : 'Booked'} on ${shortDate(date)}</span>` : ''}
      </div>
      <div class="hw-act"><a class="btn btn-primary btn-sm" href="${link}">Book</a><a class="btn btn-light btn-sm" href="tel:+91${h(v.phone)}">Call</a><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${wa}">WhatsApp</a></div>
      <a class="hw-cal" href="${link}&cal=1">See all ${v.freeDays} free dates →</a>
    </div>
  </div>`;
}

// Full-screen photos of one car / item: arrows, swipe, keyboard, thumbnails
// labels (optional): a name per photo, e.g. Front / Back / Inside 1 for a wedding card
function photoViewer(list, start, title, labels) {
  let i = start;
  const ov = document.createElement('div');
  ov.className = 'pv';
  const draw = () => {
    ov.innerHTML = `<div class="pv-top"><b>${h(title)}${labels && labels[i] ? ` <span class="pv-label">${h(labels[i])}</span>` : ''}</b><span>${i + 1} / ${list.length}</span><button type="button" class="pv-x" data-pv="x" aria-label="Close">×</button></div>
      <div class="pv-main"><button type="button" class="pv-nav" data-pv="-1" aria-label="Previous">‹</button><img src="${h(list[i])}" alt="${h(title)} photo ${i + 1}"><button type="button" class="pv-nav" data-pv="1" aria-label="Next">›</button></div>
      <div class="pv-thumbs">${list.map((p, k) => `<button type="button" data-pvi="${k}" class="${k === i ? 'on' : ''}"><img src="${h(p)}" alt=""></button>`).join('')}</div>`;
  };
  const go = n => { i = (i + n + list.length) % list.length; draw(); };
  const close = () => { ov.remove(); document.removeEventListener('keydown', key); };
  const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-pv],[data-pvi]');
    if (!b) { if (e.target === ov || e.target.classList.contains('pv-main')) close(); return; }
    if (b.dataset.pvi) { i = +b.dataset.pvi; draw(); } else if (b.dataset.pv === 'x') close(); else go(+b.dataset.pv);
  });
  let x0 = null;
  ov.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  ov.addEventListener('touchend', e => { if (x0 != null && Math.abs(e.changedTouches[0].clientX - x0) > 50) go(e.changedTouches[0].clientX < x0 ? 1 : -1); x0 = null; });
  document.addEventListener('keydown', key);
  draw(); document.body.appendChild(ov);
}

/* ---------------- Site visit (tent house / decorator measures the place first) ---------------- */
function openVisit(v) {
  const loc = GEO.get(), me = S.user || {};
  const m = modal(`<form class="m-pad" id="svForm"><h3 style="margin:0">Free site visit · ${h(v.name)}</h3>
    <p class="small muted" style="margin:2px 0 12px">The vendor will call to confirm your visit.</p>
    <div class="grid-2"><div class="field"><label for="svDate">Visit date</label><input id="svDate" type="date" name="date" required min="${today()}" value="${tomorrow()}"></div>
      <div class="field"><label>Time</label><select name="slot"><option value="morning">Morning (9–12)</option><option value="afternoon">Afternoon (12–4)</option><option value="evening">Evening (4–7)</option></select></div>
      <div class="field"><label>Your name</label><input name="name" required value="${h(me.name || '')}"></div>
      <div class="field"><label>Mobile</label><input name="phone" required inputmode="numeric" maxlength="10" value="${h(me.phone || '')}"></div></div>
    <div class="field"><label>Exact place (ghar / venue address)</label><input name="address" required value="${h(loc && loc.address ? loc.address : '')}" placeholder="Village / mohalla, house or venue name"></div>
    <div class="field"><label for="svDistrict">District</label><select id="svDistrict" name="district" required>${S.meta.districts.map(dd => `<option value="${dd.id}" ${dd.id === (S.district || v.district) ? 'selected' : ''}>${h(dd.name)}</option>`).join('')}</select></div>
    <details class="booking-options"><summary>Optional venue details</summary>
    <div class="grid-2"><div class="field"><label>Landmark</label><input name="landmark" placeholder="e.g. Near school"></div>
      <div class="field"><label>Function date <span class="muted small">(if fixed)</span></label><input type="date" name="functionDate" min="${today()}" value="${h(chosenDate())}"></div>
      <div class="field"><label>Guests (approx.)</label><input type="number" name="guests" min="0" max="10000" placeholder="e.g. 400"></div></div>
    <div class="field"><label>Ground size if you know it <span class="muted small">(optional)</span></label><input name="area" placeholder="e.g. 60×80 ft, or “not sure”"></div>
    <div class="field"><label>Booking note</label><textarea name="note" rows="2" maxlength="300" placeholder="e.g. The ground is uneven at the back"></textarea></div></details>
    <button class="btn btn-primary btn-block">Request site visit</button></form>`, 'sm');
  $('#svForm', m).addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), btn = $('button.btn-primary', e.target); btn.disabled = true;
    try {
      const { visit } = await api('/api/vvisits', { method: 'POST', body: { vendorId: v.id, date: f.date, slot: f.slot, functionDate: f.functionDate, guests: f.guests, area: f.area, note: f.note,
        customer: { name: f.name, phone: f.phone, address: f.address, landmark: f.landmark, district: f.district, side: S.side } } });
      const slot = { morning: 'morning (9–12)', afternoon: 'afternoon (12–4)', evening: 'evening (4–7)' }[visit.slot];
      m.querySelector('.m-pad').outerHTML = `<div class="m-pad" style="text-align:center"><div class="tick">✓</div><h3 style="margin:6px 0">Site visit requested</h3>
        <p>Request <b>#${h(visit.number)}</b> · ${fmtDate(visit.date)}, ${slot}<br>${h(visit.vendorName)} will call you on <b>${h(f.phone)}</b> to confirm the time.</p>
        <div class="cta-row" style="justify-content:center"><a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/91${h(visit.whatsapp)}?text=${encodeURIComponent(`Namaste, I requested site visit #${visit.number} on ${S.meta.settings.siteName} for ${fmtDate(visit.date)} (${slot}). Address: ${f.address}${f.landmark ? ', ' + f.landmark : ''}.`)}">💬 WhatsApp ${h(visit.vendorName)}</a><a class="btn btn-light" href="tel:+91${h(visit.phone)}">📞 Call</a></div></div>`;
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  });
}

/* ---------------- Vendor detail & booking ---------------- */
async function viewVendor(id, q) {
  skeleton(3);
  const date = vDate();
  const month = q.get('m') || date.slice(0, 7);
  const d = await api(`/api/vendors/${encodeURIComponent(id)}?date=${date}&month=${month}&ahead=1${GEO.get() ? '&' + locQs() : ''}`);
  const v = d.vendor, t = vtype(v.type), mode = d.mode;
  // everything below (prices, tiers, cart) uses the price for the chosen date; lagan days may cost more
  for (const l of d.listings) { l.normalPrice = l.price; l.price = l.datePrice ?? l.price; if (l.dateTiers) { l.normalTiers = l.guestTiers; l.guestTiers = l.dateTiers; } }
  const laganUp = d.listings.some(l => l.price !== l.normalPrice);
  window.I18N.setNames([[v.name, v.nameHi], ...d.listings.map(l => [l.name, l.nameHi])]);
  if (VS.selFor !== v.id + date) {
    // start from what is already in the cart for this vendor + date
    const all = VS.vcart.filter(x => x.vendorId === v.id && x.date === date), mine = all.filter(x => !x.plan);
    // same vendor, new date and nothing in the cart for it yet: keep what the customer already picked
    if (all.length || VS.selVendor !== v.id) {
      // studio shoot plan: each function's date, coverage and add-ons come back from the cart lines
      VS.plan = { vid: v.id, rows: {} };
      for (const x of all.filter(x => x.plan)) {
        const on = (x.dates || [])[0] || {}, r = VS.plan.rows[on.event] = VS.plan.rows[on.event] || { on: true, date: on.date, cov: '', add: [] };
        if (x.shoot === 'day') r.cov = `${x.listingId}|${x.style || ''}`; else r.add.push(x.listingId);
      }
      VS.sel = Object.fromEntries(mine.map(x => [x.listingId, x.qty]));
      VS.selG = Object.fromEntries(mine.filter(x => x.guests).map(x => [x.listingId, x.guests]));
      VS.selS = Object.fromEntries(mine.filter(x => x.style).map(x => [x.listingId, x.style])); // chosen styles
      VS.selA = Object.fromEntries(mine.filter(x => x.addons).map(x => [x.listingId, x.addons])); // card add-ons
      VS.selD = Object.fromEntries(mine.filter(x => x.dates).map(x => [x.listingId, Object.fromEntries(x.dates.map(y => [y.event, y.date]))])); // full ceremony: rasam dates
    }
    // which function: the one in the cart, the one asked for, the function saved on this date, the last choice here, the one being shopped for
    VS.selEv = (all.find(x => x.event) || {}).event || VS.wantEv || (Object.entries(S.events).find(([, x]) => x === date) || [])[0] || (VS.selVendor === v.id ? VS.selEv : '') || S.presetEvent || '';
    VS.wantEv = null;
    VS.selVendor = v.id;
    // coming from the Halwai & Catering page with a guest count already chosen
    const want = Number(q.get('g') || 0);
    if (want) for (const l of d.listings) { if (guestTier(l, want) && !VS.sel[l.id] && l === d.listings.find(x => (x.guestTiers || []).length)) { VS.sel[l.id] = 1; VS.selG[l.id] = want; } }
    VS.selFor = v.id + date;
    VS.fulfil = (VS.vcart.find(x => x.vendorId === v.id && x.date === date) || {}).fulfil || null;
  }
  const photos = v.photos.length ? v.photos : [''];
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.address}, ${v.districtName}, ${v.state}${v.pincode ? ' ' + v.pincode : ''}`)}`;
  const s = S.meta.settings;
  const wa = `https://wa.me/91${v.whatsapp || v.phone}?text=${encodeURIComponent(`Namaste, I found you on ${s.siteName}. I want to book for ${fmtDate(date)}.`)}`;
  const itemLabel = { vehicle: 'Vehicles', catering: 'Menu & Packages', ration: 'Items & Prices', vegetable: "Today's Vegetables & Prices", sweets: 'Sweets & Prices', studio: 'Photo & Video — your functions', dj: 'DJ Packages', pandit: 'Pujas & Services', orchestra: 'Programs',
    tent: 'Tent, Light & Packages', decoration: 'Decoration Packages', band: 'Band Packages', mehndi: 'Mehndi Designs & Rates', makeup: 'Makeup Packages', venue: 'Halls & Packages',
    wear: 'Outfits & Prices', puja: 'Samagri & Prices', gifts: 'Gifts & Prices', cards: 'Card Designs & Prices' }[v.type] || 'Services & Prices';
  const [y, m] = month.split('-').map(Number);
  const pad = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const shiftM = n => { const x = new Date(y, m - 1 + n, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };
  const canPrev = month > today().slice(0, 7);
  // goods sold by quantity: bulk rate for the chosen quantity, lagan price and card add-ons (same rule as the server)
  VS.selA = VS.selA || {};
  VS.selD = VS.selD || {};
  const addonsOf = l => (l.addons || []).filter(a => (VS.selA[l.id] || []).includes(a.name));
  const ruleOf = l => ({ n: l.normalPrice, b: l.bulkTiers || [], lg: !!d.lagan, pct: d.laganPct || 0, lp: l.laganPrice || 0, add: addonsOf(l).reduce((s, a) => s + a.price, 0) });
  // event-mode vendors: the booking is for one function. A Tilak puja is only for Tilak; a full ceremony covers several
  // rasams, each on its own date — the date on this page is the main rasam's (the shaadi if covered, else the chosen function)
  const SHAADI = 'Shaadi (Vivah)', isEv = mode === 'event';
  const coversOf = l => (isEv ? l.covers || [] : []);
  const evMain = (l, ev) => { const c = coversOf(l); return c.includes(SHAADI) ? SHAADI : c.includes(ev) ? ev : ''; };
  const evOk = l => !isEv || (coversOf(l).length ? !!evMain(l, VS.selEv) : !(l.events || []).length || l.events.includes(VS.selEv));
  const offered = !isEv ? [] : d.listings.some(l => !(l.events || []).length && !coversOf(l).length) ? S.meta.events : S.meta.events.filter(e => d.listings.some(l => [...(l.events || []), ...coversOf(l)].includes(e)));
  if (isEv && !offered.includes(VS.selEv)) VS.selEv = offered.includes(SHAADI) ? SHAADI : offered[0] || '';
  const rasamDates = l => { const main = evMain(l, VS.selEv), given = VS.selD[l.id] || {}; return coversOf(l).map(e => ({ event: e, date: e === main ? date : given[e] || '' })).filter(x => x.date); };
  // free / booked on a rasam date, from the advance-booking calendars
  const dayOf = ds => { for (const c of (d.ahead || []).flatMap(x => x.calendar)) if (c.date === ds) return c.status; return ''; };
  const dayTxt = ds => { const st = ds && dayOf(ds); return st === 'available' ? '<span class="ok-txt">✓ Free</span>' : st === 'full' ? '<span class="bad-txt">✗ Booked</span>' : st === 'closed' ? '<span class="bad-txt">✗ Closed</span>' : ds ? '' : '<span class="muted">Not needed</span>'; };
  const evTag = l => (!isEv ? '' : coversOf(l).length ? `<div><span class="ev-only">Covers ${h(l.covers.map(evShort).join(' · '))}</span> <span data-evoff="${l.id}"></span></div>`
    : (l.events || []).length ? `<div><span class="ev-only">Only for ${h(l.events.map(evShort).join(' & '))}</span></div>` : '');
  // an item with styles: the style chosen here (first one until the family picks), priced for the date
  VS.selS = VS.selS || {};
  const styleSel = l => ((l.styles || []).some(s => s.key === VS.selS[l.id]) ? VS.selS[l.id] : (l.styles || [])[0] ? l.styles[0].key : '');
  const styleNow = l => (l.dateStyles || l.styles || []).find(s => s.key === styleSel(l));
  // photo / video studio: one booking for all the family's functions. Each function (row) has its own date — the main
  // function is on the booking date — its coverage (photo only, photo + video…) and add-ons (drone, extra cameraman)
  const isPlan = isEv && d.listings.some(l => l.shoot === 'day');
  const covL = d.listings.filter(l => l.shoot === 'day'), addL = d.listings.filter(l => l.shoot === 'addon');
  const covOpts = covL.flatMap(l => ((l.styles || []).length ? l.styles.map(s => ({ id: `${l.id}|${s.key}`, l, s, name: s.name, base: s.price, note: s.note }))
    : [{ id: `${l.id}|`, l, name: l.name, base: l.normalPrice, note: l.specs }]));
  const covFor = ev => covOpts.filter(o => !(o.l.events || []).length || o.l.events.includes(ev));
  // the price on that function's date: lagan days cost more (same rule as the server)
  const lgOn = ds => { for (const c of (d.ahead || []).flatMap(x => x.calendar)) if (c.date === ds) return !!c.lagan; return ds === date && !!d.lagan; };
  const priceAt = (l, base, ds, styled) => (!lgOn(ds) ? base : !styled && l.laganPrice > 0 ? l.laganPrice : d.laganPct > 0 ? Math.round(base * (1 + d.laganPct / 100)) : base);
  if (!VS.plan || VS.plan.vid !== v.id) VS.plan = { vid: v.id, rows: {} };
  const planRows = () => { const R = VS.plan.rows; if (isPlan && VS.selEv) R[VS.selEv] = { cov: '', add: [], ...R[VS.selEv], on: true }; return R; };
  const rowDate = ev => (ev === VS.selEv ? date : (VS.plan.rows[ev] || {}).date || '');
  const planOn = () => (isPlan ? offered.filter(ev => (planRows()[ev] || {}).on) : []);
  const planLines = () => planOn().flatMap(ev => {
    const r = VS.plan.rows[ev], ds = rowDate(ev), o = covFor(ev).find(x => x.id === r.cov), on = [{ event: ev, date: ds }];
    if (!ds) return [];
    return [...(o ? [{ l: o.l, qty: 1, price: priceAt(o.l, o.base, ds, !!o.s), name: o.name, style: o.s ? o.s.key : undefined, dates: on, plan: true, shoot: 'day' }] : []),
      ...addL.filter(a => r.add.includes(a.id)).map(a => ({ l: a, qty: 1, price: priceAt(a, a.normalPrice, ds, false), name: a.name, dates: on, plan: true, shoot: 'addon' }))];
  });
  // what still has to be filled in before booking: a date and a service type for every ticked function
  const planMiss = () => { for (const ev of planOn()) { if (!rowDate(ev)) return `Enter the ${evShort(ev)} date`; if (!covFor(ev).some(o => o.id === VS.plan.rows[ev].cov)) return `Choose the service type for ${evShort(ev)}`; } return ''; };
  const lines = () => [...d.listings.filter(l => VS.sel[l.id] > 0 && evOk(l) && !(isPlan && ['day', 'addon'].includes(l.shoot))).map(l => {
    const sty = (l.styles || []).length && mode !== 'stock' ? styleNow(l) : null;
    if (sty) return { l, qty: VS.sel[l.id], price: sty.price, name: `${l.name} — ${sty.name}`, style: sty.key };
    const n = VS.selG[l.id], tr = (l.guestTiers || []).length ? guestTier(l, n) : null;
    if ((l.guestTiers || []).length && !tr) return null;
    if (tr) return { l, qty: 1, price: tr.price, guests: n, name: `${l.name} · ${n} guests` };
    if (mode !== 'stock') return { l, qty: VS.sel[l.id], price: l.price, name: l.name };
    const ad = addonsOf(l), rule = ruleOf(l);
    return { l, qty: VS.sel[l.id], price: ruleUnit(rule, VS.sel[l.id]), rule, name: `${l.name}${l.brand ? ` · ${l.brand}` : ''}${ad.length ? ` + ${ad.map(a => a.name).join(', ')}` : ''}`, addons: ad.length ? ad.map(a => a.name) : undefined };
  }).filter(Boolean).map(x => (coversOf(x.l).length ? { ...x, dates: rasamDates(x.l) } : x)), ...planLines()];
  // rental pieces (chairs, tents…): only what is left on the date
  const maxQty = l => mode === 'unit' ? (l.left ?? l.units) : l.rental || l.staff ? (l.left ?? l.units ?? 0) : mode === 'stock' ? l.stock : 100000;
  const hasRental = d.listings.some(l => l.rental);

  // ----- items: generic rows; sweets split into "per kg" and boxes; card printers get a design gallery -----
  const byPrice = arr => arr.slice().sort((a, b) => a.normalPrice - b.normalPrice);
  const bulkChips = l => ((l.bulkTiers || []).length ? `<div class="bulk-chips"><span class="muted">Bulk:</span>${l.bulkTiers.map(x => `<span>${x.min}+ ${h(l.unit)} <b>${inr(x.price)}</b></span>`).join('')}</div>` : '');
  const qtyBox = l => `<div class="qty vqty"><button type="button" data-vq="-1" data-l="${l.id}">−</button><input type="number" min="0" max="${maxQty(l)}" value="${VS.sel[l.id] || 0}" data-vqi="${l.id}" aria-label="Quantity"><button type="button" data-vq="1" data-l="${l.id}">+</button></div>`;
  const rowEmoji = l => (l.kind === 'box' ? '📦' : l.staff ? (l.staff === 'cook' ? '👨‍🍳' : '🧑‍🍳') : l.rental && v.type === 'catering' ? ({ cooking: '🍲', serving: '🥣', fire: '🔥', tools: '🥄' }[l.category] || '📦') : t.emoji);
  // extra: more html inside the row (e.g. the team picker under a halwai package); ignored when used as a .map callback
  const itemRow = (l, extra) => `<div class="vitem" id="it_${l.id}">
      ${(l.photos || []).length > 1 ? `<button type="button" class="vi-phbtn" data-lpics="${l.id}" title="See all ${l.photos.length} photos">${ph(l.photo, rowEmoji(l), '#f6eef0', 'vi-ph')}<span class="pg-count">📷 ${l.photos.length}</span></button>` : ph(l.photo, rowEmoji(l), '#f6eef0', 'vi-ph')}
      <div class="vi-txt"><b>${h(l.name)}</b>${l.nameHi ? ` <span class="muted small">${h(l.nameHi)}</span>` : ''}${l.specs ? `<div class="small muted">${h(l.specs)}</div>` : ''}
        ${l.rental && (l.size || (l.features || []).length) ? `<div class="cspecs">${l.size ? `<span>📐 ${h(l.size)}</span>` : ''}${tentCap(l) ? `<span>${tentCap(l)}</span>` : ''}${(l.features || []).map(f => `<span>${h(f)}</span>`).join('')}</div>` : ''}
        ${l.brand || l.quality ? `<div class="cd-tags">${l.brand ? `<span>🏷️ ${h(l.brand)}</span>` : ''}${l.quality ? `<span>${h(l.quality)}</span>` : ''}</div>` : ''}
        ${l.kind === 'box' ? `<div class="small box-meta">📦 <b>${h(l.boxSize || 'Box')}</b>${l.holdsKg ? ` · holds ${l.holdsKg} kg` : ''}${l.design ? ` · ${h(l.design)}` : ''}</div>` : ''}
        <div>${(l.guestTiers || []).length ? `<span class="muted small">From</span> <b class="price" style="font-size:16px">${inr(l.guestTiers[0].price)}</b> <span class="muted small">· price by number of guests</span>` : (l.styles || []).length > 1 ? `<span class="muted small">From</span> <b class="price" style="font-size:16px">${inr(Math.min(...(l.dateStyles || l.styles).map(s => s.price)))}</b> <span class="muted small">/ ${h(l.unit)} · ${l.styles.length} styles — pick one below</span>` : `<b class="price" style="font-size:16px">${inr(l.price)}</b> <span class="muted small">/ ${h(l.unit)}</span>`}
          ${l.price !== l.normalPrice ? `<span class="lagan-tag" title="Lagan (shubh vivah) date">🪔 Lagan price</span> <s class="muted small">${inr((l.normalTiers || [])[0] ? l.normalTiers[0].price : l.normalPrice)}</s>` : ''}</div>
        ${bulkChips(l)}${l.minQty > 1 ? `<div class="small muted">Minimum order ${l.minQty} ${h(l.unit)}</div>` : ''}
        <div class="small">${l.rental || l.staff ? (l.left > 0 ? `<span class="ok-txt">${l.left} of ${l.units} free on ${shortDate(date)}</span>` : `<span class="bad-txt">${l.staff ? 'None free' : 'All booked'} on ${shortDate(date)}</span>`) : mode === 'unit' ? (l.left > 0 ? `<span class="ok-txt">${l.left} of ${l.units} free on ${shortDate(date)}</span>` : `<span class="bad-txt">Booked on ${shortDate(date)}</span>`) : mode === 'stock' ? (l.stock > 0 ? `<span class="ok-txt">${l.stock} ${h(l.stock > 1 && ['box', 'card', 'piece'].includes(l.unit) ? (l.unit === 'box' ? 'boxes' : l.unit + 's') : l.unit)} in stock</span>` : '<span class="bad-txt">Out of stock</span>') : ''}</div>
        ${mode === 'stock' ? `<div class="small vi-now" data-unitp="${l.id}"></div>` : ''}${l.kind === 'box' && l.holdsKg ? `<div class="small box-help" data-boxhelp="${l.id}"></div>` : ''}
        ${evTag(l)}${coversOf(l).length ? `<div class="vrd" data-vrd="${l.id}"></div>` : ''}</div>
      ${(l.guestTiers || []).length ? '' : qtyBox(l)}
      ${(l.styles || []).length ? `<div class="vsty">${(l.dateStyles || l.styles).map(s => `<button type="button" data-vsty="${l.id}" data-k="${h(s.key)}" class="${styleSel(l) === s.key ? 'on' : ''}">${s.photo ? `<img src="${h(s.photo)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span><b>${h(s.name)}</b>${s.note ? `<small>${h(s.note)}</small>` : ''}<em>${inr(s.price)}</em></span></button>`).join('')}</div>` : ''}
      ${(l.guestTiers || []).length ? `<div class="gtiers"><div class="gt-q">Kitne logon ka khana? <span class="muted">How many guests?</span></div>
        <div class="gt-pick">${guestPick(l.id, l.guestTiers, VS.sel[l.id] ? VS.selG[l.id] : 0, 'data-gsel')}<span class="gt-price" data-gprice="${l.id}">${VS.sel[l.id] ? guestPriceTxt(l, VS.selG[l.id]) : ''}</span></div></div>` : ''}
      ${typeof extra === 'string' ? extra : ''}
    </div>`;
  // the same item from different companies (or packs) in one shop — basmati from India Gate, Daawat, loose: one row
  // with a "Company / brand" dropdown (each brand keeps its own price, photo, stock and bulk rates)
  VS.selB = VS.selB || {};
  const gKey = l => `${l.item || l.name.toLowerCase().trim()}|${l.kind || ''}`;
  const brandName = l => l.brand || 'No brand / loose';
  const pickOf = g => g.find(x => x.id === VS.selB[gKey(g[0])]) || g.find(x => VS.sel[x.id] > 0) || [...g].sort((a, b) => (b.stock > 0) - (a.stock > 0) || a.price - b.price)[0];
  const brandPick = (g, cur) => `<div class="br-pick"><label for="br_${cur.id}">Company / brand <span class="muted">· ${g.length} to choose from</span></label>
      <select class="input" id="br_${cur.id}" data-brsel="${h(gKey(cur))}">${g.map(x => `<option value="${x.id}" ${x.id === cur.id ? 'selected' : ''}>${h(brandName(x))} — ${inr(x.price)}/${h(x.unit)}${x.quality ? ` · ${h(x.quality)}` : ''}${x.stock > 0 ? '' : ' · out of stock'}</option>`).join('')}</select>
      ${g.filter(x => x.id !== cur.id && VS.sel[x.id] > 0).map(x => `<span class="br-also">Also in your list: <b>${h(brandName(x))}</b> × ${VS.sel[x.id]} ${h(x.unit)} <button type="button" class="link" data-brgo="${x.id}">show</button></span>`).join('')}</div>`;
  const brandRow = g => { const cur = pickOf(g); return `<div class="br-wrap" data-brg="${h(gKey(cur))}">${itemRow(cur, brandPick(g, cur))}</div>`; };
  // opened at one item ("From local vendors", search): show that brand in its group
  { const want = q.get('item') && d.listings.find(x => x.id === q.get('item')); if (want) VS.selB[gKey(want)] = want.id; }
  const groupedRows = list => { const seen = new Set(); return list.map(l => { const k = gKey(l); if (seen.has(k)) return ''; seen.add(k); const g = list.filter(x => gKey(x) === k); return g.length > 1 ? brandRow(g) : itemRow(l); }).join(''); };
  // halwai package: how many people you need, typed or tapped right under it (extra cooks / helpers, per day)
  // pieces on rent (bartan, tent items…): one dropdown grouped by category, a quantity and Add; the chosen ones below
  const pieceWord = v.type === 'catering' ? 'bartan' : 'items';
  const piecePicker = (list, cats, names, word) => `<div class="bt-pick"><select class="input" id="btSel" aria-label="Choose ${word}"><option value="">Choose ${word}…</option>${cats.map(c => `<optgroup label="${h(names[c] || 'Other')}">${list.filter(l => (l.category || 'other') === c).map(l => `<option value="${l.id}" ${l.left > 0 ? '' : 'disabled'}>${h(l.name)}${l.size ? ` (${h(l.size)}${tentCap(l) ? ', ' + tentCap(l) : ''})` : ''} · ${inr(l.price)}/${h(l.unit)} · ${l.left > 0 ? `${l.left} free` : 'all booked'}</option>`).join('')}</optgroup>`).join('')}</select>
      <input type="number" class="input" id="btQty" min="1" value="1" inputmode="numeric" aria-label="How many"><button type="button" class="btn btn-primary btn-sm" id="btAdd">Add</button></div>
    <div id="btChosen">${btChosenHtml(list)}</div>`;
  // what the family picked from the dropdown: one short line each (size, quantity, rent for the day, remove)
  const btChosenHtml = bt => {
    const on = bt.filter(l => VS.sel[l.id] > 0);
    if (!on.length) return `<p class="small muted bt-empty">No ${pieceWord} added yet. Pick from the list above — ${bt.filter(l => l.left > 0).length} items free on ${shortDate(date)}.</p>`;
    return `<div class="bt-list">${on.map(l => `<div class="bt-row"><div class="bt-n"><b>${h(l.name)}</b><small>${l.size ? h(l.size) + ' · ' : ''}${inr(l.price)}/${h(l.unit)} · ${l.left} free</small></div>
      ${qtyBox(l)}<b class="bt-amt">${inr(l.price * VS.sel[l.id])}</b><button type="button" class="bt-x" data-btx="${l.id}" aria-label="Remove ${h(l.name)}">×</button></div>`).join('')}
      <div class="bt-tot"><span>${v.type === 'catering' ? 'Bartan' : 'Items'} total</span><b>${inr(on.reduce((s, l) => s + l.price * VS.sel[l.id], 0))}</b></div></div>`;
  };
  // what the package already brings, e.g. "team of 6" or "6 helpers", said once so families add only the extra people
  const hasTeam = pkg => (`${pkg.name} ${pkg.specs || ''}`.match(/team of \d+|\d+\s*(?:helpers?|cooks?|log|people)|head halwai[^,·()]*/i) || [''])[0];
  const teamPick = (pkg, team) => `<div class="pk-team"><div class="gt-q">Kitne log kaam karenge? <span class="muted">${hasTeam(pkg) ? `Package already has ${h(hasTeam(pkg))} — add extra people if you need more` : 'Extra cooks and helpers you need'}</span></div>
      <div class="pk-team-r">${team.map(roleCard).join('')}</div>
      <div class="team-tip" id="teamTip"></div></div>`;
  // one kind of extra person: price, how many are free on the date (of how many the vendor has), quantity
  const roleCard = s => `<div class="pk-role"><div><b>${ROLE_LABEL[s.staff] || h(s.name)}</b><small>${inr(s.price)} per ${h(s.unit || 'person')} · ${s.left > 0 ? `<b class="ok-txt">${s.left} of ${s.units} free</b> on ${shortDate(date)}` : `<b class="bad-txt">none free</b> on ${shortDate(date)}`}</small></div>${qtyBox(s)}</div>`;
  // card designs: front photo (tap for back / inside), type, paper, printing, MOQ, bulk rates, add-ons — cheapest first
  VS.cf = VS.cf || { type: '', print: '', sort: 'low' };
  const cardViewsOf = l => { const cv = l.cardViews; return cv ? [[cv.front, 'Front'], [cv.back, 'Back'], ...(cv.inside || []).map((p, i) => [p, `Inside ${i + 1}`])].filter(x => x[0]) : (l.photos || [l.photo]).filter(Boolean).map((p, i) => [p, i ? `Photo ${i + 1}` : 'Front']); };
  const designTile = l => {
    const views = cardViewsOf(l), best = (l.bulkTiers || []).slice(-1)[0];
    return `<div class="cdesign" id="it_${l.id}">
      <button type="button" class="cd-ph" data-cdpics="${l.id}" title="See front, back and inside">${ph(views[0] ? views[0][0] : '', '💌', '#fbf3f6')}<span class="pg-count">📷 ${views.length} · ${views.map(x => x[1].replace(/ \d+$/, '')).filter((x, i, a) => a.indexOf(x) === i).join(' / ')}</span></button>
      <div class="cd-body"><b class="cd-name">${h(l.name)}</b>${l.design ? `<div class="small muted">${h(l.design)}</div>` : ''}
        <div class="cd-tags">${l.cardType ? `<span>${h(l.cardType)}</span>` : ''}${l.paper ? `<span>📄 ${h(l.paper)}</span>` : ''}${(l.printing || []).map(p => `<span>🖨️ ${h(p)}</span>`).join('')}</div>
        <div class="cd-price"><b>${inr(l.price)}</b><small>/card</small>${l.price !== l.normalPrice ? ' <span class="lagan-tag">🪔</span>' : ''} · <span class="muted">min ${l.minQty || 1}</span>${best ? ` · <span class="ok-txt">${inr(best.price)} for ${best.min}+</span>` : ''}</div>
        ${bulkChips(l)}
        ${(l.addons || []).length ? `<div class="cd-addons">${l.addons.map(a => `<label><input type="checkbox" data-addon="${l.id}" value="${h(a.name)}" ${(VS.selA[l.id] || []).includes(a.name) ? 'checked' : ''}> ${h(a.name)} <small>${a.price ? '+' + inr(a.price) : 'free'}</small></label>`).join('')}</div>` : ''}
        <div class="cd-order">${l.stock >= (l.minQty || 1) ? qtyBox(l) : '<span class="bad-txt small">Not taking orders now</span>'}<span class="small vi-now" data-unitp="${l.id}"></span></div>
        ${l.leadDays ? `<div class="small muted">⏱ Printed & delivered in ${l.leadDays} days</div>` : ''}</div></div>`;
  };
  const cardGrid = () => {
    let ds = d.listings.filter(l => !VS.cf.type || l.cardType === VS.cf.type).filter(l => !VS.cf.print || (l.printing || []).includes(VS.cf.print));
    ds = byPrice(ds); if (VS.cf.sort === 'high') ds.reverse();
    return ds.map(designTile).join('') || '<p class="muted" style="padding:16px">No design matches these filters.</p>';
  };
  function itemsHtml() {
    if (!d.listings.length) return '<p class="muted" style="padding:16px">No items listed yet.</p>';
    if (isPlan) {
      // service types with their per-function price, then one row per function, then the one-time extras
      const once = d.listings.filter(l => !['day', 'addon'].includes(l.shoot));
      return `<div class="sp-types">${covOpts.map(o => `<div class="sp-type"><b>${h(o.name)}</b><em>${inr(o.base)}<small> / function</small></em><small>${h(o.note || '')}${(o.l.events || []).length ? ` · ${h(o.l.events.map(evShort).join(' / '))} only` : ''}</small></div>`).join('')}
          ${addL.map(a => `<div class="sp-type sp-addt"><b>+ ${h(a.name)}</b><em>${inr(a.normalPrice)}<small> / function</small></em><small>${h(a.specs || 'Add to any function')}</small></div>`).join('')}</div>
        <div class="vsub-h">Your functions <small>tick each function, give its date and choose the service type — all in one booking</small></div>
        <div class="sp-all"><span class="small">Same service for all?</span><select class="input" data-spall aria-label="Service type for all functions"><option value="">Choose…</option>${covOpts.map(o => `<option value="${h(o.id)}">${h(o.name)} · ${inr(o.base)}</option>`).join('')}</select></div>
        <div class="sp-rows" id="shootPlan"></div>
        ${once.length ? `<div class="vsub-h">Album & one-time extras <small>added once to the booking</small></div>${once.map(itemRow).join('')}` : ''}`;
    }
    if (v.type === 'cards') {
      const types = [...new Set(d.listings.map(l => l.cardType).filter(Boolean))], prints = [...new Set(d.listings.flatMap(l => l.printing || []))];
      return `<div class="cd-filters"><div class="vsubtabs"><button data-cft="" class="${!VS.cf.type ? 'on' : ''}">All designs (${d.listings.length})</button>${types.map(x => `<button data-cft="${h(x)}" class="${VS.cf.type === x ? 'on' : ''}">${h(x)}</button>`).join('')}</div>
          <div class="cd-sel"><select class="input" data-cfp aria-label="Printing"><option value="">Any printing</option>${prints.map(x => `<option ${VS.cf.print === x ? 'selected' : ''}>${h(x)}</option>`).join('')}</select>
          <select class="input" data-cfs aria-label="Sort"><option value="low" ${VS.cf.sort === 'low' ? 'selected' : ''}>Price: low to high</option><option value="high" ${VS.cf.sort === 'high' ? 'selected' : ''}>Price: high to low</option></select>
          <a class="link small" href="#/cards">All printers' designs →</a></div></div>
        <div class="cd-grid" id="cardGrid">${cardGrid()}</div>`;
    }
    if (v.type === 'catering' && d.listings.some(l => l.staff || l.rental)) {
      // halwai: what to cook (packages), the team (extra cooks / helpers) and the bartan on rent — booked together
      const pk = d.listings.filter(l => !l.staff && !l.rental), team = d.listings.filter(l => l.staff), bt = d.listings.filter(l => l.rental);
      const cats = [...new Set(bt.map(l => l.category || 'other'))];
      // the team picker sits inside the guests package; without such a package the team gets its own block
      const tierPk = team.length ? pk.find(l => (l.guestTiers || []).length) : null;
      return `${pk.map(l => itemRow(l, l === tierPk ? teamPick(l, team) : '')).join('')}
        ${team.length && !tierPk ? `<div class="vsub-h">Team — cooks & helpers <small>price per person per day · only who is free on ${shortDate(date)}</small></div><div class="team-tip" id="teamTip"></div>${team.map(itemRow).join('')}` : ''}
        ${bt.length ? `<div class="vsub-h">Bartan on rent <small>${bt.length} items · rent per piece per day · bring back after the function</small></div>${piecePicker(bt, cats, BARTAN_NAME, 'bartan')}` : ''}`;
    }
    if (v.type === 'orchestra' && d.listings.some(l => l.staff)) {
      // orchestra group: its programs, then extra lady dancers / singers for a bigger show, free count for the date
      const pk = d.listings.filter(l => !l.staff), team = d.listings.filter(l => l.staff), busy = d.avail && d.avail.status === 'full';
      return `${pk.map(itemRow).join('')}
        <div class="vsub-h">Add more artists to your show <small>extra lady dancers & singers · who is free on ${shortDate(date)}</small></div>
        <div class="pk-team ark-x">${v.teamTotal ? `<p class="small" style="margin:0 0 8px">The group brings <b>${v.teamTotal} people</b>${v.teamLadies ? ` including <b>${v.teamLadies} ladies</b>` : ''}. Want a bigger show? Add more below — they join the group for your night.</p>` : ''}
          ${busy ? `<p class="small bad-txt" style="margin:0 0 8px">${h(v.name)} is already booked on ${fmtDate(date)} — pick another date in the calendar.</p>` : ''}
          <div class="pk-team-r">${team.map(roleCard).join('')}</div></div>`;
    }
    if (d.listings.some(l => l.rental)) {
      // tent house / decorator / DJ: packages first, then the pieces on rent by category (tents, chairs, lights, bartan…)
      const pk = d.listings.filter(l => !l.rental), rt = d.listings.filter(l => l.rental);
      const cats = [...new Set(rt.map(l => l.category || 'other'))].sort((a, b) => Object.keys(TENT_NAME).indexOf(a) - Object.keys(TENT_NAME).indexOf(b));
      return `${pk.length ? `<div class="vsub-h">Packages <small>complete set-up at one price</small></div>${pk.map(itemRow).join('')}` : ''}
        <div class="vsub-h">${v.type === 'tent' ? 'Tent items' : 'Items'} on rent <small>${rt.length} items in ${cats.length} categories · only what is free on ${shortDate(date)}</small></div>${piecePicker(rt, cats, TENT_NAME, 'item')}`;
    }
    const boxes = d.listings.filter(l => l.kind === 'box'), goods = d.listings.filter(l => l.kind !== 'box');
    if (v.type === 'sweets' && boxes.length) return `<div class="vsub-h">🍬 Sweets <small>price per kg · bulk rates · cheapest first</small></div>${groupedRows(byPrice(goods))}
      <div class="vsub-h">📦 Boxes & packaging <small>cheapest first</small></div><div class="box-sum" id="boxSum"></div>${byPrice(boxes).map(itemRow).join('')}`;
    return mode === 'stock' ? groupedRows(byPrice(d.listings)) : d.listings.map(itemRow).join('');
  }
  // items not offered for the chosen function: greyed out with "Only for …" and taken out of the selection
  function markEv() {
    if (!isEv) return;
    for (const l of d.listings) {
      const row = $(`#it_${l.id}`), ok = evOk(l); if (!row) continue;
      row.classList.toggle('voff', !ok);
      $$('.vqty button, .vqty input, .gtiers select, .gtiers input', row).forEach(x => { x.disabled = !ok; });
      const off = $(`[data-evoff="${l.id}"]`, row); if (off) { off.className = ok ? '' : 'ev-only'; off.textContent = ok ? '' : `Only for ${l.covers.map(evShort).join(' & ')}`; } // class only when shown (.ev-only overrides [hidden])
      if (!ok && VS.sel[l.id]) { VS.sel[l.id] = 0; const i = $(`[data-vqi="${l.id}"]`, row); if (i) i.value = 0; const gs = $(`[data-gsel="${l.id}"]`, row); if (gs) gs.value = ''; const gp = $(`[data-gprice="${l.id}"]`, row); if (gp) gp.innerHTML = ''; }
    }
  }
  // halwai team: a rough rule of thumb — about 1 cook per 150 guests and 1 helper per 40 guests, in total
  function drawTeamTip() {
    const el = $('#teamTip'); if (!el) return;
    const pkg = d.listings.find(l => (l.guestTiers || []).length && VS.sel[l.id]);
    const g = pkg ? VS.selG[pkg.id] : Number(store.get('hwGuests', 0));
    if (!g) { el.innerHTML = '<span class="small muted">Choose the number of guests above to see how big a team you need.</span>'; return; }
    const want = { cook: Math.max(1, Math.ceil(g / 150)), helper: Math.max(2, Math.ceil(g / 40)) };
    el.innerHTML = `<span class="small">For <b>${g} guests</b> families usually need about <b>${want.cook} cook${want.cook > 1 ? 's' : ''}</b> and <b>${want.helper} helpers</b> in total. Type your own numbers above, or:</span>
      <button type="button" class="btn btn-light btn-sm" data-teamuse='${JSON.stringify(want)}'>Use this team</button>`;
  }
  // studio: one row per function — tick, date (the main function is on the booking date), service type, add-ons, free or not
  function drawPlan() {
    const box = $('#shootPlan'); if (!box) return;
    const R = planRows();
    box.innerHTML = offered.filter(ev => covFor(ev).length).map(ev => {
      const r = R[ev] || { on: false, add: [] }, main = ev === VS.selEv, ds = rowDate(ev);
      return `<div class="sp-row${r.on ? ' on' : ''}">
        <label class="sp-fn">${main ? '<i class="sp-main" title="Main function — on the booking date">✓</i>' : `<input type="checkbox" data-spon="${h(ev)}" ${r.on ? 'checked' : ''}>`}<span><b>${h(evShort(ev))}</b><small>${main ? 'Main function' : h((EVENT_INFO[ev] || {}).hi || '')}</small></span></label>
        ${r.on ? `<span class="sp-d">${main ? `<b>${shortDate(date)}</b>` : `<input type="date" min="${today()}" data-spdate="${h(ev)}" value="${h(r.date || '')}" aria-label="${h(evShort(ev))} date">`}<small>${ds ? dayTxt(ds) : '<span class="bad-txt">Date?</span>'}</small></span>
          <select class="input" data-spcov="${h(ev)}" aria-label="Service type for ${h(evShort(ev))}"><option value="">Service type…</option>${covFor(ev).map(o => `<option value="${h(o.id)}" ${o.id === r.cov ? 'selected' : ''}>${h(o.name)} · ${inr(ds ? priceAt(o.l, o.base, ds, !!o.s) : o.base)}</option>`).join('')}</select>
          ${addL.length ? `<span class="sp-add">${addL.map(a => `<label><input type="checkbox" data-spadd="${h(ev)}" value="${a.id}" ${r.add.includes(a.id) ? 'checked' : ''}> ${h(a.name)} <small>+${inr(a.normalPrice)}</small></label>`).join('')}</span>` : ''}`
        : '<span class="small muted sp-off">Tick to add</span>'}</div>`;
    }).join('');
  }
  // live: price per unit for the chosen quantity, and how many boxes the chosen mithai needs
  function refreshDyn() {
    drawPlan();
    drawTeamTip();
    const bc = $('#btChosen'); if (bc) bc.innerHTML = btChosenHtml(d.listings.filter(l => l.rental));
    for (const l of d.listings) {
      const el = $(`[data-unitp="${l.id}"]`); if (!el) continue;
      const qn = VS.sel[l.id] || 0, rule = ruleOf(l), u = ruleUnit(rule, Math.max(qn, 1)), bulkOn = (l.bulkTiers || []).some(x => qn >= x.min);
      const next = (l.bulkTiers || []).find(x => qn < x.min);
      el.innerHTML = qn ? `= <b>${inr(u)}</b>/${h(l.unit)}${bulkOn ? ' <span class="ok-txt">bulk rate ✓</span>' : ''} × ${qn} = <b>${inr(u * qn)}</b>${next ? ` <span class="muted">· ${next.min - qn} more for ${inr(next.price)}/${h(l.unit)}</span>` : ''}` : '';
    }
    const kg = d.listings.filter(l => l.kind !== 'box' && l.unit === 'kg').reduce((s, l) => s + (VS.sel[l.id] || 0), 0);
    const holds = d.listings.filter(l => l.kind === 'box').reduce((s, l) => s + (VS.sel[l.id] || 0) * (l.holdsKg || 0), 0);
    for (const l of d.listings.filter(x => x.kind === 'box' && x.holdsKg)) {
      const el = $(`[data-boxhelp="${l.id}"]`); if (!el) continue;
      const need = Math.ceil(kg / l.holdsKg);
      el.innerHTML = kg ? `For your ${kg} kg: <b>${need} boxes</b> <button type="button" class="btn btn-light btn-sm" data-boxuse="${l.id}" data-n="${need}">Use ${need}</button>` : '';
    }
    // full ceremony picked: a date for every rasam it covers (the main rasam is on the booking date)
    for (const l of d.listings.filter(x => coversOf(x).length)) {
      const box = $(`[data-vrd="${l.id}"]`), main = evMain(l, VS.selEv); if (!box) continue;
      if (!VS.sel[l.id] || !main) { box.innerHTML = ''; continue; }
      if (!VS.selD[l.id]) VS.selD[l.id] = Object.fromEntries(l.covers.filter(e => e !== main && S.events[e] && S.events[e] >= today()).map(e => [e, S.events[e]]));
      const given = VS.selD[l.id];
      box.innerHTML = `<div class="small muted" style="margin:8px 0 4px">📅 One booking, a date for each rasam — leave a rasam empty if not needed.</div>
        <div class="rdates">${l.covers.map(e => `<div class="rd${e === main ? ' on' : ''}"><span class="rd-n"><b>${h(evShort(e))}</b><small>${e === main ? 'Booking date' : h((EVENT_INFO[e] || {}).hi || '')}</small></span>
          ${e === main ? `<b>${fmtDate(date)}</b>` : `<input type="date" min="${today()}" data-vrdate="${l.id}" data-vrev="${h(e)}" value="${h(given[e] || '')}">`}<span class="rd-st">${dayTxt(e === main ? date : given[e])}</span></div>`).join('')}</div>`;
    }
    const sum = $('#boxSum');
    if (sum) sum.innerHTML = kg ? `🍬 Your mithai: <b>${kg} kg</b> · 📦 boxes chosen hold <b>${Math.round(holds * 100) / 100} kg</b> ${holds >= kg ? '<span class="ok-txt">✓ enough boxes</span>' : `<span class="bad-txt">— need boxes for ${Math.round((kg - holds) * 100) / 100} kg more</span>`}` : '<span class="muted">Choose sweets first — we will tell you how many boxes you need.</span>';
  }

  app().innerHTML = `<div class="crumbs"><a href="#/">Home</a> › <a href="#/vendors">Vendors</a> › <a href="#/vendors?type=${t.id}">${h(t.name)}</a></div>
  <div class="panel vdetail">
    ${v.person
      // one person: their own photo first (so the family knows who comes); work / food photos are with the ratings below
      ? `<div class="vgallery vg-person">${v.profilePhoto ? `<img class="vg-face" src="${h(v.profilePhoto)}" alt="${h(personName(v))}" onerror="this.remove()">` : ''}<div class="hw-mono vg-mono">${personAvatar(v, 'lg')}</div></div>`
      : `<div class="vgallery">${ph(photos[0], t.emoji, '#f6eef0', 'vg-main')}${photos.length > 1 ? `<div class="vg-thumbs">${photos.map((p, i) => `<button data-ph="${i}" class="${i ? '' : 'on'}">${ph(p, '', '#eee')}</button>`).join('')}</div>` : ''}</div>`}
    <div class="vinfo">
      <div class="small muted">${t.emoji} ${h(t.name)}${v.subtype && t.subtypes ? ' · ' + h((t.subtypes.find(x => x[0] === v.subtype) || [])[1] || '') : ''}</div>
      ${v.person ? `<div class="vperson-head"><div>
        <h1>${h(personName(v))} ${v.verified ? '<span class="vbadge inline">✓ Verified</span>' : ''} ${v.sample ? '<span class="vsample inline">Sample listing</span>' : ''}</h1>
        ${v.type !== 'orchestra' && v.owner && v.owner !== v.name ? `<div class="muted">${h(v.name)}</div>` : ''}${v.nameHi ? `<div class="hi muted">${h(v.nameHi)}</div>` : ''}
</div></div>`
      : `<h1>${h(v.name)} ${v.verified ? '<span class="vbadge inline">✓ Verified</span>' : ''} ${v.sample ? '<span class="vsample inline">Sample listing</span>' : ''}</h1>
      ${v.nameHi ? `<div class="hi muted">${h(v.nameHi)}</div>` : ''}`}
      <div class="vmeta vprofile-meta"><span>${h([v.districtName, v.state].filter(Boolean).join(', '))}</span>${d.reviews ? `<button type="button" class="link vprofile-link" data-vjump="vReviews">★ ${d.rating} · ${d.reviews} ${d.reviews === 1 ? 'review' : 'reviews'}</button>` : ''}</div>
      <div class="vprofile-book">
        <div>
          ${v.startingPrice > 0 ? `<strong>From ${inr(v.startingPrice)}</strong>` : ''}
          <div class="vprofile-date">${availPill(d.avail, date) || h(fmtDate(date))}</div>
        </div>
        <div class="vprofile-actions">
          <button type="button" class="btn btn-primary" data-vjump="vItems">${isPlan ? 'Choose functions' : mode === 'stock' ? 'Shop items' : 'View booking options'}</button>
          <button type="button" class="btn btn-light" data-vjump="vCal">Change date</button>
        </div>
      </div>
      ${v.sample ? '<p class="small muted vprofile-sample">Demo profile. Contact details are placeholders.</p>' : ''}
      ${d.lagan ? `<div class="vline lagan-note"><b>${fmtDate(date)} is a lagan (shubh vivah) date.</b> ${laganUp ? 'Lagan-day prices apply — shown below.' : 'Normal prices on lagan days.'}</div>` : ''}
      <details class="vprofile-extra">
      <summary>About, location & contact</summary>
      ${trustChips(v) ? `<div class="vmeta">${trustChips(v)}</div>` : ''}
      <dl class="vkv">
        ${v.person && v.experienceYears ? `<dt>Experience</dt><dd><b>${v.experienceYears} years</b>${skillTotal(v) ? ` · ${skillTotal(v)} ${v.type === 'pandit' ? 'pujas & skills' : 'skills'}` : ''}${hasAstro(v) ? ' · Jyotish / Astro' : ''}</dd>` : ''}
        ${v.person && (v.languages || []).length ? `<dt>Languages</dt><dd>${h(v.languages.join(', '))}</dd>` : ''}
        ${v.speciality ? `<dt>Speciality</dt><dd>${h(v.speciality)}</dd>` : ''}
        ${dishTotal(v) ? `<dt>Dishes</dt><dd>${dishTotal(v)} dishes <span class="small muted">(full list below)</span></dd>` : ''}
        ${v.type === 'orchestra' && d.listings.some(l => l.staff) ? `<dt>Extra artists</dt><dd>${d.listings.filter(l => l.staff).map(l => `<b>${l.left ?? l.units}</b> ${l.staff === 'dancer' ? 'lady dancers' : 'singers'} free on ${shortDate(date)}`).join(' · ')} <span class="small muted">— add to your show below</span></dd>` : ''}
        ${v.type === 'catering' && d.listings.some(l => l.staff) ? `<dt>Team</dt><dd>${['cook', 'helper'].map(r => { const n = d.listings.filter(l => l.staff === r).reduce((s, l) => s + (l.units || 0), 0); return n ? `up to <b>${n}</b> ${r}${n > 1 ? 's' : ''}` : ''; }).filter(Boolean).join(' · ')} <span class="small muted">for hire with the booking</span></dd>` : ''}
        ${v.type === 'catering' && d.listings.some(l => l.rental) ? `<dt>Bartan</dt><dd><b>${d.listings.filter(l => l.rental).length} items</b> on rent — degchi, kadhai, bhatti… <span class="small muted">(list below)</span></dd>` : ''}
        ${v.teamTotal ? `<dt>Team</dt><dd><b>${v.teamTotal} people</b> · ${v.teamLadies} ladies<div class="vkv-chips">${(v.teamRoles || []).map(r => `<span>${r.n} ${h(rolePl(r.role, r.n))}</span>`).join('')}</div></dd>` : ''}
        <dt>Location</dt><dd>${h(v.address)}, ${h(v.districtName)}, ${h(v.state)}${v.pincode ? ` – ${h(v.pincode)}` : ''} · <a class="link" target="_blank" rel="noopener" href="${mapUrl}">Map ↗</a></dd>
        <dt>Distance</dt><dd>${v.km != null ? `<b>${GEO.kmText(v.km, v.kmApprox)}</b> from your venue${v.samePin ? ' · same pincode' : ''} · <button type="button" class="link vprofile-link" data-locset>Change</button>`
          : '<button type="button" class="link vprofile-link" data-locset>Set venue location</button>'}</dd>
        <dt>Contact</dt><dd>${h(v.owner)} · <a class="link" href="tel:+91${h(v.phone)}">+91 ${h(v.phone)}</a></dd>
        ${v.advance > 0 ? `<dt>Advance</dt><dd><b>${inr(v.advance)}</b> to confirm your date <span class="small muted">— paid to the vendor after they confirm; the rest on the day</span></dd>` : ''}
        ${hasRental ? `<dt>Delivery</dt><dd>${v.delivery && v.delivery.available ? `Delivery & set-up ${v.delivery.charge ? inr(v.delivery.charge) : 'free'}${v.delivery.freeAbove ? ` · free above ${inr(v.delivery.freeAbove)}` : ''}` : 'Set-up at your venue included'}</dd>` : ''}
        ${mode === 'stock' ? `<dt>Delivery</dt><dd>${v.delivery && v.delivery.available ? `Home delivery ${v.delivery.charge ? inr(v.delivery.charge) : 'free'}${v.delivery.freeAbove ? ` · free above ${inr(v.delivery.freeAbove)}` : ''}` : 'Pickup from shop only'}${v.stockUpdated === today() ? ' · <span class="av fresh">Stock updated today</span>' : v.stockUpdated ? ` · stock updated ${fmtDate(v.stockUpdated)}` : ''}</dd>` : ''}
      </dl>
      ${v.about ? `<div class="vabout"><h4>About</h4><p>${h(v.about)}</p>${(v.tags || []).length ? `<div class="vhl">${v.tags.map(x => `<span>${h(x)}</span>`).join('')}</div>` : ''}</div>` : ''}
      <div class="cta-row" style="margin-top:12px"><a class="btn btn-light" href="tel:+91${h(v.phone)}">📞 Call</a><a class="btn btn-wa" target="_blank" rel="noopener" href="${wa}">💬 WhatsApp</a>
        <a class="btn btn-light" target="_blank" rel="noopener" href="${h(shareLink(`${v.person ? personName(v) : v.name} — ${t.name} · ${S.meta.settings.siteName}`, '#/v/' + v.id))}">↗ Share with family</a></div>
      </details>
      ${['tent', 'decoration'].includes(v.type) ? '<div class="vprofile-visit"><button type="button" class="link vprofile-link" id="vVisit">Book a free site visit</button></div>' : ''}
    </div>
  </div>
  <div class="vcols">
    <div>
      <section class="panel vsec" id="vItems"><div class="group-h" style="background:#fff;font-size:17px">${h(itemLabel)} <span class="small muted" style="font-weight:500">for ${fmtDate(date)}</span>${hasRental && v.type !== 'catering' ? `<a class="btn btn-light btn-sm" href="#/tent?vendor=${h(v.id)}">⛺ Item-by-item catalog →</a>` : ''}</div>
        ${itemsHtml()}
      </section>
      ${['catering', 'orchestra'].includes(v.type) && d.ahead ? aheadCalHtml(d.ahead, date, v) : `<section class="panel vsec" id="vCal"><div class="group-h" style="background:#fff;font-size:17px">📅 Availability <span><button class="btn btn-light btn-sm" data-m="${shiftM(-1)}" ${canPrev ? '' : 'disabled'}>‹</button> <b>${new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</b> <button class="btn btn-light btn-sm" data-m="${shiftM(1)}">›</button></span></div>
        <div class="vcal-head">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<div>${x}</div>`).join('')}</div>
        <div class="vcal">${'<div></div>'.repeat(pad)}${d.calendar.map(c => `<button class="vday ${c.status} ${c.date === date ? 'sel' : ''} ${c.lagan ? 'lg' : ''}" data-day="${c.date}" ${['past', 'closed'].includes(c.status) ? 'disabled' : ''} title="${c.status}${c.lagan ? ' · 🪔 Lagan' : ''}">${Number(c.date.slice(8))}</button>`).join('')}</div>
        <div class="vlegend"><span><i class="available"></i>Available</span><span><i class="full"></i>Booked</span><span><i class="closed"></i>Closed</span><span><i class="sel"></i>Your date</span></div>
        ${lockNote(v)}
      </section>`}
      ${dishesHtml(v)}
      ${skillsHtml(v)}
      ${teamHtml(v)}
      ${!v.person && PORTFOLIO_TYPES.includes(v.type) && (v.photos.length > 1 || v.videos.length) ? `<section class="panel vsec"><div class="group-h" style="background:#fff;font-size:17px">🎞️ Portfolio</div>
        <div class="vport">${v.photos.map((p, i) => `<button data-ph="${i}">${ph(p, '', '#eee')}</button>`).join('')}</div>
        ${v.videos.length ? `<div style="padding:0 16px 14px">${v.videos.map(u => `<a class="btn btn-light btn-sm" target="_blank" rel="noopener" href="${h(u)}" style="margin:4px 6px 0 0">▶ Watch video</a>`).join('')}</div>` : ''}</section>` : ''}
      <section class="panel vsec" id="vReviews"><div class="group-h" style="background:#fff;font-size:17px">⭐ Ratings & Reviews</div>
        <div class="vrev-sum">${d.reviews ? `<div class="vrev-big"><b>${d.rating}</b><div>${stars(d.rating)}</div><span class="small muted">${d.reviews} reviews</span></div>
          <div class="vrev-bars">${d.breakdown.map((n, i) => `<div><span>${5 - i}★</span><i><b style="width:${d.reviews ? Math.round(n / d.reviews * 100) : 0}%"></b></i><span>${n}</span></div>`).join('')}</div>` : '<p class="muted">No reviews yet. Customers can review after their booking is completed.</p>'}</div>
        ${v.person && (v.photos.length || v.videos.length) ? `<div class="vwork"><h4>Work photos <span class="small muted">${v.type === 'catering' ? 'food & bhoj' : 'from past weddings'}</span></h4>
          <div class="vport">${v.photos.map((p, i) => `<button data-wph="${i}">${ph(p, '', '#eee')}</button>`).join('')}</div>
          ${v.videos.length ? `<div>${v.videos.map(u => `<a class="btn btn-light btn-sm" target="_blank" rel="noopener" href="${h(u)}" style="margin:4px 6px 0 0">▶ Watch video</a>`).join('')}</div>` : ''}</div>` : ''}
        <div id="vRevList"></div>
        <details class="vrev-write"><summary class="link">✍️ Write a review (after your booking is completed)</summary>
          <form id="vRevForm" class="grid-2" style="margin-top:10px"><div class="field"><label>Booking number</label><input name="number" placeholder="VB5001" required></div><div class="field"><label>Mobile used for booking</label><input name="phone" inputmode="numeric" maxlength="10" required></div>
            <div class="field"><label>Rating</label><select name="rating">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${'★'.repeat(n)} (${n})</option>`).join('')}</select></div><div class="field" style="grid-column:1/-1"><label>Your review</label><textarea name="text" rows="2" maxlength="1000"></textarea></div>
            <button class="btn btn-primary btn-sm">Submit review</button></form></details>
      </section>
    </div>
    <aside class="panel vbook" id="vBook"></aside>
  </div>
  <div class="vsticky" id="vSticky"></div>`;

  $$('[data-vjump]').forEach(button => button.addEventListener('click', () => {
    const section = document.getElementById(button.dataset.vjump);
    if (!section) return;
    section.tabIndex = -1;
    section.focus({ preventScroll: true });
    section.scrollIntoView({ block: 'start' });
  }));

  $('#vRevList').innerHTML = d.reviewList.map(r => `<div class="vrev"><div><b>${h(r.name)}</b> <span class="vrate sm">★ ${r.rating}</span> ${r.verified ? '<span class="chip pay-paid">Verified booking</span>' : ''}${r.sample ? '<span class="vsample inline">Sample</span>' : ''} <span class="small muted">${fmtDate(r.createdAt)}</span></div>${r.text ? `<p>${h(r.text)}</p>` : ''}${r.reply ? `<div class="vrev-reply"><b>Reply from vendor:</b> ${h(r.reply)}</div>` : ''}</div>`).join('');

  // phones: booking bar fixed at the bottom so the customer never has to scroll to book
  const drawSticky = (ls, total, blocked, inCart) => {
    const n = ls.reduce((a, x) => a + x.qty, 0);
    $('#vSticky').innerHTML = blocked
      ? `<div class="vs-info"><b class="bad-txt">Not free on ${shortDate(date)}</b><small>Pick another date</small></div><button class="btn btn-gold" data-vs="cal">📅 Change date</button>`
      : n ? `<div class="vs-info"><b>${inr(total)}</b><small>${n} selected · ${shortDate(date)}</small></div><button class="btn btn-light vs-cart" data-vs="add" aria-label="Add to cart">🛒</button><button class="btn btn-gold" data-vs="go">Book Now →</button>`
      : `<div class="vs-info"><b>${v.startingPrice ? 'From ' + inr(v.startingPrice) : h(v.name)}</b><small>${inCart ? 'In your cart · ' : ''}Free on ${shortDate(date)}</small></div><button class="btn btn-gold" data-vs="pick">${isPlan ? 'Choose functions' : `Select ${mode === 'unit' ? 'vehicles' : 'items'}`} ↓</button>`;
  };
  $('#vSticky').addEventListener('click', e => {
    const b = e.target.closest('[data-vs]'); if (!b) return;
    if (b.dataset.vs === 'add') $('#vbAdd').click();
    else if (b.dataset.vs === 'go') $('#vbGo').click();
    else (b.dataset.vs === 'cal' ? $('#vCal') : $('#vItems')).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // for families who would rather talk: the whole booking as one WhatsApp message to the vendor (date, function, items,
  // total, and lines for the village / address and mobile to fill in)
  const waBook = (ls, total) => `https://wa.me/91${v.whatsapp || v.phone}?text=${encodeURIComponent(
    `Namaste ${v.name} ji 🙏\n${S.meta.settings.siteName} se booking karni hai:\n\n📅 Date: ${fmtDate(date)}${isEv && VS.selEv ? `\n🎉 Function: ${evShort(VS.selEv)}` : ''}\n`
    + ls.map(x => (x.plan ? `• ${evShort(x.dates[0].event)} (${fmtDate(x.dates[0].date)}): ${x.name} = ${inr(x.price)}` : `• ${x.name}${x.guests ? '' : ` × ${x.qty}`} = ${inr(x.price * x.qty)}`)).join('\n')
    + `\n\nTotal: ${inr(total)}${v.advance > 0 ? `\nAdvance: ${inr(v.advance)}` : ''}\n\nNaam: \nGaon / pata: \nMobile: \n\nKripya date confirm kijiye.`)}`;
  const drawBook = () => {
    const ls = lines(), sub = ls.reduce((a, x) => a + x.price * x.qty, 0);
    const canDeliver = mode === 'stock' && v.delivery && v.delivery.available;
    VS.fulfil = VS.fulfil || (canDeliver ? 'delivery' : 'pickup');
    // rental pieces are brought & set up: the vendor's delivery charge applies to them
    const del = (canDeliver && VS.fulfil === 'delivery') || (ls.some(x => x.l.rental) && v.delivery && v.delivery.available) ? (v.delivery.freeAbove && sub >= v.delivery.freeAbove ? 0 : v.delivery.charge || 0) : 0;
    // made-to-order items (cards) need some days: the date must be far enough ahead
    const plusDays = n => { const x = new Date(today() + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    const lead = Math.max(0, ...ls.map(x => x.l.leadDays || 0)), soonest = plusDays(lead), tooSoon = lead > 0 && date < soonest;
    // only rental pieces chosen: the day's package slots being full does not matter (each piece has its own stock)
    const rentOnly = ls.length > 0 && ls.every(x => x.l.rental) && d.avail.status === 'full' && !d.avail.offline;
    const blocked = (d.avail.status !== 'available' && !rentOnly) || tooSoon;
    // full ceremony: every other rasam date must be free as well
    const rdBad = ls.flatMap(x => (x.dates || []).filter(y => y.date !== date && (y.date < today() || ['full', 'closed'].includes(dayOf(y.date)))))[0];
    const miss = planMiss(), stop = rdBad || miss;
    const inCart = VS.vcart.filter(x => x.vendorId === v.id && x.date === date);
    const others = groupsOf(VS.vcart).filter(g => !(g.vendorId === v.id && g.date === date));
    const evDate = isEv && S.events[VS.selEv] && S.events[VS.selEv] !== date && S.events[VS.selEv] >= today() ? S.events[VS.selEv] : '';
    $('#vBook').innerHTML = `<h3 style="margin:0 0 10px">Book ${h(v.name)}</h3>
      <div class="field"><label>${v.type === 'cards' ? 'Cards needed by' : mode === 'stock' ? 'Delivery / pickup date' : 'Date'}</label><input type="date" id="vbDate" min="${today()}" value="${date}"></div>
      <div style="margin:-4px 0 10px">${availPill(d.avail, date) || '<span class="av off">Choose a date</span>'}</div>
      ${offered.length ? `<div class="field"><label>Kis function ke liye?</label><div class="ev-chips" id="vbEv">${funcChips(offered, VS.selEv, 'data-vev')}</div>
        ${evDate ? `<button type="button" class="btn btn-light btn-sm" id="vbEvDate" style="margin-top:-6px">📅 Use ${h(evShort(VS.selEv))} date ${shortDate(evDate)}</button>` : ''}</div>` : ''}
      ${rdBad ? `<div class="lead-warn">⚠️ ${h(evShort(rdBad.event))} date ${shortDate(rdBad.date)} is not free — choose another date</div>` : ''}
      ${miss && !rdBad ? `<div class="lead-warn">✍️ ${h(miss)} in “Your functions”</div>` : ''}
      ${tooSoon ? `<div class="lead-warn">⏱ ${h(ls.find(x => (x.l.leadDays || 0) === lead).l.name)} takes <b>${lead} days</b> to make. Earliest: <b>${fmtDate(soonest)}</b> <button type="button" class="btn btn-gold btn-sm" id="vbSoonest">Set ${shortDate(soonest)}</button></div>` : ''}
      ${ls.length ? `<div class="vb-lines">${ls.map(x => `<div><span>${x.plan ? `<small class="sp-tag">${h(evShort(x.dates[0].event))} · ${shortDate(x.dates[0].date)}</small> ` : ''}${h(x.name)}${x.guests || x.plan ? '' : ` × ${x.qty}`}${x.dates && !x.plan ? `<br><small class="muted">${x.dates.map(y => `${h(evShort(y.event))} ${shortDate(y.date)}`).join(' · ')}</small>` : ''}</span><b>${inr(x.price * x.qty)}</b></div>`).join('')}${del ? `<div><span>Delivery</span><b>${inr(del)}</b></div>` : ''}<div class="vb-total"><span>Total</span><b>${inr(sub + del)}</b></div></div>` : `<p class="small muted">${isPlan ? 'Tick your functions, give their dates and choose a service type under “Your functions”.' : 'Select items / services from the list using + .'}</p>`}
      ${canDeliver ? `<div class="vb-ful"><label class="${VS.fulfil === 'delivery' ? 'on' : ''}"><input type="radio" name="ful" value="delivery" ${VS.fulfil === 'delivery' ? 'checked' : ''}> 🚚 Delivery</label><label class="${VS.fulfil === 'pickup' ? 'on' : ''}"><input type="radio" name="ful" value="pickup" ${VS.fulfil === 'pickup' ? 'checked' : ''}> 🏪 Pickup</label></div>` : ''}
      ${ls.length && v.advance > 0 ? `<div class="vb-adv"><b>Advance ${inr(v.advance)}</b> to ${h(v.name)} after they confirm — the rest${sub + del > v.advance ? ` (${inr(sub + del - v.advance)})` : ''} on the function day. Pay by UPI or cash and keep the receipt.</div>` : ''}
      <div class="cta-row" style="flex-direction:column">
        <button class="btn btn-ghost btn-block" id="vbAdd" ${blocked || stop || !ls.length ? 'disabled' : ''}>🛒 ${inCart.length ? 'Update Cart' : 'Add to Cart'}</button>
        <button class="btn btn-gold btn-block btn-lg" id="vbGo" ${blocked || stop || !ls.length ? 'disabled' : ''}>Book Now →</button>
        ${ls.length && !blocked && !stop ? `<a class="btn btn-wa btn-block" target="_blank" rel="noopener" href="${waBook(ls, sub + del)}">💬 Book on WhatsApp instead</a>` : ''}
      </div>
      ${ls.length && !blocked ? `<p class="small vb-hold">Your selected dates are held for up to <b>48 hours</b> while the vendor responds. Check your exact deadline in My Vendor Bookings after requesting.</p>` : ''}
      ${inCart.length && !ls.length ? `<button class="btn btn-light btn-sm btn-block" id="vbRm" style="margin-top:8px">Remove ${h(v.name)} from cart</button>` : ''}
      <p class="small muted" style="margin:10px 0 0">${tooSoon ? 'Choose a later date to book these items.' : blocked ? 'Not available on this date — pick another date in the calendar.' : 'Add several vehicles, items or vendors to the cart — then book everything together at checkout. No payment now; pay vendors directly as agreed.'}</p>
      ${others.length ? `<div class="vb-others"><b>Also in your cart:</b>${others.map(g => `<div><a class="link" href="#/v/${g.vendorId}">${h(g.vendorName)}</a> · ${shortDate(g.date)} · ${inr(g.total)}</div>`).join('')}<a class="btn btn-primary btn-sm btn-block" href="#/cart" style="margin-top:8px">View cart & book all →</a></div>` : ''}`;
    $('#vbDate').addEventListener('change', e => { if (e.target.value) { setVDate(e.target.value); viewVendor(id, new URLSearchParams()); } });
    const soon = $('#vbSoonest'); if (soon) soon.addEventListener('click', () => { setVDate(soonest); viewVendor(id, new URLSearchParams()); });
    $$('[data-vev]', $('#vBook')).forEach(b => b.addEventListener('click', () => { VS.selEv = b.dataset.vev; markEv(); refreshDyn(); drawBook(); }));
    const evSel = $('[data-evsel]', $('#vBook')); if (evSel) evSel.addEventListener('change', () => { if (!evSel.value) return; VS.selEv = evSel.value; markEv(); refreshDyn(); drawBook(); });
    const evd = $('#vbEvDate'); if (evd) evd.addEventListener('click', () => { VS.wantEv = VS.selEv; setVDate(evDate); viewVendor(id, new URLSearchParams()); });
    $$('input[name=ful]', $('#vBook')).forEach(r => r.addEventListener('change', () => { VS.fulfil = r.value; VS.vcart.forEach(x => { if (x.vendorId === v.id && x.date === date) x.fulfil = r.value; }); saveVCart(); drawBook(); }));
    const put = () => {
      // the stepper shows the wanted quantity for this vendor + date: replace those cart lines
      const tm = dateTime(date);
      VS.vcart = VS.vcart.filter(x => !(x.vendorId === v.id && x.date === date));
      for (const x of ls) VS.vcart.push({ vendorId: v.id, vendorName: v.name, type: v.type, mode, date, listingId: x.l.id, name: x.name, nameHi: x.l.nameHi || '', unit: x.l.unit, price: x.price, qty: x.qty, guests: x.guests, max: x.guests ? 1 : maxQty(x.l), photo: x.l.photo || v.photos[0] || '', emoji: t.emoji, delivery: mode === 'stock' || hasRental ? (v.delivery || null) : null, fulfil: VS.fulfil,
        ...(x.l.rental ? { rental: true, category: x.l.category || 'other', size: x.l.size || '' } : {}), ...(tm ? { eventTime: tm } : {}),
        ...(x.rule ? { rule: x.rule, min: x.l.minQty || 1, kind: x.l.kind || '', addons: x.addons } : {}), ...(isEv ? { event: VS.selEv } : {}), ...(x.dates ? { dates: x.dates } : {}), ...(x.style ? { style: x.style } : {}), ...(x.plan ? { plan: true, shoot: x.shoot } : {}) });
      saveVCart();
    };
    $('#vbAdd').addEventListener('click', () => { put(); flyToCart($('.vgallery')); toast(`${v.name} added to cart ✓`); drawBook(); });
    $('#vbGo').addEventListener('click', () => { put(); location.hash = '#/cart'; });
    drawSticky(ls, sub + del, blocked, inCart.length);
    const rm = $('#vbRm'); if (rm) rm.addEventListener('click', () => { VS.vcart = VS.vcart.filter(x => !(x.vendorId === v.id && x.date === date)); saveVCart(); toast('Removed from cart'); drawBook(); });
  };
  markEv(); refreshDyn(); // function rules and rasam dates before the first booking box
  drawBook();

  // quantity: respects the minimum order (going below it drops to 0), then live prices and the cart box update
  const setQty = (lid, val) => {
    const l = d.listings.find(x => x.id === lid), was = VS.sel[lid] || 0;
    let n = Math.max(0, Math.min(maxQty(l), Math.round(val) || 0));
    if ((l.staff || l.rental) && Math.round(val) > maxQty(l)) toast(`Only ${maxQty(l)} ${l.staff ? (ROLE_LABEL[l.staff] || l.staff).toLowerCase().replace(/^extra /, '') : /piece/.test(l.unit || '') ? 'pieces' : l.unit} free on ${shortDate(date)}`);
    if (n > 0 && l.minQty > 1 && n < l.minQty) { if (n < was) n = 0; else { n = Math.min(maxQty(l), l.minQty); toast(`Minimum order for ${l.name} is ${l.minQty} ${l.unit}`); } }
    VS.sel[lid] = n;
    const inp = $(`[data-vqi="${lid}"]`); if (inp) inp.value = n;
    refreshDyn(); drawBook();
  };
  const items = $('#vItems');
  items.addEventListener('click', e => {
    const b = e.target.closest('[data-vq]');
    if (b) { const l = d.listings.find(x => x.id === b.dataset.l); const step = mode === 'unit' ? 1 : qtyStep({ ...l, type: v.type }); return setQty(b.dataset.l, (VS.sel[b.dataset.l] || 0) + Number(b.dataset.vq) * step); }
    const use = e.target.closest('[data-boxuse]'); if (use) return setQty(use.dataset.boxuse, Number(use.dataset.n));
    // bartan: add the chosen item (more of the same adds up), or remove it from the list
    if (e.target.closest('#btAdd')) {
      const sel = $('#btSel'), id = sel.value, n = Math.max(1, Math.round(Number($('#btQty').value)) || 1);
      if (!id) { sel.focus(); return toast('Choose a bartan from the list first'); }
      setQty(id, (VS.sel[id] || 0) + n); sel.value = ''; $('#btQty').value = 1;
      return;
    }
    const bx = e.target.closest('[data-btx]'); if (bx) return setQty(bx.dataset.btx, 0);
    // a style card: choose it (and the item, if not chosen yet)
    const sb = e.target.closest('[data-vsty]');
    if (sb) {
      const lid = sb.dataset.vsty, l = d.listings.find(x => x.id === lid);
      VS.selS[lid] = sb.dataset.k;
      $$(`[data-vsty="${lid}"]`).forEach(x => x.classList.toggle('on', x === sb));
      if (!VS.sel[lid]) return setQty(lid, l.minQty || 1);
      refreshDyn(); return drawBook();
    }
    const tu = e.target.closest('[data-teamuse]');
    if (tu) {
      // the suggested team, as far as people are free on the date
      const want = JSON.parse(tu.dataset.teamuse), short = [];
      for (const l of d.listings.filter(x => x.staff)) {
        const n = Math.min(maxQty(l), want[l.staff] || 0);
        if (n < (want[l.staff] || 0)) short.push(`only ${maxQty(l)} ${l.staff}${maxQty(l) === 1 ? '' : 's'}`);
        VS.sel[l.id] = n; const inp = $(`[data-vqi="${l.id}"]`); if (inp) inp.value = n;
      }
      refreshDyn(); drawBook();
      return toast(short.length ? `Team added — ${short.join(' and ')} free on ${shortDate(date)}` : 'Team added ✓');
    }
    const pics = e.target.closest('[data-cdpics]');
    if (pics) { const l = d.listings.find(x => x.id === pics.dataset.cdpics), views = cardViewsOf(l); return photoViewer(views.map(x => x[0]), 0, l.name, views.map(x => x[1])); }
    const ft = e.target.closest('[data-cft]');
    if (ft) { VS.cf.type = ft.dataset.cft; $$('[data-cft]', items).forEach(x => x.classList.toggle('on', x === ft)); $('#cardGrid').innerHTML = cardGrid(); refreshDyn(); }
  });
  // company / brand chosen: that brand's photo, price, stock and quantity in the same place
  const showBrand = lid => {
    const l = d.listings.find(x => x.id === lid), wrap = l && $(`[data-brg="${CSS.escape(gKey(l))}"]`, items); if (!wrap) return;
    VS.selB[gKey(l)] = lid;
    wrap.innerHTML = itemRow(l, brandPick(d.listings.filter(x => gKey(x) === gKey(l)), l));
    refreshDyn();
  };
  items.addEventListener('click', e => { const b = e.target.closest('[data-brgo]'); if (b) showBrand(b.dataset.brgo); });
  items.addEventListener('change', e => {
    const bs = e.target.closest('[data-brsel]'); if (bs) return showBrand(bs.value);
    // studio shoot plan: tick a function (its saved date filled in), its date, service type, add-ons, or one type for all
    const sp = e.target.closest('[data-spon], [data-spdate], [data-spcov], [data-spadd], [data-spall]');
    if (sp) {
      const R = planRows(), ev = sp.dataset.spon || sp.dataset.spdate || sp.dataset.spcov || sp.dataset.spadd;
      const r = ev ? (R[ev] = R[ev] || { on: false, date: '', cov: '', add: [] }) : null;
      if ('spon' in sp.dataset) { r.on = sp.checked; if (r.on && !r.date && S.events[ev] && S.events[ev] >= today() && S.events[ev] !== date) r.date = S.events[ev]; if (r.on && !r.cov) { const prev = planOn().map(x => R[x].cov).find(c => c && covFor(ev).some(o => o.id === c)); r.cov = prev || ''; } }
      else if ('spdate' in sp.dataset) r.date = sp.value;
      else if ('spcov' in sp.dataset) r.cov = sp.value;
      else if ('spadd' in sp.dataset) r.add = sp.checked ? [...new Set([...r.add, sp.value])] : r.add.filter(x => x !== sp.value);
      else if (sp.value) { for (const x of planOn()) if (covFor(x).some(o => o.id === sp.value)) R[x].cov = sp.value; sp.value = ''; }
      refreshDyn(); return drawBook();
    }
    const i = e.target.closest('[data-vqi]'); if (i) return setQty(i.dataset.vqi, Number(i.value));
    const rdi = e.target.closest('[data-vrdate]');
    if (rdi) { (VS.selD[rdi.dataset.vrdate] = VS.selD[rdi.dataset.vrdate] || {})[rdi.dataset.vrev] = rdi.value; refreshDyn(); return drawBook(); }
    const a = e.target.closest('[data-addon]');
    if (a) {
      const lid = a.dataset.addon, set = new Set(VS.selA[lid] || []);
      if (a.checked) set.add(a.value); else set.delete(a.value);
      VS.selA[lid] = [...set];
      const l = d.listings.find(x => x.id === lid);
      if (a.checked && !VS.sel[lid]) return setQty(lid, l.minQty || 1); // ticking an add-on picks the design
      refreshDyn(); return drawBook();
    }
    if (e.target.matches('[data-cfp]')) { VS.cf.print = e.target.value; $('#cardGrid').innerHTML = cardGrid(); refreshDyn(); }
    if (e.target.matches('[data-cfs]')) { VS.cf.sort = e.target.value; $('#cardGrid').innerHTML = cardGrid(); refreshDyn(); }
  });
  refreshDyn();
  // from the card gallery: open with that design chosen at its minimum order
  const pre = q.get('design') && d.listings.find(l => l.id === q.get('design'));
  if (pre) { if (!VS.sel[pre.id]) setQty(pre.id, Number(q.get('qty')) || pre.minQty || 1); setTimeout(() => { const el = $(`#it_${pre.id}`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); } }, 150); }
  const dq = $('#dishQ');
  if (dq) dq.addEventListener('input', () => {
    const s = dq.value.trim().toLowerCase();
    $$('.dish-g').forEach(g => { let any = false; $$('.dish-chips span, .dish-list li', g).forEach(c => { const hit = !s || c.textContent.toLowerCase().includes(s); c.hidden = !hit; any = any || hit; }); g.hidden = !any; });
    $('.dish-none').hidden = !s || $$('.dish-g').some(g => !g.hidden);
  });
  if (q.get('dishes') && $('#vDishes')) setTimeout(() => $('#vDishes').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  if (q.get('team') && $('#vTeam')) setTimeout(() => $('#vTeam').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  if (q.get('cal') && $('#vCal')) setTimeout(() => $('#vCal').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  const vb = $('#vVisit'); if (vb) vb.addEventListener('click', () => openVisit(v));
  // from a "From local vendors" card: straight to that item, briefly highlighted
  const want = q.get('item') && $(`#it_${CSS.escape(q.get('item'))}`);
  if (want) setTimeout(() => { want.scrollIntoView({ block: 'center' }); want.classList.add('hl'); }, 150);
  // guest count: a package from the dropdown, or any number ("Custom") priced at the package that covers it
  const setGuests = (lid, n) => {
    const l = d.listings.find(x => x.id === lid), ok = n > 0 && !!guestTier(l, n);
    VS.sel[lid] = ok ? 1 : 0; VS.selG[lid] = ok ? n : 0;
    $(`[data-gprice="${lid}"]`).innerHTML = n > 0 ? guestPriceTxt(l, n) : '';
    refreshDyn(); drawBook();
  };
  $$('[data-gsel]').forEach(s => s.addEventListener('change', () => {
    const lid = s.dataset.gsel, box = $(`[data-gsel-n="${lid}"]`);
    box.hidden = s.value !== 'custom';
    if (s.value === 'custom') { box.focus(); if (box.value) setGuests(lid, Math.round(Number(box.value))); return; }
    setGuests(lid, Number(s.value) || 0);
  }));
  $$('[data-gsel-n]').forEach(i => i.addEventListener('input', () => setGuests(i.dataset.gselN, Math.round(Number(i.value)) || 0)));
  $$('[data-day]').forEach(b => b.addEventListener('click', () => { setVDate(b.dataset.day); viewVendor(id, new URLSearchParams(month !== b.dataset.day.slice(0, 7) ? '' : `m=${month}`)); }));
  $$('[data-m]').forEach(b => b.addEventListener('click', () => viewVendor(id, new URLSearchParams(`m=${b.dataset.m}`))));
  $$('[data-lpics]').forEach(b => b.addEventListener('click', () => { const l = d.listings.find(x => x.id === b.dataset.lpics); photoViewer(l.photos, 0, l.name); }));
  $$('[data-wph]').forEach(b => b.addEventListener('click', () => photoViewer(v.photos, Number(b.dataset.wph), `${personName(v)} · work photos`)));
  $$('[data-ph]').forEach(b => b.addEventListener('click', () => {
    const p = photos[Number(b.dataset.ph)];
    const main = $('.vg-main'); main.innerHTML = `${h(t.emoji)}${p ? `<img src="${h(p)}" alt="">` : ''}`;
    $$('.vg-thumbs button').forEach(x => x.classList.toggle('on', x.dataset.ph === b.dataset.ph));
    main.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  $('#vRevForm').addEventListener('submit', async e => {
    e.preventDefault();
    try { await api('/api/vreviews', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast('Thank you for your review ✓'); viewVendor(id, q); } catch (err) { toast(err.message, true); }
  });
  // booked this vendor from this phone? fill in the booking number + mobile (a completed, not yet reviewed one first)
  (async () => {
    const own = VS.myVB.filter(x => x.vendorId === v.id), unknown = VS.myVB.filter(x => !x.vendorId).slice(0, 15);
    if (!own.length && !unknown.length) return;
    const rs = await Promise.all([...own, ...unknown].map(x => api(`/api/vbookings/track?number=${encodeURIComponent(x.number)}&phone=${encodeURIComponent(x.phone)}`).then(r => r.booking).catch(() => null)));
    // remember which vendor each saved booking is for, so next time no lookup is needed
    let learnt = false;
    for (const b of rs) { const x = b && VS.myVB.find(y => y.number === b.number && !y.vendorId); if (x) { x.vendorId = b.vendorId; learnt = true; } }
    if (learnt) store.set('myvb', VS.myVB);
    const mine = rs.filter(b => b && b.vendorId === v.id), pick = mine.find(b => b.status === 'completed' && !b.reviewed) || mine[0];
    const form = $('#vRevForm');
    if (!pick || !form || !form.isConnected || form.elements.number.value) return;
    form.elements.number.value = pick.number; form.elements.phone.value = pick.customer.phone;
    if (pick.status === 'completed' && !pick.reviewed) form.closest('details').open = true;
  })().catch(() => {});
}

/* ---------------- Booking success, tracking, join ---------------- */
const VB_LABEL = { requested: 'Requested – waiting for vendor', confirmed: 'Confirmed by vendor', completed: 'Completed', cancelled: 'Cancelled', rejected: 'Vendor not available' };
const vbStatus = s => `<span class="status ${{ requested: 'st-placed', confirmed: 'st-confirmed', completed: 'st-delivered', cancelled: 'st-cancelled', rejected: 'st-cancelled' }[s]}">${VB_LABEL[s]}</span>`;
const whenTxt = iso => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) + ' IST';
// waiting: until when the date is held; released: the vendor did not answer; confirmed: the advance to lock it
function vbHoldLine(b) {
  if (b.expired) return `<div class="vb-hold vb-gone">⌛ ${h(b.vendorName)} did not answer in time, so the date was released. Please book another vendor for ${fmtDate(b.date)}.</div>`;
  if (b.status === 'requested' && b.answerBy) return `<div class="vb-hold">⏳ Your selection is held until <b>${whenTxt(b.answerBy)}</b> while ${h(b.vendorName)} responds.${b.advance ? ` The requested advance is <b>${inr(b.advance)}</b>, payable after confirmation.` : ''}</div>`;
  if (b.status === 'confirmed' && b.advance && !(b.money || {}).paid) return `<div class="vb-adv">Advance: <b>${inr(b.advance)}</b>. Confirm payment and service arrangements with the vendor. ${S.meta.settings.payments.online ? 'You can pay online below or pay the vendor directly.' : 'Pay the vendor directly and keep the receipt.'}</div>`;
  if (b.status === 'confirmed') return '<div class="vb-hold">Your vendor has confirmed. Contact them to agree on arrival, setup, or pickup details.</div>';
  return '';
}
// paid online / pay online now / refund on its way — once the vendor has confirmed
function vbPayLine(b) {
  const m = b.money || {}, online = S.meta.settings.payments.online, d = m.due, ph = h(b.customer.phone), n = h(b.number);
  const refunded = (b.refunds || []).filter(r => r.status !== 'failed').reduce((s, r) => s + r.amount, 0);
  const paidTxt = m.paid ? `<span class="ok-txt"><b>✓ Paid online ${inr(m.paid)}</b></span>${refunded ? ` · refunded ${inr(refunded)}` : ''}${['confirmed', 'completed'].includes(b.status) && d ? ` · left ${inr(d.full)}` : ''}` : '';
  const owed = m.refundOwed ? `<div class="small bad-txt" style="margin-top:4px">Refund of ${inr(m.refundOwed)} is due — our team sends it back to the same account (5–7 working days).</div>` : '';
  const btns = online && d ? `<div class="vb-paybtns">${d.advance ? `<button class="btn btn-gold btn-sm" data-vbpay="${n}" data-phone="${ph}" data-part="advance">💳 Pay advance ${inr(d.advance)} online</button>` : ''}
      <button class="btn ${d.advance ? 'btn-light' : 'btn-gold'} btn-sm" data-vbpay="${n}" data-phone="${ph}" data-part="full">💳 Pay ${d.advance ? 'full' : m.paid ? 'the rest' : ''} ${inr(d.full)} online</button>
      ${(b.rzpOrders || []).length ? `<button class="btn btn-light btn-sm" data-vbpaycheck="${n}" data-phone="${ph}">I've paid — check</button>` : ''}</div>
      <div class="small muted">Secure payment by Razorpay — the money is passed on to ${h(b.vendorName)}${S.meta.settings.payments.testMode ? ' · test mode' : ''}.</div>` : '';
  return paidTxt || owed || btns ? `<div class="vb-pay">${paidTxt ? `<div class="small">${paidTxt}</div>` : ''}${owed}${btns}</div>` : '';
}
function vbCard(b, vendor) {
  const fulfilment = { delivery: 'Delivery to your address', pickup: 'Pickup from vendor', 'on-site': 'Service at your venue' }[b.fulfilment];
  const wa = vendor && (vendor.whatsapp || vendor.phone);
  return `<div class="order-card"><div class="order-top"><div><b>#${h(b.number)}</b> · ${h(b.vendorName)} · 📅 ${fmtDate(b.date)}${vbEv(b)}</div>${vbStatus(b.status)}</div>
    <div class="order-items">${b.items.map(i => `<div class="oi" style="justify-content:space-between"><span>${h(i.name)} × ${i.qty} ${h(i.unit)}${(i.dates || []).length ? `<br>${datesChips(i)}` : ''}</span><b>${inr(i.price * i.qty)}</b></div>`).join('')}${b.deliveryCharge ? `<div class="oi" style="justify-content:space-between"><span>Delivery</span><b>${inr(b.deliveryCharge)}</b></div>` : ''}</div>
    ${b.vendorNote ? `<div class="small" style="padding:0 16px 10px"><b>Message from vendor:</b> ${h(b.vendorNote)}</div>` : ''}
    ${vbHoldLine(b)}${vbPayLine(b)}
    <div class="order-foot"><span class="small muted">${fulfilment ? `<b>${fulfilment}</b><br>` : ''}${b.fulfilment === 'pickup' ? h((vendor || {}).address || 'Contact the vendor for the pickup address') : `📍 ${h(b.customer.address)}, ${h(b.customer.districtName)}`} ${vendor && vendor.phone ? ` · <a class="link" href="tel:+91${h(vendor.phone)}">Call vendor</a>` : ''}${wa ? ` · <a class="link" target="_blank" rel="noopener" href="https://wa.me/91${h(wa)}?text=${encodeURIComponent(`Namaste, I’m contacting you about booking #${b.number} for ${fmtDate(b.date)}.`)}">WhatsApp vendor</a>` : ''}</span>
      <span style="display:flex;gap:8px;align-items:center"><b>Total ${inr(b.total)}</b>${['requested', 'confirmed'].includes(b.status) ? `<button class="btn btn-light btn-sm" data-vbcancel="${h(b.number)}" data-phone="${h(b.customer.phone)}" ${(b.money || {}).held ? `data-paid="${inr(b.money.held)}"` : ''}>Cancel</button>` : ''}${b.status === 'completed' ? (b.reviewed ? '<span class="rv-done">✓ Reviewed</span>' : `<button type="button" class="btn btn-gold btn-sm" data-vrate="${h(b.number)}" data-phone="${h(b.customer.phone)}" data-name="${h(b.vendorName)}">⭐ Rate & review</button>`) : ''}</span></div></div>`;
}
async function viewVBSuccess(number) {
  const mine = VS.myVB.find(x => x.number === number);
  if (!mine) { location.hash = '#/vtrack'; return; }
  const r = await api(`/api/vbookings/track?number=${encodeURIComponent(number)}&phone=${mine.phone}`);
  const b = r.booking, v = r.vendor;
  const wa = v ? `https://wa.me/91${v.whatsapp || v.phone}?text=${encodeURIComponent(`Namaste, I requested booking #${b.number} for ${fmtDate(b.date)} on ${S.meta.settings.siteName}.\n` + b.items.map(i => `• ${i.name} × ${i.qty}`).join('\n'))}` : '';
  app().innerHTML = `<div class="panel success"><div class="tick">✓</div><h1 style="margin:0">Booking request sent!</h1>
    <p class="muted" style="margin:6px 0 0">Your booking number</p><div class="order-no">#${h(b.number)}</div>
    <p><b>${h(b.vendorName)}</b> will call you on <b>${h(b.customer.phone)}</b> to confirm your booking for <b>${fmtDate(b.date)}</b>.<br>Total: <b>${inr(b.total)}</b> · ${S.meta.settings.payments.online ? `once ${h(b.vendorName)} confirms, pay ${b.advance ? `the advance ${inr(b.advance)}` : ''} online from <a class="link" href="#/vtrack">My Vendor Bookings</a> — or pay the vendor directly` : 'pay the vendor directly as agreed'}.</p>
    <div style="max-width:560px;margin:0 auto;text-align:left">${vbHoldLine(b)}</div>
    <div class="cta-row" style="max-width:640px;margin:16px auto 0">${wa ? `<a class="btn btn-wa" target="_blank" rel="noopener" href="${wa}">💬 WhatsApp vendor</a>` : ''}<a class="btn btn-primary" href="#/vtrack">📦 Track vendor bookings</a><a class="btn btn-ghost" href="#/vendors">Book more vendors</a></div></div>`;
}
// the account's bookings (from /api/vbookings/mine) are remembered in this browser too — one entry per booking number
function rememberVB(list) {
  const fresh = (list || []).filter(b => !VS.myVB.some(x => x.number === b.number));
  if (!fresh.length) return;
  VS.myVB = [...VS.myVB, ...fresh.map(b => ({ number: b.number, phone: b.customer.phone, vendorId: b.vendorId }))].slice(0, 60);
  store.set('myvb', VS.myVB);
}
async function viewVTrack() {
  app().innerHTML = `<div class="two-col" style="grid-template-columns:1fr 340px"><section class="panel" style="padding:18px 20px"><h1 style="margin:0 0 4px">🤝 My Vendor Bookings</h1>
    <p class="muted" style="margin:0 0 14px">${S.user ? 'Vendor bookings of your account and from this phone / browser. Shop orders are under' : 'Vendor bookings made from this phone / browser. Shop orders are under'} <a class="link" href="#/track">Track Order</a>.</p><div id="vtList">${VS.myVB.length || S.user ? '<div class="spinner"></div>' : '<p class="muted">No vendor bookings from this device yet.</p>'}</div></section>
    <aside class="panel" style="padding:18px"><h3 style="margin:0 0 12px">Find a vendor booking</h3><form id="vtForm"><div class="field"><label>Booking number</label><input name="number" required placeholder="e.g. VB5001"></div>
      <div class="field"><label>Mobile number used</label><input name="phone" required inputmode="numeric" maxlength="10"></div><button class="btn btn-primary btn-block">Track Booking</button></form><div id="vtOne" style="margin-top:12px"></div></aside></div>`;
  const draw = async () => {
    // logged in: the account's bookings (made on any device) first, then the ones only this browser knows — no duplicates
    const acct = S.user ? await api('/api/vbookings/mine').then(r => r.bookings).catch(() => []) : [];
    rememberVB(acct);
    const rest = VS.myVB.filter(x => !acct.some(b => b.number === x.number));
    if (!acct.length && !rest.length) { $('#vtList').innerHTML = '<p class="muted">No vendor bookings yet.</p>'; return; }
    const rs = await Promise.all(rest.map(x => api(`/api/vbookings/track?number=${encodeURIComponent(x.number)}&phone=${encodeURIComponent(x.phone)}`).catch(() => null)));
    const list = [...acct.map(b => ({ booking: b, vendor: b.vendor })), ...rs.filter(Boolean)].sort((a, b) => b.booking.createdAt.localeCompare(a.booking.createdAt));
    $('#vtList').innerHTML = list.map(r => vbCard(r.booking, r.vendor)).join('') || '<p class="muted">No bookings found.</p>';
  };
  $('#vtForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try {
      const r = await api(`/api/vbookings/track?number=${encodeURIComponent(f.number)}&phone=${encodeURIComponent(f.phone)}`);
      if (!VS.myVB.some(x => x.number === r.booking.number)) { VS.myVB.unshift({ number: r.booking.number, phone: f.phone, vendorId: r.booking.vendorId }); store.set('myvb', VS.myVB); }
      $('#vtOne').innerHTML = `<p class="ok-txt" style="margin:0">Found! ${VB_LABEL[r.booking.status]}</p>`; draw();
    } catch (err) { $('#vtOne').innerHTML = `<div class="err">${h(err.message)}</div>`; }
  });
  draw();
}
function viewVendorJoin(q, opts = {}) {
  q = q || new URLSearchParams();
  const carOnly = !!opts.car;
  app().innerHTML = `<div class="panel join-panel" style="max-width:760px;margin:0 auto;padding:22px">
    ${carOnly ? `<h1 style="margin:0">🚘 List your car — free</h1>
    <p class="muted">Own a Bolero, Scorpio, Innova, Dzire, Ertiga or any car? Drive it yourself for weddings in your district. Fill this short form — our team calls you, verifies the car, and it goes live for booking.</p>`
    : `<h1 style="margin:0">🤝 Join as Vendor / Artist</h1>
    <p class="muted">List your business or talent for free — car / baggi, tent & light, phool & decoration, band baja, DJ, halwai & catering, mehndi, makeup / parlour, marriage hall, camera & studio, pandit ji, orchestra or artist, shaadi cards, dulha-dulhan wear, puja samagri, gifts, mithai, ration or sabzi. Our team verifies every vendor before it appears on the site. Own just one car? <a class="link" href="#/list-car">List your car here</a>.</p>`}
    <form id="joinForm">
      <div class="grid-2 ${carOnly ? 'hide' : ''}"><div class="field"><label>What do you provide?</label><select name="type" id="jType">${VTYPES.map(t => `<option value="${t.id}">${t.emoji} ${h(t.name)}</option>`).join('')}</select></div>
        <div class="field" id="jSubWrap"><label>Category</label><select name="subtype" id="jSub"></select></div></div>
      <fieldset class="car-fields hide" id="jCar"><legend>🚗 Your car</legend>
        <div class="grid-2"><div class="field"><label>Car model</label><input name="carModel" maxlength="80" placeholder="e.g. Mahindra Bolero, Maruti Ertiga"></div>
          <div class="field"><label>Price per day (₹)</label><input name="carPrice" type="number" min="100" max="500000" inputmode="numeric" placeholder="e.g. 3000"></div></div>
        <div class="grid-2"><div class="field"><label>🪔 Price on lagan days (₹) <span class="muted small">(optional)</span></label><input name="carLaganPrice" type="number" min="100" max="500000" inputmode="numeric" placeholder="e.g. 4500"><span class="small muted">Charged automatically on the lagan dates Pandit Ji publishes. <a class="link" href="#/lagan" target="_blank">See lagan dates</a></span></div><div></div></div>
        <div class="grid-2 j-carfacts"><div class="field"><label>Seats</label><select name="carSeats">${[4, 5, 7, 8, 9, 10, 12].map(n => `<option ${n === 7 ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label>AC</label><div class="seg"><label><input type="radio" name="carAc" value="1" checked> AC</label><label><input type="radio" name="carAc" value="0"> Non-AC</label></div></div></div>
        <div class="field j-carfacts"><label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="jDriver" checked> Driver included in the price</label><input type="hidden" name="carDriver" value="1"></div>
        <div class="grid-2"><div class="field"><label id="jKmL">Included km / hours (optional)</label><input name="carKm" maxlength="60" placeholder="e.g. 100 km / 12 hrs"></div>
          <div class="field"><label>Driving experience (years)</label><input name="experienceYears" type="number" min="0" max="60" inputmode="numeric" placeholder="e.g. 8"></div></div>
        <div class="grid-2"><div class="field"><label>Vehicle number (as on RC)</label><input name="carRegNo" maxlength="15" autocapitalize="characters" placeholder="e.g. BR 06 AB 1234" style="text-transform:uppercase"></div>
          <div class="field"><label id="jDlL">Driving licence number</label><input name="dlNo" maxlength="20" autocapitalize="characters" placeholder="e.g. BR06 20110012345" style="text-transform:uppercase"></div></div>
      </fieldset>
      <div class="grid-2"><div class="field"><label id="jNameL">Business / artist / stage name</label><input name="name" required maxlength="100" value="${h(q.get('name') || '')}"></div><div class="field"><label id="jOwnerL">Owner / contact person</label><input name="owner" required maxlength="80" value="${h(q.get('owner') || '')}"></div></div>
      <div class="field" style="max-width:260px"><label>Mobile number</label><input name="phone" required inputmode="numeric" maxlength="10" pattern="[6-9][0-9]{9}" value="${h(q.get('phone') || '')}"></div>
      <p class="small muted" style="margin:-4px 0 12px">After verification you log in to the Vendor Panel to add your <b>photo, fees, packages and available dates</b>.</p>
      ${districtSelect('district', S.district)}
      <div class="field"><label>Full address – shop / home (mohalla, gaon, road, landmark)</label><input name="address" required maxlength="250" placeholder="e.g. Near Hanuman Mandir, Mairwa Bazar"></div>
      <div class="grid-2"><div class="field"><label>Pincode</label><input name="pincode" required inputmode="numeric" maxlength="6" pattern="[1-9][0-9]{5}" placeholder="e.g. 841239"></div>
        <div class="field"><label>Exact location <span class="muted small">(optional)</span></label><button type="button" class="btn btn-light" id="jPin">📍 Pin on map / GPS</button><input type="hidden" name="lat"><input type="hidden" name="lng"></div></div>
      <p class="small muted" style="margin:-4px 0 12px">Customers near you see you first, and customers with the same pincode see you at the top. Only the distance is shown to customers, never your exact spot.</p>
      <fieldset class="car-fields pg-fields"><legend id="jPhL">📷 Photos</legend>
        <p class="small muted" style="margin:0 0 8px" id="jPhHint">Add up to 8 photos. Tap ⭐ on the best one — that is the <b>front photo</b> customers see first.</p>
        <div class="pg" id="jPhotos"></div>
      </fieldset>
      <div class="field"><label>About your service, rates, experience</label><textarea name="about" rows="3" maxlength="1500"></textarea></div>
      <div class="field lagan-field"><label>Lagan day charge <span class="muted small">(optional)</span></label><div class="otp-row" style="max-width:220px"><input name="laganPct" type="number" min="0" max="300" inputmode="numeric" placeholder="e.g. 30"><span style="align-self:center">% extra</span></div>
        <span class="small muted">Added automatically on shubh vivah (lagan) dates.</span></div>
      <fieldset class="car-fields doc-fields" id="jDocs"><legend>Verification documents</legend>
        <p class="small muted doc-note">Private — seen only by our team, never by customers. Photo or PDF. ${DOCUP.AADHAAR_TIP}</p>
        <div class="doc-grid" id="jDocGrid"><div class="spinner"></div></div>
        <div class="grid-3" id="jKyc" style="margin-top:10px"></div>
      </fieldset>
      <label class="join-check hide" id="jAdultWrap"><input type="checkbox" name="adults18"> <span id="jAdultTxt"></span></label>
      <label class="join-check"><input type="checkbox" name="consent" required> <span>I agree to share these details and documents with Vivah Saathi <b>only to verify me</b>. They are not shown to customers, and I can ask for them to be deleted when I leave.</span></label>
      <button class="btn btn-gold btn-lg">Submit for verification</button>
    </form></div>`;
  const drawSub = () => {
    const t = vtype($('#jType').value);
    $('#jSubWrap').classList.toggle('hide', !t.subtypes);
    $('#jSub').innerHTML = (t.subtypes || []).map(([id, n]) => `<option value="${id}" ${q.get('sub') === id ? 'selected' : ''}>${h(n)}</option>`).join('');
    drawCar();
  };
  // vehicles: list the (first) car right here; an owner-driver only needs his name and the car
  const drawCar = () => {
    const veh = $('#jType').value === 'vehicle', own = veh && $('#jSub').value === 'owner', dulha = veh && $('#jSub').value === 'dulha';
    $('#jCar').classList.toggle('hide', !veh);
    $('[name=carModel]').required = $('[name=carPrice]').required = $('[name=carRegNo]').required = own;
    // dulha entry (ghodi, baggi, open jeep): no seats / AC / driver, vehicle number only if it has one
    $$('.j-carfacts').forEach(x => x.classList.toggle('hide', dulha));
    $('[name=carModel]').placeholder = dulha ? 'e.g. White Ghodi, Royal Baggi, Decorated Open Jeep' : 'e.g. Mahindra Bolero, Maruti Ertiga';
    $('#jKmL').textContent = dulha ? 'Time / route included (optional)' : 'Included km / hours (optional)';
    $('[name=carRegNo]').placeholder = dulha ? 'Only for a jeep / car — leave empty for ghodi or baggi' : 'e.g. BR 06 AB 1234';
    $('[name=dlNo]').required = own;
    $('#jDlL').textContent = own ? 'Your driving licence number' : "Driver's licence number (optional)";
    $('#jPhL').textContent = veh ? '📷 Car photos' : '📷 Photos of your work';
    $('#jPhHint').innerHTML = veh ? 'Add up to 8 photos of the car — front, side, inside, decorated. Tap ⭐ on the best one: that is the <b>front photo</b> on the car\'s card.'
      : 'Add up to 8 photos — your shop, team, food, stage or past events. Tap ⭐ on the best one: that is the <b>front photo</b> customers see first.';
    drawDocs();
    $('#jNameL').textContent = own ? 'Name to show (e.g. Ramesh – Own Bolero)' : veh ? 'Travels / business name' : 'Business / artist / stage name';
    $('#jOwnerL').textContent = own ? 'Your full name (owner & driver)' : 'Owner / contact person';
  };
  // documents: which ones depends on the kind of work (rules come from the server)
  const docs = {};
  let rules = null, docKinds = {};
  const req = (k, r, car) => [...r.join, ...(car && r.car ? r.car.join : [])].includes(k) ? 'join' : [...r.check, ...(car && r.car ? r.car.check : [])].includes(k) ? 'check' : 'opt';
  function drawDocs() {
    if (!rules) return;
    const type = $('#jType').value, t = rules[type], r = t && (t.rules[$('#jSub').value] || t.rules['']);
    if (!r) return;
    const car = type === 'vehicle' && !!$('[name=carModel]').value.trim();
    const kinds = [...new Set([...r.join, ...r.check, ...r.optional, ...(car && r.car ? [...r.car.join, ...r.car.check, ...r.car.optional] : [])])]
      .sort((a, b) => ({ join: 0, check: 1, opt: 2 }[req(a, r, car)] - { join: 0, check: 1, opt: 2 }[req(b, r, car)]));
    $('#jDocGrid').innerHTML = kinds.map(k => {
      const lv = req(k, r, car), K = DOCUP.KINDS[k] || ['📄', docKinds[k] || k, ''];
      return `<label class="doc-pick ${docs[k] ? 'done' : ''}" data-doc="${k}">
        <input type="file" accept="image/*,application/pdf" data-docin="${k}">
        <span class="doc-ic">${K[0]}</span><span class="doc-txt"><b>${h(K[1])}</b><small data-docst="${k}">${docs[k] ? '✓ Added' : h(K[2] || 'Tap to add photo / PDF')}</small></span>
        <i class="doc-req ${lv === 'join' ? 'on' : lv === 'check' ? 'mid' : ''}" data-docreq="${lv}" title="${lv === 'check' ? 'Can be added later, but needed before we finish verifying you' : ''}">${lv === 'join' ? 'Required' : lv === 'check' ? 'Needed for ✓' : 'Optional'}</i></label>`;
    }).join('');
    // numbers: PAN for everyone, GSTIN / FSSAI where those papers apply (all optional)
    const kycF = [['pan', 'PAN number', 'ABCDE1234F', 10], ...(kinds.includes('gst') ? [['gstin', 'GSTIN', '10ABCDE1234F1Z5', 15]] : []), ...(kinds.includes('fssai') ? [['fssai', 'FSSAI number', '14 digits', 14]] : [])];
    const keep = Object.fromEntries($$('#jKyc input').map(i => [i.name, i.value]));
    $('#jKyc').innerHTML = kycF.map(([n, l, p, m]) => `<div class="field"><label>${l} <span class="muted small">(optional)</span></label><input name="${n}" maxlength="${m + 4}" placeholder="${p}" value="${h(keep[n] || '')}" style="text-transform:uppercase"></div>`).join('');
    const ark = type === 'orchestra', solo = $('#jSub').value === 'artist';
    $('#jAdultWrap').classList.toggle('hide', !ark);
    $('[name=adults18]').required = ark;
    $('#jAdultTxt').innerHTML = solo ? 'I confirm I am <b>18 years or older</b>.' : 'I confirm that <b>every performer in my group is 18 years or older</b>, performs by their own choice, and I will give their ID / age proofs to the Vivah Saathi team.';
  }
  api('/api/vtypes').then(d => { rules = Object.fromEntries(d.types.map(t => [t.id, t])); docKinds = d.docKinds; drawDocs(); }).catch(() => { $('#jDocGrid').innerHTML = '<p class="err">Could not load the document list. Please refresh.</p>'; });
  if (carOnly) { $('#jType').value = 'vehicle'; q.set('sub', 'owner'); }
  else if (q.get('type') && VTYPES.some(t => t.id === q.get('type'))) $('#jType').value = q.get('type');
  drawSub(); $('#jType').addEventListener('change', drawSub); $('#jSub').addEventListener('change', drawCar);
  wireStateSelects($('#joinForm'));
  $('[name=carModel]').addEventListener('input', drawCar);
  $('#jDriver').addEventListener('change', e => { $('[name=carDriver]').value = e.target.checked ? '1' : '0'; });
  // documents: shrink photos right away and show what was picked (boxes are redrawn, so listen on the grid)
  $('#jDocGrid').addEventListener('change', async e => {
    const inp = e.target.closest('[data-docin]'); if (!inp) return;
    const k = inp.dataset.docin, st = $(`[data-docst="${k}"]`), box = inp.closest('.doc-pick'), file = inp.files[0];
    delete docs[k]; box.classList.remove('done', 'err');
    if (!file) { st.textContent = 'Tap to add photo / PDF'; return; }
    st.textContent = 'Preparing…';
    try { docs[k] = await DOCUP.toDataUrl(file); st.textContent = `✓ ${file.name.length > 26 ? file.name.slice(0, 24) + '…' : file.name}`; box.classList.add('done'); }
    catch (err) { st.textContent = err.message; box.classList.add('err'); inp.value = ''; }
  });
  // photos: shrunk in the browser, first one = front photo
  const pics = [];
  const MAXP = 8;
  const drawPics = () => {
    $('#jPhotos').innerHTML = pics.map((p, i) => `<div class="pg-item ${i ? '' : 'front'}"><img src="${p}" alt="">
        ${i ? `<button type="button" class="pg-star" data-pfront="${i}" title="Make this the front photo">☆ Front</button>` : '<span class="pg-badge">⭐ Front photo</span>'}
        <button type="button" class="pg-x" data-pdel="${i}" aria-label="Remove photo">×</button></div>`).join('')
      + (pics.length < MAXP ? `<label class="pg-add"><input type="file" accept="image/*" multiple data-padd><span>＋</span><small>${pics.length ? 'Add more' : 'Add photos'}</small></label>` : '');
  };
  $('#jPhotos').addEventListener('click', e => {
    const f = e.target.closest('[data-pfront]'), d = e.target.closest('[data-pdel]');
    if (f) { pics.unshift(...pics.splice(+f.dataset.pfront, 1)); drawPics(); toast('Front photo changed ⭐'); }
    if (d) { pics.splice(+d.dataset.pdel, 1); drawPics(); }
  });
  $('#jPhotos').addEventListener('change', async e => {
    const inp = e.target.closest('[data-padd]'); if (!inp) return;
    const files = [...inp.files].slice(0, MAXP - pics.length);
    if (inp.files.length > files.length) toast(`Only ${MAXP} photos — the first ${files.length} were added`, true);
    for (const file of files) { try { pics.push(await DOCUP.photoDataUrl(file)); } catch (err) { toast(err.message, true); } }
    drawPics();
  });
  drawPics();
  $('#jPin').addEventListener('click', () => {
    const f = $('#joinForm');
    GEO.pick({ title: '📍 Your shop / home location', intro: 'Pin where customers would come to you (or where your car stays). Your exact spot is never shown — only the distance.', note: 'Customers see only how far you are.',
      district: f.district.value, pincode: f.pincode.value, showMap: true,
      initial: f.lat.value ? { lat: +f.lat.value, lng: +f.lng.value, label: $('#jPin').dataset.label, district: f.district.value } : null,
      onPick(loc) { f.lat.value = loc.lat; f.lng.value = loc.lng; $('#jPin').dataset.label = loc.label; $('#jPin').textContent = '✓ ' + loc.label; if (loc.pincode && !f.pincode.value) f.pincode.value = loc.pincode; } });
  });
  $('#joinForm').addEventListener('submit', async e => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    body.consent = !!e.target.consent.checked;
    body.adults18 = !!e.target.adults18.checked;
    // only the papers that apply to the chosen kind of work (the person may have switched type after adding some)
    const shown = $$('[data-docin]').map(i => i.dataset.docin);
    const missing = $$('[data-docreq="join"]').map(i => i.closest('.doc-pick').dataset.doc).filter(k => !docs[k]);
    if (missing.length) { toast(`Please add a photo of your ${missing.map(k => DOCUP.KINDS[k][1].replace(/ \(.*\)/, '')).join(' and ')}`, true); $(`[data-doc="${missing[0]}"]`).scrollIntoView({ block: 'center' }); return; }
    body.docs = Object.entries(docs).filter(([k]) => shown.includes(k)).map(([kind, dataUrl]) => ({ kind, dataUrl }));
    body.photos = pics.slice();
    if ([...(body.docs || []), ...body.photos].reduce((a, d) => a + (d.dataUrl || d).length, 0) > 7.5 * 1024 * 1024) return toast('Photos and documents are too big together. Remove a few photos or large PDFs.', true);
    const btn = e.target.querySelector('button.btn-gold'); btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await api('/api/vendor-apply', { method: 'POST', body });
      app().innerHTML = `<div class="panel success"><div class="tick">✓</div><h1 style="margin:0">Thank you!</h1><p>Your details were sent for verification. Our team will call you, and after verification you can log in to the <b>Vendor Panel</b> at <a class="link" href="/vendor">${h(location.host)}/vendor</a> with your mobile number.</p><a class="btn btn-primary" href="#/vendors">Back to vendors</a></div>`;
    } catch (err) { toast(err.message, true); btn.disabled = false; btn.textContent = 'Submit for verification'; }
  });
}

/* ---------------- Book a Car: every vehicle on its own, with the vendor / owner it belongs to ---------------- */
async function viewCars(q) {
  const loc = GEO.get();
  const params = { q: q.get('q') || '', kind: q.get('kind') || '', sub: q.get('sub') || '', dist: q.get('dist') ?? (loc ? '' : S.district || ''), seats: q.get('seats') || '', ac: q.get('ac') || '', sort: q.get('sort') || '', avail: q.get('avail') !== '0', km: q.get('km') || '50' };
  const go = (k, v) => { const p = new URLSearchParams(q); if (v === '' || v == null) p.delete(k); else p.set(k, v); location.hash = '#/cars' + (p.toString() ? '?' + p : ''); };
  skeleton(8);
  const date = vDate();
  const qs = new URLSearchParams({ date });
  for (const [k, key] of [['q', 'q'], ['kind', 'kind'], ['sub', 'subtype'], ['seats', 'seats'], ['ac', 'ac'], ['sort', 'sort']]) if (params[k]) qs.set(key, params[k]);
  if (params.dist) qs.set('district', params.dist);
  if (params.avail) qs.set('avail', '1');
  if (loc) { for (const [k, v] of Object.entries(locParams())) qs.set(k, v); if (params.km !== '0') qs.set('km', params.km); }
  const { cars, total, beyond, kinds = [] } = await api('/api/vcars?' + qs);
  window.I18N.setNames(cars.flatMap(c => [[c.name, c.nameHi], [c.vendorName, c.vendorNameHi]]));
  const distName = params.dist ? (district(params.dist) || {}).name : '';
  const inCart = c => VS.vcart.find(x => x.listingId === c.listingId && x.date === date);
  const card = c => {
    const x = inCart(c), free = c.status === 'available';
    const who = c.person ? c.owner || c.vendorName : c.vendorName;
    const facts = [c.seats ? `${c.seats} seats` : '', c.ac === true ? 'AC' : c.ac === false ? 'Non-AC' : '', c.driver ? 'With driver' : ''].filter(Boolean);
    return `<div class="vcard ccard">
      <a class="vph" href="#/v/${c.vendorId}">${ph(c.photo, '🚙', '#f6eef0')}${c.verified ? '<span class="vbadge">✓ Verified</span>' : ''}${c.sample ? '<span class="vsample">Sample</span>' : ''}${c.photos.length > 1 ? `<span class="pg-count" role="button" data-cpics="${c.listingId}" title="See all photos">📷 ${c.photos.length}</span>` : ''}</a>
      <div class="vbody">
        <a class="vtitle" href="#/v/${c.vendorId}">${h(c.name)}</a>
        ${facts.length ? `<div class="small muted">${h(facts.join(' · '))}</div>` : ''}
        <div class="vmeta"><a class="link small" href="#/v/${c.vendorId}">${h(who)}</a>${placeLine(c)}</div>
        <div class="vavail">${availPill(c, date, false)}</div>
        <div class="vact"><div class="vprice"><small>${c.lagan ? '🪔 Lagan · per' : 'Per'} ${h(c.unit)}</small><b>${inr(c.price)}</b>${c.lagan ? `<s class="small muted">${inr(c.normalPrice)}</s>` : ''}</div>
          ${!free ? `<a class="btn btn-light btn-sm" href="#/v/${c.vendorId}">Other dates</a>`
            : x ? `<div class="qty cqty"><button type="button" data-cq2="-1" data-cl="${c.listingId}">−</button><span>${x.qty}</span><button type="button" data-cq2="1" data-cl="${c.listingId}" ${x.qty >= c.left ? 'disabled' : ''}>+</button></div>`
            : `<button class="btn btn-primary btn-sm" data-cadd="${c.listingId}">+ Add</button>`}</div>
      </div></div>`;
  };
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`).join('');
  app().innerHTML = `
    <section class="vhero car-hero">
      <div class="vhero-txt"><h1>🚗 Book a Car</h1>
        <p>Choose a date, then add the cars you need.</p>
        <div class="car-links"><a class="btn btn-gold btn-sm" href="#/list-car">🚘 Own a car? List it free</a><a class="btn btn-light btn-sm" href="#/vendors?type=vehicle">View by vendor</a></div></div>
      <div id="vDateSlot"></div>
    </section>
    <div class="vsubtabs">${[['', '🚗 All'], ['car', '🏢 From vendors'], ['owner', '🙋 Owner-driver'], ['dulha', '🌸 Dulha entry']].map(([id, n]) => `<button data-sub="${id}" class="${params.sub === id ? 'on' : ''}">${n}</button>`).join('')}</div>
    ${locBar('gaadiyan', params.km)}
    <div class="cp-kinds cars-kinds"><button type="button" data-ckind="" class="${params.kind ? '' : 'on'}"><span>All kinds</span> <small>${kinds.reduce((s, k) => s + k.count, 0)}</small></button>${CAR_KINDS.map(([id, name]) => [id, name, (kinds.find(k => k.id === id) || {}).count || 0]).filter(k => k[2] || k[0] === params.kind).map(([id, name, n]) => `<button type="button" data-ckind="${id}" class="${params.kind === id ? 'on' : ''}"><span>${h(name)}</span> <small>${n}</small></button>`).join('')}</div>
    <div class="panel vtoolbar">
      <form id="vSearch" class="vsearch"><input name="q" class="input" placeholder="Search car, vendor, owner, area..." value="${h(params.q)}"><button class="btn btn-primary btn-sm">🔍</button></form>
      <button type="button" class="btn btn-light btn-sm vfilt-btn" id="vFiltBtn">⚙️ Filters</button>
      <select id="cDist" class="input"><option value="">All districts</option>${S.meta.districts.map(d => `<option value="${d.id}" ${d.id === params.dist ? 'selected' : ''}>${h(d.name)}</option>`).join('')}</select>
      <select id="cSeats" class="input">${opt([['', 'Any seats'], ['5', '5+ seats'], ['7', '7+ seats'], ['10', '10+ seats']], params.seats)}</select>
      <select id="cAc" class="input">${opt([['', 'AC / Non-AC'], ['1', 'AC only'], ['0', 'Non-AC']], params.ac)}</select>
      <select id="cSort" class="input">${opt([['', loc ? 'Free first, then nearest' : 'Recommended'], ...(loc ? [['near', 'Nearest first']] : []), ['price-asc', 'Price: Low to High'], ['price-desc', 'Price: High to Low']], params.sort)}</select>
      <label class="small vonly"><input type="checkbox" id="vAvail" ${params.avail ? 'checked' : ''}> Only free on ${shortDate(date)}</label>
    </div>
    ${countLine(total, 'car', params.km, distName, date, params.dist, beyond)}
    ${cars.length ? `<div class="vgrid" id="carGrid">${cars.map(card).join('')}</div>`
      : loc && beyond ? `<div class="panel empty"><div class="big">📍</div><h3>No free cars within ${h(params.km)} km of your ghar</h3><p class="muted">${beyond} more ${beyond === 1 ? 'car is' : 'cars are'} a little farther away.</p><button class="btn btn-primary" data-farther>Show farther cars</button></div>`
      : `<div class="panel empty"><div class="big">🚗</div><h3>No cars found for this date</h3><p class="muted">Try another date, all districts, or turn off "Only free".</p>${params.dist ? '<button class="btn btn-primary" data-alldist>Show all districts</button>' : ''}</div>`}
    <div class="panel vjoin"><div><b>Do you own a car?</b> Bolero, Scorpio, Innova, Dzire, Ertiga… List it free in 2 minutes and get wedding bookings near you.</div><a class="btn btn-gold" href="#/list-car">🚘 List your car →</a></div>`;
  $('#vDateSlot').appendChild(vDateBar(() => viewCars(q)));
  const redraw = () => { const g = $('#carGrid'); if (g) g.innerHTML = cars.map(card).join(''); };
  const setCar = (c, qty) => {
    VS.vcart = VS.vcart.filter(x => !(x.listingId === c.listingId && x.date === date));
    if (qty > 0) VS.vcart.push({ vendorId: c.vendorId, vendorName: c.vendorName, type: 'vehicle', mode: 'unit', date, listingId: c.listingId, name: c.name, nameHi: c.nameHi, unit: c.unit, price: c.price, qty: Math.min(qty, c.left), max: c.left, photo: c.photo, emoji: '🚙', delivery: null, fulfil: 'pickup' });
    saveVCart(); redraw();
  };
  const grid = $('#carGrid');
  if (grid) grid.addEventListener('click', e => {
    const pics = e.target.closest('[data-cpics]');
    if (pics) { e.preventDefault(); const c = cars.find(x => x.listingId === pics.dataset.cpics); photoViewer(c.photos, 0, c.name); return; }
    const a = e.target.closest('[data-cadd]');
    if (a) { const c = cars.find(x => x.listingId === a.dataset.cadd); flyToCart(a.closest('.vcard').querySelector('.vph')); setCar(c, 1); toast(`${c.name} (${c.vendorName}) added to cart ✓`); return; }
    const b = e.target.closest('[data-cq2]');
    if (b) { const c = cars.find(x => x.listingId === b.dataset.cl); setCar(c, ((inCart(c) || {}).qty || 0) + Number(b.dataset.cq2)); }
  });
  $('#vSearch').addEventListener('submit', e => { e.preventDefault(); go('q', e.target.q.value.trim()); });
  sectionSuggest($('#vSearch input'), 'vehicle', raw => go('q', raw), x => `#/cars?q=${encodeURIComponent(x.name)}&dist=`);
  $$('[data-ckind]').forEach(b => b.addEventListener('click', () => go('kind', b.dataset.ckind)));
  $('#vFiltBtn').addEventListener('click', () => $('.vtoolbar').classList.toggle('open'));
  $('#cDist').addEventListener('change', e => go('dist', e.target.value || ''));
  $('#cSeats').addEventListener('change', e => go('seats', e.target.value));
  $('#cAc').addEventListener('change', e => go('ac', e.target.value));
  $('#cSort').addEventListener('change', e => go('sort', e.target.value));
  $('#vAvail').addEventListener('change', e => go('avail', e.target.checked ? '' : '0'));
  $$('[data-sub]').forEach(b => b.addEventListener('click', () => go('sub', b.dataset.sub)));
  $$('[data-alldist]').forEach(b => b.addEventListener('click', () => go('dist', '')));
  bindLocBar(go);
}

/* ---------------- Tent Booking: every rental component (tent, chairs, lights, DJ, flowers…) on its own ---------------- */
// Lines go into the same vendor cart (VS.vcart) as everything else: one line per component per date, so an item needed
// on several dates has its own quantity on each. The server checks each vendor's stock for that date when booking.
VS.tentCats = [];
const tentCatOf = id => VS.tentCats.find(c => c.id === id) || { id, name: 'Other items', emoji: '📦' };
const tentLines = () => VS.vcart.filter(x => x.rental);
const TENT_PRICES = [['', 'Any price'], ['0-100', 'Up to ₹100'], ['100-1000', '₹100 – ₹1,000'], ['1000-5000', '₹1,000 – ₹5,000'], ['5000-', '₹5,000 and more']];
const tStep = x => ((x.units || x.max || 0) >= 200 ? 10 : 1); // chairs / kanaat in tens

// "My tent selection": every chosen component grouped by date → vendor, with quantity, date change, remove and function time
function tentSelHtml(cur) {
  const gs = groupsOf(tentLines());
  if (!gs.length) return `<h3>🧾 My tent selection</h3><p class="small muted" style="margin:0">Pick tents, chairs, lights, sound, flowers… with <b>+ Add</b>. Each date keeps its own items and quantities.</p>`;
  const dates = [...new Set(gs.map(g => g.date))].sort();
  return `<h3>🧾 My tent selection <span class="tsel-n">${tentLines().length}</span></h3>
    ${dates.map(dt => { const dg = gs.filter(g => g.date === dt); return `<div class="tsel-date ${dt === cur ? 'on' : ''}">
      <div class="tsel-dh"><button type="button" class="link" data-tgo="${dt}" title="Show the catalog for this date">📅 <b>${fmtDate(dt)}</b></button><label class="tsel-time">⏰ <input type="time" data-ttime="${dt}" value="${h(dateTime(dt))}" aria-label="Function time"></label></div>
      ${dg.map(g => `<div class="tsel-v"><div class="small muted">🏪 ${h(g.vendorName)}${g.deliveryCharge ? ` · 🚚 ${inr(g.deliveryCharge)}` : ''}</div>
        ${g.lines.map(y => { const k = h(y.listingId + '|' + dt); return `<div class="tsel-l"><span class="tsel-nm">${h(y.name)}<small>${inr(y.price)} / ${h(y.unit)}</small></span>
          <span class="qty tsel-q"><button type="button" data-sq="-1" data-k="${k}" aria-label="Less">−</button><input type="number" min="1" max="${y.max || 100000}" value="${y.qty}" data-sqi="${k}" aria-label="Quantity"><button type="button" data-sq="1" data-k="${k}" aria-label="More">+</button></span>
          <b class="tsel-p">${inr(y.price * y.qty)}</b>
          <span class="tsel-act"><input type="date" min="${today()}" value="${dt}" data-smove="${k}" title="Change date" aria-label="Change date"><button type="button" class="tsel-x" data-srm="${k}" title="Remove" aria-label="Remove">×</button></span></div>`; }).join('')}</div>`).join('')}
      <div class="tsel-dt"><span>Total for ${shortDate(dt)}</span><b>${inr(dg.reduce((a, g) => a + g.total, 0))}</b></div></div>`; }).join('')}
    <div class="tsel-total"><span>Estimate incl. delivery</span><b>${inr(gs.reduce((a, g) => a + g.total, 0))}</b></div>
    <a class="btn btn-gold btn-block" href="#/tent/review">🧾 Review & Create Final Order →</a>
    <button type="button" class="btn btn-light btn-sm btn-block" data-sclear style="margin-top:6px">Clear tent selection</button>`;
}
// selection box events (qty, date change, remove, time); after() redraws what depends on the cart
function bindTentSel(box, after) {
  const find = k => { const [lid, dt] = k.split('|'); return VS.vcart.find(x => x.listingId === lid && x.date === dt && x.rental); };
  const setQ = (k, n) => { const x = find(k); if (!x) return; x.qty = Math.max(x.min || 1, Math.min(x.max || 100000, Math.round(n) || 1)); saveVCart(); after(); };
  box.addEventListener('click', e => {
    const q = e.target.closest('[data-sq]'); if (q) { const x = find(q.dataset.k); if (x) setQ(q.dataset.k, x.qty + Number(q.dataset.sq) * tStep(x)); return; }
    const rm = e.target.closest('[data-srm]'); if (rm) { const x = find(rm.dataset.srm); VS.vcart = VS.vcart.filter(y => y !== x); saveVCart(); toast('Removed from tent selection'); after(); return; }
    const gd = e.target.closest('[data-tgo]'); if (gd) { setVDate(gd.dataset.tgo); if (location.hash.startsWith('#/tent?') || location.hash === '#/tent') route(); else location.hash = '#/tent'; return; }
    if (e.target.closest('[data-sclear]') && confirm('Remove every tent item from your selection?')) { VS.vcart = VS.vcart.filter(y => !y.rental); saveVCart(); after(); }
  });
  box.addEventListener('change', e => {
    const qi = e.target.closest('[data-sqi]'); if (qi) return setQ(qi.dataset.sqi, Number(qi.value));
    const tm = e.target.closest('[data-ttime]'); if (tm) { setDateTime(tm.dataset.ttime, tm.value); toast(tm.value ? `Function time ${tm.value} saved ✓` : 'Function time cleared'); return; }
    const mv = e.target.closest('[data-smove]');
    if (mv && mv.value && mv.value >= today()) {
      // another date: its own line (merged into the same item if already chosen there); stock is re-checked on review
      const x = find(mv.dataset.smove), to = mv.value; if (!x || to === x.date) return;
      const same = VS.vcart.find(y => y !== x && y.listingId === x.listingId && y.date === to);
      if (same) { same.qty += x.qty; VS.vcart = VS.vcart.filter(y => y !== x); } else { x.date = to; const t = dateTime(to); if (t) x.eventTime = t; else delete x.eventTime; }
      saveVCart(); toast(`Moved to ${shortDate(to)} — availability is checked on the review page`); after();
    }
  });
}

async function viewTent(q) {
  const loc = GEO.get();
  const p = { cat: q.get('cat') || '', q: q.get('q') || '', vendor: q.get('vendor') || '', price: q.get('price') || '', sort: q.get('sort') || '', avail: q.get('avail') === '1', km: q.get('km') || '50' };
  p.dist = q.get('dist') ?? (loc || p.vendor ? '' : S.district || ''); // one vendor's catalog: wherever the vendor is
  const go = (k, v) => { const u = new URLSearchParams(q); if (v === '' || v == null) u.delete(k); else u.set(k, v); location.hash = '#/tent' + (u.toString() ? '?' + u : ''); };
  skeleton(8);
  const date = vDate();
  const qs = new URLSearchParams({ date });
  for (const [k, key] of [['cat', 'category'], ['q', 'q'], ['vendor', 'vendor'], ['sort', 'sort'], ['dist', 'district']]) if (p[k]) qs.set(key, p[k]);
  const [mn, mx] = p.price.split('-'); if (mn) qs.set('min', mn); if (mx) qs.set('max', mx);
  if (p.avail) qs.set('avail', '1');
  if (loc) { for (const [k, v] of Object.entries(locParams())) qs.set(k, v); if (p.km !== '0') qs.set('km', p.km); }
  const r = await api('/api/tent/items?' + qs);
  VS.tentCats = r.categories;
  const items = r.items;
  window.I18N.setNames([...items.flatMap(x => [[x.name, x.nameHi], [x.vendorName, x.vendorNameHi]]), ...r.categories.map(c => [c.name, c.hi])]);
  const distName = p.dist ? (district(p.dist) || {}).name : '';
  const lineOf = x => VS.vcart.find(y => y.listingId === x.listingId && y.date === date);
  const card = x => {
    const c = tentCatOf(x.category), ln = lineOf(x), free = x.status === 'available';
    const od = VS.vcart.filter(y => y.listingId === x.listingId && y.date !== date);
    return `<div class="vcard tcard ${ln ? 'picked' : ''}" id="tc_${x.listingId}">
      <button type="button" class="vph" data-tpics="${x.listingId}" title="${x.photos.length ? 'See photos' : h(c.name)}">${ph(x.photo, c.emoji, '#f6eef0')}${x.verified ? '<span class="vbadge">✓ Verified</span>' : ''}${x.sample ? '<span class="vsample">Sample</span>' : ''}<span class="tcat-tag">${c.emoji} ${h(c.name)}</span>${x.photos.length > 1 ? `<span class="pg-count">📷 ${x.photos.length}</span>` : ''}</button>
      <div class="vbody">
        <b class="vtitle">${h(x.name)}</b>
        ${x.size || tentCap(x) ? `<div class="small muted">${[h(x.size || ''), tentCap(x)].filter(Boolean).join(' · ')}</div>` : ''}
        <div class="vmeta"><a class="link small" href="#/v/${x.vendorId}">${h(x.vendorName)}</a>${placeLine(x)}</div>
        <div class="vavail">${free ? `<span class="av ok">${x.left} left · ${shortDate(date)}</span>` : availPill(x, date)}</div>
        ${od.length ? `<div class="small tother">📅 Also picked: ${od.map(y => `${shortDate(y.date)} × ${y.qty}`).join(' · ')}</div>` : ''}
        <div class="vact"><div class="vprice"><small>${x.lagan ? '🪔 Lagan · per' : 'Per'} ${h(x.unit)}</small><b>${inr(x.price)}</b>${x.lagan ? `<s class="small muted">${inr(x.normalPrice)}</s>` : ''}</div>
          ${!free ? `<a class="btn btn-light btn-sm" href="#/v/${x.vendorId}">Other dates</a>` : ln ? `<div class="qty tqty"><button type="button" data-tq="-1" data-l="${x.listingId}" aria-label="Less">−</button><input type="number" min="0" max="${x.left}" value="${ln.qty}" data-tqi="${x.listingId}" aria-label="Quantity"><button type="button" data-tq="1" data-l="${x.listingId}" aria-label="More" ${ln.qty >= x.left ? 'disabled' : ''}>+</button></div>`
            : `<button class="btn btn-primary btn-sm" data-tadd="${x.listingId}">+ Add</button>`}</div>
        ${x.minQty > 1 ? `<div class="small muted">Minimum ${x.minQty} ${h(x.unit)}</div>` : ''}
        <details class="booking-options small"><summary>Item details</summary>
          ${x.features.length ? `<p>${h(x.features.join(' · '))}</p>` : ''}${x.specs ? `<p>${h(x.specs)}</p>` : ''}
          <p>${x.delivery.available ? (x.delivery.charge ? `Delivery ${inr(x.delivery.charge)}` : 'Free delivery') : 'Set-up included'}</p>
        </details>
      </div></div>`;
  };
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${h(v)}" ${cur === v ? 'selected' : ''}>${h(l)}</option>`).join('');
  app().innerHTML = `
    <section class="vhero tent-hero">
      <div class="vhero-txt"><h1>⛺ Tent Booking</h1>
        <p>Choose a date, then add the items you need.</p>
        <div class="car-links"><a class="btn btn-gold btn-sm" href="#/tent/review">Review Selection</a><a class="btn btn-light btn-sm" href="#/vendors?type=tent">View tent houses</a><a class="link small" href="#/vendor-join?type=tent">Join as a tent vendor</a></div></div>
      <div id="vDateSlot"></div>
    </section>
    <div class="tcats">${[{ id: '', name: 'All items', emoji: '🧺', count: r.totalAll }, ...r.categories].map(c => `<button type="button" data-tcat="${c.id}" class="${p.cat === c.id ? 'on' : ''} ${c.count ? '' : 'zero'}">${c.emoji} ${h(c.name)} <small>${c.count}</small></button>`).join('')}</div>
    ${locBar('tent houses', p.km)}
    <div class="panel vtoolbar">
      <form id="tSearch" class="vsearch"><input name="q" class="input" placeholder="Search chairs, shamiyana, generator, vendor..." value="${h(p.q)}"><button class="btn btn-primary btn-sm">🔍</button></form>
      <button type="button" class="btn btn-light btn-sm vfilt-btn" id="vFiltBtn">⚙️ Filters</button>
      <select id="tDist" class="input" aria-label="District"><option value="">All districts</option>${S.meta.districts.map(d => `<option value="${d.id}" ${d.id === p.dist ? 'selected' : ''}>${h(d.name)}</option>`).join('')}</select>
      <select id="tVendor" class="input" aria-label="Vendor"><option value="">All vendors</option>${r.vendors.map(v => `<option value="${h(v.id)}" ${v.id === p.vendor ? 'selected' : ''}>${h(v.name)} (${v.items})</option>`).join('')}</select>
      <select id="tPrice" class="input" aria-label="Price">${opt(TENT_PRICES, p.price)}</select>
      <select id="tSort" class="input" aria-label="Sort">${opt([['', 'Free first'], ...(loc ? [['near', 'Nearest first']] : []), ['price-asc', 'Price: Low to High'], ['price-desc', 'Price: High to Low'], ['left', 'Most in stock'], ['rating', 'Top rated vendors']], p.sort)}</select>
      <label class="small vonly"><input type="checkbox" id="tAvail" ${p.avail ? 'checked' : ''}> Only free on ${shortDate(date)}</label>
    </div>
    ${countLine(r.total, 'item', p.km, distName, date, p.dist, r.beyond)}
    <div class="tent-wrap"><div>${items.length ? `<div class="vgrid" id="tentGrid">${items.map(card).join('')}</div>`
      : `<div class="panel empty"><div class="big">⛺</div><h3>No items found for this date</h3><p class="muted">Try another category, all districts, or another date.</p>${p.dist ? '<button class="btn btn-primary" data-alldist>Show all districts</button>' : ''}</div>`}</div>
      <aside class="panel tent-sel" id="tentSel"></aside></div>`;
  $('#vDateSlot').appendChild(vDateBar(() => viewTent(q)));
  const drawSel = () => { const b = $('#tentSel'); if (b) b.innerHTML = tentSelHtml(date); };
  const redraw = () => { const g = $('#tentGrid'); if (g) g.innerHTML = items.map(card).join(''); drawSel(); };
  drawSel(); bindTentSel($('#tentSel'), redraw);
  // one line per component per date; quantity within what is left that day (minimum order respected)
  const setItem = (x, qty) => {
    const was = (lineOf(x) || {}).qty || 0, tm = dateTime(date);
    let n = Math.max(0, Math.min(x.left, Math.round(qty) || 0));
    if (n > 0 && x.minQty > 1 && n < x.minQty) n = n < was ? 0 : Math.min(x.left, x.minQty);
    VS.vcart = VS.vcart.filter(y => !(y.listingId === x.listingId && y.date === date));
    if (n > 0) VS.vcart.push({ vendorId: x.vendorId, vendorName: x.vendorName, type: x.vendorType, mode: 'event', date, listingId: x.listingId, name: x.name, nameHi: x.nameHi, unit: x.unit, price: x.price, qty: n, max: x.left, min: x.minQty || 1, units: x.units,
      photo: x.photo, emoji: tentCatOf(x.category).emoji, delivery: x.delivery, fulfil: 'delivery', rental: true, category: x.category, size: x.size, ...(tm ? { eventTime: tm } : {}) });
    saveVCart(); redraw();
  };
  const grid = $('#tentGrid');
  if (grid) {
    grid.addEventListener('click', e => {
      const pics = e.target.closest('[data-tpics]');
      if (pics) { const x = items.find(i => i.listingId === pics.dataset.tpics); if (x.photos.length) photoViewer(x.photos, 0, x.name); return; }
      const a = e.target.closest('[data-tadd]');
      if (a) { const x = items.find(i => i.listingId === a.dataset.tadd); flyToCart(a.closest('.vcard').querySelector('.vph')); setItem(x, Math.max(1, x.minQty || 1)); toast(`${x.name} (${x.vendorName}) added to cart ✓`); return; }
      const b = e.target.closest('[data-tq]');
      if (b) { const x = items.find(i => i.listingId === b.dataset.l); setItem(x, ((lineOf(x) || {}).qty || 0) + Number(b.dataset.tq) * tStep(x)); }
    });
    grid.addEventListener('change', e => { const i = e.target.closest('[data-tqi]'); if (i) setItem(items.find(x => x.listingId === i.dataset.tqi), Number(i.value)); });
  }
  $('#tSearch').addEventListener('submit', e => { e.preventDefault(); go('q', e.target.q.value.trim()); });
  sectionSuggest($('#tSearch input'), 'tent,decoration,dj,catering', raw => go('q', raw), x => `#/tent?q=${encodeURIComponent(x.name)}`);
  $('#vFiltBtn').addEventListener('click', () => $('.vtoolbar').classList.toggle('open'));
  $('#tDist').addEventListener('change', e => go('dist', e.target.value || ''));
  $('#tVendor').addEventListener('change', e => go('vendor', e.target.value));
  $('#tPrice').addEventListener('change', e => go('price', e.target.value));
  $('#tSort').addEventListener('change', e => go('sort', e.target.value));
  $('#tAvail').addEventListener('change', e => go('avail', e.target.checked ? '1' : ''));
  $$('[data-tcat]').forEach(b => b.addEventListener('click', () => go('cat', b.dataset.tcat)));
  $$('[data-alldist]').forEach(b => b.addEventListener('click', () => go('dist', '')));
  bindLocBar(go);
}

// Review & Create Final Order: everything in the vendor cart by date → vendor → item, checked live on the server
async function viewTentReview() {
  spinner();
  const gs = vGroups();
  if (!gs.length) {
    app().innerHTML = `<div class="panel empty"><div class="big">⛺</div><h2>Your tent selection is empty</h2><p class="muted">Pick tents, chairs, lights, sound and flowers for each date first.</p><a class="btn btn-primary" href="#/tent">⛺ Start Tent Booking</a></div>`;
    return;
  }
  const r = await api('/api/tent/check', { method: 'POST', body: { groups: gs.map(g => ({ vendorId: g.vendorId, date: g.date, event: g.event || undefined, delivery: g.fulfil, items: g.lines.map(x => ({ listingId: x.listingId, qty: x.qty, guests: x.guests, addons: x.addons, dates: x.dates, style: x.style })) })) } });
  // keep the cart in step with today's prices and stock (lagan price, pieces left)
  r.groups.forEach((cg, i) => cg.lines.forEach((ln, j) => { const x = gs[i].lines[j]; if (!x || !ln.name) return; if (ln.price != null) x.price = ln.price; if (ln.rental && ln.left > 0) x.max = ln.left; }));
  store.set('vcart', VS.vcart);
  window.I18N.setNames(gs.flatMap(g => g.lines.map(x => [x.name, x.nameHi])));
  const dates = [...new Set(gs.map(g => g.date))].sort();
  const sumItems = r.groups.reduce((a, g) => a + g.subtotal, 0), sumDel = r.groups.reduce((a, g) => a + g.deliveryCharge, 0);
  const bad = r.groups.filter(g => !g.ok).length;
  const status = ln => (!ln ? '' : ln.ok ? `<span class="av ok">✓ ${ln.rental ? `${ln.left} left` : 'Available'}</span>` : `<span class="av bad">✗ ${ln.rental && ln.left ? `Only ${ln.left} left` : 'Not available'}</span>`);
  const lineRow = (x, ln) => { const p = ln && ln.price != null ? ln.price : x.price; return `<tr class="${ln && ln.ok ? '' : 'tr-bad'}">
      <td>${ph(x.photo, x.emoji || '⛺', '#f6eef0', 'tr-ph')}</td><td><b>${h(x.name)}</b>${x.size ? `<div class="small muted">📐 ${h(x.size)}</div>` : ''}${x.guests ? `<div class="small muted">👥 ${x.guests} guests</div>` : ''}${(x.dates || []).length ? `<div class="small">${datesChips(x)}</div>` : ''}</td>
      <td class="num">${x.qty} <span class="small muted">${h(x.unit)}</span></td><td class="num">${inr(p)}</td><td class="num"><b>${inr(p * x.qty)}</b></td><td>${status(ln)}</td></tr>`; };
  const delTxt = (g, cg) => (cg.delivers ? (cg.deliveryCharge ? `🚚 Delivery & transport ${inr(cg.deliveryCharge)}` : '🚚 Free delivery') : g.rental ? '🚚 Set-up at your venue' : g.mode === 'stock' ? '🏪 Pickup' : '📍 On site');
  const vendorBlock = (g, cg) => `<div class="tr-v ${cg.ok ? '' : 'bad'}">
      <div class="tr-vh"><div><a class="link" href="#/v/${g.vendorId}"><b>🏪 ${h(g.vendorName)}</b></a>${cg.vendor && cg.vendor.verified ? ' <span class="vbadge inline">✓ Verified</span>' : ''}${cg.vendor && cg.vendor.sample ? ' <span class="vsample inline">Sample</span>' : ''}${g.event ? ` <span class="chip chip-ev">${h(evShort(g.event))}</span>` : ''}
        ${cg.vendor ? `<div class="small muted">📍 ${h(cg.vendor.districtName)} · 📞 <a class="link" href="tel:+91${h(cg.vendor.phone)}">+91 ${h(cg.vendor.phone)}</a></div>` : ''}</div>
        <a class="btn btn-light btn-sm" href="${g.rental ? `#/tent?vendor=${h(g.vendorId)}` : `#/v/${h(g.vendorId)}`}">✏️ Edit</a></div>
      ${cg.error ? `<div class="err">${h(cg.error)}</div>` : ''}
      <div class="tbl-wrap"><table class="tbl tr-tbl"><thead><tr><th></th><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th><th>On ${shortDate(g.date)}</th></tr></thead><tbody>${g.lines.map((x, j) => lineRow(x, cg.lines[j])).join('')}</tbody></table></div>
      <div class="tr-vt"><span>Items ${inr(cg.subtotal)}</span><span>${delTxt(g, cg)}</span><b>${h(g.vendorName)} total ${inr(cg.total)}</b></div></div>`;
  app().innerHTML = `<div class="crumbs"><a href="#/">Home</a> › <a href="#/tent">Tent Booking</a> › Review</div>
    <div class="tr-head"><h1>Review Tent Selection</h1></div>
    <div class="two-col"><div>
      ${dates.map(dt => { const idx = gs.map((g, i) => i).filter(i => gs[i].date === dt); return `<section class="panel tr-date">
        <div class="tr-dh"><h2>📅 ${fmtDate(dt)}${r.groups[idx[0]].lagan ? ' <span class="lagan-tag">🪔 Lagan</span>' : ''}</h2><label class="tsel-time">⏰ Function time <input type="time" data-ttime="${dt}" value="${h(dateTime(dt))}"></label></div>
        ${idx.map(i => vendorBlock(gs[i], r.groups[i])).join('')}
        <div class="tr-dt"><span>Total for ${fmtDate(dt)}</span><b>${inr(idx.reduce((a, i) => a + r.groups[i].total, 0))}</b></div></section>`; }).join('')}
    </div>
    <aside class="panel summary tr-sum"><h3>Final order</h3>
      <div class="sum-row"><span>Dates</span><b>${dates.length}</b></div><div class="sum-row"><span>Vendors</span><b>${new Set(gs.map(g => g.vendorId)).size}</b></div>
      <div class="sum-row"><span>Items</span><b>${inr(sumItems)}</b></div><div class="sum-row"><span>Delivery & transport</span><b>${inr(sumDel)}</b></div>
      <div class="sum-row sum-total"><span>Grand total</span><b>${inr(r.total)}</b></div>
      <div style="padding:0 18px 16px">${bad ? `<div class="err">✗ ${bad} vendor booking${bad > 1 ? 's' : ''} cannot be booked as chosen — lower the quantity, change the date or remove the item.</div>` : '<div class="tr-ok">✓ Everything is available on your dates</div>'}
        <button class="btn btn-gold btn-block btn-lg" id="trGo" ${r.ok ? '' : 'disabled'}>Continue to Checkout</button>
        <a class="btn btn-light btn-block" href="#/tent" style="margin-top:8px">✏️ Edit selection</a>
        <p class="small muted" style="margin:10px 0 0">No payment now. At checkout every vendor is booked at once (all or nothing) for its date; pay each vendor directly as agreed.</p></div></aside></div>`;
  $$('[data-ttime]').forEach(i => i.addEventListener('change', () => { setDateTime(i.dataset.ttime, i.value); toast(i.value ? `Function time ${i.value} saved ✓` : 'Function time cleared'); }));
  $('#trGo').addEventListener('click', () => { location.hash = '#/checkout'; });
}

// Arkestra "All" view: Orchestra Groups and Individual Artists as two clearly headed sections
function arkGroupsHtml(vendors, date, limit) {
  const parts = [['group', '🎶 Orchestra Groups', 'Full stage show with singers, dancers, band & lights'], ['artist', '⭐ Individual Artists', 'Singers, dancers, anchors & comedians – book one artist']];
  return parts.map(([sub, title, note]) => {
    const list = vendors.filter(v => v.subtype === sub);
    if (!list.length) return '';
    return `<div class="ark-block"><div class="ark-bh"><h2>${title} <span class="ark-n">${list.length}</span></h2><span class="small muted">${h(note)}</span><a class="btn btn-light btn-sm" href="#/arkestra?sub=${sub}">See all ${sub === 'group' ? 'groups' : 'artists'} →</a></div>
      <div class="vgrid">${list.slice(0, limit || list.length).map(v => vCard(v, date)).join('')}</div></div>`;
  }).join('');
}

// Arkestra page = orchestra vendors with their own heading and URL (#/arkestra)
function viewArkestra(q) {
  const p = new URLSearchParams(q); p.set('type', 'orchestra');
  if (!q.has('dist')) p.set('dist', ''); // show all of Bihar & UP by default — artists travel
  return viewVendors(p, { arkestra: true });
}
// Home page block for arkestra: filled after the page renders
function arkestraHomeSection() {
  setTimeout(async () => {
    const el = $('#homeArk'); if (!el) return;
    try {
      const { vendors } = await api(`/api/vendors?type=orchestra&date=${vDate()}&ahead=1${GEO.get() ? '&' + locQs() : ''}`);
      window.I18N.setNames(vendors.map(v => [v.name, v.nameHi]));
      el.innerHTML = arkGroupsHtml(vendors, vDate(), 4) || '<p class="muted">Coming soon</p>';
    } catch { el.innerHTML = ''; }
  }, 0);
  return `<section class="sec ark-sec"><div class="sec-head"><h2>🎤 Arkestra & Stage Shows<small>Orchestra groups, singers, dancers, jagran — book for tilak, shaadi & baraat nights</small></h2><a href="#/arkestra">View all →</a></div>
    <div id="homeArk"><div class="spinner"></div></div>
    <div class="ark-join"><span>🎙️ Are you an arkestra group or artist? List yourself free — add your own photo, fees and dates.</span><a class="btn btn-gold btn-sm" href="#/vendor-join?type=orchestra&sub=artist">Join as Artist →</a></div></section>`;
}

// Home page block: one tile per vendor type
// what each family usually books first: bete ki shaadi → baraat (gaadi, band, DJ, arkestra); beti ki → hosting (tent, halwai, decoration)
const SIDE_FIRST = { boy: ['vehicle', 'band', 'dj', 'orchestra', 'wear', 'pandit'], girl: ['tent', 'catering', 'decoration', 'venue', 'pandit', 'sweets'] };
function vendorHomeSection() {
  const first = SIDE_FIRST[S.side] || [], rank = t => (first.includes(t.id) ? first.indexOf(t.id) : 99);
  const types = [...VTYPES].sort((a, b) => rank(a) - rank(b));
  return `<section class="sec"><div class="sec-head"><h2>Book Local Vendors<small>${S.side === 'boy' ? 'Baraat ke liye pehle: gaadi, band, DJ, arkestra' : S.side === 'girl' ? 'Baraat ke swagat ke liye pehle: tent, halwai, decoration' : 'Gaadi, halwai, sabzi, mithai, studio, DJ, pandit ji, orchestra'} — date-wise availability</small></h2><a href="#/vendors">View all →</a></div>
    <div class="vtiles">${types.map(t => `<a class="ev-tile" href="${t.id === 'orchestra' ? '#/arkestra' : t.id === 'tent' ? '#/tent' : t.id === 'vehicle' ? '#/cars' : t.id === 'cards' ? '#/cards' : t.id === 'ration' ? '#/ration' : `#/vendors?type=${t.id}`}"><img src="${unsplash(t.img, 300, 400)}" alt="" loading="lazy" onerror="this.remove()"><span>${t.emoji} ${h(t.name)}<small>${h(t.hi)}</small></span></a>`).join('')}</div></section>`;
}

document.addEventListener('click', e => {
  const c = e.target.closest('[data-cmp]');
  if (c) {
    const id = c.dataset.cmp;
    if (c.checked) { if (VS.compare.length >= 3) { c.checked = false; return toast('You can compare up to 3 vendors', true); } VS.compare.push(id); } else VS.compare = VS.compare.filter(x => x !== id);
    return drawTray();
  }
  const a = e.target.closest('[data-act="cmp-open"], [data-act="cmp-clear"]');
  if (a) { if (a.dataset.act === 'cmp-open') openCompare(); else { VS.compare = []; $$('[data-cmp]').forEach(x => { x.checked = false; }); drawTray(); } return; }
  const fr = e.target.closest('[data-vfree]');
  if (fr) { setVDate(fr.dataset.vfree); location.hash = `#/v/${fr.dataset.v}`; return; }
  if (e.target.closest('[data-locset]')) { pickHomeLocation(); return; }
  if (e.target.closest('[data-locoff]')) { GEO.clear(); renderDistrict(); toast('Location removed'); route(); return; }
  // completed booking: rate it right here (booking number + mobile are already on the card)
  const vr = e.target.closest('[data-vrate]');
  if (vr) {
    openReview({ title: vr.dataset.name, sub: `Booking #${vr.dataset.vrate}`,
      send: r => api('/api/vreviews', { method: 'POST', body: { number: vr.dataset.vrate, phone: vr.dataset.phone, rating: r.rating, text: r.text } }),
      done: () => { vr.outerHTML = '<span class="rv-done">✓ Reviewed</span>'; } });
    return;
  }
  // pay the vendor's advance (or everything left) online, or ask again whether a payment came in
  const vp = e.target.closest('[data-vbpay]');
  if (vp) {
    vp.disabled = true;
    (async () => {
      try {
        const { payment } = await api('/api/vbookings/pay', { method: 'POST', body: { number: vp.dataset.vbpay, phone: vp.dataset.phone, part: vp.dataset.part } });
        const r = await payOnline(payment);
        if (r.paid) toast(`Payment successful ✓ — ${inr(payment.amount / 100)} received for ${r.booking ? r.booking.vendorName : 'your booking'}`);
        route();
      } catch (err) { toast(err.message, true); } finally { vp.disabled = false; }
    })();
    return;
  }
  const vk = e.target.closest('[data-vbpaycheck]');
  if (vk) {
    api('/api/vbookings/pay/status', { method: 'POST', body: { number: vk.dataset.vbpaycheck, phone: vk.dataset.phone } })
      .then(r => { toast(r.found ? 'Payment found and confirmed ✓' : 'No new payment found yet. If money was taken, it is confirmed within a few minutes.', !r.found); route(); }).catch(err => toast(err.message, true));
    return;
  }
  const vc = e.target.closest('[data-vbcancel]');
  if (vc && confirm(vc.dataset.paid ? `Cancel this vendor booking? You paid ${vc.dataset.paid} online — our team will refund what has not yet gone to the vendor.` : 'Cancel this vendor booking?')) {
    api('/api/vbookings/cancel', { method: 'POST', body: { number: vc.dataset.vbcancel, phone: vc.dataset.phone } }).then(() => { toast('Booking cancelled'); route(); }).catch(err => toast(err.message, true));
  }
});

window.I18N.setNames(VTYPES.map(t => [t.name, t.hi]));
window.VENDORS = {
  catVendorStrip, lagan: viewLagan, cardGallery: viewCardGallery, ration: viewRation, list: viewVendors, cars: viewCars, tent: viewTent, tentReview: viewTentReview,listCar: q => viewVendorJoin(q, { car: true }), arkestra: viewArkestra, arkHome: arkestraHomeSection, halwaiStrip, detail: viewVendor, success: viewVBSuccess, track: viewVTrack, join: viewVendorJoin, homeSection: vendorHomeSection, types: VTYPES,
  count: vCount, total: vTotal, groups: vGroups, cartSection: vCartSection, bookCart: bookVendorCart, doneBlock: bookingsDoneBlock, done: viewVBDone,
  lastBookings: () => VS.lastBookings || [],
  // the function date the customer chose (vendor date bar or their Shaadi date in My Events); '' when none yet
  chosenDate, setDate: setVDate,
  card: vbCard, saved: () => VS.myVB, remember: rememberVB, // My Account (app.js) lists vendor bookings with the same card
};
window.dispatchEvent(new Event('vendors-ready'));
