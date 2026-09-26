#!/bin/sh
# Reset the demo repo to its starting state before a take.
set -e
cd "$(dirname "$0")/.."
node demo/build.js "${1:-$HOME/projects/whyline-demo-shop}"
