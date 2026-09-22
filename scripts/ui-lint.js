#!/usr/bin/env node
/**
 * SUKODA UI lint — keeps the portal in one voice.
 *
 * Counts drift per check per file and compares against scripts/ui-lint.baseline.json.
 * A count may only go down. A higher count in any file fails the build and names
 * the file; a lower count is written back so the ratchet tightens.
 *
 *   node scripts/ui-lint.js            # check
 *   node scripts/ui-lint.js --update   # accept current counts (only after a deliberate, reviewed sweep)
 *
 * Checks:
 *   hex        raw #RRGGBB in HTML (tokens live in assets/css/main.css)
 *   px         arbitrary font sizes text-[Npx] (scale: text-xs/sm/base, serif lg/xl/2xl/3xl, .eyebrow)
 *   eyebrow    hand-rolled caps labels (text-[10|11px] … uppercase) instead of .eyebrow
 *   emptyEn    lang === 'et' ? '…' : ''  — Estonian without English (hard zero)
 *   ternary    inline lang === 'et' ? … : … — binary, cannot carry ru; new strings use T + t() (ratchet)
 *   etOnlyCore { et: '…' } without en: in functions/lib/haldus-core.js (hard zero)
 *   noRuCore   et: '…', en: '…' without ru: in haldus-core.js — two languages where three are needed (ratchet)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASELINE = path.join(__dirname, 'ui-lint.baseline.json');
const PAGES = ['index.html', 'minu.html', 'haldus.html', 'lunasta.html', 'kaart.html', 'admin.html', 'arendajale.html', 'kingitus.html', 'success.html', 'muuk.html', 'sales.html', 'lugu.html', 'deck.html'];
const CORE = 'functions/lib/haldus-core.js';

const CHECKS = {
  hex: { files: PAGES, re: /#[0-9A-Fa-f]{6}\b/g, hint: 'use a token from assets/css/main.css (border-line, border-line-strong, text-muted-light)' },
  px: { files: PAGES, re: /\btext-\[[0-9.]+px\]/g, hint: 'use text-xs / text-sm / text-base or class="eyebrow"' },
  eyebrow: { files: PAGES, re: /text-\[1[01]px\][^"]*\buppercase\b|\buppercase\b[^"]*text-\[1[01]px\]/g, hint: 'use class="eyebrow"' },
  emptyEn: { files: PAGES, re: /lang === 'et' \? '[^']+' : ''/g, hint: 'add the English text' },
  ternary: { files: PAGES, re: /lang === 'et' \?/g, hint: "new strings go through T = { key: { et, en, ru } } and t('key') — see portal-html.mdc" },
  etOnlyCore: { files: [CORE], re: /\{\s*et:\s*'[^']*'\s*\}/g, hint: 'add en: next to et:' },
  noRuCore: { files: [CORE], re: /et:\s*'[^']*',\s*en:\s*'[^']*'(?!,\s*ru:)/g, hint: 'add ru: next to en: — three languages on the resident side' },
};

function read(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/** → { check: { file: count } }, plus matches[check][file] = ['file:line  snippet', …] */
function run() {
  const counts = {};
  const matches = {};
  for (const [name, check] of Object.entries(CHECKS)) {
    counts[name] = {};
    matches[name] = {};
    for (const rel of check.files) {
      const text = read(rel);
      if (!text) continue;
      const re = new RegExp(check.re.source, check.re.flags);
      let m;
      let n = 0;
      const list = [];
      while ((m = re.exec(text))) {
        n++;
        list.push(`${rel}:${lineOf(text, m.index)}  ${m[0].slice(0, 70)}`);
      }
      if (n) { counts[name][rel] = n; matches[name][rel] = list; }
    }
  }
  return { counts, matches };
}

function total(perFile) {
  return Object.values(perFile).reduce((a, b) => a + b, 0);
}

function main() {
  const update = process.argv.includes('--update');
  const { counts, matches } = run();
  const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null;

  if (!baseline || update) {
    fs.writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + '\n');
    const summary = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, total(v)]));
    console.log(`ui-lint: baseline ${baseline ? 'updated' : 'created'}`, summary);
    return;
  }

  let failed = false;
  let tightened = false;
  for (const [name, perFile] of Object.entries(counts)) {
    const was = baseline[name] || {};
    const files = new Set([...Object.keys(perFile), ...Object.keys(was)]);
    const grew = [];
    for (const f of files) {
      const now = perFile[f] || 0;
      const before = was[f] || 0;
      if (now > before) grew.push({ f, now, before });
      else if (now < before) tightened = true;
    }
    const nowTotal = total(perFile);
    const wasTotal = total(was);
    if (grew.length) {
      failed = true;
      console.error(`✗ ${name}: ${nowTotal} (baseline ${wasTotal}) — ${CHECKS[name].hint}`);
      for (const g of grew) {
        console.error(`    ${g.f}: ${g.now} (was ${g.before}) — last hits in this file:`);
        for (const s of (matches[name][g.f] || []).slice(-3)) console.error(`      ${s}`);
      }
    } else if (nowTotal < wasTotal) {
      console.log(`✓ ${name}: ${nowTotal} (was ${wasTotal}) — baseline tightened`);
    } else {
      console.log(`· ${name}: ${nowTotal}`);
    }
  }
  if (failed) {
    console.error('\nui-lint: new drift introduced. Fix it, or run with --update only after a deliberate, reviewed sweep.');
    process.exit(1);
  }
  if (tightened) fs.writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + '\n');
  console.log('ui-lint: ok');
}

main();
