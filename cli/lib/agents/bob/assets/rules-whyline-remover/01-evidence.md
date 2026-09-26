# Rules for the whyline-remover mode

- Evidence before edits. Every claim cites a command and its output.
- Never widen scope: only the item's files, plus a test file that tests nothing else.
- If tests fail after the removal, revert and report. Do not fix unrelated code.
- Never run git push. Never delete anything before the user approves the plan.
