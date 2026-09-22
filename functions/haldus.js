/**
 * SUKODA haldus — provider portal backend (/haldus), client portal extras
 * (/minu contacts + lisateenused), admin provider management and the
 * recurring-schedule cron.
 *
 * Exported as a factory so it can reuse index.js helpers (sendEmail, email
 * header/footer, Tallinn time helpers) without circular requires:
 *
 *   const haldus = require('./haldus')({ ...deps });
 *   Object.assign(exports, haldus.functions);
 */

const crypto = require('crypto');
const core = require('./lib/haldus-core');
const push = require('./push');
const hausing = require('./lib/hausing');
const sharepoint = require('./lib/sharepoint');
const homePass = require('./lib/home-pass');

module.exports = function createHaldus(deps) {
  const {
    functions,
    admin,
    db,
    cors,
    SECRETS,
    checkRateLimit,
    authenticateAdmin,
    authenticateClient,
    sendEmail,
    sendClientMagicLink,
    getStripe,
    emailHeader,
    emailFooter,
    formatDate,
    formatTime,
    tallinnLocalDateTimeToISOString,
    tallinnParts,
    escapeHtml,
    calService,
    NOTIFICATION_EMAIL,
  } = deps;

  const SITE = 'https://sukoda.ee';
  const HALDUS_URL = `${SITE}/haldus`;
  const PORTAL_URL = `${SITE}/minu`;
  const SCHEDULE_HORIZON_DAYS = 45;
  const MAX_OPEN_REQUESTS = 5;
  const TOKEN_DAYS = core.SESSION_DAYS;

  // Static imports (not admin.firestore.X): the functions emulator monkey-patches
  // admin.firestore during load, so statics read off it at require-time can be undefined.
  const { Timestamp, FieldValue } = require('firebase-admin/firestore');

  // ============================================================
  // Small utilities
  // ============================================================

  function sha256(s) {
    return crypto.createHash('sha256').update(s).digest('hex');
  }

  /** Firestore throws on empty doc paths; map missing ids to a never-existing doc instead */
  function docId(v) {
    const s = String(v || '').trim();
    return s && !s.includes('/') && !/^__.*__$/.test(s) ? s : 'missing-id';
  }

  function newToken() {
    const raw = crypto.randomBytes(32).toString('hex');
    return { raw, hash: sha256(raw) };
  }

  function tsToIso(v) {
    if (!v) return null;
    if (v.toDate) return v.toDate().toISOString();
    if (v instanceof Date) return v.toISOString();
    return null;
  }

  function toDate(v) {
    if (!v) return null;
    if (v.toDate) return v.toDate();
    if (v instanceof Date) return v;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function todayTallinnStr(offsetDays = 0) {
    const p = tallinnParts(new Date());
    const d = new Date(Date.UTC(p.year, p.month, p.day, 12));
    return core.toDateStr(core.addDays(d, offsetDays));
  }

  function tallinnDateStr(date) {
    const p = tallinnParts(date);
    return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  }

  function str(v, max) {
    return String(v == null ? '' : v).trim().slice(0, max);
  }

  function langOf(order) {
    return core.langOf(order);
  }

  function primaryName(order) {
    if (!order) return '';
    const n = order.type === 'gift' ? (order.recipient?.name || order.customer?.name) : order.customer?.name;
    return (n && !String(n).includes('Physical Card')) ? n : '';
  }

  function primaryEmail(order) {
    if (!order) return '';
    return core.normalizeEmail(order.type === 'gift' ? (order.recipient?.email || order.customer?.email) : order.customer?.email);
  }

  function primaryAddress(order) {
    if (!order) return '';
    return order.type === 'gift' ? (order.recipient?.address || order.customer?.address || '') : (order.customer?.address || '');
  }

  function firstName(name) {
    return String(name || '').trim().split(/\s+/)[0] || '';
  }

  /** How we address a partner: the contact person's first name, else the (business) name in full — never "Tere, Kodulahe" */
  function greetName(provider) {
    if (!provider) return '';
    const contact = String(provider.contactName || '').trim();
    return contact || String(provider.name || '').trim();
  }

  // Route table helper: `${METHOD} ${path-after-/api}`
  function router(handlers, { rateLimitName, rateLimitMax = 60 } = {}) {
    return functions
      .runWith({ secrets: SECRETS }).region('europe-west1')
      .https.onRequest((req, res) => {
        cors(req, res, async () => {
          if (rateLimitName && !checkRateLimit(req, res, rateLimitName, rateLimitMax, 60000)) return;
          const idx = req.path.indexOf('/api/');
          const path = (idx >= 0 ? req.path.slice(idx) : req.path).replace(/\/+$/, '');
          // One parameterized route: POST /api/haldus/visits/:id/done. Other paths stay exact-match.
          const doneMatch = req.method === 'POST' ? path.match(/^\/api\/haldus\/visits\/([^/]+)\/done$/) : null;
          let visitId = null;
          if (doneMatch) {
            try { visitId = decodeURIComponent(doneMatch[1]); } catch (e) { visitId = doneMatch[1]; }
          }
          const handler = visitId != null
            ? handlers['POST /api/haldus/visits/:id/done']
            : handlers[`${req.method} ${path}`];
          if (!handler) {
            const anyMethod = !doneMatch && Object.keys(handlers).some((k) => k.endsWith(` ${path}`));
            return res.status(anyMethod ? 405 : 404).json({ error: anyMethod ? 'Method not allowed' : 'Not found' });
          }
          if (visitId != null) req.visitId = visitId;
          try {
            await handler(req, res);
          } catch (error) {
            console.error(`haldus ${req.method} ${path} failed:`, error);
            if (!res.headersSent) res.status(500).json({ error: 'Server error' });
          }
        });
      });
  }

  // ============================================================
  // Email copy (customer-facing: ET/EN/RU via pick; provider-facing: ET)
  // ============================================================

  const T = {
    et: {
      hello: (n) => (n ? `Tere, ${n}.` : 'Tere.'),
      yourCleaner: (p) => (p ? `Sinu koduhooldaja: ${p}` : ''),
      yourContact: (p) => (p ? `Sinu kontakt: ${p}` : ''),
      time: 'Aeg',
      at: 'kell',
      address: 'Aadress',
      duration: 'Kestus',
      minutes: 'min',
      service: 'Teenus',
      price: 'Hind',
      note: 'Märkus',
      addToCalendar: 'Lisa kalendrisse',
      google: 'Google Calendar',
      apple: 'Apple / Outlook',
      portalNote: 'Kõik ajad, pöördumised ja dokumendid leiad oma koduportaalist. Kui aeg ei sobi või tahad midagi lisada, tee seda seal — nii jääb kõik kodu juurde.',
      portalBtn: 'AVA PORTAAL',
      calTitle: 'SUKODA koristus',
      calTitleService: (s, brand) => `${brand || 'SUKODA'} · ${s}`,

      subjConfirmed: 'SUKODA | Sinu aeg on kinnitatud',
      confirmedTitle: 'Sinu aeg on kinnitatud',
      confirmedIntro: (p) => (p ? `${p} tuleb sinu koju alltoodud ajal.` : 'Sinu koduhoolitsuse aeg on kinnitatud.'),
      confirmedServiceIntro: (p, s) => (p ? `${p} kinnitas sinu soovi „${s}“.` : `Sinu soov „${s}“ on kinnitatud.`),

      subjRescheduled: 'SUKODA | Sinu visiidi aeg on muudetud',
      rescheduledTitle: 'Visiidi aeg on muudetud',
      rescheduledIntro: (p) => (p ? `${p} muutis sinu visiidi aega.` : 'Sinu visiidi aeg on muudetud.'),
      oldTime: 'Eelmine aeg',
      newTime: 'Uus aeg',

      subjCancelled: 'SUKODA | Sinu visiit on tühistatud',
      cancelledTitle: 'Visiit on tühistatud',
      cancelledIntro: (p) => (p ? `${p} tühistas alltoodud visiidi.` : 'Alltoodud visiit on tühistatud.'),
      reason: 'Põhjus',

      subjReminder: 'SUKODA | Homme on koristus',
      reminderTitle: 'Homme on koristus',
      subjReminderWarranty: 'SUKODA | Homme on garantiivisiit',
      reminderTitleWarranty: 'Homme on garantiivisiit',
      subjReminderOther: (p) => (p ? `SUKODA | Homme tuleb ${p}` : 'SUKODA | Homme on visiit'),
      reminderTitleOther: (p) => (p ? `Homme tuleb ${p}` : 'Homme on visiit'),
      reminderIntro: (p) => (p ? `Meeldetuletus: ${p} tuleb homme.` : 'Meeldetuletus sinu homsest visiidist.'),
      reminderAccess: 'Palun jäta koju ligipääs. Kui aeg ei sobi, muuda seda portaalis või kirjuta pöördumise juurde.',

      subjSchedule: 'SUKODA | Sinu järgmised koristusajad',
      scheduleTitle: 'Sinu järgmised koristusajad',
      scheduleIntro: (p) => (p ? `${p} pani paika järgmised ajad. Need on kõigil pere kontaktidel ühe klikiga kalendrisse lisatavad.` : 'Järgmised ajad on paigas.'),
      scheduleNote: 'Kui mõni aeg ei sobi, muuda seda portaalis või kirjuta seal oma koduhooldajale.',

      subjWelcome: 'SUKODA | Sinu kodu portaal on avatud',
      welcomeTitle: 'Tere tulemast SUKODA-sse',
      welcomeIntro: (p) => (p ? `${p} lisas sind oma klientide hulka SUKODA-s. Siit näed kõiki koristusaegu, saad lisada pereliikmed teavituste saajateks ja tellida lisateenuseid.` : 'Sinu kodu portaal on valmis.'),
      welcomeIntroPartner: (p) => (p ? `${p} lisas sinu kodu oma töölauale. Portaalis näed pöördumisi, aegu ja dokumente.` : 'Sinu kodu portaal on valmis.'),
      welcomeBtn: 'AVA MINU SUKODA',
      welcomeContacts: 'Soovitus: lisa portaalis „Minu kodu“ all pereliikme e-post — siis jõuavad kõik ajad ka temani.',

      subjRequestReceived: (s) => `SUKODA | Soov vastu võetud: ${s}`,
      subjQuestionSent: (s) => `SUKODA | Küsimus saadetud: ${s}`,
      subjIssueSent: (s) => `SUKODA | Pöördumine saadetud: ${s}`,
      requestReceivedTitle: 'Soov vastu võetud',
      questionSentTitle: 'Küsimus saadetud',
      issueSentTitle: 'Pöördumine saadetud',
      requestReceivedIntro: (p) => (p ? `Edastasime sinu soovi partnerile ${p}. Tavaliselt kinnitab ta aja sama päeva jooksul.` : 'Edastasime sinu soovi. Kinnitame aja tavaliselt sama päeva jooksul.'),
      questionSentIntro: (p) => (p ? `Sinu küsimus on nüüd meeskonnal ${p}. Vastus tuleb kirjalikult, tavaliselt sama tööpäeva jooksul.` : 'Sinu küsimus on vastu võetud. Vastus tuleb kirjalikult, tavaliselt sama tööpäeva jooksul.'),
      issueSentIntro: (p) => `Edastasime sinu pöördumise partnerile ${p || 'Partner'}. Garantiimeeskond kinnitab ülevaatuse aja tavaliselt 2 tööpäeva jooksul.`,
      preferredDate: 'Soovitud päev',
      preferredTime: 'Soovitud aeg',
      asap: 'Esimesel võimalusel',
      requestReceivedNote: 'E-kiri on teavitus. Kui tahad midagi lisada või täpsustada, kirjuta portaalis pöördumise juurde — nii jääb kogu vestlus kodu juurde.',

      subjRequestDeclined: (s) => `SUKODA | Soov „${s}“ vajab uut aega`,
      requestDeclinedTitle: 'Vajame uut aega',
      requestDeclinedIntro: (p) => (p ? `${p} ei saa kahjuks soovitud ajal. Ava pöördumine portaalis ja paku uut aega — nii jääb vestlus kodu juurde.` : 'Soovitud aeg kahjuks ei sobi. Ava pöördumine portaalis ja paku uut aega.'),
      subjIssueReviewed: (s) => `SUKODA | Pöördumine vaadatud üle: ${s}`,
      issueReviewedTitle: 'Pöördumine vaadatud üle',
      issueReviewedIntro: (p) => (p ? `${p} vaatas sinu pöördumise üle. Kirjeldatud puudus ei kuulu kahjuks garantii alla — selgitus on allpool.` : 'Vaatasime sinu pöördumise üle. Kirjeldatud puudus ei kuulu kahjuks garantii alla — selgitus on allpool.'),
      issueReviewedNote: 'Kui soovid, tellime töö tasulisena — kirjuta portaalis selle pöördumise juurde, siis lepime aja kokku.',
      message: 'Sõnum',
      explanation: 'Selgitus',

      subjCompleted: (s) => `SUKODA | Tehtud: ${s}`,
      completedTitle: 'Tehtud',
      completedIntro: (p, s) => (p ? `${p} märkis töö „${s}“ tehtuks.` : `Töö „${s}“ on tehtud.`),
      completedNote: 'Kui midagi jääb, kirjuta pöördumise juurde.',

      subjRequestCancelled: 'SUKODA | Soov tühistatud',

      subjAway: 'SUKODA | Eemalolek on kirjas',
      awayTitle: 'Eemalolek on kirjas',
      awayIntro: (p, by) => (by === 'provider' && p ? `${p} märkis, et oled eemal. Sel ajal visiite ei toimu.` : (p ? `Andsime partnerile ${p} teada, et oled eemal. Sel ajal visiite ei toimu.` : 'Sel ajal visiite ei toimu.')),
      awayPeriod: 'Eemal',
      awayCancelled: 'Tühistatud visiidid',
      awayNone: 'Sellesse vahemikku ei jäänud ühtegi visiiti.',
      awayResume: 'Pärast tagasitulekut jätkuvad ajad tavapäraselt. Kui plaanid muutuvad, saad eemaloleku portaalis eemaldada.',
      subjAwayRemoved: 'SUKODA | Eemalolek eemaldatud',
      awayRemovedTitle: 'Eemalolek eemaldatud',
      awayRemovedIntro: (p) => (p ? `${p} teab, et oled siiski kodus. Taastatud ja eelseisvad ajad on allpool.` : 'Taastatud ja eelseisvad ajad on allpool.'),
    },
    en: {
      hello: (n) => (n ? `Hello, ${n}.` : 'Hello.'),
      yourCleaner: (p) => (p ? `Your housekeeper: ${p}` : ''),
      yourContact: (p) => (p ? `Your contact: ${p}` : ''),
      time: 'Time',
      at: 'at',
      address: 'Address',
      duration: 'Duration',
      minutes: 'min',
      service: 'Service',
      price: 'Price',
      note: 'Note',
      addToCalendar: 'Add to calendar',
      google: 'Google Calendar',
      apple: 'Apple / Outlook',
      portalNote: 'All times, requests and documents live in your home portal. If a time does not suit or you want to add something, do it there — that way everything stays with the home.',
      portalBtn: 'OPEN PORTAL',
      calTitle: 'SUKODA cleaning',
      calTitleService: (s, brand) => `${brand || 'SUKODA'} · ${s}`,

      subjConfirmed: 'SUKODA | Your time is confirmed',
      confirmedTitle: 'Your time is confirmed',
      confirmedIntro: (p) => (p ? `${p} will come to your home at the time below.` : 'Your home care visit is confirmed.'),
      confirmedServiceIntro: (p, s) => (p ? `${p} confirmed your request "${s}".` : `Your request "${s}" is confirmed.`),

      subjRescheduled: 'SUKODA | Your visit has been rescheduled',
      rescheduledTitle: 'Visit rescheduled',
      rescheduledIntro: (p) => (p ? `${p} changed the time of your visit.` : 'Your visit time has changed.'),
      oldTime: 'Previous time',
      newTime: 'New time',

      subjCancelled: 'SUKODA | Your visit has been cancelled',
      cancelledTitle: 'Visit cancelled',
      cancelledIntro: (p) => (p ? `${p} cancelled the visit below.` : 'The visit below has been cancelled.'),
      reason: 'Reason',

      subjReminder: 'SUKODA | Cleaning tomorrow',
      reminderTitle: 'Cleaning tomorrow',
      subjReminderWarranty: 'SUKODA | Warranty visit tomorrow',
      reminderTitleWarranty: 'Warranty visit tomorrow',
      subjReminderOther: (p) => (p ? `SUKODA | ${p} comes tomorrow` : 'SUKODA | Visit tomorrow'),
      reminderTitleOther: (p) => (p ? `${p} comes tomorrow` : 'Visit tomorrow'),
      reminderIntro: (p) => (p ? `Reminder: ${p} is coming tomorrow.` : 'A reminder of tomorrow\'s visit.'),
      reminderAccess: 'Please make sure we can access your home. If the time does not suit, change it in your portal or write on the request.',

      subjSchedule: 'SUKODA | Your upcoming cleaning times',
      scheduleTitle: 'Your upcoming cleaning times',
      scheduleIntro: (p) => (p ? `${p} scheduled the following visits. Every household contact can add them to a calendar with one click.` : 'The following visits are scheduled.'),
      scheduleNote: 'If a time does not suit, change it in your portal or write to your housekeeper there.',

      subjWelcome: 'SUKODA | Your home portal is ready',
      welcomeTitle: 'Welcome to SUKODA',
      welcomeIntro: (p) => (p ? `${p} added you as a client in SUKODA. Here you can see all cleaning times, add family members as notification recipients and order extra services.` : 'Your home portal is ready.'),
      welcomeIntroPartner: (p) => (p ? `${p} added your home to their desk. In the portal you see requests, times and documents.` : 'Your home portal is ready.'),
      welcomeBtn: 'OPEN MY SUKODA',
      welcomeContacts: 'Tip: add a family member\'s email under "My home" so every visit reaches them too.',

      subjRequestReceived: (s) => `SUKODA | Request received: ${s}`,
      subjQuestionSent: (s) => `SUKODA | Question sent: ${s}`,
      subjIssueSent: (s) => `SUKODA | Report sent: ${s}`,
      requestReceivedTitle: 'Request received',
      questionSentTitle: 'Question sent',
      issueSentTitle: 'Report sent',
      requestReceivedIntro: (p) => (p ? `We passed your request to ${p}. A time is usually confirmed the same day.` : 'We received your request and will usually confirm a time the same day.'),
      questionSentIntro: (p) => (p ? `Your question is now with ${p}. The answer comes in writing, usually the same working day.` : 'Your question has been received. The answer comes in writing, usually the same working day.'),
      issueSentIntro: (p) => (p ? `We passed your report to ${p}. The warranty team reviews the description and usually confirms an inspection time within 2 working days — or replies in writing.` : 'Your report has been received. We review the description and usually confirm an inspection time within 2 working days — or reply in writing.'),
      preferredDate: 'Preferred day',
      preferredTime: 'Preferred time',
      asap: 'As soon as possible',
      requestReceivedNote: 'This e-mail is a notification. To add or clarify anything, write on the request in the portal — that way the whole conversation stays with the home.',

      subjRequestDeclined: (s) => `SUKODA | "${s}" needs a new time`,
      requestDeclinedTitle: 'We need a new time',
      requestDeclinedIntro: (p) => (p ? `Unfortunately ${p} cannot make the requested time. Open the request in your portal and propose a new time — that way the conversation stays with the home.` : 'Unfortunately the requested time does not work. Open the request in your portal and propose a new time.'),
      subjIssueReviewed: (s) => `SUKODA | Report reviewed: ${s}`,
      issueReviewedTitle: 'Report reviewed',
      issueReviewedIntro: (p) => (p ? `${p} reviewed your report. Unfortunately the described defect is not covered by the warranty — the explanation is below.` : 'We reviewed your report. Unfortunately the described defect is not covered by the warranty — the explanation is below.'),
      issueReviewedNote: 'If you wish, we can do the work as a paid job — write on this request in the portal and we agree on a time.',
      message: 'Message',
      explanation: 'Explanation',

      subjCompleted: (s) => `SUKODA | Done: ${s}`,
      completedTitle: 'Done',
      completedIntro: (p, s) => (p ? `${p} marked "${s}" as done.` : `"${s}" is done.`),
      completedNote: 'If anything remains, write on the request.',

      subjRequestCancelled: 'SUKODA | Request cancelled',

      subjAway: 'SUKODA | Away period saved',
      awayTitle: 'Away period saved',
      awayIntro: (p, by) => (by === 'provider' && p ? `${p} noted that you are away. No visits will take place during this time.` : (p ? `We let ${p} know you are away. No visits will take place during this time.` : 'No visits will take place during this time.')),
      // (EN keeps the same keys as ET; brand-specific wording is handled in wrap())
      awayPeriod: 'Away',
      awayCancelled: 'Cancelled visits',
      awayNone: 'No visits fell into this period.',
      awayResume: 'Visits continue as usual after you return. If plans change, you can remove the away period in your portal.',
      subjAwayRemoved: 'SUKODA | Away period removed',
      awayRemovedTitle: 'Away period removed',
      awayRemovedIntro: (p) => (p ? `${p} knows you are home after all. Restored and upcoming times are below.` : 'Restored and upcoming times are below.'),
    },
    ru: {
      hello: (n) => (n ? `Здравствуйте, ${n}.` : 'Здравствуйте.'),
      yourCleaner: (p) => (p ? `Ваш специалист по дому: ${p}` : ''),
      yourContact: (p) => (p ? `Ваш контакт: ${p}` : ''),
      time: 'Время',
      at: 'в',
      address: 'Адрес',
      duration: 'Длительность',
      minutes: 'мин',
      service: 'Услуга',
      price: 'Цена',
      note: 'Примечание',
      addToCalendar: 'Добавить в календарь',
      google: 'Google Calendar',
      apple: 'Apple / Outlook',
      portalNote: 'Все время, обращения и документы находятся в портале вашего дома. Если время не подходит или вы хотите что-то добавить, сделайте это там — так всё останется при доме.',
      portalBtn: 'ОТКРЫТЬ ПОРТАЛ',
      calTitle: 'Уборка SUKODA',
      calTitleService: (s, brand) => `${brand || 'SUKODA'} · ${s}`,

      subjConfirmed: 'SUKODA | Ваше время подтверждено',
      confirmedTitle: 'Ваше время подтверждено',
      confirmedIntro: (p) => (p ? `${p} придёт к вам домой в указанное ниже время.` : 'Время ухода за домом подтверждено.'),
      confirmedServiceIntro: (p, s) => (p ? `${p} подтверждает вашу заявку «${s}».` : `Ваша заявка «${s}» подтверждена.`),

      subjRescheduled: 'SUKODA | Время визита изменено',
      rescheduledTitle: 'Время визита изменено',
      rescheduledIntro: (p) => (p ? `${p} меняет время вашего визита.` : 'Время вашего визита изменено.'),
      oldTime: 'Прежнее время',
      newTime: 'Новое время',

      subjCancelled: 'SUKODA | Ваш визит отменён',
      cancelledTitle: 'Визит отменён',
      cancelledIntro: (p) => (p ? `${p} отменяет указанный ниже визит.` : 'Указанный ниже визит отменён.'),
      reason: 'Причина',

      subjReminder: 'SUKODA | Завтра уборка',
      reminderTitle: 'Завтра уборка',
      subjReminderWarranty: 'SUKODA | Завтра гарантийный визит',
      reminderTitleWarranty: 'Завтра гарантийный визит',
      subjReminderOther: (p) => (p ? `SUKODA | Завтра придёт ${p}` : 'SUKODA | Завтра визит'),
      reminderTitleOther: (p) => (p ? `Завтра придёт ${p}` : 'Завтра визит'),
      reminderIntro: (p) => (p ? `Напоминание: ${p} придёт завтра.` : 'Напоминание о завтрашнем визите.'),
      reminderAccess: 'Оставьте, пожалуйста, доступ в дом. Если время не подходит, измените его в портале или напишите в обращении.',

      subjSchedule: 'SUKODA | Ваши ближайшие уборки',
      scheduleTitle: 'Ваши ближайшие уборки',
      scheduleIntro: (p) => (p ? `${p} назначает следующие визиты. Контакты семьи могут добавить их в календарь одним нажатием.` : 'Следующие визиты назначены.'),
      scheduleNote: 'Если время не подходит, измените его в портале или напишите там своему специалисту по дому.',

      subjWelcome: 'SUKODA | Портал вашего дома открыт',
      welcomeTitle: 'Добро пожаловать в SUKODA',
      welcomeIntro: (p) => (p ? `${p} добавляет вас в клиенты SUKODA. Здесь вы видите время уборок, можете добавить членов семьи для уведомлений и заказать дополнительные услуги.` : 'Портал вашего дома готов.'),
      welcomeIntroPartner: (p) => (p ? `${p} добавляет ваш дом на свой рабочий стол. В портале видны обращения, время и документы.` : 'Портал вашего дома готов.'),
      welcomeBtn: 'ОТКРЫТЬ МОЙ SUKODA',
      welcomeContacts: 'Совет: добавьте электронную почту члена семьи в разделе «Мой дом» — тогда все визиты дойдут и до него.',

      subjRequestReceived: (s) => `SUKODA | Заявка принята: ${s}`,
      subjQuestionSent: (s) => `SUKODA | Вопрос отправлен: ${s}`,
      subjIssueSent: (s) => `SUKODA | Обращение отправлено: ${s}`,
      requestReceivedTitle: 'Заявка принята',
      questionSentTitle: 'Вопрос отправлен',
      issueSentTitle: 'Обращение отправлено',
      requestReceivedIntro: (p) => (p ? `Мы передали вашу заявку партнёру ${p}. Обычно время подтверждают в тот же день.` : 'Мы передали вашу заявку. Обычно время подтверждаем в тот же день.'),
      questionSentIntro: (p) => (p ? `Ваш вопрос теперь у команды ${p}. Ответ придёт письменно, обычно в тот же рабочий день.` : 'Ваш вопрос принят. Ответ придёт письменно, обычно в тот же рабочий день.'),
      issueSentIntro: (p) => `Мы передали ваше обращение партнёру ${p || 'Партнёр'}. Гарантийная команда обычно подтверждает время осмотра в течение 2 рабочих дней.`,
      preferredDate: 'Желаемый день',
      preferredTime: 'Желаемое время',
      asap: 'При первой возможности',
      requestReceivedNote: 'Это письмо — уведомление. Если хотите что-то добавить или уточнить, напишите в портале у обращения — так весь разговор останется при доме.',

      subjRequestDeclined: (s) => `SUKODA | «${s}» нужно новое время`,
      requestDeclinedTitle: 'Нужно новое время',
      requestDeclinedIntro: (p) => (p ? `К сожалению, ${p} не может прийти в желаемое время. Откройте обращение в портале и предложите новое время — так разговор останется при доме.` : 'К сожалению, желаемое время не подходит. Откройте обращение в портале и предложите новое время.'),
      subjIssueReviewed: (s) => `SUKODA | Обращение рассмотрено: ${s}`,
      issueReviewedTitle: 'Обращение рассмотрено',
      issueReviewedIntro: (p) => (p ? `Ваше обращение рассмотрено (${p}). Описанный недостаток, к сожалению, не входит в гарантию — пояснение ниже.` : 'Мы рассмотрели ваше обращение. Описанный недостаток, к сожалению, не входит в гарантию — пояснение ниже.'),
      issueReviewedNote: 'Если хотите, закажем работу платно — напишите у этого обращения в портале, и мы согласуем время.',
      message: 'Сообщение',
      explanation: 'Пояснение',

      subjCompleted: (s) => `SUKODA | Сделано: ${s}`,
      completedTitle: 'Сделано',
      completedIntro: (p, s) => (p ? `${p} отмечает работу «${s}» выполненной.` : `Работа «${s}» выполнена.`),
      completedNote: 'Если что-то осталось, напишите у обращения.',

      subjRequestCancelled: 'SUKODA | Заявка отменена',

      subjAway: 'SUKODA | Отсутствие записано',
      awayTitle: 'Отсутствие записано',
      awayIntro: (p, by) => (by === 'provider' && p ? `${p} отмечает, что вас не будет дома. В это время визитов не будет.` : (p ? `Мы сообщили партнёру ${p}, что вас не будет дома. В это время визитов не будет.` : 'В это время визитов не будет.')),
      awayPeriod: 'Отсутствие',
      awayCancelled: 'Отменённые визиты',
      awayNone: 'В этот период визитов не было.',
      awayResume: 'После возвращения визиты продолжатся как обычно. Если планы изменятся, отсутствие можно убрать в портале.',
      subjAwayRemoved: 'SUKODA | Отсутствие снято',
      awayRemovedTitle: 'Отсутствие снято',
      awayRemovedIntro: (p) => (p ? `${p} знает, что вы всё же дома. Восстановленное и предстоящее время ниже.` : 'Восстановленное и предстоящее время ниже.'),
    },
  };

  /** Customer-facing copy. Each key is picked from { et, en, ru }; a blank falls back to et. */
  function t(lang) {
    const l = core.langOf({ lang });
    const out = {};
    for (const key of Object.keys(T.et)) out[key] = core.pick({ et: T.et[key], en: T.en[key], ru: T.ru[key] }, l);
    return out;
  }

  /** Estonian and English dates stay on the shared formatter. Russian uses the same Tallinn calendar. */
  const dateInEtEn = formatDate;
  function formatWhen(date, lang) {
    if (lang !== 'ru') return dateInEtEn(date, lang);
    const d = date instanceof Date ? date : (date && typeof date.toDate === 'function' ? date.toDate() : null);
    if (!d || Number.isNaN(d.getTime())) return dateInEtEn(date, 'et');
    const s = new Intl.DateTimeFormat('ru-RU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Tallinn',
    }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ---- White label: a developer's after-sales portal carries the developer's name; SUKODA stays in the small print ----
  function brandOf(order) {
    const b = order?.brand;
    return b && b.name ? { name: String(b.name), project: String(b.project || '') } : null;
  }
  /** "SUKODA | …" → "Arco Vara | …" when the home has a brand */
  function brandSubject(order, subject) {
    const b = brandOf(order);
    return b ? String(subject || '').replace(/^SUKODA \| /, `${b.name} | `) : subject;
  }
  /** Sender display name; the address stays on our verified domain */
  function brandFrom(order) {
    const b = brandOf(order);
    if (!b) return undefined;
    const role = core.pick({ et: 'järelteenindus', en: 'after-sales', ru: 'послепродажный сервис' }, langOf(order));
    return `${b.name} ${role} <tere@sukoda.ee>`;
  }
  function brandHeader(brand, lang) {
    const line = brand.project ? `${brand.name} · ${brand.project}` : brand.name;
    const by = core.pick({ et: 'portaali pakub SUKODA', en: 'portal by SUKODA', ru: 'портал от SUKODA' }, lang);
    return `
    <div style="padding:44px 40px 36px;text-align:center;border-bottom:1px solid #E8E3DD;">
      <h1 style="color:#2C2824;font-size:24px;margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-weight:300;letter-spacing:1px;">${escapeHtml(line)}</h1>
      <p style="margin:0 0 12px 0;color:#8A8578;font-size:12px;letter-spacing:1px;">${by}</p>
      <div style="width:40px;height:1px;background:#B8976A;margin:0 auto;"></div>
    </div>`;
  }
  function brandFooter(brand, lang) {
    const by = core.pick({ et: 'PORTAALI PAKUB', en: 'PORTAL BY', ru: 'ПОРТАЛ ОТ' }, lang);
    return `
    <div style="padding:32px 40px 28px;text-align:center;border-top:1px solid #E8E3DD;">
      <p style="color:#2C2824;font-size:16px;margin:0 0 6px 0;font-family:Georgia,'Times New Roman',serif;font-weight:300;letter-spacing:2px;">${escapeHtml(brand.name)}</p>
      <div style="width:24px;height:1px;background:#B8976A;margin:0 auto 16px;"></div>
      <p style="color:#B8976A;font-size:10px;margin:0;letter-spacing:2px;">${by} <a href="https://sukoda.ee" style="color:#B8976A;text-decoration:none;">SUKODA</a></p>
    </div>`;
  }

  /** index.js footer knows only et/en; Russian letters must not end on an Estonian line. */
  function emailFooterRu() {
    return `
    <div style="padding: 36px 40px 28px; text-align: center; border-top: 1px solid #E8E3DD;">
      <p style="color: #2C2824; font-size: 18px; margin: 0 0 6px 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; letter-spacing: 3px;">SUKODA</p>
      <div style="width: 24px; height: 1px; background: #B8976A; margin: 0 auto 18px;"></div>
      <p style="color: #8A8578; font-size: 12px; margin: 0 0 6px 0;">Если есть вопросы: <a href="mailto:tere@sukoda.ee" style="color: #2C2824; text-decoration: none; border-bottom: 1px solid #B8976A;">tere@sukoda.ee</a></p>
      <p style="color: #B8976A; font-size: 10px; margin: 14px 0 0 0; letter-spacing: 2px;">
        <a href="https://sukoda.ee" style="color: #B8976A; text-decoration: none;">sukoda.ee</a>
      </p>
    </div>`;
  }

  /** `brand` = brandOf(order) or omitted */
  function wrap(inner, lang, brand) {
    const b = brand && brand.name ? brand : null;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#FAF8F5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#F5F0EB;">
    ${b ? brandHeader(b, lang) : emailHeader()}
    <div style="padding:36px 24px;">${inner}</div>
    ${b ? brandFooter(b, lang) : (lang === 'ru' ? emailFooterRu() : emailFooter(lang))}
  </div>
</body></html>`;
  }

  const H2 = (text) => `<h2 style="color:#2C2824;font-family:Georgia,'Times New Roman',serif;font-weight:300;font-size:28px;margin:0 0 8px 0;">${text}</h2>`;
  const P = (text, extra = '') => `<p style="color:#8A8578;font-size:14px;line-height:1.7;margin:0 0 20px 0;${extra}">${text}</p>`;
  const LABEL = (text) => `<p style="margin:0 0 8px 0;color:#B8976A;font-size:10px;text-transform:uppercase;letter-spacing:3px;font-weight:500;">${text}</p>`;
  const ROW = (label, value) => `<p style="margin:12px 0 0 0;padding-top:12px;border-top:1px solid #E8E3DD;color:#8A8578;font-size:14px;">${label}: <strong style="color:#2C2824;font-weight:400;">${value}</strong></p>`;

  function timeBox({ label, start, end, address, lang, extraRows = '' }) {
    const tt = t(lang);
    const dur = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;
    return `
      <div style="background:#FFFFFF;padding:28px;margin-bottom:28px;border-left:2px solid #B8976A;">
        ${LABEL(label)}
        <p style="margin:0 0 4px 0;font-weight:300;color:#2C2824;font-size:20px;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(formatWhen(start, lang))}</p>
        <p style="margin:0;color:#8A8578;font-size:16px;">${tt.at} ${escapeHtml(formatTime(start))}${dur ? ` <span style="color:#B8976A;">· ${dur} ${tt.minutes}</span>` : ''}</p>
        ${address ? ROW(tt.address, escapeHtml(address)) : ''}
        ${extraRows}
      </div>`;
  }

  function calendarLinks({ title, start, end, address, description, lang }) {
    const tt = t(lang);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const gParams = new URLSearchParams({
      action: 'TEMPLATE', text: title, dates: `${fmt(start)}/${fmt(end)}`,
      details: description || '', location: address || '',
    });
    const icsParams = new URLSearchParams({
      title, start: start.toISOString(), end: end.toISOString(),
      description: description || '', location: address || '',
    });
    const btn = 'display:inline-block;padding:10px 20px;background:#FFFFFF;border:1px solid #E8E3DD;color:#2C2824;text-decoration:none;font-size:13px;margin-right:8px;margin-bottom:8px;';
    return `
      <div style="margin-top:8px;padding-top:20px;border-top:1px solid #E8E3DD;">
        ${LABEL(tt.addToCalendar)}
        <a href="https://calendar.google.com/calendar/render?${gParams}" target="_blank" rel="noopener" style="${btn}">${tt.google} &rarr;</a>
        <a href="${SITE}/api/calendar?${icsParams}" style="${btn}">${tt.apple} &rarr;</a>
      </div>`;
  }

  function portalBlock(lang, url = PORTAL_URL) {
    const tt = t(lang);
    return `
      <div style="margin-top:28px;padding-top:24px;border-top:1px solid #E8E3DD;">
        ${P(tt.portalNote, 'margin-bottom:14px;')}
        <a href="${url}" style="display:inline-block;background:#111111;color:#FFFFFF;padding:14px 32px;text-decoration:none;font-size:11px;text-transform:uppercase;letter-spacing:3px;font-weight:500;">${tt.portalBtn}</a>
      </div>`;
  }
  /** Portal link that opens one request's thread after login */
  function requestUrl(requestId) {
    return requestId ? `${PORTAL_URL}?request=${encodeURIComponent(requestId)}` : PORTAL_URL;
  }

  /** The partner's trades; a provider record without `services` is a housekeeper */
  function providerServices(provider) {
    return Array.isArray(provider?.services) && provider.services.length ? provider.services : ['cleaning'];
  }

  /** Which service category a visit belongs to: the catalogue entry, else the partner's own trade */
  function visitCategory(booking, provider) {
    const svc = booking?.serviceId ? core.getService(booking.serviceId) : null;
    const ps = Array.isArray(provider?.services) ? provider.services : [];
    if (svc && svc.id !== 'other' && svc.category !== 'cleaning') return svc.category;
    if (ps.length && !ps.includes('cleaning')) return ps[0];
    return svc ? svc.category : 'cleaning';
  }

  function providerLine(providerName, lang, category = 'cleaning') {
    const tt = t(lang);
    const text = category === 'cleaning' ? tt.yourCleaner(providerName) : tt.yourContact(providerName);
    return providerName ? P(`<span style="color:#B8976A;">${escapeHtml(text)}</span>`, 'margin:0 0 24px 0;font-size:12px;letter-spacing:1px;') : '';
  }

  /** One template for confirmed / rescheduled / cancelled / reminder */
  function visitEmail({ kind, order, booking, provider, providerName, lang, oldStart, reason }) {
    const tt = t(lang);
    const brand = brandOf(order);
    const start = toDate(booking.scheduledAt);
    const end = toDate(booking.endTime) || new Date(start.getTime() + 2 * 3600000);
    const name = firstName(primaryName(order));
    const category = visitCategory(booking, provider);
    const svc = booking.serviceId ? core.serviceName(booking.serviceId, lang) : '';
    const title = svc || tt.calTitle;
    const calDesc = svc || tt.calTitle;
    const extraRows = [
      svc ? ROW(tt.service, escapeHtml(svc)) : '',
      booking.price ? ROW(tt.price, escapeHtml(booking.price)) : '',
      booking.customerNote ? ROW(tt.note, escapeHtml(booking.customerNote)) : '',
    ].join('');
    const portalUrl = requestUrl(booking.requestId);

    let heading; let intro; let subject; let body = '';
    if (kind === 'confirmed') {
      subject = tt.subjConfirmed;
      heading = tt.confirmedTitle;
      intro = svc ? tt.confirmedServiceIntro(providerName, svc) : tt.confirmedIntro(providerName);
      body = timeBox({ label: tt.time, start, end, address: booking.address, lang, extraRows })
        + calendarLinks({ title, start, end, address: booking.address, description: calDesc, lang });
    } else if (kind === 'rescheduled') {
      subject = tt.subjRescheduled;
      heading = tt.rescheduledTitle;
      intro = tt.rescheduledIntro(providerName);
      const old = toDate(oldStart);
      body = (old ? `<p style="margin:0 0 6px 0;color:#8A8578;font-size:13px;">${tt.oldTime}: <s>${escapeHtml(formatWhen(old, lang))}, ${escapeHtml(formatTime(old))}</s></p>` : '')
        + timeBox({ label: tt.newTime, start, end, address: booking.address, lang, extraRows })
        + calendarLinks({ title, start, end, address: booking.address, description: calDesc, lang });
    } else if (kind === 'cancelled') {
      subject = tt.subjCancelled;
      heading = tt.cancelledTitle;
      intro = tt.cancelledIntro(providerName);
      body = timeBox({ label: tt.oldTime, start, end, address: booking.address, lang, extraRows: reason ? ROW(tt.reason, escapeHtml(reason)) : '' });
    } else { // reminder — subject and title follow the kind of visit, not the cleaning default
      if (category === 'cleaning') { subject = tt.subjReminder; heading = tt.reminderTitle; }
      else if (category === 'warranty') { subject = tt.subjReminderWarranty; heading = tt.reminderTitleWarranty; }
      else { subject = tt.subjReminderOther(providerName); heading = tt.reminderTitleOther(providerName); }
      intro = tt.reminderIntro(providerName);
      body = timeBox({ label: tt.time, start, end, address: booking.address, lang, extraRows })
        + P(tt.reminderAccess)
        + calendarLinks({ title, start, end, address: booking.address, description: calDesc, lang });
    }

    const html = wrap(
      H2(heading) + P(`${tt.hello(escapeHtml(name))} ${escapeHtml(intro)}`) + providerLine(providerName, lang, category) + body + portalBlock(lang, portalUrl),
      lang, brand,
    );
    return {
      subject: brandSubject(order, subject),
      html,
      push: kind === 'reminder' ? push.message({ type: 'visit_tomorrow', lang, title: heading, body: intro, url: portalUrl }) : undefined,
    };
  }

  function scheduleEmail({ order, bookings, providerName, lang }) {
    const tt = t(lang);
    const name = firstName(primaryName(order));
    const rows = bookings.map((b) => {
      const start = toDate(b.scheduledAt);
      const end = toDate(b.endTime) || new Date(start.getTime() + 2 * 3600000);
      const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const g = new URLSearchParams({ action: 'TEMPLATE', text: tt.calTitle, dates: `${fmt(start)}/${fmt(end)}`, location: b.address || '' });
      const ics = new URLSearchParams({ title: tt.calTitle, start: start.toISOString(), end: end.toISOString(), location: b.address || '' });
      const link = 'color:#2C2824;text-decoration:none;border-bottom:1px solid #B8976A;font-size:12px;margin-left:10px;';
      return `<tr>
        <td style="padding:14px 0;border-bottom:1px solid #E8E3DD;color:#2C2824;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:300;">${escapeHtml(formatWhen(start, lang))}<span style="color:#8A8578;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;"> · ${tt.at} ${escapeHtml(formatTime(start))}</span></td>
        <td style="padding:14px 0;border-bottom:1px solid #E8E3DD;text-align:right;white-space:nowrap;"><a href="https://calendar.google.com/calendar/render?${g}" style="${link}">Google</a><a href="${SITE}/api/calendar?${ics}" style="${link}">Apple / Outlook</a></td>
      </tr>`;
    }).join('');
    const html = wrap(
      H2(tt.scheduleTitle) + P(`${tt.hello(escapeHtml(name))} ${escapeHtml(tt.scheduleIntro(providerName))}`) + providerLine(providerName, lang)
      + `<div style="background:#FFFFFF;padding:8px 28px;margin-bottom:28px;border-left:2px solid #B8976A;"><table style="width:100%;border-collapse:collapse;">${rows}</table></div>`
      + P(tt.scheduleNote) + portalBlock(lang),
      lang, brandOf(order),
    );
    return { subject: brandSubject(order, tt.subjSchedule), html };
  }

  /** `role` = the inviting partner's category; anything but cleaning gets the neutral intro */
  function welcomeEmail({ order, providerName, portalUrl, lang, role = 'cleaning' }) {
    const tt = t(lang);
    const name = firstName(primaryName(order));
    const intro = role === 'cleaning' ? tt.welcomeIntro(providerName) : tt.welcomeIntroPartner(providerName);
    const html = wrap(
      H2(tt.welcomeTitle) + P(`${tt.hello(escapeHtml(name))} ${escapeHtml(intro)}`)
      + `<div style="text-align:center;margin:32px 0;"><a href="${portalUrl}" style="display:inline-block;background:#111111;color:#FFFFFF;padding:16px 40px;text-decoration:none;font-size:11px;text-transform:uppercase;letter-spacing:3px;font-weight:500;">${tt.welcomeBtn}</a></div>`
      + P(tt.welcomeContacts, 'font-size:13px;'),
      lang, brandOf(order),
    );
    return { subject: brandSubject(order, tt.subjWelcome), html };
  }

  const dateOnly = (s) => new Date(`${s}T12:00:00Z`);
  /** "15.–22. sept" — for subjects and chips */
  function periodShort(period) {
    const f = new Intl.DateTimeFormat('et-EE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    const a = dateOnly(period.from); const b = dateOnly(period.to);
    if (period.from === period.to) return f.format(a);
    if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}.–${f.format(b)}`;
    return `${f.format(a)} – ${f.format(b)}`;
  }
  function periodLabel(period, lang) {
    return period.from === period.to
      ? formatWhen(dateOnly(period.from), lang)
      : `${formatWhen(dateOnly(period.from), lang)} – ${formatWhen(dateOnly(period.to), lang)}`;
  }

  /** Household: away period saved (+ which visits were cancelled) */
  function awayCustomerEmail({ order, period, cancelled, providerName, lang, by }) {
    const tt = t(lang);
    const name = firstName(primaryName(order));
    const rows = (cancelled || []).map((b) => {
      const s = toDate(b.scheduledAt);
      return `<p style="margin:8px 0 0 0;color:#8A8578;font-size:14px;text-decoration:line-through;">${escapeHtml(formatWhen(s, lang))} · ${tt.at} ${escapeHtml(formatTime(s))}</p>`;
    }).join('');
    const html = wrap(
      H2(tt.awayTitle) + P(`${tt.hello(escapeHtml(name))} ${escapeHtml(tt.awayIntro(providerName, by))}`) + providerLine(providerName, lang)
      + `<div style="background:#FFFFFF;padding:28px;margin-bottom:28px;border-left:2px solid #B8976A;">
          ${LABEL(tt.awayPeriod)}
          <p style="margin:0 0 4px 0;font-weight:300;color:#2C2824;font-size:20px;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(periodLabel(period, lang))}</p>
          ${period.note ? ROW(tt.note, escapeHtml(period.note)) : ''}
          <div style="margin-top:16px;padding-top:12px;border-top:1px solid #E8E3DD;">${LABEL(tt.awayCancelled)}${rows || `<p style="margin:0;color:#8A8578;font-size:14px;">${tt.awayNone}</p>`}</div>
        </div>`
      + P(tt.awayResume) + portalBlock(lang),
      lang, brandOf(order),
    );
    return { subject: brandSubject(order, tt.subjAway), html };
  }

  /** Provider: customer marked themselves away */
  function awayProviderEmail({ provider, order, period, cancelled, removed }) {
    const who = primaryName(order) || 'Klient';
    const rows = (cancelled || []).map((b) => {
      const s = toDate(b.scheduledAt);
      return `<li style="padding:8px 0;border-bottom:1px solid #E8E3DD;color:#8A8578;font-size:14px;">${escapeHtml(formatWhen(s, 'et'))} · kell ${escapeHtml(formatTime(s))}</li>`;
    }).join('');
    if (removed) {
      return {
        subject: `SUKODA | ${who} on siiski kodus`,
        html: providerWrap('Eemalolek tühistatud', `Tere, ${escapeHtml(greetName(provider))}. ${escapeHtml(who)} eemaldas eemaloleku ${escapeHtml(periodLabel(period, 'et'))}. Varem tühistatud ajad on taastatud ja graafik jätkub. Vaata oma kalendrit halduses.`, ''),
      };
    }
    return {
      subject: `SUKODA | ${who} on eemal ${periodShort(period)}`,
      html: providerWrap('Klient on eemal', `Tere, ${escapeHtml(greetName(provider))}. ${escapeHtml(who)} (${escapeHtml(primaryAddress(order) || '')}) andis teada, et on eemal <strong style="color:#2C2824;font-weight:400;">${escapeHtml(periodLabel(period, 'et'))}</strong>.${period.note ? ` Märkus: „${escapeHtml(period.note)}“.` : ''} Sel ajal visiite ei toimu — allolevad ajad on tühistatud ja graafik jätab selle vahemiku vahele.`,
        rows ? `<ul style="list-style:none;padding:0;margin:0;background:#FFFFFF;padding:12px 28px;border-left:2px solid #B8976A;">${rows}</ul>` : `<p style="color:#8A8578;font-size:14px;">Sellesse vahemikku ei jäänud ühtegi visiiti.</p>`),
    };
  }

  /** 'visit' | 'issue' | 'question' for a stored request */
  function requestKind(request) {
    return request?.type === 'reschedule' ? 'visit' : core.serviceKind(request?.serviceId);
  }
  /** The household's latest line in the thread (falls back to the original note) */
  function lastClientText(request) {
    const msgs = Array.isArray(request?.messages) ? request.messages.filter((m) => m && m.by === 'client' && m.text) : [];
    return msgs.length ? msgs[msgs.length - 1].text : (request?.note || '');
  }

  function requestReceivedEmail({ order, request, requestId, providerName, lang }) {
    const tt = t(lang);
    const name = firstName(primaryName(order));
    const svc = requestName(request, lang);
    const kind = requestKind(request);
    const kindLabel = kind === 'question'
      ? core.pick({ et: 'Küsimus', en: 'Question', ru: 'Вопрос' }, lang)
      : kind === 'issue'
        ? core.pick({ et: 'Pöördumine', en: 'Report', ru: 'Обращение' }, lang)
        : tt.service;
    const noteLabel = kind === 'question'
      ? core.pick({ et: 'Sinu küsimus', en: 'Your question', ru: 'Ваш вопрос' }, lang)
      : kind === 'issue'
        ? core.pick({ et: 'Kirjeldus', en: 'Description', ru: 'Описание' }, lang)
        : tt.note;
    const title = kind === 'question' ? tt.questionSentTitle : kind === 'issue' ? tt.issueSentTitle : tt.requestReceivedTitle;
    const intro = kind === 'question' ? tt.questionSentIntro(providerName) : kind === 'issue' ? tt.issueSentIntro(providerName) : tt.requestReceivedIntro(providerName);
    const subject = kind === 'question' ? tt.subjQuestionSent(svc) : kind === 'issue' ? tt.subjIssueSent(svc) : tt.subjRequestReceived(svc);
    const when = request.preferredDate ? formatWhen(core.parseDateStr(request.preferredDate), lang) : tt.asap;
    const target = toDate(request.targetScheduledAt);
    // The access note (door code, key holder) stays in the portal — never echoed into plain e-mail
    const html = wrap(
      H2(title) + P(`${tt.hello(escapeHtml(name))} ${escapeHtml(intro)}`)
      + `<div style="background:#FFFFFF;padding:28px;margin-bottom:28px;border-left:2px solid #B8976A;">
          ${LABEL(kindLabel)}
          <p style="margin:0;font-weight:300;color:#2C2824;font-size:20px;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(svc)}</p>
          ${target ? ROW(tt.oldTime, `${escapeHtml(formatWhen(target, lang))}, ${escapeHtml(formatTime(target))}`) : ''}
          ${kind !== 'question' ? ROW(tt.preferredDate, escapeHtml(when)) : ''}
          ${kind !== 'question' && request.timeWindow ? ROW(tt.preferredTime, escapeHtml(core.timeWindowLabel(request.timeWindow, lang))) : ''}
          ${request.note ? ROW(noteLabel, escapeHtml(request.note)) : ''}
        </div>`
      + P(tt.requestReceivedNote) + portalBlock(lang, requestUrl(requestId)),
      lang, brandOf(order),
    );
    return {
      subject: brandSubject(order, subject),
      html,
      push: push.message({ type: 'request_status', lang, title, body: intro, url: requestUrl(requestId) }),
    };
  }

  /** Visit kinds: the requested time does not work — propose another. Issue kind: reviewed, not under warranty. */
  function requestDeclinedEmail({ order, request, requestId, providerName, message, lang }) {
    const tt = t(lang);
    const name = firstName(primaryName(order));
    const svc = requestName(request, lang);
    const issue = requestKind(request) === 'issue';
    const heading = issue ? tt.issueReviewedTitle : tt.requestDeclinedTitle;
    const intro = issue ? tt.issueReviewedIntro(providerName) : tt.requestDeclinedIntro(providerName);
    const html = wrap(
      H2(heading)
      + P(`${tt.hello(escapeHtml(name))} ${escapeHtml(intro)}`)
      + `<div style="background:#FFFFFF;padding:28px;margin-bottom:28px;border-left:2px solid #B8976A;">
          ${LABEL(tt.service)}
          <p style="margin:0;font-weight:300;color:#2C2824;font-size:20px;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(svc)}</p>
          ${message ? ROW(issue ? tt.explanation : tt.message, escapeHtml(message).replace(/\n/g, '<br>')) : ''}
        </div>`
      + (issue ? P(tt.issueReviewedNote) : '')
      + portalBlock(lang, requestUrl(requestId)),
      lang, brandOf(order),
    );
    return {
      subject: brandSubject(order, issue ? tt.subjIssueReviewed(svc) : tt.subjRequestDeclined(svc)),
      html,
      push: push.message({ type: 'request_status', lang, title: heading, body: intro, url: requestUrl(requestId) }),
    };
  }

  function requestAnsweredEmail({ order, request, requestId, providerName, message, lang }) {
    const tt = t(lang);
    const name = firstName(primaryName(order));
    const svc = requestName(request, lang);
    const kind = requestKind(request);
    const who = providerName || request.providerName || 'Partner';
    const title = kind === 'question'
      ? core.pick({ et: 'Vastus sinu küsimusele', en: 'An answer to your question', ru: 'Ответ на ваш вопрос' }, lang)
      : core.pick({ et: 'Vastus sinu pöördumisele', en: 'A reply to your report', ru: 'Ответ на ваше обращение' }, lang);
    const yours = kind === 'question'
      ? core.pick({ et: 'Sinu küsimus', en: 'Your question', ru: 'Ваш вопрос' }, lang)
      : kind === 'issue'
        ? core.pick({ et: 'Sinu pöördumine', en: 'Your report', ru: 'Ваше обращение' }, lang)
        : core.pick({ et: 'Sinu soov', en: 'Your request', ru: 'Ваша заявка' }, lang);
    const asked = lastClientText(request);
    const replied = core.pick({ et: `${who} vastas.`, en: `${who} replied.`, ru: `Ответ от ${who}.` }, lang);
    const html = wrap(
      H2(title) + P(`${tt.hello(escapeHtml(name))} ${escapeHtml(replied)}`)
      + `<div style="background:#FFFFFF;padding:28px;margin-bottom:28px;border-left:2px solid #B8976A;">
          ${LABEL(tt.service)}
          <p style="margin:0 0 16px;font-weight:300;color:#2C2824;font-size:20px;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(svc)}</p>
          ${asked ? ROW(yours, escapeHtml(asked).replace(/\n/g, '<br>')) : ''}
          ${ROW(core.pick({ et: 'Vastus', en: 'Answer', ru: 'Ответ' }, lang), escapeHtml(message).replace(/\n/g, '<br>'))}
        </div>`
      + P(core.pick({ et: 'Ära vasta sellele kirjale. Kirjuta portaalis.', en: 'Do not reply to this e-mail. Write in the portal.', ru: 'Не отвечайте на это письмо. Напишите в портале.' }, lang), 'font-size:13px;color:#6B6560;')
      + portalBlock(lang, requestUrl(requestId)),
      lang, brandOf(order),
    );
    return {
      subject: brandSubject(order, core.pick({ et: `SUKODA | Vastus: ${svc}`, en: `SUKODA | Answer: ${svc}`, ru: `SUKODA | Ответ: ${svc}` }, lang)),
      html,
      push: push.message({ type: 'request_status', lang, title, body: replied, url: requestUrl(requestId) }),
    };
  }

  /** The partner marked the visit behind a request as done */
  function requestCompletedEmail({ order, request, requestId, providerName, note, lang }) {
    const tt = t(lang);
    const name = firstName(primaryName(order));
    const svc = requestName(request, lang);
    const title = lastClientText(request);
    const html = wrap(
      H2(`${tt.completedTitle}: ${escapeHtml(svc)}`) + P(`${tt.hello(escapeHtml(name))} ${escapeHtml(tt.completedIntro(providerName, svc))}`)
      + `<div style="background:#FFFFFF;padding:28px;margin-bottom:28px;border-left:2px solid #B8976A;">
          ${LABEL(tt.service)}
          <p style="margin:0;font-weight:300;color:#2C2824;font-size:20px;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(svc)}</p>
          ${title ? ROW(core.pick({ et: 'Sinu pöördumine', en: 'Your request', ru: 'Ваше обращение' }, lang), escapeHtml(title)) : ''}
          ${note ? ROW(tt.note, escapeHtml(note).replace(/\n/g, '<br>')) : ''}
        </div>`
      + P(tt.completedNote) + portalBlock(lang, requestUrl(requestId)),
      lang, brandOf(order),
    );
    return {
      subject: brandSubject(order, tt.subjCompleted(svc)),
      html,
      push: push.message({ type: 'request_status', lang, title: tt.completedTitle, body: tt.completedIntro(providerName, svc), url: requestUrl(requestId) }),
    };
  }

  // ============================================================
  // Flowers: the order goes to the florist automatically before each cleaning visit.
  // Billing stays between the customer and the shop (monthly invoice or whatever they agreed).
  // ============================================================
  const FLOWER_LEAD_DAYS = [1, 2, 3];
  const FLOWER_PICKUP = {
    partner: { et: 'Koduhooldaja võtab teel kaasa', en: 'Housekeeper picks up on the way', ru: 'Специалист по дому заберёт по пути' },
    customer: { et: 'Tellija võtab ise', en: 'Customer picks up', ru: 'Вы заберёте сами' },
    delivery: { et: 'Pood toob koju enne visiiti', en: 'Shop delivers before the visit', ru: 'Магазин привезёт домой до визита' },
  };

  function flowerSettings(order, florist) {
    const f = order?.flowers || {};
    return {
      auto: f.auto === true,
      leadDays: FLOWER_LEAD_DAYS.includes(f.leadDays) ? f.leadDays : 2,
      pickup: FLOWER_PICKUP[f.pickup] ? f.pickup : 'partner',
      note: f.note || '',
      budget: f.budget || '',
      preference: order?.homeProfile?.flowerPreference || '',
      floristName: florist?.name || null,
      floristBusiness: florist?.businessName || '',
      providerName: order?.providerName || null,
    };
  }

  /**
   * When the shop must have the bouquet ready. The partner picks it up on the way to the visit,
   * so an afternoon visit → ready that morning; a morning visit → ready the evening before.
   */
  function flowerReadyBy(start) {
    const hour = Number(formatTime(start).slice(0, 2));
    if (hour >= 12) return `${formatWhen(start, 'et')} hommikul`;
    const prev = new Date(start.getTime() - 86400000);
    return `${formatWhen(prev, 'et')} õhtul`;
  }

  /** What goes on the tag so three bouquets on the same counter don't all read "Cristelle" */
  function flowerLabel(order, provider) {
    const who = primaryName(order) || primaryEmail(order);
    const tag = provider ? (provider.contactName || provider.name || '') : '';
    return tag ? `${who} · ${tag}` : who;
  }

  /**
   * To the shop: one e-mail per shop per run, listing every bouquet with its own tag, ready-by time,
   * preference, size and who collects it. Reply-to is the partner when they collect, else the customer.
   * items: [{ order, booking, provider, settings }]
   */
  function floristOrderEmail({ florist, items }) {
    const many = items.length > 1;
    const dates = [...new Set(items.map((i) => tallinnDateStr(toDate(i.booking.scheduledAt))))].sort();
    const rows = items.map(({ order, booking, provider, settings }) => {
      const start = toDate(booking.scheduledAt);
      const pickup = FLOWER_PICKUP[settings.pickup]?.et || '';
      const who = settings.pickup === 'partner' && provider ? `${escapeHtml(provider.name)}${provider.phone ? ', ' + escapeHtml(provider.phone) : ''} võtab teel kaasa` : escapeHtml(pickup);
      return `<div style="background:#FFFFFF;padding:24px 28px;margin-bottom:16px;border-left:2px solid #B8976A;">
          ${LABEL('Sildile')}
          <p style="margin:0 0 14px;font-weight:300;color:#2C2824;font-size:20px;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(flowerLabel(order, provider))}</p>
          ${ROW('Valmis', `<span style="text-transform:capitalize;">${escapeHtml(flowerReadyBy(start))}</span>`)}
          ${ROW('Visiit', `<span style="text-transform:capitalize;">${escapeHtml(formatWhen(start, 'et'))}</span>, ${escapeHtml(formatTime(start))}`)}
          ${settings.preference ? ROW('Lilled', escapeHtml(settings.preference)) : ROW('Lilled', 'Poe valik, hooajaline')}
          ${settings.budget ? ROW('Kimp', escapeHtml(settings.budget)) : ''}
          ${settings.note ? ROW('Märkus', escapeHtml(settings.note)) : ''}
          ${ROW('Kättesaamine', who)}
        </div>`;
    }).join('');
    const intro = many
      ? `Tere${florist?.name ? ', ' + escapeHtml(firstName(florist.name)) : ''}! Järgmisteks koduvisiitideks on vaja ${items.length} kimpu. Iga kimbu juures on silt, kellele see läheb, ja aeg, milleks see peab valmis olema.`
      : `Tere${florist?.name ? ', ' + escapeHtml(firstName(florist.name)) : ''}! Järgmiseks koduvisiidiks on vaja ühte kimpu.`;
    const html = wrap(
      H2(many ? 'Lilletellimused' : 'Lilletellimus') + P(intro) + rows
      + P('Arveldus vastavalt teie kokkuleppele. Kui midagi on vaja täpsustada, vasta sellele kirjale. See tellimus saadeti automaatselt SUKODA koduportaalist; kui visiit tühistatakse, saad eraldi kirja.', 'font-size:12px;'),
      'et',
    );
    const when = dates.length === 1 ? periodShort({ from: dates[0], to: dates[0] }) : periodShort({ from: dates[0], to: dates[dates.length - 1] });
    const subject = many
      ? `SUKODA | Lilletellimused — ${items.length} kimpu, ${when}`
      : `SUKODA | Lilletellimus — ${primaryName(items[0].order) || primaryEmail(items[0].order)}, ${when}`;
    return { subject, html };
  }

  /** To the partner who collects: one e-mail per run listing what to pick up where */
  function partnerFlowersPickupEmail({ provider, items }) {
    const byShop = {};
    for (const it of items) { const k = it.florist.id; (byShop[k] = byShop[k] || { florist: it.florist, items: [] }).items.push(it); }
    const body = Object.values(byShop).map(({ florist, items: list }) => `<div style="background:#FFFFFF;padding:20px 24px;margin-bottom:14px;border-left:2px solid #B8976A;">
        ${LABEL(escapeHtml(florist.businessName || florist.name))}
        ${list.map(({ order, booking, settings }) => `<p style="margin:8px 0 0;font-size:14px;color:#2C2824;font-weight:300;"><strong style="font-weight:400;">${escapeHtml(primaryName(order))}</strong> — <span style="text-transform:capitalize;">${escapeHtml(formatWhen(toDate(booking.scheduledAt), 'et'))}</span>, ${escapeHtml(formatTime(toDate(booking.scheduledAt)))}${settings.preference ? ' · ' + escapeHtml(settings.preference) : ''}</p>`).join('')}
      </div>`).join('');
    const dates = [...new Set(items.map((i) => tallinnDateStr(toDate(i.booking.scheduledAt))))].sort();
    const when = periodShort({ from: dates[0], to: dates[dates.length - 1] });
    return {
      subject: items.length > 1 ? `SUKODA | Lilled kaasa — ${items.length} kimpu, ${when}` : `SUKODA | Lilled kaasa — ${primaryName(items[0].order)}, ${when}`,
      html: providerWrap('Lilled on tellitud', items.length > 1 ? `Poest on tellitud ${items.length} kimpu; igal on silt kliendi nimega. Võta teel kaasa.` : 'Kimp on poest tellitud, sildil on kliendi nimi. Võta teel kaasa.', body),
    };
  }

  function floristCancelEmail({ order, booking }) {
    const start = toDate(booking.scheduledAt);
    const name = primaryName(order) || primaryEmail(order);
    const when = `${formatWhen(start, 'et')}, ${formatTime(start)}`;
    return {
      subject: `SUKODA | Lilletellimus tühistatud — ${name}, ${periodShort({ from: tallinnDateStr(start), to: tallinnDateStr(start) })}`,
      html: wrap(H2('Lilletellimus tühistatud') + P(`${escapeHtml(name)} visiit <strong style="color:#2C2824;font-weight:400;text-transform:capitalize;">${escapeHtml(when)}</strong> jääb ära, seega kimpu selleks ajaks ei ole vaja. Vabandame lühikese ette teatamise pärast.`), 'et'),
    };
  }

  /** Short note to the customer: the flowers are ordered. */
  function flowersOrderedEmail({ order, booking, florist, settings }) {
    const lang = langOf(order);
    const start = toDate(booking.scheduledAt);
    const when = `${formatWhen(start, lang)}, ${formatTime(start)}`;
    const shop = florist?.businessName || florist?.name || '';
    const day = periodShort({ from: tallinnDateStr(start), to: tallinnDateStr(start) });
    const pref = settings.preference
      ? core.pick({
        et: ` Eelistus: ${escapeHtml(settings.preference)}.`,
        en: ` Preference: ${escapeHtml(settings.preference)}.`,
        ru: ` Предпочтение: ${escapeHtml(settings.preference)}.`,
      }, lang)
      : '';
    const pickup = escapeHtml(core.pick(FLOWER_PICKUP[settings.pickup] || {}, lang) || '');
    return {
      subject: core.pick({
        et: `SUKODA | Lilled tellitud — ${day}`,
        en: `SUKODA | Flowers ordered — ${day}`,
        ru: `SUKODA | Цветы заказаны — ${day}`,
      }, lang),
      html: wrap(
        H2(core.pick({ et: 'Lilled on tellitud', en: 'Flowers are ordered', ru: 'Цветы заказаны' }, lang))
        + P(core.pick({
          et: `Saatsime poele ${escapeHtml(shop)} tellimuse visiidiks <span style="text-transform:capitalize;">${escapeHtml(when)}</span>.${pref} ${pickup}.`,
          en: `We sent ${escapeHtml(shop)} the order for the visit on <span style="text-transform:capitalize;">${escapeHtml(when)}</span>.${pref} ${pickup}.`,
          ru: `Мы отправили магазину ${escapeHtml(shop)} заказ к визиту <span style="text-transform:capitalize;">${escapeHtml(when)}</span>.${pref} ${pickup}.`,
        }, lang))
        + P(core.pick({
          et: 'Lillede eelistust saad muuta portaalis Minu kodu → Lillede eelistus.',
          en: 'Change your flower preference in the portal under My home → Flower preference.',
          ru: 'Предпочтение по цветам можно изменить в портале: Мой дом → Предпочтение по цветам.',
        }, lang), 'font-size:12px;')
        + portalBlock(lang),
        lang,
      ),
    };
  }

  /**
   * Daily: collect visits inside each order's lead window, then send one e-mail per shop (all bouquets,
   * each with its own tag), one per collecting partner, and a short copy to each customer. Tell the shop
   * when an already-ordered visit is cancelled. Idempotent via flowerOrderSentAt / flowerOrderCancelledAt.
   */
  async function sendFlowerOrders() {
    const now = new Date();
    const horizon = new Date(now.getTime() + (Math.max(...FLOWER_LEAD_DAYS) + 1) * 86400000);
    const [liveSnap, cancelledSnap] = await Promise.all([
      db.collection('bookings').where('status', 'in', ['scheduled', 'confirmed']).where('scheduledAt', '>', Timestamp.fromDate(now)).where('scheduledAt', '<', Timestamp.fromDate(horizon)).get(),
      db.collection('bookings').where('status', '==', 'cancelled').where('scheduledAt', '>', Timestamp.fromDate(now)).get(),
    ]);
    const orders = {}; const providers = {};
    const orderFor = async (id) => { if (!(id in orders)) { const d = await db.collection('orders').doc(id).get(); orders[id] = d.exists ? { id: d.id, ...d.data() } : null; } return orders[id]; };
    const providerFor = async (id) => { if (!id) return null; if (!(id in providers)) providers[id] = await loadProvider(id); return providers[id]; };
    const today = todayTallinnStr(0);

    // 1. Decide what is due
    const due = [];
    for (const d of liveSnap.docs) {
      const b = d.data();
      if (b.flowerOrderSentAt || b.requestId || !b.orderId) continue;
      const order = await orderFor(b.orderId);
      if (!order || order.status !== 'paid' || order.pausedAt || !order.flowers?.auto) continue;
      const provider = await providerFor(b.providerId || order.providerId);
      const florist = await providerFor(floristIdFor(order, provider));
      if (!providerReplyTo(florist)) continue;
      const settings = flowerSettings(order, florist);
      const daysUntil = Math.round((core.parseDateStr(tallinnDateStr(toDate(b.scheduledAt))) - core.parseDateStr(today)) / 86400000);
      if (daysUntil > settings.leadDays) continue;
      due.push({ ref: d.ref, booking: { id: d.id, ...b }, order, provider, florist, settings });
    }
    due.sort((x, y) => toDate(x.booking.scheduledAt) - toDate(y.booking.scheduledAt));

    // 2. One e-mail per shop
    let sent = 0;
    const byShop = {};
    for (const it of due) (byShop[it.florist.id] = byShop[it.florist.id] || []).push(it);
    const done = [];
    for (const items of Object.values(byShop)) {
      const florist = items[0].florist;
      const to = providerReplyTo(florist);
      const collectors = [...new Set(items.filter((i) => i.settings.pickup === 'partner').map((i) => providerReplyTo(i.provider)).filter(Boolean))];
      try {
        await sendEmail({ to, ...floristOrderEmail({ florist, items }), replyTo: collectors.length === 1 ? collectors[0] : (primaryEmail(items[0].order) || undefined) });
        for (const it of items) {
          await it.ref.update({ flowerOrderSentAt: FieldValue.serverTimestamp(), flowerOrderTo: to, updatedAt: FieldValue.serverTimestamp() });
          done.push(it); sent += 1;
        }
      } catch (e) { console.error('sendFlowerOrders: shop mail failed', florist.id, e); }
    }

    // 3. One e-mail per collecting partner, and a copy to each customer
    const byPartner = {};
    for (const it of done) if (it.settings.pickup === 'partner' && providerReplyTo(it.provider)) (byPartner[it.provider.id] = byPartner[it.provider.id] || []).push(it);
    for (const items of Object.values(byPartner)) {
      try { await sendEmail({ to: providerReplyTo(items[0].provider), ...partnerFlowersPickupEmail({ provider: items[0].provider, items }) }); } catch (e) { console.error('sendFlowerOrders: partner mail failed', e); }
    }
    for (const it of done) {
      try { await sendEmail({ to: primaryEmail(it.order), ...flowersOrderedEmail({ order: it.order, booking: it.booking, florist: it.florist, settings: it.settings }), replyTo: providerReplyTo(it.florist) }); } catch (e) { console.error('sendFlowerOrders: customer copy failed', e); }
    }

    // 4. Cancellations for already-ordered visits
    let cancelled = 0;
    for (const d of cancelledSnap.docs) {
      const b = d.data();
      if (!b.flowerOrderSentAt || b.flowerOrderCancelledAt || !b.orderId) continue;
      const order = await orderFor(b.orderId);
      if (!order) continue;
      try {
        await sendEmail({ to: b.flowerOrderTo, ...floristCancelEmail({ order, booking: b }), replyTo: primaryEmail(order) || undefined });
        await d.ref.update({ flowerOrderCancelledAt: FieldValue.serverTimestamp() });
        cancelled += 1;
      } catch (e) { console.error('sendFlowerOrders cancel failed for booking', d.id, e); }
    }
    console.log(`sendFlowerOrders: ${sent} ordered, ${cancelled} cancellations`);
    return { sent, cancelled };
  }

  // Provider-facing (ET)
  function providerWrap(title, intro, bodyHtml, cta = { href: HALDUS_URL, label: 'AVA TÖÖLAUD' }) {
    return wrap(
      H2(title) + P(intro) + bodyHtml
      + `<div style="margin-top:28px;"><a href="${cta.href}" style="display:inline-block;background:#111111;color:#FFFFFF;padding:14px 32px;text-decoration:none;font-size:11px;text-transform:uppercase;letter-spacing:3px;font-weight:500;">${cta.label}</a></div>`,
      'et',
    );
  }

  function providerMagicLinkEmail(url) {
    return {
      subject: 'SUKODA Töölaud | Sinu sisenemislink',
      html: providerWrap('Sinu sisenemislink', 'Kliki nupule, et siseneda oma SUKODA töölauale. Link kehtib 30 päeva.', '', { href: url, label: 'AVA TÖÖLAUD' }),
    };
  }

  function providerNewRequestEmail({ order, request }) {
    const svc = requestName(request, 'et');
    const when = request.preferredDate ? formatWhen(core.parseDateStr(request.preferredDate), 'et') : 'Esimesel võimalusel';
    const target = toDate(request.targetScheduledAt);
    const isReschedule = request.type === 'reschedule';
    const kind = isReschedule ? 'visit' : core.serviceKind(request.serviceId);
    const who = escapeHtml(primaryName(order) || 'Klient');
    const title = isReschedule ? 'Klient soovib aega muuta' : kind === 'question' ? 'Uus küsimus' : kind === 'issue' ? 'Uus pöördumine' : 'Uus soov kliendilt';
    const intro = isReschedule
      ? `${who} soovib olemasoleva visiidi aega muuta. Kinnita uus aeg töölaual — kõik pere kontaktid saavad kohe uue kalendrikutse.`
      : kind === 'question'
        ? `${who} küsib. Vasta töölaual — vastus jõuab kliendile portaali ja e-postiga.`
        : kind === 'issue'
          ? `${who} kirjeldas puudust. Paku töölaual ülevaatuse aeg või vasta kirjalikult — klient näeb seda portaalis.`
          : `${who} soovib teenust. Kinnita aeg või vasta töölaual — klient näeb seda portaalis.`;
    // Subject: what and who, without repeating the kind when the service name already says it ("Pöördumine: Garantiipöördumine")
    const subjectLead = isReschedule ? 'Aja muutmise soov' : kind === 'question' ? 'Küsimus' : kind === 'issue' ? (/pöördumin/i.test(svc) ? svc : `Pöördumine: ${svc}`) : `Uus soov: ${svc}`;
    return {
      subject: `SUKODA | ${subjectLead} — ${primaryName(order) || primaryEmail(order)}`,
      push: push.message({
        type: 'new_request', lang: 'et', title, body: intro, url: `${HALDUS_URL}?tab=requests`, audience: 'provider',
      }),
      html: providerWrap(title, intro,
        `<div style="background:#FFFFFF;padding:28px;border-left:2px solid #B8976A;">
          ${LABEL(isReschedule ? 'Visiit' : kind === 'question' ? 'Teema' : 'Teenus')}
          <p style="margin:0;font-weight:300;color:#2C2824;font-size:20px;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(svc)}</p>
          ${target ? ROW('Praegune aeg', `${escapeHtml(formatWhen(target, 'et'))}, ${escapeHtml(formatTime(target))}`) : ''}
          ${kind !== 'question' ? ROW('Soovitud päev', escapeHtml(when)) : ''}
          ${kind !== 'question' && request.timeWindow ? ROW('Soovitud aeg', escapeHtml(core.timeWindowLabel(request.timeWindow, 'et'))) : ''}
          ${request.urgent ? ROW('Kiirus', 'Kiire — segab igapäevaelu') : ''}
          ${request.access ? ROW('Sissepääs sellel korral', escapeHtml(request.access)) : ''}
          ${request.note ? ROW(kind === 'question' ? 'Küsimus' : kind === 'issue' ? 'Kirjeldus' : 'Märkus', escapeHtml(request.note)) : ''}
          ${ROW('Aadress', escapeHtml(primaryAddress(order) || '-'))}
          ${ROW('Kontakt', `${escapeHtml(primaryEmail(order))}${order.customer?.phone ? ' · ' + escapeHtml(order.customer.phone) : ''}`)}
        </div>`,
        { href: `${HALDUS_URL}?tab=requests`, label: 'AVA TÖÖLAUD' }),
    };
  }

  function providerDigestEmail({ provider, skipped }) {
    const rows = skipped.map((s) => `<li style="padding:8px 0;border-bottom:1px solid #E8E3DD;color:#8A8578;font-size:14px;"><strong style="color:#2C2824;font-weight:400;">${escapeHtml(s.customerName)}</strong> — ${escapeHtml(s.date)} (${escapeHtml(s.holiday)})</li>`).join('');
    return {
      subject: 'SUKODA | Riigipühale langevad koristusajad',
      html: providerWrap('Vajab sinu otsust', `Tere, ${escapeHtml(greetName(provider))}. Järgmised graafiku ajad langevad riigipühale, seega me ei lisanud neid automaatselt. Lisa käsitsi, kui soovid neil päevadel siiski tulla, või lepi kliendiga uus aeg.`,
        `<ul style="list-style:none;padding:0;margin:0;background:#FFFFFF;padding:12px 28px;border-left:2px solid #B8976A;">${rows}</ul>`),
    };
  }

  // ============================================================
  // Notification dispatch
  // ============================================================

  async function deliverMailPush(order, mail) {
    if (!mail || !mail.push) return;
    try {
      await push.deliver(mail.push, { tokens: push.tokensFrom(order) });
    } catch (e) {
      console.error('notifyOrder: push failed', e && e.message);
    }
  }

  async function notifyOrder(order, mail, { replyTo } = {}) {
    const { subject, html } = mail || {};
    const lang = core.langOf(order);
    const subj = subject && typeof subject === 'object' ? core.pick(subject, lang) : subject;
    const body = html && typeof html === 'object' ? core.pick(html, lang) : html;
    const recipients = core.resolveRecipients(order);
    for (const r of recipients) {
      await sendEmail({ to: r.email, subject: brandSubject(order, subj), html: body, replyTo, from: brandFrom(order) });
    }
    await deliverMailPush(order, mail);
    return recipients.length;
  }

  /** One customer-facing mail to the primary address, carrying the home's brand (sender name + subject prefix) */
  async function sendCustomerMail(order, mail, { replyTo, to } = {}) {
    const { subject, html } = mail || {};
    const email = to || primaryEmail(order);
    if (!core.isValidEmail(email)) return false;
    const lang = core.langOf(order);
    const subj = subject && typeof subject === 'object' ? core.pick(subject, lang) : subject;
    const body = html && typeof html === 'object' ? core.pick(html, lang) : html;
    await sendEmail({ to: email, subject: brandSubject(order, subj), html: body, replyTo, from: brandFrom(order) });
    await deliverMailPush(order, mail);
    return true;
  }

  async function loadProvider(providerId) {
    if (!providerId) return null;
    const doc = await db.collection('providers').doc(providerId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  function providerReplyTo(provider) {
    const e = core.normalizeEmail(provider?.notifyEmail || provider?.email);
    return core.isValidEmail(e) ? e : undefined;
  }
  /** Request and visit mail is read in the portal; replies must not land in a partner inbox */
  const PORTAL_REPLY_TO = 'ei-vasta@sukoda.ee';

  async function sendVisitNotification(kind, { order, booking, provider, oldStart, reason }) {
    const lang = langOf(order);
    const p = provider || (booking.providerId ? await loadProvider(booking.providerId) : null);
    const mail = visitEmail({ kind, order, booking, provider: p, providerName: p?.name || '', lang, oldStart, reason });
    return notifyOrder(order, mail, { replyTo: PORTAL_REPLY_TO });
  }

  // ============================================================
  // Bookings (visits)
  // ============================================================

  function serializeBooking(id, b) {
    return {
      id,
      orderId: b.orderId || null,
      providerId: b.providerId || null,
      customerName: b.customerName || '',
      customerEmail: b.customerEmail || '',
      customerPhone: b.customerPhone || '',
      address: b.address || '',
      scheduledAt: tsToIso(b.scheduledAt),
      endTime: tsToIso(b.endTime),
      status: b.status,
      kind: b.kind || (b.serviceId ? 'extra' : 'regular'),
      serviceId: b.serviceId || null,
      serviceName: b.serviceId ? core.serviceName(b.serviceId, 'et') : null,
      price: b.price || null,
      note: b.note || '',
      customerNote: b.customerNote || '',
      source: b.source || (b.calBookingUid ? 'cal' : (b.isManualEntry ? 'manual' : 'unknown')),
      hasCal: Boolean(b.calBookingUid),
      scheduleOccurrence: b.scheduleOccurrence || null,
      requestId: b.requestId || null,
      flowersOrdered: Boolean(b.flowerOrderSentAt),
      completedAt: tsToIso(b.completedAt),
      cancelReason: b.cancelReason || null,
      previousScheduledAt: tsToIso(b.previousScheduledAt),
      rescheduledBy: b.rescheduledBy || null,
      reminderSent: Boolean(b.reminderSent),
    };
  }

  async function findConflicts(providerId, start, end, excludeId) {
    if (!providerId) return [];
    const windowStart = new Date(start.getTime() - 12 * 3600000);
    const snap = await db.collection('bookings')
      .where('providerId', '==', providerId)
      .where('scheduledAt', '>=', Timestamp.fromDate(windowStart))
      .where('scheduledAt', '<', Timestamp.fromDate(end))
      .get();
    const out = [];
    for (const doc of snap.docs) {
      if (doc.id === excludeId) continue;
      const b = doc.data();
      if (!['scheduled', 'confirmed'].includes(b.status)) continue;
      const bs = toDate(b.scheduledAt);
      const be = toDate(b.endTime) || new Date(bs.getTime() + 2 * 3600000);
      if (core.overlaps(start, end, bs, be)) out.push(serializeBooking(doc.id, b));
    }
    return out;
  }

  /** Another provider already coming to this home in the same window. */
  async function findHomeConflicts(orderId, start, end, excludeId, providerId) {
    if (!orderId) return [];
    const windowStart = new Date(start.getTime() - 12 * 3600000);
    const snap = await db.collection('bookings')
      .where('orderId', '==', orderId)
      .where('scheduledAt', '>=', Timestamp.fromDate(windowStart))
      .where('scheduledAt', '<', Timestamp.fromDate(end))
      .get();
    const out = [];
    for (const doc of snap.docs) {
      if (doc.id === excludeId) continue;
      const b = doc.data();
      if (!['scheduled', 'confirmed'].includes(b.status)) continue;
      if (providerId && b.providerId === providerId) continue;
      const bs = toDate(b.scheduledAt);
      const be = toDate(b.endTime) || new Date(bs.getTime() + 2 * 3600000);
      if (!core.overlaps(start, end, bs, be)) continue;
      const row = serializeBooking(doc.id, b);
      const who = b.providerName || 'teine tegija';
      const what = row.serviceName || 'koristus';
      out.push({ ...row, label: `Selles kodus · ${who} · ${what}` });
    }
    return out;
  }

  async function slotConflicts(providerId, orderId, start, end, excludeId) {
    const own = (await findConflicts(providerId, start, end, excludeId)).map((c) => ({ ...c, label: `Sinu kalender · ${c.customerName}` }));
    const home = await findHomeConflicts(orderId, start, end, excludeId, providerId);
    return [...own, ...home];
  }

  function conflictError(conflicts) {
    const home = conflicts.some((c) => String(c.label || '').startsWith('Selles'));
    const own = conflicts.some((c) => String(c.label || '').startsWith('Sinu'));
    if (home && own) return 'See aeg kattub sinu kalendriga ja selle kodu teise visiidiga';
    if (home) return 'Sel ajal on selles kodus juba teine visiit';
    return 'Sul on samal ajal teine visiit';
  }

  function bookingBase(order, orderId, provider) {
    return {
      orderId,
      providerId: provider?.id || order.providerId || null,
      providerName: provider?.name || order.providerName || null,
      customerName: primaryName(order) || 'Klient',
      customerEmail: primaryEmail(order),
      customerPhone: order.type === 'gift' ? (order.recipient?.phone || order.customer?.phone || '') : (order.customer?.phone || ''),
      address: primaryAddress(order),
      size: order.size || 'medium',
    };
  }

  async function createVisit({ order, orderId, provider, start, durationMin, note, customerNote, source, serviceId, price, scheduleOccurrence, requestId, status = 'scheduled' }) {
    const end = new Date(start.getTime() + durationMin * 60000);
    const data = {
      ...bookingBase(order, orderId, provider),
      scheduledAt: Timestamp.fromDate(start),
      endTime: Timestamp.fromDate(end),
      status,
      kind: serviceId ? 'extra' : 'regular',
      serviceId: serviceId || null,
      price: price || null,
      note: note || '',
      customerNote: customerNote || '',
      source,
      isManualEntry: true,
      reminderSent: false,
      scheduleOccurrence: scheduleOccurrence || null,
      requestId: requestId || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (status === 'completed') data.completedAt = FieldValue.serverTimestamp();
    const ref = await db.collection('bookings').add(data);
    return { id: ref.id, ...data, scheduledAt: start, endTime: end };
  }

  // ============================================================
  // Recurring schedule sync
  // ============================================================

  /**
   * Ensure bookings exist for every schedule occurrence in the horizon.
   * Returns { created: [booking...], skipped: [{date, holiday}] }.
   */
  async function syncSchedule({ orderId, order, provider }) {
    const schedule = order.schedule;
    if (!schedule || schedule.active === false) return { created: [], skipped: [] };
    if (order.status !== 'paid' || order.pausedAt) return { created: [], skipped: [] };

    const from = todayTallinnStr(1);
    const to = todayTallinnStr(SCHEDULE_HORIZON_DAYS);
    const occurrences = core.generateOccurrences(schedule, from, to);
    if (occurrences.length === 0) return { created: [], skipped: [] };

    const existingSnap = await db.collection('bookings').where('orderId', '==', orderId).get();
    const have = new Set();
    for (const d of existingSnap.docs) {
      const b = d.data();
      // A generated occurrence blocks its date even when cancelled by hand (e.g. customer away),
      // but not when it was superseded by a schedule change — those dates must be re-filled.
      if (b.scheduleOccurrence && !(b.status === 'cancelled' && b.scheduleSuperseded)) have.add(b.scheduleOccurrence);
      // Also treat any live visit on the same Tallinn date as covering the occurrence
      if (['scheduled', 'confirmed'].includes(b.status) && b.scheduledAt) have.add(tallinnDateStr(toDate(b.scheduledAt)));
    }

    const created = [];
    const skipped = [];
    for (const dateStr of occurrences) {
      if (have.has(dateStr)) continue;
      if (core.isDateAway(order.awayPeriods, dateStr)) continue; // household away — silently skip
      const holiday = core.holidayName(dateStr);
      if (holiday) { skipped.push({ date: dateStr, holiday }); continue; }
      const start = new Date(tallinnLocalDateTimeToISOString(dateStr, schedule.time));
      const booking = await createVisit({
        order, orderId, provider, start,
        durationMin: schedule.durationMin || core.SIZE_DEFAULT_DURATION[order.size] || 180,
        note: schedule.note || '',
        source: 'schedule',
        scheduleOccurrence: dateStr,
      });
      created.push(booking);
    }
    return { created, skipped };
  }

  /**
   * Move a visit to a new start. Handles conflicts, Cal.com-linked visits,
   * reminder reset and customer notification. Returns { updated } or { error, status, ... }.
   */
  async function rescheduleVisit({ provider, ref, booking, order, start, durationMin, note, force, notify = true, by = 'provider' }) {
    if (!['scheduled', 'confirmed'].includes(booking.status)) return { error: 'Seda visiiti ei saa enam muuta', status: 400 };
    if (start < new Date()) return { error: 'Uus aeg on möödas', status: 400 };
    const oldStart = toDate(booking.scheduledAt);
    const oldEnd = toDate(booking.endTime);
    const dur = Number.isInteger(Number(durationMin)) && Number(durationMin) >= 15
      ? Math.min(600, Number(durationMin))
      : (oldStart && oldEnd ? Math.round((oldEnd - oldStart) / 60000) : 180);
    const end = new Date(start.getTime() + dur * 60000);

    const conflicts = await slotConflicts(provider.id, booking.orderId, start, end, ref.id);
    if (conflicts.length && !force) return { error: conflictError(conflicts), code: 'CONFLICT', conflicts, status: 409 };

    // Cal.com-linked visits: move the Cal booking too so the operator calendar stays truthful
    let calUpdate = {};
    if (booking.calBookingUid) {
      try {
        await calService.cancelBooking(booking.calBookingUid, 'Rescheduled by provider');
        const slug = booking.eventTypeSlug || calService.EVENT_TYPE_SLUGS[booking.size] || 'koristus-90';
        const nb = await calService.createBooking(slug, start.toISOString(), {
          name: booking.customerName || primaryName(order) || 'Klient', email: booking.customerEmail || primaryEmail(order),
          phone: booking.customerPhone || '', address: booking.address || '',
        }, { source: 'sukoda-haldus', orderId: booking.orderId, bookingId: ref.id });
        calUpdate = { calBookingUid: nb?.uid || null, calBookingId: nb?.id || null };
      } catch (e) {
        console.error('Cal.com reschedule failed (continuing with Firestore only):', e);
        calUpdate = { calSyncError: String(e.message || e).slice(0, 300) };
      }
    }

    const reminderReset = start.getTime() - Date.now() > 48 * 3600000;
    await ref.update({
      scheduledAt: Timestamp.fromDate(start),
      endTime: Timestamp.fromDate(end),
      previousScheduledAt: booking.scheduledAt || null,
      rescheduledAt: FieldValue.serverTimestamp(),
      rescheduledBy: by,
      providerId: provider.id,
      providerName: provider.name || null,
      status: 'scheduled',
      ...(reminderReset ? { reminderSent: false } : {}),
      ...(note != null ? { note: str(note, 500) } : {}),
      ...calUpdate,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updated = { ...booking, scheduledAt: start, endTime: end, providerId: provider.id, providerName: provider.name || null, status: 'scheduled' };
    if (notify) await sendVisitNotification('rescheduled', { order, booking: updated, provider, oldStart });
    return { updated };
  }

  async function upcomingBookingsForOrder(orderId) {
    const snap = await db.collection('bookings')
      .where('orderId', '==', orderId)
      .where('scheduledAt', '>', Timestamp.fromDate(new Date()))
      .orderBy('scheduledAt', 'asc')
      .get();
    return snap.docs
      .filter((d) => ['scheduled', 'confirmed'].includes(d.data().status))
      .map((d) => ({ id: d.id, ...d.data() }));
  }

  // ============================================================
  // Away periods ("oleme eemal")
  // ============================================================

  /**
   * Save an away period: cancel live visits inside it (Cal-linked ones too), keep the
   * schedule from refilling those dates, tell the household and (if the customer did it) the provider.
   * `by` is 'customer' | 'provider'. Returns { period, cancelled } or { error, status }.
   */
  async function addAwayPeriod({ orderRef, order, input, provider, by }) {
    const s = core.sanitizeAwayPeriod(input, todayTallinnStr(0), order.awayPeriods);
    if (s.error) return { error: s.error, status: 400 };
    const period = { ...s.period, createdBy: by, createdAt: Timestamp.fromDate(new Date()) };

    const upcoming = await upcomingBookingsForOrder(orderRef.id);
    const inPeriod = upcoming.filter((b) => { const d = tallinnDateStr(toDate(b.scheduledAt)); return period.from <= d && d <= period.to; });
    // Only the housekeeper's regular visits are cancelled. A separately agreed partner visit (a warranty call, the
    // handyman) stays: the household moves it itself, and its provider is not the one we notify here.
    const isOwnRegular = (b) => (b.kind || (b.serviceId ? 'extra' : 'regular')) !== 'extra' && (!b.providerId || !order.providerId || b.providerId === order.providerId);
    const inRange = inPeriod.filter(isOwnRegular);
    const kept = inPeriod.filter((b) => !isOwnRegular(b));
    for (const b of inRange) {
      if (b.calBookingUid) {
        try { await calService.cancelBooking(b.calBookingUid, 'Customer away'); } catch (e) { console.error('Cal.com cancel failed:', e); }
      }
      await db.collection('bookings').doc(b.id).update({
        status: 'cancelled', cancelReason: 'Klient eemal', cancelledBy: by, awayPeriodId: period.id,
        cancelledAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      if (b.requestId) {
        await db.collection('serviceRequests').doc(b.requestId).set({ status: 'cancelled', cancelReason: 'Klient eemal', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    }

    const awayPeriods = [...(order.awayPeriods || []), period];
    await orderRef.update({ awayPeriods, updatedAt: FieldValue.serverTimestamp() });

    const lang = langOf(order);
    const providerName = provider?.name || order.providerName || null;
    await notifyOrder(order, awayCustomerEmail({ order, period, cancelled: inRange, providerName, lang, by }), { replyTo: providerReplyTo(provider) });
    if (by === 'customer' && provider) {
      await sendEmail({ to: providerReplyTo(provider) || provider.email, ...awayProviderEmail({ provider, order, period, cancelled: inRange }) });
    }
    return { period: serializeAwayPeriod(period), cancelled: inRange.map((b) => serializeBooking(b.id, b)), kept: kept.map((b) => serializeBooking(b.id, b)) };
  }

  /**
   * Remove an away period: restore the visits it cancelled (still in the future, not Cal-linked),
   * refill the schedule, notify household (+ provider if the customer did it).
   */
  async function removeAwayPeriod({ orderRef, order, periodId, provider, by }) {
    const period = (order.awayPeriods || []).find((p) => p.id === periodId);
    if (!period) return { error: 'Eemalolekut ei leitud', status: 404 };
    const awayPeriods = (order.awayPeriods || []).filter((p) => p.id !== periodId);
    await orderRef.update({ awayPeriods, updatedAt: FieldValue.serverTimestamp() });

    const snap = await db.collection('bookings').where('orderId', '==', orderRef.id).where('awayPeriodId', '==', periodId).get();
    const now = new Date();
    let restored = 0;
    for (const d of snap.docs) {
      const b = d.data();
      if (b.status !== 'cancelled') continue;
      if (b.calBookingUid || toDate(b.scheduledAt) <= now) {
        // Can't silently re-book Cal.com slots; let the schedule refill instead
        if (b.scheduleOccurrence) await d.ref.update({ scheduleSuperseded: true, updatedAt: FieldValue.serverTimestamp() });
        continue;
      }
      await d.ref.update({
        status: 'scheduled', cancelReason: FieldValue.delete(), cancelledBy: FieldValue.delete(), cancelledAt: FieldValue.delete(), awayPeriodId: FieldValue.delete(),
        reminderSent: false, updatedAt: FieldValue.serverTimestamp(),
      });
      restored += 1;
    }

    const fresh = { ...order, awayPeriods };
    let created = [];
    if (fresh.schedule?.active !== false && fresh.schedule) {
      const r = await syncSchedule({ orderId: orderRef.id, order: fresh, provider });
      created = r.created;
    }

    const lang = langOf(order);
    const providerName = provider?.name || order.providerName || null;
    const upcoming = await upcomingBookingsForOrder(orderRef.id);
    const tt = t(lang);
    const mail = upcoming.length
      ? (() => { const m = scheduleEmail({ order: fresh, bookings: upcoming, providerName, lang }); return { subject: tt.subjAwayRemoved, html: m.html.replace(escapeHtml(tt.scheduleTitle), escapeHtml(tt.awayRemovedTitle)).replace(escapeHtml(tt.scheduleIntro(providerName)), escapeHtml(tt.awayRemovedIntro(providerName))) }; })()
      : { subject: tt.subjAwayRemoved, html: wrap(H2(tt.awayRemovedTitle) + P(`${tt.hello(escapeHtml(firstName(primaryName(order))))} ${escapeHtml(tt.awayRemovedIntro(providerName))}`) + portalBlock(lang), lang) };
    await notifyOrder(fresh, mail, { replyTo: providerReplyTo(provider) });
    if (by === 'customer' && provider) {
      await sendEmail({ to: providerReplyTo(provider) || provider.email, ...awayProviderEmail({ provider, order, period, removed: true }) });
    }
    return { restored, created: created.length, awayPeriods: awayPeriods.map(serializeAwayPeriod) };
  }

  function serializeAwayPeriod(p) {
    return { id: p.id, from: p.from, to: p.to, note: p.note || '', createdBy: p.createdBy || 'customer', createdAt: tsToIso(p.createdAt) };
  }

  /** Not-yet-ended periods, soonest first — the only ones worth showing */
  function liveAway(order) {
    return core.liveAwayPeriods(order.awayPeriods, todayTallinnStr(0)).map(serializeAwayPeriod);
  }

  // ============================================================
  // Provider auth
  // ============================================================

  async function authenticateProvider(req) {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    if (!token || token.length < 32) return null;
    const snap = await db.collection('providers').where('sessionTokenHash', '==', sha256(token)).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const provider = doc.data();
    if (provider.status === 'disabled') return null;
    const exp = toDate(provider.sessionTokenExpiresAt);
    if (exp && exp < new Date()) return null;
    return { id: doc.id, ...provider };
  }

  async function issueProviderToken(providerRef) {
    const { raw, hash } = newToken();
    const exp = new Date();
    exp.setDate(exp.getDate() + TOKEN_DAYS);
    await providerRef.update({ sessionTokenHash: hash, sessionTokenExpiresAt: Timestamp.fromDate(exp) });
    return raw;
  }

  async function issueClientToken(orderRef, days = TOKEN_DAYS) {
    const { raw, hash } = newToken();
    const exp = new Date();
    exp.setDate(exp.getDate() + days);
    await orderRef.update({ sessionTokenHash: hash, sessionTokenExpiresAt: Timestamp.fromDate(exp) });
    return `${PORTAL_URL}?token=${raw}`;
  }

  async function sendProviderMagicLink(providerDoc) {
    const raw = await issueProviderToken(providerDoc.ref);
    const url = `${HALDUS_URL}?token=${raw}`;
    await sendEmail({ to: providerDoc.data().email, ...providerMagicLinkEmail(url) });
    return url;
  }

  function serializeProvider(p) {
    return {
      id: p.id,
      name: p.name || '',
      contactName: p.contactName || '',
      businessName: p.businessName || '',
      email: p.email || '',
      phone: p.phone || '',
      notifyEmail: p.notifyEmail || p.email || '',
      services: Array.isArray(p.services) && p.services.length ? p.services : ['cleaning'],
      status: p.status || 'active',
      plan: core.effectivePlan(p),
      createdAt: tsToIso(p.createdAt),
      lastLoginAt: tsToIso(p.lastLoginAt),
    };
  }

  // ============================================================
  // Provider data access
  // ============================================================

  /** Plain-JSON schedule (Firestore Timestamp → ISO) */
  function serializeSchedule(s) {
    if (!s) return null;
    return { ...s, updatedAt: tsToIso(s.updatedAt) };
  }

  /** The partner's private notes on a home: per-provider map, falling back to the legacy shared field for the housekeeper */
  function providerNotesFor(o, providerId, role) {
    const by = o.providerNotesBy && typeof o.providerNotesBy === 'object' ? o.providerNotesBy : {};
    if (providerId && typeof by[providerId] === 'string') return by[providerId];
    return role === 'cleaning' ? (o.providerNotes || '') : '';
  }

  function serializeCustomer(id, o, role, providerId = null) {
    const cleaning = role === 'cleaning';
    const hp = o.homeProfile || null;
    return {
      id,
      role, // 'cleaning' | 'flowers' | 'warranty' | 'handyman' | ...
      canEditHome: cleaning || (!!providerId && o.providerId === providerId),
      name: primaryName(o) || (o.customer?.name || ''),
      email: primaryEmail(o),
      phone: o.type === 'gift' ? (o.recipient?.phone || o.customer?.phone || '') : (o.customer?.phone || ''),
      address: primaryAddress(o),
      additionalInfo: o.customer?.additionalInfo || '',
      size: o.size || 'medium',
      package: o.package || null,
      type: o.type,
      source: o.source || 'stripe',
      status: o.status,
      subscriptionStatus: o.subscriptionStatus || null,
      pausedAt: tsToIso(o.pausedAt),
      contacts: Array.isArray(o.contacts) ? o.contacts : [],
      schedule: serializeSchedule(o.schedule),
      awayPeriods: liveAway(o),
      // Other roles only see what they need to get in and work safely; household preferences stay with the housekeeper
      homeProfile: hp ? {
        access: hp.access || '', pets: hp.pets || '', allergies: hp.allergies || '',
        ...(cleaning ? { flowerPreference: hp.flowerPreference || '', linens: hp.linens || '', towels: hp.towels || '' } : {}),
        specialRequests: hp.specialRequests || '',
      } : null,
      providerNotes: providerNotesFor(o, providerId, role),
      // What this home's deal includes per category — the provider should never be surprised by “but it's included”
      terms: o.terms ? (cleaning ? o.terms : (o.terms[role] ? { [role]: o.terms[role] } : null)) : null,
      brand: o.brand?.name ? { name: o.brand.name, project: o.brand.project || '' } : null,
      floorPlan: /^https:\/\//.test(String(o.floorPlan || '')) ? String(o.floorPlan) : null,
      maintenance: cleaning ? serializeMaintenanceForProvider(o) : null,
      // Part of the partner's service standard: flowers ordered automatically before each visit
      flowers: cleaning || role === 'flowers'
        ? { auto: o.flowers?.auto === true, leadDays: FLOWER_LEAD_DAYS.includes(o.flowers?.leadDays) ? o.flowers.leadDays : 2, floristId: o.floristId || null, budget: o.flowers?.budget || '', note: o.flowers?.note || '' }
        : null,
      lang: langOf(o),
      createdAt: tsToIso(o.createdAt),
      totalVisits: o.totalVisits || 0,
    };
  }

  /** Lower-cased contact e-mails, kept flat on the order so household members can log in (array-contains) */
  function contactEmailsOf(contacts) {
    return [...new Set((contacts || []).map((c) => core.normalizeEmail(c.email)).filter(Boolean))];
  }

  /** Florist for a home: set on the order, else the cleaning partner's default */
  function floristIdFor(order, provider) {
    return order?.floristId || provider?.defaultFloristId || null;
  }

  /** Every home where this provider holds a role; role = category (cleaning first, so the housekeeper's role wins). */
  async function loadProviderOrders(providerId) {
    const cats = Object.entries(core.SERVICE_CATEGORIES);
    const snaps = await Promise.all(cats.map(([, def]) => db.collection('orders').where(def.orderField, '==', providerId).get()));
    const map = new Map();
    cats.forEach(([cat], i) => {
      for (const d of snaps[i].docs) if (!map.has(d.id)) map.set(d.id, { doc: d, role: cat });
    });
    return [...map.values()];
  }

  /** Verify the provider may act on this order. Returns { ref, order, role } or null. */
  async function accessOrder(provider, orderId) {
    if (!orderId) return null;
    const ref = db.collection('orders').doc(String(orderId));
    const doc = await ref.get();
    if (!doc.exists) return null;
    const order = doc.data();
    for (const [cat, def] of Object.entries(core.SERVICE_CATEGORIES)) {
      if (order[def.orderField] === provider.id) return { ref, order, role: cat };
    }
    return null;
  }

  async function accessBooking(provider, bookingId) {
    if (!bookingId) return null;
    const ref = db.collection('bookings').doc(String(bookingId));
    const doc = await ref.get();
    if (!doc.exists) return null;
    const booking = doc.data();
    const acc = await accessOrder(provider, booking.orderId);
    if (!acc) return null;
    // Strictly the booking's own partner; legacy bookings without providerId belong to the housekeeper only
    if (booking.providerId ? booking.providerId !== provider.id : acc.role !== 'cleaning') return null;
    // NB: spread first — `ref` must be the booking ref, not the order ref from accessOrder
    return { ...acc, orderRef: acc.ref, ref, booking };
  }

  /** Display name for a request: catalogue service or the special "reschedule" type */
  function requestName(r, lang) {
    if (r.type === 'reschedule') return core.pick({ et: 'Aja muutmine', en: 'Reschedule visit', ru: 'Перенос визита' }, lang);
    return core.serviceName(r.serviceId, lang);
  }

  function serializeRequest(id, r) {
    return {
      id,
      type: r.type || 'service',
      orderId: r.orderId,
      providerId: r.providerId || null,
      customerName: r.customerName || '',
      customerEmail: r.customerEmail || '',
      customerPhone: r.customerPhone || '',
      address: r.address || '',
      serviceId: r.serviceId || null,
      serviceName: requestName(r, 'et'),
      serviceNameEn: requestName(r, 'en'),
      targetBookingId: r.targetBookingId || null,
      targetScheduledAt: tsToIso(r.targetScheduledAt),
      category: r.category,
      kind: r.type === 'reschedule' ? 'visit' : core.serviceKind(r.serviceId),
      preferredDate: r.preferredDate || null,
      timeWindow: r.timeWindow || null,
      note: r.note || '',
      status: r.status,
      // For declined requests: 'not_covered' (issue reviewed, not under warranty) or 'new_time' (slot did not fit)
      outcome: r.outcome || null,
      price: r.price || null,
      providerMessage: r.providerMessage || '',
      bookingId: r.bookingId || null,
      scheduledAt: tsToIso(r.scheduledAt),
      createdAt: tsToIso(r.createdAt),
      confirmedAt: tsToIso(r.confirmedAt),
      answeredAt: tsToIso(r.answeredAt),
      completedAt: tsToIso(r.completedAt),
      declinedAt: tsToIso(r.declinedAt),
      cancelledAt: tsToIso(r.cancelledAt),
      providerName: r.providerName || null,
      access: r.access || '',
      urgent: r.urgent === true,
      // The conversation stays with the request — e-mail only notifies
      messages: (Array.isArray(r.messages) ? r.messages : []).map((m) => ({ id: m.id, by: m.by, name: m.name || '', text: m.text || '', at: tsToIso(m.at) || m.at || null })),
    };
  }

  /** Append one message to a request's thread; returns the stored message */
  async function appendRequestMessage(reqRef, { by, name, text }) {
    const msg = { id: core.randomId ? core.randomId() : Math.random().toString(36).slice(2, 10), by, name: String(name || '').slice(0, 120), text: String(text || '').trim().slice(0, 1500), at: new Date() };
    await reqRef.update({ messages: FieldValue.arrayUnion(msg), updatedAt: FieldValue.serverTimestamp() });
    return msg;
  }

  function requestMessageEmail({ toSide, order, request, requestId, fromName, text, lang }) {
    const svc = requestName(request, lang);
    const title = core.pick({ et: `Uus sõnum: ${svc}`, en: `New message: ${svc}`, ru: `Новое сообщение: ${svc}` }, lang);
    if (toSide === 'provider') {
      return {
        subject: `SUKODA | Sõnum: ${requestName(request, 'et')} — ${primaryName(order) || primaryEmail(order)}`,
        html: providerWrap('Klient kirjutas', `${escapeHtml(fromName || primaryName(order) || 'Klient')} lisas pöördumisele „${escapeHtml(requestName(request, 'et'))}“ sõnumi. Vasta töölaual — vastus jõuab kliendile portaali ja e-postiga.`,
          `<div style="background:#FFFFFF;padding:20px 24px;border-left:2px solid #B8976A;margin:16px 0;font-size:14px;line-height:1.6;color:#2C2824;">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`,
          { href: `${HALDUS_URL}?tab=requests`, label: 'AVA TÖÖLAUD' }),
      };
    }
    const tt = t(lang);
    const who = fromName || core.pick({ et: 'Meeskond', en: 'The team', ru: 'Команда' }, lang);
    const wrote = core.pick({
      et: `${who} kirjutas sinu pöördumisele.`,
      en: `${who} wrote on your request.`,
      ru: `${who} пишет по вашему обращению.`,
    }, lang);
    const html = wrap(
      H2(title) + P(`${tt.hello(escapeHtml(firstName(primaryName(order))))} ${escapeHtml(wrote)}`)
      + `<div style="background:#FFFFFF;padding:28px;margin-bottom:28px;border-left:2px solid #B8976A;">
          ${LABEL(tt.service)}
          <p style="margin:0 0 16px;font-weight:300;color:#2C2824;font-size:20px;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(svc)}</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#2C2824;">${escapeHtml(text).replace(/\n/g, '<br>')}</p>
        </div>`
      + P(core.pick({ et: 'Ära vasta sellele kirjale. Kirjuta portaalis.', en: 'Do not reply to this e-mail. Write in the portal.', ru: 'Не отвечайте на это письмо. Напишите в портале.' }, lang), 'font-size:13px;color:#6B6560;')
      + portalBlock(lang, requestUrl(requestId)),
      lang,
      brandOf(order),
    );
    return {
      subject: core.pick({ et: `SUKODA | Sõnum: ${svc}`, en: `SUKODA | Message: ${svc}`, ru: `SUKODA | Сообщение: ${svc}` }, lang),
      html,
      push: push.message({ type: 'request_status', lang, title, body: wrote, url: requestUrl(requestId) }),
    };
  }

  // ============================================================
  // /api/haldus/** — provider portal API
  // ============================================================

  // ============================================================
  // Provider billing — plans on the desk, Stripe subscription behind them
  // ============================================================

  function activeHomeCount(orders) {
    return orders.filter(({ doc }) => ['paid', 'cancelling'].includes(doc.data().status)).length;
  }

  function billingView(provider, homes) {
    const plan = core.effectivePlan(provider);
    const limit = core.planLimit(plan);
    return {
      plan,
      planName: core.PROVIDER_PLANS[plan].name,
      // Contracted partners (set up by SUKODA): no cap, no self-serve billing, no invite cards on the desk
      enterprise: plan === 'enterprise',
      homes,
      limit: limit === Infinity ? null : limit,
      status: provider.planStatus || null,
      periodEnd: tsToIso(provider.planPeriodEnd),
      cancelAtPeriodEnd: !!provider.planCancelAtPeriodEnd,
      hasSubscription: !!provider.planSubscriptionId && core.PLAN_ACTIVE_STATUSES.includes(provider.planStatus),
      plans: core.SELF_SERVE_PLANS.map((id) => core.PROVIDER_PLANS[id]).map((p) => ({ id: p.id, name: p.name, price: p.price, homes: p.homes, blurb: p.blurb.et })),
    };
  }

  async function ensureStripeCustomer(provider) {
    if (provider.stripeCustomerId) return provider.stripeCustomerId;
    const customer = await getStripe().customers.create({
      email: provider.email, name: provider.businessName || provider.name,
      metadata: { providerId: provider.id, kind: 'provider' },
    });
    await db.collection('providers').doc(provider.id).update({ stripeCustomerId: customer.id });
    return customer.id;
  }

  /** Price by lookup key; created on first use so the catalogue in code is the source of truth */
  async function ensurePlanPrice(planId) {
    const plan = core.PROVIDER_PLANS[planId];
    if (!plan || !plan.lookupKey) throw new Error('Not a paid plan');
    const stripe = getStripe();
    const found = await stripe.prices.list({ lookup_keys: [plan.lookupKey], active: true, limit: 1 });
    if (found.data[0]) return found.data[0];
    const product = await stripe.products.create({ name: `SUKODA Töölaud · ${plan.name}`, description: plan.blurb.et, metadata: { kind: 'provider_plan', plan: plan.id } });
    return stripe.prices.create({
      product: product.id, currency: 'eur', unit_amount: plan.price * 100, recurring: { interval: 'month' },
      lookup_key: plan.lookupKey, transfer_lookup_key: true, metadata: { plan: plan.id },
    });
  }

  function subscriptionPlanId(sub) {
    const key = sub?.items?.data?.[0]?.price?.lookup_key;
    return core.planByLookupKey(key)?.id || sub?.metadata?.plan || 'free';
  }

  function subscriptionFields(sub) {
    return {
      planSubscriptionId: sub.id,
      planStatus: sub.status,
      planPeriodEnd: sub.current_period_end ? Timestamp.fromMillis(sub.current_period_end * 1000) : null,
      planCancelAtPeriodEnd: !!sub.cancel_at_period_end,
    };
  }

  function planActivatedEmail({ provider, plan }) {
    const p = core.PROVIDER_PLANS[plan];
    return {
      subject: `SUKODA | Pakett ${p.name} on aktiivne`,
      html: wrap(
        H2(`Pakett ${p.name}`)
        + P(`${escapeHtml(provider.name)}, sinu töölaual on nüüd pakett <strong style="color:#2C2824;font-weight:normal;">${p.name}</strong> — ${p.price} €/kuus, ${p.homes ? `kuni ${p.homes} kodu` : 'piiramatult kodusid'}. Arve tuleb igal kuul e-postile; tühistada saad igal ajal töölaual, muutus jõustub perioodi lõpus.`)
        + `<div style="text-align:center;margin:32px 0;"><a href="${HALDUS_URL}?tab=account" style="display:inline-block;background:#2C2824;color:#FAF8F5;padding:16px 36px;text-decoration:none;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">Ava töölaud</a></div>`,
        'et',
      ),
    };
  }

  function planEndedEmail({ provider }) {
    return {
      subject: 'SUKODA | Pakett lõppes — töölaud on tasuta paketis',
      html: wrap(
        H2('Tasuta pakett')
        + P(`${escapeHtml(provider.name)}, sinu tasuline pakett on lõppenud ja töölaud on nüüd tasuta paketis: kuni ${core.PROVIDER_PLANS.free.homes} kodu. Olemasolevad kliendid, ajad ja andmed jäävad alles — uusi kodusid saad lisada, kui neid on alla piiri või valid paketi uuesti.`)
        + `<div style="text-align:center;margin:32px 0;"><a href="${HALDUS_URL}?tab=account" style="display:inline-block;background:#2C2824;color:#FAF8F5;padding:16px 36px;text-decoration:none;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">Ava töölaud</a></div>`,
        'et',
      ),
    };
  }

  function planInvoiceEmail({ provider, invoice }) {
    const amount = (invoice.amount_paid / 100).toFixed(2).replace('.', ',');
    return {
      subject: `SUKODA | Arve ${invoice.number || ''} · ${amount} €`,
      html: wrap(
        H2('Arve tasutud')
        + P(`${escapeHtml(provider.name)}, SUKODA Töölaua kuumakse ${amount} € on tasutud. Arve raamatupidamisele on siin.`)
        + `<div style="text-align:center;margin:32px 0;">${invoice.invoice_pdf ? `<a href="${invoice.invoice_pdf}" style="display:inline-block;background:#2C2824;color:#FAF8F5;padding:16px 36px;text-decoration:none;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">Laadi arve (PDF)</a>` : ''}${invoice.hosted_invoice_url ? `<p style="margin:16px 0 0 0;"><a href="${invoice.hosted_invoice_url}" style="color:#B8976A;font-size:13px;">Vaata arvet veebis</a></p>` : ''}</div>`,
        'et',
      ),
    };
  }

  async function providerBySubscription(sub) {
    if (sub?.metadata?.providerId) {
      const d = await db.collection('providers').doc(sub.metadata.providerId).get();
      if (d.exists) return { id: d.id, ...d.data() };
    }
    const snap = await db.collection('providers').where('planSubscriptionId', '==', sub.id).limit(1).get();
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  }

  const billing = {
    /** Stripe Checkout finished: the plan is live from this moment */
    async onCheckoutComplete(session) {
      const providerId = session.metadata?.providerId;
      if (!providerId) return;
      const ref = db.collection('providers').doc(providerId);
      const doc = await ref.get();
      if (!doc.exists) return;
      const sub = await getStripe().subscriptions.retrieve(session.subscription);
      const plan = subscriptionPlanId(sub) === 'free' ? (session.metadata.plan || 'pro') : subscriptionPlanId(sub);
      await ref.update({ plan, stripeCustomerId: session.customer, ...subscriptionFields(sub), updatedAt: FieldValue.serverTimestamp() });
      const provider = { id: doc.id, ...doc.data() };
      try { await sendEmail({ to: providerReplyTo(provider) || provider.email, ...planActivatedEmail({ provider, plan }) }); } catch (e) { console.error('plan mail failed', e); }
    },
    /** Any change on the subscription (renewal, cancel scheduled, payment failed, deleted) */
    async onSubscriptionUpdate(sub) {
      const provider = await providerBySubscription(sub);
      if (!provider) return;
      const ref = db.collection('providers').doc(provider.id);
      if (sub.status === 'canceled' || sub.status === 'incomplete_expired' || sub.status === 'unpaid') {
        await ref.update({ plan: 'free', planStatus: sub.status, planCancelAtPeriodEnd: false, planSubscriptionId: null, updatedAt: FieldValue.serverTimestamp() });
        if (core.PLAN_ACTIVE_STATUSES.includes(provider.planStatus)) {
          try { await sendEmail({ to: providerReplyTo(provider) || provider.email, ...planEndedEmail({ provider }) }); } catch (e) { console.error('plan ended mail failed', e); }
        }
        return;
      }
      await ref.update({ plan: subscriptionPlanId(sub), ...subscriptionFields(sub), updatedAt: FieldValue.serverTimestamp() });
    },
    /** Monthly invoice paid: the provider gets the PDF for bookkeeping */
    async onInvoicePaid(invoice) {
      if (!invoice.subscription) return false;
      const snap = await db.collection('providers').where('planSubscriptionId', '==', invoice.subscription).limit(1).get();
      if (snap.empty) return false;
      const provider = { id: snap.docs[0].id, ...snap.docs[0].data() };
      try { await sendEmail({ to: providerReplyTo(provider) || provider.email, ...planInvoiceEmail({ provider, invoice }) }); } catch (e) { console.error('invoice mail failed', e); }
      return true;
    },
  };

  // ============================================================
  // Creating a home under a provider — shared by the desk (POST /customers)
  // and the invitation-card flow (/api/lunasta/redeem)
  // ============================================================

  /** Validation / business error with an HTTP status; handlers turn it into a response */
  class HomeError extends Error {
    constructor(status, body) {
      super(body.error || 'Home error');
      this.status = status;
      this.body = body;
    }
  }

  /**
   * Create a provider-billed home (order) exactly like the desk does: validate, guard duplicates,
   * write the order, send the welcome mail with a portal link, sync the schedule (if any) and tell the
   * operator. `enforcePlanCap: false` skips the plan limit (an invitation card is the provider's own invite).
   * Throws HomeError for expected failures.
   */
  async function createHome({ provider, input, createdBy, sendWelcome = true, enforcePlanCap = true, source = 'manual', extraFields = {}, operatorSubject, operatorIntro }) {
    const b = input || {};
    const name = str(b.name, 200);
    const email = core.normalizeEmail(b.email);
    const phone = str(b.phone, 40);
    const address = str(b.address, 500);
    const size = core.ORDER_SIZES.includes(b.size) ? b.size : 'medium';
    const lang = b.lang === 'en' ? 'en' : 'et';
    if (!name) throw new HomeError(400, { error: 'Nimi on kohustuslik' });
    if (!core.isValidEmail(email)) throw new HomeError(400, { error: 'Korrektne e-post on kohustuslik' });
    if (!address) throw new HomeError(400, { error: 'Aadress on kohustuslik' });

    // Plan cap: stated up front, enforced here, nowhere else
    if (enforcePlanCap) {
      const plan = core.effectivePlan(provider);
      const limit = core.planLimit(plan);
      const homes = activeHomeCount(await loadProviderOrders(provider.id));
      if (homes >= limit) {
        throw new HomeError(402, { error: `Paketis „${core.PROVIDER_PLANS[plan].name}“ on kuni ${limit} kodu. Vali suurem pakett, et lisada rohkem.`, upgrade: true, plan, limit, homes });
      }
    }

    const contactsRes = core.sanitizeContacts(b.contacts);
    if (contactsRes.error) throw new HomeError(400, { error: contactsRes.error });
    const contacts = contactsRes.contacts.filter((c) => c.email !== email);

    let schedule = null;
    if (b.schedule && b.schedule.frequency) {
      const s = core.sanitizeSchedule(b.schedule);
      if (s.error) throw new HomeError(400, { error: s.error });
      schedule = s.schedule;
    }

    // Duplicate guard: same email already active somewhere
    const dupSnap = await db.collection('orders')
      .where('customer.email', '==', email)
      .where('status', 'in', ['paid', 'cancelling'])
      .limit(3)
      .get();
    const mine = dupSnap.docs.find((d) => d.data().providerId === provider.id);
    if (mine) throw new HomeError(409, { error: 'See klient on juba sinu nimekirjas', code: 'ALREADY_MINE', orderId: mine.id });
    if (!dupSnap.empty && !b.force) {
      throw new HomeError(409, {
        error: 'Sellel e-postil on juba SUKODA tellimus. Kui oled kindel, et see on uus klient, salvesta uuesti kinnitusega.',
        code: 'EXISTING_ORDER',
      });
    }

    const now = new Date();
    const orderData = {
      type: 'subscription',
      source,
      billing: 'provider',
      status: 'paid',
      subscriptionStatus: 'active',
      package: schedule ? (core.FREQUENCY_TO_PACKAGE[schedule.frequency] || 'custom') : 'custom',
      size,
      lang,
      customer: { name, email, phone, address, additionalInfo: str(b.additionalInfo, 1000) },
      contacts, contactEmails: contactEmailsOf(contacts),
      providerId: provider.id,
      providerName: provider.name || '',
      providerNotes: str(b.providerNotes, 1000),
      schedule,
      homeProfile: b.homeProfile && typeof b.homeProfile === 'object' ? {
        access: str(b.homeProfile.access, 500), pets: str(b.homeProfile.pets, 300), allergies: str(b.homeProfile.allergies, 300),
        flowerPreference: str(b.homeProfile.flowerPreference, 300), linens: str(b.homeProfile.linens, 300), towels: str(b.homeProfile.towels, 300),
        specialRequests: str(b.homeProfile.specialRequests, 500), updatedAt: Timestamp.fromDate(now),
      } : null,
      totalVisits: 0,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdBy,
      createdAt: Timestamp.fromDate(now),
      paidAt: Timestamp.fromDate(now), // manual orders: "started at" — required by portal magic-link ordering
      updatedAt: Timestamp.fromDate(now),
      ...extraFields,
    };
    const ref = await db.collection('orders').add(orderData);
    const orderId = ref.id;

    // Welcome + portal access for the customer
    let welcomeSent = false;
    let portalUrl = null;
    if (sendWelcome) {
      try {
        portalUrl = await issueClientToken(ref);
        await sendEmail({ to: email, ...welcomeEmail({ order: orderData, providerName: provider.name, portalUrl, lang }), replyTo: providerReplyTo(provider) });
        welcomeSent = true;
      } catch (e) {
        console.error('Welcome email failed (non-fatal):', e);
      }
    }

    // Generate schedule occurrences + one summary email
    let created = [];
    let skipped = [];
    if (schedule) {
      const r = await syncSchedule({ orderId, order: orderData, provider });
      created = r.created; skipped = r.skipped;
      if (created.length) {
        await notifyOrder(orderData, scheduleEmail({ order: orderData, bookings: created, providerName: provider.name, lang }), { replyTo: PORTAL_REPLY_TO });
      }
    }

    // Keep the operator informed
    await sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: operatorSubject || `SUKODA | Teenusepakkuja lisas kliendi: ${name}`,
      html: `<p>${operatorIntro || `${escapeHtml(provider.name)} (${escapeHtml(provider.email)}) lisas haldusesse uue kliendi.`}</p><p><strong>${escapeHtml(name)}</strong> · ${escapeHtml(email)} · ${escapeHtml(address)}</p><p>Graafik: ${schedule ? `${schedule.frequency}, ${schedule.time}` : 'puudub'} · Loodud visiite: ${created.length}</p><p>Tellimus: ${orderId}</p>`,
    });

    return { ref, orderId, orderData, created, skipped, welcomeSent, portalUrl };
  }

  // ============================================================
  // Invitation cards (kutsekaardid) — the printed physical cards, re-purposed:
  // the operator assigns codes to a provider; a homeowner enters the code at
  // /lunasta and lands under that provider. Card docs live in `orders`
  // (physicalCard: true, giftCode) as written by generatePhysicalGiftCards.
  // ============================================================

  const MAX_CARDS_PER_ASSIGN = 100;

  /** Upper-case, 0→O / 1→I like the old gift flow; price prefix (SK219-) keeps its digits */
  function normalizeCardCode(raw) {
    const code = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
    const m = code.match(/^(SK\d+-)([\S]+)$/);
    if (m) return m[1] + m[2].replace(/0/g, 'O').replace(/1/g, 'I');
    return code.replace(/0/g, 'O').replace(/1/g, 'I');
  }

  function isPhysicalCard(o) {
    return !!(o && o.type === 'gift' && (o.physicalCard === true || o.kind === 'invite'));
  }

  /** 'used' | 'assigned' | 'free' for a physical card doc */
  function cardState(o) {
    if (o.usedAt || o.giftRedeemed) return 'used';
    if (o.assignedProviderId) return 'assigned';
    return 'free';
  }

  function serializeCard(id, o) {
    const state = cardState(o);
    return {
      id,
      code: o.giftCode,
      status: state === 'used' ? 'used' : 'free',
      assignedProviderId: o.assignedProviderId || null,
      assignedAt: tsToIso(o.assignedAt),
      usedAt: tsToIso(o.usedAt),
      usedOrderId: o.usedOrderId || null,
      usedByName: o.usedByName || '',
    };
  }

  async function findCardByCode(code) {
    if (!code) return null;
    const snap = await db.collection('orders').where('giftCode', '==', code).limit(1).get();
    if (snap.empty) return null;
    return { ref: snap.docs[0].ref, id: snap.docs[0].id, card: snap.docs[0].data() };
  }

  /** All printed cards; small collection (a few hundred at most), filtered in code */
  async function loadPhysicalCards() {
    const snap = await db.collection('orders').where('physicalCard', '==', true).get();
    return snap.docs.map((d) => ({ id: d.id, ref: d.ref, card: d.data() }));
  }

  async function loadProviderCards(providerId) {
    const snap = await db.collection('orders').where('assignedProviderId', '==', providerId).get();
    return snap.docs
      .filter((d) => isPhysicalCard(d.data()))
      .map((d) => serializeCard(d.id, d.data()))
      .sort((a, b) => (a.status === b.status ? (a.code < b.code ? -1 : 1) : a.status === 'free' ? -1 : 1));
  }

  /** Assign printed cards to a provider — by pasted codes and/or "N free cards". Returns { assigned, errors } */
  async function assignCards({ provider, codes = [], count = 0 }) {
    const assigned = [];
    const errors = [];
    const batch = db.batch();
    const stamp = { assignedProviderId: provider.id, assignedProviderName: provider.name || '', assignedAt: Timestamp.fromDate(new Date()), kind: 'invite', updatedAt: FieldValue.serverTimestamp() };
    const seen = new Set();

    for (const raw of codes.slice(0, MAX_CARDS_PER_ASSIGN)) {
      const code = normalizeCardCode(raw);
      if (!code || seen.has(code)) continue;
      seen.add(code);
      const found = await findCardByCode(code);
      if (!found || !isPhysicalCard(found.card)) { errors.push({ code, error: 'Koodi ei leitud' }); continue; }
      const state = cardState(found.card);
      if (state === 'used') { errors.push({ code, error: 'Kaart on juba kasutatud' }); continue; }
      if (state === 'assigned') { errors.push({ code, error: found.card.assignedProviderId === provider.id ? 'Juba sellel partneril' : `Juba määratud: ${found.card.assignedProviderName || 'teine partner'}` }); continue; }
      batch.update(found.ref, stamp);
      assigned.push(code);
    }

    const n = Math.min(Math.max(parseInt(count, 10) || 0, 0), MAX_CARDS_PER_ASSIGN);
    if (n > 0) {
      const free = (await loadPhysicalCards()).filter((c) => cardState(c.card) === 'free' && !seen.has(c.card.giftCode)).sort((a, b) => (a.card.giftCode < b.card.giftCode ? -1 : 1));
      if (free.length < n) errors.push({ code: '', error: `Vabu kaarte on ainult ${free.length}` });
      for (const c of free.slice(0, n)) { batch.update(c.ref, stamp); assigned.push(c.card.giftCode); }
    }

    if (assigned.length) await batch.commit();
    return { assigned, errors };
  }

  /** Public view of a code for /lunasta — never leaks more than the state and the inviting provider */
  async function validateCard(code) {
    const found = await findCardByCode(code);
    if (!found) return { state: 'notfound' };
    const { card } = found;
    if (!isPhysicalCard(card)) {
      // A real paid gift (e.g. a personal gift order) — handled personally by e-mail
      if (card.giftRedeemed) return { state: 'used' };
      return { state: 'legacy' };
    }
    const st = cardState(card);
    if (st === 'used') return { state: 'used' };
    if (st === 'free') return { state: 'unassigned' };
    const provider = await loadProvider(card.assignedProviderId);
    if (!provider || provider.status === 'disabled') return { state: 'unassigned' };
    return {
      state: 'invite',
      provider: { firstName: provider.contactName || provider.name || '', name: provider.name || '', businessName: provider.businessName || '' },
      found, providerDoc: provider,
    };
  }

  function inviteProviderEmail({ provider, order }) {
    const name = primaryName(order) || primaryEmail(order);
    return {
      subject: `SUKODA | Uus kodu kutsekaardiga: ${name}`,
      html: providerWrap('Uus kodu kutsekaardiga',
        `Tere, ${escapeHtml(greetName(provider))}. Keegi sisestas sinu kutsekaardi koodi ja tema kodu on nüüd sinu töölaual. Klient sai portaali lingi. Ava töölaud ja lisa graafik — siis saab ta kalendrikutsed kohe.`,
        `<div style="background:#FFFFFF;padding:28px;border-left:2px solid #B8976A;">
          ${LABEL('Kodu')}
          <p style="margin:0;font-weight:300;color:#2C2824;font-size:20px;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(name)}</p>
          ${ROW('Aadress', escapeHtml(primaryAddress(order) || '-'))}
          ${ROW('Kontakt', `${escapeHtml(primaryEmail(order))}${order.customer?.phone ? ' · ' + escapeHtml(order.customer.phone) : ''}`)}
          ${ROW('Kutsekaart', escapeHtml(order.inviteCode || ''))}
        </div>`,
        { href: `${HALDUS_URL}?tab=customers`, label: 'AVA TÖÖLAUD JA LISA GRAAFIK' }),
    };
  }

  // The printed card left with Arco: a new home already includes cleaning, flowers and a handyman.
  // The old gift booking on this code does not count — the card opens the welcome once.
  const WELCOME_CODE = 'SK1349-9EMK-4W47';
  const WELCOME_IDS = {
    providerId: 'FrvUr0xjpeFJzaraIvF1',
    floristId: 'YaDtAZBn67jaHGUhXP5J',
    handymanId: 'kodulahe-haldus-tehnik',
  };

  function welcomeAnchor(weekday) {
    const start = core.parseDateStr(todayTallinnStr(1));
    for (let i = 0; i < 7; i++) {
      const d = core.addDays(start, i);
      if (d.getUTCDay() === weekday) return core.toDateStr(d);
    }
    return core.toDateStr(start);
  }

  async function redeemWelcome(req, res, code) {
    const b = req.body || {};
    if (b.consent !== true) return res.status(400).json({ error: 'Nõustu tingimustega, et jätkata' });
    const found = await findCardByCode(code);
    if (found?.card?.welcomeRedeemedAt) return res.status(409).json({ state: 'used', error: 'See kaart on juba kasutatud' });
    if (!str(b.name, 200)) return res.status(400).json({ error: 'Nimi on kohustuslik' });
    if (!core.isValidEmail(core.normalizeEmail(b.email))) return res.status(400).json({ error: 'Korrektne e-post on kohustuslik' });
    if (!str(b.address, 500)) return res.status(400).json({ error: 'Aadress on kohustuslik' });
    const weekday = Number(b.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return res.status(400).json({ error: 'Vali koristuse päev' });
    const time = str(b.time, 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return res.status(400).json({ error: 'Vali kellaaeg' });
    const size = core.ORDER_SIZES.includes(b.size) ? b.size : 'medium';
    const provider = await loadProvider(WELCOME_IDS.providerId);
    const florist = await loadProvider(WELCOME_IDS.floristId);
    const handyman = await loadProvider(WELCOME_IDS.handymanId);
    if (!provider) return res.status(500).json({ error: 'Koduhooldajat ei leitud' });

    const contacts = [];
    if (b.contact2 && (b.contact2.email || b.contact2.name)) {
      contacts.push({ name: str(b.contact2.name, 120), email: core.normalizeEmail(b.contact2.email), notify: true });
    }
    const contactsCheck = core.sanitizeContacts(contacts);
    if (contactsCheck.error) return res.status(400).json({ error: 'Teise kontakti e-post ei ole korrektne' });

    const cardRef = found?.ref || null;
    const claimedAt = Timestamp.fromDate(new Date());
    if (cardRef) {
      try {
        await db.runTransaction(async (tx) => {
          const fresh = await tx.get(cardRef);
          const c = fresh.data() || {};
          if (c.welcomeRedeemedAt) throw new HomeError(409, { state: 'used', error: 'See kaart on juba kasutatud' });
          tx.update(cardRef, { welcomeRedeemedAt: claimedAt, usedAt: claimedAt, usedByEmail: core.normalizeEmail(b.email), kind: 'welcome', updatedAt: FieldValue.serverTimestamp() });
        });
      } catch (e) {
        if (e instanceof HomeError) return res.status(e.status).json(e.body);
        throw e;
      }
    }

    const flowerPreference = str(b.flowerPreference, 300);
    const linens = str(b.linens, 300);
    let home;
    try {
      home = await createHome({
        provider,
        input: {
          name: b.name, email: b.email, phone: b.phone, address: b.address, size, lang: b.lang, contacts, force: true,
          schedule: { frequency: 'biweekly', anchorDate: welcomeAnchor(weekday), time, durationMin: { small: 120, medium: 180, large: 240 }[size] },
          homeProfile: { flowerPreference, linens },
        },
        createdBy: 'welcome:SK1349-9EMK-4W47',
        enforcePlanCap: false,
        extraFields: {
          source: 'welcome',
          flowers: { auto: true, leadDays: 2, pickup: 'partner', note: flowerPreference },
          floristId: florist?.id || null,
          floristName: florist?.name || '',
          handymanId: handyman?.id || null,
          handymanName: handyman?.name || '',
          terms: {
            cleaning: { included: true, services: ['regular'], quota: 'kaks korda kuus', after: '', billedBy: '' },
            handyman: { included: true, services: ['hang-mount', 'assembly', 'curtains', 'appliance-install'], quota: 'neli korda aastas', after: 'alates 45 €', billedBy: handyman?.businessName || '' },
          },
        },
        operatorSubject: `SUKODA | Uue kodu kaart lunastati: ${str(b.name, 200)}`,
        operatorIntro: `Kaart ${escapeHtml(code)} avas kodu. Koristus kaks korda kuus, lilled igal visiidil, remondimees neli korda aastas.`,
      });
    } catch (e) {
      if (cardRef) await cardRef.update({ welcomeRedeemedAt: FieldValue.delete(), usedAt: FieldValue.delete(), usedByEmail: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() }).catch(() => {});
      if (e instanceof HomeError) {
        if (e.status === 409) return res.status(409).json({ state: 'already', error: 'Sellel e-postil on juba kodu. Sisene portaali oma e-postiga.', code: e.body.code });
        return res.status(e.status).json(e.body);
      }
      throw e;
    }

    if (cardRef) await cardRef.update({ usedOrderId: home.orderId, usedByName: home.orderData.customer.name, updatedAt: FieldValue.serverTimestamp() });
    try {
      await sendEmail({ to: providerReplyTo(provider) || provider.email, ...inviteProviderEmail({ provider, order: home.orderData }) });
    } catch (e) { console.error('Welcome provider mail failed (non-fatal):', e); }

    res.status(200).json({ state: 'done', success: true, welcome: true, welcomeSent: home.welcomeSent, email: home.orderData.customer.email });
  }

  const lunastaHandlers = {
    'POST /api/lunasta/validate': async (req, res) => {
      const code = normalizeCardCode(req.body?.code);
      if (!code) return res.status(400).json({ state: 'notfound', error: 'Sisesta kood' });
      if (code === WELCOME_CODE) {
        const found = await findCardByCode(code);
        if (found?.card?.welcomeRedeemedAt) return res.status(200).json({ state: 'used', code });
        return res.status(200).json({ state: 'welcome', code });
      }
      const v = await validateCard(code);
      res.status(200).json({ state: v.state, code, provider: v.provider || null });
    },

    'POST /api/lunasta/redeem': async (req, res) => {
      if (!checkRateLimit(req, res, 'lunasta-redeem', 10, 600000)) return;
      const b = req.body || {};
      const code = normalizeCardCode(b.code);
      if (!code) return res.status(400).json({ state: 'notfound', error: 'Sisesta kood' });
      if (code === WELCOME_CODE) return redeemWelcome(req, res, code);
      if (b.consent !== true) return res.status(400).json({ error: 'Nõustu tingimustega, et jätkata' });
      const v = await validateCard(code);
      if (v.state !== 'invite') return res.status(409).json({ state: v.state, error: 'Kaarti ei saa kasutada' });
      const provider = v.providerDoc;
      const cardRef = v.found.ref;

      // Cheap checks before touching the card
      if (!str(b.name, 200)) return res.status(400).json({ error: 'Nimi on kohustuslik' });
      if (!core.isValidEmail(core.normalizeEmail(b.email))) return res.status(400).json({ error: 'Korrektne e-post on kohustuslik' });
      if (!str(b.address, 500)) return res.status(400).json({ error: 'Aadress on kohustuslik' });

      // Household: one optional second contact ("kes veel saab teavitusi")
      const contacts = [];
      if (b.contact2 && (b.contact2.email || b.contact2.name)) {
        contacts.push({ name: str(b.contact2.name, 120), email: core.normalizeEmail(b.contact2.email), notify: true });
      }
      const contactsCheck = core.sanitizeContacts(contacts);
      if (contactsCheck.error) return res.status(400).json({ error: 'Teise kontakti e-post ei ole korrektne' });

      // Already a home with this provider → no duplicate, point to the portal instead (card stays unused)
      const email = core.normalizeEmail(b.email);
      const dup = await db.collection('orders').where('customer.email', '==', email).where('status', 'in', ['paid', 'cancelling']).limit(3).get();
      if (dup.docs.some((d) => d.data().providerId === provider.id)) {
        return res.status(409).json({ state: 'already', error: 'Sellel e-postil on juba kodu selle koduhooldaja juures. Sisene portaali oma e-postiga.', code: 'ALREADY_MINE' });
      }

      // Claim the card first so two people cannot use the same code at once
      const claimedAt = Timestamp.fromDate(new Date());
      try {
        await db.runTransaction(async (tx) => {
          const fresh = await tx.get(cardRef);
          const c = fresh.data();
          if (!c || c.usedAt || c.giftRedeemed || c.assignedProviderId !== provider.id) throw new HomeError(409, { state: 'used', error: 'See kaart on juba kasutatud' });
          tx.update(cardRef, { usedAt: claimedAt, usedByEmail: core.normalizeEmail(b.email), updatedAt: FieldValue.serverTimestamp() });
        });
      } catch (e) {
        if (e instanceof HomeError) return res.status(e.status).json(e.body);
        throw e;
      }

      let home;
      try {
        home = await createHome({
          provider,
          input: { name: b.name, email: b.email, phone: b.phone, address: b.address, size: b.size, lang: b.lang, contacts, force: true },
          createdBy: `invite:${v.found.id}`,
          enforcePlanCap: false,
          extraFields: {
            inviteCardId: v.found.id,
            inviteCode: code,
            ...(v.found.card.buildingId ? { buildingId: v.found.card.buildingId } : {}),
            ...(v.found.card.handover ? { handover: v.found.card.handover } : {}),
            ...(Array.isArray(v.found.card.buildingDocuments) && v.found.card.buildingDocuments.length ? { buildingDocuments: v.found.card.buildingDocuments } : {}),
            ...(v.found.card.sponsor ? { sponsor: v.found.card.sponsor } : {}),
          },
          operatorSubject: `SUKODA | Kutsekaardiga liitus kodu: ${str(b.name, 200)}`,
          operatorIntro: `${escapeHtml(provider.name)} (${escapeHtml(provider.email)}) — kutsekaart ${escapeHtml(code)} lunastati veebis.`,
        });
      } catch (e) {
        // Release the card again — nothing was created
        await cardRef.update({ usedAt: FieldValue.delete(), usedByEmail: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() }).catch(() => {});
        if (e instanceof HomeError) {
          if (e.status === 409) return res.status(409).json({ state: 'already', error: 'Sellel e-postil on juba kodu selle koduhooldaja juures. Sisene portaali oma e-postiga.', code: e.body.code });
          return res.status(e.status).json(e.body);
        }
        throw e;
      }

      await cardRef.update({ usedOrderId: home.orderId, usedByName: home.orderData.customer.name, updatedAt: FieldValue.serverTimestamp() });
      try {
        await sendEmail({ to: providerReplyTo(provider) || provider.email, ...inviteProviderEmail({ provider, order: home.orderData }) });
      } catch (e) {
        console.error('Invite provider mail failed (non-fatal):', e);
      }

      res.status(200).json({
        state: 'done',
        success: true,
        provider: v.provider,
        welcomeSent: home.welcomeSent,
        email: home.orderData.customer.email,
      });
    },
  };

  /**
   * Housekeeper rows whose deadline has arrived move forward.
   * Due means nextDueAt is on or before the visit day. Both dates are YYYY-MM-DD in Tallinn.
   * The next deadline is that visit day plus the row's interval in months
   * (core.completeMaintenanceItem). Household rows, and rows that are not due yet, stay put.
   * The returned list is what gets written, so the notice can use the new nextDueAt.
   */
  function advanceDueRhythm(order, { visitDate, today, role }) {
    const items = Array.isArray(order?.maintenance) ? order.maintenance.map((it) => ({ ...it })) : [];
    if (role !== 'cleaning' || !items.length) return { items, advanced: [], changed: false };
    const advanced = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || it.doneBy !== 'provider') continue;
      if (!it.nextDueAt || it.nextDueAt > visitDate) continue;
      if (!core.MAINTENANCE_INTERVALS.includes(Number(it.intervalMonths))) continue;
      const r = core.completeMaintenanceItem(it, visitDate, today);
      if (r.error || !r.item) continue;
      items[i] = { ...r.item, lastDoneBy: 'provider' };
      advanced.push(items[i]);
    }
    return { items, advanced, changed: advanced.length > 0 };
  }

  /**
   * Mark one visit done. Idempotent. Rolls due rhythm in the same transaction as the visit,
   * then notifies from the written rows (new nextDueAt), not the order we read at the start.
   * Does not touch access codes and does not add a recipient.
   */
  async function markVisitDone({ provider, visitId, note }) {
    const acc = await accessBooking(provider, visitId);
    if (!acc) return { status: 404, body: { error: { et: 'Visiiti ei leitud', en: 'Visit not found' } } };
    const { ref, orderRef, role } = acc;
    const today = todayTallinnStr();
    let outcome;
    try {
      outcome = await db.runTransaction(async (tx) => {
        const bDoc = await tx.get(ref);
        if (!bDoc.exists) return { missing: true };
        const booking = bDoc.data();
        if (booking.providerId ? booking.providerId !== provider.id : role !== 'cleaning') return { missing: true };
        if (booking.status === 'completed') return { already: true };
        if (booking.status === 'cancelled') return { cancelled: true };
        if (!['scheduled', 'confirmed'].includes(booking.status)) return { blocked: true };
        const start = toDate(booking.scheduledAt);
        const visitDate = start ? tallinnDateStr(start) : today;
        if (visitDate > today) return { future: true };
        const oDoc = await tx.get(orderRef);
        const order = oDoc.exists ? oDoc.data() : acc.order;
        const rhythm = advanceDueRhythm(order, { visitDate, today, role });
        const patch = {
          status: 'completed',
          completedAt: FieldValue.serverTimestamp(),
          completedBy: 'provider',
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (note) patch.note = note;
        tx.update(ref, patch);
        const orderPatch = {
          totalVisits: FieldValue.increment(1),
          lastVisitAt: booking.scheduledAt || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (rhythm.changed) {
          orderPatch.maintenance = rhythm.items;
          orderPatch.maintenanceNextDue = core.maintenanceNextDue(rhythm.items);
        }
        tx.update(orderRef, orderPatch);
        const freshOrder = rhythm.changed
          ? { ...order, maintenance: rhythm.items, maintenanceNextDue: core.maintenanceNextDue(rhythm.items) }
          : order;
        return { booking, freshOrder, rhythm };
      });
    } catch (e) {
      console.error('visit done failed:', visitId, e);
      return { status: 500, body: { error: { et: 'Visiiti ei õnnestunud tehtuks märkida. Proovi uuesti.', en: 'Could not mark the visit done. Try again.' } } };
    }
    if (outcome.missing) return { status: 404, body: { error: { et: 'Visiiti ei leitud', en: 'Visit not found' } } };
    if (outcome.already) return { status: 200, body: { success: true, already: true, rhythm: [] } };
    if (outcome.cancelled) return { status: 400, body: { error: { et: 'Tühistatud visiiti ei saa tehtuks märkida.', en: 'A cancelled visit cannot be marked done.', ru: 'Отменённый визит нельзя отметить выполненным.' } } };
    if (outcome.future) return { status: 400, body: { error: { et: 'Tulevast visiiti ei saa veel tehtuks märkida.', en: 'A future visit cannot be marked done yet.', ru: 'Будущий визит ещё нельзя отметить выполненным.' } } };
    if (outcome.blocked) return { status: 400, body: { error: { et: 'Seda visiiti ei saa tehtuks märkida.', en: 'This visit cannot be marked done.', ru: 'Этот визит нельзя отметить выполненным.' } } };

    const { booking, freshOrder, rhythm } = outcome;
    const lang = langOf(freshOrder);
    const advanced = rhythm.advanced || [];
    let notified = false;
    try {
      notified = await sendVisitDoneNotice({ order: freshOrder, booking, provider, note, advanced, lang });
    } catch (e) {
      console.error('visit done notice failed', ref.id, e);
    }
    return {
      status: 200,
      body: {
        success: true,
        notified,
        rhythm: advanced.map((it) => ({ id: it.id, name: core.maintenanceName(it, lang), nextDueAt: it.nextDueAt })),
      },
    };
  }

  /**
   * One notice to the resident, built from the rows just written (new nextDueAt).
   * A visit that came from a request keeps the old primary-address mail.
   * Any other visit uses the same recipient list as a confirmed visit.
   * Never includes an entrance code.
   */
  async function sendVisitDoneNotice({ order, booking, provider, note, advanced, lang }) {
    const rhythmText = rhythmPlain(advanced, lang);
    const clientNote = [note, rhythmText].filter(Boolean).join('\n');
    const doneWord = core.pick({ et: 'Tehtud.', en: 'Done.', ru: 'Сделано.' }, lang);
    if (booking.requestId) {
      const reqRef = db.collection('serviceRequests').doc(docId(booking.requestId));
      const reqDoc = await reqRef.get();
      await reqRef.set({ status: 'completed', completedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      try {
        await appendRequestMessage(reqRef, { by: 'provider', name: provider.name, text: note ? `${doneWord} ${note}` : doneWord });
      } catch (e) { console.error('visit done thread failed', booking.requestId, e); }
      if (reqDoc.exists) {
        return !!(await sendCustomerMail(order, requestCompletedEmail({
          order, request: reqDoc.data(), requestId: reqRef.id, providerName: provider.name, note: clientNote, lang,
        }), { replyTo: PORTAL_REPLY_TO }));
      }
    }
    const n = await notifyOrder(order, visitDoneEmail({ order, provider, note, items: advanced, lang }), { replyTo: PORTAL_REPLY_TO });
    return n > 0;
  }

  function loginCodeEmail(code, lang) {
    const L = core.langOf(lang);
    const subject = core.pick({
      et: 'SUKODA | Sinu sisenemiskood',
      en: 'SUKODA | Your sign-in code',
      ru: 'SUKODA | Код для входа',
    }, L);
    const intro = core.pick({
      et: 'Kirjuta see kood rakendusse. See kehtib 10 minutit.',
      en: 'Enter this code in the app. It is valid for 10 minutes.',
      ru: 'Введите этот код в приложении. Он действует 10 минут.',
    }, L);
    return { subject, html: wrap(H2(escapeHtml(code)) + P(intro), L) };
  }

  /** Same doors as the magic link: a paid home first, otherwise an active desk. Unknown e-mail is not an account. */
  async function findLoginTarget(email) {
    const byEmail = await db.collection('orders')
      .where('customer.email', '==', email)
      .where('status', 'in', ['paid', 'cancelling'])
      .limit(10)
      .get();
    const paidAtMs = (d) => {
      const v = d.data().paidAt;
      if (!v) return 0;
      if (typeof v.toMillis === 'function') return v.toMillis();
      const dt = toDate(v);
      return dt ? dt.getTime() : 0;
    };
    let orderDoc = byEmail.docs
      .filter((d) => (d.data().type || 'subscription') === 'subscription')
      .sort((a, b) => paidAtMs(b) - paidAtMs(a))[0] || null;
    let member = false;
    if (!orderDoc) {
      const giftSnap = await db.collection('orders')
        .where('recipient.email', '==', email)
        .where('type', '==', 'gift')
        .where('giftRedeemed', '==', true)
        .limit(1)
        .get();
      if (!giftSnap.empty) orderDoc = giftSnap.docs[0];
    }
    if (!orderDoc) {
      const memberSnap = await db.collection('orders').where('contactEmails', 'array-contains', email).limit(5).get();
      orderDoc = memberSnap.docs.find((d) => ['paid', 'cancelling'].includes(d.data().status)) || null;
      member = !!orderDoc;
    }
    if (orderDoc) return { audience: 'home', member, orderDoc, lang: core.langOf(orderDoc.data()) };
    const provSnap = await db.collection('providers').where('email', '==', email).limit(1).get();
    if (!provSnap.empty && provSnap.docs[0].data().status !== 'disabled') {
      const doc = provSnap.docs[0];
      return { audience: 'desk', providerDoc: doc, lang: core.langOf(doc.data()) };
    }
    return null;
  }

  async function issueLoginSession(target, email) {
    const exp = Timestamp.fromDate(core.sessionExpiresAt(new Date()));
    if (target.audience === 'desk') {
      return { token: await issueProviderToken(target.providerDoc.ref), desk: true };
    }
    const { raw, hash } = newToken();
    if (target.member) {
      const order = target.orderDoc.data();
      const contact = (order.contacts || []).find((c) => core.normalizeEmail(c.email) === email);
      await db.collection('portalSessions').doc(hash).set({
        orderId: target.orderDoc.id,
        email,
        name: contact?.name || '',
        expiresAt: exp,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      await target.orderDoc.ref.update({ sessionTokenHash: hash, sessionTokenExpiresAt: exp });
    }
    return { token: raw, desk: false };
  }

  const haldusHandlers = {
    /** Pick a plan: a live subscription is switched in place (prorated); otherwise Stripe Checkout */
    'POST /api/haldus/billing/checkout': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const planId = String(req.body?.plan || '');
      const plan = core.SELF_SERVE_PLANS.includes(planId) ? core.PROVIDER_PLANS[planId] : null;
      if (!plan) return res.status(400).json({ error: 'Vali pakett' });
      if (core.effectivePlan(provider) === 'enterprise') return res.status(400).json({ error: 'Partnerlepinguga töölaual arveldus käib lepingu järgi — pakette ei ole vaja valida.' });
      const stripe = getStripe();
      const live = provider.planSubscriptionId && core.PLAN_ACTIVE_STATUSES.includes(provider.planStatus);
      if (plan.id === 'free') {
        if (!live) return res.status(200).json({ success: true, plan: 'free' });
        const sub = await stripe.subscriptions.update(provider.planSubscriptionId, { cancel_at_period_end: true });
        await db.collection('providers').doc(provider.id).update({ ...subscriptionFields(sub), updatedAt: FieldValue.serverTimestamp() });
        return res.status(200).json({ success: true, scheduled: true, periodEnd: tsToIso(subscriptionFields(sub).planPeriodEnd) });
      }
      const price = await ensurePlanPrice(plan.id);
      if (live) {
        const current = await stripe.subscriptions.retrieve(provider.planSubscriptionId);
        const sub = await stripe.subscriptions.update(provider.planSubscriptionId, {
          items: [{ id: current.items.data[0].id, price: price.id }],
          proration_behavior: 'create_prorations', cancel_at_period_end: false,
          metadata: { kind: 'provider_plan', providerId: provider.id, plan: plan.id },
        });
        await db.collection('providers').doc(provider.id).update({ plan: plan.id, ...subscriptionFields(sub), updatedAt: FieldValue.serverTimestamp() });
        return res.status(200).json({ success: true, switched: true, plan: plan.id });
      }
      const customer = await ensureStripeCustomer(provider);
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription', customer, locale: 'et',
        line_items: [{ price: price.id, quantity: 1 }],
        allow_promotion_codes: true,
        success_url: `${HALDUS_URL}?tab=account&billing=success`,
        cancel_url: `${HALDUS_URL}?tab=account&billing=cancel`,
        metadata: { kind: 'provider_plan', providerId: provider.id, plan: plan.id },
        subscription_data: { metadata: { kind: 'provider_plan', providerId: provider.id, plan: plan.id } },
      });
      res.status(200).json({ success: true, url: session.url });
    },

    /** Undo a scheduled cancellation before the period ends */
    'POST /api/haldus/billing/resume': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      if (!provider.planSubscriptionId) return res.status(400).json({ error: 'Aktiivset paketti pole' });
      const sub = await getStripe().subscriptions.update(provider.planSubscriptionId, { cancel_at_period_end: false });
      await db.collection('providers').doc(provider.id).update({ ...subscriptionFields(sub), updatedAt: FieldValue.serverTimestamp() });
      res.status(200).json({ success: true });
    },

    /** Paid invoices for bookkeeping */
    'GET /api/haldus/billing/invoices': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      if (!provider.stripeCustomerId) return res.status(200).json({ invoices: [] });
      const list = await getStripe().invoices.list({ customer: provider.stripeCustomerId, limit: 24 });
      res.status(200).json({
        invoices: list.data.filter((i) => i.status === 'paid').map((i) => ({
          id: i.id, number: i.number, amount: i.amount_paid / 100, currency: i.currency, paidAt: i.status_transitions?.paid_at ? new Date(i.status_transitions.paid_at * 1000).toISOString() : null, pdf: i.invoice_pdf, url: i.hosted_invoice_url,
        })),
      });
    },

    // ---- Auth -------------------------------------------------
    'POST /api/haldus/login/code': async (req, res) => {
      if (!checkRateLimit(req, res, 'login-code', 5, 300000)) return;
      const email = core.normalizeEmail(req.body?.email);
      const badMail = { error: { et: 'Kirjuta e-post.', en: 'Enter an e-mail.', ru: 'Укажите эл. почту.' } };
      if (!core.isValidEmail(email)) return res.status(400).json(badMail);
      const rl = db.collection('rateLimits').doc(`login_code_${sha256(email)}`);
      const rlDoc = await rl.get();
      const lastSent = toDate(rlDoc.data()?.lastSent) || new Date(0);
      if (lastSent > new Date(Date.now() - 10 * 60 * 1000)) return res.status(200).json({ sent: true });
      const target = await findLoginTarget(email);
      await rl.set({ lastSent: FieldValue.serverTimestamp(), count: FieldValue.increment(1) }, { merge: true });
      if (!target) return res.status(200).json({ sent: true });
      const code = core.generateLoginCode(crypto.randomInt(0, 1000000));
      if (!code) {
        return res.status(500).json({ error: { et: 'Koodi ei õnnestunud teha. Proovi uuesti.', en: 'Could not make a code. Try again.', ru: 'Не удалось создать код. Попробуйте снова.' } });
      }
      await db.collection('loginCodes').doc(sha256(email)).set({
        codeHash: core.hashLoginCode(email, code),
        expiresAt: Timestamp.fromDate(core.loginCodeExpiresAt(new Date())),
        attempts: 0,
        audience: target.audience,
        createdAt: FieldValue.serverTimestamp(),
      });
      try {
        await sendEmail({ to: email, ...loginCodeEmail(code, target.lang) });
      } catch (e) {
        console.error('login code mail failed', sha256(email));
        return res.status(500).json({ error: { et: 'Kirja ei õnnestunud saata. Proovi uuesti.', en: 'The e-mail could not be sent. Try again.', ru: 'Письмо не удалось отправить. Попробуйте снова.' } });
      }
      res.status(200).json({ sent: true });
    },

    'POST /api/haldus/login/verify': async (req, res) => {
      if (!checkRateLimit(req, res, 'login-verify', 10, 300000)) return;
      const email = core.normalizeEmail(req.body?.email);
      const code = String(req.body?.code ?? '').trim();
      const fail = { error: { et: 'Kood ei sobi. Kontrolli kirja või küsi uus.', en: 'That code does not work. Check the e-mail or ask for a new one.', ru: 'Код не подошёл. Проверьте письмо или запросите новый.' } };
      if (!core.isValidEmail(email) || !/^\d{6}$/.test(code)) return res.status(401).json(fail);
      const ref = db.collection('loginCodes').doc(sha256(email));
      let audience = null;
      try {
        audience = await db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          const data = snap.exists ? snap.data() : null;
          const result = core.checkLoginCode({
            email,
            code,
            record: data ? { codeHash: data.codeHash, expiresAt: toDate(data.expiresAt), attempts: data.attempts } : null,
            now: new Date(),
          });
          if (!result.ok) {
            if (result.reason === 'mismatch' && snap.exists) tx.update(ref, { attempts: FieldValue.increment(1) });
            return null;
          }
          tx.delete(ref);
          return data.audience;
        });
      } catch (e) {
        console.error('login verify failed', sha256(email));
        return res.status(500).json({ error: { et: 'Sisenemine ei õnnestunud. Proovi uuesti.', en: 'Sign-in failed. Try again.', ru: 'Вход не удался. Попробуйте снова.' } });
      }
      if (!audience) return res.status(401).json(fail);
      const target = await findLoginTarget(email);
      if (!target || target.audience !== audience) return res.status(401).json(fail);
      const session = await issueLoginSession(target, email);
      res.status(200).json({ token: session.token, desk: session.desk });
    },

    'POST /api/haldus/magic-link': async (req, res) => {
      if (!checkRateLimit(req, res, 'haldus-magic', 5, 300000)) return;
      const email = core.normalizeEmail(req.body?.email);
      if (!core.isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });

      const rl = db.collection('rateLimits').doc(`haldus_magic_${sha256(email)}`);
      const rlDoc = await rl.get();
      const lastSent = toDate(rlDoc.data()?.lastSent) || new Date(0);
      if (lastSent > new Date(Date.now() - 10 * 60000)) return res.status(200).json({ sent: true });

      const snap = await db.collection('providers').where('email', '==', email).limit(1).get();
      if (snap.empty || snap.docs[0].data().status === 'disabled') {
        // Not a provider — a household member who came to the wrong door gets their portal link instead
        const toHome = await sendClientMagicLink(email);
        if (toHome) await rl.set({ lastSent: FieldValue.serverTimestamp(), count: FieldValue.increment(1) }, { merge: true });
        return res.status(200).json({ sent: true, portal: toHome });
      }

      await sendProviderMagicLink(snap.docs[0]);
      await rl.set({ lastSent: FieldValue.serverTimestamp(), count: FieldValue.increment(1) }, { merge: true });
      res.status(200).json({ sent: true });
    },

    /**
     * Self-serve onboarding for service providers: a housekeeper (or florist, handyman, gardener) opens their
     * own desk and gets the login link immediately. Nothing for the operator to do; they are just told.
     * Existing e-mail → behaves like a login (link re-sent), so the form is safe to submit twice.
     */
    'POST /api/haldus/signup': async (req, res) => {
      if (!checkRateLimit(req, res, 'haldus-signup', 5, 600000)) return;
      const b = req.body || {};
      const name = str(b.name, 120);
      const email = core.normalizeEmail(b.email);
      if (!name) return res.status(400).json({ error: 'Nimi on kohustuslik' });
      if (!core.isValidEmail(email)) return res.status(400).json({ error: 'Korrektne e-post on kohustuslik' });
      const services = (Array.isArray(b.services) ? b.services : []).filter((s) => Object.keys(core.SERVICE_CATEGORIES).includes(s) || s === 'other');

      const dup = await db.collection('providers').where('email', '==', email).limit(1).get();
      if (!dup.empty) {
        const doc = dup.docs[0];
        if (doc.data().status !== 'disabled') await sendProviderMagicLink(doc);
        return res.status(200).json({ sent: true, existing: true });
      }

      const ref = await db.collection('providers').add({
        name, email, notifyEmail: email, phone: str(b.phone, 40), businessName: str(b.businessName, 160),
        city: str(b.city, 80), services: services.length ? services : ['cleaning'], status: 'active', lang: 'et',
        plan: 'trial', createdBy: 'self', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      await sendProviderMagicLink(await ref.get());
      await sendEmail({
        to: NOTIFICATION_EMAIL,
        subject: `SUKODA | Uus partner liitus — ${name}`,
        html: wrap(H2('Uus teenusepakkuja') + P(`${escapeHtml(name)}${b.businessName ? ' · ' + escapeHtml(str(b.businessName, 160)) : ''} avas endale töölaua.`)
          + `<div style="background:#FFFFFF;padding:24px;margin-bottom:24px;border-left:2px solid #B8976A;">${ROW('E-post', escapeHtml(email))}${b.phone ? ROW('Telefon', escapeHtml(str(b.phone, 40))) : ''}${ROW('Teenused', escapeHtml((services.length ? services : ['cleaning']).map((s) => core.SERVICE_CATEGORIES[s]?.et || s).join(', ')))}${b.city ? ROW('Piirkond', escapeHtml(str(b.city, 80))) : ''}</div>`
          + P('Ta saab kohe kliente lisada. Kui midagi tundub valesti, saad ta admin-konsoolis peatada.', 'font-size:12px;'), 'et'),
      });
      res.status(200).json({ sent: true, existing: false });
    },

    /**
     * A homeowner invites their own housekeeper to open a desk. The housekeeper gets a personal note with the
     * signup link; the operator gets a copy so the loop can be closed by hand if needed.
     */
    'POST /api/haldus/invite-partner': async (req, res) => {
      if (!checkRateLimit(req, res, 'haldus-invite', 5, 600000)) return;
      const b = req.body || {};
      const partnerEmail = core.normalizeEmail(b.partnerEmail);
      const email = core.normalizeEmail(b.email);
      if (!core.isValidEmail(partnerEmail) || !core.isValidEmail(email)) return res.status(400).json({ error: 'Korrektsed e-postid on kohustuslikud' });
      const partnerName = str(b.partnerName, 120);
      const name = str(b.name, 120);
      const who = name || email;
      const url = `${HALDUS_URL}?alusta`;
      await sendEmail({
        to: partnerEmail,
        replyTo: email,
        subject: `SUKODA | ${who} kutsub sind oma koduportaali`,
        html: wrap(
          H2(`Tere${partnerName ? ', ' + escapeHtml(firstName(partnerName)) : ''}!`)
          + P(`${escapeHtml(who)} kasutab SUKODA koduportaali ja soovib, et tema kodu ajad, kalendrikutsed ja soovid liiguksid edaspidi selle kaudu — otse sinult, ilma SMS-ideta.`)
          + P('SUKODA Töölaud on sinu tööriist: lisad kliendi, määrad ajad või korduva graafiku, ja klient ning tema pere saavad kalendrikutsed, muudatused ja meeldetuletused ise. Kliendi soovid jõuavad sinuni ja sa kinnitad aja ühe klikiga. Alustamine on tasuta ja võtab kaks minutit.')
          + `<div style="text-align:center;margin:32px 0;"><a href="${url}" style="display:inline-block;background:#2C2824;color:#FAF8F5;padding:16px 36px;text-decoration:none;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">Ava oma töölaud</a></div>`
          + P(`Kui sul on küsimusi, vasta sellele kirjale — see jõuab otse kutsujale (${escapeHtml(who)}). SUKODA kohta: tere@sukoda.ee.`, 'font-size:12px;'),
          'et',
        ),
      });
      await sendEmail({
        to: NOTIFICATION_EMAIL,
        subject: `SUKODA | Koduomanik kutsus partneri — ${who} → ${partnerName || partnerEmail}`,
        html: wrap(H2('Kutse teenusepakkujale') + `<div style="background:#FFFFFF;padding:24px;margin-bottom:24px;border-left:2px solid #B8976A;">${ROW('Koduomanik', escapeHtml(who) + ' &lt;' + escapeHtml(email) + '&gt;')}${ROW('Partner', escapeHtml(partnerName || '—') + ' &lt;' + escapeHtml(partnerEmail) + '&gt;')}</div>` + P('Kui partner nädala jooksul töölauda ei ava, tasub koduomanikule kirjutada.', 'font-size:12px;'), 'et'),
      });
      await db.collection('partnerInvites').add({ partnerEmail, partnerName, email, name, lang: b.lang === 'en' ? 'en' : 'et', createdAt: FieldValue.serverTimestamp() });
      res.status(200).json({ sent: true });
    },

    'POST /api/haldus/auth/validate': async (req, res) => {
      const token = String(req.body?.token || '');
      if (token.length < 32) return res.status(400).json({ error: 'Invalid token' });
      const snap = await db.collection('providers').where('sessionTokenHash', '==', sha256(token)).limit(1).get();
      if (snap.empty) return res.status(401).json({ error: 'Invalid or expired token' });
      const doc = snap.docs[0];
      const p = doc.data();
      if (p.status === 'disabled') return res.status(401).json({ error: 'Disabled' });
      const exp = toDate(p.sessionTokenExpiresAt);
      if (exp && exp < new Date()) return res.status(401).json({ error: 'Token expired' });
      const newExp = new Date();
      newExp.setDate(newExp.getDate() + TOKEN_DAYS);
      await doc.ref.update({ sessionTokenExpiresAt: Timestamp.fromDate(newExp), lastLoginAt: FieldValue.serverTimestamp() });
      res.status(200).json({ token, provider: serializeProvider({ id: doc.id, ...p }) });
    },

    'POST /api/haldus/logout-all': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      await db.collection('providers').doc(provider.id).update({ sessionTokenHash: FieldValue.delete(), sessionTokenExpiresAt: FieldValue.delete() });
      res.status(200).json({ success: true });
    },

    // ---- Dashboard payload -----------------------------------
    'GET /api/haldus/earned': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const snap = await db.collection('bookings').where('providerId', '==', provider.id).limit(100).get();
      const rows = snap.docs.map((d) => d.data()).filter((b) => b.status === 'completed').map((b) => b.payment || {});
      res.status(200).json({
        cents: core.earnedCents(rows),
        connect: false,
        payout: 'waiting-for-stripe',
      });
    },

    'POST /api/haldus/availability': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const availability = core.sanitizeAvailability(req.body || {});
      await db.collection('providers').doc(provider.id).update({ availability, updatedAt: FieldValue.serverTimestamp() });
      res.status(200).json({ success: true, availability });
    },

    'POST /api/haldus/buildings': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      if (core.effectivePlan(provider) !== 'enterprise') return res.status(403).json({ error: 'Forbidden' });
      const built = core.sanitizeBuilding(req.body || {});
      if (built.error) return res.status(400).json({ error: built.error });
      const ref = db.collection('buildings').doc();
      await ref.set({ ...built.building, providerId: provider.id, createdAt: FieldValue.serverTimestamp() });
      res.status(200).json({ id: ref.id, building: built.building });
    },

    'POST /api/haldus/buildings/handover': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      if (core.effectivePlan(provider) !== 'enterprise') return res.status(403).json({ error: 'Forbidden' });
      const draft = core.sanitizeHandover(req.body || {});
      if (draft.error) return res.status(400).json({ error: draft.error });
      const code = core.handoverCode(crypto.randomBytes(8));
      if (!code) return res.status(500).json({ error: 'code' });
      const clash = await db.collection('orders').where('giftCode', '==', code).limit(1).get();
      if (!clash.empty) return res.status(409).json({ error: 'retry' });
      let buildingDocuments = [];
      let sponsor = null;
      let buildingId = String(req.body?.buildingId || '').slice(0, 80);
      if (buildingId) {
        const buildingSnap = await db.collection('buildings').doc(buildingId).get();
        const building = buildingSnap.exists ? buildingSnap.data() : null;
        if (!building || building.providerId !== provider.id) return res.status(404).json({ error: 'building' });
        buildingDocuments = Array.isArray(building.documents) ? building.documents : [];
        sponsor = building.sponsor || null;
      }
      const orderRef = db.collection('orders').doc();
      await orderRef.set({
        type: 'gift',
        package: 'moment',
        size: 'medium',
        customer: { name: 'SUKODA (Handover)', email: 'tere@sukoda.ee' },
        recipient: { name: draft.handover.buyerName, email: draft.handover.buyerEmail },
        deliveryMethod: 'physical',
        giftCode: code,
        lang: 'et',
        status: 'paid',
        physicalCard: true,
        kind: 'invite',
        assignedProviderId: provider.id,
        assignedProviderName: provider.name || '',
        assignedAt: Timestamp.fromDate(new Date()),
        handover: draft.handover,
        buildingId: buildingId || null,
        buildingDocuments,
        sponsor,
        createdAt: FieldValue.serverTimestamp(),
      });
      res.status(200).json({ code, path: '/lunasta' });
    },

    'POST /api/haldus/hausing/preview': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const result = await hausing.relayTicket({
        building: req.body?.building || {},
        text: req.body?.text,
        email: req.body?.email,
        client: null,
      });
      res.status(200).json(result);
    },

    'POST /api/haldus/sharepoint/status': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const result = await sharepoint.deltaSync({ building: req.body?.building || {}, graph: null });
      res.status(200).json(result);
    },

    'GET /api/haldus/me': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });

      const fromStr = core.parseDateStr(req.query.from) ? req.query.from : todayTallinnStr(-35);
      const toStr = core.parseDateStr(req.query.to) ? req.query.to : todayTallinnStr(70);
      const from = new Date(tallinnLocalDateTimeToISOString(fromStr, '00:00'));
      const to = new Date(new Date(tallinnLocalDateTimeToISOString(toStr, '23:59')).getTime() + 60000);

      const orders = await loadProviderOrders(provider.id);
      const orderIds = new Set(orders.map((o) => o.doc.id));
      const billingInfo = billingView(provider, activeHomeCount(orders));
      const customers = orders
        .map(({ doc, role }) => serializeCustomer(doc.id, doc.data(), role, provider.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'et'));

      const [bookingSnap, requestSnap, inviteCards] = await Promise.all([
        db.collection('bookings')
          .where('providerId', '==', provider.id)
          .where('scheduledAt', '>=', Timestamp.fromDate(from))
          .where('scheduledAt', '<', Timestamp.fromDate(to))
          .orderBy('scheduledAt', 'asc')
          .get(),
        db.collection('serviceRequests')
          .where('providerId', '==', provider.id)
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get(),
        loadProviderCards(provider.id),
      ]);

      const bookings = bookingSnap.docs
        .filter((d) => orderIds.has(d.data().orderId))
        .map((d) => serializeBooking(d.id, d.data()));
      const requests = requestSnap.docs.map((d) => serializeRequest(d.id, d.data()));

      // Florists the partner can pick as "my flower shop" (shared curated list)
      const floristSnap = await db.collection('providers').where('services', 'array-contains', 'flowers').get();
      const florists = floristSnap.docs.filter((d) => d.data().active !== false).map((d) => ({ id: d.id, name: d.data().name, businessName: d.data().businessName || '' }));

      res.status(200).json({
        provider: { ...serializeProvider(provider), defaultFloristId: provider.defaultFloristId || null },
        florists,
        customers,
        bookings,
        requests,
        range: { from: fromStr, to: toStr },
        // Visit types for the desk: only things that become a visit (written questions and messages never do)
        // Only the partner's own categories — a warranty team should not be offered "Tavakoristus"
        catalogue: core.SERVICE_CATALOGUE.filter((s) => (s.kind || 'visit') !== 'question' && providerServices(provider).includes(s.category)).map((s) => ({ id: s.id, category: s.category, name: s.name.et, priceHint: s.priceHint.et, durationMin: s.durationMin })),
        // Upkeep the housekeeper can take on at a home; `byProvider` = typically part of a cleaning service
        maintenanceCatalogue: core.MAINTENANCE_CATALOGUE.map((m) => ({ id: m.id, name: m.name.et, hint: m.hint.et, intervalMonths: m.intervalMonths, byProvider: !!m.byProvider, homeTypes: m.homeTypes })),
        maintenanceIntervals: core.MAINTENANCE_INTERVALS,
        billing: billingInfo,
        // Printed invitation cards the operator has handed to this provider (code + free/used)
        inviteCards: inviteCards.map((c) => ({ code: c.code, status: c.status, usedAt: c.usedAt, usedByName: c.usedByName, assignedAt: c.assignedAt })),
        serverTime: new Date().toISOString(),
      });
    },

    'POST /api/haldus/profile': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const update = { updatedAt: FieldValue.serverTimestamp() };
      if (b.name != null) update.name = str(b.name, 120);
      if (b.businessName != null) update.businessName = str(b.businessName, 160);
      if (b.phone != null) update.phone = str(b.phone, 40);
      if (b.notifyEmail != null) {
        const e = core.normalizeEmail(b.notifyEmail);
        if (e && !core.isValidEmail(e)) return res.status(400).json({ error: 'Invalid notifyEmail' });
        update.notifyEmail = e;
      }
      if (update.name === '') return res.status(400).json({ error: 'Name required' });
      await db.collection('providers').doc(provider.id).update(update);
      res.status(200).json({ success: true });
    },

    /**
     * Flowers as part of this partner's service for one home: on/off, lead days, which shop.
     * The shop is remembered as the partner's default so the next client inherits it.
     */
    'POST /api/haldus/customers/flowers': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const access = await accessOrder(provider, b.orderId);
      if (!access) return res.status(404).json({ error: 'Klienti ei leitud' });
      if (access.role !== 'cleaning') return res.status(403).json({ error: 'Ainult kodu koristuspartner saab lilli seadistada' });
      const { ref, order } = access;

      const floristId = str(b.floristId, 64) || floristIdFor(order, provider);
      const florist = await loadProvider(floristId);
      const auto = b.auto === true;
      if (auto && !(florist && providerReplyTo(florist))) return res.status(400).json({ error: 'Vali lillepood — tal peab olema e-post, kuhu tellimus läheb' });

      const flowers = {
        auto,
        leadDays: FLOWER_LEAD_DAYS.includes(Number(b.leadDays)) ? Number(b.leadDays) : (order.flowers?.leadDays || 2),
        pickup: 'partner',
        note: str(b.note, 300) || (order.flowers?.note || ''),
        budget: b.budget != null ? str(b.budget, 80) : (order.flowers?.budget || ''),
        setBy: 'provider',
        updatedAt: Timestamp.fromDate(new Date()),
      };
      const update = { flowers, updatedAt: FieldValue.serverTimestamp() };
      if (florist) update.floristId = florist.id;
      await ref.update(update);
      if (florist && provider.defaultFloristId !== florist.id) await db.collection('providers').doc(provider.id).update({ defaultFloristId: florist.id, updatedAt: FieldValue.serverTimestamp() });

      res.status(200).json({ success: true, flowers: { auto, leadDays: flowers.leadDays, floristId: florist?.id || null }, floristName: florist?.businessName || florist?.name || null });
    },

    // ---- Customers ---------------------------------------------
    'POST /api/haldus/customers': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      let home;
      try {
        home = await createHome({ provider, input: b, createdBy: `provider:${provider.id}`, sendWelcome: b.sendWelcome !== false });
      } catch (e) {
        if (e instanceof HomeError) return res.status(e.status).json(e.body);
        throw e;
      }
      const { orderId, created, skipped, welcomeSent } = home;
      const doc = await home.ref.get();
      res.status(200).json({
        success: true,
        customer: serializeCustomer(orderId, doc.data(), 'cleaning', provider.id),
        createdVisits: created.map((c) => serializeBooking(c.id, c)),
        skippedHolidays: skipped,
        welcomeSent,
      });
    },

    'POST /api/haldus/customers/update': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const acc = await accessOrder(provider, b.orderId);
      if (!acc) return res.status(404).json({ error: 'Klienti ei leitud' });
      const { ref, order } = acc;

      // Only the housekeeper's role edits the home itself; other partners keep their own notes and nothing else
      const canEditHome = acc.role === 'cleaning' || order.providerId === provider.id;
      if (!canEditHome) {
        if (b.providerNotes == null) return res.status(403).json({ error: 'Kodu andmeid haldab koduhooldaja. Saad muuta ainult oma märkmeid.' });
        await ref.update({ [`providerNotesBy.${provider.id}`]: str(b.providerNotes, 1000), updatedAt: FieldValue.serverTimestamp() });
        const fresh = await ref.get();
        return res.status(200).json({ success: true, customer: serializeCustomer(ref.id, fresh.data(), acc.role, provider.id) });
      }

      const update = { updatedAt: FieldValue.serverTimestamp() };
      const customer = { ...(order.customer || {}) };
      let touchedCustomer = false;
      if (b.name != null) { customer.name = str(b.name, 200); touchedCustomer = true; }
      if (b.phone != null) { customer.phone = str(b.phone, 40); touchedCustomer = true; }
      if (b.address != null) { customer.address = str(b.address, 500); touchedCustomer = true; }
      if (b.additionalInfo != null) { customer.additionalInfo = str(b.additionalInfo, 1000); touchedCustomer = true; }
      if (b.email != null && order.source === 'manual') {
        const e = core.normalizeEmail(b.email);
        if (!core.isValidEmail(e)) return res.status(400).json({ error: 'Vigane e-post' });
        customer.email = e; touchedCustomer = true;
      }
      if (touchedCustomer) {
        if (!customer.name) return res.status(400).json({ error: 'Nimi on kohustuslik' });
        update.customer = customer;
      }
      if (b.size != null) {
        if (!core.ORDER_SIZES.includes(b.size)) return res.status(400).json({ error: 'Vigane suurus' });
        update.size = b.size;
      }
      if (b.contacts != null) {
        const c = core.sanitizeContacts(b.contacts);
        if (c.error) return res.status(400).json({ error: c.error });
        update.contacts = c.contacts.filter((x) => x.email !== primaryEmail({ ...order, ...update }));
        update.contactEmails = contactEmailsOf(update.contacts);
      }
      if (b.providerNotes != null) {
        // Housekeeper's notes live in the per-provider map too; the legacy field is kept in sync for older readers
        update.providerNotes = str(b.providerNotes, 1000);
        update[`providerNotesBy.${provider.id}`] = update.providerNotes;
      }
      if (b.homeProfile && typeof b.homeProfile === 'object') {
        const hp = b.homeProfile;
        update.homeProfile = {
          access: str(hp.access, 500), pets: str(hp.pets, 300), allergies: str(hp.allergies, 300),
          flowerPreference: str(hp.flowerPreference, 300), linens: str(hp.linens, 300), towels: str(hp.towels, 300),
          specialRequests: str(hp.specialRequests, 500), updatedAt: FieldValue.serverTimestamp(),
        };
      }

      await ref.update(update);

      // Address change → propagate to upcoming visits
      if (update.customer && update.customer.address !== order.customer?.address) {
        const upcoming = await upcomingBookingsForOrder(ref.id);
        for (const u of upcoming) await db.collection('bookings').doc(u.id).update({ address: update.customer.address, updatedAt: FieldValue.serverTimestamp() });
      }

      const doc = await ref.get();
      res.status(200).json({ success: true, customer: serializeCustomer(ref.id, doc.data(), acc.role, provider.id) });
    },

    'POST /api/haldus/customers/away': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const acc = await accessOrder(provider, b.orderId);
      if (!acc || acc.role !== 'cleaning') return res.status(404).json({ error: 'Klienti ei leitud' });
      const r = await addAwayPeriod({ orderRef: acc.ref, order: acc.order, input: b, provider, by: 'provider' });
      if (r.error) return res.status(r.status || 400).json({ error: r.error });
      res.status(200).json({ success: true, ...r });
    },

    'POST /api/haldus/customers/away/remove': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const acc = await accessOrder(provider, b.orderId);
      if (!acc || acc.role !== 'cleaning') return res.status(404).json({ error: 'Klienti ei leitud' });
      const r = await removeAwayPeriod({ orderRef: acc.ref, order: acc.order, periodId: String(b.periodId || ''), provider, by: 'provider' });
      if (r.error) return res.status(r.status || 400).json({ error: r.error });
      res.status(200).json({ success: true, ...r });
    },

    /**
     * Hooldusrütm from the desk: what the housekeeper does herself at this home. Adding here makes it hers;
     * ticking off tells the household in one line; she can also hand an item back to the household.
     */
    'POST /api/haldus/customers/maintenance': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const acc = await accessOrder(provider, b.orderId);
      if (!acc || acc.role !== 'cleaning') return res.status(404).json({ error: 'Klienti ei leitud' });
      const { ref, order } = acc;
      const r = applyMaintenanceAction(order, b, { by: 'provider', lang: 'et' });
      if (r.error) return res.status(r.status || 400).json({ error: r.error });
      await ref.update({ maintenance: r.items, maintenanceNextDue: core.maintenanceNextDue(r.items), updatedAt: FieldValue.serverTimestamp() });
      if (r.done) {
        try { await notifyOrder(order, maintenanceDoneEmail({ order, item: r.done, provider, lang: langOf(order) }), { replyTo: providerReplyTo(provider) }); } catch (e) { console.error('maintenance done mail failed', e); }
      }
      res.status(200).json({ success: true, maintenance: serializeMaintenanceForProvider({ ...order, maintenance: r.items }), notified: !!r.done });
    },

    'POST /api/haldus/customers/archive': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const acc = await accessOrder(provider, req.body?.orderId);
      if (!acc) return res.status(404).json({ error: 'Klienti ei leitud' });
      const { ref, order } = acc;
      if (acc.role !== 'cleaning' && order.providerId !== provider.id) return res.status(403).json({ error: 'Kodu saab arhiveerida ainult koduhooldaja või SUKODA.' });
      if (order.source !== 'manual') {
        return res.status(400).json({ error: 'SUKODA kaudu tellinud klienti saab lõpetada ainult SUKODA. Kirjuta tere@sukoda.ee.' });
      }
      const upcoming = await upcomingBookingsForOrder(ref.id);
      for (const u of upcoming) {
        await db.collection('bookings').doc(u.id).update({ status: 'cancelled', cancelReason: 'Koostöö lõpetatud', cancelledAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      }
      await ref.update({
        status: 'cancelled', subscriptionStatus: 'cancelled', cancelledAt: FieldValue.serverTimestamp(),
        cancelReason: str(req.body?.reason, 300) || 'Teenusepakkuja arhiveeris', 'schedule.active': false, updatedAt: FieldValue.serverTimestamp(),
      });
      res.status(200).json({ success: true, cancelledVisits: upcoming.length });
    },

    'POST /api/haldus/customers/resend-portal': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const acc = await accessOrder(provider, req.body?.orderId);
      if (!acc) return res.status(404).json({ error: 'Klienti ei leitud' });
      // A fresh link replaces the household's live session, so only the housekeeper who created the home may send it
      if (acc.role !== 'cleaning' || acc.order.source !== 'manual') {
        return res.status(403).json({ error: 'Portaali lingi saab uuesti saata ainult kodu loonud koduhooldaja. Klient saab uue lingi ka ise portaalist oma e-postiga.' });
      }
      const email = primaryEmail(acc.order);
      if (!core.isValidEmail(email)) return res.status(400).json({ error: 'Kliendil pole e-posti' });
      const portalUrl = await issueClientToken(acc.ref);
      await sendCustomerMail(acc.order, welcomeEmail({ order: acc.order, providerName: provider.name, portalUrl, lang: langOf(acc.order), role: acc.role }), { to: email, replyTo: providerReplyTo(provider) });
      res.status(200).json({ success: true });
    },

    // ---- Schedule ----------------------------------------------
    'POST /api/haldus/schedule': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const acc = await accessOrder(provider, b.orderId);
      if (!acc || acc.role !== 'cleaning') return res.status(404).json({ error: 'Klienti ei leitud' });
      const { ref, order } = acc;

      const s = core.sanitizeSchedule(b.schedule);
      if (s.error) return res.status(400).json({ error: s.error });
      const schedule = s.schedule;

      // Cancel future untouched schedule-generated visits (manually moved ones stay)
      const upcoming = await upcomingBookingsForOrder(ref.id);
      let removed = 0;
      for (const u of upcoming) {
        if (u.source === 'schedule' && !u.rescheduledAt) {
          await db.collection('bookings').doc(u.id).update({ status: 'cancelled', cancelReason: 'Graafik muutus', scheduleSuperseded: true, cancelledAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
          removed += 1;
        }
      }

      const update = {
        schedule: schedule.active === false ? { ...(order.schedule || {}), active: false } : { ...schedule, updatedAt: Timestamp.fromDate(new Date()) },
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (schedule.active !== false) update.package = core.FREQUENCY_TO_PACKAGE[schedule.frequency] || order.package || 'custom';
      await ref.update(update);

      const fresh = { ...order, ...update };
      let created = [];
      let skipped = [];
      if (schedule.active !== false) {
        const r = await syncSchedule({ orderId: ref.id, order: fresh, provider });
        created = r.created; skipped = r.skipped;
      }

      // One summary email listing everything upcoming (new + kept)
      if (b.notify !== false && (created.length || removed)) {
        const all = await upcomingBookingsForOrder(ref.id);
        if (all.length) {
          await notifyOrder(fresh, scheduleEmail({ order: fresh, bookings: all, providerName: provider.name, lang: langOf(order) }), { replyTo: PORTAL_REPLY_TO });
        }
      }
      if (skipped.length) {
        await sendEmail({ to: providerReplyTo(provider) || provider.email, ...providerDigestEmail({ provider, skipped: skipped.map((x) => ({ ...x, customerName: primaryName(order) })) }) });
      }

      res.status(200).json({
        success: true,
        schedule: serializeSchedule(update.schedule),
        created: created.map((c) => serializeBooking(c.id, c)),
        removed,
        skippedHolidays: skipped,
      });
    },

    // ---- Visits ------------------------------------------------
    'POST /api/haldus/visits': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const acc = await accessOrder(provider, b.orderId);
      if (!acc) return res.status(404).json({ error: 'Klienti ei leitud' });
      const { ref, order } = acc;
      if (order.status !== 'paid') return res.status(400).json({ error: 'Klient ei ole aktiivne' });

      let start;
      try { start = new Date(tallinnLocalDateTimeToISOString(b.date, b.time)); } catch { return res.status(400).json({ error: 'Vigane kuupäev või aeg' }); }
      const durationMin = Number.isInteger(Number(b.durationMin)) ? Math.min(600, Math.max(15, Number(b.durationMin))) : (order.schedule?.durationMin || core.SIZE_DEFAULT_DURATION[order.size] || 180);
      const end = new Date(start.getTime() + durationMin * 60000);
      const serviceId = b.serviceId && core.getService(b.serviceId) ? b.serviceId : null;
      // A partner may only add visits of its own trade; the bare "Tavakoristus" (no serviceId) is the housekeeper's
      const visitCat = serviceId ? core.getService(serviceId).category : 'cleaning';
      if (visitCat !== acc.role || !providerServices(provider).includes(visitCat)) {
        return res.status(403).json({ error: 'Saad lisada ainult oma valdkonna visiite' });
      }
      const markCompleted = b.completed === true;

      if (!markCompleted && start < new Date()) return res.status(400).json({ error: 'Aeg on möödas. Möödunud visiidi saad lisada „tehtud“ märkega.' });
      if (markCompleted && start > new Date()) return res.status(400).json({ error: 'Tehtud visiit ei saa olla tulevikus' });

      if (!markCompleted) {
        if (core.isDateAway(order.awayPeriods, b.date) && !b.force) return res.status(409).json({ error: 'Klient on sel päeval eemal', code: 'AWAY', conflicts: [] });
        const conflicts = await slotConflicts(provider.id, ref.id, start, end);
        if (conflicts.length && !b.force) return res.status(409).json({ error: conflictError(conflicts), code: 'CONFLICT', conflicts });
      }

      const booking = await createVisit({
        order, orderId: ref.id, provider, start, durationMin,
        note: str(b.note, 500), customerNote: str(b.customerNote, 300),
        source: 'provider', serviceId, price: str(b.price, 60) || null,
        status: markCompleted ? 'completed' : 'scheduled',
      });

      if (markCompleted) {
        await ref.update({ totalVisits: FieldValue.increment(1), lastVisitAt: Timestamp.fromDate(start), updatedAt: FieldValue.serverTimestamp() });
      } else if (b.notify !== false) {
        await sendVisitNotification('confirmed', { order, booking, provider });
      }

      res.status(200).json({ success: true, booking: serializeBooking(booking.id, booking) });
    },

    'POST /api/haldus/visits/reschedule': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const acc = await accessBooking(provider, b.bookingId);
      if (!acc) return res.status(404).json({ error: 'Visiiti ei leitud' });
      const { ref, booking, order } = acc;

      let start;
      try { start = new Date(tallinnLocalDateTimeToISOString(b.date, b.time)); } catch { return res.status(400).json({ error: 'Vigane kuupäev või aeg' }); }
      const result = await rescheduleVisit({ provider, ref, booking, order, start, durationMin: b.durationMin, note: b.note, force: b.force, notify: b.notify !== false });
      if (result.error) return res.status(result.status).json(result);
      res.status(200).json({ success: true, booking: serializeBooking(ref.id, result.updated) });
    },

    'POST /api/haldus/visits/cancel': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const acc = await accessBooking(provider, b.bookingId);
      if (!acc) return res.status(404).json({ error: 'Visiiti ei leitud' });
      const { ref, booking, order } = acc;
      if (!['scheduled', 'confirmed'].includes(booking.status)) return res.status(400).json({ error: 'Visiit ei ole aktiivne' });

      if (booking.calBookingUid) {
        try { await calService.cancelBooking(booking.calBookingUid, 'Cancelled by provider'); } catch (e) { console.error('Cal.com cancel failed:', e); }
      }
      const reason = str(b.reason, 300);
      await ref.update({ status: 'cancelled', cancelReason: reason || (acc.role === 'cleaning' ? 'Tühistas koduhooldaja' : 'Tühistas partner'), cancelledAt: FieldValue.serverTimestamp(), cancelledBy: 'provider', updatedAt: FieldValue.serverTimestamp() });
      if (booking.requestId) {
        // The request reopens; the thread says why, so the household is not left guessing
        const reqRef = db.collection('serviceRequests').doc(booking.requestId);
        await reqRef.set({ status: 'requested', bookingId: null, scheduledAt: null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        try { await appendRequestMessage(reqRef, { by: 'provider', name: provider.name, text: reason ? `Aeg tühistatud: ${reason}` : 'Aeg tühistatud — pakume uue aja.' }); } catch (e) { console.error('cancel thread note failed', e); }
      }
      if (b.notify !== false) await sendVisitNotification('cancelled', { order, booking, provider, reason });
      res.status(200).json({ success: true });
    },

    'POST /api/haldus/visits/complete': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const acc = await accessBooking(provider, b.bookingId);
      if (!acc) return res.status(404).json({ error: 'Visiiti ei leitud' });
      const { ref, booking, order } = acc;
      if (booking.status === 'completed') return res.status(200).json({ success: true });
      if (booking.status === 'cancelled') return res.status(400).json({ error: 'Tühistatud visiiti ei saa tehtuks märkida' });
      const note = b.note != null ? str(b.note, 500) : '';
      await ref.update({ status: 'completed', completedAt: FieldValue.serverTimestamp(), completedBy: 'provider', ...(b.note != null ? { note } : {}), updatedAt: FieldValue.serverTimestamp() });
      await db.collection('orders').doc(booking.orderId).update({ totalVisits: FieldValue.increment(1), lastVisitAt: booking.scheduledAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      if (booking.requestId) {
        // Close the loop on the request: a line in the thread and a short note to the household
        const reqRef = db.collection('serviceRequests').doc(booking.requestId);
        const reqDoc = await reqRef.get();
        await reqRef.set({ status: 'completed', completedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        const clientNote = str(b.clientNote, 500);
        try {
          await appendRequestMessage(reqRef, { by: 'provider', name: provider.name, text: 'Tehtud.' });
          if (reqDoc.exists && b.notify !== false) {
            await sendCustomerMail(order, requestCompletedEmail({ order, request: reqDoc.data(), requestId: reqRef.id, providerName: provider.name, note: clientNote, lang: langOf(order) }), { replyTo: PORTAL_REPLY_TO });
          }
        } catch (e) { console.error('request completed notice failed', e); }
      }
      res.status(200).json({ success: true });
    },

    'POST /api/haldus/visits/:id/done': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: { et: 'Logi uuesti sisse.', en: 'Sign in again.' } });
      const note = req.body && req.body.note != null ? str(req.body.note, 500) : null;
      const result = await markVisitDone({ provider, visitId: req.visitId, note: note || null });
      res.status(result.status).json(result.body);
    },

    'POST /api/haldus/visits/note': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const acc = await accessBooking(provider, req.body?.bookingId);
      if (!acc) return res.status(404).json({ error: 'Visiiti ei leitud' });
      await acc.ref.update({ note: str(req.body?.note, 500), updatedAt: FieldValue.serverTimestamp() });
      res.status(200).json({ success: true });
    },

    // ---- Service requests --------------------------------------
    'POST /api/haldus/requests/confirm': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const reqRef = db.collection('serviceRequests').doc(docId(b.requestId));
      const reqDoc = await reqRef.get();
      if (!reqDoc.exists || reqDoc.data().providerId !== provider.id) return res.status(404).json({ error: 'Soovi ei leitud' });
      const request = reqDoc.data();
      if (!['requested'].includes(request.status)) return res.status(400).json({ error: 'Soov on juba käsitletud' });
      const acc = await accessOrder(provider, request.orderId);
      if (!acc) return res.status(404).json({ error: 'Klienti ei leitud' });
      const { order } = acc;

      let start;
      try { start = new Date(tallinnLocalDateTimeToISOString(b.date, b.time)); } catch { return res.status(400).json({ error: 'Vigane kuupäev või aeg' }); }
      if (start < new Date()) return res.status(400).json({ error: 'Aeg on möödas' });

      // Reschedule request → move the existing visit instead of creating a new one
      if (request.type === 'reschedule') {
        const target = await accessBooking(provider, request.targetBookingId);
        if (!target) return res.status(404).json({ error: 'Algset visiiti ei leitud (võib olla tühistatud)' });
        const result = await rescheduleVisit({ provider, ref: target.ref, booking: target.booking, order, start, durationMin: b.durationMin, force: b.force, notify: true });
        if (result.error) return res.status(result.status).json(result);
        // The ask was "move my visit" — once moved it is done. The visit itself carries the new time; nothing stays open.
        await reqRef.update({
          status: 'completed', bookingId: target.ref.id, scheduledAt: Timestamp.fromDate(start),
          providerMessage: str(b.message, 300), confirmedAt: FieldValue.serverTimestamp(), completedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        });
        try { await appendRequestMessage(reqRef, { by: 'provider', name: provider.name, text: str(b.message, 300) || `Aeg kinnitatud: ${formatDate(start, 'et')}, ${formatTime(start)}` }); } catch (e) { console.error('confirm thread note failed', e); }
        return res.status(200).json({ success: true, booking: serializeBooking(target.ref.id, result.updated) });
      }

      const svc = core.getService(request.serviceId);
      const durationMin = Number.isInteger(Number(b.durationMin)) && Number(b.durationMin) >= 15 ? Math.min(600, Number(b.durationMin)) : (svc?.durationMin || 60);
      const end = new Date(start.getTime() + Math.max(15, durationMin) * 60000);

      const conflicts = await slotConflicts(provider.id, request.orderId, start, end);
      if (conflicts.length && !b.force) return res.status(409).json({ error: conflictError(conflicts), code: 'CONFLICT', conflicts });

      const price = str(b.price, 60) || null;
      const booking = await createVisit({
        order, orderId: request.orderId, provider, start, durationMin: Math.max(15, durationMin),
        note: str(b.note, 500), customerNote: str(b.message, 300),
        source: 'request', serviceId: request.serviceId, price, requestId: reqRef.id,
      });
      await reqRef.update({
        status: 'confirmed', bookingId: booking.id, scheduledAt: Timestamp.fromDate(start), price,
        providerMessage: str(b.message, 300), confirmedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      try { await appendRequestMessage(reqRef, { by: 'provider', name: provider.name, text: str(b.message, 300) || `Aeg kinnitatud: ${formatDate(start, 'et')}, ${formatTime(start)}` }); } catch (e) { console.error('confirm thread note failed', e); }
      await sendVisitNotification('confirmed', { order, booking, provider });
      res.status(200).json({ success: true, booking: serializeBooking(booking.id, booking) });
    },

    /** The provider writes on a request without closing it — a clarifying question, an update. Client is notified. */
    'POST /api/haldus/requests/message': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const reqRef = db.collection('serviceRequests').doc(docId(b.requestId));
      const reqDoc = await reqRef.get();
      if (!reqDoc.exists || reqDoc.data().providerId !== provider.id) return res.status(404).json({ error: 'Pöördumist ei leitud' });
      if (reqDoc.data().status === 'cancelled') return res.status(400).json({ error: 'Pöördumine on tühistatud — sellele ei saa enam kirjutada' });
      const text = str(b.text, 1500);
      if (text.length < 2) return res.status(400).json({ error: 'Kirjuta sõnum' });
      const acc = await accessOrder(provider, reqDoc.data().orderId);
      if (!acc) return res.status(404).json({ error: 'Klienti ei leitud' });
      await appendRequestMessage(reqRef, { by: 'provider', name: provider.name, text });
      // A written reply on an open request answers it; a follow-up on a handled one keeps its state
      if (reqDoc.data().status === 'requested') await reqRef.update({ status: 'answered', providerMessage: text.slice(0, 300), answeredAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      await sendCustomerMail(acc.order, requestMessageEmail({ toSide: 'client', order: acc.order, request: reqDoc.data(), requestId: reqRef.id, fromName: provider.name, text, lang: langOf(acc.order) }), { replyTo: PORTAL_REPLY_TO });
      const fresh = await reqRef.get();
      res.status(200).json({ success: true, request: serializeRequest(reqRef.id, fresh.data()) });
    },

    /** Answer in writing — questions, or anything that needs no visit. Closes the request as 'answered'. */
    'POST /api/haldus/requests/reply': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const reqRef = db.collection('serviceRequests').doc(docId(b.requestId));
      const reqDoc = await reqRef.get();
      if (!reqDoc.exists || reqDoc.data().providerId !== provider.id) return res.status(404).json({ error: 'Soovi ei leitud' });
      const request = reqDoc.data();
      if (request.status !== 'requested') return res.status(400).json({ error: 'Soov on juba käsitletud' });
      const message = str(b.message, 1500);
      if (message.length < 2) return res.status(400).json({ error: 'Kirjuta vastus' });
      const acc = await accessOrder(provider, request.orderId);
      if (!acc) return res.status(404).json({ error: 'Klienti ei leitud' });
      await reqRef.update({ status: 'answered', providerMessage: message.slice(0, 300), answeredAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      await appendRequestMessage(reqRef, { by: 'provider', name: provider.name, text: message });
      await sendCustomerMail(acc.order, requestAnsweredEmail({ order: acc.order, request, requestId: reqRef.id, providerName: provider.name, message, lang: langOf(acc.order) }), { replyTo: PORTAL_REPLY_TO });
      res.status(200).json({ success: true });
    },

    'POST /api/haldus/requests/decline': async (req, res) => {
      const provider = await authenticateProvider(req);
      if (!provider) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const reqRef = db.collection('serviceRequests').doc(docId(b.requestId));
      const reqDoc = await reqRef.get();
      if (!reqDoc.exists || reqDoc.data().providerId !== provider.id) return res.status(404).json({ error: 'Soovi ei leitud' });
      const request = reqDoc.data();
      if (request.status !== 'requested') return res.status(400).json({ error: 'Soov on juba käsitletud' });
      const acc = await accessOrder(provider, request.orderId);
      if (!acc) return res.status(404).json({ error: 'Klienti ei leitud' });
      const message = str(b.message, 600);
      const kind = requestKind(request);
      // An issue that is not covered is "reviewed", a visit slot that does not fit needs a new time
      const fallback = kind === 'issue' ? 'Kui soovid, tellime töö tasulisena.' : 'Soovitud aeg ei sobi — paku palun uut aega.';
      await reqRef.update({ status: 'declined', outcome: kind === 'issue' ? 'not_covered' : 'new_time', providerMessage: message.slice(0, 300), declinedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      try { await appendRequestMessage(reqRef, { by: 'provider', name: provider.name, text: message || fallback }); } catch (e) { console.error('decline thread note failed', e); }
      await sendCustomerMail(acc.order, requestDeclinedEmail({ order: acc.order, request, requestId: reqRef.id, providerName: provider.name, message, lang: langOf(acc.order) }), { replyTo: PORTAL_REPLY_TO });
      res.status(200).json({ success: true });
    },
  };

  // ============================================================
  // /api/me/** extras — client portal: contacts + lisateenused
  // ============================================================

  /** category → partner id on this order (null = SUKODA operator handles it) */
  async function routeRequest(order) {
    const out = {};
    for (const [cat, def] of Object.entries(core.SERVICE_CATEGORIES)) out[cat] = order[def.orderField] || null;
    return out;
  }

  /**
   * Terms per category on a home: what the developer (or the household's own deal) includes, until when, and what
   * applies after. order.terms = { [category]: { included, until: 'YYYY-MM-DD'|null, quota, after, billedBy } }
   */
  function termsFor(order, category) {
    const t = order?.terms?.[category];
    if (!t || typeof t !== 'object') return null;
    // Optional whitelist: only these service ids are covered (e.g. ['regular'] — the deep clean is still paid)
    const services = Array.isArray(t.services) ? t.services.map(String).filter(Boolean) : null;
    return { included: t.included === true, until: core.parseDateStr(t.until) ? t.until : null, quota: String(t.quota || ''), after: String(t.after || ''), billedBy: String(t.billedBy || ''), services: services && services.length ? services : null };
  }
  /** Do the home's terms cover this specific service (or the category as a whole when no service is given)? */
  function termsCover(tm, svc) {
    if (!tm || !tm.included) return false;
    if (svc && (svc.id === 'deep-clean' || svc.id === 'windows')) return false;
    if (!svc) return true;
    if (tm.services) return tm.services.includes(svc.id);
    if (svc.category === 'cleaning') return false;
    return true;
  }
  /** One line the household reads under a service: “Hinnas sees kuni 14. märts 2027 · 2 h kuus” / “alates 45 €/h · arve Kodulahe Haldus OÜ” */
  function priceLabelFor({ order, category, svc, lang, showPrices }) {
    const et = lang !== 'en';
    const today = todayTallinnStr();
    const tm = termsFor(order, category);
    const fmt = (d) => {
      const date = core.parseDateStr(d);
      if (!date) return d;
      return date.toLocaleDateString(et ? 'et-EE' : 'en-GB', { timeZone: 'Europe/Tallinn', day: 'numeric', month: 'long', year: 'numeric' });
    };
    // A free-text message ("something else", a note to the housekeeper) has no price line at all
    if (svc && (svc.id === 'other' || svc.id === 'cleaning-note')) return { text: '', included: false };
    // A quote-first question (extra works from the builder) shows its hint, not "free"
    if (svc && svc.pricing === 'quote') return { text: svc.priceHint?.[lang] || svc.priceHint?.et || '', included: false };
    if (svc && (svc.kind || 'visit') === 'question') return { text: et ? 'Tasuta' : 'Free', included: true };
    const covered = termsCover(tm, svc);
    if (covered && (!tm.until || tm.until >= today)) {
      // Warranty is not "included in the price" — it is the builder's obligation, until the warranty ends
      const head = category === 'warranty' ? (et ? 'Garantii korras' : 'Under warranty') : (et ? 'Hinnas sees' : 'Included');
      return { text: head + (tm.until ? (et ? ' kuni ' : ' until ') + fmt(tm.until) : '') + (tm.quota ? ' · ' + tm.quota : ''), included: true, until: tm.until, quota: tm.quota, after: tm.after };
    }
    if (covered && tm.until && tm.until < today) {
      return { text: (tm.after || (svc?.priceHint?.[lang] || svc?.priceHint?.et || '')) + (tm.billedBy ? (et ? ' · arve ' : ' · billed by ') + tm.billedBy : ''), included: false, expired: tm.until };
    }
    // Not covered by this home's deal: show the guide price only. The category's invoice
    // (the standing clean, billed by SUKODA) must not appear on an extra before it is confirmed.
    const hint = svc?.priceHint?.[lang] || svc?.priceHint?.et || tm?.after || '';
    return { text: hint, included: false };
  }

  /** “Something else” goes to whoever runs this home: the developer's after-sales team when there is one, otherwise the housekeeper */
  function effectiveCategory(svc, routes) {
    if (svc.id === 'other') {
      if (routes?.building) return 'building';
      if (routes?.warranty) return 'warranty';
    }
    return svc.category;
  }

  /**
   * Hooldusrütm for the portal: live items with state, plus suggestions the home has not added yet.
   * `orderable` per item tells the UI whether "telli tegija" can create a request right now.
   */
  function serializeMaintenance(order, lang, { routes, provider, partners } = {}) {
    const today = todayTallinnStr();
    const homeType = core.HOME_TYPES.includes(order.homeProfile?.homeType) ? order.homeProfile.homeType : null;
    const items = (Array.isArray(order.maintenance) ? order.maintenance : []).map((it) => {
      const svc = it.serviceId ? core.getService(it.serviceId) : null;
      return {
        id: it.id, catalogId: it.catalogId || null, name: core.maintenanceName(it, lang), intervalMonths: it.intervalMonths,
        lastDoneAt: it.lastDoneAt || null, lastDoneBy: it.lastDoneBy || null, nextDueAt: it.nextDueAt, state: core.maintenanceState(it, today), note: it.note || '',
        doneBy: it.doneBy === 'provider' && provider ? 'provider' : 'home',
        serviceId: svc ? svc.id : null, serviceName: svc ? (svc.name[lang] || svc.name.et) : null,
        orderable: !!(svc && routes && routes[svc.category]),
        hint: it.catalogId ? (core.MAINTENANCE_CATALOGUE.find((m) => m.id === it.catalogId)?.hint[lang] || '') : '',
        // Who this lands on: the housekeeper as part of her service, the partner who'd be ordered, or the household
        doer: it.doneBy === 'provider' && provider ? 'provider' : (svc && partners?.[svc.category]) ? 'partner' : 'home',
        doerName: it.doneBy === 'provider' && provider ? provider.name : (svc && partners?.[svc.category]?.name) || null,
        doerCategory: it.doneBy === 'provider' && provider ? 'cleaning' : (svc && partners?.[svc.category]) ? svc.category : null,
      };
    }).sort((a, b) => (a.nextDueAt < b.nextDueAt ? -1 : 1));
    const have = new Set(items.map((i) => i.catalogId).filter(Boolean));
    const suggestions = core.MAINTENANCE_CATALOGUE
      .filter((m) => !have.has(m.id) && (!homeType || m.homeTypes.includes(homeType)))
      .map((m) => ({ id: m.id, name: m.name[lang] || m.name.et, hint: m.hint[lang] || m.hint.et, intervalMonths: m.intervalMonths, houseOnly: !m.homeTypes.includes('apartment'), byProvider: !!m.byProvider }));
    return {
      homeType, items, suggestions, intervals: core.MAINTENANCE_INTERVALS, today,
      remindersEnabled: order.maintenanceReminders !== false,
      // The housekeeper can own items: she gets the reminder, the household gets told when it is done
      provider: provider ? { name: provider.name } : null,
    };
  }

  /** Maintenance for the provider's desk: flat, with state. nameEn follows the desk language toggle. */
  function serializeMaintenanceForProvider(order) {
    const today = todayTallinnStr();
    return (Array.isArray(order.maintenance) ? order.maintenance : []).map((it) => ({
      id: it.id, catalogId: it.catalogId || null, name: core.maintenanceName(it, 'et'), nameEn: core.maintenanceName(it, 'en'), intervalMonths: it.intervalMonths,
      lastDoneAt: it.lastDoneAt || null, lastDoneBy: it.lastDoneBy || null, nextDueAt: it.nextDueAt, state: core.maintenanceState(it, today),
      doneBy: it.doneBy === 'provider' ? 'provider' : 'home', note: it.note || '',
    })).sort((a, b) => (a.nextDueAt < b.nextDueAt ? -1 : 1));
  }

  /**
   * One place for every change to a home's upkeep list, from either side.
   * body: { action: 'add'|'done'|'update'|'remove', itemId?, catalogId?, name?, intervalMonths?, lastDoneAt?, date?, note?, doneBy? }
   * Returns { items, done } or { error, status }. `done` is the completed item when action === 'done'.
   */
  function applyMaintenanceAction(order, b, { by, lang }) {
    const et = lang !== 'en';
    const today = todayTallinnStr();
    const items = Array.isArray(order.maintenance) ? [...order.maintenance] : [];
    const idx = items.findIndex((it) => it.id === String(b.itemId || ''));
    const canAssignProvider = !!order.providerId;
    if (b.action === 'add') {
      if (items.length >= core.MAX_MAINTENANCE_ITEMS) return { error: et ? `Kuni ${core.MAX_MAINTENANCE_ITEMS} kirjet` : `Up to ${core.MAX_MAINTENANCE_ITEMS} items`, status: 400 };
      if (b.catalogId && items.some((it) => it.catalogId === b.catalogId)) return { error: et ? 'See on juba nimekirjas' : 'Already on the list', status: 400 };
      // The provider adds what she does herself; the household adds its own unless it says otherwise
      const doneBy = by === 'provider' ? (b.doneBy === 'home' ? 'home' : 'provider') : (b.doneBy === 'provider' && canAssignProvider ? 'provider' : 'home');
      const r = core.sanitizeMaintenanceItem({ ...b, doneBy }, today);
      if (r.error) return { error: r.error, status: 400 };
      items.push(r.item);
      return { items };
    }
    if (idx < 0) return { error: et ? 'Kirjet ei leitud' : 'Item not found', status: 404 };
    if (b.action === 'done') {
      const r = core.completeMaintenanceItem(items[idx], b.date, today);
      if (r.error) return { error: r.error, status: 400 };
      items[idx] = { ...r.item, lastDoneBy: by };
      return { items, done: items[idx] };
    }
    if (b.action === 'update') {
      const it = { ...items[idx] };
      if (b.intervalMonths != null) {
        const interval = Number(b.intervalMonths);
        if (!core.MAINTENANCE_INTERVALS.includes(interval)) return { error: et ? 'Vali sagedus' : 'Choose an interval', status: 400 };
        it.intervalMonths = interval;
        if (it.lastDoneAt) it.nextDueAt = core.toDateStr(core.addMonths(core.parseDateStr(it.lastDoneAt), interval));
      }
      if (b.note != null) it.note = str(b.note, 200);
      if (b.doneBy === 'home' || (b.doneBy === 'provider' && canAssignProvider)) it.doneBy = b.doneBy;
      items[idx] = { ...it, remindedFor: null };
      return { items };
    }
    if (b.action === 'remove') { items.splice(idx, 1); return { items }; }
    return { error: 'Unknown action', status: 400 };
  }

  /** To the household, when the housekeeper ticks something off: no reminder needed, just "done" */
  function maintenanceDoneEmail({ order, item, provider, lang }) {
    const name = core.maintenanceName(item, lang);
    const when = core.parseDateStr(item.lastDoneAt);
    const next = core.parseDateStr(item.nextDueAt);
    const locale = core.pick({ et: 'et-EE', en: 'en-GB', ru: 'ru-RU' }, lang);
    const nextLabel = next.toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const who = escapeHtml(provider.name);
    const safeName = escapeHtml(name);
    const safeWhen = escapeHtml(formatWhen(when, lang));
    return {
      subject: core.pick({ et: `SUKODA | Tehtud: ${name}`, en: `SUKODA | Done: ${name}`, ru: `SUKODA | Сделано: ${name}` }, lang),
      html: wrap(
        H2(core.pick({ et: 'Tehtud', en: 'Done', ru: 'Сделано' }, lang))
        + P(core.pick({
          et: `${who} märkis tehtuks: <strong style="color:#2C2824;font-weight:normal;">${safeName}</strong> · ${safeWhen}.`,
          en: `${who} marked as done: <strong style="color:#2C2824;font-weight:normal;">${safeName}</strong> · ${safeWhen}.`,
          ru: `${who} отмечает выполненным: <strong style="color:#2C2824;font-weight:normal;">${safeName}</strong> · ${safeWhen}.`,
        }, lang))
        + P(core.pick({
          et: `Järgmine kord umbes ${escapeHtml(nextLabel)}. Sina ei pea midagi tegema — see on kirjas sinu kodu hooldusrütmis.`,
          en: `Next time around ${escapeHtml(nextLabel)}. Nothing for you to do — it is recorded in your home's upkeep rhythm.`,
          ru: `Следующий раз примерно ${escapeHtml(nextLabel)}. Вам ничего делать не нужно — это записано в ритме ухода за домом.`,
        }, lang))
        + `<div style="text-align:center;margin:32px 0;"><a href="${PORTAL_URL}" style="display:inline-block;background:#2C2824;color:#FAF8F5;padding:16px 36px;text-decoration:none;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">${core.pick({ et: 'Ava minu kodu', en: 'Open my home', ru: 'Открыть мой дом' }, lang)}</a></div>`,
        lang,
      ),
    };
  }

  function mailLang(lang) {
    return lang === 'en' ? 'en' : 'et';
  }

  /** Plain lines for the request mail: the new due date, never the one just passed. No access codes. */
  function rhythmPlain(items, lang) {
    const L = core.langOf(lang);
    const nextWord = core.pick({ et: 'järgmine kord', en: 'next time', ru: 'следующий раз' }, L);
    return (items || []).map((it) => {
      const name = core.maintenanceName(it, L);
      const due = it.nextDueAt ? core.parseDateStr(it.nextDueAt) : null;
      const when = due ? formatWhen(due, L) : '';
      return when ? `${name} — ${nextWord} ${when}` : name;
    }).filter(Boolean).join('\n');
  }

  /** HTML lines for the visit-done mail. Same dates as rhythmPlain. */
  function rhythmMovedLines(items, lang) {
    const L = core.langOf(lang);
    const nextWord = core.pick({ et: 'järgmine kord', en: 'next time', ru: 'следующий раз' }, L);
    return (items || []).map((it) => {
      const name = escapeHtml(core.maintenanceName(it, L));
      const due = it.nextDueAt ? core.parseDateStr(it.nextDueAt) : null;
      const when = due ? `${nextWord} ${escapeHtml(formatWhen(due, L))}` : '';
      return `<p style="margin:0 0 8px 0;color:#2C2824;font-size:16px;font-family:Georgia,'Times New Roman',serif;font-weight:300;">${name}${when ? ` <span style="color:#8A8578;font-size:13px;font-family:Helvetica,Arial,sans-serif;">· ${when}</span>` : ''}</p>`;
    }).join('');
  }

  /** Resident notice when a visit is marked done and it was not tied to a request. Same recipients as other visit mail. */
  function visitDoneEmail({ order, provider, note, items, lang }) {
    const L = core.langOf(lang);
    const copy = {
      et: {
        subject: 'SUKODA | Tehtud',
        intro: (who) => `${who} märkis visiidi tehtuks.`,
        moved: 'Need read liikusid sinu kodu hooldusrütmis edasi. Sina ei pea midagi tegema.',
      },
      en: {
        subject: 'SUKODA | Done',
        intro: (who) => `${who} marked the visit done.`,
        moved: 'These moved forward in your home upkeep. Nothing for you to do.',
      },
      ru: {
        subject: 'SUKODA | Сделано',
        intro: (who) => `${who} отметил визит выполненным.`,
        moved: 'Эти пункты сдвинулись в ритме ухода за домом. Вам ничего делать не нужно.',
      },
    }[L];
    const tt = t(L);
    const list = (items || []).length
      ? `<div style="background:#FFFFFF;padding:20px 28px;margin-bottom:20px;border-left:2px solid #B8976A;">${rhythmMovedLines(items, L)}</div>`
        + P(copy.moved)
      : '';
    const html = wrap(
      H2(tt.completedTitle)
      + P(`${tt.hello(escapeHtml(firstName(primaryName(order))))} ${escapeHtml(copy.intro(provider?.name || ''))}`)
      + (note ? P(`${tt.note}: ${escapeHtml(note)}`) : '')
      + list
      + P(tt.completedNote)
      + portalBlock(L),
      L,
      brandOf(order),
    );
    return { subject: brandSubject(order, copy.subject), html };
  }

  /** To the provider: what is due at her clients' homes in the next two weeks, one mail, one line per item */
  function providerMaintenanceReminderEmail({ provider, entries }) {
    const lang = core.langOf(provider);
    const rows = entries.map(({ order, item }) => `<div style="padding:14px 0;border-top:1px solid #E8E3DD;">
        <p style="margin:0 0 2px 0;color:#2C2824;font-size:16px;font-family:Georgia,'Times New Roman',serif;font-weight:300;">${escapeHtml(core.maintenanceName(item, lang))} <span style="color:#B8976A;font-size:13px;font-family:Helvetica,Arial,sans-serif;">· ${escapeHtml(formatWhen(core.parseDateStr(item.nextDueAt), lang))}</span></p>
        <p style="margin:0;color:#8A8578;font-size:13px;">${escapeHtml(primaryName(order) || '')} · ${escapeHtml(primaryAddress(order) || '')}</p>
      </div>`).join('');
    const n = entries.length;
    const one = n === 1 ? `${core.maintenanceName(entries[0].item, lang)} · ${primaryName(entries[0].order)}` : '';
    const deskTitle = core.pick({ et: 'Hooldusrütm su klientide kodudes', en: 'Upkeep at your clients\' homes', ru: 'Ритм ухода в домах клиентов' }, lang);
    const deskBody = core.pick({
      et: `${provider.name || ''}, need asjad, mille oled võtnud enda peale, on järgmise kahe nädala jooksul aeg teha. Kui tehtud, märgi töölaual.`,
      en: `${provider.name || ''}, these are the things you took on, due within two weeks. When done, tick them on the desk.`,
      ru: `${provider.name || ''}, эти дела, которые вы взяли на себя, нужно сделать в ближайшие две недели. Когда сделаете, отметьте на рабочем столе.`,
    }, lang);
    return {
      subject: core.pick({
        et: `SUKODA | Hooldus ees: ${n === 1 ? one : `${n} asja su klientide kodudes`}`,
        en: `SUKODA | Upkeep due: ${n === 1 ? one : `${n} things in your clients' homes`}`,
        ru: `SUKODA | Срок ухода: ${n === 1 ? one : `${n} ${core.ruPlural(n, 'дело', 'дела', 'дел')} в домах клиентов`}`,
      }, lang),
      push: push.message({ type: 'rhythm_due', lang, title: deskTitle, body: deskBody, url: `${HALDUS_URL}?tab=customers`, audience: 'provider' }),
      html: wrap(
        H2(core.pick({ et: 'Hooldusrütm su klientide kodudes', en: 'Upkeep at your clients\' homes', ru: 'Ритм ухода в домах клиентов' }, lang))
        + P(core.pick({
          et: `${escapeHtml(provider.name)}, need asjad, mille oled võtnud enda peale, on järgmise kahe nädala jooksul aeg teha. Kui tehtud, märgi töölaual — klient saab sellest ühe rea teate.`,
          en: `${escapeHtml(provider.name)}, these are the things you took on, due within two weeks. When done, tick them on the desk — the client gets one line.`,
          ru: `${escapeHtml(provider.name)}, эти дела, которые вы взяли на себя, нужно сделать в ближайшие две недели. Когда сделаете, отметьте на рабочем столе — клиент получит одну строку.`,
        }, lang))
        + `<div style="background:#FFFFFF;padding:8px 28px 12px;margin-bottom:28px;border-left:2px solid #B8976A;">${rows}</div>`
        + `<div style="text-align:center;margin:32px 0;"><a href="${HALDUS_URL}?tab=customers" style="display:inline-block;background:#2C2824;color:#FAF8F5;padding:16px 36px;text-decoration:none;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">${core.pick({ et: 'Ava töölaud', en: 'Open the desk', ru: 'Открыть рабочий стол' }, lang)}</a></div>`
        + P(core.pick({ et: 'Iga kirje kohta üks meeldetuletus.', en: 'One reminder per item.', ru: 'Одно напоминание на каждую запись.' }, lang), 'font-size:12px;'),
        lang,
      ),
    };
  }

  function serializeDocuments(order, lang) {
    const row = (d, source) => ({
      id: d.id, title: d.title, url: d.url || null, category: d.category, categoryLabel: core.DOCUMENT_CATEGORIES[d.category]?.[lang] || core.DOCUMENT_CATEGORIES.other[lang], note: d.note || '', addedAt: d.addedAt || null,
      page: Number.isInteger(Number(d.page)) && Number(d.page) > 0 ? Number(d.page) : null,
      source: source || d.source || 'home', sourceName: d.sourceName || '',
      file: d.file ? { name: d.file.name, size: d.file.size || 0, contentType: d.file.contentType || 'application/octet-stream' } : null,
    });
    const inherited = (Array.isArray(order.buildingDocuments) ? order.buildingDocuments : []).map((d) => row(d, 'building'));
    const docs = (Array.isArray(order.documents) ? order.documents : []).map((d) => row(d));
    return { items: inherited.concat(docs), categories: Object.entries(core.DOCUMENT_CATEGORIES).map(([id, c]) => ({ id, label: c[lang] || c.et })) };
  }

  // ---- Home folder files (GCS bucket, uniform access, no public URLs) ----
  const DOCS_BUCKET = 'sukoda-77b52-home-docs';
  const DOC_FILE_MAX_BYTES = 8 * 1024 * 1024;
  const DOC_FILE_TYPES = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
  function docsBucket() { return admin.storage().bucket(DOCS_BUCKET); }
  function safeFileName(name) { return String(name || 'fail').replace(/[^\w.\-äöüõšžÄÖÜÕŠŽ ]+/g, '_').slice(0, 100) || 'fail'; }

  /** Store an uploaded file for a home and return the document entry to push onto order.documents */
  async function storeHomeFile({ orderId, body, source, sourceName }) {
    const contentType = String(body.contentType || '');
    if (!DOC_FILE_TYPES[contentType]) return { error: 'Lubatud on PDF ja pildid (JPG, PNG, WEBP, HEIC)' };
    const base64 = String(body.data || '').replace(/^data:[^;]+;base64,/, '');
    const buf = Buffer.from(base64, 'base64');
    if (!buf.length) return { error: 'Fail on tühi' };
    if (buf.length > DOC_FILE_MAX_BYTES) return { error: 'Fail on suurem kui 8 MB' };
    const r = core.sanitizeDocument({ ...body, url: '' });
    if (r.error) return { error: r.error };
    const doc = r.document;
    const name = safeFileName(body.fileName || `${doc.title}.${DOC_FILE_TYPES[contentType]}`);
    const path = `homes/${orderId}/${doc.id}/${name}`;
    await docsBucket().file(path).save(buf, { contentType, resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
    return { document: { ...doc, source: source || 'home', sourceName: sourceName || '', file: { path, name, size: buf.length, contentType } } };
  }

  /** To the household: what is coming up, one line per item, with a way to get it done from the portal */
  function maintenanceReminderEmail({ order, items, lang }) {
    const rows = items.map((it) => {
      const name = core.maintenanceName(it, lang);
      const due = core.parseDateStr(it.nextDueAt);
      const cat = it.catalogId ? core.MAINTENANCE_CATALOGUE.find((m) => m.id === it.catalogId) : null;
      const hint = cat ? core.pick(cat.hint, lang) : (it.note || '');
      return `<div style="padding:16px 0;border-top:1px solid #E8E3DD;">
        <p style="margin:0 0 4px 0;color:#2C2824;font-size:16px;font-family:Georgia,'Times New Roman',serif;font-weight:300;">${escapeHtml(name)} <span style="color:#B8976A;font-size:13px;font-family:Helvetica,Arial,sans-serif;">· ${escapeHtml(formatWhen(due, lang))}</span></p>
        ${hint ? `<p style="margin:0;color:#8A8578;font-size:13px;line-height:1.6;">${escapeHtml(hint)}</p>` : ''}
      </div>`;
    }).join('');
    const n = items.length;
    const one = core.maintenanceName(items[0], lang);
    const rhythmTitle = core.pick({ et: 'Kodu hooldusrütm', en: 'Home upkeep', ru: 'Ритм ухода за домом' }, lang);
    const rhythmBody = n === 1 ? one : core.pick({ et: `${n} asja sel kuul`, en: `${n} things this month`, ru: `${n} ${core.ruPlural(n, 'дело', 'дела', 'дел')} в этом месяце` }, lang);
    return {
      subject: core.pick({
        et: `SUKODA | Kodu hooldus: ${n === 1 ? one : `${n} asja sel kuul`}`,
        en: `SUKODA | Home upkeep: ${n === 1 ? one : `${n} things this month`}`,
        ru: `SUKODA | Уход за домом: ${n === 1 ? one : `${n} ${core.ruPlural(n, 'дело', 'дела', 'дел')} в этом месяце`}`,
      }, lang),
      push: push.message({ type: 'rhythm_due', lang, title: rhythmTitle, body: rhythmBody, url: PORTAL_URL }),
      html: wrap(
        H2(core.pick({ et: 'Kodu hooldusrütm', en: 'Home upkeep', ru: 'Ритм ухода за домом' }, lang))
        + P(core.pick({
          et: `${escapeHtml(primaryAddress(order) || 'Sinu kodu')} — need asjad on järgmise kahe nädala jooksul aeg üle vaadata. Tee ise ja märgi portaalis tehtuks, või telli tegija sealt samast.`,
          en: `${escapeHtml(primaryAddress(order) || 'Your home')} — these are due within the next two weeks. Do them yourself and tick them off in the portal, or order someone from the same place.`,
          ru: `${escapeHtml(primaryAddress(order) || 'Ваш дом')} — эти дела нужно проверить в ближайшие две недели. Сделайте сами и отметьте в портале, или закажите исполнителя там же.`,
        }, lang))
        + `<div style="background:#FFFFFF;padding:8px 28px 12px;margin-bottom:28px;border-left:2px solid #B8976A;">${rows}</div>`
        + `<div style="text-align:center;margin:32px 0;"><a href="${PORTAL_URL}" style="display:inline-block;background:#2C2824;color:#FAF8F5;padding:16px 36px;text-decoration:none;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">${core.pick({ et: 'Ava minu kodu', en: 'Open my home', ru: 'Открыть мой дом' }, lang)}</a></div>`
        + P(core.pick({
          et: 'Meeldetuletus tuleb iga kirje kohta üks kord. Sageduse saad portaalis muuta või kirje eemaldada.',
          en: 'One reminder per item. Change the interval or remove the item in the portal.',
          ru: 'Напоминание по каждой записи приходит один раз. Интервал можно изменить или запись убрать в портале.',
        }, lang), 'font-size:12px;'),
        lang,
      ),
    };
  }

  /**
   * Daily: households with anything due within 14 days get one e-mail listing all of it.
   * Idempotent per item via remindedFor === nextDueAt; ticking an item off resets it.
   */
  async function sendMaintenanceReminders() {
    const cutoff = todayTallinnStr(14);
    const snap = await db.collection('orders').where('maintenanceNextDue', '<=', cutoff).get();
    let sent = 0;
    const byProvider = new Map(); // providerId → [{ order, item, ref }]
    for (const doc of snap.docs) {
      const order = doc.data();
      if (!['paid', 'cancelling'].includes(order.status)) continue;
      const items = Array.isArray(order.maintenance) ? order.maintenance : [];
      const due = items.filter((it) => it.nextDueAt <= cutoff && it.remindedFor !== it.nextDueAt);
      if (!due.length) continue;
      // Items the housekeeper owns go to her, in one mail across all her homes — the household hears when it is done
      const forProvider = order.providerId ? due.filter((it) => it.doneBy === 'provider') : [];
      const forHome = due.filter((it) => !forProvider.includes(it));
      const marked = new Set();
      if (forHome.length && order.maintenanceReminders !== false) {
        try {
          await notifyOrder(order, maintenanceReminderEmail({ order, items: forHome, lang: langOf(order) }));
          forHome.forEach((it) => marked.add(it.id));
          sent++;
        } catch (e) { console.error('sendMaintenanceReminders failed for', doc.id, e); }
      } else if (forHome.length) {
        forHome.forEach((it) => marked.add(it.id)); // reminders off: skip silently, do not re-check every week
      }
      for (const it of forProvider) {
        if (!byProvider.has(order.providerId)) byProvider.set(order.providerId, []);
        byProvider.get(order.providerId).push({ order, item: it, ref: doc.ref });
      }
      if (marked.size) await doc.ref.update({ maintenance: items.map((it) => (marked.has(it.id) ? { ...it, remindedFor: it.nextDueAt } : it)) });
    }
    let providers = 0;
    for (const [providerId, entries] of byProvider) {
      const provider = await loadProvider(providerId);
      if (!provider) continue;
      try {
        const providerMail = providerMaintenanceReminderEmail({ provider, entries });
        await sendEmail({ to: providerReplyTo(provider) || provider.email, subject: providerMail.subject, html: providerMail.html });
        await deliverMailPush(provider, providerMail);
        providers++;
        const refs = new Map();
        for (const e of entries) { if (!refs.has(e.ref.path)) refs.set(e.ref.path, { ref: e.ref, ids: new Set() }); refs.get(e.ref.path).ids.add(e.item.id); }
        for (const { ref, ids } of refs.values()) {
          const fresh = (await ref.get()).data();
          const items = Array.isArray(fresh.maintenance) ? fresh.maintenance : [];
          await ref.update({ maintenance: items.map((it) => (ids.has(it.id) ? { ...it, remindedFor: it.nextDueAt } : it)) });
        }
      } catch (e) { console.error('sendMaintenanceReminders provider mail failed', providerId, e); }
    }
    console.log(`sendMaintenanceReminders: ${sent} households, ${providers} providers`);
    return { sent, providers };
  }

  const portalHandlers = {
    'GET /api/me/extras': async (req, res) => {
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const { orderId, order } = auth;
      const lang = langOf(order);
      const showPrices = !(order.billing === 'provider' || order.source === 'manual');
      const [provider, reqSnap, interestSnap] = await Promise.all([
        loadProvider(order.providerId),
        db.collection('serviceRequests').where('orderId', '==', orderId).orderBy('createdAt', 'desc').limit(30).get(),
        db.collection('serviceInterests').where('orderId', '==', orderId).get(),
      ]);
      const florist = await loadProvider(floristIdFor(order, provider));
      const routes = await routeRequest(order);
      // Everyone who comes to this home, one entry per category with a named partner
      const partnerDocs = {};
      await Promise.all(Object.entries(routes).filter(([, pid]) => pid).map(async ([cat, pid]) => {
        partnerDocs[cat] = cat === 'cleaning' ? provider : cat === 'flowers' ? florist : await loadProvider(pid);
      }));
      if (!partnerDocs.flowers && florist) partnerDocs.flowers = florist;
      const partners = Object.entries(partnerDocs).filter(([, p]) => p).map(([cat, p]) => ({
        category: cat, label: core.categoryLabel(cat, lang), name: p.name, contactName: p.contactName || '', businessName: p.businessName || '', phone: p.phone || '', email: p.email || '',
      }));
      res.status(200).json({
        viewer: auth.viewer || null,
        partners,
        // Developer after-sales white label: who runs this home's portal (name + project), UI only
        brand: order.brand && order.brand.name ? {
          name: String(order.brand.name), project: String(order.brand.project || ''), tagline: String(order.brand.tagline || ''), warrantyUntil: String(order.brand.warrantyUntil || ''),
          // 24h emergency line for the building (leak, power) — shown only when the developer has set one
          emergencyPhone: String(order.brand.emergencyPhone || ''),
          // Optional project picture (same-origin path or https URL); without it the header runs full width
          image: /^(\/|https:\/\/)/.test(String(order.brand.image || '')) ? String(order.brand.image) : '',
        } : null,
        // Services the household said it would want once a partner exists
        interests: [...new Set(interestSnap.docs.map((d) => d.data().serviceId))],
        contacts: Array.isArray(order.contacts) ? order.contacts : [],
        provider: provider ? { name: provider.name, businessName: provider.businessName || '', phone: provider.phone || '', email: provider.email, leadDays: Number.isInteger(provider.availability?.leadDays) ? provider.availability.leadDays : 14 } : null,
        florist: florist ? { name: florist.name, businessName: florist.businessName || '' } : null,
        source: order.source || 'stripe',
        // Partner-billed customers have prices agreed directly with their housekeeper — no SUKODA price hints
        showPrices,
        // Who handles each category for this home: a named partner, or SUKODA finds one
        // Garden has no place in an apartment unless someone actually offers it
        categories: Object.entries(core.SERVICE_CATEGORIES).filter(([id]) => !(id === 'garden' && order.homeProfile?.homeType === 'apartment' && !routes.garden)).map(([id, c]) => ({
          id, label: c[lang] || c.et,
          partnerName: partnerDocs[id]?.name || null,
          partnerBusiness: partnerDocs[id]?.businessName || '',
          terms: termsFor(order, id),
          priceLabel: priceLabelFor({ order, category: id, svc: null, lang, showPrices }),
          // Without a partner the household can only register interest — nothing is promised
          orderable: !!routes[id],
        })),
        catalogue: core.SERVICE_CATALOGUE.map((s) => ({
          id: s.id, kind: s.kind || 'visit', category: effectiveCategory(s, routes), categoryLabel: core.categoryLabel(effectiveCategory(s, routes), lang), name: s.name[lang] || s.name.et, description: s.description[lang] || s.description.et,
          priceHint: showPrices ? (s.priceHint[lang] || s.priceHint.et) : null, durationMin: s.durationMin,
          priceLabel: priceLabelFor({ order, category: effectiveCategory(s, routes), svc: s, lang, showPrices }),
        })),
        flowers: flowerSettings(order, florist),
        timeWindows: Object.entries(core.TIME_WINDOWS).map(([id, w]) => ({ id, label: w[lang] || w.et })),
        requests: reqSnap.docs.map((d) => {
          const r = serializeRequest(d.id, d.data());
          return { ...r, serviceName: requestName(d.data(), lang), timeWindowLabel: core.timeWindowLabel(r.timeWindow, lang) };
        }),
        maxContacts: core.MAX_CONTACTS,
        maxOpenRequests: MAX_OPEN_REQUESTS,
        away: liveAway(order),
        maxAwayDays: core.MAX_AWAY_DAYS,
        maintenance: serializeMaintenance(order, lang, { routes, provider, partners: partnerDocs }),
        documents: serializeDocuments(order, lang),
      });
    },

    /**
     * Hooldusrütm: add a suggested or custom item, tick one off, change interval, or drop it.
     * body: { action: 'add'|'done'|'update'|'remove', ... }
     */
    'POST /api/me/maintenance': async (req, res) => {
      if (!checkRateLimit(req, res, 'portal-maintenance', 30, 60000)) return;
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const { orderId, order } = auth;
      const lang = langOf(order);
      const b = req.body || {};
      const [routes, provider] = await Promise.all([routeRequest(order), loadProvider(order.providerId)]);
      const ctx = { routes, provider };
      if (b.action === 'reminders') {
        await db.collection('orders').doc(orderId).update({ maintenanceReminders: b.enabled !== false, updatedAt: FieldValue.serverTimestamp() });
        return res.status(200).json({ success: true, maintenance: serializeMaintenance({ ...order, maintenanceReminders: b.enabled !== false }, lang, ctx) });
      }
      const r = applyMaintenanceAction(order, b, { by: 'home', lang });
      if (r.error) return res.status(r.status || 400).json({ error: r.error });
      await db.collection('orders').doc(orderId).update({ maintenance: r.items, maintenanceNextDue: core.maintenanceNextDue(r.items), updatedAt: FieldValue.serverTimestamp() });
      res.status(200).json({ success: true, maintenance: serializeMaintenance({ ...order, maintenance: r.items }, lang, ctx) });
    },

    /** Kodu dokumendid: links (contracts, manuals, warranties, work done) kept with the home */
    'POST /api/me/documents': async (req, res) => {
      if (!checkRateLimit(req, res, 'portal-documents', 30, 60000)) return;
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const { orderId, order } = auth;
      const lang = langOf(order);
      const b = req.body || {};
      let docs = Array.isArray(order.documents) ? [...order.documents] : [];
      if (b.action === 'add') {
        if (docs.length >= core.MAX_DOCUMENTS) return res.status(400).json({ error: lang === 'et' ? `Kuni ${core.MAX_DOCUMENTS} dokumenti` : `Up to ${core.MAX_DOCUMENTS} documents` });
        const r = core.sanitizeDocument(b);
        if (r.error) return res.status(400).json({ error: r.error });
        docs.push(r.document);
      } else if (b.action === 'remove') {
        const gone = docs.find((d) => d.id === String(b.documentId || ''));
        if (!gone) return res.status(404).json({ error: lang === 'et' ? 'Dokumenti ei leitud' : 'Document not found' });
        // The handover folder is the developer's record of the home — the household cannot delete it
        if (gone.source === 'developer') return res.status(403).json({ error: lang === 'et' ? 'Arendaja dokumente saab eemaldada ainult arendaja' : 'Only the developer can remove the developer\'s documents' });
        docs = docs.filter((d) => d !== gone);
        if (gone.file?.path) await docsBucket().file(gone.file.path).delete({ ignoreNotFound: true }).catch((e) => console.warn('doc file delete', e.message));
      } else {
        return res.status(400).json({ error: 'Unknown action' });
      }
      await db.collection('orders').doc(orderId).update({ documents: docs, updatedAt: FieldValue.serverTimestamp() });
      res.status(200).json({ success: true, documents: serializeDocuments({ ...order, documents: docs }, lang) });
    },

    /** Upload a real file into the home's folder. body: { title, category, note, fileName, contentType, data(base64) } */
    'POST /api/me/documents/upload': async (req, res) => {
      if (!checkRateLimit(req, res, 'portal-doc-upload', 20, 60000)) return;
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const { orderId, order } = auth;
      const lang = langOf(order);
      const docs = Array.isArray(order.documents) ? [...order.documents] : [];
      if (docs.length >= core.MAX_DOCUMENTS) return res.status(400).json({ error: lang === 'et' ? `Kuni ${core.MAX_DOCUMENTS} dokumenti` : `Up to ${core.MAX_DOCUMENTS} documents` });
      const r = await storeHomeFile({ orderId, body: req.body || {}, source: 'home', sourceName: auth.viewer?.name || primaryName(order) || '' });
      if (r.error) return res.status(400).json({ error: r.error });
      docs.push(r.document);
      await db.collection('orders').doc(orderId).update({ documents: docs, updatedAt: FieldValue.serverTimestamp() });
      res.status(200).json({ success: true, documents: serializeDocuments({ ...order, documents: docs }, lang) });
    },

    /** Open a file from the home's folder. Token may come as ?token= because the browser opens this in a new tab. */
    'POST /api/me/documents/ask': async (req, res) => {
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const order = auth.order;
      res.status(200).json(homePass.askHome({
        question: req.body?.question,
        facts: order.facts,
        documents: { building: order.buildingDocuments, home: order.documents },
      }));
    },

    'GET /api/me/documents/export': async (req, res) => {
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const zip = homePass.exportZip({ id: auth.orderId, ...auth.order });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="kodu.zip"');
      res.status(200).send(zip);
    },

    'GET /api/me/documents/file': async (req, res) => {
      if (req.query?.token && !req.headers.authorization) req.headers.authorization = `Bearer ${String(req.query.token)}`;
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const doc = (Array.isArray(auth.order.documents) ? auth.order.documents : []).find((d) => d.id === String(req.query?.id || ''));
      if (!doc || !doc.file?.path) return res.status(404).json({ error: 'Not found' });
      const file = docsBucket().file(doc.file.path);
      const [exists] = await file.exists();
      if (!exists) return res.status(404).json({ error: 'File missing' });
      res.setHeader('Content-Type', doc.file.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.file.name || 'fail')}"`);
      res.setHeader('Cache-Control', 'private, no-store');
      await new Promise((resolve, reject) => file.createReadStream().on('error', reject).on('end', resolve).pipe(res));
    },

    /** Home type drives which upkeep is suggested (gutters and chimney only make sense for a house) */
    'POST /api/me/home-type': async (req, res) => {
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const { orderId, order } = auth;
      const homeType = String(req.body?.homeType || '');
      if (!core.HOME_TYPES.includes(homeType)) return res.status(400).json({ error: 'Unknown home type' });
      await db.collection('orders').doc(orderId).update({ 'homeProfile.homeType': homeType, updatedAt: FieldValue.serverTimestamp() });
      const [routes, provider] = await Promise.all([routeRequest(order), loadProvider(order.providerId)]);
      res.status(200).json({ success: true, maintenance: serializeMaintenance({ ...order, homeProfile: { ...(order.homeProfile || {}), homeType } }, langOf(order), { routes, provider }) });
    },

    'POST /api/me/away': async (req, res) => {
      if (!checkRateLimit(req, res, 'portal-away', 10, 60000)) return;
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const { orderId, order } = auth;
      if (order.status !== 'paid') return res.status(400).json({ error: langOf(order) === 'et' ? 'Tellimus ei ole aktiivne' : 'Order is not active' });
      const provider = await loadProvider(order.providerId);
      const r = await addAwayPeriod({ orderRef: db.collection('orders').doc(orderId), order, input: req.body || {}, provider, by: 'customer' });
      if (r.error) return res.status(r.status || 400).json({ error: r.error });
      res.status(200).json({ success: true, ...r, away: liveAway({ ...order, awayPeriods: [...(order.awayPeriods || []), { ...r.period }] }) });
    },

    'POST /api/me/away/remove': async (req, res) => {
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const { orderId, order } = auth;
      const provider = await loadProvider(order.providerId);
      const r = await removeAwayPeriod({ orderRef: db.collection('orders').doc(orderId), order, periodId: String(req.body?.periodId || ''), provider, by: 'customer' });
      if (r.error) return res.status(r.status || 400).json({ error: r.error });
      res.status(200).json({ success: true, ...r });
    },

    'POST /api/me/contacts': async (req, res) => {
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const { orderId, order } = auth;
      const c = core.sanitizeContacts(req.body?.contacts);
      if (c.error) return res.status(400).json({ error: c.error });
      const contacts = c.contacts.filter((x) => x.email !== primaryEmail(order));
      await db.collection('orders').doc(orderId).update({ contacts, contactEmails: contactEmailsOf(contacts), updatedAt: FieldValue.serverTimestamp() });
      res.status(200).json({ success: true, contacts });
    },

    'POST /api/me/requests/quote': async (req, res) => {
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const today = todayTallinnStr();
      const svc = req.body?.serviceId ? core.getService(String(req.body.serviceId)) : null;
      const hint = svc ? core.pick(svc.priceHint, langOf(auth.order)) : '';
      const fromHint = core.guidePriceCents(hint);
      const raw = req.body?.priceCents;
      const priceCents = raw == null || raw === '' ? fromHint : raw;
      let lead = 14;
      if (auth.order.providerId) {
        const providerSnap = await db.collection('providers').doc(auth.order.providerId).get();
        const saved = providerSnap.exists ? providerSnap.data()?.availability?.leadDays : null;
        if (Number.isInteger(saved)) lead = saved;
      }
      const split = core.splitVisitPayment({
        priceCents,
        sponsorCentsAvailable: core.sponsorRemainingCents(auth.order.sponsor, today),
        ownerKind: core.ownerKindOf(auth.order),
        payInApp: true,
      });
      res.status(200).json({
        ...split,
        priced: fromHint != null || (raw != null && raw !== ''),
        earliest: core.earliestBookableDate(today, lead),
        reason: 'preview',
      });
    },

    'POST /api/me/requests': async (req, res) => {
      if (!checkRateLimit(req, res, 'portal-requests', 10, 60000)) return;
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const { orderId, order } = auth;
      const lang = langOf(order);
      const b = req.body || {};

      const svc = core.getService(b.serviceId);
      if (!svc) return res.status(400).json({ error: 'Unknown service' });
      if (order.status !== 'paid') return res.status(400).json({ error: lang === 'et' ? 'Tellimus ei ole aktiivne' : 'Order is not active' });

      let preferredDate = null;
      if (b.preferredDate) {
        const d = core.parseDateStr(b.preferredDate);
        if (!d) return res.status(400).json({ error: 'Invalid preferredDate' });
        const today = todayTallinnStr(0);
        const max = todayTallinnStr(120);
        if (b.preferredDate < today) return res.status(400).json({ error: lang === 'et' ? 'Kuupäev on möödas' : 'Date is in the past' });
        if (b.preferredDate > max) return res.status(400).json({ error: lang === 'et' ? 'Vali kuupäev järgmise 4 kuu sees' : 'Pick a date within the next 4 months' });
        preferredDate = b.preferredDate;
      }
      const timeWindow = core.TIME_WINDOWS[b.timeWindow] ? b.timeWindow : 'any';
      const note = str(b.note, 500);
      const access = str(b.access, 400);
      const urgent = b.urgent === true;
      const kind = svc.kind || 'visit';
      if ((svc.id === 'other' || kind !== 'visit') && note.length < 5) return res.status(400).json({ error: lang === 'et' ? (kind === 'question' ? 'Kirjuta palun oma küsimus' : 'Kirjelda palun, mis ja kus') : (kind === 'question' ? 'Please write your question' : 'Please describe what and where') });
      if (kind === 'question') preferredDate = null;

      const openSnap = await db.collection('serviceRequests').where('orderId', '==', orderId).where('status', '==', 'requested').get();
      if (openSnap.size >= MAX_OPEN_REQUESTS) return res.status(429).json({ error: lang === 'et' ? 'Sul on juba mitu ootel soovi. Oota kinnitust või tühista mõni.' : 'You already have several pending requests.' });

      const routes = await routeRequest(order);
      const category = effectiveCategory(svc, routes);
      const providerId = routes[category] || null;
      if (!providerId) {
        // No partner for this category yet: record interest so SUKODA learns demand; the customer is told nothing is booked
        const existing = await db.collection('serviceInterests').where('orderId', '==', orderId).where('serviceId', '==', svc.id).limit(1).get();
        if (existing.empty) {
          await db.collection('serviceInterests').add({ orderId, serviceId: svc.id, category, note, customerName: primaryName(order) || '', customerEmail: primaryEmail(order), address: primaryAddress(order), city: order.customer?.city || '', lang, createdAt: FieldValue.serverTimestamp() });
          const who = escapeHtml(primaryName(order) || primaryEmail(order));
          await sendEmail({
            to: NOTIFICATION_EMAIL,
            subject: `SUKODA | Huvi: ${core.serviceName(svc.id, 'et')} — ${primaryName(order) || primaryEmail(order)}`,
            html: wrap(H2('Huvi lisateenuse vastu') + P(`${who} (${escapeHtml(primaryAddress(order) || '')}) soovib tulevikus: <strong>${escapeHtml(core.serviceName(svc.id, 'et'))}</strong>.${note ? ' Märkus: ' + escapeHtml(note) : ''}`) + P('Selles kategoorias pole kodul veel partnerit. Kui leiad tegija, määra ta admin-konsoolis ja anna kliendile teada.', 'font-size:12px;'), 'et'),
          });
        }
        return res.status(200).json({ success: true, interest: true, serviceId: svc.id });
      }
      const provider = await loadProvider(providerId);
      if (preferredDate && kind === 'visit' && svc.category === 'cleaning' && !urgent) {
        const earliest = core.earliestBookableDate(todayTallinnStr(), provider?.availability?.leadDays);
        if (earliest && preferredDate < earliest) {
          return res.status(400).json({ error: core.pick({
            et: `Esimene vaba päev on ${earliest}.`,
            en: `The first open day is ${earliest}.`,
            ru: `Первый свободный день — ${earliest}.`,
          }, lang) });
        }
      }

      const firstMsg = note ? [{ id: core.randomId(), by: 'client', name: primaryName(order) || '', text: note, at: new Date() }] : [];
      const data = {
        orderId,
        providerId: providerId || null,
        providerName: provider?.name || null,
        customerName: primaryName(order) || '',
        customerEmail: primaryEmail(order),
        customerPhone: order.customer?.phone || '',
        address: primaryAddress(order),
        serviceId: svc.id,
        category,
        preferredDate,
        timeWindow,
        note,
        access,
        urgent,
        messages: firstMsg,
        status: 'requested',
        lang,
        source: 'portal',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      const ref = await db.collection('serviceRequests').add(data);
      const request = { ...data, createdAt: new Date() };

      // Instant confirmation to the customer (primary only — contacts get the confirmed time later). Replies go to the partner; the thread lives in the portal.
      await sendCustomerMail(order, requestReceivedEmail({ order, request, requestId: ref.id, providerName: provider?.name || '', lang }), { replyTo: PORTAL_REPLY_TO });
      // Provider (or operator when unrouted) + operator copy
      const providerMail = providerNewRequestEmail({ order, request });
      const providerTo = providerReplyTo(provider);
      if (providerTo) {
        await sendEmail({ to: providerTo, ...providerMail });
        await deliverMailPush(provider, providerMail);
      }
      if (providerTo !== NOTIFICATION_EMAIL) await sendEmail({ to: NOTIFICATION_EMAIL, ...providerMail, subject: `${providerMail.subject}${providerTo ? '' : ' (suunamata — SUKODA käsitleb)'}` });

      res.status(200).json({
        success: true,
        request: { ...serializeRequest(ref.id, request), serviceName: core.serviceName(svc.id, lang), createdAt: new Date().toISOString() },
        providerName: provider?.name || null,
      });
    },

    /** Partner-managed visit: customer proposes a new time, provider confirms */
    'POST /api/me/requests/reschedule': async (req, res) => {
      if (!checkRateLimit(req, res, 'portal-requests', 10, 60000)) return;
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const { orderId, order } = auth;
      const lang = langOf(order);
      const b = req.body || {};

      const bookingRef = db.collection('bookings').doc(docId(b.bookingId));
      const bookingDoc = await bookingRef.get();
      if (!bookingDoc.exists || bookingDoc.data().orderId !== orderId) return res.status(404).json({ error: 'Booking not found' });
      const booking = bookingDoc.data();
      if (!['scheduled', 'confirmed'].includes(booking.status)) return res.status(400).json({ error: lang === 'et' ? 'Seda visiiti ei saa enam muuta' : 'This visit can no longer be changed' });
      const providerId = booking.providerId || order.providerId || null;
      if (!providerId) return res.status(400).json({ error: lang === 'et' ? 'Sellel visiidil pole koduhooldajat määratud. Kirjuta tere@sukoda.ee.' : 'No provider is assigned to this visit. Contact tere@sukoda.ee.' });

      const d = core.parseDateStr(b.preferredDate);
      if (!d) return res.status(400).json({ error: 'Invalid preferredDate' });
      if (b.preferredDate < todayTallinnStr(0)) return res.status(400).json({ error: lang === 'et' ? 'Kuupäev on möödas' : 'Date is in the past' });
      const timeWindow = core.TIME_WINDOWS[b.timeWindow] && b.timeWindow !== 'with-visit' ? b.timeWindow : 'any';

      // One open reschedule request per visit
      const open = await db.collection('serviceRequests').where('orderId', '==', orderId).where('status', '==', 'requested').get();
      if (open.docs.some((x) => x.data().type === 'reschedule' && x.data().targetBookingId === bookingRef.id)) {
        return res.status(409).json({ error: lang === 'et' ? 'Sellel visiidil on juba aja muutmise soov ootel' : 'A reschedule request for this visit is already pending' });
      }

      const provider = await loadProvider(providerId);
      const data = {
        type: 'reschedule',
        orderId,
        providerId,
        providerName: provider?.name || null,
        targetBookingId: bookingRef.id,
        targetScheduledAt: booking.scheduledAt || null,
        customerName: primaryName(order) || '',
        customerEmail: primaryEmail(order),
        customerPhone: order.customer?.phone || '',
        address: booking.address || primaryAddress(order),
        serviceId: null,
        // A partner visit (warranty call, handyman) keeps its own category so the desk and the portal colour it right
        category: core.getService(booking.serviceId)?.category || 'cleaning',
        preferredDate: b.preferredDate,
        timeWindow,
        note: str(b.note, 500),
        status: 'requested',
        lang,
        source: 'portal',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      const ref = await db.collection('serviceRequests').add(data);
      const request = { ...data, createdAt: new Date() };

      await sendCustomerMail(order, requestReceivedEmail({ order, request, requestId: ref.id, providerName: provider?.name || '', lang }), { replyTo: PORTAL_REPLY_TO });
      const providerMail = providerNewRequestEmail({ order, request });
      const providerTo = providerReplyTo(provider) || NOTIFICATION_EMAIL;
      await sendEmail({ to: providerTo, ...providerMail });
      if (provider) await deliverMailPush(provider, providerMail);

      res.status(200).json({ success: true, request: { ...serializeRequest(ref.id, request), serviceName: requestName(request, lang), createdAt: new Date().toISOString() }, providerName: provider?.name || null });
    },

    /** The household writes on its own request; the provider is notified and answers from the desk */
    'POST /api/me/requests/message': async (req, res) => {
      if (!checkRateLimit(req, res, 'portal-req-msg', 30, 60000)) return;
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const { orderId, order } = auth;
      const ref = db.collection('serviceRequests').doc(docId(req.body?.requestId));
      const doc = await ref.get();
      if (!doc.exists || doc.data().orderId !== orderId) return res.status(404).json({ error: 'Not found' });
      const text = str(req.body?.text, 1500);
      if (text.length < 2) return res.status(400).json({ error: langOf(order) === 'et' ? 'Kirjuta sõnum' : 'Write a message' });
      const r = doc.data();
      if (r.status === 'cancelled') return res.status(400).json({ error: langOf(order) === 'et' ? 'See pöördumine on tühistatud' : 'This request is cancelled' });
      const name = auth.viewer?.name || primaryName(order) || '';
      const msg = await appendRequestMessage(ref, { by: 'client', name, text });
      // A follow-up on an answered or declined request puts it back on the partner's desk
      if (r.status === 'answered' || r.status === 'declined') {
        await ref.update({ status: 'requested', updatedAt: FieldValue.serverTimestamp() });
      }
      const provider = await loadProvider(r.providerId);
      const to = providerReplyTo(provider) || NOTIFICATION_EMAIL;
      await sendEmail({ to, ...requestMessageEmail({ toSide: 'provider', order, request: r, fromName: name, text, lang: 'et' }) });
      const fresh = await ref.get();
      res.status(200).json({ success: true, request: { ...serializeRequest(ref.id, fresh.data()), serviceName: requestName(fresh.data(), langOf(order)) }, message: { ...msg, at: msg.at.toISOString() } });
    },

    'POST /api/me/requests/cancel': async (req, res) => {
      const auth = await authenticateClient(req);
      if (!auth) return res.status(401).json({ error: 'Unauthorized' });
      const { orderId, order } = auth;
      const ref = db.collection('serviceRequests').doc(docId(req.body?.requestId));
      const doc = await ref.get();
      if (!doc.exists || doc.data().orderId !== orderId) return res.status(404).json({ error: 'Not found' });
      const r = doc.data();
      if (r.status !== 'requested') return res.status(400).json({ error: langOf(order) === 'et' ? 'Kinnitatud soovi tühistamiseks kirjuta pöördumise juurde — meeskond tühistab aja' : 'To cancel a confirmed request, write on the request — the team will cancel the time' });
      await ref.update({ status: 'cancelled', cancelledAt: FieldValue.serverTimestamp(), cancelledBy: 'client', updatedAt: FieldValue.serverTimestamp() });
      const provider = await loadProvider(r.providerId);
      const to = providerReplyTo(provider) || NOTIFICATION_EMAIL;
      await sendEmail({ to, subject: `SUKODA | Soov tühistatud: ${requestName(r, 'et')} — ${r.customerName || r.customerEmail}`, html: providerWrap('Soov tühistatud', `${escapeHtml(r.customerName || 'Klient')} tühistas oma soovi „${escapeHtml(requestName(r, 'et'))}“. Midagi teha ei ole vaja.`, '') });
      res.status(200).json({ success: true });
    },
  };

  // ============================================================
  // /api/admin/providers — operator management
  // ============================================================

  const adminHandlers = {
    'GET /api/admin/providers': async (req, res) => {
      if (!authenticateAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const snap = await db.collection('providers').orderBy('createdAt', 'desc').limit(200).get();
      const providers = snap.docs.map((d) => serializeProvider({ id: d.id, ...d.data() }));
      // customer counts
      const counts = {};
      const orders = await db.collection('orders').where('status', 'in', ['paid', 'cancelling']).get();
      for (const d of orders.docs) {
        const o = d.data();
        if (o.providerId) counts[o.providerId] = (counts[o.providerId] || 0) + 1;
        if (o.floristId) counts[o.floristId] = (counts[o.floristId] || 0) + 1;
      }
      res.status(200).json({ providers: providers.map((p) => ({ ...p, customerCount: counts[p.id] || 0 })) });
    },

    /** Terms per category on a home (what is included, until when, what applies after, who bills) */
    'POST /api/admin/home-terms': async (req, res) => {
      if (!authenticateAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const orderRef = db.collection('orders').doc(docId(b.orderId));
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) return res.status(404).json({ error: 'Kodu ei leitud' });
      const input = b.terms && typeof b.terms === 'object' ? b.terms : {};
      const terms = {};
      for (const cat of Object.keys(core.SERVICE_CATEGORIES)) {
        const t = input[cat];
        if (!t || typeof t !== 'object') continue;
        const until = core.parseDateStr(t.until) ? t.until : null;
        const cleaned = { included: t.included === true, until, quota: str(t.quota, 80), after: str(t.after, 120), billedBy: str(t.billedBy, 120) };
        // Optional whitelist of covered service ids (e.g. only the regular clean is included, not the deep clean)
        const knownSvc = (s) => s && (s === 'regular' || core.getService(s)); // 'regular' = the scheduled clean itself (not a catalogue extra)
        const services = Array.isArray(t.services) ? t.services.map((s) => str(s, 40)).filter(knownSvc) : (typeof t.services === 'string' ? t.services.split(',').map((s) => s.trim()).filter(knownSvc) : []);
        if (services.length) cleaned.services = services;
        if (cleaned.included || cleaned.quota || cleaned.after || cleaned.billedBy) terms[cat] = cleaned;
      }
      await orderRef.update({ terms, updatedAt: FieldValue.serverTimestamp() });
      res.status(200).json({ success: true, terms });
    },

    'POST /api/admin/providers': async (req, res) => {
      if (!authenticateAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const name = str(b.name, 120);
      const email = core.normalizeEmail(b.email);
      if (!name) return res.status(400).json({ error: 'Nimi on kohustuslik' });
      if (!core.isValidEmail(email)) return res.status(400).json({ error: 'Korrektne e-post on kohustuslik' });
      const dup = await db.collection('providers').where('email', '==', email).limit(1).get();
      if (!dup.empty) return res.status(409).json({ error: 'Selle e-postiga partner on juba olemas', providerId: dup.docs[0].id });
      const services = Array.isArray(b.services) ? b.services.filter((s) => Object.keys(core.SERVICE_CATEGORIES).includes(s) || s === 'other') : ['cleaning'];
      const ref = await db.collection('providers').add({
        name, email, phone: str(b.phone, 40), businessName: str(b.businessName, 160),
        notifyEmail: email, services: services.length ? services : ['cleaning'], status: 'active', lang: 'et',
        createdBy: 'admin', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      let inviteUrl = null;
      if (b.sendInvite !== false) inviteUrl = await sendProviderMagicLink(await ref.get());
      const doc = await ref.get();
      res.status(200).json({ success: true, provider: serializeProvider({ id: doc.id, ...doc.data() }), inviteUrl });
    },

    'POST /api/admin/providers/invite': async (req, res) => {
      if (!authenticateAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const doc = await db.collection('providers').doc(docId(req.body?.providerId)).get();
      if (!doc.exists) return res.status(404).json({ error: 'Partnerit ei leitud' });
      const url = await sendProviderMagicLink(doc);
      res.status(200).json({ success: true, inviteUrl: url });
    },

    'POST /api/admin/providers/update': async (req, res) => {
      if (!authenticateAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const ref = db.collection('providers').doc(docId(b.providerId));
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: 'Partnerit ei leitud' });
      const update = { updatedAt: FieldValue.serverTimestamp() };
      if (b.name != null) update.name = str(b.name, 120);
      if (b.phone != null) update.phone = str(b.phone, 40);
      if (b.businessName != null) update.businessName = str(b.businessName, 160);
      if (b.status != null) update.status = b.status === 'disabled' ? 'disabled' : 'active';
      if (Array.isArray(b.services)) update.services = b.services.filter((s) => Object.keys(core.SERVICE_CATEGORIES).includes(s) || s === 'other');
      if (update.status === 'disabled') { update.sessionTokenHash = FieldValue.delete(); update.sessionTokenExpiresAt = FieldValue.delete(); }
      await ref.update(update);
      res.status(200).json({ success: true });
    },

    // ---- Invitation cards (kutsekaardid) per provider -----------
    'GET /api/admin/providers/cards': async (req, res) => {
      if (!authenticateAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const providerId = docId(req.query.providerId);
      const all = await loadPhysicalCards();
      const free = all.filter((c) => cardState(c.card) === 'free').length;
      const cards = providerId !== 'missing-id' ? await loadProviderCards(providerId) : [];
      res.status(200).json({ cards, freeCount: free, totalCount: all.length });
    },

    /** Assign printed cards to a provider: { providerId, codes?: string[] | string, count?: number } */
    'POST /api/admin/providers/cards': async (req, res) => {
      if (!authenticateAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const provider = await loadProvider(docId(b.providerId));
      if (!provider) return res.status(404).json({ error: 'Partnerit ei leitud' });
      const codes = Array.isArray(b.codes) ? b.codes : String(b.codes || '').split(/[\s,;]+/);
      const cleaned = codes.map((c) => String(c || '').trim()).filter(Boolean);
      const count = parseInt(b.count, 10) || 0;
      if (!cleaned.length && count <= 0) return res.status(400).json({ error: 'Anna koodid või vabade kaartide arv' });
      const { assigned, errors } = await assignCards({ provider, codes: cleaned, count });
      res.status(200).json({ success: true, assigned, errors, cards: await loadProviderCards(provider.id) });
    },

    /** Take an unused card back from a provider: { providerId, code } (body or query) */
    'DELETE /api/admin/providers/cards': async (req, res) => {
      if (!authenticateAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const b = { ...(req.query || {}), ...(req.body || {}) };
      const code = normalizeCardCode(b.code);
      const found = await findCardByCode(code);
      if (!found || !isPhysicalCard(found.card)) return res.status(404).json({ error: 'Koodi ei leitud' });
      if (cardState(found.card) === 'used') return res.status(409).json({ error: 'Kasutatud kaarti ei saa eemaldada' });
      if (b.providerId && found.card.assignedProviderId && found.card.assignedProviderId !== String(b.providerId)) return res.status(409).json({ error: 'Kaart on määratud teisele partnerile' });
      await found.ref.update({ assignedProviderId: FieldValue.delete(), assignedProviderName: FieldValue.delete(), assignedAt: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
      res.status(200).json({ success: true, code });
    },

    'POST /api/admin/assign-provider': async (req, res) => {
      if (!authenticateAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      const b = req.body || {};
      const orderRef = db.collection('orders').doc(docId(b.orderId));
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) return res.status(404).json({ error: 'Tellimust ei leitud' });
      // role = any service category; the order field comes from the category definition
      const role = core.SERVICE_CATEGORIES[b.role] ? b.role : 'cleaning';
      const field = core.SERVICE_CATEGORIES[role].orderField;
      const nameField = core.SERVICE_CATEGORIES[role].nameField || `${role}Name`;

      let provider = null;
      if (b.providerId) {
        provider = await loadProvider(String(b.providerId));
        if (!provider) return res.status(404).json({ error: 'Partnerit ei leitud' });
      }
      await orderRef.update({
        [field]: provider ? provider.id : null,
        [nameField]: provider ? provider.name : null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Backfill providerId on this order's upcoming visits so they show in the provider's calendar
      let touched = 0;
      let upcoming = [];
      if (role === 'cleaning') {
        upcoming = await upcomingBookingsForOrder(orderRef.id);
        for (const u of upcoming) {
          await db.collection('bookings').doc(u.id).update({ providerId: provider ? provider.id : null, providerName: provider ? provider.name : null, updatedAt: FieldValue.serverTimestamp() });
          touched += 1;
        }
      }

      // Optional: introduce the provider to the household — portal link to the customer,
      // upcoming times (with calendar links) to everyone, both replying to the provider.
      let notified = false;
      if (b.notify === true && provider && role === 'cleaning') {
        const order = { ...orderDoc.data(), providerId: provider.id, providerName: provider.name };
        const lang = langOf(order);
        const portalUrl = await issueClientToken(orderRef);
        await sendCustomerMail(order, welcomeEmail({ order, providerName: provider.name, portalUrl, lang, role }), { replyTo: providerReplyTo(provider) });
        if (upcoming.length) {
          await notifyOrder(order, scheduleEmail({ order, bookings: upcoming.map((u) => ({ ...u, providerName: provider.name })), providerName: provider.name, lang }), { replyTo: PORTAL_REPLY_TO });
        }
        notified = true;
      }
      res.status(200).json({ success: true, updatedBookings: touched, notified });
    },
  };

  // ============================================================
  // Cron: keep schedule-generated visits topped up (daily 07:00 Tallinn)
  // ============================================================

  const generateScheduledVisits = functions
    .runWith({ secrets: SECRETS }).region('europe-west1')
    .pubsub.schedule('0 7 * * *')
    .timeZone('Europe/Tallinn')
    .onRun(async () => {
      const snap = await db.collection('orders').where('schedule.active', '==', true).get();
      if (snap.empty) { console.log('generateScheduledVisits: nothing to do'); return null; }
      const providerCache = {};
      const digest = {}; // providerId → skipped[]
      for (const doc of snap.docs) {
        const order = doc.data();
        if (order.status !== 'paid' || order.pausedAt) continue;
        try {
          if (order.providerId && !providerCache[order.providerId]) providerCache[order.providerId] = await loadProvider(order.providerId);
          const provider = providerCache[order.providerId] || null;
          const { created, skipped } = await syncSchedule({ orderId: doc.id, order, provider });
          if (created.length) {
            await notifyOrder(order, scheduleEmail({ order, bookings: created, providerName: provider?.name || '', lang: langOf(order) }), { replyTo: PORTAL_REPLY_TO });
            console.log(`generateScheduledVisits: ${doc.id} +${created.length}`);
          }
          if (skipped.length && provider) {
            digest[provider.id] = digest[provider.id] || [];
            for (const s of skipped) digest[provider.id].push({ ...s, customerName: primaryName(order) });
          }
        } catch (e) {
          console.error(`generateScheduledVisits failed for ${doc.id}:`, e);
        }
      }
      for (const [providerId, skipped] of Object.entries(digest)) {
        const provider = providerCache[providerId];
        // Only nag once per skipped date: remember in provider doc
        const seen = new Set(provider.holidayNoticesSent || []);
        const fresh = skipped.filter((s) => !seen.has(`${s.date}`));
        if (!fresh.length) continue;
        await sendEmail({ to: providerReplyTo(provider) || provider.email, ...providerDigestEmail({ provider, skipped: fresh }) });
        await db.collection('providers').doc(providerId).update({ holidayNoticesSent: [...seen, ...fresh.map((s) => s.date)].slice(-50) });
      }
      return null;
    });

  // Cron: florist orders ahead of visits (daily 09:00 Tallinn, after the schedule top-up at 07:00)
  const sendFlowerOrdersJob = functions
    .runWith({ secrets: SECRETS }).region('europe-west1')
    .pubsub.schedule('0 9 * * *')
    .timeZone('Europe/Tallinn')
    .onRun(async () => { await sendFlowerOrders(); return null; });

  // Cron: home upkeep reminders (Mondays 08:00 Tallinn — one calm list at the start of the week)
  const sendMaintenanceRemindersJob = functions
    .runWith({ secrets: SECRETS }).region('europe-west1')
    .pubsub.schedule('0 8 * * 1')
    .timeZone('Europe/Tallinn')
    .onRun(async () => { await sendMaintenanceReminders(); return null; });

  return {
    billing,
    sendProviderMagicLink,
    functions: {
      haldusApi: router(haldusHandlers, { rateLimitName: 'haldus', rateLimitMax: 120 }),
      portalExtrasApi: router(portalHandlers, { rateLimitName: 'portal-extras', rateLimitMax: 60 }),
      adminProvidersApi: router(adminHandlers, { rateLimitName: 'admin-providers', rateLimitMax: 60 }),
      lunastaApi: router(lunastaHandlers, { rateLimitName: 'lunasta', rateLimitMax: 30 }),
      generateScheduledVisits,
      sendFlowerOrders: sendFlowerOrdersJob,
      sendMaintenanceReminders: sendMaintenanceRemindersJob,
    },
    // Helpers reused by index.js
    sendVisitNotification,
    resolveRecipients: core.resolveRecipients,
    serializeBooking,
    loadProvider,
  };
};
