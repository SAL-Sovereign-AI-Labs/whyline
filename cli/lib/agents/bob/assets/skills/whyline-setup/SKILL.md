---
name: whyline-setup
description: Set up Whyline in the current repository when the user asks Bob to install or set it up, so every commit keeps the request behind the code Bob wrote
metadata:
  user-invocable: true
  disable-model-invocation: true
---

## Step 1 -- check that whyline is installed

Run `command -v whyline` with execute_command.

- **If it exits non-zero** (command not found): tell the user whyline is not installed yet and show the install command:
  ```
  npm install -g @sal-sovereign-ai-labs/whyline
  ```
  Then stop. Do not run any further steps until the user says it is installed.

- **If it exits 0**: continue to Step 2.

## Step 2 -- run init

Run `whyline init --agent bob` with execute_command in the repository root.

- If the command exits non-zero or prints to stderr, stop and show its stderr as-is.
- If it exits 0, show its stdout verbatim.

## Step 3 -- tell the user what to commit

After a successful init, tell the user:

> Whyline is set up. Commit the `.bob` folder so your team gets it too:
>
> ```
> git add .bob && git commit -m "Add Whyline"
> ```
>
> From now on, each time you commit, Whyline saves the request you gave me next to the code I wrote, in your git history (a git note, extra data attached to the commit; your files are not touched). Ask me "why does this line exist?" about any line, or "what can I delete?" to see temporary code that is ready to go.

Do not edit any files. Do not run git commands yourself.
