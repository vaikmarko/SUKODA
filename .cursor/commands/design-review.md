# Design review — read-only audit of every portal page for one voice

Run before a demo, after a sprint, or whenever a page "feels busy". Do not write code. Every finding is a proposal with `file:line`.

$ARGUMENTS

## Step 0: Authority

Read `assets/css/main.css` (`@theme` tokens, `.p-h`, `.eyebrow`, `.p-btn*`, `.p-cta`, `.p-have`) and `.cursor/rules/portal-html.mdc`. Note the last commit of `main.css`:

```bash
cd "$(git rev-parse --show-toplevel)" && git log --format='%h %ai' -1 -- assets/css/main.css
```

## Step 1: Snapshot

```bash
cd "$(git rev-parse --show-toplevel)"
wc -l *.html | sort -rn
npm run lint:ui            # counts vs baseline
```

## Step 2: Token and type drift

```bash
cd "$(git rev-parse --show-toplevel)"
# raw hex in HTML (should only appear in main.css)
grep -nE '#[0-9A-Fa-f]{6}\b' minu.html haldus.html lunasta.html index.html admin.html arendajale.html | grep -v 'main.css'
# hand-rolled eyebrows — should be .eyebrow
grep -nE 'text-\[1[01]px\][^"]*uppercase' *.html
# arbitrary sizes
grep -noE 'text-\[[0-9.]+px\]' *.html | sort | uniq -c | sort -rn
# serif sizes outside the scale (lg, xl, 2xl, 3xl)
grep -noE 'font-serif text-(xs|sm|base|4xl|5xl|\[)' *.html
```

## Step 3: Information density (manual, per page)

Open each portal page with the demo account (`/minu`, `/haldus`, `/lunasta`, `/arendajale`). For every screen:

- What is the **first** thing the eye lands on? Is it the next thing the person must do?
- Count numbers on screen that the person does not act on (counters, stats). Each one is a finding.
- Find sentences that explain the product instead of telling the person what to do. Each one is a finding.
- Is there more than one `.p-btn` per card?
- Tables on the resident side? Cards on the desk where a table would scan better?
- Menus that contain descriptions instead of names?

Then the standard (`portal-html.mdc` → "The standard"), per screen, each a finding if the answer is no:

- Understood in 5 seconds without reading twice? One title, one primary action?
- More than 3 fields the person types by hand although we already know the data?
- Does `code → first order` or `morning push → Done` need more than 4 taps or a back button?
- More than 3 font sizes or more than 2 text colours besides black on one screen?
- Can you write "because of this screen, X no longer has to Y"?
- Would Arco's sales lead show this screen to a buyer at key handover?

## Step 4: Language parity (et · en · ru)

```bash
cd "$(git rev-parse --show-toplevel)"
# ternaries with empty EN
grep -nE "lang === 'et' \? '[^']+' : ''" *.html
# Estonian text nodes without a ternary (heuristic)
grep -nE '>[A-ZÕÄÖÜ][a-zõäöü]+ [a-zõäöü]+' minu.html lunasta.html | grep -v 'x-text\|lang ===' | head -40
```

`npm run lint:ui` reports `ternary` (inline binary ternaries — must fall as screens migrate to `T`/`t()`) and `noRuCore` (catalogue entries still without `ru`). Any new `T` key missing one of `et`/`en`/`ru` is a Fix-now finding.

Backend: run `npm test` — the catalogue parity test covers et+en and non-empty `ru`.

## Step 5: Communication loop

For each request type (issue / question / visit): where does the reply appear? If the answer is "in the e-mail", it is a Fix-now finding (plan §0.5).

## Step 6: Accessibility

```bash
cd "$(git rev-parse --show-toplevel)"
grep -nE '<button[^>]*>\s*<svg' *.html | grep -v aria-label
grep -nE 'role="dialog"' *.html | wc -l
grep -nE 'x-show="[a-zA-Z]*(Open|Dialog|Modal)' *.html | wc -l   # dialogs without role
```

## Step 7: Speed

Load `/minu` and `/haldus` with the demo account in the browser; time to first content must be under 1.5 s on a warm session. If tabs appear empty and fill later, finding.

## Output

1. **Verdict** — GREEN / YELLOW / RED + the single most urgent item.
2. **Punch list** — Fix-now / Watch / Noted, each `file:line`, what, proposed fix in one line.
3. **Brief** saved to `docs/reviews/DESIGN_REVIEW_<YYYY-MM-DD>.md`: snapshot table, drift counts vs last review, density findings per page, the three pages most worth a second look.

RED only for things the user would call broken on screen (unreadable, unreachable, wrong language, reply lost). Drift the team can sweep later is YELLOW.
