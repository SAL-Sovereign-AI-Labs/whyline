# Changelog

All notable changes to this project are documented here. Format: Keep a Changelog. Versioning: SemVer.

## [Unreleased]

### Added
- `whyline init`: installs Bob lifecycle hooks, six skills (why, check, decide, remove, setup, status), and git hooks. No custom mode: everything works in Agent mode.
- `whyline capture`: records prompts and exact written line ranges from Bob hook payloads; the adapter registry is ready for other agents.
- `whyline commit`: attaches a provenance note (`refs/notes/whyline`) to each commit, classifying ranges as `ai` or `ai-edited`.
- `whyline why <file>:<line>`: origin, session, prompt, cost, siblings and temporary item for a line.
- `whyline check`: evaluates temporary items (date, no_references) and exits 2 when any is due.
- `whyline keep` and `whyline until`: developer overrides recorded as notes.
- `session-start` hook summary injected into Bob's context, naming the due item and the remover mode.
- Lifecycle state (`active`, `due`, `kept`, `removed`) on every item in `check` and `--json`, with counts.
- `whyline unreviewed`: AI lines with no human edit since, per file, with coverage from coverage.xml or lcov.info.
- `whyline watch <item> --symbol Name` to correct the reference check.
- `whyline seed`: first run on an existing repo records temporary-looking code with its age and a recovered reason.
- Removals recorded from commit messages naming the item (id or file) and with `whyline removed <item>`.
- Items can be named by file, symbol or kind in keep, until, watch, removed; ids are for notes and scripts.
- `check` exits 0 on a normal answer; `check --gate` exits 2 when items are due (hooks, CI). Grouped table output; structured evidence in JSON.
- Adapter registry under cli/lib/agents/ with IBM Bob as the first adapter.
- `init` sets `notes.rewriteRef` and `notes.displayRef` so notes survive amend and rebase and show in `git log`.
