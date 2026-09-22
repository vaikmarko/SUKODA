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
| `npm run lint:ui` | `scripts/ui-lint.js` — counts raw hex, `text-[Npx]`, hand-rolled eyebrows, one-language ternaries against `scripts/ui-lint.baseline.json`. Count may only fall. | Every HTML/CSS change |
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

## What was deliberately not brought over

Klaariks' migration trio, Drizzle safety guards, Pino logging, English-only backend errors (this repo shows Estonian backend errors directly on screen — see `functions.mdc`), Linear ticket workflow, benchmark verifiers, and the `.claude/` mirror. Add them when the stack grows into them, not before.
