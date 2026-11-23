const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { etAllative, etComitative, etAdessive, etPartitive } = require('../lib/et-name');

test('the browser copy of the name decliner is the same file', () => {
  const source = fs.readFileSync(path.join(__dirname, '../lib/et-name.js'), 'utf8');
  const served = fs.readFileSync(path.join(__dirname, '../../public/assets/js/et-name.js'), 'utf8');
  assert.equal(served, source);
});

test('Estonian given names take the allative from the genitive stem', () => {
  const forms = {
    Kristi: 'Kristile',
    Anna: 'Annale',
    Marko: 'Markole',
    Mari: 'Marile',
    Jüri: 'Jürile',
    Kadri: 'Kadrile',
    Ene: 'Enele',
    Laine: 'Lainele',
    Meelike: 'Meelikesele',
    Merike: 'Merikesele',
    Tuulike: 'Tuulikesele',
    Andres: 'Andresele',
    Madis: 'Madisele',
    Margus: 'Margusele',
    Maris: 'Marisele',
    Johannes: 'Johannesele',
    Andreas: 'Andreasele',
    Toomas: 'Toomasele',
    Urmas: 'Urmasele',
    Joonas: 'Joonasele',
    Luukas: 'Luukasele',
    Peeter: 'Peetrile',
    Sander: 'Sandrile',
    Mihkel: 'Mihklile',
    Aksel: 'Akslile',
    Kaarel: 'Kaarlile',
    Pärtel: 'Pärtlile',
    Endel: 'Endlile',
    Valter: 'Valtrile',
    Aleksander: 'Aleksandrile',
    Katrin: 'Katrinile',
    Robert: 'Robertile',
    Helen: 'Helenile',
    Juhan: 'Juhanile',
    Ander: 'Anderile',
    Mirtel: 'Mirtelile',
    Janek: 'Janekile',
    Triin: 'Triinile',
    Sten: 'Stenile',
    Ott: 'Otile',
    Epp: 'Epule',
    Anett: 'Anetile',
    Jaak: 'Jaagule',
    Priit: 'Priidule',
    Tiit: 'Tiidule',
    Mart: 'Mardile',
    Märt: 'Märdile',
    Art: 'Ardile',
    Gert: 'Gerdile',
    Liis: 'Liisile',
    Ann: 'Annile',
    Mall: 'Mallele',
    Karl: 'Karlile',
    Lembit: 'Lembitule',
    'Hanna-Leen': 'Hanna-Leenile',
    'Pille-Riin': 'Pille-Riinile',
    '': '',
  };
  for (const [name, allative] of Object.entries(forms)) {
    assert.equal(etAllative(name), allative, name);
  }
});

test('comitative, adessive and partitive follow the same stem', () => {
  const rows = [
    ['Kristi', 'Kristiga', 'Kristil', 'Kristit'],
    ['Anna', 'Annaga', 'Annal', 'Annat'],
    ['Toomas', 'Toomasega', 'Toomasel', 'Toomast'],
    ['Urmas', 'Urmasega', 'Urmasel', 'Urmast'],
    ['Joonas', 'Joonasega', 'Joonasel', 'Joonast'],
    ['Luukas', 'Luukasega', 'Luukasel', 'Luukast'],
    ['Andres', 'Andresega', 'Andresel', 'Andrest'],
    ['Peeter', 'Peetriga', 'Peetril', 'Peetrit'],
    ['Mart', 'Mardiga', 'Mardil', 'Marti'],
    ['Ott', 'Otiga', 'Otil', 'Otti'],
    ['Jaak', 'Jaaguga', 'Jaagul', 'Jaaku'],
    ['Priit', 'Priiduga', 'Priidul', 'Priitu'],
  ];
  for (const [name, com, ade, par] of rows) {
    assert.equal(etComitative(name), com, name + ' comitative');
    assert.equal(etAdessive(name), ade, name + ' adessive');
    assert.equal(etPartitive(name), par, name + ' partitive');
  }
  assert.equal(etPartitive(''), '');
  assert.equal(etComitative(''), '');
});
