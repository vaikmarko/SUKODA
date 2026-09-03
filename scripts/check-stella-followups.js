/**
 * One-off: list all 'followups' docs queued for Stella's order.
 *   node scripts/check-stella-followups.js
 */
const https = require('https');

const PROJECT_ID = 'sukoda-77b52';
const FIREBASE_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const ORDER_ID = process.argv[2] || 'tRafaJH0e0tpbjzbzSvE';

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
    path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
  }, JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'followups' }],
      where: { fieldFilter: { field: { fieldPath: 'orderId' }, op: 'EQUAL', value: { stringValue: ORDER_ID } } },
      limit: 100,
    },
  }));

  const docs = (r.data || []).filter((d) => d.document).map((d) => {
    const ff = {};
    for (const k of Object.keys(d.document.fields || {})) ff[k] = fromV(d.document.fields[k]);
    return { id: d.document.name.split('/').pop(), ...ff };
  });

  console.log(`Followups for order ${ORDER_ID}: ${docs.length}`);
  for (const f of docs) {
    console.log(`  [${f.id}] stage=${f.stage}  status=${f.status}  sendAt=${f.sendAt}  visitDate=${f.visitDate}  to=${f.recipientEmail}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
