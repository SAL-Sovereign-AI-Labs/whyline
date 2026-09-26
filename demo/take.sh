#!/bin/sh
# One command before each removal take: rebuild the demo, merge payments-v2, print the due mock's id.
set -e
cd "$(dirname "$0")/.."
node demo/build.js "$HOME/projects/whyline-demo-shop" >/dev/null
cd "$HOME/projects/whyline-demo-shop"
git -c user.name=demo -c user.email=demo@example.invalid merge -q --no-edit payments-v2
echo "Demo ready at $PWD. If Bob IDE was already open on this folder: Cmd+Shift+P, Developer: Reload Window (once). Then New task, Agent mode, and type:"
whyline check --json | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const m=d.due.find(i=>i.kind==="mock");console.log(m?"  remove the mock payment gateway   (or: remove "+m.file+", or: remove "+m.id+")":"  <no due mock>")'
