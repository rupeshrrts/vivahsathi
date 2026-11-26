# Vivah Saathi

Vivah Saathi is a wedding marketplace for Bihar and Uttar Pradesh. Customers can shop for wedding essentials and discover, compare, and book local vendors.

- Coverage: 38 districts in Bihar and 75 districts in Uttar Pradesh.
- Storefront, admin panel, and vendor panel run from the Node.js server.
- An Expo mobile app can connect to the same server.

## Table of contents

- [Run locally](#run-locally)
- [Project structure](#project-structure)
- [Push to GitHub](#push-to-github)
- [CI and deployment](#ci-and-deployment)
- [Data, privacy, and backups](#data-privacy-and-backups)
- [Customer features](#customer-features)
- [Vendor marketplace](#vendor-marketplace)
- [Admin features](#admin-features)
- [Payments, SMS, and tax](#payments-sms-and-tax)
- [Go-live checklist](#go-live-checklist)

## Run locally

Install Node.js 24 LTS, then run:

```bash
npm start
```

Open these pages:

- Storefront: http://localhost:3000
- Admin panel: http://localhost:3000/admin
- Vendor panel: http://localhost:3000/vendor

The root server has no npm dependencies to install. The mobile app has its own setup instructions in [mobile-app/README.md](mobile-app/README.md).

### Useful commands

| Command | Purpose |
|---|---|
| `npm start` | Start the production server |
| `npm run dev` | Restart the server when files change |
| `npm run check` | Run the project syntax checks |
| `npm run reset-admin -- "NewPassword"` | Set a new admin password; stop the server first |
| `npm run export-sql` | Export the database schema and data to PostgreSQL SQL |
| `npm run reset` | Restore sample data; **this deletes orders and customers** |

## Project structure

```text
backend/                 Node.js server, APIs, integrations, and seed data
frontend/                Storefront, admin/vendor interfaces, and uploads
database/schema.sql      PostgreSQL / Supabase schema
database/export.js       SQL export command
database/rows.js         Data mapping for SQL export and Supabase sync
database/data/           Private runtime database and vendor documents
mobile-app/              Expo mobile app
scripts/                 Syntax check and admin password utilities
.github/workflows/       GitHub Actions checks
Dockerfile               Production container definition
```

## Push to GitHub

The repository ignores `.env`, `database/data/`, and `frontend/uploads/`. These may contain credentials, customer information, orders, vendor documents, and uploaded files. Keep them private and do not commit them.

1. Create a private, empty GitHub repository.
2. From the project folder, run:

```bash
git init
git add .
git commit -m "Vivah Saathi"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/vivah-saathi.git
git push -u origin main
```

The existing GitHub Actions workflow runs checks, starts the server for basic health checks, builds the Docker image, and exports the Android app. It verifies the project but does not deploy it.

## CI and deployment

### Recommended setup

For a straightforward deployment, use GitHub Actions for checks and Docker builds, then run the app as **one container on a host with persistent storage**.

1. Let GitHub Actions run tests and build the image on its hosted runner. This keeps build work off the production server.
2. Deploy the finished image to a VPS or a Docker host.
3. Mount persistent storage for the database and uploads, and configure secrets as environment variables on the host.
4. Put the app behind HTTPS and a reverse proxy.
5. Back up the database and uploads regularly; test that you can restore them.

The current workflow is in `.github/workflows/check.yml`. It is CI only; a deployment step must be added for your chosen hosting provider.

### Important: run one replica

The app keeps its active database in memory and saves it to a JSON file. Run **one app replica** and use persistent storage for:

- `DATA_DIR` — database and private vendor documents.
- `UPLOAD_DIR` — public uploaded images.

For a single persistent volume mounted at `/mnt/vivah`, set:

```text
DATA_DIR=/mnt/vivah/data
UPLOAD_DIR=/mnt/vivah/uploads
```

Do not run multiple replicas until the application has been migrated to shared transactional storage, shared session and rate-limit state, and shared object storage. Supabase sync is useful for recovery, but it does not make the JSON file a multi-server database.

### Docker

Build and run the container:

```bash
docker build -t vivah-saathi .
docker run -d --name vivah-saathi -p 3000:3000 `
  -v vs-data:/app/database/data `
  -v vs-uploads:/app/frontend/uploads `
  --env-file .env vivah-saathi
```

On Linux or macOS, replace the PowerShell line-continuation backtick with `\`.

The image is based on Node.js 24 Alpine. The Dockerfile creates the runtime directories and runs the app as the non-root `node` user.

### VPS or managed Docker host

- **VPS:** install Node.js 24 or Docker, configure HTTPS with Nginx or another reverse proxy, and keep the service running with systemd or PM2.
- **Render, Railway, or Fly.io:** deploy the Dockerfile and attach a persistent volume.
- Set `TRUST_PROXY=1` when running behind a trusted proxy so login and OTP limits can identify client addresses correctly.
- Use `/healthz` for liveness checks and `/readyz` for readiness checks. Readiness reports an unhealthy database write state with HTTP 503.

Deployment itself does not reduce application traffic. To reduce requests served by the app, put a CDN such as Cloudflare in front and cache static assets and images. Do not cache API responses, admin pages, or authenticated vendor pages.

## Data, privacy, and backups

- Runtime data is stored in `database/data/db.json` by default.
- Private vendor documents are stored under `database/data/docs/`.
- Public uploads are stored in `frontend/uploads/` by default.
- Back up the database, private documents, and public uploads. Verify that a restore works.
- Keep backups and SQL exports private; they can contain customer phone numbers and other personal information.
- Do not put credentials in source code or commit `.env`.

Supabase can keep a live copy of application data. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`; `SUPABASE_ACCESS_TOKEN` is recommended for automatic schema setup. You can also configure Supabase through **Admin → Go-live, Payments & SMS**. The app continues to use its local data file as its live store; edits made directly in Supabase are not synced back. Vendor documents and uploaded photos still need their own persistent storage and backups.

To export SQL:

```bash
npm run export-sql
```

This writes `database/export.sql`. The export includes application records, but not login sessions or API keys. Passwords remain hashed. Keep the export private.

## Customer features

- Browse products and services for wedding functions such as Tilak, Haldi, Mehndi, Vivah, Baraat, and Reception.
- Search and filter by category, state, district, price, availability, and other relevant details.
- Add products, services, and ready-made packages to a cart.
- Book services for specific function dates and check availability before checkout.
- Check out as a guest with a name, mobile number, address, and district.
- Track orders with an order number and mobile number; registered customers can also use My Account.
- View bills, payment history, refunds, and (when configured) GST invoices and credit notes.
- Share products and vendor pages using WhatsApp.
- Use the site in English or Hindi and add it to a mobile home screen.

## Vendor marketplace

Customers can search, compare, and request bookings from vendors across Bihar and Uttar Pradesh. Marketplace categories include:

- Cars, owner-drivers, and dulha-entry services.
- Halwai, caterers, ration, vegetables, and sweet shops.
- Photographers, studios, DJs, Pandit Ji, artists, and orchestras.
- Tent, shamiyana, decoration, flowers, band, mehndi, and makeup.
- Marriage venues, wedding wear, puja items, gifts, and invitation cards.

Marketplace capabilities include:

- Search, location, price, rating, and availability filters.
- Vendor profiles with contact details, portfolios, reviews, and availability calendars.
- Stock and capacity checks to prevent overbooking.
- Vendor-controlled prices, inventory, booking limits, and blocked dates.
- Customer reviews after completed orders or bookings.
- Booking requests tracked by booking number and mobile number.

### Specialized booking and shopping options

- **Book a Car:** compare individual vehicles by vendor, seats, AC, price, and availability. Car owners can apply to list their own vehicle.
- **Halwai and catering:** compare prices by guest count. Halwais can list dishes and guest-based prices.
- **Shaadi ration:** plan ingredient quantities by guest count, compare shop quotations, and compare prices by unit.
- **Tent and rental items:** select equipment by date and quantity; availability is checked against the vendor's inventory.
- **Invitation cards and sweets:** compare designs, bulk prices, minimum orders, packaging, stock, and required delivery dates.
- **Pandit Ji and multi-function bookings:** schedule services across multiple wedding functions and dates.
- **Lagan dates:** Pandit Ji or admins can publish auspicious dates; vendors can configure lagan-day prices.
- **Nearby vendors:** customers can search by location. The site uses OpenStreetMap by default; Google Maps can be configured optionally.

### Vendor registration and verification

Vendors register through **Join as Vendor / Artist** and remain hidden until approved by an admin. Once approved, they can use the vendor panel to manage bookings, prices, stock, availability, profile details, and photos.

- Vendors must provide applicable identity and business documents for review.
- Aadhaar is not mandatory. If supplied, use masked Aadhaar.
- PAN is optional unless needed for the business's payment or tax requirements.
- Only admins and the relevant vendor can access private verification documents.
- Never publish a real person's profile without their consent.
- Sample vendors are demonstration data, not verified businesses. Remove them before launch via **Admin → Vendors → Remove sample vendors**.

## Admin features

The admin panel includes:

- Dashboard analytics for orders, payments, customers, vendors, reviews, and traffic.
- Order and booking management, status updates, payments, refunds, messages, printing, and CSV export.
- Vendor approval, document review, vendor accounts, invitations, and booking management.
- Product, service, category, district, customer, and site settings.
- Booking calendar, reviews, lagan dates, and business details.
- A go-live checklist for payments, SMS, maps, Supabase, and other production settings.

The admin panel polls for new orders periodically. Use a strong admin password and remove the generated login file after saving the password securely.

## Logins and account safety

On the first run, the admin password is taken from `ADMIN_PASSWORD` if it meets the minimum length requirement. Otherwise, a random password is generated and saved to `DATA_DIR/ADMIN-LOGIN.txt`. Read it, store it securely, then delete the file.

- Change the admin password in **Admin → Settings**.
- If you lose it, stop the server and run `npm run reset-admin`.
- Do not commit `ADMIN-LOGIN.txt` or share it.
- The app applies limits to failed logins, OTP attempts, and order or booking lookups.

## Payments, SMS, and tax

### Direct UPI

Set a UPI ID and display name in **Admin → Go-live, Payments & SMS**. Customers can pay using a UPI app and provide the UTR/reference number; an admin must verify receipt.

### Razorpay

Online payments are disabled until configured. Start with Razorpay test keys, verify test orders, complete account activation and KYC, then add live keys and configure the webhook:

```text
https://YOUR-DOMAIN/api/payments/webhook
```

Keep API keys and webhook secrets in the host's environment settings or the admin configuration; never commit them. Review Razorpay's current requirements and fees directly with Razorpay. Vendor marketplace payments may require additional approval or a marketplace product.

### SMS OTP

OTP can be tested locally without sending SMS. To send real messages, configure Fast2SMS or a compatible custom SMS provider in **Admin → Go-live, Payments & SMS**. Indian OTP messages may require a DLT-approved template. You can optionally require OTP verification before checkout.

### GST invoices

If the business is GST-registered, configure the GSTIN and business details, and assign the correct GST and HSN/SAC codes to categories or products. Ask a qualified tax professional to confirm applicable rates and codes. The app can issue tax invoices, credit notes, and GST reports. Without GST configuration, customers receive the standard order receipt.

## Go-live checklist

1. Deploy to a server with a domain, HTTPS, persistent storage, and `TRUST_PROXY=1` when behind a proxy.
2. Set and securely store the admin password; delete `ADMIN-LOGIN.txt`.
3. Enter business contact details, delivery settings, and policy information.
4. Add real products, prices, photos, and verified vendors. Remove sample vendors.
5. Configure UPI and, if needed, test and activate Razorpay.
6. Configure an SMS provider if you need real OTP messages.
7. Set up Supabase and/or scheduled backups for the database and uploads.
8. Use **Admin → Go-live, Payments & SMS** to complete the remaining checks.
