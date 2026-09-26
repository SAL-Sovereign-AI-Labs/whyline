# Repo conventions of five Node CLI projects in the AI coding agent space

Researched 26 Sep 2026 with `gh api repos/OWNER/REPO`, `gh api repos/OWNER/REPO/contents/PATH`, `gh api repos/OWNER/REPO/git/trees/main?recursive=1` (for executable bits) and raw fetches from `raw.githubusercontent.com/OWNER/REPO/main/PATH`. Every quote below was fetched in that session. Nothing is from memory.

Scope note on repo 1: `ccusage/ccusage` reports `"language":"Rust"` in the GitHub API and its CLI core now lives in `rust/crates`. The npm package `ccusage` (in `apps/ccusage`) is still a real Node package (`src/cli.js`, ESM, `node:test`), so it is kept, and its record is explicit about which parts are Node. The suggested substitute `entireio/cli` was checked: it is `"language":"Go"` and a recursive tree search for `package.json` returned nothing, so it has no npm wrapper in that repo to study. No substitution was made.

Positive controls used: the executable-bit query listed `bin/cli.mjs` for `vercel-labs/skills` and 15 files for `mksglu/context-mode`, so an empty result for `jarrodwatts/claude-hud` means no file has mode 100755 there. The GitHub code search for `NO_COLOR` found hits in codeburn and context-mode, so empty results for claude-hud and skills mean the string is absent in those repos.

---

## 1. ccusage/ccusage (npm: `ccusage`)

Metadata: 18,744 stars, `"license":"NOASSERTION"` at repo level (the actual `LICENSE` file at root is a symlink to `./apps/ccusage/LICENSE`; `apps/ccusage/package.json` says `"license": "MIT"`), last push 26 Sep 2026.

### Repo layout

Monorepo (pnpm workspaces). Root listing: `.agents .cargo .claude .codex .envrc .gitattributes .github .gitignore .gitleaks.toml .mcp.json .oxfmtrc.json .oxlintrc.json .tagpr AGENTS.md CONTRIBUTING.md LICENSE README.md apps ccusage.example.json default.nix docs flake.lock flake.nix justfile nix package.json package.nix packages pnpm-lock.yaml pnpm-workspace.yaml rust-toolchain.toml rust scripts typos.toml`.

- `apps/ccusage` is the published npm package: `AGENTS.md LICENSE README.md config-schema.json eslint.config.js justfile package.json scripts/ src/ test/ tsconfig.json`.
- `apps/ccusage/src` holds exactly two files: `cli.js` (6810 bytes) and `cli.test.ts` (7450 bytes). Tests are colocated.
- `apps/ccusage/test/` holds fixtures only: `fixtures/`, `statusline-test*.json`, `test-transcript.jsonl`.
- `packages/` holds six platform packages: `ccusage-darwin-arm64 ccusage-darwin-x64 ccusage-linux-arm64 ccusage-linux-x64 ccusage-win32-arm64 ccusage-win32-x64`, each with a single `package.json`.
- `docs/` is a VitePress site (workspace catalog pins `vitepress: 2.0.0-alpha.20`).
- No `bin/` folder; the bin entry points at `src/cli.js` directly.

Root `package.json` is private:

```json
"name": "ccusage-monorepo",
"private": true,
"workspaces": ["apps/*", "docs", "packages/*"],
"type": "module",
"scripts": { "preinstall": "npx only-allow pnpm" },
"packageManager": "pnpm@12.5.1"
```

`pnpm-workspace.yaml` carries supply chain settings worth noting: `minimumReleaseAge: 2880`, `strictDepBuilds: true`, `blockExoticSubdeps: true`, `trustPolicy: no-downgrade`.

### package.json of the published package (`apps/ccusage/package.json`)

- `"type": "module"`
- `"bin": { "ccusage": "./src/cli.js" }`
- `"files": ["config-schema.json", "src/cli.js"]` (the test file is not shipped)
- No `exports`, no `engines`, no `packageManager` (inherited from root).
- Scripts: `"build": "scripts/ensure-native-binary.nu && publint"`, `"prepack": "pnpm run build"`. No `test`, `lint` or `typecheck` script here; those live in the `justfile`.
- devDependencies: 1 (`@types/node`). Runtime `dependencies`: none. `optionalDependencies`: the six `@ccusage/ccusage-*` platform packages via `workspace:*`.
- `"funding": "https://github.com/sponsors/ryoppippi"`, `"repository": { ..., "directory": "apps/ccusage" }`.

Platform package example (`packages/ccusage-darwin-arm64/package.json`): `"files": ["bin/ccusage"]`, `"os": ["darwin"]`, `"cpu": ["arm64"]`, `"type": "commonjs"`, `"publishConfig": { "access": "public" }`, `"prepack": "../../apps/ccusage/scripts/verify-native-package.nu && publint"`.

### Language and build

- The npm layer is plain JavaScript with JSDoc types: `src/cli.js` begins `#!/usr/bin/env node` then `// @ts-check`. Type checking is via `tsconfig.json` with `"allowJs": true`, `"strict": true`, `"noUncheckedIndexedAccess": true`, `"verbatimModuleSyntax": true`, `"erasableSyntaxOnly": true`, `"noEmit": true`.
- No bundler for the JS. The Rust binary is built with cargo under Nix; the JS file is shipped as-is.
- ESM output: yes (`"type": "module"`, `import { spawn } from 'node:child_process'`).
- Shebang is in the source file itself; the shim is committed as the bin.
- The shim pattern: `resolveNativeBinary()` calls `require.resolve('@ccusage/ccusage-darwin-arm64/bin/ccusage')`, spawns it with `stdio: 'inherit'`, forwards `SIGINT SIGTERM SIGHUP SIGQUIT`, and sets `process.exitCode = await runCli(process.argv.slice(2))`. If the binary is missing it writes `ccusage native binary is not available for ${platform}-${arch}. Reinstall ccusage so optional native dependencies are installed.` to stderr and returns 1.
- Main-module guard: `if (isMainModule({ moduleUrl: import.meta.url })) { ... }` with the helpers exported for tests.

### Tests

- Framework: `node:test`. `cli.test.ts` imports `import assert from 'node:assert/strict'; import { describe, it, mock } from 'node:test';`.
- Location: colocated (`src/cli.test.ts`). Run via root `justfile`: `test-node:` -> `TZ=UTC node --test apps/ccusage/src/cli.test.ts nix/tools/models-dev-gen/compact.test.ts`.
- Fixtures: `apps/ccusage/test/fixtures/claude`, `apps/ccusage/test/fixtures/codex` (used by the perf harness) and JSON stdin samples for the statusline.
- Coverage tool: none for the JS layer.
- CI: yes. `.github/workflows/ci.yaml` job `test` runs `just test-node` after `pnpm install --frozen-lockfile`.

### Lint and format

- oxlint and oxfmt at the root. `.oxlintrc.json`: `"options": { "typeAware": true, "typeCheck": true }`. `.oxfmtrc.json`: `"useTabs": true, "singleQuote": true`. Root `justfile` has `typecheck:` -> `oxlint .`.
- `apps/ccusage/eslint.config.js` still exists: `import { ryoppippi } from '@ryoppippi/eslint-config'; const config = ryoppippi({ type: 'app', stylistic: false });`.
- Also `typos.toml` (spell check), `.gitleaks.toml` (secret scan), treefmt via Nix, actionlint and zizmor on workflows.

### CI and release

Workflows: `approve-contributor.yaml check-links.yaml check-pr-title.yaml ci.yaml gate-close-pr.yaml issue-gate.yaml pr-gate.yaml pullfrog.yml release.yaml renovate-bun-nix.yaml update-pricing.yaml`.

- `ci.yaml` (`name: CI`, on push to main and pull_request, `permissions: read-all`) jobs: `changes` (path filter), `tirith-scan` (security scan producing SARIF), `tirith-sarif-upload`, `preflight` (`nix build ... gitleaks ... treefmt`), `test`, `build-native-packages` (matrix of 5 OS/arch), `npm-publish-dry-run-and-upload-pkg-pr-now` (`pnpm dlx pkg-pr-new@0.0.75 publish ...`, so every PR gets an installable preview), `ccusage-preview-e2e` (matrix of 5 OS times `npm` and `pnpm`, runs `--version`, then `daily monthly session` with and without `--offline`, and pipes `--json` output through `JSON.parse`), `ccusage-perf-comment`, `ci-gate`.
- `release.yaml` (`name: tagpr`): `Songmu/tagpr@7ebae2d...` creates a release PR; on tag the `npm` job runs `pnpm --filter='./apps/ccusage' --filter='./packages/ccusage-*' publish --provenance --no-git-checks --access public` with `permissions: id-token: write`. Then `nix run .#changelogithub` writes the GitHub release notes.
- `.tagpr`: `releaseBranch = main`, `vPrefix = true`, `changelog = false`, `versionFile = package.json,apps/ccusage/package.json,docs/package.json,packages/...` (one line listing all nine).
- `check-pr-title.yaml` uses `amannn/action-semantic-pull-request@48f2562...` and a Nushell scope check.
- Every action is pinned to a full SHA with a version comment, for example `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`.
- npm provenance: yes (`--provenance`).

### Docs and hygiene

- Root `README.md` is a symlink whose content is the literal path `./apps/ccusage/README.md`. The real README headings in order: `Major Sponsors`, `Quick Start`, `Supported Sources`, `Installation` (`Package Runners` with `# npm`, `# Nix`, `# Alternative package runners`, `# PR preview builds`), `Usage`, `Features`, `Documentation`, `Development` (`Nix Package`), `GitHub Sponsors`, `Star History`, `License`.
- `CONTRIBUTING.md` headings: `The One Rule`, `Contribution Gate`, `Quality Bar For Issues`, `Before Submitting a PR`, `Commit and PR Titles`, `FAQ` (`How does the contribution gate work?`, `Why might an issue get no reply?`, `Is AI-generated code banned?`).
- LICENSE: MIT. CHANGELOG: none in repo (GitHub releases via changelogithub, `.github/release.yml` excludes label `tagpr`). CODE_OF_CONDUCT: none. `.editorconfig`: none (oxfmt handles format). `.nvmrc`/`.node-version`: none (Nix pins Node). SECURITY.md: none.
- Issue templates: `.github/ISSUE_TEMPLATE/bug.yml`, `config.yml`, `contribution.yml`. `bug.yml` requires `What happened?` and `Steps to reproduce` and says `Issues from new contributors are assessed by an automated gate.`
- `AGENTS.md` at root and in `apps/ccusage`. The package one states: `The CLI itself is Rust, in ../../rust/crates/ccusage; this package carries the npm metadata, the src/cli.js bin launcher that spawns the native binary, config-schema.json, and the packaging and benchmark scripts in scripts/.` and `its public surface is the ccusage command, its agent subcommands, and stable --json output - not library-style TypeScript exports.`
- `.gitattributes`: `**/snapshots/*.snap -binary text eol=lf diff`.

### CLI conventions (npm layer only)

- Argument parsing: none in JS; argv is forwarded to the Rust binary unchanged.
- `--json` is part of the public contract (see the AGENTS.md quote and the E2E job that validates `--json` output with `JSON.parse`).
- Exit codes: the shim returns `result.status ?? 1`; on a signal it re-raises it with `process.kill(process.pid, result.signal)`.
- Colour: handled in Rust (not inspected).
- Config: `ccusage.example.json` at root plus a shipped `config-schema.json`.
- Errors: never thrown at the user; every failure path does `process.stderr.write(...)` and returns 1.

### Hooks and shell entry scripts

None shipped to users from the npm package. Repo automation scripts are Nushell (`*.nu`) and Babashka (`*.bb`, `*.clj`).

---

## 2. getagentseal/codeburn (npm: `codeburn`)

Metadata: 11,245 stars, MIT, TypeScript, last push 25 Sep 2026.

### Repo layout

Single package with sibling apps in subfolders. Root listing: `.editorconfig .github .gitignore .gitleaks.toml .nvmrc .release-0.9.21-runbook.md .semgrep BRIEF.md CHANGELOG.md CODE_OF_CONDUCT.md CONTRIBUTING.md LICENSE README.md RELEASING.md SECURITY.md SUBMISSION.md SUPPORT.md THIRD_PARTY_NOTICES.md app assets codeburn-desktop-wireframes.html dash docs gnome mac package-lock.json package.json perf scripts src tests tsconfig.json tsup.config.ts vitest.config.ts windows`.

- `src/` flat, large files (`main.ts` 151 KB, `parser.ts` 309 KB, `optimize.ts` 194 KB), subfolders `act data guard mcp providers`.
- `tests/` flat `*.test.ts` files (60 plus) with subfolders `fixtures providers security setup sharing`.
- `docs/` is Markdown: `README.md architecture.md cli.md configuration.md how-it-works.md ...` plus `release-acceptance/`.
- `.github/`: `CODEOWNERS FUNDING.yml ISSUE_TEMPLATE PULL_REQUEST_TEMPLATE.md dependabot.yml workflows`.
- No `bin/` folder; no `examples/`.

### package.json

```json
"type": "module",
"main": "./dist/cli.js",
"bin": { "codeburn": "dist/cli.js" },
"files": ["dist", "THIRD_PARTY_NOTICES.md", "!dist/parse-worker.js.map"],
"engines": { "node": ">=22.13.0" }
```

- No `exports`, no `packageManager` (npm with `package-lock.json`).
- Scripts: `"build": "tsup && node -e \"const fs=require('fs'); fs.copyFileSync('src/cli.ts','dist/cli.js'); fs.chmodSync('dist/cli.js',0o755)\" && npm run build:dash"`, `"dev": "NODE_OPTIONS=--no-deprecation tsx src/cli.ts"`, `"test": "vitest run tests --exclude \"tests/cache-refresh-lock*\""`, `"test:locks": "vitest run tests/cache-refresh-lock.test.ts ... --poolOptions.forks.singleFork=true"`, `"test:watch"`, `"verify:upgrade"`, `"perf:*"`, `"prepublishOnly": "npm run build"`. No `lint`, `format` or `typecheck` script (CI runs `npx tsc --noEmit` directly).
- Runtime dependencies: 10 (`@modelcontextprotocol/sdk bonjour-service chalk commander ink react selfsigned strip-ansi undici zod`).
- devDependencies: 8 (`@types/node @types/react @types/selfsigned playwright tsup tsx typescript vitest`).

### Language and build

- TypeScript, bundled with tsup. `tsup.config.ts`: `entry: ['src/main.ts', 'src/parse-worker.ts'], format: ['esm'], target: 'node20', outDir: 'dist', clean: true, splitting: false, sourcemap: true, dts: false, external: ['@modelcontextprotocol/sdk', 'zod']`.
- Shebang handling: `src/cli.ts` is a hand-written launcher that is copied verbatim to `dist/cli.js` and chmod 755 by the build script. It begins:

```js
#!/usr/bin/env node
// This launcher must stay parseable by Node 18. Do NOT add static imports.
const [major, minor] = process.versions.node.split('.').map(Number)
if (major < 22 || (major === 22 && minor < 13)) {
  process.stderr.write(
    `codeburn requires Node.js >= 22.13.0 (current: ${process.version})\n` +
    'Upgrade at https://nodejs.org/\n',
  )
  process.exit(1)
}
```

and ends with `import('./main.js').catch((err) => { process.stderr.write(String(err?.message ?? err) + '\n'); process.exit(1) })`.

### Tests

- Framework: vitest. `vitest.config.ts` sets `setupFiles: ['./tests/setup/env-isolation.ts']`, `testTimeout: 30_000`, and excludes `**/.claude/worktrees/**`.
- Location: `tests/` folder, one behaviour per file (for example `cli-json-daily.test.ts`, `cli-refresh-help.test.ts`).
- Fixtures: `tests/fixtures/`; plus an env isolation file that `Mints an empty sandbox temp dir once per worker`, redirects `HOME / XDG_* / APPDATA / LOCALAPPDATA` to it and clears provider overrides, `so a test that does NOT set one gets "unconfigured" rather than the dev's value`.
- Coverage tool: none configured.
- CI: yes. `tests.yml` matrix `node-version: [22.13.0, 22, 24, 26]` on ubuntu with `npx tsc --noEmit` then `npm test -- --reporter=default --reporter=json --outputFile.json=test-report.json`, then a serial `Cache-lock suite` with `timeout 90 npm run test:locks` and one retry; plus `test-platforms` on `macos-latest, windows-latest` with `--maxWorkers=3`.

### Lint and format

- No eslint, biome, prettier or oxlint config in the repo. `ci.yml` runs Semgrep with one custom rule: `semgrep --config .semgrep/rules/no-bracket-assign-hot-paths.yml --strict --json src/providers/ src/parser.ts`.
- `tsconfig.json`: `"target": "ES2022", "module": "ESNext", "moduleResolution": "bundler", "strict": true, "esModuleInterop": true, "skipLibCheck": true, "declaration": true, "sourceMap": true`, `"include": ["src/**/*"]`, `"exclude": ["node_modules", "dist", "tests"]`.
- `.editorconfig`: `indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `[*.md] trim_trailing_whitespace = false`, `[Makefile] indent_style = tab`.

### CI and release

Workflows: `block-claude-coauthor.yml build-snap.yml build-windows-installer.yml build-windows-store.yml ci.yml firstlook.yml mac-menubar-ci.yml pr-limit.yml release-menubar-windows.yml release-menubar.yml tests.yml upgrade-path.yml windows-menubar-ci.yml`.

- `block-claude-coauthor.yml` fails a PR if any commit body matches `co-authored-by:.*(claude|anthropic)`.
- `pr-limit.yml` (on `pull_request_target`) closes PRs with an untouched template, first-time PRs over 300 lines without an issue, and a contributor's sixth open PR.
- Release tooling: manual. `RELEASING.md`: `CLI releases are run by hand with npm publish`, steps `npm version <version>`, move `## Unreleased` in `CHANGELOG.md` to a dated section, `git commit -m "chore: bump to 0.9.8"`, then publish. There is no npm publish workflow, so no provenance from CI.
- Actions pinned by major tag (`actions/checkout@v6`, `actions/setup-node@v4`), not SHA. `dependabot.yml` present.

### Docs and hygiene

- README headings in order: `The problem`, `Sixty seconds`, `See it`, `Understand it`, `Fix it`, `Stay ahead`, `Always in view`, `Inside your agent`, `Works with 40 tools`, `Private by design`, `Built in the open`, `The manual`, `Questions`, `Telemetry`, `License`, `Credits`.
- `CONTRIBUTING.md` headings: `Prerequisites`, `Setup`, `Common Commands`, `What to Read Before Editing`, `Project Layout`, `Coding Conventions`, `Tests` (`The full suite is the gate`), `Commit Message Format` (`No AI Co-Author Trailers`), `Before You Start`, `Adding a New Provider`, `Pull Requests`, `Reporting Bugs`, `Security Issues`, `License`.
- Present: `CHANGELOG.md` (Keep a Changelog style: `## Unreleased` with `### Added`, `### Removed`, `### Fixed`; every bullet ends with the issue number and the reporter, for example `Reported in #1545.`), `CODE_OF_CONDUCT.md`, `SECURITY.md` (`Please report security vulnerabilities via GitHub's private vulnerability reporting ... Do not open a public issue`), `SUPPORT.md`, `RELEASING.md`, `THIRD_PARTY_NOTICES.md`, `.editorconfig`, `.nvmrc` (`22.13.0`, matching `engines`), `CODEOWNERS`, `PULL_REQUEST_TEMPLATE.md` (checkboxes: `npm test passes`, `npm run build succeeds`, `UI change: before and after screenshots attached below`).
- Issue templates: `bug.yml config.yml feature.yml provider.yml`.
- LICENSE: `MIT License`, `Copyright (c) 2026 AgentSeal`.

### CLI conventions

- Parser: commander (`const program = new Command()`), with a global `--verbose` and `--timezone <zone>` and a `program.hook('preAction', ...)` that reads `CODEBURN_TZ` and sets `process.env['CODEBURN_VERBOSE'] = '1'`.
- JSON output: per-command `--format <format>` with `'tui, json'` or `'text, json'` or `'terminal, menubar-json, json'`. Some commands add `--no-color` (`'Disable ANSI colors'`).
- Exit codes: `process.exit(1)` on bad input; `--check` on the budget command is documented as `Check current spend and exit 1 if any configured budget is over`; `if (over) process.exitCode = 1`.
- Colour: chalk. Tests set `env.NO_COLOR = '1'` and `delete env.FORCE_COLOR` with the comment `Agent/CI runners often set FORCE_COLOR=1 even when NO_COLOR=1.`
- Config file: `join(homedir(), '.config', 'codeburn')` then `config.json`. Cache: `process.env['CODEBURN_CACHE_DIR']` else `join(homedir(), '.cache', 'codeburn')`.
- Debug env: `CODEBURN_VERBOSE`, `CODEBURN_TZ`, `CODEBURN_WSL=off` (from the changelog).
- Errors: the launcher catches import failure and prints only `err.message`. A file read helper returns `{ status: 'absent' | 'unreadable' | 'ok' }` instead of throwing.

### Hooks and shell entry scripts

The CLI itself has no shell hook. The only executable-bit handling is `fs.chmodSync('dist/cli.js',0o755)` in the build script (dist is not committed).

---

## 3. jarrodwatts/claude-hud (npm name `claude-hud`, distributed as a Claude Code plugin)

Metadata: 28,170 stars, MIT, GitHub says `"language":"JavaScript"` (because compiled `dist/` and JS tests are committed), last push 19 Sep 2026.

### Repo layout

Single package. Root: `.claude-plugin .editorconfig .github .gitignore CHANGELOG.md CLAUDE.README.md CLAUDE.md CODE_OF_CONDUCT.md CONTRIBUTING.md LICENSE MAINTAINERS.md README.md README.zh.md RELEASING.md SECURITY.md SUPPORT.md TESTING.md claude-hud-preview-16-9.png claude-hud-preview-5-2.png commands dist package-lock.json package.json scripts src tests tsconfig.json`.

- `src/*.ts` with subfolders `i18n render utils`. `tests/*.test.js` (plain JS, 36 files, `render.test.js` is 168 KB) plus `tests/fixtures/` (`expected/`, `transcript-basic.jsonl`, `transcript-render.jsonl`, `transcript-ultracode.jsonl`).
- `dist/` is committed (`.js`, `.d.ts`, `.map`).
- `commands/setup.md`, `commands/configure.md` are the plugin slash commands. `.claude-plugin/plugin.json` and `marketplace.json`.
- `scripts/clean-dist.mjs` only.

### package.json

```json
"type": "module",
"main": "dist/index.js",
"files": ["dist/", "src/", "commands/", "scripts/clean-dist.mjs", ".claude-plugin/"],
"engines": { "node": ">=18.0.0" }
```

- No `bin` (invoked as `node dist/index.js` from the statusline command), no `exports`, no `packageManager`.
- Scripts: `"build": "node scripts/clean-dist.mjs && tsc"`, `"dev": "tsc --watch"`, `"test": "npm run build && node --test"`, `"test:coverage": "npm run build && c8 --reporter=text --reporter=lcov node --test"`, `"test:update-snapshots": "UPDATE_SNAPSHOTS=1 npm test"`, `"test:stdin"` (pipes a sample JSON into `node dist/index.js`). No lint or format script.
- Runtime dependencies: none (no `dependencies` field at all).
- devDependencies: 3 (`@types/node`, `c8`, `typescript`).

### Language and build

- TypeScript compiled with `tsc` only, no bundler. `tsconfig.json`: `"module": "NodeNext", "moduleResolution": "NodeNext", "strict": true, "declaration": true, "declarationMap": true, "sourceMap": true`.
- ESM output: yes.
- Shebang: none. `dist/index.js` starts with `import { readStdin, getUsageFromStdin } from "./stdin.js";`. No file in the tree has mode 100755.
- Main-module guard in `src/index.ts`: `if (argvPath && isSamePath(argvPath, scriptPath)) { void main(); }` using `realpathSync` on both sides.

### Tests

- Framework: `node:test` via bare `node --test` (test discovery by the `*.test.js` filename pattern). Coverage with `c8`.
- Location: `tests/` folder, JS tests against compiled `dist/`. `build-output.test.js` checks the build itself.
- Fixtures: `tests/fixtures/` with JSONL transcripts and `expected/` snapshots; `UPDATE_SNAPSHOTS=1` regenerates them.
- `TESTING.md` sets the policy: `Keep test execution fast (<5s)`, `Keep shared test data under tests/fixtures/`, `Use small JSONL files that capture one behavior each`.
- CI: yes. `ci.yml` runs `npm run test:coverage` on `node-version: [18.x, 20.x]` and a `windows-git` job that runs `node --test tests/git.test.js tests/git-runner.test.js` under pwsh.

### Lint and format

- No linter or formatter config. `CONTRIBUTING.md` `Code Style`: `Keep changes focused and small.`, `Prefer tests for behavior changes.`, `Avoid introducing dependencies unless necessary.`
- `.editorconfig`: identical in spirit to codeburn's (2 spaces, lf, `[*.md] trim_trailing_whitespace = false`).

### CI and release

Workflows: `build-dist.yml ci.yml claude.yml release.yml`.

- `build-dist.yml`: on push to main, `if: "!contains(github.event.head_commit.message, '[auto]')"`, runs `npm ci`, `npm test`, `npm run build`, `test -f dist/index.js || exit 1`, then commits with `git add dist/ --force` and message `build: compile dist/ [auto]`. `CONTRIBUTING.md`: `PRs should only modify files in src/ - do not include changes to dist/`.
- `release.yml`: on tag `v*.*.*`, runs build and tests, extracts the matching `## [x.y.z]` section from `CHANGELOG.md` with awk, fails if empty, then `softprops/action-gh-release@v2` with `body_path: RELEASE_NOTES.md`. No npm publish step.
- `claude.yml`: `anthropics/claude-code-action@v1` triggered by `@claude` mentions.
- Release process is manual per `RELEASING.md`: bump `.claude-plugin/plugin.json`, `package.json`, `package-lock.json`, `CHANGELOG.md` (`Keep .claude-plugin/plugin.json and package.json on the same version`), then `git tag vX.Y.Z` and push.
- Actions pinned by major (`actions/checkout@v6`, `actions/setup-node@v6`). `dependabot.yml` present.

### Docs and hygiene

- README headings in order: `Install`, `What is Claude HUD?`, `What You See` (`Default (2 lines)`, `Optional lines`), `How It Works`, `Configuration` (`Presets`, `Manual Configuration`, `Options`, `Usage Limits`, `Security Notes`, `Example Configuration`, `Display Examples`, `Jujutsu (jj) support`, `Auto-Refresh`, `Disabling the HUD Temporarily`, `Troubleshooting`), `Requirements`, `Development`, `License`, `Star History`.
- `CONTRIBUTING.md` headings: `Scope`, `How to Contribute`, `Development`, `Tests`, `Code Style`, `Build Process`, `Pull Requests`, `Releasing New Versions` (`How Users Get Updates`, `Version Strategy`).
- Present: `CHANGELOG.md` (`## [Unreleased]` with `### Added`, `### Fixed`, PR numbers in brackets), `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `MAINTAINERS.md`, `TESTING.md`, `RELEASING.md`, `.editorconfig`, `CODEOWNERS`, `pull_request_template.md`. Absent: `.nvmrc`, `.node-version`.
- Issue templates: Markdown, `bug_report.md` (`Summary`, `Steps to Reproduce`, `Expected Behavior`, `Actual Behavior`, `Environment` with `OS`, `Node/Bun version`, `Claude Code version`, `Logs or Screenshots`), `feature_request.md`, `config.yml`.

### CLI conventions

- Argument parsing: none. Input is a JSON document on stdin from Claude Code's statusline; the only argv use is an extra command option parsed by `parseExtraCmdArg`.
- `--json`: not applicable (output is the rendered statusline).
- Exit codes: `main()` never sets a non-zero code. The whole body is in `try { ... } catch (error) { deps.log("[claude-hud] Error:", error instanceof Error ? error.message : "Unknown error"); }`.
- Kill switch: `CLAUDE_HUD_DISABLE` (`Any non-blank value other than an explicit negative (0, false, off, no, case-insensitive) disables the HUD`).
- Colour: hand-rolled ANSI; no `NO_COLOR` handling found by code search. Width from `COLUMNS` then `process.stdout.columns`.
- Debug: `src/debug.ts`: `const DEBUG = process.env.DEBUG?.includes('claude-hud') || process.env.DEBUG === '*';` and `console.error(`[claude-hud:${namespace}] ${msg}`, ...args)`.
- Config: `loadConfig()` in `src/config.ts` (JSON config; details in README `Manual Configuration`).

### Hooks and shell entry scripts

Not a hook; it is a `statusLine` command. Installed by the `/claude-hud:setup` slash command (`commands/setup.md`) which writes the `statusLine` entry into `settings.json`. No shell shim, no executable bits.

---

## 4. vercel-labs/skills (npm: `skills`, `npx skills`)

Metadata: 32,497 stars, MIT, TypeScript, last push 18 Sep 2026.

### Repo layout

Single package. Root: `.github .gitignore .husky .prettierrc AGENTS.md LICENSE README.md ThirdPartyNoticeText.txt bin build.config.mjs package.json pnpm-lock.yaml scripts skills src tests tsconfig.json`.

- `bin/cli.mjs` (305 bytes, the only file with mode 100755).
- `src/` flat with colocated `*.test.ts` (`add.test.ts`, `cli.test.ts`, `list.test.ts`, ...) and subfolders `prompts providers`.
- `tests/` holds a second, larger set of `*.test.ts` (45 files) and `fixtures/`. Both locations are used; `AGENTS.md` documents both trees.
- `scripts/*.ts` run directly with `node` (type stripping): `execute-tests.ts generate-licenses.ts sync-agents.ts validate-agents.ts`.
- `skills/` holds example skills. No `docs/` folder.

### package.json

```json
"type": "module",
"bin": { "skills": "./bin/cli.mjs", "add-skill": "./bin/cli.mjs" },
"files": ["dist", "bin", "README.md", "ThirdPartyNoticeText.txt"],
"engines": { "node": ">=22.20.0" },
"packageManager": "pnpm@10.17.1"
```

- No `exports`, no `main`.
- Scripts: `"build": "node scripts/generate-licenses.ts && obuild"`, `"dev": "node src/cli.ts"`, `"test": "vitest"`, `"type-check": "tsc --noEmit"`, `"format": "prettier --write \"src/**/*.ts\" \"scripts/**/*.ts\""`, `"format:check"`, `"prepare": "husky"`, `"prepublishOnly": "npm run build"`, `"publish:snapshot": "npm version prerelease --preid=snapshot --no-git-tag-version && npm publish --tag snapshot"`. No lint script (prettier only).
- `"lint-staged": { "src/**/*.ts": "prettier --write", ... }` and `.husky/pre-commit` is one line: `pnpm lint-staged`.
- Runtime dependencies: 2 (`tar`, `yaml`). Everything else (`@clack/prompts`, `picocolors`, `simple-git`, `xdg-basedir`, `@vercel/detect-agent`) is in devDependencies because obuild bundles them.
- devDependencies: 13.
- `keywords` is a long list of agent names, regenerated by `scripts/sync-agents.ts`.

### Language and build

- TypeScript, bundled with obuild. `build.config.mjs`: `entries: [{ type: 'bundle', input: './src/cli.ts' }]`. Output `dist/cli.mjs`.
- `tsconfig.json`: `"noEmit": true, "allowImportingTsExtensions": true, "verbatimModuleSyntax": true, "strict": true, "noUncheckedIndexedAccess": true, "moduleResolution": "bundler"`. Source imports use `.ts` extensions (`import { runAdd, parseAddOptions, initTelemetry } from './add.ts';`).
- Shebang: the committed shim `bin/cli.mjs` is the bin:

```js
#!/usr/bin/env node

import module from 'node:module';

// https://nodejs.org/api/module.html#module-compile-cache
if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    module.enableCompileCache();
  } catch {
    // Ignore errors
  }
}

await import('../dist/cli.mjs');
```

`src/cli.ts` also starts with `#!/usr/bin/env node` so `pnpm dev` works.

### Tests

- Framework: vitest. Both colocated (`src/*.test.ts`) and `tests/*.test.ts`.
- Fixtures: `tests/fixtures/`. A build smoke test `tests/dist.test.ts` runs `pnpm build` then `node bin/cli.mjs --help` and asserts the output contains `skills`.
- Coverage: none configured.
- CI: yes. `ci.yml` `checks` job matrix `os: [ubuntu-latest, windows-latest]` times `node-version: ['22.20.0', '24', '26']`, runs `pnpm build`, `pnpm format:check` (ubuntu, node 24 only), `pnpm test`. Separate `typecheck` job runs `pnpm type-check`. CI ignores `**/*.md` changes.

### Lint and format

- Prettier only. `.prettierrc`: `"semi": true, "singleQuote": true, "trailingComma": "es5", "printWidth": 100, "tabWidth": 2`. `AGENTS.md`: `CI will fail if code is not properly formatted.`
- No eslint, biome or oxlint.

### CI and release

Workflows: `agents.yml ci.yml publish.yml`.

- `publish.yml`: `workflow_dispatch` with `bump: choice [patch, minor]`, `environment: npm-publish`, `permissions: contents: write, id-token: write`. Steps: build, import a GPG key (pinned to a fork by SHA: `quuu/ghaction-import-gpg@72c784c...` with the comment `so a compromise of the upstream namespace can't push malicious code into our release pipeline`), `npm version ${{ inputs.bump }} -m "v%s"`, `git push && git push --tags`, `npm publish --provenance --access public`, then builds release notes from merged PRs with `gh pr list --state merged` and `envsubst < .github/RELEASE_TEMPLATE.md`, and `gh release create`.
- `.github/RELEASE_TEMPLATE.md` is 61 bytes: `## Changelog`, `${CHANGELOG}`, `## Contributors`, `${CONTRIBUTORS}`.
- `agents.yml`: validates `src/agents.ts`, then on main regenerates `README.md` and `package.json` keywords and commits with `chore: update README and package.json with latest agents`.
- Pinning: `pnpm/action-setup@0ebf47130e4866e96fce0953f49152a61190b271 # v6.0.9` by SHA; `actions/checkout@v6` and `actions/setup-node@v6` by major.
- npm provenance: yes.

### Docs and hygiene

- README headings in order: `Install a Skill`, `Use a Skill Without Installing` (`Source Formats`, `Private Repositories`, `Options`, `Examples`, `Installation Scope`, `Installation Methods`), `Other Commands` (`skills list`, `skills find`, `skills update`, `skills init`, `skills remove`), `What are Agent Skills?`, `Supported Agents`, `Creating Skills`, `Compatibility`, `Troubleshooting`, `Environment Variables`, `Telemetry`, `Related Links`, `License`.
- No CONTRIBUTING.md, no CHANGELOG (release notes are generated), no CODE_OF_CONDUCT, no SECURITY.md, no `.editorconfig`, no `.nvmrc`. `ThirdPartyNoticeText.txt` is generated at build.
- `AGENTS.md` has `Project Overview`, a `Commands` table, an `Architecture` tree, `Development`, `Code Style`, `Publishing`, `Adding a New Agent`.
- Issue templates (YAML forms): `agent-request.yml bug-report.yml config.yml feature-request.yml`. `bug-report.yml` uses `title: "[Bug]: "`, `labels: ["bug"]`.

### CLI conventions

- Argument parsing: none; a hand-written `switch (command)` in `main()` with aliases (`case 'list': case 'ls':`, `case 'remove': case 'rm': case 'r':`). Options are parsed per command by `parseAddOptions`, `parseRemoveOptions`, `parseUseOptions`.
- `--json` on `add`, `list` and others, documented in help as `--json                 Output results as JSON (machine-readable, no ANSI codes)`.
- `--version, -v     Show version number`; `--help, -h`. Version is read from `package.json` at runtime with a fallback of `'0.0.0'`.
- Exit codes: `process.exitCode = 1` on unknown command (`Unknown command: ${command}` then `Run skills --help for usage.`) and on command failure; final line `main().finally(() => flushTelemetry().then(() => process.exit(process.exitCode ?? 0)));`.
- Colour: hard-coded ANSI escapes (`const DIM = '\x1b[38;5;102m'`) plus `picocolors` in modules. No `NO_COLOR` string in the repo (code search returned nothing); `--json` is the documented way to get no ANSI.
- Env vars documented in README: `INSTALL_INTERNAL_SKILLS`, `DISABLE_TELEMETRY`, `DO_NOT_TRACK`, `GITHUB_TOKEN`, `GH_TOKEN`.
- Config/lock files: `~/.agents/.skill-lock.json` (global) and `skills-lock.json` (project, checked in).
- Errors: not inspected beyond `main()`; unknown command is a friendly two-liner.

### Hooks and shell entry scripts

None. The only shipped executable is the node shim `bin/cli.mjs` (mode 100755 in git).

---

## 5. mksglu/context-mode (npm: `context-mode`, also a Claude Code plugin)

Metadata: 24,075 stars, `"license":"NOASSERTION"` (the `LICENSE` file is `Elastic License 2.0 (ELv2)`, `Copyright 2026 Mert Koseoglu`; `package.json` says `"license": "Elastic-2.0"`), TypeScript, last push 26 Sep 2026.

### Repo layout

Single package that ships several plugin manifests. Root: `.agents .claude-plugin .claude .codex-plugin .cursor-plugin .gitattributes .github .gitignore .mcp.json.codex.example .mcp.json.example .npmignore .openclaw-plugin .pi BENCHMARK.md CLAUDE.md CONTRIBUTING.md LICENSE README.md bin bun.lock cli.bundle.mjs configs docs hooks openclaw.plugin.json package.json scripts server.bundle.mjs skills src stats.json tests tsconfig.json vitest.config.ts web`.

- `bin/statusline.mjs` only.
- `hooks/` is plain `.mjs` (30 files plus per-platform subfolders `antigravity-cli codex copilot-cli core cursor formatters gemini-cli jetbrains-copilot kimi kiro qwen-code vscode-copilot`) and `hooks/hooks.json`.
- `src/` TypeScript with `server.ts` 226 KB and `cli.ts` 89 KB; subfolders `adapters search session util`.
- `tests/` with `*.test.ts` and subfolders `adapters analytics cli codex core executor fixtures hooks integration plugins scripts security session shared util`.
- Committed bundles at root: `server.bundle.mjs`, `cli.bundle.mjs`, plus `hooks/*.bundle.mjs`.
- `docs/`: `UPSTREAM-CREDITS.md adapters/ adr/ jetbrains-copilot.md platform-support.md`.

### package.json

```json
"type": "module",
"main": "./build/adapters/opencode/plugin.js",
"exports": {
  ".": "./build/adapters/opencode/plugin.js",
  "./plugin": "./build/adapters/opencode/plugin.js",
  "./openclaw": "./build/adapters/openclaw/plugin.js",
  "./cli": "./cli.bundle.mjs"
},
"bin": { "context-mode": "./cli.bundle.mjs" },
"engines": { "node": ">=22.5.0" },
"packageManager": "pnpm@10.23.0+sha512...."
```

- `files`: `build hooks configs server.bundle.mjs cli.bundle.mjs bin skills .claude-plugin .codex-plugin .openclaw-plugin openclaw.plugin.json start.mjs scripts/postinstall.mjs scripts/heal-better-sqlite3.mjs scripts/heal-installed-plugins.mjs scripts/plugin-cache-integrity.mjs README.md LICENSE`. There is also an `.npmignore` (`src/ tests/ *.ts ... .github/ *.db`).
- Scripts: `"build": "tsc && node -e \"if(process.platform!=='win32'){require('fs').chmodSync('build/cli.js',0o755)}\" && npm run bundle && npm run assert-bundle && npm run assert-asymmetric-drift"`, `"bundle"` is six chained `esbuild ... --bundle --platform=node --target=node18 --format=esm --minify` calls, `"typecheck": "tsc --noEmit"`, `"pretest": "npm run build"`, `"test": "vitest run"`, `"test:watch": "vitest"`, `"version": "node scripts/version-sync.mjs && git add package.json .claude-plugin/plugin.json ..."`, `"prepublishOnly": "npm run build"`, `"postinstall": "node scripts/postinstall.mjs"`. No lint or format script.
- Runtime dependencies: 8 (`@clack/prompts @mixmark-io/domino @modelcontextprotocol/sdk better-sqlite3 picocolors turndown turndown-plugin-gfm zod`).
- devDependencies: 7 (`@types/better-sqlite3 @types/node @types/turndown esbuild tsx typescript vitest`).

### Language and build

- TypeScript compiled with `tsc` to `build/` (`"module": "NodeNext"`, `"strict": true`, `"isolatedModules": true`, `"declaration": true`) and then bundled with esbuild into single `.mjs` files. Bundles are committed and refreshed by CI (`bundle.yml`).
- Shebang: `src/cli.ts` begins `#!/usr/bin/env node`; the build does `chmodSync('build/cli.js',0o755)` off Windows. The published `cli.bundle.mjs` has mode 100755 in git.
- `scripts/assert-bundle.mjs` checks bundle invariants after every build.

### Tests

- Framework: vitest. `vitest.config.ts`: `include: ["tests/**/*.test.ts"]`, `testTimeout: 30_000`, `hookTimeout: 30_000`, `pool: "forks"`, `maxWorkers: isCI ? 2 : 3`, `retry: isCI ? 2 : 0`, `teardownTimeout: isCI ? 15_000 : 5_000`. Comments explain each value by issue number (`Cap parallel workers to prevent fork exhaustion (#258).`).
- Location: `tests/` folder, grouped by area (`tests/hooks/claude-stop.test.ts`, `tests/cli/upgrade-verifies-binding.test.ts`).
- Fixtures: `tests/fixtures/` (`access.log analytics.csv api-response.json build-output.txt claude-code-transcript.jsonl context7-*.md cursor/`).
- Coverage: none configured.
- CI: yes. `ci.yml` matrix `os: [ubuntu-latest, macos-latest, windows-latest]`, Node `"22.5"`, also installs Python, Go and Elixir for sandbox tests, runs `npx tsc -b --noEmit`, `npm run build`, `npm run bundle`, `npm run assert-bundle`, then `npx vitest run 2>&1 | tee /tmp/vitest-output.txt` and greps the summary because `Vitest fork workers can crash during cleanup on CI ... even when all tests pass`. Final step `npx tsx src/cli.ts doctor` with `continue-on-error: true`.

### Lint and format

- No eslint, biome, prettier or oxlint config. `.gitattributes`: `* text=auto eol=lf` with the comment `Prevents CRLF conversion on Windows`.
- No `.editorconfig`, no `.nvmrc`.

### CI and release

Workflows: `bundle.yml ci.yml openclaw-e2e.yml tier2-e2e-smoke.yml update-stats.yml`.

- `bundle.yml`: on push to main touching `src/**`, `package.json` or `tsconfig.json`, rebuilds and commits the bundles with `git add -f server.bundle.mjs cli.bundle.mjs hooks/...bundle.mjs` and message `ci: update server.bundle.mjs, cli.bundle.mjs, session hook & security bundles`.
- Release: no publish workflow. Versioning is `npm version`, whose `version` lifecycle script runs `scripts/version-sync.mjs` to copy the version into ten manifest files (`TARGETS = [".claude-plugin/plugin.json", ".claude-plugin/marketplace.json", ".cursor-plugin/plugin.json", ".codex-plugin/plugin.json", ...]`) and `git add`s them. The script comment records why: `the duplication is what let manifests silently drift across releases (#768; cf. the .cursor-plugin v1.0.111 incident)`.
- Actions pinned by major (`actions/checkout@v4`, `actions/setup-node@v4`).
- `.claude-plugin/plugin.json` declares `"mcpServers": { "context-mode": { "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/start.mjs"] } }` and `"skills": "./skills/"`.

### Docs and hygiene

- README headings in order: `The Problem` (`How Context Mode Solves It`), `Install` (`Option A`, `Option B`), `Tools`, `How the Sandbox Works`, `How the Knowledge Base Works`, `Session Continuity`, `Platform Compatibility` (`Routing Enforcement`), `Utility Commands`, `Benchmarks`, `Try It`, `Privacy & Architecture`, `Security` (`Project-boundary containment`, `Network fetch hardening`, `Storage environment variables`, `Routing-guidance environment variables`), `Contributing`, `License`.
- `CONTRIBUTING.md` headings include `Architecture Overview`, `Prerequisites`, `Local Development Setup` (six numbered steps), `Development Workflow`, `TDD Workflow` (`Red-Green-Refactor`, `Test file organization`), `Testing the OpenClaw Adapter`, `Prose-style policy`, `Submitting a Bug Report`, `Submitting a Pull Request`, `Quick Reference`.
- Present: `CONTRIBUTING.md`, `CLAUDE.md`, `docs/adr/` (architecture decision records), `PULL_REQUEST_TEMPLATE.md` (`Affected platforms` checklist, `npm test passes`, `npm run typecheck passes`, `No Windows path regressions (forward slashes only)`, `Targets next branch (unless hotfix)`), `FUNDING.yml`. Absent: CHANGELOG, CODE_OF_CONDUCT, SECURITY.md, `.editorconfig`, `.nvmrc`.
- Issue templates (YAML forms): `bug_report.yml` (6240 bytes), `feature_request.yml`, `config.yml`.

### CLI conventions

- Argument parsing: none. `const args = process.argv.slice(2);` then `if (args[0] === "--help" || args[0] === "-h" || args[0] === "help")` and per-command dispatch. Subcommands: `doctor`, `upgrade`, `hook <platform> <event>`, `index`, `search`, `statusline`.
- Each command returns a code: `doctor().then((code) => process.exit(code));`.
- Colour: `picocolors` in the CLI. The statusline does it by hand: `const NO_COLOR = process.env.NO_COLOR || !process.stdout.isTTY; const ansi = (code, text) => (NO_COLOR ? text : `\x1b[${code}m${text}\x1b[0m`);`.
- Config and storage: `CONTEXT_MODE_DIR=/abs/path` (`Empty/whitespace is ignored; non-empty values must be absolute.`), honours `CLAUDE_CONFIG_DIR` including a leading `~`, and sets `CONTEXT_MODE_PROJECT_DIR` from the original cwd unless the cwd is a plugin cache path.
- `--json`: not found in the CLI grep; output is for humans and for the MCP protocol.

### Hooks and shell entry scripts

This is the clearest example of shipped hooks.

- Hooks are Node ESM files, not shell. `hooks/hooks.json` entries look like `"command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/posttooluse.mjs\""` with a `matcher` such as `"Bash|Read|Write|Edit|NotebookEdit|Glob|Grep|TodoWrite|..."`.
- Executable bits are set in git for the entry hooks: `hooks/posttooluse.mjs hooks/precompact.mjs hooks/pretooluse.mjs hooks/sessionstart.mjs hooks/userpromptsubmit.mjs hooks/kiro/*.mjs hooks/vscode-copilot/sessionstart.mjs bin/statusline.mjs cli.bundle.mjs server.bundle.mjs scripts/*.sh`.
- Every hook goes through `hooks/run-hook.mjs`, whose header states the contract: `logs every failure to <configDir>/context-mode/hook-errors.log`, `never propagates a non-zero exit (Claude Code surfaces non-zero as a "non-blocking hook error" on every tool call, which spams the user)`, and `Inlined to keep this wrapper dependency-free (parse-time imports must be ...`. Adoption is `await runHook(async () => { ...body... });`.
- `hooks/normalize-hooks.mjs` exists because on Windows `bare node may not resolve via PATH (Git Bash, see #369)` and `${CLAUDE_PLUGIN_ROOT} resolution can hit MSYS path mangling (#372)`, so `start.mjs` rewrites the committed placeholders with `process.execPath` and forward slashes at every boot.
- `hooks/cache-heal-utils.mjs` documents a second trap: writing `process.execPath` into settings on Homebrew captures the versioned Cellar path (`/opt/homebrew/Cellar/node/25.9.0_2/bin/node`), which breaks after a Node upgrade.

---

## Comparison table

| Item | ccusage (npm layer) | codeburn | claude-hud | vercel-labs/skills | context-mode |
|---|---|---|---|---|---|
| Layout | pnpm monorepo, `apps/ccusage` + 6 platform pkgs | single pkg, `src/` `tests/` `docs/` | single pkg, `src/` `tests/` `dist/` committed | single pkg, `src/` `tests/` `bin/` | single pkg, `src/` `tests/` `hooks/` `bin/` bundles committed |
| `type` | module | module | module | module | module |
| `bin` | `./src/cli.js` (source file) | `dist/cli.js` (built) | none (statusline cmd) | `./bin/cli.mjs` (shim) | `./cli.bundle.mjs` |
| `exports` | none | none | none | none | 4 entries |
| `files` | 2 entries | 3 entries incl. negation | 5 entries | 4 entries | 21 entries plus `.npmignore` |
| `engines` | none | `>=22.13.0` | `>=18.0.0` | `>=22.20.0` | `>=22.5.0` |
| `packageManager` | `pnpm@12.5.1` (root) | none (npm) | none (npm) | `pnpm@10.17.1` | `pnpm@10.23.0+sha512` |
| Language | JS with `// @ts-check` | TS | TS | TS | TS |
| Bundler | none | tsup | none (tsc) | obuild | esbuild |
| Shebang | in source `cli.js` | copied launcher, chmod in build | none | committed shim, mode 100755 | in `src/cli.ts`, chmod in build |
| Runtime deps | 0 (+6 optional platform) | 10 | 0 | 2 | 8 |
| devDeps | 1 | 8 | 3 | 13 | 7 |
| Test framework | node:test | vitest | node:test + c8 | vitest | vitest |
| Test location | colocated `src/cli.test.ts` | `tests/` | `tests/*.test.js` against dist | both `src/*.test.ts` and `tests/` | `tests/` grouped by area |
| Fixtures | `test/fixtures/` | `tests/fixtures/` + env isolation | `tests/fixtures/` + `expected/` snapshots | `tests/fixtures/` | `tests/fixtures/` |
| Coverage | none | none | c8 (text + lcov) | none | none |
| Tests in CI | yes | yes, Node 22.13/22/24/26, mac and win | yes, Node 18/20 + windows job | yes, ubuntu+win, Node 22.20/24/26 | yes, ubuntu+mac+win |
| Lint | oxlint (type-aware) + eslint config | Semgrep single rule | none | none | none |
| Format | oxfmt (tabs) | none | none | prettier + husky + lint-staged | none |
| tsconfig strict | strict + noUncheckedIndexedAccess | strict | strict | strict + noUncheckedIndexedAccess | strict + isolatedModules |
| Release tool | tagpr + changelogithub | manual `npm version` + `npm publish` | manual tag, GH release from CHANGELOG | `workflow_dispatch` publish, `npm version`, GPG | manual `npm version` with version-sync hook |
| npm provenance | yes | no | n/a (not published from CI) | yes | no |
| Action pinning | full SHA + comment | major tag | major tag | mixed (pnpm by SHA) | major tag |
| README first H2 | `Major Sponsors` then `Quick Start` | `The problem` | `Install` | `Install a Skill` | `The Problem` |
| CONTRIBUTING | yes | yes | yes | no (AGENTS.md) | yes |
| LICENSE | MIT | MIT | MIT | MIT | Elastic-2.0 |
| CHANGELOG | no (GH releases) | yes, Keep a Changelog | yes, Keep a Changelog | no (generated) | no |
| CODE_OF_CONDUCT | no | yes | yes | no | no |
| SECURITY.md | no | yes | yes | no | no |
| `.editorconfig` | no | yes | yes | no | no |
| `.nvmrc` | no | yes (`22.13.0`) | no | no | no |
| Issue templates | YAML forms | YAML forms | Markdown | YAML forms | YAML forms |
| PR template | no | yes | yes | no | yes |
| Arg parser | none (forwards to Rust) | commander | none (stdin JSON) | hand-written switch | hand-written switch |
| `--json` | yes, contract | `--format json` | n/a | yes, `--json` | no |
| `--version` | yes (Rust) | commander default | n/a | `-v`/`--version` reads package.json | not seen |
| NO_COLOR | Rust side | via chalk | not handled | not handled | statusline: `NO_COLOR \|\| !isTTY` |
| Debug env | `LOG_LEVEL` in CI | `CODEBURN_VERBOSE`, `--verbose` | `DEBUG=claude-hud` | none documented | none seen |
| Config location | `ccusage.example.json` + schema | `~/.config/codeburn/config.json`, `~/.cache/codeburn` | JSON via `loadConfig` | `~/.agents/.skill-lock.json`, `skills-lock.json` | `CONTEXT_MODE_DIR`, `CLAUDE_CONFIG_DIR` |
| Errors to user | stderr message + return 1 | launcher catches, prints message, exit 1 | catch-all, log, never non-zero | `Unknown command` + exitCode 1 | per-command return code |
| Hooks shipped | none | none | statusline command, no shim | none | node `.mjs` hooks, 100755, crash wrapper |
| AGENTS.md or CLAUDE.md | both | no | CLAUDE.md | AGENTS.md | CLAUDE.md |

---

## Recommendations for whyline (2 people, 48 hours, zero-dependency CommonJS, node:test, one npm package, `.bob/` folder, one shell hook)

Current state of the repository (checked 26 Sep 2026): `package.json` already has `bin`, `files`, `engines: >=20`, `test` and `coverage` scripts, `repository`, `homepage`, `keywords`. Present: `LICENSE` (MIT), `.editorconfig`, `.nvmrc` (`24`), `.gitignore`, `.github/workflows/ci.yml` (matrix ubuntu+macos, Node 20/22/24, `npm test`, then `node cli/index.js --help`). `cli/index.js` and `bob/hooks/whyline.sh` are mode 100755 in git and both have shebangs. `cli/index.js` handles `--json` by filtering argv and exits via `process.exit(main(process.argv.slice(2)))`.

### (a) Must adopt now (cheap, reviewers look for it)

1. `package.json`: add `"type": "commonjs"` explicitly. Every studied repo declares `type`; leaving it out reads as an oversight even though the default is commonjs. Also add `"bugs": { "url": "https://github.com/SAL-Sovereign-AI-Labs/whyline/issues" }` (all five have it) and `"publishConfig": { "access": "public" }` (ccusage platform packages). Keep `"files"` as is; it already matches the tight style of ccusage (`["config-schema.json", "src/cli.js"]`).

2. Type checking without a toolchain: put `// @ts-check` at the top of `cli/index.js` and every file in `cli/lib/` (ccusage does exactly this for its JS shim: `#!/usr/bin/env node` then `// @ts-check`). Zero dependencies, editors pick it up, no CI step needed. Skip a linter; claude-hud and context-mode ship none.

3. `.nvmrc` must equal the `engines` floor. codeburn: `.nvmrc` is `22.13.0` and `engines` is `>=22.13.0`. whyline has `.nvmrc` = `24` but `engines` = `>=20`. Change `.nvmrc` to `20` (the floor you test in CI) or raise `engines` to `>=24`; pick one.

4. CI: add `"os": windows-latest` to the matrix or state in README that Windows is untested. Four of five repos run Windows in CI (codeburn, claude-hud, skills, context-mode). The shell hook `bob/hooks/whyline.sh` will not run on Windows without Git Bash, so at minimum document it. Also add one `--json` smoke step that pipes through `JSON.parse`, copied from ccusage's E2E: `node cli/index.js check --json | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))"`.

5. `CHANGELOG.md` in Keep a Changelog form (codeburn and claude-hud): start with `## [Unreleased]` and `### Added`. claude-hud's `release.yml` fails the release if the version section is missing, which is a cheap guard to copy later.

6. `SECURITY.md`, three lines, copied from codeburn's shape: `Please report security vulnerabilities via GitHub's private vulnerability reporting ... Do not open a public issue`. Provenance tooling gets asked about security; this is the expected answer.

7. `CONTRIBUTING.md`, short, with these headings in this order (union of codeburn and claude-hud): `Prerequisites`, `Setup`, `Common Commands`, `Project Layout`, `Tests`, `Commit Message Format`, `Pull Requests`. Include claude-hud's three lines under code style: `Keep changes focused and small.`, `Prefer tests for behavior changes.`, `Avoid introducing dependencies unless necessary.`

8. `.github/ISSUE_TEMPLATE/bug.yml` and `config.yml` (YAML forms; four of five use them). Required fields: `What happened?` and `Steps to reproduce` (ccusage `bug.yml`). Add `Environment` with `OS`, `Node version`, `Bob version` (claude-hud's list adapted).

9. `.github/PULL_REQUEST_TEMPLATE.md` with checkboxes `npm test passes` and `node cli/index.js --help works` (codeburn and context-mode both gate on `npm test passes`).

10. CLI behaviour in `cli/index.js`:
   - Add `--version` reading `require('./package.json').version` (skills: `case '--version': case '-v': console.log(VERSION)`).
   - Unknown command: print `Unknown command: <x>` and `Run whyline --help for usage.` then exit 1 (skills). Never print a stack trace; catch in `main` and write `err.message` to stderr (codeburn launcher: `process.stderr.write(String(err?.message ?? err) + '\n'); process.exit(1)`).
   - Honour `NO_COLOR` and non-TTY with the one-liner from context-mode's statusline: `const NO_COLOR = process.env.NO_COLOR || !process.stdout.isTTY;`. Emit no ANSI when `--json` is set (skills documents `--json` as `machine-readable, no ANSI codes`).
   - Keep `--json` on every read command and keep `check` exiting 2 when items are due (already in the help text). Document exit codes in README under `## CLI` (codeburn documents `exit 1 if any configured budget is over`).
   - Add a `WHYLINE_DEBUG=1` env var that logs to stderr with a `[whyline:<area>]` prefix (claude-hud `debug.ts` pattern).

11. Shell hook contract (`bob/hooks/whyline.sh`): keep the header `# Bob lifecycle hook entry. Never fails the agent: any error exits 0.` (already in `docs/05-architecture.md` section 4.2). This matches context-mode's `run-hook.mjs` rule: `never propagates a non-zero exit`. Add the second half of that contract: append failures to a log file under `.git/whyline/hook-errors.log` so silent hooks can be debugged. Keep the executable bit in git (already 100755) and confirm `files` includes `bob` (it does).

12. README order. The two CLI-first repos open with install: claude-hud `## Install` and skills `## Install a Skill`. whyline already opens with `## Install in a repo` then `## Ask` then `## How it works`. Add, at the end and in this order: `## CLI` (commands, flags, exit codes, env vars as a table like skills' `## Environment Variables`), `## Requirements` (claude-hud), `## Development` (`npm test`, `npm run coverage`), `## License`.

### (b) Nice to have (do after the demo works)

- `AGENTS.md` at the root with a `Commands` table and an `Architecture` tree (skills). Cheap and it shows judges the project is agent-aware.
- Pin GitHub Actions by full SHA with a version comment (`actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`, ccusage). Do this with a single `gh api` lookup per action.
- A `release.yml` on tag `v*.*.*` that runs tests, extracts the CHANGELOG section with claude-hud's awk, and creates a GitHub release with `softprops/action-gh-release@v2`. Add `npm publish --provenance --access public` with `permissions: id-token: write` (skills, ccusage) only once the package name is claimed.
- `CODE_OF_CONDUCT.md` (codeburn, claude-hud). Copy the Contributor Covenant text.
- A build smoke test in node:test that spawns `node cli/index.js --help` and asserts the output contains `whyline` (skills `tests/dist.test.ts`).
- Test env isolation: set `HOME` to a temp dir in every e2e test so the developer's real git config and Bob state never leak in (codeburn `tests/setup/env-isolation.ts`). The CI already sets a fake git identity; do the same in the test setup so `npm test` passes on a fresh laptop.
- `.gitattributes` with `* text=auto eol=lf` (context-mode) to stop CRLF surprises for a Windows contributor, especially for the `.sh` hook.
- `"funding"` field and `.github/FUNDING.yml` (ccusage, codeburn, context-mode). Only if there is a sponsor link.

### (c) Skip for the hackathon

- Bundlers (tsup, obuild, esbuild) and TypeScript. Plain JS with `// @ts-check` is what ccusage ships for its Node layer, and claude-hud ships zero runtime dependencies. Reviewers will not penalise plain JS.
- Linters and formatters (oxlint, prettier, husky, lint-staged). Three of five repos have none. `.editorconfig` (already present) is enough for two people.
- Release automation (tagpr, changelogithub, GPG-signed tags, `workflow_dispatch` publish). Manual `npm version` plus `npm publish` (codeburn's documented process) is fine for a first release.
- Monorepo, platform packages, `exports` map, `.npmignore`. One package with `bin` and `files` covers it.
- Automated contributor gates (ccusage `pr-gate.yaml` with an AI judge, codeburn `pr-limit.yml`), Semgrep, gitleaks, tirith, Renovate, Dependabot. There are no dependencies to update and no external contributors yet.
- Committed build output (`dist/`, `*.bundle.mjs`) and the CI job that commits it. There is no build step.
- `--format tui|json` style option (codeburn). Keep the simpler boolean `--json` (skills, ccusage).
- Snapshot testing with `UPDATE_SNAPSHOTS=1` (claude-hud). Fixture JSON plus direct assertions is enough for the hook payloads already in `cli/test/fixtures/bob-payloads.json`.
- Telemetry and `DO_NOT_TRACK` handling (skills). Whyline sends nothing; say so in README under `Private by design` (codeburn heading) if space allows.
- Windows path hardening in the shell hook (context-mode's `normalize-hooks.mjs`). Document the Git Bash requirement instead.

### Exact package.json after the must-adopt edits

```json
{
  "name": "whyline",
  "version": "0.1.0",
  "description": "Provenance for AI-written code. Every line keeps the prompt that caused it. Built for IBM Bob.",
  "type": "commonjs",
  "license": "MIT",
  "bin": { "whyline": "cli/index.js" },
  "files": ["cli/index.js", "cli/lib", "bob", "README.md", "LICENSE"],
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "node --test cli/test/*.test.js",
    "coverage": "node --test --experimental-test-coverage cli/test/*.test.js",
    "smoke": "node cli/index.js --help >/dev/null && node cli/index.js --version"
  },
  "keywords": ["ibm-bob", "ai", "provenance", "attribution", "git-notes", "hooks"],
  "repository": { "type": "git", "url": "https://github.com/SAL-Sovereign-AI-Labs/whyline" },
  "homepage": "https://github.com/SAL-Sovereign-AI-Labs/whyline#readme",
  "bugs": { "url": "https://github.com/SAL-Sovereign-AI-Labs/whyline/issues" },
  "publishConfig": { "access": "public" }
}
```

No `dependencies` and no `devDependencies` fields, matching claude-hud's zero runtime dependencies and going one step further.

### Exact files to add

```
CHANGELOG.md
SECURITY.md
CONTRIBUTING.md
.github/ISSUE_TEMPLATE/bug.yml
.github/ISSUE_TEMPLATE/config.yml
.github/PULL_REQUEST_TEMPLATE.md
```

And edit: `.nvmrc` (align with `engines`), `.github/workflows/ci.yml` (add the `--json` smoke step; decide on `windows-latest`), `cli/index.js` (`--version`, unknown command message, `NO_COLOR`, `WHYLINE_DEBUG`, catch-all in `main`), `bob/hooks/whyline.sh` (error log line), `README.md` (append `CLI`, `Requirements`, `Development`, `License`).

---

## Sources fetched

- `https://raw.githubusercontent.com/ccusage/ccusage/main/{package.json,pnpm-workspace.yaml,.tagpr,justfile,.oxlintrc.json,.oxfmtrc.json,.gitattributes,CONTRIBUTING.md,.github/workflows/ci.yaml,.github/workflows/release.yaml,.github/workflows/check-pr-title.yaml,.github/workflows/pr-gate.yaml,.github/tagpr-template.md,.github/release.yml,.github/ISSUE_TEMPLATE/bug.yml,apps/ccusage/{package.json,tsconfig.json,eslint.config.js,justfile,AGENTS.md,README.md,src/cli.js,src/cli.test.ts},packages/ccusage-darwin-arm64/package.json}`
- `https://raw.githubusercontent.com/getagentseal/codeburn/main/{package.json,tsconfig.json,tsup.config.ts,vitest.config.ts,.editorconfig,.nvmrc,README.md,CONTRIBUTING.md,RELEASING.md,CHANGELOG.md,SECURITY.md,LICENSE,src/cli.ts,src/main.ts,src/config.ts,src/cache-dir.ts,tests/setup/env-isolation.ts,tests/cli-models-unpriced.test.ts,docs/cli.md,.github/PULL_REQUEST_TEMPLATE.md,.github/workflows/*.yml}`
- `https://raw.githubusercontent.com/jarrodwatts/claude-hud/main/{package.json,tsconfig.json,.editorconfig,.claude-plugin/plugin.json,README.md,CONTRIBUTING.md,RELEASING.md,TESTING.md,CHANGELOG.md,src/index.ts,src/debug.ts,src/utils/terminal.ts,dist/index.js,scripts/clean-dist.mjs,.github/ISSUE_TEMPLATE/bug_report.md,.github/workflows/*.yml}`
- `https://raw.githubusercontent.com/vercel-labs/skills/main/{package.json,tsconfig.json,build.config.mjs,.prettierrc,.husky/pre-commit,bin/cli.mjs,README.md,AGENTS.md,src/cli.ts,tests/dist.test.ts,.github/RELEASE_TEMPLATE.md,.github/ISSUE_TEMPLATE/bug-report.yml,.github/workflows/*.yml}`
- `https://raw.githubusercontent.com/mksglu/context-mode/main/{package.json,tsconfig.json,vitest.config.ts,.npmignore,.gitattributes,LICENSE,README.md,CONTRIBUTING.md,start.mjs,src/cli.ts,bin/statusline.mjs,hooks/hooks.json,hooks/run-hook.mjs,hooks/normalize-hooks.mjs,hooks/cache-heal-utils.mjs,scripts/version-sync.mjs,.claude-plugin/plugin.json,.github/PULL_REQUEST_TEMPLATE.md,.github/workflows/*.yml}`
- `gh api repos/{ccusage/ccusage,getagentseal/codeburn,jarrodwatts/claude-hud,vercel-labs/skills,mksglu/context-mode,entireio/cli}` and `.../contents/<dir>` listings, `.../git/trees/main?recursive=1` filtered on `mode == "100755"`, and `gh api search/code` for `NO_COLOR` per repo.
