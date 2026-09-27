# Whyline: feasibility evidence and tech stack decision

Date: 26 Sep 2026, 12:20 am. Sources: live experiments on the installed Bob Shell 2.0.5, Bob Shell source (bob.js), bob.ibm.com docs (171 pages fetched), 15 GitHub repos fetched with gh. Raw material in the session scratchpad: feas-docs.md (docs matrix, 30 KB), ship-research.md (GitHub practices), exp-bob/hooklog/*.log (captured hook payloads).

## 1. Verdict

Every feature in the plan is doable in Bob today. Proof below. Two design changes came out of the research:

1. Capture from hooks, never from Bob's database. Bob keeps a local attribution_logs table (file, tool, line range, task id). On our machines it stayed empty (0 rows, checked again on 27 Sep 2026), and another team reports rows appearing when Bob works inside a git repository. Either way it holds no prompt and never leaves the machine, while the hook payload carries everything we need and git notes travel with the code.
2. Attribution itself is not new (entire.io has 5,119 stars, agentblame 101, agentdiff 45). None of them support IBM Bob, none attach the prompt as "why" in a report, none do expiry or a bill of materials. Our pitch must say "attribution exists; we make it Bob-native and actionable", not "nobody tracks AI code".

## 2. Live experiment evidence (Bob Shell 2.0.5, this Mac)

Spent: about 0.15 Bobcoins total on the account this Shell is logged into. Task 1 cost 0.102 Bobcoins for 11.1k context tokens. Task 2 (an apply_diff edit) was similar.

| Claim | Result | Evidence |
|---|---|---|
| All five hook events fire in Shell chat | Yes | hooklog/SessionStart.log, UserPromptSubmit.log, PreToolUse.log, PostToolUse.log, Stop.log all written during one task |
| Payload field names | session_id, cwd, hook_event_name, tool_name, tool_input, tool_use_id, tool_response (PostToolUse), prompt (UserPromptSubmit), source (SessionStart), last_assistant_message (Stop) | Captured JSON. Note: docs show older names (event, tool, input, output). Read both spellings. |
| write_file payload has full content | Yes | `"tool_input":{"path":".../hello.py","content":"# SKILL_MARKER_OK\n\ndef add(a, b):\n    return a + b\n","line_count":4}` |
| apply_diff payload shape | path plus a SEARCH/REPLACE block with `:start_line:` | `"diff":"<<<<<<< SEARCH\n:start_line:4\n-------\n    return a + b\n=======\n    return a + b\n\n\ndef sub(a, b):\n    return a - b\n>>>>>>> REPLACE\n"` |
| apply_diff response has a unified diff | Yes | tool_response contains "Patch of edit: <patch> @@ -1, ..." so exact changed line ranges come for free |
| SessionStart stdout is injected into the model context | Yes, proven | Hook printed "LEDGER_CONTEXT_MARKER: 2 items due, 9 files unreviewed"; the user message row in bob.db shows it inside envContext |
| Custom mode from .bob/custom_modes.yaml via `bob chat --mode <slug>` | Yes | TUI footer showed "Ledger Test Mode (auto-approve)" and the system prompt in bob.db starts with our roleDefinition |
| Skill auto-loads from .bob/skills by description | Yes | Bob read SKILL.md on its own and wrote the required header. Side effect: it also called search_ibm_docs twice, which wasted tokens. Keep skill descriptions literal and short. |
| Plugin folder loading | `.bob/plugins/<name>/custom_modes.yaml` loads. `~/.bob/plugins/<name>/` loads. A bare `plugins/` folder in the workspace does not load in Shell 2.0.5. | Footer showed "Plug Local Mode" and "Plug Global Mode"; workspace plugins/ gave "Unknown mode" |
| Hooks cost Bobcoins | No | Cost only moved when the model ran; hook-only steps did not change the counter |
| Per-task cost is readable locally | Yes, for Shell | `~/.bob/db/bob.db` tasks.costs = `{"cost":0.10197,"contextTokens":11142}`; per-message spend in messages._meta.spend |
| Headless `bob run` | Needs BOB_API_KEY | Error text: "Bob API key is required. Set BOB_API_KEY environment variable." The IBMid login only serves `bob chat`. For automation in the demo, use `bob chat` in a terminal or create an API key in the hackathon account. |
| git notes on a custom ref | Yes | Note added on refs/notes/whyline, read back, survived a file rename through blame, pushed to a bare remote, 83 bytes |

## 3. Docs matrix summary (bob.ibm.com, verbatim quotes in feas-docs.md)

| Area | Status | What matters for us |
|---|---|---|
| Hooks | Supported in IDE and Shell. Files: `~/.bob/settings/settings.json` (global), `.bob/settings.json` (workspace). Key `hooks`. Schema: event → [{matcher, hooks:[{type, command, timeout}]}]. Default timeout 10 s. Command runs via `sh -c`. | Ship `.bob/settings.json`. Workspace hooks run only in trusted folders. |
| Events | IDE: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop. Shell adds PreCompact, PostCompact. | Use only the five common ones. |
| Blocking | Exit 2 blocks UserPromptSubmit and PreToolUse only. Stdout injected as context only from SessionStart and UserPromptSubmit. No input rewriting. | Push gate is a PreToolUse hook on execute_command matching `git push`. |
| Enterprise | EnforcedHooks policy, "cannot be overridden by users", IDE only. | The org-wide story is real and documented. |
| Custom modes | `.bob/custom_modes.yaml`. Fields slug, name, description, roleDefinition, whenToUse, customInstructions, groups (edit with fileRegex), allowedSubagents. Invoked as `/<slug>` or via switch_mode. Mode rules in `.bob/rules-<slug>/`. | Ship one mode: whyline-remover, groups read, edit, execute, skill. |
| Skills | `.bob/skills/<name>/SKILL.md`, front matter name and description only, supporting files readable. | Ship 2 skills: whyline-remove (evidence procedure), ledger-seed (stretch). |
| Slash commands | `.bob/commands/<name>.md`, $1 $2 args, identical in IDE and Shell. | Optional `/whyline-check` command. |
| Plugins | Only one changelog line (IDE 2.2.0): skills, modes, rules and MCP can live in a `plugins/` subdirectory. No plugin.json, no marketplace, no `bob plugin` command documented. Hooks are not part of it. | Distribution is "files in the repo" installed by our CLI. Do not promise a marketplace. |
| Approvals | Per tool group in `~/.bob/settings/settings.json` `approval`. allowedExecutors with approvedCommands and deniedCommands. `bob run` pre-approves all tools. | The removal mode ends in Bob's normal approval prompt in the IDE. |
| Git features | Commit message, /review with Bob Findings, /create-pr: IDE only. "Track code attribution with git notes" is one changelog line with no details. | Inspect the IDE's notes ref during hour 0 in the IDE; do not depend on it. |
| Bob Shell json | `bob run --format json` returns stats.task_id, tokens, session_costs, tool_calls. | Only with an API key. |
| Bobcoins | No per-token rate published. Hackathon account: 40 each, enterprise plan. | Hour-0 calibration in the IDE, then budget. |

Docs conflicts still to test in the IDE (not installed on this Mac): HTTPS hook type in IDE, tool group name `execute` vs `command` in Shell custom modes, `/create-pr` vs `/create-pull-request`, where the IDE stores its task database and cost.

## 4. Prior art and positioning

| Project | Stars | What it does | What we do differently |
|---|---|---|---|
| entireio/cli | 5,119 | Go binary. Hooks Stop, parses the transcript, writes commit trailers like "Entire-Attribution: 73% agent (146/200 lines)" and checkpoint refs. Claude Code, Codex, Cursor. | No Bob. A percentage, not "why". No lifecycle, no review status, no BOM. |
| mesa-dot-dev/agentblame | 101 | Bun. Line-level attribution with prompt id in `refs/notes/agentblame`. Cursor, Claude, OpenCode. Needs Bun for hooks. | No Bob, Bun dependency, no report, no expiry. Closest to our "why". |
| codeprakhar25/agentdiff | 45 | Rust plus Python capture scripts. session.jsonl in .git, notes on `refs/notes/agentdiff`, signed traces. | No Bob. Trace format, no lenses. |
| IBM/galaxium-travels | 52 | IBM's own Bob demo. `.bob/hooks/record-tool.sh` appends a JSON line on every tool call: "Runs on EVERY tool call, so it has to stay cheap". | Validates our hook style. We copy its shape. |

Originality statement for the submission: "Line-level AI attribution exists for Claude and Cursor. Nothing exists for IBM Bob, and nobody turns attribution into answers a team acts on: why a line exists, which temporary code is due, which AI code nobody reviewed, and a bill of materials per release."

## 5. Tech stack decision

One language, zero runtime dependencies, one npm package.

| Layer | Choice | Why (evidence) |
|---|---|---|
| Capture hook (every tool call) | POSIX `sh` line in settings.json calling `node cli/index.js capture`, guarded with `command -v node || exit 0` | IBM's demo uses sh + jq. Node startup is about 50 ms, well inside the 10 s timeout and invisible next to model latency. One language means one test suite. The guard means teammates without Node are never blocked (entire.io pattern). |
| CLI | Single-file Node, `node:test`, no dependencies, `"bin": {"whyline": "cli/index.js"}`, `engines.node >= 20` | ccusage, claude-hud and cloudflare validators all ship this way. Node 24 is already required by Bob Shell. |
| State during a session | `.git/whyline/session.jsonl`, one line per write: session, prompt hash, file, ranges, content hash | agentdiff shape. Inside .git so it never appears in the tree or in diffs. |
| Durable state | One JSON note per commit on `refs/notes/whyline`; prompts stored once per session in the same note | Verified locally. Matches Bob IDE's own attribution convention (git notes). agentblame and agentdiff do the same. |
| Sync | post-merge and pre-push hooks run `git fetch/push origin refs/notes/whyline` | Standard. Squash-merge loss is a known limitation shared by every tool in this space; documented, not solved in 48 h. |
| Reference check for expiry | `git grep` for the symbol and file name, plus a Python and JS import regex | Deterministic, no tree-sitter in 48 h. Good enough for the demo repo. |
| Review signals | git blame (human edit after AI write), `gh api` PR reviews and comments | Both already on the machine. |
| Coverage | Read coverage.xml or lcov.info if present, else "no data" | Never guess. |
| Report | `whyline report` writes one static HTML file with inline data. No server. | Read-only by decision. |
| Bob integration | `.bob/settings.json` hooks, `.bob/custom_modes.yaml` (whyline-remover), `.bob/skills/whyline-remove/SKILL.md`, `.bob/rules-whyline-remover/`, optional `.bob/commands/whyline-check.md` | All verified to load in Shell; all documented for the IDE. |
| Claude Code (stretch) | `claude/hooks/hooks.json` with the same command and matcher `Edit|Write|MultiEdit` | Identical hooks.json shape (verified in anthropics/claude-code plugins). |

## 6. Repository layout

```
whyline/
  package.json                 # bin, files, engines, scripts: test
  cli/
    index.js                   # capture | commit | check | why | unreviewed | bom | report | init | keep | until
    lib/                       # notes.js, session.js, classify.js, refs.js, review.js, html.js (small modules)
    test/                      # node:test, fixtures with a tiny git repo
  bob/                         # copied into a target repo's .bob/ by init
    settings.json              # hooks
    custom_modes.yaml          # whyline-remover
    rules-whyline-remover/01-evidence.md
    skills/whyline-remove/SKILL.md
    commands/whyline-check.md
  claude/hooks/hooks.json      # stretch, same command
  demo/                        # the seeded demo repo used in the video
  bob_sessions/                # hackathon evidence PNGs
  README.md
```

Install for a user: `npx whyline init` inside a repo. It copies `bob/` into `.bob/` (merging hooks into an existing settings.json), installs `.git/hooks/pre-commit`, `post-merge` and `pre-push`, and prints "commit .bob/ so your team gets the hooks". No marketplace, no global install.

## 7. Hook-level design, from the real payloads

| Event | Hook does | Cost |
|---|---|---|
| UserPromptSubmit | Append `{session_id, ts, prompt}` to session.jsonl if that session has no prompt yet | 0 |
| PostToolUse, matcher `write_file|apply_diff|insert_content|search_and_replace` | write_file: record path, line count, content hash. apply_diff: parse the unified patch in tool_response for exact ranges. Append `{session_id, tool, file, ranges, hash}` | 0 |
| SessionStart | Print one line: "ledger: N items due, M files unreviewed". Bob injects it into context (proven) | 0 |
| git pre-commit | For each staged file with pending ranges: compare content hash → ai / ai-edited / human. Classify temporary by rules. Write the note on the commit (post-commit does the actual `git notes add` since the commit id exists only then) | 0 |
| git post-merge | fetch notes ref, run `whyline check` | 0 |
| PreToolUse on execute_command matching `git push` (stretch) | Exit 2 with a reason when unreviewed AI lines exceed the threshold | 0 |
| Bob mode whyline-remover | Reads `whyline check --json`, gathers evidence (references, tests, Bob findings), proposes the diff, ends in Bob's approval prompt | Bobcoins, about 0.5 to 1 per removal |

## 8. What remains uncertain

1. Bob IDE specifics (not installed here): where the IDE writes its task database and per-task cost; whether the IDE writes its own git notes and on which ref; the plugins/ folder in the IDE. Test in hour 0 on a teammate's machine.
2. Whether `bob run` honours workspace hooks. Not needed: the demo uses the IDE and `bob chat`.
3. Squash merges drop git notes. Documented limitation.

## 9. First checks in the IDE

1. Open the demo repo in Bob IDE on the hackathon account. Run one tiny task. Confirm hooklog files appear and the Tasks list shows the cost.
2. Run `git notes --ref` listing after a commit made with Bob's commit button to see whether the IDE writes attribution notes and where.
3. Confirm `/whyline-remover` appears as a slash command and the skill loads.
4. Take the first bob_sessions screenshot.


## 10. Bob IDE results (26 Sep 2026, 2:22 pm PKT, task "add a cart module")

- Hooks fire in Bob IDE 2.2 with the same payload shape as Bob Shell: UserPromptSubmit, PostToolUse write_file (path, content, line_count) and apply_diff (path, diff; tool_response carries the `<patch>` block). Raw payloads saved as cli/test/fixtures/bob-ide-payloads.json.
- The IDE and the Shell share `~/.bob/db/bob.db` (IDE log: "Task store opened /Users/.../.bob/db/bob.db"). The IDE keeps rows in the write-ahead log while it runs, so the cost lookup opens with `mode=ro` first (WAL-aware) and falls back to `immutable=1`. The cart task cost 0.768 Bobcoins for 21,254 context tokens.
- `attribution_logs` stayed empty from the IDE on our machines as well ("Attribution store opened" is logged, no rows written in our runs). It is local, has no prompt, and is not shared; hooks remain the only source Whyline uses.
- Note attached by the post-commit hook, and `git log` shows it under the commit thanks to `notes.displayRef`.


## 11. Dogfood run (Bob IDE, 26 Sep 2026, 3:06 pm PKT, task05, 3.44 Bobcoins)

Bob installed Whyline on the Whyline repository and used it on its own work. `whyline why` on the skill files it wrote returns the prompt. Bob reported five issues, triaged:

1. Code written before `whyline init` has no note and shows as human. Expected; now stated in README Known limitations. A `seed` command is the planned answer.
2. Hook status lines go to stderr. By design (stdout stays empty for the agent); now documented in README.
3. Multi-edit attribution for a file edited by several apply_diff calls depends on the session lines being recorded in order, which the hook guarantees. Bob's concern was about reconstructed session data, which is not a real path. No change. `why` still falls through to "human" silently when a line is outside every range; a diagnostic is a possible improvement.
4. The classifier flagged a skill file as temporary because the prompt contained "temporary". Fixed: markdown, .bob/, docs/ and skills/ paths never become items by prompt words. Test added. The existing item on this repo was marked kept.
5. `refs/notes/whyline is invalid` warning after init until the first note. Fixed: `notes.displayRef` is now set by the first note write, not by init. Test added.
