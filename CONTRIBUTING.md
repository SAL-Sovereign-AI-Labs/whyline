# Contributing

## Prerequisites
Node 20 or newer, git 2.30 or newer. For manual testing: IBM Bob IDE 2.2 or Bob Shell 2.x.

## Setup
```sh
git clone https://github.com/SAL-Sovereign-AI-Labs/whyline
cd whyline && npm link      # puts `whyline` on your PATH
```

## Common commands
```sh
npm test            # unit and end-to-end tests (temp git repos)
npm run coverage    # same, with coverage
npm run smoke       # help and version
```

## Project layout
```
cli/index.js      command router
cli/lib/          one module per concern: git, session, capture, patch, classify, commit, cost, lenses, init
cli/test/         node:test files and fixtures (real Bob hook payloads)
bob/              files installed into a repo's .bob/ by `whyline init`
docs/             research, evidence, architecture
```

## Tests
Every behaviour change comes with a test. End-to-end tests build a temporary git repository and drive the same code paths the hooks use.

## Code style
Plain CommonJS. No runtime dependencies, no build step. Keep changes focused and small. Prefer tests for behaviour changes. Avoid introducing dependencies unless necessary. No em dashes in code, docs or messages.

## Commit messages
`area: what changed` in the imperative, for example `capture: record insert_content ranges`.

## Pull requests
Run `npm test` and `npm run smoke` before opening one. Describe what changed and why in two or three sentences.
