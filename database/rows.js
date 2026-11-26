// The live data (db.json) as rows of the tables in database/schema.sql — one place for the mapping, used by the
// SQL export (database/export.js) and the live copy in Supabase (backend/supabase.js).
// Login sessions, OTP codes and API keys / secrets are never turned into rows.
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { districtGeo } = require(path.join(ROOT, 'backend', 'geo'));
const { INGREDIENTS } = require(path.join(ROOT, 'backend', 'ingredients'));

// every table in the order rows can be written (a row's parent first); `key` = primary key columns, or
// `parent` for item / history tables whose rows are replaced together for one order / booking
const TABLES = [
  ['settings', { key: ['key'] }], ['counters', { key: ['name'] }], ['site_analytics', { key: ['day'] }], ['product_stats', { key: ['product_id'] }],
  ['districts', { key: ['id'] }], ['users', { key: ['id'] }], ['categories', { key: ['id'] }], ['products', { key: ['id'] }], ['packages', { key: ['id'] }],
  ['orders', { key: ['id'] }], ['order_items', { parent: 'order_id' }], ['order_history', { parent: 'order_id' }], ['order_returns', { key: ['order_id', 'id'] }],
  ['product_reviews', { key: ['id'] }], ['vendors', { key: ['id'] }], ['vendor_docs', { key: ['id'] }], ['vendor_listings', { key: ['id'] }],
  ['vendor_bookings', { key: ['id'] }], ['vendor_booking_items', { parent: 'booking_id' }], ['vendor_visits', { key: ['id'] }], ['vendor_reviews', { key: ['id'] }],
  ['lagan_dates', { key: ['date'] }], ['lagan_sheets', { key: ['id'] }], ['ingredients', { key: ['key'] }],
];
// JSONB columns that can hold a plain number or text ("all", 99): SQL needs those written as JSON text
const JSON_SCALARS = { settings: ['value'], products: ['districts'] };

const day = v => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null); // DATE columns: empty → NULL
const ts = v => v || null;

// { table: [row, …] } for the whole data
function buildRows(db) {
  const out = Object.fromEntries(TABLES.map(([t]) => [t, []]));
  const add = (t, row) => out[t].push(row);
  // site
  for (const [key, value] of Object.entries(db.settings || {})) add('settings', { key, value: value ?? null });
  for (const [name, value] of Object.entries(db.counters || {})) add('counters', { name, value });
  // admin dashboard numbers
  const A = db.analytics || {};
  for (const [d, x] of Object.entries(A.days || {})) if (day(d)) add('site_analytics', { day: d, visits: x.visits || 0, views: x.views || 0, carts: x.carts || 0, checkouts: x.checkouts || 0, orders: x.orders || 0, vbookings: x.vbookings || 0 });
  for (const [id, x] of Object.entries(A.products || {})) add('product_stats', { product_id: id, views: x.views || 0, carts: x.carts || 0 });
  for (const d of db.districts || []) { const g = districtGeo(d.id) || {}; add('districts', { id: d.id, name: d.name, state: d.state, active: !!d.active, extra_charge: d.extraCharge || 0, lat: g.lat ?? null, lng: g.lng ?? null }); }
  // accounts (sign up / sign in / admin)
  for (const u of db.users || []) add('users', { id: u.id, name: u.name, phone: u.phone, email: u.email || null, role: u.role || 'customer', password_hash: u.password || null, phone_verified: !!u.phoneVerified,
    vendor_id: u.vendorId || null, blocked: !!u.blocked, addresses: u.addresses || [], wishlist: u.wishlist || [], prefs: u.prefs || {}, created_at: ts(u.createdAt) });
  // catalog
  const rate = v => (v == null || v === '' ? null : Number(v));
  for (const c of db.categories || []) add('categories', { id: c.id, name: c.name, name_hi: c.nameHi ?? null, emoji: c.emoji ?? null, color: c.color ?? null, image: c.image ?? null, sort_order: c.order || 0, active: !!c.active,
    gst_rate: rate(c.gstRate), hsn: c.hsn || null, off_pct: Math.round(Number(c.offPct) || 0), off_until: day(c.offUntil) });
  for (const p of db.products || []) add('products', { id: p.id, category_id: p.cat, type: p.type, name: p.name, name_hi: p.nameHi ?? null, price: p.price, mrp: p.mrp, unit: p.unit, emoji: p.emoji ?? null, image: p.image ?? null, description: p.desc ?? null,
    includes: p.includes || [], featured: !!p.featured, min_qty: p.minQty || 1, stock: p.stock || 0, daily_capacity: p.dailyCapacity ?? null, default_event: p.defaultEvent || null, events: p.events || [], covers: p.covers || [],
    kit_items: p.kitItems || [], styles: p.styles || [], opt_kind: p.optKind || null, tent_size: p.tentSize || null, gallery: p.gallery || [], loose: !!p.loose, districts: p.districts ?? 'all', active: !!p.active,
    gst_rate: rate(p.gstRate), hsn: p.hsn || null, created_at: ts(p.createdAt) });
  for (const k of db.packages || []) add('packages', { id: k.id, name: k.name, name_hi: k.nameHi ?? null, image: k.image ?? null, description: k.desc ?? null, items: k.items || [], sort_order: k.order || 0, active: !!k.active });
  // orders
  for (const o of db.orders || []) {
    const a = o.address || {};
    add('orders', { id: o.id, number: o.number, user_id: o.userId || null, guest: !!o.guest, customer_name: o.userName || a.name, customer_phone: o.userPhone || a.phone, address: a, side: o.side || null, event_date: day(o.eventDate),
      payment_method: o.paymentMethod, payment_status: o.paymentStatus || null, pay_plan: o.payPlan || null, pay_now: o.payNow ?? null, pay_hold: !!o.payHold, paid: o.paid || 0, payments: o.payments || [],
      refunds: o.refunds || [], refund_to: o.refundTo || null, cancel: o.cancel || null, cancel_request: o.cancelRequest || null, delivery_check: o.deliveryCheck || null,
      subtotal: o.subtotal, mrp_total: o.mrpTotal, discount: o.discount || 0, delivery: o.delivery || 0, total: o.total, advance: o.advance ?? null,
      status: o.status, note: o.note || null, admin_note: o.adminNote || null, rzp_order_id: o.rzpOrderId || null, rzp_orders: o.rzpOrders || [], rzp_payment_id: o.rzpPaymentId || null,
      buyer: o.buyer || null, invoice: o.invoice || null, credit_notes: o.creditNotes || [], invoice_number: (o.invoice || {}).number || null, created_at: ts(o.createdAt) });
    for (const i of o.items || []) { const { productId, name, price, qty, event, eventDate, dates, ...rest } = i; add('order_items', { order_id: o.id, product_id: productId ?? null, name, price, qty, event: event || null, event_date: day(eventDate), dates: dates || [], details: rest }); }
    for (const h of o.history || []) add('order_history', { order_id: o.id, status: h.status, at: ts(h.at), note: h.note || null });
    for (const r of o.returns || []) add('order_returns', { order_id: o.id, id: r.id, kind: r.kind || 'return', status: r.status, reason: r.reason || null, note: r.note || null, value: r.value || 0,
      items: r.items || [], photos: r.photos || [], settled: r.settled || null, history: r.history || [], created_at: ts(r.at) });
  }
  for (const r of db.reviews || []) add('product_reviews', { id: r.id, product_id: r.productId, order_id: r.orderId || null, order_number: r.orderNumber || null, line: r.line != null ? String(r.line) : null, name: r.name || null,
    district: r.district || null, rating: r.rating, text: r.text || null, photo: r.photo || null, reply: r.reply || null, status: r.status || 'published', created_at: ts(r.createdAt) });
  // vendor marketplace
  for (const v of db.vendors || []) {
    const dl = v.delivery || {};
    add('vendors', { id: v.id, type: v.type, subtype: v.subtype || null, name: v.name, name_hi: v.nameHi || null, owner: v.owner ?? null, phone: v.phone ?? null, whatsapp: v.whatsapp ?? null, address: v.address ?? null, district_id: v.district ?? null, pincode: v.pincode || null,
      lat: v.lat ?? null, lng: v.lng ?? null, geo_src: v.geoSrc || null, about: v.about ?? null, speciality: v.speciality || null, experience_years: v.experienceYears || 0, languages: v.languages || [], education: v.education || [], skills: v.skills || [],
      tags: v.tags || [], photos: v.photos || [], videos: v.videos || [], profile_photo: v.profilePhoto || null, dishes: v.dishes || [], team: v.team || [], verified: !!v.verified, active: !!v.active, sample: !!v.sample, status: v.status || null,
      capacity_per_day: v.capacityPerDay || 1, open_days: v.openDays || [], blocked_dates: v.blockedDates || [], booked_dates: v.bookedDates || [], delivery_available: !!dl.available, delivery_charge: dl.charge || 0, delivery_free_above: dl.freeAbove || 0,
      lagan_pct: v.laganPct || 0, advance: v.advance || 0, stock_updated: day(v.stockUpdated), dl_no: v.dlNo || null, kyc: v.kyc || null, consent_at: ts(v.consentAt), adults_declared_at: ts(v.adultsDeclaredAt), user_id: v.userId || null, created_at: ts(v.createdAt) });
    for (const d of v.docs || []) add('vendor_docs', { id: d.id, vendor_id: v.id, kind: d.kind, listing_id: d.listingId || null, file: d.file, ext: d.ext ?? null, size: d.size ?? null, status: d.status, note: d.note || null, uploaded_at: ts(d.at), checked_at: ts(d.checkedAt) });
  }
  for (const l of db.vlistings || []) add('vendor_listings', { id: l.id, vendor_id: l.vendorId, name: l.name, name_hi: l.nameHi || null, item_key: l.item || null, kind: l.kind || null, category: l.category || null, rental: !!l.rental,
    size: l.size || null, features: l.features || [], brand: l.brand || null, quality: l.quality || null, price: l.price, unit: l.unit, pack_size: l.packSize || null, stock: l.stock || 0, units: l.units || 1, min_qty: l.minQty || 0,
    lagan_price: l.laganPrice || 0, events: l.events || [], covers: l.covers || [], styles: l.styles || [], staff: l.staff || null, shoot: l.shoot || null, seats: l.seats ?? null, ac: typeof l.ac === 'boolean' ? l.ac : null, km: l.km || null, driver: typeof l.driver === 'boolean' ? l.driver : null,
    photo: l.photo || null, photos: l.photos || [], specs: l.specs || null, guest_tiers: l.guestTiers || [], bulk_tiers: l.bulkTiers || [], box_size: l.boxSize || null, holds_kg: l.holdsKg ?? null, design: l.design || null,
    card_type: l.cardType || null, paper: l.paper || null, printing: l.printing || [], addons: l.addons || [], lead_days: l.leadDays ?? null, card_views: l.cardViews || null, reg_no: l.regNo || null, active: !!l.active, created_at: ts(l.createdAt) });
  for (const b of db.vbookings || []) {
    const c = b.customer || {};
    add('vendor_bookings', { id: b.id, number: b.number, vendor_id: b.vendorId, vendor_name: b.vendorName || null, type: b.type || null, date: b.date, event: b.event || null, event_time: b.eventTime || null, user_id: b.userId || null,
      customer_name: c.name, customer_phone: c.phone, customer_address: c.address ?? null, customer_district: c.district ?? null, customer_pincode: c.pincode || null, customer_side: c.side || null,
      fulfilment: b.fulfilment || null, subtotal: b.subtotal, delivery_charge: b.deliveryCharge || 0, total: b.total, status: b.status, answer_by: ts(b.answerBy), expired: !!b.expired, advance: b.advance ?? null, reviewed: !!b.reviewed,
      paid: b.paid || 0, payment_status: b.paymentStatus || null, payments: b.payments || [], rzp_orders: b.rzpOrders || [], payouts: b.payouts || [], refunds: b.refunds || [], note: b.note || null, vendor_note: b.vendorNote || null,
      confirmed_at: ts(b.confirmedAt), completed_at: ts(b.completedAt), cancelled_at: ts(b.cancelledAt), rejected_at: ts(b.rejectedAt), history: b.history || [], created_at: ts(b.createdAt) });
    for (const i of b.items || []) { const { listingId, name, unit, price, qty, guests, addons, dates, nameHi, ...rest } = i; add('vendor_booking_items', { booking_id: b.id, listing_id: listingId ?? null, name, unit: unit ?? null, price, qty, guests: guests ?? null, addons: addons || null, dates: dates || [], details: rest }); }
  }
  for (const s of db.vvisits || []) {
    const c = s.customer || {};
    add('vendor_visits', { id: s.id, number: s.number, vendor_id: s.vendorId, vendor_name: s.vendorName || null, date: s.date, slot: s.slot || null, customer_name: c.name, customer_phone: c.phone,
      customer_address: c.address || null, customer_landmark: c.landmark || null, customer_district: c.district || null, customer_pincode: c.pincode || null, area: s.area || null, guests: s.guests ?? null,
      function_date: day(s.functionDate), note: s.note || null, status: s.status, measured: s.measured || null, history: s.history || [], created_at: ts(s.createdAt) });
  }
  for (const r of db.vreviews || []) add('vendor_reviews', { id: r.id, vendor_id: r.vendorId, booking_id: r.bookingId || null, name: r.name ?? null, district: r.district || null, rating: r.rating, text: r.text || null, reply: r.reply || null,
    status: r.status, verified: !!r.verified, sample: !!r.sample, created_at: ts(r.createdAt) });
  // lagan dates, ingredients
  const L = db.lagan || { dates: {}, sheets: [] };
  for (const [date, x] of Object.entries(L.dates || {})) add('lagan_dates', { date, note: x.note || null, added_by: x.by || null, added_by_name: x.byName || null, added_at: ts(x.at) });
  for (const s of L.sheets || []) add('lagan_sheets', { id: s.id, title: s.title ?? null, url: s.url ?? null, added_by: s.by ?? null, added_by_name: s.byName ?? null, added_at: ts(s.at) });
  for (const i of INGREDIENTS) add('ingredients', { key: i.key, name: i.name, name_hi: i.hi ?? null, grp: i.group ?? null, unit: i.unit ?? null, per_100_guests: i.per100 ?? null });
  return out;
}

module.exports = { TABLES, JSON_SCALARS, buildRows };
