#!/bin/sh
# whyline guard: Bob PreToolUse hook on the shell tool. Bob may not rewrite or delete Whyline's own record.
# Reads the hook payload on stdin. Exit 2 blocks the command and Bob sees the reason; every other command runs.
# Plain sh and grep, no node: it adds a few milliseconds to each shell command Bob runs.
p=$(cat)
deny() {
  echo "whyline: blocked. Bob cannot edit the history Whyline keeps (refs/notes/whyline, saved in git), and this command would $1. That history changes only through whyline keep, until, removed, or a commit. If the user really wants this, they can run the command themselves in a terminal." >&2
  exit 2
}
end='([^a-zA-Z_-]|$)'
echo "$p" | grep -Eq "notes[[:space:]]+--ref[= ]?(refs/notes/)?whyline[^;&|]*[[:space:]](add|append|edit|remove|copy|prune|merge)$end" && deny "change it"
echo "$p" | grep -Eq "update-ref[[:space:]]+-d[[:space:]]+refs/notes/whyline" && deny "delete it"
echo "$p" | grep -Eq "push[^;&|]*[[:space:]]:refs/notes/whyline" && deny "delete the shared copy on the remote"
echo "$p" | grep -Eq "(^|[[:space:];&|\"])rm[[:space:]][^;&|]*\.git/whyline" && deny "delete the part that is not committed yet"
echo "$p" | grep -Eq "config[^;&|]*--unset[^;&|]*notes\.(rewriteRef|displayRef)" && deny "make git drop it when commits are amended or rebased"
exit 0
