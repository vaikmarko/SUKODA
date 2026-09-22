# Cursor setup for SUKODA

Brought over from the Klaariks project (`.cursor/` there) and adapted to this stack: static HTML + Alpine + Tailwind v4, Firebase Functions + Firestore, Stripe. No TypeScript, no ORM, no Vitest — so the rules are lighter and the tests run on `node:test` with zero dependencies.

```
.cursor/
├── rules/
│   ├── sukoda-session.mdc   alwaysApply — scope, quality gates, ET/EN/RU parity, deploy checklist, summary format
│   ├── portal-html.mdc      *.html, assets/css, assets/js — one voice, tokens, density, communication in-app
│   └── functions.mdc        functions/**/*.js — where code goes, auth scoping, money, scheduling, e-mail, crons
└── commands/
    ├── review.md            /review — trace paths, mutation sites, edge cases, test coverage, verdict
    ├── verify.md            /verify — button → fetch → handler → Firestore, against emulator or demo account
    └── design-review.md     /design-review — read-only audit of every portal page for drift and density
```

## Gates

| Command | What | When |
|---|---|---|
| `npm test` | `node:test` over `functions/test/*.test.js` — pure logic in `functions/lib/haldus-core.js` | Every change under `functions/` |
| `npm run lint:ui` | `scripts/ui-lint.js` — counts raw hex, `text-[Npx]`, hand-rolled eyebrows, inline `lang === 'et'` ternaries, one-language ternaries and two-language catalogue entries against `scripts/ui-lint.baseline.json`. Count may only fall. | Every HTML/CSS change |
| `npm run check` | lint:ui + `node --check` on every function file + tests | Before every commit; runs automatically inside `npm run deploy*` |
| `.github/workflows/ci.yml` | Same three checks + Vite build on push/PR to `main` | Automatic |

The baseline ratchet: existing drift (482 raw hex, 557 `text-[Npx]`, 485 hand-rolled eyebrows on 22.09.2026) is tolerated; new drift fails. When a page is deliberately swept to `.eyebrow` / tokens, the baseline tightens itself. `node scripts/ui-lint.js --update` only after a reviewed sweep, never to make a red build green.

## When to run what

| Situation | Run |
|---|---|
| Plan ready, before implementing | `/review` |
| Implementation done, >3 files or money/scheduling/auth/e-mail touched | `/review` |
| Before deploy of a behaviour change | `/verify <flow>` |
| Before a demo, after a sprint, or a page "feels busy" | `/design-review` |

## Sprint agents — how to start one

One agent = one screen or one layer. `minu.html`, `haldus.html`, `functions/haldus.js` are mega-files; two agents in the same file at the same time produce merge conflicts, so parallel agents take disjoint files. Every agent first makes a plan (Plan mode), the plan gets `/review`, then it builds.

Prompt template (Estonian, paste into a fresh chat):

```
Loe PLATVORMIPLAAN_2026.md: peatükk „Standard“, §0 põhimõtted, §3.8 tehniline hügieen ja sprint 1 rida §5 tabelis.
Sinu lõik: <ÜKS asi sprint 1 reast>.
Failid, mida tohid puutuda: <loetelu>. Muid faile ei puutu — kui midagi on vaja mujal, kirjuta see kokkuvõttesse ettepanekuna.
Tee kõigepealt plaan: mis ekraan/handler, mis Firestore väljad, mis on „selle pärast ei pea X enam Y-t tegema“, kuidas kontrollid (test haldus-core.js loogikale, /verify käitumisele). Näita plaan enne ehitamist.
Ehitades: uued laused T-sõnastikku et/en/ru; ternaare ei lisa; kui puutud ekraani, migreeri selle ekraani ternaarid T-sse; npm run check roheline; commit eesti keeles; kokkuvõte §6 vormis. Deploy’d ei tee.
```

Sprint 1 split that does not collide (22.09.2026):

| Agent | Lõik | Failid |
|---|---|---|
| **A · PWA kest** | `manifest.webmanifest`, `sw.js` (cache shell, ei cache’i `/api`), install-vihje, `/app` mis suunab rolli järgi (`order` → `minu`, `provider` → `haldus`), ikoonid | uued failid, `firebase.json` rewrite, `index.html` üks link |
| **B · Elaniku Kodu** | `minu.html` Kodu-ekraan „järgmine asi“ + monoliidi tükeldamine vaadete kaupa `assets/js/minu/*.js` (Kodu → Telli → Kaust → Minu, üks vaade = üks commit), ternaarid → `T` | `minu.html`, `assets/js/minu/**`, `assets/css/main.css` ainult uued `.p-*` |
| **C · Tegija Täna** | `haldus.html` Täna-vaade + visiidikaart (kood nähtav ainult visiidi aknas, elaniku number, tänane nimekiri = tellitud lisad + rütmi read tähtajas), **Tehtud** → rütm edasi; töölaud EN | `haldus.html`, `functions/haldus.js` ainult `POST /api/haldus/visits/:id/done` ja selle abifunktsioonid |
| **D · Keel ja teated** | `langOf`/`pick` kolmele keelele, `order.lang` salvestus, kataloogi 141 rida `ru`, kirjade mallid `{ et, en, ru }`, push 5 tüüpi (FCM) + e-kiri sama sisuga | `functions/lib/haldus-core.js`, `functions/test/**`, `functions/haldus.js` ainult kirjamallid ja `notify*`, `functions/push.js` uus |

**E · Sisenemine koodiga** (e-post → 6-kohaline kood rakenduses, sessioon `localStorage`-is, passkey hiljem) puutub `functions/haldus.js` auth-osa ja `minu.html`/`haldus.html` login-plokki — käivita pärast B ja C, mitte paralleelselt. Auth on §4 stop-tingimus: plaan enne ehitamist inimesele ette.

Order of merging: D → A → B → C → E. Each agent rebases on `main` before its final commit and runs `npm run check` after the rebase.

## What was deliberately not brought over

Klaariks' migration trio, Drizzle safety guards, Pino logging, English-only backend errors (this repo shows Estonian backend errors directly on screen — see `functions.mdc`), Linear ticket workflow, benchmark verifiers, and the `.claude/` mirror. Add them when the stack grows into them, not before.
