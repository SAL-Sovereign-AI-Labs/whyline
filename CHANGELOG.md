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
- `session-start` hook summary injected into Bob's context.
