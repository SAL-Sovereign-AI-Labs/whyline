---
name: whyline-remove
description: Procedure to remove one due temporary item recorded by whyline, with evidence (references, tests, review) and human approval.
---
Input: an item id from `whyline check --json` (for example L-3f9a2c).

1. References. Run `whyline check --json` and quote the item's `evidence`. Then run `git grep -n -w <symbol>` for every symbol defined in the item's lines. There must be no hits outside the item's file and its own tests.
2. Plan. List the exact files and line ranges to delete. If a test file only tests the item, include it. Nothing else.
3. Dry run. Remove the ranges, run the project's test command (package.json scripts.test, Makefile test target, or pytest), and record the pass and fail counts. If tests fail, revert immediately and report.
4. Review. If Bob's /review is available, run it on the diff and quote any new finding.
5. Present an evidence table: condition, references, tests, review, files, lines removed. Ask for approval with the normal approval prompt. Do not proceed without it.
6. After approval: keep the edit and commit with the message `remove <id>: <reason>` (the id must appear in the message; the git hook then records the item as removed). Run `whyline check` and confirm the item shows as removed. Tell the user the next step is /create-pr.
