-- Vivah Saathi — complete database schema (PostgreSQL / Supabase). The one SQL file for the project.
-- The app currently keeps the same data in database/data/db.json; `npm run export-sql` writes this schema
-- plus every record as INSERTs into database/export.sql, ready to run in the Supabase SQL editor (or psql).
-- Money = whole rupees (INTEGER). Dates = DATE, timestamps = TIMESTAMPTZ. Small lists / objects = JSONB.
-- Login sessions, OTP codes and API keys / secrets are never stored here.

-- ======================= site =======================
CREATE TABLE IF NOT EXISTS settings (
  key            TEXT PRIMARY KEY,                 -- siteName, advancePercent, returnDays, refundDays, otpRequired…
  value          JSONB NOT NULL
);

-- running numbers, so new orders / bookings continue after the last one (order → SA1012, vbooking → VB5016…)
CREATE TABLE IF NOT EXISTS counters (
  name           TEXT PRIMARY KEY,                 -- order | vbooking | visit…
  value          INTEGER NOT NULL
);

-- admin dashboard: visits, product views, carts, checkouts and orders per day (India date)
CREATE TABLE IF NOT EXISTS site_analytics (
  day            DATE PRIMARY KEY,
  visits         INTEGER NOT NULL DEFAULT 0,
  views          INTEGER NOT NULL DEFAULT 0,
  carts          INTEGER NOT NULL DEFAULT 0,
  checkouts      INTEGER NOT NULL DEFAULT 0,
  orders         INTEGER NOT NULL DEFAULT 0,
  vbookings      INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS product_stats (
  product_id     TEXT PRIMARY KEY,
  views          INTEGER NOT NULL DEFAULT 0,
  carts          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS districts (
  id             TEXT PRIMARY KEY,                 -- e.g. br-patna
  name           TEXT NOT NULL,
  state          TEXT NOT NULL,                    -- Bihar | Uttar Pradesh
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  extra_charge   INTEGER NOT NULL DEFAULT 0,
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION
);

-- ======================= accounts: sign up / sign in / admin =======================
-- Customers sign up and sign in with mobile + OTP or password; admins with password.
-- password_hash = scrypt "salt:hash" (never plain text). Vendors log in through a linked user (vendor_id).
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL UNIQUE,             -- 10-digit mobile = sign-in id
  email          TEXT,
  role           TEXT NOT NULL DEFAULT 'customer', -- customer | admin | vendor
  password_hash  TEXT,                             -- NULL = OTP-only account
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,   -- proved by OTP; links guest orders with the same mobile
  vendor_id      TEXT,
  blocked        BOOLEAN NOT NULL DEFAULT FALSE,
  addresses      JSONB NOT NULL DEFAULT '[]',
  wishlist       JSONB NOT NULL DEFAULT '[]',
  prefs          JSONB NOT NULL DEFAULT '{}',      -- function dates, bete/beti ki shaadi, district (synced across devices)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ======================= shop catalog =======================
CREATE TABLE IF NOT EXISTS categories (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  name_hi        TEXT,
  emoji          TEXT,
  color          TEXT,
  image          TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  gst_rate       NUMERIC(5,2),                     -- GST % for its items (NULL = not set yet); prices include it
  hsn            TEXT,                             -- HSN (goods) / SAC (services) code printed on tax invoices
  off_pct        INTEGER NOT NULL DEFAULT 0,       -- category offer: % off every item in it (0 = none)
  off_until      DATE                              -- offer ends after this day (NULL = until switched off)
);

CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY,
  category_id    TEXT REFERENCES categories(id),
  type           TEXT NOT NULL,                    -- product (delivered) | service (booked for a date)
  name           TEXT NOT NULL,
  name_hi        TEXT,
  price          INTEGER NOT NULL,
  mrp            INTEGER NOT NULL,                 -- = price when there is no real printed MRP
  unit           TEXT NOT NULL,
  emoji          TEXT,
  image          TEXT,
  description    TEXT,
  includes       JSONB NOT NULL DEFAULT '[]',
  featured       BOOLEAN NOT NULL DEFAULT FALSE,
  min_qty        INTEGER NOT NULL DEFAULT 1,
  stock          INTEGER NOT NULL DEFAULT 0,
  daily_capacity INTEGER,                          -- bookings per date (services); NULL/0 = unlimited
  default_event  TEXT,
  events         JSONB NOT NULL DEFAULT '[]',      -- only these functions (e.g. Tilak puja → Tilak); [] = any
  covers         JSONB NOT NULL DEFAULT '[]',      -- one booking covering several rasams, each with its own date
  kit_items      JSONB NOT NULL DEFAULT '[]',      -- samagri kits: [{key, name, qty, unit, price}] — families add more of an item
  styles         JSONB NOT NULL DEFAULT '[]',      -- flower / mala styles or companies: [{key, name, price, note, photo}]
  opt_kind       TEXT,                             -- brand = the options are companies (dropdown); NULL = styles (photo cards)
  tent_size      TEXT,                             -- tent packages: area covered, e.g. 40×60 ft
  gallery        JSONB NOT NULL DEFAULT '[]',      -- more photos (how the tent looks after set-up…)
  loose          BOOLEAN NOT NULL DEFAULT FALSE,   -- loose flowers sold on their own
  districts      JSONB NOT NULL DEFAULT '"all"',   -- "all" or list of district ids
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  gst_rate       NUMERIC(5,2),                     -- own GST % (NULL = the category's)
  hsn            TEXT,                             -- own HSN / SAC code (NULL = the category's)
  created_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS packages (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  name_hi        TEXT,
  image          TEXT,
  description    TEXT,
  items          JSONB NOT NULL DEFAULT '[]',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT TRUE
);

-- ======================= orders (shop) =======================
CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,
  number         TEXT NOT NULL UNIQUE,             -- SA1001…
  user_id        TEXT REFERENCES users(id),        -- NULL = guest order (matched to an account by verified mobile)
  guest          BOOLEAN NOT NULL DEFAULT FALSE,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  address        JSONB NOT NULL,                   -- name, phone, line1, landmark, city, district, pincode…
  side           TEXT,                             -- boy (bete ki shaadi) | girl (beti ki shaadi) | NULL
  event_date     DATE,
  payment_method TEXT NOT NULL,                    -- online | cod | upi
  payment_status TEXT,                             -- unpaid | pending | partial | paid | refunded…
  pay_plan       TEXT,                             -- full | advance
  pay_now        INTEGER,
  pay_hold       BOOLEAN NOT NULL DEFAULT FALSE,   -- waiting for an online payment to finish
  paid           INTEGER NOT NULL DEFAULT 0,
  payments       JSONB NOT NULL DEFAULT '[]',      -- Razorpay / UPI UTR / cash entries
  refunds        JSONB NOT NULL DEFAULT '[]',      -- [{id, amount, via: razorpay | upi | bank | cash, paymentId, status: pending | processed | failed, at}]
  refund_to      TEXT,                             -- UPI id / account the family asked the refund to go to
  cancel         JSONB,                            -- {by, reason, note, at} once cancelled
  cancel_request JSONB,                            -- after dispatch: {reason, note, at, status: pending | approved | rejected, answeredAt}
  delivery_check JSONB,                            -- counted at the door: {at, checkedBy, receivedBy, lines: [{line, qty, received, damaged, short, note}]}
  subtotal       INTEGER NOT NULL,
  mrp_total      INTEGER NOT NULL,
  discount       INTEGER NOT NULL DEFAULT 0,
  delivery       INTEGER NOT NULL DEFAULT 0,
  total          INTEGER NOT NULL,
  advance        INTEGER,
  status         TEXT NOT NULL,                    -- placed | confirmed | delivered | completed | cancelled…
  note           TEXT,
  admin_note     TEXT,
  rzp_order_id   TEXT,                             -- latest Razorpay order
  rzp_orders     JSONB NOT NULL DEFAULT '[]',      -- every Razorpay order made for it (first payment, retries, balance): [{id, amount, at, paid}]
  rzp_payment_id TEXT,
  buyer          JSONB,                            -- business customer on the tax invoice: {gstin, name}
  invoice        JSONB,                            -- GST tax invoice, frozen once issued: {number INV/26-27/00001, date, seller, buyer, placeOfSupply, lines [{hsn, qty, rate, taxable, cgst, sgst, igst, amount}], totals, words}
  credit_notes   JSONB NOT NULL DEFAULT '[]',      -- GST credit notes against the invoice (returns, cancellation): [{number CN/26-27/00001, date, against, reason, lines, totals}]
  invoice_number TEXT,                             -- copy of invoice.number, for searching
  created_at     TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders (customer_phone);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id             BIGSERIAL PRIMARY KEY,
  order_id       TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     TEXT,
  name           TEXT NOT NULL,
  price          INTEGER NOT NULL,
  qty            INTEGER NOT NULL,
  event          TEXT,                             -- which function
  event_date     DATE,
  dates          JSONB NOT NULL DEFAULT '[]',      -- full ceremony: [{event, date}] for every rasam
  details        JSONB NOT NULL DEFAULT '{}'       -- unit, type, image, mrp, reviewed…
);

-- returns (family asks: R1, R2…) and short / damaged items found at the delivery check (DL1…)
CREATE TABLE IF NOT EXISTS order_returns (
  order_id       TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  id             TEXT NOT NULL,                    -- R1 | DL1 … (per order)
  kind           TEXT NOT NULL DEFAULT 'return',   -- return | delivery
  status         TEXT NOT NULL,                    -- requested | approved | picked | done | rejected
  reason         TEXT,
  note           TEXT,
  value          INTEGER NOT NULL DEFAULT 0,       -- money for the returned lines
  items          JSONB NOT NULL DEFAULT '[]',      -- [{line, name, qty, price}]
  photos         JSONB NOT NULL DEFAULT '[]',      -- up to 4 photos of the bad item
  settled        TEXT,                             -- refunded | replaced …
  history        JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ,
  PRIMARY KEY (order_id, id)
);

CREATE TABLE IF NOT EXISTS order_history (
  id             BIGSERIAL PRIMARY KEY,
  order_id       TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status         TEXT NOT NULL,
  at             TIMESTAMPTZ NOT NULL,
  note           TEXT
);

-- product reviews: only by the buyer of a delivered order, once per order line
CREATE TABLE IF NOT EXISTS product_reviews (
  id             TEXT PRIMARY KEY,
  product_id     TEXT NOT NULL,
  order_id       TEXT REFERENCES orders(id) ON DELETE SET NULL,
  order_number   TEXT,
  line           TEXT,
  name           TEXT,
  district       TEXT,
  rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text           TEXT,
  photo          TEXT,
  reply          TEXT,
  status         TEXT NOT NULL DEFAULT 'published', -- published | hidden
  created_at     TIMESTAMPTZ NOT NULL
);

-- ======================= vendor marketplace =======================
CREATE TABLE IF NOT EXISTS vendors (
  id                 TEXT PRIMARY KEY,
  type               TEXT NOT NULL,                -- vehicle | catering | pandit | tent | orchestra | sweets | ration…
  subtype            TEXT,
  name               TEXT NOT NULL,
  name_hi            TEXT,
  owner              TEXT,
  phone              TEXT,
  whatsapp           TEXT,
  address            TEXT,
  district_id        TEXT REFERENCES districts(id),
  pincode            TEXT,
  lat                DOUBLE PRECISION,
  lng                DOUBLE PRECISION,
  geo_src            TEXT,
  about              TEXT,
  speciality         TEXT,
  experience_years   INTEGER NOT NULL DEFAULT 0,
  languages          JSONB NOT NULL DEFAULT '[]',
  education          JSONB NOT NULL DEFAULT '[]',
  skills             JSONB NOT NULL DEFAULT '[]',  -- [{group, items[]}] e.g. Jyotish / Astro
  tags               JSONB NOT NULL DEFAULT '[]',
  photos             JSONB NOT NULL DEFAULT '[]',
  videos             JSONB NOT NULL DEFAULT '[]',
  profile_photo      TEXT,
  dishes             JSONB NOT NULL DEFAULT '[]',
  team               JSONB NOT NULL DEFAULT '[]',
  verified           BOOLEAN NOT NULL DEFAULT FALSE,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  sample             BOOLEAN NOT NULL DEFAULT FALSE,
  status             TEXT,
  capacity_per_day   INTEGER NOT NULL DEFAULT 1,
  open_days          JSONB NOT NULL DEFAULT '[]',
  blocked_dates      JSONB NOT NULL DEFAULT '[]',
  booked_dates       JSONB NOT NULL DEFAULT '[]',
  delivery_available BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_charge    INTEGER NOT NULL DEFAULT 0,
  delivery_free_above INTEGER NOT NULL DEFAULT 0,
  lagan_pct          INTEGER NOT NULL DEFAULT 0,
  advance            INTEGER NOT NULL DEFAULT 0,   -- token the family pays the vendor to lock a date (0 = none)
  stock_updated      DATE,
  dl_no              TEXT,                         -- private
  kyc                JSONB,                        -- private (PAN / GSTIN / FSSAI numbers)
  consent_at         TIMESTAMPTZ,
  adults_declared_at TIMESTAMPTZ,
  user_id            TEXT,
  created_at         TIMESTAMPTZ
);

-- private verification papers (files live in database/data/docs, never public)
CREATE TABLE IF NOT EXISTS vendor_docs (
  id             TEXT PRIMARY KEY,
  vendor_id      TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL,
  listing_id     TEXT,
  file           TEXT NOT NULL,
  ext            TEXT,
  size           INTEGER,
  status         TEXT NOT NULL,                    -- pending | ok | rejected
  note           TEXT,
  uploaded_at    TIMESTAMPTZ,
  checked_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS vendor_listings (
  id             TEXT PRIMARY KEY,
  vendor_id      TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  name_hi        TEXT,
  item_key       TEXT,
  kind           TEXT,                             -- box | card | NULL
  category       TEXT,                             -- tent components: tent-type, chairs, lighting…
  rental         BOOLEAN NOT NULL DEFAULT FALSE,   -- booked by quantity per date (owned units − booked)
  size           TEXT,
  features       JSONB NOT NULL DEFAULT '[]',
  brand          TEXT,                             -- company; the same item in several companies = one listing each
  quality        TEXT,
  price          INTEGER NOT NULL,
  unit           TEXT NOT NULL,
  pack_size      NUMERIC,
  stock          INTEGER NOT NULL DEFAULT 0,
  units          INTEGER NOT NULL DEFAULT 1,
  min_qty        INTEGER NOT NULL DEFAULT 0,
  lagan_price    INTEGER NOT NULL DEFAULT 0,
  events         JSONB NOT NULL DEFAULT '[]',
  covers         JSONB NOT NULL DEFAULT '[]',
  styles         JSONB NOT NULL DEFAULT '[]',      -- service types / designs: [{key, name, price, note, photo}]
  staff          TEXT,                             -- extra people per date: cook | helper | dancer | singer
  shoot          TEXT,                             -- studios: day (coverage per function) | addon | once
  seats          INTEGER,
  ac             BOOLEAN,
  km             TEXT,
  driver         BOOLEAN,
  photo          TEXT,
  photos         JSONB NOT NULL DEFAULT '[]',
  specs          TEXT,
  guest_tiers    JSONB NOT NULL DEFAULT '[]',
  bulk_tiers     JSONB NOT NULL DEFAULT '[]',
  box_size       TEXT,
  holds_kg       NUMERIC,
  design         TEXT,
  card_type      TEXT,
  paper          TEXT,
  printing       JSONB NOT NULL DEFAULT '[]',
  addons         JSONB NOT NULL DEFAULT '[]',
  lead_days      INTEGER,
  card_views     JSONB,
  reg_no         TEXT,                             -- private
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS vendor_bookings (
  id                TEXT PRIMARY KEY,
  number            TEXT NOT NULL UNIQUE,          -- VB5001…
  vendor_id         TEXT NOT NULL REFERENCES vendors(id),
  vendor_name       TEXT,
  type              TEXT,
  date              DATE NOT NULL,                 -- main booking date (other function dates are on the items)
  event             TEXT,                          -- which function
  event_time        TEXT,                          -- e.g. 18:00
  user_id           TEXT REFERENCES users(id),
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  customer_address  TEXT,
  customer_district TEXT,
  customer_pincode  TEXT,
  customer_side     TEXT,                          -- boy | girl | NULL
  fulfilment        TEXT,                          -- delivery | pickup | on site
  subtotal          INTEGER NOT NULL,
  delivery_charge   INTEGER NOT NULL DEFAULT 0,
  total             INTEGER NOT NULL,
  status            TEXT NOT NULL,                 -- requested | confirmed | completed | cancelled | rejected
  answer_by         TIMESTAMPTZ,                   -- a request holds the date till then (48 h or the function day)
  expired           BOOLEAN NOT NULL DEFAULT FALSE, -- vendor did not answer in time, the date was released
  advance           INTEGER,                       -- vendor's advance when booked
  reviewed          BOOLEAN NOT NULL DEFAULT FALSE,
  -- paid online to Vivah Saathi (after the vendor confirmed), passed on to the vendor, or refunded
  paid              INTEGER NOT NULL DEFAULT 0,
  payment_status    TEXT,                          -- partial | paid | refunded | NULL (nothing online)
  payments          JSONB NOT NULL DEFAULT '[]',   -- [{id, amount, via, method, at}]
  rzp_orders        JSONB NOT NULL DEFAULT '[]',   -- [{id, amount, part: advance | full, at, paid}]
  payouts           JSONB NOT NULL DEFAULT '[]',   -- to the vendor: [{amount, via: upi | bank | cash, ref, at}]
  refunds           JSONB NOT NULL DEFAULT '[]',   -- to the family: [{id, amount, via, paymentId, status, at}]
  note              TEXT,
  vendor_note       TEXT,
  confirmed_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  rejected_at       TIMESTAMPTZ,
  history           JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS vbookings_vendor_date_idx ON vendor_bookings (vendor_id, date);
CREATE INDEX IF NOT EXISTS vbookings_phone_idx ON vendor_bookings (customer_phone);

CREATE TABLE IF NOT EXISTS vendor_booking_items (
  id             BIGSERIAL PRIMARY KEY,
  booking_id     TEXT NOT NULL REFERENCES vendor_bookings(id) ON DELETE CASCADE,
  listing_id     TEXT,
  name           TEXT NOT NULL,
  unit           TEXT,
  price          INTEGER NOT NULL,
  qty            INTEGER NOT NULL,
  guests         INTEGER,
  addons         JSONB,
  dates          JSONB NOT NULL DEFAULT '[]',      -- full ceremony / studio function: [{event, date}] — every date is held
  details        JSONB NOT NULL DEFAULT '{}'       -- style, shoot, staff, rental, category, size, lagan…
);

-- site visits: a tent house / decorator comes to measure the ground before the booking (SV…)
CREATE TABLE IF NOT EXISTS vendor_visits (
  id                TEXT PRIMARY KEY,
  number            TEXT NOT NULL UNIQUE,
  vendor_id         TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  vendor_name       TEXT,
  date              DATE NOT NULL,                 -- visit date
  slot              TEXT,                          -- morning | afternoon | evening
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  customer_address  TEXT,
  customer_landmark TEXT,
  customer_district TEXT,
  customer_pincode  TEXT,
  area              TEXT,                          -- what the family says, e.g. 60x80 ft
  guests            INTEGER,
  function_date     DATE,
  note              TEXT,
  status            TEXT NOT NULL,                 -- requested | confirmed | done | cancelled
  measured          TEXT,                          -- what the vendor measured
  history           JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS vvisits_vendor_idx ON vendor_visits (vendor_id, date);

CREATE TABLE IF NOT EXISTS vendor_reviews (
  id             TEXT PRIMARY KEY,
  vendor_id      TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  booking_id     TEXT,
  name           TEXT,
  district       TEXT,
  rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text           TEXT,
  reply          TEXT,
  status         TEXT NOT NULL DEFAULT 'published',
  verified       BOOLEAN NOT NULL DEFAULT FALSE,
  sample         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL
);

-- ======================= lagan (shubh vivah) dates & ration ingredients =======================
CREATE TABLE IF NOT EXISTS lagan_dates (
  date           DATE PRIMARY KEY,
  note           TEXT,
  added_by       TEXT,
  added_by_name  TEXT,
  added_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lagan_sheets (
  id             TEXT PRIMARY KEY,
  title          TEXT,
  url            TEXT,
  added_by       TEXT,
  added_by_name  TEXT,
  added_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ingredients (
  key            TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  name_hi        TEXT,
  grp            TEXT,
  unit           TEXT,
  per_100_guests NUMERIC
);

-- ======================= live copy (Supabase) =======================
-- the whole data as one document (login sessions and keys left out): a new server with an empty data folder
-- starts from this, so nothing has to be carried by hand
CREATE TABLE IF NOT EXISTS app_snapshot (
  id             TEXT PRIMARY KEY,                 -- main
  data           JSONB NOT NULL,
  saved_at       TIMESTAMPTZ NOT NULL
);

-- ======================= upgrade a database made from an older copy of this file =======================
-- (CREATE TABLE IF NOT EXISTS does not add new columns to a table that is already there; these do, and are
-- harmless on a new database)
ALTER TABLE products        ADD COLUMN IF NOT EXISTS kit_items      JSONB NOT NULL DEFAULT '[]';
ALTER TABLE products        ADD COLUMN IF NOT EXISTS styles         JSONB NOT NULL DEFAULT '[]';
ALTER TABLE products        ADD COLUMN IF NOT EXISTS opt_kind       TEXT;
ALTER TABLE products        ADD COLUMN IF NOT EXISTS tent_size      TEXT;
ALTER TABLE products        ADD COLUMN IF NOT EXISTS gallery        JSONB NOT NULL DEFAULT '[]';
ALTER TABLE products        ADD COLUMN IF NOT EXISTS loose          BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS pay_hold       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS refunds        JSONB NOT NULL DEFAULT '[]';
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS rzp_orders     JSONB NOT NULL DEFAULT '[]';
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS refund_to      TEXT;
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS cancel         JSONB;
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS cancel_request JSONB;
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS delivery_check JSONB;
ALTER TABLE vendors         ADD COLUMN IF NOT EXISTS advance        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vendor_listings ADD COLUMN IF NOT EXISTS styles         JSONB NOT NULL DEFAULT '[]';
ALTER TABLE vendor_listings ADD COLUMN IF NOT EXISTS staff          TEXT;
ALTER TABLE vendor_listings ADD COLUMN IF NOT EXISTS shoot          TEXT;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS vendor_name    TEXT;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS answer_by      TIMESTAMPTZ;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS expired        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS advance        INTEGER;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS reviewed       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS paid           INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS payments       JSONB NOT NULL DEFAULT '[]';
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS rzp_orders     JSONB NOT NULL DEFAULT '[]';
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS payouts        JSONB NOT NULL DEFAULT '[]';
ALTER TABLE vendor_bookings ADD COLUMN IF NOT EXISTS refunds        JSONB NOT NULL DEFAULT '[]';
ALTER TABLE categories      ADD COLUMN IF NOT EXISTS gst_rate       NUMERIC(5,2);
ALTER TABLE categories      ADD COLUMN IF NOT EXISTS hsn            TEXT;
ALTER TABLE categories      ADD COLUMN IF NOT EXISTS off_pct        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories      ADD COLUMN IF NOT EXISTS off_until      DATE;
ALTER TABLE products        ADD COLUMN IF NOT EXISTS gst_rate       NUMERIC(5,2);
ALTER TABLE products        ADD COLUMN IF NOT EXISTS hsn            TEXT;
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS buyer          JSONB;
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS invoice        JSONB;
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS credit_notes   JSONB NOT NULL DEFAULT '[]';
ALTER TABLE orders          ADD COLUMN IF NOT EXISTS invoice_number TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS orders_invoice_idx ON orders (invoice_number) WHERE invoice_number IS NOT NULL;

-- ======================= who can read the tables =======================
-- Only the server reads and writes them, with the secret service-role key (it skips these rules). Row-level security
-- with no policies shuts out Supabase's public (anon) key, so customers' details can never be read with it.
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE lagan_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lagan_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_snapshot ENABLE ROW LEVEL SECURITY;
