---
name: whyline-status
description: "When the user asks what the AI wrote, which AI code no person has changed since, how much of a release or branch is AI-written, for an AI report for a release, or for the Whyline dashboard, run whyline unreviewed, whyline bom or whyline report."
---
## When to use
Trigger phrases: "what did the AI write", "what did the AI write in this release", "which AI code has nobody looked at", "what AI code is unreviewed", "how much of this is AI", "AI report for this release", "AI bill of materials", "open the report", "open the dashboard".

## Workflow
- "Which AI code has nobody changed" questions: run `whyline unreviewed --json` with execute_command.
- Release or branch questions: run `whyline bom <range> --json` where `<range>` is exactly what the user named (a tag pair like `v1.0..HEAD`, a branch pair like `main..HEAD`, or a single tag). Leave the range out to let whyline pick the last tag, or all history.
- Dashboard requests: run `whyline report` and give the user the file path it prints.

## Rules
- Never invent a range, tag or file; ask the user if it is unclear.
- Show null values as "no data", never as 0.
- Trust the CLI output over any note in context.
- If the CLI exits non-zero (its exit code is 0 for normal answers), stop and show its stderr as-is.
- Read-only: never edit files or the history Whyline keeps.

## Output template
For **unreviewed**, title "AI code no person has changed since": a table of file, AI lines, test coverage (most lines first), then one line with the totals (`totals.aiLines` lines in `totals.files` files).
For **bom**, title "AI report for <range, or all history>": one table with rows: lines changed (`linesChanged`), written by AI (`ai.total`, with % of lines changed), by assistant (`ai.byAgent`), AI lines a person changed since (`reviewed.lines`, with `reviewed.percent`% of AI lines), covered by tests (`tested`), temporary code waiting (`items.active`), temporary code ready to delete (`items.due`), temporary code deleted (`items.removed`), cost in Bob usage credits (`cost.sum`, "from n of m Bob chats"); then list anything in `missing` as "no data for: ...".
End with one next step: `whyline why <file>:<line>` to see the request behind a line, or, when anything is ready to delete, tell the user to say "remove <file name>".
