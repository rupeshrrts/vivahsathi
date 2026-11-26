// Location helpers: district headquarters coordinates (Bihar & UP) and straight-line distance.
// Vendors can pin their exact shop / home; without a pin they count from their district HQ.

const DISTRICT_GEO = {
  // Bihar
  'br-araria': [26.15, 87.47], 'br-arwal': [25.25, 84.68], 'br-aurangabad': [24.75, 84.37], 'br-banka': [24.89, 86.92],
  'br-begusarai': [25.42, 86.13], 'br-bhagalpur': [25.25, 87.01], 'br-bhojpur': [25.56, 84.66], 'br-buxar': [25.56, 83.98],
  'br-darbhanga': [26.15, 85.9], 'br-east-champaran': [26.65, 84.92], 'br-gaya': [24.8, 85.0], 'br-gopalganj': [26.47, 84.44],
  'br-jamui': [24.92, 86.22], 'br-jehanabad': [25.21, 84.99], 'br-kaimur': [25.04, 83.61], 'br-katihar': [25.54, 87.57],
  'br-khagaria': [25.5, 86.48], 'br-kishanganj': [26.1, 87.95], 'br-lakhisarai': [25.17, 86.09], 'br-madhepura': [25.92, 86.79],
  'br-madhubani': [26.35, 86.07], 'br-munger': [25.37, 86.47], 'br-muzaffarpur': [26.12, 85.39], 'br-nalanda': [25.2, 85.52],
  'br-nawada': [24.88, 85.54], 'br-patna': [25.59, 85.14], 'br-purnia': [25.78, 87.47], 'br-rohtas': [24.95, 84.03],
  'br-saharsa': [25.88, 86.6], 'br-samastipur': [25.86, 85.78], 'br-saran': [25.78, 84.73], 'br-sheikhpura': [25.14, 85.85],
  'br-sheohar': [26.51, 85.29], 'br-sitamarhi': [26.59, 85.49], 'br-siwan': [26.22, 84.36], 'br-supaul': [26.12, 86.6],
  'br-vaishali': [25.69, 85.21], 'br-west-champaran': [26.8, 84.5],
  // Uttar Pradesh
  'up-agra': [27.18, 78.01], 'up-aligarh': [27.88, 78.08], 'up-ambedkar-nagar': [26.43, 82.54], 'up-amethi': [26.21, 81.69],
  'up-amroha': [28.9, 78.47], 'up-auraiya': [26.47, 79.51], 'up-ayodhya': [26.79, 82.2], 'up-azamgarh': [26.07, 83.18],
  'up-baghpat': [28.94, 77.22], 'up-bahraich': [27.57, 81.6], 'up-ballia': [25.76, 84.15], 'up-balrampur': [27.43, 82.18],
  'up-banda': [25.48, 80.33], 'up-barabanki': [26.93, 81.19], 'up-bareilly': [28.37, 79.43], 'up-basti': [26.8, 82.73],
  'up-bhadohi': [25.39, 82.57], 'up-bijnor': [29.37, 78.14], 'up-budaun': [28.04, 79.13], 'up-bulandshahr': [28.41, 77.85],
  'up-chandauli': [25.26, 83.27], 'up-chitrakoot': [25.2, 80.9], 'up-deoria': [26.5, 83.78], 'up-etah': [27.56, 78.66],
  'up-etawah': [26.78, 79.02], 'up-farrukhabad': [27.39, 79.58], 'up-fatehpur': [25.93, 80.81], 'up-firozabad': [27.15, 78.4],
  'up-gautam-buddha-nagar': [28.54, 77.39], 'up-ghaziabad': [28.67, 77.45], 'up-ghazipur': [25.58, 83.58], 'up-gonda': [27.13, 81.96],
  'up-gorakhpur': [26.76, 83.37], 'up-hamirpur': [25.95, 80.15], 'up-hapur': [28.73, 77.78], 'up-hardoi': [27.4, 80.13],
  'up-hathras': [27.6, 78.05], 'up-jalaun': [25.99, 79.45], 'up-jaunpur': [25.75, 82.69], 'up-jhansi': [25.45, 78.57],
  'up-kannauj': [27.06, 79.92], 'up-kanpur-dehat': [26.42, 79.97], 'up-kanpur-nagar': [26.45, 80.33], 'up-kasganj': [27.81, 78.65],
  'up-kaushambi': [25.53, 81.38], 'up-kushinagar': [26.9, 83.98], 'up-lakhimpur-kheri': [27.95, 80.78], 'up-lalitpur': [24.69, 78.42],
  'up-lucknow': [26.85, 80.95], 'up-maharajganj': [27.13, 83.56], 'up-mahoba': [25.29, 79.87], 'up-mainpuri': [27.23, 79.02],
  'up-mathura': [27.49, 77.67], 'up-mau': [25.94, 83.56], 'up-meerut': [28.98, 77.71], 'up-mirzapur': [25.15, 82.57],
  'up-moradabad': [28.84, 78.77], 'up-muzaffarnagar': [29.47, 77.7], 'up-pilibhit': [28.63, 79.8], 'up-pratapgarh': [25.9, 81.94],
  'up-prayagraj': [25.44, 81.85], 'up-raebareli': [26.23, 81.23], 'up-rampur': [28.8, 79.03], 'up-saharanpur': [29.96, 77.55],
  'up-sambhal': [28.58, 78.57], 'up-sant-kabir-nagar': [26.77, 83.07], 'up-shahjahanpur': [27.88, 79.91], 'up-shamli': [29.45, 77.31],
  'up-shravasti': [27.71, 81.93], 'up-siddharthnagar': [27.25, 83.1], 'up-sitapur': [27.57, 80.68], 'up-sonbhadra': [24.69, 83.07],
  'up-sultanpur': [26.26, 82.07], 'up-unnao': [26.55, 80.49], 'up-varanasi': [25.32, 82.97],
};

const districtGeo = id => { const p = DISTRICT_GEO[id]; return p ? { lat: p[0], lng: p[1] } : null; };

// Accepts any point inside India; anything else is ignored
function validPoint(lat, lng) {
  lat = Number(lat); lng = Number(lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 37.5 && lng >= 68 && lng <= 98 ? { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 } : null;
}

// Great-circle distance in km
function kmBetween(a, b) {
  const rad = x => x * Math.PI / 180, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(s));
}

// Address / pincode → map point, using OpenStreetMap's free Nominatim service (one request per second, as its rules ask).
// Returns null when offline, not found, or turned off with NO_GEOCODE=1.
let queue = Promise.resolve();
const pause = ms => new Promise(r => setTimeout(r, ms));
async function nominatim(params) {
  const r = await fetch('https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ format: 'jsonv2', countrycodes: 'in', limit: '1', ...params }),
    { headers: { 'User-Agent': 'VivahSaathi/1.0 (wedding vendor marketplace)', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(8000) });
  const list = await r.json();
  return list[0] ? validPoint(list[0].lat, list[0].lon) : null;
}
function geocodeAddress({ address, pincode, district, state }) {
  if (process.env.NO_GEOCODE || typeof fetch !== 'function') return Promise.resolve(null);
  const job = queue.then(async () => {
    const tries = [];
    if (address) tries.push({ q: [address, district, pincode, state, 'India'].filter(Boolean).join(', ') });
    if (pincode) tries.push({ postalcode: pincode });
    for (const t of tries) {
      try { const p = await nominatim(t); await pause(1100); if (p) return p; } catch { await pause(1100); }
    }
    return null;
  });
  queue = job.catch(() => null);
  return job;
}

module.exports = { DISTRICT_GEO, districtGeo, validPoint, kmBetween, geocodeAddress };
