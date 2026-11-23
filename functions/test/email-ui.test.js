const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ui = require('../lib/email-ui');

test('a letter carries the wordmark, the body and the footer in the reader language', () => {
  const html = ui.shell(ui.H2('Pealkiri') + ui.P('Tekst'), 'ru');
  assert.match(html, />SUKODA</);
  assert.match(html, /Pealkiri/);
  assert.match(html, /Если есть вопросы/);
  assert.doesNotMatch(html, /Küsimuste korral/);
});

test('a white-label letter shows the developer name and says who runs the app', () => {
  const html = ui.shell('x', 'et', 'Arco <Vara>');
  assert.match(html, /Arco &lt;Vara&gt;/);
  assert.match(html, /Rakendust pakub/);
});

test('the one-time code is escaped', () => {
  assert.match(ui.CODE('<1>'), /&lt;1&gt;/);
});

// The app and the web dropped the gold rules and the square uppercase buttons; a letter must not bring them back.
test('no e-mail template uses the old palette or an uppercase button', () => {
  const old = /#B8976A|#2C2824|#8A8578|#E8E3DD|#F5F0EB|letter-spacing: ?3px/i;
  for (const file of ['index.js', 'haldus.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const hit = src.split('\n').findIndex((line) => old.test(line));
    assert.strictEqual(hit, -1, `${file}:${hit + 1} still has the old e-mail look`);
  }
});
