/**
 * i18n routing middleware for Firebase Cloud Functions.
 *
 * Serves the correct language version of static pages based on URL prefix:
 *   /en/kingitus -> serves kingitus.html with lang=en injected
 *   /kingitus    -> serves kingitus.html (default Estonian)
 *
 * This enables search engines to index both language versions at distinct URLs,
 * solving the Alpine.js x-show invisibility problem for crawlers.
 */

const SUPPORTED_LANGS = ['et', 'en'];
const DEFAULT_LANG = 'et';

const PAGES = [
  'index',
  'kingitus',
  'lugu',
  'partnerlus',
  'lunasta',
  'privaatsus',
  'tingimused',
];

function getHreflangTags(pageName) {
  const base = 'https://sukoda.ee';
  const path = pageName === 'index' ? '' : `/${pageName}`;
  return [
    `<link rel="alternate" hreflang="et" href="${base}${path}">`,
    `<link rel="alternate" hreflang="en" href="${base}/en${path}">`,
    `<link rel="alternate" hreflang="x-default" href="${base}${path}">`,
  ].join('\n    ');
}

module.exports = { SUPPORTED_LANGS, DEFAULT_LANG, PAGES, getHreflangTags };
