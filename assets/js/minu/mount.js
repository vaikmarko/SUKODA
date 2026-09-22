/**
 * Fills view slots before Alpine.start(). This module is loaded from minu.html
 * ahead of assets/js/main.js, which starts Alpine.
 */
import { dict } from './dict.js';
import { koduHtml, pickNextThing } from './kodu.js';
import { telliHtml } from './telli.js';

window.SUKODA_MINU = { dict, pickNextThing };

const kodu = document.getElementById('minu-kodu');
if (kodu) kodu.outerHTML = koduHtml;
const telli = document.getElementById('minu-telli');
if (telli) telli.outerHTML = telliHtml;
