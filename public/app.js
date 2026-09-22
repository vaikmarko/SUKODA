/* /app — kest. Sisselogimist siin ei ole.
   Ainult tegija võti → /haldus. Muul juhul → /minu (seal on juba sisenemine).
   Install-vihje üks kord, ja ainult siis, kui sessioon on olemas. */
(function () {
  'use strict';

  var HINT = 'sukoda_install_hint';
  var ORDER = 'sukoda_portal_token';
  var DESK = 'sukoda_haldus_token';
  var LANG_KEY = 'sukoda_lang';
  var LANGS = ['et', 'en', 'ru'];

  var T = {
    hintTitle: {
      et: 'Lisa avaekraanile',
      en: 'Add to your home screen',
      ru: 'Добавьте на экран «Домой»',
    },
    ios: {
      et: 'Vajuta Jaga, siis Lisa avakuvale.',
      en: 'Tap Share, then Add to Home Screen.',
      ru: 'Нажмите «Поделиться», затем «На экран „Домой“».',
    },
    thenApp: {
      et: 'Siis avaneb SUKODA ikoonist.',
      en: 'SUKODA then opens from the icon.',
      ru: 'Тогда SUKODA откроется с иконки.',
    },
    manual: {
      et: 'Ava see leht telefonis ja lisa avaekraanile.',
      en: 'Open this page on your phone and add it to the home screen.',
      ru: 'Откройте эту страницу на телефоне и добавьте её на экран «Домой».',
    },
    install: {
      et: 'Lisa avaekraanile',
      en: 'Add to home screen',
      ru: 'На экран «Домой»',
    },
    later: { et: 'Hiljem', en: 'Not now', ru: 'Позже' },
    ok: { et: 'Selge', en: 'Got it', ru: 'Понятно' },
    langLabel: { et: 'Keel', en: 'Language', ru: 'Язык' },
  };

  var deferred = null;
  var manual = false;
  var left = false;

  function storeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function storeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function token(key) {
    var value = storeGet(key);
    return value && String(value).trim() ? String(value).trim() : '';
  }

  function lang() {
    var value = storeGet(LANG_KEY);
    return LANGS.indexOf(value) === -1 ? 'et' : value;
  }

  function t(key) {
    var row = T[key] || {};
    return row[lang()] || row.et || '';
  }

  function installed() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches
      || window.navigator.standalone === true;
  }

  function onIos() {
    var ua = window.navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua)
      || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  }

  function hasSession() {
    return !!(token(ORDER) || token(DESK));
  }

  function destination() {
    if (token(DESK) && !token(ORDER)) return '/haldus';
    return '/minu';
  }

  function showHint() {
    if (!hasSession()) return false;
    if (installed()) return false;
    if (storeGet(HINT) === '1') return false;
    return true;
  }

  function leave(dest) {
    if (left) return;
    left = true;
    window.location.replace(dest);
  }

  function dismiss() {
    storeSet(HINT, '1');
    leave(destination());
  }

  function onPrimary() {
    if (deferred && !manual) {
      var promptEvent = deferred;
      deferred = null;
      var button = document.getElementById('primary');
      button.disabled = true;
      promptEvent.prompt();
      promptEvent.userChoice.then(dismiss, dismiss);
      return;
    }
    if (!onIos() && !manual && !deferred) {
      manual = true;
      render();
      return;
    }
    dismiss();
  }

  function render() {
    var current = lang();
    document.documentElement.lang = current;
    document.getElementById('langs').setAttribute('aria-label', t('langLabel'));
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (button) {
      var on = button.getAttribute('data-lang') === current;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    var title = document.getElementById('title');
    var lead = document.getElementById('lead');
    var primary = document.getElementById('primary');
    var later = document.getElementById('later');
    title.textContent = t('hintTitle');
    primary.disabled = false;
    if (onIos()) {
      lead.textContent = t('ios');
      primary.textContent = t('ok');
      later.hidden = true;
    } else if (manual) {
      lead.textContent = t('manual');
      primary.textContent = t('ok');
      later.hidden = true;
    } else {
      lead.textContent = t('thenApp');
      primary.textContent = t('install');
      later.hidden = false;
      later.textContent = t('later');
    }
  }

  function reveal() {
    render();
    document.documentElement.classList.add('stay');
    var primary = document.getElementById('primary');
    if (primary) primary.focus();
  }

  function registerWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(function () {});
  }

  function boot() {
    document.getElementById('primary').addEventListener('click', onPrimary);
    document.getElementById('later').addEventListener('click', dismiss);
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (button) {
      button.addEventListener('click', function () {
        var next = button.getAttribute('data-lang');
        if (LANGS.indexOf(next) === -1) return;
        storeSet(LANG_KEY, next);
        if (document.documentElement.classList.contains('stay')) render();
      });
    });
    window.addEventListener('beforeinstallprompt', function (event) {
      if (!showHint()) return;
      event.preventDefault();
      deferred = event;
      if (document.documentElement.classList.contains('stay') && !manual) render();
    });
    window.addEventListener('appinstalled', dismiss);

    if (!showHint()) {
      registerWorker();
      leave(destination());
      return;
    }

    registerWorker();
    reveal();
  }

  boot();
})();
