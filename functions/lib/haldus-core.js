/**
 * SUKODA haldus core — pure helpers shared by the provider portal (/haldus),
 * the client portal extras (/minu) and the scheduling cron.
 *
 * No Firebase or network dependencies so this file can be unit-tested directly.
 */

const TALLINN_TIME_ZONE = 'Europe/Tallinn';

// ------------------------------------------------------------
// Service catalogue (lisateenused) shown in /minu
// ------------------------------------------------------------

/**
 * category → which provider on the order handles it:
 *   'cleaning' → order.providerId   (koristus)
 *   'flowers'  → order.floristId    (lilled)
 *   'handyman' → order.handymanId   (remondimees: pildid, filtrid, väiksed remonditööd)
 *   'garden'   → order.gardenerId   (aed & õu)
 * Anything without a matching partner is routed to the SUKODA operator, who finds one.
 */
const SERVICE_CATEGORIES = {
  cleaning: { et: 'Koristus', en: 'Cleaning', orderField: 'providerId' },
  // Developer after-sales: the builder's warranty team handles defects, inspections and "how does this work"
  warranty: { et: 'Garantii ja maja', en: 'Warranty & building', orderField: 'warrantyId' },
  flowers: { et: 'Lilled', en: 'Flowers', orderField: 'floristId' },
  handyman: { et: 'Remondimees', en: 'Handyman', orderField: 'handymanId' },
  garden: { et: 'Aed & õu', en: 'Garden & outdoors', orderField: 'gardenerId' },
};

function categoryLabel(category, lang) {
  const c = SERVICE_CATEGORIES[category];
  if (!c) return category || '';
  return c[lang] || c.et;
}

const SERVICE_CATALOGUE = [
  {
    id: 'deep-clean',
    category: 'cleaning',
    name: { et: 'Süvapuhastus', en: 'Deep clean' },
    description: {
      et: 'Põhjalik hooajaline puhastus: kapid seest, radiaatorid, liistud, plaadivahed.',
      en: 'Thorough seasonal clean: inside cupboards, radiators, skirting boards, tile grout.',
    },
    priceHint: { et: 'alates 89 €', en: 'from €89' },
    durationMin: 240,
  },
  {
    id: 'windows',
    category: 'cleaning',
    name: { et: 'Akende pesu', en: 'Window cleaning' },
    description: {
      et: 'Aknad seest ja väljast, raamid ja aknalauad.',
      en: 'Windows inside and out, frames and sills.',
    },
    priceHint: { et: 'alates 45 €', en: 'from €45' },
    durationMin: 120,
  },
  {
    id: 'fridge-oven',
    category: 'cleaning',
    name: { et: 'Külmkapp ja ahi', en: 'Fridge & oven' },
    description: {
      et: 'Külmkapi ja ahju põhjalik puhastus seest ja väljast.',
      en: 'Deep clean of fridge and oven, inside and out.',
    },
    priceHint: { et: 'alates 35 €', en: 'from €35' },
    durationMin: 90,
  },
  {
    id: 'ironing',
    category: 'cleaning',
    name: { et: 'Triikimine', en: 'Ironing' },
    description: {
      et: 'Triikimine visiidi ajal või eraldi ajal. Hind tunni alusel.',
      en: 'Ironing during a visit or at a separate time. Priced per hour.',
    },
    priceHint: { et: '25 €/h', en: '€25/h' },
    durationMin: 60,
  },
  {
    id: 'linens',
    category: 'cleaning',
    name: { et: 'Voodipesu vahetus', en: 'Linen change' },
    description: {
      et: 'Voodipesu ja rätikute vahetus, kasutatud pesu masinasse.',
      en: 'Change bed linen and towels, used linen into the machine.',
    },
    priceHint: { et: 'alates 20 €', en: 'from €20' },
    durationMin: 30,
  },
  {
    id: 'plants',
    category: 'cleaning',
    name: { et: 'Taimede kastmine', en: 'Plant care' },
    description: {
      et: 'Reisi ajal taimede kastmine ja kodu ülevaatus.',
      en: 'Watering plants and checking the home while you travel.',
    },
    priceHint: { et: '15 €/visiit', en: '€15/visit' },
    durationMin: 30,
  },
  {
    id: 'flowers',
    category: 'flowers',
    name: { et: 'Värsked lilled', en: 'Fresh flowers' },
    description: {
      et: 'Hooajaline kimp vastavalt sinu lillede eelistusele, tuuakse koju või koristusvisiidiga.',
      en: 'A seasonal bouquet matching your flower preference, delivered to your home or with a cleaning visit.',
    },
    priceHint: { et: 'alates 35 €', en: 'from €35' },
    durationMin: 0,
  },
  // — Garantii ja maja (arendaja järelteenindus) —
  {
    id: 'warranty-claim',
    category: 'warranty',
    name: { et: 'Garantiipöördumine', en: 'Warranty claim' },
    description: {
      et: 'Praod, viimistlus, uksed ja aknad, vuugid, tehnosüsteemid — kirjelda puudust, garantiimeeskond kinnitab ülevaatuse aja.',
      en: 'Cracks, finishes, doors and windows, seals, building systems — describe the defect, the warranty team confirms an inspection time.',
    },
    priceHint: { et: 'garantii korras', en: 'under warranty' },
    durationMin: 60,
  },
  {
    id: 'warranty-inspection',
    category: 'warranty',
    name: { et: 'Garantiiülevaatus', en: 'Warranty inspection' },
    description: {
      et: 'Korteri plaaniline ülevaatus 1. ja 2. aasta lõpus. Puudused fikseeritakse ühe aktiga ja parandatakse ühe käiguga.',
      en: 'Scheduled inspection at the end of year 1 and year 2. Defects recorded in one report, fixed in one round.',
    },
    priceHint: { et: 'garantii korras', en: 'under warranty' },
    durationMin: 90,
  },
  {
    id: 'systems-tuning',
    category: 'warranty',
    name: { et: 'Ventilatsiooni ja kütte seadistus', en: 'Ventilation & heating setup' },
    description: {
      et: 'Ventilatsiooniseadme režiimid, põrandakütte termostaadid, soojussõlme näidud — seadistame ja näitame, kuidas kodu töötab.',
      en: 'Ventilation unit modes, floor-heating thermostats, heat substation readings — we set it up and show you how your home works.',
    },
    priceHint: { et: 'garantiiajal tasuta', en: 'free during warranty' },
    durationMin: 60,
  },
  {
    id: 'home-manual',
    category: 'warranty',
    name: { et: 'Küsimus kodu või dokumendi kohta', en: 'Question about the home or a document' },
    description: {
      et: 'Kasutusjuhend, korteri plaan, seadme garantii või maja kord — vastame kirjalikult, vajadusel tuleme kohale.',
      en: 'User manual, floor plan, appliance warranty or house rules — we reply in writing and come by if needed.',
    },
    priceHint: { et: 'tasuta', en: 'free' },
    durationMin: 30,
  },
  {
    id: 'meter-readings',
    category: 'warranty',
    name: { et: 'Näidud ja mõõturid', en: 'Meters & readings' },
    description: {
      et: 'Vee-, kütte- ja elektrimõõturite näidud, kaugloetava mõõturi kontroll või näidu parandus ühistule.',
      en: 'Water, heating and electricity readings, remote-meter check or a correction sent to the association.',
    },
    priceHint: { et: 'tasuta', en: 'free' },
    durationMin: 30,
  },
  // — Remondimees —
  {
    id: 'hang-mount',
    category: 'handyman',
    name: { et: 'Piltide ja riiulite paigaldus', en: 'Hanging pictures & shelves' },
    description: {
      et: 'Maalid, peeglid, riiulid, kardinapuud ja teler seinale — täpselt ja jälgi jätmata.',
      en: 'Paintings, mirrors, shelves, curtain rails and TV on the wall — precisely and cleanly.',
    },
    priceHint: { et: 'alates 45 €', en: 'from €45' },
    durationMin: 90,
  },
  {
    id: 'vent-filters',
    category: 'handyman',
    name: { et: 'Ventilatsioonifiltrite vahetus', en: 'Ventilation filter change' },
    description: {
      et: 'Soojustagastusega ventilatsiooni filtrite vahetus ja seadme kontroll. Soovitatav iga 6 kuu tagant.',
      en: 'Filter change and check of your heat-recovery ventilation unit. Recommended every 6 months.',
    },
    priceHint: { et: 'alates 55 €', en: 'from €55' },
    durationMin: 60,
  },
  {
    id: 'small-repairs',
    category: 'handyman',
    name: { et: 'Väiksed remonditööd', en: 'Small repairs' },
    description: {
      et: 'Tilkuv kraan, logisev uks, silikoonivuugid, pistikud ja lülitid, valgustid ja pirnid.',
      en: 'Dripping tap, loose door, silicone seals, sockets and switches, light fittings and bulbs.',
    },
    priceHint: { et: 'alates 45 €/h', en: 'from €45/h' },
    durationMin: 90,
  },
  {
    id: 'assembly',
    category: 'handyman',
    name: { et: 'Mööbli kokkupanek', en: 'Furniture assembly' },
    description: {
      et: 'Uue mööbli kokkupanek ja paigaldus, pakendi äravedu.',
      en: 'Assembly and placement of new furniture, packaging taken away.',
    },
    priceHint: { et: 'alates 45 €/h', en: 'from €45/h' },
    durationMin: 120,
  },
  // — Aed & õu —
  {
    id: 'lawn',
    category: 'garden',
    name: { et: 'Muru niitmine', en: 'Lawn mowing' },
    description: {
      et: 'Niitmine, servade trimmimine ja niite äravedu. Ühekordselt või hooajaks.',
      en: 'Mowing, edge trimming and clippings removed. One-off or for the season.',
    },
    priceHint: { et: 'alates 45 €', en: 'from €45' },
    durationMin: 90,
  },
  {
    id: 'hedge',
    category: 'garden',
    name: { et: 'Heki ja põõsaste lõikus', en: 'Hedge & shrub trimming' },
    description: {
      et: 'Hekk, põõsad ja viljapuud õigel ajal ja õige kujuga; oksad ära.',
      en: 'Hedges, shrubs and fruit trees trimmed at the right time and shape; branches removed.',
    },
    priceHint: { et: 'alates 65 €', en: 'from €65' },
    durationMin: 120,
  },
  {
    id: 'outdoor-wash',
    category: 'garden',
    name: { et: 'Terrassi ja tänavakivide pesu', en: 'Terrace & paving wash' },
    description: {
      et: 'Survepesu terrassile, tänavakividele ja fassaadi alaosale; vihmaveerennide puhastus.',
      en: 'Pressure wash for terrace, paving and lower façade; gutters cleared.',
    },
    priceHint: { et: 'alates 95 €', en: 'from €95' },
    durationMin: 180,
  },
  {
    id: 'seasonal-garden',
    category: 'garden',
    name: { et: 'Kevad- ja sügiskoristus õues', en: 'Spring & autumn garden clean-up' },
    description: {
      et: 'Lehed, peenrad, aiamööbli hooajaline sisse-välja, lumelükkamise kokkulepe talveks.',
      en: 'Leaves, beds, garden furniture in or out for the season, snow-clearing agreement for winter.',
    },
    priceHint: { et: 'hind kokkuleppel', en: 'price on request' },
    durationMin: 180,
  },
  {
    id: 'other',
    category: 'cleaning',
    name: { et: 'Muu soov', en: 'Something else' },
    description: {
      et: 'Kirjelda, mida vajad. Vastame ja lepime aja kokku.',
      en: 'Describe what you need. We will reply and agree on a time.',
    },
    priceHint: { et: 'hind kokkuleppel', en: 'price on request' },
    durationMin: 60,
  },
];

const SERVICE_BY_ID = Object.fromEntries(SERVICE_CATALOGUE.map((s) => [s.id, s]));

function getService(serviceId) {
  return SERVICE_BY_ID[serviceId] || null;
}

function serviceName(serviceId, lang) {
  const s = getService(serviceId);
  if (!s) return serviceId || '';
  return s.name[lang] || s.name.et;
}

// Preferred time windows a customer can pick when requesting a service
const TIME_WINDOWS = {
  morning: { et: 'Hommik (9–12)', en: 'Morning (9–12)', from: '09:00', to: '12:00' },
  afternoon: { et: 'Pärastlõuna (12–17)', en: 'Afternoon (12–17)', from: '12:00', to: '17:00' },
  any: { et: 'Ükskõik', en: 'Any time', from: '09:00', to: '17:00' },
  'with-visit': { et: 'Koos järgmise koristusega', en: 'With the next cleaning visit', from: null, to: null },
};

function timeWindowLabel(key, lang) {
  const w = TIME_WINDOWS[key];
  if (!w) return '';
  return w[lang] || w.et;
}

// ------------------------------------------------------------
// Contacts + notification recipients
// ------------------------------------------------------------

const MAX_CONTACTS = 6;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  const e = normalizeEmail(email);
  return e.length >= 5 && e.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/**
 * Sanitize an incoming contacts array. Drops entries without a name,
 * normalizes emails, caps the count. Returns { contacts, error }.
 */
function sanitizeContacts(input) {
  if (input == null) return { contacts: [] };
  if (!Array.isArray(input)) return { error: 'contacts must be an array' };
  if (input.length > MAX_CONTACTS) return { error: `Max ${MAX_CONTACTS} contacts` };

  const contacts = [];
  const seenEmails = new Set();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const name = String(raw.name || '').trim().slice(0, 120);
    const email = normalizeEmail(raw.email).slice(0, 320);
    const phone = String(raw.phone || '').trim().slice(0, 40);
    if (!name && !email) continue;
    if (email && !isValidEmail(email)) return { error: `Invalid email: ${email}` };
    if (email && seenEmails.has(email)) continue;
    if (email) seenEmails.add(email);
    contacts.push({
      id: String(raw.id || '').slice(0, 40) || randomId(),
      name: name || email,
      email,
      phone,
      notify: raw.notify !== false,
    });
  }
  return { contacts };
}

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/**
 * Everyone who should receive visit notifications for an order:
 * the primary customer (or gift recipient) plus every contact with notify=true.
 * Deduplicated, lowercased, invalid addresses dropped.
 */
function resolveRecipients(order) {
  const out = [];
  const seen = new Set();
  const push = (email, name) => {
    const e = normalizeEmail(email);
    if (!isValidEmail(e) || seen.has(e)) return;
    seen.add(e);
    out.push({ email: e, name: String(name || '').trim() });
  };

  if (!order) return out;
  if (order.type === 'gift') {
    push(order.recipient?.email, order.recipient?.name);
  } else {
    push(order.customer?.email, order.customer?.name);
  }
  for (const c of order.contacts || []) {
    if (c && c.notify !== false) push(c.email, c.name);
  }
  return out;
}

// ------------------------------------------------------------
// Recurring schedule → occurrences
// ------------------------------------------------------------

const FREQUENCIES = ['weekly', 'biweekly', 'monthly'];

/** Map a schedule frequency to the legacy `order.package` rhythm label */
const FREQUENCY_TO_PACKAGE = { weekly: 'weekly', biweekly: 'twice', monthly: 'once' };

function parseDateStr(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12, 0, 0));
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  return d;
}

function toDateStr(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function addDays(d, n) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Validate + normalize a schedule rule coming from the provider UI */
function sanitizeSchedule(input) {
  if (!input || typeof input !== 'object') return { error: 'schedule required' };
  if (input.active === false) return { schedule: { active: false } };

  const frequency = String(input.frequency || '');
  if (!FREQUENCIES.includes(frequency)) return { error: 'Invalid frequency' };

  const anchor = parseDateStr(input.anchorDate);
  if (!anchor) return { error: 'Invalid anchorDate (YYYY-MM-DD)' };

  const time = String(input.time || '');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { error: 'Invalid time (HH:MM)' };

  const durationMin = Number(input.durationMin);
  if (!Number.isInteger(durationMin) || durationMin < 30 || durationMin > 600) {
    return { error: 'durationMin must be 30–600' };
  }

  return {
    schedule: {
      active: true,
      frequency,
      anchorDate: toDateStr(anchor),
      weekday: anchor.getUTCDay(),
      time,
      durationMin,
      note: String(input.note || '').slice(0, 300),
    },
  };
}

/**
 * Generate occurrence dates (YYYY-MM-DD) for a schedule between fromDateStr and
 * toDateStr (both inclusive). Anchor date defines weekday, biweekly parity and
 * the "nth weekday of month" for monthly rules.
 */
function generateOccurrences(schedule, fromDateStr, toDateStr_) {
  if (!schedule || schedule.active === false) return [];
  const anchor = parseDateStr(schedule.anchorDate);
  const from = parseDateStr(fromDateStr);
  const to = parseDateStr(toDateStr_);
  if (!anchor || !from || !to || to < from) return [];

  const out = [];

  if (schedule.frequency === 'weekly' || schedule.frequency === 'biweekly') {
    const step = schedule.frequency === 'weekly' ? 7 : 14;
    // First occurrence >= from that keeps parity with the anchor
    const diffDays = Math.round((from.getTime() - anchor.getTime()) / 86400000);
    let k = Math.ceil(diffDays / step);
    if (k < 0) k = 0;
    let cur = addDays(anchor, k * step);
    while (cur <= to) {
      if (cur >= from) out.push(toDateStr(cur));
      cur = addDays(cur, step);
    }
    return out;
  }

  if (schedule.frequency === 'monthly') {
    const weekday = anchor.getUTCDay();
    const nth = Math.ceil(anchor.getUTCDate() / 7); // 1..5
    let y = from.getUTCFullYear();
    let m = from.getUTCMonth();
    const endY = to.getUTCFullYear();
    const endM = to.getUTCMonth();
    while (y < endY || (y === endY && m <= endM)) {
      const d = nthWeekdayOfMonth(y, m, weekday, nth);
      if (d && d >= from && d <= to && d >= anchor) out.push(toDateStr(d));
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return out;
  }

  return out;
}

/** nth (1..5) weekday (0=Sun) of a month; falls back to the last one if the month has no 5th */
function nthWeekdayOfMonth(year, month, weekday, nth) {
  const first = new Date(Date.UTC(year, month, 1, 12));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  let day = 1 + offset + (nth - 1) * 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
  while (day > daysInMonth) day -= 7;
  if (day < 1) return null;
  return new Date(Date.UTC(year, month, day, 12));
}

// ------------------------------------------------------------
// Estonian public holidays (riigipühad)
// ------------------------------------------------------------

/** Anonymous Gregorian algorithm → Easter Sunday as UTC noon date */
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month, day, 12));
}

function estonianHolidays(year) {
  const easter = easterSunday(year);
  const fixed = [
    [`${year}-01-01`, 'Uusaasta'],
    [`${year}-02-24`, 'Iseseisvuspäev'],
    [`${year}-05-01`, 'Kevadpüha'],
    [`${year}-06-23`, 'Võidupüha'],
    [`${year}-06-24`, 'Jaanipäev'],
    [`${year}-08-20`, 'Taasiseseisvumispäev'],
    [`${year}-12-24`, 'Jõululaupäev'],
    [`${year}-12-25`, 'Esimene jõulupüha'],
    [`${year}-12-26`, 'Teine jõulupüha'],
  ];
  const moving = [
    [toDateStr(addDays(easter, -2)), 'Suur reede'],
    [toDateStr(easter), 'Ülestõusmispühade 1. püha'],
    [toDateStr(addDays(easter, 49)), 'Nelipühade 1. püha'],
  ];
  return Object.fromEntries([...fixed, ...moving]);
}

const holidayCache = {};
function holidayName(dateStr) {
  const year = Number(String(dateStr).slice(0, 4));
  if (!year) return null;
  if (!holidayCache[year]) holidayCache[year] = estonianHolidays(year);
  return holidayCache[year][dateStr] || null;
}

// ------------------------------------------------------------
// Misc
// ------------------------------------------------------------

const ORDER_SIZES = ['small', 'medium', 'large'];
const SIZE_DEFAULT_DURATION = { small: 120, medium: 180, large: 240 };

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// ------------------------------------------------------------
// Away periods ("oleme eemal") — customer is not home, no visits
// ------------------------------------------------------------

const MAX_AWAY_PERIODS = 6;
const MAX_AWAY_DAYS = 180;

/**
 * Validate an away period. `todayStr` is the Tallinn date (YYYY-MM-DD).
 * Returns { period } or { error }.
 */
function sanitizeAwayPeriod(input, todayStr, existing = []) {
  if (!input || typeof input !== 'object') return { error: 'period required' };
  const from = String(input.from || '');
  const to = String(input.to || from);
  const f = parseDateStr(from);
  const tt = parseDateStr(to);
  if (!f || !tt) return { error: 'Vali algus- ja lõppkuupäev' };
  if (to < from) return { error: 'Lõpp ei saa olla enne algust' };
  if (to < todayStr) return { error: 'Periood on juba möödas' };
  if ((tt - f) / 86400000 > MAX_AWAY_DAYS) return { error: `Periood võib olla kuni ${MAX_AWAY_DAYS} päeva` };
  const live = (existing || []).filter((p) => p.to >= todayStr);
  if (live.length >= MAX_AWAY_PERIODS) return { error: `Kuni ${MAX_AWAY_PERIODS} eemalolekut korraga` };
  if (live.some((p) => p.from <= to && from <= p.to)) return { error: 'Periood kattub olemasoleva eemalolekuga' };
  return {
    period: {
      id: randomId(),
      from,
      to,
      note: String(input.note || '').trim().slice(0, 300),
    },
  };
}

function isDateAway(awayPeriods, dateStr) {
  return (awayPeriods || []).some((p) => p.from <= dateStr && dateStr <= p.to);
}

/** Periods that have not ended yet, soonest first */
function liveAwayPeriods(awayPeriods, todayStr) {
  return (awayPeriods || []).filter((p) => p.to >= todayStr).sort((a, b) => (a.from < b.from ? -1 : 1));
}

// ============================================================
// Kodu hooldusrütm — recurring upkeep the household should not have to remember
// ============================================================

/**
 * Suggested upkeep items. `serviceId` links to the catalogue entry that gets it done when the
 * household would rather order than DIY; `homeTypes` narrows suggestions (house-only items).
 */
const MAINTENANCE_CATALOGUE = [
  { id: 'vent-filters', name: { et: 'Ventilatsiooni filtrid', en: 'Ventilation filters' }, hint: { et: 'Vaheta või pese — must filter tähendab kehva õhku ja suuremat elektriarvet.', en: 'Replace or wash — a dirty filter means poor air and a higher electricity bill.' }, intervalMonths: 6, serviceId: 'vent-filters', homeTypes: ['apartment', 'house'], byProvider: true },
  // New-build home: what the developer's after-sales team wants the owner to keep an eye on
  { id: 'warranty-inspection', name: { et: 'Garantiiülevaatus', en: 'Warranty inspection' }, hint: { et: '1. ja 2. aasta lõpus, enne garantii lõppu — puudused ühe aktiga kirja.', en: 'At the end of year 1 and year 2, before the warranty ends — defects recorded in one report.' }, intervalMonths: 12, serviceId: 'warranty-inspection', homeTypes: ['apartment', 'house'] },
  { id: 'floor-heating', name: { et: 'Põrandakütte termostaadid', en: 'Floor-heating thermostats' }, hint: { et: 'Enne kütteperioodi režiimid ja ajakavad üle vaadata — toad ühtlaselt soojad, arve väiksem.', en: 'Before the heating season check modes and schedules — even warmth, lower bill.' }, intervalMonths: 12, serviceId: 'systems-tuning', homeTypes: ['apartment', 'house'] },
  { id: 'sealant-check', name: { et: 'Silikoonvuukide kontroll', en: 'Silicone seal check' }, hint: { et: 'Vannituba ja köök: pragunenud vuuk laseb vee alla. Garantiiajal parandab ehitaja.', en: 'Bathroom and kitchen: a cracked seal lets water through. Fixed by the builder during warranty.' }, intervalMonths: 12, serviceId: 'warranty-claim', homeTypes: ['apartment', 'house', 'summer'] },
  { id: 'water-meters', name: { et: 'Veemõõtjate näidud', en: 'Water meter readings' }, hint: { et: 'Näidud ühistule iga kuu lõpus, kui mõõturid ei ole kaugloetavad.', en: 'Readings to the association at month end unless the meters are read remotely.' }, intervalMonths: 1, serviceId: 'meter-readings', homeTypes: ['apartment'] },
  { id: 'washer-service', name: { et: 'Pesumasina hooldus', en: 'Washing machine service' }, hint: { et: 'Puhasta filter ja tihend, käivita tühi 90° programm.', en: 'Clean the filter and seal, run an empty 90° cycle.' }, intervalMonths: 3, serviceId: null, homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'dishwasher-filter', name: { et: 'Nõudepesumasina filter', en: 'Dishwasher filter' }, hint: { et: 'Loputa filter ja pihustid; sool ja loputusvahend üle vaadata.', en: 'Rinse the filter and spray arms; check salt and rinse aid.' }, intervalMonths: 1, serviceId: null, homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'hood-filter', name: { et: 'Pliidikubu filter', en: 'Range hood filter' }, hint: { et: 'Metallfilter nõudepesumasinasse, süsinikfilter vahetada.', en: 'Metal filter in the dishwasher, carbon filter replaced.' }, intervalMonths: 3, serviceId: null, homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'smoke-detector', name: { et: 'Suitsuanduri kontroll', en: 'Smoke detector check' }, hint: { et: 'Testnupp ja patarei. Andur ise vahetada iga 10 aasta tagant.', en: 'Test button and battery. Replace the detector itself every 10 years.' }, intervalMonths: 12, serviceId: null, homeTypes: ['apartment', 'house', 'summer'] },
  { id: 'heat-pump', name: { et: 'Soojuspumba filtrid', en: 'Heat pump filters' }, hint: { et: 'Siseosa filtrid pesta; välisosa lehtedest puhtaks.', en: 'Wash indoor unit filters; clear the outdoor unit of leaves.' }, intervalMonths: 3, serviceId: 'small-repairs', homeTypes: ['house', 'summer'] },
  { id: 'boiler', name: { et: 'Boileri ja veesüsteemi kontroll', en: 'Water heater and plumbing check' }, hint: { et: 'Kaitseklapp, anood, lekked ja segistid.', en: 'Safety valve, anode, leaks and taps.' }, intervalMonths: 24, serviceId: 'small-repairs', homeTypes: ['apartment', 'house', 'summer'] },
  { id: 'deep-clean', name: { et: 'Süvapuhastus', en: 'Deep clean' }, hint: { et: 'Mööbli alt, vaibad, radiaatorid, lambid — see, mida tavakoristus ei kata.', en: 'Under furniture, rugs, radiators, lamps — what a regular clean does not cover.' }, intervalMonths: 6, serviceId: 'deep-clean', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'windows', name: { et: 'Akende pesu', en: 'Window cleaning' }, hint: { et: 'Kevadel ja sügisel, seest ja väljast.', en: 'Spring and autumn, inside and out.' }, intervalMonths: 6, serviceId: 'windows', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'gutters', name: { et: 'Vihmaveerennid', en: 'Gutters' }, hint: { et: 'Lehed välja enne külmi, äravool kontrollida.', en: 'Leaves out before the frost, check the downpipes.' }, intervalMonths: 12, serviceId: 'seasonal-garden', homeTypes: ['house', 'summer'] },
  { id: 'chimney', name: { et: 'Korstnapühkija', en: 'Chimney sweep' }, hint: { et: 'Kord aastas, kui on ahi, kamin või katel.', en: 'Once a year if you have a stove, fireplace or boiler.' }, intervalMonths: 12, serviceId: 'other', homeTypes: ['house', 'summer'] },
];
const MAINTENANCE_BY_ID = Object.fromEntries(MAINTENANCE_CATALOGUE.map((m) => [m.id, m]));
const MAX_MAINTENANCE_ITEMS = 30;
const MAINTENANCE_INTERVALS = [1, 2, 3, 6, 12, 24];
const HOME_TYPES = ['apartment', 'house', 'summer'];

function addMonths(d, n) {
  const x = new Date(d.getTime());
  const day = x.getUTCDate();
  x.setUTCDate(1);
  x.setUTCMonth(x.getUTCMonth() + n);
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(day, last));
  return x;
}

/**
 * Build a maintenance item from user input. Either `catalogId` (suggestion) or a custom `name`.
 * `lastDoneAt` is optional: with it the next due date rolls forward by the interval; without a known
 * last date the item is due today, so the household ticks it off once and the rhythm starts clean.
 * Returns { item } or { error }.
 */
function sanitizeMaintenanceItem(input, todayStr) {
  if (!input || typeof input !== 'object') return { error: 'item required' };
  const cat = input.catalogId ? MAINTENANCE_BY_ID[String(input.catalogId)] : null;
  if (input.catalogId && !cat) return { error: 'Unknown item' };
  const name = String(input.name || '').trim().slice(0, 80);
  if (!cat && name.length < 2) return { error: 'Nimi on kohustuslik' };
  const intervalMonths = Number(input.intervalMonths || cat?.intervalMonths || 6);
  if (!MAINTENANCE_INTERVALS.includes(intervalMonths)) return { error: 'Vali sagedus' };
  let lastDoneAt = null;
  if (input.lastDoneAt) {
    const d = parseDateStr(input.lastDoneAt);
    if (!d) return { error: 'Vigane kuupäev' };
    if (input.lastDoneAt > todayStr) return { error: 'Kuupäev ei saa olla tulevikus' };
    lastDoneAt = input.lastDoneAt;
  }
  const nextDueAt = lastDoneAt ? toDateStr(addMonths(parseDateStr(lastDoneAt), intervalMonths)) : todayStr;
  return {
    item: {
      id: randomId(),
      catalogId: cat ? cat.id : null,
      name: cat ? null : name,
      intervalMonths,
      lastDoneAt,
      nextDueAt,
      serviceId: cat ? cat.serviceId : (input.serviceId && String(input.serviceId)) || null,
      note: String(input.note || '').trim().slice(0, 200),
      // 'home' = the household does it and gets the reminder; 'provider' = the housekeeper does it as part of
      // her service, she gets the reminder and the household gets told when it is done
      doneBy: input.doneBy === 'provider' ? 'provider' : 'home',
      remindedFor: null,
    },
  };
}

/** Mark done on `dateStr` (defaults to today) → next due rolls forward from that date */
function completeMaintenanceItem(item, dateStr, todayStr) {
  const when = dateStr && parseDateStr(dateStr) ? dateStr : todayStr;
  if (when > todayStr) return { error: 'Kuupäev ei saa olla tulevikus' };
  return { item: { ...item, lastDoneAt: when, nextDueAt: toDateStr(addMonths(parseDateStr(when), item.intervalMonths)), remindedFor: null } };
}

function maintenanceName(item, lang) {
  const cat = item.catalogId ? MAINTENANCE_BY_ID[item.catalogId] : null;
  return cat ? (cat.name[lang] || cat.name.et) : (item.name || '');
}

/** 'overdue' | 'due' (within 14 days) | 'ok' */
function maintenanceState(item, todayStr) {
  if (item.nextDueAt < todayStr) return 'overdue';
  const soon = toDateStr(addDays(parseDateStr(todayStr), 14));
  return item.nextDueAt <= soon ? 'due' : 'ok';
}

/** Earliest due date across items, for the daily reminder query (flat field on the order) */
function maintenanceNextDue(items) {
  return (items || []).reduce((m, it) => (m === null || it.nextDueAt < m ? it.nextDueAt : m), null);
}

// ============================================================
// Kodu dokumendid — links the household wants to keep with the home
// ============================================================

const DOCUMENT_CATEGORIES = {
  // Pre-filled by the developer at handover: the folder the owner otherwise never finds again
  handover: { et: 'Üleandmine ja garantii', en: 'Handover and warranty' },
  ownership: { et: 'Omand ja lepingud', en: 'Ownership and contracts' },
  appliances: { et: 'Seadmed, juhendid, garantiid', en: 'Appliances, manuals, warranties' },
  building: { et: 'Maja ja ühistu', en: 'Building and association' },
  insurance: { et: 'Kindlustus', en: 'Insurance' },
  works: { et: 'Tehtud tööd', en: 'Work done' },
  other: { et: 'Muu', en: 'Other' },
};
const MAX_DOCUMENTS = 40;

function sanitizeDocument(input) {
  if (!input || typeof input !== 'object') return { error: 'document required' };
  const title = String(input.title || '').trim().slice(0, 120);
  if (title.length < 2) return { error: 'Pealkiri on kohustuslik' };
  const url = String(input.url || '').trim().slice(0, 1000);
  if (url && !/^https:\/\/[^\s]+$/i.test(url)) return { error: 'Link peab algama https://' };
  const category = DOCUMENT_CATEGORIES[input.category] ? input.category : 'other';
  return { document: { id: randomId(), title, url: url || null, category, note: String(input.note || '').trim().slice(0, 300), addedAt: new Date().toISOString() } };
}

// ============================================================
// Provider plans — what the desk costs, stated up front
// ============================================================

/**
 * Month to month, cancel any time, the household never pays. `homes` = active homes on the desk (null = no cap).
 * Paid plans are Stripe subscriptions created on demand by lookup key, so no dashboard setup is needed.
 */
const PROVIDER_PLANS = {
  free: { id: 'free', name: 'Tasuta', price: 0, homes: 3, lookupKey: null, blurb: { et: 'Kuni 3 kodu. Kõik funktsioonid, ilma ajapiiranguta.', en: 'Up to 3 homes. Every feature, no time limit.' } },
  pro: { id: 'pro', name: 'Standard', price: 19, homes: 20, lookupKey: 'sukoda_provider_pro_monthly', blurb: { et: 'Kuni 20 kodu. Iga kuu tühistatav.', en: 'Up to 20 homes. Cancel any month.' } },
  studio: { id: 'studio', name: 'Stuudio', price: 39, homes: null, lookupKey: 'sukoda_provider_studio_monthly', blurb: { et: 'Piiramatult kodusid. Iga kuu tühistatav.', en: 'Unlimited homes. Cancel any month.' } },
};
const PLAN_ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

/** The plan that counts right now: a paid plan only while Stripe says the subscription is alive */
function effectivePlan(provider) {
  const p = provider?.plan && PROVIDER_PLANS[provider.plan] ? provider.plan : 'free';
  if (p === 'free') return 'free';
  return PLAN_ACTIVE_STATUSES.includes(provider.planStatus) ? p : 'free';
}
function planLimit(planId) {
  const p = PROVIDER_PLANS[planId] || PROVIDER_PLANS.free;
  return p.homes === null ? Infinity : p.homes;
}
function planByLookupKey(key) {
  return Object.values(PROVIDER_PLANS).find((p) => p.lookupKey && p.lookupKey === key) || null;
}

module.exports = {
  PROVIDER_PLANS,
  PLAN_ACTIVE_STATUSES,
  effectivePlan,
  planLimit,
  planByLookupKey,
  MAINTENANCE_CATALOGUE,
  MAINTENANCE_INTERVALS,
  MAX_MAINTENANCE_ITEMS,
  HOME_TYPES,
  addMonths,
  sanitizeMaintenanceItem,
  completeMaintenanceItem,
  maintenanceName,
  maintenanceState,
  maintenanceNextDue,
  DOCUMENT_CATEGORIES,
  MAX_DOCUMENTS,
  sanitizeDocument,
  TALLINN_TIME_ZONE,
  MAX_AWAY_PERIODS,
  MAX_AWAY_DAYS,
  sanitizeAwayPeriod,
  isDateAway,
  liveAwayPeriods,
  SERVICE_CATALOGUE,
  SERVICE_CATEGORIES,
  categoryLabel,
  getService,
  serviceName,
  TIME_WINDOWS,
  timeWindowLabel,
  MAX_CONTACTS,
  normalizeEmail,
  isValidEmail,
  sanitizeContacts,
  resolveRecipients,
  FREQUENCIES,
  FREQUENCY_TO_PACKAGE,
  parseDateStr,
  toDateStr,
  addDays,
  sanitizeSchedule,
  generateOccurrences,
  nthWeekdayOfMonth,
  estonianHolidays,
  holidayName,
  ORDER_SIZES,
  SIZE_DEFAULT_DURATION,
  overlaps,
  randomId,
};
