/**
 * Unit tests for functions/lib/haldus-core.js — pure logic, no Firebase.
 * Run: npm test   (node --test functions/test/)
 *
 * Dates below are anchored to September 2026 (2026-09-01 is a Tuesday).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../lib/haldus-core');

const TODAY = '2026-09-22';

// ------------------------------------------------------------
// Catalogue parity — every user-facing entry has ET and EN
// ------------------------------------------------------------

test('service catalogue: every entry has et+en name and description, a known category, and unique id', () => {
  const ids = new Set();
  for (const s of core.SERVICE_CATALOGUE) {
    assert.ok(s.id, 'id missing');
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`);
    ids.add(s.id);
    assert.ok(s.name?.et && s.name?.en && s.name?.ru, `${s.id}: name et/en/ru`);
    assert.ok(s.description?.et && s.description?.en && s.description?.ru, `${s.id}: description et/en/ru`);
    // priceHint may be empty (a message has no price) but never in one language only
    assert.equal(Boolean(s.priceHint?.et), Boolean(s.priceHint?.en), `${s.id}: priceHint in one language only`);
    assert.equal(Boolean(s.priceHint?.et), Boolean(s.priceHint?.ru), `${s.id}: priceHint ru`);
    assert.ok(core.SERVICE_CATEGORIES[s.category], `${s.id}: unknown category ${s.category}`);
  }
});

test('service categories, time windows, document categories, plans: et+en+ru', () => {
  for (const [k, c] of Object.entries(core.SERVICE_CATEGORIES)) assert.ok(c.et && c.en && c.ru, `category ${k}`);
  for (const [k, w] of Object.entries(core.TIME_WINDOWS)) assert.ok(w.et && w.en && w.ru, `time window ${k}`);
  for (const [k, d] of Object.entries(core.DOCUMENT_CATEGORIES)) assert.ok(d.et && d.en && d.ru, `document category ${k}`);
  for (const [k, p] of Object.entries(core.PROVIDER_PLANS)) assert.ok(p.blurb?.et && p.blurb?.en && p.blurb?.ru, `plan ${k}`);
});

test('ru is present on every et+en text, and blank only when et is blank', () => {
  const walk = (obj, trail) => {
    if (!obj || typeof obj !== 'object') return;
    if (typeof obj.et === 'string' && typeof obj.en === 'string') {
      assert.equal(typeof obj.ru, 'string', `${trail}: ru missing`);
      if (obj.et.trim() || obj.en.trim()) assert.ok(obj.ru.trim(), `${trail}: ru is empty`);
      return;
    }
    for (const [k, v] of Object.entries(obj)) walk(v, `${trail}.${k}`);
  };
  walk(core.SERVICE_CATEGORIES, 'SERVICE_CATEGORIES');
  walk(core.SERVICE_CATALOGUE, 'SERVICE_CATALOGUE');
  walk(core.MAINTENANCE_CATALOGUE, 'MAINTENANCE_CATALOGUE');
  walk(core.DOCUMENT_CATEGORIES, 'DOCUMENT_CATEGORIES');
  walk(core.TIME_WINDOWS, 'TIME_WINDOWS');
  walk(core.PROVIDER_PLANS, 'PROVIDER_PLANS');
});

test('maintenance catalogue: et+en, valid interval, serviceId exists in the service catalogue', () => {
  for (const m of core.MAINTENANCE_CATALOGUE) {
    assert.ok(m.name?.et && m.name?.en && m.name?.ru, `${m.id}: name`);
    assert.ok(m.hint?.et && m.hint?.en && m.hint?.ru, `${m.id}: hint`);
    assert.ok(core.MAINTENANCE_INTERVALS.includes(m.intervalMonths), `${m.id}: interval ${m.intervalMonths}`);
    assert.ok(core.getService(m.serviceId), `${m.id}: serviceId ${m.serviceId} not in catalogue`);
    for (const t of m.homeTypes) assert.ok(core.HOME_TYPES.includes(t), `${m.id}: home type ${t}`);
  }
});

test('langOf keeps et, en and ru; anything else is Estonian', () => {
  assert.equal(core.langOf({ lang: 'et' }), 'et');
  assert.equal(core.langOf({ lang: 'en' }), 'en');
  assert.equal(core.langOf({ lang: 'ru' }), 'ru');
  assert.equal(core.langOf({ lang: 'de' }), 'et');
  assert.equal(core.langOf({ lang: '' }), 'et');
  assert.equal(core.langOf({}), 'et');
  assert.equal(core.langOf(null), 'et');
  assert.equal(core.langOf('ru'), 'ru');
  assert.equal(core.langOf('EN'), 'et', 'codes are lowercase');
});

test('ruPlural follows Russian count forms', () => {
  assert.equal(core.ruPlural(1, 'дом', 'дома', 'домов'), 'дом');
  assert.equal(core.ruPlural(21, 'дело', 'дела', 'дел'), 'дело');
  assert.equal(core.ruPlural(2, 'дело', 'дела', 'дел'), 'дела');
  assert.equal(core.ruPlural(4, 'дело', 'дела', 'дел'), 'дела');
  assert.equal(core.ruPlural(5, 'дело', 'дела', 'дел'), 'дел');
  assert.equal(core.ruPlural(11, 'дом', 'дома', 'домов'), 'домов');
  assert.equal(core.ruPlural(12, 'дом', 'дома', 'домов'), 'домов');
  assert.equal(core.ruPlural(0, 'дело', 'дела', 'дел'), 'дел');
});

test('catalogue money keeps the euro sign after the amount, and the housekeeper is not a maid', () => {
  for (const s of core.SERVICE_CATALOGUE) {
    for (const lang of ['et', 'en', 'ru']) {
      const hint = s.priceHint?.[lang] || '';
      assert.equal(/€\d/.test(hint), false, `${s.id} ${lang}: ${hint}`);
    }
  }
  const blob = JSON.stringify(core.SERVICE_CATALOGUE);
  assert.equal(/домработ/i.test(blob), false);
  assert.equal(core.getService('cleaning-note').name.ru, 'Сообщение специалисту по дому');
});

test('pick returns the asked language and falls back to et', () => {
  const text = { et: 'Tere', en: 'Hello', ru: 'Здравствуйте' };
  assert.equal(core.pick(text, 'et'), 'Tere');
  assert.equal(core.pick(text, 'en'), 'Hello');
  assert.equal(core.pick(text, 'ru'), 'Здравствуйте');
  assert.equal(core.pick(text, 'fr'), 'Tere');
  assert.equal(core.pick(text, null), 'Tere');
  assert.equal(core.pick({ et: 'Tere', en: 'Hello', ru: '  ' }, 'ru'), 'Tere', 'blank ru must not hide et');
  assert.equal(core.pick({ et: 'Tere', en: 'Hello' }, 'ru'), 'Tere');
  assert.equal(core.pick({ et: 'Tere', en: '', ru: 'Здравствуйте' }, 'en'), 'Tere', 'blank en falls back to et');
  assert.equal(core.pick({ et: '', en: '', ru: '' }, 'ru'), '');
  const fns = { et: (n) => `et ${n}`, en: (n) => `en ${n}`, ru: (n) => `ru ${n}` };
  assert.equal(core.pick(fns, 'ru')('Mari'), 'ru Mari');
  assert.equal(core.pick(null, 'en'), undefined);
  assert.equal(core.pick('Tere', 'ru'), undefined);
});

test('serviceKind defaults to visit; question/issue kinds are explicit', () => {
  assert.equal(core.serviceKind('extra-clean'), 'visit');
  assert.equal(core.serviceKind('home-manual'), 'question');
  assert.equal(core.serviceKind('warranty-claim'), 'issue');
  assert.equal(core.serviceKind('does-not-exist'), 'visit');
  assert.equal(core.serviceName('flowers', 'en'), 'Fresh flowers');
  assert.equal(core.serviceName('flowers', 'ru'), 'Свежие цветы');
  assert.equal(core.serviceName('flowers', 'xx'), 'Värsked lilled', 'unknown lang falls back to et');
  assert.equal(core.categoryLabel('cleaning', 'ru'), 'Уборка');
  assert.equal(core.timeWindowLabel('morning', 'ru'), 'Утро (9–12)');
  assert.equal(core.windowStartTime('morning'), '09:00');
  assert.equal(core.windowStartTime('afternoon'), '12:00');
  assert.equal(core.windowStartTime('any'), '09:00');
  assert.equal(core.windowStartTime('with-visit'), '');
  assert.equal(core.providerBroughtHome({ createdBy: 'provider:kristi' }), true);
  assert.equal(core.providerBroughtHome({ createdBy: 'invite:card1' }), true);
  assert.equal(core.providerBroughtHome({ inviteCardId: 'card1' }), true);
  assert.equal(core.providerBroughtHome({ ownerKind: 'provider-invited', brand: { name: 'Arco Vara' } }), true);
  assert.equal(core.providerBroughtHome({ ownerKind: 'developer', createdBy: 'provider:kristi' }), false);
  assert.equal(core.providerBroughtHome({ createdBy: 'welcome:SK', brand: { name: 'Arco Vara' } }), false);
  assert.equal(core.providerBroughtHome({ billing: 'provider', source: 'manual' }), true);
  assert.equal(core.providerBroughtHome({ source: 'stripe', providerName: 'Kristi Kask' }), false);
  assert.equal(core.providerBroughtHome(null), false);
});

// ------------------------------------------------------------
// Dates
// ------------------------------------------------------------

test('parseDateStr accepts only real YYYY-MM-DD dates', () => {
  assert.ok(core.parseDateStr('2026-02-28'));
  assert.equal(core.parseDateStr('2026-02-30'), null);
  assert.equal(core.parseDateStr('2026-13-01'), null);
  assert.equal(core.parseDateStr('22.09.2026'), null);
  assert.equal(core.parseDateStr(null), null);
  assert.equal(core.toDateStr(core.parseDateStr('2026-09-22')), '2026-09-22');
});

test('addMonths clamps to the last day of the target month', () => {
  assert.equal(core.toDateStr(core.addMonths(core.parseDateStr('2026-08-31'), 3)), '2026-11-30');
  assert.equal(core.toDateStr(core.addMonths(core.parseDateStr('2026-01-31'), 1)), '2026-02-28');
  assert.equal(core.toDateStr(core.addMonths(core.parseDateStr('2028-01-31'), 1)), '2028-02-29', 'leap year');
});

// ------------------------------------------------------------
// Schedule → occurrences
// ------------------------------------------------------------

test('sanitizeSchedule validates and derives weekday from the anchor', () => {
  const ok = core.sanitizeSchedule({ frequency: 'biweekly', anchorDate: '2026-09-01', time: '09:30', durationMin: 180, note: 'x' });
  assert.equal(ok.error, undefined);
  assert.equal(ok.schedule.weekday, 2, '2026-09-01 is a Tuesday');
  assert.equal(ok.schedule.active, true);

  assert.ok(core.sanitizeSchedule({ frequency: 'daily', anchorDate: '2026-09-01', time: '09:00', durationMin: 120 }).error);
  assert.ok(core.sanitizeSchedule({ frequency: 'weekly', anchorDate: '2026-09-31', time: '09:00', durationMin: 120 }).error);
  assert.ok(core.sanitizeSchedule({ frequency: 'weekly', anchorDate: '2026-09-01', time: '9:00', durationMin: 120 }).error, 'HH:MM required');
  assert.ok(core.sanitizeSchedule({ frequency: 'weekly', anchorDate: '2026-09-01', time: '09:00', durationMin: 20 }).error);
  assert.ok(core.sanitizeSchedule({ frequency: 'weekly', anchorDate: '2026-09-01', time: '09:00', durationMin: 601 }).error);
  assert.deepEqual(core.sanitizeSchedule({ active: false }).schedule, { active: false });
});

test('weekly occurrences keep the anchor weekday inside the window', () => {
  const s = { active: true, frequency: 'weekly', anchorDate: '2026-09-01' };
  assert.deepEqual(core.generateOccurrences(s, '2026-09-10', '2026-09-30'), ['2026-09-15', '2026-09-22', '2026-09-29']);
});

test('biweekly occurrences keep parity with the anchor', () => {
  const s = { active: true, frequency: 'biweekly', anchorDate: '2026-09-01' };
  assert.deepEqual(core.generateOccurrences(s, '2026-09-02', '2026-10-01'), ['2026-09-15', '2026-09-29']);
  assert.deepEqual(core.generateOccurrences(s, '2026-09-01', '2026-09-01'), ['2026-09-01'], 'anchor day itself is included');
});

test('monthly occurrences use the nth weekday of the anchor', () => {
  const s = { active: true, frequency: 'monthly', anchorDate: '2026-09-01' }; // 1st Tuesday
  assert.deepEqual(core.generateOccurrences(s, '2026-10-01', '2026-12-31'), ['2026-10-06', '2026-11-03', '2026-12-01']);
});

test('occurrences: inactive schedule, inverted window and dates before the anchor give nothing', () => {
  const s = { active: true, frequency: 'weekly', anchorDate: '2026-09-01' };
  assert.deepEqual(core.generateOccurrences({ ...s, active: false }, '2026-09-01', '2026-09-30'), []);
  assert.deepEqual(core.generateOccurrences(s, '2026-09-30', '2026-09-01'), []);
  assert.deepEqual(core.generateOccurrences(s, '2026-08-01', '2026-08-31'), [], 'nothing before the anchor');
});

test('nthWeekdayOfMonth falls back to the last such weekday when the month has no 5th', () => {
  // 5th Tuesday of September 2026 does not exist (Tuesdays: 1, 8, 15, 22, 29 — it does) → use October: Tuesdays 6, 13, 20, 27
  assert.equal(core.toDateStr(core.nthWeekdayOfMonth(2026, 9, 2, 5)), '2026-10-27');
});

// ------------------------------------------------------------
// Holidays
// ------------------------------------------------------------

test('Estonian holidays 2026 include fixed and moving days', () => {
  const h = core.estonianHolidays(2026);
  assert.equal(h['2026-06-24'], 'Jaanipäev');
  assert.equal(h['2026-04-03'], 'Suur reede', 'Easter 2026 is 5 April');
  assert.equal(h['2026-04-05'], 'Ülestõusmispühade 1. püha');
  assert.equal(h['2026-05-24'], 'Nelipühade 1. püha');
  assert.equal(core.holidayName('2026-12-24'), 'Jõululaupäev');
  assert.equal(core.holidayName('2026-09-22'), null);
});

test('morning push is one line per provider, counting homes, with no access note', () => {
  const today = '2026-09-24';
  const visits = [
    { id: 'a', providerId: 'cristelle', orderId: 'home-1', status: 'scheduled', date: today, access: '1234#' },
    { id: 'b', providerId: 'cristelle', orderId: 'home-2', status: 'confirmed', date: today },
    { id: 'c', providerId: 'cristelle', orderId: 'home-1', status: 'scheduled', date: today },
    { id: 'd', providerId: 'kalle', orderId: 'home-3', status: 'scheduled', date: today },
    { id: 'e', providerId: 'cristelle', orderId: 'home-9', status: 'cancelled', date: today },
    { id: 'f', providerId: 'cristelle', orderId: 'home-8', status: 'completed', date: today },
    { id: 'g', providerId: 'cristelle', orderId: 'home-7', status: 'scheduled', date: '2026-09-25' },
    { id: 'h', providerId: '', orderId: 'home-4', status: 'scheduled', date: today },
    { id: 'i', providerId: 'kalle', status: 'scheduled', date: today },
  ];
  const rows = core.morningRecipients(visits, today);
  assert.deepEqual(rows, [
    { providerId: 'cristelle', count: 2 },
    { providerId: 'kalle', count: 2 },
  ]);
  assert.equal(JSON.stringify(rows).includes('1234'), false);
  assert.equal(Object.keys(rows[0]).join(','), 'providerId,count');
  assert.deepEqual(core.morningRecipients(null, today), []);
});

test('07:00 cron sends morning push to the provider and does not put a door code in it', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../haldus.js'), 'utf8');
  const start = src.indexOf('async function sendMorningPushes');
  const end = src.indexOf('const sendFlowerOrdersJob');
  assert.ok(start > 0 && end > start);
  const job = src.slice(start, end);
  assert.equal(job.split("push.send('morning'").length - 1, 1);
  assert.match(job, /sendMorningPushes\(providerCache\)/);
  assert.match(job, /audience: 'provider'/);
  assert.doesNotMatch(job, /access|uksekood|homeProfile/i);
});

// ------------------------------------------------------------
// Away periods
// ------------------------------------------------------------

test('sanitizeAwayPeriod rejects past, inverted, too long and overlapping periods', () => {
  assert.ok(core.sanitizeAwayPeriod({ from: '2026-09-01', to: '2026-09-10' }, TODAY).error, 'already over');
  assert.ok(core.sanitizeAwayPeriod({ from: '2026-10-10', to: '2026-10-01' }, TODAY).error, 'end before start');
  assert.ok(core.sanitizeAwayPeriod({ from: '2026-10-01', to: '2027-04-30' }, TODAY).error, 'longer than 180 days');
  const existing = [{ from: '2026-10-01', to: '2026-10-10' }];
  assert.ok(core.sanitizeAwayPeriod({ from: '2026-10-05', to: '2026-10-12' }, TODAY, existing).error, 'overlap');
  const ok = core.sanitizeAwayPeriod({ from: '2026-10-11', to: '2026-10-12', note: 'reis' }, TODAY, existing);
  assert.equal(ok.error, undefined);
  assert.equal(ok.period.note, 'reis');
  assert.ok(ok.period.id);
});

test('sanitizeAwayPeriod caps live periods at MAX_AWAY_PERIODS but ignores ended ones', () => {
  const ended = Array.from({ length: 6 }, (_, i) => ({ from: `2026-01-0${i + 1}`, to: `2026-01-0${i + 1}` }));
  assert.equal(core.sanitizeAwayPeriod({ from: '2026-10-01' }, TODAY, ended).error, undefined, 'ended periods do not count');
  const live = Array.from({ length: 6 }, (_, i) => ({ from: `2026-11-0${i + 1}`, to: `2026-11-0${i + 1}` }));
  assert.ok(core.sanitizeAwayPeriod({ from: '2026-12-01' }, TODAY, live).error);
});

test('isDateAway and liveAwayPeriods', () => {
  const periods = [{ from: '2026-10-01', to: '2026-10-10' }, { from: '2026-09-01', to: '2026-09-05' }];
  assert.equal(core.isDateAway(periods, '2026-10-10'), true, 'inclusive end');
  assert.equal(core.isDateAway(periods, '2026-10-11'), false);
  assert.deepEqual(core.liveAwayPeriods(periods, TODAY).map((p) => p.from), ['2026-10-01']);
});

test('a provider away moves visits to the day after, and two homes at one time do not share it', () => {
  const moves = core.postponeVisits([
    { id: 'a', orderId: 'h1', date: '2026-10-02', time: '10:00', status: 'scheduled' },
    { id: 'b', orderId: 'h2', date: '2026-10-03', time: '10:00', status: 'confirmed' },
    { id: 'c', orderId: 'h1', date: '2026-10-09', time: '14:00', status: 'scheduled' },
    { id: 'd', orderId: 'h3', date: '2026-10-02', time: '10:00', status: 'completed' },
  ], '2026-10-01', '2026-10-03');
  assert.deepEqual(moves.map((m) => [m.id, m.to, m.time]), [
    ['a', '2026-10-04', '10:00'],
    ['b', '2026-10-05', '10:00'],
  ]);
});

// ------------------------------------------------------------
// Kodu rütm — maintenance
// ------------------------------------------------------------

test('sanitizeMaintenanceItem from catalogue rolls the due date forward from lastDoneAt', () => {
  const r = core.sanitizeMaintenanceItem({ catalogId: 'washer-service', lastDoneAt: '2026-08-31', doneBy: 'provider' }, TODAY);
  assert.equal(r.error, undefined);
  assert.equal(r.item.intervalMonths, 3);
  assert.equal(r.item.nextDueAt, '2026-11-30');
  assert.equal(r.item.doneBy, 'provider');
  assert.equal(r.item.serviceId, 'appliance-care');
  assert.equal(r.item.name, null, 'catalogue items carry no custom name');
});

test('residentRhythm keeps weekly, every other week, monthly and once', () => {
  assert.equal(core.residentRhythm('weekly'), 'weekly');
  assert.equal(core.residentRhythm('biweekly'), 'biweekly');
  assert.equal(core.residentRhythm('monthly'), 'monthly');
  assert.equal(core.residentRhythm('once'), 'once');
  assert.equal(core.residentRhythm('daily'), null);
  assert.equal(core.residentRhythm(''), null);
});

test('sanitizeMaintenanceItem without lastDoneAt is due today so the rhythm starts clean', () => {
  const r = core.sanitizeMaintenanceItem({ catalogId: 'vent-filters' }, TODAY);
  assert.equal(r.item.nextDueAt, TODAY);
  assert.equal(r.item.doneBy, 'home');
});

test('sanitizeMaintenanceItem startsAt sets the first due date without claiming it was done', () => {
  const r = core.sanitizeMaintenanceItem({ catalogId: 'windows', startsAt: '2027-03-22', doneBy: 'provider' }, TODAY);
  assert.equal(r.error, undefined);
  assert.equal(r.item.nextDueAt, '2027-03-22');
  assert.equal(r.item.lastDoneAt, null);
  assert.equal(r.item.doneBy, 'provider');
  const past = core.sanitizeMaintenanceItem({ catalogId: 'windows', startsAt: '2026-01-01' }, TODAY);
  assert.ok(past.error);
  const rolled = core.sanitizeMaintenanceItem({ catalogId: 'windows', lastDoneAt: '2026-08-31', startsAt: '2027-03-22' }, TODAY);
  assert.equal(rolled.item.nextDueAt, '2027-02-28', 'a known last date wins over startsAt');
});

test('sanitizeMaintenanceItem validation', () => {
  assert.ok(core.sanitizeMaintenanceItem({ catalogId: 'nope' }, TODAY).error);
  assert.ok(core.sanitizeMaintenanceItem({ name: 'A' }, TODAY).error, 'custom name too short');
  assert.ok(core.sanitizeMaintenanceItem({ name: 'Ahi', intervalMonths: 5 }, TODAY).error, 'interval not in list');
  assert.ok(core.sanitizeMaintenanceItem({ name: 'Ahi', lastDoneAt: '2026-10-01' }, TODAY).error, 'future lastDoneAt');
  assert.ok(core.sanitizeMaintenanceItem({ name: 'Ahi', lastDoneAt: '2026-02-30' }, TODAY).error, 'invalid date');
  const custom = core.sanitizeMaintenanceItem({ name: 'Ahi puhastus', intervalMonths: 6, note: 'x'.repeat(300) }, TODAY);
  assert.equal(custom.item.name, 'Ahi puhastus');
  assert.equal(custom.item.note.length, 200, 'note capped');
});

test('completeMaintenanceItem rolls forward and clears the reminder marker', () => {
  const { item } = core.sanitizeMaintenanceItem({ catalogId: 'dishwasher-filter' }, TODAY); // 1 month
  const done = core.completeMaintenanceItem({ ...item, remindedFor: TODAY }, TODAY, TODAY);
  assert.equal(done.item.lastDoneAt, TODAY);
  assert.equal(done.item.nextDueAt, '2026-10-22');
  assert.equal(done.item.remindedFor, null);
  assert.ok(core.completeMaintenanceItem(item, '2026-10-01', TODAY).error, 'cannot complete in the future');
  const defaulted = core.completeMaintenanceItem(item, 'garbage', TODAY);
  assert.equal(defaulted.item.lastDoneAt, TODAY, 'invalid date defaults to today');
});

test('maintenanceState: overdue / due within 14 days / ok; maintenanceNextDue picks the earliest', () => {
  assert.equal(core.maintenanceState({ nextDueAt: '2026-09-21' }, TODAY), 'overdue');
  assert.equal(core.maintenanceState({ nextDueAt: '2026-10-06' }, TODAY), 'due', '14th day is still due');
  assert.equal(core.maintenanceState({ nextDueAt: '2026-10-07' }, TODAY), 'ok');
  assert.equal(core.maintenanceNextDue([{ nextDueAt: '2026-12-01' }, { nextDueAt: '2026-10-01' }]), '2026-10-01');
  assert.equal(core.maintenanceNextDue([]), null);
  assert.equal(core.maintenanceName({ catalogId: 'hood-filter' }, 'en'), 'Range hood filter');
  assert.equal(core.maintenanceName({ name: 'Ahi' }, 'en'), 'Ahi');
});

// ------------------------------------------------------------
// Contacts and recipients
// ------------------------------------------------------------

test('sanitizeContacts normalises, dedupes and caps', () => {
  const r = core.sanitizeContacts([
    { name: 'Anna', email: ' Anna@Example.com ', phone: '555' },
    { name: 'Anna again', email: 'anna@example.com' },
    { name: '', email: '' },
    { email: 'x@y.ee', notify: false },
  ]);
  assert.equal(r.error, undefined);
  assert.equal(r.contacts.length, 2);
  assert.equal(r.contacts[0].email, 'anna@example.com');
  assert.equal(r.contacts[0].notify, true);
  assert.equal(r.contacts[1].name, 'x@y.ee', 'name falls back to email');
  assert.equal(r.contacts[1].notify, false);
  assert.ok(core.sanitizeContacts([{ name: 'B', email: 'not-an-email' }]).error);
  assert.ok(core.sanitizeContacts(Array.from({ length: 7 }, (_, i) => ({ name: `C${i}` }))).error);
  assert.deepEqual(core.sanitizeContacts(null), { contacts: [] });
  assert.equal(core.sanitizeContacts([{ name: 'Mari', email: 'mari@kodu.ee', role: 'tenant' }]).contacts[0].role, 'tenant');
  assert.equal(core.sanitizeContacts([{ name: 'Mari', email: 'mari@kodu.ee', role: 'owner' }]).contacts[0].role, 'household');
});

test('a tenant does not see ownership documents; other roles do', () => {
  const order = {
    customer: { email: 'omanik@kodu.ee', address: 'Iili 8-14' },
    contacts: [{ email: 'uur@kodu.ee', role: 'tenant' }, { email: 'pere@kodu.ee', role: 'household' }],
    documents: [{ id: 'a', category: 'ownership', title: 'Müügileping' }, { id: 'b', category: 'appliances', title: 'Pliit' }],
    buildingDocuments: [{ id: 'c', category: 'ownership', title: 'Maa' }],
  };
  assert.equal(core.viewerRole(order, 'omanik@kodu.ee'), 'owner');
  assert.equal(core.viewerRole(order, 'uur@kodu.ee'), 'tenant');
  assert.equal(core.viewerRole(order, 'pere@kodu.ee'), 'member');
  const hidden = core.withoutOwnership(order);
  assert.deepEqual(hidden.documents.map((d) => d.id), ['b']);
  assert.deepEqual(hidden.buildingDocuments, []);
  assert.equal(order.documents.length, 2);
});

test('one e-mail lists each paid home it can open', () => {
  const rows = [
    { id: 'h1', status: 'paid', type: 'subscription', customer: { email: 'anna@kodu.ee', address: 'Iili 8-14' } },
    { id: 'h2', status: 'paid', type: 'subscription', customer: { email: 'muu@kodu.ee', address: 'Spordi 3' }, contacts: [{ email: 'anna@kodu.ee', role: 'tenant' }] },
    { id: 'h3', status: 'paid', type: 'gift', customer: { email: 'anna@kodu.ee' } },
    { id: 'h4', status: 'cancelled', customer: { email: 'anna@kodu.ee', address: 'Vana' } },
  ];
  assert.deepEqual(core.homesForEmail(rows, 'Anna@kodu.ee'), [
    { id: 'h1', address: 'Iili 8-14', role: 'owner' },
    { id: 'h2', address: 'Spordi 3', role: 'tenant' },
  ]);
});

test('selling a home keeps the address and drops the door note and contacts', () => {
  const sale = core.saleCustomer({
    customer: { name: 'Vana', email: 'vana@kodu.ee', address: 'Iili 8-14', phone: '555' },
    homeProfile: { access: '1408#', pets: 'Ei' },
    contacts: [{ email: 'pere@kodu.ee' }],
    documents: [{ id: 'b' }],
  }, { name: ' Uus Omanik ', email: 'Uus@Kodu.ee' });
  assert.equal(sale.customer.email, 'uus@kodu.ee');
  assert.equal(sale.customer.address, 'Iili 8-14');
  assert.equal(sale.customer.phone, '');
  assert.equal(sale.homeProfile.access, '');
  assert.equal(sale.homeProfile.pets, 'Ei');
  assert.deepEqual(sale.contacts, []);
  assert.equal(core.saleCustomer({ customer: {} }, { name: 'A', email: 'uus@kodu.ee' }).error, 'name');
  assert.equal(core.saleCustomer({ customer: {} }, { name: 'Uus', email: 'ei' }).error, 'email');
});

test('resolveRecipients: primary customer or gift recipient plus notifying contacts, deduped', () => {
  const order = {
    customer: { email: 'Marko@sukoda.ee', name: 'Marko' },
    contacts: [
      { email: 'marko@sukoda.ee', name: 'dup', notify: true },
      { email: 'pere@sukoda.ee', name: 'Pere', notify: true },
      { email: 'vait@sukoda.ee', name: 'Vait', notify: false },
      { email: 'bad', name: 'Bad', notify: true },
    ],
  };
  assert.deepEqual(core.resolveRecipients(order).map((r) => r.email), ['marko@sukoda.ee', 'pere@sukoda.ee']);
  const gift = { type: 'gift', recipient: { email: 'saaja@sukoda.ee', name: 'Saaja' }, customer: { email: 'ostja@sukoda.ee' } };
  assert.deepEqual(core.resolveRecipients(gift).map((r) => r.email), ['saaja@sukoda.ee'], 'gift goes to the recipient, not the buyer');
  assert.deepEqual(core.resolveRecipients(null), []);
});

// ------------------------------------------------------------
// Documents
// ------------------------------------------------------------

test('sanitizeDocument requires a title, https link, known category', () => {
  assert.ok(core.sanitizeDocument({ title: 'A' }).error);
  assert.ok(core.sanitizeDocument({ title: 'Juhend', url: 'http://insecure' }).error);
  const r = core.sanitizeDocument({ title: 'Kasutusjuhend', url: 'https://x.ee/a.pdf', category: 'nope' });
  assert.equal(r.document.category, 'other');
  assert.equal(r.document.url, 'https://x.ee/a.pdf');
  assert.equal(core.sanitizeDocument({ title: 'Ilma lingita' }).document.url, null);
});

// ------------------------------------------------------------
// Provider plans
// ------------------------------------------------------------

test('effectivePlan: admin-created or enterprise → enterprise; paid plan counts only while Stripe says alive', () => {
  assert.equal(core.effectivePlan({ createdBy: 'admin' }), 'enterprise');
  assert.equal(core.effectivePlan({ plan: 'enterprise' }), 'enterprise');
  assert.equal(core.effectivePlan({ plan: 'pro', planStatus: 'active' }), 'pro');
  assert.equal(core.effectivePlan({ plan: 'pro', planStatus: 'past_due' }), 'pro');
  assert.equal(core.effectivePlan({ plan: 'pro', planStatus: 'canceled' }), 'free');
  assert.equal(core.effectivePlan({ plan: 'weird' }), 'free');
  assert.equal(core.effectivePlan(null), 'free');
  assert.equal(core.planLimit('free'), 3);
  assert.equal(core.planLimit('pro'), 20);
  assert.equal(core.planLimit('studio'), Infinity);
  assert.equal(core.planByLookupKey('sukoda_provider_pro_monthly').id, 'pro');
  assert.equal(core.planByLookupKey('nope'), null);
});

// ------------------------------------------------------------
// Misc
// ------------------------------------------------------------

test('overlaps is half-open on both ends', () => {
  assert.equal(core.overlaps(9, 12, 12, 15), false, 'touching intervals do not overlap');
  assert.equal(core.overlaps(9, 12, 11, 15), true);
  assert.equal(core.overlaps(9, 12, 8, 9), false);
});

test('isValidEmail and normalizeEmail', () => {
  assert.equal(core.isValidEmail(' A@B.ee '), true);
  assert.equal(core.isValidEmail('a@b'), false);
  assert.equal(core.isValidEmail(''), false);
  assert.equal(core.normalizeEmail(' X@Y.EE '), 'x@y.ee');
});

test('login code is six digits, expires, and rejects a wrong or locked code', () => {
  assert.equal(core.generateLoginCode(7), '000007');
  assert.equal(core.generateLoginCode(999999), '999999');
  assert.equal(core.generateLoginCode(1000000), null);
  assert.equal(core.generateLoginCode(1.5), null);
  const email = 'kristi@sukoda.ee';
  const code = core.generateLoginCode(42);
  const now = new Date('2026-09-23T12:00:00Z');
  const record = {
    codeHash: core.hashLoginCode(email, code),
    expiresAt: core.loginCodeExpiresAt(now),
    attempts: 0,
  };
  assert.notEqual(record.codeHash, code);
  assert.equal(core.checkLoginCode({ email, code, record, now: new Date(now.getTime() + 1000) }).ok, true);
  assert.equal(core.checkLoginCode({ email: 'Kristi@SUKODA.ee', code: '000042', record, now }).ok, true);
  assert.equal(core.checkLoginCode({ email, code: '000043', record, now }).reason, 'mismatch');
  assert.equal(core.checkLoginCode({ email, code, record, now: core.loginCodeExpiresAt(now) }).reason, 'expired');
  assert.equal(core.checkLoginCode({ email, code, record: { ...record, attempts: 5 }, now }).reason, 'locked');
  assert.equal(core.checkLoginCode({ email, code, record: null, now }).reason, 'missing');
  const session = core.sessionExpiresAt(now);
  assert.equal(session.toISOString(), '2026-12-22T12:00:00.000Z');
  const extended = core.sessionExpiresAt(new Date('2026-10-01T08:00:00Z'));
  assert.equal(extended.toISOString(), '2026-12-30T08:00:00.000Z');
});

test('visit split never charges and keeps sponsor, resident and provider in balance', () => {
  const gift = core.splitVisitPayment({ priceCents: 4500, sponsorCentsAvailable: 4500, ownerKind: 'developer' });
  assert.equal(gift.charged, false);
  assert.equal(gift.cardRequired, false);
  assert.equal(gift.residentCents, 0);
  assert.equal(gift.sponsorCents, 4500);
  assert.equal(gift.feeCents, 1350);
  assert.equal(gift.providerCents, 3150);
  assert.equal(gift.stripeCents, 0);

  const part = core.splitVisitPayment({ priceCents: 8000, sponsorCentsAvailable: 3000, ownerKind: 'sukoda' });
  assert.equal(part.sponsorCents + part.residentCents, 8000);
  assert.equal(part.cardRequired, true);
  assert.equal(part.charged, false);
  assert.ok(part.stripeCents <= part.feeCents);
  assert.equal(part.providerCents, 8000 - part.feeCents);

  const own = core.splitVisitPayment({ priceCents: 4500, sponsorCentsAvailable: 0, ownerKind: 'provider-invited' });
  assert.equal(own.feeCents, 0);
  assert.equal(own.providerCents, 4500 - own.stripeCents);
  assert.equal(own.charged, false);

  assert.equal(core.sponsorRemainingCents({ budgetCents: 10000, usedCents: 2500, validUntil: '2026-12-01' }, '2026-09-23'), 7500);
  assert.equal(core.sponsorRemainingCents({ budgetCents: 10000, usedCents: 0, validUntil: '2026-01-01' }, '2026-09-23'), 0);
  assert.equal(core.earnedCents([{ providerCents: 3150 }, { providerCents: 1000 }, {}]), 4150);
  assert.equal(core.earliestBookableDate('2026-09-23', 14), '2026-10-07');
  assert.equal(core.warrantyUntilDate('2026-11-01'), '2028-11-01');
  const avail = core.sanitizeAvailability({ days: [1, 1, 8], leadDays: 14, maxPerDay: 3, districts: ['Kristiine'] });
  assert.deepEqual(avail.days, [1]);
  assert.equal(avail.leadDays, 14);
  assert.equal(avail.districts[0], 'Kristiine');
  assert.equal(core.guidePriceCents('alates 89 €'), 8900);
  assert.equal(core.guidePriceCents('hind kokkuleppel'), null);
  assert.equal(core.guidePriceCents('Garantii korras'), null);
  const wish = core.orderQuote({
    serviceId: 'extra-clean',
    addonIds: ['flowers', 'linens', 'nope', 'flowers'],
    sponsorCentsAvailable: 0,
    ownerKind: 'sukoda',
    today: '2026-09-23',
    leadDays: 14,
    lang: 'et',
  });
  assert.deepEqual(wish.lines.map((l) => l.id), ['extra-clean', 'flowers', 'linens']);
  assert.equal(wish.unpriced, false);
  assert.equal(wish.charged, false);
  assert.equal(wish.payLater, true);
  assert.equal(wish.earliest, '2026-10-07');
  assert.equal(wish.lines.find((l) => l.id === 'extra-clean').cents, 14000);
  assert.equal(wish.lines.find((l) => l.id === 'flowers').cents, 3500);
  assert.equal(wish.residentCents, 19500);
  const once = core.orderQuote({
    serviceId: 'extra-clean', addonIds: [], sponsorCentsAvailable: 0, ownerKind: 'developer',
    today: '2026-09-23', leadDays: 14, lang: 'et',
  });
  assert.equal(once.unpriced, false);
  assert.equal(once.cardRequired, true);
  assert.equal(once.residentCents, 14000);
  const gifted = core.orderQuote({
    serviceId: 'extra-clean',
    addonIds: ['flowers'],
    coveredIds: ['extra-clean'],
    sponsorCentsAvailable: 0,
    ownerKind: 'developer',
    today: '2026-09-23',
    leadDays: 14,
    lang: 'et',
  });
  assert.equal(gifted.unpriced, false);
  assert.equal(gifted.cardRequired, true);
  assert.equal(gifted.residentCents, 3500);
  assert.equal(gifted.lines.find((l) => l.id === 'extra-clean').covered, true);
  assert.equal(core.giftSpent('extra-clean', []), false);
  assert.equal(core.giftSpent('extra-clean', ['extra-clean']), true);
  assert.equal(core.giftSpent('regular', ['extra-clean']), true);
  assert.equal(core.giftSpent('windows', ['extra-clean']), false);
  assert.equal(core.giftSpent('small-repairs', []), false);
  assert.equal(core.giftSpent('small-repairs', ['hang-mount']), true);
  assert.equal(core.giftSpent('flowers', ['extra-clean']), false);
  assert.equal(core.chargeBeforeDispatch({ ownClient: false, kind: 'visit', unpriced: false, cardRequired: true, residentCents: 3500 }), true);
  assert.equal(core.chargeBeforeDispatch({ ownClient: false, kind: 'visit', unpriced: false, cardRequired: false, residentCents: 0 }), false);
  assert.equal(core.chargeBeforeDispatch({ ownClient: true, kind: 'visit', unpriced: false, cardRequired: true, residentCents: 3500 }), false);
  assert.equal(core.chargeBeforeDispatch({ ownClient: false, kind: 'issue', unpriced: true, cardRequired: false, residentCents: 0 }), false);
  assert.equal(core.chargeBeforeDispatch({ ownClient: false, kind: 'visit', unpriced: true, cardRequired: true, residentCents: 3500 }), false);
  assert.equal(core.homePaymentReady({ payment_status: 'paid', currency: 'eur', amount_total: 3500 }, { residentCents: 3500 }), true);
  assert.equal(core.homePaymentReady({ payment_status: 'unpaid', currency: 'eur', amount_total: 3500 }, { residentCents: 3500 }), false);
  assert.equal(core.homePaymentReady({ payment_status: 'no_payment_required', currency: 'eur', amount_total: 0 }, { residentCents: 3500 }), false);
  assert.equal(core.homePaymentReady({ payment_status: 'paid', currency: 'eur', amount_total: 1000 }, { residentCents: 3500 }), false);
  assert.equal(core.homePaymentReady({ currency: 'eur', amount_total: 3500 }, { residentCents: 3500 }), false);
  assert.equal(core.homePaymentReady({ payment_status: 'paid', currency: 'usd', amount_total: 3500 }, { residentCents: 3500 }), false);
  const covered = core.orderQuote({
    serviceId: 'windows',
    addonIds: [],
    sponsorCentsAvailable: 4500,
    ownerKind: 'developer',
    today: '2026-09-23',
    leadDays: 14,
  });
  assert.equal(covered.unpriced, false);
  assert.equal(covered.cardRequired, false);
  assert.equal(covered.payLater, false);
  assert.equal(covered.residentCents, 0);
  const building = core.sanitizeBuilding({ name: 'Iili 8', routes: { warranty: 'hausing', building: 'nope' }, documents: [{ title: 'Juhend', url: 'https://example.com/a.pdf', page: 14 }], sponsor: { budgetCents: 10000, validUntil: '2027-05-01' } });
  assert.equal(building.building.routes.warranty, 'hausing');
  assert.equal(building.building.routes.building, 'desk');
  assert.equal(building.building.documents[0].page, 14);
  assert.equal(building.building.sponsor.budgetCents, 10000);
  assert.equal(core.sanitizeBuilding({ name: '  ' }).error, 'name');
  const hand = core.sanitizeHandover({ apartment: '12', buyerName: 'Mari', buyerEmail: 'Mari@Kodu.ee', keysAt: '2026-11-01' });
  assert.equal(hand.handover.buyerEmail, 'mari@kodu.ee');
  assert.equal(hand.handover.keysAt, '2026-11-01');
  assert.equal(core.sanitizeHandover({ apartment: '12' }).error, 'fields');
  const code = core.handoverCode(Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]));
  assert.equal(code.length, 8);
  assert.equal(/[01OI]/.test(code), false);
  const start = '2026-09-23T10:00:00.000Z';
  assert.equal(core.visitWindowOpen(start, '2026-09-23T12:00:00.000Z', '2026-09-23T09:00:00.000Z'), true);
  assert.equal(core.visitWindowOpen(start, '2026-09-23T12:00:00.000Z', '2026-09-23T06:00:00.000Z'), false);
});

test('auto-place only on a free working day inside notice and hours', () => {
  const base = {
    preferredDate: '2026-10-13', // Tuesday
    timeWindow: 'morning',
    todayStr: '2026-09-25',
    availability: { days: [1, 2, 3, 4, 5], hours: { start: '08:00', end: '17:00' }, leadDays: 14 },
    awayPeriods: [],
  };
  assert.equal(core.canAutoPlaceVisit(base), true);
  assert.equal(core.canAutoPlaceVisit({ ...base, preferredDate: '2026-10-10' }), false); // Saturday
  assert.equal(core.canAutoPlaceVisit({ ...base, preferredDate: '2026-10-06' }), false); // inside 14-day notice
  assert.equal(core.canAutoPlaceVisit({ ...base, awayPeriods: [{ from: '2026-10-12', to: '2026-10-16' }] }), false);
  assert.equal(core.canAutoPlaceVisit({ ...base, timeWindow: 'with-visit' }), false);
  assert.equal(core.weekdayOfDateStr('2026-10-13'), 2);
});

test('122 home previews stay balanced and uncharged', () => {
  for (let i = 0; i < 122; i++) {
    const split = core.splitVisitPayment({
      priceCents: 4500 + i,
      sponsorCentsAvailable: i % 5 === 0 ? 4500 : 0,
      ownerKind: i % 2 ? 'developer' : 'provider-invited',
    });
    assert.equal(split.charged, false);
    assert.equal(split.sponsorCents + split.residentCents, split.priceCents);
    assert.ok(split.providerCents >= 0);
    assert.ok(split.providerCents <= split.priceCents);
  }
});

test('a priced visit tells the cleaner only after Stripe has taken the money', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../haldus.js'), 'utf8');
  const chargeAt = src.indexOf('if (charge) {');
  const freeFinish = src.indexOf('await finishRequest({ order, orderId, provider, svc, kind, ref, request, lang, price: null })');
  assert.ok(chargeAt > 0 && freeFinish > chargeAt);
  const chargeBlock = src.slice(chargeAt, freeFinish);
  assert.match(chargeBlock, /capture_method: 'automatic'/);
  assert.match(chargeBlock, /checkoutUrl: session\.url/);
  assert.doesNotMatch(chargeBlock, /finishRequest|createVisit|sendEmail/);
  const pay = src.slice(src.indexOf('async function completeHomePayment'), src.indexOf('const portalHandlers'));
  assert.match(pay, /homePaymentReady/);
  assert.match(pay, /finishRequest/);
  assert.doesNotMatch(pay, /no_payment_required/);
  const copy = fs.readFileSync(path.join(__dirname, '../../assets/js/minu/telli.js'), 'utf8');
  for (const key of ['confirmPay', 'paidBack', 'payCancelled', 'noPrice']) {
    const at = copy.indexOf(`${key}:`);
    assert.ok(at > 0, key);
    const block = copy.slice(at, at + 420);
    assert.match(block, /et:/);
    assert.match(block, /en:/);
    assert.match(block, /ru:/);
  }
  assert.equal(copy.includes('cardLater'), false);
  assert.doesNotMatch(copy, /praegu raha ei liigu|kaart ühendatakse|kaardilt kohe|charge later/i);
});
