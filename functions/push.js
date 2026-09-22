/**
 * Five push notifications. Title and body are the same sentences as the
 * resident or desk e-mail for that event. Missing language falls back to et.
 *
 * Without an FCM key the send logs and returns; it does not throw.
 * Cron stays where it is: only notifyOrder opts in, and only for a known type.
 */

const core = require('./lib/haldus-core');

const TYPES = ['morning', 'new_request', 'visit_tomorrow', 'rhythm_due', 'request_status'];

function ruHomes(n) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return 'дом';
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'дома';
  return 'домов';
}

function line(lang, text) {
  const value = core.pick(text, core.langOf(lang));
  return typeof value === 'function' ? value() : value;
}

/** Same subject and first sentence as the visit reminder e-mail. */
function visitTomorrow(vars) {
  const p = vars.providerName || '';
  const category = vars.category || 'cleaning';
  const intro = {
    et: p ? `Meeldetuletus: ${p} tuleb homme.` : 'Meeldetuletus sinu homsest visiidist.',
    en: p ? `Reminder: ${p} is coming tomorrow.` : "A reminder of tomorrow's visit.",
    ru: p ? `Напоминание: ${p} придёт завтра.` : 'Напоминание о завтрашнем визите.',
  };
  if (category === 'warranty') {
    return {
      title: { et: 'SUKODA | Homme on garantiivisiit', en: 'SUKODA | Warranty visit tomorrow', ru: 'SUKODA | Завтра гарантийный визит' },
      body: intro,
    };
  }
  if (category !== 'cleaning') {
    return {
      title: {
        et: p ? `SUKODA | Homme tuleb ${p}` : 'SUKODA | Homme on visiit',
        en: p ? `SUKODA | ${p} comes tomorrow` : 'SUKODA | Visit tomorrow',
        ru: p ? `SUKODA | Завтра придёт ${p}` : 'SUKODA | Завтра визит',
      },
      body: intro,
    };
  }
  return {
    title: { et: 'SUKODA | Homme on koristus', en: 'SUKODA | Cleaning tomorrow', ru: 'SUKODA | Завтра уборка' },
    body: intro,
  };
}

/** Same subject and opening line as the desk's new-request e-mail. et is that letter; en and ru say the same thing. */
function newRequest(vars) {
  const name = vars.name || '';
  const service = vars.service || '';
  const kind = vars.kind || 'request';
  if (kind === 'reschedule') {
    return {
      title: {
        et: `SUKODA | Aja muutmise soov — ${name}`,
        en: `SUKODA | Reschedule request — ${name}`,
        ru: `SUKODA | Просьба перенести время — ${name}`,
      },
      body: {
        et: `${name} soovib olemasoleva visiidi aega muuta. Kinnita uus aeg töölaual — kõik pere kontaktid saavad kohe uue kalendrikutse.`,
        en: `${name} wants to change an existing visit. Confirm the new time on the desk — every household contact gets a new calendar invite.`,
        ru: `${name} хочет перенести существующий визит. Подтвердите новое время на столе — все контакты семьи сразу получат приглашение в календарь.`,
      },
    };
  }
  if (kind === 'question') {
    return {
      title: { et: `SUKODA | Küsimus — ${name}`, en: `SUKODA | Question — ${name}`, ru: `SUKODA | Вопрос — ${name}` },
      body: {
        et: `${name} küsib. Vasta töölaual — vastus jõuab kliendile portaali ja e-postiga.`,
        en: `${name} is asking. Reply on the desk — the answer reaches the client in the portal and by e-mail.`,
        ru: `${name} спрашивает. Ответьте на столе — ответ дойдёт клиенту в портал и на почту.`,
      },
    };
  }
  if (kind === 'issue') {
    const lead = /pöördumin/i.test(service) ? service : `Pöördumine: ${service}`;
    return {
      title: {
        et: `SUKODA | ${lead} — ${name}`,
        en: `SUKODA | Report: ${service} — ${name}`,
        ru: `SUKODA | Обращение: ${service} — ${name}`,
      },
      body: {
        et: `${name} kirjeldas puudust. Paku töölaual ülevaatuse aeg või vasta kirjalikult — klient näeb seda portaalis.`,
        en: `${name} described a defect. Offer an inspection time on the desk or reply in writing — the client sees it in the portal.`,
        ru: `${name} описал недостаток. Предложите на столе время осмотра или ответьте письменно — клиент увидит это в портале.`,
      },
    };
  }
  return {
    title: {
      et: `SUKODA | Uus soov: ${service} — ${name}`,
      en: `SUKODA | New request: ${service} — ${name}`,
      ru: `SUKODA | Новая заявка: ${service} — ${name}`,
    },
    body: {
      et: `${name} soovib teenust. Kinnita aeg või vasta töölaual — klient näeb seda portaalis.`,
      en: `${name} wants a service. Confirm a time or reply on the desk — the client sees it in the portal.`,
      ru: `${name} хочет услугу. Подтвердите время или ответьте на столе — клиент увидит это в портале.`,
    },
  };
}

/** Same subject and heading as the request e-mails (received, declined, reviewed, answered, completed). */
function requestStatus(vars) {
  const service = vars.service || '';
  const who = vars.providerName || '';
  const status = vars.status || 'received';
  if (status === 'declined') {
    return {
      title: {
        et: `SUKODA | Soov „${service}“ vajab uut aega`,
        en: `SUKODA | "${service}" needs a new time`,
        ru: `SUKODA | «${service}» нужно новое время`,
      },
      body: {
        et: who ? `${who} ei saa kahjuks soovitud ajal. Ava pöördumine portaalis ja paku uut aega — nii jääb vestlus kodu juurde.` : 'Soovitud aeg kahjuks ei sobi. Ava pöördumine portaalis ja paku uut aega.',
        en: who ? `Unfortunately ${who} cannot make the requested time. Open the request in your portal and propose a new time — that way the conversation stays with the home.` : 'Unfortunately the requested time does not work. Open the request in your portal and propose a new time.',
        ru: who ? `К сожалению, ${who} не может в желаемое время. Откройте обращение в портале и предложите новое время — так разговор останется при доме.` : 'К сожалению, желаемое время не подходит. Откройте обращение в портале и предложите новое время.',
      },
    };
  }
  if (status === 'reviewed') {
    return {
      title: {
        et: `SUKODA | Pöördumine vaadatud üle: ${service}`,
        en: `SUKODA | Report reviewed: ${service}`,
        ru: `SUKODA | Обращение рассмотрено: ${service}`,
      },
      body: {
        et: who ? `${who} vaatas sinu pöördumise üle. Kirjeldatud puudus ei kuulu kahjuks garantii alla — selgitus on allpool.` : 'Vaatasime sinu pöördumise üle. Kirjeldatud puudus ei kuulu kahjuks garantii alla — selgitus on allpool.',
        en: who ? `${who} reviewed your report. Unfortunately the described defect is not covered by the warranty — the explanation is below.` : 'We reviewed your report. Unfortunately the described defect is not covered by the warranty — the explanation is below.',
        ru: who ? `Ваше обращение рассмотрено (${who}). Описанный недостаток, к сожалению, не входит в гарантию — пояснение ниже.` : 'Мы рассмотрели ваше обращение. Описанный недостаток, к сожалению, не входит в гарантию — пояснение ниже.',
      },
    };
  }
  if (status === 'answered') {
    return {
      title: { et: `SUKODA | Vastus: ${service}`, en: `SUKODA | Answer: ${service}`, ru: `SUKODA | Ответ: ${service}` },
      body: {
        et: `${who || 'Partner'} vastas.`,
        en: `${who || 'Partner'} replied.`,
        ru: `Ответ от ${who || 'партнёра'}.`,
      },
    };
  }
  if (status === 'question') {
    return {
      title: {
        et: `SUKODA | Küsimus saadetud: ${service}`,
        en: `SUKODA | Question sent: ${service}`,
        ru: `SUKODA | Вопрос отправлен: ${service}`,
      },
      body: {
        et: who ? `Sinu küsimus on nüüd meeskonnal ${who}. Vastus tuleb kirjalikult, tavaliselt sama tööpäeva jooksul.` : 'Sinu küsimus on vastu võetud. Vastus tuleb kirjalikult, tavaliselt sama tööpäeva jooksul.',
        en: who ? `Your question is now with ${who}. The answer comes in writing, usually the same working day.` : 'Your question has been received. The answer comes in writing, usually the same working day.',
        ru: who ? `Ваш вопрос теперь у команды ${who}. Ответ придёт письменно, обычно в тот же рабочий день.` : 'Ваш вопрос принят. Ответ придёт письменно, обычно в тот же рабочий день.',
      },
    };
  }
  if (status === 'issue') {
    return {
      title: {
        et: `SUKODA | Pöördumine saadetud: ${service}`,
        en: `SUKODA | Report sent: ${service}`,
        ru: `SUKODA | Обращение отправлено: ${service}`,
      },
      body: {
        et: `Edastasime sinu pöördumise partnerile ${who || 'Partner'}. Garantiimeeskond kinnitab ülevaatuse aja tavaliselt 2 tööpäeva jooksul.`,
        en: who ? `We passed your report to ${who}. The warranty team reviews the description and usually confirms an inspection time within 2 working days — or replies in writing.` : 'Your report has been received. We review the description and usually confirm an inspection time within 2 working days — or reply in writing.',
        ru: `Мы передали ваше обращение партнёру ${who || 'Партнёр'}. Гарантийная команда обычно подтверждает время осмотра в течение 2 рабочих дней.`,
      },
    };
  }
  if (status === 'message') {
    return {
      title: { et: `SUKODA | Sõnum: ${service}`, en: `SUKODA | Message: ${service}`, ru: `SUKODA | Сообщение: ${service}` },
      body: {
        et: `${who || 'Meeskond'} kirjutas sinu pöördumisele.`,
        en: `${who || 'The team'} wrote on your request.`,
        ru: `${who || 'Команда'} пишет по вашему обращению.`,
      },
    };
  }
  if (status === 'completed') {
    return {
      title: { et: `SUKODA | Tehtud: ${service}`, en: `SUKODA | Done: ${service}`, ru: `SUKODA | Сделано: ${service}` },
      body: {
        et: who ? `${who} märkis töö „${service}“ tehtuks.` : `Töö „${service}“ on tehtud.`,
        en: who ? `${who} marked "${service}" as done.` : `"${service}" is done.`,
        ru: who ? `${who} отмечает работу «${service}» выполненной.` : `Работа «${service}» выполнена.`,
      },
    };
  }
  return {
    title: {
      et: `SUKODA | Soov vastu võetud: ${service}`,
      en: `SUKODA | Request received: ${service}`,
      ru: `SUKODA | Заявка принята: ${service}`,
    },
    body: {
      et: who ? `Edastasime sinu soovi partnerile ${who}. Tavaliselt kinnitab ta aja sama päeva jooksul.` : 'Edastasime sinu soovi. Kinnitame aja tavaliselt sama päeva jooksul.',
      en: who ? `We passed your request to ${who}. A time is usually confirmed the same day.` : 'We received your request and will usually confirm a time the same day.',
      ru: who ? `Мы передали вашу заявку партнёру ${who}. Обычно время подтверждают в тот же день.` : 'Мы передали вашу заявку. Обычно время подтверждаем в тот же день.',
    },
  };
}

/** Same subject and opening line as the home upkeep reminder. */
function rhythmDue(vars) {
  const n = Number(vars.count) || 1;
  const one = vars.name || '';
  const home = vars.home || '';
  return {
    title: {
      et: `SUKODA | Kodu hooldus: ${n === 1 ? one : `${n} asja sel kuul`}`,
      en: `SUKODA | Home upkeep: ${n === 1 ? one : `${n} things this month`}`,
      ru: `SUKODA | Уход за домом: ${n === 1 ? one : `${n} дел в этом месяце`}`,
    },
    body: {
      et: `${home || 'Sinu kodu'} — need asjad on järgmise kahe nädala jooksul aeg üle vaadata. Tee ise ja märgi portaalis tehtuks, või telli tegija sealt samast.`,
      en: `${home || 'Your home'} — these are due within the next two weeks. Do them yourself and tick them off in the portal, or order someone from the same place.`,
      ru: `${home || 'Ваш дом'} — эти дела нужно проверить в ближайшие две недели. Сделайте сами и отметьте в портале, или закажите исполнителя там же.`,
    },
  };
}

/**
 * Morning list for the provider. There is no morning e-mail yet; the line is the
 * plan's sentence ("Täna 3 kodu"), plus an optional note such as flowers to bring.
 */
function morning(vars) {
  const n = Number(vars.count) || 0;
  const note = vars.note ? ` ${vars.note}` : '';
  return {
    title: { et: 'Tänane päev', en: 'Today', ru: 'Сегодня' },
    body: {
      et: `Täna ${n} kodu.${note}`,
      en: `Today ${n} ${n === 1 ? 'home' : 'homes'}.${note}`,
      ru: `Сегодня ${n} ${ruHomes(n)}.${note}`,
    },
  };
}

const BUILDERS = {
  morning,
  new_request: newRequest,
  visit_tomorrow: visitTomorrow,
  rhythm_due: rhythmDue,
  request_status: requestStatus,
};

function text(type, lang, vars = {}) {
  const build = BUILDERS[type];
  if (!build) return null;
  const copy = build(vars || {});
  return { title: line(lang, copy.title), body: line(lang, copy.body) };
}

function tokensOf(tokens) {
  const list = Array.isArray(tokens) ? tokens : [];
  const out = [];
  for (const item of list) {
    const token = typeof item === 'string' ? item : item && item.token;
    if (token) out.push(String(token));
  }
  return out;
}

function dataOf(type, data) {
  const out = { type: String(type) };
  if (!data || typeof data !== 'object') return out;
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;
    out[key] = typeof value === 'string' ? value : String(value);
  }
  return out;
}

function fcmKey(explicit) {
  if (explicit != null) return String(explicit).trim();
  return String(process.env.FCM_SERVER_KEY || '').trim();
}

async function dispatch(messaging, message) {
  if (typeof messaging.sendEachForMulticast === 'function') return messaging.sendEachForMulticast(message);
  if (typeof messaging.sendMulticast === 'function') return messaging.sendMulticast(message);
  for (const token of message.tokens) {
    await messaging.send({ token, notification: message.notification, data: message.data });
  }
  return { successCount: message.tokens.length };
}

function defaultMessaging() {
  try {
    const admin = require('firebase-admin');
    if (!admin.apps || !admin.apps.length) return null;
    return admin.messaging();
  } catch (err) {
    console.error('push: FCM messaging unavailable', err);
    return null;
  }
}

/** Payload for notifyOrder. Explicit title and body are the e-mail's own sentences. */
function message({ type, lang, title, body, url, audience } = {}) {
  const known = TYPES.includes(type);
  const built = title && body ? null : (known ? text(type, lang, {}) : null);
  return {
    type: known ? type : '',
    lang: core.langOf(lang),
    title: title || (built && built.title) || '',
    body: body || (built && built.body) || '',
    url: url || '',
    audience: audience || '',
  };
}

function tokensFrom(order) {
  return tokensOf(order && (order.pushSubscriptions || order.pushTokens));
}

/**
 * Send a payload from message(). No FCM key → log and return. Never throws,
 * so a cron that already sent the e-mail keeps going.
 */
async function deliver(payload, options = {}) {
  const type = payload && payload.type;
  const key = fcmKey(options.serverKey);
  if (!key) {
    console.error('push: FCM key missing, skipped', type);
    return { sent: false, reason: 'no-key' };
  }
  if (!payload || !payload.title) {
    console.error('push: unknown type', type);
    return { sent: false, reason: 'unknown-type' };
  }
  const tokens = tokensOf(options.tokens);
  if (!tokens.length) return { sent: false, reason: 'no-tokens' };
  const messaging = options.messaging || defaultMessaging();
  if (!messaging) {
    console.error('push: FCM messaging unavailable', type);
    return { sent: false, reason: 'no-client' };
  }
  try {
    await dispatch(messaging, {
      tokens,
      notification: { title: payload.title, body: payload.body || '' },
      data: dataOf(type, { url: payload.url || '' }),
    });
  } catch (err) {
    console.error('push: deliver failed', type, err && err.message);
    return { sent: false, reason: 'error' };
  }
  return { sent: true, count: tokens.length };
}

/**
 * Send one of the five types. No FCM key → log and return { sent: false }.
 * A messaging error is logged and returned; it does not throw.
 */
async function send(type, options = {}) {
  const key = fcmKey(options.serverKey);
  if (!key) {
    console.error('push: FCM key missing, skipped', type);
    return { sent: false, reason: 'no-key' };
  }
  const note = text(type, options.lang, options.vars);
  if (!note) {
    console.error('push: unknown type', type);
    return { sent: false, reason: 'unknown-type' };
  }
  const tokens = tokensOf(options.tokens);
  if (!tokens.length) return { sent: false, reason: 'no-tokens' };
  const messaging = options.messaging;
  if (!messaging) {
    console.error('push: FCM messaging unavailable', type);
    return { sent: false, reason: 'no-client' };
  }
  try {
    await dispatch(messaging, {
      tokens,
      notification: { title: note.title, body: note.body },
      data: dataOf(type, options.data),
    });
  } catch (err) {
    console.error('push: deliver failed', type, err && err.message);
    return { sent: false, reason: 'error' };
  }
  return { sent: true, count: tokens.length };
}

module.exports = { TYPES, text, message, tokensFrom, deliver, send };
