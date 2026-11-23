# Reviewer lenses and the verifier brief

Five reviewers run in parallel, each with its own context and one hunting list. They read; they never
edit. Every brief ends with the same evidence format, because a finding without a failure scenario
cannot be verified.

## Common preamble (paste into every lens)

```
You are reviewing a change in the SUKODA repository (a home care platform: static HTML pages with
Alpine and Tailwind v4, Firebase Functions and Firestore, Stripe; a resident portal minu.html, a
provider desk haldus.html, plus lunasta, admin and the landing page). Working tree:
<absolute path>. Diff: <scratchpad path>. Changed files: <list>.
Read CLAUDE.md and .cursor/rules/sukoda.mdc, portal-html.mdc and functions.mdc first; they are the
rules. Read the parts of PLATVORMIPLAAN_2026.md that govern the changed area. Read beyond the diff
whenever a changed line calls or is called by code you have not seen; most false positives come from
not reading the callee. The mega-files are large: read the handler and its helpers, not the whole
file. You may run read-only commands (git, grep, cat, npm test, npm run lint:ui). You never edit
files.

Intent: <commit subjects / plan TL;DR / sprint row>. Deterministic checks: <step 1 output>.
You get no other account of intent: a reviewer who knows the intent only confirms it.

Report ONLY findings that affect correctness, money, data, privacy, security, what a person sees, or
a written rule. No style preferences. If you find nothing, say what you checked and why it holds.

One block per finding:
  file:line: claim in one sentence
  Failure: concrete input/state → wrong behaviour (or: rule X in file Y broken by …)
  Severity: 🚨 (wrong money, data loss, a role reaching data that is not theirs, a lost reply or
               visit, security, crash on a real path)
            ⚠️ (rule violation, missing language, missing test, future bug)
            ℹ️ (worth knowing, not a blocker)
  Fix: the minimal change, or "needs Marko: <the exact question>"
  Confidence: what you verified vs what you inferred
```

## Lens 1: Correctness and data

- **Trace every affected path.** For each change: the element in `minu.html` / `haldus.html` /
  `lunasta.html` / `admin.html` / `index.html` and its `@click` handler → the `fetch('/api/…')` and
  payload → the handler key `'METHOD /api/…'` in `functions/haldus.js` (or the export in
  `functions/index.js`) → Firestore reads and writes, mails sent (`sendEmail`, `notifyOrder`), crons
  that later read the same fields. If several UI places trigger the same action, list all of them.
  Output a table: UI action → fetch → handler → collections written → mails sent.
- **All mutation paths.** For every Firestore field the change touches:
  `grep -n "<field>" functions/index.js functions/haldus.js functions/lib/*.js scripts/*.js`.
  `orders` is written from both function files and seeded from `scripts/seed-demo-account.js`. List
  every writer and reader with line numbers. Does the change update all of them, the seed included?
- **Ordering and stale data.** Where a handler modifies an order and then decides on an e-mail, a
  reminder, a conflict or a credit: does it evaluate the updated data? Watch for `order` (fetched) vs
  the object after `update()`.
- **The edge-case matrix** below, only the relevant rows.
- **Quality sweep:** unhandled promise rejections; no `try/catch` around per-item work in loops; N+1
  Firestore reads in loops (batch with `getAll` or `in` queries); unbounded queries without `limit`;
  a query that needs a composite index missing from `firestore.indexes.json`.

| Category | Scenario |
|---|---|
| Null / legacy | Orders created before this field existed (no `maintenance`, no `contacts`, no `buildingId`) |
| Roles | Resident vs provider vs admin: can a role reach data that is not theirs? |
| Language | Order in EN, provider in ET: which language does each mail and screen get? |
| Time | Tallinn date vs UTC; holiday; away period; `leadDays`; DST week |
| Money | Sponsored fully / partly / not at all; refund; card fails; double submit |
| Concurrency | Two confirms at once; cron runs while the user edits; webhook replay |
| Offline / PWA | Action queued offline, session expired, install vs Safari storage |
| Rollback | If reverted, is the data written still valid for the old code? |

## Lens 2: Money, auth and privacy

The rules in `functions.mdc` and the stop conditions in `sukoda.mdc` §4 are the contract.
- **Auth first, then body.** Every new route calls the auth helper and scopes every query to
  `provider.id` or the session's `orderId`. An `orderId` from the body is never trusted without
  checking it belongs to the caller.
- **Money:** integer cents (`*Cents`), formatted only at the edge; the split (sponsor, resident,
  provider, fee) comes from the one pure function in `haldus-core.js`, never re-derived in a handler;
  every Stripe webhook is deduplicated through `stripeWebhookEvents`; anything the UI can
  double-submit (redeem, confirm, complete, pay) checks state first and uses a transaction for
  balance, credit or slot changes.
- **Any change to prices, splits, refunds or payouts** is "needs Marko".
- **Who is notified:** recipients through `core.resolveRecipients(order)`, never
  `order.customer.email` directly; a change in who receives an e-mail or push is "needs Marko".
- **Input:** every string and array capped (`str(v, max)`, `core.sanitize*`, a Zod schema).
- **Nothing leaks:** no stack trace, Firestore path or Stripe error body in a response; no request
  body or token in a log; no secret outside Firebase secrets.
- **Firestore rules** untouched unless that is the task.
- Security findings already known: `docs/PORTAL-AUDIT.md`.

## Lens 3: The standard, design voice and languages

Check the diff against `portal-html.mdc` and the plan's "Standard":
- **The six points:** understood in 5 seconds (one title, one primary action, never two equal
  buttons); it thought ahead (the next thing on top, forms pre-filled, more than 3 hand-typed fields
  is a finding); nothing to hunt for (the two key journeys in at most 4 taps, no back button); calm
  (at most 3 font sizes and 2 text colours besides black); it removes a chore (the "no longer has to"
  sentence can be written); it just works (no technical error on screen, nothing typed is lost).
- **Three voices only:** `.p-h`, `.eyebrow`, `.p-btn` / `.p-btn-2` / `.p-btn-sm` / `.p-cta`; one
  primary button per card; tokens only, no raw hex, no `text-[Npx]`.
- **Density:** no counters or stats for the resident, no marketing copy inside `/minu`, `/haldus`,
  `/lunasta`; an empty state is one sentence and one action; cards for the resident, tables only on
  the desk.
- **Three languages:** every user-visible string on the resident side (placeholders, `aria-label`,
  `title`, empty states, error toasts included) exists in et, en and ru through `T` and `t()`; no new
  inline ternary; a touched screen has its ternaries migrated. Backend text objects are
  `{ et, en, ru }` picked with `pick(obj, lang)`.
- **Voice:** Estonian sina-form (check against `.claude/skills/kirjuta/SKILL.md`), English plain,
  Russian «вы»; no exclamation marks, no emoji; dates with the year, `HH:MM`, `229 €`.
- **Communication happens in the app:** a reply, a status or a reschedule lives on the card in the
  portal; e-mail and push only say there is something new and link to the card.
- **Accessibility and states:** dialogs with `role="dialog"`, `aria-modal`, Escape and focus return;
  icon-only buttons with `aria-label`; every async action has a loading state and a failure path the
  person can act on; touch targets at least 44px.
- **Scope:** every changed line traces to the stated intent; reformatting around the change in a
  mega-file and opportunistic refactors are findings.

## Lens 4: Tests prove the change

- Every new or changed function in `functions/lib/haldus-core.js` → a case in `functions/test/`. List
  functions without tests.
- Is there a test that **fails without the change**? Name it, or name the mutation that would show it.
  "Tests pass" is not evidence.
- Does the test cover: the happy path, the boundary (today, the 14-day edge, month end, leap year),
  invalid input, empty arrays, the legacy shape?
- A bug fix in pure logic without a regression test → ⚠️ with the exact test to add.
- Logic that needs no Firebase but was written inside a handler, where it cannot be tested → ⚠️.
- Catalogue additions → the parity test still passes.
- A handler change with no `/verify` plan for its flow → ⚠️.
- Tests that assert the implementation rather than the behaviour → ⚠️.

## Lens 5: Scheduling, crons, deploy and operations

- **Dates** are `YYYY-MM-DD` strings in Tallinn time through `parseDateStr` / `toDateStr` / `addDays`
  / `addMonths`; never `new Date(str)` on a date string.
- **Conflict check** (`overlaps`) runs server-side on every create and reschedule; `leadDays`,
  availability, away periods and `holidayName` are respected on the server, not only in the UI.
- **Crons are idempotent:** they mark what they sent (`remindedFor`, `holidayNoticesSent`) and can run
  twice without double e-mails; one bad order does not stop the loop.
- **PWA:** `sw.js` never caches `/api`; a changed shell bumps what the service worker serves.
- **Deploy:** which target does this change need (hosting, a single function, both)? Nothing in the
  diff deploys rules or indexes as a side effect. A new secret is documented without its value and
  read through `SECRETS`.
- **Rollback:** if this is reverted, is the data it wrote still valid for the old code?
- **Removals:** for every removed line, is it a move, a deliberate deletion the intent explains, or a
  fix from `main` silently dropped by a stale branch (parallel agents work in the same mega-files)?
  The last is 🚨.
- Docs: behaviour changed → `PLATVORMIPLAAN_2026.md` updated in the same change, or said why not.

## Plan brief (one adversarial agent, plan mode only)

```
You are reviewing a PLAN before any code is written: <plan file>. Rules: CLAUDE.md, the three files
in .cursor/rules/ and the parts of PLATVORMIPLAAN_2026.md the plan names. Find what the plan will get
wrong and say how the plan should change, not a list of worries.
Check in this order: every path the change touches (UI action → fetch → handler → collections → mails)
and whether the plan names them all; every writer and reader of the fields it changes, seed scripts
and crons included; modify-before-evaluate order; the edge-case matrix (legacy orders, roles,
language, time, money, concurrency, offline, rollback); auth scoping; the stop conditions; the
standard (the "no longer has to" sentence, taps, one primary action); et, en and ru for every new
string; which test in functions/test proves each criterion and which flow /verify covers; which
files the slice may touch without colliding with another agent; which decisions are Marko's.
Output: for each gap, the rewritten plan paragraph that closes it, plus the list of decisions that are
not the plan's to make, each phrased as the question.
```

## Verifier brief (one agent per file group)

```
You are verifying review findings in <working tree> (base origin/main). Your job is to REFUTE them.
For each finding, read the cited code and whatever it calls or is called by, run a test or a small
script if that settles it, and return exactly one verdict:

CONFIRMED: reproduce it. Name the input/state and the wrong result, or quote the rule and the line
           that breaks it, with the evidence (command and output, or file:line pairs).
REFUTED:   the path is unreachable, the constraint does not exist in this codebase, an existing test
           already covers it (name it), or the plan settles it (name the section).
PLAUSIBLE: you could neither reproduce nor refute within reason. Say what would settle it.

Do not soften a CONFIRMED into PLAUSIBLE to be polite, and do not confirm because a finding sounds
reasonable. For CONFIRMED items say whether the fix is mechanical or needs Marko, and sketch the
regression test's assertion when one is possible.

Findings:
<paste>
```
