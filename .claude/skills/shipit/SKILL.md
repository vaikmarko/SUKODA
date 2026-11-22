---
name: shipit
description: Ship your own change end to end. Commit what this ship is about, rebase onto origin/main, /review with fixes, /verify, push to main once (CI runs, nothing deploys), then deploy hosting or the named functions only on Marko's yes and check the live result. --haru opens a branch and a PR instead. Use when the work is done and should land. Never force-pushes, never deploys Firestore rules as a side effect.
argument-hint: "[what this ships, one line] [--haru]"
---

# /shipit: one push after the checks, a deploy on a yes

Everything that can change the diff happens before the push: rebase, review, fixes, local checks. A
push to `main` only runs CI; what residents and providers see changes with the deploy, so the deploy
happens once and only after Marko's yes. Decide everything else yourself (commit message, branch
name, PR text) and announce each in one line.

```
- [ ] 0 State
- [ ] 1 Commit
- [ ] 2 Rebase onto origin/main, removal check
- [ ] 3 /review --fix
- [ ] 4 /verify
- [ ] 5 Push once, CI green
- [ ] 6 The deploy gate: one question
- [ ] 7 Deploy, if approved
- [ ] 8 After the deploy: live check
- [ ] 9 Summary
```

## 0 · State

```bash
git status --porcelain
git rev-parse --abbrev-ref HEAD
git fetch origin && git rev-list --left-right --count origin/main...HEAD
```

One line to Marko: branch, uncommitted yes/no, commits ahead/behind. Clean and nothing ahead →
nothing to ship, stop. Detached HEAD → stop.

## 1 · Commit

`npm run check` green first. One commit for the work as it stands: files staged by name, the message
in Estonian saying what changed for the resident, the provider or Arco, in the voice of `git log -5`,
with the Co-Authored-By trailer the session names. Unrelated changes in the tree are not combined:
commit the set this ship is about and say in one line what stays uncommitted and why. With `--haru`:
create `feat/`, `fix/` or `docs/` plus a short kebab-case slug first.

## 2 · Rebase

`git rebase origin/main`, then `npm run check` again. Parallel agents and Cursor sessions also commit
to `main` and work in the same mega-files, so expect traffic. A conflict → stop and name the files;
never resolve a product or copy conflict by guessing. After the rebase, look at every removed line in
`git diff origin/main`: a line removed by this ship that came from a newer commit on `main` is a
dropped fix → 🚨, restore it.

## 3 · Review

Invoke `review` in diff mode with `--fix` on `origin/main..HEAD`. Its decisions for Marko are
collected for the deploy gate. Substantial fixes → review the fix diff once more.

## 4 · Verify

Invoke `verify` with the mode the change needs. A failure → back to step 3 with the cause.

## 5 · Push once

`git push origin main` (with `--haru`: push the branch and open a PR in Estonian with
`gh pr create`, the body saying what changes for the user, how it was checked and what to test). A
rejected push (non-fast-forward) → back to step 2. Never `--force`. A push the session cannot make:
push a branch and open the PR, and tell Marko the merge to `main` is his click. Then wait for CI
(`gh run watch`); a red run → read the log, fix, and go back to step 3.

## 6 · The deploy gate

One AskUserQuestion, so Marko sees what goes live before it does:
- the commits that are not yet deployed and what changes for the resident, the provider or Arco;
- the target: hosting (`npm run deploy`), the named functions
  (`firebase deploy --only functions:<name>`), or both;
- whether the functions must go before the hosting (a page that calls a new or changed handler);
- anything in the ship that is a stop condition (`sukoda.mdc` §4), and the review decisions, if any.

Options: deploy now, or not yet. No yes → stop with everything pushed and say so. Firestore rules and
indexes are never part of this gate: they are their own task.

## 7 · Deploy (only when approved)

Functions first when the pages depend on them. Single functions when possible:
`firebase deploy --only functions:haldusApi`; otherwise `npm run deploy:functions`. Hosting:
`npm run deploy`. Both npm scripts run `npm run check` first. A failed deploy → read the output and
report the cause; never deploy again blindly.

## 8 · After the deploy

Functions: `firebase functions:log --only <name>` shows a cold start without errors, and the changed
endpoint answers a read-only call with a demo account. Hosting: open the changed page on sukoda.ee in
the browser with the demo account, at phone width, in the languages the change touches, and confirm
the change is there and the console is clean. Never write to a real customer's order.

## 9 · Summary

CLAUDE.md format. Banner `<✅|⚠️|🚨> /shipit: <läks välja · pushitud, deploy ootab Marko jah-sõna ·
peatus: …>`, the Väravad line (review, verify and its mode, `npm run check`), then the ladder:

```
Commit ✅ <sha> · Push ✅ main · CI ✅ roheline · Deploy ✅ functions:haldusApi + hosting · Live ✅ sukoda.ee üle vaadatud
```

A rung not reached is `⏳ ootab` or `❌` with the reason.

## Stop conditions

A rebase conflict, a red check after two fix rounds, a red CI run you cannot explain, a failed
deploy, a push rejected twice, or any request to force-push or to deploy rules as a side effect: stop
and say what is needed.
