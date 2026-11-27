const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

async function checkBookings() {
  const publicMode = process.argv.includes('--public');
  const socket = net.createServer();
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolve);
  });
  const { port } = socket.address();
  await new Promise(resolve => socket.close(resolve));

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vivah-bookings-'));
  const data = path.join(dir, 'data');
  const password = randomBytes(18).toString('hex');
  const server = spawn(process.execPath, [path.join(__dirname, '../backend/server.js')], {
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production', DEMO_DATA: publicMode ? '0' : '1', DATA_DIR: data, UPLOAD_DIR: path.join(dir, 'uploads'), ADMIN_PASSWORD: password, SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', SMS_PROVIDER: 'console', RAZORPAY_KEY_ID: 'rzp_test_fixture', RAZORPAY_KEY_SECRET: 'fixture', RAZORPAY_WEBHOOK_SECRET: 'fixture' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const closed = new Promise(resolve => server.once('close', resolve));

  let token;
  async function request(route, status, { method = 'GET', body, authenticated = false } = {}) {
    const res = await fetch(`http://127.0.0.1:${port}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer ' + (authenticated === true ? token : authenticated) } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    const result = await res.json();
    assert.equal(res.status, status, `${method} ${route}: ${result.error || res.status}`);
    return result;
  }

  try {
    let started = false;
    for (let i = 0; i < 40 && server.exitCode === null; i++) {
      started = await fetch(`http://127.0.0.1:${port}/readyz`, { signal: AbortSignal.timeout(1000) }).then(r => r.ok, () => false);
      if (started) break;
      await delay(250);
    }
    assert.ok(started, 'Booking test server did not start');
    const db = JSON.parse(await fs.readFile(path.join(data, 'db.json'), 'utf8'));
    const admin = db.users.find(user => user.role === 'admin');
    ({ token } = await request('/api/auth/login', 200, { method: 'POST', body: { phone: admin.phone, password, admin: true } }));
    let vendor, listing;
    if (publicMode) {
      for (const field of ['products', 'packages', 'orders', 'vendors', 'vlistings']) {
        assert.deepEqual(db[field], [], `Fresh public launch must have no demo ${field}`);
      }
      assert.equal(db.users.length, 1);
      await request('/api/admin/integrations/test-sms', 400, { method: 'POST', authenticated: true, body: { phone: '9000000001' } });
      await request('/api/admin/integrations', 400, { method: 'PUT', authenticated: true, body: { onlinePayments: true } });
      const { settings } = await request('/api/meta', 200);
      assert.equal(settings.otp.login, false);
      assert.equal(settings.payments.online, false);
      assert.equal(settings.phone, '');
      assert.deepEqual((await request('/api/products', 200)).products, []);
      const { product } = await request('/api/admin/products', 201, {
        method: 'POST', authenticated: true,
        body: { name: 'Test wedding supplies', cat: db.categories[0].id, price: 500, stock: 10 },
      });
      const catalog = await request('/api/products', 200);
      assert.equal(catalog.products.find(item => item.id === product.id).price, 500);
      ({ vendor } = await request('/api/admin/vendors', 201, {
        method: 'POST', authenticated: true,
        body: { type: 'band', name: 'Test wedding band', district: 'br-patna', phone: '9000000002', address: 'Test vendor address', active: true, verified: true },
      }));
      const loginPath = `/api/admin/vendors/${vendor.id}/login`;
      await request(loginPath, 400, { method: 'POST', authenticated: true, body: { password: 'short' } });
      const adminBundle = await request(`/api/admin/vendors/${vendor.id}`, 200, { authenticated: true });
      assert.ok(!adminBundle.vendor.userId);
      await request(loginPath, 200, { method: 'POST', authenticated: true, body: { password } });
      const vendorLogin = await request('/api/auth/login', 200, { method: 'POST', body: { phone: vendor.phone, password } });
      ({ listing } = await request('/api/vendor/me/listings', 201, {
        method: 'POST', authenticated: vendorLogin.token, body: { name: 'Wedding band service', price: 4500, unit: 'booking' },
      }));
      const detail = await request(`/api/vendors/${vendor.id}`, 200);
      assert.equal(detail.listings.find(item => item.id === listing.id).price, 4500);
      const page = await fetch(`http://127.0.0.1:${port}/`);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /\/js\/vendors\.js/);
      const { bookings: [booking] } = await request('/api/vbookings/bulk', 201, {
        method: 'POST',
        body: {
          customer: { name: 'Booking test', phone: '9000000001', address: 'Test venue', district: vendor.district },
          groups: [{ vendorId: vendor.id, date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), items: [{ listingId: listing.id, qty: 1 }] }],
        },
      });
      const panel = await request('/api/vendor/me', 200, { authenticated: vendorLogin.token });
      assert.equal(panel.bookings.find(item => item.id === booking.id).status, 'requested');
      await request(`/api/vendor/me/bookings/${booking.id}`, 200, { method: 'PUT', authenticated: vendorLogin.token, body: { status: 'confirmed' } });
      const tracked = await request(`/api/vbookings/track?number=${booking.number}&phone=9000000001`, 200);
      assert.equal(tracked.booking.status, 'confirmed');
      assert.equal(tracked.booking.total, 4500);
      let persisted;
      for (let i = 0; i < 25; i++) {
        persisted = JSON.parse(await fs.readFile(path.join(data, 'db.json'), 'utf8')).vbookings.find(item => item.id === booking.id);
        if (persisted?.status === 'confirmed') break;
        await delay(100);
      }
      assert.equal(persisted?.status, 'confirmed', 'Confirmed booking must reach persistent storage');
      console.log('Public production catalog, vendor onboarding, and customer booking passed');
      return;
    }
    vendor = db.vendors.find(v => v.type === 'band' && v.verified && v.active && db.vlistings.some(l => l.vendorId === v.id && l.active && !(l.covers || []).length));
    assert.ok(vendor, 'Booking test requires an active seeded band vendor');
    listing = db.vlistings.find(l => l.vendorId === vendor.id && l.active && !(l.covers || []).length);
    const date = new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10);
    const customer = { name: 'Booking test', phone: '9000000001', address: 'Test wedding venue', district: vendor.district };
    const group = { vendorId: vendor.id, date, items: [{ listingId: listing.id, qty: 1 }] };
    const book = (groups, status = 201) => request('/api/vbookings/bulk', status, { method: 'POST', body: { customer, groups } });
    const tracking = booking => `/api/vbookings/track?number=${booking.number}&phone=${customer.phone}`;
    const update = (booking, status, expected, vendorNote) => request(`/api/admin/vendors/${vendor.id}/bookings/${booking.id}`, expected, {
      method: 'PUT', authenticated: true, body: { status, ...(vendorNote ? { vendorNote } : {}) },
    });

    await book(Array(31).fill(group), 400);
    await book([{ ...group, date: date + 'invalid' }], 400);
    await book([group, { ...group, items: [null] }], 400);
    const dashboard = await request('/api/admin/vbookings', 200, { authenticated: true });
    assert.equal(dashboard.bookings.length, 0, 'Failed cart must roll back all bookings');

    const { bookings: [first] } = await book([group]);
    assert.equal(first.status, 'requested');
    assert.ok(first.answerBy);
    await update(first, 'completed', 409);
    const note = 'We will call to arrange arrival at your venue.';
    await update(first, 'confirmed', 200, note);
    const { booking, vendor: contact } = await request(tracking(first), 200);
    assert.equal(booking.status, 'confirmed');
    assert.equal(booking.vendorNote, note);
    assert.equal(booking.fulfilment, 'on-site');
    assert.equal(contact.phone, vendor.phone);
    await update(first, 'completed', 409);

    await request('/api/vbookings/cancel', 200, { method: 'POST', body: { number: first.number, phone: customer.phone } });
    await update(first, 'confirmed', 409);
    assert.equal((await request(tracking(first), 200)).booking.status, 'cancelled');
    const { bookings: [replacement] } = await book([group]);
    await update(replacement, 'rejected', 200, 'Please choose another vendor.');
    assert.equal((await request(tracking(replacement), 200)).booking.status, 'rejected');

    const todayInIndia = new Date(Date.now() + 330 * 60e3).toISOString().slice(0, 10);
    const { bookings: [sameDay] } = await book([{ ...group, date: todayInIndia }]);
    await update(sameDay, 'confirmed', 200);
    await request('/api/vreviews', 400, { method: 'POST', body: { number: sameDay.number, phone: customer.phone, rating: 5 } });
    await update(sameDay, 'completed', 200);
    assert.equal((await request(tracking(sameDay), 200)).booking.status, 'completed');
    await request('/api/vreviews', 201, { method: 'POST', body: { number: sameDay.number, phone: customer.phone, rating: 5 } });
    console.log('Vendor booking lifecycle passed');
  } finally {
    server.kill();
    await closed;
    await fs.rm(dir, { recursive: true, force: true });
  }
}

checkBookings().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
