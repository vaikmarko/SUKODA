/**
 * Send manual cleaning visit invitations to Stella for May 2026.
 *
 * Stella is a manually-managed customer (billed manually, cleaner arranged
 * outside Cal.eu). This one-off script:
 *   1. Finds Stella's order in Firestore by name.
 *   2. Creates two `bookings` documents (May 12 and May 26 at 11:00 Tallinn).
 *   3. Sends Stella one email per visit with proper calendar links
 *      (Google Calendar + .ics for Apple/Outlook), pointing at the existing
 *      sukoda.ee/api/calendar endpoint.
 *
 * Bookings are created with `isManualEntry: true` so they're visually marked
 * in the admin order modal as manual entries (see admin.html ~L928) and
 * non-clickable for reschedule. They show up as upcoming visits in Stella's
 * portal (status: 'confirmed', scheduledAt > now -- see minu.html L405).
 *
 * Auth:
 *   - Firestore: uses the Firebase CLI's refresh token (firebase login).
 *   - Resend:    expects RESEND_API_KEY in env. Pull it from prod via:
 *                  firebase functions:secrets:access RESEND_API_KEY
 *
 * Usage:
 *   node scripts/send-stella-may-invites.js              # dry-run (default)
 *   node scripts/send-stella-may-invites.js --apply      # actually do it
 *
 * Optional flags:
 *   --order-id <id>         Skip name search and use this orderId directly.
 *   --search <text>         Substring to match against name OR email
 *                           (default: "stella", matches stella.taht@icloud.com).
 *   --name <text>           Override the recipient name used in the email
 *                           greeting + calendar event (default: "Stella" if
 *                           recipient.name is empty).
 *   --time HH:MM            Override 11:00.
 *   --dates YYYY-MM-DD,...  Override the May 12 / May 26 default.
 */

const https = require('https');
const readline = require('readline');

const PROJECT_ID = 'sukoda-77b52';
const FIREBASE_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const TZID = 'Europe/Tallinn';
const FROM_EMAIL = 'SUKODA <tere@sukoda.ee>';
const ICS_ENDPOINT = 'https://sukoda.ee/api/calendar';

const SIZE_DURATION_MIN = { small: 50, medium: 90, large: 120 };

const args = parseArgs(process.argv.slice(2));
const APPLY = args['apply'] === true;
const TARGET_TIME = (args['time'] || '11:00').trim();
const TARGET_DATES = (args['dates']
  ? String(args['dates']).split(',').map((s) => s.trim())
  : ['2026-05-12', '2026-05-26']);
const OVERRIDE_ORDER_ID = args['order-id'] || null;
const SEARCH_TEXT = String(args['search'] || 'stella').toLowerCase();
const NAME_OVERRIDE = args['name'] ? String(args['name']) : null;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
    }
  }
  return out;
}

let configStore;
try {
  configStore = require(require('os').homedir() + '/.config/configstore/firebase-tools.json');
} catch (err) {
  console.error('Failed to read Firebase CLI config. Run: firebase login');
  process.exit(1);
}
const refreshToken = configStore.tokens && configStore.tokens.refresh_token;
if (!refreshToken) {
  console.error('No Firebase CLI refresh token found. Run: firebase login');
  process.exit(1);
}

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch (_err) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
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
  if (res.data && res.data.access_token) return res.data.access_token;
  throw new Error('Failed to get Firebase access token: ' + JSON.stringify(res.data));
}

function fromFirestoreValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('mapValue' in v) {
    const out = {};
    const f = v.mapValue.fields || {};
    for (const k of Object.keys(f)) out[k] = fromFirestoreValue(f[k]);
    return out;
  }
  if ('arrayValue' in v) {
    return (v.arrayValue.values || []).map(fromFirestoreValue);
  }
  return null;
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

async function listOrders(accessToken) {
  const all = [];
  let pageToken = null;
  do {
    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/orders`
      + `?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await httpRequest({
      hostname: 'firestore.googleapis.com',
      path,
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status >= 400) throw new Error(`List orders failed (${res.status}): ${JSON.stringify(res.data)}`);
    const docs = (res.data && res.data.documents) || [];
    for (const d of docs) {
      const id = d.name.split('/').pop();
      const fields = {};
      for (const k of Object.keys(d.fields || {})) fields[k] = fromFirestoreValue(d.fields[k]);
      all.push({ id, ...fields });
    }
    pageToken = (res.data && res.data.nextPageToken) || null;
  } while (pageToken);
  return all;
}

async function getOrder(accessToken, orderId) {
  const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/orders/${orderId}`;
  const res = await httpRequest({
    hostname: 'firestore.googleapis.com',
    path,
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) return null;
  if (res.status >= 400) throw new Error(`Get order failed (${res.status}): ${JSON.stringify(res.data)}`);
  const fields = {};
  for (const k of Object.keys(res.data.fields || {})) fields[k] = fromFirestoreValue(res.data.fields[k]);
  return { id: orderId, ...fields };
}

async function createBookingDoc(accessToken, data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/bookings`;
  const res = await httpRequest({
    hostname: 'firestore.googleapis.com',
    path,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }, JSON.stringify({ fields }));
  if (res.status >= 400) throw new Error(`Create booking failed (${res.status}): ${JSON.stringify(res.data)}`);
  return res.data.name.split('/').pop();
}

function tallinnOffsetMinutes(date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZID, timeZoneName: 'shortOffset',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const label = fmt.formatToParts(date).find((p) => p.type === 'timeZoneName');
  const m = /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/.exec((label && label.value) || '');
  if (!m) return 180;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] || '0'));
}

function tallinnLocalToDate(dateStr, timeStr) {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const tm = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!dm || !tm) throw new Error(`Invalid date/time: ${dateStr} ${timeStr}`);
  const [_, Y, M, D] = dm;
  const [__, h, mn] = tm;
  const wallUtcMs = Date.UTC(+Y, +M - 1, +D, +h, +mn, 0);
  let resolvedMs = wallUtcMs;
  for (let i = 0; i < 4; i += 1) {
    const off = tallinnOffsetMinutes(new Date(resolvedMs));
    const next = wallUtcMs - off * 60 * 1000;
    if (next === resolvedMs) break;
    resolvedMs = next;
  }
  return new Date(resolvedMs);
}

function formatTallinnDateET(date) {
  const fmt = new Intl.DateTimeFormat('et-EE', {
    timeZone: TZID, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return fmt.format(date);
}

function formatTallinnTime(date) {
  return new Intl.DateTimeFormat('et-EE', {
    timeZone: TZID, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function googleCalUrl({ title, start, end, description, location }) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: description || '',
    location: location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsDownloadUrl({ title, start, end, description, location }) {
  const params = new URLSearchParams({
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    description: description || '',
    location: location || '',
  });
  return `${ICS_ENDPOINT}?${params.toString()}`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml({ customerName, scheduledAt, endTime, address }) {
  const dateStr = formatTallinnDateET(scheduledAt);
  const timeStr = formatTallinnTime(scheduledAt);
  const title = 'SUKODA koduhoolitsus';
  const description = 'SUKODA koduhoolitsuse visiit';
  const gUrl = googleCalUrl({ title, start: scheduledAt, end: endTime, description, location: address || '' });
  const icsUrl = icsDownloadUrl({ title, start: scheduledAt, end: endTime, description, location: address || '' });
  const intro = customerName
    ? `Tere, ${escapeHtml(customerName)}. Sinu koduhoolitsuse aeg on broneeritud.`
    : 'Sinu koduhoolitsuse aeg on broneeritud.';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:40px 20px;background:#FAF8F5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#F5F0EB;">
    <div style="padding:32px 40px 0 40px;text-align:center;">
      <p style="margin:0;color:#B8976A;font-size:11px;letter-spacing:6px;text-transform:uppercase;font-weight:500;">SUKODA</p>
    </div>

    <div style="padding:32px 40px 44px 40px;">
      <h2 style="color:#2C2824;font-family:Georgia,'Times New Roman',serif;font-weight:300;font-size:28px;margin:0 0 8px 0;">
        Sinu aeg on kinnitatud
      </h2>
      <p style="color:#8A8578;font-size:14px;margin:0 0 32px 0;line-height:1.6;">
        ${intro}
      </p>

      <div style="background:#FFFFFF;padding:28px;margin-bottom:32px;border-left:2px solid #B8976A;">
        <p style="margin:0 0 8px 0;color:#B8976A;font-size:10px;text-transform:uppercase;letter-spacing:3px;font-weight:500;">Sinu külastus</p>
        <p style="margin:0 0 4px 0;font-weight:300;color:#2C2824;font-size:20px;font-family:Georgia,'Times New Roman',serif;text-transform:capitalize;">
          ${escapeHtml(dateStr)}
        </p>
        <p style="margin:0 0 16px 0;color:#8A8578;font-size:16px;">
          Kell ${escapeHtml(timeStr)}
        </p>
        ${address ? `
        <p style="margin:16px 0 0 0;padding-top:16px;border-top:1px solid #E8E3DD;color:#8A8578;font-size:14px;">
          Aadress: <strong style="color:#2C2824;font-weight:400;">${escapeHtml(address)}</strong>
        </p>` : ''}
      </div>

      <div style="margin-top:24px;padding-top:24px;border-top:1px solid #E8E3DD;">
        <p style="color:#B8976A;font-size:10px;text-transform:uppercase;letter-spacing:3px;font-weight:500;margin:0 0 14px 0;">Lisa kalendrisse</p>
        <div>
          <a href="${gUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 20px;background:#FFFFFF;border:1px solid #E8E3DD;color:#2C2824;text-decoration:none;font-size:13px;margin-right:8px;margin-bottom:8px;">
            Google Calendar &rarr;
          </a>
          <a href="${icsUrl}" style="display:inline-block;padding:10px 20px;background:#FFFFFF;border:1px solid #E8E3DD;color:#2C2824;text-decoration:none;font-size:13px;margin-bottom:8px;">
            Apple / Outlook &rarr;
          </a>
        </div>
      </div>

      <p style="color:#8A8578;font-size:13px;line-height:1.6;margin-top:24px;">
        Saadame meeldetuletuse päev enne külastust. Palun jäta meile ligipääs kodule.
      </p>
      <p style="color:#8A8578;font-size:13px;line-height:1.6;margin-top:8px;">
        Kui vajad aega muuta, kirjuta tere@sukoda.ee.
      </p>
    </div>

    <div style="padding:24px 40px;border-top:1px solid #E8E3DD;text-align:center;">
      <p style="color:#8A8578;font-size:12px;margin:0 0 6px 0;">
        Küsimuste korral: <a href="mailto:tere@sukoda.ee" style="color:#2C2824;text-decoration:none;border-bottom:1px solid #B8976A;">tere@sukoda.ee</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function sendResendEmail({ apiKey, to, subject, html }) {
  const res = await httpRequest({
    hostname: 'api.resend.com',
    path: '/emails',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  }, JSON.stringify({ from: FROM_EMAIL, to, subject, html }));
  if (res.status >= 400) {
    throw new Error(`Resend send failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (a) => { rl.close(); resolve(a.trim()); });
  });
}

async function findStellaOrder(accessToken) {
  if (OVERRIDE_ORDER_ID) {
    const o = await getOrder(accessToken, OVERRIDE_ORDER_ID);
    if (!o) throw new Error(`Order not found: ${OVERRIDE_ORDER_ID}`);
    return o;
  }
  const all = await listOrders(accessToken);
  const matches = all.filter((o) => {
    const haystacks = [
      o && o.customer && o.customer.name,
      o && o.customer && o.customer.email,
      o && o.recipient && o.recipient.name,
      o && o.recipient && o.recipient.email,
    ].filter(Boolean).map((s) => String(s).toLowerCase());
    return haystacks.some((n) => n.includes(SEARCH_TEXT));
  });
  if (matches.length === 0) {
    throw new Error(`No order matched "${SEARCH_TEXT}" in customer/recipient name or email. Pass --order-id <id> or --search <text>.`);
  }
  if (matches.length === 1) return matches[0];

  console.log(`\nMultiple matches for "${SEARCH_TEXT}":`);
  matches.forEach((o, i) => {
    const c = o.customer || {};
    const r = o.recipient || {};
    const name = (o.type === 'gift' ? r.name : c.name) || c.name || '(no name)';
    const email = (o.type === 'gift' ? r.email : c.email) || c.email || '(no email)';
    console.log(`  [${i + 1}] ${o.id}  |  ${name}  |  ${email}  |  ${o.package || '?'}/${o.size || '?'}  |  type=${o.type}  status=${o.status}`);
  });
  const pick = await ask('Vali number: ');
  const idx = parseInt(pick, 10) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx >= matches.length) throw new Error('Invalid pick.');
  return matches[idx];
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (kirjutab Firestore + saadab e-kirja)' : 'DRY RUN (ei kirjuta midagi)'}`);
  console.log(`Dates: ${TARGET_DATES.join(', ')} kell ${TARGET_TIME} (Tallinn)`);

  console.log('\nAuthing Firebase...');
  const token = await getAccessToken();

  console.log('Finding Stella order...');
  const order = await findStellaOrder(token);
  const isGift = order.type === 'gift';
  const rawName = (isGift ? order.recipient && order.recipient.name : order.customer && order.customer.name) || '';
  const customerEmail = (isGift ? order.recipient && order.recipient.email : order.customer && order.customer.email) || '';
  const customerPhone = (isGift ? order.recipient && order.recipient.phone : order.customer && order.customer.phone) || '';
  const customerAddress = (isGift ? order.recipient && order.recipient.address : order.customer && order.customer.address) || '';
  // Pick a sensible name: explicit override > recipient.name > capitalized search term > 'Klient'
  const customerName = NAME_OVERRIDE
    || (rawName && !rawName.includes('Physical Card') ? rawName : null)
    || (SEARCH_TEXT ? SEARCH_TEXT.charAt(0).toUpperCase() + SEARCH_TEXT.slice(1) : null)
    || 'Klient';
  const size = order.size || 'medium';
  const durationMin = SIZE_DURATION_MIN[size] || 90;

  console.log('\nFound order:');
  console.log(`  id:       ${order.id}`);
  console.log(`  name:     ${customerName}`);
  console.log(`  email:    ${customerEmail || '(missing!)'}`);
  console.log(`  phone:    ${customerPhone}`);
  console.log(`  address:  ${customerAddress || '(missing)'}`);
  console.log(`  package:  ${order.package || '?'} / size=${size} (${durationMin} min)`);
  console.log(`  status:   ${order.status} / sub=${order.subscriptionStatus || '-'}`);
  console.log(`  type:     ${order.type}`);

  if (!customerEmail) {
    console.error('\nERROR: Order has no customer email. Cannot send invitation.');
    process.exit(1);
  }

  const visits = TARGET_DATES.map((d) => {
    const start = tallinnLocalToDate(d, TARGET_TIME);
    const end = new Date(start.getTime() + durationMin * 60 * 1000);
    return { dateStr: d, start, end };
  });

  console.log('\nWill schedule:');
  for (const v of visits) {
    console.log(`  - ${v.dateStr} ${TARGET_TIME} (Tallinn) -> UTC ${v.start.toISOString()}, end ${v.end.toISOString()}`);
  }

  if (!APPLY) {
    const fs = require('fs');
    const path = require('path');
    const previewDir = path.join(require('os').tmpdir(), 'sukoda-stella-preview');
    fs.mkdirSync(previewDir, { recursive: true });
    for (const v of visits) {
      const html = buildEmailHtml({
        customerName,
        scheduledAt: v.start,
        endTime: v.end,
        address: customerAddress,
      });
      const file = path.join(previewDir, `${v.dateStr}.html`);
      fs.writeFileSync(file, html);
      console.log(`  preview: ${file}`);
    }
    console.log('\n[DRY RUN] Ava ülaltoodud HTML failid brauseris, et näha mis Stellale saadetakse.');
    console.log('Re-run --apply vahekäigus kui pilt sobib.');
    return;
  }

  const confirm = await ask(`\nKas saadan ${visits.length} broneeringukutset aadressile ${customerEmail}? (yes/no): `);
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'jah') {
    console.log('Tühistatud.');
    return;
  }

  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  if (!resendKey) {
    console.error('\nERROR: RESEND_API_KEY env var not set.');
    console.error('Get it via:  firebase functions:secrets:access RESEND_API_KEY');
    console.error('Then run:    RESEND_API_KEY=re_xxx node scripts/send-stella-may-invites.js --apply');
    process.exit(1);
  }

  for (const v of visits) {
    console.log(`\n--- ${v.dateStr} ${TARGET_TIME} ---`);

    console.log('Creating Firestore booking...');
    const bookingId = await createBookingDoc(token, {
      orderId: order.id,
      customerName,
      customerEmail,
      customerPhone,
      address: customerAddress,
      size,
      status: 'confirmed',
      scheduledAt: v.start,
      endTime: v.end,
      isManualEntry: true,
      // Belt and suspenders: reminderSent prevents the day-before reminder
      // even if the status filter is ever broadened. The reminder cron
      // (functions/index.js L2310) filters by status=='scheduled', which
      // already excludes us, but flagging makes intent explicit.
      reminderSent: true,
      manualNote: 'Manuaalselt sisestatud (koristajaga lepitud käsitsi). Automaatkirju ei saadeta.',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  booking id: ${bookingId}`);

    console.log('Sending email via Resend...');
    const html = buildEmailHtml({
      customerName,
      scheduledAt: v.start,
      endTime: v.end,
      address: customerAddress,
    });
    const r = await sendResendEmail({
      apiKey: resendKey,
      to: customerEmail,
      subject: 'SUKODA | Sinu aeg on kinnitatud',
      html,
    });
    console.log(`  resend id: ${r && r.id ? r.id : '(no id returned)'}`);

    if (visits.indexOf(v) < visits.length - 1) {
      await new Promise((r2) => setTimeout(r2, 800));
    }
  }

  console.log('\nKõik tehtud.');
  console.log('Stella peaks saama 2 e-kirja, mis avavad ühe klikiga Google Calendar / Apple / Outlooki.');
  console.log(`Admini UI: orderis "${order.id}" peaksid ilmuma 2 manuaalset broneeringut.`);
}

main().catch((err) => {
  console.error('\nFAIL:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
