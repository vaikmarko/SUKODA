---
name: brainstorm
description: Think before building. Draw out what Marko wants and why, then harvest and rank ideas, research a question, run a throwaway experiment, or explore several UI directions for one screen side by side, and end with a direction he chose. Use at the very start, when there is an idea, an open question or a screen to rethink and no plan yet ("mõtleme läbi", "mis variandid on", "uuri", "katseta"). Not for a task with clear acceptance criteria (that is /ehitaplaaniga). Never writes product code.
argument-hint: "[the idea, question or screen, or nothing and I ask]"
---

# /brainstorm: many ideas, honest comparison, one direction, nothing built

Building is fast here; building the wrong thing well is the expensive mistake. This skill finds out
what Marko actually wants, widens the field, tests the uncertainty that matters, and ends with a
direction he chose, written down with the alternatives it beat. Building is `/ehitaplaaniga`'s job.

## Four shapes

Pick from what Marko brings and name the shape in the first line. Shapes chain.

| Shape | Marko brings | Ends with |
|---|---|---|
| **Korje** (idea harvest) | a theme, a role, a pain | ranked ideas with written rejections, each survivor routed: plan now, later, or drop |
| **Uuring** (research) | a question whose answer changes a decision | findings with sources and confidence, a recommendation and what would overturn it |
| **Katse** (experiment) | one assumption that decides feasibility or value | a timeboxed throwaway probe and the learning; the code is discarded |
| **UI harjutus** (screen exploration) | a screen or flow to rethink | 3-4 variants on different principles, side by side per state, a chosen direction |

## How to talk to Marko

- **Ground first.** An `Explore` subagent reads what exists so you never ask what the plan answers:
  `PLATVORMIPLAAN_2026.md` ("Standard", §0 principles, §2 the four views, §9 what we deliberately do
  not do, §10 strategic direction), `.cursor/rules/`, `docs/arutelud/`, `docs/reviews/`. Say in one
  line what already exists or was decided. A closed decision is not reopened unless Marko reopens it.
- **First message:** one line with what you understood, one line saying he can answer „lihtsalt tee“
  and skip the questions, and one open question that gets him describing a real moment (a resident
  the evening before a visit, Cristelle in a stairwell with gloves on, Arco's sales lead at key
  handover), not a menu.
- **One question per message**, one sentence, plain Estonian. About five rounds; he can stop any time.
- **Play back** once a part is understood: under 150 words, guesses marked as guesses, ending with
  „mis on valesti või puudu?“.
- **Think wide privately.** Generate more directions than you show. Options must differ in mechanism
  (who acts, what the platform does by itself, who pays and how the money moves, what happens in the
  app and what by e-mail or push), not in colour.
- **Show, don't tell.** Anything he will look at goes on a board, not into prose.

## Korje

Three or four parallel `general-purpose` agents, each with the grounding and one frame, each returning
candidates with the sentence the plan demands of every screen: "because of this, X no longer has to
Y". Frames: a chore the resident still does by phone or e-mail; what Cristelle does between two
homes; what Arco's after-sales answers for the third time; the first week in a new home; what a
second provider or a second developer would need; what the platform already knows and never uses.
Merge, critique every candidate with the reason written, rank by value to many users × confidence ×
cost. A candidate for which the "no longer has to" sentence cannot be written, or that breaks §0 or
§9 of the plan, is rejected with the rule named. Note: `docs/arutelud/YYYY-MM-DD-<slug>.md`.

## Uuring

Write the question and what changes with each answer before looking. Climb the ladder, cheapest
first, and stop when the decision no longer moves: (1) what the plan already decided, (2) what the
code does today, (3) Firestore data, read-only, counts and never an individual customer's order, (4)
the world: the Firebase, Stripe, Hausing and web push documentation, a web search for a fact, the
`anthropic-skills:deep-research` skill for a multi-source question, (5) people: the question written
for Marko to ask Cristelle, Arco or a resident, and who it fits. Each finding:

```
<claim> (verified | inferred | guess)
Source: <path, query, URL, date>
Changes: <which decision this moves>
```

End with a recommendation, its main tradeoff and what would overturn it.

## Katse

Name the assumption and the cheapest test that would change the decision: a script on seeded demo
data, a handler run against the emulator, a clickable throwaway on a board, a scratch branch that is
never pushed. Timebox it and say up front that the result is a learning, not a feature. Never on
`main`, never a write to production Firestore, never a real customer's order, never live Stripe.
Report what the test showed, what it could not show and what it changed. Keeping anything from it
goes through `/ehitaplaaniga`.

## UI harjutus

1. **Brief:** who and in what moment, the job in order, what the platform does by itself, the states
   every variant covers (first time, waiting, something arrives, a failure, return mid-way, offline),
   real-shaped sample data in the three languages with long names, and the constraints from
   `.cursor/rules/portal-html.mdc`: the six points of the standard, three voices (`.p-h`, `.eyebrow`,
   `.p-btn`), tokens from `assets/css/main.css` only, one primary action per card, no counters or
   marketing copy in the portal, at most 4 taps for the two key journeys. Then N variants, each on a
   named different principle. When rethinking an existing screen, the variant-makers do not see its
   code.
2. **Variants:** one fresh `general-purpose` agent per variant with the brief and its principle only.
   Each returns one board showing every state, with the token values inlined so it renders on its
   own. Medium: the Artifact Design canvas when available, else one HTML page with the boards side by
   side. Phone width (390) first. Agents never see each other's work.
3. **Comparison:** the variants side by side per state, then a table: good at, breaks where, cost to
   build with the existing `.p-*` classes. Marko picks or combines. You may give your pick in one
   line, and only after he has seen them.

## Size and hand-off

Once the direction is clear, size it in plain words: a **quick task** is just done; a **small change**
is agreed in chat and goes to `/ehitaplaaniga`; a **project** gets a short written design in
`docs/arutelud/` (intent and why, the "no longer has to" sentence, goals and anti-goals, decided
parts marked as Marko's or mine, what is left to the builder, open questions). Before Marko sees it,
a fresh subagent reads it as the builder, together with the rules and the plan, and returns only the
questions it would still need answered. Settle the minor ones yourself and bring his in one message.

When the direction changes `PLATVORMIPLAAN_2026.md`, propose the exact edit; it is made only after
his yes.

**Nothing is built until he approves.** Reading, boards and spikes are fine; product code,
dependencies and the plan skill are not.

Every chosen direction gets a short record in the note:

```
Otsus: … · Miks: … · Kaalutud ja kõrvale jäetud: … · Vaatame uuesti, kui: …
```

## Summary

Estonian, in the CLAUDE.md format. Banner `/brainstorm: <suund valitud: … · N ideed, M edasi · katse:
õppisime …>`, no Väravad line. Name the files written. Marko's move carries only his decisions.
