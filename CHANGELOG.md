# Changelog

All notable changes to this project are documented here. Format: Keep a Changelog. Versioning: SemVer.

## [Unreleased]

## [0.1.2] - 2026-09-27

### Added
- The product website (site/), published at the Pages root; the live report moved to /report/. The website, the report, the README and npm link to each other.

### Changed
- The report page redesign: one design system, a Status timeline, a picker across projects, and plain labels ("Changed by a person since" instead of "reviewed").
- Plain-language rewrite of every surface people read, following the new docs/VOICE.md: README (problem first, one worked example, screenshot), story diagram, CLI output and help, the six Bob skills, the guard message and the dashboard. Command names and `--json` keys are unchanged.

## [0.1.1] - 2026-09-27

### Added
- `whyline selftest`: plants a passing and a failing case for every check in a temp repo and reports PROVEN only when each check tells them apart.
- Bob PreToolUse guard (`.bob/hooks/whyline-guard.sh`): Bob cannot rewrite or delete Whyline's record through its shell tool; exit 2 with the reason.
- `check --gate` inside GitHub Actions prints an error annotation on each due file.

## [0.1.0] - 2026-09-26

Published on npm as `@sal-sovereign-ai-labs/whyline` (the bare name is blocked by the registry as too similar to `byline`). The command is still `whyline`.

### Added
- `whyline init`: installs Bob lifecycle hooks, six skills (why, check, decide, remove, setup, status), and git hooks. No custom mode: everything works in Agent mode.
- `whyline capture`: records prompts and exact written line ranges from Bob hook payloads; the adapter registry is ready for other agents.
- `whyline commit`: attaches a provenance note (`refs/notes/whyline`) to each commit, classifying ranges as `ai` or `ai-edited`.
- `whyline why <file>:<line>`: origin, session, prompt, cost, siblings and temporary item for a line.
- `whyline check`: evaluates temporary items (date, no_references) and exits 2 when any is due.
- `whyline keep` and `whyline until`: developer overrides recorded as notes.
- `session-start` hook summary injected into Bob's context, naming the due item and the whyline-remove skill.
- Lifecycle state (`active`, `due`, `kept`, `removed`) on every item in `check` and `--json`, with counts.
- `whyline unreviewed`: AI lines with no human edit since, per file, with coverage from coverage.xml or lcov.info.
- `whyline watch <item> --symbol Name` to correct the reference check.
- `whyline seed`: first run on an existing repo records temporary-looking code with its age and a recovered reason.
- Removals recorded from commit messages naming the item (id or file) and with `whyline removed <item>`.
- Items can be named by file, symbol or kind in keep, until, watch, removed; ids are for notes and scripts.
- `check` exits 0 on a normal answer; `check --gate` exits 2 when items are due (hooks, CI). Grouped table output; structured evidence in JSON.
- Adapter registry under cli/lib/agents/ with IBM Bob as the first adapter.
- `init` sets `notes.rewriteRef` and `notes.displayRef` so notes survive amend and rebase and show in `git log`.
