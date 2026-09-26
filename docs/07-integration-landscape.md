# Integration landscape: is there a pre-built cross-agent hook layer?

Two research passes, 26 Sep 2026. Part A: SDKs, libraries and standards. Part B: how credible multi-agent tools wire their adapters. Everything quoted was fetched from the source repos.

# Part A: SDKs, libraries, standards

# Cross-agent hook SDK research for whyline

Date: 2026-09-26. Method: `gh api search/repositories` (16 required queries plus 6 extra), `gh api repos/O/R` and `repos/O/R/readme` (base64 decoded), `gh api repos/O/R/contributors`, `npm search --json`, `npm view --json`, `https://api.npmjs.org/downloads/point/last-week/<pkg>`, `curl` of the standards sites and GitHub raw schema. Star counts, dates, download counts and quotes below are copied from that tool output. Nothing is from memory.

Target agent list for whyline: Claude Code, Codex CLI, Cursor, Gemini CLI, GitHub Copilot CLI, Windsurf, Devin, Cline, OpenCode, Aider, Kiro, Amp, Zed, IBM Bob (14).

## 1. Candidate table

"Hook layer" means the package parses or generates the agent's native hook events (SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, Stop, file edit). "Config syncer" means it only writes rules, skills, MCP or command files.

| Name | Stars | Last push | Agents supported (exact, from README or source) | Hooks | Install | Verdict for whyline |
|---|---|---|---|---|---|---|
| dyoshikawa/rulesync | 1474 | 2026-09-26 | 49 rows in README table incl. Amp, IBM Bob, Claude Code, Codex CLI, GitHub Copilot, GitHub Copilot CLI, Cursor, OpenCode, Cline, Kiro CLI, Kiro IDE, Devin Desktop, Zed. NOT present: Gemini CLI, Aider, Windsurf | Yes, but only as a config generator: canonical `.rulesync/hooks.json` is converted into each tool's native hook config file. It does not parse hook stdin at runtime. Hooks column blank for Zed | `npm install -g rulesync` (weekly dl 204,169), brew, curl installer | Useful reference for native hook file formats and event-name maps per agent. Not a runtime SDK. Would let a user install whyline's hook commands into many agents from one JSON |
| intellectronica/ruler | 2934 | 2026-09-23 | 33 rows incl. GitHub Copilot, Claude Code, Codex CLI, Cursor, Windsurf, Cline, Amp, Aider, Gemini CLI, OpenCode, Zed, Kiro. No Devin, no Bob | No. Table columns are Rules, MCP, Skills, Subagents only; zero hook targets | `npm install -g @intellectronica/ruler` (weekly dl 54,129) | Config syncer only. Not relevant to hooks |
| vercel-labs/skills | 32498 | 2026-09-18 | README: "Supports OpenCode, Claude Code, Codex, Cursor, and 75 more". Table has 71 rows incl. Bob, Claude Code, Cline, Zed, Codex, Cursor, Devin, Gemini CLI, GitHub Copilot, Kiro CLI, OpenCode, Windsurf, Amp | No. Skills installer. Its "Compatibility" matrix has one "Hooks" row meaning whether a skill bundle's hooks dir is honoured: Yes only for Claude Code, Cline, Kiro CLI | `npx skills add owner/repo` (weekly dl 7,502,699) | Skills syncer only. Registry shape is useful (see section 4). Not a hook layer |
| entireio/cli | 5121 | 2026-09-26 | `--agent`: antigravity, claude-code, codex, copilot-cli, cursor, factoryai-droid, opencode, pi. No Gemini CLI, Windsurf, Devin, Cline, Aider, Kiro, Amp, Zed, Bob | Yes, runtime. Go `HookSupport` interface per agent: `HookNames()`, `ParseHookEvent(ctx, hookName, stdin) (*Event, error)`, `InstallHooks`, `UninstallHooks`. Normalized `EventType`: SessionStart, TurnStart, TurnEnd, Compaction, SessionEnd, SubagentStart, SubagentEnd, ModelUpdate. `Event` carries `ModifiedFiles`, `NewFiles`, `DeletedFiles`, `ToolInput`, `Prompt` | `brew install --cask entireio/tap/entire` (Go binary, org-owned, 65 contributors) | Closest product analogue (captures agent sessions per commit). It is a Go CLI, not an importable Node SDK, and covers 8 agents. Study its per-agent `cmd/entire/cli/agent/<agent>/hooks.go`, do not depend on it |
| mksglu/context-mode | 24075 | 2026-09-26 | Hook adapters in `src/adapters/*/hooks.ts`: claude-code, codex, copilot-cli, cursor, gemini-cli, jetbrains-copilot, kimi, kiro, openclaw, opencode, qwen-code, vscode-copilot. README: "Antigravity IDE: MCP-only, no hooks", "Zed: MCP-only, no hooks" | Yes, runtime, but internal to the product (`context-mode hook gemini-cli beforetool`). Not exported as a library | `npm install -g context-mode` (weekly dl 18,925), Claude Code plugin marketplace | 12 internal adapters, no public API. Reference only |
| polyhook/polyhook (`@polyhook/sdk`, `polyhook` on PyPI) | 4 | 2026-09-26 | README table: Claude Code, Cursor, Windsurf, Cline, Amp, Gemini CLI, Hermes Agent, Pi supported; Aider "in progress"; Copilot "planned". No Codex, OpenCode, Kiro, Zed, Bob, Devin | Yes, runtime SDK. "detects which tool invoked your binary" and returns `HookEvent { event: "tool:before" \| "tool:after" \| "session:start" \| "session:stop" \| "agent:stop" \| "notification"; tool?; caller: "claude-code" \| "cursor" \| "windsurf" \| "cline" \| "amp" \| "gemini-cli" \| "hermes" \| "pi" \| "unknown" }` | `npm install @polyhook/sdk` v0.1.11 (weekly dl 11,105, but 4 stars and 2 contributors; created 2026-06-01; last npm publish 2026-06-18) | The only thing on npm that is literally "write hooks once, run everywhere". Too young, 4 stars, 2 people, Rust core, no Codex or OpenCode, no prompt-submit event. Not safe to depend on |
| AlexanderMattTurner/agent-control-plane-core (`agent-control-plane-core`) | 0 | 2026-09-25 | README: adapters for Claude Code, Codex, Amp, Gemini CLI (npm description). No Cursor, Copilot, Windsurf, Cline, OpenCode, Kiro, Zed, Bob, Devin, Aider | Yes, runtime. `ToolCallEvent { event: "pre_tool" \| "post_tool" \| "prompt_submit" \| "session_start" \| "unknown", ... agent, native_event }` plus `Verdict`; adapter is `{ parse, render }` | `npm i agent-control-plane-core` v0.8.1 (weekly dl 57,940 vs 0 stars: download count is not credible as adoption) | Guardrail contract, 4 agents, 0 stars, no license field. Not a dependency candidate |
| mentu-ai/mentu-hooks | 2 | 2026-08-22 | Claude Code, Codex, Cursor, Gemini (README table) | Yes, runtime, Python. Normalized events: `session_start, prompt_submit, pre_tool, post_tool, post_tool_failure, permission_request, pre_compact, post_compact, subagent_stop, stop, session_end`. Adapters in `mentu_policy/adapters/` | `git clone` + `scripts/install-agent-hooks.sh` | 2 stars, 1 contributor, Python. Reference for its capability table (Gemini "gate: no, post-hoc events") only |
| os-factory/otel-hook (`@osfactory/otel-hook`) | 5 | 2026-08-29 | claude-code, codex, cursor, gemini-cli (providers table) | Yes, runtime. "Provider adapters normalize each agent's hook protocol into a versioned canonical event model" | `npm install -g @osfactory/otel-hook` v0.3.0 (weekly dl 19) | 4 agents, 5 stars. Interesting note in README: Claude Code, Codex CLI and Gemini CLI payloads look alike, so caller detection by payload shape is ambiguous. Reference only |
| 777genius/universal-agent-plugins | 13 | 2026-09-24 | Codex/ChatGPT, Claude Code, Cursor, GitHub Copilot CLI, VS Code, Kiro, Gemini CLI, OpenCode, Cline, Windsurf (README "Supported clients") | No. Installs "Agent Plugins 1.0" packages. README: "Skills and MCP are portable components. Hooks and other client-specific extensions" are not | `brew install 777genius/agentplugins/agentplugins`, `npm install -g universal-agent-plugins` (weekly dl 239) | Plugin installer, hooks explicitly non-portable. Not relevant |
| responsibleai/agent-hooks (`@responsibleai/agent-hooks`) | 14 | 2026-09-25 | Not a coding-agent integration. "Framework-neutral agent control contract (AGENT-HOOKS-0.1)" for agent frameworks | Spec draft, no coding-agent adapters | pip from git; npm 0.1.0-alpha.2 (weekly dl 175) | Not applicable |
| caliber-ai-org/ai-setup | 1285 | 2026-09-24 | Claude Code, Cursor, Codex, OpenCode, GitHub Copilot | No agent hooks; "pre-commit hook" for context refresh only | `npx @rely-ai/caliber bootstrap` | Config/context syncer. Not relevant |
| PanisHandsome/ai-rules-sync (`@panishandsome/agentsync`) | 119 | 2026-06-03 | agents, claude, cursor, copilot, windsurf, cline, aider, gemini (rules files only) | No | `npm install -g @panishandsome/agentsync` | Rules syncer, 1 contributor. Not relevant |
| GowayLee/cchooks | 132 | 2026-04-08 | Claude Code only ("Claude Code Hook SDK for Python") | Yes, single agent | `pip install cchooks` | Single-agent, Python. Not relevant |
| disler/claude-code-hooks-multi-agent-observability | 1542 | 2026-02-08 | Claude Code only | Yes, single agent | copy `.claude/hooks/*.py` | Single-agent observability demo. Not relevant |
| lennney/stop-that-shit | 2285 | 2026-09-24 | Codex, Claude Code, OpenCode, Hermes Agent CLI, Pi | Yes, runtime, but a product (task-scope guard) with its own per-host plugins, not a library | per-host plugin install (`claude plugin install`, `codex plugin add`, `opencode plugin github:...`) | Shows the per-host plugin pattern is the norm. Not reusable |
| Yeachan-Heo/oh-my-codex | 33372 | 2026-09-26 | Codex CLI only | Codex-only workflow layer | `npm install -g oh-my-codex` | Not relevant |
| qufei1993/skills-hub | 1697 | 2026-09-26 | Claude Code, Codex, Cursor, OpenCode, Antigravity, Amp, Cline, Kiro CLI, Gemini CLI, GitHub Copilot, Windsurf and more | No, skills syncer (Tauri desktop app) | desktop app | Not relevant |
| JakeSelby/model-citizen | 21 | 2026-09-26 | Claude Code (qualified), Codex (partial); Cursor and Grok "Planned" | Yes, Claude Code hook scripts projected to Codex | `bin/citizen sync` | 1 contributor, 2 agents. Not relevant |
| `@goodfoot/agent-hooks` (goodfoot-io/marketplace) | 2 | 2026-09-23 | Claude Code, Codex, Antigravity (npm description) | Yes, "shared core runtime with per-agent entry points" | npm v1.0.11 (weekly dl 177) | 3 agents, 2 stars. Not relevant |
| `cc-hooks-ts` | n/a | 2026-09-24 | Claude Code only | Yes, single agent, TypeScript types | npm v2.1.281 (weekly dl 1,581) | Single agent |
| `opencode-claude-hooks` | n/a | 2026-02-02 | OpenCode running Claude Code hook config | Yes, one-direction shim | npm v0.1.0 (weekly dl 1,470) | Shows OpenCode is a TS plugin API, not a JSON hook file |

Search queries that returned zero repos: "normalized hook events coding agents adapters", "hook adapter claude cursor codex gemini opencode". Positive control: "claude-hooks" returned 8 repos with 3k to 10k stars, so empty results are real.

## 2. Coverage of whyline's 14 agents by any hook-capable candidate

From rulesync `src/types/hooks.ts` per-tool `*_HOOK_EVENTS` lists (native hook config exists for the agent) plus polyhook and Entire READMEs:

| Agent | Native hook config known to rulesync | Runtime SDK covering it |
|---|---|---|
| Claude Code | yes (CLAUDE_HOOK_EVENTS) | polyhook, Entire, context-mode, ACP-core, mentu, otel-hook |
| Codex CLI | yes: sessionStart, sessionEnd, preToolUse, postToolUse, beforeSubmitPrompt, stop, stopCancelled, permissionRequest, subagentStart, subagentStop, preCompact, postCompact (`.codex/hooks.json`) | Entire, context-mode, ACP-core, mentu, otel-hook. Not polyhook |
| Cursor | yes (CURSOR_HOOK_EVENTS incl. afterFileEdit) | polyhook, Entire, context-mode, mentu, otel-hook |
| Gemini CLI | no rulesync target at all (verified: 1 tree entry, a research note) | polyhook, context-mode, ACP-core, mentu (observe-only), otel-hook |
| GitHub Copilot CLI | yes (COPILOTCLI_HOOK_EVENTS, 15 events) | Entire, context-mode. polyhook "planned" |
| Windsurf | no rulesync target | polyhook only |
| Devin | yes ("Devin Desktop": sessionStart, sessionEnd, preToolUse, postToolUse, beforeSubmitPrompt, stop, permissionRequest, postCompact) | none |
| Cline | yes (CLINE_HOOK_EVENTS, 10 events) | polyhook only |
| OpenCode | yes (OPENCODE_HOOK_EVENTS incl. afterFileEdit, fileChanged), emitted as a TS plugin | Entire (TS plugin), context-mode |
| Aider | no rulesync target, no ruler hooks | polyhook "in progress" only |
| Kiro | yes (KIRO_HOOK_EVENTS: sessionStart, sessionEnd, beforeSubmitPrompt, preToolUse, postToolUse, stop) | context-mode only |
| Amp | yes (sessionStart, preToolUse, postToolUse, beforeSubmitPrompt, stop) | polyhook, ACP-core |
| Zed | hooks column blank in rulesync; context-mode "Zed: MCP-only, no hooks" | none |
| IBM Bob | yes (BOB_HOOK_EVENTS: sessionStart, beforeSubmitPrompt, preToolUse, postToolUse, preCompact, postCompact, stop) | none |

No single candidate covers more than 8 of the 14. Zed appears to have no hook system at all in any source checked. Aider has no hook target anywhere.

## 3. Standards

**Agent Client Protocol (ACP)**, github.com/zed-industries/agent-client-protocol, 4328 stars, pushed 2026-09-26. README quote: "The Agent Client Protocol (ACP) standardizes communication between _code editors_ (interactive programs for viewing and editing source code) and _coding agents_ (programs that use generative AI to autonomously modify code)." The v2 JSON schema (289,442 bytes, fetched from raw GitHub) contains zero keys matching "hook" (positive control: `tool_call` appears 8 times). Methods are `session/new`, `session/prompt`, `session/update`, `session/request_permission`, `session/cancel`, `session/close`, `session/delete`, `session/list`, `session/resume`, `session/set_config_option`, plus `fs/*` and `terminal/*`. Prompt-lifecycle page: "Agents send `session/update` notifications to report streamed content, tool activity, and changes to session state." Verdict: ACP gives a tool-call event stream, but only to the editor that hosts the agent over ACP. It is an editor-to-agent transport, not a hook layer for a third-party CLI, and it does not cover agents run directly in a terminal (Claude Code, Codex, Gemini CLI as normally used). Not a hook layer.

**Agent Skills** (agentskills.io/specification; github.com/anthropics/skills). Spec quote: "A skill is a directory containing, at minimum, a SKILL.md file". SKILL.md frontmatter is `name` and `description`. The spec text (7,345 chars after stripping HTML) contains no "hook" match; the anthropics/skills README has 0 matches for "hook". Verdict: instructions and resources bundle. Not a hook layer.

**AGENTS.md** (agents.md). Site quote: "AGENTS.md is just standard Markdown. Use any headings you like; the agent simply parses the text you provide." and "Are there required fields? No." The page (6,169 chars) has no "hook" match. Verdict: a Markdown instruction file. Not a hook layer.

**Model Context Protocol** (modelcontextprotocol.io/specification/2025-06-18). Spec index features: "Resources: Context and data, for the user or the AI model to use", "Prompts: Templated messages and workflows for users", "Tools: Functions for the AI model to execute". Zero "hook" or "lifecycle" matches in the spec index page (5,542 bytes) or llms.txt (48,711 bytes). Verdict: MCP lets an agent call whyline as a tool; it gives no callback when the agent calls other tools or edits files. Not a hook layer.

**"Open Plugins hooks spec"** (mentioned in rulesync source for Goose: "Goose adopts the Open Plugins hooks spec: each plugin's `hooks/hooks.json` maps PascalCase event names to matcher/handler arrays"). GitHub search for it returned only 6-star or lower repos. The same `hooks/hooks.json` PascalCase shape is what Claude Code plugins use. It is a packaging format for hook config, not an SDK, and rulesync already covers it.

## 4. Registries inspected

**rulesync**: canonical events in `src/types/hooks.ts`:

```ts
export const HOOK_EVENTS = [
  "sessionStart", "sessionEnd", "preToolUse", "postToolUse", "preModelInvocation",
  "postModelInvocation", "beforeSubmitPrompt", "stop", "subagentStop", "preCompact",
  "postCompact", ... "afterFileEdit", ... "fileChanged", ...
] as const;  // 52 names
export const CODEXCLI_HOOK_EVENTS: readonly HookEvent[] = [ "sessionStart", "sessionEnd", "preToolUse", "postToolUse", "beforeSubmitPrompt", "stop", ... ];
export const CANONICAL_TO_GOOSE_EVENT_NAMES: Record<string, string> = { sessionStart: "SessionStart", beforeSubmitPrompt: "UserPromptSubmit", preToolUse: "PreToolUse", ... };
```

One converter per agent in `src/features/hooks/<tool>-hooks.ts` (49 files incl. `codexcli-hooks.ts`, `cursor-hooks.ts`, `bob-hooks.ts`, `devin-hooks.ts`, `kiro-cli-hooks.ts`, `opencode-hooks.ts`, `cline-hooks.ts`, `copilotcli-hooks.ts`, `amp-hooks.ts`). Each declares `ToolHooksConverterConfig { supportedEvents, canonicalToToolEventNames, toolToCanonicalEventNames, supportedHookTypes, passthroughFields }`. Sample `.rulesync/hooks.json`: `{ "version": 1, "hooks": { "sessionStart": [ { "type": "command", "command": "git pull && pnpm i" } ] } }`. Covers hooks: yes, as config generation only.

**ruler**: README "Supported AI Agents" table columns are `Agent | Rules File(s) | MCP Configuration / Notes | Skills Support / Location | Subagents Support / Location`. No hooks column, no hook files. Covers hooks: no.

**vercel-labs/skills**: `src/agents.ts`, `export const agents: Record<AgentType, AgentConfig> = { amp: { name: 'amp', displayName: 'Amp', skillsDir: '.agents/skills', globalSkillsDir: join(configHome, 'agents/skills'), detectInstalled: async () => existsSync(join(configHome, 'amp')) }, ... }` (912 lines). README "Compatibility" matrix row `| Hooks | No | No | Yes | Yes | No | ... |` (Yes only for Claude Code, Cline, Kiro CLI) refers to whether a skill bundle's hooks are honoured. Covers hooks: no.

**Entire CLI**: `cmd/entire/cli/agent/agent.go` `type HookSupport interface { HookNames() []string; ParseHookEvent(ctx, hookName string, stdin io.Reader) (*Event, error); InstallHooks(ctx, force bool) (int, error); UninstallHooks(ctx) error; AreHooksInstalled(ctx) (bool, error) }`. README hook location table: Antigravity `.agents/hooks.json`, Claude Code `.claude/settings.json`, Codex `.codex/hooks.json`, Copilot CLI `.github/hooks/entire.json`, Cursor `.cursor/hooks.json`, Factory AI Droid `.factory/settings.json`, OpenCode `.opencode/plugins/entire.ts` (TypeScript plugin), Pi `.pi/extensions/entire/index.ts`. Covers hooks: yes, runtime, 8 agents, Go, not a library.

**"Works with all agents" claims**: vercel-labs/skills ("and 75 more") and rulesync (49 tools) are the only high-star repos making a near-universal claim, and both are skill or config syncers. polyhook ("run them everywhere") is the only runtime claim and covers 8 agents at 4 stars.

## 5. Conclusion

No maintained cross-agent hook SDK exists that whyline could adopt. Evidence: (a) the only runtime "write once, run everywhere" hook libraries on npm are `@polyhook/sdk` (4 stars, 2 contributors, published 2026-06-18, 8 agents, no Codex or OpenCode) and `agent-control-plane-core` (0 stars, 4 agents, guardrail-oriented), with `mentu-hooks` (2 stars, 4 agents, Python) and `@osfactory/otel-hook` (5 stars, 4 agents) behind them; none is org-backed with a contributor base, and none covers more than 8 of whyline's 14 agents. (b) The credible, high-star cross-agent tools (rulesync 1474, ruler 2934, vercel-labs/skills 32498) are config, rules and skills syncers; only rulesync touches hooks and it generates native hook config files rather than parsing hook events, and it has no Gemini CLI, Aider or Windsurf target and no Zed hooks. (c) The one credible product doing session capture across agents, Entire CLI (5121 stars, org-owned, 65 contributors), hand-rolls one Go adapter per agent (`cmd/entire/cli/agent/<agent>/hooks.go`) and normalizes to its own `Event` type, which is exactly the pattern whyline would be writing. (d) None of ACP, Agent Skills, AGENTS.md or MCP defines hook or lifecycle callbacks (zero "hook" matches in each spec, with positive controls passing). Practical implication: whyline should keep one thin adapter per agent, normalize to its own event type (Entire's `Event` and rulesync's `HOOK_EVENTS` are the two best references for names and file paths), and can optionally use rulesync as an install helper because its `.rulesync/hooks.json` can write whyline's hook commands into the native hook config of Claude Code, Codex, Cursor, Copilot CLI, Cline, OpenCode, Kiro, Amp, Devin and Bob in one step.


# Part B: adapter patterns in credible tools

# How multi-agent tools integrate with AI coding agents

Research date: 2026-09-26. Every quote below was fetched from the repo's default branch (raw.githubusercontent.com or gh api) or from the npm tarball on that date. Where a quoted comment in upstream source contained an em dash it has been replaced with a colon or comma here.

Question: do credible tools that integrate with many agents use a shared SDK or standard, or hand-written per-agent adapters?

Short answer: every one of the seven projects studied keeps its own hand-written per-agent adapter table. None imports an agent SDK to talk to the agents. The only cross-agent standard that exists for the "what did the agent write" channel is the Agent Client Protocol (ACP), and it is an editor-side protocol (the tool must run the agent as a subprocess), not a hook system a CLI can install into an agent the user launches themselves.

---

## 1. entireio/cli (Go)

Tree: `cmd/entire/cli/agent/` has one Go package per agent plus a registry.

```
cmd/entire/cli/agent/registry.go
cmd/entire/cli/agent/agent.go          (Agent + HookSupport interfaces)
cmd/entire/cli/agent/event.go          (normalized Event type)
cmd/entire/cli/agent/hook_config_file.go (shared safe file writer)
cmd/entire/cli/agent/antigravity/hooks.go
cmd/entire/cli/agent/claudecode/hooks.go
cmd/entire/cli/agent/codex/hooks.go
cmd/entire/cli/agent/copilotcli/hooks.go
cmd/entire/cli/agent/cursor/hooks.go
cmd/entire/cli/agent/factoryaidroid/hooks.go
cmd/entire/cli/agent/opencode/hooks.go
cmd/entire/cli/agent/pi/hooks.go
cmd/entire/cli/agent/external/external.go (subprocess protocol for third-party adapters)
```

Registry: `cmd/entire/cli/agent/registry.go`

```go
func Register(name types.AgentName, factory Factory) {
...
	AgentNameAntigravity    types.AgentName = "antigravity"
	AgentNameClaudeCode     types.AgentName = "claude-code"
	AgentNameCodex          types.AgentName = "codex"
	AgentNameCopilotCLI     types.AgentName = "copilot-cli"
	AgentNameCursor         types.AgentName = "cursor"
	AgentNameFactoryAIDroid types.AgentName = "factoryai-droid"
	AgentNameOpenCode       types.AgentName = "opencode"
	AgentNamePi             types.AgentName = "pi"
```

Each agent package self-registers in `init()`. `cmd/entire/cli/agent/claudecode/claude.go` line 24:

```go
func init() {
	agent.Register(agent.AgentNameClaudeCode, NewClaudeCodeAgent)
```

Interface: `cmd/entire/cli/agent/agent.go`

```go
// HookSupport is implemented by agents with lifecycle hooks.
type HookSupport interface {
	Agent
	HookNames() []string
	ParseHookEvent(ctx context.Context, hookName string, stdin io.Reader) (*Event, error)
	InstallHooks(ctx context.Context, force bool) (int, error)
	UninstallHooks(ctx context.Context) error
	AreHooksInstalled(ctx context.Context) (bool, error)
}
```

Normalized event enum, `cmd/entire/cli/agent/event.go`: `SessionStart, TurnStart, TurnEnd, Compaction, SessionEnd, SubagentStart, SubagentEnd, ModelUpdate, ToolUse`. Each adapter's `ParseHookEvent` maps its native hook payload to one of these.

Per-agent config file written (README table, lines 529 to 536, matches `HookConfigRelPath()` in each `hooks.go`):

| Agent | File | Kind |
|---|---|---|
| Antigravity | `.agents/hooks.json` | JSON hooks config |
| Claude Code | `.claude/settings.json` | JSON hooks config |
| Codex | `.codex/hooks.json` | JSON hooks config |
| Copilot CLI | `.github/hooks/entire.json` | JSON hooks config |
| Cursor | `.cursor/hooks.json` | JSON hooks config |
| Factory AI Droid | `.factory/settings.json` | JSON hooks config |
| OpenCode | `.opencode/plugins/entire.ts` | TypeScript plugin |
| Pi | `.pi/extensions/entire/index.ts` | TypeScript extension |

Events per agent (from source):

Claude Code, `claudecode/hooks.go` lines 184 to 188 and 353 to 359:

```go
{"SessionStart", agent.WrapProductionJSONWarningHookCommand("entire hooks claude-code session-start", ...)},
{"SessionEnd", ...("entire hooks claude-code session-end")},
{"Stop", ...("entire hooks claude-code stop")},
{"SubagentStop", ...("entire hooks claude-code subagent-stop")},
{"UserPromptSubmit", ...("entire hooks claude-code user-prompt-submit")},
```
plus `PreToolUse` and `PostToolUse` parsed and marshalled (lines 172, 173, 254, 255).

Codex, `codex/hooks.go` lines 41 to 50 (a declarative per-event table):

```go
var hookEventSpecs = []HookEventSpec{
	{Event: "SessionStart", Label: "session_start", Verb: HookNameSessionStart, ..., Managed: true, Core: true, JSONWarning: true},
	{Event: "SessionEnd", ...},
	{Event: "UserPromptSubmit", ...},
	{Event: "Stop", ...},
	{Event: "PostToolUse", ...},
	{Event: "SubagentStart", ...},
	{Event: "SubagentStop", ...},
	{Event: "PreToolUse", Label: "pre_tool_use"},
	{Event: "PermissionRequest", Label: "permission_request"},
```

Cursor, `cursor/hooks.go` lines 38 to 48: `sessionStart, sessionEnd, beforeSubmitPrompt, stop, preCompact, subagentStart, subagentStop`. Note: entire does NOT use Cursor's `afterFileEdit`; it reads the transcript instead.

Copilot CLI, `copilotcli/hooks.go` lines 23 to 34: `hooksDir = ".github/hooks"`, events `userPromptSubmitted, sessionStart, ..., preToolUse, postToolUse`.

OpenCode and Pi have no JSON hooks file; entire writes a TypeScript plugin/extension file (`opencode/hooks.go` line 24 `pluginFileName = "entire.ts"`, `pi/hooks.go` line 29 `extensionDirName = ".pi/extensions/entire"`).

Third-party agent SDK: none. `go.mod` was grepped for `anthropic|openai|acp|agent-client|claude|codex|cursor` and returned nothing. Positive control: the same file lists `github.com/spf13/cobra`, `go-git/v6`, etc. The only "SDK" is entire's own: `agent/external/external.go` lets an external binary implement the Agent interface over a JSON subprocess protocol ("Each method invokes a subcommand on the binary and parses the JSON response").

Storage: git refs `refs/entire/checkpoints/<shard>/<id>` (README line 214), not git notes.

---

## 2. mesa-dot-dev/agentblame (TypeScript, Bun)

Single file holds all adapters: `packages/cli/src/lib/hooks.ts` (837 lines). One install/uninstall/detect function set per agent, no class hierarchy.

```ts
export function getCursorHooksPath(repoRoot: string): string {
  return path.join(repoRoot, ".cursor", "hooks.json");
}
export function getClaudeSettingsPath(repoRoot: string): string {
  return path.join(repoRoot, ".claude", "settings.json");
}
export function getOpenCodePluginDir(repoRoot: string): string {
...
export async function installCursorHooks(repoRoot: string): Promise<boolean>   // line 193
export async function installClaudeHooks(repoRoot: string): Promise<boolean>   // line 272
export async function installOpenCodeHooks(repoRoot: string): Promise<boolean> // line 351
export async function installAllHooks(                                          // line 453
```

Agent set is a string union, `packages/cli/src/lib/types.ts` line 15:

```ts
export type AiAgent = "cursor" | "claude" | "opencode";
```

Events used:

Claude (hooks.ts lines 307 to 333): `PreToolUse` with one matcher each for `Edit`, `Write`, `MultiEdit`; `PostToolUse` with matcher `".*"` and `async: true`.

```ts
for (const toolName of ["Edit", "Write", "MultiEdit"]) {
  config.hooks.PreToolUse.push({
    matcher: toolName,
    hooks: [{ type: "command", command: hookCommand }],
  });
}
config.hooks.PostToolUse.push({
  matcher: ".*",
  hooks: [{ type: "command", command: hookCommand, async: true }],
});
```

Cursor (lines 218 to 243): `beforeSubmitPrompt` and `afterFileEdit`.

OpenCode (line 69): a generated plugin file importing `@opencode-ai/plugin` types; it shells out to `bunx @mesadev/agentblame capture --provider opencode`.

The hook command itself (line 55): `bunx @mesadev/agentblame capture --provider ${provider}${eventArg}`. `capture.ts` line 458 switches on `provider: "cursor" | "claude" | "opencode"` and parses each agent's own stdin payload shape (`tool_name`, `tool_input.file_path`, `new_string`, `content`, `hook_event_name` for Claude; `conversation_id`, `edits[]` for Cursor).

Third-party SDK: `packages/cli/package.json` dependencies are only `"diff": "^8.0.2"`. No agent SDK.

Storage: git notes. `packages/cli/src/lib/git/gitNotes.ts` line 18:

```ts
const NOTES_REF = "refs/notes/agentblame";
```

This is the closest analogue to whyline (Node CLI, lifecycle hooks, git notes) and it is per-agent hand-written.

---

## 3. vercel-labs/skills (TypeScript)

Registry: `src/agents.ts` (912 lines). A flat object literal, one entry per agent, 79 entries. Each entry has `name`, `displayName`, `skillsDir`, `globalSkillsDir`, `detectInstalled`.

Full list of `name:` values:

```
aider-desk amp antigravity antigravity-cli astrbot autohand-code augment bob claude-code openclaw cline codearts-agent codebuddy codemaker codestudio codex command-code continue cortex crush cursor deepagents devin dexto droid eve firebender forgecode fx gemini-cli github-copilot goose grok hermes-agent inference-sh jazz junie iflow-cli kilo kimchi kimi-code-cli kiro-cli kode lingma loaf mcpjam minimax-code mistral-vibe moxby mux opencode openhands ona pi posit-assistant qoder qoder-cn qwen-code replit reasonix rovodev roo sarvam-code tabnine-cli terramind tinycloud trae trae-cn warp windsurf zed zcode zencoder zenflow neovate pochi promptscript adal universal
```

Sample entries with config paths:

```ts
  bob: {
    name: 'bob',
    displayName: 'IBM Bob',
    skillsDir: '.bob/skills',
    globalSkillsDir: join(home, '.bob/skills'),
    detectInstalled: async () => {
      return existsSync(join(home, '.bob'));
    },
  },
  'claude-code': { name: 'claude-code', skillsDir: '.claude/skills', globalSkillsDir: join(claudeHome, 'skills'), ...
  codex:  { skillsDir: '.agents/skills', globalSkillsDir: join(codexHome, 'skills'), ...
  cursor: { skillsDir: '.agents/skills', globalSkillsDir: join(home, '.cursor/skills'), ...
  'gemini-cli': { skillsDir: '.agents/skills', globalSkillsDir: join(home, '.gemini/skills'), ...
  'github-copilot': { skillsDir: '.agents/skills', globalSkillsDir: join(home, '.copilot/skills'), ...
  opencode / amp: globalSkillsDir: join(configHome, 'agents/skills')  (XDG)
```

IBM Bob: YES, included as `bob` with `.bob/skills` and `~/.bob/skills`.

Scope: skills only, not hooks. Dependencies in `package.json`: `tar`, `yaml`. No agent SDK.

---

## 4. dyoshikawa/rulesync and intellectronica/ruler

### rulesync (TypeScript)

What it syncs (README line 89 header): `rules | ignore | mcp | commands | subagents | skills | hooks | permissions | checks`. Hooks: YES.

Adapter table: one file per agent per feature. `src/features/hooks/` has 39 `*-hooks.ts` files (count from tree: `grep -cE '^src/features/hooks/[a-z-]+-hooks\.ts$'` = 39), e.g. `amp-hooks.ts, antigravity-hooks.ts, bob-hooks.ts, claudecode-hooks.ts, codexcli-hooks.ts, copilot-hooks.ts, cursor-hooks.ts, opencode-hooks.ts, pi-hooks.ts, ...`. `src/features/commands/` has the same pattern (`bob-command.ts`, `claudecode-command.ts`, etc.).

`src/features/hooks/hooks-processor.ts` imports each one explicitly (lines 55 to 97) and registers them in `toolHooksFactories = new Map<HooksProcessorToolTarget, ToolHooksFactory>` (line 282).

Rulesync's canonical hook vocabulary, `src/types/hooks.ts` line 207: `sessionStart, sessionEnd, preToolUse, postToolUse, preModelInvocation, postModelInvocation, beforeSubmitPrompt, stop, subagentStop, preCompact, postCompact, ... afterFileEdit, ... afterTabFileEdit, ...` (about 40 events). Each adapter declares which subset its agent supports and a name map. Bob:

```ts
export const BOB_HOOK_EVENTS: readonly HookEvent[] = [
  "sessionStart", "beforeSubmitPrompt", "preToolUse", "postToolUse",
  "preCompact", "postCompact", "stop",
];
export const CANONICAL_TO_BOB_EVENT_NAMES: Record<string, string> = {
  sessionStart: "SessionStart",
  beforeSubmitPrompt: "UserPromptSubmit",
  preToolUse: "PreToolUse",
  postToolUse: "PostToolUse",
  preCompact: "PreCompact",
  postCompact: "PostCompact",
  stop: "Stop",
};
```

`src/features/hooks/bob-hooks.ts` docblock:

```
 * Hooks live under the top-level `hooks` key of Bob's settings file :
 * `<project>/.bob/settings.json` (project scope) and
 * `~/.bob/settings/settings.json` (user scope) : in the Claude-Code shape:
 * `{ "<Event>": [{ "matcher"?: "<regex>", "hooks": [{ "type": "command",
 * "command": "...", "timeout"?: <seconds> }] }] }`
```

Verified against Bob's own docs (https://bob.ibm.com/docs/shell/configuration/lifecycle-hooks, fetched 2026-09-26): "Hooks are defined under the hooks key in your settings.json ... Global `~/.bob/settings/settings.json`, Workspace `.bob/settings.json`", events SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, PostCompact, Stop; `matcher` is a regex on tool name for PreToolUse/PostToolUse only.

Claude Code adapter `claudecode-hooks.ts` uses `projectDirVar: "$CLAUDE_PROJECT_DIR"` and supports hook types `command, prompt, http, mcp_tool, agent`.

Third-party agent SDK: `package.json` dependencies include `@modelcontextprotocol/sdk` (for its own MCP server feature) but nothing that talks to coding agents. `@anthropic-ai/claude-agent-sdk` is a devDependency only.

### ruler (TypeScript)

What it syncs: rules (concatenated into each agent's instruction file), MCP config, skills, subagents. Hooks: NO. `grep -niE 'hook' README.md` returned nothing (positive control: `grep -n '## MCP'` hits line 488). `IAgent.ts` has no hook method; capability flags are `supportsMcpStdio, supportsMcpRemote, supportsMcpTimeout, supportsNativeSkills, supportsNativeSubagents`.

Adapter table: `src/agents/index.ts`, one class per agent, 32 instantiated:

```ts
export const allAgents: IAgent[] = [
  new CopilotAgent(), new ClaudeAgent(), new CodexCliAgent(), new CursorAgent(),
  new WindsurfAgent(), new ClineAgent(), new AiderAgent(), new FirebaseAgent(),
  new OpenHandsAgent(), new GeminiCliAgent(), new JulesAgent(), new JunieAgent(),
  new AugmentCodeAgent(), new KiloCodeAgent(), new OpenCodeAgent(), new GooseAgent(),
  new CrushAgent(), new AmpAgent(), new ZedAgent(), new QwenCodeAgent(),
  new AgentsMdAgent(), new KiroAgent(), new WarpAgent(), new RooCodeAgent(),
  new TraeAgent(), new AmazonQCliAgent(), new FirebenderAgent(), new FactoryDroidAgent(),
  new AntigravityAgent(), new MistralVibeAgent(), new PiAgent(), new JetBrainsAiAssistantAgent(),
];
```

`src/agents/ClaudeAgent.ts` is 35 lines: identifier, name, `getDefaultOutputPath` returns `CLAUDE.md`, four capability booleans. No IBM Bob adapter in ruler.

---

## 5. codeburn and ccusage (session log discovery)

### getagentseal/codeburn (TypeScript)

One parser file per agent under `src/providers/`: `antigravity.ts, claude.ts, cline-cli.ts, cline.ts, codebuff.ts, codewhale.ts, codex.ts, copilot.ts, crush.ts, cursor-agent.ts, cursor.ts, devin.ts, droid.ts, dsh.ts, forge.ts, gemini.ts, goose.ts, grok.ts, grokbot.ts, hermes.ts, ibm-bob.ts, kilo-code.ts, kimi.ts, kimicode.ts, kiro.ts, lingtai-tui.ts, mistral-vibe.ts, mux.ts, open-design.ts, openclaude.ts, openclaw.ts, opencode.ts, pi.ts, quickdesk.ts, qwen.ts, vercel-gateway.ts, warp.ts, zcode.ts, zed.ts, zerostack.ts` (40 provider files plus shared parsers `sqlite-session-parser.ts`, `vscode-cline-parser.ts`, `opencode-file-parser.ts`).

`src/providers/index.ts` imports each by name:

```ts
import { claude } from './claude.js'
import { cline } from './cline.js'
...
import { ibmBob } from './ibm-bob.js'
...
```

Shared interface `src/providers/types.ts`: `SessionSource { path, project, provider, ... }`, `SessionParser { parse(): AsyncGenerator<ParsedProviderCall> }`. README line 215: "Adding a tool is a single file: see `src/providers/codex.ts`."

IBM Bob provider, `src/providers/ibm-bob.ts`:

```ts
const PROVIDER_NAME = 'ibm-bob'
const EXTENSION_ID = 'ibm.bob-code'
// macOS: ~/Library/Application Support/IBM Bob/User/globalStorage/ibm.bob-code
```
It reuses the Cline-family `ui_messages.json` parser (`createClineParser`). It reads Bob IDE task history, not Bob Shell.

Dependencies: `@modelcontextprotocol/sdk` (its own MCP server), `commander`, `ink`, `react`, `zod`. No agent SDK.

### ryoppippi/ccusage (Rust core, npm launcher)

`rust/adapters/README.md`: "This directory holds one crate per usage source ... Each agent adapter owns source-specific log discovery, parsing, token mapping, model mapping ... Use one crate per agent, in `adapters/<agent>/`. The usual shape is: Cargo.toml, src/lib.rs, paths.rs, parser.rs, loader.rs, report.rs, types.rs".

Adapter crates: `amp antigravity claude codebuff codex copilot droid gemini goose grok hermes kilo kimi openclaw opencode pi qwen zcode` (18). `rust/crates/ccusage/src/adapter/mod.rs` is a list of `pub(crate) use ccusage_adapter_<x> as <x>;` lines. No Bob adapter.

---

## 6. Anthropic plugins in anthropics/claude-code

`plugins/hookify/hooks/hooks.json`:

```json
{
  "description": "Hookify plugin - User-configurable hooks from .local.md files",
  "hooks": {
    "PreToolUse":       [{ "hooks": [{ "type": "command", "command": "python3 ${CLAUDE_PLUGIN_ROOT}/hooks/pretooluse.py", "timeout": 10 }] }],
    "PostToolUse":      [{ "hooks": [{ "type": "command", "command": "python3 ${CLAUDE_PLUGIN_ROOT}/hooks/posttooluse.py", "timeout": 10 }] }],
    "Stop":             [{ "hooks": [{ "type": "command", "command": "python3 ${CLAUDE_PLUGIN_ROOT}/hooks/stop.py", "timeout": 10 }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "python3 ${CLAUDE_PLUGIN_ROOT}/hooks/userpromptsubmit.py", "timeout": 10 }] }]
  }
}
```

`plugins/security-guidance/hooks/hooks.json`: events `SessionStart`, `UserPromptSubmit`, `PostToolUse` (matcher `"Edit|Write|MultiEdit|NotebookEdit"` and matcher `"Bash"` with `"if": "Bash(git commit:*)"`, `asyncRewake: true`), `Stop`.

Confirmed: both are Claude Code only (`.claude-plugin/plugin.json` + `hooks/hooks.json`, `${CLAUDE_PLUGIN_ROOT}` variable, Claude event names). No other agent is referenced. The hook scripts are plain Python reading JSON on stdin.

---

## 7. Agent Client Protocol (ACP)

Repo: zed-industries/agent-client-protocol. Schema source of truth is Rust in `agent-client-protocol-schema/src/v1/`; the TypeScript SDK is `@agentclientprotocol/sdk` on npm, version 1.5.0 on 2026-09-26, with generated types in `dist/schema/types.gen.d.ts`.

### Does a client receive tool calls with file diffs?

Notification name, `agent-client-protocol-schema/src/v1/client.rs` line 2675:

```rust
pub(crate) const SESSION_UPDATE_NOTIFICATION: &str = "session/update";
```

Update variants, `client.rs` lines 92 to 103:

```rust
#[serde(tag = "sessionUpdate", rename_all = "snake_case")]
pub enum SessionUpdate {
    UserMessageChunk(ContentChunk),
    AgentMessageChunk(ContentChunk),
    AgentThoughtChunk(ContentChunk),
    /// Notification that a new tool call has been initiated.
    ToolCall(ToolCall),
    /// Update on the status or results of a tool call.
    ToolCallUpdate(ToolCallUpdate),
    Plan(Plan),
    ...
```

TS SDK, `dist/schema/types.gen.d.ts` line 3411 area:

```ts
export type SessionUpdate = ... | (ToolCall & { sessionUpdate: "tool_call"; })
                            | (ToolCallUpdate & { sessionUpdate: "tool_call_update"; }) | ...
export type ToolCall = {
    toolCallId: ToolCallId;
    title: string;
    name?: string | null;
    kind?: ToolKind;            // read | edit | delete | move | search | execute | think | fetch | switch_mode | other
    status?: ToolCallStatus;
    content?: Array<ToolCallContent>;
    locations?: Array<ToolCallLocation>;
    rawInput?: unknown;
    rawOutput?: unknown;
```

Content variants, `tool_call.rs` lines 542 to 556:

```rust
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ToolCallContent {
    Content(Content),   // "type": "content"
    Diff(Diff),         // "type": "diff"
    Terminal(Terminal), // "type": "terminal"
}
```

Diff, `tool_call.rs` lines 674 to 683, and TS `Diff = { path: string; oldText?: string | null; newText: string }`:

```rust
pub struct Diff {
    /// The absolute file path being modified.
    pub path: PathBuf,
    /// The original content (None for new files).
    pub old_text: Option<String>,
    /// The new content after modification.
    pub new_text: String,
```

Protocol wording, `docs/protocol/v1/tool-calls.mdx`:

- Line 14: "When the language model requests a tool invocation, the Agent **SHOULD** report it to the Client" (SHOULD, not MUST).
- Line 128: "All fields except `toolCallId` are optional in updates."
- Lines 272 to 296: diff example `{"type": "diff", "path": "/home/user/project/src/config.json", "oldText": ..., "newText": ...}`.

Second channel, `docs/protocol/v1/file-system.mdx`: if the client advertises `clientCapabilities.fs.writeTextFile: true` at `initialize`, the agent writes files by calling the client's `fs/write_text_file` with `{ sessionId, path, content }` and "The Client **MUST** create the file if it doesn't exist." Line 29: if the capability is absent "the Agent **MUST NOT** attempt to call the corresponding filesystem method."

Answer: an ACP client gets `session/update` notifications with `tool_call` / `tool_call_update` carrying `content[].type == "diff"` with full `oldText`/`newText`, and, if it advertises `fs.writeTextFile`, it becomes the write path itself. But `content` is optional and the report is SHOULD, so per-agent quality varies; and the tool must be the ACP client, meaning it launches the agent (`bob acp`, `codex-acp`, `claude-agent-acp`) as a subprocess and owns the UI. It does not observe a session the user started in the agent's own terminal UI.

### Which agents implement ACP (docs/get-started/agents.mdx, fetched 2026-09-26)

AgentPool, Augment Code, AutoDev, Blackbox AI, Bub, Claude Agent (via Zed's `claude-agent-acp` adapter), Claw Orchestrator, Cline, Codex CLI (via `codex-acp` adapter), Code Assistant, Construct, crow-cli, Cursor, Docker cagent, fast-agent, Factory Droid, fount, Gemini CLI, GitHub Copilot (public preview), Goose, Hermes Agent, Junie, Kaagum, Kimi CLI, Kiro CLI, localharness, Minion Code, Mistral Vibe, OpenClaw, OpenCode, OpenHands, Pi (via `pi-acp`), Poolside, Qoder CLI, Qwen Code, Raxol, siGit Code, Stakpak, stdio Bus, VT Code.

ACP registry JSON (`https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json`, 41 agents): `agoragentic-acp, amp-acp, antigravity-acp, auggie, autohand, claude-acp, cline, codebuddy-code, codex-acp, cortex-code, corust-agent, crow-cli, cursor, deepagents, devin, dimcode, dirac, factory-droid, fast-agent, gemini, github-copilot-cli, glm-acp-agent, goose, grok-build, harn, junie, kilo, kimchi, kimi, minimax-code, minion-code, mistral-vibe, nova, opencode, pi-acp, poolside, qoder, qwen-code, sigit, stakpak, vtcode`.

IBM Bob: NOT listed on the ACP site page and NOT in the registry (`grep -i bob` over the repo tree and `'bob' in json.dumps(agent)` over the registry both returned empty; positive control: `cursor` and `codex-acp` were found).

But Bob does speak ACP. https://bob.ibm.com/docs/shell/features/acp (fetched 2026-09-26): "Bob Shell can run as an Agent Client Protocol (ACP) server ... Start Bob Shell as an ACP server: `bob acp` ... The process waits for JSON-RPC on stdin." Supported editors listed: Zed, IntelliJ IDEA, Neovim. Note Claude Code itself is not a native ACP agent; it is bridged by Zed's `claude-agent-acp` which wraps the Claude Agent SDK.

---

## Comparison table

| Tool | Language | Integration approach | Per-agent adapters | Shared SDK for agents | Hook events used | Storage |
|---|---|---|---|---|---|---|
| entireio/cli | Go | Registry + `HookSupport` interface, one package per agent; writes each agent's native hooks file | 8 built-in (antigravity, claude-code, codex, copilot-cli, cursor, factoryai-droid, opencode, pi) + external subprocess protocol | No (go.mod has no agent SDK) | Claude: SessionStart, SessionEnd, Stop, SubagentStop, UserPromptSubmit, PreToolUse, PostToolUse. Codex: same set plus SubagentStart. Cursor: sessionStart, sessionEnd, beforeSubmitPrompt, stop, preCompact, subagentStart, subagentStop. OpenCode/Pi: TS plugin | git refs `refs/entire/checkpoints/*` |
| mesa-dot-dev/agentblame | TypeScript (Bun) | One `install<Agent>Hooks()` function per agent in one file; `capture --provider X` parses each payload shape | 3 (cursor, claude, opencode) | No (deps: `diff` only) | Claude: PreToolUse (Edit/Write/MultiEdit), PostToolUse (`.*`, async). Cursor: beforeSubmitPrompt, afterFileEdit. OpenCode: plugin `tool.execute.before/after` | git notes `refs/notes/agentblame` |
| vercel-labs/skills | TypeScript | Flat object literal registry of paths | 79 entries (includes `bob`: `.bob/skills`) | No (deps: tar, yaml) | none (skills, not hooks) | filesystem |
| dyoshikawa/rulesync | TypeScript | One class per agent per feature, explicit import list + Map registry; canonical event vocabulary with per-agent name maps | 39 hook adapters (includes Bob) | No agent SDK (MCP SDK for its own server) | Generates any of ~40 canonical events, mapped per agent; Bob: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, PostCompact, Stop | writes agent config files |
| intellectronica/ruler | TypeScript | One class per agent, `allAgents[]` array | 32 | No | none (no hooks feature) | writes agent config files |
| getagentseal/codeburn | TypeScript | One provider file per agent, explicit imports | 40 (includes ibm-bob, IDE task history) | No (MCP SDK for its own server) | none for discovery (reads session logs); Guard writes Claude hooks only | reads `~/.claude`, `~/.codex`, etc. |
| ryoppippi/ccusage | Rust + npm launcher | One crate per agent (`paths.rs`, `parser.rs`, `loader.rs`) | 18 | No | none (reads session logs) | reads session logs |
| anthropics/claude-code plugins | Python + hooks.json | Claude-only plugin `hooks/hooks.json` | 1 (Claude Code) | n/a | hookify: PreToolUse, PostToolUse, Stop, UserPromptSubmit. security-guidance: SessionStart, UserPromptSubmit, PostToolUse, Stop | n/a |

---

## Conclusion

1. The credible pattern is hand-written per-agent adapters behind a small in-house interface. All seven projects do exactly that, in three shapes:
   - Go registry + interface + one package per agent (entire).
   - One class or one file per agent, imported explicitly into a list/Map (rulesync, ruler, codeburn, ccusage).
   - Plain per-agent functions in one file for a small agent count (agentblame, 3 agents).
   Not one of them imports an agent SDK to install or receive hooks. The only third-party protocol SDKs present are MCP SDKs, and those are for the tool's own MCP server feature, not for talking to agents.

2. There is no shared hook standard. Event names differ per agent (Claude `PostToolUse`, Cursor `afterFileEdit`, Copilot `postToolUse`, Codex `PostToolUse`, OpenCode plugin callbacks, Pi extension callbacks), config file paths differ (`.claude/settings.json`, `.codex/hooks.json`, `.cursor/hooks.json`, `.github/hooks/*.json`, `.bob/settings.json`, `.opencode/plugins/*.ts`, `.pi/extensions/*/index.ts`), and the stdin payload shapes differ. Rulesync's ~40-event canonical vocabulary is its own invention. The Claude Code hooks shape (`hooks.<Event>[].{matcher, hooks[].{type, command, timeout}}`) has become a de facto template: Codex, IBM Bob, Tabnine and Kiro reuse it nearly verbatim, so a Claude adapter usually ports to those with a path change and an event-name map.

3. ACP is the only real cross-agent standard and it gives a client `session/update` with `tool_call` content of `type: "diff"` (`path`, `oldText`, `newText`) plus an optional `fs/write_text_file` write path. Its limits for whyline: the tool must launch the agent as an ACP server subprocess (`bob acp`, `codex-acp`, `claude-agent-acp`) and act as the editor, it cannot attach to a session the user started in the agent's own TUI, diff reporting is SHOULD not MUST, and Claude Code is only reachable through Zed's SDK bridge. So ACP is a valid second integration mode ("run the agent through whyline"), not a replacement for hooks.

4. For IBM Bob specifically: rulesync ships a hooks adapter (`.bob/settings.json`, Claude-shaped, events SessionStart/UserPromptSubmit/PreToolUse/PostToolUse/PreCompact/PostCompact/Stop, verified against bob.ibm.com docs), vercel skills lists `.bob/skills`, codeburn reads Bob IDE task history. Bob is not in the ACP site list or registry even though `bob acp` exists. None of the hook-installing attribution tools (entire, agentblame) support Bob today.

Recommendation for whyline: copy the agentblame/entire shape. One adapter module per agent exposing `configPath`, `install`, `uninstall`, `isInstalled`, `parseEvent(stdin) -> normalized {session, files, before/after}`; a registry array; a normalized internal event set like entire's; Claude Code first, then the Claude-shaped agents (Codex, Bob) as near-copies, then Cursor (`afterFileEdit`). Consider ACP later as a separate "wrap" mode.
