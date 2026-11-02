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
  assert.match(served, /lastVisitLabel: \{ et: 'Viimane visiit'/);
  assert.match(served, /doneOn: \{ et: 'Tehtud \{date\}'/);
});

test('ask-the-home copy is in the module dictionary', () => {
  const kaust = read('assets/js/minu/kaust.js');
  assert.match(kaust, /askHomeLead: \{ et: 'Küsi kodu kohta'/);
  assert.match(kaust, /askPh: \{ et: 'nt ventilatsioonifiltri mõõt'/);
  assert.match(kaust, /askLabel: \{ et: 'Küsi'/);
});

test('Alpine starts after the portal dictionary is merged', () => {
  const main = read('assets/js/main.js');
  assert.match(main, /queueMicrotask\(\(\) => Alpine\.start\(\)\)/);
  assert.doesNotMatch(main, /^Alpine\.start\(\);/m);
});
