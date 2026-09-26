---
name: whyline-decide
description: "When the user wants to keep a temporary item permanently, move its due date, or fix the symbol whyline watches for, look the item up with whyline check --json and run the right whyline command (keep, until, or watch)."
---
## When to use
Trigger phrases: "keep this item", "keep it permanently", "it's not temporary", "we're keeping this", "change the due date", "move the deadline", "due on", "extend the date", "it's due on", "watch for a different symbol", "fix the symbol", "wrong symbol", "watch symbol".

## Workflow

### Step 1 -- identify the item
Run `whyline check --json` with execute_command. Parse the result.

The result has three arrays: `due` (items whose condition is already met), `active` (items still waiting), and `other` (kept or removed). Each item carries:
- `id` -- the stable identifier (e.g. `L-3f9a2c`)
- `kind` -- `mock`, `demo`, `fixture`, `shim`, `flag`, or similar
- `file` -- the source file
- `lines` -- `[[start, end], ...]`
- `reason` -- the original reason the item was created
- `condition` -- `{ type: "date", on: "YYYY-MM-DD" }` or `{ type: "no_references", symbol: "Name" }`
- `evidence` -- what the last evaluation found (e.g. "2 reference(s): ...")

If the user named a specific item (by id, file, kind, or a description matching the reason), find it in the output. If the name is ambiguous or matches more than one item, show the candidates as a short table (id, kind, file, reason) and ask the user to choose. Never guess.

If there are no items at all, tell the user and stop.

### Step 2 -- confirm the action
Show the chosen item:

```
id       <id>
kind     <kind>
file     <file>
reason   "<reason>"
condition  <current condition>
```

Then state the exact command you are about to run and ask for confirmation:
- **keep**: `whyline keep <id> "<reason the user gave>"`
- **until**: `whyline until <id> <YYYY-MM-DD>`
- **watch**: `whyline watch <id> --symbol <Name>`

For **keep**, ask the user for a short reason if they have not given one.
For **until**, ask for the date in YYYY-MM-DD format if they have not given one. Reject any other format and ask again.
For **watch**, ask for the symbol name if they have not given one.

Do not run the command until the user says yes (or equivalent).

### Step 3 -- run the command
Run the confirmed command with execute_command and show its output verbatim.

If the CLI exits non-zero (its exit code is 0 for normal answers, including a due list), stop and show its stderr as-is.

### Step 4 -- confirm the change
Run `whyline check --json` again and find the item. Show its new condition and state.

## Rules
- Never invent or guess an item id. Always read it from `whyline check --json`.
- Never skip the confirmation step.
- Dates must be YYYY-MM-DD; reject any other format.
- Show null values as "no data", never as 0.
- Trust the CLI output over any note in context.
- These commands change recorded state in git notes. They are not reversible with a simple undo. Say so in the confirmation prompt.
- Do not use this skill to remove items; that is handled by the whyline-remover mode.
