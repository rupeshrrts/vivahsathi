// Minimal Razorpay client (no SDK): Orders, Refunds and signature checks.
// Docs: https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/
const crypto = require('crypto');

// RAZORPAY_API_BASE only exists so the payment flow can be tested against a local mock
const API = process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com/v1';

async function request(keys, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data.error && data.error.description) || `Razorpay error (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// amount is in rupees; Razorpay wants paise
const createOrder = (keys, { amount, receipt, notes }) =>
  request(keys, 'POST', '/orders', { amount: Math.round(amount * 100), currency: 'INR', receipt: String(receipt).slice(0, 40), notes });

const refund = (keys, paymentId, amount) =>
  request(keys, 'POST', `/payments/${encodeURIComponent(paymentId)}/refund`, amount ? { amount: Math.round(amount * 100) } : {});

// what Razorpay itself says about a payment (status authorized / captured / failed / refunded, amount in paise, order_id, method)
const fetchPayment = (keys, paymentId) => request(keys, 'GET', `/payments/${encodeURIComponent(paymentId)}`);
// every payment tried against one Razorpay order (to find money that arrived while the family's browser was closed)
const orderPayments = (keys, orderId) => request(keys, 'GET', `/orders/${encodeURIComponent(orderId)}/payments`).then(r => r.items || []);
// an "authorized" payment is only money on hold until it is captured (accounts set to manual capture)
const capture = (keys, paymentId, amountPaise) => request(keys, 'POST', `/payments/${encodeURIComponent(paymentId)}/capture`, { amount: amountPaise, currency: 'INR' });

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a), 'utf8'), y = Buffer.from(String(b), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Checkout success: hmac_sha256(order_id + "|" + razorpay_payment_id, key_secret)
const verifyPayment = (keySecret, orderId, paymentId, signature) =>
  safeEqualHex(crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex'), signature);

// Webhooks: hmac_sha256(raw request body, webhook secret) in X-Razorpay-Signature
const verifyWebhook = (webhookSecret, rawBody, signature) =>
  safeEqualHex(crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex'), signature);

module.exports = { createOrder, refund, fetchPayment, orderPayments, capture, verifyPayment, verifyWebhook };
