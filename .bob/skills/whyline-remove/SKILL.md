---
name: whyline-remove
description: "When the user asks to remove, delete or clean up temporary code that whyline tracks (a mock, stub, demo, flag, shim or fixture, named in plain words, by file, or by id), remove it with evidence, tests and the user's approval. Works in Agent mode."
---
## When to use
Trigger phrases: "remove the mock payment gateway", "remove mock_gateway.py", "delete the demo script", "clean up what whyline says is due", "remove L-12d3fa".

## Workflow
1. Find the item. Run `whyline check --json` with execute_command (exit code 0 is normal; the JSON is the answer). Match the user's words against `due` items by file name, symbol, kind or reason. If only an `active` item matches, say it is not due yet and why (its `evidence.summary`), then stop. If two items match, show both (file and id) and ask which one. Never guess.
2. References. Quote the item's `evidence.summary`. Then run `git grep -n -w <symbol>` for every symbol defined in the item's lines. There must be no hits outside the item's file, its own tests, and documentation.
3. Plan. List the exact files and line ranges to delete. If a test file only tests the item, include it. Nothing else.
4. Dry run. Remove the ranges, run the project's test command (package.json scripts.test, Makefile test target, or pytest), record the pass and fail counts. If tests fail, put the files back and report.
5. Present an evidence table (condition, references, tests, files, lines removed) and ask for approval. Do not edit anything before the user approves.
6. After approval: keep the edit and commit with the message `remove <file name>: <reason>`. The git hook records the item as removed. Run `whyline check` and confirm it is listed under DECIDED as removed. Suggest /create-pr as the next step.

## Rules
- Evidence before edits. Every claim cites a command and its output.
- Never widen scope: only the item's files, plus a test file that tests nothing else.
- If the CLI exits non-zero (its exit code is 0 for normal answers, including a due list), stop and show its stderr as-is.
- Never run git push. Never delete before approval.

## Output template
Evidence table, then "Proposed change:" with the files and lines, then the approval question. After approval: the commit id and the line from `whyline check` showing the item as removed.
