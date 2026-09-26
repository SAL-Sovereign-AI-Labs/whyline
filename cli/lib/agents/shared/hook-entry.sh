#!/bin/sh
# whyline hook entry, shared by every agent adapter. Installed as <agent config dir>/hooks/whyline.sh.
# Usage: sh whyline.sh <command> [--agent <id>]
# Never fails the agent: any problem exits 0. Errors go to .git/whyline/hook.err.
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
BIN="$ROOT/node_modules/.bin/whyline"
if [ ! -x "$BIN" ]; then BIN="$(command -v whyline 2>/dev/null)" || exit 0; fi
mkdir -p "$(git rev-parse --git-dir)/whyline" 2>/dev/null
"$BIN" "$@" 2>>"$(git rev-parse --git-dir)/whyline/hook.err" || exit 0
exit 0
