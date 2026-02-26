/**
 * SUKODA Füüsiliste kinkekaartide koodide genereerimine
 *
 * Koodi formaat: SK[SUMMA]-[XXXX]-[XXXX]
 *   Näide: SK279-KPFM-7XBN  →  Üks Hetk, 3 tuba, €279
 *   Summast saad kohe aru mis kaart on.
 *
 * Käivitamine:
 *   cd scripts && ADMIN_PASSWORD=Sukoda2026! node generate-physical-cards.js
 *
 * Tulemus:
 *   - scripts/kinkekaardid-koodid.json   — arhiiv
 *   - scripts/kinkekaardid-tabel.html    — saada trükikojale
 *   - Koodid registreeritakse Firestore'i läbi HTTPS endpointi
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ============================================================
// SEADISTUS — muuda siia arvud
// Praegune partii: 50 kaarti
// ============================================================
const BATCH_CONFIG = [
  // Üks Hetk (1 koristus + lilled + kaart + üllatus)
  { package: 'moment',  size: 'small',  price: 219,  count: 10, label: '1-2 tuba' },
  { package: 'moment',  size: 'medium', price: 279,  count: 8,  label: '3 tuba' },
  { package: 'moment',  size: 'large',  price: 349,  count: 5,  label: '4 tuba' },

  // Kuu Aega (2 koristust 1 kuu jooksul)
  { package: 'month',   size: 'small',  price: 419,  count: 6,  label: '1-2 tuba' },
  { package: 'month',   size: 'medium', price: 519,  count: 6,  label: '3 tuba' },
  { package: 'month',   size: 'large',  price: 649,  count: 3,  label: '4 tuba' },

  // Kvartal Vabadust (6 koristust 3 kuu jooksul)
  { package: 'quarter', size: 'small',  price: 1099, count: 5,  label: '1-2 tuba' },
  { package: 'quarter', size: 'medium', price: 1349, count: 5,  label: '3 tuba' },
  { package: 'quarter', size: 'large',  price: 1699, count: 2,  label: '4 tuba' },
];

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sukoda2026!';
const ENDPOINT = 'https://europe-west1-sukoda-77b52.cloudfunctions.net/generatePhysicalGiftCards';
const BATCH_NAME = `Prindi ${new Date().toISOString().slice(0, 10)}`;

const PACKAGE_NAMES = {
  moment:  'Üks Hetk',
  month:   'Kuu Aega',
  quarter: 'Kvartal Vabadust',
};
const PACKAGE_DESC = {
  moment:  '1 koristus + lilled + kaart + üllatus',
  month:   '2 koristust 1 kuu jooksul',
  quarter: '6 koristust 3 kuu jooksul',
};

// Tähestik: ei sisalda 0,O,1,I (lihtsam lugeda kaardilt)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode(price) {
  const rnd = (n) => Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  return `SK${price}-${rnd(4)}-${rnd(4)}`;
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch (e) { reject(new Error(`JSON parse error: ${buf}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const total = BATCH_CONFIG.reduce((s, c) => s + c.count, 0);
  console.log(`\nSUKODA kinkekaartide genereerimine`);
  console.log(`Kokku: ${total} kaarti`);
  console.log(`Formaat: SK[SUMMA]-XXXX-XXXX\n`);

  // Genereeri koodid lokaalselt
  const usedCodes = new Set();
  const allCards = [];
  for (const cfg of BATCH_CONFIG) {
    for (let i = 0; i < cfg.count; i++) {
      let code;
      do { code = makeCode(cfg.price); } while (usedCodes.has(code));
      usedCodes.add(code);
      allCards.push({
        code,
        package: cfg.package,
        packageName: PACKAGE_NAMES[cfg.package],
        packageDesc: PACKAGE_DESC[cfg.package],
        size:  cfg.size,
        price: cfg.price,
        label: cfg.label,
      });
    }
  }

  // Registreeri Firestore'is
  console.log('Registreerin Firestore\'is...');
  const resp = await post(ENDPOINT, {
    password: ADMIN_PASSWORD,
    batchName: BATCH_NAME,
    cards: allCards.map(c => ({ code: c.code, package: c.package, size: c.size })),
  });

  if (resp.status !== 200 || !resp.body.success) {
    console.error('Viga:', JSON.stringify(resp.body));
    process.exit(1);
  }
  console.log(`✓ ${resp.body.count} koodi Firestore'is registreeritud (partii: ${resp.body.batchId})\n`);

  // Salvesta JSON
  const jsonPath = path.join(__dirname, 'kinkekaardid-koodid.json');
  fs.writeFileSync(jsonPath, JSON.stringify(
    { batchId: resp.body.batchId, batchName: BATCH_NAME, generatedAt: new Date().toISOString(), cards: allCards },
    null, 2
  ));
  console.log(`✓ Andmefail: ${jsonPath}`);

  // Genereeri HTML tabel
  const htmlPath = path.join(__dirname, 'kinkekaardid-tabel.html');
  fs.writeFileSync(htmlPath, buildTable(allCards, resp.body.batchId));
  console.log(`✓ Tabel:     ${htmlPath}`);
  console.log('\nSaada kinkekaardid-tabel.html trükikojale variabeltrükiks.\n');
}

// ============================================================
// HTML tabel trükikojale
// ============================================================
function buildTable(cards, batchId) {
  let rows = '';
  let rowNum = 1;
  let prevPkg = null;

  for (const c of cards) {
    const pkgChanged = prevPkg !== c.package;
    prevPkg = c.package;
    rows += `
      <tr${pkgChanged ? ' class="pkg-start"' : ''}>
        <td class="num">${rowNum++}</td>
        <td class="code">${c.code}</td>
        <td class="pkg">${c.packageName}</td>
        <td class="desc">${c.packageDesc}</td>
        <td class="size">${c.label}</td>
        <td class="price">€${c.price}</td>
        <td class="blank"></td>
      </tr>`;
  }

  // Kokkuvõte tabelile
  const seen = new Set();
  let summary = '';
  for (const c of cards) {
    const key = `${c.package}-${c.size}`;
    if (!seen.has(key)) {
      seen.add(key);
      const cnt = cards.filter(x => x.package === c.package && x.size === c.size).length;
      summary += `
        <div class="sum-row">
          <span class="sum-code">SK${c.price}-XXXX-XXXX</span>
          <span class="sum-detail">${c.packageName} · ${c.label} · €${c.price}</span>
          <span class="sum-count">${cnt} tk</span>
        </div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="et">
<head>
<meta charset="UTF-8">
<title>SUKODA Kinkekaardid — Variabeltrüki koodid</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Inter:wght@300;400;500&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size: A4 portrait; margin: 14mm 12mm; }
  body { font-family:'Inter',system-ui,sans-serif; font-size:11px; color:#1a1a1a; background:#fff; }

  header { display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:12px; border-bottom:1.5px solid #B8976A; margin-bottom:18px; }
  header h1 { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:400; letter-spacing:6px; color:#B8976A; }
  header .meta { text-align:right; color:#999; font-size:9px; line-height:1.9; }
  h2 { font-size:8px; letter-spacing:4px; text-transform:uppercase; color:#B8976A; font-weight:500; margin-bottom:9px; }

  .summary { background:#FAF8F5; border-left:2px solid #B8976A; padding:9px 14px; margin-bottom:20px; }
  .sum-row { display:flex; align-items:center; gap:14px; padding:3px 0; border-bottom:1px solid #EDE9E3; }
  .sum-row:last-child { border-bottom:none; }
  .sum-code   { font-family:'Cormorant Garamond',serif; font-size:12.5px; color:#B8976A; letter-spacing:1px; min-width:175px; }
  .sum-detail { flex:1; color:#666; }
  .sum-count  { font-weight:500; color:#B8976A; min-width:32px; text-align:right; }

  table { width:100%; border-collapse:collapse; margin-bottom:18px; }
  th { font-size:7.5px; letter-spacing:3px; text-transform:uppercase; color:#B8976A; font-weight:500; padding:6px 8px; border-bottom:1.5px solid #B8976A; text-align:left; }
  td { padding:4.5px 8px; border-bottom:1px solid #EDE9E3; vertical-align:middle; }
  tr:last-child td { border-bottom:none; }
  tr.pkg-start td { border-top:1.5px solid #D4CFC8; }
  .num   { color:#ccc; font-size:9px; width:24px; }
  .code  { font-family:'Cormorant Garamond',serif; font-size:13.5px; letter-spacing:1px; white-space:nowrap; }
  .pkg   { color:#B8976A; font-weight:500; white-space:nowrap; }
  .desc  { color:#999; font-size:10px; }
  .size  { color:#555; white-space:nowrap; }
  .price { font-weight:500; white-space:nowrap; }
  .blank { width:55px; border-left:1px dashed #e0dbd5; }

  footer { margin-top:14px; padding-top:8px; border-top:1px solid #EDE9E3; color:#bbb; font-size:8px; display:flex; justify-content:space-between; }
  @media print { tr { page-break-inside:avoid; } }
</style>
</head>
<body>

<header>
  <h1>SUKODA</h1>
  <div class="meta">
    Variabeltrüki koodid — kinkekaardid<br>
    Partii: ${batchId}<br>
    ${new Date().toLocaleDateString('et-EE')} · kokku ${cards.length} kaarti
  </div>
</header>

<h2>Kokkuvõte partiist</h2>
<div class="summary">${summary}
</div>

<h2>Kõik koodid (variabeltrükk)</h2>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Kood — trükitakse kaardile</th>
      <th>Pakett</th>
      <th>Sisaldab</th>
      <th>Tubade arv</th>
      <th>Hind</th>
      <th>Märkused</th>
    </tr>
  </thead>
  <tbody>${rows}
  </tbody>
</table>

<footer>
  <span>Lunastamine: sukoda.ee/lunasta · kood sisestatakse veebilehel</span>
  <span>SUKODA · tere@sukoda.ee</span>
</footer>

</body>
</html>`;
}

main().catch(err => {
  console.error('Viga:', err.message);
  process.exit(1);
});
