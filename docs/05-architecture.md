# AI Code Ledger: low-level architecture

Version 1, 26 Sep 2026. Companion to docs/04-feasibility.md (evidence). Everything here is sized for 2 people in 48 hours. Anything marked STRETCH is not in the must list.

## 0. Principles

1. One language: Node 20+, no runtime dependencies, one npm package, `node:test`.
2. Hooks record, scripts decide, Bob acts. Every hook and git hook is deterministic and exits 0 within 2 seconds.
3. Ranges, not lines. Prompts once per session. Notes, not files.
4. Read-only report. Actions are Bob tasks or CLI commands.
5. Never guess. If a signal is missing (coverage, PR reviews), the output says "no data".

## 1. Module map

```
cli/index.js            command router, arg parsing (process.argv only), exit codes
cli/lib/git.js          run git (execFileSync), repoRoot(), head(), stagedFiles(), blame(), notesAdd/Show/List, fetch/push notes ref
cli/lib/session.js      read/append .git/ai-code-ledger/session.jsonl, group by session_id, prune after commit
cli/lib/capture.js      turn a hook payload into session lines (write_file, apply_diff, insert_content, search_and_replace)
cli/lib/patch.js        parse unified diff hunks ("@@ -a,b +c,d @@") into new-file line ranges
cli/lib/classify.js     at commit: ai / ai-edited / human per range; temporary rules; item ids
cli/lib/note.js         build, merge and validate the note JSON (schema v1); read all notes for a ref
cli/lib/refs.js         reference search for expiry: git grep for symbol and module names
cli/lib/review.js       review signals: blame authorship, gh api PR reviews and comments (optional, cached)
cli/lib/coverage.js     parse coverage.xml (Cobertura) or lcov.info into {file: Set(lines)}
cli/lib/lenses.js       why(), check(), unreviewed(), bom() over the note index
cli/lib/report.js       render the static HTML from a JSON payload (template string, no deps)
cli/lib/init.js         copy bob/ into .bob/, merge hooks, install git hooks
cli/test/*.test.js      fixtures build a temp git repo per test
```

Target size: about 1,200 lines of JavaScript in total. If a module passes 250 lines, split it or cut scope.

## 2. Data schemas

### 2.1 Hook payload (as received from Bob, verified)

```json
{"session_id":"14b88c1d…","cwd":"/repo","hook_event_name":"PostToolUse",
 "tool_name":"write_file","tool_input":{"path":"/repo/src/a.py","content":"…","line_count":4},
 "tool_response":"Created file: src/a.py …","tool_use_id":"tooluse_…"}
```
Docs show older names (event, tool, input, output). `capture` reads both: `p.tool_name ?? p.tool`, `p.tool_input ?? p.input`, `p.tool_response ?? p.output`, `p.hook_event_name ?? p.event`.

### 2.2 session.jsonl (one line per event, inside .git/ai-code-ledger/)

```json
{"t":"prompt","session":"14b88c1d","ts":"2026-09-26T00:06:02+05:00","agent":"bob","prompt":"Create hello.py …"}
{"t":"write","session":"14b88c1d","ts":"…","file":"src/a.py","tool":"write_file","ranges":[[1,4]],"hash":"sha1-of-file-content-after-write"}
{"t":"write","session":"14b88c1d","ts":"…","file":"src/a.py","tool":"apply_diff","ranges":[[6,8]],"hash":"…"}
```
Rules: paths are repo-relative with forward slashes. `hash` is `git hash-object` of the file as it exists right after the write (read from disk in the hook, not from the payload, so it is correct for every tool). Lines outside a git repo are dropped. The file is truncated after a successful commit note.

### 2.3 Git note (one per commit, ref `refs/notes/ai-code-ledger`)

```json
{"v":1,
 "sessions":{"14b88c1d":{"agent":"bob","author":"faisal-fida","ts":"…","prompt":"Create hello.py …","cost":null}},
 "ranges":[
   {"file":"src/a.py","lines":[1,4],"origin":"ai","session":"14b88c1d"},
   {"file":"src/a.py","lines":[6,8],"origin":"ai-edited","session":"14b88c1d"}],
 "items":[
   {"id":"L-0193","kind":"mock","file":"src/payments/mock_gateway.py","lines":[1,42],"session":"14b88c1d",
    "reason":"checkout demo works until payments-v2 lands","condition":{"type":"no_references","symbol":"MockGateway","module":"mock_gateway"},
    "status":"active","created":"2026-09-26"}]}
```
- `origin` values: `ai` (content identical to what the agent wrote), `ai-edited` (range still overlaps an agent write but content changed before commit), never `human` (human lines are simply absent from notes).
- `cost` is filled when readable from `~/.bob/db/bob.db` tasks.costs for that session id, else null.
- Item ids: `L-` plus a 4-digit counter stored in `refs/notes/ai-code-ledger` on an empty "meta" note attached to the root commit. Simpler alternative used if time is short: id = first 7 chars of sha1(file + lines + session).
- Item state changes (`kept`, `until`, `removed`) are recorded as a new note on the commit that made the change, with `"items":[{"id":"L-0193","status":"removed","by":"faisal-fida","reason":"…"}]`. Readers fold all notes newest-last, so the latest status wins.

### 2.4 Note index (in memory, built by every read command)

```
notes = git notes --ref ai-ledger list  → [{commit, note}]
index = { byFile: {file: [range+commit]}, sessions: {id: session+commit}, items: {id: latest item state} }
```
Built in one pass over `git log --format=%H` intersected with the notes list, so ordering is commit order. Cached to `.git/ai-code-ledger/index.json` keyed by HEAD sha (STRETCH; skip if the repo is small).

### 2.5 Temporary rules (classify.js)

A write is marked temporary when the prompt text or the file path matches any rule. Rules are a plain array in code, not config:

| kind | prompt words (case-insensitive, word boundary) | path patterns |
|---|---|---|
| mock | mock, stub, fake | `mock_`, `fake_`, `/mocks/`, `stub` |
| demo | demo, example, sample, quick script | `/examples/`, `/demo/`, `demo_`, `sample_` |
| flag | feature flag, behind a flag, toggle | `flags.yaml`, `flags.json`, `feature_flags` |
| shim | workaround, temporary, until, shim, compat, hack, TODO remove | `compat_`, `_shim`, `legacy_` |
| fixture | fixture, seed data, test data | `/fixtures/`, `seed` |

Precision control: a rule never fires on files under `tests/` for kind mock or fixture unless the prompt also says "until". The demo repo contains one permanent file with the word "sample" in a comment that must not be flagged.

Condition default: `no_references` with `symbol` = first top-level `def|class|function|const` name in the written range, `module` = file stem. Prompt phrases "until <date>" or "before <date>" set `{"type":"date","on":"YYYY-MM-DD"}` when parseable.

## 3. CLI contract

All commands run from anywhere inside the repo. Output is human text by default, JSON with `--json`. Exit 0 on success, 1 on usage error, 2 when a check finds due or blocking items (so hooks can react), 3 when not in a git repo.

| Command | Input | Output | Notes |
|---|---|---|---|
| `capture` | hook payload on stdin | nothing | Appends to session.jsonl. Always exits 0, even on bad input (logs to `.git/ai-code-ledger/capture.log`). Must finish under 200 ms. |
| `session-start` | hook payload on stdin | one line to stdout | Prints "ledger: N items due, M files unreviewed" or nothing if zero. Reads the cached index only. Exits 0 always. |
| `commit` | none (called from post-commit) | nothing | Builds and attaches the note for HEAD from staged-and-committed files versus session.jsonl. Prunes session lines for committed files. |
| `check` | `--json` | due items list | Evaluates each active item's condition. Exit 2 if any is due. |
| `why <file>:<line>` | path and line | origin, session, prompt, siblings, item, reviewed | Uses `git blame --line-porcelain` to find the commit, then the note. `--history` STRETCH. |
| `session <id>` | session id prefix | prompt, every range it wrote, cost | |
| `unreviewed` | `--json`, `--since <rev>` | table of AI ranges with no review signal, joined with coverage | |
| `bom <revA>..<revB>` | rev range, `--json` | the BOM table | Lines changed from `git diff --numstat`. |
| `report [--out file]` | none | writes `.ledger-report.html` | Embeds JSON from why-index, check, unreviewed, bom of last tag..HEAD. |
| `keep <id> "<reason>"` | item id | new note on HEAD after committing? No: writes a note on HEAD directly | Records status kept. |
| `until <id> <date>` | item id, date | same | Changes condition to date. |
| `init` | `--claude` STRETCH | files written | Copies bob/ to .bob/, merges hooks, installs git hooks, prints next steps. |
| `seed` STRETCH | none | items created from TODO/FIXME comments, flag files, examples/ | |

## 4. Hook wiring

### 4.1 .bob/settings.json (installed by init, merged if the file exists)

```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "sh .bob/hooks/ledger.sh session-start", "timeout": 5 }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "sh .bob/hooks/ledger.sh capture", "timeout": 5 }] }],
    "PostToolUse": [{ "matcher": "^(write_file|apply_diff|insert_content|search_and_replace)$",
                      "hooks": [{ "type": "command", "command": "sh .bob/hooks/ledger.sh capture", "timeout": 5 }] }]
  }
}
```

### 4.2 .bob/hooks/ledger.sh (the only shell file)

```sh
#!/bin/sh
# Bob lifecycle hook entry. Never fails the agent: any error exits 0.
command -v node >/dev/null 2>&1 || exit 0
BIN="$(git rev-parse --show-toplevel 2>/dev/null)/node_modules/.bin/ai-code-ledger"
[ -x "$BIN" ] || BIN="$(command -v ai-code-ledger)" || exit 0
exec "$BIN" "$1" 2>>"$(git rev-parse --git-dir)/ai-code-ledger/hook.err" || exit 0
```
Resolution order: repo-local install, then global. If neither exists the hook is a no-op. This is the entire.io guard pattern.

### 4.3 Git hooks (installed by init into .git/hooks, each a 3-line sh file with the same guard)

| Hook | Runs |
|---|---|
| post-commit | `ai-code-ledger commit` |
| post-merge | `git fetch origin refs/notes/ai-code-ledger:refs/notes/ai-code-ledger 2>/dev/null; ai-code-ledger check` (exit code ignored, output shown) |
| pre-push | `git push origin refs/notes/ai-code-ledger 2>/dev/null` (never blocks) |

If a hook file already exists, init appends a call instead of overwriting, and says so.

### 4.4 Push gate STRETCH

PreToolUse on `execute_command`, matcher `^execute_command$`; the CLI inspects `tool_input.command` for `git push` and exits 2 with a reason when `unreviewed --json` exceeds the threshold in `.ledger.json` (`{"gate":{"maxUnreviewedPercent":25}}`).

## 5. Algorithms

### 5.1 capture (PostToolUse)

1. Parse stdin. Ignore events other than PostToolUse and UserPromptSubmit.
2. UserPromptSubmit: append a `prompt` line if the session has none yet (first prompt is the intent; later steering prompts are appended as `prompt2..n` STRETCH).
3. PostToolUse: repo-relative `file` from `tool_input.path`. Skip if outside the repo or under `.git/`.
4. Ranges:
   - write_file: `[1, line_count]` where line_count is counted from the file on disk.
   - apply_diff, search_and_replace, insert_content: parse `tool_response` for the block after "Patch of edit:"; take every hunk `@@ -a,b +c,d @@` and record `[c, c+d-1]` for hunks with added lines. If the patch is missing, fall back to `[1, N]` and mark `"approx":true`.
5. `hash` = `git hash-object <file>`.
6. Append the line. Total work: one JSON parse, one file read, one git call.

### 5.2 commit (post-commit)

1. `files = git show --name-only --format= HEAD`.
2. For each file with pending write lines: `blob = git rev-parse HEAD:<file>`; hash of committed content.
3. For each pending range on that file:
   - If the committed hash equals the hash recorded right after the last agent write → all ranges `ai`.
   - Else compute a diff between the last agent-written content (kept as `.git/ai-code-ledger/blobs/<hash>` written by capture, STRETCH: otherwise reuse `git hash-object -w` to store it in the object database, which is what agentblame does) and the committed content; ranges that survived unchanged are `ai`, ranges that changed are `ai-edited`, ranges that disappeared are dropped.
   - Must-list simplification: without the blob store, use `git diff` between the hash object and the committed blob (`git diff <hash> HEAD:<file>`); since `git hash-object -w` stores the object, this works with one extra flag in capture. So the blob store is free: capture uses `git hash-object -w`.
4. Build sessions from prompt lines (only sessions that have at least one range in this commit).
5. Temporary classification on each `ai` range whose session prompt or file matches a rule → item with condition.
6. Cost: open `~/.bob/db/bob.db` read-only with `sqlite3` CLI if present (`sqlite3 -readonly … "select costs from tasks where id=?"`), else null. No sqlite dependency in Node.
7. `git notes --ref ai-ledger add -f -F - HEAD`.
8. Remove consumed lines from session.jsonl.

### 5.3 check

For each item with the latest status `active`:
- `date`: due when today ≥ on.
- `no_references`: `git grep -n -w <symbol> -- ':!<file>' ':!tests/**'` and `git grep -n <module> -- ':!<file>'` (import lines); due when both return nothing. For a folder item (kind demo), due when nothing outside the folder references its stem.
Output rows: id, kind, file, condition, since (first day found due, stored in `.git/ai-code-ledger/due.json`), reason.

### 5.4 why

1. `git blame -w -M -C --line-porcelain -L n,n <file>` → commit C and original file name and line.
2. Read note on C. Find the range containing the line under the original name. If none, the line is human.
3. Reviewed = any of: blame author of the line differs from the session author and the commit is later than C (human edit), a review comment on that file (review.js), a PR containing C approved by someone else (review.js).
4. Siblings = every other range in that session across notes.

### 5.5 unreviewed

Walk the note index for ranges with `origin: ai` (ai-edited counts as reviewed). For each, evaluate the three signals once per file and cache the PR lookup for 10 minutes in `.git/ai-code-ledger/gh-cache.json`. Join coverage per line. Sort by AI lines desc.

### 5.6 bom

- `changed = git diff --numstat A..B` summed.
- `ai = sum of range lengths in notes on commits in A..B`, split by `sessions[].agent`.
- reviewed and tested from the same signals as 5.5, limited to those commits.
- items shipped: items created in A..B by status.
- cost: sum of session cost where not null; report "n of m sessions had cost".

### 5.7 report

One HTML file. Template is a JS template string in report.js with `<script>const DATA = …</script>`. Views: Overview, Why (file picker limited to files with AI ranges, line table), Expiry, Unreviewed, BOM, Status. Design and copy follow ai-code-ledger-dashboard.html on the Desktop, with the mock data replaced by DATA.

## 6. Bob integration files (shipped in bob/, installed to .bob/)

### 6.1 custom_modes.yaml

```yaml
customModes:
  - slug: ledger-remover
    name: Ledger Remover
    description: Remove temporary code the AI Code Ledger says is due, with evidence and human approval.
    roleDefinition: >-
      You remove temporary code safely. You never delete without evidence and you never
      skip the approval step. You work only on items listed by `ai-code-ledger check --json`.
    whenToUse: When the user asks to remove a ledger item (for example "remove L-0193") or to clean up due temporary code.
    customInstructions: >-
      1. Run `ai-code-ledger check --json` and pick the requested item. If it is not due, stop and say so.
      2. Load the ledger-remove skill and follow it exactly.
      3. Show the evidence table and the proposed diff before editing.
      4. Apply the edit only after the user approves. Then run the test command from the skill.
      5. Finish with `ai-code-ledger keep` or a commit that records the removal, as the skill says.
    groups:
      - read
      - edit
      - execute
      - skill
```

### 6.2 rules-ledger-remover/01-evidence.md

- Evidence before edits. Every claim cites a command and its output.
- Never widen scope: only the item's files, plus a test file that tests nothing else.
- If tests fail after removal, revert and report; do not fix unrelated code.
- Never run git push.

### 6.3 skills/ledger-remove/SKILL.md

```
---
name: ledger-remove
description: Procedure to remove one due temporary item from the AI Code Ledger with evidence (references, tests, scanners) and human approval.
---
Input: an item id from `ai-code-ledger check --json`.
Steps:
1. references: run `ai-code-ledger check --json` and quote the item's condition result. Run `git grep -n -w <symbol>`; there must be no hits outside the item's files and their own tests.
2. plan: list the exact files and line ranges to delete. If a test file only tests the item, include it.
3. dry run: remove the ranges, run the project's test command (read it from package.json scripts.test, Makefile test, or pytest), record pass/fail counts.
4. scanners: if Bob Findings is available, run /review on the diff and quote any new finding.
5. present the evidence table (condition, references, tests, scanners, files, -lines) and ask for approval using the normal approval prompt.
6. after approval: keep the edit, commit with message "remove <id>: <reason>", then run `ai-code-ledger commit` is automatic via the git hook. Say which PR command to run next (/create-pr).
Never delete anything before step 5 is approved.
```

### 6.4 commands/ledger-check.md

```
---
description: List temporary code that is due for removal
---
Run `ai-code-ledger check` and summarise the due items in one table. Do not edit anything.
```

## 7. Demo repository (demo/)

A small Python Flask or FastAPI shop backend, about 30 files, with:
- 6 seeded temporary items with recovered reasons (flag, shim, demo folder, TODO hack, fixture, mock) created through real Bob sessions during the build so the notes are genuine.
- 1 control file that must never be flagged.
- A `payments-v2` branch whose merge makes the mock gateway unreferenced.
- pytest with coverage.xml committed for the demo.

## 8. Tests (node:test)

| Test | Asserts |
|---|---|
| patch.test.js | hunk parsing on the real apply_diff response captured on 26 Sep; write_file line count |
| capture.test.js | both payload spellings; outside-repo path ignored; malformed stdin exits 0 |
| commit.test.js | temp repo: agent write then commit → note with origin ai; human edit before commit → ai-edited; untouched file → no note |
| classify.test.js | each rule fires on its words and paths; control cases do not fire |
| check.test.js | no_references due after the referencing file is deleted; date due tomorrow is not due today |
| why.test.js | rename then blame resolves to the note range |
| bom.test.js | percentages add up on a 3-commit fixture |
| init.test.js | merges into an existing settings.json without dropping user hooks; idempotent |

## 9. Decisions on edge cases

| Case | Decision |
|---|---|
| Two sessions write the same range before one commit | Last write wins; earlier session recorded as `also` STRETCH, else dropped |
| File written by the agent then deleted before commit | No range recorded |
| Partial staging (some hunks not committed) | Committed content decides; ranges compare against the committed blob only |
| Renames after the note | Blame follows; the note keeps the original path |
| Squash merges | Notes on squashed commits are lost; documented limitation, same as every tool in this space |
| Binary files | Skipped by capture |
| Repo without `origin` | notes fetch and push are silent no-ops |
| Windows | Hooks run via cmd /c on Windows in Bob; ledger.sh is POSIX. Out of scope for 48 h, stated in README |
| Cost unavailable (IDE database not found) | null, reported as "n of m sessions with cost" |
