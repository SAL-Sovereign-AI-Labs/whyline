# Changelog

All notable changes to this project are documented here. Format: Keep a Changelog. Versioning: SemVer.

## [Unreleased]

### Added
- `whyline init`: installs Bob lifecycle hooks, the `whyline-remover` mode, skills, and git hooks.
- `whyline capture`: records prompts and exact written line ranges from Bob hook payloads; the adapter registry is ready for other agents.
- `whyline commit`: attaches a provenance note (`refs/notes/whyline`) to each commit, classifying ranges as `ai` or `ai-edited`.
- `whyline why <file>:<line>`: origin, session, prompt, cost, siblings and temporary item for a line.
- `whyline check`: evaluates temporary items (date, no_references) and exits 2 when any is due.
- `whyline keep` and `whyline until`: developer overrides recorded as notes.
- `session-start` hook summary injected into Bob's context, naming the due item and the remover mode.
- Lifecycle state (`active`, `due`, `kept`, `removed`) on every item in `check` and `--json`, with counts.
- `whyline unreviewed`: AI lines with no human edit since, per file, with coverage from coverage.xml or lcov.info.
- `whyline watch <id> --symbol Name` to correct the reference check.
- Removals recorded from commit messages (`remove <id>: ...`) and with `whyline removed <id>`.
- Adapter registry under cli/lib/agents/ with IBM Bob as the first adapter.
- `init` sets `notes.rewriteRef` and `notes.displayRef` so notes survive amend and rebase and show in `git log`.
