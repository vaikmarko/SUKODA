/* SUKODA kest.
   Vahemällu lähevad rakenduse HTML, CSS, JS, fondid ja ikoonid.
   /api ning teiste päritolude vastused (Firestore, funktsioonid) ei lähe kunagi vahemällu.
   Offline Täna-järjekord ja FCM ei ole siin. */
'use strict';

var CACHE = 'sukoda-shell-v2';

var PRECACHE = [
  '/app.html',
  '/app.js',
  '/app-shell.css',
  '/manifest.webmanifest',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/fonts/cormorant-garamond-400.woff2',
  '/fonts/inter-400.woff2',
];

var DOCUMENTS = {
  '/app': true,
  '/app.html': true,
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
  if (pathname === '/app.js' || pathname === '/app-shell.css' || pathname === '/manifest.webmanifest') return true;
  if (/^\/assets\/.+\.(css|js|mjs|woff2)$/i.test(pathname)) return true;
  if (/^\/assets\/logo\/.+\.(svg|png|webp)$/i.test(pathname)) return true;
  return false;
}

function documentKey(pathname) {
  var path = cleanPath(pathname);
  if (path === '/app.html') return '/app';
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

async function fromShell(request) {
  var cache = await caches.open(CACHE);
  var key = cacheKey(request);
  var cached = await cache.match(key);
  var update = fetch(request).then(async function (response) {
    if (shouldStore(response)) {
      var type = response.headers.get('content-type') || '';
      var path = new URL(request.url).pathname;
      var html = !isDocument(path) || type.indexOf('text/html') !== -1;
      if (html) {
        try { await cache.put(key, response.clone()); } catch (err) {}
      }
    }
    return response;
  }).catch(function () { return null; });

  if (cached) return cached;
  var fresh = await update;
  if (fresh) return fresh;
  var path = documentKey(new URL(request.url).pathname);
  var fallback = await cache.match(path);
  if (fallback) return fallback;
  if (path === '/app') return cache.match('/app.html');
  if (path === '/minu') return cache.match('/minu.html');
  if (path === '/haldus') return cache.match('/haldus.html');
  return Response.error();
}
