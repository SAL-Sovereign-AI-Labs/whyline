---
name: whyline-status
description: "When the user asks what AI code is unreviewed, how much of a release or branch is AI-written, what an AI bill of materials says, or for the Whyline report, run whyline unreviewed, whyline bom or whyline report."
---
## When to use
Trigger phrases: "what AI code is unreviewed", "what did the AI write in this release", "AI bill of materials", "how much of this is AI", "open the report".

## Workflow
- Unreviewed questions: run `whyline unreviewed --json` with execute_command.
- Release or range questions: run `whyline bom <range> --json` where `<range>` is exactly what the user named (a tag pair like `v1.0..HEAD`, a branch pair like `main..HEAD`, or a single tag). Omit the range entirely to let whyline pick the last tag or the whole history.
- Report requests: run `whyline report` and give the user the file path it prints.

## Rules
- Never invent a range, tag or item id; ask the user if it is unclear.
- Show null values as "no data", never as 0.
- Trust the CLI output over any note in context.
- If the CLI exits non-zero (its exit code is 0 for normal answers, including a due list), stop and show its stderr as-is.
- Read-only: never edit files or notes.

## Output template
For **unreviewed**: a table of file, AI lines, coverage (worst first), then the totals line.
For **bom**: one table with rows: lines changed, AI lines (with % of lines changed), by agent, reviewed (with % of AI lines), tested, active items, due items, removed items, cost ("n of m sessions"); then list any missing data fields.
End with one next command: `whyline why <file>:<line>` to trace a specific line, or tell the user to say "remove `<id>`" in whyline-remover mode when any items are due.
