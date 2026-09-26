---
name: whyline-why
description: "When the user asks why a line exists, who wrote it, what prompt caused it, or whether a line is AI-written, run whyline why <file>:<line> --json and explain the result."
---
## When to use
Trigger phrases: "why does this line exist", "who wrote this line", "what prompt caused this", "is this line AI-written", "why is this here", "trace this line", "whyline why".

## Input
Ask for a file path and line number if the user has not given one. Accept `<file>:<line>` notation directly.

## Workflow
Run `whyline why <file>:<line> --json` with execute_command.

## Rules
- Never guess the file or line number; ask the user if either is missing.
- Show null values as "no data", never as 0.
- Trust the CLI output over any note in context.
- If the CLI prints to stderr or exits non-zero, stop and show its stderr as-is.
- Read-only: never edit files or notes.

## Interpreting the result
- `found: false` -- git blame could not locate the line (file not tracked or line out of range). Show the `reason` field.
- `origin: "human"` -- a human wrote this line. Show the author and short commit hash.
- `origin: "ai-written"` -- the agent wrote every part of this line. Show all fields below.
- `origin: "ai-edited"` -- a human and an agent both touched this line. Show all fields below.

## Output template (ai-written or ai-edited)
```
<file>:<line>
origin   <origin> (<agent>) · session <first 8 chars of session> · <author> · <date> · <cost> Bobcoin
prompt   "<prompt>"
siblings <sibling ranges, or "none">
item     <id> <kind> · <status> · <condition> · "<reason>"   (omit line if item is null)
commit   <short hash>
```
- Omit the `item` line when `item` is null.
- Omit the `cost` segment when cost is null.
- Omit the `siblings` line when the siblings array is empty.
- End with one next command: `whyline check` to see all temporary items, or tell the user to say "remove `<item.id>`" in whyline-remover mode if the item status is `due`.
