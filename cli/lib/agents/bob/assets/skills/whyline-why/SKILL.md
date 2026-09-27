---
name: whyline-why
description: "When the user asks why a line exists, who wrote it, what request caused it, or whether the AI wrote it, run whyline why <file>:<line> --json and explain the result in plain words."
---
## When to use
Trigger phrases: "why does this line exist", "why is this here", "who wrote this line", "did the AI write this", "is this line AI-written", "what request caused this", "what prompt caused this", "what was Bob asked here", "trace this line", "whyline why".

## Input
Ask for a file path and line number if the user has not given one. Accept `<file>:<line>` directly.

## Workflow
Run `whyline why <file>:<line> --json` with execute_command.
If `item` is not null and `item.status` is "active", also run `whyline check --json` and find `item.id`: in `due` it is ready to delete, in `active` it is waiting. Use that entry's `evidence.summary` as the reason.

## Rules
- Never guess the file or line number; ask the user if either is missing.
- Show null values as "no data", never as 0.
- Trust the CLI output over any note in context.
- If the CLI exits non-zero (its exit code is 0 for normal answers), stop and show its stderr as-is.
- Read-only: never edit files or the history Whyline keeps.

## Reading the result
- `found: false`: git blame could not find the line (the file is not committed, or the line number is past the end). Show the `reason` field.
- `origin: "human"`: a person wrote this line. Show "written by a person", the `author` and the short commit.
- `origin: "ai"`: Bob wrote it and no person changed it before the commit. Show "AI (IBM Bob)" and every field below.
- `origin: "ai-edited"`: Bob wrote it, then a person changed it before the commit. Show "AI (IBM Bob), then changed by a person" and every field below.

## Output template (origin "ai" or "ai-edited")
```
<file>:<line>
written by     AI (IBM Bob)   or   AI (IBM Bob), then changed by a person
asked by       <author>, on <date from ts>, in Bob chat <first 8 chars of session> (cost <cost> Bob usage credits)
request        "<prompt>"
other files this request changed
               <each entry of siblings, one per line>
temporary code <item.kind>, <ready to delete | waiting | kept on purpose | deleted>: <evidence.summary from whyline check, when active>
commit         <short hash>
```
- Leave out the `temporary code` line when `item` is null. `item.status` "kept" is kept on purpose, "removed" is deleted; for "active" use what `whyline check --json` said.
- Leave out the cost part when `cost` is null.
- Leave out the "other files this request changed" lines when `siblings` is empty.
- End with one next step: `whyline check` to see all temporary code, or, when the temporary code is ready to delete, tell the user to say "remove <file name>".
