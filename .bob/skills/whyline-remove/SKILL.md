---
name: whyline-remove
description: "When the user asks to remove, delete or clean up temporary code that Whyline tracks (a mock, stub, demo script, feature flag, shim or fixture, named in plain words, by file, or by id), prove it is safe to delete, run the tests, ask, and only then delete it. Works in Agent mode."
---
## When to use
Trigger phrases: "remove the mock payment gateway", "remove mock_gateway.py", "delete the demo script", "what can I delete", "is this safe to delete", "can I delete this", "clean up the temporary code", "clean up what whyline says is ready", "remove L-12d3fa".

For "what can I delete" with no file named: run step 1, list the `due` items by file with their `evidence.summary`, and ask which one to delete. Do not delete anything yet.

## Workflow
1. Find the temporary code. Run `whyline check --json` with execute_command (exit code 0 is normal; the JSON is the answer). Match the user's words against `due` items by file name, class or function name, kind or reason. If only an `active` item matches, say it is not ready to delete yet and why (its `evidence.summary`, for example "still used in src/checkout.py:4"), then stop. If two items match, show both by file and ask which one. Never guess.
2. Check nothing uses it. Quote the item's `evidence.summary`. Then run `git grep -n -w <name>` for every class and function name defined in the item's lines. There must be no hits outside the item's own file, its own tests, and documentation.
3. Plan. List the exact files and line ranges to delete. If a test file only tests this code, include it. Nothing else.
4. Try it first. Delete the ranges, run the project's test command (package.json scripts.test, Makefile test target, or pytest), and note how many tests passed and failed. If tests fail, put the files back and report.
5. Show the proof it is safe to delete (template below) and ask. Do not keep any change before the user says yes.
6. After the user says yes: keep the change and commit with the message `remove <file name>: <reason>`. The git hook marks it as deleted. Run `whyline check` and confirm the file now shows under KEPT OR DELETED as deleted. Suggest /create-pr as the next step.

## Rules
- Proof before changes. Every claim cites a command and its output.
- Never widen scope: only this code's files, plus a test file that tests nothing else.
- If the CLI exits non-zero (its exit code is 0 for normal answers, including a list of code ready to delete), stop and show its stderr as-is.
- Never run git push. Never delete before the user says yes.

## Output template
```
Proof it is safe to delete: <file>
why it can go    <evidence.summary, for example "nothing uses MockGateway any more">
saved reason     "<reason>"
still used?      <git grep command>: no hits outside its own file and tests
tests            <test command>: <n> passed, <n> failed (with the code deleted)
lines deleted    <n> lines in <n> files
```
Then "Proposed change:" with each file and line range, then the question: "Delete it and commit? (yes or no)".
After the user says yes: the commit id, and the line from `whyline check` that shows the file as deleted.
