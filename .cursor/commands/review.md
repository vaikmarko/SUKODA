# Review — stress-test a plan or a finished change

Do not write code in this command. Trace, list, judge, then fix the plan.

$ARGUMENTS

## Step 1: Trace every affected path

For each change:
1. UI trigger — the element in `minu.html` / `haldus.html` / `lunasta.html` / `admin.html` / `index.html` and its `@click` / `x-on` handler.
2. The `fetch('/api/…')` call and payload.
3. The handler key `'METHOD /api/…'` in `functions/haldus.js` (or the export in `functions/index.js`).
4. Firestore reads/writes, e-mails sent (`sendEmail`, `notifyOrder`), crons that later read the same fields.

If several UI places trigger the same action, list all of them.

**Output:** table — UI action → fetch → handler → collections written → mails sent.

## Step 2: All mutation paths

For every Firestore field the change touches:

```bash
grep -n "<field>" functions/index.js functions/haldus.js functions/lib/*.js scripts/*.js
```

`orders` is written from both `index.js` and `haldus.js`, and seeded from `scripts/seed-arco-demo.js`. List every writer and reader with line numbers. Does the plan update all of them? Seed included?

## Step 3: Ordering and stale data

Where a handler modifies an order and then decides on e-mail, reminder, conflict or credit: does it evaluate the updated data? Watch for `order` (fetched) vs the object after `update()`.

## Step 4: Edge-case matrix (only relevant rows)

| Category | Scenario | How handled | Risk |
|---|---|---|---|
| Null / legacy | Orders created before this field existed (no `maintenance`, no `contacts`, no `buildingId`) | | |
| Roles | Resident vs provider vs developer vs admin — can a role reach data that is not theirs? | | |
| Language | Order in EN, provider in ET — which language does each mail/screen get? | | |
| Time | Tallinn date vs UTC; holiday; away period; `leadDays`; DST week | | |
| Money | Sponsored fully / partly / not at all; refund; card fails; double submit | | |
| Concurrency | Two confirms at once; cron runs while user edits; webhook replay | | |
| Offline / PWA | Action queued offline, session expired, install vs Safari storage | | |
| Rollback | If reverted, is the data written still valid for the old code? | | |

## Step 5: Code quality sweep (if code exists)

- Unhandled promise rejections; missing `try/catch` around per-item work in loops.
- N+1 Firestore reads inside loops (batch with `getAll` / `in` queries).
- Unbounded queries (no `limit`), missing composite index (`firestore.indexes.json`).
- Strings without EN; error messages that are not actionable.
- Raw hex / `text-[Npx]` / hand-rolled eyebrows in HTML (`npm run lint:ui`).
- Secrets or tokens in logs.
- Auth: does every new route call the auth helper and scope by `provider.id` / session `orderId`?

## Step 6: Test coverage

- Every new or changed function in `functions/lib/haldus-core.js` → a case in `functions/test/`. List functions without tests.
- Does the test cover: happy path, boundary (today, 14-day edge, month end, leap year), invalid input, empty arrays, legacy shape?
- Catalogue additions → parity test still passes (`npm test`).

## Step 7: Verdict

- **PLAN IS SOLID** — list what was checked.
- **PLAN NEEDS CHANGES** — each gap with the fix. Rewrite the affected plan parts.
- **CODE NEEDS FIXES** — `file:line` and the fix.

Then the gate commands to run after implementation:

```bash
npm run check          # lint:ui + tests + node --check
```
plus `/verify` for the specific flow.
