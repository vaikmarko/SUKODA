/**
 * SUKODA · Arco Vara demo seed
 *
 * Turns the Anna Tamm demo home (vaikmarko+anna@gmail.com) into a Kodulahe new-build
 * with the developer's after-sales team attached:
 *   - provider "Arco Vara järelteenindus" (category: warranty) → order.warrantyId
 *   - address, home type, home profile, brand line
 *   - handover folder: real PDFs (scripts/demo-docs, made by make-demo-docs.py) uploaded to GCS
 *   - building manager's technician as handyman partner → every category orderable
 *   - upkeep rhythm for a new-build apartment
 *   - three warranty requests: one done, one confirmed (with a visit), one open for the live demo
 *
 * Idempotent: fixed document ids, PATCH with updateMask. Re-run freely.
 *
 * Usage: node scripts/seed-arco-demo.js            (requires `firebase login`)
 *        node scripts/seed-arco-demo.js --email=other@example.com
 */

const https = require('https');
const fs = require('fs');

const PROJECT_ID = 'sukoda-77b52';
const FIREBASE_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const argEmail = (process.argv.find((a) => a.startsWith('--email=')) || '').split('=')[1];
const CUSTOMER_EMAIL = (argEmail || 'vaikmarko+anna@gmail.com').toLowerCase();

const PROVIDER_ID = 'arco-vara-jarelteenindus';
const HANDYMAN_ID = 'kodulahe-haldus-tehnik';
const HANDYMAN = {
  name: 'Kodulahe Haldus · tehnik',
  email: 'vaikmarko+tehnik@gmail.com',
  phone: '+372 5555 1234',
  businessName: 'Kodulahe Haldus OÜ',
};
const DOCS_BUCKET = 'sukoda-77b52-home-docs';
const DEMO_DOCS_DIR = require('path').join(__dirname, 'demo-docs');
const PROVIDER = {
  name: 'Arco Vara järelteenindus',
  email: 'vaikmarko+arco@gmail.com',
  phone: '+372 614 4630',
  businessName: 'Arco Vara AS · Kodulahe',
};

const configStore = require(require('os').homedir() + '/.config/configstore/firebase-tools.json');
const refreshToken = configStore.tokens?.refresh_token;
if (!refreshToken) { console.error('No Firebase CLI refresh token found. Run: firebase login'); process.exit(1); }

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, data }); } });
    });
    req.on('error', reject);
    if (body) req.write(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function getAccessToken() {
  const params = new URLSearchParams({ client_id: FIREBASE_CLIENT_ID, client_secret: FIREBASE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' });
  const res = await httpRequest({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, params.toString());
  if (res.data.access_token) return res.data.access_token;
  throw new Error('Failed to get access token: ' + JSON.stringify(res.data));
}

// ---- Firestore REST helpers ----
const BASE = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
let TOKEN = '';
const authHeaders = () => ({ Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' });

function toValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) if (v !== undefined) fields[k] = toValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}
function fromValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  return null;
}
function fromFields(fields) { const o = {}; for (const [k, v] of Object.entries(fields || {})) o[k] = fromValue(v); return o; }
const docIdOf = (name) => name.split('/').pop();

async function runQuery(collection, filters, limit = 20) {
  const where = filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } };
  const body = { structuredQuery: { from: [{ collectionId: collection }], where, limit } };
  const res = await httpRequest({ hostname: 'firestore.googleapis.com', path: `${BASE}:runQuery`, method: 'POST', headers: authHeaders() }, body);
  if (res.status >= 400) throw new Error(`runQuery ${collection}: ${JSON.stringify(res.data)}`);
  return (Array.isArray(res.data) ? res.data : []).filter((r) => r.document).map((r) => ({ id: docIdOf(r.document.name), ...fromFields(r.document.fields) }));
}
const eq = (field, value) => ({ fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: toValue(value) } });
const gte = (field, value) => ({ fieldFilter: { field: { fieldPath: field }, op: 'GREATER_THAN_OR_EQUAL', value: toValue(value) } });

async function getDoc(collection, id) {
  const res = await httpRequest({ hostname: 'firestore.googleapis.com', path: `${BASE}/${collection}/${id}`, method: 'GET', headers: authHeaders() });
  if (res.status === 404) return null;
  if (res.status >= 400) throw new Error(`get ${collection}/${id}: ${JSON.stringify(res.data)}`);
  return { id, ...fromFields(res.data.fields) };
}

/** PATCH only the given top-level or dotted field paths; the rest of the document is untouched */
async function patchDoc(collection, id, data, fieldPaths) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) if (v !== undefined) fields[k] = toValue(v);
  const mask = (fieldPaths || Object.keys(data)).map((p) => 'updateMask.fieldPaths=' + encodeURIComponent(p)).join('&');
  const res = await httpRequest({ hostname: 'firestore.googleapis.com', path: `${BASE}/${collection}/${id}?${mask}`, method: 'PATCH', headers: authHeaders() }, { fields });
  if (res.status >= 400) throw new Error(`patch ${collection}/${id}: ${JSON.stringify(res.data)}`);
  return res.data;
}
/** Create or fully overwrite a document with a fixed id */
async function setDoc(collection, id, data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) if (v !== undefined) fields[k] = toValue(v);
  const res = await httpRequest({ hostname: 'firestore.googleapis.com', path: `${BASE}/${collection}/${id}`, method: 'PATCH', headers: authHeaders() }, { fields });
  if (res.status >= 400) throw new Error(`set ${collection}/${id}: ${JSON.stringify(res.data)}`);
  return res.data;
}

/** Upload a local file into the home-docs bucket (uniform access; served only through the API) */
async function uploadFile(objectPath, localPath, contentType) {
  const body = fs.readFileSync(localPath);
  const res = await httpRequest({
    hostname: 'storage.googleapis.com',
    path: `/upload/storage/v1/b/${DOCS_BUCKET}/o?uploadType=media&name=${encodeURIComponent(objectPath)}`,
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': contentType, 'Content-Length': body.length },
  }, body);
  if (res.status >= 400) throw new Error(`upload ${objectPath}: ${JSON.stringify(res.data)}`);
  return body.length;
}

// ---- Demo content ----
const tallinn = (dateStr, time) => new Date(`${dateStr}T${time}:00+03:00`); // Sept–Oct: EEST
const dateStr = (d) => d.toISOString().slice(0, 10);
const rid = (s) => 'arco-' + s;

async function buildDocuments(existing, orderId) {
  const keep = (existing || []).filter((d) => !String(d.id || '').startsWith('arco-'));
  const at = (s) => new Date(s).toISOString();
  const dev = { source: 'developer', sourceName: 'Arco Vara' };
  const specs = [
    // Üleandmine ja garantii
    { id: 'doc-akt', pdf: 'akt', category: 'handover', title: 'Üleandmise-vastuvõtmise akt', note: 'Allkirjastatud 14.03.2026. Näidud üleandmisel, võtmed, panipaik ja parkimiskoht.', addedAt: at('2026-03-14T12:00:00Z') },
    { id: 'doc-garantii', pdf: 'garantii', category: 'handover', title: 'Ehitusgarantii tingimused · kehtib kuni 14.03.2028', note: '2-aastane garantii. Pöördumised siit portaalist — jõuavad otse garantiimeeskonnale.', addedAt: at('2026-03-14T12:05:00Z') },
    { id: 'doc-puudused', pdf: 'puudused', category: 'handover', title: 'Puuduste akt üleandmisel', note: '3 puudust (esiku liist, vannitoa vuuk, rõduukse tihend). Kõik kõrvaldatud 02.04.2026.', addedAt: at('2026-04-02T14:00:00Z') },
    // Omand ja lepingud
    { id: 'doc-plaan', pdf: 'plaan', category: 'ownership', title: 'Korteri plaan ja eriosade asukohad', note: '3 tuba, 68,4 m² + rõdu. Elektrikilp, ventilatsiooniseade, peakraanid, kütte kollektor.', addedAt: at('2026-03-14T12:10:00Z') },
    // Seadmed, juhendid, garantiid
    { id: 'doc-juhend', pdf: 'juhend', category: 'appliances', title: 'Kodu kasutus- ja hooldusjuhend · Iili 8', note: 'Küte, ventilatsioon, põrandad, aknad, rõdu — mida hooldada ja kui tihti.', addedAt: at('2026-03-14T12:15:00Z') },
    { id: 'doc-vent', pdf: 'vent', category: 'appliances', title: 'Ventilatsiooniseadme kasutusjuhend', note: 'Filtrid F7 / M5, vahetus iga 6 kuu. Suverežiim 2, talverežiim 3.', addedAt: at('2026-03-14T12:20:00Z') },
    { id: 'doc-kook', pdf: 'kook', category: 'appliances', title: 'Köögimööbli ja -tehnika garantii · Aunman', note: 'Mööbel 5 a, tehnika 2 a. Seerianumbrid kaardil; garantiijuhtumid otse Aunmani kaudu.', addedAt: at('2026-03-20T09:00:00Z') },
    { id: 'doc-energia', pdf: 'energia', category: 'appliances', title: 'Energiamärgis · klass A', note: 'Kehtib 10 aastat. Kaugküte + soojustagastusega ventilatsioon.', addedAt: at('2026-03-14T12:25:00Z') },
    // Maja ja ühistu
    { id: 'doc-ky', pdf: 'ky', category: 'building', title: 'Korteriühistu põhikiri ja kodukord', note: 'Vaikne aeg 23–07. Prügimaja kood 2580. Rõdul ainult elektrigrill.', addedAt: at('2026-05-05T10:00:00Z') },
    { id: 'doc-haldur', pdf: 'haldur', category: 'building', title: 'Maja haldur ja avariinumber', note: 'Haldur: Kodulahe Haldus OÜ, E–R 9–17. Avarii 24h: +372 600 0000.', addedAt: at('2026-05-05T10:05:00Z') },
    { id: 'doc-parkimine', pdf: 'parkimine', category: 'building', title: 'Parkimiskoht P-23 ja panipaik K-14', note: 'Parkla –1 korrus, panipaik kelder B. Elektriauto laadimise valmidus.', addedAt: at('2026-03-14T12:30:00Z') },
  ];
  const docs = [];
  for (const sp of specs) {
    const id = rid(sp.id);
    const local = require('path').join(DEMO_DOCS_DIR, sp.pdf + '.pdf');
    let file = null;
    if (fs.existsSync(local)) {
      const name = sp.title.replace(/[^\w.\-äöüõšžÄÖÜÕŠŽ ]+/g, '_').slice(0, 90) + '.pdf';
      const objectPath = `homes/${orderId}/${id}/${name}`;
      const size = await uploadFile(objectPath, local, 'application/pdf');
      file = { path: objectPath, name, size, contentType: 'application/pdf' };
    } else {
      console.warn(`  (no PDF for ${sp.pdf} — run: python3 scripts/make-demo-docs.py)`);
    }
    docs.push({ id, category: sp.category, title: sp.title, url: null, note: sp.note, addedAt: sp.addedAt, ...dev, file });
  }
  return [...keep, ...docs];
}

function buildMaintenance(existing) {
  const keep = (existing || []).filter((it) => !String(it.id || '').startsWith('arco-') && !['vent-filters', 'warranty-inspection', 'floor-heating', 'sealant-check', 'water-meters', 'smoke-detector', 'dishwasher-filter', 'hood-filter'].includes(it.catalogId));
  const item = (id, catalogId, intervalMonths, lastDoneAt, nextDueAt, doneBy, serviceId, note = '') => ({ id: rid(id), catalogId, name: null, intervalMonths, lastDoneAt, nextDueAt, serviceId, note, doneBy, remindedFor: null, lastDoneBy: lastDoneAt ? doneBy : undefined });
  return [
    ...keep,
    // What the developer's after-sales team asks the owner to keep an eye on — and can be ordered from them
    item('m-vent', 'vent-filters', 6, '2026-09-08', '2027-03-08', 'home', 'systems-tuning', 'Vahetas garantiimeeskond seadistuse käigus; varufiltrid panipaigas'),
    item('m-inspection', 'warranty-inspection', 12, null, '2027-03-01', 'home', 'warranty-inspection', '1. aasta ülevaatus enne 14.03.2027'),
    item('m-floor', 'floor-heating', 12, '2026-09-08', '2027-09-08', 'home', 'systems-tuning'),
    item('m-sealant', 'sealant-check', 12, '2026-04-02', '2027-04-02', 'home', 'warranty-claim'),
    // The household's own small things
    item('m-smoke', 'smoke-detector', 12, '2026-03-14', '2027-03-14', 'home', null),
    item('m-dish', 'dishwasher-filter', 1, '2026-09-05', '2026-10-05', 'home', null),
  ];
}

async function main() {
  console.log('Authenticating…');
  TOKEN = await getAccessToken();

  // 1. Find the home
  const orders = await runQuery('orders', [eq('customer.email', CUSTOMER_EMAIL)], 10);
  const order = orders.filter((o) => ['paid', 'cancelling'].includes(o.status)).sort((a, b) => (b.paidAt?.getTime?.() || 0) - (a.paidAt?.getTime?.() || 0))[0];
  if (!order) throw new Error(`No active order for ${CUSTOMER_EMAIL}`);
  console.log(`Home: ${order.id} · ${order.customer?.name} · ${order.customer?.address}`);

  const now = new Date();
  const customerName = order.customer?.name || 'Anna Tamm';
  const customerPhone = order.customer?.phone || '';
  const ADDRESS = 'Iili 8-14, Kodulahe, Tallinn';

  // 2. Provider: the developer's after-sales team
  const existingProvider = await getDoc('providers', PROVIDER_ID);
  await patchDoc('providers', PROVIDER_ID, {
    ...PROVIDER,
    notifyEmail: PROVIDER.email,
    services: ['warranty'],
    status: 'active',
    lang: 'et',
    createdBy: 'admin',
    createdAt: existingProvider?.createdAt || now,
    updatedAt: now,
  });
  console.log(`Provider: ${PROVIDER_ID} (${existingProvider ? 'updated' : 'created'})`);
  const existingHandyman = await getDoc('providers', HANDYMAN_ID);
  await patchDoc('providers', HANDYMAN_ID, {
    ...HANDYMAN, notifyEmail: HANDYMAN.email, services: ['handyman'], status: 'active', lang: 'et', createdBy: 'admin',
    createdAt: existingHandyman?.createdAt || now, updatedAt: now,
  });
  console.log(`Provider: ${HANDYMAN_ID} (${existingHandyman ? 'updated' : 'created'})`);

  // 3. The home: address, type, profile, brand, warranty partner, folder, upkeep
  console.log('Uploading the handover folder…');
  const documents = await buildDocuments(order.documents, order.id);
  const maintenance = buildMaintenance(order.maintenance);
  const maintenanceNextDue = maintenance.reduce((m, it) => (m === null || it.nextDueAt < m ? it.nextDueAt : m), null);
  const hp = order.homeProfile || {};
  const homeProfile = {
    homeType: 'apartment',
    access: hp.access || 'Trepikoda B, 3. korrus, korter 14. Välisukse kood 1408#. Võti on Kristil.',
    pets: hp.pets || 'Lemmikloomi ei ole.',
    allergies: hp.allergies || 'Ei ole. Palun lõhnavabad vahendid.',
    flowerPreference: hp.flowerPreference || 'Heledad toonid, eukalüpt. Mitte liiliaid.',
    linens: hp.linens || 'Magamistoa kummut, ülemine sahtel.',
    towels: hp.towels || 'Vannitoa seinakapp.',
    specialRequests: hp.specialRequests || 'Heledad põrandad — palun sisejalatsid. Rõdu uks jääb suletuks.',
  };
  await patchDoc('orders', order.id, {
    customer: { address: ADDRESS },
    homeProfile,
    brand: { name: 'Arco Vara', project: 'Kodulahe · Iili 8', tagline: 'Sinu uus kodu Kodulahes — garantii, hooldus, ajad ja dokumendid ühes kohas.', warrantyUntil: '2028-03-14' },
    warrantyId: PROVIDER_ID,
    warrantyName: PROVIDER.name,
    handymanId: HANDYMAN_ID,
    handymanName: HANDYMAN.name,
    documents,
    maintenance,
    maintenanceNextDue,
    updatedAt: now,
  }, ['customer.address', 'homeProfile', 'brand', 'warrantyId', 'warrantyName', 'handymanId', 'handymanName', 'documents', 'maintenance', 'maintenanceNextDue', 'updatedAt']);
  console.log(`Order updated: address, brand, warranty + handyman partners, ${documents.length} documents (${documents.filter((d) => d.file).length} files), ${maintenance.length} upkeep items`);

  // Upcoming visits carry the address too
  const upcoming = await runQuery('bookings', [eq('orderId', order.id), gte('scheduledAt', now)], 50);
  for (const b of upcoming) await patchDoc('bookings', b.id, { address: ADDRESS }, ['address']);
  console.log(`Address on ${upcoming.length} upcoming visits`);

  // 4. Warranty requests: done · confirmed (with visit) · open
  const base = {
    orderId: order.id, providerId: PROVIDER_ID, providerName: PROVIDER.name,
    customerName, customerEmail: CUSTOMER_EMAIL, customerPhone, address: ADDRESS,
    category: 'warranty', lang: 'et', source: 'portal', type: 'service',
  };
  const doneAt = tallinn('2026-09-08', '10:00');
  await setDoc('serviceRequests', rid('req-done'), {
    ...base, serviceId: 'systems-tuning', preferredDate: '2026-09-08', timeWindow: 'morning',
    note: 'Ventilatsioon tundub õhtuti liiga tugev ja põrandaküte elutoas ei lähe soojaks.',
    status: 'completed', scheduledAt: doneAt, price: null,
    providerMessage: 'Ventilatsioon seadistatud režiimile 2 (öösel 1), termostaadid 21 °C. Filtrid vahetatud, järgmine märtsis.',
    createdAt: tallinn('2026-09-04', '18:20'), confirmedAt: tallinn('2026-09-05', '09:10'), completedAt: tallinn('2026-09-08', '11:05'), updatedAt: tallinn('2026-09-08', '11:05'),
  });
  const confirmedAt = tallinn('2026-09-25', '14:00');
  const visitId = rid('visit-door');
  await setDoc('serviceRequests', rid('req-confirmed'), {
    ...base, serviceId: 'warranty-claim', preferredDate: null, timeWindow: 'afternoon',
    note: 'Vannitoa uks ei sulgu korralikult — hing on vajunud, uks käib vastu lengi.',
    status: 'confirmed', scheduledAt: confirmedAt, price: null, bookingId: visitId,
    providerMessage: 'Tuleme reedel, võtame uue hinge kaasa. Kestab umbes 30 minutit, kohal peab olema keegi täiskasvanu.',
    createdAt: tallinn('2026-09-18', '20:40'), confirmedAt: tallinn('2026-09-19', '08:55'), updatedAt: tallinn('2026-09-19', '08:55'),
  });
  await setDoc('bookings', visitId, {
    orderId: order.id, providerId: PROVIDER_ID, providerName: PROVIDER.name,
    customerName, customerEmail: CUSTOMER_EMAIL, customerPhone, address: ADDRESS, size: order.size || 'medium',
    scheduledAt: confirmedAt, endTime: new Date(confirmedAt.getTime() + 30 * 60000),
    status: 'scheduled', kind: 'extra', serviceId: 'warranty-claim', price: null,
    note: 'Vannitoa ukse hing. Uus hing + reguleerimine.', customerNote: 'Tuleme reedel, võtame uue hinge kaasa. Kestab umbes 30 minutit.',
    source: 'request', isManualEntry: true, reminderSent: true, scheduleOccurrence: null, requestId: rid('req-confirmed'),
    createdAt: tallinn('2026-09-19', '08:55'), updatedAt: tallinn('2026-09-19', '08:55'),
  });
  const openCreated = new Date(now.getTime() - 26 * 3600 * 1000);
  await setDoc('serviceRequests', rid('req-open'), {
    ...base, serviceId: 'warranty-claim', preferredDate: null, timeWindow: 'any',
    note: 'Elutoa suure akna tihend vilistab tugeva tuulega ja alumises servas tekib hommikuti kondensaat.',
    status: 'requested', createdAt: openCreated, updatedAt: openCreated,
  });
  console.log('Requests: 1 done · 1 confirmed (visit 25.09 14:00) · 1 open');

  console.log('\nDone.');
  console.log(`Client portal:  https://sukoda.ee/minu  → ${CUSTOMER_EMAIL}`);
  console.log(`Warranty desk:  https://sukoda.ee/haldus → ${PROVIDER.email}`);
  console.log(`Handyman desk:  https://sukoda.ee/haldus → ${HANDYMAN.email}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
