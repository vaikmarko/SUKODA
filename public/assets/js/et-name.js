/**
 * Allative of an Estonian given name: „Kirjuta Andresele“, „Kirjuta Kristile“.
 *
 * The allative is the genitive stem plus -le. Stems follow Argo Mund,
 * „Õpetusi eestlaste eesnimede käänajale“ (Oma Keel 2/2016) and EKK:
 * given names use the open types, so Mari stays Mari (not Marja) and
 * Laine stays Laine. Where Mund allows two stems, the form listed first
 * is used (Liis → Liisi, Janek → Janeki). Names in -as
 * keep the s: Toomas → Toomasele.
 * A hyphenated name declines on its last part (Hanna-Leen like Leen).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof root === 'object' && root) root.SUKODA_ET = api;
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this, function () {
  'use strict';

  var VOWEL_END = /[aeiouõäöüy]$/i;

  /** Genitive stems Mund or EKK give outright, including the stem vowel. */
  var STEM = {
    aksel: 'Aksli',
    aleksander: 'Aleksandri',
    endel: 'Endli',
    kaarel: 'Kaarli',
    mihkel: 'Mihkli',
    pärtel: 'Pärtli',
    sander: 'Sandri',
    valter: 'Valtri',
    peeter: 'Peetri',
    ott: 'Oti',
    epp: 'Epu',
    hepp: 'Hepu',
    jaak: 'Jaagu',
    priit: 'Priidu',
    tiit: 'Tiidu',
    art: 'Ardi',
    hart: 'Hardi',
    gert: 'Gerdi',
    mart: 'Mardi',
    märt: 'Märdi',
    pent: 'Pendi',
    mark: 'Margi',
    frank: 'Frangi',
    ann: 'Anni',
    mall: 'Malle',
    liis: 'Liisi',
    laas: 'Laasi',
    prits: 'Pritsu',
    karl: 'Karli',
    lembit: 'Lembitu',
  };

  function syllables(word) {
    var groups = String(word).match(/[aeiouõäöü]+/gi);
    return groups ? groups.length : 0;
  }

  function matchCase(sample, stem) {
    if (!sample || !stem) return stem;
    return sample.charAt(0) === sample.charAt(0).toLowerCase()
      ? stem.charAt(0).toLowerCase() + stem.slice(1)
      : stem;
  }

  function etGenitive(name) {
    var raw = String(name || '').trim();
    if (!raw) return '';
    var cut = raw.lastIndexOf('-');
    if (cut > 0 && cut < raw.length - 1) {
      return raw.slice(0, cut + 1) + etGenitive(raw.slice(cut + 1));
    }
    var listed = STEM[raw.toLowerCase()];
    if (listed) return matchCase(raw, listed);
    if (/ke$/i.test(raw) && syllables(raw) >= 3) return raw.slice(0, -2) + 'kese';
    if (/pp$/i.test(raw)) return raw.slice(0, -1) + 'u';
    if (/tt$/i.test(raw)) return raw.slice(0, -1) + 'i';
    if (/kk$/i.test(raw)) return raw.slice(0, -1) + 'u';
    if (VOWEL_END.test(raw)) return raw;
    if (syllables(raw) === 1 && /([aeiouõäöü])\1k$/i.test(raw)) return raw.slice(0, -1) + 'gu';
    if (syllables(raw) === 1 && /([aeiouõäöü])\1t$/i.test(raw)) return raw.slice(0, -1) + 'du';
    if (/[aeiouõäöü]s$/i.test(raw) && syllables(raw) > 1) return raw + 'e';
    return raw + 'i';
  }

  function etAllative(name) {
    var stem = etGenitive(name);
    return stem ? stem + 'le' : '';
  }

  return { etGenitive: etGenitive, etAllative: etAllative };
});
