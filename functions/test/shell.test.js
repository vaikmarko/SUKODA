/**
 * The shell service worker must never store /api. The check lives in public/sw.js;
 * this runs that fetch listener with a stubbed worker scope.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadWorker() {
  const code = fs.readFileSync(path.join(__dirname, '../../public/sw.js'), 'utf8');
  const listeners = {};
  const context = {
    self: {
      addEventListener(type, fn) { listeners[type] = fn; },
      skipWaiting() { return Promise.resolve(); },
      clients: { claim() { return Promise.resolve(); } },
      location: { origin: 'https://sukoda.ee' },
    },
    caches: {
      open() { return Promise.resolve({ match() { return Promise.resolve(undefined); }, put() { return Promise.resolve(); } }); },
      keys() { return Promise.resolve([]); },
    },
    fetch() { return Promise.reject(new Error('network')); },
    Response: { error() { return { error: true }; } },
    URL,
    Promise,
    Request: class Request {
      constructor(url) { this.url = String(url); }
    },
  };
  vm.runInNewContext(code, context, { filename: 'sw.js' });
  return listeners;
}

function request(url, method) {
  return {
    url,
    method: method || 'GET',
    headers: { has() { return false; } },
  };
}

test('service worker does not intercept /api, including a visit done call', () => {
  const listeners = loadWorker();
  for (const url of [
    'https://sukoda.ee/api',
    'https://sukoda.ee/api/haldus/visits/abc/done',
    'https://sukoda.ee/api/me',
  ]) {
    let responded = false;
    listeners.fetch({
      request: request(url, url.endsWith('/done') ? 'POST' : 'GET'),
      respondWith() { responded = true; },
    });
    assert.equal(responded, false, url);
  }
});

test('service worker does intercept the app shell document', async () => {
  const listeners = loadWorker();
  let pending = null;
  listeners.fetch({
    request: request('https://sukoda.ee/app'),
    respondWith(result) { pending = result; },
  });
  assert.ok(pending);
  await pending;
});
