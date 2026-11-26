// GST tax invoices and credit notes.
// Prices on the site include GST, so each line's taxable value and tax are worked back from what the customer pays:
// taxable = amount × 100 / (100 + rate). Seller and place of supply in the same state → CGST + SGST (half each);
// different states → IGST. Rates and HSN / SAC codes come from Admin (the category, or the product itself) —
// set them with your CA; nothing here guesses a rate. An invoice is frozen once issued (numbers never change).

// rates the admin can pick (%). 0 = exempt / nil-rated
const RATES = [0, 0.25, 3, 5, 12, 18, 28, 40];

// GST state codes (first two digits of a GSTIN)
const STATE_CODES = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi',
  '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands', '36': 'Telangana',
  '37': 'Andhra Pradesh', '38': 'Ladakh',
};
const codeOfState = name => Object.keys(STATE_CODES).find(k => STATE_CODES[k].toLowerCase() === String(name || '').toLowerCase()) || '';

// GSTIN: 2-digit state code, PAN, entity number, 'Z', check character (mod-36 checksum — catches most typos)
const G36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function validGstin(g) {
  g = String(g || '').toUpperCase().trim();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g) || !STATE_CODES[g.slice(0, 2)]) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) { const p = G36.indexOf(g[i]) * (i % 2 ? 2 : 1); sum += Math.floor(p / 36) + (p % 36); }
  return G36[(36 - (sum % 36)) % 36] === g[14];
}
const validHsn = v => /^\d{4}(\d{2}){0,2}$/.test(String(v || '')); // 4, 6 or 8 digits (SAC codes are 6 digits, starting 99)

const r2 = v => Math.round((v + Number.EPSILON) * 100) / 100;

// India's financial year (April–March) of an India date "YYYY-MM-DD" → "26-27"
function fyOf(day) { const y = Number(day.slice(0, 4)), s = Number(day.slice(5, 7)) >= 4 ? y : y - 1; return `${String(s).slice(2)}-${String(s + 1).slice(2)}`; }

// one tax line from what the customer pays for it (GST included)
function taxLine(amount, rate, inter) {
  const taxable = r2(amount * 100 / (100 + rate)), tax = r2(amount - taxable), half = r2(tax / 2);
  return { taxable, igst: inter ? tax : 0, cgst: inter ? 0 : half, sgst: inter ? 0 : r2(tax - half), amount: r2(amount) };
}
const sumOf = (lines, k) => r2(lines.reduce((a, l) => a + (l[k] || 0), 0));
const totalsOf = lines => ({ taxable: sumOf(lines, 'taxable'), cgst: sumOf(lines, 'cgst'), sgst: sumOf(lines, 'sgst'), igst: sumOf(lines, 'igst'), amount: sumOf(lines, 'amount') });

// rupees in words, Indian style: "Rupees Thirty Five Thousand Five Hundred Thirty Nine and Fifty Paise Only"
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = n => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''));
const three = n => [n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' : '', two(n % 100)].filter(Boolean).join(' ');
function numWords(n) {
  const parts = [];
  if (n >= 1e7) { parts.push(numWords(Math.floor(n / 1e7)) + ' Crore'); n %= 1e7; } // 100+ crore: "One Hundred Crore"
  for (const [size, name] of [[1e5, 'Lakh'], [1e3, 'Thousand']]) if (n >= size) { parts.push(two(Math.floor(n / size)) + ' ' + name); n %= size; }
  if (n) parts.push(three(n));
  return parts.join(' ');
}
function inWords(amount) {
  const rupees = Math.floor(r2(amount)), paise = Math.round(r2(amount - rupees) * 100);
  return `Rupees ${numWords(rupees) || 'Zero'}${paise ? ` and ${two(paise)} Paise` : ''} Only`;
}

// The invoice for an order. lineQty[k] = how many of order line k were supplied (short / damaged at delivery and
// items already back are left out); gstOf(item) = { rate, hsn } (rate null = not set). Returns { invoice } or { error }.
function buildInvoice(o, { seller, number, date, gstOf, lineQty }) {
  const sellerCode = seller.gstin.slice(0, 2), posCode = codeOfState(o.address.state);
  if (!posCode) return { error: `Unknown state "${o.address.state}" for the place of supply` };
  const inter = sellerCode !== posCode, lines = [], missing = [];
  for (const [k, i] of o.items.entries()) {
    const qty = lineQty[k] ?? i.qty;
    if (qty <= 0) continue;
    const g = gstOf(i);
    if (g.rate == null) { missing.push(i.name); continue; }
    lines.push({ line: k, name: i.name, hsn: g.hsn || '', unit: i.unit || '', qty, price: i.price, rate: g.rate, ...taxLine(i.price * qty, g.rate, inter) });
  }
  if (missing.length) return { error: `Set the GST rate (Admin → Categories or Products) for: ${[...new Set(missing)].join(', ')}` };
  // delivery is part of supplying the goods (a composite supply): taxed like the main item — the highest rate among the goods
  if (o.delivery > 0 && lines.length) {
    const main = lines.filter(l => (o.items[l.line] || {}).type === 'product').sort((a, b) => b.rate - a.rate)[0] || lines[0];
    lines.push({ line: -1, name: 'Delivery charges', hsn: main.hsn, unit: '', qty: 1, price: o.delivery, rate: main.rate, ...taxLine(o.delivery, main.rate, inter) });
  }
  if (!lines.length) return { error: 'Nothing on this order to invoice' };
  const b = o.buyer || {};
  return { invoice: {
    number, date, orderNumber: o.number, inter,
    seller: { name: seller.legalName, brand: seller.brand, gstin: seller.gstin, address: seller.address, state: STATE_CODES[sellerCode], stateCode: sellerCode, phone: seller.phone, email: seller.email },
    buyer: { name: b.name || o.address.name, gstin: b.gstin || '', phone: o.address.phone, address: [o.address.line1, o.address.landmark, o.address.city, o.address.districtName].filter(Boolean).join(', '), pincode: o.address.pincode || '', state: o.address.state, stateCode: posCode },
    placeOfSupply: `${o.address.state} (${posCode})`, reverseCharge: 'No',
    lines, totals: totalsOf(lines), words: inWords(totalsOf(lines).amount),
  } };
}

// A credit note against an invoice: the given lines (invoice line + qty) come back, at the invoice's own rates
function buildCreditNote(inv, { number, date, reason, ref, items }) {
  const lines = [];
  for (const { line, qty, amount } of items) {
    const il = inv.lines.find(l => l.line === line);
    if (!il || qty <= 0) continue;
    const amt = amount != null ? amount : il.price * qty;
    lines.push({ line, name: il.name, hsn: il.hsn, unit: il.unit, qty, price: il.price, rate: il.rate, ...taxLine(amt, il.rate, inv.inter) });
  }
  if (!lines.length) return null;
  return { number, date, against: inv.number, againstDate: inv.date, reason, ref: ref || '', placeOfSupply: inv.placeOfSupply, inter: inv.inter, lines, totals: totalsOf(lines), words: inWords(totalsOf(lines).amount) };
}

module.exports = { RATES, STATE_CODES, codeOfState, validGstin, validHsn, fyOf, taxLine, totalsOf, inWords, buildInvoice, buildCreditNote, r2 };
