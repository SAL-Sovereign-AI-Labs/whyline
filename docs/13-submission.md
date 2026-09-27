# 13. Submission texts

Texts for the lablab.ai form and the video. Every number comes from a real run: the demo shop after `demo/reset.sh` on 26 Sep 2026, `npm test` on main, and the latency in README (Speed). Each statement must stay under 500 words; check with `wc -w` after every edit.

## Project title

Whyline

## Short description

git blame tells you who. Whyline tells you why. Provenance for AI-written code in IBM Bob: every line keeps the prompt that caused it, temporary code is tracked until it is due, and Bob removes it with evidence and your approval.

## Problem and solution statement

**The problem.** Coding agents write a growing share of every codebase, and the reason behind each line disappears when the task ends. git blame names the committer, not the prompt. Temporary code (a mock "until payments-v2 lands", a demo script, a flag) is written with an exit condition nobody records, so it stays. Review is not keeping up: Faros' 2026 study of 22,000 developers found pull requests merged with no review up 31.3%. Teams cannot answer: why does this line exist, which temporary code is due, which AI code did nobody review, and how much of this release did an agent write?

**The solution.** Whyline records the answer when Bob writes the line, not after. Hooks record, Bob explains: a model never writes the record.

1. Bob's lifecycle hooks capture the prompt and the exact lines of every write: 181 ms, 0 Bobcoins.
2. On commit, a git hook seals that into a JSON note under the commit. The ledger travels with the code.
3. Temporary writes get a removal condition at birth (a date, or no references left). `whyline check` moves them from active to due; Bob removes a due item in Agent mode only after your "yes" in its own approval prompt.
4. `why`, `unreviewed` and `bom` answer the four questions in the CLI, in Bob through six skills, and on a dashboard.

**Proof on the demo shop, from the tools' own output.** 49 of 96 lines are AI-written (51%) across 7 Bob sessions, 47 of them unreviewed. Merging payments-v2 leaves the mock gateway unreferenced, `check --gate` exits 2, and Bob removed it after approval in a recorded run. 72 tests, zero dependencies, published on npm; a public demo repo shows the CI gate passing on one pull request and failing on another.

**Why it is different.** Audit tools reconstruct intent from a pull request after the fact; Whyline was there when Bob wrote the line and kept the prompt. Pedigree, last year's winner, recorded who signed a commit; Whyline records why each line exists.

**Limits.** A prompt shows intent, not correctness. Git notes are an audit trail, not tamper-proof. Shell-command edits bypass the write hooks.

**Business model.** Free CLI. Teams would pay, for example, $20 per repository per month for enforced hooks and a compliance record per release.

## IBM Bob usage statement

**Bob inside the product.** `whyline init` installs a `.bob/` folder: lifecycle hooks (SessionStart, UserPromptSubmit, PostToolUse) and six skills (why, check, decide, remove, status, setup).

- The SessionStart hook tells Bob which items are due and how many AI lines are unreviewed.
- The whyline-remove skill works in Agent mode: it runs `whyline check --json`, searches for references, runs the tests, shows an evidence table and waits for Bob's approval prompt before deleting and committing.
- The other skills answer plain questions through the CLI (why is this line here, keep this flag, what is unreviewed, what shipped) and never guess an item.
- Each note records the session's Bobcoin cost from Bob's task database, so a release can say what it cost.

**Bob building the product.** Every task has a summary screenshot and a cost row in `bob_sessions/`.

| Task | What Bob did | Bobcoins |
|---|---|---|
| A task01 | cart module in the demo shop; hooks and cost verified | 0.768 |
| A task02 | whyline-why skill | 1.18 |
| A task03 | whyline-decide skill | 0.49 |
| A task04 | whyline-setup skill | 0.68 |
| A task05 | dogfood: Whyline on Whyline, five issues reported | 3.44 |
| A task06 | removal take: evidence, dry run, approval, commit | 0.687 |
| A task07 | removal through the skill in Agent mode | 0.794 |
| B task01 | bill of materials lens, passing its tests | 0.605 |
| B task02 | report renderer and template | 1.755 |
| B task03 | whyline-status skill | 0.85 |
| B task04 | report Why view, blame-backed code viewer | 4.24 |
| B task05 | report overview panels | 1.74 |
| B task06 | report keyboard and screen reader support | 2.44 |
| B task07 | GitHub Pages workflow | 5.26 |
| B task08 | Bob code review of report and bom, two fixes | 4.22 |
| B task09 | Whyline used from Bob, status questions | 0.132 |

Bob also used Whyline: asked what AI code nobody reviewed, it loaded whyline-status itself and ran three commands. On this repository it found three bugs we fixed: skill files flagged as temporary, a git warning after init, a recursive pre-push hook.

**Other tools, stated plainly.** Most of the CLI core, the tests and the docs were written by the team with other tools, which cost no Bobcoins; Bob's output was reviewed before merge and that review caught an injection bug in the report renderer. We used Bob where its work is part of the product and the evidence: hooks and skills, the demo sessions, the dogfood run, the removal takes and the report's user interface.

**watsonx.** Not used. Whyline makes no model calls of its own; temporary code is classified by deterministic rules, and Bob is the only AI in the loop.

## Tags

Technology: IBM Bob, Node.js, git. Categories: Developer Tools, Code Review, Productivity.

## Video script (under 3 minutes, at least 90 seconds on screen)

Follows demo/RUNBOOK.md. Run `demo/reset.sh` before every take. Terminal font large, one command per shot.

| Time | Screen | Say |
|---|---|---|
| 0:00 to 0:20 | `git blame src/payments/mock_gateway.py` in the demo shop | "Git tells you who wrote this mock and when. Not why it exists, or whether it was meant to stay. Faros measured 22,000 developers this year: pull requests merged with no review are up 31 percent. Whyline keeps the why." |
| 0:20 to 0:50 | Bob IDE, Agent mode; second terminal on `tail -f .git/whyline/session.jsonl`. Prompt: `Add a small cart helper in src/shop/cart.py that returns the item count of an Order.` Then commit and `git log -1` | "A free Bob hook records exactly which lines Bob wrote and the prompt behind them. On commit it becomes a git note. Nothing to type, zero Bobcoins, 166 milliseconds." |
| 0:50 to 1:10 | `whyline why src/payments/checkout.py:2` | "Weeks later anyone can ask why. The prompt is the documentation, and the line knows it belongs to a mock meant to go when payments-v2 lands." |
| 1:10 to 2:10 | `whyline check` (1 due), `git merge payments-v2` (hook prints 2 due), then a new Bob task in Agent mode: `remove the mock payment gateway`, evidence table, approve, commit | "The condition was recorded at birth: no references left. The merge made it true. Bob gathers the evidence, runs the tests, and a human approves. Nothing is deleted on its own." |
| 2:10 to 2:35 | `whyline unreviewed`, then a new Bob session showing the start line | "For the lead: every AI line no human has touched since, per file, worst first. Bob hears it at the start of every session." (read the count off the screen) |
| 2:35 to 3:00 | `whyline bom`, then the report page | "For the release manager: how much of this code is AI (read the percent off the screen), what was reviewed, what temporary code shipped, what it cost. Pedigree proved a commit was AI-written, for auditors. Whyline keeps why, and acts on it, for developers." |
