/**
 * Account deletion: the person and their data go, the specialist's work record stays without them,
 * and a deleted specialist leaves every home they served without booking visits for nobody.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../lib/haldus-core');

const NOW = Date.parse('2026-11-22T12:00:00Z');
const PAST = NOW - 86400000;
const FUTURE = NOW + 86400000;

test('a deleted resident\'s visits lose name, contact, address and notes', () => {
  const patch = core.residentVisitPatch({ status: 'completed', scheduledAtMs: PAST }, NOW);
  assert.equal(patch.customerName, '');
  assert.equal(patch.customerEmail, '');
  assert.equal(patch.customerPhone, '');
  assert.equal(patch.address, '');
  assert.equal(patch.customerNote, '');
  assert.equal(patch.note, '');
  assert.equal(patch.anonymized, true);
  assert.equal(patch.status, undefined, 'a done visit stays done for the monthly summary');
});

test('a deleted resident\'s future visits are cancelled, past live ones are not touched', () => {
  assert.equal(core.residentVisitPatch({ status: 'scheduled', scheduledAtMs: FUTURE }, NOW).status, 'cancelled');
  assert.equal(core.residentVisitPatch({ status: 'confirmed', scheduledAtMs: FUTURE }, NOW).cancelReason, 'home-deleted');
  assert.equal(core.residentVisitPatch({ status: 'scheduled', scheduledAtMs: PAST }, NOW).status, undefined);
  assert.equal(core.residentVisitPatch({ status: 'cancelled', scheduledAtMs: FUTURE }, NOW).status, undefined);
});

test('a deleted specialist leaves the visit history and cancels what was still coming', () => {
  const past = core.providerVisitPatch({ status: 'completed', scheduledAtMs: PAST }, NOW);
  assert.deepEqual(past, { providerId: null, providerName: null });
  const next = core.providerVisitPatch({ status: 'scheduled', scheduledAtMs: FUTURE }, NOW);
  assert.equal(next.status, 'cancelled');
  assert.equal(next.cancelReason, 'provider-deleted');
});

test('open requests to a deleted specialist close, finished ones stay as they are', () => {
  assert.equal(core.providerRequestPatch({ status: 'new' }).status, 'cancelled');
  assert.equal(core.providerRequestPatch({ status: 'confirmed' }).status, 'cancelled');
  assert.equal(core.providerRequestPatch({ status: 'completed' }), null);
  assert.equal(core.providerRequestPatch({ status: 'declined' }), null);
});

test('the home is emptied of the specialist in every category and the standing schedule stops', () => {
  const order = {
    providerId: 'p1', providerName: 'Mari', floristId: 'p1', floristName: 'Mari', handymanId: 'p2',
    schedule: { active: true },
  };
  const { patch, categories } = core.providerLeavePatch(order, 'p1');
  assert.deepEqual(categories.sort(), ['cleaning', 'flowers']);
  assert.equal(patch.providerId, null);
  assert.equal(patch.floristName, null);
  assert.equal(patch.handymanId, undefined, 'another specialist stays');
  assert.equal(patch['schedule.active'], false);
});

test('a schedule that belongs to someone else keeps running', () => {
  const order = { floristId: 'p1', providerId: 'p2', schedule: { active: true } };
  assert.equal(core.providerLeavePatch(order, 'p1').patch['schedule.active'], undefined);
  const own = { providerId: 'p2', schedule: { active: true, providerId: 'p1' } };
  assert.equal(core.providerLeavePatch(own, 'p1').patch['schedule.active'], false);
});

test('owner takes the home, a member only leaves it, a stranger is nobody', () => {
  const home = { customer: { email: 'anna@example.com' }, contacts: [{ email: 'Jaan@Example.com' }], contactEmails: ['jaan@example.com'] };
  assert.equal(core.deletionRole(home, 'ANNA@example.com'), 'owner');
  assert.equal(core.deletionRole(home, 'jaan@example.com'), 'member');
  assert.equal(core.deletionRole(home, 'mari@example.com'), null);
  const gift = { type: 'gift', customer: { email: 'buyer@example.com' }, recipient: { email: 'anna@example.com' } };
  assert.equal(core.deletionRole(gift, 'anna@example.com'), 'owner');
  assert.equal(core.deletionRole(gift, 'buyer@example.com'), 'owner', 'the buyer\'s own data is on the order too');
  const left = core.withoutMember(home, 'jaan@example.com');
  assert.deepEqual(left, { contacts: [], contactEmails: [] });
});

test('a developer apartment stays for the next owner, only the buyer\'s own files go', () => {
  const order = {
    brand: { name: 'Arco' },
    customer: { name: 'Anna', email: 'anna@example.com', phone: '+372', address: 'Iili 8-12', city: 'Tallinn' },
    contacts: [{ email: 'jaan@example.com' }],
    documents: [
      { id: 'a', source: 'developer', file: { path: 'homes/o1/a/plan.pdf' } },
      { id: 'b', source: 'home', file: { path: 'homes/o1/b/receipt.pdf' } },
      { id: 'c', file: { path: 'homes/o1/c/photo.jpg' } },
    ],
  };
  assert.equal(core.keepsHomeRecord(order), true);
  assert.deepEqual(core.residentFilesToDelete(order), ['homes/o1/b/receipt.pdf', 'homes/o1/c/photo.jpg']);
  const patch = core.residentRecordPatch(order);
  assert.deepEqual(patch.customer, { address: 'Iili 8-12', city: 'Tallinn' });
  assert.deepEqual(patch.contacts, []);
  assert.deepEqual(patch.documents.map((d) => d.id), ['a']);
  assert.deepEqual(patch.homeProfile, {});
});

test('any other home is removed with all of its files', () => {
  const order = { ownerKind: 'provider-invited', documents: [{ id: 'a', source: 'provider', file: { path: 'homes/o2/a/x.pdf' } }] };
  assert.equal(core.keepsHomeRecord(order), false);
  assert.deepEqual(core.residentFilesToDelete(order), ['homes/o2/a/x.pdf']);
});

test('only the store apps are store apps', () => {
  assert.equal(core.storeApp('ios'), true);
  assert.equal(core.storeApp(' Android '), true);
  assert.equal(core.storeApp('web'), false);
  assert.equal(core.storeApp(undefined), false);
});

test('at the home limit the web points to a bigger plan, a store app only states the limit', () => {
  const web = core.planCapMessage('Tasuta', 3, false);
  assert.equal(web.error, 'Paketis „Tasuta“ on kuni 3 kodu. Vali suurem pakett, et lisada rohkem.');
  assert.equal(web.upgrade, true);
  const store = core.planCapMessage('Tasuta', 3, true);
  assert.equal(store.error, 'Paketis „Tasuta“ on kuni 3 kodu.');
  assert.equal(store.upgrade, false);
  assert.doesNotMatch(store.error, /pakett,|€/);
});
