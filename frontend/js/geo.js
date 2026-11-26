// Location: the customer's ghar / venue (nearest vendors first) and a vendor's shop / home pin.
// Three ways, all optional: type the address, use GPS, or move a pin on a map.
// The map is Google Maps when the admin saved a key (Admin → Payments & SMS OTP), else the free OpenStreetMap.
// Self-contained so the store, vendor panel and admin can all use it.
(function () {
  const KEY = 'sa_loc';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const r5 = x => Math.round(x * 1e5) / 1e5;
  const BIHAR_UP = { lat: 26.3, lng: 82.6 };

  // districts (with lat / lng) and the optional Google key; the store hands over its copy via GEO.useMeta()
  let metaP = null;
  const meta = () => metaP || (metaP = fetch('/api/meta').then(r => r.json()).catch(() => { metaP = null; return { districts: [], settings: {} }; }));
  const useMeta = m => { metaP = Promise.resolve(m); };

  // ---------- saved customer location ----------
  function get() { try { const l = JSON.parse(localStorage.getItem(KEY)); return l && isFinite(l.lat) && isFinite(l.lng) ? l : null; } catch { return null; } }
  function set(l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* storage unavailable */ } }
  function clear() { try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ } }
  const qs = (l = get()) => (l ? `lat=${l.lat}&lng=${l.lng}` : '');
  const kmText = (km, approx) => (km == null ? '' : `${approx ? '~' : ''}${km < 1 ? '<1' : km < 10 ? km.toFixed(1) : Math.round(km)} km`);
  function kmBetween(a, b) {
    const rad = x => x * Math.PI / 180, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(s));
  }
  function nearestDistrict(p, districts) {
    let best = null, bd = Infinity;
    for (const d of districts) if (d.lat != null) { const k = kmBetween(p, d); if (k < bd) { bd = k; best = d; } }
    return best;
  }

  // ---------- address search (geocoding) ----------
  const shortOsm = a => (a ? [a.village || a.hamlet || a.neighbourhood || a.suburb || a.town || a.city || a.road, a.state_district || a.county || a.city]
    .filter(Boolean).filter((x, i, arr) => arr.indexOf(x) === i).join(', ') : '');
  const osm = {
    async search(q) {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=6&accept-language=en&q=${encodeURIComponent(q)}`);
      return (await r.json()).map(x => ({ lat: +x.lat, lng: +x.lon, label: shortOsm(x.address) || x.display_name, full: x.display_name }));
    },
    async reverse(p) {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=en&lat=${p.lat}&lon=${p.lng}`);
      const x = await r.json();
      return x && x.address ? { label: shortOsm(x.address), full: x.display_name } : null;
    },
  };
  const gShort = s => s.split(',').slice(0, 2).join(',').trim();
  const google = {
    search: q => new Promise(res => new window.google.maps.Geocoder().geocode({ address: q, componentRestrictions: { country: 'IN' } },
      (r, st) => res(st === 'OK' ? r.slice(0, 6).map(x => ({ lat: x.geometry.location.lat(), lng: x.geometry.location.lng(), label: gShort(x.formatted_address), full: x.formatted_address })) : []))),
    reverse: p => new Promise(res => new window.google.maps.Geocoder().geocode({ location: p },
      (r, st) => res(st === 'OK' && r[0] ? { label: gShort(r[0].formatted_address), full: r[0].formatted_address } : null))),
  };

  // ---------- map libraries (loaded only when needed) ----------
  let gmP = null, gmBroken = false;
  function loadGoogle(key) {
    if (gmBroken) return Promise.resolve(false);
    if (window.google && window.google.maps) return Promise.resolve(true);
    return gmP || (gmP = new Promise(res => {
      window.__geoGmReady = () => res(true);
      window.gm_authFailure = () => { gmBroken = true; document.dispatchEvent(new Event('geo-google-failed')); }; // wrong / restricted key
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=__geoGmReady`;
      s.async = true; s.onerror = () => { gmBroken = true; res(false); };
      document.head.appendChild(s);
      setTimeout(() => res(!!(window.google && window.google.maps)), 10000);
    }));
  }
  let lfP = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(true);
    return lfP || (lfP = new Promise(res => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(css);
      const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload = () => res(true); s.onerror = () => { lfP = null; res(false); };
      document.head.appendChild(s);
    }));
  }
  // A map with one draggable pin; tapping the map moves the pin too
  function googleMap(el, p, zoom, onMove) {
    const g = window.google.maps;
    const map = new g.Map(el, { center: p, zoom, streetViewControl: false, mapTypeControl: false, fullscreenControl: false, gestureHandling: 'greedy' });
    const pin = new g.Marker({ position: p, map, draggable: true });
    pin.addListener('dragend', () => onMove({ lat: pin.getPosition().lat(), lng: pin.getPosition().lng() }));
    map.addListener('click', e => { pin.setPosition(e.latLng); onMove({ lat: e.latLng.lat(), lng: e.latLng.lng() }); });
    return { setPoint(q, z) { pin.setPosition(q); map.setCenter(q); if (z) map.setZoom(z); } };
  }
  function leafletMap(el, p, zoom, onMove) {
    const map = window.L.map(el).setView([p.lat, p.lng], zoom);
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    const icon = window.L.divIcon({ className: 'geo-pin', html: '📍', iconSize: [34, 34], iconAnchor: [17, 32] });
    const pin = window.L.marker([p.lat, p.lng], { draggable: true, icon }).addTo(map);
    pin.on('dragend', () => { const q = pin.getLatLng(); onMove({ lat: q.lat, lng: q.lng }); });
    map.on('click', e => { pin.setLatLng(e.latlng); onMove({ lat: e.latlng.lat, lng: e.latlng.lng }); });
    setTimeout(() => map.invalidateSize(), 50);
    return { setPoint(q, z) { pin.setLatLng([q.lat, q.lng]); map.setView([q.lat, q.lng], z || map.getZoom()); } };
  }

  // ---------- picker ----------
  async function pick(o = {}) {
    const m = await meta();
    const districts = m.districts || [];
    const gKey = ((m.settings || {}).maps || {}).googleKey || '';
    let useGoogle = !!gKey && !gmBroken;
    const geocoder = () => (useGoogle && window.google && window.google.maps ? google : osm);
    const cur = o.initial || null;
    let sel = cur && isFinite(cur.lat) ? { ...cur } : null, map = null;
    injectCss();
    const ov = document.createElement('div');
    ov.className = 'geo-bg';
    ov.innerHTML = `<div class="geo-box" role="dialog" aria-modal="true">
      <button type="button" class="geo-x" aria-label="Close">×</button>
      <h3>${esc(o.title || '📍 Shaadi ka ghar / venue')}</h3>
      <p class="geo-intro">${esc(o.intro || 'Address daalein — aapke aas paas ki gaadiyan, halwai, arkestra aur baaki vendors pehle dikhenge.')}</p>
      <button type="button" class="geo-btn geo-gps">📍 Use my current location (GPS)</button>
      <div class="geo-or"><span>ya address likhein</span></div>
      <form class="geo-form">
        <input name="addr" placeholder="Gaon / mohalla / landmark — e.g. Mairwa Bazar" value="${esc((cur && cur.address) || '')}" autocomplete="off">
        <input name="pin" placeholder="Pincode" inputmode="numeric" maxlength="6" value="${esc((cur && cur.pincode) || o.pincode || '')}" autocomplete="postal-code">
        <select name="dist"><option value="">Zila (district)</option>${districts.map(d => `<option value="${d.id}" ${(cur ? cur.district : o.district) === d.id ? 'selected' : ''}>${esc(d.name)} · ${d.state === 'Bihar' ? 'BR' : 'UP'}</option>`).join('')}</select>
        <button class="geo-btn geo-find">🔍 Find</button>
      </form>
      <div class="geo-msg" aria-live="polite"></div>
      <div class="geo-res"></div>
      <button type="button" class="geo-link geo-showmap">🗺️ Pin the exact spot on a map <small>(optional)</small></button>
      <div class="geo-map" hidden></div>
      <div class="geo-sel"></div>
      <div class="geo-foot"><button type="button" class="geo-btn geo-ok" disabled>✓ Use this location</button>${cur && o.onClear ? '<button type="button" class="geo-link geo-clear">Remove location</button>' : ''}</div>
      <p class="geo-note">${esc(o.note || 'Vendors never see your exact spot — only how far they are.')} <span class="geo-attr"></span></p>
    </div>`;
    document.body.appendChild(ov);
    const $ = s => ov.querySelector(s);
    const form = $('.geo-form'), msg = t => { $('.geo-msg').innerHTML = t; };
    const attr = () => { $('.geo-attr').textContent = useGoogle ? '· Map: Google Maps' : '· Map & search © OpenStreetMap'; };
    attr();
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); document.removeEventListener('geo-google-failed', onGFail); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    const onGFail = () => { useGoogle = false; attr(); if (map) { $('.geo-map').innerHTML = ''; map = null; showMap(); } };
    document.addEventListener('keydown', onKey);
    document.addEventListener('geo-google-failed', onGFail);
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    $('.geo-x').addEventListener('click', close);

    const distById = id => districts.find(d => d.id === id);
    function drawSel() {
      const d = sel && distById(sel.district);
      $('.geo-sel').innerHTML = sel ? `<div class="geo-chosen">📍 <b>${esc(sel.label)}</b>${d ? `<small>Zila: ${esc(d.name)}, ${esc(d.state)}</small>` : ''}${sel.approx ? '<small class="geo-approx">Approx — distance counted from the zila town. Pin it on the map for exact distance.</small>' : ''}</div>` : '';
      $('.geo-ok').disabled = !sel;
    }
    function choose(p, label, extra = {}) {
      const d = extra.district ? distById(extra.district) : nearestDistrict(p, districts);
      sel = { lat: r5(p.lat), lng: r5(p.lng), label: label || 'Pinned location', full: extra.full || '', address: form.addr.value.trim(), pincode: /^[1-9]\d{5}$/.test(form.pin.value.trim()) ? form.pin.value.trim() : '', district: d ? d.id : '', approx: !!extra.approx, src: extra.src || 'map' };
      if (d && !form.dist.value) form.dist.value = d.id;
      drawSel();
      if (map && !extra.fromMap) map.setPoint(sel, sel.approx ? 12 : 15);
    }
    // a pin moved by hand gets a readable name from the map service (best effort)
    async function nameFor(p, fallback, src) {
      choose(p, fallback, { src, fromMap: src === 'map' });
      try { const r = await geocoder().reverse(p); if (r && r.label && sel && sel.lat === r5(p.lat)) { sel.label = r.label; sel.full = r.full; drawSel(); } } catch { /* keep fallback name */ }
    }
    async function showMap() {
      const el = $('.geo-map');
      el.hidden = false; $('.geo-showmap').hidden = true;
      if (map) return;
      el.innerHTML = '<div class="geo-maploading">Loading map…</div>';
      const ok = useGoogle ? await loadGoogle(gKey) : await loadLeaflet();
      if (useGoogle && (!ok || gmBroken)) { useGoogle = false; attr(); return showMap(); }
      if (!ok) { el.innerHTML = '<div class="geo-maploading">Map could not load (no internet?). Address or GPS still works.</div>'; return; }
      el.innerHTML = '';
      const d = distById(form.dist.value);
      const start = sel || (d ? { lat: d.lat, lng: d.lng } : BIHAR_UP);
      const zoom = sel ? (sel.approx ? 12 : 15) : d ? 11 : 6;
      map = (useGoogle ? googleMap : leafletMap)(el, start, zoom, p => nameFor(p, 'Pinned location', 'map'));
      if (!sel) msg('Tap on the map or drag 📍 to your ghar / venue.');
    }
    $('.geo-showmap').addEventListener('click', showMap);
    if (o.showMap || (sel && !sel.approx)) showMap();

    $('.geo-gps').addEventListener('click', () => {
      if (!navigator.geolocation) return msg('This phone / browser cannot share location. Please type the address.');
      msg('Finding your location… allow location access if asked.');
      navigator.geolocation.getCurrentPosition(
        pos => { msg(''); $('.geo-res').innerHTML = ''; nameFor({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 'My current location', 'gps'); if (!map) showMap(); },
        err => msg(err.code === 1 ? 'Location permission was blocked. Type the address below instead (or allow location in browser settings).' : 'Could not get GPS location. Please type the address below.'),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const addr = form.addr.value.trim(), d = distById(form.dist.value), pin = form.pin.value.trim();
      if (pin && !/^[1-9]\d{5}$/.test(pin)) return msg('Pincode should be 6 digits.');
      if (!addr && !d && !pin) return msg('Type your gaon / mohalla, pincode or choose the zila.');
      const typed = [addr, d && d.name.replace(/\s*\(.*\)/, ''), pin].filter(Boolean).join(', ');
      if (!addr && !pin) { $('.geo-res').innerHTML = ''; msg(''); return choose(d, d.name, { district: d.id, approx: true, src: 'district' }); }
      msg('Searching…'); $('.geo-res').innerHTML = '';
      let list = [];
      const dName = d && d.name.replace(/\s*\(.*\)/, '');
      try { list = await geocoder().search([addr, dName, pin, d ? d.state : '', 'India'].filter(Boolean).join(', ')); } catch { /* offline or blocked */ }
      // village names are often missing on the map: fall back to the pincode area
      if (!list.length && pin && addr) { try { list = (await geocoder().search(`${pin}, India`)).slice(0, 3); } catch { /* offline */ } }
      // keep matches near the chosen zila (same name can exist in other states)
      if (d) list = list.filter(x => kmBetween(x, d) < 90);
      if (!list.length) {
        if (d) { msg('Exact place not found on the map — distance will be counted from the zila town. You can pin the exact spot on the map below.'); return choose(d, typed, { district: d.id, approx: true, src: 'address' }); }
        return msg('Not found. Choose the zila too, or use GPS / the map.');
      }
      msg(list.length > 1 ? 'Choose the right place:' : '');
      if (list.length === 1) return choose(list[0], typed, { full: list[0].full, src: 'address' });
      $('.geo-res').innerHTML = list.map((x, i) => `<button type="button" data-i="${i}">📍 ${esc(x.full)}</button>`).join('');
      $('.geo-res').onclick = ev => {
        const b = ev.target.closest('[data-i]'); if (!b) return;
        const x = list[+b.dataset.i];
        $$res().forEach(y => y.classList.toggle('on', y === b));
        choose(x, typed, { full: x.full, src: 'address' });
      };
    });
    const $$res = () => [...ov.querySelectorAll('.geo-res button')];

    $('.geo-ok').addEventListener('click', () => { if (!sel) return; close(); if (o.onPick) o.onPick(sel); });
    if ($('.geo-clear')) $('.geo-clear').addEventListener('click', () => { close(); o.onClear(); });
    drawSel();
    setTimeout(() => form.addr.focus(), 50);
  }

  let cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    const st = document.createElement('style');
    st.textContent = `
.geo-bg{position:fixed;inset:0;background:rgba(30,10,18,.55);z-index:3000;display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow:auto}
.geo-box{position:relative;background:#fff;border-radius:16px;width:100%;max-width:560px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:inherit;color:#2a1a20}
.geo-box h3{margin:0 0 4px;font-size:20px}
.geo-intro{margin:0 0 14px;color:#6b5a60;font-size:14px}
.geo-x{position:absolute;top:10px;right:12px;border:0;background:#f4eef0;width:34px;height:34px;border-radius:50%;font-size:22px;cursor:pointer;line-height:1}
.geo-btn{border:0;border-radius:10px;padding:11px 16px;font:600 14px inherit;font-family:inherit;cursor:pointer;background:#7a1031;color:#fff}
.geo-btn:disabled{opacity:.45;cursor:not-allowed}
.geo-gps{width:100%;background:#fff6e0;color:#7a1031;border:1.5px solid #f2c14e}
.geo-or{display:flex;align-items:center;gap:10px;margin:14px 0 10px;color:#9a8a90;font-size:12px}
.geo-or:before,.geo-or:after{content:"";flex:1;height:1px;background:#eee2e6}
.geo-form{display:grid;grid-template-columns:1fr 1fr auto;gap:8px}
.geo-form input[name=addr]{grid-column:1/-1}
.geo-form input,.geo-form select{border:1.5px solid #e7dbe0;border-radius:10px;padding:10px 12px;font:14px inherit;font-family:inherit;min-width:0;background:#fff}
.geo-msg{font-size:13px;color:#6b5a60;margin:8px 0 0;min-height:4px}
.geo-res{display:grid;gap:6px;margin-top:8px;max-height:210px;overflow:auto}
.geo-res button{text-align:left;border:1.5px solid #eee2e6;background:#fff;border-radius:10px;padding:8px 10px;font:13px inherit;font-family:inherit;cursor:pointer}
.geo-res button:hover,.geo-res button.on{border-color:#7a1031;background:#fbf3f6}
.geo-link{border:0;background:none;color:#7a1031;font:600 14px inherit;font-family:inherit;cursor:pointer;padding:10px 0 4px;text-decoration:underline}
.geo-link small{color:#9a8a90;font-weight:500}
.geo-map{height:280px;border-radius:12px;overflow:hidden;margin-top:10px;border:1.5px solid #eee2e6;background:#f6f1f3}
.geo-maploading{display:flex;align-items:center;justify-content:center;height:100%;color:#7a6a70;font-size:13px;padding:12px;text-align:center}
.geo-pin{font-size:30px;line-height:34px;text-align:center;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35));background:none;border:0}
.geo-chosen{margin-top:12px;background:#f2fbf4;border:1.5px solid #bfe6c8;border-radius:12px;padding:10px 12px;font-size:14px}
.geo-chosen small{display:block;color:#5d6b60;margin-top:2px}
.geo-chosen .geo-approx{color:#9a6a10}
.geo-foot{display:flex;align-items:center;gap:16px;margin-top:14px;flex-wrap:wrap}
.geo-foot .geo-link{padding:0}
.geo-note{font-size:12px;color:#9a8a90;margin:12px 0 0}
@media (max-width:560px){.geo-form{grid-template-columns:110px 1fr}.geo-form .geo-find{grid-column:1/-1}.geo-box{padding:16px}.geo-map{height:240px}}`;
    document.head.appendChild(st);
  }

  window.GEO = { get, set, clear, qs, kmText, kmBetween, nearestDistrict, pick, meta, useMeta };
})();
