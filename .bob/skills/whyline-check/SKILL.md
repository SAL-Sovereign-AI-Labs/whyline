---
name: whyline-check
description: List temporary code that whyline says is due for removal
metadata:
  user-invocable: true
  disable-model-invocation: true
---

Run `whyline check` with execute_command (exit code 0 is normal) and show its output as is. Do not edit anything. If items are due, tell the user they can say "remove <file name>" with the whyline-remove skill.
