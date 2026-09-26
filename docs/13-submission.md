# 13. Submission texts

Texts for the lablab.ai form and the video. Every number comes from a real run: the demo shop after `demo/reset.sh` on 26 Sep 2026, `npm test` on main, and the latency in README (Speed). Each statement must stay under 500 words; check with `wc -w` after every edit.

## Project title

Whyline

## Short description

git blame tells you who. Whyline tells you why. Provenance for AI-written code in IBM Bob: every line keeps the prompt that caused it, temporary code is tracked until it is due, and Bob removes it with evidence and your approval.

## Problem and solution statement

**The problem.** Coding agents write a growing share of every codebase, and the reason behind each line disappears when the task ends. git blame names the committer, not the prompt. Temporary code (a mock "until payments-v2 lands", a demo script, a feature flag) is written with an exit condition nobody records, so it stays. Review is not keeping up: Faros' 2026 study of 22,000 developers found pull requests merged with no review up 31.3%, and 66% of developers in the Stack Overflow 2025 survey say AI code is "almost right, but not quite". Teams cannot answer four questions: why does this line exist, which temporary code is due, which AI code did nobody review, and how much of this release did an agent write?

**The solution.** Whyline is a code ledger for AI-written code, built into IBM Bob, in four parts.

1. Hooks. Bob's lifecycle hooks record the prompt and the exact line ranges each write touched: 166 ms per write, 0 Bobcoins.
2. Notes. On commit, a git hook compares what Bob wrote with what was committed (ai, ai-edited or human) and attaches one JSON note to the commit. The ledger travels with the repository.
3. Check. Writes that look temporary become items with a removal condition recorded at birth: a date, or "no references left". `whyline check` evaluates them with git grep in 129 ms and moves each item through a lifecycle: active, due, then kept or removed.
4. Remover. A custom Bob mode removes a due item with evidence (references, tests, review) and asks for approval through Bob's normal prompt. Hooks record, scripts decide, Bob acts, humans approve.

**Who uses it and how.** After `whyline init` there is nothing new to type. Developers ask `whyline why file:line` and get the prompt, the session, the sibling files and its temporary item. Leads run `whyline unreviewed`. Release managers run `whyline bom` for an AI bill of materials. Everyone gets a read-only HTML report, regenerated on every commit. In Bob, skills answer the same questions, and every session opens with what is due.

**Proof on the demo shop.** 59 of 205 lines are AI-written (29%) across 7 Bob sessions. Six temporary items were recorded at birth and one is due. Merging the payments-v2 branch leaves the mock gateway unreferenced, `check` reports two due, and the remover mode takes it out after approval. 46 tests pass.

**Why it is new.** Last hackathon's winner, Pedigree, proved that a commit was AI-written, for auditors. Whyline keeps why each line exists and acts on it, for developers: the prompt per line, the lifecycle of temporary code, what nobody reviewed, and a bill of materials per release. Zero dependencies, no servers, nothing leaves the laptop. Squash merges drop notes, a stated limitation; amend and rebase keep them, and a pre-push hook shares them.

**Business model.** The CLI is free. Organisations pay for policy: enforced hooks rolled out to every developer, and the report for compliance.

## IBM Bob usage statement

**Bob inside the product.** Whyline ships as an IBM Bob plugin. `whyline init` installs into `.bob/`: lifecycle hooks (SessionStart, UserPromptSubmit, PostToolUse), a custom mode, whyline-remover, with its rules, and skills (whyline-check, whyline-remove, whyline-status). 

- The hooks record every Bob write at no Bobcoin cost.
- The SessionStart hook puts one line into Bob's context: which items are due and how many AI lines are unreviewed.
- The remover mode works in Agent mode: it runs `whyline check --json`, searches for references, deletes the code, runs the tests, shows an evidence table and waits for Bob's normal approval prompt before committing.
- The whyline-status skill answers "what AI code is unreviewed?" and "what is in this release?" through the CLI and never guesses an id or a range.
- Each note records the session's Bobcoin cost, read from Bob's own task database in read-only mode, so the bill of materials can say what a release cost.

**Bob building the product.** Every task below has a summary screenshot in `bob_sessions/` and a row in `bob_sessions/costs.md`.

| Task | Member | What Bob did | Bobcoins |
|---|---|---|---|
| A task01 | Faisal | cart module in the demo shop, hooks and cost verified from Bob IDE | 0.77 |
| B task01 | Atiq | first implementation of the bill of materials lens (`cli/lib/bom.js`), passing the 8 tests written for it | 0.605 |
| B task02 | Atiq | HTML report renderer and template from the design mockup, with escaping tests | 1.755 |
| B task03 | Atiq | whyline-status skill | 0.85 |


**Other tools, stated plainly.** Most of the CLI core (capture, commit classification, patch parsing, the lenses, init, the adapter registry), the tests and the docs were written by the team with other tools, which cost no Bobcoins. The team reviewed Bob's output before merge. In the report renderer that review found that a prompt containing `$'` could splice template text into the page, fixed it and added a regression test. We used Bob where its work is part of the product and the evidence: the Bob side (hooks, mode, skills), the demo sessions, the removal takes, and one real module per developer.

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
| 1:10 to 2:10 | `whyline check` (1 due), `git merge payments-v2` (hook prints 2 due), then Bob in the whyline-remover mode: `remove L-12d3fa`, evidence table, approve, commit | "The condition was recorded at birth: no references left. The merge made it true. Bob gathers the evidence, runs the tests, and a human approves. Nothing is deleted on its own." |
| 2:10 to 2:35 | `whyline unreviewed`, then a new Bob session showing the start line | "For the lead: every AI line no human has touched since, per file, worst first. Bob hears it at the start of every session." (read the count off the screen) |
| 2:35 to 3:00 | `whyline bom`, then the report page | "For the release manager: how much of this code is AI (read the percent off the screen), what was reviewed, what temporary code shipped, what it cost. Pedigree proved a commit was AI-written, for auditors. Whyline keeps why, and acts on it, for developers." |
