import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('./kodu.js', import.meta.url), 'utf8'), sandbox);
const pickNextThing = sandbox.SUKODA_MINU.pickNextThing;
const dict = sandbox.SUKODA_MINU.dict;

function t(key, vars) {
  const row = dict[key] || {};
  const s = row.et || key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
}

function portal(over) {
  return {
    lang: 'et',
    t,
    extrasLoaded: true,
    extras: { requests: [], away: [] },
    upcomingBookings: [],
    pendingRescheduleIds: [],
    order: { status: 'paid', subscriptionStatus: 'active' },
    formatDate: () => 'teisipäev, 24. märts',
    formatTime: () => '14:00',
    formatDateShort: (v) => v,
    visitLabel: () => 'Koristus',
    showProvider: true,
    isNotCovered: (r) => r.outcome === 'not_covered',
    ...over,
  };
}

const visit = { id: 'b1', scheduledAt: '2026-03-24T12:00:00.000Z', providerName: 'Kristi', kind: 'regular' };

test('unpaid line comes before a visit', () => {
  const card = pickNextThing(portal({
    order: { status: 'paid', subscriptionStatus: 'past_due' },
    upcomingBookings: [visit],
  }));
  assert.equal(card.kind, 'unpaid');
  assert.equal(card.title, 'Makse ei läinud läbi');
  assert.match(card.thenLine, /14:00/);
  assert.equal(card.action, 'Kontrolli uuesti');
});

test('pending order is an unpaid line', () => {
  const card = pickNextThing(portal({ order: { status: 'pending', subscriptionStatus: null } }));
  assert.equal(card.kind, 'unpaid');
  assert.equal(card.title, 'Makse on veel tegemata');
});

test('a reply the resident must act on comes before the visit', () => {
  const card = pickNextThing(portal({
    upcomingBookings: [visit],
    extras: { requests: [{ id: 'r1', status: 'declined', kind: 'visit', serviceName: 'Tehnik', outcome: 'new_time' }], away: [] },
  }));
  assert.equal(card.kind, 'request');
  assert.equal(card.refId, 'r1');
  assert.equal(card.action, 'Paku uus päev');
});

test('the next visit is the card when nothing needs a decision', () => {
  const card = pickNextThing(portal({ upcomingBookings: [visit] }));
  assert.equal(card.kind, 'visit');
  assert.equal(card.pending, false);
  assert.equal(card.title, 'teisipäev, 24. märts');
  assert.match(card.body, /Kristi/);
  assert.match(card.body, /muuda aega/);
  assert.equal(card.action, 'Muuda aega');
  assert.equal(card.away, false);
});

test('a pending new time opens the calendar', () => {
  const card = pickNextThing(portal({ upcomingBookings: [visit], pendingRescheduleIds: ['b1'] }));
  assert.equal(card.kind, 'visit');
  assert.equal(card.pending, true);
  assert.equal(card.title, 'Uus aeg on kinnitamisel');
  assert.equal(card.action, 'Ava kalender');
});

test('a written reply is the card when there is no visit', () => {
  const card = pickNextThing(portal({
    extras: { requests: [{ id: 'a1', status: 'answered', kind: 'question', serviceName: 'Filtri mõõt' }], away: [] },
  }));
  assert.equal(card.kind, 'request');
  assert.equal(card.refId, 'a1');
  assert.equal(card.title, 'Filtri mõõt');
  assert.equal(card.body, 'Vastus on kirjas. Ava ja loe.');
  assert.equal(card.action, 'Ava vastus');
});

test('an unanswered question is the card when there is no visit', () => {
  const card = pickNextThing(portal({
    extras: { requests: [{ id: 'q1', status: 'requested', kind: 'question', serviceName: 'Kuidas filter käib' }], away: [] },
  }));
  assert.equal(card.kind, 'request');
  assert.equal(card.title, 'Kuidas filter käib');
  assert.equal(card.action, 'Ava');
  assert.doesNotMatch(card.body, /\bvestlus\b/);
});

test('a waiting question is a line under the visit, not a second card', () => {
  const card = pickNextThing(portal({
    upcomingBookings: [visit],
    extras: { requests: [{ id: 'q1', status: 'requested', kind: 'question', serviceName: 'Filter' }], away: [] },
  }));
  assert.equal(card.kind, 'visit');
  assert.match(card.thenLine, /Filter/);
});

test('an empty home profile asks for linens, flowers and access', () => {
  const card = pickNextThing(portal({ homeProfile: { linens: '', flowerPreference: '', access: '' } }));
  assert.equal(card.kind, 'profile');
  assert.equal(card.action, 'Täida');
});

test('a one-off or non-cleaning home skips linens/flowers setup and invites re-ordering', () => {
  const oneOff = pickNextThing(portal({
    order: { status: 'paid', source: 'manual', schedule: null },
    homeProfile: { linens: '', flowerPreference: '', access: '' },
  }));
  assert.equal(oneOff.kind, 'calm');
  assert.equal(oneOff.action, 'Telli teenus');

  const handymanOnly = pickNextThing(portal({
    hasCleaner: false,
    homeProfile: { linens: '', flowerPreference: '', access: '' },
  }));
  assert.equal(handymanOnly.kind, 'calm');
  assert.equal(handymanOnly.action, 'Telli teenus');
});

test('calm empty state points to Services', () => {
  const card = pickNextThing(portal({}));
  assert.equal(card.kind, 'calm');
  assert.doesNotMatch(card.body, /garantii/i);
  assert.equal(card.action, 'Telli teenus');
});

test('no card uses jargon the resident should not see', () => {
  // „koristaja“ left the screens on 23.11.2026 (Marko): the person is „koduhooldaja“ everywhere.
  const banned = /pöördumi|tellimus|tegija|kanal|sponsor|järelteenindus|koristaja/i;
  for (const [key, row] of Object.entries(dict)) {
    assert.doesNotMatch(row.et || '', banned, key + '.et');
    assert.ok(row.et && row.en && row.ru, key + ' has et, en and ru');
    assert.doesNotMatch((row.et || '') + (row.en || '') + (row.ru || ''), /[!]/, key + ' has no exclamation mark');
  }
});

test('a visit on an away day keeps the away line on the clock card', () => {
  const card = pickNextThing(portal({
    upcomingBookings: [visit],
    extras: { requests: [], away: [{ from: '2026-03-24', to: '2026-03-26' }] },
  }));
  assert.equal(card.kind, 'visit');
  assert.equal(card.away, true);
  assert.match(card.body, /Visiidi päeval oled eemal/);
});

test('away is the card only when nothing else is waiting', () => {
  const card = pickNextThing(portal({ extras: { requests: [], away: [{ from: '2026-04-01', to: '2026-04-12' }] } }));
  assert.equal(card.kind, 'away');
  assert.equal(card.action, 'Muuda eemalolekut');
});

test('an unpaid order is the first card', () => {
  const card = pickNextThing(portal({
    order: { status: 'pending', subscriptionStatus: null },
  }));
  assert.equal(card.kind, 'unpaid');
});


const offer = { id: 'p1', status: 'requested', kind: 'visit', serviceName: 'Aknapesu', providerName: 'Kristi Mets', price: '45 €', proposal: { date: '2026-03-27', time: '14:00', startAt: '2026-03-27T12:00:00.000Z' } };
const beforeOffer = Date.parse('2026-03-20T08:00:00Z');

test('the specialist\'s offered time is the card before the visit', () => {
  const card = pickNextThing(portal({ nowMs: beforeOffer, upcomingBookings: [visit], extras: { requests: [offer], away: [] } }));
  assert.equal(card.kind, 'proposal');
  assert.equal(card.refId, 'p1');
  assert.equal(card.eyebrow, 'Kristi pakub aega');
  assert.equal(card.action, 'Sobib');
  assert.equal(card.action2, 'Paku teist aega');
  assert.equal(card.kind2, 'proposalOther');
  assert.match(card.body, /Aknapesu · 45 €/);
});

test('an offer on a new-time request wins over the pending card', () => {
  const move = { ...offer, id: 'p2', type: 'reschedule', targetBookingId: 'b1' };
  const card = pickNextThing(portal({ nowMs: beforeOffer, pendingRescheduleIds: ['b1'], extras: { requests: [move], away: [] } }));
  assert.equal(card.kind, 'proposal');
  assert.equal(card.refId, 'p2');
});

test('an offer whose start has passed is not a card', () => {
  const card = pickNextThing(portal({ nowMs: Date.parse('2026-03-27T12:00:00Z'), upcomingBookings: [visit], extras: { requests: [offer], away: [] } }));
  assert.equal(card.kind, 'visit');
});

test('a wish without an offer stays as it was', () => {
  const card = pickNextThing(portal({ nowMs: beforeOffer, upcomingBookings: [visit], extras: { requests: [{ ...offer, proposal: null }], away: [] } }));
  assert.equal(card.kind, 'visit');
});
