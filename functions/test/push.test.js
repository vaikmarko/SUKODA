/**
 * Push copy matches the e-mail subjects; web and store-app phones both get it, and nothing throws.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const push = require('../push');

test('five notification types, missing language is Estonian', () => {
  assert.deepEqual(push.TYPES, ['morning', 'new_request', 'visit_tomorrow', 'rhythm_due', 'request_status']);
  const tomorrow = push.text('visit_tomorrow', undefined, {});
  assert.equal(tomorrow.title, 'SUKODA | Homme on koristus');
  assert.equal(tomorrow.body, 'Homme on visiit. Aeg on allpool.');
  assert.equal(push.text('visit_tomorrow', 'de', {}).title, 'SUKODA | Homme on koristus');
});

test('visit tomorrow uses the reminder e-mail subject and opening line', () => {
  assert.equal(push.text('visit_tomorrow', 'en', { providerName: 'Mari' }).title, 'SUKODA | Cleaning tomorrow');
  assert.equal(push.text('visit_tomorrow', 'en', { providerName: 'Mari' }).body, 'Mari is coming tomorrow. The time is below.');
  assert.equal(push.text('visit_tomorrow', 'ru', { category: 'warranty' }).title, 'SUKODA | Завтра гарантийный визит');
  assert.equal(push.text('visit_tomorrow', 'et', { category: 'handyman', providerName: 'Kalle' }).title, 'SUKODA | Homme tuleb Kalle');
});

test('request status, new request and upkeep repeat the e-mail subject', () => {
  assert.equal(push.text('request_status', 'et', { status: 'completed', service: 'Aknad', providerName: 'Mari' }).title, 'SUKODA | Tehtud: Aknad');
  assert.equal(push.text('request_status', 'et', { status: 'completed', service: 'Aknad', providerName: 'Mari' }).body, 'Mari märkis töö „Aknad“ tehtuks.');
  assert.equal(push.text('request_status', 'en', { status: 'declined', service: 'Windows' }).title, 'SUKODA | "Windows" needs a new time');
  assert.equal(push.text('new_request', 'et', { service: 'Süvapuhastus', name: 'Anna' }).title, 'SUKODA | Uus soov: Süvapuhastus — Anna');
  assert.equal(push.text('new_request', 'et', { service: 'Süvapuhastus', name: 'Anna' }).body, 'Anna soovib teenust. Kinnita aeg või vasta töölaual.');
  assert.equal(push.text('rhythm_due', 'ru', { count: 2 }).title, 'SUKODA | Уход за домом: 2 дела в этом месяце');
  assert.equal(push.text('rhythm_due', 'ru', { count: 5 }).title, 'SUKODA | Уход за домом: 5 дел в этом месяце');
  assert.match(push.text('new_request', 'ru', { name: 'Anna', service: 'Уборка' }).body, /на рабочем столе/);
  assert.match(push.text('request_status', 'ru', { status: 'declined', service: 'Окна', providerName: 'Mari' }).body, /не может прийти в желаемое время/);
  assert.equal(push.text('rhythm_due', 'et', { count: 1, name: 'Aknad', home: 'Iili 8' }).body.startsWith('Iili 8 — need asjad on järgmise kahe nädala jooksul'), true);
});

test('morning line is the plan sentence; a missing language stays Estonian', () => {
  assert.equal(push.text('morning', 'et', { count: 3, note: 'Kaasa lilled Iili 8.' }).body, 'Täna 3 kodu. Kaasa lilled Iili 8.');
  assert.equal(push.text('morning', 'ru', { count: 1 }).body, 'Сегодня 1 дом.');
  assert.equal(push.text('morning', 'ru', { count: 3 }).body, 'Сегодня 3 дома.');
  assert.equal(push.text('morning', 'ru', { count: 5 }).body, 'Сегодня 5 домов.');
  assert.equal(push.text('morning', {}, { count: 1 }).title, 'Tänane päev');
});

const TOKEN_A = 'fcm-token-aaaaaaaaaaaaaaaaaaaaaaaa:APA91b';
const TOKEN_B = 'fcm-token-bbbbbbbbbbbbbbbbbbbbbbbb:APA91b';

test('message keeps the e-mail sentence; each channel reads only its own list', () => {
  const payload = push.message({
    type: 'visit_tomorrow', lang: 'et', title: 'Homme on koristus', body: 'Meeldetuletus sinu homsest visiidist.', url: 'https://sukoda.ee/minu',
  });
  assert.equal(payload.title, 'Homme on koristus');
  assert.equal(payload.type, 'visit_tomorrow');
  const record = {
    pushSubscriptions: [{ endpoint: 'https://push.example/a', keys: { p256dh: 'p', auth: 'a' } }],
    pushTokens: [{ token: TOKEN_A, platform: 'ios' }, TOKEN_B, { token: 'short' }],
  };
  assert.deepEqual(push.tokensFrom(record), [TOKEN_A, TOKEN_B], 'web subscriptions no longer hide the native tokens');
  assert.equal(push.subscriptionsFrom(record).length, 1);
});

test('a phone registering again replaces its row, a bad token is refused, sign-out removes the phone', () => {
  assert.equal(push.tokenOf({ token: 'x' }), null);
  assert.equal(push.tokenOf({ token: 'has spaces in it and is long enough' }), null);
  assert.deepEqual(push.tokenOf({ token: TOKEN_A, platform: 'android' }), { token: TOKEN_A, platform: 'android' });
  assert.equal(push.tokenOf({ token: TOKEN_A, platform: 'windows' }).platform, '');
  const once = push.mergeTokens([], { token: TOKEN_A, platform: 'ios' });
  const twice = push.mergeTokens(once, { token: TOKEN_A, platform: 'ios' });
  assert.equal(twice.length, 1);
  const many = Array.from({ length: 10 }, (_, i) => ({ token: `${TOKEN_A}${i}` })).reduce((list, t) => push.mergeTokens(list, t), []);
  assert.equal(many.length, 8);
  const sub = { endpoint: 'https://push.example/a', keys: { p256dh: 'p', auth: 'a' } };
  const left = push.withoutDevice({ pushTokens: [{ token: TOKEN_A }, { token: TOKEN_B }], pushSubscriptions: [sub] }, { token: TOKEN_A, endpoint: sub.endpoint });
  assert.deepEqual(left.pushTokens.map((t) => t.token), [TOKEN_B]);
  assert.deepEqual(left.pushSubscriptions, []);
});

test('no devices and no FCM client both return quietly, so the cron still sends e-mail', async () => {
  const none = await push.send('morning', { lang: 'et', vars: { count: 1 } });
  assert.equal(none.reason, 'no-devices');
  const lines = [];
  const orig = console.error;
  console.error = (...args) => lines.push(args.map(String).join(' '));
  try {
    const result = await push.send('visit_tomorrow', { lang: 'ru', tokens: [TOKEN_A], messaging: null });
    assert.equal(result.sent, false);
    assert.equal(result.reason, 'no-client');
    assert.match(lines.join('\n'), /FCM client missing/);
  } finally {
    console.error = orig;
  }
});

test('a native phone gets the e-mail sentence with a sound on iOS and high priority on Android', async () => {
  const seen = [];
  const messaging = {
    async sendEachForMulticast(m) { seen.push(m); return { successCount: m.tokens.length, responses: m.tokens.map(() => ({ success: true })) }; },
  };
  const result = await push.send('visit_tomorrow', { lang: 'et', tokens: [{ token: TOKEN_A, platform: 'ios' }], data: { url: 'https://sukoda.ee/minu', orderId: 'home-1' }, messaging });
  assert.equal(result.sent, true);
  assert.equal(result.count, 1);
  assert.equal(seen[0].notification.title, 'SUKODA | Homme on koristus');
  assert.deepEqual(seen[0].tokens, [TOKEN_A]);
  assert.equal(seen[0].data.type, 'visit_tomorrow');
  assert.equal(seen[0].data.orderId, 'home-1');
  assert.equal(seen[0].data.url, 'https://sukoda.ee/minu');
  assert.equal(seen[0].apns.payload.aps.sound, 'default');
  assert.equal(seen[0].android.priority, 'high');
});

test('the same notice reaches the PWA and the store app together', async () => {
  const web = [];
  const native = [];
  const sub = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p256', auth: 'authkey' } };
  const result = await push.deliver(push.message({
    type: 'new_request', lang: 'et', title: 'Uus soov', body: 'Anna soovib teenust.', url: 'https://sukoda.ee/haldus?tab=requests', audience: 'provider',
  }), {
    subscriptions: [sub, 'tok', { endpoint: 'http://insecure.example', keys: { p256dh: 'p', auth: 'a' } }],
    tokens: [TOKEN_A],
    publicKey: 'pub',
    privateKey: 'priv',
    webPush: async (item, body) => { web.push({ item, body }); },
    messaging: { async sendEachForMulticast(m) { native.push(m); return { successCount: 1, responses: [{ success: true }] }; } },
  });
  assert.equal(result.sent, true);
  assert.equal(result.count, 2);
  const parsed = JSON.parse(web[0].body);
  assert.equal(parsed.title, 'Uus soov');
  assert.equal(parsed.icon, '/icons/desk-192.png');
  assert.equal(parsed.url, 'https://sukoda.ee/haldus?tab=requests');
  assert.equal(native[0].notification.body, 'Anna soovib teenust.');
});

test('a web key missing does not stop the store app, and the other way round', async () => {
  const saved = { VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY };
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  const orig = console.error;
  console.error = () => {};
  try {
    const sub = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p256', auth: 'authkey' } };
    const result = await push.deliver(push.message({ type: 'morning', lang: 'et', title: 'Tänane päev', body: 'Täna 1 kodu.' }), {
      subscriptions: [sub],
      tokens: [TOKEN_A],
      webPush: async () => { throw new Error('should not send without a key'); },
      messaging: { async sendEachForMulticast() { return { successCount: 1, responses: [{ success: true }] }; } },
    });
    assert.equal(result.sent, true);
    assert.equal(result.count, 1);
  } finally {
    console.error = orig;
    for (const [key, value] of Object.entries(saved)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('an uninstalled app is reported as dead, other failures are not', async () => {
  const orig = console.error;
  console.error = () => {};
  try {
    const result = await push.send('morning', {
      lang: 'et', vars: { count: 1 }, tokens: [TOKEN_A, TOKEN_B],
      messaging: {
        async sendEachForMulticast() {
          return {
            successCount: 0,
            responses: [
              { success: false, error: { code: 'messaging/registration-token-not-registered' } },
              { success: false, error: { code: 'messaging/internal-error' } },
            ],
          };
        },
      },
    });
    assert.equal(result.sent, false);
    assert.deepEqual(result.dead, [TOKEN_A]);
  } finally {
    console.error = orig;
  }
});

test('a messaging error does not throw, so the cron can still send e-mail', async () => {
  const orig = console.error;
  console.error = () => {};
  try {
    const result = await push.send('morning', {
      lang: 'et', tokens: [TOKEN_A], vars: { count: 1 },
      messaging: { async sendEachForMulticast() { throw new Error('fcm down'); } },
    });
    assert.equal(result.sent, false);
    assert.equal(result.reason, 'error');
  } finally {
    console.error = orig;
  }
});
