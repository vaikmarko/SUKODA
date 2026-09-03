/**
 * Quick diagnostic: list all orders with key identifying fields.
 * One-off helper. Safe (read-only). Delete after use if desired.
 *   node scripts/list-orders-quick.js
 *   node scripts/list-orders-quick.js --search foo   # case-insensitive substring filter
 */

const https = require('https');

const PROJECT_ID = 'sukoda-77b52';
const FIREBASE_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const args = (() => {
  const a = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].startsWith('--')) {
      out[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? (i += 1, a[i]) : true;
    }
  }
  return out;
})();
const SEARCH = (args.search || '').toString().toLowerCase();

const refreshToken = (() => {
  try {
    return require(require('os').homedir() + '/.config/configstore/firebase-tools.json').tokens.refresh_token;
  } catch { return null; }
})();
if (!refreshToken) { console.error('Run: firebase login'); process.exit(1); }

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
  if ('mapValue' in v) {
    const o = {};
    for (const k of Object.keys(v.mapValue.fields || {})) o[k] = fromV(v.mapValue.fields[k]);
    return o;
  }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromV);
  return null;
}

async function token() {
  const p = new URLSearchParams({
    client_id: FIREBASE_CLIENT_ID,
    client_secret: FIREBASE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const r = await http({
    hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }, p.toString());
  if (!r.data.access_token) throw new Error(JSON.stringify(r.data));
  return r.data.access_token;
}

async function main() {
  const t = await token();
  const all = [];
  let pt = null;
  do {
    const r = await http({
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/orders?pageSize=300${pt ? `&pageToken=${encodeURIComponent(pt)}` : ''}`,
      method: 'GET', headers: { Authorization: `Bearer ${t}` },
    });
    if (r.status >= 400) { console.error(r.data); process.exit(1); }
    for (const d of (r.data.documents || [])) {
      const id = d.name.split('/').pop();
      const f = {};
      for (const k of Object.keys(d.fields || {})) f[k] = fromV(d.fields[k]);
      all.push({ id, ...f });
    }
    pt = r.data.nextPageToken || null;
  } while (pt);

  console.log(`Total orders: ${all.length}`);

  const matchSearch = (o) => {
    if (!SEARCH) return true;
    const blob = JSON.stringify(o).toLowerCase();
    return blob.includes(SEARCH);
  };

  const filtered = all.filter(matchSearch);
  console.log(`${SEARCH ? `Filtered by "${SEARCH}": ` : ''}showing ${filtered.length}\n`);

  for (const o of filtered) {
    const c = o.customer || {};
    const r = o.recipient || {};
    console.log(`[${o.id}]`);
    console.log(`  type=${o.type}  status=${o.status}  sub=${o.subscriptionStatus || '-'}  pkg=${o.package}/${o.size}`);
    console.log(`  customer:  name="${c.name || ''}"  email="${c.email || ''}"  phone="${c.phone || ''}"`);
    if (Object.keys(r).length) console.log(`  recipient: name="${r.name || ''}"  email="${r.email || ''}"`);
    if (o.giftCode) console.log(`  giftCode=${o.giftCode}`);
    if (o.createdAt) console.log(`  createdAt=${o.createdAt}`);
    console.log('');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
