# How well-regarded projects ship AI coding agent extensions

Research date: 26 Sep 2026. All quotes fetched via `gh api` (raw contents) or WebFetch. Star counts from `gh repo view` on the same day.

## 0. Quick verdict for AI Code Ledger

| Decision | Recommendation | Strongest evidence |
|---|---|---|
| Hook language | POSIX `sh` + `jq` for the per-tool-call capture (like IBM's own galaxium-travels Bob demo), calling a single-file Node CLI only for git hooks and reports | `IBM/galaxium-travels/.bob/hooks/record-tool.sh`: "Runs on EVERY tool call, so it has to stay cheap -- two jq passes and an append" |
| Hook declaration | `.bob/settings.json` `hooks` key, same shape as Claude Code `hooks.json`; one file works for both | Bob docs (via the-main-thread): "Bob merges configuration from ... `.bob/settings.json`"; Claude plugin `hooks/hooks.json` uses identical `{"hooks":{"PostToolUse":[{"matcher":..,"hooks":[{"type":"command",...}]}]}}` |
| State | Append-only JSONL under `.git/` for capture; git notes `refs/notes/<tool>` at commit time | agentdiff: `.git/agentdiff/session.jsonl`, `git notes --ref=agentdiff add -f -F - <commit>`; agentblame: `refs/notes/agentblame` JSON |
| CLI packaging | Single npm package, `bin` in package.json, `npx ai-code-ledger` | ccusage README line 95: `npx ccusage@latest`; codeburn README: `npx codeburn` |
| Install path | `npx ai-code-ledger init` writes `.bob/` files and git hooks (agentblame `ab init`, agentdiff `init`, entire `enable` all do exactly this) | agentblame README: "`ab init` ... sets up ... Editor hooks ... Git post-commit hook" |
| Skills | `SKILL.md` with `name` + `description` frontmatter, optional `scripts/`; same folder is readable by Bob, Claude Code and Codex | anthropics/skills `template/SKILL.md`; Codex docs: "A skill is a directory with a `SKILL.md` file plus optional scripts and references" |

---

## 1. Repo-by-repo findings

### 1.1 anthropics/claude-code (148,074 stars, license file `LICENSE.md`, `licenseInfo` null)

Layout at root: `.claude-plugin/marketplace.json`, `plugins/<name>/`.

`plugins/README.md` (fetched) documents the plugin structure:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── commands/                # Slash commands (optional)
├── agents/                  # Specialized agents (optional)
├── skills/                  # Agent Skills (optional)
├── hooks/                   # Event handlers (optional)
├── .mcp.json                # External tool configuration (optional)
└── README.md                # Plugin documentation
```

`.claude-plugin/marketplace.json` (fetched):

```json
{
  "$schema": "https://json.schemastore.org/claude-code-marketplace.json",
  "name": "claude-code-plugins",
  "version": "1.0.0",
  "owner": { "name": "Anthropic", "email": "(omitted)" },
  "plugins": [
    { "name": "agent-sdk-dev", "description": "...", "source": "./plugins/agent-sdk-dev", "category": "development" },
    ...
```

`plugins/security-guidance/.claude-plugin/plugin.json` (fetched, whole file):

```json
{
  "name": "security-guidance",
  "version": "2.0.0",
  "description": "Security review for Claude-generated code. ...",
  "author": { "name": "David Dworken", "email": "(omitted)" },
  "homepage": "https://github.com/anthropics/claude-code/tree/main/plugins/security-guidance"
}
```

Note: plugin.json does NOT list hooks; hooks are picked up from the default path `hooks/hooks.json`.

`plugins/security-guidance/hooks/hooks.json` (fetched, excerpt):

```json
{
  "description": "Security guidance plugin — pattern-based warnings on edits, git-diff-based LLM review on stop",
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/sg-python.sh\" \"${CLAUDE_PLUGIN_ROOT}/hooks/security_reminder_hook.py\""
          }
        ],
        "matcher": "Edit|Write|MultiEdit|NotebookEdit"
      },
      {
        "hooks": [
          {
            "type": "command",
            "command": "...",
            "if": "Bash(git commit:*)",
            "asyncRewake": true,
            "rewakeMessage": "Background security review of commit — ...",
            "rewakeSummary": "Commit security review found issues"
          }
        ],
        "matcher": "Bash"
      }
    ],
    "Stop": [ ... ]
  }
}
```

Hook languages used by Anthropic's own plugins:
- `hookify/hooks/hooks.json`: `"command": "python3 ${CLAUDE_PLUGIN_ROOT}/hooks/pretooluse.py", "timeout": 10` (Python, 10 s timeout on every PreToolUse/PostToolUse).
- `ralph-wiggum/hooks/hooks.json`: `"command": "${CLAUDE_PLUGIN_ROOT}/hooks/stop-hook.sh"` (bash; `stop-hook.sh` reads stdin with `HOOK_INPUT=$(cat)` and parses frontmatter with `sed`/`grep`, no jq).
- `explanatory-output-style/hooks/hooks.json`: `"command": "${CLAUDE_PLUGIN_ROOT}/hooks-handlers/session-start.sh"`.
- `security-guidance/hooks/sg-python.sh`: a bash shim whose header says "Find a working Python 3 interpreter and exec the hook with it. On Windows + Git Bash, `python3` typically resolves to the Microsoft Store stub ... exits 49 silently". Lesson: Python on Windows is a real support cost.

Official plugin manifest reference (code.claude.com/docs/en/plugins-reference, fetched):
- "Save the manifest at `.claude-plugin/plugin.json` under the plugin root. Put every other plugin file at the plugin root, not inside `.claude-plugin/`. That includes `skills/`, `commands/`, and `hooks/`."
- `hooks` field: "`hooks` takes a `.json` file path, an inline hooks object in the same shape as `hooks` in `settings.json`, or an array mixing both." and "Claude Code merges whatever you declare with `hooks/hooks.json` when that file exists."
- Standard layout table: Skills `skills/` ("One `<name>/SKILL.md` per skill"), Hooks `hooks/hooks.json`, Executables `bin/` ("Files here are on the Bash tool's `PATH` while the plugin is enabled"), Commands `commands/` ("Prefer `skills/` for new plugins").
- "`${CLAUDE_PLUGIN_ROOT}` changes when the plugin updates, so don't write state there."
- Env vars available in hook commands: `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_OPTION_<KEY>`.

Official hooks reference (code.claude.com/docs/en/hooks, fetched):
- Settings shape: `{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"${CLAUDE_PROJECT_DIR}/.claude/hooks/block-rm.sh","args":[],"timeout":600}]}]}}`
- PostToolUse stdin fields: `session_id`, `prompt_id`, `transcript_path`, `cwd`, `scratchpad_dir`, `permission_mode`, `hook_event_name`, `tool_name`, `tool_input`, `tool_use_id`, `tool_response`.
- Exit codes: "0 Success ... 2 Blocking error. Blocks the action ... Other: Non-blocking error".
- Default `command` timeout 600 s. Matcher: "`Edit|Write`" exact list, other chars are JS regex.
- "**Exec form** (when `args` present): spawns directly with no shell."

### 1.2 anthropics/skills (178,206 stars, license: mixed, README says "Many skills in this repo are open source (Apache 2.0)" and docx/pdf/pptx/xlsx are "source-available")

Layout: `skills/<name>/SKILL.md`, `spec/agent-skills-spec.md` (now just "The spec is now located at <https://agentskills.io/specification>"), `template/SKILL.md`, `.claude-plugin/marketplace.json`.

`template/SKILL.md` (whole file):

```
---
name: template-skill
description: Replace with description of the skill and when Claude should use it.
---

# Insert instructions below
```

`.claude-plugin/marketplace.json` shows a marketplace entry can list skills directly without a plugin.json:

```json
{
  "name": "document-skills",
  "source": "./",
  "strict": false,
  "skills": ["./skills/xlsx", "./skills/docx", "./skills/pptx", "./skills/pdf"]
}
```

Install (README): `/plugin marketplace add anthropics/skills` then `/plugin install document-skills@anthropic-agent-skills`.

### 1.3 ccusage/ccusage (moved from ryoppippi/ccusage; 18,740 stars; MIT per apps/ccusage/package.json)

Install (README lines 95-103): `npx ccusage@latest`, `bunx ccusage`, `pnpm dlx ccusage`, `pnpx ccusage`.

Layout: pnpm monorepo. `apps/ccusage` is "the npm surface only - bin launcher, schema artifact, packaging" (AGENTS.md). Production logic is Rust under `rust/crates` and `rust/adapters/<agent>`.

`apps/ccusage/package.json`:

```json
"bin": { "ccusage": "./src/cli.js" },
"files": [ "config-schema.json", "src/cli.js" ],
"type": "module",
"optionalDependencies": {
  "@ccusage/ccusage-darwin-arm64": "workspace:*", ...
}
```

`src/cli.js` is a 1-file Node launcher (`#!/usr/bin/env node`, `// @ts-check`, imports only `node:child_process`, `node:fs`, `node:module`) that resolves the platform native binary and spawns it. So "single JS file with zero deps as the npm entry" is the pattern even for a Rust product.

Tests: `apps/ccusage/src/cli.test.ts` uses `node:test` and `node:assert/strict` (no vitest for the launcher). Fixtures in `apps/ccusage/test/` (`test-transcript.jsonl`, `statusline-test-*.json`).

Cross-agent config in the same repo: `.agents/skills/<name>/SKILL.md` (22 skills, some with `references/` and `agents/openai.yaml`), `.claude/settings.json` (only `WorktreeCreate`/`WorktreeRemove` hooks, shell one-liners: `"command -v direnv >/dev/null 2>&1 && direnv allow"`), `.codex/environments/environment.toml`, `AGENTS.md` at root with "Skill Routing".

### 1.4 getagentseal/codeburn (11,235 stars, MIT)

Install: README "`npx codeburn`" and "To keep it: `npm install -g codeburn` or `brew install codeburn`. Needs Node.js 22.13+."

`package.json`: `"bin": {"codeburn": "dist/cli.js"}`, `"files": ["dist", ...]`, `"engines": {"node": ">=22.13.0"}`, build `tsup`, `"test": "vitest run tests ..."`. Keywords include `"ibm-bob"`; `src/providers/ibm-bob.ts` and `tests/providers/ibm-bob.test.ts` exist, so Bob session logs are already parsed by a third party.

No agent hooks: it reads session files after the fact ("CodeBurn reads those files and produces the breakdown"). State is a local cache (tests named `cache-refresh-lock*`).

### 1.5 alibaba/open-code-review (41,246 stars, Apache-2.0)

Install: `npm install -g @alibaba-group/open-code-review` gives `ocr`. Product is Go, shipped as npm plus "install script, GitHub Release binary".

Multi-agent packaging in one repo (tree fetched):
- `.claude-plugin/marketplace.json` -> `"source": "./plugins/open-code-review/claude-code"`
- `plugins/open-code-review/claude-code/.claude-plugin/plugin.json`: `{"name":"open-code-review","commands":"./commands", ...}`
- `plugins/open-code-review/.codex-plugin/plugin.json`: `"skills": "./skills/"` plus an `interface` block; `.agents/plugins/marketplace.json` for Codex
- `plugins/open-code-review/.cursor-plugin/plugin.json`: `"skills": "../skills/"`
- `.kimi-plugin/plugin.json`, `plugins/open-code-review/opencode/open-code-review.ts`
- canonical skills at `skills/open-code-review/SKILL.md` and `skills/open-code-review-delegate/SKILL.md`; the plugin copy says "This Codex plugin skill intentionally mirrors the canonical skill at `skills/open-code-review/SKILL.md`. Keep both files synchronized ... a symlink is avoided because plugin installs may only materialize the plugin subtree."
- `scripts/github-actions/check-plugin-contract.js` + `.github/workflows/plugin-contract.yml` test that the manifests stay valid.

How the skill wraps deterministic scripts (`SKILL.md`): frontmatter has `name`, `description`, `license`, `compatibility: Requires the `ocr` CLI installed`, `metadata`. Body is a numbered workflow that shells out: "`ocr review --audience agent --background "business context here" [user-args]`", "Always use `--audience agent` to suppress progress UI and emit only the final summary", "pass `--output /tmp/ocr_out.txt` and inspect the file". Delegation skill: "`ocr delegate preview --format json`", "`ocr delegate rule --format json <path1> ...`". The pattern: CLI does deterministic work and emits JSON; the skill tells the agent which commands to run and how to read the output.

### 1.6 cloudflare/security-audit-skill (21,573 stars, MIT)

Layout (full tree): `skills/security-audit/SKILL.md`, 14 reference `.md` files, `report-schema.json`, `validate-findings.cjs`, `validate-findings.test.cjs`, `validate-coverage-ledger.cjs`, `validate-coverage-ledger.test.cjs`. Nothing else but LICENSE and README.

README: "`validate-findings.cjs` | Zero-dependency validator for `findings.json`". Script header: "This is a dependency-free interpreter for the JSON Schema keywords used by report-schema.json". Uses only `require("fs")`, `require("path")`, `require("util")`.

Tests: `validate-findings.test.cjs` uses `node:test`, `node:assert/strict`, `spawnSync` to run the validator as a CLI with a 5 s timeout. No package.json, no npm install.

Install: "`npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit`" (with `--global` option). Requirements: "Node.js for the zero-dependency findings and coverage-ledger validators".

### 1.7 openai/codex (126,455 stars, Apache-2.0)

`docs/skills.md` is a one-line pointer; the real docs redirect to learn.chatgpt.com/docs/build-skills (fetched):
- Skill locations: "`$CWD/.agents/skills`", "`$REPO_ROOT/.agents/skills`", "`$HOME/.agents/skills`", "`/etc/codex/skills`".
- "A skill is a directory with a `SKILL.md` file plus optional scripts and references": `scripts/`, `references/`, `assets/`, `agents/openai.yaml`.
- Frontmatter: `name`, `description`.
- Install: "`$skill-installer linear`".

In the repo itself: `.codex/skills/<name>/SKILL.md` (11 skills), e.g. `.codex/skills/babysit-pr/` with `scripts/gh_pr_watch.py`, `scripts/test_gh_pr_watch.py`, `references/*.md`, `agents/openai.yaml` (`interface: display_name / short_description / default_prompt`). Root `AGENTS.md` holds Rust coding rules. `docs/config.md` has a "## Lifecycle hooks" section; `entireio/cli/.codex/hooks.json` shows the Codex hook file uses the Claude shape with `"matcher": null` and per-hook `timeout`.

### 1.8 IBM Bob examples (needed for our target)

`IBM/galaxium-travels` (52 stars, Apache-2.0, pushed 27 Aug 2026), an IBM-owned demo. `.bob/` tree: `custom_modes.yaml`, `hooks/*.sh` (10 files), `mcp.json`, `settings.json`, `skills/<name>/SKILL.md` (3 skills).

`.bob/settings.json` (whole file):

```json
{
  "hooks": {
    "SessionStart": [ { "hooks": [ { "type": "command", "command": "sh .bob/hooks/preflight.sh", "timeout": 15 } ] } ],
    "UserPromptSubmit": [ { "hooks": [
        { "type": "command", "command": "sh .bob/hooks/inject-pending.sh", "timeout": 10 },
        { "type": "command", "command": "sh .bob/hooks/record-prompt.sh", "timeout": 10 } ] } ],
    "PreToolUse": [ { "matcher": "^execute_command$", "hooks": [ { "type": "command", "command": "sh .bob/hooks/gate-commit.sh", "timeout": 60 } ] } ],
    "PostToolUse": [
      { "hooks": [ { "type": "command", "command": "sh .bob/hooks/record-tool.sh", "timeout": 10 } ] },
      { "matcher": "write_file|apply_diff|search_and_replace|insert_content", "hooks": [ { "type": "command", "command": "sh .bob/hooks/mypy-check.sh", "timeout": 30 } ] }
    ],
    "Stop": [ { "hooks": [ { "type": "command", "command": "sh .bob/hooks/session-receipt.sh", "timeout": 10 } ] } ]
  }
}
```

`.bob/hooks/record-tool.sh` (POSIX sh + jq), key lines:

```sh
# Runs on EVERY tool call, so it has to stay cheap -- two jq passes and an
# append, no subprocess spawning per field.
. "$(dirname "$0")/lib-journal.sh"
input=$(cat)
sid=$(printf '%s'  "$input" | jq -r '.session_id // "unknown"')
tool=$(printf '%s' "$input" | jq -r '.tool // .tool_name // "unknown"')
path=$(printf '%s' "$input" | jq -r '.input.path // .tool_input.path // empty')
output=$(printf '%s' "$input" | jq -r '.output // .tool_response // ""')
case "$tool" in
  write_file|apply_diff|search_and_replace|insert_content) is_write=true ;;
  *) is_write=false ;;
esac
...
journal_add "$sid" "$entry"
exit 0
```

`.bob/hooks/lib-journal.sh`: "Each appends one JSON object per line to state/session-<id>.jsonl, and Stop renders the whole thing." and `journal_add() { printf '%s\n' "$2" >> "$(journal_for "$1")"; }`. State dir: `${hook_root}/.bob/hooks/state`.

`.bob/hooks/_dump-payload.sh`: "The docs say the tool payload is {event, session_id, tool, input}. Some builds send {tool_name, tool_input} instead. Every hook here reads both".

`.bob/hooks/gate-commit.sh`: "`matcher` only regexes the TOOL NAME, so this runs on every shell call and self-filters on the command. Keep the cheap exit first." Blocks with `exit 2`.

Bob hook facts from the-main-thread.com article (fetched; official docs page returned 404 for me):
- "Bob merges configuration from two locations: `~/.bob/settings/settings.json` (global) and `.bob/settings.json` (project-level)."
- Five events: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`.
- Payload: "The IBM documented format uses: `event`, `tool`, `input`, while the stable 2.0.2 runtime sends: `hook_event_name`, `tool_name`, `tool_input`, plus `session_id`, `cwd`, `tool_use_id`."
- "Exit code 2: Blocks the operation at `UserPromptSubmit` or `PreToolUse`; non-blocking at `PostToolUse` and `Stop`". "Bob uses a 10-second timeout by default."
- Edit tools: `write_file`, `apply_diff`, `search_and_replace`, `insert_content`.
- Second-hand from search snippet (rulesync issue #3011): "command hooks only, and the matcher is honored only on PreToolUse and PostToolUse."

Custom modes (bob.ibm.com/docs/ide/configuration/custom-modes, fetched):
- "Global modes: `~/.bob/settings/custom_modes.yaml`", "Project modes: `.bob/custom_modes.yaml`".
- Example:

```yaml
customModes:
  - slug: docs-writer
    name: 📝 Documentation Writer
    description: Writes and revises Markdown documentation.
    roleDefinition: You are a technical writer specializing in clear documentation.
    whenToUse: Use this mode for writing and editing documentation.
    customInstructions: Focus on clarity and completeness in documentation.
    groups:
      - read
      - - edit
        - fileRegex: ".*\\.(md|mdx)$"
          description: Markdown files only
      - skill
```

- "Create a `.bob/rules-{mode-slug}/` directory in your project root (or a `.bobrules-{mode-slug}` file)." Files "loaded alphabetically and combined with the `customInstructions` property".

Real-world examples with the same schema: `IBM/ibmi-mcp-server/.bob/custom_modes.yaml` (`groups: [read, edit, browser, command, mcp]`), `carbon-design-system/carbon/.bob/custom_modes.yaml` (read-only `bug-triage` mode, `groups: [read, browser]`), `IBM/galaxium-travels/.bob/custom_modes.yaml` (uses `groups: [read, execute, skill]` and `- - edit / - fileRegex: "scripts/.*"`).

Bob skills: galaxium uses `.bob/skills/verify/SKILL.md` with the same `name`/`description` frontmatter as Anthropic's template. codeburn already parses Bob sessions (`src/providers/ibm-bob.ts`).

### 1.9 Hooks shipped as installable packages

**entireio/cli** (5,119 stars, MIT, Go). Install: `brew install --cask entireio/tap/entire`, `curl -fsSL https://entire.io/install.sh | bash`, Scoop, `go install`. Then `cd your-project && entire enable`.

Hook declaration: writes into `.claude/settings.json`, `.codex/hooks.json`, `.cursor/hooks.json`. Every hook is the same guarded one-liner:

```json
{ "type": "command", "command": "sh -c 'if ! command -v entire >/dev/null 2>&1; then exit 0; fi; exec entire hooks claude-code stop'" }
```

`.codex/hooks.json` uses `"matcher": null` and `"timeout": 30` (SessionEnd `"timeout": 3`). `.cursor/hooks.json` uses camelCase events (`beforeSubmitPrompt`, `afterFileEdit`...) with `{"command": ...}` objects and `"version": 1`.

Notably it does NOT hook PostToolUse for edits in Claude Code; it hooks `Stop` and reads the transcript: "Extracts **modified files** by scanning for Write/Edit tool uses in the transcript." (docs/architecture/claude-hooks-integration.md).

State: `.entire/current_session`, `.git/entire-sessions/<session-id>.json`, `.entire/metadata/<session-id>/full.jsonl`; durable copy in `refs/entire/checkpoints/<shard>/<id>`; commit trailers `Entire-Checkpoint: a3b2c4d5e6f7` and `Entire-Attribution: 73% agent (146/200 lines)` (docs/architecture/attribution.md).

Perf lesson (docs/architecture/commit-hook-perf-analysis.md): "Control commit (no Entire) is ~25-30ms", their hooks added "~73ms per session at 100" sessions, "PostCommit dominates overwhelmingly". Git hooks that scan per-session state scale badly; keep commit-time work O(staged files).

**mesa-dot-dev/agentblame** (101 stars, Apache-2.0, TypeScript on Bun). Install: `bunx @mesadev/agentblame@latest setup` then `ab init` per repo; "Prerequisites: Bun runtime (required for hooks)". `packages/cli/package.json`: `"engines": {"bun": ">=1.0.0"}`, `"bin": {"agentblame": "./dist/index.js"}`, one runtime dep (`diff`).

Hook command (`lib/hooks.ts` line 58): ``command -v bunx >/dev/null 2>&1 && bunx @mesadev/agentblame capture --provider ${provider}${eventArg} 2>/dev/null || true``. Claude hooks: PreToolUse per file tool (`matcher: toolName`) and `PostToolUse` with `matcher: ".*"` and `async: true` (lines 318-332). Cursor: `.cursor/hooks.json` `afterFileEdit`.

State: "Database is stored globally at ~/.agentblame/agentblame.db" using `bun:sqlite` (`lib/database.ts`); working log `snapshots.jsonl`; git blobs for before/after (`ToolCall.beforeBlob/afterBlob`). Commit-time attribution goes to git notes (see section 5). Tests: `packages/cli/tests/attribution.test.ts`, `delta.test.ts` (bun test).

**codeprakhar25/agentdiff** (45 stars, MIT/Apache-2.0, Rust + Python capture scripts). Install: `curl -fsSL https://agentdiff.site/install | sh`; "Requirements: Python 3.7+ on PATH, Git 2.20+". `agentdiff configure` (global hooks) + `agentdiff init` (per repo: "Installs git `pre-commit`, `post-commit`, and `pre-push` hooks").

Claude hook (src/configure/claude.rs lines 26-35): `PostToolUse`, `"matcher": "Edit|Write|MultiEdit"`, `"command": format!("python3 {}", capture_script.display())`. Capture script `scripts/capture-claude.py`: "Writes to <repo>/.git/agentdiff/session.jsonl only when agentdiff init has been run ... Exits silently otherwise." Tests: `scripts/tests/test_capture_*.py`, `scripts/e2e-test.sh`.

**GowayLee/cchooks** (132 stars, MIT): Python SDK, `pip install cchooks`. Shows hooks as `#!/usr/bin/env python3` scripts reading stdin JSON; `c.output.exit_deny(...)`. Small audience; confirms Python hooks are a niche, not the mainstream.

**jarrodwatts/claude-hud** (28,167 stars, MIT): a Claude Code plugin distributed via marketplace: `/plugin marketplace add jarrodwatts/claude-hud`, `/plugin install claude-hud`, also `claude plugin marketplace add ...` from a shell. `.claude-plugin/plugin.json` lists `commands`; `package.json` has `"engines": {"node": ">=18.0.0"}`, only devDependencies, `"test": "npm run build && node --test"`. Statusline command is `node dist/index.js` fed JSON on stdin. Keeps state in `~/.claude/plugins/claude-hud/` (`daily-cost.json`).

**vercel-labs/skills** (32,472 stars, MIT): the `npx skills add <repo> --skill <name> [-a claude-code -a codex] [--global] [--copy]` installer used by Cloudflare. "Symlink (Recommended): Creates symlinks from each agent to a canonical copy." This is the de facto cross-agent skill installer.

### 1.10 Other searched repos (for stars context)

Search `claude code hooks`: mksglu/context-mode 24,059; diet103/claude-code-infrastructure-showcase 10,030; entireio/cli 5,119; disler/claude-code-hooks-mastery 3,927. Search `ai attribution git`: mesa-dot-dev/agentblame 101; codeprakhar25/agentdiff 45; block/aittributor 6; ujjalsharma100/agent-trace-cli 10. Search `codeburn`: getagentseal/codeburn 11,235.

---

## 2. Comparison table

| Repo | Stars | License | Install | Hook language | Hooks declared in | Fast/dep-free strategy | State | Tests |
|---|---|---|---|---|---|---|---|---|
| anthropics/claude-code plugins | 148k | (LICENSE.md) | `/plugin marketplace add`, `/plugin install` | python3 (hookify, security-guidance), bash (ralph, output styles) | `plugins/<p>/hooks/hooks.json` | `timeout: 10`; bash shim to find python | files under `.claude/*.local.md` | none in plugin dirs |
| anthropics/skills | 178k | Apache-2.0 / source-available | marketplace add | n/a | n/a | n/a | n/a | n/a |
| ccusage | 18.7k | MIT | `npx ccusage@latest`, `bunx` | n/a (statusline via `bunx ccusage statusline`) | user's settings.json | 1-file `cli.js`, zero deps, spawns native binary | reads agent JSONL | `node:test` + fixtures |
| codeburn | 11.2k | MIT | `npx codeburn`, `npm -g`, brew | none (reads session files) | n/a | tsup bundle; node >= 22.13 | local cache | vitest |
| alibaba/open-code-review | 41k | Apache-2.0 | `npm i -g @alibaba-group/open-code-review` | none; skills wrap CLI | n/a | Go binary | n/a | `check-plugin-contract.test.js` |
| cloudflare/security-audit-skill | 21.6k | MIT | `npx skills add ... --skill security-audit` | node `.cjs` validators | n/a | "Zero-dependency validator", only `fs/path/util` | JSON files in run dir | `node:test` `.test.cjs` next to script |
| openai/codex | 126k | Apache-2.0 | n/a | python scripts in skills | `.codex/hooks.json` (per entire) | n/a | n/a | `scripts/test_*.py` in skill |
| IBM/galaxium-travels | 52 | Apache-2.0 | copy `.bob/` | POSIX sh + jq | `.bob/settings.json` | "two jq passes and an append"; cheap exit first | `.bob/hooks/state/session-<id>.jsonl` | none |
| entireio/cli | 5.1k | MIT | brew / curl / scoop / go install; `entire enable` | Go binary via `sh -c` guard | `.claude/settings.json`, `.codex/hooks.json`, `.cursor/hooks.json` | `command -v entire || exit 0` guard; hooks Stop not every tool | `.git/entire-sessions/*.json`, `refs/entire/checkpoints/*`, commit trailers | Go tests, `docs_test.go` |
| agentblame | 101 | Apache-2.0 | `bunx ... setup`, `ab init` | TypeScript on Bun via `bunx` | `.claude/settings.json`, `.cursor/hooks.json` | `async: true` on PostToolUse; `|| true` | `~/.agentblame/agentblame.db` (bun:sqlite), `snapshots.jsonl`, git notes | bun tests |
| agentdiff | 45 | MIT/Apache-2.0 | curl install.sh; `configure` + `init` | python3 scripts | `~/.claude/settings.json` (global) | exits early unless `.git/agentdiff/` exists | `.git/agentdiff/session.jsonl`, `refs/agentdiff/*`, git notes | pytest + e2e sh |
| claude-hud | 28k | MIT | marketplace | node (statusline) | plugin.json commands | node >= 18, no runtime deps | `~/.claude/plugins/claude-hud/*.json` | `node --test` |

---

## 3. Answers

### Q1. Language and runtime for per-tool-call hooks

Evidence:
- IBM's own Bob demo uses POSIX `sh` + `jq` and says why: "Runs on EVERY tool call, so it has to stay cheap -- two jq passes and an append, no subprocess spawning per field" (galaxium `record-tool.sh`). Bob's default hook timeout is 10 s; galaxium sets `"timeout": 10` on record hooks.
- Anthropic's own plugins split: bash for trivial hooks (ralph `stop-hook.sh`, session-start.sh), python3 for logic-heavy ones, but they had to ship `sg-python.sh` to work around Windows Store python stubs. That is a support cost you do not want in 48 h.
- Node startup is ~40 to 80 ms per invocation; cloudflare and claude-hud accept that for validators and statuslines but nobody in this set runs Node on every PostToolUse. agentblame runs `bunx` on every tool call and mitigates with `async: true` and `|| true`.
- entire avoids per-tool hooks entirely: it hooks `Stop` and parses the transcript for Write/Edit tool uses. Bob's `Stop` payload is only `{event, session_id}` (galaxium lib-journal.sh comment), so on Bob you cannot do that; you must record at PostToolUse.

Recommendation: write the capture hook as one POSIX `sh` script that uses `jq` to pull `session_id`, `tool_name|tool`, `tool_input|input` (file path) and append a single JSON line. Read both field spellings like galaxium does. Cost per call: one `jq` process. Keep everything else (git hooks, `why`, `check`, `bom`, `report`) in the Node CLI where startup does not matter. If jq must be optional, fall back to a Node one-liner but keep sh as the entry so the hook line is identical in Bob and Claude.

### Q2. Repo layout for 48 hours

Copy the patterns already seen: open-code-review (one repo, `plugins/<name>/{claude-code,...}` plus canonical `skills/`), ccusage (`apps/<cli>` with a `bin` launcher), galaxium (`.bob/` with `settings.json`, `hooks/`, `skills/`, `custom_modes.yaml`).

```
ai-code-ledger/
├── package.json                 # name ai-code-ledger, "bin": {"ai-code-ledger": "cli/index.js"}, "files": ["cli","hooks","bob","claude"]
├── hooks/                       # shared, agent-neutral
│   ├── record-tool.sh           # PostToolUse capture, sh + jq, appends .git/ai-code-ledger/session.jsonl
│   ├── pre-commit.sh            # calls: node cli/index.js check --staged
│   └── post-merge.sh            # calls: node cli/index.js sync-notes
├── bob/                         # what `init` copies into <repo>/.bob/
│   ├── settings.json            # {"hooks":{"PostToolUse":[{"matcher":"write_file|apply_diff|search_and_replace|insert_content","hooks":[{"type":"command","command":"sh .bob/hooks/record-tool.sh","timeout":10}]}]}}
│   ├── custom_modes.yaml        # customModes: [ {slug: ledger-reviewer, groups: [read, command, skill]} ]
│   ├── rules-ledger-reviewer/AGENTS.md
│   └── skills/
│       ├── ledger-why/SKILL.md      # "run `ai-code-ledger why <file> --json`"
│       └── ledger-review/SKILL.md   # "run `ai-code-ledger unreviewed --json`, then ..."
├── claude/                      # Claude Code plugin root
│   ├── .claude-plugin/plugin.json
│   ├── hooks/hooks.json         # same JSON as bob/settings.json with matcher "Edit|Write|MultiEdit|NotebookEdit" and "${CLAUDE_PLUGIN_ROOT}/../hooks/record-tool.sh"
│   └── skills -> ../bob/skills  # or copy at build time (open-code-review avoids symlinks: "plugin installs may only materialize the plugin subtree")
├── .claude-plugin/marketplace.json   # {"name":"ai-code-ledger","plugins":[{"name":"ai-code-ledger","source":"./claude"}]}
├── cli/
│   ├── index.js                 # #!/usr/bin/env node, ESM, zero deps; subcommands init|why|check|unreviewed|bom|report
│   ├── lib/{ledger,notes,git}.js
│   └── *.test.js                # node:test, fixtures/ with a jsonl and a tiny git repo built in a temp dir
└── demo/                        # sample repo with a prepared .git/ai-code-ledger/session.jsonl and notes
```

Keep `skills/` canonical in one place and have `init` copy it into `.bob/skills/` and `.claude/skills/` (or `.agents/skills/` for Codex; vercel `skills` CLI and Codex both read `.agents/skills`).

### Q3. Install path

What the field does:
- CLIs: `npx <pkg>` with zero global install (ccusage, codeburn). ccusage README line 91: "You can run ccusage directly without a global installation".
- Attribution tools: a global `setup/configure` plus a per-repo `init/enable` that writes agent config and git hooks (agentblame "ab init ... Editor hooks for Cursor, Claude Code, and OpenCode; Git post-commit hook"; agentdiff "`agentdiff init` Installs git `pre-commit`, `post-commit`, and `pre-push` hooks"; entire "`entire enable`").
- Guard pattern so a teammate without the tool is not broken: entire's `sh -c 'if ! command -v entire >/dev/null 2>&1; then exit 0; fi; exec entire hooks ...'`; agentblame's `command -v bunx ... || true`.
- Plugin marketplaces are Claude-only and require the user to run `/plugin marketplace add owner/repo` then `/plugin install name@marketplace` (anthropics/skills README, claude-hud README). They do not install git hooks. Bob has no marketplace in anything I fetched; every Bob example is a checked-in `.bob/` folder.

Recommendation: `npx ai-code-ledger init` in the target repo does three things: copy `bob/` to `.bob/` (merge into existing `.bob/settings.json` `hooks` the way agentdiff's `configure/claude.rs` and agentblame `hooks.ts` merge and dedupe by command substring), copy `hooks/record-tool.sh` to `.bob/hooks/`, and install `.git/hooks/pre-commit` and `post-merge` that run `npx --no-install ai-code-ledger check` guarded with `command -v`. Tell users to commit `.bob/` so the team gets the hooks (agentblame README step 3: "Commit the generated config files so your team gets the hooks"). Optionally add `.claude-plugin/marketplace.json` so Claude users can `/plugin marketplace add <owner>/ai-code-ledger`; it costs one JSON file.

### Q4. Exact hooks.json shape to mirror for Bob

Claude plugin `hooks/hooks.json` (from security-guidance and hookify):

```json
{
  "description": "optional",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit|NotebookEdit",
        "hooks": [
          { "type": "command", "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/record-tool.sh\"", "timeout": 10 }
        ]
      }
    ]
  }
}
```

Bob `.bob/settings.json` (from galaxium, confirmed against the-main-thread article):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "write_file|apply_diff|search_and_replace|insert_content",
        "hooks": [
          { "type": "command", "command": "sh .bob/hooks/record-tool.sh", "timeout": 10 }
        ]
      }
    ]
  }
}
```

Differences to handle in one script:
- Tool names: Claude `Edit|Write|MultiEdit|NotebookEdit`; Bob `write_file|apply_diff|search_and_replace|insert_content`.
- Payload keys: Claude `tool_name`, `tool_input.file_path`, `tool_response`, `session_id`, `cwd`, `transcript_path`; Bob either `tool`/`input`/`output` or `tool_name`/`tool_input` depending on build (galaxium `_dump-payload.sh`). Use `jq '.tool_name // .tool'` and `.tool_input.file_path // .tool_input.path // .input.path`.
- Paths: Claude has `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PROJECT_DIR}`; Bob examples use paths relative to the repo (`sh .bob/hooks/...`), hooks run "from the task working directory".
- Bob supports only five events and command hooks; Claude has 30+ events and `async`, `if`, `args` fields. Use only the common subset: `type`, `command`, `timeout`, `matcher`.
- Exit 2 blocks PreToolUse in both. PostToolUse stdout is ignored in Bob ("standard output is ignored"); Claude parses JSON stdout. Do not rely on stdout.

### Q5. Prior art storing AI attribution in git notes or similar

**agentblame** (`packages/cli/src/lib/git/gitNotes.ts`): `const NOTES_REF = "refs/notes/agentblame";` and a second ref `refs/notes/agentblame-analytics` (post-merge.ts). Note body is JSON:

```js
const note = { version: 3, timestamp: attribution.timestamp, sessions, files };
// files[filePath] = [{ session: sessionId, prompt: promptId, lines: "10-14,20-22" }]
```

Sessions carry `agent` (`"cursor" | "claude" | "opencode"`), `model`, `conversationId`. README: "**Squash-Safe** - Attribution survives squash and rebase merges" via a GitHub Action (`post-merge.ts`: "Transfers git notes from PR commits to merge/squash/rebase commits").

**agentdiff**: capture line in `.git/agentdiff/session.jsonl`:

```json
{ "timestamp": "2026-03-28T10:54:00Z", "agent": "claude-code", "model": "sonnet-4-6",
  "session_id": "sess_abc123", "tool": "Edit", "file": "src/auth.rs", "lines": [17, 18, 19, 20],
  "prompt": "add auth middleware" }
```

`scripts/write-note.py` line 136: `["git", "notes", "--ref=agentdiff", "add", "-f", "-F", "-", commit_hash]` with a JSON note containing `files: [{path, tool, contributor_id, agent, model, ...}]`, `prompt_excerpt` (160 chars), `prompt_hash` (sha256), `session_ref` (sha256[:16]). Durable copy in custom refs: "`refs/agentdiff/traces/{branch}:traces.jsonl`", "`refs/agentdiff/meta:traces.jsonl`", "The `refs/agentdiff/*` namespace sits outside `refs/heads/*`, so branch protection rules never block it." Entries are ed25519-signed ("Agent Trace v0.1 format").

**entire**: commit trailers, not notes: `Entire-Checkpoint: a3b2c4d5e6f7` and `Entire-Attribution: 73% agent (146/200 lines)`; metadata under `refs/entire/checkpoints/<shard>/<id>` with `metadata.json`, `full.jsonl`, `prompt.txt`.

**block/aittributor** (6 stars, Rust): prepare-commit-msg hook that appends `Co-authored-by: Claude Code <noreply@anthropic.com>` by process-tree and breadcrumb detection. Trailer-only, no line data.

Recommendation for the ledger: capture JSONL in `.git/ai-code-ledger/session.jsonl` (agentdiff shape, plus `before_blob`/`after_blob` via `git hash-object` like agentblame), and at pre-commit write one JSON note to `refs/notes/ai-code-ledger` on the commit with `{version, files:[{path, lines, agent, model, session, prompt_hash, reviewed:false}]}`. `post-merge` fetches notes (`git fetch origin refs/notes/ai-code-ledger:refs/notes/ai-code-ledger`). `unreviewed` lists note entries with `reviewed:false`; `check` fails the commit if staged AI lines lack a review mark. Squash-merge loss of notes is a known limitation; both agentblame and agentdiff needed a CI step for it, so defer it.

---

## 4. Sources (fetched paths)

- gh api repos/anthropics/claude-code/contents/{.claude-plugin/marketplace.json, plugins/README.md, plugins/security-guidance/.claude-plugin/plugin.json, plugins/security-guidance/hooks/hooks.json, plugins/security-guidance/hooks/sg-python.sh, plugins/hookify/hooks/hooks.json, plugins/ralph-wiggum/hooks/hooks.json, plugins/ralph-wiggum/hooks/stop-hook.sh, plugins/explanatory-output-style/hooks/hooks.json}
- https://code.claude.com/docs/en/plugins-reference , https://code.claude.com/docs/en/hooks
- gh api repos/anthropics/skills/contents/{template/SKILL.md, spec/agent-skills-spec.md, .claude-plugin/marketplace.json, README.md}
- gh api repos/ccusage/ccusage/contents/{package.json, apps/ccusage/package.json, apps/ccusage/src/cli.js, apps/ccusage/src/cli.test.ts, AGENTS.md, .claude/settings.json, README.md}
- gh api repos/getagentseal/codeburn/contents/{README.md, package.json}
- gh api repos/alibaba/open-code-review/contents/{README.md, .claude-plugin/marketplace.json, .agents/plugins/marketplace.json, plugins/open-code-review/.codex-plugin/plugin.json, plugins/open-code-review/.cursor-plugin/plugin.json, plugins/open-code-review/claude-code/.claude-plugin/plugin.json, plugins/open-code-review/skills/open-code-review/SKILL.md, plugins/open-code-review/skills/open-code-review-delegate/SKILL.md}
- gh api repos/cloudflare/security-audit-skill/contents/{README.md, skills/security-audit/SKILL.md, skills/security-audit/validate-findings.cjs, skills/security-audit/validate-findings.test.cjs}
- gh api repos/openai/codex/contents/{docs/skills.md, docs/agents_md.md, docs/config.md, AGENTS.md, .codex/skills/babysit-pr/SKILL.md, .codex/skills/babysit-pr/agents/openai.yaml}; https://learn.chatgpt.com/docs/build-skills
- gh api repos/IBM/galaxium-travels/contents/.bob/{settings.json, hooks/record-tool.sh, hooks/lib-journal.sh, hooks/gate-commit.sh, hooks/_dump-payload.sh, custom_modes.yaml, skills/verify/SKILL.md}; repos/IBM/ibmi-mcp-server/contents/.bob/custom_modes.yaml; repos/carbon-design-system/carbon/contents/.bob/custom_modes.yaml; repos/Labreo/Netrani/contents/.bob/{hooks.json,settings.json}
- https://bob.ibm.com/docs/ide/configuration/custom-modes ; https://www.the-main-thread.com/p/ibm-bob-lifecycle-hooks-agentic-development (bob.ibm.com hooks page returned 404)
- gh api repos/entireio/cli/contents/{README.md, .claude/settings.json, .codex/hooks.json, .cursor/hooks.json, docs/architecture/attribution.md, docs/architecture/claude-hooks-integration.md, docs/architecture/commit-hook-perf-analysis.md, docs/architecture/sessions-and-checkpoints.md}
- gh api repos/mesa-dot-dev/agentblame/contents/{README.md, packages/cli/package.json, packages/cli/src/lib/git/gitNotes.ts, packages/cli/src/lib/hooks.ts, packages/cli/src/lib/database.ts, packages/cli/src/lib/types.ts, packages/cli/src/post-merge.ts, packages/cli/src/capture.ts}
- gh api repos/codeprakhar25/agentdiff/contents/{README.md, scripts/write-note.py, scripts/capture-claude.py, src/configure/claude.rs}
- gh api repos/block/aittributor/contents/README.md ; repos/GowayLee/cchooks/contents/README.md ; repos/jarrodwatts/claude-hud/contents/{.claude-plugin/plugin.json, package.json, README.md} ; repos/vercel-labs/skills/contents/README.md
- gh api search/repositories for: "claude code plugin", "claude code hooks", "agent skills", "codex skills", "codeburn", "cchooks", "claude-hooks", "git-ai", "ai attribution git", "aiblame", "ibm bob skills"; search/code for `filename:custom_modes.yaml`, `PostToolUse path:.bob`
