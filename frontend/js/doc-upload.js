// Vehicle papers (driving licence, RC, insurance...): names, and turning a chosen file into an upload.
// Phone photos are shrunk to ~1600px JPEG so a 4 MB camera photo becomes ~300 KB; PDFs go as they are (max 3 MB).
// Shared by the store (Join as Vendor), the Vendor Panel and Admin.
(function () {
  // [icon, name, hint shown under the upload box]
  const KINDS = {
    id: ['🆔', 'ID proof', 'Masked Aadhaar, Voter ID, Passport or Driving licence'],
    pan: ['💳', 'PAN card', 'Needed only if payments are sent to you by the site'],
    gst: ['🧾', 'GST certificate', 'Only if your business has GST'],
    fssai: ['🍲', 'FSSAI licence / registration', 'Food safety registration (foscos.fssai.gov.in)'],
    shop: ['🏪', 'Shop / trade licence or Udyam', 'Any one: shop licence, trade licence, Udyam certificate'],
    venue: ['🏛️', 'Hall ownership / rent papers', 'Registry, lease or rent agreement'],
    fire: ['🧯', 'Fire NOC', 'Fire safety certificate of the hall'],
    team: ['👥', 'Team ID & age proofs', 'ID / age proof of every performer (all must be 18+) — one PDF or photo'],
    police: ['👮', 'Police verification', 'Character / police verification certificate'],
    dl: ['🪪', 'Driving licence', 'Front side, clearly readable'],
    rc: ['📄', 'RC (registration certificate)', 'Of this vehicle'],
    insurance: ['🛡️', 'Insurance', 'Valid insurance of this vehicle'],
    puc: ['🌿', 'Pollution (PUC)', 'Pollution under control certificate'],
    permit: ['🧾', 'Taxi / commercial permit', 'If the vehicle has a yellow number plate'],
  };
  // shown wherever ID proof is asked
  const AADHAAR_TIP = 'ID: Voter ID, Passport, Driving licence or <b>masked Aadhaar</b> (last 4 digits only).';
  const CAR_DOCS = ['rc', 'insurance', 'puc', 'permit'];
  const PDF_MAX = 3 * 1024 * 1024;
  const readAs = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Could not read the file')); r.readAsDataURL(file); });

  // any phone photo → JPEG no bigger than `max` px on its longest side
  async function shrink(file, max, quality) {
    if (!/^image\//.test(file.type)) throw new Error('Choose a photo (JPG / PNG)');
    const src = await readAs(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('This photo could not be opened. Try JPG or PNG.')); i.src = src; });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); // transparent PNGs get a white page
    g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  }
  async function toDataUrl(file) {
    if (!file) throw new Error('Choose a file');
    if (file.type === 'application/pdf') {
      if (file.size > PDF_MAX) throw new Error('PDF must be under 3 MB — or upload a photo of the paper instead');
      return readAs(file);
    }
    if (!/^image\//.test(file.type)) throw new Error('Upload a photo (JPG / PNG) or a PDF');
    return shrink(file, 1600, 0.82); // papers: sharp enough to read
  }
  // shop / car / team photos shown on the site: ~1280px, ~150–300 KB
  const photoDataUrl = file => shrink(file, 1280, 0.8);

  const label = k => (KINDS[k] ? KINDS[k][1] : k);
  const STATUS = { pending: ['⏳', 'Being checked', 'st-placed'], ok: ['✓', 'Verified', 'st-delivered'], rejected: ['✗', 'Rejected – upload again', 'st-cancelled'] };
  window.DOCUP = { KINDS, CAR_DOCS, AADHAAR_TIP, toDataUrl, photoDataUrl, label, STATUS, MAX_PHOTOS: 12 };
})();
