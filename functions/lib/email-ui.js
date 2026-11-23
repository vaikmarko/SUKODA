/**
 * One look for every e-mail, matching the app and the web (assets/css/main.css tokens):
 * paper background, white rounded cards, black rounded buttons, quiet eyebrows, no gold rules.
 * E-mail clients read inline styles only, so the tokens are repeated here as strings.
 */
const C = {
  black: '#141312', paper: '#FAF8F5', cream: '#F3EFE9', muted: '#5F5A54', accent: '#8F6E43',
  line: '#E6E0D8', lineStrong: '#D1C9BF', white: '#FFFFFF',
};
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "Inter, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/** The site's own font files. Clients that ignore web fonts fall back to Georgia and the system sans. */
const FONTS = `<style>
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:400;src:url(https://sukoda.ee/fonts/cormorant-garamond-400.woff2) format('woff2');}
@font-face{font-family:'Inter';font-style:normal;font-weight:400 600;src:url(https://sukoda.ee/fonts/inter-400.woff2) format('woff2');}
</style>`;
const HEAD = `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${FONTS}</head>`;

const BTN_STYLE = `display:inline-block;background:${C.black};color:${C.paper};padding:16px 32px;border-radius:16px;text-decoration:none;font-family:${SANS};font-size:16px;font-weight:600;line-height:1.2;`;
const BTN2_STYLE = `display:inline-block;background:${C.white};color:${C.black};padding:12px 20px;border:1px solid ${C.lineStrong};border-radius:14px;text-decoration:none;font-family:${SANS};font-size:15px;font-weight:500;line-height:1.2;`;
const CARD_STYLE = `background:${C.white};border:1px solid ${C.line};border-radius:20px;padding:24px;`;
const EYEBROW_STYLE = `color:${C.muted};font-family:${SANS};font-size:11px;text-transform:uppercase;letter-spacing:0.16em;font-weight:500;`;
const H2_STYLE = `color:${C.black};font-family:${SERIF};font-weight:400;font-size:32px;line-height:1.1;`;
const P_STYLE = `color:${C.muted};font-family:${SANS};font-size:16px;line-height:1.6;`;

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The wordmark, set like the app's entry screens. `name` is a white-label brand, already trusted text. */
function header(name) {
  return `
    <div style="padding:32px 24px 0;">
      <p style="margin:0;color:${C.black};font-family:${SERIF};font-size:24px;line-height:1;letter-spacing:0.08em;font-weight:400;">${name ? esc(name) : 'SUKODA'}</p>
    </div>`;
}

const QUESTIONS = { et: 'Küsimuste korral', en: 'Questions', ru: 'Если есть вопросы' };
const APP_BY = { et: 'Rakendust pakub', en: 'App by', ru: 'Приложение от' };

function footer(lang, brandName) {
  const l = QUESTIONS[lang] ? lang : 'et';
  const link = `color:${C.black};text-decoration:underline;`;
  const line = brandName
    ? `${esc(brandName)} · ${APP_BY[l]} <a href="https://sukoda.ee" style="${link}">SUKODA</a>`
    : `${QUESTIONS[l]}: <a href="mailto:tere@sukoda.ee" style="${link}">tere@sukoda.ee</a> · <a href="https://sukoda.ee" style="${link}">sukoda.ee</a>`;
  return `
    <div style="margin:0 24px;padding:20px 0 32px;border-top:1px solid ${C.line};">
      <p style="margin:0;color:${C.muted};font-family:${SANS};font-size:13px;line-height:1.6;">${line}</p>
    </div>`;
}

/** A whole letter: wordmark, body, footer on the paper background. */
function shell(inner, lang, brandName) {
  return `<!DOCTYPE html><html>${HEAD}
<body style="margin:0;padding:0;background:${C.paper};font-family:${SANS};">
  <div style="max-width:560px;margin:0 auto;background:${C.paper};">
    ${header(brandName)}
    <div style="padding:28px 24px 32px;">${inner}</div>
    ${footer(lang, brandName)}
  </div>
</body></html>`;
}

const H2 = (text) => `<h2 style="${H2_STYLE}margin:0 0 12px 0;">${text}</h2>`;
const P = (text, extra = '') => `<p style="${P_STYLE}margin:0 0 20px 0;${extra}">${text}</p>`;
const LABEL = (text) => `<p style="${EYEBROW_STYLE}margin:0 0 8px 0;">${text}</p>`;
const ROW = (label, value) => `<p style="margin:12px 0 0 0;padding-top:12px;border-top:1px solid ${C.line};color:${C.muted};font-family:${SANS};font-size:15px;line-height:1.5;">${label}: <strong style="color:${C.black};font-weight:500;">${value}</strong></p>`;
const BTN = (url, text, extra = '') => `<a href="${url}" style="${BTN_STYLE}${extra}">${text}</a>`;
const BTN2 = (url, text, extra = '') => `<a href="${url}" style="${BTN2_STYLE}${extra}">${text}</a>`;
const CARD = (inner, extra = '') => `<div style="${CARD_STYLE}${extra}">${inner}</div>`;
/** A one-time code, large and spaced like the six boxes of the app. */
const CODE = (code) => `<p style="margin:0 0 16px 0;color:${C.black};font-family:${SERIF};font-size:44px;line-height:1;letter-spacing:0.12em;">${esc(code)}</p>`;

module.exports = {
  C, SERIF, SANS, HEAD, BTN_STYLE, BTN2_STYLE, CARD_STYLE, EYEBROW_STYLE, H2_STYLE, P_STYLE,
  header, footer, shell, H2, P, LABEL, ROW, BTN, BTN2, CARD, CODE,
};
