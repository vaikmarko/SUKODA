# Agent setup for SUKODA

Claude and Cursor work from the same files. The way of working is in `CLAUDE.md` at the repo root (both read it); it has the gates table, the skill order and the summary format.

```
CLAUDE.md                    way of working: imports the three rule files below
.cursor/
├── rules/
│   ├── sukoda.mdc           alwaysApply: project context, authority, scope, mutation paths, stop conditions, tests, ET/EN/RU
│   ├── portal-html.mdc      *.html, assets/css, assets/js: one voice, tokens, density, communication in-app
│   └── functions.mdc        functions/**/*.js: where code goes, auth scoping, money, scheduling, e-mail, crons
└── mcp.json                 same content as .mcp.json (Firebase)
.claude/skills/              brainstorm, ehitaplaaniga, review (+ lenses.md), verify, shipit, kirjuta, design-review
```

Rules and skills are changed only in those files; there are no separate command copies for Cursor.

## Sprint agents — how to start one

One agent = one screen or one layer. `minu.html`, `haldus.html`, `functions/haldus.js` are mega-files; two agents in the same file at the same time produce merge conflicts, so parallel agents take disjoint files. Every agent first makes a plan (Plan mode), the plan gets `/review`, then it builds.

Prompt template (Estonian, paste into a fresh chat):

```
Loe PLATVORMIPLAAN_2026.md: peatükk „Standard“, §0 põhimõtted, §3.8 tehniline hügieen ja sprint 1 rida §4 tabelis („Ehitamise järjekord“). §5 on Arco pakkumine, mitte sprint.
Sinu lõik: <ÜKS asi sprint 1 reast>.
Failid, mida tohid puutuda: <loetelu>. Muid faile ei puutu — kui midagi on vaja mujal, kirjuta see kokkuvõttesse ettepanekuna.
Tee kõigepealt plaan: mis ekraan/handler, mis Firestore väljad, mis on „selle pärast ei pea X enam Y-t tegema“, kuidas kontrollid (test haldus-core.js loogikale, /verify käitumisele). Näita plaan enne ehitamist.
Ehitades: uued laused T-sõnastikku et/en/ru; ternaare ei lisa; kui puutud ekraani, migreeri selle ekraani ternaarid T-sse; npm run check roheline; commit eesti keeles; kokkuvõte CLAUDE.md vormis. Deploy’d ei tee.
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

Klaariks' migration trio, Drizzle safety guards, Pino logging, English-only backend errors (this repo shows Estonian backend errors directly on screen — see `functions.mdc`), Linear ticket workflow and benchmark verifiers. Add them when the stack grows into them, not before.
