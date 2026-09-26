# Whyline

Provenance for AI-written code. Every line keeps the prompt that caused it.

`git blame` tells you who. Whyline tells you why: the prompt, the session, the cost, the other files that
task touched, whether a human reviewed it, and whether the code was meant to be temporary.

Built for IBM Bob 2.0. Bob's free lifecycle hooks record every write; Whyline turns that into answers.

## Install in a repo

```sh
npm install -g SAL-Sovereign-AI-Labs/whyline   # from GitHub (npm release coming: npm install -g whyline)
cd your-repo
whyline init                  # writes .bob/ (hooks, a mode, skills) and git hooks
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
```

Lifecycle of a temporary item:

```
active --(condition met: date passed, or no references left)--> due --(you decide)--> kept | removed
```
`active` and `due` are recomputed from the repo on every `check`, so they never go stale. `kept` and `removed` are recorded decisions. Bob never changes a state on its own.

In Bob: `/whyline-check` lists due items, and in the `whyline-remover` mode you say "remove the mock payment gateway"; Bob finds the item, shows evidence, and asks for your approval.

## How it works

1. `UserPromptSubmit` and `PostToolUse` hooks record the prompt and the exact lines each write touched (`.git/whyline/session.jsonl`).
2. On commit, a git hook compares what the agent wrote with what was committed: `ai`, `ai-edited`, or human. It attaches one JSON note to the commit on `refs/notes/whyline`. Nothing lands in your working tree.
3. Writes that look temporary (mock, demo, flag, shim, fixture, "until ...") become items with a removal condition: a date, or "no references left".
4. `whyline check` evaluates the conditions. Removal happens in Bob, through its normal approval prompt.

Costs 0 Bobcoins. Hooks are deterministic; Bob is only used for removals.

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
| `whyline keep <item> "<reason>"` | mark an item permanent; `<item>` is a file, symbol, kind or id | 0 |
| `whyline until <item> <YYYY-MM-DD>` | set a date condition | 0 |
| `whyline capture`, `whyline session-start`, `whyline commit` | hook entry points, always exit 0 | 0 |

`--json` prints machine-readable output with no ANSI codes. Environment: `WHYLINE_DEBUG=1` prints stack traces to stderr, `WHYLINE_BOB_DB` overrides the Bob database path.

## Known limitations

- Squash merges drop the notes of the squashed commits. Amend and rebase keep them (init sets `notes.rewriteRef`).
- The reference check is text search (git grep for the symbol and the module name). Code reached only through strings or reflection can look unreferenced, which is why removal always goes through Bob's evidence step and your approval.
- "Unreviewed" means no human edit since the agent wrote the line. Review comments and PR approvals are not read yet.
- Recording starts at `whyline init`. Code written before that has no note and shows as human. A `seed` command for existing repos is planned.
- Hook commands print their one status line to stderr so that stdout stays empty for the agent. `git commit` shows it; tooling that hides stderr will not.

## Speed

Measured on this repo's demo, median of 10 runs on a MacBook Pro with an Apple M1 Pro: capture hook 166 ms, `check` 129 ms, session-start line 277 ms. Recording costs 0 Bobcoins.

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

Whyline sends nothing over the network. Prompts are stored as git notes in your own repository.

## Development

```sh
npm test            # tests on temp git repos
npm run coverage
npm run smoke
```

## License

MIT
