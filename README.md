# Vivah Saathi 🪔

A wedding marketplace for **Bihar (38 districts)** and **Uttar Pradesh (75 districts)**. Customers can order puja samagri / rasam kits, mithai, cards, gifts and clothes, and book Pandit Ji, doli cars, ghodi / baggi, tent and shamiyana, band and DJ, halwai, decoration and photographers.

## Run it

Use Node.js 24 LTS (no `npm install` required, there are no dependencies).

```bash
npm start
```

- Store: http://localhost:3000
- Admin panel: http://localhost:3000/admin
- Vendor panel: http://localhost:3000/vendor

The [Expo mobile app](mobile-app/README.md) uses this same server.

Other commands:

| Command | What it does |
|---|---|
| `npm run dev` | restarts on every file change |
| `npm run check` | syntax-checks every script |
| `npm run reset-admin -- "NewPassword"` | resets the admin password (stop the server first). Run it without a password to create a strong one; it is saved to `database/data/ADMIN-LOGIN.txt`. |
| `npm run export-sql` | writes the schema and all data into one PostgreSQL / Supabase file, `database/export.sql` |
| `npm run reset` | starts over with sample data. **This deletes all orders.** |

## Project structure

```
backend/            Node.js server, storefront and vendor APIs, integrations
  server.js         server entry point
frontend/           storefront, admin panel and vendor panel
  index.html · admin.html · vendor.html
  css/ · js/ · img/  stylesheets, browser scripts and active brand assets
  uploads/          default public upload directory (runtime data)
database/
  schema.sql        PostgreSQL / Supabase schema
  rows.js           mapping shared by the SQL export and Supabase sync
  export.js         SQL export command
  data/             default private database and vendor documents (runtime data)
mobile-app/         Expo app, dependency lockfile and setup instructions
scripts/            syntax check and admin password reset
.github/workflows/  server, Docker and Android build checks
Dockerfile          server container build
.env.example        server configuration template
```

## Put it on GitHub

`database/data/`, `frontend/uploads/` and `.env` are in `.gitignore`. They hold orders, customer phone numbers, password hashes, payment / SMS keys and vendor ID papers, so they never go to GitHub.

1. Install Git (https://git-scm.com) or GitHub Desktop.
2. Create an **empty private** repository on GitHub.
3. In this folder, run:

```bash
git init
git add .
git commit -m "Vivah Saathi"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/vivah-saathi.git
git push -u origin main
```

Every push runs the check in `.github/workflows/check.yml`: a syntax check, then it boots the server and checks the site answers.

No command line? Install **GitHub Desktop**, choose *File → Add local repository* → this folder → *Create a repository* → *Publish repository* and keep **"Keep this code private"** ticked.

## How many visitors one server takes

Measured on an office laptop (server and the test both on it): about **2,000 requests a second** with 50–200 visitors clicking at the same moment (median answer 25–100 ms, no errors). A shopper browsing makes roughly one request every few seconds, so one server is comfortable for **several thousand people on the site at the same time** — tens of thousands of visitors a day. What helps it: answers are gzipped (5–10× smaller on mobile data), photos are kept by the browser for a week, public pages are served from a 10-second cache that is dropped the moment anything changes, and one address sending more than 1,200 requests a minute is slowed. `/healthz` answers for the host's uptime / load-balancer checks.

**A million people at once is a different design**, not a setting: the whole data lives in one server's memory and one file, so the site runs as one process. To go far beyond one server: make Supabase / PostgreSQL the main database (instead of a copy), run several copies of the app behind a load balancer, put Cloudflare (CDN) in front for pages and photos, move uploads to Supabase Storage / S3, and keep sessions and limits in the database or Redis. Plan that as its own project when traffic calls for it; until then, a bigger server (more CPU) and Cloudflare in front go a long way.

## Move to another laptop (or a server)

GitHub carries the **code only**. Your data — orders, customers, vendors, password hashes, keys, vendor papers, uploaded photos — moves separately and privately (pen drive / private cloud folder, never GitHub, WhatsApp or email):

| What | Where it is | Zip of it |
|---|---|---|
| Code | the whole folder except the private parts below | `transfer/vivah-saathi-code-DATE.zip` (or `git clone`) |
| Private data | `database/data/` (db.json, ADMIN-LOGIN.txt, docs/) and `frontend/uploads/` | `transfer/vivah-saathi-PRIVATE-data-DATE.zip` |

On the new laptop: install **Node 24**, get the code (`git clone https://github.com/YOUR-NAME/vivah-saathi.git` or unzip the code zip), unzip the private data zip and put `data/` into `database/` and the photos into `frontend/uploads/`, then `npm start` and open http://localhost:3000. Stop the site on the old laptop first, so new orders do not land in two places.

On a server: the same, with the data put on the persistent disk (`DATA_DIR`) — see Deploy below. Make a fresh private data zip right before you move (`Compress-Archive -Path database\data, frontend\uploads -DestinationPath transfer\vivah-saathi-PRIVATE-data.zip`), and delete the zips and `ADMIN-LOGIN.txt` once the new place is running and the password is saved.

## Deploy

Run **one replica**. The Node process owns the live database in memory and saves it to disk. Give it persistent storage for orders, private documents and public uploads. The Supabase copy supports recovery. Horizontal scaling requires a shared transactional database for bookings and orders, shared session and rate-limit state, and shared object storage for uploads.

For a host with one persistent volume, mount it at `/mnt/vivah` and set `DATA_DIR=/mnt/vivah/data` and `UPLOAD_DIR=/mnt/vivah/uploads`. Keep public uploads in their own directory. Back up both directories and verify that a restore can read the database and serve an uploaded photo.

Use `/healthz` for liveness and `/readyz` for traffic readiness. Readiness returns HTTP 503 after a database write failure and recovers after a successful save.

- **Any VPS (recommended):**
  1. Install Node 24 and run `git clone …`, then `cp .env.example .env` and fill in your keys.
  2. Run `npm start` behind Nginx with HTTPS. Keep it running with `pm2 start backend/server.js --name vivah-saathi` or a systemd service.
  3. Back up `database/data/` and `frontend/uploads/` daily.
- **Docker:**
  1. `docker build -t vivah-saathi .`
  2. `docker run -d -p 3000:3000 -v vs-data:/app/database/data -v vs-uploads:/app/frontend/uploads --env-file .env vivah-saathi`
- **Render / Railway / Fly.io:** use the Dockerfile with a persistent volume and the two directory settings above.

Behind a proxy (Render, Railway, Fly.io, Nginx, Cloudflare) set **`TRUST_PROXY=1`** so the login / OTP limits see each visitor's real address. Then work through **Admin → Go-live, Payments & SMS** — it lists what is still missing before real bookings (real vendors, sample vendors hidden, SMS, OTP before orders, a way to pay, help number, business details for the policy pages, Supabase, https). For live payments follow **Online payment (Razorpay)** below, including the webhook `https://YOUR-DOMAIN/api/payments/webhook`.

## Logins

A new site never starts with a known password. On the first start the admin (mobile **9000000000**) gets the password from `ADMIN_PASSWORD`, or a random one written to `DATA_DIR/ADMIN-LOGIN.txt` (private, never in git) — read it, save it somewhere safe, delete the file. The demo customer gets a random password too. Lost the admin password? `npm run reset-admin` writes a new one to the same file.

Change the admin password in **Admin → Settings → Change my admin password** (that signs the account out on every other device).

**Built-in protection:** 5 wrong passwords for a mobile lock it for 15 minutes (30 wrong from one address: an hour); OTP has 5 tries, 5 per hour per number; 40 wrong order / booking look-ups (number + mobile) from one address wait an hour; logins end after 7 days for admins and 60 days for others; broken addresses are answered, never crash the server; changes are written before the app stops.

## How customers order (no login needed)

1. Pick a function — Sagai / Roka, Tilak / Chheka, Haldi, Mehndi, Matkor, Bhaat, Sangeet, Shaadi (Vivah), Baraat, Bidai, Reception — or a category. Each function has its own page with what it needs, and My Events keeps a date for each.
2. Tap **+ Add to Cart** for saman, or **📅 Book Now** for services. The booking popup asks which function, the date, and the quantity, and shows live slot availability.
3. Or add a **Ready Package** (Tilak, Haldi, Mehndi Raat, Vivah, Tent & Decoration, Baraat, Bhoj, Mithai) in one click.
4. Checkout needs only name, mobile, address and district. No account or password is required. Customers can also send the cart on WhatsApp.
5. Customers track orders with order number + mobile at **Track Order**. Registered users also see them in My Account.
   Every order has a **🧾 Bill** (`#/bill/ORDER-NUMBER`): your business details, the customer, every item with its function date, delivery, total, each payment (Razorpay method and ID, UPI, cash), refunds, and the balance to pay or the refund still due. **Print / Save as PDF** prints just the bill on a clean page (each document on its own page); **Share on WhatsApp** sends a summary. It asks for the order's mobile number unless this phone placed or tracked the order, and the number never goes into the link. Once GST is set up, the same page shows the **GST tax invoice** and any **credit notes** above the payment receipt (see GST tax invoices).
6. **↗ Share with family** on every product and vendor page sends the item with its link on WhatsApp, so the family can decide together. A shared site link shows a picture card in WhatsApp, and on Android the site can be added to the home screen like an app.

## Real booking rules

- Every service has **Bookings per day** (Admin → Products). When a date is full, the site shows "Fully booked" and the server refuses the order, so a date can't be double-booked. A cancelled order frees its slot. Set it to 0 for unlimited.
- **Admin → Booking Calendar** shows every booking by date, with function, customer and order.
- **Admin → Dashboard & Analytics**: sales, orders, average order value, conversion, visits, the visit → view → cart → checkout → order funnel, bookings by function, top products, most viewed, new vs repeat customers, Bihar vs UP, top districts, and the **Online payments — Razorpay** money section. Filter by today / 7 / 30 days / 6 months / 1 year.
- The admin panel checks for new orders every 20 seconds and plays a sound when one arrives. You can confirm an order in one click and WhatsApp the customer.

## Vendor marketplace (Book Vendors)

Customers open **Book Vendors** (first item in the category bar, or `#/vendors`), pick the **wedding / function date** (Today, Tomorrow, or their saved function dates), and instantly see which vendors are free on that date.

Sections: **Vehicles** (Cars & SUVs, Owner-Driver, Dulha Entry), **Cooks & Catering**, **Raw Materials & Ration**, **Vegetables**, **Sweet Shops**, **Cameras & Studios**, **DJ & Sound**, **Pandit Ji**, **Orchestra & Artists** (Orchestra Groups, Individual Artists), **Tent, Shamiyana & Light** (Tent House, Light & Generator), **Phool & Decoration** (Decorators, Phool / Mala Wala), **Band Baja & Shehnai** (Band Party, Shehnai & Dhol), **Mehndi Artists**, **Makeup & Beauty Parlour** (Makeup Artists, Beauty Parlours), **Marriage Hall & Venue** (Halls, Lawns, Hotels), **Dulha-Dulhan Wear**, **Puja Samagri Shops**, **Shagun & Gift Shops** and **Shaadi Card Printing**.
Each shop category page (Tent, Band Baja, Phool, Mehndi, Dulha-Dulhan Wear, Puja Samagri, Gifts, Cards, Car, Photo & Video, Pandit Ji, Mithai) shows a **"🤝 Book a local vendor"** strip linking to the matching vendors, plus "Offer this service? Join free". A vendor type with nobody listed yet invites people to join and points customers to the shop meanwhile. The new types have no sample vendors; they fill up as real vendors join.

- **Filters:** search, state/district, rating, price range, sort, and "Only available on <date>". You can compare up to 3 vendors side by side, and for ration, vegetables and sweets there is an item-by-item **price comparison** with the lowest price highlighted.
- **Vendor page:** photos and portfolio, verified badge, rating and reviews, address with Google Maps, phone and WhatsApp, a month **availability calendar**, items with prices and live stock / units left, and **Request Booking**.
- **No double bookings** (checked on the server):
  - Vehicles: each vehicle can be booked only as many times per day as the vendor has units.
  - Caterers, studios, DJ, pandit ji, orchestra: a per-day booking limit.
  - Ration, vegetables, sweets: limited by stock. Stock is reserved when booked and returned on cancel or reject.
  - Dates the vendor blocks cannot be booked, and a completed booking keeps holding its date.
- **Reviews** can only be written by the customer of a **completed** booking, once per booking. Admin can hide reviews.
- Customers track vendor bookings at **#/vtrack** with booking number + mobile.

**Vendors and artists** register at **Join as Vendor / Artist** (`#/vendor-join`). They stay hidden until an admin verifies them in **Admin → Vendors**. The admin then gives them a login (**🔑 Login**), and they manage everything at **/vendor**:
- confirm or reject bookings
- prices, stock and vehicles
- blocking dates, open days and bookings per day
- "stock updated today" for vegetables
- profile, photos and videos
- replies to reviews

**Arkestra section:** **🎤 Arkestra** in the top category bar (`#/arkestra`) and an "Arkestra & Stage Shows" block on the home page. It has its own page with **Orchestra Groups** and **Individual Artists** tabs, the date picker, filters, cart and booking. It shows all of Bihar & UP by default, because artists travel. Artists are shown by their stage name. Real groups and artists join via **Join as Artist** or an admin invite and appear after verification.

**Book a Car (car by car):** **🚗 Book a Car** in the top bar (`#/cars`) lists every vehicle on its own — Bolero, Scorpio, Innova, luxury, dulha entry — each showing **which vendor or owner it belongs to**, seats, AC, price per day and how many are free on the chosen date. Filter by district, seats, AC / Non-AC, price, and "From vendors" / "Owner-driver" / "Dulha entry". Tap **+ Add** (and + / − for more of the same car), add cars from different vendors, then book them all together from the cart.

**Individual car owners (owner-driver):** anyone with their own car can tap **🚘 List your car** (`#/list-car`) and fill one short form: their name, mobile, district, car model, seats, AC, price per day and included km. The car is saved with the application and goes live after an admin verifies it in **Admin → Vendors**. The owner then logs in at **/vendor** to add photos, change the price and mark booked dates. Owner-drivers show as a person profile ("Owner drives · own car"). Three clearly labelled sample owner-drivers are included.

**Same data everywhere:** what a vendor enters in the Vendor Panel (or the join form) is exactly what customers see and book with:
- Vehicles have their own **Seats, AC / Non-AC, km / hours and Driver** fields, which the Book a Car filters use.
- Dulha entry (ghodi, baggi) needs no vehicle number or RC.
- Event services (halwai, studio, DJ…) can set a **minimum order** (for example 100 plates), and bookings below it are refused.
- The availability calendar covers every month customers can book (6 months ahead).
- The panel checks mobile, pincode, name, photo links and open days the same way the join form does.

**Cart for many vendors:** on any vendor page, customers pick items with **+** (for example 2 Boleros + 1 Scorpio) and tap **🛒 Add to Cart**, then do the same for other vendors (DJ, halwai, sabzi, pandit ji…) and dates. The cart groups everything by vendor and date. At checkout **one form books all vendors at once**, together with any shop order. It is all-or-nothing: if any vehicle or slot was taken meanwhile, nothing is booked and the customer is told which vendor to change. Vendor bookings are paid to the vendor directly; online payment / COD applies to the shop order.

**People, not just shops:** Pandit Ji, **Individual Cooks / Halwai** (separate from **Catering Services**) and individual artists show as person profiles, with a round photo, the person's name, years of experience, languages and speciality. Customers can search by name or language (e.g. "Maithili"). Vendors upload their own photo in the Vendor Panel → Profile → Personal profile. Sample people show an initials avatar instead of a photo.

**Halwai by number of guests:** the **Halwai & Catering** category page (`#/c/catering`) starts with a **Book a Halwai / Cook** row: each halwai's photo, phone and WhatsApp, price for 100 / 200 / 300 / 500 log, and next free dates. Customers tap **Kitne log?** to compare prices. On a halwai's page they pick the guest count, and the calendar shows **5 months** ahead. The server always charges the halwai's own price for that guest count. Halwais set these prices in Vendor Panel → Items → Edit → "Price by number of guests" (e.g. `100:6500, 200:9000, 300:11500`).
Each halwai's profile also lists **every dish they can cook**, grouped (Sabzi & Dal, Mithai, Nashta…), with the total ("26 items") and a dish search box. The count shows on their cards too, and the vendor search finds halwais by dish (e.g. "litti"). Halwais fill this in Vendor Panel → Profile → "Dishes you can cook", one group per line: `Mithai: Gulab jamun, Rasgulla, Jalebi`.

**Education & skills:** in the Vendor Panel → Profile, every vendor (especially Pandit Ji) can add **🎓 Education & training** (one line each) and **🕉️ Pujas & skills** as "Group: skill, skill" lines, for example "Jyotish / Astro: Kundli milan, Muhurat, Vastu".
- Customers see them on the profile, with jyotish skills highlighted.
- Cards show "🕉️ 15 pujas & skills · 🔮 Jyotish / Astro".
- Search finds them (e.g. "vastu", "kundli").

**Booked / closed dates:** in the Vendor Panel → Availability, tapping a date cycles **Open → Booked** (taken by phone, outside the site) **→ Closed** (holiday). Customers see these as red "Booked" or grey "Closed" and cannot book them. Sample vendors have a few example booked and closed dates.

**Arkestra team:** every orchestra group card shows **total people** and **how many ladies**, small artist photos and their work (e.g. "2 Singers · 4 Dancers · 1 Anchor · 4 Musicians"). The group's page has a **Team – who will perform** section: Total / Ladies / Men, a count per kind of work, and a card for each artist with photo, stage name, work and gender. Groups manage it in Vendor Panel → **👥 Team**: add each artist with a photo, or one row for a crew (e.g. Band musicians × 4). Sample groups show initials instead of faces.
Arkestra groups and artists also show **5 months of availability**: each card shows how many dates are free in the next 5 months and the next free dates (tap one to book it), and the group's page shows all 5 months side by side.

**Shaadi ration & ingredients (#/ration):** a marketplace for wedding cooking ingredients. It is linked from the home "Raw Materials & Ration" tile and the ration / sabzi vendor lists.
- **Ingredient catalog** (`ingredients.js`): 32 items in 7 groups (rice & flour, pulses, oil & ghee, sugar / salt / tea, spices, dry fruits, vegetables & paneer), each with a rough quantity per 100 guests for a veg shaadi bhoj.
- **Shops' items:** ration and sabzi shops pick the **ingredient** for each item in the Vendor Panel and add **brand**, **quality** (Economy / Standard / Premium), **unit** (kg, litre, quintal, bag, tin, packet, piece), **pack size** (a 50 kg bag = 50), price, **bulk rates**, **minimum order**, **stock** and photos. Delivery charge and booking dates are set in Profile / Availability as before.
- **🧮 Plan for my guests:** enter guests (100 / 200 / 300…), date and menu style. The ingredient list fills in (every quantity editable, untick what you don't need). **Get quotations** prices the whole list at every shop: cheapest matching item, bulk rate for that quantity, minimum order, stock, lagan price and delivery charge, sorted by total. Each quote has its full line table, and a **cheapest mix** buys each ingredient where it is cheapest. "Add this quote to cart" or "Add cheapest mix" puts the items in the cart; checkout sends each shop an order request it confirms, and the customer tracks it like any vendor booking.
- **⚖️ Compare prices:** an overview of every ingredient ("from ₹31/kg · 3 shops"). Tap one to see every shop's offer, **cheapest per kg / litre first** (bags, tins and quintals converted), with filters for area (my district / all Bihar & UP / near my ghar), quality, delivery (any / home delivery / free) and in stock; sort by price, distance or rating; and add to cart.
- The server works out every price itself and checks stock, minimum order and dates; the quote and the order come to the same total.

**Supabase — live copy, no scripts to run:** set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and (recommended) `SUPABASE_ACCESS_TOKEN` in `.env` / the host's settings, or enter them in **Admin → Go-live, Payments & SMS → Supabase**. Then:
- every change (orders, bookings, payments, vendors, settings…) is copied to Supabase 2–10 seconds later — only the rows that changed; rows deleted on the site are deleted there; if Supabase is unreachable it retries (15 s, 30 s … 5 min) and catches up;
- with the access token the tables are made and brought up to date from `database/schema.sql` at every start, so a code update with new fields needs no SQL by hand (without the token, run `database/schema.sql` once in Supabase → SQL Editor);
- a full snapshot is kept too: a **new server or laptop with an empty data folder and the two variables set starts from Supabase** — no data zip to carry (vendor ID papers in `database/data/docs` and photos in `frontend/uploads` still move with the server disk);
- every table has row-level security switched on, so only the server's service-role key can read it — never Supabase's public anon key.
The site keeps working from its own data file (fast, and it works when the internet drops); edits made by hand inside Supabase are not copied back. The admin page shows when the last copy was made and any problem.

**SQL database schema & export (PostgreSQL / Supabase):** `npm run export-sql` writes `database/schema.sql` plus every record into one file, `database/export.sql`; paste it into the Supabase SQL editor (or run `psql "$DATABASE_URL" -f database/export.sql`). `database/schema.sql` describes all the data as relational tables: users, districts, products (with kit items, styles, tent size, gallery), orders (+ items, history, returns / delivery checks, refunds, cancel requests), vendors (with advance), vendor_listings (styles, team roles, studio charge type), vendor_bookings (+ items with every function date, answer-by, expired, advance), vendor_visits (site visits), reviews, vendor_docs, lagan dates, ingredients, the admin dashboard numbers (site_analytics, product_stats) and the running order / booking numbers (counters). A database made from an older copy of the file is brought up to date by the `ALTER TABLE … ADD COLUMN IF NOT EXISTS` lines at its end. `EXPORT_FILE=path npm run export-sql` writes the file somewhere else (handy for tests). Login sessions and API keys are not exported, and passwords stay hashed. The export contains customers' phone numbers, so keep it private (it is in `.gitignore`). The running site still stores its data in `database/data/db.json`.

**Demo data:** **Siwan** has a filled-in **Sample** vendor in every category: halwai, caterer, two ration shops (retail + quintal wholesale), sabzi, mithai wholesale, studio, DJ, Pandit Ji, arkestra & singer, tent, phool & decoration, band, mehndi, makeup artist & parlour, marriage hall, dulha-dulhan wear, puja samagri, gifts, card printer and cars. They have photos, prices, bulk / guest / lagan rates, dishes, delivery and pincodes, but no verification papers (fake ID documents would wrongly show "ID checked"). Remove all samples with **Admin → Vendors → Remove sample vendors**.

**Wholesale sweets & packaging:** sweet shops list each sweet **per kg** with **bulk rates** (e.g. 10+ kg ₹420, 25+ kg ₹400) and a **minimum order**. **Boxes / packaging** are separate items (Vendor Panel → 🧾 Items → "+ Add box / packaging"), each with box size, how much mithai it holds (kg), design / colour, price per box, box bulk rates and stock. On the shop's page customers see "🍬 Sweets" and "📦 Boxes & packaging", each cheapest first. They choose kg and boxes, see the live price ("= ₹400/kg bulk rate ✓ × 30 = ₹12,000 · 20 more for ₹380/kg"), and get a box helper ("For your 30 kg: 60 boxes [Use 60]", "✓ enough boxes"). Stock is reserved on order and returned if the order is cancelled.

**Wedding invitation cards:** card printers add **card designs** (Vendor Panel → 🧾 Items → "+ Add card design"). Each design has **front, back and inside-page photos**, card type, design / colours, paper quality, printing (offset, digital, foil, laser cut…), size & pages, price per card, **minimum order**, **bulk rates** (e.g. 300+ ₹25, 500+ ₹22), **customisation add-ons** with a price per card (envelope, ribbon, couple photo…), days to print, and how many cards they can take now. Customers browse every printer's designs in the **💌 card gallery (#/cards)**: filter by card type, printing, paper and price, enter "how many cards" to see the price for that quantity, sort cheapest first, and tap a photo for front / back / inside. "Choose this design" opens the printer's page with the design and quantity picked. There they tick add-ons and book. The date is "Cards needed by"; dates sooner than the print time are blocked, with a "Set earliest date" button.
For both, the **server charges the right price**: bulk rate for the quantity, then lagan-day price, then add-ons. It also checks minimum order, stock and print time; prices sent by the browser are ignored. The cart works out the bulk rate again when the quantity changes. Two sample vendors show this in Siwan: **Sample Siwan Mithai Wholesale** and **Sample Siwan Card Printers**.

**Verification documents (every vendor):** everyone who joins must give **ID proof**, but Aadhaar is not compulsory. Masked Aadhaar, Voter ID, Passport or Driving licence all work, because a private company may not force Aadhaar. If Aadhaar is used it should be the masked one (last 4 digits only). They must also tick **consent** to share papers for verification only. **PAN is optional**: many village vendors have none, and it is needed only if you ever pay vendors through the site (TDS). Each kind of vendor is then asked for the papers that matter for it:
| Vendor | Needed for ✓ verification | Optional |
|---|---|---|
| Owner-driver | Driving licence, RC of the car | ID proof, PAN, police verification, insurance, PUC, permit |
| Car vendor / dulha entry | ID proof, RC of each car | DL, PAN, GST, police verification, insurance, PUC, permit |
| Caterer, sweet shop | ID proof, **FSSAI** | PAN, shop/trade licence or Udyam, GST |
| Halwai / cook | ID proof | PAN, FSSAI |
| Ration, sabzi | ID proof | PAN, FSSAI, shop licence, GST |
| Arkestra group | ID proof, **team ID & age proofs (all 18+)**, plus an 18+ declaration at sign-up | PAN, GST, police verification |
| Single artist | ID proof, 18+ declaration | PAN, police verification |
| Marriage hall | ID proof | PAN, trade licence, ownership / rent papers, fire NOC, GST |
| Tent, decoration, band, DJ, studio, cards, wear, puja, gifts shops | ID proof | PAN, shop licence / Udyam, GST |
| Pandit Ji, mehndi, makeup artist | ID proof | PAN |
PAN, GSTIN and FSSAI numbers can be typed in too; their format is checked and they are kept private. Admin → Vendors shows "⚠️ N needed papers missing", and **✓ Verify** warns before approving a vendor with papers missing. Customers see only badges: **🆔 ID checked**, **📄 Licence & RC checked**, **🍲 FSSAI registered**, **👥 Team age-checked (18+)**, **🧾 GST registered**. Every vendor has a **📄 Documents** tab in the Vendor Panel and in Admin → Manage.

**Lagan (shubh vivah) dates & prices:** there is **one lagan list for the whole site**. Verified **Pandit Ji** keep it from Vendor Panel → **🪔 Lagan**: they tap dates on a calendar, paste many dates at once, and upload a photo of the lagan sheet. The team can do the same in **Admin → 🪔 Lagan Dates**. A Pandit Ji can remove only the dates he added. Every vendor sees these dates in their 🪔 Lagan tab and sets a **lagan-day price**: "% extra on lagan days" for everything, and/or a fixed lagan price per item (the car join form also asks "Price on lagan days"). On a lagan date customers see "🪔 Lagan day" in the date picker, the next lagan dates as chips, lagan days marked on calendars, and "🪔 Lagan price" with the normal price crossed out. The **server charges the lagan price**, whatever the browser sends. The public page **#/lagan** lists all upcoming lagan dates and the sheet. The list starts empty until Pandit Ji or the team adds dates.

**Vehicle documents:** car owners and car vendors give the **vehicle number** (as on the RC) and **driving licence number** when they join, and upload photos or PDFs of the **driving licence** and **RC**. Both are required for an owner-driver; the RC is required for the car listed in the form. **Insurance, PUC and permit** are optional. Phone photos are shrunk before upload (about 300 KB each).
- The files are stored in `database/data/docs/`, not in `frontend/`. Only that vendor (Vendor Panel → **📄 Documents**) and admins can open them. Customers never see the papers, the licence number or the vehicle number.
- Admin → Vendors shows "📄 N documents to check". In the vendor's **📄 Documents** tab, each paper has **View**, **✓ Verify** and **✗ Reject**; a rejection carries a reason the vendor sees.
- When the licence **and** RC are verified, customers see **📄 Papers checked** / **Licence & RC checked** on that vendor's cars.
- Vendors can add more papers later and add the number for each car (🚙 Vehicles & prices → Edit). A new upload replaces the old one and goes back to "being checked". Deleting a car or vendor deletes its papers.
- Back up `database/data/docs/` together with `database/data/db.json`.

**Photos & front photo:** vendors add **many photos at once**, in the Join form (up to 8), on each car / item (🚙 Vehicles & prices → Edit, up to 10), and on their profile (up to 12). Tapping **⭐ Front** on a photo makes it the **front photo** shown on cards. Photos are shrunk in the browser (about 150–300 KB each), and the server checks they are real images. Each car has its own photos, and photos from the profile or other cars can be reused with one tap. Customers see "📷 5" on a car card; tapping it opens a full-screen viewer (arrows, swipe, thumbnails). The vendor page also opens it from each car's photo. The Join form allows about 6 sign-ups per hour from one network.

**Vehicle vendor cards:** on **Vendors → Vehicles** ("View by vendor"), every vendor card lists all of its cars for the chosen date: price, seats / AC, "✓ 2 of 2 free" or "✗ Booked", with **+ Add** to put a car straight in the cart.

**Ghar / venue location – nearest first:** the customer taps **📍 in the header** or **"Shaadi ghar pe hai? Apna address daalein"** on Book a Car, the vendor lists, Arkestra and Halwai. They can type their **gaon / mohalla + pincode + zila**, use **GPS**, or (optionally) **pin the spot on a map**. After that:
- every car, halwai, arkestra and vendor card shows the distance (📍 16 km · Siwan), and vendors with the **same pincode** come first ("📮 Same pincode"), then the nearest;
- lists show **within 50 km** by default (10 / 25 / 50 / 100 km / any distance), with a "+N farther away" link; nearby districts are included automatically;
- the vendor's page shows "🏠 16 km from your ghar / venue".
Vendors give a **full address + pincode** (required when joining). The server looks the address up on the map automatically (OpenStreetMap, free). Vendors can also pin the exact spot themselves in Vendor Panel → Profile → **📍 Pin on map / GPS**. Without a pin, distance is counted from the zila town and shown as "~". Customers only ever see the distance, never a vendor's exact spot, and vendors never see the customer's pin.
**Map provider:** this works without any key, using OpenStreetMap. To use **Google Maps** instead, add a browser key in **Admin → Go-live, Payments & SMS → Google Maps** (or set the `GOOGLE_MAPS_KEY` environment variable). Enable Maps JavaScript API and Geocoding API for the key, and restrict it to your website address. Set `NO_GEOCODE=1` to stop the server looking up vendor addresses.

**Inviting real artists and orchestras:** Admin → Vendors → **📨 Invite Artist / Vendor** sends a WhatsApp message with a sign-up link pre-filled with their name and number. They add their own photo, fees and dates, and you verify them. Please don't list real people (for example well-known orchestra artists) without their consent.

**⛺ Tent Booking – item by item (`#/tent`):** every tent-house, decorator and DJ component is listed on its own — tents & pandal (shamiyana, German hangar, waterproof), poles, fabric & kanaat, carpet, chairs, tables, stage & mandap, sofa, lighting, sound & DJ, generator, decoration, flowers and other items — with photo, size, features, price per unit (lagan price on lagan days), vendor and "✓ 240 of 800 left" for the chosen date. Category tabs (with counts), search, district, vendor, price, sort and "only free" filters. **+ Add** / the quantity box puts the item in the vendor cart for that date; another date is its own line with its own quantity. **🧾 My tent selection** groups everything by date with quantity, change date, remove and the **function time** (⏰, saved on each booking). **Review & Create Final Order** (`#/tent/review`) re-checks every line on the server just then (✓ / ✗ per line; confirm is blocked if anything is short) and shows items, vendors, delivery charges and the grand total; **Confirm** goes to the normal checkout, which books all vendors and dates at once.
- **How stock works:** a listing of a tent / decoration / DJ vendor with **⛺ Rental item** ticked (`rental: true`) is a stock of pieces: **Owned** (`units`, up to 100,000) minus the pieces in requested / confirmed / completed bookings **of that date** = left. A booking asking for more than is left is refused (409) — no double booking; closed days and dates marked booked still stop it. Bookings of only rental items do **not** use the vendor's "bookings per day" slots; packages / services (no tick) work as before.
- **Delivery:** for rental items the vendor's **🚚 Delivery / transport** charge (Profile) is added once per vendor per date (free above the set amount).
- **Vendor Panel:** 🧾 Items & prices → **+ Add rental item** (category, owned quantity, size, features, rent per unit, photos, price; lagan price in 🪔 Lagan); the table shows category and owned count (editable). 🗓️ Availability → **📦 Inventory on a date** shows owned / booked / left per item and that day's bookings.
- Sample tent house, decorator and DJ vendors get example items in every category once (`db.tentRentalSamples`).

**Sample vendors:** 36 sample vendors, labelled "Sample", with placeholder 90000-xxxxx phone numbers, are included so you can see the marketplace working. Remove them all with **Admin → Vendors → Remove sample vendors** before going live. Real artists (for example orchestra singers or dancers) should register themselves, or be added with their permission, so that only real, verified information is shown.

## Services for one rasam (Pandit Ji) and advance booking

- **Pandit Ji planner:** every Pandit Ji puja page shows the same box: **tick the rasams you need** (Tilak, Haldi, Matkor, Shaadi) and give each a date.
  - Tap a row, then a green date in the calendar. Tap the same date again, untick, or press ✕ to remove it.
  - The planner chooses the booking: with Shaadi ticked → **Full Ceremony** (every ticked rasam on its date). Without Shaadi → **Only Tilak** and / or **Only Haldi & Matkor**. The total is shown before adding.
  - **Add to Cart** replaces any earlier Pandit Ji booking in the cart (no duplicates). **Remove Pandit Ji booking from cart** removes it.
  - A Tilak / Haldi / Matkor date after the Shaadi date shows "⚠️ after Shaadi?".
- **Full ceremony covers every rasam:** Vivah Sanskar – Pandit Ji (Full Ceremony) is one booking for **Tilak, Haldi, Matkor and the Shaadi**.
  - The customer enters the date of each rasam: tap a rasam, then a green date in the calendar.
  - The Shaadi (lagan) date is required; a rasam left empty means Pandit Ji isn't needed for it.
  - Each date shows ✓ Free or ✗ Fully booked, and 🪔 Lagan when Pandit Ji has published it as a lagan day.
  - Every date blocks a slot, and every date appears in Admin → Orders and the Booking Calendar.
- **One rasam only:** Tilak puja → Tilak, Haldi & Matkor puja → Haldi or Matkor. A wrong function is refused.
- In Admin → Products:
  - **"Full ceremony — covers these rasams"** makes any service a multi-date booking.
  - **"Booked for which functions?"** limits a service to certain functions. Leave both empty for services like tent or photographer that work for any function.
- **Vendor listings work the same way:** in the Vendor Panel (Pandit Ji, DJ, studio and other date-booked vendors) each item has the same two checkboxes; customers pick "Kis function ke liye?" on the vendor page, and a full-ceremony item takes a date per rasam — every date blocks the vendor's calendar.
- Every service page shows a **5-month availability calendar** (free / fully booked / lagan days). Tap a green date to pick it. On phones the months swipe sideways.

## Prices, MRP and ratings

- Star ratings are **real only**. A product shows stars only after it has at least one published review. Vendors get ratings only from customers of completed bookings.
- **MRP:** enter it in Admin → Products only when the item has a real printed MRP. Customers see the strike-through price, "% off" and "You save" only where the MRP is higher than your price. Leave it empty otherwise.
- **Sort options** for customers: Popular (featured first, then most ordered), Price: Low to High, and Price: High to Low.

## Reviews after the service

- **Who can review:** only the customer of a **delivered / completed** shop order, checked by order number and mobile. Each order line can be reviewed once. A booking (Pandit Ji, tent, car…) can be reviewed only after its function date. Vendor bookings work the same way once the vendor marks them completed.
- **Easy for customers:** Track Order, My Orders and My Vendor Bookings show **⭐ Rate & review** on each delivered item or completed booking. It opens a popup where the customer taps the stars; text and a photo are optional, and nothing needs retyping. After sending, the button changes to **✓ Reviewed**. On a vendor page, the review form fills in the booking number and mobile saved on that phone.
- **Shown to shoppers:** stars and the review count appear on product cards, and the product page has a **Ratings & Reviews** section with 5★…1★ bars, a "Verified buyer" badge, the customer's photo and your reply.
- **Admin → Reviews → Shop product reviews:** hide or show a review (a hidden review leaves the average), reply to it, or delete it. On a delivered order, **⭐ Ask for review on WhatsApp** sends the customer a link to Track Order.

## Dashboard & customer accounts

- **Admin → Dashboard** (`GET /api/admin/dashboard?days=7|30|90|365`, old path `/api/admin/stats` still works): KPI tiles, then shop orders & payments (online / COD / UPI, received, still due, refunds), the vendor marketplace (requests by status, **booking value paid to vendors — never added to shop sales**, confirmation rate and average hours to confirm, by category, top 10 vendors, tent / rental pieces booked, vendors waiting for verification or with missing papers), customers (new vs repeat by mobile, logged-in vs guest, top districts, bete ki / beti ki), function dates in the next 30 days and the busiest / lagan dates (shop + vendor), product and vendor reviews (low ratings without a reply), and the visit → view → cart → checkout → order funnel (vendor checkouts counted too).
- Days are **India time**. Sample vendors, their bookings and sample reviews are left out of the numbers; a note says how many. Vendor bookings get `confirmedAt` / `completedAt` / `cancelledAt` / `rejectedAt` (older ones filled from their history once).
- **Account = source of truth:** bookings made while logged in store `userId`. My Account → My Orders shows shop orders **and** vendor bookings (`GET /api/vbookings/mine`), plus guest orders / bookings made with the same mobile **once that mobile has been verified with OTP** (a password sign-up alone does not prove the number), merged with the ones this browser remembers, without duplicates.
- Function dates, side and district are saved on the profile (`PUT /api/me {prefs}`) and loaded at login on any device. A filled value is never replaced by an empty one; if both differ, the more recent change wins.
- Admin → Customers shows each account's shop orders / spent and vendor bookings / value.

## English / Hindi

Customers tap **EN | हिं** in the header to switch language; the choice is remembered on their phone.
In Hindi mode all buttons, menus, messages and the brand name (विवाह साथी) are in Hindi, and product, category and package names use the **Hindi name** field from Admin → Products.
Product descriptions and "What's included" lists are shown as you type them in Admin.
Interface translations live in `frontend/js/i18n.js`. Add a line there for any new English text you want translated.

## Direct UPI payment (works today, no gateway needed)

1. Go to **Admin → Go-live, Payments & SMS → Direct UPI payment** and enter your UPI ID (e.g. `shopname@okaxis`) and the name to show.
2. Customers then get **"Pay by UPI now"** at checkout and a **"Pay ₹… now"** button on every unpaid order (Track Order / My Orders). Tapping it shows a QR code and an **Open UPI app** button (GPay, PhonePe, Paytm, BHIM) with the amount filled in.
3. After paying, the customer types the 12-digit **UPI reference / UTR**. The order shows "UPI – verify UTR" in Admin. Check it in your bank or UPI app, then tap **Payment received** (or **Not found**).
4. If you take cash in person, type the amount in the order's "Amount received" box. The order shows part-paid with the balance, and the customer can pay the rest online.

## Online payment (Razorpay)

The site is fully wired for Razorpay. Until keys are added, online payment stays **off** and customers simply see Cash on Delivery / UPI — nothing breaks. Keys are never in the code or on GitHub, so after deploying you add them once on the server.

### Step 1 — try it today with test keys (no KYC, no real money)

1. Sign up free at [dashboard.razorpay.com](https://dashboard.razorpay.com) with your mobile and email.
2. Make sure the dashboard is in **Test Mode** (switch at the top), then **Account & Settings → API Keys → Generate Key**. Copy the **Key ID** (`rzp_test_…`) and **Key Secret** (shown only once — save it).
3. Open **Admin → Go-live, Payments & SMS**, paste both keys, press **Test keys**, and switch on **Accept online payments at checkout**.
4. Place an order on your own site and pay with Razorpay's test UPI / test card (listed on their "Test card details" help page). The order turns **Paid**, and **Admin → Dashboard → Online payments — Razorpay** shows it. Try a refund from the order too.

On a laptop (no https) the webhook cannot reach you; payments are still confirmed when the customer comes back to the site, and the site re-checks with Razorpay every few minutes.

### Step 2 — prepare the website (Razorpay's team checks it during KYC)

- Put the site on its **real domain with https** (see Deploy). Razorpay rejects sites on localhost, IP addresses or "coming soon" pages.
- Fill **Admin → Settings → Business details**: registered business name (same as on your PAN / bank account), full address, support hours, grievance officer, GSTIN if you have one, delivery time, and the support **email** and **phone**.
- These appear on the five pages Razorpay looks for, all linked in the site footer: **Contact Us** (`#/contact`), **Terms & Conditions** (`#/terms`), **Privacy Policy** (`#/privacy`), **Shipping & Delivery** (`#/shipping`) and **Cancellation, Return & Refund** (`#/policy`). They are plain-language templates — have your CA or lawyer read them once.
- Remove the sample vendors (**Admin → Vendors → Remove sample vendors**) and make sure real products have real prices and photos.

### Step 3 — KYC (account activation)

In the Razorpay dashboard, choose **Activate account** and fill the form. What they ask for depends on your business type; usually:

| You are | Usually needed |
|---|---|
| Individual / sole proprietor (most small shops) | Your **PAN**, **Aadhaar** (or other address proof), a **business proof** such as GST certificate, Udyam (MSME) registration or Shop & Establishment licence, and a **bank account** in your / the shop's name (cancelled cheque or statement) |
| Partnership / LLP / Pvt Ltd | Business **PAN**, registration certificate / partnership deed, **GST** certificate if registered, the signatory's PAN + ID, and a **current account** in the business's name |

Tips that avoid delays:
- **Business category:** choose the one closest to what you sell (wedding / event services, or e-commerce). In "business description" write plainly: *"Online store for wedding puja samagri and services (Pandit Ji, tent, catering…) in Bihar and UP; customers also pay advances for local vendors booked through the site, which we pass on to the vendors."*
- Use the **same name** everywhere (PAN, bank account, website Business details).
- Website URL in the form = your live https domain; the Contact page must show the same phone / email you give Razorpay.
- Razorpay may ask about vendor advances you collect and pass on (a marketplace). Answer honestly; they may suggest **Razorpay Route** (their marketplace product). If they ask you not to collect for vendors, customers can still pay vendors directly — tell the team and we can switch online payment off for vendor bookings only.
- Activation usually takes a few working days; Razorpay emails if a document needs redoing.

### Step 4 — switch to live

1. After activation, switch the dashboard to **Live Mode** → **API Keys → Generate Key** (`rzp_live_…`).
2. On the server put them in `.env` (or the host's environment settings) — `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — and restart; or paste them in **Admin → Go-live, Payments & SMS**. Press **Test keys**. The Admin dashboard badge changes from "Test mode" to **Live**.
3. **Webhook** (Live Mode → Account & Settings → Webhooks → Add): URL `https://YOUR-DOMAIN/api/payments/webhook`, a secret of your choice, events **payment.authorized, payment.captured, payment.failed, refund.processed, refund.failed** (`order.paid` is also understood). Put the same secret in `RAZORPAY_WEBHOOK_SECRET` or in Admin. This confirms payments even when the customer closes the page right after paying, and tells the site when a refund reaches — or bounces from — the customer's bank.
4. Make one small real payment yourself and refund it from Admin, to see the whole loop with real money.
5. Razorpay sends the money (minus its fee, about 2% + GST on most methods — see their pricing page) to your bank account, usually 2 working days later. Exact fees and settlements are in the Razorpay dashboard.

### What customers get

At checkout:
- **Pay online now:** the full amount, by UPI (GPay / PhonePe / Paytm), card, net banking or wallet.
- **Pay advance online:** saman plus the booking advance % now, with the balance on the function day.
- **Cash on Delivery:** as before.
- Vendor bookings: once the vendor confirms, the family can pay the vendor's advance (or everything) online; the team passes it on to the vendor (Admin → Vendor Bookings → payout) or refunds it if the booking is called off.

How it works:
- Every payment is checked on the server with Razorpay's signature **and** Razorpay's own record (right order, right amount, money captured), so fake "paid" messages are rejected. Money only "held" by the bank is captured automatically.
- An unpaid online order holds its slots for **30 minutes**, then cancels automatically and frees them. Customers can **retry the payment** or **switch to cash** from the order page or Track Order. A payment that arrives late brings the order back and flags it for the team.
- **Refunds:** Admin → Orders → open the order → **Refund via Razorpay** (full or part; split over several payments when needed). A refund the bank sends back shows in red under "Needs your attention" to be redone.
- **Admin → Dashboard → Online payments — Razorpay:** received, refunded and net online money, money held for vendors, customers paying right now, failed / unfinished payments, payment methods, a daily chart and the latest payments and refunds with their Razorpay IDs.

## SMS OTP login

- Customers log in or sign up with **mobile number + OTP**, with no password. Password login still works, and admins always use a password.
- **Test mode** (the default) sends no SMS; the OTP is printed in the server window. Use it to try everything for free.
- To send real SMS, go to Admin → Go-live, Payments & SMS → SMS provider:
  - **Fast2SMS:** paste the API key (Fast2SMS → Dev API). It uses their OTP route.
  - **Custom SMS URL:** works with MSG91, 2Factor or any provider. Paste the provider's send URL with `{phone}` and `{otp}` where the number and code go. Use **Send test SMS** to check it. In India, OTP SMS needs a DLT-approved template from your provider.
- Optional: **Verify mobile by OTP before every order**. This stops fake Cash-on-Delivery orders.
- Limits: OTP valid 5 minutes, 30 s between resends, max 5 per hour per number, 5 wrong tries.

Keys can also be set as environment variables on the server (these override Admin): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SMS_PROVIDER` (`console` / `fast2sms` / `custom`), `FAST2SMS_API_KEY`, `SMS_URL_TEMPLATE`.
Keys saved in Admin are stored in `database/data/db.json`. Keep that file private and never share it.

## Photos

Sample photos are free Unsplash images linked from the internet, so they need an internet connection. Replace any of them with your own shop photos via **Admin → Products → Edit → Upload photo** (or paste a link).
The photo tables are `PRODUCT_PHOTOS` in `backend/seed.js` and `LISTING_PHOTOS` in `backend/vendors-seed.js`, which covers sample vendor items and tent / decor / DJ rental items by name. A one-time upgrade fills empty sample photos and swaps old wrong ones. It never replaces a photo uploaded by the admin or a vendor.

## What's included

**Customer side (user panel)**
- Home page with banners, category bar, "Shop by function" for every rasam, top picks, and a product row for each category
- District picker for all 113 districts (38 Bihar + 75 UP), which filters what's available where; ghar / venue location for nearest vendors
- Search, category filters, Saman / Booking filter, price range and sorting
- Product page with "what's included", district availability, a quantity and function-date picker for bookings, a 5-month availability calendar, and **Share with family**
- Cart, then checkout with saved addresses, State → District dropdowns, and Cash on Delivery, UPI or Razorpay (when switched on)
- Track Order (number + mobile, no login), cancel / return / refund requests, reviews after the service
- My Account: orders and vendor bookings with a status timeline, wishlist, profile and password, saved addresses, function dates
- English / Hindi, WhatsApp everywhere, mobile-friendly layout, add to home screen
- Contact Us, Terms, Privacy, Shipping and Refund pages

**Admin panel**
- Dashboard: sales, money received / due / refunded, the Razorpay money section, orders by status, vendor marketplace numbers, Bihar vs UP, top districts, upcoming functions and lagan load, reviews needing a reply, traffic funnel — with "Needs your attention" on top
- Orders & Bookings: search and filter, change status in one click, record payments, refunds, send a message to the customer, print, export CSV
- Booking Calendar, Vendors (verify, papers, invite, logins), Vendor Bookings (payouts / refunds), Reviews, Lagan Dates
- Products & Services: add, edit or hide; photo upload; Hindi name; price/MRP; stock; featured flag; availability in all or selected districts
- Categories, Districts (service on / off, extra delivery charge), Customers (orders and spend, block / unblock)
- Settings: store name, phone / WhatsApp / email, delivery charges, booking advance %, return / refund days, **business details for the policy pages**, home banners, announcement bar
- Go-live, Payments & SMS: a "Ready for real bookings?" checklist, Razorpay, direct UPI, SMS OTP, Google Maps, Supabase

## Data

Everything is stored in `database/data/db.json` (created on first run), and uploaded photos go in `frontend/uploads/`. Back up those two folders.
To start fresh with the sample catalog again, run `npm run reset`. **This deletes all orders and customers.**

## GST tax invoices (like Flipkart / Amazon)

Prices on the site **include GST**. Once you are GST-registered, the site issues proper tax invoices and works the tax back out of each price.

**Set up once**
1. **Admin → Settings → Business details:** your **GSTIN** (checked, including its check character), the registered business name and address. Optionally an invoice prefix (default `INV`) and whether invoices are issued automatically.
2. **Admin → Categories → Edit:** the **GST rate** and **HSN / SAC code** for each category (a banner lists categories still without a rate). A product can have its own rate / code in **Admin → Products**; empty = the category's. Rates offered: 0 (exempt), 0.25, 3, 5, 12, 18, 28, 40 %. **Ask your CA which rate and code apply** — the site never guesses a rate.

**How it works**
- **When:** the invoice is issued automatically when an order is marked **Delivered / Completed** (or press **Issue tax invoice now** in the order). If a rate is missing, the order says which items need one and no number is used.
- **Numbering:** `INV/26-27/00001`, one gap-free series per financial year (April–March), at most 16 characters as GST rules require. Once issued an invoice never changes, even if rates change later.
- **Tax:** taxable value = price × 100 / (100 + rate). Your GSTIN's state and the **place of supply** (the delivery / function address) in the same state → **CGST + SGST** (half each); different states (e.g. a Bihar shop, a UP customer) → **IGST**. Delivery charges are taxed with the goods (at the highest goods rate on the order). Items short or damaged at the door before the invoice are simply left off.
- **Each invoice shows** seller name, address, GSTIN and state code; invoice number and date; order number; customer (and their GSTIN for a business purchase); place of supply; reverse charge "No"; every line with HSN / SAC, quantity, taxable value, rate, CGST / SGST or IGST and total; totals; amount in words; "computer-generated, no signature needed".
- **Business customers (B2B):** before the invoice is issued, enter the customer's GSTIN and registered name in the order (Admin → Orders → open → Update order). It is checked and printed on the invoice.
- **Credit notes:** items returned or found short / damaged after the invoice, and orders cancelled after it, get a **credit note** (`CN/26-27/00001`) against the invoice, at the invoice's own rates — once per return.
- **Customers** see the tax invoice and credit notes on their bill page (Track Order → **🧾 Tax invoice**), and can print / save them as PDF.
- **GST report:** **Admin → Orders → GST report** — pick a month: invoices and credit notes, one row per tax rate (as GSTR-1 asks), B2B / B2C, net taxable value, CGST, SGST, IGST, the HSN summary, and delivered orders still without an invoice. **Download CSV** for your CA (GSTR-1 / GSTR-3B).
- Without a GSTIN nothing changes: customers get the simple order receipt.

## Category offers (discounts)

**Admin → Categories → Edit → Category offer:** choose **% off** (5, 10, 15 … up to 50; any value up to 90 via the API) and, if you like, the **last day** of the offer.
- Every item of that category — including flower styles / companies, kits and kit extras — shows the **offer price** with the old price crossed out and "% off"; the category page shows an offer banner and the category bar a "10% off" badge.
- The **server charges the offer price** whatever the browser sends; the saving is shown on the bill ("You saved") and each line says "offer applied".
- GST on tax invoices is worked out on the offer price (the price actually paid).
- The offer stops by itself after its last day; set 0 % to stop it earlier. Admin always sees and edits the normal price.
- Local vendors in the marketplace set their own prices; category offers apply to the shop's own items.

## Website policy pages & business details

The site has the five pages payment gateways and customers expect, linked in the footer: **Contact Us**, **Terms & Conditions**, **Privacy Policy**, **Shipping & Delivery**, and **Cancellation, Return & Refund**. Charges, return days and districts come from your settings automatically. Your business name, address, GSTIN, support hours, grievance officer and delivery time come from **Admin → Settings → Business details** — nothing is invented; lines you leave empty are simply not shown. The "Ready for real bookings?" checklist reminds you until they are filled in.

## Going live — checklist

1. **Host** the site on a server with a domain and **https** (see Deploy), with `TRUST_PROXY=1` behind a proxy and persistent storage for `database/data` and `frontend/uploads`.
2. **Admin password:** read it from `ADMIN-LOGIN.txt`, save it, delete the file; change it in Admin → Settings.
3. **Settings:** store name, support phone / WhatsApp / email, delivery charges, advance %, **Business details** (and GSTIN + category GST rates if you are GST-registered — see GST tax invoices).
4. **Real catalog & vendors:** real prices and photos; add and verify real vendors; **remove sample vendors**.
5. **Payments:** add your UPI ID (works at once), then Razorpay — test keys first, KYC, live keys and webhook (see Online payment).
6. **SMS OTP:** set up the SMS provider and switch on "Verify mobile by OTP before every order" to stop fake orders.
7. **Backups:** connect Supabase (live copy) and/or back up `database/data` and `frontend/uploads` daily.
8. Work through **Admin → Go-live, Payments & SMS → Ready for real bookings?** until every line is green.
