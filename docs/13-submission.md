# 13. Submission texts

Texts for the lablab.ai form. Written in the voice of docs/VOICE.md. Every number comes from a real run on 27 Sep 2026: the demo shop built by `demo/build.js`, `npm test` on main, and `npm run bench`. Each statement must stay under 500 words; check with `wc -w` after every edit.

## Project title

Whyline

## Short description

Know why your AI wrote every line, and clean up what it left behind. Whyline saves the request behind every line IBM Bob writes, right in your git history, and tells you when its temporary code (mocks, feature flags, workarounds) is safe to delete. Bob does the cleanup, only after you say yes.

## Problem and solution statement

**The problem.** AI assistants now write a big share of our code, but the request behind each change lives in a chat that gets closed. Git keeps the code and loses the reason: `git blame` says who committed a line and when, never why it was written or whether it was meant to stay. So the AI's throwaway code (a mock "until the real API lands", a demo script, a feature flag) ships and stays, because nothing reminds anyone to delete it. And nobody can say which AI-written lines a person actually looked at.

**A story.** Sara, a backend developer at a payments startup, finds a mock payment gateway in production. `git blame` says she committed it three weeks ago, and she has no idea whether it is safe to remove.

**The solution.** Whyline remembers why, at the moment Bob writes the code.

1. When Bob edits a file, small scripts Bob runs automatically save the request and the exact lines. No AI call, no extra cost, about 0.2 seconds.
2. On commit, that record is saved in the git history, attached to the commit. Files are not touched, and the history travels with the code.
3. Temporary code gets a date to go, or goes once nothing uses it. When that happens it is ready to delete, and a pull request check can fail until it is gone.
4. Ask Bob "why is this line here?", "what can I delete?" or "what AI code has nobody changed?". Ask "remove the mock": Bob shows the proof, asks, and deletes only after your yes. Bob cannot edit the history itself.

For Sara: Whyline shows her own request ("a mock gateway so checkout works until payments-v2 lands"), that payments-v2 has landed, and that nothing uses the mock any more. Bob removes it after she says yes.

**Proof, from real runs.** In the demo shop, 49 of 96 lines are AI-written and 47 of those were never changed by a person. After payments-v2 merges, the check fails on the mock, and Bob removed it after approval in a recorded run. A public demo repository shows the check passing on one pull request and failing on another. 77 tests, a built-in self check that proves every check can fail, no dependencies, published on npm.

**Why it is different.** Review tools look at a pull request after the fact and guess the intent. Whyline was there when Bob wrote the line and kept the request. And no other AI code tool tracks the temporary code an AI leaves behind until it is safe to delete.

**Limits.** A saved request shows what was asked, not that the code is correct. A person with write access can still edit the history. Changes Bob makes through terminal commands are not recorded.

**Business model.** The CLI is free. Teams pay for Whyline turned on for every developer and a record per release, for example $20 per repository per month.

## IBM Bob usage statement

**Bob inside the product.** `whyline init` adds a `.bob/` folder to a repository. Bob runs everything in it automatically:

- Four hooks (small scripts Bob runs automatically). When you send a request (UserPromptSubmit) and after Bob edits a file (PostToolUse), Whyline saves the request with the exact lines. When a Bob chat starts (SessionStart), Bob is told what temporary code is ready to delete. Before Bob runs a command (PreToolUse), a check blocks any command that would rewrite or delete Whyline's history, with exit code 2.
- Six skills, so you can ask Bob in plain English: why is this line here, what can I delete, keep this flag, what AI code has nobody changed, what did this release ship, set it up.
- Removal uses Agent mode and Bob's own approval prompt: the remove skill finds the code, checks that nothing uses it, runs the tests, shows the proof, and waits for your yes before deleting and committing.
- Each saved record includes what that Bob task cost, read from Bob's task database.

**Bob building the product.** Every Bob task has a summary screenshot and a cost row in `bob_sessions/`.

| Task | What Bob did | Bobcoins |
|---|---|---|
| A task01 | cart module in the demo shop; hooks and cost verified | 0.768 |
| A task02 | whyline-why skill | 1.18 |
| A task03 | whyline-decide skill | 0.49 |
| A task04 | whyline-setup skill | 0.68 |
| A task05 | Whyline tried on its own repository, five issues reported | 3.44 |
| A task06 | removal run: proof, dry run, approval, commit | 0.687 |
| A task07 | removal through the skill in Agent mode | 0.794 |
| B task01 | AI report for a release, passing its tests | 0.605 |
| B task02 | report renderer and template | 1.755 |
| B task03 | whyline-status skill | 0.85 |
| B task04 | report page: line-by-line "why is this here" view | 4.24 |
| B task05 | report overview panels | 1.74 |
| B task06 | report keyboard and screen reader support | 2.44 |
| B task07 | GitHub Pages workflow | 5.26 |
| B task08 | Bob code review of report and bom, two fixes | 4.22 |
| B task09 | Whyline used from Bob, status questions | 0.132 |

Bob also used Whyline on this repository and reported five issues; three became fixes.

**Other tools, stated plainly.** Most of the CLI core, tests and docs were written by the team with other tools. We used Bob where its work is part of the product: the hooks, skills, demo sessions, removal runs and the report page.

**watsonx.** Not used. Whyline makes no AI calls of its own; Bob is the only AI in the loop.

## Tags

Technology: IBM Bob, Node.js, git. Categories: Developer Tools, Code Review, Productivity.

## Video

The video (2 min 57 s) follows one story: Sara, the mock gateway, the request Bob kept, the merge, the check that fails, and Bob removing it after her yes. Its narration, sentence by sentence, is in the video project (`remotion/src/script.json`) and uses the same words as this page.
