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
  assert.equal(card.title, 'Tellimus on maksmata');
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
  assert.match(card.body, /muuda seda/);
  assert.equal(card.action, 'Muuda aega');
});

test('a pending new time opens the calendar', () => {
  const card = pickNextThing(portal({ upcomingBookings: [visit], pendingRescheduleIds: ['b1'] }));
  assert.equal(card.kind, 'visit');
  assert.equal(card.pending, true);
  assert.equal(card.title, 'Uus aeg on kinnitamisel');
  assert.equal(card.action, 'Ava kalender');
});

test('an unanswered question is the card when there is no visit', () => {
  const card = pickNextThing(portal({
    extras: { requests: [{ id: 'q1', status: 'requested', kind: 'question', serviceName: 'Kuidas filter käib' }], away: [] },
  }));
  assert.equal(card.kind, 'request');
  assert.equal(card.title, 'Kuidas filter käib');
  assert.equal(card.action, 'Ava vastus');
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

test('calm empty state asks for one report', () => {
  const card = pickNextThing(portal({}));
  assert.equal(card.kind, 'calm');
  assert.equal(card.action, 'Teata probleemist');
});

test('away is the card only when nothing else is waiting', () => {
  const card = pickNextThing(portal({ extras: { requests: [], away: [{ from: '2026-04-01', to: '2026-04-12' }] } }));
  assert.equal(card.kind, 'away');
  assert.equal(card.action, 'Muuda eemalolekut');
});
