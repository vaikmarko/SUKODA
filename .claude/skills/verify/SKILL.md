---
name: verify
description: Confirm a change actually works. The static checks (npm run check, the Vite build), then a live check matched to the change: the flow from the button to Firestore against the emulator or a demo account, with state before and after, a repeat and a reverse, or the screen in a real browser at phone width in three languages. Use before pushing or deploying and whenever "the tests pass" is not the same as "it works"; invoked by /ehitaplaaniga and /shipit. Not a code review and not a deploy tool.
argument-hint: "[what changed, one line] [static|ui|data|both]"
---

# /verify: does it work, not just pass

Pick the mode in the first line and say why:
- **static:** docs, config, pure logic the tests cover, refactors the tests cover. Part A only.
- **ui:** anything a person sees changed (a portal or desk screen, the landing page, tokens or
  `.p-*` classes). Part A, then Part B.
- **data:** a handler, a cron, an e-mail or push, or what is written to Firestore changed. Part A,
  then Part C.
- **both:** when both changed.

A change that hides, gates or removes something is never static: grep every entry point to it and
check each one.

Test the flow the UI actually uses. Do not test endpoints the UI does not call. Evidence over
assertion: every ✅ in the report names what ran and what it returned.

## Part A: static checks

```bash
npm run check          # lint:ui, node --check on every function file, tests; exit code decides
npm run build          # when HTML, CSS, assets or vite.config.js changed
```

A failure that also fails on `origin/main` is pre-existing: prove it on a clean checkout of `main`,
report it, do not block on it. A `lint:ui` count that rose is never fixed with `--update`.

## Part B: ui, look at it

Reading code is not enough. `npm run dev`, then open the changed screen in the browser pane when it
is available (otherwise list the manual steps for Marko), with the demo account:

- 390 px wide first, then desktop; in et, en and ru (the switcher): no missing string, no English or
  Estonian leaking into another language, nothing cut off in the longest language.
- The standard: one title and one primary action; the next thing on top; the two key journeys
  (`code → first order`, `morning push → Done`) in at most 4 taps and no back button.
- Loading and failure: the page shows only after the first load (no flash of empty tabs), a disabled
  state while saving, a failure the person can act on, typed text not lost.
- Dialogs close with Escape and return focus; read the console and the failed requests: a new error
  is ⚠️ at least.

## Part C: data, from the button to Firestore

1. **Pick the environment.** The emulator for anything that writes:
   ```bash
   firebase emulators:start --only functions,firestore   # functions :5001, firestore :8080
   node scripts/seed-arco-demo.js                         # when the flow needs the Arco demo home
   ```
   API base: `http://127.0.0.1:5001/<project-id>/europe-west1/<functionName>`; the project id is in
   `.firebaserc`. Production is read-only and only with the demo accounts (the Arco demo home, the
   demo desk). Never write to a real customer's order from this skill.
2. **Find the exact endpoint.** In the HTML, the handler on the button and the `fetch('/api/…')` it
   calls: copy the path and the body shape. Then the key `'METHOD /api/…'` in `functions/haldus.js`
   (or the export in `functions/index.js`). That is the endpoint you test, no other.
3. **Get a session.** Provider desk: `POST /api/haldus/magic-link` with the demo desk e-mail, read
   the token from the emulator's `mail` collection or the Functions log, then
   `POST /api/haldus/auth/validate`. Resident portal: the client magic link, or the token the seed
   prints. Send the token the way the page does (`Authorization: Bearer` or a body field).
4. **State before.** Read the affected documents (emulator UI at :4000) and record the fields the
   flow should change: order fields, `bookings`, `serviceRequests`, `mail`.
5. **Execute exactly as the UI does** (`curl` with the same payload) and check that the response
   shape matches what the HTML reads (`data.success`, `data.booking`, `data.error`).
6. **State after.** The expected fields changed and nothing else. Mail queued to the right recipients
   (`resolveRecipients`), in the right language, linking to the card.
7. **Repeat** the identical call: idempotent, no duplicate booking, request or mail.
8. **Crons.** If a cron reads this data (the 07:00 schedule, the 09:00 flowers, the Monday
   reminders), would it now behave correctly? Run the function once through the emulator shell when
   in doubt.
9. **Reverse.** If the action is reversible (confirm and decline, reschedule back, cancel), do the
   reverse and check the state again.

After a deploy that Marko approved (`/shipit`), the same flow runs read-only against production with
a demo account, and `firebase functions:log --only <name>` shows a clean cold start.

## Report

```
<✅|⚠️|🚨> /verify: <all checks pass (N tests, <mode>) · passing, but <concern> · failed at <step>: <cause>>
Mode: <static|ui|data|both> because <one clause>.
```

Then one line per check with what it produced, and for Part C the table:

| Test | Action | Expected | Actual | Pass |
|---|---|---|---|---|

Include the exact curl and the token source so the check can be repeated. Pre-existing failures get
their own line. A skipped step lists the manual checks for Marko under „Mida testida“, each with the
exact command or click path. A failed step gets its root cause named before the report.
