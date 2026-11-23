// Every text a resident or a cleaner can see exists in et, en and ru (portal-html.mdc: residents speak all three).
// minu-strings.test.js covers the resident app and the desk; this covers the rest.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

test('e-mails and push texts have the same keys in et, en and ru', () => {
  const src = read('functions/haldus.js');
  const start = src.indexOf('  const T = {');
  const keysOf = (lang) => {
    const s = src.indexOf(`\n    ${lang}: {`, start);
    const e = src.indexOf('\n    },', s);
    return [...src.slice(s, e).matchAll(/^ {6}([a-zA-Z0-9_]+):/gm)].map((m) => m[1]).sort();
  };
  const et = keysOf('et');
  assert.ok(et.length > 50, 'e-mail dictionary not found');
  assert.deepEqual(keysOf('en'), et);
  assert.deepEqual(keysOf('ru'), et);
});

test('every { et, en } text on the landing and code pages has ru', () => {
  for (const rel of ['index.html', 'lunasta.html']) {
    const missing = read(rel).split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /\{\s*et:\s*'/.test(line) && !/\bru:\s*'/.test(line))
      .map(({ n }) => `${rel}:${n}`);
    assert.deepEqual(missing, []);
  }
});

test('the monthly preview does not hard-code a masculine Russian ordinal', () => {
  const ru = read('assets/js/haldus-ru.js');
  const html = read('haldus.html');
  assert.match(ru, /schedPreviewMonth: 'Каждый месяц, \{nth\} \{dow\} в \{time\}/);
  assert.equal(ru.includes('{nth}-й'), false);
  assert.match(html, /nth: this\.ruWeekdayOrdinal\(nth, jsDow\)/);
  assert.match(html, /day === 0 \? 'е'/);
});

test('the desk Russian file has no leftover keys the desk no longer uses', () => {
  const html = read('haldus.html');
  const ru = read('assets/js/haldus-ru.js');
  const keys = [...ru.matchAll(/^ {2}([a-zA-Z0-9_]+):/gm)].map((m) => m[1]);
  const orphans = keys.filter((k) => !new RegExp(`\\b${k}: \\{ et:`).test(html));
  assert.deepEqual(orphans, []);
});
