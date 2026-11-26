// Reset the admin password (also works if you forgot it). Stop the server first, then:
//   npm run reset-admin -- "YourNewPassword"     → sets that password
//   npm run reset-admin                           → creates a strong random one
// The new password is saved to database/data/ADMIN-LOGIN.txt (private, never in git) — read it, then delete the file.
// Only the admin password changes; orders, customers and vendors are untouched. Admin login sessions are signed out.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', 'database', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
if (!fs.existsSync(DB_FILE)) { console.error('No database found at', DB_FILE, '— start the server once first.'); process.exit(1); }

// same scrypt "salt:hash" format the server uses (backend/server.js hashPassword)
const hashPassword = (pw, salt = crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(String(pw), salt, 64).toString('hex')}`;
const strong = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; const b = crypto.randomBytes(12); return 'Vs@' + [...b].map(x => a[x % a.length]).join(''); };

const given = process.argv[2];
if (given && given.length < 8) { console.error('Use at least 8 characters.'); process.exit(1); }
const pw = given || strong();

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const admin = (db.users || []).find(u => u.role === 'admin');
if (!admin) { console.error('No admin account found.'); process.exit(1); }
admin.password = hashPassword(pw);
// sign the admin out everywhere so the old password can't keep a session alive
// sessions are { token: userId } (older data may keep { userId } objects)
if (db.sessions && typeof db.sessions === 'object') for (const [k, s] of Object.entries(db.sessions)) if (s === admin.id || (s && s.userId === admin.id)) delete db.sessions[k];
fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db, null, 2));
fs.renameSync(DB_FILE + '.tmp', DB_FILE);

const note = path.join(DATA_DIR, 'ADMIN-LOGIN.txt');
fs.writeFileSync(note, `Vivah Saathi admin login (reset ${new Date().toISOString()})\nURL:      /admin\nMobile:   ${admin.phone}\nPassword: ${pw}\n\nDelete this file after you have saved the password somewhere safe.\n`);
console.log(`Admin password reset for mobile ${admin.phone}.`);
console.log(`The new password is in ${path.relative(path.join(__dirname, '..'), note)} (private file, not in git).`);
