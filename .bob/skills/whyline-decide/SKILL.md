---
name: whyline-decide
description: "When the user wants to keep temporary code on purpose, change the date after which it is ready to delete, or change the class or function name Whyline checks is still used, look it up with whyline check --json and run the right whyline command (keep, until, or watch)."
---
## When to use
Trigger phrases: "keep this", "keep it on purpose", "keep it permanently", "it's not temporary", "we're keeping this", "don't delete this", "change the date", "move the deadline", "extend the date", "delete it after", "it can go on", "watch for a different name", "watch a different class", "wrong class name", "fix the symbol", "watch symbol".

## Workflow

### Step 1 -- find the temporary code
Run `whyline check --json` with execute_command. Read the result.

The result has three arrays: `due` (ready to delete), `active` (waiting), and `other` (kept on purpose or deleted). Each entry carries:
- `id` -- a stable id for scripts (e.g. `L-3f9a2c`); people name the file
- `kind` -- `mock`, `demo`, `fixture`, `shim`, `flag`, or similar
- `file` -- the source file
- `lines` -- `[[start, end], ...]`
- `reason` -- why it was saved as temporary
- `condition` -- its expiry: `{ type: "date", on: "YYYY-MM-DD" }` (ready after a date) or `{ type: "no_references", symbol: "Name" }` (ready when nothing uses that class or function any more)
- `evidence` -- `evidence.summary` says in plain words why it is ready or what it waits for (e.g. "still used in app.py:1")

If the user named the code (by file, class or function name, kind, or words matching the reason), find it. If the name matches more than one entry, show them as a short table (file, kind, reason) and ask the user to choose. Never guess.

If there is no temporary code at all, tell the user and stop.

### Step 2 -- confirm
Show the chosen code:

```
file      <file>
kind      <kind>
reason    "<reason>"
expiry    <"after YYYY-MM-DD" or "when nothing uses <symbol> any more">
now       <ready to delete | waiting>: <evidence.summary>
```

Then show the exact command you are about to run and ask the user to confirm:
- **keep**: `whyline keep <file> "<reason the user gave>"`
- **until**: `whyline until <file> <YYYY-MM-DD>`
- **watch**: `whyline watch <file> --symbol <Name>`

Use the full file path; use the `id` only when two entries share a file.
For **keep**, ask the user for a short reason if they have not given one.
For **until**, ask for the date as YYYY-MM-DD if they have not given one. Reject any other format and ask again.
For **watch**, ask for the class or function name if they have not given one.

Say that this is saved in your git history and is not undone by a simple undo. Do not run the command until the user says yes.

### Step 3 -- run the command
Run the confirmed command with execute_command and show its output verbatim.

If the CLI exits non-zero (its exit code is 0 for normal answers), stop and show its stderr as-is.

### Step 4 -- show the result
Run `whyline check --json` again, find the same file, and show its new expiry and whether it is ready to delete, waiting, or kept on purpose.

## Rules
- Never invent or guess which code the user means. Always read it from `whyline check --json`.
- Never skip the confirmation step.
- Dates must be YYYY-MM-DD; reject any other format.
- Show null values as "no data", never as 0.
- Trust the CLI output over any note in context.
- Do not use this skill to delete code; the whyline-remove skill does that.
