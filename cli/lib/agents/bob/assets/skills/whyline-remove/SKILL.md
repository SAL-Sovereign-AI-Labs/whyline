---
name: whyline-remove
description: Procedure to remove one due temporary item recorded by whyline, named by the user in plain words (a file, a symbol, a kind or an id), with evidence (references, tests, review) and human approval.
---
Input: what the user wants removed, in their words: "the mock payment gateway", "mock_gateway.py", "the demo script", or an id like L-12d3fa.

1. Find the item. Run `whyline check --json` with execute_command (exit code 0 is normal; the JSON is the answer). Match the user's words against `due` items by file name, symbol, kind or reason. If nothing in `due` matches but an `active` item does, say it is not due yet and stop. If two items match, show both (file and id) and ask which one. Never guess.
2. References. Quote the item's `evidence.summary` and `evidence.references`. Then run `git grep -n -w <symbol>` for every symbol defined in the item's lines. There must be no hits outside the item's file and its own tests.
3. Plan. List the exact files and line ranges to delete. If a test file only tests the item, include it. Nothing else.
4. Dry run. Remove the ranges, run the project's test command (package.json scripts.test, Makefile test target, or pytest), and record the pass and fail counts. If tests fail, revert immediately and report.
5. Review. If Bob's /review is available, run it on the diff and quote any new finding.
6. Present an evidence table: condition, references, tests, review, files, lines removed. Ask for approval with the normal approval prompt. Do not proceed without it.
7. After approval: keep the edit and commit with the message `remove <file name>: <reason>` (naming the file or the id lets the git hook record the item as removed). Run `whyline check` and confirm the item is listed under DECIDED as removed. Tell the user the next step is /create-pr.
