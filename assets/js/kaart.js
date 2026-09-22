import Alpine from 'alpinejs';
import '../css/main.css';
import { qrSvg } from '../../functions/lib/qr.js';

const REDEEM = 'https://sukoda.ee/lunasta?code=';
const CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

const T = {
  print: { et: 'Prindi', en: 'Print', ru: 'Печать' },
  missing: {
    et: 'Kaardil pole koodi.',
    en: 'This card has no code.',
    ru: 'На карте нет кода.',
  },
  scan: {
    et: 'Skanni kood ja ava oma kodu.',
    en: 'Scan the code and open your home.',
    ru: 'Отсканируйте код и откройте свой дом.',
  },
};

function cardApp() {
  const params = new URLSearchParams(window.location.search);
  const raw = String(params.get('code') || '').toUpperCase();
  const code = CODE.test(raw) ? raw : '';
  const address = String(params.get('address') || '').trim().slice(0, 160);
  const name = String(params.get('name') || '').trim().slice(0, 120);
  const url = code ? REDEEM + code : '';
  return {
    lang: ['et', 'en', 'ru'].includes(localStorage.getItem('sukoda_lang')) ? localStorage.getItem('sukoda_lang') : 'et',
    code,
    address,
    name,
    svg: url ? qrSvg(url) : '',
    get faces() {
      return ['et', 'en', 'ru'].map((lang) => T.scan[lang]);
    },
    t(key) {
      const row = T[key] || {};
      return row[this.lang] || row.et || key;
    },
    langClass(code) {
      return this.lang === code ? 'text-black' : 'text-muted';
    },
    print() {
      window.print();
    },
  };
}

window.Alpine = Alpine;
Alpine.data('cardApp', cardApp);
Alpine.start();
