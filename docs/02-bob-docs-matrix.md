# IBM Bob 2.x feasibility matrix (official docs only)

Source of truth: https://bob.ibm.com/docs, fetched 26 Sep 2026 with curl. Pages converted from HTML to text locally (scratchpad/pages/*.txt). Docs versions on site: IDE changelog latest entry "2.2.0 September 2026"; Shell changelog latest entry "2.0.5 September 2026". No 2.2.1 or later IDE entry exists on the changelog page.

Method notes
- Sitemap (https://bob.ibm.com/sitemap.xml, 5 MB) lists 171 English /docs URLs. Zero URLs contain "plugin". Probed /docs/ide/features/plugins, /docs/ide/configuration/plugins, /docs/shell/features/plugins, /docs/shell/configuration/plugins, /docs/ide/features/marketplace: all HTTP 404.
- Context7 has the site indexed as /websites/bob_ibm (1649 snippets) but returned nothing beyond the same pages for plugins or git notes.
- FAQ pages (/docs/ide/faq, /docs/shell/faq) render answers client-side inside empty Radix accordion regions; answers are not in the static HTML, so FAQ text is marked "not extractable" below.
- Quotes are verbatim except that em dashes in the original are shown as " - " per house style.

Legend: yes / partial / no / not documented.

## 1. Lifecycle hooks

| Feature | Supported | Quote | URL | Implication for plugin (hooks + custom mode + skills + CLI) |
|---|---|---|---|---|
| Config file locations (IDE) | yes | "Hooks are defined under the hooks key in your settings.json. Bob merges hooks from two locations: Global (all workspaces) ~/.bob/settings/settings.json; Workspace (current project) .bob/settings.json. Global hooks always run. Workspace hooks are merged on top of global hooks and apply only to the current project." | https://bob.ibm.com/docs/ide/configuration/lifecycle-hooks | Ship hooks in project .bob/settings.json under key "hooks"; user can also install globally. |
| Config file locations (Shell) | yes | Same two files. Plus: "Workspace hooks only run in trusted folders. If the current folder is untrusted, the .bob/settings.json file is not loaded and workspace-level hooks are silently skipped. Global hooks in ~/.bob/settings/settings.json are unaffected by folder trust." | https://bob.ibm.com/docs/shell/configuration/lifecycle-hooks | CLI must run in a trusted folder (or pass --trust) or project hooks silently do nothing. |
| JSON schema | yes | `{"hooks":{"PreToolUse":[{"matcher":"^write_file$","hooks":[{"type":"command","command":"sh .bob/hooks/check.sh","timeout":5}]}]}}`. Fields: "type ... Required." "command string ... Required. The shell command to run. Runs via sh -c on macOS/Linux, cmd /c on Windows." "matcher string ... Optional. A regex matched against the tool name (PreToolUse, PostToolUse only). Omit to match all tools." "timeout number 10 Seconds before the hook is stopped. Set to 0 to disable the timeout." | both hooks pages above | Schema is identical on IDE and Shell; one settings file serves both. |
| Event list (IDE) | yes | Table: "SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop". "Only command hooks and the five hook types listed above are supported in this release." | https://bob.ibm.com/docs/ide/configuration/lifecycle-hooks | IDE: 5 events. |
| Event list (Shell) | yes | Table adds "PreCompact - Before context compaction begins - Yes (exit 2) - Ignored" and "PostCompact - After context compaction completes - No - Ignored" (7 events). | https://bob.ibm.com/docs/shell/configuration/lifecycle-hooks | Do not depend on PreCompact/PostCompact if the plugin must also work in the IDE. |
| Stdin payload SessionStart | yes | `{"event":"SessionStart","session_id":"ses_01abc123"}` | both hooks pages | Only event + session_id. |
| Stdin payload UserPromptSubmit | yes | `{"event":"UserPromptSubmit","session_id":"ses_01abc123","prompt":"Refactor the auth module"}` | both hooks pages | Fields: event, session_id, prompt. |
| Stdin payload PreToolUse | yes | `{"event":"PreToolUse","session_id":"ses_01abc123","tool":"write_file","input":{"path":"src/index.ts","content":"..."}}` Schema: "event, session_id, tool, input (object)". | both hooks pages | Tool input is the raw tool argument object (for write_file: path + content). No diff field. |
| Stdin payload PostToolUse | yes | `{"event":"PostToolUse","session_id":"ses_01abc123","tool":"write_file","input":{"path":"src/index.ts","content":"..."},"output":"File written successfully"}` | both hooks pages | Adds "output" (string). |
| Stdin payload Stop | yes | `{"event":"Stop","session_id":"ses_01abc123"}` | both hooks pages | No summary, cost, or task id in Stop payload. |
| Task id in payload | partial | Only "session_id" is documented in every payload. No field named task_id. | both hooks pages | Treat session_id as the correlation key; whether it equals the task UUID from `bob --list-tasks` is not documented. |
| Workspace path in payload | not documented | No payload field. Only: "Working directory: Commands run from the task working directory (the folder Bob is working in)." | both hooks pages | Hook script must read $PWD to learn the workspace. |
| Tool input path/content/diff | partial | write_file example shows "path" and "content". No documented payload for apply_diff or execute_command; "diff" never appears. | both hooks pages | Plugin must handle unknown input shapes per tool; verify empirically. |
| Which events inject stdout as context | yes | "SessionStart ... Stdout: Written to the model's context as additional session information." "UserPromptSubmit ... Stdout: Written to the model's context alongside the prompt." PreToolUse/PostToolUse/Stop: "Stdout: Ignored." | both hooks pages | Context injection only via SessionStart and UserPromptSubmit. |
| Exit code 2 blocks | yes | "2 - Block: stop the current action - UserPromptSubmit, PreToolUse" (Shell adds PreCompact). "Any other non-zero - Non-blocking failure: logged and ignored". | both hooks pages | Gate actions only in PreToolUse/UserPromptSubmit. |
| Input rewriting | no | "Input rewriting: hooks cannot modify the prompt or tool input before it reaches the model." | both hooks pages | Plugin cannot rewrite tool args. |
| HTTPS hook type (Shell) | yes | "type: command | https ... Use command to run a local shell command or https to send events to an HTTP endpoint." "url string ... Required when type is https." Example `{"type":"https","url":"https://api.example.com/webhooks/bob-events","timeout":10}` | https://bob.ibm.com/docs/shell/configuration/lifecycle-hooks | Shell can post events to a local or remote endpoint. |
| HTTPS hook type (IDE) | partial (docs conflict) | Config page: "type: "command" ... Required. Only command is supported." But changelog 2.2.0: "HTTPS hook handlers. You can now point lifecycle hooks at HTTPS endpoints. Configure an endpoint URL in your hook settings to send event payloads to any HTTPS target, alongside or instead of local shell commands." | https://bob.ibm.com/docs/ide/configuration/lifecycle-hooks and https://bob.ibm.com/docs/ide/changelog | Changelog says yes for 2.2.0, reference page not updated. Test before relying on it in the IDE. |
| Hooks in non-interactive `bob run` | not documented | Shell hooks page only says hooks run "at specific points in a Bob Shell session". `bob run` page does not mention hooks. It does say "When running non-interactively with bob run, all tools are pre-approved." | https://bob.ibm.com/docs/shell/getting-started/start-bobshell-non-interactive | Not excluded, not confirmed. Must be tested. |
| Enterprise enforced hooks | yes | "EnforcedHooks string. Enforces a hook configuration applied by the administrator. The value must be a JSON-encoded string that matches the hooks configuration schema. Policy-enforced hooks run before any user-defined hooks and cannot be overridden by users." Note on page: "Enterprise policies are currently supported by Bob IDE only." | https://bob.ibm.com/docs/ide/security/group-policies | Alternative distribution channel for hooks via MDM/GPO, IDE only. |
| Managing hooks | yes | IDE: "The Hooks tab in Bob Settings lists all configured global and workspace hooks ... toggle individual hooks on or off". Shell: "Run /hooks to open a dialog ... toggle individual hooks on or off. The list refreshes automatically when hook settings change on disk." | hooks pages | Users can disable plugin hooks individually. |

## 2. Custom modes

| Feature | Supported | Quote | URL | Implication |
|---|---|---|---|---|
| File locations (IDE) | yes | "Global modes: Edit ~/.bob/settings/custom_modes.yaml ... Project modes: Edit .bob/custom_modes.yaml in your project." | https://bob.ibm.com/docs/ide/configuration/custom-modes | Ship .bob/custom_modes.yaml. |
| File locations (Shell) | yes (path differs) | "Global modes: Create or edit ~/.bob/custom_modes.yaml" and "Project-specific modes: Create or edit .bob/custom_modes.yaml in your project root". Precedence list: "Project-level modes (.bob/custom_modes.yaml), User-level modes (~/.bob/custom_modes.yaml), System-level modes (platform-specific locations), Default modes". | https://bob.ibm.com/docs/shell/configuration/custom-modes-bobshell | Global path is documented differently for IDE (~/.bob/settings/custom_modes.yaml) and Shell (~/.bob/custom_modes.yaml). Use the project file to avoid the conflict. |
| YAML fields | yes | Example: `customModes: - slug: docs-writer / name: / description: / roleDefinition: / whenToUse: / customInstructions: / groups: - read - - edit - fileRegex: ".*\\.(md|mdx)$" description: Markdown files only - skill`. Validation: "slug must use only letters, numbers, and hyphens." "If you omit groups, the mode does not get any grouped tools." "If you set allowedSubagents, only the listed subagent presets are available in that mode." | https://bob.ibm.com/docs/ide/configuration/custom-modes | All requested fields exist. allowedSubagents has no syntax example anywhere in the docs (grep across all fetched pages found only that one sentence). |
| Tool groups (IDE) | yes | "read, edit (can be restricted with fileRegex), execute, mcp, skill, workflow, todo, subtask, subagent, mode" | same | Give the plugin mode `skill` so it can load the plugin skills. |
| Tool groups (Shell page) | partial (docs conflict) | Shell page lists "read, edit, browser, command, mcp" and examples use `command`. | https://bob.ibm.com/docs/shell/configuration/custom-modes-bobshell | Group names differ between IDE page (execute) and Shell page (command). Shell approval settings use "execute". Test which name the Shell honours. |
| Mode-specific rules | yes | ".bob/rules-{mode-slug}/ ... Files in the directory are loaded alphabetically and combined with the customInstructions property". Alternative ".bobrules-{mode-slug}". | both custom modes pages | Plugin can ship .bob/rules-<slug>/. |
| Invocation (IDE) | yes | "Custom modes you create also appear as slash commands (e.g., a mode with slug reviewer becomes /reviewer)." Tool: "switch_mode - Change to a different mode (Agent, Plan, Ask, etc.)". | https://bob.ibm.com/docs/ide/features/slash-commands and https://bob.ibm.com/docs/ide/core-concepts/tools | /<slug> works; model can also call switch_mode. |
| Invocation (Shell interactive) | yes | "/mode shell-debug" or "/shell-debug"; "bob --chat-mode=shell-debug". | https://bob.ibm.com/docs/shell/configuration/custom-modes-bobshell | Interactive OK. |
| `bob run --mode <custom slug>` | partial (docs conflict) | bob run options: "--mode <mode> Starting mode (for example, agent, plan, ask)". Custom modes page instead shows `bob --chat-mode=test-runner -p "Run the test suite and report failures"` and `--hide-intermediary-output`, `--sandbox`; none of those flags appear in the bob run or bob chat option tables. | https://bob.ibm.com/docs/shell/getting-started/start-bobshell-non-interactive and custom-modes-bobshell | Custom slug with --mode is not explicitly documented. --chat-mode/-p/--sandbox look like stale 1.x syntax. Must test `bob run --mode <slug>`. |
| Override built-in modes | yes | "You can override default Bob modes (such as Agent, Ask, or Plan) by creating a custom mode with the same slug". | IDE custom modes page | Optional. |

## 3. Skills

| Feature | Supported | Quote | URL | Implication |
|---|---|---|---|---|
| Location | yes | "Create a folder inside .bob/skills/ in your project root, or use ~/.bob/skills/ for global skills. Add a SKILL.md file inside that folder." "Priority: If both locations contain a skill with the same name, the project-level skill takes precedence." | https://bob.ibm.com/docs/ide/features/skills and https://bob.ibm.com/docs/shell/features/skills | Ship .bob/skills/<name>/SKILL.md. Same on IDE and Shell. |
| Front matter | yes | "Required fields: name: The skill's display name used in the Bob interface; description: A clear summary that helps Bob decide when to activate this skill - skills without descriptions are ignored". "Everything below the --- delimiter becomes the instructions". | same | Only name and description documented. No other front matter keys. |
| Loading decision | yes | "Skills load once per conversation to avoid duplicate prompts. Bob automatically determines when to activate a skill based on your request and the skill's description." Tool: "use_skill - Load detailed instructions for a named skill into the current context". Tutorial: "The Skill Name is what you type to invoke the skill directly, for example /changelog-entry." Shell: "Type $ followed by a skill name to open the skill picker". | skills pages, https://bob.ibm.com/docs/ide/core-concepts/tools, https://bob.ibm.com/docs/ide/tutorials/use-skills, https://bob.ibm.com/docs/shell/getting-started/start-bobshell-interactive | Three entry points: auto by description, /<skill-name>, $ reference (Shell). |
| Approval | yes | "By default, Bob asks for your permission before activating a skill." Shell: "Add "autoApprove": { "skills": true } to your ~/.bob/settings/settings.json." | skills pages | Note: skills page uses key autoApprove.skills; approval page uses approval.allowed_permissions ["skill"]. Two documented keys. |
| Supporting scripts | partial | "You can include additional files and subfolders ... reference materials, templates, checklists, scripts, or other resources. Bob can read these files automatically once the skill is activated." Example tree includes scripts/analyze.sh, scripts/report-generator.py. | skills pages | Scripts are documented as readable. Execution is not explicitly documented; it would go through the execute tool and its approval (skills "operate within Bob's existing tool constraints", auto-approve page). |
| Skills in Shell 1.x | no | "Skills were not available in Bob Shell 1.0.x." | https://bob.ibm.com/docs/shell/changelog | Require Shell 2.x. |

## 4. Slash commands

| Feature | Supported | Quote | URL | Implication |
|---|---|---|---|---|
| Location and format | yes | "adding a markdown file to .bob/commands/ or ~/.bob/commands/". "The filename becomes the command name. For example: review.md -> /review". "Custom commands must be .md files". | https://bob.ibm.com/docs/ide/features/slash-commands and https://bob.ibm.com/docs/shell/features/slash-commands | Ship .bob/commands/*.md. |
| Arguments | yes | Frontmatter: "description ... argument-hint". Body: "Create a new API endpoint called $1 that handles $2 requests." | same | Positional $1, $2. Only two frontmatter fields documented. |
| Cross-platform | yes | "Slash commands work identically across both Bob Shell and Bob IDE." | Shell slash commands page | One file set serves both. |
| Conflicts | yes | "Custom project commands override global custom commands with the same name". "These mode commands cannot be overridden by custom workflow commands." | both | Do not name a command the same as a mode slug. |

## 5. Rules

| Feature | Supported | Quote | URL | Implication |
|---|---|---|---|---|
| .bob/rules/ | yes | "rules/ - General rules for all modes; rules-agent/ - Agent mode specific rules". Global "~/.bob/rules/". "Recursive reading ... Alphabetical order ... Symbolic links: Supported with maximum depth of 5". | https://bob.ibm.com/docs/ide/configuration/rules and https://bob.ibm.com/docs/shell/configuration/bobshell-custom-rules | Ship .bob/rules/*.md. |
| AGENTS.md | yes | "Automatically loaded by default ... Disable with "bob-code.useAgentRules": false in settings ... Loaded after mode-specific rules but before general workspace rules". Shell: "bob-shell.useAgentRules". Shell configuring page: "Global context: ~/.bob/AGENTS.md ... Project context: AGENTS.md in project root and parent directories ... Local context: AGENTS.md in subdirectories". | rules pages and https://bob.ibm.com/docs/shell/configuration/configuring | AGENTS.md is honoured on both. |

## 6. Plugins and marketplace

| Feature | Supported | Quote | URL | Implication |
|---|---|---|---|---|
| plugins/ directory | partial (changelog only) | IDE 2.2.0: "`plugins/` subdirectory for skills, modes, rules, and MCP. You can now place skills, modes, rules, and MCP server definitions in a plugins/ subdirectory alongside your project, making it easier to distribute and share Bob extensions with your team." | https://bob.ibm.com/docs/ide/changelog | This is the only mention. No reference page. Exact path (.bob/plugins/ or ./plugins/?), layout inside it, and whether Shell reads it: not documented. No Shell changelog entry mentions plugins. |
| plugin.json manifest | not documented | No occurrence of "plugin.json" in any fetched page or the sitemap. | n/a | No manifest format to target. |
| `bob plugin` command | not documented | Shell built-in slash command table (help, clear, compact, copy, editor, hooks, mode, permissions, resume, settings, mcp, manage-secrets, skills, init, status, team, logs, docs, bug, exit) has no plugin command. bob run/chat option tables have no plugin flag. | https://bob.ibm.com/docs/shell/features/slash-commands | No install command. |
| Marketplace | not documented | Zero matches for "marketplace" in all fetched pages; sitemap has no such URL. | n/a | Distribution is "copy files into the repo" (git). |
| Hooks inside plugins/ | not documented | 2.2.0 note lists "skills, modes, rules, and MCP" only. Hooks are not listed. | IDE changelog | Hooks must still be merged into .bob/settings.json by hand or by the plugin's CLI. |

## 7. Approval flow

| Feature | Supported | Quote | URL | Implication |
|---|---|---|---|---|
| IDE approvals | yes | "At the bottom of the chat input field, select the Permissions button, located beside the Mode selector. Select which actions Bob can complete without asking for permission." "Task-level approvals: ... Task-level overrides appear first in the approval UI and apply only to the current task." "Editable commands: ... you can edit the command directly in the approval prompt". | https://bob.ibm.com/docs/ide/features/auto-approving-actions | Approval is per tool group (read, edit, execute, mcp, skill, todo, subtask, subagent, mode), globally or per task. |
| Shell approvals | yes | Dialog options: "Approve Once / Approve <group> tools for task / Always Allow Command for task / Reject". "You can also toggle auto-approve interactively during a Shell session using the /permissions slash command." `bob chat --auto-approve`: "Suppress tool-approval prompts for the session. Has no effect in untrusted folders." | https://bob.ibm.com/docs/shell/getting-started/start-bobshell-interactive and https://bob.ibm.com/docs/shell/features/auto-approving-actions | |
| bob run approvals | yes | "When running non-interactively with bob run, all tools are pre-approved. You are not prompted to approve tool calls during execution." Limits via "--max-cost <bobcoins>", "--max-turns <n>", "--disable-tool-groups <groups>". | https://bob.ibm.com/docs/shell/getting-started/start-bobshell-non-interactive | No approval gate in bob run; only PreToolUse hooks (exit 2) or --disable-tool-groups can block. |
| Settings file and keys | yes | "The approval key in ~/.bob/settings/settings.json controls which tool groups and individual tools are automatically approved. This file is shared with the IDE; changes made through the IDE settings UI are written to the same file." Keys: "allowed_permissions", "permissionOptions" (enableOutsideWorkspace for read), "allowedExecutors": [{"toolId":"execute_command","approvedCommands":[...],"deniedCommands":["rm"]}]. "deniedCommands ... Commands that are always denied, even if auto-approve is enabled. Takes precedence over approvedCommands." "approvedCommands ... matched as a prefix of the full command string." "Currently only execute_command is supported." | https://bob.ibm.com/docs/shell/configuration/approval-settings | Global file only; no project-level approval file is documented. "Changes to this file take effect the next time you start a Bob Shell session." |
| Custom mode forcing approval | not documented | Modes only restrict tools via "groups" and "fileRegex"; approval is a separate per-group setting. No per-mode approval field. Policy: "DisabledAutoApprovalGroups ... users cannot re-enable auto-approval for the listed groups" (IDE only). | custom modes pages and https://bob.ibm.com/docs/ide/security/group-policies | A mode cannot demand approval; it can only drop groups. Use PreToolUse hook exit 2 to hard-block. |
| MCP alwaysAllow | yes | "MCP tools listed in alwaysAllow inside .bob/mcp.json are now automatically approved on the first tool call of a task in Bob Shell." (2.0.1) | https://bob.ibm.com/docs/shell/changelog | Project-level .bob/mcp.json exists for MCP approvals. |

## 8. Git integration

| Feature | Supported | Quote | URL | Implication |
|---|---|---|---|---|
| Commit message generation | yes (IDE) | "Click the sparkle icon next to the commit message box." "Bob examines your staged or unstaged changes ... analyzes your branch name and recent commit history". | https://bob.ibm.com/docs/ide/features/commit-messages | UI button only; no documented command or hook. |
| /create-pr | yes (IDE) | Slash commands page: "/create-pr Create a pull request with AI-generated description." Pull requests page: "Type /create-pull-request in the Bob chat interface." Template lookup list starts "${cwd}/pull_request_template.md ... ${cwd}/.github/pull_request_template.md". | https://bob.ibm.com/docs/ide/features/slash-commands and https://bob.ibm.com/docs/ide/features/pull-requests | Two different command names appear in the docs (/create-pr vs /create-pull-request). Not listed among Shell built-ins. |
| /review and Bob Findings | yes (IDE) | "/review - Review local uncommitted changes ... /review <branch> ... /review #<issue-number> --issue-coverage". "Bob reviews the diff between your selected branches, then flags potential issues in the Bob Findings panel." "Reviews run with auto-approval." "Type @problems in the chat interface to resolve multiple issues at once." Exclusions: "Bob Settings ... Bob Findings tab ... Review Exclusions, add glob patterns". | https://bob.ibm.com/docs/ide/features/code-reviews | IDE panel; not documented for Shell. |
| Git notes attribution | not documented (one sentence) | 1.0.1 changelog: "Code review and git integration. Streamline your development workflow with built-in git support. Review code changes with the /review command. Generate commit messages automatically. Create pull requests with the /create-pr command. Track code attribution with git notes." | https://bob.ibm.com/docs/ide/changelog | No page describes what is recorded, the notes ref name, or how to read it. grep of all fetched pages for "git note", "attribut", "notes ref" found only this line. Bobalytics "Bob factor ... Lines of code committed by Bob / total lines of code committed" implies attribution data exists server-side but its format is undocumented. Must inspect `git notes --ref=<x> list` empirically. |

## 9. Bob Shell CLI

| Feature | Supported | Quote | URL | Implication |
|---|---|---|---|---|
| bob run flags | yes | "--format <format> pretty (default), json, or stream-json; --mode <mode>; --max-cost <bobcoins>; --max-turns <n>; --disable-mcp; --disable-subagents; --disable-tool-groups <groups>; --workspace <path>; --log-level <level>; --resume <task-id>; --resume latest; --team-id <id>; --trust; --accept-license". Stdin: `echo "Explain this project" | bob run`. | https://bob.ibm.com/docs/shell/getting-started/start-bobshell-non-interactive | |
| --format json fields | yes | "type Always "result"; timestamp ISO 8601; status "success" or "error"; stats.task_id; stats.total_tokens; stats.input_tokens; stats.output_tokens; stats.cache_read_tokens; stats.cache_write_tokens; stats.cache_ratio; stats.duration_ms; stats.session_costs Total cost for the session; stats.tool_calls Number of tool calls made; last_message Final assistant message". | same | session_costs, tokens and tool_calls all present. task_id available here. |
| stream-json events | yes | "message (role, content, isReasoning?); tool_use (tool_name, tool_id, parameters); tool_result (tool_id, status, output?, error?); error (severity, message); result (status, stats, last_message)". | same | Real-time tool stream available without hooks. |
| Task list | yes | "bob --list-tasks [n|all]"; NDJSON when piped: `{"id":"<uuid>","title":"<string>","status":"<string>","workspace":"<file-uri>","updatedAt":<unix-ms>}`; status "active, completed, paused". Retention "tasks.retentionDays 30". | same and https://bob.ibm.com/docs/shell/configuration/configuring | Per-workspace task listing, but no cost field in the NDJSON. |
| Shell tasks in IDE task list | not documented | Only: "When you run Bob Shell as an ACP agent, your tasks are now shared with connected editors such as Zed, IntelliJ, and Neovim." (2.0.5). IDE: "Task history is stored locally on your machine and is not backed up or synchronized across devices." | https://bob.ibm.com/docs/shell/changelog and https://bob.ibm.com/docs/ide/features/chat-interface | Bob IDE is not named as sharing tasks with Shell. Assume separate stores until tested. |
| Session summary screenshot | not documented | No doc describes a task session summary screen in the IDE Tasks list. Shell footer: "Mode ... Context ... Cost Accumulated cost for the current task in Bobcoins". "/status View session status, usage, and version information". | https://bob.ibm.com/docs/shell/getting-started/start-bobshell-interactive and slash commands page | Per-task cost is visible live in the Shell footer and via /status; capture method is not documented. |

## 10. Task session summary and export

| Feature | Supported | Quote | URL | Implication |
|---|---|---|---|---|
| Per-task cost | partial | Shell: footer "Cost Accumulated cost for the current task in Bobcoins"; bob run json "stats.session_costs". IDE: "Gauge component: Hover your cursor over the gauge component located in the top-right corner of the Bob panel to see your current usage." "Settings -> General tab". No per-task cost field documented for the IDE. | interactive page, non-interactive page, https://bob.ibm.com/docs/ide/account/bobcoins | Programmatic per-task cost only through `bob run --format json`. |
| Export or API | partial | Bobalytics (Enterprise only): "To export data, select Export in the top right of any Bobalytics view ... Each table is saved as a separate CSV file in a ZIP archive." No REST API documented. FAQ question "Can I integrate Bob's usage data with our internal BI or reporting tools?" exists but answer not extractable from static HTML. | https://bob.ibm.com/docs/ide/features/bobalytics | No documented usage API. |

## 11. Bobcoins

| Feature | Supported | Quote | URL | Implication |
|---|---|---|---|---|
| Per-token or per-request rate | not documented | "One Bobcoin represents a standardized amount of computational resources, which includes token usage across different models and operations." "You do not need to track tokens directly". | https://bob.ibm.com/docs/ide/account/bobcoins | No conversion rate published. Only USD rates: "Rate: $0.50 USD per Bobcoin" (individual overage); Enterprise "1,000 Bobcoins per pack. Cost: $500 USD per pack"; overage packs "$550 USD per pack". Plans: Free trial 50, Pro 50, Pro+ 180, Ultra 1000 per month. |
| Reading usage | yes | IDE: gauge hover, "Settings -> General tab", Bobalytics. Shell: "/team ... BUDGET ... USAGE Current usage with 2 decimal places"; footer Cost; /status; `bob run --format json` stats.session_costs; "--max-cost <bobcoins>". | bobcoins pages, https://bob.ibm.com/docs/shell/features/instance-command | |

## 12. Platform requirements

| Feature | Supported | Quote | URL | Implication |
|---|---|---|---|---|
| Node for Shell | yes | "Node.js Version 24 or later". OS: "macOS, Linux, Windows, z/OS UNIX System Services (os390-s390x), or Linux on IBM Z". Install: `curl -fsSL https://bob.ibm.com/download/bobshell.sh | bash`; also npm/pnpm/yarn from downloaded package. "Bob Shell 2.0.0 requires a fresh install." | https://bob.ibm.com/docs/shell/getting-started/install-and-setup | Plugin CLI can assume Node 24+. |
| IDE OS | yes | "Operating Systems: macOS, Linux, or Windows". "Bob is a standalone IDE application and not an extension." macOS .pkg, Debian, Red Hat/Fedora, Windows .exe. | https://bob.ibm.com/docs/ide/getting-started/install and https://bob.ibm.com/docs/ide/tutorials/create-commit-and-pr | |
| Version deadline | yes | "IDE v1.0.3 and v2.0.0 will stop working on September 30, 2026." | https://bob.ibm.com/docs/ide | Target 2.0.2+. |

## Documented tool names (for hook matchers)

From https://bob.ibm.com/docs/ide/core-concepts/tools: read_file, glob, grep, list_files, GetSymbolsOverview, FindSymbol, FindReferencingSymbols, write_file, apply_diff, insert_content, search_and_replace, execute_command, spawn_subagent, start_subtask, switch_mode, use_skill, start_workflow, update_todo_list, ask_followup_question, plus office_read / office_edit (changelog 2.1.0). Approval settings confirm the execute tool id is "execute_command".

## Docs conflicts to test before building

1. IDE HTTPS hooks: reference page says command only; 2.2.0 changelog says HTTPS supported.
2. Shell custom-mode CLI flags: `--chat-mode=`, `-p`, `--hide-intermediary-output`, `--sandbox` on the custom modes page versus `--mode` on the bob run / bob chat pages.
3. Global custom_modes.yaml path: IDE ~/.bob/settings/custom_modes.yaml versus Shell ~/.bob/custom_modes.yaml.
4. Tool group names: IDE execute versus Shell custom modes page command.
5. Skill auto-approve key: autoApprove.skills versus approval.allowed_permissions ["skill"].
6. PR command name: /create-pr versus /create-pull-request.
