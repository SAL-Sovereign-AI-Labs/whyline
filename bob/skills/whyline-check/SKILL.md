---
name: whyline-check
description: List temporary code that whyline says is due for removal
metadata:
  user-invocable: true
  disable-model-invocation: true
---

Run `whyline check` with execute_command and show the output as a short table (id, kind, file, evidence, reason). Do not edit anything. If items are due, tell the user they can say "remove <id>" in the whyline-remover mode.
