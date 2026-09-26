# Whyline: instructions for every agent and developer on this repo

Read this first. IBM Bob loads it automatically.

## The goal (do not change)
Whyline is provenance for AI-written code. Every line an agent writes keeps the prompt that caused it, stored as git notes. Answers: why a line exists, which temporary code is due, which AI code nobody reviewed, an AI bill of materials. IBM Bob is inside the product (hooks and skills) and is used to build it.

## Positioning (say it once, exactly like this)
Pedigree (last hackathon's winner) proved that a commit was AI-written, for auditors. Whyline keeps why each line exists and acts on it, for developers. Demo order: lifecycle (mock written, due, removed by Bob), then why, then unreviewed, then bill of materials.

## Principles
- Hooks record, deterministic scripts decide, Bob acts, humans approve. `check` is free and reproducible; Bob is used only for removals and questions.
- Ledger (git notes) is the source of truth. AI never writes state on its own.
- Zero runtime dependencies, plain CommonJS, node:test, no build step, nothing leaves the laptop.
- Every read command has `--json`. Hook commands always exit 0. `check` exits 0 on a normal answer; `check --gate` exits 2 when items are due, for hooks and CI.
- One adapter per agent under cli/lib/agents/<id>/; the core never contains `if (agent === ...)`.
- Read-only report; actions happen in Bob or the CLI.
- No em dashes anywhere. No new dependencies. No servers.

## Playbook (full 25 rules in docs/11-lessons-from-reference-repos.md)
- After `init`, nothing new to type. Uninstalling leaves Bob and git working; notes stay in the repo.
- Missing data is "no data" or `null`, never a zero. Every failure line names its fix.
- Skills call `whyline ... --json`, resolve what the user named (file, symbol, kind) to an item and never guess, and stop with the CLI's stderr on error. Ids are for notes and scripts, not for people. One skill per job; no custom mode, so nothing to switch to.
- Prompts are stored verbatim. Notes never contain scores, summaries or agent self-reports.
- Human lines are absent from notes; `ai-edited` needs an overlapping agent write and a changed hash.
- Every number, screenshot and output block in docs and the video comes from a real run on the demo repo.
- Squash merges, amend with a new message and rebase are documented limitations with the fix named, not hidden.

## Do not touch without a test and a reason
cli/lib/capture.js, commit.js, patch.js, session.js, the note format v1, the hook command shapes, exit codes.

## Working rules
- `npm test` green before every commit. `npm run smoke` too.
- Work done in Bob IDE gets its task summary screenshot in bob_sessions/, named `<name>_task<NN>_<slug>.png`, and its cost in bob_sessions/costs.md.

## Where things are
docs/05-architecture.md (schemas, algorithms), docs/08-adapters.md (adding an agent), docs/09-project-guide.html (zoom-out), docs/11-lessons-from-reference-repos.md (playbook), docs/13-submission.md (submission texts).
