/**
 * One-off: dump a single order doc as JSON. Read-only.
 *   node scripts/inspect-order.js <orderId>
 */
const https = require('https');

const PROJECT_ID = 'sukoda-77b52';
const FIREBASE_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const orderId = process.argv[2];
if (!orderId) { console.error('Usage: node scripts/inspect-order.js <orderId>'); process.exit(1); }

const refreshToken = require(require('os').homedir() + '/.config/configstore/firebase-tools.json').tokens.refresh_token;

function http(opts, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: d }); } });
    });
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

function fromV(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) { const o = {}; for (const k of Object.keys(v.mapValue.fields || {})) o[k] = fromV(v.mapValue.fields[k]); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromV);
  return null;
}

(async () => {
  const tres = await http({
    hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }, new URLSearchParams({
    client_id: FIREBASE_CLIENT_ID, client_secret: FIREBASE_CLIENT_SECRET,
    refresh_token: refreshToken, grant_type: 'refresh_token',
  }).toString());
  const t = tres.data.access_token;

  const r = await http({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/orders/${orderId}`,
    method: 'GET', headers: { Authorization: `Bearer ${t}` },
  });
  if (r.status >= 400) { console.error(r.data); process.exit(1); }
  const f = {};
  for (const k of Object.keys(r.data.fields || {})) f[k] = fromV(r.data.fields[k]);

  const masked = JSON.parse(JSON.stringify(f));
  if (masked.sessionTokenHash) masked.sessionTokenHash = '<masked>';
  if (masked.stripeCustomerId) masked.stripeCustomerId = '<masked>';
  if (masked.stripeSubscriptionId) masked.stripeSubscriptionId = '<masked>';
  console.log(JSON.stringify(masked, null, 2));

  console.log('\nLooking for matching bookings...');
  const br = await http({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
  }, JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'bookings' }],
      where: { fieldFilter: { field: { fieldPath: 'orderId' }, op: 'EQUAL', value: { stringValue: orderId } } },
      limit: 50,
    },
  }));
  const docs = (br.data || []).filter((d) => d.document).map((d) => {
    const ff = {};
    for (const k of Object.keys(d.document.fields || {})) ff[k] = fromV(d.document.fields[k]);
    return { id: d.document.name.split('/').pop(), ...ff };
  });
  console.log(`Bookings: ${docs.length}`);
  for (const b of docs) {
    console.log(`  [${b.id}] scheduledAt=${b.scheduledAt} status=${b.status} size=${b.size} manual=${!!b.isManualEntry}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
