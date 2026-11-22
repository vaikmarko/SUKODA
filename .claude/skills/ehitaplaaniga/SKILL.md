---
name: ehitaplaaniga
description: Build a change the safe way. Size it, read the plan, trace the code from the button to Firestore, write a plan with a TL;DR, have /review attack the plan, build the first slice with review and verification, commit, and stop before any push or deploy. Use for anything bigger than a one-liner ("ehita plaaniga", "võta sprint 1 lõik", "tee see ära"). Never pushes or deploys; shipping is /shipit and Marko's call.
argument-hint: "[what to build, one line]"
---

# /ehitaplaaniga: size it, plan it, have the plan attacked, build slice 1, stop

The plan is the product of this skill; slice 1 is the proof that the plan holds. Everything after
slice 1 is a new decision for Marko.

**The one rule:** solve what you can; ask Marko only what is his (CLAUDE.md § Who decides). A
technical gap is yours: fix it in the plan and continue. A product call, a scope tradeoff, a UI or
copy choice, and every stop condition in `sukoda.mdc` §4 is his: collect those and ask once, in one
batch. The test: would two engineers who both read the code land on different answers because they
want different products? Then it is Marko's.

```
- [ ] 0 Size
- [ ] 1 Understand: plan chapter, criteria, assumptions stated
- [ ] 2 Explore
- [ ] 3 Plan file with TL;DR
- [ ] 4 /review plan mode, findings absorbed into the plan
- [ ] 5 The single gate
- [ ] 6 Build slice 1: code, tests, /review --fix, /verify, commit
- [ ] 7 Summary, and stop
```

Say one line when each step starts. No argument: the task is what the conversation was about; state
it in one line and continue.

## 0 · Size

| Size | Signal | Do |
|---|---|---|
| **Small** | one block in one file, one behaviour, no new Firestore field, no new screen, nothing in money, scheduling, auth, e-mail or push | say „See on väike: <what>. Ehitan ära.“, build it under the normal rules, stop reading this skill |
| **Normal** | one shippable change that touches logic, several files or visible behaviour | the full skill, one slice |
| **Multi** | two or more independently shippable pieces, or a data change plus the screens that depend on it | the full skill; the plan lists the slices; build only slice 1 |

Unsure: one size up. A slice never spans two mega-files that another agent is working in
(`.cursor/README.md`, sprint split).

## 1 · Understand

State your assumptions first, so a wrong premise is corrected before a plan is spent on it. A sprint
row or a section of `PLATVORMIPLAAN_2026.md` → its text and the "Standard" are the definition of
done. Plain text → write the criteria yourself and mark them as yours. Every new screen needs the
sentence "because of this, X no longer has to Y"; if it cannot be written, say so and stop. A stop
condition, or something unclear or contradictory → one AskUserQuestion with the concrete readings.

## 2 · Explore

`Explore` subagents, asked for conclusions with file:line, not file dumps: the UI trigger and its
`fetch('/api/…')`, the handler key in `functions/haldus.js` or the export in `functions/index.js`,
the Firestore fields and **every** writer and reader of them (both function files, `functions/lib/`,
the seed scripts, the crons), the mails and pushes sent, the tests in `functions/test/`, and the
chapters of the plan that govern it.

## 3 · Plan file

`docs/plaanid/YYYY-MM-DD-<slug>.md`, in Estonian, this shape:

```markdown
# <Pealkiri: mõju elanikule, tegijale või Arcole>

## TL;DR
🎯 <üks rida>
Selle pärast ei pea <kes> enam <mida> tegema: <1 lause>
Mis puudub või on katki: <1 lause>
Mida teen: <1-2 lauset, ilma koodita>
Visuaalne mõju: <1 lause või "UI ei muutu">
Mida testida: <1-3 sammu>
🚨 Sinu otsus: <ainult kui on vaja>

## Lõigud            (ainult multi: ehitusjärjekord ja mida iga lõik eelmiselt vajab)

## Tehniline plaan
<ekraan ja handler; Firestore väljad ja nende kõik kirjutajad ja lugejad; järjekord; kirjad ja push;
 T-sõnastiku uued võtmed et/en/ru; kasutatavad .p-* klassid; haldus-core.js funktsioonid ja iga
 kriteeriumi tõestav test, nimetatud selle väite järgi; failid, mida tohib puutuda; plaanidokumendi
 muudatus või EI OLE VAJA>

## Otsused          (Marko vastused sammust 5 koos põhjusega)

## Väljaspool skoopi
```

Delete empty sections. A plan is the set of decisions the building session cannot make alone: files,
names, the values the plan pins, the test that proves each criterion. A plan longer than the code has
written the code; a line like "handle edge cases" decides nothing. Fix both before the review. The
plan text goes through `/kirjuta`.

## 4 · Review the plan

Invoke the `review` skill in plan mode on the file. Its gaps are yours: rewrite the affected sections
with the fix in place. Only a finding that changes what the feature does or how it looks joins the
step 5 batch.

## 5 · The single gate

Print the TL;DR verbatim, one line `review: <verdict>` with what it changed, and the plan path. Then:
- no decisions → „Otsustada pole midagi, lähen edasi.“ and continue in the same turn; never ask
  „kas alustan?“;
- decisions → one AskUserQuestion with all of them, recommended option first.

This is the only place the skill blocks.

## 6 · Build slice 1

Only slice 1. Inline by default. If it has three or more tasks that can each be built and tested on
their own and touch disjoint files, give each to a fresh `Agent` with a brief carrying only that task
(files it may touch, interfaces, the test, the rules), have a second fresh agent review each task's
diff before the next starts, and keep a ledger in the scratchpad (`Task N: complete <sha>`) so a
context compaction never re-runs finished work.

While building:
- every changed line traces to the plan; in a mega-file touch only the block you need;
- pure logic goes into `functions/lib/haldus-core.js` with its `node:test` case first; a bug in pure
  logic gets a regression test;
- handlers follow `.cursor/rules/functions.mdc`: auth first, every query scoped to the caller,
  integer cents, idempotent where the UI can double-submit, dates through the core helpers;
- screens follow `.cursor/rules/portal-html.mdc`: tokens and the three voices only; new strings go
  into `T` in et, en and ru; when you touch a screen, migrate its ternaries to `T` in the same change;
- Estonian strings go through `/kirjuta`;
- nothing is deployed here and Firestore rules are not touched.

If building shows the plan was wrong, update the plan file and say so in one line.

Then: `npm run check`, `review` in diff mode with `--fix`, `verify` (static always, plus ui or data
by the change), and commit: files staged by name, the message in Estonian says what changed for the
user, the slice status in the plan updated in the same commit.

## 7 · Stop

No push, no deploy, no next slice. Summary in the CLAUDE.md format: banner `/ehitaplaaniga: <plaan N
lõiku, lõik 1 ehitatud · väike muudatus tehtud · plaan ootab otsust>`, the Väravad line (review on
the plan, review on the diff, verify and its mode, `npm run check`), the plan path. Marko's move
**offers** the next step, `/shipit` or the next slice, with a one-line reason.

## Not this skill

A one-liner or a copy fix → just do it. Code that is written and ready → `/shipit`. A direction that
is not clear yet → `/brainstorm`. A page that "feels busy" → `/design-review`.
