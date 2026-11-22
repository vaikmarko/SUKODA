---
name: review
description: Stress-test a plan or a diff for correctness, money, auth scoping, language parity and SUKODA rule violations. Deterministic checks, parallel fresh-eyes lenses, then a verification pass that tries to refute every finding before it is reported. Use after any non-trivial change, before pushing or deploying, or on a plan before building; also the engine /ehitaplaaniga and /shipit call. Reports by default; --fix applies confirmed mechanical fixes. Never pushes or deploys.
argument-hint: "[plan|diff] [target: path, range, PR#] [--fix]"
---

# /review: find what is wrong, prove it, then say it

Two modes. **Plan mode** interrogates a plan before code exists and rewrites the plan. **Diff mode**
reviews code that exists and reports findings that survived an attempt to refute them. Decide the mode
first and say it in the first line: a plan in the conversation or a plan file and no code yet → plan;
otherwise diff.

[lenses.md](lenses.md) holds the common preamble, the five diff lenses, the edge-case matrix, the
plan brief and the verifier brief.

Findings need a rule or a failure behind them. Style is not a finding. A reviewer asked to find gaps
finds some even in sound work, so the verification pass is not optional.

## Diff mode

```
- [ ] 0 Scope
- [ ] 1 Deterministic checks
- [ ] 2 Lenses in parallel
- [ ] 3 Verification: CONFIRMED / PLAUSIBLE / REFUTED
- [ ] 4 Report (--fix: apply confirmed mechanical fixes, then back to 1 on the fix diff)
```

**0 · Scope.** Resolve the target to a diff and a file list and save the diff to the session
scratchpad: none → `git fetch origin && git diff origin/main` (commits ahead plus uncommitted work);
a path → `git diff origin/main -- <path>`; a range → that range; `PR#` → `gh pr diff N`. Write down
the intent you will hand the lenses: the commit subjects, the plan file's TL;DR or the sprint row.
Nothing else about intent reaches them.

**1 · Deterministic checks.** Run only those whose files changed; each hit is already a finding.

| Check | Command | Hit |
|---|---|---|
| UI drift | `npm run lint:ui` | a count that rose (raw hex, `text-[Npx]`, hand-rolled eyebrow, language ternary, entry without `ru`) 🚨, the build fails on it |
| Syntax | `npm run check:syntax` | 🚨 |
| Tests | `npm test` | a failure 🚨 |
| Baseline | `git diff origin/main -- scripts/ui-lint.baseline.json` shows a count that rose | 🚨, the baseline only tightens |
| Three languages | a new `T` key or `{ et, en }` object without all of `et`, `en`, `ru` on the resident side | ⚠️ |
| Secrets | grep the added lines for keys, tokens, Stripe ids, `.env` values | 🚨 |
| Raw errors | grep the added lines for `err.message` shown on screen or returned to the client | ⚠️ |
| Date strings | grep the added lines for `new Date(` on a `YYYY-MM-DD` string | ⚠️ (`functions.mdc` § Scheduling) |
| Rules and indexes | the diff touches `firestore.rules` or `firestore.indexes.json` | 🚨 unless that is the task itself |

**2 · Lenses.** Spawn the lenses from lenses.md as parallel `Agent`s (`run_in_background: false`),
each with the common preamble, its brief, the diff location, the file list, the intent line and the
step 1 output. Skip a lens whose territory is untouched and say which ran. When the bundled
`code-review` skill is available, run it too as a second correctness reviewer.

**3 · Verification.** Deduplicate, then spawn verifier agents (lenses.md § Verifier) grouped by file.
A finding without a file:line and a failure scenario goes back to its lens. REFUTED findings are
dropped; keep the count.

**4 · Report.** Banner, Väravad line, findings:

```
<✅|⚠️|🚨> /review: <code is solid · N concerns, non-blocking · needs changes (N blockers)>
Väravad: kontrollid ✅ <n> leidu · läätsed <k>/5 · kinnitamine <n leidu → c kinnitatud, p lahtist, r ümber lükatud>
```

Each finding on its own line, impact on the resident, the provider or Arco first, 🚨 / ⚠️ / ℹ️, with
its verdict, and for PLAUSIBLE what would settle it. Then two lists:
- **Mechanical:** CONFIRMED, one correct fix, no product judgement, plus the regression test to add.
- **Decisions for Marko** (CLAUDE.md § Who decides and the stop conditions in `sukoda.mdc` §4), each
  phrased as the question. A technical choice with no rule behind it is not a decision: recommend the
  safer and simpler option as a mechanical item.

Trust what a lens executed (a test it ran and quoted); re-check what it only reasoned.

**`--fix`.** Apply the mechanical list: regression test first where behaviour changed (break the fix,
see it fail, restore), files staged by name, one commit per concern. Run `npm run check`. Fixes over
about 50 lines or a new code path go through steps 1-3 again on the fix diff. Decisions and stop
conditions are never auto-fixed. Without `--fix`, report and stop.

## Plan mode

Spawn the plan brief from lenses.md as one adversarial agent with the plan. Then, yourself: for each
gap it returns, rewrite the affected plan section with the fix in it. A plan review that only lists
problems has not finished. Add a **Decisions** list for Marko. Report with the same banner shape
(`plan is solid` / `plan needs changes (N gaps)`), no Väravad line, and name the gate commands to run
after building: `npm run check` plus `/verify` for the specific flow.

## What this skill does not do

Push, merge, deploy, or write to production Firestore.
