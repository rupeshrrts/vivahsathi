// Vivah Saathi - zero-dependency Node.js server (http + JSON file store)
require('./env'); // .env settings first, before anything reads them
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { buildSeed, EVENTS, SAMPLE_MRP, PRODUCT_PHOTOS, OLD_PRODUCT_PHOTOS, photo: seedPhoto } = require('./seed');
const { RATES: GST_RATES, validGstin, validHsn, fyOf, buildInvoice, buildCreditNote, r2 } = require('./gst');
const razorpay = require('./razorpay');
const otp = require('./otp');
const setupVendors = require('./vendors');
const { buildVendorSeed } = require('./vendors-seed');
const { districtGeo } = require('./geo');
const { setupSupabase, restoreIfEmpty } = require('./supabase');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..'); // project root (server code lives in backend/)
const PUBLIC_DIR = path.join(ROOT, 'frontend'); // the website
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(PUBLIC_DIR, 'uploads');
// runtime data (db.json, private documents) — kept out of git; can point to a mounted disk when deployed
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'database', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const FILE_BUSY = new Set(['EPERM', 'EBUSY', 'EACCES']);
const pause = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// ---------- Data store ----------
const dataFromUploads = path.relative(UPLOAD_DIR, DATA_DIR);
if (!dataFromUploads || (!path.isAbsolute(dataFromUploads) && dataFromUploads !== '..' && !dataFromUploads.startsWith('..' + path.sep))) {
  throw new Error('DATA_DIR must be outside the public uploads directory.');
}
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

let db;
// a new server with Supabase connected (SUPABASE_URL + key) and no data file yet starts from the last snapshot there
const restoredMsg = process.argv.includes('--reset') ? '' : restoreIfEmpty(DB_FILE);
if (restoredMsg) console.log(restoredMsg);
if (process.argv.includes('--reset') || !fs.existsSync(DB_FILE)) {
  db = buildSeed(hashPassword);
  // a new site never starts with a known password: the admin gets ADMIN_PASSWORD (8+ characters) or a random one,
  // written to ADMIN-LOGIN.txt next to the data (private, never in git); the demo customer gets a random one too
  const envPw = process.env.ADMIN_PASSWORD || '', pw = envPw.length >= 8 ? envPw : crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, 'x');
  const admin = db.users.find(u => u.role === 'admin');
  if (admin) admin.password = hashPassword(pw);
  for (const u of db.users.filter(x => x.role !== 'admin')) u.password = hashPassword(crypto.randomBytes(12).toString('hex'));
  if (!saveNow()) throw new Error('Could not initialize the database. Check DATA_DIR permissions and available space.');
  console.log('Database created with seed data at', DB_FILE);
  if (admin && !envPw) {
    fs.writeFileSync(path.join(DATA_DIR, 'ADMIN-LOGIN.txt'), `Vivah Saathi admin login (created ${new Date().toISOString()})\nURL:      /admin\nMobile:   ${admin.phone}\nPassword: ${pw}\n\nDelete this file after you have saved the password somewhere safe.\n`);
    console.log(`Admin login for ${admin.phone}: the password is in ${path.join(DATA_DIR, 'ADMIN-LOGIN.txt')}`);
  }
} else {
  db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  migrate();
}
// Defaults for settings added after the first release
for (const [k, v] of Object.entries({ otpLogin: true, otpRequired: false, onlinePayments: false })) if (!(k in db.settings)) db.settings[k] = v;
// Vendor marketplace data (sample vendors are added once; admin can remove them)
if (!db.vendors) {
  Object.assign(db, buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10)), { vbookings: [], vendorSeedVersion: 14 });
  saveNow();
  console.log('Vendor marketplace added with sample vendors');
}
// v2: individual cooks, person profiles (photo, experience, languages) and more Pandit Ji
if ((db.vendorSeedVersion || 1) < 2) {
  const seed = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10));
  if (!db.samplesRemoved) {
    for (const sv of seed.vendors) {
      const v = db.vendors.find(x => x.id === sv.id);
      if (!v) { db.vendors.push(sv); db.vlistings.push(...seed.vlistings.filter(l => l.vendorId === sv.id)); continue; }
      if (!v.sample) continue;
      for (const k of ['subtype', 'speciality']) if (!v[k]) v[k] = sv[k];
      if (!v.experienceYears) v.experienceYears = sv.experienceYears;
      if (!v.languages || !v.languages.length) v.languages = sv.languages;
    }
  }
  for (const v of db.vendors) {
    if (v.type === 'catering' && !v.subtype) v.subtype = 'caterer';
    for (const [k, d] of [['profilePhoto', ''], ['experienceYears', 0], ['languages', []], ['speciality', '']]) if (!(k in v)) v[k] = d;
  }
  db.vendorSeedVersion = 2;
  saveNow();
  console.log('Vendor marketplace upgraded: individual cooks and Pandit Ji profiles');
}
// v3: vendors can mark dates already booked outside the site; sample vendors get example booked / closed dates
if (db.vendorSeedVersion < 3) {
  const seed = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10));
  for (const v of db.vendors) {
    if (!Array.isArray(v.bookedDates)) v.bookedDates = [];
    const sv = v.sample && seed.vendors.find(x => x.id === v.id);
    if (sv && !v.bookedDates.length && !(v.blockedDates || []).length) { v.bookedDates = sv.bookedDates; v.blockedDates = sv.blockedDates; }
  }
  db.vendorSeedVersion = 3;
  saveNow();
}
// v4: more sample arkestra groups & artists
if (db.vendorSeedVersion < 4) {
  const seed = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10));
  if (!db.samplesRemoved) for (const sv of seed.vendors) {
    if (db.vendors.some(x => x.id === sv.id)) continue;
    db.vendors.push(sv); db.vlistings.push(...seed.vlistings.filter(l => l.vendorId === sv.id));
  }
  db.vendorSeedVersion = 4;
  saveNow();
  console.log('Vendor marketplace upgraded: more arkestra samples');
}
// v5: each sample arkestra group / artist gets its own photo (only where the old shared photos are untouched)
if (db.vendorSeedVersion < 5) {
  const seed = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10));
  const OLD = ['1574155376612-bfa4ed8aabfd', '1738151466731-7d98e3fe6b3c', '1764303709029-a79bc7f1d076', '1470225620780-dba8ba36b745'];
  const untouched = list => list.length && list.every(p => OLD.some(o => String(p).includes(o)));
  for (const v of db.vendors) {
    const sv = v.sample && v.type === 'orchestra' && seed.vendors.find(x => x.id === v.id);
    if (!sv) continue;
    if (untouched(v.photos || [])) v.photos = sv.photos;
    for (const l of db.vlistings.filter(x => x.vendorId === v.id)) {
      const sl = seed.vlistings.find(x => x.id === l.id);
      if (sl && untouched([l.photo || ''])) l.photo = sl.photo;
    }
  }
  db.vendorSeedVersion = 5;
  saveNow();
}
// v6: individual car owners (owner-driver) samples
if (db.vendorSeedVersion < 6) {
  const seed = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10));
  if (!db.samplesRemoved) for (const sv of seed.vendors) {
    if (db.vendors.some(x => x.id === sv.id)) continue;
    db.vendors.push(sv); db.vlistings.push(...seed.vlistings.filter(l => l.vendorId === sv.id));
  }
  db.vendorSeedVersion = 6;
  saveNow();
  console.log('Vendor marketplace upgraded: individual car owners');
}
// v7: sample halwai / cooks get prices by number of guests (100 / 200 / 300 log ...)
if (db.vendorSeedVersion < 7) {
  const seed = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10));
  for (const l of db.vlistings) {
    const sl = seed.vlistings.find(x => x.id === l.id);
    const v = db.vendors.find(x => x.id === l.vendorId);
    if (!Array.isArray(l.guestTiers)) l.guestTiers = [];
    if (sl && v && v.sample && sl.guestTiers.length && !l.guestTiers.length) { l.guestTiers = sl.guestTiers; l.price = sl.price; }
  }
  db.vendorSeedVersion = 7;
  saveNow();
  console.log('Vendor marketplace upgraded: halwai prices by number of guests');
}
// v8: halwai / cooks list the dishes they can make
if (db.vendorSeedVersion < 8) {
  const seed = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10));
  for (const v of db.vendors) {
    if (!Array.isArray(v.dishes)) v.dishes = [];
    const sv = v.sample && seed.vendors.find(x => x.id === v.id);
    if (sv && sv.dishes.length && !v.dishes.length) v.dishes = sv.dishes;
  }
  db.vendorSeedVersion = 8;
  saveNow();
  console.log('Vendor marketplace upgraded: halwai dish lists');
}
// v9: arkestra groups list their team (artists with photo, work, ladies / total)
if (db.vendorSeedVersion < 9) {
  const seed = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10));
  for (const v of db.vendors) {
    if (!Array.isArray(v.team)) v.team = [];
    const sv = v.sample && seed.vendors.find(x => x.id === v.id);
    if (sv && sv.team.length && !v.team.length) v.team = sv.team;
  }
  db.vendorSeedVersion = 9;
  saveNow();
  console.log('Vendor marketplace upgraded: arkestra teams');
}
// v10: sample vendors get a shop / home pin so customers can see the nearest first
if (db.vendorSeedVersion < 10) {
  const seed = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10));
  for (const v of db.vendors) {
    const sv = v.sample && seed.vendors.find(x => x.id === v.id);
    if (sv && sv.district === v.district && v.lat == null && sv.lat != null) { v.lat = sv.lat; v.lng = sv.lng; }
  }
  db.vendorSeedVersion = 10;
  saveNow();
  console.log('Vendor marketplace upgraded: vendor locations');
}
// v11: sample vendors get their district's pincode (same pincode as the customer is shown first)
if (db.vendorSeedVersion < 11) {
  const seed = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10));
  for (const v of db.vendors) {
    const sv = v.sample && seed.vendors.find(x => x.id === v.id);
    if (sv && sv.district === v.district && !v.pincode) v.pincode = sv.pincode;
  }
  db.vendorSeedVersion = 11;
  saveNow();
}
// v12: sample wholesale mithai (bulk rates + boxes) and wedding card printer (design gallery) in Siwan
if (db.vendorSeedVersion < 12) {
  const seed = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10));
  if (!db.samplesRemoved) for (const sv of seed.vendors.filter(x => ['sweets', 'cards'].includes(x.type) && x.district === 'br-siwan')) {
    if (db.vendors.some(x => x.id === sv.id)) continue;
    db.vendors.push(sv); db.vlistings.push(...seed.vlistings.filter(l => l.vendorId === sv.id));
  }
  db.vendorSeedVersion = 12;
  saveNow();
  console.log('Vendor marketplace upgraded: wholesale mithai & card designs');
}
// v13: Siwan demo set — a fully filled sample in every category (incl. two ration shops to compare) — and the
// ingredient catalog details (brand / quality / pack size) on sample ration items that already exist
if (db.vendorSeedVersion < 13) {
  const seed = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10));
  if (!db.samplesRemoved) for (const sv of seed.vendors) {
    if (db.vendors.some(x => x.id === sv.id)) continue;
    db.vendors.push(sv); db.vlistings.push(...seed.vlistings.filter(l => l.vendorId === sv.id));
  }
  db.vendorSeedVersion = 13;
  saveNow();
  console.log('Vendor marketplace upgraded: Siwan demo vendors in every category');
}
// v14: listings in the same format the Vendor Panel saves — ingredient keys from the shared list,
// vehicles with seats / AC / km / driver as their own fields, no leftover pack size on kg / litre items
if (db.vendorSeedVersion < 14) {
  const KEY = { 'dal-arhar': 'arhar-dal', 'haldi-powder': 'haldi' };
  const veh = new Set(db.vendors.filter(v => v.type === 'vehicle').map(v => v.id));
  const dulha = new Set(db.vendors.filter(v => v.type === 'vehicle' && v.subtype === 'dulha').map(v => v.id));
  for (const l of db.vlistings) {
    if (KEY[l.item]) l.item = KEY[l.item];
    if (['kg', 'litre', 'quintal', 'piece'].includes(l.unit) && l.packSize) l.packSize = 0;
    if (veh.has(l.vendorId) && !dulha.has(l.vendorId) && !('seats' in l)) {
      const txt = `${l.specs || ''} ${l.name}`;
      l.seats = Number((/(\d+)\s*seat/i.exec(txt) || [])[1] || 0);
      l.ac = /\bnon[- ]?ac\b/i.test(txt) ? false : /\bac\b/i.test(txt) ? true : null;
      l.km = ((/(\d+\s*km(?:\s*\/\s*\d+\s*hrs?)?)/i.exec(txt) || [])[1] || '');
      l.driver = /with driver|driver included|chauffeur/i.test(txt) || /driver included/i.test(JSON.stringify(db.vendors.find(v => v.id === l.vendorId).tags || []));
    }
  }
  db.vendorSeedVersion = 14;
  saveNow();
  console.log('Vendor marketplace upgraded: listings in the Vendor Panel format');
}
// Pandit Ji pujas are for one rasam each: Vivah sanskar on the shaadi, Tilak puja on the tilak... (admin can change)
if (!db.serviceEventsSet) {
  const FOR = { p_010: ['Shaadi (Vivah)'], p_011: ['Tilak / Chheka'], p_012: ['Haldi', 'Matkor'] };
  for (const p of db.products) if (FOR[p.id] && !(p.events || []).length) { p.events = FOR[p.id]; if (!p.events.includes(p.defaultEvent)) p.defaultEvent = p.events[0]; }
  db.serviceEventsSet = true;
  saveNow();
}
// Full ceremony Pandit Ji covers every rasam (Tilak, Haldi, Matkor, Shaadi) — the customer gives each date
if (!db.fullCeremonyCovers) {
  const p = db.products.find(x => x.id === 'p_010');
  if (p && !(p.covers || []).length) {
    p.covers = ['Tilak / Chheka', 'Haldi', 'Matkor', 'Shaadi (Vivah)']; p.events = []; p.defaultEvent = 'Shaadi (Vivah)';
    const line = 'Pandit Ji on every rasam date: Tilak, Haldi, Matkor & Vivah (you give the dates)';
    if (!(p.includes || []).includes(line)) p.includes = [line, ...(p.includes || [])];
  }
  db.fullCeremonyCovers = true;
  saveNow();
}
// Haldi & Matkor puja: one booking, a date for haldi and / or matkor
if (!db.haldiMatkorCovers) {
  const p = db.products.find(x => x.id === 'p_012');
  if (p && !(p.covers || []).length && (p.events || []).join() === 'Haldi,Matkor') { p.covers = ['Haldi', 'Matkor']; p.events = []; }
  db.haldiMatkorCovers = true;
  saveNow();
}
// Sample Pandit Ji vendors in the same booking format: Tilak puja only for Tilak, vivah only on the shaadi, the full
// vivah sanskar covers every rasam (each on its own date); katha / kundli stay "any function". Unset fields only.
if (!db.vendorPanditEvents) {
  const FULL = ['Tilak / Chheka', 'Haldi', 'Matkor', 'Shaadi (Vivah)'];
  const pandits = new Set((db.vendors || []).filter(v => v.sample && v.type === 'pandit').map(v => v.id));
  for (const l of db.vlistings || []) {
    if (!pandits.has(l.vendorId) || (l.events || []).length || (l.covers || []).length) continue;
    if (l.item === 'tilak') l.events = ['Tilak / Chheka'];
    else if (['haldi', 'haldi-puja'].includes(l.item)) l.covers = ['Haldi', 'Matkor'];
    else if (l.item === 'vivah') { if (/full ceremony/i.test(l.name)) l.covers = FULL; else l.events = ['Shaadi (Vivah)']; }
  }
  db.vendorPanditEvents = true;
  saveNow();
}
// One person, one wedding a day: Pandit Ji, mehndi artists, makeup artists, individual cooks, solo artists and
// owner-drivers are set to 1 booking per date (the booking rules in vendors.js enforce it from now on)
if (!db.onePersonOneDate) {
  const person = v => v.type === 'pandit' || v.type === 'mehndi' || (v.type === 'makeup' && v.subtype === 'artist') || (v.type === 'catering' && v.subtype === 'cook') || (v.type === 'orchestra' && v.subtype === 'artist') || (v.type === 'vehicle' && v.subtype === 'owner');
  const owners = new Set();
  for (const v of db.vendors || []) if (person(v)) { v.capacityPerDay = 1; if (v.type === 'vehicle') owners.add(v.id); }
  for (const l of db.vlistings || []) if (owners.has(l.vendorId)) l.units = 1;
  db.onePersonOneDate = true;
  saveNow();
}
// Samagri kits list every item they contain (how much is in the kit) with a price to add more of it; customers can add
// extra quantity of any kit item, or items from the other kits. key | name | in the kit | sold extra per | price per that.
// Sample prices on the shop's own kits — the admin edits them in the product form.
if (!db.kitItemsSet) {
  const I = (key, name, inKit, unit, price) => ({ key, name, inKit, unit, price });
  const ROLI = I('roli', 'Roli', '50 g', '50 g pack', 20), AKSHAT = I('akshat', 'Akshat (chawal)', '250 g', '250 g pack', 30), JANEU = I('janeu', 'Janeu', '2 pair', 'pair', 15);
  const SUPARI = I('supari', 'Supari', '100 g', '100 g pack', 60), PAAN = I('paan', 'Paan patta', '21 pcs', '21 pcs', 30), DIYA = I('diya', 'Mitti ke diye', '21 pcs', '21 pcs', 40);
  const HALDI = I('haldi', 'Haldi powder', '100 g', '100 g pack', 25), SINDOOR = I('sindoor', 'Sindoor', '50 g', '50 g pack', 30), CHANDAN = I('chandan', 'Chandan', '50 g', '50 g pack', 60);
  const AAMPATTA = I('aampatta', 'Aam patta', '1 bunch', 'bunch', 20), PEELA = I('peelakapda', 'Peela kapda', '2 m', 'metre', 60), KALASHM = I('mittikalash', 'Mitti ka kalash', '1', 'piece', 60);
  const HAVAN = I('havan', 'Havan samagri', '1 kg', 'kg', 120), LAKDI = I('aamlakdi', 'Aam ki lakdi', '5 kg', 'kg', 25), KAPOOR = I('kapoor', 'Kapoor', '50 g', '50 g pack', 60);
  const KITS = {
    'Vivah Puja Samagri Complete Kit': [I('kalash', 'Kalash (tamba)', '1', 'piece', 220), I('nariyal', 'Nariyal', '2', 'piece', 40), ROLI, I('kumkum', 'Kumkum', '50 g', '50 g pack', 20), HALDI, AKSHAT, JANEU,
      I('mauli', 'Mauli / kalawa', '2 rolls', 'roll', 15), SUPARI, I('laung', 'Laung & elaichi', '20 g', '20 g pack', 40), I('panchmeva', 'Panchmeva (dry fruits)', '250 g', '250 g pack', 180), HAVAN, LAKDI,
      I('ghee', 'Ghee', '500 g', '500 g', 330), KAPOOR, I('dhoop', 'Dhoop & agarbatti', '1 pack', 'pack', 40), DIYA, PAAN, AAMPATTA, I('gangajal', 'Gangajal', '250 ml', 'bottle', 40), SINDOOR, CHANDAN,
      I('phoolmala', 'Phool mala (genda)', '2', 'piece', 50), I('laalkapda', 'Peela / laal kapda', '2 m', 'metre', 60)],
    'Haldi Rasam Kit': [I('haldipaste', 'Kachchi haldi paste', '500 g', '500 g pack', 90), I('ubtan', 'Ubtan (besan, chandan, gulab jal)', '1 set', 'set', 120), AAMPATTA, I('dubh', 'Dubh ghaas', '1 bunch', 'bunch', 15), PEELA, KALASHM, DIYA],
    'Tilak Ceremony Kit': [I('tilakthali', 'Decorated tilak thali', '1', 'piece', 250), ROLI, CHANDAN, AKSHAT, I('nariyalchunri', 'Nariyal with chunri', '1', 'piece', 80), JANEU, SUPARI, PAAN, I('mithaidabba', 'Mithai dabba', '1 kg', 'box (1 kg)', 450), I('lifafa', 'Shagun lifafa', '11 pcs', '11 pcs', 55)],
    'Sindoordaan Kit': [I('sindhora', 'Wooden sindoor-dani (sindhora)', '1', 'piece', 250), I('sindoor100', 'Pure sindoor', '100 g', '100 g pack', 50), I('chunri', 'Laal chunri / odhni', '1', 'piece', 180), I('bichhiya', 'Bichhiya (silver plated)', '1 pair', 'pair', 150), I('mangalbox', 'Mangalsutra box', '1', 'piece', 120)],
    'Kohbar & Mandap Puja Kit': [I('kohbar', 'Kohbar painting sheet (Madhubani)', '1', 'piece', 350), I('mandapkalash', 'Mandap kalash set', '5 pcs', 'set of 5', 300), I('toran', 'Aam patta toran', '1', 'piece', 80), I('diya51', 'Mitti ke diye', '51 pcs', '51 pcs', 90), I('kush', 'Bamboo & kush ghaas', '1 bunch', 'bunch', 60)],
    'Matkor (Mati Puja) Kit': [I('kudal', 'Kudal (decorated)', '1', 'piece', 150), I('kalashdakkan', 'Mitti ka kalash & dakkan', '1', 'piece', 70), HALDI, SINDOOR, AKSHAT, PEELA, PAAN, SUPARI],
    'Dala-Dauri Bamboo Basket Set': [I('dala', 'Big dala', '2', 'piece', 150), I('dauri', 'Dauri', '2', 'piece', 100), I('supali', 'Supali', '2', 'piece', 80), I('pitari', 'Painted pitari', '1', 'piece', 120)],
    'Havan Samagri & Aam Lakdi Pack': [HAVAN, LAKDI, KAPOOR, I('ghee250', 'Ghee', '250 g', '250 g', 170)],
    'Lava (Khil) & Lava Parchhan Set': [I('lava', 'Lava (khil)', '1 kg', 'kg', 80), I('soop', 'Decorated soop', '1', 'piece', 120), I('diya5', 'Mitti ke diye', '5 pcs', '5 pcs', 15), I('akshatphool', 'Akshat & phool', '1 pack', 'pack', 30)],
  };
  for (const p of db.products) {
    const k = Object.keys(KITS).find(n => p.name.startsWith(n));
    if (k && !(p.kitItems || []).length) p.kitItems = KITS[k].map(x => ({ ...x }));
  }
  db.kitItemsSet = true;
  saveNow();
}
// Flowers: every mala / jaimala / petals product shows its styles (each with a photo and its own price) and loose
// flowers can be bought on their own (by kg, bunch or stems). Sample styles reuse the shop's flower photos as a
// prototype — the admin replaces them with real photos of each style in the product form.
if (!db.flowerStyles) {
  const ph = id => `https://images.unsplash.com/photo-${id}?w=600&h=600&fit=crop&auto=format&q=70`;
  const GENDA = ph('1789971649652-ae5dfeeaa7b4'), JAIMALA = ph('1788357928572-adbdfa7f8613'), PETALS = ph('1762328845997-c1fc8519b2e2'), MIX = ph('1598284653127-24eb19dd82db');
  const S = (key, name, price, photo, note, unit) => ({ key, name, price, photo, note, ...(unit ? { unit } : {}) });
  const STYLES = {
    'Genda Phool Mala': [S('orange', 'Orange genda mala', 1200, GENDA, 'Classic 5 ft strings'), S('mix', 'Yellow & orange mix', 1250, GENDA, 'Two-colour strings'),
      S('rajni', 'Genda + rajnigandha (white)', 1600, GENDA, 'Orange with white rajnigandha'), S('rose', 'Genda + rose', 1800, JAIMALA, 'Orange genda with red roses'),
      S('ladi', 'Long ladi for gate & mandap', 1400, GENDA, '8 ft strings for hanging')],
    'Jaimala Pair': [S('classic', 'Rose & rajnigandha (classic)', 1500, JAIMALA, 'Most chosen'), S('redrose', 'Full red rose', 1800, JAIMALA, 'Thick red rose varmala'),
      S('premium', 'Orchid & carnation (premium)', 2800, MIX, 'Imported flowers, extra soft'), S('simple', 'Genda & rose (simple)', 900, GENDA, 'Budget pair')],
    'Fresh Rose Petals': [S('1kg', '1 kg pack', 400, PETALS, 'Welcome & aarti', '1 kg'), S('2kg', '2 kg pack', 750, PETALS, 'Varmala & stage', '2 kg'), S('5kg', '5 kg pack', 1800, PETALS, 'Baraat & bidaai shower', '5 kg')],
  };
  for (const p of db.products) {
    const k = Object.keys(STYLES).find(n => p.name.startsWith(n));
    if (!k || (p.styles || []).length) continue;
    p.styles = STYLES[k];
    p.price = p.mrp = Math.min(...p.styles.map(s => s.price)); // cards show the "from" price
    if (p.styles[0].unit) p.unit = p.styles[0].unit;
  }
  // loose flowers, sold on their own
  const at = new Date().toISOString();
  const LOOSE = [['p_l01', 'Loose Genda Phool', 'खुला गेंदा फूल', 120, 'kg', '🌼', GENDA, 'Fresh marigold flowers, loose — for rangoli, thali, pooja and making your own mala.'],
    ['p_l02', 'Loose Gulab Phool (25 stems)', 'खुला गुलाब (25 डंडी)', 300, '25 stems', '🌹', JAIMALA, 'Fresh red roses with stems — for bouquets, stage and car.'],
    ['p_l03', 'Rajnigandha Bunch (10 sticks)', 'रजनीगंधा गुच्छा', 150, 'bunch', '🤍', JAIMALA, 'White, fragrant rajnigandha sticks — for vases, mandap and jaimala.']];
  for (const [id, name, nameHi, price, unit, emoji, image, desc] of LOOSE) if (!db.products.some(p => p.id === id))
    db.products.push({ id, cat: 'decoration', type: 'product', name, nameHi, price, mrp: price, unit, emoji, image, desc, includes: [], featured: false, minQty: 1, stock: 200, active: true, districts: 'all', createdAt: at, defaultEvent: '', dailyCapacity: 0, loose: true });
  db.flowerStyles = true;
  saveNow();
}
// Sample decorator listings get styles too (each with its own price), using the listing's own photo as the prototype
if (!db.vendorFlowerStyles) {
  const SV = {
    'Jaimala Pair': [['classic', 'Rose & rajnigandha (classic)', 1200, 'Most chosen'], ['redrose', 'Full red rose', 1500, 'Thick red varmala'], ['premium', 'Orchid & carnation', 2400, 'Extra soft, imported'], ['simple', 'Genda & rose', 800, 'Budget pair']],
    'Genda Phool Ladi': [['orange', 'Orange genda', 450, 'Classic strings'], ['rajni', 'Genda + rajnigandha', 650, 'With white rajnigandha'], ['rose', 'Genda + rose', 750, 'With red roses']],
    'Doli Car Flower Decoration': [['simple', 'Front & back (simple)', 2500, 'Bonnet + dickey'], ['full', 'Full car rose', 4500, 'Bonnet, sides, roof'], ['premium', 'Orchid & lily (premium)', 7500, 'Imported flowers']],
  };
  const sample = new Set((db.vendors || []).filter(v => v.sample && v.type === 'decoration').map(v => v.id));
  for (const l of db.vlistings || []) {
    if (!sample.has(l.vendorId) || (l.styles || []).length || l.rental || (l.guestTiers || []).length) continue;
    const k = Object.keys(SV).find(n => l.name.toLowerCase().startsWith(n.toLowerCase()));
    if (!k) continue;
    l.styles = SV[k].map(([key, name, price, note]) => ({ key, name, price, note, photo: l.photo || '' }));
    l.price = Math.min(...l.styles.map(s => s.price));
  }
  db.vendorFlowerStyles = true;
  saveNow();
}
// Tent packages say how big they are ("40×60 ft" or sold per 1000 sq ft) so the site can show the area, how many
// guests fit and a drawn top view of the set-up; `gallery` = more photos of how it looks (the admin adds real ones)
if (!db.tentSizes) {
  const SIZE = { 'Shamiyana (40×60 ft)': '40×60 ft', 'German Hangar Tent': 'per 1000 sq ft', 'Vivah Mandap': '12×12 ft', 'Jaimala Stage': '16×12 ft', 'Royal Red & Gold Tent': '50×60 ft',
    'White Drape Reception Tent': '40×60 ft', 'Canopy & Fairy-Light Lawn': '50×60 ft', 'Chandelier Premium Tent': '60×80 ft', 'Wedding Stage & Sofa': '20×12 ft' };
  for (const p of db.products.filter(x => x.cat === 'tent')) {
    const k = Object.keys(SIZE).find(n => p.name.startsWith(n));
    if (k && !p.tentSize) p.tentSize = SIZE[k];
    if (!Array.isArray(p.gallery)) p.gallery = [];
  }
  db.tentSizes = true;
  saveNow();
}
// Sample orchestra groups: extra lady dancers and singers a family can add to the show, per show, limited per date
if (!db.orchestraExtras) {
  const at = new Date().toISOString();
  for (const v of (db.vendors || []).filter(x => x.sample && x.type === 'orchestra' && x.subtype === 'group')) {
    if ((db.vlistings || []).some(l => l.vendorId === v.id && l.staff)) continue;
    const ladies = (v.team || []).filter(t => t.gender === 'female').reduce((s, t) => s + (t.count || 1), 0), ph = (v.photos || [])[0] || '';
    db.vlistings.push({ id: `${v.id}_xd`, vendorId: v.id, name: 'Extra lady dancer', nameHi: 'अतिरिक्त महिला डांसर', staff: 'dancer', price: 2500, unit: 'dancer / show', units: Math.max(3, ladies + 1), specs: 'Joins the group for your night',
      item: '', stock: 0, minQty: 0, photo: ph, photos: ph ? [ph] : [], guestTiers: [], events: [], covers: [], active: true, createdAt: at });
    db.vlistings.push({ id: `${v.id}_xs`, vendorId: v.id, name: 'Extra singer', nameHi: 'अतिरिक्त गायक', staff: 'singer', price: 3000, unit: 'singer / show', units: 2, specs: 'Bhojpuri / filmi songs',
      item: '', stock: 0, minQty: 0, photo: ph, photos: ph ? [ph] : [], guestTiers: [], events: [], covers: [], active: true, createdAt: at });
  }
  db.orchestraExtras = true;
  saveNow();
}
// Many tent houses also rent bartan: sample tent houses list a few under "Bartan & kitchen"
if (!db.tentBartanSample) {
  const ph = 'https://images.unsplash.com/photo-1586969593928-1c87c1f9c2ef?w=800&h=600&fit=crop&auto=format&q=70', at = new Date().toISOString();
  const ITEMS = [['Degchi (bada)', 'देगची (बड़ा)', '50 litre', 150, 8], ['Kadhai (bada)', 'कड़ाही (बड़ी)', '36 inch', 250, 4], ['Steel balti', 'स्टील बाल्टी', '20 litre', 30, 40], ['Steel thali', 'स्टील थाली', 'per piece', 4, 600]];
  for (const v of (db.vendors || []).filter(x => x.sample && x.type === 'tent' && x.subtype !== 'light')) {
    if ((db.vlistings || []).some(l => l.vendorId === v.id && l.category === 'bartan')) continue;
    ITEMS.forEach(([name, nameHi, size, price, units], i) => db.vlistings.push({ id: `${v.id}_bt${i + 1}`, vendorId: v.id, name, nameHi, item: '', rental: true, category: 'bartan', size, features: [], specs: '', price, unit: name === 'Steel thali' ? 'piece' : 'piece / day',
      units, stock: 0, minQty: 0, photo: ph, photos: [ph], guestTiers: [], active: true, createdAt: at }));
  }
  db.tentBartanSample = true;
  saveNow();
}
// Sample photo / video studios: the day package becomes "coverage per function" with service types (photo only,
// photo + video, candid + cinematic), drone becomes a per-function add-on, plus an extra cameraman and an album
if (!db.studioShootPlan) {
  const at = new Date().toISOString(), r500 = n => Math.round(n / 500) * 500;
  for (const v of (db.vendors || []).filter(x => x.sample && x.type === 'studio')) {
    const own = (db.vlistings || []).filter(l => l.vendorId === v.id);
    if (own.some(l => l.shoot)) continue;
    const day = own.find(l => l.unit === 'day'), ph = (day && day.photo) || (v.photos || [])[0] || '';
    if (day) {
      const base = day.price;
      Object.assign(day, { name: 'Shoot per function', nameHi: 'हर फंक्शन की शूटिंग', unit: 'function', shoot: 'day', specs: 'Pick the service type for each function — Tilak, Haldi, Shaadi…', covers: [], events: [],
        styles: [{ key: 'photo', name: 'Photo only', price: r500(base * 0.5), note: '1 photographer · traditional photos', photo: '' },
          { key: 'photo-video', name: 'Photo + Video', price: base, note: 'Photographer + videographer · full HD video', photo: '' },
          { key: 'candid-cinematic', name: 'Candid + Cinematic', price: r500(base * 1.6), note: 'Candid photos + cinematic film', photo: '' }] });
      day.price = Math.min(...day.styles.map(s => s.price));
    }
    for (const l of own) {
      if (/drone/i.test(l.name)) Object.assign(l, { shoot: 'addon', unit: 'function' });
      else if (/haldi|mehndi/i.test(l.name) && l !== day) Object.assign(l, { shoot: 'day', unit: 'function', events: ['Haldi', 'Mehndi'] });
      else if (/pre-?wedding/i.test(l.name)) Object.assign(l, { shoot: 'once', specs: l.specs || 'Shoot date fixed with the studio' });
    }
    const add = (sfx, name, nameHi, price, unit, shoot, specs) => db.vlistings.push({ id: `${v.id}_${sfx}`, vendorId: v.id, name, nameHi, item: '', price, unit, shoot, specs, stock: 0, units: 1, minQty: 0,
      photo: ph, photos: ph ? [ph] : [], guestTiers: [], events: [], covers: [], active: true, createdAt: at });
    add('xc', 'Extra cameraman', 'अतिरिक्त कैमरामैन', 4000, 'function', 'addon', 'One more photographer for a big function');
    add('al', 'Photo album (40 pages)', 'फोटो एल्बम (40 पेज)', 6000, 'album', 'once', 'Karizma album · 12x36 inch');
  }
  db.studioShootPlan = true;
  saveNow();
}
// Sample ration shops: the same item in more than one company (each its own listing with price, stock and photo),
// so families see the "Company / brand" choice. Prices are a % of the shop's own price for that item.
if (!db.rationBrands) {
  const at = new Date().toISOString();
  const MORE = { 'rice-basmati': [['Daawat Rozana', 'Standard', -.12], ['Loose 1121 Sella', 'Economy', -.22]], 'mustard-oil': [['Patanjali', 'Standard', -.06], ['Engine', 'Standard', -.03]],
    ghee: [['Amul', 'Premium', .04], ['Patanjali', 'Standard', -.05]], 'arhar-dal': [['Tata Sampann (unpolished)', 'Premium', .14]], atta: [['Aashirvaad Select', 'Premium', .2]], salt: [['Aashirvaad', 'Premium', .1]] };
  for (const v of (db.vendors || []).filter(x => x.sample && x.type === 'ration')) {
    const own = (db.vlistings || []).filter(l => l.vendorId === v.id && l.active);
    for (const [key, extra] of Object.entries(MORE)) {
      // the shop's retail listing of that item (per kg / litre), only if it has just the one brand
      const base = own.filter(l => l.item === key);
      if (base.length !== 1 || !['kg', 'litre'].includes(base[0].unit)) continue;
      const b = base[0];
      if (!b.brand) b.brand = 'Loose';
      extra.forEach(([brand, quality, pct], i) => db.vlistings.push({ id: `${b.id}_b${i + 1}`, vendorId: v.id, name: b.name, nameHi: b.nameHi || '', item: key, brand, quality, price: Math.max(1, Math.round(b.price * (1 + pct))),
        unit: b.unit, stock: Math.max(10, Math.round((b.stock || 50) / 2)), units: 1, minQty: b.minQty || 0, bulkTiers: [], packSize: b.packSize || 0, photo: b.photo || '', photos: b.photo ? [b.photo] : [],
        specs: b.specs || '', guestTiers: [], events: [], covers: [], active: true, createdAt: at }));
    }
  }
  db.rationBrands = true;
  saveNow();
}
// a product's style chosen in the cart (or its first style when none was chosen)
const styleOf = (p, key) => ((p.styles || []).length ? p.styles.find(s => s.key === key) || p.styles[0] : null);
// Every kit item of the same category (each key once): a kit's own items plus the ones it can add from other kits
function kitPool(cat) {
  const seen = new Map();
  for (const p of db.products) if (p.active && p.cat === cat) for (const x of p.kitItems || []) if (!seen.has(x.key)) seen.set(x.key, x);
  return [...seen.values()];
}
// Sample halwai / caterers: extra cooks and helpers for hire, and a bartan list on rent (example data on sample
// vendors only; real halwai add their own from the Vendor Panel)
if (!db.halwaiTeamBartan) {
  const BARTAN = [
    ['cooking', 'Degchi (bada)', 'देगची (बड़ा)', '50 litre', 150, 6], ['cooking', 'Kadhai (bada)', 'कड़ाही (बड़ी)', '36 inch', 250, 4],
    ['cooking', 'Bhagona / patila', 'भगोना / पतीला', '40 litre', 120, 8], ['cooking', 'Tawa (roti)', 'तवा (रोटी)', '30 inch', 100, 3],
    ['serving', 'Steel balti', 'स्टील बाल्टी', '20 litre', 30, 30], ['serving', 'Tasla / paraat', 'तसला / परात', '24 inch', 40, 20],
    ['serving', 'Steel thali', 'स्टील थाली', 'per piece', 4, 500], ['serving', 'Jug & glass set', 'जग व गिलास सेट', '1 jug + 6 glass', 50, 10],
    ['fire', 'Coal bhatti (2 chulha)', 'कोयला भट्ठी (2 चूल्हा)', '', 400, 4], ['fire', 'Gas bhatti (commercial burner)', 'गैस भट्ठी', 'cylinder not included', 500, 4],
    ['tools', 'Karchhi & jharna set', 'करछी व झरना सेट', '6 pieces', 60, 10], ['tools', 'Chakla-belan set', 'चकला-बेलन सेट', '', 30, 10],
  ];
  const at = new Date().toISOString();
  // sample photos already used in the shop: a halwai at a big kadhai (team, cooking, bhatti) and a steel bartan set (serving, tools)
  const pic = id => `https://images.unsplash.com/photo-${id}?w=400&h=300&fit=crop&auto=format&q=70`;
  const COOKING = pic('1721174233280-c55186b7cabc'), STEEL = pic('1586969593928-1c87c1f9c2ef');
  for (const v of (db.vendors || []).filter(x => x.sample && x.type === 'catering')) {
    const have = (db.vlistings || []).filter(l => l.vendorId === v.id);
    if (have.some(l => l.staff || l.rental)) continue;
    const big = v.subtype === 'caterer';
    const add = (k, x) => db.vlistings.push({ id: `${v.id}_${k}`, vendorId: v.id, item: '', stock: 0, minQty: 0, photo: '', photos: [], specs: '', guestTiers: [], events: [], covers: [], active: true, createdAt: at, ...x });
    add('cook', { name: 'Extra cook (halwai)', nameHi: 'अतिरिक्त हलवाई', staff: 'cook', price: big ? 1500 : 1200, unit: 'person / day', units: big ? 4 : 2, specs: 'Cooks with the head halwai', photo: COOKING, photos: [COOKING] });
    add('helper', { name: 'Helper (kaam wala)', nameHi: 'सहायक', staff: 'helper', price: big ? 700 : 600, unit: 'person / day', units: big ? 15 : 8, specs: 'Cutting, washing, serving', photo: COOKING, photos: [COOKING] });
    BARTAN.forEach(([category, name, nameHi, size, price, units], i) => { const ph = ['serving', 'tools'].includes(category) ? STEEL : COOKING; add('b' + (i + 1), { name, nameHi, rental: true, category, size, features: [], price, unit: name === 'Steel thali' ? 'piece' : 'piece / day', units: big ? units * 2 : units, photo: ph, photos: [ph] }); });
  }
  db.halwaiTeamBartan = true;
  saveNow();
}
// Sample Pandit Ji profiles: example pujas / jyotish skills and education (clearly marked sample; real pandits fill their own)
if (!db.panditSkillsSample) {
  const SK = [
    { group: 'Vivah', items: ['Vivah sanskar', 'Tilak / Chheka', 'Haldi & Matkor puja', 'Kanyadaan', 'Saat phere'] },
    { group: 'Puja & path', items: ['Satyanarayan katha', 'Griha pravesh', 'Rudrabhishek', 'Sundarkand path', 'Mundan sanskar'] },
    { group: 'Jyotish / Astro', items: ['Kundli milan', 'Shubh muhurat', 'Vastu', 'Grah shanti', 'Manglik dosh puja'] },
  ];
  for (const v of db.vendors) if (v.sample && v.type === 'pandit') {
    if (!(v.skills || []).length) v.skills = SK.map(g => ({ ...g, items: [...g.items] }));
    if (!(v.education || []).length) v.education = ['Shastri (Sanskrit) – sample entry', 'Acharya in Jyotish – sample entry'];
  }
  db.panditSkillsSample = true;
  saveNow();
}
// Tent Booking: sample tent house / decorator / DJ vendors get rental components (tents, chairs, lights, sound...)
// booked piece by piece per date, and a delivery charge. Sample vendors only; skipped where rental items already exist.
if (!db.tentRentalSamples) {
  const { sampleRentals, SAMPLE_RENTAL_DELIVERY } = require('./vendors-seed');
  const nowIso = new Date().toISOString();
  for (const v of (db.vendors || []).filter(x => x.sample && SAMPLE_RENTAL_DELIVERY[x.type])) {
    if (db.vlistings.some(l => l.vendorId === v.id && l.rental)) continue;
    db.vlistings.push(...sampleRentals(v, nowIso));
    if (!(v.delivery && v.delivery.available)) v.delivery = { ...SAMPLE_RENTAL_DELIVERY[v.type] };
  }
  db.tentRentalSamples = true;
  saveNow();
}
// Catalog: no made-up star ratings, and no example "MRP" that nobody entered (a changed MRP is kept)
if (!db.catalogRealOnly) {
  let n = 0;
  for (const p of db.products) {
    delete p.rating; delete p.reviews;
    if (SAMPLE_MRP[p.id] && p.mrp === SAMPLE_MRP[p.id] && p.mrp !== p.price) { p.mrp = p.price; n++; }
  }
  db.catalogRealOnly = true;
  saveNow();
  console.log(`Catalog cleaned: product ratings removed, ${n} example MRPs cleared`);
}
// Real photos for every sample product, sample vendor and sample listing / rental item (tables in seed.js and
// vendors-seed.js): a photo is filled or swapped only while it is empty or still the old seed photo — never an upload.
if (!db.samplePhotosFixed) {
  const { LISTING_PHOTOS, VENDOR_PHOTO_FIXES, photo: vPhoto } = require('./vendors-seed');
  const isOld = (url, ids) => !url || ids.some(id => id && String(url).includes('photo-' + id));
  let n = 0;
  for (const p of db.products) {
    if (!PRODUCT_PHOTOS[p.id] || !isOld(p.image, [OLD_PRODUCT_PHOTOS[p.id] || ''])) continue;
    p.image = seedPhoto(PRODUCT_PHOTOS[p.id]); n++;
  }
  const seedV = buildVendorSeed(new Date().toISOString(), new Date().toISOString().slice(0, 10)).vendors;
  for (const v of (db.vendors || []).filter(x => x.sample)) {
    const sv = seedV.find(x => x.id === v.id && x.name === v.name);
    if (!(v.photos || []).length && sv) { v.photos = sv.photos; n++; continue; }
    v.photos = (v.photos || []).map(u => { const old = Object.keys(VENDOR_PHOTO_FIXES).find(id => String(u).includes('photo-' + id)); if (old) n++; return old ? vPhoto(VENDOR_PHOTO_FIXES[old]) : u; });
  }
  const sample = new Set((db.vendors || []).filter(v => v.sample).map(v => v.id));
  for (const l of db.vlistings || []) {
    const fix = sample.has(l.vendorId) && !l.cardViews && LISTING_PHOTOS[l.name];
    if (!fix || !isOld(l.photo, fix.slice(1))) continue;
    l.photo = l.rental ? vPhoto(fix[0], 800, 600) : vPhoto(fix[0], 400, 300);
    if (Array.isArray(l.photos)) l.photos = [l.photo, ...l.photos.filter(u => !isOld(u, fix.slice(1)))];
    n++;
  }
  db.samplePhotosFixed = true;
  saveNow();
  console.log(`Sample photos: ${n} filled or fixed`);
}

// Bring an older data file up to date without touching orders, customers or admin edits
function migrate() {
  const seed = buildSeed(hashPassword);
  if ((db.version || 1) >= seed.version) return;
  for (const sc of seed.categories) {
    const c = db.categories.find(x => x.id === sc.id);
    if (!c) db.categories.push(sc); else if (!c.image) c.image = sc.image;
  }
  for (const sp of seed.products) {
    const p = db.products.find(x => x.id === sp.id);
    if (!p) { db.products.push(sp); continue; }
    if (!p.image) p.image = sp.image;
    for (const k of ['defaultEvent', 'dailyCapacity']) if (!(k in p)) p[k] = sp[k];
  }
  db.settings.banners = (db.settings.banners || []).map((b, i) => ({ ...b, image: b.image || (seed.settings.banners[i] || {}).image || '' }));
  db.packages = db.packages || [];
  for (const sk of seed.packages) if (!db.packages.some(k => k.id === sk.id)) db.packages.push(sk);
  db.analytics = db.analytics || { days: {}, products: {} };
  db.version = seed.version;
  saveNow();
  console.log('Data file upgraded to version ' + seed.version);
}

// changes are batched (150 ms after the last one), but never held back more than 1 second — with steady traffic a
// plain "wait for a quiet moment" would keep postponing the write and a crash would lose every change since
// (var, not let: data upgrades at start-up save before this line runs)
var saveTimer = null, savePendingSince = 0, SAVE_MAX_WAIT = 1000; // eslint-disable-line no-var
var dataVersion = 0; // eslint-disable-line no-var -- goes up with every change: cached public answers are then stale
var saveFailed = false;
function save() {
  dataVersion++;
  clearTimeout(saveTimer);
  if (!savePendingSince) savePendingSince = Date.now();
  saveTimer = setTimeout(saveNow, Math.max(0, Math.min(150, SAVE_MAX_WAIT - (Date.now() - savePendingSince))));
}
var sb = null; // eslint-disable-line no-var -- the live copy in Supabase (set up below; saves can come before that)
// Windows: OneDrive, antivirus or a backup tool can hold the file for a moment (EPERM / EBUSY / EACCES on rename)
function saveNow() {
  clearTimeout(saveTimer); savePendingSince = 0;
  const tmp = DB_FILE + '.tmp', text = JSON.stringify(db); // compact: smaller and faster to write than an indented file
  try {
    fs.writeFileSync(tmp, text);
    // Retry a busy rename without overwriting the last valid database in place.
    for (let i = 0; ; i++) {
      try { fs.renameSync(tmp, DB_FILE); break; } catch (e) {
        if (!FILE_BUSY.has(e.code)) throw e;
        if (i < 5) { pause(60 * (i + 1)); continue; }
        throw e;
      }
    }
  } catch (e) {
    // still could not write: the data stays in memory and is saved again shortly — the site keeps running
    console.error('Could not save the data file, trying again in 2 s:', e.message);
    saveFailed = true;
    clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 2000);
    return false;
  }
  saveFailed = false;
  if (sb) sb.changed(); // Supabase gets the change a few seconds later
  return true;
}

function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function checkPassword(pw, stored) {
  const [salt, hash] = String(stored).split(':');
  const test = crypto.scryptSync(String(pw), salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}
const uid = (p = '') => p + crypto.randomBytes(6).toString('hex');
const now = () => new Date().toISOString();

// ---------- Helpers ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
};

// a body, gzipped when the browser takes it and it is worth it (text shrinks 5–10×: less waiting on mobile data)
const wantsGzip = res => /\bgzip\b/.test((res.req && res.req.headers['accept-encoding']) || '');
function writeBody(res, status, headers, body, gz) {
  const zip = body.length > 1024 && wantsGzip(res);
  res.writeHead(status, { ...headers, Vary: 'Accept-Encoding', ...(zip ? { 'Content-Encoding': 'gzip' } : {}) });
  res.end(zip ? gz || zlib.gzipSync(body, { level: 6 }) : body);
}
function send(res, status, data) {
  const body = JSON.stringify(data);
  // a public answer (product list, vendor page…) is kept for a few seconds and given to the next visitors as is
  const gz = res.cacheKey && status === 200 ? putCache(res.cacheKey, body) : null;
  writeBody(res, status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body, gz);
}
// public answers, cached up to 10 s and only while no data has changed since (any save makes them stale)
const apiCache = new Map(), API_CACHE_MS = 10e3, API_CACHE_MAX = 3000;
const cached = key => { const e = apiCache.get(key); return e && e.v === dataVersion && Date.now() - e.at < API_CACHE_MS ? e : null; };
function putCache(key, body) {
  if (apiCache.size >= API_CACHE_MAX) apiCache.clear();
  const gz = body.length > 1024 ? zlib.gzipSync(body, { level: 6 }) : null;
  apiCache.set(key, { v: dataVersion, at: Date.now(), body, gz });
  return gz;
}
// requests per minute from one public address (a flood from one place is slowed; private / local addresses — a
// proxy in front without TRUST_PROXY, the server itself — are never limited, so real visitors are not shut out)
let hits = new Map(), hitsFrom = Date.now();
const API_PER_MIN = 1200;
const isPrivate = ip => /^(::1$|127\.|::ffff:127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::ffff:(10|192\.168|172\.(1[6-9]|2\d|3[01]))\.|f[cd])/.test(ip);
function flooding(ip) {
  if (!ip || isPrivate(ip)) return false;
  if (Date.now() - hitsFrom > 60e3) { hits = new Map(); hitsFrom = Date.now(); }
  const n = (hits.get(ip) || 0) + 1; hits.set(ip, n);
  return n > API_PER_MIN;
}
const fail = (res, status, message) => send(res, status, { error: message });

// Resolves { raw, json }; raw is kept for webhook signature checks
function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('Payload too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({ raw, json: {} });
      try { resolve({ raw, json: JSON.parse(raw) }); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// ---------- Keys for Razorpay & SMS (environment variables win over values saved in Admin) ----------
function secrets() {
  const s = db.secrets || (db.secrets = {});
  if (!s.otpPepper) { s.otpPepper = crypto.randomBytes(16).toString('hex'); save(); }
  return {
    keyId: process.env.RAZORPAY_KEY_ID || s.rzpKeyId || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || s.rzpKeySecret || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || s.rzpWebhookSecret || '',
    sms: {
      provider: process.env.SMS_PROVIDER || s.smsProvider || 'console',
      apiKey: process.env.FAST2SMS_API_KEY || s.smsApiKey || '',
      urlTemplate: process.env.SMS_URL_TEMPLATE || s.smsUrlTemplate || '',
    },
    pepper: s.otpPepper,
  };
}
const onlinePayEnabled = () => { const k = secrets(); return !!(db.settings.onlinePayments && k.keyId && k.keySecret); };
// the visitor's address for rate limits. X-Forwarded-For is only believed behind a proxy (TRUST_PROXY=1 on Render,
// Railway, Nginx…), and then its last entry — the one the proxy added; without a proxy anyone can fake that header
const clientIp = req => {
  if (process.env.TRUST_PROXY) { const xs = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean); if (xs.length) return xs[xs.length - 1]; }
  return req.socket.remoteAddress || '';
};
// tries counted in memory per key (mobile / address) over a time window — too many and the caller must wait
function limiter(max, windowMs) {
  const m = new Map();
  const live = k => { const t = Date.now(), a = (m.get(k) || []).filter(x => t - x < windowMs); if (a.length) m.set(k, a); else m.delete(k); return a; };
  return { over: k => live(k).length >= max, hit: k => { if (m.size > 50000) m.clear(); m.set(k, [...live(k), Date.now()]); }, reset: k => m.delete(k) };
}
const loginFailPhone = limiter(5, 15 * 60e3), loginFailIp = limiter(30, 60 * 60e3); // password guessing
const lookupFail = limiter(40, 60 * 60e3); // guessing order / booking number + mobile

// login sessions: { u: user id, at: when signed in }; they end after this many days (admin sooner)
const SESSION_DAYS = { admin: 7, vendor: 60, user: 60 };
function newSession(user) { const token = crypto.randomBytes(24).toString('hex'); db.sessions[token] = { u: user.id, at: now() }; save(); return token; }
const sessionUid = s => (s && typeof s === 'object' ? s.u : s);
function currentUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !Object.prototype.hasOwnProperty.call(db.sessions, token)) return null;
  const s = db.sessions[token], user = db.users.find(u => u.id === sessionUid(s));
  if (!user || user.blocked) return null;
  if (s && s.at && Date.now() - Date.parse(s.at) > (SESSION_DAYS[user.role] || 60) * 864e5) { delete db.sessions[token]; save(); return null; }
  return user;
}
const publicUser = u => u && ({ id: u.id, name: u.name, phone: u.phone, email: u.email || '', role: u.role, hasPassword: !!u.password, phoneVerified: !!u.phoneVerified, addresses: u.addresses || [], wishlist: u.wishlist || [], prefs: u.prefs || null, createdAt: u.createdAt });
// What belongs to an account: orders placed while logged in (or linked to it at order time), plus guest orders with the
// same mobile once that number is OTP-verified — a password sign-up alone does not prove the number is theirs
const ordersOf = u => db.orders.filter(o => o.userId === u.id || (!o.userId && u.phoneVerified && (o.address.phone === u.phone || o.userPhone === u.phone)));
// Saved choices that follow the customer to any device: function dates, whose wedding (side) and district
function cleanPrefs(p, old = {}) {
  const out = { events: { ...(old.events || {}) }, side: old.side || '', district: old.district || '' };
  if (p.events && typeof p.events === 'object') out.events = Object.fromEntries(Object.entries(p.events).filter(([e, d]) => EVENTS.includes(e) && /^\d{4}-\d{2}-\d{2}$/.test(String(d))));
  if ('side' in p) out.side = ['boy', 'girl', 'skip'].includes(p.side) ? p.side : '';
  if ('district' in p) out.district = db.districts.some(d => d.id === p.district) ? p.district : '';
  return { ...out, updatedAt: now() };
}

const str = (v, max = 500) => String(v == null ? '' : v).trim().slice(0, max);
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

function productAvailableIn(p, districtId) {
  if (!districtId) return true;
  const d = db.districts.find(x => x.id === districtId);
  if (d && !d.active) return false;
  return p.districts === 'all' || (Array.isArray(p.districts) && p.districts.includes(districtId));
}

// a GST rate from a form: one of the allowed rates, or null (not set — "use the category's")
const gstRateIn = v => (v === '' || v == null || !GST_RATES.includes(Number(v)) ? null : Number(v));
function sanitizeProduct(b, existing = {}) {
  const p = { ...existing };
  if ('name' in b) p.name = str(b.name, 120);
  if ('nameHi' in b) p.nameHi = str(b.nameHi, 120);
  if ('cat' in b) p.cat = str(b.cat, 60);
  if ('type' in b) p.type = b.type === 'service' ? 'service' : 'product';
  if ('price' in b) p.price = Math.max(0, Math.round(num(b.price)));
  if ('mrp' in b) p.mrp = Math.max(0, Math.round(num(b.mrp)));
  if ('unit' in b) p.unit = str(b.unit, 40);
  if ('minQty' in b) p.minQty = Math.max(1, Math.round(num(b.minQty, 1)));
  if ('emoji' in b) p.emoji = str(b.emoji, 8);
  if ('image' in b) p.image = str(b.image, 400);
  if ('desc' in b) p.desc = str(b.desc, 3000);
  if ('includes' in b) p.includes = (Array.isArray(b.includes) ? b.includes : String(b.includes).split('\n')).map(x => str(x, 200)).filter(Boolean).slice(0, 60);
  if ('stock' in b) p.stock = Math.max(0, Math.round(num(b.stock)));
  if ('active' in b) p.active = !!b.active;
  if ('featured' in b) p.featured = !!b.featured;
  if ('defaultEvent' in b) p.defaultEvent = EVENTS.includes(b.defaultEvent) ? b.defaultEvent : '';
  // functions this service is for (e.g. Tilak puja → Tilak only); empty = any function
  if ('events' in b) p.events = [...new Set((Array.isArray(b.events) ? b.events : String(b.events || '').split(',')).map(e => String(e).trim()).filter(e => EVENTS.includes(e)))];
  if ((p.events || []).length && !p.events.includes(p.defaultEvent)) p.defaultEvent = p.events[0];
  // full ceremony: the rasams one booking covers, each on its own date (e.g. Tilak + Haldi + Matkor + Shaadi)
  if ('covers' in b) p.covers = EVENTS.filter(e => (Array.isArray(b.covers) ? b.covers : String(b.covers || '').split(',')).map(x => String(x).trim()).includes(e));
  if ((p.covers || []).length) { p.events = []; p.defaultEvent = mainRasam(p); }
  if ('dailyCapacity' in b) p.dailyCapacity = Math.max(0, Math.round(num(b.dailyCapacity)));
  // GST: empty = use the category's rate / code
  if ('gstRate' in b) p.gstRate = gstRateIn(b.gstRate);
  if ('hsn' in b) p.hsn = validHsn(str(b.hsn, 8)) ? str(b.hsn, 8) : '';
  // tent size ("40×60 ft", or "per 1000 sq ft" for tents sold by area) and more photos of the set-up (one link per line)
  if ('tentSize' in b) p.tentSize = str(b.tentSize, 40).replace(/\s*[xX*]\s*/, '×');
  // the options below are styles (photo cards) or companies / brands (a dropdown with each company's price)
  if ('optKind' in b) p.optKind = b.optKind === 'brand' ? 'brand' : '';
  if ('gallery' in b) p.gallery = (Array.isArray(b.gallery) ? b.gallery : String(b.gallery || '').split('\n')).map(x => str(x, 400).trim()).filter(x => /^(https:\/\/|\/uploads\/)/.test(x)).slice(0, 8);
  // styles, one per line: name | price | photo link | note | unit (optional, e.g. "2 kg")
  if ('styles' in b) {
    const rows = Array.isArray(b.styles) ? b.styles : String(b.styles || '').split('\n').map(r => { const [name, price, photo, note, unit] = r.split('|').map(x => x.trim()); return { name, price, photo, note, unit }; });
    const keyOf = n => str(n, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const old = new Map((p.styles || []).map(x => [x.name.toLowerCase(), x.key]));
    p.styles = rows.filter(x => x && str(x.name, 80) && num(x.price) > 0).slice(0, 20).map(x => ({ key: x.key || old.get(str(x.name, 80).toLowerCase()) || keyOf(x.name), name: str(x.name, 80), price: Math.round(num(x.price)), photo: /^(https:\/\/|\/uploads\/)/.test(x.photo || '') ? str(x.photo, 400) : '', note: str(x.note, 80), ...(str(x.unit, 20) ? { unit: str(x.unit, 20) } : {}) }));
    if (p.styles.length) { p.price = p.mrp = Math.min(...p.styles.map(x => x.price)); if (p.styles[0].unit) p.unit = p.styles[0].unit; } // "from" price on cards
  }
  // kit contents, one per line: name | in the kit | sold extra per | price  (e.g. "Ghee | 500 g | 500 g | 330")
  if ('kitItems' in b) {
    const rows = Array.isArray(b.kitItems) ? b.kitItems : String(b.kitItems || '').split('\n').map(r => { const [name, inKit, unit, price] = r.split('|').map(x => x.trim()); return { name, inKit, unit, price }; });
    const keyOf = n => str(n, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const old = new Map((p.kitItems || []).map(x => [x.name.toLowerCase(), x.key]));
    p.kitItems = rows.filter(x => x && str(x.name, 80)).slice(0, 80).map(x => ({ key: x.key || old.get(str(x.name, 80).toLowerCase()) || keyOf(x.name), name: str(x.name, 80), inKit: str(x.inKit, 30), unit: str(x.unit, 30) || 'piece', price: Math.max(0, Math.round(num(x.price))) }));
  }
  // a dated service always has a limit (how many of our teams / pandits / cars can go on one date) — never unlimited
  if ((b.type || p.type) === 'service' && !p.dailyCapacity) p.dailyCapacity = 1;
  if ('districts' in b) p.districts = b.districts === 'all' ? 'all' : (Array.isArray(b.districts) ? b.districts.filter(id => db.districts.some(d => d.id === id)) : 'all');
  if (!p.mrp || p.mrp < p.price) p.mrp = p.price;
  return p;
}

function orderTotals(items, district) {
  const s = db.settings;
  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const mrpTotal = items.reduce((a, i) => a + i.mrp * i.qty, 0);
  const goodsTotal = items.filter(i => i.type === 'product').reduce((a, i) => a + i.price * i.qty, 0);
  let delivery = 0;
  if (goodsTotal > 0 && goodsTotal < s.freeDeliveryAbove) delivery = s.deliveryCharge;
  if (goodsTotal > 0 && district) delivery += district.extraCharge || 0;
  const advance = Math.round(items.filter(i => i.type === 'service').reduce((a, i) => a + i.price * i.qty, 0) * (s.advancePercent / 100));
  return { subtotal, mrpTotal, discount: mrpTotal - subtotal, delivery, total: subtotal + delivery, advance };
}

// ---------- Routes ----------
const routes = [];
const route = (method, pattern, handler, opts = {}) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler, pattern, ...opts });
};
// order / booking found by its number + mobile (track, cancel, return, review): misses are counted against guessing
const LOOKUP_PATHS = ['/api/track', '/api/track/cancel', '/api/track/return', '/api/reviews', '/api/payments/status', '/api/payments/retry', '/api/payments/start', '/api/payments/cod', '/api/payments/utr', '/api/vbookings/pay', '/api/vbookings/pay/status', '/api/vbookings/track', '/api/vbookings/cancel', '/api/vreviews'];

// Public meta
route('GET', '/api/meta', (req, res) => {
  send(res, 200, {
    settings: publicSettings(),
    categories: db.categories.filter(c => c.active).sort((a, b) => a.order - b.order).map(c => ({ ...c, off: catOff(c.id) })), // off = offer running now (%)
    districts: db.districts.filter(d => d.active).map(({ id, name, state, extraCharge }) => ({ id, name, state, extraCharge, ...districtGeo(id) })),
    packages: (db.packages || []).filter(p => p.active).sort((a, b) => a.order - b.order),
    events: EVENTS,
  });
});
function publicSettings() {
  const { siteName, tagline, phone, whatsapp, email, deliveryCharge, freeDeliveryAbove, advancePercent, banners, announcement } = db.settings;
  const k = secrets();
  return {
    siteName, tagline, phone, whatsapp, email, deliveryCharge, freeDeliveryAbove, advancePercent, banners, announcement, policy: policy(),
    business: { legalName: '', address: '', hours: '', grievanceName: '', grievanceEmail: '', gstin: '', deliveryTime: '', city: '', updated: '', ...(db.settings.business || {}) },
    payments: { online: onlinePayEnabled(), testMode: k.keyId.startsWith('rzp_test_'), upi: db.settings.upiId ? { id: db.settings.upiId, name: db.settings.upiName || siteName } : null },
    otp: { login: !!db.settings.otpLogin, required: !!db.settings.otpRequired, testMode: k.sms.provider === 'console' },
    // optional Google Maps browser key (restrict it to your domain in Google Cloud); without it the free OpenStreetMap map is used
    maps: { googleKey: process.env.GOOGLE_MAPS_KEY || db.settings.googleMapsKey || '' },
  };
}

// ---------- Category offers: "10% off on all Mithai" (Admin → Categories) ----------
// The offer price is what customers see and what the server charges; the price before it is kept to show crossed out.
function catOff(catId) {
  const c = db.categories.find(x => x.id === catId), pct = c ? Number(c.offPct) || 0 : 0;
  return pct > 0 && c.active !== false && (!c.offUntil || c.offUntil >= today()) ? pct : 0;
}
const offPrice = (v, pct) => (pct ? Math.round(v * (100 - pct) / 100) : v);
// a product as the shop shows it: offer on its price, styles / companies and kit items
function shopView(p) {
  const pct = catOff(p.cat);
  if (!pct) return p;
  return { ...p, price: offPrice(p.price, pct), mrp: Math.max(p.mrp || 0, p.price), catOff: pct, catOffUntil: (db.categories.find(c => c.id === p.cat) || {}).offUntil || '',
    styles: (p.styles || []).map(s => ({ ...s, was: s.price, price: offPrice(s.price, pct) })), kitItems: (p.kitItems || []).map(k => ({ ...k, price: offPrice(k.price, pct) })) };
}
route('GET', '/api/products', (req, res, { query }) => {
  let list = db.products.filter(p => p.active).map(shopView);
  const q = (query.get('q') || '').toLowerCase().trim();
  const cat = query.get('cat');
  const type = query.get('type');
  const district = query.get('district');
  const min = num(query.get('min'), 0), max = num(query.get('max'), Infinity) || Infinity;
  if (q) list = list.filter(p => [p.name, p.nameHi, p.desc, p.cat, (p.includes || []).join(' ')].join(' ').toLowerCase().includes(q));
  if (cat) list = list.filter(p => p.cat === cat);
  if (type) list = list.filter(p => p.type === type);
  if (query.get('featured')) list = list.filter(p => p.featured);
  if (district) list = list.filter(p => productAvailableIn(p, district));
  list = list.filter(p => p.price >= min && p.price <= max);
  // with the customer's function date: how many bookings are left on it for every service, and (avail=1)
  // only the services still free on that date — fully booked ones are left out
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.get('date') || '') ? query.get('date') : '';
  const leftOn = p => Math.max(0, (p.dailyCapacity || 1) - bookedCount(p.id, date));
  if (date && query.get('avail') === '1') list = list.filter(p => p.type !== 'service' || leftOn(p) > 0);
  const sort = query.get('sort');
  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (sort === 'discount') list.sort((a, b) => (1 - b.price / b.mrp) - (1 - a.price / a.mrp)); // only real MRPs give a discount
  else if (sort === 'new') list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  else {
    // Popular = featured by the admin first, then how many customers really ordered it (not cancelled)
    const sold = {};
    for (const o of db.orders) if (o.status !== 'cancelled') for (const i of o.items) sold[i.productId] = (sold[i.productId] || 0) + 1;
    list.sort((a, b) => (b.featured - a.featured) || ((sold[b.id] || 0) - (sold[a.id] || 0)) || a.price - b.price);
  }
  const limit = Math.min(200, num(query.get('limit') || 200, 200));
  const m = ratingMap();
  send(res, 200, { total: list.length, date, products: list.slice(0, limit).map(p => ({ ...withRating(p, m), ...(date && p.type === 'service' ? { day: { date, left: leftOn(p) } } : {}) })) });
});

route('GET', '/api/products/:id', (req, res, { params }) => {
  const raw = db.products.find(x => x.id === params.id && x.active);
  if (!raw) return fail(res, 404, 'Product not found');
  const p = shopView(raw), m = ratingMap();
  const related = db.products.filter(x => x.active && x.cat === p.cat && x.id !== p.id).slice(0, 8).map(x => withRating(shopView(x), m));
  const reviewList = reviews().filter(r => r.productId === p.id && r.status === 'published').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30).map(pubReview);
  // a kit: items from the other kits of the same kind that can be added to it (at the category offer too)
  const extraPool = (p.kitItems || []).length ? kitPool(p.cat).filter(x => !p.kitItems.some(k => k.key === x.key)).map(x => ({ ...x, price: offPrice(x.price, catOff(p.cat)) })) : [];
  // flowers: the loose flowers to buy on their own, shown on every flower product page
  const loose = p.cat === 'decoration' && p.type === 'product' ? db.products.filter(x => x.active && x.loose && x.id !== p.id).map(x => withRating(shopView(x), m)) : [];
  send(res, 200, { product: { ...withRating(p, m), breakdown: (m[p.id] || {}).breakdown || [0, 0, 0, 0, 0], extraPool, loose }, related, reviewList });
});

// ---------- Product reviews (shop orders) ----------
// Written only by the customer of a delivered / completed order (order number + mobile), once per order line, and for a
// booking only after its function date. Stars are worked out from published reviews only: no review, no rating shown.
const reviews = () => db.reviews || (db.reviews = []);
const lastDate = i => itemDates(i).map(d => d.date).sort().pop() || '';
const canReviewLine = (o, i) => ['delivered', 'completed'].includes(o.status) && (i.type !== 'service' || (!!lastDate(i) && lastDate(i) <= today()));
function ratingMap() {
  const m = {};
  for (const r of reviews()) {
    if (r.status !== 'published') continue;
    const x = m[r.productId] || (m[r.productId] = { sum: 0, n: 0, breakdown: [0, 0, 0, 0, 0] });
    x.sum += r.rating; x.n++; x.breakdown[5 - r.rating]++;
  }
  return m;
}
const withRating = (p, m) => { const x = m[p.id]; return { ...p, rating: x ? Math.round(x.sum / x.n * 10) / 10 : 0, reviews: x ? x.n : 0 }; };
// what shoppers see: first name and district only, never the phone or order number
const pubReview = r => ({ id: r.id, name: r.name, district: r.district, rating: r.rating, text: r.text, photo: r.photo || '', reply: r.reply || '', verified: true, createdAt: r.createdAt });
route('POST', '/api/reviews', (req, res, { body }) => {
  const o = findTracked(body.orderNumber || body.number, body.phone);
  if (!o) return fail(res, 404, 'Enter the order number and mobile number used for the order');
  const pid = str(body.productId, 40), want = body.line == null || body.line === '' ? -1 : Math.round(num(body.line, -1));
  const lines = o.items.map((i, k) => ({ i, k })).filter(x => x.i.productId === pid && (want < 0 || x.k === want));
  if (!lines.length) return fail(res, 400, 'This item is not in that order');
  const open = lines.filter(x => !x.i.reviewed);
  if (!open.length) return fail(res, 409, 'You have already reviewed this item for this order');
  const line = open.find(x => canReviewLine(o, x.i));
  if (!line) return fail(res, 400, open[0].i.type === 'service' && ['delivered', 'completed'].includes(o.status) ? 'You can review this booking after the function date' : 'You can review after the order is delivered');
  const rating = Math.round(num(body.rating, 0));
  if (rating < 1 || rating > 5) return fail(res, 400, 'Choose 1 to 5 stars');
  let photo = '';
  if (body.photo) { const dec = vendorApi.decodePhoto(body.photo); if (dec.error) return fail(res, 400, dec.error); photo = vendorApi.storePhoto(dec); }
  const r = { id: uid('pr_'), productId: pid, orderId: o.id, orderNumber: o.number, line: line.k, name: str(o.address.name, 80).split(' ')[0], district: o.address.districtName || '', rating, text: str(body.text, 1000), photo, reply: '', status: 'published', createdAt: now() };
  reviews().push(r); line.i.reviewed = true; save();
  send(res, 201, { review: pubReview(r) });
});

// Auth
route('POST', '/api/auth/register', async (req, res, { body }) => {
  const name = str(body.name, 80), phone = str(body.phone, 15), password = String(body.password || '');
  if (!name) return fail(res, 400, 'Please enter your name');
  if (!/^[6-9]\d{9}$/.test(phone)) return fail(res, 400, 'Enter a valid 10-digit mobile number');
  if (password.length < 6) return fail(res, 400, 'Password must be at least 6 characters');
  if (db.users.some(u => u.phone === phone)) return fail(res, 409, 'This mobile number is already registered. Please login.');
  const user = { id: uid('u_'), name, phone, email: str(body.email, 120), role: 'user', password: hashPassword(password), addresses: [], wishlist: [], blocked: false, createdAt: now() };
  db.users.push(user);
  send(res, 201, { token: newSession(user), user: publicUser(user) });
});

route('POST', '/api/auth/login', async (req, res, { body }) => {
  const phone = str(body.phone, 30), password = String(body.password || ''), ip = clientIp(req);
  // 5 wrong passwords for a mobile → wait 15 minutes; 30 wrong from one address → wait an hour
  if (loginFailPhone.over(phone) || loginFailIp.over(ip)) return fail(res, 429, 'Too many wrong tries. Please wait 15 minutes and try again, or log in with OTP.');
  const user = db.users.find(u => u.phone === phone);
  if (user && !user.password) return fail(res, 401, 'This account uses OTP login. Please login with OTP.');
  if (!user || !checkPassword(password, user.password)) { loginFailPhone.hit(phone); loginFailIp.hit(ip); return fail(res, 401, 'Wrong mobile number or password'); }
  if (user.blocked) return fail(res, 403, 'Your account is blocked. Please contact support.');
  if (body.admin && user.role !== 'admin') return fail(res, 403, 'Not an admin account');
  loginFailPhone.reset(phone);
  send(res, 200, { token: newSession(user), user: publicUser(user) });
});

// ---------- SMS OTP login (customers only; admins use password) ----------
route('POST', '/api/auth/otp/send', async (req, res, { body }) => {
  if (!db.settings.otpLogin && !db.settings.otpRequired) return fail(res, 400, 'OTP login is turned off');
  const phone = str(body.phone, 15);
  if (!/^[6-9]\d{9}$/.test(phone)) return fail(res, 400, 'Enter a valid 10-digit mobile number');
  const u = db.users.find(x => x.phone === phone);
  if (u && u.role === 'admin') return fail(res, 403, 'Admin accounts must log in with password');
  if (u && u.blocked) return fail(res, 403, 'Your account is blocked. Please contact support.');
  const k = secrets();
  let r;
  try { r = await otp.send({ phone, ip: clientIp(req), pepper: k.pepper, sms: k.sms }); } catch (e) {
    console.error('OTP send failed:', e.message);
    return fail(res, 502, 'Could not send OTP right now. Please try again in a minute.');
  }
  if (r.wait) return fail(res, 429, r.blocked ? 'Too many OTP requests. Please try again after an hour.' : `Please wait ${r.wait} seconds before requesting a new OTP`);
  send(res, 200, { ok: true, resendIn: r.resendIn, testMode: k.sms.provider === 'console' });
});
route('POST', '/api/auth/otp/verify', (req, res, { body }) => {
  const phone = str(body.phone, 15);
  if (!/^[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(str(body.otp, 6))) return fail(res, 400, 'Enter the 6-digit OTP');
  const r = otp.verify({ phone, code: str(body.otp, 6), pepper: secrets().pepper });
  if (!r.ok) return fail(res, 401, r.error);
  let user = db.users.find(u => u.phone === phone), isNew = false;
  if (user && user.role === 'admin') return fail(res, 403, 'Admin accounts must log in with password');
  if (user && user.blocked) return fail(res, 403, 'Your account is blocked. Please contact support.');
  const name = str(body.name, 80);
  if (!user) {
    user = { id: uid('u_'), name: name || 'Customer', phone, email: '', role: 'user', password: '', addresses: [], wishlist: [], blocked: false, phoneVerified: true, createdAt: now() };
    db.users.push(user); isNew = true;
  } else {
    user.phoneVerified = true;
    if (name && (!user.name || user.name === 'Customer')) user.name = name;
  }
  send(res, 200, { token: newSession(user), user: publicUser(user), isNew });
});

route('POST', '/api/auth/logout', (req, res) => {
  const token = (req.headers.authorization || '').slice(7);
  delete db.sessions[token]; save();
  send(res, 200, { ok: true });
}, { auth: true });

route('GET', '/api/me', (req, res, { user }) => send(res, 200, { user: publicUser(user) }), { auth: true });

route('PUT', '/api/me', (req, res, { user, body }) => {
  if ('name' in body) user.name = str(body.name, 80) || user.name;
  if ('email' in body) user.email = str(body.email, 120);
  if (Array.isArray(body.addresses)) user.addresses = body.addresses.slice(0, 10).map(cleanAddress);
  if (body.prefs && typeof body.prefs === 'object') user.prefs = cleanPrefs(body.prefs, user.prefs || {});
  if (body.newPassword) {
    // accounts created with OTP have no password yet and may set one directly
    if (user.password && (!body.oldPassword || !checkPassword(body.oldPassword, user.password))) return fail(res, 400, 'Current password is wrong');
    if (String(body.newPassword).length < 6) return fail(res, 400, 'New password must be at least 6 characters');
    user.password = hashPassword(body.newPassword);
    // a new password signs the account out everywhere else (a stolen login stops working)
    const mine = (req.headers.authorization || '').slice(7);
    for (const t of Object.keys(db.sessions)) if (t !== mine && sessionUid(db.sessions[t]) === user.id) delete db.sessions[t];
  }
  save();
  send(res, 200, { user: publicUser(user) });
}, { auth: true });

route('POST', '/api/me/wishlist', (req, res, { user, body }) => {
  const id = str(body.productId, 40);
  user.wishlist = user.wishlist || [];
  const i = user.wishlist.indexOf(id);
  if (i >= 0) user.wishlist.splice(i, 1); else if (db.products.some(p => p.id === id)) user.wishlist.push(id);
  save();
  send(res, 200, { wishlist: user.wishlist });
}, { auth: true });

function cleanAddress(a = {}) {
  return {
    name: str(a.name, 80), phone: str(a.phone, 15), line1: str(a.line1, 200), landmark: str(a.landmark, 120),
    city: str(a.city, 80), district: str(a.district, 60), pincode: str(a.pincode, 6),
  };
}

// Orders
// Guests can order without an account: the order is linked to an account with the same mobile number, if any
// Checks every cart line against stock, district and booking slots. Returns { items } or { status, error }.
function buildItems(rawItems, district) {
  const items = [];
  for (const it of rawItems.slice(0, 100)) {
    const p = db.products.find(x => x.id === it.productId && x.active);
    if (!p) return { status: 400, error: 'Some item in your cart is no longer available' };
    if (!productAvailableIn(p, district.id)) return { status: 400, error: `"${p.name}" is not available in ${district.name}` };
    const qty = Math.max(p.minQty || 1, Math.min(10000, Math.round(num(it.qty, 1))));
    if (p.type === 'product' && p.stock < qty) return { status: 400, error: `Only ${p.stock} left of "${p.name}"` };
    const eventDate = str(it.eventDate, 10);
    if (p.type === 'service') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return { status: 400, error: `Select booking date for "${p.name}"` };
      if (eventDate < today()) return { status: 400, error: `Booking date for "${p.name}" is in the past` };
      const sameOrder = items.filter(x => x.productId === p.id && x.eventDate === eventDate).length;
      if (p.dailyCapacity && bookedCount(p.id, eventDate) + sameOrder >= p.dailyCapacity) return { status: 409, error: `"${p.name}" is fully booked on ${eventDate}. Please choose another date.` };
    }
    const covers = p.type === 'service' ? (p.covers || []) : [];
    const event = covers.length ? mainRasam(p) : p.type === 'service' ? (EVENTS.includes(it.event) ? it.event : (p.defaultEvent || 'Shaadi (Vivah)')) : '';
    if (!covers.length && p.type === 'service' && (p.events || []).length && !p.events.includes(event)) return { status: 400, error: `"${p.name}" is for ${p.events.join(' / ')} only. Please choose the right puja / service for ${event}.` };
    // full ceremony: one booking with a date for every rasam it covers (the main rasam's date is the booking date)
    let dates, lineEvent = event, lineDate = eventDate;
    if (covers.length) {
      // any of the covered rasams, each on its own date; the shaadi date is a must when the shaadi is covered
      const given = Object.fromEntries((Array.isArray(it.dates) ? it.dates : []).map(d => [d && d.event, str(d && d.date, 10)]));
      if (covers.includes(it.event) && !given[it.event]) given[it.event] = eventDate;
      dates = covers.filter(e => /^\d{4}-\d{2}-\d{2}$/.test(given[e] || '')).map(e => ({ event: e, date: given[e] }));
      if (covers.includes('Shaadi (Vivah)') && !given['Shaadi (Vivah)']) return { status: 400, error: `Enter the Shaadi (lagan) date for "${p.name}"` };
      if (!dates.length) return { status: 400, error: `Select at least one rasam date for "${p.name}"` };
      for (const d of dates) {
        if (d.date < today()) return { status: 400, error: `${d.event} date for "${p.name}" is in the past` };
        if (d.date !== eventDate && p.dailyCapacity && bookedCount(p.id, d.date) >= p.dailyCapacity) return { status: 409, error: `"${p.name}" is fully booked on ${d.date} (${d.event}). Please choose another date.` };
      }
      const m = dates.find(d => d.event === event) || dates[0];
      lineEvent = m.event; lineDate = m.date;
    }
    // a product with styles (mala, jaimala, petals…): the chosen style's name, photo and price — never the browser's
    const st = styleOf(p, str(it.style, 40));
    // the category offer is applied here, on the server's own price (the price before it stays as the line's MRP)
    const pct = catOff(p.cat), base = st ? st.price : p.price;
    items.push({ productId: p.id, name: st ? `${p.name} — ${st.name}` : p.name, emoji: p.emoji, image: st && st.photo ? st.photo : p.image, type: p.type, unit: st && st.unit ? st.unit : p.unit, price: offPrice(base, pct), mrp: Math.max(st ? st.price : p.mrp, base), qty, event: lineEvent, eventDate: p.type === 'service' ? lineDate : '', ...(dates ? { dates } : {}), ...(st ? { style: st.key } : {}), ...(pct ? { catOff: pct } : {}) });
    // a kit's extras: more of a kit item, or items from the other kits — each its own line at the shop's price
    if ((p.kitItems || []).length && Array.isArray(it.extras)) {
      const pool = kitPool(p.cat), seen = new Set();
      for (const x of it.extras.slice(0, 60)) {
        const k = pool.find(y => y.key === str(x && x.key, 60)), n = Math.round(num(x && x.qty));
        if (!k || n <= 0 || seen.has(k.key)) continue;
        if (n > 500) return { status: 400, error: `Too many of "${k.name}" — call us for very large quantities` };
        seen.add(k.key);
        const inKit = p.kitItems.some(y => y.key === k.key);
        items.push({ productId: p.id, name: `${inKit ? 'Extra' : 'Added'}: ${k.name} (${k.unit})`, emoji: p.emoji, image: p.image, type: 'product', unit: k.unit, price: offPrice(k.price, pct), mrp: k.price, qty: n, event: '', eventDate: '', extra: { of: p.name, key: k.key, inKit }, ...(pct ? { catOff: pct } : {}) });
      }
    }
  }
  return { items };
}

// Amount collected online now: everything, or saman + booking advance
function onlineAmount(t, items, plan) {
  const services = items.filter(i => i.type === 'service').reduce((a, i) => a + i.price * i.qty, 0);
  return plan === 'advance' && services > 0 ? t.total - services + t.advance : t.total;
}

route('POST', '/api/orders', async (req, res, { body }) => {
  const me = currentUser(req);
  const loggedIn = !!me;
  if (db.settings.otpRequired && !loggedIn) return fail(res, 401, 'Please verify your mobile number with OTP to place the order');
  const user = me || db.users.find(u => u.phone === str(body.address && body.address.phone, 15) && !u.blocked && u.role === 'user') || null;
  const addr = cleanAddress(body.address);
  const district = db.districts.find(d => d.id === addr.district && d.active);
  if (!addr.name || !/^[6-9]\d{9}$/.test(addr.phone)) return fail(res, 400, 'Enter contact name and valid mobile number');
  if (!district) return fail(res, 400, 'Please select your district (Bihar / Uttar Pradesh)');
  if (!addr.line1 || !/^\d{6}$/.test(addr.pincode)) return fail(res, 400, 'Enter full address and 6-digit pincode');
  if (!Array.isArray(body.items) || !body.items.length) return fail(res, 400, 'Your cart is empty');

  let built = buildItems(body.items, district);
  if (built.error) return fail(res, built.status, built.error);
  const method = ['cod', 'upi', 'online'].includes(body.paymentMethod) ? body.paymentMethod : 'cod';
  if (method === 'online' && !onlinePayEnabled()) return fail(res, 400, 'Online payment is not available right now. Please choose Cash on Delivery.');
  const totals = orderTotals(built.items, district);
  const seq = (db.counters.order = (db.counters.order || 1000) + 1);
  const number = 'SA' + seq;

  let rzp = null, payNow = 0;
  if (method === 'online') {
    payNow = onlineAmount(totals, built.items, body.payPlan);
    try {
      rzp = await razorpay.createOrder(secrets(), { amount: payNow, receipt: number, notes: { order: number, phone: addr.phone, district: district.name } });
      if (Number(rzp.amount) !== Math.round(payNow * 100)) throw new Error('Razorpay order amount does not match');
    } catch (e) {
      console.error('Razorpay order failed:', e.message);
      return fail(res, 502, 'Online payment could not be started. Please try again or choose Cash on Delivery.');
    }
    // other orders may have taken the last slot while we waited for Razorpay
    built = buildItems(body.items, district);
    if (built.error) return fail(res, built.status, built.error);
  }
  for (const i of built.items) if (i.type === 'product' && !i.extra) db.products.find(p => p.id === i.productId).stock -= i.qty; // kit extras are loose samagri, not kits

  const order = {
    id: uid('o_'), number, userId: user ? user.id : null, userName: user ? user.name : addr.name, userPhone: user ? user.phone : addr.phone, guest: !loggedIn,
    items: built.items, address: { ...addr, districtName: district.name, state: district.state },
    paymentMethod: method, paymentStatus: method === 'online' ? 'pending' : 'unpaid', payNow, payHold: method === 'online', paid: 0, payments: [],
    payPlan: method === 'online' ? (body.payPlan === 'advance' ? 'advance' : 'full') : '',
    rzpOrderId: rzp ? rzp.id : '', rzpOrders: rzp ? [{ id: rzp.id, amount: payNow, at: now() }] : [], rzpPaymentId: '', note: str(body.note, 500), ...totals,
    side: ['boy', 'girl'].includes(body.side) ? body.side : '', // bete ki / beti ki shaadi (asked once on the site)
    status: 'placed', history: [{ status: 'placed', at: now(), note: method === 'online' ? `Order placed – waiting for online payment of ₹${payNow}` : 'Order placed' }], adminNote: '', createdAt: now(),
  };
  db.orders.push(order);
  bump('orders');
  if (loggedIn && body.saveAddress && !user.addresses.some(a => a.line1 === addr.line1 && a.pincode === addr.pincode)) user.addresses.unshift(addr);
  save();
  send(res, 201, { order, payment: rzp ? paymentPayload(order) : null });
});

// ---------- Online payment (Razorpay) ----------
const PAY_TIMEOUT_MIN = 30;
function paymentPayload(o) {
  return { keyId: secrets().keyId, rzpOrderId: o.rzpOrderId, amount: o.payNow * 100, currency: 'INR', name: db.settings.siteName, description: `Order #${o.number}`, prefill: { name: o.address.name, contact: '91' + o.address.phone }, number: o.number };
}
// Payment status from the amount received: partial (e.g. advance) or paid in full
// returned items come off the bill
const settleStatus = o => { const net = o.total - returnedValue(o); o.paymentStatus = (o.paid || 0) >= net ? 'paid' : (o.paid || 0) > 0 ? 'partial' : 'unpaid'; };
// money that came in through Razorpay (the success screen, the webhook, or our own check with Razorpay)
const ONLINE_VIA = ['checkout', 'webhook', 'reconcile'];
// every Razorpay order made for this order (first payment, retries, "pay the balance") with the amount it was for
const rzpEntry = (o, id) => (o.rzpOrders || []).find(x => x.id === id) || (id && o.rzpOrderId === id ? { id, amount: o.payNow } : null);
// a Razorpay order belongs to a shop order or to a vendor booking (advance / rest paid online)
function findByRzp(rzpOrderId) { for (const o of [...db.orders, ...(db.vbookings || [])]) { const e = rzpEntry(o, rzpOrderId); if (e) return { o, e }; } return null; }
// Razorpay's own word on a payment before we count it: the right order, the right amount in rupees, money captured
// (a payment only "authorized" is held money — we capture it). Returns { ok } or { ok: false, error }.
async function confirmPayment(o, e, pay, via) {
  if (!pay || pay.order_id !== e.id || (pay.currency && pay.currency !== 'INR')) return { ok: false, error: 'This payment is for another order' };
  if (Number(pay.amount) !== Math.round(e.amount * 100)) {
    o.history.push({ status: o.status, at: now(), note: `Razorpay payment ${pay.id} is ₹${Number(pay.amount) / 100}, expected ₹${e.amount} — not counted, please check` }); save();
    return { ok: false, error: 'The amount paid does not match this order. Our team will check and call you.' };
  }
  let p = pay;
  if (p.status === 'authorized') {
    try { p = await razorpay.capture(secrets(), p.id, p.amount); } catch (err) {
      o.history.push({ status: o.status, at: now(), note: `Payment ${pay.id} is held by the bank but could not be captured yet (${err.message})` }); o.rzpRecheck = true; save();
      return { ok: false, error: 'Your payment is on hold with the bank. It will be confirmed in a few minutes.' };
    }
  }
  if (p.status !== 'captured') return { ok: false, error: p.status === 'failed' ? 'The payment failed. No money was taken.' : 'The payment is not complete yet.' };
  (o.vendorId ? markVBPaid : markPaid)(o, p.id, via, e.amount, p.method);
  e.paid = true;
  save();
  return { ok: true };
}
function markPaid(o, paymentId, via, amount, method) {
  o.payments = o.payments || [];
  if (o.payments.some(p => p.id === paymentId)) return; // checkout handler and webhook may both report it
  if (o.status === 'cancelled') {
    // paid after the 30-minute hold expired: bring the order back and flag it for the team
    o.status = 'placed';
    for (const i of o.items) { const p = db.products.find(x => x.id === i.productId); if (p && i.type === 'product' && !i.extra) p.stock -= i.qty; }
    o.adminNote = (o.adminNote ? o.adminNote + '\n' : '') + 'Payment arrived after the hold expired – please re-check booking slots.';
  }
  o.payments.push({ id: paymentId, amount, via, ...(method ? { method } : {}), at: now() });
  o.rzpPaymentId = paymentId; o.paid = (o.paid || 0) + amount; o.payHold = false; o.rzpRecheck = false;
  settleStatus(o);
  o.history.push({ status: o.status, at: now(), note: `₹${amount} paid online${method ? ` by ${method.toUpperCase()}` : ''} (${via}) · ${paymentId}` });
  save();
}
// success screen: the signature proves the payment belongs to this order; Razorpay is then asked for the real amount and status
route('POST', '/api/payments/verify', async (req, res, { body }) => {
  const rid = str(body.razorpay_order_id, 60), pid = str(body.razorpay_payment_id, 60);
  const o = db.orders.find(x => x.number === str(body.number, 20)), e = o && rzpEntry(o, rid);
  if (!o || !e) return fail(res, 404, 'Order not found');
  if (o.payments && o.payments.some(p => p.id === pid)) return send(res, 200, { order: o }); // already counted (webhook came first)
  const sec = secrets();
  if (!razorpay.verifyPayment(sec.keySecret, rid, pid, str(body.razorpay_signature, 200))) {
    o.history.push({ status: o.status, at: now(), note: 'Payment signature check failed' }); save();
    return fail(res, 400, 'Payment could not be verified. If money was deducted, it will be confirmed automatically or refunded.');
  }
  let pay;
  try { pay = await razorpay.fetchPayment(sec, pid); } catch (err) {
    // Razorpay could not be reached: the signed payment is counted and checked again in the background
    console.error('Razorpay payment check failed:', err.message);
    markPaid(o, pid, 'checkout', e.amount); e.paid = true; o.rzpRecheck = true; save();
    return send(res, 200, { order: o });
  }
  const r = await confirmPayment(o, e, pay, 'checkout');
  if (!r.ok) return fail(res, 400, r.error);
  send(res, 200, { order: o });
});
// Razorpay tells us about payments and refunds (needs the site on https and the webhook secret saved in Admin)
route('POST', '/api/payments/webhook', async (req, res, { raw, body }) => {
  const secret = secrets().webhookSecret;
  if (!secret || !razorpay.verifyWebhook(secret, raw, req.headers['x-razorpay-signature'] || '')) return fail(res, 400, 'Invalid signature');
  const pay = body.payload && body.payload.payment && body.payload.payment.entity;
  const ref = body.payload && body.payload.refund && body.payload.refund.entity;
  if (pay && ['payment.authorized', 'payment.captured', 'order.paid'].includes(body.event)) {
    const f = findByRzp(pay.order_id);
    if (f) await confirmPayment(f.o, f.e, pay, 'webhook');
  } else if (pay && body.event === 'payment.failed') {
    const f = findByRzp(pay.order_id);
    if (f) { f.o.history.push({ status: f.o.status, at: now(), note: 'Online payment attempt failed' + (pay.error_description ? ': ' + pay.error_description : '') }); save(); }
  } else if (ref && ['refund.processed', 'refund.failed'].includes(body.event)) {
    // a refund reached the family's account, or the bank sent it back (then it is owed again)
    const o = [...db.orders, ...(db.vbookings || [])].find(x => (x.refunds || []).some(r => r.id === ref.id)), r = o && o.refunds.find(x => x.id === ref.id);
    if (r && r.status !== ref.status) {
      r.status = ref.status === 'processed' ? 'processed' : 'failed';
      o.history.push({ status: o.status, at: now(), note: r.status === 'processed' ? `Refund ₹${r.amount} reached the customer's account (${ref.id})` : `Refund ₹${r.amount} FAILED at the bank (${ref.id}) — please refund again` });
      if (r.status === 'failed' && o.paymentStatus === 'refunded') { if (o.vendorId) o.paymentStatus = (o.paid || 0) - vbRefunded(o) >= (o.total || 0) ? 'paid' : 'partial'; else settleStatus(o); }
      save();
    }
  }
  send(res, 200, { ok: true });
}, { raw: true });
// ask Razorpay for payments on every attempt of this order not yet counted (the family paid, then the browser closed)
async function reconcile(o) {
  if (!onlinePayEnabled()) return false;
  const sec = secrets();
  let found = false;
  for (const e of (o.rzpOrders && o.rzpOrders.length ? o.rzpOrders : o.rzpOrderId ? [{ id: o.rzpOrderId, amount: o.payNow }] : []).filter(x => !x.paid)) {
    let list = [];
    try { list = await razorpay.orderPayments(sec, e.id); } catch (err) { console.error('Razorpay check failed:', err.message); continue; }
    for (const p of list.filter(x => ['captured', 'authorized'].includes(x.status) && !(o.payments || []).some(y => y.id === x.id))) {
      if ((await confirmPayment(o, e, p, 'reconcile')).ok) { found = true; break; }
    }
  }
  // payments counted on the signature alone while Razorpay was unreachable: capture if still only held
  if (o.rzpRecheck) for (const p of (o.payments || []).filter(x => ONLINE_VIA.includes(x.via))) {
    try { const rp = await razorpay.fetchPayment(sec, p.id); if (rp.status === 'authorized') await razorpay.capture(sec, rp.id, rp.amount); o.rzpRecheck = false; save(); } catch { /* next round */ }
  }
  o.rzpCheckedAt = now();
  return found;
}
// "I have paid — check again" on Track Order (order number + mobile)
route('POST', '/api/payments/status', async (req, res, { body }) => {
  const o = findTracked(body.number, body.phone);
  if (!o) return fail(res, 404, 'Order not found');
  const found = await reconcile(o);
  send(res, 200, { order: o, found });
});
// Customer retries payment or switches to cash (order number + mobile)
route('POST', '/api/payments/retry', (req, res, { body }) => {
  const o = findTracked(body.number, body.phone);
  if (!o) return fail(res, 404, 'Order not found. Check the order number and mobile number.');
  if (!o || o.paymentStatus !== 'pending' || o.status === 'cancelled') return fail(res, 400, 'This order is not waiting for payment');
  if (!onlinePayEnabled()) return fail(res, 400, 'Online payment is not available right now');
  send(res, 200, { payment: paymentPayload(o) });
});
route('POST', '/api/payments/cod', (req, res, { body }) => {
  const o = findTracked(body.number, body.phone);
  if (!o) return fail(res, 404, 'Order not found. Check the order number and mobile number.');
  if (!o || o.paymentStatus !== 'pending' || o.status === 'cancelled') return fail(res, 400, 'This order is not waiting for payment');
  o.paymentMethod = 'cod'; o.payNow = 0; o.payHold = false; settleStatus(o);
  o.history.push({ status: o.status, at: now(), note: 'Customer switched to Cash on Delivery' });
  save(); send(res, 200, { order: o });
});

// "Pay now" for an existing order's balance (e.g. a Cash on Delivery order) through Razorpay
const balanceOf = o => Math.max(0, o.total - (o.paid || 0));
const canPayLater = o => o && o.status !== 'cancelled' && !['pending', 'verifying', 'refunded'].includes(o.paymentStatus) && balanceOf(o) > 0;
route('POST', '/api/payments/start', async (req, res, { body }) => {
  const o = findTracked(body.number, body.phone);
  if (!o) return fail(res, 404, 'Order not found. Check the order number and mobile number.');
  if (!canPayLater(o)) return fail(res, 400, 'Nothing to pay for this order right now');
  if (!onlinePayEnabled()) return fail(res, 400, 'Online payment is not available right now');
  const amount = balanceOf(o);
  try {
    const rzp = await razorpay.createOrder(secrets(), { amount, receipt: `${o.number}-${(o.payments || []).length + 1}`, notes: { order: o.number, phone: o.address.phone } });
    if (Number(rzp.amount) !== Math.round(amount * 100)) throw new Error('Razorpay order amount does not match');
    // the earlier attempts stay on the order, so a late payment for any of them is still found
    o.rzpOrders = [...(o.rzpOrders || (o.rzpOrderId ? [{ id: o.rzpOrderId, amount: o.payNow, at: o.createdAt }] : [])), { id: rzp.id, amount, at: now() }];
    o.rzpOrderId = rzp.id; o.payNow = amount; save();
    send(res, 200, { payment: paymentPayload(o) });
  } catch (e) {
    console.error('Razorpay order failed:', e.message);
    fail(res, 502, 'Online payment could not be started. Please try again.');
  }
});

// Direct UPI (no gateway): customer pays the shop's UPI ID, then sends the 12-digit UPI reference (UTR) for the team to check
route('POST', '/api/payments/utr', (req, res, { body }) => {
  const o = findTracked(body.number, body.phone);
  if (!o) return fail(res, 404, 'Order not found. Check the order number and mobile number.');
  if (!db.settings.upiId) return fail(res, 400, 'UPI payment is not set up');
  if (!canPayLater(o)) return fail(res, 400, 'Nothing to pay for this order right now');
  const utr = str(body.utr, 20).replace(/\s/g, '');
  if (!/^\d{12}$/.test(utr)) return fail(res, 400, 'Enter the 12-digit UPI reference / UTR number shown in your UPI app');
  if (db.orders.some(x => x.utr === utr)) return fail(res, 409, 'This UPI reference number is already used for another order');
  o.utr = utr; o.utrAmount = balanceOf(o); o.utrPrevStatus = o.paymentStatus; o.paymentStatus = 'verifying'; o.paymentMethod = 'upi';
  o.history.push({ status: o.status, at: now(), note: `Customer paid ₹${o.utrAmount} by UPI – reference ${utr} (to be verified)` });
  save(); send(res, 200, { order: o });
});
// Orders waiting for online payment: every 5 minutes Razorpay is asked whether money came in (the family may have paid
// and closed the browser, and webhooks need https); after 30 minutes with nothing paid, the slots and stock are released
let payLoopBusy = false;
async function payLoop() {
  if (payLoopBusy) return; payLoopBusy = true;
  try {
    const t = Date.now(), cutoff = t - PAY_TIMEOUT_MIN * 60e3;
    for (const o of db.orders) {
      const waiting = o.payHold && o.paymentStatus === 'pending' && o.status === 'placed';
      if (!waiting && !o.rzpRecheck) continue;
      const age = t - Date.parse(o.createdAt), late = age >= PAY_TIMEOUT_MIN * 60e3;
      if (o.rzpRecheck || late || (age > 3 * 60e3 && t - Date.parse(o.rzpCheckedAt || 0) > 5 * 60e3)) await reconcile(o);
      if (o.payHold && o.paymentStatus === 'pending' && o.status === 'placed' && new Date(o.createdAt).getTime() < cutoff) {
        setStatus(o, 'cancelled', `Online payment not completed within ${PAY_TIMEOUT_MIN} minutes`);
        o.paymentStatus = 'failed'; o.payHold = false;
        save();
      }
    }
    // vendor bookings: an advance / rest started online in the last day and not yet counted
    for (const b of db.vbookings || []) {
      const open = (b.rzpOrders || []).filter(e => !e.paid && t - Date.parse(e.at) < 864e5);
      if (!open.length && !b.rzpRecheck) continue;
      const newest = Math.max(...open.map(e => Date.parse(e.at)), 0);
      if (b.rzpRecheck || (t - newest > 3 * 60e3 && t - Date.parse(b.rzpCheckedAt || 0) > 5 * 60e3)) await reconcile(b);
    }
  } catch (e) { console.error('Payment check failed:', e.message); } finally { payLoopBusy = false; }
}
setInterval(payLoop, 60e3).unref();

// ---------- Vendor bookings paid online: the family pays the advance (and later the rest) to Vivah Saathi once the
// vendor has confirmed; the team passes it on to the vendor (payouts) or refunds it if the booking is called off ----------
const vbFind = (number, phone) => (db.vbookings || []).find(b => b.number === str(number, 20).toUpperCase().replace(/^#/, '') && b.customer.phone === str(phone, 15));
const vbRefunded = b => (b.refunds || []).filter(r => r.status !== 'failed').reduce((s, r) => s + r.amount, 0);
const vbPaidOut = b => (b.payouts || []).reduce((s, p) => s + p.amount, 0);
// money for this booking still with Vivah Saathi (paid in, not refunded, not yet passed to the vendor)
const vbHeld = b => Math.max(0, (b.paid || 0) - vbRefunded(b) - vbPaidOut(b));
// called off after paying: everything not yet passed to the vendor goes back to the family
const vbRefundOwed = b => (['cancelled', 'rejected'].includes(b.status) ? vbHeld(b) : 0);
// what the family can pay online now: the vendor's advance once confirmed, or everything that is left
function vbDue(b) {
  if (!['confirmed', 'completed'].includes(b.status)) return null;
  const paid = (b.paid || 0) - vbRefunded(b), full = Math.max(0, (b.total || 0) - paid), adv = Math.max(0, Math.min(b.advance || 0, b.total || 0) - paid);
  return full > 0 ? { advance: adv > 0 && adv < full ? adv : 0, full } : null;
}
const vbMoney = b => ({ paid: b.paid || 0, held: vbHeld(b), paidOut: vbPaidOut(b), refundOwed: vbRefundOwed(b), due: vbDue(b) });
function markVBPaid(b, paymentId, via, amount, method) {
  b.payments = b.payments || [];
  if (b.payments.some(p => p.id === paymentId)) return;
  b.payments.push({ id: paymentId, amount, via, ...(method ? { method } : {}), at: now() });
  b.paid = (b.paid || 0) + amount; b.rzpRecheck = false;
  b.paymentStatus = b.paid - vbRefunded(b) >= (b.total || 0) ? 'paid' : 'partial';
  b.history.push({ status: b.status, at: now(), note: `₹${amount} paid online${method ? ` by ${method.toUpperCase()}` : ''} to ${db.settings.siteName} (${paymentId}) — passed on to ${b.vendorName}` });
  // a booking called off while the payment was on its way: the money is owed back
  if (['cancelled', 'rejected'].includes(b.status)) b.history.push({ status: b.status, at: now(), note: `Paid after the booking was ${b.status} — ₹${amount} to refund` });
  save();
}
const vbPayload = (b, e) => ({ keyId: secrets().keyId, rzpOrderId: e.id, amount: e.amount * 100, currency: 'INR', name: db.settings.siteName, description: `${e.part === 'advance' ? 'Advance' : 'Payment'} · ${b.vendorName} · #${b.number}`,
  prefill: { name: b.customer.name, contact: '91' + b.customer.phone }, number: b.number, verify: '/api/vbookings/pay/verify' });
// start a payment: part "advance" (the vendor's advance) or "full" (everything left)
route('POST', '/api/vbookings/pay', async (req, res, { body }) => {
  const b = vbFind(body.number, body.phone);
  if (!b) return fail(res, 404, 'Booking not found. Check the booking number and mobile number.');
  if (!onlinePayEnabled()) return fail(res, 400, 'Online payment is not available right now. Please pay the vendor directly.');
  if (b.status === 'requested') return fail(res, 400, `Please wait for ${b.vendorName} to confirm — then you can pay the advance online.`);
  const d = vbDue(b);
  if (!d) return fail(res, 400, 'Nothing to pay online for this booking');
  const amount = body.part === 'advance' && d.advance ? d.advance : d.full, part = body.part === 'advance' && d.advance ? 'advance' : 'full';
  try {
    const rzp = await razorpay.createOrder(secrets(), { amount, receipt: `${b.number}-${(b.rzpOrders || []).length + 1}`, notes: { booking: b.number, vendor: b.vendorName, phone: b.customer.phone } });
    if (Number(rzp.amount) !== Math.round(amount * 100)) throw new Error('Razorpay order amount does not match');
    const e = { id: rzp.id, amount, part, at: now() };
    b.rzpOrders = [...(b.rzpOrders || []), e]; save();
    send(res, 200, { payment: vbPayload(b, e) });
  } catch (err) { console.error('Razorpay order failed:', err.message); fail(res, 502, 'Online payment could not be started. Please try again.'); }
});
route('POST', '/api/vbookings/pay/verify', async (req, res, { body }) => {
  const rid = str(body.razorpay_order_id, 60), pid = str(body.razorpay_payment_id, 60);
  const b = (db.vbookings || []).find(x => x.number === str(body.number, 20)), e = b && rzpEntry(b, rid);
  if (!b || !e) return fail(res, 404, 'Booking not found');
  if ((b.payments || []).some(p => p.id === pid)) return send(res, 200, { booking: { ...b, money: vbMoney(b) } });
  const sec = secrets();
  if (!razorpay.verifyPayment(sec.keySecret, rid, pid, str(body.razorpay_signature, 200))) {
    b.history.push({ status: b.status, at: now(), note: 'Payment signature check failed' }); save();
    return fail(res, 400, 'Payment could not be verified. If money was deducted, it will be confirmed automatically or refunded.');
  }
  let pay;
  try { pay = await razorpay.fetchPayment(sec, pid); } catch (err) {
    console.error('Razorpay payment check failed:', err.message);
    markVBPaid(b, pid, 'checkout', e.amount); e.paid = true; b.rzpRecheck = true; save();
    return send(res, 200, { booking: { ...b, money: vbMoney(b) } });
  }
  const r = await confirmPayment(b, e, pay, 'checkout');
  if (!r.ok) return fail(res, 400, r.error);
  send(res, 200, { booking: { ...b, money: vbMoney(b) } });
});
route('POST', '/api/vbookings/pay/status', async (req, res, { body }) => {
  const b = vbFind(body.number, body.phone);
  if (!b) return fail(res, 404, 'Booking not found');
  const found = await reconcile(b);
  send(res, 200, { booking: { ...b, money: vbMoney(b) }, found });
});
// the team passes money on to the vendor (UPI / bank / cash) — never more than is held for the booking
route('POST', '/api/admin/vbookings/:id/payout', (req, res, { params, body }) => {
  const b = (db.vbookings || []).find(x => x.id === params.id);
  if (!b) return fail(res, 404, 'Booking not found');
  if (['cancelled', 'rejected'].includes(b.status)) return fail(res, 400, `This booking is ${b.status} — refund the family instead`);
  const amount = Math.round(num(body.amount, vbHeld(b))), via = ['upi', 'bank', 'cash'].includes(body.via) ? body.via : 'upi', ref = str(body.ref, 60);
  if (amount <= 0 || amount > vbHeld(b)) return fail(res, 400, `Only ${inrS(vbHeld(b))} of this booking is with us`);
  if (via !== 'cash' && !ref) return fail(res, 400, 'Enter the UPI / bank reference of the payout');
  b.payouts = [...(b.payouts || []), { amount, via, ref, at: now() }];
  b.history.push({ status: b.status, at: now(), note: `₹${amount} paid out to ${b.vendorName} by ${via === 'upi' ? 'UPI' : via === 'bank' ? 'bank transfer' : 'cash'}${ref ? ` (ref ${ref})` : ''}` });
  save(); send(res, 200, { booking: { ...b, money: vbMoney(b) } });
}, { admin: true });
// refund the family through Razorpay (split over their online payments), or record one sent by UPI / bank / cash
route('POST', '/api/admin/vbookings/:id/refund', async (req, res, { params, body }) => {
  const b = (db.vbookings || []).find(x => x.id === params.id);
  if (!b) return fail(res, 404, 'Booking not found');
  const amount = Math.round(num(body.amount, vbRefundOwed(b) || vbHeld(b)));
  if (amount <= 0 || amount > vbHeld(b)) return fail(res, 400, `Only ${inrS(vbHeld(b))} of this booking is with us to refund`);
  const note = n => b.history.push({ status: b.status, at: now(), note: n });
  if (body.manual) {
    const via = ['upi', 'bank', 'cash'].includes(body.via) ? body.via : 'upi', ref = str(body.ref, 60);
    if (via !== 'cash' && !ref) return fail(res, 400, 'Enter the UPI / bank reference of the refund');
    b.refunds = [...(b.refunds || []), { id: ref || 'cash', amount, via, at: now() }];
    note(`₹${amount} refunded by ${via}${ref ? ` (ref ${ref})` : ''}`);
  } else {
    const r = await splitRefund(b, amount, (rf, part, p) => { b.refunds = [...(b.refunds || []), { id: rf.id, amount: part, via: 'razorpay', paymentId: p.id, status: rf.status === 'processed' ? 'processed' : 'pending', at: now() }]; note(`₹${part} refunded online — reaches the family's account in 5–7 working days (Razorpay ${rf.id})`); });
    if (r.error) { save(); return fail(res, 400, r.error); }
  }
  if (vbRefunded(b) >= (b.paid || 0)) b.paymentStatus = 'refunded';
  save(); send(res, 200, { booking: { ...b, money: vbMoney(b) } });
}, { admin: true });
// Razorpay refund of `amount` over x's online payments, newest first (each gives back at most what it brought);
// record(refund, part, payment) stores each one. Returns {} or { error }.
async function splitRefund(x, amount, record) {
  const pays = (x.payments || []).filter(p => ONLINE_VIA.includes(p.via) && /^pay_/.test(p.id)).reverse();
  const backOn = pid => (x.refunds || []).filter(r => r.via === 'razorpay' && r.status !== 'failed' && (r.paymentId || x.rzpPaymentId) === pid).reduce((s, r) => s + r.amount, 0);
  const onlineLeft = pays.reduce((s, p) => s + Math.max(0, p.amount - backOn(p.id)), 0);
  if (!onlineLeft) return { error: 'Nothing was paid online through Razorpay — record a manual refund instead' };
  if (amount > onlineLeft) return { error: `Only ${inrS(onlineLeft)} can go back online. Refund the rest by UPI or cash with a manual refund.` };
  let left = amount;
  for (const p of pays) {
    const part = Math.min(left, p.amount - backOn(p.id)); if (part <= 0) continue;
    try { const rf = await razorpay.refund(secrets(), p.id, part); record(rf, part, p); left -= part; } catch (e) {
      return { error: left < amount ? `Refunded ${inrS(amount - left)}; the rest failed: ${e.message}` : 'Refund failed: ' + e.message };
    }
    if (!left) break;
  }
  return {};
}

// ---------- Booking availability ----------
// One booking = one order line for a service on a date (cancelled orders free the slot)
// the rasam a full-ceremony booking is filed under (the shaadi itself when it is covered)
function mainRasam(p) { const c = p.covers || []; return c.includes('Shaadi (Vivah)') ? 'Shaadi (Vivah)' : c[c.length - 1] || p.defaultEvent || 'Shaadi (Vivah)'; }
// every date of an order line: one function, or each rasam of a full-ceremony booking
const itemDates = i => ((i.dates || []).length ? i.dates : i.eventDate ? [{ event: i.event || '', date: i.eventDate }] : []);
function bookedCount(productId, date) {
  let n = 0;
  for (const o of db.orders) if (o.status !== 'cancelled') for (const i of o.items) if (i.productId === productId && itemDates(i).some(d => d.date === date)) n++;
  return n;
}
route('GET', '/api/availability', (req, res, { query }) => {
  const p = db.products.find(x => x.id === query.get('productId'));
  const date = str(query.get('date'), 10);
  if (!p || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, 400, 'Product and date are required');
  const capacity = p.dailyCapacity || 0, booked = bookedCount(p.id, date);
  send(res, 200, { capacity, booked, left: capacity ? Math.max(0, capacity - booked) : null, available: !capacity || booked < capacity });
});
// Advance booking: every day of the next 5 months (same shape as the vendor calendars, lagan days marked)
route('GET', '/api/availability/months', (req, res, { query }) => {
  const p = db.products.find(x => x.id === query.get('productId') && x.active !== false);
  if (!p || p.type !== 'service') return fail(res, 404, 'Service not found');
  const cap = p.dailyCapacity || 0, t = today(), lagan = (db.lagan && db.lagan.dates) || {};
  const months = [];
  for (let k = 0; k < 5; k++) {
    const d0 = new Date(t.slice(0, 7) + '-01T00:00:00Z'); d0.setUTCMonth(d0.getUTCMonth() + k);
    const month = d0.toISOString().slice(0, 7), days = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 0)).getUTCDate();
    const calendar = [];
    for (let d = 1; d <= days; d++) {
      const date = `${month}-${String(d).padStart(2, '0')}`, left = cap ? Math.max(0, cap - bookedCount(p.id, date)) : null;
      calendar.push({ date, status: date < t ? 'past' : left === 0 ? 'full' : 'available', left, ...(lagan[date] ? { lagan: true } : {}) });
    }
    months.push({ month, calendar });
  }
  send(res, 200, { capacity: cap, months });
});

// ---------- Analytics (anonymous counters per day and per product) ----------
const today = () => new Date().toISOString().slice(0, 10);
// Analytics days are India days (UTC+5:30): an order at 1 am IST belongs to that date, not to "yesterday" in UTC
const istDay = (t = Date.now()) => new Date(new Date(t).getTime() + 330 * 60e3).toISOString().slice(0, 10);
const addDay = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
function bump(type, productId) {
  const a = db.analytics || (db.analytics = { days: {}, products: {} });
  const day = a.days[istDay()] || (a.days[istDay()] = { visits: 0, views: 0, carts: 0, checkouts: 0, orders: 0, vbookings: 0 });
  day[type] = (day[type] || 0) + 1;
  if (productId && db.products.some(p => p.id === productId)) {
    const ps = a.products[productId] || (a.products[productId] = { views: 0, carts: 0 });
    if (type === 'views' || type === 'carts') ps[type]++;
  }
  save();
}
route('POST', '/api/a', (req, res, { body }) => {
  if (['visits', 'views', 'carts', 'checkouts'].includes(body.type)) bump(body.type, str(body.productId, 40));
  send(res, 200, { ok: true });
});

// Track / cancel an order with order number + mobile number (works for guests too)
function findTracked(number, phone) {
  number = str(number, 20).toUpperCase().replace(/^#/, ''); phone = str(phone, 15);
  return db.orders.find(o => o.number === number && (o.address.phone === phone || o.userPhone === phone));
}
route('GET', '/api/track', (req, res, { query }) => {
  const o = findTracked(query.get('number'), query.get('phone'));
  if (!o) return fail(res, 404, 'No order found with this order number and mobile number');
  send(res, 200, { order: withPolicy({ ...o, invoiceError: undefined }) }); // the admin-only "why no invoice yet" stays with the team
});

// ---------- Cancel, return & refund ----------
// The same rules drive the website, the admin panel and the Return & Refund Policy page (meta.settings.policy).
// Not returnable: food (mithai, catering), fresh flowers / decoration, cards printed with names, and every service booking.
const NO_RETURN_CATS = ['mithai', 'catering', 'decoration', 'cards'];
const CANCEL_REASONS = ['Wedding date changed', 'Booked somewhere else', 'Ordered by mistake', 'Price too high', 'Delivery / service too late', 'Other'];
const RETURN_REASONS = ['Damaged / broken', 'Wrong item sent', 'Item missing from the pack', 'Quality not as shown', 'Size / fit problem', 'Not needed any more', 'Other'];
const PHOTO_REASONS = ['Damaged / broken', 'Wrong item sent', 'Quality not as shown'];
const policy = () => ({ returnDays: db.settings.returnDays ?? 7, refundDays: db.settings.refundDays ?? 7, noReturnCats: NO_RETURN_CATS, cancelReasons: CANCEL_REASONS, returnReasons: RETURN_REASONS, photoReasons: PHOTO_REASONS });
function refundTotal(o) { return (o.refunds || []).filter(r => r.status !== 'failed').reduce((a, r) => a + r.amount, 0); } // a refund the bank sent back does not count
// value of items that came back (picked up); the customer only pays for what they keep
function returnedValue(o) { return (o.returns || []).filter(r => ['picked', 'done'].includes(r.status)).reduce((a, r) => a + r.value, 0); }
// money to give back: paid, minus refunds already sent, minus what the customer still keeps
function refundOwed(o) { return Math.max(0, (o.paid || 0) - refundTotal(o) - (o.status === 'cancelled' ? 0 : o.total - returnedValue(o))); }
const deliveredAt = o => (o.history.find(x => x.status === 'delivered') || o.history.find(x => x.status === 'completed') || {}).at || '';
// every line: how many can still be returned, or why not
function returnLines(o) {
  const days = policy().returnDays, at = deliveredAt(o);
  const open = ['delivered', 'completed'].includes(o.status) && at && Date.now() - Date.parse(at) <= days * 864e5;
  const until = at ? new Date(Date.parse(at) + days * 864e5).toISOString() : '';
  return o.items.map((i, k) => {
    const p = db.products.find(x => x.id === i.productId), inRet = (o.returns || []).filter(r => r.status !== 'rejected').flatMap(r => r.items).filter(x => x.line === k).reduce((a, x) => a + x.qty, 0);
    const why = i.type === 'service' ? 'Bookings cannot be returned' : NO_RETURN_CATS.includes(p ? p.cat : '') ? 'Not returnable (food, fresh flowers or printed item)'
      : !open ? (at ? `Return window closed (${days} days after delivery)` : 'Can be returned after delivery') : inRet >= i.qty ? 'Already returned' : '';
    return { line: k, name: i.name, qty: i.qty - inRet, price: i.price, why, until };
  });
}
const withPolicy = o => ({ ...o, returnLines: returnLines(o), refundOwed: refundOwed(o), returnedValue: returnedValue(o) });
// once a refund (or nothing owed) settles it, picked-up returns are done
// how: 'refund' when a refund just settled it, else the value simply came off the bill
function settleReturns(o, how = 'bill') {
  if (refundOwed(o) > 0) return;
  for (const r of o.returns || []) if (r.status === 'picked') { r.status = 'done'; r.settled = how; r.history.push({ status: 'done', at: now(), note: how === 'refund' ? 'Refund sent' : 'Taken off the bill' }); }
}
const pickReason = (list, v) => (list.includes(v) ? v : '');
// up to 4 photos (data URLs) → stored /uploads paths; null after sending the error
const MAX_PHOTOS = 4;
function storePhotos(list, res) {
  list = (Array.isArray(list) ? list : []).filter(Boolean);
  if (list.length > MAX_PHOTOS) { fail(res, 400, `Add up to ${MAX_PHOTOS} photos`); return null; }
  const decoded = list.map(p => vendorApi.decodePhoto(p)), bad = decoded.find(d => d.error);
  if (bad) { fail(res, 400, bad.error); return null; }
  return decoded.map(d => vendorApi.storePhoto(d));
}
const upiOf = v => { const u = str(v, 60).trim(); return /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(u) ? u : ''; };

// Customer cancels: free before dispatch; once dispatched / team assigned it becomes a request the team answers
function customerCancel(o, body, res) {
  const reason = pickReason(CANCEL_REASONS, body.reason) || 'Other'; // the website always asks; older apps may not send one
  const note = str(body.note, 300), upi = upiOf(body.upi), why = reason + (note ? ' — ' + note : '');
  if (upi) o.refundTo = upi;
  if (['placed', 'confirmed'].includes(o.status)) {
    setStatus(o, 'cancelled', 'Cancelled by customer: ' + why);
    o.cancel = { by: 'customer', reason, note, at: now() };
    if (refundOwed(o)) o.history.push({ status: 'cancelled', at: now(), note: `Refund of ₹${refundOwed(o)} will be sent within ${policy().refundDays} days` });
  } else if (o.status === 'dispatched') {
    if (o.cancelRequest && o.cancelRequest.status === 'requested') return fail(res, 400, 'Your cancellation request is already with our team');
    o.cancelRequest = { reason, note, at: now(), status: 'requested' };
    o.history.push({ status: o.status, at: now(), note: 'Cancellation requested: ' + why + ' — our team will call you' });
  } else return fail(res, 400, o.status === 'cancelled' ? 'This order is already cancelled' : 'A delivered order cannot be cancelled — you can return eligible items instead.');
  save(); send(res, 200, { order: withPolicy(o) });
}
route('POST', '/api/track/cancel', (req, res, { body }) => {
  const o = findTracked(body.number, body.phone);
  if (!o) return fail(res, 404, 'Order not found');
  customerCancel(o, body, res);
});

// Customer asks to return items (delivered saman only, inside the return window)
route('POST', '/api/track/return', (req, res, { body }) => {
  const o = findTracked(body.number, body.phone);
  if (!o) return fail(res, 404, 'Order not found');
  const lines = returnLines(o), want = (Array.isArray(body.lines) ? body.lines : []).map(x => ({ line: Math.round(num(x.line, -1)), qty: Math.round(num(x.qty)) })).filter(x => x.qty > 0);
  if (!want.length) return fail(res, 400, 'Choose the items and how many to return');
  for (const w of want) {
    const l = lines[w.line];
    if (!l) return fail(res, 400, 'Item not found in this order');
    if (l.why) return fail(res, 400, `${l.name}: ${l.why}`);
    if (w.qty > l.qty) return fail(res, 400, `${l.name}: only ${l.qty} can be returned`);
  }
  const reason = pickReason(RETURN_REASONS, body.reason);
  if (!reason) return fail(res, 400, 'Please choose a reason for the return');
  const photos = storePhotos(body.photos || (body.photo ? [body.photo] : []), res);
  if (!photos) return;
  if (PHOTO_REASONS.includes(reason) && !photos.length) return fail(res, 400, 'Please add a photo of the item — it helps us approve the return quickly');
  const upi = upiOf(body.upi);
  if (upi) o.refundTo = upi;
  const items = want.map(w => ({ line: w.line, name: o.items[w.line].name, qty: w.qty, price: o.items[w.line].price }));
  const r = { id: 'RT' + (1 + (o.returns || []).length), at: now(), items, value: items.reduce((a, x) => a + x.price * x.qty, 0), reason, note: str(body.note, 500), photos, status: 'requested', history: [{ status: 'requested', at: now(), note: '' }] };
  o.returns = [...(o.returns || []), r];
  o.history.push({ status: o.status, at: now(), note: `Return requested (${r.id}): ${items.map(x => `${x.name} × ${x.qty}`).join(', ')} — ${reason}` });
  save(); send(res, 200, { order: withPolicy(o) });
});

route('GET', '/api/orders/mine', (req, res, { user }) => {
  send(res, 200, { orders: ordersOf(user).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(o => withPolicy({ ...o, invoiceError: undefined })), phoneVerified: !!user.phoneVerified });
}, { auth: true });

route('POST', '/api/orders/:id/cancel', (req, res, { user, params, body }) => {
  const o = ordersOf(user).find(x => x.id === params.id);
  if (!o) return fail(res, 404, 'Order not found');
  customerCancel(o, body, res);
}, { auth: true });

const STATUSES = ['placed', 'confirmed', 'dispatched', 'delivered', 'completed', 'cancelled'];
// An order only moves forward (steps may be skipped) or is cancelled before delivery; cancelled and completed are final.
// Going back would put stock / booked dates out of step with what really happened.
function statusMoveError(from, to) {
  if (!STATUSES.includes(to)) return 'Unknown status';
  if (from === 'cancelled') return 'This order is cancelled — a cancelled order cannot be reopened. Ask the customer to place a new order.';
  if (from === 'completed') return 'This order is completed and closed.';
  if (to === 'cancelled') return ['placed', 'confirmed', 'dispatched'].includes(from) ? '' : 'A delivered order cannot be cancelled — use a refund instead.';
  return STATUSES.indexOf(to) > STATUSES.indexOf(from) ? '' : 'An order can only move forward (Placed → Confirmed → Dispatched → Delivered → Completed).';
}
function setStatus(o, status, note) {
  if (status === 'cancelled' && o.status !== 'cancelled') {
    for (const i of o.items) { const p = db.products.find(x => x.id === i.productId); if (p && i.type === 'product' && !i.extra) p.stock += i.qty; }
  }
  o.status = status;
  o.history.push({ status, at: now(), note: note || '' });
  // an open cancellation request is answered by what happened to the order
  const cr = o.cancelRequest;
  if (cr && cr.status === 'requested' && ['cancelled', 'delivered', 'completed'].includes(status)) { cr.status = status === 'cancelled' ? 'approved' : 'closed'; cr.answeredAt = now(); }
  if (status === 'cancelled' && refundOwed(o) && !/^Cancelled by customer/.test(note || '')) o.history.push({ status, at: now(), note: `Refund of ₹${refundOwed(o)} will be sent within ${policy().refundDays} days` });
  // GST: the tax invoice is issued when the goods are delivered / the service is done; a cancellation after it gets a credit note
  if (['delivered', 'completed'].includes(status) && !o.invoice && gstSeller() && (db.settings.business || {}).autoInvoice !== false) issueInvoice(o);
  syncCreditNotes(o);
}

// ---------- GST tax invoices & credit notes (maths in gst.js) ----------
// on only when Settings → Business details has a valid GSTIN, the registered name and the address
function gstSeller() {
  const s = db.settings, b = s.business || {};
  if (!validGstin(b.gstin) || !b.legalName || !b.address) return null;
  return { gstin: b.gstin, legalName: b.legalName, brand: s.siteName, address: b.address, phone: s.phone, email: s.email, prefix: /^[A-Z0-9]{1,4}$/.test(b.invoicePrefix || '') ? b.invoicePrefix : 'INV' };
}
// a line's GST rate and HSN / SAC code: the product's own, else its category's (rate null = not set yet)
function gstOf(i) {
  const p = db.products.find(x => x.id === i.productId), c = p && db.categories.find(x => x.id === p.cat), set = v => v != null && v !== '';
  return { rate: p && set(p.gstRate) ? Number(p.gstRate) : c && set(c.gstRate) ? Number(c.gstRate) : null, hsn: (p && p.hsn) || (c && c.hsn) || '' };
}
// next number of a series in this financial year — INV/26-27/00001 (16 characters at most, as GST rules require)
function nextDocNo(kind, prefix) { const fy = fyOf(istDay()), key = `${kind}_${fy}`; db.counters[key] = (db.counters[key] || 0) + 1; return `${prefix}/${fy}/${String(db.counters[key]).padStart(5, '0')}`; }
const qtyBack = (rs, k) => rs.flatMap(r => r.items || []).filter(x => x.line === k).reduce((a, x) => a + x.qty, 0);
// Returns { invoice } or { error }. Items already short / damaged / returned are left off. The number is taken only when
// the invoice is sure to be made, so the series has no gaps; once made it never changes.
function issueInvoice(o) {
  if (o.invoice) return { invoice: o.invoice };
  const seller = gstSeller();
  if (!seller) return { error: 'Add a valid GSTIN, the registered business name and the address in Admin → Settings → Business details first' };
  if (o.status === 'cancelled') return { error: 'This order is cancelled — there is nothing to invoice' };
  const back = (o.returns || []).filter(r => ['picked', 'done'].includes(r.status));
  const lineQty = Object.fromEntries(o.items.map((i, k) => [k, i.qty - qtyBack(back, k)]));
  const r = buildInvoice(o, { seller, number: '', date: now(), gstOf, lineQty });
  if (r.error) { o.invoiceError = r.error; return r; }
  r.invoice.number = nextDocNo('inv', seller.prefix);
  r.invoice.excludedReturns = back.map(x => x.id);
  o.invoice = r.invoice; delete o.invoiceError;
  o.history.push({ status: o.status, at: now(), note: `GST tax invoice ${o.invoice.number} issued` });
  return { invoice: o.invoice };
}
// after the invoice: each return picked up gets a credit note once; a cancellation credits whatever is still invoiced
function syncCreditNotes(o) {
  const inv = o.invoice;
  if (!inv) return;
  o.creditNotes = o.creditNotes || [];
  const done = new Set([...(inv.excludedReturns || []), ...o.creditNotes.map(c => c.ref)]);
  const issue = (items, reason, ref) => {
    const cn = buildCreditNote(inv, { number: '', date: now(), reason, ref, items });
    if (!cn) return;
    cn.number = nextDocNo('cn', 'CN');
    o.creditNotes.push(cn);
    o.history.push({ status: o.status, at: now(), note: `GST credit note ${cn.number} issued against invoice ${inv.number}` });
  };
  for (const r of o.returns || []) if (['picked', 'done'].includes(r.status) && !done.has(r.id)) issue((r.items || []).map(x => ({ line: x.line, qty: x.qty })), r.reason || 'Goods returned', r.id);
  if (o.status === 'cancelled' && !done.has('cancel')) {
    const credited = k => o.creditNotes.flatMap(c => c.lines).filter(l => l.line === k).reduce((a, l) => a + l.qty, 0);
    issue(inv.lines.map(l => ({ line: l.line, qty: l.qty - credited(l.line) })).filter(x => x.qty > 0), 'Order cancelled', 'cancel');
  }
}

// ---------- Admin ----------
// Dashboard & analytics. Shop money (orders) and vendor marketplace bookings (paid to the vendors directly) are kept
// apart; days are India days; sample vendors / reviews are left out of the real numbers and only counted separately.
function dashboardStats(range) {
  const t = istDay(), from = addDay(t, -(range - 1)), inR = iso => istDay(iso) >= from;
  const inRange = db.orders.filter(o => inR(o.createdAt));
  const valid = inRange.filter(o => o.status !== 'cancelled');
  const refundOf = o => refundTotal(o);
  const byStatus = Object.fromEntries(STATUSES.map(s => [s, db.orders.filter(o => o.status === s).length]));
  const byState = {}, byDistrict = {}, byCat = {}, byEvent = {}, byProduct = {}, byPay = { cod: 0, upi: 0 };
  const byMethod = Object.fromEntries(['online', 'cod', 'upi'].map(m => [m, { n: 0, value: 0 }]));
  for (const o of valid) {
    byState[o.address.state] = (byState[o.address.state] || 0) + o.total;
    byDistrict[o.address.districtName] = (byDistrict[o.address.districtName] || 0) + o.total;
    byPay[o.paymentMethod] = (byPay[o.paymentMethod] || 0) + 1;
    const bm = byMethod[o.paymentMethod] || (byMethod[o.paymentMethod] = { n: 0, value: 0 }); bm.n++; bm.value += o.total;
    for (const i of o.items) {
      const p = db.products.find(x => x.id === i.productId);
      const c = p ? p.cat : 'other';
      byCat[c] = (byCat[c] || 0) + i.price * i.qty;
      if (i.event) byEvent[i.event] = (byEvent[i.event] || 0) + 1;
      const bp = byProduct[i.productId] || (byProduct[i.productId] = { name: i.name, qty: 0, revenue: 0, bookings: 0 });
      // kit extras add to the kit's money, not to how many kits / orders
      if (i.extra) { bp.revenue += i.price * i.qty; continue; }
      bp.qty += i.qty; bp.revenue += i.price * i.qty; bp.bookings++;
    }
  }
  // vendor bookings of real (non-sample) vendors: all time, and requested inside the range
  const sampleV = new Set((db.vendors || []).filter(v => v.sample).map(v => v.id));
  const vbAll = (db.vbookings || []).filter(b => !sampleV.has(b.vendorId));
  const vbLive = vbAll.filter(b => inR(b.createdAt) && ['requested', 'confirmed', 'completed'].includes(b.status));
  for (const b of vbLive) if (b.event) byEvent[b.event] = (byEvent[b.event] || 0) + 1; // functions: shop + vendor bookings
  // Razorpay money: every online payment and Razorpay refund on shop orders and vendor bookings
  const rzpPays = [], rzpRefunds = [];
  let failedAttempts = 0;
  for (const [kind, list] of [['shop', db.orders], ['vendor', db.vbookings || []]]) for (const x of list) {
    const ref = { kind, id: x.id, number: x.number, name: kind === 'shop' ? x.address.name : x.customer.name };
    for (const p of x.payments || []) if (ONLINE_VIA.includes(p.via)) rzpPays.push({ ...ref, pid: p.id, amount: p.amount, method: p.method || '', at: p.at });
    for (const r of x.refunds || []) if (r.via === 'razorpay') rzpRefunds.push({ ...ref, rid: r.id, amount: r.amount, status: r.status || 'pending', at: r.at });
    failedAttempts += (x.history || []).filter(e => inR(e.at) && /^Online payment attempt failed/.test(e.note || '')).length;
  }
  // Daily series + funnel from analytics counters
  const a = db.analytics || { days: {}, products: {} };
  const days = [], funnel = { visits: 0, views: 0, carts: 0, checkouts: 0, orders: 0, vbookings: 0 };
  for (let k = range - 1; k >= 0; k--) {
    const d = addDay(t, -k);
    const day = valid.filter(o => istDay(o.createdAt) === d), vday = vbLive.filter(b => istDay(b.createdAt) === d);
    const ad = a.days[d] || {};
    for (const key of Object.keys(funnel)) funnel[key] += ad[key] || 0;
    days.push({ date: d, orders: day.length, revenue: day.reduce((s, o) => s + o.total, 0), visits: ad.visits || 0, vbookings: vday.length, vvalue: vday.reduce((s, b) => s + (b.total || 0), 0),
      online: rzpPays.filter(p => istDay(p.at) === d).reduce((s, p) => s + p.amount, 0), onlineBack: rzpRefunds.filter(r => r.status !== 'failed' && istDay(r.at) === d).reduce((s, r) => s + r.amount, 0) });
  }
  // Customers by mobile number across shop orders and vendor bookings: new = their only ordering day is in the range,
  // repeat = ordered / booked on more than one day (a cart checkout of several vendors counts as one visit)
  const actDays = {};
  const mark = (p, iso) => { if (p) (actDays[p] = actDays[p] || new Set()).add(istDay(iso)); };
  for (const o of db.orders) mark(o.address.phone, o.createdAt);
  for (const b of vbAll) mark(b.customer.phone, b.createdAt);
  const phones = [...new Set([...valid.map(o => o.address.phone), ...vbLive.map(b => b.customer.phone)])];
  const newCustomers = phones.filter(p => actDays[p].size === 1).length;
  const refunds = inRange.reduce((s, o) => s + refundOf(o), 0);
  // net sales: returned items (refunded or taken off the bill) and other refunds come off — each counted once
  const gross = valid.reduce((s, o) => s + o.total, 0), revenue = gross - valid.reduce((s, o) => s + Math.max(refundOf(o), returnedValue(o)), 0);
  const viaOnline = o => (o.payments || []).filter(p => ONLINE_VIA.includes(p.via)).reduce((s, p) => s + p.amount, 0);
  const payStatus = {};
  for (const o of inRange) payStatus[o.paymentStatus || 'unpaid'] = (payStatus[o.paymentStatus || 'unpaid'] || 0) + 1;
  // districts and side (bete ki / beti ki) across shop orders and vendor bookings
  const dist = {}, side = { boy: { orders: 0, vbookings: 0 }, girl: { orders: 0, vbookings: 0 }, unknown: { orders: 0, vbookings: 0 } };
  const dRow = n => dist[n || '—'] || (dist[n || '—'] = { name: n || '—', shop: 0, orders: 0, vendor: 0, vbookings: 0 });
  for (const o of valid) { const r = dRow(o.address.districtName); r.shop += o.total; r.orders++; side[side[o.side] ? o.side : 'unknown'].orders++; }
  for (const b of vbLive) { const r = dRow(b.customer.districtName); r.vendor += b.total || 0; r.vbookings++; const s = b.customer.side; side[side[s] ? s : 'unknown'].vbookings++; }
  // Function dates ahead: every rasam date of shop service lines and of open vendor bookings
  const lagan = (db.lagan && db.lagan.dates) || {}, ahead = [];
  for (const o of db.orders) if (o.status !== 'cancelled') for (const i of o.items) for (const d of itemDates(i)) if (d.date >= t) ahead.push({ kind: 'shop', date: d.date, event: d.event, name: i.name, ref: o.number, refId: o.id, status: o.status, district: o.address.districtName, customer: o.address.name, phone: o.address.phone, side: o.side || '' });
  for (const b of vbAll) if (['requested', 'confirmed'].includes(b.status)) {
    const on = new Map((b.items || []).flatMap(i => (i.dates || []).map(x => [x.date, x.event])));
    if (!on.has(b.date)) on.set(b.date, b.event || '');
    for (const [date, event] of on) if (date >= t) ahead.push({ kind: 'vendor', date, event, name: b.vendorName, ref: b.number, refId: b.id, status: b.status, district: b.customer.districtName, customer: b.customer.name, phone: b.customer.phone, side: b.customer.side || '' });
  }
  ahead.sort((x, y) => x.date.localeCompare(y.date) || x.kind.localeCompare(y.kind));
  const load = {};
  for (const u of ahead) { const l = load[u.date] || (load[u.date] = { date: u.date, shop: 0, vendor: 0, lagan: !!lagan[u.date] }); l[u.kind]++; }
  const in90 = addDay(t, 89), laganAhead = Object.keys(lagan).filter(d => d >= t && d <= in90);
  const near = ahead.filter(u => u.date <= in90);
  const rv = (list, nameOf) => {
    const real = list.filter(r => !r.sample), pub = real.filter(r => r.status === 'published'), inP = pub.filter(r => inR(r.createdAt));
    const avg = l => (l.length ? Math.round(l.reduce((s, r) => s + r.rating, 0) / l.length * 10) / 10 : 0);
    const out = r => ({ id: r.id, name: r.name, item: nameOf(r), rating: r.rating, text: r.text || '', reply: r.reply || '', status: r.status, createdAt: r.createdAt });
    return { n: pub.length, avg: avg(pub), periodN: inP.length, periodAvg: avg(inP), breakdown: [5, 4, 3, 2, 1].map(s => pub.filter(r => r.rating === s).length),
      latest: [...real].sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 5).map(out),
      // low ratings nobody has answered yet
      attention: real.filter(r => r.rating <= 2 && !r.reply && r.status === 'published').sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 8).map(out) };
  };
  const vreviews = db.vreviews || [], vname = id => (db.vendors.find(v => v.id === id) || {}).name || '';
  const topViewed = Object.entries(a.products).map(([id, v]) => ({ id, name: (db.products.find(p => p.id === id) || {}).name || id, ...v })).sort((x, y) => y.views - x.views).slice(0, 8);
  const users = db.users.filter(u => u.role === 'user');
  return {
    range, from, to: t, revenue, orders: inRange.length, collectedOnline: valid.reduce((s, o) => s + viaOnline(o), 0), validOrders: valid.length, aov: valid.length ? Math.round(gross / valid.length) : 0,
    cancelled: inRange.length - valid.length, customers: phones.length, newCustomers, repeatCustomers: phones.length - newCustomers,
    users: users.length, products: db.products.length, funnel,
    conversion: funnel.visits ? Math.min(100, Math.round(funnel.orders / funnel.visits * 1000) / 10) : 0,
    lowStock: db.products.filter(p => p.type === 'product' && p.stock < 10).map(p => ({ id: p.id, name: p.name, stock: p.stock })),
    byStatus, byState, days, byPay, topViewed,
    byEvent: Object.entries(byEvent).sort((x, y) => y[1] - x[1]),
    topProducts: Object.values(byProduct).sort((x, y) => y.revenue - x.revenue).slice(0, 8),
    topDistricts: Object.entries(byDistrict).sort((a, b) => b[1] - a[1]).slice(0, 8),
    byCat: Object.entries(byCat).sort((a, b) => b[1] - a[1]),
    catSales: Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([id, v]) => [(db.categories.find(c => c.id === id) || {}).name || 'Other', v]),
    // shop orders placed in the range, by their status now (byStatus above is all time)
    rangeStatus: Object.fromEntries(STATUSES.map(s => [s, inRange.filter(o => o.status === s).length])),
    // shop money: gross order value, refunds, what was really received and what is still to collect
    shop: {
      gross, refunds, net: revenue, collected: valid.reduce((s, o) => s + Math.max(0, (o.paid || 0) - refundOf(o)), 0), online: valid.reduce((s, o) => s + viaOnline(o), 0),
      due: valid.reduce((s, o) => s + Math.max(0, o.total - returnedValue(o) - (o.paid || 0)), 0), byMethod, payStatus,
      returned: valid.reduce((s, o) => s + returnedValue(o), 0),
      // money owed back on any order (cancelled after paying, or items returned) — not only this period
      refundDue: db.orders.reduce((s, o) => s + refundOwed(o), 0),
    },
    // cancel / return work waiting for the team (all time)
    aftercare: {
      cancelRequests: db.orders.filter(o => o.cancelRequest && o.cancelRequest.status === 'requested').length,
      returnRequests: db.orders.reduce((s, o) => s + (o.returns || []).filter(r => r.status === 'requested').length, 0),
      pickups: db.orders.reduce((s, o) => s + (o.returns || []).filter(r => r.status === 'approved').length, 0),
      refunds: db.orders.filter(o => refundOwed(o) > 0).length,
    },
    vendor: vendorApi.dashboard(inR),
    // vendor advances paid online to us: still to pass on to vendors, and to give back on bookings called off (all time)
    vendorMoney: (() => {
      const all = db.vbookings || [], live = all.filter(b => !['cancelled', 'rejected'].includes(b.status));
      return { collected: all.reduce((s, b) => s + (b.paid || 0), 0), paidOut: all.reduce((s, b) => s + vbPaidOut(b), 0),
        toPayOut: live.reduce((s, b) => s + vbHeld(b), 0), payoutBookings: live.filter(b => vbHeld(b) > 0).length,
        refundDue: all.reduce((s, b) => s + vbRefundOwed(b), 0), refundBookings: all.filter(b => vbRefundOwed(b) > 0).length };
    })(),
    // Razorpay: money in and back in the range; refunds on the way / sent back by the bank and payments waiting (all time)
    razorpay: (() => {
      const k = secrets(), sum = l => l.reduce((s, x) => s + x.amount, 0);
      const pIn = rzpPays.filter(p => inR(p.at)), back = rzpRefunds.filter(r => r.status !== 'failed' && inR(r.at));
      const byMethod = {};
      for (const p of pIn) { const m = ['upi', 'card', 'netbanking', 'wallet', 'emi'].includes(p.method) ? p.method : 'other', g = byMethod[m] || (byMethod[m] = { n: 0, value: 0 }); g.n++; g.value += p.amount; }
      // a refund the bank sent back still counts while the order / booking owes money
      const owes = r => { const x = r.kind === 'shop' ? db.orders.find(o => o.id === r.id) : (db.vbookings || []).find(b => b.id === r.id); return x && (r.kind === 'shop' ? refundOwed(x) : vbRefundOwed(x)) > 0; };
      const failedBack = rzpRefunds.filter(r => r.status === 'failed' && owes(r)), onWay = rzpRefunds.filter(r => r.status === 'pending');
      const waiting = db.orders.filter(o => o.payHold && o.paymentStatus === 'pending' && o.status === 'placed');
      const abandoned = inRange.filter(o => o.paymentStatus === 'failed');
      const onHold = [...db.orders, ...(db.vbookings || [])].filter(x => x.rzpRecheck).length;
      const recent = [...rzpPays.map(p => ({ type: 'payment', ...p })), ...rzpRefunds.map(r => ({ type: 'refund', ...r }))].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 12);
      return { on: onlinePayEnabled(), keys: !!(k.keyId && k.keySecret), testMode: k.keyId.startsWith('rzp_test_'), webhook: !!k.webhookSecret,
        received: sum(pIn), receivedN: pIn.length, shop: sum(pIn.filter(p => p.kind === 'shop')), vendor: sum(pIn.filter(p => p.kind === 'vendor')),
        refunded: sum(back), refundedN: back.length, net: sum(pIn) - sum(back), byMethod,
        refundsOnWay: { n: onWay.length, value: sum(onWay) }, refundsFailed: { n: failedBack.length, value: sum(failedBack) },
        waiting: { n: waiting.length, value: waiting.reduce((s, o) => s + (o.payNow || 0), 0) }, abandoned: { n: abandoned.length, value: abandoned.reduce((s, o) => s + (o.payNow || o.total), 0) },
        failedAttempts, onHold, allTime: sum(rzpPays) - sum(rzpRefunds.filter(r => r.status !== 'failed')), recent };
    })(),
    accounts: {
      users: users.length, newUsers: users.filter(u => inR(u.createdAt)).length, verified: users.filter(u => u.phoneVerified).length,
      orders: { account: valid.filter(o => !o.guest).length, guest: valid.filter(o => o.guest).length, guestLinked: valid.filter(o => o.guest && o.userId).length },
      vbookings: { account: vbLive.filter(b => b.userId).length, guest: vbLive.filter(b => !b.userId).length },
    },
    districts: Object.values(dist).sort((x, y) => (y.shop + y.vendor) - (x.shop + x.vendor) || (y.orders + y.vbookings) - (x.orders + x.vbookings)).slice(0, 10),
    side,
    upcoming: ahead.filter(u => u.date <= addDay(t, 30)).slice(0, 60),
    busiest: Object.values(load).sort((x, y) => (y.shop + y.vendor) - (x.shop + x.vendor) || x.date.localeCompare(y.date)).slice(0, 10),
    laganLoad: { days: laganAhead.length, onLagan: near.filter(u => lagan[u.date]).length, otherDays: near.filter(u => !lagan[u.date]).length },
    reviews: {
      product: rv(reviews(), r => (db.products.find(p => p.id === r.productId) || {}).name || ''),
      vendor: rv(vreviews, r => vname(r.vendorId)),
      sample: { n: vreviews.filter(r => r.sample).length + reviews().filter(r => r.sample).length },
    },
    recent: [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
  };
}
const statsRoute = (req, res, { query }) => send(res, 200, dashboardStats([1, 7, 30, 90, 180, 365].includes(num(query.get('days'))) ? num(query.get('days')) : 30));
route('GET', '/api/admin/stats', statsRoute, { admin: true });
route('GET', '/api/admin/dashboard', statsRoute, { admin: true });

// Booking calendar: every service booking in a month
route('GET', '/api/admin/calendar', (req, res, { query }) => {
  const month = /^\d{4}-\d{2}$/.test(query.get('month') || '') ? query.get('month') : today().slice(0, 7);
  const bookings = [];
  for (const o of db.orders) {
    if (o.status === 'cancelled') continue;
    for (const i of o.items) for (const d of itemDates(i)) if (d.date.startsWith(month)) {
      bookings.push({ date: d.date, event: d.event, name: i.name, emoji: i.emoji, qty: i.qty, unit: i.unit, productId: i.productId, orderId: o.id, order: o.number, status: o.status, customer: o.address.name, phone: o.address.phone, district: o.address.districtName });
    }
  }
  send(res, 200, { month, bookings: bookings.sort((a, b) => a.date.localeCompare(b.date)) });
}, { admin: true });

route('GET', '/api/admin/products', (req, res) => send(res, 200, { products: db.products }), { admin: true });
route('POST', '/api/admin/products', (req, res, { body }) => {
  const p = sanitizeProduct(body, { id: uid('p_'), type: 'product', unit: 'piece', minQty: 1, emoji: '🎁', image: '', desc: '', includes: [], stock: 100, active: true, featured: false, districts: 'all', createdAt: now() });
  if (!p.name || !p.price || !db.categories.some(c => c.id === p.cat)) return fail(res, 400, 'Name, price and category are required');
  db.products.push(p); save();
  send(res, 201, { product: p });
}, { admin: true });
route('PUT', '/api/admin/products/:id', (req, res, { params, body }) => {
  const i = db.products.findIndex(x => x.id === params.id);
  if (i < 0) return fail(res, 404, 'Product not found');
  db.products[i] = sanitizeProduct(body, db.products[i]); save();
  send(res, 200, { product: db.products[i] });
}, { admin: true });
route('DELETE', '/api/admin/products/:id', (req, res, { params }) => {
  db.products = db.products.filter(x => x.id !== params.id); save();
  send(res, 200, { ok: true });
}, { admin: true });

route('GET', '/api/admin/categories', (req, res) => send(res, 200, { categories: db.categories.map(c => ({ ...c, count: db.products.filter(p => p.cat === c.id).length })) }), { admin: true });
route('POST', '/api/admin/categories', (req, res, { body }) => {
  const name = str(body.name, 60);
  if (!name) return fail(res, 400, 'Category name required');
  let id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || uid('c_');
  if (db.categories.some(c => c.id === id)) id += '-' + crypto.randomBytes(2).toString('hex');
  const c = { id, name, nameHi: str(body.nameHi, 60), emoji: str(body.emoji, 8) || '🎁', color: str(body.color, 20) || '#fde7e7', image: str(body.image, 400), order: db.categories.length + 1, active: true,
    gstRate: gstRateIn(body.gstRate), hsn: validHsn(str(body.hsn, 8)) ? str(body.hsn, 8) : '',
    offPct: Math.min(90, Math.max(0, Math.round(num(body.offPct, 0)))), offUntil: /^\d{4}-\d{2}-\d{2}$/.test(str(body.offUntil, 10)) ? str(body.offUntil, 10) : '' };
  db.categories.push(c); save();
  send(res, 201, { category: c });
}, { admin: true });
route('PUT', '/api/admin/categories/:id', (req, res, { params, body }) => {
  const c = db.categories.find(x => x.id === params.id);
  if (!c) return fail(res, 404, 'Category not found');
  for (const k of ['name', 'nameHi', 'emoji', 'color']) if (k in body) c[k] = str(body[k], 60);
  if ('image' in body) c.image = str(body.image, 400);
  if ('order' in body) c.order = num(body.order, c.order);
  if ('active' in body) c.active = !!body.active;
  if ('gstRate' in body) c.gstRate = gstRateIn(body.gstRate);
  if ('hsn' in body) { const v = str(body.hsn, 8); if (v && !validHsn(v)) return fail(res, 400, 'HSN / SAC code must be 4, 6 or 8 digits'); c.hsn = v; }
  // category offer: % off every item in it, optionally until a date (inclusive)
  if ('offPct' in body) { const v = body.offPct === '' ? 0 : Math.round(num(body.offPct, -1)); if (v < 0 || v > 90) return fail(res, 400, 'Offer: 0–90 % off'); c.offPct = v; }
  if ('offUntil' in body) { const v = str(body.offUntil, 10); if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return fail(res, 400, 'Offer end date looks wrong'); c.offUntil = v; }
  save(); send(res, 200, { category: c });
}, { admin: true });
route('DELETE', '/api/admin/categories/:id', (req, res, { params }) => {
  if (db.products.some(p => p.cat === params.id)) return fail(res, 400, 'Move or delete the products in this category first');
  db.categories = db.categories.filter(c => c.id !== params.id); save();
  send(res, 200, { ok: true });
}, { admin: true });

// Packages (one-click bundles of products)
function sanitizePackage(b, existing = {}) {
  const k = { ...existing };
  if ('name' in b) k.name = str(b.name, 100);
  if ('nameHi' in b) k.nameHi = str(b.nameHi, 100);
  if ('image' in b) k.image = str(b.image, 400);
  if ('desc' in b) k.desc = str(b.desc, 1000);
  if ('order' in b) k.order = num(b.order, k.order || 1);
  if ('active' in b) k.active = !!b.active;
  if (Array.isArray(b.items)) k.items = b.items.filter(i => db.products.some(p => p.id === i.productId)).slice(0, 40).map(i => ({ productId: i.productId, qty: Math.max(1, Math.round(num(i.qty, 1))) }));
  return k;
}
route('GET', '/api/admin/packages', (req, res) => send(res, 200, { packages: db.packages || [] }), { admin: true });
route('POST', '/api/admin/packages', (req, res, { body }) => {
  const k = sanitizePackage(body, { id: uid('pk_'), name: '', nameHi: '', image: '', desc: '', items: [], order: (db.packages || []).length + 1, active: true });
  if (!k.name || !k.items.length) return fail(res, 400, 'Package name and at least one item are required');
  (db.packages = db.packages || []).push(k); save();
  send(res, 201, { package: k });
}, { admin: true });
route('PUT', '/api/admin/packages/:id', (req, res, { params, body }) => {
  const i = (db.packages || []).findIndex(x => x.id === params.id);
  if (i < 0) return fail(res, 404, 'Package not found');
  db.packages[i] = sanitizePackage(body, db.packages[i]); save();
  send(res, 200, { package: db.packages[i] });
}, { admin: true });
route('DELETE', '/api/admin/packages/:id', (req, res, { params }) => {
  db.packages = (db.packages || []).filter(x => x.id !== params.id); save();
  send(res, 200, { ok: true });
}, { admin: true });

// Lightweight poll used by the admin panel to alert on new orders
route('GET', '/api/admin/pending', (req, res) => {
  const placed = db.orders.filter(o => o.status === 'placed');
  const v = vendorApi.pendingCounts();
  send(res, 200, { count: placed.length, total: db.orders.length + v.vtotal, latest: db.orders.reduce((a, o) => (o.createdAt > a ? o.createdAt : a), ''), ...v });
}, { admin: true });

route('GET', '/api/admin/orders', (req, res) => send(res, 200, { orders: [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(withPolicy) }), { admin: true });
route('PUT', '/api/admin/orders/:id', (req, res, { params, body }) => {
  const o = db.orders.find(x => x.id === params.id);
  if (!o) return fail(res, 404, 'Order not found');
  // a business customer's GSTIN and registered name go on the tax invoice (B2B) — only until the invoice is issued
  if ('buyerGstin' in body || 'buyerName' in body) {
    const g = str(body.buyerGstin, 15).toUpperCase().trim(), n = str(body.buyerName, 120);
    if (!o.invoice) {
      if (g && !validGstin(g)) return fail(res, 400, "The customer's GSTIN does not look right");
      o.buyer = g || n ? { gstin: g, name: n } : undefined;
    } else if (g !== ((o.buyer || {}).gstin || '') || n !== ((o.buyer || {}).name || '')) return fail(res, 400, 'The tax invoice is already issued — its customer details cannot change');
  }
  if (body.status && body.status !== o.status) {
    const err = statusMoveError(o.status, body.status);
    if (err) return fail(res, 400, err);
    setStatus(o, body.status, str(body.statusNote, 200));
  } else if (str(body.statusNote, 200)) o.history.push({ status: o.status, at: now(), note: str(body.statusNote, 200) }); // an update without a status change
  if ('adminNote' in body) o.adminNote = str(body.adminNote, 1000);
  if ('paid' in body) {
    o.paid = Math.max(0, Math.round(num(body.paid)));
    if (!['pending', 'verifying', 'refunded'].includes(o.paymentStatus)) settleStatus(o);
  }
  save(); send(res, 200, { order: withPolicy(o) });
}, { admin: true });
// issue the GST tax invoice now (e.g. before delivery when the customer asks, or after setting a missing rate)
route('POST', '/api/admin/orders/:id/invoice', (req, res, { params }) => {
  const o = db.orders.find(x => x.id === params.id);
  if (!o) return fail(res, 404, 'Order not found');
  const r = issueInvoice(o);
  save();
  if (r.error) return fail(res, 400, r.error);
  send(res, 200, { order: withPolicy(o) });
}, { admin: true });
// GST report for a month (India time): one row per invoice / credit note per tax rate, as GSTR-1 asks, plus an HSN summary
route('GET', '/api/admin/gst-report', (req, res, { query }) => {
  const month = /^\d{4}-\d{2}$/.test(query.get('month') || '') ? query.get('month') : istDay().slice(0, 7);
  const rows = [], hsn = {}, K = ['taxable', 'cgst', 'sgst', 'igst', 'amount'];
  for (const o of db.orders) {
    const inv = o.invoice;
    if (!inv) continue;
    const docs = [...(istDay(inv.date).startsWith(month) ? [['Invoice', inv, 1]] : []), ...(o.creditNotes || []).filter(c => istDay(c.date).startsWith(month)).map(c => ['Credit note', c, -1])];
    for (const [type, doc, sign] of docs) {
      const byRate = {};
      for (const l of doc.lines) {
        const g = byRate[l.rate] || (byRate[l.rate] = Object.fromEntries(K.map(k => [k, 0])));
        const x = hsn[`${l.hsn}|${l.rate}`] || (hsn[`${l.hsn}|${l.rate}`] = { hsn: l.hsn, rate: l.rate, qty: 0, ...Object.fromEntries(K.map(k => [k, 0])) });
        x.qty += sign * l.qty;
        for (const k of K) { g[k] = r2(g[k] + l[k]); x[k] = r2(x[k] + sign * l[k]); }
      }
      for (const [rate, g] of Object.entries(byRate)) rows.push({ type, number: doc.number, date: istDay(doc.date), against: doc.against || '', order: o.number, customer: inv.buyer.name, gstin: inv.buyer.gstin || '', b2b: !!inv.buyer.gstin, placeOfSupply: doc.placeOfSupply, rate: Number(rate), ...g });
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));
  const net = Object.fromEntries(K.map(k => [k, r2(rows.reduce((a, r) => a + (r.type === 'Invoice' ? 1 : -1) * r[k], 0))]));
  const s = gstSeller();
  send(res, 200, { month, seller: s && { gstin: s.gstin, name: s.legalName }, rows, net, hsn: Object.values(hsn).sort((a, b) => a.hsn.localeCompare(b.hsn) || a.rate - b.rate),
    invoices: new Set(rows.filter(r => r.type === 'Invoice').map(r => r.number)).size, creditNotes: new Set(rows.filter(r => r.type !== 'Invoice').map(r => r.number)).size,
    // delivered / completed orders of the month still without an invoice (e.g. a GST rate not set)
    missing: db.orders.filter(o => !o.invoice && ['delivered', 'completed'].includes(o.status) && istDay(deliveredAt(o) || o.createdAt).startsWith(month)).map(o => ({ number: o.number, id: o.id, error: o.invoiceError || '' })) });
}, { admin: true });

// Product reviews: hide / show, reply (shown under the review), delete (the order line stays "reviewed")
route('GET', '/api/admin/reviews', (req, res) => send(res, 200, { reviews: reviews().map(r => ({ ...r, productName: (db.products.find(p => p.id === r.productId) || {}).name || '' })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }), { admin: true });
route('PUT', '/api/admin/reviews/:id', (req, res, { params, body }) => {
  const r = reviews().find(x => x.id === params.id);
  if (!r) return fail(res, 404, 'Review not found');
  if (['published', 'hidden'].includes(body.status)) r.status = body.status;
  if ('reply' in body) r.reply = str(body.reply, 800);
  save(); send(res, 200, { review: r });
}, { admin: true });
route('DELETE', '/api/admin/reviews/:id', (req, res, { params }) => {
  const r = reviews().find(x => x.id === params.id);
  if (!r) return fail(res, 404, 'Review not found');
  db.reviews = reviews().filter(x => x !== r);
  if (/^\/uploads\/[\w.-]+$/.test(r.photo || '')) fs.rm(path.join(UPLOAD_DIR, path.basename(r.photo)), { force: true }, () => {});
  save(); send(res, 200, { ok: true });
}, { admin: true });

route('GET', '/api/admin/users', (req, res) => {
  // same ownership rules as My Account: shop orders (spent) and vendor bookings (value paid to vendors) per account
  send(res, 200, { users: db.users.map(u => {
    const os = ordersOf(u), vb = vendorApi.bookingsOf(u), liveVB = vb.filter(b => !['cancelled', 'rejected'].includes(b.status));
    return { ...publicUser(u), blocked: !!u.blocked, orders: os.length, spent: os.filter(o => o.status !== 'cancelled').reduce((a, o) => a + o.total, 0), vbookings: vb.length, vbValue: liveVB.reduce((a, b) => a + (b.total || 0), 0) };
  }) });
}, { admin: true });
route('PUT', '/api/admin/users/:id', (req, res, { params, body, user: me }) => {
  const u = db.users.find(x => x.id === params.id);
  if (!u) return fail(res, 404, 'User not found');
  if (u.id === me.id) return fail(res, 400, 'You cannot change your own admin account here');
  if ('blocked' in body) {
    u.blocked = !!body.blocked;
    if (u.blocked) for (const t of Object.keys(db.sessions)) if (sessionUid(db.sessions[t]) === u.id) delete db.sessions[t];
  }
  if ('role' in body) u.role = body.role === 'admin' ? 'admin' : 'user';
  save(); send(res, 200, { ok: true });
}, { admin: true });

route('GET', '/api/admin/districts', (req, res) => send(res, 200, { districts: db.districts }), { admin: true });
route('PUT', '/api/admin/districts/:id', (req, res, { params, body }) => {
  const d = db.districts.find(x => x.id === params.id);
  if (!d) return fail(res, 404, 'District not found');
  if ('active' in body) d.active = !!body.active;
  if ('extraCharge' in body) d.extraCharge = Math.max(0, Math.round(num(body.extraCharge)));
  save(); send(res, 200, { district: d });
}, { admin: true });
route('PUT', '/api/admin/districts', (req, res, { body }) => {
  for (const d of db.districts) if (!body.state || d.state === body.state) d.active = !!body.active;
  save(); send(res, 200, { districts: db.districts });
}, { admin: true });

route('GET', '/api/admin/settings', (req, res) => send(res, 200, { settings: db.settings }), { admin: true });
route('PUT', '/api/admin/settings', (req, res, { body }) => {
  // checked before anything changes, so a wrong GSTIN saves nothing
  const gIn = str(body.gstin, 15).toUpperCase().trim(), pIn = str(body.invoicePrefix, 4).toUpperCase();
  if ('gstin' in body && gIn && !validGstin(gIn)) return fail(res, 400, 'This GSTIN does not look right — check it on your GST certificate (15 characters, e.g. 10ABCDE1234F1Z5)');
  if ('invoicePrefix' in body && pIn && !/^[A-Z0-9]{1,4}$/.test(pIn)) return fail(res, 400, 'Invoice prefix: 1–4 letters or digits, e.g. INV or VS');
  const s = db.settings;
  for (const k of ['siteName', 'tagline', 'phone', 'whatsapp', 'email', 'announcement']) if (k in body) s[k] = str(body[k], 200);
  // business details shown on Contact Us, Terms, Privacy and Shipping (Razorpay checks these pages before going live)
  const biz = s.business || {}, nb = { ...biz };
  for (const [k, max] of [['legalName', 120], ['address', 400], ['hours', 120], ['grievanceName', 80], ['grievanceEmail', 120], ['gstin', 15], ['deliveryTime', 300], ['city', 60], ['invoicePrefix', 4]]) if (k in body) nb[k] = str(body[k], max);
  if (nb.gstin) nb.gstin = nb.gstin.toUpperCase().trim();
  if ('invoicePrefix' in body) nb.invoicePrefix = nb.invoicePrefix.toUpperCase();
  if ('autoInvoice' in body) nb.autoInvoice = [true, 1, '1', 'true', 'on'].includes(body.autoInvoice);
  if (JSON.stringify(nb) !== JSON.stringify(biz)) { nb.updated = istDay(); s.business = nb; }
  for (const k of ['deliveryCharge', 'freeDeliveryAbove', 'advancePercent']) if (k in body) s[k] = Math.max(0, Math.round(num(body[k])));
  for (const [k, max] of [['returnDays', 30], ['refundDays', 30]]) if (k in body) s[k] = Math.min(max, Math.max(1, Math.round(num(body[k], 7))));
  // go-live switch: sample vendors (placeholder phones) can be hidden from families once real vendors are in
  if ('showSamples' in body) s.showSamples = [true, 1, '1', 'true', 'on'].includes(body.showSamples);
  if (Array.isArray(body.banners)) s.banners = body.banners.slice(0, 8).map(b => ({ title: str(b.title, 80), subtitle: str(b.subtitle, 160), cta: str(b.cta, 30), link: str(b.link, 120), emoji: str(b.emoji, 8), theme: str(b.theme, 20), image: str(b.image, 400) }));
  save(); send(res, 200, { settings: s });
}, { admin: true });

// ---------- Admin: payment & SMS integrations ----------
const mask = v => (v ? v.slice(0, 4) + '••••' + v.slice(-4) : '');
route('GET', '/api/admin/integrations', (req, res) => {
  const s = db.secrets || {}, k = secrets();
  send(res, 200, {
    onlinePayments: !!db.settings.onlinePayments, otpLogin: !!db.settings.otpLogin, otpRequired: !!db.settings.otpRequired,
    upiId: db.settings.upiId || '', upiName: db.settings.upiName || '',
    googleMapsKey: db.settings.googleMapsKey || '', mapsFromEnv: !!process.env.GOOGLE_MAPS_KEY,
    razorpay: { keyId: k.keyId, hasSecret: !!k.keySecret, hasWebhookSecret: !!k.webhookSecret, fromEnv: !!process.env.RAZORPAY_KEY_ID, mode: k.keyId.startsWith('rzp_live_') ? 'live' : k.keyId ? 'test' : '' },
    sms: { provider: k.sms.provider, apiKey: mask(k.sms.apiKey), urlTemplate: k.sms.urlTemplate ? k.sms.urlTemplate.replace(/(key|auth\w*|apikey|api_key)=([^&]+)/gi, (m, a) => `${a}=••••`) : '', fromEnv: !!process.env.SMS_PROVIDER },
    working: { online: onlinePayEnabled(), savedProvider: s.smsProvider || 'console' },
    supabase: sb.status(),
    // what a real family meets: real vendors, sample ones hidden, a contact number, how they pay
    readiness: (() => {
      const real = (db.vendors || []).filter(v => !v.sample);
      return { realVendors: real.length, verifiedReal: real.filter(v => v.verified && v.active).length, sampleVendors: (db.vendors || []).length - real.length,
        showSamples: db.settings.showSamples !== false, sitePhone: !!db.settings.phone, siteWhatsapp: !!db.settings.whatsapp, upi: !!db.settings.upiId,
        business: !!(db.settings.business && db.settings.business.legalName && db.settings.business.address && db.settings.email) };
    })(),
  });
}, { admin: true });
route('PUT', '/api/admin/integrations', (req, res, { body }) => {
  const s = db.secrets || (db.secrets = {});
  for (const k of ['onlinePayments', 'otpLogin', 'otpRequired']) if (k in body) db.settings[k] = !!body[k];
  if ('upiId' in body) {
    const id = str(body.upiId, 60);
    if (id && !/^[\w.\-]{2,}@[a-zA-Z][\w]{1,}$/.test(id)) return fail(res, 400, 'UPI ID looks wrong. It should look like shopname@okaxis or 9876543210@ybl');
    db.settings.upiId = id;
  }
  if ('upiName' in body) db.settings.upiName = str(body.upiName, 60);
  if ('googleMapsKey' in body) {
    const key = str(body.googleMapsKey, 100);
    if (key && !/^[\w-]{20,100}$/.test(key)) return fail(res, 400, 'Google Maps key looks wrong. It usually starts with AIza…');
    db.settings.googleMapsKey = key;
  }
  if ('rzpKeyId' in body) s.rzpKeyId = str(body.rzpKeyId, 60);
  // secret fields are write-only: an empty value keeps the saved one
  if (body.rzpKeySecret) s.rzpKeySecret = str(body.rzpKeySecret, 100);
  if (body.rzpWebhookSecret) s.rzpWebhookSecret = str(body.rzpWebhookSecret, 100);
  if (['console', 'fast2sms', 'custom'].includes(body.smsProvider)) s.smsProvider = body.smsProvider;
  if (body.smsApiKey) s.smsApiKey = str(body.smsApiKey, 200);
  if (body.smsUrlTemplate && !body.smsUrlTemplate.includes('••••')) s.smsUrlTemplate = str(body.smsUrlTemplate, 600);
  // Supabase: project URL, service-role key and (optional) access token; the keys are write-only like the others
  const sbWas = JSON.stringify([s.sbUrl, s.sbServiceKey, s.sbAccessToken]);
  if ('sbUrl' in body) {
    const u = str(body.sbUrl, 200).replace(/\/+$/, '');
    if (u && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(u)) return fail(res, 400, 'Supabase project URL looks wrong. It is like https://abcdefgh.supabase.co (Project Settings → API)');
    s.sbUrl = u;
  }
  if (body.sbServiceKey) s.sbServiceKey = str(body.sbServiceKey, 600);
  if (body.sbAccessToken) s.sbAccessToken = str(body.sbAccessToken, 200);
  if (db.settings.onlinePayments && !onlinePayEnabled()) { db.settings.onlinePayments = false; save(); return fail(res, 400, 'Enter Razorpay Key ID and Key Secret before turning on online payments'); }
  save();
  if (JSON.stringify([s.sbUrl, s.sbServiceKey, s.sbAccessToken]) !== sbWas) sb.start().catch(() => {}); // connect / copy everything now
  send(res, 200, { ok: true });
}, { admin: true });
route('POST', '/api/admin/integrations/test-razorpay', async (req, res) => {
  const k = secrets();
  if (!k.keyId || !k.keySecret) return fail(res, 400, 'Save Key ID and Key Secret first');
  try { const o = await razorpay.createOrder(k, { amount: 1, receipt: 'key-test', notes: { purpose: 'Key test from admin' } }); send(res, 200, { ok: true, message: `Keys work ✓ (${k.keyId.startsWith('rzp_live_') ? 'LIVE' : 'TEST'} mode, test order ${o.id})` }); } catch (e) { fail(res, 400, 'Razorpay rejected the keys: ' + e.message); }
}, { admin: true });
route('POST', '/api/admin/integrations/test-sms', async (req, res, { body }) => {
  const phone = str(body.phone, 15);
  if (!/^[6-9]\d{9}$/.test(phone)) return fail(res, 400, 'Enter a valid 10-digit mobile number');
  const k = secrets();
  try { await otp.deliver(k.sms, phone, '123456'); send(res, 200, { ok: true, message: k.sms.provider === 'console' ? 'Test mode: OTP 123456 printed in the server window' : `Test SMS with OTP 123456 sent to ${phone}` }); } catch (e) { fail(res, 400, 'SMS failed: ' + e.message); }
}, { admin: true });

// Approve / reject a UPI payment the customer reported with a UTR number
route('POST', '/api/admin/orders/:id/utr', (req, res, { params, body }) => {
  const o = db.orders.find(x => x.id === params.id);
  if (!o || o.paymentStatus !== 'verifying') return fail(res, 400, 'No UPI payment waiting for verification');
  if (body.action === 'approve') {
    o.payments = [...(o.payments || []), { id: 'UTR ' + o.utr, amount: o.utrAmount, via: 'upi', at: now() }];
    o.paid = (o.paid || 0) + o.utrAmount; settleStatus(o);
    o.history.push({ status: o.status, at: now(), note: `UPI payment ₹${o.utrAmount} verified (UTR ${o.utr})` });
  } else {
    o.paymentStatus = o.utrPrevStatus || 'unpaid';
    o.history.push({ status: o.status, at: now(), note: `UPI reference ${o.utr} could not be found – please pay again or call us` });
    o.rejectedUtrs = [...(o.rejectedUtrs || []), o.utr]; o.utr = '';
  }
  save(); send(res, 200, { order: o });
}, { admin: true });

// Refund an online payment through Razorpay (full or part)
route('POST', '/api/admin/orders/:id/refund', async (req, res, { params, body }) => {
  const o = db.orders.find(x => x.id === params.id);
  if (!o) return fail(res, 404, 'Order not found');
  if (!(o.payments || []).some(p => ONLINE_VIA.includes(p.via))) return fail(res, 400, 'Only orders paid online through Razorpay can be refunded here');
  const amount = Math.round(num(body.amount, refundOwed(o)));
  if (amount <= 0 || amount > (o.paid || 0) - refundTotal(o)) return fail(res, 400, 'Refund amount is more than what is left of the payment');
  // split over the online payments (an advance and a balance are two payments, each refunds at most its own amount)
  const r = await splitRefund(o, amount, (rf, part, p) => addRefund(o, { id: rf.id, amount: part, via: 'razorpay', paymentId: p.id, status: rf.status === 'processed' ? 'processed' : 'pending' }, `₹${part} refunded online — it reaches the same bank / UPI account in 5–7 working days (Razorpay ${rf.id})`));
  save();
  if (r.error) return fail(res, 400, r.error);
  send(res, 200, { order: withPolicy(o) });
}, { admin: true });
function addRefund(o, r, note) {
  o.refunds = [...(o.refunds || []), { ...r, at: now() }];
  if (refundTotal(o) >= (o.paid || 0) && o.paid) o.paymentStatus = 'refunded';
  o.history.push({ status: o.status, at: now(), note });
  settleReturns(o, 'refund');
}
// Refund sent outside Razorpay (UPI transfer / cash) — the team records it so the customer sees it on Track Order
route('POST', '/api/admin/orders/:id/refund-manual', (req, res, { params, body }) => {
  const o = db.orders.find(x => x.id === params.id);
  if (!o) return fail(res, 404, 'Order not found');
  const amount = Math.round(num(body.amount)), left = (o.paid || 0) - refundTotal(o);
  if (amount <= 0) return fail(res, 400, 'Enter the refund amount');
  if (amount > left) return fail(res, 400, `Only ${inrS(left)} of the payment is left to refund`);
  const via = ['upi', 'cash', 'bank'].includes(body.via) ? body.via : 'upi', ref = str(body.ref, 60);
  if (via !== 'cash' && !ref) return fail(res, 400, 'Enter the UPI / bank reference number of the refund');
  addRefund(o, { id: ref || 'cash', amount, via }, `₹${amount} refunded by ${via === 'upi' ? 'UPI' : via === 'bank' ? 'bank transfer' : 'cash'}${ref ? ` (ref ${ref})` : ''}`);
  save(); send(res, 200, { order: withPolicy(o) });
}, { admin: true });
const inrS = v => '₹' + Math.round(v).toLocaleString('en-IN');

// Cancellation asked after dispatch: approve (order is cancelled) or keep the order going
route('POST', '/api/admin/orders/:id/cancel-request', (req, res, { params, body }) => {
  const o = db.orders.find(x => x.id === params.id);
  if (!o || !o.cancelRequest || o.cancelRequest.status !== 'requested') return fail(res, 400, 'No cancellation request waiting on this order');
  const note = str(body.note, 200), cr = o.cancelRequest;
  if (body.action === 'approve') {
    if (o.status !== 'dispatched') return fail(res, 400, 'This order has moved on — it can no longer be cancelled');
    cr.status = 'approved'; cr.answeredAt = now();
    setStatus(o, 'cancelled', 'Cancellation approved' + (note ? ' — ' + note : ''));
    o.cancel = { by: 'customer', reason: cr.reason, note: cr.note, at: now() };
  } else if (body.action === 'reject') {
    if (!note) return fail(res, 400, 'Tell the customer why the order cannot be cancelled');
    cr.status = 'rejected'; cr.reply = note; cr.answeredAt = now();
    o.history.push({ status: o.status, at: now(), note: 'Cancellation not possible — ' + note });
  } else return fail(res, 400, 'Choose approve or reject');
  save(); send(res, 200, { order: withPolicy(o) });
}, { admin: true });

function restock(o, items) {
  for (const x of items) { const i = o.items[x.line], p = i && db.products.find(y => y.id === i.productId); if (p && i.type === 'product' && !i.extra) p.stock += x.qty; }
}

// Delivery check: the person delivering counts every saman line with the customer, notes damaged pieces, adds
// photos and who received it, then the order is marked delivered. Pieces short or damaged at the door are not kept
// by the customer: they come off the bill (or are refunded) through a "DL" return that is already settled.
route('POST', '/api/admin/orders/:id/delivery-check', (req, res, { params, body }) => {
  const o = db.orders.find(x => x.id === params.id);
  if (!o) return fail(res, 404, 'Order not found');
  const moveErr = o.status === 'delivered' ? '' : statusMoveError(o.status, 'delivered');
  if (moveErr) return fail(res, 400, moveErr);
  if (o.deliveryCheck) return fail(res, 400, 'Delivery check is already saved for this order');
  const receivedBy = str(body.receivedBy, 80).trim(), checkedBy = str(body.checkedBy, 80).trim();
  if (!receivedBy) return fail(res, 400, 'Enter who received the order');
  if (!checkedBy) return fail(res, 400, 'Enter who checked the delivery');
  const got = new Map((Array.isArray(body.lines) ? body.lines : []).map(x => [Math.round(num(x.line, -1)), x]));
  const lines = [];
  for (const [k, i] of o.items.entries()) {
    if (i.type !== 'product') continue;
    const x = got.get(k) || {}, received = Math.round(num(x.received, i.qty)), damaged = Math.round(num(x.damaged, 0));
    if (received < 0 || damaged < 0 || received + damaged > i.qty) return fail(res, 400, `${i.name}: good + damaged cannot be more than ${i.qty}`);
    lines.push({ line: k, name: i.name, qty: i.qty, received, damaged, short: i.qty - received - damaged, note: str(x.note, 120) });
  }
  if (!lines.length) return fail(res, 400, 'This order has no saman to count — just mark it delivered');
  const photos = storePhotos(body.photos, res);
  if (!photos) return;
  if (lines.some(l => l.damaged) && !photos.length) return fail(res, 400, 'Add a photo of the damaged pieces');
  o.deliveryCheck = { at: now(), checkedBy, receivedBy, lines, photos, note: str(body.note, 300) };
  const bad = lines.filter(l => l.short || l.damaged);
  if (bad.length) {
    const items = bad.map(l => ({ line: l.line, name: l.name, qty: l.short + l.damaged, price: o.items[l.line].price }));
    const r = { id: 'DL' + (1 + (o.returns || []).filter(x => x.id.startsWith('DL')).length), kind: 'delivery', at: now(), items, value: items.reduce((a, x) => a + x.price * x.qty, 0),
      reason: 'Short / damaged at delivery', note: bad.map(l => `${l.name}: ${[l.short && l.short + ' not delivered', l.damaged && l.damaged + ' damaged'].filter(Boolean).join(', ')}`).join('; '), photos, status: 'picked',
      history: [{ status: 'picked', at: now(), note: 'Counted at delivery' }] };
    o.returns = [...(o.returns || []), r];
    restock(o, bad.filter(l => l.short).map(l => ({ line: l.line, qty: l.short }))); // never left the shop
  }
  const total = lines.reduce((a, l) => a + l.qty, 0), good = lines.reduce((a, l) => a + l.received, 0);
  const summary = `Checked at delivery by ${checkedBy}, received by ${receivedBy}: ${good} of ${total} pieces OK`
    + (bad.length ? ` — ${bad.map(l => `${l.name}: ${[l.short && l.short + ' short', l.damaged && l.damaged + ' damaged'].filter(Boolean).join(', ')}`).join('; ')} (taken off the bill)` : '');
  if (o.status !== 'delivered') setStatus(o, 'delivered', summary); else { o.history.push({ status: o.status, at: now(), note: summary }); syncCreditNotes(o); }
  if (!['pending', 'verifying', 'refunded'].includes(o.paymentStatus)) settleStatus(o);
  settleReturns(o);
  save(); send(res, 200, { order: withPolicy(o) });
}, { admin: true });

// Return requests: requested → approved (pickup arranged) → picked (items back, stock back) → done once refunded
// (or straight away when nothing was paid — the items just come off the bill). Rejected needs a reason.
route('POST', '/api/admin/orders/:id/returns/:rid', (req, res, { params, body }) => {
  const o = db.orders.find(x => x.id === params.id);
  const r = o && (o.returns || []).find(x => x.id === params.rid);
  if (!r) return fail(res, 404, 'Return not found');
  const note = str(body.note, 200), act = body.action;
  const step = { approve: ['requested', 'approved'], reject: ['requested', 'rejected'], picked: ['approved', 'picked'] }[act];
  if (!step) return fail(res, 400, 'Unknown action');
  if (act === 'picked' && r.status === 'requested') step[0] = 'requested'; // collected at the door without a separate approval
  if (r.status !== step[0]) return fail(res, 400, `This return is already ${r.status}`);
  if (act === 'reject' && !note) return fail(res, 400, 'Tell the customer why the return is not accepted');
  r.status = step[1];
  r.history.push({ status: step[1], at: now(), note });
  const list = r.items.map(x => `${x.name} × ${x.qty}`).join(', ');
  if (act === 'approve') o.history.push({ status: o.status, at: now(), note: `Return ${r.id} approved — pickup will be arranged${note ? ': ' + note : ''}` });
  if (act === 'reject') o.history.push({ status: o.status, at: now(), note: `Return ${r.id} not accepted — ${note}` });
  if (act === 'picked') {
    // good items go back on the shelf; damaged ones do not
    if (r.reason !== 'Damaged / broken') restock(o, r.items);
    o.history.push({ status: o.status, at: now(), note: `Return ${r.id} picked up (${list})${refundOwed(o) ? ` — refund of ₹${refundOwed(o)} will be sent within ${policy().refundDays} days` : ` — ₹${r.value} taken off the bill`}` });
    if (!['pending', 'verifying', 'refunded'].includes(o.paymentStatus)) settleStatus(o);
    settleReturns(o);
    syncCreditNotes(o); // items back after the tax invoice: a GST credit note
  }
  save(); send(res, 200, { order: withPolicy(o) });
}, { admin: true });

function handleUpload(req, res, { body }) {
  const m = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/.exec(String(body.dataUrl || ''));
  if (!m) return fail(res, 400, 'Upload a PNG, JPG, WEBP or GIF image');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 5 * 1024 * 1024) return fail(res, 400, 'Image must be under 5 MB');
  const name = uid('img_') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  send(res, 201, { url: '/uploads/' + name });
}
route('POST', '/api/admin/upload', handleUpload, { admin: true });
// vendors upload photos of their own listings
route('POST', '/api/vendor/upload', (req, res, ctx) => {
  if (ctx.user.role !== 'vendor') return fail(res, 403, 'Vendor accounts only');
  handleUpload(req, res, ctx);
}, { auth: true });

// ---------- Vendor marketplace ----------
// ---------- Live copy in Supabase (environment variables win over values saved in Admin) ----------
sb = setupSupabase({ getDb: () => db, config: () => { const s = db.secrets || {}; return {
  url: process.env.SUPABASE_URL || s.sbUrl || '', key: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || s.sbServiceKey || '', token: process.env.SUPABASE_ACCESS_TOKEN || s.sbAccessToken || '' }; } });
route('POST', '/api/admin/supabase/sync', async (req, res) => {
  if (!sb.status().configured) return fail(res, 400, 'Connect Supabase first (project URL and service-role key)');
  await sb.applySchema(); await sb.run();
  const s = sb.status();
  if (s.ok === false) return fail(res, 502, s.lastError);
  send(res, 200, { supabase: s });
}, { admin: true });

const vendorApi = setupVendors({
  route, db: () => db, save, send, fail, str, num, uid, now, today, currentUser, hashPassword, bump, clientIp, vbMoney,
});

// ---------- Server ----------
function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/admin' || pathname === '/admin/') pathname = '/admin.html';
  if (pathname === '/vendor' || pathname === '/vendor/') pathname = '/vendor.html';
  let name;
  try { name = decodeURIComponent(pathname); } catch { res.writeHead(400, { 'Content-Type': 'text/plain' }); return res.end('Bad address'); } // a broken %-code must not stop the server
  const isUpload = name.startsWith('/uploads/');
  const base = isUpload ? UPLOAD_DIR : PUBLIC_DIR;
  const relative = isUpload ? name.slice('/uploads/'.length) : name;
  const file = path.resolve(base, '.' + (relative.startsWith('/') ? relative : '/' + relative));
  const fromBase = path.relative(base, file);
  if (!fromBase || fromBase === '..' || fromBase.startsWith('..' + path.sep) || path.isAbsolute(fromBase)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    // the browser keeps photos a week; pages, scripts and styles it checks each time (a quick "not changed" when same)
    const ext = path.extname(file).toLowerCase(), etag = `"${st.size.toString(36)}-${Math.round(st.mtimeMs).toString(36)}"`;
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', ETag: etag, 'Cache-Control': /^\/(uploads|img)\//.test(name) ? 'public, max-age=604800' : 'no-cache' };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
    if (isUpload || !TEXT_EXT.has(ext) || st.size > 5e6) {
      const stream = fs.createReadStream(file);
      stream.once('error', () => res.destroy());
      res.once('close', () => stream.destroy());
      res.writeHead(200, headers);
      return stream.pipe(res);
    }
    // text files are kept in memory with their gzipped copy (read and squeezed once per version of the file)
    let c = staticCache.get(file);
    if (!c || c.etag !== etag) {
      const body = fs.readFileSync(file);
      c = { etag, body, gz: body.length > 1024 ? zlib.gzipSync(body, { level: 9 }) : null };
      staticCache.set(file, c);
    }
    writeBody(res, 200, headers, c.body, c.gz);
  });
}
const TEXT_EXT = new Set(['.html', '.css', '.js', '.json', '.svg', '.webmanifest', '.txt']), staticCache = new Map();

// basic browser protections on every response: no guessing file types (uploaded photos), no framing by other
// sites, no full address sent to other sites
// (the content policy blocks plugins, <base> tricks and other sites framing us; it leaves scripts alone because the
// pages use small inline onerror handlers on photos — tightening script-src means removing those first)
const SECURITY_HEADERS = { 'Content-Security-Policy': "object-src 'none'; base-uri 'self'; frame-ancestors 'self'", 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)' };
const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { return fail(res, 400, 'Bad address'); }
  // for the host's load balancer / uptime checks
  if (url.pathname === '/healthz') return send(res, 200, { ok: true, uptime: Math.round(process.uptime()), version: dataVersion });
  if (url.pathname === '/readyz') return send(res, stopping || saveFailed ? 503 : 200, { ok: !stopping && !saveFailed });
  if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url.pathname);
  if (flooding(clientIp(req))) return fail(res, 429, 'Too many requests from your network. Please wait a minute.');
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const m = r.re.exec(url.pathname);
    if (!m) continue;
    // public answers (no login, no order / booking look-up) come from the short cache when nothing has changed
    if (req.method === 'GET' && !r.auth && !r.admin && !r.lookup) {
      const key = url.pathname + url.search, e = cached(key);
      if (e) return writeBody(res, 200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, e.body, e.gz);
      res.cacheKey = key;
    }
    try {
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const ctx = { params, query: url.searchParams, body: {} };
      if (['POST', 'PUT'].includes(req.method)) { const b = await readBody(req); ctx.body = b.json; ctx.raw = b.raw; }
      if (r.auth || r.admin) {
        ctx.user = currentUser(req);
        if (!ctx.user) return fail(res, 401, 'Please login to continue');
        if (r.admin && ctx.user.role !== 'admin') return fail(res, 403, 'Admin access only');
      }
      // look-ups by order / booking number + mobile: 40 misses an hour from one address, then wait (stops guessing)
      if (r.lookup && lookupFail.over(clientIp(req))) return fail(res, 429, 'Too many tries. Please check the number and mobile, and try again in an hour.');
      const out = await r.handler(req, res, ctx);
      if (r.lookup && res.statusCode === 404) lookupFail.hit(clientIp(req));
      return out;
    } catch (e) {
      // the visitor sees what they can fix (bad address / data), never the inside of the server; only real faults are logged
      const known = /^(Payload too large|Invalid JSON|URI malformed)$/.test(e.message || '');
      if (!known) console.error(e);
      if (!res.headersSent) return fail(res, known ? 400 : 500, known ? (e.message === 'URI malformed' ? 'Bad address' : e.message) : 'Something went wrong. Please try again.');
      return;
    }
  }
  fail(res, 404, 'API route not found');
});

// when the host stops or redeploys the app: write any change still waiting (saves are batched for 150 ms), then exit
let stopping = false;
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => {
  if (stopping) return; stopping = true;
  let exitCode = 1;
  server.close(() => {
    exitCode = saveNow() ? 0 : 1;
    Promise.resolve(sb && sb.flush()).catch(() => {}).finally(() => process.exit(exitCode));
  });
  setTimeout(() => {
    if (savePendingSince) exitCode = saveNow() ? 0 : 1;
    process.exit(exitCode);
  }, 10000).unref();
});
// one bad request or a failed SMS / payment call must not take the whole site down
process.on('unhandledRejection', e => console.error('Unhandled error', e));
for (const r of routes) if (LOOKUP_PATHS.includes(r.pattern)) r.lookup = true;
// sessions from before expiry existed (just a user id): they start their clock now
if (db.sessions) for (const [t, s] of Object.entries(db.sessions)) if (typeof s === 'string') db.sessions[t] = { u: s, at: now() };

server.listen(PORT, () => {
  console.log(`\n  Vivah Saathi is running`);
  console.log(`  Store : http://localhost:${PORT}`);
  console.log(`  Admin : http://localhost:${PORT}/admin\n`);
  // Supabase: tables up to date, then everything compared and copied
  if (sb.status().configured) sb.start(restoredMsg).then(() => { const s = sb.status(); console.log(s.ok ? `  Supabase: live copy up to date (${s.ref})` : `  Supabase: ${s.schemaError || s.lastError}`); });
});
