# Adding an agent adapter

Whyline supports one agent today (IBM Bob). The code is shaped so that a second agent is one folder and one registry line. This mirrors the pattern the credible cross-agent tools use (entire.io's per-agent `HookSupport` interface, agentblame's per-agent installers, context-mode's `src/adapters/<agent>/`), because no shared cross-agent hook SDK exists (see docs/07-integration-landscape.md).

## Where things live

```
cli/lib/agents/
  index.js              registry: REGISTRY = [require('./bob')]  (add one line per agent)
  shared/
    hook-entry.sh       the shell script every adapter installs as <configDir>/hooks/whyline.sh
    install.js          copyTree, mergeHooks (idempotent by command string), copyHookEntry
  bob/
    index.js            the adapter (contract below)
    assets/             files copied into the repo's .bob/: settings.json (hooks), custom_modes.yaml, skills/, rules-*/
```

Everything else (`capture`, `commit`, `lenses`, `session`, `patch`) is agent-agnostic. It only sees normalized events and the adapter id stored on each session line.

## The contract (cli/lib/agents/index.js)

| Member | Purpose |
|---|---|
| `id`, `name`, `configDir` | `'claude-code'`, `'Claude Code'`, `'.claude'` |
| `matches(payload)` | true when a raw hook payload came from this agent. Used only when the hook command did not pass `--agent`. Must return false for `{}`. |
| `parseEvent(payload)` | raw payload to one of: `{type:'prompt', session, prompt, cwd}`, `{type:'write', session, tool, file, patch, cwd}`, `{type:'session-start'|'stop', session, cwd}`, or `null`. `patch` is unified diff text when the agent provides one, else `''` (capture then records the whole file as approximate). |
| `isWholeFileTool(tool)` | true for tools that rewrite the whole file (ranges become `[1, N]`). |
| `sessionCost(session)` | cost for a session id or `null`. Never throw. |
| `install(root)` | write the agent's config into the repo, return written paths. Must be idempotent: use `shared/install.js`. The installed hook command must pass `--agent <id>`. |
| `installedIn(root)` | true when the config is present. |

## Steps for a new agent (about 150 lines, 1 to 2 hours)

1. Capture one real payload per event from the agent (a hook that appends stdin to a file). Save them as `cli/test/fixtures/<id>-payloads.json`. This is the single most important step: field names differ per agent and per version.
2. Create `cli/lib/agents/<id>/index.js` implementing the contract. Copy `bob/index.js` and change: tool names, field names, the patch extraction, `matches`, `sessionCost`.
3. Create `cli/lib/agents/<id>/assets/` with the agent's hook config (its native shape) whose commands are `sh <configDir>/hooks/whyline.sh capture --agent <id>`.
4. Add `require('./<id>')` to `REGISTRY` in `cli/lib/agents/index.js`.
5. Add a test block to `cli/test/agents.test.js` using the fixture: detection, prompt, whole-file write, patched write, install idempotency.
6. Document the agent in README under Requirements.

## Known shapes for the next adapters (from the research in docs/03 and docs/07)

| Agent | Hook config file | Events | Write tools | Session id | Diff available? |
|---|---|---|---|---|---|
| Claude Code | `.claude/settings.json` (same JSON shape as Bob), plugin `hooks/hooks.json` | UserPromptSubmit, PreToolUse, PostToolUse, SessionStart, Stop | Write, Edit, MultiEdit, NotebookEdit; input `file_path`, `old_string`, `new_string` | UUID, payload has `transcript_path` | No unified diff in the response; compute from `old_string` and `new_string` or from file content before and after (record the pre-write hash in PreToolUse). |
| Codex CLI | `.codex/hooks.json` (Claude shape, `matcher: null`) | sessionStart, sessionEnd, preToolUse, postToolUse, beforeSubmitPrompt, stop | apply_patch style | see fixture when captured | patch text in the tool input |
| Cursor | `.cursor/hooks.json`, `{"version":1, "hooks": {...}}`, camelCase events | beforeSubmitPrompt, afterFileEdit, stop | afterFileEdit carries file path and edits | see fixture | edits list |
| OpenCode | TypeScript plugin, not JSON | file edit events | | | generated plugin file (see agentblame) |

Rulesync (1,474 stars) can also write our hook command into ten agents' native configs from one `.rulesync/hooks.json`; it is an option for the installer, not for capture.

## What not to do

- Do not special-case an agent outside its adapter folder. If `capture.js` or `commit.js` needs `if (agent === ...)`, the contract is missing a member; add the member instead.
- Do not read an agent's private database for anything except `sessionCost`. Hooks are the source of truth.
- Do not import an agent SDK. The payloads are plain JSON on stdin.
