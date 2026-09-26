---
name: whyline-setup
description: Install and enable whyline provenance tracking in the current repository when the user asks Bob to set it up
metadata:
  user-invocable: true
  disable-model-invocation: true
---

## Step 1 -- check the whyline binary

Run `command -v whyline` with execute_command.

- **If it exits non-zero** (command not found): tell the user whyline is not installed and show the install command:
  ```
  npm install -g @sal-sovereign-ai-labs/whyline
  ```
  Then stop. Do not run any further steps until the user confirms the binary is available.

- **If it exits 0**: continue to Step 2.

## Step 2 -- run init

Run `whyline init --agent bob` with execute_command in the repository root.

- If the command exits non-zero or prints to stderr, stop and show its stderr as-is.
- If it exits 0, show its stdout verbatim.

## Step 3 -- tell the user what to commit

After a successful init, tell the user:

> Whyline is set up. Commit the `.bob` folder so your team gets the hooks:
>
> ```
> git add .bob && git commit -m "chore: add whyline provenance hooks"
> ```
>
> After that, every Bob session records the prompt that caused each write. Run `whyline check` at any time to see temporary items, or ask Bob "why does this line exist?" to trace any line.

Do not edit any files. Do not run git commands yourself.
