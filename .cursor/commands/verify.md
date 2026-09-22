# Verify — end to end, from the button to Firestore

Test the flow the UI actually uses. Do not test endpoints the UI does not call.

## What to verify
$ARGUMENTS

## Step 1: Pick the environment

**Emulator (preferred for anything that writes):**
```bash
cd /Users/markovaik/Projects/SUKODA
firebase emulators:start --only functions,firestore   # functions :5001, firestore :8080
node scripts/seed-arco-demo.js                         # if the flow needs the Arco demo home
```
API base: `http://127.0.0.1:5001/<project-id>/europe-west1/<functionName>` — read the project id from `.firebaserc`.

**Production read-only checks** are allowed with the demo accounts only (Arco demo home, Kristi desk). Never write to a real customer's order from this command.

## Step 2: Find the exact endpoint

1. In the HTML, find the handler on the button (`@click="…"`) and the `fetch('/api/…')` it calls — copy the path and body shape.
2. Find the key `'METHOD /api/…'` in `functions/haldus.js` (or the export in `functions/index.js`). That is the endpoint you test — no other.

## Step 3: Get a session

- Provider desk: `POST /api/haldus/magic-link` with the demo desk e-mail → read the token from the emulator's `mail` collection or Functions log → `POST /api/haldus/auth/validate`.
- Resident portal: same via the client magic link, or the token the seed prints.
- Store the token: `T=…`; send as the UI does (check whether the page uses `Authorization: Bearer` or a body field — copy that).

## Step 4: State BEFORE

Read the affected documents (emulator UI at :4000, or `firebase firestore:get` equivalents) and record the fields the flow should change: order fields, `bookings`, `serviceRequests`, `mail`.

## Step 5: Execute exactly as the UI does

```bash
curl -s -X POST "$BASE/api/…" -H "Content-Type: application/json" -H "Authorization: Bearer $T" -d '{…same payload…}'
```

Check the response shape matches what the HTML reads (`data.success`, `data.booking`, `data.error`).

## Step 6: State AFTER

- Expected fields changed, nothing else changed.
- Mail queued? Right recipients (`resolveRecipients`), right language, link points to the card?
- Second identical call: idempotent (no duplicate booking/request/mail)?
- If a cron reads this data (07:00 schedule, 09:00 flowers, Monday reminders): would it now behave correctly? Run the function once via the emulator shell if in doubt.

## Step 7: Reverse

If the action is reversible (confirm ↔ decline, reschedule back, cancel), do the reverse and check state again.

## Step 8: Report

| Test | Action | Expected | Actual | Pass |
|---|---|---|---|---|

Any failure: find the root cause before reporting. Include the exact curl and the token source so the check can be repeated.
