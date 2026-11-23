#!/usr/bin/env node
/**
 * Renders the desk-side e-mail templates with sample data into a folder, to look at them in a browser.
 * Sends nothing and reads nothing from Firestore.   node scripts/email-preview.js <out-dir>
 */
const fs = require('fs');
const path = require('path');
const out = process.argv[2];
if (!out) { console.error('Usage: node scripts/email-preview.js <out-dir>'); process.exit(1); }
const functions = require('../functions/node_modules/firebase-functions');
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TZ = 'Europe/Tallinn';
const loc = (lang) => ({ et: 'et-EE', en: 'en-GB', ru: 'ru-RU' }[lang] || 'et-EE');
const { emails } = require('../functions/haldus')({
  functions, admin: {}, db: {}, cors: () => {}, SECRETS: [], checkRateLimit: () => true,
  authenticateAdmin: () => null, authenticateClient: () => null, sendEmail: () => {}, sendClientMagicLink: () => {},
  getStripe: () => null,
  formatDate: (d, lang) => new Intl.DateTimeFormat(loc(lang), { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(d),
  formatTime: (d) => new Intl.DateTimeFormat('et-EE', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(d),
  tallinnLocalDateTimeToISOString: (d, t) => `${d}T${t}:00+02:00`, tallinnParts: () => ({}), escapeHtml: esc, calService: null, NOTIFICATION_EMAIL: 'x@example.com',
});

const order = { customerName: 'Mari Tamm', customer: { name: 'Mari Tamm', email: 'mari@example.com' }, customerAddress: 'Pirita tee 12, Tallinn', address: 'Pirita tee 12, Tallinn', lang: 'et', ownerKind: 'provider-invited', providerName: 'Kristi Kask' };
const start = new Date('2026-12-08T08:00:00Z');
const booking = { scheduledAt: start, endTime: new Date('2026-12-08T10:00:00Z'), address: order.address, price: '60 €' };
const provider = { id: 'p1', name: 'Kristi Kask', email: 'kristi@example.com', services: ['cleaning'], lang: 'et' };
const request = { serviceId: 'extra-clean', note: 'Aknad enne külalisi', preferredDate: '2026-12-08', timeWindow: 'any', status: 'requested' };
const samples = {
  'tere-tulemast': () => emails.welcomeEmail({ order, providerName: 'Kristi Kask', portalUrl: 'https://sukoda.ee/minu', lang: 'et', firstWhen: 'teisipäev, 8. detsember, 10:00' }),
  'visiit-kinnitatud': () => emails.visitEmail({ kind: 'confirmed', order, booking, provider, providerName: 'Kristi Kask', lang: 'et' }),
  'visiit-meeldetuletus': () => emails.visitEmail({ kind: 'reminder', order, booking, provider, providerName: 'Kristi Kask', lang: 'et' }),
  'visiit-muudetud': () => emails.visitEmail({ kind: 'rescheduled', order, booking, provider, providerName: 'Kristi Kask', lang: 'et', oldStart: new Date('2026-12-07T08:00:00Z') }),
  'visiit-tyhistatud': () => emails.visitEmail({ kind: 'cancelled', order, booking, provider, providerName: 'Kristi Kask', lang: 'et' }),
  'ajad': () => emails.scheduleEmail({ order, bookings: [booking, { ...booking, scheduledAt: new Date('2026-12-22T08:00:00Z'), endTime: new Date('2026-12-22T10:00:00Z') }], providerName: 'Kristi Kask', lang: 'et' }),
  'soov-vastu-voetud': () => emails.requestReceivedEmail({ order, request, requestId: 'r1', providerName: 'Kristi Kask', lang: 'et' }),
  'soov-vastus': () => emails.requestAnsweredEmail({ order, request, requestId: 'r1', providerName: 'Kristi Kask', message: 'Saan tulla neljapäeval kell 11.', lang: 'et' }),
  'soov-ara-oeldud': () => emails.requestDeclinedEmail({ order, request, requestId: 'r1', providerName: 'Kristi Kask', message: 'Sel nädalal ei jõua.', lang: 'et' }),
  'sonum-kliendile': () => emails.requestMessageEmail({ toSide: 'client', order, request, requestId: 'r1', fromName: 'Kristi Kask', text: 'Pakun aega: neljapäev, 26. november kell 11:00.', lang: 'et' }),
  'uus-soov-koristajale': () => emails.providerNewRequestEmail({ order, request, placed: null }),
  'kood-toolaud': () => emails.providerSignupAccessEmail({ code: '618467', url: 'https://sukoda.ee/haldus', lang: 'et' }),
  'kood-klient': () => emails.loginCodeEmail('618467', 'et'),
  'kood-klient-ru': () => emails.loginCodeEmail('618467', 'ru'),
  'link-toolaud': () => emails.providerMagicLinkEmail('https://sukoda.ee/haldus'),
  'pakett-aktiivne': () => emails.planActivatedEmail({ provider, plan: 'pro' }),
  'visiit-tehtud': () => emails.visitDoneEmail({ order, provider, note: 'Kõik korras, aknad pestud.', items: [], lang: 'et' }),
};
fs.mkdirSync(out, { recursive: true });
const links = [];
for (const [name, make] of Object.entries(samples)) {
  try {
    const mail = make();
    fs.writeFileSync(path.join(out, `${name}.html`), mail.html);
    links.push(`<li><a href="${name}.html">${esc(mail.subject)}</a></li>`);
  } catch (e) { console.error(`${name}: ${e.message}`); }
}
fs.writeFileSync(path.join(out, 'index.html'), `<meta charset="utf-8"><ul>${links.join('')}</ul>`);
console.log(`${links.length}/${Object.keys(samples).length} written to ${out}`);
