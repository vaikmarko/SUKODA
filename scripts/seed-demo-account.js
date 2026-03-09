/**
 * SUKODA Demo Account Seeder
 * 
 * Creates a demo order in Firestore with pre-filled home profile data
 * and a portal session token for demonstration purposes.
 * 
 * Usage: cd functions && node ../scripts/seed-demo-account.js
 * Requires: Firebase CLI to be logged in (firebase login)
 */

const crypto = require('crypto');
const https = require('https');

const PROJECT_ID = 'sukoda-77b52';
const FIREBASE_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const configStore = require(require('os').homedir() + '/.config/configstore/firebase-tools.json');
const refreshToken = configStore.tokens?.refresh_token;

if (!refreshToken) {
  console.error('No Firebase CLI refresh token found. Run: firebase login');
  process.exit(1);
}

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function getAccessToken() {
  const params = new URLSearchParams({
    client_id: FIREBASE_CLIENT_ID,
    client_secret: FIREBASE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await httpRequest({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }, params.toString());

  if (res.data.access_token) return res.data.access_token;
  throw new Error('Failed to get access token: ' + JSON.stringify(res.data));
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function createDocument(accessToken, collection, docId, data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }

  const path = docId
    ? `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`
    : `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}`;

  const res = await httpRequest({
    hostname: 'firestore.googleapis.com',
    path,
    method: docId ? 'PATCH' : 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }, JSON.stringify({ fields }));

  if (res.status >= 400) {
    throw new Error(`Firestore error (${res.status}): ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

async function seed() {
  console.log('Getting access token...');
  const accessToken = await getAccessToken();
  console.log('Authenticated.');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenExpiry = new Date();
  tokenExpiry.setFullYear(tokenExpiry.getFullYear() + 1);

  const now = new Date();
  const nextVisit = new Date(now);
  nextVisit.setDate(nextVisit.getDate() + 7);
  nextVisit.setHours(10, 0, 0, 0);

  const pastVisit = new Date(now);
  pastVisit.setDate(pastVisit.getDate() - 14);
  pastVisit.setHours(10, 0, 0, 0);

  const DEMO_ORDER_ID = 'demo-maria-tamm';

  const orderData = {
    type: 'subscription',
    package: 'twice',
    size: 'medium',
    status: 'paid',
    subscriptionStatus: 'active',
    lang: 'et',
    customer: {
      name: 'Maria Tamm',
      email: 'demo@sukoda.ee',
      phone: '+372 5123 4567',
      address: 'Regati pst 1, Pirita, 11911 Tallinn',
    },
    homeProfile: {
      access: 'Vajutage uksekella nr 5 maja ees. Kui kedagi pole kodus, kood on 4521#',
      pets: 'Kass Mia, kartlik \u2014 peidab end magamistoa voodi alla. Palun \u00e4rge laske v\u00e4lja.',
      allergies: 'Palun kasutage l\u00f5hnavabu puhastusvahendeid. Eelistame \u00f6ko-tooteid.',
      flowerPreference: 'Valged pojengid v\u00f5i ranunklid. Mitte roosid. Vaas on k\u00f6\u00f6gis akna all.',
      linens: 'Puhas voodipesu on magamistoa kapi \u00fclemisel riiulil, vasakul pool.',
      towels: 'Puhtad r\u00e4tikud on vannitoa kapi alumisel riiulil.',
      specialRequests: 'Palun kastke elutoa taimed (3 potti akna all). K\u00f6\u00f6gis olev basiilik vajab samuti vett.',
      updatedAt: now,
    },
    sessionTokenHash: tokenHash,
    sessionTokenExpiresAt: tokenExpiry,
    paidAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    totalVisits: 3,
    referralCode: 'SOOVITA-DEMO1',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: now,
  };

  console.log('Creating demo order...');
  await createDocument(accessToken, 'orders', DEMO_ORDER_ID, orderData);
  console.log('Demo order created:', DEMO_ORDER_ID);

  console.log('Creating demo bookings...');
  await createDocument(accessToken, 'bookings', null, {
    orderId: DEMO_ORDER_ID,
    customerName: 'Maria Tamm',
    customerEmail: 'demo@sukoda.ee',
    size: 'medium',
    status: 'confirmed',
    scheduledAt: nextVisit,
    endTime: new Date(nextVisit.getTime() + 90 * 60 * 1000),
    createdAt: now,
  });

  await createDocument(accessToken, 'bookings', null, {
    orderId: DEMO_ORDER_ID,
    customerName: 'Maria Tamm',
    customerEmail: 'demo@sukoda.ee',
    size: 'medium',
    status: 'completed',
    scheduledAt: pastVisit,
    endTime: new Date(pastVisit.getTime() + 90 * 60 * 1000),
    completedAt: new Date(pastVisit.getTime() + 85 * 60 * 1000),
    createdAt: now,
  });
  console.log('Demo bookings created (1 upcoming, 1 past)');

  console.log('\n========================================');
  console.log('  Demo konto loodud!');
  console.log('========================================');
  console.log(`\nPortaali URL:\nhttps://sukoda.ee/minu?token=${rawToken}`);
  console.log('\nSalvesta see URL -- sellega saad alati portaali sisse.');
  console.log('Token kehtib 1 aasta.\n');
}

seed().then(() => process.exit(0)).catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
