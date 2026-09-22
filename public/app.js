/* /app — kest.
   Sessiooniga: tegija võti → /haldus, muul juhul → /minu.
   Ilma sessioonita: e-post → 6-kohaline kood siin, mitte avaleht.
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
    signTitle: { et: 'Sisene', en: 'Sign in', ru: 'Войти' },
    signLead: {
      et: 'Kirjuta e-post. Saadame kuuekohalise koodi.',
      en: 'Enter your e-mail. We send a six-digit code.',
      ru: 'Укажите эл. почту. Мы отправим шестизначный код.',
    },
    emailLabel: { et: 'E-post', en: 'E-mail', ru: 'Эл. почта' },
    sendCode: { et: 'Saada kood', en: 'Send the code', ru: 'Отправить код' },
    codeTitle: { et: 'Kood on kirjas', en: 'The code is in your e-mail', ru: 'Код в письме' },
    codeLead: {
      et: 'Kirjuta kuus numbrit siia.',
      en: 'Enter the six digits here.',
      ru: 'Введите шесть цифр сюда.',
    },
    codeLabel: { et: 'Kood', en: 'Code', ru: 'Код' },
    enter: { et: 'Sisene', en: 'Sign in', ru: 'Войти' },
    cardLine: {
      et: 'Sul on kaardil kood?',
      en: 'You have a code on a card?',
      ru: 'Код на карточке?',
    },
    cardLink: { et: 'Ava see siin', en: 'Open it here', ru: 'Откройте его здесь' },
    sending: { et: 'Saadan', en: 'Sending', ru: 'Отправляю' },
    checking: { et: 'Kontrollin', en: 'Checking', ru: 'Проверяю' },
    emailFail: {
      et: 'Kirjuta e-post.',
      en: 'Enter an e-mail.',
      ru: 'Укажите эл. почту.',
    },
    mailFail: {
      et: 'Kirja ei õnnestunud saata. Proovi uuesti.',
      en: 'The e-mail could not be sent. Try again.',
      ru: 'Письмо не удалось отправить. Попробуйте снова.',
    },
    codeFail: {
      et: 'Kood ei sobi. Kontrolli kirja või küsi uus.',
      en: 'That code does not work. Check the e-mail or ask for a new one.',
      ru: 'Код не подошёл. Проверьте письмо или запросите новый.',
    },
  };

  var deferred = null;
  var manual = false;
  var left = false;
  var mode = 'hint';
  var email = '';
  var busy = false;

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

  function showError(message) {
    var el = document.getElementById('login-error');
    if (!message) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = message;
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
    var login = document.getElementById('login');
    var field = document.getElementById('field');
    var signing = mode === 'email' || mode === 'code';
    login.hidden = !signing;
    primary.disabled = busy;
    if (!signing) {
      title.textContent = t('hintTitle');
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
      return;
    }

    later.hidden = true;
    document.getElementById('card-text').textContent = t('cardLine');
    document.getElementById('card-link').textContent = t('cardLink');
    document.getElementById('card-line').hidden = mode !== 'email';
    if (mode === 'email') {
      title.textContent = t('signTitle');
      lead.textContent = t('signLead');
      document.getElementById('field-label').textContent = t('emailLabel');
      field.type = 'email';
      field.inputMode = 'email';
      field.autocomplete = 'username';
      field.maxLength = 120;
      primary.textContent = busy ? t('sending') : t('sendCode');
      return;
    }
    title.textContent = t('codeTitle');
    lead.textContent = t('codeLead');
    document.getElementById('field-label').textContent = t('codeLabel');
    field.type = 'text';
    field.inputMode = 'numeric';
    field.autocomplete = 'one-time-code';
    field.maxLength = 6;
    primary.textContent = busy ? t('checking') : t('enter');
  }

  function errorText(data, fallback) {
    var err = data && data.error;
    if (err && typeof err === 'object') return err[lang()] || err.et || fallback;
    return fallback;
  }

  function postJson(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, data: data };
      });
    });
  }

  function onLogin() {
    if (busy) return;
    var field = document.getElementById('field');
    var value = String(field.value || '').trim();
    showError('');
    if (mode === 'email') {
      if (value.indexOf('@') < 1) {
        showError(t('emailFail'));
        field.focus();
        return;
      }
      email = value;
      busy = true;
      render();
      postJson('/api/haldus/login/code', { email: email }).then(function (res) {
        busy = false;
        if (!res.ok) {
          showError(errorText(res.data, t('mailFail')));
          render();
          return;
        }
        mode = 'code';
        field.value = '';
        render();
        field.focus();
      }).catch(function () {
        busy = false;
        showError(t('mailFail'));
        render();
      });
      return;
    }
    if (!/^\d{6}$/.test(value)) {
      showError(t('codeFail'));
      field.focus();
      return;
    }
    busy = true;
    render();
    postJson('/api/haldus/login/verify', { email: email, code: value }).then(function (res) {
      busy = false;
      if (!res.ok || !res.data || !res.data.token) {
        showError(errorText(res.data, t('codeFail')));
        render();
        return;
      }
      storeSet(res.data.desk ? DESK : ORDER, res.data.token);
      if (res.data.desk) {
        try { localStorage.removeItem(ORDER); } catch (e) {}
      }
      mode = 'hint';
      if (!showHint()) {
        registerWorker();
        leave(destination());
        return;
      }
      registerWorker();
      reveal();
    }).catch(function () {
      busy = false;
      showError(t('codeFail'));
      render();
    });
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
    document.getElementById('primary').addEventListener('click', function () {
      if (mode === 'email' || mode === 'code') onLogin();
      else onPrimary();
    });
    document.getElementById('login').addEventListener('submit', function (event) {
      event.preventDefault();
      onLogin();
    });
    document.getElementById('field').addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        onLogin();
      }
    });
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
      if (document.documentElement.classList.contains('stay') && !manual && mode === 'hint') render();
    });
    window.addEventListener('appinstalled', dismiss);

    registerWorker();
    if (!hasSession()) {
      mode = 'email';
      reveal();
      document.getElementById('field').focus();
      return;
    }
    if (!showHint()) {
      leave(destination());
      return;
    }
    reveal();
  }

  boot();
})();
