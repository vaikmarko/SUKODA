/**
 * SUKODA haldus core — pure helpers shared by the provider portal (/haldus),
 * the client portal extras (/minu) and the scheduling cron.
 *
 * No Firebase or network dependencies so this file can be unit-tested directly.
 */

const TALLINN_TIME_ZONE = 'Europe/Tallinn';

/** Resident and desk languages. Unknown codes fall back to Estonian. */
const LANGS = ['et', 'en', 'ru'];

/**
 * Language carried on an order (`order.lang`) or a raw code.
 * Missing, empty and anything outside et/en/ru → et.
 */
function langOf(source) {
  const lang = source && typeof source === 'object' ? source.lang : source;
  return lang === 'en' || lang === 'ru' ? lang : 'et';
}

/**
 * One value from `{ et, en, ru }`. A missing key or a blank string falls back to `et`,
 * so an empty `ru` cannot hide the Estonian text. Functions are returned as stored
 * when the chosen language has one. Anything that is not a text object returns undefined.
 */
function pick(obj, lang) {
  if (obj == null || typeof obj !== 'object') return undefined;
  const l = lang === 'en' || lang === 'ru' ? lang : 'et';
  const v = obj[l];
  if (typeof v === 'string') {
    if (v.trim()) return v;
  } else if (v != null) {
    return v;
  }
  return obj.et;
}

/** Russian noun after a count: 1 дом, 2 дома, 5 домов, 11 домов, 21 дом. */
function ruPlural(n, one, few, many) {
  const value = Math.abs(Math.trunc(Number(n)));
  if (!Number.isFinite(value)) return many;
  const n10 = value % 10;
  const n100 = value % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

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
  cleaning: { et: 'Koristus', en: 'Cleaning', ru: 'Уборка', orderField: 'providerId', nameField: 'providerName' },
  // Developer after-sales: the builder's warranty team handles defects, inspections and "how does this work"
  warranty: { et: 'Garantii ja maja', en: 'Warranty & building', ru: 'Гарантия и дом', orderField: 'warrantyId', nameField: 'warrantyName' },
  flowers: { et: 'Lilled', en: 'Flowers', ru: 'Цветы', orderField: 'floristId', nameField: 'floristName' },
  handyman: { et: 'Remondimees', en: 'Handyman', ru: 'Мастер', orderField: 'handymanId', nameField: 'handymanName' },
  building: { et: 'Maja ja haldur', en: 'Building & manager', ru: 'Дом и управляющий', orderField: 'managerId', nameField: 'managerName' },
  garden: { et: 'Aed ja õu', en: 'Garden and outdoors', ru: 'Сад и двор', orderField: 'gardenerId', nameField: 'gardenerName' },
};

function categoryLabel(category, lang) {
  const c = SERVICE_CATEGORIES[category];
  if (!c) return category || '';
  return pick(c, lang);
}

const SERVICE_CATALOGUE = [
  {
    id: 'extra-clean',
    category: 'cleaning',
    name: { et: 'Koristus', en: 'Cleaning', ru: 'Уборка' },
    description: {
      et: 'Ühekordne koristus lisaks tavalisele graafikule.',
      en: 'A one-off clean, in addition to your regular schedule.', ru: 'Разовая уборка помимо обычного графика.',
    },
    priceHint: { et: '140 €', en: '140 €', ru: '140 €' },
    durationMin: 180,
  },
  {
    id: 'deep-clean',
    category: 'cleaning',
    name: { et: 'Süvapuhastus', en: 'Deep clean', ru: 'Генеральная уборка' },
    description: {
      et: 'Kapid seest, radiaatorid, liistud ja plaadivahed.',
      en: 'Inside cupboards, radiators, skirting boards and tile grout.', ru: 'Шкафы внутри, радиаторы, плинтусы и швы плитки.',
    },
    priceHint: { et: 'alates 89 €', en: 'from 89 €', ru: 'от 89 €' },
    durationMin: 240,
  },
  {
    id: 'windows',
    category: 'cleaning',
    name: { et: 'Aknad ja rõdu', en: 'Windows and balcony', ru: 'Окна и балкон' },
    description: {
      et: 'Aknad seest, raamid ja aknalauad, rõdu põrand ja äravool.',
      en: 'Windows from inside, frames and sills, balcony floor and drain.', ru: 'Окна изнутри, рамы и подоконники, пол и слив балкона.',
    },
    priceHint: { et: 'alates 45 €', en: 'from 45 €', ru: 'от 45 €' },
    durationMin: 120,
  },
  {
    id: 'fridge-oven',
    category: 'cleaning',
    name: { et: 'Külmkapp ja ahi', en: 'Fridge & oven', ru: 'Холодильник и духовка' },
    description: {
      et: 'Külmkapp ja ahi seest ja väljast puhtaks.',
      en: 'Fridge and oven cleaned inside and out.', ru: 'Холодильник и духовка внутри и снаружи.',
    },
    priceHint: { et: 'alates 35 €', en: 'from 35 €', ru: 'от 35 €' },
    durationMin: 90,
  },
  {
    id: 'ironing',
    category: 'cleaning',
    name: { et: 'Triikimine', en: 'Ironing', ru: 'Глажка' },
    description: {
      et: 'Koristuse ajal või eraldi ajal. Hind tunni järgi.',
      en: 'During a clean or at a separate time. Priced by the hour.', ru: 'Во время уборки или отдельно. Цена за час.',
    },
    priceHint: { et: '25 €/h', en: '25 €/h', ru: '25 €/ч' },
    durationMin: 60,
  },
  {
    id: 'laundry',
    category: 'cleaning',
    name: { et: 'Pesupesemine', en: 'Laundry', ru: 'Стирка' },
    description: {
      et: 'Pesemine, kuivatamine ja voltimine. Hind tunni järgi.',
      en: 'Washing, drying and folding. Priced by the hour.', ru: 'Стирка, сушка и складывание. Цена за час.',
    },
    priceHint: { et: '25 €/h', en: '25 €/h', ru: '25 €/ч' },
    durationMin: 60,
  },
  {
    id: 'rugs',
    category: 'cleaning',
    name: { et: 'Vaibad', en: 'Rugs', ru: 'Ковры' },
    description: {
      et: 'Vaiba puhastus. Hind sõltub suurusest ja materjalist.',
      en: 'Rug cleaning. The price depends on size and material.', ru: 'Чистка ковра. Цена зависит от размера и материала.',
    },
    priceHint: { et: 'hind kokkuleppel', en: 'price on request', ru: 'цена по договорённости' },
    durationMin: 60,
  },
  {
    id: 'linens',
    category: 'cleaning',
    name: { et: 'Voodipesu vahetus', en: 'Linen change', ru: 'Смена постельного белья' },
    description: {
      et: 'Puhas voodipesu ja rätikud, kasutatud pesu masinasse.',
      en: 'Fresh bed linen and towels, used linen into the machine.', ru: 'Чистое постельное бельё и полотенца, использованное в машину.',
    },
    priceHint: { et: 'alates 20 €', en: 'from 20 €', ru: 'от 20 €' },
    durationMin: 30,
  },
  {
    id: 'appliance-care',
    category: 'cleaning',
    kind: 'visit',
    name: { et: 'Kodumasinate hooldus', en: 'Appliance care', ru: 'Уход за бытовой техникой' },
    description: {
      et: 'Pesumasina, nõudepesumasina ja pliidikubu filtrid, katlakivi ja äravoolud.',
      en: 'Washing-machine, dishwasher and hood filters, limescale and drains.', ru: 'Фильтры стиральной и посудомоечной машин и вытяжки, накипь и сливы.',
    },
    priceHint: { et: 'alates 25 €', en: 'from 25 €', ru: 'от 25 €' },
    durationMin: 45,
  },
  {
    id: 'away-care',
    category: 'cleaning',
    name: { et: 'Kodu hoidmine reisi ajal', en: 'Looking after the home while you travel', ru: 'Присмотр за домом во время поездки' },
    description: {
      et: 'Taimede kastmine, post, tuulutamine ja pilk peale.',
      en: 'Watering plants, post, airing and a look around.', ru: 'Полив растений, почта, проветривание и присмотр.',
    },
    priceHint: { et: '15 €/visiit', en: '15 €/visit', ru: '15 €/визит' },
    durationMin: 30,
  },
  {
    id: 'flowers',
    category: 'flowers',
    name: { et: 'Värsked lilled', en: 'Fresh flowers', ru: 'Свежие цветы' },
    description: {
      et: 'Kimp sinu soovi järgi. Koduhooldaja toob koristusega kaasa.',
      en: 'A bouquet to your taste. The housekeeper brings it along with the clean.', ru: 'Букет по вашему вкусу. Специалист по дому принесёт его с уборкой.',
    },
    priceHint: { et: 'alates 35 €', en: 'from 35 €', ru: 'от 35 €' },
    durationMin: 0,
  },
  // — Garantii ja maja (arendaja järelteenindus) —
  {
    id: 'warranty-claim',
    kind: 'issue', // a defect: description first, an inspection time is optional
    category: 'warranty',
    name: { et: 'Garantiiviga', en: 'Warranty claim', ru: 'Гарантийный случай' },
    description: {
      et: 'Pragu, vuuk, uks või aken, niiskus, müra. Kahtluse korral küsi ikka.',
      en: 'A crack, a joint, a door or window, damp, noise. If in doubt, ask anyway.', ru: 'Трещина, шов, дверь или окно, сырость, шум. Если сомневаетесь, всё равно спросите.',
    },
    priceHint: { et: 'Garantii korras', en: 'Under warranty', ru: 'По гарантии' },
    durationMin: 60,
  },
  {
    id: 'warranty-inspection',
    category: 'warranty',
    name: { et: 'Garantiiülevaatus', en: 'Warranty inspection', ru: 'Гарантийный осмотр' },
    description: {
      et: 'Garantiimeeskond käib kodu üle 1. ja 2. aasta lõpus.',
      en: 'The warranty team walks through the home at the end of year 1 and year 2.', ru: 'Гарантийная команда осматривает дом в конце 1-го и 2-го года.',
    },
    priceHint: { et: 'Garantii korras', en: 'Under warranty', ru: 'По гарантии' },
    durationMin: 90,
  },
  {
    id: 'systems-tuning',
    category: 'warranty',
    name: { et: 'Kütte ja ventilatsiooni seadistus', en: 'Heating and ventilation setup', ru: 'Настройка отопления и вентиляции' },
    description: {
      et: 'Ventilatsiooni režiimid ja põrandakütte ajakavad sinu elurütmi järgi.',
      en: 'Ventilation modes and floor-heating schedules set to your routine.', ru: 'Режимы вентиляции и расписание тёплого пола под ваш ритм.',
    },
    priceHint: { et: 'Garantii korras', en: 'Under warranty', ru: 'По гарантии' },
    durationMin: 60,
  },
  {
    id: 'home-manual',
    kind: 'question', // answered in writing — no visit, no time
    category: 'warranty',
    name: { et: 'Küsimus kodu kohta', en: 'A question about the home', ru: 'Вопрос о доме' },
    description: {
      et: 'Ventilatsioon, peakraan, seadmete garantii. Vastame kirjalikult.',
      en: 'Ventilation, the stopcock, appliance warranties. We reply in writing.', ru: 'Вентиляция, главный кран, гарантия на технику. Ответим письменно.',
    },
    priceHint: { et: 'Tasuta', en: 'Free', ru: 'Бесплатно' },
    durationMin: 30,
  },
  {
    id: 'building-question',
    kind: 'question', // answered in writing — no visit, no time
    category: 'building',
    name: { et: 'Küsimus maja ja ühistu kohta', en: 'A question about the building and the association', ru: 'Вопрос о доме и товариществе' },
    description: {
      et: 'Parkimine, panipaik, võtmed, kodukord, arved. Haldur vastab kirjalikult.',
      en: 'Parking, storage, keys, house rules, bills. The manager replies in writing.', ru: 'Парковка, кладовая, ключи, правила дома, счета. Управляющий ответит письменно.',
    },
    priceHint: { et: 'Tasuta', en: 'Free', ru: 'Бесплатно' },
    durationMin: 30,
  },
  {
    id: 'extra-works',
    kind: 'question', // a quote first — the builder's team replies in writing, the work is agreed from there
    pricing: 'quote', // not free: the price label shows the hint, not “Tasuta”
    category: 'warranty',
    name: { et: 'Lisatööd ehitajalt', en: 'Extra works from the builder', ru: 'Дополнительные работы от застройщика' },
    description: {
      et: 'Rõdu klaasimine, jahutus, lisapistikud. Ehitaja saadab enne hinnapakkumise.',
      en: 'Balcony glazing, cooling, extra sockets. The builder sends a quote first.', ru: 'Остекление балкона, охлаждение, розетки. Застройщик сначала пришлёт смету.',
    },
    priceHint: { et: 'Hinnapakkumine', en: 'Quote', ru: 'Смета' },
    durationMin: 30,
  },
  // — Remondimees —
  {
    id: 'hang-mount',
    category: 'handyman',
    name: { et: 'Piltide ja riiulite paigaldus', en: 'Hanging pictures & shelves', ru: 'Установка картин и полок' },
    description: {
      et: 'Pildid, peeglid, riiulid, kardinapuud ja teler seinale.',
      en: 'Pictures, mirrors, shelves, curtain rails and a TV on the wall.', ru: 'Картины, зеркала, полки, карнизы и телевизор на стену.',
    },
    priceHint: { et: 'alates 45 €', en: 'from 45 €', ru: 'от 45 €' },
    durationMin: 90,
  },
  {
    id: 'vent-filters',
    category: 'handyman',
    name: { et: 'Ventilatsiooni filtrid ja kütte kontroll', en: 'Ventilation filters and heating check', ru: 'Фильтры вентиляции и проверка отопления' },
    description: {
      et: 'Filtrite vahetus ja põrandakütte kontroll kevadel ja enne kütteperioodi.',
      en: 'Filter change and floor-heating check in spring and before the heating season.', ru: 'Замена фильтров и проверка тёплого пола весной и перед отопительным сезоном.',
    },
    priceHint: { et: 'alates 55 €', en: 'from 55 €', ru: 'от 55 €' },
    durationMin: 60,
  },
  {
    id: 'small-repairs',
    category: 'handyman',
    name: { et: 'Pisiremont', en: 'Small repairs', ru: 'Мелкий ремонт' },
    description: {
      et: 'Pirnid, ummistus, lahtine käepide, kriimud. Kõik, mis ei ole garantiiviga.',
      en: 'Bulbs, a blocked drain, a loose handle, scratches. Anything that is not a warranty claim.', ru: 'Лампочки, засор, ручка, царапины. Всё, что не гарантийный случай.',
    },
    priceHint: { et: 'alates 45 €/h', en: 'from 45 €/h', ru: 'от 45 €/ч' },
    durationMin: 90,
  },
  {
    id: 'assembly',
    category: 'handyman',
    name: { et: 'Mööbli kokkupanek', en: 'Furniture assembly', ru: 'Сборка мебели' },
    description: {
      et: 'Uue mööbli kokkupanek ja paigaldus, pakend viime ära.',
      en: 'New furniture assembled and placed, packaging taken away.', ru: 'Сборка и установка новой мебели, упаковку увозим.',
    },
    priceHint: { et: 'alates 45 €/h', en: 'from 45 €/h', ru: 'от 45 €/ч' },
    durationMin: 120,
  },
  {
    id: 'curtains',
    category: 'handyman',
    name: { et: 'Kardinad', en: 'Curtains', ru: 'Шторы' },
    description: {
      et: 'Kardinapuu seina ja kardinad üles. Mõõdud võtame kohapeal.',
      en: 'A curtain rail on the wall and the curtains hung. We measure on site.', ru: 'Карниз на стену и шторы на место. Размеры снимем на месте.',
    },
    priceHint: { et: 'alates 45 €', en: 'from 45 €', ru: 'от 45 €' },
    durationMin: 90,
  },
  {
    id: 'lock',
    category: 'handyman',
    name: { et: 'Lukuvahetus', en: 'Lock change', ru: 'Замена замка' },
    description: {
      et: 'Välisukse lukusüdamiku vahetus. Südamiku võid tuua ise.',
      en: 'A new cylinder in the front door. You can bring the cylinder yourself.', ru: 'Замена личинки замка входной двери. Личинку можете купить сами.',
    },
    priceHint: { et: 'alates 45 €', en: 'from 45 €', ru: 'от 45 €' },
    durationMin: 45,
  },
  {
    id: 'appliance-install',
    category: 'handyman',
    name: { et: 'Kodumasina paigaldus', en: 'Appliance installation', ru: 'Установка бытовой техники' },
    description: {
      et: 'Pesumasin, nõudepesumasin, pliit või õhupuhasti paika ja ühendatud.',
      en: 'A washing machine, dishwasher, hob or hood set in place and connected.', ru: 'Стиральная или посудомоечная машина, плита или вытяжка установлены и подключены.',
    },
    priceHint: { et: 'alates 45 €', en: 'from 45 €', ru: 'от 45 €' },
    durationMin: 90,
  },
  // — Aed & õu —
  {
    id: 'lawn',
    category: 'garden',
    name: { et: 'Muru niitmine', en: 'Lawn mowing', ru: 'Стрижка газона' },
    description: {
      et: 'Niitmine, servad ja niite äravedu. Ühe korra või kogu hooajaks.',
      en: 'Mowing, edges and clippings taken away. One-off or for the season.', ru: 'Кошение, края и вывоз травы. Разово или на весь сезон.',
    },
    priceHint: { et: 'alates 45 €', en: 'from 45 €', ru: 'от 45 €' },
    durationMin: 90,
  },
  {
    id: 'hedge',
    category: 'garden',
    name: { et: 'Heki ja põõsaste lõikus', en: 'Hedge & shrub trimming', ru: 'Стрижка живой изгороди и кустов' },
    description: {
      et: 'Hekk, põõsad ja viljapuud lõigatud, oksad viime ära.',
      en: 'Hedges, shrubs and fruit trees trimmed, branches taken away.', ru: 'Изгородь, кусты и плодовые деревья подстрижены, ветки увозим.',
    },
    priceHint: { et: 'alates 65 €', en: 'from 65 €', ru: 'от 65 €' },
    durationMin: 120,
  },
  {
    id: 'outdoor-wash',
    category: 'garden',
    name: { et: 'Terrassi ja tänavakivide pesu', en: 'Terrace & paving wash', ru: 'Мойка террасы и брусчатки' },
    description: {
      et: 'Terrassi ja tänavakivide survepesu, vihmaveerennid puhtaks.',
      en: 'Pressure wash for the terrace and paving, gutters cleared.', ru: 'Мойка террасы и брусчатки под давлением, чистка водостоков.',
    },
    priceHint: { et: 'alates 95 €', en: 'from 95 €', ru: 'от 95 €' },
    durationMin: 180,
  },
  {
    id: 'seasonal-garden',
    category: 'garden',
    name: { et: 'Kevad- ja sügiskoristus õues', en: 'Spring & autumn garden clean-up', ru: 'Весенняя и осенняя уборка двора' },
    description: {
      et: 'Lehed, peenrad, aiamööbel hooaja järgi, lumelükkamine talvel.',
      en: 'Leaves, beds, garden furniture by season, snow clearing in winter.', ru: 'Листья, грядки, садовая мебель по сезону, уборка снега зимой.',
    },
    priceHint: { et: 'hind kokkuleppel', en: 'price on request', ru: 'цена по договорённости' },
    durationMin: 180,
  },
  {
    id: 'cleaning-note',
    kind: 'question', // a written message to the housekeeper — no visit, no time; the reply comes in writing
    category: 'cleaning',
    name: { et: 'Sõnum koduhooldajale', en: 'Message to the housekeeper', ru: 'Сообщение специалисту по дому' },
    description: {
      et: 'Kirjuta, kui midagi on vaja muuta või tähele panna. Koduhooldaja vastab siin.',
      en: 'Write if something needs changing or attention. The housekeeper replies here.', ru: 'Напишите, если нужно что-то изменить или учесть. Специалист по дому ответит здесь.',
    },
    priceHint: { et: '', en: '', ru: '' },
    durationMin: 0,
  },
  {
    id: 'other',
    category: 'cleaning',
    name: { et: 'Muu soov', en: 'Something else', ru: 'Другое пожелание' },
    description: {
      et: 'Kirjelda, mida vajad. Leiame õige inimese ja vastame.',
      en: 'Describe what you need. We find the right person and reply.', ru: 'Опишите, что нужно. Найдём нужного человека и ответим.',
    },
    priceHint: { et: 'hind kokkuleppel', en: 'price on request', ru: 'цена по договорённости' },
    durationMin: 60,
  },
];

const SERVICE_BY_ID = Object.fromEntries(SERVICE_CATALOGUE.map((s) => [s.id, s]));

function getService(serviceId) {
  return SERVICE_BY_ID[serviceId] || null;
}

/** 'visit' (needs a time) · 'issue' (defect, time optional) · 'question' (answered in writing) */
function serviceKind(serviceId) {
  const s = getService(serviceId);
  return (s && s.kind) || 'visit';
}

function serviceName(serviceId, lang) {
  const s = getService(serviceId);
  if (!s) return serviceId || '';
  return pick(s.name, lang);
}

// Preferred time windows a customer can pick when requesting a service
const TIME_WINDOWS = {
  morning: { et: 'Hommik (9–12)', en: 'Morning (9–12)', ru: 'Утро (9–12)', from: '09:00', to: '12:00' },
  afternoon: { et: 'Pärastlõuna (12–17)', en: 'Afternoon (12–17)', ru: 'День (12–17)', from: '12:00', to: '17:00' },
  any: { et: 'Sobib iga aeg', en: 'Any time', ru: 'Любое время', from: '09:00', to: '17:00' },
  'with-visit': { et: 'Koos järgmise koristusega', en: 'With the next cleaning visit', ru: 'Вместе со следующей уборкой', from: null, to: null },
};

function timeWindowLabel(key, lang) {
  const w = TIME_WINDOWS[key];
  if (!w) return '';
  return pick(w, lang);
}

/** Clock we place on the calendar when the resident picks a window. Empty when the window has no hour. */
function windowStartTime(key) {
  const w = TIME_WINDOWS[key];
  return (w && w.from) || '';
}

/**
 * The resident sees the person who brought them. A developer or SUKODA home
 * stays one service; we do not replace the provider the household already has.
 */
function providerBroughtHome(order) {
  if (!order || typeof order !== 'object') return false;
  const kind = order.ownerKind;
  if (kind === 'provider-invited') return true;
  if (kind === 'sukoda' || kind === 'developer') return false;
  const by = String(order.createdBy || '');
  if (by.startsWith('provider:') || by.startsWith('invite:') || order.inviteCardId) return true;
  if ((order.brand && order.brand.name) || order.source === 'welcome' || by.startsWith('welcome:')) return false;
  return order.billing === 'provider' && (order.source === 'manual' || order.source === 'provider');
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
  if (!Array.isArray(input)) return { error: 'Kontaktide nimekiri ei ole õiges kujus' };
  if (input.length > MAX_CONTACTS) return { error: `Kuni ${MAX_CONTACTS} kontakti` };

  const contacts = [];
  const seenEmails = new Set();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const name = String(raw.name || '').trim().slice(0, 120);
    const email = normalizeEmail(raw.email).slice(0, 320);
    const phone = String(raw.phone || '').trim().slice(0, 40);
    if (!name && !email) continue;
    if (email && !isValidEmail(email)) return { error: `E-posti aadress ei ole õige: ${email}` };
    if (email && seenEmails.has(email)) continue;
    if (email) seenEmails.add(email);
    contacts.push({
      id: String(raw.id || '').slice(0, 40) || randomId(),
      name: name || email,
      email,
      phone,
      notify: raw.notify !== false,
      role: raw.role === 'tenant' ? 'tenant' : 'household',
    });
  }
  return { contacts };
}

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Owner of the home, a tenant on it, or another household contact. */
function viewerRole(order, email) {
  const e = normalizeEmail(email);
  if (!e) return 'owner';
  if (normalizeEmail(order?.customer?.email) === e) return 'owner';
  const hit = (order?.contacts || []).find((c) => normalizeEmail(c?.email) === e);
  return hit?.role === 'tenant' ? 'tenant' : 'member';
}

/** A tenant sees the rhythm and the folder, not ownership papers. */
function withoutOwnership(order) {
  const drop = (list) => (Array.isArray(list) ? list.filter((d) => d && d.category !== 'ownership') : []);
  return { ...(order || {}), documents: drop(order?.documents), buildingDocuments: drop(order?.buildingDocuments) };
}

/**
 * Paid homes this e-mail can open. Same address book, one row per home.
 * rows: [{ id, status, type, customer, contacts, contactEmails }]
 */
function homesForEmail(rows, email) {
  const e = normalizeEmail(email);
  if (!e) return [];
  const out = [];
  const seen = new Set();
  for (const row of rows || []) {
    if (!row || seen.has(row.id)) continue;
    if (!['paid', 'cancelling'].includes(row.status)) continue;
    if ((row.type || 'subscription') === 'gift') continue;
    const owner = normalizeEmail(row.customer?.email) === e;
    const contact = (row.contacts || []).find((c) => normalizeEmail(c?.email) === e);
    const listed = owner || contact || (row.contactEmails || []).includes(e);
    if (!listed) continue;
    seen.add(row.id);
    const role = owner ? 'owner' : (contact?.role === 'tenant' ? 'tenant' : 'member');
    out.push({
      id: row.id,
      address: String(row.customer?.address || row.address || '').trim(),
      role,
    });
  }
  return out;
}

/**
 * Hand the same home to a new owner. Documents, rhythm and visit history stay.
 * Contacts and the door note go. Payment ids stay on the order; this does not call Stripe.
 */
function saleCustomer(order, input) {
  const name = String(input?.name || '').trim().slice(0, 120);
  const email = normalizeEmail(input?.email);
  if (name.length < 2) return { error: 'name' };
  if (!isValidEmail(email)) return { error: 'email' };
  const prev = order?.customer && typeof order.customer === 'object' ? order.customer : {};
  const homeProfile = { ...(order?.homeProfile || {}) };
  if (Object.prototype.hasOwnProperty.call(homeProfile, 'access')) homeProfile.access = '';
  return {
    customer: { ...prev, name, email, phone: '' },
    contacts: [],
    contactEmails: [],
    homeProfile,
  };
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
  if (!input || typeof input !== 'object') return { error: 'Graafik on täitmata' };
  if (input.active === false) return { schedule: { active: false } };

  const frequency = String(input.frequency || '');
  if (!FREQUENCIES.includes(frequency)) return { error: 'Vali koristuse sagedus' };

  const anchor = parseDateStr(input.anchorDate);
  if (!anchor) return { error: 'Vali esimese koristuse kuupäev' };

  const time = String(input.time || '');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { error: 'Vali kellaaeg' };

  const durationMin = Number(input.durationMin);
  if (!Number.isInteger(durationMin) || durationMin < 30 || durationMin > 600) {
    return { error: 'Kestus peab olema 30 kuni 600 minutit' };
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

const LIVE_VISIT = new Set(['scheduled', 'confirmed']);

/**
 * One morning push per provider who has a live visit on `today` (YYYY-MM-DD).
 * `count` is distinct homes. A visit without an order still counts as its own
 * home. The result is only provider id and count — no access note, no address.
 */
function morningRecipients(visits, today) {
  const day = String(today || '');
  const homes = new Map();
  let loose = 0;
  for (const v of Array.isArray(visits) ? visits : []) {
    if (!v || !LIVE_VISIT.has(v.status)) continue;
    const providerId = String(v.providerId || '').trim();
    if (!providerId || v.date !== day) continue;
    const orderId = String(v.orderId || '').trim();
    const id = String(v.id || '').trim();
    let home = orderId;
    if (!home && id) home = `visit:${id}`;
    if (!home) {
      loose += 1;
      home = `visit:#${loose}`;
    }
    if (!homes.has(providerId)) homes.set(providerId, new Set());
    homes.get(providerId).add(home);
  }
  return [...homes.entries()]
    .map(([providerId, set]) => ({ providerId, count: set.size }))
    .sort((a, b) => (a.providerId < b.providerId ? -1 : a.providerId > b.providerId ? 1 : 0));
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
  if (!input || typeof input !== 'object') return { error: 'Vali algus- ja lõppkuupäev' };
  const from = String(input.from || '');
  const to = String(input.to || from);
  const f = parseDateStr(from);
  const tt = parseDateStr(to);
  if (!f || !tt) return { error: 'Vali algus- ja lõppkuupäev' };
  if (to < from) return { error: 'Lõppkuupäev ei saa olla enne algust' };
  if (to < todayStr) return { error: 'See aeg on juba möödas' };
  if ((tt - f) / 86400000 > MAX_AWAY_DAYS) return { error: `Eemalolek võib kesta kuni ${MAX_AWAY_DAYS} päeva` };
  const live = (existing || []).filter((p) => p.to >= todayStr);
  if (live.length >= MAX_AWAY_PERIODS) return { error: `Korraga võib kirjas olla kuni ${MAX_AWAY_PERIODS} eemalolekut` };
  if (live.some((p) => p.from <= to && from <= p.to)) return { error: 'See aeg kattub teise eemalolekuga' };
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

/**
 * Move live visits that fall inside an away window to the first day after it.
 * Same clock time. Two homes at the same time land on different days.
 * visits: [{ id, orderId, date, time, status }]
 */
function postponeVisits(visits, from, to) {
  const end = parseDateStr(to);
  const start = parseDateStr(from);
  if (!start || !end || to < from) return [];
  const firstBack = toDateStr(addDays(end, 1));
  const taken = new Set();
  const inside = (visits || [])
    .filter((v) => v && v.date >= from && v.date <= to && ['scheduled', 'confirmed'].includes(v.status || 'scheduled'))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.time || '').localeCompare(String(b.time || ''))));
  const moves = [];
  for (const v of inside) {
    const time = String(v.time || '');
    let date = firstBack;
    let guard = 0;
    while (taken.has(`${date}|${time}`) && guard < 30) {
      date = toDateStr(addDays(parseDateStr(date), 1));
      guard += 1;
    }
    taken.add(`${date}|${time}`);
    moves.push({
      id: String(v.id || ''),
      orderId: String(v.orderId || ''),
      from: v.date,
      to: date,
      time,
    });
  }
  return moves;
}

// ============================================================
// Kodu hooldusrütm — recurring upkeep the household should not have to remember
// ============================================================

/**
 * Suggested upkeep items. `serviceId` links to the catalogue entry that gets it done when the
 * household would rather order than DIY; `homeTypes` narrows suggestions (house-only items).
 */
const MAINTENANCE_CATALOGUE = [
  { id: 'vent-filters', name: { et: 'Ventilatsiooni filtrid', en: 'Ventilation filters', ru: 'Фильтры вентиляции' }, hint: { et: 'Vaheta või pese filtrid. Must filter annab kehva õhu ja suurema elektriarve.', en: 'Replace or wash the filters. A dirty filter means poor air and a higher electricity bill.', ru: 'Замените или промойте фильтры. Грязный фильтр даёт плохой воздух и больший счёт за электричество.' }, intervalMonths: 6, serviceId: 'vent-filters', homeTypes: ['apartment', 'house'], byProvider: false },
  // New-build home: what the developer's after-sales team wants the owner to keep an eye on
  { id: 'warranty-inspection', name: { et: 'Garantiiülevaatus', en: 'Warranty inspection', ru: 'Гарантийный осмотр' }, hint: { et: 'Enne 1. ja 2. aasta lõppu. Kõik puudused lähevad ühte akti.', en: 'Before the end of year 1 and year 2. All defects go into one report.', ru: 'До конца 1-го и 2-го года. Все недостатки попадают в один акт.' }, intervalMonths: 12, serviceId: 'warranty-inspection', homeTypes: ['apartment', 'house'] },
  { id: 'floor-heating', name: { et: 'Põrandakütte termostaadid', en: 'Floor-heating thermostats', ru: 'Термостаты тёплого пола' }, hint: { et: 'Vaata enne kütteperioodi režiimid ja ajakavad üle. Tehnik teeb koos filtritega.', en: 'Check the modes and schedules before the heating season. The technician does it together with the filters.', ru: 'Проверьте режимы и расписание перед отопительным сезоном. Техник делает это вместе с фильтрами.' }, intervalMonths: 12, serviceId: 'vent-filters', homeTypes: ['apartment', 'house'] },
  { id: 'sealant-check', name: { et: 'Silikoonvuukide kontroll', en: 'Silicone seal check', ru: 'Проверка силиконовых швов' }, hint: { et: 'Vannituba ja köök: pragunenud vuuk laseb vett läbi. Garantiiajal parandab ehitaja, hiljem tehnik.', en: 'Bathroom and kitchen: a cracked seal lets water through. The builder fixes it under warranty, the technician after that.', ru: 'Ванная и кухня: треснувший шов пропускает воду. По гарантии чинит застройщик, после гарантии техник.' }, intervalMonths: 12, serviceId: 'warranty-claim', homeTypes: ['apartment', 'house', 'summer'] },
  { id: 'washer-service', name: { et: 'Pesumasina hooldus', en: 'Washing machine service', ru: 'Обслуживание стиральной машины' }, hint: { et: 'Puhasta filter ja tihend, käivita tühi 90° programm.', en: 'Clean the filter and seal, run an empty 90° cycle.', ru: 'Очистите фильтр и уплотнитель, запустите пустую программу 90°.' }, intervalMonths: 3, serviceId: 'appliance-care', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'dishwasher-filter', name: { et: 'Nõudepesumasina filter', en: 'Dishwasher filter', ru: 'Фильтр посудомоечной машины' }, hint: { et: 'Loputa filter ja pihustid, kontrolli soola ja loputusvahendit.', en: 'Rinse the filter and spray arms, check the salt and rinse aid.', ru: 'Промойте фильтр и разбрызгиватели, проверьте соль и ополаскиватель.' }, intervalMonths: 1, serviceId: 'appliance-care', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'hood-filter', name: { et: 'Pliidikubu filter', en: 'Range hood filter', ru: 'Фильтр вытяжки' }, hint: { et: 'Pese metallfilter nõudepesumasinas, vaheta süsinikfilter.', en: 'Wash the metal filter in the dishwasher, replace the carbon filter.', ru: 'Промойте металлический фильтр в посудомоечной машине, замените угольный фильтр.' }, intervalMonths: 3, serviceId: 'appliance-care', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'mattress', name: { et: 'Madratsi pööramine', en: 'Mattress turning', ru: 'Переворот матраса' }, hint: { et: 'Pööra madrats koos voodipesu vahetusega.', en: 'Turn the mattress when you change the linen.', ru: 'Переверните матрас при смене белья.' }, intervalMonths: 6, serviceId: 'linens', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'smoke-detector', name: { et: 'Suitsuanduri kontroll', en: 'Smoke detector check', ru: 'Проверка дымового датчика' }, hint: { et: 'Vajuta testnuppu ja vaheta patarei. Anduri enda vaheta iga 10 aasta järel.', en: 'Press the test button and replace the battery. Replace the detector itself every 10 years.', ru: 'Нажмите кнопку теста и замените батарейку. Сам датчик меняйте каждые 10 лет.' }, intervalMonths: 12, serviceId: 'small-repairs', homeTypes: ['apartment', 'house', 'summer'] },
  { id: 'heat-pump', name: { et: 'Soojuspumba filtrid', en: 'Heat pump filters', ru: 'Фильтры теплового насоса' }, hint: { et: 'Pese siseosa filtrid, puhasta välisosa lehtedest.', en: 'Wash the indoor unit filters, clear the outdoor unit of leaves.', ru: 'Промойте фильтры внутреннего блока, очистите наружный блок от листьев.' }, intervalMonths: 3, serviceId: 'small-repairs', homeTypes: ['house', 'summer'] },
  { id: 'boiler', name: { et: 'Boileri ja veesüsteemi kontroll', en: 'Water heater and plumbing check', ru: 'Проверка бойлера и водопровода' }, hint: { et: 'Kontrolli kaitseklappi, anoodi, lekkeid ja segisteid.', en: 'Check the safety valve, anode, leaks and taps.', ru: 'Проверьте предохранительный клапан, анод, протечки и смесители.' }, intervalMonths: 24, serviceId: 'small-repairs', homeTypes: ['house', 'summer'] },
  { id: 'deep-clean', name: { et: 'Süvapuhastus', en: 'Deep clean', ru: 'Генеральная уборка' }, hint: { et: 'Mööbli alt, vaibad, radiaatorid, lambid. Kõik, mida tavakoristus ei kata.', en: 'Under furniture, rugs, radiators, lamps. Everything a regular clean does not cover.', ru: 'Под мебелью, ковры, радиаторы, лампы. Всё, что не входит в обычную уборку.' }, intervalMonths: 6, serviceId: 'deep-clean', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'windows', name: { et: 'Aknad ja rõdu', en: 'Windows and balcony', ru: 'Окна и балкон' }, hint: { et: 'Kevadel ja sügisel: aknad seest, rõdu põrand ja klaasid, rõdu äravool puhtaks.', en: 'In spring and autumn: windows from inside, balcony floor and glass, balcony drain cleared.', ru: 'Весной и осенью: окна изнутри, пол и стёкла балкона, чистый слив балкона.' }, intervalMonths: 6, serviceId: 'windows', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'gutters', name: { et: 'Vihmaveerennid', en: 'Gutters', ru: 'Водостоки' }, hint: { et: 'Võta lehed välja enne külmi ja kontrolli äravoolu.', en: 'Take the leaves out before the frost and check the downpipes.', ru: 'Уберите листья до морозов и проверьте водосточные трубы.' }, intervalMonths: 12, serviceId: 'seasonal-garden', homeTypes: ['house', 'summer'] },
  { id: 'chimney', name: { et: 'Korstnapühkija', en: 'Chimney sweep', ru: 'Трубочист' }, hint: { et: 'Kord aastas, kui on ahi, kamin või katel.', en: 'Once a year if you have a stove, fireplace or boiler.', ru: 'Раз в год, если есть печь, камин или котёл.' }, intervalMonths: 12, serviceId: 'other', homeTypes: ['house', 'summer'] },
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
 * `startsAt` (YYYY-MM-DD, today or later) sets the first due date when nothing has been done yet —
 * used when a housekeeper adds a service at the moment she brings a home on, so it does not land as overdue.
 * Returns { item } or { error }.
 */
function sanitizeMaintenanceItem(input, todayStr) {
  if (!input || typeof input !== 'object') return { error: 'Kirjuta töö nimi' };
  const cat = input.catalogId ? MAINTENANCE_BY_ID[String(input.catalogId)] : null;
  if (input.catalogId && !cat) return { error: 'Sellist tööd ei ole nimekirjas' };
  const name = String(input.name || '').trim().slice(0, 80);
  if (!cat && name.length < 2) return { error: 'Kirjuta töö nimi' };
  const intervalMonths = Number(input.intervalMonths || cat?.intervalMonths || 6);
  if (!MAINTENANCE_INTERVALS.includes(intervalMonths)) return { error: 'Vali, kui tihti töö tuleb teha' };
  let lastDoneAt = null;
  if (input.lastDoneAt) {
    const d = parseDateStr(input.lastDoneAt);
    if (!d) return { error: 'Kuupäev ei ole õige' };
    if (input.lastDoneAt > todayStr) return { error: 'Kuupäev ei saa olla tulevikus' };
    lastDoneAt = input.lastDoneAt;
  }
  let nextDueAt = todayStr;
  if (lastDoneAt) {
    nextDueAt = toDateStr(addMonths(parseDateStr(lastDoneAt), intervalMonths));
  } else if (input.startsAt) {
    const start = parseDateStr(input.startsAt);
    if (!start) return { error: 'Kuupäev ei ole õige' };
    if (input.startsAt < todayStr) return { error: 'Alguskuupäev ei saa olla minevikus' };
    nextDueAt = input.startsAt;
  }
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
  return cat ? pick(cat.name, lang) : (item.name || '');
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
  handover: { et: 'Üleandmine ja garantii', en: 'Handover and warranty', ru: 'Передача и гарантия' },
  ownership: { et: 'Omand ja lepingud', en: 'Ownership and contracts', ru: 'Собственность и договоры' },
  appliances: { et: 'Seadmed, juhendid, garantiid', en: 'Appliances, manuals, warranties', ru: 'Техника, инструкции, гарантии' },
  building: { et: 'Maja ja ühistu', en: 'Building and association', ru: 'Дом и товарищество' },
  insurance: { et: 'Kindlustus', en: 'Insurance', ru: 'Страхование' },
  works: { et: 'Tehtud tööd', en: 'Work done', ru: 'Выполненные работы' },
  other: { et: 'Muu', en: 'Other', ru: 'Прочее' },
};
const MAX_DOCUMENTS = 40;

function sanitizeDocument(input) {
  if (!input || typeof input !== 'object') return { error: 'Kirjuta dokumendi pealkiri' };
  const title = String(input.title || '').trim().slice(0, 120);
  if (title.length < 2) return { error: 'Kirjuta dokumendi pealkiri' };
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
  free: { id: 'free', name: 'Tasuta', price: 0, homes: 3, lookupKey: null, blurb: { et: 'Kuni 3 kodu. Kõik võimalused, ajapiiranguta.', en: 'Up to 3 homes. Every feature, no time limit.', ru: 'До 3 домов. Все возможности, без ограничения по времени.' } },
  pro: { id: 'pro', name: 'Standard', price: 19, homes: 20, lookupKey: 'sukoda_provider_pro_monthly', blurb: { et: 'Kuni 20 kodu. Lõpeta igal ajal.', en: 'Up to 20 homes. Cancel any time.', ru: 'До 20 домов. Отмена в любое время.' } },
  studio: { id: 'studio', name: 'Stuudio', price: 39, homes: null, lookupKey: 'sukoda_provider_studio_monthly', blurb: { et: 'Piiramatult kodusid. Lõpeta igal ajal.', en: 'Unlimited homes. Cancel any time.', ru: 'Без ограничения числа домов. Отмена в любое время.' } },
  // Contracted partners (a developer's after-sales team, a building manager): set up by SUKODA, no cap, no card, no self-serve billing
  enterprise: { id: 'enterprise', name: 'Partner', price: 0, homes: null, lookupKey: null, blurb: { et: 'Kokkuleppel SUKODA-ga. Piiramatult kodusid.', en: 'By agreement with SUKODA. Unlimited homes.', ru: 'По договорённости с SUKODA. Без ограничения числа домов.' } },
};
const PLAN_ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

/** Plans a provider can pick on the desk (enterprise is assigned by the operator) */
const SELF_SERVE_PLANS = ['free', 'pro', 'studio'];

/** The plan that counts right now: a paid plan only while Stripe says the subscription is alive */
function effectivePlan(provider) {
  if (provider?.plan === 'enterprise' || provider?.createdBy === 'admin') return 'enterprise';
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

/** In-app sign-in: a 6-digit code lives 10 minutes; the session lives 90 days and is refreshed on use. */
const SESSION_DAYS = 90;
const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
const LOGIN_CODE_MAX_ATTEMPTS = 5;

function generateLoginCode(randomInt) {
  const n = Number(randomInt);
  if (!Number.isInteger(n) || n < 0 || n > 999999) return null;
  return String(n).padStart(6, '0');
}

function hashLoginCode(email, code) {
  const crypto = require('crypto');
  const key = `${normalizeEmail(email)}\n${String(code ?? '').trim()}`;
  return crypto.createHash('sha256').update(key).digest('hex');
}

function loginCodeExpiresAt(now, ttlMs = LOGIN_CODE_TTL_MS) {
  return new Date(new Date(now).getTime() + ttlMs);
}

function sessionExpiresAt(now, days = SESSION_DAYS) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Check a stored code. `record.expiresAt` is a Date or ISO string.
 * Never returns the code. Reasons: missing, expired, locked, mismatch.
 */
function checkLoginCode({ email, code, record, now }) {
  if (!record || typeof record.codeHash !== 'string' || !record.codeHash) return { ok: false, reason: 'missing' };
  const exp = record.expiresAt instanceof Date ? record.expiresAt : new Date(record.expiresAt);
  if (!Number.isFinite(exp.getTime()) || exp.getTime() <= new Date(now).getTime()) return { ok: false, reason: 'expired' };
  const attempts = Number(record.attempts) || 0;
  if (attempts >= LOGIN_CODE_MAX_ATTEMPTS) return { ok: false, reason: 'locked' };
  const codeStr = String(code ?? '').trim();
  if (!/^\d{6}$/.test(codeStr)) return { ok: false, reason: 'mismatch' };
  if (hashLoginCode(email, codeStr) !== record.codeHash) return { ok: false, reason: 'mismatch' };
  return { ok: true };
}

const COMMISSION_RATE = 0.3;
const STRIPE_PERCENT = 0.015;
const STRIPE_FIXED_CENTS = 25;

function ownerKindOf(order) {
  const kind = order?.ownerKind;
  if (kind === 'provider-invited' || kind === 'sukoda' || kind === 'developer') return kind;
  if (order?.source === 'provider' || order?.source === 'invite') return 'provider-invited';
  if (order?.brand?.name || order?.source === 'developer') return 'developer';
  return 'sukoda';
}

function sponsorRemainingCents(sponsor, todayStr) {
  if (!sponsor || typeof sponsor !== 'object') return 0;
  if (sponsor.validUntil && todayStr && String(sponsor.validUntil) < String(todayStr)) return 0;
  const budget = Math.max(0, Math.round(Number(sponsor.budgetCents) || 0));
  const used = Math.max(0, Math.round(Number(sponsor.usedCents) || 0));
  return Math.max(0, budget - used);
}

/**
 * Preview a visit split. Never charges. Stripe's fee comes out of SUKODA's 30% on sent work.
 * A provider's own client pays no commission; if they pay in the app, the card fee comes off the price.
 */
function splitVisitPayment({ priceCents, sponsorCentsAvailable = 0, ownerKind, payInApp = true }) {
  const price = Math.max(0, Math.min(200000, Math.round(Number(priceCents) || 0)));
  const pool = Math.max(0, Math.round(Number(sponsorCentsAvailable) || 0));
  const sponsorCents = Math.min(price, pool);
  const residentCents = price - sponsorCents;
  const invited = ownerKind === 'provider-invited';
  let feeCents = 0;
  let stripeCents = 0;
  if (payInApp && residentCents > 0) {
    stripeCents = Math.round(residentCents * STRIPE_PERCENT) + STRIPE_FIXED_CENTS;
  }
  if (invited) {
    if (stripeCents > price) stripeCents = price;
    return {
      priceCents: price, sponsorCents, residentCents, feeCents: 0, stripeCents,
      providerCents: price - stripeCents, cardRequired: residentCents > 0, charged: false,
    };
  }
  feeCents = Math.round(price * COMMISSION_RATE);
  if (stripeCents > feeCents) stripeCents = feeCents;
  return {
    priceCents: price, sponsorCents, residentCents, feeCents, stripeCents,
    providerCents: price - feeCents, cardRequired: residentCents > 0, charged: false,
  };
}

function earnedCents(rows) {
  return (rows || []).reduce((sum, row) => sum + Math.max(0, Math.round(Number(row?.providerCents) || 0)), 0);
}

const RESIDENT_RHYTHMS = new Set(['once', 'weekly', 'biweekly', 'monthly']);

/** A standing clean the resident asked for. Anything else is not a rhythm. */
function residentRhythm(value) {
  return RESIDENT_RHYTHMS.has(value) ? value : null;
}

function earliestBookableDate(todayStr, leadDays) {
  const n = Number(leadDays);
  const days = Number.isInteger(n) && n >= 0 && n <= 60 ? n : 14;
  const today = parseDateStr(todayStr);
  if (!today) return null;
  return toDateStr(addDays(today, days));
}

/** ISO weekday 1–7 for a YYYY-MM-DD string, or 0 if the date is not valid. */
function weekdayOfDateStr(dateStr) {
  const d = parseDateStr(dateStr);
  if (!d) return 0;
  const js = d.getUTCDay();
  return js === 0 ? 7 : js;
}

/**
 * Whether finishRequest may place a visit on preferredDate without the
 * cleaner confirming. Same rules as a manual confirm: working day, hours,
 * notice, not away, not a public holiday.
 */
function canAutoPlaceVisit({ preferredDate, timeWindow, todayStr, availability, awayPeriods }) {
  if (!preferredDate || !windowStartTime(timeWindow)) return false;
  const avail = sanitizeAvailability(availability || {});
  const weekday = weekdayOfDateStr(preferredDate);
  if (!weekday || !avail.days.includes(weekday)) return false;
  if (isDateAway(awayPeriods, preferredDate)) return false;
  if (holidayName(preferredDate)) return false;
  const earliest = earliestBookableDate(todayStr, avail.leadDays);
  if (earliest && preferredDate < earliest) return false;
  const start = windowStartTime(timeWindow);
  if (start < avail.hours.start || start >= avail.hours.end) return false;
  return true;
}

function sanitizeAvailability(input) {
  const rawDays = Array.isArray(input?.days) ? input.days : [1, 2, 3, 4, 5];
  const days = [...new Set(rawDays.map((d) => Number(d)).filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b);
  const lead = Number(input?.leadDays);
  const max = Number(input?.maxPerDay);
  const start = /^\d{2}:\d{2}$/.test(String(input?.hours?.start || '')) ? String(input.hours.start) : '08:00';
  const end = /^\d{2}:\d{2}$/.test(String(input?.hours?.end || '')) ? String(input.hours.end) : '17:00';
  const districts = (Array.isArray(input?.districts) ? input.districts : [])
    .map((s) => String(s || '').trim()).filter(Boolean).slice(0, 12);
  return {
    days: days.length ? days : [1, 2, 3, 4, 5],
    hours: { start, end },
    leadDays: Number.isInteger(lead) ? Math.min(60, Math.max(0, lead)) : 14,
    maxPerDay: Number.isInteger(max) ? Math.min(12, Math.max(1, max)) : 4,
    districts,
    priceNote: String(input?.priceNote || '').trim().slice(0, 240),
  };
}

function visitWindowOpen(scheduledAt, endTime, now, windowMs = 2 * 60 * 60 * 1000) {
  const start = new Date(scheduledAt).getTime();
  const end = new Date(endTime || scheduledAt).getTime();
  if (!Number.isFinite(start)) return false;
  const t = new Date(now).getTime();
  if (!Number.isFinite(t)) return false;
  const close = Number.isFinite(end) ? Math.max(end, start) : start;
  return t >= start - windowMs && t <= close + windowMs;
}

function warrantyUntilDate(handoverAt, months = 24) {
  const start = parseDateStr(handoverAt);
  if (!start) return null;
  const n = Number(months);
  const span = Number.isInteger(n) && n > 0 && n <= 60 ? n : 24;
  return toDateStr(addMonths(start, span));
}

const HANDYMAN_GIFT_IDS = ['small-repairs', 'hang-mount', 'assembly', 'curtains', 'appliance-install'];

/** The spoken gift is one clean and one handyman visit. A later wish of the same kind is not covered. */
function giftSpent(serviceId, usedIds) {
  const used = new Set(Array.isArray(usedIds) ? usedIds.map(String) : []);
  const id = String(serviceId || '');
  if (id === 'extra-clean' || id === 'regular') return used.has('extra-clean') || used.has('regular');
  if (HANDYMAN_GIFT_IDS.includes(id)) return HANDYMAN_GIFT_IDS.some((key) => used.has(key));
  return false;
}

/** A priced visit is written, and the cleaner is told, only after the card charge has succeeded. */
function chargeBeforeDispatch({ ownClient, kind, unpriced, cardRequired, residentCents }) {
  if (ownClient) return false;
  if (kind !== 'visit') return false;
  if (unpriced) return false;
  return cardRequired === true && Math.round(Number(residentCents) || 0) >= 50;
}

/** Money is in hand: Stripe says paid, in euros, for the full amount. A hold or a later capture does not count. */
function homePaymentReady(session, payment) {
  if (!session || session.payment_status !== 'paid') return false;
  if (String(session.currency || '').toLowerCase() !== 'eur') return false;
  const due = Math.round(Number(payment?.residentCents) || 0);
  const paid = Math.round(Number(session.amount_total));
  return due >= 50 && Number.isFinite(paid) && paid >= due;
}

/** "alates 89 €" → 8900. A sentence without a number, or "kokkuleppel", has no guide price. */
function guidePriceCents(hint) {
  const text = String(hint || '');
  if (/kokkuleppel|on request|договор/i.test(text)) return null;
  const m = text.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 2000) return null;
  return Math.round(n * 100);
}

const HANDOVER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Eight characters a printed card can carry. `bytes` must be at least 8 random bytes. */
function handoverCode(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 8) return null;
  let out = '';
  for (let i = 0; i < 8; i++) out += HANDOVER_ALPHABET[bytes[i] % HANDOVER_ALPHABET.length];
  return out;
}

function routeChoice(value) {
  return value === 'hausing' || value === 'email' || value === 'desk' ? value : 'desk';
}

/** A building the developer keeps: name, where warranty goes, documents the homes inherit. No secrets. */
function sanitizeBuilding(input) {
  const name = String(input?.name || '').trim().slice(0, 80);
  if (!name) return { error: 'name' };
  const documents = (Array.isArray(input?.documents) ? input.documents : []).slice(0, 40).map((d, i) => {
    const title = String(d?.title || '').trim().slice(0, 120);
    if (!title) return null;
    const category = DOCUMENT_CATEGORIES[d?.category] ? d.category : 'other';
    const url = /^https:\/\//.test(String(d?.url || '')) ? String(d.url).slice(0, 500) : '';
    const page = Number(d?.page);
    return {
      id: String(d?.id || `b${i + 1}`).replace(/[^\w-]/g, '').slice(0, 40) || `b${i + 1}`,
      title,
      category,
      url,
      page: Number.isInteger(page) && page > 0 && page < 1000 ? page : null,
      source: 'building',
    };
  }).filter(Boolean);
  const budget = Math.max(0, Math.min(20000000, Math.round(Number(input?.sponsor?.budgetCents) || 0)));
  const until = parseDateStr(input?.sponsor?.validUntil);
  return {
    building: {
      name,
      routes: {
        warranty: routeChoice(input?.routes?.warranty),
        building: routeChoice(input?.routes?.building),
      },
      documents,
      sponsor: budget ? { budgetCents: budget, usedCents: 0, validUntil: until ? toDateStr(until) : null } : null,
    },
  };
}

function sanitizeHandover(input) {
  const apartment = String(input?.apartment || '').trim().slice(0, 40);
  const buyerName = String(input?.buyerName || '').trim().slice(0, 120);
  const buyerEmail = normalizeEmail(input?.buyerEmail);
  const keysAt = parseDateStr(input?.keysAt);
  if (!apartment || !buyerName || !isValidEmail(buyerEmail) || !keysAt) return { error: 'fields' };
  return { handover: { apartment, buyerName, buyerEmail, keysAt: toDateStr(keysAt) } };
}

/** Extras on the resident order card. Unknown ids are dropped. */
const TELLI_ADDONS = ['flowers', 'linens', 'windows', 'appliance-care'];

function telliAddons(ids) {
  const out = [];
  const seen = new Set();
  for (const id of Array.isArray(ids) ? ids : []) {
    const key = String(id || '');
    if (!TELLI_ADDONS.includes(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * Price a cleaning wish before anyone confirms it. Never charges.
 * A line without a number (price on request) marks the quote unpriced.
 */
function orderQuote({ serviceId, addonIds, sponsorCentsAvailable, ownerKind, today, leadDays, lang, coveredIds }) {
  const extras = telliAddons(addonIds);
  const main = getService(serviceId) ? String(serviceId) : 'extra-clean';
  const ids = [main].concat(extras.filter((id) => id !== main));
  const covered = new Set(Array.isArray(coveredIds) ? coveredIds.map(String) : []);
  const lines = [];
  let total = 0;
  let unpriced = false;
  for (const id of ids) {
    const svc = getService(id);
    if (!svc) continue;
    const hint = pick(svc.priceHint, lang || 'et');
    if (covered.has(id)) {
      lines.push({ id, cents: 0, hint: '', covered: true });
      continue;
    }
    const cents = guidePriceCents(hint);
    if (cents == null) unpriced = true;
    else total += cents;
    lines.push({ id, cents, hint, covered: false });
  }
  const split = splitVisitPayment({
    priceCents: total,
    sponsorCentsAvailable,
    ownerKind,
    payInApp: true,
  });
  const payLater = unpriced || split.cardRequired;
  return {
    ...split,
    lines,
    unpriced,
    priced: lines.length > 0 && !unpriced && total > 0,
    payLater,
    earliest: earliestBookableDate(today, leadDays),
    charged: false,
  };
}

module.exports = {
  LANGS,
  langOf,
  pick,
  ruPlural,
  PROVIDER_PLANS,
  PLAN_ACTIVE_STATUSES,
  SELF_SERVE_PLANS,
  effectivePlan,
  planLimit,
  planByLookupKey,
  SESSION_DAYS,
  LOGIN_CODE_TTL_MS,
  LOGIN_CODE_MAX_ATTEMPTS,
  generateLoginCode,
  hashLoginCode,
  loginCodeExpiresAt,
  sessionExpiresAt,
  checkLoginCode,
  ownerKindOf,
  sponsorRemainingCents,
  splitVisitPayment,
  earnedCents,
  RESIDENT_RHYTHMS,
  residentRhythm,
  earliestBookableDate,
  weekdayOfDateStr,
  canAutoPlaceVisit,
  sanitizeAvailability,
  visitWindowOpen,
  warrantyUntilDate,
  giftSpent,
  chargeBeforeDispatch,
  homePaymentReady,
  guidePriceCents,
  TELLI_ADDONS,
  telliAddons,
  orderQuote,
  handoverCode,
  sanitizeBuilding,
  sanitizeHandover,
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
  postponeVisits,
  SERVICE_CATALOGUE,
  SERVICE_CATEGORIES,
  categoryLabel,
  getService,
  serviceKind,
  serviceName,
  TIME_WINDOWS,
  timeWindowLabel,
  windowStartTime,
  providerBroughtHome,
  MAX_CONTACTS,
  normalizeEmail,
  isValidEmail,
  sanitizeContacts,
  resolveRecipients,
  viewerRole,
  withoutOwnership,
  homesForEmail,
  saleCustomer,
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
  morningRecipients,
  ORDER_SIZES,
  SIZE_DEFAULT_DURATION,
  overlaps,
  randomId,
};
