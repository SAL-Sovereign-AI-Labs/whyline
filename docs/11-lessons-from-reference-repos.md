# 11. Lessons from the reference repos

Written 26 Sep 2026 from files fetched with `gh api repos/O/R/contents/PATH` (base64 decoded) on that day. Every WHERE below is a real file path in the named repo; quoted text is copied from it, with em dashes replaced by commas. Nothing here comes from memory.

Read this once, then follow the Playbook at the end. The per-repo sections are the evidence.

---

## 1. entireio/cli (Go, 5.1k stars)

The closest product to Whyline: hooks in every agent, git-native storage, `why` and `blame` commands, attribution trailer. Also the best example of what NOT to grow into.

**LESSON: Open the README with the user's question, then five outcomes, then a Why list. No badges wall.**
WHERE: `README.md` lines 1 to 20: "Entire hooks into your Git workflow to capture AI agent sessions as you work." then "With Entire, you can:" (5 bullets: understand why code changed, recover, keep history clean, onboard, traceability) then "## Why Entire" (4 bullets).
APPLY TO WHYLINE: Keep our README's first screen to: one sentence, four questions Whyline answers, one "Why" list. Nothing else above Install.

**LESSON: The daily workflow section must say "nothing new to type".**
WHERE: `README.md` "## Typical Workflow", step 2: "Just use one of your AI agents as before. Entire runs in the background, tracking your session". Step 4 "Disable" says "Your code and commit history remain untouched."
APPLY TO WHYLINE: Our Install section already says "Then work in Bob as usual. Nothing new to type." Keep it, and add the matching promise: `whyline` never writes to the working tree.

**LESSON: A teammate without the binary must get a silent no-op, from both the agent hook and the git hook.**
WHERE: `cmd/entire/cli/agent/hook_command.go`, `WrapProductionSilentHookCommand`: `sh -c 'if ! command -v entire >/dev/null 2>&1; then exit 0; fi; exec entire hooks claude-code post-task'`. Git side in `cmd/entire/cli/strategy/hooks.go`, `gitHookCommand`: "wraps an invocation in an existence test, so a hook whose binary is missing exits cleanly instead of failing the surrounding git operation. Every prefix is guarded, there is no unguarded form." Post-commit is `post-commit 2>/dev/null || true`.
APPLY TO WHYLINE: `cli/lib/agents/shared/hook-entry.sh` already does this. Add a test that runs the installed git hook with PATH emptied and asserts exit 0 and no output.

**LESSON: Hook commands resolve the binary through PATH, never a path inside the checkout.**
WHERE: `docs/architecture/agent-integration-checklist.md`, Hook Installation: "Hook commands name the entire binary, resolved through PATH, never a path that resolves inside the working tree. A repo-relative command runs whatever the checked-out branch contains, on every agent turn, and any repo could opt its cloners into it. This is why local_dev was removed."
APPLY TO WHYLINE: Our entry script looks for `node_modules/.bin/whyline` first (repo-local). That is a repo-relative executable. Keep it (it is the npm install path the README documents) but never let the hook run `node cli/index.js` from the tree.

**LESSON: Mark the hook lines you own so reinstall can find, replace and remove them without touching user hooks.**
WHERE: `cmd/entire/cli/agent/hook_command.go`, `IsManagedHookCommand` and `DropStaleManagedHooks`: ownership is decided by the command prefix `entire hooks `; "Every agent must run this on every install, not only under --force. Without it a hook written by an older version survives alongside the freshly added one and keeps firing". Git hooks carry a marker comment line (`# %s` with `entireHookMarker`).
APPLY TO WHYLINE: `init` merges by exact command string (docs/08). Also put a `# whyline` marker line in each git hook and match on `.bob/hooks/whyline.sh` so a second `init` replaces, never duplicates.

**LESSON: Explain attribution in one trailer line a human can read, and document that it is an estimate.**
WHERE: `docs/architecture/attribution.md`: trailer `Entire-Attribution: 73% agent (146/200 lines)`; "It does not track keystrokes or exact authorship. The metrics are inferred from line diffs and hook timing." Approaches were compared in a table (blame, line hashes, position ranges, per-file pool) and the simple one chosen: "Attribution is informational, not security-critical".
APPLY TO WHYLINE: Our `ai` / `ai-edited` split is by content hash and range overlap. Write that in one paragraph in docs/05 section 2.3 with the same honesty, and never call it proof.

**LESSON: Squash is handled by reading git's own SQUASH_MSG at prepare-commit-msg; merge commits are left unlinked on purpose; amend and rebase go through post-rewrite.**
WHERE: `docs/architecture/sessions-and-checkpoints.md`, "Squashes inherit their trailers": "A commit made while git merge --squash is in progress (SQUASH_MSG present in the per-worktree git dir) contains the squashed commits' work, so every Entire-Checkpoint trailer in SQUASH_MSG is carried into the message". "Merge commits stay unlinked by design". `cmd/entire/cli/strategy/hooks.go`: post-rewrite hook "remap session linkage after amend/rebase rewrites". `docs/KNOWN_LIMITATIONS.md` lists the one case that still loses the link (`git commit --amend -m`).
APPLY TO WHYLINE: Do not build this in 30 hours. Copy the honesty instead: a "Known limitations" section in README naming squash merge, `--amend -m` and rebase as cases where notes stay on the original commits. (Git notes survive rebase only with `notes.rewriteRef`; mention that one config line.)

**LESSON: `status` has exactly three states and each one names the next command.**
WHERE: `cmd/entire/cli/status.go`: `✕ not a git repository`, `○ not set up (run entire enable to get started)`, else the settings summary plus active sessions, then a footer "Agents: run `entire agent-help` for machine-readable usage." `--json` is a separate code path.
APPLY TO WHYLINE: Add `whyline status` (cheap): hooks installed yes/no, notes ref present, N notes, N pending session lines, N items due. Each missing thing prints the command that fixes it.

**LESSON: The `why` output is a short card, not a table: line, content, who, prompt (truncated to 160), and one "Full context" command.**
WHERE: `cmd/entire/cli/attribution.go` lines 1106 to 1184: `Line 42 in src/auth.go`, the content, `Written by X · commit abc · date` for a human line, or `<tag> by <agent> · <model> · checkpoint <id> · session <id>`, `Prompt: "..."` (TruncateRunes 160), and `Full context: entire checkpoint explain <id>`. The uncommitted case has its own sentence: "This line is not committed yet, so Entire cannot attribute it."
APPLY TO WHYLINE: `whyline why` prints the same card shape, and always ends with the next command (`whyline session <id>` or `whyline check`). Uncommitted line: say so in one sentence, exit 0.

**LESSON: Command reference tables are grouped, and experimental commands are hidden from stable builds.**
WHERE: `README.md` "## Commands Reference": Setup, Sessions & Checkpoints, Account, Control Plane, Other, Experimental, each a two-column table. "Descriptions below are the commands' own summaries."
APPLY TO WHYLINE: One table, two groups: "Ask" (why, check, unreviewed, bom, session, report) and "Hooks (never typed by hand)" (capture, session-start, commit). STRETCH commands do not appear until they exist.

**LESSON: Store what the agent gave you verbatim; do not invent a universal format.**
WHERE: `docs/architecture/agent-integration-checklist.md`, "Core Principle: Native Format Preservation": "Do not create a universal transcript format in the CLI".
APPLY TO WHYLINE: Prompts go into notes verbatim (no summarising, no rewriting). Our normalised event is tiny on purpose (type, session, file, ranges, hash); anything else stays out.

Anti-patterns seen in entire (do not copy): 44 KB README; a control plane with `login`, `org`, `project`, `repo`, `cluster`, `api` commands; telemetry to Posthog on by default (`telemetry` option); two settings files plus per-clone local overrides plus 15 option keys; shadow branches that can corrupt worktree indexes (`docs/KNOWN_LIMITATIONS.md`, "Git GC Can Corrupt Worktree Indexes"); a background "zombie sweep" process spawned from a hook; optional LLM summary generation at commit time; a plugin system.

---

## 2. mesa-dot-dev/agentblame (TypeScript, Bun)

Same storage idea as ours (git notes), plus a GitHub view. Best source for the `blame` output format and for the squash story.

**LESSON: Tagline is the reviewer's benefit, then four "What it does" bullets, then a numbered Quick Start with a GIF per step.**
WHERE: `README.md`: "Know what the AI wrote. Focus your code reviews where it matters." then "## What It Does" (CLI, Browser Extension, Automatic, Squash-Safe) then "## Quick Start" 1 to 5.
APPLY TO WHYLINE: Under the title, one line on who benefits (the reviewer and the person who inherits the code). Quick Start stays numbered; one screenshot of `whyline why` and one of `whyline check`.

**LESSON: Tell the first user to commit the config, and print what teammates run at the end of init.**
WHERE: `README.md` "### 3. Commit the Config Files": "Commit the generated config files so your team gets the hooks". `packages/cli/src/index.ts` line 211: "One user runs this, commits to git, everyone benefits"; line 313: "Teammates run: bunx @mesadev/agentblame@latest setup".
APPLY TO WHYLINE: `whyline init` ends with three lines: what was written, `git add .bob && git commit`, and "Teammates: npm install -g whyline (hooks are no-ops until then)".

**LESSON: The agent hook command is one line with the guard inline and stderr silenced.**
WHERE: `packages/cli/src/lib/hooks.ts` line 58: `command -v bunx >/dev/null 2>&1 && bunx @mesadev/agentblame capture --provider ${provider} 2>/dev/null || true`. Line 51 records a real bug: "Cursor's shell has a bug where command -v bunx && ... breaks stdin piping" so Cursor gets the unguarded form.
APPLY TO WHYLINE: Same shape, but ours lives in one shell file so we can fix it once. Keep the comment habit: when an agent needs a special case, write the bug in a comment above it.

**LESSON: The git post-commit hook does the work, pushes the notes ref, and adds the fetch refspec so teammates get notes on `git pull`.**
WHERE: `packages/cli/src/lib/hooks.ts` lines 564 to 572: `bunx @mesadev/agentblame process HEAD 2>/dev/null || true`, then `git push origin refs/notes/agentblame:refs/notes/agentblame 2>/dev/null` and `git config --local --add remote.origin.fetch '+refs/notes/agentblame:refs/notes/agentblame'`.
APPLY TO WHYLINE: Add the fetch refspec line to `init` (one `git config --local --add`). Keep notes push in pre-push as planned, not in post-commit (a network call in post-commit slows every commit).

**LESSON: `blame` output: prompts listed once at the top with [P1] [P2] ids, then one row per line with a P column, then a summary bar.**
WHERE: `packages/cli/src/blame.ts` lines 253 to 396: header with file name and a rule, "Prompts:" block (`[P1] agent model` then the prompt truncated to 60 chars, `--verbose` for full), rows `sha author date │ P1 │ 12 │ content`, then `█░` bar and `AI: N lines (x%) │ Human: M lines (y%)`. Empty lines are excluded from the percentage (`filterNonEmptyLines`). `--json` returns the raw structure.
APPLY TO WHYLINE: If we ship a file-level view (`whyline why <file>` without a line), use this layout exactly. Exclude blank lines from percentages in `bom` too.

**LESSON: Squash merges are handled by a GitHub Action that runs after merge and moves notes to the squash commit; merge type is detected from parent count and PR number in the message.**
WHERE: `packages/cli/src/lib/hooks.ts` lines 742 to 791: workflow `on: pull_request` (closed), `if: github.event.pull_request.merged == true`, runs `bunx @mesadev/agentblame@latest post-merge` with `PR_NUMBER`, `BASE_SHA`, `HEAD_SHA`, `MERGE_SHA`. `packages/cli/src/post-merge.ts` `detectMergeType`: more than one parent = merge commit ("notes survive automatically on original commits"); single parent whose message contains `#<PR>` or the PR title = squash; else rebase. `ab sync` (`packages/cli/src/sync.ts`) does the same locally over the last 20 commits.
APPLY TO WHYLINE: Not in scope for the hackathon. Write the limitation and say "a post-merge workflow is the known fix (agentblame does this)".

**LESSON: The troubleshooting table maps symptom to one command.**
WHERE: `README.md` "## Troubleshooting": "Hooks not capturing | Restart your editor; run ab debug", "Notes not on GitHub | Run git push origin refs/notes/agentblame".
APPLY TO WHYLINE: Add the same four-row table: hook not firing, no note on commit, notes missing after clone, check says nothing.

Anti-patterns seen in agentblame: a required Bun runtime and a global SQLite database (`setup` "wipes existing data"); a shell alias written into your profile; a browser extension that needs a GitHub token; a background self-update (`nohup bunx ... --version &`) inside the git hook; "TODO: Add screenshot" left in the README; a second notes ref for analytics.

---

## 3. codeprakhar25/agentdiff (Rust + Python)

The most complete "provenance" README and the clearest privacy section. Also the most over-built.

**LESSON: Show real output before the install command.**
WHERE: `README.md` lines 1 to 30: title, one bold paragraph, then a fenced `agentdiff list` table (COMMIT, TIME, AGENT, MODEL, FILE(S), LINES, TRUST, PROMPT) before "## Install".
APPLY TO WHYLINE: Put a real `whyline why` card and a real `whyline check` table in the README right after the first paragraph, copied from the demo repo, not typed by hand.

**LESSON: A "where this fits" table separates you from adjacent tools in one screen.**
WHERE: `README.md` "## Where agentdiff fits": rows for AI content detection (Copyleaks), supply-chain provenance (SLSA, SBOM), code quality (SonarQube), usage analytics; each with "vs agentdiff". "Provenance proves, detection guesses."
APPLY TO WHYLINE: One five-row table: git blame, AI detectors, SBOM tools, usage dashboards (ccusage, codeburn), attribution tools (entire, agentblame). Our row: "the prompt and the removal condition, per line, in git notes".

**LESSON: Privacy section = what is captured, where it is stored, who can see it, the off switch, "no external telemetry".**
WHERE: `README.md` "## Data & Privacy": bullet list of fields; "Locally: .git/agentdiff/session.jsonl (not committed)"; "Once pushed, prompt excerpts are accessible to anyone with read access to the repository"; `agentdiff config set capture_prompts false`; "No external telemetry. agentdiff does not send data to any server outside your own GitHub repository."
APPLY TO WHYLINE: Expand our "Private by design" to those five items. The off switch for us is `--no-prompt` on the hook command (STRETCH) or simply documenting "delete refs/notes/whyline".

**LESSON: A Debugging section that says exactly which file to cat and which env var to set.**
WHERE: `README.md` "## Debugging": `export AGENTDIFF_DEBUG=1`, `tail -f ~/.agentdiff/logs/capture-claude.log`, `cat .git/agentdiff/session.jsonl`, `agentdiff status`.
APPLY TO WHYLINE: README gets: `WHYLINE_DEBUG=1`, `cat .git/whyline/session.jsonl`, `cat .git/whyline/capture.log`, `git notes --ref whyline show HEAD`.

**LESSON: The capture event is a flat JSON line with eight fields; the session buffer lives in `.git/`.**
WHERE: `README.md` "How It Works" step 3: `{"timestamp","agent","model","session_id","tool","file","lines":[17,18,19,20],"prompt"}` written to `<repo>/.git/agentdiff/session.jsonl`.
APPLY TO WHYLINE: Ours matches (docs/05 section 2.2) except we store ranges, not line arrays. Keep ranges; they are smaller and diff-friendly.

**LESSON: Attribution invariants are written down as rules, in the agent instructions file, not just in code.**
WHERE: `CLAUDE.md` "## Attribution invariants": "Files with no session evidence, agent = human, must be explicit in attribution dict"; "contributor.type = human iff file_agent == human, never infer from tool name".
APPLY TO WHYLINE: Add an "Invariants" list to AGENTS.md: human lines are absent from notes, never written; `ai-edited` needs an overlapping agent write and a changed hash; an item is due only when `check` says so.

**LESSON: A skill tells the agent when to use it, the exact commands, and what NOT to conclude.**
WHERE: `templates/skills/agentdiff-context/SKILL.md`: "## When To Use", "## Workflow" with `agentdiff context path --json`, "## Rules": "Do not treat AgentDiff attribution as proof of correctness. It is context for review, not validation."; "If agentdiff context returns no traces, say so and continue"; "If context conflicts with code reality, trust the code and mention the mismatch."; "## Output Guidance" with a five-line template.
APPLY TO WHYLINE: `whyline-check` and `whyline-remove` skills get the same four headings. Copy the "if the CLI returns nothing, say so" and "trust the code over the note" rules word for word.

**LESSON: Simple blame rows: number, agent, content, tool in brackets.**
WHERE: `README.md` details "agentdiff blame src/main.rs": `3  claude-code   let config = Config::load()?;  (Edit)`.
APPLY TO WHYLINE: If we print per-line rows, this is the minimum and it is enough.

Anti-patterns seen in agentdiff: three runtimes (Rust binary, Python capture scripts, Node for install); ed25519 signing, key registry and rotation; an MCP server; a "trust score" the agent reports about itself (AI as source of truth); three storage tiers plus CI consolidation; a policy engine; `configure` editing your `AGENTS.md`; 20 top-level commands; global hooks that silently do nothing until per-repo `init`.

---

## 4. IBM/galaxium-travels (IBM's own Bob demo repo)

This is what IBM's Bob team ships as "how a Bob project looks". Copy its shapes literally.

**LESSON: `.bob/settings.json` hooks call `sh .bob/hooks/<name>.sh` with a timeout, and matchers are regexes on the tool name.**
WHERE: `.bob/settings.json`: `"command": "sh .bob/hooks/preflight.sh", "timeout": 15`; PreToolUse `"matcher": "^execute_command$"`; PostToolUse `"matcher": "write_file|apply_diff|search_and_replace|insert_content"`; Stop hook for the receipt.
APPLY TO WHYLINE: Our installed settings.json already uses this shape (docs/05 section 4.1). Keep timeouts at 5 for capture, and use the same four-tool matcher string.

**LESSON: Every hook script starts with a comment naming the event and what its stdout does.**
WHERE: `.bob/hooks/record-prompt.sh`: "UserPromptSubmit stdout is injected into the model's context, so anything echoed here is fed back to Bob as if it were session information. Recording is a side effect; the receipt reads it later." `.bob/hooks/record-tool.sh`: "PostToolUse stdout is discarded". `.bob/hooks/preflight.sh`: "Stdout from SessionStart IS injected into the model's context". `.bob/hooks/session-receipt.sh`: "Non-blocking by contract: exit 2 is ignored, the session has already ended."
APPLY TO WHYLINE: `capture` must print nothing on UserPromptSubmit and PostToolUse. `session-start` is the only hook allowed to print, and only one line. Put these facts as the first comment in `hook-entry.sh` and in `cli/lib/capture.js`.

**LESSON: Read both payload spellings, and keep a payload dumper for the next Bob version.**
WHERE: `.bob/hooks/record-tool.sh`: `.tool // .tool_name`, `.input.command // .tool_input.command`, `.output // .tool_response`. `demos/hooks/RUNBOOK.md`: "Verify the payload field names (once, on a new Bob version) ... temporarily add _dump-payload.sh as a PreToolUse hook".
APPLY TO WHYLINE: We already read both (docs/05 section 2.1). Ship `_dump-payload` as `whyline capture --dump` (append raw stdin to `.git/whyline/payloads.jsonl`) so a field rename on Bob's side is a one-minute fix.

**LESSON: Cheap exit first; fail open on environment problems; block with exit 2 plus a reason on stderr and the details in a state file.**
WHERE: `.bob/hooks/gate-commit.sh`: "95% of shell calls are not commits, get out before doing any work"; "Fail open: a missing venv is an environment problem, not a policy breach"; writes the full report to `.bob/hooks/state/.last-block`, prints one line to stderr, `exit 2`. The suite it gates on runs in 0.5 s: "A multi-minute blocking hook is unusable interactively".
APPLY TO WHYLINE: `capture` returns before parsing when the event is not one of ours. If we ship the push gate (STRETCH) it must run on the cached index only and exit 2 with one line.

**LESSON: Journal as JSONL per session in a state dir, render once at Stop.**
WHERE: `.bob/hooks/lib-journal.sh`: "Appending a line at a time keeps this safe against a session that never reaches Stop"; `journal_add` is a `printf >>`. `.bob/hooks/session-receipt.sh` renders totals, prompts, tool calls (capped at 25), files written, blocks, verdict.
APPLY TO WHYLINE: Same design as our `session.jsonl`. Copy the truncation rule too: cut long strings and mark the cut so nothing "looks silently complete".

**LESSON: Custom modes are declared with slug, name, roleDefinition, whenToUse, description, groups, and edit scope by fileRegex.**
WHERE: `.bob/custom_modes.yaml` (commented example): `groups: [read, execute, skill, [edit, {fileRegex: "scripts/.*"}]]`; `whenToUse: Use when working on deployment scripts ... Scoped exclusively to the scripts/ directory.`
APPLY TO WHYLINE: `whyline-remover` mode gets `whenToUse` in the same voice and an edit scope regex if the item's files are known (or leave `edit` unscoped and rely on the rule file). Keep the roleDefinition to what the mode must never do.

**LESSON: A skill's description carries the trigger phrases, and the body says "execute, do not describe" and "tell the user which step you skipped and why".**
WHERE: `.bob/skills/verify/SKILL.md` frontmatter: "Use after every implementation. Use when the user asks to verify, validate, run tests, check lint, or confirm that changes are correct". Body: "Always execute commands directly, do not just describe what to run"; "Always tell the user which suites you are running and why". `.bob/skills/grill-me/SKILL.md` is five lines and still a skill.
APPLY TO WHYLINE: `whyline-check` skill description: "Use when the user asks what is due, what temporary code exists, what can be removed, or types /whyline-check". Body stays under 10 lines.

**LESSON: AGENTS.md says which rules are enforced by hooks, and the demo runbook is written as acts with the prompt to type, what happens, and what to say.**
WHERE: `AGENTS.md` Footguns: "Some of the rules above are enforced by lifecycle hooks, not just documented, see .bob/settings.json". `demos/hooks/RUNBOOK.md`: "Tagline: AGENTS.md is a hope. Hooks are a fact." "Runtime: ~12 minutes." Acts table; per act a blockquoted prompt, "What happens", "Say:". Prerequisites: "Verify the gate will pass before you present. This must be green, or every commit in the demo is blocked". A `reset.sh` restores the demo state.
APPLY TO WHYLINE: Write `demo/RUNBOOK.md` in exactly this form: tagline, runtime under 3 minutes, five acts (write with Bob, commit, why, check after merge, remove in Bob), each with the prompt, what happens, what to say. Add `demo/reset.sh`.

Anti-patterns seen in galaxium: none that matter for us. Note only that a Stop-time receipt is a nice extra, not a core feature; we do not need one.

---

## 5. anthropics/claude-code plugins (hookify, security-guidance, ralph-wiggum)

Reference for command and skill text. Note: the flags `user-invocable` and `disable-model-invocation` named in the task were not present in any file fetched from these three plugins; the flag they do use is `hide-from-slash-command-tool`.

**LESSON: Command files are markdown with frontmatter: description, argument-hint, allowed-tools scoped to exact scripts.**
WHERE: `plugins/ralph-wiggum/commands/ralph-loop.md`: `allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh:*)"]`, `hide-from-slash-command-tool: "true"`, `argument-hint: "PROMPT [--max-iterations N] ..."`. `plugins/hookify/commands/hookify.md`: `allowed-tools: ["Read", "Write", "AskUserQuestion", "Task", "Grep", "TodoWrite", "Skill"]`.
APPLY TO WHYLINE: If we ship a Claude Code adapter (STRETCH), `/whyline-check` is a command file whose allowed-tools is `["Bash(whyline check:*)"]` and nothing else.

**LESSON: A command can run the CLI before the agent reads anything, by a `!` fenced block, and then tell the agent the one rule that matters.**
WHERE: `plugins/ralph-wiggum/commands/ralph-loop.md`: a fenced block tagged `!` runs `"${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh" $ARGUMENTS`; then "CRITICAL RULE: If a completion promise is set, you may ONLY output it when the statement is completely and unequivocally TRUE."
APPLY TO WHYLINE: `whyline-check` skill: run `whyline check --json` first, then one rule: "Do not edit anything. Summarise the JSON in one table."

**LESSON: Deterministic checks are written as numbered steps with the exact command and the exact expected strings.**
WHERE: `plugins/ralph-wiggum/commands/cancel-ralph.md`: step 1 `test -f .claude/ralph-loop.local.md && echo "EXISTS" || echo "NOT_FOUND"`; step 2 "If NOT_FOUND: Say 'No active Ralph loop found.'"; step 3 read the file, remove it, "Report: Cancelled Ralph loop (was at iteration N)".
APPLY TO WHYLINE: `whyline-remove` skill steps use the same pattern: the command, the string to look for, the sentence to say. Our current draft (docs/05 section 6.3) is close; add the expected strings.

**LESSON: "Load the skill first" is the first line of the command; the skill holds the format, the command holds the flow.**
WHERE: `plugins/hookify/commands/hookify.md`: "FIRST: Load the hookify:writing-rules skill using the Skill tool to understand rule file format and syntax." The skill `plugins/hookify/skills/writing-rules/SKILL.md` has a description listing trigger phrases: 'create a hookify rule', 'write a hook rule', 'configure hookify'.
APPLY TO WHYLINE: Mode `customInstructions` says "Load the whyline-remove skill and follow it exactly" (already in docs/05). Keep the flow in the mode and the procedure in the skill; do not duplicate.

**LESSON: hooks.json carries a description field and a per-hook timeout; matchers are pipe lists of tool names.**
WHERE: `plugins/hookify/hooks/hooks.json`: `"description": "Hookify plugin - User-configurable hooks from .local.md files"`, `"timeout": 10`. `plugins/security-guidance/hooks/hooks.json`: `"matcher": "Edit|Write|MultiEdit|NotebookEdit"`, and Bash hooks gated with `"if": "Bash(git commit:*)"`.
APPLY TO WHYLINE: Our Claude Code adapter asset (STRETCH) uses matcher `Edit|Write|MultiEdit|NotebookEdit`. Bob asset keeps the four Bob tool names.

**LESSON: "No restart needed" is a feature worth one bold line, and the troubleshooting list is numbered checks.**
WHERE: `plugins/hookify/README.md`: "**No restart needed!** Rules take effect on the very next tool use." Troubleshooting: "1. Check rule file exists in .claude/ ... 2. Verify enabled: true ... 5. Try /hookify:list".
APPLY TO WHYLINE: After `whyline init`, Bob IDE needs a restart to pick up `.bob/settings.json` (verify on the hackathon account, hour 0). Whatever the answer, print it as the last line of `init`.

Anti-patterns seen in these plugins: `security-guidance` runs a 100 KB Python hook that calls an LLM on Stop and at `git push` (`asyncRewake`, 180 s SessionStart timeout to install an SDK): non-deterministic, slow, needs Python and network. Our hooks stay deterministic and under 200 ms.

---

## 6. alibaba/open-code-review (Go)

The source of the "delegation mode" idea: the CLI does the deterministic part, the host agent judges.

**LESSON: State the problem with general agents in three bullets and one root cause, then the split.**
WHERE: `README.md` "### The Problem with General-Purpose Agents": "Incomplete coverage", "Position drift", "Unstable quality"; "The root cause: a purely language-driven architecture lacks hard constraints on the review process." Then "### Core Design: Deterministic Engineering × Agent Hybrid": engineering does "Precise file selection", "Fine-grained rule matching"; the agent does "dynamic decisions and dynamic context retrieval".
APPLY TO WHYLINE: Our pitch paragraph: hooks and `check` are deterministic and free; Bob is used where judgement is needed (removal with evidence, answering "why"). Say "Bob never decides what is due; `whyline check` does".

**LESSON: Delegation mode = two read-only CLI calls with `--format json`, then the agent works from that output.**
WHERE: `skills/open-code-review-delegate/SKILL.md`: Step 1 `ocr delegate preview --format json`, Step 2 `ocr delegate rule --format json <paths>`, Step 3 use git for diffs, Step 4 "Create a checklist containing every reviewable_files entry ... Mark the file reviewed, or skipped with a concrete reason", Step 6 "verify that every previewed file is accounted for". "Gotchas: No LLM needed on OCR side".
APPLY TO WHYLINE: `whyline-remove` is delegation mode: `whyline check --json` gives the item and its condition result, `git grep` gives the references, the agent produces the plan and the diff. Add the checklist rule: every file in the item must end as "deleted" or "kept, because ...".

**LESSON: Tell the agent what to do when the CLI is old or the flag is unknown, and forbid inventing fields.**
WHERE: same file, "Troubleshooting CLI Version Compatibility": "If a requested preview or rule command with --format json fails specifically with unknown flag: --format, rerun it without the flag ... do not parse text output as JSON or invent missing schema fields. Do not retry without the flag for any other error; report it and stop".
APPLY TO WHYLINE: Skill rule: "If `whyline check --json` fails, print its stderr and stop. Never guess an item id."

**LESSON: Do not probe for the binary before use; run it and handle "not found".**
WHERE: `skills/open-code-review/SKILL.md` Step 2: "Do not pre-check whether ocr is installed, skip probes like command -v ocr or ocr --version. Assume the CLI is available and run the review directly; that saves a tool call on the common path."
APPLY TO WHYLINE: Skills call `whyline ...` directly. The "install it with npm install -g whyline" sentence goes in the skill's failure branch only.

**LESSON: Give the agent an output mode that suppresses UI, and a file output to avoid truncation.**
WHERE: same file: "Always use --audience agent to suppress progress UI and emit only the final summary"; "pass --output /tmp/ocr_out.txt and inspect the file in full ... instead of piping stdout through tail or head".
APPLY TO WHYLINE: `--json` is our agent mode (no ANSI, no progress). `report --out` is our file mode. Skills always pass `--json`.

**LESSON: The skill ends with the exact markdown template the agent must fill.**
WHERE: same file "## Output Format": "## Code Review Results / Files reviewed: N / Issues found: X critical ... ### Critical / - path:42 [bug] Brief description / > Recommendation".
APPLY TO WHYLINE: `whyline-remove` evidence table template lives in the skill: condition, references, tests, scanners, files, minus lines. `whyline-check` summary template: one table with id, kind, file, condition, since, reason.

Anti-patterns seen in open-code-review: main mode needs an LLM provider configured before first run; 55 KB `action.yml`; plugin folders for four different hosts (`.agents`, `.claude-plugin`, `.kimi-plugin`, `plugins/`).

---

## 7. getagentseal/codeburn and ryoppippi/ccusage (numbers for humans)

**LESSON: "The problem" is two plain paragraphs: what the existing thing tells you, what it does not, and where the data already sits.**
WHERE: `getagentseal/codeburn` `README.md` "## The problem": "Your bill gives you a month total. It does not break that down by project, by model or by task, and it does not show which part of it was wasted." then "Claude Code, Codex, Cursor and the rest each write a session file every time you use them ... CodeBurn reads those files and produces the breakdown."
APPLY TO WHYLINE: Ours: "git blame gives you a name and a date. It does not tell you the prompt, whether the code was meant to be temporary, or whether anyone reviewed it. Bob's hooks see every write; Whyline keeps the answer next to the commit."

**LESSON: One command, no account, then say what it does in three sentences.**
WHERE: codeburn `README.md` "## Sixty seconds": "npx codeburn ... There is no account and no sign-up. CodeBurn looks in the folders your tools already write to, prices every token, and prints what you spent." ccusage `README.md` "## Quick Start": `npx ccusage@latest` and nothing else.
APPLY TO WHYLINE: Quick Start is `npm install -g whyline`, `whyline init`, done. Three sentences on what happened.

**LESSON: "Private by design" is a section title, and the strongest line is what happens if the tool dies.**
WHERE: codeburn `README.md` "## Private by design": "CodeBurn reads files that are already on your disk. There is no account, no API key and no proxy in front of your agent ... if it stopped working tomorrow your tools would not notice." "## Telemetry": "The CLI sends nothing." and a "Never collected:" list.
APPLY TO WHYLINE: Add "If you uninstall Whyline, Bob and git keep working; the hooks become no-ops and the notes stay in your repo."

**LESSON: `--json` on every report; the JSON carries what the table only warns about.**
WHERE: ccusage `docs/guide/json-output.md`: "Add the --json (or -j) flag to any command"; "When a model has no known price ... Table output prints a warning on stderr; JSON output records it in the data instead, so scripts and dashboards can tell free from unknown": `totals.unpricedModels` and `"missingPricing": true`. `--no-cost` strips cost fields from both table and JSON. codeburn `docs/cli.md`: `report --format json`, `status --format json`, `doctor --json`, `models --format markdown`.
APPLY TO WHYLINE: Every read command has `--json` (already a rule). Add: when a signal is missing (no coverage file, no gh, no Bob db) the table prints "no data" and the JSON carries `"coverage": null` plus a `missing: ["coverage","reviews"]` array. Never print a zero for missing data.

**LESSON: Table conventions: right-aligned numbers, percentage next to count, one bar per row, compact mode for screenshots.**
WHERE: agentdiff `README.md` report block: `claude-code   2,741 (65%) ████████████████████`. ccusage `README.md`: "--compact: Use --compact flag to force compact table layout, perfect for screenshots and sharing"; "Automatic compact mode for narrow terminals (< 100 characters)". codeburn `README.md`: "Task means what the agent was doing ... worked out from the session itself" with "no model call anywhere".
APPLY TO WHYLINE: `bom` prints count and percent in the same cell (`312 (41%)`), one bar per row, and fits in 80 columns so the video screenshot needs no scrolling. Any classification we do (temporary kinds) is rule-based with no model call, and we say so.

**LESSON: A "manual" table points to one doc per topic instead of one long README.**
WHERE: codeburn `README.md` "## The manual": Commands, How it works, Configuration, Tools, each one row with "What is in it".
APPLY TO WHYLINE: README ends with a four-row table: docs/05 (architecture), docs/08 (adapters), demo/RUNBOOK.md (demo), docs/11 (this file).

Anti-patterns seen in codeburn and ccusage: emoji feature lists (ccusage "## Features" has 25 bullets); sponsor banners above the fold; a desktop app, menu bar, tray, MCP server and telemetry consent screen for what is at heart one command; 18 sources in the first table before the reader knows what the tool does.

---

## Anti-patterns to avoid (all repos)

1. Extra daily commands. agentblame needs `setup` per machine and `init` per repo and a terminal restart; agentdiff needs `configure`, `init`, `keys init`, `keys register`, `install-ci`. Whyline: `init` once per repo, then nothing.
2. Servers and accounts. entire has `login`, orgs and a control plane; codeburn has a desktop app and telemetry; agentdiff has an MCP server. Whyline: no process that outlives a command.
3. Config sprawl. entire: `.entire/settings.json` plus `settings.local.json` plus 15 keys; agentdiff: `~/.agentdiff/config.toml` plus `.agentdiff/policy.toml`. Whyline: zero config files; rules are an array in code.
4. AI as the source of truth. agentdiff's `trust` score and `intent` are self-reported by the agent; entire can generate summaries with an LLM at commit time; security-guidance calls an LLM on Stop. Whyline: notes are written by deterministic code from hook payloads; Bob only proposes removals and a human approves.
5. Non-deterministic or slow checks. open-code-review documents "Position drift" and "Unstable quality" as the failure mode of language-driven checks; security-guidance has a 180 s hook. Whyline: `check` is `git grep` and a date compare, under 2 s, same answer every run.
6. Network inside hooks. agentblame's post-commit pushes notes and self-updates over the network. Whyline: network only in pre-push, silenced, never blocking.
7. Runtime zoo. agentdiff needs Rust, Python and Node; agentblame needs Bun; hookify needs Python. Whyline: Node 20 and git.
8. Hidden state in home directories. agentblame's global SQLite (wiped by `setup`), agentdiff's `~/.agentdiff`. Whyline: everything is in `.git/whyline/` or `refs/notes/whyline`.
9. README that grows into a manual. entire's README is 44 KB. Whyline README stays under 120 lines; the rest is in docs/.
10. Placeholders in public docs. agentblame ships "TODO: Add screenshot". Whyline: a section exists only when its screenshot exists.

---

## Playbook (both developers, until submission)

Product (what it is and is not)
1. Whyline answers four questions from git notes: why this line, what temporary code is due, which AI code nobody reviewed, the AI bill of materials. Nothing else ships.
2. Hooks record, `whyline` decides, Bob acts, a human approves. Bob never decides what is due and never writes a note.
3. Zero config files, zero servers, zero accounts, zero network except a silenced notes push in pre-push.
4. Uninstalling Whyline leaves Bob and git working; the hooks become no-ops and the notes stay in the repo. Say this in the README.
5. Squash merge, `git commit --amend -m` and rebase are documented limitations with the known fix named (post-merge workflow, `notes.rewriteRef`), not features.

UX (CLI and the agent door)
6. `whyline init` once per repo, then nothing new to type. Its last three lines: what was written, the commit command, and what teammates run.
7. Every read command has `--json` (no ANSI, no progress); every hook command exits 0 and prints nothing, except `session-start` which prints at most one line.
8. Missing data is "no data" in tables and `null` plus a `missing` array in JSON. Never a zero.
9. `why` prints a card (line, content, origin, prompt truncated to 160, item, reviewed) and ends with the next command to run.
10. `check` and `bom` print one table under 80 columns with count and percent in the same cell; exit 2 from `check` only when something is due.
11. Every failure state names its fix in the same line: "not a git repo", "hooks not installed (run whyline init)", "no notes yet (commit once)".
12. Skills and modes call `whyline ... --json` directly, never probe for the binary first, and stop with the CLI's stderr on any error; they never guess an item id.
13. Skills have four headings: When to use (with trigger phrases in the description), Workflow (exact commands), Rules (including "trust the code over the note" and "if the CLI returns nothing, say so"), Output template.
14. The mode holds the flow, the skill holds the procedure; no text is duplicated between them.

Engineering (code, tests, hooks)
15. Hook commands are one shell file with the guard `command -v` and `|| exit 0`; a test runs it with an empty PATH and asserts exit 0 and empty output.
16. Every hook script and `capture.js` starts with a comment naming the event and what its stdout does (injected or discarded).
17. Capture reads both payload spellings (`tool_name` / `tool`, `tool_input` / `input`, `tool_response` / `output`) and ships `--dump` to record raw payloads for the next Bob version.
18. Cheap exit first: capture returns before parsing when the event is not ours; `check` runs only `git grep` and a date compare, under 2 s, same answer every run.
19. `init` is idempotent: it matches its own lines by the `.bob/hooks/whyline.sh` string and a `# whyline` marker, replaces them, and never touches user hooks. Test it twice in a row.
20. Prompts are stored verbatim; the normalised event has only type, session, file, ranges, hash. No summaries, no scores, no fields the agent reports about itself.
21. Attribution invariants live in AGENTS.md: human lines are absent from notes; `ai-edited` needs an overlapping agent write and a changed hash; blank lines are excluded from percentages.
22. Node 20, git, `node:test`, no build step, no dependency added for any reason; a module over 250 lines is split or cut.

Docs and demo
23. README order: one sentence, four questions, real output from the demo repo, Install (three lines), Ask, How it works (four steps), CLI table, Known limitations, Private by design, Troubleshooting (symptom to command), Manual table. Under 120 lines, no placeholders.
24. `demo/RUNBOOK.md` is written as acts (tagline, runtime under 3 minutes, per act: the prompt to type, what happens, what to say) with a `reset.sh`, and the gate is verified green before every run.
25. Every number, screenshot and output block in docs and the video comes from a real run on the demo repo, never typed by hand.
