/**
 * Five push notifications. Title and body are the same sentences as the
 * resident or desk e-mail for that event. Missing language falls back to et.
 *
 * Two channels to the same people: web subscriptions (PWA) go out with VAPID,
 * App Store and Google Play apps through FCM (iOS onward through APNs, set up in
 * the Firebase console). A missing key or client logs and returns; nothing throws.
 * The 07:00 cron calls send('morning') once per provider with visits today.
 */

const core = require('./lib/haldus-core');

const TYPES = ['morning', 'new_request', 'visit_tomorrow', 'rhythm_due', 'request_status'];

function ruHomes(n) {
  return core.ruPlural(n, 'дом', 'дома', 'домов');
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
    et: p ? `${p} tuleb homme. Aeg on allpool.` : 'Homme on visiit. Aeg on allpool.',
    en: p ? `${p} is coming tomorrow. The time is below.` : 'Your visit is tomorrow. The time is below.',
    ru: p ? `${p} придёт завтра. Время указано ниже.` : 'Завтра у вас визит. Время указано ниже.',
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
        et: `${name} soovib visiidi aega muuta. Kinnita uus aeg töölaual. Pere saab uue kalendrikutse kohe.`,
        en: `${name} wants to change the visit time. Confirm the new time on the desk. The household gets a new calendar invite right away.`,
        ru: `${name} хочет перенести визит. Подтвердите новое время на рабочем столе. Семья сразу получит новое приглашение в календарь.`,
      },
    };
  }
  if (kind === 'question') {
    return {
      title: { et: `SUKODA | Küsimus — ${name}`, en: `SUKODA | Question — ${name}`, ru: `SUKODA | Вопрос — ${name}` },
      body: {
        et: `${name} küsib. Vasta töölaual. Klient näeb vastust rakenduses.`,
        en: `${name} has a question. Reply on the desk. The client sees the reply in the app.`,
        ru: `${name} задаёт вопрос. Ответьте на рабочем столе. Клиент увидит ответ в приложении.`,
      },
    };
  }
  if (kind === 'issue') {
    const lead = /pöördumin/i.test(service) ? service : `Teade: ${service}`;
    return {
      title: {
        et: `SUKODA | ${lead} — ${name}`,
        en: `SUKODA | Report: ${service} — ${name}`,
        ru: `SUKODA | Обращение: ${service} — ${name}`,
      },
      body: {
        et: `${name} kirjeldas puudust. Paku töölaual ülevaatuse aeg või vasta kirjalikult.`,
        en: `${name} described a defect. Offer an inspection time on the desk or reply in writing.`,
        ru: `${name} описал(а) недостаток. Предложите на рабочем столе время осмотра или ответьте письменно.`,
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
      et: `${name} soovib teenust. Kinnita aeg või vasta töölaual.`,
      en: `${name} wants a service. Confirm a time or reply on the desk.`,
      ru: `${name} хочет заказать услугу. Подтвердите время или ответьте на рабочем столе.`,
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
        ru: who ? `К сожалению, ${who} не может прийти в желаемое время. Откройте обращение в портале и предложите новое время — так разговор останется при доме.` : 'К сожалению, желаемое время не подходит. Откройте обращение в портале и предложите новое время.',
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
      ru: `SUKODA | Уход за домом: ${n === 1 ? one : `${n} ${core.ruPlural(n, 'дело', 'дела', 'дел')} в этом месяце`}`,
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

const PLATFORMS = ['ios', 'android'];

/** A native device token from the App Store or Google Play app. FCM carries both; iOS goes on through APNs. */
function tokenOf(item) {
  const raw = typeof item === 'string' ? item : item && (item.token || item.fcmToken);
  const token = typeof raw === 'string' ? raw.trim() : '';
  if (!/^[\w:.-]{20,1000}$/.test(token)) return null;
  const platform = item && PLATFORMS.includes(item.platform) ? item.platform : '';
  return { token, platform };
}

function tokensOf(tokens) {
  const list = Array.isArray(tokens) ? tokens : [];
  const out = [];
  for (const item of list) {
    const t = tokenOf(item);
    if (t && !out.includes(t.token)) out.push(t.token);
  }
  return out;
}

/** Native tokens live in pushTokens; web subscriptions in pushSubscriptions. Each channel reads only its own list. */
function tokensFrom(record) {
  return tokensOf(record && record.pushTokens);
}

/** Same phone registering again replaces its old row; the newest eight stay. */
function mergeTokens(existing, item, max = 8) {
  const clean = tokenOf(item);
  const list = (Array.isArray(existing) ? existing : []).map(tokenOf).filter(Boolean);
  if (!clean) return list;
  const next = list.filter((t) => t.token !== clean.token);
  next.push(clean);
  const cap = Number.isInteger(max) && max > 0 ? max : 8;
  return next.slice(-cap);
}

/** Sign-out on a phone: its token or web endpoint stops getting this account's notifications. */
function withoutDevice(record, { token, endpoint } = {}) {
  const t = typeof token === 'string' ? token.trim() : '';
  const e = typeof endpoint === 'string' ? endpoint.trim() : '';
  return {
    pushTokens: (Array.isArray(record?.pushTokens) ? record.pushTokens : []).map(tokenOf).filter((x) => x && x.token !== t),
    pushSubscriptions: subscriptionsFrom(record).filter((s) => s.endpoint !== e),
  };
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

function subscriptionOf(item) {
  if (!item || typeof item !== 'object') return null;
  const endpoint = typeof item.endpoint === 'string' ? item.endpoint.trim() : '';
  const p256dh = item.keys && typeof item.keys.p256dh === 'string' ? item.keys.p256dh.trim() : '';
  const auth = item.keys && typeof item.keys.auth === 'string' ? item.keys.auth.trim() : '';
  if (!endpoint || !p256dh || !auth) return null;
  if (!/^https:\/\//.test(endpoint)) return null;
  if (endpoint.length > 500 || p256dh.length > 200 || auth.length > 100) return null;
  return { endpoint, keys: { p256dh, auth } };
}

function subscriptionsOf(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list) {
    const sub = subscriptionOf(item);
    if (sub) out.push(sub);
  }
  return out;
}

function subscriptionsFrom(record) {
  return subscriptionsOf(record && record.pushSubscriptions);
}

function mergeSubscriptions(existing, sub, max = 8) {
  const clean = subscriptionOf(sub);
  if (!clean) return subscriptionsFrom({ pushSubscriptions: existing });
  const next = subscriptionsFrom({ pushSubscriptions: existing }).filter((s) => s.endpoint !== clean.endpoint);
  next.push(clean);
  const cap = Number.isInteger(max) && max > 0 ? max : 8;
  return next.slice(-cap);
}

function vapidPair(options = {}) {
  const pub = String(options.publicKey != null ? options.publicKey : (process.env.VAPID_PUBLIC_KEY || '')).trim();
  const priv = String(options.privateKey != null ? options.privateKey : (process.env.VAPID_PRIVATE_KEY || '')).trim();
  if (!pub || !priv) return null;
  return { publicKey: pub, privateKey: priv };
}

function pushBody(payload) {
  const audience = payload && payload.audience;
  return JSON.stringify({
    title: (payload && payload.title) || '',
    body: (payload && payload.body) || '',
    url: (payload && payload.url) || '/',
    icon: audience === 'provider' ? '/icons/desk-192.png' : '/icons/icon-192.png',
  });
}

async function sendWeb(subs, payload, pair, webPush) {
  const body = pushBody(payload);
  const sendOne = webPush || (async (sub, json) => {
    const lib = require('web-push');
    lib.setVapidDetails('mailto:tere@sukoda.ee', pair.publicKey, pair.privateKey);
    await lib.sendNotification(sub, json);
  });
  let sent = 0;
  const gone = [];
  for (const sub of subs) {
    try {
      await sendOne(sub, body);
      sent += 1;
    } catch (err) {
      const code = err && (err.statusCode || err.status);
      if (code === 404 || code === 410) gone.push(sub.endpoint);
      else console.error('push: web push failed', err && err.message);
    }
  }
  if (!sent) return { sent: false, reason: gone.length ? 'gone' : 'error', gone, count: 0 };
  return { sent: true, count: sent, gone };
}

async function deliverWeb(payload, options, subs) {
  const pair = vapidPair(options);
  if (!pair) {
    console.error('push: VAPID key missing, skipped', payload && payload.type);
    return { sent: false, reason: 'no-key' };
  }
  return sendWeb(subs, payload, pair, options.webPush);
}

/** The Admin SDK's own messaging client: the functions' service account signs it, no extra key. */
function defaultMessaging() {
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) return null;
    return require('firebase-admin/messaging').getMessaging();
  } catch (err) {
    return null;
  }
}

const DEAD_TOKEN = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument']);

/** One FCM multicast. iOS gets a sound through APNs, Android a high-priority notification. */
async function deliverNative(payload, options, tokens) {
  const messaging = options.messaging !== undefined ? options.messaging : defaultMessaging();
  if (!messaging) {
    console.error('push: FCM client missing, skipped', payload && payload.type);
    return { sent: false, reason: 'no-client' };
  }
  const multicast = {
    tokens,
    notification: { title: payload.title, body: payload.body || '' },
    data: dataOf(payload.type, { ...(payload.data || {}), url: payload.url || '' }),
    apns: { payload: { aps: { sound: 'default' } } },
    android: { priority: 'high', notification: { sound: 'default' } },
  };
  let result;
  try {
    if (typeof messaging.sendEachForMulticast === 'function') {
      result = await messaging.sendEachForMulticast(multicast);
    } else {
      const { tokens: list, ...one } = multicast;
      const responses = [];
      for (const token of list) {
        try {
          await messaging.send({ ...one, token });
          responses.push({ success: true });
        } catch (error) {
          responses.push({ success: false, error });
        }
      }
      result = { responses, successCount: responses.filter((r) => r.success).length };
    }
  } catch (err) {
    console.error('push: FCM failed', payload && payload.type, err && err.message);
    return { sent: false, reason: 'error' };
  }
  const dead = [];
  (result.responses || []).forEach((r, i) => {
    if (r && !r.success && r.error && DEAD_TOKEN.has(r.error.code)) dead.push(tokens[i]);
    else if (r && !r.success) console.error('push: FCM token failed', r.error && (r.error.code || r.error.message));
  });
  const count = Number(result.successCount) || 0;
  if (!count) return { sent: false, reason: dead.length ? 'gone' : 'error', dead, count: 0 };
  return { sent: true, count, dead };
}

/**
 * Send to every phone the record has: web subscriptions through VAPID, App Store and Google Play
 * apps through FCM. A missing key or client is logged per channel; nothing throws, so a cron that
 * already sent the e-mail keeps going.
 */
async function deliver(payload, options = {}) {
  if (!payload || !payload.title) {
    console.error('push: unknown type', payload && payload.type);
    return { sent: false, reason: 'unknown-type' };
  }
  const subs = subscriptionsOf(options.subscriptions);
  const tokens = tokensOf(options.tokens);
  if (!subs.length && !tokens.length) return { sent: false, reason: 'no-devices' };
  const results = [];
  if (subs.length) results.push(await deliverWeb(payload, options, subs));
  if (tokens.length) results.push(await deliverNative(payload, options, tokens));
  const count = results.reduce((n, r) => n + (r.count || 0), 0);
  const gone = results.flatMap((r) => r.gone || []);
  const dead = results.flatMap((r) => r.dead || []);
  if (!count) return { sent: false, reason: results.length === 1 ? results[0].reason : 'error', gone, dead, count: 0 };
  return { sent: true, count, gone, dead };
}

/** Send one of the five types in the record's language. */
async function send(type, options = {}) {
  const note = text(type, options.lang, options.vars);
  if (!note) {
    console.error('push: unknown type', type);
    return { sent: false, reason: 'unknown-type' };
  }
  return deliver({
    type,
    title: note.title,
    body: note.body,
    url: (options.data && options.data.url) || '',
    data: options.data,
    audience: options.audience || '',
  }, options);
}

module.exports = {
  TYPES, text, message, tokenOf, tokensFrom, mergeTokens, withoutDevice, subscriptionsFrom, subscriptionOf, mergeSubscriptions, deliver, send,
};
