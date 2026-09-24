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
  garden: { et: 'Aed & õu', en: 'Garden & outdoors', ru: 'Сад и двор', orderField: 'gardenerId', nameField: 'gardenerName' },
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
      et: 'Eraldi visiit lisaks korduvale graafikule.',
      en: 'A separate visit, in addition to the standing schedule.', ru: 'Отдельный визит помимо постоянного графика.',
    },
    priceHint: { et: '140 €', en: '140 €', ru: '140 €' },
    durationMin: 180,
  },
  {
    id: 'deep-clean',
    category: 'cleaning',
    name: { et: 'Süvapuhastus', en: 'Deep clean', ru: 'Генеральная уборка' },
    description: {
      et: 'Põhjalik hooajaline puhastus: kapid seest, radiaatorid, liistud, plaadivahed.',
      en: 'Thorough seasonal clean: inside cupboards, radiators, skirting boards, tile grout.', ru: 'Тщательная сезонная уборка: шкафы внутри, радиаторы, плинтусы, швы плитки.',
    },
    priceHint: { et: 'alates 89 €', en: 'from 89 €', ru: 'от 89 €' },
    durationMin: 240,
  },
  {
    id: 'windows',
    category: 'cleaning',
    name: { et: 'Aknad ja rõdu', en: 'Windows and balcony', ru: 'Окна и балкон' },
    description: {
      et: 'Aknad seest ja rõdult, raamid ja aknalauad. Rõdu põrand, klaasid ja äravool lehtedest puhtaks. Kevadel ja sügisel.',
      en: 'Windows from inside and from the balcony, frames and sills. Balcony floor, glass and the drain cleared of leaves. In spring and autumn.', ru: 'Окна изнутри и с балкона, рамы и подоконники. Пол балкона, стёкла и слив очищены от листьев. Весной и осенью.',
    },
    priceHint: { et: 'alates 45 €', en: 'from 45 €', ru: 'от 45 €' },
    durationMin: 120,
  },
  {
    id: 'fridge-oven',
    category: 'cleaning',
    name: { et: 'Külmkapp ja ahi', en: 'Fridge & oven', ru: 'Холодильник и духовка' },
    description: {
      et: 'Külmkapi ja ahju põhjalik puhastus seest ja väljast.',
      en: 'Deep clean of fridge and oven, inside and out.', ru: 'Тщательная чистка холодильника и духовки внутри и снаружи.',
    },
    priceHint: { et: 'alates 35 €', en: 'from 35 €', ru: 'от 35 €' },
    durationMin: 90,
  },
  {
    id: 'ironing',
    category: 'cleaning',
    name: { et: 'Triikimine', en: 'Ironing', ru: 'Глажка' },
    description: {
      et: 'Triikimine visiidi ajal või eraldi ajal. Hind tunni alusel.',
      en: 'Ironing during a visit or at a separate time. Priced per hour.', ru: 'Глажка во время визита или отдельно. Цена за час.',
    },
    priceHint: { et: '25 €/h', en: '25 €/h', ru: '25 €/ч' },
    durationMin: 60,
  },
  {
    id: 'laundry',
    category: 'cleaning',
    name: { et: 'Pesu', en: 'Laundry', ru: 'Стирка' },
    description: {
      et: 'Pesumasin, kuivati ja voltimine. Koos koristusega või eraldi.',
      en: 'Washing, drying and folding. With a clean or on its own.', ru: 'Стиральная машина, сушка и складывание. Вместе с уборкой или отдельно.',
    },
    priceHint: { et: '25 €/h', en: '25 €/h', ru: '25 €/ч' },
    durationMin: 60,
  },
  {
    id: 'rugs',
    category: 'cleaning',
    name: { et: 'Vaibad', en: 'Rugs', ru: 'Ковры' },
    description: {
      et: 'Vaiba puhastus. Suurus ja materjal lepime vastuses.',
      en: 'Rug cleaning. Size and material are agreed in the reply.', ru: 'Чистка ковра. Размер и материал согласуем в ответе.',
    },
    priceHint: { et: 'hind kokkuleppel', en: 'price on request', ru: 'цена по договорённости' },
    durationMin: 60,
  },
  {
    id: 'linens',
    category: 'cleaning',
    name: { et: 'Voodipesu vahetus', en: 'Linen change', ru: 'Смена постельного белья' },
    description: {
      et: 'Voodipesu ja rätikute vahetus, kasutatud pesu masinasse. Soovi korral ka madratsi pööramine.',
      en: 'Change bed linen and towels, used linen into the machine. Mattress turning as well, if you want it.', ru: 'Смена постельного белья и полотенец, использованное бельё в машину. По желанию также переворот матраса.',
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
      et: 'Pesumasina filter ja tihend, nõudepesumasina filter ja pihustid, pliidikubu filter, veekeetja ja kohvimasina katlakivi, äravoolud. Koduhooldaja teeb koristuse käigus.',
      en: 'Washing-machine filter and seal, dishwasher filter and spray arms, hood filter, kettle and coffee-machine limescale, drains. The housekeeper does it during a clean.', ru: 'Фильтр и уплотнитель стиральной машины, фильтр и разбрызгиватели посудомоечной машины, фильтр вытяжки, накипь чайника и кофемашины, сливы. Специалист по дому делает это во время уборки.',
    },
    priceHint: { et: 'alates 25 €', en: 'from 25 €', ru: 'от 25 €' },
    durationMin: 45,
  },
  {
    id: 'away-care',
    category: 'cleaning',
    name: { et: 'Kodu hoidmine reisi ajal', en: 'Looking after the home while you travel', ru: 'Присмотр за домом во время поездки' },
    description: {
      et: 'Taimede kastmine, post, tuulutamine ja pilk peale. Märgi eemalolek Minu kodu all, et koristusajad nihkuksid.',
      en: 'Watering plants, post, airing and a look around. Mark the time away under My home so cleaning times shift.', ru: 'Полив растений, почта, проветривание и осмотр. Отметьте отсутствие в разделе «Мой дом», чтобы сдвинуть время уборки.',
    },
    priceHint: { et: '15 €/visiit', en: '15 €/visit', ru: '15 €/визит' },
    durationMin: 30,
  },
  {
    id: 'flowers',
    category: 'flowers',
    name: { et: 'Värsked lilled', en: 'Fresh flowers', ru: 'Свежие цветы' },
    description: {
      et: 'Kimp sinu eelistuse järgi, külalisteks või tähtpäevaks. Koduhooldaja toob koristusvisiidiga või lillepood toob koju.',
      en: 'A bouquet to your preference, for guests or a special day. The housekeeper brings it with a cleaning visit, or the florist delivers it home.', ru: 'Букет по вашему предпочтению, для гостей или к празднику. Специалист по дому принесёт его с уборкой, либо цветочный магазин доставит домой.',
    },
    priceHint: { et: 'alates 35 €', en: 'from 35 €', ru: 'от 35 €' },
    durationMin: 0,
  },
  // — Garantii ja maja (arendaja järelteenindus) —
  {
    id: 'warranty-claim',
    kind: 'issue', // a defect: description first, an inspection time is optional
    category: 'warranty',
    name: { et: 'Garantiipöördumine', en: 'Warranty claim', ru: 'Гарантийное обращение' },
    description: {
      et: 'Pragu, vuuk, uks või aken, mis ei sulgu, külm põrand, niiskus, müra. Kirjelda, garantiimeeskond kinnitab ülevaatuse aja. Kui pole kindel, kas see on garantii, küsi ikka.',
      en: 'A crack, a joint, a door or window that will not close, a cold floor, damp, noise. Describe it and the warranty team confirms an inspection time. If you are not sure it is warranty, ask anyway.', ru: 'Трещина, шов, дверь или окно, которое не закрывается, холодный пол, сырость, шум. Опишите, гарантийная команда подтвердит время осмотра. Если не уверены, что это гарантия, всё равно спросите.',
    },
    priceHint: { et: 'Garantii korras', en: 'Under warranty', ru: 'По гарантии' },
    durationMin: 60,
  },
  {
    id: 'warranty-inspection',
    category: 'warranty',
    name: { et: 'Garantiiülevaatus', en: 'Warranty inspection', ru: 'Гарантийный осмотр' },
    description: {
      et: '1. ja 2. aasta lõpus käib garantiimeeskond kodu üle. Aja saab siit sobivaks nihutada või varem kutsuda, kui märkamisi on kogunenud.',
      en: 'At the end of year 1 and year 2 the warranty team walks the home. The time can be moved here, or called earlier if notes have piled up.', ru: 'В конце 1-го и 2-го года гарантийная команда осматривает дом. Время можно перенести здесь или вызвать раньше, если замечаний накопилось.',
    },
    priceHint: { et: 'Garantii korras', en: 'Under warranty', ru: 'По гарантии' },
    durationMin: 90,
  },
  {
    id: 'systems-tuning',
    category: 'warranty',
    name: { et: 'Kütte ja ventilatsiooni seadistus', en: 'Heating and ventilation setup', ru: 'Настройка отопления и вентиляции' },
    description: {
      et: 'Ventilatsiooni režiimid, põrandakütte termostaadid ja ajakavad. Seadistame su elurütmi järgi ja näitame, kuidas kodu töötab. Esimesel aastal garantii korras.',
      en: 'Ventilation modes, floor-heating thermostats and schedules. We set them to your rhythm and show how the home works. Covered by warranty in the first year.', ru: 'Режимы вентиляции, термостаты тёплого пола и расписания. Настроим под ваш ритм и покажем, как дом работает. В первый год по гарантии.',
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
      et: 'Kuidas panna ventilatsioon suverežiimile, kus on peakraan, mida katab köögitehnika garantii. Vastame kirjalikult.',
      en: 'How to set the ventilation to summer mode, where the main stopcock is, what the kitchen-appliance warranty covers. We reply in writing.', ru: 'Как поставить вентиляцию в летний режим, где главный кран, что покрывает гарантия кухонной техники. Ответим письменно.',
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
      et: 'Parkimine, panipaik, prügimaja kood, võtmed ja puldid, kodukord, ühistu arved. Haldur vastab kirjalikult.',
      en: 'Parking, storage, the waste-room code, keys and fobs, house rules, association bills. The manager replies in writing.', ru: 'Парковка, кладовая, код мусорной комнаты, ключи и пульты, правила дома, счета товарищества. Управляющий ответит письменно.',
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
      et: 'Rõdu klaasimine, jahutus, lisapistikud, lisavalgustus. Sama meeskond, kes maja ehitas, saadab hinnapakkumise. Töö algab alles sinu kinnitusega.',
      en: 'Balcony glazing, cooling, extra sockets, extra lighting. The team that built the house sends a quote. Work starts only once you confirm.', ru: 'Остекление балкона, охлаждение, дополнительные розетки, дополнительное освещение. Та же команда, что строила дом, пришлёт смету. Работа начнётся только после вашего подтверждения.',
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
      et: 'Maalid, peeglid, riiulid, kardinapuud ja teler seinale. Õige kinnitus õigesse seina, jälgi jätmata.',
      en: 'Paintings, mirrors, shelves, curtain rails and a television on the wall. The right fixing in the right wall, without a mark left behind.', ru: 'Картины, зеркала, полки, карнизы и телевизор на стену. Нужное крепление в нужную стену, без следов.',
    },
    priceHint: { et: 'alates 45 €', en: 'from 45 €', ru: 'от 45 €' },
    durationMin: 90,
  },
  {
    id: 'vent-filters',
    category: 'handyman',
    name: { et: 'Ventilatsiooni filtrid ja kütte kontroll', en: 'Ventilation filters and heating check', ru: 'Фильтры вентиляции и проверка отопления' },
    description: {
      et: 'Soojustagastusega ventilatsiooni filtrite vahetus, seadme ja põrandakütte termostaatide hooajaline kontroll. Kevadel ja enne kütteperioodi.',
      en: 'Filter change for heat-recovery ventilation, and a seasonal check of the unit and the floor-heating thermostats. In spring and before the heating season.', ru: 'Замена фильтров вентиляции с рекуперацией, сезонная проверка устройства и термостатов тёплого пола. Весной и перед отопительным сезоном.',
    },
    priceHint: { et: 'alates 55 €', en: 'from 55 €', ru: 'от 55 €' },
    durationMin: 60,
  },
  {
    id: 'small-repairs',
    category: 'handyman',
    name: { et: 'Pisiremont', en: 'Small repairs', ru: 'Мелкий ремонт' },
    description: {
      et: 'Pirnid ja patareid, ummistunud äravool, lahti tulnud käepide, kasutusest tekkinud kriimud ja augud. See, mis ei ole ehitaja garantii. Kahtluse korral küsi enne garantiimeeskonnalt.',
      en: 'Bulbs and batteries, a blocked drain, a handle that has come loose, scratches and holes from use. What is not the builder warranty. If in doubt, ask the warranty team first.', ru: 'Лампочки и батарейки, засор слива, открутившаяся ручка, царапины и отверстия от пользования. То, что не входит в гарантию застройщика. При сомнении сначала спросите гарантийную команду.',
    },
    priceHint: { et: 'alates 45 €/h', en: 'from 45 €/h', ru: 'от 45 €/ч' },
    durationMin: 90,
  },
  {
    id: 'assembly',
    category: 'handyman',
    name: { et: 'Mööbli kokkupanek', en: 'Furniture assembly', ru: 'Сборка мебели' },
    description: {
      et: 'Uue mööbli kokkupanek ja paigaldus, pakendi äravedu.',
      en: 'Assembly and placement of new furniture, packaging taken away.', ru: 'Сборка и установка новой мебели, вывоз упаковки.',
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
      en: 'A curtain rail on the wall and the curtains hung. We measure on site.', ru: 'Карниз на стену и шторы повесить. Размеры снимем на месте.',
    },
    priceHint: { et: 'alates 45 €', en: 'from 45 €', ru: 'от 45 €' },
    durationMin: 90,
  },
  {
    id: 'lock',
    category: 'handyman',
    name: { et: 'Lukuvahetus', en: 'Lock change', ru: 'Замена замка' },
    description: {
      et: 'Välisukse südamiku vahetus. Südamiku võid tuua ise.',
      en: 'A new cylinder in the front door. You can bring the cylinder yourself.', ru: 'Замена личинки входной двери. Личинку можете принести сами.',
    },
    priceHint: { et: 'alates 45 €', en: 'from 45 €', ru: 'от 45 €' },
    durationMin: 45,
  },
  {
    id: 'appliance-install',
    category: 'handyman',
    name: { et: 'Kodumasina paigaldus', en: 'Appliance installation', ru: 'Установка бытовой техники' },
    description: {
      et: 'Pesumasin, nõudepesumasin, pliit või õhupuhasti oma kohale ja ühendatud.',
      en: 'A washing machine, dishwasher, hob or hood set in place and connected.', ru: 'Стиральная машина, посудомоечная машина, плита или вытяжка на место и подключены.',
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
      et: 'Niitmine, servade trimmimine ja niite äravedu. Ühekordselt või hooajaks.',
      en: 'Mowing, edge trimming and clippings removed. One-off or for the season.', ru: 'Кошение, подравнивание краёв и вывоз скошенной травы. Разово или на сезон.',
    },
    priceHint: { et: 'alates 45 €', en: 'from 45 €', ru: 'от 45 €' },
    durationMin: 90,
  },
  {
    id: 'hedge',
    category: 'garden',
    name: { et: 'Heki ja põõsaste lõikus', en: 'Hedge & shrub trimming', ru: 'Стрижка живой изгороди и кустов' },
    description: {
      et: 'Hekk, põõsad ja viljapuud õigel ajal ja õige kujuga; oksad ära.',
      en: 'Hedges, shrubs and fruit trees trimmed at the right time and shape; branches removed.', ru: 'Изгородь, кусты и плодовые деревья вовремя и в нужной форме; ветки уберём.',
    },
    priceHint: { et: 'alates 65 €', en: 'from 65 €', ru: 'от 65 €' },
    durationMin: 120,
  },
  {
    id: 'outdoor-wash',
    category: 'garden',
    name: { et: 'Terrassi ja tänavakivide pesu', en: 'Terrace & paving wash', ru: 'Мойка террасы и брусчатки' },
    description: {
      et: 'Survepesu terrassile, tänavakividele ja fassaadi alaosale; vihmaveerennide puhastus.',
      en: 'Pressure wash for terrace, paving and lower façade; gutters cleared.', ru: 'Мойка под давлением террасы, брусчатки и нижней части фасада; чистка водостоков.',
    },
    priceHint: { et: 'alates 95 €', en: 'from 95 €', ru: 'от 95 €' },
    durationMin: 180,
  },
  {
    id: 'seasonal-garden',
    category: 'garden',
    name: { et: 'Kevad- ja sügiskoristus õues', en: 'Spring & autumn garden clean-up', ru: 'Весенняя и осенняя уборка двора' },
    description: {
      et: 'Lehed, peenrad, aiamööbli hooajaline sisse-välja, lumelükkamise kokkulepe talveks.',
      en: 'Leaves, beds, garden furniture in or out for the season, snow-clearing agreement for winter.', ru: 'Листья, грядки, сезонная установка садовой мебели, договор на уборку снега зимой.',
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
      et: 'Rütmi muutus, eritähelepanu, küsimus — kirjuta, koduhooldaja vastab siia.',
      en: 'A change of rhythm, extra attention, a question — write it and the housekeeper replies here.', ru: 'Изменение ритма, особое внимание, вопрос — напишите, специалист по дому ответит здесь.',
    },
    priceHint: { et: '', en: '', ru: '' },
    durationMin: 0,
  },
  {
    id: 'other',
    category: 'cleaning',
    name: { et: 'Muu soov', en: 'Something else', ru: 'Другое пожелание' },
    description: {
      et: 'Kui sobivat kaarti ei ole, kirjelda. Suuname õigele inimesele ja vastame.',
      en: 'If no card fits, describe it. We route it to the right person and reply.', ru: 'Если подходящей карточки нет, опишите. Направим нужному человеку и ответим.',
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
  any: { et: 'Sobib iga aeg', en: 'Any time', ru: 'Подойдёт любое время', from: '09:00', to: '17:00' },
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
  { id: 'vent-filters', name: { et: 'Ventilatsiooni filtrid', en: 'Ventilation filters', ru: 'Фильтры вентиляции' }, hint: { et: 'Vaheta või pese — must filter tähendab kehva õhku ja suuremat elektriarvet.', en: 'Replace or wash — a dirty filter means poor air and a higher electricity bill.', ru: 'Замените или промойте — грязный фильтр означает плохой воздух и больший счёт за электричество.' }, intervalMonths: 6, serviceId: 'vent-filters', homeTypes: ['apartment', 'house'], byProvider: false },
  // New-build home: what the developer's after-sales team wants the owner to keep an eye on
  { id: 'warranty-inspection', name: { et: 'Garantiiülevaatus', en: 'Warranty inspection', ru: 'Гарантийный осмотр' }, hint: { et: '1. ja 2. aasta lõpus, enne garantii lõppu — puudused ühe aktiga kirja.', en: 'At the end of year 1 and year 2, before the warranty ends — defects recorded in one report.', ru: 'В конце 1-го и 2-го года, до конца гарантии — недостатки одним актом.' }, intervalMonths: 12, serviceId: 'warranty-inspection', homeTypes: ['apartment', 'house'] },
  { id: 'floor-heating', name: { et: 'Põrandakütte termostaadid', en: 'Floor-heating thermostats', ru: 'Термостаты тёплого пола' }, hint: { et: 'Enne kütteperioodi režiimid ja ajakavad üle vaadata. Tehnik teeb koos filtritega.', en: 'Before the heating season, look over modes and schedules. The technician does it together with the filters.', ru: 'Перед отопительным сезоном проверьте режимы и расписания. Техник делает это вместе с фильтрами.' }, intervalMonths: 12, serviceId: 'vent-filters', homeTypes: ['apartment', 'house'] },
  { id: 'sealant-check', name: { et: 'Silikoonvuukide kontroll', en: 'Silicone seal check', ru: 'Проверка силиконовых швов' }, hint: { et: 'Vannituba ja köök: pragunenud vuuk laseb vee alla. Garantiiajal parandab ehitaja. Pärast garantiiaega teeb tehnik.', en: 'Bathroom and kitchen: a cracked seal lets water through. Fixed by the builder during warranty. After the warranty the technician does it.', ru: 'Ванная и кухня: треснувший шов пропускает воду. Во время гарантии чинит застройщик. После гарантии это делает техник.' }, intervalMonths: 12, serviceId: 'warranty-claim', homeTypes: ['apartment', 'house', 'summer'] },
  { id: 'washer-service', name: { et: 'Pesumasina hooldus', en: 'Washing machine service', ru: 'Обслуживание стиральной машины' }, hint: { et: 'Puhasta filter ja tihend, käivita tühi 90° programm.', en: 'Clean the filter and seal, run an empty 90° cycle.', ru: 'Очистите фильтр и уплотнитель, запустите пустую программу 90°.' }, intervalMonths: 3, serviceId: 'appliance-care', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'dishwasher-filter', name: { et: 'Nõudepesumasina filter', en: 'Dishwasher filter', ru: 'Фильтр посудомоечной машины' }, hint: { et: 'Loputa filter ja pihustid; sool ja loputusvahend üle vaadata.', en: 'Rinse the filter and spray arms; check salt and rinse aid.', ru: 'Промойте фильтр и разбрызгиватели; проверьте соль и ополаскиватель.' }, intervalMonths: 1, serviceId: 'appliance-care', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'hood-filter', name: { et: 'Pliidikubu filter', en: 'Range hood filter', ru: 'Фильтр вытяжки' }, hint: { et: 'Metallfilter nõudepesumasinasse, süsinikfilter vahetada.', en: 'Metal filter in the dishwasher, carbon filter replaced.', ru: 'Металлический фильтр в посудомоечную машину, угольный фильтр заменить.' }, intervalMonths: 3, serviceId: 'appliance-care', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'mattress', name: { et: 'Madratsi pööramine', en: 'Mattress turning', ru: 'Переворот матраса' }, hint: { et: 'Pööra või keera madrats, koos voodipesu vahetusega.', en: 'Turn or rotate the mattress, together with the linen change.', ru: 'Переверните или поверните матрас вместе со сменой белья.' }, intervalMonths: 6, serviceId: 'linens', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'smoke-detector', name: { et: 'Suitsuanduri kontroll', en: 'Smoke detector check', ru: 'Проверка дымового датчика' }, hint: { et: 'Testnupp ja patarei. Andur ise vahetada iga 10 aasta tagant.', en: 'Test button and battery. Replace the detector itself every 10 years.', ru: 'Кнопка теста и батарейка. Сам датчик менять каждые 10 лет.' }, intervalMonths: 12, serviceId: 'small-repairs', homeTypes: ['apartment', 'house', 'summer'] },
  { id: 'heat-pump', name: { et: 'Soojuspumba filtrid', en: 'Heat pump filters', ru: 'Фильтры теплового насоса' }, hint: { et: 'Siseosa filtrid pesta; välisosa lehtedest puhtaks.', en: 'Wash indoor unit filters; clear the outdoor unit of leaves.', ru: 'Промойте фильтры внутреннего блока; очистите наружный блок от листьев.' }, intervalMonths: 3, serviceId: 'small-repairs', homeTypes: ['house', 'summer'] },
  { id: 'boiler', name: { et: 'Boileri ja veesüsteemi kontroll', en: 'Water heater and plumbing check', ru: 'Проверка бойлера и водопровода' }, hint: { et: 'Kaitseklapp, anood, lekked ja segistid.', en: 'Safety valve, anode, leaks and taps.', ru: 'Предохранительный клапан, анод, протечки и смесители.' }, intervalMonths: 24, serviceId: 'small-repairs', homeTypes: ['house', 'summer'] },
  { id: 'deep-clean', name: { et: 'Süvapuhastus', en: 'Deep clean', ru: 'Генеральная уборка' }, hint: { et: 'Mööbli alt, vaibad, radiaatorid, lambid — see, mida tavakoristus ei kata.', en: 'Under furniture, rugs, radiators, lamps — what a regular clean does not cover.', ru: 'Под мебелью, ковры, радиаторы, лампы — то, что обычная уборка не покрывает.' }, intervalMonths: 6, serviceId: 'deep-clean', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'windows', name: { et: 'Aknad ja rõdu', en: 'Windows and balcony', ru: 'Окна и балкон' }, hint: { et: 'Kevadel ja sügisel aknad seest, rõdu põrand ja klaasid, rõdu äravool lehtedest puhtaks.', en: 'In spring and autumn the windows from inside, the balcony floor and glass, and the balcony drain cleared of leaves.', ru: 'Весной и осенью окна изнутри, пол и стёкла балкона, слив балкона очистить от листьев.' }, intervalMonths: 6, serviceId: 'windows', homeTypes: ['apartment', 'house', 'summer'], byProvider: true },
  { id: 'gutters', name: { et: 'Vihmaveerennid', en: 'Gutters', ru: 'Водостоки' }, hint: { et: 'Lehed välja enne külmi, äravool kontrollida.', en: 'Leaves out before the frost, check the downpipes.', ru: 'Листья убрать до морозов, проверить водосточные трубы.' }, intervalMonths: 12, serviceId: 'seasonal-garden', homeTypes: ['house', 'summer'] },
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
  let nextDueAt = todayStr;
  if (lastDoneAt) {
    nextDueAt = toDateStr(addMonths(parseDateStr(lastDoneAt), intervalMonths));
  } else if (input.startsAt) {
    const start = parseDateStr(input.startsAt);
    if (!start) return { error: 'Vigane kuupäev' };
    if (input.startsAt < todayStr) return { error: 'Algus ei saa olla minevikus' };
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
  free: { id: 'free', name: 'Tasuta', price: 0, homes: 3, lookupKey: null, blurb: { et: 'Kuni 3 kodu. Kõik funktsioonid, ilma ajapiiranguta.', en: 'Up to 3 homes. Every feature, no time limit.', ru: 'До 3 домов. Все функции, без ограничения по времени.' } },
  pro: { id: 'pro', name: 'Standard', price: 19, homes: 20, lookupKey: 'sukoda_provider_pro_monthly', blurb: { et: 'Kuni 20 kodu. Iga kuu tühistatav.', en: 'Up to 20 homes. Cancel any month.', ru: 'До 20 домов. Можно отменить в любой месяц.' } },
  studio: { id: 'studio', name: 'Stuudio', price: 39, homes: null, lookupKey: 'sukoda_provider_studio_monthly', blurb: { et: 'Piiramatult kodusid. Iga kuu tühistatav.', en: 'Unlimited homes. Cancel any month.', ru: 'Без ограничения числа домов. Можно отменить в любой месяц.' } },
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
