#!/bin/sh
# Bob lifecycle hook entry for whyline. Never fails the agent: any problem exits 0.
# Resolution: repo-local install, then a global whyline on PATH, else no-op.
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
BIN="$ROOT/node_modules/.bin/whyline"
if [ ! -x "$BIN" ]; then BIN="$(command -v whyline 2>/dev/null)" || exit 0; fi
"$BIN" "$1" 2>>"$(git rev-parse --git-dir)/whyline/hook.err" || exit 0
exit 0
