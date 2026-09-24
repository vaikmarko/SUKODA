/* SUKODA kest.
   Vahemällu lähevad rakenduse HTML, CSS, JS, fondid ja ikoonid.
   /api ning teiste päritolude vastused ei lähe kunagi vahemällu.
   Push näitab teate ja avab selle aadressi. */
'use strict';

var CACHE = 'sukoda-shell-v6';

var PRECACHE = [
  '/app.html',
  '/too.html',
  '/app.js',
  '/push.js',
  '/app-shell.css',
  '/manifest.webmanifest',
  '/manifest-desk.webmanifest',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/desk-180.png',
  '/icons/desk-192.png',
  '/icons/desk-512.png',
  '/icons/desk-maskable-512.png',
  '/fonts/cormorant-garamond-400.woff2',
  '/fonts/inter-400.woff2',
];

var DOCUMENTS = {
  '/app': true,
  '/app.html': true,
  '/too': true,
  '/too.html': true,
  '/minu': true,
  '/minu.html': true,
  '/haldus': true,
  '/haldus.html': true,
};

function isApi(pathname) {
  return pathname === '/api' || pathname.indexOf('/api/') === 0;
}

function cleanPath(pathname) {
  if (pathname.length > 1 && pathname.charAt(pathname.length - 1) === '/') {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isDocument(pathname) {
  return !!DOCUMENTS[cleanPath(pathname)];
}

function isAsset(pathname) {
  if (pathname.indexOf('/icons/') === 0) return true;
  if (pathname.indexOf('/fonts/') === 0 && /\.woff2$/i.test(pathname)) return true;
  if (pathname === '/app.js' || pathname === '/push.js' || pathname === '/app-shell.css') return true;
  if (pathname === '/manifest.webmanifest' || pathname === '/manifest-desk.webmanifest') return true;
  if (/^\/assets\/.+\.(css|js|mjs|woff2)$/i.test(pathname)) return true;
  if (/^\/assets\/logo\/.+\.(svg|png|webp)$/i.test(pathname)) return true;
  return false;
}

function documentKey(pathname) {
  var path = cleanPath(pathname);
  if (path === '/app.html') return '/app';
  if (path === '/too.html') return '/too';
  if (path === '/minu.html') return '/minu';
  if (path === '/haldus.html') return '/haldus';
  return path;
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(PRECACHE.map(function (url) {
        return cache.add(url).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf('sukoda-shell-') === 0 && key !== CACHE;
      }).map(function (key) { return caches.delete(key); }));
    }).then(function () { return self.clients.claim(); })
      .then(function () {
        if (!self.clients || !self.clients.matchAll) return;
        return self.clients.matchAll({ type: 'window' }).then(function (list) {
          return Promise.all(list.map(function (client) {
            if (client && client.url && client.navigate) return client.navigate(client.url);
          }));
        });
      })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApi(url.pathname)) return;
  if (request.method !== 'GET') return;
  if (request.headers.has('authorization')) return;
  if (request.headers.has('range')) return;
  if (url.pathname === '/sw.js') return;
  if (!isDocument(url.pathname) && !isAsset(url.pathname)) return;
  event.respondWith(fromShell(request));
});

function cacheKey(request) {
  var url = new URL(request.url);
  if (!isDocument(url.pathname)) return request;
  return new Request(url.origin + documentKey(url.pathname));
}

function shouldStore(response) {
  if (!response || !response.ok || response.type !== 'basic' || response.redirected) return false;
  return true;
}

function wantsFresh(pathname) {
  if (isDocument(pathname)) return true;
  if (pathname === '/app.js' || pathname === '/push.js' || pathname === '/app-shell.css') return true;
  if (pathname.indexOf('/assets/js/') === 0) return true;
  return false;
}

async function store(cache, key, response) {
  if (!shouldStore(response)) return;
  var type = response.headers.get('content-type') || '';
  var path = new URL(key.url || key).pathname;
  if (isDocument(path) && type.indexOf('text/html') === -1) return;
  try { await cache.put(key, response.clone()); } catch (err) {}
}

async function offline(request) {
  var cache = await caches.open(CACHE);
  var key = cacheKey(request);
  var cached = await cache.match(key);
  if (cached) return cached;
  var path = documentKey(new URL(request.url).pathname);
  var fallback = await cache.match(path);
  if (fallback) return fallback;
  if (path === '/app') return cache.match('/app.html');
  if (path === '/too') return cache.match('/too.html');
  if (path === '/minu') return cache.match('/minu.html');
  if (path === '/haldus') return cache.match('/haldus.html');
  return Response.error();
}

async function fromShell(request) {
  var cache = await caches.open(CACHE);
  var key = cacheKey(request);
  var path = new URL(request.url).pathname;
  if (wantsFresh(path)) {
    try {
      var fresh = await fetch(request);
      await store(cache, key, fresh);
      return fresh;
    } catch (err) {
      return offline(request);
    }
  }
  var cached = await cache.match(key);
  var update = fetch(request).then(async function (response) {
    await store(cache, key, response);
    return response;
  }).catch(function () { return null; });
  if (cached) return cached;
  var networked = await update;
  if (networked) return networked;
  return offline(request);
}

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { body: event.data ? event.data.text() : '' };
  }
  var title = data.title || 'SUKODA';
  var target = data.url || '/app';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    data: { url: target },
  }));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.url) || '/app';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.indexOf(target) !== -1 && list[i].focus) return list[i].focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  }));
});
