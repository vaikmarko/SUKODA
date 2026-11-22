# CLAUDE.md

Working rules for the SUKODA repository. Both Claude and Cursor read this file. The project, design and backend rules are in `.cursor/rules/` and apply here too:

@.cursor/rules/sukoda.mdc
@.cursor/rules/portal-html.mdc
@.cursor/rules/functions.mdc

Below is the way of working: how a change is made, checked and handed over. If it conflicts with those rule files or with `PLATVORMIPLAAN_2026.md`, they win and Marko is told about the conflict.

## Starting

- Before writing code, read the parts of `PLATVORMIPLAAN_2026.md` that govern the task ("Standard", §0 principles, §3.8 technical hygiene and the relevant row of §4). If the plan is silent, unclear or contradictory, say what you assume and take the smallest reversible path; for a stop condition (`sukoda.mdc` §4), stop and ask.
- Do not ask permission for routine work: read and edit files, run the fastest relevant check after each change (`npm test`, `npm run lint:ui`, `node --check functions/haldus.js`) and say what you did. Ask only before destructive or irreversible actions: deleting Firestore data, deploying rules, refunds, force-push, mass e-mail.
- Talk to Marko in Estonian. Rules and code are in English; commit messages, plans and summaries are in Estonian.

## How to write code

- **Say your assumptions** before building. If you did not read the handler, say so. If there are several readings, show them and do not pick silently. If there is a simpler way, say so.
- **Simplicity first.** Write as little code as the task needs. No abstractions for one-off code, no flexibility nobody asked for.
- **Surgical changes.** Every changed line traces to the request. In the mega-files touch only the block you need and never reformat around it. Remove only what your change made unused. Other issues: mention them, don't fix them.
- **The goal must be checkable.** "Fix the bug" means: write the test that shows the bug, then make it green. For multi-step work say at each step how you will check it worked.
- **A comment says why, not what:** the rule, the chapter of the plan, the timing or security reason, why something was deliberately left out. The history of a fix belongs in the commit.

## When you change behaviour

- **Start from what the person does.** Find the button and its `fetch('/api/…')`, then the handler key, then the Firestore writes and the mails. Never assume which endpoint a button calls.
- **Find every writer.** `orders` is written from `functions/index.js`, `functions/haldus.js` and the seed scripts. Grep them all before changing how a field is written or read.
- **The right order.** A handler that changes an order and then decides on a notification, a reminder, a conflict or a credit evaluates the changed data, not the stale snapshot.

## Who decides

| Who | Decides |
|---|---|
| **Marko** | Product and behaviour, UI and UX, every text a resident, a provider or a developer sees, the stop conditions in `sukoda.mdc` §4 (money, who gets an e-mail or push, deleting data, auth, Firestore rules, the Arco and Cristelle journeys), costs, and every deploy |
| **Claude** | Technical choices the code or the plan answers: where code goes, names, query shape, tests. With no rule, take the simpler and safer choice and name it in the summary |

Ask all questions at once, recommended option first.

## Tests and gates

| Command | What | When |
|---|---|---|
| `npm test` | `node:test` over `functions/test/*.test.js` and `assets/js/minu/kodu.test.mjs` | Every change under `functions/` or `assets/js/minu/` |
| `npm run lint:ui` | `scripts/ui-lint.js`: raw hex, `text-[Npx]`, hand-rolled eyebrows, inline language ternaries and catalogue entries without `ru`, counted per file against `scripts/ui-lint.baseline.json`. A count may only fall | Every HTML or CSS change |
| `npm run check` | lint:ui, `node --check` on every function file, tests | Before every commit; runs inside `npm run deploy*` |
| CI | the same checks plus the Vite build on a push or PR to `main` | Automatic |

- A bug fix in pure logic comes with a regression test. New scheduling, pricing, sanitizing, reminder or catalogue logic goes into `functions/lib/haldus-core.js` with a test.
- `node scripts/ui-lint.js --update` only after a reviewed sweep, never to make a red build green.
- Never commit with a red `npm run check`.

## Gates and skills

A change goes through the skills in `.claude/skills/` in this order:

`/brainstorm` (an idea, no plan yet) → `/ehitaplaaniga` (plan and first slice) → `/review` → `/verify` → `/shipit` (commit, checks, push, deploy on Marko's yes)

`/kirjuta` is the procedure for Estonian text: use it whenever Estonian is written or corrected (UI strings, e-mail templates, plans, commit messages). `/design-review` is the read-only audit of every portal page for drift and density: run it before a demo, after a sprint, or when a page "feels busy".

`/review` and `/verify` are mandatory when a change touches more than three files, money, scheduling, auth or sessions, e-mail or push, or Firestore rules.

Then the summary has a gates line and every gate has its evidence:

```
Väravad: /review ✅ 2 leidu, mõlemad parandatud · /verify ✅ data, emulaator, kordus ei tekitanud teist broneeringut · npm run check ✅ 41 testi
```

`✅` names what the gate produced. `⏭️ vahele` gives the reason. `❌ ei jooksnud` is also written under Marko's move. A bare `✅` is not a report.

## Git and deploying

- Commit when a unit of work is complete. The message is in Estonian and says what changed for the resident, the provider or Arco, in the voice of `git log`. Never mix unrelated changes in one commit. Stage files by name.
- A push to `main` runs CI and deploys nothing. Never force-push. If the session cannot push to `main`, push a branch and open a PR; the merge is Marko's click.
- **Never `firebase deploy` without Marko's instruction.** When asked: `npm run deploy` (hosting) or `npm run deploy:functions`. Deploy single functions when possible: `firebase deploy --only functions:haldusApi`, then confirm with `firebase functions:log --only <name>` that it cold-starts without errors. Do not deploy and "see what happens". Fix first.
- Never deploy `firestore:rules` as a side effect.
- Secrets and keys never go into code, docs, chat or a commit.

## Claude and Cursor

Both work from the same files, so it makes no difference which one Marko is in.

| What | File | Claude | Cursor |
|---|---|---|---|
| Project rules | `.cursor/rules/sukoda.mdc` | imports it through this file | always applies it |
| Design voice, backend conventions | `.cursor/rules/portal-html.mdc`, `.cursor/rules/functions.mdc` | imports them through this file | applies them by file pattern |
| Way of working | `CLAUDE.md` | reads it | reads it like `AGENTS.md` |
| Skills | `.claude/skills/` | reads them | reads them from the compatibility folder |
| MCP (Firebase) | `.mcp.json`, `.cursor/mcp.json` | `.mcp.json` | `.cursor/mcp.json` |

- Rules and skills are changed only in these files. No separate copies are made for Cursor.
- The two MCP files have the same content. When you change one, change the other in the same commit.
- The skills name Claude's tools. In Cursor use the equivalent: a subagent (`Agent`, `Explore`) is a Cursor subagent or the same work done in sequence, `AskUserQuestion` is one question in the chat with the options, and instead of an Artifact make an HTML file in the session's scratch folder.
- Sprint agents and the split that keeps them out of each other's files: `.cursor/README.md`.

## Summary for Marko

Every completed task ends with this, in Estonian, written so that Cristelle or Arco's after-sales could understand it:

```
────────────────────────
Kokkuvõte
────────────────────────
```

**Kontekst**: 1-2 lauset, milline voog või ekraan.
**Mis oli katki ja miks**: kui asjakohane, lihtsas keeles.
**Mis muutus**: loetelu ainult nähtavast käitumisest, ilma failinimedeta.
**Väravad**: the gates line, when it applies.
**Seis**: Commit: JAH/EI (hash) · Push: JAH/EI · Deploy: EI / hosting / functions:<nimi> · Testid: N läbis · `lint:ui`: roheline/punane · Plaan (`PLATVORMIPLAAN_2026.md`): uuendatud / ei vajanud.
**Mida testida** (1-3 sammu) and **Marko käik**, when something is expected from him. Name open limits and cases not covered.
