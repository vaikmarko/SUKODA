/**
 * Push copy matches the e-mail subjects, and a missing FCM key does not throw.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const push = require('../push');

test('five notification types, missing language is Estonian', () => {
  assert.deepEqual(push.TYPES, ['morning', 'new_request', 'visit_tomorrow', 'rhythm_due', 'request_status']);
  const tomorrow = push.text('visit_tomorrow', undefined, {});
  assert.equal(tomorrow.title, 'SUKODA | Homme on koristus');
  assert.equal(tomorrow.body, 'Meeldetuletus sinu homsest visiidist.');
  assert.equal(push.text('visit_tomorrow', 'de', {}).title, 'SUKODA | Homme on koristus');
});

test('visit tomorrow uses the reminder e-mail subject and opening line', () => {
  assert.equal(push.text('visit_tomorrow', 'en', { providerName: 'Mari' }).title, 'SUKODA | Cleaning tomorrow');
  assert.equal(push.text('visit_tomorrow', 'en', { providerName: 'Mari' }).body, 'Reminder: Mari is coming tomorrow.');
  assert.equal(push.text('visit_tomorrow', 'ru', { category: 'warranty' }).title, 'SUKODA | Завтра гарантийный визит');
  assert.equal(push.text('visit_tomorrow', 'et', { category: 'handyman', providerName: 'Kalle' }).title, 'SUKODA | Homme tuleb Kalle');
});

test('request status, new request and upkeep repeat the e-mail subject', () => {
  assert.equal(push.text('request_status', 'et', { status: 'completed', service: 'Aknad', providerName: 'Mari' }).title, 'SUKODA | Tehtud: Aknad');
  assert.equal(push.text('request_status', 'et', { status: 'completed', service: 'Aknad', providerName: 'Mari' }).body, 'Mari märkis töö „Aknad“ tehtuks.');
  assert.equal(push.text('request_status', 'en', { status: 'declined', service: 'Windows' }).title, 'SUKODA | "Windows" needs a new time');
  assert.equal(push.text('new_request', 'et', { service: 'Süvapuhastus', name: 'Anna' }).title, 'SUKODA | Uus soov: Süvapuhastus — Anna');
  assert.equal(push.text('new_request', 'et', { service: 'Süvapuhastus', name: 'Anna' }).body, 'Anna soovib teenust. Kinnita aeg või vasta töölaual — klient näeb seda portaalis.');
  assert.equal(push.text('rhythm_due', 'ru', { count: 2 }).title, 'SUKODA | Уход за домом: 2 дел в этом месяце');
  assert.equal(push.text('rhythm_due', 'et', { count: 1, name: 'Aknad', home: 'Iili 8' }).body.startsWith('Iili 8 — need asjad on järgmise kahe nädala jooksul'), true);
});

test('morning line is the plan sentence; a missing language stays Estonian', () => {
  assert.equal(push.text('morning', 'et', { count: 3, note: 'Kaasa lilled Iili 8.' }).body, 'Täna 3 kodu. Kaasa lilled Iili 8.');
  assert.equal(push.text('morning', 'ru', { count: 1 }).body, 'Сегодня 1 дом.');
  assert.equal(push.text('morning', 'ru', { count: 3 }).body, 'Сегодня 3 дома.');
  assert.equal(push.text('morning', 'ru', { count: 5 }).body, 'Сегодня 5 домов.');
  assert.equal(push.text('morning', {}, { count: 1 }).title, 'Tänane päev');
});

test('message keeps the e-mail sentence, and deliver without a key does not throw', async () => {
  const payload = push.message({
    type: 'visit_tomorrow',
    lang: 'et',
    title: 'Homme on koristus',
    body: 'Meeldetuletus sinu homsest visiidist.',
    url: 'https://sukoda.ee/minu',
  });
  assert.equal(payload.title, 'Homme on koristus');
  assert.equal(payload.type, 'visit_tomorrow');
  assert.deepEqual(push.tokensFrom({ pushSubscriptions: [{ token: 'a' }, 'b'] }), ['a', 'b']);
  const prev = process.env.FCM_SERVER_KEY;
  delete process.env.FCM_SERVER_KEY;
  const lines = [];
  const orig = console.error;
  console.error = (...args) => lines.push(args.map(String).join(' '));
  try {
    const result = await push.deliver(payload, { tokens: ['abc'] });
    assert.equal(result.reason, 'no-key');
    assert.match(lines.join('\n'), /FCM key missing/);
  } finally {
    console.error = orig;
    if (prev != null) process.env.FCM_SERVER_KEY = prev;
  }
});

test('send without an FCM key logs and does not throw', async () => {
  const prev = process.env.FCM_SERVER_KEY;
  delete process.env.FCM_SERVER_KEY;
  const lines = [];
  const orig = console.error;
  console.error = (...args) => lines.push(args.map(String).join(' '));
  try {
    const result = await push.send('visit_tomorrow', { lang: 'ru', tokens: ['abc'] });
    assert.equal(result.sent, false);
    assert.equal(result.reason, 'no-key');
    assert.match(lines.join('\n'), /FCM key missing/);
    const explicit = await push.send('morning', { serverKey: '   ', lang: 'et' });
    assert.equal(explicit.reason, 'no-key');
  } finally {
    console.error = orig;
    if (prev != null) process.env.FCM_SERVER_KEY = prev;
  }
});

test('send with a key delivers the e-mail sentence and does not call messaging when the key is absent', async () => {
  const seen = [];
  const result = await push.send('visit_tomorrow', {
    serverKey: 'test-key',
    lang: 'et',
    tokens: [{ token: 'tok-1' }],
    data: { orderId: 'home-1' },
    messaging: {
      async send(message) {
        seen.push(message);
      },
    },
  });
  assert.equal(result.sent, true);
  assert.equal(result.count, 1);
  assert.equal(seen[0].notification.title, 'SUKODA | Homme on koristus');
  assert.equal(seen[0].data.type, 'visit_tomorrow');
  assert.equal(seen[0].data.orderId, 'home-1');
  assert.equal(seen[0].token, 'tok-1');
});

test('a messaging error does not throw, so the cron can still send e-mail', async () => {
  const result = await push.send('morning', {
    serverKey: 'test-key',
    lang: 'et',
    tokens: ['tok'],
    vars: { count: 1 },
    messaging: { async send() { throw new Error('fcm down'); } },
  });
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'error');
});
