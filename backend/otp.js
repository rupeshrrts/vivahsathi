// SMS OTP: generation, rate limits, verification and delivery.
// OTPs are kept in memory only (hashed) and expire after 5 minutes.
const crypto = require('crypto');

const TTL = 5 * 60 * 1000, RESEND_GAP = 30 * 1000, MAX_PER_HOUR = 5, MAX_ATTEMPTS = 5, MAX_IP_PER_HOUR = 30;
const codes = new Map();   // phone -> { hash, exp, attempts }
const sends = new Map();   // phone -> [timestamps]
const ipSends = new Map(); // ip -> [timestamps]

const recent = (map, key) => (map.get(key) || []).filter(t => Date.now() - t < 3600e3);
const hashOf = (pepper, phone, code) => crypto.createHash('sha256').update(`${pepper}:${phone}:${code}`).digest('hex');

// Returns { wait } in seconds if the caller must slow down
function checkLimits(phone, ip) {
  const p = recent(sends, phone), i = recent(ipSends, ip);
  const last = p[p.length - 1];
  if (last && Date.now() - last < RESEND_GAP) return { wait: Math.ceil((RESEND_GAP - (Date.now() - last)) / 1000) };
  if (p.length >= MAX_PER_HOUR || i.length >= MAX_IP_PER_HOUR) return { wait: 3600, blocked: true };
  return null;
}

async function deliver(sms, phone, code) {
  const provider = sms.provider || 'console';
  if (provider === 'console') {
    console.log(`\n  [OTP – test mode] ${phone}: ${code}\n`);
    return;
  }
  if (provider === 'fast2sms') {
    if (!sms.apiKey) throw new Error('Fast2SMS API key is not set');
    // https://www.fast2sms.com/otp-sms – OTP route, key in query for GET
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(sms.apiKey)}&route=otp&variables_values=${code}&flash=0&numbers=${phone}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.return === false) throw new Error(`Fast2SMS: ${(data.message && [].concat(data.message).join(' ')) || 'HTTP ' + res.status}`);
    return;
  }
  if (provider === 'custom') {
    if (!sms.urlTemplate || !sms.urlTemplate.includes('{otp}')) throw new Error('Custom SMS URL must contain {otp}');
    const url = sms.urlTemplate.replace(/\{phone\}/g, phone).replace(/\{otp\}/g, code);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SMS provider returned HTTP ${res.status}`);
    return;
  }
  throw new Error('Unknown SMS provider');
}

async function send({ phone, ip, pepper, sms }) {
  const limit = checkLimits(phone, ip);
  if (limit) return limit;
  const code = String(crypto.randomInt(100000, 1000000));
  await deliver(sms, phone, code);
  codes.set(phone, { hash: hashOf(pepper, phone, code), exp: Date.now() + TTL, attempts: 0 });
  sends.set(phone, [...recent(sends, phone), Date.now()]);
  ipSends.set(ip, [...recent(ipSends, ip), Date.now()]);
  return { ok: true, resendIn: RESEND_GAP / 1000 };
}

// Returns true / false; wrong codes count against MAX_ATTEMPTS
function verify({ phone, code, pepper }) {
  const rec = codes.get(phone);
  if (!rec || Date.now() > rec.exp) { codes.delete(phone); return { ok: false, error: 'OTP expired. Please request a new one.' }; }
  if (rec.attempts >= MAX_ATTEMPTS) { codes.delete(phone); return { ok: false, error: 'Too many wrong attempts. Please request a new OTP.' }; }
  const a = Buffer.from(rec.hash), b = Buffer.from(hashOf(pepper, phone, String(code).trim()));
  if (!crypto.timingSafeEqual(a, b)) { rec.attempts++; return { ok: false, error: `Wrong OTP. ${MAX_ATTEMPTS - rec.attempts} attempts left.` }; }
  codes.delete(phone);
  return { ok: true };
}

module.exports = { send, verify, deliver };
