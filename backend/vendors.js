// Vendor marketplace: verified local vendors (vehicles, caterers, ration, vegetables, sweets, studios,
// DJ, Pandit Ji, orchestra & artists), their listings, date-wise availability, bookings and reviews.

const fs = require('fs');
const path = require('path');
const { districtGeo, validPoint, kmBetween, geocodeAddress } = require('./geo');
const { INGREDIENTS, GROUPS, ING, QUALITIES, packSize } = require('./ingredients');
const { EVENTS } = require('./seed');

// Functions (rasams) an event-mode item is booked for — same rules as the shop's services: "events" = the only
// functions it can be booked for (Tilak puja → Tilak; empty = any), "covers" = one booking for several rasams,
// each on its own date (full ceremony Pandit Ji). Array or "a, b" text, kept in the EVENTS order.
const SHAADI = 'Shaadi (Vivah)';
const evList = raw => EVENTS.filter(e => (Array.isArray(raw) ? raw : String(raw || '').split(',')).map(x => String(x).trim()).includes(e));
// the rasam whose date is the booking date: the shaadi when covered, else the chosen function ('' = not for it)
const coverMain = (l, event) => { const c = l.covers || []; return c.includes(SHAADI) ? SHAADI : c.includes(event) ? event : ''; };
// every date a booking keeps the vendor busy: the booking date and each rasam date of a full-ceremony item
const vbDates = b => [...new Set([b.date, ...(b.items || []).flatMap(i => (i.dates || []).map(x => x.date))])];

// Verification papers (ID proof, licences, RC...). Kept in data/docs — never under /public — and only the
// vendor and admins can open them. Customers only see badges like "ID checked" / "FSSAI registered".
const DOCS_DIR = path.join(process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', 'database', 'data'), 'docs'); // private papers, never public
const DOC_KINDS = {
  id: 'ID proof (masked Aadhaar / Voter ID / Passport)', pan: 'PAN card', gst: 'GST certificate',
  fssai: 'FSSAI food licence / registration', shop: 'Shop / trade licence or Udyam certificate',
  venue: 'Ownership or rent papers of the hall', fire: 'Fire NOC', team: 'Team ID & age proofs (all performers)',
  police: 'Police verification certificate',
  dl: 'Driving licence', rc: 'RC (registration certificate)', insurance: 'Insurance', puc: 'Pollution (PUC)', permit: 'Taxi / commercial permit',
};
const CAR_DOCS = ['rc', 'insurance', 'puc', 'permit']; // these belong to one car
// Which papers each kind of vendor gives.
//   join: needed to sign up · check: needed before the team marks the papers complete · optional: good to have
// Aadhaar is never compulsory (Voter ID / passport / DL work too) and PAN is optional: many village
// halwai, mehndi and band artists have none, and PAN only matters if payouts are ever made through the site.
const FOOD = ['catering', 'sweets', 'ration', 'vegetable'];
const BUSINESS = ['ration', 'vegetable', 'sweets', 'wear', 'puja', 'gifts', 'cards', 'tent', 'decoration', 'band', 'dj', 'studio', 'venue'];
function docRules(type, sub) {
  if (type === 'vehicle') {
    const own = sub === 'owner'; // an owner-driver's licence is his ID proof too
    // dulha entry: ghodi / baggi have no RC; a decorated jeep may add its papers if it has them
    const car = sub === 'dulha' ? { join: [], check: [], optional: ['rc', 'insurance', 'permit'] } : { join: ['rc'], check: ['rc'], optional: ['insurance', 'puc', 'permit'] };
    return { join: own ? ['dl'] : ['id'], check: own ? ['dl'] : ['id'], optional: own ? ['id', 'pan', 'police'] : ['dl', 'pan', 'gst', 'police'], car };
  }
  const solo = ['pandit', 'mehndi'].includes(type) || (type === 'catering' && sub === 'cook') || (type === 'orchestra' && sub === 'artist') || (type === 'makeup' && sub === 'artist');
  const r = { join: ['id'], check: ['id'], optional: ['pan'] };
  // food businesses need FSSAI by law; for caterers and sweet shops it is part of the check
  if ((type === 'catering' && sub === 'caterer') || type === 'sweets') r.check.push('fssai');
  else if (FOOD.includes(type)) r.optional.push('fssai');
  if (BUSINESS.includes(type) || (type === 'makeup' && sub === 'parlour') || (type === 'catering' && sub === 'caterer')) r.optional.push('shop');
  if (!solo) r.optional.push('gst');
  if (type === 'venue') r.optional.push('venue', 'fire');
  // arkestra groups: every performer must be an adult — their ID / age proofs are part of the check
  if (type === 'orchestra' && sub !== 'artist') r.check.push('team');
  if (type === 'orchestra') r.optional.push('police');
  return r;
}
// Wedding card details the printer picks from (customers filter the design gallery by these)
const CARD_TYPES = ['Single card', 'Folded card', 'Laser-cut', 'Scroll / box', 'Multi-page booklet', 'E-card (digital)'];
const PRINTING = ['Offset', 'Digital', 'Screen', 'Gold foil', 'Silver foil', 'Embossed', 'Laser cut', 'UV spot'];
const ruleKinds = (r, withCar) => [...new Set([...r.join, ...r.check, ...r.optional, ...(withCar && r.car ? [...r.car.join, ...r.car.check, ...r.car.optional] : [])])];
// PAN / GSTIN / FSSAI numbers: format checks only (kept private, customers see badges)
const KYC = {
  pan: [s => /^[A-Z]{5}\d{4}[A-Z]$/.test(s), 'PAN looks wrong. It is like ABCDE1234F'],
  gstin: [s => /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(s), 'GSTIN looks wrong. It has 15 characters, like 10ABCDE1234F1Z5'],
  fssai: [s => /^\d{14}$/.test(s), 'FSSAI number has 14 digits'],
};
const normKyc = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const kycError = b => { for (const [k, [ok, msg]] of Object.entries(KYC)) if (b[k] && !ok(normKyc(b[k]))) return msg; return ''; };
const DOC_MAX = 3 * 1024 * 1024;
// "br 06-ab 1234" → "BR06AB1234"; also the new BH series ("22 BH 1234 AA")
const normReg = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const validReg = s => /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(s) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(s);
const fmtReg = s => { const m = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/.exec(s) || /^(\d{2})(BH)(\d{4})([A-Z]{1,2})$/.exec(s); return m ? m.slice(1).filter(Boolean).join(' ') : s; };
// Indian DL: state code + RTO + year + number, e.g. BR06 20110012345
const normDL = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const validDL = s => /^[A-Z]{2}\d{2}[0-9A-Z]{9,13}$/.test(s);
// Decodes an uploaded photo / PDF and checks the file really is what it says
function decodeDoc(dataUrl) {
  const m = /^data:(image\/(png|jpe?g|webp)|application\/pdf);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ''));
  if (!m) return { error: 'Upload a photo (JPG / PNG) or a PDF of the document' };
  const buf = Buffer.from(m[3], 'base64');
  if (!buf.length) return { error: 'The document file is empty' };
  if (buf.length > DOC_MAX) return { error: 'Each document must be under 3 MB' };
  const ext = m[1] === 'application/pdf' ? 'pdf' : m[2] === 'jpeg' ? 'jpg' : m[2];
  const magic = { pdf: b => b.slice(0, 4).toString() === '%PDF', png: b => b[0] === 0x89 && b[1] === 0x50, jpg: b => b[0] === 0xff && b[1] === 0xd8, webp: b => b.slice(8, 12).toString() === 'WEBP' }[ext];
  if (!magic(buf)) return { error: 'This file does not look like a real photo or PDF' };
  return { buf, ext };
}
const DOC_MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

// mode decides how double bookings are prevented:
//   unit  – each listing is a physical unit (e.g. one Scorpio); bookings per listing per date <= units
//   event – the vendor can take capacityPerDay bookings per date (caterer, studio, DJ, pandit, artist)
//   stock – goods with stock; ordered quantity is reserved from stock
const VENDOR_TYPES = [
  { id: 'vehicle', name: 'Vehicles', hi: 'गाड़ियाँ', emoji: '🚙', mode: 'unit', subtypes: [['car', 'Cars & SUVs', 'कार व एसयूवी'], ['owner', 'Own Car (Owner-Driver)', 'अपनी गाड़ी (मालिक-ड्राइवर)'], ['dulha', 'Dulha Entry', 'दूल्हा एंट्री']] },
  { id: 'catering', name: 'Cooks & Catering', hi: 'हलवाई व कैटरिंग', emoji: '👨‍🍳', mode: 'event', subtypes: [['cook', 'Individual Cooks / Halwai', 'हलवाई / कुक'], ['caterer', 'Catering Services', 'कैटरिंग सेवा']] },
  { id: 'ration', name: 'Raw Materials & Ration', hi: 'राशन सामग्री', emoji: '🌾', mode: 'stock' },
  { id: 'vegetable', name: 'Vegetables', hi: 'सब्ज़ी', emoji: '🥬', mode: 'stock' },
  { id: 'sweets', name: 'Sweet Shops', hi: 'मिठाई की दुकान', emoji: '🍬', mode: 'stock' },
  { id: 'studio', name: 'Cameras & Studios', hi: 'कैमरा व स्टूडियो', emoji: '📸', mode: 'event' },
  { id: 'dj', name: 'DJ & Sound', hi: 'डीजे व साउंड', emoji: '🎧', mode: 'event' },
  { id: 'pandit', name: 'Pandit Ji', hi: 'पंडित जी', emoji: '🙏', mode: 'event' },
  { id: 'orchestra', name: 'Orchestra & Artists', hi: 'आर्केस्ट्रा व कलाकार', emoji: '🎤', mode: 'event', subtypes: [['group', 'Orchestra Groups', 'आर्केस्ट्रा ग्रुप'], ['artist', 'Individual Artists', 'व्यक्तिगत कलाकार']] },
  // wedding services that the shop also sells, so local people can offer them too
  { id: 'tent', name: 'Tent, Shamiyana & Light', hi: 'टेंट, शामियाना व लाइट', emoji: '⛺', mode: 'event', subtypes: [['tent', 'Tent House', 'टेंट हाउस'], ['light', 'Light & Generator', 'लाइट व जनरेटर']] },
  { id: 'decoration', name: 'Phool & Decoration', hi: 'फूल व सजावट', emoji: '💐', mode: 'event', subtypes: [['decor', 'Decorators (mandap, stage, gate)', 'डेकोरेटर'], ['flowers', 'Phool / Mala Wala', 'फूल माला वाले']] },
  { id: 'band', name: 'Band Baja & Shehnai', hi: 'बैंड बाजा व शहनाई', emoji: '🥁', mode: 'event', subtypes: [['band', 'Band Party', 'बैंड पार्टी'], ['shehnai', 'Shehnai & Dhol', 'शहनाई व ढोल']] },
  { id: 'mehndi', name: 'Mehndi Artists', hi: 'मेहंदी आर्टिस्ट', emoji: '🌿', mode: 'event' },
  { id: 'makeup', name: 'Makeup & Beauty Parlour', hi: 'मेकअप व ब्यूटी पार्लर', emoji: '💄', mode: 'event', subtypes: [['artist', 'Makeup Artists', 'मेकअप आर्टिस्ट'], ['parlour', 'Beauty Parlours', 'ब्यूटी पार्लर']] },
  { id: 'venue', name: 'Marriage Hall & Venue', hi: 'मैरिज हॉल व वेन्यू', emoji: '🏛️', mode: 'event', subtypes: [['hall', 'Marriage Halls', 'मैरिज हॉल'], ['lawn', 'Lawns & Gardens', 'लॉन व गार्डन'], ['hotel', 'Hotels & Resorts', 'होटल व रिसॉर्ट']] },
  { id: 'wear', name: 'Dulha-Dulhan Wear', hi: 'दूल्हा-दुल्हन परिधान', emoji: '👑', mode: 'stock' },
  { id: 'puja', name: 'Puja Samagri Shops', hi: 'पूजा सामग्री दुकान', emoji: '🪔', mode: 'stock' },
  { id: 'gifts', name: 'Shagun & Gift Shops', hi: 'शगुन व उपहार दुकान', emoji: '🎁', mode: 'stock' },
  // cards are made to order: "stock" = how many cards the printer can take now; designs carry MOQ, bulk rates and add-ons
  { id: 'cards', name: 'Shaadi Card Printing', hi: 'शादी कार्ड छपाई', emoji: '💌', mode: 'stock' },
];
const TYPE = Object.fromEntries(VENDOR_TYPES.map(t => [t.id, t]));
// Listings that are one person (shown with the person's photo, name, experience and languages)
const isPerson = v => v.type === 'pandit' || v.type === 'mehndi' || (v.type === 'makeup' && v.subtype === 'artist') || (v.type === 'catering' && v.subtype === 'cook') || (v.type === 'orchestra' && v.subtype === 'artist') || (v.type === 'vehicle' && v.subtype === 'owner');
// One person can be at only one wedding on a date: once a Pandit Ji, cook, mehndi / makeup artist or solo artist is
// booked (request or confirmed), that date is locked for every other family. Teams (caterers, studios, DJ, band,
// tent house, decorators, halls…) set how many weddings they can serve on the same day; when all are taken the date
// shows Booked. An owner-driver has one car.
const perDay = v => (isPerson(v) ? 1 : Math.max(1, Math.min(50, v.capacityPerDay || 1)));
const ACTIVE_BOOKING = ['requested', 'confirmed'];
const HOLDS_SLOT = ['requested', 'confirmed', 'completed']; // a completed booking still used that date
const BOOKING_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled', 'rejected'];
// Rental components (Tent Booking page): a tent house / decorator / DJ listing marked `rental` is a stock of pieces
// the vendor owns (`units` = 300 chairs, 4 shamiyanas, 2 generators) booked by quantity per date:
//   left on a date = units − pieces in requested / confirmed / completed bookings of that date.
// Closed days and dates the vendor marked booked still stop it. Bookings of only rental pieces do not use the
// vendor's "bookings per day" slots (capacityPerDay) — those stay for package / service listings (full tent package, DJ night).
const RENTAL_TYPES = ['tent', 'decoration', 'dj'];
const TENT_CATS = [
  ['tent', 'Tents & Pandal', 'टेंट व पंडाल', '⛺'], ['poles', 'Poles & Frames', 'बल्ली व फ्रेम', '🏗️'], ['fabric', 'Fabric & Kanaat', 'कपड़ा व कनात', '🧵'],
  ['carpet', 'Carpet & Flooring', 'कालीन व फ़र्श', '🧶'], ['chairs', 'Chairs', 'कुर्सियाँ', '🪑'], ['tables', 'Tables', 'टेबल', '🍽️'],
  ['stage', 'Stage & Mandap', 'स्टेज व मंडप', '🛕'], ['sofa', 'Sofa & Lounge', 'सोफ़ा व लाउंज', '🛋️'], ['lighting', 'Lighting', 'लाइटिंग', '💡'],
  ['sound', 'Sound & DJ', 'साउंड व डीजे', '🔊'], ['generator', 'Generator', 'जनरेटर', '⚡'], ['decoration', 'Decoration', 'सजावट', '🎀'],
  ['flowers', 'Flowers', 'फूल', '💐'], ['bartan', 'Bartan & kitchen', 'बर्तन व रसोई', '🍲'], ['other', 'Other items', 'अन्य सामान', '📦'],
].map(([id, name, hi, emoji]) => ({ id, name, hi, emoji }));
const TENT_CAT_IDS = TENT_CATS.map(c => c.id);
// Halwai / caterers also rent out bartan (degchi, kadhai, bhatti…) — the same per-date pieces as tent items, with
// their own categories, shown on the halwai's profile (not in the Tent Booking catalog)
const BARTAN_CATS = [
  ['cooking', 'Cooking vessels', 'पकाने के बर्तन', '🍲'], ['serving', 'Serving & storage', 'परोसने के बर्तन', '🥣'],
  ['fire', 'Bhatti, gas & chulha', 'भट्ठी व गैस', '🔥'], ['tools', 'Karchhi, jharna & tools', 'करछी व औज़ार', '🥄'], ['other', 'Other bartan', 'अन्य बर्तन', '📦'],
].map(([id, name, hi, emoji]) => ({ id, name, hi, emoji }));
const BARTAN_CAT_IDS = BARTAN_CATS.map(c => c.id);
const PIECE_TYPES = [...RENTAL_TYPES, 'catering']; // vendor types whose listings can be rental pieces
const VISIT_TYPES = ['tent', 'decoration']; // vendors a family can call for a site visit (measure the ground) before booking
// Extra people for hire with a booking, priced per person: a halwai's extra cooks and helpers (per day), an
// orchestra group's extra lady dancers and singers (per show). `units` = how many such people the vendor has;
// one person goes to one wedding on a date, so the count left is per date.
const STAFF_BY = { catering: ['cook', 'helper'], orchestra: ['dancer', 'singer'] };
// photo / video studios: one booking can cover several functions, each on its own date with its own coverage.
// A listing is charged "day" (coverage per function: photo only, photo + video…), "addon" (per function: drone,
// extra cameraman) or "once" (album, pre-wedding shoot); without a kind it is a fixed package on the booking date
const PLAN_TYPES = ['studio'];
const SHOOT_KINDS = ['day', 'addon', 'once'];
const STAFF_ROLES = STAFF_BY.catering;
const ROLE_WORD = { cook: ['cook', 'cooks'], helper: ['helper', 'helpers'], dancer: ['lady dancer', 'lady dancers'], singer: ['singer', 'singers'] };
// a booking of rental pieces only (no package / service item)
const rentalOnly = b => (b.items || []).length > 0 && b.items.every(i => i.rental);
const isTime = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || '');

module.exports = function setupVendors(h) {
  const { route, db, save, send, fail, str, num, uid, now, today, currentUser, findTracked, bump } = h;
  const D = () => db();
  // a booking with its money: paid online, held by us, paid out to the vendor, refund owed, what can be paid now
  const withMoney = b => (h.vbMoney ? { ...b, money: h.vbMoney(b) } : b);
  const vendors = () => D().vendors || (D().vendors = []);
  const listings = () => D().vlistings || (D().vlistings = []);
  const vbookings = () => D().vbookings || (D().vbookings = []);
  const vreviews = () => D().vreviews || (D().vreviews = []);
  const vvisits = () => D().vvisits || (D().vvisits = []);
  const districtOf = id => D().districts.find(d => d.id === id) || null;
  const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');

  // ---------- location ----------
  // Where the vendor is: their own pin, else their district HQ (approx)
  const geoOf = v => (validPoint(v.lat, v.lng) ? { ...validPoint(v.lat, v.lng), exact: true } : districtGeo(v.district));
  // The customer's ghar / venue from ?lat=&lng=&pin= (null when not given)
  const nearOf = query => {
    const p = validPoint(query.get('lat'), query.get('lng')), pin = /^[1-9]\d{5}$/.test(query.get('pin') || '') ? query.get('pin') : '';
    return p || pin ? { ...p, pin } : null;
  };
  const distanceTo = (v, near) => {
    if (!near) return {};
    const g = near.lat != null && geoOf(v);
    const samePin = !!near.pin && v.pincode === near.pin;
    // how many leading pincode digits match (3 = same postal sorting district) — a rough nearness when there is no map point
    const pinMatch = near.pin && /^\d{6}$/.test(v.pincode || '') ? [...near.pin].findIndex((c, i) => c !== v.pincode[i]) : -1;
    return { ...(g ? { km: Math.round(kmBetween(near, g) * 10) / 10, kmApprox: !g.exact } : {}), samePin, pinScore: pinMatch === -1 ? (samePin ? 6 : 0) : pinMatch };
  };
  // radius filter (km=0 or missing = any distance) and nearest-first ordering: same pincode first, then by km
  const withinKm = (query, near) => { const r = num(query.get('km'), 0); return c => !near || !r || c.km == null || c.samePin || c.km <= r; };
  const byKm = (a, b) => (b.samePin || 0) - (a.samePin || 0) || (a.km ?? 1e9) - (b.km ?? 1e9) || (b.pinScore || 0) - (a.pinScore || 0);

  // Vendor address / pincode → map point (unless the vendor pinned it by hand). Runs in the background after saving.
  const placeKey = v => [v.address, v.pincode, v.district].join('|');
  async function autoLocate(v) {
    const d = districtOf(v.district), center = districtGeo(v.district);
    if (!d || v.geoSrc === 'pin' || (!v.address && !v.pincode)) return;
    const key = placeKey(v);
    const p = await geocodeAddress({ address: v.address, pincode: v.pincode, district: d.name.replace(/\s*\(.*\)/, ''), state: d.state });
    // ignore if the vendor changed things meanwhile, pinned by hand, or the match is far outside their zila
    if (!p || placeKey(v) !== key || v.geoSrc === 'pin' || (center && kmBetween(p, center) > 90)) return;
    Object.assign(v, p, { geoSrc: 'address' });
    save();
  }

  // ---------- Lagan (shubh vivah) dates ----------
  // One list for the whole site, kept by verified Pandit Ji and admins. Every vendor sees it and sets their
  // own lagan-day price: a fixed lagan price per item, or "% extra" on lagan days for everything.
  const laganDb = () => D().lagan || (D().lagan = { dates: {}, sheets: [] });
  const isLagan = date => !!laganDb().dates[date];
  function priceOn(v, l, date, tierPrice) {
    const base = tierPrice ?? l.price;
    if (!isLagan(date)) return base;
    if (tierPrice == null && l.laganPrice > 0) return l.laganPrice;
    return v.laganPct > 0 ? Math.round(base * (1 + v.laganPct / 100)) : base;
  }

  // ---------- availability ----------
  // a full-ceremony booking holds every one of its rasam dates, not only the booking date
  // (rental-only bookings take pieces from stock, not one of the vendor's daily booking slots)
  const holding = (vendorId, date) => vbookings().filter(b => b.vendorId === vendorId && HOLDS_SLOT.includes(b.status) && !rentalOnly(b) && vbDates(b).includes(date));
  function unitsBooked(listingId, date, exceptId) {
    let n = 0;
    for (const b of vbookings()) if (b.id !== exceptId && b.date === date && HOLDS_SLOT.includes(b.status)) for (const i of b.items) if (i.listingId === listingId) n += i.qty;
    return n;
  }
  function availability(v, date) {
    if (!isDate(date)) return { status: 'unknown' };
    if (date < today()) return { status: 'past' };
    if ((v.blockedDates || []).includes(date)) return { status: 'closed' };
    // vendor marked this date as already booked (booking taken outside the website)
    if ((v.bookedDates || []).includes(date)) return { status: 'full', left: 0, offline: true };
    const dow = new Date(date + 'T00:00:00').getDay();
    if (v.openDays && v.openDays.length && !v.openDays.includes(dow)) return { status: 'closed' };
    const mode = TYPE[v.type].mode;
    const own = listings().filter(l => l.vendorId === v.id && l.active);
    if (mode === 'event') {
      const cap = perDay(v), used = holding(v.id, date).length;
      // rental components and team members: pieces / people left per listing on this date (even when the day's package slots are full)
      const rent = own.filter(l => l.rental || l.staff);
      const units = rent.length ? Object.fromEntries(rent.map(l => [l.id, Math.max(0, (l.units || 1) - unitsBooked(l.id, date))])) : undefined;
      return used >= cap ? { status: 'full', left: 0, units } : { status: 'available', left: cap - used, units };
    }
    if (mode === 'unit') {
      const left = Object.fromEntries(own.map(l => [l.id, Math.max(0, (l.units || 1) - unitsBooked(l.id, date))]));
      const total = Object.values(left).reduce((a, b) => a + b, 0);
      return total > 0 ? { status: 'available', left: total, units: left } : { status: 'full', left: 0, units: left };
    }
    const inStock = own.filter(l => (l.stock || 0) > 0).length;
    return inStock ? { status: 'available', left: inStock, freshToday: v.stockUpdated === today() } : { status: 'full', left: 0 };
  }
  function calendar(v, month) {
    const [y, m] = month.split('-').map(Number), days = new Date(y, m, 0).getDate(), out = [];
    for (let d = 1; d <= days; d++) { const ds = `${month}-${String(d).padStart(2, '0')}`; const a = availability(v, ds); out.push({ date: ds, status: a.status, left: a.left, ...(isLagan(ds) ? { lagan: true } : {}) }); }
    return out;
  }
  // Advance booking window: this month + the next AHEAD_MONTHS - 1 months
  const AHEAD_MONTHS = 5;
  const aheadMonths = () => Array.from({ length: AHEAD_MONTHS }, (_, i) => { const d = new Date(Number(today().slice(0, 4)), Number(today().slice(5, 7)) - 1 + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const aheadCalendars = v => aheadMonths().map(month => ({ month, calendar: calendar(v, month) }));

  // Price by number of guests (e.g. 100 log ₹6,500 · 200 log ₹9,000). Accepts [{guests, price}] or "100:6500, 200:9000".
  function parseTiers(raw) {
    const list = Array.isArray(raw) ? raw : String(raw || '').split(/[,\n]/).map(s => { const [g, p] = s.split(/[:=]/); return { guests: g, price: p }; });
    const tiers = list.map(t => ({ guests: Math.round(num(t && t.guests)), price: Math.round(num(t && String(t.price).replace(/[₹,\s]/g, ''))) }))
      .filter(t => t.guests >= 10 && t.guests <= 10000 && t.price > 0);
    return [...new Map(tiers.map(t => [t.guests, t])).values()].sort((a, b) => a.guests - b.guests).slice(0, 8);
  }
  const hasTiers = l => Array.isArray(l.guestTiers) && l.guestTiers.length > 0;

  // Bulk rates for goods sold by quantity (sweets per kg, boxes, cards): [{min, price}] = "from `min` units, `price` each".
  // Accepts [{min, price}] / [[min, price]] or "10:400, 25:380".
  function parseBulk(raw) {
    const list = Array.isArray(raw) ? raw.map(t => (Array.isArray(t) ? { min: t[0], price: t[1] } : t)) : String(raw || '').split(/[,\n]/).map(s => { const [m, p] = s.split(/[:=]/); return { min: m, price: p }; });
    const tiers = list.map(t => ({ min: Math.round(num(t && t.min)), price: Math.round(num(t && String(t.price).replace(/[₹,\s]/g, ''))) })).filter(t => t.min >= 2 && t.min <= 1000000 && t.price > 0);
    return [...new Map(tiers.map(t => [t.min, t])).values()].sort((a, b) => a.min - b.min).slice(0, 8);
  }
  // the bulk price that applies to `qty` (undefined = normal price)
  const bulkPrice = (l, qty) => { const t = (l.bulkTiers || []).filter(x => qty >= x.min).pop(); return t ? t.price : undefined; };
  // Card add-ons, e.g. "Envelope:2, Ribbon:3" → [{name, price}] (price per card, 0 = free)
  function parseAddons(raw) {
    const list = Array.isArray(raw) ? raw.map(a => (Array.isArray(a) ? { name: a[0], price: a[1] } : a)) : String(raw || '').split(/[,\n]/).map(s => { const i = s.lastIndexOf(':'); return i > 0 ? { name: s.slice(0, i), price: s.slice(i + 1) } : { name: s, price: 0 }; });
    return [...new Map(list.map(a => ({ name: str(a && a.name, 40), price: Math.max(0, Math.round(num(a && a.price))) })).filter(a => a.name).map(a => [a.name.toLowerCase(), a])).values()].slice(0, 12);
  }
  const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

  // Dishes a halwai / cook can make, in groups. Accepts [{group, items}] or lines like "Mithai: Gulab jamun, Rasgulla".
  function parseDishes(raw) {
    const groups = Array.isArray(raw) ? raw : String(raw || '').split('\n').map(line => {
      const i = line.indexOf(':');
      return i > 0 && i < 40 ? { group: line.slice(0, i), items: line.slice(i + 1).split(',') } : { group: '', items: line.split(',') };
    });
    return groups.map(g => ({ group: str(g && g.group, 40), items: [...new Set((Array.isArray(g && g.items) ? g.items : []).map(x => str(x, 50)).filter(Boolean))].slice(0, 60) }))
      .filter(g => g.items.length).slice(0, 15);
  }
  const dishCount = v => (v.dishes || []).reduce((a, g) => a + g.items.length, 0);
  // skills use the same "Group: skill, skill" lines as dishes (e.g. "Jyotish / Astro: Kundli milan, Muhurat, Vastu")
  const skillCount = v => (v.skills || []).reduce((a, g) => a + g.items.length, 0);
  // education / training: one line each (degree, institute, year)
  const parseEducation = raw => [...new Set((Array.isArray(raw) ? raw : String(raw || '').split('\n')).map(x => str(x, 120)).filter(Boolean))].slice(0, 8);

  // Arkestra team: each artist (or a crew like "Band musicians × 4") with photo, stage name, work and gender
  function parseTeam(raw) {
    return (Array.isArray(raw) ? raw : []).slice(0, 40).map(m => ({
      id: /^tm_[\w-]{4,20}$/.test(String(m && m.id)) ? m.id : uid('tm_'),
      name: str(m && m.name, 60), role: str(m && m.role, 40) || 'Artist',
      gender: ['female', 'male'].includes(m && m.gender) ? m.gender : '',
      count: Math.max(1, Math.min(50, Math.round(num(m && m.count, 1)))),
      photo: /^(https?:\/\/|\/uploads\/)/.test(str(m && m.photo, 400)) ? str(m.photo, 400) : '',
    })).filter(m => m.name || m.role);
  }
  function teamSummary(v) {
    const team = v.team || [];
    if (!team.length) return { teamTotal: 0, teamLadies: 0, teamRoles: [], teamFaces: [] };
    const roles = new Map();
    for (const m of team) roles.set(m.role, (roles.get(m.role) || 0) + m.count);
    return {
      teamTotal: team.reduce((a, m) => a + m.count, 0), teamLadies: team.filter(m => m.gender === 'female').reduce((a, m) => a + m.count, 0),
      teamRoles: [...roles].map(([role, n]) => ({ role, n })), teamFaces: team.filter(m => m.count === 1).slice(0, 6).map(m => ({ name: m.name, role: m.role, photo: m.photo, gender: m.gender })),
    };
  }

  // Seats and AC: the vendor's own fields first; older listings fall back to their specs / name ("7 seats · AC").
  // ac null = not stated
  // what kind of gaadi a listing is, from its name — families filter by it (a baggi has horses, so baggi is checked first)
  const CAR_KINDS = [['baggi', /baggi|bagghi|buggy|rath|chariot|बग्गी/i], ['ghodi', /ghod[ia]|horse|घोड़/i], ['open', /vintage|open|thar|jeep|gypsy/i],
    ['luxury', /mercedes|benz|audi|bmw|jaguar|volvo|luxury|limo/i], ['bus', /\bbus\b|tempo|traveller|traveler|urbania|minibus/i], ['car', /./]];
  const carKind = l => CAR_KINDS.find(([, re]) => re.test(`${l.name} ${l.nameHi || ''}`))[0];
  // words a family may type for each kind ("horse" finds the ghodi and the baggi)
  const KIND_WORDS = { baggi: 'baggi buggy horse cart', ghodi: 'ghodi ghoda horse', open: 'open jeep vintage', luxury: 'luxury', bus: 'bus tempo', car: 'car suv gaadi' };
  const carFacts = l => {
    const txt = `${l.specs || ''} ${l.name}`;
    return {
      seats: l.seats > 0 ? l.seats : Number((/(\d+)\s*seat/i.exec(txt) || [])[1] || 0),
      ac: typeof l.ac === 'boolean' ? l.ac : /\bnon[- ]?ac\b/i.test(txt) ? false : /\bac\b/i.test(txt) ? true : null,
      km: l.km || '', driver: typeof l.driver === 'boolean' ? l.driver : /with driver|driver included|chauffeur/i.test(txt),
    };
  };

  // ---------- photos ----------
  // photo links: our own uploads or https links only, no duplicates
  const cleanPhotos = (list, max) => [...new Set(list.map(x => str(x, 400)).filter(x => /^(https:\/\/|\/uploads\/[\w.-]+$)/.test(x)))].slice(0, max);
  const UPLOAD_DIR = path.join(__dirname, '..', 'frontend', 'uploads');
  // Join form photos arrive as shrunk JPEGs (data URLs); they are checked to be real images before saving
  function decodePhoto(dataUrl) {
    const m = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ''));
    if (!m) return { error: 'Photos must be JPG, PNG or WEBP' };
    const buf = Buffer.from(m[2], 'base64'), ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    if (!buf.length || buf.length > 2 * 1024 * 1024) return { error: 'Each photo must be under 2 MB' };
    const real = { png: buf[0] === 0x89 && buf[1] === 0x50, jpg: buf[0] === 0xff && buf[1] === 0xd8, webp: buf.slice(8, 12).toString() === 'WEBP' }[ext];
    return real ? { buf, ext } : { error: 'One of the photos is not a real image' };
  }
  function storePhoto(dec) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const name = uid('img_') + '.' + dec.ext;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), dec.buf);
    return '/uploads/' + name;
  }
  // the join form is open to everyone: a few sign-ups per hour per device / network
  const joinHits = new Map();
  const joinLimited = req => {
    const ip = h.clientIp ? h.clientIp(req) : req.socket.remoteAddress || '', t = Date.now(), hits = (joinHits.get(ip) || []).filter(x => t - x < 3600e3);
    hits.push(t); joinHits.set(ip, hits);
    return hits.length > 6;
  };

  // ---------- vehicle papers ----------
  const docFile = d => path.join(DOCS_DIR, path.basename(d.file));
  // A new upload of the same paper (for the same car) replaces the old one and waits for a fresh check
  function storeDoc(v, kind, dec, listingId) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
    const id = uid('doc_'), file = `${v.id}_${id}.${dec.ext}`;
    fs.writeFileSync(path.join(DOCS_DIR, file), dec.buf);
    const lid = CAR_DOCS.includes(kind) ? listingId || '' : '';
    const same = d => d.kind === kind && (d.listingId || '') === lid;
    for (const d of (v.docs || []).filter(same)) fs.rm(docFile(d), { force: true }, () => {});
    const doc = { id, kind, listingId: lid, file, ext: dec.ext, size: dec.buf.length, status: 'pending', note: '', at: now() };
    v.docs = [...(v.docs || []).filter(d => !same(d)), doc];
    return doc;
  }
  const docOk = (v, kind, lid) => (v.docs || []).some(d => d.kind === kind && d.status === 'ok' && (lid === undefined || d.listingId === lid));
  // shown to customers: licence and RC checked by the team
  const papersOk = v => TYPE[v.type].mode === 'unit' && docOk(v, 'dl') && docOk(v, 'rc');
  // one car's badge: its own RC checked (and the owner-driver's licence; fleet drivers change, so no licence is asked)
  const carPapersOk = (v, l) => docOk(v, 'rc', l.id) && (v.subtype !== 'owner' || docOk(v, 'dl'));
  const rulesOf = v => docRules(v.type, v.subtype);
  // badges customers see (never the papers or numbers themselves)
  const trustOf = v => ({
    id: docOk(v, 'id') || (v.type === 'vehicle' && docOk(v, 'dl')), papers: papersOk(v),
    fssai: docOk(v, 'fssai'), gst: docOk(v, 'gst'), team: docOk(v, 'team'),
  });
  // papers still needed before the team can call this vendor's documents complete (shown to vendor and admin)
  const missingChecks = v => {
    const r = rulesOf(v), out = r.check.filter(k => !docOk(v, k));
    if (r.car) for (const l of listings().filter(x => x.vendorId === v.id)) for (const k of r.car.check) if (!docOk(v, k, l.id)) out.push(`${k}:${l.id}`);
    return out;
  };

  // ---------- public shapes ----------
  function ratingOf(vendorId) {
    const rs = vreviews().filter(r => r.vendorId === vendorId && r.status === 'published');
    const avg = rs.length ? Math.round(rs.reduce((a, r) => a + r.rating, 0) / rs.length * 10) / 10 : 0;
    return { rating: avg, reviews: rs.length, breakdown: [5, 4, 3, 2, 1].map(s => rs.filter(r => r.rating === s).length) };
  }
  function cardOf(v, date, ahead, near) {
    const own = listings().filter(l => l.vendorId === v.id && l.active);
    // prices for the chosen date (lagan days use the vendor's lagan price)
    // "From ₹…" counts what the shop really sells (sweets per kg), not its packaging boxes
    // (and not extra people / rental pieces / a studio's add-ons and album — "from" is the price of the vendor's own service)
    const svc = own.filter(l => !l.staff && !l.rental && !['addon', 'once'].includes(l.shoot)), base = svc.length ? svc : own.filter(l => !l.staff);
    const main = base.some(l => l.kind !== 'box') ? base.filter(l => l.kind !== 'box') : base;
    const prices = main.map(l => priceOn(v, l, date)).filter(Boolean), normal = main.map(l => l.price).filter(Boolean);
    const d = districtOf(v.district);
    const cheapest = main.slice().sort((a, b) => priceOn(v, a, date) - priceOn(v, b, date))[0];
    const lagan = isLagan(date) && prices.length && Math.min(...prices) !== Math.min(...normal) ? { lagan: true, normalPrice: Math.min(...normal) } : {};
    // ahead: guest-wise prices and free dates over the advance booking window (Halwai & Catering page)
    const extra = ahead ? (() => {
      const main = own.filter(hasTiers).sort((a, b) => b.guestTiers.length - a.guestTiers.length)[0];
      // freeDays counts the whole window from today; nextFree starts at the customer's chosen date
      const days = aheadCalendars(v).flatMap(m => m.calendar).filter(c => c.status === 'available').map(c => c.date);
      return { phone: v.phone, whatsapp: v.whatsapp || v.phone, tiers: main ? main.guestTiers.map(t => ({ ...t, price: priceOn(v, main, date, t.price) })) : [], tierListing: main ? main.name : '', freeDays: days.length, nextFree: days.filter(d => d >= date).slice(0, 6) };
    })() : {};
    const a = availability(v, date);
    return { ...extra, ...distanceTo(v, near), ...lagan, laganDay: isLagan(date),
      id: v.id, type: v.type, subtype: v.subtype || '', name: v.name, nameHi: v.nameHi || '', photo: (v.photos || [])[0] || '', emoji: TYPE[v.type].emoji,
      district: v.district, districtName: d ? d.name : '', state: d ? d.state : '', address: v.address, verified: !!v.verified, sample: !!v.sample,
      startingPrice: prices.length ? Math.min(...prices) : 0, unit: cheapest ? cheapest.unit : '', ...ratingOf(v.id), avail: a,
      // vehicles: every car with how many are free on the date (0 when the vendor is closed / booked that day)
      cars: TYPE[v.type].mode === 'unit' ? own.map(l => ({ id: l.id, name: l.name, nameHi: l.nameHi || '', price: priceOn(v, l, date), normalPrice: l.price, unit: l.unit, units: l.units || 1, left: a.units ? a.units[l.id] || 0 : 0, rcOk: docOk(v, 'rc', l.id), ...carFacts(l) })) : undefined,
      papersOk: papersOk(v), trust: trustOf(v),
      // extra people for hire (orchestra lady dancers / singers, halwai cooks / helpers): how many are free on the date
      extraStaff: own.filter(l => l.staff).map(l => ({ role: l.staff, name: l.name, price: priceOn(v, l, date), unit: l.unit, units: l.units || 1, left: a.units ? a.units[l.id] || 0 : 0 })),
      highlights: own.filter(l => !l.staff).slice(0, 4).map(l => l.name), delivery: v.delivery || null, tags: v.tags || [],
      person: isPerson(v), owner: v.owner, profilePhoto: v.profilePhoto || '', experienceYears: v.experienceYears || 0, languages: v.languages || [], speciality: v.speciality || '', dishCount: dishCount(v), skillCount: skillCount(v), astro: (v.skills || []).some(g => /jyotish|astro|kundli/i.test(g.group)), eduTop: (v.education || [])[0] || '', ...teamSummary(v),
      // shops: every item with its front photo, price for the date and best bulk rate (the card lists them)
      items: TYPE[v.type].mode === 'stock' ? own.map(l => ({ id: l.id, name: l.name, nameHi: l.nameHi || '', item: l.item || l.name.toLowerCase(), brand: l.brand || '', price: priceOn(v, l, date), normalPrice: l.price, unit: l.unit, stock: l.stock,
        photo: l.photo || (l.photos || [])[0] || '', kind: l.kind || '', minQty: l.minQty || 0, bestBulk: (l.bulkTiers || []).slice(-1)[0] || null })) : undefined,
    };
  }
  const publicVendor = v => {
    // never expose login links (dates come via the calendar) or the exact home pin (customers see only the distance)
    // and never vehicle papers or licence / vehicle numbers
    const { userId, blockedDates, bookedDates, lat, lng, docs, dlNo, kyc, consentAt, adultsDeclaredAt, geoSrc, status, ...rest } = v;
    return { ...rest, capacityPerDay: perDay(v), onePerDay: isPerson(v), papersOk: papersOk(v), trust: trustOf(v), districtName: (districtOf(v.district) || {}).name || '', state: (districtOf(v.district) || {}).state || '' };
  };
  // families see verified, active vendors — sample ones only while the admin shows them (Settings → Go-live)
  const visible = v => v.verified && v.active && (!v.sample || D().settings.showSamples !== false);

  // ---------- public routes ----------
  route('GET', '/api/vtypes', (req, res) => {
    // rules: which papers each kind (and sub-kind) gives — the join form and panels draw from this
    send(res, 200, { types: VENDOR_TYPES.map(t => ({ ...t, count: vendors().filter(v => visible(v) && v.type === t.id).length,
      rules: Object.fromEntries((t.subtypes || [['']]).map(([s]) => [s, docRules(t.id, s)])) })), docKinds: DOC_KINDS });
  });

  // Lagan dates: everyone can read; verified Pandit Ji and admins keep the list
  const laganOut = () => {
    const L = laganDb(), from = today();
    return {
      dates: Object.entries(L.dates).filter(([d]) => d >= from).sort(([a], [b]) => a.localeCompare(b)).map(([date, x]) => ({ date, note: x.note || '', by: x.by || '', byName: x.byName || '' })),
      sheets: [...L.sheets].sort((a, b) => b.at.localeCompare(a.at)),
    };
  };
  const laganEditor = ctx => {
    if (ctx.user.role === 'admin') return { id: 'admin', name: 'Vivah Saathi team', admin: true };
    const v = ctx.user.role === 'vendor' && vendors().find(x => x.id === ctx.user.vendorId);
    return v && v.type === 'pandit' && v.verified ? { id: v.id, name: v.owner || v.name } : null;
  };
  route('GET', '/api/lagan', (req, res) => send(res, 200, laganOut()));
  route('PUT', '/api/lagan', (req, res, ctx) => {
    const ed = laganEditor(ctx);
    if (!ed) return fail(res, 403, 'Only verified Pandit Ji and the Vivah Saathi team can change lagan dates');
    const L = laganDb();
    for (const x of (Array.isArray(ctx.body.add) ? ctx.body.add : []).slice(0, 400)) {
      const date = str(x && x.date, 10);
      if (!isDate(date) || date < today()) continue;
      L.dates[date] = { note: str(x.note, 80), by: ed.id, byName: ed.name, at: now() };
    }
    for (const date of (Array.isArray(ctx.body.remove) ? ctx.body.remove : []).slice(0, 400)) {
      const x = L.dates[date];
      // a Pandit Ji can remove the dates he added; the team can remove any
      if (x && (ed.admin || x.by === ed.id)) delete L.dates[date];
    }
    save(); send(res, 200, laganOut());
  }, { auth: true });
  route('POST', '/api/lagan/sheets', (req, res, ctx) => {
    const ed = laganEditor(ctx);
    if (!ed) return fail(res, 403, 'Only verified Pandit Ji and the Vivah Saathi team can upload the lagan sheet');
    const url = str(ctx.body.url, 400);
    if (!/^(https:\/\/|\/uploads\/[\w.-]+$)/.test(url)) return fail(res, 400, 'Upload a photo of the lagan sheet');
    laganDb().sheets.push({ id: uid('lg_'), title: str(ctx.body.title, 80) || 'Lagan sheet', url, by: ed.id, byName: ed.name, at: now() });
    save(); send(res, 201, laganOut());
  }, { auth: true });
  route('DELETE', '/api/lagan/sheets/:id', (req, res, ctx) => {
    const ed = laganEditor(ctx), L = laganDb(), s = L.sheets.find(x => x.id === ctx.params.id);
    if (!ed || !s || (!ed.admin && s.by !== ed.id)) return fail(res, 403, 'You can remove only the sheets you uploaded');
    L.sheets = L.sheets.filter(x => x !== s); save(); send(res, 200, laganOut());
  }, { auth: true });

  route('GET', '/api/vendors', (req, res, { query }) => {
    const date = isDate(query.get('date')) ? query.get('date') : today();
    const type = query.get('type'), sub = query.get('subtype'), dist = query.get('district'), state = query.get('state');
    const q = (query.get('q') || '').toLowerCase().trim();
    const min = num(query.get('min'), 0), max = num(query.get('max') || 0, 0) || Infinity, minRating = num(query.get('rating'), 0);
    const near = nearOf(query);
    let list = vendors().filter(v => visible(v) && (!type || v.type === type) && (!sub || v.subtype === sub));
    if (dist) list = list.filter(v => v.district === dist);
    else if (state) list = list.filter(v => (districtOf(v.district) || {}).state === state);
    if (q) list = list.filter(v => [v.name, v.nameHi, v.owner, v.speciality, (v.languages || []).join(' '), (v.dishes || []).map(g => g.items.join(' ')).join(' '), (v.skills || []).map(g => g.group + ' ' + g.items.join(' ')).join(' '), (v.education || []).join(' '), v.address, v.about, (v.tags || []).join(' '), ...listings().filter(l => l.vendorId === v.id).map(l => l.name + ' ' + (l.nameHi || ''))].join(' ').toLowerCase().includes(q));
    let cards = list.map(v => cardOf(v, date, query.get('ahead') === '1', near)).filter(c => c.startingPrice >= min && c.startingPrice <= max && c.rating >= minRating);
    if (query.get('avail') === '1') cards = cards.filter(c => c.avail.status === 'available');
    const all = cards.length;
    cards = cards.filter(withinKm(query, near));
    const beyond = all - cards.length; // matches farther than the chosen distance
    const sort = query.get('sort');
    const rank = { available: 0, full: 1, closed: 2, past: 3, unknown: 4 };
    if (sort === 'price-asc') cards.sort((a, b) => a.startingPrice - b.startingPrice);
    else if (sort === 'price-desc') cards.sort((a, b) => b.startingPrice - a.startingPrice);
    else if (sort === 'rating') cards.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    else if (sort === 'near') cards.sort(byKm);
    // with a location: free on the date first, then the nearest
    else if (near) cards.sort((a, b) => rank[a.avail.status] - rank[b.avail.status] || byKm(a, b) || b.rating - a.rating);
    else cards.sort((a, b) => rank[a.avail.status] - rank[b.avail.status] || (b.district === dist) - (a.district === dist) || b.rating - a.rating);
    send(res, 200, { date, total: cards.length, beyond, vendors: cards });
  });

  // Every vehicle on its own (Bolero, Scorpio, Innova...) with the vendor / owner it belongs to
  route('GET', '/api/vcars', (req, res, { query }) => {
    const date = isDate(query.get('date')) ? query.get('date') : today();
    const dist = query.get('district'), state = query.get('state'), sub = query.get('subtype');
    const q = (query.get('q') || '').toLowerCase().trim(), seats = num(query.get('seats'), 0), ac = query.get('ac');
    const near = nearOf(query);
    let vs = vendors().filter(v => visible(v) && v.type === 'vehicle' && (!sub || v.subtype === sub));
    if (dist) vs = vs.filter(v => v.district === dist);
    else if (state) vs = vs.filter(v => (districtOf(v.district) || {}).state === state);
    let cars = [];
    for (const v of vs) {
      const a = availability(v, date), d = districtOf(v.district), r = ratingOf(v.id), far = distanceTo(v, near);
      for (const l of listings().filter(x => x.vendorId === v.id && x.active)) {
        const left = a.units ? (a.units[l.id] || 0) : 0;
        cars.push({
          listingId: l.id, kind: carKind(l), name: l.name, nameHi: l.nameHi || '', specs: l.specs || '', price: priceOn(v, l, date), normalPrice: l.price, lagan: isLagan(date) && priceOn(v, l, date) !== l.price, unit: l.unit, units: l.units || 1, photo: l.photo || (v.photos || [])[0] || '',
          ...carFacts(l), left, papersOk: carPapersOk(v, l), trust: trustOf(v), rcOk: docOk(v, 'rc', l.id), photos: (l.photos || []).slice(0, 10), status: a.status === 'available' ? (left > 0 ? 'available' : 'full') : a.status,
          vendorId: v.id, vendorName: v.name, vendorNameHi: v.nameHi || '', owner: v.owner, subtype: v.subtype || '', person: isPerson(v), profilePhoto: v.profilePhoto || '',
          experienceYears: v.experienceYears || 0, languages: v.languages || [],
          districtName: d ? d.name : '', state: d ? d.state : '', verified: !!v.verified, sample: !!v.sample, rating: r.rating, reviews: r.reviews, ...far,
        });
      }
    }
    if (q) cars = cars.filter(c => [c.name, c.nameHi, c.specs, c.vendorName, c.owner, c.districtName, KIND_WORDS[c.kind]].join(' ').toLowerCase().includes(q));
    if (seats) cars = cars.filter(c => c.seats >= seats);
    if (ac === '1') cars = cars.filter(c => c.ac === true); else if (ac === '0') cars = cars.filter(c => c.ac === false);
    if (query.get('avail') === '1') cars = cars.filter(c => c.status === 'available');
    const all = cars.length;
    cars = cars.filter(withinKm(query, near));
    const beyond = all - cars.length;
    // how many of each kind match the other filters (the kind chips), then the chosen kind
    const kinds = CAR_KINDS.map(([id]) => ({ id, count: cars.filter(c => c.kind === id).length }));
    if (query.get('kind')) cars = cars.filter(c => c.kind === query.get('kind'));
    const sort = query.get('sort'), rank = { available: 0, full: 1, closed: 2, past: 3, unknown: 4 };
    if (sort === 'price-asc') cars.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') cars.sort((a, b) => b.price - a.price);
    else if (sort === 'near') cars.sort((a, b) => byKm(a, b) || a.price - b.price);
    else if (near) cars.sort((a, b) => rank[a.status] - rank[b.status] || byKm(a, b) || b.rating - a.rating);
    else cars.sort((a, b) => rank[a.status] - rank[b.status] || b.rating - a.rating || a.price - b.price);
    send(res, 200, { date, total: cars.length, beyond, kinds, cars });
  });

  // ---------- Tent Booking: every rental component (tent, chairs, lights, DJ, flowers...) on its own ----------
  route('GET', '/api/tent/items', (req, res, { query }) => {
    const date = isDate(query.get('date')) ? query.get('date') : today();
    const dist = query.get('district'), state = query.get('state'), cat = query.get('category'), vid = query.get('vendor');
    const q = (query.get('q') || '').toLowerCase().trim(), min = num(query.get('min'), 0), max = num(query.get('max') || 0, 0) || Infinity;
    const near = nearOf(query);
    let vs = vendors().filter(v => visible(v) && RENTAL_TYPES.includes(v.type));
    if (dist) vs = vs.filter(v => v.district === dist);
    else if (state) vs = vs.filter(v => (districtOf(v.district) || {}).state === state);
    const all = [];
    for (const v of vs) {
      const a = availability(v, date), d = districtOf(v.district), r = ratingOf(v.id), far = distanceTo(v, near);
      for (const l of listings().filter(x => x.vendorId === v.id && x.active && x.rental)) {
        const left = a.units ? a.units[l.id] || 0 : 0, price = priceOn(v, l, date);
        all.push({
          listingId: l.id, name: l.name, nameHi: l.nameHi || '', category: TENT_CAT_IDS.includes(l.category) ? l.category : 'other', size: l.size || '', features: l.features || [], specs: l.specs || '',
          unit: l.unit, price, normalPrice: l.price, lagan: price !== l.price, units: l.units || 1, left, minQty: l.minQty || 0,
          // closed day / marked booked by the vendor / nothing left: not bookable on this date
          status: ['past', 'closed', 'unknown'].includes(a.status) ? a.status : a.offline ? 'full' : left > 0 ? 'available' : 'full',
          photo: l.photo || (l.photos || [])[0] || '', photos: (l.photos && l.photos.length ? l.photos : [l.photo]).filter(Boolean).slice(0, 10),
          vendorId: v.id, vendorName: v.name, vendorNameHi: v.nameHi || '', vendorType: v.type, district: v.district, districtName: d ? d.name : '', verified: !!v.verified, sample: !!v.sample,
          rating: r.rating, reviews: r.reviews, delivery: v.delivery || { available: false, charge: 0, freeAbove: 0 }, ...far,
        });
      }
    }
    // vendor filter choices come from every component in the area
    const vendorList = [...new Map(all.map(x => [x.vendorId, { id: x.vendorId, name: x.vendorName, nameHi: x.vendorNameHi, items: all.filter(y => y.vendorId === x.vendorId).length }])).values()];
    let list = all.filter(x => (!vid || x.vendorId === vid) && x.price >= min && x.price <= max
      && (!q || [x.name, x.nameHi, x.size, x.specs, x.features.join(' '), x.vendorName, x.districtName, (TENT_CATS.find(c => c.id === x.category) || {}).name].join(' ').toLowerCase().includes(q)));
    if (query.get('avail') === '1') list = list.filter(x => x.status === 'available');
    const inArea = list.length;
    list = list.filter(withinKm(query, near));
    const beyond = inArea - list.length;
    const counts = Object.fromEntries(TENT_CATS.map(c => [c.id, list.filter(x => x.category === c.id).length]));
    const totalAll = list.length;
    if (cat) list = list.filter(x => x.category === cat);
    const sort = query.get('sort'), rank = { available: 0, full: 1, closed: 2, past: 3, unknown: 4 }, catRank = x => TENT_CAT_IDS.indexOf(x.category);
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'left') list.sort((a, b) => b.left - a.left);
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating || a.price - b.price);
    else if (sort === 'near') list.sort((a, b) => byKm(a, b) || a.price - b.price);
    else list.sort((a, b) => rank[a.status] - rank[b.status] || catRank(a) - catRank(b) || (near ? byKm(a, b) : 0) || a.price - b.price);
    send(res, 200, { date, lagan: isLagan(date), total: list.length, totalAll, beyond, categories: TENT_CATS.map(c => ({ ...c, count: counts[c.id] })), vendors: vendorList, items: list });
  });
  // Review & Create Final Order: every vendor-cart group checked again right now — price on the date, pieces left,
  // closed / booked dates — with the vendor's delivery charge. Nothing is booked here.
  route('POST', '/api/tent/check', (req, res, { body }) => {
    const groups = (Array.isArray(body.groups) ? body.groups : []).slice(0, 30).map(g => {
      const date = str(g && g.date, 10), items = (Array.isArray(g && g.items) ? g.items : []).slice(0, 50);
      const v = vendors().find(x => x.id === str(g && g.vendorId, 40) && visible(x));
      if (!v) return { vendorId: str(g && g.vendorId, 40), date, ok: false, error: 'This vendor is no longer listed', lines: [], subtotal: 0, deliveryCharge: 0, total: 0 };
      const a = availability(v, date);
      const chk = isDate(date) ? checkBooking(v, date, items, undefined, g.event) : { error: `Select the booking date for ${v.name}` };
      const lines = items.map((it, i) => {
        const l = listings().find(x => x.id === (it && it.listingId) && x.vendorId === v.id && x.active);
        if (!l) return { listingId: it && it.listingId, ok: false, left: 0, error: 'No longer listed' };
        const qty = Math.max(1, Math.round(num(it.qty, 1))), left = l.rental ? (a.units ? a.units[l.id] || 0 : 0) : null;
        const price = chk.items ? chk.items[i].price : priceOn(v, l, date);
        return { listingId: l.id, name: l.name, unit: l.unit, rental: !!l.rental, qty, price, left, ok: (!l.rental || qty <= left) && !['closed', 'past'].includes(a.status) && !a.offline };
      });
      const del = chk.items ? deliveryFor(v, chk.items, g.delivery) : { subtotal: lines.reduce((s, x) => s + (x.price || 0) * (x.qty || 0), 0), deliveryCharge: 0, canDeliver: false };
      const d = districtOf(v.district);
      return {
        vendorId: v.id, date, status: a.status, ok: !chk.error && lines.every(x => x.ok), error: chk.error || '', lines,
        subtotal: del.subtotal, deliveryCharge: del.deliveryCharge, delivers: del.canDeliver, total: del.subtotal + del.deliveryCharge, lagan: isLagan(date),
        vendor: { id: v.id, name: v.name, nameHi: v.nameHi || '', phone: v.phone, districtName: d ? d.name : '', address: v.address, verified: !!v.verified, sample: !!v.sample, delivery: v.delivery || null },
      };
    });
    send(res, 200, { ok: groups.length > 0 && groups.every(g => g.ok), total: groups.reduce((s, g) => s + g.total, 0), groups });
  });

  // ---------- Wedding ration & ingredients: compare one item across shops; quotations for a whole list ----------
  const RATION_TYPES = ['ration', 'vegetable'];
  const rationShops = q => {
    let vs = vendors().filter(v => visible(v) && RATION_TYPES.includes(v.type));
    const dist = q.get('district'), state = q.get('state');
    if (dist) vs = vs.filter(v => v.district === dist); else if (state) vs = vs.filter(v => (districtOf(v.district) || {}).state === state);
    return vs;
  };
  const round2 = x => Math.round(x * 100) / 100;
  // what the cart needs to work the price out again for another quantity (same rule as checkBooking)
  const ruleFor = (v, l, date) => ({ n: l.price, b: l.bulkTiers || [], lg: isLagan(date), pct: v.laganPct || 0, lp: l.laganPrice || 0, add: 0 });
  function offerOf(v, l, date, near) {
    const d = districtOf(v.district), r = ratingOf(v.id), ps = packSize(l), price = priceOn(v, l, date);
    return {
      listingId: l.id, vendorId: v.id, vendorName: v.name, vendorNameHi: v.nameHi || '', vendorType: v.type, districtName: d ? d.name : '', sample: !!v.sample, verified: !!v.verified,
      rating: r.rating, reviews: r.reviews, trust: trustOf(v), ...distanceTo(v, near), avail: availability(v, date).status,
      delivery: v.delivery || { available: false, charge: 0, freeAbove: 0 },
      item: l.item, name: l.name, nameHi: l.nameHi || '', brand: l.brand || '', quality: l.quality || '', photo: l.photo || (l.photos || [])[0] || '',
      unit: l.unit, packSize: ps, price, normalPrice: l.price, perBase: round2(price / ps), bulkTiers: l.bulkTiers || [], minQty: l.minQty || 0, stock: l.stock || 0,
      rule: ruleFor(v, l, date),
    };
  }
  route('GET', '/api/ingredients', (req, res) => send(res, 200, { ingredients: INGREDIENTS, groups: GROUPS, qualities: QUALITIES }));
  // one ingredient across every shop (cheapest per kg / litre first), or an overview of all ingredients
  route('GET', '/api/ration/compare', (req, res, { query }) => {
    const date = isDate(query.get('date')) ? query.get('date') : today(), near = nearOf(query), item = query.get('item');
    const shops = rationShops(query);
    const offersFor = key => shops.flatMap(v => listings().filter(l => l.vendorId === v.id && l.active && l.item === key).map(l => offerOf(v, l, date, near)));
    if (!item) {
      // overview: every catalog ingredient with how many shops sell it and the price range per kg / litre
      return send(res, 200, { date, groups: GROUPS, qualities: QUALITIES, ingredients: INGREDIENTS.map(i => {
        const os = offersFor(i.key).filter(o => o.stock > 0 && o.avail !== 'closed');
        return { ...i, offers: os.length, minPerBase: os.length ? Math.min(...os.map(o => o.perBase)) : null, maxPerBase: os.length ? Math.max(...os.map(o => o.perBase)) : null };
      }) });
    }
    if (!ING[item]) return fail(res, 404, 'Unknown ingredient');
    const quality = query.get('quality'), delivery = query.get('delivery');
    let offers = offersFor(item).filter(withinKm(query, near));
    if (quality) offers = offers.filter(o => o.quality === quality);
    if (query.get('inStock') === '1') offers = offers.filter(o => o.stock > 0 && o.avail !== 'closed');
    if (delivery === 'available') offers = offers.filter(o => o.delivery.available);
    if (delivery === 'free') offers = offers.filter(o => o.delivery.available && !o.delivery.charge);
    // every company this ingredient comes in (with the other filters), cheapest per kg / litre — then the chosen one
    const bmap = new Map();
    for (const o of offers) { const k = o.brand || 'No brand / loose', b = bmap.get(k) || { name: k, n: 0, minPerBase: Infinity }; b.n++; b.minPerBase = Math.min(b.minPerBase, o.perBase); bmap.set(k, b); }
    const brands = [...bmap.values()].sort((a, b) => a.minPerBase - b.minPerBase);
    if (query.get('brand')) offers = offers.filter(o => (o.brand || 'No brand / loose') === query.get('brand'));
    const sort = query.get('sort');
    offers.sort(sort === 'near' ? byKm : sort === 'rating' ? (a, b) => b.rating - a.rating || a.perBase - b.perBase : sort === 'price-desc' ? (a, b) => b.perBase - a.perBase : (a, b) => a.perBase - b.perBase || byKm(a, b));
    send(res, 200, { date, ingredient: ING[item], qualities: QUALITIES, brands, total: offers.length, offers });
  });
  // Quotation for a whole ingredient list from every shop: cheapest matching item per ingredient, bulk rates for the
  // quantity, minimum order, stock and delivery charge; plus the cheapest mix across shops
  route('POST', '/api/ration/quote', (req, res, { body }) => {
    const date = isDate(body.date) && body.date >= today() ? body.date : today();
    const q = new URLSearchParams(Object.entries({ district: body.district, state: body.state, lat: body.lat, lng: body.lng, pin: body.pin, km: body.km }).filter(([, x]) => x != null && x !== '').map(([k, x]) => [k, String(x)]));
    const near = nearOf(q);
    const want = (Array.isArray(body.items) ? body.items : []).slice(0, 60).map(x => ({ key: str(x && x.key, 40), qty: Math.min(100000, Math.max(0, num(x && x.qty))) })).filter(x => ING[x.key] && x.qty > 0);
    if (!want.length) return fail(res, 400, 'Add at least one ingredient with a quantity');
    // the cheapest way one shop can supply `qty` kg / litres of an ingredient
    const bestLine = (v, key, qty) => {
      let best = null;
      for (const l of listings().filter(x => x.vendorId === v.id && x.active && x.item === key && (x.stock || 0) > 0)) {
        const ps = packSize(l), units = Math.max(Math.ceil(round2(qty / ps)), l.minQty || 1);
        const bulk = bulkPrice(l, units), unit = priceOn(v, l, date, bulk), cost = unit * units;
        if (!best || cost < best.cost) best = { key, listingId: l.id, name: l.name, nameHi: l.nameHi || '', brand: l.brand || '', quality: l.quality || '', photo: l.photo || (l.photos || [])[0] || '',
          unit: l.unit, packSize: ps, units, unitPrice: unit, cost, bulk: !!bulk, short: units > (l.stock || 0), stock: l.stock || 0, minQty: l.minQty || 0, rule: ruleFor(v, l, date) };
      }
      return best;
    };
    const deliveryFee = (v, sub) => (v.delivery && v.delivery.available ? (v.delivery.freeAbove && sub >= v.delivery.freeAbove ? 0 : v.delivery.charge || 0) : null);
    const shopInfo = v => { const d = districtOf(v.district), r = ratingOf(v.id); return { vendorId: v.id, vendorName: v.name, vendorType: v.type, districtName: d ? d.name : '', sample: !!v.sample, rating: r.rating, reviews: r.reviews, ...distanceTo(v, near), delivery: v.delivery || null }; };
    const shops = rationShops(q).filter(v => availability(v, date).status !== 'closed').filter(v => withinKm(q, near)(distanceTo(v, near)));
    const quotes = [];
    for (const v of shops) {
      const lines = want.map(w => bestLine(v, w.key, w.qty)).filter(Boolean);
      if (!lines.length) continue;
      const subtotal = lines.reduce((s, x) => s + x.cost, 0), del = deliveryFee(v, subtotal);
      quotes.push({ ...shopInfo(v), lines, missing: want.filter(w => !lines.some(x => x.key === w.key)).map(w => w.key), subtotal, deliveryCharge: del, total: subtotal + (del || 0) });
    }
    quotes.sort((a, b) => a.missing.length - b.missing.length || a.total - b.total);
    // cheapest mix: each ingredient from whichever shop is cheapest for it (delivery charged per shop)
    const mix = new Map();
    for (const w of want) {
      let pick = null;
      for (const v of shops) { const x = bestLine(v, w.key, w.qty); if (x && !x.short && (!pick || x.cost < pick.line.cost)) pick = { v, line: x }; }
      if (pick) { if (!mix.has(pick.v.id)) mix.set(pick.v.id, { ...shopInfo(pick.v), v: pick.v, lines: [] }); mix.get(pick.v.id).lines.push(pick.line); }
    }
    const mixShops = [...mix.values()].map(({ v, ...s }) => { const subtotal = s.lines.reduce((t, x) => t + x.cost, 0), del = deliveryFee(v, subtotal); return { ...s, subtotal, deliveryCharge: del, total: subtotal + (del || 0) }; });
    const bestMix = mixShops.length ? { shops: mixShops, total: mixShops.reduce((t, s) => t + s.total, 0), missing: want.filter(w => !mixShops.some(s => s.lines.some(x => x.key === w.key))).map(w => w.key) } : null;
    send(res, 200, { date, lagan: isLagan(date), items: want.length, quotes: quotes.slice(0, 20), bestMix });
  });

  // Wedding card design gallery: every design from every card printer, with filters; cheapest first
  route('GET', '/api/card-designs', (req, res, { query }) => {
    const near = nearOf(query), dist = query.get('district'), state = query.get('state');
    const q = (query.get('q') || '').toLowerCase().trim(), ctype = query.get('cardType'), paper = (query.get('paper') || '').toLowerCase(), print = query.get('printing');
    const max = num(query.get('max'), 0) || Infinity, qty = Math.max(0, Math.round(num(query.get('qty'), 0)));
    let vs = vendors().filter(v => visible(v) && v.type === 'cards');
    if (dist) vs = vs.filter(v => v.district === dist); else if (state) vs = vs.filter(v => (districtOf(v.district) || {}).state === state);
    const all = [];
    for (const v of vs) {
      const d = districtOf(v.district), r = ratingOf(v.id), far = distanceTo(v, near);
      for (const l of listings().filter(x => x.vendorId === v.id && x.active && x.kind === 'card')) {
        // price per card for the quantity asked (or the MOQ), so designs compare fairly
        const forQty = Math.max(qty, l.minQty || 1);
        all.push({
          id: l.id, vendorId: v.id, vendorName: v.name, districtName: d ? d.name : '', sample: !!v.sample, rating: r.rating, reviews: r.reviews, ...far,
          name: l.name, nameHi: l.nameHi || '', design: l.design || '', cardType: l.cardType || '', paper: l.paper || '', printing: l.printing || [],
          minQty: l.minQty || 1, price: l.price, priceForQty: bulkPrice(l, forQty) ?? l.price, forQty, bulkTiers: l.bulkTiers || [], addons: l.addons || [], leadDays: l.leadDays || 0,
          photos: l.photos && l.photos.length ? l.photos : [l.photo].filter(Boolean), cardViews: l.cardViews || null, inStock: (l.stock || 0) >= (l.minQty || 1),
        });
      }
    }
    // filter choices come from all designs, before filtering
    const facets = { cardTypes: [...new Set(all.map(x => x.cardType).filter(Boolean))], papers: [...new Set(all.map(x => x.paper).filter(Boolean))], printing: [...new Set(all.flatMap(x => x.printing))] };
    let list = all.filter(x => (!ctype || x.cardType === ctype) && (!paper || x.paper.toLowerCase().includes(paper)) && (!print || x.printing.includes(print)) && x.priceForQty <= max
      && (!q || [x.name, x.nameHi, x.design, x.cardType, x.paper, x.vendorName, x.printing.join(' ')].join(' ').toLowerCase().includes(q)));
    const sort = query.get('sort');
    list.sort(sort === 'price-desc' ? (a, b) => b.priceForQty - a.priceForQty : sort === 'moq' ? (a, b) => a.minQty - b.minQty || a.priceForQty - b.priceForQty : sort === 'near' ? byKm : (a, b) => a.priceForQty - b.priceForQty);
    send(res, 200, { total: list.length, designs: list, facets, cardTypes: CARD_TYPES, printingOptions: PRINTING });
  });

  // Site visit before booking: a tent house / decorator comes to the venue to measure the ground and see the exact
  // place, then the family books the right size. Free, no booking slot taken; the vendor confirms by phone.
  const visitHits = new Map();
  route('POST', '/api/vvisits', (req, res, { body }) => {
    const v = vendors().find(x => x.id === body.vendorId && visible(x));
    if (!v || !VISIT_TYPES.includes(v.type)) return fail(res, 400, 'Site visits are for tent houses and decorators');
    const ip = req.socket.remoteAddress || '', t = Date.now(), hits = (visitHits.get(ip) || []).filter(x => t - x < 3600e3);
    hits.push(t); visitHits.set(ip, hits);
    if (hits.length > 8) return fail(res, 429, 'Too many requests — please call the vendor directly');
    const date = str(body.date, 10);
    if (!isDate(date) || date < today() || date > addDays(today(), 150)) return fail(res, 400, 'Choose a visit date from today up to 5 months ahead');
    const slot = ['morning', 'afternoon', 'evening'].includes(body.slot) ? body.slot : 'morning';
    const c = cleanCustomer(body.customer || {}); if (c.error) return fail(res, 400, c.error);
    const sv = { id: uid('sv_'), number: 'SV' + (1001 + vvisits().length), vendorId: v.id, vendorName: v.name, date, slot, customer: { ...c.customer, landmark: str((body.customer || {}).landmark, 120) },
      area: str(body.area, 80), guests: Math.max(0, Math.min(10000, Math.round(num(body.guests)))), functionDate: isDate(body.functionDate) ? body.functionDate : '', note: str(body.note, 300),
      status: 'requested', history: [{ status: 'requested', at: now(), note: '' }], createdAt: now() };
    vvisits().push(sv); save();
    send(res, 201, { visit: { number: sv.number, date, slot, vendorName: v.name, phone: v.phone, whatsapp: v.whatsapp || v.phone } });
  });

  // Vendors' own items for a shop category page ("From local vendors"): the customer's district first, then their
  // state, real vendors before samples; each links to the vendor's profile at that item
  route('GET', '/api/vitems', (req, res, { query }) => {
    const types = String(query.get('types') || '').split(',').filter(t => TYPE[t]);
    if (!types.length) return send(res, 200, { items: [] });
    const dist = query.get('district') || '', st = (districtOf(dist) || {}).state || query.get('state') || '';
    const items = [];
    for (const v of vendors().filter(x => visible(x) && types.includes(x.type))) {
      const d = districtOf(v.district) || {};
      for (const l of listings().filter(x => x.vendorId === v.id && x.active && !x.staff && (x.photo || (x.photos || []).length))) {
        const from = (l.styles || []).length ? Math.min(...l.styles.map(s => s.price)) : hasTiers(l) ? l.guestTiers[0].price : l.price;
        items.push({ listingId: l.id, vendorId: v.id, vendorName: v.name, vendorType: v.type, districtName: d.name || '', name: l.name, nameHi: l.nameHi || '', photo: l.photo || l.photos[0], price: from,
          unit: l.unit, styles: (l.styles || []).length, sample: !!v.sample, category: l.rental ? l.category || 'other' : '', rank: (v.district === dist ? 0 : d.state === st ? 1 : 2) * 2 + (v.sample ? 1 : 0) });
      }
    }
    items.sort((a, b) => a.rank - b.rank || a.price - b.price);
    send(res, 200, { items: items.slice(0, Math.min(24, num(query.get('limit'), 12))).map(({ rank, ...x }) => x) });
  });

  // Search suggestions from the first letter: kinds of service, vendors and their items (one row per item name, with
  // how many vendors have it and the lowest price). `types` limits it to some vendor types (a section's own search box).
  const TYPE_WORDS = { vehicle: 'car gaadi bus baggi ghodi horse jeep', catering: 'halwai cook khana bhoj catering', pandit: 'priest pujari puja shastri', studio: 'photographer photo video camera shoot',
    dj: 'dj sound music', band: 'baja band', tent: 'shamiyana pandal tent', decoration: 'decor phool flower mandap', mehndi: 'mehendi henna', makeup: 'parlour beautician bridal', orchestra: 'arkestra dancer singer naach',
    venue: 'hall lawn marriage garden', sweets: 'mithai sweets', cards: 'invitation card kard', wear: 'sherwani lehenga kapda', puja: 'samagri', gifts: 'gift', ration: 'kirana rashan', vegetable: 'sabji' };
  route('GET', '/api/suggest', (req, res, { query }) => {
    const q = str(query.get('q'), 40).toLowerCase().trim(), only = String(query.get('types') || '').split(',').filter(t => TYPE[t]);
    if (!q) return send(res, 200, { types: [], vendors: [], items: [] });
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), word = new RegExp(`(^|[\\s(/,.+&-])${esc}`, 'i');
    // 3 = starts with it, 2 = a word starts with it, 1 = somewhere inside (only from 2 letters); 0 = no match
    const score = hay => { const s = String(hay || '').toLowerCase(); return s.startsWith(q) ? 3 : word.test(s) ? 2 : q.length > 1 && s.includes(q) ? 1 : 0; };
    const st = (districtOf(query.get('district')) || {}).state || '';
    const vs = vendors().filter(v => visible(v) && (!only.length || only.includes(v.type)));
    const types = (only.length ? [] : Object.values(TYPE)).map(t => ({ id: t.id, name: t.name, hi: t.hi || '', emoji: t.emoji, s: Math.max(score(t.name), score(t.hi), q.length > 1 ? score(TYPE_WORDS[t.id]) : 0), count: vs.filter(v => v.type === t.id).length }))
      .filter(t => t.s && t.count).sort((a, b) => b.s - a.s).slice(0, 3).map(({ s, ...t }) => t);
    const near = v => ((districtOf(v.district) || {}).state === st ? 1 : 0);
    const vendorsOut = vs.map(v => ({ v, s: Math.max(score(v.name), score(v.nameHi), score(v.owner)) })).filter(x => x.s)
      .sort((a, b) => b.s - a.s || near(b.v) - near(a.v) || !!a.v.sample - !!b.v.sample).slice(0, 4)
      .map(({ v }) => ({ id: v.id, name: v.name, nameHi: v.nameHi || '', type: v.type, typeName: TYPE[v.type].name, photo: v.profilePhoto || (v.photos || [])[0] || '', districtName: (districtOf(v.district) || {}).name || '', sample: !!v.sample }));
    const byName = new Map();
    for (const v of vs) for (const l of listings().filter(x => x.vendorId === v.id && x.active && !x.staff)) {
      // kind words ("horse" → ghodi, baggi) only from 3 letters, so "s" does not bring every car through "suv"
      const s = Math.max(score(l.name), score(l.nameHi), v.type === 'vehicle' && q.length > 2 ? score(KIND_WORDS[carKind(l)]) : 0); if (!s) continue;
      const key = l.name.toLowerCase(), price = (l.styles || []).length ? Math.min(...l.styles.map(x => x.price)) : hasTiers(l) ? l.guestTiers[0].price : l.price;
      const it = byName.get(key) || { name: l.name, nameHi: l.nameHi || '', type: v.type, typeName: TYPE[v.type].name, s, vendors: new Set(), vendorId: v.id, listingId: l.id, vendorName: v.name, price, unit: l.unit, photo: l.photo || (l.photos || [])[0] || '', near: 0 };
      it.vendors.add(v.id); it.near = Math.max(it.near, near(v));
      if (price < it.price) Object.assign(it, { price, vendorId: v.id, listingId: l.id, vendorName: v.name });
      byName.set(key, it);
    }
    const items = [...byName.values()].sort((a, b) => b.s - a.s || b.near - a.near || b.vendors.size - a.vendors.size || a.price - b.price).slice(0, 6)
      .map(({ vendors: set, s, near: n, ...x }) => ({ ...x, count: set.size }));
    send(res, 200, { types, vendors: vendorsOut, items });
  });

  route('GET', '/api/vendors/:id', (req, res, { params, query }) => {
    const v = vendors().find(x => x.id === params.id && visible(x));
    if (!v) return fail(res, 404, 'Vendor not found');
    const date = isDate(query.get('date')) ? query.get('date') : today();
    const month = /^\d{4}-\d{2}$/.test(query.get('month') || '') ? query.get('month') : date.slice(0, 7);
    const a = availability(v, date);
    send(res, 200, {
      vendor: { ...publicVendor(v), person: isPerson(v), ...teamSummary(v), ...distanceTo(v, nearOf(query)) }, mode: TYPE[v.type].mode, type: TYPE[v.type], ...ratingOf(v.id), date, avail: a, calendar: calendar(v, month), month,
      ahead: query.get('ahead') === '1' ? aheadCalendars(v) : undefined,
      lagan: isLagan(date), laganPct: v.laganPct || 0,
      // datePrice / dateTiers: what the customer pays on the chosen date (lagan days may cost more)
      listings: listings().filter(l => l.vendorId === v.id && l.active).map(({ regNo, ...l }) => ({ ...l, left: a.units ? a.units[l.id] : undefined,
        datePrice: priceOn(v, l, date), dateTiers: hasTiers(l) ? l.guestTiers.map(t => ({ ...t, price: priceOn(v, l, date, t.price) })) : undefined,
        dateStyles: (l.styles || []).length ? l.styles.map(s => ({ ...s, price: priceOn(v, l, date, s.price) })) : undefined, ...(TYPE[v.type].mode === 'unit' ? { rcOk: docOk(v, 'rc', l.id) } : {}) })),
      reviewList: vreviews().filter(r => r.vendorId === v.id && r.status === 'published').sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 30)
        .map(({ bookingId, ...r }) => r),
    });
  });

  // Booking: re-checks every rule on the server so two customers can never take the same slot
  function checkBooking(v, date, rawItems, exceptId, rawEvent) {
    const mode = TYPE[v.type].mode;
    const a = availability(v, date);
    if (a.status === 'past') return { error: 'Please choose a date from today onwards' };
    if (a.status === 'closed') return { error: `${v.name} is not available on ${date}` };
    if (a.offline) return { error: `${v.name} is already booked on ${date}. Please choose another date or vendor.`, status: 409 };
    // rental pieces only: the day's package slots do not matter, each piece's stock is checked below
    const rentalCart = mode === 'event' && (Array.isArray(rawItems) ? rawItems : []).length > 0 && rawItems.every(it => listings().some(x => x.id === (it && it.listingId) && x.vendorId === v.id && x.rental));
    if (mode === 'event' && a.status === 'full' && !rentalCart) return { error: `${v.name} is already fully booked on ${date}. Please choose another date or vendor.`, status: 409 };
    const items = [], taken = {};
    // event-mode bookings are for one function (Tilak, Haldi, Shaadi...); older carts send none, so it is taken from the items
    let event = mode === 'event' && EVENTS.includes(rawEvent) ? rawEvent : '';
    for (const it of (Array.isArray(rawItems) ? rawItems : []).slice(0, 50)) {
      const l = listings().find(x => x.id === it.listingId && x.vendorId === v.id && x.active);
      const qty = Math.max(1, Math.min(100000, Math.round(num(it.qty, 1))));
      if (!l) return { error: 'Some selected item is no longer available' };
      const covers = mode === 'event' && !l.rental ? l.covers || [] : [], only = mode === 'event' && !l.rental ? l.events || [] : [];
      const planned = !covers.length && PLAN_TYPES.includes(v.type) && ['day', 'addon'].includes(l.shoot);
      if (!event) event = covers.length ? coverMain(l, '') || covers[covers.length - 1] : only[0] || '';
      if (only.length && !covers.length && !planned && !only.includes(event)) return { error: `"${l.name}" is for ${only.join(' / ')} only. Please choose the right puja / service for ${event}.` };
      // full ceremony: one item, a date for every rasam it covers; the main rasam (shaadi, else the chosen function) is on the booking date
      let dates;
      if (covers.length) {
        const main = coverMain(l, event) || (!rawEvent ? covers[covers.length - 1] : '');
        if (!main) return { error: `"${l.name}" is for ${covers.join(' / ')} only. Please choose the right puja / service for ${event}.` };
        const given = Object.fromEntries((Array.isArray(it.dates) ? it.dates : []).slice(0, 12).map(x => [x && x.event, str(x && x.date, 10)]));
        given[main] = date;
        dates = covers.filter(e => isDate(given[e])).map(e => ({ event: e, date: given[e] }));
        if (covers.includes(SHAADI) && !given[SHAADI]) return { error: `Enter the Shaadi (lagan) date for "${l.name}"` };
        if (!dates.length) return { error: `Select at least one rasam date for "${l.name}"` };
        for (const x of dates) {
          if (x.date < today()) return { error: `${x.event} date for "${l.name}" is in the past` };
          if (x.date === date) continue;
          // every extra rasam date must be free too (same per-day limit, closed days and offline bookings)
          const ax = availability(v, x.date);
          if (ax.status !== 'available') return { error: `${v.name} is ${ax.status === 'closed' ? 'not available' : 'already fully booked'} on ${x.date} (${x.event}). Please choose another date for ${x.event}.`, status: ax.status === 'closed' ? 400 : 409 };
        }
      }
      // studio shoot plan: a coverage / add-on line is for one function on its own date (the booking's if none given),
      // priced for that date, and that date must be free too — the booking then holds every one of its dates
      let pd = date;
      if (planned) {
        const x = (Array.isArray(it.dates) ? it.dates : [])[0] || {};
        const on = { event: EVENTS.includes(x.event) ? x.event : event, date: isDate(str(x.date, 10)) ? str(x.date, 10) : date };
        if (!on.event) return { error: `Choose the function for "${l.name}"` };
        if (only.length && !only.includes(on.event)) return { error: `"${l.name}" is for ${only.join(' / ')} only` };
        if (on.date < today()) return { error: `${on.event} date for "${l.name}" is in the past` };
        if (on.date !== date) {
          const ax = availability(v, on.date);
          if (ax.status !== 'available') return { error: `${v.name} is ${ax.status === 'closed' ? 'not available' : 'already fully booked'} on ${on.date} (${on.event}). Please choose another date for ${on.event}.`, status: ax.status === 'closed' ? 400 : 409 };
        }
        dates = [on]; pd = on.date;
      }
      const extra = dates ? { dates } : {};
      if (mode === 'unit' && unitsBooked(l.id, date, exceptId) + qty > (l.units || 1)) return { error: `"${l.name}" is already booked on ${date}`, status: 409 };
      // the same item can be in the order twice (e.g. one card design with and without envelopes)
      taken[l.id] = (taken[l.id] || 0) + qty;
      if (mode === 'stock' && taken[l.id] > (l.stock || 0)) return { error: `Only ${l.stock || 0} ${l.unit} of "${l.name}" left`, status: 409 };
      if (l.minQty && qty < l.minQty) return { error: `Minimum order for "${l.name}" is ${l.minQty} ${l.minQty > 1 && ['card', 'box', 'piece'].includes(l.unit) ? (l.unit === 'box' ? 'boxes' : l.unit + 's') : l.unit}` };
      if (l.leadDays && date < addDays(today(), l.leadDays)) return { error: `"${l.name}" takes ${l.leadDays} days to make. Choose ${addDays(today(), l.leadDays)} or later.` };
      if (mode === 'stock') {
        // bulk rate for this quantity, then lagan-day price; card add-ons are added per card
        const bulk = bulkPrice(l, qty), base = priceOn(v, l, date, bulk);
        const addons = l.kind === 'card' ? [...new Set(Array.isArray(it.addons) ? it.addons : [])].map(n => (l.addons || []).find(a => a.name === n)).filter(Boolean) : [];
        const price = base + addons.reduce((s, a) => s + a.price, 0);
        items.push({
          // the company is part of the line, so the shop packs the right brand
          listingId: l.id, name: `${l.name}${l.brand ? ` · ${l.brand}` : ''}${addons.length ? ` + ${addons.map(a => a.name).join(', ')}` : ''}`, nameHi: l.nameHi || '', unit: l.unit, price, qty, ...(l.brand ? { brand: l.brand } : {}),
          ...(bulk ? { bulk: true, normalPrice: l.price } : {}), ...(base !== (bulk ?? l.price) ? { lagan: true, normalPrice: l.price } : {}), ...(addons.length ? { addons: addons.map(a => a.name) } : {}),
        });
        continue;
      }
      if (l.rental) {
        // rental pieces: never more than are left on this date (every other booking of the same date counts) — no double booking
        const left = Math.max(0, (l.units || 1) - unitsBooked(l.id, date, exceptId));
        if (taken[l.id] > left) return { error: left ? `Only ${left} ${l.unit} of "${l.name}" left with ${v.name} on ${date}` : `"${l.name}" is fully booked with ${v.name} on ${date}. Please choose another date or vendor.`, status: 409 };
        const p = priceOn(v, l, date);
        items.push({ listingId: l.id, name: l.name, nameHi: l.nameHi || '', unit: l.unit, price: p, qty, rental: true, category: l.category || 'other', ...(l.size ? { size: l.size } : {}), ...(p !== l.price ? { lagan: true, normalPrice: l.price } : {}) });
        continue;
      }
      if (l.staff) {
        // extra cooks / helpers: never more people than the vendor has free on this date
        const left = Math.max(0, (l.units || 1) - unitsBooked(l.id, date, exceptId));
        const w = ROLE_WORD[l.staff] || [l.staff, l.staff + 's'];
        if (taken[l.id] > left) return { error: left ? `Only ${left} ${w[left > 1 ? 1 : 0]} free with ${v.name} on ${date}` : `No ${w[1]} free with ${v.name} on ${date}`, status: 409 };
        const p = priceOn(v, l, date);
        items.push({ listingId: l.id, name: l.name, nameHi: l.nameHi || '', unit: l.unit, price: p, qty, staff: l.staff, ...(p !== l.price ? { lagan: true, normalPrice: l.price } : {}), ...extra });
        continue;
      }
      if (hasTiers(l)) {
        // priced by number of guests: any count (e.g. 250) takes the vendor's rate for the smallest package that covers
        // it — the price always comes from the vendor's tier, never from the browser
        const n = Math.round(num(it.guests)), ts = [...l.guestTiers].sort((a, b) => a.guests - b.guests);
        const tier = n > 0 ? ts.find(t => t.guests >= n) : null;
        if (!tier) return { error: n > 0 ? `"${l.name}" takes up to ${ts[ts.length - 1].guests} guests` : `Choose how many guests for "${l.name}"` };
        const p = priceOn(v, l, date, tier.price);
        items.push({ listingId: l.id, name: `${l.name} · ${n} guests`, nameHi: l.nameHi ? `${l.nameHi} · ${n} लोग` : '', unit: l.unit, price: p, qty: 1, guests: n, ...(tier.guests !== n ? { tierGuests: tier.guests } : {}), ...(p !== tier.price ? { lagan: true, normalPrice: tier.price } : {}), ...extra });
        continue;
      }
      // a listing with styles (mala, jaimala, car decoration…): the chosen style's price, lagan rules on top
      if ((l.styles || []).length) {
        const st = l.styles.find(s => s.key === str(it.style, 40)) || l.styles[0], p = priceOn(v, l, pd, st.price);
        items.push({ listingId: l.id, name: `${l.name} — ${st.name}`, nameHi: l.nameHi || '', unit: l.unit, price: p, qty, style: st.key, ...(planned ? { shoot: l.shoot } : {}), ...(p !== st.price ? { lagan: true, normalPrice: st.price } : {}), ...extra });
        continue;
      }
      // lagan days: the vendor's lagan price (never the browser's)
      const p = priceOn(v, l, pd);
      items.push({ listingId: l.id, name: l.name, nameHi: l.nameHi || '', unit: l.unit, price: p, qty, ...(planned ? { shoot: l.shoot } : {}), ...(p !== l.price ? { lagan: true, normalPrice: l.price } : {}), ...extra });
    }
    if (!items.length) return { error: 'Select at least one item / service' };
    return { items, event };
  }

  function cleanCustomer(c = {}) {
    const customer = { name: str(c.name, 80), phone: str(c.phone, 15), address: str(c.address, 250), district: str(c.district, 60), pincode: str(c.pincode, 6) };
    if (!customer.name || !/^[6-9]\d{9}$/.test(customer.phone)) return { error: 'Enter your name and a valid 10-digit mobile number' };
    if (!customer.address || !districtOf(customer.district)) return { error: 'Enter the address and district where the service is needed' };
    // whose wedding the family is booking for: boy (bete ki – baraat goes) or girl (beti ki – baraat comes)
    const side = ['boy', 'girl'].includes(c.side) ? c.side : '';
    return { customer: { ...customer, side, districtName: districtOf(customer.district).name } };
  }
  // Creates one booking (one vendor, one date). Returns { booking } or { error, status }.
  // Delivery / transport charge for one booking: shops when the customer picks delivery; rental pieces are always
  // brought to the address and set up, so the vendor's charge applies whenever the vendor has delivery turned on
  function deliveryFor(v, chkItems, delivery) {
    const mode = TYPE[v.type].mode, rental = chkItems.some(i => i.rental), subtotal = chkItems.reduce((s, i) => s + i.price * i.qty, 0);
    const canDeliver = !!(v.delivery && v.delivery.available && ((mode === 'stock' && delivery === 'delivery') || rental));
    return { subtotal, rental, canDeliver, deliveryCharge: canDeliver ? (subtotal >= (v.delivery.freeAbove || Infinity) ? 0 : (v.delivery.charge || 0)) : 0 };
  }
  function createVBooking({ vendorId, date, items, delivery, event, eventTime }, customer, note, me) {
    const v = vendors().find(x => x.id === str(vendorId, 40) && visible(x));
    if (!v) return { error: 'Vendor not found', status: 404 };
    if (!isDate(str(date, 10))) return { error: `Select the booking date for ${v.name}` };
    const chk = checkBooking(v, date, items, undefined, event);
    if (chk.error) return { error: chk.error, status: chk.status || 400, vendorId: v.id, date };
    const mode = TYPE[v.type].mode;
    const { subtotal, rental, canDeliver, deliveryCharge } = deliveryFor(v, chk.items, delivery);
    if (mode === 'stock') for (const i of chk.items) listings().find(l => l.id === i.listingId).stock -= i.qty;
    const seq = (D().counters.vbooking = (D().counters.vbooking || 5000) + 1);
    const b = {
      id: uid('vb_'), number: 'VB' + seq, vendorId: v.id, vendorName: v.name, type: v.type, date, ...(chk.event ? { event: chk.event } : {}), ...(isTime(eventTime) ? { eventTime } : {}), items: chk.items, subtotal, deliveryCharge, total: subtotal + deliveryCharge,
      fulfilment: mode === 'stock' ? (canDeliver ? 'delivery' : 'pickup') : rental && canDeliver ? 'delivery' : 'on-site',
      customer, note: str(note, 500), userId: me ? me.id : null,
      status: 'requested', history: [{ status: 'requested', at: now(), note: 'Booking requested' }], createdAt: now(), reviewed: false,
      answerBy: answerBy(date, now()), ...(v.advance > 0 ? { advance: v.advance } : {}), // the vendor answers by then, or the date is released
    };
    vbookings().push(b);
    return { booking: b, vendor: { id: v.id, name: v.name, phone: v.phone, whatsapp: v.whatsapp } };
  }
  // Undo bookings made earlier in the same request (used when a later one fails)
  function rollback(created) {
    for (const { booking: b } of created) {
      if (TYPE[b.type].mode === 'stock') for (const i of b.items) { const l = listings().find(x => x.id === i.listingId); if (l) l.stock += i.qty; }
      D().vbookings = vbookings().filter(x => x.id !== b.id);
    }
  }

  route('POST', '/api/vbookings', (req, res, { body }) => {
    const me = currentUser(req);
    if (D().settings.otpRequired && !me) return fail(res, 401, 'Please verify your mobile number with OTP to book');
    const c = cleanCustomer(body.customer);
    if (c.error) return fail(res, 400, c.error);
    const r = createVBooking(body, c.customer, body.note, me);
    if (r.error) return fail(res, r.status || 400, r.error);
    bump('vbookings'); // funnel: one booking request (saves)
    send(res, 201, r);
  });

  // Cart checkout: book several vendors / vehicles / dates in one go. All or nothing.
  route('POST', '/api/vbookings/bulk', (req, res, { body }) => {
    const me = currentUser(req);
    if (D().settings.otpRequired && !me) return fail(res, 401, 'Please verify your mobile number with OTP to book');
    const groups = Array.isArray(body.groups) ? body.groups.slice(0, 30) : [];
    if (!groups.length) return fail(res, 400, 'Your vendor cart is empty');
    const c = cleanCustomer(body.customer);
    if (c.error) return fail(res, 400, c.error);
    const created = [];
    for (const g of groups) {
      const r = createVBooking(g, c.customer, body.note, me);
      if (r.error) { rollback(created); return send(res, r.status || 400, { error: r.error, vendorId: r.vendorId || g.vendorId, date: g.date }); }
      created.push(r);
    }
    bump('vbookings'); // one cart checkout = one request in the funnel (saves)
    send(res, 201, { bookings: created.map(r => ({ ...r.booking, vendor: r.vendor })) });
  });

  const findVB = (number, phone) => vbookings().find(b => b.number === str(number, 20).toUpperCase().replace(/^#/, '') && b.customer.phone === str(phone, 15));
  route('GET', '/api/vbookings/track', (req, res, { query }) => {
    const b = findVB(query.get('number'), query.get('phone'));
    if (!b) return fail(res, 404, 'No booking found with this booking number and mobile number');
    const v = vendors().find(x => x.id === b.vendorId);
    send(res, 200, { booking: withMoney(b), vendor: v ? { id: v.id, name: v.name, phone: v.phone, whatsapp: v.whatsapp, address: v.address } : null });
  });
  // the account's vendor bookings: made while logged in, plus guest bookings with the same mobile once that number is
  // OTP-verified (a password sign-up alone does not prove the number is theirs); another account's bookings never
  const bookingsOf = u => vbookings().filter(b => b.userId === u.id || (!b.userId && u.phoneVerified && b.customer.phone === u.phone));
  route('GET', '/api/vbookings/mine', (req, res, { user }) => {
    const contact = id => { const v = vendors().find(x => x.id === id); return v ? { id: v.id, name: v.name, phone: v.phone, whatsapp: v.whatsapp } : null; };
    send(res, 200, { bookings: bookingsOf(user).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(b => ({ ...withMoney(b), vendor: contact(b.vendorId) })), phoneVerified: !!user.phoneVerified });
  }, { auth: true });

  // confirmedAt / completedAt / cancelledAt / rejectedAt: first time a booking reached that status (time-to-confirm analytics)
  const STAMPED = ['confirmed', 'completed', 'cancelled', 'rejected'];
  function setVBStatus(b, status, note) {
    if (!BOOKING_STATUSES.includes(status) || b.status === status) return;
    const releasing = ['cancelled', 'rejected'].includes(status) && ACTIVE_BOOKING.includes(b.status);
    if (releasing && TYPE[b.type].mode === 'stock') for (const i of b.items) { const l = listings().find(x => x.id === i.listingId); if (l) l.stock += i.qty; }
    b.status = status; b.history.push({ status, at: now(), note: note || '' });
    if (STAMPED.includes(status) && !b[status + 'At']) b[status + 'At'] = now();
  }
  // A request holds the vendor's date only while the vendor can answer: 48 hours, or until the function day starts
  // (India time) when that is sooner. Unanswered requests are then released so other families can book the date,
  // and the family sees that the vendor did not answer.
  const HOLD_HOURS = 48;
  // (a same-day or next-morning request still gets at least 3 hours)
  function answerBy(date, created) { const c = Date.parse(created); return new Date(Math.max(c + 3 * 36e5, Math.min(c + HOLD_HOURS * 36e5, Date.parse(date + 'T00:00:00+05:30')))).toISOString(); }
  function expireRequests() {
    let n = 0;
    for (const b of vbookings()) {
      if (b.status !== 'requested') continue;
      if (!b.answerBy) b.answerBy = answerBy(b.date, b.createdAt); // older requests
      if (Date.now() <= Date.parse(b.answerBy)) continue;
      setVBStatus(b, 'cancelled', `${b.vendorName} did not answer in time — the date is released. Please book another vendor for this date.`);
      b.expired = true; n++;
    }
    if (n) save();
  }
  setTimeout(expireRequests, 5000).unref();
  setInterval(expireRequests, 10 * 60e3).unref();
  // older bookings: the same timestamps from their status history (once)
  if (!D().vbStatusTimes) {
    for (const b of vbookings()) for (const x of b.history || []) if (STAMPED.includes(x.status) && !b[x.status + 'At']) b[x.status + 'At'] = x.at;
    D().vbStatusTimes = true; save();
  }
  route('POST', '/api/vbookings/cancel', (req, res, { body }) => {
    const b = findVB(body.number, body.phone);
    if (!b) return fail(res, 404, 'Booking not found');
    if (!ACTIVE_BOOKING.includes(b.status)) return fail(res, 400, 'This booking can no longer be cancelled');
    setVBStatus(b, 'cancelled', 'Cancelled by customer'); save();
    send(res, 200, { booking: withMoney(b) });
  });

  // Reviews: only the customer of a completed booking, once per booking
  route('POST', '/api/vreviews', (req, res, { body }) => {
    const b = findVB(body.number, body.phone);
    if (!b) return fail(res, 404, 'Enter the booking number and mobile number used for the booking');
    if (b.status !== 'completed') return fail(res, 400, 'You can review after the vendor completes your booking');
    if (b.reviewed) return fail(res, 409, 'You have already reviewed this booking');
    const rating = Math.round(num(body.rating, 0));
    if (rating < 1 || rating > 5) return fail(res, 400, 'Choose 1 to 5 stars');
    const r = { id: uid('rv_'), vendorId: b.vendorId, bookingId: b.id, name: b.customer.name.split(' ')[0], district: b.customer.districtName, rating, text: str(body.text, 1000), reply: '', status: 'published', verified: true, createdAt: now() };
    vreviews().push(r); b.reviewed = true; save();
    send(res, 201, { review: r });
  });

  // Join as vendor / artist: saved as unverified until an admin checks it
  route('POST', '/api/vendor-apply', (req, res, { body }) => {
    if (joinLimited(req)) return fail(res, 429, 'Too many sign-ups from this phone / network. Please try again in an hour or call us.');
    const type = TYPE[body.type] ? body.type : null;
    const phone = str(body.phone, 15);
    if (!type) return fail(res, 400, 'Choose what you provide');
    if (!str(body.name, 100) || !str(body.owner, 80)) return fail(res, 400, 'Enter business / artist name and owner name');
    if (!/^[6-9]\d{9}$/.test(phone)) return fail(res, 400, 'Enter a valid 10-digit mobile number');
    if (!districtOf(str(body.district, 60))) return fail(res, 400, 'Select your district');
    if (!/^[1-9]\d{5}$/.test(str(body.pincode, 6))) return fail(res, 400, 'Enter your 6-digit pincode');
    if (vendors().some(v => v.phone === phone && !v.sample)) return fail(res, 409, 'A vendor with this mobile number is already registered');
    const sub = TYPE[type].subtypes ? (TYPE[type].subtypes.some(s => s[0] === body.subtype) ? body.subtype : TYPE[type].subtypes[0][0]) : '';
    // vehicles: the first car can be listed right in the sign-up form
    const car = type === 'vehicle' && str(body.carModel, 80) ? {
      model: str(body.carModel, 80), seats: Math.max(0, Math.min(60, Math.round(num(body.carSeats)))), ac: body.carAc === '1',
      price: Math.round(num(body.carPrice)), km: str(body.carKm, 60), driver: body.carDriver !== '0', photo: /^https?:\/\//.test(str(body.carPhoto, 400)) ? str(body.carPhoto, 400) : '',
    } : null;
    if (car && (car.price < 100 || car.price > 500000)) return fail(res, 400, 'Enter the price per day for your car');
    // vehicles: vehicle number, driving licence and papers (all checked before anything is saved)
    const ownerDriver = type === 'vehicle' && sub === 'owner';
    const regNo = normReg(body.carRegNo), dlNo = normDL(body.dlNo);
    // ghodi / baggi (dulha entry) have no vehicle number; a number given anyway must be right
    if (car && (sub !== 'dulha' || body.carRegNo) && !validReg(regNo)) return fail(res, 400, 'Enter the vehicle number as on the RC, e.g. BR 06 AB 1234');
    if (dlNo && !validDL(dlNo)) return fail(res, 400, 'Driving licence number looks wrong. It is like BR06 20110012345');
    if (ownerDriver && !dlNo) return fail(res, 400, 'Enter your driving licence number');
    // every vendor: consent, ID-type papers for their kind of work, optional PAN / GSTIN / FSSAI numbers
    if (body.consent !== true) return fail(res, 400, 'Please tick that you agree to share these documents for verification');
    // arkestra: only adults on stage (child-protection; the team checks every performer's age proof)
    if (type === 'orchestra' && body.adults18 !== true) return fail(res, 400, sub === 'artist' ? 'Please confirm that you are 18 years or older' : 'Please confirm that every performer in your group is 18 years or older');
    const kycErr = kycError(body);
    if (kycErr) return fail(res, 400, kycErr);
    const rules = docRules(type, sub), allowed = ruleKinds(rules, !!car);
    const docs = [];
    for (const d of (Array.isArray(body.docs) ? body.docs : []).slice(0, 10)) {
      if (!allowed.includes(d && d.kind) || docs.some(x => x.kind === d.kind)) continue;
      const dec = decodeDoc(d.dataUrl);
      if (dec.error) return fail(res, 400, `${DOC_KINDS[d.kind]}: ${dec.error}`);
      docs.push({ kind: d.kind, dec });
    }
    const missing = [...rules.join, ...(car && rules.car ? rules.car.join : [])].filter(k => !docs.some(x => x.kind === k));
    if (missing.length) return fail(res, 400, `Please add a photo of your ${missing.map(k => DOC_KINDS[k].replace(/ \(.*\)/, '')).join(' and ')}`);
    // photos (car photos for vehicles); the client puts the chosen front photo first
    const pics = [];
    for (const p of (Array.isArray(body.photos) ? body.photos : []).slice(0, 8)) {
      const dec = decodePhoto(p);
      if (dec.error) return fail(res, 400, dec.error);
      pics.push(dec);
    }
    const v = blankVendor({ type, subtype: sub, name: str(body.name, 100), owner: str(body.owner, 80), phone, whatsapp: phone, district: body.district, address: str(body.address, 250), about: str(body.about, 1500) });
    v.verified = false; v.status = 'pending';
    v.pincode = str(body.pincode, 6);
    if (validPoint(body.lat, body.lng)) Object.assign(v, validPoint(body.lat, body.lng), { geoSrc: 'pin' });
    const photoUrls = [...pics.map(storePhoto), ...(car && car.photo ? [car.photo] : [])];
    if (photoUrls.length) v.photos = photoUrls.slice(0, 12);
    let carListing = null;
    if (car) {
      v.experienceYears = Math.max(0, Math.min(60, Math.round(num(body.experienceYears))));
      const dulha = sub === 'dulha';
      // same fields the Vendor Panel edits later: seats, AC, km and driver are kept on their own (filters use them)
      carListing = newListing(v.id, { name: car.model, price: car.price, laganPrice: num(body.carLaganPrice) > car.price ? body.carLaganPrice : 0, unit: dulha ? 'event' : 'day', units: 1, photos: photoUrls, regNo,
        ...(dulha ? { km: car.km } : { seats: car.seats, ac: car.ac, km: car.km, driver: car.driver }),
        specs: (dulha ? [car.km] : [car.seats ? `${car.seats} seats` : '', car.ac ? 'AC' : 'Non-AC', car.km, car.driver ? 'with driver' : '']).filter(Boolean).join(' · ') });
      listings().push(carListing);
    }
    if (dlNo) v.dlNo = dlNo;
    v.kyc = Object.fromEntries(Object.keys(KYC).filter(k => body[k]).map(k => [k, normKyc(body[k])]));
    v.consentAt = now();
    v.laganPct = Math.max(0, Math.min(300, Math.round(num(body.laganPct)))); // % extra on lagan days
    if (type === 'orchestra') v.adultsDeclaredAt = now();
    for (const d of docs) storeDoc(v, d.kind, d.dec, carListing && carListing.id);
    vendors().push(v); save();
    autoLocate(v); // background: address + pincode → map point
    send(res, 201, { ok: true, id: v.id });
  });

  function blankVendor(f) {
    return {
      id: uid('v_'), type: 'catering', subtype: '', name: '', nameHi: '', owner: '', phone: '', whatsapp: '', address: '', district: '', pincode: '', about: '', photos: [], videos: [], tags: [],
      profilePhoto: '', experienceYears: 0, languages: [], speciality: '', dishes: [], skills: [], education: [], team: [],
      verified: false, active: true, sample: false, capacityPerDay: 1, openDays: [0, 1, 2, 3, 4, 5, 6], blockedDates: [], bookedDates: [], delivery: { available: false, charge: 0, freeAbove: 0 },
      stockUpdated: '', userId: null, status: 'active', createdAt: now(), ...f,
    };
  }

  // ---------- editing helpers shared by vendor panel and admin ----------
  // same rules as the join form: returns an error message, or '' when the changes can be saved
  function vendorFieldsError(v, b) {
    if ('name' in b && !str(b.name, 100)) return 'Enter your business / artist name';
    for (const k of ['phone', 'whatsapp']) if (b[k] && !/^[6-9]\d{9}$/.test(str(b[k], 15))) return `Enter a valid 10-digit ${k === 'phone' ? 'mobile' : 'WhatsApp'} number`;
    if ('phone' in b && !str(b.phone, 15)) return 'A mobile number is needed so customers can call you';
    if (b.phone && b.phone !== v.phone && vendors().some(x => x.id !== v.id && x.phone === str(b.phone, 15) && !x.sample)) return 'Another vendor already uses this mobile number';
    if (b.pincode && !/^[1-9]\d{5}$/.test(str(b.pincode, 6))) return 'Pincode must be 6 digits';
    if ('profilePhoto' in b && b.profilePhoto && !cleanPhotos([b.profilePhoto], 1).length) return 'Profile photo must be an uploaded photo or an https:// link';
    if (Array.isArray(b.openDays) && !b.openDays.length) return 'Keep at least one day open — use the calendar to close single dates';
    return '';
  }
  function applyVendorFields(v, b, admin) {
    const place = placeKey(v);
    for (const k of ['name', 'nameHi', 'owner', 'address', 'about']) if (k in b) v[k] = str(b[k], k === 'about' ? 1500 : 250);
    for (const k of ['phone', 'whatsapp']) if (k in b && (!b[k] || /^[6-9]\d{9}$/.test(str(b[k], 15)))) v[k] = str(b[k], 15);
    if ('pincode' in b) v.pincode = /^[1-9]\d{5}$/.test(str(b.pincode, 6)) ? str(b.pincode, 6) : '';
    if ('district' in b && districtOf(b.district)) v.district = b.district;
    // shop / home pin set by hand (map / GPS) wins over the address; empty clears it and the address is used again
    if ('lat' in b || 'lng' in b) {
      const p = validPoint(b.lat, b.lng);
      if (p) Object.assign(v, p, { geoSrc: 'pin' });
      else if (!b.lat && !b.lng) { delete v.lat; delete v.lng; delete v.geoSrc; autoLocate(v); }
    }
    // address / pincode / district changed: forget the old address point and look up the new one
    if (placeKey(v) !== place && v.geoSrc !== 'pin') { if (v.geoSrc === 'address' || v.sample) { delete v.lat; delete v.lng; delete v.geoSrc; } autoLocate(v); }
    if ('photos' in b) v.photos = cleanPhotos(Array.isArray(b.photos) ? b.photos : String(b.photos).split('\n'), 12);
    if ('videos' in b) v.videos = (Array.isArray(b.videos) ? b.videos : String(b.videos).split('\n')).map(x => str(x, 400)).filter(x => /^https?:\/\//.test(x)).slice(0, 8);
    if ('tags' in b) v.tags = (Array.isArray(b.tags) ? b.tags : String(b.tags).split(',')).map(x => str(x, 40)).filter(Boolean).slice(0, 10);
    if ('profilePhoto' in b) v.profilePhoto = cleanPhotos([b.profilePhoto || ''], 1)[0] || '';
    if ('experienceYears' in b) v.experienceYears = Math.max(0, Math.min(80, Math.round(num(b.experienceYears))));
    if ('languages' in b) v.languages = (Array.isArray(b.languages) ? b.languages : String(b.languages).split(',')).map(x => str(x, 30)).filter(Boolean).slice(0, 8);
    if ('speciality' in b) v.speciality = str(b.speciality, 160);
    if ('dlNo' in b) { if (validDL(normDL(b.dlNo))) v.dlNo = normDL(b.dlNo); else if (!b.dlNo) delete v.dlNo; }
    for (const k of Object.keys(KYC)) if (k in b) { v.kyc = v.kyc || {}; if (b[k] && KYC[k][0](normKyc(b[k]))) v.kyc[k] = normKyc(b[k]); else if (!b[k]) delete v.kyc[k]; }
    if ('dishes' in b) v.dishes = parseDishes(b.dishes);
    if ('skills' in b) v.skills = parseDishes(b.skills);
    if ('education' in b) v.education = parseEducation(b.education);
    if ('team' in b) v.team = parseTeam(b.team);
    if ('laganPct' in b) v.laganPct = Math.max(0, Math.min(300, Math.round(num(b.laganPct)))); // % extra on lagan days
    if ('advance' in b) v.advance = Math.max(0, Math.min(500000, Math.round(num(b.advance)))); // token the family pays the vendor to lock the date (0 = none)
    if ('capacityPerDay' in b) v.capacityPerDay = Math.max(1, Math.min(50, Math.round(num(b.capacityPerDay, 1))));
    if (isPerson(v)) v.capacityPerDay = 1; // one person, one wedding a day (also after a subtype change below)
    if (Array.isArray(b.openDays)) v.openDays = b.openDays.map(Number).filter(d => d >= 0 && d <= 6);
    if (Array.isArray(b.blockedDates)) v.blockedDates = [...new Set(b.blockedDates.filter(isDate))].slice(0, 400);
    if (Array.isArray(b.bookedDates)) v.bookedDates = [...new Set(b.bookedDates.filter(isDate))].slice(0, 400);
    if (b.delivery && typeof b.delivery === 'object') v.delivery = { available: !!b.delivery.available, charge: Math.max(0, Math.round(num(b.delivery.charge))), freeAbove: Math.max(0, Math.round(num(b.delivery.freeAbove))) };
    if ('subtype' in b && TYPE[v.type].subtypes && TYPE[v.type].subtypes.some(s => s[0] === b.subtype)) v.subtype = b.subtype;
    if (v.type === 'orchestra' && v.subtype === 'artist' && (v.team || []).length) v.team = []; // a solo artist has no group team
    if (isPerson(v)) v.capacityPerDay = 1;
    if (b.stockUpdatedToday) v.stockUpdated = today();
    if (admin) {
      if ('type' in b && TYPE[b.type]) v.type = b.type;
      if ('verified' in b) { v.verified = !!b.verified; v.status = v.verified ? 'active' : v.status; }
      if ('active' in b) v.active = !!b.active;
      if ('sample' in b) v.sample = !!b.sample;
    }
  }
  function applyListing(l, b) {
    // rental components (tent house / decorator / DJ, see RENTAL_TYPES): booked by quantity per date from `units`
    const vtype = (vendors().find(x => x.id === l.vendorId) || {}).type;
    if ('rental' in b) l.rental = PIECE_TYPES.includes(vtype) && [true, 1, '1', 'on', 'true'].includes(b.rental);
    if ('category' in b) l.category = (vtype === 'catering' ? BARTAN_CAT_IDS : TENT_CAT_IDS).includes(b.category) ? b.category : 'other';
    if ('staff' in b) l.staff = (STAFF_BY[vtype] || []).includes(b.staff) ? b.staff : '';
    if ('shoot' in b) l.shoot = PLAN_TYPES.includes(vtype) && SHOOT_KINDS.includes(b.shoot) ? b.shoot : '';
    if (l.staff) { l.rental = false; l.guestTiers = []; l.events = []; l.covers = []; } // a team member is priced per person per day, any function
    // styles / designs of one item, each with its own price and photo — rows "name | price | note | photo" where the
    // photo is a link or the number of one of this item's photos (1 = first)
    if ('styles' in b) {
      const rows = Array.isArray(b.styles) ? b.styles : String(b.styles || '').split('\n').map(r => { const [name, price, note, photo] = r.split('|').map(x => x.trim()); return { name, price, note, photo }; });
      const pics = Array.isArray(b.photos) ? b.photos : l.photos || [];
      const keyOf = n => str(n, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'style';
      const old = new Map((l.styles || []).map(x => [x.name.toLowerCase(), x.key])), used = new Set();
      l.styles = rows.filter(x => x && str(x.name, 80) && num(x.price) > 0).slice(0, 12).map(x => {
        const ph = /^\d+$/.test(String(x.photo || '')) ? pics[Number(x.photo) - 1] || '' : /^(https:\/\/|\/uploads\/)/.test(x.photo || '') ? str(x.photo, 400) : '';
        let key = x.key || old.get(str(x.name, 80).toLowerCase()) || keyOf(x.name); while (used.has(key)) key += '-2'; used.add(key);
        return { key, name: str(x.name, 80), price: Math.round(num(x.price)), note: str(x.note, 80), photo: ph };
      });
    }
    if (l.rental && !l.category) l.category = 'other';
    if ('size' in b) l.size = str(b.size, 40);
    if ('features' in b) l.features = [...new Set((Array.isArray(b.features) ? b.features : String(b.features || '').split(',')).map(x => str(x, 40)).filter(Boolean))].slice(0, 8);
    if ('name' in b) l.name = str(b.name, 120);
    if ('nameHi' in b) l.nameHi = str(b.nameHi, 120);
    if ('item' in b) l.item = str(b.item, 60).toLowerCase();
    if ('price' in b) l.price = Math.max(0, Math.round(num(b.price)));
    if ('unit' in b) l.unit = str(b.unit, 40) || 'piece';
    if ('stock' in b) l.stock = Math.max(0, Math.round(num(b.stock)));
    if ('units' in b) l.units = Math.max(1, Math.min(l.rental ? 100000 : 50, Math.round(num(b.units, 1)))); // 500 chairs, but at most 50 of one car
    else if (!l.rental && l.units > 50) l.units = 50;
    const owner = vendors().find(x => x.id === l.vendorId);
    if (owner && owner.type === 'vehicle' && owner.subtype === 'owner') l.units = 1; // owner-driver: one car, one booking a date
    if ('laganPrice' in b) l.laganPrice = Math.max(0, Math.min(10000000, Math.round(num(b.laganPrice)))); // 0 = use the vendor's lagan %
    // several photos per item / car; the first is the front photo shown on cards
    if (Array.isArray(b.photos)) { l.photos = cleanPhotos(b.photos, 10); l.photo = l.photos[0] || ''; }
    else if ('photo' in b) { l.photo = cleanPhotos([b.photo], 1)[0] || ''; l.photos = [l.photo, ...(l.photos || []).filter(p => p !== l.photo)].filter(Boolean).slice(0, 10); }
    if ('specs' in b) l.specs = str(b.specs, 300);
    // vehicles: seats / AC / km / driver as their own fields (the car search filters on them)
    if ('seats' in b) l.seats = Math.max(0, Math.min(60, Math.round(num(b.seats))));
    if ('ac' in b) l.ac = b.ac === true || b.ac === '1' ? true : b.ac === false || b.ac === '0' ? false : null;
    if ('km' in b) l.km = str(b.km, 60);
    if ('driver' in b) l.driver = b.driver === true || b.driver === '1' || b.driver === 'on';
    if ('regNo' in b) l.regNo = validReg(normReg(b.regNo)) ? fmtReg(normReg(b.regNo)) : ''; // routes reject a wrong number first
    if ('active' in b) l.active = !!b.active;
    if ('guestTiers' in b) l.guestTiers = parseTiers(b.guestTiers);
    // ration items: brand, quality and how many kg / litres one selling unit holds (packet of 500 g = 0.5, quintal = 100)
    if ('brand' in b) l.brand = str(b.brand, 60);
    if ('quality' in b) l.quality = QUALITIES.includes(b.quality) ? b.quality : '';
    if ('packSize' in b) l.packSize = Math.max(0, Math.min(1000, Math.round(num(b.packSize) * 1000) / 1000));
    // sold by kg / litre / quintal / piece: the unit itself is the size (a leftover bag size would skew price per kg)
    if (['kg', 'litre', 'quintal', 'piece'].includes(l.unit)) l.packSize = 0;
    // goods sold by quantity: bulk rates and minimum order
    if ('bulkTiers' in b) l.bulkTiers = parseBulk(b.bulkTiers);
    if ('minQty' in b) l.minQty = Math.max(0, Math.min(100000, Math.round(num(b.minQty))));
    // sweet shops: packaging boxes are items of kind "box" (size, how much they hold, design)
    if ('kind' in b) l.kind = ['box', 'card'].includes(b.kind) ? b.kind : '';
    if ('boxSize' in b) l.boxSize = str(b.boxSize, 40);
    if ('holdsKg' in b) l.holdsKg = Math.max(0, Math.min(50, Math.round(num(b.holdsKg) * 100) / 100));
    if ('design' in b) l.design = str(b.design, 80);
    // wedding card designs
    if ('cardType' in b) l.cardType = CARD_TYPES.includes(b.cardType) ? b.cardType : '';
    if ('paper' in b) l.paper = str(b.paper, 60);
    if ('printing' in b) l.printing = (Array.isArray(b.printing) ? b.printing : String(b.printing).split(',')).map(x => str(x, 30)).filter(x => PRINTING.includes(x));
    if ('addons' in b) l.addons = parseAddons(b.addons);
    if ('leadDays' in b) l.leadDays = Math.max(0, Math.min(60, Math.round(num(b.leadDays))));
    if (b.cardViews && typeof b.cardViews === 'object') {
      // front, back and inside pages; the front is the cover photo
      const one = x => cleanPhotos([x || ''], 1)[0] || '';
      l.cardViews = { front: one(b.cardViews.front), back: one(b.cardViews.back), inside: cleanPhotos(Array.isArray(b.cardViews.inside) ? b.cardViews.inside : [], 8) };
      l.photos = [l.cardViews.front, l.cardViews.back, ...l.cardViews.inside].filter(Boolean);
      l.photo = l.photos[0] || '';
    }
    // styles are for one-price items only (not rental pieces, team members or guest packages); the item shows "from" the cheapest
    if ((l.styles || []).length) { if (l.rental || l.staff || hasTiers(l)) l.styles = []; else l.price = Math.min(...l.styles.map(s => s.price)); }
    // event-mode services (Pandit Ji, DJ, studio...): functions it is for, or the rasams one booking covers (then "events" does not apply)
    if (TYPE[(vendors().find(x => x.id === l.vendorId) || {}).type]?.mode === 'event') {
      if ('events' in b) l.events = evList(b.events);
      if ('covers' in b) l.covers = evList(b.covers);
      if ((l.covers || []).length) l.events = [];
    }
    if (hasTiers(l)) l.price = l.guestTiers[0].price; // "From" price = smallest group
    return l;
  }
  const newListing = (vendorId, b) => applyListing({ id: uid('vl_'), vendorId, name: '', nameHi: '', item: '', price: 0, unit: 'piece', stock: 0, units: 1, photo: '', specs: '', active: true, createdAt: now() }, b);
  const vendorBundle = v => ({
    vendor: v, onePerDay: isPerson(v), type: TYPE[v.type], cardTypes: CARD_TYPES, printingOptions: PRINTING, ...(TYPE[v.type].mode === 'event' ? { events: EVENTS } : {}), ...(PIECE_TYPES.includes(v.type) ? { tentCats: v.type === 'catering' ? BARTAN_CATS : TENT_CATS } : {}), ...(STAFF_BY[v.type] ? { staffRoles: STAFF_BY[v.type] } : {}), ...(PLAN_TYPES.includes(v.type) ? { shootPlan: true } : {}),
    ...(['ration', 'vegetable'].includes(v.type) ? { ingredients: INGREDIENTS, qualities: QUALITIES } : {}), docRules: rulesOf(v), docsMissing: missingChecks(v), docKinds: DOC_KINDS, listings: listings().filter(l => l.vendorId === v.id), ...ratingOf(v.id),
    reviewList: vreviews().filter(r => r.vendorId === v.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    bookings: vbookings().filter(b => b.vendorId === v.id).sort((a, b) => a.date.localeCompare(b.date) || b.createdAt.localeCompare(a.createdAt)).map(withMoney),
    calendar: calendar(v, today().slice(0, 7)), nextCalendar: calendar(v, nextMonth(today().slice(0, 7))),
    ...(VISIT_TYPES.includes(v.type) ? { visits: vvisits().filter(x => x.vendorId === v.id).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)) } : {}),
  });
  const nextMonth = m => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

  // routes for one vendor's own data, mounted for vendors (/api/vendor) and admins (/api/admin/vendors/:id)
  function mountOwn(base, opts, resolve) {
    route('GET', base, (req, res, ctx) => { const v = resolve(ctx); if (!v) return fail(res, 404, 'Vendor not found'); send(res, 200, vendorBundle(v)); }, opts);
    route('PUT', base, (req, res, ctx) => {
      const v = resolve(ctx); if (!v) return fail(res, 404, 'Vendor not found');
      if (ctx.body.dlNo && !validDL(normDL(ctx.body.dlNo))) return fail(res, 400, 'Driving licence number looks wrong. It is like BR06 20110012345');
      const kycErr = kycError(ctx.body) || vendorFieldsError(v, ctx.body); if (kycErr) return fail(res, 400, kycErr);
      applyVendorFields(v, ctx.body, !!opts.admin); save(); send(res, 200, vendorBundle(v));
    }, opts);
    route('GET', base + '/calendar', (req, res, ctx) => { const v = resolve(ctx); const m = ctx.query.get('month') || today().slice(0, 7); if (!v) return fail(res, 404, 'Vendor not found'); send(res, 200, { month: m, calendar: calendar(v, m) }); }, opts);
    // rental stock on one date: how many pieces of each component are owned, booked (requested / confirmed / completed) and left
    route('GET', base + '/inventory', (req, res, ctx) => {
      const v = resolve(ctx); if (!v) return fail(res, 404, 'Vendor not found');
      const date = isDate(ctx.query.get('date')) ? ctx.query.get('date') : today(), a = availability(v, date);
      const items = listings().filter(l => l.vendorId === v.id && l.rental).map(l => { const booked = unitsBooked(l.id, date); return { listingId: l.id, name: l.name, category: l.category || 'other', unit: l.unit, units: l.units || 1, booked, left: Math.max(0, (l.units || 1) - booked), active: !!l.active }; });
      send(res, 200, { date, status: a.status, offline: !!a.offline, items, bookings: vbookings().filter(b => b.vendorId === v.id && b.date === date && HOLDS_SLOT.includes(b.status) && b.items.some(i => i.rental)).map(b => ({ number: b.number, status: b.status, eventTime: b.eventTime || '', customer: b.customer.name, items: b.items.filter(i => i.rental).map(i => ({ name: i.name, qty: i.qty })) })) });
    }, opts);
    const badReg = b => b.regNo && !validReg(normReg(b.regNo));
    route('POST', base + '/listings', (req, res, ctx) => {
      const v = resolve(ctx); if (!v) return fail(res, 404, 'Vendor not found');
      if (badReg(ctx.body)) return fail(res, 400, 'Vehicle number looks wrong. Write it as on the RC, e.g. BR 06 AB 1234');
      const l = newListing(v.id, ctx.body);
      if (!l.name || !l.price) return fail(res, 400, 'Item name and price are required');
      listings().push(l); save(); send(res, 201, { listing: l });
    }, opts);
    route('PUT', base + '/listings/:lid', (req, res, ctx) => {
      const v = resolve(ctx); const l = v && listings().find(x => x.id === ctx.params.lid && x.vendorId === v.id);
      if (!l) return fail(res, 404, 'Item not found');
      if (badReg(ctx.body)) return fail(res, 400, 'Vehicle number looks wrong. Write it as on the RC, e.g. BR 06 AB 1234');
      if ('name' in ctx.body && !str(ctx.body.name, 120)) return fail(res, 400, 'Item name is required');
      if ('price' in ctx.body && Math.round(num(ctx.body.price)) < 1 && !String(ctx.body.guestTiers || '').trim() && !(l.guestTiers || []).length) return fail(res, 400, 'Price is required');
      applyListing(l, ctx.body);
      if ('stock' in ctx.body && TYPE[v.type].mode === 'stock') v.stockUpdated = today(); // new stock count = stock checked today
      save(); send(res, 200, { listing: l });
    }, opts);
    // vehicle papers: upload (replaces the same paper), open, check (admin) and remove
    route('POST', base + '/docs', (req, res, ctx) => {
      const v = resolve(ctx); if (!v) return fail(res, 404, 'Vendor not found');
      const kind = ctx.body.kind;
      if (!ruleKinds(rulesOf(v), true).includes(kind)) return fail(res, 400, 'Choose which document this is');
      const lid = CAR_DOCS.includes(kind) ? str(ctx.body.listingId, 40) : '';
      if (CAR_DOCS.includes(kind) && !listings().some(l => l.id === lid && l.vendorId === v.id)) return fail(res, 400, 'Choose which vehicle this paper is for');
      const dec = decodeDoc(ctx.body.dataUrl);
      if (dec.error) return fail(res, 400, dec.error);
      storeDoc(v, kind, dec, lid); save(); send(res, 201, vendorBundle(v));
    }, opts);
    route('GET', base + '/docs/:did', (req, res, ctx) => {
      const v = resolve(ctx), d = v && (v.docs || []).find(x => x.id === ctx.params.did);
      if (!d || !fs.existsSync(docFile(d))) return fail(res, 404, 'Document not found');
      res.writeHead(200, { 'Content-Type': DOC_MIME[d.ext] || 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'inline' });
      fs.createReadStream(docFile(d)).pipe(res);
    }, opts);
    route('PUT', base + '/docs/:did', (req, res, ctx) => {
      if (!opts.admin) return fail(res, 403, 'Only the Vivah Saathi team can check documents');
      const v = resolve(ctx), d = v && (v.docs || []).find(x => x.id === ctx.params.did);
      if (!d) return fail(res, 404, 'Document not found');
      if (['ok', 'rejected', 'pending'].includes(ctx.body.status)) d.status = ctx.body.status;
      d.note = d.status === 'rejected' ? str(ctx.body.note, 200) : '';
      d.checkedAt = now(); save(); send(res, 200, vendorBundle(v));
    }, opts);
    route('DELETE', base + '/docs/:did', (req, res, ctx) => {
      const v = resolve(ctx), d = v && (v.docs || []).find(x => x.id === ctx.params.did);
      if (!d) return fail(res, 404, 'Document not found');
      if (!opts.admin && d.status === 'ok') return fail(res, 400, 'A checked document cannot be removed. Upload a new one to replace it.');
      fs.rm(docFile(d), { force: true }, () => {});
      v.docs = v.docs.filter(x => x !== d); save(); send(res, 200, vendorBundle(v));
    }, opts);
    route('DELETE', base + '/listings/:lid', (req, res, ctx) => {
      const v = resolve(ctx); if (!v) return fail(res, 404, 'Vendor not found');
      D().vlistings = listings().filter(x => !(x.id === ctx.params.lid && x.vendorId === v.id));
      // that car's papers go with it
      for (const d of (v.docs || []).filter(x => x.listingId === ctx.params.lid)) fs.rm(docFile(d), { force: true }, () => {});
      if (v.docs) v.docs = v.docs.filter(x => x.listingId !== ctx.params.lid);
      save(); send(res, 200, { ok: true });
    }, opts);
    // site visits: the vendor confirms the visit, marks it done after measuring, or cancels (with a reason)
    route('PUT', base + '/visits/:sid', (req, res, ctx) => {
      const v = resolve(ctx), sv = v && vvisits().find(x => x.id === ctx.params.sid && x.vendorId === v.id);
      if (!sv) return fail(res, 404, 'Site visit not found');
      const to = ctx.body.status, ok = { requested: ['confirmed', 'cancelled'], confirmed: ['done', 'cancelled'] }[sv.status] || [];
      if (!ok.includes(to)) return fail(res, 400, `This visit is already ${sv.status}`);
      const note = str(ctx.body.note, 200);
      if (to === 'cancelled' && !note) return fail(res, 400, 'Tell the family why the visit is cancelled');
      sv.status = to; sv.history.push({ status: to, at: now(), note });
      if (to === 'done' && ctx.body.measured) sv.measured = str(ctx.body.measured, 200); // e.g. "60×80 ft, slope at back"
      save(); send(res, 200, vendorBundle(v));
    }, opts);
    route('PUT', base + '/bookings/:bid', (req, res, ctx) => {
      const v = resolve(ctx); const b = v && vbookings().find(x => x.id === ctx.params.bid && x.vendorId === v.id);
      if (!b) return fail(res, 404, 'Booking not found');
      if (ctx.body.status === 'confirmed' && b.status === 'requested') {
        // confirming must still respect the per-day limit (on every rasam date of a full-ceremony booking)
        const cap = perDay(v);
        // (rental pieces were already held from stock when requested, and do not use daily slots)
        const full = TYPE[v.type].mode === 'event' && !rentalOnly(b) && vbDates(b).find(dt => vbookings().filter(x => x.id !== b.id && x.vendorId === v.id && ['confirmed', 'completed'].includes(x.status) && !rentalOnly(x) && vbDates(x).includes(dt)).length >= cap);
        if (full) return fail(res, 409, full === b.date ? 'Already fully booked on this date' : `Already fully booked on ${full}`);
      }
      setVBStatus(b, ctx.body.status, str(ctx.body.note, 200));
      if ('vendorNote' in ctx.body) b.vendorNote = str(ctx.body.vendorNote, 500);
      save(); send(res, 200, { booking: b });
    }, opts);
    route('POST', base + '/reviews/:rid/reply', (req, res, ctx) => {
      const v = resolve(ctx); const r = v && vreviews().find(x => x.id === ctx.params.rid && x.vendorId === v.id);
      if (!r) return fail(res, 404, 'Review not found');
      r.reply = str(ctx.body.reply, 800); save(); send(res, 200, { review: r });
    }, opts);
  }

  // Vendor's own panel (user.role === 'vendor')
  const myVendor = ctx => ctx.user && ctx.user.role === 'vendor' ? vendors().find(v => v.id === ctx.user.vendorId) : null;
  route('GET', '/api/vendor/whoami', (req, res, ctx) => {
    const v = myVendor(ctx);
    if (!v) return fail(res, 403, 'This mobile number is not linked to a vendor account yet. Please contact the admin.');
    send(res, 200, { user: { name: ctx.user.name, phone: ctx.user.phone }, vendorId: v.id, verified: v.verified });
  }, { auth: true });
  mountOwn('/api/vendor/me', { auth: true }, myVendor);

  // ---------- admin ----------
  route('GET', '/api/admin/vendors', (req, res) => {
    send(res, 200, {
      types: VENDOR_TYPES,
      vendors: vendors().map(v => ({ ...v, districtName: (districtOf(v.district) || {}).name || '', listingCount: listings().filter(l => l.vendorId === v.id).length, docsPending: (v.docs || []).filter(d => d.status === 'pending').length, docsMissing: v.sample ? 0 : missingChecks(v).length, bookingCount: vbookings().filter(b => b.vendorId === v.id).length, hasLogin: !!v.userId, ...ratingOf(v.id) }))
        .sort((a, b) => (a.verified - b.verified) || b.createdAt.localeCompare(a.createdAt)),
    });
  }, { admin: true });
  route('POST', '/api/admin/vendors', (req, res, { body }) => {
    if (!TYPE[body.type]) return fail(res, 400, 'Choose a vendor type');
    const v = blankVendor({ type: body.type, subtype: TYPE[body.type].subtypes ? TYPE[body.type].subtypes[0][0] : '' });
    applyVendorFields(v, body, true);
    if (!v.name || !v.district) return fail(res, 400, 'Name and district are required');
    vendors().push(v); save(); send(res, 201, { vendor: v });
  }, { admin: true });
  route('DELETE', '/api/admin/vendors/:id', (req, res, { params }) => {
    if (vbookings().some(b => b.vendorId === params.id && ACTIVE_BOOKING.includes(b.status))) return fail(res, 400, 'This vendor has open bookings. Cancel or complete them first, or just hide the vendor.');
    for (const d of (vendors().find(v => v.id === params.id) || {}).docs || []) fs.rm(docFile(d), { force: true }, () => {});
    D().vendors = vendors().filter(v => v.id !== params.id);
    D().vlistings = listings().filter(l => l.vendorId !== params.id);
    save(); send(res, 200, { ok: true });
  }, { admin: true });
  route('POST', '/api/admin/vendors/remove-samples', (req, res) => {
    const ids = new Set(vendors().filter(v => v.sample).map(v => v.id));
    D().vendors = vendors().filter(v => !ids.has(v.id));
    D().vlistings = listings().filter(l => !ids.has(l.vendorId));
    D().vreviews = vreviews().filter(r => !r.sample && !ids.has(r.vendorId));
    D().samplesRemoved = true; // don't add new sample vendors in later upgrades
    save(); send(res, 200, { removed: ids.size });
  }, { admin: true });
  // Link a mobile number to the vendor so the vendor can log in to /vendor (OTP or the given password)
  route('POST', '/api/admin/vendors/:id/login', (req, res, { params, body }) => {
    const v = vendors().find(x => x.id === params.id);
    if (!v) return fail(res, 404, 'Vendor not found');
    const phone = str(body.phone || v.phone, 15);
    if (!/^[6-9]\d{9}$/.test(phone)) return fail(res, 400, 'Enter a valid 10-digit mobile number');
    let u = D().users.find(x => x.phone === phone);
    if (u && u.role === 'admin') return fail(res, 400, 'This number belongs to an admin account');
    if (u && u.role === 'vendor' && u.vendorId !== v.id) return fail(res, 400, 'This number is already linked to another vendor');
    if (!u) { u = { id: uid('u_'), name: v.owner || v.name, phone, email: '', password: '', addresses: [], wishlist: [], blocked: false, createdAt: now() }; D().users.push(u); }
    u.role = 'vendor'; u.vendorId = v.id;
    if (body.password) { if (String(body.password).length < 6) return fail(res, 400, 'Password must be at least 6 characters'); u.password = h.hashPassword(body.password); }
    v.userId = u.id; save();
    send(res, 200, { ok: true, phone });
  }, { admin: true });
  mountOwn('/api/admin/vendors/:id', { admin: true }, ctx => vendors().find(v => v.id === ctx.params.id));

  route('GET', '/api/admin/vbookings', (req, res) => send(res, 200, { bookings: [...vbookings()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(withMoney) }), { admin: true });
  // every site visit (tent house / decorator measuring the ground), newest first, with the vendor's phone
  route('GET', '/api/admin/vvisits', (req, res) => send(res, 200, { visits: [...vvisits()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(s => { const v = vendors().find(x => x.id === s.vendorId) || {}; return { ...s, vendorPhone: v.phone || '', sample: !!v.sample }; }) }), { admin: true });
  route('GET', '/api/admin/vreviews', (req, res) => send(res, 200, { reviews: vreviews().map(r => ({ ...r, vendorName: (vendors().find(v => v.id === r.vendorId) || {}).name || '' })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }), { admin: true });
  route('PUT', '/api/admin/vreviews/:id', (req, res, { params, body }) => {
    const r = vreviews().find(x => x.id === params.id);
    if (!r) return fail(res, 404, 'Review not found');
    if (['published', 'hidden'].includes(body.status)) r.status = body.status;
    save(); send(res, 200, { review: r });
  }, { admin: true });

  // real vendors saved before locations existed: look up their address once, in the background
  setTimeout(() => vendors().filter(v => !v.sample && v.lat == null && (v.address || v.pincode)).forEach(autoLocate), 5000);

  // ---------- admin dashboard: vendor marketplace numbers ----------
  // Sample vendors (and their bookings / reviews) are left out of the real numbers and only counted in `sample`.
  // Booking value is what customers pay the vendors directly — never shop revenue.
  const LIVE = ['requested', 'confirmed', 'completed'];
  const everConfirmed = b => !!b.confirmedAt || ['confirmed', 'completed'].includes(b.status);
  function dashboard(inR) {
    const sampleIds = new Set(vendors().filter(v => v.sample).map(v => v.id));
    const real = vbookings().filter(b => !sampleIds.has(b.vendorId)), inP = real.filter(b => inR(b.createdAt)), live = inP.filter(b => LIVE.includes(b.status));
    const sum = list => list.reduce((a, b) => a + (b.total || 0), 0);
    const byStatus = Object.fromEntries(BOOKING_STATUSES.map(s => { const l = inP.filter(b => b.status === s); return [s, { n: l.length, value: sum(l) }]; }));
    // confirmation rate over requests the vendor answered (confirmed at some point, or turned down)
    const answered = inP.filter(b => everConfirmed(b) || b.status === 'rejected'), hours = inP.filter(b => b.confirmedAt).map(b => (Date.parse(b.confirmedAt) - Date.parse(b.createdAt)) / 36e5);
    const group = (keyOf, init) => { const m = {}; for (const b of live) { const k = keyOf(b); const g = m[k] || (m[k] = { ...init(b), n: 0, value: 0 }); g.n++; g.value += b.total || 0; } return Object.values(m).sort((a, b) => b.value - a.value || b.n - a.n); };
    const rentals = {};
    for (const b of live) for (const i of b.items || []) if (i.rental) {
      const c = TENT_CATS.find(x => x.id === i.category) || TENT_CATS[TENT_CATS.length - 1], g = rentals[c.id] || (rentals[c.id] = { id: c.id, name: c.name, emoji: c.emoji, qty: 0, value: 0, bookings: new Set() });
      g.qty += i.qty; g.value += i.price * i.qty; g.bookings.add(b.id);
    }
    const open = real.filter(b => b.status === 'requested'), realV = vendors().filter(v => !v.sample);
    const sIn = vbookings().filter(b => sampleIds.has(b.vendorId) && inR(b.createdAt));
    return {
      requests: inP.length, value: sum(live), byStatus, cancelled: byStatus.cancelled.n, rejected: byStatus.rejected.n,
      confirmRate: answered.length ? Math.round(answered.filter(everConfirmed).length / answered.length * 100) : null, answered: answered.length,
      avgConfirmHours: hours.length ? Math.round(hours.reduce((a, x) => a + x, 0) / hours.length * 10) / 10 : null,
      waiting: open.length, oldestWaitingHours: open.length ? Math.round((Date.now() - Math.min(...open.map(b => Date.parse(b.createdAt)))) / 36e5) : 0,
      // requests released because the vendor did not answer in time (this period), and ones about to be released
      expired: inP.filter(b => b.expired).length,
      dueSoon: open.filter(b => b.answerBy && Date.parse(b.answerBy) - Date.now() < 6 * 36e5).length,
      // site visits of real vendors: new requests to fix, fixed visits still ahead
      visits: (() => { const sv = vvisits().filter(s => !sampleIds.has(s.vendorId)); return { open: sv.filter(s => s.status === 'requested').length, upcoming: sv.filter(s => s.status === 'confirmed' && s.date >= today()).length, total: sv.length }; })(),
      byType: group(b => b.type, b => ({ id: b.type, name: (TYPE[b.type] || {}).name || b.type, emoji: (TYPE[b.type] || {}).emoji || '' })),
      topVendors: group(b => b.vendorId, b => ({ id: b.vendorId, name: b.vendorName, type: (TYPE[b.type] || {}).name || b.type })).slice(0, 10),
      rentals: Object.values(rentals).map(g => ({ ...g, bookings: g.bookings.size })).sort((a, b) => b.qty - a.qty),
      vendors: {
        total: vendors().length, live: vendors().filter(visible).length, real: realV.length, sample: sampleIds.size,
        pending: realV.filter(v => !v.verified).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))).map(v => ({ id: v.id, name: v.name, type: (TYPE[v.type] || {}).name || v.type, district: (districtOf(v.district) || {}).name || '', createdAt: v.createdAt, docsPending: (v.docs || []).filter(d => d.status === 'pending').length })),
        missingPapers: realV.map(v => ({ id: v.id, name: v.name, type: (TYPE[v.type] || {}).name || v.type, verified: v.verified, missing: [...new Set(missingChecks(v).map(k => DOC_KINDS[k.split(':')[0]] || k))] })).filter(v => v.missing.length),
      },
      sample: { vendors: sampleIds.size, bookings: sIn.length, value: sum(sIn.filter(b => LIVE.includes(b.status))) },
    };
  }

  return { VENDOR_TYPES, isPerson, decodePhoto, storePhoto, dashboard, bookingsOf, vbDates, pendingCounts: () => ({ vrequests: vbookings().filter(b => b.status === 'requested').length + vvisits().filter(s => s.status === 'requested').length, vapplications: vendors().filter(v => v.status === 'pending').length, vtotal: vbookings().length }) };
};

module.exports.VENDOR_TYPES = VENDOR_TYPES;
