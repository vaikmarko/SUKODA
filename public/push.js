/* Teavituse luba ja telefoni võti. Elanikul pärast kinnitatud visiiti, töölaual kui töölaud on lahti. */
(function () {
  'use strict';

  var PUBLIC = 'BPWbsCMuk8K01yI1Ue8OMpIdE7_GTTo9GwJL13T8CNbpdR2sYpr83ny2g-6FkKS3Z7Visxt_1juoH135QWoErzk';
  var ASKED = { home: 'sukoda_push_asked_home_v2', desk: 'sukoda_push_asked_desk_v2' };
  var T = {
    label: { et: 'Teavitused', en: 'Notifications', ru: 'Уведомления' },
    homeLead: {
      et: 'Luba teavitused selle kohta, mis kodus toimub.',
      en: 'Allow notifications about what happens at the home.',
      ru: 'Разрешите уведомления о том, что происходит дома.',
    },
    deskLead: {
      et: 'Luba tööpäeva teavitused. Siis jõuavad uus soov ja hommikune nimekiri siia telefoni.',
      en: 'Allow notifications for the working day. Then a new request and the morning list come to this phone.',
      ru: 'Разрешите уведомления о рабочем дне. Тогда новая заявка и утренний список придут на этот телефон.',
    },
    allow: { et: 'Luba teavitused', en: 'Allow notifications', ru: 'Разрешить уведомления' },
    later: { et: 'Hiljem', en: 'Not now', ru: 'Позже' },
  };
  var bound = false;
  var current = null;

  function langOf(lang) {
    return lang === 'en' || lang === 'ru' ? lang : 'et';
  }

  function t(key, lang) {
    var row = T[key] || {};
    return row[langOf(lang)] || row.et || '';
  }

  function supported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function asked(audience) {
    try { return localStorage.getItem(ASKED[audience] || ASKED.home) === '1'; } catch (e) { return false; }
  }

  function mark(audience) {
    try { localStorage.setItem(ASKED[audience] || ASKED.home, '1'); } catch (e) {}
  }

  function synced(audience) {
    try { return sessionStorage.getItem('sukoda_push_synced_' + audience) === '1'; } catch (e) { return false; }
  }

  function markSynced(audience) {
    try { sessionStorage.setItem('sukoda_push_synced_' + audience, '1'); } catch (e) {}
  }

  function hide() {
    var el = document.getElementById('push-offer');
    if (el) el.hidden = true;
  }

  function fill(opts) {
    var el = document.getElementById('push-offer');
    if (!el) return;
    var label = el.querySelector('[data-push-label]');
    var lead = el.querySelector('[data-push-lead]');
    var allow = el.querySelector('[data-push-allow]');
    var later = el.querySelector('[data-push-later]');
    if (label) label.textContent = t('label', opts.lang);
    if (lead) lead.textContent = t(opts.audience === 'desk' ? 'deskLead' : 'homeLead', opts.lang);
    if (allow) allow.textContent = t('allow', opts.lang);
    if (later) later.textContent = t('later', opts.lang);
    el.hidden = false;
  }

  function keyBytes(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function subscribe(opts) {
    if (synced(opts.audience)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(function () { return navigator.serviceWorker.ready; })
      .then(function (reg) {
        return reg.pushManager.getSubscription().then(function (existing) {
          if (existing) return existing;
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC) });
        });
      })
      .then(function (sub) {
        var json = sub.toJSON();
        return fetch('/api/haldus/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + opts.token },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        });
      })
      .then(function (res) {
        if (res && res.ok) {
          mark(opts.audience);
          markSynced(opts.audience);
        }
        hide();
      })
      .catch(function () { hide(); });
  }

  function bind() {
    if (bound) return;
    var el = document.getElementById('push-offer');
    if (!el) return;
    bound = true;
    var allow = el.querySelector('[data-push-allow]');
    var later = el.querySelector('[data-push-later]');
    if (allow) {
      allow.addEventListener('click', function () {
        if (!current) return;
        var opts = current;
        Notification.requestPermission().then(function (perm) {
          if (perm === 'granted') subscribe(opts);
          else { mark(opts.audience); hide(); }
        }).catch(function () { mark(opts.audience); hide(); });
      });
    }
    if (later) {
      later.addEventListener('click', function () {
        if (current) mark(current.audience);
        hide();
      });
    }
  }

  function offer(opts) {
    if (!opts || !opts.token || !opts.when) return;
    if (!supported()) return;
    current = opts;
    bind();
    if (Notification.permission === 'granted') {
      subscribe(opts);
      return;
    }
    if (Notification.permission !== 'default') return;
    if (asked(opts.audience)) return;
    fill(opts);
  }

  window.SUKODA_PUSH = { offer: offer };
})();
