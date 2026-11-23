/**
 * Home-screen strings must live in the file the browser loads.
 * assets/js/minu/kodu.js is not served; public/assets/js/minu/kodu.js is.
 * Ask-the-home strings live in the module dictionary, which has to be merged
 * before Alpine paints or the screen shows the key.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('last visit and done-on copy are in the served kodu script', () => {
  const served = read('public/assets/js/minu/kodu.js');
  const source = read('assets/js/minu/kodu.js');
  assert.equal(served, source, 'public/assets/js/minu/kodu.js and assets/js/minu/kodu.js must stay identical');
  assert.match(served, /lastVisitLabel: \{ et: 'Viimane visiit'/);
  assert.match(served, /doneOn: \{ et: 'Tehtud \{date\}'/);
  assert.match(served, /feedbackAction: \{ et: 'Jäta tagasiside või märkus'/);
});

test('the home actions open the screen they name', () => {
  const html = read('minu.html');
  const writeAt = html.indexOf("t('writeTo'");
  assert.ok(writeAt > 0);
  const writeChunk = html.slice(html.lastIndexOf('<button', writeAt), writeAt);
  assert.match(writeChunk, /openVisitFeedback\(\)/);
  assert.doesNotMatch(writeChunk, /lastVisit/);
  assert.match(html, /kind === 'profile'\) \{ this\.activeTab = 'mine'; this\.openMine\('notes'\); this\.profileEditing = true; return; \}/);
  assert.match(html, /x-show="nextThing\.away"/);
  const dealAt = html.indexOf('get dealIncludes');
  assert.doesNotMatch(html.slice(dealAt, dealAt + 450), /includedShort/);

  const mine = read('assets/js/minu/minu.js');
  assert.match(mine, /openTelli\('flowers'\)/);
  assert.doesNotMatch(mine, /setTelliOpen\('flowers'\)/);
  assert.match(mine, /x-show="dealIncludes"/);

  const desk = read('haldus.html');
  const tomorrowAt = desk.indexOf('tomorrowVisits');
  const tomorrowChunk = desk.slice(tomorrowAt, tomorrowAt + 700);
  assert.match(tomorrowChunk, /selectedDay = dateOf\(b\.scheduledAt\)/);
  assert.doesNotMatch(tomorrowChunk, /selectDay\(/);

  assert.doesNotMatch(read('assets/js/minu/kodu.js'), /«Дом»/);
  assert.doesNotMatch(read('assets/js/minu/telli.js'), /«Дом»/);
  assert.doesNotMatch(read('assets/js/minu/dict.js'), /«Дом»/);
  assert.doesNotMatch(read('assets/js/minu/dict.js'), /Teenuste alt/);
  assert.match(read('index.html'), /pvTabHome: \{ et: 'Kodu', en: 'Home', ru: 'Главная' \}/);
});

test('Alpine starts after the portal dictionary is merged', () => {
  const main = read('assets/js/main.js');
  assert.match(main, /queueMicrotask\(\(\) => Alpine\.start\(\)\)/);
  assert.doesNotMatch(main, /^Alpine\.start\(\);/m);
});

test('every t() key used in minu.html and minu modules exists in the resident dictionary with et, en and ru', () => {
  const vm = require('vm');
  const dict = {};
  const sandbox = { dict, add(partial) { Object.assign(dict, partial); } };
  vm.createContext(sandbox);
  vm.runInContext(read('public/assets/js/minu/kodu.js'), sandbox);
  const dictCode = read('assets/js/minu/dict.js')
    .replace(/^export\s+const\s+dict\s*=/m, 'Object.assign(dict,')
    .replace(/\};\s*export\s+function\s+add[\s\S]*$/m, '});');
  vm.runInContext(dictCode, sandbox);
  for (const rel of ['assets/js/minu/telli.js', 'assets/js/minu/minu.js']) {
    const raw = read(rel).replace(/^import\s+[^\n]+$/gm, '');
    const cut = raw.indexOf('\n});');
    vm.runInContext(raw.slice(0, cut + 4), sandbox);
  }
  const merged = { ...(sandbox.SUKODA_MINU && sandbox.SUKODA_MINU.dict), ...sandbox.dict };

  for (const [k, row] of Object.entries(merged)) {
    assert.equal(typeof row.et, 'string', `${k}.et missing`);
    assert.equal(typeof row.en, 'string', `${k}.en missing`);
    assert.equal(typeof row.ru, 'string', `${k}.ru missing`);
    if (row.et.trim()) {
      assert.ok(row.en.trim(), `${k}.en empty`);
      assert.ok(row.ru.trim(), `${k}.ru empty`);
    }
    assert.doesNotMatch(row.et + row.en + row.ru, /[!]/, `${k} has an exclamation mark`);
  }

  const missing = [];
  const files = ['minu.html', 'assets/js/minu/telli.js', 'assets/js/minu/minu.js', 'assets/js/minu/kodu.js'];
  const callRe = /\bt\(\s*'([a-zA-Z0-9_]+)'/g;
  for (const rel of files) {
    const src = read(rel);
    let m;
    while ((m = callRe.exec(src))) {
      if (!merged[m[1]]) missing.push(`${rel}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('every t() key used in haldus.html exists in COPY with et, en and ru', () => {
  const vm = require('vm');
  const html = read('haldus.html');
  const start = html.indexOf('const COPY = {');
  const end = html.indexOf('const MONTHS =');
  assert.ok(start > 0 && end > start);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(html.slice(start, end).replace('const COPY =', 'this.COPY ='), sandbox);
  const ruRaw = read('assets/js/haldus-ru.js')
    .replace(/^export\s+const\s+haldusRu\s*=/m, 'this.RU =')
    .replace(/if\s*\(typeof window[\s\S]*$/m, '');
  vm.runInContext(ruRaw, sandbox);
  const copy = sandbox.COPY;
  const ru = sandbox.RU || {};

  for (const [k, row] of Object.entries(copy)) {
    assert.equal(typeof row.et, 'string', `haldus ${k}.et missing`);
    assert.equal(typeof row.en, 'string', `haldus ${k}.en missing`);
    assert.equal(typeof ru[k], 'string', `haldus ${k}.ru missing in assets/js/haldus-ru.js`);
    if (row.et.trim()) {
      assert.ok(row.en.trim(), `haldus ${k}.en empty`);
      assert.ok(ru[k].trim(), `haldus ${k}.ru empty`);
    }
  }

  const missing = [];
  const callRe = /\bt\(\s*'([a-zA-Z0-9_]+)'/g;
  let m;
  while ((m = callRe.exec(html))) {
    if (!copy[m[1]]) missing.push(`haldus.html: ${m[1]}`);
  }
  assert.deepEqual(missing, []);
});

test('the resident app object in minu.html is one attribute: no double quote cuts it short', () => {
  const html = read('minu.html');
  const start = html.indexOf('x-data="{') + 'x-data="'.length;
  const end = html.indexOf('"', start);
  assert.match(html.slice(end - 3, end + 2), /}\s*">/);
  assert.doesNotThrow(() => new Function('return (' + html.slice(start, end) + ');'));
});
