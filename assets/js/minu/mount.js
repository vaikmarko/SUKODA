/**
 * Fills the services slot before Alpine.start(). Loaded as a module ahead of
 * assets/js/main.js. The Kodu card is already in the page; its logic is the
 * classic script assets/js/minu/kodu.js.
 */
import { dict } from './dict.js';
import { telliHtml } from './telli.js';
import { minuHtml } from './minu.js';
import { kaustHtml } from './kaust.js';

window.SUKODA_MINU = window.SUKODA_MINU || {};
window.SUKODA_MINU.dict = Object.assign(window.SUKODA_MINU.dict || {}, dict);

const telli = document.getElementById('minu-telli');
if (telli) telli.outerHTML = telliHtml;
const minu = document.getElementById('minu-minu');
if (minu) minu.outerHTML = minuHtml;
const kaust = document.getElementById('minu-kaust');
if (kaust) kaust.outerHTML = kaustHtml;
