/* Vendor Panel: vendors log in with their mobile number (OTP or password) and manage their own listing */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inr = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const fmtDate = d => d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const ph = (src, emoji, bg, cls = '') => `<div class="ph ${cls}" style="background:${h(bg || '#f6eef0')}">${h(emoji || '🎁')}${src ? `<img src="${h(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>`;
const store = {
  get(k, d) { try { const v = localStorage.getItem('sa_vendor_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sa_vendor_' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
let token = store.get('token', null);

async function api(path, opts = {}) {
  const res = await fetch(path, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (opts.blob && res.ok) return res.blob(); // own documents
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token && !path.includes('/auth/')) { token = null; store.set('token', null); loginPage(); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
function toast(msg, isErr) { const t = document.createElement('div'); t.className = 'toast' + (isErr ? ' err' : ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200); }
function modal(html, width = 760) {
  closeModal();
  const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.id = 'modalBg';
  bg.innerHTML = `<div class="modal" style="max-width:${width}px"><button class="modal-x" aria-label="Close">×</button><div class="a-modal">${html}</div></div>`;
  $('.modal-x', bg).addEventListener('click', closeModal);
  bg.addEventListener('mousedown', e => { if (e.target === bg) closeModal(); });
  document.body.appendChild(bg); return bg;
}
function closeModal() { const m = $('#modalBg'); if (m) m.remove(); }

function loginPage(msg) {
  $('#root').innerHTML = `<div class="login-page"><div class="login-card">
    <img src="/img/logo.svg" alt="" width="64" height="64" style="display:block;margin:0 auto 6px"><h1>Vendor Panel</h1><p class="muted" style="margin-top:0">Vivah Saathi – manage your bookings, prices and availability</p>
    ${msg ? `<div class="err">${h(msg)}</div>` : ''}<div class="err hide" id="vErr"></div>
    <form id="vOtp"><div class="field"><label>Registered mobile number</label><div class="otp-row"><span class="cc">+91</span><input name="phone" inputmode="numeric" maxlength="10" required><button type="button" class="btn btn-primary btn-sm" id="vSend">Send OTP</button></div></div>
      <div id="vStep2" class="hide"><div class="field"><label>6-digit OTP</label><input name="otp" class="otp-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div><button class="btn btn-gold btn-block">Verify & Login</button></div></form>
    <details style="margin-top:14px"><summary class="link small">Login with password instead</summary>
      <form id="vPw" style="margin-top:10px"><div class="field"><label>Mobile number</label><input name="phone" inputmode="numeric" maxlength="10" required></div><div class="field"><label>Password</label><input name="password" type="password" required></div><button class="btn btn-primary btn-block">Login</button></form></details>
    <p class="small muted" style="text-align:center;margin-bottom:0">Not registered yet? <a class="link" href="/#/vendor-join">Join as Vendor / Artist</a></p></div></div>`;
  const err = m => { $('#vErr').textContent = m; $('#vErr').classList.toggle('hide', !m); };
  $('#vSend').addEventListener('click', async () => {
    err('');
    try { const r = await api('/api/auth/otp/send', { method: 'POST', body: { phone: $('#vOtp').phone.value.trim() } }); $('#vStep2').classList.remove('hide'); toast(r.testMode ? 'Test mode: OTP is printed in the server window' : 'OTP sent by SMS'); }
    catch (e) { err(e.message); }
  });
  const done = async r => { token = r.token; store.set('token', token); await start(); };
  $('#vOtp').addEventListener('submit', async e => { e.preventDefault(); err(''); try { done(await api('/api/auth/otp/verify', { method: 'POST', body: { phone: e.target.phone.value.trim(), otp: e.target.otp.value.trim() } })); } catch (x) { err(x.message); } });
  $('#vPw').addEventListener('submit', async e => { e.preventDefault(); err(''); try { done(await api('/api/auth/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) })); } catch (x) { err(x.message); } });
}

async function start() {
  let who;
  try { who = await api('/api/vendor/whoami'); } catch (e) { token = null; store.set('token', null); return loginPage(e.message); }
  const meta = await api('/api/meta');
  $('#root').innerHTML = `<div class="vp-top"><div class="a-brand" style="border:0;padding:0"><div class="logo-mark"><img src="/img/logo-mark.svg" alt=""></div><div><b style="color:var(--maroon)">Vendor Panel</b><small style="color:var(--muted)">${h(who.user.name)} · ${h(who.user.phone)}</small></div></div>
      <div style="display:flex;gap:8px"><button class="btn btn-light btn-sm" id="vRefresh">↻ Refresh</button><button class="btn btn-light btn-sm" id="vOut">Logout</button></div></div>
    <div class="a-body" style="max-width:1150px;margin:0 auto">${who.verified ? '' : '<div class="err" style="background:#fff4d6;color:#8a5a00">Your listing is waiting for verification by the Vivah Saathi team. You can already add your items and prices.</div>'}<div id="vfRoot"><div class="spinner"></div></div></div>`;
  const mount = () => VF.manage($('#vfRoot'), { api, base: '/api/vendor/me', uploadPath: '/api/vendor/upload', districts: meta.districts, admin: false });
  $('#vOut').addEventListener('click', async () => { try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ } token = null; store.set('token', null); loginPage(); });
  $('#vRefresh').addEventListener('click', mount);
  mount();
}

(async () => { if (!token) return loginPage(); try { await start(); } catch { loginPage(); } })();
