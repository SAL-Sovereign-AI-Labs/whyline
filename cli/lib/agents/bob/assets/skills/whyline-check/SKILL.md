---
name: whyline-check
description: Show the temporary code Whyline tracks, and which of it is ready to delete
metadata:
  user-invocable: true
  disable-model-invocation: true
---

Run `whyline check` with execute_command (exit code 0 is normal) and show its output as is. Do not edit anything.

The output has up to three tables: READY TO DELETE, WAITING, and KEPT OR DELETED. The "why" column says, in plain words, why the code can go ("nothing uses MockGateway any more", "2026-12-01 has passed") or what it is still waiting for ("still used in src/checkout.py:4", "after 2026-12-01").

If anything is ready to delete, end with one line: 'To delete it, say "remove <file name>". I will show the proof it is safe to delete and ask before changing anything.'
