/* Vendor management screens shared by the Vendor Panel (/vendor) and the Admin panel.
   Needs these globals from the host page: $, $$, h, inr, fmtDate, modal, closeModal, toast, ph. */
const VF = (() => {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const VB_LABEL = { requested: 'New request', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', rejected: 'Rejected' };
  const vbPill = s => `<span class="status ${{ requested: 'st-placed', confirmed: 'st-confirmed', completed: 'st-delivered', cancelled: 'st-cancelled', rejected: 'st-cancelled' }[s]}">${VB_LABEL[s]}</span>`;
  // example item name per vendor type (placeholder in the Add item form)
  const EXAMPLE = {
    catering: 'Veg Bhoj Thali', studio: 'Shaadi photo + video (2 days)', dj: 'DJ with 4 speakers & lights', pandit: 'Vivah puja (full rasam)', orchestra: 'Night stage show (6 hrs)',
    tent: 'Shamiyana 40×60 with 200 chairs', decoration: 'Mandap phool decoration', band: 'Band party (15 men) with ghodi', mehndi: 'Bridal mehndi – full hands & feet',
    makeup: 'Bridal HD makeup', venue: 'Hall for 500 guests (full day)', wear: 'Sherwani on rent', puja: 'Vivah puja samagri kit', gifts: 'Dry fruit shagun box', cards: 'Shaadi card (per 100 cards)',
  };
  const wa = (phone, text) => `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
  const evS = e => String(e || '').split(' (')[0].split(' /')[0]; // "Tilak / Chheka" → "Tilak"
  // the function of a booking and every rasam date of a full-ceremony item
  const vbEvent = b => (b.eventTime ? ` · <b>${h(b.eventTime)}</b>` : '') + (b.event ? ` · <b>${h(b.event)}</b>` : '');
  const rasamDates = i => ((i.dates || []).length ? `<br><span class="small">${i.dates.map(x => `${h(evS(x.event))} – ${fmtDate(x.date)}`).join(' · ')}</span>` : '');

  // o: { api(path, opts), base, admin, districts, tab, onChange }
  async function manage(el, o) {
    let tab = o.tab || 'bookings', B = null, calMonth = todayStr().slice(0, 7);
    const reload = async () => { B = await o.api(o.base); };
    const save = async (body, msg) => { try { B = await o.api(o.base, { method: 'PUT', body }); toast(msg || 'Saved ✓'); draw(); o.onChange && o.onChange(); } catch (e) { toast(e.message, true); } };
    await reload();

    function draw() {
      const v = B.vendor, t = B.type, mode = t.mode;
      const reqs = B.bookings.filter(b => b.status === 'requested').length + (B.visits || []).filter(x => x.status === 'requested').length;
      el.innerHTML = `<div class="vf">
        <div class="vf-head">${ph(v.photos[0], '', '#f6eef0', 'vf-ph')}<div><div class="small muted">${h(t.name)}${v.sample ? ' · <b style="color:#8a5a00">Sample</b>' : ''}</div><h2 style="margin:0">${h(v.name || 'New vendor')}</h2>
          <div class="small">${v.verified ? '<span class="status st-delivered">✓ Verified – visible to customers</span>' : '<span class="status st-placed">Waiting for verification – not visible yet</span>'} ${v.active ? '' : '<span class="status st-cancelled">Hidden</span>'}
          ${B.reviews ? ` · ★ ${B.rating} (${B.reviews})` : ''} ${v.verified && v.active ? ` · <a class="link" href="/#/v/${v.id}" target="_blank">View public page ↗</a>` : ''}</div></div></div>
        <div class="st-tabs vf-tabs">${[['bookings', `Bookings${reqs ? ` (${reqs} new)` : ''}`], ['listings', mode === 'unit' ? 'Vehicles & prices' : 'Items & prices'], ['availability', 'Availability'], ['profile', 'Profile'], ...(hasTeam() ? [['team', `Team (${teamCount()})`]] : []), ['lagan', 'Lagan'], ['papers', `Documents${papersFlag()}`], ['reviews', `Reviews (${B.reviews})`]].map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="vf-body">${({ bookings, listings, availability, profile, team, papers, lagan, reviews })[tab]()}</div></div>`;
      bind();
      if (tab === 'lagan') {
        // dates are shared by the whole site: verified Pandit Ji (and admins) keep them
        laganEditor($('#vfLaganDates', el), { api: o.api, uploadPath: o.uploadPath, canEdit: o.admin || (v.type === 'pandit' && v.verified), admin: o.admin, me: v.id });
      }
    }

    // site visits (tent house / decorator): families who want the place measured before booking
    const SLOT = { morning: 'Morning 9–12', afternoon: 'Afternoon 12–4', evening: 'Evening 4–7' };
    const svPill = s => `<span class="status ${{ requested: 'st-placed', confirmed: 'st-confirmed', done: 'st-delivered', cancelled: 'st-cancelled' }[s]}">${{ requested: 'New request', confirmed: 'Visit fixed', done: 'Measured', cancelled: 'Cancelled' }[s]}</span>`;
    function visitsHtml() {
      if (!B.visits || !B.visits.length) return '';
      const open = B.visits.filter(x => ['requested', 'confirmed'].includes(x.status)), past = B.visits.filter(x => !['requested', 'confirmed'].includes(x.status)).slice(-5).reverse();
      const card = x => `<div class="order-card"><div class="order-top"><div><b>#${h(x.number)}</b> · Site visit <b>${fmtDate(x.date)}</b>, ${SLOT[x.slot]} · ${h(x.customer.name)} · <a class="link" href="tel:+91${h(x.customer.phone)}">${h(x.customer.phone)}</a> · <a class="link" target="_blank" rel="noopener" href="${wa(x.customer.phone, `Namaste ${x.customer.name} ji, site visit #${x.number} on ${fmtDate(x.date)} ke baare mein.`)}">WhatsApp</a></div>${svPill(x.status)}</div>
        <div class="small" style="padding:0 16px 8px"><b>${h(x.customer.address)}</b>${x.customer.landmark ? ` · near ${h(x.customer.landmark)}` : ''}, ${h(x.customer.districtName)} · <a class="link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${x.customer.address}, ${x.customer.districtName}`)}">Map ↗</a>
          ${x.functionDate ? `<br>Function on ${fmtDate(x.functionDate)}` : ''}${x.guests ? ` · about ${x.guests} guests` : ''}${x.area ? ` · ground: ${h(x.area)}` : ''}${x.note ? `<br>Note: ${h(x.note)}` : ''}${x.measured ? `<br><b>Measured:</b> ${h(x.measured)}` : ''}</div>
        ${['requested', 'confirmed'].includes(x.status) ? `<div class="order-foot"><span></span><span style="display:flex;gap:6px;flex-wrap:wrap">${x.status === 'requested' ? `<button class="btn btn-primary btn-sm" data-sv="confirmed" data-svid="${x.id}">✓ Fix visit</button>` : `<button class="btn btn-primary btn-sm" data-sv="done" data-svid="${x.id}">✓ Measured</button>`}<button class="btn btn-light btn-sm" data-sv="cancelled" data-svid="${x.id}">Cancel</button></span></div>` : ''}</div>`;
      return `<h4 class="vf-gh">Site visits — measure the place before booking (${open.length} open)</h4>${open.map(card).join('') || '<p class="muted small">No open site visits.</p>'}${past.length ? `<details><summary class="small link">Past visits (${past.length})</summary>${past.map(card).join('')}</details>` : ''}`;
    }
    function bookings() {
      if (!B.bookings.length) return visitsHtml() + '<p class="muted">No bookings yet. Bookings from customers appear here.</p>';
      const groups = [['New requests – please confirm or reject', b => b.status === 'requested'], ['Upcoming confirmed', b => b.status === 'confirmed'], ['Past & closed', b => !['requested', 'confirmed'].includes(b.status)]];
      return visitsHtml() + groups.map(([title, fn]) => { const list = B.bookings.filter(fn); return list.length ? `<h4 class="vf-gh">${title} (${list.length})</h4>${list.map(b => `<div class="order-card"><div class="order-top"><div><b>#${h(b.number)}</b> · <b>${fmtDate(b.date)}</b>${vbEvent(b)} · ${h(b.customer.name)}${b.customer.side ? ` <span class="side-tag">${b.customer.side === 'boy' ? 'Ladke wale (bete ki shaadi)' : '👰 Ladki wale (beti ki shaadi)'}</span>` : ''} · <a class="link" href="tel:+91${h(b.customer.phone)}">${h(b.customer.phone)}</a> · <a class="link" target="_blank" rel="noopener" href="${wa(b.customer.phone, `Namaste ${b.customer.name} ji, booking #${b.number} for ${fmtDate(b.date)} ke baare mein.`)}">WhatsApp</a></div>${vbPill(b.status)}</div>
        <div class="order-items">${b.items.map(i => `<div class="oi" style="justify-content:space-between"><span>${h(i.name)} × ${i.qty} ${h(i.unit)}${rasamDates(i)}</span><b>${inr(i.price * i.qty)}</b></div>`).join('')}${b.deliveryCharge ? `<div class="oi" style="justify-content:space-between"><span>Delivery</span><b>${inr(b.deliveryCharge)}</b></div>` : ''}
          <div class="small muted">${h(b.customer.address)}, ${h(b.customer.districtName)} · ${b.fulfilment === 'delivery' ? 'Delivery' : b.fulfilment === 'pickup' ? 'Pickup' : 'On site'}${b.note ? ` · Note: ${h(b.note)}` : ''}</div>
          ${(b.money || {}).paid ? `<div class="small vb-vmoney">Family paid <b>${inr(b.money.paid)}</b> online to ${h(window.SITE_NAME || 'Vivah Saathi')}${b.money.paidOut ? ` · <span class="ok-txt">${inr(b.money.paidOut)} paid out to you</span>` : ''}${b.money.held && !b.money.refundOwed ? ` · <b style="color:#b45309">${inr(b.money.held)} coming to you</b>` : ''}${b.money.refundOwed ? ' · booking called off — the family is refunded' : ''}${['confirmed', 'completed'].includes(b.status) && b.total - b.money.paid > 0 ? ` · collect ${inr(b.total - b.money.paid)} on the day` : ''}</div>` : ''}</div>
        <div class="order-foot"><b>Total ${inr(b.total)}</b><span style="display:flex;gap:6px;flex-wrap:wrap">
          ${b.status === 'requested' && b.answerBy ? `<span class="small bad-txt">Answer by ${new Date(b.answerBy).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} or it is released</span>` : ''}
          ${b.status === 'requested' ? `<button class="btn btn-primary btn-sm" data-bs="confirmed" data-b="${b.id}">✓ Confirm</button><button class="btn btn-light btn-sm" data-bs="rejected" data-b="${b.id}">✗ Not available</button>` : ''}
          ${b.status === 'confirmed' ? `<button class="btn btn-primary btn-sm" data-bs="completed" data-b="${b.id}">✓ Mark completed</button><button class="btn btn-light btn-sm" data-bs="cancelled" data-b="${b.id}">Cancel</button>` : ''}
        </span></div></div>`).join('')}` : ''; }).join('');
    }

    // tent house / decorator / DJ: rental components (category, size, features, owned quantity)
    const catOf = id => (B.tentCats || []).find(c => c.id === id) || { name: 'Other items', emoji: '📦' };
    function listings() {
      const mode = B.type.mode;
      const vt = B.vendor.type, rt = !!B.tentCats;
      const addBtns = vt === 'cards' ? '<button class="btn btn-gold btn-sm" data-act="vf-add">+ Add card design</button>'
        : vt === 'sweets' ? '<span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-gold btn-sm" data-act="vf-add">+ Add sweet</button><button class="btn btn-light btn-sm" data-act="vf-add" data-kind="box">+ Add box / packaging</button></span>'
        : vt === 'catering' ? '<span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-gold btn-sm" data-act="vf-add">+ Add menu / package</button><button class="btn btn-light btn-sm" data-act="vf-add" data-kind="staff">+ Add team member (cook / helper)</button><button class="btn btn-light btn-sm" data-act="vf-add" data-rental="1">+ Add bartan on rent</button></span>'
        : vt === 'orchestra' && B.vendor.subtype === 'group' ? '<span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-gold btn-sm" data-act="vf-add">+ Add program / package</button><button class="btn btn-light btn-sm" data-act="vf-add" data-kind="staff">+ Add extra lady dancers / singers</button></span>'
        : rt ? '<span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-gold btn-sm" data-act="vf-add" data-rental="1">+ Add rental item</button><button class="btn btn-light btn-sm" data-act="vf-add">+ Add package / service</button></span>'
        : `<button class="btn btn-gold btn-sm" data-act="vf-add">+ Add ${mode === 'unit' ? 'vehicle' : 'item'}</button>`;
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap"><p class="small muted" style="margin:0;flex:1;min-width:220px">${mode === 'unit' ? '<b>Units</b> = how many of this vehicle you have. Each can be booked once per day.' : vt === 'catering' ? '<b>Menu / packages</b> are priced by number of guests. <b>Team members</b> (extra cooks, helpers) are hired per person per day — put how many people you have. <b>Bartan on rent</b> (degchi, kadhai, bhatti…) — put how many you own; customers can never book more than are free on a date.' : rt ? '<b>Rental items</b> (shamiyana, chairs, kanaat, lights, generator, speakers, flowers…) are shown one by one in <b>Tent Booking</b>. <b>Owned</b> = how many you have; customers book by quantity for each date and can never take more than are left that day. Packages / services keep your "bookings per day" limit.' : vt === 'cards' ? 'Each <b>card design</b> with front, back and inside photos, minimum order, bulk rates and add-ons. Customers see all designs in the card gallery, cheapest first.' : vt === 'sweets' ? 'Sweets are sold <b>per kg</b> with bulk rates; boxes / packaging are separate items customers add by the box.' : mode === 'stock' ? 'Keep <b>stock</b> up to date — customers can only order what is in stock.' : 'Packages / services you offer and their prices.'}</p>${addBtns}</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Name</th><th>Price</th>${mode === 'unit' ? '<th>Units</th>' : mode === 'stock' ? '<th>Stock</th>' : rt ? '<th>Category</th><th>Owned</th>' : ''}<th>Visible</th><th></th></tr></thead><tbody>
        ${B.listings.map(l => `<tr><td>${ph(l.photo, '', '#f6eef0', 'thumb')}${(l.photos || []).length > 1 ? `<div class="small muted" style="text-align:center">${l.photos.length}</div>` : ''}</td><td><b>${h(l.name)}</b>${l.nameHi ? `<br><span class="small muted">${h(l.nameHi)}</span>` : ''}${l.specs ? `<br><span class="small muted">${h(l.specs)}</span>` : ''}
          ${mode === 'event' && (l.covers || []).length ? `<br><span class="small">Covers ${h(l.covers.map(evS).join(' · '))}</span>` : mode === 'event' && (l.events || []).length ? `<br><span class="small">Only ${h(l.events.map(evS).join(' & '))}</span>` : ''}
          ${l.brand || l.quality ? `<br><span class="small">${h([l.brand, l.quality].filter(Boolean).join(' · '))}${l.packSize ? ` · ${l.packSize} kg/L per ${h(l.unit)}` : ''}</span>` : ''}
          ${l.kind === 'box' ? `<br><span class="small">${h(l.boxSize || 'Box')}${l.holdsKg ? ` · holds ${l.holdsKg} kg` : ''}${l.design ? ` · ${h(l.design)}` : ''}</span>` : ''}
          ${l.kind === 'card' ? `<br><span class="small">${h(l.cardType || '')} · ${h(l.paper || '')}${(l.printing || []).length ? ` · ${h(l.printing.join(', '))}` : ''} · min ${l.minQty || 1} · ${(l.photos || []).length}${(l.addons || []).length ? ` · ${l.addons.length} add-ons` : ''}</span>` : ''}
          ${(l.bulkTiers || []).length ? `<br><span class="small muted">Bulk: ${l.bulkTiers.map(t => `${t.min}+ ${inr(t.price)}`).join(' · ')}${l.minQty && l.kind !== 'card' ? ` · min ${l.minQty} ${h(l.unit)}` : ''}</span>` : ''}${mode === 'unit' ? `<br><span class="small">${l.regNo ? `<span class="regno">${h(l.regNo)}</span>` : '<span class="muted">No vehicle number</span>'} · ${(() => { const d = docOf('rc', l.id); return d ? `RC ${DOCUP.STATUS[d.status][0]} ${DOCUP.STATUS[d.status][1].replace(/ –.*/, '')}` : '<a class="link" data-tab="papers">Add RC →</a>'; })()}</span>` : ''}</td>
          <td><b>${inr(l.price)}</b> <span class="small muted">/ ${h(l.unit)}</span>${(l.guestTiers || []).length ? `<br><span class="small muted">${l.guestTiers.map(x => `${x.guests} log ${inr(x.price)}`).join(' · ')}</span>` : ''}</td>${mode === 'unit' ? `<td>${l.units}</td>` : mode === 'stock' ? `<td><input class="charge-in" type="number" min="0" value="${l.stock}" data-stock="${l.id}"> <span class="small muted">${h(l.unit)}</span></td>`
            : rt ? (l.staff ? `<td>${l.staff === 'cook' ? 'Team · cook' : 'Team · helper'}</td><td><b>${l.units || 1}</b> <span class="small muted">people</span></td>` : l.rental ? `<td>${h(catOf(l.category).name)}${l.size ? `<br><span class="small muted">${h(l.size)}</span>` : ''}${(l.features || []).length ? `<br><span class="small muted">${h(l.features.join(' · '))}</span>` : ''}</td><td><input class="charge-in" type="number" min="1" value="${l.units}" data-units="${l.id}" aria-label="Owned"> <span class="small muted">${h(l.unit)}</span></td>` : '<td><span class="small muted">Package / service</span></td><td>—</td>') : ''}
          <td><label class="switch"><input type="checkbox" data-lact="${l.id}" ${l.active ? 'checked' : ''}><span></span></label></td>
          <td class="actions"><button class="btn btn-light btn-sm" data-ledit="${l.id}">Edit</button> <button class="btn btn-light btn-sm" data-ldel="${l.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nothing listed yet.</td></tr>'}
        </tbody></table></div>`;
    }

    function calGrid(cal) {
      const [y, m] = cal[0].date.slice(0, 7).split('-').map(Number), pad = (new Date(y, m - 1, 1).getDay() + 6) % 7;
      const blocked = new Set(B.vendor.blockedDates || []), offline = new Set(B.vendor.bookedDates || []);
      const label = c => blocked.has(c.date) ? ['closed', 'closed'] : offline.has(c.date) ? ['full', 'booked'] : c.status === 'full' ? ['full', 'site'] : [c.status, ''];
      return `<div class="vcal-head">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<div>${x}</div>`).join('')}</div>
        <div class="vcal">${'<div></div>'.repeat(pad)}${cal.map(c => { const [cls, tag] = label(c); return `<button class="vday ${cls}" data-block="${c.date}" ${c.status === 'past' ? 'disabled' : ''} title="${tag === 'closed' ? 'Closed by you' : tag === 'booked' ? 'Marked booked by you' : tag === 'site' ? 'Fully booked through the website' : 'Open'}">${Number(c.date.slice(8))}${tag ? `<small>${tag === 'site' ? 'full' : tag}</small>` : ''}</button>`; }).join('')}</div>`;
    }
    const addMonth = (m, n) => { const [y, mo] = m.split('-').map(Number), d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
    // the two months on screen come from the server (any month the vendor moves to)
    async function fillCals() {
      for (const [i, m] of [calMonth, addMonth(calMonth, 1)].entries()) {
        const box = $('#vfCal' + i, el); if (!box) return;
        try {
          const { calendar } = await o.api(`${o.base}/calendar?month=${m}`);
          if (!box.isConnected) return;
          box.innerHTML = `<h3>${new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>${calGrid(calendar)}`;
        } catch (e) { box.innerHTML = `<p class="err">${h(e.message)}</p>`; }
      }
    }
    function availability() {
      const v = B.vendor, mode = B.type.mode;
      return `<p class="small muted" style="margin-top:0">Tap a date to change it: <b>Open → Booked</b> (you took a booking by phone / outside the site) <b>→ Closed</b> (holiday, day off) <b>→ Open</b>. Customers cannot book Booked or Closed dates. "full" = fully booked through the website.</p>
        <div class="vlegend" style="padding:0 0 10px"><span><i class="available"></i>Open</span><span><i class="full"></i>Booked</span><span><i class="closed"></i>Closed</span></div>
        <div class="vf-calnav"><button type="button" class="btn btn-light btn-sm" data-calm="-1" ${calMonth <= todayStr().slice(0, 7) ? 'disabled' : ''}>‹ Earlier</button>
          <span class="small muted">Customers can book up to 6 months ahead</span>
          <button type="button" class="btn btn-light btn-sm" data-calm="1" ${calMonth >= addMonth(todayStr().slice(0, 7), 4) ? 'disabled' : ''}>Later ›</button></div>
        <div class="a-grid" style="grid-template-columns:1fr 1fr">
          <div class="a-card" id="vfCal0"><div class="spinner"></div></div>
          <div class="a-card" id="vfCal1"><div class="spinner"></div></div>
        </div>
        <form class="a-card pad" id="vfAvail" style="margin-top:14px">
          <div class="field"><label>Open on these days</label><div class="vf-days">${DAYS.map((d, i) => `<label><input type="checkbox" name="d${i}" ${(v.openDays || []).includes(i) ? 'checked' : ''}> ${d}</label>`).join('')}</div></div>
          ${mode === 'event' ? (B.onePerDay
            ? '<p class="small vf-lock"><b>One wedding per date.</b> You are one person, so as soon as a family books you (request or confirmed), that date is locked for every other wedding. A cancelled or rejected booking frees it again.</p>'
            : `<div class="field" style="max-width:420px"><label>How many weddings can you serve on the same date?</label><input name="capacityPerDay" type="number" min="1" max="50" value="${v.capacityPerDay || 1}"><span class="small muted">1 if you have one team. Put 2 or 3 only if you really have 2–3 full teams (staff, equipment, vehicles) going to different weddings at the same time. Once that many bookings are taken, the date shows <b>Booked</b> to customers.</span></div>`) : ''}
          ${mode === 'unit' ? '<p class="small vf-lock">Each car can go to <b>one wedding per date</b>. Once a car is booked for a date, customers see it as booked for that date.</p>' : ''}
          ${mode !== 'stock' ? `<div class="field" style="max-width:420px"><label>Advance to confirm a date (₹)</label><input name="advance" type="number" min="0" max="500000" value="${v.advance || 0}"><span class="small muted">The token families pay you after you confirm (UPI or cash), the rest on the day. Shown on your profile and with every booking. 0 = no advance.</span></div>` : ''}
          <p class="small vf-lock">Answer every booking request within <b>48 hours</b> (or before the function day if sooner). Unanswered requests are released automatically so the family can book someone else.</p>
          <button class="btn btn-primary">Save availability</button>
          ${mode === 'stock' ? `<button type="button" class="btn btn-gold" data-act="vf-fresh" style="margin-left:8px">Mark stock updated today</button><span class="small muted" style="margin-left:8px">${v.stockUpdated ? 'Last updated ' + fmtDate(v.stockUpdated) : 'Never updated'}</span>` : ''}
        </form>
        ${B.tentCats && B.listings.some(l => l.rental) ? `<div class="a-card pad" style="margin-top:14px"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px"><h3 style="margin:0;flex:1">Inventory on a date</h3><input type="date" id="vfInvDate" value="${todayStr()}" aria-label="Date"></div>
          <p class="small muted" style="margin:0 0 8px">How many of each rental item you own, how many are already booked (new requests + confirmed) and how many customers can still book on this date.</p><div id="vfInv"><div class="spinner"></div></div></div>` : ''}`;
    }
    async function inventory(date) {
      const box = $('#vfInv', el); if (!box) return;
      try {
        const r = await o.api(`${o.base}/inventory?date=${encodeURIComponent(date || todayStr())}`);
        if (!box.isConnected) return;
        box.innerHTML = `${['closed', 'past'].includes(r.status) || r.offline ? `<div class="err">${r.offline ? 'You marked this date booked — customers cannot book any item.' : r.status === 'past' ? 'This date is in the past.' : 'You are closed on this date — customers cannot book any item.'}</div>` : ''}
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Category</th><th>Owned</th><th>Booked</th><th>Left</th></tr></thead><tbody>
          ${r.items.map(i => `<tr class="${i.active ? '' : 'muted'}"><td><b>${h(i.name)}</b>${i.active ? '' : ' <span class="small muted">(hidden)</span>'}</td><td>${h(catOf(i.category).name)}</td><td>${i.units} <span class="small muted">${h(i.unit)}</span></td><td>${i.booked ? `<b>${i.booked}</b>` : '0'}</td><td><b class="${i.left ? 'ok-txt' : 'bad-txt'}">${i.left}</b></td></tr>`).join('')}</tbody></table></div>
          ${r.bookings.length ? `<div class="small" style="margin-top:8px"><b>Bookings on ${fmtDate(r.date)}:</b>${r.bookings.map(b => `<div>#${h(b.number)} · ${h(b.customer)}${b.eventTime ? ` · ${h(b.eventTime)}` : ''} · ${vbPill(b.status)} — ${b.items.map(i => `${h(i.name)} × ${i.qty}`).join(', ')}</div>`).join('')}</div>` : `<p class="small muted" style="margin:8px 0 0">No rental bookings on ${fmtDate(r.date)} yet.</p>`}`;
      } catch (e) { box.innerHTML = `<p class="err">${h(e.message)}</p>`; }
    }

    function profile() {
      const v = B.vendor, t = B.type;
      return `<form id="vfProfile">
        <div class="grid-2"><div class="field"><label>Business / artist name</label><input name="name" required value="${h(v.name)}"></div><div class="field"><label>Name in Hindi</label><input name="nameHi" value="${h(v.nameHi)}"></div>
        <div class="field"><label>Owner / contact person</label><input name="owner" value="${h(v.owner)}"></div>
        ${t.subtypes ? `<div class="field"><label>Category</label><select name="subtype">${t.subtypes.map(([id, n]) => `<option value="${id}" ${v.subtype === id ? 'selected' : ''}>${h(n)}</option>`).join('')}</select></div>` : '<div></div>'}
        <div class="field"><label>Mobile (shown to customers)</label><input name="phone" maxlength="10" value="${h(v.phone)}"></div><div class="field"><label>WhatsApp number</label><input name="whatsapp" maxlength="10" value="${h(v.whatsapp)}"></div></div>
        <div class="field"><label>Full address – shop / home (mohalla, gaon, road, landmark)</label><input name="address" value="${h(v.address)}"></div>
        <div class="grid-2"><div class="field"><label>District</label><select name="district">${o.districts.map(d => `<option value="${d.id}" ${d.id === v.district ? 'selected' : ''}>${h(d.name)} (${d.state === 'Bihar' ? 'BR' : 'UP'})</option>`).join('')}</select></div><div class="field"><label>Pincode</label><input name="pincode" maxlength="6" inputmode="numeric" pattern="[1-9][0-9]{5}" value="${h(v.pincode)}"></div></div>
        <div class="box vf-loc"><div><b>Location for "nearest first"</b><div class="small muted">${v.lat != null && v.geoSrc === 'pin' ? '✓ Exact spot pinned on the map.'
          : v.lat != null && v.geoSrc === 'address' ? '✓ Found on the map from your address & pincode. Pin it yourself for the exact spot.'
          : v.lat != null ? '✓ Location set.' : 'Not found on the map yet — distance is counted from your zila town. Save a full address + pincode, or pin it on the map.'}
          Customers with the same pincode see you first; others see how many km away you are (never your exact spot).</div></div>
          <div class="vf-loc-btns"><button type="button" class="btn btn-gold btn-sm" data-act="vf-pin">${v.geoSrc === 'pin' ? 'Move pin' : 'Pin on map / GPS'}</button>${v.geoSrc === 'pin' ? '<button type="button" class="btn btn-light btn-sm" data-act="vf-unpin">Use address instead</button>' : ''}</div></div>
        <div class="box" style="background:#fffaf0"><h3>Personal profile <span class="small muted" style="font-weight:500">(shown for Pandit Ji, cooks / halwai and individual artists)</span></h3>
          <div class="img-pick">${ph(v.profilePhoto, '', '#f6eef0', 'vf-ph')}<div style="flex:1">
            <div class="field"><label>Your photo (clear face photo)</label><input type="file" id="vfPP" accept="image/*"><input name="profilePhoto" value="${h(v.profilePhoto || '')}" placeholder="…or paste photo link" style="margin-top:6px">
              <span class="small muted">Only you, face clearly visible, good light — like a passport or ID photo. This is the big photo families see, so they know who will come. Put food / work photos in <b>Work photos</b> below; they show with your ratings.</span></div></div></div>
          <div class="grid-3"><div class="field"><label>Years of experience</label><input name="experienceYears" type="number" min="0" max="80" value="${v.experienceYears || 0}"></div>
            <div class="field"><label>Languages (comma separated)</label><input name="languages" value="${h((v.languages || []).join(', '))}" placeholder="Bhojpuri, Maithili, Hindi"></div>
            <div class="field"><label>${v.type === 'catering' ? 'Famous for <span class="small muted">— your best dishes, comma separated (shown first on your menu)</span>' : 'Speciality'}</label><input name="speciality" value="${h(v.speciality || '')}" placeholder="${v.type === 'catering' ? 'Kachori-sabzi, malaiyo, jalebi' : 'Vivah sanskar, Maithil bhoj, Bhojpuri songs'}"></div></div>
          <div class="field"><label>Education & training – one per line <span class="muted small">(degree / course, institute, year)</span></label><textarea name="education" rows="3" placeholder="${v.type === 'pandit' ? 'Shastri (Sanskrit) – Sanskrit Vidyalaya, Darbhanga, 2008&#10;Acharya in Jyotish – 2012&#10;Karmkand training under Pt. … (Kashi)' : 'Course / training, institute, year&#10;Certificate or award'}">${h((v.education || []).join('\n'))}</textarea></div>
          <div class="field"><label>${v.type === 'pandit' ? 'Pujas & skills' : 'Skills'} – one group per line: "Group: skill, skill, skill"</label><textarea name="skills" rows="${v.type === 'pandit' ? 5 : 3}" placeholder="${v.type === 'pandit' ? 'Vivah: Vivah sanskar, Tilak, Haldi / Matkor puja, Kanyadaan&#10;Puja & path: Satyanarayan katha, Griha pravesh, Rudrabhishek, Sundarkand&#10;Jyotish / Astro: Kundli milan, Shubh muhurat, Vastu, Grah shanti' : 'Main: skill, skill&#10;Also: skill, skill'}">${h((v.skills || []).map(g => (g.group ? g.group + ': ' : '') + g.items.join(', ')).join('\n'))}</textarea><span class="small muted">Customers see every skill on your profile and can search by them (e.g. "kundli", "vastu").</span></div>
          ${v.type === 'catering' ? `<div class="field"><label>Dishes you can cook – one group per line: "Group: dish, dish, dish"</label><textarea name="dishes" rows="5" placeholder="Sabzi & Dal: Aloo dum, Shahi paneer, Chhole, Dal makhani&#10;Mithai: Gulab jamun, Rasgulla, Jalebi, Motichoor laddoo&#10;Nashta: Samosa, Pakode, Chaat">${h((v.dishes || []).map(g => (g.group ? g.group + ': ' : '') + g.items.join(', ')).join('\n'))}</textarea><span class="small muted">Customers see this full list on your profile, with the number of dishes.</span></div>` : ''}</div>
        <div class="field"><label>About (services, experience, rates)</label><textarea name="about" rows="3">${h(v.about)}</textarea></div>
        <div class="field"><label>Tags (comma separated)</label><input name="tags" value="${h((v.tags || []).join(', '))}" placeholder="AC, Driver included, Bhojpuri"></div>
        <div class="field"><label>${v.type === 'vehicle' ? 'Business photos (office, fleet, decorated cars)' : B.onePerDay ? 'Work photos (food, puja, mehndi you made…)' : 'Photos'} <span class="muted small">— saved right away${B.onePerDay ? ' · shown on your profile with your ratings; your face photo above is the one on your card' : ' · = front photo on your card'}${v.type === 'vehicle' ? ' · each car\'s own photos are in Vehicles & prices' : ''}</span></label><div id="vfPics"></div>
          <div class="otp-row" style="margin-top:8px"><input id="vfPicLink" placeholder="…or paste a photo link (https://…)"><button type="button" class="btn btn-light btn-sm" data-act="vf-piclink">Add link</button></div></div>
        ${['studio', 'orchestra', 'dj', 'tent', 'decoration', 'band', 'mehndi', 'makeup', 'venue', 'cards'].includes(v.type) ? `<div class="field"><label>Video links (YouTube / Instagram) – one per line</label><textarea name="videos" rows="2">${h((v.videos || []).join('\n'))}</textarea></div>` : ''}
        ${t.mode === 'stock' || B.tentCats ? `<div class="box"><h3>Delivery${B.tentCats ? ' / transport of rental items' : ''}</h3><label class="small"><input type="checkbox" name="dAvail" ${v.delivery && v.delivery.available ? 'checked' : ''}> ${B.tentCats ? 'I charge for bringing & setting up rental items (added once per booking date)' : 'I deliver to the customer'}</label>
          <div class="grid-2" style="margin-top:8px"><div class="field"><label>Delivery charge (₹)</label><input name="dCharge" type="number" min="0" value="${(v.delivery || {}).charge || 0}"></div><div class="field"><label>Free delivery above (₹, 0 = never)</label><input name="dFree" type="number" min="0" value="${(v.delivery || {}).freeAbove || 0}"></div></div></div>` : ''}
        ${o.admin ? `<div class="box" style="background:#fbf8f9"><h3>Admin</h3><div class="vf-days">
          <label><input type="checkbox" name="verified" ${v.verified ? 'checked' : ''}> Verified (visible to customers)</label>
          <label><input type="checkbox" name="active" ${v.active ? 'checked' : ''}> Active</label>
          <label><input type="checkbox" name="sample" ${v.sample ? 'checked' : ''}> Sample listing</label></div></div>` : ''}
        <button class="btn btn-primary">Save profile</button></form>`;
    }

    // Arkestra groups: every artist with photo, stage name, work and gender (customers see total people and ladies)
    const hasTeam = () => B.vendor.type === 'orchestra' && B.vendor.subtype !== 'artist';
    const teamCount = () => (B.vendor.team || []).reduce((a, m) => a + (m.count || 1), 0);
    const ROLES = ['Singer', 'Dancer', 'Anchor', 'Comedian', 'Musician', 'Sound & lights', 'Choreographer', 'Jhanki artist', 'Manager'];
    function team() {
      const list = B.vendor.team || [], ladies = list.filter(m => m.gender === 'female').reduce((a, m) => a + m.count, 0);
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap"><p class="small muted" style="margin:0">Add every artist with a clear photo, stage name and work. Customers see <b>total people</b>, <b>how many ladies</b> and each artist's work. For a crew (e.g. 4 band musicians) add one row with "How many".</p><button class="btn btn-gold btn-sm" data-act="tm-add">+ Add artist</button></div>
        <div class="small" style="margin-bottom:10px"><b>${teamCount()}</b> people · <b>${ladies}</b> ladies · <b>${teamCount() - ladies}</b> men</div>
        <div class="team-ed">${list.map(m => `<div class="tm">${ph(m.photo, m.gender === 'female' ? '' : '', '#f6eef0', 'thumb')}<b>${h(m.name || m.role)}</b><span class="small">${h(m.role)}${m.count > 1 ? ` × ${m.count}` : ''} · ${m.gender === 'female' ? 'Lady' : m.gender === 'male' ? 'Male' : '—'}</span>
          <span><button class="btn btn-light btn-sm" data-tmedit="${m.id}">Edit</button> <button class="btn btn-light btn-sm" data-tmdel="${m.id}">Delete</button></span></div>`).join('') || '<p class="muted">No artists added yet.</p>'}</div>`;
    }
    function memberForm(m) {
      const isNew = !m;
      m = m || { name: '', role: 'Singer', gender: 'female', count: 1, photo: '' };
      const md = modal(`<h2 style="margin:0 0 12px">${isNew ? 'Add' : 'Edit'} artist</h2><form id="vfTm">
        <div class="img-pick">${ph(m.photo, '', '#f6eef0', 'vf-ph')}<div style="flex:1"><div class="field"><label>Photo (clear face photo)</label><input type="file" id="vfTmUp" accept="image/*"><input name="photo" value="${h(m.photo)}" placeholder="…or paste photo link" style="margin-top:6px"></div></div></div>
        <div class="grid-2"><div class="field"><label>Stage name</label><input name="name" value="${h(m.name)}" placeholder="e.g. Singer Khushboo"></div>
          <div class="field"><label>Work</label><input name="role" list="vfRoles" required value="${h(m.role)}"><datalist id="vfRoles">${ROLES.map(r => `<option value="${r}">`).join('')}</datalist></div>
          <div class="field"><label>Gender</label><select name="gender"><option value="female" ${m.gender === 'female' ? 'selected' : ''}>Lady</option><option value="male" ${m.gender === 'male' ? 'selected' : ''}>Male</option></select></div>
          <div class="field"><label>How many (1 for one person)</label><input name="count" type="number" min="1" max="50" value="${m.count}"></div></div>
        <button class="btn btn-primary">Save</button></form>`, 600);
      const f = $('#vfTm', md);
      upload($('#vfTmUp', md), url => { f.photo.value = url; });
      f.addEventListener('submit', e => {
        e.preventDefault();
        const row = { ...m, ...Object.fromEntries(new FormData(f)) };
        const list = (B.vendor.team || []).slice();
        if (isNew) list.push(row); else list[list.findIndex(x => x.id === m.id)] = row;
        closeModal(); save({ team: list }, 'Team saved ✓');
      });
    }

    function reviews() {
      const list = B.reviewList || [];
      return list.length ? list.map(r => `<div class="order-card" style="padding:12px 14px"><div><b>${h(r.name)}</b> · ★ ${r.rating} ${r.sample ? '<span class="chip chip-prod">Sample</span>' : r.verified ? '<span class="chip pay-paid">Verified booking</span>' : ''} <span class="small muted">${fmtDate(r.createdAt)}</span> ${r.status === 'hidden' ? '<span class="status st-cancelled">Hidden by admin</span>' : ''}</div>
        ${r.text ? `<p style="margin:6px 0">${h(r.text)}</p>` : ''}
        <form data-reply="${r.id}" class="otp-row" style="margin-top:6px"><input name="reply" placeholder="Reply to this review" value="${h(r.reply || '')}"><button class="btn btn-light btn-sm">Reply</button></form></div>`).join('')
        : '<p class="muted">No reviews yet. Customers can review after you mark their booking as completed.</p>';
    }

    // Lagan-day prices: "% extra" for everything, or a fixed lagan price per item
    function lagan() {
      const v = B.vendor, pct = v.laganPct || 0;
      const auto = l => (pct ? Math.round(l.price * (1 + pct / 100)) : l.price);
      return `<p class="small muted" style="margin-top:0"><b>Lagan</b> = shubh vivah dates. Pandit Ji publishes them for the whole site, and demand is high on those days. Set your lagan price here — customers booking a lagan date pay it automatically and see it marked "Lagan price".</p>
        <form id="vfLagan" class="a-card pad doc-sec"><h3>Your lagan-day prices</h3>
          <div class="otp-row" style="max-width:380px;margin-bottom:10px"><label class="small" style="align-self:center;min-width:170px"><b>Extra on lagan days for everything</b></label><input name="laganPct" type="number" min="0" max="300" value="${pct}" style="max-width:90px"><span style="align-self:center">%</span></div>
          ${B.listings.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${B.type.mode === 'unit' ? 'Vehicle' : 'Item'}</th><th>Normal price</th><th>Lagan price <span class="muted small">(empty = normal + ${pct}%)</span></th></tr></thead><tbody>
            ${B.listings.map(l => `<tr><td><b>${h(l.name)}</b>${(l.guestTiers || []).length ? '<br><span class="small muted">guest prices: lagan % applies</span>' : ''}</td><td>${inr(l.price)} <span class="small muted">/ ${h(l.unit)}</span></td>
              <td>${(l.guestTiers || []).length ? `<span class="small">${l.guestTiers.map(t => `${t.guests} log ${inr(pct ? Math.round(t.price * (1 + pct / 100)) : t.price)}`).join(' · ')}</span>` : `<input type="number" min="0" data-lgp="${l.id}" value="${l.laganPrice || ''}" placeholder="${auto(l)}" style="max-width:130px">`}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Add your items / vehicles first.</p>'}
          <button class="btn btn-primary" style="margin-top:10px">Save lagan prices</button></form>
        <div class="a-card pad doc-sec"><h3>Lagan dates</h3><div id="vfLaganDates"><div class="spinner"></div></div></div>`;
    }

    // Vehicle papers: licence for the driver / owner, RC, insurance, PUC and permit for each car.
    // Private: only the vendor and admins see them; admins mark each one verified or rejected.
    const docOf = (kind, lid) => (B.vendor.docs || []).find(d => d.kind === kind && (d.listingId || '') === (lid || ''));
    function papersFlag() {
      const docs = B.vendor.docs || [];
      if (o.admin) { const n = docs.filter(d => d.status === 'pending').length; return n ? ` (${n} to check)` : B.docsMissing.length && !B.vendor.sample ? ' ' : ''; }
      return B.docsMissing.length || docs.some(d => d.status === 'rejected') ? ' ' : '';
    }
    // how much a paper matters for this vendor: required / needed for ✓ / optional
    const docLevel = (kind, lid) => {
      const r = B.docRules, set = lid ? r.car || { join: [], check: [] } : r;
      return set.join.includes(kind) || set.check.includes(kind) ? 'need' : 'opt';
    };
    function docRow(kind, lid) {
      const d = docOf(kind, lid), st = d && DOCUP.STATUS[d.status], need = docLevel(kind, lid) === 'need';
      return `<div class="doc-row ${d ? 'has' : ''}">
        <div class="doc-row-n"><b>${DOCUP.label(kind)}</b>${d ? `<span class="status ${st[2]}">${st[0]} ${st[1]}</span>${d.note ? `<small class="doc-note">Reason: ${h(d.note)}</small>` : ''}<small class="muted">${d.ext.toUpperCase()} · ${Math.max(1, Math.round(d.size / 1024))} KB · ${fmtDate(d.at)}</small>` : `<span class="muted small">${need ? 'Not added — needed for verification' : `Optional · ${h((DOCUP.KINDS[kind] || [])[2] || '')}`}</span>`}</div>
        <div class="doc-row-a">${d ? `<button type="button" class="btn btn-light btn-sm" data-docview="${d.id}">View</button>` : ''}
          <label class="btn btn-${d ? 'light' : 'gold'} btn-sm doc-up">${d ? '↻ Replace' : 'Upload'}<input type="file" accept="image/*,application/pdf" data-docup="${kind}" data-lid="${lid || ''}" hidden></label>
          ${o.admin && d ? `${d.status !== 'ok' ? `<button type="button" class="btn btn-primary btn-sm" data-docok="${d.id}">✓ Verify</button>` : ''}${d.status !== 'rejected' ? `<button type="button" class="btn btn-light btn-sm" data-docno="${d.id}">✗ Reject</button>` : ''}` : ''}
          ${d && (o.admin || d.status !== 'ok') ? `<button type="button" class="btn btn-light btn-sm" data-docdel="${d.id}" title="Remove">Delete</button>` : ''}</div></div>`;
    }
    function papers() {
      const v = B.vendor, r = B.docRules, veh = !!r.car, kyc = v.kyc || {};
      const all = [...new Set([...r.join, ...r.check, ...r.optional])];
      const order = k => (docLevel(k) === 'need' ? 0 : 1);
      const person = all.filter(k => ['id', 'dl', 'pan', 'police'].includes(k)).sort((a, b) => order(a) - order(b));
      const business = all.filter(k => !person.includes(k)).sort((a, b) => order(a) - order(b));
      const missingN = B.docsMissing.length;
      // numbers kept private; GSTIN / FSSAI only where those papers apply
      const nums = [...(veh ? [['dlNo', 'Driving licence number', v.dlNo, 'BR06 20110012345']] : []), ['pan', 'PAN number', kyc.pan, 'ABCDE1234F'],
        ...(all.includes('gst') ? [['gstin', 'GSTIN', kyc.gstin, '10ABCDE1234F1Z5']] : []), ...(all.includes('fssai') ? [['fssai', 'FSSAI number', kyc.fssai, '14 digits']] : [])];
      return `<p class="small muted" style="margin-top:0">Only ${o.admin ? 'the vendor and admins' : 'you and the Vivah Saathi team'} can see these papers and numbers — never customers. Customers only see badges like <b>ID checked</b>${veh ? ', <b>Licence & RC checked</b>' : ''}${all.includes('fssai') ? ', <b>FSSAI registered</b>' : ''}. A new upload replaces the old one and is checked again.</p>
        <div class="doc-summary ${missingN ? 'warn' : 'ok'}">${missingN ? `<b>${missingN}</b> paper${missingN > 1 ? 's' : ''} still needed for verification` : '✓ All needed papers are added'}${v.type === 'orchestra' ? ` · ${v.adultsDeclaredAt ? `18+ declaration given on ${fmtDate(v.adultsDeclaredAt)}` : '<b>18+ declaration not given</b>'}` : ''}${v.consentAt ? ` · consent given ${fmtDate(v.consentAt)}` : ''}</div>
        <p class="small doc-tip">${DOCUP.AADHAAR_TIP}</p>
        <div class="a-card pad doc-sec"><h3>${veh ? 'Driver / owner' : 'You (owner)'}</h3>${person.map(k => docRow(k)).join('')}</div>
        ${business.length ? `<div class="a-card pad doc-sec"><h3>${v.type === 'orchestra' ? 'Group' : 'Business'}</h3>${business.map(k => docRow(k)).join('')}</div>` : ''}
        <form id="vfKyc" class="a-card pad doc-sec"><h3>Numbers <span class="muted small" style="font-weight:500">(optional, private)</span></h3>
          <div class="grid-3">${nums.map(([n, l, val, p]) => `<div class="field"><label>${l}</label><input name="${n}" value="${h(val || '')}" placeholder="${p}" style="text-transform:uppercase"></div>`).join('')}</div>
          <button class="btn btn-light btn-sm">Save numbers</button></form>
        ${veh ? B.listings.map(l => `<div class="a-card pad doc-sec"><h3>${h(l.name)} ${l.regNo ? `<span class="regno">${h(l.regNo)}</span>` : `<button type="button" class="btn btn-light btn-sm" data-ledit="${l.id}">+ Add vehicle number</button>`}</h3>
          ${DOCUP.CAR_DOCS.map(k => docRow(k, l.id)).join('')}</div>`).join('') || '<p class="muted">Add your vehicles first (Vehicles & prices), then upload each one\'s RC and insurance here.</p>' : ''}`;
    }
    // opens on top of the vendor screen (not via modal(), which would close it), so Verify / Reject are right there after
    async function viewDoc(id) {
      const d = (B.vendor.docs || []).find(x => x.id === id);
      const ov = document.createElement('div');
      ov.className = 'doc-ov';
      ov.innerHTML = `<div class="doc-ov-box"><button type="button" class="modal-x" aria-label="Close">×</button><h2 style="margin:0 0 10px">${DOCUP.label(d.kind)}</h2><div class="doc-view"><div class="spinner"></div></div></div>`;
      let url = '';
      const close = () => { ov.remove(); if (url) URL.revokeObjectURL(url); document.removeEventListener('keydown', onKey); };
      const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
      ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
      $('.modal-x', ov).addEventListener('click', close);
      document.addEventListener('keydown', onKey);
      document.body.appendChild(ov);
      try {
        url = URL.createObjectURL(await o.api(`${o.base}/docs/${id}`, { blob: true }));
        $('.doc-view', ov).innerHTML = d.ext === 'pdf' ? `<iframe src="${url}" title="Document"></iframe>` : `<img src="${url}" alt="${h(DOCUP.KINDS[d.kind][1])}">`;
        $('.doc-view', ov).insertAdjacentHTML('beforeend', `<a class="link small" href="${url}" target="_blank" rel="noopener">Open full size ↗</a>`);
      } catch (e) { $('.doc-view', ov).innerHTML = `<p class="err">${h(e.message)}</p>`; }
    }
    const docCall = async (path, opts, msg) => { try { B = await o.api(o.base + path, opts); toast(msg); draw(); o.onChange && o.onChange(); } catch (e) { toast(e.message, true); } };

    const bulkStr = l => (l.bulkTiers || []).map(t => `${t.min}:${t.price}`).join(', ');
    // car facts: saved fields first, older listings read from their details text (same rule as the server)
    const carTxt = l => `${l.specs || ''} ${l.name || ''}`;
    const carSeats = l => (l.seats > 0 ? l.seats : Number((/(\d+)\s*seat/i.exec(carTxt(l)) || [])[1] || 0));
    const carAc = l => (typeof l.ac === 'boolean' ? l.ac : /\bnon[- ]?ac\b/i.test(carTxt(l)) ? false : /\bac\b/i.test(carTxt(l)) ? true : null);
    const carDriver = l => (typeof l.driver === 'boolean' ? l.driver : /with driver|driver included|chauffeur/i.test(carTxt(l)));
    // Wedding card design: front / back / inside photos, card type, paper, printing, MOQ, bulk rates, add-ons
    function cardForm(l, isNew) {
      const types = B.cardTypes || [], prints = B.printingOptions || [];
      const m = modal(`<h2 style="margin:0 0 4px">${isNew ? 'Add' : 'Edit'} card design</h2><p class="small muted" style="margin:0 0 12px">Customers see every design in the card gallery with its front, back and inside photos, cheapest first.</p><form id="vfL">
        <div class="grid-2"><div class="field"><label>Design name</label><input name="name" required value="${h(l.name)}" placeholder="Royal Peacock Folded Card"></div><div class="field"><label>Name in Hindi</label><input name="nameHi" value="${h(l.nameHi)}"></div>
          <div class="field"><label>Card type</label><select name="cardType">${types.map(t => `<option ${l.cardType === t ? 'selected' : ''}>${h(t)}</option>`).join('')}</select></div>
          <div class="field"><label>Design / theme / colours</label><input name="design" value="${h(l.design || '')}" placeholder="Peacock, maroon & gold foil"></div>
          <div class="field"><label>Paper quality</label><input name="paper" value="${h(l.paper || '')}" placeholder="350 GSM textured / shimmer / handmade"></div>
          <div class="field"><label>Size & pages</label><input name="specs" value="${h(l.specs || '')}" placeholder="7×10 in, folded, 2 inside pages"></div></div>
        <div class="field"><label>Printing</label><div class="vf-days">${prints.map(p => `<label><input type="checkbox" name="printing" value="${h(p)}" ${(l.printing || []).includes(p) ? 'checked' : ''}> ${h(p)}</label>`).join('')}</div></div>
        <div class="grid-3"><div class="field"><label>Price per card (₹)</label><input name="price" type="number" min="1" required value="${h(l.price)}"></div>
          <div class="field"><label>Minimum order (cards)</label><input name="minQty" type="number" min="1" value="${h(l.minQty || 100)}"></div>
          <div class="field"><label>Days to print & deliver</label><input name="leadDays" type="number" min="0" max="60" value="${h(l.leadDays ?? 5)}"></div></div>
        <div class="grid-2"><div class="field"><label>Bulk rates – cards:price per card</label><input name="bulkTiers" value="${h(bulkStr(l))}" placeholder="300:25, 500:22, 1000:20"><span class="small muted">From 300 cards ₹25 each, from 500 ₹22…</span></div>
          <div class="field"><label>Cards you can print now (availability)</label><input name="stock" type="number" min="0" value="${h(l.stock ?? 5000)}"><span class="small muted">0 = not taking orders for this design</span></div></div>
        <div class="field"><label>Customisation add-ons – name:extra ₹ per card</label><input name="addons" value="${h((l.addons || []).map(a => `${a.name}:${a.price}`).join(', '))}" placeholder="Envelope:2, Ribbon:3, Couple photo inside:5, Names in Hindi & English:0"><span class="small muted">Customers tick the ones they want; the price is added per card.</span></div>
        <div class="grid-3 card-views"><div class="field"><label>Front</label><div id="cvFront"></div></div><div class="field"><label>Back</label><div id="cvBack"></div></div><div class="field"><label>Inside pages</label><div id="cvInside"></div></div></div>
        <button class="btn btn-primary">Save design</button></form>`, 820);
      const f = $('#vfL', m), cv = l.cardViews || { front: l.photo || '', back: '', inside: [] };
      let front = [cv.front].filter(Boolean), back = [cv.back].filter(Boolean), inside = (cv.inside || []).slice();
      gallery($('#cvFront', m), front.slice(), x => { front = x; }, { max: 1, badge: '' });
      gallery($('#cvBack', m), back.slice(), x => { back = x; }, { max: 1, badge: '' });
      gallery($('#cvInside', m), inside.slice(), x => { inside = x; }, { max: 8, badge: '' });
      f.addEventListener('submit', async e => {
        e.preventDefault();
        if (!front.length) return toast('Add a photo of the front of the card', true);
        const fd = new FormData(f);
        const body = { ...Object.fromEntries(fd), kind: 'card', unit: 'card', printing: fd.getAll('printing'), cardViews: { front: front[0], back: back[0] || '', inside } };
        try {
          if (isNew) await o.api(o.base + '/listings', { method: 'POST', body }); else await o.api(`${o.base}/listings/${l.id}`, { method: 'PUT', body });
          closeModal(); toast('Design saved ✓'); await reload(); draw();
        } catch (err) { toast(err.message, true); }
      });
    }

    // halwai team member: extra cook or helper, hired per person per day; `units` = how many such people
    // extra people for hire: halwai cooks / helpers (per day), orchestra lady dancers / singers (per show)
    const XROLES = { cook: ['Extra cook (halwai)', 'अतिरिक्त हलवाई', 'person / day'], helper: ['Helper (kaam wala)', 'सहायक', 'person / day'], dancer: ['Extra lady dancer', 'अतिरिक्त महिला डांसर', 'dancer / show'], singer: ['Extra singer', 'अतिरिक्त गायक', 'singer / show'] };
    function staffForm(l) {
      const isNew = !l, roles = B.staffRoles || ['cook', 'helper'], ark = B.vendor.type === 'orchestra';
      l = l || { name: '', nameHi: '', staff: ark ? roles[0] : 'helper', price: '', unit: XROLES[roles[0]][2], units: 4, specs: '', active: true };
      if (!l.staff) l.staff = roles[0];
      const m = modal(`<h2 style="margin:0 0 12px">${isNew ? 'Add' : 'Edit'} ${ark ? 'extra artists' : 'team member'}</h2><form id="vfS">
        <div class="field"><label>Who</label><div class="seg">${roles.map(val => `<label><input type="radio" name="staff" value="${val}" ${l.staff === val ? 'checked' : ''}> ${{ cook: 'Extra cook (halwai)', helper: 'Helper (cutting, washing, serving)', dancer: 'Extra lady dancer', singer: 'Extra singer' }[val]}</label>`).join('')}</div></div>
        <div class="grid-2"><div class="field"><label>Name shown</label><input name="name" required value="${h(l.name)}" placeholder="${ark ? 'Extra lady dancer / Extra singer' : 'Extra cook (halwai) / Helper'}"></div><div class="field"><label>Name in Hindi</label><input name="nameHi" value="${h(l.nameHi || '')}" placeholder="${ark ? 'अतिरिक्त महिला डांसर' : 'अतिरिक्त हलवाई / सहायक'}"></div>
          <div class="field"><label>Rate per ${ark ? 'artist per show' : 'person per day'} (₹)</label><input name="price" type="number" min="1" required value="${h(l.price)}"></div>
          <div class="field"><label>How many such people do you have?</label><input name="units" type="number" min="1" max="50" value="${l.units || 1}"><span class="small muted">A family can book at most this many for one date</span></div></div>
        <div class="field"><label>Details</label><input name="specs" value="${h(l.specs || '')}" placeholder="${ark ? 'Bhojpuri & filmi dance, joins your group for the night' : 'Experienced in bhoj for 500+ guests'}"></div>
        <button class="btn btn-primary">Save</button></form>`, 560);
      const f = $('#vfS', m), stock = Object.values(XROLES).map(r => r[0]);
      $$('[name=staff]', m).forEach(r => r.addEventListener('change', () => { if (!f.name.value || stock.includes(f.name.value)) { f.name.value = XROLES[r.value][0]; f.nameHi.value = XROLES[r.value][1]; } }));
      if (isNew && !f.name.value) { f.name.value = XROLES[l.staff][0]; f.nameHi.value = XROLES[l.staff][1]; }
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(f)), body = { ...fd, unit: (XROLES[fd.staff] || XROLES.helper)[2], rental: '0' };
        try {
          if (isNew) await o.api(o.base + '/listings', { method: 'POST', body }); else await o.api(`${o.base}/listings/${l.id}`, { method: 'PUT', body });
          closeModal(); toast('Saved ✓'); await reload(); draw();
        } catch (err) { toast(err.message, true); }
      });
    }
    function listingForm(l, kindHint, rentalHint) {
      if ((l && l.staff) || (!l && kindHint === 'staff')) return staffForm(l);
      const isNew = !l, mode = B.type.mode, vt = B.vendor.type, rt = !!B.tentCats;
      const rent = rt && (l ? !!l.rental : !!rentalHint);
      if (vt === 'cards') return cardForm(l || { name: '', nameHi: '', price: '', stock: 5000, minQty: 100, leadDays: 5, cardType: (B.cardTypes || [])[0] }, isNew);
      const kind = l ? l.kind || '' : kindHint || '', isBox = kind === 'box';
      // ration / sabzi shops: pick the ingredient from the shared list (price comparison + ration planner)
      const isRation = !!B.ingredients, groups = isRation ? [...new Set(B.ingredients.map(i => i.group))] : [];
      l = l || { name: '', nameHi: '', item: '', price: '', unit: mode === 'unit' ? 'day' : isBox ? 'box' : mode === 'stock' ? 'kg' : rent ? 'piece' : 'event', stock: 0, units: 1, photo: '', specs: '', active: true };
      const what = mode === 'unit' ? 'vehicle' : isBox ? 'box / packaging' : vt === 'sweets' ? 'sweet' : rent ? 'rental item' : 'item';
      const m = modal(`<h2 style="margin:0 0 12px">${isNew ? 'Add' : 'Edit'} ${what}</h2><form id="vfL">
        ${rt ? `<label class="box vf-rent"><input type="checkbox" name="rental" ${rent ? 'checked' : ''}> <span>${vt === 'catering' ? '<b>Bartan on rent — booked by quantity for each date</b><br><span class="small muted">Degchi, kadhai, bhagona, tawa, balti, thali, bhatti… Shown in the bartan list on your profile. Untick for a menu / package.</span>' : '<b>Rental item — booked by quantity for each date</b><br><span class="small muted">Shamiyana, chairs, kanaat, lights, generator, speakers, flowers, bartan (category "Bartan & kitchen")… Shown one by one in Tent Booking. Untick for a package / service (one booking per slot).</span>'}</span></label>
          <div class="grid-2" data-rentf ${rent ? '' : 'hidden'}><div class="field"><label>Category</label><select name="category">${B.tentCats.map(c => `<option value="${c.id}" ${(l.category || (vt === 'dj' ? 'sound' : vt === 'decoration' ? 'decoration' : 'tent')) === c.id ? 'selected' : ''}>${h(c.name)}</option>`).join('')}</select></div>
            <div class="field"><label>How many do you own?</label><input name="units" type="number" min="1" max="100000" value="${l.units || 1}"><span class="small muted">Customers can book at most this many for one date</span></div>
            <div class="field"><label>Size</label><input name="size" maxlength="40" value="${h(l.size || '')}" placeholder="${vt === 'catering' ? '50 litre, 36 inch, 2 chulha' : '40×60 ft, 25 kVA, 5 ft round'}"></div>
            <div class="field"><label>Features (comma separated)</label><input name="features" value="${h((l.features || []).join(', '))}" placeholder="Waterproof, set-up included, with covers"></div></div>` : ''}
        ${isNew && vt === 'sweets' ? `<div class="seg vf-kind"><label><input type="radio" name="kindPick" value="" ${isBox ? '' : 'checked'}> Sweet (sold per kg)</label><label><input type="radio" name="kindPick" value="box" ${isBox ? 'checked' : ''}> Box / packaging</label></div>` : ''}
        <input type="hidden" name="kind" value="${kind}">
        <div class="grid-2"><div class="field"><label>Name</label><input name="name" required value="${h(l.name)}" placeholder="${h(isBox ? 'Red & gold window box' : EXAMPLE[vt] || (mode === 'unit' ? 'Mahindra Scorpio (7 seater, AC)' : mode === 'stock' ? 'Basmati Rice' : 'Veg Bhoj Thali'))}"></div><div class="field"><label>Name in Hindi</label><input name="nameHi" value="${h(l.nameHi)}"></div>
        ${isRation ? `<div class="field" style="grid-column:1/-1"><label>Ingredient <span class="muted small">— lets customers compare your price and add it from the ration planner</span></label><select name="item" id="vfIng"><option value="">Other (not in the list)</option>${l.item && !B.ingredients.some(i => i.key === l.item) ? `<option value="${h(l.item)}" selected>Your own item key: ${h(l.item)}</option>` : ''}${groups.map(g => `<optgroup label="${h(g)}">${B.ingredients.filter(i => i.group === g).map(i => `<option value="${i.key}" ${l.item === i.key ? 'selected' : ''}>${h(i.name)} · ${h(i.hi)}</option>`).join('')}</optgroup>`).join('')}</select></div>
          <div class="field"><label>Company / brand</label><input name="brand" value="${h(l.brand || '')}" placeholder="India Gate, Fortune, MDH, Loose…"><span class="small muted">Sell it in more than one company? Add each as its own item with the same ingredient — families get one row with a company dropdown, each with its own photo, price and stock.</span></div>
          <div class="field"><label>Quality</label><select name="quality"><option value="">—</option>${(B.qualities || []).map(q => `<option ${l.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select></div>`
          : mode === 'stock' && !isBox && vt !== 'vegetable' ? `<div class="field" style="grid-column:1/-1"><label>Company / brand <span class="muted small">(optional)</span></label><input name="brand" value="${h(l.brand || '')}" placeholder="Haldiram's, Bikaji, Cycle, Zed Black, own make…"><span class="small muted">Same item from more companies? Add each as its own item with the same name and compare key — families choose the company from a dropdown.</span></div>` : ''}
        <div class="field"><label>Price (₹)${isBox ? ' per box' : vt === 'sweets' ? ' per kg' : ''}</label><input name="price" type="number" min="1" required value="${h(l.price)}"></div>
        ${isRation ? `<div class="field"><label>Sold per</label><select name="unit" id="vfUnit">${['kg', 'litre', 'quintal', 'bag', 'tin', 'packet', 'piece'].map(u => `<option ${l.unit === u ? 'selected' : ''}>${u}</option>`).join('')}${['kg', 'litre', 'quintal', 'bag', 'tin', 'packet', 'piece'].includes(l.unit) ? '' : `<option selected>${h(l.unit)}</option>`}</select></div>
          <div class="field" id="vfPackF"><label>Each ${h(l.unit || 'unit')} holds (kg / litre)</label><input name="packSize" type="number" step="0.001" min="0" value="${h(l.packSize || '')}" placeholder="50 for a 50 kg bag · 0.5 for a 500 g packet"><span class="small muted">Used to compare prices per kg / litre</span></div>`
        : `<div class="field"><label>${rt ? 'Rent per (unit)' : 'Per (unit)'}</label><input name="unit" value="${h(l.unit)}" placeholder="${rt ? 'piece, set, day, 100 sq ft' : 'day, kg, plate, event, box'}"></div>`}
        ${isBox ? `<div class="field"><label>Box size (label)</label><input name="boxSize" value="${h(l.boxSize || '')}" placeholder="250 g / 500 g / 1 kg / 4 partitions"></div><div class="field"><label>Holds how much mithai (kg)</label><input name="holdsKg" type="number" step="0.05" min="0" value="${h(l.holdsKg ?? '')}" placeholder="0.5"><span class="small muted">Used to suggest how many boxes a customer needs</span></div>
          <div class="field" style="grid-column:1/-1"><label>Design / colour</label><input name="design" value="${h(l.design || '')}" placeholder="Red & gold, window lid, names printed"></div>` : ''}
        ${mode === 'unit' && B.vendor.subtype !== 'dulha' ? `<div class="field"><label>Seats</label><select name="seats"><option value="0">—</option>${[2, 4, 5, 6, 7, 8, 9, 10, 12, 14, 17, 20, 26, 40].map(n => `<option ${Number(l.seats || carSeats(l)) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label>AC</label><div class="seg">${[['1', 'AC'], ['0', 'Non-AC']].map(([val, t]) => `<label><input type="radio" name="ac" value="${val}" ${String(carAc(l)) === (val === '1' ? 'true' : 'false') ? 'checked' : ''}> ${t}</label>`).join('')}</div></div>
          <div class="field"><label>Included km / hours</label><input name="km" maxlength="60" value="${h(l.km || '')}" placeholder="100 km / 12 hrs"></div>
          <div class="field"><label>Driver</label><label class="small" style="display:flex;gap:6px;align-items:center;padding-top:8px"><input type="checkbox" name="driver" ${carDriver(l) ? 'checked' : ''}> Driver included in the price</label></div>` : ''}
        ${mode === 'unit' && B.vendor.subtype === 'dulha' ? `<div class="field"><label>Time included</label><input name="km" maxlength="60" value="${h(l.km || '')}" placeholder="3 hrs, baraat route"></div>` : ''}
        ${mode === 'unit' ? `<div class="field"><label>How many of this ${B.vendor.subtype === 'dulha' ? 'item (ghodi, baggi, jeep…)' : 'vehicle'}?</label><input name="units" type="number" min="1" max="50" value="${l.units}"></div>
          <div class="field"><label>Vehicle number (as on RC) <span class="muted small">— private${B.vendor.subtype === 'dulha' ? ', not needed for ghodi / baggi' : ''}</span></label><input name="regNo" value="${h(l.regNo || '')}" placeholder="BR 06 AB 1234" maxlength="15" style="text-transform:uppercase"><span class="small muted">Only the team sees it. Have more than one? Add the first one here and the rest in the About box.</span></div>` : ''}
        ${mode === 'event' ? `<div class="field"><label>Minimum order <span class="muted small">(0 = none)</span></label><input name="minQty" type="number" min="0" value="${h(l.minQty || '')}" placeholder="e.g. 100 for plates"><span class="small muted">Customers cannot book less than this many ${h(l.unit || 'units')}</span></div>` : ''}
        ${mode === 'stock' ? `<div class="field"><label>Stock available${isBox ? ' (boxes)' : ''}</label><input name="stock" type="number" min="0" value="${l.stock}"></div>${isRation ? '' : `<div class="field"><label>Compare key (same item, same key across shops)</label><input name="item" value="${h(l.item)}" placeholder="rice-basmati, potato, laddoo"></div>`}
          <div class="field"><label>Minimum order</label><input name="minQty" type="number" min="0" value="${h(l.minQty || '')}" placeholder="e.g. 2 (0 = none)"></div>
          <div class="field"><label>Bulk rates – quantity:price</label><input name="bulkTiers" value="${h(bulkStr(l))}" placeholder="${isBox ? '100:11, 500:9' : '10:420, 25:400, 50:380'}"><span class="small muted">${isBox ? 'From 100 boxes ₹11 each…' : `e.g. 10:420 = from 10 ${h(l.unit || 'units')}, ₹420 per ${h(l.unit || 'unit')}`}</span></div>` : ''}
        </div>
        ${B.shootPlan ? `<div class="field"><label>How is it charged?</label><select name="shoot">${[['day', 'Per function — coverage (photo only, photo + video…)'], ['addon', 'Add-on per function (drone, extra cameraman, LED screen)'], ['once', 'One time (album, pre-wedding shoot, highlight film)'], ['', 'Fixed package on the booking date']].map(([k, t]) => `<option value="${k}" ${(l.shoot || '') === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
          <span class="small muted">Families make one booking for all their functions: for each function they pick the date and a "per function" coverage, then add-ons. Put service types (Photo only | 12000, Photo + Video | 25000…) as styles below.</span></div>` : ''}
        <div class="field"><label>Details</label><input name="specs" value="${h(l.specs)}" placeholder="${mode === 'unit' ? 'Colour, decoration, luggage space, fuel extra after km…' : 'What is included'}"></div>
        ${mode === 'event' ? `<div class="field" data-norent ${rent ? 'hidden' : ''}><label>Styles / designs (optional) — one per line: <b>name | price | note | photo number</b></label>
          <textarea name="styles" rows="4" placeholder="Orange genda | 450 | Classic strings | 1&#10;Genda + rose | 750 | With red roses | 2">${h((l.styles || []).map(s => [s.name, s.price, s.note || '', Math.max(0, (l.photos || []).indexOf(s.photo) + 1) || ''].join(' | ').replace(/( \| )+$/, '')).join('\n'))}</textarea>
          <span class="small muted">For one item in several styles (mala, jaimala, car decoration…). Photo number = which of this item's photos below shows that style (1 = first). Customers pick a style card and pay its price; the item shows "from" the cheapest. Leave empty for one price.</span></div>` : ''}
        ${mode === 'event' ? `<div class="field" data-norent ${rent ? 'hidden' : ''}><label>Price by number of guests (optional) – guests:price, comma separated</label><input name="guestTiers" value="${h((l.guestTiers || []).map(x => `${x.guests}:${x.price}`).join(', '))}" placeholder="100:6500, 200:9000, 300:11500"><span class="small muted">For halwai / cooks. Customers pick "kitne log" and pay that price. When filled, the Price above is replaced by the smallest group's price.</span></div>` : ''}
        ${mode === 'event' && B.events ? `<div data-norent ${rent ? 'hidden' : ''}><div class="field"><label>Booked for which functions? <span class="small muted">— none ticked = any function (DJ, tent, photographer…). Tick e.g. only Tilak for a Tilak puja.</span></label>
          <div class="vf-days">${B.events.map(e => `<label><input type="checkbox" name="events" value="${h(e)}" ${(l.events || []).includes(e) ? 'checked' : ''}> ${h(e)}</label>`).join('')}</div></div>
        <div class="field"><label>Full ceremony — covers these rasams in one booking <span class="small muted">— the customer gives a date for each (e.g. Pandit Ji full shaadi: Tilak, Haldi, Matkor, Shaadi). Leave empty for a one-function service. When ticked, the functions above are not used.</span></label>
          <div class="vf-days">${B.events.map(e => `<label><input type="checkbox" name="covers" value="${h(e)}" ${(l.covers || []).includes(e) ? 'checked' : ''}> ${h(e)}</label>`).join('')}</div></div></div>` : ''}
        <div class="field"><label>${mode === 'unit' ? 'Photos of this vehicle' : 'Photos'} <span class="muted small">— tap to choose the front photo shown on the card</span></label><div id="vfLPics"></div></div>
        <button class="btn btn-primary">Save</button></form>`, 640);
      const f = $('#vfL', m);
      let pics = (l.photos && l.photos.length ? l.photos : [l.photo]).filter(Boolean);
      // reuse photos already on the profile or on other vehicles
      const others = [...new Set([...(B.vendor.photos || []), ...B.listings.filter(x => x.id !== l.id).flatMap(x => x.photos || [x.photo])].filter(Boolean))];
      gallery($('#vfLPics', m), pics.slice(), list => { pics = list; }, { max: 10, pickFrom: others });
      $$('[name=kindPick]', m).forEach(r => r.addEventListener('change', () => listingForm(null, r.value)));
      // rental item package: show the rental fields (category, owned, size, features) or the guest / function fields
      if (f.rental) f.rental.addEventListener('change', () => { $$('[data-rentf]', m).forEach(x => { x.hidden = !f.rental.checked; }); $$('[data-norent]', m).forEach(x => { x.hidden = f.rental.checked; }); });
      // picking an ingredient fills the name and unit; the pack size only matters for bags, tins and packets
      const ing = $('#vfIng', m), unitSel = $('#vfUnit', m);
      if (ing) ing.addEventListener('change', () => { const i = B.ingredients.find(x => x.key === ing.value); if (!i) return; if (!f.name.value) f.name.value = i.name; if (!f.nameHi.value) f.nameHi.value = i.hi; if (['kg', 'litre'].includes(unitSel.value)) unitSel.value = i.unit; packVis(); });
      const packVis = () => {
        if (!unitSel) return;
        const base = ['kg', 'litre', 'quintal', 'piece'].includes(unitSel.value);
        $('#vfPackF', m).hidden = base;
        if (base) f.packSize.value = ''; // a hidden bag size must not be saved with a per-kg item
        $('#vfPackF label', m).textContent = `Each ${unitSel.value} holds (kg / litre)`;
      };
      if (unitSel) { unitSel.addEventListener('change', packVis); packVis(); }
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(f), body = { ...Object.fromEntries(fd), photos: pics };
        delete body.kindPick;
        if (mode === 'event' && B.events) { body.events = fd.getAll('events'); body.covers = fd.getAll('covers'); } // ticked boxes as lists (none = any function)
        if (f.driver) body.driver = f.driver.checked ? '1' : '0'; // unticked boxes are not in FormData
        if (f.rental) {
          body.rental = f.rental.checked ? '1' : '0';
          if (f.rental.checked) { body.guestTiers = ''; body.events = []; body.covers = []; body.styles = ''; } // a rental piece is priced per unit, for any function
          else { delete body.units; delete body.category; delete body.size; delete body.features; }
        }
        try {
          if (isNew) await o.api(o.base + '/listings', { method: 'POST', body }); else await o.api(`${o.base}/listings/${l.id}`, { method: 'PUT', body });
          closeModal(); toast('Saved ✓'); await reload(); draw();
        } catch (err) { toast(err.message, true); }
      });
    }

    // Photo gallery: add many at once, picks the front photo (kept first), × removes.
    // box: element to draw into; list: photo URLs; onChange(list) after every change; pickFrom: other photos to reuse
    // badge: '' for plain slots (e.g. a card's back / inside pages) where no photo is "the front one"
    function gallery(box, list, onChange, { max = 10, pickFrom = [], badge = 'Front photo' } = {}) {
      let busy = false;
      const draw = () => {
        const extra = pickFrom.filter(p => !list.includes(p));
        box.innerHTML = `<div class="pg">${list.map((p, i) => `<div class="pg-item ${i || !badge ? '' : 'front'}"><img src="${h(p)}" alt="" onerror="this.style.opacity=.2">
            ${!badge ? '' : i ? `<button type="button" class="pg-star" data-gfront="${i}" title="Make this the front photo">☆ Front</button>` : `<span class="pg-badge">${badge}</span>`}
            <button type="button" class="pg-x" data-gdel="${i}" aria-label="Remove photo">×</button></div>`).join('')}
          ${list.length < max ? `<label class="pg-add ${busy ? 'busy' : ''}"><input type="file" accept="image/*" multiple data-gadd ${busy ? 'disabled' : ''}><span>${busy ? '' : '＋'}</span><small>${busy ? 'Uploading…' : list.length ? 'Add more' : 'Add photos'}</small></label>` : ''}</div>
          ${extra.length && list.length < max ? `<div class="small muted" style="margin-top:8px">Or use one of your other photos:</div><div class="pg pg-mini">${extra.map(p => `<button type="button" class="pg-item" data-gpick="${h(p)}" title="Add this photo"><img src="${h(p)}" alt=""><span class="pg-plus">＋</span></button>`).join('')}</div>` : ''}`;
      };
      const changed = () => { draw(); onChange(list.slice()); };
      box.addEventListener('click', e => {
        const f = e.target.closest('[data-gfront]'), d = e.target.closest('[data-gdel]'), p = e.target.closest('[data-gpick]');
        if (f) { list.unshift(...list.splice(+f.dataset.gfront, 1)); changed(); }
        if (d) { list.splice(+d.dataset.gdel, 1); changed(); }
        if (p && list.length < max) { list.push(p.dataset.gpick); changed(); }
      });
      box.addEventListener('change', async e => {
        const inp = e.target.closest('[data-gadd]'); if (!inp) return;
        const files = [...inp.files].slice(0, max - list.length);
        if (inp.files.length > files.length) toast(`Only ${max} photos — the first ${files.length} were added`, true);
        busy = true; draw();
        let added = 0;
        for (const file of files) {
          try { const r = await o.api(o.uploadPath, { method: 'POST', body: { dataUrl: await DOCUP.photoDataUrl(file) } }); list.push(r.url); added++; } catch (err) { toast(err.message, true); }
        }
        busy = false;
        if (added) { changed(); toast(`${added} photo${added > 1 ? 's' : ''} added ✓`); } else draw();
      });
      draw();
    }

    function upload(input, onUrl, minPx) {
      if (!input) return;
      input.addEventListener('change', async () => {
        const file = input.files[0]; if (!file) return;
        if (minPx) {
          // the profile photo fills half of every card: it must be sharp enough, and is resized so it loads fast
          const size = await new Promise(res => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([0, 0]); im.src = URL.createObjectURL(file); });
          if (Math.min(...size) < minPx) { input.value = ''; return toast(`This photo is too small (${size[0]}×${size[1]}). Use a clear photo at least ${minPx}×${minPx} — take it in good light, face in the middle.`, true); }
          if (window.DOCUP) { try { const r = await o.api(o.uploadPath, { method: 'POST', body: { dataUrl: await window.DOCUP.photoDataUrl(file) } }); onUrl(r.url); toast('Photo uploaded ✓'); } catch (e) { toast(e.message, true); } return; }
        }
        if (file.size > 5 * 1024 * 1024) return toast('Image must be under 5 MB', true);
        const rd = new FileReader();
        rd.onload = async () => { try { const r = await o.api(o.uploadPath, { method: 'POST', body: { dataUrl: rd.result } }); onUrl(r.url); toast('Photo uploaded ✓'); } catch (e) { toast(e.message, true); } };
        rd.readAsDataURL(file);
      });
    }

    function bind() {
      $$('[data-tab]', el).forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; draw(); }));
      $$('[data-sv]', el).forEach(b => b.addEventListener('click', async () => {
        const to = b.dataset.sv, body = { status: to };
        if (to === 'cancelled') { body.note = (prompt('Why is the visit cancelled? (the family sees this)') || '').trim(); if (!body.note) return; }
        if (to === 'done') body.measured = (prompt('What did you measure? e.g. 60×80 ft, slope at the back (optional)') || '').trim();
        try { B = await o.api(`${o.base}/visits/${b.dataset.svid}`, { method: 'PUT', body }); toast(to === 'confirmed' ? 'Visit fixed ✓ — call the family to tell the time' : to === 'done' ? 'Marked as measured ✓' : 'Visit cancelled'); draw(); } catch (e) { toast(e.message, true); }
      }));
      $$('[data-bs]', el).forEach(b => b.addEventListener('click', async () => {
        try { await o.api(`${o.base}/bookings/${b.dataset.b}`, { method: 'PUT', body: { status: b.dataset.bs } }); toast('Booking updated ✓'); await reload(); draw(); o.onChange && o.onChange(); } catch (e) { toast(e.message, true); }
      }));
      $$('[data-act="vf-add"]', el).forEach(b => b.addEventListener('click', () => listingForm(null, b.dataset.kind || '', !!b.dataset.rental)));
      const tmAdd = $('[data-act="tm-add"]', el); if (tmAdd) tmAdd.addEventListener('click', () => memberForm(null));
      $$('[data-tmedit]', el).forEach(b => b.addEventListener('click', () => memberForm(B.vendor.team.find(m => m.id === b.dataset.tmedit))));
      $$('[data-tmdel]', el).forEach(b => b.addEventListener('click', () => { if (confirm('Remove this artist from the team?')) save({ team: B.vendor.team.filter(m => m.id !== b.dataset.tmdel) }, 'Artist removed'); }));
      $$('[data-ledit]', el).forEach(b => b.addEventListener('click', () => listingForm(B.listings.find(l => l.id === b.dataset.ledit))));
      $$('[data-ldel]', el).forEach(b => b.addEventListener('click', async () => { if (!confirm('Delete this item?')) return; await o.api(`${o.base}/listings/${b.dataset.ldel}`, { method: 'DELETE' }); await reload(); draw(); }));
      $$('[data-lact]', el).forEach(c => c.addEventListener('change', async () => { await o.api(`${o.base}/listings/${c.dataset.lact}`, { method: 'PUT', body: { active: c.checked } }); toast('Saved ✓'); await reload(); }));
      $$('[data-stock]', el).forEach(i => i.addEventListener('change', async () => { try { await o.api(`${o.base}/listings/${i.dataset.stock}`, { method: 'PUT', body: { stock: i.value } }); toast('Stock saved ✓'); await reload(); } catch (e) { toast(e.message, true); } }));
      $$('[data-units]', el).forEach(i => i.addEventListener('change', async () => { try { await o.api(`${o.base}/listings/${i.dataset.units}`, { method: 'PUT', body: { units: i.value } }); toast('Quantity saved ✓'); await reload(); } catch (e) { toast(e.message, true); } }));
      // rental stock on a chosen date (owned / booked / left per component)
      const inv = $('#vfInvDate', el);
      if (inv) { const load = () => inventory(inv.value); inv.addEventListener('change', load); load(); }
      // Open → Booked → Closed → Open (calendar days are drawn after loading, so the click is delegated)
      $$('[data-calm]', el).forEach(b => b.addEventListener('click', () => { calMonth = addMonth(calMonth, Number(b.dataset.calm)); draw(); }));
      if (tab === 'availability') { fillCals(); $$('#vfCal0, #vfCal1', el).forEach(c => c.addEventListener('click', e => { const b = e.target.closest('[data-block]'); if (b && !b.disabled) toggleDay(b); })); }
      const toggleDay = b => {
        const d = b.dataset.block;
        const closed = new Set(B.vendor.blockedDates || []), booked = new Set(B.vendor.bookedDates || []);
        let msg;
        if (closed.has(d)) { closed.delete(d); msg = `${fmtDate(d)} is open again`; }
        else if (booked.has(d)) { booked.delete(d); closed.add(d); msg = `${fmtDate(d)} marked closed`; }
        else { booked.add(d); msg = `${fmtDate(d)} marked booked`; }
        save({ blockedDates: [...closed], bookedDates: [...booked] }, msg);
      };
      const av = $('#vfAvail', el);
      if (av) av.addEventListener('submit', e => { e.preventDefault(); const f = new FormData(av); save({ openDays: DAYS.map((_, i) => i).filter(i => f.get('d' + i)), ...(f.get('capacityPerDay') ? { capacityPerDay: f.get('capacityPerDay') } : {}), ...(f.has('advance') ? { advance: f.get('advance') } : {}) }); });
      const fresh = $('[data-act="vf-fresh"]', el); if (fresh) fresh.addEventListener('click', () => save({ stockUpdatedToday: true }, 'Stock marked as updated today ✓'));
      const pf = $('#vfProfile', el);
      if (pf) {
        // profile photos save straight away (the gallery keeps the chosen front photo first)
        const picBox = $('#vfPics', el);
        if (picBox) gallery(picBox, (B.vendor.photos || []).slice(), list => save({ photos: list }, 'Photos saved ✓'), { max: 12, pickFrom: [...new Set(B.listings.flatMap(x => x.photos || [x.photo]).filter(Boolean))] });
        const pl = $('[data-act="vf-piclink"]', el);
        if (pl) pl.addEventListener('click', () => { const u = $('#vfPicLink', el).value.trim(); if (!/^https:\/\//.test(u)) return toast('Paste a link starting with https://', true); save({ photos: [...(B.vendor.photos || []), u] }, 'Photo added ✓'); });
        upload($('#vfPP', el), url => { pf.profilePhoto.value = url; save({ profilePhoto: url }, 'Photo updated ✓'); }, 300);
        const pinBtn = $('[data-act="vf-pin"]', el), unpin = $('[data-act="vf-unpin"]', el), v = B.vendor;
        if (pinBtn && window.GEO) pinBtn.addEventListener('click', () => GEO.pick({
          title: 'Your shop / home location', intro: 'Pin where customers would come to you (or where your car / team stays). Customers only see the distance.', note: 'Customers see only how far you are, never this exact spot.',
          district: pf.district.value, pincode: pf.pincode.value, showMap: true,
          initial: v.lat != null ? { lat: v.lat, lng: v.lng, label: v.address || 'Saved location', district: v.district, pincode: v.pincode } : null,
          onPick: loc => save({ lat: loc.lat, lng: loc.lng, ...(!pf.pincode.value && loc.pincode ? { pincode: loc.pincode } : {}) }, 'Location saved ✓'),
        }));
        if (unpin) unpin.addEventListener('click', () => save({ lat: '', lng: '' }, 'Using your address – finding it on the map…'));
        pf.addEventListener('submit', e => {
          e.preventDefault();
          const f = new FormData(pf), body = Object.fromEntries(f);
          if (pf.dAvail) body.delivery = { available: pf.dAvail.checked, charge: body.dCharge, freeAbove: body.dFree };
          if (o.admin) { body.verified = pf.verified.checked; body.active = pf.active.checked; body.sample = pf.sample.checked; }
          delete body.dAvail; delete body.dCharge; delete body.dFree;
          save(body, 'Profile saved ✓');
        });
      }
      // documents
      $$('[data-docup]', el).forEach(inp => inp.addEventListener('change', async () => {
        const file = inp.files[0]; if (!file) return;
        let dataUrl;
        try { toast('Uploading…'); dataUrl = await DOCUP.toDataUrl(file); } catch (e) { toast(e.message, true); return; }
        docCall('/docs', { method: 'POST', body: { kind: inp.dataset.docup, listingId: inp.dataset.lid, dataUrl } }, `${DOCUP.KINDS[inp.dataset.docup][1]} uploaded ✓${o.admin ? '' : ' — our team will check it'}`);
      }));
      $$('[data-docview]', el).forEach(b => b.addEventListener('click', () => viewDoc(b.dataset.docview)));
      $$('[data-docok]', el).forEach(b => b.addEventListener('click', () => docCall(`/docs/${b.dataset.docok}`, { method: 'PUT', body: { status: 'ok' } }, 'Marked verified ✓')));
      $$('[data-docno]', el).forEach(b => b.addEventListener('click', () => {
        const note = prompt('Why is it rejected? The vendor sees this. (e.g. photo not clear, expired, name does not match)');
        if (note !== null) docCall(`/docs/${b.dataset.docno}`, { method: 'PUT', body: { status: 'rejected', note } }, 'Marked rejected');
      }));
      $$('[data-docdel]', el).forEach(b => b.addEventListener('click', () => { if (confirm('Remove this document?')) docCall(`/docs/${b.dataset.docdel}`, { method: 'DELETE' }, 'Document removed'); }));
      const lf = $('#vfLagan', el);
      if (lf) lf.addEventListener('submit', async e => {
        e.preventDefault();
        try {
          for (const i of $$('[data-lgp]', lf)) {
            const l = B.listings.find(x => x.id === i.dataset.lgp), val = Number(i.value) || 0;
            if (val && val < l.price) return toast(`Lagan price of ${l.name} is lower than its normal price`, true);
            if (val !== (l.laganPrice || 0)) await o.api(`${o.base}/listings/${l.id}`, { method: 'PUT', body: { laganPrice: val } });
          }
          await reload(); save({ laganPct: lf.laganPct.value }, 'Lagan prices saved ✓');
        } catch (err) { toast(err.message, true); }
      });
      const kf = $('#vfKyc', el); if (kf) kf.addEventListener('submit', e => { e.preventDefault(); save(Object.fromEntries(new FormData(kf)), 'Numbers saved ✓'); });
      $$('[data-reply]', el).forEach(f => f.addEventListener('submit', async e => { e.preventDefault(); try { await o.api(`${o.base}/reviews/${f.dataset.reply}/reply`, { method: 'POST', body: { reply: f.reply.value } }); toast('Reply saved ✓'); await reload(); } catch (err) { toast(err.message, true); } }));
    }
    draw();
  }
  // Lagan dates (one list for the whole site). Everyone sees them; canEdit = verified Pandit Ji or admin.
  // o: { api, uploadPath, canEdit, admin, me }
  async function laganEditor(box, o) {
    let L = await o.api('/api/lagan'), start = todayStr().slice(0, 7), note = '';
    const MONTHS = 3;
    const monthAdd = (m, n) => { const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
    const map = () => Object.fromEntries(L.dates.map(x => [x.date, x]));
    const call = async (path, opts, msg) => { try { L = await o.api(path, opts); if (msg) toast(msg); draw(); } catch (e) { toast(e.message, true); } };
    function cal(m, by) {
      const [y, mo] = m.split('-').map(Number), days = new Date(y, mo, 0).getDate(), pad = (new Date(y, mo - 1, 1).getDay() + 6) % 7, t = todayStr();
      return `<div class="lg-cal"><h4>${new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} <small>${L.dates.filter(x => x.date.startsWith(m)).length} lagan</small></h4>
        <div class="lg-grid">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<i>${x}</i>`).join('')}${'<span></span>'.repeat(pad)}${Array.from({ length: days }, (_, i) => {
          const ds = `${m}-${String(i + 1).padStart(2, '0')}`, x = by[ds];
          return `<button type="button" class="${x ? 'on' : ''}" data-lgday="${ds}" ${ds < t || !o.canEdit ? 'disabled' : ''} title="${x ? `Lagan${x.note ? ' · ' + h(x.note) : ''} — added by ${h(x.byName)}` : o.canEdit ? 'Tap to mark as lagan' : ''}">${i + 1}</button>`;
        }).join('')}</div></div>`;
    }
    function draw() {
      const by = map();
      box.innerHTML = `${o.canEdit ? `<div class="lg-edit-tip">You can edit: tap a date to mark / unmark it as lagan. ${o.admin ? '' : 'You can remove only the dates you added.'}
          <div class="otp-row" style="margin-top:6px"><input id="lgNote" placeholder="Note for dates you add (optional) — e.g. Margashirsha, Shubh Vivah" value="${h(note)}" maxlength="80"></div></div>` : `<p class="small muted" style="margin-top:0">Dates are added by verified Pandit Ji. <b>${L.dates.length}</b> upcoming lagan dates.</p>`}
        <div class="lg-nav"><button type="button" class="btn btn-light btn-sm" data-lgm="-1" ${start <= todayStr().slice(0, 7) ? 'disabled' : ''}>‹</button><span class="small muted">= lagan</span><button type="button" class="btn btn-light btn-sm" data-lgm="1">›</button></div>
        <div class="lg-cals">${Array.from({ length: MONTHS }, (_, i) => cal(monthAdd(start, i), by)).join('')}</div>
        ${o.canEdit ? `<details class="lg-bulk"><summary>Add many dates at once (from the lagan sheet)</summary>
          <textarea id="lgBulk" rows="3" placeholder="Type dates separated by commas or new lines, e.g. 21-11-2026, 22-11-2026, 2026-12-04"></textarea>
          <button type="button" class="btn btn-gold btn-sm" data-act="lg-bulk">Add these dates</button></details>` : ''}
        <h4 style="margin:14px 0 6px">Lagan sheet</h4>
        <div class="lagan-sheets">${L.sheets.map(s => `<div class="lg-sheet"><a href="${h(s.url)}" target="_blank" rel="noopener"><img src="${h(s.url)}" alt="${h(s.title)}"></a><span>${h(s.title)}<small>by ${h(s.byName)} · ${fmtDate(s.at)}</small></span>${o.canEdit && (o.admin || s.by === o.me) ? `<button type="button" class="btn btn-light btn-sm" data-lgsdel="${s.id}">Delete</button>` : ''}</div>`).join('') || '<p class="small muted">No lagan sheet uploaded yet.</p>'}</div>
        ${o.canEdit ? `<div class="otp-row" style="margin-top:8px"><input id="lgTitle" placeholder="Title, e.g. Lagan 2026-27 (Mithila Panchang)" maxlength="80"><label class="btn btn-gold btn-sm doc-up">Upload sheet photo<input type="file" accept="image/*" id="lgFile" hidden></label></div>` : ''}`;
    }
    box.addEventListener('click', e => {
      const m = e.target.closest('[data-lgm]'); if (m) { start = monthAdd(start, Number(m.dataset.lgm)); draw(); return; }
      const d = e.target.closest('[data-lgday]');
      if (d && o.canEdit) {
        const ds = d.dataset.lgday, x = map()[ds];
        if (x && !o.admin && x.by !== o.me) return toast(`Added by ${x.byName}. Ask the Vivah Saathi team to remove it.`, true);
        return call('/api/lagan', { method: 'PUT', body: x ? { remove: [ds] } : { add: [{ date: ds, note }] } }, x ? `${fmtDate(ds)} removed from lagan` : `${fmtDate(ds)} marked as lagan`);
      }
      if (e.target.closest('[data-act="lg-bulk"]')) {
        const dates = ($('#lgBulk', box).value.match(/\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/g) || []).map(s => {
          const p = s.split(/[-/.]/); const [y, mo, dd] = p[0].length === 4 ? p : [p[2], p[1], p[0]];
          return `${y}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        }).filter(x => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(x) && x >= todayStr());
        if (!dates.length) return toast('No future dates found. Write them like 21-11-2026', true);
        return call('/api/lagan', { method: 'PUT', body: { add: dates.map(date => ({ date, note })) } }, `${dates.length} lagan date${dates.length > 1 ? 's' : ''} added`);
      }
      const sd = e.target.closest('[data-lgsdel]');
      if (sd && confirm('Remove this lagan sheet?')) call('/api/lagan/sheets/' + sd.dataset.lgsdel, { method: 'DELETE' }, 'Sheet removed');
    });
    box.addEventListener('input', e => { if (e.target.id === 'lgNote') note = e.target.value; });
    box.addEventListener('change', async e => {
      if (e.target.id !== 'lgFile' || !e.target.files[0]) return;
      try {
        toast('Uploading…');
        if (!/^image\//.test(e.target.files[0].type)) throw new Error('Upload a photo of the lagan sheet (JPG / PNG)');
        const up = await o.api(o.uploadPath, { method: 'POST', body: { dataUrl: await DOCUP.toDataUrl(e.target.files[0]) } }); // sharper, so dates stay readable
        call('/api/lagan/sheets', { method: 'POST', body: { title: $('#lgTitle', box).value, url: up.url } }, 'Lagan sheet uploaded ✓');
      } catch (err) { toast(err.message, true); }
    });
    draw();
  }

  return { manage, laganEditor };
})();
