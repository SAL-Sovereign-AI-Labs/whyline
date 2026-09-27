# Whyline

`git blame` tells you who. Whyline tells you why.

Every line an AI agent writes keeps the prompt that caused it, the session, the cost, the other files that task touched, whether a human edited it since, and whether it was meant to be temporary. Temporary code gets a lifecycle: it is recorded at birth, becomes due when its condition is met, and Bob removes it with evidence and your approval.

Built for IBM Bob 2.0. Bob's free lifecycle hooks record every write; six skills turn the records into answers inside Bob; git notes store everything. Last year's winner, Pedigree, proved that a commit was AI-written, for auditors. Whyline keeps why each line exists and acts on it, for developers.

**Hooks record, Bob explains.** A model never writes the record: Bob's lifecycle hooks capture each write deterministically, a git hook seals it into a note on the commit, and Bob only reads those notes to answer and to propose removals you approve.

## For judges: start here

| What you want to see | Where |
|---|---|
| The live dashboard (demo shop after the payments-v2 merge, rebuilt by CI, no login) | https://sal-sovereign-ai-labs.github.io/whyline/ |
| The package | `npm install -g @sal-sovereign-ai-labs/whyline` ([npm](https://www.npmjs.com/package/@sal-sovereign-ai-labs/whyline)) |
| The Bob pack a repo gets from `whyline init` | [.bob/settings.json](.bob/settings.json) (3 hooks), [.bob/skills/](.bob/skills/) (6 skills) |
| Bob building and using Whyline | [bob_sessions/](bob_sessions/) (task screenshots) and [bob_sessions/costs.md](bob_sessions/costs.md) (29.28 Bobcoins) |
| Tests and CI | [cli/test/](cli/test/) (71 tests), [Actions](https://github.com/SAL-Sovereign-AI-Labs/whyline/actions) |
| Check every claim yourself | [the table below](#dont-take-our-word-for-it) |

![Whyline architecture: Bob writes, hooks record, a commit seals a git note, commands answer, Bob acts](docs/architecture.svg)

## What is recorded, and what is not

| Tier | Written by | Can it be wrong? |
|---|---|---|
| Recorded: prompt, session, exact lines written, cost, commit | Bob's lifecycle hooks and a git hook, into `refs/notes/whyline` | No model involved. It is what Bob's hook payload and git say. |
| Derived: `ai` or `ai-edited` per line, unreviewed, due items, bill of materials | Deterministic whyline commands over the notes and `git blame` | Reproducible: the same repo gives the same answer every time. |
| Explained: plain-language answers and removal proposals in Bob | Bob, through the six skills, always citing the command output | Bob can phrase it badly, so removals always end in Bob's approval prompt and a human decision. |
| Not recorded | Anything written before `whyline init`, and files Bob changes through shell commands | Listed, never guessed. See [Known limitations](#known-limitations). |

## Don't take our word for it

Every value below comes from running the command. Build the demo first: `git clone https://github.com/SAL-Sovereign-AI-Labs/whyline && cd whyline && node demo/build.js /tmp/shop` (whyline on your PATH).

| Claim | Check it | You should see |
|---|---|---|
| 71 tests, zero dependencies | `npm test` and `node -e "console.log(Object.keys(require('./package.json').dependencies \|\| {}).length)"` | `pass 71`, `fail 0`, and `0` |
| Every AI line keeps its prompt | `cd /tmp/shop && whyline why src/payments/mock_gateway.py:3` | `origin ai (bob)` and the prompt that wrote it |
| The record lives in git itself | `git notes --ref=whyline list \| wc -l` and `git log --notes=whyline -1 <commit>` | 7 notes, each a JSON note under its commit |
| Temporary code has a lifecycle | `git merge payments-v2 && whyline check` | `mock_gateway.py` listed as due: "no references outside the file and its tests" |
| It can gate CI | `whyline check --gate; echo $?` | `2` while anything is due |
| It is published | `npm view @sal-sovereign-ai-labs/whyline version` | `0.1.0` |
| Recording costs 0 Bobcoins | [.bob/settings.json](.bob/settings.json) | three hooks of `"type": "command"`: shell commands, no model call |

## Install in a repo

```sh
npm install -g @sal-sovereign-ai-labs/whyline
cd your-repo
whyline init                  # writes .bob/ (hooks and skills) and git hooks
git add .bob && git commit -m "add whyline"
```

Then work in Bob as usual. Nothing new to type.

## Ask

```sh
whyline why src/payments/checkout.py:12   # who wrote it, and why
whyline check                             # temporary code and its lifecycle state
whyline unreviewed                        # AI lines no human has edited since, with coverage if you have a report
whyline keep flags.yaml "beta flag stays until Q1 review"     # name the file, a symbol, a kind, or the id
whyline until legacy_export.py 2027-01-01
whyline watch mock_gateway.py --symbol MockGateway            # fix the symbol the reference check looks for
whyline seed --dry-run                    # existing repo: find temporary-looking code that predates whyline
```

Lifecycle of a temporary item:

```
active --(condition met: date passed, or no references left)--> due --(you decide)--> kept | removed
```
`active` and `due` are recomputed from the repo on every `check`, so they never go stale. `kept` and `removed` are recorded decisions. Bob never changes a state on its own.

In Bob, in normal Agent mode: ask "why does this line exist?", say "remove the mock payment gateway", or "keep the beta flag until Q1". The installed skills run the right whyline command; removals end in Bob's own approval prompt.

## How it works

1. `UserPromptSubmit` and `PostToolUse` hooks record the prompt and the exact lines each write touched (`.git/whyline/session.jsonl`).
2. On commit, a git hook compares what the agent wrote with what was committed: `ai`, `ai-edited`, or human. It attaches one JSON note to the commit on `refs/notes/whyline`. Nothing lands in your working tree.
3. Writes that look temporary (mock, demo, flag, shim, fixture, "until ...") become items with a removal condition: a date, or "no references left".
4. `whyline check` evaluates the conditions. Removal happens in Bob through the whyline-remove skill and Bob's normal approval prompt.

Costs 0 Bobcoins. Hooks are deterministic; Bob is only used for removals. When a Bob task spans several commits, every commit keeps the same prompt.

## Status

Hackathon build (IBM Bob 2.0 Hackathon, 25 to 27 Sep 2026). See docs/ for the research, evidence and architecture.

## CLI

| Command | Purpose | Exit code |
|---|---|---|
| `whyline init` | install Bob and git hooks in the current repo | 0, 3 if not a git repo |
| `whyline why <file>:<line> [--json]` | origin, prompt, session, cost, siblings, item | 0 |
| `whyline check [--json] [--gate]` | temporary items with lifecycle state and evidence | 0; with `--gate`, 2 when any item is due |
| `whyline unreviewed [--json]` | AI lines with no human edit since, per file, coverage from coverage.xml or lcov.info | 0 |
| `whyline watch <item> --symbol Name` | change the symbol the reference check searches for | 0 |
| `whyline removed <item>` | record a removal done by hand (a commit message naming the file or id records it automatically) | 0 |
| `whyline seed [--dry-run] [--by-name]` | on an existing repo, record code carrying TODO remove, FIXME, HACK, temporary or until markers, with its age from git; `--by-name` also records mock_, compat_, examples/ and fixtures/ names | 0 |
| `whyline keep <item> "<reason>"` | mark an item permanent; `<item>` is a file, symbol, kind or id | 0 |
| `whyline until <item> <YYYY-MM-DD>` | set a date condition | 0 |
| `whyline bom [A..B] [--json]` | AI bill of materials for a commit range: lines changed, AI lines by agent, reviewed, items shipped, cost | 0 |
| `whyline report [--out file]` | one offline HTML page with every answer; regenerated after each commit | 0 |
| `whyline capture`, `whyline session-start`, `whyline commit` | hook entry points, always exit 0 | 0 |

`--json` prints machine-readable output with no ANSI codes. Environment: `WHYLINE_DEBUG=1` prints stack traces to stderr, `WHYLINE_BOB_DB` overrides the Bob database path.

## Known limitations

- When git metadata is stripped: a squash merge creates a new commit without the notes of the squashed ones, and a repo copied without `refs/notes/whyline` has no notes at all. The fix is to keep merge commits (or copy notes onto the squash commit with `git notes --ref whyline copy`), and to push and fetch the notes ref, which the installed pre-push and post-merge hooks do. Amend and rebase keep notes because init sets `notes.rewriteRef`.
- The reference check is text search (git grep for the symbol and the module name). Code reached only through strings or reflection can look unreferenced, which is why removal always goes through Bob's evidence step and your approval.
- "Unreviewed" means no human edit since the agent wrote the line. Review comments and PR approvals are not read yet.
- Recording starts at `whyline init`. Code written before that has no note and shows as human. `whyline seed` recovers temporary-looking code from before that point, but not who wrote it or why beyond the comment.
- Hook commands print their one status line to stderr so that stdout stays empty for the agent. `git commit` shows it; tooling that hides stderr will not.

What Whyline does not claim:

- A recorded prompt shows what was asked, not that the code is correct. Whyline is not a scanner and does not grade code or tests.
- Git notes are an audit trail, not a tamper-proof ledger: anyone with write access to the repository can edit or delete them.
- Files Bob changes through shell commands (for example `sed` or `rm` in the terminal) do not pass through the write hooks and are not recorded as AI writes. Every Bob file-writing tool is covered: write_file, write_to_file, apply_diff, insert_content, search_and_replace.
- The demo repository and its prompts were built by us to show the lifecycle end to end.

## Speed

`npm run bench` builds the demo repo and times each command, median of 10. On a MacBook Pro with an Apple M1 Pro, Node 26, measured 27 Sep 2026: capture hook 181 ms (the only thing on Bob's write path), `why` 274 ms, `check` 350 ms, `unreviewed` 636 ms, session-start line 876 ms, `bom` 1.2 s, `report` 2.5 s (runs in the background after a commit). Recording costs 0 Bobcoins.

## Built with IBM Bob

| Bob 2.0 feature | How Whyline uses it | Where | Uses a model? |
|---|---|---|---|
| Lifecycle hooks: SessionStart, UserPromptSubmit, PostToolUse | Record every prompt and every write with its exact lines; tell Bob at session start what is due | [.bob/settings.json](.bob/settings.json), [cli/lib/capture.js](cli/lib/capture.js) | No |
| Skills (6): why, check, decide, remove, status, setup | Answer plain questions in Agent mode by running the whyline command and citing its output | [.bob/skills/](.bob/skills/) | Bob phrases the answer |
| Agent mode and Bob's approval prompt | Removal of due temporary code: evidence table, dry run, your "yes", then Bob deletes and commits | [.bob/skills/whyline-remove/SKILL.md](.bob/skills/whyline-remove/SKILL.md) | Yes, and only this step changes code |
| Bob task database | Each note records the task's Bobcoin cost, read only | [cli/lib/agents/bob/index.js](cli/lib/agents/bob/index.js) | No |
| Git notes (git, not Bob) | The ledger: one JSON note per commit on `refs/notes/whyline` | [cli/lib/commit.js](cli/lib/commit.js) | No |

Bob also built part of it: 16 Bob IDE tasks across two developers, 29.28 Bobcoins, task summaries in [bob_sessions/](bob_sessions/) with costs in [bob_sessions/costs.md](bob_sessions/costs.md). Bob used Whyline on Whyline's own repository and reported five issues; three became fixes (docs/04, section 11). The rest of the code, tests and docs were written by the team with other tools.

## Business model

| | What | Who pays |
|---|---|---|
| Free | The CLI, the six skills and the dashboard, MIT, on npm | Nobody |
| Team | Enforced hooks rolled out to every developer through Bob's EnforcedHooks group policy, an organisation dashboard across repositories, and the report kept as a compliance record per release. $20 per repository per month | The engineering lead who signs off releases, in regulated teams (fintech, health, public sector) |
| Bob | Each developer's own Bob seat. Recording itself costs 0 Bobcoins | The team, as today |

## Troubleshooting

| Symptom | Do this |
|---|---|
| `whyline why` says "git blame failed" | The file is not tracked, or you are in the wrong repo. `git ls-files <file>`. |
| `check` prints "no temporary items yet" | Nothing Bob wrote has been committed since install. Commit once, then `whyline check`. |
| No note after a commit | `whyline` is not on the PATH for git hooks (`npm link`), or the hooks were not installed (`whyline init`). See `.git/whyline/hook.err`. |
| Bob does not record anything | The workspace is not trusted (Bob skips workspace hooks in untrusted folders), or `.bob/settings.json` was not committed. `whyline init` again. |
| Cost shows as null | Bob IDE stores task cost elsewhere than Bob Shell, or sqlite3 is missing. The note is still complete. |

## Uninstall

Delete `.bob/hooks/whyline.sh`, the whyline lines in `.bob/settings.json`, and `.git/hooks/post-commit`, `post-merge`, `pre-push`. Bob and git keep working; the notes stay in the repo under `refs/notes/whyline` until you delete that ref.

## Requirements

Node 20 or newer, git. Bob IDE 2.2 or Bob Shell 2.x for the hooks. macOS and Linux are tested in CI; Windows needs Git Bash for the shell hook and is untested.

## Private by design

Whyline itself makes no network calls. Prompts are stored verbatim in git notes in your own repository, and the installed git hooks push and fetch that notes ref together with your code, so prompts travel to wherever your code travels and nowhere else. Do not paste secrets into prompts; the generated report (`.whyline-report.html`) also embeds prompts and is excluded from commits by `whyline init` through `.git/info/exclude`.

## Development

```sh
npm test            # tests on temp git repos
npm run coverage
npm run smoke
```

## License

MIT
